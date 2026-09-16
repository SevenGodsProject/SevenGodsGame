import { beforeEach, describe, expect, it } from 'vitest'
import type { EnemyId, GameState, GameStatus, GodId } from '../core/types'
import { GOD_IDS } from '../core/data/gods'
import { ENEMY_IDS } from '../core/data/enemies'
import { RULES } from '../core/data/rules'
import { startTestGame } from '../core/engine/testUtils'
import {
  buildMatchupSeed,
  countMatchupsByEnemy,
  countMatchupsByGod,
  countMatchupsTotal,
  isMatchupCleared,
  loadMatchups,
  MATCHUP_TOTAL,
  recordMatchupClear,
} from './matchupStorage'

/**
 * Phase 7 P2（決定189・仕様 §11・§12）：神×敵の攻略記録。
 * 1 マス＝「その神でその敵に 1 回勝つ」を、重複・破損・storage 不可・取り込みの境界まで固定する。
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

const KEY = 'sevengods.matchups'
const NOW = Date.parse('2026-09-17T03:00:00Z')

function finished(godId: GodId, enemyId: EnemyId, status: GameStatus = 'won', mode: 'normal' | 'daily' = 'normal'): GameState {
  const base = startTestGame('matchup')
  return { ...base, godId, status, mode, enemy: { ...base.enemy, defId: enemyId } }
}

const stored = () => JSON.parse(storage.getItem(KEY) ?? 'null')

type DayFixture = { dateKey: string; enemyId: string; results: { godId: string; status: string; score?: number; round?: number }[] }
function putDaily(days: DayFixture[]) {
  const out: Record<string, unknown> = {}
  for (const d of days) {
    out[d.dateKey] = {
      dateKey: d.dateKey,
      enemyId: d.enemyId,
      seed: `daily-${d.dateKey}-${d.enemyId}`,
      attemptsUsed: d.results.length,
      results: d.results.map((r, i) => ({ score: 500, round: 5, at: i, ...r })),
      bestScore: 500,
      bestGodId: null,
      bestByGod: {},
    }
  }
  storage.setItem('sevengods.daily', JSON.stringify({ version: 1, days: out }))
}

describe('recordMatchupClear：1 マス＝その神でその敵に 1 回勝つ', () => {
  it('新しい組み合わせの勝利で 1 マス点灯し、初撃破として返す', () => {
    const r = recordMatchupClear(finished(GOD_IDS.taiyo, ENEMY_IDS.oni), NOW)
    expect(r).toEqual({ godId: GOD_IDS.taiyo, enemyId: ENEMY_IDS.oni, isFirstClear: true, godClearedCount: 1, enemyClearedCount: 1, totalCleared: 1 })
    expect(stored()).toEqual({ version: 1, cleared: { [GOD_IDS.taiyo]: [ENEMY_IDS.oni] }, seeded: { at: NOW, source: 'daily' } })
  })

  it('同じ組み合わせで何度勝っても 1 マスのまま（2 回目以降は初撃破ではない・保存も重複しない）', () => {
    const s = finished(GOD_IDS.taiyo, ENEMY_IDS.oni)
    recordMatchupClear(s, NOW)
    const before = storage.getItem(KEY)
    for (let i = 0; i < 5; i++) {
      const r = recordMatchupClear(s, NOW + i)
      expect(r?.isFirstClear).toBe(false)
      expect(r?.totalCleared).toBe(1)
    }
    expect(storage.getItem(KEY)).toBe(before)
    expect(stored().cleared[GOD_IDS.taiyo]).toEqual([ENEMY_IDS.oni])
  })

  it('別の神・別の敵はそれぞれ別のマス', () => {
    recordMatchupClear(finished(GOD_IDS.taiyo, ENEMY_IDS.oni), NOW)
    const otherGod = recordMatchupClear(finished(GOD_IDS.sobi, ENEMY_IDS.oni), NOW)
    const otherEnemy = recordMatchupClear(finished(GOD_IDS.taiyo, ENEMY_IDS.ryujin), NOW)
    expect(otherGod).toMatchObject({ isFirstClear: true, godClearedCount: 1, enemyClearedCount: 2, totalCleared: 2 })
    expect(otherEnemy).toMatchObject({ isFirstClear: true, godClearedCount: 2, enemyClearedCount: 1, totalCleared: 3 })
    const data = loadMatchups(NOW).data
    expect(isMatchupCleared(data, GOD_IDS.taiyo, ENEMY_IDS.oni)).toBe(true)
    expect(isMatchupCleared(data, GOD_IDS.sobi, ENEMY_IDS.ryujin)).toBe(false)
    expect(countMatchupsByGod(data, GOD_IDS.taiyo)).toBe(2)
    expect(countMatchupsByEnemy(data, ENEMY_IDS.oni)).toBe(2)
    expect(countMatchupsTotal(data)).toBe(3)
  })

  it('神域挑戦の勝利も数える', () => {
    const r = recordMatchupClear(finished(GOD_IDS.ebisu, ENEMY_IDS.juuma, 'won', 'daily'), NOW)
    expect(r?.isFirstClear).toBe(true)
  })

  it('敗北・未撃破・対局中は記録しない（キーも作らない）', () => {
    for (const status of ['lost', 'finished', 'playing'] as GameStatus[]) {
      expect(recordMatchupClear(finished(GOD_IDS.taiyo, ENEMY_IDS.oni, status), NOW)).toBeNull()
    }
    expect(storage.getItem(KEY)).toBeNull()
  })

  it('未知の神・敵 ID は記録しない', () => {
    expect(recordMatchupClear(finished('nope' as GodId, ENEMY_IDS.oni), NOW)).toBeNull()
    expect(recordMatchupClear(finished(GOD_IDS.taiyo, 'enemy_99' as EnemyId), NOW)).toBeNull()
  })

  it('7 敵・7 柱・49 マスの到達を数で返す', () => {
    const gods = Object.values(GOD_IDS)
    const enemies = Object.values(ENEMY_IDS)
    let last = null
    for (const g of gods) for (const e of enemies) last = recordMatchupClear(finished(g, e), NOW)
    expect(last).toMatchObject({ isFirstClear: true, godClearedCount: 7, enemyClearedCount: 7, totalCleared: MATCHUP_TOTAL })
    expect(MATCHUP_TOTAL).toBe(49)
  })
})

describe('壊れた保存・storage 不可でもゲームを止めない', () => {
  it('壊れた JSON・構造不正は読めないので取り込みからやり直す（例外なし）', () => {
    for (const raw of ['{not json', '"x"', 'null', JSON.stringify({ version: 1 }), JSON.stringify({ version: 1, cleared: 3 }), JSON.stringify({ version: 0, cleared: {} })]) {
      storage.clear()
      storage.setItem(KEY, raw)
      expect(() => loadMatchups(NOW)).not.toThrow()
      const r = recordMatchupClear(finished(GOD_IDS.taiyo, ENEMY_IDS.oni), NOW)
      expect(r?.isFirstClear).toBe(true)
      expect(stored().version).toBe(1)
    }
  })

  it('未知の神・敵 ID や重複は読み込み時に取り除く', () => {
    storage.setItem(KEY, JSON.stringify({ version: 1, cleared: { taiyo: ['enemy_02', 'enemy_02', 'enemy_99', 7], nope: ['enemy_01'] }, seeded: { at: 5, source: 'daily' } }))
    const data = loadMatchups(NOW).data
    expect(data.cleared).toEqual({ taiyo: ['enemy_02'] })
    expect(countMatchupsTotal(data)).toBe(1)
    expect(data.seeded.at).toBe(5)
  })

  it('将来の版（version 2）は読まず、上書きもしない（新しいビルドから戻したとき壊さない）', () => {
    const future = JSON.stringify({ version: 2, somethingNew: true })
    storage.setItem(KEY, future)
    expect(loadMatchups(NOW).available).toBe(false)
    expect(recordMatchupClear(finished(GOD_IDS.taiyo, ENEMY_IDS.oni), NOW)).toBeNull()
    expect(storage.getItem(KEY)).toBe(future)
  })

  it('localStorage が使えない（例外を投げる）環境では null を返すだけ', () => {
    const throwing = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    }
    Object.defineProperty(globalThis, 'localStorage', { value: throwing, configurable: true })
    expect(() => recordMatchupClear(finished(GOD_IDS.taiyo, ENEMY_IDS.oni), NOW)).not.toThrow()
    expect(recordMatchupClear(finished(GOD_IDS.taiyo, ENEMY_IDS.oni), NOW)).toBeNull()
    expect(loadMatchups(NOW).available).toBe(false)
  })

  it('書き込みだけ失敗する（容量超過など）ときは初撃破を返さない（次の勝利で二重に祝わないため）', () => {
    const quota = new MemoryStorage()
    quota.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    Object.defineProperty(globalThis, 'localStorage', { value: quota, configurable: true })
    expect(recordMatchupClear(finished(GOD_IDS.taiyo, ENEMY_IDS.oni), NOW)).toBeNull()
    expect(loadMatchups(NOW).available).toBe(true)
  })

  it('例外を投げる state（壊れた入力）でも外へ例外を出さない', () => {
    const broken = { status: 'won', godId: GOD_IDS.taiyo, get enemy(): never { throw new Error('boom') } } as unknown as GameState
    expect(recordMatchupClear(broken, NOW)).toBeNull()
  })
})

describe('導入時の取り込み（§12）：神域挑戦の勝利だけ', () => {
  it('勝利だけを取り込み、敗北・未撃破は除外。seeded.source は daily', () => {
    putDaily([
      { dateKey: '2026-09-15', enemyId: 'enemy_02', results: [{ godId: 'taiyo', status: 'won' }, { godId: 'sobi', status: 'lost' }] },
      { dateKey: '2026-09-16', enemyId: 'enemy_06', results: [{ godId: 'ebisu', status: 'finished' }, { godId: 'ebisu', status: 'won' }] },
    ])
    const view = loadMatchups(NOW)
    expect(view.available).toBe(true)
    expect(view.data.cleared).toEqual({ taiyo: ['enemy_02'], ebisu: ['enemy_06'] })
    expect(stored().seeded).toEqual({ at: NOW, source: 'daily' })
  })

  it('同じ組み合わせの複数勝利は 1 マス', () => {
    putDaily([
      { dateKey: '2026-09-10', enemyId: 'enemy_05', results: [{ godId: 'taiyo', status: 'won' }, { godId: 'taiyo', status: 'won' }] },
      { dateKey: '2026-09-17', enemyId: 'enemy_05', results: [{ godId: 'taiyo', status: 'won' }] },
    ])
    expect(loadMatchups(NOW).data.cleared).toEqual({ taiyo: ['enemy_05'] })
  })

  it('保存期間（日付キー RULES.daily.retentionDays 件）より古い日は取り込まない', () => {
    const n = RULES.daily.retentionDays
    const days: DayFixture[] = []
    const start = Date.parse('2026-06-01T00:00:00Z')
    for (let i = 0; i <= n; i++) {
      const key = new Date(start + i * 86_400_000).toISOString().slice(0, 10)
      // 最も古い 1 日だけが勝利（sobi × 鬼将）、残りは敗北
      days.push({ dateKey: key, enemyId: 'enemy_02', results: [{ godId: i === 0 ? 'sobi' : 'taiyo', status: i === 0 ? 'won' : 'lost' }] })
    }
    putDaily(days)
    expect(loadMatchups(NOW).data.cleared).toEqual({})
    // 保存期間ちょうどの境界（最新から n 件目）の勝利は取り込む
    storage.removeItem(KEY)
    days[1].results = [{ godId: 'sobi', status: 'won' }]
    putDaily(days)
    expect(loadMatchups(NOW).data.cleared).toEqual({ sobi: ['enemy_02'] })
  })

  it('不正なデータ（日付キー・神・敵・results の形）は無視する', () => {
    storage.setItem(
      'sevengods.daily',
      JSON.stringify({
        version: 1,
        days: {
          'not-a-date': { dateKey: 'not-a-date', enemyId: 'enemy_01', results: [{ godId: 'taiyo', status: 'won' }] },
          '2026-09-01': { dateKey: '2026-09-01', enemyId: 'enemy_99', results: [{ godId: 'taiyo', status: 'won' }] },
          '2026-09-02': { dateKey: '2026-09-02', enemyId: 'enemy_03', results: [{ godId: 'zeus', status: 'won' }, null, { godId: 'saika', status: 'WON' }] },
          '2026-09-03': { dateKey: '2026-09-03', enemyId: 'enemy_04', results: 'broken' },
          '2026-09-04': { dateKey: '2026-09-04', enemyId: 'enemy_07', results: [{ godId: 'shouren', status: 'won' }] },
        },
      }),
    )
    expect(loadMatchups(NOW).data.cleared).toEqual({ shouren: ['enemy_07'] })
  })

  it('通常戦の過去の勝利（records の勝利数など）からは推測しない', () => {
    storage.setItem('sevengods.records', JSON.stringify({ version: 1, records: { taiyo: { bestScore: 0, bestScoreDifficulty: null, bestBattleScore: 1000, bestBattleScoreDifficulty: 'hard', wins: 14, losses: 0, finished: 0, fastestWinRound: 3 } } }))
    storage.setItem('sevengods.stakes', JSON.stringify({ version: 1, byGod: { taiyo: { hardCleared: true, maxCleared: 7, bestByStake: {} } } }))
    expect(loadMatchups(NOW).data.cleared).toEqual({})
    expect(countMatchupsTotal(loadMatchups(NOW).data)).toBe(0)
  })

  it('取り込みは 1 回だけ。以後 daily が増えても再取り込みしない（記録は決着時だけで増える）', () => {
    putDaily([{ dateKey: '2026-09-15', enemyId: 'enemy_02', results: [{ godId: 'taiyo', status: 'won' }] }])
    loadMatchups(NOW)
    putDaily([
      { dateKey: '2026-09-15', enemyId: 'enemy_02', results: [{ godId: 'taiyo', status: 'won' }] },
      { dateKey: '2026-09-16', enemyId: 'enemy_06', results: [{ godId: 'sobi', status: 'won' }] },
    ])
    expect(loadMatchups(NOW + 1000).data.cleared).toEqual({ taiyo: ['enemy_02'] })
    expect(stored().seeded.at).toBe(NOW)
  })

  it('取り込みは既存の保存（daily・records・stakes）を 1 バイトも書き換えない', () => {
    putDaily([{ dateKey: '2026-09-15', enemyId: 'enemy_02', results: [{ godId: 'taiyo', status: 'won' }] }])
    storage.setItem('sevengods.records', '{"version":1,"records":{}}')
    const before = new Map([...storage.store].filter(([k]) => k !== KEY))
    loadMatchups(NOW)
    recordMatchupClear(finished(GOD_IDS.sobi, ENEMY_IDS.ryujin), NOW)
    const after = new Map([...storage.store].filter(([k]) => k !== KEY))
    expect(after).toEqual(before)
    expect([...storage.store.keys()].filter((k) => !before.has(k))).toEqual([KEY])
  })

  it('キーが無い状態で最初の勝利を記録するときも、取り込み＋今回の 1 マスになる（今回分が daily より先に記録される前提）', () => {
    putDaily([{ dateKey: '2026-09-15', enemyId: 'enemy_02', results: [{ godId: 'taiyo', status: 'won' }] }])
    const r = recordMatchupClear(finished(GOD_IDS.ebisu, ENEMY_IDS.juuma, 'won', 'daily'), NOW)
    expect(r).toMatchObject({ isFirstClear: true, totalCleared: 2 })
    // 取り込み済みの組み合わせで勝っても初撃破ではない
    expect(recordMatchupClear(finished(GOD_IDS.taiyo, ENEMY_IDS.oni), NOW)?.isFirstClear).toBe(false)
  })

  it('buildMatchupSeed は daily が無ければ空で、例外を出さない', () => {
    expect(buildMatchupSeed(NOW)).toEqual({ version: 1, cleared: {}, seeded: { at: NOW, source: 'daily' } })
    storage.setItem('sevengods.daily', '{broken')
    expect(buildMatchupSeed(NOW).cleared).toEqual({})
  })
})

describe('ロールバック互換', () => {
  it('matchups は独立キーで、既存の各 storage の読み込み関数が参照するキーと重ならない', () => {
    recordMatchupClear(finished(GOD_IDS.taiyo, ENEMY_IDS.oni), NOW)
    expect([...storage.store.keys()]).toEqual([KEY])
    expect(KEY).not.toMatch(/^sevengods\.(records|daily|battleSave|stakes|otomoBond|rewardBonuses|deckPreference|pendingRuns|dailyRunLog|quota|tutorialSeen)$/)
  })
})
