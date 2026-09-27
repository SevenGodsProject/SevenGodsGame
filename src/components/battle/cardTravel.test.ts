/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import engineSrc from '../../hooks/useGameEngine.ts?raw'
import {
  CARD_TRAVEL_ARC_MAX_PX,
  CARD_TRAVEL_END_SCALE,
  CARD_TRAVEL_LIFT_PX,
  CARD_TRAVEL_LIFT_SCALE,
  CARD_TRAVEL_MID_SCALE,
  CARD_TRAVEL_MS,
  CARD_TRAVEL_TARGET_Y,
  CARD_TRAVEL_TILT_DEG,
  planCardTravel,
  travelVector,
  type TravelRect,
} from './cardTravel'

/**
 * Card Travel v1「神へ捧げる」（docs/CARD_PLAY_TRAVEL_PRE_AUDIT.md §6-5）の契約。
 * ゴーストは commit（CARD_PLAY_REVEAL_MS）の 40ms 前に必ず終わり、transform／opacity だけで動く。
 */

// useGameEngine は React・保存・音を束ねる hook なので、定数は ?raw から読む（tapFeedback.test と同じ手法）
const CARD_PLAY_REVEAL_MS = Number(/export const CARD_PLAY_REVEAL_MS = (\d+)/.exec(engineSrc)?.[1])

// PC 1508×660（神は右上）・SP 390×844（神は中央右）の実測に近い矩形（§1 の座標）
const PC_FROM: TravelRect = { left: 449, top: 490, width: 116, height: 164 }
const PC_GOD: TravelRect = { left: 714, top: 227, width: 242, height: 168 }
const SP_FROM: TravelRect = { left: 18, top: 676, width: 100, height: 158 }
const SP_GOD: TravelRect = { left: 183, top: 418, width: 142, height: 142 }
// 神が左にある想定（dx < 0）
const LEFT_GOD: TravelRect = { left: 100, top: 227, width: 242, height: 168 }

const translateOf = (kf: Keyframe): [number, number] => {
  const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(String(kf.transform))
  if (!m) throw new Error(`translate が無い: ${String(kf.transform)}`)
  return [Number(m[1]), Number(m[2])]
}
const scaleOf = (kf: Keyframe): number => Number(/scale\((-?[\d.]+)\)/.exec(String(kf.transform))?.[1])
const rotateOf = (kf: Keyframe): number => Number(/rotate\((-?[\d.]+)deg\)/.exec(String(kf.transform))?.[1])

describe('Card Travel v1：時刻（commit の 40ms 前に必ず終わる）', () => {
  it('CARD_TRAVEL_MS + 40 <= CARD_PLAY_REVEAL_MS（280）', () => {
    expect(CARD_PLAY_REVEAL_MS).toBe(280)
    expect(CARD_TRAVEL_MS).toBe(240)
    expect(CARD_TRAVEL_MS + 40).toBeLessThanOrEqual(CARD_PLAY_REVEAL_MS)
  })

  it('定数は §6-1 のとおり', () => {
    expect(CARD_TRAVEL_LIFT_PX).toBe(16)
    expect(CARD_TRAVEL_LIFT_SCALE).toBe(1.1)
    expect(CARD_TRAVEL_ARC_MAX_PX).toBe(40)
    expect(CARD_TRAVEL_MID_SCALE).toBe(0.42)
    expect(CARD_TRAVEL_END_SCALE).toBe(0.22)
    expect(CARD_TRAVEL_TILT_DEG).toBe(10)
    expect(CARD_TRAVEL_TARGET_Y).toBe(0.45)
  })
})

describe('Card Travel v1：keyframes（transform／opacity のみ・単調・終点は神の胸元）', () => {
  const kf = planCardTravel(PC_FROM, 116, PC_GOD)

  it('プロパティは transform・opacity（＋offset・easing）だけ', () => {
    for (const k of kf) {
      const keys = Object.keys(k).filter((x) => x !== 'offset' && x !== 'easing')
      expect(keys.sort()).toEqual(['opacity', 'transform'])
    }
  })

  it('offset は 0→1 で単調増加・5 点（0／0.25／0.55／0.85／1）', () => {
    const offsets = kf.map((k) => Number(k.offset))
    expect(offsets).toEqual([0, 0.25, 0.55, 0.85, 1])
    for (let i = 1; i < offsets.length; i++) expect(offsets[i]).toBeGreaterThan(offsets[i - 1])
  })

  it('最後は opacity 0・translate(dx, dy)・scale 0.22。到着（0.85）と終点の translate は同じ', () => {
    const v = travelVector(PC_FROM, 116, PC_GOD)
    const last = kf[kf.length - 1]
    expect(last.opacity).toBe(0)
    expect(translateOf(last)).toEqual([v.dx, v.dy])
    expect(scaleOf(last)).toBe(CARD_TRAVEL_END_SCALE)
    expect(translateOf(kf[3])).toEqual([v.dx, v.dy])
    expect(scaleOf(kf[3])).toBe(CARD_TRAVEL_MID_SCALE)
    // 途中は不透明のまま（吸い込みの最後だけ消える）
    expect(kf.slice(0, 4).every((k) => k.opacity === 1)).toBe(true)
  })

  it('dx・dy は from の中心 → 神の（中心 x・上から 45%）', () => {
    const v = travelVector(PC_FROM, 116, PC_GOD)
    expect(v.dx).toBeCloseTo(714 + 121 - (449 + 58), 1)
    expect(v.dy).toBeCloseTo(227 + 168 * 0.45 - (490 + 82), 1)
    expect(Math.hypot(v.dx, v.dy)).toBeGreaterThan(300)
  })

  it('持ち上げ（0.25）は上へ 16px・×1.1・傾き 0', () => {
    expect(translateOf(kf[1])).toEqual([0, -CARD_TRAVEL_LIFT_PX])
    expect(scaleOf(kf[1])).toBe(CARD_TRAVEL_LIFT_SCALE)
    expect(rotateOf(kf[1])).toBe(0)
    expect(translateOf(kf[0])).toEqual([0, 0])
  })

  it('傾きは神の側：dx > 0 で正（PC・SP とも神は右）、dx < 0 で負', () => {
    for (const [from, god] of [
      [PC_FROM, PC_GOD],
      [SP_FROM, SP_GOD],
    ] as const) {
      const k = planCardTravel(from, from.width, god)
      expect(travelVector(from, from.width, god).dx).toBeGreaterThan(0)
      expect(rotateOf(k[2])).toBe(6)
      expect(rotateOf(k[3])).toBe(CARD_TRAVEL_TILT_DEG)
      expect(rotateOf(k[4])).toBe(CARD_TRAVEL_TILT_DEG)
    }
    const left = planCardTravel(PC_FROM, 116, LEFT_GOD)
    expect(travelVector(PC_FROM, 116, LEFT_GOD).dx).toBeLessThan(0)
    expect(rotateOf(left[2])).toBe(-6)
    expect(rotateOf(left[3])).toBe(-CARD_TRAVEL_TILT_DEG)
  })

  it('弧の高さは 40px 以下（長距離でも暴れない）・中間点（0.55）は直線より arc だけ上', () => {
    const far = travelVector({ left: 0, top: 2000, width: 100, height: 150 }, 100, { left: 1500, top: 0, width: 200, height: 200 })
    expect(far.arc).toBe(CARD_TRAVEL_ARC_MAX_PX)
    const near = travelVector(SP_FROM, 100, SP_GOD)
    expect(near.arc).toBeLessThanOrEqual(CARD_TRAVEL_ARC_MAX_PX)
    expect(near.arc).toBeCloseTo(Math.hypot(near.dx, near.dy) * 0.1, 1)
    const v = travelVector(PC_FROM, 116, PC_GOD)
    const [mx, my] = translateOf(kf[2])
    expect(mx).toBeCloseTo(v.dx * 0.45, 1)
    expect(my).toBeCloseTo(v.dy * 0.55 - v.arc, 1)
  })

  it('s0 は from.width / baseWidth（hover・READY の scale を引き継いで最初のフレームで跳ねない）', () => {
    const hovered = { ...PC_FROM, width: 116 * 1.04, height: 164 * 1.04 }
    const k = planCardTravel(hovered, 116, PC_GOD)
    expect(scaleOf(k[0])).toBe(1.04)
    expect(travelVector(PC_FROM, 116, PC_GOD).s0).toBe(1)
    // baseWidth 0（万一）でも NaN にしない
    expect(travelVector(PC_FROM, 0, PC_GOD).s0).toBe(1)
  })
})

describe('Card Travel v1：cardTravel.css の契約（battle.css は触らない）', () => {
  const raw = readFileSync(fileURLToPath(new URL('./cardTravel.css', import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')
  const body = (selector: string): string => {
    const re = new RegExp(`${selector.replace(/[.[\]*+?^${}()|\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`)
    const m = re.exec(css)
    if (!m) throw new Error(`規則が無い: ${selector}`)
    return m[1]
  }

  it('ゴースト：fixed・z-index 7（cast-flash 8 の下・報酬 9 の下）・pointer-events none・translate／scale none', () => {
    const g = body('body .card-view.card-travel-ghost')
    expect(g).toMatch(/position:\s*fixed/)
    expect(g).toMatch(/z-index:\s*7\b/)
    expect(g).toMatch(/pointer-events:\s*none/)
    expect(g).toMatch(/translate:\s*none/)
    expect(g).toMatch(/scale:\s*none/)
    expect(g).toMatch(/transition:\s*none/)
    expect(g).toMatch(/will-change:\s*transform,\s*opacity/)
    // 位置・寸法は inline（useCardTravel）で決めるので CSS では width／height／left／top を持たない
    expect(g).not.toMatch(/\b(width|height|left|top):/)
  })

  it('元カード：[data-travel] で card-play を止めてその場で不可視（詳細度 0,3,0）', () => {
    const s = body('.card-view.card-view-playing[data-travel]')
    expect(s).toMatch(/animation:\s*none/)
    expect(s).toMatch(/opacity:\s*0\b/)
  })

  it('reduced-motion：元カードは 120ms の opacity フェードだけ（translate／scale を動かさない）', () => {
    expect(css).toMatch(/@keyframes card-play-reduced\s*\{\s*from\s*\{\s*opacity:\s*1;\s*\}\s*to\s*\{\s*opacity:\s*0;\s*\}\s*\}/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.card-view\.card-view-playing\s*\{\s*animation:\s*card-play-reduced 0\.12s linear forwards;\s*\}\s*\}/)
    expect(css).not.toMatch(/transform:/)
  })

  it('battle.css・CardView.tsx の名前に依存する選択子だけを使う（.hand の中には入れない）', () => {
    expect(css).not.toMatch(/\.hand\b/)
    expect(css).toMatch(/\.card-view\.card-travel-ghost \.card-view-shine\s*\{\s*display:\s*none;\s*\}/)
  })
})
