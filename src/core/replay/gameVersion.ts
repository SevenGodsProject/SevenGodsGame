import { RULES } from '../data/rules.js'
import { ALL_CARDS } from '../data/cards/index.js'
import { ENEMIES } from '../data/enemies.js'
import type { EnemyDef } from '../types/index.js'
import { GODS } from '../data/gods.js'
import { OTOMOS } from '../data/otomo.js'
import { DIVINATION_CHOICES } from '../data/divination.js'

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
 *      ランキングに影響するデータ（調整値・カード・敵・神・OTOMO・神託の3択）の要約。
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

/**
 * v1.0.1 ★再付番（`docs/V1_0_1_RC_GATE_CHECKLIST.md`・AI 判断）：`EnemyDef.rank`（脅威度★）は敵選択・デッキ構築の
 * 対戦相手チップ・降臨の間の★表示にだけ読まれ、reducer・敵の行動表・スコア計算のどこにも現れない
 * （`src/core/engine` に `rank` の参照は無い）。対局結果に影響しないデータなので、指紋の対象から外す。
 *
 * ただし `rank` を単に落とすと正規化文字列そのものが変わり、Production v1.0.0 の版 `1.d794038a00b5b53c` が
 * 一度だけ動く（Daily の day-lock・K26「託宣回数は次ラウンドから新表」が日中に起きる）。それを避けるため、
 * 指紋入力の `rank` は **v1.0.0 公開時点の値に固定**する。実データの `rank` を何に変えても指紋は変わらない＝
 * 「rank を指紋から除外した」のと等価で、かつ版は不変（`gameVersion.test.ts` が両方を固定する）。
 * 表に無い id（将来の敵）は 0。敵の追加は HP・行動表の追加そのもので版が変わるので取りこぼしは無い。
 * この表は指紋の互換性のためだけに存在し、ゲームのどこからも読まれない。実際の★は `data/enemies.ts` にある。
 */
const FINGERPRINT_RANK_V1_0_0: Readonly<Record<string, number>> = {
  enemy_01: 1,
  enemy_02: 2,
  enemy_03: 3,
  enemy_04: 4,
  enemy_05: 2,
  enemy_06: 3,
  enemy_07: 4,
}

/** 指紋に乗せる敵データ：`rank` だけを v1.0.0 時点の定数へ置き換えたもの（上の説明を参照） */
function enemiesForFingerprint(): EnemyDef[] {
  return ENEMIES.map((enemy) => ({ ...enemy, rank: FINGERPRINT_RANK_V1_0_0[enemy.id] ?? 0 }))
}

/** ランキングに影響するデータだけを取り出した、正規化済みの入力 */
export function rankingImpactSnapshot(): string {
  const { ranking: _ranking, replay, ...rest } = RULES
  const { pendingRuns: _pendingRuns, ...replayRest } = replay
  return stableStringify({
    rules: { ...rest, replay: replayRest },
    cards: ALL_CARDS,
    enemies: enemiesForFingerprint(),
    gods: GODS,
    otomos: OTOMOS,
    // Phase 5-E（決定158）：神託の3択も対局結果を直接変える。Phase 4.6 の列挙から漏れていたため追加
    // （導き・天啓の数値や効果の種類は `RULES` に無く、ここに入れないと変更しても版が変わらなかった）
    divination: DIVINATION_CHOICES,
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
