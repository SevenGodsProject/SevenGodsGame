/**
 * A11y Minimum Pack（A11Y-01）：WCAG 2.x のコントラスト比（純粋関数・DOM 非依存）。
 * CSS の色文字列（#rgb／#rrggbb／#rrggbbaa／rgb()／rgba()）を読み、半透明の pill を fill の上に
 * 合成した実効背景に対する文字色の比を出す。テスト（a11yMinimum.test.ts）と Playwright 計測の両方が使う。
 */
export type Rgba = { r: number; g: number; b: number; a: number }

export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase()
  const hex = s.match(/^#([0-9a-f]{3,8})$/)
  if (hex) {
    const h = hex[1]!
    if (h.length === 3 || h.length === 4) {
      const [r, g, b, a] = h.split('').map((c) => parseInt(c + c, 16))
      return { r: r!, g: g!, b: b!, a: h.length === 4 ? a! / 255 : 1 }
    }
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
      return { r, g, b, a }
    }
    return null
  }
  const fn = s.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/)
  if (fn) {
    const a = fn[4] === undefined ? 1 : fn[4].endsWith('%') ? parseFloat(fn[4]) / 100 : parseFloat(fn[4])
    return { r: +fn[1]!, g: +fn[2]!, b: +fn[3]!, a }
  }
  return null
}

/** fg（半透明可）を bg（不透明扱い）の上に置いたときの色 */
export function composite(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }
}

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** 相対輝度（WCAG 2.x） */
export function luminance(c: Rgba): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b)
}

/** コントラスト比（1〜21）。text・bg とも不透明として扱う */
export function contrastRatio(text: Rgba, bg: Rgba): number {
  const l1 = luminance(text), l2 = luminance(bg)
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * HP 数字のコントラスト：文字色 `text` を、`pill`（半透明）を `fill` の上に合成した背景に対して測る。
 * 文字列はそのまま CSS の値を渡せる。解析できなければ null
 */
export function labelContrastOnFill(text: string, pill: string, fill: string): number | null {
  const t = parseColor(text), p = parseColor(pill), f = parseColor(fill)
  if (!t || !p || !f) return null
  return contrastRatio({ ...t, a: 1 }, composite(p, { ...f, a: 1 }))
}
