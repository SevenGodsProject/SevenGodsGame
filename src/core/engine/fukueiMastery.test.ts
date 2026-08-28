import { describe, expect, it } from 'vitest'
import { GOD_IDS } from '../data/gods'
import { ENEMY_IDS } from '../data/enemies'
import { FUKUEI_CARD_IDS } from '../data/cards'
import { getRecommendedDeck } from '../data/deckBuilder'
import { RULES } from '../data/rules'
import { cardUid } from '../types/ids'
import type { CardDefId, CardUid, Difficulty, GameState } from '../types'
import { applyAction } from './reducer'
import { runEnemyTurn } from './round'
import { getFinalScore } from './score'
import { getFukueiMasteryRaw, getMastery, isFukueiRiskGateMet } from './mastery'
import { startTestGame } from './testUtils'

/**
 * 福永Mastery「大勝負」G4 prototypeの仕様検証。
 * raw = (最終HP − 試合中最低HP) ÷ maxHp（どん底からの立て直し幅）。
 * risk gate＝「自傷カード由来の敵への実効与ダメージ ≥ 敵maxHp×0.10」を
 * 満たさない試合はraw=0（C）。敵に殴られること自体は評価しない。
 * ※閾値（B0.10/A0.40/S0.60）はLANE C research（50,400試合）＋worktree
 * simulationに基づくprototype検証用初期値であり、正式採用値ではない。
 */

function fukueiGame(difficulty: Difficulty = 'normal'): GameState {
  return applyAction(null, {
    type: 'START_GAME',
    seed: `fukuei-mastery-${difficulty}`,
    godId: GOD_IDS.fukuei,
    enemyId: ENEMY_IDS.trial,
    deck: getRecommendedDeck(GOD_IDS.fukuei),
    difficulty,
  }).state
}

/** 指定カードを手札へ追加し、APを潤沢にして「今すぐ使える」状態にする */
function withCardInHand(
  state: GameState,
  defId: CardDefId,
): { state: GameState; uid: CardUid } {
  const uid = cardUid(`t-fukuei-${state.hand.length}`)
  return {
    state: {
      ...state,
      hand: [...state.hand, { uid, defId }],
      ap: { current: 9, max: 9 },
    },
    uid,
  }
}

function play(state: GameState, uid: CardUid): GameState {
  return applyAction(state, { type: 'PLAY_CARD', uid }).state
}

describe('福永G4集計：riskCardEffDamage（playCard）', () => {
  it('自傷カード（一攫千金）の敵への実効ダメージが積算される', () => {
    const { state, uid } = withCardInHand(fukueiGame(), FUKUEI_CARD_IDS.fortuneStrike)
    const next = play(state, uid)
    // 一攫千金＝敵15／自傷2。素の敵HPは十分あるため実効15
    expect(next.mastery.riskCardEffDamage).toBe(15)
  })

  it('overkill分は数えない（実効ダメージのみ）', () => {
    const base = fukueiGame()
    const staged = { ...base, enemy: { ...base.enemy, hp: 10 } }
    const { state, uid } = withCardInHand(staged, FUKUEI_CARD_IDS.fortuneStrike)
    const next = play(state, uid)
    expect(next.mastery.riskCardEffDamage).toBe(10)
  })

  it('敵blockに吸収された分は数えない', () => {
    const base = fukueiGame()
    const staged = { ...base, enemy: { ...base.enemy, block: 5 } }
    const { state, uid } = withCardInHand(staged, FUKUEI_CARD_IDS.fortuneStrike)
    const next = play(state, uid)
    expect(next.mastery.riskCardEffDamage).toBe(10)
  })

  it('atkバフ上乗せ分も実効値として数える（実際に敵へ届いた量）', () => {
    const base = fukueiGame()
    const staged: GameState = {
      ...base,
      player: {
        ...base.player,
        buffs: [{ stat: 'atk', amount: 3, remainingRounds: 2 }],
      },
    }
    const { state, uid } = withCardInHand(staged, FUKUEI_CARD_IDS.fortuneStrike)
    const next = play(state, uid)
    expect(next.mastery.riskCardEffDamage).toBe(18)
  })

  it('自傷を含まないカード（不屈の一歩・冒険者の勘）は積算されない', () => {
    const a = withCardInHand(fukueiGame(), FUKUEI_CARD_IDS.unbreakableStep)
    const afterA = play(a.state, a.uid)
    expect(afterA.mastery.riskCardEffDamage).toBe(0)

    const b = withCardInHand(afterA, FUKUEI_CARD_IDS.adventurersInstinct)
    const afterB = play(b.state, b.uid)
    expect(afterB.mastery.riskCardEffDamage).toBe(0)
  })

  it('福永以外の神では集計されない（minHpも動かない＝神技の分離）', () => {
    const base = { ...startTestGame(), godId: GOD_IDS.taiyo }
    const { state, uid } = withCardInHand(base, FUKUEI_CARD_IDS.fortuneStrike)
    const next = play(state, uid)
    expect(next.mastery.riskCardEffDamage).toBe(0)
    // 自傷2でHPは減るが、福永でないためminHpは初期値（満タン）のまま
    expect(next.player.hp).toBe(next.player.maxHp - 2)
    expect(next.mastery.minHp).toBe(next.player.maxHp)
  })

  it('自傷カードのプレイでminHpも更新される（自傷はどん底の一部）', () => {
    const { state, uid } = withCardInHand(fukueiGame(), FUKUEI_CARD_IDS.fortuneStrike)
    const next = play(state, uid)
    expect(next.player.hp).toBe(next.player.maxHp - 2)
    expect(next.mastery.minHp).toBe(next.player.maxHp - 2)
  })
})

describe('福永G4集計：minHp（runEnemyTurn）', () => {
  function attacked(state: GameState, amount: number, block = 0): GameState {
    const staged: GameState = {
      ...state,
      player: { ...state.player, block },
      enemy: { ...state.enemy, intent: { kind: 'attack', amount } },
    }
    return runEnemyTurn(staged).state
  }

  it('敵の攻撃でminHpが更新される', () => {
    const next = attacked(fukueiGame(), 12)
    expect(next.mastery.minHp).toBe(next.player.maxHp - 12)
  })

  it('blockで無傷なら更新されない（HPが減っていない）', () => {
    const next = attacked(fukueiGame(), 8, 8)
    expect(next.player.hp).toBe(next.player.maxHp)
    expect(next.mastery.minHp).toBe(next.player.maxHp)
  })

  it('連撃（multiAttack）でも合計被害後の最低HPを記録する', () => {
    const base = fukueiGame()
    const staged: GameState = {
      ...base,
      enemy: { ...base.enemy, intent: { kind: 'multiAttack', hits: [5, 4] } },
    }
    const next = runEnemyTurn(staged).state
    expect(next.mastery.minHp).toBe(next.player.maxHp - 9)
  })

  it('回復してもminHpは戻らない（最低値の記録）', () => {
    // runEnemyTurn後はphaseがenemyTurnのため、プレイ可能な状態へ戻す
    const damaged: GameState = { ...attacked(fukueiGame(), 12), phase: 'playerTurn' }
    const { state, uid } = withCardInHand(damaged, FUKUEI_CARD_IDS.goddessOfLuck)
    const healed = play(state, uid)
    expect(healed.player.hp).toBeGreaterThan(healed.mastery.minHp)
    expect(healed.mastery.minHp).toBe(healed.player.maxHp - 12)
  })

  it('福永以外の神では敵攻撃でminHpが動かない', () => {
    const next = attacked(startTestGame(), 12) // 恵比寿
    expect(next.player.hp).toBe(next.player.maxHp - 12)
    expect(next.mastery.minHp).toBe(next.player.maxHp)
  })

  it('ラウンドを跨いでも集計はリセットされない（roundDamageのみリセット）', () => {
    const { state, uid } = withCardInHand(fukueiGame(), FUKUEI_CARD_IDS.fortuneStrike)
    const played = play(state, uid)
    const nextRound = applyAction(played, { type: 'END_ROUND' }).state
    expect(nextRound.round).toBe(2)
    expect(nextRound.mastery.riskCardEffDamage).toBe(15)
    expect(nextRound.mastery.minHp).toBeLessThan(nextRound.player.maxHp)
  })
})

describe('福永risk gate（自傷カード由来の実効与ダメ ≥ 敵maxHpの10%）', () => {
  /** maxHp100の敵・立て直し幅rebuild%の勝利盤面を作る */
  function crafted(riskEff: number, hp = 100, minHp = 40, enemyMaxHp = 100): GameState {
    const base = fukueiGame()
    return {
      ...base,
      player: { ...base.player, hp, maxHp: 100 },
      enemy: { ...base.enemy, maxHp: enemyMaxHp },
      mastery: { ...base.mastery, minHp, riskCardEffDamage: riskEff },
    }
  }

  it('ちょうど10%（敵maxHp100でriskEff10）はgate達成（>=判定）', () => {
    expect(isFukueiRiskGateMet(crafted(10))).toBe(true)
    expect(getFukueiMasteryRaw(crafted(10))).toBeCloseTo(0.6)
  })

  it('10%未満はgate未達＝立て直し幅が大きくてもraw=0でC', () => {
    const state = crafted(9)
    expect(isFukueiRiskGateMet(state)).toBe(false)
    expect(getFukueiMasteryRaw(state)).toBe(0)
    const result = getMastery(state)
    expect(result?.grade).toBe('C')
    expect(result?.riskGateMet).toBe(false)
  })

  it('trial実値（maxHp103→gate10.3）：10は未達・11は達成', () => {
    expect(isFukueiRiskGateMet(crafted(10, 100, 40, 103))).toBe(false)
    expect(isFukueiRiskGateMet(crafted(11, 100, 40, 103))).toBe(true)
  })

  it('意図的被弾exploit遮断：敵に殴られただけ（自傷カード0）ではgate未達でC', () => {
    // 敵攻撃で大きく削られてから立て直しても、自傷カードを使っていなければ
    // riskCardEffDamage=0のままgate未達＝raw0。被弾はリスクとして評価しない
    const state = crafted(0, 100, 5) // どん底5→100の大立て直しだがriskEff0
    expect(getFukueiMasteryRaw(state)).toBe(0)
    expect(getMastery(state)?.grade).toBe('C')
  })
})

describe('福永Grade判定（prototype初期値 B0.10/A0.40/S0.60）', () => {
  function graded(hp: number, minHp: number): GameState {
    const base = fukueiGame()
    return {
      ...base,
      player: { ...base.player, hp, maxHp: 100 },
      enemy: { ...base.enemy, maxHp: 100 },
      mastery: { ...base.mastery, minHp, riskCardEffDamage: 50 }, // gateは達成済み
    }
  }

  it.each([
    [99, 90, 'C'], // raw 0.09
    [100, 90, 'B'], // raw 0.10
    [99, 60, 'B'], // raw 0.39
    [100, 60, 'A'], // raw 0.40
    [99, 40, 'A'], // raw 0.59
    [100, 40, 'S'], // raw 0.60
    [100, 0, 'S'], // raw 1.00（HP0寸前からの完全立て直し）
  ] as const)('境界：最終HP%s・最低HP%s → %s', (hp, minHp, expected) => {
    expect(getMastery(graded(hp, minHp))?.grade).toBe(expected)
  })

  it('無傷勝利は立て直し幅0でC（守り切りは福永の神技ではない）', () => {
    expect(getFukueiMasteryRaw(graded(100, 100))).toBe(0)
    expect(getMastery(graded(100, 100))?.grade).toBe('C')
  })

  it('敗北（HP0）ではraw0（負値にならない）', () => {
    expect(getFukueiMasteryRaw(graded(0, 0))).toBe(0)
  })

  it('finalHP<minHpは発生しないが、防御的にrawは0へクランプされる', () => {
    expect(getFukueiMasteryRaw(graded(5, 10))).toBe(0)
  })

  it('easy挙動：G4 prototypeはeasy capなし（rawは比率のため難易度で歪まない）', () => {
    // 蒼毘G3と同方針：simulation実測で難易度farmingがほぼフラットのため
    // capは設けない（実測はLANE C報告のdistribution表を参照）
    const base = fukueiGame('easy')
    const state: GameState = {
      ...base,
      player: { ...base.player, hp: base.player.maxHp },
      mastery: {
        ...base.mastery,
        minHp: Math.round(base.player.maxHp * 0.35),
        riskCardEffDamage: 50,
      },
    }
    expect(getMastery(state)?.grade).toBe('S')
  })

  it('神技名は「大勝負」・riskGateMetが結果に含まれる', () => {
    const result = getMastery(graded(100, 40))
    expect(result?.title).toBe('大勝負')
    expect(result?.riskGateMet).toBe(true)
  })

  it('grade閾値はRULES.mastery.fukueiに集約されている（不変ルール4）', () => {
    expect(RULES.mastery.fukuei).toEqual({ s: 0.6, a: 0.4, b: 0.1, riskGateRatio: 0.1 })
  })
})

describe('Battle Scoreとの完全分離', () => {
  it('福永Mastery集計値はBattle Score totalに一切影響しない', () => {
    const low = fukueiGame()
    const high: GameState = {
      ...low,
      mastery: { ...low.mastery, minHp: 1, riskCardEffDamage: 999 },
    }
    expect(low.score.total).toBe(high.score.total)
    expect(getFinalScore(low.score)).toBe(getFinalScore(high.score))
  })
})
