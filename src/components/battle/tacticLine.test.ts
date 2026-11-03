/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CORE_ENEMIES, PILOT_ENEMY_IDS, SHOGUNATE_ENEMY_IDS, getEnemyDef } from '../../core/data/enemies'
import { RULES } from '../../core/data/rules'
import { resolveEnemyTactic, tacticBranch } from '../../core/engine/tactic'
import type { Difficulty, EnemyActionDef } from '../../core/types'
import { labelContrastOnFill } from '../a11y/contrast'
import { tacticLine, tacticLineWords, tacticThenMaxHp } from './tacticLine'

/**
 * 将軍家 Pilot v0.6（`docs/SHOGUNATE_V0_6_DESIGN_AUDIT.md` §1-3・§4 G5／G8）：「あと N で総攻めを止める」の契約。
 *   - N は engine の分岐判定（tacticBranch）と一致：N === 0 ⇔ then、かつ N は最小（N−1 では else のまま）
 *   - 出るのは忠次の R3（予告＝溜め・次の行動表＝軍略）だけ
 *   - 赤い輪（EnemyPanel の resolveEnemyTactic 分岐）と同じ値で決まる＝輪の消失と「止めた」は同じ描画
 *   - enemy_09 には出さない（EnemyPanel が isShogunateEnemyId で絞る）
 */
const DIFFS: Difficulty[] = ['easy', 'normal', 'hard']
const def = getEnemyDef(SHOGUNATE_ENEMY_IDS.tadatsugu)
const tactic = def.actions[3]
const charge = def.actions[2] as EnemyActionDef
const maxHpOf = (d: Difficulty) => Math.round(def.maxHp * RULES.difficulty[d].enemyHpMultiplier)
const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')

describe('tacticLine（忠次 R3 の残り必要ダメージ）', () => {
  it('then になる最大 HP：easy 41／normal 49（＝Enemy Break half 帯）・hard 67（v0.6 の 0.6）', () => {
    expect(DIFFS.map((d) => [d, maxHpOf(d), tacticThenMaxHp(tactic, maxHpOf(d), d)])).toEqual([
      ['easy', 83, 41],
      ['normal', 98, 49],
      ['hard', 113, 67],
    ])
  })

  it('全難易度 × 全 HP：N === 0 ⇔ 分岐が then／N は最小（HP−N で then・HP−N+1 で else）／赤い輪の解決と一致', () => {
    for (const d of DIFFS) {
      const maxHp = maxHpOf(d)
      for (let hp = 0; hp <= maxHp; hp++) {
        const line = tacticLine(charge, tactic, hp, maxHp, d)
        expect(line, `${d} hp ${hp}`).not.toBeNull()
        const branch = tacticBranch(tactic as Extract<typeof tactic, { kind: 'tactic' }>, hp, maxHp, d)
        expect(line!.cleared, `${d} hp ${hp}`).toBe(branch === 'then')
        expect(line!.remaining === 0, `${d} hp ${hp}`).toBe(branch === 'then')
        if (line!.remaining > 0) {
          expect(tacticBranch(tactic as Extract<typeof tactic, { kind: 'tactic' }>, hp - line!.remaining, maxHp, d)).toBe('then')
          expect(tacticBranch(tactic as Extract<typeof tactic, { kind: 'tactic' }>, hp - line!.remaining + 1, maxHp, d)).toBe('else')
        }
        // 赤い輪：EnemyPanel は resolveEnemyTactic(nextScript, hpShown, …) が必殺なら輪を付ける＝未達と同値
        const ringOn = resolveEnemyTactic(tactic, hp, maxHp, d).kind === 'special'
        expect(ringOn, `${d} hp ${hp}`).toBe(!line!.cleared)
      }
    }
  })

  it('QA の進行（normal・R3 開始 HP 65 → 37）：あと 16（表示 160）→ ✓ 止めた', () => {
    expect(tacticLine(charge, tactic, 65, 98, 'normal')).toEqual({ remaining: 16, cleared: false })
    expect(tacticLine(charge, tactic, 37, 98, 'normal')).toEqual({ remaining: 0, cleared: true })
  })

  it('出るのは R3 だけ（忠次の 7 ラウンドの予告と次の行動表で走査）・全難易度', () => {
    for (const d of DIFFS) {
      const shown: number[] = []
      for (let round = 1; round <= RULES.totalRounds; round++) {
        const intent = resolveEnemyTactic(def.actions[round - 1], maxHpOf(d), maxHpOf(d), d)
        const next = def.actions[round] ?? def.actions[def.actions.length - 1]
        if (tacticLine(intent, next, maxHpOf(d), maxHpOf(d), d)) shown.push(round)
      }
      expect({ d, shown }).toEqual({ d, shown: [3] })
    }
  })

  it('予告が無い・溜めでない・次が軍略でないときは null', () => {
    expect(tacticLine(null, tactic, 50, 98, 'normal')).toBeNull()
    expect(tacticLine(undefined, tactic, 50, 98, 'normal')).toBeNull()
    expect(tacticLine({ kind: 'attack', amount: 9 }, tactic, 50, 98, 'normal')).toBeNull()
    expect(tacticLine(charge, { kind: 'attack', amount: 15 }, 50, 98, 'normal')).toBeNull()
  })

  it('既存 7 体の行動表では一度も出ない（tactic を持たない）', () => {
    for (const e of CORE_ENEMIES) {
      for (let i = 0; i < e.actions.length; i++) {
        const next = e.actions[i + 1] ?? e.actions[e.actions.length - 1]
        const intent = resolveEnemyTactic(e.actions[i], e.maxHp, e.maxHp, 'normal')
        expect(tacticLine(intent, next, e.maxHp, e.maxHp, 'normal'), `${e.id} r${i + 1}`).toBeNull()
      }
    }
  })

  it('EnemyPanel は忠次（isShogunateEnemyId）だけ・撃破中は出さない＝enemy_09 には出ない（source-fixed）', () => {
    const src = read('./EnemyPanel.tsx')
    expect(src).toContain('const tLine = isShogunateEnemyId(enemy.defId) && !defeated ? tacticLine(enemy.intent, nextScript, hpShown, enemy.maxHp, difficulty, roundDamage, resonance, resonanceMax) : null')
    // 文言：未達「あと{N}で」＋「総攻めを止める」（句の切れ目で 2 span）／到達「✓ 総攻めを止めた」
    expect(src).toContain("'✓ 総攻めを止めた'")
    expect(src).toContain("<span>{tLine.gauge === 'resonance' ? `共鳴あと${tLine.remaining}で` : `あと${formatScaled(tLine.remaining)}で`}</span>")
    // W2：文言は tacticLineWords から（忠次は従来どおり「総攻めを止める」。fallback 文字列も残す）
    expect(src).toContain("<span>{tWords?.armed ?? '総攻めを止める'}</span>")
    // enemy_09 は軍略を持つが将軍家ではない
    expect(getEnemyDef(PILOT_ENEMY_IDS.oniTactic).actions.some((a) => a.kind === 'tactic')).toBe(true)
  })

  it('文字のコントラスト 4.5:1 以上（暗い pill の上・未達／到達）', () => {
    for (const color of ['#ffd6d6', '#ffe7bf']) {
      const ratio = labelContrastOnFill(color, '#05060bc4', '#16203c')
      expect(ratio, color).not.toBeNull()
      expect(ratio!, color).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('W2 康政（roundDamageAtLeast）の「あと N で采配を崩す」', () => {
  const y = getEnemyDef(SHOGUNATE_ENEMY_IDS.yasumasa)
  const yTactic = y.actions[3]
  const yCharge = y.actions[2] as EnemyActionDef
  it('残り＝needed − roundDamage（normal 24・hard 22）。0 で cleared。忠次型は 6 引数目を読まない', () => {
    const intent = { kind: 'charge', label: (yCharge as { label: string }).label } as const
    expect(tacticLine(intent, yTactic, 96, 96, 'normal', 0)).toEqual({ remaining: 24, cleared: false })
    expect(tacticLine(intent, yTactic, 96, 96, 'normal', 10)).toEqual({ remaining: 14, cleared: false })
    expect(tacticLine(intent, yTactic, 96, 96, 'normal', 24)).toEqual({ remaining: 0, cleared: true })
    expect(tacticLine(intent, yTactic, 110, 110, 'hard', 21)).toEqual({ remaining: 1, cleared: false })
    expect(tacticLine(intent, yTactic, 110, 110, 'hard', 22)).toEqual({ remaining: 0, cleared: true })
    // 忠次：roundDamage を渡しても結果は不変
    const tIntent = { kind: 'charge', label: (charge as { label: string }).label } as const
    expect(tacticLine(tIntent, tactic, 98, 98, 'normal', 999)).toEqual(tacticLine(tIntent, tactic, 98, 98, 'normal'))
  })
  it('文言：忠次「総攻めを止める／✓ 総攻めを止めた」・直政「一文字を止める」・康政「采配を崩す／✓ 采配を崩した」', () => {
    expect(tacticLineWords(tactic)).toEqual({ armed: '総攻めを止める', cleared: '✓ 総攻めを止めた' })
    expect(tacticLineWords(getEnemyDef(SHOGUNATE_ENEMY_IDS.naomasa).actions[3])).toEqual({ armed: '一文字を止める', cleared: '✓ 一文字を止めた' })
    expect(tacticLineWords(yTactic)).toEqual({ armed: '采配を崩す', cleared: '✓ 采配を崩した' })
    expect(tacticLineWords(charge)).toEqual({ armed: '', cleared: '' })
  })
})

describe('W3 文言：影「闇討ちを止める」・鬼半蔵「血風を止める」（tacticLineWords）', () => {
  it('「・」の無い技名はそのまま、ある技名は後半を使う', () => {
    expect(tacticLineWords(getEnemyDef(SHOGUNATE_ENEMY_IDS.kage).actions[4])).toEqual({ armed: '闇討ちを止める', cleared: '✓ 闇討ちを止めた' })
    expect(tacticLineWords(getEnemyDef(SHOGUNATE_ENEMY_IDS.onihanzo).actions[3])).toEqual({ armed: '血風を止める', cleared: '✓ 血風を止めた' })
    // 影 R2（予告なしの静かな分岐）：直前が charge でなければ行は出ない
    const kage = getEnemyDef(SHOGUNATE_ENEMY_IDS.kage)
    expect(tacticLine({ kind: 'attack', amount: 5 }, kage.actions[1], 96, 96, 'normal')).toBeNull()
  })
})

describe('W4 ドーマン（resonanceAtLeast）の「共鳴あと N で五重塔を止める」', () => {
  const d = getEnemyDef(SHOGUNATE_ENEMY_IDS.doman)
  const dTactic = d.actions[3]
  const dCharge = d.actions[2] as EnemyActionDef
  it('残り＝needed（4）− ゲージ。0 で cleared・gauge は resonance。max 0 なら行なし。忠次型・康政型は 7／8 引数目を読まない', () => {
    const intent = { kind: 'charge', label: (dCharge as { label: string }).label } as const
    expect(tacticLine(intent, dTactic, 100, 100, 'normal', 0, 0, 7)).toEqual({ remaining: 4, cleared: false, gauge: 'resonance' })
    expect(tacticLine(intent, dTactic, 100, 100, 'normal', 0, 3, 7)).toEqual({ remaining: 1, cleared: false, gauge: 'resonance' })
    expect(tacticLine(intent, dTactic, 100, 100, 'normal', 0, 4, 7)).toEqual({ remaining: 0, cleared: true, gauge: 'resonance' })
    expect(tacticLine(intent, dTactic, 100, 100, 'hard', 0, 6, 7)).toEqual({ remaining: 0, cleared: true, gauge: 'resonance' })
    expect(tacticLine(intent, dTactic, 100, 100, 'normal', 0, 4, 0)).toBeNull()
    // R7 も同じ（溜め R6 の予告があるときだけ）
    const r6 = d.actions[5] as EnemyActionDef
    expect(tacticLine({ kind: 'charge', label: (r6 as { label: string }).label }, d.actions[6], 50, 100, 'normal', 0, 2, 7)).toEqual({ remaining: 2, cleared: false, gauge: 'resonance' })
    const tIntent = { kind: 'charge', label: (charge as { label: string }).label } as const
    expect(tacticLine(tIntent, tactic, 98, 98, 'normal', 0, 7, 7)).toEqual(tacticLine(tIntent, tactic, 98, 98, 'normal'))
    const y = getEnemyDef(SHOGUNATE_ENEMY_IDS.yasumasa)
    const yIntent = { kind: 'charge', label: (y.actions[2] as { label: string }).label } as const
    expect(tacticLine(yIntent, y.actions[3], 96, 96, 'normal', 10, 7, 7)).toEqual({ remaining: 14, cleared: false })
  })
  it('文言：R4・R7 とも「五重塔を止める／✓ 五重塔を止めた」', () => {
    expect(tacticLineWords(dTactic)).toEqual({ armed: '五重塔を止める', cleared: '✓ 五重塔を止めた' })
    expect(tacticLineWords(d.actions[6])).toEqual({ armed: '五重塔を止める', cleared: '✓ 五重塔を止めた' })
  })
})

describe('W5 康虎：R3「あと N で将軍の威を止める」・R6「あと N で穢土の裁きを止める」（忠次型の 2 段・bossFinalHpRatio）', () => {
  const def = getEnemyDef(SHOGUNATE_ENEMY_IDS.yasutora)
  it('文言は else の必殺名から（「・」なし＝そのまま）', () => {
    expect(tacticLineWords(def.actions[3])).toEqual({ armed: '将軍の威を止める', cleared: '✓ 将軍の威を止めた' })
    expect(tacticLineWords(def.actions[6])).toEqual({ armed: '穢土の裁きを止める', cleared: '✓ 穢土の裁きを止めた' })
  })
  it('R6 の残りは bossFinalHpRatio まで（hard は少し甘い）。満タンなら maxHp − floor(maxHp×ratio)・届いていれば cleared。R3 側は bossOpeningHpRatio', () => {
    const hp = def.maxHp
    const o = RULES.enemyTactic.bossOpeningHpRatioByDifficulty
    const f = RULES.enemyTactic.bossFinalHpRatioByDifficulty
    const r6 = tacticLine(def.actions[5] as EnemyActionDef, def.actions[6], hp, hp, 'normal')
    expect(r6).toEqual({ remaining: hp - tacticThenMaxHp(def.actions[6], hp, 'normal'), cleared: false })
    expect(tacticThenMaxHp(def.actions[6], hp, 'normal')).toBe(Math.floor(hp * f.normal))
    expect(tacticThenMaxHp(def.actions[6], hp, 'hard')).toBe(Math.floor(hp * f.hard))
    expect(tacticLine(def.actions[5] as EnemyActionDef, def.actions[6], Math.floor(hp * f.normal), hp, 'normal')).toEqual({ remaining: 0, cleared: true })
    expect(tacticThenMaxHp(def.actions[3], hp, 'normal')).toBe(Math.floor(hp * o.normal))
    expect(tacticThenMaxHp(def.actions[3], hp, 'hard')).toBe(Math.floor(hp * o.hard))
  })
})
