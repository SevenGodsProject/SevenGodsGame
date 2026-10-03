/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import enemyPanel from './EnemyPanel.tsx?raw'
import godOtomoPanel from './GodOtomoPanel.tsx?raw'

/**
 * 決定264 Duel HUD v3「2 柱 HUD＋神側チャージ」の契約（docs/DECISION264_DUEL_HUD_V3_PILOT.md）。
 * 実寸（HP の長さ・神÷敵・重なり・コントラスト）はヘッドレス実測（scripts/d264-duel-hud/）が担当する。
 * ここは「CSS 1 ブロック＋TSX 1 行」という形と、保護決定に触れないことを機械的に固定する。
 */
const css = readFileSync(fileURLToPath(new URL('./battle.css', import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
const start = css.indexOf('決定264（候補）Battle Composition v3')
const end = css.indexOf('決定254 Game Entry「降臨の間」Pilot')
const block = css.slice(css.lastIndexOf('/*', start), css.lastIndexOf('/*', end))
const code = block.replace(/\/\*[\s\S]*?\*\//g, '')

describe('決定264 Duel HUD v3：CSS 1 ブロック＋TSX 1 行', () => {
  it('ブロックは決定261 の後・決定254 の前（battleEntrance.test の slice に混ざらない）', () => {
    expect(start).toBeGreaterThan(css.indexOf('決定261（候補）対峙構図 v2'))
    expect(start).toBeLessThan(end)
  })

  it('敵 panel に data-enemy（enemy.defId）を 1 つだけ足す。--artScale は敵の wrap の独立 scale', () => {
    expect(enemyPanel.match(/data-enemy=\{enemy\.defId\}/g)).toHaveLength(1)
    expect(code).toMatch(/\.enemy-avatar-wrap \{\s*scale: var\(--artScale, 1\);/)
  })

  it('reduce の @media を書かない・`.enemy-avatar` の filter／translate／scale に触れない（決定232／240／247）', () => {
    expect(code).not.toMatch(/prefers-reduced-motion/)
    expect(code).not.toMatch(/\.enemy-avatar\s*\{/)
    expect(code).not.toMatch(/scale: -1 1;/)
    expect(code).not.toMatch(/filter:/)
  })

  it('`.intent` の文字の大きさ・行高を変えない（決定240 A1）・アニメーションを足さない（決定249／250／252）', () => {
    expect(code).not.toMatch(/\.intent[^{]*\{[^}]*(font-size|line-height)/)
    expect(code).not.toMatch(/animation|@keyframes|transition/)
    expect(code).not.toMatch(/resonance-cutin|enemy-cutin|result-toast|boss-entrance/)
  })

  it('環 3 つと名札の角金具を消し、接地影 2 つを足す', () => {
    for (const s of ['.enemy-avatar-wrap::before', '.player-avatar-wrap::before', '.portrait-otomo::before']) expect(code).toContain(s)
    for (const s of ['.enemy-plate::before', '.player-plate::before', '.god-otomo-plate::before']) expect(code).toContain(s)
    expect(code).toMatch(/content: none;\s*display: none;/)
    expect(code).toMatch(/\.enemy-stage::after,\s*body\.battle-viewport \.battle-main \.player-stage::after \{\s*content: '';/)
  })

  it('共鳴は第 3 列にしない（2 列）。ゲージ・READY 発光の要素は GodOtomoPanel のまま（決定128／95）', () => {
    expect(code).toMatch(/grid-template-columns: minmax\(0, 1\.18fr\) minmax\(0, 1fr\);/)
    expect(code).toMatch(/grid-template-columns: minmax\(0, 1\.1fr\) minmax\(0, 1fr\);/)
    expect(godOtomoPanel).toContain('resonance-gauge-ready-flash')
    expect(godOtomoPanel).toContain("'resonance-gauge-high'")
  })
})
