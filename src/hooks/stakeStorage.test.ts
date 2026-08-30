import { beforeEach, describe, expect, it } from 'vitest'
import type { GameState } from '../core/types'
import { applyAction } from '../core/engine'
import { STARTER_DECK } from '../core/data/decks'
import { ENEMY_IDS } from '../core/data/enemies'
import { GOD_IDS } from '../core/data/gods'
import { RULES } from '../core/data/rules'
import { isStakeUnlocked, loadGodStakeRecord, maxSelectableStake, recordStakeResult } from './stakeStorage'

/** vitestの既定環境（node）にはlocalStorageが無いため、最小限のメモリ実装で代用する */
class MemoryStorage implements Storage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  clear() {
    this.map.clear()
  }
  getItem(key: string) {
    return this.map.get(key) ?? null
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  setItem(key: string, value: string) {
    this.map.set(key, value)
  }
}

function startState(extra: { stake?: number; difficulty?: 'easy' | 'normal' | 'hard' } = {}): GameState {
  return applyAction(null, {
    type: 'START_GAME',
    seed: 'stake-storage-test',
    godId: GOD_IDS.ebisu,
    enemyId: ENEMY_IDS.trial,
    deck: STARTER_DECK,
    difficulty: extra.difficulty ?? 'normal',
    ...(extra.stake ? { stake: extra.stake } : {}),
  }).state
}

const ended = (state: GameState, status: GameState['status'], total = 500): GameState => ({
  ...state,
  status,
  score: { ...state.score, total },
})

describe('stakeStorage (決定126)', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true })
  })

  it('starts locked: no record, max selectable 0', () => {
    expect(loadGodStakeRecord(GOD_IDS.ebisu)).toEqual({ hardCleared: false, maxCleared: 0, bestByStake: {} })
    expect(isStakeUnlocked(GOD_IDS.ebisu)).toBe(false)
    expect(maxSelectableStake(GOD_IDS.ebisu)).toBe(0)
  })

  it('a hard win unlocks stake Ⅰ for that god only', () => {
    const r = recordStakeResult(ended(startState({ difficulty: 'hard' }), 'won'))
    expect(r?.hardClearedNow).toBe(true)
    expect(isStakeUnlocked(GOD_IDS.ebisu)).toBe(true)
    expect(maxSelectableStake(GOD_IDS.ebisu)).toBe(1)
    expect(isStakeUnlocked(GOD_IDS.taiyo)).toBe(false)
  })

  it('a hard loss or a normal win does not unlock', () => {
    recordStakeResult(ended(startState({ difficulty: 'hard' }), 'lost'))
    recordStakeResult(ended(startState({ difficulty: 'normal' }), 'won'))
    expect(isStakeUnlocked(GOD_IDS.ebisu)).toBe(false)
  })

  it('clearing a stake raises maxCleared and opens the next level (capped at Ⅶ)', () => {
    recordStakeResult(ended(startState({ difficulty: 'hard' }), 'won'))
    const r1 = recordStakeResult(ended(startState({ stake: 1 }), 'won', 600))
    expect(r1?.clearedNew).toBe(true)
    expect(maxSelectableStake(GOD_IDS.ebisu)).toBe(2)
    // 段を飛ばしたクリアも到達として記録される
    recordStakeResult(ended(startState({ stake: 7 }), 'won', 600))
    expect(loadGodStakeRecord(GOD_IDS.ebisu).maxCleared).toBe(7)
    expect(maxSelectableStake(GOD_IDS.ebisu)).toBe(7)
  })

  it('records the best score per stake with the stake scale, for losses too, and never lowers it', () => {
    recordStakeResult(ended(startState({ stake: 3 }), 'won', 600))
    const scale = 1 + RULES.stakes.scoreScalePerLevel * 3
    const expected = Math.round(600 * RULES.score.finalScale * scale)
    expect(loadGodStakeRecord(GOD_IDS.ebisu).bestByStake['3']).toBe(expected)
    const lower = recordStakeResult(ended(startState({ stake: 3 }), 'lost', 100))
    expect(lower?.isNewStakeBest).toBe(false)
    expect(lower?.prevStakeBest).toBe(expected)
    expect(loadGodStakeRecord(GOD_IDS.ebisu).bestByStake['3']).toBe(expected)
    // 敗北でも maxCleared は上がらない
    expect(loadGodStakeRecord(GOD_IDS.ebisu).maxCleared).toBe(3)
  })

  it('ignores playing states and daily mode', () => {
    expect(recordStakeResult(startState({ stake: 2 }))).toBeNull()
    const daily: GameState = { ...ended(startState({ stake: 2 }), 'won'), mode: 'daily' }
    expect(recordStakeResult(daily)).toBeNull()
    expect(loadGodStakeRecord(GOD_IDS.ebisu).maxCleared).toBe(0)
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('sevengods.stakes', '{not json')
    expect(loadGodStakeRecord(GOD_IDS.ebisu).maxCleared).toBe(0)
    expect(() => recordStakeResult(ended(startState({ stake: 1 }), 'won'))).not.toThrow()
  })
})
