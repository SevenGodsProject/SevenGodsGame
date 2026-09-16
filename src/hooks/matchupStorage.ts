import type { EnemyId, GameState, GodId } from '../core/types'
import { GOD_IDS } from '../core/data/gods'
import { ENEMY_IDS } from '../core/data/enemies'
import { RULES } from '../core/data/rules'
import { isValidDailyKey } from '../core/data/dailyBoss'
import { loadRecentDailyDays } from './dailyStorage'

/**
 * Phase 7 P2（決定189・仕様 docs/PHASE7_P2_49_MATRIX_SPEC.md §11・§12）：神×敵の攻略記録。
 *
 * 1 マス＝「その神でその敵に 1 回勝つ」。難易度・神階・神域挑戦かどうか・スコアは保存しない
 * （使わない情報を保存しない）。保存するのは「神ごとに、1 回以上撃破した敵 ID の集合」だけ。
 *
 * - 独立キー `sevengods.matchups`・独立 version（不変ルール5）。既存の records／daily／battleSave には
 *   一切書き込まない。saveVersion・gameVersion とも無関係
 * - 冪等：集合への追加なので、同じ組み合わせで何度勝っても 1 マス
 * - 壊れた JSON・構造不正は「無い」とみなして §12 の取り込みからやり直す（読めないデータは失うものが無い）
 * - 将来の版（version > 1）は読み取り専用として扱い、上書きしない（新しいビルドから戻したときに壊さない）
 * - localStorage が使えない／書けない環境では何も記録しない（ゲームは止めない。例外を外へ出さない）
 *
 * 導入時の取り込み（§12）：キーが無いときに 1 回だけ、`sevengods.daily` の直近の保存期間
 * （日付キー `RULES.daily.retentionDays` 件）にある **勝利** だけを取り込む。通常戦の過去の勝利は
 * どの敵に勝ったか分からないので、勝利数などから推測して埋めない。
 */

const STORAGE_KEY = 'sevengods.matchups'
export const MATCHUP_VERSION = 1

export type MatchupData = {
  version: typeof MATCHUP_VERSION
  /** godId → その神で 1 回以上撃破した敵 ID（重複なし） */
  cleared: Partial<Record<GodId, EnemyId[]>>
  /** 導入時の取り込み。at は取り込んだ時刻（ms）。旧データで欠けていれば 0 */
  seeded: { at: number; source: 'daily' }
}

export const MATCHUP_GODS: readonly GodId[] = Object.values(GOD_IDS)
export const MATCHUP_ENEMIES: readonly EnemyId[] = Object.values(ENEMY_IDS)
export const MATCHUP_TOTAL = MATCHUP_GODS.length * MATCHUP_ENEMIES.length

const isKnownGod = (v: unknown): v is GodId => typeof v === 'string' && (MATCHUP_GODS as readonly string[]).includes(v)
const isKnownEnemy = (v: unknown): v is EnemyId => typeof v === 'string' && (MATCHUP_ENEMIES as readonly string[]).includes(v)

type ReadResult =
  | { kind: 'ok'; data: MatchupData }
  /** キーが無い、または壊れていて読めない（取り込みからやり直してよい） */
  | { kind: 'absent' }
  /** 将来の版。読まない・書かない */
  | { kind: 'future' }
  /** localStorage 自体が使えない */
  | { kind: 'unavailable' }

/** 既知の神・敵だけを残し、重複を除いた正規形にする（未知の ID は読み飛ばす） */
function normalizeCleared(value: unknown): Partial<Record<GodId, EnemyId[]>> {
  const out: Partial<Record<GodId, EnemyId[]>> = {}
  if (!value || typeof value !== 'object') return out
  for (const [godId, enemies] of Object.entries(value as Record<string, unknown>)) {
    if (!isKnownGod(godId) || !Array.isArray(enemies)) continue
    const list = [...new Set(enemies.filter(isKnownEnemy))]
    if (list.length > 0) out[godId] = list
  }
  return out
}

function read(): ReadResult {
  let raw: string | null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { kind: 'unavailable' }
  }
  if (raw === null) return { kind: 'absent' }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: 'absent' }
  }
  if (!parsed || typeof parsed !== 'object') return { kind: 'absent' }
  const v = parsed as Record<string, unknown>
  if (typeof v.version === 'number' && v.version > MATCHUP_VERSION) return { kind: 'future' }
  if (v.version !== MATCHUP_VERSION || !v.cleared || typeof v.cleared !== 'object') return { kind: 'absent' }
  const seeded = v.seeded as Record<string, unknown> | undefined
  return {
    kind: 'ok',
    data: {
      version: MATCHUP_VERSION,
      cleared: normalizeCleared(v.cleared),
      seeded: { at: seeded && typeof seeded.at === 'number' && seeded.at > 0 ? seeded.at : 0, source: 'daily' },
    },
  }
}

function write(data: MatchupData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

function add(cleared: Partial<Record<GodId, EnemyId[]>>, godId: GodId, enemyId: EnemyId): boolean {
  const list = cleared[godId] ?? []
  if (list.includes(enemyId)) return false
  cleared[godId] = [...list, enemyId]
  return true
}

/**
 * §12：`sevengods.daily` の保存期間内の勝利だけから初期データを作る（読み取りのみ・daily は書き換えない）。
 * 日付キーの妥当性・既知の神／敵・`status === 'won'` をすべて満たす結果だけを数える。
 */
export function buildMatchupSeed(now: number): MatchupData {
  const cleared: Partial<Record<GodId, EnemyId[]>> = {}
  let days: ReturnType<typeof loadRecentDailyDays> = []
  try {
    days = loadRecentDailyDays(Number.MAX_SAFE_INTEGER)
  } catch {
    days = []
  }
  const inWindow = days
    .filter((d) => d && typeof d === 'object' && typeof d.dateKey === 'string' && isValidDailyKey(d.dateKey))
    .sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0))
    .slice(0, RULES.daily.retentionDays)
  for (const day of inWindow) {
    if (!isKnownEnemy(day.enemyId) || !Array.isArray(day.results)) continue
    for (const r of day.results) {
      if (r && r.status === 'won' && isKnownGod(r.godId)) add(cleared, r.godId, day.enemyId)
    }
  }
  return { version: MATCHUP_VERSION, cleared, seeded: { at: now, source: 'daily' } }
}

type Loaded = { data: MatchupData; writable: boolean; readable: boolean }

/** 読み込み。キーが無い（または壊れている）ときだけ取り込みを 1 回行って保存する */
function loadOrSeed(now: number): Loaded | null {
  const r = read()
  if (r.kind === 'unavailable') return null
  if (r.kind === 'future') return { data: emptyMatchups(), writable: false, readable: false }
  if (r.kind === 'ok') return { data: r.data, writable: true, readable: true }
  const seed = buildMatchupSeed(now)
  // 保存に失敗しても、その場の表示には取り込み結果を使う（書けないので記録はしない）
  return { data: seed, writable: write(seed), readable: true }
}

const emptyMatchups = (): MatchupData => ({ version: MATCHUP_VERSION, cleared: {}, seeded: { at: 0, source: 'daily' } })

export type MatchupView = {
  /** 表示できる記録があるか（localStorage 不可や将来の版では false） */
  available: boolean
  data: MatchupData
}

/** 画面表示用に読む（必要なら導入時の取り込みを行う）。例外を投げない */
export function loadMatchups(now: number = Date.now()): MatchupView {
  try {
    const loaded = loadOrSeed(now)
    if (!loaded || !loaded.readable) return { available: false, data: emptyMatchups() }
    return { available: true, data: loaded.data }
  } catch {
    return { available: false, data: emptyMatchups() }
  }
}

export function isMatchupCleared(data: MatchupData, godId: GodId, enemyId: EnemyId): boolean {
  return (data.cleared[godId] ?? []).includes(enemyId)
}

/** その神で撃破した敵の数（0〜7） */
export function countMatchupsByGod(data: MatchupData, godId: GodId): number {
  return (data.cleared[godId] ?? []).length
}

/** その敵を撃破した神の数（0〜7） */
export function countMatchupsByEnemy(data: MatchupData, enemyId: EnemyId): number {
  return MATCHUP_GODS.filter((g) => isMatchupCleared(data, g, enemyId)).length
}

/** 点灯したマスの合計（0〜49） */
export function countMatchupsTotal(data: MatchupData): number {
  return MATCHUP_GODS.reduce((sum, g) => sum + countMatchupsByGod(data, g), 0)
}

export type MatchupClearResult = {
  godId: GodId
  enemyId: EnemyId
  /** この勝利で初めて点灯したか */
  isFirstClear: boolean
  /** 記録後の、その神で撃破した敵の数 */
  godClearedCount: number
  /** 記録後の、その敵を撃破した神の数 */
  enemyClearedCount: number
  /** 記録後の合計 */
  totalCleared: number
}

/**
 * 決着した対局を記録する。`useGameEngine` が決着の瞬間に 1 回だけ呼ぶ。
 * 勝利以外（敗北・未撃破・対局中）は何もせず null。記録できない環境・保存に失敗したときも null
 * （保存できていない初撃破を祝うと、次の勝利でもう一度「初撃破」になってしまうため）。
 * 例外は外へ出さない（勝敗や他の記録に影響させない）。
 */
export function recordMatchupClear(state: GameState, now: number = Date.now()): MatchupClearResult | null {
  try {
    if (state.status !== 'won') return null
    const godId = state.godId
    const enemyId = state.enemy.defId
    if (!isKnownGod(godId) || !isKnownEnemy(enemyId)) return null
    const loaded = loadOrSeed(now)
    if (!loaded || !loaded.writable) return null
    const data: MatchupData = { ...loaded.data, cleared: { ...loaded.data.cleared } }
    const isFirstClear = add(data.cleared, godId, enemyId)
    if (isFirstClear && !write(data)) return null
    return {
      godId,
      enemyId,
      isFirstClear,
      godClearedCount: countMatchupsByGod(data, godId),
      enemyClearedCount: countMatchupsByEnemy(data, enemyId),
      totalCleared: countMatchupsTotal(data),
    }
  } catch {
    return null
  }
}
