import { useEffect, useState } from 'react'
import { RULES } from '../../core/data/rules'
import { getAnonymousPlayerId } from '../../hooks/anonymousPlayerId'
import { fetchDailyLeaderboard, type LeaderboardResult } from '../../hooks/leaderboardClient'
import { buildRankingView, submissionNotice } from './dailyRanking'

/**
 * Phase 4.9：Daily 画面の「今日のランキング」。
 *
 * ★ここは薄い
 * 何を出すかは `dailyRanking.ts`（純関数）が決める。このファイルは
 * 取得の段取りと、出来上がったビューを描くことしかしない。
 *
 * ★ランキングが無くてもゲームは壊れない
 * 取得は失敗しても例外を投げない設計（`leaderboardClient.ts`）。
 * どの失敗も「案内文を1行出す」だけに落ち、神域挑戦の開始導線には一切触れない。
 *
 * ★日付が変わったら取り直す
 * `dateKey` が変わると `useEffect` が走り直し、前の日の結果は捨てる。
 * 遅れて返ってきた前の日の応答が新しい日の表示を上書きしないよう、
 * `cancelled` フラグで打ち切る。
 */

type DailyRankingPanelProps = {
  /** 今日の日付キー（JST）。GameFlow が確定して渡す */
  dateKey: string
}

export function DailyRankingPanel({ dateKey }: DailyRankingPanelProps) {
  const [result, setResult] = useState<LeaderboardResult | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // 日付が変わったら必ず「取得中」からやり直す（前の日の順位を残さない）
    setResult(null)

    void (async () => {
      let id: string | null = null
      try {
        id = await getAnonymousPlayerId()
      } catch {
        // IDが作れなくてもランキングは見られる（自分の行が出ないだけ）
        id = null
      }
      if (cancelled) return
      setPlayerId(id)

      const next = await fetchDailyLeaderboard(dateKey, id ? { playerId: id } : {})
      if (cancelled) return
      setResult(next)
    })()

    return () => {
      cancelled = true
    }
  }, [dateKey])

  const view = buildRankingView({ result, playerId })
  const notice = submissionNotice()

  return (
    <section className="daily-ranking" aria-label="今日のランキング">
      <div className="daily-ranking-head">
        <h3 className="daily-ranking-title">今日のランキング</h3>
        {view.kind === 'ready' && (
          <span className="daily-ranking-total">参加 {view.totalPlayersLabel}</span>
        )}
      </div>

      {view.kind === 'loading' && (
        <p className="daily-ranking-state" role="status">
          ランキングを読み込んでいます…
        </p>
      )}

      {view.kind === 'unavailable' && (
        <p className="daily-ranking-state" role="status">
          {view.message}
        </p>
      )}

      {view.kind === 'empty' && (
        <p className="daily-ranking-state" role="status">
          {view.message}
        </p>
      )}

      {view.kind === 'ready' && (
        <>
          {view.self ? (
            <div className="daily-ranking-self">
              <div className="daily-ranking-self-main">
                <span className="daily-ranking-self-rank">{view.self.rankLabel}</span>
                <span className="daily-ranking-self-score">{view.self.scoreLabel}点</span>
              </div>
              <div className="daily-ranking-self-sub">
                <span>{view.self.topPercent}</span>
                {view.self.tie && <span>{view.self.tie}</span>}
                {view.self.gapLabel && <span>{view.self.gapLabel}</span>}
              </div>
            </div>
          ) : (
            view.selfMessage && (
              <p className="daily-ranking-state" role="status">
                {view.selfMessage}
              </p>
            )
          )}

          <div className="daily-ranking-list-wrap">
            <table className="daily-ranking-table" aria-label="今日の上位">
              <thead>
                <tr>
                  <th className="num">順位</th>
                  <th>プレイヤー</th>
                  <th>神</th>
                  <th className="num">スコア</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((row) => (
                  <tr
                    key={row.key}
                    className={row.isSelf ? 'daily-ranking-row daily-ranking-row-self' : 'daily-ranking-row'}
                  >
                    <td className="num">
                      <span className="daily-ranking-rank">{row.rankLabel}</span>
                      {/* 同順位は色ではなく文字で示す。読み上げにも乗る */}
                      {row.tie && <span className="daily-ranking-tie">{row.tie}</span>}
                    </td>
                    {/*
                      自分の行の見分けは「あなた」という**文字**が担う（色に頼らない）。
                      背景色と左の帯は補助でしかない。
                      名前がもう「あなた」なので、重ねて印を足すと二重に読み上げられる。
                    */}
                    <td>
                      <span className={row.isSelf ? 'daily-ranking-name daily-ranking-you' : 'daily-ranking-name'}>
                        {row.name}
                      </span>
                    </td>
                    <td className="daily-ranking-god">{row.godName}</td>
                    <td className="num">
                      <span className="daily-ranking-score">{row.scoreLabel}</span>
                      <span className="daily-ranking-outcome">
                        {row.outcome}・{row.roundLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {view.moreLabel && <p className="daily-ranking-more">{view.moreLabel}</p>}
          {!view.self?.listed && view.self && (
            <p className="daily-ranking-more">あなたの順位は上位{RULES.ranking.leaderboardTopCount}人の外です。</p>
          )}
        </>
      )}

      {notice && <p className="daily-ranking-notice">{notice}</p>}
    </section>
  )
}
