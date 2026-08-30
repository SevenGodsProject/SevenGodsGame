import { describe, expect, it } from 'vitest'
import { createAutoFocusController, type AutoFocusEnv } from './autoFocusSession'

/**
 * 決定125フォローアップ：Mobile Battle Auto Focus のセッション制御を、ブラウザ無しで検証する。
 * 特に「BURSTで敵を撃破 → status='won' の後に burstKey が増分しても新しいセッションを
 * 開始しない（RewardOverlayの背後で不要な復帰スクロールが発火しない）」の回帰保証。
 */
function fakeEnv(overrides: Partial<AutoFocusEnv> = {}) {
  const calls = { scrollIntoView: [] as string[], scrollTo: [] as Array<[number, string]>, cleared: 0 }
  const timers = new Map<number, () => void>()
  let nextId = 1
  let listener: (() => void) | null = null
  let top = 1000 // 敵パネルのviewport内位置（1000＝手札まで下にスクロールしている状態）
  let y = 1434
  const env: AutoFocusEnv = {
    isMobile: () => true,
    reducedMotion: () => false,
    findTarget: () => ({
      scrollIntoView: (o) => {
        calls.scrollIntoView.push(o.behavior)
        top = 0
        y = 147
      },
      getBoundingClientRect: () => ({ top }),
    }),
    scrollY: () => y,
    scrollTo: (t, b) => {
      calls.scrollTo.push([t, b])
      y = t
    },
    setTimeout: (fn) => {
      const id = nextId++
      timers.set(id, fn)
      return id
    },
    clearTimeout: (id) => {
      if (timers.delete(id)) calls.cleared++
    },
    addCancelListener: (fn) => {
      listener = fn
    },
    removeCancelListener: () => {
      listener = null
    },
    ...overrides,
  }
  const fireTimers = () => {
    const fns = [...timers.values()]
    timers.clear()
    fns.forEach((fn) => fn())
  }
  return { env, calls, timers, fireTimers, userInput: () => listener?.(), setTop: (t: number) => (top = t), getY: () => y }
}

describe('createAutoFocusController (決定125)', () => {
  it("status='playing': focuses the enemy panel and returns to the saved scrollY after the hold", () => {
    const f = fakeEnv()
    const c = createAutoFocusController(f.env)
    expect(c.focus(1600)).toBe(true)
    expect(f.calls.scrollIntoView).toEqual(['smooth'])
    expect(c.isActive()).toBe(true)
    f.fireTimers()
    expect(f.calls.scrollTo).toEqual([[1434, 'smooth']])
    expect(c.isActive()).toBe(false)
  })

  it("status='won' + burstKey increment: does NOT start a new session (no scroll, no return timer)", () => {
    const f = fakeEnv()
    const c = createAutoFocusController(f.env)
    c.focus(1600) // 攻撃カードのタップでフォーカス中
    c.setStatus('won') // BURSTの一撃で撃破 → commitでwon
    expect(c.isActive()).toBe(false)
    expect(c.focus(3400)).toBe(false) // 1レンダー後のburstKey増分
    expect(c.isActive()).toBe(false)
    expect(f.calls.scrollIntoView).toEqual(['smooth']) // 最初の1回だけ
    f.fireTimers()
    expect(f.calls.scrollTo).toEqual([]) // RewardOverlayの背後で復帰スクロールしない
  })

  it("status='lost': does NOT start a new session", () => {
    const f = fakeEnv()
    const c = createAutoFocusController(f.env)
    c.setStatus('lost')
    expect(c.focus(2000)).toBe(false)
    expect(f.calls.scrollIntoView).toEqual([])
    f.fireTimers()
    expect(f.calls.scrollTo).toEqual([])
  })

  it("status='finished': does NOT start a new session either", () => {
    const f = fakeEnv()
    const c = createAutoFocusController(f.env)
    c.setStatus('finished')
    expect(c.focus(2000)).toBe(false)
    expect(c.isActive()).toBe(false)
  })

  it('ending the battle mid-session cancels the pending return', () => {
    const f = fakeEnv()
    const c = createAutoFocusController(f.env)
    c.focus(1600)
    c.setStatus('won')
    expect(f.calls.cleared).toBe(1)
    f.fireTimers()
    expect(f.calls.scrollTo).toEqual([])
  })

  it('extends the hold instead of re-scrolling while a session is active (BURST / enemy turn chains)', () => {
    const f = fakeEnv()
    const c = createAutoFocusController(f.env)
    c.focus(1600)
    c.focus(3400) // 同一セッション内の2回目（BURST）
    c.extend(2500)
    expect(f.calls.scrollIntoView).toHaveLength(1)
    expect(f.timers.size).toBe(1) // 常に1本だけ
    f.fireTimers()
    expect(f.calls.scrollTo).toEqual([[1434, 'smooth']])
  })

  it('user input while waiting cancels the automatic return', () => {
    const f = fakeEnv()
    const c = createAutoFocusController(f.env)
    c.focus(1600)
    f.userInput()
    expect(c.isActive()).toBe(false)
    f.fireTimers()
    expect(f.calls.scrollTo).toEqual([])
  })

  it('prefers-reduced-motion uses instant scrolling but still focuses', () => {
    const f = fakeEnv({ reducedMotion: () => true })
    const c = createAutoFocusController(f.env)
    expect(c.focus(1600)).toBe(true)
    expect(f.calls.scrollIntoView).toEqual(['auto'])
    f.fireTimers()
    expect(f.calls.scrollTo).toEqual([[1434, 'auto']])
  })

  it('does nothing on desktop widths', () => {
    const f = fakeEnv({ isMobile: () => false })
    const c = createAutoFocusController(f.env)
    expect(c.focus(1600)).toBe(false)
    c.extend(1000)
    c.reassert()
    f.fireTimers()
    expect(f.calls.scrollIntoView).toEqual([])
    expect(f.calls.scrollTo).toEqual([])
  })

  it('reassert re-scrolls only when the target drifted beyond the tolerance', () => {
    const f = fakeEnv()
    const c = createAutoFocusController(f.env)
    c.focus(1600)
    f.setTop(12)
    c.reassert()
    expect(f.calls.scrollIntoView).toHaveLength(1)
    f.setTop(70) // END_ROUNDのレイアウト変更でsmooth scrollが打ち切られた状態
    c.reassert()
    expect(f.calls.scrollIntoView).toHaveLength(2)
  })
})
