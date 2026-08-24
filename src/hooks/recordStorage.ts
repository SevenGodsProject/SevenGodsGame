import type { Difficulty, GameState, GodId } from '../core/types'

/**
 * 決定48のフォローアップ：ハイスコア・自己ベストの記録機能。
 *
 * 「実プレイ・フィードバック基盤」の評価で見つけた改善提案①（CEOが優先度に
 * 選択）への対応。神ごとに自己ベストスコア・勝敗数・最速撃破ラウンドを
 * `localStorage`に永続化する。決定43の`rewardStorage.ts`と同じ方針
 * （Phaser/Reactに依存しないcore層ではなくhooksに置く＝不変ルール1、
 * `RULES.saveVersion`とは独立した専用バージョン＝決定不変ルール5）を踏襲。
 */

const STORAGE_KEY = 'sevengods.records'
const RECORD_VERSION = 1

export type GodRecord = {
  /** 過去最高スコア（0＝まだ記録なし） */
  bestScore: number
  /** そのベストスコアを出したときの難易度（未記録時はnull） */
  bestScoreDifficulty: Difficulty | null
  wins: number
  losses: number
  /** 7ラウンド終了・未撃破の回数 */
  finished: number
  /** 勝利した中で最も早かったラウンド（未勝利ならnull） */
  fastestWinRound: number | null
}

const EMPTY_RECORD: GodRecord = {
  bestScore: 0,
  bestScoreDifficulty: null,
  wins: 0,
  losses: 0,
  finished: 0,
  fastestWinRound: null,
}

type RecordData = {
  version: number
  /** godId -> 戦績 */
  records: Record<string, GodRecord>
}

function isGodRecord(value: unknown): value is GodRecord {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.bestScore === 'number' &&
    typeof v.wins === 'number' &&
    typeof v.losses === 'number' &&
    typeof v.finished === 'number'
  )
}

function isRecordData(value: unknown): value is RecordData {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.version !== 'number' || !v.records || typeof v.records !== 'object') return false
  return Object.values(v.records as Record<string, unknown>).every(isGodRecord)
}

function load(): RecordData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: RECORD_VERSION, records: {} }
    const parsed: unknown = JSON.parse(raw)
    if (!isRecordData(parsed) || parsed.version !== RECORD_VERSION) {
      return { version: RECORD_VERSION, records: {} }
    }
    return parsed
  } catch {
    return { version: RECORD_VERSION, records: {} }
  }
}

function save(data: RecordData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // 保存できなくてもゲーム自体には影響しないため無視する
  }
}

/** その神の戦績を読み込む（未記録なら全項目0/nullの空レコード） */
export function loadGodRecord(godId: GodId): GodRecord {
  return load().records[godId] ?? EMPTY_RECORD
}

/**
 * 決着（won/lost/finished）したGameStateを戦績に反映する。
 * `isNewBest`はこの1戦でスコアの自己ベストを更新したかどうか
 * （GameOverOverlayの「自己ベスト更新！」表示に使う）。
 * `prevBest`はこの1戦で上書きされる前の自己ベスト（STEP-UX6-B、
 * GameOverOverlayの「自己ベストまであとN点」表示に使う。未記録なら0）。
 * `GodRecord`の保存構造・`bestScore`の計算方法自体は無変更で、関数内で
 * 既に算出済みだった`prev.bestScore`を戻り値に追加しただけ
 * （`recordOtomoBond`が既に`{prevRecord, nextRecord}`を両方返す設計と同型）。
 */
export function recordGameResult(state: GameState): { isNewBest: boolean; prevBest: number } {
  if (state.status === 'playing') return { isNewBest: false, prevBest: 0 }

  const data = load()
  const prev = data.records[state.godId] ?? EMPTY_RECORD
  const isNewBest = state.score.total > prev.bestScore

  const next: GodRecord = {
    bestScore: Math.max(prev.bestScore, state.score.total),
    bestScoreDifficulty: isNewBest ? state.difficulty : prev.bestScoreDifficulty,
    wins: prev.wins + (state.status === 'won' ? 1 : 0),
    losses: prev.losses + (state.status === 'lost' ? 1 : 0),
    finished: prev.finished + (state.status === 'finished' ? 1 : 0),
    fastestWinRound:
      state.status === 'won'
        ? prev.fastestWinRound === null
          ? state.round
          : Math.min(prev.fastestWinRound, state.round)
        : prev.fastestWinRound,
  }

  save({ ...data, records: { ...data.records, [state.godId]: next } })
  return { isNewBest, prevBest: prev.bestScore }
}
