import type { CardDef, CardType, Rarity } from '../../core/types'

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
