import type { CardDef, Effect, GameEvent } from '../../core/types'
import { getCardDef } from '../../core/data/cards'
import { DIVINATION_CHOICES } from '../../core/data/divination'

/**
 * 決定249 Reaction Language v1（docs/REACTION_LANGUAGE_V1_AUDIT.md・決定248）：カードの「意味」。
 *
 * ★表示専用。engine・スコア・seed には一切関与しない。
 * ★カード名・表示文言では分岐しない（不変ルール3と同じ思想）。`Effect[]` のデータだけから導く。
 *
 * 判定：効果を「AP 等価」で重み付けし、最大のものを primary とする（決定248 §2-1）。
 *   STRIKE  … 敵へのダメージ量
 *   GUARD   … ブロック量（加護 `blockOfIntent` は最低保証＋割合の目安）
 *   MEND    … 回復量
 *   TEMPO   … ドロー×4＋神力×4（1 枚・1 AP ≒ 基準 5 ダメージの 8 割）
 *   EMPOWER … 自分の攻撃力バフ×2
 *   WEAKEN  … 敵の攻撃力デバフ×2
 *   ATTUNE  … 共鳴×2.5
 * 同点は下の SEMANTIC_ORDER の順（決定論）。自傷（damage self）と score は意味に数えない（modifier／表示なし）。
 * 条件付き追加効果（bonus）も数えない：本体が何をするカードかで決める（⚡は PAYOFF modifier）。
 */
export type CardSemantic = 'STRIKE' | 'GUARD' | 'MEND' | 'WEAKEN' | 'ATTUNE' | 'TEMPO' | 'EMPOWER'

export const SEMANTIC_ORDER: readonly CardSemantic[] = ['STRIKE', 'GUARD', 'MEND', 'WEAKEN', 'ATTUNE', 'TEMPO', 'EMPOWER']

/** 重み（表示専用の分類係数。ゲームの調整値ではないため rules.ts ではなくここに置く） */
export const SEMANTIC_WEIGHT = {
  damage: 1,
  block: 1,
  heal: 1,
  draw: 4,
  gainAp: 4,
  buff: 2,
  debuff: 2,
  resonance: 2.5,
  /** 加護：予告に比例するので固定量を持たない。最低保証の 5 倍を目安にする（常に GUARD になる大きさ） */
  blockOfIntentPerMin: 5,
} as const

export type SemanticScores = Record<CardSemantic, number>

export function semanticScores(effects: readonly Effect[]): SemanticScores {
  const s: SemanticScores = { STRIKE: 0, GUARD: 0, MEND: 0, WEAKEN: 0, ATTUNE: 0, TEMPO: 0, EMPOWER: 0 }
  const w = SEMANTIC_WEIGHT
  for (const e of effects) {
    switch (e.kind) {
      case 'damage':
        if (e.target === 'enemy') s.STRIKE += e.amount * w.damage
        break
      case 'block':
        s.GUARD += e.amount * w.block
        break
      case 'blockOfIntent':
        s.GUARD += e.min * w.blockOfIntentPerMin
        break
      case 'heal':
        s.MEND += e.amount * w.heal
        break
      case 'draw':
        s.TEMPO += e.amount * w.draw
        break
      case 'gainAp':
        s.TEMPO += e.amount * w.gainAp
        break
      case 'buff':
        // 敵へのバフ（強化）はカードに存在しない。意味に数えない
        if (e.target === 'self') s.EMPOWER += e.amount * w.buff
        break
      case 'debuff':
        if (e.target === 'enemy') s.WEAKEN += e.amount * w.debuff
        break
      case 'resonance':
        s.ATTUNE += e.amount * w.resonance
        break
      case 'score':
        break
    }
  }
  return s
}

/** primary semantic。どの効果も意味を持たない（あり得ない）場合だけ null */
export function primarySemantic(effects: readonly Effect[]): CardSemantic | null {
  const s = semanticScores(effects)
  let best: CardSemantic | null = null
  for (const k of SEMANTIC_ORDER) {
    if (s[k] <= 0) continue
    if (best === null || s[k] > s[best]) best = k
  }
  return best
}

/** secondary（primary の 50% 以上の 2 番手）。HUD の既存反応で表すので、体の反応には使わない */
export function secondarySemantic(effects: readonly Effect[]): CardSemantic | null {
  const s = semanticScores(effects)
  const p = primarySemantic(effects)
  if (!p) return null
  let best: CardSemantic | null = null
  for (const k of SEMANTIC_ORDER) {
    if (k === p || s[k] <= 0) continue
    if (best === null || s[k] > s[best]) best = k
  }
  return best && s[best] >= s[p] * 0.5 ? best : null
}

export type SemanticModifiers = { payoff: boolean; risk: boolean; setup: boolean }

/** modifier：PAYOFF＝条件⚡を持つ／RISK＝自傷を持つ／SETUP＝共鳴を上げる（charged を作る） */
export function semanticModifiers(def: CardDef): SemanticModifiers {
  return {
    payoff: !!def.bonus,
    risk: def.effects.some((e) => e.kind === 'damage' && e.target === 'self'),
    setup: def.effects.some((e) => e.kind === 'resonance' && e.amount > 0),
  }
}

/** 反応の最小単位（決定248 §4）。strike は既存演出（決定232）そのもの＝新しく何もしない */
export type ReactionPrimitive = 'strike' | 'brace' | 'breathe' | 'stagger' | 'rise' | 'deal'

export const PRIMITIVE_OF: Record<CardSemantic, ReactionPrimitive> = {
  STRIKE: 'strike',
  GUARD: 'brace',
  MEND: 'breathe',
  WEAKEN: 'stagger',
  ATTUNE: 'rise',
  EMPOWER: 'rise',
  TEMPO: 'deal',
}

export type ReactionPlan = {
  /** 何を使ったバッチか（カード or 託宣）。無ければ null＝何もしない */
  semantic: CardSemantic | null
  /** 実際に出す新しい primitive（strike・抑止時は null） */
  primitive: Exclude<ReactionPrimitive, 'strike'> | null
  /** rise の色：ATTUNE＝共鳴色／EMPOWER＝攻撃（金） */
  tone: 'resonance' | 'power' | null
  /** OTOMO も小さく反応するか（breathe・ATTUNE の rise） */
  otomo: boolean
  /** deal：このバッチで引いた札（手札の uid） */
  dealUids: string[]
  /** deal：神力が増えた（AP ゲージを 1 回明滅） */
  apFlash: boolean
  /** 抑止の理由（テスト・計測用） */
  suppressed: 'none' | 'strike' | 'hit' | 'burst' | 'enemyTurn' | 'ended' | null
}

const NONE: ReactionPlan = { semantic: null, primitive: null, tone: null, otomo: false, dealUids: [], apFlash: false, suppressed: null }

/**
 * 1 バッチ（1 回の操作で engine が出したイベント列）から、出す反応を 1 つだけ決める。
 *
 * 規則（決定248 §4・§9）：
 * - 起点は CARD_PLAYED（カード）か DIVINATION_USED（託宣）。どちらも無ければ何もしない
 * - STRIKE は既存演出（突き→被弾）がそのまま担う＝新しい primitive は出さない
 * - 同じバッチで敵に当たった／自分が被弾した（⚡の追加ダメージ・得意技の反撃・自傷）なら、
 *   既存の突き・被弾が体を動かすので、体の primitive は出さない（二重発火しない）
 * - 共鳴 7 到達（神の一撃）は既存カットインへ譲る
 * - 決着したバッチ・敵ターンを含むバッチでは出さない
 * - 体を動かす primitive は必ず 1 つ以下
 */
export function planReaction(events: readonly GameEvent[]): ReactionPlan {
  let effects: readonly Effect[] | null = null
  for (const e of events) {
    if (e.t === 'CARD_PLAYED') {
      effects = getCardDef(e.defId).effects
      break
    }
    if (e.t === 'DIVINATION_USED') {
      effects = DIVINATION_CHOICES[e.choiceIndex]?.effects ?? null
      break
    }
  }
  if (!effects) return NONE
  const semantic = primarySemantic(effects)
  if (!semantic) return NONE
  const base: ReactionPlan = { ...NONE, semantic }
  if (events.some((e) => e.t === 'GAME_ENDED')) return { ...base, suppressed: 'ended' }
  if (events.some((e) => e.t === 'ENEMY_ACTED')) return { ...base, suppressed: 'enemyTurn' }
  const primitive = PRIMITIVE_OF[semantic]
  if (primitive === 'strike') return { ...base, suppressed: 'strike' }
  if (events.some((e) => e.t === 'RESONANCE_BURST')) return { ...base, suppressed: 'burst' }
  const bodyHit = events.some((e) => e.t === 'DAMAGE_DEALT' && e.amount + e.blocked > 0)
  // deal は手札と神力ゲージだけを動かす（体を動かさない）ので、被弾・着弾と同時でも出してよい
  if (primitive === 'deal') {
    const dealUids = events.filter((e): e is Extract<GameEvent, { t: 'CARD_DRAWN' }> => e.t === 'CARD_DRAWN').map((e) => e.uid as string)
    const apFlash = effects.some((e) => e.kind === 'gainAp' && e.amount > 0)
    return { ...base, primitive, dealUids, apFlash, suppressed: 'none' }
  }
  if (bodyHit) return { ...base, suppressed: 'hit' }
  return {
    ...base,
    primitive,
    tone: primitive === 'rise' ? (semantic === 'ATTUNE' ? 'resonance' : 'power') : null,
    otomo: primitive === 'breathe' || (primitive === 'rise' && semantic === 'ATTUNE'),
    suppressed: 'none',
  }
}
