import { describe, expect, it } from 'vitest'
import { computeSnapshot, describeSnapshot, formatFeedbackText } from './feedbackSnapshot'
import { applyAction } from '../../core/engine'
import { STARTER_DECK } from '../../core/data/decks'
import { ENEMY_IDS } from '../../core/data/enemies'
import { GOD_IDS } from '../../core/data/gods'

function startGame(seed: string, difficulty: 'easy' | 'normal' | 'hard') {
  const result = applyAction(null, {
    type: 'START_GAME',
    seed,
    godId: GOD_IDS.ebisu,
    enemyId: ENEMY_IDS.trial,
    deck: STARTER_DECK,
    difficulty,
  })
  return result.state
}

describe('computeSnapshot', () => {
  it('セットアップ中（バトル開始前）は画面名・神・難易度だけを返す', () => {
    const snapshot = computeSnapshot({
      setupScreen: 'deckBuild',
      godId: GOD_IDS.sobi,
      difficulty: 'hard',
      state: null,
    })
    expect(snapshot.screen).toBe('デッキ構築')
    expect(snapshot.godName).toBe('蒼毘')
    expect(snapshot.difficultyLabel).toBe('むずかしい')
    expect(snapshot.round).toBeUndefined()
    expect(snapshot.score).toBeUndefined()
  })

  it('神未選択のホーム画面では神名を含めない', () => {
    const snapshot = computeSnapshot({ setupScreen: 'home', godId: null, difficulty: 'normal', state: null })
    expect(snapshot.screen).toBe('ホーム')
    expect(snapshot.godName).toBeUndefined()
  })

  it('バトル中はGameStateからラウンド・スコア・OTOMO形態を拾う', () => {
    const state = startGame('feedback-test', 'easy')
    const snapshot = computeSnapshot({ setupScreen: 'home', godId: null, difficulty: 'normal', state })
    expect(snapshot.screen).toBe('バトル中')
    expect(snapshot.godName).toBe('恵比寿')
    expect(snapshot.difficultyLabel).toBe('かんたん')
    expect(snapshot.round).toBe(1)
    expect(snapshot.score).toBe(0)
    expect(snapshot.otomoFormLabel).toBe('精霊態')
  })

  it('決着後（won/lost/finished）は画面名が「決着」になる', () => {
    const state = startGame('feedback-test-2', 'normal')
    const snapshot = computeSnapshot({
      setupScreen: 'home',
      godId: null,
      difficulty: 'normal',
      state: { ...state, status: 'lost' },
    })
    expect(snapshot.screen).toBe('決着')
  })
})

describe('describeSnapshot / formatFeedbackText', () => {
  it('1行サマリに主要な項目を「・」区切りで並べる', () => {
    const text = describeSnapshot({
      screen: 'バトル中',
      godName: '蒼毘',
      difficultyLabel: 'ふつう',
      round: 5,
      score: 320,
      otomoFormLabel: '受肉態',
    })
    expect(text).toBe('バトル中・蒼毘・ふつう・R5・スコア320・OTOMO受肉態')
  })

  it('コメント未入力でも「（未入力）」で本文が成立する', () => {
    const text = formatFeedbackText({ screen: 'ホーム', difficultyLabel: 'ふつう' }, '   ')
    expect(text).toContain('（未入力）')
    expect(text).toContain('状況: ホーム・ふつう')
  })

  it('コメントはトリムして本文に含める', () => {
    const text = formatFeedbackText({ screen: 'ホーム', difficultyLabel: 'ふつう' }, '  敵の予告が読みづらい  ')
    expect(text).toContain('敵の予告が読みづらい')
    expect(text.endsWith('敵の予告が読みづらい')).toBe(true)
  })
})
