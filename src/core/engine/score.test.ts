import { describe, expect, it } from 'vitest'
import { RULES } from '../data/rules'
import { GOD_IDS } from '../data/gods'
import { ENEMY_IDS } from '../data/enemies'
import { STARTER_DECK } from '../data/decks'
import { CARD_IDS } from '../data/cards'
import { cardUid } from '../types/ids'
import type { Difficulty, GameState } from '../types'
import { applyAction } from './reducer'
import { applyDamage } from './effects'
import { getFinalScore } from './score'
import { startTestGame } from './testUtils'

/**
 * BASE-D（決定109、STEP-SCORE2-D-PROTO）のBattle Score仕様を直接検証する。
 * 係数はまだ正式採用値ではないが、「仕様（どの行動が・どう加点されるか）」を
 * ここで固定し、意図しない回帰を検知する。
 */

/** ラウンド内でguard（1AP）をn枚連続で使える状態を作る */
function withGuards(state: GameState, count: number): { state: GameState; uids: ReturnType<typeof cardUid>[] } {
  const uids = Array.from({ length: count }, (_, i) => cardUid(`t-combo-${i}`))
  const cards = uids.map((uid) => ({ uid, defId: CARD_IDS.guard }))
  return {
    state: { ...state, hand: [...state.hand, ...cards], ap: { current: 99, max: 99 } },
    uids,
  }
}

describe('BASE-D combo（逓減連携）', () => {
  it('2枚目+12 / 3枚目+8 / 4枚目+4 / 5枚目以降+3 で加点される', () => {
    const base = withGuards(startTestGame(), 6)
    let state = base.state
    const comboAfterEach: number[] = []
    for (const uid of base.uids) {
      state = applyAction(state, { type: 'PLAY_CARD', uid }).state
      comboAfterEach.push(state.score.combo)
    }
    // 累積：0, 12, 20, 24, 27, 30
    expect(comboAfterEach).toEqual([0, 12, 20, 24, 27, 30])
  })

  it('ラウンドを跨ぐと連携カウントはリセットされ、次ラウンドの2枚目からまた+12になる', () => {
    const base = withGuards(startTestGame(), 4)
    let state = base.state
    state = applyAction(state, { type: 'PLAY_CARD', uid: base.uids[0] }).state
    state = applyAction(state, { type: 'PLAY_CARD', uid: base.uids[1] }).state
    expect(state.score.combo).toBe(12)

    state = applyAction(state, { type: 'END_ROUND' }).state
    expect(state.cardsPlayedThisRound).toBe(0)

    // R2の1枚目は0点、2枚目は再び+12
    state = { ...state, ap: { current: 99, max: 99 } }
    state = applyAction(state, { type: 'PLAY_CARD', uid: base.uids[2] }).state
    expect(state.score.combo).toBe(12)
    state = applyAction(state, { type: 'PLAY_CARD', uid: base.uids[3] }).state
    expect(state.score.combo).toBe(24)
  })
})

describe('BASE-D victory（勝利時のみのボーナス）', () => {
  function winAtRound(round: number): GameState {
    const base = startTestGame()
    const staged: GameState = { ...base, round, enemy: { ...base.enemy, hp: 1 } }
    return applyDamage(staged, 'enemy', 1).state
  }

  it('tempoは撃破ラウンドの逓減表（R4=240/R5=170/R6=90/R7=0）', () => {
    expect(winAtRound(4).score.tempo).toBe(240)
    expect(winAtRound(5).score.tempo).toBe(170)
    expect(winAtRound(6).score.tempo).toBe(90)
    expect(winAtRound(7).score.tempo).toBe(0)
  })

  it('victoryBaseは常に300、R3以前のtempoは290で頭打ち', () => {
    const won = winAtRound(2)
    expect(won.score.victory).toBe(300)
    expect(won.score.tempo).toBe(290)
  })

  it('survivalは残HP率×30（半分なら15）', () => {
    const base = startTestGame()
    const staged: GameState = {
      ...base,
      player: { ...base.player, hp: base.player.maxHp / 2 },
      enemy: { ...base.enemy, hp: 1 },
    }
    const won = applyDamage(staged, 'enemy', 1).state
    expect(won.score.survival).toBe(15)
  })

  it('difficultyは加算方式（easy=-20 / normal=0 / hard=+30）', () => {
    const winWith = (difficulty: Difficulty) => {
      const start = applyAction(null, {
        type: 'START_GAME',
        seed: `diff-${difficulty}`,
        godId: GOD_IDS.ebisu,
        enemyId: ENEMY_IDS.trial,
        deck: STARTER_DECK,
        difficulty,
      }).state
      return applyDamage(start, 'enemy', start.enemy.hp).state
    }
    expect(winWith('easy').score.difficultyBonus).toBe(-20)
    expect(winWith('normal').score.difficultyBonus).toBe(0)
    expect(winWith('hard').score.difficultyBonus).toBe(30)
  })

  it('敗北（lost）では勝利系ボーナスが一切付かない', () => {
    const state = startTestGame()
    const lost = applyDamage(state, 'self', state.player.hp).state
    expect(lost.status).toBe('lost')
    expect(lost.score.victory).toBe(0)
    expect(lost.score.tempo).toBe(0)
    expect(lost.score.survival).toBe(0)
    expect(lost.score.difficultyBonus).toBe(0)
  })

  it('未撃破（finished）でも勝利系ボーナスが一切付かない', () => {
    const base = startTestGame('score-finished')
    const staged: GameState = {
      ...base,
      round: RULES.totalRounds,
      player: { ...base.player, hp: 999999, maxHp: 999999 },
      enemy: { ...base.enemy, intent: null },
    }
    const { state: next } = applyAction(staged, { type: 'END_ROUND' })
    expect(next.status).toBe('finished')
    expect(next.score.victory).toBe(0)
    expect(next.score.tempo).toBe(0)
    expect(next.score.survival).toBe(0)
    expect(next.score.difficultyBonus).toBe(0)
  })
})

describe('BASE-D getFinalScore（最終スコア＝素点×1.3の四捨五入）', () => {
  const scoreWithTotal = (total: number) => ({
    damage: 0,
    combo: 0,
    victory: 0,
    tempo: 0,
    survival: 0,
    difficultyBonus: 0,
    legacy: 0,
    total,
  })

  it('素点100 → 130', () => {
    expect(getFinalScore(scoreWithTotal(100))).toBe(130)
  })

  it('端数は四捨五入される（素点101 → 131.3 → 131）', () => {
    expect(getFinalScore(scoreWithTotal(101))).toBe(131)
  })

  it('GAME_ENDEDイベントのtotalScoreは最終スコア（素点×1.3）になる', () => {
    // 敵HP1の状態で「一撃」を使って撃破し、reducerが発行するGAME_ENDEDを検証する
    const base = startTestGame()
    const strike = { uid: cardUid('t-final'), defId: CARD_IDS.strike }
    const staged: GameState = {
      ...base,
      enemy: { ...base.enemy, hp: 1 },
      hand: [strike, ...base.hand],
    }
    const { state: next, events } = applyAction(staged, { type: 'PLAY_CARD', uid: strike.uid })

    expect(next.status).toBe('won')
    const ended = events.find((e) => e.t === 'GAME_ENDED')
    expect(ended).toBeDefined()
    if (ended && ended.t === 'GAME_ENDED') {
      expect(ended.totalScore).toBe(getFinalScore(next.score))
    }
  })
})
