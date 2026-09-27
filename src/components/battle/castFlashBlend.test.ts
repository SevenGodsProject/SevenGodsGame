/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 決定237 Cast Flash Blend Hotfix（docs/CARD_PLAY_TRAVEL_PRE_AUDIT.md §2 R2・§10）の契約。
 *
 * .cast-flash は position: fixed で独立した合成グループになるため、子 .cast-flash-art の
 * mix-blend-mode: screen だけでは黒地 PNG が舞台と合成されず黒い四角が出る。
 * 修正は「.cast-flash 自身に mix-blend-mode: screen を 1 宣言足す」だけで、
 * 位置・大きさ・時間・z-index・reduced-motion は変えない。ここでソースを機械的に固定する。
 */
const raw = readFileSync(fileURLToPath(new URL('./battle.css', import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')

function bodiesOf(selector: string): string[] {
  const out: string[] = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  for (let m = re.exec(css); m; m = re.exec(css)) {
    const selectors = m[1].split(',').map((s) => s.trim())
    if (selectors.includes(selector)) out.push(m[2])
  }
  return out
}

describe('決定237 Cast Flash Blend Hotfix：合成をコンテナへ移す（CSS 1 宣言）', () => {
  it('.cast-flash に mix-blend-mode: screen があり、末尾の追記ブロックにだけ書かれている', () => {
    const bodies = bodiesOf('.cast-flash')
    const withBlend = bodies.filter((b) => /mix-blend-mode:\s*screen/.test(b))
    expect(withBlend).toHaveLength(1)
    // 追記ブロックは mix-blend-mode 以外を宣言しない（位置・大きさ・z-index を動かさない）
    const decls = withBlend[0].split(';').map((d) => d.trim()).filter(Boolean)
    expect(decls).toEqual(['mix-blend-mode: screen'])
    // 追記ブロックは既存の .cast-flash 規則（fixed・z-index: 8）より後ろにある
    expect(raw.lastIndexOf('.cast-flash {\n  mix-blend-mode: screen;')).toBeGreaterThan(raw.indexOf('z-index: 8;'))
  })

  it('既存の .cast-flash（fixed・inset 0・z-index 8）と .cast-flash-art の screen は変わらない', () => {
    const base = bodiesOf('.cast-flash').find((b) => /position:\s*fixed/.test(b))
    expect(base).toBeDefined()
    expect(base).toMatch(/inset:\s*0/)
    expect(base).toMatch(/z-index:\s*8/)
    expect(base).not.toMatch(/isolation/)
    const art = bodiesOf('.cast-flash-art')
    expect(art.some((b) => /mix-blend-mode:\s*screen/.test(b))).toBe(true)
    expect(art.some((b) => /width:\s*320px/.test(b) && /height:\s*320px/.test(b))).toBe(true)
  })

  it('時間は変えない（cast-flash-pop 0.35s・attack 0.4s・payoff の金の輪 0.35s）', () => {
    expect(css).toMatch(/\.cast-flash-icon\s*\{[^}]*animation:\s*cast-flash-pop 0\.35s/)
    expect(css).toMatch(/\.cast-flash-attack \.cast-flash-art\s*\{[^}]*cast-flash-pop-attack 0\.4s/)
    expect(css).toMatch(/\.cast-flash-payoff::after\s*\{[^}]*cast-payoff-ring 0\.35s/)
    // reduced-motion では決定224 の金の輪を消す既存規則がそのまま残る
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*\.cast-flash-payoff::after,[^}]*display:\s*none/)
  })
})
