import { describe, expect, it } from 'vitest'
import type { EnemyId } from '../core/types'
import { ENEMY_IDS } from '../core/data/enemies'
import { isKnownEnemyId, safeEnemyName, UNKNOWN_ENEMY_LABEL } from './enemyLookup'

/**
 * Post-P2 Hardening（決定191）：保存データ由来の enemyId を安全に扱うための共有ヘルパー。
 * `sevengods.battleSave`／`sevengods.daily` は enemyId の値そのものを検証しないため、
 * 破損・改ざんされた保存に現在の敵定義に存在しない ID が入っていても、ここで例外を吸収する。
 */

const UNKNOWN_ID = 'enemy_does_not_exist' as EnemyId

describe('safeEnemyName', () => {
  it('既知の敵 ID は通常どおりの名前を返す', () => {
    expect(safeEnemyName(ENEMY_IDS.oni)).toBe('業斧の鬼将')
    expect(safeEnemyName(ENEMY_IDS.trial)).toBe('試練の影')
  })

  it('未知の敵 ID は例外を投げず、既定の fallback 文言を返す', () => {
    expect(() => safeEnemyName(UNKNOWN_ID)).not.toThrow()
    expect(safeEnemyName(UNKNOWN_ID)).toBe(UNKNOWN_ENEMY_LABEL)
  })

  it('空文字・記号混じりなど、あらゆる未知の値で例外を投げない', () => {
    for (const id of ['', '   ', 'enemy_00', 'ENEMY_02', '<script>', 'null', 'undefined'] as EnemyId[]) {
      expect(() => safeEnemyName(id)).not.toThrow()
      expect(safeEnemyName(id)).toBe(UNKNOWN_ENEMY_LABEL)
    }
  })
})

describe('isKnownEnemyId', () => {
  it('既知の敵 ID はすべて true', () => {
    for (const id of Object.values(ENEMY_IDS)) {
      expect(isKnownEnemyId(id)).toBe(true)
    }
  })

  it('未知の敵 ID は false（例外を投げない）', () => {
    expect(() => isKnownEnemyId(UNKNOWN_ID)).not.toThrow()
    expect(isKnownEnemyId(UNKNOWN_ID)).toBe(false)
  })
})
