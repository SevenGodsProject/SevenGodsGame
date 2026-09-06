import type { BonusCond, CardDef, GameState } from '../types'
import { RULES } from '../data/rules'
import { resolveStakeRules } from '../data/stakes'
import { enemyActionTotal } from './round'

/**
 * Phase 3「神格」FINAL SPEC v0.1：カードの条件付き追加効果（`CardDef.bonus`）の条件評価。
 *
 * ★不変ルール3：カード名で分岐しない。カード側は「どの条件か」をデータで持ち、
 * その意味づけ（何をもって成立とするか）だけをこの1関数に集約する。
 * 新しい条件を足すときも、増えるのはこのswitchの1ケースだけで済む。
 */

/** 敵の予告ダメージ合計（難易度・Daily・神階の倍率適用後。`charge`＝溜めは0） */
export function incomingDamage(state: GameState): number {
  const intent = state.enemy.intent
  return intent ? enemyActionTotal(intent) : 0
}

/**
 * 条件が成立しているか。
 *
 * @param before カードを使う「前」の盤面（予告・HPはこちらを見る）
 * @param after  カード本体の効果を適用した「後」の盤面（ブロックはこちらを見る）
 */
export function evaluateBonusCond(
  when: BonusCond,
  before: GameState,
  after: GameState,
): boolean {
  switch (when) {
    case 'blocked': {
      // 「予告以上に固めた」ときだけ成立。溜め（予告0）では成立しない＝
      // 溜めラウンドに防御カードを撃つだけで無条件に得をする、という抜け道を作らない。
      const incoming = incomingDamage(before)
      return incoming > 0 && after.player.block >= incoming
    }
    case 'enemyBig':
      // 大技（必殺・連撃合計・終盤の重い一撃）の直前かどうか。使う前の予告で判定する。
      return incomingDamage(before) >= RULES.cardBonus.enemyBigThreshold
    case 'lowHp':
      return (
        before.player.hp <=
        Math.floor(before.player.maxHp * RULES.cardBonus.lowHpRatio)
      )
  }
}

/**
 * 表示専用：「今このカードを使えば追加効果が出るか」の先読み（手札の強調に使う）。
 *
 * `blocked`だけは本体効果の適用後を見る条件なので、そのカードが得るブロック量
 * （神階Ⅳ以降の効率も`effects.ts`と同じ式で反映）を足した値で判定する。
 * 他の条件は使用前の盤面だけで決まるため、そのまま`evaluateBonusCond`を使う。
 */
export function previewBonusTrigger(state: GameState, def: CardDef): boolean {
  if (!def.bonus) return false
  if (def.bonus.when !== 'blocked') {
    return evaluateBonusCond(def.bonus.when, state, state)
  }
  const incoming = incomingDamage(state)
  if (incoming <= 0) return false
  const efficiency = resolveStakeRules(state.stake, state.stakeChoice).blockEfficiency
  const gained = def.effects.reduce(
    (sum, e) => (e.kind === 'block' ? sum + Math.round(e.amount * efficiency) : sum),
    0,
  )
  return state.player.block + gained >= incoming
}
