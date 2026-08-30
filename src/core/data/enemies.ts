import { enemyId } from '../types/ids'
import type { EnemyDef, EnemyId } from '../types'

export const ENEMY_IDS = {
  trial: enemyId('enemy_01'),
  oni: enemyId('enemy_02'),
  onryo: enemyId('enemy_03'),
  karakuri: enemyId('enemy_04'),
  juuma: enemyId('enemy_05'),
  ryujin: enemyId('enemy_06'),
  doukeshi: enemyId('enemy_07'),
} as const

const art = (slug: string) => `/assets/enemies/${slug}/art.png`

/**
 * 決定32：敵のバリエーション化。CEOがChatGPT/Geminiで生成した7体分のイラストを
 * 元に、それぞれ異なるHP・攻撃パターンを持つ敵として定義した。
 *
 * `trial`（試練の影）は決定17・21で調整済みの検証済みバランス（HP103、
 * 攻撃5→15の逓増）を一切変更せず、立ち絵だけを追加している
 * （`balanceSim.test.ts`は引き続きこの敵で検証しているため、数値を変えると
 * 決定21・26で積み上げたバランス調整が無効になる）。
 *
 * 他6体は新規デザインで、`balanceSim.test.ts`はまだこの6体をカバーして
 * いない（自動シミュレーター未検証。決定25と同じ「今後の課題」扱い）。
 * `charge`（溜め。次のラウンドに大技）を使うのは`karakuri`と`doukeshi`の
 * 2体が初採用（決定4の「行動予告を読む」を最も色濃く体験できるタイプ）。
 */
export const ENEMIES: EnemyDef[] = [
  {
    id: ENEMY_IDS.trial,
    name: '試練の影',
    maxHp: 103,
    // STEP-A5：敵アセット刷新の第一弾としてdatenshiのみ本番でWebPへ切り替えた
    // （破片混入のあった旧art.pngから、単体・透過済みの新規絵へ差し替え。
    // 数値・AIには一切触れていない）。他6体はまだPNGのため、共通の`art()`
    // ヘルパーは変更せず、この1体だけ直接パスを指定する最小変更にしている。
    art: '/assets/enemies/datenshi/art.webp',
    typeLabel: '標準・入門型',
    typeDescription: '基本を守れば戦える。終盤にやや攻撃が強まる。',
    visualType: 'lateSurgeMild',
    // LANE-D：脅威度★・舞台（表示専用、CEO GO済み仕様の叩き台）。数値・AI無変更
    rank: 1,
    stage: { nameJa: '褪色の神殿', accent: '#6b5b95', bg: '/assets/backgrounds/stages/01-trial-shadow.webp' },
    battleCries: [
      'その力、まことのものか見極めよう',
      'まだ終わらぬ…続けるがいい',
      '影は、揺らがぬ',
      '力は、示してこそ意味がある',
      'その一撃、受け止めよう',
      '迷いは、隙となる',
      '揺るがぬ意志のみが、道を拓く',
    ],
    actions: [
      { kind: 'attack', amount: 5 }, // R1
      { kind: 'attack', amount: 6 }, // R2
      { kind: 'attack', amount: 8 }, // R3
      { kind: 'attack', amount: 9 }, // R4
      { kind: 'attack', amount: 11 }, // R5
      { kind: 'attack', amount: 13 }, // R6
      { kind: 'attack', amount: 15 }, // R7
    ],
  },
  {
    id: ENEMY_IDS.oni,
    name: '業斧の鬼将',
    maxHp: 100,
    // STEP-L2：敵アセット最終調整の第一弾としてoniもPNGからWebPへ本番切り替え
    // （STEP-L1で軽加工候補を検証・A判定。新規生成は行わず、512×512化・余白調整
    // のみ。datenshi/karakuri/doukeshiと同じ最小変更方式。数値・AIには一切触れていない）。
    art: '/assets/enemies/oni/art.webp',
    typeLabel: '重撃型',
    typeDescription: '攻撃が重い。防御を切らさない。',
    visualType: 'standard',
    rank: 2,
    stage: { nameJa: '戦火の陣', accent: '#e5484d', bg: '/assets/backgrounds/stages/02-oni-castle.webp' },
    battleCries: [
      '吠えろ、我が斧よ！',
      '一撃で仕留めてくれる！',
      'これしきの傷、何ほどのことか！',
      '力こそ全てよ！',
      '退くことなど知らぬ！',
      'その盾、叩き割ってくれる！',
      '我が斧の前に、膝をつけ！',
    ],
    // 標準型。攻撃はtrialよりわずかに重いが、HPはtrial以下（決定36でバランス
    // シミュレーターが蒼毘・寿楽・笑蓮のdefensive戦略で7ラウンド以内に倒し切れない
    // ケースを検出したため108→100に調整）
    actions: [
      { kind: 'attack', amount: 5 },
      { kind: 'attack', amount: 7 },
      { kind: 'attack', amount: 9 },
      { kind: 'attack', amount: 11 },
      { kind: 'attack', amount: 13 },
      { kind: 'attack', amount: 15 },
      { kind: 'attack', amount: 17 },
    ],
  },
  {
    id: ENEMY_IDS.onryo,
    name: '藍花の怨霊',
    maxHp: 95,
    art: art('onryo'),
    typeLabel: '遅咲き型',
    typeDescription: '終盤に攻撃が急激に強くなる。',
    visualType: 'lateSurgeStrong',
    rank: 3,
    stage: { nameJa: '藍花の廃社', accent: '#7a4fc4', bg: '/assets/backgrounds/stages/03-ghost-hydrangea.webp' },
    battleCries: [
      'まだ…まだ足りぬ…',
      '恨みは深く、蒼く燃える…',
      'そなたも、いずれこちら側へ…',
      '何度でも…蘇るがいい…',
      'その温もり、羨ましい…',
      '闇は、少しずつ濃くなる…',
      '逃げられぬ…もう、遅い…',
    ],
    // 遅咲き型。序盤は弱いが後半に祟りが強まる
    actions: [
      { kind: 'attack', amount: 3 },
      { kind: 'attack', amount: 4 },
      { kind: 'attack', amount: 6 },
      { kind: 'attack', amount: 9 },
      { kind: 'attack', amount: 13 },
      { kind: 'attack', amount: 18 },
      { kind: 'attack', amount: 23 },
    ],
  },
  {
    id: ENEMY_IDS.karakuri,
    name: '銀甲の機工師',
    maxHp: 100,
    // STEP-K5：敵アセット刷新の第二弾としてkarakuriもPNGからWebPへ本番切り替え
    // （STEP-K1〜K4Bで発光修正版を検証・A判定。datenshi＝STEP-A5と同じ最小変更
    // 方式で、この1体だけ直接パスを指定する。数値・AIには一切触れていない）。
    art: '/assets/enemies/karakuri/art.webp',
    typeLabel: '溜め型',
    typeDescription: '溜めの次に大技。R5の主砲に備えよ。',
    visualType: 'standard',
    rank: 4,
    stage: { nameJa: '機巧工房', accent: '#9b59b6', bg: '/assets/backgrounds/stages/04-mecha-workshop.webp' },
    battleCries: [
      '照準、完了',
      '無駄のない一撃を',
      '歯車は、止まらない',
      '誤差、許容範囲内',
      '効率こそ美徳',
      '機構に、迷いはない',
      '精密に、仕留める',
    ],
    // ENEMY-IDENTITY-PROTOTYPE-02（K-C2、CEO GO）：R4「⚠ 主砲充填開始」→
    // R5必殺技「主砲・神滅甲」（内部24＝表示240）の2段telegraph型へ変更。
    // R7配置（K-A/K-B）は平均撃破R5.7のため発動率0%＝不可視と実証され
    // 棄却済み。R5・内部26（K-C）はhard勝率75.1%まで下がるため24へ調整
    // （K-C2：hard 83.4%・発動率76.1%・発動前撃破23.9%）。
    // 合計はbaseline 70→68。R2の溜め→R3主砲22の既存読み合いは維持する。
    actions: [
      { kind: 'attack', amount: 6 },
      { kind: 'charge', label: '砲身に魔力を溜めている…' },
      { kind: 'attack', amount: 22 },
      { kind: 'charge', label: '⚠ 主砲充填開始…！' },
      { kind: 'special', amount: 24, name: '主砲・神滅甲' },
      { kind: 'attack', amount: 7 },
      { kind: 'attack', amount: 9 },
    ],
  },
  {
    id: ENEMY_IDS.juuma,
    name: '双牙の魔獣',
    maxHp: 85,
    // STEP-L2：敵アセット最終調整の第二弾としてjuumaもPNGからWebPへ本番切り替え
    // （STEP-L1で軽加工候補を検証・A判定。左端の破片除去＋512×512化のみで、
    // 新規生成なし。datenshi/karakuri/doukeshi/oniと同じ最小変更方式）。
    art: '/assets/enemies/juuma/art.webp',
    typeLabel: '連撃型',
    typeDescription: '毎ラウンド連撃。序盤から圧が激しい。',
    visualType: 'fast',
    rank: 2,
    stage: { nameJa: '月牙の霊峰', accent: '#9fb8e8', bg: '/assets/backgrounds/stages/05-beast-moonpeak.webp' },
    battleCries: [
      'ガアアアッ！',
      '喰らい尽くしてやる…！',
      '牙が、疼く',
      'グルルル…逃さぬぞ',
      '血の匂いが、たまらぬ',
      '我が牙、受けてみよ！',
      '獲物は、もう目の前だ',
    ],
    // ENEMY-IDENTITY-PROTOTYPE-02（M-G、CEO GO）：全ラウンド連撃＋R3必殺技
    // 「双牙乱撃」（内部4×3＝表示40×3）へ変更。各ラウンドの合計は
    // baseline（9,10,12,13,14,15,16）と完全同値＝normal難易度のバランス不変。
    // debuffは合計へ1回適用・難易度倍率は合計保存丸め・Masteryは1action=1sample
    // （いずれもround.ts側で実装。per-hit方式の破綻はPROTOTYPE-01で実証済み）。
    actions: [
      { kind: 'multiAttack', hits: [5, 4] },
      { kind: 'multiAttack', hits: [5, 5] },
      { kind: 'multiAttack', hits: [4, 4, 4], name: '双牙乱撃', special: true },
      { kind: 'multiAttack', hits: [7, 6] },
      { kind: 'multiAttack', hits: [7, 7] },
      { kind: 'multiAttack', hits: [8, 7] },
      { kind: 'multiAttack', hits: [8, 8] },
    ],
  },
  {
    id: ENEMY_IDS.ryujin,
    name: '蒼海の龍神',
    maxHp: 103,
    art: art('ryujin'),
    typeLabel: '耐久型',
    typeDescription: '高HP。7ラウンドで倒し切る火力配分が重要。',
    visualType: 'heavy',
    rank: 3,
    stage: { nameJa: '蒼海の宮', accent: '#1a3a6b', bg: '/assets/backgrounds/stages/06-dragon-ocean.webp' },
    battleCries: [
      '小さき者よ、海の重みを知るがいい',
      '悠久の時に比べれば、瞬きよ',
      '波は、いずれ全てを飲み込む',
      '焦る必要など、どこにもない',
      '潮は満ち、そして引く…定めのように',
      '竜の鱗、容易く砕けはせぬ',
      '深淵より、我は来たる',
    ],
    // 耐久型。後半に攻撃力が伸びる持久戦タイプ（決定36でHPを125→103に調整。
    // 125のままだと笑蓮が全戦略で勝率0%になるなど、防御寄りのデッキが
    // 7ラウンド以内に倒し切れないケースが多発したため、trialと同じ103まで下げた）
    actions: [
      { kind: 'attack', amount: 4 },
      { kind: 'attack', amount: 5 },
      { kind: 'attack', amount: 7 },
      { kind: 'attack', amount: 9 },
      { kind: 'attack', amount: 12 },
      { kind: 'attack', amount: 16 },
      { kind: 'attack', amount: 20 },
    ],
  },
  {
    id: ENEMY_IDS.doukeshi,
    name: '乱舞の道化',
    maxHp: 92,
    // STEP-D4：敵アセット刷新の第三弾としてdoukeshiもPNGからWebPへ本番切り替え
    // （STEP-D1〜D3で候補Bを検証・A判定。datenshi＝STEP-A5・karakuri＝STEP-K5と
    // 同じ最小変更方式で、この1体だけ直接パスを指定する。数値・AIには一切触れていない）。
    art: '/assets/enemies/doukeshi/art.webp',
    typeLabel: 'トリック型',
    typeDescription: '不規則な溜め攻撃。毎ターン予告確認が重要。',
    visualType: 'standard',
    rank: 4,
    stage: { nameJa: '幻惑の舞台', accent: '#c0122f', bg: '/assets/backgrounds/stages/07-jester-festival.webp' },
    battleCries: [
      'さあ、遊びの時間だ！',
      '次はどっちが痛いかな〜？',
      'ハハッ、踊れ踊れ！',
      'あれあれ、驚いた顔だね',
      '次の手品、見てみたい？',
      '予測できないのが一番面白い',
      'さあ、宴を続けようか',
    ],
    // 攪乱型。小さな一撃と「溜め」からの大技を織り交ぜる、最も予測しにくい行動パターン
    actions: [
      { kind: 'attack', amount: 4 },
      { kind: 'charge', label: 'カードを宙に舞わせている…' },
      { kind: 'attack', amount: 19 },
      { kind: 'attack', amount: 6 },
      { kind: 'attack', amount: 12 },
      { kind: 'charge', label: 'カードを宙に舞わせている…' },
      { kind: 'attack', amount: 24 },
    ],
  },
]

const ENEMY_BY_ID = new Map<EnemyId, EnemyDef>(ENEMIES.map((e) => [e.id, e]))

export function getEnemyDef(id: EnemyId): EnemyDef {
  const def = ENEMY_BY_ID.get(id)
  if (!def) {
    throw new Error(`敵の定義が見つかりません: ${id}`)
  }
  return def
}

/**
 * シードから決定論的に対戦する敵を選ぶ（決定32）。`Math.random`は使わず、
 * `state.seed`（バトル開始時に発行される文字列）だけから毎回同じ結果になる
 * 単純な文字列ハッシュで選ぶ（決定不変ルール2：シード付き乱数のみ使用）。
 */
export function pickEnemyId(seed: string): EnemyId {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return ENEMIES[hash % ENEMIES.length].id
}
