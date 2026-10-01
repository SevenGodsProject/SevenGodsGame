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

/**
 * 決定257 Sound Layer v1：決め所（神の一撃・敵の必殺）の音の係数。音だけの値で、時刻は既存の
 * 時刻表（enemyVfxTiming.ts）から引き算で導く（既存の時刻定数は変更しない）。
 * 詳細 docs/DECISION257_SOUND_LAYER_V1_PILOT.md §2。
 */
export const SOUND_LAYER = {
  /** rise SE の音量係数（master を掛ける前）。ともに ≤0.8・着弾（impact[4]=1.0）未満 */
  riseGain: { burst: 0.7, enemy: 0.75 },
  /** 神の一撃の rise（burst_rise 900ms）は着弾の 1,150ms 前＝T+450 に始め、突き（1,300）の直後に消える */
  burstRiseLeadMs: 1150,
  /** 敵必殺の rise（enemy_rise 1,000ms）は最初の着弾の 1,060ms 前に始め、着弾の 60ms 前に消える */
  enemyRiseLeadMs: 1060,
  /** BGM duck：最後の着弾からこの時間だけ下げたままにしてから戻す */
  duckTailMs: 300,
  duckRampInMs: 60,
  duckRampOutMs: 300,
  /** 戦闘画面を離れる（Retry／Home）ときの強制復帰 */
  duckReleaseMs: 120,
  /** BGM の GainNode 倍率。element の volume 0.35 × 0.343 ＝ 実効 0.12（≈1/3） */
  duckLevel: 0.12 / 0.35,
  /** ジングル後に BGM を再開するときのフェードイン（GainNode 経路があるときのみ） */
  jingleResumeFadeMs: 400,
} as const

export type SoundLayerInput = {
  /** このバッチで神の一撃（RESONANCE_BURST）が起きた */
  burst: boolean
  /** 神の一撃の着弾（commit 基準） */
  burstImpactMs: number
  /** 敵の必殺（special、または技名付きの連撃）＝カットインが出る */
  enemyUltimate: boolean
  /** 敵必殺の最初／最後の着弾（commit 基準） */
  enemyFirstImpactMs: number
  enemyLastImpactMs: number
}

export type SoundLayerPlan = {
  rise: { name: 'burst_rise' | 'enemy_rise'; delayMs: number } | null
  /** BGM を下げておく時間（commit から復帰開始まで）。null＝duck しない */
  duckHoldMs: number | null
}

/**
 * 決定257：1 バッチの「rise SE と BGM duck」の計画（純関数）。神の一撃を優先する
 * （同じバッチで両方は起きない：一撃はカード、必殺はラウンド終了のバッチ）。
 */
export function planSoundLayer(input: SoundLayerInput): SoundLayerPlan {
  if (input.burst) {
    return {
      rise: { name: 'burst_rise', delayMs: Math.max(0, input.burstImpactMs - SOUND_LAYER.burstRiseLeadMs) },
      duckHoldMs: input.burstImpactMs + SOUND_LAYER.duckTailMs,
    }
  }
  if (input.enemyUltimate) {
    return {
      rise: { name: 'enemy_rise', delayMs: Math.max(0, input.enemyFirstImpactMs - SOUND_LAYER.enemyRiseLeadMs) },
      duckHoldMs: Math.max(input.enemyFirstImpactMs, input.enemyLastImpactMs) + SOUND_LAYER.duckTailMs,
    }
  }
  return { rise: null, duckHoldMs: null }
}
