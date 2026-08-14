import type { CardType, Rarity } from '../../core/types'

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
