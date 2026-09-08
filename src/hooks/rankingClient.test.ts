import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RULES } from '../core/data/rules'
import { GOD_IDS } from '../core/data/gods'
import { dailyKeyOf } from '../core/data/dailyBoss'
import { getRecommendedDeck } from '../core/data/deckBuilder'
import { derivePlayerId } from '../core/identity'
import { getGameVersion, toReplayInput } from '../core/replay'
import { playRecordedDailyRun } from '../core/replay/replayTestUtils'
import { createMemoryRankingStore, handleRankingRequest } from '../server/ranking'
import {
  clearAnonymousIdentity,
  getAnonymousIdentity,
  getAnonymousPlayerId,
  hasLegacyAnonymousId,
  isAnonymousPlayerId,
} from './anonymousPlayerId'
import { createClientRunId } from './clientRunId'
import { enqueuePendingRun, loadPendingRuns } from './pendingRunStorage'
import { buildSubmitPayload, flushPendingRuns, startRankedRun, type RankingTransport } from './rankingClient'
import { clearTicket, loadTicket, remainingMs } from './rankingTicketStorage'

/**
 * Phase 4.3〜4.6：匿名identityと、開始／提出クライアント。
 *
 * ★本物のネットワークには一切触れない。
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

/** 実サーバーへループバックする transport。開始も提出も同じ経路を通る */
function loopback(store: ReturnType<typeof createMemoryRankingStore>, now = NOW): RankingTransport {
  return async (url, init) => {
    const response = await handleRankingRequest(
      { method: init.method, path: url, body: JSON.parse(init.body) },
      { store, now },
    )
    return { status: response.status, json: async () => response.body }
  }
}

/** 提出の前に枠を取る（本番と同じ順序） */
async function startFor(clientRunId: string, transport: RankingTransport) {
  return startRankedRun(clientRunId, { transport, now: NOW })
}

/**
 * 本番と同じ順序で1runを流す：**枠を取る → 遊ぶ → 控える**。
 * 控えを先に作ってから開始すると、実運用では起きない順序になる
 * （決着していないrunが控えに入ることは無い）。
 */
async function playRanked(transport: RankingTransport) {
  const clientRunId = createClientRunId()
  const started = await startRankedRun(clientRunId, { transport, now: NOW })
  seq++
  const run = playRecordedDailyRun({
    dailyKey: DAILY_KEY,
    godId: GOD,
    deck: getRecommendedDeck(GOD),
    policySeed: seq,
    clientRunId,
  })
  enqueuePendingRun({ clientRunId, dailyKey: DAILY_KEY, input: toReplayInput(run.log) }, DAILY_KEY)
  return { clientRunId, started }
}

beforeEach(() => {
  ;(globalThis as { localStorage: Storage }).localStorage = new MemoryStorage()
  seq = 0
})

describe('匿名identity', () => {
  it('端末で1つ発行され、同じ端末では変わらない', async () => {
    const a = await getAnonymousIdentity()
    const b = await getAnonymousIdentity()
    expect(a.playerSecret).toBe(b.playerSecret)
    expect(a.playerId).toBe(b.playerId)
    expect(isAnonymousPlayerId(a.playerId)).toBe(true)
    expect(a.playerId.length).toBe(RULES.ranking.playerIdLength)
    expect(a.playerSecret.length).toBe(RULES.ranking.playerSecretLength)
  })

  it('★公開IDは秘密のハッシュであって、秘密そのものではない', async () => {
    const identity = await getAnonymousIdentity()
    expect(identity.playerId).toBe(await derivePlayerId(identity.playerSecret))
    expect(identity.playerId).not.toBe(identity.playerSecret)
    // 公開IDは秘密の一部でもない（部分文字列になっていない）
    expect(identity.playerSecret).not.toContain(identity.playerId)
  })

  it('乱数のみで、個人情報も日付もseedも含まない', async () => {
    const ids = new Set<string>()
    for (let i = 0; i < 30; i++) {
      ;(globalThis as { localStorage: Storage }).localStorage = new MemoryStorage()
      const { playerId } = await getAnonymousIdentity()
      ids.add(playerId)
      expect(playerId).toMatch(/^[0-9a-f]+$/)
      expect(playerId).not.toContain(DAILY_KEY)
      expect(playerId).not.toContain('daily')
    }
    expect(ids.size).toBe(30)
  })

  it('消せる（別人として遊べる出口がある）', async () => {
    const before = await getAnonymousPlayerId()
    clearAnonymousIdentity()
    const after = await getAnonymousPlayerId()
    expect(after).not.toBe(before)
  })

  it('localStorageが使えなくても例外を投げない（その場限りのidentityになる）', async () => {
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
    await expect(getAnonymousIdentity()).resolves.toBeDefined()
    expect(isAnonymousPlayerId(await getAnonymousPlayerId())).toBe(true)
  })

  it('壊れた保存値は作り直す', async () => {
    localStorage.setItem('sevengods.playerSecret', 'not-a-secret')
    const identity = await getAnonymousIdentity()
    expect(isAnonymousPlayerId(identity.playerId)).toBe(true)
    expect(identity.playerSecret.length).toBe(RULES.ranking.playerSecretLength)
  })
})

describe('旧identityからの移行（Phase 4.5 → 4.6）', () => {
  it('★旧 playerId は引き継がず破棄し、新しい秘密を発行する', async () => {
    const legacy = 'a'.repeat(RULES.ranking.playerIdLength)
    localStorage.setItem('sevengods.playerId', legacy)
    expect(hasLegacyAnonymousId()).toBe(true)

    const identity = await getAnonymousIdentity()

    // 旧キーは消えている（公開値と同一の資格情報を残さない）
    expect(hasLegacyAnonymousId()).toBe(false)
    expect(localStorage.getItem('sevengods.playerId')).toBeNull()
    // 新しい公開IDは旧IDとは無関係
    expect(identity.playerId).not.toBe(legacy)
    expect(identity.playerSecret).not.toBe(legacy)
    expect(identity.playerId).toBe(await derivePlayerId(identity.playerSecret))
  })

  it('移行は一度だけで、その後は安定する', async () => {
    localStorage.setItem('sevengods.playerId', 'b'.repeat(RULES.ranking.playerIdLength))
    const first = await getAnonymousIdentity()
    const second = await getAnonymousIdentity()
    expect(second.playerSecret).toBe(first.playerSecret)
  })

  it('旧キーが無ければ何も壊さない', async () => {
    const first = await getAnonymousIdentity()
    expect(hasLegacyAnonymousId()).toBe(false)
    expect((await getAnonymousIdentity()).playerSecret).toBe(first.playerSecret)
  })
})

describe('startRankedRun：開始（枠の予約）', () => {
  it('kill switchがoffの間は通信せず、ランキング対象外として返す', async () => {
    const transport = vi.fn()
    const result = await startRankedRun(createClientRunId(), {
      transport: transport as unknown as RankingTransport,
    })
    expect(result).toEqual({ ranked: false, reason: 'disabled' })
    expect(transport).not.toHaveBeenCalled()
    expect(loadTicket()).toBeNull()
  })

  it('成功すると ticket を返し、**返す前に**控えてある', async () => {
    await withSubmissionEnabled(async () => {
      const store = createMemoryRankingStore()
      const clientRunId = createClientRunId()
      const result = await startFor(clientRunId, loopback(store))
      expect(result.ranked).toBe(true)
      if (!result.ranked) return
      expect(result.ticket.dailyKey).toBe(DAILY_KEY)
      expect(result.ticket.attemptNo).toBe(1)
      expect(result.ticket.gameVersion).toBe(getGameVersion())
      // 保存済み（START_GAME より前に控えが取れている）
      expect(loadTicket()).toEqual(result.ticket)
    })
  })

  it('同じclientRunIdで再試行しても枠は増えない（通信断のretry）', async () => {
    await withSubmissionEnabled(async () => {
      const store = createMemoryRankingStore()
      const transport = loopback(store)
      const clientRunId = createClientRunId()
      const first = await startFor(clientRunId, transport)
      const retry = await startFor(clientRunId, transport)
      expect(first.ranked && retry.ranked).toBe(true)
      if (!first.ranked || !retry.ranked) return
      expect(retry.ticket.attemptNo).toBe(first.ticket.attemptNo)
      const identity = await getAnonymousIdentity()
      expect((await store.listTickets(DAILY_KEY, identity.playerId)).length).toBe(1)
    })
  })

  it('枠を使い切ると attempts-exceeded を返す（ゲームは遊べる）', async () => {
    await withSubmissionEnabled(async () => {
      const store = createMemoryRankingStore()
      const transport = loopback(store)
      for (let i = 0; i < RULES.daily.attemptsPerDay; i++) {
        expect((await startFor(createClientRunId(), transport)).ranked).toBe(true)
      }
      const extra = await startFor(createClientRunId(), transport)
      expect(extra).toEqual({ ranked: false, reason: 'attempts-exceeded' })
    })
  })

  it('サーバー障害・想定外の応答はランキング対象外として扱う（例外を投げない）', async () => {
    await withSubmissionEnabled(async () => {
      const offline: RankingTransport = async () => {
        throw new Error('offline')
      }
      expect(await startRankedRun(createClientRunId(), { transport: offline })).toEqual({
        ranked: false,
        reason: 'unavailable',
      })

      const broken: RankingTransport = async () => ({ status: 500, json: async () => ({}) })
      expect(await startRankedRun(createClientRunId(), { transport: broken })).toEqual({
        ranked: false,
        reason: 'unavailable',
      })

      // 200だが中身が壊れている場合も対象外（控えも作らない）
      clearTicket()
      const garbage: RankingTransport = async () => ({ status: 200, json: async () => ({ nope: 1 }) })
      expect(await startRankedRun(createClientRunId(), { transport: garbage })).toEqual({
        ranked: false,
        reason: 'unavailable',
      })
      expect(loadTicket()).toBeNull()
    })
  })

  it('版が固定された日は version-locked を返す', async () => {
    await withSubmissionEnabled(async () => {
      const locked: RankingTransport = async () => ({ status: 423, json: async () => ({}) })
      expect(await startRankedRun(createClientRunId(), { transport: locked })).toEqual({
        ranked: false,
        reason: 'version-locked',
      })
    })
  })

  it('★秘密はbodyにのみ載り、URLには出ない', async () => {
    await withSubmissionEnabled(async () => {
      const seen: { url: string; body: string }[] = []
      const transport: RankingTransport = async (url, init) => {
        seen.push({ url, body: init.body })
        return { status: 503, json: async () => ({}) }
      }
      await startRankedRun(createClientRunId(), { transport })
      const identity = await getAnonymousIdentity()
      expect(seen[0].url).not.toContain(identity.playerSecret)
      expect(seen[0].url).not.toContain('playerSecret')
      expect(seen[0].body).toContain(identity.playerSecret)
    })
  })

  it('控えた ticket の残り時間は端末時計がずれていても正しい', async () => {
    await withSubmissionEnabled(async () => {
      const store = createMemoryRankingStore()
      // 端末時計が1時間進んでいる状況で受け取る
      const deviceNow = NOW + 60 * 60_000
      const result = await startRankedRun(createClientRunId(), {
        transport: loopback(store),
        now: deviceNow,
      })
      expect(result.ranked).toBe(true)
      if (!result.ranked) return
      // サーバー基準では TTL いっぱい残っている
      expect(remainingMs(result.ticket, deviceNow)).toBe(RULES.ranking.ticketTtlMinutes * 60_000)
    })
  })
})

describe('提出payload', () => {
  it('playerId・playerSecret・clientRunId・ReplayInput だけを送る', async () => {
    enqueueOne()
    const run = loadPendingRuns()[0]
    const payload = buildSubmitPayload(run, await getAnonymousIdentity())
    expect(new Set(Object.keys(payload))).toEqual(
      new Set(['playerId', 'playerSecret', 'clientRunId', 'input']),
    )
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
      const transport = loopback(store)

      // 本番と同じ順序：開始（枠の予約）→ 対局 → 提出 を2回まわす
      await playRanked(transport)
      const result = await flushPendingRuns({ transport })
      expect(result.status).toBe('done')
      if (result.status !== 'done') return
      expect(result.accepted).toBe(1)
      expect(result.failed).toBe(0)
      expect(loadPendingRuns()).toEqual([])

      await playRanked(transport)
      const again = await flushPendingRuns({ transport })
      expect(again.status === 'done' && again.accepted).toBe(1)
      expect(loadPendingRuns()).toEqual([])

      // サーバー側にはスコアが検証済みの値として保存されている
      const runs = await store.listDayRuns(DAILY_KEY)
      expect(runs.length).toBe(2)
      expect(runs.every((r) => typeof r.score === 'number' && r.score > 0)).toBe(true)
      // 全runが同じ匿名IDに紐づく（同じ端末＝1人）
      expect(new Set(runs.map((r) => r.playerId)).size).toBe(1)
      // 秘密は保存されていない
      expect(JSON.stringify(runs)).not.toContain((await getAnonymousIdentity()).playerSecret)
    })
  })

  it('★決着済みで未送信のrunは、次の挑戦を始める前に自動で送られる', async () => {
    await withSubmissionEnabled(async () => {
      const store = createMemoryRankingStore()
      const transport = loopback(store)

      // 1回目：枠を取って遊び切ったが、通信が途切れて提出できていない
      const first = await playRanked(transport)
      expect(loadPendingRuns().length).toBe(1)

      // 2回目を始める。ここで1回目が自動的に送られるので、
      // 1回目のticketは abandoned ではなく submitted になる
      const second = await playRanked(transport)
      expect(second.started.ranked).toBe(true)

      const stored = await store.listDayRuns(DAILY_KEY)
      expect(stored.length, '1回目の結果が失われている').toBe(1)
      expect(stored[0].clientRunId).toBe(first.clientRunId)
      if (second.started.ranked) expect(second.started.ticket.attemptNo).toBe(2)
    })
  })

  it('★開始していないrunは受理されない（提出だけで枠を作れない）', async () => {
    await withSubmissionEnabled(async () => {
      const store = createMemoryRankingStore()
      const transport = loopback(store)
      enqueueOne()
      const result = await flushPendingRuns({ transport })
      expect(result.status).toBe('done')
      if (result.status === 'done') {
        expect(result.accepted).toBe(0)
        expect(result.errors[0]).toContain('404')
      }
      expect((await store.listDayRuns(DAILY_KEY)).length).toBe(0)
      // 恒久的な拒否なので控えからは消える（何度送っても通らないため）
      expect(loadPendingRuns()).toEqual([])
    })
  })

  it('再送しても同じclientRunIdなので二重登録にならない', async () => {
    await withSubmissionEnabled(async () => {
      const store = createMemoryRankingStore()
      const transport = loopback(store)

      const { clientRunId: id } = await playRanked(transport)
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
      expect(await store.countAttempts(DAILY_KEY, await getAnonymousPlayerId())).toBe(1)
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
      await startRankedRun(createClientRunId())
      expect(spy).not.toHaveBeenCalled()
    } finally {
      ;(globalThis as { fetch: unknown }).fetch = real
    }
  })
})
