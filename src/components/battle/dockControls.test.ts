/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import divinationPanel from './DivinationPanel.tsx?raw'

/**
 * Dock Controls Plate v1（metric-locked）（docs/DOCK_CONTROLS_PRE_AUDIT.md §6・§7-1 A6〜A8）の契約。
 *
 * このファイルは「託宣バー・ラウンドを終える・ログの 形／材質／書体／行送り／折返し」だけを変える。
 * ドックの高さ・押下の反応（press.css・決定200）・focus-visible・disabled・reduced-motion を動かすと、
 * 決定164（一画面固定）・決定170（タッチ 44px）・決定200（sticky hover）の Gate をやり直すことになるため、
 * ソースそのものを検査して機械的に固定する。
 * 実際の寸法差（ドック外 |Δ| ≤ 0.5px・高さ差 0）はヘッドレス実測（scripts/dock-controls-audit/）が担当する。
 */

/** CSS は Vite の CSS パイプラインを通ると `?raw` でも空になるため、実ファイルを読む */
const css = readFileSync(fileURLToPath(new URL('./dockControls.css', import.meta.url)), 'utf8')
const source = css.replace(/\/\*[\s\S]*?\*\//g, '')

type Rule = { media: string | null; selectors: string[]; body: string }

/** `@media (...) { セレクタ { 宣言 } }` を 1 段だけ解く（このファイルはネスト 1 段まで） */
function rules(): Rule[] {
  const out: Rule[] = []
  let i = 0
  const readRules = (text: string, media: string | null) => {
    const re = /([^{}]+)\{([^{}]*)\}/g
    for (let m = re.exec(text); m; m = re.exec(text)) {
      out.push({ media, selectors: m[1].split(',').map((s) => s.trim()).filter(Boolean), body: m[2] })
    }
  }
  while (i < source.length) {
    const at = source.indexOf('@media', i)
    if (at < 0) {
      readRules(source.slice(i), null)
      break
    }
    readRules(source.slice(i, at), null)
    const open = source.indexOf('{', at)
    const media = source.slice(at + '@media'.length, open).trim()
    let depth = 1
    let j = open + 1
    while (depth > 0 && j < source.length) {
      if (source[j] === '{') depth++
      else if (source[j] === '}') depth--
      j++
    }
    readRules(source.slice(open + 1, j - 1), media)
    i = j
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

const SP = '(max-width: 899px)'
const HOVER = '(hover: hover) and (pointer: fine)'

describe('Dock Controls Plate v1：ドックの形・材質・書体・行送り・折返しだけ', () => {
  it('DivinationPanel から読み込まれる（battle.css・BattleScreen には触れない）', () => {
    expect(divinationPanel).toMatch(/^import '\.\/dockControls\.css'/m)
  })

  it('A6：全セレクタが body.battle-viewport .battle-dock で始まる（チュートリアル・結果画面に漏れない）', () => {
    const all = rules().flatMap((r) => r.selectors)
    expect(all.length).toBeGreaterThan(0)
    for (const s of all) expect(s, s).toMatch(/^body\.battle-viewport \.battle-dock /)
  })

  it('A6：動き・透明度・focus 表現・文字サイズ・太さを 1 つも宣言しない', () => {
    const forbidden = /^(transform|translate|scale|rotate|opacity|outline|transition|animation|font-size|font-weight|font$|filter)/
    const hits: string[] = []
    for (const r of rules()) for (const p of properties(r.body)) if (forbidden.test(p)) hits.push(`${r.selectors[0]} → ${p}`)
    expect(hits).toEqual([])
  })

  it('A6：寸法プロパティは許可リストだけ（SP の操作列 +10px・PC の内側余白・行送り・見出しアイコン）', () => {
    const dimension =
      /^(width|height|min-|max-|padding|margin|gap|row-gap|column-gap|top$|right$|bottom$|left$|inset|position|display|flex|grid|order|z-index|border-width|border$|border-(top|right|bottom|left)$|letter-spacing|white-space|overflow)/
    const allowed = (r: Rule, p: string): boolean => {
      const sel = r.selectors.join(',')
      if (p === 'line-height') return true
      if (sel.endsWith('.divination-panel-glyph')) return ['display', 'width', 'height', 'margin-right'].includes(p)
      if (r.media === null && sel.endsWith('.end-round-button')) return p === 'padding-left' || p === 'padding-right'
      if (r.media === SP) {
        if (sel.endsWith('.divination-panel')) return p === 'padding-right'
        if (sel.endsWith('.battle-dock-actions')) return p === 'width'
        if (sel.endsWith('.end-round-button')) return p === 'padding'
      }
      return false
    }
    const hits: string[] = []
    for (const r of rules()) {
      for (const p of properties(r.body)) if (dimension.test(p) && !allowed(r, p)) hits.push(`${r.media ?? '-'} ${r.selectors[0]} → ${p}`)
    }
    expect(hits).toEqual([])
  })

  it('SP の操作列は 106px（終了 58 ＋ 4 ＋ ログ 44）、託宣パネルの右予約は 116px（+10 ずつ）', () => {
    const sp = rules().filter((r) => r.media === SP)
    expect(sp.find((r) => r.selectors[0].endsWith('.battle-dock-actions'))?.body).toMatch(/width:\s*106px/)
    expect(sp.find((r) => r.selectors[0].endsWith('.divination-panel'))?.body).toMatch(/padding-right:\s*116px/)
  })

  it('A3：「ラウンドを終える」は句で折る（auto-phrase）', () => {
    const end = rules().find((r) => r.media === null && r.selectors[0].endsWith('.end-round-button'))
    expect(end?.body).toMatch(/word-break:\s*auto-phrase/)
  })

  it('A7：:hover はすべて (hover: hover) and (pointer: fine) の中（決定200）', () => {
    const hovers = rules().filter((r) => r.selectors.some((s) => s.includes(':hover')))
    expect(hovers.length).toBeGreaterThan(0)
    for (const r of hovers) expect(r.media, r.selectors[0]).toBe(HOVER)
  })

  it('A8：DivinationPanel に絵文字が無い（見出しは既存 GlyphIcon の eye）', () => {
    expect(divinationPanel).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(divinationPanel).toMatch(/<GlyphIcon glyph="eye" className="divination-panel-glyph" \/>託宣（残り/)
  })
})
