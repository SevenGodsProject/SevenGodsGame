import { useEffect, useState } from 'react'

/** 表示の再描画間隔。「次の敵まで HH:MM」の分表示が最大この時間だけ遅れる */
export const MINUTE_CLOCK_TICK_MS = 30_000

/**
 * Phase 7 P1（決定187）：「次の敵まで HH:MM」など、分単位の表示を進めるための現在時刻。
 * **表示専用**。日付キーの切替や神域挑戦の回数には関与しない（`todayDailyKey` を呼ぶ側が
 * この値を渡すだけ）。`enabled` が false の間はタイマーを張らない。
 */
export function useMinuteClock(enabled = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return undefined
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), MINUTE_CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [enabled])
  return now
}
