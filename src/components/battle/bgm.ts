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
 */

const BGM_VOLUME = 0.35
const JINGLE_VOLUME = 0.5

const TRACKS = {
  home: '/assets/bgm/home.mp3',
  battle: '/assets/bgm/battle.mp3',
} as const

export type BgmTrack = keyof typeof TRACKS

const JINGLE_TRACKS = {
  victory: '/assets/bgm/victory.mp3',
  defeat: '/assets/bgm/defeat.mp3',
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
