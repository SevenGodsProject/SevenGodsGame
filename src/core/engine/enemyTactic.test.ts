import { describe, expect, it } from 'vitest'
import { GOD_IDS } from '../data/gods'
import { PILOT_ENEMY_IDS, getEnemyDef } from '../data/enemies'
import { STARTER_DECK } from '../data/decks'
import { RULES } from '../data/rules'
import { resolveStakeRules, specialMultiplierFor } from '../data/stakes'
import type { Difficulty, EnemyActionDef, EnemyTacticDef, GameState } from '../types'
import { applyAction } from './reducer'
import { enemyActionTotal } from './intent'
import { resolveEnemyTactic, tacticBranch, tacticRatio } from './tactic'

/**
 * Threat Branch Pilot v1：軍略（tactic）の契約（機構は決定274 忠次「軍略」の移植。純関数部分はそのまま）。
 *   1. 解決はラウンド開始時の敵 HP 比と難易度（しきい値 `cond.ratioByDifficulty`／`cond.ratio`）だけで決まる（乱数 0・「以下」で then）
 *      Pilot v1.1：normal 0.5（≤47）・hard 0.6（≤64／108）・easy 0.5。値は RULES.enemyTactic.hpRatioByDifficulty（データ埋め込み・engine は RULES を読まない）
 *   2. 予告（intent）には解決後の既存 4 kind しか入らない（save v9 不変）
 *   3. 予告と実行は常に一致する（R4 に受けるダメージ＝R4 開始時に表示された予告）
 *   4. 難易度・神階の倍率は解決の「後」にかかる
 *   5. 同じ seed・同じ操作なら同じ結果
 */
const ONI_TACTIC = PILOT_ENEMY_IDS.oniTactic
const TACTIC: EnemyTacticDef = {
  kind: 'tactic',
  cond: { type: 'enemyHpRatioAtMost', ratio: 0.5 },
  then: { kind: 'attack', amount: 13 },
  else: { kind: 'special', amount: 26, name: '業斧・断岩' },
}

function start(seed: string, difficulty: Difficulty = 'normal', stake = 0): GameState {
  return applyAction(null, {
    type: 'START_GAME',
    seed,
    godId: GOD_IDS.ebisu,
    enemyId: ONI_TACTIC,
    deck: STARTER_DECK,
    difficulty,
    ...(stake ? { stake } : {}),
  }).state
}

/** カードを使わず END_ROUND だけで指定ラウンドの開始まで進める */
function toRound(state: GameState, round: number): GameState {
  let s = state
  while (s.round < round && s.status === 'playing') s = applyAction(s, { type: 'END_ROUND' }).state
  expect(s.round).toBe(round)
  expect(s.status).toBe('playing')
  return s
}

const withEnemyHp = (s: GameState, hp: number): GameState => ({ ...s, enemy: { ...s.enemy, hp } })

describe('tacticBranch / resolveEnemyTactic（純関数）', () => {
  it('敵 HP 比が ratio 以下なら then、超えていれば else（境界は「以下」。maxHp 94 → 47 以下で then）', () => {
    expect(tacticBranch(TACTIC, 47, 94, 'normal')).toBe('then')
    expect(tacticBranch(TACTIC, 48, 94, 'normal')).toBe('else')
    expect(tacticBranch(TACTIC, 0, 94, 'normal')).toBe('then')
    expect(tacticBranch(TACTIC, 94, 94, 'normal')).toBe('else')
    expect(resolveEnemyTactic(TACTIC, 47, 94, 'normal')).toEqual({ kind: 'attack', amount: 13 })
    expect(resolveEnemyTactic(TACTIC, 48, 94, 'normal')).toEqual({ kind: 'special', amount: 26, name: '業斧・断岩' })
  })

  it('maxHp 0 は else（0 除算で then に落ちない）', () => {
    expect(tacticBranch(TACTIC, 0, 0, 'normal')).toBe('else')
  })

  it('tactic 以外はそのまま返す（同一参照）', () => {
    const attack = { kind: 'attack', amount: 5 } as const
    expect(resolveEnemyTactic(attack, 1, 94, 'normal')).toBe(attack)
    const charge = { kind: 'charge', label: 'x' } as const
    expect(resolveEnemyTactic(charge, 94, 94, 'normal')).toBe(charge)
    const multi: EnemyActionDef = { kind: 'multiAttack', hits: [3, 3] }
    expect(resolveEnemyTactic(multi, 10, 94, 'normal')).toBe(multi)
  })

  it('enemyActionTotal は解決前の tactic を 0 として扱う（charge と同じ）', () => {
    expect(enemyActionTotal(TACTIC)).toBe(0)
  })
})

describe('enemy_09（鬼将・軍略）の R3 予告と R4 分岐（engine）', () => {
  it('行動表：R3 は charge（1 手先の予告）・R4 は tactic（ratio は RULES.enemyTactic.defaultHpRatio・難易度別は hpRatioByDifficulty）', () => {
    const def = getEnemyDef(ONI_TACTIC)
    expect(def.maxHp).toBe(94)
    expect(def.actions[2]).toEqual({ kind: 'charge', label: '⚠ 傷が浅ければ次は断岩' })
    const r4 = def.actions[3]
    expect(r4.kind).toBe('tactic')
    if (r4.kind !== 'tactic') throw new Error('unreachable')
    expect(r4.cond).toEqual({ type: 'enemyHpRatioAtMost', ratio: RULES.enemyTactic.defaultHpRatio, ratioByDifficulty: RULES.enemyTactic.hpRatioByDifficulty })
    expect(r4.then).toEqual({ kind: 'attack', amount: 13 })
    expect(r4.else).toEqual({ kind: 'special', amount: 26, name: '業斧・断岩' })
  })

  it('R3 開始時の予告は溜め（ダメージ 0）で、R3 を終えるまで敵 HP は分岐に使われない', () => {
    const r3 = toRound(start('tactic-r3'), 3)
    expect(r3.enemy.intent).toEqual({ kind: 'charge', label: '⚠ 傷が浅ければ次は断岩' })
    expect(enemyActionTotal(r3.enemy.intent!)).toBe(0)
    // R3 の敵ターンは 0 ダメージ
    const { events } = applyAction(r3, { type: 'END_ROUND' })
    const acted = events.find((e) => e.t === 'ENEMY_ACTED')
    if (acted && acted.t === 'ENEMY_ACTED') expect(acted.amount).toBe(0)
  })

  it('R4 開始時に敵 HP 47 以下（50%）なら予告は attack 13、48 以上なら必殺「業斧・断岩」26', () => {
    const r3 = toRound(start('tactic-branch'), 3)
    const thenSide = applyAction(withEnemyHp(r3, 47), { type: 'END_ROUND' }).state
    expect(thenSide.round).toBe(4)
    expect(thenSide.enemy.intent).toEqual({ kind: 'attack', amount: 13 })
    const elseSide = applyAction(withEnemyHp(r3, 48), { type: 'END_ROUND' }).state
    expect(elseSide.round).toBe(4)
    expect(elseSide.enemy.intent).toEqual({ kind: 'special', amount: 26, name: '業斧・断岩' })
    // カードを 1 枚も使わなければ HP 94 のまま＝else
    const untouched = applyAction(r3, { type: 'END_ROUND' }).state
    expect(untouched.enemy.intent).toEqual({ kind: 'special', amount: 26, name: '業斧・断岩' })
  })

  it('予告と実行が一致する：R4 に受けるダメージ＝R4 開始時の予告合計（両分岐）', () => {
    const r3 = toRound(start('tactic-consistency'), 3)
    for (const hp of [47, 48]) {
      const r4 = applyAction(withEnemyHp(r3, hp), { type: 'END_ROUND' }).state
      const intent = r4.enemy.intent!
      const expected = enemyActionTotal(intent)
      const { state: after, events } = applyAction(r4, { type: 'END_ROUND' })
      const acted = events.find((e) => e.t === 'ENEMY_ACTED')
      expect(acted).toBeDefined()
      if (!acted || acted.t !== 'ENEMY_ACTED') throw new Error('unreachable')
      expect(acted.amount).toBe(expected)
      expect(acted.kind).toBe(intent.kind)
      // ブロック 0 なので HP の減りも予告どおり（HP は 0 で止まる）
      expect(r4.player.hp - after.player.hp).toBe(Math.min(r4.player.hp, Math.max(0, expected - r4.player.block)))
    }
  })

  it('予告（intent）に tactic が入ることはなく、保存される盤面にも "tactic" は現れない（save v9 不変）', () => {
    for (const hpAtR3 of [94, 47]) {
      let s = start('gunryaku-save')
      const kinds = new Set<string>()
      while (s.status === 'playing') {
        if (s.round === 3 && s.enemy.hp !== hpAtR3) s = withEnemyHp(s, hpAtR3)
        if (s.enemy.intent) kinds.add(s.enemy.intent.kind)
        expect(JSON.stringify(s)).not.toContain('tactic')
        s = applyAction(s, { type: 'END_ROUND' }).state
      }
      expect(JSON.stringify(s)).not.toContain('tactic')
      expect([...kinds].every((k) => ['attack', 'charge', 'multiAttack', 'special'].includes(k))).toBe(true)
    }
  })

  it('難易度の倍率は分岐を解決した後にかかる（hard：then 13×1.15・else 26×1.15×必殺倍率。しきい値は hard 用 0.6）', () => {
    const r3 = toRound(start('tactic-hard', 'hard'), 3)
    const hardMax = r3.enemy.maxHp
    expect(hardMax).toBeGreaterThan(94)
    const threshold = Math.floor(hardMax * RULES.enemyTactic.hpRatioByDifficulty.hard)
    const thenSide = applyAction(withEnemyHp(r3, threshold), { type: 'END_ROUND' }).state
    expect(thenSide.enemy.intent).toEqual({ kind: 'attack', amount: Math.round(13 * RULES.difficulty.hard.enemyAtkMultiplier) })
    const elseSide = applyAction(withEnemyHp(r3, threshold + 1), { type: 'END_ROUND' }).state
    const specialMul = specialMultiplierFor(resolveStakeRules(0, null), ONI_TACTIC)
    expect(elseSide.enemy.intent).toEqual({
      kind: 'special',
      amount: Math.round(26 * RULES.difficulty.hard.enemyAtkMultiplier * specialMul),
      name: '業斧・断岩',
    })
  })

  it('同じ seed・同じ操作なら盤面は完全に同じ（決定論）', () => {
    const run = () => {
      let s = start('tactic-determinism')
      const trail: string[] = []
      while (s.status === 'playing') {
        trail.push(`${s.round}:${JSON.stringify(s.enemy.intent)}:${s.enemy.hp}:${s.player.hp}`)
        s = applyAction(s, { type: 'END_ROUND' }).state
      }
      return { trail, final: JSON.stringify(s) }
    }
    const a = run()
    const b = run()
    expect(a.trail).toEqual(b.trail)
    expect(a.final).toBe(b.final)
  })
})

describe('Pilot v1.1：難易度別しきい値（RULES.enemyTactic.hpRatioByDifficulty → cond.ratioByDifficulty）', () => {
  const TACTIC_BY_DIFF: EnemyTacticDef = {
    ...TACTIC,
    cond: { type: 'enemyHpRatioAtMost', ratio: 0.5, ratioByDifficulty: { hard: 0.6 } },
  }

  it('rules：normal／easy は defaultHpRatio と同値（挙動不変）・hard は 0.6。値は rules.ts にだけある', () => {
    expect(RULES.enemyTactic.hpRatioByDifficulty.normal).toBe(RULES.enemyTactic.defaultHpRatio)
    expect(RULES.enemyTactic.hpRatioByDifficulty.easy).toBe(RULES.enemyTactic.defaultHpRatio)
    expect(RULES.enemyTactic.hpRatioByDifficulty.hard).toBe(0.6)
    expect(RULES.enemyTactic.hpRatioByDifficulty.hard).toBeGreaterThan(RULES.enemyTactic.defaultHpRatio)
  })

  it('tacticRatio：難易度の値があればそれ、無ければ cond.ratio にフォールバック', () => {
    expect(tacticRatio(TACTIC, 'normal')).toBe(0.5)
    expect(tacticRatio(TACTIC, 'hard')).toBe(0.5)
    expect(tacticRatio(TACTIC_BY_DIFF, 'normal')).toBe(0.5)
    expect(tacticRatio(TACTIC_BY_DIFF, 'easy')).toBe(0.5)
    expect(tacticRatio(TACTIC_BY_DIFF, 'hard')).toBe(0.6)
    // 純関数：hard だけ境界が動く（maxHp 108 → 64 以下で then）。normal は 47 のまま
    expect(tacticBranch(TACTIC_BY_DIFF, 64, 108, 'hard')).toBe('then')
    expect(tacticBranch(TACTIC_BY_DIFF, 65, 108, 'hard')).toBe('else')
    expect(tacticBranch(TACTIC_BY_DIFF, 47, 94, 'normal')).toBe('then')
    expect(tacticBranch(TACTIC_BY_DIFF, 48, 94, 'normal')).toBe('else')
    // 難易度別の値が無い tactic は hard でも 0.5（忠次 enemy_08 など既存データの互換）
    expect(tacticBranch(TACTIC, 54, 108, 'hard')).toBe('then')
    expect(tacticBranch(TACTIC, 55, 108, 'hard')).toBe('else')
  })

  it('enemy_09（engine）：normal は 47／48 で不変、hard は 64／65（108 × 0.6）、easy は defaultHpRatio', () => {
    const cases: { difficulty: Difficulty; ratio: number }[] = [
      { difficulty: 'normal', ratio: RULES.enemyTactic.hpRatioByDifficulty.normal },
      { difficulty: 'hard', ratio: RULES.enemyTactic.hpRatioByDifficulty.hard },
      { difficulty: 'easy', ratio: RULES.enemyTactic.hpRatioByDifficulty.easy },
    ]
    for (const { difficulty, ratio } of cases) {
      const r3 = toRound(start('tactic-by-difficulty', difficulty), 3)
      const threshold = Math.floor(r3.enemy.maxHp * ratio)
      if (difficulty === 'normal') expect(threshold).toBe(47)
      if (difficulty === 'hard') expect(threshold).toBe(64)
      const thenSide = applyAction(withEnemyHp(r3, threshold), { type: 'END_ROUND' }).state
      expect(thenSide.round).toBe(4)
      expect(thenSide.enemy.intent?.kind).toBe('attack')
      const elseSide = applyAction(withEnemyHp(r3, threshold + 1), { type: 'END_ROUND' }).state
      expect(elseSide.enemy.intent?.kind).toBe('special')
    }
  })

  it('hard：旧しきい値（54）と新しきい値（64）の間＝HP 55〜64 は v1 では else だったが v1.1 では then', () => {
    const r3 = toRound(start('tactic-hard-window', 'hard'), 3)
    expect(r3.enemy.maxHp).toBe(108)
    for (const hp of [55, 60, 64]) {
      const r4 = applyAction(withEnemyHp(r3, hp), { type: 'END_ROUND' }).state
      expect(r4.enemy.intent).toEqual({ kind: 'attack', amount: Math.round(13 * RULES.difficulty.hard.enemyAtkMultiplier) })
    }
  })

  it('保存される盤面に "ratioByDifficulty"／"hpRatioByDifficulty" は現れない（save v9 不変）', () => {
    for (const difficulty of ['normal', 'hard'] as Difficulty[]) {
      let s = start('gunryaku-v11-save', difficulty)
      while (s.status === 'playing') {
        const json = JSON.stringify(s)
        expect(json).not.toContain('ratioByDifficulty')
        expect(json).not.toContain('tactic')
        s = applyAction(s, { type: 'END_ROUND' }).state
      }
    }
  })
})
