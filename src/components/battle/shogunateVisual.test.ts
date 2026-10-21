/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CORE_ENEMIES, SHOGUNATE_ENEMY_IDS, getEnemyDef } from '../../core/data/enemies'

/**
 * 将軍家 Pilot v0.2〜v0.4：忠次だけの「一体感」調整が、既存 7 体・Threat Pilot（enemy_09）に一切及ばないことの契約（source-fixed）。
 *   - CSS ブロックの全セレクタは [data-enemy='enemy_08'] に閉じる／reduce の @media を含まない（決定232）
 *   - data-enemy の口は BattleScreen（.battle）・BossEntrance・BattleEnemyCutin の 3 箇所（EnemyPanel は既存）
 *   - 光のレイヤー用 --enemy-art は EnemyPanel が注入する
 *   - visualType は忠次だけ heavy（既存 7 体の visualType は不変）
 *   - v0.4：EnemyPanel の予告グロー分岐は enemy_08 だけ hpShown＋difficulty で解決する（enemy_09 は解決しない）。
 *     Enemy Break v1（enemyBreak.css）とは別要素＝追加 CSS 0・enemyBreak.css に enemy_08 の語は無い
 */
const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')

describe('battle.css の v0.2／v0.3 ブロック', () => {
  const css = read('./battle.css')
  const start = css.indexOf('将軍家 Pilot v0.2')
  const block = css.slice(start)

  it('ブロックが存在し、ファイル末尾にある（後ろに他のセクションが無い）', () => {
    expect(start).toBeGreaterThan(0)
    expect(block.indexOf('/* ====', 10)).toBe(-1)
  })

  it("全セレクタが [data-enemy='enemy_08'] に閉じる", () => {
    const noComments = block.replace(/\/\*[\s\S]*?\*\//g, '')
    const selectors = [...noComments.matchAll(/(^|\n)\s*([^@{}\n][^{}]*)\{/g)].map((m) => m[2].trim()).filter(Boolean)
    expect(selectors.length).toBeGreaterThanOrEqual(8)
    for (const sel of selectors) expect(sel, sel).toContain("[data-enemy='enemy_08']")
  })

  it('v0.3：R3 必殺充填の箱型 box-shadow を enemy_08 だけ drop-shadow に置換（既存 7 体の charging-super は不変）', () => {
    const rule = block.match(/\.enemy-panel\[data-enemy='enemy_08'\] \.enemy-avatar\.enemy-avatar-charging\.enemy-avatar-charging-super \{([^}]*)\}/)
    expect(rule, 'v0.3 rule').not.toBeNull()
    const body = rule![1]
    expect(body).toMatch(/box-shadow: none;/)
    expect(body).toMatch(/filter: drop-shadow\(0 12px 16px #000000cc\)/)
    expect(body).toMatch(/#ff5c5c/)
    expect(body).not.toMatch(/animation/)
    // 既存（敵共通）の charging-super は box-shadow のまま（v0.3 ブロックより前にあり、値は不変）
    const before = css.slice(0, start)
    expect(before).toMatch(/\.enemy-avatar\.enemy-avatar-charging\.enemy-avatar-charging-super \{\n  box-shadow:\n    0 0 64px 18px #ff5c5ccc,/)
  })

  it('reduce の @media を書かない（決定232 の契約を壊さない）', () => {
    expect(block).not.toContain('prefers-reduced-motion')
  })

  it('画像ファイルではなく CSS（mask／gradient／filter）だけで光・接地・舞台を調整する', () => {
    expect(block).toMatch(/mask: var\(--enemy-art\) center \/ contain no-repeat/)
    expect(block).toMatch(/mix-blend-mode: soft-light/)
    expect(block).toMatch(/\.enemy-stage::after \{/)
    expect(block).toMatch(/\.battle\[data-enemy='enemy_08'\] \.battle-main \{/)
    expect(block).toMatch(/\.boss-entrance-art \{/)
    expect(block).toMatch(/\.enemy-cutin-image \{/)
  })

  it('v0.4：Enemy Break v1 との併用は追加 CSS 0（enemyBreak.css に enemy_08 の語は無く、忠次ブロックは Enemy Break の要素に触れない）', () => {
    const breakCss = read('./enemyBreak.css')
    expect(breakCss).not.toContain('enemy_08')
    expect(breakCss).not.toContain('data-enemy')
    // 忠次ブロックは Enemy Break が触る要素（体の崩し・名札の閃き・傷）を上書きしない
    expect(block).not.toMatch(/cf2-break|enemy-collapse|enemy-plate::after|enemy-wound/)
  })
})

describe('data-enemy の口と --enemy-art', () => {
  it('BattleScreen の .battle・BossEntrance・BattleEnemyCutin に data-enemy がある（EnemyPanel は既存）', () => {
    expect(read('./BattleScreen.tsx')).toMatch(/<div className="battle" style=\{stageVars\} data-enemy=\{state\.enemy\.defId\}>/)
    expect(read('./BossEntrance.tsx')).toMatch(/data-enemy=\{def\.id\}/)
    expect(read('./BattleEnemyCutin.tsx')).toMatch(/<div className="enemy-cutin" data-enemy=\{def\.id\}/)
    expect(read('./EnemyPanel.tsx')).toMatch(/data-enemy=\{enemy\.defId\}/)
  })
  it('EnemyPanel は立ち絵と同じ URL を --enemy-art として注入する', () => {
    expect(read('./EnemyPanel.tsx')).toMatch(/\['--enemy-art' as string\]: `url\(\$\{def\.art\}\)`/)
  })
})

describe('v0.4：予告グローの分岐解決（表示 HP・enemy_08 限定）', () => {
  it('EnemyPanel は忠次のときだけ resolveEnemyTactic(nextScript, hpShown, enemy.maxHp, difficulty) で解決し、他の敵は解決しない', () => {
    const panel = read('./EnemyPanel.tsx')
    expect(panel).toMatch(/const nextAction = isShogunateEnemyId\(enemy\.defId\) \? resolveEnemyTactic\(nextScript, hpShown, enemy\.maxHp, difficulty\) : nextScript/)
    // 実 HP（enemy.hp）では解決しない＝Enemy Break（hpShown の帯遷移）と同じフレームに揃う
    expect(panel).not.toMatch(/resolveEnemyTactic\([^)]*enemy\.hp\b/)
    // 呼び出しは 1 か所だけ
    expect(panel.match(/resolveEnemyTactic\(/g)).toHaveLength(1)
  })
  it('BattleScreen は state.difficulty を EnemyPanel に渡す', () => {
    expect(read('./BattleScreen.tsx')).toMatch(/difficulty=\{state\.difficulty\}/)
  })
})

describe('データ', () => {
  it('忠次だけ visualType heavy。既存 7 体の visualType は不変', () => {
    expect(getEnemyDef(SHOGUNATE_ENEMY_IDS.tadatsugu).visualType).toBe('heavy')
    // 実データ（決定246 以降）：影・鬼将・怨霊・機工師・道化＝standard／魔獣＝fast／龍神＝heavy
    expect(CORE_ENEMIES.map((e) => e.visualType)).toEqual(['standard', 'standard', 'standard', 'standard', 'fast', 'heavy', 'standard'])
  })
})
