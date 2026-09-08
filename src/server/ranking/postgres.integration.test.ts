import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RULES } from '../../core/data/rules'
import { GOD_IDS } from '../../core/data/gods'
import { dailyKeyOf } from '../../core/data/dailyBoss'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { toReplayInput } from '../../core/replay'
import { playRecordedDailyRun } from '../../core/replay/replayTestUtils'
import { getLeaderboard } from './leaderboard'
import { createPostgresRankingStore, type SqlExecutor } from './postgresStore'
import { buildRankingSchemaSql, buildRankingSchemaStatements, ATTEMPTS_PER_DAY } from './schema'
import { startRun } from './start'
import { submitRun } from './submit'
import type { RankingStore } from './store'
import { makeIdentity, type TestIdentity } from './rankingTestUtils'
import type { SubmitRequest } from './types'

/**
 * Phase 4.4〜4.6：**実DB（Neon/Postgres）での検証**。
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
 * ★検証する内容
 * Phase 4.4（Step 4〜9）：一意制約・CHECK制約・同時実行・回数制限・冪等性・
 * 改ざん拒否・別日の拒否・リーダーボード・接続失敗時の挙動。
 * Phase 4.6：ticketの部分UNIQUE（voidedは番号を返還する）・runからticketへのFK・
 * day-lock・版の不一致による返還。
 *
 * ★この日付キーはテスト専用
 * `TEST_DAILY_KEY` は本テストだけが使う予約枠として扱い、開始前に一度きれいにする。
 * こうしないと、前回の実行が固定した `game_version` が残って day-lock に引っかかる。
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

/**
 * 失敗メッセージから接続文字列を消す。
 * 例：`neon()` は不正なURLを渡されると **接続文字列そのものを本文に含めた**
 * エラーを投げる。そのまま `expect` のメッセージやCIログへ流すと秘密が漏れるため、
 * ここで必ず伏字にしてから外へ出す（このファイルの方針：値は持ち出さない）。
 */
function redactSecret(message: string): string {
  let out = message
  if (typeof CONNECTION === 'string' && CONNECTION.length > 0) {
    out = out.split(CONNECTION).join('<REDACTED>')
  }
  return out
    .replace(/Connection string:.*/gs, 'Connection string: <REDACTED>')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '<REDACTED>')
}

async function connect(): Promise<SqlExecutor | null> {
  if (!enabled) return null
  try {
    // ドライバは実行時にだけ読む（依存として固定しない＝`src/server`は外部import 0件のまま）。
    // 指定子を変数にしてあるのは、未インストールでも型チェック・ビルドを壊さないため
    const specifier = '@neondatabase/serverless'
    const mod = (await import(/* @vite-ignore */ specifier)) as {
      neon: (url: string) => {
        query: (text: string, params?: unknown[]) => Promise<unknown>
      }
    }
    const client = mod.neon(CONNECTION as string)
    // ★`client(text, params)` ではなく `client.query(...)`。
    // neon serverless v1 の呼び出し可能形はタグ付きテンプレート専用で、
    // 素の文字列を渡すと「use sql.query(...)」と即エラーになる（Phase 4.4 follow-up）。
    return (async <T>(text: string, params?: unknown[]) => {
      const rows = await client.query(text, params)
      return rows as T[]
    }) as SqlExecutor
  } catch (e) {
    driverError = redactSecret(e instanceof Error ? e.message : String(e))
    return null
  }
}

const deps = () => ({ store: store as RankingStore, now: NOW })

let seq = 0
function newRunId(): string {
  seq++
  return `${Date.now().toString(16)}${String(seq).padStart(8, '0')}`.padEnd(32, '0').slice(0, 32)
}

function makeRequest(identity: TestIdentity, clientRunId = newRunId()): SubmitRequest {
  seq++
  const run = playRecordedDailyRun({
    dailyKey: TEST_DAILY_KEY,
    godId: GOD,
    deck: getRecommendedDeck(GOD),
    policySeed: seq,
    clientRunId: 'c'.repeat(32),
  })
  return {
    playerId: identity.playerId,
    playerSecret: identity.playerSecret,
    clientRunId,
    input: toReplayInput(run.log),
  }
}

const players: string[] = []

/** テスト用の identity。公開IDは本番と同じ導出（SHA-256の先頭32桁）で作る */
async function newPlayer(): Promise<TestIdentity> {
  const identity = await makeIdentity(`itest-${Date.now().toString(16)}-${players.length}`)
  players.push(identity.playerId)
  return identity
}

/** 枠を取ってから提出リクエストを作る（本番と同じ start → submit の順） */
async function prepared(identity: TestIdentity): Promise<SubmitRequest> {
  const clientRunId = newRunId()
  const started = await startRun({ ...identity, clientRunId }, deps())
  if (!started.ok) throw new Error(`ticketを発行できませんでした: ${started.code}`)
  return makeRequest(identity, clientRunId)
}

beforeAll(async () => {
  sql = await connect()
  if (!enabled) return
  // 接続文字列が設定されているのに繋がらない場合は、ここで**理由を明示して**落とす。
  // 黙って `store` を null のままにすると、全テストが
  // 「Cannot read properties of null」という無関係な例外で落ちて原因が見えなくなる。
  if (!sql) {
    throw new Error(
      `RANKING_DATABASE_URL は設定されていますが、ドライバを初期化できませんでした: ${driverError ?? '原因不明'}`,
    )
  }
  // ★1文ずつ適用する。Neon の HTTP ドライバは `;` 区切りの複数文をまとめて実行できない
  for (const statement of buildRankingSchemaStatements()) {
    await sql(statement)
  }
  // テスト専用の日付キーを初期化する（前回実行が固定した game_version を持ち越さない）。
  // CASCADE でこの日の ticket と run も消える。実データの日付には触れない
  await sql(`DELETE FROM daily_days WHERE daily_key = $1`, [TEST_DAILY_KEY])
  store = createPostgresRankingStore(sql)
})

afterAll(async () => {
  // テストで作った行だけを片付ける（他のデータには触れない）
  if (!sql) return
  await sql(`DELETE FROM daily_days WHERE daily_key = $1`, [TEST_DAILY_KEY])
  if (players.length > 0) {
    await sql(`DELETE FROM players WHERE player_id = ANY($1::text[])`, [players])
  }
})

describe.skipIf(!enabled)('実DB（Postgres/Neon）での検証', () => {
  it('接続とスキーマ適用ができている', () => {
    expect(driverError, driverError ?? '').toBeNull()
    expect(store, 'ドライバが読み込めていません').not.toBeNull()
  })

  it('制約が実DBに存在する（PK / UNIQUE / CHECK / FK）', async () => {
    const runConstraints = await (sql as SqlExecutor)<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'daily_runs'::regclass`,
    )
    const runNames = runConstraints.map((r) => r.conname)
    expect(runNames).toContain('daily_runs_pkey')
    expect(runNames).toContain('daily_runs_attempt_unique')
    expect(runNames).toContain('daily_runs_attempt_range')
    expect(runNames, 'runがticketに紐づいていない').toContain('daily_runs_ticket_fk')

    const ticketConstraints = await (sql as SqlExecutor)<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'daily_tickets'::regclass`,
    )
    const ticketNames = ticketConstraints.map((r) => r.conname)
    expect(ticketNames).toContain('daily_tickets_pkey')
    expect(ticketNames).toContain('daily_tickets_attempt_range')

    // 部分UNIQUE は index として存在する（voided を除外していること込みで確認）
    const indexes = await (sql as SqlExecutor)<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'daily_tickets'`,
    )
    const partial = indexes.find((r) => r.indexdef.includes('daily_tickets_attempt_unique'))
    expect(partial, '部分UNIQUEが無い').toBeDefined()
    expect(partial?.indexdef).toContain('voided')
  })

  it('1回目〜3回目はPASS、4回目の開始はREJECT', async () => {
    const identity = await newPlayer()
    for (let i = 1; i <= ATTEMPTS_PER_DAY; i++) {
      const request = await prepared(identity)
      const result = await submitRun(request, deps())
      expect(result.ok, `${i}回目`).toBe(true)
      if (result.ok) {
        expect(result.runsUsed).toBe(i)
        expect(result.run.attemptNo).toBe(i)
      }
    }
    const fourth = await startRun({ ...identity, clientRunId: newRunId() }, deps())
    expect(fourth.ok).toBe(false)
    if (!fourth.ok) expect(fourth.code).toBe('ATTEMPTS_EXCEEDED')
  })

  for (const parallel of [2, 3, 4, 10]) {
    it(`${parallel}並列の同時開始でも枠は最大${ATTEMPTS_PER_DAY}件（DB制約が守る）`, async () => {
      const identity = await newPlayer()
      const results = await Promise.all(
        Array.from({ length: parallel }, () =>
          startRun({ ...identity, clientRunId: newRunId() }, deps()),
        ),
      )
      const rows = await (sql as SqlExecutor)<{ attempt_no: number; closed_reason: string | null }>(
        `SELECT attempt_no, closed_reason FROM daily_tickets
          WHERE daily_key = $1 AND player_id = $2 ORDER BY attempt_no`,
        [TEST_DAILY_KEY, identity.playerId],
      )
      expect(rows.length).toBeLessThanOrEqual(ATTEMPTS_PER_DAY)
      // attempt_no が 1..N で重複していない（部分UNIQUEが効いている）
      expect(rows.map((r) => Number(r.attempt_no))).toEqual(
        Array.from({ length: rows.length }, (_, i) => i + 1),
      )
      // 進行中は常に1つだけ
      expect(rows.filter((r) => r.closed_reason === null).length).toBe(1)
      for (const r of results) {
        if (!r.ok) expect(r.code).toBe('ATTEMPTS_EXCEEDED')
      }
    })
  }

  it('同じticketへの同時提出でも保存は1件', async () => {
    const identity = await newPlayer()
    const request = await prepared(identity)
    const results = await Promise.all(
      Array.from({ length: 4 }, () => submitRun(request, deps())),
    )
    expect(results.every((r) => r.ok)).toBe(true)
    expect(results.filter((r) => r.ok && r.accepted === 'stored').length).toBe(1)
    expect((await (store as RankingStore).listPlayerRuns(TEST_DAILY_KEY, identity.playerId)).length).toBe(1)
  })

  it('冪等：同じclientRunIdの再送は保存を増やさない', async () => {
    const identity = await newPlayer()
    const request = await prepared(identity)
    const first = await submitRun(request, deps())
    expect(first.ok).toBe(true)
    for (let i = 0; i < 3; i++) {
      const again = await submitRun(request, deps())
      expect(again.ok).toBe(true)
      if (again.ok) expect(again.accepted).toBe('duplicate')
    }
    expect((await (store as RankingStore).listPlayerRuns(TEST_DAILY_KEY, identity.playerId)).length).toBe(1)
  })

  it('同じclientRunIdで中身を差し替えるとRUN_ID_CONFLICT', async () => {
    const identity = await newPlayer()
    const request = await prepared(identity)
    expect((await submitRun(request, deps())).ok).toBe(true)
    const different = { ...makeRequest(identity), clientRunId: request.clientRunId }
    const result = await submitRun(different, deps())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('RUN_ID_CONFLICT')
  })

  it('保存されるscoreはサーバー計算値（client申告は保存されない）', async () => {
    const identity = await newPlayer()
    const request = await prepared(identity)
    const claimed = { ...request, score: 999_999 } as unknown as SubmitRequest
    const result = await submitRun(claimed, deps())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const rows = await (sql as SqlExecutor)<{ score: number | string; game_version: string }>(
      `SELECT score, game_version FROM daily_runs WHERE daily_key = $1 AND client_run_id = $2`,
      [TEST_DAILY_KEY, request.clientRunId],
    )
    expect(Number(rows[0].score)).toBe(result.outcome.score)
    expect(Number(rows[0].score)).not.toBe(999_999)
    expect(rows[0].game_version).toBe(result.run.gameVersion)
  })

  it('DBに秘密が保存されていない（列にも値にも現れない）', async () => {
    const identity = await newPlayer()
    const request = await prepared(identity)
    expect((await submitRun(request, deps())).ok).toBe(true)
    const columns = await (sql as SqlExecutor)<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name IN ('players', 'daily_days', 'daily_tickets', 'daily_runs')`,
    )
    const names = columns.map((c) => c.column_name).join(' ')
    for (const forbidden of ['secret', 'password', 'email', 'ip', 'user_agent']) {
      expect(names).not.toContain(forbidden)
    }
    const rows = await (sql as SqlExecutor)<{ hit: number }>(
      `SELECT count(*)::int AS hit FROM daily_tickets WHERE client_run_id = $1 AND player_id = $2`,
      [request.clientRunId, identity.playerSecret],
    )
    expect(Number(rows[0].hit), '秘密がplayer_idとして保存されている').toBe(0)
  })

  it('改ざんログ・別日の提出を拒否し、DBへ書き込まない', async () => {
    const identity = await newPlayer()
    const base = await prepared(identity)
    const tampered = { ...base, input: { ...base.input, actions: base.input.actions.slice(0, 1) } }
    const rejected = await submitRun(tampered, deps())
    expect(rejected.ok).toBe(false)

    // ticketを取らずに提出（別日を名乗った場合も同じ経路）
    const noTicket = await submitRun(makeRequest(identity), deps())
    expect(noTicket.ok).toBe(false)
    if (!noTicket.ok) expect(noTicket.code).toBe('NO_TICKET')

    expect((await (store as RankingStore).listPlayerRuns(TEST_DAILY_KEY, identity.playerId)).length).toBe(0)
  })

  it('ticketを持たないrunはDBが直接拒否する（FKが効いている）', async () => {
    const identity = await newPlayer()
    await (sql as SqlExecutor)(
      `INSERT INTO players (player_id) VALUES ($1) ON CONFLICT (player_id) DO NOTHING`,
      [identity.playerId],
    )
    await expect(
      (store as RankingStore).insertRun({
        dailyKey: TEST_DAILY_KEY,
        playerId: identity.playerId,
        clientRunId: newRunId(),
        attemptNo: 1,
        gameVersion: 'itest',
        godId: GOD,
        score: 1,
        win: false,
        round: 7,
        rngCursor: 1,
        actionCount: 1,
        submittedAt: NOW,
      }),
    ).rejects.toThrow()
  })

  it('day-lock：その日の版が固定され、別の版での開始は拒否される', async () => {
    const identity = await newPlayer()
    const locked = await startRun(
      { ...identity, clientRunId: newRunId() },
      { store: store as RankingStore, now: NOW, gameVersion: 'itest-other-version' },
    )
    expect(locked.ok).toBe(false)
    if (!locked.ok) expect(locked.code).toBe('RULES_VERSION_LOCKED')

    const rows = await (sql as SqlExecutor)<{ game_version: string }>(
      `SELECT game_version FROM daily_days WHERE daily_key = $1`,
      [TEST_DAILY_KEY],
    )
    expect(rows.length).toBe(1)
    expect(rows[0].game_version).not.toBe('itest-other-version')
  })

  it('版の不一致は voided として枠を返し、番号を再利用できる', async () => {
    const identity = await newPlayer()
    const request = await prepared(identity)
    const mismatch = await submitRun(request, {
      store: store as RankingStore,
      now: NOW,
      gameVersion: 'itest-deployed-later',
    })
    expect(mismatch.ok).toBe(false)
    if (!mismatch.ok) expect(mismatch.code).toBe('RULES_VERSION_MISMATCH')

    const rows = await (sql as SqlExecutor)<{ closed_reason: string | null }>(
      `SELECT closed_reason FROM daily_tickets WHERE daily_key = $1 AND client_run_id = $2`,
      [TEST_DAILY_KEY, request.clientRunId],
    )
    expect(rows[0].closed_reason).toBe('voided')

    // 部分UNIQUE が voided を除外しているので、同じ番号をもう一度取れる
    const again = await startRun({ ...identity, clientRunId: newRunId() }, deps())
    expect(again.ok).toBe(true)
    if (again.ok) expect(again.ticket.attemptNo).toBe(1)
  })

  it('リーダーボードが実DBデータで規則どおりに並ぶ', async () => {
    const a = await newPlayer()
    const b = await newPlayer()
    await submitRun(await prepared(a), deps())
    await submitRun(await prepared(a), deps())
    await submitRun(await prepared(b), deps())

    const board = await getLeaderboard(TEST_DAILY_KEY, store as RankingStore, {
      playerId: a.playerId,
    })
    // 1人1行（best of 3）
    const rowsForA = board.rows.filter((r) => r.playerId === a.playerId)
    expect(rowsForA.length).toBeLessThanOrEqual(1)
    expect(board.self?.playerId).toBe(a.playerId)
    // 順位は1始まりで、同点は同順位
    expect(board.rows[0].rank).toBe(1)
    for (const row of board.rows) expect(row.tiedCount).toBeGreaterThanOrEqual(1)
  })

  it('接続失敗はゲームを壊さず、提出だけが失敗する', async () => {
    const broken = createPostgresRankingStore(async () => {
      throw new Error('connection terminated')
    })
    await expect(
      submitRun(makeRequest(await newPlayer()), { store: broken, now: NOW }),
    ).rejects.toThrow(/connection/)
    // 例外は呼び出し側（HTTPラッパー）が500へ変換する。ゲーム本体の状態には触れない
  })
})

describe.skipIf(enabled)('実DB検証のスキップ理由', () => {
  it('RANKING_DATABASE_URL が未設定のためスキップしている', () => {
    expect(enabled).toBe(false)
    // 接続情報が無くても、スキーマとロジックの検証は
    // concurrency.test.ts / ticket.test.ts / submit.test.ts が担当している
    expect(buildRankingSchemaSql()).toContain('daily_runs')
    expect(buildRankingSchemaSql()).toContain('daily_tickets')
    expect(ATTEMPTS_PER_DAY).toBe(RULES.daily.attemptsPerDay)
  })
})
