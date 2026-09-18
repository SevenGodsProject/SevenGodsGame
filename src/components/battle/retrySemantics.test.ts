import { describe, expect, it } from 'vitest'
import { isSameBoardRematch, resolveRematchSeed } from './retrySemantics'

/**
 * 決定196（Solve Loop v1）：再戦の意味論。
 *
 * 「敗北した通常戦だけ same-condition retry」という Outcome を、この 1 本で固定する。
 */
describe('isSameBoardRematch（決定196）', () => {
  it('通常戦の敗北・未撃破は同じ盤面で再戦する', () => {
    expect(isSameBoardRematch({ mode: 'normal', status: 'lost' })).toBe(true)
    expect(isSameBoardRematch({ mode: 'normal', status: 'finished' })).toBe(true)
  })

  it('通常戦の勝利は従来どおり新しい盤面（勝った盤面を反復させない）', () => {
    expect(isSameBoardRematch({ mode: 'normal', status: 'won' })).toBe(false)
  })

  it('神域挑戦（Daily）は勝敗にかかわらず対象外（seed の意味論は startDailyGame のまま）', () => {
    expect(isSameBoardRematch({ mode: 'daily', status: 'lost' })).toBe(false)
    expect(isSameBoardRematch({ mode: 'daily', status: 'finished' })).toBe(false)
    expect(isSameBoardRematch({ mode: 'daily', status: 'won' })).toBe(false)
  })

  it('進行中（playing）は再戦の対象ではない', () => {
    expect(isSameBoardRematch({ mode: 'normal', status: 'playing' })).toBe(false)
  })

  it('mode 未設定の旧セーブは通常モードとして扱う', () => {
    expect(isSameBoardRematch({ mode: undefined, status: 'lost' })).toBe(true)
    expect(isSameBoardRematch({ mode: undefined, status: 'won' })).toBe(false)
  })
})

describe('resolveRematchSeed（決定196）', () => {
  it('同じ盤面のときだけ seed を返す', () => {
    expect(resolveRematchSeed({ mode: 'normal', status: 'lost', seed: 'seed-123' })).toBe('seed-123')
    expect(resolveRematchSeed({ mode: 'normal', status: 'finished', seed: 'seed-123' })).toBe('seed-123')
  })

  it('勝利・Daily では undefined を返す（呼び出し側が新しい seed を発行する）', () => {
    expect(resolveRematchSeed({ mode: 'normal', status: 'won', seed: 'seed-123' })).toBeUndefined()
    expect(resolveRematchSeed({ mode: 'daily', status: 'lost', seed: 'daily-2026-09-18-enemy_02' })).toBeUndefined()
  })
})
