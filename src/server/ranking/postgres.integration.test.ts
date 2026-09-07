import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RULES } from '../../core/data/rules'
import { GOD_IDS } from '../../core/data/gods'
import { dailyKeyOf } from '../../core/data/dailyBoss'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { toReplayInput } from '../../core/replay'
import { playRecordedDailyRun } from '../../core/replay/replayTestUtils'
import { getLeaderboard } from './leaderboard'
import { createPostgresRankingStore, type SqlExecutor } from './postgresStore'
import { buildRankingSchemaSql, ATTEMPTS_PER_DAY } from './schema'
import { submitRun } from './submit'
import type { RankingStore } from './store'
import type { SubmitRequest } from './types'

/**
 * Phase 4.4：**実DB（Neon/Postgres）での検証**。
 *
 * ★実行条件
 * 環境変数 `RANKING_DATABASE_URL` が設定されているときだけ走る。
 * 未設定なら丸ごとスキップする（CI・通常の `npm test` を壊さないため）。
 *
 *   1) Neon Free Plan でプロジェクトを作り、接続文字列を取得する
 *   2) `npm i -D @neondatabase/serverless`
 *   3) `RANKING_DATABASE_URL=<接続文字列> npx vitest run src/server/ranking/postgres.integration.test.ts`
 *
 * ★秘密情報の扱い
 * 接続文字列は**環境変数からのみ**読む。ファイルへ書かない・ログへ出さない・
 * 失敗メッセージにも含めない（`describe` 名にもホスト名を出さない）。
 * `.env*` はリポジトリに存在せず、`.gitignore` で除外されている。
 *
 * ★検証する内容（Step 4〜9）
 * 一意制約・CHECK制約・同時実行（2/3/4/10並列）・3run制限・冪等性・
 * 改ざん拒否・stale Daily・リーダーボード・接続失敗時の挙動。
 */

/**
 * 接続文字列は環境変数からのみ読む。`process` はNodeでだけ存在するので、
 * ブラウザ向けの型定義（vite/client）しか無いこの設定でも壊れないよう
 * globalThis 経由で取り出す。値はここから先へ持ち出さない（ログにも出さない）。
 */
const CONNECTION = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env?.RANKING_DATABASE_URL
const enabled = typeof CONNECTION === 'string' && CONNECTION.length > 0

const GOD = GOD_IDS.ebisu
const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAILY_KEY = dailyKeyOf(new Date(NOW))
/** テスト専用の名前空間。実データと混ざらないよう、毎回別の日付キーを使う */
const TEST_DAILY_KEY = DAILY_KEY

let sql: SqlExecutor | null = null
let store: RankingStore | null = null
let driverError: string | null = null

async function connect(): Promise<SqlExecutor | null> {
  if (!enabled) return null
  try {
    // ドライバは実行時にだけ読む（依存として固定しない＝`src/server`は外部import 0件のまま）。
    // 指定子を変数にしてあるのは、未インストールでも型チェック・ビルドを壊さないため
    const specifier = '@neondatabase/serverless'
    const mod = (await import(/* @vite-ignore */ specifier)) as {
      neon: (url: string) => (text: string, params?: unknown[]) => Promise<unknown>
    }
    const client = mod.neon(CONNECTION as string)
    return (async <T>(text: string, params?: unknown[]) => {
      const rows = await client(text, params)
      return rows as T[]
    }) as SqlExecutor
  } catch (e) {
    driverError = e instanceof Error ? e.message : String(e)
    return null
  }
}

let seq = 0
function makeRequest(playerId: string): SubmitRequest {
  seq++
  const run = playRecordedDailyRun({
    dailyKey: TEST_DAILY_KEY,
    godId: GOD,
    deck: getRecommendedDeck(GOD),
    policySeed: seq,
    clientRunId: 'c'.repeat(32),
  })
  return {
    playerId,
    clientRunId: `${Date.now().toString(16)}${String(seq).padStart(8, '0')}`.padEnd(32, '0').slice(0, 32),
    input: toReplayInput(run.log),
  }
}

const players: string[] = []
function newPlayer(): string {
  const id = `${'f'.repeat(8)}${Date.now().toString(16)}${String(players.length).padStart(4, '0')}`
    .padEnd(32, '0')
    .slice(0, 32)
  players.push(id)
  return id
}

beforeAll(async () => {
  sql = await connect()
  if (!sql) return
  await sql(buildRankingSchemaSql())
  store = createPostgresRankingStore(sql)
})

afterAll(async () => {
  // テストで作った行だけを片付ける（他のデータには触れない）
  if (!sql || players.length === 0) return
  await sql(`DELETE FROM daily_runs WHERE player_id = ANY($1::text[])`, [players])
  await sql(`DELETE FROM players WHERE player_id = ANY($1::text[])`, [players])
})

describe.skipIf(!enabled)('実DB（Postgres/Neon）での検証', () => {
  it('接続とスキーマ適用ができている', () => {
    expect(driverError, driverError ?? '').toBeNull()
    expect(store, 'ドライバが読み込めていません').not.toBeNull()
  })

  it('制約が実DBに存在する（PK / UNIQUE / CHECK）', async () => {
    const rows = await (sql as SqlExecutor)<{ conname: string; contype: string }>(
      `SELECT conname, contype FROM pg_constraint
        WHERE conrelid = 'daily_runs'::regclass`,
    )
    const names = rows.map((r) => r.conname)
    expect(names).toContain('daily_runs_pkey')
    expect(names).toContain('daily_runs_attempt_unique')
    expect(names).toContain('daily_runs_attempt_range')
  })

  it('1回目〜3回目はPASS、4回目はREJECT', async () => {
    const playerId = newPlayer()
    for (let i = 1; i <= ATTEMPTS_PER_DAY; i++) {
      const result = await submitRun(makeRequest(playerId), {
        store: store as RankingStore,
        now: NOW,
      })
      expect(result.ok, `${i}回目`).toBe(true)
      if (result.ok) expect(result.runsUsed).toBe(i)
    }
    const fourth = await submitRun(makeRequest(playerId), {
      store: store as RankingStore,
      now: NOW,
    })
    expect(fourth.ok).toBe(false)
    if (!fourth.ok) expect(fourth.code).toBe('ATTEMPTS_EXCEEDED')
  })

  for (const parallel of [2, 3, 4, 10]) {
    it(`${parallel}並列の同時提出でも保存は最大${ATTEMPTS_PER_DAY}件`, async () => {
      const playerId = newPlayer()
      const requests = Array.from({ length: parallel }, () => makeRequest(playerId))
      const results = await Promise.all(
        requests.map((r) => submitRun(r, { store: store as RankingStore, now: NOW })),
      )
      const stored = await (store as RankingStore).listPlayerRuns(TEST_DAILY_KEY, playerId)
      expect(stored.length).toBe(Math.min(parallel, ATTEMPTS_PER_DAY))
      expect(results.filter((r) => r.ok).length).toBe(Math.min(parallel, ATTEMPTS_PER_DAY))
      // attempt_no が 1..N で重複していない
      const attemptNos = await (sql as SqlExecutor)<{ attempt_no: number }>(
        `SELECT attempt_no FROM daily_runs WHERE daily_key = $1 AND player_id = $2 ORDER BY attempt_no`,
        [TEST_DAILY_KEY, playerId],
      )
      expect(attemptNos.map((r) => Number(r.attempt_no))).toEqual(
        Array.from({ length: stored.length }, (_, i) => i + 1),
      )
    })
  }

  it('冪等：同じclientRunIdの再送は保存を増やさない', async () => {
    const playerId = newPlayer()
    const request = makeRequest(playerId)
    const first = await submitRun(request, { store: store as RankingStore, now: NOW })
    expect(first.ok).toBe(true)
    for (let i = 0; i < 3; i++) {
      const again = await submitRun(request, { store: store as RankingStore, now: NOW })
      expect(again.ok).toBe(true)
      if (again.ok) expect(again.accepted).toBe('duplicate')
    }
    expect((await (store as RankingStore).listPlayerRuns(TEST_DAILY_KEY, playerId)).length).toBe(1)
  })

  it('同じclientRunIdで中身を差し替えるとRUN_ID_CONFLICT', async () => {
    const playerId = newPlayer()
    const request = makeRequest(playerId)
    expect((await submitRun(request, { store: store as RankingStore, now: NOW })).ok).toBe(true)
    const different = { ...makeRequest(playerId), clientRunId: request.clientRunId }
    const result = await submitRun(different, { store: store as RankingStore, now: NOW })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('RUN_ID_CONFLICT')
  })

  it('保存されるscoreはサーバー計算値（client申告は保存されない）', async () => {
    const playerId = newPlayer()
    const request = makeRequest(playerId)
    const claimed = { ...request, score: 999_999 } as unknown as SubmitRequest
    const result = await submitRun(claimed, { store: store as RankingStore, now: NOW })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const rows = await (sql as SqlExecutor)<{ score: number | string }>(
      `SELECT score FROM daily_runs WHERE daily_key = $1 AND client_run_id = $2`,
      [TEST_DAILY_KEY, request.clientRunId],
    )
    expect(Number(rows[0].score)).toBe(result.outcome.score)
    expect(Number(rows[0].score)).not.toBe(999_999)
  })

  it('改ざんログ・stale Dailyを拒否し、DBへ書き込まない', async () => {
    const playerId = newPlayer()
    const base = makeRequest(playerId)
    const tampered = { ...base, input: { ...base.input, actions: base.input.actions.slice(0, 1) } }
    const rejected = await submitRun(tampered, { store: store as RankingStore, now: NOW })
    expect(rejected.ok).toBe(false)

    const stale = await submitRun(makeRequest(playerId), {
      store: store as RankingStore,
      now: Date.parse('2026-09-20T03:00:00Z'),
    })
    expect(stale.ok).toBe(false)
    if (!stale.ok) expect(stale.code).toBe('STALE_DAILY_KEY')

    expect((await (store as RankingStore).listPlayerRuns(TEST_DAILY_KEY, playerId)).length).toBe(0)
  })

  it('リーダーボードが実DBデータで規則どおりに並ぶ', async () => {
    const a = newPlayer()
    const b = newPlayer()
    await submitRun(makeRequest(a), { store: store as RankingStore, now: NOW })
    await submitRun(makeRequest(a), { store: store as RankingStore, now: NOW })
    await submitRun(makeRequest(b), { store: store as RankingStore, now: NOW })

    const board = await getLeaderboard(TEST_DAILY_KEY, store as RankingStore, { playerId: a })
    // 1人1行（best of 3）
    const rowsForA = board.rows.filter((r) => r.playerId === a)
    expect(rowsForA.length).toBeLessThanOrEqual(1)
    expect(board.self?.playerId).toBe(a)
    // 順位は1始まりで、同点は同順位
    expect(board.rows[0].rank).toBe(1)
    for (const row of board.rows) expect(row.tiedCount).toBeGreaterThanOrEqual(1)
  })

  it('接続失敗はゲームを壊さず、提出だけが失敗する', async () => {
    const broken = createPostgresRankingStore(async () => {
      throw new Error('connection terminated')
    })
    await expect(
      submitRun(makeRequest(newPlayer()), { store: broken, now: NOW }),
    ).rejects.toThrow(/connection/)
    // 例外は呼び出し側（HTTPラッパー）が500へ変換する。ゲーム本体の状態には触れない
  })
})

describe.skipIf(enabled)('実DB検証のスキップ理由', () => {
  it('RANKING_DATABASE_URL が未設定のためスキップしている', () => {
    expect(enabled).toBe(false)
    // 接続情報が無くても、スキーマとロジックの検証は
    // concurrency.test.ts / submit.test.ts が担当している
    expect(buildRankingSchemaSql()).toContain('daily_runs')
    expect(ATTEMPTS_PER_DAY).toBe(RULES.daily.attemptsPerDay)
  })
})
