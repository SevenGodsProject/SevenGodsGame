/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * v1.0.3 RC（Lane 8 `MOBILE_UX_AUDIT_V1.md` §4 案 F）：SP の手札本文（`.card-view-text`）の実効値。
 * - 158px 札（`@media (max-width: 899px)` の本体）：9px → 9.5px
 * - 140px 札（`(max-width: 899px) and (max-height: 720px)`）：9px に据え置き（決定238 の余白 −5.5px）
 * - 条件行 `.card-view-bonus` 9px／PC（battle-viewport 既定）9.5px は不変
 * CSS の宣言を直接読む（ブラウザ実測は `scripts/v1_0_3-rc/sp-text-check.mjs` が PM 直列で行う）
 */
const raw = readFileSync(fileURLToPath(new URL('./battle.css', import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')

/** 指定クエリで始まる media block を全部（中身）返す */
function mediaBlocks(query: string): string[] {
  const out: string[] = []
  let from = 0
  for (;;) {
    const start = css.indexOf(query, from)
    if (start < 0) return out
    // 「(max-width: 899px)」の直後に「 and」が続く block（720px 側）を本体から除く
    const open = css.indexOf('{', start)
    const head = css.slice(start, open)
    let depth = 0
    let end = -1
    for (let i = open; i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}' && --depth === 0) { end = i; break }
    }
    if (end < 0) throw new Error(`unclosed media block: ${query}`)
    out.push(head.trim() === query ? css.slice(open + 1, end) : `@@${head.trim()}@@${css.slice(open + 1, end)}`)
    from = end + 1
  }
}

const TEXT_RULE = /body\.battle-viewport \.card-view-text\s*\{([^}]*)\}/g
function textFontSizes(block: string): string[] {
  const sizes: string[] = []
  for (let m = TEXT_RULE.exec(block); m; m = TEXT_RULE.exec(block)) {
    const fs = /font-size:\s*([\d.]+px)/.exec(m[1])
    if (fs) sizes.push(fs[1])
  }
  return sizes
}

describe('v1.0.3 RC：SP 手札本文 9px → 9.5px（158px 札のみ・140px 札は 9px 据え置き）', () => {
  const sp = mediaBlocks('@media (max-width: 899px)').filter((b) => !b.startsWith('@@'))
  const low = mediaBlocks('@media (max-width: 899px) and (max-height: 720px)').filter((b) => !b.startsWith('@@'))

  it('158px 札の block（max-width: 899px 本体）で本文は 9.5px（1 回だけ宣言）', () => {
    const block = sp.find((b) => /\.card-view\s*\{[^}]*height:\s*158px/.test(b))
    expect(block).toBeDefined()
    expect(textFontSizes(block as string)).toEqual(['9.5px'])
    // 本体 block 全体でも本文の font-size 宣言は 1 回
    expect(sp.flatMap(textFontSizes)).toEqual(['9.5px'])
  })

  it('140px 札の block（max-height: 720px）で本文は 9px のまま', () => {
    expect(low.flatMap(textFontSizes)).toEqual(['9px'])
  })

  it('条件行 9px・PC 既定 9.5px は不変', () => {
    expect(css).toMatch(/\nbody\.battle-viewport \.card-view-text\s*\{\s*font-size:\s*9\.5px;\s*line-height:\s*1\.3;\s*\}/)
    expect(css).toMatch(/\nbody\.battle-viewport \.card-view-bonus\s*\{\s*font-size:\s*9px;/)
    // SP 側で条件行の font-size を上書きしていない
    for (const b of [...sp, ...low]) expect(b).not.toMatch(/\.card-view-bonus\s*\{[^}]*font-size/)
  })
})
