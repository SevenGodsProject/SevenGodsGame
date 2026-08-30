import type { GameStatus } from '../../core/types'

/**
 * 決定125：Mobile Battle Auto Focus のセッション制御（React・DOM非依存の純粋ロジック）。
 * `useMobileAutoFocus.ts` が window/document を `AutoFocusEnv` として注入して使う。
 * 分離している理由＝node環境のvitestで「勝敗確定後は新しいセッションを開始しない」
 * （決定125フォローアップ：BURSTで敵を撃破した際、status='won'の1レンダー後に
 * burstKeyの増分が新セッションを開始し、約3.4秒後にRewardOverlayの背後で不要な
 * 復帰スクロールが発火していた）等の回帰を、ブラウザ無しで直接検証するため。
 */
export type AutoFocusTarget = {
  scrollIntoView: (opts: { block: 'start'; behavior: 'auto' | 'smooth' }) => void
  getBoundingClientRect: () => { top: number }
}

export type AutoFocusEnv = {
  /** `(max-width: 700px)` に一致するか。Desktop/Tabletでは一切動作しない */
  isMobile: () => boolean
  /** `(prefers-reduced-motion: reduce)`。trueならsmoothではなくinstant（auto）で移動 */
  reducedMotion: () => boolean
  /** スクロール先（`.enemy-panel`）。無ければ何もしない */
  findTarget: () => AutoFocusTarget | null
  scrollY: () => number
  scrollTo: (top: number, behavior: 'auto' | 'smooth') => void
  setTimeout: (fn: () => void, ms: number) => number
  clearTimeout: (id: number) => void
  /** 復帰待ち中のユーザー操作（pointerdown/touchstart/wheel/keydown）を購読・解除 */
  addCancelListener: (fn: () => void) => void
  removeCancelListener: (fn: () => void) => void
}

export type AutoFocusController = {
  /** 対局状態の反映。'playing'以外になったら進行中のセッションを終了し、以後は開始しない */
  setStatus: (status: GameStatus) => void
  /**
   * 敵パネルへフォーカスし、`holdMs`後に使用直前のscrollYへ戻す。
   * 既にフォーカス中なら位置は動かさず保持時間だけ延長する。
   * 戻り値＝呼び出し後にセッションが有効か（Desktop／対象なし／対局終了後はfalse）。
   */
  focus: (holdMs: number) => boolean
  /** フォーカス中なら保持時間を延長（未フォーカスなら何もしない） */
  extend: (holdMs: number) => void
  /** フォーカス中に目標位置から24px超ズレていたら寄せ直す（レイアウト変更でsmooth scrollが打ち切られた時の補正） */
  reassert: () => void
  /** セッションを終了する（復帰スクロールはしない）。unmount時に使う */
  end: () => void
  isActive: () => boolean
}

/** scroll-margin-top（battle.css: 8px）ぶんを許容する再確認の閾値 */
export const REASSERT_TOLERANCE_PX = 24

export function createAutoFocusController(env: AutoFocusEnv): AutoFocusController {
  let status: GameStatus = 'playing'
  let session: { savedY: number; timer: number | null; onUserInput: () => void } | null = null

  const behavior = (): 'auto' | 'smooth' => (env.reducedMotion() ? 'auto' : 'smooth')

  const end = () => {
    if (!session) return
    if (session.timer !== null) env.clearTimeout(session.timer)
    env.removeCancelListener(session.onUserInput)
    session = null
  }

  const armReturn = (holdMs: number) => {
    if (!session) return
    const s = session
    if (s.timer !== null) env.clearTimeout(s.timer)
    s.timer = env.setTimeout(() => {
      const savedY = s.savedY
      end()
      env.scrollTo(savedY, behavior())
    }, holdMs)
  }

  return {
    setStatus(next) {
      status = next
      if (next !== 'playing') end()
    },
    focus(holdMs) {
      // 勝敗確定後（RewardOverlay/GameOverOverlay表示中）は新しいセッションを開始しない
      if (status !== 'playing') return false
      if (!env.isMobile()) return false
      const target = env.findTarget()
      if (!target) return false
      if (!session) {
        const onUserInput = () => end()
        session = { savedY: env.scrollY(), timer: null, onUserInput }
        env.addCancelListener(onUserInput)
        target.scrollIntoView({ block: 'start', behavior: behavior() })
      }
      armReturn(holdMs)
      return true
    },
    extend(holdMs) {
      if (session) armReturn(holdMs)
    },
    reassert() {
      if (!session) return
      const target = env.findTarget()
      if (!target) return
      if (Math.abs(target.getBoundingClientRect().top) > REASSERT_TOLERANCE_PX) {
        target.scrollIntoView({ block: 'start', behavior: behavior() })
      }
    },
    end,
    isActive: () => session !== null,
  }
}
