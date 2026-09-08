import { RULES } from '../data/rules'
import { ALL_CARDS } from '../data/cards'
import { ENEMIES } from '../data/enemies'
import { GODS } from '../data/gods'
import { OTOMOS } from '../data/otomo'

/**
 * Phase 4.6（決定139 §5-2）：ランキングの比較可能性を守るための「版」。
 *
 * ★何のためにあるか
 * Daily は「全員が同じ条件で戦った結果」を並べる。同じ `dailyKey` の途中で
 * カード効果や敵HPを変えてdeployすると、**朝のスコアと夜のスコアが比較できなくなる**。
 * さらに、保存済みrunを後から再検証しても当時の結果を再現できなくなる。
 * 「ランキングに影響する変更はJST日中にdeployしない」という運用ルールだけに頼ると、
 * 守れたかどうかを機械が確認できない（決定139 §5-1で運用依存案を却下した理由）。
 *
 * ★2つの部品でできている
 *   1. `RULES.ranking.engineVersion`（手動）
 *      reducer・スコア計算・RNGの**挙動**の版。データには現れないので人が上げる。
 *      上げ忘れは `gameVersion.golden.test.ts`（固定リプレイの期待値）が検出する。
 *   2. `dataFingerprint()`（自動）
 *      ランキングに影響するデータ（調整値・カード・敵・神・OTOMO）の要約。
 *      1つでも数値が変われば必ず変わるので、上げ忘れが起こり得ない。
 *
 * ★何を除くか
 * `RULES.ranking`（提出の受け口の設定。kill switch・cache秒数・上限など、対局の結果に
 * 影響しない）と `RULES.replay.pendingRuns`（クライアント側の控えの保持設定）は除く。
 * これらを含めると、運用のつまみを回すたびにその日の挑戦が止まってしまう。
 *
 * ★ハッシュを自前で書いている理由
 * `src/core` は外部パッケージに依存しない（`replayBoundary.test.ts`／
 * `rankingBoundary.test.ts` が機械検査している）。Web Crypto の SHA-256 は非同期で、
 * 版の取得を同期関数にできなくなる。ここで必要なのは「同じ入力なら同じ短い文字列、
 * 違う入力なら高確率で違う文字列」だけで、秘密も改ざん耐性も要らない
 * （版はサーバーが ticket / run に刻むもので、クライアントの申告は使わない）。
 * そこで FNV-1a を2つの初期値で回し、64bit相当の16進16桁にする。
 */

/**
 * キー順に依存しないJSON文字列。
 * `Object.keys` の順序はソース記述順に左右されるため、そのまま `JSON.stringify` すると
 * 「並べ替えただけ」で版が変わってしまう。必ず昇順へ正規化する。
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`
}

/** FNV-1a（32bit）。`offset` を変えて2回回し、連結して16進16桁にする */
function fnv1a(text: string, offset: number): string {
  let hash = offset >>> 0
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    // 32bitのFNV素数 16777619 を掛ける（オーバーフローを避けてシフトで表現する）
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** ランキングに影響するデータだけを取り出した、正規化済みの入力 */
export function rankingImpactSnapshot(): string {
  const { ranking: _ranking, replay, ...rest } = RULES
  const { pendingRuns: _pendingRuns, ...replayRest } = replay
  return stableStringify({
    rules: { ...rest, replay: replayRest },
    cards: ALL_CARDS,
    enemies: ENEMIES,
    gods: GODS,
    otomos: OTOMOS,
  })
}

/** ランキング影響データの要約（16進16桁）。データが1つでも変われば変わる */
export function dataFingerprint(): string {
  const snapshot = rankingImpactSnapshot()
  return `${fnv1a(snapshot, 0x811c9dc5)}${fnv1a(snapshot, 0x01000193)}`
}

let cached: string | null = null

/**
 * 現在deployされているコードの版。`"<engineVersion>.<dataFingerprint>"`。
 *
 * データもコードも実行中に変わらないので1度だけ計算して使い回す。
 * サーバーはこの値を ticket と run に刻み、同じ `dailyKey` の中で混在させない。
 */
export function getGameVersion(): string {
  if (cached === null) cached = `${RULES.ranking.engineVersion}.${dataFingerprint()}`
  return cached
}

/** テスト用：キャッシュを捨てる（データを差し替えて版の変化を確かめるとき） */
export function resetGameVersionCache(): void {
  cached = null
}
