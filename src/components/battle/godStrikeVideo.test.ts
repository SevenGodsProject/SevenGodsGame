import { describe, expect, it } from 'vitest'
import {
  GOD_STRIKE_VIDEO_FALLBACK_MS,
  GOD_STRIKE_VIDEO_MS,
  GOD_STRIKE_VIDEO_SRC,
  VIDEO_READY_STATE_MIN,
  createGodStrikeVideoPreload,
  isGodStrikeVideoReady,
} from './godStrikeVideo'
import { BURST_GOD_ATTACK_MS, BURST_IMPACT_MS, BURST_READY_LEAD_MS, RESONANCE_CUTIN_MS } from './enemyVfxTiming'
import { CUTIN_FALLBACK_MS } from './BattleResonanceCutin'
import { GOD_IDS } from '../../core/data/gods'

describe('決定250 God Strike Premium Cut-in v1（大耀のみ・presentation only）', () => {
  it('Pilot の動画は大耀 1 柱だけ（他 6 神へは展開しない）', () => {
    expect(Object.keys(GOD_STRIKE_VIDEO_SRC)).toEqual([GOD_IDS.taiyo])
    expect(GOD_STRIKE_VIDEO_SRC[GOD_IDS.taiyo]).toBe('/assets/gods/taiyo/god-strike-v1.mp4')
  })

  it('採用判定：reduced-motion・未先読み・error・readyState 不足はすべて静止カットイン', () => {
    expect(isGodStrikeVideoReady(null, false)).toBe(false)
    expect(isGodStrikeVideoReady(undefined, false)).toBe(false)
    expect(isGodStrikeVideoReady({ readyState: 4, error: null }, true)).toBe(false)
    expect(isGodStrikeVideoReady({ readyState: 4, error: { code: 4 } }, false)).toBe(false)
    expect(isGodStrikeVideoReady({ readyState: VIDEO_READY_STATE_MIN - 1, error: null }, false)).toBe(false)
    expect(isGodStrikeVideoReady({ readyState: VIDEO_READY_STATE_MIN, error: null }, false)).toBe(true)
    expect(isGodStrikeVideoReady({ readyState: 4, error: null }, false)).toBe(true)
  })

  it('先読みはブラウザ外・reduced・対象外の神では作らない', () => {
    expect(typeof document).toBe('undefined')
    expect(createGodStrikeVideoPreload(GOD_IDS.taiyo, false)).toBeNull()
    expect(createGodStrikeVideoPreload(GOD_IDS.taiyo, true)).toBeNull()
    expect(createGodStrikeVideoPreload(GOD_IDS.ebisu, false)).toBeNull()
    expect(createGodStrikeVideoPreload(undefined, false)).toBeNull()
  })

  it('既存 God Strike timeline は不変：動画はロック解除（1,100）の後・着弾（1,600）の前に終わる', () => {
    expect(BURST_READY_LEAD_MS).toBe(200)
    expect(RESONANCE_CUTIN_MS).toBe(900)
    expect(BURST_GOD_ATTACK_MS).toBe(1300)
    expect(BURST_IMPACT_MS).toBe(1600)
    const lockRelease = BURST_READY_LEAD_MS + RESONANCE_CUTIN_MS
    const videoEnd = BURST_READY_LEAD_MS + GOD_STRIKE_VIDEO_MS
    expect(videoEnd).toBeGreaterThan(lockRelease)
    expect(videoEnd).toBeLessThan(BURST_IMPACT_MS)
    // 安全弁は onComplete（900ms）と同じ長さ。overlay は pointer-events:none なので着弾を跨いでも操作・着弾時刻に影響しない
    expect(GOD_STRIKE_VIDEO_FALLBACK_MS).toBe(CUTIN_FALLBACK_MS)
  })
})
