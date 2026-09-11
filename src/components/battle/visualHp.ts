/**
 * Phase 6-A Combat Juice（決定162）：表示用HP（visual HP）の追従。
 *
 * engine の HP（GameState）は従来どおり commit の瞬間に更新される。ここで扱うのは
 * 「画面上のHPバーとHP数値」だけで、着弾より先に減らないよう、各着弾の時刻に合わせて
 * 未表示ぶんのダメージ（pending）を1つずつ解放する。
 *
 *   表示HP ＝ min(最大HP, 実HP ＋ まだ見せていないダメージ)
 *
 * - 回復・再開（続きから）・新しい対局では遅延させず、すぐ実HPへ合わせる（ゴーストを出さない）
 * - 着弾計画の無い減少（想定外）も即時反映する（表示が実HPから離れたまま残らない）
 * - タイマーは setTimeout のみ（animationend に依存しない）。背景タブで遅れても必ず最後は実HPへ戻る
 * - タイマー関数は注入できるため、ブラウザ無しでテストできる
 */

export type HpStep = { amount: number; atMs: number }

export type TimerApi = {
  setTimeout: (fn: () => void, ms: number) => unknown
  clearTimeout: (id: unknown) => void
}

export type VisualHpTracker = {
  /** 現在の表示HP */
  readonly shown: number
  /**
   * 実HPの更新を伝える。steps はそのバッチでこの対象が受けた着弾（visualHpStartMs 済み）。
   * steps が無い・空の場合は即時反映
   */
  update: (actualHp: number, steps?: readonly HpStep[] | null) => void
  /** 新しい対局・再開：保留を捨てて実HPへ合わせる */
  reset: (actualHp: number) => void
  /** すべての保留を即時に解放する（安全弁） */
  flush: () => void
  dispose: () => void
}

export function createVisualHpTracker(timers: TimerApi, maxHp: () => number, onChange: (shown: number) => void): VisualHpTracker {
  let actual: number | null = null
  let pending = 0
  let shown = 0
  const live = new Map<unknown, number>()

  const emit = () => {
    const next = Math.max(0, Math.min(maxHp(), (actual ?? 0) + pending))
    if (next !== shown) {
      shown = next
      onChange(shown)
    }
  }

  const clearAll = () => {
    for (const id of live.keys()) timers.clearTimeout(id)
    live.clear()
    pending = 0
  }

  return {
    get shown() {
      return shown
    },
    update(actualHp, steps) {
      if (actual === null) {
        // 初期化：通知しない（描画中に呼ばれても setState を起こさない）
        actual = actualHp
        shown = Math.max(0, Math.min(maxHp(), actualHp))
        return
      }
      const drop = actual - actualHp
      actual = actualHp
      if (drop > 0 && steps && steps.length > 0) {
        // 着弾ごとに解放する。overkill（HPを超えた分）は後ろの着弾から削る
        let left = drop
        for (const s of steps) {
          const a = Math.min(left, s.amount)
          if (a <= 0) continue
          left -= a
          pending += a
          const id: unknown = timers.setTimeout(() => {
            const amount = live.get(id) ?? 0
            live.delete(id)
            pending = Math.max(0, pending - amount)
            emit()
          }, Math.max(0, s.atMs))
          live.set(id, a)
        }
        // 計画で説明できない分（通常は起きない）は即時反映
      }
      emit()
    },
    reset(actualHp) {
      clearAll()
      actual = actualHp
      emit()
    },
    flush() {
      clearAll()
      emit()
    },
    dispose() {
      clearAll()
    },
  }
}

/** 表示HPの段階（敵：追い詰めた感の見た目に使う。常時点滅はしない） */
export function hpBand(shown: number, max: number): 'high' | 'half' | 'quarter' {
  if (max <= 0) return 'high'
  const r = shown / max
  if (r <= 0.25) return 'quarter'
  if (r <= 0.5) return 'half'
  return 'high'
}
