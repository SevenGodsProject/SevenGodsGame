import { describe, expect, it } from 'vitest'
import { DIVINATION_CHOICES } from '../../core/data/divination'
import { BURST_EVOLVE_MS, ENEMY_CUTIN_TOTAL_MS, MULTI_CUTIN_LEAD_MS, SPECIAL_IMPACT_MS } from './enemyVfxTiming'
import {
  FOCUS_HOLD_BURST_MS,
  FOCUS_HOLD_CARD_MS,
  FOCUS_HOLD_ENEMY_SPECIAL_MS,
  FOCUS_HOLD_ENEMY_TURN_MS,
  dealsEnemyDamage,
  focusHoldMultiHitMs,
} from './useMobileAutoFocus'

/**
 * 決定125：Mobile Battle Auto Focus の純粋部分（対象判定・保持時間）の回帰保証。
 * スクロール自体はブラウザQA（375px focused QA）で実測する。
 */
describe('dealsEnemyDamage (決定125)', () => {
  it('targets only effects that damage the enemy', () => {
    expect(dealsEnemyDamage([{ kind: 'damage', target: 'enemy', amount: 6 }])).toBe(true)
    expect(dealsEnemyDamage([{ kind: 'heal', amount: 5 }])).toBe(false)
    expect(dealsEnemyDamage([{ kind: 'block', amount: 5 }])).toBe(false)
    expect(dealsEnemyDamage([{ kind: 'damage', target: 'self', amount: 3 }])).toBe(false)
    expect(dealsEnemyDamage([{ kind: 'resonance', amount: 1 }, { kind: 'draw', amount: 1 }])).toBe(false)
    expect(dealsEnemyDamage([])).toBe(false)
  })

  it('classifies the divination choices from their data (only the damaging one focuses)', () => {
    const focusing = DIVINATION_CHOICES.filter((c) => dealsEnemyDamage(c.effects))
    expect(focusing.length).toBe(1)
    expect(focusing[0].effects.some((e) => e.kind === 'damage' && e.target === 'enemy')).toBe(true)
  })
})

describe('focus hold durations (決定125)', () => {
  it('keeps the enemy in view long enough for each presentation', () => {
    // カード：280ms cast + lunge 450 + 数字 900 を下回らない
    expect(FOCUS_HOLD_CARD_MS).toBeGreaterThanOrEqual(280 + 450 + 800)
    // 敵ターン：700msバナー + 通常攻撃演出
    expect(FOCUS_HOLD_ENEMY_TURN_MS).toBeGreaterThanOrEqual(700 + 900)
    // BURST：OTOMO進化バナーの表示終了まで
    expect(FOCUS_HOLD_BURST_MS).toBeGreaterThan(BURST_EVOLVE_MS)
    // 敵必殺：カットイン + 着弾 より長い
    expect(FOCUS_HOLD_ENEMY_SPECIAL_MS).toBeGreaterThan(ENEMY_CUTIN_TOTAL_MS + SPECIAL_IMPACT_MS)
    // 連撃：カットイン先行 + 最終HIT(500ms) より長く、HIT数で単調増加
    expect(focusHoldMultiHitMs(3)).toBeGreaterThan(MULTI_CUTIN_LEAD_MS + 500)
    expect(focusHoldMultiHitMs(4)).toBeGreaterThan(focusHoldMultiHitMs(3))
  })
})
