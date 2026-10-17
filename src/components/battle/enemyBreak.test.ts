import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import enemyPanelSrc from './EnemyPanel.tsx?raw'
import { ENEMY_BREAK, INITIAL_ENEMY_BREAK, enemyBreakClass, enemyBreakVars, nextEnemyBreak } from './enemyBreak'
import { HIT_STOP_MS } from './enemyVfxTiming'

const enemyBreakCss = readFileSync(fileURLToPath(new URL('./enemyBreak.css', import.meta.url)), 'utf8').replace(/\r\n/g, '\n')

/**
 * Combat Feel Premium v2 — Enemy Break v1（docs/COMBAT_FEEL_PREMIUM_V2_PILOT.md）の回帰テスト。
 * 表示 HP の帯（50%／25%）をまたいで下がった瞬間だけ 1 回再生し、engine・着弾時刻表には触れない。
 */
describe('Enemy Break v1：nextEnemyBreak（帯の遷移 → 再生キー）', () => {
  it('初回（prevBand null）と同じ帯では再生しない', () => {
    expect(nextEnemyBreak(INITIAL_ENEMY_BREAK, null, 'half', false)).toBe(INITIAL_ENEMY_BREAK)
    expect(nextEnemyBreak(INITIAL_ENEMY_BREAK, 'high', 'high', false)).toBe(INITIAL_ENEMY_BREAK)
  })
  it('high→half で half、half→quarter で quarter。key は 1 ずつ進む', () => {
    const a = nextEnemyBreak(INITIAL_ENEMY_BREAK, 'high', 'half', false)
    expect(a).toEqual({ key: 1, level: 'half' })
    const b = nextEnemyBreak(a, 'half', 'quarter', false)
    expect(b).toEqual({ key: 2, level: 'quarter' })
  })
  it('一撃で high→quarter（50% と 25% を同時にまたぐ）は到達帯 quarter を 1 回だけ', () => {
    expect(nextEnemyBreak(INITIAL_ENEMY_BREAK, 'high', 'quarter', false)).toEqual({ key: 1, level: 'quarter' })
  })
  it('撃破の一撃（suppress）では再生せず状態も変えない', () => {
    const a = { key: 1, level: 'half' } as const
    expect(nextEnemyBreak(a, 'half', 'quarter', true)).toBe(a)
  })
  it('帯が上がった（新しい対局・全快）ら level を外し、key は進めない', () => {
    const a = { key: 2, level: 'quarter' } as const
    expect(nextEnemyBreak(a, 'quarter', 'high', false)).toEqual({ key: 2, level: null })
    // 既に null なら同じ参照（無駄な再描画をしない）
    const n = { key: 2, level: null }
    expect(nextEnemyBreak(n, 'half', 'high', false)).toBe(n)
  })
})

describe('Enemy Break v1：定数の階層（決定232 の梯子に収まる・quarter は half より強く長い）', () => {
  it('ノックバック：L1 4 < L2 5 < half 7 < L3 8 < quarter 10 < L4 11 < 撃破 14（PC）', () => {
    const ladder = [4, 5, ENEMY_BREAK.kbPx.half, 8, ENEMY_BREAK.kbPx.quarter, 11, 14]
    for (let i = 1; i < ladder.length; i++) expect(ladder[i]).toBeGreaterThan(ladder[i - 1])
  })
  it('SP のノックバックは PC より小さい（決定229 の近い舞台）', () => {
    expect(ENEMY_BREAK.kbPxSp.half).toBeLessThan(ENEMY_BREAK.kbPx.half)
    expect(ENEMY_BREAK.kbPxSp.quarter).toBeLessThan(ENEMY_BREAK.kbPx.quarter)
    expect(ENEMY_BREAK.kbPxSp.quarter).toBeGreaterThan(ENEMY_BREAK.kbPxSp.half)
  })
  it('時間：quarter > half、体の崩しは L4 の揺れ（0.7s）より短く、hit stop より長い', () => {
    expect(ENEMY_BREAK.bodyMs.quarter).toBeGreaterThan(ENEMY_BREAK.bodyMs.half)
    expect(ENEMY_BREAK.plateMs.quarter).toBeGreaterThan(ENEMY_BREAK.plateMs.half)
    expect(ENEMY_BREAK.woundMs.quarter).toBeGreaterThan(ENEMY_BREAK.woundMs.half)
    expect(ENEMY_BREAK.bodyMs.quarter).toBeLessThan(700)
    expect(ENEMY_BREAK.bodyMs.half).toBeGreaterThan(HIT_STOP_MS[4])
  })
})

describe('Enemy Break v1：クラスと CSS 変数', () => {
  it('level が無ければクラスも空。あれば prefix と段階の 2 つ', () => {
    expect(enemyBreakClass('cf2-break', null)).toBe('')
    expect(enemyBreakClass('cf2-break', 'half')).toBe(' cf2-break cf2-break-half')
    expect(enemyBreakClass('cf2-break', 'quarter')).toBe(' cf2-break cf2-break-quarter')
  })
  it('CSS 変数は TS の定数から作る（時間・距離の真実は 1 か所）', () => {
    expect(enemyBreakVars('quarter')).toEqual({
      '--cf2-body-ms': '560ms',
      '--cf2-plate-ms': '760ms',
      '--cf2-wound-ms': '720ms',
      '--cf2-kb-pc': '10px',
      '--cf2-kb-sp': '7px',
    })
  })
})

describe('Enemy Break v1：CSS（表示専用・既存要素に触れない・reduced-motion）', () => {
  it('時間と距離はハードコードせず var(--cf2-*) で受ける', () => {
    for (const v of ['--cf2-body-ms', '--cf2-plate-ms', '--cf2-wound-ms', '--cf2-kb-pc', '--cf2-kb-sp']) expect(enemyBreakCss).toContain(`var(${v}`)
  })
  it('ノックバックの向きは既存の --atk-x／--atk-y（決定162・229 の向き規則）', () => {
    expect(enemyBreakCss).toContain('var(--atk-x, 1)')
    expect(enemyBreakCss).toContain('var(--atk-y, 0)')
  })
  it('すべての規則は .enemy-panel.cf2-break* の子孫に限定し、決定232 の .enemy-reaction・決定240／247 の .enemy-avatar・着弾レイヤーには触れない', () => {
    const code = enemyBreakCss.replace(/\/\*[\s\S]*?\*\//g, '')
    const selectors = [...code.matchAll(/^\s*([.][^{@]+)\{/gm)].map((m) => m[1].trim())
    expect(selectors.length).toBeGreaterThan(0)
    for (const s of selectors) for (const part of s.split(',')) expect(part.trim()).toMatch(/^\.enemy-panel\.cf2-break/)
    expect(code).not.toMatch(/\.enemy-reaction/)
    expect(code).not.toMatch(/\.enemy-avatar\b/)
    expect(code).not.toMatch(/enemy-hit-layer|floating-number|slash-fx|impact-ring/)
    // 撃破（決定226）の崩壊中は体の規則を外す
    expect(enemyBreakCss).toMatch(/\.enemy-collapse:not\(\.enemy-defeat\)/)
  })
  it('prefers-reduced-motion では体と傷の動きを止める（名札の閃き＝opacity は残す）', () => {
    const reduced = enemyBreakCss.slice(enemyBreakCss.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toMatch(/\.enemy-collapse:not\(\.enemy-defeat\)\s*\{\s*animation: none;/)
    expect(reduced).toMatch(/\.enemy-wound-quarter\s*\{\s*animation: none;/)
    expect(reduced).not.toMatch(/enemy-plate/)
  })
  it('追加 CSS は 150 行以内（小規模 Pilot の上限）', () => {
    expect(enemyBreakCss.split('\n').length).toBeLessThanOrEqual(150)
  })
})

describe('Enemy Break v1：EnemyPanel の配線（source pin）', () => {
  it('撃破の一撃・表示 HP 0・崩壊中は suppress し、クラスは panel の根だけに付ける（名札・舞台・体の markup は不変）', () => {
    expect(enemyPanelSrc).toMatch(/useEnemyBreak\(hpShown, enemy\.maxHp, defeated \|\| hpShown <= 0 \|\| plan\?\.outcome === 'won'\)/)
    expect(enemyPanelSrc).toMatch(/enemy-band-\$\{band\}\$\{enemyBreakClass\('cf2-break', brk\.level\)\}/)
    expect(enemyPanelSrc).toContain('className="enemy-plate"')
    expect(enemyPanelSrc).toContain('className="enemy-stage"')
    expect(enemyPanelSrc).toMatch(/enemy-collapse\$\{defeated \? ' enemy-defeat' : ''\}/)
  })
  it('engine には触れない', () => {
    expect(enemyPanelSrc).not.toMatch(/from '\.\.\/\.\.\/core\/engine/)
  })
})
