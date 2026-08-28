import { describe, expect, it } from 'vitest'
import { ENEMIES, ENEMY_IDS, pickEnemyId } from '../core/data/enemies'
import { resolveStartEnemyId } from './startEnemy'

/**
 * LANE-D（Enemy Select）：バトル開始時の敵確定ロジックの重点テスト。
 * 「敵Aを選んだのに敵Bが出る」事故を7敵全部について直接検証する。
 */
describe('resolveStartEnemyId', () => {
  it('プレイヤーが選んだ敵がそのまま採用される（7敵全部、seedに一切影響されない）', () => {
    for (const enemy of ENEMIES) {
      // どんなseedでも、選択した敵IDがそのまま返ること（すり替わり事故の防止）
      for (const seed of ['seed-1', 'seed-1756000000000', 'こんにちは']) {
        expect(resolveStartEnemyId(null, enemy.id, seed)).toBe(enemy.id)
      }
    }
  })

  it('「神に委ねる」（null）は既存pickEnemyIdのシード選出と完全に同一の挙動', () => {
    for (const seed of ['a', 'seed-1', 'seed-2', 'seed-999999', 'こんにちは']) {
      expect(resolveStartEnemyId(null, null, seed)).toBe(pickEnemyId(seed))
      // 未指定（undefined、既存呼び出し元の互換）もnullと同じ扱い
      expect(resolveStartEnemyId(null, undefined, seed)).toBe(pickEnemyId(seed))
    }
  })

  it('URLバックドア（forced）はプレイヤー選択より優先される（決定40の維持）', () => {
    expect(resolveStartEnemyId(ENEMY_IDS.oni, ENEMY_IDS.ryujin, 'seed-x')).toBe(ENEMY_IDS.oni)
    expect(resolveStartEnemyId(ENEMY_IDS.doukeshi, null, 'seed-x')).toBe(ENEMY_IDS.doukeshi)
  })
})
