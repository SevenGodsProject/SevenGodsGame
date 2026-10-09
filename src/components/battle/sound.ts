import { SE_DEDUP_WINDOW_MS, SE_GAIN, SOUND_LAYER, TAP_END_ROUND_RATE, VOICE_LAYER, type FeelTier } from './feelTier'

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

/**
 * 決定257：SE と BGM（bgm.ts の GainNode 経路）で AudioContext を 1 つに共有する。
 * 生成・resume の扱いは SE と同じ（suspended なら resume を試みる。初回 gesture 前は suspended のまま）。
 */
export function getAudioContext(): AudioContext | null {
  return getCtx()
}

export function setSoundMuted(value: boolean): void {
  muted = value
  // Official Voice Pilot v1：数秒続くボイスはミュートした瞬間に止める（SE は短いので従来どおり新規再生だけ止める）
  if (value) stopVoice()
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
  // 決定257 Sound Layer v1：決め所の rise（溜め）2 本
  | 'burst_rise'
  | 'enemy_rise'

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
  'burst_rise',
  'enemy_rise',
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

type PlayOptions = {
  gain?: number
  delayMs?: number
  rate?: number
  /**
   * Tap Feedback v1：キャッシュ済みの時だけ即再生する。未ロード・デコード失敗なら鳴らさない
   * （ロード待ちで遅れて鳴る押下音は逆効果のため。fallback の合成音も鳴らさない）。
   */
  immediateOnly?: boolean
}

/**
 * Tap Feedback v1：同じ音源の重複判定（純関数）。前回の予約時刻 `prevAt`（秒）から
 * `at`（秒）までが `windowMs` 未満なら重複＝鳴らさない。
 */
export function isDuplicateStart(prevAt: number | undefined, at: number, windowMs: number): boolean {
  if (prevAt === undefined) return false
  return Math.abs(at - prevAt) * 1000 < windowMs
}

/** 重複抑制の記録。キー＝`name@rate`、値＝予約した AudioContext 時刻（秒）。ミュート中は更新しない */
const lastStartAt = new Map<string, number>()

function playBuffer(name: SeName, opts: PlayOptions = {}): void {
  if (muted) return
  const audioCtx = getCtx()
  if (!audioCtx) return
  const { gain = 1, delayMs = 0, rate = 1, immediateOnly = false } = opts
  const start = (buf: AudioBuffer) => {
    const at = audioCtx.currentTime + delayMs / 1000
    const key = `${name}@${rate}`
    if (isDuplicateStart(lastStartAt.get(key), at, SE_DEDUP_WINDOW_MS)) return
    lastStartAt.set(key, at)
    const src = audioCtx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = rate
    const g = audioCtx.createGain()
    g.gain.value = Math.max(0, Math.min(1, gain * SE_GAIN.master))
    src.connect(g)
    g.connect(audioCtx.destination)
    // 決定257：鳴り終わったらノードを外す（イベントごとに作るノードを残さない）
    src.onended = () => {
      src.disconnect()
      g.disconnect()
    }
    src.start(at)
  }
  const cached = buffers.get(name)
  if (cached) {
    start(cached)
    return
  }
  if (immediateOnly) {
    // 未ロードなら今回は鳴らさず、次回に備えてロードだけ始める（失敗時も無音）
    if (cached === undefined) void loadBuffer(name)
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
    // 決定257：rise も同じ（遅れると着弾に重なり、impact の役割を食うため）
    if (late > 400 && (name === 'card_play' || name === 'card_draw' || name === 'resonance_gain' || name === 'burst_rise' || name === 'enemy_rise')) return
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
    case 'burst_rise':
    case 'enemy_rise':
      // 決定257：rise は装飾。wav が無い環境では鳴らさない（合成トーンで代用しない）
      return
    case 'defeat_sting':
      return [440, 349, 293].forEach((f, i) => tone(f, 320, { type: 'sawtooth', volume: v, delayMs: d + i * 180 }))
  }
}

/**
 * 決定224：条件⚡の追加着弾の音。新しい音源は作らず、戦闘中には鳴らない `reward`（784／1175Hz の
 * チャイム）を 1.5 倍速＝高いピッチ・短い長さで鳴らす。打撃（hit_l*）と違う音色にして
 * 「本体とは別の、決まった出来事」に聞こえるようにする。
 */
export const BONUS_PAYOFF_SE = { name: 'reward', rate: 1.5 } as const satisfies { name: SeName; rate: number }

/**
 * 役割別API。音量は feelTier.ts の階層から引く（呼び出し側で数値を書かない）。
 * 既存の呼び出し（useBattleSound）はこの関数名で移行する。
 */
export const sfx = {
  // Feedback（操作）
  /**
   * Tap Feedback v1：カードを押した瞬間（クリック処理の中・予約オフセット 0）に鳴らす。
   * commit 時（CARD_PLAYED）の card_play は廃止＝1 タップ 1 回。クリック処理の中で呼ぶので
   * AudioContext の resume() がユーザー操作の中で走る。
   */
  cardTap: () => playBuffer('card_play', { gain: SE_GAIN.tap, immediateOnly: true }),
  /** Tap Feedback v1：「ラウンドを終える」を押した瞬間。同じ音を低め（0.85 倍速）で */
  endRoundTap: () => playBuffer('card_play', { gain: SE_GAIN.tap, rate: TAP_END_ROUND_RATE, immediateOnly: true }),
  cardDrawn: () => playBuffer('card_draw', { gain: SE_GAIN.feedback * 0.8 }),
  divination: () => playBuffer('divination', { gain: SE_GAIN.stateChange * 0.8 }),
  // Impact（自分→敵）：4段階
  damageEnemy: (tier: FeelTier = 2, delayMs = 0) => playBuffer(`hit_l${tier}` as SeName, { gain: SE_GAIN.impact[tier], delayMs }),
  /** 決定224：条件⚡の追加着弾（`hit_l1` の代わり。音量は Reward 階層＝神の一撃・Big moment より小さい） */
  bonusPayoff: (delayMs = 0) => playBuffer(BONUS_PAYOFF_SE.name, { gain: SE_GAIN.reward, delayMs, rate: BONUS_PAYOFF_SE.rate }),
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
  // 決定257 Sound Layer v1：決め所の rise（溜め）。着弾は既存の hit_l4／self_hit_heavy が担う
  /** 神の一撃：burst_ready の後〜突きまでの明るい上昇（commit 基準の予約） */
  burstRise: (delayMs: number) => playBuffer('burst_rise', { gain: SOUND_LAYER.riseGain.burst, delayMs }),
  /** 敵の必殺：カットイン中の低く暗い圧（commit 基準の予約） */
  enemyRise: (delayMs: number) => playBuffer('enemy_rise', { gain: SOUND_LAYER.riseGain.enemy, delayMs }),
  // Big moments
  bossEntrance: () => playBuffer('boss_entrance', { gain: SE_GAIN.bigMoment }),
  /** 決定254：「降臨の間」の神紋。既存 resonance_gain を 0.8 倍速（低く・長く）で鳴らす（新規音源 0） */
  godDescend: () => playBuffer('resonance_gain', { gain: SE_GAIN.stateChange, rate: 0.8 }),
  reward: () => playBuffer('reward', { gain: SE_GAIN.reward }),
  victory: () => playBuffer('victory_sting', { gain: SE_GAIN.bigMoment * 0.8 }),
  defeat: () => playBuffer('defeat_sting', { gain: SE_GAIN.stateChange }),
}

// ---- Official Voice Pilot v1：SGG Creator Kit v1.1 の公式ボイス（神の声） ----
/**
 * 公式ボイスの経路。SE と同じ AudioContext・同じミュートフラグ・同じ fetch→decode キャッシュだが、
 * 以下が SE と違う：
 * - 音源は Kit 配布の MP3 を**無改変**で配信する（`public/assets/voice/<god>/<scene>.mp3`。原本は
 *   `audio-source/voice/`・sha256 は Kit MCP `get_voice` と一致。台帳 VOICE-KIT-01）
 * - 同時に鳴るボイスは常に 1 本（新しく鳴らすときは前のボイスを止める＝連続再生防止）
 * - fallback の合成トーンは持たない（取得・デコードに失敗したら無音）
 * - 入口の終わりから `VOICE_LAYER.lateDropMs` 以上遅れて届いたら鳴らさない
 * 権利：`docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md` §5（Updated 2026-10-08）。公式の声は Kit 配布分のみ。
 * 本作に自作ボイスは無く、ここに載せる音源は Kit 原本だけ（自作音源を「公式」と表示しない）。
 */
export const VOICE_BASE_PATH = '/assets/voice/'

export type VoiceScene = 'greeting' | 'crisis' | 'fatigue' | 'success'

/**
 * 配信中の公式ボイス（神 id → 場面 → `VOICE_BASE_PATH` からの相対パス）。
 * Pilot v1＝大耀「あいさつ」1 本。7 神展開は別 Gate（docs/OFFICIAL_VOICE_PILOT_V1.md §7）。
 */
export const OFFICIAL_VOICES: Readonly<Record<string, Readonly<Partial<Record<VoiceScene, string>>>>> = {
  taiyo: { greeting: 'taiyo/greeting.mp3' },
}

export function hasOfficialVoice(godId: string, scene: VoiceScene): boolean {
  return typeof OFFICIAL_VOICES[godId]?.[scene] === 'string'
}

const voiceBuffers = new Map<string, AudioBuffer | null>()
const voiceLoading = new Map<string, Promise<AudioBuffer | null>>()
let activeVoice: { src: AudioBufferSourceNode; gain: GainNode } | null = null

function loadVoice(path: string): Promise<AudioBuffer | null> {
  const cached = voiceBuffers.get(path)
  if (cached !== undefined) return Promise.resolve(cached)
  const pending = voiceLoading.get(path)
  if (pending) return pending
  const audioCtx = getCtx()
  if (!audioCtx || typeof fetch !== 'function') return Promise.resolve(null)
  const p = fetch(`${VOICE_BASE_PATH}${path}`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((ab) => audioCtx.decodeAudioData(ab))
    .then((buf) => {
      voiceBuffers.set(path, buf)
      return buf
    })
    .catch(() => {
      voiceBuffers.set(path, null)
      return null
    })
    .finally(() => voiceLoading.delete(path))
  voiceLoading.set(path, p)
  return p
}

/** 入口（降臨の間）の間に取得・デコードしておく。配信していない神・場面・ミュート中は何もしない */
export function preloadVoice(godId: string, scene: VoiceScene): void {
  if (muted) return
  const path = OFFICIAL_VOICES[godId]?.[scene]
  if (path) void loadVoice(path)
}

/** 鳴っているボイスを止める（ミュート・画面離脱・次のボイス）。鳴っていなければ何もしない */
export function stopVoice(): void {
  const v = activeVoice
  activeVoice = null
  if (!v) return
  try {
    v.src.onended = null
    v.src.stop()
  } catch {
    /* 既に止まっている */
  }
  v.src.disconnect()
  v.gain.disconnect()
}

type VoiceOptions = {
  /** 実際に鳴り始めるときに 1 回だけ呼ぶ（ボイスの長さ ms を渡す。BGM duck の長さに使う） */
  onStart?: (durationMs: number) => void
}

/**
 * 公式ボイスを 1 本鳴らす。配信していない神・場面、ミュート中、AudioContext 不可なら false。
 * true は「鳴らす手続きを始めた」の意味で、取得失敗・遅延 drop では結果的に無音になる。
 */
export function playVoice(godId: string, scene: VoiceScene, opts: VoiceOptions = {}): boolean {
  if (muted) return false
  const path = OFFICIAL_VOICES[godId]?.[scene]
  if (!path) return false
  const audioCtx = getCtx()
  if (!audioCtx) return false
  const requestedAt = audioCtx.currentTime
  const start = (buf: AudioBuffer) => {
    if (muted) return
    stopVoice()
    const src = audioCtx.createBufferSource()
    src.buffer = buf
    const gain = audioCtx.createGain()
    gain.gain.value = Math.max(0, Math.min(1, VOICE_LAYER.gain * SE_GAIN.master))
    src.connect(gain)
    gain.connect(audioCtx.destination)
    const handle = { src, gain }
    activeVoice = handle
    src.onended = () => {
      if (activeVoice === handle) activeVoice = null
      src.disconnect()
      gain.disconnect()
    }
    opts.onStart?.(buf.duration * 1000)
    src.start(audioCtx.currentTime)
  }
  const cached = voiceBuffers.get(path)
  if (cached) {
    start(cached)
    return true
  }
  if (cached === null) return false
  void loadVoice(path).then((buf) => {
    if (!buf) return
    const late = (audioCtx.currentTime - requestedAt) * 1000
    if (late > VOICE_LAYER.lateDropMs) return
    start(buf)
  })
  return true
}
