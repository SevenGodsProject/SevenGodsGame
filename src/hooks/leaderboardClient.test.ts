import { describe, expect, it, vi } from 'vitest'
import { RULES } from '../core/data/rules'
import {
  fetchDailyLeaderboard,
  parseLeaderboard,
  type LeaderboardTransport,
} from './leaderboardClient'

/**
 * Phase 4.9：ランキング取得の契約。
 *
 * ★ここで守りたいこと
 *   1. **どんな失敗でも例外を投げない**。投げるとDaily画面ごと落ちる
 *   2. 失敗の種類を取り違えない（「準備中」と「障害」は文言が変わる）
 *   3. 秘密をURLに載せない
 *   4. 壊れた応答を鵜呑みにしない
 */

const DAILY_KEY = '2026-09-10'
const PLAYER = 'a'.repeat(32)

function row(overrides: Record<string, unknown> = {}) {
  return {
    playerId: 'b'.repeat(32),
    godId: 'ebisu',
    score: 1000,
    win: true,
    round: 5,
    rank: 1,
    tiedCount: 1,
    topPercent: 10,
    pointsToNextRank: null,
    ...overrides,
  }
}

function board(overrides: Record<string, unknown> = {}) {
  return { dailyKey: DAILY_KEY, totalPlayers: 1, rows: [row()], self: null, ...overrides }
}

/** 指定のstatus/bodyを返すだけのtransport。URLを記録する */
function stub(status: number, body: unknown) {
  const urls: string[] = []
  const transport: LeaderboardTransport = async (url) => {
    urls.push(url)
    return { status, json: async () => body }
  }
  return { transport, urls }
}

describe('取得に成功する', () => {
  it('200 ならボードを返す', async () => {
    const { transport } = stub(200, board())
    const result = await fetchDailyLeaderboard(DAILY_KEY, { transport, playerId: PLAYER })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.board.dailyKey).toBe(DAILY_KEY)
      expect(result.board.rows).toHaveLength(1)
    }
  })

  it('dailyKey・limit・playerId をクエリに載せる', async () => {
    const { transport, urls } = stub(200, board())
    await fetchDailyLeaderboard(DAILY_KEY, { transport, playerId: PLAYER })
    expect(urls[0]).toContain('/api/ranking/leaderboard?')
    expect(urls[0]).toContain(`dailyKey=${DAILY_KEY}`)
    expect(urls[0]).toContain(`limit=${RULES.ranking.leaderboardTopCount}`)
    expect(urls[0]).toContain(`playerId=${PLAYER}`)
  })

  it('★秘密をURLに載せない', async () => {
    const { transport, urls } = stub(200, board())
    await fetchDailyLeaderboard(DAILY_KEY, { transport, playerId: PLAYER })
    expect(urls[0].toLowerCase()).not.toContain('secret')
  })

  it('dailyKey を変えると別の日を取りに行く（日付跨ぎ）', async () => {
    const { transport, urls } = stub(200, board())
    await fetchDailyLeaderboard('2026-09-09', { transport, playerId: PLAYER })
    await fetchDailyLeaderboard('2026-09-10', { transport, playerId: PLAYER })
    expect(urls[0]).toContain('dailyKey=2026-09-09')
    expect(urls[1]).toContain('dailyKey=2026-09-10')
  })

  it('playerId が無ければクエリに含めない（自分の行が出ないだけ）', async () => {
    const { transport, urls } = stub(200, board())
    await fetchDailyLeaderboard(DAILY_KEY, { transport, playerId: '' })
    expect(urls[0]).not.toContain('playerId=')
  })
})

describe('失敗の種類を取り違えない', () => {
  it('503（env未設定・DB未接続）は disabled', async () => {
    const { transport } = stub(503, { error: 'api_disabled' })
    const result = await fetchDailyLeaderboard(DAILY_KEY, { transport, playerId: PLAYER })
    expect(result).toEqual({ ok: false, reason: 'disabled' })
  })

  it('404（未deploy）も disabled', async () => {
    const { transport } = stub(404, null)
    const result = await fetchDailyLeaderboard(DAILY_KEY, { transport, playerId: PLAYER })
    expect(result).toEqual({ ok: false, reason: 'disabled' })
  })

  it('500 は unavailable', async () => {
    const { transport } = stub(500, { error: 'internal_error' })
    const result = await fetchDailyLeaderboard(DAILY_KEY, { transport, playerId: PLAYER })
    expect(result).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('400 は bad-request', async () => {
    const { transport } = stub(400, { error: 'bad_daily_key' })
    const result = await fetchDailyLeaderboard(DAILY_KEY, { transport, playerId: PLAYER })
    expect(result).toEqual({ ok: false, reason: 'bad-request' })
  })

  it('通信そのものが失敗したら offline（例外を外へ出さない）', async () => {
    const transport: LeaderboardTransport = async () => {
      throw new TypeError('fetch failed')
    }
    const result = await fetchDailyLeaderboard(DAILY_KEY, { transport, playerId: PLAYER })
    expect(result).toEqual({ ok: false, reason: 'offline' })
  })

  it('★時間内に返らなければ打ち切って offline（画面を待たせ続けない）', async () => {
    // signal が abort されたら reject する＝本物の fetch と同じ振る舞い
    const transport: LeaderboardTransport = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })
    const result = await fetchDailyLeaderboard(DAILY_KEY, {
      transport,
      playerId: PLAYER,
      timeoutMs: 5,
    })
    expect(result).toEqual({ ok: false, reason: 'offline' })
  })

  it('時間内に返れば打ち切らない', async () => {
    const transport: LeaderboardTransport = async () => ({ status: 200, json: async () => board() })
    const result = await fetchDailyLeaderboard(DAILY_KEY, {
      transport,
      playerId: PLAYER,
      timeoutMs: 1000,
    })
    expect(result.ok).toBe(true)
  })

  it('成功しても失敗してもタイマーを片付ける（プロセスを掴んだままにしない）', async () => {
    const clear = vi.spyOn(globalThis, 'clearTimeout')
    const { transport } = stub(200, board())
    await fetchDailyLeaderboard(DAILY_KEY, { transport, playerId: PLAYER })
    expect(clear).toHaveBeenCalled()
    clear.mockRestore()
  })
})

describe('壊れた応答を鵜呑みにしない', () => {
  it('JSONとして読めなければ unavailable', async () => {
    const transport: LeaderboardTransport = async () => ({
      status: 200,
      json: async () => {
        throw new SyntaxError('not json')
      },
    })
    const result = await fetchDailyLeaderboard(DAILY_KEY, { transport, playerId: PLAYER })
    expect(result).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('形が違えば unavailable', async () => {
    for (const bad of [null, 'x', 42, {}, { dailyKey: 1 }, { dailyKey: DAILY_KEY, rows: 'x' }]) {
      const { transport } = stub(200, bad)
      const result = await fetchDailyLeaderboard(DAILY_KEY, { transport, playerId: PLAYER })
      expect(result, JSON.stringify(bad)).toEqual({ ok: false, reason: 'unavailable' })
    }
  })

  it('壊れた行だけ捨てて、残りは見せる', () => {
    const parsed = parseLeaderboard({
      dailyKey: DAILY_KEY,
      totalPlayers: 3,
      rows: [row(), { playerId: 'x' }, row({ rank: 2, score: 900 })],
      self: null,
    })
    expect(parsed?.rows).toHaveLength(2)
    expect(parsed?.rows[1].rank).toBe(2)
  })

  it('self が壊れていれば null にする（行は残す）', () => {
    const parsed = parseLeaderboard({ ...board(), self: { playerId: 'x' } })
    expect(parsed?.self).toBeNull()
    expect(parsed?.rows).toHaveLength(1)
  })

  it('pointsToNextRank は null か数値だけ受ける', () => {
    expect(parseLeaderboard({ ...board(), rows: [row({ pointsToNextRank: 120 })] })?.rows[0].pointsToNextRank).toBe(120)
    expect(parseLeaderboard({ ...board(), rows: [row({ pointsToNextRank: 'x' })] })?.rows).toHaveLength(0)
  })

  it('NaN / Infinity を数値として受け付けない', () => {
    expect(parseLeaderboard({ ...board(), rows: [row({ score: Number.NaN })] })?.rows).toHaveLength(0)
    expect(parseLeaderboard({ ...board(), rows: [row({ rank: Number.POSITIVE_INFINITY })] })?.rows).toHaveLength(0)
  })
})
