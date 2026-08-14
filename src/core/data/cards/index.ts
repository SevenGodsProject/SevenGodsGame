import type { CardDefId } from '../../types/ids'
import type { CardDef } from '../../types/card'
import { COMMON_CARDS } from './common'
import { EBISU_CARDS } from './ebisu'
import { TAIYO_CARDS } from './taiyo'
import { SOBI_CARDS } from './sobi'
import { SAIKA_CARDS } from './saika'
import { JURAKU_CARDS } from './juraku'
import { FUKUEI_CARDS } from './fukuei'
import { SHOUREN_CARDS } from './shouren'

export { CARD_IDS, COMMON_CARDS } from './common'
export { EBISU_CARD_IDS, EBISU_CARDS } from './ebisu'
export { TAIYO_CARD_IDS, TAIYO_CARDS } from './taiyo'
export { SOBI_CARD_IDS, SOBI_CARDS } from './sobi'
export { SAIKA_CARD_IDS, SAIKA_CARDS } from './saika'
export { JURAKU_CARD_IDS, JURAKU_CARDS } from './juraku'
export { FUKUEI_CARD_IDS, FUKUEI_CARDS } from './fukuei'
export { SHOUREN_CARD_IDS, SHOUREN_CARDS } from './shouren'

/** 存在するすべてのカード（決定25で七神全員の専用カードが揃った） */
export const ALL_CARDS: CardDef[] = [
  ...COMMON_CARDS,
  ...EBISU_CARDS,
  ...TAIYO_CARDS,
  ...SOBI_CARDS,
  ...SAIKA_CARDS,
  ...JURAKU_CARDS,
  ...FUKUEI_CARDS,
  ...SHOUREN_CARDS,
]

/** IDから設計図を高速に引くための対応表 */
const CARD_BY_ID = new Map<CardDefId, CardDef>(
  ALL_CARDS.map((card) => [card.id, card]),
)

/**
 * IDからカードの設計図を取得します。
 * 存在しないIDを指定した場合は、静かに壊れるのではなくその場でエラーにします。
 */
export function getCardDef(id: CardDefId): CardDef {
  const def = CARD_BY_ID.get(id)
  if (!def) {
    throw new Error(`カード定義が見つかりません: ${id}`)
  }
  return def
}
