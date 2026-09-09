import { GODS } from '../../core/data/gods'
import { RULES } from '../../core/data/rules'
import { formatScaled } from '../displayScale'
import type { LeaderboardData, LeaderboardFailure, LeaderboardRowData } from '../../hooks/leaderboardClient'

/**
 * Phase 4.9：Daily ランキング表示の**組み立て**。
 *
 * ★描画から切り離してある理由
 * このリポジトリのテストは DOM を描画しない（`.tsx` のテストは1つも無く、
 * 表示ロジックは純関数として `.ts` 側で検査するのが既存の作法）。
 * 「同点は同順位」「自分がTop外」「0人」「1人」といった**間違えたら痛い分岐**を
 * ここへ集めておけば、描画抜きで全部固定できる。
 *
 * ★順位は作り直さない
 * `rank` / `tiedCount` / `topPercent` / `pointsToNextRank` は**サーバーが計算した値**を
 * そのまま表示する。クライアントで並べ替えたり順位を振り直したりしない
 * （決定133 の `assignRanks` が唯一の規則で、二重実装するといつか食い違う）。
 */

/** 匿名IDの表示長。32桁の生値は出さず、先頭だけを識別子として見せる */
const SHORT_ID_LENGTH = 4

/**
 * 匿名プレイヤーの表示名。
 *
 * `playerId` は32桁の16進で、リーダーボード上は公開情報だが、
 * **生値をそのまま並べても読めないうえ、端末を跨いだ追跡の手掛かりになる**。
 * 先頭4桁だけを大文字で見せ、「匿名の誰か」であることが分かる形にする。
 */
export function shortPlayerLabel(playerId: string): string {
  const head = playerId.slice(0, SHORT_ID_LENGTH).toUpperCase()
  return head.length > 0 ? `プレイヤー ${head}` : 'プレイヤー'
}

function godNameOf(godId: string): string {
  return GODS.find((g) => g.id === godId)?.nameJa ?? '—'
}

/** 「勝利」「未撃破」。色だけに頼らないよう、必ず文字で持つ */
export function outcomeLabel(win: boolean): string {
  return win ? '勝利' : '未撃破'
}

/** 同順位の人数。1人なら出さない（「1人同点」は意味が無い） */
export function tieLabel(tiedCount: number): string | null {
  return tiedCount > 1 ? `${tiedCount}人が同順位` : null
}

/**
 * 上位何%か。
 * サーバーは 0〜100 の数値を返す。小数は切り上げて「上位N%」にする
 * （切り捨てると1位が「上位0%」になり、意味が通らない）。
 */
export function topPercentLabel(topPercent: number): string {
  const clamped = Math.min(100, Math.max(0, topPercent))
  return `上位 ${Math.max(1, Math.ceil(clamped))}%`
}

export type RankingRowView = {
  key: string
  rank: number
  /** 「1位」。順位を色ではなく文字で必ず持つ */
  rankLabel: string
  /** 自分の行は「あなた」。それ以外は短縮した匿名名 */
  name: string
  isSelf: boolean
  godName: string
  scoreLabel: string
  outcome: string
  roundLabel: string
  tie: string | null
}

export type SelfView = {
  rankLabel: string
  scoreLabel: string
  topPercent: string
  tie: string | null
  /** 次の順位までの差。最上位・不明なら null */
  gapLabel: string | null
  /** 表示している上位一覧の中に自分が含まれているか */
  listed: boolean
}

export type RankingView =
  /** 取得中 */
  | { kind: 'loading' }
  /** 取れなかった。`message` はそのまま出せる日本語 */
  | { kind: 'unavailable'; reason: LeaderboardFailure; message: string }
  /** 今日はまだ誰も記録していない */
  | { kind: 'empty'; message: string }
  | {
      kind: 'ready'
      totalPlayersLabel: string
      rows: RankingRowView[]
      self: SelfView | null
      /** 自分がまだ記録していない（＝順位が無い）ときの案内 */
      selfMessage: string | null
      /** 上位一覧が全体の一部であるとき（参加者が表示件数より多い） */
      moreLabel: string | null
    }

const FAILURE_MESSAGE: Record<LeaderboardFailure, string> = {
  // 「壊れている」ではなく「まだ始まっていない」と伝える。実際その状態なので
  disabled: '今日のランキングはまだ準備中です。',
  unavailable: 'ランキングを取得できませんでした。時間をおいて開き直してください。',
  offline: 'ランキングに接続できませんでした。通信環境をご確認ください。',
  'bad-request': 'ランキングを取得できませんでした。',
}

function toRowView(row: LeaderboardRowData, selfPlayerId: string | null): RankingRowView {
  const isSelf = selfPlayerId !== null && row.playerId === selfPlayerId
  return {
    key: `${row.rank}-${row.playerId}`,
    rank: row.rank,
    rankLabel: `${row.rank}位`,
    name: isSelf ? 'あなた' : shortPlayerLabel(row.playerId),
    isSelf,
    godName: godNameOf(row.godId),
    scoreLabel: formatScaled(row.score),
    outcome: outcomeLabel(row.win),
    roundLabel: `R${row.round}`,
    tie: tieLabel(row.tiedCount),
  }
}

export type BuildRankingViewInput = {
  /** null＝まだ取得していない（loading） */
  result: { ok: true; board: LeaderboardData } | { ok: false; reason: LeaderboardFailure } | null
  /** 端末の公開ID。null なら「あなた」の判定をしない */
  playerId: string | null
  /** 上位何件まで出すか。既定は `RULES.ranking.leaderboardTopCount` */
  topCount?: number
}

export function buildRankingView({
  result,
  playerId,
  topCount = RULES.ranking.leaderboardTopCount,
}: BuildRankingViewInput): RankingView {
  if (result === null) return { kind: 'loading' }
  if (!result.ok) {
    return { kind: 'unavailable', reason: result.reason, message: FAILURE_MESSAGE[result.reason] }
  }

  const { board } = result
  if (board.totalPlayers <= 0 || board.rows.length === 0) {
    return { kind: 'empty', message: '今日はまだ誰も記録していません。最初の一人になれます。' }
  }

  // ★並べ替えない。サーバーが順位順で返す前提で、表示件数だけ切る
  const shown = board.rows.slice(0, topCount)
  const rows = shown.map((row) => toRowView(row, playerId))
  const listed = rows.some((r) => r.isSelf)

  const self: SelfView | null = board.self
    ? {
        rankLabel: `${board.self.rank}位`,
        scoreLabel: formatScaled(board.self.score),
        topPercent: topPercentLabel(board.self.topPercent),
        tie: tieLabel(board.self.tiedCount),
        gapLabel:
          board.self.pointsToNextRank !== null && board.self.pointsToNextRank > 0
            ? `次の順位まで ${formatScaled(board.self.pointsToNextRank)}点`
            : null,
        listed,
      }
    : null

  return {
    kind: 'ready',
    totalPlayersLabel: `${board.totalPlayers}人`,
    rows,
    self,
    selfMessage: self === null ? '今日はまだ記録がありません。挑戦すると順位が付きます。' : null,
    moreLabel:
      board.totalPlayers > shown.length ? `上位${shown.length}人を表示（全${board.totalPlayers}人）` : null,
  }
}

/**
 * 提出が閉じている間の注意書き。
 *
 * Phase 4.9 時点では `RULES.ranking.submissionEnabled` が false なので、
 * 遊んでも順位は**付かない**。それを言わずにランキングだけ見せると
 * 「自分のスコアも載る」と誤解させる（Phase 4.9 の禁止事項）。
 * 提出が開いたら自動的に消える。
 */
export function submissionNotice(): string | null {
  if (RULES.ranking.submissionEnabled) return null
  return '現在は閲覧のみです。今日の挑戦結果はまだランキングに登録されません。'
}
