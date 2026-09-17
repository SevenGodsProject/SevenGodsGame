import { describe, expect, it } from 'vitest'
import type { GodId } from '../../core/types'
import { GODS, GOD_IDS } from '../../core/data/gods'
import { HERO_GOD_FALLBACK, heroImageOf, selectHeroGod } from './heroGod'
import { HOME_HERO_ART } from './godStyle'

/** Phase 7 Entrance E1（決定193・仕様 §3）：Home の Hero God の決め方 */
describe('selectHeroGod', () => {
  it('続き（canResume）の神を最優先する', () => {
    const r = selectHeroGod({ resumeGodId: GOD_IDS.taiyo, lastUsedGodId: GOD_IDS.sobi })
    expect(r.god.id).toBe(GOD_IDS.taiyo)
    expect(r.source).toBe('resume')
  })

  it('続きが無ければ、最後にデッキを確定した神', () => {
    const r = selectHeroGod({ resumeGodId: null, lastUsedGodId: GOD_IDS.shouren })
    expect(r.god.id).toBe(GOD_IDS.shouren)
    expect(r.source).toBe('lastUsed')
  })

  it('どちらも無ければ恵比寿（E1 以前の Home と同じ神）', () => {
    const r = selectHeroGod({ resumeGodId: null, lastUsedGodId: null })
    expect(HERO_GOD_FALLBACK).toBe(GOD_IDS.ebisu)
    expect(r.god.id).toBe(GOD_IDS.ebisu)
    expect(r.source).toBe('fallback')
  })

  it('未知の神 ID は投げずに次の規則へ落とす（続きが未知 → 最後に使った神 → 恵比寿）', () => {
    const unknown = 'not_a_god' as GodId
    expect(selectHeroGod({ resumeGodId: unknown, lastUsedGodId: GOD_IDS.saika }).god.id).toBe(GOD_IDS.saika)
    expect(() => selectHeroGod({ resumeGodId: unknown, lastUsedGodId: unknown })).not.toThrow()
    expect(selectHeroGod({ resumeGodId: unknown, lastUsedGodId: unknown }).god.id).toBe(GOD_IDS.ebisu)
    expect(selectHeroGod({ resumeGodId: '' as GodId, lastUsedGodId: '__proto__' as GodId }).god.id).toBe(GOD_IDS.ebisu)
  })

  it('7 柱すべてに Hero 画像の寸法と切り出し位置がある（実画像の縦横比と一致）', () => {
    for (const god of GODS) {
      const img = heroImageOf(god)
      expect(img.src).toMatch(new RegExp(`^/assets/gods/${god.id}/keyvisual(-hero|-home)?\\.webp$`))
      expect(img.width).toBeGreaterThan(0)
      expect(img.height).toBeGreaterThan(0)
      expect(img.focus).toMatch(/^\d+% \d+%$/)
      expect(HOME_HERO_ART[god.id]).toBeDefined()
    }
    // 恵比寿は E1 以前の Home と同じ高画質版（LCP の素材を変えない）
    expect(heroImageOf(GODS.find((g) => g.id === GOD_IDS.ebisu)!).src).toBe('/assets/gods/ebisu/keyvisual-hero.webp')
  })
})
