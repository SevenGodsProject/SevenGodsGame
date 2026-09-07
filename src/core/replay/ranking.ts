/**
 * Phase 4.2 Step 11：順位付けの規則を「仕様文」ではなく実行できる形で固定する。
 *
 * ★背景（Phase 4.0 決定131 §6・§13-2）
 * Daily は決定論パズルであり、到達しうるスコアの種類数が参加人数に依存せず137前後で
 * 頭打ちになる。1,000人で1順位あたり3.11人、3,000人で8.71人が同点になり、
 * **一意の順位を提示すると実質の決定要因が「先に送った人」になる**。二次tie-break
 * （撃破ラウンド・残HP・操作回数）は撃破R＝tempo・残HP＝survivalとして既にスコア式へ
 * 織り込まれているため解消率1〜12%で無力、素点キーも整数のため無効だった。
 *
 * ★したがって規則は「同点を同点として正直に扱う」：
 *   1. 同じスコアは**同順位**（1, 1, 3 方式＝competition ranking）
 *   2. 同順位の人数を併記する（`tiedCount`）
 *   3. パーセンタイルを併記する（`topPercent`）。参加者が増えるほど順位より意味を持つ
 *   4. **提出時刻（先着）は順位を決めない。** 同順位内の表示順にしか使わない
 *   5. 「次の順位まであと○点」は**次の異なるスコア**までの差分（`pointsToNextRank`）
 *
 * Phase 4.3（Backend）・4.4（UI）はこの関数を使う。仕様をコメントだけに置くと
 * 実装のたびに解釈がぶれるため、規則そのものをテスト可能な関数として置いている。
 * ここはランキング**UI**でもBackendでもなく、順位の定義だけを持つ純粋関数。
 */

export type RankableEntry<T> = {
  entry: T
  /** 検証済みスコア（`VerifiedOutcome.score`）。クライアントの申告値ではない */
  score: number
}

export type RankedEntry<T> = {
  entry: T
  score: number
  /** 1始まりの順位。同点は同じ値になり、次は人数ぶん飛ぶ（1,1,3） */
  rank: number
  /** この順位を分け合っている人数（1なら単独） */
  tiedCount: number
  /** 上位何%か（rank ÷ 参加者数 × 100）。表示側で丸める */
  topPercent: number
  /** 次に高い「異なるスコア」までの差。最上位はnull */
  pointsToNextRank: number | null
}

/**
 * スコア降順で競技順位を付ける。
 *
 * 入力の並び順は結果の**同順位内の並び**にのみ影響する（安定ソート）。
 * 呼び出し側が提出時刻順で渡せば「同順位内は先着順に表示」になるが、
 * 順位そのものは提出時刻に一切左右されない。
 */
export function assignRanks<T>(entries: RankableEntry<T>[]): RankedEntry<T>[] {
  const total = entries.length
  if (total === 0) return []

  // 安定ソート（Array.prototype.sortはES2019以降で安定）。同点は入力順のまま残る
  const sorted = [...entries].sort((a, b) => b.score - a.score)

  // スコアごとの人数と、そのスコアの順位（自分より高いスコアの人数 + 1）
  const distinctScores: number[] = []
  const countByScore = new Map<number, number>()
  for (const item of sorted) {
    if (!countByScore.has(item.score)) distinctScores.push(item.score)
    countByScore.set(item.score, (countByScore.get(item.score) ?? 0) + 1)
  }

  const rankByScore = new Map<number, number>()
  const nextScoreByScore = new Map<number, number | null>()
  let position = 1
  for (let i = 0; i < distinctScores.length; i++) {
    const score = distinctScores[i]
    rankByScore.set(score, position)
    nextScoreByScore.set(score, i === 0 ? null : distinctScores[i - 1])
    position += countByScore.get(score) ?? 0
  }

  return sorted.map((item) => {
    const rank = rankByScore.get(item.score) as number
    const nextScore = nextScoreByScore.get(item.score) ?? null
    return {
      entry: item.entry,
      score: item.score,
      rank,
      tiedCount: countByScore.get(item.score) as number,
      topPercent: (rank / total) * 100,
      pointsToNextRank: nextScore === null ? null : nextScore - item.score,
    }
  })
}
