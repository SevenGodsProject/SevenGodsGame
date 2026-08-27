import { describe, expect, it } from 'vitest'
import { GOD_IDS } from '../data/gods'
import { ENEMY_IDS } from '../data/enemies'
import { getRecommendedDeck } from '../data/deckBuilder'
import type { Difficulty, GameState } from '../types'
import { applyAction } from './reducer'
import { runEnemyTurn } from './round'
import { getFinalScore } from './score'
import { getJurakuMasteryRaw, getMastery } from './mastery'
import { startTestGame } from './testUtils'

/**
 * 寿楽Mastery「無力化」J-G prototype（決定113）の仕様検証。
 * raw＝敵攻撃1回ごとの軽減率(raw−actual)/rawの等重み平均（金額加重ではない）。
 * S＝raw>=0.90 かつ 強攻撃(内部raw>=10)半減ゲート かつ easy以外。
 * ※閾値はprototype検証用初期値であり正式値ではない。
 */

function jurakuGame(difficulty: Difficulty = 'normal'): GameState {
  return applyAction(null, {
    type: 'START_GAME',
    seed: `juraku-mastery-${difficulty}`,
    godId: GOD_IDS.juraku,
    enemyId: ENEMY_IDS.trial,
    deck: getRecommendedDeck(GOD_IDS.juraku),
    difficulty,
  }).state
}

/** 指定raw攻撃＋敵atkデバフ量で敵ターンを1回実行する */
function attackWith(state: GameState, raw: number, debuff: number): GameState {
  const staged: GameState = {
    ...state,
    enemy: {
      ...state.enemy,
      intent: { kind: 'attack', amount: raw },
      buffs: debuff > 0 ? [{ stat: 'atk', amount: -debuff, remainingRounds: 2 }] : [],
    },
  }
  return runEnemyTurn(staged).state
}

describe('寿楽J-G集計（runEnemyTurn）', () => {
  it('raw=100 actual=20 → 軽減率0.80が積算される', () => {
    const next = attackWith(jurakuGame(), 100, 80)
    expect(next.mastery.attackCount).toBe(1)
    expect(next.mastery.reductionRateSum).toBeCloseTo(0.8)
    expect(getJurakuMasteryRaw(next)).toBeCloseTo(0.8)
  })

  it('複数攻撃は等重み平均（金額加重ではない）：raw100/80%減とraw20/50%減 → 0.65', () => {
    let s = attackWith(jurakuGame(), 100, 80) // 0.80
    s = attackWith(s, 20, 10) // 0.50
    expect(s.mastery.attackCount).toBe(2)
    // 金額加重なら (80+10)/(100+20)=0.75。等重みなら (0.8+0.5)/2=0.65
    expect(getJurakuMasteryRaw(s)).toBeCloseTo(0.65)
    expect(getJurakuMasteryRaw(s)).not.toBeCloseTo(0.75)
  })

  it('charge行動は集計されない', () => {
    const base = jurakuGame()
    const staged: GameState = {
      ...base,
      enemy: { ...base.enemy, intent: { kind: 'charge', label: '溜め' } },
    }
    const next = runEnemyTurn(staged).state
    expect(next.mastery.attackCount).toBe(0)
  })

  it('寿楽以外の神ではJ-G集計されない', () => {
    const ebisu = startTestGame() // 恵比寿
    const next = attackWith(ebisu, 100, 80)
    expect(next.mastery.attackCount).toBe(0)
    expect(next.mastery.reductionRateSum).toBe(0)
  })

  it('debuffなし（空撃ち相当：軽減0）の攻撃は率0として数えられ、平均を上げない', () => {
    let s = attackWith(jurakuGame(), 100, 80) // 0.80
    s = attackWith(s, 10, 0) // 軽減なし → 0
    expect(getJurakuMasteryRaw(s)).toBeCloseTo(0.4)
  })
})

describe('寿楽S行動ゲート（strongNeutralized）', () => {
  it('raw=10 actual=5（半分ちょうど）→ true', () => {
    const next = attackWith(jurakuGame(), 10, 5)
    expect(next.mastery.strongNeutralized).toBe(true)
  })

  it('raw=10 actual=6（半分超）→ false', () => {
    const next = attackWith(jurakuGame(), 10, 4)
    expect(next.mastery.strongNeutralized).toBe(false)
  })

  it('raw=9（強攻撃未満）はactual=0でも false', () => {
    const next = attackWith(jurakuGame(), 9, 9)
    expect(next.mastery.strongNeutralized).toBe(false)
  })

  it('一度trueになったら以後の攻撃で戻らない', () => {
    let s = attackWith(jurakuGame(), 12, 6) // true
    s = attackWith(s, 15, 0) // 軽減なし
    expect(s.mastery.strongNeutralized).toBe(true)
  })
})

describe('寿楽Grade判定（prototype初期値）', () => {
  function withRaw(
    raw: number,
    gate: boolean,
    difficulty: Difficulty = 'normal',
  ): GameState {
    const base = jurakuGame(difficulty)
    return {
      ...base,
      mastery: {
        ...base.mastery,
        attackCount: 10,
        reductionRateSum: raw * 10,
        strongNeutralized: gate,
      },
    }
  }

  // G1d：B閾値は0.55→0.50へ緩和（rules.tsコメント参照）
  it('B境界：0.50でB、0.51でB、0.499999と0.49はC', () => {
    expect(getMastery(withRaw(0.5, false))?.grade).toBe('B')
    expect(getMastery(withRaw(0.51, false))?.grade).toBe('B')
    expect(getMastery(withRaw(0.499999, false))?.grade).toBe('C')
    expect(getMastery(withRaw(0.49, false))?.grade).toBe('C')
  })

  it('A境界：0.80でA', () => {
    expect(getMastery(withRaw(0.8, false))?.grade).toBe('A')
  })

  it('S：raw0.90＋ゲートtrue＋normal → S', () => {
    const m = getMastery(withRaw(0.9, true, 'normal'))
    expect(m?.grade).toBe('S')
  })

  it('raw0.90でもゲートfalseならA（強打半減が必須）', () => {
    const m = getMastery(withRaw(0.95, false, 'normal'))
    expect(m?.grade).toBe('A')
    expect(m?.sGateMet).toBe(false)
  })

  it('easyではS条件を満たしても上限A（easyCapped）', () => {
    const m = getMastery(withRaw(0.95, true, 'easy'))
    expect(m?.grade).toBe('A')
    expect(m?.easyCapped).toBe(true)
  })

  it('hardではS可能', () => {
    expect(getMastery(withRaw(0.92, true, 'hard'))?.grade).toBe('S')
  })

  it('攻撃0回の試合はraw0（ゼロ除算なし）', () => {
    const base = jurakuGame()
    expect(getJurakuMasteryRaw(base)).toBe(0)
    expect(getMastery(base)?.grade).toBe('C')
  })

  it('神技名は「無力化」', () => {
    expect(getMastery(withRaw(0.7, false))?.title).toBe('無力化')
  })
})

describe('Battle Scoreとの完全分離', () => {
  it('寿楽Mastery集計値はBattle Score totalに一切影響しない', () => {
    const low = jurakuGame()
    const high: GameState = {
      ...low,
      mastery: {
        ...low.mastery,
        attackCount: 10,
        reductionRateSum: 9.5,
        strongNeutralized: true,
      },
    }
    expect(low.score.total).toBe(high.score.total)
    expect(getFinalScore(low.score)).toBe(getFinalScore(high.score))
  })
})
