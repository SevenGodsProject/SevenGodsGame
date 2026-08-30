import type { EnemyId } from '../types'
import { RULES } from './rules'
import { ENEMY_IDS } from './enemies'

/**
 * 決定126：神階（しんかい）Ⅰ〜Ⅶ — Stakes型チャレンジシステム。
 *
 * Ⅰ〜Ⅵで現世の神域を奥へ進み、最終試練を越えた者だけがⅦ「高天原」へ至る、
 * SEVEN GODS独自の神域攻略表現（神社参拝の道程そのものとは定義しない）。
 *
 * 設計原則（決定126、AI判断・シミュレーション約33,000試合で検証）：
 * - 累積方式：段が上がるほど以前の制約が積み重なる（置換方式は単調な難易度曲線にならず不採用）
 * - 難易度は「ふつう」基準に固定（hard基底では Ⅰ57%→Ⅱ37% と崩壊）
 * - 修正子は「情報は見えているが対応が難しい」型のみ。敵予告を隠す・変える・裏切る修正子は禁止
 * - HP+（防御神に効く）と ATK+（攻撃神に効く）を交互に積み、神の公平性を保つ。
 *   ドロー−1・共鳴上限・ラウンド短縮は特定神を0%に落とすため不採用
 * - Ⅶは選択式：プレイヤーが自分の神の弱点を避けて難所を選ぶ
 *
 * 数値は全て `RULES.stakes`（rules.ts）に集約する（不変ルール4）。
 * ここは「段 → 累積ルール」の純粋な解決と表示用データだけを持つ。
 */
export const STAKE_MAX = 7
export type StakeLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
export type StakeChoiceId = 'race' | 'pressure' | 'tempo'

export const STAKE_NUMERALS = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ'] as const

export type StakeLevelDef = {
  level: StakeLevel
  numeral: string
  nameJa: string
  /** この段で新たに加わる制約の説明（累積表示は describeStakeRules を使う） */
  addedRuleJa: string
  /** 世界観テキスト（1行） */
  flavorJa: string
}

export const STAKE_LEVELS: StakeLevelDef[] = [
  { level: 1, numeral: 'Ⅰ', nameJa: '参道', addedRuleJa: `託宣${RULES.stakes.divinationCount}回まで・R${RULES.stakes.lateRoundFrom}以降 敵の攻撃+${Math.round((RULES.stakes.lateRoundAtkMul - 1) * 100)}%・敵の攻撃+${Math.round((RULES.stakes.enemyAtkStep - 1) * 100)}%`, flavorJa: '神域への道が開く。無料の託宣は、もう当てにできない。' },
  { level: 2, numeral: 'Ⅱ', nameJa: '鳥居', addedRuleJa: `初期手札−${RULES.stakes.initialHandMinus}`, flavorJa: '鳥居をくぐる。持ち込める札が一枚減る。' },
  { level: 3, numeral: 'Ⅲ', nameJa: '拝殿', addedRuleJa: `敵HP+${Math.round((RULES.stakes.enemyHpStep - 1) * 100)}%`, flavorJa: '拝殿の敵は、ひとまわり頑丈だ。' },
  { level: 4, numeral: 'Ⅳ', nameJa: '本殿', addedRuleJa: `ブロック効率${Math.round(RULES.stakes.blockEfficiency * 100)}%`, flavorJa: '本殿の気配に、盾が軋む。' },
  { level: 5, numeral: 'Ⅴ', nameJa: '奥宮', addedRuleJa: `回復効率${Math.round(RULES.stakes.healEfficiency * 100)}%`, flavorJa: '奥宮では、傷が癒えにくい。' },
  { level: 6, numeral: 'Ⅵ', nameJa: '禁足地', addedRuleJa: `敵の必殺・連撃+${Math.round((RULES.stakes.specialMul - 1) * 100)}%`, flavorJa: '踏み入れてはならぬ地。敵の大技が牙を剥く。' },
  { level: 7, numeral: 'Ⅶ', nameJa: '高天原', addedRuleJa: '最終試練を1つ選ぶ', flavorJa: '最終試練を越えた者だけが、高天原へ至る。' },
]

export type StakeChoiceDef = {
  id: StakeChoiceId
  nameJa: string
  ruleJa: string
}

/** Ⅶ「高天原」の最終試練（どれか1つを選ぶ。神ごとに最適解が異なる） */
export const STAKE_CHOICES: StakeChoiceDef[] = [
  { id: 'race', nameJa: '巨躯の試練', ruleJa: `敵HP+${Math.round((RULES.stakes.enemyHpStep - 1) * 100)}%` },
  { id: 'pressure', nameJa: '猛威の試練', ruleJa: `敵の攻撃+${Math.round((RULES.stakes.enemyAtkStep - 1) * 100)}%` },
  { id: 'tempo', nameJa: '静寂の試練', ruleJa: 'ラウンド1の神力−1' },
]

/** 神階の累積ルール（engineが参照する解決済みの値） */
export type StakeRules = {
  level: StakeLevel
  divinationCount: number
  lateRoundFrom: number | null
  lateRoundAtkMul: number
  enemyAtkMul: number
  enemyHpMul: number
  initialHandMinus: number
  blockEfficiency: number
  healEfficiency: number
  specialMul: number
  round1ApMinus: number
}

export const NO_STAKE_RULES: StakeRules = {
  level: 0,
  divinationCount: RULES.divination.count,
  lateRoundFrom: null,
  lateRoundAtkMul: 1,
  enemyAtkMul: 1,
  enemyHpMul: 1,
  initialHandMinus: 0,
  blockEfficiency: 1,
  healEfficiency: 1,
  specialMul: 1,
  round1ApMinus: 0,
}

export function isStakeLevel(value: unknown): value is StakeLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= STAKE_MAX
}

export function getStakeLevelDef(level: number | undefined): StakeLevelDef | null {
  if (!isStakeLevel(level) || level === 0) return null
  return STAKE_LEVELS.find((s) => s.level === level) ?? null
}

/** 段と（Ⅶのみ）選択から、累積ルールを解決する。level 0＝通常（恒等） */
export function resolveStakeRules(level: number | undefined, choice?: StakeChoiceId | null): StakeRules {
  const lv = isStakeLevel(level) ? level : 0
  if (lv === 0) return NO_STAKE_RULES
  const s = RULES.stakes
  const rules: StakeRules = {
    ...NO_STAKE_RULES,
    level: lv,
    divinationCount: s.divinationCount,
    lateRoundFrom: s.lateRoundFrom,
    lateRoundAtkMul: s.lateRoundAtkMul,
    enemyAtkMul: s.enemyAtkStep,
  }
  if (lv >= 2) rules.initialHandMinus = s.initialHandMinus
  if (lv >= 3) rules.enemyHpMul = s.enemyHpStep
  if (lv >= 4) rules.blockEfficiency = s.blockEfficiency
  if (lv >= 5) rules.healEfficiency = s.healEfficiency
  if (lv >= 6) rules.specialMul = s.specialMul
  if (lv >= 7) {
    // 未選択（不正値）は最も標準的な「猛威」を既定にする（engineが止まらないため）
    const c: StakeChoiceId = choice === 'race' || choice === 'tempo' ? choice : 'pressure'
    if (c === 'race') rules.enemyHpMul *= s.enemyHpStep
    if (c === 'pressure') rules.enemyAtkMul *= s.enemyAtkStep
    if (c === 'tempo') rules.round1ApMinus = 1
  }
  return rules
}

/**
 * 必殺・連撃の倍率（敵別上限つき）。機工師の主砲（24）は倍率を重ねると受け切れない
 * 組み合わせになるため、決定126で上限を設けた（敵バランス監査）。
 */
export function specialMultiplierFor(rules: StakeRules, enemyId: EnemyId): number {
  if (rules.specialMul <= 1) return 1
  const cap = enemyId === ENEMY_IDS.karakuri ? RULES.stakes.specialMulCapKarakuri : Infinity
  return Math.min(rules.specialMul, cap)
}

/** 勝利時スコアの神階係数（×(1 + perLevel × level)）。level 0 は 1 */
export function stakeScoreScale(level: number | undefined): number {
  const lv = isStakeLevel(level) ? level : 0
  return 1 + RULES.stakes.scoreScalePerLevel * lv
}

/** UI用：累積ルールを短い行に要約する（順序は段の順） */
export function describeStakeRules(level: number | undefined, choice?: StakeChoiceId | null): string[] {
  const r = resolveStakeRules(level, choice)
  if (r.level === 0) return []
  const lines: string[] = []
  lines.push(`託宣は${r.divinationCount}回まで`)
  if (r.lateRoundFrom) lines.push(`R${r.lateRoundFrom}以降 敵の攻撃+${Math.round((r.lateRoundAtkMul - 1) * 100)}%`)
  if (r.enemyAtkMul > 1) lines.push(`敵の攻撃+${Math.round((r.enemyAtkMul - 1) * 100)}%`)
  if (r.initialHandMinus > 0) lines.push(`初期手札−${r.initialHandMinus}`)
  if (r.enemyHpMul > 1) lines.push(`敵HP+${Math.round((r.enemyHpMul - 1) * 100)}%`)
  if (r.blockEfficiency < 1) lines.push(`ブロック効率${Math.round(r.blockEfficiency * 100)}%`)
  if (r.healEfficiency < 1) lines.push(`回復効率${Math.round(r.healEfficiency * 100)}%`)
  if (r.specialMul > 1) lines.push(`敵の必殺・連撃+${Math.round((r.specialMul - 1) * 100)}%`)
  if (r.round1ApMinus > 0) lines.push(`ラウンド1の神力−${r.round1ApMinus}`)
  return lines
}

/** UI用：段の表示名（例「神階Ⅲ 拝殿」）。level 0 は空文字 */
export function stakeLabel(level: number | undefined): string {
  const def = getStakeLevelDef(level)
  return def ? `神階${def.numeral} ${def.nameJa}` : ''
}
