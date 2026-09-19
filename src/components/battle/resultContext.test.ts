import { beforeEach, describe, expect, it } from 'vitest'
import type { GameState } from '../../core/types'
import { GOD_IDS } from '../../core/data/gods'
import { ENEMY_IDS } from '../../core/data/enemies'
import { startTestGame } from '../../core/engine/testUtils'
import { recordGameResult } from '../../hooks/recordStorage'
import { recordMatchupClear } from '../../hooks/matchupStorage'
import { collectEarlyRead, collectResultContext } from './resultContext'
import { selectNextGoal } from './nextGoal'

/**
 * 決定206（Solve Legibility v1・A）：NR1 の判定材料は決着時の記録を **読むだけ** で集める。
 * 決着処理と同じ順（戦績→49 攻略→結果の入力集め）で実際の storage 関数を通し、
 * 「初陣に初めて勝ったときだけ 1 回」が既存の記録だけで成立することを固定する。
 */

class MemoryStorage implements Storage {
  store = new Map<string, string>()
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

let storage: MemoryStorage
beforeEach(() => {
  storage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
})

const NOW = new Date('2026-09-19T03:00:00Z')

/** 初陣（恵比寿×試練の影×ふつう×神階 0）の決着状態。`over` で構成を崩す */
function settled(over: Partial<GameState> = {}): GameState {
  const base = startTestGame('early-read')
  return { ...base, status: 'won', mode: 'normal', difficulty: 'normal', stake: 0, ...over }
}

/** 決着処理（useGameEngine）と同じ順に記録してから、結果の入力を読む */
function settle(state: GameState) {
  const rec = recordGameResult(state)
  recordMatchupClear(state, NOW.getTime())
  return collectResultContext(state, { newBest: rec.isNewBest, prevBest: rec.prevBest, stakeResult: null, dailyResult: null, otomoBondChange: null }, NOW)!
}

describe('collectEarlyRead（読むだけ）', () => {
  it('初陣に初めて勝った直後：初陣構成・通算 1 勝・魔獣未撃破 → NR1', () => {
    const ctx = settle(settled())
    expect(ctx.goalInput.earlyRead).toEqual({ isFirstBattleSetup: true, godWinsAfterThis: 1, targetCleared: false })
    expect(selectNextGoal({ ...ctx.goalInput, nowMs: NOW.getTime() }).id).toBe('NR1')
  })

  it('2 勝目は通算 2 → NR1 は出ない（新しい state を持たずに 1 回だけ）', () => {
    settle(settled())
    const ctx = settle(settled())
    expect(ctx.goalInput.earlyRead?.godWinsAfterThis).toBe(2)
    expect(selectNextGoal({ ...ctx.goalInput, nowMs: NOW.getTime() }).id).not.toBe('NR1')
  })

  it('魔獣を別の神で既に撃破していれば targetCleared=true → NR1 は出ない', () => {
    const juuma = settled({ godId: GOD_IDS.taiyo, enemy: { ...startTestGame('x').enemy, defId: ENEMY_IDS.juuma } })
    recordGameResult(juuma)
    recordMatchupClear(juuma, NOW.getTime())
    const ctx = settle(settled())
    expect(ctx.goalInput.earlyRead).toEqual({ isFirstBattleSetup: true, godWinsAfterThis: 1, targetCleared: true })
    expect(selectNextGoal({ ...ctx.goalInput, nowMs: NOW.getTime() }).id).not.toBe('NR1')
  })

  it('初陣構成でない（敵・難易度・神階・神が違う）と isFirstBattleSetup=false', () => {
    const s = startTestGame('x')
    expect(collectEarlyRead(settled({ enemy: { ...s.enemy, defId: ENEMY_IDS.oni } }), NOW).isFirstBattleSetup).toBe(false)
    expect(collectEarlyRead(settled({ difficulty: 'hard' }), NOW).isFirstBattleSetup).toBe(false)
    expect(collectEarlyRead(settled({ stake: 1 }), NOW).isFirstBattleSetup).toBe(false)
    expect(collectEarlyRead(settled({ godId: GOD_IDS.taiyo }), NOW).isFirstBattleSetup).toBe(false)
    expect(collectEarlyRead(settled(), NOW).isFirstBattleSetup).toBe(true)
  })

  it('敗北・未撃破では earlyRead を集めない（null）', () => {
    expect(settle(settled({ status: 'lost' })).goalInput.earlyRead).toBeNull()
    expect(settle(settled({ status: 'finished' })).goalInput.earlyRead).toBeNull()
  })

  it('神域挑戦（daily）の入力には earlyRead が無い', () => {
    const ctx = settle(settled({ mode: 'daily', dailyKey: '2026-09-19' }))
    expect(ctx.goalInput.mode).toBe('daily')
    expect('earlyRead' in ctx.goalInput).toBe(false)
  })

  it('storage が使えなくても例外にならず、targetCleared=false・wins=0 で返る', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') }, removeItem: () => {}, clear: () => {}, key: () => null, length: 0 },
      configurable: true,
    })
    const r = collectEarlyRead(settled(), NOW)
    expect(r).toEqual({ isFirstBattleSetup: true, godWinsAfterThis: 0, targetCleared: false })
  })

  it('読むだけ：入力集めの前後で storage の内容が変わらない', () => {
    const state = settled()
    recordGameResult(state)
    recordMatchupClear(state, NOW.getTime())
    const before = JSON.stringify([...storage.store.entries()].sort())
    collectEarlyRead(state, NOW)
    collectResultContext(state, { newBest: true, prevBest: 0, stakeResult: null, dailyResult: null, otomoBondChange: null }, NOW)
    expect(JSON.stringify([...storage.store.entries()].sort())).toBe(before)
  })
})
