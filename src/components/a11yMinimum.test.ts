/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { composite, contrastRatio, labelContrastOnFill, parseColor } from './a11y/contrast'

/**
 * A11y Minimum Pack v1（A11Y-01／02・docs/A11Y_MINIMUM_STANDARD.md）の契約。
 * React を描画する基盤が無いため、配線はソース固定で、コントラストは CSS の値から純粋関数で検査する
 * （CSS は battleEntrance.test.ts と同じく node:fs で読む）。
 * 実ブラウザでの寸法・Esc・フォーカスは scripts/a11y-minimum-pack/acceptance.mjs が担当する。
 */
const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
/** `セレクタ {` の本文（最初の 1 つ） */
const block = (css: string, selector: string): string => {
  const at = css.indexOf(selector + ' {')
  expect(at, `selector not found: ${selector}`).toBeGreaterThanOrEqual(0)
  return css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at))
}

describe('A11Y-01 神 HP／敵 HP の数字のコントラスト ≥ 4.5:1', () => {
  const battleCss = read('./battle/battle.css')
  const pill = block(battleCss, '.hp-bar-label-text').match(/background:\s*([^;]+);/)?.[1]?.trim()
  const text = block(battleCss, '.hp-bar-label').match(/color:\s*([^;]+);/)?.[1]?.trim()
  const godFill = read('./battle/PlayerPanel.tsx').match(/<HpBar[^>]*color="(#[0-9a-fA-F]{6})"/)?.[1]
  const enemyFill = read('./battle/EnemyPanel.tsx').match(/<HpBar[^>]*color="(#[0-9a-fA-F]{6})"/)?.[1]
  const trough = block(battleCss, '.hp-bar').match(/background:\s*([^;]+);/)?.[1]?.trim()

  it('HpBar は数字を .hp-bar-label-text（暗い pill）で包む', () => {
    expect(read('./battle/HpBar.tsx')).toMatch(/<span className="hp-bar-label-text">/)
    expect(pill, 'pill の background').toBeDefined()
    const p = parseColor(pill!)!
    expect(p.a).toBeGreaterThanOrEqual(0.7)
    expect(block(battleCss, '.hp-bar-label-text')).toMatch(/border-radius:\s*999px/)
  })

  it('白文字 × pill × 緑（神）／赤（敵）／溝 のすべてで 4.5:1 以上（従来 1.96／3.24）', () => {
    expect(text).toBe('#e8e9f3')
    expect(godFill).toBe('#4dbd74')
    expect(enemyFill).toBe('#e5484d')
    for (const fill of [godFill!, enemyFill!, trough!]) {
      const ratio = labelContrastOnFill(text!, pill!, fill)
      expect(ratio, `fill ${fill}`).not.toBeNull()
      expect(ratio!, `fill ${fill}`).toBeGreaterThanOrEqual(4.5)
    }
    // 参考：pill が無いときの従来値（決定264 の実測どおり 4.5 未満）
    expect(contrastRatio(parseColor(text!)!, parseColor(godFill!)!)).toBeLessThan(2.1)
    expect(contrastRatio(parseColor(text!)!, parseColor(enemyFill!)!)).toBeLessThan(3.4)
  })

  it('hudPlate.css の艶は外側（.hp-bar-label）に残り、pill の色を上書きしない', () => {
    expect(read('./battle/hudPlate.css')).not.toMatch(/\.hp-bar-label-text/)
  })
})

describe('A11Y-02 タップ領域 ≥ 44px（見た目）', () => {
  const setupCss = read('./setup/setup.css')
  it('デッキ stepper は 44×44（判定の ::after も 44×44）', () => {
    const b = block(setupCss, '.deck-builder-card-stepper button')
    expect(b).toMatch(/width:\s*44px/)
    expect(b).toMatch(/height:\s*44px/)
    const after = block(setupCss, '.deck-builder-card-stepper button::after')
    expect(after).toMatch(/width:\s*44px/)
    expect(after).toMatch(/height:\s*44px/)
  })
  it('最終試練の選択肢は min-height 44px', () => {
    expect(block(setupCss, '.stake-choice-option')).toMatch(/min-height:\s*44px/)
  })
  it('ヘッダーのアイコンボタン・託宣は ::after で 44px 以上の判定を持つ（見た目は不変）', () => {
    expect(block(read('../App.css'), '.app-icon-button::after')).toMatch(/(width|height):\s*44px/)
    expect(block(read('./battle/battle.css'), '.divination-choice::after')).toMatch(/height:\s*4[4-9]px/)
  })
})

describe('A11Y-03 ミュートのアクセシビリティ', () => {
  it('ミュートは名前が固定（「ミュート」）で、状態は aria-pressed だけで伝える', () => {
    const app = read('../App.tsx')
    const btn = app.slice(app.indexOf('onClick={toggleMuted}'), app.indexOf('<SpeakerIcon'))
    expect(btn).toMatch(/aria-label="ミュート"/)
    expect(btn).toMatch(/aria-pressed=\{muted\}/)
    expect(btn).not.toMatch(/aria-label=\{muted/)
  })
  it('キーボードのフォーカスが見える（press.css の focus-visible に含まれる）', () => {
    expect(read('./press.css')).toMatch(/\.app-icon-button:focus-visible/)
  })
})

describe('A11Y-04 Tutorial（遊び方）のキーボード操作', () => {
  const src = read('./TutorialOverlay.tsx')
  it('Esc で閉じる（capture で受けて stopPropagation＝下の Brief を巻き込まない）', () => {
    expect(src).toMatch(/e\.key !== 'Escape'/)
    expect(src).toMatch(/window\.addEventListener\('keydown', onKey, true\)/)
    expect(src).toMatch(/e\.stopPropagation\(\)/)
    expect(src).toMatch(/window\.removeEventListener\('keydown', onKey, true\)/)
  })
  it('初期フォーカスはカード本体（tabIndex -1・preventScroll）、閉じたら元の要素へ戻す', () => {
    expect(src).toMatch(/<div className="tutorial-card" ref=\{cardRef\} tabIndex=\{-1\}>/)
    expect(src).toMatch(/cardRef\.current\?\.focus\(\{ preventScroll: true \}\)/)
    expect(src).toMatch(/return \(\) => previous\?\.focus\(\{ preventScroll: true \}\)/)
  })
  it('Tab はダイアログ内で循環する（focus trap）', () => {
    expect(src).toMatch(/if \(e\.key !== 'Tab'\) return/)
    expect(src).toMatch(/onKeyDown=\{onKeyDown\}/)
    expect(src).toMatch(/last\.focus\(\)/)
    expect(src).toMatch(/first\.focus\(\)/)
  })
  it('role=dialog・aria-modal・aria-label は維持', () => {
    expect(src).toMatch(/role="dialog" aria-modal="true" aria-label="遊び方"/)
  })
  it('カードのフォーカス枠はキーボード操作時だけ（tutorial.css）', () => {
    const css = read('./tutorial.css')
    expect(block(css, '.tutorial-card:focus')).toMatch(/outline:\s*none/)
    expect(block(css, '.tutorial-card:focus-visible')).toMatch(/outline:\s*2px solid #ffd166/)
  })
})

describe('contrast.ts（部品）', () => {
  it('色文字列を読める・合成・比の両端', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(parseColor('#05060bc4')!.a).toBeCloseTo(0xc4 / 255, 3)
    expect(parseColor('rgba(5, 6, 11, 0.77)')).toEqual({ r: 5, g: 6, b: 11, a: 0.77 })
    expect(parseColor('rgb(77 189 116)')).toEqual({ r: 77, g: 189, b: 116, a: 1 })
    expect(parseColor('nope')).toBeNull()
    expect(composite({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 })).toEqual({ r: 127.5, g: 127.5, b: 127.5, a: 1 })
    expect(contrastRatio(parseColor('#fff')!, parseColor('#000')!)).toBeCloseTo(21, 5)
    expect(contrastRatio(parseColor('#777')!, parseColor('#777')!)).toBeCloseTo(1, 5)
  })
})
