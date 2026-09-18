import type { NextGoal, ResultAction } from './nextGoal'
import { isSameBoardRematch } from './retrySemantics'

/**
 * Phase 7 P1（決定187・仕様 §5）：結果画面の出口を Primary 1／Secondary 2／Tertiary に並べる純関数。
 *
 * - Primary は「次の目標」の action そのもの（目標と出口が 1:1）
 * - 出口を同じ強さで並べない。Secondary は最大 2、残りは Tertiary（テキストリンク）
 * - 押せない Primary を作らない：神域挑戦の残り 0 回では「もう一度挑戦」を出さず「ホームへ」が Primary
 * - 報酬未確定（勝利直後）の「報酬カードを選ぶ」だけの状態はここを通らない（GameOverOverlay 側で維持）
 * - 「挑戦状をコピー」は常に Tertiary の末尾（行動導線より目立たせない）
 */

export type ResultExit = ResultAction | 'share'

export type ResultExitPlan = {
  primary: ResultExit
  primaryLabel: string
  secondary: ResultExit[]
  tertiary: ResultExit[]
}

export type ResultHubContext = {
  mode: 'normal' | 'daily'
  status: 'won' | 'lost' | 'finished'
  /** 神域挑戦の残り回数（通常モードでは無視） */
  dailyAttemptsLeft: number
  /** 挑戦状（Seed共有）を出せるか */
  canShare: boolean
}

export const EXIT_LABEL: Record<Exclude<ResultAction, 'rematch'>, string> = {
  adjustDeck: 'デッキを調整',
  goDaily: '今日の神域挑戦へ',
  home: 'ホームへ',
  reselect: '神・デッキを選び直す',
  startNormal: '神を選ぶ（通常攻略）',
  record: '戦績を見る',
}

export function exitLabel(exit: ResultExit, ctx: ResultHubContext): string {
  if (exit === 'share') return '挑戦状をコピー'
  if (exit === 'rematch') {
    if (ctx.mode === 'daily') return `もう一度挑戦（残り${ctx.dailyAttemptsLeft}回）`
    // 決定196（Solve Loop v1）：通常戦の敗北・未撃破は同じ盤面（同じ seed）で始め直す。
    // 文言と挙動を 1:1 にする＝「撃破する」と言われて別の手札が来る状態をなくす
    return isSameBoardRematch(ctx) ? '同じ盤面でもう一度' : '同じ構成でもう一度'
  }
  return EXIT_LABEL[exit]
}

const pick = (order: readonly ResultExit[], exclude: readonly ResultExit[], count: number): ResultExit[] =>
  order.filter((e) => !exclude.includes(e)).slice(0, count)

export function planResultExits(goal: NextGoal, ctx: ResultHubContext): ResultExitPlan {
  const share: ResultExit[] = ctx.canShare ? ['share'] : []

  if (ctx.mode === 'daily') {
    if (ctx.dailyAttemptsLeft <= 0) {
      // 今日の神域挑戦は終了：押せない「もう一度挑戦」は出さない
      return { primary: 'home', primaryLabel: exitLabel('home', ctx), secondary: ['startNormal', 'record'], tertiary: share }
    }
    return { primary: 'rematch', primaryLabel: exitLabel('rematch', ctx), secondary: ['adjustDeck', 'reselect'], tertiary: ['home', ...share] }
  }

  const primary: ResultExit = goal.action === 'startNormal' || goal.action === 'record' ? 'rematch' : goal.action
  const primaryLabel = goal.primaryLabel ?? exitLabel(primary, ctx)
  const won = ctx.status === 'won'
  const secondaryOrder: ResultExit[] = won ? ['adjustDeck', 'goDaily', 'rematch', 'reselect'] : ['adjustDeck', 'reselect', 'goDaily', 'rematch']
  const secondary = pick(secondaryOrder, [primary], 2)
  const tertiaryOrder: ResultExit[] = ['home', 'reselect', 'goDaily', 'rematch', 'adjustDeck']
  const tertiary = [...pick(tertiaryOrder, [primary, ...secondary], tertiaryOrder.length), ...share]
  return { primary, primaryLabel, secondary, tertiary }
}
