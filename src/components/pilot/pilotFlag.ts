/**
 * Threat Branch Pilot v1（`docs/LANE1_THREAT_BRANCH_PILOT_V1.md`）：Pilot 専用の敵選択経路のスイッチ。
 *
 * URL に `?pilot=threat` が付いているときだけ、Enemy Select に Pilot 敵（`PILOT_ENEMIES`）が並ぶ。
 * 通常の URL では既存 7 体のまま＝既存プレイヤーの導線・seed・Daily・Records・Save に影響しない。
 * 値はページ読み込み時に 1 回だけ読む（SPA 内の遷移で URL は変わらない）。
 * 構造は決定274 忠次 Pilot の `shogunatePilot.ts` と同じ。名前だけ汎用にしてある（Pilot ごとに値を変える）。
 */
export const PILOT_QUERY_KEY = 'pilot'
export const PILOT_QUERY_VALUE = 'threat'

/** 純関数：検索文字列（`location.search`）から Pilot 有効かを判定する */
export function parsePilotFlag(search: string): boolean {
  try {
    return new URLSearchParams(search).get(PILOT_QUERY_KEY) === PILOT_QUERY_VALUE
  } catch {
    return false
  }
}

let cached: boolean | null = null

export function isPilotEnabled(): boolean {
  if (cached === null) {
    cached = typeof window !== 'undefined' && typeof window.location?.search === 'string' ? parsePilotFlag(window.location.search) : false
  }
  return cached
}

/** テスト専用：キャッシュを捨てる */
export function resetPilotFlagForTest(): void {
  cached = null
}
