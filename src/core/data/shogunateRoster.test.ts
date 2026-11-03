/// <reference types="node" />
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  CORE_ENEMIES,
  ENEMIES,
  ENEMY_IDS,
  PILOT_ENEMIES,
  PILOT_ENEMY_IDS,
  SHOGUNATE_ENEMIES,
  SHOGUNATE_ENEMY_IDS,
  getEnemyDef,
  isPilotEnemyId,
  isShogunateEnemyId,
  pickEnemyId,
} from './enemies'
import { DAILY_BOSS_POOL, dailyBossFor } from './dailyBoss'
import { RULES } from './rules'
import type { Difficulty } from '../types'
import { MATCHUP_ENEMIES, MATCHUP_TOTAL } from '../../hooks/matchupStorage'
import { enemyActionTotal } from '../engine/intent'
import { resolveEnemyTactic, tacticBranch } from '../engine/tactic'
import { getGameVersion, rankingImpactSnapshot } from '../replay/gameVersion'
import { hpBand } from '../../components/battle/visualHp'

/**
 * 将軍家 Pilot v0.4（`docs/SHOGUNATE_PILOT_V0_4.md`）：ロスター分離の契約（v0.1 の契約を v1.0.2 RC の構造へ載せ替え）。
 *   - 既存 7 体は 1 文字も変わっていない（v1.0.2 統合形の `CORE_ENEMIES` JSON sha256＝`coreRoster.test.ts` と同じ golden）
 *   - seed → 敵（pickEnemyId）・Daily の巡回・49 攻略盤・gameVersion は既存 7 体だけを見る（golden は master 時点の実測値）
 *   - 忠次（enemy_08）は `ENEMIES` の末尾側に現れる。決定287 W1（2026-11-03）で通常導線へ公開＝`isPilotEnemyId` は偽（記録ガードの対象外）。Threat Pilot（enemy_09）は隔離のまま
 *   - 軍略のしきい値（0.5・難易度別なし）は Enemy Break の half 帯（表示 HP ≤ 0.5）と全難易度で一致する（監査 §4-1・Gate G5）
 */
const CORE_GOLDEN_SHA256 = '5678e3e757f603ae3b2a1974c772c5480222bea9c7e3e6a78f96d1b49bd70e91'
const GAME_VERSION_GOLDEN = '1.d794038a00b5b53c'
const PICK_GOLDEN: Record<string, string> = {
  a: 'enemy_07',
  'seed-1': 'enemy_03',
  'seed-2': 'enemy_04',
  'seed-999999': 'enemy_03',
  こんにちは: 'enemy_02',
  'taiyo-2026-10-10': 'enemy_06',
  x1: 'enemy_04',
  x2: 'enemy_05',
  x3: 'enemy_06',
  x4: 'enemy_07',
  x5: 'enemy_01',
  x6: 'enemy_02',
  x7: 'enemy_03',
  x8: 'enemy_04',
}
const DAILY_GOLDEN: Record<string, string> = {
  '2026-10-05': 'enemy_06',
  '2026-10-06': 'enemy_05',
  '2026-10-07': 'enemy_01',
  '2026-10-08': 'enemy_02',
  '2026-10-09': 'enemy_04',
  '2026-10-10': 'enemy_03',
  '2026-10-11': 'enemy_07',
  '2026-10-12': 'enemy_02',
  '2026-10-13': 'enemy_03',
}

describe('既存 7 体（CORE_ENEMIES）は不変', () => {
  it('id は ENEMY_IDS の定義順と一致し 7 体', () => {
    expect(CORE_ENEMIES.map((e) => e.id)).toEqual(Object.values(ENEMY_IDS))
    expect(CORE_ENEMIES).toHaveLength(7)
  })
  it('JSON の sha256 が v1.0.2 統合形の golden と一致する＝HP・行動表・台詞・画像・舞台まで 1 文字も変更なし', () => {
    expect(createHash('sha256').update(JSON.stringify(CORE_ENEMIES)).digest('hex')).toBe(CORE_GOLDEN_SHA256)
  })
})

describe('seed・Daily・49 攻略盤・gameVersion は既存 7 体だけを見る', () => {
  it('pickEnemyId は master 時点と同じ敵を返し、Pilot 敵（enemy_08／09）を返さない', () => {
    for (const [seed, id] of Object.entries(PICK_GOLDEN)) expect(pickEnemyId(seed)).toBe(id)
    const core = new Set(CORE_ENEMIES.map((e) => e.id as string))
    for (let i = 0; i < 500; i++) {
      const picked = pickEnemyId(`seed-${i}`)
      expect(core.has(picked)).toBe(true)
      expect(isShogunateEnemyId(picked)).toBe(false)
      expect(isPilotEnemyId(picked)).toBe(false)
    }
  })
  it('Daily の巡回 pool は既存 7 体で、日付 → 敵は master 時点と同じ', () => {
    expect([...DAILY_BOSS_POOL]).toEqual(Object.values(ENEMY_IDS))
    expect(DAILY_BOSS_POOL.includes(SHOGUNATE_ENEMY_IDS.tadatsugu)).toBe(false)
    for (const [day, id] of Object.entries(DAILY_GOLDEN)) expect(dailyBossFor(day).enemyId).toBe(id)
  })
  it('49 攻略盤の敵列は既存 7 体のまま（7×7＝49）', () => {
    expect([...MATCHUP_ENEMIES]).toEqual(Object.values(ENEMY_IDS))
    expect(MATCHUP_TOTAL).toBe(49)
  })
  it('gameVersion は v1.0.0 と同じ 1.d794038a00b5b53c（忠次を足しても版は動かない・指紋に enemy_08 は乗らない）', () => {
    expect(getGameVersion()).toBe(GAME_VERSION_GOLDEN)
    const snapshot = rankingImpactSnapshot()
    expect(snapshot).not.toContain('enemy_08')
    expect(snapshot).not.toContain('忠次')
    expect(snapshot).not.toContain('tadatsugu')
    expect(snapshot).not.toContain('軍略')
  })
})

describe('将軍家 Pilot 敵（忠次）', () => {
  const def = getEnemyDef(SHOGUNATE_ENEMY_IDS.tadatsugu)

  it('ENEMIES は既存 7 体＋Threat Pilot＋将軍家の順。将軍家判定は忠次にだけ真・Pilot 判定（記録ガード）は Threat Pilot にだけ真（W1：忠次は偽）', () => {
    expect(ENEMIES).toEqual([...CORE_ENEMIES, ...PILOT_ENEMIES, ...SHOGUNATE_ENEMIES])
    expect(SHOGUNATE_ENEMIES).toHaveLength(9)
    expect(SHOGUNATE_ENEMIES.map((e) => e.id as string)).toEqual(['enemy_08', 'enemy_10', 'enemy_11', 'enemy_12', 'enemy_13', 'enemy_14', 'enemy_15', 'enemy_16', 'enemy_17'])
    for (const e of SHOGUNATE_ENEMIES) expect(isShogunateEnemyId(e.id)).toBe(true)
    expect(isShogunateEnemyId(SHOGUNATE_ENEMY_IDS.tadatsugu)).toBe(true)
    expect(isShogunateEnemyId(PILOT_ENEMY_IDS.oniTactic)).toBe(false)
    for (const e of CORE_ENEMIES) expect(isShogunateEnemyId(e.id)).toBe(false)
    expect(isShogunateEnemyId(null)).toBe(false)
    expect(isShogunateEnemyId(undefined)).toBe(false)
    // 記録ガード（useGameEngine）・報酬畳み込み（BattleScreen）は isPilotEnemyId＝Threat Pilot だけ。忠次は通常の敵（決定287 W1）
    expect(isPilotEnemyId(SHOGUNATE_ENEMY_IDS.tadatsugu)).toBe(false)
    expect(isPilotEnemyId(PILOT_ENEMY_IDS.oniTactic)).toBe(true)
    for (const e of CORE_ENEMIES) expect(isPilotEnemyId(e.id)).toBe(false)
  })

  it('設計 §4-2 の値：HP 98・★1（W1 実測）・軍略型・heavy・30 字以内の説明・台詞 7 本・R4 tactic（then 12／else 24）・7R 合計 then 57／else 69', () => {
    expect(def.id).toBe('enemy_08')
    expect(def.maxHp).toBe(98)
    // 決定287 W1：★は実測（normal 指数 28.4 ＜ 道化 28.6 ＝ ★1 帯）。数値不変
    expect(def.rank).toBe(1)
    expect(def.typeLabel).toBe('軍略型')
    expect(def.visualType).toBe('heavy')
    expect(def.typeDescription.length).toBeLessThanOrEqual(30)
    expect(def.battleCries).toHaveLength(7)
    expect(def.actions).toHaveLength(7)
    expect(def.actions[2]).toEqual({ kind: 'charge', label: '⚠ 傷が浅ければ次は総攻め' })
    const r4 = def.actions[3]
    if (r4.kind !== 'tactic') throw new Error('R4 must be tactic')
    // v0.6（Expected Specification Update・CEO 承認 2026-10-29）：hard だけ 0.6 の難易度別しきい値を既存の RULES から引く。
    // v0.4 では Enemy Break の half 帯と全難易度で一致させるため埋めていなかった（監査 §4-3）。easy／normal は 0.5 のまま
    expect(r4.cond).toEqual({ type: 'enemyHpRatioAtMost', ratio: RULES.enemyTactic.defaultHpRatio, ratioByDifficulty: RULES.enemyTactic.hpRatioByDifficulty })
    expect(r4.cond.ratioByDifficulty).toEqual({ easy: 0.5, normal: 0.5, hard: 0.6 })
    expect(r4.then).toEqual({ kind: 'attack', amount: 12 })
    expect(r4.else).toEqual({ kind: 'special', amount: 24, name: '軍略・総攻め' })
    const totals = (branch: 'then' | 'else') => def.actions.map((a) => (a.kind === 'tactic' ? enemyActionTotal(a[branch]) : enemyActionTotal(a)))
    expect(totals('then')).toEqual([5, 9, 0, 12, 15, 10, 6])
    expect(totals('else')).toEqual([5, 9, 0, 24, 15, 10, 6])
    expect(totals('then').reduce((s, t) => s + t, 0)).toBe(57)
    expect(totals('else').reduce((s, t) => s + t, 0)).toBe(69)
  })

  it('表記：公式名「忠次」と公式 role「将軍四天王」を使い、「公式」「公認」を書かない（Kit 規約 §6）', () => {
    expect(def.name).toBe('将軍四天王・忠次')
    const text = [def.name, def.typeLabel, def.typeDescription, def.stage.nameJa, ...def.battleCries].join('\n')
    expect(text).not.toMatch(/公式|公認|提携/)
  })

  it('素材パスは既存 7 体と同じ規約で、専用の舞台・立ち絵を持つ（CORE 7 体＋忠次で一意。enemy_09 は鬼将と共有）', () => {
    expect(def.art).toBe('/assets/enemies/tadatsugu/art.webp')
    expect(def.stage.bg).toBe('/assets/backgrounds/stages/08-shogunate-camp.webp')
    const coreAndTadatsugu = [...CORE_ENEMIES, def]
    expect(new Set(coreAndTadatsugu.map((e) => e.stage.bg)).size).toBe(coreAndTadatsugu.length)
    expect(new Set(coreAndTadatsugu.map((e) => e.art)).size).toBe(coreAndTadatsugu.length)
  })

  // v0.6（Expected Specification Update・CEO 承認 2026-10-29）：easy／normal は境界一致（A＝0・B＝0）のまま。
  // hard は 0.6（≤67）で then になり、Enemy Break の half 帯（≤56）より 11 HP 手前で「総攻めを止めた」になる（A＝11・B＝0）。
  // ＝hard だけ「赤い輪の消失・成功表示」と「崩れ」が別の瞬間（`docs/SHOGUNATE_V0_6_GATE.md` 残リスク）
  it('Gate G5：軍略 then（engine・実 HP）と Enemy Break half 帯（表示 HP）の境界：easy／normal は一致、hard は then が 11 HP 手前', () => {
    const r4 = def.actions[3]
    if (r4.kind !== 'tactic') throw new Error('R4 must be tactic')
    const expectedThenMax: Record<Difficulty, number> = { easy: 41, normal: 49, hard: 67 }
    const expectedThenButNotBroken: Record<Difficulty, number> = { easy: 0, normal: 0, hard: 11 }
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      const maxHp = Math.round(def.maxHp * RULES.difficulty[difficulty].enemyHpMultiplier)
      let thenButNotBroken = 0
      let brokenButElse = 0
      let thenMax = -1
      for (let hp = 0; hp <= maxHp; hp++) {
        const branch = tacticBranch(r4, hp, maxHp, difficulty)
        const broken = hpBand(hp, maxHp) !== 'high'
        if (branch === 'then') thenMax = Math.max(thenMax, hp)
        if (branch === 'then' && !broken) thenButNotBroken++
        if (broken && branch === 'else') brokenButElse++
        // 表示側（EnemyPanel が hpShown で解決する）と engine 側は同じ関数＝同じ答え
        expect(resolveEnemyTactic(r4, hp, maxHp, difficulty)).toEqual(branch === 'then' ? r4.then : r4.else)
      }
      expect({ difficulty, maxHp, thenMax }).toEqual({ difficulty, maxHp, thenMax: expectedThenMax[difficulty] })
      expect({ difficulty, thenButNotBroken, brokenButElse }).toEqual({ difficulty, thenButNotBroken: expectedThenButNotBroken[difficulty], brokenButElse: 0 })
    }
  })
})

describe('W2 将軍家 第二陣（岡っ引き・直政・康政・決定288 v1.1）', () => {
  const okappiki = getEnemyDef(SHOGUNATE_ENEMY_IDS.okappiki)
  const naomasa = getEnemyDef(SHOGUNATE_ENEMY_IDS.naomasa)
  const yasumasa = getEnemyDef(SHOGUNATE_ENEMY_IDS.yasumasa)
  const totals = (def: ReturnType<typeof getEnemyDef>, branch: 'then' | 'else') =>
    def.actions.map((a) => (a.kind === 'tactic' ? enemyActionTotal(a[branch]) : enemyActionTotal(a)))

  it('岡っ引き：HP 88・群れ型・fast・偶数 R は連撃・R6 は技名つき連撃・合計 51・engine 語彙は既存のみ', () => {
    expect(okappiki.id).toBe('enemy_10')
    expect(okappiki.maxHp).toBe(88)
    expect(okappiki.typeLabel).toBe('群れ型')
    expect(okappiki.visualType).toBe('fast')
    expect(okappiki.actions.map((a) => a.kind)).toEqual(['attack', 'multiAttack', 'attack', 'multiAttack', 'attack', 'multiAttack', 'attack'])
    expect(okappiki.actions[5]).toEqual({ kind: 'multiAttack', hits: [3, 3, 3], name: '十手・乱打', special: true })
    expect(totals(okappiki, 'then')).toEqual([4, 6, 6, 8, 8, 9, 10])
    expect(totals(okappiki, 'then').reduce((s, t) => s + t, 0)).toBe(51)
  })

  it('直政：HP 96・猛り型・heavy・R4 軍略は then＝猛り連撃 5×3（special）／else＝必殺 22・しきい値は忠次と同じ RULES.enemyTactic・合計 then 59／else 66', () => {
    expect(naomasa.id).toBe('enemy_11')
    expect(naomasa.maxHp).toBe(96)
    expect(naomasa.visualType).toBe('heavy')
    const r4 = naomasa.actions[3]
    if (r4.kind !== 'tactic') throw new Error('R4 must be tactic')
    expect(r4.cond).toEqual({ type: 'enemyHpRatioAtMost', ratio: RULES.enemyTactic.defaultHpRatio, ratioByDifficulty: RULES.enemyTactic.hpRatioByDifficulty })
    expect(r4.then).toEqual({ kind: 'multiAttack', hits: [5, 5, 5], name: '猛り・三連', special: true })
    expect(r4.else).toEqual({ kind: 'special', amount: 22, name: '猛り・一文字' })
    expect(naomasa.actions[2]).toEqual({ kind: 'charge', label: '⚠ 傷が深ければ次は猛る' })
    expect(totals(naomasa, 'then').reduce((s, t) => s + t, 0)).toBe(59)
    expect(totals(naomasa, 'else').reduce((s, t) => s + t, 0)).toBe(66)
  })

  it('康政：HP 96・采配型・R4 軍略は roundDamageAtLeast（normal 0.25／hard 0.20）・then 10／else 必殺 26・合計 then 53／else 69', () => {
    expect(yasumasa.id).toBe('enemy_12')
    expect(yasumasa.maxHp).toBe(96)
    const r4 = yasumasa.actions[3]
    if (r4.kind !== 'tactic') throw new Error('R4 must be tactic')
    expect(r4.cond).toEqual({ type: 'roundDamageAtLeast', ratio: RULES.enemyTactic.defaultRoundDamageRatio, ratioByDifficulty: RULES.enemyTactic.roundDamageRatioByDifficulty })
    expect(r4.cond.ratioByDifficulty).toEqual({ easy: 0.25, normal: 0.25, hard: 0.2 })
    expect(r4.then).toEqual({ kind: 'attack', amount: 10 })
    expect(r4.else).toEqual({ kind: 'special', amount: 26, name: '采配・総崩し' })
    expect(totals(yasumasa, 'then').reduce((s, t) => s + t, 0)).toBe(53)
    expect(totals(yasumasa, 'else').reduce((s, t) => s + t, 0)).toBe(69)
    // needed：normal 96×0.25＝24・hard 110×0.2＝22・easy 82×0.25＝20.5→21
    const maxHpOf = (d: Difficulty) => Math.round(yasumasa.maxHp * RULES.difficulty[d].enemyHpMultiplier)
    expect(tacticBranch(r4, maxHpOf('normal'), maxHpOf('normal'), 'normal', 24)).toBe('then')
    expect(tacticBranch(r4, maxHpOf('normal'), maxHpOf('normal'), 'normal', 23)).toBe('else')
    expect(tacticBranch(r4, maxHpOf('hard'), maxHpOf('hard'), 'hard', 22)).toBe('then')
    expect(tacticBranch(r4, maxHpOf('hard'), maxHpOf('hard'), 'hard', 21)).toBe('else')
    expect(tacticBranch(r4, maxHpOf('easy'), maxHpOf('easy'), 'easy', 21)).toBe('then')
    // 敵 HP 比は読まない（HP 1 でも roundDamage 0 なら else）
    expect(tacticBranch(r4, 1, maxHpOf('normal'), 'normal', 0)).toBe('else')
  })

  it('表記：3 体とも公式名と公式 role だけで名前を組み、「公式」「公認」「提携」を書かない（Kit 規約 §5／§6）', () => {
    expect(okappiki.name).toBe('捕り方・岡っ引き')
    expect(naomasa.name).toBe('将軍四天王・直政')
    expect(yasumasa.name).toBe('将軍四天王・康政')
    for (const def of [okappiki, naomasa, yasumasa]) {
      expect(def.battleCries).toHaveLength(7)
      expect(def.typeDescription.length).toBeLessThanOrEqual(30)
      const text = [def.name, def.typeLabel, def.typeDescription, def.stage.nameJa, ...def.battleCries].join('\n')
      expect(text).not.toMatch(/公式|公認|提携/)
    }
  })

  it('素材：4 体とも専用の立ち絵・舞台を持ち、CORE 7 体＋将軍家 4 体で一意', () => {
    const all = [...CORE_ENEMIES, ...SHOGUNATE_ENEMIES]
    expect(new Set(all.map((e) => e.art)).size).toBe(all.length)
    expect(new Set(all.map((e) => e.stage.bg)).size).toBe(all.length)
    expect(okappiki.art).toBe('/assets/enemies/okappiki/art.webp')
    expect(naomasa.stage.bg).toBe('/assets/backgrounds/stages/10-naomasa-camp.webp')
    expect(yasumasa.stage.bg).toBe('/assets/backgrounds/stages/11-yasumasa-camp.webp')
  })
})

describe('W3 将軍家 第三陣（影・くノ一・鬼半蔵・決定288 v1.1）', () => {
  const kage = getEnemyDef(SHOGUNATE_ENEMY_IDS.kage)
  const kunoichi = getEnemyDef(SHOGUNATE_ENEMY_IDS.kunoichi)
  const onihanzo = getEnemyDef(SHOGUNATE_ENEMY_IDS.onihanzo)
  const totals = (def: ReturnType<typeof getEnemyDef>, branch: 'then' | 'else') =>
    def.actions.map((a) => (a.kind === 'tactic' ? enemyActionTotal(a[branch]) : enemyActionTotal(a)))

  it('影：HP 96・2 回の読み（R2 ratio 0.85 の静かな分岐・R5 忠次型の軍略 then 9／else 闇討ち 20）・合計 then 49／else 62', () => {
    expect(kage.id).toBe('enemy_13')
    expect(kage.maxHp).toBe(96)
    const r2 = kage.actions[1]
    const r5 = kage.actions[4]
    if (r2.kind !== 'tactic' || r5.kind !== 'tactic') throw new Error('R2/R5 must be tactic')
    expect(r2.cond).toEqual({ type: 'enemyHpRatioAtMost', ratio: 0.85 })
    expect(r2.then).toEqual({ kind: 'multiAttack', hits: [3, 3, 3] })
    expect(r2.else).toEqual({ kind: 'attack', amount: 11 })
    expect(r5.cond).toEqual({ type: 'enemyHpRatioAtMost', ratio: 0.35, ratioByDifficulty: { easy: 0.35, normal: 0.35, hard: 0.45 } })
    expect(r5.else).toEqual({ kind: 'special', amount: 20, name: '闇討ち' })
    expect(kage.actions[3]).toEqual({ kind: 'charge', label: '⚠ 追い込めねば次は闇討ち' })
    expect(totals(kage, 'then').reduce((s, t) => s + t, 0)).toBe(49)
    expect(totals(kage, 'else').reduce((s, t) => s + t, 0)).toBe(62)
    // R2 の分岐：96 × 0.85 ＝ 81.6 → HP 81 以下で then（R1 に 15 以上削られた）
    expect(tacticBranch(r2, 81, 96, 'normal')).toBe('then')
    expect(tacticBranch(r2, 82, 96, 'normal')).toBe('else')
  })

  it('くノ一：HP 90・疾風型・fast・連撃中心・R6 影走り 6×3 special・engine 語彙は既存のみ・合計 52', () => {
    expect(kunoichi.id).toBe('enemy_14')
    expect(kunoichi.maxHp).toBe(90)
    expect(kunoichi.visualType).toBe('fast')
    expect(kunoichi.actions.map((a) => a.kind)).toEqual(['multiAttack', 'multiAttack', 'attack', 'multiAttack', 'charge', 'multiAttack', 'multiAttack'])
    expect(kunoichi.actions[5]).toEqual({ kind: 'multiAttack', hits: [6, 6, 6], name: '影走り', special: true })
    expect(totals(kunoichi, 'then').reduce((s, t) => s + t, 0)).toBe(52)
  })

  it('鬼半蔵：HP 110・頭領型・heavy・R4 軍略 then 連撃 4×3 special／else 必殺 24・R7 必殺 26・合計 then 65／else 77', () => {
    expect(onihanzo.id).toBe('enemy_15')
    expect(onihanzo.maxHp).toBe(110)
    expect(onihanzo.visualType).toBe('heavy')
    const r4 = onihanzo.actions[3]
    if (r4.kind !== 'tactic') throw new Error('R4 must be tactic')
    expect(r4.then).toEqual({ kind: 'multiAttack', hits: [4, 4, 4], name: '鬼嶽・連風', special: true })
    expect(r4.else).toEqual({ kind: 'special', amount: 24, name: '鬼嶽・血風' })
    expect(onihanzo.actions[6]).toEqual({ kind: 'special', amount: 26, name: '鬼嶽・頭領斬り' })
    expect(totals(onihanzo, 'then').reduce((s, t) => s + t, 0)).toBe(65)
    expect(totals(onihanzo, 'else').reduce((s, t) => s + t, 0)).toBe(77)
  })

  it('表記：公式名と公式 role だけで名前を組み「公式」「公認」「提携」を書かない。素材は 11 体で一意', () => {
    expect(kage.name).toBe('忍者衆・影')
    expect(kunoichi.name).toBe('忍者衆・くノ一')
    expect(onihanzo.name).toBe('影の頭領・鬼半蔵')
    for (const def of [kage, kunoichi, onihanzo]) {
      expect(def.battleCries).toHaveLength(7)
      expect(def.typeDescription.length).toBeLessThanOrEqual(30)
      const text = [def.name, def.typeLabel, def.typeDescription, def.stage.nameJa, ...def.battleCries].join('\n')
      expect(text).not.toMatch(/公式|公認|提携/)
    }
    const all = [...CORE_ENEMIES, ...SHOGUNATE_ENEMIES]
    expect(new Set(all.map((e) => e.art)).size).toBe(all.length)
    expect(new Set(all.map((e) => e.stage.bg)).size).toBe(all.length)
  })
})

describe('W4 将軍家 第四陣（忠勝・ドーマン・決定288 v1.1）', () => {
  const tadakatsu = getEnemyDef(SHOGUNATE_ENEMY_IDS.tadakatsu)
  const doman = getEnemyDef(SHOGUNATE_ENEMY_IDS.doman)
  const totals = (def: ReturnType<typeof getEnemyDef>, branch: 'then' | 'else') =>
    def.actions.map((a) => (a.kind === 'tactic' ? enemyActionTotal(a[branch]) : enemyActionTotal(a)))

  it('忠勝：HP 112・鉄壁型・heavy・tactic なし・R3／R6 溜め → R4 蜻蛉切・一閃 24／R7 蜻蛉切・断 28・合計 82', () => {
    expect(tadakatsu.id).toBe('enemy_16')
    expect(tadakatsu.maxHp).toBe(112)
    expect(tadakatsu.visualType).toBe('heavy')
    expect(tadakatsu.actions.map((a) => a.kind)).toEqual(['attack', 'attack', 'charge', 'special', 'attack', 'charge', 'special'])
    expect(tadakatsu.actions[3]).toEqual({ kind: 'special', amount: 24, name: '蜻蛉切・一閃' })
    expect(tadakatsu.actions[6]).toEqual({ kind: 'special', amount: 28, name: '蜻蛉切・断' })
    expect(totals(tadakatsu, 'then').reduce((s, t) => s + t, 0)).toBe(82)
  })

  it('ドーマン：HP 100・共鳴型・standard・R4／R7 が resonanceAtLeast（ratio 0.5＝ゲージ 4 以上で then）・then 攻撃 9／11・else 逆さ五重塔 24／26・合計 then 42／else 72', () => {
    expect(doman.id).toBe('enemy_17')
    expect(doman.maxHp).toBe(100)
    expect(doman.visualType).toBe('standard')
    const r4 = doman.actions[3]
    const r7 = doman.actions[6]
    if (r4.kind !== 'tactic' || r7.kind !== 'tactic') throw new Error('R4/R7 must be tactic')
    expect(r4.cond).toEqual({ type: 'resonanceAtLeast', ratio: 0.5 })
    expect(r7.cond).toEqual({ type: 'resonanceAtLeast', ratio: 0.5 })
    expect(r4.then).toEqual({ kind: 'attack', amount: 9 })
    expect(r4.else).toEqual({ kind: 'special', amount: 24, name: '逆さ五重塔' })
    expect(r7.then).toEqual({ kind: 'attack', amount: 11 })
    expect(r7.else).toEqual({ kind: 'special', amount: 26, name: '逆さ五重塔・反転' })
    expect(doman.actions[2]).toEqual({ kind: 'charge', label: '⚠ 五重塔が共鳴に反応' })
    expect(totals(doman, 'then').reduce((s, t) => s + t, 0)).toBe(42)
    expect(totals(doman, 'else').reduce((s, t) => s + t, 0)).toBe(72)
    // ゲージ max 7：4 以上で then・3 以下で else。敵 HP 比は読まない
    expect(tacticBranch(r4, 100, 100, 'normal', 0, 4, 7)).toBe('then')
    expect(tacticBranch(r4, 100, 100, 'normal', 0, 3, 7)).toBe('else')
    expect(tacticBranch(r4, 1, 100, 'hard', 999, 0, 7)).toBe('else')
  })

  it('表記：公式名と公式 role だけで名前を組み「公式」「公認」「提携」を書かない。素材は 16 体で一意', () => {
    expect(tadakatsu.name).toBe('将軍四天王・忠勝')
    expect(doman.name).toBe('科学者・ドーマン')
    for (const def of [tadakatsu, doman]) {
      expect(def.battleCries).toHaveLength(7)
      expect(def.typeDescription.length).toBeLessThanOrEqual(30)
      const text = [def.name, def.typeLabel, def.typeDescription, def.stage.nameJa, ...def.battleCries].join('\n')
      expect(text).not.toMatch(/公式|公認|提携/)
    }
    const all = [...CORE_ENEMIES, ...SHOGUNATE_ENEMIES]
    expect(all).toHaveLength(16)
    expect(new Set(all.map((e) => e.art)).size).toBe(all.length)
    expect(new Set(all.map((e) => e.stage.bg)).size).toBe(all.length)
  })
})
