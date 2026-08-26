import { describe, expect, it } from 'vitest'
import { GOD_IDS } from '../data/gods'
import type { GameState } from '../types'
import { applyAction } from './reducer'
import { applyDamage } from './effects'
import { getFinalScore } from './score'
import { getMastery, getTaiyoMasteryRaw } from './mastery'
import { startTestGame } from './testUtils'

/**
 * 大耀Mastery「爆発」（決定110プロトタイプ）の仕様検証。
 * raw = 1ラウンド最大実効ダメージ ÷ 敵最大HP。
 * グレード閾値（S≥0.58 / A≥0.45 / B≥0.37）はRULES.mastery.taiyoの
 * プロトタイプ値であり、正式採用値ではない。
 */

/** godIdを大耀に差し替え、敵maxHpとbestRoundDamageを指定した状態を作る */
function taiyoState(bestRoundDamage: number, enemyMaxHp = 100): GameState {
  const base = startTestGame()
  return {
    ...base,
    godId: GOD_IDS.taiyo,
    enemy: { ...base.enemy, maxHp: enemyMaxHp, hp: enemyMaxHp },
    mastery: { roundDamage: 0, bestRoundDamage },
  }
}

describe('getTaiyoMasteryRaw', () => {
  it('raw = bestRoundDamage ÷ enemy.maxHp', () => {
    expect(getTaiyoMasteryRaw(taiyoState(52, 100))).toBeCloseTo(0.52)
  })
})

describe('getMastery（グレード判定）', () => {
  it('大耀以外の神ではnull（横展開はまだ行わない）', () => {
    expect(getMastery(startTestGame())).toBeNull()
  })

  it('36% → C（B境界0.37未満）', () => {
    expect(getMastery(taiyoState(36))?.grade).toBe('C')
  })

  it('37% → B（B境界ちょうど）', () => {
    expect(getMastery(taiyoState(37))?.grade).toBe('B')
  })

  it('45% → A（A境界ちょうど）', () => {
    expect(getMastery(taiyoState(45))?.grade).toBe('A')
  })

  it('57% → A（S境界未満）', () => {
    expect(getMastery(taiyoState(57))?.grade).toBe('A')
  })

  it('58% → S（S境界ちょうど）', () => {
    expect(getMastery(taiyoState(58))?.grade).toBe('S')
  })

  it('神技名は「爆発」', () => {
    expect(getMastery(taiyoState(50))?.title).toBe('爆発')
  })
})

describe('Mastery集計とBattle Scoreの完全分離', () => {
  it('bestRoundDamageの値はBattle Score totalに一切影響しない', () => {
    const low = taiyoState(0)
    const high = taiyoState(100)
    expect(low.score.total).toBe(high.score.total)
    expect(getFinalScore(low.score)).toBe(getFinalScore(high.score))
  })

  it('ラウンドを跨ぐとroundDamageはリセットされ、bestRoundDamageは維持される', () => {
    const base = startTestGame()
    // R1で20ダメージ
    const afterHit = applyDamage(base, 'enemy', 20).state
    expect(afterHit.mastery.roundDamage).toBe(20)
    expect(afterHit.mastery.bestRoundDamage).toBe(20)

    // ラウンド終了→R2開始でroundDamageのみリセット
    const afterRound = applyAction(afterHit, { type: 'END_ROUND' }).state
    expect(afterRound.round).toBe(2)
    expect(afterRound.mastery.roundDamage).toBe(0)
    expect(afterRound.mastery.bestRoundDamage).toBe(20)

    // R2で5ダメージしても、ベストは20のまま
    const afterSecondHit = applyDamage(afterRound, 'enemy', 5).state
    expect(afterSecondHit.mastery.roundDamage).toBe(5)
    expect(afterSecondHit.mastery.bestRoundDamage).toBe(20)
  })

  it('撃破ラウンドのダメージもbestRoundDamageに数えられる（overkillは除外）', () => {
    const base = startTestGame()
    const staged: GameState = { ...base, enemy: { ...base.enemy, hp: 30 } }
    const won = applyDamage(staged, 'enemy', 50).state
    expect(won.status).toBe('won')
    // 実効30のみ（overkill 20は数えない）
    expect(won.mastery.bestRoundDamage).toBe(30)
  })
})
