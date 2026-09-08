import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RULES } from '../core/data/rules'
import { dailyKeyOf } from '../core/data/dailyBoss'
import { createMemoryRankingStore, handleRankingRequest } from '../server/ranking'
import { createClientRunId } from './clientRunId'
import { prepareDailyStart, rankedStartNotice, unrankedMessage } from './dailySessionStart'
import type { RankingTransport } from './rankingClient'
import {
  clearTicket,
  isTicketExpired,
  loadTicket,
  loadTicketFor,
  remainingMs,
  saveTicket,
  type StoredTicket,
} from './rankingTicketStorage'

/**
 * Phase 4.6（決定139 §12）：ticketの控えと、挑戦開始の段取り。
 *
 * ★ここで守る性質
 *   1. ticketは**START_GAMEより前に**控えられている（クラッシュしても枠を辿れる）
 *   2. 端末時計がずれていても残り時間はサーバー基準で正しい
 *   3. サーバーが落ちていてもゲームは始められる（ランキング対象外になるだけ）
 *   4. 枠を使い切っているときだけ開始を止める
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

const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAILY_KEY = dailyKeyOf(new Date(NOW))

function sampleTicket(overrides: Partial<StoredTicket> = {}): StoredTicket {
  return {
    dailyKey: DAILY_KEY,
    clientRunId: createClientRunId(),
    attemptNo: 1,
    expiresAt: NOW + RULES.ranking.ticketTtlMinutes * 60_000,
    gameVersion: '1.abcdef0123456789',
    serverNow: NOW,
    receivedAt: NOW,
    ...overrides,
  }
}

async function withSubmissionEnabled<T>(fn: () => Promise<T>): Promise<T> {
  const spy = vi.spyOn(RULES.ranking, 'submissionEnabled', 'get').mockReturnValue(true as never)
  try {
    return await fn()
  } finally {
    spy.mockRestore()
  }
}

function loopback(store: ReturnType<typeof createMemoryRankingStore>): RankingTransport {
  return async (url, init) => {
    const response = await handleRankingRequest(
      { method: init.method, path: url, body: JSON.parse(init.body) },
      { store, now: NOW },
    )
    return { status: response.status, json: async () => response.body }
  }
}

beforeEach(() => {
  ;(globalThis as { localStorage: Storage }).localStorage = new MemoryStorage()
})

describe('ticketの控え', () => {
  it('保存して読み戻せる', () => {
    const ticket = sampleTicket()
    saveTicket(ticket)
    expect(loadTicket()).toEqual(ticket)
  })

  it('壊れた保存値・版違いはnullとして扱う（ゲームは壊さない）', () => {
    localStorage.setItem('sevengods.rankingTicket', 'not json')
    expect(loadTicket()).toBeNull()

    localStorage.setItem('sevengods.rankingTicket', JSON.stringify({ version: 999, ticket: sampleTicket() }))
    expect(loadTicket()).toBeNull()

    localStorage.setItem(
      'sevengods.rankingTicket',
      JSON.stringify({ version: 1, ticket: { dailyKey: DAILY_KEY } }),
    )
    expect(loadTicket()).toBeNull()
  })

  it('別のrun・別の日のticketは取り違えない', () => {
    const ticket = sampleTicket()
    saveTicket(ticket)
    expect(loadTicketFor(ticket.clientRunId, ticket.dailyKey)).toEqual(ticket)
    expect(loadTicketFor(createClientRunId(), ticket.dailyKey)).toBeNull()
    expect(loadTicketFor(ticket.clientRunId, '2026-09-10')).toBeNull()
  })

  it('消せる', () => {
    saveTicket(sampleTicket())
    clearTicket()
    expect(loadTicket()).toBeNull()
  })

  it('localStorageが使えなくても例外を投げない', () => {
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
    expect(() => saveTicket(sampleTicket())).not.toThrow()
    expect(loadTicket()).toBeNull()
    expect(() => clearTicket()).not.toThrow()
  })

  it('★残り時間は端末時計のずれを補正する', () => {
    const ttl = RULES.ranking.ticketTtlMinutes * 60_000
    // 端末時計が3時間進んでいる状態で受け取った ticket
    const skewed = sampleTicket({ serverNow: NOW, receivedAt: NOW + 3 * 60 * 60_000 })
    expect(remainingMs(skewed, NOW + 3 * 60 * 60_000)).toBe(ttl)
    expect(isTicketExpired(skewed, NOW + 3 * 60 * 60_000)).toBe(false)
    // 端末時計基準で TTL ぶん進めば期限切れ
    expect(isTicketExpired(skewed, NOW + 3 * 60 * 60_000 + ttl + 1)).toBe(true)
  })

  it('端末時計が遅れていても同じく正しい', () => {
    const ttl = RULES.ranking.ticketTtlMinutes * 60_000
    const skewed = sampleTicket({ serverNow: NOW, receivedAt: NOW - 90 * 60_000 })
    expect(remainingMs(skewed, NOW - 90 * 60_000)).toBe(ttl)
  })
})

describe('prepareDailyStart：開始の段取り', () => {
  it('kill switchがoffなら通信せず、ランキング対象外として始められる', async () => {
    const plan = await prepareDailyStart(DAILY_KEY)
    expect(plan.blocked).toBe(false)
    expect(plan.unrankedReason).toBe('disabled')
    expect(plan.session?.ranked).toBe(false)
    expect(plan.dailyKey).toBe(DAILY_KEY)
    // 控えは作られない
    expect(loadTicket()).toBeNull()
  })

  it('★成功すると ranked になり、ticketが控えられている（START_GAMEより前）', async () => {
    await withSubmissionEnabled(async () => {
      const store = createMemoryRankingStore()
      const plan = await prepareDailyStart(DAILY_KEY, { transport: loopback(store), now: NOW })
      expect(plan.unrankedReason).toBeNull()
      expect(plan.blocked).toBe(false)
      expect(plan.session).toEqual({ clientRunId: expect.any(String), ranked: true })
      // サーバーが決めた日付を使う
      expect(plan.dailyKey).toBe(DAILY_KEY)
      // 控えが既にある＝この時点でクラッシュしても枠を辿れる
      const stored = loadTicket()
      expect(stored?.clientRunId).toBe(plan.session?.clientRunId)
      expect(stored?.attemptNo).toBe(1)
    })
  })

  it('★サーバーが落ちていてもゲームは始められる（ランキング対象外）', async () => {
    await withSubmissionEnabled(async () => {
      const offline: RankingTransport = async () => {
        throw new Error('offline')
      }
      const plan = await prepareDailyStart(DAILY_KEY, { transport: offline })
      expect(plan.blocked, 'サーバー障害でゲームを止めてはいけない').toBe(false)
      expect(plan.unrankedReason).toBe('unavailable')
      expect(plan.session?.ranked).toBe(false)
      expect(plan.dailyKey).toBe(DAILY_KEY)
    })
  })

  it('★枠を使い切っているときだけ開始を止める', async () => {
    await withSubmissionEnabled(async () => {
      const store = createMemoryRankingStore()
      const transport = loopback(store)
      for (let i = 0; i < RULES.daily.attemptsPerDay; i++) {
        const plan = await prepareDailyStart(DAILY_KEY, { transport, now: NOW })
        expect(plan.blocked).toBe(false)
      }
      const blocked = await prepareDailyStart(DAILY_KEY, { transport, now: NOW })
      expect(blocked.blocked).toBe(true)
      expect(blocked.unrankedReason).toBe('attempts-exceeded')
    })
  })

  it('更新直後（version-locked）は止めずにランキング対象外で遊べる', async () => {
    await withSubmissionEnabled(async () => {
      const locked: RankingTransport = async () => ({ status: 423, json: async () => ({}) })
      const plan = await prepareDailyStart(DAILY_KEY, { transport: locked })
      expect(plan.blocked).toBe(false)
      expect(plan.unrankedReason).toBe('version-locked')
    })
  })

  it('日付が変わっていたらサーバーの日付を採用する', async () => {
    await withSubmissionEnabled(async () => {
      const store = createMemoryRankingStore()
      // 端末は前日だと思っているが、サーバーは既に翌日
      const transport: RankingTransport = async (url, init) => {
        const response = await handleRankingRequest(
          { method: init.method, path: url, body: JSON.parse(init.body) },
          { store, now: Date.parse('2026-09-09T15:00:00Z') },
        )
        return { status: response.status, json: async () => response.body }
      }
      const plan = await prepareDailyStart('2026-09-09', { transport, now: NOW })
      expect(plan.unrankedReason).toBeNull()
      expect(plan.dailyKey, 'サーバー時刻の日付を使う').toBe('2026-09-10')
    })
  })
})

describe('プレイヤーへの文言', () => {
  it('ランキング対象外の理由をすべて説明できる', () => {
    for (const reason of ['disabled', 'unavailable', 'attempts-exceeded', 'version-locked', 'identity'] as const) {
      const text = unrankedMessage(reason)
      expect(text.length).toBeGreaterThan(0)
      // 接続情報・内部用語を露出しない
      expect(text).not.toMatch(/http|postgres|null|undefined|Error/i)
    }
  })

  it('開始前の注意に「戻らない」条件が書いてある', () => {
    const text = rankedStartNotice(2)
    expect(text).toContain('残り2回')
    expect(text).toContain('戻りません')
    expect(text).toContain(String(RULES.ranking.ticketTtlMinutes))
  })
})
