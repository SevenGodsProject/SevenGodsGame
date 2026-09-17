import { beforeEach, describe, expect, it } from 'vitest'
import { loadDeckPreference, loadLastUsedGodId, saveDeckPreference } from './deckPreferenceStorage'
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

/** Phase 7 Entrance E1（決定193）：Home の Hero God 用の読み取り専用関数 */
describe('loadLastUsedGodId', () => {
  const snapshot = () => JSON.stringify(Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => [localStorage.key(i), localStorage.getItem(localStorage.key(i)!)])))

  it('何も保存されていなければ null', () => {
    expect(loadLastUsedGodId()).toBeNull()
  })

  it('最後にデッキを確定した神を返す（保存は常に 1 件の上書き）', () => {
    saveDeckPreference(GOD_IDS.ebisu, STARTER_DECK)
    saveDeckPreference(GOD_IDS.sobi, STARTER_DECK)
    expect(loadLastUsedGodId()).toBe(GOD_IDS.sobi)
  })

  it('未知の神 ID・版違い・壊れたデータは null（fallback は呼び出し側）', () => {
    localStorage.setItem('sevengods.deckPreference', JSON.stringify({ version: 9, godId: 'not_a_god', deck: [] }))
    expect(loadLastUsedGodId()).toBeNull()
    localStorage.setItem('sevengods.deckPreference', JSON.stringify({ version: 1, godId: GOD_IDS.taiyo, deck: [] }))
    expect(loadLastUsedGodId()).toBeNull()
    localStorage.setItem('sevengods.deckPreference', '{broken')
    expect(loadLastUsedGodId()).toBeNull()
  })

  it('読むだけで storage を 1 バイトも変えない（壊れたデータも直さない・消さない）', () => {
    localStorage.setItem('sevengods.deckPreference', JSON.stringify({ version: 9, godId: 'not_a_god', deck: [] }))
    const before = snapshot()
    loadLastUsedGodId()
    expect(snapshot()).toBe(before)
    saveDeckPreference(GOD_IDS.juraku, STARTER_DECK)
    const before2 = snapshot()
    expect(loadLastUsedGodId()).toBe(GOD_IDS.juraku)
    expect(snapshot()).toBe(before2)
  })

  it('localStorage が使えなくても投げない', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
    expect(() => loadLastUsedGodId()).not.toThrow()
    expect(loadLastUsedGodId()).toBeNull()
  })
})
