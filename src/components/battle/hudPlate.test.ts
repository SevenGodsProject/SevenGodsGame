/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import hpBar from './HpBar.tsx?raw'

/**
 * HUD Plate & Gauge Material v1（docs/HUD_PREMIUM_PRE_AUDIT.md §6）の契約。
 *
 * このファイルは「名札・ゲージ・バッジの材質と角の形だけ」を変える。寸法・余白・書体・
 * 文字サイズ・アニメーション・重なり順を動かすと、決定164（一画面固定）・決定228（SP 列幅と
 * バッジ 1 行）・決定230（共鳴札の見出し）の実測 Gate をやり直すことになるため、
 * ソースそのものを検査して機械的に固定する。
 * 実際の寸法差（|Δ| ≤ 0.5px）はヘッドレス実測（scripts/hud-premium-audit/）が担当する。
 */

/** CSS は Vite の CSS パイプラインを通ると `?raw` でも空になるため、実ファイルを読む */
const css = readFileSync(fileURLToPath(new URL('./hudPlate.css', import.meta.url)), 'utf8')
const source = css.replace(/\/\*[\s\S]*?\*\//g, '')

/** `セレクタ { 宣言 }` の組をすべて取り出す（ネストは使っていない前提） */
function rules(): { selectors: string[]; body: string }[] {
  const out: { selectors: string[]; body: string }[] = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  for (let m = re.exec(source); m; m = re.exec(source)) {
    out.push({ selectors: m[1].split(',').map((s) => s.trim()).filter(Boolean), body: m[2] })
  }
  return out
}

function properties(body: string): string[] {
  return body
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => d.slice(0, d.indexOf(':')).trim().toLowerCase())
}

describe('HUD Plate & Gauge Material v1：材質と角の形だけ', () => {
  it('HpBar から読み込まれる（battle.css・BattleScreen には触れない）', () => {
    expect(hpBar).toMatch(/^import '\.\/hudPlate\.css'/m)
  })

  it('全セレクタが body.battle-viewport .battle-main で始まる（チュートリアル・他画面に漏れない）', () => {
    const all = rules().flatMap((r) => r.selectors)
    expect(all.length).toBeGreaterThan(0)
    for (const s of all) expect(s, s).toMatch(/^body\.battle-viewport \.battle-main /)
  })

  it('寸法・余白・書体・文字サイズ・表示方式・重なり順・動きのプロパティを 1 つも宣言しない', () => {
    const forbidden =
      /^(width|height|min-|max-|padding|margin|gap|row-gap|column-gap|font-size|font-family|font-weight|font$|line-height|letter-spacing|display|flex|grid|order|z-index|transform|translate|scale|rotate|animation|transition|border-width|border$|border-(top|right|bottom|left)$|outline|white-space|word-break|overflow|top$|right$|bottom$|left$)/
    const hits: string[] = []
    for (const r of rules()) {
      for (const p of properties(r.body)) if (forbidden.test(p)) hits.push(`${r.selectors[0]} → ${p}`)
    }
    expect(hits).toEqual([])
  })

  it('position は名札（relative）と角金具の擬似要素（absolute）にだけ使う', () => {
    for (const r of rules()) {
      const m = r.body.match(/position:\s*([a-z]+)/)
      if (!m) continue
      const isPseudo = r.selectors.every((s) => s.endsWith('::before'))
      const isPlate = r.selectors.every((s) => /\.(enemy|player|god-otomo)-plate$/.test(s))
      expect(isPseudo || isPlate, r.selectors.join(', ')).toBe(true)
      expect(m[1]).toBe(isPseudo ? 'absolute' : 'relative')
    }
  })

  it('inset は角金具の擬似要素だけ（名札の縁の上・操作を奪わない）', () => {
    for (const r of rules()) {
      if (!/(^|;|\s)inset:/.test(r.body)) continue
      expect(r.selectors.every((s) => s.endsWith('::before'))).toBe(true)
      expect(r.body).toMatch(/pointer-events:\s*none/)
    }
  })

  it('決定162：hp-bar-quarter の赤い外周を残す', () => {
    const quarter = rules().find((r) => r.selectors.some((s) => s.endsWith('.hp-bar.hp-bar-quarter')))
    expect(quarter?.body).toMatch(/#ff5c5c99/)
    expect(quarter?.body).toMatch(/#ff5c5c55/)
  })

  it('pill（999px）を名札・ゲージ・バッジに残さない', () => {
    expect(source).not.toMatch(/999px/)
    for (const sel of ['.hp-bar', '.resonance-gauge', '.enemy-plate .badge', '.player-plate .badge', '.god-otomo-plate .god-passive-badge']) {
      const r = rules().find((x) => x.selectors.some((s) => s.endsWith(sel)))
      expect(r?.body, sel).toMatch(/border-radius:\s*[23]px/)
    }
  })

  it('backdrop-filter を増やさない（性能・決定225）', () => {
    expect(source).not.toMatch(/backdrop-filter/)
  })

  it('決定224：READY の金（#ffd166）を HUD に使わない（金縁は一段暗い #b8914a／#e2bd6a）', () => {
    expect(source.toLowerCase()).not.toContain('#ffd166')
  })
})
