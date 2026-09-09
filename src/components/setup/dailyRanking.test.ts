import { describe, expect, it } from 'vitest'
import { RULES } from '../../core/data/rules'
import { formatScaled } from '../displayScale'
import type { LeaderboardData, LeaderboardRowData } from '../../hooks/leaderboardClient'
import {
  buildRankingView,
  outcomeLabel,
  shortPlayerLabel,
  submissionNotice,
  tieLabel,
  topPercentLabel,
} from './dailyRanking'

/**
 * Phase 4.9：ランキング表示の組み立て。
 *
 * 描画は見ないが、**間違えたら痛い分岐**はここで全部固定する：
 * 0人／1人／同点／Top10の境界／自分がTop外／自分だけ取れた／取得失敗。
 */

const ME = 'a'.repeat(32)
const TOP = RULES.ranking.leaderboardTopCount

function row(over: Partial<LeaderboardRowData> = {}): LeaderboardRowData {
  return {
    playerId: 'b'.repeat(32),
    godId: 'ebisu',
    score: 1000,
    win: true,
    round: 5,
    rank: 1,
    tiedCount: 1,
    topPercent: 10,
    pointsToNextRank: null,
    ...over,
  }
}

function data(over: Partial<LeaderboardData> = {}): LeaderboardData {
  return { dailyKey: '2026-09-10', totalPlayers: 1, rows: [row()], self: null, ...over }
}

const ready = (board: LeaderboardData, playerId: string | null = ME) =>
  buildRankingView({ result: { ok: true, board }, playerId })

describe('匿名プレイヤーの見せ方', () => {
  it('生の32桁を全面表示しない', () => {
    const label = shortPlayerLabel(ME)
    expect(label).not.toContain(ME)
    expect(label.length).toBeLessThan(ME.length)
  })

  it('先頭4桁だけを大文字で見せる', () => {
    expect(shortPlayerLabel('3574b035627edbf66001931a05dafd5e')).toBe('プレイヤー 3574')
  })

  it('空IDでも壊れない', () => {
    expect(shortPlayerLabel('')).toBe('プレイヤー')
  })

  it('自分の行は「あなた」と文字で示す（色に頼らない）', () => {
    const view = ready(data({ rows: [row({ playerId: ME })] }))
    expect(view.kind).toBe('ready')
    if (view.kind !== 'ready') return
    expect(view.rows[0].name).toBe('あなた')
    expect(view.rows[0].isSelf).toBe(true)
  })

  it('他人の行に「あなた」は付かない', () => {
    const view = ready(data())
    if (view.kind !== 'ready') return
    expect(view.rows[0].isSelf).toBe(false)
    expect(view.rows[0].name).not.toBe('あなた')
  })

  it('playerId が無ければ誰も自分扱いしない', () => {
    const view = ready(data({ rows: [row({ playerId: ME })] }), null)
    if (view.kind !== 'ready') return
    expect(view.rows[0].isSelf).toBe(false)
  })
})

describe('順位のラベル', () => {
  it('順位は必ず数字の文字で持つ（色だけで区別しない）', () => {
    const view = ready(data({ rows: [row({ rank: 3 })] }))
    if (view.kind !== 'ready') return
    expect(view.rows[0].rankLabel).toBe('3位')
  })

  it('同点は同順位。1,1,3 になる並びをそのまま出す', () => {
    const view = ready(
      data({
        totalPlayers: 3,
        rows: [
          row({ playerId: 'p1'.padEnd(32, '0'), rank: 1, tiedCount: 2, score: 900 }),
          row({ playerId: 'p2'.padEnd(32, '0'), rank: 1, tiedCount: 2, score: 900 }),
          row({ playerId: 'p3'.padEnd(32, '0'), rank: 3, tiedCount: 1, score: 800 }),
        ],
      }),
    )
    if (view.kind !== 'ready') return
    expect(view.rows.map((r) => r.rank)).toEqual([1, 1, 3])
    expect(view.rows.map((r) => r.rankLabel)).toEqual(['1位', '1位', '3位'])
  })

  it('同順位の人数を出す。1人のときは出さない', () => {
    expect(tieLabel(2)).toBe('2人が同順位')
    expect(tieLabel(5)).toBe('5人が同順位')
    expect(tieLabel(1)).toBeNull()
    expect(tieLabel(0)).toBeNull()
  })

  it('★サーバーの順位を作り直さない（並べ替えない）', () => {
    // わざと順位順になっていない配列を渡しても、順序も rank も触らない
    const view = ready(
      data({
        totalPlayers: 2,
        rows: [row({ playerId: 'z'.repeat(32), rank: 2 }), row({ playerId: 'y'.repeat(32), rank: 1 })],
      }),
    )
    if (view.kind !== 'ready') return
    expect(view.rows.map((r) => r.rank)).toEqual([2, 1])
  })

  it('勝敗は文字で持つ', () => {
    expect(outcomeLabel(true)).toBe('勝利')
    expect(outcomeLabel(false)).toBe('未撃破')
  })

  it('上位%は切り上げ、1位でも「上位0%」にならない', () => {
    expect(topPercentLabel(0)).toBe('上位 1%')
    expect(topPercentLabel(0.4)).toBe('上位 1%')
    expect(topPercentLabel(12.1)).toBe('上位 13%')
    expect(topPercentLabel(100)).toBe('上位 100%')
  })

  it('範囲外の%が来ても壊れない', () => {
    expect(topPercentLabel(-5)).toBe('上位 1%')
    expect(topPercentLabel(999)).toBe('上位 100%')
  })
})

describe('状態ごとの表示', () => {
  it('取得前は loading', () => {
    expect(buildRankingView({ result: null, playerId: ME })).toEqual({ kind: 'loading' })
  })

  it('0人なら empty（エラーに見せない）', () => {
    const view = ready(data({ totalPlayers: 0, rows: [] }))
    expect(view.kind).toBe('empty')
    if (view.kind !== 'empty') return
    expect(view.message).toContain('まだ誰も')
  })

  it('totalPlayers が正でも rows が空なら empty', () => {
    expect(ready(data({ totalPlayers: 5, rows: [] })).kind).toBe('empty')
  })

  it('1人だけでも成立する', () => {
    const view = ready(data({ totalPlayers: 1, rows: [row({ playerId: ME })], self: row({ playerId: ME }) }))
    if (view.kind !== 'ready') return
    expect(view.totalPlayersLabel).toBe('1人')
    expect(view.rows).toHaveLength(1)
    expect(view.moreLabel).toBeNull()
  })

  it('取得失敗はそれぞれ別の日本語になる', () => {
    const seen = new Set<string>()
    for (const reason of ['disabled', 'unavailable', 'offline', 'bad-request'] as const) {
      const view = buildRankingView({ result: { ok: false, reason }, playerId: ME })
      expect(view.kind).toBe('unavailable')
      if (view.kind !== 'unavailable') continue
      expect(view.message.length).toBeGreaterThan(0)
      seen.add(view.message)
    }
    // 「準備中」と「障害」を同じ文言にしない
    expect(seen.size).toBeGreaterThanOrEqual(3)
  })

  it('未稼働のときは「準備中」と伝える（壊れたとは言わない）', () => {
    const view = buildRankingView({ result: { ok: false, reason: 'disabled' }, playerId: ME })
    if (view.kind !== 'unavailable') return
    expect(view.message).toContain('準備中')
  })
})

describe('自分の成績', () => {
  it('順位・スコア・上位%・同順位・次との差を出す', () => {
    const view = ready(
      data({
        totalPlayers: 20,
        rows: [row()],
        self: row({ playerId: ME, rank: 4, score: 880, tiedCount: 2, topPercent: 20, pointsToNextRank: 120 }),
      }),
    )
    if (view.kind !== 'ready') return
    expect(view.self).not.toBeNull()
    expect(view.self?.rankLabel).toBe('4位')
    expect(view.self?.scoreLabel).toBe(formatScaled(880))
    expect(view.self?.topPercent).toBe('上位 20%')
    expect(view.self?.tie).toBe('2人が同順位')
    expect(view.self?.gapLabel).toBe(`次の順位まで ${formatScaled(120)}点`)
  })

  it('最上位は「次の順位まで」を出さない', () => {
    const view = ready(data({ self: row({ playerId: ME, rank: 1, pointsToNextRank: null }) }))
    if (view.kind !== 'ready') return
    expect(view.self?.gapLabel).toBeNull()
  })

  it('差が0でも出さない', () => {
    const view = ready(data({ self: row({ playerId: ME, pointsToNextRank: 0 }) }))
    if (view.kind !== 'ready') return
    expect(view.self?.gapLabel).toBeNull()
  })

  it('まだ記録が無ければ案内を出す（順位を捏造しない）', () => {
    const view = ready(data({ self: null }))
    if (view.kind !== 'ready') return
    expect(view.self).toBeNull()
    expect(view.selfMessage).toContain('まだ記録がありません')
  })

  it('自分が上位一覧に載っていれば listed=true', () => {
    const view = ready(data({ rows: [row({ playerId: ME })], self: row({ playerId: ME }) }))
    if (view.kind !== 'ready') return
    expect(view.self?.listed).toBe(true)
  })

  it('★自分がTop外なら listed=false（それでも自分の順位は出る）', () => {
    const view = ready(
      data({
        totalPlayers: 50,
        rows: [row({ playerId: 'c'.repeat(32) })],
        self: row({ playerId: ME, rank: 42, topPercent: 84 }),
      }),
    )
    if (view.kind !== 'ready') return
    expect(view.self?.listed).toBe(false)
    expect(view.self?.rankLabel).toBe('42位')
  })
})

describe('表示件数の境界', () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      row({ playerId: String(i).padEnd(32, 'f'), rank: i + 1, score: 1000 - i }),
    )

  it(`ちょうど${TOP}件なら全部出し、「全N人」は出さない`, () => {
    const view = ready(data({ totalPlayers: TOP, rows: many(TOP) }))
    if (view.kind !== 'ready') return
    expect(view.rows).toHaveLength(TOP)
    expect(view.moreLabel).toBeNull()
  })

  it(`${TOP}件を超えて返ってきても${TOP}件に切る（画面を伸ばさない）`, () => {
    const view = ready(data({ totalPlayers: 100, rows: many(100) }))
    if (view.kind !== 'ready') return
    expect(view.rows).toHaveLength(TOP)
    expect(view.rows[TOP - 1].rank).toBe(TOP)
  })

  it('参加者が表示件数より多ければ全体人数を伝える', () => {
    const view = ready(data({ totalPlayers: 100, rows: many(100) }))
    if (view.kind !== 'ready') return
    expect(view.moreLabel).toBe(`上位${TOP}人を表示（全100人）`)
  })

  it(`${TOP}件未満なら足りないぶんは出さない`, () => {
    const view = ready(data({ totalPlayers: 3, rows: many(3) }))
    if (view.kind !== 'ready') return
    expect(view.rows).toHaveLength(3)
    expect(view.moreLabel).toBeNull()
  })

  it('topCount を明示すればそれに従う', () => {
    const view = buildRankingView({
      result: { ok: true, board: data({ totalPlayers: 20, rows: many(20) }) },
      playerId: ME,
      topCount: 3,
    })
    if (view.kind !== 'ready') return
    expect(view.rows).toHaveLength(3)
  })
})

describe('提出が閉じている間の但し書き', () => {
  it('kill switch が閉じている今は「まだ登録されない」と伝える', () => {
    // Phase 4.9 時点では false のまま。開いたら null になる
    const notice = submissionNotice()
    if (RULES.ranking.submissionEnabled) {
      expect(notice).toBeNull()
    } else {
      expect(notice).not.toBeNull()
      expect(notice).toContain('登録されません')
    }
  })

  it('★「送信できる」と誤解させる文言を含まない', () => {
    const notice = submissionNotice() ?? ''
    for (const misleading of ['送信しました', '登録されました', 'ランキングに反映']) {
      expect(notice).not.toContain(misleading)
    }
  })
})

describe('スコアの表示は既存の桁揃えを通す', () => {
  it('formatScaled を通した文字列で出す（生の内部値を出さない）', () => {
    const view = ready(data({ rows: [row({ score: 1234 })] }))
    if (view.kind !== 'ready') return
    expect(view.rows[0].scoreLabel).toBe(formatScaled(1234))
    expect(view.rows[0].scoreLabel).not.toBe('1234')
  })
})
