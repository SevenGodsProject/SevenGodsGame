import { beforeEach, describe, expect, it } from 'vitest'
import type { EnemyId } from '../core/types'
import { ENEMY_IDS } from '../core/data/enemies'
import { startTestGame } from '../core/engine/testUtils'
import { saveBattle, loadBattleSave } from '../hooks/battleSaveStorage'
import { loadRecentDailyDays } from '../hooks/dailyStorage'
import { isKnownEnemyId, safeEnemyName, UNKNOWN_ENEMY_LABEL } from './enemyLookup'

/**
 * Post-P2 Hardening（決定191）：破損・改ざんされた保存データ（未知 enemyId）に対する耐性。
 *
 * 既存の `sevengods.battleSave`／`sevengods.daily` は保存前提の型形状しか検証していない
 * （`enemy.defId`／`day.enemyId` の値そのものは検証しない）。storage 層の検証を追加する
 * （＝storage schema を変更する）のではなく、storage 層はそのまま・UI 層で安全に受け取る、
 * という今回の方針を、実際の保存関数（`saveBattle`／既存の daily storage）を通して確認する。
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
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
})

const UNKNOWN_ID = 'enemy_does_not_exist' as EnemyId

describe('storage 層は enemyId の値を検証しない（意図的に不変。UI 層で吸収する）', () => {
  it('battleSave：未知 enemyId のまま保存・読み込みできる（storage は書き換えられていない）', () => {
    const state = { ...startTestGame('resilience'), enemy: { ...startTestGame('resilience').enemy, defId: UNKNOWN_ID } }
    saveBattle(state)
    const loaded = loadBattleSave()
    expect(loaded?.enemy.defId).toBe(UNKNOWN_ID)
  })

  it('battleSave：正常な enemyId は従来どおり保存・読み込みできる（回帰なし）', () => {
    const state = startTestGame('resilience-ok')
    saveBattle(state)
    const loaded = loadBattleSave()
    expect(loaded?.enemy.defId).toBe(state.enemy.defId)
  })
})

describe('safeEnemyName / isKnownEnemyId で、破損保存を読み込んだ後の表示を安全にできる', () => {
  it('未知 enemyId を含む battleSave を読み込んでも、表示ヘルパーは例外を投げず fallback を返す', () => {
    const state = { ...startTestGame('resilience-home'), enemy: { ...startTestGame('resilience-home').enemy, defId: UNKNOWN_ID } }
    saveBattle(state)
    const loaded = loadBattleSave()
    expect(loaded).not.toBeNull()
    expect(() => isKnownEnemyId(loaded!.enemy.defId)).not.toThrow()
    expect(isKnownEnemyId(loaded!.enemy.defId)).toBe(false)
    expect(safeEnemyName(loaded!.enemy.defId)).toBe(UNKNOWN_ENEMY_LABEL)
  })

  it('正常な enemyId を含む battleSave は、そのまま既知として扱われる', () => {
    const state = startTestGame('resilience-home-ok')
    saveBattle(state)
    const loaded = loadBattleSave()
    expect(isKnownEnemyId(loaded!.enemy.defId)).toBe(true)
    expect(safeEnemyName(loaded!.enemy.defId)).not.toBe(UNKNOWN_ENEMY_LABEL)
  })

  it('神域挑戦の直近記録に未知 enemyId が混在していても、safeEnemyName は各日を独立して安全に扱える', () => {
    const days: Record<string, unknown> = {
      '2026-09-10': { dateKey: '2026-09-10', enemyId: ENEMY_IDS.oni, seed: 's1', attemptsUsed: 1, results: [], bestScore: 0, bestGodId: null, bestByGod: {} },
      '2026-09-11': { dateKey: '2026-09-11', enemyId: UNKNOWN_ID, seed: 's2', attemptsUsed: 1, results: [], bestScore: 0, bestGodId: null, bestByGod: {} },
      '2026-09-12': { dateKey: '2026-09-12', enemyId: ENEMY_IDS.ryujin, seed: 's3', attemptsUsed: 1, results: [], bestScore: 0, bestGodId: null, bestByGod: {} },
    }
    localStorage.setItem('sevengods.daily', JSON.stringify({ version: 1, days }))
    const loaded = loadRecentDailyDays(10)
    expect(loaded).toHaveLength(3)
    // storage はそのまま返る（未知 ID を storage 層で書き換えていない）
    expect(loaded.find((d) => d.dateKey === '2026-09-11')?.enemyId).toBe(UNKNOWN_ID)
    // 表示ヘルパーへ渡す段階では、3 行とも例外を投げず、有効な行は名前が出て無効な行だけ fallback になる
    const names = loaded.map((d) => ({ date: d.dateKey, name: safeEnemyName(d.enemyId) }))
    expect(names).toEqual([
      { date: '2026-09-12', name: '蒼海の龍神' },
      { date: '2026-09-11', name: UNKNOWN_ENEMY_LABEL },
      { date: '2026-09-10', name: '業斧の鬼将' },
    ])
  })
})
