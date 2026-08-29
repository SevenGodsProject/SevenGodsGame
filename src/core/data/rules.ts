/**
 * ★★★ 調整値はすべてこのファイルに集約します ★★★
 *
 * バランスを変えたくなったら、まずここを見てください。
 * コードの他の場所に数値を直接書かないことで、調整作業が1ファイルに閉じます。
 *
 * ⚠️ ここの数値はすべて「仮」です。
 *    紙プロトタイプで実際に7ラウンド遊んだあと、自由に変更してください。
 *
 * 決定事項の詳細は docs/DECISIONS.md を参照。
 */

export const RULES = {
  /** 総ラウンド数（企画書で確定） */
  totalRounds: 7,

  /** 神力（AP）。決定6：逓増方式 */
  ap: {
    /**
     * ラウンドごとの供給量。index 0 = ラウンド1。
     * 計算式ではなく表で持つことで、特定ラウンドだけの微調整が容易になります。
     */
    perRound: [2, 3, 4, 5, 6, 7, 8],
    /**
     * 余った神力を次ラウンドへ持ち越すか。
     * 決定7：なし。逓増と持ち越しは同じ効果の二重掛けになり、前半が待ち時間になるため。
     * 紙プロトタイプで窮屈に感じたら true に変えて試せます。
     */
    carryOver: false,
  },

  /** デッキと手札。決定11〜14 */
  deck: {
    size: 20,
    initialHand: 5,
    drawPerRound: 2,
    /** 超過分は捨札へ */
    handLimit: 10,
    /** 山札切れ時：捨札をシャッフルして山札に戻す */
    onEmpty: 'reshuffle' as const,
  },

  /** デッキ構築（決定24、Phase 5） */
  deckBuilding: {
    /** 同じカードを何枚まで編成に入れられるか */
    maxCopiesPerCard: 2,
  },

  /** プレイヤー。決定2 */
  player: {
    maxHp: 30,
  },

  /** 共鳴。決定8・10 */
  resonance: {
    /** ゲージ最大値。「7」のモチーフに統一 */
    max: 7,
    /** 満タンで自動発動しリセット */
    autoTrigger: true,
  },

  /** 託宣（決定15で神託カードと呼び分け、決定21で中身を確定） */
  divination: {
    /**
     * 回数。
     * MVPでは「1ゲームにつき7回」（GameStateの一部としてリセットされる）。
     * 「1日7回」への変更は、アカウント基盤ができてから
     * QuotaProviderで抽象化する（決定21・§3-1）。
     */
    count: 7,
  },

  /**
   * カードの強さを決める物差し。
   * 1AP = 5ダメージを基準として、高コストカードほど効率を良くします
   * （そうしないと「1APカード連打が最強」になり単調になるため）。
   */
  baselineDamagePerAp: 5,

  /**
   * スコア（BASE-D、決定109のsimulation検証済み候補値。正式採用値ではなくprototype）。
   *
   * 旧式（〜決定98）からの主な変更：
   * - overkill（敵の残りHPを超えた分）は無得点
   * - oracle/BURSTの`score`直接効果はBattle Scoreへ加算しない
   * - 未使用APペナルティは廃止
   * - 撃破ボーナスは「基礎300＋逓減テンポ表」（線形の残ラウンド係数は
   *   「遅く倒すほど高得点」への反転や早期撃破神のテール暴走を招くため）
   * - 難易度は倍率でなく加算（倍率は神ごとのhard適性差を増幅するため）
   */
  score: {
    /** 実効ダメージ（overkill除外後）1あたり */
    perDamage: 1.2,
    /**
     * 連携：各ラウンドの2枚目/3枚目/4枚目の加点。5枚目以降は`comboOverflow`。
     * 線形加点は「枚数を出すほど青天井」になり枚数バイアスの主因だったため逓減にする。
     */
    comboSteps: [12, 8, 4],
    comboOverflow: 3,
    /** 勝利時の基礎点 */
    victoryBase: 300,
    /**
     * 勝利時の早期撃破ボーナス。index = 撃破ラウンド-1（R1〜R7）。
     * R3以前は理論上ほぼ到達不能のため290で頭打ちにする（安全側の外挿）。
     */
    tempoByRound: [290, 290, 290, 240, 170, 90, 0],
    /** 勝利時、残りHP率（0〜1）に掛けるボーナス上限 */
    survivalMax: 30,
    /** 勝利時の難易度補正（加算） */
    difficultyBonus: { easy: -20, normal: 0, hard: 30 },
    /** 表示スコア＝素点合計×この倍率を四捨五入（getFinalScore） */
    finalScale: 1.3,
  },

  /**
   * Mastery（神技評価）のグレード閾値（決定110プロトタイプ。正式採用値ではない）。
   * Battle Scoreとは完全分離で、totalへは加算しない。
   */
  mastery: {
    /** 大耀「爆発」：1ラウンド最大実効ダメージ ÷ 敵最大HP のグレード下限 */
    taiyo: { s: 0.58, a: 0.45, b: 0.37 },
    /**
     * 寿楽「無力化」（決定113 J-G）：敵攻撃1回ごとの軽減率の等重み平均のグレード下限。
     * B=0.50はSTEP-SCORE2-G1dで0.55から緩和した（CEO初見51%のみを根拠とせず、
     * G1c再解析＝0.50〜0.55帯はstall/spam層でないこと・魔獣C率54.4%→46.7%改善・
     * 「攻撃を半分以上削げたらB（堂々）」という説明可能性を根拠とする）。
     * Sはさらに「raw>=strongHitRawの強攻撃を半分以下へ抑えた実績1回以上」かつ
     * easy以外、という行動・難易度ゲートを併用する。
     */
    juraku: { s: 0.9, a: 0.8, b: 0.5, strongHitRaw: 10 },
    /**
     * 蒼毘「鉄壁」（STEP-SCORE2-G3、G2のS4）：無傷受け率＝
     * fullyBlockedCount ÷ guardAttackCount のグレード下限。
     * G2校正（勝利時 B 55.3%／A 20.2%／S 4.2%）に基づくprototype検証用初期値であり
     * 正式最終閾値ではない。easy capはG2で難易度farmingがほぼフラット
     * （e/n/h=0.481/0.496/0.474）だったため現時点では設けない。
     */
    sobi: { s: 0.85, a: 0.65, b: 0.4 },
    /**
     * 福永「大勝負」（G4 prototype）：raw＝(最終HP − 試合中最低HP) ÷ maxHp
     * （どん底からの立て直し幅）のグレード下限。ただしrisk gate＝
     * 「自傷カード由来の敵への実効与ダメージ ≥ 敵maxHp×riskGateRatio」を
     * 満たさない試合はraw=0（C）。敵に殴られること自体は評価せず、
     * 「自らリスクを取り、そこから立て直した」ことだけを評価する
     * （意図的被弾farmingの遮断。LANE C research 50,400試合で検証済みのF17案）。
     * 閾値はresearch閾値案をworktree simulation（本番engine実測）で確認した
     * prototype検証用初期値であり正式最終値ではない。
     */
    fukuei: { s: 0.6, a: 0.4, b: 0.1, riskGateRatio: 0.1 },
  },

  /**
   * 難易度プリセット（決定39）。'normal' は決定21・26・36で検証済みの数値そのもの
   * （倍率1・補正0）で、既存のバランス調整を一切変えない基準として固定する。
   * 敵HP・敵攻撃力・プレイヤー最大HPだけを動かし、カード効果や共鳴・託宣の
   * 数値には触れない（調整範囲を狭く保ち、既存の検証を無効化しないため）。
   *
   * 決定57で「hardのdefensive戦略（防御一辺倒）が未撃破100%の完全な膠着になる」
   * 問題への対策として、貫通ダメージ・回復量減衰の2案を試作・検証したが、
   * どちらも「防御に全AP を割ける戦略は、その割いた分だけ被害を相殺できてしまう」
   * という構造（APは毎ラウンド増え、被ダメージも回復力も同じAPで賄えるため、
   * 比率で減らしても釣り合いは崩れない）の前で効果が出ず、むしろ他の戦略を
   * 悪化させるだけだったため撤回した（詳細はdocs/DECISIONS.md決定57参照）。
   */
  difficulty: {
    easy: { enemyHpMultiplier: 0.85, enemyAtkMultiplier: 0.85, playerMaxHpBonus: 5 },
    normal: { enemyHpMultiplier: 1, enemyAtkMultiplier: 1, playerMaxHpBonus: 0 },
    hard: { enemyHpMultiplier: 1.15, enemyAtkMultiplier: 1.15, playerMaxHpBonus: -3 },
  },

  /**
   * DAILY-01：神域挑戦（Daily Challenge）。
   * 「毎日、全員が同じ敵・同じseedに3回だけ挑戦し、神・OTOMO・デッキ・プレイングを
   * 工夫してその日の最高スコアを狙う」モード（CEO決定 2026-08-29）。
   * - 日付はJST 00:00固定（`timezoneOffsetMinutes`＝+9h）。端末タイムゾーンに依存しない
   * - 敵は週次シャッフル巡回：JSTの週キー（月曜）からshuffleし、1週間で7体が必ず1回ずつ登場
   * - 補正は`modifier`（難易度倍率に乗算）。難易度は'normal'基準・スコア倍率は付けない
   *   （前回Daily監査：★スコア倍率は自然差2.6〜3.3%に対し過剰でfarm化するためDROP）。
   *   数値は仮値で、balanceSim（全神で最良戦略勝率50%以上）を通してから確定する
   * - `EnemyDef.rank`は変更しない。★★★★★「神域強化」はDailyモードの表示専用状態
   */
  daily: {
    timezoneOffsetMinutes: 540,
    attemptsPerDay: 3,
    modifier: { enemyHpMul: 1.25, enemyAtkMul: 1.15 },
    /** dailyStorageに保持する日数（古い日は自動剪定） */
    retentionDays: 30,
  },

  /**
   * セーブデータのバージョン。互換性維持のため必ず持たせる。
   * v4（STEP-SCORE2-D-PROTO）：ScoreStateをBASE-D構造へ変更し、MasteryStateを追加。
   * v5（STEP-SCORE2-G1b）：MasteryStateへ寿楽「無力化」用3フィールドを追加。
   * v6（STEP-SCORE2-G3）：MasteryStateへ蒼毘「鉄壁」用2フィールドを追加。
   * v7（ENEMY-IDENTITY-PROTOTYPE-02）：EnemyActionDefへmultiAttack/specialを追加。
   *   state構造は不変（intentの取りうる形が増えただけ）。旧版アプリはv7セーブの
   *   新intentを読めないため番号を上げる。
   * v3〜v6セーブはbattleSaveStorage.tsのmigrateで読み込み継続できる（破棄しない）。
   * G4 prototype：MasteryStateへ福永「大勝負」用2フィールド（minHp/
   * riskCardEffDamage）を追加したが、番号は7のまま据え置き＋default-fill
   * （battleSaveStorage.tsのfillFukueiMasteryFields）で補完する暫定運用。
   * 正式採用時に8へbumpするかはレビューで判断（フィールド欠落セーブでも
   * fillが吸収するため進行不能・NaNにはならない）。
   * v8（DAILY-01）：GameStateへ`mode`/`dailyKey`/`modifier`を追加。v7セーブは
   *   `migrateBattleSaveV7`が`mode:'normal'`を補完して読み込み継続（福永fillも同経路）。
   */
  saveVersion: 8,
} as const
