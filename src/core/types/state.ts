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
 * スコアの内訳。
 * 計算式（係数）は未決定ですが、「何を記録するか」は今決められます。
 * 項目さえ確保しておけば、係数は後からいくらでも調整できます。
 */
export type ScoreState = {
  /** 与えた総ダメージ */
  damage: number
  /** 1ラウンドに複数枚使ったときの連携ボーナス */
  combo: number
  /** 神力を無駄にしなかったか */
  apEfficiency: number
  /** 早く倒したことによるボーナス */
  roundBonus: number
  /** 神託カード・共鳴発動によるボーナス */
  oracleBonus: number
  total: number
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

  /** コンボ判定用：このラウンドに使ったカード枚数 */
  cardsPlayedThisRound: number
  /** AP効率スコア用の集計 */
  totalApGranted: number
  totalApSpent: number
}
