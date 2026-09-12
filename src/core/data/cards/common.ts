import { cardDefId } from '../../types/ids.js'
import type { CardDef } from '../../types/card.js'

/**
 * 共通カードのID一覧。
 * デッキ構成などから参照するので、名前付きで持っておきます。
 */
export const CARD_IDS = {
  strike: cardDefId('card_common_attack_01'),
  heavyBlow: cardDefId('card_common_attack_02'),
  guard: cardDefId('card_common_guard_01'),
  resonate: cardDefId('card_common_resonance_01'),
  heal: cardDefId('card_common_support_01'),
  curse: cardDefId('card_common_hinder_01'),
  oracle: cardDefId('card_common_oracle_01'),
  quickStrike: cardDefId('card_common_attack_03'),
  allOutStrike: cardDefId('card_common_attack_04'),
  ironStance: cardDefId('card_common_guard_02'),
  breathOfLife: cardDefId('card_common_support_02'),
  wellspring: cardDefId('card_common_support_03'),
  readTheAttack: cardDefId('card_common_hinder_02'),
  kaguraDance: cardDefId('card_common_resonance_02'),
  prophecy: cardDefId('card_common_oracle_02'),
  recklessBlow: cardDefId('card_common_attack_05'),
  windStep: cardDefId('card_common_attack_06'),
  flurry: cardDefId('card_common_attack_07'),
  warCry: cardDefId('card_common_attack_08'),
  parry: cardDefId('card_common_guard_03'),
  bastion: cardDefId('card_common_guard_04'),
  mikoDance: cardDefId('card_common_resonance_03'),
  risingTide: cardDefId('card_common_resonance_04'),
  catchBreath: cardDefId('card_common_support_04'),
  greatHeal: cardDefId('card_common_support_05'),
  intimidate: cardDefId('card_common_hinder_03'),
  bind: cardDefId('card_common_hinder_04'),
  minorOracle: cardDefId('card_common_oracle_03'),
  fightingSpirit: cardDefId('card_common_support_06'),
  renGeki: cardDefId('card_common_attack_09'),
  foresight: cardDefId('card_common_support_07'),
  purifyingLight: cardDefId('card_common_hinder_05'),
} as const

/**
 * MVP Ver 0.1 のカード7種。
 *
 * 企画書5章の6分類すべてに最低1枚を用意し、
 * 攻撃だけコスト違いを2種類にして選択肢を作っています。
 *
 * ⚠️ カード名はすべて仮です。世界観に合う名前が決まったら name / text を変えるだけでOKです。
 * ⚠️ 数値は「1AP = 5ダメージ」を基準に設計しています（RULES.baselineDamagePerAp）。
 */
export const COMMON_CARDS: CardDef[] = [
  {
    id: CARD_IDS.strike,
    name: '一撃',
    text: '敵に50ダメージを与える。',
    type: 'attack',
    cost: 1,
    rarity: 'common',
    // 効率 ×1.0（基準）
    effects: [{ kind: 'damage', target: 'enemy', amount: 5 }],
    // Phase 5-A（決定153）：最も安い攻撃札を「2枚目に置く」動機にする。1枚目に撃つと素の50のまま。
    bonus: {
      when: 'combo',
      effects: [{ kind: 'damage', target: 'enemy', amount: 3 }],
      textJa: 'このラウンド2枚目以降なら、敵に30ダメージ。',
    },
  },
  {
    id: CARD_IDS.heavyBlow,
    name: '剛撃',
    text: '敵に120ダメージを与える。',
    type: 'attack',
    cost: 2,
    rarity: 'common',
    // 効率 ×1.2（高コストほど得にして、1APカード連打を最適解にしない）
    effects: [{ kind: 'damage', target: 'enemy', amount: 12 }],
    // Phase 5-A（決定153）：ゲージを溜めてから撃つ主砲。共振・受け流しで先に4まで運ぶ順番を作る。
    bonus: {
      when: 'charged',
      effects: [{ kind: 'damage', target: 'enemy', amount: 4 }],
      textJa: '共鳴が4以上なら、敵に40ダメージ。',
    },
  },
  {
    id: CARD_IDS.guard,
    name: '守護',
    text: 'ブロックを50得る。このラウンドの被ダメージを軽減する。',
    type: 'guard',
    cost: 1,
    rarity: 'common',
    effects: [{ kind: 'block', amount: 5 }],
    // Phase 5-A（決定153）：「予告ぴったりまで固める」判断そのものを反撃に変える（蒼毘の看板と同型の共通版）。
    bonus: {
      when: 'blocked',
      effects: [{ kind: 'damage', target: 'enemy', amount: 3 }],
      textJa: 'ブロックが敵の予告以上なら、敵に30ダメージ。',
    },
  },
  {
    id: CARD_IDS.resonate,
    name: '共振',
    text: '共鳴ゲージを2上昇させる。',
    type: 'resonance',
    cost: 1,
    rarity: 'common',
    // ゲージ最大7に対し +2 なので、4枚で満タンに届きます
    effects: [{ kind: 'resonance', amount: 2 }],
    // Phase 5-A（決定153）：ゲージ札を「先に置く」のではなく「後に足す」選択肢も作る。charged札への橋渡し。
    bonus: {
      when: 'combo',
      effects: [{ kind: 'resonance', amount: 1 }],
      textJa: 'このラウンド2枚目以降なら、共鳴ゲージ+1。',
    },
  },
  {
    id: CARD_IDS.heal,
    name: '癒し',
    text: 'HPを50回復する。',
    type: 'support',
    cost: 1,
    rarity: 'common',
    effects: [{ kind: 'heal', amount: 5 }],
    // Phase 5-A（決定153）：大技の前に回復すると、そのまま受けの厚みにもなる。
    bonus: {
      when: 'enemyBig',
      effects: [{ kind: 'block', amount: 3 }],
      textJa: '敵の予告が100以上なら、ブロック+30。',
    },
  },
  {
    id: CARD_IDS.curse,
    name: '呪縛',
    text: '敵の攻撃力を3ラウンドのあいだ50下げる。',
    type: 'hinder',
    cost: 2,
    rarity: 'common',
    // 効率 ×1.5。早く使うほど得になる設計
    effects: [
      { kind: 'debuff', target: 'enemy', stat: 'atk', amount: 5, rounds: 3 },
    ],
    // Phase 5-A（決定153）：弱体は早いほど得だが、大技の直前に置けば火力にもなる。
    bonus: {
      when: 'enemyBig',
      effects: [{ kind: 'damage', target: 'enemy', amount: 4 }],
      textJa: '敵の予告が100以上なら、敵に40ダメージ。',
    },
  },
  {
    id: CARD_IDS.oracle,
    name: '神託',
    // STEP-SCORE2-F2：旧score100はBASE-Dで無効化されたため削除（実効果のみ維持）。
    // 素の8.33dmg/APで依然トップ効率のため補償不要（決定109・SCORE2-Eで実証）
    text: '敵に250ダメージを与える。',
    type: 'oracle',
    cost: 3,
    rarity: 'rare',
    // 効率 ×1.67。切り札は明確に得をさせる
    effects: [
      { kind: 'damage', target: 'enemy', amount: 25 },
    ],
  },

  // --- ここから追加カード（カード種数拡張。決定事項の「カード30〜40種」に向けた第一弾） ---

  {
    id: CARD_IDS.quickStrike,
    name: '速攻',
    text: '敵に40ダメージを与え、カードを1枚引く。',
    type: 'attack',
    cost: 1,
    rarity: 'common',
    // 一撃よりダメージはやや低いが、手札を減らさない低リスク択
    effects: [
      { kind: 'damage', target: 'enemy', amount: 4 },
      { kind: 'draw', amount: 1 },
    ],
    // Phase 5-A（決定153）：2枚目以降に撃つと神力が返り、そのラウンドの手数が伸びる。
    bonus: {
      when: 'combo',
      effects: [{ kind: 'gainAp', amount: 1 }],
      textJa: 'このラウンド2枚目以降なら、神力+1。',
    },
  },
  {
    id: CARD_IDS.allOutStrike,
    name: '渾身の一撃',
    text: '敵に200ダメージを与える。',
    type: 'attack',
    cost: 3,
    rarity: 'common',
    // 効率 ×1.33。神託（×1.67）より安く撃てる純粋火力の3AP選択肢
    effects: [{ kind: 'damage', target: 'enemy', amount: 20 }],
    // Phase 5-A（決定153）：3APの大振りを、大技の直前に置く価値へ変える。
    bonus: {
      when: 'enemyBig',
      effects: [{ kind: 'debuff', target: 'enemy', stat: 'atk', amount: 3, rounds: 1 }],
      textJa: '敵の予告が100以上なら、敵の攻撃力を1ラウンドのあいだ30下げる。',
    },
  },
  {
    id: CARD_IDS.ironStance,
    name: '鉄壁の構え',
    text: 'ブロックを120得る。',
    type: 'guard',
    cost: 2,
    rarity: 'common',
    // 効率 ×1.2。守護の上位互換ではなくコスト帯違いの選択肢
    effects: [{ kind: 'block', amount: 12 }],
    // Phase 5-A（決定153）：受け切れたぶんだけ立て直す。
    bonus: {
      when: 'blocked',
      effects: [{ kind: 'heal', amount: 3 }],
      textJa: 'ブロックが敵の予告以上なら、HPを30回復。',
    },
  },
  {
    id: CARD_IDS.breathOfLife,
    name: '息吹',
    text: 'HPを120回復する。',
    type: 'support',
    cost: 2,
    rarity: 'common',
    effects: [{ kind: 'heal', amount: 12 }],
  },
  {
    id: CARD_IDS.wellspring,
    name: '神力の泉',
    text: '神力を2得る（差し引き実質+1）。',
    type: 'support',
    cost: 1,
    rarity: 'common',
    // 初のAP加算カード。使うほど後続カードの選択肢が広がる「伸ばす」択
    effects: [{ kind: 'gainAp', amount: 2 }],
  },
  {
    id: CARD_IDS.readTheAttack,
    name: '見切り',
    text: '敵の攻撃力を1ラウンドのあいだ50下げる。',
    type: 'hinder',
    cost: 1,
    rarity: 'common',
    // 呪縛（2AP・3ラウンド）より軽い単発版。差し込みやすい妨害
    effects: [
      { kind: 'debuff', target: 'enemy', stat: 'atk', amount: 5, rounds: 1 },
    ],
    // Phase 5-A（決定153）：軽い妨害を「先に置く」動機は既にあるので、こちらは後置きに手数を返す。
    bonus: {
      when: 'combo',
      effects: [{ kind: 'draw', amount: 1 }],
      textJa: 'このラウンド2枚目以降なら、カードを1枚引く。',
    },
  },
  {
    id: CARD_IDS.kaguraDance,
    name: '神楽舞',
    text: '共鳴ゲージを3上昇させ、ブロックを30得る。',
    type: 'resonance',
    cost: 2,
    rarity: 'common',
    effects: [
      { kind: 'resonance', amount: 3 },
      { kind: 'block', amount: 3 },
    ],
    // Phase 5-A（決定153）：溜まった状態でもう一段回すと、ゲージが火力に変わる。
    bonus: {
      when: 'charged',
      effects: [{ kind: 'damage', target: 'enemy', amount: 4 }],
      textJa: '共鳴が4以上なら、敵に40ダメージ。',
    },
  },
  {
    id: CARD_IDS.prophecy,
    name: '予言',
    // STEP-SCORE2-F2：旧score20はBASE-Dで無効化されたため削除（draw2は維持）
    text: 'カードを2枚引く。',
    type: 'oracle',
    cost: 2,
    rarity: 'rare',
    // 神託より軽く、ダメージではなく手札で還元する神託の別解
    effects: [
      { kind: 'draw', amount: 2 },
    ],
  },

  // --- 第二弾。決定事項「カード30〜40種」に向けてハイブリッド効果の複合カードを中心に追加 ---

  {
    id: CARD_IDS.recklessBlow,
    name: '捨身の一撃',
    text: '自分に30ダメージを与え、敵に60ダメージを与える。',
    type: 'attack',
    cost: 1,
    rarity: 'common',
    // 効率 ×1.2（剛撃と同格）。自傷3はHP30に対して無視できない実質コストにする
    effects: [
      { kind: 'damage', target: 'self', amount: 3 },
      { kind: 'damage', target: 'enemy', amount: 6 },
    ],
  },
  {
    id: CARD_IDS.windStep,
    name: '神速',
    text: '敵に30ダメージを与え、共鳴ゲージを1上昇させる。',
    type: 'attack',
    cost: 1,
    rarity: 'common',
    // 攻撃と共鳴のハイブリッド。単体効果のカードよりダメージは控えめ
    effects: [
      { kind: 'damage', target: 'enemy', amount: 3 },
      { kind: 'resonance', amount: 1 },
    ],
  },
  {
    id: CARD_IDS.flurry,
    name: '乱舞',
    text: '敵に100ダメージを与え、共鳴ゲージを1上昇させる。',
    type: 'attack',
    cost: 2,
    rarity: 'common',
    effects: [
      { kind: 'damage', target: 'enemy', amount: 10 },
      { kind: 'resonance', amount: 1 },
    ],
    // Phase 5-A（決定153）：溜まっているほど加速する。発動（7）へ1手早く届く。
    bonus: {
      when: 'charged',
      effects: [{ kind: 'resonance', amount: 1 }],
      textJa: '共鳴が4以上なら、共鳴ゲージ+1。',
    },
  },
  {
    id: CARD_IDS.warCry,
    name: '大喝',
    text: '敵に180ダメージを与え、敵の攻撃力を1ラウンドのあいだ30下げる。',
    type: 'attack',
    cost: 3,
    rarity: 'common',
    // 渾身の一撃(20)よりダメージは低いが妨害効果を付与した3AP択
    effects: [
      { kind: 'damage', target: 'enemy', amount: 18 },
      { kind: 'debuff', target: 'enemy', stat: 'atk', amount: 3, rounds: 1 },
    ],
    // Phase 5-A（決定153）：3APの締め。安い札で場を作ってから撃つ。
    bonus: {
      when: 'combo',
      effects: [{ kind: 'damage', target: 'enemy', amount: 6 }],
      textJa: 'このラウンド2枚目以降なら、敵に60ダメージ。',
    },
  },
  {
    id: CARD_IDS.parry,
    name: '受け流し',
    text: 'ブロックを30得て、共鳴ゲージを1上昇させる。',
    type: 'guard',
    cost: 1,
    rarity: 'common',
    effects: [
      { kind: 'block', amount: 3 },
      { kind: 'resonance', amount: 1 },
    ],
    // Phase 5-A（決定153）：軽く受けて流すと、そのまま次の発動が近づく。
    bonus: {
      when: 'blocked',
      effects: [{ kind: 'resonance', amount: 1 }],
      textJa: 'ブロックが敵の予告以上なら、共鳴ゲージ+1。',
    },
  },
  {
    id: CARD_IDS.bastion,
    name: '守りの陣',
    text: 'ブロックを80得て、HPを40回復する。',
    type: 'guard',
    cost: 2,
    rarity: 'common',
    effects: [
      { kind: 'block', amount: 8 },
      { kind: 'heal', amount: 4 },
    ],
    // Phase 5-A（決定153）：大技の前に置けば、そのラウンドを受け切る厚みになる。
    bonus: {
      when: 'enemyBig',
      effects: [{ kind: 'block', amount: 4 }],
      textJa: '敵の予告が100以上なら、ブロック+40。',
    },
  },
  {
    id: CARD_IDS.mikoDance,
    name: '巫女の舞',
    text: '共鳴ゲージを1上昇させ、HPを30回復する。',
    type: 'resonance',
    cost: 1,
    rarity: 'common',
    effects: [
      { kind: 'resonance', amount: 1 },
      { kind: 'heal', amount: 3 },
    ],
  },
  {
    id: CARD_IDS.risingTide,
    name: '秘技・満ちる',
    text: '共鳴ゲージを4上昇させ、ブロックを50得る。',
    type: 'resonance',
    cost: 3,
    rarity: 'rare',
    // 共鳴を一気に押し上げる高コスト択。共鳴発動を狙って撃つ切り札
    effects: [
      { kind: 'resonance', amount: 4 },
      { kind: 'block', amount: 5 },
    ],
  },
  {
    id: CARD_IDS.catchBreath,
    name: '息継ぎ',
    text: 'HPを30回復し、ブロックを30得る。',
    type: 'support',
    cost: 1,
    rarity: 'common',
    effects: [
      { kind: 'heal', amount: 3 },
      { kind: 'block', amount: 3 },
    ],
  },
  {
    id: CARD_IDS.greatHeal,
    name: '大治癒',
    text: 'HPを180回復する。',
    type: 'support',
    cost: 3,
    rarity: 'common',
    // 効率 ×1.2。息吹(2AP)より重いが回復量の伸びは緩やか
    effects: [{ kind: 'heal', amount: 18 }],
  },
  {
    id: CARD_IDS.intimidate,
    name: '威嚇',
    text: '敵の攻撃力を2ラウンドのあいだ30下げる。',
    type: 'hinder',
    cost: 1,
    rarity: 'common',
    // 見切り（1AP・1ラウンド・5）より効果は薄いが持続が長い軽量妨害
    effects: [
      { kind: 'debuff', target: 'enemy', stat: 'atk', amount: 3, rounds: 2 },
    ],
  },
  {
    id: CARD_IDS.bind,
    name: '金縛り',
    text: '敵の攻撃力を4ラウンドのあいだ60下げる。',
    type: 'hinder',
    cost: 3,
    rarity: 'common',
    // 効率 ×1.6。呪縛(2AP・×1.5)より重いぶん妨害効率をさらに伸ばした上位択
    effects: [
      { kind: 'debuff', target: 'enemy', stat: 'atk', amount: 6, rounds: 4 },
    ],
  },
  {
    id: CARD_IDS.minorOracle,
    name: '小さな託宣',
    // STEP-SCORE2-F2：旧score10はBASE-Dで無効化されたため削除（dmg7は維持）
    text: '敵に70ダメージを与える。',
    type: 'oracle',
    cost: 1,
    rarity: 'rare',
    // 神託・予言より軽い、1APで撃てる神託カテゴリの入門札
    effects: [
      { kind: 'damage', target: 'enemy', amount: 7 },
    ],
  },

  // --- 第三弾（決定51）。おすすめデッキ（getRecommendedDeck）は種別ごとの
  // 目標枚数（TARGET_TYPE_COUNT）を既存カードだけで満たしているため、ここに
  // 追加するカードは自動採用されず、デッキ構築画面の+/-ステッパーで手動編成
  // したときにだけ選べるロースター専用カードになる（2026-08-02の「12種を
  // 定義だけ先行させる」運用と同じ）。バランスシミュレーターへの影響ゼロで
  // 安全にカードプールを広げられる。決定51で「自分のatkバフが敵へのダメージ
  // に反映されていなかった」バグ（`effects.ts`）を修正したのに合わせ、
  // その効果を初めて使う共通カードも1枚加えた。

  {
    id: CARD_IDS.fightingSpirit,
    name: '闘志',
    text: '自分の攻撃力を2ラウンドのあいだ20上げる。',
    type: 'support',
    cost: 1,
    rarity: 'common',
    // buff(target:'self')の初の共通カード採用（決定51でバグ修正済み）。
    // 大耀専用「姉御の号令」(1AP・atk+3・2R)より控えめな数値の共通版
    effects: [{ kind: 'buff', target: 'self', stat: 'atk', amount: 2, rounds: 2 }],
  },
  {
    id: CARD_IDS.renGeki,
    name: '連撃',
    text: '敵に70ダメージを与え、神力を1得る。',
    type: 'attack',
    cost: 2,
    rarity: 'common',
    // damage+gainApの初の組み合わせ。単純な火力効率では剛撃に劣るが、
    // 実質1APで撃てるため次のカードに繋げやすい
    effects: [
      { kind: 'damage', target: 'enemy', amount: 7 },
      { kind: 'gainAp', amount: 1 },
    ],
    // Phase 5-A（決定153）：神力が返る札なので、2枚目以降の「繋ぎ」として撃つほど伸びる。
    bonus: {
      when: 'combo',
      effects: [{ kind: 'damage', target: 'enemy', amount: 5 }],
      textJa: 'このラウンド2枚目以降なら、敵に50ダメージ。',
    },
  },
  {
    id: CARD_IDS.foresight,
    name: '見通し',
    text: 'カードを1枚引き、神力を1得る。',
    type: 'support',
    cost: 1,
    rarity: 'common',
    // draw+gainApの初の組み合わせ。神力の泉（gainAp2のみ）より神力還元は
    // 薄いが、手札を減らさないぶん息切れしにくい
    effects: [
      { kind: 'draw', amount: 1 },
      { kind: 'gainAp', amount: 1 },
    ],
  },
  {
    id: CARD_IDS.purifyingLight,
    name: '浄めの光',
    text: 'HPを60回復し、敵の攻撃力を2ラウンドのあいだ30下げる。',
    type: 'hinder',
    cost: 2,
    rarity: 'common',
    // heal+debuffの初の組み合わせ。呪縛（2AP・atk-5・3R）より妨害は弱いが、
    // 回復も兼ねる持久戦向けの択
    effects: [
      { kind: 'heal', amount: 6 },
      { kind: 'debuff', target: 'enemy', stat: 'atk', amount: 3, rounds: 2 },
    ],
  },
]
