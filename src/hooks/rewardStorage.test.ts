import { beforeEach, describe, expect, it } from 'vitest'
import { addRewardBonus, loadRewardBonuses } from './rewardStorage'
import { GOD_IDS } from '../core/data/gods'
import { STARTER_DECK } from '../core/data/decks'

/** vitestの既定環境（node）にはlocalStorageが無いため、最小限のメモリ実装で代用する */
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

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  })
})

describe('rewardStorage (決定43)', () => {
  it('returns an empty map when nothing has been saved yet', () => {
    expect(loadRewardBonuses(GOD_IDS.ebisu).size).toBe(0)
  })

  it('adds a +1 bonus for the chosen card', () => {
    addRewardBonus(GOD_IDS.ebisu, STARTER_DECK[0])
    expect(loadRewardBonuses(GOD_IDS.ebisu).get(STARTER_DECK[0])).toBe(1)
  })

  it('stacks +1 each time the same card is picked again', () => {
    addRewardBonus(GOD_IDS.ebisu, STARTER_DECK[0])
    addRewardBonus(GOD_IDS.ebisu, STARTER_DECK[0])
    expect(loadRewardBonuses(GOD_IDS.ebisu).get(STARTER_DECK[0])).toBe(2)
  })

  it('keeps bonuses for different gods independent', () => {
    addRewardBonus(GOD_IDS.ebisu, STARTER_DECK[0])
    expect(loadRewardBonuses(GOD_IDS.taiyo).size).toBe(0)
  })

  it('keeps bonuses for multiple gods simultaneously (unlike the single-slot deck preference)', () => {
    addRewardBonus(GOD_IDS.ebisu, STARTER_DECK[0])
    addRewardBonus(GOD_IDS.taiyo, STARTER_DECK[1])
    expect(loadRewardBonuses(GOD_IDS.ebisu).get(STARTER_DECK[0])).toBe(1)
    expect(loadRewardBonuses(GOD_IDS.taiyo).get(STARTER_DECK[1])).toBe(1)
  })

  it('does not throw when localStorage is unavailable (private browsing etc.)', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
    expect(() => addRewardBonus(GOD_IDS.ebisu, STARTER_DECK[0])).not.toThrow()
    expect(loadRewardBonuses(GOD_IDS.ebisu).size).toBe(0)
  })

  it('ignores malformed saved data', () => {
    localStorage.setItem('sevengods.rewardBonuses', '{not valid json')
    expect(loadRewardBonuses(GOD_IDS.ebisu).size).toBe(0)
  })
})
