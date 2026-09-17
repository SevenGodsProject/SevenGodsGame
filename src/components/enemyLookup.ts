import type { EnemyId } from '../core/types'
import { getEnemyDef } from '../core/data/enemies'

/**
 * Post-P2 Hardening（決定191）：保存データ由来の `enemyId` を安全に扱うための共有ヘルパー。
 *
 * `getEnemyDef` は未知の ID に対して例外を投げる設計（`src/core/data/enemies.ts`、不変。バトル中は
 * エンジン自身が確定させた ID しか渡らないため、この「投げる」動作自体は正しい）。しかし
 * `sevengods.battleSave`／`sevengods.daily` は保存前提のデータ形状しか検証していない
 * （`isSavedBattle`／`isDailyData` は `enemy.defId`／`day.enemyId` の値を未検証のまま通す）ため、
 * 保存が壊れる・改ざんされるなどして現在の敵定義に存在しない ID が入っていた場合、そのまま
 * `getEnemyDef` へ渡すと例外が `ErrorBoundary`（`src/main.tsx`、アプリ全体を覆う）まで届き、
 * 白画面（再読み込みしても同じ保存が残る限り再現する）になる。
 *
 * ここでは `src/core` を一切変更せず（`getEnemyDef` の「投げる」契約は不変）、UI 層で
 * `try/catch` に包むだけで対応する（`matchupCelebration.ts` の `enemyNameOf` と同じ既存パターンを踏襲）。
 * 保存データそのものは書き換えない・削除しない（表示側の防御のみ）。
 */

/** 未知の敵 ID を表示するときの既定文言 */
export const UNKNOWN_ENEMY_LABEL = '不明な敵'

/** 保存データ由来の enemyId を安全に神名へ変換する。存在しない ID なら fallback 文言を返す（例外を投げない） */
export function safeEnemyName(id: EnemyId): string {
  try {
    return getEnemyDef(id).name
  } catch {
    return UNKNOWN_ENEMY_LABEL
  }
}

/**
 * 保存データ由来の enemyId が現在の敵定義に存在するか。
 * Home の「続きから」のように、この後の画面（Battle）が未知 ID を安全に処理できない導線を
 * 事前に塞ぐための判定に使う（CTA を出さないだけで、保存データそのものには触れない）。
 */
export function isKnownEnemyId(id: EnemyId): boolean {
  try {
    getEnemyDef(id)
    return true
  } catch {
    return false
  }
}
