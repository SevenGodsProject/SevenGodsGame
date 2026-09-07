import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DailyRunLog, ReplayInput } from '../core/replay'
import { toReplayInput } from '../core/replay'
import { RULES } from '../core/data/rules'
import { GOD_IDS } from '../core/data/gods'
import { getRecommendedDeck } from '../core/data/deckBuilder'
import { playRecordedDailyRun } from '../core/replay/replayTestUtils'
import { createClientRunId, isClientRunId } from './clientRunId'
import { clearRunLog, loadRunLog, saveRunLog, DAILY_RUN_LOG_VERSION } from './dailyRunLogStorage'
import {
  clearPendingRuns,
  enqueuePendingRun,
  loadPendingRuns,
  prunePendingRuns,
  removePendingRun,
  PENDING_RUNS_VERSION,
} from './pendingRunStorage'

/**
 * Phase 4.2 Step 3・7・8：clientRunId／進行中ログの永続化／送信待ちrunの控え。
 *
 * どのモジュールもネットワークには一切触れない（Phase 4.2ではまだ送信しない）。
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
    return this.store.get(key) ?? null
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

const GOD = GOD_IDS.ebisu
const DAILY_KEY = '2026-09-09'

function sampleRun(policySeed = 3): { log: DailyRunLog; input: ReplayInput } {
  const run = playRecordedDailyRun({
    dailyKey: DAILY_KEY,
    godId: GOD,
    deck: getRecommendedDeck(GOD),
    policySeed,
    clientRunId: createClientRunId(),
  })
  return { log: run.log, input: toReplayInput(run.log) }
}

beforeEach(() => {
  ;(globalThis as { localStorage: Storage }).localStorage = new MemoryStorage()
})

describe('clientRunId（Step 3）', () => {
  it('ブラウザ標準のcryptoから生成し、毎回異なる', () => {
    const ids = new Set(Array.from({ length: 200 }, () => createClientRunId()))
    expect(ids.size).toBe(200)
    for (const id of ids) expect(isClientRunId(id)).toBe(true)
  })

  it('seedやscoreから導かれない（同じ条件でも毎回違う）', () => {
    const a = createClientRunId()
    const b = createClientRunId()
    expect(a).not.toBe(b)
    // Daily seed・日付・神・スコアのいずれも含まない
    for (const id of [a, b]) {
      expect(id).not.toContain(DAILY_KEY)
      expect(id).not.toContain('daily')
      expect(id).not.toContain(GOD)
    }
  })

  it('randomUUIDが無い環境ではgetRandomValuesへ退避する（独自UUID実装はしない）', () => {
    const real = globalThis.crypto
    try {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: { getRandomValues: real.getRandomValues.bind(real) },
      })
      const id = createClientRunId()
      expect(id).toMatch(/^[0-9a-f]{32}$/)
      expect(isClientRunId(id)).toBe(true)
    } finally {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: real })
    }
  })

  it('安全な乱数が無い環境では例外を投げる（推測可能なIDを黙って作らない）', () => {
    const real = globalThis.crypto
    try {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined })
      expect(() => createClientRunId()).toThrow()
    } finally {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: real })
    }
  })

  it('形式検査は明らかに不正な値を弾く', () => {
    expect(isClientRunId('')).toBe(false)
    expect(isClientRunId('short')).toBe(false)
    expect(isClientRunId(123)).toBe(false)
    expect(isClientRunId(null)).toBe(false)
  })
})

describe('進行中ログの永続化（Step 7）', () => {
  it('保存して読み戻せる', () => {
    const { log } = sampleRun()
    expect(loadRunLog()).toBeNull()
    saveRunLog(log)
    expect(loadRunLog()).toEqual(log)
    clearRunLog()
    expect(loadRunLog()).toBeNull()
  })

  it('saveVersionとは別のバージョンを持つ（不変ルール5）', () => {
    expect(DAILY_RUN_LOG_VERSION).not.toBe(RULES.saveVersion)
    const { log } = sampleRun()
    saveRunLog(log)
    const raw = JSON.parse(localStorage.getItem('sevengods.dailyRunLog') as string)
    expect(raw.version).toBe(DAILY_RUN_LOG_VERSION)
    expect(raw.log.version).toBe(RULES.replay.formatVersion)
  })

  it('版違い・壊れたデータ・形式違反はnullとして扱う（ゲームは続行できる）', () => {
    const { log } = sampleRun()
    const cases: string[] = [
      'not json',
      JSON.stringify({ version: DAILY_RUN_LOG_VERSION + 1, log }),
      JSON.stringify({ version: DAILY_RUN_LOG_VERSION, log: { ...log, clientRunId: 'x' } }),
      JSON.stringify({ version: DAILY_RUN_LOG_VERSION, log: { ...log, actions: 'nope' } }),
      JSON.stringify({
        version: DAILY_RUN_LOG_VERSION,
        log: { ...log, actions: [{ type: 'START_GAME' }] },
      }),
      JSON.stringify({
        version: DAILY_RUN_LOG_VERSION,
        log: { ...log, version: RULES.replay.formatVersion + 1 },
      }),
    ]
    for (const raw of cases) {
      localStorage.setItem('sevengods.dailyRunLog', raw)
      expect(loadRunLog()).toBeNull()
    }
  })

  it('上限を超えるaction数のログは読み込まない', () => {
    const { log } = sampleRun()
    const huge = {
      ...log,
      actions: Array.from({ length: RULES.replay.maxActions + 1 }, () => ({ type: 'END_ROUND' })),
    }
    localStorage.setItem(
      'sevengods.dailyRunLog',
      JSON.stringify({ version: DAILY_RUN_LOG_VERSION, log: huge }),
    )
    expect(loadRunLog()).toBeNull()
  })

  it('localStorageが使えなくても例外を投げない', () => {
    const { log } = sampleRun()
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    ;(globalThis as { localStorage: unknown }).localStorage = broken
    expect(() => saveRunLog(log)).not.toThrow()
    expect(loadRunLog()).toBeNull()
    expect(() => clearRunLog()).not.toThrow()
  })
})

describe('送信待ちrun（Step 8）', () => {
  it('決着runを控え、読み戻せる', () => {
    const { log, input } = sampleRun()
    expect(loadPendingRuns()).toEqual([])
    enqueuePendingRun({ clientRunId: log.clientRunId, dailyKey: DAILY_KEY, input }, DAILY_KEY)
    const runs = loadPendingRuns()
    expect(runs.length).toBe(1)
    expect(runs[0].clientRunId).toBe(log.clientRunId)
    expect(runs[0].attempts).toBe(0)
    expect(runs[0].input).toEqual(input)
  })

  it('同じclientRunIdは重複させず置換する（retryで増えない）', () => {
    const { log, input } = sampleRun()
    for (let i = 0; i < 5; i++) {
      enqueuePendingRun({ clientRunId: log.clientRunId, dailyKey: DAILY_KEY, input }, DAILY_KEY)
    }
    const runs = loadPendingRuns()
    expect(runs.length).toBe(1)
    expect(runs[0].clientRunId).toBe(log.clientRunId)
  })

  it('保持件数の上限を超えたら古い順に捨てる', () => {
    const { input } = sampleRun()
    const max = RULES.replay.pendingRuns.maxRuns
    const ids: string[] = []
    for (let i = 0; i < max + 5; i++) {
      const clientRunId = createClientRunId()
      ids.push(clientRunId)
      enqueuePendingRun({ clientRunId, dailyKey: DAILY_KEY, input }, DAILY_KEY)
    }
    const runs = loadPendingRuns()
    expect(runs.length).toBe(max)
    // 残っているのは新しい方
    expect(runs.map((r) => r.clientRunId)).toEqual(ids.slice(ids.length - max))
  })

  it('保持日数より古いDaily runは剪定する', () => {
    const { input } = sampleRun()
    const days = RULES.replay.pendingRuns.retentionDays
    enqueuePendingRun(
      { clientRunId: createClientRunId(), dailyKey: '2026-08-01', input },
      '2026-08-01',
    )
    enqueuePendingRun(
      { clientRunId: createClientRunId(), dailyKey: DAILY_KEY, input },
      DAILY_KEY,
    )
    expect(loadPendingRuns().length).toBe(1)
    expect(loadPendingRuns()[0].dailyKey).toBe(DAILY_KEY)

    // 剪定は明示呼び出しでも効く
    const future = '2026-09-30'
    expect(daysApart(DAILY_KEY, future)).toBeGreaterThan(days)
    prunePendingRuns(future)
    expect(loadPendingRuns()).toEqual([])
  })

  it('送信成功したrunを取り除ける（Phase 4.3で使う）', () => {
    const { input } = sampleRun()
    const a = createClientRunId()
    const b = createClientRunId()
    enqueuePendingRun({ clientRunId: a, dailyKey: DAILY_KEY, input }, DAILY_KEY)
    enqueuePendingRun({ clientRunId: b, dailyKey: DAILY_KEY, input }, DAILY_KEY)
    removePendingRun(a)
    expect(loadPendingRuns().map((r) => r.clientRunId)).toEqual([b])
    clearPendingRuns()
    expect(loadPendingRuns()).toEqual([])
  })

  it('saveVersionとは別のバージョンを持ち、壊れたデータは空として扱う', () => {
    expect(PENDING_RUNS_VERSION).not.toBe(RULES.saveVersion)
    const { input } = sampleRun()
    enqueuePendingRun({ clientRunId: createClientRunId(), dailyKey: DAILY_KEY, input }, DAILY_KEY)
    const raw = JSON.parse(localStorage.getItem('sevengods.pendingRuns') as string)
    expect(raw.version).toBe(PENDING_RUNS_VERSION)

    localStorage.setItem('sevengods.pendingRuns', 'broken')
    expect(loadPendingRuns()).toEqual([])
    localStorage.setItem(
      'sevengods.pendingRuns',
      JSON.stringify({ version: PENDING_RUNS_VERSION + 1, runs: raw.runs }),
    )
    expect(loadPendingRuns()).toEqual([])
  })

  it('控えるpayloadはReplayInputと識別子だけ（個人情報を持たない）', () => {
    const { log, input } = sampleRun()
    enqueuePendingRun({ clientRunId: log.clientRunId, dailyKey: DAILY_KEY, input }, DAILY_KEY)
    const run = loadPendingRuns()[0]
    expect(new Set(Object.keys(run))).toEqual(
      new Set(['clientRunId', 'dailyKey', 'attempts', 'createdAt', 'input']),
    )
    const json = JSON.stringify(run).toLowerCase()
    for (const forbidden of ['email', 'useragent', 'cookie', 'fingerprint', 'timezone']) {
      expect(json).not.toContain(forbidden)
    }
  })

  it('ネットワークに触れない（fetchを呼ばない）', () => {
    const spy = vi.fn()
    const real = globalThis.fetch
    ;(globalThis as { fetch: unknown }).fetch = spy
    try {
      const { log, input } = sampleRun()
      enqueuePendingRun({ clientRunId: log.clientRunId, dailyKey: DAILY_KEY, input }, DAILY_KEY)
      loadPendingRuns()
      prunePendingRuns(DAILY_KEY)
      removePendingRun(log.clientRunId)
      expect(spy).not.toHaveBeenCalled()
    } finally {
      ;(globalThis as { fetch: unknown }).fetch = real
    }
  })
})

const DAY_MS = 24 * 60 * 60 * 1000
function daysApart(a: string, b: string): number {
  return Math.abs(Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS
}

/**
 * UI配線ガード：本番の記録経路が外れていないこと。
 *
 * このリポジトリにはReactを描画するテスト基盤が無いため、`useGameEngine` の
 * 配線はソース検査で固定する（Phase 4.1 の `dailyFairness.test.ts` と同じ方式）。
 * 行番号ではなく構文の形で照合するので、前後の編集で位置がずれても壊れない。
 */
describe('UI配線ガード：記録経路（Step 1・2・7）', () => {
  const SOURCES = import.meta.glob('./useGameEngine.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
  const source = SOURCES[Object.keys(SOURCES)[0]]

  /** コメントを除いたソース（説明文中の言及を実装と取り違えないため） */
  const stripComments = (text: string) =>
    text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
  const code = stripComments(source)

  it('dispatchはapplyActionではなくapplyAndRecordを通る（記録の取りこぼしを構造的に防ぐ）', () => {
    expect(code).toContain('applyAndRecord(state, action, runLogRef.current, clientRunId)')
    // 生のapplyActionを直接呼ぶ経路が残っていない
    expect(code).not.toContain('applyAction(')
  })

  it('拒否された操作はcatchされ、commitもログ更新も行われない', () => {
    const dispatchBody = code.slice(code.indexOf('const dispatch'), code.indexOf('const startGame'))
    expect(dispatchBody).toContain('try {')
    expect(dispatchBody).toContain('catch (e)')
    expect(dispatchBody).toContain('setError(')
    // catch節の中でcommitやログ保存をしていない
    const catchBody = dispatchBody.slice(dispatchBody.indexOf('catch (e)'))
    expect(catchBody).not.toContain('commit(')
    expect(catchBody).not.toContain('saveRunLog')
  })

  it('ログの永続化はcommitの中でGameStateの保存と同時に行う', () => {
    const commitBody = code.slice(code.indexOf('const commit'), code.indexOf('const dispatch'))
    expect(commitBody).toContain('saveBattle(result.state)')
    expect(commitBody).toContain('saveRunLog(')
    expect(commitBody).toContain('enqueuePendingRun(')
    expect(commitBody).toContain('clearRunLog()')
  })

  it('resumeGameはresumeRunLogで突き合わせてからログを引き継ぐ', () => {
    const resumeBody = code.slice(code.indexOf('const resumeGame'), code.indexOf('const resetGame'))
    expect(resumeBody).toContain('resumeRunLog(savedState, loadRunLog())')
    expect(resumeBody).toContain('runLogRef.current = recovered.log')
  })

  it('startDailyGameはclientRunIdを1度だけ発行してSTART_GAMEへ渡す', () => {
    const body = code.slice(code.indexOf('const startDailyGame'), code.indexOf('const playCard'))
    expect(body).toContain('createClientRunId()')
    expect(body).toContain('}, clientRunId)')
    expect((body.match(/createClientRunId\(\)/g) ?? []).length).toBe(1)
  })

  it('通常モードの開始はDailyのログを引き継がない', () => {
    const body = code.slice(code.indexOf('const startGame'), code.indexOf('const startDailyGame'))
    expect(body).toContain('runLogRef.current = null')
    expect(body).toContain('clearRunLog()')
    expect(body).not.toContain('createClientRunId')
  })

  it('ログはrefで持つ（re-render・StrictModeの二重実行の影響を受けない）', () => {
    expect(code).toContain('const runLogRef = useRef<DailyRunLog | null>(null)')
  })

  it('useGameEngineはネットワークへ送信しない（Phase 4.2の禁止事項）', () => {
    for (const forbidden of ['fetch(', 'XMLHttpRequest', 'navigator.sendBeacon', 'WebSocket']) {
      expect(code).not.toContain(forbidden)
    }
  })
})
