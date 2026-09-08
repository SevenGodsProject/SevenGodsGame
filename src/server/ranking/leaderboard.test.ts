import { beforeEach, describe, expect, it } from 'vitest'
import { RULES } from '../../core/data/rules'
import { GOD_IDS } from '../../core/data/gods'
import { getGameVersion } from '../../core/replay'
import { clearLeaderboardCache, getLeaderboard } from './leaderboard'
import { createMemoryRankingStore } from './store'
import type { RankingRun } from './types'

/**
 * Phase 4.3：リーダーボード。
 *
 * ★決定133で固定した規則（同点＝同順位・先着は順位を決めない）が、
 * サーバー実装でも崩れていないことを確かめる。順位は必ず `assignRanks` を通す。
 */

const DAILY_KEY = '2026-09-09'
const store = createMemoryRankingStore()

let seq = 0
function run(playerId: string, score: number, submittedAt?: number): RankingRun {
  seq++
  return {
    dailyKey: DAILY_KEY,
    playerId,
    clientRunId: String(seq).padStart(32, '0'),
    attemptNo: ((seq - 1) % RULES.daily.attemptsPerDay) + 1,
    gameVersion: getGameVersion(),
    godId: GOD_IDS.ebisu,
    score,
    win: true,
    round: 5,
    rngCursor: 100,
    actionCount: 20,
    submittedAt: submittedAt ?? seq,
  }
}

async function seed(...runs: RankingRun[]) {
  for (const r of runs) await store.insertRun(r)
}

beforeEach(() => {
  store.clear()
  seq = 0
})

describe('getLeaderboard', () => {
  it('1人1行になる（その日のベストで競う）', async () => {
    await seed(run('p1', 800), run('p1', 950), run('p1', 700), run('p2', 900))
    const board = await getLeaderboard(DAILY_KEY, store)
    expect(board.totalPlayers).toBe(2)
    expect(board.rows.map((r) => [r.playerId, r.score])).toEqual([
      ['p1', 950],
      ['p2', 900],
    ])
  })

  it('同点は同順位になり、次は人数ぶん飛ぶ（1, 1, 3）', async () => {
    await seed(run('p1', 900), run('p2', 900), run('p3', 850), run('p4', 800))
    const board = await getLeaderboard(DAILY_KEY, store)
    expect(board.rows.map((r) => r.rank)).toEqual([1, 1, 3, 4])
    expect(board.rows.map((r) => r.tiedCount)).toEqual([2, 2, 1, 1])
  })

  it('提出時刻は順位を決めない。同順位内の表示順にだけ効く', async () => {
    // 後から出した p2 の方が submittedAt は大きい
    await seed(run('p1', 900, 200), run('p2', 900, 100))
    const board = await getLeaderboard(DAILY_KEY, store)
    // 両者とも1位（先に出した方が上位になったりしない）
    expect(board.rows.every((r) => r.rank === 1)).toBe(true)
    // 表示順だけが提出時刻順（p2が先）
    expect(board.rows.map((r) => r.playerId)).toEqual(['p2', 'p1'])
  })

  it('パーセンタイルと「次の順位まであと○点」を返す', async () => {
    await seed(run('p1', 1000), run('p2', 950), run('p3', 950), run('p4', 900))
    const board = await getLeaderboard(DAILY_KEY, store)
    expect(board.rows.map((r) => r.pointsToNextRank)).toEqual([null, 50, 50, 50])
    expect(board.rows[0].topPercent).toBe(25)
    expect(board.rows[3].topPercent).toBe(100)
  })

  it('自分の行は圏外でも必ず返る', async () => {
    for (let i = 0; i < 20; i++) await seed(run(`p${i}`, 1000 - i))
    await seed(run('me', 100))
    const board = await getLeaderboard(DAILY_KEY, store, { limit: 5, playerId: 'me' })
    expect(board.rows.length).toBe(5)
    expect(board.rows.some((r) => r.playerId === 'me')).toBe(false)
    expect(board.self?.playerId).toBe('me')
    expect(board.self?.rank).toBe(21)
    expect(board.totalPlayers).toBe(21)
  })

  it('参加者が居ない日は空を返す', async () => {
    const board = await getLeaderboard(DAILY_KEY, store, { playerId: 'me' })
    expect(board.totalPlayers).toBe(0)
    expect(board.rows).toEqual([])
    expect(board.self).toBeNull()
  })

  it('件数上限を守る', async () => {
    for (let i = 0; i < RULES.ranking.leaderboardLimit + 30; i++) {
      await seed(run(`p${i}`, 1000 - i))
    }
    const board = await getLeaderboard(DAILY_KEY, store)
    expect(board.rows.length).toBe(RULES.ranking.leaderboardLimit)
    expect(board.totalPlayers).toBe(RULES.ranking.leaderboardLimit + 30)
  })

  it('別の日のrunは混ざらない', async () => {
    await seed(run('p1', 900))
    await store.insertRun({ ...run('p2', 9999), dailyKey: '2026-09-10' })
    const board = await getLeaderboard(DAILY_KEY, store)
    expect(board.totalPlayers).toBe(1)
    expect(board.rows[0].playerId).toBe('p1')
  })

  it('Phase 4.0が測ったTie Densityの規模（1,000人・137種）でも規則が保たれる', async () => {
    for (let i = 0; i < 1000; i++) await seed(run(`p${i}`, 900 + (i % 137)))
    const board = await getLeaderboard(DAILY_KEY, store, { limit: 1000 })
    expect(board.totalPlayers).toBe(1000)
    // 順位の種類数＝スコアの種類数（同点が潰れている）
    expect(new Set(board.rows.map((r) => r.rank)).size).toBe(137)
    // 各同点グループの人数が一致している
    const byRank = new Map<number, number>()
    for (const r of board.rows) byRank.set(r.rank, (byRank.get(r.rank) ?? 0) + 1)
    for (const r of board.rows) expect(r.tiedCount).toBe(byRank.get(r.rank))
  })
})

describe('短期キャッシュ（Phase 4.6：Neon Free の保護）', () => {
  it('nowを渡すと、cache秒数の間はDBを読み直さない', async () => {
    clearLeaderboardCache(store)
    await seed(run('p1', 800))
    let reads = 0
    const counting = {
      ...store,
      async listDayRuns(dailyKey: string) {
        reads++
        return store.listDayRuns(dailyKey)
      },
    }
    const t0 = 1_000_000
    await getLeaderboard(DAILY_KEY, counting, { now: t0 })
    for (let i = 0; i < 20; i++) {
      await getLeaderboard(DAILY_KEY, counting, { now: t0 + i * 100 })
    }
    expect(reads, '猶予の間に何度もDBを読んでいる').toBe(1)

    // 猶予を過ぎたら読み直す
    await getLeaderboard(DAILY_KEY, counting, {
      now: t0 + RULES.ranking.leaderboardCacheSeconds * 1000 + 1,
    })
    expect(reads).toBe(2)
    clearLeaderboardCache(counting)
  })

  it('nowを渡さなければキャッシュしない（既存の呼び出しは挙動が変わらない）', async () => {
    clearLeaderboardCache(store)
    await seed(run('p1', 800))
    let reads = 0
    const counting = {
      ...store,
      async listDayRuns(dailyKey: string) {
        reads++
        return store.listDayRuns(dailyKey)
      },
    }
    await getLeaderboard(DAILY_KEY, counting)
    await getLeaderboard(DAILY_KEY, counting)
    expect(reads).toBe(2)
  })

  it('別のstoreのキャッシュは混ざらない', async () => {
    const other = createMemoryRankingStore()
    await seed(run('p1', 800))
    const t0 = 2_000_000
    const a = await getLeaderboard(DAILY_KEY, store, { now: t0 })
    const b = await getLeaderboard(DAILY_KEY, other, { now: t0 })
    expect(a.totalPlayers).toBe(1)
    expect(b.totalPlayers).toBe(0)
    clearLeaderboardCache(store)
  })
})
