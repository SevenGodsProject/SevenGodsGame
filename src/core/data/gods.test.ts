import { describe, expect, it } from 'vitest'
import { GODS } from './gods'
import { OTOMOS } from './otomo'
import { OTOMO_FORM_ORDER } from '../types/otomo'
import type { GodArchetype } from '../types/god'

const VALID_ARCHETYPES: GodArchetype[] = ['attack', 'defense', 'support', 'technique', 'balance']

describe('GODS', () => {
  it('has a unique id per god', () => {
    const ids = GODS.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every god at least one resonance effect', () => {
    for (const god of GODS) {
      expect(god.resonanceEffects.length).toBeGreaterThan(0)
    }
  })

  it('gives every god a valid archetype', () => {
    for (const god of GODS) {
      expect(VALID_ARCHETYPES).toContain(god.archetype)
    }
  })

  it('has exactly one otomo per god', () => {
    const godIds = new Set(GODS.map((g) => g.id))
    const otomoGodIds = OTOMOS.map((o) => o.godId)
    expect(new Set(otomoGodIds).size).toBe(otomoGodIds.length)
    for (const godId of otomoGodIds) {
      expect(godIds.has(godId)).toBe(true)
    }
  })
})

describe('OTOMOS', () => {
  it('has a unique id per otomo', () => {
    const ids = OTOMOS.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('defines effectsByForm for every form, with spirit contributing nothing (決定19)', () => {
    for (const otomo of OTOMOS) {
      for (const form of OTOMO_FORM_ORDER) {
        expect(otomo.effectsByForm[form]).toBeDefined()
      }
      expect(otomo.effectsByForm.spirit.length).toBe(0)
    }
  })

  it('defines powerPathEffectsByForm for every form, with spirit contributing nothing (決定44)', () => {
    for (const otomo of OTOMOS) {
      for (const form of OTOMO_FORM_ORDER) {
        expect(otomo.powerPathEffectsByForm[form]).toBeDefined()
      }
      expect(otomo.powerPathEffectsByForm.spirit.length).toBe(0)
      // incarnate・dojiは何らかの効果を持つ（守りの絆と同じ形をしている）
      expect(otomo.powerPathEffectsByForm.incarnate.length).toBeGreaterThan(0)
      expect(otomo.powerPathEffectsByForm.doji.length).toBeGreaterThan(0)
    }
  })
})
