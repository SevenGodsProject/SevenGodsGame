import { createPlayerSecret, derivePlayerId, isPlayerId, isPlayerSecret } from '../core/identity'

/**
 * Phase 4.3〜4.6：匿名プレイヤー識別。
 *
 * ★これは「アカウント」ではない。
 * ログインも、メールアドレスも、表示名も無い。端末で生成した乱数を localStorage に
 * 置いているだけで、サーバーはこの文字列以外の身元情報を受け取らない。
 * 目的は「同じ端末からの3回の挑戦を1人ぶんとして数える」ことだけである。
 *
 * ★Phase 4.6 での変更（決定139 §3・T1）
 * Phase 4.3〜4.5 は「端末が作った乱数 `playerId` をそのままサーバーへ送る」形だった。
 * ところが `playerId` は**リーダーボードで公開される**ので、公開値がそのまま資格情報に
 * なっていた。上位者のIDを名乗って提出枠とレート制限を食い潰す嫌がらせが成立する。
 *
 * そこで端末が持つのを **秘密（`playerSecret`）** にし、公開するのは
 * `SHA-256(secret)` の先頭32桁だけにした。公開IDから秘密は逆算できないので、
 * ボードを見ただけでは他人になりすませない。
 *
 * ★満たしていること
 * - 個人情報を含まない（乱数のみ。端末・ブラウザ・時刻から導かない）
 * - 端末をまたいで同期しない（＝プレイヤーの追跡に使えない）
 * - 消せる（`clearAnonymousIdentity`。消せば別人として扱われる）
 * - 独自のハッシュ・UUID実装を書かず、ブラウザ標準のcryptoだけを使う
 *
 * ★残る性質（docsのKnown Riskにも記載）
 * localStorageを消すか別のブラウザを使えば新しいIDになるため、1日3回の制限は
 * 「同じ端末の同じブラウザ」でしか効かない。これは匿名を維持する以上避けられない
 * トレードオフで、実名アカウントの導入は §6-3 #7 のCEO判断事項。
 */

const SECRET_KEY = 'sevengods.playerSecret'
/** Phase 4.3〜4.5 のキー。移行時に破棄する（下の移行方針を参照） */
const LEGACY_ID_KEY = 'sevengods.playerId'

export type AnonymousIdentity = {
  /** サーバーへ送ってよい公開ID。リーダーボードにも載る */
  playerId: string
  /** 端末だけが持つ秘密。**POST bodyにのみ載せ、ログ・URL・保存物へは出さない** */
  playerSecret: string
}

/** IDとして受け入れられる形か（保存データを読み戻すときの検査に使う） */
export function isAnonymousPlayerId(value: unknown): value is string {
  return isPlayerId(value)
}

function readSecret(): string | null {
  try {
    const stored = localStorage.getItem(SECRET_KEY)
    return isPlayerSecret(stored) ? stored : null
  } catch {
    return null
  }
}

function writeSecret(secret: string): void {
  try {
    localStorage.setItem(SECRET_KEY, secret)
  } catch {
    // 保存できなくても、そのセッションでは使える（次回は別人になる）
  }
}

/**
 * 旧 `sevengods.playerId` の後始末。
 *
 * ★なぜ「引き継がず捨てる」のか
 * 旧IDは公開値と同じもので、秘密として使えない（それが Phase 4.6 で直した欠陥そのもの）。
 * 旧IDから秘密を導くことも原理的にできない（ハッシュの逆算になる）。
 * そして送信は kill switch で止まったままなので、**サーバー側に旧IDのデータは1件も無い**。
 * したがって引き継ぐべき資産が存在せず、公開値と同一の資格情報を残す方が危険。
 * 新しい秘密を作り、旧キーは消す——これが安全側の移行になる。
 */
function migrateLegacy(): void {
  try {
    if (localStorage.getItem(LEGACY_ID_KEY) === null) return
    localStorage.removeItem(LEGACY_ID_KEY)
  } catch {
    // 消せなくても、旧キーはもう誰からも読まれない
  }
}

/** 旧キーが残っているか（移行の検査用） */
export function hasLegacyAnonymousId(): boolean {
  try {
    return localStorage.getItem(LEGACY_ID_KEY) !== null
  } catch {
    return false
  }
}

/**
 * この端末の匿名identityを返す。無ければ作って保存する。
 * localStorageが使えない環境では、その場限りのidentityを返す（次回は変わる）。
 */
export async function getAnonymousIdentity(): Promise<AnonymousIdentity> {
  migrateLegacy()
  const existing = readSecret()
  if (existing) return { playerId: await derivePlayerId(existing), playerSecret: existing }

  const playerSecret = createPlayerSecret()
  writeSecret(playerSecret)
  return { playerId: await derivePlayerId(playerSecret), playerSecret }
}

/** 公開IDだけが欲しい場合（表示・リーダーボードの自分の行の特定など） */
export async function getAnonymousPlayerId(): Promise<string> {
  return (await getAnonymousIdentity()).playerId
}

/** identityを破棄する（「別人として遊ぶ」ための出口を必ず用意しておく） */
export function clearAnonymousIdentity(): void {
  try {
    localStorage.removeItem(SECRET_KEY)
    localStorage.removeItem(LEGACY_ID_KEY)
  } catch {
    // 消せなくても致命的ではない
  }
}
