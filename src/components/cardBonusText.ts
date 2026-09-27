import type { CardDef } from '../core/types'

/**
 * Phase 3 FINAL SPEC v0.1：カードの条件付き追加効果（`CardDef.bonus`）の表示文を1か所で作る。
 *
 * 戦闘中の手札（`CardView`）・デッキ構築（`DeckBuilderScreen`）・勝利後の報酬3択
 * （`RewardOverlay`）の3画面が同じ文言・同じ記号を使うためのヘルパー。
 * 「カードを選ぶ時点で追加効果が分かる」ことが目的なので、盤面を持たない画面
 * （デッキ構築・報酬）では常に`ready=false`（＝条件の説明だけ）を出す。
 *
 * 文言そのものはカードデータ（`bonus.textJa`）が唯一の出どころで、ここでは
 * 先頭記号だけを足す。
 */

/** 今この瞬間、条件を満たしている（戦闘中の手札だけで使う） */
const READY_PREFIX = '⚡ '
/** 条件の説明のみ（未成立、またはデッキ構築・報酬のように盤面が無い画面） */
const IDLE_PREFIX = '＋ '

export function formatCardBonus(def: CardDef, ready = false): string | null {
  if (!def.bonus) return null
  return formatBonusLine(def.bonus.textJa, ready)
}

/**
 * 条件行の文言に先頭記号を付ける。`formatCardBonus` と、Card Premium v2 Pilot「Art Window v2」の
 * 1 行版（`battle/artWindow.ts` の `bonusShortJa`）で共通に使う
 */
export function formatBonusLine(textJa: string, ready = false): string {
  return `${ready ? READY_PREFIX : IDLE_PREFIX}${textJa}`
}
