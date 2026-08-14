import { dateKeyOf, type QuotaConsumeResult, type QuotaProvider, type QuotaState } from './quotaProvider'

const STORAGE_KEY = 'sevengods.quota'
const QUOTA_VERSION = 1

/**
 * 端末の時計を意図的に巻き戻す操作への軽い対策（決定72、Task D1）。
 * 「これまでに観測した`now`の最大値」より`ROLLBACK_TOLERANCE_MS`を超えて
 * 過去の`now`が来た場合は時計の巻き戻しとみなし、日付が変わって見えても
 * 日次リセットを発生させない（＝巻き戻して回数を稼ぐ手口を防ぐ）。
 *
 * 【今回許容する範囲・許容しない範囲（CEO確認事項への回答）】
 * ・防ぐもの：時計を過去に戻し「まだ同じ日／別の巻き戻した日」を装って
 *   何度もリセットを発生させる手口。
 * ・防がないもの：時計を未来に進め「もう翌日になった」と偽装し、即座に
 *   次の日の割り当てを得る手口。信頼できるサーバー時刻が無いローカル実装
 *   である以上、原理的に防げない。
 * ・この限界自体が、`QuotaProvider`をインターフェースとして独立させ、
 *   Local実装とServer実装を差し替え可能にしている理由でもある。サーバー
 *   時刻を基準にするServer実装に差し替えれば、呼び出し側のコードを
 *   変えずにこの制限を解消できる（決定21・§3-1で言及済みの方針どおり）。
 * ・通常のタイムゾーン変更・NTP補正等による数分単位の前後を巻き戻しと
 *   誤検知しないよう、5分の許容幅を設けている。
 */
const ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000

type QuotaRecord = {
  dateKey: string
  used: number
  /** 巻き戻し検知用：これまでに観測した`now`の最大値（エポックミリ秒） */
  lastSeenAtMs: number
}

type QuotaData = {
  version: number
  /** featureKey -> 利用状況 */
  records: Record<string, QuotaRecord>
}

function isQuotaRecord(value: unknown): value is QuotaRecord {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.dateKey === 'string' && typeof v.used === 'number' && typeof v.lastSeenAtMs === 'number'
}

function isQuotaData(value: unknown): value is QuotaData {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.version !== 'number' || !v.records || typeof v.records !== 'object') return false
  return Object.values(v.records as Record<string, unknown>).every(isQuotaRecord)
}

function load(): QuotaData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: QUOTA_VERSION, records: {} }
    const parsed: unknown = JSON.parse(raw)
    if (!isQuotaData(parsed) || parsed.version !== QUOTA_VERSION) {
      return { version: QUOTA_VERSION, records: {} }
    }
    return parsed
  } catch {
    return { version: QUOTA_VERSION, records: {} }
  }
}

function save(data: QuotaData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // 保存できなくてもゲーム自体には影響しないため無視する
  }
}

/** prevレコードと現在時刻から、今使うべきレコードを決める（保存が必要かどうかも返す） */
function resolveRecord(prev: QuotaRecord | undefined, now: Date): { record: QuotaRecord; changed: boolean } {
  const nowMs = now.getTime()
  const currentDateKey = dateKeyOf(now)

  if (!prev) {
    return { record: { dateKey: currentDateKey, used: 0, lastSeenAtMs: nowMs }, changed: true }
  }

  if (nowMs < prev.lastSeenAtMs - ROLLBACK_TOLERANCE_MS) {
    // 巻き戻しとみなし、日付が変わって見えてもリセットしない（上記コメント参照）
    return { record: prev, changed: false }
  }

  if (currentDateKey !== prev.dateKey) {
    return {
      record: { dateKey: currentDateKey, used: 0, lastSeenAtMs: Math.max(nowMs, prev.lastSeenAtMs) },
      changed: true,
    }
  }

  const lastSeenAtMs = Math.max(nowMs, prev.lastSeenAtMs)
  return {
    record: { ...prev, lastSeenAtMs },
    changed: lastSeenAtMs !== prev.lastSeenAtMs,
  }
}

function toState(record: QuotaRecord, limit: number): QuotaState {
  return {
    dateKey: record.dateKey,
    used: record.used,
    limit,
    remaining: Math.max(0, limit - record.used),
  }
}

/**
 * `QuotaProvider`のlocalStorage実装（決定72、Task D1初実装）。
 *
 * `recordStorage.ts`等の既存storage層と同じ方針を踏襲する：
 * `sevengods.xxx`キー、専用version、try/catch＋構造チェックで壊れた
 * データ・version不一致は安全に空データへフォールバックする。
 *
 * GameState・core/engine・カード・OTOMO・共鳴・スコア計算のいずれにも
 * 触れない、完全に独立したモジュール（デイリー加護UI・バトルへの反映は
 * D2で別途実装予定。今回D1では未着手）。
 */
export function createLocalQuotaProvider(): QuotaProvider {
  return {
    async getState(featureKey: string, limit: number, now: Date = new Date()): Promise<QuotaState> {
      const data = load()
      const { record, changed } = resolveRecord(data.records[featureKey], now)
      if (changed) {
        save({ ...data, records: { ...data.records, [featureKey]: record } })
      }
      return toState(record, limit)
    },

    async consume(featureKey: string, limit: number, now: Date = new Date()): Promise<QuotaConsumeResult> {
      const data = load()
      const { record } = resolveRecord(data.records[featureKey], now)
      const remaining = Math.max(0, limit - record.used)

      if (remaining <= 0) {
        return { ok: false, state: toState(record, limit) }
      }

      const nextRecord: QuotaRecord = { ...record, used: record.used + 1 }
      save({ ...data, records: { ...data.records, [featureKey]: nextRecord } })
      return { ok: true, state: toState(nextRecord, limit) }
    },
  }
}
