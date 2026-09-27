import { cardDefId, type CardDefId } from '../../core/types/ids'

/**
 * Card Premium v2 Pilot「Art Window v2」（表示専用の許可リスト）。
 *
 * - `cardArt.ts`・`READY_MATERIAL_PILOT` と同じ「ID → 見た目」のデータ表。効果・条件の分岐ではない
 *   （不変ルール3の対象外）。原画が登録されていないカードには効かない（CardView で `illustration` と AND）
 * - 対象カードだけ文字帯をカードの下 45% に固定し、上 55% を絵の窓として空ける（見た目は `artWindow.css`）
 * - 条件行はこの表の短文（1 行）で出す。条件・数値は `bonus.textJa` と同じでなければならない
 *   （`artWindow.test.ts` で数値の一致を検査。カードの数値を変えたらここも直す）
 * - Pilot は大耀『豪快な一撃』1 枚だけ（決定224 の READY material と同じカード）
 */
export type ArtWindowSpec = {
  /** 条件行の 1 行版（表示専用・先頭記号は `formatBonusLine` が付ける） */
  bonusShortJa: string
}

export const ART_WINDOW_V2: ReadonlyMap<CardDefId, ArtWindowSpec> = new Map([
  [cardDefId('card_taiyo_attack_01'), { bonusShortJa: '共鳴4以上:敵に40' }],
])

export function getArtWindow(id: CardDefId): ArtWindowSpec | undefined {
  return ART_WINDOW_V2.get(id)
}
