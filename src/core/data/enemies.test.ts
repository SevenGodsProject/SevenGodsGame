import { describe, expect, it } from 'vitest'
import { ENEMIES, pickEnemyId } from './enemies'

describe('ENEMIES', () => {
  it('has a unique id per enemy', () => {
    const ids = ENEMIES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every enemy a positive HP, at least one action, and art', () => {
    for (const enemy of ENEMIES) {
      expect(enemy.maxHp).toBeGreaterThan(0)
      expect(enemy.actions.length).toBeGreaterThan(0)
      expect(enemy.art.length).toBeGreaterThan(0)
    }
  })

  it('gives every enemy at least one battle cry (決定40)', () => {
    for (const enemy of ENEMIES) {
      expect(enemy.battleCries.length).toBeGreaterThan(0)
      for (const line of enemy.battleCries) {
        expect(line.length).toBeGreaterThan(0)
      }
    }
  })

  // STEP3-A（8/31 敵7体ゲーム性監査 処理20＝A案）：EnemyDefへ追加した表示専用
  // メタデータ（typeLabel/typeDescription/visualType）が7体全てに揃っていることを
  // 保証する。HP・actions（数値・行動テーブル）はこのテストの対象外＝無変更のまま。
  it('gives every enemy a short type label and description (STEP3-A)', () => {
    for (const enemy of ENEMIES) {
      expect(enemy.typeLabel.length).toBeGreaterThan(0)
      expect(enemy.typeDescription.length).toBeGreaterThan(0)
      // BattleHud/EnemyPanelの1行表示を圧迫しないよう、短い説明であることを保証する
      expect(enemy.typeDescription.length).toBeLessThanOrEqual(30)
    }
  })
})

describe('pickEnemyId', () => {
  it('is deterministic for the same seed', () => {
    expect(pickEnemyId('seed-1234')).toBe(pickEnemyId('seed-1234'))
  })

  it('only returns ids that exist in ENEMIES', () => {
    const validIds = new Set(ENEMIES.map((e) => e.id))
    for (const seed of ['a', 'seed-1', 'seed-2', 'seed-999999', 'こんにちは']) {
      expect(validIds.has(pickEnemyId(seed))).toBe(true)
    }
  })
})
