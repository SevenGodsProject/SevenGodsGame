import type { CardDef, Effect, GameState } from '../../core/types'
import { DIVINATION_CHOICES } from '../../core/data/divination'
import { getCardDef } from '../../core/data/cards'
import { previewIntentGuard } from '../../core/engine/effects'
import { formatScaled } from '../displayScale'

/**
 * 決定253（Oracle Readability v1）：託宣 3 択の「役割語」と「今使えば何が起きるか」を表示するための純関数。
 *
 * 表示専用。engine は一切参照しない（engine 側の値＝`DIVINATION_CHOICES` の effects・`RULES.divination`・
 * カードの cost を読むだけで、表示と実際の効果が食い違わないようにする）。決定252 の Preflight 監査で
 * 「導きは PC 標準（1508×660）と SP で名前しか見えず、加護だけに『今なら ブロック』がある」ことが
 * 導き 0% の主因（UI）と判定されたため、3 択すべてに状況表示を持たせる。
 *
 * - 加護：既存 `previewIntentGuard`（engine と同じ 2 関数）をそのまま使う
 * - 導き：手札のうち「今の神力では出せないが、導きの神力を足せば出せる」札を探し、価値順の先頭 1 枚を示す
 * - 天啓：敵の残り HP＋ブロックが天啓のダメージ以下なら「撃破」、それ以外は固定ダメージ
 */

/** 3 択の役割語（決定253 §4-3 ①）。`DIVINATION_CHOICES` の並び（加護・導き・天啓）に対応する固定配列 */
export const ORACLE_ROLE_WORDS = ['守る', '整える', '攻める'] as const

/** SP で「◯◯の託宣」の接尾辞を畳むため、名前を本体と接尾辞に分ける（表示のみ。データの name は不変） */
export function splitOracleName(name: string): { main: string; suffix: string } {
  const suffix = 'の託宣'
  return name.endsWith(suffix) ? { main: name.slice(0, -suffix.length), suffix } : { main: name, suffix: '' }
}

function sumEffect(effects: readonly Effect[], kind: Effect['kind'], target?: 'enemy' | 'self'): number {
  return effects.reduce((sum, e) => {
    if (e.kind !== kind) return sum
    if (target && 'target' in e && e.target !== target) return sum
    return sum + ('amount' in e ? e.amount : 0)
  }, 0)
}

/** 導きが与える神力（`DIVINATION_CHOICES[1]` の gainAp 合計。データから読むので数値変更に自動で追随） */
export function guideApGain(): number {
  return sumEffect(DIVINATION_CHOICES[1].effects, 'gainAp')
}

/**
 * 「価値」＝表示上の並び順を決めるための目安（決定249 の semantic 重みと同じ系統。engine には無関係）。
 * 敵へのダメージ 1・ブロック 1・回復 1・ドロー／神力 4・共鳴 2.5・バフ／デバフは量×ラウンド。
 */
export function cardDisplayValue(def: CardDef): number {
  return def.effects.reduce((sum, e) => {
    switch (e.kind) {
      case 'damage': return e.target === 'enemy' ? sum + e.amount : sum
      case 'block': return sum + e.amount
      case 'heal': return sum + e.amount
      case 'draw': return sum + e.amount * 4
      case 'gainAp': return sum + e.amount * 4
      case 'resonance': return sum + e.amount * 2.5
      case 'buff': return e.target === 'self' ? sum + e.amount * e.rounds : sum
      case 'debuff': return e.target === 'enemy' ? sum + e.amount * e.rounds : sum
      default: return sum
    }
  }, 0)
}

/**
 * 導きを今使うと新たに出せるようになる札（cost が「今の神力より大きく、神力＋導きの神力 以下」）。
 * 価値順（同点は手札順）に並べて返す。空配列＝導きを使っても、この手札では出せる札が増えない。
 */
export function guideUnlockedCards(state: GameState): CardDef[] {
  const ap = state.ap.current
  const after = ap + guideApGain()
  return state.hand
    .map((instance) => ({ def: getCardDef(instance.defId), cost: getCardDef(instance.defId).cost + (instance.costModifier ?? 0) }))
    .filter(({ cost }) => cost > ap && cost <= after)
    .sort((a, b) => cardDisplayValue(b.def) - cardDisplayValue(a.def))
    .map(({ def }) => def)
}

/** 天啓のダメージ（`DIVINATION_CHOICES[2]` の敵ダメージ合計） */
export function strikeDamage(): number {
  return sumEffect(DIVINATION_CHOICES[2].effects, 'damage', 'enemy')
}

/** 天啓で撃破できるか。engine の `applyDamage` と同じ順（敵ブロックを先に消費）＝ 残 HP＋ブロック ≤ ダメージ */
export function strikeWouldKill(state: GameState): boolean {
  return state.enemy.hp + state.enemy.block <= strikeDamage()
}

/** 導きの候補が無いときの文言。効果（札を引く）だけを述べ、出せる札が増えないことを明示する */
export const GUIDE_NO_CANDIDATE_TEXT = '札を1枚引く（出せる札は増えない）'
/** SP（79px 枠）向けの短い形。長い形は title 属性（効果文）と PC 表示が担う */
export const GUIDE_NO_CANDIDATE_SHORT = '札を1枚引く'

/** 導きの状況表示 */
export function previewGuideText(state: GameState): string {
  const [first] = guideUnlockedCards(state)
  return first ? `今なら『${first.name}』が出せる` : GUIDE_NO_CANDIDATE_TEXT
}

/** 天啓の状況表示 */
export function previewStrikeText(state: GameState): string {
  return strikeWouldKill(state) ? '今なら 撃破' : `${formatScaled(strikeDamage())}ダメージ`
}

/** 加護の状況表示（既存 Phase 5-D の実数をそのまま文にする） */
export function previewGuardText(state: GameState): string | null {
  const gained = previewIntentGuard(state, DIVINATION_CHOICES[0].effects)
  return gained == null ? null : `今なら ブロック${formatScaled(gained)}`
}

/**
 * SP（≤899px・ボタン内幅 ≈67px）向けの短い状況表示。長い形（PC）と同じ事実を、札名／数値だけで示す。
 * 加護「ブロック130」／導き「『剛撃』」または「札を1枚引く」／天啓「撃破」または「40ダメージ」
 */
export function previewGuardShort(state: GameState): string | null {
  const gained = previewIntentGuard(state, DIVINATION_CHOICES[0].effects)
  return gained == null ? null : `ブロック${formatScaled(gained)}`
}
export function previewGuideShort(state: GameState): string {
  const [first] = guideUnlockedCards(state)
  return first ? `『${first.name}』` : GUIDE_NO_CANDIDATE_SHORT
}
export function previewStrikeShort(state: GameState): string {
  return strikeWouldKill(state) ? '撃破' : `${formatScaled(strikeDamage())}ダメージ`
}

/**
 * 3 択すべての状況表示（`DIVINATION_CHOICES` の並び順）。並びに依存しないよう、各選択肢の effects を見て決める：
 * blockOfIntent を含む → 加護／gainAp・draw を含む → 導き／敵 damage を含む → 天啓。
 */
export function oraclePreviewTexts(state: GameState): (string | null)[] {
  return DIVINATION_CHOICES.map((choice) => {
    const kinds = new Set(choice.effects.map((e) => e.kind))
    if (kinds.has('blockOfIntent')) return previewGuardText(state)
    if (kinds.has('gainAp') || kinds.has('draw')) return previewGuideText(state)
    if (choice.effects.some((e) => e.kind === 'damage' && e.target === 'enemy')) return previewStrikeText(state)
    return null
  })
}

/** 3 択すべての短い状況表示（SP 用・`oraclePreviewTexts` と同じ判定順） */
export function oraclePreviewShortTexts(state: GameState): (string | null)[] {
  return DIVINATION_CHOICES.map((choice) => {
    const kinds = new Set(choice.effects.map((e) => e.kind))
    if (kinds.has('blockOfIntent')) return previewGuardShort(state)
    if (kinds.has('gainAp') || kinds.has('draw')) return previewGuideShort(state)
    if (choice.effects.some((e) => e.kind === 'damage' && e.target === 'enemy')) return previewStrikeShort(state)
    return null
  })
}
