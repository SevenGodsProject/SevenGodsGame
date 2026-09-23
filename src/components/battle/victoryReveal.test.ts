import { describe, expect, it } from 'vitest'
import { GODS } from '../../core/data/gods'
import { GOD_THEME_COLOR, KEYVISUAL_OBJECT_POSITION } from '../setup/godStyle'
import { planVictory } from './combatTimeline'
import { FINAL_HIT_STOP_MS } from './enemyVfxTiming'
import { resolveVictorySkip, type VictoryPhase } from './useCombatPresentation'
import { isStagedSkipTarget } from './victoryReveal'

describe('決定226 Victory Reveal v1', () => {
  it('skip は「撃破」の拍（beat）の間だけ done へ進む。それ以外の段階では何もしない', () => {
    expect(resolveVictorySkip('beat')).toBe('done')
    const others: VictoryPhase[] = ['none', 'finishing', 'collapse', 'done']
    for (const p of others) expect(resolveVictorySkip(p)).toBe(p)
  })

  it('結果の段階表示の skip は、ボタン・リンク・折りたたみを押したときには発火しない', () => {
    const hitsControl = { closest: () => ({}) } as unknown as EventTarget
    const plainArea = { closest: () => null } as unknown as EventTarget
    expect(isStagedSkipTarget(hitsControl)).toBe(false)
    expect(isStagedSkipTarget(plainArea)).toBe(true)
    expect(isStagedSkipTarget(null)).toBe(false)
    expect(isStagedSkipTarget({} as EventTarget)).toBe(false)
  })

  it('7 神すべてで舞台に必要な素材（keyvisual・円の切り抜き位置・神色）が揃っている', () => {
    const shipped = Object.keys(import.meta.glob('../../../public/assets/gods/*/keyvisual.webp')).map((k) => k.replace('../../../public', ''))
    expect(GODS).toHaveLength(7)
    for (const god of GODS) {
      expect(shipped, `${god.nameJa} keyvisual`).toContain(god.art.keyvisual)
      expect(KEYVISUAL_OBJECT_POSITION[god.id], god.nameJa).toBeTruthy()
      expect(GOD_THEME_COLOR[god.id]?.base, god.nameJa).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('勝利の時刻表は変えていない（追加の強制待機 0ms）：着弾 90＋stop 90 → 崩壊 350 → 拍 730 → 結果 1,580', () => {
    const tl = planVictory({ atMs: 90, stopMs: FINAL_HIT_STOP_MS })
    expect(tl.collapseStartMs).toBe(350)
    expect(tl.beatStartMs).toBe(730)
    expect(tl.rewardMs).toBe(1580)
    const reduced = planVictory({ atMs: 90, stopMs: FINAL_HIT_STOP_MS }, true)
    expect(reduced.rewardMs).toBe(90 + 0 + 120 + 200 + 600)
  })
})
