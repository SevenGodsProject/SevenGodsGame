import { RULES, assignRanks } from './deps'
import type { RankingStore } from './store'
import type { Leaderboard, LeaderboardRow, RankingRun } from './types'

/**
 * Phase 4.3：リーダーボードの組み立て。
 *
 * ★順位の規則は決定133で固定した `assignRanks` に**必ず**通す。
 * ここで独自にソートして順位を振ると、「同点は同順位」「先着は順位を決めない」が
 * サーバー実装のどこかで静かに崩れる。規則は1か所にしか存在させない。
 *
 * ★1人1行にしてから順位を付ける
 * 1日3回挑戦できるので、生の保存には同じプレイヤーの行が最大3件ある。
 * ランキングはその日の**ベスト1件**で競う（決定133 Known Risk 5 の方針をここで確定）。
 * 全件を並べると1人で上位を占められてしまい、「その日の最高スコアを競う」という
 * Dailyの趣旨（決定131）と合わなくなるため。
 */

/** 同じプレイヤーの複数runから、その日の代表（ベスト）を1件選ぶ */
function bestPerPlayer(runs: RankingRun[]): RankingRun[] {
  const best = new Map<string, RankingRun>()
  for (const run of runs) {
    const current = best.get(run.playerId)
    if (
      !current ||
      run.score > current.score ||
      // 完全同点なら先に提出された方を代表にする（表示の安定のためだけで、
      // 順位そのものには影響しない＝同点は同順位）
      (run.score === current.score && run.submittedAt < current.submittedAt)
    ) {
      best.set(run.playerId, run)
    }
  }
  return [...best.values()]
}

export type LeaderboardOptions = {
  /** 返す最大件数。既定は `RULES.ranking.leaderboardLimit` */
  limit?: number
  /** 指定すると、その人の行を `self` として必ず返す（圏外でも） */
  playerId?: string
  /**
   * Phase 4.6（決定139 §7-2）：現在時刻。渡すと**その日の集計を短時間だけ使い回す**。
   * 省略するとキャッシュを使わない（既存の呼び出し・テストは挙動が変わらない）。
   */
  now?: number
}

/**
 * Phase 4.6：集計結果の短期キャッシュ。
 *
 * リーダーボードのGETは毎回その日の全runを読み出して順位付けする。連打されると
 * Neon Free の CU-hours と egress を最も早く食い潰す経路になる（決定139 T13）。
 * `leaderboardCacheSeconds` の間は同じ集計を使い回す。
 *
 * ★storeごとに分けて持つ（WeakMap）
 * テストや複数テナントで別のstoreを使ったときに、他のstoreの結果が見えないようにするため。
 * storeが捨てられればキャッシュも一緒に回収される。
 */
type CacheEntry = { at: number; runs: RankingRun[] }
const dayRunsCache = new WeakMap<RankingStore, Map<string, CacheEntry>>()

async function listDayRunsCached(
  dailyKey: string,
  store: RankingStore,
  now: number | undefined,
): Promise<RankingRun[]> {
  if (now === undefined) return store.listDayRuns(dailyKey)
  const ttl = RULES.ranking.leaderboardCacheSeconds * 1000
  let byDay = dayRunsCache.get(store)
  if (!byDay) {
    byDay = new Map()
    dayRunsCache.set(store, byDay)
  }
  const hit = byDay.get(dailyKey)
  // 時刻が巻き戻る（テストで固定時刻を前後させる）場合も作り直す
  if (hit && now >= hit.at && now - hit.at < ttl) return hit.runs
  const runs = await store.listDayRuns(dailyKey)
  byDay.set(dailyKey, { at: now, runs })
  return runs
}

/** テスト・運用用：キャッシュを捨てる */
export function clearLeaderboardCache(store: RankingStore): void {
  dayRunsCache.delete(store)
}

export async function getLeaderboard(
  dailyKey: string,
  store: RankingStore,
  options: LeaderboardOptions = {},
): Promise<Leaderboard> {
  const limit = options.limit ?? RULES.ranking.leaderboardLimit
  const runs = bestPerPlayer(await listDayRunsCached(dailyKey, store, options.now))

  // 提出が早い順に渡す＝同順位内の**表示順**だけが提出時刻に従う。
  // 順位・同点人数・パーセンタイルは `assignRanks` が決め、提出時刻に依存しない
  const ordered = [...runs].sort((a, b) => a.submittedAt - b.submittedAt)
  const ranked = assignRanks(ordered.map((run) => ({ entry: run, score: run.score })))

  const toRow = (r: (typeof ranked)[number]): LeaderboardRow => ({
    playerId: r.entry.playerId,
    godId: r.entry.godId,
    score: r.score,
    win: r.entry.win,
    round: r.entry.round,
    rank: r.rank,
    tiedCount: r.tiedCount,
    topPercent: r.topPercent,
    pointsToNextRank: r.pointsToNextRank,
  })

  const rows = ranked.slice(0, limit).map(toRow)
  const selfRanked = options.playerId
    ? ranked.find((r) => r.entry.playerId === options.playerId)
    : undefined

  return {
    dailyKey,
    totalPlayers: ranked.length,
    rows,
    self: selfRanked ? toRow(selfRanked) : null,
  }
}
