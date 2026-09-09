import { RULES } from '../core/data/rules'
import { getAnonymousPlayerId } from './anonymousPlayerId'

/**
 * Phase 4.9：Daily ランキングの**読み取り**専用クライアント。
 *
 * ★`rankingClient.ts` と分けてある理由
 * あちらは「提出」（start / submit）で、`RULES.ranking.submissionEnabled` が false の間は
 * **一切通信しない**という約束を持つ。こちらは**読むだけ**なので、その約束の対象外。
 * 分けておかないと、「提出は閉じているが順位は見せたい」という今の状態を表現できない
 * （kill switch はサーバー側の env で Preview だけ開ける設計＝クライアント定数では切り替わらない）。
 *
 * ★秘密を送らない
 * 送るのは `dailyKey` と、任意で**公開ID**の `playerId` だけ。`playerSecret` は関与しない。
 * `playerId` はリーダーボードに載る公開情報なので query に置いてよい（`secrets.test.ts` の
 * 禁止対象は `playerSecret`）。
 *
 * ★型をサーバーから import しない
 * `import type` でも `rankingBoundary.test.ts` のクロールに拾われ、
 * 「ブラウザ側が `src/server` へ到達している」と判定される。加えて、HTTPの向こうから
 * 来るものは**信用せずに自前で検証する**のが正しい。だから形はここで持ち、実行時に検査する。
 */

/** 表示に必要な1行ぶん。サーバーの応答から**検証して**作る */
export type LeaderboardRowData = {
  playerId: string
  godId: string
  score: number
  win: boolean
  round: number
  /** 同点は同じ値。次は人数ぶん飛ぶ（1, 1, 3 方式。決定133） */
  rank: number
  /** その順位を分け合っている人数 */
  tiedCount: number
  /** 上位何% */
  topPercent: number
  /** 次に高い異なるスコアまでの差。最上位は null */
  pointsToNextRank: number | null
}

export type LeaderboardData = {
  dailyKey: string
  /** その日の参加者数（1人が3回挑戦しても1） */
  totalPlayers: number
  rows: LeaderboardRowData[]
  /** `playerId` を渡した場合、その人の行（Top外でも返る） */
  self: LeaderboardRowData | null
}

/** 取れなかった理由。UIの文言はこれで分岐する */
export type LeaderboardFailure =
  /** ランキング機能がまだ動いていない（未deploy・env未設定・DB未接続） */
  | 'disabled'
  /** サーバーが一時的に落ちている（5xx・想定外の応答） */
  | 'unavailable'
  /** 端末が繋がらない、または時間内に返ってこなかった */
  | 'offline'
  /** 日付キーが不正（呼び出し側のバグ。UIには「取得できません」として出す） */
  | 'bad-request'

export type LeaderboardResult =
  | { ok: true; board: LeaderboardData }
  | { ok: false; reason: LeaderboardFailure }

/** GET専用の通信手段。テストで本物のネットワークに触れないよう注入できる */
export type LeaderboardTransport = (
  url: string,
  init: { signal?: AbortSignal },
) => Promise<{ status: number; json: () => Promise<unknown> }>

const defaultTransport: LeaderboardTransport = async (url, init) => {
  const response = await globalThis.fetch(url, init)
  return { status: response.status, json: () => response.json() as Promise<unknown> }
}

export type LeaderboardOptions = {
  /** 取得先のベースURL。未設定なら同一オリジンの `/api` */
  baseUrl?: string
  transport?: LeaderboardTransport
  /** 自分の行を一緒に取るための公開ID。省略時は端末のIDを使う */
  playerId?: string
  /** 上位何件を取るか。既定は `RULES.ranking.leaderboardTopCount` */
  limit?: number
  /** 打ち切り時間。既定は `RULES.ranking.leaderboardTimeoutMs` */
  timeoutMs?: number
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** 1行を検証する。1つでも欠けていれば null（＝その行は捨てる） */
function toRow(value: unknown): LeaderboardRowData | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.playerId !== 'string' || v.playerId.length === 0) return null
  if (typeof v.godId !== 'string') return null
  if (!isFiniteNumber(v.score) || !isFiniteNumber(v.round)) return null
  if (!isFiniteNumber(v.rank) || !isFiniteNumber(v.tiedCount) || !isFiniteNumber(v.topPercent)) return null
  if (typeof v.win !== 'boolean') return null
  const gap = v.pointsToNextRank
  if (gap !== null && !isFiniteNumber(gap)) return null
  return {
    playerId: v.playerId,
    godId: v.godId,
    score: v.score,
    win: v.win,
    round: v.round,
    rank: v.rank,
    tiedCount: v.tiedCount,
    topPercent: v.topPercent,
    pointsToNextRank: gap === null ? null : (gap as number),
  }
}

/** 応答全体を検証する。形が違えば null（＝`unavailable` として扱う） */
export function parseLeaderboard(value: unknown): LeaderboardData | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.dailyKey !== 'string') return null
  if (!isFiniteNumber(v.totalPlayers)) return null
  if (!Array.isArray(v.rows)) return null
  const rows: LeaderboardRowData[] = []
  for (const raw of v.rows) {
    const row = toRow(raw)
    // 1行でも壊れていたら、静かに落として残りを見せる（全部捨てない）
    if (row) rows.push(row)
  }
  return {
    dailyKey: v.dailyKey,
    totalPlayers: v.totalPlayers,
    rows,
    self: toRow(v.self),
  }
}

/**
 * その日のランキングを取る。
 *
 * **失敗しても例外を投げない。** 呼び出し側（UI）は必ず結果を受け取り、
 * ランキングが無い状態のまま画面を成立させられる（＝ゲーム本体は壊れない）。
 */
export async function fetchDailyLeaderboard(
  dailyKey: string,
  options: LeaderboardOptions = {},
): Promise<LeaderboardResult> {
  const transport = options.transport ?? defaultTransport
  const baseUrl = options.baseUrl ?? '/api'
  const limit = options.limit ?? RULES.ranking.leaderboardTopCount
  const timeoutMs = options.timeoutMs ?? RULES.ranking.leaderboardTimeoutMs

  let playerId: string | null = options.playerId ?? null
  if (playerId === null) {
    // 端末のIDが作れなくてもランキング自体は見せられる（自分の行が出ないだけ）
    try {
      playerId = await getAnonymousPlayerId()
    } catch {
      playerId = null
    }
  }

  const query = new URLSearchParams({ dailyKey, limit: String(limit) })
  if (playerId) query.set('playerId', playerId)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await transport(`${baseUrl}/ranking/leaderboard?${query.toString()}`, {
      signal: controller.signal,
    })

    if (response.status === 200) {
      const board = parseLeaderboard(await response.json().catch(() => null))
      return board ? { ok: true, board } : { ok: false, reason: 'unavailable' }
    }
    // 404＝まだ deploy されていない、503＝env未設定 or DB未接続。
    // どちらも「機能がまだ動いていない」であって、障害ではない
    if (response.status === 404 || response.status === 503) return { ok: false, reason: 'disabled' }
    if (response.status === 400) return { ok: false, reason: 'bad-request' }
    return { ok: false, reason: 'unavailable' }
  } catch {
    // 通信断・abort（時間切れ）。どちらも端末側から見れば「今は繋がらない」
    return { ok: false, reason: 'offline' }
  } finally {
    clearTimeout(timer)
  }
}
