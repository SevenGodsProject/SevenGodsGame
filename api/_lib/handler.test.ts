import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { GOD_IDS } from '../../src/core/data/gods.js'
import { dailyKeyOf } from '../../src/core/data/dailyBoss.js'
import { getRecommendedDeck } from '../../src/core/data/deckBuilder.js'
import { RULES } from '../../src/core/data/rules.js'
import { toReplayInput } from '../../src/core/replay/index.js'
import { playRecordedDailyRun } from '../../src/core/replay/replayTestUtils.js'
import { clearLeaderboardCache } from '../../src/server/ranking/leaderboard.js'
import { createMemoryRankingStore } from '../../src/server/ranking/store.js'
import { makeIdentity, runId, type TestIdentity } from '../../src/server/ranking/rankingTestUtils.js'
import type { RankingStore } from '../../src/server/ranking/index.js'
import type { RankingEnv } from './env.js'
import { handleRankingHttp, type RankingRouteContext } from './handler.js'

/**
 * Phase 4.8：Production API（Vercel Functions）の契約。
 *
 * ★ここで固定したいこと
 *   1. **既定で閉じている**。env を入れるまでは deploy されても3本とも 503
 *   2. kill switch は production では絶対に開かない（env を入れ間違えても開かない）
 *   3. 64KBの門番が JSON 解析より前に効く
 *   4. 応答にもヘッダにも `playerSecret` が出ない
 *   5. Phase 4.6 の意味論（ticket・identity・day-lock・3回）を素通しで保っている
 *
 * 本体のロジックは `src/server/ranking/http.test.ts` が見ている。ここは**詰め替え層**の検査。
 */

const GOD = GOD_IDS.ebisu
const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAILY_KEY = dailyKeyOf(new Date(NOW))
const ORIGIN = 'https://sevengods.example.vercel.app'

/**
 * 接続文字列の**形**をテストのソースに置かない（`secrets.test.ts` の混入検査を緩めないため）。
 * 門番は「空でない文字列か」しか見ないので、これで足りる。
 * 伏字の検査に使うホスト名も、パターンに一致しないよう組み立てて持つ。
 */
const FAKE_DSN = '<test-connection-placeholder>'
const FAKE_HOST = ['ep-example.aws.neon', 'tech'].join('.')

const store = createMemoryRankingStore()

/** 既定は「すべて開いているが kill switch は閉じている」＝ Production の想定状態 */
function env(overrides: Partial<RankingEnv> = {}): RankingEnv {
  return {
    apiEnabled: true,
    databaseUrl: FAKE_DSN,
    submissionUnlocked: false,
    vercelEnv: 'production',
    ...overrides,
  }
}

/** DBは常にメモリ実装。`resolveStore` に接続文字列は渡るが、Neonへは一切繋がない */
function ctx(path: string, overrides: Partial<RankingEnv> = {}): RankingRouteContext {
  return {
    path,
    env: env(overrides),
    now: NOW,
    resolveStore: (): RankingStore => store,
  }
}

function post(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function get(path: string, query = ''): Request {
  return new Request(`${ORIGIN}${path}${query}`, { method: 'GET' })
}

async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

let me: TestIdentity
let seq = 0

beforeAll(async () => {
  me = await makeIdentity('api-me')
})

beforeEach(() => {
  store.clear()
  clearLeaderboardCache(store)
  seq = 0
})

function startBody() {
  seq++
  return { ...me, clientRunId: runId(`api-${seq}`) }
}

function submitBody(clientRunId: string) {
  seq++
  const run = playRecordedDailyRun({
    dailyKey: DAILY_KEY,
    godId: GOD,
    deck: getRecommendedDeck(GOD),
    policySeed: seq,
    clientRunId: 'c'.repeat(32),
  })
  return { ...me, clientRunId, input: toReplayInput(run.log) }
}

const ROUTES = [
  { path: '/api/ranking/start', method: 'POST' },
  { path: '/api/ranking/submit', method: 'POST' },
  { path: '/api/ranking/leaderboard', method: 'GET' },
] as const

function request(route: (typeof ROUTES)[number]): Request {
  return route.method === 'POST'
    ? post(route.path, startBody())
    : get(route.path, `?dailyKey=${DAILY_KEY}`)
}

describe('門番1：API 全体の開閉（既定で閉じている）', () => {
  it('RANKING_API_ENABLED が無ければ3本とも 503 を返し、保存層に触れない', async () => {
    let touched = false
    for (const route of ROUTES) {
      const response = await handleRankingHttp(request(route), {
        ...ctx(route.path, { apiEnabled: false }),
        resolveStore: () => {
          touched = true
          return store
        },
      })
      expect(response.status, route.path).toBe(503)
      expect(await bodyOf(response)).toEqual({ error: 'api_disabled' })
    }
    expect(touched, 'API が閉じているのに保存層を作っている').toBe(false)
  })

  it('接続文字列が無ければ 503（保存層を作らない）', async () => {
    let touched = false
    const response = await handleRankingHttp(get('/api/ranking/leaderboard', `?dailyKey=${DAILY_KEY}`), {
      ...ctx('/api/ranking/leaderboard', { databaseUrl: null }),
      resolveStore: () => {
        touched = true
        return store
      },
    })
    expect(response.status).toBe(503)
    expect(await bodyOf(response)).toEqual({ error: 'database_unconfigured' })
    expect(touched).toBe(false)
  })

  it('leaderboard の GET も同じ門番の内側にある（読み取りだけ先に開かない）', async () => {
    const response = await handleRankingHttp(
      get('/api/ranking/leaderboard', `?dailyKey=${DAILY_KEY}`),
      ctx('/api/ranking/leaderboard', { apiEnabled: false }),
    )
    expect(response.status).toBe(503)
  })
})

describe('門番2：kill switch（submissionEnabled=false のまま）', () => {
  it('API が開いていても start / submit は 503 で、枠を1つも発行しない', async () => {
    const start = await handleRankingHttp(post('/api/ranking/start', startBody()), ctx('/api/ranking/start'))
    expect(start.status).toBe(503)
    expect(await bodyOf(start)).toEqual({ error: 'submission_disabled' })

    const submit = await handleRankingHttp(
      post('/api/ranking/submit', submitBody(runId('locked'))),
      ctx('/api/ranking/submit'),
    )
    expect(submit.status).toBe(503)

    expect(await store.listTickets(DAILY_KEY, me.playerId)).toEqual([])
    expect(await store.listPlayerRuns(DAILY_KEY, me.playerId)).toEqual([])
  })

  it('kill switch が閉じていても leaderboard は読める（提出だけを止めている）', async () => {
    const response = await handleRankingHttp(
      get('/api/ranking/leaderboard', `?dailyKey=${DAILY_KEY}`),
      ctx('/api/ranking/leaderboard'),
    )
    expect(response.status).toBe(200)
    const board = await bodyOf(response)
    expect(board.dailyKey).toBe(DAILY_KEY)
    expect(board.totalPlayers).toBe(0)
  })

  it('rules.ts の定数は false のまま（Phase 4.8 で触っていない）', () => {
    expect(RULES.ranking.submissionEnabled).toBe(false)
  })
})

describe('門番3：Preview だけの unlock', () => {
  it('preview では start が通る（Preview QA が実地に流せる）', async () => {
    const response = await handleRankingHttp(
      post('/api/ranking/start', startBody()),
      ctx('/api/ranking/start', { submissionUnlocked: true, vercelEnv: 'preview' }),
    )
    expect(response.status).toBe(201)
    const body = await bodyOf(response)
    expect(body.attemptNo).toBe(1)
    expect(body.attemptsPerDay).toBe(RULES.daily.attemptsPerDay)
    expect(body.dailyKey).toBe(DAILY_KEY)
  })

  it('start → submit → leaderboard が Preview で一周する（Phase 4.6 の意味論が素通し）', async () => {
    const preview = { submissionUnlocked: true, vercelEnv: 'preview' as const }
    const clientRunId = runId('flow')

    const started = await handleRankingHttp(
      post('/api/ranking/start', { ...me, clientRunId }),
      ctx('/api/ranking/start', preview),
    )
    expect(started.status).toBe(201)

    const submitted = await handleRankingHttp(
      post('/api/ranking/submit', submitBody(clientRunId)),
      ctx('/api/ranking/submit', preview),
    )
    expect(submitted.status, JSON.stringify(await submitted.clone().json())).toBe(201)
    const result = await bodyOf(submitted)
    expect(result.accepted).toBe('stored')
    expect(typeof result.score).toBe('number')
    expect(result.attemptNo).toBe(1)

    clearLeaderboardCache(store)
    const board = await handleRankingHttp(
      get('/api/ranking/leaderboard', `?dailyKey=${DAILY_KEY}&playerId=${me.playerId}`),
      ctx('/api/ranking/leaderboard', preview),
    )
    expect(board.status).toBe(200)
    const page = await bodyOf(board)
    expect(page.totalPlayers).toBe(1)
    expect((page.self as { rank: number }).rank).toBe(1)
  })

  it('3回を超える start は Preview でも 409（3回勝負が素通しで守られている）', async () => {
    const preview = { submissionUnlocked: true, vercelEnv: 'preview' as const }
    for (let i = 1; i <= RULES.daily.attemptsPerDay; i++) {
      const ok = await handleRankingHttp(
        post('/api/ranking/start', { ...me, clientRunId: runId(`slot-${i}`) }),
        ctx('/api/ranking/start', preview),
      )
      expect(ok.status, `${i}回目`).toBe(201)
    }
    const over = await handleRankingHttp(
      post('/api/ranking/start', { ...me, clientRunId: runId('slot-over') }),
      ctx('/api/ranking/start', preview),
    )
    expect(over.status).toBe(409)
    expect((await bodyOf(over)).error).toBe('ATTEMPTS_EXCEEDED')
  })

  it('★production では unlock を要求されても開かない（env の入れ間違いで本番が開かない）', async () => {
    // `readRankingEnv()` が production で `submissionUnlocked` を false にする契約の、
    // 呼び出し側から見た姿。ここへ true が渡ってくること自体が無い
    const response = await handleRankingHttp(
      post('/api/ranking/start', startBody()),
      ctx('/api/ranking/start', { submissionUnlocked: false, vercelEnv: 'production' }),
    )
    expect(response.status).toBe(503)
    expect(await bodyOf(response)).toEqual({ error: 'submission_disabled' })
  })
})

describe('bodyの門番（64KB）', () => {
  const preview = { submissionUnlocked: true, vercelEnv: 'preview' as const }
  const over = RULES.ranking.maxBodyBytes + 1

  it('Content-Length が上限を超えていれば本文を読まずに 413', async () => {
    let read = false
    const request = new Request(`${ORIGIN}/api/ranking/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': String(over) },
      body: '{"a":1}',
    })
    Object.defineProperty(request, 'text', {
      value: async () => {
        read = true
        return '{"a":1}'
      },
    })
    const response = await handleRankingHttp(request, ctx('/api/ranking/submit', preview))
    expect(response.status).toBe(413)
    expect(await bodyOf(response)).toEqual({ error: 'payload_too_large' })
    expect(read, 'Content-Length で切る前に本文を読んでいる').toBe(false)
  })

  it('Content-Length を名乗らなくても実バイト数で 413（JSON解析より前）', async () => {
    // 解析できない巨大な文字列。413 が先に出れば、解析には到達していない
    const huge = `{"junk":"${'x'.repeat(over)}`
    const response = await handleRankingHttp(
      post('/api/ranking/submit', huge),
      ctx('/api/ranking/submit', preview),
    )
    expect(response.status).toBe(413)
  })

  it('マルチバイトは文字数ではなくバイト数で測る', async () => {
    // 「あ」はUTF-8で3バイト。文字数だけ見ていると上限を超えたことに気づけない
    const chars = Math.ceil(over / 3)
    const response = await handleRankingHttp(
      post('/api/ranking/submit', `{"junk":"${'あ'.repeat(chars)}"}`),
      ctx('/api/ranking/submit', preview),
    )
    expect(response.status).toBe(413)
  })

  it('壊れたJSONは 400', async () => {
    const response = await handleRankingHttp(
      post('/api/ranking/start', '{"playerId":'),
      ctx('/api/ranking/start', preview),
    )
    expect(response.status).toBe(400)
    expect(await bodyOf(response)).toEqual({ error: 'bad_request' })
  })

  it('空のbodyは 400（500にしない）', async () => {
    const response = await handleRankingHttp(
      post('/api/ranking/start', ''),
      ctx('/api/ranking/start', preview),
    )
    expect(response.status).toBe(400)
  })
})

describe('HTTPの詰め替え', () => {
  it('メソッド違いは契約どおりのJSONで 405', async () => {
    const wrong = await handleRankingHttp(get('/api/ranking/start'), ctx('/api/ranking/start', { submissionUnlocked: true, vercelEnv: 'preview' }))
    expect(wrong.status).toBe(405)
    expect(await bodyOf(wrong)).toEqual({ error: 'method_not_allowed' })

    const board = await handleRankingHttp(
      post('/api/ranking/leaderboard', {}),
      ctx('/api/ranking/leaderboard'),
    )
    expect(board.status).toBe(405)
  })

  it('dailyKey が無い／不正なら 400', async () => {
    for (const query of ['', '?dailyKey=', '?dailyKey=2026-13-40', '?dailyKey=yesterday']) {
      const response = await handleRankingHttp(
        get('/api/ranking/leaderboard', query),
        ctx('/api/ranking/leaderboard'),
      )
      expect(response.status, query).toBe(400)
      expect(await bodyOf(response)).toEqual({ error: 'bad_daily_key' })
    }
  })

  it('leaderboard はキャッシュ猶予を、start / submit は no-store を返す', async () => {
    const board = await handleRankingHttp(
      get('/api/ranking/leaderboard', `?dailyKey=${DAILY_KEY}`),
      ctx('/api/ranking/leaderboard'),
    )
    const seconds = RULES.ranking.leaderboardCacheSeconds
    expect(board.headers.get('cache-control')).toBe(
      `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 4}`,
    )

    const start = await handleRankingHttp(post('/api/ranking/start', startBody()), ctx('/api/ranking/start'))
    expect(start.headers.get('cache-control')).toBe('no-store')
  })

  it('応答は必ず JSON で、内容を推測させない', async () => {
    const response = await handleRankingHttp(
      get('/api/ranking/leaderboard', `?dailyKey=${DAILY_KEY}`),
      ctx('/api/ranking/leaderboard'),
    )
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
  })

  it('クエリはそのまま後段へ渡る（limit が効く）', async () => {
    const response = await handleRankingHttp(
      get('/api/ranking/leaderboard', `?dailyKey=${DAILY_KEY}&limit=1`),
      ctx('/api/ranking/leaderboard'),
    )
    expect(response.status).toBe(200)
    expect((await bodyOf(response)).rows).toEqual([])
  })

  it('保存層が落ちても中身を漏らさず 500 にする', async () => {
    const boom: RankingStore = {
      ...store,
      listDayRuns: async () => {
        throw new Error(`${FAKE_DSN} ${FAKE_HOST} is unreachable`)
      },
    }
    const response = await handleRankingHttp(get('/api/ranking/leaderboard', `?dailyKey=${DAILY_KEY}`), {
      ...ctx('/api/ranking/leaderboard'),
      resolveStore: () => boom,
    })
    expect(response.status).toBe(500)
    const text = await response.text()
    expect(text).toBe(JSON.stringify({ error: 'internal_error' }))
    expect(text).not.toContain('neon.tech')
    expect(text).not.toContain('postgres://')
  })
})

describe('秘密を外へ出さない', () => {
  const preview = { submissionUnlocked: true, vercelEnv: 'preview' as const }

  it('start / submit / leaderboard のどの応答にも秘密が出ない', async () => {
    const clientRunId = runId('secret-check')
    const responses = [
      await handleRankingHttp(
        post('/api/ranking/start', { ...me, clientRunId }),
        ctx('/api/ranking/start', preview),
      ),
      await handleRankingHttp(
        post('/api/ranking/submit', submitBody(clientRunId)),
        ctx('/api/ranking/submit', preview),
      ),
      await handleRankingHttp(
        get('/api/ranking/leaderboard', `?dailyKey=${DAILY_KEY}&playerId=${me.playerId}`),
        ctx('/api/ranking/leaderboard', preview),
      ),
    ]
    for (const response of responses) {
      const text = await response.text()
      expect(text).not.toContain(me.playerSecret)
      expect(text.toLowerCase()).not.toContain('playersecret')
      for (const [, value] of response.headers) {
        expect(value).not.toContain(me.playerSecret)
      }
    }
  })

  it('秘密が混ざった応答は送らずに 500 にする（最後の保険）', async () => {
    // 後段が誤って秘密を返した状況を、保存層を差し替えて再現する
    const leaky: RankingStore = {
      ...store,
      listDayRuns: async () => [
        {
          dailyKey: DAILY_KEY,
          playerId: me.playerId,
          clientRunId: runId('leak'),
          attemptNo: 1,
          gameVersion: '1.0',
          // 神IDの位置に秘密が紛れ込んだ、という想定
          godId: me.playerSecret as never,
          score: 1,
          win: true,
          round: 1,
          rngCursor: 0,
          actionCount: 1,
          submittedAt: NOW,
        },
      ],
    }
    const response = await handleRankingHttp(get('/api/ranking/leaderboard', `?dailyKey=${DAILY_KEY}`), {
      ...ctx('/api/ranking/leaderboard'),
      resolveStore: () => leaky,
    })
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain(me.playerSecret)
  })
})
