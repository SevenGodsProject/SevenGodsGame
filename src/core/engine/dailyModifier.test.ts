import { describe, expect, it } from 'vitest'
import { applyAction } from './reducer'
import { GOD_IDS } from '../data/gods'
import { ENEMIES, ENEMY_IDS } from '../data/enemies'
import { STARTER_DECK } from '../data/decks'
import { RULES } from '../data/rules'
import type { GameAction } from '../types'

type Start = Extract<GameAction, { type: 'START_GAME' }>

const base: Start = {
  type: 'START_GAME',
  seed: 'daily-mod-test',
  godId: GOD_IDS.ebisu,
  enemyId: ENEMY_IDS.trial,
  deck: STARTER_DECK,
}

const intentAmount = (state: ReturnType<typeof applyAction>['state']) => {
  const it = state.enemy.intent
  if (!it) return 0
  if (it.kind === 'attack' || it.kind === 'special') return it.amount
  if (it.kind === 'multiAttack') return it.hits.reduce((a, b) => a + b, 0)
  return 0
}

describe('DAILY-01：Daily modifier（神域強化）', () => {
  it('modifier未指定・mode未指定の通常対局は従来と完全に同じ（回帰ガード）', () => {
    const plain = applyAction(null, base).state
    const explicitNormal = applyAction(null, { ...base, mode: 'normal' }).state
    const trial = ENEMIES.find((e) => e.id === ENEMY_IDS.trial)!
    expect(plain.mode).toBe('normal')
    expect(plain.modifier).toBeUndefined()
    expect(plain.dailyKey).toBeUndefined()
    expect(plain.enemy.maxHp).toBe(trial.maxHp)
    expect(explicitNormal.enemy.maxHp).toBe(trial.maxHp)
    expect(intentAmount(explicitNormal)).toBe(intentAmount(plain))
    // 恒等倍率を明示しても同じ
    const identity = applyAction(null, { ...base, modifier: { enemyHpMul: 1, enemyAtkMul: 1 } }).state
    expect(identity.enemy.maxHp).toBe(plain.enemy.maxHp)
    expect(intentAmount(identity)).toBe(intentAmount(plain))
  })

  it('敵HPは難易度倍率×modifierで1回だけ丸められる', () => {
    const trial = ENEMIES.find((e) => e.id === ENEMY_IDS.trial)!
    const { enemyHpMul } = RULES.daily.modifier
    const daily = applyAction(null, { ...base, mode: 'daily', dailyKey: '2026-08-30', modifier: RULES.daily.modifier }).state
    expect(daily.enemy.maxHp).toBe(Math.round(trial.maxHp * 1 * enemyHpMul))
    expect(daily.enemy.hp).toBe(daily.enemy.maxHp)
    // hard×modifierも乗算（HPは難易度倍率にさらに乗る）
    const hardDaily = applyAction(null, { ...base, difficulty: 'hard', modifier: RULES.daily.modifier }).state
    expect(hardDaily.enemy.maxHp).toBe(Math.round(trial.maxHp * RULES.difficulty.hard.enemyHpMultiplier * enemyHpMul))
  })

  it('敵の攻撃予告はmodifierの攻撃倍率で強化され、保存/再開後（stateから再導出）も同じ値', () => {
    const plain = applyAction(null, base).state
    const daily = applyAction(null, { ...base, mode: 'daily', dailyKey: '2026-08-30', modifier: RULES.daily.modifier }).state
    const plainAmount = intentAmount(plain)
    expect(plainAmount).toBeGreaterThan(0)
    expect(intentAmount(daily)).toBe(Math.round(plainAmount * RULES.daily.modifier.enemyAtkMul))
    // 2ラウンド目の予告も倍率が効く（毎ラウンドstate.modifierから再計算）
    const r2 = applyAction(daily, { type: 'END_ROUND' }).state
    const r2plain = applyAction(plain, { type: 'END_ROUND' }).state
    if (r2.status === 'playing' && r2plain.status === 'playing') {
      expect(intentAmount(r2)).toBe(Math.round(intentAmount(r2plain) * RULES.daily.modifier.enemyAtkMul))
    }
    // JSON往復（セーブ相当）後も同じ
    const restored = JSON.parse(JSON.stringify(daily))
    expect(restored.modifier).toEqual(RULES.daily.modifier)
    expect(restored.mode).toBe('daily')
    expect(restored.dailyKey).toBe('2026-08-30')
  })

  it('Dailyはプレイヤー側を弱体化しない（難易度normal基準のHP）', () => {
    const plain = applyAction(null, base).state
    const daily = applyAction(null, { ...base, mode: 'daily', dailyKey: '2026-08-30', modifier: RULES.daily.modifier }).state
    expect(daily.player.maxHp).toBe(plain.player.maxHp)
    expect(daily.difficulty).toBe('normal')
  })

  it('スコア計算にmodifierは一切影響しない（同じ操作なら同じ加点。difficultyBonusはnormal=0）', () => {
    const daily = applyAction(null, { ...base, mode: 'daily', dailyKey: '2026-08-30', modifier: RULES.daily.modifier }).state
    expect(daily.score.difficultyBonus).toBe(0)
    expect(daily.score.total).toBe(0)
  })

  it('同じseedなら通常/Dailyどちらも同じ初期手札（共有seedの根拠。補正はHP/攻撃だけ）', () => {
    const plain = applyAction(null, base).state
    const daily = applyAction(null, { ...base, mode: 'daily', dailyKey: '2026-08-30', modifier: RULES.daily.modifier }).state
    expect(daily.hand.map((c) => c.defId)).toEqual(plain.hand.map((c) => c.defId))
    expect(daily.deck.map((c) => c.defId)).toEqual(plain.deck.map((c) => c.defId))
  })
})
