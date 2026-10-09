/**
 * RL-01 Save Compatibility Guard（`docs/STORAGE_VERSION_POLICY.md`）。
 *
 * localStorage の「台帳型」key（戦績・絆・神階・神域挑戦・報酬・送信待ち・託宣枠＝積み上がる記録）を
 * **より新しいビルドが書いたデータ**（version が現在より大きい）から守る。
 *
 * 背景：Production を rollback した／新旧ビルドが混在した場合、旧ビルドは未来 version を読めず「空」として
 * 扱い、次の決着で key を丸ごと上書きしていた（= 新ビルドで積んだ 7 柱分の記録が消える）。
 * `matchupStorage.ts`（決定189）は最初から「future＝読まない・書かない」で、本モジュールはその規則を
 * 他の台帳型 key へ広げるための共通部品。
 *
 * - 読み取り側は従来どおり「空」を返す（表示は空になるが、データは残る）
 * - 書き込み側は `setItemGuarded` を通し、未来 version が入っていれば **書かずに false** を返す
 * - スロット型 key（進行中バトル・進行中 run ログ・デッキ設定＝常に 1 件で次の行為が上書きして良いもの）は対象外
 * - `pickValidEntries` は「1 件が壊れていても残りを捨てない」ための共通ヘルパー（部分不正は除外のみ）
 *
 * `src/core` には依存しない（純粋な localStorage ヘルパー）。
 */

/** key に入っている JSON の `version`（数値）。無い・壊れている・数値でない・storage 不可なら null */
export function storedVersion(key: string): number | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const v = (parsed as { version?: unknown }).version
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

/** key に、このビルドより新しい version のデータが入っているか */
export function isFutureStored(key: string, currentVersion: number): boolean {
  const v = storedVersion(key)
  return v !== null && v > currentVersion
}

/**
 * 台帳型 key の書き込み。未来 version が入っていれば書かない（false）。storage 不可・quota 超過も false。
 * 呼び出し側は戻り値を無視してよい（従来の「保存できなくてもゲームは止めない」を維持）。
 */
export function setItemGuarded(key: string, currentVersion: number, value: string): boolean {
  try {
    if (isFutureStored(key, currentVersion)) return false
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * `Record<string, T>` のうち guard を通るエントリだけを残す（壊れた 1 件のために全体を捨てない）。
 * 入力がオブジェクトでなければ空。
 */
export function pickValidEntries<T>(value: unknown, guard: (v: unknown) => v is T): Record<string, T> {
  const out: Record<string, T> = {}
  if (!value || typeof value !== 'object') return out
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (guard(v)) out[k] = v
  return out
}
