import type { CardDefId } from '../types/ids'

/**
 * カードイラストの対応表（決定30のSVGアイコンから実絵への差し替え）。
 * ChatGPTで生成した1枚絵を `public/assets/cards/` に置き、ここに登録する。
 * まだ絵が無いカードはこの表に載せない（CardView側でSVGアイコン表示にフォールバックする）。
 *
 * FINAL_BACKLOG_8-31.md Phase 2「カード画像軽量化・OOM対策」：元の1024×1536 PNG
 * （56枚・計約200MB）はブラウザCanvas API（`toBlob('image/webp', 0.85)`）で
 * 512×768・WebP品質0.85に一括変換し、ここの参照のみ`.webp`に切り替えた
 * （56枚合計 約6.15MB、削減率96.9%）。元PNGは`public/assets/cards/`に
 * そのまま残しており削除していない（将来の再変換・高解像度が必要になった場合の
 * ソースとして保持）。512×768を選んだ理由：手札(132px)・デッキ構築(150〜190px)・
 * 報酬画面(140px)いずれの実表示幅もDPR3倍まで512pxで鮮明にカバーできる一方、
 * デコード後メモリ（フォーマット非依存、幅×高さ×4byte）は元の1024×1536の
 * 約1/4（6.0MB→1.5MB/枚）に削減され、デッキ構築画面で最大32枚同時デコード時の
 * OOMリスクを直接的に緩和する。
 */
const CARD_ART: Partial<Record<CardDefId, string>> = {
  card_common_attack_01: '/assets/cards/card_common_attack_01.webp',
  card_common_attack_02: '/assets/cards/card_common_attack_02.webp',
  card_common_attack_03: '/assets/cards/card_common_attack_03.webp',
  card_common_attack_04: '/assets/cards/card_common_attack_04.webp',
  card_common_attack_05: '/assets/cards/card_common_attack_05.webp',
  card_common_attack_06: '/assets/cards/card_common_attack_06.webp',
  card_common_attack_07: '/assets/cards/card_common_attack_07.webp',
  card_common_attack_08: '/assets/cards/card_common_attack_08.webp',
  card_common_guard_01: '/assets/cards/card_common_guard_01.webp',
  card_common_guard_02: '/assets/cards/card_common_guard_02.webp',
  card_common_guard_03: '/assets/cards/card_common_guard_03.webp',
  card_common_guard_04: '/assets/cards/card_common_guard_04.webp',
  card_common_resonance_01: '/assets/cards/card_common_resonance_01.webp',
  card_common_resonance_02: '/assets/cards/card_common_resonance_02.webp',
  card_common_resonance_03: '/assets/cards/card_common_resonance_03.webp',
  card_common_resonance_04: '/assets/cards/card_common_resonance_04.webp',
  card_common_support_01: '/assets/cards/card_common_support_01.webp',
  card_common_support_02: '/assets/cards/card_common_support_02.webp',
  card_common_support_03: '/assets/cards/card_common_support_03.webp',
  card_common_support_04: '/assets/cards/card_common_support_04.webp',
  card_common_support_05: '/assets/cards/card_common_support_05.webp',
  card_common_hinder_01: '/assets/cards/card_common_hinder_01.webp',
  card_common_hinder_02: '/assets/cards/card_common_hinder_02.webp',
  card_common_hinder_03: '/assets/cards/card_common_hinder_03.webp',
  card_common_hinder_04: '/assets/cards/card_common_hinder_04.webp',
  card_common_oracle_01: '/assets/cards/card_common_oracle_01.webp',
  card_common_oracle_02: '/assets/cards/card_common_oracle_02.webp',
  card_common_oracle_03: '/assets/cards/card_common_oracle_03.webp',
  card_ebisu_attack_01: '/assets/cards/card_ebisu_attack_01.webp',
  card_ebisu_support_01: '/assets/cards/card_ebisu_support_01.webp',
  card_ebisu_attack_02: '/assets/cards/card_ebisu_attack_02.webp',
  card_ebisu_support_02: '/assets/cards/card_ebisu_support_02.webp',
  card_taiyo_attack_01: '/assets/cards/card_taiyo_attack_01.webp',
  card_taiyo_support_01: '/assets/cards/card_taiyo_support_01.webp',
  card_taiyo_attack_02: '/assets/cards/card_taiyo_attack_02.webp',
  card_taiyo_support_02: '/assets/cards/card_taiyo_support_02.webp',
  card_sobi_guard_01: '/assets/cards/card_sobi_guard_01.webp',
  card_sobi_guard_02: '/assets/cards/card_sobi_guard_02.webp',
  card_sobi_attack_01: '/assets/cards/card_sobi_attack_01.webp',
  card_sobi_hinder_01: '/assets/cards/card_sobi_hinder_01.webp',
  card_juraku_hinder_01: '/assets/cards/card_juraku_hinder_01.webp',
  card_juraku_guard_01: '/assets/cards/card_juraku_guard_01.webp',
  card_juraku_attack_01: '/assets/cards/card_juraku_attack_01.webp',
  card_juraku_resonance_01: '/assets/cards/card_juraku_resonance_01.webp',
  card_saika_resonance_01: '/assets/cards/card_saika_resonance_01.webp',
  card_saika_support_01: '/assets/cards/card_saika_support_01.webp',
  card_saika_attack_01: '/assets/cards/card_saika_attack_01.webp',
  card_saika_support_02: '/assets/cards/card_saika_support_02.webp',
  card_fukuei_attack_01: '/assets/cards/card_fukuei_attack_01.webp',
  card_fukuei_support_01: '/assets/cards/card_fukuei_support_01.webp',
  card_fukuei_resonance_01: '/assets/cards/card_fukuei_resonance_01.webp',
  card_fukuei_attack_02: '/assets/cards/card_fukuei_attack_02.webp',
  card_shouren_support_01: '/assets/cards/card_shouren_support_01.webp',
  card_shouren_guard_01: '/assets/cards/card_shouren_guard_01.webp',
  card_shouren_support_02: '/assets/cards/card_shouren_support_02.webp',
  card_shouren_attack_01: '/assets/cards/card_shouren_attack_01.webp',
} as unknown as Partial<Record<CardDefId, string>>

/** カードIDに対応するイラストのパス。未登録なら null（呼び出し側はSVGアイコンにフォールバック） */
export function getCardArt(id: CardDefId): string | null {
  return CARD_ART[id] ?? null
}
