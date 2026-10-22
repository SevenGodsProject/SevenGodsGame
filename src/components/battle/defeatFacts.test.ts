import { describe, expect, it } from 'vitest'
import type { GameAction, GameEvent, GameState } from '../../core/types'
import { GOD_IDS } from '../../core/data/gods'
import { ENEMY_IDS } from '../../core/data/enemies'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { DIVINATION_CHOICES } from '../../core/data/divination'
import { RULES } from '../../core/data/rules'
import { applyAction } from '../../core/engine/reducer'
import { deriveDefeatGuardFact, describeDefeatGuardFact } from './defeatFacts'

/**
 * v1.0.3 RC（Lane 6 §7 #1）：敗北画面の事実行「◯◯ N を加護で受けていれば残 HP X」。
 * 前半＝手組みのログで境界（出す／出さない）を固定、後半＝engine を本当に動かし、
 * 「同じ seed で決着 R に加護を使って受け直す」と残 HP が X に一致することを検証する（推測ではなく事実）。
 */

const GUARD_INDEX = DIVINATION_CHOICES.findIndex((c) => c.effects.some((e) => e.kind === 'blockOfIntent'))

type Run = { state: GameState; log: GameEvent[] }
function start(seed: string, enemyId = ENEMY_IDS.ryujin, godId = GOD_IDS.taiyo): Run {
  const r = applyAction(null, { type: 'START_GAME', seed, godId, enemyId, deck: getRecommendedDeck(godId) })
  return { state: r.state, log: [...r.events] }
}
function step(run: Run, action: GameAction): Run {
  const r = applyAction(run.state, action)
  return { state: r.state, log: [...run.log, ...r.events] }
}

/** 手組み：maxHp 30・R1 に 8 被弾・R4 に予告 26 の必殺を盾 2 で受けて 24 通り敗北 */
function lostState(base: GameState, hp: number, maxHp: number): GameState {
  return { ...base, status: 'lost', player: { ...base.player, hp, maxHp } }
}
const handLog: GameEvent[] = [
  { t: 'GAME_STARTED' },
  { t: 'ROUND_STARTED', round: 1, apGranted: 2 },
  { t: 'ENEMY_INTENT_SET', kind: 'attack', amount: 8 },
  { t: 'ENEMY_ACTED', kind: 'attack', amount: 8 },
  { t: 'DAMAGE_DEALT', target: 'self', amount: 8, blocked: 0 },
  { t: 'ROUND_ENDED', round: 1, unusedAp: 2 },
  { t: 'ROUND_STARTED', round: 4, apGranted: 5 },
  { t: 'ENEMY_INTENT_SET', kind: 'special', amount: 26, label: '龍の咆哮' },
  { t: 'ENEMY_ACTED', kind: 'special', amount: 26, label: '龍の咆哮' },
  { t: 'DAMAGE_DEALT', target: 'self', amount: 24, blocked: 2 },
  { t: 'GAME_ENDED', status: 'lost', totalScore: 10 },
]

describe('deriveDefeatGuardFact（手組みログ・境界）', () => {
  const base = start('facts-hand').state

  it('敗北でなければ null', () => {
    expect(deriveDefeatGuardFact(handLog, { ...base, status: 'won' })).toBeNull()
    expect(deriveDefeatGuardFact(handLog, { ...base, status: 'playing' })).toBeNull()
  })

  it('必殺 26（盾 2）を加護 13 で受けていれば残 HP 11：文言は「必殺260…残HP110」', () => {
    const fact = deriveDefeatGuardFact(handLog, lostState(base, 0, 30))
    expect(fact).toEqual({ kindLabel: '必殺', actedAmount: 26, intentAmount: 26, guard: 13, hpAfter: 11 })
    expect(describeDefeatGuardFact(fact)).toBe('必殺260を加護（予告の50%のブロック）で受けていれば残HP110')
  })

  it('加護の量は engine と同じ式 max(guardMin, floor(予告 × guardRatio))', () => {
    const fact = deriveDefeatGuardFact(handLog, lostState(base, 0, 30))
    expect(fact?.guard).toBe(Math.max(RULES.divination.guardMin, Math.floor(26 * RULES.divination.guardRatio)))
  })

  it('その R で既に加護を使っていたら出さない（導きなら出す）', () => {
    const withGuard = [...handLog.slice(0, 8), { t: 'DIVINATION_USED', choiceIndex: GUARD_INDEX, remaining: 2 } as GameEvent, ...handLog.slice(8)]
    expect(deriveDefeatGuardFact(withGuard, lostState(base, 0, 30))).toBeNull()
    const other = DIVINATION_CHOICES.findIndex((_, i) => i !== GUARD_INDEX)
    const withOther = [...handLog.slice(0, 8), { t: 'DIVINATION_USED', choiceIndex: other, remaining: 2 } as GameEvent, ...handLog.slice(8)]
    expect(deriveDefeatGuardFact(withOther, lostState(base, 0, 30))?.hpAfter).toBe(11)
  })

  it('加護だけでは残 HP 0 なら出さない', () => {
    // maxHp 18：R1 の 8 で残 10、加護込みでも 11 通る → 残 0 以下
    expect(deriveDefeatGuardFact(handLog, lostState(base, 0, 18))).toBeNull()
  })

  it('ログが途中から（GAME_STARTED 無し）／HP 復元が終了時と合わない／自傷／溜めなら出さない', () => {
    expect(deriveDefeatGuardFact(handLog.slice(1), lostState(base, 0, 30))).toBeNull()
    expect(deriveDefeatGuardFact(handLog, lostState(base, 3, 30))).toBeNull()
    const selfLog: GameEvent[] = [
      { t: 'GAME_STARTED' },
      { t: 'ROUND_STARTED', round: 2, apGranted: 3 },
      { t: 'ENEMY_INTENT_SET', kind: 'attack', amount: 5 },
      { t: 'CARD_PLAYED', uid: 'u1' as never, defId: 'x' as never, cost: 1 },
      { t: 'DAMAGE_DEALT', target: 'self', amount: 30, blocked: 0 },
      { t: 'GAME_ENDED', status: 'lost', totalScore: 0 },
    ]
    expect(deriveDefeatGuardFact(selfLog, lostState(base, 0, 30))).toBeNull()
    const chargeLog = handLog.map((e) => (e.t === 'ENEMY_ACTED' && e.amount === 26 ? { ...e, kind: 'charge' } : e)) as GameEvent[]
    expect(deriveDefeatGuardFact(chargeLog, lostState(base, 0, 30))).toBeNull()
  })

  it('連撃：盾は順に消費されるので、加護込みの吸収は min(盾, 合計)', () => {
    const multi: GameEvent[] = [
      { t: 'GAME_STARTED' },
      { t: 'ROUND_STARTED', round: 3, apGranted: 4 },
      { t: 'ENEMY_INTENT_SET', kind: 'multiAttack', amount: 24, label: '双牙乱撃' },
      { t: 'ENEMY_ACTED', kind: 'multiAttack', amount: 24, label: '双牙乱撃' },
      { t: 'DAMAGE_DEALT', target: 'self', amount: 4, blocked: 4 },
      { t: 'DAMAGE_DEALT', target: 'self', amount: 8, blocked: 0 },
      { t: 'DAMAGE_DEALT', target: 'self', amount: 8, blocked: 0 },
      { t: 'GAME_ENDED', status: 'lost', totalScore: 0 },
    ]
    // 盾 4＋加護 12 ＝ 16 → 24 のうち 8 が通る → 20 − 8 = 12
    expect(deriveDefeatGuardFact(multi, lostState(base, 0, 20))).toEqual({ kindLabel: '連撃', actedAmount: 24, intentAmount: 24, guard: 12, hpAfter: 12 })
  })

  it('文言は 40 字以内（大きな数でも）', () => {
    const text = describeDefeatGuardFact({ kindLabel: '連撃', actedAmount: 9999, intentAmount: 9999, guard: 4999, hpAfter: 9999 })
    expect([...(text ?? '')].length).toBeLessThanOrEqual(40)
    expect(describeDefeatGuardFact(null)).toBeNull()
  })
})

describe('deriveDefeatGuardFact（engine で検証：同じ seed で決着 R に加護を使うと残 HP が一致する）', () => {
  /** 何も出さずにラウンドを終え続けて敗北した対局（7R 内に敗北しなければ null） */
  function loseByIdling(seed: string, enemyId: (typeof ENEMY_IDS)[keyof typeof ENEMY_IDS]): Run | null {
    let run = start(seed, enemyId)
    for (let i = 0; i < 8 && run.state.status === 'playing'; i++) run = step(run, { type: 'END_ROUND' })
    return run.state.status === 'lost' ? run : null
  }

  it('加護で受け直した replay の残 HP ＝ 事実行の X（複数 seed・敵）', () => {
    let verified = 0
    for (const enemyId of [ENEMY_IDS.ryujin, ENEMY_IDS.onryo, ENEMY_IDS.oni, ENEMY_IDS.juuma]) {
      for (const seed of ['rc-1', 'rc-2', 'rc-3']) {
        const lost = loseByIdling(seed, enemyId)
        if (!lost) continue
        const fact = deriveDefeatGuardFact(lost.log, lost.state)
        if (!fact) continue
        // replay：決着 R の直前まで同じ操作 → 加護 → ラウンド終了
        let run = start(seed, enemyId)
        while (run.state.round < lost.state.round && run.state.status === 'playing') run = step(run, { type: 'END_ROUND' })
        expect(run.state.round).toBe(lost.state.round)
        const blockBefore = run.state.player.block
        run = step(run, { type: 'USE_DIVINATION', choiceIndex: GUARD_INDEX })
        expect(run.state.player.block).toBe(blockBefore + fact.guard)
        run = step(run, { type: 'END_ROUND' })
        expect(run.state.player.hp).toBe(fact.hpAfter)
        expect(run.state.status).not.toBe('lost')
        verified += 1
      }
    }
    expect(verified).toBeGreaterThan(0)
  })
})
