/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import type { GameEvent } from '../../core/types'
import { planBatch, planResultGate, visualHpEndMs, type BatchPlan } from './combatTimeline'
import {
  ARENA_SHAKE_MS,
  ARENA_SHAKE_PX,
  ENEMY_LUNGE_PEAK_MS,
  FINAL_HIT_STOP_MS,
  HP_GHOST_DRAIN_MS,
  HP_GHOST_HOLD_MS,
  HP_LAG_MS,
  MULTI_CUTIN_LEAD_MS,
  RESULT_GATE_AFTER_HP_MS,
  SELF_SHAKE_FINAL_PX,
  SELF_SHAKE_MS,
  SELF_SHAKE_SPECIAL_PX,
  SPECIAL_IMPACT_MS,
} from './enemyVfxTiming'

/**
 * v1.0.5（Combat Premium v3 TOP2）：敵攻撃の重量感＝敵の必殺と敗北の決着被弾で戦闘エリアを揺らす。
 * 守るのは「どの着弾で揺れるか」と「揺れ終わり < 結果ゲート（v1.0.3 RETURN TO CALM）」だけで、
 * 着弾・hit stop・表示HP・結果ゲートの時刻は変えない。
 */

const dmg = (target: 'enemy' | 'self', amount: number, blocked = 0): GameEvent => ({ t: 'DAMAGE_DEALT', target, amount, blocked })
const cardPlayed: GameEvent = { t: 'CARD_PLAYED', uid: 'u1' as never, defId: 'card_common_attack_01' as never, cost: 1 }
const ended = (status: 'won' | 'lost' | 'finished'): GameEvent => ({ t: 'GAME_ENDED', status, totalScore: 0 })
const attack = (amount: number): GameEvent => ({ t: 'ENEMY_ACTED', kind: 'attack', amount })
const special = (amount: number): GameEvent => ({ t: 'ENEMY_ACTED', kind: 'special', amount, label: '主砲・神滅甲' })
const multi = (amount: number, label?: string): GameEvent => ({ t: 'ENEMY_ACTED', kind: 'multiAttack', amount, ...(label ? { label } : {}) })

const shakeEnd = (p: BatchPlan) => p.selfShake!.atMs + p.selfShake!.stopMs + p.selfShake!.durMs

describe('v1.0.5 敵攻撃の重量感：揺れる着弾', () => {
  it('1. 敵の必殺（special）：自分側の着弾＋hit stop で 3px／240ms（1260＋40＝1300 開始）', () => {
    const plan = planBatch([special(24), dmg('self', 24)])
    expect(plan.selfShake).toEqual({ atMs: SPECIAL_IMPACT_MS, stopMs: 40, amp: SELF_SHAKE_SPECIAL_PX, durMs: SELF_SHAKE_MS.special })
    expect(plan.selfShake!.atMs + plan.selfShake!.stopMs).toBe(1300)
  })

  it('2. 技名付き連撃：最後の 1 発（1100＋500＝1600）で 1 回だけ', () => {
    const plan = planBatch([multi(12, '双牙乱撃'), dmg('self', 4), dmg('self', 4), dmg('self', 4)])
    expect(plan.selfShake).toMatchObject({ atMs: MULTI_CUTIN_LEAD_MS + 500, amp: SELF_SHAKE_SPECIAL_PX })
    expect(plan.selfShake!.atMs).toBe(1600)
  })

  it('3. 必殺をブロックで受け切っても揺れる（重い一撃が来た事実は同じ・カットインも出る）', () => {
    const plan = planBatch([special(24), dmg('self', 0, 24)])
    expect(plan.selfShake).toMatchObject({ atMs: SPECIAL_IMPACT_MS, amp: SELF_SHAKE_SPECIAL_PX })
  })

  it('4. 敗北の決着被弾：通常攻撃でも 4px／280ms（hit stop は決着の 90）', () => {
    for (const visualType of ['normal', 'fast', 'heavy'] as const) {
      const plan = planBatch([attack(20), dmg('self', 20), ended('lost')], { enemyVisualType: visualType })
      expect(plan.selfShake).toEqual({ atMs: ENEMY_LUNGE_PEAK_MS[visualType], stopMs: FINAL_HIT_STOP_MS, amp: SELF_SHAKE_FINAL_PX, durMs: SELF_SHAKE_MS.final })
    }
  })

  it('5. 必殺で敗北：同じ着弾なので決着の 1 本（4px）に統合', () => {
    const plan = planBatch([special(26), dmg('self', 26), ended('lost')])
    expect(plan.selfShake).toMatchObject({ atMs: SPECIAL_IMPACT_MS, stopMs: FINAL_HIT_STOP_MS, amp: SELF_SHAKE_FINAL_PX })
    const multiLost = planBatch([multi(12, '双牙乱撃'), dmg('self', 4), dmg('self', 4), dmg('self', 4), ended('lost')])
    expect(multiLost.selfShake).toMatchObject({ atMs: 1600, amp: SELF_SHAKE_FINAL_PX })
  })
})

describe('v1.0.5 敵攻撃の重量感：揺れない着弾', () => {
  it('6. 通常攻撃・技名なし連撃・自傷・カードでは揺れない（null）', () => {
    expect(planBatch([attack(9), dmg('self', 9)]).selfShake).toBeNull()
    expect(planBatch([multi(12), dmg('self', 4), dmg('self', 4), dmg('self', 4)]).selfShake).toBeNull()
    expect(planBatch([cardPlayed, dmg('enemy', 10), dmg('self', 3)]).selfShake).toBeNull()
    expect(planBatch([cardPlayed, dmg('enemy', 10)]).selfShake).toBeNull()
    // 自傷で敗北しても「敵の攻撃」ではないので揺らさない
    expect(planBatch([cardPlayed, dmg('enemy', 3), dmg('self', 5), ended('lost')]).selfShake).toBeNull()
    // 7 ラウンド終了（未撃破）の通常攻撃も揺れない
    expect(planBatch([attack(9), dmg('self', 9), ended('finished')]).selfShake).toBeNull()
  })

  it('7. 同バッチに敵側の大きな揺れ（反撃での撃破など）があれば敵側を優先して null', () => {
    const plan = planBatch([special(24), dmg('self', 0, 24), { t: 'PASSIVE_TRIGGERED', passiveId: 'sobi_counter' as never, amount: 3 }, dmg('enemy', 3), ended('won')])
    expect(plan.enemyReactions.some((r) => r.final)).toBe(true)
    expect(plan.selfShake).toBeNull()
  })

  it('8. reduced-motion でも値は出る（hit stop 0）。再生側（useCombatPresentation）の !reduced ガードで揺らさない', async () => {
    const plan = planBatch([special(24), dmg('self', 24)], { reduced: true })
    expect(plan.selfShake).toMatchObject({ atMs: SPECIAL_IMPACT_MS, stopMs: 0 })
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const src = readFileSync(fileURLToPath(new URL('./useCombatPresentation.ts', import.meta.url)), 'utf8')
    expect(src).toMatch(/: next\.selfShake/)
    expect(src).toMatch(/if \(shake && arena && !reduced && typeof arena\.animate === 'function'\)/)
  })
})

describe('v1.0.5 敵攻撃の重量感：階層と結果ゲート（RETURN TO CALM 不変）', () => {
  it('9. 振幅・長さは常に神の一撃・撃破（5px／320ms）より小さい。敵側 L4・撃破の値は従来どおり', () => {
    expect(ARENA_SHAKE_PX).toEqual({ tier4: 3, big: 5 })
    expect(ARENA_SHAKE_MS).toEqual({ tier4: 240, big: 320 })
    expect(SELF_SHAKE_SPECIAL_PX).toBeLessThanOrEqual(SELF_SHAKE_FINAL_PX)
    expect(SELF_SHAKE_FINAL_PX).toBeLessThan(ARENA_SHAKE_PX.big)
    expect(SELF_SHAKE_MS.special).toBeLessThanOrEqual(SELF_SHAKE_MS.final)
    expect(SELF_SHAKE_MS.final).toBeLessThan(ARENA_SHAKE_MS.big)
  })

  it('10. 敗北経路 3 種（通常・必殺・技名付き連撃）で、揺れ終わり < 結果ゲート', () => {
    const lostBatches: GameEvent[][] = [
      [attack(20), dmg('self', 20), ended('lost')],
      [special(26), dmg('self', 26), ended('lost')],
      [multi(12, '双牙乱撃'), dmg('self', 4), dmg('self', 4), dmg('self', 4), ended('lost')],
    ]
    for (const visualType of ['normal', 'fast', 'heavy'] as const) {
      for (const events of lostBatches) {
        const plan = planBatch(events, { enemyVisualType: visualType })
        expect(shakeEnd(plan), JSON.stringify(plan.selfShake)).toBeLessThan(planResultGate(plan))
      }
    }
  })

  it('11. planResultGate の値は v1.0.3 と同一（表示HP終了＋200。通常 998・必殺 2100・連撃 2440）', () => {
    expect(RESULT_GATE_AFTER_HP_MS).toBe(200)
    const tail = FINAL_HIT_STOP_MS + HP_LAG_MS + HP_GHOST_HOLD_MS + HP_GHOST_DRAIN_MS + RESULT_GATE_AFTER_HP_MS
    const normal = planBatch([attack(20), dmg('self', 20), ended('lost')])
    const sp = planBatch([special(26), dmg('self', 26), ended('lost')])
    const mh = planBatch([multi(12, '双牙乱撃'), dmg('self', 4), dmg('self', 4), dmg('self', 4), ended('lost')])
    expect(planResultGate(normal)).toBe(ENEMY_LUNGE_PEAK_MS.normal + tail)
    expect(planResultGate(normal)).toBe(998)
    expect(planResultGate(sp)).toBe(2100)
    expect(planResultGate(mh)).toBe(2440)
    for (const p of [normal, sp, mh]) expect(planResultGate(p)).toBe(visualHpEndMs(p.finalStep!) + RESULT_GATE_AFTER_HP_MS)
    // 未撃破（finished）の必殺も、ゲートは表示HP終了＋200 のまま・揺れはその前に終わる
    const fin = planBatch([special(24), dmg('self', 24), ended('finished')])
    expect(shakeEnd(fin)).toBeLessThan(planResultGate(fin))
  })
})
