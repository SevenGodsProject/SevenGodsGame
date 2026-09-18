import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 決定200 Interaction Feel v1：押した瞬間の手応えの規則をソースで固定する。
 *
 * React を描画するテスト基盤が無いため、`matchupWiring.test.ts`・`solveLoopWiring.test.ts` と
 * 同じく CSS / TSX のソースを直接検査する（CSS は Vite が空にするため `battleViewportLayout.test.ts` と同じく実ファイルを読む）。
 *
 * ここで守るのは 3 つ：
 *   1. 押下状態（`:active`）と touch 作法が **press.css の 1 か所** にある
 *   2. **transform / box-shadow を動かす `:hover` が 1 つ残らず** hover 可能なポインタに限定されている
 *      （touch で「押したあと浮いたまま」にならない＝決定199 で実測した sticky hover の再発防止）
 *   3. 動きを減らす設定でも **押した状態そのものは消えない**
 */
/** CSS は Vite の CSS パイプラインを通ると `?raw` でも空になるため、実ファイルを読む
 *  （`battleViewportLayout.test.ts` と同じ方式） */
const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')

/** 監査対象の CSS 全部（この一覧に無いファイルは sticky hover 検査の対象外になるので、増やしたら足す） */
const CSS_FILES = [
  './press.css',
  './polish.css',
  './tutorial.css',
  './battle/battle.css',
  './setup/setup.css',
  './setup/daily.css',
  './feedback/feedback.css',
  '../index.css',
  '../App.css',
] as const
const CSS: Record<string, string> = Object.fromEntries(CSS_FILES.map((f) => [f, read(f)]))

const press = CSS['./press.css']

/** `@media (hover: hover) and (pointer: fine)` ブロックの [開始, 終了] 位置 */
function hoverGuardRanges(src: string): [number, number][] {
  const ranges: [number, number][] = []
  const re = /@media \(hover: hover\) and \(pointer: fine\) \{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    let depth = 0
    let i = m.index + m[0].length - 1
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') {
        depth--
        if (depth === 0) break
      }
    }
    ranges.push([m.index, i])
  }
  return ranges
}

/** transform か box-shadow を「none 以外」に変える :hover のうち、guard の外にあるもの */
function unguardedMovingHovers(file: string, src: string): string[] {
  const guards = hoverGuardRanges(src)
  const inGuard = (p: number) => guards.some(([a, b]) => p >= a && p <= b)
  const out: string[] = []
  const rule = /([^{}]*:hover[^{}]*)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = rule.exec(src)) !== null) {
    const body = m[2]
    const t = /transform:\s*([^;]+);/.exec(body)
    const b = /box-shadow:\s*([^;]+)/.exec(body)
    const movesTransform = t !== null && !/^none/.test(t[1].trim())
    const movesShadow = b !== null && !/^none/.test(b[1].trim())
    if ((movesTransform || movesShadow) && !inGuard(m.index)) {
      out.push(`${file} :: ${m[1].trim().split('\n').pop()}`)
    }
  }
  return out
}

describe('press.css（決定200）', () => {
  it('touch の作法が入っている（ダブルタップ拡大・端末既定のハイライト・長押し選択を止める）', () => {
    expect(press).toMatch(/touch-action:\s*manipulation/)
    expect(press).toMatch(/-webkit-tap-highlight-color:\s*transparent/)
    expect(press).toMatch(/user-select:\s*none/)
  })

  it('Tier 1（頻繁に押すもの）に押下状態がある：手札カード・神託・デッキ ±', () => {
    const t1 = /\.card-view:not\(:disabled\):not\(\.card-view-playing\):active[\s\S]*?\{([\s\S]*?)\}/.exec(press)
    expect(t1, 'カードの :active が無い').not.toBeNull()
    expect(t1?.[1]).toMatch(/transform:\s*translateY\(1px\) scale\(0\.985\)/)
    for (const sel of ['.divination-choice', '.deck-builder-card-stepper button', '.battle-log-toggle']) {
      expect(press, `${sel} の :active が無い`).toContain(`${sel}:not(:disabled):active`)
    }
  })

  it('Tier 2（決定を伴うもの）に押下状態がある：Home Primary・開始・神／敵・結果・報酬', () => {
    const t2 = /\.home-cta-primary:not\(:disabled\):active[\s\S]*?\{([\s\S]*?)\}/.exec(press)
    expect(t2, 'Home Primary の :active が無い').not.toBeNull()
    expect(t2?.[1]).toMatch(/transform:\s*scale\(0\.97\)/)
    expect(t2?.[1]).toMatch(/filter:\s*brightness\(0\.94\)/)
    for (const sel of [
      '.god-select-card',
      '.god-select-confirm',
      '.difficulty-option',
      '.enemy-select-card',
      '.deck-builder-actions button',
      '.end-round-button',
      '.reward-card',
    ]) {
      expect(press, `${sel} の :active が無い`).toContain(`${sel}:not(:disabled):active`)
    }
    expect(press).toContain('.game-over-card button:not(.result-link):not(:disabled):active')
  })

  it('押し込みは 60ms 以内（長い press アニメーションを作らない）', () => {
    const durations = [...press.matchAll(/transition:\s*([\s\S]*?);/g)]
      .flatMap((m) => [...m[1].matchAll(/(\d+)ms/g)].map((d) => Number(d[1])))
    expect(durations.length).toBeGreaterThan(0)
    expect(Math.max(...durations)).toBeLessThanOrEqual(60)
  })

  it('押せないカードが見て分かる（inline opacity と衝突しない filter を使う）', () => {
    const rule = /\.card-view:disabled:not\(\.card-view-playing\)\s*\{([\s\S]*?)\}/.exec(press)
    expect(rule, 'disabled カードの手掛かりが無い').not.toBeNull()
    expect(rule?.[1]).toMatch(/filter:\s*grayscale/)
    // opacity は CardView が inline で持っているため CSS からは触らない（!important を使わない）
    expect(rule?.[1]).not.toMatch(/opacity/)
    expect(press).not.toMatch(/!important/)
  })

  it('キーボードの現在地が分かる（focus-visible）', () => {
    expect(press).toMatch(/:focus-visible[\s\S]*?\{[\s\S]*?outline:\s*2px solid #ffd166/)
    // 敵選択カードには既に専用の金枠があるので重複させない
    expect(press).not.toContain('.enemy-select-card:focus-visible')
  })

  it('動きを減らす設定でも「押した状態」は残す（時間だけ 0 にする）', () => {
    const block = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*)\}/.exec(press)
    expect(block, 'reduced-motion のブロックが無い').not.toBeNull()
    expect(block?.[1]).toMatch(/transition-duration:\s*0s/)
    // transform / filter を打ち消していない＝押したことは分かる
    expect(block?.[1]).not.toMatch(/transform:\s*none/)
    expect(block?.[1]).not.toMatch(/filter:\s*none/)
  })
})

describe('sticky hover の再発防止（決定200）', () => {
  it('transform / box-shadow を動かす :hover は 1 つ残らず hover 可能なポインタ限定になっている', () => {
    const bad = Object.entries(CSS).flatMap(([k, src]) => unguardedMovingHovers(k, src))
    expect(bad, `guard の外に残っている hover:\n${bad.join('\n')}`).toEqual([])
  })

  it('主要な hover が実際に guard の中にある（空振りしていないことの確認）', () => {
    const battle = CSS['./battle/battle.css']
    const setup = CSS['./setup/setup.css']
    const inGuard = (src: string, needle: string) => {
      const at = src.indexOf(needle)
      expect(at, `見つからない: ${needle}`).toBeGreaterThan(-1)
      return hoverGuardRanges(src).some(([a, b]) => at >= a && at <= b)
    }
    expect(inGuard(battle, '.card-view:not(:disabled):hover {')).toBe(true)
    expect(inGuard(battle, '.end-round-button:not(:disabled):hover,')).toBe(true)
    expect(inGuard(battle, '.reward-card:not(:disabled):hover {')).toBe(true)
    expect(inGuard(setup, '.god-select-card:hover {')).toBe(true)
    expect(inGuard(setup, '.home-cta-primary:hover {')).toBe(true)
    expect(inGuard(setup, '.enemy-select-card:hover {')).toBe(true)
  })

  it('キーボードの :focus-visible は guard の外に残っている（端末を問わず効く）', () => {
    const setup = CSS['./setup/setup.css']
    const at = setup.indexOf('.enemy-select-card:focus-visible {')
    expect(at).toBeGreaterThan(-1)
    expect(hoverGuardRanges(setup).some(([a, b]) => at >= a && at <= b)).toBe(false)
  })
})

describe('読み込み配線（決定200）', () => {
  it('App が press.css を最後に読み込む（既存 CSS のあとに載る）', () => {
    const app = read('../App.tsx')
    expect(app).toContain("import './components/press.css'")
    expect(app.indexOf("import './components/press.css'")).toBeGreaterThan(app.indexOf("import './App.css'"))
  })
})
