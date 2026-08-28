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
      mastery: {
        roundDamage: 8,
        bestRoundDamage: 33,
        attackCount: 4,
        reductionRateSum: 2.5,
        strongNeutralized: true,
        guardAttackCount: 5,
        fullyBlockedCount: 3,
      },
    }
    saveBattle(withMastery)
    const loaded = loadBattleSave()
    expect(loaded).not.toBeNull()
    expect(loaded?.version).toBe(RULES.saveVersion)
    // resume後もMastery集計（大耀・寿楽・蒼毘とも）は失われない
    expect(loaded?.mastery).toEqual({
      roundDamage: 8,
      bestRoundDamage: 33,
      attackCount: 4,
      reductionRateSum: 2.5,
      strongNeutralized: true,
      guardAttackCount: 5,
      fullyBlockedCount: 3,
    })
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
    expect(loaded?.mastery).toEqual({
      roundDamage: 0,
      bestRoundDamage: 0,
      attackCount: 0,
      reductionRateSum: 0,
      strongNeutralized: false,
      guardAttackCount: 0,
      fullyBlockedCount: 0,
    })
  })

  it('migrateBattleSaveV3はtotal＝damage+combo+legacyになるよう再構成する', () => {
    const payload = buildV3Payload({ apEfficiency: -10, oracleBonus: 100 })
    const migrated = migrateBattleSaveV3(payload.state as unknown as GameState)
    expect(migrated.score.legacy).toBe(90)
    expect(migrated.score.total).toBe(40 + 20 + 90)
    expect(migrated.version).toBe(RULES.saveVersion)
  })

  it('v4セーブは破棄せず移行して読み込む（大耀値保持・寿楽フィールドはdefault-fill・スコア不変）', () => {
    // v4形式：masteryは大耀用2フィールドのみ
    const modern = startTestGame('save-v4-mig')
    const v4State = {
      ...modern,
      version: 4,
      mastery: { roundDamage: 8, bestRoundDamage: 33 },
    }
    localStorage.setItem(
      'sevengods.battleSave',
      JSON.stringify({ version: 4, state: v4State }),
    )
    const loaded = loadBattleSave()
    expect(loaded).not.toBeNull()
    expect(loaded?.version).toBe(RULES.saveVersion)
    // 大耀の集計は保持、寿楽・蒼毘の新フィールドはdefault
    expect(loaded?.mastery).toEqual({
      roundDamage: 8,
      bestRoundDamage: 33,
      attackCount: 0,
      reductionRateSum: 0,
      strongNeutralized: false,
      guardAttackCount: 0,
      fullyBlockedCount: 0,
    })
    // 移行でBattle Scoreは一切変わらない
    expect(loaded?.score).toEqual(modern.score)
  })

  it('v5セーブは破棄せず移行して読み込む（大耀・寿楽値保持・蒼毘フィールドはdefault-fill・スコア不変）', () => {
    // v5形式：masteryは大耀2＋寿楽3の5フィールドのみ
    const modern = startTestGame('save-v5-mig')
    const v5State = {
      ...modern,
      version: 5,
      mastery: {
        roundDamage: 8,
        bestRoundDamage: 33,
        attackCount: 4,
        reductionRateSum: 2.5,
        strongNeutralized: true,
      },
    }
    localStorage.setItem(
      'sevengods.battleSave',
      JSON.stringify({ version: 5, state: v5State }),
    )
    const loaded = loadBattleSave()
    expect(loaded).not.toBeNull()
    expect(loaded?.version).toBe(RULES.saveVersion)
    expect(loaded?.mastery).toEqual({
      roundDamage: 8,
      bestRoundDamage: 33,
      attackCount: 4,
      reductionRateSum: 2.5,
      strongNeutralized: true,
      guardAttackCount: 0,
      fullyBlockedCount: 0,
    })
    expect(loaded?.score).toEqual(modern.score)
  })

  it('v6セーブは破棄せず移行して読み込む（HP/deck/round/score/Mastery全保持・intent正規化のみ）', () => {
    // ENEMY-IDENTITY-PROTOTYPE-02：v7はstate構造不変（intentの取りうる形が増えただけ）。
    const modern = startTestGame('save-v6-mig')
    const v6State = {
      ...modern,
      version: 6,
      mastery: {
        roundDamage: 8,
        bestRoundDamage: 33,
        attackCount: 4,
        reductionRateSum: 2.5,
        strongNeutralized: true,
        guardAttackCount: 3,
        fullyBlockedCount: 2,
      },
      enemy: { ...modern.enemy, intent: { kind: 'attack' as const, amount: 12 } },
    }
    localStorage.setItem('sevengods.battleSave', JSON.stringify({ version: 6, state: v6State }))
    const loaded = loadBattleSave()
    expect(loaded).not.toBeNull()
    expect(loaded?.version).toBe(RULES.saveVersion)
    // 旧来の正当なintent（attack/charge）はそのまま保持される
    expect(loaded?.enemy.intent).toEqual({ kind: 'attack', amount: 12 })
    expect(loaded?.mastery).toEqual(v6State.mastery)
    expect(loaded?.score).toEqual(modern.score)
    expect(loaded?.player.hp).toBe(modern.player.hp)
    expect(loaded?.round).toBe(modern.round)
    expect(loaded?.deck).toEqual(modern.deck)
    expect(loaded?.godId).toBe(modern.godId)
  })

  it('v6セーブの未知kindのintentはnullへ正規化される（進行不能を防ぐ・runEnemyTurnが再導出）', () => {
    const modern = startTestGame('save-v6-badintent')
    const v6State = {
      ...modern,
      version: 6,
      enemy: { ...modern.enemy, intent: { kind: 'mystery', foo: 1 } },
    }
    localStorage.setItem('sevengods.battleSave', JSON.stringify({ version: 6, state: v6State }))
    const loaded = loadBattleSave()
    expect(loaded).not.toBeNull()
    expect(loaded?.enemy.intent).toBeNull()
  })

  it('v3セーブはv3→…→v7へ連鎖移行され、現行バージョンで読み込まれる（経路維持）', () => {
    const payload = buildV3Payload()
    localStorage.setItem('sevengods.battleSave', JSON.stringify(payload))
    const loaded = loadBattleSave()
    expect(loaded).not.toBeNull()
    expect(loaded?.version).toBe(RULES.saveVersion)
    expect(RULES.saveVersion).toBe(7)
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
