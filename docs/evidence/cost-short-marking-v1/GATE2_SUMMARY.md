# Cost-Short Marking v1 — Gate 2 段目（ブラウザ probe）まとめ（2026-10-30・Lane 3 QA）

対象：worktree `SevenGodsGame-csm1`（branch `feat/cost-short-marking-v1`・実装 `ce8d293`・証跡 1 段目 `d044617`）。
Before＝Production v1.0.5 の `SevenGodsGame-v105rc/dist`（`index-S5PX1Ko7.js`）／After＝csm1 `dist`（`index-0HgrFnqq.js`、再ビルドなし）。
Playwright chromium・headless・1 browser 直列（6GB 機）。preview は自分で起動（Phase A：Before `:4301`／After `:4302`＝d264 系 script の既定、Phase B：Before `:4302`／After `:4303`＝d266 系 `lib.mjs` の既定）。script・`lib.mjs` は無修正。

## 結果表

| # | Gate | 実行 | 結果 | 主要数値 | 証跡 |
|---|---|---|---|---|---|
| 1-1 | measure-hand（手札 5/7/9/10 の箱 Before/After） | pc660／pc800／sp844／sp660 × Before／After（大耀 × 蒼海の龍神・seed d266-hand） | **PASS** | 16 行すべて `.battle-main`／`.battle-dock`／`.hand`／各 `.card-view` の rect ハッシュ一致・最大差 **0 px**・当たり 5/5〜10/10・文字切れ 0・横スク 0・click 反応 4/4・console 0 | `05-measure-hand/HAND_COMPARE.md`・`runs/*.json` |
| 1-2 | polish-probe `side=after`（名前／コスト珠の被覆・hover／focus） | pc1024／1280／1508 × 660／800 高 | **PASS** | 24 行：name/cost/center hit 100%・hover 全面 10/10・focus-visible 全面 10/10・lift 11.3px・click 6/6・console 0。HEAD 版（決定266 polish After）と step／overlap／nameBox／card x,w が全行同値 | `06-polish/POLISH_COMPARE.md`・`runs/after-*.json` |
| 1-3 | hover-probe（pc900・手札 10） | After | **PASS** | idx0／idx4 とも rightEdgeHitsSelf=true・z=3・HEAD 版（d266）と完全一致・console 0 | `07-hover/hover-probe-after.json` |
| 1-4 | gate249（反応言語 timeline・入力ロック・HUD 箱） | pc／sp × 大耀-龍神／寿楽-道化 × Before／After（＋pc reduced） | **PASS** | After 30 行すべて Before との箱差 `pair=0`・play 列／anim／intent 判定が Before/After 一致・lock 中央値 Before 311.7 ms／After 322.8 ms（reduced 364.1）・console 0/10 run | `08-gate249-252/gate249/summary.tsv`・`gate.json` |
| 1-5 | gate250（God Strike 入力ロック・engine 結果） | noshot 4 ケース（pc／sp × Before／After） | **PASS** | play 列 11 手・HUD 後状態・結果画面（敗北／敵 HP 120/1,030・score 2,190）が Before/After **完全一致**・burst R5 一致・unlock pc 1320→1311 ms／sp 1047→1264 ms（JS timer lag の揺れ・engine 同一）・console 0 | `08-gate249-252/gate250/summary-noshot.tsv` |
| 1-6 | gate252（敵必殺 cutin timing・入力ロック） | runs=3 × pc／sp × Before／After（大耀 × 鬼将・seed d257-qa1） | **PASS** | 12 run すべて engine state 一致 `{round:5,hp:7,enemyHp:71,score:67.6}`・R4 intent「業斧・断岩 260」一致・cutin 継続（cutin−−cutin+）Before 1,459〜1,659／After 1,455〜1,459 ms・unlock＝cutin−・console 0 | `08-gate249-252/gate252-csm1.json`・`.log.txt` |
| 2 | 60 札 × SP 3 幅＋PC 2 幅のはみ出し／交差／font／コントラスト／敵ターン 0 個（新規 probe・After のみ） | 28 battle・283 状態・帯 **556 個**（下記） | **PASS** | はみ出し **0/556**（最大 0 px）・`.card-view-god` 交差 0・`.card-view-name` 交差 0・font 10px（全件）・実効コントラスト最小 **5.25:1**（黒背景合成／白背景でも 5.10）・敵ターン中（end-round disabled の 2,035 サンプル）帯 **0 個**・lock 直後の帯 0 | `09-overflow-contrast/summary.json`・`cheap-artwin/summary.json`・`COVERAGE_MERGED.json`・`shots/*.webp` |
| 3 | a11y minimum pack | pc／sp／sp375 × After `:4302` | **ALL PASS** | 23 項目 × 3 VP＝69/69・JS error 0 | `10-a11y/acceptance-after.json` |

## Gate 2 の計測条件

- viewport：sp360（360×640）／sp375（375×667）／sp390（390×844）＝isMobile・hasTouch・dSF 2、pc660（1508×660）／pc800（1280×800）
- 本走：sp375 × 7 神 × seed `csm1-a`,`csm1-b`（14 battle）＋ sp360／sp390／pc660／pc800 × 大耀・恵比寿（8 battle）。各ラウンドで「出せる札の高コストから全部出す」（AP→0）＝cost≥1 の札がすべて short になる状態を R1〜R4 で計測（手札 5→10）。敵 ryujin
- 追試（`cheap-artwin/`）：大耀 × 5 VP（6 battle）を「低コストから 1 枚ずつ・各 play 後に計測・settle 1,200 ms」で走らせ、Art Window 札（豪快な一撃 cost 2）が「あと1」になる中間状態を作った
- コントラスト式：`src/components/a11y/contrast.ts` と同じ `composite`／`contrastRatio`。帯の `color`（#fff）と `background`（#05060d）に札の `filter: grayscale(.35) brightness(.72)` と `opacity .7` を掛け、背景（`.hand`〜`html` の ancestor に不透明 backgroundColor なし＝`.battle-viewport` は画像）に合成。黒／白の両背景で算出し、低い方でも 5.10:1
- 敵ターン：`ラウンドを終える` click 直後から 3 秒 rAF サンプリング。end-round が disabled の全サンプルで `.card-view-short-tag` の個数の最大値を取る（＝0）。lock 到達は click 後 10〜14 ms、その時点で帯 0

## 網羅した札（short 帯を実測した 45 種）

からかい半分・アンコール・一喝・一心不乱・一撃・一攫千金・不動の構え・不屈の一歩・予言・共振・冒険者の勘・剛撃・反撃の刃・受け流し・呪縛・喝采・大漁・姉御の号令・守護・小さな託宣・巫女の舞・幸運の女神・後輩想い・息吹・恵比寿顔・悪戯・懐の深さ・気まぐれ・浄めの光・潮招き・独奏・癒し・神楽舞・神託・神速・福授け・笑って許す・見切り・誓いの盾・豪快な一撃（Art Window）・速攻・連撃・鉄壁の構え・長生きの知恵・魅惑の舞

- 手札に出たが short にならなかった 2 種：大喝・渾身の一撃（高コストで最初に出されるため。追試は大耀のみ）
- 手札に出なかった 13 種：おおらかな一打・乱舞・大治癒・威嚇・守りの陣・息継ぎ・捨身の一撃・神力の泉・福袋・秘技・満ちる・見通し・金縛り・闘志（4 ラウンドで引けるのは最大 11〜14 枚のため。帯は札種に依存しない同一 CSS なので、幾何は網羅分で代表できる）
- Art Window 札（豪快な一撃）：13 状態 × 5 VP。帯は `top:24px; left:0`（card.y+26／x+2）に出て、右上の「大耀専用」小札（y+5〜+19）との縦間隔 7 px・交差 0・名前との間隔 30〜50 px・はみ出し 0・コントラスト 5.25
- READY（`.card-view-ready`）＋ short の同時成立：556 件中 **0 件**（共鳴 READY は攻撃後に立ち、その時点で札は出せないか AP 0 のため同時観測されず）。z 順の実測は未達（下記）

## 発見事項（修正はしていない・PM 判断）

1. **姉御の号令（2 行名・大耀専用）で帯と名前帯の間隔が 6 px、`.card-view-body` の箱が帯の下 10 px に z 順で重なる**（SP 3 幅・pc は 18.9 px 以上）。`.card-view-body` は `battle.css:2576` `.card-view > *:not(.card-view-clip){position:relative;z-index:1}` で帯と同じ z-index 1・DOM 後方のため帯の上に描かれる。body の背景は `linear-gradient(transparent 0%, #05060da8 35%, …)` で、重なる上端 0〜6.6% の alpha は ≈0〜0.12 ＝ 帯の下端がわずかに暗くなるだけで、名前テキストとの交差は 0。気になるなら `cardShort.css` の帯に `z-index: 2` を足すだけで解消（他 44 種は body 上端が帯より 15 px 以上下）
2. **配札アニメ中の一時的な低コントラスト**：pc660 R3（手札 9）で settle 350 ms 計測時に 2 札（神楽舞・速攻）の `opacity` が 0.4 → 帯コントラスト 2.32:1。`battle.css:7142` `@keyframes rl-deal-fade { from { opacity: .4 } }` ＋ `.card-view-dealt{ animation-delay: var(--rl-deal-delay); animation-fill-mode: backwards }`（配札待ちの間 from 値が適用）が原因で、settle 1,200 ms の追試（pc660／pc800 各 26 帯）では再現せず全件 5.25。既存の配札演出そのもので CSM1 の回帰ではないが、「引いた直後 ≤0.5 秒は帯が薄い」ことは記録しておく
3. SP390 で手札 4 枚目（x 342〜442）の帯中心（x≈386）が `.hand` の可視域外（横スクロール）にあり、`elementFromPoint` が舞台を返す＝被覆ではなく clip（他 VP でも同様の位置関係）。非問題
4. 本走での `notTopmost` 計上 9 件はすべて 1. の透明 body（追試の集計で透明 body は info 扱いに改めた）

## 未達と理由

- 60 種完全網羅は未達（47/60 を手札で観測、45/60 で帯を実測）。理由は上記。残り 13 種は同一 CSS・同一札寸法のため幾何リスクは低い（帯の位置は名前の長さに依存せず、名前側は 2 行名の最悪例＝姉御の号令を実測済み）
- READY＋short の z 順は同時成立が観測されず未実測。静的には `.card-view-ready-frame`（z-index 0・`battle.css:6389`）＜ 帯（z-index 1）
- gate250 は noshot 4 ケースのみ（screenshot 系 10 ケースは timeline／engine 比較に不要・PNG 1MB 級のため省略）
- Before 側の polish-probe は未実行（HEAD 版 d266 polish After の JSON と静的比較で代替・全行同値）

## 運用メモ

- 途中、低メモリ保護でバックグラウンドの measure-hand と preview 起動 shell が停止された（preview プロセス自体は生存）。stale `browser.lock`（自分の pid）を除去し、以後の probe はフォアグラウンド・1 本ずつで完走
- 200KB 超の PNG（gate249 の after スクリーンショット）と jpg（measure-hand／polish／hover の撮影）は untracked のまま残置、commit は txt／json／md／tsv と webp 3 枚のみ
- 自分が起動した preview（4301／4302／4303）は終了時にすべて停止（LISTEN 0 確認）
