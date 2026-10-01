import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { EnemyId, GodId } from '../../core/types'
import { getEnemyDef } from '../../core/data/enemies'
import { getGodDef } from '../../core/data/gods'
import { stakeLabel } from '../../core/data/stakes'
import { GOD_THEME_COLOR } from '../setup/godStyle'
import type { BattleEntranceVariant } from './battleEntrance'
import { prefersReducedMotion } from './reducedMotion'
import { sfx } from './sound'

/** 決定128：Boss登場演出の総時間（旧定数。決定254 の Short／reduced と同じ値として残す） */
export const BOSS_ENTRANCE_MS = 1500
export const BOSS_ENTRANCE_REDUCED_MS = 900

/**
 * 決定254 Game Entry「降臨の間」の時刻（ms・mount 起点）。CSS（battle.css 末尾の `.battle-entrance*`）と一致させる。
 * `enemyVfxTiming.ts` には置かない（決定250 God Strike の時刻と分離する）。
 */
export const BATTLE_ENTRANCE_FULL_MS = 2800
export const BATTLE_ENTRANCE_FULL_CONTROL_MS = 2400
export const BATTLE_ENTRANCE_SHORT_MS = BOSS_ENTRANCE_MS
export const BATTLE_ENTRANCE_SHORT_CONTROL_MS = 1150
export const BATTLE_ENTRANCE_REDUCED_MS = BOSS_ENTRANCE_REDUCED_MS
export const BATTLE_ENTRANCE_REDUCED_CONTROL_MS = 720
/** skip（タップ／Enter／Space／Esc）から操作可能になるまで */
export const BATTLE_ENTRANCE_SKIP_FADE_MS = 200

export type BattleEntranceMode = BattleEntranceVariant | 'reduced'
export type BattleEntranceTiming = { total: number; control: number; godSeMs: number; bossSeMs: number }

const BATTLE_ENTRANCE_TIMING: Record<BattleEntranceMode, BattleEntranceTiming> = {
  // Full：P1 神紋（250）で resonance_gain・P3（1,500）で boss_entrance・P5（2,400）で操作・2,800 で消滅
  full: { total: BATTLE_ENTRANCE_FULL_MS, control: BATTLE_ENTRANCE_FULL_CONTROL_MS, godSeMs: 250, bossSeMs: 1500 },
  short: { total: BATTLE_ENTRANCE_SHORT_MS, control: BATTLE_ENTRANCE_SHORT_CONTROL_MS, godSeMs: 100, bossSeMs: 450 },
  reduced: { total: BATTLE_ENTRANCE_REDUCED_MS, control: BATTLE_ENTRANCE_REDUCED_CONTROL_MS, godSeMs: 0, bossSeMs: 150 },
}

const SKIP_KEYS = new Set(['Enter', ' ', 'Spacebar', 'Escape', 'Esc'])

/**
 * skip の入力が戦闘 HUD に届かないようにする：skip した pointer の pointerup 直後の click と、
 * skip したキーの keyup（Space による button 起動）を 1 回だけ捕捉して捨てる。2 秒で必ず解除。
 */
function absorbSkipTail(kind: 'pointer' | 'key', id: number | string): void {
  if (typeof window === 'undefined') return
  let upAt = -1
  const swallow = (e: Event) => {
    e.stopPropagation()
    e.preventDefault()
  }
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId === id) upAt = performance.now()
  }
  const onClick = (e: MouseEvent) => {
    if (upAt >= 0 && performance.now() - upAt < 150) swallow(e)
    cleanup()
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key !== id) return
    swallow(e)
    cleanup()
  }
  const timer = window.setTimeout(() => cleanup(), 2000)
  function cleanup() {
    window.removeEventListener('pointerup', onPointerUp, true)
    window.removeEventListener('click', onClick, true)
    window.removeEventListener('keyup', onKeyUp, true)
    window.clearTimeout(timer)
  }
  if (kind === 'pointer') {
    window.addEventListener('pointerup', onPointerUp, true)
    window.addEventListener('click', onClick, true)
  } else {
    window.addEventListener('keyup', onKeyUp, true)
  }
}

type BossEntranceProps = {
  enemyId: EnemyId
  /** 決定254：選んだ神（降臨する神） */
  godId: GodId
  /** 決定254：'full'＝セッション最初の戦闘／'short'＝2 戦目以降・もう一度・リトライ */
  variant: BattleEntranceVariant
  /** 神階（0＝通常）。タグ表示のみ */
  stake?: number
  /** Daily（神域挑戦）。★5表示・タグ */
  daily?: boolean
  onDone: () => void
}

/**
 * 決定128 Boss Entrance → 決定254 Game Entry「降臨の間」。
 * 暗転 → 神紋 → 選んだ神の降臨 → 舞台と敵の顕現（対峙）→ HUD 開示。
 * - 新規開始（`battleStartKey` 増分）のときだけ。「続きから」再開では出さない（従来どおり）
 * - mount の最初の frame から不透明（HUD を透かさない）。操作可能時刻までは入口が入力を受け、
 *   タップ／Enter／Space／Esc で skip（未再生の SE は取り消す）。skip の入力は HUD に届けない
 * - reduced-motion：神と敵を静止で同時表示し opacity だけで閉じる
 * - 表示専用。engine・スコア・seed・保存に関与しない（dispatch 0）
 */
export function BossEntrance({ enemyId, godId, variant, stake = 0, daily = false, onDone }: BossEntranceProps) {
  const def = getEnemyDef(enemyId)
  const god = getGodDef(godId)
  const [reduced] = useState(prefersReducedMotion)
  const mode: BattleEntranceMode = reduced ? 'reduced' : variant
  const [released, setReleased] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [godImgFailed, setGodImgFailed] = useState(false)
  const timersRef = useRef<number[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const skippedRef = useRef(false)

  useEffect(() => {
    const timing = BATTLE_ENTRANCE_TIMING[mode]
    const timers = timersRef.current
    let started = false
    /**
     * 入口の時計を 1 本にする。基準＝root の CSS animation の startTime（compositor が実際に描き始めた時刻）。
     * - 入口配下の全 animation の startTime を基準に揃える（mount 直後の frame が重い端末では、main thread で動く
     *   animation（神紋）が compositor で動く animation（root・神・敵）より早く始まってしまうため）
     * - SE・操作開放・消滅の予約は「基準からの経過」を差し引いて予約する（ready の解決が遅れても絵と音がずれない）
     */
    const start = (base: number | null) => {
      if (started || skippedRef.current) return
      started = true
      const root = rootRef.current
      const nowT = typeof document !== 'undefined' ? document.timeline?.currentTime : null
      let elapsed = 0
      if (root && typeof root.getAnimations === 'function' && typeof base === 'number' && typeof nowT === 'number') {
        for (const a of root.getAnimations({ subtree: true })) a.startTime = base
        elapsed = Math.max(0, nowT - base)
      }
      const at = (ms: number) => Math.max(0, ms - elapsed)
      timers.push(
        window.setTimeout(() => sfx.godDescend(), at(timing.godSeMs)),
        window.setTimeout(() => sfx.bossEntrance(), at(timing.bossSeMs)),
        window.setTimeout(() => setReleased(true), at(timing.control)),
        window.setTimeout(onDone, at(timing.total)),
      )
    }
    // 基準時刻は root animation の ready 後に確定する。ready が来ない環境でも 400ms で必ず開始（安全弁）。
    // 安全弁の時点で startTime が未確定（compositor がまだ描き始めていない）なら、全 animation を「今」から始める
    const anim = rootRef.current?.getAnimations?.()[0]
    if (anim) {
      const startFromAnim = () => {
        const st = anim.startTime
        const nowT = document.timeline?.currentTime
        start(typeof st === 'number' ? st : typeof nowT === 'number' ? nowT : null)
      }
      timers.push(window.setTimeout(startFromAnim, 400))
      void anim.ready.then(startFromAnim, startFromAnim)
    } else {
      start(null)
    }
    return () => {
      started = true
      for (const t of timers) window.clearTimeout(t)
      timers.length = 0
    }
  }, [mode, onDone])

  const skip = useCallback(() => {
    skippedRef.current = true
    const timers = timersRef.current
    // 未再生の SE・操作開放・消滅の予約を取り消す（再生中の SE はそのまま）
    for (const t of timers) window.clearTimeout(t)
    timers.length = 0
    setSkipped(true)
    timers.push(window.setTimeout(onDone, BATTLE_ENTRANCE_SKIP_FADE_MS))
  }, [onDone])

  // キー入力は入口が入力を受けている間だけ捕捉する（操作開放後・skip 後は戦闘へ渡す）
  useEffect(() => {
    if (released || skipped) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (!SKIP_KEYS.has(e.key)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      absorbSkipTail('key', e.key)
      skip()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [released, skipped, skip])

  const stars = daily ? 5 : def.rank
  const className = ['battle-entrance', `battle-entrance-${mode}`, released ? 'is-released' : '', skipped ? 'is-skipped' : '']
    .filter(Boolean)
    .join(' ')
  return (
    <div
      ref={rootRef}
      className={className}
      aria-hidden="true"
      data-testid="boss-entrance"
      data-variant={mode}
      style={{ '--god-accent': GOD_THEME_COLOR[godId].base } as CSSProperties}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (released || skipped) return
        e.preventDefault()
        absorbSkipTail('pointer', e.pointerId)
        skip()
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="battle-entrance-bg" style={def.stage.bg ? { backgroundImage: `url('${def.stage.bg}')` } : undefined} />
      <div className="battle-entrance-god-slot">
        {mode === 'full' && <div className="battle-entrance-sigil" />}
        {!godImgFailed && (
          <img className="battle-entrance-god" src={god.art.front} alt="" draggable={false} onError={() => setGodImgFailed(true)} />
        )}
        <div className="battle-entrance-god-title">{god.nameJa} 降臨</div>
      </div>
      <div className="boss-entrance-body battle-entrance-enemy">
        <div className="boss-entrance-stage">{def.stage.nameJa}</div>
        <div className="boss-entrance-art" style={{ backgroundImage: `url(${def.art})` }} />
        <div className="boss-entrance-name">{def.name}</div>
        <div className="boss-entrance-meta">
          <span className="boss-entrance-threat" aria-label={`脅威度 ${stars} / 5`}>
            {'★'.repeat(stars)}
            <span className="boss-entrance-threat-empty">{'★'.repeat(Math.max(0, 5 - stars))}</span>
          </span>
          <span className="boss-entrance-type">【{def.typeLabel}】</span>
          {daily && <span className="boss-entrance-tag">DAILY 神域強化</span>}
          {stake > 0 && <span className="boss-entrance-tag">{stakeLabel(stake)}</span>}
        </div>
        <div className="boss-entrance-start">START</div>
      </div>
      <div className="battle-entrance-skip-hint">
        <span className="battle-entrance-skip-pc">クリックでスキップ</span>
        <span className="battle-entrance-skip-sp">タップでスキップ</span>
      </div>
    </div>
  )
}
