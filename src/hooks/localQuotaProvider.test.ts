import { beforeEach, describe, expect, it } from 'vitest'
import { createLocalQuotaProvider } from './localQuotaProvider'

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

const FEATURE = 'daily-blessing'
const LIMIT = 7

describe('createLocalQuotaProvider', () => {
  it('初回：featureKeyが未記録の状態ではlimitぶん丸ごと残っている', async () => {
    const provider = createLocalQuotaProvider()
    const state = await provider.getState(FEATURE, LIMIT, new Date(2026, 7, 15, 9, 0))
    expect(state).toEqual({ dateKey: '2026-08-15', used: 0, limit: LIMIT, remaining: LIMIT })
  })

  it('同日消費：同じ日のうちに複数回消費すると、そのぶんだけ残数が減る', async () => {
    const provider = createLocalQuotaProvider()
    const day = new Date(2026, 7, 15, 9, 0)

    const r1 = await provider.consume(FEATURE, LIMIT, day)
    expect(r1).toEqual({ ok: true, state: { dateKey: '2026-08-15', used: 1, limit: LIMIT, remaining: LIMIT - 1 } })

    const r2 = await provider.consume(FEATURE, LIMIT, new Date(2026, 7, 15, 15, 0))
    expect(r2.ok).toBe(true)
    expect(r2.state.used).toBe(2)
    expect(r2.state.remaining).toBe(LIMIT - 2)
  })

  it('上限到達：残り0になった後の消費はok:falseで、usedは増えない', async () => {
    const provider = createLocalQuotaProvider()
    const day = new Date(2026, 7, 15, 9, 0)

    for (let i = 0; i < LIMIT; i++) {
      const r = await provider.consume(FEATURE, LIMIT, day)
      expect(r.ok).toBe(true)
    }

    const overLimit = await provider.consume(FEATURE, LIMIT, day)
    expect(overLimit.ok).toBe(false)
    expect(overLimit.state.used).toBe(LIMIT)
    expect(overLimit.state.remaining).toBe(0)

    // 上限到達後もさらに呼んでも増え続けない
    const overLimit2 = await provider.consume(FEATURE, LIMIT, day)
    expect(overLimit2.ok).toBe(false)
    expect(overLimit2.state.used).toBe(LIMIT)
  })

  it('翌日リセット：日付が変わるとusedが0に戻り、残数がlimitに戻る', async () => {
    const provider = createLocalQuotaProvider()
    await provider.consume(FEATURE, LIMIT, new Date(2026, 7, 15, 20, 0))
    await provider.consume(FEATURE, LIMIT, new Date(2026, 7, 15, 21, 0))

    const beforeReset = await provider.getState(FEATURE, LIMIT, new Date(2026, 7, 15, 23, 0))
    expect(beforeReset.used).toBe(2)

    const nextDay = await provider.getState(FEATURE, LIMIT, new Date(2026, 7, 16, 0, 5))
    expect(nextDay).toEqual({ dateKey: '2026-08-16', used: 0, limit: LIMIT, remaining: LIMIT })
  })

  it('月末→翌月：1/31に使い切っても2/1には正しくリセットされる', async () => {
    const provider = createLocalQuotaProvider()
    for (let i = 0; i < LIMIT; i++) {
      await provider.consume(FEATURE, LIMIT, new Date(2026, 0, 31, 10, 0))
    }
    const exhausted = await provider.getState(FEATURE, LIMIT, new Date(2026, 0, 31, 23, 0))
    expect(exhausted.remaining).toBe(0)

    const nextMonth = await provider.getState(FEATURE, LIMIT, new Date(2026, 1, 1, 0, 1))
    expect(nextMonth).toEqual({ dateKey: '2026-02-01', used: 0, limit: LIMIT, remaining: LIMIT })
  })

  it('年末→翌年：12/31に使い切っても1/1には正しくリセットされる', async () => {
    const provider = createLocalQuotaProvider()
    for (let i = 0; i < LIMIT; i++) {
      await provider.consume(FEATURE, LIMIT, new Date(2026, 11, 31, 10, 0))
    }
    const exhausted = await provider.getState(FEATURE, LIMIT, new Date(2026, 11, 31, 23, 30))
    expect(exhausted.remaining).toBe(0)

    const nextYear = await provider.getState(FEATURE, LIMIT, new Date(2027, 0, 1, 0, 1))
    expect(nextYear).toEqual({ dateKey: '2027-01-01', used: 0, limit: LIMIT, remaining: LIMIT })
  })

  it('破損データ（不正JSON）は無視して初回相当（残数まるごと）にフォールバックする', async () => {
    localStorage.setItem('sevengods.quota', '{not valid json')
    const provider = createLocalQuotaProvider()
    const state = await provider.getState(FEATURE, LIMIT, new Date(2026, 7, 15, 9, 0))
    expect(state).toEqual({ dateKey: '2026-08-15', used: 0, limit: LIMIT, remaining: LIMIT })
  })

  it('version不一致の保存データは無視して初回相当にフォールバックする', async () => {
    localStorage.setItem(
      'sevengods.quota',
      JSON.stringify({ version: 999, records: { [FEATURE]: { dateKey: '2026-08-15', used: 7, lastSeenAtMs: 0 } } }),
    )
    const provider = createLocalQuotaProvider()
    const state = await provider.getState(FEATURE, LIMIT, new Date(2026, 7, 15, 9, 0))
    expect(state.used).toBe(0)
    expect(state.remaining).toBe(LIMIT)
  })

  it('localStorageが使えなくても例外を投げず、消費も永続化されない', async () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
    const provider = createLocalQuotaProvider()
    const day = new Date(2026, 7, 15, 9, 0)

    await expect(provider.consume(FEATURE, LIMIT, day)).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    )
    // 永続化されていないため、次に読んでも残数は満タンのまま
    const state = await provider.getState(FEATURE, LIMIT, day)
    expect(state.remaining).toBe(LIMIT)
  })

  it('端末時計の巻き戻し：許容幅(5分)を超えて過去に戻ると、日付が変わって見えてもリセットしない', async () => {
    const provider = createLocalQuotaProvider()
    await provider.consume(FEATURE, LIMIT, new Date(2026, 7, 16, 0, 10)) // 8/16 0:10に1回消費
    // 端末の時計を8/15 23:00へ巻き戻した状態で確認（8/16 0:10からは70分前＝許容幅5分を超える）
    const rolledBack = await provider.getState(FEATURE, LIMIT, new Date(2026, 7, 15, 23, 0))
    expect(rolledBack.used).toBe(1) // リセットされていない（8/16のレコードのまま）
    expect(rolledBack.dateKey).toBe('2026-08-16')
  })

  it('通常のタイムゾーン変更等、数分単位の前後（許容幅内）は巻き戻し扱いにしない', async () => {
    const provider = createLocalQuotaProvider()
    await provider.consume(FEATURE, LIMIT, new Date(2026, 7, 15, 12, 0, 0))
    // 2分前に戻っても同じ日なので通常どおり消費できる
    const r = await provider.consume(FEATURE, LIMIT, new Date(2026, 7, 15, 11, 58, 0))
    expect(r.ok).toBe(true)
    expect(r.state.used).toBe(2)
  })

  it('featureKeyごとに独立して管理される', async () => {
    const provider = createLocalQuotaProvider()
    const day = new Date(2026, 7, 15, 9, 0)
    await provider.consume('feature-a', 3, day)
    const stateA = await provider.getState('feature-a', 3, day)
    const stateB = await provider.getState('feature-b', 3, day)
    expect(stateA.used).toBe(1)
    expect(stateB.used).toBe(0)
  })
})
