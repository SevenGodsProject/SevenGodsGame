import { describe, expect, it } from 'vitest'
import { RULES } from '../data/rules'
import { GOD_IDS, GODS } from '../data/gods'
import { ENEMY_IDS } from '../data/enemies'
import { CARD_IDS, SHOUREN_CARD_IDS, FUKUEI_CARD_IDS, SOBI_CARD_IDS } from '../data/cards'
import { getCardPoolForGod } from '../data/deckBuilder'
import { cardUid } from '../types/ids'
import type { CardDef, CardDefId, GameState, GodId } from '../types'
import { applyAction } from './reducer'
import { GOD_PASSIVE_HOOKS, isGodPassiveArmed, resolveGodPassive } from './godPassive'

/**
 * Phase 3「神格」FINAL SPEC v0.1：神の得意技（Passive）のテスト。
 *
 * 重点は §5「Critical timing tests」：
 * - 蒼毘：敵ターンの被弾処理が終わり、残ブロックが確定してから反撃し、次ラウンド（ブロック0リセット）より前であること
 * - 笑蓮／福永：HP条件を「カードを使う前」の盤面で判定すること（同じカードの回復で条件を満たしてから
 *   その攻撃部分を強化する、という順序依存を作らない）
 */

/** その神が使える20枚の合法デッキ（先頭に指定カードを入れる） */
function deckWith(godId: GodId, cards: CardDefId[]): CardDefId[] {
  const deck = [...cards]
  for (const card of getCardPoolForGod(godId)) {
    while (
      deck.length < RULES.deck.size &&
      deck.filter((x) => x === card.id).length < RULES.deckBuilding.maxCopiesPerCard
    ) {
      deck.push(card.id)
    }
  }
  return deck.slice(0, RULES.deck.size)
}

function startGame(godId: GodId, enemyId = ENEMY_IDS.trial, seed = 'passive-test'): GameState {
  return applyAction(null, {
    type: 'START_GAME',
    seed,
    godId,
    enemyId,
    deck: deckWith(godId, []),
  }).state
}

/** 手札・AP・HP・ブロックを検証したい状況に固定した盤面を作る（GameStateは素のオブジェクト） */
function withHand(state: GameState, defId: CardDefId, patch: Partial<GameState> = {}): GameState {
  return {
    ...state,
    ap: { current: 9, max: 9 },
    hand: [{ uid: cardUid('t-card'), defId }],
    ...patch,
  }
}

const TEST_UID = cardUid('t-card')

describe('神の得意技（Passive）のデータ', () => {
  it('得意技を持つのは蒼毘・笑蓮・福永の3神だけ（FINAL SPEC v0.1のscope）', () => {
    const withPassive = GODS.filter((g) => g.passive)
    expect(withPassive.map((g) => g.id).sort()).toEqual(
      [GOD_IDS.sobi, GOD_IDS.shouren, GOD_IDS.fukuei].sort(),
    )
    expect(withPassive.map((g) => g.passive!.id).sort()).toEqual(
      ['fukuei_gamble', 'shouren_pristine', 'sobi_counter'],
    )
  })

  it('得意技idはすべて実装テーブルに登録されている', () => {
    for (const god of GODS) {
      if (!god.passive) continue
      expect(GOD_PASSIVE_HOOKS[god.passive.id]).toBeDefined()
      expect(resolveGodPassive(god.id)?.def.id).toBe(god.passive.id)
    }
    expect(resolveGodPassive(GOD_IDS.ebisu)).toBeNull()
  })
})

describe('蒼毘「反撃の構え」（afterEnemyTurn）', () => {
  it('敵の攻撃を受け切って残ったブロックが、そのまま敵へのダメージになる', () => {
    const base = startGame(GOD_IDS.sobi)
    // trial R1の予告は攻撃5。ブロック20で受けると15残る
    const state: GameState = { ...base, player: { ...base.player, block: 20 } }
    const before = state.enemy.hp

    const { state: after, events } = applyAction(state, { type: 'END_ROUND' })

    expect(before - after.enemy.hp).toBe(15)
    expect(after.player.hp).toBe(state.player.hp) // 被弾はブロックで全吸収
    const passive = events.find((e) => e.t === 'PASSIVE_TRIGGERED')
    expect(passive).toEqual({ t: 'PASSIVE_TRIGGERED', passiveId: 'sobi_counter', amount: 15 })
  })

  it('順序：敵の行動 → 被弾 → 反撃 → ラウンド終了（ブロック0リセットの前）', () => {
    const base = startGame(GOD_IDS.sobi)
    const state: GameState = { ...base, player: { ...base.player, block: 20 } }

    const { state: after, events } = applyAction(state, { type: 'END_ROUND' })
    const order = events.map((e) => e.t)

    const enemyActed = order.indexOf('ENEMY_ACTED')
    const selfHit = order.findIndex((t, i) => t === 'DAMAGE_DEALT' && i > enemyActed)
    const passive = order.indexOf('PASSIVE_TRIGGERED')
    const roundEnded = order.indexOf('ROUND_ENDED')

    expect(enemyActed).toBeGreaterThanOrEqual(0)
    expect(selfHit).toBeGreaterThan(enemyActed)
    expect(passive).toBeGreaterThan(selfHit)
    expect(roundEnded).toBeGreaterThan(passive)
    // 次ラウンドが始まっているのでブロックは0に戻っている（反撃は0リセット前の値を使った）
    expect(after.round).toBe(2)
    expect(after.player.block).toBe(0)
  })

  it('ブロックが敵の攻撃で使い切られたら反撃しない', () => {
    const base = startGame(GOD_IDS.sobi)
    const state: GameState = { ...base, player: { ...base.player, block: 5 } } // 予告5をちょうど吸収
    const before = state.enemy.hp

    const { state: after, events } = applyAction(state, { type: 'END_ROUND' })

    expect(after.enemy.hp).toBe(before)
    expect(events.some((e) => e.t === 'PASSIVE_TRIGGERED')).toBe(false)
  })

  it('ブロック0では発動しない', () => {
    const base = startGame(GOD_IDS.sobi)
    const before = base.enemy.hp
    const { state: after, events } = applyAction(base, { type: 'END_ROUND' })
    expect(after.enemy.hp).toBe(before)
    expect(events.some((e) => e.t === 'PASSIVE_TRIGGERED')).toBe(false)
  })

  it('敵が溜め（charge）のラウンドでも、残ったブロックはそのまま反撃になる', () => {
    // 銀甲の機工師のR2は charge（被弾0）
    const r1 = startGame(GOD_IDS.sobi, ENEMY_IDS.karakuri)
    const afterR1 = applyAction(r1, { type: 'END_ROUND' }).state
    expect(afterR1.round).toBe(2)
    expect(afterR1.enemy.intent?.kind).toBe('charge')

    const state: GameState = { ...afterR1, player: { ...afterR1.player, block: 12 } }
    const before = state.enemy.hp
    const { state: after } = applyAction(state, { type: 'END_ROUND' })

    expect(before - after.enemy.hp).toBe(12)
  })

  it('反撃で敵を倒し切れる（勝利になる）', () => {
    const base = startGame(GOD_IDS.sobi)
    const state: GameState = {
      ...base,
      player: { ...base.player, block: 20 },
      enemy: { ...base.enemy, hp: 3 },
    }
    const { state: after } = applyAction(state, { type: 'END_ROUND' })
    expect(after.enemy.hp).toBe(0)
    expect(after.status).toBe('won')
  })

  it('得意技を持たない神（恵比寿）は反撃しない', () => {
    const base = startGame(GOD_IDS.ebisu)
    const state: GameState = { ...base, player: { ...base.player, block: 20 } }
    const before = state.enemy.hp
    const { state: after, events } = applyAction(state, { type: 'END_ROUND' })
    expect(after.enemy.hp).toBe(before)
    expect(events.some((e) => e.t === 'PASSIVE_TRIGGERED')).toBe(false)
  })

  it('蒼毘Mastery「鉄壁」の集計は反撃の影響を受けない（無傷受け率は敵の攻撃だけで決まる）', () => {
    const base = startGame(GOD_IDS.sobi)
    const state: GameState = { ...base, player: { ...base.player, block: 20 } }
    const { state: after } = applyAction(state, { type: 'END_ROUND' })
    expect(after.mastery.guardAttackCount).toBe(1)
    expect(after.mastery.fullyBlockedCount).toBe(1)
  })
})

describe('笑蓮「無傷の慈愛」（afterPlay・高HP）', () => {
  const CARD = SHOUREN_CARD_IDS.gentleBlow // おおらかな一打：敵に7 + 自分に3回復

  it('HPが満タンなら攻撃カードのダメージ+50%（素7 → +3）', () => {
    const base = startGame(GOD_IDS.shouren)
    const state = withHand(base, CARD)
    const before = state.enemy.hp

    const { state: after, events } = applyAction(state, { type: 'PLAY_CARD', uid: TEST_UID })

    expect(before - after.enemy.hp).toBe(7 + 3)
    expect(events.find((e) => e.t === 'PASSIVE_TRIGGERED')).toEqual({
      t: 'PASSIVE_TRIGGERED',
      passiveId: 'shouren_pristine',
      amount: 3,
    })
  })

  it('閾値ちょうど（HP = ceil(maxHp×0.8)）で発動し、1下回ると発動しない', () => {
    const base = startGame(GOD_IDS.shouren)
    const threshold = Math.ceil(base.player.maxHp * RULES.godPassive.shouren.hpRatio)
    expect(threshold).toBe(24) // maxHp 30

    const armed = withHand(base, CARD, { player: { ...base.player, hp: threshold } })
    const notArmed = withHand(base, CARD, { player: { ...base.player, hp: threshold - 1 } })

    expect(armed.enemy.hp - applyAction(armed, { type: 'PLAY_CARD', uid: TEST_UID }).state.enemy.hp).toBe(10)
    expect(notArmed.enemy.hp - applyAction(notArmed, { type: 'PLAY_CARD', uid: TEST_UID }).state.enemy.hp).toBe(7)
  })

  it('HP条件は「カードを使う前」で判定する（自分の回復で条件を満たしても、その一撃は強化されない）', () => {
    const base = startGame(GOD_IDS.shouren)
    // HP21 → おおらかな一打の回復3で24（閾値）に届くが、判定は使用前の21なので発動しない
    const state = withHand(base, CARD, { player: { ...base.player, hp: 21 } })
    const before = state.enemy.hp

    const { state: after, events } = applyAction(state, { type: 'PLAY_CARD', uid: TEST_UID })

    expect(after.player.hp).toBe(24)
    expect(before - after.enemy.hp).toBe(7)
    expect(events.some((e) => e.t === 'PASSIVE_TRIGGERED')).toBe(false)
  })

  it('攻撃を持たないカードでは発動しない（回復カード）', () => {
    const base = startGame(GOD_IDS.shouren)
    const state = withHand(base, SHOUREN_CARD_IDS.bagOfFortune) // 福袋：回復のみ
    const { state: after, events } = applyAction(state, { type: 'PLAY_CARD', uid: TEST_UID })
    expect(after.enemy.hp).toBe(state.enemy.hp)
    expect(events.some((e) => e.t === 'PASSIVE_TRIGGERED')).toBe(false)
  })

  it('本体効果で敵を倒し切ったら、追い討ちの得意技は発動しない', () => {
    const base = startGame(GOD_IDS.shouren)
    const state = withHand(base, CARD, { enemy: { ...base.enemy, hp: 5 } })
    const { state: after, events } = applyAction(state, { type: 'PLAY_CARD', uid: TEST_UID })
    expect(after.status).toBe('won')
    expect(events.some((e) => e.t === 'PASSIVE_TRIGGERED')).toBe(false)
  })
})

describe('福永「大勝負」（afterPlay・低HP）', () => {
  const RISK_CARD = FUKUEI_CARD_IDS.fortuneStrike // 一攫千金：敵に15 + 自分に2

  it('HPが半分以下なら攻撃カードのダメージ+50%（素15 → +7）', () => {
    const base = startGame(GOD_IDS.fukuei)
    const half = Math.floor(base.player.maxHp * RULES.godPassive.fukuei.hpRatio)
    const state = withHand(base, RISK_CARD, { player: { ...base.player, hp: half } })
    const before = state.enemy.hp

    const { state: after, events } = applyAction(state, { type: 'PLAY_CARD', uid: TEST_UID })

    expect(before - after.enemy.hp).toBe(15 + 7)
    expect(events.find((e) => e.t === 'PASSIVE_TRIGGERED')).toEqual({
      t: 'PASSIVE_TRIGGERED',
      passiveId: 'fukuei_gamble',
      amount: 7,
    })
  })

  it('閾値ちょうど（HP = floor(maxHp×0.5)）で発動し、1上回ると発動しない', () => {
    const base = startGame(GOD_IDS.fukuei)
    const half = Math.floor(base.player.maxHp * RULES.godPassive.fukuei.hpRatio)
    expect(half).toBe(15)

    const armed = withHand(base, RISK_CARD, { player: { ...base.player, hp: half } })
    const notArmed = withHand(base, RISK_CARD, { player: { ...base.player, hp: half + 1 } })

    expect(armed.enemy.hp - applyAction(armed, { type: 'PLAY_CARD', uid: TEST_UID }).state.enemy.hp).toBe(22)
    expect(notArmed.enemy.hp - applyAction(notArmed, { type: 'PLAY_CARD', uid: TEST_UID }).state.enemy.hp).toBe(15)
  })

  it('福永Mastery「大勝負」のrisk集計には、得意技の追加ダメージを混ぜない', () => {
    const base = startGame(GOD_IDS.fukuei)
    const half = Math.floor(base.player.maxHp * RULES.godPassive.fukuei.hpRatio)
    const state = withHand(base, RISK_CARD, { player: { ...base.player, hp: half } })

    const { state: after } = applyAction(state, { type: 'PLAY_CARD', uid: TEST_UID })

    // 自傷カード本体が与えた実効ダメージ15のみ。追加の7は含めない
    expect(after.mastery.riskCardEffDamage).toBe(15)
  })
})

describe('得意技の共通仕様', () => {
  it('複数の敵ダメージ効果を持つカードでは、素ダメージの合計から倍率を計算する（連撃型の想定）', () => {
    const fake: CardDef = {
      id: CARD_IDS.strike,
      name: 'テスト連撃',
      text: '',
      type: 'attack',
      cost: 1,
      rarity: 'common',
      effects: [
        { kind: 'damage', target: 'enemy', amount: 4 },
        { kind: 'damage', target: 'enemy', amount: 5 },
      ],
    }
    const base = startGame(GOD_IDS.fukuei)
    const low: GameState = { ...base, player: { ...base.player, hp: 10 } }

    const effects = GOD_PASSIVE_HOOKS.fukuei_gamble.afterPlay!(low, low, fake)
    // floor((4+5) × 0.5) = 4（hitごとに個別計算しない）
    expect(effects).toEqual([{ kind: 'damage', target: 'enemy', amount: 4 }])
  })

  it('素ダメージが小さく追加が0になる場合は、イベントごと発生しない', () => {
    const fake: CardDef = {
      id: CARD_IDS.strike,
      name: 'テスト微弱',
      text: '',
      type: 'attack',
      cost: 1,
      rarity: 'common',
      effects: [{ kind: 'damage', target: 'enemy', amount: 1 }],
    }
    const base = startGame(GOD_IDS.shouren)
    expect(GOD_PASSIVE_HOOKS.shouren_pristine.afterPlay!(base, base, fake)).toEqual([])
  })

  it('isGodPassiveArmed：HUD表示の条件判定がengineの判定と一致する', () => {
    const sobi = startGame(GOD_IDS.sobi)
    expect(isGodPassiveArmed(sobi)).toBe(false)
    expect(isGodPassiveArmed({ ...sobi, player: { ...sobi.player, block: 1 } })).toBe(true)

    const shouren = startGame(GOD_IDS.shouren)
    expect(isGodPassiveArmed(shouren)).toBe(true)
    expect(isGodPassiveArmed({ ...shouren, player: { ...shouren.player, hp: 23 } })).toBe(false)

    const fukuei = startGame(GOD_IDS.fukuei)
    expect(isGodPassiveArmed(fukuei)).toBe(false)
    expect(isGodPassiveArmed({ ...fukuei, player: { ...fukuei.player, hp: 15 } })).toBe(true)

    expect(isGodPassiveArmed(startGame(GOD_IDS.ebisu))).toBe(false)
  })

  it('得意技の追加ダメージもスコア・Masteryの実効ダメージに正しく乗る', () => {
    const base = startGame(GOD_IDS.sobi)
    const state: GameState = { ...base, player: { ...base.player, block: 20 } }
    const { state: after } = applyAction(state, { type: 'END_ROUND' })
    // 反撃15が実効ダメージとしてスコアに乗る（perDamage 1.2）
    expect(after.score.damage).toBeCloseTo(15 * RULES.score.perDamage, 5)
    expect(after.mastery.bestRoundDamage).toBeGreaterThanOrEqual(15)
  })

  it('神階Ⅳのブロック効率は反撃量にも自然に反映される（追加の補正は入れない）', () => {
    const base = applyAction(null, {
      type: 'START_GAME',
      seed: 'stake4-counter',
      godId: GOD_IDS.sobi,
      enemyId: ENEMY_IDS.trial,
      deck: deckWith(GOD_IDS.sobi, [SOBI_CARD_IDS.unshakableStance]),
      stake: 4,
    }).state
    const state = withHand(base, SOBI_CARD_IDS.unshakableStance)
    // ブロック13 × 効率0.75 = 10（round）
    const played = applyAction(state, { type: 'PLAY_CARD', uid: TEST_UID }).state
    expect(played.player.block).toBe(Math.round(13 * RULES.stakes.blockEfficiency))
  })
})
