import { RULES } from './data/rules'

/**
 * Phase 4.6（決定139 §3）：匿名identityの導出。**クライアントとサーバーの共有実装**。
 *
 * ★なぜ core に置くのか
 * 端末は秘密（`playerSecret`）を持ち、サーバーへは秘密と公開ID（`playerId`）の両方を送る。
 * サーバーは秘密から公開IDを導き直して照合する。つまり**同じ導出をクライアントとサーバーが
 * 別々に実装すると、いつかずれて全員がログインできなくなる**。導出は1か所にしか置かない。
 *
 * ★使うのは Web Crypto だけ
 * `crypto.subtle` はブラウザ・Node・Vercel・Deno のいずれにもある標準API。
 * 外部パッケージにも `node:crypto` にも依存しないので、`src/core` と `src/server` の
 * 「外部import 0件」という境界を保てる（`replayBoundary` / `rankingBoundary` が検査）。
 *
 * ★ここは「アカウント」ではない
 * 秘密はサーバーに保存されない（照合に使って捨てる）。氏名・メール・端末情報は扱わない。
 * したがって identity の量産（sybil）は防げない——これは匿名を保つ以上の帰結で、
 * 決定139 §3-3 の残余リスクとして受け入れている。
 */

const HEX = /^[0-9a-f]+$/

/** 秘密として受け入れられる形か（16進・規定の長さ） */
export function isPlayerSecret(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length === RULES.ranking.playerSecretLength &&
    HEX.test(value)
  )
}

/** 公開IDとして受け入れられる形か（16進・規定の長さ） */
export function isPlayerId(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length === RULES.ranking.playerIdLength && HEX.test(value)
  )
}

function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

/**
 * 公開ID ＝ SHA-256(秘密) の先頭 `playerIdLength` 桁。
 * 長さ・文字種は Phase 4.3 の `playerId` と同じなので、DBの列も既存の検査もそのまま使える。
 */
export async function derivePlayerId(secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(secret)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return toHex(new Uint8Array(digest)).slice(0, RULES.ranking.playerIdLength)
}

/**
 * 新しい秘密を作る。暗号論的乱数のみを使い、端末・時刻・既存IDからは導かない
 * （推測可能な秘密を黙って発行するより、作れない環境では失敗する方が安全）。
 */
export function createPlayerSecret(): string {
  const c = globalThis.crypto
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error('この環境では安全な乱数を利用できません')
  }
  return toHex(c.getRandomValues(new Uint8Array(RULES.ranking.playerSecretLength / 2)))
}

/** 長さの等しい文字列の定数時間比較（早期returnで一致の度合いを漏らさない） */
function equalsConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * 名乗った公開IDが、提示された秘密から導かれるものかを確かめる。
 * 形式が不正な場合はハッシュ計算すらしない（無駄なCPUを使わせない）。
 */
export async function verifyIdentity(playerId: unknown, secret: unknown): Promise<boolean> {
  if (!isPlayerId(playerId) || !isPlayerSecret(secret)) return false
  return equalsConstantTime(await derivePlayerId(secret), playerId)
}
