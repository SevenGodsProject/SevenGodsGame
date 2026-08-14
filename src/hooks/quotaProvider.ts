/**
 * 決定72（Task D1）：QuotaProvider（日付ベースの利用回数管理）のインターフェース。
 *
 * 将来のデイリー加護（決定21・§3-1で言及済みの「託宣1日7回」構想。D2で実装予定、
 * 今回D1では未着手）等、「1日にN回まで」という制限を必要とする機能のために、
 * 具体的な保存方式（Local/Server）から独立した抽象を用意する。
 *
 * 【日付の注入について】
 * このファイル・`localQuotaProvider.ts`とも、内部で`Date.now()`/`new Date()`を
 * 無条件に呼ぶのは各関数の引数`now`のデフォルト値としてのみに限定する
 * （呼び出し側がテストで明示的に`now`を渡せば、時計に一切依存せず決定論的に
 * 検証できる。`core/`の不変ルール2「Math.random()禁止・シード注入」と
 * 同じ思想を「時刻」にも適用したもの）。
 *
 * 【将来Server実装への差し替えを見据えた設計】
 * `getState`/`consume`は将来のServer実装（API呼び出しが必要になり本質的に
 * 非同期になる）を見据えて、Local実装の時点から`Promise`を返す形にしている
 * （`LocalQuotaProvider`は同期処理を`Promise.resolve`で包むだけ）。呼び出し側
 * コード（将来のD2で書く予定のUI）は、Local→Serverへの実装差し替え時に
 * インターフェースの変更を必要としない。
 */

export type QuotaState = {
  /** このレコードが対応する日付キー（ローカル日付、'YYYY-MM-DD'） */
  dateKey: string
  /** その日の使用回数 */
  used: number
  /** その日の上限回数（呼び出し側が指定する。QuotaProvider自体は上限の値を知らない） */
  limit: number
  /** 残り回数（0未満にはならない） */
  remaining: number
}

export type QuotaConsumeResult = {
  /** 消費できたか（残り0の場合はfalseで、状態は変化しない） */
  ok: boolean
  /** 消費後（okがfalseの場合は消費前）の状態 */
  state: QuotaState
}

export type QuotaProvider = {
  /**
   * 指定したfeatureKeyの現在の状態を返す（日付が変わっていれば内部で
   * 日次リセットした後の値。副作用としてリセット後の状態を保存する）。
   */
  getState(featureKey: string, limit: number, now?: Date): Promise<QuotaState>
  /**
   * 1回分の消費を試みる。残り回数が0の場合は何も変更せず`{ok:false}`を返す
   * （例外は投げない。呼び出し側がUIで「今日はもう使えません」等を出しやすくするため）。
   */
  consume(featureKey: string, limit: number, now?: Date): Promise<QuotaConsumeResult>
}

/**
 * `now`からローカル日付のキー（'YYYY-MM-DD'）を作る。
 *
 * `toISOString()`（UTC基準）ではなく`getFullYear`/`getMonth`/`getDate`
 * （ローカルタイムゾーン基準）を使う。理由：プレイヤーの「今日」は
 * デバイスのローカル日付であるべきで、UTC基準だとタイムゾーンによっては
 * 実際の日付と異なる日でリセットされてしまう（例：UTC+9の23:30は
 * ローカルではまだ当日だが、UTCでは既に翌日）。
 *
 * 月末→翌月・年末→翌年の繰り上がりは`Date`オブジェクト自身の計算に
 * 任せており、独自の暦計算ロジックは持たない（バグの温床になりやすいため）。
 */
export function dateKeyOf(now: Date): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
