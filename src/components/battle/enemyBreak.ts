import { useLayoutEffect, useRef, useState } from 'react'
import { hpBand } from './visualHp'
import { sfx } from './sound'

/**
 * Combat Feel Premium v2 — Enemy Break v1「追い詰めた」の一回性反応（表示専用）。
 *
 * 敵の表示 HP（visualHp・着弾に合わせて追従する値）が 50%／25% の帯をまたいで下がった瞬間に 1 回だけ、
 *   ・体（`.enemy-collapse`）が相手から離れる方向へ崩れて暗くなり、戻る
 *   ・名札（`.enemy-plate`）に赤い閃きが 1 回走る
 *   ・傷の円（`.enemy-wound`・既存）が静かに現れるのではなく、ふくらんで現れる
 * を再生する。engine・HP・ダメージ・着弾時刻表（combatTimeline／enemyVfxTiming）には一切触れない。
 *
 * なぜ表示 HP の帯を起点にするか：帯の遷移は visualHp が解放する時刻（着弾 → hit stop → HP_LAG_MS）に
 * 起きるので、既存の着弾計画に新しい要素を足さなくても「着弾 → HP が削れる → 崩れる」の順になる
 * （決定232 の時刻表は不変。docs/PREMIUM_REAUDIT_2026-09-27.md §3 #5 の懸念への回答）。
 *
 * 階層（ノックバック px・PC）：L1 4 < L2 5 < break-half 7 < L3 8 < break-quarter 10 < L4 11 < 撃破 14。
 * 2 回／戦（確定・敵は回復しないので帯は下がるだけ）。撃破の一撃（表示 HP 0・outcome won）では再生しない
 * （決定226 の崩壊と重ねない）。
 */

export type BreakLevel = 'half' | 'quarter'
export type HpBandName = ReturnType<typeof hpBand>

export const ENEMY_BREAK = {
  /** 体の崩し（`.enemy-collapse`）の長さ（ms） */
  bodyMs: { half: 420, quarter: 560 },
  /** 名札の赤い閃き（`.enemy-plate::after`）の長さ（ms） */
  plateMs: { half: 520, quarter: 760 },
  /** 傷の円（`.enemy-wound`）がふくらんで現れる長さ（ms） */
  woundMs: { half: 600, quarter: 720 },
  /** ノックバック（相手から離れる方向＝既存の --atk-x／--atk-y）。PC／SP（<900px・決定229 の舞台は近いので小さく） */
  kbPx: { half: 7, quarter: 10 },
  kbPxSp: { half: 5, quarter: 7 },
} as const

export type EnemyBreakFx = {
  /** 再生回数（表示専用のキー） */
  key: number
  /** 直近の崩しの段階。帯が上がった（新しい対局など）ら null に戻す */
  level: BreakLevel | null
}

export const INITIAL_ENEMY_BREAK: EnemyBreakFx = { key: 0, level: null }

const RANK: Record<HpBandName, number> = { high: 0, half: 1, quarter: 2 }

/**
 * 帯の遷移から次の状態を決める純関数。
 * - 初回（prevBand null）は再生しない（再開・途中参加で帯が既に低くても鳴らさない）
 * - 下がった帯だけ再生（high→half／half→quarter／high→quarter はその到達帯）
 * - 上がった（新しい対局・全快）ら level を外す（古いクラスを次の対局へ持ち越さない）
 * - suppress（撃破の一撃・表示 HP 0）では再生せず、状態も変えない
 */
export function nextEnemyBreak(prev: EnemyBreakFx, prevBand: HpBandName | null, band: HpBandName, suppress: boolean): EnemyBreakFx {
  if (prevBand === null || prevBand === band) return prev
  if (RANK[band] < RANK[prevBand]) return prev.level === null ? prev : { key: prev.key, level: null }
  if (suppress) return prev
  return { key: prev.key + 1, level: band === 'quarter' ? 'quarter' : 'half' }
}

/** 付与するクラス（prefix: 'cf2-break'＝体／'cf2-break-plate'＝名札／'cf2-break-stage'＝舞台）。level が無ければ空文字 */
export function enemyBreakClass(prefix: string, level: BreakLevel | null): string {
  return level ? ` ${prefix} ${prefix}-${level}` : ''
}

/** CSS 変数（時間・距離は TS の定数が真実。CSS 側は var() で受けるだけ） */
export function enemyBreakVars(level: BreakLevel | null): Record<string, string> {
  const l = level ?? 'half'
  return {
    '--cf2-body-ms': `${ENEMY_BREAK.bodyMs[l]}ms`,
    '--cf2-plate-ms': `${ENEMY_BREAK.plateMs[l]}ms`,
    '--cf2-wound-ms': `${ENEMY_BREAK.woundMs[l]}ms`,
    '--cf2-kb-pc': `${ENEMY_BREAK.kbPx[l]}px`,
    '--cf2-kb-sp': `${ENEMY_BREAK.kbPxSp[l]}px`,
  }
}

/**
 * 表示 HP の帯を見張り、下がった瞬間だけ EnemyBreakFx を進める hook（EnemyPanel 専用）。
 * useLayoutEffect：HP の描画と同じ描画サイクルでクラスを付ける（1 フレーム以内）。
 */
export function useEnemyBreak(hpShown: number, maxHp: number, suppress: boolean): EnemyBreakFx {
  const [fx, setFx] = useState<EnemyBreakFx>(INITIAL_ENEMY_BREAK)
  const prevBand = useRef<HpBandName | null>(null)
  const band = hpBand(hpShown, maxHp)
  useLayoutEffect(() => {
    const prev = prevBand.current
    prevBand.current = band
    setFx((cur) => nextEnemyBreak(cur, prev, band, suppress))
  }, [band, suppress])
  return fx
}

/**
 * Enemy Break SE v1（v1.0.5・docs/V1_0_5_BREAK_SE_V1.md）：敵が溜め予告中（EnemyPanel が
 * `enemy-avatar-charging` を付けている同じ真偽値）なら half は鳴らさず quarter だけ鳴らす
 * （溜めの警告音と同じ音源が「敵の予告」と取り違えられないように。quarter は 1 戦 1 回の決め所なので残す）
 */
export function shouldPlayBreakSe(level: BreakLevel, charging: boolean): boolean {
  return !(charging && level === 'half')
}

/**
 * この描画で鳴らす崩しの音（純関数）。`playedKey` より key が進んだ崩しだけを 1 回返す
 * （同じ key の再描画・帯が上がって level が外れた描画・初回 key 0 では null）
 */
export function breakSeToPlay(fx: EnemyBreakFx, playedKey: number, charging: boolean): BreakLevel | null {
  if (fx.key <= playedKey || fx.level === null) return null
  return shouldPlayBreakSe(fx.level, charging) ? fx.level : null
}

/**
 * Enemy Break SE v1：崩し（useEnemyBreak の key）が進んだ同じ描画サイクルで 1 回だけ鳴らす hook。
 * 起点は崩しのクラスと同じ useLayoutEffect＝着弾 → hit stop → HP_LAG_MS の後。新しい timer は作らない
 * （着弾時刻表は不変）。ミュートは sound.ts の経路に従う。reduced-motion でも音は鳴らす（決定257 の方針）
 */
export function useEnemyBreakSe(fx: EnemyBreakFx, charging: boolean): void {
  const playedKey = useRef(fx.key)
  useLayoutEffect(() => {
    const level = breakSeToPlay(fx, playedKey.current, charging)
    if (fx.key > playedKey.current) playedKey.current = fx.key
    if (level) sfx.enemyBreak(level)
  }, [fx, charging])
}
