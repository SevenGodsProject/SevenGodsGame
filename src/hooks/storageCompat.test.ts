import { beforeEach, describe, expect, it } from 'vitest'
import type { GameState } from '../core/types'
import type { ReplayInput } from '../core/replay'
import { applyAction } from '../core/engine'
import { STARTER_DECK } from '../core/data/decks'
import { ENEMY_IDS } from '../core/data/enemies'
import { GOD_IDS } from '../core/data/gods'
import { RULES } from '../core/data/rules'
import { isFutureStored, pickValidEntries, setItemGuarded, storedVersion } from './storageGuard'
import { loadGodRecord, recordGameResult } from './recordStorage'
import { loadOtomoBond, recordOtomoBond } from './otomoBondStorage'
import { loadGodStakeRecord, recordStakeResult } from './stakeStorage'
import { loadDailyDay, startDailyAttempt } from './dailyStorage'
import { addRewardBonus, loadRewardBonuses } from './rewardStorage'
import { loadRewardHistory, pushOfferedRewards } from './rewardHistoryStorage'
import { enqueuePendingRun, loadPendingRuns } from './pendingRunStorage'
import { createLocalQuotaProvider } from './localQuotaProvider'
import { loadBattleSave, saveBattle } from './battleSaveStorage'
import { loadDeckPreference } from './deckPreferenceStorage'
import { loadRunLog } from './dailyRunLogStorage'

/**
 * RL-01 Save Compatibility Guard（docs/STORAGE_VERSION_POLICY.md）の契約。
 * 台帳型 8 key について「無い／壊れている／旧 version／未来 version／一部不正／storage 不可」で
 * **例外を出さない・未来 version を上書きしない・読み取りで書かない・壊れた 1 件のために残りを捨てない** を固定する。
 * スロット型 3 key（進行中バトル・進行中 run ログ・デッキ設定）は「未来 version を読んだら null・読み取りで raw 不変」のみ。
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

/** getItem／setItem が常に throw する storage（Safari のプライベートモード・容量超過の代役） */
class BrokenStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new Error('storage unavailable')
  }
  override setItem(): void {
    throw new Error('storage unavailable')
  }
}

const install = (s: Storage) => Object.defineProperty(globalThis, 'localStorage', { value: s, configurable: true })
beforeEach(() => install(new MemoryStorage()))

function wonState(seed = 'compat'): GameState {
  const s = applyAction(null, { type: 'START_GAME', seed, godId: GOD_IDS.ebisu, enemyId: ENEMY_IDS.trial, deck: STARTER_DECK, difficulty: 'normal' }).state
  return { ...s, status: 'won', round: 3, score: { ...s.score, total: 100 } }
}
const DAILY_KEY = '2026-10-09'
const CARD = STARTER_DECK[0]!
const replayInput = { version: RULES.replay.formatVersion, mode: 'daily', dailyKey: DAILY_KEY, godId: GOD_IDS.ebisu, deck: STARTER_DECK, actions: [{ type: 'END_ROUND' }] } as unknown as ReplayInput
const RUN_ID = '0123456789abcdef0123456789abcdef'

type LedgerModule = {
  name: string
  key: string
  version: number
  /** ルート直下の記録コンテナ名（records／byGod／days／bonuses／gods／runs） */
  root: string
  /** 読み取り（例外を出さないこと） */
  read: () => unknown
  /** 代表的な書き込み 1 回 */
  write: () => unknown
  /** 読み取り API が書き戻す設計（R5 の例外：quota の日付切替）。true なら「読み取りで raw 不変」の検査を省く */
  readMayWrite?: boolean
  /** 「有効な 1 件 ＋ 壊れた 1 件」を入れたとき、有効な 1 件が読めること（undefined＝この検査なし） */
  partial?: { valid: unknown; validKey: string; broken: unknown; brokenKey: string; readValid: () => unknown; expected: unknown }
}

const LEDGER: LedgerModule[] = [
  {
    name: 'records',
    key: 'sevengods.records',
    version: 1,
    root: 'records',
    read: () => loadGodRecord(GOD_IDS.ebisu),
    write: () => recordGameResult(wonState()),
    partial: { validKey: GOD_IDS.ebisu, valid: { bestScore: 0, wins: 4, losses: 1, finished: 0 }, brokenKey: GOD_IDS.taiyo, broken: { wins: 'x' }, readValid: () => loadGodRecord(GOD_IDS.ebisu).wins, expected: 4 },
  },
  {
    name: 'otomoBond',
    key: 'sevengods.otomoBond',
    version: 1,
    root: 'records',
    read: () => loadOtomoBond(GOD_IDS.ebisu),
    write: () => recordOtomoBond(wonState()),
    partial: { validKey: GOD_IDS.ebisu, valid: { battlesPlayed: 9, resonanceCount: 3, dojiReached: 1 }, brokenKey: GOD_IDS.taiyo, broken: null, readValid: () => loadOtomoBond(GOD_IDS.ebisu).battlesPlayed, expected: 9 },
  },
  {
    name: 'stakes',
    key: 'sevengods.stakes',
    version: 1,
    root: 'byGod',
    read: () => loadGodStakeRecord(GOD_IDS.ebisu),
    write: () => recordStakeResult(wonState()),
    partial: { validKey: GOD_IDS.ebisu, valid: { hardCleared: true, maxCleared: 2, bestByStake: { '1': 50 } }, brokenKey: GOD_IDS.taiyo, broken: 'nope', readValid: () => loadGodStakeRecord(GOD_IDS.ebisu).maxCleared, expected: 2 },
  },
  {
    name: 'daily',
    key: 'sevengods.daily',
    version: 1,
    root: 'days',
    read: () => loadDailyDay(DAILY_KEY),
    write: () => startDailyAttempt(DAILY_KEY),
    partial: {
      validKey: DAILY_KEY,
      valid: { dateKey: DAILY_KEY, enemyId: 'enemy_01', seed: 's', attemptsUsed: 2, results: [], bestScore: 0, bestGodId: null, bestByGod: {} },
      brokenKey: '2026-10-08',
      broken: { dateKey: '2026-10-08' }, // results 欠落（従来は bestResultOf／recordDailyResult で throw し得た形）
      readValid: () => loadDailyDay(DAILY_KEY).attemptsUsed,
      expected: 2,
    },
  },
  {
    name: 'rewardBonuses',
    key: 'sevengods.rewardBonuses',
    version: 1,
    root: 'bonuses',
    read: () => loadRewardBonuses(GOD_IDS.ebisu),
    write: () => addRewardBonus(GOD_IDS.ebisu, CARD),
  },
  {
    name: 'rewardHistory',
    key: 'sevengods.rewardHistory',
    version: 1,
    root: 'gods',
    read: () => loadRewardHistory(GOD_IDS.ebisu),
    write: () => pushOfferedRewards(GOD_IDS.ebisu, [CARD]),
    partial: { validKey: GOD_IDS.ebisu, valid: { offered: [CARD], declined: [] }, brokenKey: GOD_IDS.taiyo, broken: { offered: 'x' }, readValid: () => loadRewardHistory(GOD_IDS.ebisu).offered.length, expected: 1 },
  },
  {
    name: 'pendingRuns',
    key: 'sevengods.pendingRuns',
    version: 1,
    root: 'runs',
    read: () => loadPendingRuns(),
    write: () => enqueuePendingRun({ clientRunId: RUN_ID, dailyKey: DAILY_KEY, input: replayInput }, DAILY_KEY),
  },
  {
    name: 'quota',
    key: 'sevengods.quota',
    version: 1,
    root: 'records',
    readMayWrite: true,
    read: () => createLocalQuotaProvider().getState('f', 3, new Date('2026-10-09T03:00:00Z')),
    write: () => createLocalQuotaProvider().consume('f', 3, new Date('2026-10-09T03:00:00Z')),
  },
]

const raw = (key: string) => localStorage.getItem(key)
const put = (key: string, value: unknown) => localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))

describe.each(LEDGER)('台帳型 $name（$key v$version）', (m) => {
  it('key が無い：読んでも書いても例外を出さず、読み取りだけでは key を作らない', async () => {
    await expect(Promise.resolve().then(m.read)).resolves.not.toThrow
    if (!m.readMayWrite) expect(raw(m.key)).toBeNull()
    await expect(Promise.resolve().then(m.write)).resolves.not.toThrow
  })

  it('JSON が壊れている：読み取りは例外を出さず raw を変えない（書き込みは通常どおり上書きできる）', async () => {
    put(m.key, '{"version":1,"broken')
    await Promise.resolve().then(m.read)
    if (!m.readMayWrite) expect(raw(m.key)).toBe('{"version":1,"broken')
  })

  it('旧 version（v0）：読み取りは空扱いで例外を出さず、読み取りだけでは書き換えない', async () => {
    const old = JSON.stringify({ version: m.version - 1, [m.root]: {}, legacy: 'keep' })
    put(m.key, old)
    await Promise.resolve().then(m.read)
    if (!m.readMayWrite) expect(raw(m.key)).toBe(old)
  })

  it('未来 version（v+1）：読んでも書いても raw が 1 バイトも変わらない（新しいビルドの記録を守る）', async () => {
    const future = JSON.stringify({ version: m.version + 1, [m.root]: { marker: 'KEEP' }, newField: [1, 2, 3] })
    put(m.key, future)
    expect(isFutureStored(m.key, m.version)).toBe(true)
    await Promise.resolve().then(m.read)
    expect(raw(m.key)).toBe(future)
    await Promise.resolve().then(m.write)
    expect(raw(m.key)).toBe(future)
  })

  it('storage が使えない（getItem／setItem が throw）：読み書きとも例外を外へ出さない', async () => {
    install(new BrokenStorage())
    await expect(Promise.resolve().then(m.read)).resolves.toBeDefined()
    await expect(Promise.resolve().then(m.write)).resolves.not.toThrow
  })

  if (m.partial) {
    const p = m.partial
    it('一部が壊れている：壊れた 1 件だけ捨て、有効な記録は読める（全体を初期化しない）', () => {
      put(m.key, { version: m.version, [m.root]: { [p.validKey]: p.valid, [p.brokenKey]: p.broken } })
      expect(p.readValid()).toEqual(p.expected)
    })
  }
})

describe('スロット型（進行中バトル・run ログ・デッキ設定）', () => {
  it('battleSave：未来 version は null・読み取りで raw 不変。現 version の保存は従来どおり', () => {
    const future = JSON.stringify({ version: RULES.saveVersion + 1, state: { any: true } })
    put('sevengods.battleSave', future)
    expect(loadBattleSave()).toBeNull()
    expect(raw('sevengods.battleSave')).toBe(future)
    const s = applyAction(null, { type: 'START_GAME', seed: 'slot', godId: GOD_IDS.ebisu, enemyId: ENEMY_IDS.trial, deck: STARTER_DECK, difficulty: 'normal' }).state
    saveBattle(s) // スロット型：次の進行が上書きしてよい（docs/STORAGE_VERSION_POLICY.md R3 の例外）
    expect(storedVersion('sevengods.battleSave')).toBe(RULES.saveVersion)
  })

  it('dailyRunLog／deckPreference：未来 version は null・読み取りで raw 不変', () => {
    const futureLog = JSON.stringify({ version: 99, log: {} })
    put('sevengods.dailyRunLog', futureLog)
    expect(loadRunLog()).toBeNull()
    expect(raw('sevengods.dailyRunLog')).toBe(futureLog)
    const futureDeck = JSON.stringify({ version: RULES.saveVersion + 1, godId: GOD_IDS.ebisu, deck: [] })
    put('sevengods.deckPreference', futureDeck)
    expect(loadDeckPreference(GOD_IDS.ebisu)).toBeNull()
    expect(raw('sevengods.deckPreference')).toBe(futureDeck)
  })
})

describe('storageGuard（部品）', () => {
  it('storedVersion：無い／壊れた／非オブジェクト／数値でない version は null', () => {
    expect(storedVersion('x')).toBeNull()
    put('x', '{')
    expect(storedVersion('x')).toBeNull()
    put('x', '"str"')
    expect(storedVersion('x')).toBeNull()
    put('x', { version: '1' })
    expect(storedVersion('x')).toBeNull()
    put('x', { version: 3 })
    expect(storedVersion('x')).toBe(3)
  })

  it('setItemGuarded：未来 version があれば false で書かない、同じ／古い version なら書く、storage 不可は false', () => {
    put('k', { version: 2 })
    expect(setItemGuarded('k', 1, '{"version":1}')).toBe(false)
    expect(raw('k')).toBe('{"version":2}')
    expect(setItemGuarded('k', 2, '{"version":2,"a":1}')).toBe(true)
    expect(raw('k')).toBe('{"version":2,"a":1}')
    put('k', { version: 1 })
    expect(setItemGuarded('k', 2, '{"version":2}')).toBe(true)
    install(new BrokenStorage())
    expect(setItemGuarded('k', 1, '{}')).toBe(false)
  })

  it('pickValidEntries：guard を通るエントリだけ残し、非オブジェクトは空', () => {
    const isNum = (v: unknown): v is number => typeof v === 'number'
    expect(pickValidEntries({ a: 1, b: 'x', c: 2 }, isNum)).toEqual({ a: 1, c: 2 })
    expect(pickValidEntries(null, isNum)).toEqual({})
    expect(pickValidEntries('s', isNum)).toEqual({})
  })
})
