import type { CardDefId } from '../types/ids'

/**
 * カードイラストの対応表（決定30のSVGアイコンから実絵への差し替え）。
 * ChatGPTで生成した1枚絵を `public/assets/cards/` に置き、ここに登録する。
 * まだ絵が無いカードはこの表に載せない（CardView側でSVGアイコン表示にフォールバックする）。
 */
const CARD_ART: Partial<Record<CardDefId, string>> = {
  card_common_attack_01: '/assets/cards/card_common_attack_01.png',
  card_common_attack_02: '/assets/cards/card_common_attack_02.png',
  card_common_attack_03: '/assets/cards/card_common_attack_03.png',
  card_common_attack_04: '/assets/cards/card_common_attack_04.png',
  card_common_attack_05: '/assets/cards/card_common_attack_05.png',
  card_common_attack_06: '/assets/cards/card_common_attack_06.png',
  card_common_attack_07: '/assets/cards/card_common_attack_07.png',
  card_common_attack_08: '/assets/cards/card_common_attack_08.png',
  card_common_guard_01: '/assets/cards/card_common_guard_01.png',
  card_common_guard_02: '/assets/cards/card_common_guard_02.png',
  card_common_guard_03: '/assets/cards/card_common_guard_03.png',
  card_common_guard_04: '/assets/cards/card_common_guard_04.png',
  card_common_resonance_01: '/assets/cards/card_common_resonance_01.png',
  card_common_resonance_02: '/assets/cards/card_common_resonance_02.png',
  card_common_resonance_03: '/assets/cards/card_common_resonance_03.png',
  card_common_resonance_04: '/assets/cards/card_common_resonance_04.png',
  card_common_support_01: '/assets/cards/card_common_support_01.png',
  card_common_support_02: '/assets/cards/card_common_support_02.png',
  card_common_support_03: '/assets/cards/card_common_support_03.png',
  card_common_support_04: '/assets/cards/card_common_support_04.png',
  card_common_support_05: '/assets/cards/card_common_support_05.png',
  card_common_hinder_01: '/assets/cards/card_common_hinder_01.png',
  card_common_hinder_02: '/assets/cards/card_common_hinder_02.png',
  card_common_hinder_03: '/assets/cards/card_common_hinder_03.png',
  card_common_hinder_04: '/assets/cards/card_common_hinder_04.png',
  card_common_oracle_01: '/assets/cards/card_common_oracle_01.png',
  card_common_oracle_02: '/assets/cards/card_common_oracle_02.png',
  card_common_oracle_03: '/assets/cards/card_common_oracle_03.png',
  card_ebisu_attack_01: '/assets/cards/card_ebisu_attack_01.png',
  card_ebisu_support_01: '/assets/cards/card_ebisu_support_01.png',
  card_ebisu_attack_02: '/assets/cards/card_ebisu_attack_02.png',
  card_ebisu_support_02: '/assets/cards/card_ebisu_support_02.png',
  card_taiyo_attack_01: '/assets/cards/card_taiyo_attack_01.png',
  card_taiyo_support_01: '/assets/cards/card_taiyo_support_01.png',
  card_taiyo_attack_02: '/assets/cards/card_taiyo_attack_02.png',
  card_taiyo_support_02: '/assets/cards/card_taiyo_support_02.png',
  card_sobi_guard_01: '/assets/cards/card_sobi_guard_01.png',
  card_sobi_guard_02: '/assets/cards/card_sobi_guard_02.png',
  card_sobi_attack_01: '/assets/cards/card_sobi_attack_01.png',
  card_sobi_hinder_01: '/assets/cards/card_sobi_hinder_01.png',
  card_juraku_hinder_01: '/assets/cards/card_juraku_hinder_01.png',
  card_juraku_guard_01: '/assets/cards/card_juraku_guard_01.png',
  card_juraku_attack_01: '/assets/cards/card_juraku_attack_01.png',
  card_juraku_resonance_01: '/assets/cards/card_juraku_resonance_01.png',
  card_saika_resonance_01: '/assets/cards/card_saika_resonance_01.png',
  card_saika_support_01: '/assets/cards/card_saika_support_01.png',
  card_saika_attack_01: '/assets/cards/card_saika_attack_01.png',
  card_saika_support_02: '/assets/cards/card_saika_support_02.png',
  card_fukuei_attack_01: '/assets/cards/card_fukuei_attack_01.png',
  card_fukuei_support_01: '/assets/cards/card_fukuei_support_01.png',
  card_fukuei_resonance_01: '/assets/cards/card_fukuei_resonance_01.png',
  card_fukuei_attack_02: '/assets/cards/card_fukuei_attack_02.png',
  card_shouren_support_01: '/assets/cards/card_shouren_support_01.png',
  card_shouren_guard_01: '/assets/cards/card_shouren_guard_01.png',
  card_shouren_support_02: '/assets/cards/card_shouren_support_02.png',
  card_shouren_attack_01: '/assets/cards/card_shouren_attack_01.png',
} as unknown as Partial<Record<CardDefId, string>>

/** カードIDに対応するイラストのパス。未登録なら null（呼び出し側はSVGアイコンにフォールバック） */
export function getCardArt(id: CardDefId): string | null {
  return CARD_ART[id] ?? null
}
