import { describe, expect, it } from 'vitest'
import { GOD_IDS } from '../data/gods'
import { ENEMY_IDS } from '../data/enemies'
import { getRecommendedDeck } from '../data/deckBuilder'
import type { Difficulty, GameState } from '../types'
import { applyAction } from './reducer'
import { runEnemyTurn } from './round'
import { getFinalScore } from './score'
import { getMastery, getSobiMasteryRaw } from './mastery'
import { startTestGame } from './testUtils'

/**
 * 蒼毘Mastery「鉄壁」S4 prototype（STEP-SCORE2-G3）の仕様検証。
 * raw＝無傷受け率＝fullyBlockedCount ÷ guardAttackCount（1攻撃＝1票）。
 * fullyBlocked＝actual>0の攻撃をblockが完全吸収しHP実害0。
 * debuffでactual=0になった攻撃は寿楽の領分＝分母にも分子にも入れない。
 * ※閾値（B0.40/A0.65/S0.85）はG2校正に基づくprototype検証用初期値。
 */

function sobiGame(difficulty: Difficulty = 'normal'): GameState {
  return applyAction(null, {
    type: 'START_GAME',
    seed: `sobi-mastery-${difficulty}`,
    godId: GOD_IDS.sobi,
    enemyId: ENEMY_IDS.trial,
    deck: getRecommendedDeck(GOD_IDS.sobi),
    difficulty,
  }).state
}

/** 指定raw攻撃・自分block・敵atkデバフ量で敵ターンを1回実行する */
function attackWith(state: GameState, raw: number, block: number, debuff = 0): GameState {
  const staged: GameState = {
    ...state,
    player: { ...state.player, block },
    enemy: {
      ...state.enemy,
      intent: { kind: 'attack', amount: raw },
      buffs: debuff > 0 ? [{ stat: 'atk', amount: -debuff, remainingRounds: 2 }] : [],
    },
  }
  return runEnemyTurn(staged).state
}

describe('蒼毘S4集計（runEnemyTurn）', () => {
  it('block>=actual：完全吸収＝1票かつfullyBlocked', () => {
    const next = attackWith(sobiGame(), 8, 8)
    expect(next.mastery.guardAttackCount).toBe(1)
    expect(next.mastery.fullyBlockedCount).toBe(1)
    expect(next.player.hp).toBe(next.player.maxHp)
  })

  it('partial block（HP1以上減少）：票にはなるがfullyBlockedではない', () => {
    const next = attackWith(sobiGame(), 8, 7)
    expect(next.mastery.guardAttackCount).toBe(1)
    expect(next.mastery.fullyBlockedCount).toBe(0)
    expect(next.player.hp).toBe(next.player.maxHp - 1)
  })

  it('zero block：票にはなるがfullyBlockedではない', () => {
    const next = attackWith(sobiGame(), 5, 0)
    expect(next.mastery.guardAttackCount).toBe(1)
    expect(next.mastery.fullyBlockedCount).toBe(0)
  })

  it('overblock：余剰blockを積んでも1攻撃＝1票（加点は1回分だけ）', () => {
    const next = attackWith(sobiGame(), 3, 50)
    expect(next.mastery.guardAttackCount).toBe(1)
    expect(next.mastery.fullyBlockedCount).toBe(1)
  })

  it('charge行動は集計されない', () => {
    const base = sobiGame()
    const staged: GameState = {
      ...base,
      enemy: { ...base.enemy, intent: { kind: 'charge', label: '溜め' } },
    }
    const next = runEnemyTurn(staged).state
    expect(next.mastery.guardAttackCount).toBe(0)
  })

  it('debuffだけでactual=0：鉄壁に数えない（分母にも入れない＝寿楽の領分）', () => {
    const next = attackWith(sobiGame(), 8, 0, 8)
    expect(next.mastery.guardAttackCount).toBe(0)
    expect(next.mastery.fullyBlockedCount).toBe(0)
  })

  it('debuffで弱めた残りをblockで受け切る：fullyBlockedになる（併用は正当）', () => {
    const next = attackWith(sobiGame(), 10, 4, 6) // actual=4をblock4で完全吸収
    expect(next.mastery.guardAttackCount).toBe(1)
    expect(next.mastery.fullyBlockedCount).toBe(1)
  })

  it('蒼毘以外の神ではS4集計されない', () => {
    const ebisu = startTestGame() // 恵比寿
    const next = attackWith(ebisu, 8, 8)
    expect(next.mastery.guardAttackCount).toBe(0)
    expect(next.mastery.fullyBlockedCount).toBe(0)
  })

  it('蒼毘の試合で寿楽J-Gフィールドは動かない（神技の分離）', () => {
    const next = attackWith(sobiGame(), 8, 8)
    expect(next.mastery.attackCount).toBe(0)
    expect(next.mastery.reductionRateSum).toBe(0)
  })
})

describe('蒼毘Grade判定（prototype初期値）', () => {
  function withRaw(fully: number, guard: number): GameState {
    const base = sobiGame()
    return {
      ...base,
      mastery: { ...base.mastery, guardAttackCount: guard, fullyBlockedCount: fully },
    }
  }

  it.each([
    [399999, 1000000, 'C'], // 0.399999
    [40, 100, 'B'], // 0.40
    [649999, 1000000, 'B'], // 0.649999
    [65, 100, 'A'], // 0.65
    [849999, 1000000, 'A'], // 0.849999
    [85, 100, 'S'], // 0.85
    [100, 100, 'S'], // 1.00
  ] as const)('境界：%s/%s → %s', (fully, guard, expected) => {
    expect(getMastery(withRaw(fully, guard))?.grade).toBe(expected)
  })

  it('攻撃0回の試合はraw0（ゼロ除算なし）でC', () => {
    const base = sobiGame()
    expect(getSobiMasteryRaw(base)).toBe(0)
    expect(getMastery(base)?.grade).toBe('C')
  })

  it('神技名は「鉄壁」', () => {
    expect(getMastery(withRaw(50, 100))?.title).toBe('鉄壁')
  })
})

describe('Battle Scoreとの完全分離', () => {
  it('蒼毘Mastery集計値はBattle Score totalに一切影響しない', () => {
    const low = sobiGame()
    const high: GameState = {
      ...low,
      mastery: { ...low.mastery, guardAttackCount: 10, fullyBlockedCount: 10 },
    }
    expect(low.score.total).toBe(high.score.total)
    expect(getFinalScore(low.score)).toBe(getFinalScore(high.score))
  })
})
