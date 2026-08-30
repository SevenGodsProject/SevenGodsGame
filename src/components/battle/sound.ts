import { SE_GAIN, type FeelTier } from './feelTier'

/**
 * 決定128（Game Feel Phase）：効果音エンジン。
 *
 * - 音源は `public/assets/se/*.wav`（`scripts/gen-se.mjs` が数式から決定論的に生成した
 *   プロジェクト所有のオリジナル音源。外部素材・録音物は不使用。docs/SE_ASSETS.md 参照）
 * - 役割別の音量階層（feelTier.ts の SE_GAIN）：Impact は L1〜L4 で段階化、Feedback は小さく、
 *   State Change／Reward／Warning／Big moment はそれぞれ固定係数。BGM（0.35）を邪魔しない
 * - WAV は初回再生時に fetch → decodeAudioData でキャッシュ。取得・デコードに失敗した環境では
 *   従来の合成トーン（fallback）を鳴らすため、無音にはならない
 * - ミュート・AudioContext の扱いは従来どおり（決定80：ミュートは sound.ts 側のフラグのみ）
 */
let ctx: AudioContext | null = null
let muted = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setSoundMuted(value: boolean): void {
  muted = value
}

export function isSoundMuted(): boolean {
  return muted
}

export type SeName =
  | 'card_play'
  | 'card_draw'
  | 'divination'
  | 'hit_l1'
  | 'hit_l2'
  | 'hit_l3'
  | 'hit_l4'
  | 'self_hit'
  | 'self_hit_heavy'
  | 'block'
  | 'heal'
  | 'resonance_gain'
  | 'burst_ready'
  | 'evolve'
  | 'enemy_turn'
  | 'enemy_charge'
  | 'boss_entrance'
  | 'reward'
  | 'victory_sting'
  | 'defeat_sting'

export const SE_NAMES: SeName[] = [
  'card_play',
  'card_draw',
  'divination',
  'hit_l1',
  'hit_l2',
  'hit_l3',
  'hit_l4',
  'self_hit',
  'self_hit_heavy',
  'block',
  'heal',
  'resonance_gain',
  'burst_ready',
  'evolve',
  'enemy_turn',
  'enemy_charge',
  'boss_entrance',
  'reward',
  'victory_sting',
  'defeat_sting',
]

export const SE_BASE_PATH = '/assets/se/'

const buffers = new Map<SeName, AudioBuffer | null>()
const loading = new Map<SeName, Promise<AudioBuffer | null>>()

function loadBuffer(name: SeName): Promise<AudioBuffer | null> {
  const cached = buffers.get(name)
  if (cached !== undefined) return Promise.resolve(cached)
  const pending = loading.get(name)
  if (pending) return pending
  const audioCtx = getCtx()
  if (!audioCtx || typeof fetch !== 'function') return Promise.resolve(null)
  const p = fetch(`${SE_BASE_PATH}${name}.wav`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((ab) => audioCtx.decodeAudioData(ab))
    .then((buf) => {
      buffers.set(name, buf)
      return buf
    })
    .catch(() => {
      buffers.set(name, null)
      return null
    })
    .finally(() => loading.delete(name))
  loading.set(name, p)
  return p
}

/** バトル開始時などに呼び、初回再生の遅延を無くす（失敗しても無視） */
export function preloadSe(names: SeName[] = SE_NAMES): void {
  if (muted) return
  for (const n of names) void loadBuffer(n)
}

type PlayOptions = { gain?: number; delayMs?: number; rate?: number }

function playBuffer(name: SeName, opts: PlayOptions = {}): void {
  if (muted) return
  const audioCtx = getCtx()
  if (!audioCtx) return
  const { gain = 1, delayMs = 0, rate = 1 } = opts
  const start = (buf: AudioBuffer) => {
    const src = audioCtx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = rate
    const g = audioCtx.createGain()
    g.gain.value = Math.max(0, Math.min(1, gain * SE_GAIN.master))
    src.connect(g)
    g.connect(audioCtx.destination)
    src.start(audioCtx.currentTime + delayMs / 1000)
  }
  const cached = buffers.get(name)
  if (cached) {
    start(cached)
    return
  }
  if (cached === null) {
    fallbackTone(name, opts)
    return
  }
  // 未ロード：ロード完了後に鳴らす（遅延は最大でも数十ms。失敗時はfallback）
  const requestedAt = audioCtx.currentTime
  void loadBuffer(name).then((buf) => {
    if (!buf) {
      fallbackTone(name, opts)
      return
    }
    const late = (audioCtx.currentTime - requestedAt) * 1000
    // 大きく遅れた（>400ms）Feedback系は鳴らさない（タイミングがズレて違和感になるため）
    if (late > 400 && (name === 'card_play' || name === 'card_draw' || name === 'resonance_gain')) return
    start(buf)
  })
}

// ---- fallback：従来の合成トーン（WAVが取得できない環境向け） ----
type ToneOptions = { type?: OscillatorType; volume?: number; delayMs?: number }
function tone(freq: number, durationMs: number, opts: ToneOptions = {}): void {
  if (muted) return
  const audioCtx = getCtx()
  if (!audioCtx) return
  const { type = 'sine', volume = 0.12, delayMs = 0 } = opts
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = type
  osc.frequency.value = freq
  const startAt = audioCtx.currentTime + delayMs / 1000
  const stopAt = startAt + durationMs / 1000
  gain.gain.setValueAtTime(0, startAt)
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, stopAt)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start(startAt)
  osc.stop(stopAt + 0.02)
}
function fallbackTone(name: SeName, opts: PlayOptions): void {
  const d = opts.delayMs ?? 0
  const v = 0.12 * (opts.gain ?? 1)
  switch (name) {
    case 'card_play':
      return tone(320, 70, { type: 'square', volume: v, delayMs: d })
    case 'card_draw':
      return tone(520, 35, { type: 'square', volume: v * 0.5, delayMs: d })
    case 'hit_l1':
    case 'hit_l2':
      return tone(200, 90, { type: 'sawtooth', volume: v, delayMs: d })
    case 'hit_l3':
    case 'hit_l4':
      tone(130, 160, { type: 'sawtooth', volume: v, delayMs: d })
      return tone(65, 220, { type: 'sawtooth', volume: v, delayMs: d + 30 })
    case 'self_hit':
      return tone(90, 160, { type: 'square', volume: v, delayMs: d })
    case 'self_hit_heavy':
      tone(58, 300, { type: 'sawtooth', volume: v, delayMs: d })
      return tone(150, 170, { type: 'square', volume: v * 0.6, delayMs: d + 40 })
    case 'block':
      return tone(220, 60, { type: 'triangle', volume: v, delayMs: d })
    case 'heal':
      tone(440, 100, { type: 'sine', volume: v, delayMs: d })
      return tone(660, 100, { type: 'sine', volume: v, delayMs: d + 70 })
    case 'resonance_gain':
      return tone(880, 55, { type: 'sine', volume: v * 0.5, delayMs: d })
    case 'burst_ready':
      return [523, 659, 784, 1047].forEach((f, i) => tone(f, 160, { type: 'sine', volume: v, delayMs: d + i * 70 }))
    case 'evolve':
      return [392, 523, 659, 784, 988].forEach((f, i) => tone(f, 140, { type: 'triangle', volume: v, delayMs: d + i * 60 }))
    case 'divination':
      tone(660, 90, { type: 'sine', volume: v, delayMs: d })
      return tone(880, 90, { type: 'sine', volume: v, delayMs: d + 60 })
    case 'enemy_turn':
    case 'enemy_charge':
      return tone(150, 100, { type: 'square', volume: v * 0.6, delayMs: d })
    case 'boss_entrance':
      tone(60, 400, { type: 'sine', volume: v, delayMs: d })
      return tone(196, 500, { type: 'triangle', volume: v * 0.4, delayMs: d + 60 })
    case 'reward':
      tone(784, 200, { type: 'triangle', volume: v, delayMs: d })
      return tone(1175, 260, { type: 'triangle', volume: v, delayMs: d + 130 })
    case 'victory_sting':
      return [523, 659, 784, 1047].forEach((f, i) => tone(f, 220, { type: 'triangle', volume: v, delayMs: d + i * 130 }))
    case 'defeat_sting':
      return [440, 349, 293].forEach((f, i) => tone(f, 320, { type: 'sawtooth', volume: v, delayMs: d + i * 180 }))
  }
}

/**
 * 役割別API。音量は feelTier.ts の階層から引く（呼び出し側で数値を書かない）。
 * 既存の呼び出し（useBattleSound）はこの関数名で移行する。
 */
export const sfx = {
  // Feedback（操作）
  cardPlay: () => playBuffer('card_play', { gain: SE_GAIN.feedback }),
  cardDrawn: () => playBuffer('card_draw', { gain: SE_GAIN.feedback * 0.8 }),
  divination: () => playBuffer('divination', { gain: SE_GAIN.stateChange * 0.8 }),
  // Impact（自分→敵）：4段階
  damageEnemy: (tier: FeelTier = 2, delayMs = 0) => playBuffer(`hit_l${tier}` as SeName, { gain: SE_GAIN.impact[tier], delayMs }),
  // 被弾（敵→自分）
  damageSelf: (heavy = false, delayMs = 0) =>
    playBuffer(heavy ? 'self_hit_heavy' : 'self_hit', { gain: heavy ? SE_GAIN.impact[3] : SE_GAIN.impact[2], delayMs }),
  enemyMultiHit: (index: number, delayMs: number) =>
    playBuffer(index >= 2 ? 'self_hit_heavy' : 'self_hit', { gain: SE_GAIN.impact[index >= 2 ? 3 : 2], delayMs, rate: 1 + index * 0.06 }),
  enemySpecialImpact: (delayMs: number) => playBuffer('self_hit_heavy', { gain: SE_GAIN.impact[4], delayMs }),
  block: () => playBuffer('block', { gain: SE_GAIN.impact[2] * 0.8 }),
  heal: () => playBuffer('heal', { gain: SE_GAIN.stateChange * 0.8 }),
  // State Change
  resonanceGain: () => playBuffer('resonance_gain', { gain: SE_GAIN.feedback }),
  burstReady: () => playBuffer('burst_ready', { gain: SE_GAIN.stateChange }),
  /** 神の一撃の着弾（BURST_IMPACT_MS 後）。旧 resonanceBurst の後半を担う */
  burstImpact: (delayMs = 0) => playBuffer('hit_l4', { gain: SE_GAIN.impact[4], delayMs }),
  otomoEvolve: (delayMs = 0) => playBuffer('evolve', { gain: SE_GAIN.stateChange, delayMs }),
  // Warning
  enemyTurn: () => playBuffer('enemy_turn', { gain: SE_GAIN.warning }),
  enemyCharge: () => playBuffer('enemy_charge', { gain: SE_GAIN.warning }),
  // Big moments
  bossEntrance: () => playBuffer('boss_entrance', { gain: SE_GAIN.bigMoment }),
  reward: () => playBuffer('reward', { gain: SE_GAIN.reward }),
  victory: () => playBuffer('victory_sting', { gain: SE_GAIN.bigMoment * 0.8 }),
  defeat: () => playBuffer('defeat_sting', { gain: SE_GAIN.stateChange }),
}
