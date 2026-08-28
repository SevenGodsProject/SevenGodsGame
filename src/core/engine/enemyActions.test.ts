import { describe, expect, it } from 'vitest'
import { GOD_IDS } from '../data/gods'
import { ENEMIES, ENEMY_IDS, getEnemyDef } from '../data/enemies'
import { getRecommendedDeck } from '../data/deckBuilder'
import { RULES } from '../data/rules'
import type { Difficulty, EnemyActionDef, GameState, GodId } from '../types'
import { applyAction } from './reducer'
import { enemyActionTotal, runEnemyTurn, startRound } from './round'
import { createRng } from '../rng/seededRandom'

/**
 * ENEMY-IDENTITY-PROTOTYPE-02（CEO GO）の仕様検証。
 * - multiAttack（連撃）/ special（必殺技）行動
 * - debuffはaction合計へ1回適用（per-hit適用はPROTOTYPE-01で寿楽S率51%の
 *   farming破綻を確認済みのため禁止）
 * - 難易度倍率は合計保存丸め（per-hit丸めはhard勝率を崩すことを確認済み）
 * - Mastery MODEL-B：1 enemy action = 1 sample（specialも含める）
 */

function startWith(godId: GodId, enemyKey: 'karakuri' | 'juuma' | 'trial', difficulty: Difficulty = 'normal'): GameState {
  return applyAction(null, {
    type: 'START_GAME',
    seed: `enemy-actions-${godId}-${enemyKey}-${difficulty}`,
    godId,
    enemyId: ENEMY_IDS[enemyKey],
    deck: getRecommendedDeck(godId),
    difficulty,
  }).state
}

/** 任意のintent・敵atkバフ・自blockで敵ターンを1回実行する */
function enemyTurnWith(
  state: GameState,
  intent: EnemyActionDef,
  opts: { debuff?: number; block?: number } = {},
): { state: GameState; events: ReturnType<typeof runEnemyTurn>['events'] } {
  const staged: GameState = {
    ...state,
    player: { ...state.player, block: opts.block ?? 0 },
    enemy: {
      ...state.enemy,
      intent,
      buffs: opts.debuff ? [{ stat: 'atk', amount: -opts.debuff, remainingRounds: 2 }] : [],
    },
  }
  return runEnemyTurn(staged)
}

describe('K-C2/M-G 敵データ（CEO GO仕様）', () => {
  it('機工師：R4がcharge予告・R5が必殺技「主砲・神滅甲」内部24', () => {
    const def = getEnemyDef(ENEMY_IDS.karakuri)
    expect(def.actions[3].kind).toBe('charge')
    expect(def.actions[4]).toEqual({ kind: 'special', amount: 24, name: '主砲・神滅甲' })
  })

  it('魔獣：全ラウンド連撃で、各ラウンド合計はbaselineと同値（9,10,12,13,14,15,16）', () => {
    const def = getEnemyDef(ENEMY_IDS.juuma)
    const totals = def.actions.map((a) => enemyActionTotal(a))
    expect(totals).toEqual([9, 10, 12, 13, 14, 15, 16])
    for (const a of def.actions) expect(a.kind).toBe('multiAttack')
  })

  it('魔獣：R3は必殺技「双牙乱撃」4×3', () => {
    const def = getEnemyDef(ENEMY_IDS.juuma)
    expect(def.actions[2]).toEqual({ kind: 'multiAttack', hits: [4, 4, 4], name: '双牙乱撃', special: true })
  })

  it('機工師・魔獣以外の5体は従来のattack/chargeのみ（横展開前の現状保証）', () => {
    const untouched = ENEMIES.filter(
      (e) => e.id !== ENEMY_IDS.karakuri && e.id !== ENEMY_IDS.juuma,
    )
    expect(untouched.length).toBe(5)
    for (const e of untouched) {
      for (const a of e.actions) expect(['attack', 'charge']).toContain(a.kind)
    }
  })
})

describe('難易度スケーリング（合計保存丸め）', () => {
  const intentOf = (state: GameState) => state.enemy.intent

  function jumaIntentAtRound(round: number, difficulty: Difficulty) {
    const base = startWith(GOD_IDS.ebisu, 'juuma', difficulty)
    // startRoundを対象roundで直接呼び、difficulty倍率済みintentを得る
    const staged = { ...base, round }
    const rng = createRng(staged.seed, staged.rngCursor)
    return intentOf(startRound(staged, rng).state)
  }

  it('hard：双牙乱撃[4,4,4]は合計round(12×1.15)=14を[5,5,4]へ配分（per-hit丸めの[5,5,5]=15にしない）', () => {
    const intent = jumaIntentAtRound(3, 'hard')
    expect(intent).toMatchObject({ kind: 'multiAttack', hits: [5, 5, 4] })
    expect(enemyActionTotal(intent!)).toBe(Math.round(12 * 1.15))
  })

  it('easy：[4,4,4]は合計round(12×0.85)=10を[4,3,3]へ配分', () => {
    const intent = jumaIntentAtRound(3, 'easy')
    expect(intent).toMatchObject({ kind: 'multiAttack', hits: [4, 3, 3] })
    expect(enemyActionTotal(intent!)).toBe(Math.round(12 * 0.85))
  })

  it('normal：倍率1では無変形', () => {
    const intent = jumaIntentAtRound(3, 'normal')
    expect(intent).toMatchObject({ kind: 'multiAttack', hits: [4, 4, 4] })
  })

  it('special単発は従来どおりround（24×1.15=27.6→28）', () => {
    const base = startWith(GOD_IDS.ebisu, 'karakuri', 'hard')
    const staged = { ...base, round: 5 }
    const rng = createRng(staged.seed, staged.rngCursor)
    const intent = intentOf(startRound(staged, rng).state)
    expect(intent).toMatchObject({ kind: 'special', amount: 28, name: '主砲・神滅甲' })
  })
})

describe('連撃のダメージ処理（共有debuff・逐次block pool）', () => {
  it('debuffなし：[4,4,4]はhitごとにDAMAGE_DEALTが3回出て合計12を受ける', () => {
    const base = startWith(GOD_IDS.ebisu, 'juuma')
    const hpBefore = base.player.hp
    const { state, events } = enemyTurnWith(base, { kind: 'multiAttack', hits: [4, 4, 4] })
    const hits = events.filter((e) => e.t === 'DAMAGE_DEALT' && e.target === 'self')
    expect(hits.length).toBe(3)
    expect(state.player.hp).toBe(hpBefore - 12)
    const acted = events.find((e) => e.t === 'ENEMY_ACTED')
    expect(acted).toMatchObject({ kind: 'multiAttack', amount: 12 })
  })

  it('debuff-5はaction合計へ1回だけ適用（[4,4,4]→実害7。per-hit適用なら0になってしまう）', () => {
    const base = startWith(GOD_IDS.ebisu, 'juuma')
    const hpBefore = base.player.hp
    const { state } = enemyTurnWith(base, { kind: 'multiAttack', hits: [4, 4, 4] }, { debuff: 5 })
    expect(state.player.hp).toBe(hpBefore - 7)
  })

  it('debuffが合計以上なら実害0（単発と等価）', () => {
    const base = startWith(GOD_IDS.ebisu, 'juuma')
    const hpBefore = base.player.hp
    const { state } = enemyTurnWith(base, { kind: 'multiAttack', hits: [4, 4, 4] }, { debuff: 12 })
    expect(state.player.hp).toBe(hpBefore)
  })

  it('blockは同一poolから逐次消費（block10 vs 4+4+4 → 実害2＝単発12と同じ）', () => {
    const base = startWith(GOD_IDS.ebisu, 'juuma')
    const hpBefore = base.player.hp
    const { state } = enemyTurnWith(base, { kind: 'multiAttack', hits: [4, 4, 4] }, { block: 10 })
    expect(state.player.hp).toBe(hpBefore - 2)
    expect(state.player.block).toBe(0)
  })

  it('敵の正のatkバフは先頭hitへ加算される（単発では従来のamount+buffと同値）', () => {
    const base = startWith(GOD_IDS.ebisu, 'juuma')
    const staged: GameState = {
      ...base,
      enemy: {
        ...base.enemy,
        intent: { kind: 'multiAttack', hits: [4, 4, 4] },
        buffs: [{ stat: 'atk', amount: 3, remainingRounds: 2 }],
      },
    }
    const hpBefore = staged.player.hp
    const next = runEnemyTurn(staged).state
    expect(next.player.hp).toBe(hpBefore - 15)
  })
})

describe('寿楽Mastery MODEL-B（1 action = 1 sample）', () => {
  it('連撃[4,4,4]＋debuff5 → sample数1・rate=5/12（3票にならない）', () => {
    const base = startWith(GOD_IDS.juraku, 'juuma')
    const { state } = enemyTurnWith(base, { kind: 'multiAttack', hits: [4, 4, 4] }, { debuff: 5 })
    expect(state.mastery.attackCount).toBe(1)
    expect(state.mastery.reductionRateSum).toBeCloseTo(5 / 12)
  })

  it('強打ゲートはaction合計で判定：合計12≥10の連撃を半分以下（実害6）でtrue', () => {
    const base = startWith(GOD_IDS.juraku, 'juuma')
    const { state } = enemyTurnWith(base, { kind: 'multiAttack', hits: [4, 4, 4] }, { debuff: 6 })
    expect(state.mastery.strongNeutralized).toBe(true)
  })

  it('必殺技（special）も通常sampleとして含まれる：神滅甲24を-12で半減 → ゲートtrue・rate0.5', () => {
    const base = startWith(GOD_IDS.juraku, 'karakuri')
    const { state } = enemyTurnWith(base, { kind: 'special', amount: 24, name: '主砲・神滅甲' }, { debuff: 12 })
    expect(state.mastery.attackCount).toBe(1)
    expect(state.mastery.reductionRateSum).toBeCloseTo(0.5)
    expect(state.mastery.strongNeutralized).toBe(true)
  })
})

describe('蒼毘Mastery MODEL-B（1 action = 1 票）', () => {
  it('連撃[4,4,4]を全hit完全吸収（block12）→ 分母1・fullyBlocked1（3票にならない）', () => {
    const base = startWith(GOD_IDS.sobi, 'juuma')
    const { state } = enemyTurnWith(base, { kind: 'multiAttack', hits: [4, 4, 4] }, { block: 12 })
    expect(state.mastery.guardAttackCount).toBe(1)
    expect(state.mastery.fullyBlockedCount).toBe(1)
  })

  it('一部hitが貫通（block8）→ 分母1・fullyBlocked0（部分点なし）', () => {
    const base = startWith(GOD_IDS.sobi, 'juuma')
    const { state } = enemyTurnWith(base, { kind: 'multiAttack', hits: [4, 4, 4] }, { block: 8 })
    expect(state.mastery.guardAttackCount).toBe(1)
    expect(state.mastery.fullyBlockedCount).toBe(0)
  })

  it('debuffで実害合計0になった連撃は分母にも入らない（寿楽の領分と分離）', () => {
    const base = startWith(GOD_IDS.sobi, 'juuma')
    const { state } = enemyTurnWith(base, { kind: 'multiAttack', hits: [4, 4, 4] }, { debuff: 12 })
    expect(state.mastery.guardAttackCount).toBe(0)
  })

  it('必殺技も票に含まれる：神滅甲24をblock24で完全吸収 → 1票fully', () => {
    const base = startWith(GOD_IDS.sobi, 'karakuri')
    const { state } = enemyTurnWith(base, { kind: 'special', amount: 24, name: '主砲・神滅甲' }, { block: 24 })
    expect(state.mastery.guardAttackCount).toBe(1)
    expect(state.mastery.fullyBlockedCount).toBe(1)
  })
})

describe('intentイベント（telegraph）', () => {
  it('必殺技のENEMY_INTENT_SETはkind/amount/labelを持つ', () => {
    const base = startWith(GOD_IDS.ebisu, 'karakuri')
    const staged = { ...base, round: 5 }
    const rng = createRng(staged.seed, staged.rngCursor)
    const { events } = startRound(staged, rng)
    const intentEv = events.find((e) => e.t === 'ENEMY_INTENT_SET')
    expect(intentEv).toMatchObject({ kind: 'special', amount: 24, label: '主砲・神滅甲' })
  })

  it('R4充填chargeのintentはlabelに警告文を持つ', () => {
    const base = startWith(GOD_IDS.ebisu, 'karakuri')
    const staged = { ...base, round: 4 }
    const rng = createRng(staged.seed, staged.rngCursor)
    const { events } = startRound(staged, rng)
    const intentEv = events.find((e) => e.t === 'ENEMY_INTENT_SET')
    expect(intentEv).toMatchObject({ kind: 'charge', label: '⚠ 主砲充填開始…！' })
  })

  it('双牙乱撃のENEMY_ACTEDはlabelに技名を持つ', () => {
    const base = startWith(GOD_IDS.ebisu, 'juuma')
    const { events } = enemyTurnWith(base, { kind: 'multiAttack', hits: [4, 4, 4], name: '双牙乱撃', special: true })
    const acted = events.find((e) => e.t === 'ENEMY_ACTED')
    expect(acted).toMatchObject({ kind: 'multiAttack', amount: 12, label: '双牙乱撃' })
  })
})

describe('saveVersion', () => {
  it('v7である', () => {
    expect(RULES.saveVersion).toBe(7)
  })
})
