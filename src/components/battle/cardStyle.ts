import type { CardDef, CardType, EnemyActionDef, Rarity } from '../../core/types'
import { formatScaled } from '../displayScale'

/**
 * カードの見た目（決定28で色付き四角からグラデーション調に刷新）。
 * 専用イラストはまだ無いため、タイプごとの色とグラデーションで質感を出す。
 * `dark`は背景グラデーションの暗端、`glow`はホバー時などの発光色に使う。
 */
export const TYPE_STYLE: Record<
  CardType,
  { color: string; dark: string; glow: string; icon: string; label: string }
> = {
  attack: { color: '#e5484d', dark: '#3a0f12', glow: '#ff8a8a', icon: '⚔', label: '攻撃' },
  guard: { color: '#4d88e5', dark: '#0f1f3a', glow: '#8ab4ff', icon: '🛡', label: '防御' },
  resonance: { color: '#ffd166', dark: '#3a2a0a', glow: '#ffe6a3', icon: '✨', label: '共鳴' },
  support: { color: '#4dbd74', dark: '#0f3a20', glow: '#8ae8ac', icon: '🌿', label: '支援' },
  hinder: { color: '#9b59b6', dark: '#26103a', glow: '#d1a3ff', icon: '💀', label: '妨害' },
  oracle: { color: '#ff6ec7', dark: '#3a0f2c', glow: '#ffa3e0', icon: '🌟', label: '神託' },
}

/**
 * カード使用時のスキルエフェクト画像（決定40。CEOがChatGPTで生成、黒背景で
 * `mix-blend-mode: screen`合成する前提のため白背景の透過処理が不要）。
 */
export const CAST_FX: Record<CardType, string> = {
  attack: '/assets/fx/cast-attack.png',
  guard: '/assets/fx/cast-guard.png',
  resonance: '/assets/fx/cast-resonance.png',
  support: '/assets/fx/cast-support.png',
  hinder: '/assets/fx/cast-hinder.png',
  oracle: '/assets/fx/cast-oracle.png',
}

/**
 * レアリティごとの縁取りグロー（CEO要望「人気カードゲーム相当のUI」対応）。
 * タイプの色（背景グラデーション・アイコン）はそのままに、外側の光る輪だけで
 * レアリティを重ねて表現する。`legend`は現状どのカードにも未使用（決定30時点）だが、
 * 将来カードを追加したときにそのまま使えるよう定義だけ用意しておく。
 */
export const RARITY_STYLE: Record<Rarity, { ring: string; label: string }> = {
  common: { ring: '#8a93b8', label: 'コモン' },
  rare: { ring: '#4d9fff', label: 'レア' },
  legend: { ring: '#ffcf40', label: 'レジェンド' },
}

export type PowerTier = 'normal' | 'strong' | 'huge'

/**
 * 第二次完成フェーズ候補C（強カード演出power tier）：カードが「敵へ与える
 * damage量」だけから通常/強/特大の3段階を判定する。`def.type`・`def.godId`・
 * `def.id`は一切参照しない（FINAL_BACKLOG §3-D「神専用カードの使用時演出
 * 差別化」に踏み込まないための設計上の制約）。type非依存のため、attack以外
 * （例：神託＝type:'oracle', damage 25）でも正しく最上位tierになる。
 *
 * 閾値は`cardIcon.tsx`の`getPrimaryGlyph`（attackケース）が既に持つ境界
 * （amount>=15→burst、amount>=10→swordHeavy）をそのまま再利用した。実データ
 * （全60種+神託、敵へのdamage効果を持つ21種）で分布を確認したところ、
 * 10未満13枚（3〜8、大半がコスト1の基本カード）・10〜14が4枚・15以上が4枚
 * （15/18/20/25）と自然な3つの塊になっており、感覚ではなくこの分布に基づく
 * 閾値である。
 */
export function getEnemyDamagePowerTier(def: CardDef): PowerTier {
  const dmg = def.effects.find((e) => e.kind === 'damage' && e.target === 'enemy')
  const amount = dmg && dmg.kind === 'damage' ? dmg.amount : 0
  if (amount >= 15) return 'huge'
  if (amount >= 10) return 'strong'
  return 'normal'
}

/**
 * STEP3-A（8/31 敵7体ゲーム性監査 処理05）：敵の予告（`enemy.intent`）のダメージ量から
 * 表示tierを決める。閾値は`getEnemyDamagePowerTier`と全く同じ10/15をそのまま流用した
 * （プレイヤーが「自分のカードの威力」と「敵の次の一撃の威力」を同じ物差しで比較できる
 * ようにするため）。敵AI・行動テーブル（enemies.ts）・攻撃値には一切関与しない、
 * 表示専用の純粋関数。
 */
export function getIntentPowerTier(amount: number): PowerTier {
  if (amount >= 15) return 'huge'
  if (amount >= 10) return 'strong'
  return 'normal'
}

/**
 * STEP3-A（処理05）：予告表示の共通フォーマット。`EnemyPanel`・`BattleHud`の
 * 両方から呼ぶ（意匠を揃えるため）。既存の`EnemyActionDef`（attack/chargeの
 * 2種類のみ）の範囲内で完結しており、新しい行動種別・敵AI・攻撃値には
 * 一切関与しない表示専用ロジック。
 */
/** 連撃hitsの表示（×10）。均一なら「40×3」、不均一なら「50+40」 */
function formatMultiHits(hits: number[]): string {
  const uniform = hits.every((h) => h === hits[0])
  if (uniform) return `${formatScaled(hits[0])}×${hits.length}`
  return hits.map((h) => formatScaled(h)).join('+')
}

export function formatEnemyIntent(intent: EnemyActionDef | null): string {
  if (!intent) return '行動予告なし'
  if (intent.kind === 'charge') return `⚡ ${intent.label}`
  // ENEMY-IDENTITY-PROTOTYPE-02：必殺技は技名を、連撃はhit内訳を表示する。
  // 数値は内部値のまま合算せず「40×3」形式にして、合計120の単発と誤認させない。
  if (intent.kind === 'special') return `🔥 ${intent.name} ${formatScaled(intent.amount)}`
  if (intent.kind === 'multiAttack') {
    const hitsText = formatMultiHits(intent.hits)
    return intent.special ? `🔥 ${intent.name ?? '連撃'} ${hitsText}` : `⚔ 連撃 ${hitsText}`
  }
  // D2b：tier判定は内部値のまま、表示数値のみ×10（displayScale.ts）
  const tier = getIntentPowerTier(intent.amount)
  if (tier === 'huge') return `🔥 特大 ${formatScaled(intent.amount)}`
  if (tier === 'strong') return `💥 強打 ${formatScaled(intent.amount)}`
  return `⚔ ${formatScaled(intent.amount)}`
}

/**
 * STEP-UX4：敵Intentの危険度をCSSクラス名として返す表示専用の純粋関数。
 * `formatEnemyIntent`（文言）は一切変更せず、既存の`getIntentPowerTier`と
 * `intent.kind`の判定だけを再利用する（新しい危険度指標・GameStateは
 * 追加しない）。normal（通常攻撃）は空文字＝現状の見た目のまま。
 * strong（💥強打）はテキスト色のみ、huge（🔥特大）とcharge（⚡溜め）は
 * 枠線＋グローを付与し、CEO方針により`最上位のみpulse`とするためchargeにだけ
 * `intent-tier-charge`の呼吸グロー（battle.css側）を持たせる。
 */
export function getIntentTierClass(intent: EnemyActionDef | null): string {
  if (!intent) return ''
  if (intent.kind === 'charge') return 'intent-tier-charge'
  // ENEMY-IDENTITY-PROTOTYPE-02：必殺技（special／special連撃）は常に最上位表示。
  // 通常連撃は合計値で既存tierを判定する（40×3＝合計12なら💥強打相当）。
  if (intent.kind === 'special') return 'intent-tier-huge'
  const amount =
    intent.kind === 'multiAttack' ? intent.hits.reduce((sum, h) => sum + h, 0) : intent.amount
  if (intent.kind === 'multiAttack' && intent.special) return 'intent-tier-huge'
  const tier = getIntentPowerTier(amount)
  if (tier === 'huge') return 'intent-tier-huge'
  if (tier === 'strong') return 'intent-tier-strong'
  return ''
}
