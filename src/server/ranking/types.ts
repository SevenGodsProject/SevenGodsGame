import type { GodId, ReplayInput, VerifiedOutcome } from './deps'

/**
 * Phase 4.3：Daily ランキングBackendの型。
 *
 * ★このディレクトリ（`src/server`）はブラウザでは動かさない。
 * React・DOM・localStorage・Phaser に依存せず、特定のホスティング
 * （Vercel Functions / Node / Deno）にも依存しない**素のTypeScript**として書く。
 * HTTPの受け口はホスティングごとの薄いラッパーが担い、中身はここに閉じる
 * （`rankingBoundary.test.ts` が依存を機械検査している）。
 *
 * ★信頼の境界
 * クライアントから来るのは `playerId` / `clientRunId` / `ReplayInput` の3つだけ。
 * スコア・勝敗・HP・rngCursor は **一切受け取らない**（`ReplayInput` の型に無い）。
 * サーバーは `dailyKey` から seed・敵を再導出し、本番エンジンで再生して
 * `VerifiedOutcome` を自分で計算する。保存・順位付けはその計算値だけを使う。
 */

/** 提出リクエスト。クライアントが送ってよいのはこれだけ */
export type SubmitRequest = {
  /** 公開ID＝SHA-256(playerSecret) の先頭32桁。氏名・メール等は扱わない */
  playerId: string
  /**
   * Phase 4.6：端末が持つ秘密。**サーバーは保存しない**（照合に使って捨てる）。
   * これが無いと、リーダーボードで公開されている `playerId` を名乗るだけで
   * 他人の枠とレート制限を食い潰せてしまう（決定139 T1）。
   */
  playerSecret: string
  /** run識別子。再送しても同じ値なので、サーバーは冪等に扱える */
  clientRunId: string
  /** Phase 4.1の契約どおり、開始条件と操作ログだけ */
  input: ReplayInput
}

/** 保存する1件。**すべてサーバーが計算した値**で、クライアントの申告値は入らない */
export type RankingRun = {
  dailyKey: string
  playerId: string
  clientRunId: string
  /** その日の何回目か。**ticketが決めた番号**をそのまま写す（提出順では決まらない） */
  attemptNo: number
  /** 検証したときのコードの版。後からの再検証と、同一ボード内の条件一致に使う */
  gameVersion: string
  godId: GodId
  /** 検証済みスコア */
  score: number
  win: boolean
  round: number
  /** 決定論の同一性チェック用。再検証したとき同じ値になる */
  rngCursor: number
  actionCount: number
  /** 受理した時刻。**順位には使わない**（同順位内の表示順にのみ使う） */
  submittedAt: number
}

export type SubmitRejectionCode =
  /** playerId / clientRunId の形式が不正、または他人のrunを名乗った */
  | 'BAD_IDENTITY'
  /** 既に受理済みの clientRunId で、**中身の違う**内容が提出された（使い回し） */
  | 'RUN_ID_CONFLICT'
  /** 提出試行が1日の上限を超えた */
  | 'RATE_LIMITED'
  /** その日の挑戦回数（`RULES.daily.attemptsPerDay`）を使い切っている */
  | 'ATTEMPTS_EXCEEDED'
  /**
   * この run の ticket が無い。挑戦を開始していない、別の日を名乗った、
   * 端末時計を偽装した——のいずれでもここに落ちる（`STALE_DAILY_KEY` の後継）
   */
  | 'NO_TICKET'
  /** ticket が既に閉じている（別の挑戦を開始した／deployで無効化された） */
  | 'TICKET_CLOSED'
  /** ticket の期限が切れている */
  | 'TICKET_EXPIRED'
  /** 発行時と現在でコードの版が違う（＝比較不能）。**枠は返還する** */
  | 'RULES_VERSION_MISMATCH'
  /** リプレイ検証に落ちた（内訳は `replayCode` に入る） */
  | 'REPLAY_REJECTED'

export type SubmitResult =
  | {
      ok: true
      /** 'stored'＝新規受理／'duplicate'＝同じclientRunIdを再送（保存は増えない） */
      accepted: 'stored' | 'duplicate'
      /** サーバーが計算した結果。クライアントの申告ではない */
      outcome: VerifiedOutcome
      run: RankingRun
      /** その日のそのプレイヤーの最良スコア（この提出を含む） */
      bestScore: number
      /** その日に使った挑戦回数（この提出を含む） */
      runsUsed: number
    }
  | {
      ok: false
      code: SubmitRejectionCode
      message: string
      /** `REPLAY_REJECTED` のときの内訳（Phase 4.1の拒否コード） */
      replayCode?: string
    }

/** リーダーボードの1行。順位付けの規則は `assignRanks`（決定133）に従う */
export type LeaderboardRow = {
  playerId: string
  godId: GodId
  score: number
  win: boolean
  round: number
  /** 同点は同じ値になり、次は人数ぶん飛ぶ（1, 1, 3 方式） */
  rank: number
  /** この順位を分け合っている人数 */
  tiedCount: number
  /** 上位何%か */
  topPercent: number
  /** 次に高い異なるスコアまでの差。最上位はnull */
  pointsToNextRank: number | null
}

export type Leaderboard = {
  dailyKey: string
  /** その日の参加者数（プレイヤー単位。1人が3回挑戦しても1） */
  totalPlayers: number
  rows: LeaderboardRow[]
  /** `playerId` を指定した場合、その人の行（`rows`の範囲外でも必ず返る） */
  self: LeaderboardRow | null
}
