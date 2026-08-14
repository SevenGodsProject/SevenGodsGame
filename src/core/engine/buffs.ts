import type { Buff, StatKey } from '../types'

/** 指定した能力値に対する、現在有効なバフ/デバフの合計値 */
export function sumBuff(buffs: Buff[], stat: StatKey): number {
  return buffs
    .filter((b) => b.stat === stat)
    .reduce((total, b) => total + b.amount, 0)
}

/** 残りラウンドを1減らし、切れたものを取り除いた新しい配列を返す */
export function tickBuffs(buffs: Buff[]): Buff[] {
  return buffs
    .map((b) => ({ ...b, remainingRounds: b.remainingRounds - 1 }))
    .filter((b) => b.remainingRounds > 0)
}
