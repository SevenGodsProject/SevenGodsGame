/**
 * 決定39：初回チュートリアルを見たかどうかのフラグ。
 *
 * ゲームデータではなく単なるUI表示済みフラグのため、`battleSaveStorage.ts`等と
 * 違い`version`は持たせない（壊れていても「まだ見ていない」扱いにすれば十分で、
 * 実害が無いため）。
 */

const STORAGE_KEY = 'sevengods.tutorialSeen'

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // 保存できなくてもゲーム自体には影響しないため無視する
  }
}
