import type { OtomoId } from '../core/types'
import { getOtomoDef } from '../core/data/otomo'

/**
 * RL-01b（Save Compatibility Guard の続き・NEXT_MILESTONES L4 ①）：保存データ由来の `otomo.defId` を
 * 安全に扱うための共有ヘルパー。決定191 の `enemyLookup.ts` と同型。
 *
 * `getOtomoDef` は未知の ID に対して例外を投げる設計（`src/core/data/otomo.ts`、不変）。
 * `sevengods.battleSave` の `isSavedBattle` は `otomo.defId` の値を検証せずに通すため、保存が壊れる・
 * 改ざんされる・将来 OTOMO の id が変わるなどして現在の定義に無い ID が入っていた場合、「続きから」で
 * `BattleScreen`／`GodOtomoPanel`／`GameOverOverlay` の `getOtomoDef` が例外を投げ、ルートの
 * `ErrorBoundary` まで届いて白画面になる（保存が残る限り再読み込みしても再現する）。
 *
 * ここでは `src/core` を変更せず、UI 層で `try/catch` に包むだけで対応する。保存データそのものは
 * 書き換えない・削除しない（Home で Resume を出さないだけ。「神を選ぶ」で新しく始められる）。
 */

/** 未知の OTOMO ID を表示するときの既定文言 */
export const UNKNOWN_OTOMO_LABEL = '不明な OTOMO'

/** 保存データ由来の otomoId を安全に名前へ変換する。存在しない ID なら fallback 文言（例外を投げない） */
export function safeOtomoName(id: OtomoId): string {
  try {
    return getOtomoDef(id).nameJa
  } catch {
    return UNKNOWN_OTOMO_LABEL
  }
}

/** 保存データ由来の otomoId が現在の OTOMO 定義に存在するか（Resume を出す前の判定に使う） */
export function isKnownOtomoId(id: OtomoId): boolean {
  try {
    getOtomoDef(id)
    return true
  } catch {
    return false
  }
}
