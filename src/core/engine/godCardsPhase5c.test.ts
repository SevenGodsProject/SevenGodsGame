import { afterEach, describe, expect, it } from 'vitest'
import { RULES } from '../data/rules'
import { GOD_IDS } from '../data/gods'
import { ENEMY_IDS } from '../data/enemies'
import { ALL_CARDS, CARD_IDS, FUKUEI_CARDS, SOBI_CARD_IDS, TAIYO_CARD_IDS, getCardDef } from '../data/cards'
import { getRecommendedDeck } from '../data/deckBuilder'
import { cardUid } from '../types/ids'
import type { CardDefId, EnemyActionDef, GameState, GodId } from '../types'
import { applyAction } from './reducer'
import { sumBuff } from './buffs'
import { previewBonusTrigger } from './cardBonus'

/**
 * Phase 5-C（決定159）：神専用カード3枚の条件付き追加効果。
 *
 *   大耀「姉御の号令」 共鳴4以上 → さらに攻撃力+30（1ラウンドのみ）
 *   大耀「豪快な一撃」 共鳴4以上 → 敵に40ダメージ
 *   蒼毘「反撃の刃」   ブロックが予告以上 → 敵に60ダメージ
 *
 * 守っていること：
 *   1. 共鳴は**使う前**の値で判定する（Phase 5-A の charged と同じ。自己成立しない）
 *   2. 号令の bonus バフはそのラウンドだけ。本体の+30（2R）とは別枠で加算され、次のラウンドには本体分だけ残る
 *   3. 反撃の刃の blocked は不動の構えと同じ意味（このカード自身のブロックを足した後 ≧ 予告、溜めでは不成立）
 *   4. 手札の⚡（previewBonusTrigger）と実際の発動が一致する
 *   5. 福永の4枚・他4神・共通カードの bonus は変わっていない
 */

const TEST_UID = cardUid('p5c-card')

function startGame(godId: GodId, seed = 'phase5c-god-cards'): GameState {
  return applyAction(null, {
    type: 'START_GAME',
    seed,
    godId,
    enemyId: ENEMY_IDS.trial,
    deck: getRecommendedDeck(godId),
  }).state
}

function withHand(state: GameState, defId: CardDefId, patch: Partial<GameState> = {}): GameState {
  return { ...state, ap: { current: 9, max: 9 }, hand: [{ uid: TEST_UID, defId }], ...patch }
}
const play = (state: GameState) => applyAction(state, { type: 'PLAY_CARD', uid: TEST_UID })
const withGauge = (state: GameState, value: number): GameState => ({ ...state, resonance: { ...state.resonance, value } })
const withIntent = (state: GameState, intent: EnemyActionDef): GameState => ({ ...state, enemy: { ...state.enemy, intent } })
const withBlock = (state: GameState, block: number): GameState => ({ ...state, player: { ...state.player, block } })
const atkOf = (state: GameState) => sumBuff(state.player.buffs, 'atk')
const bonusFired = (events: { t: string; defId?: CardDefId }[], defId: CardDefId) =>
  events.some((e) => e.t === 'BONUS_TRIGGERED' && e.defId === defId)

const mutableRules = RULES as unknown as { godIdentity: { passivesEnabled: boolean; cardBonusEnabled: boolean } }
afterEach(() => {
  mutableRules.godIdentity.passivesEnabled = true
  mutableRules.godIdentity.cardBonusEnabled = true
})

const COMMAND = TAIYO_CARD_IDS.sisterlyCommand
const BOLD = TAIYO_CARD_IDS.boldStrike
const BLADE = SOBI_CARD_IDS.counterBlade
const threshold = RULES.cardBonus.chargedThreshold

describe('データ：3枚だけに条件が付いている', () => {
  it('号令・豪快は charged、反撃の刃は blocked（新しい条件は無い）', () => {
    expect(getCardDef(COMMAND).bonus).toEqual({
      when: 'charged',
      effects: [{ kind: 'buff', target: 'self', stat: 'atk', amount: 3, rounds: 1 }],
      textJa: '共鳴が4以上なら、さらに攻撃力+30（1ラウンドのみ）。',
    })
    expect(getCardDef(BOLD).bonus).toEqual({
      when: 'charged',
      effects: [{ kind: 'damage', target: 'enemy', amount: 4 }],
      textJa: '共鳴が4以上なら、敵に40ダメージ。',
    })
    expect(getCardDef(BLADE).bonus).toEqual({
      when: 'blocked',
      effects: [{ kind: 'damage', target: 'enemy', amount: 6 }],
      textJa: 'ブロックが敵の予告以上なら、敵に60ダメージ。',
    })
  })

  it('本体（効果・AP・種別）は変えていない', () => {
    expect(getCardDef(COMMAND)).toMatchObject({ cost: 1, type: 'support', effects: [{ kind: 'buff', target: 'self', stat: 'atk', amount: 3, rounds: 2 }] })
    expect(getCardDef(BOLD)).toMatchObject({ cost: 2, type: 'attack', effects: [{ kind: 'damage', target: 'enemy', amount: 14 }, { kind: 'damage', target: 'self', amount: 2 }] })
    expect(getCardDef(BLADE)).toMatchObject({ cost: 2, type: 'attack', effects: [{ kind: 'block', amount: 6 }, { kind: 'damage', target: 'enemy', amount: 8 }] })
  })

  it('福永の専用4枚には bonus が無い（今回は変更しない）', () => {
    expect(FUKUEI_CARDS.filter((c) => c.bonus)).toEqual([])
  })

  it('大耀の残り2枚（一心不乱・後輩想い）にも bonus は無い', () => {
    expect(getCardDef(TAIYO_CARD_IDS.singleMinded).bonus).toBeUndefined()
    expect(getCardDef(TAIYO_CARD_IDS.lookingAfterJuniors).bonus).toBeUndefined()
  })

  it('神専用カードで bonus を持つのは 大耀2・蒼毘3・笑蓮2 だけ（他の神は0）', () => {
    const byGod = new Map<string, number>()
    for (const c of ALL_CARDS) if (c.godId && c.bonus) byGod.set(c.godId, (byGod.get(c.godId) ?? 0) + 1)
    expect(Object.fromEntries(byGod)).toEqual({ [GOD_IDS.taiyo]: 2, [GOD_IDS.sobi]: 3, [GOD_IDS.shouren]: 2 })
  })
})

describe('大耀「姉御の号令」', () => {
  it('1. 共鳴3以下では bonus なし（本体の+30だけ）', () => {
    const state = withGauge(withHand(startGame(GOD_IDS.taiyo), COMMAND), threshold - 1)
    const { state: after, events } = play(state)
    expect(bonusFired(events, COMMAND)).toBe(false)
    expect(atkOf(after)).toBe(3)
  })

  it('2. 共鳴4以上で bonus 発動（本体+30＋bonus+30＝このラウンドは+60）', () => {
    const state = withGauge(withHand(startGame(GOD_IDS.taiyo), COMMAND), threshold)
    const { state: after, events } = play(state)
    expect(bonusFired(events, COMMAND)).toBe(true)
    expect(atkOf(after)).toBe(6)
    // 本体（2R）と bonus（1R）は別枠のバフとして積まれる
    expect(after.player.buffs.filter((b) => b.stat === 'atk').map((b) => [b.amount, b.remainingRounds]).sort()).toEqual([
      [3, 1],
      [3, 2],
    ])
  })

  it('3・4. bonus の+30はこのラウンドのみ。次のラウンドには本体の+30だけが残り、その次で消える', () => {
    const state = withGauge(withHand(startGame(GOD_IDS.taiyo), COMMAND), threshold)
    const played = play(state).state
    expect(atkOf(played)).toBe(6)
    const next = applyAction(played, { type: 'END_ROUND' }).state
    expect(next.round).toBe(played.round + 1)
    expect(atkOf(next)).toBe(3)
    const afterNext = applyAction(next, { type: 'END_ROUND' }).state
    expect(atkOf(afterNext)).toBe(0)
  })

  it('5. 既存の攻撃力バフと合成される（号令を2回：1回目は共鳴3・2回目は共鳴4なら、+30+30+30＝+90）', () => {
    const base = startGame(GOD_IDS.taiyo)
    const first = play(withGauge(withHand(base, COMMAND), threshold - 1)).state
    expect(atkOf(first)).toBe(3)
    const second = play(withGauge(withHand(first, COMMAND), threshold)).state
    expect(atkOf(second)).toBe(9)
  })

  it('号令の後に撃つ攻撃に、bonus分の+30が乗る（「号令を先に使ってから攻撃」の順番の意味）', () => {
    const base = startGame(GOD_IDS.taiyo)
    const commanded = play(withGauge(withHand(base, COMMAND), threshold)).state
    const hpBefore = commanded.enemy.hp
    const struck = applyAction(withHand(commanded, TAIYO_CARD_IDS.singleMinded), { type: 'PLAY_CARD', uid: TEST_UID }).state
    // 一心不乱 40 + 攻撃力+60
    expect(hpBefore - struck.enemy.hp).toBe(4 + 6)
  })
})

describe('大耀「豪快な一撃」', () => {
  it('6. 共鳴3以下では bonus なし（素の140だけ）', () => {
    const state = withGauge(withHand(startGame(GOD_IDS.taiyo), BOLD), threshold - 1)
    const { state: after, events } = play(state)
    expect(bonusFired(events, BOLD)).toBe(false)
    expect(state.enemy.hp - after.enemy.hp).toBe(14)
  })

  it('7. 共鳴4以上で +40（140＋40）', () => {
    const state = withGauge(withHand(startGame(GOD_IDS.taiyo), BOLD), threshold)
    const { state: after, events } = play(state)
    expect(bonusFired(events, BOLD)).toBe(true)
    expect(state.enemy.hp - after.enemy.hp).toBe(14 + 4)
  })

  it('8. 判定はカードを使う前の共鳴で行う（本体・同時処理では自己成立しない）', () => {
    // 豪快な一撃は共鳴を上げないが、使う前の値だけを見ていることを、先に共振で積む順番で確かめる
    const base = withGauge(startGame(GOD_IDS.taiyo), threshold - 2)
    const resonated = applyAction(withHand(base, CARD_IDS.resonate), { type: 'PLAY_CARD', uid: TEST_UID }).state
    expect(resonated.resonance.value).toBeGreaterThanOrEqual(threshold)
    const { state: after, events } = applyAction(withHand(resonated, BOLD), { type: 'PLAY_CARD', uid: TEST_UID })
    expect(bonusFired(events, BOLD)).toBe(true)
    expect(resonated.enemy.hp - after.enemy.hp).toBe(14 + 4)
  })
})

describe('蒼毘「反撃の刃」（blocked：このカードのブロック60を足した後 ≧ 予告）', () => {
  const blade = (block: number, intent: EnemyActionDef) =>
    withIntent(withBlock(withHand(startGame(GOD_IDS.sobi), BLADE), block), intent)

  it('9. ブロック＜予告：bonus なし', () => {
    // 既存0＋刃の6＝6 ＜ 予告7
    const state = blade(0, { kind: 'attack', amount: 7 })
    const { state: after, events } = play(state)
    expect(bonusFired(events, BLADE)).toBe(false)
    expect(state.enemy.hp - after.enemy.hp).toBe(8)
  })

  it('10. ブロック＝予告：bonus 発動', () => {
    // 既存4＋刃の6＝10 ＝ 予告10
    const { events } = play(blade(4, { kind: 'attack', amount: 10 }))
    expect(bonusFired(events, BLADE)).toBe(true)
  })

  it('11. ブロック＞予告：bonus 発動', () => {
    const { events } = play(blade(13, { kind: 'attack', amount: 10 }))
    expect(bonusFired(events, BLADE)).toBe(true)
  })

  it('12. bonus は +60（80＋60）', () => {
    const state = blade(13, { kind: 'attack', amount: 10 })
    const { state: after } = play(state)
    expect(state.enemy.hp - after.enemy.hp).toBe(8 + 6)
  })

  it('溜め（予告0）では成立しない（不動の構えと同じ意味）', () => {
    const { events } = play(blade(20, { kind: 'charge', label: '溜め' }))
    expect(bonusFired(events, BLADE)).toBe(false)
  })

  it('連撃は合計で比べる（UIの予告合計と同じ）', () => {
    expect(bonusFired(play(blade(3, { kind: 'multiAttack', hits: [5, 4] })).events, BLADE)).toBe(true) // 3+6=9 ≧ 9
    expect(bonusFired(play(blade(2, { kind: 'multiAttack', hits: [5, 4] })).events, BLADE)).toBe(false) // 8 ＜ 9
  })

  it('神階Ⅳ以降は刃のブロックに効率0.75がかかった後の値で判定する（加護の例外は刃には及ばない）', () => {
    // 刃のブロック6 → Ⅳ以降は round(4.5)=5。既存4＋5＝9：予告9で成立、予告10で不成立
    const at = (amount: number) => ({ ...blade(4, { kind: 'attack', amount }), stake: 4 })
    expect(bonusFired(play(at(9)).events, BLADE)).toBe(true)
    expect(bonusFired(play(at(10)).events, BLADE)).toBe(false)
  })
})

describe('共通', () => {
  it('13. kill switch（cardBonusEnabled=false）なら3枚とも Phase 5-E の挙動に戻る', () => {
    mutableRules.godIdentity.cardBonusEnabled = false
    const cmd = play(withGauge(withHand(startGame(GOD_IDS.taiyo), COMMAND), threshold))
    expect(bonusFired(cmd.events, COMMAND)).toBe(false)
    expect(atkOf(cmd.state)).toBe(3)
    const boldState = withGauge(withHand(startGame(GOD_IDS.taiyo), BOLD), threshold)
    expect(boldState.enemy.hp - play(boldState).state.enemy.hp).toBe(14)
    const bladeState = withIntent(withBlock(withHand(startGame(GOD_IDS.sobi), BLADE), 13), { kind: 'attack', amount: 10 })
    expect(bladeState.enemy.hp - play(bladeState).state.enemy.hp).toBe(8)
  })

  it('14. 手札の⚡（previewBonusTrigger）と実際の発動が一致する（3枚 × 盤面の総当たり）', () => {
    const intents: EnemyActionDef[] = [
      { kind: 'attack', amount: 5 },
      { kind: 'attack', amount: 10 },
      { kind: 'attack', amount: 16 },
      { kind: 'multiAttack', hits: [5, 5] },
      { kind: 'charge', label: '溜め' },
    ]
    let checked = 0
    for (const [godId, defId] of [
      [GOD_IDS.taiyo, COMMAND],
      [GOD_IDS.taiyo, BOLD],
      [GOD_IDS.sobi, BLADE],
    ] as const) {
      for (const gauge of [0, threshold - 1, threshold, 6]) {
        for (const block of [0, 4, 10]) {
          for (const stake of [0, 4]) {
            for (const intent of intents) {
              const state: GameState = { ...withIntent(withBlock(withGauge(withHand(startGame(godId), defId), gauge), block), intent), stake }
              const predicted = previewBonusTrigger(state, getCardDef(defId))
              expect(bonusFired(play(state).events, defId), `${defId} gauge=${gauge} block=${block} stake=${stake} ${JSON.stringify(intent)}`).toBe(predicted)
              checked++
            }
          }
        }
      }
    }
    expect(checked).toBe(3 * 4 * 3 * 2 * 5)
  })

  it('15. 本文の数字＝効果（×10表示）は cardTextScale.test.ts が bonus 全件で検査している。ここでは3枚が対象に入っていることだけ確かめる', () => {
    for (const id of [COMMAND, BOLD, BLADE]) expect(getCardDef(id).bonus?.textJa).toMatch(/[0-9]+/)
  })

  it('18. saveVersion は 9 のまま（GameState の形は変えていない）', () => {
    expect(RULES.saveVersion).toBe(9)
    expect(startGame(GOD_IDS.taiyo).version).toBe(9)
  })

  it('16. 決定論：同じ種・同じ手順なら盤面も rngCursor も一致する', () => {
    const run = () => {
      let s = withGauge(startGame(GOD_IDS.taiyo, 'p5c-determinism'), threshold)
      s = play(withHand(s, COMMAND)).state
      s = play(withHand(s, BOLD)).state
      return s
    }
    expect(run()).toEqual(run())
  })
})
