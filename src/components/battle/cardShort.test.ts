/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Cost-Short Marking v1 の契約（ソースを機械的に固定する・cardGodLabelLowscreen.test.ts と同形式）。
 * 「あとN」は表示専用：`disabled` 判定・engine・battle.css・probe（`:disabled` 依存）を一切変えない。
 */
const read = (f: string) => readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
const tsx = read('./CardView.tsx')
const css = read('./cardShort.css').replace(/\/\*[\s\S]*?\*\//g, '')

describe('Cost-Short Marking v1：CardView.tsx', () => {
  it('disabled 判定は従来のまま（apCurrent は表示にしか使わない）', () => {
    expect(tsx).toContain('disabled={!playable || !affordable}')
    expect(tsx).not.toMatch(/disabled=\{[^}]*apCurrent/)
  })
  it('short は playable・!affordable・!playing・apCurrent 既知のときだけ（敵ターン・使用中は 0）', () => {
    expect(tsx).toMatch(/const short = playable && !affordable && !playing && apCurrent !== undefined \? Math\.max\(1, cost - apCurrent\) : 0/)
    expect(tsx).toContain("${short > 0 ? ' card-view-short' : ''}")
    expect(tsx).toMatch(/\{short > 0 && \(\s*<span className="card-view-short-tag"/)
  })
  it('inline opacity：使える札 1・敵ターン .45・神力不足（自分のターン）は CSS に委ねる', () => {
    expect(tsx).toContain('opacity: playing ? undefined : affordable ? 1 : playable ? undefined : 0.45')
  })
  it('cardShort.css を読み込み、src/core への依存を増やしていない', () => {
    expect(tsx).toContain("import './cardShort.css'")
    const coreImports = tsx.match(/from '\.\.\/\.\.\/core\/[^']+'/g) ?? []
    expect(coreImports).toEqual(["from '../../core/types'", "from '../../core/data/cards'", "from '../../core/data/gods'", "from '../../core/data/cardArt'"])
  })
})

describe('Cost-Short Marking v1：cardShort.css', () => {
  it('.hand・transform・animation・transition を含まない（手札の箱・既存の動きに触れない）', () => {
    expect(css).not.toMatch(/\.hand\b/)
    expect(css).not.toMatch(/\b(transform|animation|transition)\b/)
  })
  it('帯の文字は 10px 以上・pointer-events:none・short 時の札 opacity は .7', () => {
    const size = css.match(/font-size:\s*([\d.]+)px/)
    expect(size && Number(size[1])).toBeGreaterThanOrEqual(10)
    expect(css).toMatch(/\.card-view-short-tag\s*\{[^}]*pointer-events:\s*none/)
    expect(css).toMatch(/\.card-view\.card-view-short:disabled:not\(\.card-view-playing\)\s*\{\s*opacity:\s*0\.7;?\s*\}/)
  })
})
