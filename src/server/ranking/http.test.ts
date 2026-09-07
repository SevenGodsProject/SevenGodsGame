import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RULES } from '../../core/data/rules'
import { GOD_IDS } from '../../core/data/gods'
import { dailyKeyOf } from '../../core/data/dailyBoss'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { toReplayInput } from '../../core/replay'
import { playRecordedDailyRun } from '../../core/replay/replayTestUtils'
import { handleRankingRequest } from './http'
import { createMemoryRankingStore } from './store'

/**
 * Phase 4.3：HTTPの受け口。
 *
 * ホスティング非依存のまま、ステータスコードと本文の契約を固定する。
 * Vercel Functions 等のラッパーは「詰め替えるだけ」になる。
 */

const GOD = GOD_IDS.ebisu
const PLAYER = 'a'.repeat(32)
const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAILY_KEY = dailyKeyOf(new Date(NOW))

const store = createMemoryRankingStore()
const deps = { store, now: NOW }

let seq = 0
function submitBody(overrides: Record<string, unknown> = {}) {
  seq++
  const run = playRecordedDailyRun({
    dailyKey: DAILY_KEY,
    godId: GOD,
    deck: getRecommendedDeck(GOD),
    policySeed: seq,
    clientRunId: 'c'.repeat(32),
  })
  return {
    playerId: PLAYER,
    clientRunId: String(seq).padStart(32, '0'),
    input: toReplayInput(run.log),
    ...overrides,
  }
}

/** kill switch を一時的に開けて「本番稼働後」の挙動を検証する */
async function withSubmissionEnabled<T>(fn: () => Promise<T>): Promise<T> {
  const spy = vi
    .spyOn(RULES.ranking, 'submissionEnabled', 'get')
    .mockReturnValue(true as never)
  try {
    return await fn()
  } finally {
    spy.mockRestore()
  }
}

beforeEach(() => {
  store.clear()
  seq = 0
})

describe('POST /ranking/submit', () => {
  it('kill switchがoffの間は503を返して一切保存しない', async () => {
    const response = await handleRankingRequest(
      { method: 'POST', path: '/api/ranking/submit', body: submitBody() },
      deps,
    )
    expect(response.status).toBe(503)
    expect(response.body).toEqual({ error: 'submission_disabled' })
    expect(await store.listDayRuns(DAILY_KEY)).toEqual([])
  })

  it('有効化すると新規受理で201、再送で200を返す', async () => {
    await withSubmissionEnabled(async () => {
      const body = submitBody()
      const first = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body },
        deps,
      )
      expect(first.status).toBe(201)
      const payload = first.body as Record<string, unknown>
      expect(payload.accepted).toBe('stored')
      expect(typeof payload.score).toBe('number')
      expect(payload.runsUsed).toBe(1)
      expect(payload.attemptsPerDay).toBe(RULES.daily.attemptsPerDay)

      const again = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body },
        deps,
      )
      expect(again.status).toBe(200)
      expect((again.body as Record<string, unknown>).accepted).toBe('duplicate')
    })
  })

  it('レスポンスにクライアントの申告値を反射しない', async () => {
    await withSubmissionEnabled(async () => {
      const body = submitBody({ score: 999_999 })
      const response = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body },
        deps,
      )
      expect(response.status).toBe(201)
      expect((response.body as Record<string, unknown>).score).not.toBe(999_999)
    })
  })

  it('拒否理由ごとに適切なステータスを返す', async () => {
    await withSubmissionEnabled(async () => {
      // 身元不正 → 400
      const bad = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body: submitBody({ playerId: 'x' }) },
        deps,
      )
      expect(bad.status).toBe(400)

      // 期限切れ → 409
      const stale = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body: submitBody() },
        { store, now: Date.parse('2026-09-20T03:00:00Z') },
      )
      expect(stale.status).toBe(409)
      expect((stale.body as Record<string, unknown>).error).toBe('STALE_DAILY_KEY')

      // 検証失敗 → 422
      const base = submitBody()
      const tampered = { ...base, input: { ...base.input, actions: base.input.actions.slice(0, 1) } }
      const rejected = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body: tampered },
        deps,
      )
      expect(rejected.status).toBe(422)
      expect((rejected.body as Record<string, unknown>).replayCode).toBe('NOT_FINISHED')
    })
  })

  it('bodyの形が違えば400、メソッド違いは405', async () => {
    await withSubmissionEnabled(async () => {
      const bad = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body: { nope: true } },
        deps,
      )
      expect(bad.status).toBe(400)
    })
    const wrongMethod = await handleRankingRequest(
      { method: 'GET', path: '/api/ranking/submit' },
      deps,
    )
    expect(wrongMethod.status).toBe(405)
  })
})

describe('GET /ranking/leaderboard', () => {
  it('日付キーを検査し、順位を返す', async () => {
    await withSubmissionEnabled(async () => {
      await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body: submitBody() },
        deps,
      )
    })
    const response = await handleRankingRequest(
      {
        method: 'GET',
        path: '/api/ranking/leaderboard',
        query: { dailyKey: DAILY_KEY, playerId: PLAYER },
      },
      deps,
    )
    expect(response.status).toBe(200)
    const board = response.body as { totalPlayers: number; rows: { rank: number }[]; self: unknown }
    expect(board.totalPlayers).toBe(1)
    expect(board.rows[0].rank).toBe(1)
    expect(board.self).not.toBeNull()
  })

  it('日付キーが無い・不正なら400', async () => {
    for (const query of [undefined, { dailyKey: 'nope' }, { dailyKey: '2026-02-30' }]) {
      const response = await handleRankingRequest(
        { method: 'GET', path: '/api/ranking/leaderboard', query },
        deps,
      )
      expect(response.status).toBe(400)
    }
  })

  it('limitは上限で頭打ちになる（大量取得を許さない）', async () => {
    const response = await handleRankingRequest(
      {
        method: 'GET',
        path: '/api/ranking/leaderboard',
        query: { dailyKey: DAILY_KEY, limit: '100000' },
      },
      deps,
    )
    expect(response.status).toBe(200)
    expect((response.body as { rows: unknown[] }).rows.length).toBeLessThanOrEqual(
      RULES.ranking.leaderboardLimit,
    )
  })

  it('未知のパスは404', async () => {
    const response = await handleRankingRequest({ method: 'GET', path: '/api/nope' }, deps)
    expect(response.status).toBe(404)
  })
})
