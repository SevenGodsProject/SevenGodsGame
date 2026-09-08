/**
 * Phase 4.1 Replay Foundation ／ Phase 4.2 Action Log。
 *
 * 「Daily開始条件（日付キーだけ）＋ 行動ログ」から本番エンジンで対局を再現し、
 * スコア・勝敗・HP・rngCursorを**サーバー側で計算する**ための入口。
 * ランキングBackend（Phase 4.3以降）はこのモジュールだけを import すればよい。
 */
export { runReplay } from './replay'
export { REPLAY_ACTION_TYPES } from './types'
export type {
  ReplayAction,
  ReplayInput,
  ReplayOptions,
  ReplayRejectionCode,
  ReplayResult,
  VerifiedOutcome,
} from './types'

/** Phase 4.2：実プレイの記録（clientが行動ログを組み立てるための最小API） */
export {
  applyAndRecord,
  appendAction,
  createRunLog,
  isLoggableAction,
  toReplayInput,
} from './runLog'
export type { DailyRunLog, RecordResult } from './runLog'

/** Phase 4.2：中断・再開を跨いだ記録の引き継ぎ */
export { resumeRunLog, deepEqual } from './resume'
export type { ResumeRunLogResult } from './resume'

/** Phase 4.2：順位付けの規則（同点＝同順位。Phase 4.3/4.4が使う） */
export {
  getGameVersion,
  dataFingerprint,
  rankingImpactSnapshot,
  stableStringify,
  resetGameVersionCache,
} from './gameVersion'

export { assignRanks } from './ranking'
export type { RankableEntry, RankedEntry } from './ranking'
