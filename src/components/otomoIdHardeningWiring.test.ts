import { describe, expect, it } from 'vitest'
import { otomoId } from '../core/types/ids'
import { OTOMO_IDS } from '../core/data/otomo'
import { UNKNOWN_OTOMO_LABEL, isKnownOtomoId, safeOtomoName } from './otomoLookup'

/**
 * RL-01b：未知 otomoId 耐性（決定191 の enemy 版と同型・`enemyIdHardeningWiring.test.ts` の構成を踏襲）。
 * React を描画する基盤が無いため、Home の配線はソース固定で検査する。
 */
const SOURCES = import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts', '!./**/*.test.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const toSrcPath = (k: string): string => (k.startsWith('./') ? `components/${k.slice(2)}` : k.replace(/^\.\.\//, ''))
const read = (suffix: string): string => {
  const key = Object.keys(SOURCES).find((k) => toSrcPath(k).endsWith(suffix))
  expect(key, `ソースが見つからない: ${suffix}`).toBeDefined()
  return SOURCES[key as string]
}

describe('otomoLookup（純粋な読み取りヘルパー）', () => {
  it('現行 7 体の OTOMO はすべて known で、名前が返る', () => {
    for (const id of Object.values(OTOMO_IDS)) {
      expect(isKnownOtomoId(id)).toBe(true)
      expect(safeOtomoName(id)).not.toBe(UNKNOWN_OTOMO_LABEL)
    }
  })

  it('未知の ID（壊れた保存・将来の id 変更）は例外を投げず false／fallback 文言', () => {
    const ghost = otomoId('otomo_ghost_99')
    expect(() => isKnownOtomoId(ghost)).not.toThrow()
    expect(isKnownOtomoId(ghost)).toBe(false)
    expect(safeOtomoName(ghost)).toBe(UNKNOWN_OTOMO_LABEL)
  })

  it('localStorage に一切触れない', () => {
    expect(read('otomoLookup.ts')).not.toMatch(/localStorage/)
  })
})

describe('Home の「続きから」は未知 otomoId を通さない', () => {
  it('HomeScreen.tsx は otomoLookup を使い、canResume が savedOtomoKnown を含む', () => {
    const src = read('setup/HomeScreen.tsx')
    expect(src).toMatch(/from '\.\.\/otomoLookup'/)
    expect(src).toMatch(/isKnownOtomoId\(savedBattle\.otomo\.defId\)/)
    const m = src.match(/const canResume = ([^\n]+)/)
    expect(m, 'canResume の定義が見つからない').toBeTruthy()
    expect(m?.[1]).toContain('savedEnemyKnown')
    expect(m?.[1]).toContain('savedOtomoKnown')
  })

  it('Hardening は storage を書き換えない（HomeScreen.tsx に localStorage への書き込みが無い）', () => {
    expect(read('setup/HomeScreen.tsx')).not.toMatch(/localStorage\.(setItem|removeItem|clear)\(/)
  })
})
