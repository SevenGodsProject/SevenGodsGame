/**
 * 効果音（決定：UI演出・サウンド）。
 *
 * 本物の音源ファイルはまだ無いため、Web Audio APIでその場で音を合成する
 * プレースホルダー実装。`public/assets` に音源が用意できたら、この
 * ファイルの中身を `new Audio(url).play()` に差し替えるだけで済むように、
 * 呼び出し側（useBattleSound.ts）は `sfx.xxx()` という形しか知らない。
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

type ToneOptions = {
  type?: OscillatorType
  volume?: number
  delayMs?: number
}

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

function arpeggio(freqs: number[], durationMs: number, stepMs: number, opts: ToneOptions = {}): void {
  freqs.forEach((freq, i) => tone(freq, durationMs, { ...opts, delayMs: (opts.delayMs ?? 0) + i * stepMs }))
}

// FINAL_BACKLOG_8-31.md Phase 3「SE音量格差」：共鳴／OTOMO進化／勝敗という
// 「重要SE」が、カード使用等の頻出SEと比べて音量差で強調されていなかった
// （特にotomoEvolveがheal等の些末なSEと同じ0.09で埋もれていた）。
// 頻出SE（cardPlay/cardDrawn/block/resonanceGain等）は据え置き、重要SEの
// うち唯一浮いていたotomoEvolveのみ、既に十分大きいresonanceBurst/victory
// と同じ0.13に引き上げる最小変更とした（defeatは元々0.11で十分距離があるため
// 据え置き）。
export const sfx = {
  cardPlay: () => tone(320, 70, { type: 'square', volume: 0.07 }),
  cardDrawn: () => tone(520, 35, { type: 'square', volume: 0.03 }),
  damageEnemy: () => {
    tone(200, 90, { type: 'sawtooth', volume: 0.11 })
    tone(130, 120, { type: 'sawtooth', volume: 0.07, delayMs: 40 })
  },
  damageSelf: () => tone(90, 160, { type: 'square', volume: 0.13 }),
  heal: () => arpeggio([440, 660], 100, 70, { type: 'sine', volume: 0.09 }),
  block: () => tone(220, 60, { type: 'triangle', volume: 0.07 }),
  resonanceGain: () => tone(880, 55, { type: 'sine', volume: 0.05 }),
  resonanceBurst: () => arpeggio([523, 659, 784, 1047], 160, 70, { type: 'sine', volume: 0.12 }),
  otomoEvolve: () => arpeggio([392, 523, 659, 784, 988], 140, 60, { type: 'triangle', volume: 0.13 }),
  divination: () => arpeggio([660, 880], 90, 60, { type: 'sine', volume: 0.08 }),
  enemyTurn: () => tone(150, 100, { type: 'square', volume: 0.06 }),
  /** ENEMY-VFX-02：連撃のhit音。hitごとにpitch/volumeを上げ（低→高→強impact）、
   * delayMsで視覚のTEMPO-B（enemyVfxTiming.ts）と同期する。新規音源なしの合成音。 */
  enemyMultiHit: (index: number, delayMs: number) => {
    tone(110 + index * 40, 90, { type: 'square', volume: 0.08 + index * 0.03, delayMs })
    // 3発目（index>=2）だけ低音の追い打ちを重ねて「ドン！」にする
    if (index >= 2) tone(65, 220, { type: 'sawtooth', volume: 0.13, delayMs: delayMs + 25 })
  },
  /** ENEMY-VFX-02：神滅甲タイプ（special単発）の着弾impact。ビーム到達に同期 */
  enemySpecialImpact: (delayMs: number) => {
    tone(58, 300, { type: 'sawtooth', volume: 0.16, delayMs })
    tone(150, 170, { type: 'square', volume: 0.09, delayMs: delayMs + 40 })
  },
  victory: () => arpeggio([523, 659, 784, 1047], 220, 130, { type: 'triangle', volume: 0.13 }),
  defeat: () => arpeggio([440, 349, 293], 320, 180, { type: 'sawtooth', volume: 0.11 }),
}
