import { describe, expect, it } from 'vitest'
import { createRng } from '../rng/seededRandom'
import type { GameState } from '../types'
import { applyEffect, applyEffects, applyDamage } from './effects'
import { startTestGame } from './testUtils'

const rng = () => createRng('effect-test')

describe('applyDamage', () => {
  it('reduces enemy hp and adds effective-damage score (BASE-D: ×perDamage)', () => {
    const state = startTestGame()
    const { state: next } = applyDamage(state, 'enemy', 5)

    expect(next.enemy.hp).toBe(state.enemy.maxHp - 5)
    // BASE-D（決定109）：実効ダメージ5 × perDamage(1.2) = 6
    expect(next.score.damage).toBeCloseTo(5 * 1.2)
    expect(next.score.total).toBeCloseTo(5 * 1.2)
  })

  it('BASE-D: overkill（敵の残りHPを超えた分）はスコアに加算されない', () => {
    const state = startTestGame()
    const lowHp = { ...state, enemy: { ...state.enemy, hp: 5 } }
    const { state: next } = applyDamage(lowHp, 'enemy', 20)

    expect(next.enemy.hp).toBe(0)
    expect(next.status).toBe('won')
    // 実効ダメージは5のみ。overkill 15は無得点
    expect(next.score.damage).toBeCloseTo(5 * 1.2)
  })

  it('BASE-D: Mastery集計は実効ダメージのみを1ラウンド最大として追跡する（スコアとは分離）', () => {
    const state = startTestGame()
    const lowHp = { ...state, enemy: { ...state.enemy, hp: 10 } }
    const { state: next } = applyDamage(lowHp, 'enemy', 30)

    // overkill除外：実効10のみがMasteryに載る
    expect(next.mastery.roundDamage).toBe(10)
    expect(next.mastery.bestRoundDamage).toBe(10)
  })

  it('BASE-D: 同一ラウンドの複数回ダメージはMasteryのroundDamageに合算される', () => {
    const state = startTestGame()
    const first = applyDamage(state, 'enemy', 8).state
    const second = applyDamage(first, 'enemy', 7).state

    expect(second.mastery.roundDamage).toBe(15)
    expect(second.mastery.bestRoundDamage).toBe(15)
  })

  it('is absorbed by block first', () => {
    const state = { ...startTestGame(), enemy: { ...startTestGame().enemy, block: 3 } }
    const { state: next, events } = applyDamage(state, 'enemy', 5)

    expect(next.enemy.hp).toBe(state.enemy.maxHp - 2)
    expect(next.enemy.block).toBe(0)
    expect(events[0]).toMatchObject({ t: 'DAMAGE_DEALT', amount: 2, blocked: 3 })
  })

  it('wins the game and grants BASE-D victory bonuses when enemy hp reaches 0', () => {
    const state = startTestGame()
    const { state: next, events } = applyDamage(state, 'enemy', state.enemy.hp)

    expect(next.status).toBe('won')
    // BASE-D（決定109）：勝利時のみ victory(300) + tempo(R1撃破はR3以前の290で頭打ち)
    // + survival(HP満タン=30) + difficultyBonus(normal=0)
    expect(next.score.victory).toBe(300)
    expect(next.score.tempo).toBe(290)
    expect(next.score.survival).toBe(30)
    expect(next.score.difficultyBonus).toBe(0)
    expect(events.some((e) => e.t === 'DAMAGE_DEALT')).toBe(true)
  })

  it('loses the game when player hp reaches 0', () => {
    const state = startTestGame()
    const { state: next } = applyDamage(state, 'self', state.player.hp)

    expect(next.status).toBe('lost')
    expect(next.player.hp).toBe(0)
  })
})

describe('applyEffect', () => {
  it('block increases player block', () => {
    const state = startTestGame()
    const { state: next } = applyEffect(state, { kind: 'block', amount: 5 }, rng())
    expect(next.player.block).toBe(5)
  })

  it('heal is capped at maxHp', () => {
    const state = startTestGame()
    const damaged = { ...state, player: { ...state.player, hp: state.player.maxHp - 2 } }
    const { state: next, events } = applyEffect(damaged, { kind: 'heal', amount: 999 }, rng())

    expect(next.player.hp).toBe(state.player.maxHp)
    expect(events[0]).toMatchObject({ t: 'HEALED', amount: 2 })
  })

  it('accumulates resonance without bursting below the max', () => {
    const state = startTestGame()
    const { state: next, events } = applyEffect(state, { kind: 'resonance', amount: 2 }, rng())

    expect(next.resonance.value).toBe(2)
    expect(events.some((e) => e.t === 'RESONANCE_BURST')).toBe(false)
  })

  it('bursts and resets to 0 once the gauge is filled (決定8・10)', () => {
    const state = { ...startTestGame(), resonance: { value: 6, max: 7 } }
    const { state: next, events } = applyEffect(state, { kind: 'resonance', amount: 2 }, rng())

    expect(next.resonance.value).toBe(0)
    expect(events.some((e) => e.t === 'RESONANCE_BURST')).toBe(true)
    // 恵比寿の発動効果：敵に25ダメージ＋score200（決定23）。
    // BASE-D（決定109）：score直接効果は加算されず、ダメージ分（25×1.2）のみ得点になる
    expect(next.enemy.hp).toBe(state.enemy.maxHp - 25)
    expect(next.score.damage).toBeCloseTo(25 * 1.2)
    expect(next.score.total).toBeCloseTo(25 * 1.2)
  })

  it('evolves the OTOMO spirit → incarnate on the first burst (決定19)', () => {
    const state = { ...startTestGame(), resonance: { value: 6, max: 7 } }
    expect(state.otomo.form).toBe('spirit')

    const { state: next, events } = applyEffect(state, { kind: 'resonance', amount: 2 }, rng())

    expect(next.otomo.form).toBe('incarnate')
    expect(events).toContainEqual({ t: 'OTOMO_EVOLVED', form: 'incarnate' })
  })

  it('evolves incarnate → doji on the second burst, then stops growing', () => {
    let state: GameState = {
      ...startTestGame(),
      resonance: { value: 6, max: 7 },
      otomo: { ...startTestGame().otomo, form: 'incarnate' },
    }
    let result = applyEffect(state, { kind: 'resonance', amount: 2 }, rng())
    expect(result.state.otomo.form).toBe('doji')
    expect(result.events).toContainEqual({ t: 'OTOMO_EVOLVED', form: 'doji' })

    // 童子（最終形態）で発動しても、それ以上は変化しない
    state = { ...result.state, resonance: { value: 6, max: 7 } }
    result = applyEffect(state, { kind: 'resonance', amount: 2 }, rng())
    expect(result.state.otomo.form).toBe('doji')
    expect(result.events.some((e) => e.t === 'OTOMO_EVOLVED')).toBe(false)
  })

  it('applies the OTOMO effect for its (post-evolution) form on burst (決定19)', () => {
    const damaged: GameState = {
      ...startTestGame(),
      resonance: { value: 6, max: 7 },
      player: { ...startTestGame().player, hp: 10 },
    }
    // spirit → incarnate に成長。incarnate の効果はHP+5
    const { state: afterFirstBurst } = applyEffect(
      damaged,
      { kind: 'resonance', amount: 2 },
      rng(),
    )
    expect(afterFirstBurst.otomo.form).toBe('incarnate')
    expect(afterFirstBurst.player.hp).toBe(15)

    // incarnate → doji に成長。doji の効果はHP+5・ブロック+8
    const second: GameState = {
      ...afterFirstBurst,
      resonance: { value: 6, max: 7 },
    }
    const { state: afterSecondBurst } = applyEffect(
      second,
      { kind: 'resonance', amount: 2 },
      rng(),
    )
    expect(afterSecondBurst.otomo.form).toBe('doji')
    expect(afterSecondBurst.player.hp).toBe(20)
    expect(afterSecondBurst.player.block).toBe(8)
  })

  it('applies the power-path OTOMO effect instead when otomoGrowthPath is power (決定44)', () => {
    const state: GameState = {
      ...startTestGame(),
      resonance: { value: 6, max: 7 },
      otomoGrowthPath: 'power',
      player: { ...startTestGame().player, hp: 10 },
      ap: { current: 0, max: 0 },
    }
    const handBefore = state.hand.length
    const deckBefore = state.deck.length

    // 力の絆の鯛丸：incarnateはdraw1。守りの絆（heal5）とは違い、HPは変わらずカードを1枚引く
    const { state: next } = applyEffect(state, { kind: 'resonance', amount: 2 }, rng())

    expect(next.otomo.form).toBe('incarnate')
    expect(next.player.hp).toBe(10)
    expect(next.hand.length).toBe(handBefore + 1)
    expect(next.deck.length).toBe(deckBefore - 1)
  })

  it('debuff stores a negative buff on the target', () => {
    const state = startTestGame()
    const { state: next } = applyEffect(
      state,
      { kind: 'debuff', target: 'enemy', stat: 'atk', amount: 5, rounds: 3 },
      rng(),
    )
    expect(next.enemy.buffs).toEqual([{ stat: 'atk', amount: -5, remainingRounds: 3 }])
  })

  it('a self atk buff increases subsequent damage dealt to the enemy (決定25「姉御の号令」が消費されていなかったバグの修正)', () => {
    const buffed: GameState = {
      ...startTestGame(),
      player: { ...startTestGame().player, buffs: [{ stat: 'atk', amount: 3, remainingRounds: 2 }] },
    }
    const { state: next } = applyEffect(buffed, { kind: 'damage', target: 'enemy', amount: 5 }, rng())
    expect(next.enemy.hp).toBe(buffed.enemy.maxHp - 8)
  })

  it('a self atk buff does not affect self-inflicted damage (捨身の一撃などの自傷)', () => {
    const buffed: GameState = {
      ...startTestGame(),
      player: { ...startTestGame().player, buffs: [{ stat: 'atk', amount: 3, remainingRounds: 2 }] },
    }
    const { state: next } = applyEffect(buffed, { kind: 'damage', target: 'self', amount: 3 }, rng())
    expect(next.player.hp).toBe(buffed.player.hp - 3)
  })

  it('an atk buff never pushes damage below 0 even if a future self-debuff outweighs it', () => {
    const debuffedSelf: GameState = {
      ...startTestGame(),
      player: { ...startTestGame().player, buffs: [{ stat: 'atk', amount: -99, remainingRounds: 1 }] },
    }
    const { state: next } = applyEffect(debuffedSelf, { kind: 'damage', target: 'enemy', amount: 5 }, rng())
    expect(next.enemy.hp).toBe(debuffedSelf.enemy.maxHp)
  })

  it('BASE-D: score effect no longer adds to Battle Score (oracle/BURST score除外)', () => {
    const state = startTestGame()
    const { state: next, events } = applyEffect(state, { kind: 'score', amount: 100 }, rng())
    expect(next.score.total).toBe(0)
    expect(events.some((e) => e.t === 'SCORE_GAINED')).toBe(false)
  })
})

describe('applyEffects', () => {
  it('applies a list of effects in order', () => {
    const state = startTestGame()
    const { state: next } = applyEffects(
      state,
      [
        { kind: 'damage', target: 'enemy', amount: 25 },
        { kind: 'score', amount: 100 },
      ],
      rng(),
    )
    expect(next.enemy.hp).toBe(state.enemy.maxHp - 25)
    // BASE-D：score効果は無得点。damage分（25×1.2）だけがtotalに載る
    expect(next.score.total).toBeCloseTo(25 * 1.2)
  })
})
