/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 決定238 候補 カード文字はみ出し Hotfix（docs/CARD_TEXT_OVERFLOW_HOTFIX_PRE_AUDIT.md §4〜5）の契約。
 *
 * 低い SP（`@media (max-width: 899px) and (max-height: 720px)`・カード 100×140px）では
 * 専用札の本文（「◯◯専用」行＋名前＋効果文 3 行＋条件行 4 行）が 140px に入らず、
 * 『姉御の号令』が下端から 12.06px はみ出していた。修正は「その media block の中でだけ
 * 本文内の専用行を出さない」CSS 1 規則。SP 158px／PC・決定236 Art Window の小札
 * （`.card-view > .card-view-god`・本文の外）・珠・READY 層には触れない。ここでソースを機械的に固定する。
 */
const raw = readFileSync(fileURLToPath(new URL('./battle.css', import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')

const LOW_SCREEN_MEDIA = '@media (max-width: 899px) and (max-height: 720px)'
const SELECTOR = 'body.battle-viewport .card-view-body > .card-view-god'

/** media block の中身（最初の `{` から対応する `}` まで） */
function mediaBlockOf(query: string): string {
  const start = css.indexOf(query)
  expect(start).toBeGreaterThanOrEqual(0)
  let depth = 0
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return css.slice(css.indexOf('{', start) + 1, i)
  }
  throw new Error(`unclosed media block: ${query}`)
}

function rulesOf(block: string): Array<{ selectors: string[]; decls: string[] }> {
  const out: Array<{ selectors: string[]; decls: string[] }> = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  for (let m = re.exec(block); m; m = re.exec(block)) {
    out.push({
      selectors: m[1].split(',').map((s) => s.trim()),
      decls: m[2].split(';').map((d) => d.trim()).filter(Boolean),
    })
  }
  return out
}

describe('決定238 候補：低い SP（カード 140px）でだけ本文内の「◯◯専用」行を出さない（CSS 1 規則）', () => {
  it('140px の media block の中に、本文内の専用行だけを display: none にする規則が 1 つある', () => {
    const rules = rulesOf(mediaBlockOf(LOW_SCREEN_MEDIA))
    const hit = rules.filter((r) => r.selectors.includes(SELECTOR))
    expect(hit).toHaveLength(1)
    // 追記規則は display: none 以外を宣言しない（位置・大きさ・色を動かさない）
    expect(hit[0].decls).toEqual(['display: none'])
    expect(hit[0].selectors).toEqual([SELECTOR])
  })

  it('同じ media block の既存規則（カード 140px・手札 padding-top 26px）はそのまま', () => {
    const rules = rulesOf(mediaBlockOf(LOW_SCREEN_MEDIA))
    expect(rules.find((r) => r.selectors.includes('body.battle-viewport .card-view'))?.decls).toEqual(['height: 140px'])
    expect(rules.find((r) => r.selectors.includes('body.battle-viewport .battle-dock-row .hand'))?.decls).toEqual(['padding-top: 26px'])
    expect(rules).toHaveLength(3)
  })

  it('専用行を消す規則は 140px の media block の中にしかない（SP 158px／PC には当たらない）', () => {
    const occurrences = css.split(SELECTOR).length - 1
    expect(occurrences).toBe(1)
    // selector は「本文の中の行」だけを指す。決定236 Art Window の小札（.card-view > .card-view-god）は本文の外なので当たらない
    expect(SELECTOR).toContain('.card-view-body >')
    expect(css).not.toMatch(/\.card-view\s*>\s*\.card-view-god\s*\{[^}]*display:\s*none/)
    expect(css).not.toMatch(/\.card-view-artwin[^{]*\.card-view-god\s*\{[^}]*display:\s*none/)
  })

  it('専用札の既存装飾（金の縁・専用行の色と大きさ）は変えない', () => {
    expect(css).toMatch(/\.card-view-exclusive\s*\{[^}]*outline:\s*1px solid #ffd16655/)
    expect(css).toMatch(/\n\.card-view-god\s*\{[^}]*font-size:\s*10px;[^}]*color:\s*#ffd166/)
    expect(css).toMatch(/body\.battle-viewport \.card-view-god\s*\{\s*font-size:\s*9px;\s*\}/)
  })
})
