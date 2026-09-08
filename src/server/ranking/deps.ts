/**
 * Phase 4.3：サーバー側が core から借りるものの一覧。
 *
 * `src/server` が core のどこに触れているかを1ファイルに集約しておくと、
 * ①依存の広がりが一目で分かる ②将来サーバーを別リポジトリ／別パッケージへ
 * 切り出すときに、ここを見れば持っていくべき範囲が確定する。
 *
 * ★borrowするのは「検証」と「規則」だけ。UI・localStorage・React には触れない。
 */

export { runReplay, assignRanks, getGameVersion } from '../../core/replay'
export type { ReplayInput, VerifiedOutcome, RankableEntry, RankedEntry } from '../../core/replay'
export { dailyKeyOf, isValidDailyKey } from '../../core/data/dailyBoss'
export { RULES } from '../../core/data/rules'
export {
  derivePlayerId,
  verifyIdentity,
  isPlayerId,
  isPlayerSecret,
} from '../../core/identity'
export type { GodId } from '../../core/types'
