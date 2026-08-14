import { beforeEach, describe, expect, it } from 'vitest'
import { loadDeckPreference, saveDeckPreference } from './deckPreferenceStorage'
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

describe('deckPreferenceStorage', () => {
  it('returns null when nothing has been saved yet', () => {
    expect(loadDeckPreference(GOD_IDS.ebisu)).toBeNull()
  })

  it('saves and loads a deck for the same god', () => {
    saveDeckPreference(GOD_IDS.ebisu, STARTER_DECK)
    expect(loadDeckPreference(GOD_IDS.ebisu)).toEqual(STARTER_DECK)
  })

  it('returns null when a different god is asked (last save wins per slot)', () => {
    saveDeckPreference(GOD_IDS.ebisu, STARTER_DECK)
    expect(loadDeckPreference(GOD_IDS.taiyo)).toBeNull()
  })

  it('does not throw when localStorage is unavailable (private browsing etc.)', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
    expect(() => saveDeckPreference(GOD_IDS.ebisu, STARTER_DECK)).not.toThrow()
    expect(loadDeckPreference(GOD_IDS.ebisu)).toBeNull()
  })

  it('ignores malformed saved data', () => {
    localStorage.setItem('sevengods.deckPreference', '{not valid json')
    expect(loadDeckPreference(GOD_IDS.ebisu)).toBeNull()
  })
})
