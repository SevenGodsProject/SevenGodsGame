/**
 * Phase 4.8：Vercel Functions 側の環境変数の読み取りと、公開の門番。
 *
 * ★このファイルが `process.env` に触れる唯一の場所（`secrets.test.ts` が機械検査している）。
 * 接続文字列は**返すだけで、ログにも応答にも出さない**。
 *
 * ★`api/_lib/` に置いてある理由
 * Vercel は `api/` 配下を自動でエンドポイントにするが、**先頭が `_` のファイル・ディレクトリは
 * ルートにしない**。共有コードをここへ置くと、URLとして外から叩かれることがない。
 *
 * ★門番は3枚（決定139〜141 の security/fairness 仕様を運用面から二重化する）
 *
 *   1. `RANKING_API_ENABLED`
 *      API 全体の開閉。**未設定なら閉**。leaderboard の GET も含めて 503 を返す。
 *      これが無いと、`api/` を作った時点で「次に deploy した瞬間」に3本のエンドポイントが
 *      本番へ公開されてしまう（Phase 4.3 で `api/` を作らなかったのは、まさにこの理由）。
 *      env を入れるまでは deploy されても閉じたまま、という状態を既定にする。
 *
 *   2. `RANKING_DATABASE_URL`
 *      Neon の接続文字列。**サーバー側だけ**（`VITE_` 接頭辞を持たないので、
 *      Vite のクライアントバンドルには構造的に入らない）。未設定なら DB を作らず 503。
 *
 *   3. `RANKING_PREVIEW_UNLOCK`
 *      Phase 4.6 の kill switch（`RULES.ranking.submissionEnabled`）を、
 *      **Preview の deployment に限って**開ける。`VERCEL_ENV === 'production'` のときは
 *      値が何であっても無視する。コード側の定数は false のまま動かさない。
 */

/** 環境変数の値。'1' 以外はすべて「無効」として扱う（'true'/'yes' などは受け付けない） */
const ENABLED = '1'

export type RankingEnv = {
  /** API 全体が開いているか。未設定なら false */
  apiEnabled: boolean
  /** Neon 接続文字列。未設定なら null。**この値はここから先で出力しない** */
  databaseUrl: string | null
  /** kill switch を開けるか。production では常に false */
  submissionUnlocked: boolean
  /**
   * `RANKING_PREVIEW_UNLOCK` が有効な値だったか（production 判定を**する前**の姿）。
   * 「変数を入れたのに開かない」が、値の間違いなのか production だからなのかを
   * 切り分けるためだけに持つ。production ではこの値を外へ出さない。
   */
  unlockRequested: boolean
  /** 'production' | 'preview' | 'development' | null（Vercel が入れる） */
  vercelEnv: string | null
}

/**
 * 環境変数を1つ読む。
 * `process` は Node/Vercel にしか無いので `globalThis` 経由で取り出す
 * （ブラウザ向けの型しか無い設定でも壊れないようにするためで、
 *   実DB統合テストと同じ書き方に揃えてある）。
 */
type ProcessLike = { process?: { env?: Record<string, string | undefined> } }

/**
 * 環境変数を1つ読む。
 *
 * ★前後の空白を落とす
 * ダッシュボードへ貼り付けると改行や空白が混じることがある。`"1\n"` を「無効」と読むのは
 * 意地悪なだけで、安全性には何も足さない。空白だけの値は trim 後に空文字になるので、
 * 「`' '` は有効化しない」という性質はそのまま保たれる。
 * 接続文字列も同様に trim してよい（URLに前後の空白は意味を持たない）。
 */
function read(name: string): string | null {
  const value = (globalThis as ProcessLike).process?.env?.[name]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function readRankingEnv(): RankingEnv {
  const vercelEnv = read('VERCEL_ENV')
  // ★production では「値を読んだうえで捨てる」。env の入れ間違いで本番が開かない形にする
  const unlockRequested = read('RANKING_PREVIEW_UNLOCK') === ENABLED
  return {
    apiEnabled: read('RANKING_API_ENABLED') === ENABLED,
    databaseUrl: read('RANKING_DATABASE_URL'),
    submissionUnlocked: unlockRequested && vercelEnv !== 'production',
    unlockRequested,
    vercelEnv,
  }
}
