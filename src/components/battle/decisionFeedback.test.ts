import { describe, expect, it } from 'vitest'
import type { GameEvent } from '../../core/types'
import { RULES } from '../../core/data/rules'
import { GOD_IDS } from '../../core/data/gods'
import { planBatch } from './combatTimeline'
import { CALLOUT_AFTER_IMPACT_MS, collectCallouts, evaluateDefense, latestIntentAmount, latestRound, planCallout } from './decisionFeedback'

/**
 * Phase 6-C（決定166）：良い判断の検出は「イベントの事実」だけから行う。
 * ここでは engine を動かさず、round.ts／applyDamage／playCard が実際に出す
 * イベント列の形をそのまま並べて検証する（存在しない意味を主張しないこと）。
 */
const BIG = RULES.cardBonus.enemyBigThreshold

const acted = (amount: number, kind = 'attack'): GameEvent => ({ t: 'ENEMY_ACTED', kind, amount })
const hit = (amount: number, blocked: number): GameEvent => ({ t: 'DAMAGE_DEALT', target: 'self', amount, blocked })
const enemyHit = (amount: number, blocked = 0): GameEvent => ({ t: 'DAMAGE_DEALT', target: 'enemy', amount, blocked })
const roundEnd = (round: number, unusedAp = 0): GameEvent[] => [
  { t: 'ROUND_ENDED', round, unusedAp },
  { t: 'ROUND_STARTED', round: round + 1, apGranted: 3 },
  { t: 'ENEMY_INTENT_SET', kind: 'attack', amount: 7 },
]
const ctxFor = (events: GameEvent[], intentAmount: number | null, godId = GOD_IDS.taiyo) => ({
  plan: planBatch(events),
  intentAmount,
  godId,
})

describe('evaluateDefense（完封・無力化の事実判定）', () => {
  it('攻撃を全部ブロックで受け切った＝完封（amount 0・blocked > 0 の DAMAGE_DEALT が必ず出る）', () => {
    const events = [acted(12), hit(0, 12), ...roundEnd(3)]
    const d = evaluateDefense(events, 12)
    expect(d).toMatchObject({ attacked: true, perfect: true, neutralized: false, big: true, dealt: 0, blocked: 12 })
  })

  it('連撃を全 hit 吸収したときだけ完封（1 hit でも通れば不成立）', () => {
    expect(evaluateDefense([acted(9, 'multiAttack'), hit(0, 5), hit(0, 4)], 9).perfect).toBe(true)
    expect(evaluateDefense([acted(9, 'multiAttack'), hit(0, 5), hit(1, 3)], 9).perfect).toBe(false)
  })

  it('溜め（charge）・行動なし・予告なしでは何も主張しない', () => {
    expect(evaluateDefense([{ t: 'ENEMY_ACTED', kind: 'charge', amount: 0 }], 0)).toMatchObject({ attacked: false, perfect: false, neutralized: false })
    expect(evaluateDefense([{ t: 'CARD_PLAYED', uid: 'c1' as never, defId: 'card_common_attack_01' as never, cost: 1 }], 7)).toMatchObject({ attacked: false })
    // 実行値 0 でも予告が不明（null）なら無力化を主張しない
    expect(evaluateDefense([acted(0)], null).neutralized).toBe(false)
  })

  it('予告はあったのに実行値 0（デバフで hit が消えた）＝無力化', () => {
    const d = evaluateDefense([acted(0), ...roundEnd(2)], 5)
    expect(d).toMatchObject({ attacked: false, neutralized: true, big: false })
    expect(evaluateDefense([acted(0)], BIG).big).toBe(true)
  })

  it('ブロックが無く素通りした攻撃は完封ではない', () => {
    expect(evaluateDefense([acted(6), hit(6, 0)], 6).perfect).toBe(false)
  })
})

describe('collectCallouts（文言はイベントとルール値の言い換えのみ）', () => {
  it('大技の完封は priority 1、通常攻撃の完封は 3', () => {
    const big = collectCallouts([acted(BIG, 'special'), hit(0, BIG)], ctxFor([acted(BIG, 'special'), hit(0, BIG)], BIG))
    expect(big.map((c) => [c.id, c.priority])).toEqual([['perfect-big', 1]])
    expect(big[0].label).toBe('完封！')
    const small = collectCallouts([acted(5), hit(0, 5)], ctxFor([acted(5), hit(0, 5)], 5))
    expect(small.map((c) => [c.id, c.priority])).toEqual([['perfect', 3]])
  })

  it('蒼毘の反撃（PASSIVE_TRIGGERED sobi_counter）は Identity＝priority 2', () => {
    const events: GameEvent[] = [acted(5), hit(0, 5), { t: 'PASSIVE_TRIGGERED', passiveId: 'sobi_counter', amount: 4 }, enemyHit(4), ...roundEnd(2)]
    const all = collectCallouts(events, ctxFor(events, 5, GOD_IDS.sobi))
    expect(all.map((c) => c.id).sort()).toEqual(['counter', 'perfect'])
    expect(all.find((c) => c.id === 'counter')?.priority).toBe(2)
  })

  it('笑蓮・福永の得意技は名前入りの「得意技！」', () => {
    const events: GameEvent[] = [{ t: 'CARD_PLAYED', uid: 'c' as never, defId: 'card_common_attack_01' as never, cost: 1 }, enemyHit(5), { t: 'PASSIVE_TRIGGERED', passiveId: 'shouren_pristine', amount: 2 }, enemyHit(2)]
    const [c] = collectCallouts(events, ctxFor(events, 7, GOD_IDS.shouren))
    expect(c.id).toBe('passive')
    expect(c.sub).toContain('無傷の慈愛')
  })

  it('条件⚡：blocked／enemyBig は「予告を読んだ判断」（3）、combo／charged／lowHp は 4', () => {
    const mk = (when: 'blocked' | 'enemyBig' | 'combo' | 'charged' | 'lowHp'): GameEvent[] => [
      { t: 'CARD_PLAYED', uid: 'c' as never, defId: 'card_common_attack_01' as never, cost: 1 },
      enemyHit(5),
      { t: 'BONUS_TRIGGERED', defId: 'card_common_attack_01' as never, when },
      enemyHit(3),
    ]
    for (const [when, p] of [['blocked', 3], ['enemyBig', 3], ['combo', 4], ['charged', 4], ['lowHp', 4]] as const) {
      const [c] = collectCallouts(mk(when), ctxFor(mk(when), 7))
      expect(c.priority, when).toBe(p)
      expect(c.dedupeKey).toBe(`bonus:${when}`)
    }
    expect(collectCallouts(mk('combo'), ctxFor(mk('combo'), 7))[0].label).toBe('⚡ 連携！')
    expect(collectCallouts(mk('charged'), ctxFor(mk('charged'), 7))[0].sub).toContain(String(RULES.cardBonus.chargedThreshold))
  })

  it('callout は最後の着弾のあとに出る', () => {
    const events: GameEvent[] = [acted(BIG, 'special'), hit(0, BIG)]
    const ctx = ctxFor(events, BIG)
    const [c] = collectCallouts(events, ctx)
    expect(c.atMs).toBe((ctx.plan.lastImpactMs ?? 0) + CALLOUT_AFTER_IMPACT_MS)
    expect(c.atMs).toBeGreaterThan(ctx.plan.lastImpactMs ?? 0)
  })
})

describe('planCallout（1バッチ最大1件・priority・重複抑制・見せ場の回避）', () => {
  it('複数成立しても 1 件だけ（大技完封 > 反撃）', () => {
    const events: GameEvent[] = [acted(BIG), hit(0, BIG), { t: 'PASSIVE_TRIGGERED', passiveId: 'sobi_counter', amount: 3 }, enemyHit(3), ...roundEnd(4)]
    const d = planCallout(events, ctxFor(events, BIG, GOD_IDS.sobi))
    expect(d.callout?.id).toBe('perfect-big')
    expect(d.losers).toBe(1)
  })

  it('通常攻撃の完封と反撃が同時なら Identity（反撃）が勝つ', () => {
    const events: GameEvent[] = [acted(5), hit(0, 5), { t: 'PASSIVE_TRIGGERED', passiveId: 'sobi_counter', amount: 3 }, enemyHit(3), ...roundEnd(2)]
    expect(planCallout(events, ctxFor(events, 5, GOD_IDS.sobi)).callout?.id).toBe('counter')
  })

  it('同一ラウンドで同じ条件⚡は 2 回目を抑制する（別の条件・別ラウンドは出す）', () => {
    const combo: GameEvent[] = [{ t: 'CARD_PLAYED', uid: 'c' as never, defId: 'card_common_attack_01' as never, cost: 1 }, enemyHit(5), { t: 'BONUS_TRIGGERED', defId: 'card_common_attack_01' as never, when: 'combo' }, enemyHit(3)]
    const shown = new Set<string>()
    const first = planCallout(combo, ctxFor(combo, 7), shown)
    expect(first.callout?.id).toBe('bonus-combo')
    shown.add(first.callout!.dedupeKey!)
    const second = planCallout(combo, ctxFor(combo, 7), shown)
    expect(second.callout).toBeNull()
    expect(second.reason).toBe('duplicate')
    const charged: GameEvent[] = [{ t: 'CARD_PLAYED', uid: 'c' as never, defId: 'card_common_attack_01' as never, cost: 1 }, enemyHit(5), { t: 'BONUS_TRIGGERED', defId: 'card_common_attack_01' as never, when: 'charged' }, enemyHit(3)]
    expect(planCallout(charged, ctxFor(charged, 7), shown).callout?.id).toBe('bonus-charged')
  })

  it('神の一撃のバッチ・決着のバッチでは出さない（6-A の見せ場を邪魔しない）', () => {
    const burst: GameEvent[] = [{ t: 'CARD_PLAYED', uid: 'c' as never, defId: 'card_common_resonance_01' as never, cost: 1 }, { t: 'RESONANCE_BURST', total: 7 }, enemyHit(36), { t: 'BONUS_TRIGGERED', defId: 'card_common_resonance_01' as never, when: 'combo' }, enemyHit(1)]
    expect(planCallout(burst, ctxFor(burst, 7))).toMatchObject({ callout: null, reason: 'big-moment' })
    const finish: GameEvent[] = [acted(BIG), hit(0, BIG), { t: 'PASSIVE_TRIGGERED', passiveId: 'sobi_counter', amount: 30 }, enemyHit(30), { t: 'ROUND_ENDED', round: 5, unusedAp: 0 }, { t: 'GAME_ENDED', status: 'won', totalScore: 1 }]
    expect(planCallout(finish, ctxFor(finish, BIG, GOD_IDS.sobi))).toMatchObject({ callout: null, reason: 'outcome' })
  })

  it('「カードを使った」「ダメージを与えた」だけでは出さない', () => {
    const plain: GameEvent[] = [{ t: 'CARD_PLAYED', uid: 'c' as never, defId: 'card_common_attack_01' as never, cost: 1 }, enemyHit(12), { t: 'SCORE_GAINED', reason: 'damage', amount: 12 }]
    expect(planCallout(plain, ctxFor(plain, 7))).toMatchObject({ callout: null, reason: 'none' })
    const took: GameEvent[] = [acted(8), hit(8, 0), ...roundEnd(2)]
    expect(planCallout(took, ctxFor(took, 8)).callout).toBeNull()
  })
})

describe('予告・ラウンドの追従（バッチ処理後に更新する）', () => {
  it('敵ターンのバッチは「古い予告で実行 → 次の予告」なので、処理後に次の値になる', () => {
    const events: GameEvent[] = [acted(12), hit(0, 12), ...roundEnd(3)]
    expect(latestIntentAmount(events, 12)).toBe(7)
    expect(latestRound(events, 3)).toBe(4)
    expect(latestIntentAmount([enemyHit(1)], 12)).toBe(12)
  })
})
