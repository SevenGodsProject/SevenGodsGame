import { beforeEach, describe, expect, it } from 'vitest'
import { loadGodRecord, recordGameResult } from './recordStorage'
import { applyAction } from '../core/engine'
import { STARTER_DECK } from '../core/data/decks'
import { ENEMY_IDS } from '../core/data/enemies'
import { GOD_IDS } from '../core/data/gods'

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

function startGame(seed: string, difficulty: 'easy' | 'normal' | 'hard' = 'normal') {
  const result = applyAction(null, {
    type: 'START_GAME',
    seed,
    godId: GOD_IDS.ebisu,
    enemyId: ENEMY_IDS.trial,
    deck: STARTER_DECK,
    difficulty,
  })
  return result.state
}

function withStatus(state: ReturnType<typeof startGame>, status: 'won' | 'lost' | 'finished', round = 3, score = 100) {
  return { ...state, status, round, score: { ...state.score, total: score } }
}

describe('recordStorage', () => {
  it('未記録の神は全項目が0/nullで返る', () => {
    const record = loadGodRecord(GOD_IDS.ebisu)
    expect(record).toEqual({
      bestScore: 0,
      bestScoreDifficulty: null,
      bestBattleScore: 0,
      bestBattleScoreDifficulty: null,
      wins: 0,
      losses: 0,
      finished: 0,
      fastestWinRound: null,
    })
  })

  it('進行中（playing）のGameStateは戦績に反映しない', () => {
    const state = startGame('rec-1')
    const { isNewBest } = recordGameResult(state)
    expect(isNewBest).toBe(false)
    expect(loadGodRecord(GOD_IDS.ebisu).wins).toBe(0)
  })

  it('勝利するとwinsとbestBattleScoreが更新され、isNewBestがtrueになる（BASE-D：最終スコア＝素点×1.3）', () => {
    const state = withStatus(startGame('rec-2'), 'won', 4, 320)
    const { isNewBest } = recordGameResult(state)
    expect(isNewBest).toBe(true)
    const record = loadGodRecord(GOD_IDS.ebisu)
    expect(record.wins).toBe(1)
    // 新式ベストは最終スコア（素点320×1.3=416）で記録される
    expect(record.bestBattleScore).toBe(Math.round(320 * 1.3))
    expect(record.bestBattleScoreDifficulty).toBe('normal')
    // 旧bestScoreはもう更新されない（旧記録として温存するだけ）
    expect(record.bestScore).toBe(0)
    expect(record.fastestWinRound).toBe(4)
  })

  it('2回目の勝利がベストスコアを下回る場合、isNewBestはfalseでbestBattleScoreは維持される', () => {
    recordGameResult(withStatus(startGame('rec-3'), 'won', 5, 320))
    const { isNewBest } = recordGameResult(withStatus(startGame('rec-3b'), 'won', 2, 100))
    expect(isNewBest).toBe(false)
    const record = loadGodRecord(GOD_IDS.ebisu)
    expect(record.bestBattleScore).toBe(Math.round(320 * 1.3))
    expect(record.wins).toBe(2)
    // fastestWinRoundはスコアと独立して常に最速値を保持する
    expect(record.fastestWinRound).toBe(2)
  })

  it('敗北・未撃破もそれぞれのカウンタだけ増える（bestBattleScoreはスコアが上回れば更新される）', () => {
    recordGameResult(withStatus(startGame('rec-4'), 'lost', 3, 50))
    recordGameResult(withStatus(startGame('rec-4b'), 'finished', 7, 80))
    const record = loadGodRecord(GOD_IDS.ebisu)
    expect(record.losses).toBe(1)
    expect(record.finished).toBe(1)
    expect(record.bestBattleScore).toBe(Math.round(80 * 1.3))
    expect(record.fastestWinRound).toBeNull()
  })

  it('PROTO以前の保存データ（bestBattleScore欠落）は既定値0で補完され、旧bestScoreは温存される', () => {
    // 旧構造（新フィールド無し）を直接保存して読み込む
    localStorage.setItem(
      'sevengods.records',
      JSON.stringify({
        version: 1,
        records: {
          [GOD_IDS.ebisu]: {
            bestScore: 812,
            bestScoreDifficulty: 'hard',
            wins: 3,
            losses: 1,
            finished: 0,
            fastestWinRound: 5,
          },
        },
      }),
    )
    const record = loadGodRecord(GOD_IDS.ebisu)
    expect(record.bestScore).toBe(812)
    expect(record.bestBattleScore).toBe(0)
    // 新式で決着すると旧bestScoreはそのまま・新bestBattleScoreだけが記録される
    recordGameResult(withStatus(startGame('rec-legacy'), 'won', 4, 300))
    const after = loadGodRecord(GOD_IDS.ebisu)
    expect(after.bestScore).toBe(812)
    expect(after.bestBattleScore).toBe(Math.round(300 * 1.3))
    expect(after.wins).toBe(4)
  })

  it('神ごとに戦績を独立して保持する', () => {
    recordGameResult({ ...withStatus(startGame('rec-5'), 'won', 3, 200), godId: GOD_IDS.taiyo })
    expect(loadGodRecord(GOD_IDS.ebisu).wins).toBe(0)
    expect(loadGodRecord(GOD_IDS.taiyo).wins).toBe(1)
  })

  it('localStorageが使えなくても例外を投げない', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
    const state = withStatus(startGame('rec-6'), 'won', 3, 200)
    expect(() => recordGameResult(state)).not.toThrow()
    expect(loadGodRecord(GOD_IDS.ebisu).bestScore).toBe(0)
  })

  it('壊れた保存データは無視する', () => {
    localStorage.setItem('sevengods.records', '{not valid json')
    expect(loadGodRecord(GOD_IDS.ebisu).bestScore).toBe(0)
  })
})
