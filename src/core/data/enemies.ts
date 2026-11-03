import { enemyId } from '../types/ids.js'
import type { EnemyDef, EnemyId } from '../types/index.js'
import { RULES } from './rules.js'

export const ENEMY_IDS = {
  trial: enemyId('enemy_01'),
  oni: enemyId('enemy_02'),
  onryo: enemyId('enemy_03'),
  karakuri: enemyId('enemy_04'),
  juuma: enemyId('enemy_05'),
  ryujin: enemyId('enemy_06'),
  doukeshi: enemyId('enemy_07'),
} as const

/**
 * STEP-VISUAL-ASSETS：7体すべてがWebPになり`art()`ヘルパーは不要になったため撤去。
 *
 * 重要（今後この付近を触る人向け）：`datenshi`・`karakuri`・`doukeshi`の
 * `art.png`は「旧デザイン」であって、現行`art.webp`の高画質版ではない。
 * 決定99/100でCEOが別イラストへ差し替えた際の差し替え前の絵が
 * ロールバック用に残っているだけで、両者は別のキャラクター画像である
 * （同一表示サイズでのPSNRは約8dB＝完全な別画像）。
 * この3体をart.pngから再変換すると、一度捨てたデザインに戻ってしまうため、
 * 画質改善目的でart.pngをsourceに使ってはならない。
 * `oni`・`juuma`のみart.pngが現行art.webpの真のsource（決定99/100ではなく
 * commit 5b1e1b7の軽加工）なので、そちらは再変換の対象になる。
 */


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
export const CORE_ENEMIES: EnemyDef[] = [
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
    typeDescription: '基本を守れば戦える。R4に攻撃が強まる。',
    // 決定246：攻撃の峰が R4 へ移ったため「終盤の強調（R5〜）」表示をやめる
    visualType: 'standard',
    // 脅威度★（表示専用。reducer・行動表・スコアは読まない）。v1.0.1 で実測に基づき再付番（AI 判断）：
    // 規則＝normal 全体指数（7 敵×7 神×16 seed×6 打ち筋＝14,112 局・v1.0.0 engine）の降順・同点は hard 指数・
    // 上位 2 体 ★4／次 2 体 ★3／次 2 体 ★2／最下位 ★1（★5 は Boss 予約）。龍神 4／怨霊 4／魔獣 3／鬼将 3／影 2／機工師 2／道化 1。
    // 根拠 docs/evidence/v1_0_1-rc/star-reeval.json（matrix 2026-10-10・再集計 2026-10-17）・docs/ENEMY_STAR_REEVAL_PREP_V1.md 案 A。
    // 旧値（LANE-D 叩き台 2026-08-28）：影 1／鬼将 2／怨霊 3／機工師 4／魔獣 2／龍神 3／道化 4。gameVersion の指紋には乗せない（replay/gameVersion.ts）
    rank: 2,
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
      // 決定246（Combat Tension v1）：同じ7値・同じ7R合計（67）のまま峰を R4 へ並べ替え。
      // 旧：5/6/8/9/11/13/15（峰 R7＝到達率 3%）
      { kind: 'attack', amount: 5 }, // R1
      { kind: 'attack', amount: 8 }, // R2
      { kind: 'attack', amount: 11 }, // R3
      { kind: 'attack', amount: 15 }, // R4
      { kind: 'attack', amount: 13 }, // R5
      { kind: 'attack', amount: 9 }, // R6
      { kind: 'attack', amount: 6 }, // R7
    ],
  },
  {
    id: ENEMY_IDS.oni,
    name: '業斧の鬼将',
    // 決定252：100 → 94。R3 溜め→R4 必殺「業斧・断岩」で R4 に防御を集中させる分、撃破が遅れて
    // 未撃破が神階Ⅲ〜Ⅵで 15〜18% に増えた（HP100）。94 で 7〜8%（Production 9〜11%）へ戻る。
    // 通常 reader 99.6／greedy 69.6（Production 64.1）。docs/ENEMY_ULTIMATE_THREAT_DIFFERENTIATION_PREFLIGHT.md §3-2
    maxHp: 94,
    // STEP-L2：敵アセット最終調整の第一弾としてoniもPNGからWebPへ本番切り替え
    // （STEP-L1で軽加工候補を検証・A判定。新規生成は行わず、512×512化・余白調整
    // のみ。datenshi/karakuri/doukeshiと同じ最小変更方式。数値・AIには一切触れていない）。
    // STEP-VISUAL-ASSETS：そのSTEP-L1の加工（bbox抽出→360×435→(76,39)へ配置）を
    // 可逆なart.pngから再実行し、圧縮による劣化分だけを取り戻した。配置は旧art.webpと
    // 完全一致（512×512／本体360×435@(76,39)）で、表示位置・サイズは不変。
    art: '/assets/enemies/oni/art_hq.webp',
    typeLabel: '重撃型',
    typeDescription: '溜めの次に断岩。R4を受け切れ。',
    visualType: 'standard',
    rank: 3,
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
      // 決定252（Enemy Ultimate）：「受け切る」問題。R3 を溜め（予兆）にし、R4 を名前つき必殺「業斧・断岩」26 へ。
      // 7R合計 77→73。通常 reader−必殺無視 34pt・神階Ⅵ 78→90・Ⅶ猛威 50→76（paired-seed）。
      // 旧（決定246）：5/9/13/17/15/11/7
      { kind: 'attack', amount: 5 },
      { kind: 'attack', amount: 9 },
      { kind: 'charge', label: '斧を振りかぶっている…' },
      { kind: 'special', amount: 26, name: '業斧・断岩' },
      { kind: 'attack', amount: 15 },
      { kind: 'attack', amount: 11 },
      { kind: 'attack', amount: 7 },
    ],
  },
  {
    id: ENEMY_IDS.onryo,
    name: '藍花の怨霊',
    maxHp: 95,
    // STEP-VISUAL-ASSETS：PNGのままだった2体（onryo・ryujin）をWebPへ。
    // 寸法・構図は無変更の純粋な再エンコードで、アルファは完全可逆（PSNR ∞）。
    art: '/assets/enemies/onryo/art_hq.webp',
    typeLabel: '遅咲き型',
    typeDescription: 'R4に怨嗟の花。峰に備え温存せよ。',
    // 決定246：攻撃の峰が R4 へ移ったため「終盤の強調（R5〜）」表示をやめる
    visualType: 'standard',
    rank: 4,
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
      // 決定246：同じ7値・7R合計（76）のまま峰を R4 へ。旧：3/4/6/9/13/18/23
      { kind: 'attack', amount: 3 },
      { kind: 'attack', amount: 6 },
      { kind: 'attack', amount: 13 },
      // 決定252：R4 の峰 23 は数値そのままで名前つき必殺「怨嗟の花」に（カットイン・🔥表示）。
      // 神階Ⅵの必殺倍率は specialMulCap 1.0（峰そのものが必殺。Ⅵ〜Ⅶ は Production と同値）。
      { kind: 'special', amount: 23, name: '怨嗟の花' },
      { kind: 'attack', amount: 18 },
      { kind: 'attack', amount: 9 },
      { kind: 'attack', amount: 4 },
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
    rank: 2,
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
    // STEP-VISUAL-ASSETS：oniと同じくart.pngから加工を再実行（本体のみ抽出→
    // 428×432→(45,41)へ配置。破片は本体と非接触のため自動的に除外される）。
    // 配置は旧art.webpと完全一致。同一表示サイズのPSNRは23.6dB→35.0dBへ改善。
    art: '/assets/enemies/juuma/art_hq.webp',
    typeLabel: '連撃型',
    typeDescription: '毎ラウンド連撃。序盤から圧が激しい。',
    visualType: 'fast',
    rank: 3,
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
      // 決定246：R3 必殺は固定。R4〜R7 の4行動を同じ組のまま峰 R4 へ並べ替え（旧：7+6/7+7/8+7/8+8）
      { kind: 'multiAttack', hits: [8, 8] },
      { kind: 'multiAttack', hits: [8, 7] },
      { kind: 'multiAttack', hits: [7, 7] },
      { kind: 'multiAttack', hits: [7, 6] },
    ],
  },
  {
    id: ENEMY_IDS.ryujin,
    name: '蒼海の龍神',
    maxHp: 103,
    // STEP-VISUAL-ASSETS：onryoと同じく寸法・構図無変更の再エンコード。
    art: '/assets/enemies/ryujin/art_hq.webp',
    typeLabel: '耐久型',
    typeDescription: 'R4の大海嘯。長い波を受け続けろ。',
    visualType: 'heavy',
    rank: 4,
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
      // 決定246：同じ7値・7R合計（73）のまま峰を R4 へ。旧：4/5/7/9/12/16/20
      { kind: 'attack', amount: 4 },
      { kind: 'attack', amount: 7 },
      { kind: 'attack', amount: 12 },
      // 決定252：R4 の峰 20 は数値そのままで名前つき必殺「大海嘯」に。神階Ⅵの必殺倍率は specialMulCap 1.0。
      { kind: 'special', amount: 20, name: '大海嘯' },
      { kind: 'attack', amount: 16 },
      { kind: 'attack', amount: 9 },
      { kind: 'attack', amount: 5 },
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
    typeDescription: 'R3に開幕の必殺。託宣を先に切れ。',
    visualType: 'standard',
    rank: 1,
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
      // 決定252（Enemy Ultimate）：「開幕」問題。ゲーム最速の必殺「乱舞・狂宴」24 を R3 に置き、
      // R2 の溜め（⚠）で予兆する。託宣（加護）を R3 に先に切る判断が生まれる（Ⅴ 託宣 R3 使用 13→53%）。
      // R5 溜め→R6 19 はアンコール（到達率 ≈35%）。同じ7行動・同じ合計 65。
      // 旧（決定246）：4/溜/19/溜/24/12/6 ＝ 通常で greedy 97.6% と読む価値が無かった。
      { kind: 'attack', amount: 4 },
      { kind: 'charge', label: '⚠ 手品を仕込んでいる…' },
      { kind: 'special', amount: 24, name: '乱舞・狂宴' },
      { kind: 'attack', amount: 9 },
      { kind: 'charge', label: 'また何か仕込んでいる…' },
      { kind: 'attack', amount: 19 },
      { kind: 'attack', amount: 9 },
    ],
  },
]

/**
 * Threat Branch Pilot v1（Lane 1・`docs/LANE1_THREAT_BRANCH_PILOT_V1.md`・2026-10-17）：
 * 「手札で考える」が成立していない問題（K33 OPEN：託宣の時機だけで勝敗が決まり、カードをランダムに出しても
 * 加護を読めば勝率 99.6%＝reader と同じ。1 択率 41%）に対し、決定274 忠次「軍略」（CEO 評価＝戦略性 PASS・再戦意欲 PASS）
 * の **機構だけ** を既存敵の変種 1 体で試す。忠次本体（enemy_08・画像・舞台・台詞・将軍家）は持ち込まない。
 *
 * - 既存 7 体（`CORE_ENEMIES`）は 1 文字も変更しない（`coreRoster.test.ts` が master 時点の JSON sha256 で固定）
 * - `pickEnemyId`（seed → 敵）・Daily の巡回（`DAILY_BOSS_POOL`）・49 攻略盤（`MATCHUP_ENEMIES`）は
 *   `ENEMY_IDS`／`CORE_ENEMIES` だけを見る＝既存の seed・Daily・Records は一切動かない
 * - gameVersion の指紋も `CORE_ENEMIES` だけ（`replay/gameVersion.ts`）＝既存プレイヤーの版は不変
 * - Enemy Select には `?pilot=threat` のときだけ並ぶ（`components/pilot/pilotFlag.ts`）。戦績・セーブ・報酬にも残さない
 * - enemy_08 は決定274 忠次のために予約（`feat/shogunate-pilot-v0.3`）。Pilot 敵は 09 から
 * - 新規素材 0：画像・舞台・visualType・rank・battleCries は鬼将（enemy_02）と同一
 */
export const PILOT_ENEMY_IDS = {
  oniTactic: enemyId('enemy_09'),
} as const

export const PILOT_ENEMIES: EnemyDef[] = [
  {
    id: PILOT_ENEMY_IDS.oniTactic,
    name: '業斧の鬼将・軍略',
    // 鬼将（決定252）と同じ 94。then のしきい値（0.5）＝47 以下
    maxHp: 94,
    art: '/assets/enemies/oni/art_hq.webp',
    typeLabel: '重撃型（軍略）',
    typeDescription: 'R4は傷が深ければ斧が鈍る。R3までに追い込め。',
    visualType: 'standard',
    // v1.0.1 ★再付番：本体 enemy_02（業斧の鬼将）の新★3 を継承（表示専用・CORE 外なので指紋に乗らない）
    rank: 3,
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
    // 軍略（tactic）：R3 の溜めで「次は傷の深さで手が変わる」と 1 手先に告げ、R4 の行動は R4 開始時の敵 HP で分岐する。
    // then（追い込めた・HP ≤ 47）：attack 13 ／ else（追い込めなかった）：鬼将と同じ名前つき必殺 26「業斧・断岩」。
    // 7R 合計 then 60／else 73（else は鬼将 enemy_02 と完全に同じ行動表＝「追い込めなければ鬼将そのもの」）。
    // then を 0 にしない＝追い込んでも受けは要る（一択化の防止）。R1・R2・R5〜R7 は鬼将と同一
    // Pilot v1.1：しきい値は難易度別（normal 0.5＝≤47・hard 0.6＝≤64／108。`RULES.enemyTactic.hpRatioByDifficulty`）
    actions: [
      { kind: 'attack', amount: 5 },
      { kind: 'attack', amount: 9 },
      { kind: 'charge', label: '⚠ 傷が浅ければ次は断岩' },
      {
        kind: 'tactic',
        cond: {
          type: 'enemyHpRatioAtMost',
          ratio: RULES.enemyTactic.defaultHpRatio,
          ratioByDifficulty: RULES.enemyTactic.hpRatioByDifficulty,
        },
        then: { kind: 'attack', amount: 13 },
        else: { kind: 'special', amount: 26, name: '業斧・断岩' },
      },
      { kind: 'attack', amount: 15 },
      { kind: 'attack', amount: 11 },
      { kind: 'attack', amount: 7 },
    ],
  },
]

/**
 * 将軍家 Pilot v0.4（決定274・CEO 実装承認 2026-10-10・`docs/SHOGUNATE_PILOT_V0_4.md`・設計 `docs/SHOGUNATE_FACTION_DESIGN_V1.md`）：
 * SGG Creator Kit「将軍家」（shogunate v1.0.0・releasedAt 2026-10-08）の公式キャラクター 忠次 を 1 体だけ試験導入する。
 * v0.1〜v0.3（`feat/shogunate-pilot-v0.3` @ 5a357f1）の忠次データを v1.0.2 RC の構造（CORE／PILOT の配列分離・
 * `tactic.ts` の 4 引数解決）に載せ替えたもの。engine は RC 版をそのまま使う（v0.3 の engine 差分は持ち込まない）。
 * - 既存 7 体（`CORE_ENEMIES`）は 1 文字も変更しない（`coreRoster.test.ts`／`shogunateRoster.test.ts` が JSON の sha256 で固定）
 * - `pickEnemyId`・Daily・49 攻略盤・gameVersion の指紋は `ENEMY_IDS`／`CORE_ENEMIES` だけを見る＝seed・Daily・Records・版は不変
 * - 決定287 W1（将軍家 第一陣 公開 v1・2026-11-03）：Enemy Select の通常導線に 8 体目として並ぶ。戦績・セーブ・報酬・神階・絆は既存 7 体と同じ扱い。
 *   Daily 巡回・49 攻略盤・`pickEnemyId`・gameVersion は引き続き CORE 7 体だけ（攻略盤の対象外＝Enemy Select に注記）。v0.4〜v0.6 は `?pilot=shogunate` 隔離だった
 * - しきい値は `cond.ratio` 0.5 のみ（`ratioByDifficulty` は埋めない）：Enemy Break の half 帯（表示 HP ≤ 0.5）と全難易度で一致させ、
 *   「崩れ＝追い込めた（R4 は then）」が嘘をつかないようにする（`SHOGUNATE_NEXT_PILOT_AUDIT_V1.md` §4-1・§4-3）
 * - 名前は Kit manifest の公式名「忠次」と公式 role「将軍四天王」。二つ名・技名・台詞は非公式のファン創作（Kit 規約 §6・§7。
 *   「公式」「公認」とは表記しない）。将軍家に公式ボイスは無い
 */
export const SHOGUNATE_ENEMY_IDS = {
  tadatsugu: enemyId('enemy_08'),
  // W2（決定288 v1.1・2026-11-03）：公式 Kit 将軍家 3 体。enemy_09 は Threat Pilot（鬼将・軍略）で欠番
  okappiki: enemyId('enemy_10'),
  naomasa: enemyId('enemy_11'),
  yasumasa: enemyId('enemy_12'),
  // W3（決定288 v1.1・2026-11-03）：影の忍者衆と頭領
  kage: enemyId('enemy_13'),
  kunoichi: enemyId('enemy_14'),
  onihanzo: enemyId('enemy_15'),
  // W4（決定288 v1.1・2026-11-03）：四天王最強の軍神と、逆さ五重塔の科学者
  tadakatsu: enemyId('enemy_16'),
  doman: enemyId('enemy_17'),
  yasutora: enemyId('enemy_18'),
} as const

export const SHOGUNATE_ENEMIES: EnemyDef[] = [
  {
    id: SHOGUNATE_ENEMY_IDS.tadatsugu,
    name: '将軍四天王・忠次',
    // 設計 §4-2：鬼将 94〜龍神 103 の中間。then 分岐のしきい値（0.5）が 49 と切りの良い値になる
    maxHp: 98,
    // Kit FRONT（1600²・透過・sha256 b8d7d894…）→ 余白トリム → 768² webp（既存 7 体と同寸）。原本は art-source/enemies/tadatsugu/
    art: '/assets/enemies/tadatsugu/art.webp',
    typeLabel: '軍略型',
    typeDescription: 'R4は傷が浅ければ総攻め。R3までに追い込め。',
    // v0.2：重装の軍師＝突進は 'heavy'（0.65s・着弾計画も既存の heavy 経路）。表示専用・数値不変
    visualType: 'heavy',
    // 決定287 W1（2026-11-03）：★は実測（v1.0.1 と同じ 6 打ち筋 × 16 seed × 3 難易度の指数・docs/evidence/shogunate-public-v1/star）。
    // normal 指数 28.4 は道化（★1・28.6）より低く ★1 帯。数値は変えない（CEO 方針：★は実測に合わせ難易度調整は原則しない）。表示専用・CORE 外なので指紋に乗らない
    rank: 1,
    // 舞台背景は CEO 生成の「戦火の陣」（02）を色相・明度だけ非生成加工した派生（台帳 STG-08）。新規生成はしていない
    stage: { nameJa: '軍議の本陣', accent: '#8c6d1f', bg: '/assets/backgrounds/stages/08-shogunate-camp.webp' },
    // 非公式のファン創作（Kit の口調本文は配布対象外）。役割「軍師」1 行から AI が起こした仮文・CEO 監修待ち
    battleCries: [
      '布陣は整った。まずは小手調べといこう',
      '焦るな。戦は、数で読む',
      '……ほう。その手で来るか',
      '軍略は、相手の傷で決まる',
      '次の一手は、もう決めてある',
      '読み切れぬ戦など、ない',
      'ここまで読めたのは、そなたが初めてだ',
    ],
    // 軍略（tactic）：R3 の溜めで「次は戦況で手が変わる」と 1 手先に告げ、R4 の行動は R4 開始時の敵 HP で分岐する。
    // then（追い込めた・HP ≤ 49）：attack 12 ／ else（追い込めなかった）：名前つき必殺 24「軍略・総攻め」。
    // 7R 合計 then 57／else 69（既存 65〜77 帯）。then を 0 にしない＝追い込んでも受けは要る（一択化の防止・設計 §3-1）。
    // しきい値（v0.6）：easy／normal 0.5（83→≤41・98→≤49＝Enemy Break の half 帯と同じ境界）・hard 0.6（113→≤67）。
    // v0.6（CEO 承認 2026-10-29・`docs/SHOGUNATE_V0_6_DESIGN_AUDIT.md` §2）：hard の then 率 16.8%→43.9%（sim）。
    // 値は Threat Pilot と同じ既存の RULES.enemyTactic.hpRatioByDifficulty（新しい調整値なし）。hard だけ half 帯（50%）と境界がずれる
    actions: [
      { kind: 'attack', amount: 5 },
      { kind: 'attack', amount: 9 },
      { kind: 'charge', label: '⚠ 傷が浅ければ次は総攻め' },
      {
        kind: 'tactic',
        cond: { type: 'enemyHpRatioAtMost', ratio: RULES.enemyTactic.defaultHpRatio, ratioByDifficulty: RULES.enemyTactic.hpRatioByDifficulty },
        then: { kind: 'attack', amount: 12 },
        else: { kind: 'special', amount: 24, name: '軍略・総攻め' },
      },
      { kind: 'attack', amount: 15 },
      { kind: 'attack', amount: 10 },
      { kind: 'attack', amount: 6 },
    ],
  },
  /**
   * W2 将軍家 第二陣（決定288 v1.1・`docs/FINAL_SCOPE_ROADMAP_V1.md` §2-2・§10）：公式 Kit 将軍家の 3 体。
   * 公式（Kit manifest）＝名前・role・profile・画像のみ。二つ名・型・台詞・技名は本作の創作（非公式）。公式ボイスは無く、本作も声を付けない。
   * 既存 7 体・忠次のデータは 1 文字も変えない。Daily／49 盤／pickEnemyId／gameVersion は CORE 7 体のまま。
   * ★（rank）は実測（scripts/enemy-star-audit）で付ける。HP・amount は Preflight sim（docs/evidence/shogunate-wave2/）で確定した値
   */
  {
    id: SHOGUNATE_ENEMY_IDS.okappiki,
    name: '捕り方・岡っ引き',
    // 入門帯：既存 7 体で最も軽い道化（HP 88 帯）と同じ重さ
    maxHp: 88,
    // Kit MAIN（1600²・非透過のイラスト）→ 人物中心を切り出し、縁を放射状に透過（非生成加工・sharp）→ 768² webp。原本は art-source/enemies/okappiki/
    art: '/assets/enemies/okappiki/art.webp',
    typeLabel: '群れ型',
    typeDescription: '偶数Rは小刻みな連撃。数で押される前に削れ。',
    visualType: 'fast',
    rank: 1,
    // 舞台は STG-02（02-oni-castle・CEO 生成）の色相回転・減光の派生（新規生成なし・台帳 STG-09）
    stage: { nameJa: '御用提灯の町', accent: '#8d7bd6', bg: '/assets/backgrounds/stages/09-okappiki-street.webp' },
    // 非公式のファン創作（profile「穢土の町を取り締まる将軍家の捕り方」の範囲。新しい設定は足さない）
    battleCries: [
      '御用だ、御用だ！',
      '神妙にしろい！',
      '逃がしゃしねえぞ',
      '町の静けさは、俺たちが守る',
      'まだまだ、人手はあるんだ',
      '十手の錆にしてやる！',
      'おいおい、話が違うじゃねえか……',
    ],
    // 群れ：偶数 R は小さな連撃（ブロックの価値を教える入門）。R6 は技名つき連撃。合計 4+6+6+8+8+9+10＝51（道化 50 帯）
    actions: [
      { kind: 'attack', amount: 4 },
      { kind: 'multiAttack', hits: [2, 2, 2] },
      { kind: 'attack', amount: 6 },
      { kind: 'multiAttack', hits: [2, 2, 2, 2] },
      { kind: 'attack', amount: 8 },
      { kind: 'multiAttack', hits: [3, 3, 3], name: '十手・乱打', special: true },
      { kind: 'attack', amount: 10 },
    ],
  },
  {
    id: SHOGUNATE_ENEMY_IDS.naomasa,
    name: '将軍四天王・直政',
    maxHp: 96,
    // Kit FRONT（1600²・透過）→ 余白トリム → 768² webp（忠次と同手順・非生成加工）。原本は art-source/enemies/naomasa/
    art: '/assets/enemies/naomasa/art.webp',
    typeLabel: '猛り型',
    typeDescription: 'R4は追い込むと猛る連撃、浅ければ重撃。',
    visualType: 'heavy',
    rank: 1,
    // 舞台は STG-08（08-shogunate-camp・派生）を朱へ色相回転した派生（台帳 STG-10）
    stage: { nameJa: '猛りの陣', accent: '#d1402f', bg: '/assets/backgrounds/stages/10-naomasa-camp.webp' },
    // 非公式のファン創作（profile「四天王で最も好戦的。直情的で、忠勝に対抗心を燃やす」の範囲）
    battleCries: [
      '待ちかねたぞ！',
      '小細工は要らん、来い！',
      '傷が深いほど、俺は猛る',
      '忠勝より先に、俺が決める',
      'まだだ、まだ足りん！',
      '痛みは、燃料だ',
      '……悪くない。次は俺の番だ',
    ],
    // 忠次の逆：R4 の軍略は「追い込めた（then）」で猛る連撃 5×3、「浅い（else）」で重撃 22。then を 0 にしない（一択化の防止）。
    // しきい値は忠次と同じ既存の RULES.enemyTactic（easy／normal 0.5・hard 0.6）。合計 then 59／else 66（既存 65〜77 帯の下側）
    actions: [
      { kind: 'attack', amount: 6 },
      { kind: 'attack', amount: 10 },
      { kind: 'charge', label: '⚠ 傷が深ければ次は猛る' },
      {
        kind: 'tactic',
        cond: { type: 'enemyHpRatioAtMost', ratio: RULES.enemyTactic.defaultHpRatio, ratioByDifficulty: RULES.enemyTactic.hpRatioByDifficulty },
        then: { kind: 'multiAttack', hits: [5, 5, 5], name: '猛り・三連', special: true },
        else: { kind: 'special', amount: 22, name: '猛り・一文字' },
      },
      { kind: 'attack', amount: 12 },
      { kind: 'attack', amount: 9 },
      { kind: 'attack', amount: 7 },
    ],
  },
  {
    id: SHOGUNATE_ENEMY_IDS.yasumasa,
    name: '将軍四天王・康政',
    maxHp: 96,
    // Kit FRONT（1600²・透過）→ 余白トリム → 768² webp（非生成加工）。原本は art-source/enemies/yasumasa/
    art: '/assets/enemies/yasumasa/art.webp',
    typeLabel: '采配型',
    typeDescription: 'R3の一撃が大きければ采配が崩れる。一点集中。',
    visualType: 'standard',
    rank: 1,
    // 舞台は STG-08 を青緑へ色相回転した派生（台帳 STG-11）
    stage: { nameJa: '采配の陣', accent: '#2f9a86', bg: '/assets/backgrounds/stages/11-yasumasa-camp.webp' },
    // 非公式のファン創作（profile「四天王で最も文化人の面を持つ。兵を率いさせれば随一の指揮官」の範囲）
    battleCries: [
      'さて、指揮を執らせていただこう',
      '兵は静かに、確実に',
      '一手一手が、詩のように',
      '崩すなら、一息で',
      '采配は、まだ揺るがぬ',
      '……ふむ、陣が乱れたか',
      'お見事。良い戦でした',
    ],
    // 康政型（roundDamageAtLeast）：R4 開始時「R3 の 1 ラウンド実効ダメージ ≥ maxHp × 0.25（hard 0.20）」なら then（采配が崩れた）＝軽い手 10、
    // 届かなければ必殺 26「采配・総崩し」。忠次「累積で追い込む」に対する「1 ラウンドで崩す」＝R2 で温存して R3 に一点集中するかの判断。
    // 合計 then 53／else 69
    actions: [
      { kind: 'attack', amount: 5 },
      { kind: 'attack', amount: 8 },
      { kind: 'charge', label: '⚠ 一気に崩さねば次は采配' },
      {
        kind: 'tactic',
        cond: { type: 'roundDamageAtLeast', ratio: RULES.enemyTactic.defaultRoundDamageRatio, ratioByDifficulty: RULES.enemyTactic.roundDamageRatioByDifficulty },
        then: { kind: 'attack', amount: 10 },
        else: { kind: 'special', amount: 26, name: '采配・総崩し' },
      },
      { kind: 'attack', amount: 14 },
      { kind: 'attack', amount: 10 },
      { kind: 'attack', amount: 6 },
    ],
  },
  /**
   * W3 将軍家 第三陣（決定288 v1.1 §10-3）：忍者衆「影」の 2 体と頭領 鬼半蔵。engine 語彙は既存のみ（tactic は忠次型）。
   * 公式（Kit manifest）＝名前・role・profile・画像のみ。二つ名・型・台詞・技名は本作の創作（非公式）。公式ボイスは無く、本作も声を付けない。
   */
  {
    id: SHOGUNATE_ENEMY_IDS.kage,
    name: '忍者衆・影',
    maxHp: 96,
    // Kit MAIN（1600²・非透過）→ 人物中心を切り出し＋放射状フェード → 768² webp（岡っ引きと同手順・非生成加工）
    art: '/assets/enemies/kage/art.webp',
    typeLabel: '読めぬ型',
    typeDescription: 'R2とR5で手が変わる。R1の削りとR4の備えで読め。',
    visualType: 'fast',
    rank: 1,
    stage: { nameJa: '影の里', accent: '#5a6b9e', bg: '/assets/backgrounds/stages/12-kage-village.webp' },
    // 非公式のファン創作（profile「将軍家に仕える忍者衆。諜報と暗殺を担う」の範囲）
    battleCries: [
      '……任務、開始',
      '気配は、消した',
      '読めるか。読めまい',
      '影は二度、揺れる',
      '次は、闇から',
      '深追いは、しない',
      '……退く。影は消える',
    ],
    // 2 回の読み：R2 は「R1 で先手を取られたか」（HP 比 ≤0.85 なら then＝連撃 3×3、else 重撃 11・予告なしの静かな分岐）、
    // R5 は忠次型の軍略（R4 溜め→R5 開始時 HP 比 ≤0.5 なら then 攻撃 9／else 必殺 20「闇討ち」）。合計 then 5+9+8+0+9+10+8＝49／else 5+11+8+0+20+10+8＝62
    actions: [
      { kind: 'attack', amount: 5 },
      {
        kind: 'tactic',
        cond: { type: 'enemyHpRatioAtMost', ratio: 0.85 },
        then: { kind: 'multiAttack', hits: [3, 3, 3] },
        else: { kind: 'attack', amount: 11 },
      },
      { kind: 'attack', amount: 8 },
      { kind: 'charge', label: '⚠ 追い込めねば次は闇討ち' },
      {
        kind: 'tactic',
        // R5 開始時は R1〜R4 の累積で HP 比が下がっているため、既定 0.5 だと then 率 79.6%（帯 35〜65 超）→ 0.35（hard 0.45）
        cond: { type: 'enemyHpRatioAtMost', ratio: 0.35, ratioByDifficulty: { easy: 0.35, normal: 0.35, hard: 0.45 } },
        then: { kind: 'attack', amount: 9 },
        else: { kind: 'special', amount: 20, name: '闇討ち' },
      },
      { kind: 'attack', amount: 10 },
      { kind: 'attack', amount: 8 },
    ],
  },
  {
    id: SHOGUNATE_ENEMY_IDS.kunoichi,
    name: '忍者衆・くノ一',
    maxHp: 90,
    art: '/assets/enemies/kunoichi/art.webp',
    typeLabel: '疾風型',
    typeDescription: '速い連撃が続く。R6の影走りまでに体力を残せ。',
    visualType: 'fast',
    rank: 1,
    stage: { nameJa: '月下の忍び道', accent: '#c9a24d', bg: '/assets/backgrounds/stages/13-kunoichi-moonpath.webp' },
    // 非公式のファン創作（profile「忍者衆「影」に属する女忍」の範囲）
    battleCries: [
      '影より参ります',
      '速いですよ',
      '一太刀では、足りません',
      '息を乱さず、もう一度',
      '次は、影走り',
      'あら……やりますね',
      'お役目、ここまで',
    ],
    // 疾風：連撃中心・R6 技名つき連撃（special）。合計 4+6+7+9+0+18+8＝52
    actions: [
      { kind: 'multiAttack', hits: [2, 2] },
      { kind: 'multiAttack', hits: [3, 3] },
      { kind: 'attack', amount: 7 },
      { kind: 'multiAttack', hits: [3, 3, 3] },
      { kind: 'charge', label: '⚠ 次は影走り' },
      { kind: 'multiAttack', hits: [6, 6, 6], name: '影走り', special: true },
      { kind: 'multiAttack', hits: [4, 4] },
    ],
  },
  {
    id: SHOGUNATE_ENEMY_IDS.onihanzo,
    name: '影の頭領・鬼半蔵',
    maxHp: 110,
    // Kit FRONT（1600²・透過）→ 余白トリム → 768² webp（忠次と同手順・非生成加工）
    art: '/assets/enemies/onihanzo/art.webp',
    typeLabel: '頭領型',
    typeDescription: 'R4とR7に必殺。R3までに追い込めば血風は連撃に。',
    visualType: 'heavy',
    // ★は実測（docs/evidence/shogunate-wave3/star）：normal 指数 31.7 ＝ 機工師（★2・31.4）の帯 → ★2。影 25.3・くノ一 21.9 は ★1
    rank: 2,
    stage: { nameJa: '鬼嶽の砦', accent: '#b8322d', bg: '/assets/backgrounds/stages/14-onihanzo-fort.webp' },
    // 非公式のファン創作（profile「忍者衆「影」を率いる頭領。代々将軍家に仕え、鬼嶽一族の血を引く」の範囲）
    battleCries: [
      '鬼嶽の血が、騒ぐ',
      '沈め',
      '影は、俺の手足だ',
      '次は……血の風だ',
      '追い込めたか。それでも、来い',
      'ほう……影を抜くか',
      '頭領の名に……懸けて……',
    ],
    // 頭領：高 HP・R4 軍略（追い込めた then 連撃 4×3 special／else 必殺 24「鬼嶽・血風」）・R7 必殺 26。合計 then 6+9+0+12+12+0+26＝65／else 77
    // しきい値（Preflight sim・docs/evidence/shogunate-wave3/sim.json）：HP 110 で既定 0.5 だと then 率 23.6%（帯 35〜65 未満）→ 0.55（hard 0.65）＝
    // then に必要なダメージ normal 50／hard 44 で忠次（49／44）と同帯。Enemy Break の崩れ（50%）より先に「✓」が出る（頭領は読みの期限が早い・全難易度）
    actions: [
      { kind: 'attack', amount: 6 },
      { kind: 'multiAttack', hits: [3, 3, 3] },
      { kind: 'charge', label: '⚠ 追い込めねば次は血風' },
      {
        kind: 'tactic',
        cond: { type: 'enemyHpRatioAtMost', ratio: 0.55, ratioByDifficulty: { easy: 0.55, normal: 0.55, hard: 0.65 } },
        then: { kind: 'multiAttack', hits: [4, 4, 4], name: '鬼嶽・連風', special: true },
        else: { kind: 'special', amount: 24, name: '鬼嶽・血風' },
      },
      { kind: 'attack', amount: 12 },
      { kind: 'charge', label: '⚠ 次は頭領の一撃' },
      { kind: 'special', amount: 26, name: '鬼嶽・頭領斬り' },
    ],
  },
  /**
   * W4 将軍家 第四陣（決定288 v1.1 §10-3）：忠勝（最後の盾）・ドーマン（共鳴に反応する逆さ五重塔）。engine は resonanceAtLeast を 1 種追加（ドーマンだけが使う）。
   * 公式（Kit manifest）＝名前・role・profile・画像のみ。二つ名・型・台詞・技名は本作の創作（非公式）。公式ボイスは無く、本作も声を付けない。
   */
  {
    id: SHOGUNATE_ENEMY_IDS.tadakatsu,
    name: '将軍四天王・忠勝',
    // 最後の盾：既存最大の龍神 103・鬼半蔵 110 を超える 112（将軍家で最も固い）。ロードマップ案の 120 帯は balanceSim 決定287（hard × 全神 ≥50%）で福永 33%／笑蓮 45% の詰みが出たため、特大 2 発（24／28）を残して HP を下げた（docs/W4_SHOGUNATE_WAVE4_GATE.md §3）
    maxHp: 112,
    // Kit FRONT（1600²・透過・sha256 884a0a54…46d0）→ 余白トリム → 768² webp（忠次と同手順・非生成加工）。原本は art-source/enemies/tadakatsu/
    art: '/assets/enemies/tadakatsu/art.webp',
    typeLabel: '鉄壁型',
    typeDescription: 'R4とR7に蜻蛉切の大技。受けるか、削り切るか。',
    visualType: 'heavy',
    // ★は実測（docs/evidence/shogunate-wave4/star）：normal 指数 41.9 ＝ 龍神（★4・37.7）を超え 17 体で最高 → ★4（将軍家で初の ★4）
    rank: 4,
    // 舞台は STG-08（08-shogunate-camp・派生）を鉄灰へ減彩・減光した派生（台帳 STG-15）
    stage: { nameJa: '盾の本陣', accent: '#ff8a1f', bg: '/assets/backgrounds/stages/15-tadakatsu-bastion.webp' },
    // 非公式のファン創作（profile「四天王最強の軍神。槍・蜻蛉切を振るい、将軍を守る最後の盾となる」の範囲）
    battleCries: [
      '将軍の盾、ここに在り',
      '槍は一本。迷いは、無い',
      '受けてみよ、蜻蛉切',
      '……良い踏み込みだ',
      '盾は、退かぬ',
      '次で、終わりにする',
      '盾が割れるか……見事',
    ],
    // 鉄壁：tactic なし・単発重撃中心・R4／R7 の名前つき必殺（溜め→必殺の 2 段）。「受けるか削り切るか」は特大 2 発への配分で問う（敵ブロックは作らない）。
    // 合計 8+10+0+24+12+0+28＝82（HP 112 の長期戦・既存帯 65〜77 の上）。ロードマップ案の 26／30 は hard で重すぎたため 24／28。「受けるか削り切るか」は balanceSim 決定287 で defensive／balanced の最善が全神 ≥50%（詰みなし）
    actions: [
      { kind: 'attack', amount: 8 },
      { kind: 'attack', amount: 10 },
      { kind: 'charge', label: '⚠ 次は蜻蛉切' },
      { kind: 'special', amount: 24, name: '蜻蛉切・一閃' },
      { kind: 'attack', amount: 12 },
      { kind: 'charge', label: '⚠ 次は盾の全霊' },
      { kind: 'special', amount: 28, name: '蜻蛉切・断' },
    ],
  },
  {
    id: SHOGUNATE_ENEMY_IDS.doman,
    name: '科学者・ドーマン',
    maxHp: 100,
    // Kit FRONT（1600²・透過・sha256 d5c851f1…92a2）→ 余白トリム → 768² webp（非生成加工）。原本は art-source/enemies/doman/
    art: '/assets/enemies/doman/art.webp',
    typeLabel: '共鳴型',
    typeDescription: '共鳴を溜めたまま迎えれば塔は沈黙。撃つか、溜めるか。',
    visualType: 'standard',
    // ★は実測（同上）：normal 指数 30.0 ＝ 道化（★1・28.6）〜機工師（★2・31.4）の間 → ★1
    rank: 1,
    // 舞台は STG-04（04-mecha-workshop・CEO 生成）を紫へ色相回転した派生（台帳 STG-16）
    stage: { nameJa: '逆さ五重塔の工房', accent: '#8a4fc7', bg: '/assets/backgrounds/stages/16-doman-pagoda.webp' },
    // 非公式のファン創作（profile「元・陰陽寮の天才科学者・道曼。将軍に「逆さ五重塔」を献じた」の範囲）
    battleCries: [
      'ふむ。興味深い被験体だ',
      '塔は、君の共鳴を聴いている',
      '溜めるかね？ 放つかね？',
      '計算どおり……いや、少し違うな',
      '五重塔は、逆さまに回る',
      'さあ、最後の実験だ',
      '……記録しておこう。君の名を',
    ],
    // ドーマン型（resonanceAtLeast）：R4／R7 開始時に共鳴ゲージが max×0.5（＝4）以上なら then（塔は沈黙＝攻撃 9／11）、
    // 届かなければ必殺 24「逆さ五重塔」／26「逆さ五重塔・反転」。ゲージは 7 で自動発動して 0 に戻る＝「溜めるほど発動で失う」。
    // 共鳴を R3／R6 の前に撃つ（＝神の介入を得て塔を受ける）か、4〜6 で温存して塔を黙らせるかの判断。合計 then 42／else 72
    actions: [
      { kind: 'attack', amount: 5 },
      { kind: 'attack', amount: 7 },
      { kind: 'charge', label: '⚠ 五重塔が共鳴に反応' },
      {
        kind: 'tactic',
        cond: { type: 'resonanceAtLeast', ratio: RULES.enemyTactic.defaultResonanceRatio },
        then: { kind: 'attack', amount: 9 },
        else: { kind: 'special', amount: 24, name: '逆さ五重塔' },
      },
      { kind: 'attack', amount: 10 },
      { kind: 'charge', label: '⚠ 五重塔が再び共鳴に反応' },
      {
        kind: 'tactic',
        cond: { type: 'resonanceAtLeast', ratio: RULES.enemyTactic.defaultResonanceRatio },
        then: { kind: 'attack', amount: 11 },
        else: { kind: 'special', amount: 26, name: '逆さ五重塔・反転' },
      },
    ],
  },
  /**
   * W5 将軍家 最終（決定288 v1.1 §10-3）：十七代将軍・康虎＝最終 Boss ★5。engine 語彙は既存のみ（attack／multiAttack／charge／special／tactic 忠次型 × 2 段）。
   * 公式（Kit manifest）＝名前・role「17代将軍」・profile「穢土を治める17代将軍。側室や側近以外には姿を見せない独裁者」・画像のみ。二つ名・型・台詞・技名は本作の創作（非公式）。
   * rank 5 は v1.0.1 から Boss 予約だった枠（enemies.test「通常 ≤4・康虎のみ 5」）。Daily・49 盤・seed は CORE 固定なので康虎は出ない。
   */
  {
    id: SHOGUNATE_ENEMY_IDS.yasutora,
    name: '十七代将軍・康虎',
    // 最終 Boss：HP は balanceSim 決定287（hard × 全神 × 3 戦略 ≥50%）を満たす最大帯を掃引で決めた（docs/W5_SHOGUNATE_WAVE5_GATE.md §3）
    maxHp: 114,
    // Kit FRONT（1600²・透過・sha256 fb7b5dcf…feb5）→ 余白トリム → 768² webp（忠次と同手順・非生成加工）。原本は art-source/enemies/yasutora/
    art: '/assets/enemies/yasutora/art.webp',
    typeLabel: '君臨型',
    typeDescription: '全ての型を使う。追い込まねば裁きが下る。',
    visualType: 'heavy',
    // ★5＝Boss 予約枠（表示専用・実測指数は docs/evidence/shogunate-wave5/star に記録。帯の上限 ★4 を超える位置づけ）
    rank: 5,
    // 舞台は STG-02（02-oni-castle・CEO 生成）を金へ色相回転・減光した派生（台帳 STG-17）
    stage: { nameJa: '穢土城・大広間', accent: '#d4a72c', bg: '/assets/backgrounds/stages/17-yasutora-throne.webp' },
    // 非公式のファン創作（profile「穢土を治める17代将軍。側室や側近以外には姿を見せない独裁者」の範囲）
    battleCries: [
      '……余の前に立つか。珍しい客だ',
      '穢土は余のもの。神とて例外ではない',
      '近習は下がれ。余が自ら裁く',
      'ほう。まだ立っているか',
      '裁きの刻だ。平伏せよ',
      '……余を、ここまで追い込むとはな',
      '見事。穢土の記憶に刻んでおこう',
    ],
    // 君臨：全語彙の複合。R2 連撃 5×3／R3 溜め→R4 忠次型 tactic（bossOpeningHpRatio まで追い込めば近習の槍 6×3、届かなければ必殺 32「将軍の威」）／R5 重撃 14／
    // R6 溜め→R7 忠次型 tactic 2 段目（bossFinalHpRatio まで追い込めば 12、届かなければ必殺 36「穢土の裁き」）。合計 then 67／else 105（既存最大 忠勝 82 の上）。比は rules.ts。連撃 5×3／6×3・必殺 32／36 はロードマップ値（4×3／5×3・30／34）から +1／+2（★実測で 18 体の最上位にするため・docs/W5_SHOGUNATE_WAVE5_GATE.md §3）
    actions: [
      { kind: 'attack', amount: 8 },
      { kind: 'multiAttack', hits: [5, 5, 5] },
      { kind: 'charge', label: '⚠ 追い込まねば次は将軍の威' },
      {
        kind: 'tactic',
        cond: { type: 'enemyHpRatioAtMost', ratio: RULES.enemyTactic.bossOpeningHpRatio, ratioByDifficulty: RULES.enemyTactic.bossOpeningHpRatioByDifficulty },
        then: { kind: 'multiAttack', hits: [6, 6, 6], name: '近習の槍' },
        else: { kind: 'special', amount: 32, name: '将軍の威' },
      },
      { kind: 'attack', amount: 14 },
      { kind: 'charge', label: '⚠ 追い込まねば次は穢土の裁き' },
      {
        kind: 'tactic',
        cond: { type: 'enemyHpRatioAtMost', ratio: RULES.enemyTactic.bossFinalHpRatio, ratioByDifficulty: RULES.enemyTactic.bossFinalHpRatioByDifficulty },
        then: { kind: 'attack', amount: 12 },
        else: { kind: 'special', amount: 36, name: '穢土の裁き' },
      },
    ],
  },
]

/** 全敵（既存 7 体＋Threat Pilot＋将軍家）。`getEnemyDef` の走査はこちら。Enemy Select は CORE＋将軍家（＋`?pilot=threat` 時だけ Threat Pilot）。seed 選出・Daily・攻略盤・gameVersion は CORE のみ */
export const ENEMIES: EnemyDef[] = [...CORE_ENEMIES, ...PILOT_ENEMIES, ...SHOGUNATE_ENEMIES]

/** 将軍家の敵か（EnemyPanel の軍略表示分岐と Enemy Select の「攻略盤の対象外」注記に使う。決定287 W1 で通常導線へ公開＝記録ガード（`isPilotEnemyId`）の対象外） */
export function isShogunateEnemyId(id: EnemyId | null | undefined): boolean {
  return id !== null && id !== undefined && SHOGUNATE_ENEMIES.some((e) => e.id === id)
}

/** Pilot 敵か（戦績・セーブ・報酬・攻略盤に残さない判定に使う）。Threat Pilot（enemy_09）だけに真。
 * 決定287 W1：忠次（enemy_08）は通常の敵になったため偽＝戦績・セーブ・報酬・神階・絆・同じ盤面 Retry を既存 7 体と同じに扱う */
export function isPilotEnemyId(id: EnemyId | null | undefined): boolean {
  return id !== null && id !== undefined && PILOT_ENEMIES.some((e) => e.id === id)
}

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
  // Threat Branch Pilot v1：既存 7 体の配列だけを参照する（Pilot 敵を足しても既存 seed の敵は変わらない）
  return CORE_ENEMIES[hash % CORE_ENEMIES.length].id
}
