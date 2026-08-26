import type { Difficulty, GameState, GodId } from '../../core/types'
import { GODS } from '../../core/data/gods'
import { getFinalScore } from '../../core/engine'
import { scaleDisplay } from '../displayScale'

/**
 * フィードバック機能（実プレイ・フィードバック基盤）が自動添付する
 * 「今どんな状況でプレイ中か」の要約。CEOやプレイテスターが「感想を書いて
 * 送るだけで、こちらが状況を推測する手間なく再現できる」ことを狙う。
 *
 * ロジック層（core/）ではなくUI層のプレゼンテーション用の型だが、
 * 純粋関数として組み立て・整形するため、React本体（FeedbackOverlay.tsx）とは
 * 分離してテスト可能にしている。
 */
export type FeedbackSnapshot = {
  screen: 'ホーム' | '神選択' | 'デッキ構築' | 'OTOMO育成' | '戦績' | 'バトル中' | '決着'
  godName?: string
  difficultyLabel: string
  round?: number
  score?: number
  otomoFormLabel?: string
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'かんたん',
  normal: 'ふつう',
  hard: 'むずかしい',
}

const OTOMO_FORM_LABEL: Record<GameState['otomo']['form'], string> = {
  spirit: '精霊態',
  incarnate: '受肉態',
  doji: '童子',
}

function godNameJa(godId: GodId): string {
  return GODS.find((g) => g.id === godId)?.nameJa ?? godId
}

export type SnapshotInput = {
  /** GameFlowのセットアップ画面。バトル中（stateがある）はここを見ない */
  setupScreen: 'home' | 'godSelect' | 'deckBuild' | 'otomoGrowth' | 'record'
  godId: GodId | null
  difficulty: Difficulty
  state: GameState | null
}

/** GameFlowの現在の画面遷移状態＋GameStateから、フィードバックに添える要約を組み立てる */
export function computeSnapshot({ setupScreen, godId, difficulty, state }: SnapshotInput): FeedbackSnapshot {
  if (state) {
    return {
      screen: state.status === 'playing' ? 'バトル中' : '決着',
      godName: godNameJa(state.godId),
      difficultyLabel: DIFFICULTY_LABEL[state.difficulty],
      round: state.round,
      // D2b：フィードバックにはユーザーが見ているのと同じ表示値（×10）を載せる
      score: scaleDisplay(getFinalScore(state.score)),
      otomoFormLabel: OTOMO_FORM_LABEL[state.otomo.form],
    }
  }
  const screen =
    setupScreen === 'home'
      ? 'ホーム'
      : setupScreen === 'godSelect'
        ? '神選択'
        : setupScreen === 'deckBuild'
          ? 'デッキ構築'
          : setupScreen === 'otomoGrowth'
            ? 'OTOMO育成'
            : '戦績'
  return {
    screen,
    godName: godId ? godNameJa(godId) : undefined,
    difficultyLabel: DIFFICULTY_LABEL[difficulty],
  }
}

/** overlay内に表示する1行サマリ（例：「蒼毘・ふつう・R5・スコア320・OTOMO受肉態」） */
export function describeSnapshot(snapshot: FeedbackSnapshot): string {
  const parts: string[] = [snapshot.screen]
  if (snapshot.godName) parts.push(snapshot.godName)
  parts.push(snapshot.difficultyLabel)
  if (snapshot.round !== undefined) parts.push(`R${snapshot.round}`)
  if (snapshot.score !== undefined) parts.push(`スコア${snapshot.score}`)
  if (snapshot.otomoFormLabel) parts.push(`OTOMO${snapshot.otomoFormLabel}`)
  return parts.join('・')
}

/** クリップボードにコピーする最終的なテキスト本文 */
export function formatFeedbackText(snapshot: FeedbackSnapshot, comment: string): string {
  const trimmed = comment.trim()
  return [
    '■ SEVEN GODS フィードバック',
    `状況: ${describeSnapshot(snapshot)}`,
    '',
    'ご感想・不具合:',
    trimmed || '（未入力）',
  ].join('\n')
}
