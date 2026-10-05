# 決定266 Battle Viewport Stability Hotfix

- 日付：2026-10-04
- branch：`feat/d266-battle-viewport-stability`（`0b6c332`＝決定264 Duel HUD v3 の上に積む）
- 判断主体：Hotfix を Production Release 前に別 Decision として実施すること＝**AI 判断**（決定264 は CEO Human QA 4/4 PASS で目的達成、所感「カードが増えると戦闘画面が小さくなる」を分離）。Root Cause の特定・修正方式・AC 判定＝**AI 判断**（CLAUDE.md §6-2：軽微な UI 調整・レスポンシブ対応・バグ修正）。Production 公開・master merge は CEO 判断（本 Decision では行わない）
- 状態：**PRODUCTION LIVE / CLOSED（2026-10-05・決定264 と一括・deployment 6859334890・rollback 6823201527・Production Smoke PASS）**（Polish 込み・§9・§10）
- runtime commit：`9c6596a`（Hotfix 本体）＋`a19166a`（Polish・§9）（Before 比較＝`:4302` 決定264 `0b6c332`／After＝`:4303`／Production 同一＝`:4301`）
- 変更：`battle.css` 末尾に 1 ブロック（+27 行・PC ≥900px のみ）＋`BattleScreen.tsx` 1 行（手札 div に `data-hand-count` と `--hand-n`）＋`battleViewportLayout.test.ts`（+15 行・構造回帰）。`src/core`・`rules.ts`・カード・Intent・7R・AP・seed・timing 定数 変更 0。**Polish（`a19166a`）**：同ブロック内 +27/−8 行（`--hand-step`・`.card-view-name` max-width・focus-visible 持ち上げ）＋`battleViewportLayout.test.ts` +8/−1 行。JS 差分 0

## 1. 背景

CEO Human QA（2026-10-04）で決定264 の 4 問（①敵と神の大きさ ②枠と戦場の一体感 ③敵 HP 左／神 HP 右 ④共鳴ゲージ）はすべて PASS。同時に新しい問題「**カードが増えると戦闘画面が小さくなる**」が報告された。CEO の添付スクリーンショットは親セッションに届いていないため、evidence は Playwright 実測を主とし、`docs/evidence/decision266/ceo-screenshot/` を空で用意した（後から置ける）。

## 2. Root Cause（実物コード）

| # | 場所（`src/components/battle/battle.css`・決定266 適用前の行番号） | 内容 |
|---|---|---|
| R1 | L4948–4953 `body.battle-viewport #root { height: 100vh; height: 100dvh; overflow: hidden }` | 戦闘中は 1 画面固定。縦の総量はビューポート高で一定 |
| R2 | L4986–4999 `body.battle-viewport .battle { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; areas: topbar / arena / dock }` | **アリーナ（`.battle-main`）は 1fr＝残り**。ドック行は `auto`＝中身の高さ |
| R3 | L2437–2442 `.hand { display: flex; flex-wrap: wrap; … }` と L4888–4897 `.battle-dock-row .hand { flex: 1 1 auto; overflow: visible }`（コメント「枚数が増えたときは従来どおり折り返す（ドックが高くなった分はアリーナ＝1fr が吸収する）」） | **PC の手札は折り返す設計だった**。横幅に入りきらない枚数で 2 行目ができ、ドックが 1 段（カード 164px＋gap 8px＝**172px**）高くなる |
| R4 | L7591–7607（決定264）`.battle-main { grid-template-rows: auto minmax(0, 1fr) }`・立ち絵は舞台の高さに contain | 1fr が 172px 減ると、舞台→立ち絵の高さがそのまま縮む（敵 ink 245→97px） |
| R5 | L5594–5605 `@media (max-width: 899px) … .battle-dock-row .hand { flex-wrap: nowrap; overflow-x: auto }` | **SP（<900px）は既に横 1 列＋横スクロール**＝ドック高は枚数に依存しない（実測でも不変） |

- transform／scale による縮小は無い（縮みは grid の 1fr 配分だけ）。
- 折り返しが始まる枚数は横幅で決まる：PC 1508・1280 幅＝**10 枚目**、1024 幅＝**8 枚目**（R3＝9 枚の時点で縮小済み）、900 幅＝**6 枚目**（R2＝7 枚の時点で縮小済み）。1 枚あたり 116px＋gap 8px、手札の内幅は 1508／1280 で 1,118px・1024 で 890px・900 で 766px。
- 手札枚数は R1 初期 5 枚・ラウンド終了ごとに +2・上限 10（`RULES.deck`）。カードを温存するほど縮む＝「溜めて大技」の局面で戦場が潰れる。

## 3. 修正（設計原則「戦場サイズを固定し、カード増加は手札エリアだけで吸収する」）

比較した案（AI 判断）：

| 案 | 内容 | 判定 |
|---|---|---|
| A | アリーナの grid row を固定高にする | ✕ ドックが伸びると画面からはみ出す（overflow hidden で手札が切れる）。根は手札の折り返し |
| B | PC も SP と同じ横スクロール | △ マウスで横スクロールは発見しにくい（PC にスクロールバー無し）。10 枚目が見えない |
| C | カード幅を枚数で縮める | △ 本文の折り返しが増え、決定238 の下端はみ出し（140px 札）を再発させるリスク |
| **D（採用）** | **PC も 1 行（nowrap）に固定し、入りきらない分だけカードを少し重ねる** | ◎ ドック高は枚数に依存しない。1508／1280 幅の 10 枚で重なりは **4.7px**（カードの内側 padding 7px 未満＝文字は隠れない）。カード中心は常に自分自身＝クリック可 |

実装（`battle.css` 末尾・`@media (min-width: 900px)`）：

```css
body.battle-viewport .battle-dock-row .hand { flex-wrap: nowrap; }
body.battle-viewport .battle-dock-row .hand > .card-view + .card-view {
  margin-left: clamp(-56px, calc((100% - var(--hand-n, 1) * 116px - (var(--hand-n, 1) - 1) * 8px) / max(var(--hand-n, 1) - 1, 1)), 0px);
}
body.battle-viewport .battle-dock-row .hand > .card-view:hover,
body.battle-viewport .battle-dock-row .hand > .card-view:focus-visible { z-index: 3; }
```

- margin の `%` は flex container（手札）の内幅基準。入りきるときは 0（従来どおり gap 8px・中央寄せ）、入りきらないときだけ負になる。下限 −56px は「カード中心（58px）が隣に覆われない」値。
- 重なったカードは hover／focus で隣より前に出る（使用中 `.card-view-playing` の z-index 4 より下）。900 幅・10 枚（最大の重なり 43.8px）で hover したカードの右端 −12px が自分自身に当たることを確認（`docs/evidence/decision266/hover/`）。
- `BattleScreen.tsx` L608：`<div className="hand" data-hand-count={state.hand.length} style={{ ['--hand-n' as string]: state.hand.length }}>`（表示専用・既存の `--stage-accent` と同じ書き方）。
- SP（<900px）は R5 のとおり既に安定しているため **変更しない**。
- JS bundle 差分は上の属性 2 つだけ（`docs/evidence/decision266/js-diff.txt`：added `"data-hand-count":o.hand.length,style:{"--hand-n":o.hand.length},`）。

## 4. Before／After 数表（大耀 × 蒼海の龍神・seed `d266-hand`・カードを出さずにラウンドを終えて手札を増やす）

Before＝`:4302`（決定264 `0b6c332`）／After＝`:4303`（決定266）。全データ `docs/evidence/decision266/hand/HAND_SUMMARY.md`・`runs/*.json`。

### PC 1508×660

| 手札 | Arena 高 Before→After | 敵 ink 高 | 神 ink 高 | 敵 HP 幅 | 神 HP 幅 | intent 高（font） | 共鳴 幅 |
|---|---|---|---|---|---|---|---|
| 5 | 326.5 → 326.5 | 244.6 → 244.8 | 241.7 → 241.8 | 307 → 307 | 219 → 219 | 25（20px）→ 25（20px） | 217 → 217 |
| 7 | 326.5 → 326.5 | 245.3 → 245.4 | 242.5 → 242.6 | 307 → 307 | 219 → 219 | 25 → 25 | 217 → 217 |
| 9 | 326.5 → 326.5 | 245.4 → 245.4 | 242.3 → 242.6 | 307 → 307 | 219 → 219 | 25 → 25 | 217 → 217 |
| **10** | **154.5 → 326.5** | **97.0 → 244.8** | **105.8 → 242.0** | 307 → 307 | 219 → 219 | 25 → 25 | 217 → 217 |

### SP 390×844

| 手札 | Arena 高 Before→After | 敵 ink 高 | 神 ink 高 | 敵 HP 幅 | 神 HP 幅 | intent 高（font） | 共鳴 幅 |
|---|---|---|---|---|---|---|---|
| 5 | 477.5 → 477.5 | 174.2 → 174.4 | 172.5 → 172.8 | 154.5 → 154.5 | 同値 | 21.3（17px）→ 21.3（17px） | 133.5 → 133.5 |
| 7 | 477.5 → 477.5 | 174.7 → 174.7 | 173.1 → 173.1 | 154.5 → 154.5 | 同値 | 21.3 → 21.3 | 133.5 → 133.5 |
| 9 | 477.5 → 477.5 | 174.7 → 174.7 | 173.1 → 173.1 | 154.5 → 154.5 | 同値 | 21.3 → 21.3 | 133.5 → 133.5 |
| 10 | 477.5 → 477.5 | 174.7 → 174.6 | 173.1 → 173.0 | 154.5 → 154.5 | 同値 | 21.3 → 21.3 | 133.5 → 133.5 |

### 手札 5→10 の変動幅（max−min）

| VP | Arena Before／After | 敵 ink 高 Before／After | 神 ink 高 Before／After |
|---|---|---|---|
| PC 1508×660 | **172** ／ 0 | **148.4** ／ 0.6 | **136.7** ／ 0.8 |
| PC 1280×800 | **172** ／ 0 | **138.6** ／ 0.8 | **124.6** ／ 0.8 |
| PC 1024×660（参考） | **172**（9 枚から）／ 0 | 148.4 ／ 0.2 | 136.9 ／ 0.1 |
| PC 900×660（参考） | **172**（7 枚から）／ 0 | 138.4 ／ 0.1 | 114.5 ／ 1.5 |
| SP 390×844 | 0 ／ 0 | 0.5 ／ 0.3 | 0.6 ／ 0.3 |
| SP 390×660 | 0 ／ 0 | 0.3 ／ 0.4 | 0.3 ／ 0.3 |

ink の 0.1〜1.5px の揺れは立ち絵の待機（呼吸）アニメーションの測定時刻差（Before の SP でも同程度）。

スクリーンショット：`docs/evidence/decision266/hand/shots/{before,after}-{pc660,pc800,pc900,pc1024,sp844,sp660}-hand{5,7,9,10}.jpg`（PC 660／SP 844 × 5／7／10 枚を含む）。

## 5. Acceptance Criteria（After・PC 1508×660／1280×800・SP 390×844／390×660）

| AC | 内容 | 結果 | 数値・evidence |
|---|---|---|---|
| AC1 | 手札 5／7／9／10 枚で Arena 高の差 ≤4px | **PASS** | 変動幅 After 0px（4 VP とも）。Before は PC 660／800 で 172px。参考 PC 900／1024 も After 0px |
| AC2 | 敵／神 ink bbox（決定229 方式・alpha>32）の高さ・幅の差 ≤2px | **PASS** | After 最大 0.9px（PC 660 の神 ink 幅）。Before は PC 660 で敵 ink 高 148.4px 縮小 |
| AC3 | 敵 HP／神 HP バーの幅・高さ・位置が不変 | **PASS** | x／y／w／h の変動 0px（PC 660：敵 307×18・神 219×18） |
| AC4 | `.intent` の高さ・フォントサイズ不変（決定240 A1） | **PASS** | PC 25px／20px・SP 21.3px／17px、変動 0 |
| AC5 | 共鳴ゲージの幅・高さ不変 | **PASS** | 変動 0（PC 660 217×12・SP 133.5） |
| AC6 | 全カードが操作可能 | **PASS** | 各カード中心の `elementFromPoint` が自分自身：全 VP・全枚数で n/n（SP は scrollIntoView 後）。10 枚で「出せる」カードを Playwright のマウスで実 click → 手札 10→9（全 VP）。重なり最大の PC 900・10 枚で hover したカードが z-index 3・右端も自分に当たる（`hover/hover-probe.json`） |
| AC7 | PC 1508×660／1280×800・SP 390×844／390×660 で横スクロール 0・文字切れ 0・console error 0 | **PASS** | 全 step で横スクロール 0・clipped 0・console error 0（`hand/HAND_SUMMARY.md`） |
| AC8 | 決定264 回帰（gate-layout／gate-hud を After で再実行し 決定264 After と比較） | **PASS** | gate-layout 52 runs：舞台・名札・HP・共鳴・intent・OTOMO・dock の**レイアウト箱が 52/52 完全一致**、環 none・名札 scrim・artScale・列定義 同値、着弾 13/13×4・重なり 0・T5 箱差 0。gate-hud 12 runs：pseudo（環／角金具／接地影／scrim）・HP 箱・intent 箱・コントラスト 12/12 同値（`d264-regression/COMPARE_D264.md`）。※初回の比較は ink 面積差 ≤0.1pt を条件にして 9 件が FAIL 表示（最大 0.21pt）。原因は立ち絵の待機アニメの測定時刻差（CSS を一切変えていない SP でも同程度・レイアウト箱は全件一致）と判定し、主判定をレイアウト箱の完全一致＋面積差 ≤0.25pt に改めた（AI 判断・基準変更を記録） |
| AC9 | tsc 0／oxlint 0／vitest 全件 PASS・`src/core` 差分 0・JS 差分は属性のみ | **PASS** | tsc exit 0（`tsc.txt`）・oxlint src＋d266 scripts 0 件（`oxlint-src.txt`。リポジトリ全体の warning 10 件は既存の旧 scripts のみ）・vitest 1,311 PASS／0 FAIL（新規 2 件含む・`vitest.txt`）・`src/core` 差分 0（`diff-stat.txt`）・JS 差分＝`"data-hand-count":o.hand.length,style:{"--hand-n":o.hand.length},` のみ（`js-diff.txt`） |

- G10（入力ロック timing）は再計測しない：変更は PC の手札の折り返し（flex-wrap）とカード間 margin だけで、timing 定数・animation・JS のロジックに触れていない。手札 5 枚の初期状態ではレイアウトが決定264 と完全一致（AC8）し、入口の操作開放時刻も gate-layout C 表で決定264 After と同等（PC 660 平均 2,773ms）。

## 6. 既知のトレードオフ

- PC 1024 幅以下・手札 9〜10 枚では重なりが 19〜44px になり、各カードの右端（効果文の行末）が隣のカードの下に入る。カード名・コスト・中心は常に見え、hover／focus で前に出る。1508／1280 幅の 10 枚は 4.7px（padding 内）で文字は隠れない。 → **Polish（§9）で名前は全枚数で読める**（1024 幅 9 枚 2/9→9/9・10 枚 3/10→10/10）。重なり量そのもの（19〜30px）は維持。
- SP は変更なし（従来どおり横スクロール）。

## 7. Rollback

runtime commit（`battle.css` ブロック＋`BattleScreen.tsx` 1 行＋test）を `git revert a19166a 9c6596a` で 2 commit 戻す（Polish だけ戻すなら `git revert a19166a`）。決定264 の状態（`0b6c332`）に戻るだけで、データ・セーブ・engine に影響なし。

## 8. Human QA 手順（4 問・2026-10-05 CEO 指定の設問に更新。:4303 は Polish 後 `a19166a` の build）

URL（PC）：`http://127.0.0.1:4303/?seed=d266-hand&enemy=ryujin`（大耀を選ぶ）／LAN（SP 実機）：`http://192.168.11.6:4303/?seed=d266-hand&enemy=ryujin`。比較用：決定264 のみ `:4302`・Production 同一 `:4301`。
手札を増やす方法：カードを出さずに「ラウンドを終える」を 3 回（R4 で手札 10 枚）。

1. 手札 10 枚でも敵・神・戦場が小さくならないか（Yes／No）
2. 10 枚すべての名前・コストが読めるか（Yes／No）
3. hover／focus したカードの本文を完全に読めるか（Yes／No）
4. カードの重なり方にプレイ上の違和感がないか（Yes／No）

## 9. Polish — PC 多枚数手札の視認性（Human QA 準備のフォローアップ・2026-10-04 実測／2026-10-05 commit）

- 判断主体：Polish の実施・方式・AC 判定＝**AI 判断**（CLAUDE.md §6-2：軽微な UI 調整）。Hotfix 本体（§3）の設計原則は変えない。
- 動機：§6 のトレードオフ「PC 1024 幅以下・9〜10 枚で名前が隣の下に入る」を実測すると、名前が自分のカード上で読める枚数は **1024 幅 9 枚で 2/9・10 枚で 3/10** だった。Human QA Q2「名前とコストが読めるか」に直結するため、Hotfix 本体と同じ `battle.css` ブロック内で解消する。
- runtime commit：`a19166a`（`battle.css` +27/−8 行・`battleViewportLayout.test.ts` +8/−1 行）。`src/core`・`rules.ts`・TSX・数値・timing 変更 0。dist JS は 9c6596a と同一（`polish/js-diff.txt`：D264 比で属性 2 つのみ）。
- 証跡＝コードの一致：2026-10-05 に a19166a を再 build → `index-BPym-jW-.css`／`index-Bm2fe2Up.js`＝`polish/build.txt` のハッシュと完全一致。

### 9-1. 変更（`@media (min-width: 900px)` 内）

| # | 内容 | 根拠 |
|---|---|---|
| P1 | `.hand` を `container-type: inline-size` にし、送り幅 `--hand-step = clamp(68px, (100cqw − 116px) ÷ (n−1), 124px)`。カード間 `margin-left = step − 124px` | 従来の `margin-left: clamp(−56px, …, 0)` と同値（重なり 0〜56px・下限 68px＝カード中心 58px は常に露出）。名前幅の計算に「送り幅」を使うため変数化 |
| P2 | 最後の 1 枚以外の `.card-view-name` に `max-width: calc(var(--hand-step) − 12px)` | 名前を「見えている帯」の中に収める。重ならない（step 124px）ときは内幅 102px より広く従来どおり |
| P3 | `.card-view:not(:disabled):focus-visible` に `transform: translateY(−8px) scale(1.04)` | 既存 hover（L2471）と同じ持ち上げ。キーボード操作でも本文が隣に隠れず読める |

### 9-2. 実測（Playwright・大耀 × 蒼海の龍神・seed `d266-hand`・手札 5→7→9→10・`polish/POLISH_SUMMARY.md`）

| VP | 手札 | 送り幅 | 重なり | 名前可視 Before→After | コスト | 中心 | 本文はみ出し |
|---|---|---|---|---|---|---|---|
| PC 1024×660／800 | 9 | 96.8px | 19.3px | **2/9 → 9/9** | 9/9 | 9/9 | 0 |
| PC 1024×660／800 | 10 | 86px | 30px | **3/10 → 10/10** | 10/10 | 10/10 | 0 |
| PC 1280×660／800 | 10 | 111.3px | 4.7px | 10/10 → 10/10 | 10/10 | 10/10 | 0 |
| PC 1508×660／800 | 10 | 111.3px | 4.7px | 10/10 → 10/10 | 10/10 | 10/10 | 0 |

- Arena 高は全 VP・全枚数で不変（660 高：326.5px／800 高：449.5px）＝Hotfix 本体の効果を維持。
- 10 枚・hover／focus（全カード 1 枚ずつ・PC 6 VP）：hover 全面表示 10/10・viewport 内 10/10・持ち上げ 11.3px、**focus 持ち上げ 0 → 11.3px**（P3）、click 反応 10→9、console error 0。
- SP（<900px・390×844／390×660）：Polish 前 After と箱 36/36 一致（立ち絵の箱 最大差 0.8px）・Arena 高不変・click PASS・console 0＝変更なし。
- 決定264 回帰（`polish/d264-regression/COMPARE_D264.md`）：gate-layout 52 runs のレイアウト箱 **52/52 完全一致**・FAIL 0、gate-hud 同値。
- AC 判定（After・PC 6 VP）：AC1 arena／AC2 select／AC3 nameCost／AC4 hoverFocusFull／AC5 inViewport／noClipNoScrollNoError／AC7 sp すべて **PASS**。
- 品質 Gate（2026-10-05 再実行）：tsc 0・対象 test 2 ファイル 20/20 PASS（`battleViewportLayout.test.ts`・`duelHud.test.ts`）。full vitest は同日朝に WIP 込みで 1,312 PASS を確認済みのため再実行せず（CEO 指示）。
- 記録上の注意：`polish/polish-probe.log.txt` 末尾の `07:24:42 FAIL after-pc1024x660 TimeoutError: page.screenshot` は 10/05 の再実行で起きたスクリーンショットの 30 秒タイムアウト（低メモリ環境要因）。評価用 JSON／画像（10/04 21:24 まで）は上書きされていない。

## 10. CEO Human QA 結果（2026-10-05）— 4/4 PASS

対象：`:4303`（Polish 後 `a19166a` の build・`index-BPym-jW-.css`）・`?seed=d266-hand&enemy=ryujin`・大耀・ラウンドを終える ×3 → R4 手札 10 枚。判定は **CEO**。

| # | 設問 | 結果 |
|---|---|---|
| 1 | 手札 10 枚でも敵・神・戦場が小さくならないか | **PASS**（敵・神・戦場サイズに問題なし） |
| 2 | 10 枚すべての名前・コストが読めるか | **PASS**（全 10 枚可読） |
| 3 | hover／focus したカードの本文を完全に読めるか | **PASS**（本文まで可読） |
| 4 | カードの重なり方にプレイ上の違和感がないか | **PASS**（違和感なし） |

→ 決定266 は **HUMAN QA PASS**。決定264（CEO Human QA 4/4 PASS・2026-10-04）と**一括で Release Gate** へ（CEO 指示 2026-10-05）。Release 対象 runtime＝`90093b2`（決定264）・`9c6596a`（決定266 Hotfix）・`a19166a`（決定266 Polish）。決定265（動画 docs）・決定267／263（未実装）は対象外。
