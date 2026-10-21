/**
 * Threat Branch Pilot v1（`docs/LANE1_THREAT_BRANCH_PILOT_V1.md`）＋将軍家 Pilot v0.4（`docs/SHOGUNATE_PILOT_V0_4.md`）：
 * Pilot 専用の敵選択経路のスイッチ。
 *
 * URL の `?pilot=` に Pilot の名前が入っているときだけ、Enemy Select にその Pilot の敵が並ぶ。
 *   - `?pilot=threat`     … Threat Branch Pilot（`PILOT_ENEMIES`・enemy_09）
 *   - `?pilot=shogunate`  … 将軍家 Pilot（`SHOGUNATE_ENEMIES`・enemy_08 忠次）
 *   - `?pilot=all` または `?pilot=threat,shogunate`（カンマ区切り・`pilot` の複数指定も可）… 両方
 * 通常の URL では既存 7 体のまま＝既存プレイヤーの導線・seed・Daily・Records・Save に影響しない。
 * 値はページ読み込み時に 1 回だけ読む（SPA 内の遷移で URL は変わらない）。
 * v0.4 で忠次 Pilot の `shogunatePilot.ts`（値 `shogunate` だけを見る同型のスイッチ）をここへ一本化した。
 * 同じキーで排他にすると 1 つの URL で両 Pilot を比べられないため、値は「集合」として読む。
 */
export const PILOT_QUERY_KEY = 'pilot'
/** Threat Branch Pilot v1 の値（既存の受入スクリプト `scripts/lane1-threat-branch/acceptance.mjs` が参照する） */
export const PILOT_QUERY_VALUE = 'threat'

export type PilotKind = 'threat' | 'shogunate'
export const PILOT_KINDS: readonly PilotKind[] = ['threat', 'shogunate']
const PILOT_ALL = 'all'

function isPilotKind(value: string): value is PilotKind {
  return (PILOT_KINDS as readonly string[]).includes(value)
}

/** 純関数：検索文字列（`location.search`）から有効な Pilot の集合を読む（不明な値は無視・例外時は空） */
export function parsePilotFlags(search: string): ReadonlySet<PilotKind> {
  const kinds = new Set<PilotKind>()
  try {
    for (const raw of new URLSearchParams(search).getAll(PILOT_QUERY_KEY)) {
      for (const token of raw.split(',')) {
        const value = token.trim()
        if (value === PILOT_ALL) for (const k of PILOT_KINDS) kinds.add(k)
        else if (isPilotKind(value)) kinds.add(value)
      }
    }
  } catch {
    kinds.clear()
  }
  return kinds
}

/** 純関数：検索文字列から、その Pilot が有効かを判定する（既定は Threat Branch Pilot＝従来の `parsePilotFlag(search)` と同じ） */
export function parsePilotFlag(search: string, kind: PilotKind = 'threat'): boolean {
  return parsePilotFlags(search).has(kind)
}

let cached: ReadonlySet<PilotKind> | null = null

function enabledKinds(): ReadonlySet<PilotKind> {
  if (cached === null) {
    cached = typeof window !== 'undefined' && typeof window.location?.search === 'string' ? parsePilotFlags(window.location.search) : new Set()
  }
  return cached
}

/** その Pilot が有効か（既定は Threat Branch Pilot＝従来の `isPilotEnabled()` と同じ） */
export function isPilotEnabled(kind: PilotKind = 'threat'): boolean {
  return enabledKinds().has(kind)
}

/** テスト専用：キャッシュを捨てる */
export function resetPilotFlagForTest(): void {
  cached = null
}
