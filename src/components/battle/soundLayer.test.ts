import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import battleSoundSrc from './useBattleSound.ts?raw'
import { planSoundLayer, SE_GAIN, SOUND_LAYER } from './feelTier'
import {
  BURST_GOD_ATTACK_MS,
  BURST_HIT_STOP_MS,
  BURST_IMPACT_MS,
  ENEMY_CUTIN_TOTAL_MS,
  MULTI_CUTIN_LEAD_MS,
  RESONANCE_CUTIN_MS,
  SPECIAL_IMPACT_MS,
} from './enemyVfxTiming'

/**
 * 決定257 Sound Layer v1（docs/DECISION257_SOUND_LAYER_V1_PILOT.md）の回帰テスト。
 * rise SE 2 本の予約時刻・音量、BGM duck（GainNode）の曲線・合流・残留 0・fallback を固定する。
 */
describe('決定257：既存の時刻表は不変（音は載せるだけ）', () => {
  it('決定250／252 の時刻定数', () => {
    expect(RESONANCE_CUTIN_MS).toBe(900)
    expect(BURST_GOD_ATTACK_MS).toBe(1300)
    expect(BURST_IMPACT_MS).toBe(1600)
    expect(BURST_HIT_STOP_MS).toBe(80)
    expect(ENEMY_CUTIN_TOTAL_MS).toBe(1050)
    expect(SPECIAL_IMPACT_MS).toBe(1260)
    expect(MULTI_CUTIN_LEAD_MS).toBe(1100)
  })
})

describe('決定257：planSoundLayer', () => {
  const base = { burst: false, burstImpactMs: BURST_IMPACT_MS, enemyUltimate: false, enemyFirstImpactMs: SPECIAL_IMPACT_MS, enemyLastImpactMs: SPECIAL_IMPACT_MS }
  it('神の一撃：rise は T+450（突き 1,300 の前）・duck は着弾 1,600＋300＝1,900 まで', () => {
    const p = planSoundLayer({ ...base, burst: true })
    expect(p.rise).toEqual({ name: 'burst_rise', delayMs: 450 })
    expect(p.duckHoldMs).toBe(1900)
    // rise（900ms）は着弾より前に鳴り終わる＝impact を鳴らさない
    expect(p.rise!.delayMs + 900).toBeLessThan(BURST_IMPACT_MS)
  })
  it('敵の必殺（special）：rise は commit+200・着弾 1,260 の 60ms 前に消える・duck 1,560', () => {
    const p = planSoundLayer({ ...base, enemyUltimate: true })
    expect(p.rise).toEqual({ name: 'enemy_rise', delayMs: 200 })
    expect(p.rise!.delayMs + 1000).toBe(SPECIAL_IMPACT_MS - 60)
    expect(p.duckHoldMs).toBe(1560)
  })
  it('技名付き連撃：最初の着弾 1,100 基準で rise、最後の着弾 1,600＋300 まで duck', () => {
    const p = planSoundLayer({ ...base, enemyUltimate: true, enemyFirstImpactMs: 1100, enemyLastImpactMs: 1600 })
    expect(p.rise).toEqual({ name: 'enemy_rise', delayMs: 40 })
    expect(p.duckHoldMs).toBe(1900)
  })
  it('通常（一撃・必殺なし）：rise 0・duck 0', () => {
    expect(planSoundLayer(base)).toEqual({ rise: null, duckHoldMs: null })
  })
  it('音量：rise は ≤0.8・着弾（impact[4]）未満。duck の実効は 0.35→0.12', () => {
    for (const g of Object.values(SOUND_LAYER.riseGain)) {
      expect(g).toBeLessThanOrEqual(0.8)
      expect(g).toBeLessThan(SE_GAIN.impact[4])
    }
    expect(0.35 * SOUND_LAYER.duckLevel).toBeCloseTo(0.12, 5)
    expect(SOUND_LAYER.duckRampInMs).toBeGreaterThanOrEqual(40)
    expect(SOUND_LAYER.duckRampInMs).toBeLessThanOrEqual(80)
    expect(SOUND_LAYER.duckRampOutMs).toBeGreaterThanOrEqual(300)
    expect(SOUND_LAYER.duckRampOutMs).toBeLessThanOrEqual(400)
  })
})

describe('決定257：useBattleSound の配線（source pin）', () => {
  it('rise と duck は planSoundLayer の結果だけで鳴らし、unmount で duck を解除する', () => {
    expect(battleSoundSrc).toMatch(/planSoundLayer\(/)
    expect(battleSoundSrc).toMatch(/sfx\.burstRise\(layer\.rise\.delayMs\)/)
    expect(battleSoundSrc).toMatch(/sfx\.enemyRise\(layer\.rise\.delayMs\)/)
    expect(battleSoundSrc).toMatch(/duckBgm\(layer\.duckHoldMs\)/)
    expect(battleSoundSrc).toMatch(/useEffect\(\(\) => \(\) => releaseBgmDuck\(\), \[\]\)/)
  })
})

// ---- BGM duck の振る舞い：偽の AudioContext／Audio で GainNode の予約を再生する ----
type Ev = { type: 'set' | 'ramp'; v: number; t: number }
let now = 0
let ctxState = 'running'
let createSourceThrows = false
let createdGains = 0

class FakeParam {
  base = 1
  events: Ev[] = []
  get value() {
    return this.valueAt(now)
  }
  set value(v: number) {
    this.base = v
    this.events = []
  }
  setValueAtTime(v: number, t: number) {
    this.events.push({ type: 'set', v, t })
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.events.push({ type: 'ramp', v, t })
  }
  cancelScheduledValues(t: number) {
    this.base = this.valueAt(t)
    this.events = this.events.filter((e) => e.t < t)
  }
  /** Web Audio の自動化（set／linear ramp）を時刻 t で評価する */
  valueAt(t: number): number {
    let v = this.base
    let prevT = 0
    for (const e of [...this.events].sort((a, b) => a.t - b.t)) {
      if (e.t <= t) {
        v = e.v
        prevT = e.t
        continue
      }
      if (e.type === 'ramp') {
        const k = (t - prevT) / (e.t - prevT)
        return v + (e.v - v) * Math.max(0, Math.min(1, k))
      }
      break
    }
    return v
  }
}

class FakeCtx {
  destination = {}
  get state() {
    return ctxState
  }
  get currentTime() {
    return now
  }
  resume() {
    return Promise.resolve()
  }
  createGain() {
    createdGains += 1
    return { gain: new FakeParam(), context: this, connect() {} }
  }
  createMediaElementSource() {
    if (createSourceThrows) throw new Error('InvalidStateError')
    return { connect() {} }
  }
}

class FakeAudio {
  loop = false
  volume = 1
  muted = false
  paused = true
  src = ''
  currentTime = 0
  onended: null | (() => void) = null
  play() {
    this.paused = false
    return Promise.resolve()
  }
  pause() {
    this.paused = true
  }
}

async function freshBgm() {
  vi.resetModules()
  return import('./bgm')
}

describe('決定257：BGM duck（GainNode）', () => {
  beforeEach(() => {
    now = 10
    ctxState = 'running'
    createSourceThrows = false
    createdGains = 0
    vi.stubGlobal('window', { AudioContext: FakeCtx })
    vi.stubGlobal('Audio', FakeAudio)
    vi.stubGlobal('document', { createElement: () => ({ canPlayType: () => '' }), addEventListener() {}, removeEventListener() {} })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('神の一撃：0→60ms で 0.343 へ、1,900ms まで保持、2,200ms で 1.0 に戻る', async () => {
    const bgm = await freshBgm()
    bgm.playTrack('battle')
    expect(bgm.duckBgm(1900)).toBe(true)
    const at = (ms: number) => {
      now = 10 + ms / 1000
      return bgm.getBgmGainValue()!
    }
    expect(at(0)).toBeCloseTo(1, 5)
    expect(at(60)).toBeCloseTo(SOUND_LAYER.duckLevel, 5)
    expect(at(1000)).toBeCloseTo(SOUND_LAYER.duckLevel, 5)
    expect(at(1900)).toBeCloseTo(SOUND_LAYER.duckLevel, 5)
    expect(at(2050)).toBeGreaterThan(SOUND_LAYER.duckLevel)
    expect(at(2200)).toBeCloseTo(1, 5)
    expect(at(5000)).toBeCloseTo(1, 5)
  })

  it('連続発火（一撃の直後に必殺）：最後の復帰時刻に 1 本で合流し、残留しない。GainNode は 1 つだけ', async () => {
    const bgm = await freshBgm()
    bgm.playTrack('battle')
    bgm.duckBgm(1900)
    now = 10 + 1.8 // 一撃の 1,800ms 後に必殺の commit
    bgm.duckBgm(1560)
    now = 10 + 1.8 + 1.0
    expect(bgm.getBgmGainValue()).toBeCloseTo(SOUND_LAYER.duckLevel, 5)
    now = 10 + 1.8 + 1.56 + 0.3
    expect(bgm.getBgmGainValue()).toBeCloseTo(1, 5)
    now = 100
    expect(bgm.getBgmGainValue()).toBeCloseTo(1, 5)
    expect(createdGains).toBe(1)
  })

  it('短い duck が長い duck の途中に来ても、長い方の復帰時刻まで下げたまま', async () => {
    const bgm = await freshBgm()
    bgm.playTrack('battle')
    bgm.duckBgm(1900)
    now = 10.1
    bgm.duckBgm(300)
    now = 10 + 1.5
    expect(bgm.getBgmGainValue()).toBeCloseTo(SOUND_LAYER.duckLevel, 5)
    now = 10 + 2.2
    expect(bgm.getBgmGainValue()).toBeCloseTo(1, 5)
  })

  it('Retry／画面離脱：releaseBgmDuck で 120ms 後に 1.0（残留 0）', async () => {
    const bgm = await freshBgm()
    bgm.playTrack('battle')
    bgm.duckBgm(1900)
    now = 10.5
    bgm.releaseBgmDuck()
    now = 10.62
    expect(bgm.getBgmGainValue()).toBeCloseTo(1, 5)
    now = 12
    expect(bgm.getBgmGainValue()).toBeCloseTo(1, 5)
  })

  it('fallback：BGM 未再生・BGM ミュート・AudioContext suspended・経路作成の失敗では duck しない（例外 0）', async () => {
    let bgm = await freshBgm()
    expect(bgm.duckBgm(1900)).toBe(false) // 未再生
    bgm.playTrack('battle')
    bgm.setBgmMuted(true)
    expect(bgm.duckBgm(1900)).toBe(false)
    bgm.setBgmMuted(false)
    ctxState = 'suspended'
    expect(bgm.duckBgm(1900)).toBe(false)
    expect(bgm.getBgmGainValue()).toBeNull()

    bgm = await freshBgm()
    ctxState = 'running'
    createSourceThrows = true
    bgm.playTrack('battle')
    expect(() => bgm.duckBgm(1900)).not.toThrow()
    expect(bgm.duckBgm(1900)).toBe(false)
    expect(bgm.getBgmGainValue()).toBeNull()
  })

  it('AudioContext が無い環境：duck しない・例外 0', async () => {
    vi.stubGlobal('window', {})
    const bgm = await freshBgm()
    bgm.playTrack('battle')
    expect(() => bgm.duckBgm(1900)).not.toThrow()
    expect(bgm.duckBgm(1900)).toBe(false)
    expect(() => bgm.releaseBgmDuck()).not.toThrow()
  })

  it('ジングル：開始で duck を解除し、終了後は 0→1.0 を 400ms でフェードインして再開する', async () => {
    vi.useFakeTimers()
    const bgm = await freshBgm()
    bgm.playTrack('battle')
    bgm.duckBgm(1900)
    now = 10.5
    bgm.playJingle('victory')
    expect(bgm.getBgmGainValue()).toBeCloseTo(1, 5)
    expect(bgm.duckBgm(1900)).toBe(false) // ジングル中（BGM 停止中）は duck しない
    // 決定54 の上限 9,000ms → 500ms フェード → BGM 再開
    vi.advanceTimersByTime(9000 + 600)
    expect(bgm.getBgmGainValue()).toBeCloseTo(0, 5)
    now = 10.5 + 0.2
    expect(bgm.getBgmGainValue()).toBeCloseTo(0.5, 5)
    now = 10.5 + 0.4
    expect(bgm.getBgmGainValue()).toBeCloseTo(1, 5)
  })
})
