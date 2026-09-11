/** prefers-reduced-motion: reduce か（ブラウザ外・matchMedia 非対応では false） */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
