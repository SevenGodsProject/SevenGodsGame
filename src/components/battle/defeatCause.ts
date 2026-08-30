import type { GameEvent } from '../../core/types'
import { formatScaled } from '../displayScale'

export type DefeatCause = {
  round: number
  /** 敵の技名（label）または種別に応じた語（攻撃／連撃／必殺技）。自傷なら null */
  label: string | null
  /** 決定打の合計ダメージ（内部値） */
  amount: number
  selfInflicted: boolean
}

/**
 * 決定128：敗北理由の導出（表示専用）。ログの末尾から「GAME_ENDED(lost) 直前に自分が受けた
 * ダメージ」を集め、同バッチの ENEMY_ACTED があればその技名を、無ければ自傷として返す。
 * ラウンドは ROUND_STARTED の最新値。engine・状態には関与しない。
 */
export function deriveDefeatCause(log: GameEvent[], fallbackRound = 1): DefeatCause | null {
  const endIndex = findLastIndex(log, (e) => e.t === 'GAME_ENDED')
  if (endIndex < 0) return null
  const end = log[endIndex]
  if (end.t !== 'GAME_ENDED' || end.status !== 'lost') return null
  // 「続きから」再開後はログが再開時点からしか無く ROUND_STARTED を含まないことがあるため、
  // 呼び出し側から現在のラウンドをフォールバックとして受け取る
  let round = fallbackRound
  let amount = 0
  let acted: Extract<GameEvent, { t: 'ENEMY_ACTED' }> | null = null
  // 直前の ROUND_STARTED / ENEMY_ACTED を探しつつ、その後の自分への被弾を合計する
  let actedIndex = -1
  for (let i = endIndex - 1; i >= 0; i--) {
    const e = log[i]
    if (e.t === 'ENEMY_ACTED' && e.kind !== 'charge') {
      acted = e
      actedIndex = i
      break
    }
    if (e.t === 'CARD_PLAYED' || e.t === 'ROUND_STARTED') break
  }
  const from = actedIndex >= 0 ? actedIndex : Math.max(0, findLastIndex(log.slice(0, endIndex), (e) => e.t === 'CARD_PLAYED'))
  for (let i = from; i < endIndex; i++) {
    const e = log[i]
    if (e.t === 'DAMAGE_DEALT' && e.target === 'self') amount += e.amount
  }
  for (let i = endIndex; i >= 0; i--) {
    const e = log[i]
    if (e.t === 'ROUND_STARTED') {
      round = e.round
      break
    }
  }
  if (acted) {
    const label = acted.label ?? (acted.kind === 'multiAttack' ? '連撃' : acted.kind === 'special' ? '必殺技' : '攻撃')
    return { round, label, amount, selfInflicted: false }
  }
  return { round, label: null, amount, selfInflicted: true }
}

export function describeDefeatCause(cause: DefeatCause | null, enemyName: string): string | null {
  if (!cause) return null
  if (cause.selfInflicted) return `R${cause.round}：自分のカード効果（自傷）で ${formatScaled(cause.amount)} ダメージ`
  return `R${cause.round}：${enemyName}の「${cause.label}」で ${formatScaled(cause.amount)} ダメージ`
}

function findLastIndex<T>(arr: T[], pred: (v: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i
  return -1
}
