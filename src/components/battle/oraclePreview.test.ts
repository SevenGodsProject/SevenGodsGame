import { describe, expect, it } from 'vitest'
import { applyAction } from '../../core/engine/reducer'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { GOD_IDS } from '../../core/data/gods'
import { ENEMY_IDS } from '../../core/data/enemies'
import { CARD_IDS } from '../../core/data/cards/common'
import { DIVINATION_CHOICES } from '../../core/data/divination'
import { RULES } from '../../core/data/rules'
import { getCardDef } from '../../core/data/cards'
import type { CardDefId, CardInstance, CardUid, GameState } from '../../core/types'
import {
  GUIDE_NO_CANDIDATE_SHORT,
  GUIDE_NO_CANDIDATE_TEXT,
  oraclePreviewShortTexts,
  ORACLE_ROLE_WORDS,
  cardDisplayValue,
  guideApGain,
  guideUnlockedCards,
  oraclePreviewTexts,
  previewGuardText,
  previewGuideText,
  previewStrikeText,
  splitOracleName,
  strikeDamage,
  strikeWouldKill,
} from './oraclePreview'

function start(): GameState {
  return applyAction(null, { type: 'START_GAME', seed: 'd253-preview', godId: GOD_IDS.taiyo, enemyId: ENEMY_IDS.oni, deck: getRecommendedDeck(GOD_IDS.taiyo), difficulty: 'normal' }).state
}
const inst = (defId: CardDefId, i: number, costModifier?: number): CardInstance => ({ uid: `t${i}` as CardUid, defId, ...(costModifier !== undefined ? { costModifier } : {}) })
const withHand = (state: GameState, hand: CardInstance[], ap: number): GameState => ({ ...state, hand, ap: { current: ap, max: ap } })

describe('決定253 oraclePreview（表示専用の純関数）', () => {
  it('役割語は加護・導き・天啓の順で「守る／整える／攻める」。名前は本体と「の託宣」に分かれる', () => {
    expect(ORACLE_ROLE_WORDS).toEqual(['守る', '整える', '攻める'])
    expect(DIVINATION_CHOICES.map((c) => c.name)).toEqual(['加護の託宣', '導きの託宣', '天啓の託宣'])
    expect(splitOracleName('導きの託宣')).toEqual({ main: '導き', suffix: 'の託宣' })
    expect(splitOracleName('託宣')).toEqual({ main: '託宣', suffix: '' })
  })

  it('加護：既存 previewIntentGuard と同じ実数を文にする（予告 50 → 最低保証 20）', () => {
    const s = start() // 鬼将 R1 予告 5 → floor(5×0.5)=2 → max(2, 2)=2 → 表示 20
    expect(previewGuardText(s)).toBe('今なら ブロック20')
    const big = { ...s, enemy: { ...s.enemy, intent: { kind: 'attack' as const, amount: 26 } } }
    expect(previewGuardText(big)).toBe(`今なら ブロック${Math.floor(26 * RULES.divination.guardRatio) * 10}`)
  })

  it('導き：神力が 1 足りない札だけを候補にし（境界：cost = AP+1 は含む・cost = AP は含まない・AP+2 は含まない）、価値順の先頭を示す', () => {
    expect(guideApGain()).toBe(1)
    const s = withHand(start(), [inst(CARD_IDS.strike, 1), inst(CARD_IDS.heavyBlow, 2), inst(CARD_IDS.allOutStrike, 3), inst(CARD_IDS.guard, 4)], 1)
    // AP 1：一撃(1)・守護(1) は今出せる → 対象外。剛撃(2) は候補。渾身の一撃(3) は AP+2 → 対象外
    expect(guideUnlockedCards(s).map((d) => d.name)).toEqual(['剛撃'])
    expect(previewGuideText(s)).toBe('今なら『剛撃』が出せる')
    // AP 2：渾身の一撃(3) が候補になり、剛撃(2) は今出せるので外れる
    const s2 = withHand(s, s.hand, 2)
    expect(previewGuideText(s2)).toBe('今なら『渾身の一撃』が出せる')
  })

  it('導き：候補が複数なら価値順の先頭 1 枚（同点は手札順）。costModifier も反映する', () => {
    const s = withHand(start(), [inst(CARD_IDS.ironStance, 1), inst(CARD_IDS.heavyBlow, 2), inst(CARD_IDS.curse, 3)], 1)
    // 鉄壁の構え(2) block 12 → 12／剛撃(2) damage 12 → 12／呪縛(2) debuff 5×3 → 15 → 呪縛が先頭
    expect(cardDisplayValue(getCardDef(CARD_IDS.curse))).toBe(15)
    expect(cardDisplayValue(getCardDef(CARD_IDS.heavyBlow))).toBe(12)
    expect(cardDisplayValue(getCardDef(CARD_IDS.ironStance))).toBe(12)
    expect(previewGuideText(s)).toBe('今なら『呪縛』が出せる')
    // 同点（鉄壁 12・剛撃 12）は手札順
    const tie = withHand(s, [inst(CARD_IDS.heavyBlow, 2), inst(CARD_IDS.ironStance, 1)], 1)
    expect(previewGuideText(tie)).toBe('今なら『剛撃』が出せる')
    // costModifier −1 の渾身の一撃(3→2) は AP 1 で候補になる
    const mod = withHand(s, [inst(CARD_IDS.allOutStrike, 9, -1)], 1)
    expect(previewGuideText(mod)).toBe('今なら『渾身の一撃』が出せる')
  })

  it('導き：候補が無いとき（手札が全部出せる／全部遠い／手札 0）は誤解を生まない fallback 文言', () => {
    const none1 = withHand(start(), [inst(CARD_IDS.strike, 1), inst(CARD_IDS.guard, 2)], 3) // 全部出せる
    const none2 = withHand(start(), [inst(CARD_IDS.allOutStrike, 1), inst(CARD_IDS.oracle, 2)], 1) // 全部 AP+2 以上
    const none3 = withHand(start(), [], 0)
    for (const s of [none1, none2, none3]) expect(previewGuideText(s)).toBe(GUIDE_NO_CANDIDATE_TEXT)
    expect(GUIDE_NO_CANDIDATE_TEXT).toBe('札を1枚引く（出せる札は増えない）')
  })

  it('天啓：撃破判定は敵ブロック込み（残 HP＋ブロック ≤ 40 で「今なら 撃破」、それ以外は「40ダメージ」）', () => {
    expect(strikeDamage()).toBe(4)
    const s = start()
    expect(previewStrikeText(s)).toBe('40ダメージ')
    expect(previewStrikeText({ ...s, enemy: { ...s.enemy, hp: 4, block: 0 } })).toBe('今なら 撃破')
    expect(strikeWouldKill({ ...s, enemy: { ...s.enemy, hp: 3, block: 1 } })).toBe(true)
    expect(strikeWouldKill({ ...s, enemy: { ...s.enemy, hp: 3, block: 2 } })).toBe(false)
    expect(previewStrikeText({ ...s, enemy: { ...s.enemy, hp: 5, block: 0 } })).toBe('40ダメージ')
  })

  it('3 択の状況表示は DIVINATION_CHOICES の並びに追随し、null になるのは加護が予告なしのときだけ', () => {
    const s = withHand(start(), [inst(CARD_IDS.heavyBlow, 1)], 1)
    expect(oraclePreviewTexts(s)).toEqual(['今なら ブロック20', '今なら『剛撃』が出せる', '40ダメージ'])
    const noIntent = { ...s, enemy: { ...s.enemy, intent: null } }
    expect(oraclePreviewTexts(noIntent)[0]).toBe('今なら ブロック20') // 予告なしでも最低保証 20（engine と同じ）
  })

  it('SP 用の短い形：加護「ブロックNN」／導き「『札名』」or「札を1枚引く」／天啓「撃破」or「40ダメージ」（長い形と同じ判定）', () => {
    const s = withHand(start(), [inst(CARD_IDS.heavyBlow, 1)], 1)
    expect(oraclePreviewShortTexts(s)).toEqual(['ブロック20', '『剛撃』', '40ダメージ'])
    expect(oraclePreviewShortTexts(withHand(s, [], 0))[1]).toBe(GUIDE_NO_CANDIDATE_SHORT)
    expect(oraclePreviewShortTexts({ ...s, enemy: { ...s.enemy, hp: 2, block: 2 } })[2]).toBe('撃破')
    // 長い形と短い形は同じ事実（札名・撃破判定・ブロック量）を指す
    expect(oraclePreviewTexts(s)[1]).toContain('剛撃')
  })

  it('SP 長文 fallback：文言はカード名を含む全文で返し、省略は CSS（text-overflow）に委ねる＝データは欠けない', () => {
    const s = withHand(start(), [inst(CARD_IDS.risingTide, 1)], 2) // 秘技・満ちる（cost 3）
    const text = previewGuideText(s)
    expect(text).toBe('今なら『秘技・満ちる』が出せる')
    expect(text.length).toBeGreaterThan(9) // SP 幅（≈69px・9px 字）で 7〜8 字に切れる長さ → ellipsis の対象
  })
})
