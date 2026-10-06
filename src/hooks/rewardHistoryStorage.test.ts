import { beforeEach, describe, expect, it } from 'vitest'
import {
  REWARD_HISTORY_STORAGE_KEY,
  REWARD_HISTORY_WINDOW,
  appendFifo,
  loadRewardHistory,
  pushDeclinedRewards,
  pushOfferedRewards,
} from './rewardHistoryStorage'
import { GOD_IDS } from '../core/data/gods'
import { CARD_IDS } from '../core/data/cards'

/** vitest の既定環境（node）には localStorage が無いため、`rewardStorage.test.ts` と同じメモリ実装で代用する */
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
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

const setStorage = (value: unknown) => {
  Object.defineProperty(globalThis, 'localStorage', { value, configurable: true })
}

beforeEach(() => {
  setStorage(new MemoryStorage())
})

const a = CARD_IDS.strike
const b = CARD_IDS.guard
const c = CARD_IDS.heal

describe('rewardHistoryStorage (決定267)', () => {
  it('H1: round-trips offered and declined per god', () => {
    pushOfferedRewards(GOD_IDS.taiyo, [a, b, c])
    pushDeclinedRewards(GOD_IDS.taiyo, [a, b, c])
    expect(loadRewardHistory(GOD_IDS.taiyo)).toEqual({ offered: [a, b, c], declined: [a, b, c] })
    expect(loadRewardHistory(GOD_IDS.ebisu)).toEqual({ offered: [], declined: [] })
  })

  it('H2: keeps only the newest 6 (FIFO) for offered and declined', () => {
    expect(REWARD_HISTORY_WINDOW).toBe(6)
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `card_${n}`)
    pushOfferedRewards(GOD_IDS.taiyo, ids.slice(0, 3) as never)
    pushOfferedRewards(GOD_IDS.taiyo, ids.slice(3, 6) as never)
    pushOfferedRewards(GOD_IDS.taiyo, ids.slice(6, 9) as never)
    expect(loadRewardHistory(GOD_IDS.taiyo).offered).toEqual(ids.slice(3, 9))
    expect(appendFifo([1, 2, 3, 4, 5, 6], [7, 8, 9], 6)).toEqual([4, 5, 6, 7, 8, 9])
    expect(appendFifo([], [1, 2], 6)).toEqual([1, 2])
  })

  it('H3: starts empty when the stored version differs (and leaves the raw data untouched)', () => {
    const raw = '{"version":2,"gods":{"taiyo":{"offered":["x"],"declined":[]}}}'
    localStorage.setItem(REWARD_HISTORY_STORAGE_KEY, raw)
    expect(loadRewardHistory(GOD_IDS.taiyo)).toEqual({ offered: [], declined: [] })
    expect(localStorage.getItem(REWARD_HISTORY_STORAGE_KEY)).toBe(raw)
  })

  it('H4: starts empty on malformed JSON or wrong shape', () => {
    localStorage.setItem(REWARD_HISTORY_STORAGE_KEY, '{not json')
    expect(loadRewardHistory(GOD_IDS.taiyo)).toEqual({ offered: [], declined: [] })
    localStorage.setItem(REWARD_HISTORY_STORAGE_KEY, '{"version":1,"gods":{"taiyo":{"offered":"x"}}}')
    expect(loadRewardHistory(GOD_IDS.taiyo)).toEqual({ offered: [], declined: [] })
  })

  it('H5: does not throw when localStorage is unavailable', () => {
    setStorage(undefined)
    expect(() => pushOfferedRewards(GOD_IDS.taiyo, [a])).not.toThrow()
    expect(() => pushDeclinedRewards(GOD_IDS.taiyo, [a])).not.toThrow()
    expect(loadRewardHistory(GOD_IDS.taiyo)).toEqual({ offered: [], declined: [] })
  })
})
