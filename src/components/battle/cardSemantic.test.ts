import { describe, expect, it } from 'vitest'
import { ALL_CARDS, CARD_IDS, getCardDef } from '../../core/data/cards'
import { DIVINATION_CHOICES } from '../../core/data/divination'
import { cardDefId, cardUid } from '../../core/types/ids'
import type { GameEvent } from '../../core/types'
import { PRIMITIVE_OF, planReaction, primarySemantic, secondarySemantic, semanticModifiers, semanticScores, type CardSemantic } from './cardSemantic'

const byName = (name: string) => ALL_CARDS.find((c) => c.name === name)!

describe('決定249 semantic（G1／G2）', () => {
  it('G1：60/60 のカードが一意の primary semantic を持つ（unknown 0）', () => {
    expect(ALL_CARDS.length).toBe(60)
    const unknown = ALL_CARDS.filter((c) => primarySemantic(c.effects) === null)
    expect(unknown.map((c) => c.name)).toEqual([])
  })

  it('G1：分類の内訳は決定248 の表と一致する（STRIKE 20／GUARD 11／MEND 9／WEAKEN 7／ATTUNE 6／TEMPO 5／EMPOWER 2）', () => {
    const n: Record<CardSemantic, number> = { STRIKE: 0, GUARD: 0, MEND: 0, WEAKEN: 0, ATTUNE: 0, TEMPO: 0, EMPOWER: 0 }
    for (const c of ALL_CARDS) n[primarySemantic(c.effects)!] += 1
    expect(n).toEqual({ STRIKE: 20, GUARD: 11, MEND: 9, WEAKEN: 7, ATTUNE: 6, TEMPO: 5, EMPOWER: 2 })
  })

  it('G2：同じ効果からは常に同じ semantic（決定論・カード名に依存しない）', () => {
    for (const c of ALL_CARDS) {
      const a = primarySemantic(c.effects)
      const b = primarySemantic([...c.effects].map((e) => ({ ...e })))
      expect(b).toBe(a)
      expect(primarySemantic(c.effects)).toBe(a)
    }
  })

  it('代表例：意味は本体効果で決まり、⚡（bonus）と自傷は数えない', () => {
    expect(primarySemantic(byName('一撃').effects)).toBe('STRIKE')
    expect(primarySemantic(byName('守護').effects)).toBe('GUARD')
    expect(primarySemantic(byName('癒し').effects)).toBe('MEND')
    expect(primarySemantic(byName('呪縛').effects)).toBe('WEAKEN')
    expect(primarySemantic(byName('共振').effects)).toBe('ATTUNE')
    expect(primarySemantic(byName('予言').effects)).toBe('TEMPO')
    expect(primarySemantic(byName('神力の泉').effects)).toBe('TEMPO')
    expect(primarySemantic(byName('闘志').effects)).toBe('EMPOWER')
    // 複合：反撃の刃（敵に8＋block6）は STRIKE、守りの陣（block8＋heal4）は GUARD、からかい半分（敵に7＋atk−4×2R）は WEAKEN
    expect(primarySemantic(byName('反撃の刃').effects)).toBe('STRIKE')
    expect(secondarySemantic(byName('反撃の刃').effects)).toBe('GUARD')
    expect(primarySemantic(byName('守りの陣').effects)).toBe('GUARD')
    expect(primarySemantic(byName('からかい半分').effects)).toBe('WEAKEN')
    // 同点は SEMANTIC_ORDER（長生きの知恵：block4＋heal4 → GUARD）
    expect(primarySemantic(byName('長生きの知恵').effects)).toBe('GUARD')
    // 自傷（豪快な一撃）は STRIKE のまま、modifier に RISK
    expect(primarySemantic(byName('豪快な一撃').effects)).toBe('STRIKE')
    expect(semanticModifiers(byName('豪快な一撃'))).toEqual({ payoff: true, risk: true, setup: false })
    expect(semanticModifiers(byName('共振'))).toEqual({ payoff: true, risk: false, setup: true })
  })

  it('託宣 3 種も同じ語彙で読める（加護＝GUARD／導き＝TEMPO／天啓＝STRIKE）', () => {
    expect(primarySemantic(DIVINATION_CHOICES[0].effects)).toBe('GUARD')
    expect(primarySemantic(DIVINATION_CHOICES[1].effects)).toBe('TEMPO')
    expect(primarySemantic(DIVINATION_CHOICES[2].effects)).toBe('STRIKE')
  })

  it('semantic → primitive は 1 対 1 で決定論（STRIKE は既存演出＝strike）', () => {
    expect(PRIMITIVE_OF).toEqual({ STRIKE: 'strike', GUARD: 'brace', MEND: 'breathe', WEAKEN: 'stagger', ATTUNE: 'rise', EMPOWER: 'rise', TEMPO: 'deal' })
  })

  it('score・敵へのバフは意味に数えない', () => {
    const s = semanticScores([{ kind: 'score', amount: 100 }, { kind: 'buff', target: 'enemy', stat: 'atk', amount: 3, rounds: 1 }])
    expect(Object.values(s).every((v) => v === 0)).toBe(true)
    expect(primarySemantic([{ kind: 'score', amount: 100 }])).toBe(null)
  })
})

const played = (name: string): GameEvent => ({ t: 'CARD_PLAYED', uid: cardUid('c1'), defId: byName(name).id, cost: 1 })
const dmg = (target: 'enemy' | 'self', amount: number, blocked = 0): GameEvent => ({ t: 'DAMAGE_DEALT', target, amount, blocked })

describe('決定249 planReaction（1 バッチ＝体の primitive は 1 つ以下・G8）', () => {
  it('GUARD → brace（神）。OTOMO は反応しない', () => {
    const p = planReaction([played('守護'), { t: 'BLOCK_GAINED', target: 'self', amount: 5 }])
    expect(p).toMatchObject({ semantic: 'GUARD', primitive: 'brace', otomo: false, suppressed: 'none' })
  })
  it('MEND → breathe（神＋OTOMO 小）', () => {
    const p = planReaction([played('癒し'), { t: 'HEALED', amount: 5 }])
    expect(p).toMatchObject({ semantic: 'MEND', primitive: 'breathe', otomo: true })
  })
  it('WEAKEN → stagger（敵）', () => {
    const p = planReaction([played('呪縛'), { t: 'BUFF_APPLIED', target: 'enemy', stat: 'atk', amount: -5, rounds: 3 }])
    expect(p).toMatchObject({ semantic: 'WEAKEN', primitive: 'stagger', otomo: false })
  })
  it('ATTUNE → rise（共鳴色・OTOMO 小）／EMPOWER → rise（金・OTOMO なし）', () => {
    expect(planReaction([played('共振'), { t: 'RESONANCE_GAINED', amount: 2, total: 2 }])).toMatchObject({ primitive: 'rise', tone: 'resonance', otomo: true })
    expect(planReaction([played('闘志'), { t: 'BUFF_APPLIED', target: 'self', stat: 'atk', amount: 2, rounds: 2 }])).toMatchObject({ primitive: 'rise', tone: 'power', otomo: false })
  })
  it('TEMPO → deal（引いた札の uid・神力なら apFlash）', () => {
    const p = planReaction([played('予言'), { t: 'CARD_DRAWN', uid: cardUid('c9'), defId: cardDefId('card_common_attack_01') }, { t: 'CARD_DRAWN', uid: cardUid('c10'), defId: cardDefId('card_common_attack_01') }])
    expect(p).toMatchObject({ primitive: 'deal', dealUids: ['c9', 'c10'], apFlash: false })
    expect(planReaction([played('神力の泉')])).toMatchObject({ primitive: 'deal', dealUids: [], apFlash: true })
  })
  it('STRIKE は既存演出に任せる（primitive null・suppressed=strike）', () => {
    expect(planReaction([played('一撃'), dmg('enemy', 5)])).toMatchObject({ semantic: 'STRIKE', primitive: null, suppressed: 'strike' })
  })
  it('同じバッチに着弾・被弾があれば体の primitive を出さない（⚡の追加ダメージ・得意技・自傷）', () => {
    // 守護の⚡（blocked → 敵に 30）：突き＋被弾が既に体を動かす
    expect(planReaction([played('守護'), { t: 'BLOCK_GAINED', target: 'self', amount: 5 }, { t: 'BONUS_TRIGGERED', defId: byName('守護').id, when: 'blocked' }, dmg('enemy', 3)])).toMatchObject({ primitive: null, suppressed: 'hit' })
    // 完全ブロックで amount 0・blocked>0 も「当たった」扱い
    expect(planReaction([played('癒し'), dmg('enemy', 0, 4)])).toMatchObject({ primitive: null, suppressed: 'hit' })
  })
  it('共鳴 7 到達（神の一撃）のバッチでは出さない（既存カットインへ譲る）', () => {
    expect(planReaction([played('共振'), { t: 'RESONANCE_GAINED', amount: 2, total: 7 }, { t: 'RESONANCE_BURST', total: 7 }])).toMatchObject({ primitive: null, suppressed: 'burst' })
  })
  it('敵ターン・決着のバッチ・起点の無いバッチでは出さない', () => {
    expect(planReaction([played('守護'), { t: 'ENEMY_ACTED', kind: 'attack', amount: 5 }])).toMatchObject({ primitive: null, suppressed: 'enemyTurn' })
    expect(planReaction([played('守護'), { t: 'GAME_ENDED', status: 'won', totalScore: 1 }])).toMatchObject({ primitive: null, suppressed: 'ended' })
    expect(planReaction([{ t: 'ROUND_STARTED', round: 2, apGranted: 3 }])).toMatchObject({ semantic: null, primitive: null })
  })
  it('deal は被弾があっても出る（体を動かさない）が、起点の無いドロー（ラウンド開始）では出ない', () => {
    expect(planReaction([played('予言'), { t: 'CARD_DRAWN', uid: cardUid('c9'), defId: CARD_IDS.strike }, dmg('self', 3)])).toMatchObject({ primitive: 'deal' })
    expect(planReaction([{ t: 'ROUND_STARTED', round: 2, apGranted: 3 }, { t: 'CARD_DRAWN', uid: cardUid('c9'), defId: CARD_IDS.strike }])).toMatchObject({ primitive: null })
  })
  it('託宣：加護 → brace／導き → deal／天啓 → strike（既存）', () => {
    expect(planReaction([{ t: 'DIVINATION_USED', choiceIndex: 0, remaining: 2 }, { t: 'BLOCK_GAINED', target: 'self', amount: 4 }])).toMatchObject({ primitive: 'brace' })
    expect(planReaction([{ t: 'DIVINATION_USED', choiceIndex: 1, remaining: 2 }, { t: 'CARD_DRAWN', uid: cardUid('c3'), defId: CARD_IDS.strike }])).toMatchObject({ primitive: 'deal', apFlash: true })
    expect(planReaction([{ t: 'DIVINATION_USED', choiceIndex: 2, remaining: 2 }, dmg('enemy', 4)])).toMatchObject({ primitive: null, suppressed: 'strike' })
  })
  it('getCardDef の効果と同じ判定（表示側は engine のデータをそのまま読む）', () => {
    for (const c of ALL_CARDS) expect(primarySemantic(getCardDef(c.id).effects)).toBe(primarySemantic(c.effects))
  })
})
