import { describe, expect, it } from 'vitest'
import type { GameEvent } from '../../core/types'
import {
  hpStepsFor,
  planBatch,
  planResultGate,
  planVictory,
  visualHpEndMs,
  visualHpStartMs,
} from './combatTimeline'
import {
  BURST_BANNER_MS,
  BURST_GOD_ATTACK_MS,
  BURST_IMPACT_MS,
  CARD_HIT_GAP_MS,
  CARD_IMPACT_MS,
  ENEMY_LUNGE_PEAK_MS,
  FINAL_HIT_STOP_MS,
  HP_LAG_MS,
  MULTI_CUTIN_LEAD_MS,
  SPECIAL_IMPACT_MS,
} from './enemyVfxTiming'

/**
 * Phase 6-A Combat Juice（決定162）：着弾計画の回帰保証。
 * ここで守るのは「見せ方の順序」だけで、ダメージ・HP・スコアの計算には一切関与しない。
 */

const dmg = (target: 'enemy' | 'self', amount: number, blocked = 0): GameEvent => ({ t: 'DAMAGE_DEALT', target, amount, blocked })
const cardPlayed: GameEvent = { t: 'CARD_PLAYED', uid: 'u1' as never, defId: 'card_common_attack_01' as never, cost: 1 }
const ended = (status: 'won' | 'lost' | 'finished'): GameEvent => ({ t: 'GAME_ENDED', status, totalScore: 0 })

describe('planBatch（着弾の順序）', () => {
  it('通常カード：着弾は commit の直後ではなく神の突きの最前、表示HPはさらにその後', () => {
    const plan = planBatch([cardPlayed, dmg('enemy', 10)])
    expect(plan.steps).toHaveLength(1)
    const [step] = plan.steps
    expect(step.role).toBe('card')
    expect(step.atMs).toBe(CARD_IMPACT_MS)
    // 表示HPが着弾より先に動かないこと（本Phaseの中心的な保証）
    expect(visualHpStartMs(step)).toBeGreaterThan(step.atMs)
    expect(visualHpStartMs(step)).toBe(step.atMs + step.stopMs + HP_LAG_MS)
    expect(visualHpEndMs(step)).toBeGreaterThan(visualHpStartMs(step))
  })

  it('すべての着弾で「表示HPの開始 > 着弾」が成り立つ（通常・連撃・必殺・神の一撃・撃破）', () => {
    const batches: GameEvent[][] = [
      [cardPlayed, dmg('enemy', 10)],
      [cardPlayed, dmg('enemy', 25), { t: 'RESONANCE_BURST', total: 7 }, dmg('enemy', 36)],
      [{ t: 'ENEMY_ACTED', kind: 'attack', amount: 9 }, dmg('self', 9)],
      [{ t: 'ENEMY_ACTED', kind: 'multiAttack', amount: 12 }, dmg('self', 5), dmg('self', 4), dmg('self', 3)],
      [{ t: 'ENEMY_ACTED', kind: 'special', amount: 24, label: '主砲・神滅甲' }, dmg('self', 24)],
      [cardPlayed, dmg('enemy', 5), ended('won')],
    ]
    for (const events of batches) {
      for (const step of planBatch(events).steps) {
        expect(visualHpStartMs(step), JSON.stringify(step)).toBeGreaterThan(step.atMs)
      }
    }
  })

  it('100 と 300（内部10と30）で演出段階・hit stop・見せ方が明確に違う', () => {
    const small = planBatch([cardPlayed, dmg('enemy', 10)]).steps[0]
    const big = planBatch([cardPlayed, dmg('enemy', 30)]).steps[0]
    expect(small.tier).toBe(2)
    expect(big.tier).toBe(4)
    expect(big.stopMs).toBeGreaterThan(small.stopMs)
    // 段階が違えば CSS のリアクション・数字サイズのクラスも変わる（react-l2 / react-l4）
    expect(planBatch([cardPlayed, dmg('enemy', 10)]).enemyReactions[0].tier).toBe(2)
    expect(planBatch([cardPlayed, dmg('enemy', 30)]).enemyReactions[0].tier).toBe(4)
  })

  it('最後の一撃は、カードの強さに関わらず必ず L4＋最長の hit stop', () => {
    const plan = planBatch([cardPlayed, dmg('enemy', 3), ended('won')])
    const final = plan.finalStep!
    expect(final.final).toBe(true)
    expect(final.tier).toBe(4) // 内部3は本来 L1
    expect(final.stopMs).toBe(FINAL_HIT_STOP_MS)
    expect(plan.enemyReactions[0].final).toBe(true)
    expect(plan.enemyReactions[0].tier).toBe(4)
  })

  it('連続ダメージ（1枚で複数回）は重ならずテンポを刻む', () => {
    const plan = planBatch([cardPlayed, dmg('enemy', 4), dmg('enemy', 4), dmg('enemy', 4)])
    expect(plan.steps.map((s) => s.atMs)).toEqual([CARD_IMPACT_MS, CARD_IMPACT_MS + CARD_HIT_GAP_MS, CARD_IMPACT_MS + 2 * CARD_HIT_GAP_MS])
  })

  it('カード本体＋条件⚡：本体の後に⚡の追加着弾（同フレームにしない）', () => {
    const plan = planBatch([
      cardPlayed,
      dmg('enemy', 14),
      dmg('self', 2),
      { t: 'BONUS_TRIGGERED', defId: 'card_taiyo_attack_01' as never, when: 'charged' },
      dmg('enemy', 4),
    ])
    const body = plan.steps.find((s) => s.role === 'card')!
    const bonus = plan.steps.find((s) => s.role === 'bonus')!
    const selfCost = plan.steps.find((s) => s.role === 'selfCost')!
    expect(bonus.atMs).toBeGreaterThan(body.atMs)
    expect(selfCost.atMs).toBe(body.atMs)
    // ⚡は本体より控えめな反応（2つ目のリアクション）
    expect(plan.enemyReactions).toHaveLength(2)
    expect(plan.enemyReactions[1].minor).toBe(true)
  })

  it('神の一撃（同じバッチにカード本体と BURST）：本体は即時、神の一撃はカットインの後', () => {
    const plan = planBatch([
      cardPlayed,
      dmg('enemy', 4),
      { t: 'RESONANCE_GAINED', amount: 1, total: 7 },
      { t: 'RESONANCE_BURST', total: 7 },
      dmg('enemy', 36),
    ])
    const [card, burst] = plan.steps
    expect(card.atMs).toBe(CARD_IMPACT_MS)
    expect(burst.role).toBe('burst')
    expect(burst.atMs).toBe(BURST_IMPACT_MS)
    expect(burst.atMs).toBeGreaterThan(BURST_GOD_ATTACK_MS) // 「✨神の一撃！」より後に着弾する
    // 数値の結果（トースト・ミニ結果）は神の一撃の着弾まで隠す
    expect(plan.revealMs).toBe(BURST_IMPACT_MS)
    expect(plan.burst).toBe(true)
  })

  it('敵→自分：通常攻撃は突進の最前、連撃・必殺は既存のタイムラインのまま', () => {
    const normal = planBatch([{ t: 'ENEMY_ACTED', kind: 'attack', amount: 9 }, dmg('self', 9)])
    expect(normal.selfImpactMs).toBe(ENEMY_LUNGE_PEAK_MS.normal)
    expect(planBatch([{ t: 'ENEMY_ACTED', kind: 'attack', amount: 9 }, dmg('self', 9)], { enemyVisualType: 'fast' }).selfImpactMs).toBe(ENEMY_LUNGE_PEAK_MS.fast)
    expect(planBatch([{ t: 'ENEMY_ACTED', kind: 'attack', amount: 9 }, dmg('self', 9)], { enemyVisualType: 'heavy' }).selfImpactMs).toBe(ENEMY_LUNGE_PEAK_MS.heavy)

    const special = planBatch([{ t: 'ENEMY_ACTED', kind: 'special', amount: 24, label: '主砲・神滅甲' }, dmg('self', 24)])
    expect(special.selfImpactMs).toBe(SPECIAL_IMPACT_MS)

    const multi = planBatch([{ t: 'ENEMY_ACTED', kind: 'multiAttack', amount: 12, label: '双牙乱撃' }, dmg('self', 4), dmg('self', 4), dmg('self', 4)])
    expect(multi.steps.map((s) => s.atMs)).toEqual([MULTI_CUTIN_LEAD_MS, MULTI_CUTIN_LEAD_MS + 180, MULTI_CUTIN_LEAD_MS + 500])
  })

  it('ラウンド終了時の反撃（蒼毘の得意技）は、敵の着弾を受けたあとに返す', () => {
    const plan = planBatch([
      { t: 'ENEMY_ACTED', kind: 'attack', amount: 9 },
      dmg('self', 0, 9),
      { t: 'PASSIVE_TRIGGERED', passiveId: 'sobi_counter' as never, amount: 3 },
      dmg('enemy', 3),
      ended('won'),
    ])
    const counter = plan.steps.find((s) => s.target === 'enemy')!
    expect(counter.role).toBe('passive')
    expect(counter.atMs).toBeGreaterThan(ENEMY_LUNGE_PEAK_MS.normal)
    // カード以外での撃破でも「最後の一撃」として同じ撃破演出を通す
    expect(counter.final).toBe(true)
    expect(counter.tier).toBe(4)
  })

  it('prefers-reduced-motion では hit stop を 0 にする（数字・HP変化は残す）', () => {
    const plan = planBatch([cardPlayed, dmg('enemy', 30), ended('won')], { reduced: true })
    expect(plan.steps.every((s) => s.stopMs === 0)).toBe(true)
    expect(plan.steps[0].amount).toBe(30)
    expect(plan.finalStep?.tier).toBe(4)
  })

  it('hpStepsFor は「表示HPが動く時刻」を返す（着弾そのものではない）', () => {
    const plan = planBatch([cardPlayed, dmg('enemy', 30)])
    expect(hpStepsFor(plan, 'enemy')).toEqual([{ amount: 30, atMs: visualHpStartMs(plan.steps[0]) }])
    expect(hpStepsFor(plan, 'self')).toEqual([])
  })
})

describe('planVictory（撃破 → 勝利 → 報酬の順序）', () => {
  it('最後の一撃 → 崩壊 → 「撃破」 → 報酬 の順に並び、追加は約1.5秒以内', () => {
    const plan = planBatch([cardPlayed, dmg('enemy', 12), ended('won')])
    const tl = planVictory(plan.finalStep)
    expect(tl.finalImpactMs).toBe(CARD_IMPACT_MS)
    expect(tl.collapseStartMs).toBeGreaterThan(tl.finalImpactMs)
    expect(tl.collapseEndMs).toBeGreaterThan(tl.collapseStartMs)
    expect(tl.beatStartMs).toBeGreaterThan(tl.collapseStartMs)
    expect(tl.rewardMs).toBeGreaterThan(tl.beatStartMs)
    // 表示HPが 0 へ動き始めるのは崩壊より前（減ってから崩れる）
    expect(visualHpStartMs(plan.finalStep!)).toBeLessThanOrEqual(tl.collapseStartMs)
    expect(tl.rewardMs - tl.finalImpactMs).toBeLessThanOrEqual(1500)
  })

  it('神の一撃で撃破したときも、報酬は神の一撃の演出（バナー・着弾）より後', () => {
    const plan = planBatch([cardPlayed, { t: 'RESONANCE_BURST', total: 7 }, dmg('enemy', 36), ended('won')])
    const tl = planVictory(plan.finalStep)
    expect(tl.finalImpactMs).toBe(BURST_IMPACT_MS)
    expect(tl.rewardMs).toBeGreaterThan(BURST_IMPACT_MS)
    expect(tl.rewardMs).toBeGreaterThan(BURST_GOD_ATTACK_MS + BURST_BANNER_MS) // バナーの終わりより後
    expect(tl.rewardMs - tl.finalImpactMs).toBeLessThanOrEqual(1500)
  })

  it('reduced-motion では短くなるが、順序は同じ', () => {
    const plan = planBatch([cardPlayed, dmg('enemy', 12), ended('won')], { reduced: true })
    const normal = planVictory(plan.finalStep)
    const reduced = planVictory(plan.finalStep, true)
    expect(reduced.rewardMs).toBeLessThan(normal.rewardMs)
    expect(reduced.collapseStartMs).toBeLessThan(reduced.beatStartMs)
    expect(reduced.beatStartMs).toBeLessThan(reduced.rewardMs)
  })

  it('敗北・未撃破の結果画面は、最後の着弾と表示HPの変化を見せてから', () => {
    const plan = planBatch([{ t: 'ENEMY_ACTED', kind: 'attack', amount: 20 }, dmg('self', 20), ended('lost')])
    const gate = planResultGate(plan)
    expect(gate).toBeGreaterThan(plan.finalStep!.atMs)
    expect(gate).toBeGreaterThanOrEqual(visualHpEndMs(plan.finalStep!))
    expect(gate).toBeLessThan(plan.finalStep!.atMs + 1500)
  })
})

describe('安全弁（animationend を取りこぼしても止まらない）', () => {
  it('カットインは animationend が来なくても時刻で完了する（fallback > 演出時間）', async () => {
    const { CUTIN_FALLBACK_MS } = await import('./BattleResonanceCutin')
    const { RESONANCE_CUTIN_MS, ENEMY_CUTIN_TOTAL_MS } = await import('./enemyVfxTiming')
    expect(CUTIN_FALLBACK_MS).toBeGreaterThan(0)
    expect(RESONANCE_CUTIN_MS + CUTIN_FALLBACK_MS).toBeGreaterThan(RESONANCE_CUTIN_MS)
    expect(ENEMY_CUTIN_TOTAL_MS + CUTIN_FALLBACK_MS).toBeGreaterThan(ENEMY_CUTIN_TOTAL_MS)
  })

  it('撃破・結果の進行にも上限（安全弁）がある', async () => {
    const { PRESENTATION_SAFETY_MS } = await import('./useCombatPresentation')
    expect(PRESENTATION_SAFETY_MS).toBeGreaterThan(0)
  })
})

describe('決定224：条件⚡の hit stop（PAYOFF は通常ヒットより上・L4／神の一撃より下）', () => {
  const bonusBatch: GameEvent[] = [
    cardPlayed,
    dmg('enemy', 17),
    dmg('self', 2),
    { t: 'BONUS_TRIGGERED', defId: 'card_taiyo_attack_01' as never, when: 'charged' },
    dmg('enemy', 4),
  ]

  it('⚡の着弾は 50ms 止まる（本体が L3＝45ms でもそれより上）。反応は minor のまま＝揺れは格上げしない', async () => {
    const { BONUS_HIT_STOP_MS, HIT_STOP_MS: stops, BURST_HIT_STOP_MS: burstStop } = await import('./enemyVfxTiming')
    const plan = planBatch(bonusBatch)
    const body = plan.steps.find((s) => s.role === 'card')!
    const bonus = plan.steps.find((s) => s.role === 'bonus')!
    expect(body.tier).toBe(3)
    expect(bonus.stopMs).toBe(BONUS_HIT_STOP_MS)
    expect(BONUS_HIT_STOP_MS).toBeGreaterThan(stops[3])
    expect(BONUS_HIT_STOP_MS).toBeLessThan(stops[4])
    expect(BONUS_HIT_STOP_MS).toBeLessThan(burstStop)
    expect(plan.enemyReactions[1]).toMatchObject({ minor: true, tier: 1, stopMs: BONUS_HIT_STOP_MS })
    // 着弾時刻は変えない（本体 +150ms）
    expect(bonus.atMs).toBe(body.atMs + 150)
  })

  it('reduced-motion では⚡の hit stop も 0', () => {
    const plan = planBatch(bonusBatch, { reduced: true })
    expect(plan.steps.find((s) => s.role === 'bonus')!.stopMs).toBe(0)
  })
})
