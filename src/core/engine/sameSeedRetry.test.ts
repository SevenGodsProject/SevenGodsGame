import { describe, expect, it } from 'vitest'
import type { EnemyActionDef, EnemyId, GameState, GodId } from '../types'
import { GOD_IDS } from '../data/gods'
import { ENEMY_IDS } from '../data/enemies'
import { getRecommendedDeck } from '../data/deckBuilder'
import { applyAction } from './reducer'

/**
 * 決定196（Solve Loop v1）Retry Determinism Audit。
 *
 * 「同じ seed を渡すだけで、本当に同じ問題になるのか？」を engine 側で機械的に固定する。
 *
 * ここで確かめるのは **3 つ**：
 *   1. 同じ seed・同じ構成なら、開始直後の GameState が完全に一致する
 *      （＝初期手札・山札の並び・神力・HP・OTOMO 形態・神託残り・敵HPまで同じ問題）
 *   2. seed が違うと初期手札・山札の並びが変わる
 *      （＝現行の「新しい seed で再戦」は、敗因を検証する前に問題そのものを差し替えている）
 *   3. 敵の予告列（Enemy Intent）は seed に依存しない
 *      （＝seed が変えているのは「引き」だけ。だから同じ seed で引きを固定すると
 *        「さっきの判断を変えたら勝てるか？」が初めて検証可能になる）
 *
 * 不変ルール2（Math.random 禁止）と `createRng(seed, rngCursor)` のカーソル方式が
 * 前提。カード効果・神・OTOMO の乱数もすべてこの 1 本のストリームを共有するため、
 * 同じ seed・同じ打ち方なら同じ結果、打ち方を変えればそこから分岐する。
 */

type Run = {
  initial: GameState
  hand: string[]
  deckOrder: string[]
  intents: string[]
}

function describeIntent(intent: EnemyActionDef | null): string {
  if (!intent) return 'none'
  if (intent.kind === 'charge') return `charge:${intent.label}`
  if (intent.kind === 'multiAttack') return `multi:${intent.hits.join('-')}`
  if (intent.kind === 'special') return `special:${intent.name}:${intent.amount}`
  return `attack:${intent.amount}`
}

/** END_ROUND だけを繰り返し、各ラウンド開始時の予告を記録する（カードは打たない） */
function runBattle(seed: string, godId: GodId, enemyId: EnemyId): Run {
  const started = applyAction(null, {
    type: 'START_GAME',
    seed,
    godId,
    enemyId,
    deck: getRecommendedDeck(godId),
    difficulty: 'normal',
  })
  const initial = started.state
  const intents = [describeIntent(initial.enemy.intent)]

  let state = initial
  for (let i = 0; i < 7 && state.status === 'playing'; i++) {
    state = applyAction(state, { type: 'END_ROUND' }).state
    if (state.status === 'playing') intents.push(describeIntent(state.enemy.intent))
  }

  return {
    initial,
    hand: initial.hand.map((c) => `${c.uid}:${c.defId}`),
    deckOrder: initial.deck.map((c) => c.uid),
    intents,
  }
}

const GODS = Object.values(GOD_IDS)
const ENEMIES = Object.values(ENEMY_IDS)

describe('Retry Determinism Audit（決定196）', () => {
  it('同じ seed・同じ構成なら、開始直後の GameState が完全に一致する', () => {
    const a = runBattle('solve-loop-audit-1', GOD_IDS.ebisu, ENEMY_IDS.trial)
    const b = runBattle('solve-loop-audit-1', GOD_IDS.ebisu, ENEMY_IDS.trial)

    expect(b.initial).toEqual(a.initial)
    expect(b.hand).toEqual(a.hand)
    expect(b.deckOrder).toEqual(a.deckOrder)
    expect(b.intents).toEqual(a.intents)
  })

  it('7神 × 7敵 のすべてで、同じ seed なら同じ初期手札・同じ山札の並びになる', () => {
    for (const godId of GODS) {
      for (const enemyId of ENEMIES) {
        const seed = `solve-loop-${godId}-${enemyId}`
        const a = runBattle(seed, godId, enemyId)
        const b = runBattle(seed, godId, enemyId)
        expect(b.hand, `${godId} × ${enemyId} の初期手札`).toEqual(a.hand)
        expect(b.deckOrder, `${godId} × ${enemyId} の山札`).toEqual(a.deckOrder)
        expect(b.intents, `${godId} × ${enemyId} の予告列`).toEqual(a.intents)
      }
    }
  })

  it('seed が違うと初期手札・山札の並びが変わる（＝現行の新seed再戦は問題を差し替えている）', () => {
    const a = runBattle('solve-loop-audit-A', GOD_IDS.ebisu, ENEMY_IDS.trial)
    const b = runBattle('solve-loop-audit-B', GOD_IDS.ebisu, ENEMY_IDS.trial)

    expect(b.deckOrder).not.toEqual(a.deckOrder)
    expect(b.hand).not.toEqual(a.hand)
  })

  it('敵の予告列は seed に依存しない（seed が変えているのは引きだけ）', () => {
    for (const enemyId of ENEMIES) {
      const a = runBattle('intent-seed-A', GOD_IDS.ebisu, enemyId)
      const b = runBattle('intent-seed-B', GOD_IDS.ebisu, enemyId)
      // 予告そのものは actions[round-1] × 倍率で決まるため、seed を変えても同じ。
      // ただし引きが変わると決着ラウンドが変わりうるので、共通する長さぶんを比べる
      const n = Math.min(a.intents.length, b.intents.length)
      expect(b.intents.slice(0, n), `${enemyId} の予告列`).toEqual(a.intents.slice(0, n))
    }
  })
})
