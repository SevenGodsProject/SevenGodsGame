/**
 * Phase 4.1 Replay Foundation。
 *
 * 「Daily開始条件（日付キーだけ）＋ 行動ログ」から本番エンジンで対局を再現し、
 * スコア・勝敗・HP・rngCursorを**サーバー側で計算する**ための入口。
 * ランキングBackend（Phase 4.2以降）はこのモジュールだけを import すればよい。
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
