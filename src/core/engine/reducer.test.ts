import { describe, expect, it } from 'vitest'
import { RULES } from '../data/rules'
import { GOD_IDS } from '../data/gods'
import { OTOMO_IDS } from '../data/otomo'
import { ENEMY_IDS } from '../data/enemies'
import { CARD_IDS } from '../data/cards'
import { STARTER_DECK } from '../data/decks'
import { cardUid } from '../types/ids'
import { applyAction } from './reducer'
import { startTestGame } from './testUtils'

const startAction = {
  type: 'START_GAME' as const,
  seed: 'reducer-test',
  godId: GOD_IDS.ebisu,
  enemyId: ENEMY_IDS.trial,
  deck: STARTER_DECK,
}

describe('START_GAME', () => {
  it('creates a valid round-1 state (決定11・16・18)', () => {
    const { state, events } = applyAction(null, startAction)

    expect(state.round).toBe(1)
    expect(state.phase).toBe('playerTurn')
    expect(state.status).toBe('playing')
    expect(state.ap).toEqual({ current: RULES.ap.perRound[0], max: RULES.ap.perRound[0] })
    expect(state.hand).toHaveLength(RULES.deck.initialHand)
    expect(state.deck).toHaveLength(RULES.deck.size - RULES.deck.initialHand)
    expect(state.player.hp).toBe(RULES.player.maxHp)
    expect(state.enemy.hp).toBe(103)
    expect(state.enemy.intent).toEqual({ kind: 'attack', amount: 5 })
    expect(state.otomo).toEqual({ defId: OTOMO_IDS.taimaru, name: '鯛丸', form: 'spirit' })
    expect(state.resonance).toEqual({ value: 0, max: RULES.resonance.max })

    expect(events.map((e) => e.t)).toContain('GAME_STARTED')
    expect(events.map((e) => e.t)).toContain('ROUND_STARTED')
    expect(events.filter((e) => e.t === 'CARD_DRAWN')).toHaveLength(RULES.deck.initialHand)
  })

  it('defaults to normal difficulty when unspecified, matching the validated baseline numbers (決定21・26・36・39)', () => {
    const { state } = applyAction(null, startAction)
    expect(state.difficulty).toBe('normal')
    expect(state.enemy.maxHp).toBe(103)
    expect(state.player.maxHp).toBe(RULES.player.maxHp)
  })

  it('defaults otomoGrowthPath to guardian when unspecified (決定44)', () => {
    const { state } = applyAction(null, startAction)
    expect(state.otomoGrowthPath).toBe('guardian')
  })

  it('honors an explicit otomoGrowthPath', () => {
    const { state } = applyAction(null, { ...startAction, otomoGrowthPath: 'power' })
    expect(state.otomoGrowthPath).toBe('power')
  })

  it('difficulty scales enemy HP/attack and player max HP without touching card/god/otomo balance (決定39)', () => {
    const easy = applyAction(null, { ...startAction, difficulty: 'easy' }).state
    const hard = applyAction(null, { ...startAction, difficulty: 'hard' }).state

    const easyPreset = RULES.difficulty.easy
    const hardPreset = RULES.difficulty.hard

    expect(easy.enemy.maxHp).toBe(Math.round(103 * easyPreset.enemyHpMultiplier))
    expect(easy.player.maxHp).toBe(RULES.player.maxHp + easyPreset.playerMaxHpBonus)
    expect(easy.enemy.intent).toEqual({ kind: 'attack', amount: Math.round(5 * easyPreset.enemyAtkMultiplier) })

    expect(hard.enemy.maxHp).toBe(Math.round(103 * hardPreset.enemyHpMultiplier))
    expect(hard.player.maxHp).toBe(RULES.player.maxHp + hardPreset.playerMaxHpBonus)
    expect(hard.enemy.intent).toEqual({ kind: 'attack', amount: Math.round(5 * hardPreset.enemyAtkMultiplier) })
  })

  it('決定43: bonusCopies lets START_GAME accept a deck that would otherwise fail validation', () => {
    const overStackedDeck = Array.from({ length: RULES.deck.size }, () => STARTER_DECK[0])

    expect(() => applyAction(null, { ...startAction, deck: overStackedDeck })).toThrow()

    const { state } = applyAction(null, {
      ...startAction,
      deck: overStackedDeck,
      bonusCopies: { [STARTER_DECK[0]]: RULES.deck.size - RULES.deckBuilding.maxCopiesPerCard },
    })
    expect(state.deck.length + state.hand.length).toBe(RULES.deck.size)
  })

  it('is deterministic for the same seed (リプレイ用の不変ルール)', () => {
    const a = applyAction(null, startAction)
    const b = applyAction(null, startAction)
    expect(a.state).toEqual(b.state)
  })
})

describe('PLAY_CARD', () => {
  it('spends AP, applies effects and moves the card to discard', () => {
    const base = startTestGame()
    const instance = { uid: cardUid('t-strike'), defId: CARD_IDS.strike }
    const state = { ...base, hand: [...base.hand, instance] }

    const { state: next, events } = applyAction(state, { type: 'PLAY_CARD', uid: instance.uid })

    expect(next.ap.current).toBe(state.ap.current - 1)
    expect(next.hand.find((c) => c.uid === instance.uid)).toBeUndefined()
    expect(next.discard.find((c) => c.uid === instance.uid)).toBeDefined()
    expect(next.enemy.hp).toBe(state.enemy.hp - 5)
    expect(events.some((e) => e.t === 'CARD_PLAYED')).toBe(true)
  })

  it('awards a combo bonus from the second card played in a round (決定: comboPerExtraCard)', () => {
    const base = startTestGame()
    const first = { uid: cardUid('t-guard-1'), defId: CARD_IDS.guard }
    const second = { uid: cardUid('t-guard-2'), defId: CARD_IDS.guard }
    const state = { ...base, hand: [...base.hand, first, second] }

    const afterFirst = applyAction(state, { type: 'PLAY_CARD', uid: first.uid })
    expect(afterFirst.state.score.combo).toBe(0)

    const afterSecond = applyAction(afterFirst.state, { type: 'PLAY_CARD', uid: second.uid })
    expect(afterSecond.state.score.combo).toBe(RULES.score.comboPerExtraCard)
  })

  it('throws when the AP cost cannot be paid', () => {
    const base = startTestGame()
    const instance = { uid: cardUid('t-oracle'), defId: CARD_IDS.oracle }
    const state = { ...base, hand: [...base.hand, instance], ap: { current: 1, max: 2 } }

    expect(() => applyAction(state, { type: 'PLAY_CARD', uid: instance.uid })).toThrow()
  })

  it('throws when the card is not in hand', () => {
    const state = startTestGame()
    expect(() =>
      applyAction(state, { type: 'PLAY_CARD', uid: cardUid('not-in-hand') }),
    ).toThrow()
  })
})

describe('END_ROUND', () => {
  it('runs the enemy attack and starts the next round without AP carry-over (決定7)', () => {
    const state = startTestGame()
    const handBefore = state.hand.length

    const { state: next, events } = applyAction(state, { type: 'END_ROUND' })

    expect(next.round).toBe(2)
    expect(next.player.hp).toBe(RULES.player.maxHp - 5) // R1の敵攻撃力
    expect(next.ap).toEqual({ current: RULES.ap.perRound[1], max: RULES.ap.perRound[1] })
    expect(next.hand.length).toBe(handBefore + RULES.deck.drawPerRound)
    expect(next.enemy.intent).toEqual({ kind: 'attack', amount: 6 })

    const kinds = events.map((e) => e.t)
    expect(kinds).toContain('ENEMY_ACTED')
    expect(kinds).toContain('ROUND_ENDED')
    expect(kinds).toContain('ROUND_STARTED')
  })

  it('penalizes unused AP in the score (rules.score.unusedApPenalty)', () => {
    const state = startTestGame() // AP2を1枚も使わない
    const { state: next } = applyAction(state, { type: 'END_ROUND' })
    expect(next.score.apEfficiency).toBe(-(RULES.ap.perRound[0] * RULES.score.unusedApPenalty))
  })

  it('throws once the game is already over', () => {
    let state = startTestGame()
    while (state.status === 'playing') {
      state = applyAction(state, { type: 'END_ROUND' }).state
    }
    expect(state.status).not.toBe('playing')
    expect(() => applyAction(state, { type: 'END_ROUND' })).toThrow()
  })
})

describe('full playthrough', () => {
  it('ends in defeat if the player never blocks (敵の累積ダメージ > HP)', () => {
    let state = startTestGame()
    let lastResult = { state, events: [] as ReturnType<typeof applyAction>['events'] }

    for (let i = 0; i < RULES.totalRounds && state.status === 'playing'; i++) {
      lastResult = applyAction(state, { type: 'END_ROUND' })
      state = lastResult.state
    }

    // 5+6+8+9+11 = 39 > HP30 なのでラウンド5で敗北するはず
    expect(state.status).toBe('lost')
    expect(state.player.hp).toBe(0)
    expect(lastResult.events.some((e) => e.t === 'GAME_ENDED')).toBe(true)
  })
})
