import { RULES } from '../../core/data/rules'

/**
 * 決定128（Game Feel Phase）：演出強度の4段階。
 *
 * LEVEL 1：軽いカード・小ダメージ　LEVEL 2：通常攻撃・Block・Heal
 * LEVEL 3：大ダメージ・Enemy Special　LEVEL 4：BURST・Boss Entrance・Victory
 *
 * 大きな瞬間だけ明確に強くする（常にL4を使うインフレは禁止）。閾値は内部ダメージ値
 * （表示は×10）。`RULES.baselineDamagePerAp`（5）を基準にし、1コスト相当＝L1、
 * 2コスト相当＝L2、3コスト相当以上＝L3。BURST・必殺は量に関わらず L4／L3 以上。
 * 表示専用：engine・スコア・判定には一切関与しない。
 */
export type FeelTier = 1 | 2 | 3 | 4

const BASE = RULES.baselineDamagePerAp

/** 与ダメージ量（内部値）からの段階。BURST の一撃は常に L4 */
export function damageFeelTier(amount: number, opts: { burst?: boolean; special?: boolean } = {}): FeelTier {
  if (opts.burst) return 4
  if (opts.special) return Math.max(3, rawTier(amount)) as FeelTier
  return rawTier(amount)
}

function rawTier(amount: number): FeelTier {
  if (amount >= BASE * 5) return 4 // 25+：神技級の一撃（渾身＋強化、神託25 など）
  if (amount >= BASE * 3) return 3 // 15+：大ダメージ
  if (amount >= BASE * 2) return 2 // 10+：通常攻撃
  return 1
}

/** SE の音量階層（master に対する係数）。役割：Impact／Feedback／State Change／Reward／Warning */
export const SE_GAIN = {
  master: 0.85,
  impact: { 1: 0.45, 2: 0.6, 3: 0.8, 4: 1.0 } as Record<FeelTier, number>,
  feedback: 0.3,
  stateChange: 0.65,
  reward: 0.7,
  warning: 0.5,
  bigMoment: 0.9,
  /**
   * Tap Feedback v1（Sound lane）：押した瞬間の音（既存 `card_play`）。master を掛けて 0.34。
   * feedback（0.255）より +2.5dB、最弱の打撃 L1（0.383）より −1.0dB＝「押下＜最弱の打撃」を保つ。
   */
  tap: 0.4,
} as const

/** Tap Feedback v1：「ラウンドを終える」の押下音は同じ `card_play` を 0.85 倍速（約 −2.8 半音・低め）で鳴らす */
export const TAP_END_ROUND_RATE = 0.85

/**
 * Tap Feedback v1：同じ音源（name@rate）が予約時刻で 30ms 未満に重なる 2 回目以降は鳴らさない。
 * 同一波形の同時加算（×2＝+6dB、×5＝+14dB）を防ぐ。打撃の最短間隔（110ms）には掛からない。
 */
export const SE_DEDUP_WINDOW_MS = 30

/** CSS クラス名（EnemyPanel／FloatingNumbers が使う） */
export function feelTierClass(prefix: string, tier: FeelTier): string {
  return `${prefix}-l${tier}`
}
