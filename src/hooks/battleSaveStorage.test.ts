import { beforeEach, describe, expect, it } from 'vitest'
import { clearBattleSave, loadBattleSave, migrateBattleSaveV3, saveBattle } from './battleSaveStorage'
import { startTestGame } from '../core/engine/testUtils'
import type { GameState } from '../core/types'
import { RULES } from '../core/data/rules'

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

/** saveVersion 3時代のセーブ（旧ScoreState・masteryなし）を再現する */
function buildV3Payload(overrides: { apEfficiency?: number; oracleBonus?: number } = {}) {
  const modern = startTestGame('save-v3')
  // v3にはmasteryフィールドが存在せず、scoreは旧5項目構造
  const { mastery: _mastery, ...rest } = modern
  const apEfficiency = overrides.apEfficiency ?? -4
  const oracleBonus = overrides.oracleBonus ?? 208
  const v3State = {
    ...rest,
    version: 3,
    score: {
      damage: 40,
      combo: 20,
      apEfficiency,
      roundBonus: 0,
      oracleBonus,
      total: 40 + 20 + apEfficiency + 0 + oracleBonus,
    },
  }
  return { version: 3, state: v3State }
}

describe('battleSaveStorage（saveVersion 4・STEP-SCORE2-D-PROTO）', () => {
  it('現行バージョンのセーブ／ロードでmastery集計も維持される（resume継続性）', () => {
    const base = startTestGame('save-v4')
    const withMastery: GameState = {
      ...base,
      mastery: { roundDamage: 8, bestRoundDamage: 33 },
    }
    saveBattle(withMastery)
    const loaded = loadBattleSave()
    expect(loaded).not.toBeNull()
    expect(loaded?.version).toBe(RULES.saveVersion)
    // resume後もMastery集計（1ラウンド最大実効ダメージ）は失われない
    expect(loaded?.mastery).toEqual({ roundDamage: 8, bestRoundDamage: 33 })
    expect(loaded?.score.total).toBe(withMastery.score.total)
  })

  it('v3セーブは破棄せず移行して読み込む（旧式スコアはlegacyへ畳み込み、totalの連続性を保つ）', () => {
    const payload = buildV3Payload()
    localStorage.setItem('sevengods.battleSave', JSON.stringify(payload))

    const loaded = loadBattleSave()
    expect(loaded).not.toBeNull()
    expect(loaded?.version).toBe(RULES.saveVersion)
    // damage/comboは引き継ぎ、apEfficiency(-4)+oracleBonus(208)+roundBonus(0)=204がlegacyへ
    expect(loaded?.score.damage).toBe(40)
    expect(loaded?.score.combo).toBe(20)
    expect(loaded?.score.legacy).toBe(204)
    expect(loaded?.score.victory).toBe(0)
    expect(loaded?.score.total).toBe(40 + 20 + 204)
    // v3にはMastery集計が無いため0から開始する（既知の1戦限りの制約）
    expect(loaded?.mastery).toEqual({ roundDamage: 0, bestRoundDamage: 0 })
  })

  it('migrateBattleSaveV3はtotal＝damage+combo+legacyになるよう再構成する', () => {
    const payload = buildV3Payload({ apEfficiency: -10, oracleBonus: 100 })
    const migrated = migrateBattleSaveV3(payload.state as unknown as GameState)
    expect(migrated.score.legacy).toBe(90)
    expect(migrated.score.total).toBe(40 + 20 + 90)
    expect(migrated.version).toBe(RULES.saveVersion)
  })

  it('未知のバージョン（v2以前・将来版）はnull（読み込まない）', () => {
    const payload = buildV3Payload()
    localStorage.setItem('sevengods.battleSave', JSON.stringify({ ...payload, version: 99 }))
    expect(loadBattleSave()).toBeNull()
    localStorage.setItem('sevengods.battleSave', JSON.stringify({ ...payload, version: 2 }))
    expect(loadBattleSave()).toBeNull()
  })

  it('決着済み（status!=playing）のv4セーブは読み込まない（既存仕様の維持）', () => {
    const base = startTestGame('save-done')
    const done = { ...base, status: 'won' as const }
    localStorage.setItem(
      'sevengods.battleSave',
      JSON.stringify({ version: RULES.saveVersion, state: done }),
    )
    expect(loadBattleSave()).toBeNull()
  })
})
