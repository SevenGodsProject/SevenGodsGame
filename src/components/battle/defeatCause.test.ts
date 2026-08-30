import { describe, expect, it } from 'vitest'
import type { GameEvent } from '../../core/types'
import { deriveDefeatCause, describeDefeatCause } from './defeatCause'

/** 決定128：敗北理由の導出。ログの並びは round.ts（ENEMY_ACTED → DAMAGE_DEALT(self)）に従う */
const base: GameEvent[] = [
  { t: 'GAME_STARTED' },
  { t: 'ROUND_STARTED', round: 1, apGranted: 2 },
  { t: 'ENEMY_INTENT_SET', kind: 'attack', amount: 5 },
]

describe('deriveDefeatCause (決定128)', () => {
  it('returns null unless the game ended in a loss', () => {
    expect(deriveDefeatCause(base)).toBeNull()
    expect(deriveDefeatCause([...base, { t: 'GAME_ENDED', status: 'won', totalScore: 100 }])).toBeNull()
  })

  it("names the enemy's move and sums the hits of that action", () => {
    const log: GameEvent[] = [
      ...base,
      { t: 'ROUND_STARTED', round: 3, apGranted: 4 },
      { t: 'ENEMY_ACTED', kind: 'multiAttack', amount: 12, label: '双牙乱撃' },
      { t: 'DAMAGE_DEALT', target: 'self', amount: 4, blocked: 0 },
      { t: 'DAMAGE_DEALT', target: 'self', amount: 4, blocked: 0 },
      { t: 'DAMAGE_DEALT', target: 'self', amount: 4, blocked: 0 },
      { t: 'GAME_ENDED', status: 'lost', totalScore: 80 },
    ]
    const c = deriveDefeatCause(log)
    expect(c).toEqual({ round: 3, label: '双牙乱撃', amount: 12, selfInflicted: false })
    expect(describeDefeatCause(c, '双牙の魔獣')).toBe('R3：双牙の魔獣の「双牙乱撃」で 120 ダメージ')
  })

  it('falls back to a generic word when the action has no label', () => {
    const log: GameEvent[] = [
      ...base,
      { t: 'ROUND_STARTED', round: 5, apGranted: 6 },
      { t: 'ENEMY_ACTED', kind: 'attack', amount: 13 },
      { t: 'DAMAGE_DEALT', target: 'self', amount: 13, blocked: 0 },
      { t: 'GAME_ENDED', status: 'lost', totalScore: 80 },
    ]
    expect(describeDefeatCause(deriveDefeatCause(log), '業斧の鬼将')).toBe('R5：業斧の鬼将の「攻撃」で 130 ダメージ')
  })

  it('detects self-inflicted losses (捨身の一撃 etc.)', () => {
    const log: GameEvent[] = [
      ...base,
      { t: 'ROUND_STARTED', round: 2, apGranted: 3 },
      { t: 'CARD_PLAYED', uid: 'u1' as never, defId: 'card_common_attack_05' as never, cost: 1 },
      { t: 'DAMAGE_DEALT', target: 'self', amount: 3, blocked: 0 },
      { t: 'GAME_ENDED', status: 'lost', totalScore: 10 },
    ]
    const c = deriveDefeatCause(log)
    expect(c?.selfInflicted).toBe(true)
    expect(describeDefeatCause(c, '試練の影')).toContain('自傷')
  })
})
