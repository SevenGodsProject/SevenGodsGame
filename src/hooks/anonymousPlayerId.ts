import { RULES } from '../core/data/rules'

/**
 * Phase 4.3：匿名プレイヤーID。
 *
 * ★これは「アカウント」ではない。
 * ログインも、メールアドレスも、表示名も無い。端末で生成した乱数を localStorage に
 * 置いているだけで、サーバーはこの文字列以外の身元情報を受け取らない。
 * 目的は「同じ端末からの3回の挑戦を1人ぶんとして数える」ことだけである。
 *
 * ★満たしていること
 * - 個人情報を含まない（乱数のみ。端末・ブラウザ・時刻から導かない）
 * - 端末をまたいで同期しない（＝プレイヤーの追跡に使えない）
 * - 消せる（`clearAnonymousPlayerId`。localStorageを消せば別人として扱われる）
 * - `clientRunId` と同じく、独自のUUID実装を書かずブラウザ標準のcryptoだけを使う
 *
 * ★残る性質（docsのKnown Riskにも記載）
 * localStorageを消すか別のブラウザを使えば新しいIDになるため、1日3回の制限は
 * 「同じ端末の同じブラウザ」でしか効かない。これは匿名を維持する以上避けられない
 * トレードオフで、実名アカウントの導入は §6-3 #7 のCEO判断事項。
 */

const STORAGE_KEY = 'sevengods.playerId'

/** IDとして受け入れられる形か */
export function isAnonymousPlayerId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length === RULES.ranking.playerIdLength &&
    /^[0-9a-f]+$/.test(value)
  )
}

function generate(): string {
  const c = globalThis.crypto
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error('この環境では安全な乱数を利用できません')
  }
  const bytes = c.getRandomValues(new Uint8Array(RULES.ranking.playerIdLength / 2))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * この端末の匿名IDを返す。無ければ作って保存する。
 * localStorageが使えない環境では、その場限りのIDを返す（保存しないので次回は変わる）。
 */
export function getAnonymousPlayerId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isAnonymousPlayerId(stored)) return stored
  } catch {
    // 読めなければ作り直す
  }
  const id = generate()
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // 保存できなくても、そのセッションでは使える
  }
  return id
}

/** 匿名IDを破棄する（「別人として遊ぶ」ための出口を必ず用意しておく） */
export function clearAnonymousPlayerId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 消せなくても致命的ではない
  }
}
