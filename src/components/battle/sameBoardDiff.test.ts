import { describe, expect, it } from 'vitest'
import type { CardDefId, GameAction, GameState } from '../../core/types'
import { GOD_IDS } from '../../core/data/gods'
import { ENEMY_IDS } from '../../core/data/enemies'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { applyAction } from '../../core/engine/reducer'
import { describeSameBoardDiff, nextSameBoardMemo, sameBoardKey, type SameBoardMemo } from './retrySemantics'

/**
 * v1.0.5 Stage B（同じ盤面 Retry の前回比）：engine（reducer）を本当に動かして、
 * 「同じ盤面と確かめられたときだけ・事実だけ」を出すことを固定する。
 */
type StartOpts = { seed?: string; deck?: CardDefId[]; enemyId?: GameState['enemy']['defId']; difficulty?: GameState['difficulty'] }

function start({ seed = 'stage-b-1', deck = getRecommendedDeck(GOD_IDS.taiyo), enemyId = ENEMY_IDS.oni, difficulty = 'normal' }: StartOpts = {}): GameState {
  return applyAction(null, { type: 'START_GAME', seed, godId: GOD_IDS.taiyo, enemyId, deck, difficulty }).state
}
function step(state: GameState, action: GameAction): GameState {
  return applyAction(state, action).state
}
/** カードを出さず「ラウンドを終える」だけ＝大耀 × 鬼将は R4 断岩で敗北（scripts/v1_0_3-rc/defeat-check.mjs と同じ経路） */
function loseByEndingRounds(state: GameState): GameState {
  let s = state
  for (let i = 0; i < 8 && s.status === 'playing'; i++) s = step(s, { type: 'END_ROUND' })
  return s
}
/** 最初のラウンドだけ手札を出し切ってから終える（敵 HP を前回より削る） */
function loseAfterPlayingRoundOne(state: GameState): GameState {
  // 出せない札（神力不足など）は reducer が例外にするので、出せた札だけ進める
  const tryPlay = (s: GameState): GameState | null => {
    // 攻撃札を先に出す（神力を補助札で使い切って敵 HP が動かない、を避ける）
    const ordered = [...s.hand].sort((a, b) => Number(b.defId.includes('attack')) - Number(a.defId.includes('attack')))
    for (const c of ordered) {
      try {
        return applyAction(s, { type: 'PLAY_CARD', uid: c.uid }).state
      } catch {
        // 次の札を試す
      }
    }
    return null
  }
  let s = state
  for (let i = 0; i < 8 && s.status === 'playing'; i++) {
    const next = tryPlay(s)
    if (!next) break
    s = next
  }
  return loseByEndingRounds(s)
}

describe('sameBoardKey（比較してよい条件）', () => {
  it('同じ START_GAME から始めた対局は、決着の仕方が違っても同じ鍵になる', () => {
    const a = loseByEndingRounds(start())
    const b = loseAfterPlayingRoundOne(start())
    expect(a.status).toBe('lost')
    expect(b.status).not.toBe('playing')
    expect(sameBoardKey(b)).toBe(sameBoardKey(a))
  })

  it('seed・敵・難易度のどれかが違えば別の盤面', () => {
    const base = sameBoardKey(loseByEndingRounds(start()))
    expect(sameBoardKey(loseByEndingRounds(start({ seed: 'stage-b-2' })))).not.toBe(base)
    expect(sameBoardKey(loseByEndingRounds(start({ enemyId: ENEMY_IDS.ryujin })))).not.toBe(base)
    expect(sameBoardKey(loseByEndingRounds(start({ difficulty: 'hard' })))).not.toBe(base)
  })

  it('デッキは構成が同じでも並びが違えば別の盤面（シャッフルは入力の並びに対して行う）', () => {
    const deck = getRecommendedDeck(GOD_IDS.taiyo)
    const swapped = [...deck]
    const j = swapped.findIndex((d) => d !== swapped[0])
    ;[swapped[0], swapped[j]] = [swapped[j], swapped[0]]
    const a = start({ deck })
    const b = start({ deck: swapped })
    expect(sameBoardKey(b)).not.toBe(sameBoardKey(a))
  })
})

describe('nextSameBoardMemo／describeSameBoardDiff（前回比の 1 行）', () => {
  it('敗北 → 同じ盤面で敗北：前回と今回の到達ラウンドと敵 HP（事実だけ）', () => {
    const first = loseByEndingRounds(start())
    const memo = nextSameBoardMemo(first, null)
    expect(memo).toMatchObject({ count: 1, status: 'lost', round: first.round, enemyHpPct: 100 })
    const second = loseAfterPlayingRoundOne(start())
    const line = describeSameBoardDiff(memo, second)!
    const pct = Math.ceil((second.enemy.hp / second.enemy.maxHp) * 100)
    expect(line).toBe(`同じ盤面 2 回目：前回 R${first.round}で敗北・敵HP 100% → 今回 R${second.round}で敗北・敵HP ${pct}%`)
    expect(pct).toBeLessThan(100)
  })

  it('3 回目は count が進む／別の盤面を挟むと 1 から数え直す', () => {
    const m1 = nextSameBoardMemo(loseByEndingRounds(start()), null)
    const m2 = nextSameBoardMemo(loseByEndingRounds(start()), m1)
    expect(m2?.count).toBe(2)
    expect(describeSameBoardDiff(m2, loseByEndingRounds(start()))).toMatch(/^同じ盤面 3 回目：/)
    const other = nextSameBoardMemo(loseByEndingRounds(start({ seed: 'stage-b-2' })), m2)
    expect(other?.count).toBe(1)
  })

  it('別の盤面（例：再開でデッキが変わった）では何も出さない＝誤解を招く数値を出さない', () => {
    const memo = nextSameBoardMemo(loseByEndingRounds(start()), null)
    expect(describeSameBoardDiff(memo, loseByEndingRounds(start({ seed: 'stage-b-2' })))).toBeNull()
    expect(describeSameBoardDiff(memo, loseByEndingRounds(start({ difficulty: 'hard' })))).toBeNull()
  })

  it('memo が無い・進行中・神域挑戦では出さない', () => {
    const memo = nextSameBoardMemo(loseByEndingRounds(start()), null)
    const lost = loseByEndingRounds(start())
    expect(describeSameBoardDiff(null, lost)).toBeNull()
    expect(describeSameBoardDiff(memo, start())).toBeNull()
    expect(describeSameBoardDiff(memo, { ...lost, mode: 'daily' })).toBeNull()
  })

  it('勝利の決着・神域挑戦からは memo を作らない（勝てば新しい盤面＝決定196）', () => {
    const lost = loseByEndingRounds(start())
    expect(nextSameBoardMemo({ ...lost, status: 'won' }, null)).toBeNull()
    expect(nextSameBoardMemo({ ...lost, mode: 'daily' }, null)).toBeNull()
  })

  it('勝利は「R{n}で撃破」、7R 未撃破は「7R 終了」と書く（敵 HP は切り上げ＝残っているのに 0% と出さない）', () => {
    const lost = loseByEndingRounds(start())
    const memo: SameBoardMemo = { key: sameBoardKey(lost), count: 1, status: 'finished', round: 7, enemyHpPct: 1 }
    expect(describeSameBoardDiff(memo, { ...lost, status: 'won', round: 6, enemy: { ...lost.enemy, hp: 0 } })).toBe(
      '同じ盤面 2 回目：前回 7R 終了・敵HP 1% → 今回 R6で撃破',
    )
    const nearly = { ...lost, status: 'finished' as const, round: 7, enemy: { ...lost.enemy, hp: 1 } }
    expect(describeSameBoardDiff(memo, nearly)).toMatch(/今回 7R 終了・敵HP 2%$/)
  })

  it('正解・推奨・評価の語を含まない（決定263）', () => {
    const memo = nextSameBoardMemo(loseByEndingRounds(start()), null)
    const line = describeSameBoardDiff(memo, loseAfterPlayingRoundOne(start()))!
    expect(line).not.toMatch(/正解|推奨|失敗|改善|悪化|上手|下手/)
  })
})
