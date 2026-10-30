import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import enemyPanelSrc from './EnemyPanel.tsx?raw'
import enemyBreakSrc from './enemyBreak.ts?raw'
import battleSoundSrc from './useBattleSound.ts?raw'
import { BREAK_SE, SE_GAIN, VOICE_LAYER } from './feelTier'
import { INITIAL_ENEMY_BREAK, breakSeToPlay, nextEnemyBreak, shouldPlayBreakSe, type EnemyBreakFx } from './enemyBreak'
import { HIT_STOP_MS, HP_LAG_MS } from './enemyVfxTiming'

/**
 * Enemy Break SE v1（v1.0.5・docs/V1_0_5_BREAK_SE_V1.md）の回帰テスト。
 * 表示 HP が 50%／25% の帯をまたいで崩れた瞬間に、既存 `enemy_charge` を低い速度で 1 回だけ鳴らす。
 * 新規音源 0・着弾時刻表（combatTimeline／enemyVfxTiming）0 変更。
 */
describe('Enemy Break SE v1：数値', () => {
  it('half 0.7／quarter 0.6、専用係数 0.55（master 後 0.4675）', () => {
    expect(BREAK_SE.rate).toEqual({ half: 0.7, quarter: 0.6 })
    expect(BREAK_SE.gain).toBe(0.55)
    expect(BREAK_SE.gain * SE_GAIN.master).toBeCloseTo(0.4675, 5)
  })
  it('音量の階層：溜め予告より大きく、L2 着弾・公式ボイスより小さい（stateChange は流用しない）', () => {
    const eff = BREAK_SE.gain * SE_GAIN.master
    expect(eff).toBeGreaterThan(SE_GAIN.warning * SE_GAIN.master)
    expect(eff).toBeLessThan(SE_GAIN.impact[2] * SE_GAIN.master)
    expect(eff).toBeLessThan(VOICE_LAYER.gain * SE_GAIN.master)
    expect(BREAK_SE.gain).not.toBe(SE_GAIN.stateChange)
  })
})

describe('Enemy Break SE v1：shouldPlayBreakSe／breakSeToPlay（純関数）', () => {
  it('通常は half・quarter とも鳴る。溜め予告中は half 0 回・quarter 1 回', () => {
    expect(shouldPlayBreakSe('half', false)).toBe(true)
    expect(shouldPlayBreakSe('quarter', false)).toBe(true)
    expect(shouldPlayBreakSe('half', true)).toBe(false)
    expect(shouldPlayBreakSe('quarter', true)).toBe(true)
  })

  it('1 戦の帯の遷移（high→half→quarter→撃破）で崩し 1 回につき 1 回だけ鳴る', () => {
    // EnemyPanel の描画列を模す：描画ごとに breakSeToPlay を呼び、鳴らしたら playedKey を進める
    const played: string[] = []
    let fx: EnemyBreakFx = INITIAL_ENEMY_BREAK
    let playedKey = 0
    const render = (charging = false) => {
      const lv = breakSeToPlay(fx, playedKey, charging)
      if (fx.key > playedKey) playedKey = fx.key
      if (lv) played.push(lv)
    }
    render() // 初回（key 0）は鳴らない
    fx = nextEnemyBreak(fx, 'high', 'half', false)
    render()
    render() // 同じ key の再描画では鳴らない
    render(true) // 溜め予告が後から付いても鳴らし直さない
    fx = nextEnemyBreak(fx, 'half', 'quarter', false)
    render()
    fx = nextEnemyBreak(fx, 'quarter', 'quarter', true) // 撃破の一撃（suppress）
    render()
    expect(played).toEqual(['half', 'quarter'])
  })

  it('一撃で high→quarter は quarter を 1 回だけ。帯が上がった（新しい対局）描画では鳴らない', () => {
    const fx = nextEnemyBreak(INITIAL_ENEMY_BREAK, 'high', 'quarter', false)
    expect(breakSeToPlay(fx, 0, false)).toBe('quarter')
    expect(breakSeToPlay(fx, 1, false)).toBeNull()
    const up = nextEnemyBreak(fx, 'quarter', 'high', false)
    expect(breakSeToPlay(up, 0, false)).toBeNull()
  })

  it('溜め予告中の half は鳴らさないが、playedKey は進めてよい（後で鳴らし直さない）', () => {
    const fx = nextEnemyBreak(INITIAL_ENEMY_BREAK, 'high', 'half', false)
    expect(breakSeToPlay(fx, 0, true)).toBeNull()
    expect(breakSeToPlay(fx, 1, false)).toBeNull()
  })
})

describe('Enemy Break SE v1：配線（source pin）と時刻表不変', () => {
  it('EnemyPanel は崩しの状態と溜め予告の同じ真偽値を hook に渡す', () => {
    expect(enemyPanelSrc).toMatch(/const charging = enemy\.intent\?\.kind === 'charge'/)
    expect(enemyPanelSrc).toMatch(/useEnemyBreakSe\(brk, charging\)/)
  })
  it('hook は useLayoutEffect で即時に鳴らし、timer を作らない', () => {
    const hook = enemyBreakSrc.slice(enemyBreakSrc.indexOf('export function useEnemyBreakSe'))
    expect(hook).toMatch(/useLayoutEffect/)
    expect(hook).toMatch(/sfx\.enemyBreak\(level\)/)
    expect(hook).not.toMatch(/setTimeout|requestAnimationFrame/)
  })
  it('着弾計画の側（useBattleSound）は崩しの音を予約しない＝時刻表に新しい要素は無い', () => {
    expect(battleSoundSrc).not.toMatch(/enemyBreak/)
  })
  it('崩しの起点を決める時刻の定数は v1.0.4 のまま', () => {
    expect(HP_LAG_MS).toBe(90)
    expect(HIT_STOP_MS).toEqual({ 1: 30, 2: 40, 3: 45, 4: 60 })
  })
})

// ---- 振る舞い：偽の AudioContext で start() の予約を記録する（tapFeedback.test.ts と同型） ----
type Started = { at: number; rate: number; gain: number }
let started: Started[] = []
let fetched: string[] = []
let now = 0

class FakeCtx {
  state = 'running'
  destination = {}
  get currentTime() {
    return now
  }
  resume() {
    return Promise.resolve()
  }
  decodeAudioData() {
    return Promise.resolve({ duration: 0.2 })
  }
  createGain() {
    return { gain: { value: 1 }, connect() {} }
  }
  createBufferSource() {
    const node = {
      buffer: null as unknown,
      playbackRate: { value: 1 },
      gainNode: null as null | { gain: { value: number } },
      connect(g: { gain: { value: number } }) {
        node.gainNode = g
      },
      start(at: number) {
        started.push({ at, rate: node.playbackRate.value, gain: node.gainNode?.gain.value ?? -1 })
      },
    }
    return node
  }
  createOscillator() {
    throw new Error('fallback tone must not play')
  }
}

async function loadedSound() {
  vi.resetModules()
  const mod = await import('./sound')
  mod.preloadSe(['enemy_charge'])
  await new Promise((r) => setTimeout(r, 0))
  await new Promise((r) => setTimeout(r, 0))
  return mod
}

describe('Enemy Break SE v1：再生の振る舞い', () => {
  beforeEach(() => {
    started = []
    fetched = []
    now = 10
    vi.stubGlobal('window', { AudioContext: FakeCtx })
    vi.stubGlobal('fetch', (url: string) => {
      fetched.push(url)
      return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('既存 enemy_charge を予約オフセット 0 で鳴らす（half 0.7／quarter 0.6・gain 0.4675）', async () => {
    const { sfx } = await loadedSound()
    expect(fetched).toEqual(['/assets/se/enemy_charge.wav'])
    sfx.enemyBreak('half')
    now = 12
    sfx.enemyBreak('quarter')
    expect(started).toEqual([
      { at: 10, rate: 0.7, gain: expect.closeTo(0.4675, 5) },
      { at: 12, rate: 0.6, gain: expect.closeTo(0.4675, 5) },
    ])
  })

  it('溜め予告（enemy_charge@1）と同じ瞬間でも重複抑制の対象外（rate が違う）', async () => {
    const { sfx } = await loadedSound()
    sfx.enemyCharge()
    sfx.enemyBreak('quarter')
    expect(started.map((s) => s.rate)).toEqual([1, 0.6])
  })

  it('ミュート中は 0 回', async () => {
    const { sfx, setSoundMuted } = await loadedSound()
    setSoundMuted(true)
    sfx.enemyBreak('half')
    sfx.enemyBreak('quarter')
    expect(started).toHaveLength(0)
    setSoundMuted(false)
    sfx.enemyBreak('quarter')
    expect(started).toHaveLength(1)
  })
})
