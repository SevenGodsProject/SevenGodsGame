import { describe, expect, it } from 'vitest'
import { RULES } from '../data/rules'
import { DIVINATION_CHOICES } from '../data/divination'
import type { Effect, EnemyActionDef, GameState } from '../types'
import { applyAction } from './reducer'
import { applyDivination } from './applyDivination'
import { intentGuardRaw, previewIntentGuard } from './effects'
import { enemyActionTotal } from './intent'
import { startTestGame } from './testUtils'

/**
 * Phase 5-D：神託「加護」の予告連動ブロック（`blockOfIntent`）。
 *
 * 守っていること：
 *   1. 量＝max(最低保証, floor(予告合計 × 割合))。割合・最低保証は RULES から来る
 *   2. 「予告」は UI の予告表示と同じ値（`enemyActionTotal`）。連撃は合計、溜めは0
 *   3. 溜め（予告0）では最低保証だけ。ブロックはラウンドをまたいで残らない
 *   4. 神階Ⅳ以降は通常のブロックと同じくブロック効率がかかる（例外を作らない）
 *   5. ボタンに出す「今ならブロックいくつ」（preview）と、実際に得る量が常に一致する
 *   6. 旧加護のHP回復は無い（役割を「予告への防御」に絞った）
 */

const GUARD = 0 // DIVINATION_CHOICES の並び：加護・導き・天啓
const guardEffects = DIVINATION_CHOICES[GUARD].effects

function withIntent(state: GameState, intent: EnemyActionDef): GameState {
  return { ...state, enemy: { ...state.enemy, intent } }
}

function useGuard(state: GameState) {
  return applyDivination(state, { type: 'USE_DIVINATION', choiceIndex: GUARD })
}

describe('加護の中身（データ）', () => {
  it('加護は blockOfIntent だけを持ち、割合と最低保証は RULES.divination から来る', () => {
    expect(guardEffects).toEqual([
      { kind: 'blockOfIntent', ratio: RULES.divination.guardRatio, min: RULES.divination.guardMin },
    ])
    expect(guardEffects.some((e: Effect) => e.kind === 'heal')).toBe(false)
  })

  it('導き・天啓は変わっていない', () => {
    expect(DIVINATION_CHOICES[1].effects).toEqual([
      { kind: 'draw', amount: 1 },
      { kind: 'gainAp', amount: 1 },
    ])
    expect(DIVINATION_CHOICES[2].effects).toEqual([{ kind: 'damage', target: 'enemy', amount: 4 }])
  })
})

describe('量の決まり方', () => {
  it('単発の攻撃：予告 × 割合（切り捨て）', () => {
    const state = withIntent(startTestGame(), { kind: 'attack', amount: 15 })
    const { state: after } = useGuard(state)
    expect(after.player.block).toBe(Math.floor(15 * RULES.divination.guardRatio))
  })

  it('予告が小さいときは最低保証まで引き上げる', () => {
    const state = withIntent(startTestGame(), { kind: 'attack', amount: 3 })
    const { state: after } = useGuard(state)
    expect(after.player.block).toBe(RULES.divination.guardMin)
  })

  it('溜め（予告0）では最低保証だけ', () => {
    const state = withIntent(startTestGame(), { kind: 'charge', label: '力を溜めている' })
    expect(enemyActionTotal(state.enemy.intent!)).toBe(0)
    const { state: after } = useGuard(state)
    expect(after.player.block).toBe(RULES.divination.guardMin)
  })

  it('連撃は各hitの合計を予告として使う（UIの予告合計と同じ）', () => {
    const intent: EnemyActionDef = { kind: 'multiAttack', hits: [4, 4, 4], name: '双牙乱撃' }
    const state = withIntent(startTestGame(), intent)
    const { state: after } = useGuard(state)
    expect(after.player.block).toBe(Math.floor(12 * RULES.divination.guardRatio))
  })

  it('必殺（special）も予告量どおり', () => {
    const intent: EnemyActionDef = { kind: 'special', amount: 29, name: '主砲・神滅甲' }
    const state = withIntent(startTestGame(), intent)
    const { state: after } = useGuard(state)
    expect(after.player.block).toBe(Math.floor(29 * RULES.divination.guardRatio))
  })

  it('予告は敵へのデバフを引く前の値（UIの予告表示と同じ）を使う', () => {
    const base = withIntent(startTestGame(), { kind: 'attack', amount: 20 })
    const debuffed: GameState = {
      ...base,
      enemy: { ...base.enemy, buffs: [{ stat: 'atk', amount: -5, remainingRounds: 2 }] },
    }
    expect(intentGuardRaw(debuffed, RULES.divination.guardRatio, RULES.divination.guardMin)).toBe(
      intentGuardRaw(base, RULES.divination.guardRatio, RULES.divination.guardMin),
    )
  })

  it('既にあるブロックに足される（上書きしない）', () => {
    const base = withIntent(startTestGame(), { kind: 'attack', amount: 20 })
    const state: GameState = { ...base, player: { ...base.player, block: 5 } }
    const { state: after } = useGuard(state)
    expect(after.player.block).toBe(5 + Math.floor(20 * RULES.divination.guardRatio))
  })

  it('HPは回復しない', () => {
    const base = withIntent(startTestGame(), { kind: 'attack', amount: 20 })
    const state: GameState = { ...base, player: { ...base.player, hp: 10 } }
    const { state: after } = useGuard(state)
    expect(after.player.hp).toBe(10)
  })
})

describe('溜めラウンドに貯め込めない', () => {
  it('加護のブロックは次のラウンド開始で0に戻る', () => {
    const base = withIntent(startTestGame(), { kind: 'charge', label: '力を溜めている' })
    const guarded = useGuard(base).state
    expect(guarded.player.block).toBe(RULES.divination.guardMin)
    const next = applyAction(guarded, { type: 'END_ROUND' }).state
    expect(next.player.block).toBe(0)
  })
})

describe('神階のブロック効率', () => {
  it('神階Ⅳ以降は通常のブロックと同じく効率がかかる', () => {
    const base = startTestGame()
    const stake4: GameState = { ...withIntent(base, { kind: 'attack', amount: 20 }), stake: 4 }
    const raw = Math.floor(20 * RULES.divination.guardRatio)
    const { state: after } = useGuard(stake4)
    expect(after.player.block).toBe(Math.round(raw * RULES.stakes.blockEfficiency))
    // 神階Ⅲ以下は効率がかからない
    const stake3: GameState = { ...withIntent(base, { kind: 'attack', amount: 20 }), stake: 3 }
    expect(useGuard(stake3).state.player.block).toBe(raw)
  })
})

describe('ボタンに出す量（preview）と実際の量が一致する', () => {
  const intents: EnemyActionDef[] = [
    { kind: 'attack', amount: 3 },
    { kind: 'attack', amount: 15 },
    { kind: 'attack', amount: 27 },
    { kind: 'multiAttack', hits: [4, 4, 4] },
    { kind: 'special', amount: 29, name: '主砲' },
    { kind: 'charge', label: '溜め' },
  ]
  for (const stake of [0, 3, 4, 7]) {
    for (const intent of intents) {
      it(`神階${stake} / ${intent.kind}${'amount' in intent ? intent.amount : ''}：preview＝実際`, () => {
        const state: GameState = { ...withIntent(startTestGame(), intent), stake }
        const predicted = previewIntentGuard(state, guardEffects)
        const { state: after } = useGuard(state)
        expect(predicted).toBe(after.player.block - state.player.block)
      })
    }
  }

  it('加護以外の選択肢は preview を持たない（null）', () => {
    const state = withIntent(startTestGame(), { kind: 'attack', amount: 15 })
    expect(previewIntentGuard(state, DIVINATION_CHOICES[1].effects)).toBeNull()
    expect(previewIntentGuard(state, DIVINATION_CHOICES[2].effects)).toBeNull()
  })
})

describe('決定論', () => {
  it('同じ盤面で加護を使うと、状態もrngCursorも完全に一致する', () => {
    const build = () => withIntent(startTestGame('guard-determinism'), { kind: 'attack', amount: 18 })
    const a = useGuard(build())
    const b = useGuard(build())
    expect(a.state).toEqual(b.state)
    expect(a.events).toEqual(b.events)
  })
})
