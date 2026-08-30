import { useCallback, useEffect, useRef } from 'react'
import type { CardDef, Effect, GameStatus } from '../../core/types'
import { DIVINATION_CHOICES } from '../../core/data/divination'
import {
  BURST_BANNER_MS,
  BURST_EVOLVE_MS,
  ENEMY_CUTIN_TOTAL_MS,
  MULTI_CUTIN_LEAD_MS,
  SPECIAL_IMPACT_MS,
  multiHitOffsetMs,
} from './enemyVfxTiming'

/**
 * 決定125：Mobile Battle Auto Focus（表示専用）。
 *
 * 375px級の縦積みBattleでは手札と敵パネルが約1,000px以上離れており、カードを使った
 * 瞬間の攻撃VFX・被弾シェイク・ダメージ数字が画面外で再生されて見えない。
 * 「敵エリアを見る意味があるイベント」（敵ダメージカード／BURST／敵ターンの攻撃・必殺／
 * 敵ダメージを伴う託宣）のときだけ敵パネルへスクロールし、演出が終わったら
 * 使用直前のscrollYへ戻す。回復・防御・敵ダメージの無い託宣では動かない
 * （画面が上下に暴れないため）。
 *
 * - Desktop/Tablet（{@link MOBILE_FOCUS_QUERY} に一致しない幅）では一切動作しない
 * - engine/GameStateには触れない。既存のpendingCardUid（280msのcast-flash）を
 *   スクロール猶予として使うだけで、ゲーム処理を遅延させる追加delayは持たない
 * - 自動復帰を待つ間にユーザー操作（pointerdown/touchstart/wheel/keydown）を検知したら
 *   復帰をキャンセルする（ユーザーと自動スクロールの「綱引き」を起こさない）
 * - prefers-reduced-motion では smooth を使わず instant（auto）で移動する。
 *   「動きを減らす設定だから攻撃結果が見えない」状態にはしない
 */
export const MOBILE_FOCUS_QUERY = '(max-width: 700px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
/** スクロール先。EnemyPanelのルート要素（敵art・HP・予兆・数字を同時に収める） */
export const FOCUS_TARGET_SELECTOR = '.enemy-panel'

/** 浮遊ダメージ数字の寿命（useFloatingNumbers.ts の LIFETIME と同じ 900ms）ぶんの見せ時間 */
const HIT_TAIL_MS = 900
/** 攻撃カード：タップ→280ms cast→lunge 450→数字 900 を見せてから戻る */
export const FOCUS_HOLD_CARD_MS = 1600
/** 敵ターン：「敵のターン」バナー700ms＋通常攻撃のlunge/被弾を見せる基本の保持時間。
 *  実際の攻撃種別（連撃・必殺）が確定した時点で下の各式へ延長する */
export const FOCUS_HOLD_ENEMY_TURN_MS = 2000
/** BURST：共鳴カットイン→神の一撃→OTOMO進化バナーの終わりまで */
export const FOCUS_HOLD_BURST_MS = BURST_EVOLVE_MS + BURST_BANNER_MS + 200
/** 敵必殺（砲撃型）：カットイン→着弾→数字 */
export const FOCUS_HOLD_ENEMY_SPECIAL_MS = ENEMY_CUTIN_TOTAL_MS + SPECIAL_IMPACT_MS + HIT_TAIL_MS
/** 敵連撃：カットイン→最終HIT→数字 */
export function focusHoldMultiHitMs(hitCount: number): number {
  return MULTI_CUTIN_LEAD_MS + multiHitOffsetMs(Math.max(0, hitCount - 1)) + HIT_TAIL_MS
}
/** 敵通常攻撃：lunge 450＋数字 */
export const FOCUS_HOLD_ENEMY_NORMAL_MS = 500 + HIT_TAIL_MS

/** 敵へダメージを与える効果を含むか（既存Effectデータの判定のみ。カード名は見ない） */
export function dealsEnemyDamage(effects: readonly Effect[]): boolean {
  return effects.some((e) => e.kind === 'damage' && e.target === 'enemy' && e.amount > 0)
}

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

const CANCEL_EVENTS = ['pointerdown', 'touchstart', 'wheel', 'keydown'] as const

type FocusSession = {
  savedY: number
  timer: number | null
  onUserInput: () => void
}

type UseMobileAutoFocusArgs = {
  status: GameStatus
  pendingCardUid: string | null
  pendingCardDef: CardDef | null
  burstKey: number
  isEnemyTurn: boolean
  enemyAttackKey: number
  enemySpecialKey: number
  enemySpecialKind: string | null
  multiHitCount: number
}

export type UseMobileAutoFocus = {
  /** 託宣選択の直前に呼ぶ。敵ダメージを伴う選択肢のときだけフォーカスする */
  focusForDivination: (choiceIndex: number) => void
}

export function useMobileAutoFocus({
  status,
  pendingCardUid,
  pendingCardDef,
  burstKey,
  isEnemyTurn,
  enemyAttackKey,
  enemySpecialKey,
  enemySpecialKind,
  multiHitCount,
}: UseMobileAutoFocusArgs): UseMobileAutoFocus {
  const sessionRef = useRef<FocusSession | null>(null)

  const endSession = useCallback(() => {
    const s = sessionRef.current
    if (!s) return
    if (s.timer !== null) window.clearTimeout(s.timer)
    for (const ev of CANCEL_EVENTS) window.removeEventListener(ev, s.onUserInput, true)
    sessionRef.current = null
  }, [])

  /** 保持時間が過ぎたら使用直前のscrollYへ戻す（ユーザー操作があれば呼ばれない） */
  const armReturn = useCallback(
    (holdMs: number) => {
      const s = sessionRef.current
      if (!s) return
      if (s.timer !== null) window.clearTimeout(s.timer)
      s.timer = window.setTimeout(() => {
        const savedY = s.savedY
        endSession()
        window.scrollTo({ top: savedY, behavior: matches(REDUCED_MOTION_QUERY) ? 'auto' : 'smooth' })
      }, holdMs)
    },
    [endSession],
  )

  const scrollToTarget = (target: HTMLElement) =>
    target.scrollIntoView({ block: 'start', behavior: matches(REDUCED_MOTION_QUERY) ? 'auto' : 'smooth' })

  /**
   * フォーカス中に敵パネルが目標位置から外れていたら寄せ直す。
   * END_ROUND/PLAY_CARDのcommitで手札が入れ替わり文書の高さが変わると、進行中のsmooth scrollが
   * 途中で打ち切られることがある（QAで実測：目標147pxに対し223pxで停止）。演出の本体
   * （lunge・被弾・数字）が始まる攻撃確定のタイミングで一度だけ位置を確認する。
   */
  const reassert = useCallback(() => {
    if (!sessionRef.current) return
    const target = document.querySelector<HTMLElement>(FOCUS_TARGET_SELECTOR)
    if (!target) return
    // scroll-margin-top（battle.css: 8px）ぶんを許容し、それ以上ズレていれば寄せ直す
    if (Math.abs(target.getBoundingClientRect().top) > 24) scrollToTarget(target)
  }, [])

  /**
   * 敵パネルへフォーカスする。既にフォーカス中なら位置は動かさず保持時間だけ延長する
   * （連続した攻撃・BURST・敵ターンの間、最初の「使用直前の位置」を保持し続ける）。
   */
  const focus = useCallback(
    (holdMs: number) => {
      if (!matches(MOBILE_FOCUS_QUERY)) return
      const target = document.querySelector<HTMLElement>(FOCUS_TARGET_SELECTOR)
      if (!target) return
      if (!sessionRef.current) {
        const session: FocusSession = {
          savedY: window.scrollY,
          timer: null,
          onUserInput: () => endSession(),
        }
        for (const ev of CANCEL_EVENTS) window.addEventListener(ev, session.onUserInput, true)
        sessionRef.current = session
        scrollToTarget(target)
      }
      armReturn(holdMs)
    },
    [armReturn, endSession],
  )

  /** 攻撃カード：タップ直後（pendingCardUidが立った瞬間）にフォーカス */
  const seenPendingRef = useRef<string | null>(null)
  useEffect(() => {
    if (!pendingCardUid || seenPendingRef.current === pendingCardUid) return
    seenPendingRef.current = pendingCardUid
    if (pendingCardDef && dealsEnemyDamage(pendingCardDef.effects)) focus(FOCUS_HOLD_CARD_MS)
  }, [pendingCardUid, pendingCardDef, focus])

  /** BURST：共鳴カットインの暗転中に移動し、神の一撃→OTOMO進化の終わりまで保持 */
  const seenBurstRef = useRef(burstKey)
  useEffect(() => {
    if (burstKey === seenBurstRef.current) return
    seenBurstRef.current = burstKey
    focus(FOCUS_HOLD_BURST_MS)
    reassert()
  }, [burstKey, focus, reassert])

  /** 敵ターン：ラウンド終了直後（「敵のターン」バナー中）に移動 */
  const seenEnemyTurnRef = useRef(false)
  useEffect(() => {
    if (isEnemyTurn && !seenEnemyTurnRef.current) focus(FOCUS_HOLD_ENEMY_TURN_MS)
    seenEnemyTurnRef.current = isEnemyTurn
  }, [isEnemyTurn, focus])

  /** 敵の攻撃種別が確定したら、その演出が終わるまで保持時間を延長 */
  const seenEnemyAttackRef = useRef(enemyAttackKey)
  useEffect(() => {
    if (enemyAttackKey === seenEnemyAttackRef.current) return
    seenEnemyAttackRef.current = enemyAttackKey
    if (!sessionRef.current) return
    reassert()
    armReturn(multiHitCount > 1 ? focusHoldMultiHitMs(multiHitCount) : FOCUS_HOLD_ENEMY_NORMAL_MS)
  }, [enemyAttackKey, multiHitCount, armReturn, reassert])

  const seenEnemySpecialRef = useRef(enemySpecialKey)
  useEffect(() => {
    if (enemySpecialKey === seenEnemySpecialRef.current) return
    seenEnemySpecialRef.current = enemySpecialKey
    if (!sessionRef.current) return
    reassert()
    armReturn(enemySpecialKind === 'special' ? FOCUS_HOLD_ENEMY_SPECIAL_MS : focusHoldMultiHitMs(Math.max(2, multiHitCount)))
  }, [enemySpecialKey, enemySpecialKind, multiHitCount, armReturn, reassert])

  /** 決着（勝敗/未撃破）後はオーバーレイに切り替わるため、復帰スクロールはしない */
  useEffect(() => {
    if (status !== 'playing') endSession()
  }, [status, endSession])

  useEffect(() => endSession, [endSession])

  const focusForDivination = useCallback(
    (choiceIndex: number) => {
      const choice = DIVINATION_CHOICES[choiceIndex]
      if (choice && dealsEnemyDamage(choice.effects)) focus(FOCUS_HOLD_CARD_MS)
    },
    [focus],
  )

  return { focusForDivination }
}
