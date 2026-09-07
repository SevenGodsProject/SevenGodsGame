/**
 * Phase 4.2 Step 3：Daily 1runを識別するID。
 *
 * 要件と満たし方：
 * - **runごとに一意**：暗号論的乱数から生成する（衝突確率は実用上ゼロ）
 * - **retryしても同じID**：ここでは「submitのretry」を指す。IDはrun開始時に1度だけ
 *   発行し、行動ログと一緒に永続化する（`dailyRunLogStorage`）。中断・再開しても、
 *   送信に失敗して再送しても、同じrunなら同じIDのままになる。サーバーはこのIDで
 *   冪等に扱えるので、**二重submitが二重登録にならない**
 * - **個人情報を含めない**：乱数のみ。端末・ブラウザ・アカウントの情報を混ぜない
 * - **seedやscoreから生成しない**：Daily seedは全員共通なので、そこから導くと
 *   衝突するうえ「同じ日の同じ神なら同じID」という推測可能なIDになってしまう。
 *   スコアから導くのも同様に不可（スコアが変われば別runになってしまい、
 *   そもそも「retryしても同じID」を満たさない）
 *
 * 実装は**ブラウザ標準のcrypto**のみを使い、独自のUUIDアルゴリズムは書かない。
 * `crypto.randomUUID()` はsecure context（https / localhost）が必要で、それ以外の
 * 環境では未定義になり得るため、その場合だけ同じ`crypto`の`getRandomValues`で
 * 32桁の16進乱数を作る（これも独自アルゴリズムではなく、標準乱数の16進表記）。
 * どちらも使えない環境では例外を投げる——推測可能なIDを黙って発行するより、
 * 「そのrunは提出対象にできない」と分かる方が安全なため。
 */

const HEX_BYTES = 16

export function createClientRunId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(HEX_BYTES))
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  throw new Error('この環境では安全な乱数を利用できません')
}

/** IDとして受け入れられる形か（保存データを読み戻すときの検査に使う） */
export function isClientRunId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f-]{32,36}$/.test(value)
}
