import { describe, expect, it } from 'vitest'
import { resolveDailyStart } from './startDaily'
import { resolveStartEnemyId } from './startEnemy'
import { dailyBossFor } from '../core/data/dailyBoss'
import { ENEMY_IDS } from '../core/data/enemies'
import { RULES } from '../core/data/rules'

describe('resolveDailyStart（DAILY-01：共通条件）', () => {
  it('日付キーだけから敵・seed・難易度・補正が確定する', () => {
    const start = resolveDailyStart('2026-09-02')
    const boss = dailyBossFor('2026-09-02')
    expect(start).toEqual({
      mode: 'daily',
      dailyKey: '2026-09-02',
      enemyId: boss.enemyId,
      seed: boss.seed,
      difficulty: 'normal',
      modifier: RULES.daily.modifier,
    })
  })

  it('通常モードの解決器（URL強制 > 選択 > seed選出）とは独立で、強制指定が混入する経路が無い', () => {
    const start = resolveDailyStart('2026-09-02')
    // 通常モードで同じseedを使っても、強制指定(forced)があればそちらが勝つのが従来仕様
    const forced = resolveStartEnemyId(ENEMY_IDS.doukeshi, ENEMY_IDS.oni, start.seed)
    expect(forced).toBe(ENEMY_IDS.doukeshi)
    // Dailyの解決器は引数に強制指定を受け取らず、日付キーからの敵しか返さない
    expect(resolveDailyStart('2026-09-02').enemyId).toBe(dailyBossFor('2026-09-02').enemyId)
    expect((resolveDailyStart as unknown as (...args: unknown[]) => unknown).length).toBe(1)
  })

  it('補正オブジェクトはRULESのコピー（呼び出し側で書き換えてもRULESを汚さない）', () => {
    const start = resolveDailyStart('2026-09-02')
    start.modifier.enemyHpMul = 99
    expect(RULES.daily.modifier.enemyHpMul).not.toBe(99)
  })
})
