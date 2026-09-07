import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RULES } from '../core/data/rules'
import { GOD_IDS } from '../core/data/gods'
import { dailyKeyOf } from '../core/data/dailyBoss'
import { getRecommendedDeck } from '../core/data/deckBuilder'
import { toReplayInput } from '../core/replay'
import { playRecordedDailyRun } from '../core/replay/replayTestUtils'
import { handleRankingRequest } from '../server/ranking'
import { createMemoryRankingStore } from '../server/ranking'
import { clearAnonymousPlayerId, getAnonymousPlayerId, isAnonymousPlayerId } from './anonymousPlayerId'
import { createClientRunId } from './clientRunId'
import { enqueuePendingRun, loadPendingRuns } from './pendingRunStorage'
import { buildSubmitPayload, flushPendingRuns, type RankingTransport } from './rankingClient'

/**
 * Phase 4.3：匿名プレイヤーIDと提出クライアント。
 *
 * ★Phase 4.3 では本物のネットワークに一切触れない。
 * 送信先は `transport` を注入して差し替え、実サーバー（`handleRankingRequest`）を
 * メモリ実装の上で直接呼ぶ「ループバック」で end-to-end を確かめる。
 */

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

const GOD = GOD_IDS.ebisu
const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAILY_KEY = dailyKeyOf(new Date(NOW))

let seq = 0
function enqueueOne() {
  seq++
  const run = playRecordedDailyRun({
    dailyKey: DAILY_KEY,
    godId: GOD,
    deck: getRecommendedDeck(GOD),
    policySeed: seq,
    clientRunId: createClientRunId(),
  })
  const clientRunId = run.log.clientRunId
  enqueuePendingRun({ clientRunId, dailyKey: DAILY_KEY, input: toReplayInput(run.log) }, DAILY_KEY)
  return clientRunId
}

async function withSubmissionEnabled<T>(fn: () => Promise<T>): Promise<T> {
  const spy = vi.spyOn(RULES.ranking, 'submissionEnabled', 'get').mockReturnValue(true as never)
  try {
    return await fn()
  } finally {
    spy.mockRestore()
  }
}

beforeEach(() => {
  ;(globalThis as { localStorage: Storage }).localStorage = new MemoryStorage()
  seq = 0
})

describe('匿名プレイヤーID', () => {
  it('端末で1つ発行され、同じ端末では変わらない', () => {
    const a = getAnonymousPlayerId()
    const b = getAnonymousPlayerId()
    expect(a).toBe(b)
    expect(isAnonymousPlayerId(a)).toBe(true)
    expect(a.length).toBe(RULES.ranking.playerIdLength)
  })

  it('乱数のみで、個人情報も日付もseedも含まない', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 50; i++) {
      ;(globalThis as { localStorage: Storage }).localStorage = new MemoryStorage()
      const id = getAnonymousPlayerId()
      ids.add(id)
      expect(id).toMatch(/^[0-9a-f]+$/)
      expect(id).not.toContain(DAILY_KEY)
      expect(id).not.toContain('daily')
    }
    expect(ids.size).toBe(50)
  })

  it('消せる（別人として遊べる出口がある）', () => {
    const before = getAnonymousPlayerId()
    clearAnonymousPlayerId()
    const after = getAnonymousPlayerId()
    expect(after).not.toBe(before)
  })

  it('localStorageが使えなくても例外を投げない（その場限りのIDになる）', () => {
    ;(globalThis as { localStorage: unknown }).localStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    expect(() => getAnonymousPlayerId()).not.toThrow()
    expect(isAnonymousPlayerId(getAnonymousPlayerId())).toBe(true)
  })

  it('壊れた保存値は作り直す', () => {
    localStorage.setItem('sevengods.playerId', 'not-an-id')
    const id = getAnonymousPlayerId()
    expect(isAnonymousPlayerId(id)).toBe(true)
  })
})

describe('提出payload', () => {
  it('playerId・clientRunId・ReplayInput だけを送る', () => {
    enqueueOne()
    const run = loadPendingRuns()[0]
    const payload = buildSubmitPayload(run, getAnonymousPlayerId())
    expect(new Set(Object.keys(payload))).toEqual(new Set(['playerId', 'clientRunId', 'input']))
    const json = JSON.stringify(payload).toLowerCase()
    for (const forbidden of ['email', 'useragent', 'cookie', 'fingerprint', 'timezone', '"score"']) {
      expect(json).not.toContain(forbidden)
    }
  })
})

describe('flushPendingRuns：送信の門番', () => {
  it('kill switchがoffの間は一切通信しない（控えも減らない）', async () => {
    enqueueOne()
    const transport = vi.fn()
    const result = await flushPendingRuns({ transport: transport as unknown as RankingTransport })
    expect(result.status).toBe('disabled')
    expect(transport).not.toHaveBeenCalled()
    expect(loadPendingRuns().length).toBe(1)
  })

  it('控えが空なら何もしない', async () => {
    await withSubmissionEnabled(async () => {
      const transport = vi.fn()
      const result = await flushPendingRuns({ transport: transport as unknown as RankingTransport })
      expect(result.status).toBe('empty')
      expect(transport).not.toHaveBeenCalled()
    })
  })

  it('実サーバー（ループバック）へ提出し、受理された分だけ控えから消える', async () => {
    await withSubmissionEnabled(async () => {
      const store = createMemoryRankingStore()
      const transport: RankingTransport = async (url, init) => {
        const response = await handleRankingRequest(
          { method: init.method, path: url, body: JSON.parse(init.body) },
          { store, now: NOW },
        )
        return { status: response.status, json: async () => response.body }
      }

      enqueueOne()
      enqueueOne()
      expect(loadPendingRuns().length).toBe(2)

      const result = await flushPendingRuns({ transport })
      expect(result.status).toBe('done')
      if (result.status !== 'done') return
      expect(result.accepted).toBe(2)
      expect(result.failed).toBe(0)
      expect(loadPendingRuns()).toEqual([])

      // サーバー側にはスコアが検証済みの値として保存されている
      const runs = await store.listDayRuns(DAILY_KEY)
      expect(runs.length).toBe(2)
      expect(runs.every((r) => typeof r.score === 'number' && r.score > 0)).toBe(true)
      // 全runが同じ匿名IDに紐づく（同じ端末＝1人）
      expect(new Set(runs.map((r) => r.playerId)).size).toBe(1)
    })
  })

  it('再送しても同じclientRunIdなので二重登録にならない', async () => {
    await withSubmissionEnabled(async () => {
      const store = createMemoryRankingStore()
      const transport: RankingTransport = async (url, init) => {
        const response = await handleRankingRequest(
          { method: init.method, path: url, body: JSON.parse(init.body) },
          { store, now: NOW },
        )
        return { status: response.status, json: async () => response.body }
      }

      const id = enqueueOne()
      const sent = loadPendingRuns()[0]
      await flushPendingRuns({ transport })
      expect(loadPendingRuns()).toEqual([])
      expect((await store.listDayRuns(DAILY_KEY)).length).toBe(1)

      // 「送信は成功したがレスポンスを受け取れず、控えが残ったままだった」状況を再現。
      // 同じ clientRunId で再送しても、サーバー側の登録は増えない
      enqueuePendingRun(
        { clientRunId: sent.clientRunId, dailyKey: sent.dailyKey, input: sent.input },
        DAILY_KEY,
      )
      const retry = await flushPendingRuns({ transport })
      expect(retry.status).toBe('done')
      if (retry.status === 'done') expect(retry.accepted).toBe(1)
      expect((await store.listDayRuns(DAILY_KEY)).length, '二重登録されていない').toBe(1)
      expect((await store.listDayRuns(DAILY_KEY))[0].clientRunId).toBe(id)
      // 再送は提出試行としても数えない＝枠を失わない
      expect(await store.countAttempts(DAILY_KEY, getAnonymousPlayerId())).toBe(1)
    })
  })

  it('一時的な失敗（5xx・429）では控えを残し、恒久的な拒否（4xx）では捨てる', async () => {
    await withSubmissionEnabled(async () => {
      enqueueOne()
      const temporary: RankingTransport = async () => ({ status: 503, json: async () => ({}) })
      const a = await flushPendingRuns({ transport: temporary })
      expect(a.status).toBe('done')
      if (a.status === 'done') expect(a.failed).toBe(1)
      expect(loadPendingRuns().length, '一時失敗では控えを残す').toBe(1)

      const permanent: RankingTransport = async () => ({ status: 422, json: async () => ({}) })
      const b = await flushPendingRuns({ transport: permanent })
      if (b.status === 'done') expect(b.failed).toBe(1)
      expect(loadPendingRuns().length, '恒久拒否では控えを捨てる').toBe(0)
    })
  })

  it('通信そのものが失敗しても控えを失わない', async () => {
    await withSubmissionEnabled(async () => {
      enqueueOne()
      const broken: RankingTransport = async () => {
        throw new Error('offline')
      }
      const result = await flushPendingRuns({ transport: broken })
      expect(result.status).toBe('done')
      if (result.status === 'done') {
        expect(result.accepted).toBe(0)
        expect(result.errors[0]).toContain('offline')
      }
      expect(loadPendingRuns().length).toBe(1)
    })
  })

  it('既定の transport は fetch を使うが、kill switch offなら呼ばれない', async () => {
    const spy = vi.fn()
    const real = globalThis.fetch
    ;(globalThis as { fetch: unknown }).fetch = spy
    try {
      enqueueOne()
      await flushPendingRuns()
      expect(spy).not.toHaveBeenCalled()
    } finally {
      ;(globalThis as { fetch: unknown }).fetch = real
    }
  })
})
