import { useLayoutEffect } from 'react'
import { prefersReducedMotion } from './reducedMotion'
import { CARD_TRAVEL_MS, planCardTravel } from './cardTravel'
import './cardTravel.css'

/**
 * Card Travel v1「神へ捧げる」の DOM 側（docs/CARD_PLAY_TRAVEL_PRE_AUDIT.md §6-2）。
 *
 * タップの瞬間（pendingCardUid が立った描画の直後・paint 前）に、手札に出ている同じカードの DOM を
 * cloneNode で複製した「ゴースト」を body 直下（position: fixed）に置き、WAAPI で神の立ち絵へ飛ばす。
 * 手札の元カードは data-travel でその場に不可視にする（元の card-play は 1 フレームも見えない）。
 *
 * - 新しい state を持たない・入力ロック（isPlayerTurn）と CARD_PLAY_REVEAL_MS に触れない
 * - ゴーストは pointer-events: none・inert・aria-hidden で、240ms（commit の 40ms 前）に DOM から消える
 * - 読み取りは getBoundingClientRect×2＋offsetWidth/Height をタップ 1 回につき 1 度だけ（フレームごとの JS なし）
 * - 元カード／神の立ち絵が見つからない・WAAPI が無い・reduced-motion → 何もしない（＝現行の card-play にフォールバック。
 *   reduced-motion は cardTravel.css で 120ms の opacity フェードだけになる）
 */
export function useCardTravel(pendingCardUid: string | null): void {
  useLayoutEffect(() => {
    if (!pendingCardUid) return undefined
    return spawnCardTravel(document)
  }, [pendingCardUid])
}

/**
 * ゴーストを 1 枚作って飛ばし、後始末の関数を返す（連打・画面遷移・StrictMode の二重実行でも残らない）。
 * 何もしなかったときは undefined。
 */
export function spawnCardTravel(doc: Document): (() => void) | undefined {
  if (prefersReducedMotion()) return undefined
  const src = doc.querySelector<HTMLElement>('.hand .card-view-playing')
  const god = doc.querySelector<HTMLElement>('.player-avatar')
  if (!src || !god || typeof src.animate !== 'function') return undefined

  // 読み取りはここで 1 回だけ（React の commit 直後＝強制レイアウト 1 回）。以後は transform／opacity の書き込みのみ
  const from = src.getBoundingClientRect()
  const to = god.getBoundingClientRect()
  const baseWidth = src.offsetWidth
  const baseHeight = src.offsetHeight
  if (from.width === 0 || baseWidth === 0) return undefined

  const ghost = src.cloneNode(true) as HTMLElement
  ghost.classList.remove('card-view-playing')
  ghost.classList.add('card-travel-ghost')
  ghost.querySelectorAll('.card-view-ignite').forEach((el) => el.remove())
  ghost.removeAttribute('disabled')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.setAttribute('inert', '')
  ghost.setAttribute('tabindex', '-1')
  // 中心合わせ：hover／READY の scale・translate は from（見た目の矩形）に含まれているので、
  // 未変形の寸法で置いて最初の keyframe の scale(s0) で見た目を引き継ぐ（跳ねない）
  const cx = from.left + from.width / 2
  const cy = from.top + from.height / 2
  ghost.style.left = `${cx - baseWidth / 2}px`
  ghost.style.top = `${cy - baseHeight / 2}px`
  ghost.style.width = `${baseWidth}px`
  ghost.style.height = `${baseHeight}px`

  doc.body.appendChild(ghost)
  // React が管理しない属性＝再描画で消えない。元カードは commit で DOM ごと消える
  src.dataset.travel = '1'

  const anim = ghost.animate(planCardTravel(from, baseWidth, to), { duration: CARD_TRAVEL_MS, fill: 'forwards' })
  // 開始時刻を「今のフレーム」に固定する（既定は次の描画機会＝最大 1 フレーム遅れて始まり、その分だけ遅く終わる）。
  // これで終了（opacity 0）は必ずタップ後 CARD_TRAVEL_MS ＋ 数 ms 以内＝commit（280ms）の前になる
  const tl = doc.timeline?.currentTime
  if (typeof tl === 'number') anim.startTime = tl
  // DOM からの削除：finish イベント（終了後の次のフレーム）と、同じ長さのタイマーの早い方。
  // タイマーは開始時刻より後にしか鳴らず、その時点で animation は fill: forwards の最終フレーム（opacity 0）に達している
  const remove = () => ghost.remove()
  anim.onfinish = remove
  const timer = window.setTimeout(remove, CARD_TRAVEL_MS)
  return () => {
    window.clearTimeout(timer)
    anim.cancel()
    ghost.remove()
  }
}
