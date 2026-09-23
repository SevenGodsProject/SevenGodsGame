import { cardDefId, type CardDefId } from '../../core/types/ids'

/**
 * 決定224（Premium Visual Pilot）：条件⚡が成立したカードを「物」として見せる READY 表示。
 *
 * - 対象は表示専用の許可リストで持つ（`cardArt.ts` と同じ「ID → 見た目」のデータ表）。
 *   効果・条件の分岐ではない（不変ルール3の対象外）。Pilot は大耀『豪快な一撃』1 枚だけ
 *   （大耀の推奨デッキには charged 条件が 6 枚あり、全部に付けると共鳴 4 到達で同時に光るため）
 * - 点火は engine の条件（`previewBonusTrigger`・ターン判定を掛けない値）の false→true だけ。
 *   カードを出した後・ラウンド明け・カットイン明けには再点火しない
 */
export const READY_MATERIAL_PILOT: ReadonlySet<CardDefId> = new Set([cardDefId('card_taiyo_attack_01')])

/** 点火の開始遅延（commit の描画から。cast-flash の消え際に点く） */
export const READY_IGNITE_BASE_DELAY_MS = 150
/** 同時に点火したカードどうしのずらし */
export const READY_IGNITE_STAGGER_MS = 90
/** ずらす枚数の上限（それ以上は同じ遅延） */
export const READY_IGNITE_MAX_STAGGER = 1

/** 前回の描画で不成立・今回成立＝点火する。初回（prev===undefined）は点火しない */
export function shouldIgnite(prev: boolean | undefined, next: boolean): boolean {
  return prev === false && next
}

/** 手札の中で READY material 対象かつ成立中のカードに、並び順で点火遅延を割り当てる */
export function readyIgniteDelays(hand: readonly { uid: string; armed: boolean; pilot: boolean }[]): Map<string, number> {
  const delays = new Map<string, number>()
  let i = 0
  for (const c of hand) {
    if (!c.pilot || !c.armed) continue
    delays.set(c.uid, READY_IGNITE_BASE_DELAY_MS + Math.min(i, READY_IGNITE_MAX_STAGGER) * READY_IGNITE_STAGGER_MS)
    i += 1
  }
  return delays
}
