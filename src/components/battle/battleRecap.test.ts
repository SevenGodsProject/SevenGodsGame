import { describe, expect, it } from 'vitest'
import type { GameAction, GameEvent, GameState } from '../../core/types'
import { GOD_IDS } from '../../core/data/gods'
import { ENEMY_IDS } from '../../core/data/enemies'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { getCardDef } from '../../core/data/cards'
import { RULES } from '../../core/data/rules'
import { applyAction } from '../../core/engine/reducer'
import { buildBattleRecap, collectRecapFacts, defeatGuidance, RECAP_MAX_LINES, splitBatches } from './battleRecap'

/**
 * Phase 6-C（決定166）：振り返りは「実際に起きたこと」だけから作る。
 * engine（reducer）を本当に動かしてログを作り、その事実と文が一致することを検証する。
 * 推測・自由文章・後知恵が混ざらないことをここで固定する。
 */

type Run = { state: GameState; log: GameEvent[] }

function start(seed: string, godId = GOD_IDS.ebisu, enemyId = ENEMY_IDS.trial): Run {
  const r = applyAction(null, { type: 'START_GAME', seed, godId, enemyId, deck: getRecommendedDeck(godId) })
  return { state: r.state, log: [...r.events] }
}
function step(run: Run, action: GameAction): Run {
  const r = applyAction(run.state, action)
  return { state: r.state, log: [...run.log, ...r.events] }
}
/** 手札から「使える攻撃／防御札」を機械的に選ぶ（テスト用の単純方針） */
function playAll(run: Run, prefer: 'attack' | 'guard', strictOnly = false): Run {
  let cur = run
  for (let i = 0; i < 8; i++) {
    if (cur.state.status !== 'playing') break
    const playable = cur.state.hand.filter((c) => getCardDef(c.defId).cost + (c.costModifier ?? 0) <= cur.state.ap.current)
    if (playable.length === 0) break
    const preferred = playable.find((c) => getCardDef(c.defId).type === prefer)
    if (!preferred && strictOnly) break
    const pick = preferred ?? playable[0]
    cur = step(cur, { type: 'PLAY_CARD', uid: pick.uid })
  }
  return cur
}
function playToEnd(run: Run, prefer: 'attack' | 'guard', maxRounds = 8, strictOnly = false): Run {
  let cur = run
  for (let r = 0; r < maxRounds && cur.state.status === 'playing'; r++) {
    cur = playAll(cur, prefer, strictOnly)
    if (cur.state.status !== 'playing') break
    cur = step(cur, { type: 'END_ROUND' })
  }
  return cur
}

describe('splitBatches（1アクション＝1バッチ）', () => {
  it('ラウンド終了のバッチは ENEMY_ACTED から GAME_ENDED まで同じバッチに入る', () => {
    const run = playToEnd(start('recap-split'), 'attack')
    const batches = splitBatches(run.log)
    // 先頭は GAME_STARTED から
    expect(batches[0][0].t).toBe('GAME_STARTED')
    // 各バッチの先頭は区切りイベントか GAME_STARTED
    for (const b of batches.slice(1)) expect(['CARD_PLAYED', 'DIVINATION_USED', 'ENEMY_ACTED']).toContain(b[0].t)
    // GAME_ENDED は決着したアクションの末尾＝そのバッチの最後
    const last = batches.find((b) => b.some((e) => e.t === 'GAME_ENDED'))!
    expect(last[last.length - 1].t).toBe('GAME_ENDED')
  })
})

describe('collectRecapFacts（事実の集計）', () => {
  it('HP の復元がゲーム終了時の HP と一致し、最低 HP 比率を主張できる', () => {
    const run = playToEnd(start('recap-hp'), 'attack')
    const facts = collectRecapFacts(run.log, run.state)
    expect(facts.complete).toBe(true)
    expect(facts.lowestHpRatio).not.toBeNull()
    expect(facts.lowestHpRatio!).toBeLessThanOrEqual(1)
  })

  it('「続きから」相当（GAME_STARTED を含まないログ）では回数系の事実を主張しない', () => {
    const run = playToEnd(start('recap-partial'), 'attack')
    const partialLog = run.log.filter((e) => e.t !== 'GAME_STARTED')
    const facts = collectRecapFacts(partialLog, run.state)
    expect(facts.complete).toBe(false)
    expect(facts.lowestHpRatio).toBeNull()
    const recap = buildBattleRecap(partialLog, run.state)!
    for (const line of recap.lines) expect(line).not.toMatch(/回/)
  })

  it('⚡・得意技・完封の回数はイベント数と一致する', () => {
    const run = playToEnd(start('recap-count', GOD_IDS.sobi, ENEMY_IDS.oni), 'guard')
    const facts = collectRecapFacts(run.log, run.state)
    expect(facts.bonus).toBe(run.log.filter((e) => e.t === 'BONUS_TRIGGERED').length)
    expect(facts.passive).toBe(run.log.filter((e) => e.t === 'PASSIVE_TRIGGERED').length)
    expect(facts.perfect).toBeGreaterThanOrEqual(facts.perfectBig)
  })
})

describe('buildBattleRecap（最大3行・固有の事実・後知恵なし）', () => {
  const seeds = ['recap-a', 'recap-b', 'recap-c', 'recap-d', 'recap-e', 'recap-f']
  const combos: [string, string][] = [
    [GOD_IDS.ebisu, ENEMY_IDS.trial],
    [GOD_IDS.sobi, ENEMY_IDS.oni],
    [GOD_IDS.juraku, ENEMY_IDS.ryujin],
    [GOD_IDS.fukuei, ENEMY_IDS.karakuri],
    [GOD_IDS.shouren, ENEMY_IDS.onryo],
    [GOD_IDS.taiyo, ENEMY_IDS.juuma],
  ]

  it('進行中は null、決着後は kind と 3 行以内', () => {
    const run = start('recap-playing')
    expect(buildBattleRecap(run.log, run.state)).toBeNull()
    for (const [i, seed] of seeds.entries()) {
      const [god, enemy] = combos[i]
      for (const prefer of ['attack', 'guard'] as const) {
        const r = playToEnd(start(seed, god as never, enemy as never), prefer)
        const recap = buildBattleRecap(r.log, r.state)!
        expect(recap).not.toBeNull()
        expect(recap.lines.length).toBeLessThanOrEqual(RECAP_MAX_LINES)
        expect(recap.kind).toBe(r.state.status === 'won' ? 'victory' : r.state.status === 'lost' ? 'defeat' : 'finished')
        if (recap.kind === 'victory') expect(recap.lines.length).toBeGreaterThanOrEqual(1)
        // 後知恵・断定表現を含まない
        for (const line of recap.lines) expect(line).not.toMatch(/勝てた|勝てました|べきだった|出せば/)
      }
    }
  })

  it('勝利の行はすべてログの事実と一致する（回数・ラウンド・神の一撃）', () => {
    for (const [i, seed] of seeds.entries()) {
      const [god, enemy] = combos[i]
      const r = playToEnd(start(seed, god as never, enemy as never), 'attack')
      if (r.state.status !== 'won') continue
      const recap = buildBattleRecap(r.log, r.state)!
      const f = recap.facts
      for (const line of recap.lines) {
        if (line.includes('神の一撃で決着')) expect(f.burstFinish).toBe(true)
        const m = line.match(/大技を(\d+)回/)
        if (m) expect(Number(m[1])).toBe(f.perfectBig)
        const m2 = line.match(/敵の攻撃を(\d+)回、無傷/)
        if (m2) expect(Number(m2[1])).toBe(f.perfect)
        const m3 = line.match(/⚡の条件を(\d+)回/)
        if (m3) expect(Number(m3[1])).toBe(f.bonus)
        const m4 = line.match(/ラウンド(\d+)で撃破/)
        if (m4) expect(Number(m4[1])).toBe(r.state.round)
      }
    }
  })

  it('敗北の助言は高信頼ルールが当てはまるときだけ 1 行（無ければ出さない）', () => {
    // 盾を積まずに大技を受けて負ける状況を作る：攻撃札だけを使う
    let found = false
    for (const seed of ['loss-1', 'loss-2', 'loss-3', 'loss-4', 'loss-5', 'loss-6', 'loss-7', 'loss-8']) {
      const r = playToEnd(start(seed, GOD_IDS.taiyo, ENEMY_IDS.karakuri), 'attack')
      if (r.state.status !== 'lost') continue
      found = true
      const recap = buildBattleRecap(r.log, r.state)!
      expect(recap.kind).toBe('defeat')
      expect(recap.lines.length).toBeLessThanOrEqual(1)
      const g = defeatGuidance(recap.facts, r.state)
      if (g) {
        expect(recap.lines).toEqual([g])
        // 事実（実行値・盾）を含む形か、託宣・神力・⚡の既存の仕組みへの案内
        expect(g).toMatch(/大技に対し|託宣が|神力を|⚡の条件/)
      } else {
        expect(recap.lines).toEqual([])
      }
    }
    expect(found).toBe(true)
  })

  it('未撃破は「あと N で撃破」の事実を出す（7ラウンド終了・敵HP残り）', () => {
    // reducer で 7 ラウンド終了まで一切カードを使わずに到達させると先に敗北するため、
    // ここは決着直前の実ログ＋ status='finished' の GameState を合成して検証する
    const run = playToEnd(start('fin-synth', GOD_IDS.shouren, ENEMY_IDS.ryujin), 'guard', 3, true)
    const state: GameState = { ...run.state, status: 'finished', round: 7, enemy: { ...run.state.enemy, hp: 24 } }
    const log: GameEvent[] = [...run.log, { t: 'ROUND_ENDED', round: 7, unusedAp: 0 }, { t: 'GAME_ENDED', status: 'finished', totalScore: 0 }]
    const recap = buildBattleRecap(log, state)!
    expect(recap.kind).toBe('finished')
    expect(recap.lines[0]).toBe('あと240で撃破でした')
    expect(recap.lines.length).toBeLessThanOrEqual(RECAP_MAX_LINES)
  })

  it('G1：大技に盾が届かなかった敗北は、実行値と吸収量をそのまま書く', () => {
    const facts = {
      complete: true, round: 5, perfect: 0, perfectBig: 0, neutralized: 0, bonus: 2, bonusByCond: {}, passive: 0, burstCount: 0, burstFinish: false,
      lowestHpRatio: 0, unusedApRounds: 0, divinationUses: 3, divinationUsedInLastRound: true,
      fatal: { actedAmount: RULES.cardBonus.enemyBigThreshold + 5, intentAmount: null, blocked: 3, big: true }, hasBonusCards: true,
    }
    const state = { divination: { remaining: 0, usedThisRound: true } } as unknown as GameState
    const g = defeatGuidance(facts, state)!
    expect(g).toContain(`${(RULES.cardBonus.enemyBigThreshold + 5) * 10}の大技`)
    expect(g).toContain('盾は30')
  })

  it('G2：託宣が残っていたのに使わなかった敗北だけ託宣を案内する（使っていれば出さない）', () => {
    const base = {
      complete: true, round: 4, perfect: 0, perfectBig: 0, neutralized: 0, bonus: 1, bonusByCond: {}, passive: 0, burstCount: 0, burstFinish: false,
      lowestHpRatio: 0, unusedApRounds: 0, divinationUses: 0, divinationUsedInLastRound: false,
      fatal: { actedAmount: 5, intentAmount: 5, blocked: 5, big: false }, hasBonusCards: true,
    }
    const st = (remaining: number) => ({ divination: { remaining, usedThisRound: false } }) as unknown as GameState
    expect(defeatGuidance(base, st(2))).toContain('託宣が2回残って')
    expect(defeatGuidance({ ...base, divinationUsedInLastRound: true }, st(2))).toBeNull()
    expect(defeatGuidance(base, st(0))).toBeNull()
  })
})
