import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { RULES } from '../../core/data/rules'
import { GOD_IDS } from '../../core/data/gods'
import { dailyKeyOf } from '../../core/data/dailyBoss'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { getGameVersion, toReplayInput } from '../../core/replay'
import { playRecordedDailyRun } from '../../core/replay/replayTestUtils'
import { handleRankingRequest } from './http'
import { clearLeaderboardCache } from './leaderboard'
import { createMemoryRankingStore } from './store'
import { makeIdentity, runId, type TestIdentity } from './rankingTestUtils'

/**
 * Phase 4.3〜4.6：HTTPの受け口。
 *
 * ホスティング非依存のまま、ステータスコードと本文の契約を固定する。
 * Vercel Functions 等のラッパーは「詰め替えるだけ」になる。
 */

const GOD = GOD_IDS.ebisu
const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAILY_KEY = dailyKeyOf(new Date(NOW))

const store = createMemoryRankingStore()
const deps = { store, now: NOW }

let me: TestIdentity
beforeAll(async () => {
  me = await makeIdentity('http-me')
})

let seq = 0
function startBody(overrides: Record<string, unknown> = {}) {
  seq++
  return { ...me, clientRunId: runId(seq), ...overrides }
}

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
    ...me,
    clientRunId: runId(seq),
    input: toReplayInput(run.log),
    ...overrides,
  }
}

/** 開始してから提出する（本番と同じ順序） */
async function startedSubmitBody(overrides: Record<string, unknown> = {}) {
  const body = submitBody(overrides)
  const started = await handleRankingRequest(
    { method: 'POST', path: '/api/ranking/start', body: { ...me, clientRunId: body.clientRunId } },
    deps,
  )
  expect(started.status, JSON.stringify(started.body)).toBe(201)
  return body
}

/** kill switch を一時的に開けて「本番稼働後」の挙動を検証する */
async function withSubmissionEnabled<T>(fn: () => Promise<T>): Promise<T> {
  const spy = vi.spyOn(RULES.ranking, 'submissionEnabled', 'get').mockReturnValue(true as never)
  try {
    return await fn()
  } finally {
    spy.mockRestore()
  }
}

beforeEach(() => {
  store.clear()
  clearLeaderboardCache(store)
  seq = 0
})

describe('POST /ranking/start', () => {
  it('kill switchがoffの間は503を返して一切保存しない', async () => {
    const response = await handleRankingRequest(
      { method: 'POST', path: '/api/ranking/start', body: startBody() },
      deps,
    )
    expect(response.status).toBe(503)
    expect(response.body).toEqual({ error: 'submission_disabled' })
    expect(await store.listTickets(DAILY_KEY, me.playerId)).toEqual([])
  })

  it('新規発行で201、同じclientRunIdの再取得は200', async () => {
    await withSubmissionEnabled(async () => {
      const body = startBody()
      const first = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/start', body },
        deps,
      )
      expect(first.status).toBe(201)
      const payload = first.body as Record<string, unknown>
      expect(payload.dailyKey).toBe(DAILY_KEY)
      expect(payload.attemptNo).toBe(1)
      expect(payload.attemptsUsed).toBe(1)
      expect(payload.attemptsPerDay).toBe(RULES.daily.attemptsPerDay)
      expect(payload.gameVersion).toBe(getGameVersion())
      expect(payload.state).toBe('open')
      expect(payload.reused).toBe(false)
      expect(payload.serverNow).toBe(NOW)
      expect(typeof payload.expiresAt).toBe('number')
      // 秘密は返さない
      expect(JSON.stringify(payload)).not.toContain(me.playerSecret)

      const again = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/start', body },
        deps,
      )
      expect(again.status).toBe(200)
      expect((again.body as Record<string, unknown>).reused).toBe(true)
    })
  })

  it('拒否理由ごとに適切なステータスを返す', async () => {
    await withSubmissionEnabled(async () => {
      // 身元不正 → 400
      const bad = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/start', body: startBody({ playerId: 'x' }) },
        deps,
      )
      expect(bad.status).toBe(400)

      // 枠切れ → 409
      for (let i = 0; i < RULES.daily.attemptsPerDay; i++) {
        await handleRankingRequest(
          { method: 'POST', path: '/api/ranking/start', body: startBody() },
          deps,
        )
      }
      const exceeded = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/start', body: startBody() },
        deps,
      )
      expect(exceeded.status).toBe(409)
      expect((exceeded.body as Record<string, unknown>).error).toBe('ATTEMPTS_EXCEEDED')
    })
  })

  it('版が変わった日の新規開始は423（当日は混ぜない）', async () => {
    await withSubmissionEnabled(async () => {
      await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/start', body: startBody() },
        { ...deps, gameVersion: 'v1' },
      )
      const locked = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/start', body: startBody() },
        { ...deps, gameVersion: 'v2' },
      )
      expect(locked.status).toBe(423)
      expect((locked.body as Record<string, unknown>).error).toBe('RULES_VERSION_LOCKED')
    })
  })

  it('bodyの形が違えば400、メソッド違いは405', async () => {
    await withSubmissionEnabled(async () => {
      const bad = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/start', body: { playerId: 'a' } },
        deps,
      )
      expect(bad.status).toBe(400)
    })
    const wrongMethod = await handleRankingRequest(
      { method: 'GET', path: '/api/ranking/start' },
      deps,
    )
    expect(wrongMethod.status).toBe(405)
  })
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
      const body = await startedSubmitBody()
      const first = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body },
        deps,
      )
      expect(first.status).toBe(201)
      const payload = first.body as Record<string, unknown>
      expect(payload.accepted).toBe('stored')
      expect(typeof payload.score).toBe('number')
      expect(payload.runsUsed).toBe(1)
      expect(payload.attemptNo).toBe(1)
      expect(payload.attemptsPerDay).toBe(RULES.daily.attemptsPerDay)

      const again = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body },
        deps,
      )
      expect(again.status).toBe(200)
      expect((again.body as Record<string, unknown>).accepted).toBe('duplicate')
    })
  })

  it('レスポンスにクライアントの申告値・秘密を反射しない', async () => {
    await withSubmissionEnabled(async () => {
      const body = await startedSubmitBody({ score: 999_999 })
      const response = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body },
        deps,
      )
      expect(response.status).toBe(201)
      expect((response.body as Record<string, unknown>).score).not.toBe(999_999)
      expect(JSON.stringify(response.body)).not.toContain(me.playerSecret)
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

      // ticket無し（別日を名乗った場合を含む） → 404
      const noTicket = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body: submitBody() },
        deps,
      )
      expect(noTicket.status).toBe(404)
      expect((noTicket.body as Record<string, unknown>).error).toBe('NO_TICKET')

      // 期限切れ → 410
      const expiring = await startedSubmitBody()
      const expired = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body: expiring },
        { store, now: NOW + (RULES.ranking.ticketTtlMinutes + 1) * 60_000 },
      )
      expect(expired.status).toBe(410)
      expect((expired.body as Record<string, unknown>).error).toBe('TICKET_EXPIRED')

      // 版の不一致 → 409（枠は返還される）
      const stale = await startedSubmitBody()
      const mismatch = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body: stale },
        { ...deps, gameVersion: 'other-version' },
      )
      expect(mismatch.status).toBe(409)
      expect((mismatch.body as Record<string, unknown>).error).toBe('RULES_VERSION_MISMATCH')

      // 検証失敗 → 422
      const base = await startedSubmitBody()
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

describe('bodyの大きさの門番（Phase 4.6）', () => {
  it('上限を超えるbodyは413で切る（解析も検証もしない）', async () => {
    await withSubmissionEnabled(async () => {
      for (const path of ['/api/ranking/start', '/api/ranking/submit']) {
        const response = await handleRankingRequest(
          {
            method: 'POST',
            path,
            body: submitBody(),
            bodyBytes: RULES.ranking.maxBodyBytes + 1,
          },
          deps,
        )
        expect(response.status).toBe(413)
        expect(response.body).toEqual({ error: 'payload_too_large' })
      }
      // 何も書かれていない
      expect(await store.listTickets(DAILY_KEY, me.playerId)).toEqual([])
      expect(await store.listDayRuns(DAILY_KEY)).toEqual([])
    })
  })

  it('上限ちょうどは通す', async () => {
    await withSubmissionEnabled(async () => {
      const body = await startedSubmitBody()
      const response = await handleRankingRequest(
        {
          method: 'POST',
          path: '/api/ranking/submit',
          body,
          bodyBytes: RULES.ranking.maxBodyBytes,
        },
        deps,
      )
      expect(response.status).toBe(201)
    })
  })

  it('bodyBytesを渡さないラッパーでも従来どおり動く', async () => {
    await withSubmissionEnabled(async () => {
      const body = await startedSubmitBody()
      const response = await handleRankingRequest(
        { method: 'POST', path: '/api/ranking/submit', body },
        deps,
      )
      expect(response.status).toBe(201)
    })
  })
})

describe('GET /ranking/leaderboard', () => {
  it('日付キーを検査し、順位とキャッシュヘッダを返す', async () => {
    await withSubmissionEnabled(async () => {
      const body = await startedSubmitBody()
      await handleRankingRequest({ method: 'POST', path: '/api/ranking/submit', body }, deps)
    })
    const response = await handleRankingRequest(
      {
        method: 'GET',
        path: '/api/ranking/leaderboard',
        query: { dailyKey: DAILY_KEY, playerId: me.playerId },
      },
      deps,
    )
    expect(response.status).toBe(200)
    const board = response.body as { totalPlayers: number; rows: { rank: number }[]; self: unknown }
    expect(board.totalPlayers).toBe(1)
    expect(board.rows[0].rank).toBe(1)
    expect(board.self).not.toBeNull()
    expect(response.headers?.['cache-control']).toBe(
      `public, s-maxage=${RULES.ranking.leaderboardCacheSeconds}, stale-while-revalidate=${RULES.ranking.leaderboardCacheSeconds * 4}`,
    )
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
