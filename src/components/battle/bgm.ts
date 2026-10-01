/**
 * BGM再生（決定51-54フォローアップ、`docs/bgm-prompts.md`）。
 *
 * `sound.ts`（決定22）はWeb Audio APIでその場に効果音を合成するのに対し、
 * こちらはCEOがSuno等で生成し`public/assets/bgm/`に配置した実音源ファイルを
 * `<audio>`でそのまま鳴らすだけの薄いラッパー。役割が違うので別ファイルに
 * 分けた（`docs/bgm-prompts.md`「組み込み方針」の想定通り）。
 *
 * ①ホーム・神選択・デッキ構築画面用（`home`）・②戦闘用（`battle`）はループ再生。
 * ③決着ジングル（`victory`/`defeat`）は1回だけ鳴らし、鳴っている間はループBGMを
 * 止め、終わったら元の音量で再開する（`playJingle`）。
 *
 * 決定257 Sound Layer v1：神の一撃・敵の必殺の間だけ BGM を下げる（duck）。iOS Safari は
 * `HTMLMediaElement.volume` を無視するため、duck は WebAudio の GainNode で行う
 * （`createMediaElementSource` → GainNode → destination）。経路は初めて duck するときに作る
 * （AudioContext が running＝ユーザー操作済み・BGM 再生中・非ミュートのときだけ）。
 * element の `volume`（0.35）はそのまま残し、GainNode は 1.0 を基準に相対倍率で下げる＝
 * duck 以外の時間の音量は従来と同一。条件を満たさない環境では duck しない（従来どおり）。
 */
import { getAudioContext } from './sound'
import { SOUND_LAYER } from './feelTier'


const BGM_VOLUME = 0.35
const JINGLE_VOLUME = 0.5

/**
 * Release Hygiene Gate（決定170）：配信容量の整理で、同じ音源を
 * **Opus/WebM（主）と MP3（フォールバック）の2形式**で置くようにした。
 *
 * - 曲そのもの・再生タイミング・ループ位置・音量は変えていない。原音源
 *   （200kbps の MP3）は `audio-source/bgm/` へ移し、配信対象から外したうえで
 *   そこから両形式を書き出している（`scripts/release-hygiene/audio.mjs`）
 * - Opus 48kbps は元と**尺が1サンプルも変わらない**ので、`loop = true` の
 *   つなぎ目も従来どおり。MP3 80kbps は 12〜16kHz がわずかに落ちるが、
 *   こちらは WebM/Opus を再生できない環境（Safari 17.4 未満など）専用の保険
 * - 拡張子の選択は `canPlayType` の実測に任せる。判定できない環境（テスト環境で
 *   `Audio` が無い等）では MP3 を選ぶ＝従来と同じ挙動になる
 */
const AUDIO_EXT: 'webm' | 'mp3' = (() => {
  if (typeof document === 'undefined' || typeof Audio === 'undefined') return 'mp3'
  try {
    const probe = document.createElement('audio')
    return probe.canPlayType('audio/webm; codecs="opus"') === 'probably' ? 'webm' : 'mp3'
  } catch {
    return 'mp3'
  }
})()

const bgmUrl = (name: string): string => `/assets/bgm/${name}.${AUDIO_EXT}`

const TRACKS = {
  home: bgmUrl('home'),
  battle: bgmUrl('battle'),
} as const

export type BgmTrack = keyof typeof TRACKS

const JINGLE_TRACKS = {
  victory: bgmUrl('victory'),
  defeat: bgmUrl('defeat'),
} as const

export type JingleTrack = keyof typeof JINGLE_TRACKS

/**
 * ジングルが実際に鳴る最大の長さ（決定54）。`docs/bgm-prompts.md`では
 * 5〜10秒のジングルを依頼したが、Sunoで生成された音源は数分単位になることが
 * あり、この環境にはmp3をトリミングするツールが無い。そのため元ファイルは
 * そのまま置いた上で、再生開始からこの時間が経ったらフェードアウトして止める
 * ことで「ジングルらしい長さ」を実現する（音源自体が既に短ければ、フェードの
 * 出番が来る前に自然に`ended`する）。
 */
const JINGLE_MAX_MS = 9000
const JINGLE_FADE_MS = 500

let audio: HTMLAudioElement | null = null
let currentTrack: BgmTrack | null = null
let muted = false
let pendingRetryTrack: BgmTrack | null = null

// 決定257：BGM の GainNode 経路（一度作ったら element と結び付いたまま。失敗したら以後作らない）
let bgmGain: GainNode | null = null
let graphFailed = false
/** duck の復帰開始時刻（AudioContext の秒）。0＝duck していない */
let duckUntil = 0

let jingleAudio: HTMLAudioElement | null = null
let jingleTimer: ReturnType<typeof setTimeout> | null = null
let jingleFadeTimer: ReturnType<typeof setInterval> | null = null

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null
  if (!audio) {
    audio = new Audio()
    audio.loop = true
    // SFXより控えめに。同時に鳴る効果音（sound.ts）を邪魔しない音量
    audio.volume = BGM_VOLUME
  }
  return audio
}

/**
 * ブラウザの自動再生制限で最初の`play()`が拒否された場合、最初のユーザー操作
 * （クリック・キー入力）を待って再試行する。ホーム画面はユーザー操作前に
 * 表示されるため、初回はほぼ確実にこの経路を通る。
 */
function retryOnNextUserGesture(track: BgmTrack): void {
  if (pendingRetryTrack === track) return
  pendingRetryTrack = track
  const retry = () => {
    document.removeEventListener('pointerdown', retry)
    document.removeEventListener('keydown', retry)
    if (pendingRetryTrack === track) {
      pendingRetryTrack = null
      if (currentTrack === track) playTrack(track)
    }
  }
  document.addEventListener('pointerdown', retry, { once: true })
  document.addEventListener('keydown', retry, { once: true })
}

/** 指定したトラックをループ再生する。既に同じトラックが再生中なら何もしない */
export function playTrack(track: BgmTrack): void {
  const el = getAudio()
  if (!el) return

  if (currentTrack !== track) {
    el.src = TRACKS[track]
    currentTrack = track
  }
  el.muted = muted
  // 決定257：経路を作った後は BGM が AudioContext から出るので、止まっていたら起こす（ユーザー操作の中で呼ばれる）
  if (bgmGain && bgmGain.context.state === 'suspended') void (bgmGain.context as AudioContext).resume().catch(() => {})

  const result = el.play()
  if (result && typeof result.catch === 'function') {
    result.catch(() => retryOnNextUserGesture(track))
  }
}

/** 再生を止める（画面遷移でBGM無しの区間に入るとき） */
export function stopBgm(): void {
  currentTrack = null
  pendingRetryTrack = null
  audio?.pause()
}

/** ミュートボタン（App.tsx）と連動させる。sound.tsのミュート状態とは別管理 */
export function setBgmMuted(value: boolean): void {
  muted = value
  if (audio) audio.muted = value
  if (jingleAudio) jingleAudio.muted = value
}

/**
 * 決定257：BGM を GainNode 経路へ載せる（初回だけ）。AudioContext が running でないと BGM が
 * 無音になるため、running・再生中・非ミュートのときだけ作る。作れなければ null（duck しない）。
 */
function ensureBgmGraph(): GainNode | null {
  if (bgmGain) return bgmGain
  if (graphFailed || muted || !audio || audio.paused || !currentTrack) return null
  const ctx = getAudioContext()
  if (!ctx || ctx.state !== 'running' || typeof ctx.createMediaElementSource !== 'function') return null
  try {
    const source = ctx.createMediaElementSource(audio)
    const g = ctx.createGain()
    g.gain.value = 1
    source.connect(g)
    g.connect(ctx.destination)
    bgmGain = g
    return g
  } catch {
    graphFailed = true
    return null
  }
}

/** 現在値から予約を組み直す（cancel 後に今の値で固定してから次の ramp を積む） */
function holdCurrent(param: AudioParam, now: number): void {
  const current = param.value
  param.cancelScheduledValues(now)
  param.setValueAtTime(current, now)
}

/**
 * 決定257：BGM を `holdMs` の間だけ下げ（60ms で 0.343 倍へ）、その後 300ms で 1.0 に戻す。
 * 連続して呼ばれたら「最後に終わるもの」の時刻に合流する（予約の最後は必ず 1.0＝残留しない）。
 * duck できない環境（経路なし・BGM 停止中・ミュート・AudioContext 不可）では何もせず false。
 */
export function duckBgm(holdMs: number): boolean {
  if (muted || jingleTimer || !audio || audio.paused) return false
  const g = ensureBgmGraph()
  if (!g) return false
  const now = g.context.currentTime
  duckUntil = Math.max(duckUntil, now + holdMs / 1000)
  const p = g.gain
  holdCurrent(p, now)
  p.linearRampToValueAtTime(SOUND_LAYER.duckLevel, Math.min(now + SOUND_LAYER.duckRampInMs / 1000, duckUntil))
  p.setValueAtTime(SOUND_LAYER.duckLevel, duckUntil)
  p.linearRampToValueAtTime(1, duckUntil + SOUND_LAYER.duckRampOutMs / 1000)
  return true
}

/** 決定257：戦闘画面を離れるとき（Retry／もう一度／Home）。duck 中なら 120ms で 1.0 へ戻す */
export function releaseBgmDuck(): void {
  if (!bgmGain) return
  const now = bgmGain.context.currentTime
  if (duckUntil === 0 || now >= duckUntil + SOUND_LAYER.duckRampOutMs / 1000) {
    duckUntil = 0
    return
  }
  duckUntil = 0
  holdCurrent(bgmGain.gain, now)
  bgmGain.gain.linearRampToValueAtTime(1, now + SOUND_LAYER.duckReleaseMs / 1000)
}

/** 決定257（計測・テスト用）：BGM の GainNode の現在値。経路が無ければ null */
export function getBgmGainValue(): number | null {
  return bgmGain ? bgmGain.gain.value : null
}

function clearJingleTimers(): void {
  if (jingleTimer) {
    clearTimeout(jingleTimer)
    jingleTimer = null
  }
  if (jingleFadeTimer) {
    clearInterval(jingleFadeTimer)
    jingleFadeTimer = null
  }
}

function getJingleAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null
  if (!jingleAudio) {
    jingleAudio = new Audio()
    jingleAudio.loop = false
  }
  return jingleAudio
}

/**
 * 決着ジングルを1回だけ鳴らす（決定54）。鳴っている間はループBGM（①/②）を
 * 一時停止し、ジングルが終わったら（自然終了、または`JINGLE_MAX_MS`到達に
 * よるフェードアウトのどちらか）BGMを元の音量で再開する。
 */
export function playJingle(track: JingleTrack): void {
  const bg = getAudio()
  const jingle = getJingleAudio()
  if (!jingle) return

  clearJingleTimers()
  bg?.pause()
  // 決定257：ジングル中の BGM は止まっているので duck を解除しておく（再開時に残さない）
  if (bgmGain) {
    duckUntil = 0
    const now = bgmGain.context.currentTime
    bgmGain.gain.cancelScheduledValues(now)
    bgmGain.gain.setValueAtTime(1, now)
  }

  jingle.src = JINGLE_TRACKS[track]
  jingle.volume = JINGLE_VOLUME
  jingle.muted = muted
  jingle.currentTime = 0

  const resumeBg = () => {
    clearJingleTimers()
    jingle.onended = null
    if (bg && currentTrack) {
      bg.volume = BGM_VOLUME
      bg.muted = muted
      // 決定257：GainNode 経路があるときは 0→1.0 を 400ms でフェードインして再開（段差を無くす）。
      // 予約の最後は 1.0 なので、途中で画面が変わっても音量は残らない
      if (bgmGain) {
        const now = bgmGain.context.currentTime
        bgmGain.gain.cancelScheduledValues(now)
        bgmGain.gain.setValueAtTime(0, now)
        bgmGain.gain.linearRampToValueAtTime(1, now + SOUND_LAYER.jingleResumeFadeMs / 1000)
      }
      void bg.play().catch(() => {})
    }
  }
  jingle.onended = resumeBg

  const result = jingle.play()
  if (result && typeof result.catch === 'function') {
    result.catch(resumeBg)
  }

  jingleTimer = setTimeout(() => {
    const fadeStepMs = 50
    const steps = Math.max(1, Math.round(JINGLE_FADE_MS / fadeStepMs))
    let step = 0
    jingleFadeTimer = setInterval(() => {
      step++
      jingle.volume = Math.max(0, JINGLE_VOLUME * (1 - step / steps))
      if (step >= steps) {
        jingle.pause()
        resumeBg()
      }
    }, fadeStepMs)
  }, JINGLE_MAX_MS)
}
