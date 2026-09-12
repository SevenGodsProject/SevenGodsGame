import { afterEach, describe, expect, it } from 'vitest'
import { RULES } from '../data/rules'
import { GOD_IDS } from '../data/gods'
import { ENEMY_IDS } from '../data/enemies'
import { ALL_CARDS, CARD_IDS } from '../data/cards'
import { getCardPoolForGod } from '../data/deckBuilder'
import { cardUid } from '../types/ids'
import type { CardDefId, GameState, GodId } from '../types'
import { applyAction } from './reducer'
import { evaluateBonusCond, previewBonusTrigger } from './cardBonus'

/**
 * Phase 5-A（決定153）：共通カードへ広げた条件付き追加効果のうち、**新しい2条件**のテスト。
 *
 * Phase 3 から在る `blocked` / `enemyBig` / `lowHp` は `cardBonus.test.ts` が見ている。
 * ここが守るのは次の3つ：
 *   1. `combo` は「このラウンド2枚目以降」であり、ラウンドをまたいで持ち越さない
 *   2. `charged` は**使う前**のゲージで判定する（自分が上げた共鳴では成立しない）
 *   3. 手札の⚡（`previewBonusTrigger`）と実際の発動が、16枚すべてで食い違わない
 *
 * 2 は「先に共振を置いてから撃つ」という順番の判断を成立させる要（かなめ）で、
 * ここが崩れると Phase 5-A の狙いそのものが消える。
 */

const TEST_UID = cardUid('t-card')

function deckWith(godId: GodId): CardDefId[] {
  const deck: CardDefId[] = []
  for (const card of getCardPoolForGod(godId)) {
    while (
      deck.length < RULES.deck.size &&
      deck.filter((x) => x === card.id).length < RULES.deckBuilding.maxCopiesPerCard
    ) {
      deck.push(card.id)
    }
  }
  return deck.slice(0, RULES.deck.size)
}

function startGame(godId: GodId, seed = 'phase5a-bonus'): GameState {
  return applyAction(null, {
    type: 'START_GAME',
    seed,
    godId,
    enemyId: ENEMY_IDS.trial,
    deck: deckWith(godId),
  }).state
}

function withHand(state: GameState, defId: CardDefId, patch: Partial<GameState> = {}): GameState {
  return {
    ...state,
    ap: { current: 9, max: 9 },
    hand: [{ uid: TEST_UID, defId }],
    ...patch,
  }
}

const play = (state: GameState) => applyAction(state, { type: 'PLAY_CARD', uid: TEST_UID })

const withGauge = (state: GameState, value: number): GameState => ({
  ...state,
  resonance: { ...state.resonance, value },
})

const mutableRules = RULES as unknown as {
  godIdentity: { passivesEnabled: boolean; cardBonusEnabled: boolean }
}
afterEach(() => {
  mutableRules.godIdentity.passivesEnabled = true
  mutableRules.godIdentity.cardBonusEnabled = true
})

describe('combo（このラウンド2枚目以降）', () => {
  it('1枚目では成立しない（一撃：素の50だけ）', () => {
    const base = startGame(GOD_IDS.ebisu)
    const state = withHand(base, CARD_IDS.strike)
    expect(state.cardsPlayedThisRound).toBe(0)
    const { state: after, events } = play(state)
    expect(base.enemy.hp - after.enemy.hp).toBe(5)
    expect(events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(false)
  })

  it('2枚目では成立する（一撃：50 + 追加30）', () => {
    const base = startGame(GOD_IDS.ebisu)
    const state: GameState = {
      ...base,
      ap: { current: 9, max: 9 },
      hand: [
        { uid: cardUid('t-1'), defId: CARD_IDS.strike },
        { uid: cardUid('t-2'), defId: CARD_IDS.strike },
      ],
    }
    const first = applyAction(state, { type: 'PLAY_CARD', uid: cardUid('t-1') })
    expect(first.state.cardsPlayedThisRound).toBe(1)
    expect(first.events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(false)

    const hpAfterFirst = first.state.enemy.hp
    const second = applyAction(first.state, { type: 'PLAY_CARD', uid: cardUid('t-2') })
    expect(hpAfterFirst - second.state.enemy.hp).toBe(5 + 3)
    expect(second.events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(true)
  })

  it('3枚目以降も成立し続ける（「2枚目だけ」ではない）', () => {
    const base = startGame(GOD_IDS.ebisu)
    const state = withHand({ ...base, cardsPlayedThisRound: 2 }, CARD_IDS.strike)
    const { state: after, events } = play(state)
    expect(base.enemy.hp - after.enemy.hp).toBe(5 + 3)
    expect(events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(true)
  })

  it('ラウンドが変わるとリセットされる（前のラウンドの枚数を持ち越さない）', () => {
    const base = startGame(GOD_IDS.ebisu)
    const played: GameState = { ...base, cardsPlayedThisRound: 3 }
    expect(evaluateBonusCond('combo', played, played)).toBe(true)
    const nextRound = applyAction(played, { type: 'END_ROUND' }).state
    expect(nextRound.cardsPlayedThisRound).toBe(0)
    expect(evaluateBonusCond('combo', nextRound, nextRound)).toBe(false)
  })

  it('判定は RULES.cardBonus.comboMinCardsPlayed を見ている（値を直書きしていない）', () => {
    const base = startGame(GOD_IDS.ebisu)
    const below: GameState = {
      ...base,
      cardsPlayedThisRound: RULES.cardBonus.comboMinCardsPlayed - 1,
    }
    const atLeast: GameState = {
      ...base,
      cardsPlayedThisRound: RULES.cardBonus.comboMinCardsPlayed,
    }
    expect(evaluateBonusCond('combo', below, below)).toBe(false)
    expect(evaluateBonusCond('combo', atLeast, atLeast)).toBe(true)
  })
})

describe('charged（共鳴が4以上）', () => {
  it('共鳴3以下では成立しない（剛撃：素の120だけ）', () => {
    const base = startGame(GOD_IDS.ebisu)
    const state = withHand(withGauge(base, 3), CARD_IDS.heavyBlow)
    const { state: after, events } = play(state)
    expect(state.enemy.hp - after.enemy.hp).toBe(12)
    expect(events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(false)
  })

  it('共鳴4以上で成立する（剛撃：120 + 追加40）', () => {
    const base = startGame(GOD_IDS.ebisu)
    const state = withHand(withGauge(base, 4), CARD_IDS.heavyBlow)
    const { state: after, events } = play(state)
    expect(state.enemy.hp - after.enemy.hp).toBe(12 + 4)
    expect(events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(true)
  })

  it('★順序の仕様：自分が上げた共鳴では成立しない（共鳴3の乱舞は4に届いても追加なし）', () => {
    const base = startGame(GOD_IDS.ebisu)
    const state = withHand(withGauge(base, 3), CARD_IDS.flurry)
    const { state: after, events } = play(state)
    expect(after.resonance.value).toBe(4)
    expect(events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(false)
  })

  it('★順序の仕様：先に共鳴を上げてから撃つと成立する（共振 → 剛撃）', () => {
    const base = startGame(GOD_IDS.ebisu)
    const state: GameState = {
      ...withGauge(base, 2),
      ap: { current: 9, max: 9 },
      hand: [
        { uid: cardUid('t-res'), defId: CARD_IDS.resonate },
        { uid: cardUid('t-hit'), defId: CARD_IDS.heavyBlow },
      ],
    }
    // 共振（+2）。1枚目なので共振自身の combo は立たない
    const first = applyAction(state, { type: 'PLAY_CARD', uid: cardUid('t-res') })
    expect(first.state.resonance.value).toBe(4)
    expect(first.events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(false)
    // 剛撃：charged が立つ
    const hpBefore = first.state.enemy.hp
    const second = applyAction(first.state, { type: 'PLAY_CARD', uid: cardUid('t-hit') })
    expect(hpBefore - second.state.enemy.hp).toBe(12 + 4)
    expect(second.events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(true)
  })

  it('判定は RULES.cardBonus.chargedThreshold を見ている（値を直書きしていない）', () => {
    const base = startGame(GOD_IDS.ebisu)
    const below = withGauge(base, RULES.cardBonus.chargedThreshold - 1)
    const atLeast = withGauge(base, RULES.cardBonus.chargedThreshold)
    expect(evaluateBonusCond('charged', below, below)).toBe(false)
    expect(evaluateBonusCond('charged', atLeast, atLeast)).toBe(true)
  })

  it('共鳴が発動（7）してゲージが0へ戻ったあとは、もう成立しない', () => {
    const base = startGame(GOD_IDS.ebisu)
    const state = withHand(withGauge(base, 6), CARD_IDS.kaguraDance)
    const { state: after, events } = play(state)
    // 使う前は6なので charged は成立。本体の共鳴+3で発動し、ゲージは0へ
    expect(events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(true)
    expect(events.some((e) => e.t === 'RESONANCE_BURST')).toBe(true)
    expect(after.resonance.value).toBe(0)
    expect(evaluateBonusCond('charged', after, after)).toBe(false)
  })
})

describe('手札の⚡（previewBonusTrigger）と実際の発動が一致する', () => {
  it('combo：1枚目は光らず、2枚目以降は光る', () => {
    const base = startGame(GOD_IDS.ebisu)
    const def = ALL_CARDS.find((c) => c.id === CARD_IDS.strike)!
    const first = withHand(base, CARD_IDS.strike)
    expect(previewBonusTrigger(first, def)).toBe(false)
    expect(play(first).events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(false)

    const second = withHand({ ...base, cardsPlayedThisRound: 1 }, CARD_IDS.strike)
    expect(previewBonusTrigger(second, def)).toBe(true)
    expect(play(second).events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(true)
  })

  it('charged：共鳴3では光らず、4で光る', () => {
    const base = startGame(GOD_IDS.ebisu)
    const def = ALL_CARDS.find((c) => c.id === CARD_IDS.heavyBlow)!
    const low = withHand(withGauge(base, 3), CARD_IDS.heavyBlow)
    expect(previewBonusTrigger(low, def)).toBe(false)
    expect(play(low).events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(false)

    const high = withHand(withGauge(base, 4), CARD_IDS.heavyBlow)
    expect(previewBonusTrigger(high, def)).toBe(true)
    expect(play(high).events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(true)
  })

  it('共通16枚 × 4盤面で、予告と実際が1件も食い違わない', () => {
    // 「光ったのに出ない」「光らないのに出る」はどちらもプレイヤーの信頼を壊す。
    const base = startGame(GOD_IDS.ebisu)
    const boards: Array<[string, GameState]> = [
      ['初手', base],
      ['2枚目', { ...base, cardsPlayedThisRound: 1 }],
      [
        '共鳴4・予告大',
        {
          ...withGauge(base, 4),
          enemy: { ...base.enemy, intent: { kind: 'attack', amount: 20 } },
        },
      ],
      [
        'ブロック十分・予告小',
        {
          ...base,
          player: { ...base.player, block: 40 },
          enemy: { ...base.enemy, intent: { kind: 'attack', amount: 5 } },
        },
      ],
    ]
    const targets = ALL_CARDS.filter((c) => c.bonus && !c.godId)
    expect(targets.length).toBe(16)
    for (const [label, board] of boards) {
      for (const def of targets) {
        const state = withHand(board, def.id)
        const predicted = previewBonusTrigger(state, def)
        const actual = play(state).events.some((e) => e.t === 'BONUS_TRIGGERED')
        expect(actual, `${label} / ${def.name}：⚡=${predicted} だが実際=${actual}`).toBe(predicted)
      }
    }
  })
})

describe('kill switch は新条件にも効く', () => {
  it('cardBonusEnabled=false なら combo / charged も一切発動しない', () => {
    mutableRules.godIdentity.cardBonusEnabled = false
    const base = startGame(GOD_IDS.ebisu)

    const combo = withHand({ ...base, cardsPlayedThisRound: 2 }, CARD_IDS.strike)
    const comboPlay = play(combo)
    expect(base.enemy.hp - comboPlay.state.enemy.hp).toBe(5)
    expect(comboPlay.events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(false)

    const charged = withHand(withGauge(base, 6), CARD_IDS.heavyBlow)
    const chargedPlay = play(charged)
    expect(base.enemy.hp - chargedPlay.state.enemy.hp).toBe(12)
    expect(chargedPlay.events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(false)
  })
})

describe('決定論（bonusのdraw・共鳴を含めても再現する）', () => {
  it('同じ種・同じ手順なら、盤面もrngCursorも完全に一致する', () => {
    const build = () => {
      const base = startGame(GOD_IDS.ebisu, 'phase5a-determinism')
      // 見切り（combo で1枚引く）を2枚目に使う＝ドローを伴う追加効果
      return withHand({ ...base, cardsPlayedThisRound: 1 }, CARD_IDS.readTheAttack)
    }
    const a = play(build())
    const b = play(build())
    expect(a.state).toEqual(b.state)
    expect(a.state.rngCursor).toBe(b.state.rngCursor)
    expect(a.events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(true)
  })
})
