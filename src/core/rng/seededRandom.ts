/**
 * シード付き乱数。
 *
 * ★不変ルール2：core では Math.random() を使いません。
 *
 * 「種（seed）」が同じなら、同じ順番で呼び出す限り必ず同じ数列が出ます。
 * これにより「同じ操作を再生すれば必ず同じ結果になる」が保証され、
 * リプレイ・バグ再現・自動テストが可能になります。
 *
 * アルゴリズム: mulberry32（軽量で十分な品質を持つ擬似乱数生成器）
 */

export type Rng = {
  /** 0以上1未満の乱数を返す */
  next: () => number
  /** min以上max未満の整数を返す */
  nextInt: (min: number, max: number) => number
  /** 配列をシャッフルした「新しい配列」を返す（元の配列は変更しない） */
  shuffle: <T>(items: T[]) => T[]
  /**
   * このRngが作られてから next() が呼ばれた回数。
   * GameState.rngCursor に加算することで、次回 createRng(seed, cursor) から
   * 続きを再現できます（リプレイ・巻き戻しの要）。
   */
  callCount: () => number
}

/** 文字列のシードを32bit整数に変換する */
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

/** mulberry32本体。呼ぶたびに次の乱数と次の内部状態を返す */
function mulberry32(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, t]
}

/**
 * シードから Rng を作ります。
 * cursor を渡すと、その回数ぶん進めた状態から再開できます
 * （リプレイ再生時に GameState.rngCursor から復元するため）。
 */
export function createRng(seed: string, cursor = 0): Rng {
  let state = hashSeed(seed)
  for (let i = 0; i < cursor; i++) {
    ;[, state] = mulberry32(state)
  }

  let calls = 0

  const next = (): number => {
    const [value, nextState] = mulberry32(state)
    state = nextState
    calls += 1
    return value
  }

  const nextInt = (min: number, max: number): number =>
    min + Math.floor(next() * (max - min))

  const shuffle = <T>(items: T[]): T[] => {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i--) {
      const j = nextInt(0, i + 1)
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  return { next, nextInt, shuffle, callCount: () => calls }
}
