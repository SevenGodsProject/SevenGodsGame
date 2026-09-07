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
}

export async function getLeaderboard(
  dailyKey: string,
  store: RankingStore,
  options: LeaderboardOptions = {},
): Promise<Leaderboard> {
  const limit = options.limit ?? RULES.ranking.leaderboardLimit
  const runs = bestPerPlayer(await store.listDayRuns(dailyKey))

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
