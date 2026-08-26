import type { GodId } from './ids'
import type { Buff } from './effect'
import type { CardInstance } from './card'
import type { Difficulty } from './difficulty'
import type { GrowthPath } from './otomo'
import type { EnemyState } from './enemy'
import type { OtomoState } from './otomo'

/** 1ラウンドの進行段階 */
export type RoundPhase =
  | 'roundStart' // ラウンド開始（AP補充・バフ更新）
  | 'draw' // カードを引く
  | 'playerTurn' // プレイヤーがカードを使う
  | 'enemyTurn' // 敵が行動する
  | 'roundEnd' // ラウンド終了処理
  | 'gameOver' // 決着

export type GameStatus =
  | 'playing'
  | 'won' // 7ラウンド以内に敵を撃破（決定1）
  | 'lost' // HP0で終了（決定5）
  | 'finished' // 7ラウンド終了・敵を倒せず（決定3。スコアは残る）

export type PlayerState = {
  hp: number
  maxHp: number
  /** このラウンドの被ダメージ軽減量 */
  block: number
  buffs: Buff[]
}

/**
 * スコアの内訳（BASE-D、決定109プロトタイプ）。
 *
 * 全項目「素点」で持ち、表示スコアは`getFinalScore()`（素点合計×finalScale）で算出する。
 * 旧形式（saveVersion 3以前：damage/combo/apEfficiency/roundBonus/oracleBonus）からの
 * 移行では、旧式にしか無い項目の合計を`legacy`へ畳み込んでtotalの連続性を保つ
 * （battleSaveStorage.tsのmigrateを参照）。
 */
export type ScoreState = {
  /** 実効ダメージ分（敵の残りHPを超えた分＝overkillは加点しない）×perDamage */
  damage: number
  /** 連携：1ラウンドに2枚目以降を使ったときの逓減ボーナス */
  combo: number
  /** 勝利時の撃破基礎点（victoryBase） */
  victory: number
  /** 勝利時の早期撃破ボーナス（撃破ラウンドが早いほど大きい） */
  tempo: number
  /** 勝利時の残りHPボーナス（残HP率×survivalMax） */
  survival: number
  /** 勝利時の難易度補正（加算方式。easyは負、hardは正） */
  difficultyBonus: number
  /** 旧セーブ（v3以前）から引き継いだ旧形式スコア分。新規ゲームでは常に0 */
  legacy: number
  /** 素点合計。表示スコアは getFinalScore(score) を使うこと */
  total: number
}

/**
 * Mastery（神技評価）用の試合内集計（決定110プロトタイプ）。
 * Battle Score（ScoreState）とは完全分離で、totalへは一切加算しない。
 * 現段階は大耀「爆発」（1ラウンド最大実効ダメージ）に必要な集計のみを持つ。
 * resume（決定29）を跨いでも失われないよう、イベントログではなくGameStateで持つ。
 */
export type MasteryState = {
  /** 現在のラウンドに敵へ与えた実効ダメージ合計（ラウンド開始でリセット） */
  roundDamage: number
  /** 1ラウンド実効ダメージの試合内最大値 */
  bestRoundDamage: number
}

/**
 * 盤面のすべて。
 *
 * ★重要な約束：この値は直接書き換えません。
 * 「今の盤面 ＋ 操作 → 新しい盤面」という形で毎回作り直します。
 * これによりリプレイ・巻き戻し・自動テスト・将来のサーバー検証が
 * すべて可能になります。
 */
export type GameState = {
  /** セーブデータ互換のためのバージョン */
  version: number
  /** 乱数の種。同じ種＋同じ操作なら必ず同じ結果になる */
  seed: string
  /** 乱数を何回使ったか（リプレイ再現用） */
  rngCursor: number

  /** 1〜7 */
  round: number
  phase: RoundPhase
  status: GameStatus

  /** 神力。決定6：R1=2 → R7=8 の逓増 */
  ap: { current: number; max: number }

  player: PlayerState
  enemy: EnemyState
  /** 選択中の神に専属するOTOMO（決定18：神1柱につき1体） */
  otomo: OtomoState

  /** 選択中の神。MVPは ebisu 固定（決定16・18） */
  godId: GodId
  /** 難易度。敵HP・攻撃力・プレイヤー最大HPの補正に使う（決定39、`RULES.difficulty`参照） */
  difficulty: Difficulty
  /** OTOMOの成長の絆。共鳴発動時にOTOMOへ適用する効果テーブルを選ぶ（決定44） */
  otomoGrowthPath: GrowthPath
  /** 共鳴ゲージ。満タンで神が介入し0に戻る（決定8・10） */
  resonance: { value: number; max: number }
  /**
   * 託宣（決定15で「神託カード」と呼び分け）。
   * 決定21：1ゲームにつき最大`remaining`回、かつ1ラウンド1回まで
   * （`usedThisRound`はラウンド開始のたびリセットされる）。
   */
  divination: { remaining: number; usedThisRound: boolean }

  deck: CardInstance[]
  hand: CardInstance[]
  discard: CardInstance[]
  /** 使い切りカード用（将来） */
  exhausted: CardInstance[]

  score: ScoreState
  /** 神技評価（Mastery）用の試合内集計（決定110プロトタイプ。スコアとは非加算） */
  mastery: MasteryState

  /** コンボ判定用：このラウンドに使ったカード枚数 */
  cardsPlayedThisRound: number
  /** AP効率スコア用の集計 */
  totalApGranted: number
  totalApSpent: number
}
