import { beforeEach, describe, expect, it } from 'vitest'
import { clearBattleSave, loadBattleSave, saveBattle } from './battleSaveStorage'
import { startTestGame } from '../core/engine/testUtils'

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

describe('battleSaveStorage', () => {
  it('returns null when nothing has been saved yet', () => {
    expect(loadBattleSave()).toBeNull()
  })

  it('saves and loads a playing GameState', () => {
    const state = startTestGame()
    saveBattle(state)
    expect(loadBattleSave()).toEqual(state)
  })

  it('does not save a finished GameState (status !== playing)', () => {
    const state = { ...startTestGame(), status: 'won' as const }
    saveBattle(state)
    expect(loadBattleSave()).toBeNull()
  })

  it('clearBattleSave removes the saved battle', () => {
    saveBattle(startTestGame())
    clearBattleSave()
    expect(loadBattleSave()).toBeNull()
  })

  it('does not throw when localStorage is unavailable (private browsing etc.)', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
    expect(() => saveBattle(startTestGame())).not.toThrow()
    expect(loadBattleSave()).toBeNull()
  })

  it('ignores malformed saved data', () => {
    localStorage.setItem('sevengods.battleSave', '{not valid json')
    expect(loadBattleSave()).toBeNull()
  })
})
