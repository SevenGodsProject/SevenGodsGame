/// <reference types="node" />
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { CORE_ENEMIES, ENEMIES, ENEMY_IDS, PILOT_ENEMIES, PILOT_ENEMY_IDS, getEnemyDef, isPilotEnemyId, pickEnemyId } from './enemies'
import { DAILY_BOSS_POOL, dailyBossFor } from './dailyBoss'
import { RULES } from './rules'
import { MATCHUP_ENEMIES, MATCHUP_TOTAL } from '../../hooks/matchupStorage'
import { enemyActionTotal } from '../engine/intent'
import { getGameVersion, rankingImpactSnapshot } from '../replay/gameVersion'

/**
 * Threat Branch Pilot v1（`docs/LANE1_THREAT_BRANCH_PILOT_V1.md`）：ロスター分離の契約。
 *   - 既存 7 体は 1 文字も変わっていない（master `7ba447f`＝Production v1.0.0 runtime の `ENEMIES` JSON の sha256 で固定）
 *   - seed → 敵（pickEnemyId）・Daily の巡回・49 攻略盤・gameVersion は既存 7 体だけを見る（golden は master 時点の実測値）
 *   - Pilot 敵（enemy_09）は `ENEMIES`（getEnemyDef・Enemy Select の Pilot 経路）にだけ現れる
 *
 * ★CORE_GOLDEN_SHA256 の出し方（master で実行して固定値にした）：
 *   master の worktree で、`src/core/data/` に一時テストを置き
 *     createHash('sha256').update(JSON.stringify(ENEMIES)).digest('hex')
 *   を出力する（`git show master:src/core/data/enemies.ts` の `ENEMIES`＝本ブランチの `CORE_ENEMIES`）。
 *   2026-10-17 の実測：b4ce1e31…9cdd4（決定274 忠次 branch の `shogunateRoster.test.ts` と同じ値＝7 体はそれ以来不変）。
 * ★GAME_VERSION_GOLDEN は master の `useReactionLanguage.test.ts`（決定251 以降）と同じ値。
 */
const CORE_GOLDEN_SHA256 = 'b4ce1e3165e408d73762bc131bccab1dc0905919c3f3b18dd539f54421f9cdd4'
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
  it('JSON の sha256 が master（Pilot 前）の ENEMIES と一致する＝HP・行動表・台詞・画像・舞台まで 1 文字も変更なし', () => {
    expect(createHash('sha256').update(JSON.stringify(CORE_ENEMIES)).digest('hex')).toBe(CORE_GOLDEN_SHA256)
  })
  it('CORE の行動表に tactic は 1 つも無い（軍略は Pilot 敵だけ）', () => {
    for (const e of CORE_ENEMIES) for (const a of e.actions) expect(a.kind).not.toBe('tactic')
  })
})

describe('seed・Daily・49 攻略盤・gameVersion は既存 7 体だけを見る', () => {
  it('pickEnemyId は master 時点と同じ敵を返し、Pilot 敵を返さない', () => {
    for (const [seed, id] of Object.entries(PICK_GOLDEN)) expect(pickEnemyId(seed)).toBe(id)
    const core = new Set(CORE_ENEMIES.map((e) => e.id as string))
    for (let i = 0; i < 500; i++) {
      const picked = pickEnemyId(`seed-${i}`)
      expect(core.has(picked)).toBe(true)
      expect(isPilotEnemyId(picked)).toBe(false)
    }
  })
  it('Daily の巡回 pool は既存 7 体で、日付 → 敵は master 時点と同じ（Pilot 敵は含まれない）', () => {
    expect([...DAILY_BOSS_POOL]).toEqual(Object.values(ENEMY_IDS))
    expect(DAILY_BOSS_POOL.includes(PILOT_ENEMY_IDS.oniTactic)).toBe(false)
    for (const [day, id] of Object.entries(DAILY_GOLDEN)) expect(dailyBossFor(day).enemyId).toBe(id)
  })
  it('49 攻略盤の敵列は既存 7 体のまま（7×7＝49）', () => {
    expect([...MATCHUP_ENEMIES]).toEqual(Object.values(ENEMY_IDS))
    expect(MATCHUP_TOTAL).toBe(49)
  })
  it('gameVersion は master と同一（Pilot 敵の追加・RULES.enemyTactic の追加で既存プレイヤーの版は変わらない）', () => {
    expect(getGameVersion()).toBe(GAME_VERSION_GOLDEN)
    const snapshot = rankingImpactSnapshot()
    expect(snapshot).not.toContain('enemy_09')
    expect(snapshot).not.toContain('enemyTactic')
    expect(snapshot).not.toContain('hpRatioByDifficulty')
    expect(snapshot).not.toContain('ratioByDifficulty')
    expect(snapshot).not.toContain('tactic')
    // 既存 7 体は入っている
    expect(snapshot).toContain('enemy_01')
    expect(snapshot).toContain('enemy_07')
  })
  it('RULES.enemyTactic.defaultHpRatio は Pilot 敵の行動表（cond.ratio）に埋め込まれている＝CORE が使えば指紋に自動で入る', () => {
    const r4 = getEnemyDef(PILOT_ENEMY_IDS.oniTactic).actions[3]
    if (r4.kind !== 'tactic') throw new Error('R4 must be tactic')
    expect(r4.cond.ratio).toBe(RULES.enemyTactic.defaultHpRatio)
    expect(r4.cond.ratioByDifficulty).toEqual(RULES.enemyTactic.hpRatioByDifficulty)
    expect(JSON.stringify(PILOT_ENEMIES)).toContain(`"ratio":${RULES.enemyTactic.defaultHpRatio}`)
    // v1.1：難易度別しきい値も行動表に埋め込まれている（CORE が使えば指紋に入る）。指紋そのものには入らない（下の gameVersion テスト）
    expect(JSON.stringify(PILOT_ENEMIES)).toContain(`"ratioByDifficulty":${JSON.stringify(RULES.enemyTactic.hpRatioByDifficulty)}`)
  })
})

describe('Pilot 敵（enemy_09 業斧の鬼将・軍略）', () => {
  const def = getEnemyDef(PILOT_ENEMY_IDS.oniTactic)
  const oni = getEnemyDef(ENEMY_IDS.oni)

  it('ENEMIES は既存 7 体＋Pilot 1 体の順で、Pilot 判定は Pilot 敵にだけ真', () => {
    expect(ENEMIES).toEqual([...CORE_ENEMIES, ...PILOT_ENEMIES])
    expect(PILOT_ENEMIES).toHaveLength(1)
    expect(PILOT_ENEMY_IDS.oniTactic).toBe('enemy_09')
    expect(isPilotEnemyId(PILOT_ENEMY_IDS.oniTactic)).toBe(true)
    for (const e of CORE_ENEMIES) expect(isPilotEnemyId(e.id)).toBe(false)
    expect(isPilotEnemyId(null)).toBe(false)
    expect(isPilotEnemyId(undefined)).toBe(false)
    // enemy_08 は決定274 忠次のために予約（この branch では未定義）
    expect(ENEMIES.some((e) => (e.id as string) === 'enemy_08')).toBe(false)
  })

  it('鬼将のコピー（新規素材 0）：maxHp 94・art・stage・visualType・rank 2・battleCries は同一', () => {
    expect(def.maxHp).toBe(oni.maxHp)
    expect(def.maxHp).toBe(94)
    expect(def.art).toBe(oni.art)
    expect(def.stage).toEqual(oni.stage)
    expect(def.visualType).toBe(oni.visualType)
    expect(def.rank).toBe(2)
    expect(def.battleCries).toEqual(oni.battleCries)
  })

  it('文言：名前・型・1 行ヒント（30 字以内）・R3 の溜め文言', () => {
    expect(def.name).toBe('業斧の鬼将・軍略')
    expect(def.typeLabel).toBe('重撃型（軍略）')
    expect(def.typeDescription).toBe('R4は傷が深ければ斧が鈍る。R3までに追い込め。')
    expect(def.typeDescription.length).toBeLessThanOrEqual(30)
    expect(def.actions[2]).toEqual({ kind: 'charge', label: '⚠ 傷が浅ければ次は断岩' })
  })

  it('行動表：R4 tactic（then attack 13／else special 26 業斧・断岩）。else 側は鬼将と完全同一・7R 合計 then 60／else 73', () => {
    expect(def.actions).toHaveLength(7)
    const r4 = def.actions[3]
    if (r4.kind !== 'tactic') throw new Error('R4 must be tactic')
    expect(r4.cond).toEqual({ type: 'enemyHpRatioAtMost', ratio: RULES.enemyTactic.defaultHpRatio, ratioByDifficulty: RULES.enemyTactic.hpRatioByDifficulty })
    expect(r4.then).toEqual({ kind: 'attack', amount: 13 })
    expect(r4.else).toEqual({ kind: 'special', amount: 26, name: '業斧・断岩' })
    const resolved = (branch: 'then' | 'else') => def.actions.map((a) => (a.kind === 'tactic' ? a[branch] : a))
    // else 側＝鬼将（enemy_02）の行動表（R3 の label だけ違う）
    const elseSide = resolved('else')
    expect(elseSide.map((a) => enemyActionTotal(a))).toEqual(oni.actions.map((a) => enemyActionTotal(a)))
    expect(elseSide.map((a) => a.kind)).toEqual(oni.actions.map((a) => a.kind))
    expect(resolved('then').map((a) => enemyActionTotal(a))).toEqual([5, 9, 0, 13, 15, 11, 7])
    expect(resolved('else').map((a) => enemyActionTotal(a))).toEqual([5, 9, 0, 26, 15, 11, 7])
    expect(resolved('then').reduce((s, a) => s + enemyActionTotal(a), 0)).toBe(60)
    expect(resolved('else').reduce((s, a) => s + enemyActionTotal(a), 0)).toBe(73)
  })
})
