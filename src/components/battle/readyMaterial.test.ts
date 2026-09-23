import { describe, expect, it } from 'vitest'
import { getCardDef } from '../../core/data/cards'
import {
  READY_IGNITE_BASE_DELAY_MS,
  READY_IGNITE_STAGGER_MS,
  READY_MATERIAL_PILOT,
  readyIgniteDelays,
  shouldIgnite,
} from './readyMaterial'

describe('決定224 READY material', () => {
  it('Pilot は大耀『豪快な一撃』1 枚だけで、実在し条件⚡を持つ', () => {
    expect([...READY_MATERIAL_PILOT]).toEqual(['card_taiyo_attack_01'])
    for (const id of READY_MATERIAL_PILOT) {
      const def = getCardDef(id)
      expect(def.name).toBe('豪快な一撃')
      expect(def.bonus?.when).toBe('charged')
    }
  })

  it('点火は false→true だけ（初回・持続・解除では点火しない＝再点火しない）', () => {
    expect(shouldIgnite(false, true)).toBe(true)
    expect(shouldIgnite(undefined, true)).toBe(false)
    expect(shouldIgnite(true, true)).toBe(false)
    expect(shouldIgnite(true, false)).toBe(false)
    expect(shouldIgnite(false, false)).toBe(false)
  })

  it('同時に成立した Pilot カードは手札順に 90ms ずらす（最大 1 段）。対象外・不成立は遅延なし', () => {
    const delays = readyIgniteDelays([
      { uid: 'a', armed: true, pilot: false },
      { uid: 'b', armed: true, pilot: true },
      { uid: 'c', armed: false, pilot: true },
      { uid: 'd', armed: true, pilot: true },
      { uid: 'e', armed: true, pilot: true },
    ])
    expect(delays.get('a')).toBeUndefined()
    expect(delays.get('c')).toBeUndefined()
    expect(delays.get('b')).toBe(READY_IGNITE_BASE_DELAY_MS)
    expect(delays.get('d')).toBe(READY_IGNITE_BASE_DELAY_MS + READY_IGNITE_STAGGER_MS)
    expect(delays.get('e')).toBe(READY_IGNITE_BASE_DELAY_MS + READY_IGNITE_STAGGER_MS)
  })
})
