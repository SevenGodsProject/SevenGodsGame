import { describe, expect, it } from 'vitest'
import { ENEMIES, pickEnemyId } from './enemies'

describe('ENEMIES', () => {
  it('has a unique id per enemy', () => {
    const ids = ENEMIES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every enemy a positive HP, at least one action, and art', () => {
    for (const enemy of ENEMIES) {
      expect(enemy.maxHp).toBeGreaterThan(0)
      expect(enemy.actions.length).toBeGreaterThan(0)
      expect(enemy.art.length).toBeGreaterThan(0)
    }
  })

  it('gives every enemy at least one battle cry (決定40)', () => {
    for (const enemy of ENEMIES) {
      expect(enemy.battleCries.length).toBeGreaterThan(0)
      for (const line of enemy.battleCries) {
        expect(line.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('pickEnemyId', () => {
  it('is deterministic for the same seed', () => {
    expect(pickEnemyId('seed-1234')).toBe(pickEnemyId('seed-1234'))
  })

  it('only returns ids that exist in ENEMIES', () => {
    const validIds = new Set(ENEMIES.map((e) => e.id))
    for (const seed of ['a', 'seed-1', 'seed-2', 'seed-999999', 'こんにちは']) {
      expect(validIds.has(pickEnemyId(seed))).toBe(true)
    }
  })
})
