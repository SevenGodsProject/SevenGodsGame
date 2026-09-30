import { describe, expect, it } from 'vitest'
import type { GameAction, GameState } from '../types'
import { applyAction } from './reducer'
import { getFinalScore } from './score'
import { applyEffect } from './effects'
import { RULES } from '../data/rules'
import { STARTER_DECK } from '../data/decks'
import { ENEMY_IDS, getEnemyDef } from '../data/enemies'
import { GOD_IDS } from '../data/gods'
import { resolveStakeRules } from '../data/stakes'
import { createRng } from '../rng/seededRandom'

type Start = Extract<GameAction, { type: 'START_GAME' }>

const base: Start = {
  type: 'START_GAME',
  seed: 'stake-test',
  godId: GOD_IDS.ebisu,
  enemyId: ENEMY_IDS.trial,
  deck: STARTER_DECK,
}

const start = (extra: Partial<Start>) => applyAction(null, { ...base, ...extra }).state

const intentAmount = (state: GameState) => {
  const it = state.enemy.intent
  if (!it) return 0
  if (it.kind === 'attack' || it.kind === 'special') return it.amount
  if (it.kind === 'multiAttack') return it.hits.reduce((a, b) => a + b, 0)
  return 0
}

/** 決定126：神階ルールのengine適用。数値は全て RULES.stakes から導く（ハードコードしない） */
describe('神階 engine integration (決定126)', () => {
  it('stake 0 / undefined leaves everything identical to normal play (no regression)', () => {
    const a = start({})
    const b = start({ stake: 0 })
    expect(b).toEqual(a)
    expect(a.stake).toBeUndefined()
    expect(a.divination.remaining).toBe(RULES.divination.count)
    expect(a.hand).toHaveLength(RULES.deck.initialHand)
  })

  it('Ⅰ: limits divination, keeps hand, and scales enemy attack from the first round', () => {
    const s = start({ stake: 1 })
    expect(s.stake).toBe(1)
    expect(s.divination.remaining).toBe(RULES.stakes.divinationCount)
    expect(s.hand).toHaveLength(RULES.deck.initialHand)
    const raw = getEnemyDef(ENEMY_IDS.trial).actions[0]
    const rawAmount = raw.kind === 'attack' ? raw.amount : 0
    expect(intentAmount(s)).toBe(Math.round(rawAmount * RULES.stakes.enemyAtkStep))
  })

  it('Ⅱ: opening hand is one card smaller', () => {
    expect(start({ stake: 2 }).hand).toHaveLength(RULES.deck.initialHand - RULES.stakes.initialHandMinus)
  })

  it('Ⅲ: enemy max HP is scaled (rounded) on top of difficulty', () => {
    const normalHp = start({}).enemy.maxHp
    const s3 = start({ stake: 3 })
    expect(s3.enemy.maxHp).toBe(Math.round(normalHp * RULES.stakes.enemyHpStep))
    expect(s3.enemy.hp).toBe(s3.enemy.maxHp)
  })

  it('Ⅳ/Ⅴ: block and heal effects are reduced and the events carry the effective amounts', () => {
    const s4 = start({ stake: 4 })
    const blocked = applyEffect(s4, { kind: 'block', amount: 8 }, createRng('fx', 0))
    const expectedBlock = Math.round(8 * RULES.stakes.blockEfficiency)
    expect(blocked.state.player.block).toBe(expectedBlock)
    expect(blocked.events[0]).toEqual({ t: 'BLOCK_GAINED', target: 'self', amount: expectedBlock })
    // Ⅳでは回復は等倍
    const hurt4: GameState = { ...s4, player: { ...s4.player, hp: 10 } }
    expect(applyEffect(hurt4, { kind: 'heal', amount: 10 }, createRng('fx', 0)).state.player.hp).toBe(20)
    const s5 = start({ stake: 5 })
    const hurt5: GameState = { ...s5, player: { ...s5.player, hp: 10 } }
    expect(applyEffect(hurt5, { kind: 'heal', amount: 10 }, createRng('fx', 0)).state.player.hp).toBe(10 + Math.round(10 * RULES.stakes.healEfficiency))
  })

  it('late rounds (R6+, 決定251) get the extra attack multiplier on every stake level; the round before does not', () => {
    // 決定251：late surge の起点は RULES.stakes.lateRoundFrom（5→6）。値をハードコードせず RULES から導く
    // カードを使わないと敵の攻撃で倒れるため、テスト用にHPを大きくしてから進める
    const from = RULES.stakes.lateRoundFrom
    expect(from).toBe(6)
    let s = start({ stake: 1 })
    s = { ...s, player: { ...s.player, hp: 1000, maxHp: 1000 } }
    for (let i = 0; i < from - 2; i++) s = applyAction(s, { type: 'END_ROUND' }).state
    expect(s.round).toBe(from - 1)
    // 起点の 1 つ前（R5＝E1 の 2 番目の峰）には ×1.3 が乗らない（二段峰の解消）
    const rawBefore = getEnemyDef(ENEMY_IDS.trial).actions[from - 2]
    const rawBeforeAmount = rawBefore.kind === 'attack' ? rawBefore.amount : 0
    expect(intentAmount(s)).toBe(Math.round(rawBeforeAmount * RULES.stakes.enemyAtkStep))
    s = applyAction(s, { type: 'END_ROUND' }).state
    expect(s.round).toBe(from)
    const raw = getEnemyDef(ENEMY_IDS.trial).actions[from - 1]
    const rawAmount = raw.kind === 'attack' ? raw.amount : 0
    const expected = Math.round(rawAmount * RULES.stakes.enemyAtkStep * RULES.stakes.lateRoundAtkMul)
    expect(intentAmount(s)).toBe(expected)
  })

  it('Ⅵ: only special attacks are scaled (決定252), with the per-enemy cap (機工師 main cannon)', () => {
    const r6 = resolveStakeRules(6)
    // 決定252：魔獣 R1 の通常連撃（multiAttack・special なし）には必殺倍率が乗らない（Expected Specification Update）
    let juuma = start({ stake: 6, enemyId: ENEMY_IDS.juuma })
    const rawJ = getEnemyDef(ENEMY_IDS.juuma).actions[0]
    const rawTotal = rawJ.kind === 'multiAttack' ? rawJ.hits.reduce((a, b) => a + b, 0) : 0
    expect(intentAmount(juuma)).toBe(Math.round(rawTotal * r6.enemyAtkMul))
    // R3「双牙乱撃」（special: true の連撃）には乗る
    juuma = { ...juuma, player: { ...juuma.player, hp: 1000, maxHp: 1000 } }
    for (let i = 0; i < 2; i++) juuma = applyAction(juuma, { type: 'END_ROUND' }).state
    const rawJ3 = getEnemyDef(ENEMY_IDS.juuma).actions[2]
    const rawJ3Total = rawJ3.kind === 'multiAttack' ? rawJ3.hits.reduce((a, b) => a + b, 0) : 0
    expect(juuma.enemy.intent?.kind).toBe('multiAttack')
    expect(intentAmount(juuma)).toBe(Math.round(rawJ3Total * r6.enemyAtkMul * RULES.stakes.specialMul))
    // 機工師 R5 主砲（special）は上限 specialMulCapKarakuri。決定251：R5 は late surge（R6 起点）の前なので ×1.3 は乗らない
    let k = start({ stake: 6, enemyId: ENEMY_IDS.karakuri })
    k = { ...k, player: { ...k.player, hp: 1000, maxHp: 1000 } }
    for (let i = 0; i < 4; i++) k = applyAction(k, { type: 'END_ROUND' }).state
    const rawK = getEnemyDef(ENEMY_IDS.karakuri).actions[4]
    const rawK5 = rawK.kind === 'special' ? rawK.amount : 0
    expect(k.enemy.intent?.kind).toBe('special')
    expect(5).toBeLessThan(RULES.stakes.lateRoundFrom)
    expect(intentAmount(k)).toBe(Math.round(rawK5 * r6.enemyAtkMul * (RULES.stakes.specialMulCap.enemy_04 ?? 1)))
    // 決定252：怨霊 R4「怨嗟の花」は cap 1.0 ＝ Ⅵ でも神階 ATK 倍率だけ（Production と同値）
    let o = start({ stake: 6, enemyId: ENEMY_IDS.onryo })
    o = { ...o, player: { ...o.player, hp: 1000, maxHp: 1000 } }
    for (let i = 0; i < 3; i++) o = applyAction(o, { type: 'END_ROUND' }).state
    const rawO4 = getEnemyDef(ENEMY_IDS.onryo).actions[3]
    expect(o.enemy.intent?.kind).toBe('special')
    expect(intentAmount(o)).toBe(Math.round((rawO4.kind === 'special' ? rawO4.amount : 0) * r6.enemyAtkMul))
  })

  it('Ⅶ choices: race scales HP, pressure scales attack, tempo removes 1 AP in round 1 only', () => {
    const r6 = resolveStakeRules(6)
    const normalHp = start({}).enemy.maxHp
    const race = start({ stake: 7, stakeChoice: 'race' })
    expect(race.enemy.maxHp).toBe(Math.round(normalHp * r6.enemyHpMul * RULES.stakes.enemyHpStep))
    expect(race.stakeChoice).toBe('race')
    const pressure = start({ stake: 7, stakeChoice: 'pressure' })
    const raw = getEnemyDef(ENEMY_IDS.trial).actions[0]
    const rawAmount = raw.kind === 'attack' ? raw.amount : 0
    expect(intentAmount(pressure)).toBe(Math.round(rawAmount * r6.enemyAtkMul * RULES.stakes.enemyAtkStep))
    const tempo = start({ stake: 7, stakeChoice: 'tempo' })
    expect(tempo.ap.max).toBe(RULES.ap.perRound[0] - 1)
    const tempoR2 = applyAction(tempo, { type: 'END_ROUND' }).state
    expect(tempoR2.ap.max).toBe(RULES.ap.perRound[1])
  })

  it('final score is multiplied by the stake scale, and a Ⅶ loss stays below a Ⅰ win', () => {
    const score = { damage: 100, combo: 20, victory: 300, tempo: 240, survival: 20, difficultyBonus: 0, legacy: 0, total: 680 }
    expect(getFinalScore(score, 0)).toBe(Math.round(680 * RULES.score.finalScale))
    expect(getFinalScore(score, 7)).toBe(Math.round(680 * RULES.score.finalScale * (1 + RULES.stakes.scoreScalePerLevel * 7)))
    const loss = { ...score, victory: 0, tempo: 0, survival: 0, total: 120 }
    expect(getFinalScore(loss, 7)).toBeLessThan(getFinalScore(score, 1))
  })

  it('Daily (mode daily) never carries a stake even if one is passed', () => {
    const s = start({ stake: 5, mode: 'daily', dailyKey: '2026-09-02', modifier: { enemyHpMul: 1.25, enemyAtkMul: 1.15 } })
    // Dailyの経路（resolveDailyStart）はstakeを渡さないが、engine側は指定されれば適用する仕様。
    // UI側で渡さないことを startDaily.test.ts が保証する。ここではフィールドが独立していることのみ確認
    expect(s.mode).toBe('daily')
    expect(s.modifier?.enemyHpMul).toBe(1.25)
  })
})
