import type {
  CardDefId,
  EnemyId,
  GameAction,
  GameState,
  GameStatus,
  GodId,
  GrowthPath,
  ScoreState,
} from '../types/index.js'

/**
 * リプレイで再生できる操作。
 *
 * `GameAction`から`START_GAME`だけを除いた形で定義する。**新しいAction型は作らない**：
 * 二重定義にすると「UIが発行するAction」と「リプレイが再生するAction」がいつか
 * ずれ、その瞬間にリプレイ結果とライブ結果の一致が壊れるため。開始条件は
 * `ReplayInput`（dailyKey・神・デッキ）から**サーバー側で再導出**するので、
 * `START_GAME`をログに含める必要はなく、含めさせてもいけない
 * （seed・敵・補正をクライアントに宣言させる経路になってしまう）。
 */
export type ReplayAction = Exclude<GameAction, { type: 'START_GAME' }>

/** 再生を許可する操作の種類。実行時（JSON入力）の検査に使う */
export const REPLAY_ACTION_TYPES = ['PLAY_CARD', 'END_ROUND', 'USE_DIVINATION'] as const

/**
 * リプレイの入力。**サーバーが受け取る唯一のデータ形**。
 *
 * ★設計上の中心的な約束：
 * 「クライアントが申告した結果（score・HP・勝敗・rngCursor）は一切受け取らない」。
 * 型にそのフィールドが存在しないこと自体が実装になっている
 * （`startDailyGame`が`bonusCopies`を受け取らないのと同じ考え方）。
 * 結果は必ず`runReplay`が本番エンジンで計算する。
 *
 * seed・敵・難易度・Daily補正も受け取らない。`dailyKey`から
 * `resolveDailyStart`（＝本番UIが呼ぶのと同じ関数）で再導出する。
 * `claimedSeed`/`claimedEnemyId`は**照合専用**で、再導出値と食い違えば拒否する。
 * 一致しても再導出値のほうを使う（申告値をゲームへ流し込む経路は存在しない）。
 */
export type ReplayInput = {
  /** `RULES.replay.formatVersion`と一致する必要がある */
  version: number
  /** Phase 4.1では神域挑戦のみ。通常モードのリプレイは対象外 */
  mode: 'daily'
  /** JSTの日付キー `YYYY-MM-DD`。ここから敵・seed・補正がすべて決まる */
  dailyKey: string
  godId: GodId
  /** 20枚。報酬ボーナス無しの編成ルール（1種`maxCopiesPerCard`枚）で検証する */
  deck: CardDefId[]
  otomoGrowthPath?: GrowthPath
  actions: ReplayAction[]
  /** 照合専用。省略可。再導出値と違えば`SEED_MISMATCH`で拒否する */
  claimedSeed?: string
  /** 照合専用。省略可。再導出値と違えば`ENEMY_MISMATCH`で拒否する */
  claimedEnemyId?: EnemyId
}

/** 拒否理由。ランキングAPIがそのままログ・メトリクスに使える粒度で分ける */
export type ReplayRejectionCode =
  /** 入力の形が壊れている（配列でない・必須項目が無い等） */
  | 'MALFORMED'
  /** `version`が`RULES.replay.formatVersion`と違う */
  | 'FORMAT_VERSION'
  /** `mode`が'daily'でない */
  | 'MODE'
  /** `dailyKey`が実在する`YYYY-MM-DD`でない */
  | 'DAILY_KEY'
  /** 申告seedが再導出値と違う */
  | 'SEED_MISMATCH'
  /** 申告敵が再導出値と違う */
  | 'ENEMY_MISMATCH'
  /** action数が`RULES.replay.maxActions`を超えた */
  | 'ACTION_LIMIT'
  /** 再生できない種類のaction（`START_GAME`混入・未知のtype） */
  | 'ACTION_TYPE'
  /** デッキが編成ルールに違反（枚数・他神のカード・3枚積み等） */
  | 'DECK'
  /** エンジンが操作を拒否した（手札に無い・AP不足・順序違反・決着後の操作 等） */
  | 'ENGINE_REJECTED'
  /** ログを再生し切っても決着していない（ランキング提出としては不受理） */
  | 'NOT_FINISHED'

/**
 * リプレイが**計算した**結果。クライアントの申告ではない。
 * ランキングはこの値だけを保存・比較の対象にする。
 */
export type VerifiedOutcome = {
  dailyKey: string
  /** 再導出した敵。申告値ではない */
  enemyId: EnemyId
  /** 再導出したseed。申告値ではない */
  seed: string
  /** 表示用の短いSeed ID */
  seedId: string
  godId: GodId
  status: GameStatus
  /** 7ラウンド以内に撃破したか */
  win: boolean
  /** 決着したラウンド */
  round: number
  /** 表示スコア（`getFinalScore`）。ランキングのキーはこれ */
  score: number
  /** 素点の内訳 */
  scoreBreakdown: ScoreState
  playerHp: number
  enemyHp: number
  /** 乱数の消費位置。決定論の同一性チェックに使う */
  rngCursor: number
  actionCount: number
}

export type ReplayResult =
  | { ok: true; outcome: VerifiedOutcome; state: GameState }
  | {
      ok: false
      code: ReplayRejectionCode
      message: string
      /** `ENGINE_REJECTED`等、特定の操作で落ちた場合の`actions`内の位置（0始まり） */
      actionIndex?: number
    }

export type ReplayOptions = {
  /**
   * 決着（won/lost/finished）まで到達していることを必須にするか。
   * 既定はtrue（ランキング提出の検証が主用途のため）。
   * 途中までのログを解析する道具用途でのみfalseにする。
   */
  requireFinished?: boolean
}
