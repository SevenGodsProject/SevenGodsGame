import { describe, expect, it } from 'vitest'
import { RULES } from '../../core/data/rules'
import type { GameEvent } from '../../core/types'
import { planBatch, type ImpactStep } from './combatTimeline'
import { CARD_IMPACT_MS, ENEMY_LUNGE_PEAK_MS, MULTI_CUTIN_LEAD_MS, MULTI_HIT_OFFSETS_MS, SPECIAL_IMPACT_MS } from './enemyVfxTiming'
import { SOUND_LAYER, VOICE_LAYER } from './feelTier'
import { crisisThresholdHp, planCrisisVoice } from './crisisVoice'

/**
 * Official Voice Crisis Pilot v1：「ピンチ」の声のトリガ（純関数）。
 * 閾値は条件⚡と同じ `RULES.cardBonus.lowHpRatio`・時刻は最後の自分への着弾 ＋ 300ms・1 戦 1 回・決着バッチは除外。
 */
const dmg = (target: 'enemy' | 'self', amount: number, blocked = 0): GameEvent => ({ t: 'DAMAGE_DEALT', target, amount, blocked })
const AFTER = VOICE_LAYER.afterImpactMs.crisis

const selfStep = (atMs: number, amount = 5, role: ImpactStep['role'] = 'enemy'): ImpactStep => ({ target: 'self', amount, blocked: 0, atMs, stopMs: 0, tier: 2, role, final: false })
const enemyStep = (atMs: number, amount = 5): ImpactStep => ({ target: 'enemy', amount, blocked: 0, atMs, stopMs: 0, tier: 2, role: 'card', final: false })

describe('閾値（新しい数値を作らない）', () => {
  it('floor(maxHp × RULES.cardBonus.lowHpRatio)：ふつう 30→15／やさしい 35→17／むずかしい 27→13', () => {
    expect(RULES.cardBonus.lowHpRatio).toBe(0.5)
    expect(crisisThresholdHp(30)).toBe(15)
    expect(crisisThresholdHp(35)).toBe(17)
    expect(crisisThresholdHp(27)).toBe(13)
  })
  it('着弾からの遅れは決定257 の duck 復帰開始点と同じ 300ms', () => {
    expect(AFTER).toBe(300)
    expect(AFTER).toBe(SOUND_LAYER.duckTailMs)
  })
})

describe('planCrisisVoice（手組みの着弾計画）', () => {
  const base = { maxHp: 30, fired: false }

  it('HP が 16→15（閾値ちょうど）に落ちたバッチで、最後の自分への着弾 ＋ 300ms', () => {
    const at = planCrisisVoice({ ...base, prevHp: 16, hp: 15, plan: { steps: [selfStep(1260, 1)], outcome: null } })
    expect(at).toBe(1260 + AFTER)
  })

  it('一気に 30→10 でも 1 回だけ・最後の自分への着弾を使う（敵の着弾が複数・敵への着弾は無視）', () => {
    const steps = [enemyStep(90), selfStep(1100, 5), selfStep(1280, 4), selfStep(1600, 3), enemyStep(1900)]
    expect(planCrisisVoice({ ...base, prevHp: 30, hp: 10, plan: { steps, outcome: null } })).toBe(1600 + AFTER)
  })

  it('amount 0（全ブロック）の自分への着弾は時刻に数えない', () => {
    const steps = [selfStep(400, 6), selfStep(900, 0)]
    expect(planCrisisVoice({ ...base, prevHp: 20, hp: 14, plan: { steps, outcome: null } })).toBe(400 + AFTER)
  })

  it('自分への着弾が無いのに下がった（想定外）バッチは commit ＋ 300ms', () => {
    expect(planCrisisVoice({ ...base, prevHp: 20, hp: 14, plan: { steps: [], outcome: null } })).toBe(AFTER)
  })

  it('鳴らさない：まだ 50% を超えている／既に 50% 以下だった（再開・2 度目の落下）／既に鳴らした／決着バッチ', () => {
    const steps = [selfStep(158, 5)]
    expect(planCrisisVoice({ ...base, prevHp: 30, hp: 16, plan: { steps, outcome: null } })).toBeNull()
    expect(planCrisisVoice({ ...base, prevHp: 15, hp: 10, plan: { steps, outcome: null } })).toBeNull()
    expect(planCrisisVoice({ ...base, prevHp: 12, hp: 8, plan: { steps, outcome: null } })).toBeNull()
    expect(planCrisisVoice({ ...base, prevHp: 20, hp: 14, plan: { steps, outcome: null }, fired: true })).toBeNull()
    expect(planCrisisVoice({ ...base, prevHp: 20, hp: 0, plan: { steps, outcome: 'lost' } })).toBeNull()
    expect(planCrisisVoice({ ...base, prevHp: 20, hp: 14, plan: { steps, outcome: 'finished' } })).toBeNull()
    expect(planCrisisVoice({ ...base, prevHp: 20, hp: 14, plan: { steps, outcome: 'won' } })).toBeNull()
  })

  it('回復して再び落ちても鳴らない（1 戦 1 回は fired で担保。prevHp が閾値を跨いでも fired が勝つ）', () => {
    expect(planCrisisVoice({ ...base, prevHp: 20, hp: 10, plan: { steps: [selfStep(158)], outcome: null }, fired: true })).toBeNull()
  })

  it('難易度ごとの閾値：やさしい（35）は 17 以下、むずかしい（27）は 13 以下で成立', () => {
    const plan = { steps: [selfStep(158)], outcome: null }
    expect(planCrisisVoice({ prevHp: 18, hp: 17, maxHp: 35, plan, fired: false })).toBe(158 + AFTER)
    expect(planCrisisVoice({ prevHp: 18, hp: 18, maxHp: 35, plan, fired: false })).toBeNull()
    expect(planCrisisVoice({ prevHp: 14, hp: 13, maxHp: 27, plan, fired: false })).toBe(158 + AFTER)
    expect(planCrisisVoice({ prevHp: 14, hp: 14, maxHp: 27, plan, fired: false })).toBeNull()
  })
})

describe('planCrisisVoice（実際の着弾計画 planBatch と結合）', () => {
  const base = { maxHp: 30, prevHp: 20, hp: 12, fired: false }

  it('通常攻撃：突進の最前（normal 158／fast 105／heavy 228）＋ 300', () => {
    const events: GameEvent[] = [{ t: 'ENEMY_ACTED', kind: 'attack', amount: 8 }, dmg('self', 8)]
    expect(planCrisisVoice({ ...base, plan: planBatch(events) })).toBe(ENEMY_LUNGE_PEAK_MS.normal + AFTER)
    expect(planCrisisVoice({ ...base, plan: planBatch(events, { enemyVisualType: 'fast' }) })).toBe(ENEMY_LUNGE_PEAK_MS.fast + AFTER)
    expect(planCrisisVoice({ ...base, plan: planBatch(events, { enemyVisualType: 'heavy' }) })).toBe(ENEMY_LUNGE_PEAK_MS.heavy + AFTER)
  })

  it('敵の必殺（龍神 R4「大海嘯」など）：SPECIAL_IMPACT_MS 1,260 ＋ 300 ＝ 1,560', () => {
    const events: GameEvent[] = [{ t: 'ENEMY_ACTED', kind: 'special', amount: 20, label: '大海嘯' }, dmg('self', 20)]
    expect(planCrisisVoice({ ...base, plan: planBatch(events) })).toBe(SPECIAL_IMPACT_MS + AFTER)
    expect(SPECIAL_IMPACT_MS + AFTER).toBe(1560)
  })

  it('技名つき連撃（魔獣 R3「双牙乱撃」）：最後の着弾 1,100＋500 ＝ 1,600 ＋ 300 ＝ 1,900', () => {
    const events: GameEvent[] = [{ t: 'ENEMY_ACTED', kind: 'multiAttack', amount: 12, label: '双牙乱撃' }, dmg('self', 5), dmg('self', 4), dmg('self', 3)]
    const last = MULTI_CUTIN_LEAD_MS + MULTI_HIT_OFFSETS_MS[2]
    expect(planCrisisVoice({ ...base, plan: planBatch(events) })).toBe(last + AFTER)
    expect(last + AFTER).toBe(1900)
  })

  it('自分のカードの自傷（捨身）で割った場合も鳴る：カード着弾 90 ＋ 300', () => {
    const events: GameEvent[] = [{ t: 'CARD_PLAYED', uid: 'u1', defId: 'reckless', cost: 1 } as GameEvent, dmg('enemy', 7), dmg('self', 3)]
    expect(planCrisisVoice({ ...base, plan: planBatch(events) })).toBe(CARD_IMPACT_MS + AFTER)
  })

  it('敗北のバッチ（GAME_ENDED lost）では鳴らない（defeat_sting とジングルの領分）', () => {
    const events: GameEvent[] = [{ t: 'ENEMY_ACTED', kind: 'special', amount: 20, label: '大海嘯' }, dmg('self', 20), { t: 'GAME_ENDED', status: 'lost', totalScore: 0 }]
    expect(planCrisisVoice({ ...base, hp: 0, plan: planBatch(events) })).toBeNull()
  })

  it('全ブロックで HP が減らなかった敵ターンでは鳴らない', () => {
    const events: GameEvent[] = [{ t: 'ENEMY_ACTED', kind: 'attack', amount: 8 }, dmg('self', 0, 8)]
    expect(planCrisisVoice({ ...base, hp: 20, plan: planBatch(events) })).toBeNull()
  })
})
