# Battle Composition v3 — Duel HUD / Character Integration Preflight（Lane B）

- 日付：2026-10-03・【Designer】＋【PM】
- 種別：**DOCS-ONLY Preflight**（runtime／CSS／TSX／画像／simulation／Production 変更 0。ブラウザ・build・vitest・tsc の起動 0）
- 判断主体：監査・比較・SPEC・GO 判定は **AI 判断**（CLAUDE.md §6-2）。Pilot 実装 GO と §9 の 1 件は CEO
- 対象 runtime：Production `8cba184`（決定261 対峙構図 v2 LIVE）。本書は K34「Battle Composition v3 — Character Integration / Duel HUD」の Preflight
- 入力：CEO 実機 QA 所感 5 項目（`docs/evidence/final-practical-qa-v2/session-3.md` §1・`visual-qa-frames-2026-10-03.md`）【CEO】
- Lane A「開幕の手札読み」とは完全に別。本書は手札・カード・Intent 文言に触れない

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| Verdict | **GO WITH MODIFICATIONS**（CEO 優先構造の 4 点を修正して 1 案に絞る。§6） |
| 推奨 Narrow Pilot（1 案） | **Duel HUD v3「2 柱 HUD＋神側チャージ」**＝ A) アリーナ上段を **2 列（敵｜神）** にし共鳴の第 3 列を廃止 → 敵 HP は左・神 HP は右・現在の **2.0〜2.2 倍** の横ゲージ／B) 共鳴は **神の名札の直下に横型チャージ（7 分割）** として従属表示（HP 18px に対し 12px・「あと N」「得意技」「OTOMO」は同じ縦列）／C) 敵・神・OTOMO の **回転オーラ環 3 つを撤去**、名札の **漆黒の札＋金の角金具を縁無しの陰（scrim）へ**、足元に **接地影** を追加／D) 敵 7 体の **`--artScale` 正規化**（決定261 Gate の ink 面積から算出・敵のみ・1.00〜1.17）。**CSS 1 ブロック＋TSX 1 行**（`data-enemy` 属性）。SP 390 も同じ 2 列 |
| なぜこの 1 案か | CEO 5 項目の根本原因が **決定261 P-1 の副作用（名札列 162／118px → HP 146／102px に短縮・共鳴ゲージ 278px の方が長い逆転）** と **第 3 列＝共鳴の札** と **オーラ環 3 つ（324／270／130px の円）** に集約されるため（§2）。共鳴を topbar／ドックへ移す案は TSX 移設＋決定254 T5 の topbar 再基準化＋SP では収まらない（§4）。名札を立ち絵の上へ戻す案は PC 1508×660 で立ち絵が **−23%**（決定261 の成果を失う）（§3） |
| 修正点（CEO 優先構造との差） | ① 共鳴は「別位置」ではなく **神側に従属**（第 3 パネルにしない要件は満たす）② 名札は完全撤去ではなく **縁無し scrim**（可読性の島）③ PC の名札は立ち絵の **横**（P-1 維持）で長くする ④ `--artScale` は **敵のみ**（神は据え置き） |
| 保留（本 Pilot に入れない） | 得意技バッジの TSX 移設（PlayerPanel へ）／共鳴の topbar 版（TSX）／アリーナ枠 `.battle-main` の角丸 20px・vignette／神側 `--artScale`／吹き出し／Voice（K35） |
| 再基準化が必要なロック | 決定254 T5（名札の箱＝設計上の変更。**同一 build 内の差 0** は維持）・決定240 A1（`.intent` 高さ ±0 は維持、名札幅は設計変更）・決定228（SP 3 列 → 2 列）・決定230（共鳴札の幅 73→≈154px）・決定235（名札の材質のみ部分的に覆す。ゲージ材質は不変）。決定229／247／249／250／252／241 は **不変**（§6-5） |
| CEO 判断 | §9 の 1 件（Pilot GO＝決定235 の名札材質を覆すことを含む）。承認／拒否のみ |

---

## 1. 現状の監査【コード／CSS】

### 1-1. DOM 構造（上から順）【コード】

```
.battle（grid 3 行：topbar / arena / dock）                         BattleScreen.tsx:391
├ .battle-topbar  ラウンド｜神力＋ap-gauge｜スコア                    :392–423・battle.css:67–116
├ .battle-main（arena・grid 3 列 1.18fr/1fr/0.78fr）                 :442・battle.css:5010–5033
│  ├ .enemy-panel  > .enemy-plate(名・【型】・HP・予告・🛡・バフ) > 吹き出し > .enemy-stage   EnemyPanel.tsx:146–183
│  └ .ally-row（display:contents）                                   battle.css:5035
│     ├ .player-panel > .player-plate(名・台詞・HP・🛡・バフ) > .player-stage        PlayerPanel.tsx:94–157
│     └ .god-otomo-panel > .god-otomo-plate(「共鳴」・得意技バッジ・ゲージ・あと N) > OTOMO > burst-preview   GodOtomoPanel.tsx:166–238
└ .battle-dock  託宣パネル > 手札 + ラウンドを終える／ログ            :591–640
```

### 1-2. 「箱」と「環」の棚卸し（PC 1508×660／SP 390×844・390×660）【CSS・docs】

寸法は決定254 T5（`DECISION254_GAME_ENTRY_PILOT.md` §T5・決定261 前の実測）と決定261 の CSS 式からの机上値（※）。ブラウザ未起動。

| 要素 | 形・材質を作る CSS | PC 1508×660（決定261 後※） | SP 390×844 | SP 390×660 |
|---|---|---|---|---|
| 上部バー `.battle-topbar` | radius 12・blur 10・金ヘアライン `:67–84` | 1240×43（T5） | 378×43 | 378×43 |
| アリーナ枠 `.battle-main` | radius 20・背景減光 `:118–131`・`:3427`・vignette `::after :5089–5099`・arena-glow の色玉 `:144–159` | ≈1220×327 | 378×≈410 | 378×≈250 |
| 敵の名札 `.enemy-plate` | padding 6/8・radius 10 `:4797–4809` → 決定235 で **漆黒の札＋金縁＋角金具 8 片**（`hudPlate.css:18–50`） | **162×≥78**（P-1 名札列 `--comp-plate-min:162px` `:7297`） | 124×76（T5） | 124×76 |
| └ 敵 HP `.hp-bar` | 18px・radius 999→2（`:462`・`hudPlate.css:53`） | **≈146px**（162−16）。決定261 前 440px（`:4806` 幅 100%） | ≈112px | ≈112px |
| 神の名札 `.player-plate` | 同上 | **118×≥78**（383−257−8 `:7311–7315`） | 99×72 | 99×72 |
| └ 神 HP | 同上 | **≈102px**。決定261 前 367px | ≈87px | ≈87px |
| 共鳴の札 `.god-otomo-plate` | 同上・見出し「共鳴」13px＋得意技バッジ（pill 999 `:2676`、SP は 8px 角・2〜3 行 `:6882–6914`）＋ゲージ 16px `:790–797`＋「あと N」12px `:4865` | **294×76**（第 3 列 0.78fr） | 73×94〜140（決定230） | 73×94 |
| └ 共鳴ゲージ | 16px・radius 2・金→橙 fill | **≈278px**＝**神 HP の 2.7 倍・敵 HP の 1.9 倍** | ≈57px | ≈57px |
| 神技プレビュー `.burst-preview` | 10px 2 行＋枠（`:5266–5288`） | 294×≈44（660 高では表示） | 非表示 `:5527` | 非表示 |
| 吹き出し `.enemy-speech-bubble` | radius 12・紫縁・三角 `:1012–1041` | 非表示（≤700 高 `:5396`） | 2 行 33px `:5658–5678` | 非表示 |
| 託宣パネル | radius 10・箱 | 1240×56 | 378×69 | 378×69 |
| **敵のオーラ環** `.enemy-avatar-wrap::before` | **324×324 の円**・conic 紫/赤・blur 3px・14s 回転 `:1063–1094` | 常時 | 常時 | 常時 |
| **神のオーラ環** `.player-avatar-wrap::before` | **270×270 の円**・緑/金・回転 `:1064–1077・1096–1105` | 常時 | 常時 | 常時 |
| **OTOMO の環** `.portrait-otomo::before` | **130×130 の円**（96px 時代の ×1.35 固定。決定261 で絵は 56／40px になり **絵の 2.3〜3.3 倍の円**） `:728–752` | 常時 | 常時 | 常時 |
| 負傷の円 `.enemy-wound` | **260×260 の赤い放射円**（HP ≤50%） `:4651–4665` | 条件 | 条件 | 条件 |
| 立ち絵の箱 `.enemy-avatar`／`.player-avatar` | radius 18・箱色は STAGE-LITE で透明化済み `:3367–3377`。**drop-shadow(0 12px 16px) のみ＝浮いた影・接地影なし**（決定225 W12） | 箱 286／257 | 204／184 | 204／147 |

- **手札より上に見える角丸箱の数**：PC 1508×660＝**7**（上部バー・敵札・神札・共鳴札・神技プレビュー・託宣・アリーナ枠）＋🛡／バフの pill。SP 844＝**7**（上部バー・3 札・吹き出し・託宣・アリーナ枠）。**常時の円＝3**（＋負傷時 1）【CSS 集計】
- 決定261 Production Smoke の画像（`docs/evidence/decision261/production-smoke/prod-pc660-taiyo-oni.jpg`・`prod-sp844-sobi-karakuri.jpg`）で上記の配置を目視確認：PC は敵札（左上・小）→敵→神→神札（小）→共鳴札（右上・最大）＋プレビュー箱、SP は 3 札が並び得意技の神は共鳴札が 3 段【docs】

### 1-3. 相対サイズ（決定261 Fast Gate 実測・`docs/evidence/decision261/pilot/LAYOUT_SUMMARY.md`）【docs】

| viewport | 敵 %（min–max） | 神 % | 神÷敵（面積） | 神÷敵（ink 高） | 最小の敵 |
|---|---|---|---|---|---|
| PC 1508×660 | 4.99（4.01–5.92） | 5.70（5.00–6.34） | **1.14** | 1.01 | 機工師 4.01（神 5.84＝**1.46 倍**） |
| PC 1280×800 | 6.01（4.83–7.13） | 7.82（6.86–8.68） | **1.30** | 1.08 | 機工師 4.83 |
| SP 390×844 | 7.20（5.79–8.55） | 8.79（7.73–） | **1.22** | 1.04 | 機工師 5.79 |
| SP 390×660 | 8.32（6.68–9.87） | 7.16 | 0.86 | 0.88 | — |

- 決定261 は「箱」を神＝敵×0.9（`--comp-god-ratio` `:7254`）で揃えたが、**ink（絵の実面積）は神が 14〜30% 大きい**。原因は敵原画の余白（機工師 trim 0.48・龍神／鬼将／怨霊も余白大、魔獣／道化は余白小）に対し神原画（640²）は余白ほぼ 0（決定229 §14-1・決定261 §4-2）。CEO 所感①「神が敵よりかなり大きい」は **数値どおり**【docs】
- 敵 7 体の PC 660 面積（大耀固定・LAYOUT_SUMMARY §D）：試練 5.39／鬼将 4.94／怨霊 4.70／機工師 **4.01**／魔獣 5.92／龍神 4.86／道化 5.90 → 幅 ±19%

---

## 2. CEO 5 項目 → 原因対応表

| # | CEO の言葉【CEO】 | 原因（要素・CSS）【CSS／docs】 | 候補となる修正 | 触れるロック |
|---|---|---|---|---|
| 1 | 敵と神の相対サイズがアンバランス | 箱比 0.9 は揃っているが ink が敵原画の余白で 14〜30% 小さい（§1-3）。敵ごとに差 ±19% | 敵 7 体の `--artScale`（`.enemy-avatar-wrap` の独立 `scale`・1.00〜1.17）で ink を ≈5.5% に正規化 | 決定229 G3（着弾中心＝箱中央のまま。中心拡大なので不変）・決定247（`.enemy-avatar` の `scale:-1 1` には触れない） |
| 2 | 敵・神の周囲の円形／角丸四角プレートが気になる | 円＝オーラ環 3 つ（324／270／130px・`:1063–1109`・`:728`）＋負傷円 260px。角丸四角＝名札 3 枚（`hudPlate.css:18–50` 漆黒＋金角金具）・神技プレビュー箱・吹き出し | 環 3 つを `display:none`。名札の `background/border/box-shadow/::before` を縁無し scrim に。負傷円は足元の楕円へ縮小 | 決定235（名札材質の部分的な覆し）・決定91（OTOMO 環の追加決定） |
| 3 | 敵 HP・神 HP ゲージが短く感じる | **決定261 P-1 の副作用**：名札を立ち絵の横に置いたため名札列が 162／118px → HP 146／102px（決定261 前 440／367）。共鳴ゲージ 278px の方が長い（`:7297`・`:7306–7315`） | 第 3 列を廃止して 2 列化 → 名札列 ≈306／238px → HP ≈290／222px（§6-2） | 決定254 T5（名札の箱）・決定240 A1（名札幅）・決定228（SP 列幅） |
| 4 | 共鳴パネルの場所を変えたい | 共鳴が **HP と同格の第 3 列**（0.78fr・PC 294px）で画面右上の最大 HUD。得意技バッジも同じ札に同居（`GodOtomoPanel.tsx:171–182`） | 共鳴を神の名札の直下へ従属（12px・7 分割）。得意技は同じ縦列（視覚的に神へ帰属） | 決定230（SP バッジ折返し規則は維持・幅が広がる）・決定128（READY 発光は `.resonance-gauge` のまま）・決定95（5／6 グロー不変） |
| 5 | 上部に箱が多く、戦場に直接立っている感覚が弱い | 箱 7＋pill（§1-2）。立ち絵は drop-shadow のみで接地影なし（決定225 W12）。OTOMO 環が絵の 2.3〜3.3 倍 | 箱 7→4（上部バー・託宣・アリーナ枠・吹き出し SP）。名札→scrim・プレビュー箱→文字のみ。足元に接地影（楕円 radial） | 決定232「末尾の reduce」（新ブロックに reduce を書かない）・決定254（挿入位置） |

---

## 3. 設計案の比較【AI 判断】

| 案 | 内容 | Player Value／可読性（予告・HP・共鳴・得意技） | Combat Tension・階層（決定225／229） | 実装コスト | Regression Risk（ロック） | SP 390 | a11y |
|---|---|---|---|---|---|---|---|
| **A) v3-full** | 名札を立ち絵の**上**に戻し列幅いっぱいの長い HP（PC ≈598／500px）＋共鳴を topbar 中央へ（TSX 移設）＋名札撤去＋接地影 | ◎ 格闘ゲーム型で一目 | △ PC 1508×660 で名札 78px が縦を食い **立ち絵 288→≈221（−23%）**＝決定261 の成果を失う（G1 機工師 3.1%） | TSX（GodOtomoPanel → BattleScreen topbar）＋CSS | 高：決定254 T5 の topbar／dock・決定249 `rl-ap-flash` 同居・`battleViewportLayout.test` 「共鳴は札の中」 | topbar 378px に共鳴は入らない → SP は別構造になる | ○ |
| **B) v3-lite（推奨）** | **2 列化（第 3 列廃止）＋共鳴を神札直下に従属＋環撤去・名札 scrim 化・接地影＋敵 `--artScale`** | ○ HP 2 倍・共鳴は神の「チャージ」として従属・得意技は神の列 | ◎ 立ち絵は維持または微増（PC 286→300・257→270） | **CSS 1 ブロック＋TSX 1 行**（`data-enemy`） | 中：T5／A1／228／230 の再基準化（設計上）。229／247／249／250／252／241 不変 | ◎ 2 列で HP 112→≈159・87→≈142、共鳴 57→≈142 | ○ scrim で文字コントラスト要 Gate |
| C) 共鳴移設のみ | B の共鳴部分だけ | △ 所感 1・2・3・5 が残る | △ | CSS | 低 | ○ | ○ |
| D) 現状維持 | — | ✗ CEO 所感 5 項目が残る（K34 OPEN のまま RC） | — | 0 | 0 | — | — |
| E) 名札を立ち絵の中（頭上に重ねる） | 立ち絵の箱の上端に名札を absolute 重ね | ✗ 原画は頭が箱の上端 0〜10% にあり名札と衝突（決定261 §4-2 G4） | ✗ | CSS | 高（決定229 G4） | ✗ | ✗ |

- **B を採用**。A は Player Value では最良だが PC 660 の縦予算（アリーナ内 307px）で決定261 と両立しない。A の「共鳴 topbar 版」は B の Human QA Q4 が NO の場合の v3.1 候補として保持（§7）
- PC の 2 列化の机上値：`.battle-main` 内幅 1200−gap 10＝1190 → 1.18fr：1fr＝**644／546**（panel 内幅 614／516）。P-1（≤720 高）：敵舞台 `min(614−162−8, 300)`＝**300**（現 286）→ 名札列 **306**・HP **≈290px**。神舞台 300×0.9＝**270**（現 257）→ 名札列 **238**・HP **≈222px**。>720 高（P-2・名札は上）：HP ≈598／500px
- SP 2 列の机上値：内幅 390−12−16−6＝356 → 1.1fr：1fr＝**187／170**（panel 内幅 171／154）→ HP **≈159／≈142px**（現 112／87）。共鳴ゲージ ≈142px（現 57）

---

## 4. 共鳴（Resonance）移設の検討

| 候補位置 | 可否 | 根拠 |
|---|---|---|
| 現状：第 3 列の札（PC 294px・SP 73px） | ✗ | HP と同格の最大 HUD。SP で潰れ、決定230 で 3 段化。CEO 所感④ |
| 敵予告の下（敵札内） | ✗ | 共鳴は神（プレイヤー）の資源。敵側に置くと帰属が逆 |
| 手札ドックの上（託宣の上） | △ | TSX 移設。ドックが ≈30px 高くなり **アリーナが同じだけ縮む**（PC 660 で −10%）。決定254 T5 の dock 箱・`battleViewportLayout.test` 変更 |
| 上部バー中央（ラウンド｜神力｜**共鳴**｜スコア） | △（v3.1） | 縦コスト 0・格闘ゲーム型。ただし TSX 移設・topbar 43px を保つには 10px ゲージ・**SP 378px には入らない**（SP だけ別配置）・T5 topbar 再基準化 |
| 両キャラの足元中央 | ✗ | PC の ink 間 74〜128px・SP 18〜55px（決定261 §4-1）に幅 ≥120px の帯は入らない。足元に置けば決定229 の着弾域と重なる |
| **神の名札の直下（神側の横型チャージ）** | **◎ 採用** | CSS のみ：`.ally-row` が `display:contents`（`:5035`）なので `.god-otomo-panel` は `.battle-main` の grid 子。神列（col 2）の名札側へ `grid-column:2; grid-row:1; justify-self:end; align-self:start; margin-top` で重ね配置、幅＝神の名札列（P-1：`calc(100% − 舞台 − 8px)`。式を `.battle-main` 側へ移して兄弟から参照）。PC >720 高（P-2）は神舞台 ≤306 の右側 ≈190px の空き列へ。SP は col 2・row 2（名札の下）。縦予算：PC 660＝名札 78＋共鳴 60＋OTOMO 56＋余白 ＜ 307 ✓／SP 844 は空き帯 ≈200px ✓／SP 660 は神の頭の上限が 157→≈125〜145 で **据え置き以上**（S-1 lite の神 147 不変） |

- **「あと N で神技発動」**（`GodOtomoPanel.tsx:192–194`・`.burst-preview-head` 12px 金）：ゲージ直下に残す（文言不変）。**BURST READY の発光**（決定128 `.resonance-gauge-ready-flash .resonance-gauge` `:4116–4121`・box-shadow＋scale 1.03）と **5／6 の助走グロー**（決定95 `.resonance-gauge-wrap::after` `:764–788`）はセレクタ・要素とも不変＝生存。7 分割の目盛りは `.resonance-gauge::after` の `repeating-linear-gradient`（fill の `width: ratio*100%` と 1/7 刻みで一致。`overflow:hidden` の内側）で CSS のみ
- **God Passive（得意技バッジ）の分離**：描画は `GodOtomoPanel.tsx:171–182`（`god-passive-badge`・`isGodPassiveArmed` は `BattleScreen.tsx:488` から props）。**データ上は神の属性**（`getGodDef(godId).passive`）で共鳴とは無関係＝TSX で `PlayerPanel`（`godId` を既に持つ）へ移せる（10 行）。ただし `battleViewportLayout.test.ts:112–116` は「共鳴ゲージと `burst-preview-head` が `god-otomo-plate` 内」だけを見るので移設は test 的に可。**本 Pilot では TSX を増やさず、共鳴ブロックを神の列に置くことで視覚的に神へ帰属させる**（CSS のみ）。Human QA で「得意技が共鳴の一部に見える」が出たら v3.1 で TSX 移設【AI 判断】

---

## 5. Character Integration（環・札・接地）

### 5-1. 敵・神・OTOMO の周囲にあるもの【CSS】

| セレクタ | 形 | 機能か装飾か | 処置 |
|---|---|---|---|
| `.enemy-avatar-wrap::before` `:1079–1094` | 324px 円・conic・blur・回転 | **装飾**（CEO 要望「臨場感」時代の演出） | **撤去**（`display:none`。paint 層 −1） |
| `.player-avatar-wrap::before` `:1096–1105` | 270px 円 | 装飾 | **撤去** |
| `.portrait-otomo::before` `:728–752` | 130px 円（絵 40〜56px） | 装飾（決定91） | **撤去** |
| `.enemy-wound` `:4651–4665` | 260px 赤い放射円（HP ≤50／25%） | **機能**（追い詰め） | 残すが **足元の楕円**（幅 70%・高さ 18%・下端）へ。色・段階不変 |
| `.enemy-avatar` 決定240 リム（filter） `:7023–7034` | 輪郭に沿う赤リム・持ち上げ | **機能**（予告の構え） | 不変 |
| `.enemy-avatar-intent-special::after` `:7035–7049` | 足元の赤い環（必殺のみ） | **機能**（決定252） | 不変 |
| `.enemy-avatar-charging*` `:1290・:3397・:3982` | 金の drop-shadow | 機能（溜め） | 不変 |
| 決定249 `rl-*` リム `:7085–7115` | 0.12s の色リム | 機能 | 不変 |
| `.impact-ring*`・`.slash-fx` | 一過性 | 機能（着弾） | 不変 |
| `.resonance-gauge-wrap::after` | ゲージ外光 | 機能（決定95） | 不変 |
| 名札 3 枚 `hudPlate.css:18–50` | 漆黒札・金縁・角金具 8 片 | 装飾（決定235）／可読性 | **縁無し scrim へ**（§6-1 C） |
| `.burst-preview` 枠 `:5266`（基底は `.panel` 系） | 箱 | 装飾 | 背景・枠を透明（文字のみ） |
| `.battle-main` radius 20＋vignette＋arena-glow | アリーナ枠 | 装飾 | **据え置き（v3.2）**。topbar／dock も同じ「カード」言語で全画面に波及するため本 Pilot の範囲外 |

### 5-2. 接地（CSS のみ）

- `.enemy-stage::after`／`.player-stage::after`：`position:absolute; left:50%; bottom:0; width:62%; height:10%; translate:-50% 40%; border-radius:50%; background: radial-gradient(ellipse, #000000a6 0%, #00000000 70%); z-index:0; pointer-events:none`。`.god-otomo-portraits` の床影（`:5748–5753` radial 46%×7%）と同じ語彙。静止・animation 0（reduce 不要）。SP の舞台は `bottom:8px`（`:6786–6795`）なので影は舞台の下端＝床線に乗る
- `.enemy-avatar`／`.player-avatar` の `drop-shadow(0 12px 16px #000000cc)`（`:3370・:3376`）は「浮いた影」。接地影を足した上で y オフセットを 12→6px に寄せる（filter 連鎖の先頭 1 項のみ。決定240 のリム項は不変）

### 5-3. K34 相対 scale 正規化（`--artScale`）【AI 判断】

- 置き場所：`.enemy-avatar-wrap { scale: var(--artScale, 1) }`（独立プロパティ＝連撃 lunge の `transform` と合成。決定247 の `.enemy-avatar { scale:-1 1 }` には触れない。`.enemy-hit-layer` は舞台直下の兄弟なので着弾中心は不変＝中心拡大）
- 値（決定261 LAYOUT_SUMMARY §D の PC 660 面積から目標 5.5% へ `sqrt(5.5/実測)`・**縮小はしない**・上限 1.18）：

| 敵 | 実測 % | `--artScale` | 正規化後 % |
|---|---|---|---|
| 銀甲の機工師 karakuri | 4.01 | **1.17** | 5.49 |
| 藍花の怨霊 onryo | 4.70 | **1.08** | 5.48 |
| 蒼海の龍神 ryujin | 4.86 | **1.06** | 5.46 |
| 業斧の鬼将 oni | 4.94 | **1.05** | 5.45 |
| 試練の影 datenshi | 5.39 | 1.00 | 5.39 |
| 双牙の魔獣 juuma | 5.92 | 1.00 | 5.92 |
| 乱舞の道化 doukeshi | 5.90 | 1.00 | 5.90 |

- 結果：敵 5.39〜5.92（±5%・現 ±19%）。大耀 5.84 に対する神÷敵 0.99〜1.08（現 0.99〜1.46）。**神側は据え置き**（才華 6.34／蒼毘 6.28 は最大でも敵×1.15 面積＝高さ 1.07）
- フック：`EnemyPanel.tsx:146` の root に `data-enemy={enemy.defId}`（**TSX 1 行・ロジック 0**）→ `.enemy-panel[data-enemy="karakuri"] { --artScale: 1.17 }`。CSS だけで済ませる代替＝`.enemy-panel:has(.enemy-avatar[style*="/karakuri/"])`（art パスは `enemies.ts:52–282` で id を含む）は `:has()` 依存のため採らない
- はみ出しの安全：拡大対象は余白の大きい 4 体のみ（機工師 trim 0.48・怨霊 576×768 縦長・龍神／鬼将は決定229 の「左右 ≥10%／2% の透明余白」）。G4（敵–神 ink 間隔 ≥6px・重なり 0）で実測し、違反なら当該値を 0.02 刻みで下げる

---

## 6. 推奨 Narrow Pilot SPEC（1 案）：Duel HUD v3「2 柱 HUD＋神側チャージ」

### 6-1. 構成要素

| 部 | 内容 | ファイル |
|---|---|---|
| **A 2 列化** | `.battle-main` を `1.18fr 1fr`（PC）／`1.1fr 1fr`（SP）の 2 列に。`.god-otomo-panel` は神列（col 2）へ重ね配置（§4）。P-1 の `--comp-plate-min` は 162 のまま（名札列は余りで伸びる）。S-1／S-1 lite の床幅式（`--d229-*`）は **不変** | `battle.css` 新ブロック（決定261 ブロックの直後・決定254 ブロックの直前） |
| **B 神側チャージ** | `.god-otomo-plate` を縦列：ゲージ 12px（7 分割目盛り）→「あと N」→ 得意技バッジ → OTOMO（PC 56／SP 40px・S-1 lite は床のまま）→ 神技プレビュー（PC >600 高のみ・文字のみ）。見出し「共鳴」文字は非表示（ゲージ内ラベル「共鳴 N / 7」が担う） | 同上 |
| **C 環撤去・scrim・接地** | 環 3 つ `display:none`。名札：`background: linear-gradient(90deg, #05060dcc 0%, #05060d99 70%, #05060d00 100%)`（神側は 270deg）・`border-color: transparent`・`box-shadow: none`・`::before`（角金具）`display:none`・`border-radius: 0`。**ゲージの材質（`hudPlate.css:53–87`）は不変**。接地影（§5-2）。負傷円を楕円へ | 同上（詳細度 `body.battle-viewport .battle-main .enemy-panel .enemy-plate`＝(0,4,1) で `hudPlate.css` の (0,3,1) に勝つ。`hudPlate.css` は編集しない） |
| **D `--artScale`** | §5-3 の表（CSS 7 行）＋ `data-enemy` 1 行 | `battle.css`・`EnemyPanel.tsx:146` |

### 6-2. レイアウト（机上値・px）

```
PC 1508×660（P-1・≤720 高）                               SP 390×844
┌ topbar ラウンド｜神力｜スコア 1240×43 ─────────────┐   ┌ topbar 378×43 ──────────┐
│ ┌名札 306┐ ┌敵舞台 300┐  ┌神舞台 270┐ ┌名札 238┐ │   │ 敵札 171   ｜ 神札 154   │
│ │鬼将【重撃型】│ (ink)   │  │ (ink)    │ │大耀      │ │   │ 名・HP 159 ｜ 名・HP 142 │
│ │HP ████ 290  │         │  │          │ │HP ███ 222│ │   │ 予告 17px  ｜ 共鳴 ▮▮▯▯▯▯▯ 142│
│ │予告 20px    │         │  │          │ │共鳴▮▮▯▯▯▯▯│ │   │ 🛡 / バフ ｜ あと5で神技発動│
│ │🛡 50        │         │  │          │ │あと5で神技│ │   │  吹き出し  ｜ 得意技 …  ▫OTOMO│
│ └────────┘ │ 接地影 │  │ 接地影  │ │得意技 ▫OTOMO│ │   │     敵 204      神 184     │
│                                   神技プレビュー 2 行 │   │   接地影        接地影      │
└ arena 1220×327 ─────────────────────────────────┘   └ arena ───────────────────┘
  託宣 1240×56 → 手札                                     託宣 → 手札（横スクロール）
```

- **PC**：ink 間隔は舞台が列の内側端のまま（P-2）なので現状 74〜128px を維持。名札列は外側（敵＝画面左・神＝画面右）＝**左右対称の Duel HUD**
- **SP 390×660**：吹き出し非表示・OTOMO は床（S-1 lite 不変）・神の頭の上限は名札＋共鳴ブロックの下端（≈125〜145px）で現 157 以上に広がらない＝神の箱 147 据え置き。敵の上限 84px 不変
- **触れないもの**：`src/core`・数値・画像・音・`combatTimeline.ts`／`enemyVfxTiming.ts`／`battleEntrance.ts`・手札／カード／託宣／ドック・`.intent` の文字 20／17px と行高（決定240 A1）・`.enemy-avatar` の filter／translate／scale（決定240／247）・`.player-avatar-wrap`／`.enemy-reaction-idle` の animation（決定249）・`.resonance-cutin-*`／`.enemy-cutin`（決定250／252）・入口（決定254）・`.result-toast` 位置（決定241）・吹き出し（決定228 C）・`hudPlate.css`（決定235 のゲージ材質）・reduce の @media（決定232 前提）

### 6-3. Fast Gate（既存スクリプトの再利用・1 browser／1 context 直列・6GB 機）

| G | 内容 | 再利用元 | 合格 |
|---|---|---|---|
| G1 | 面積：PC 660 敵 ≥4.0・神 ≥4.0・OTOMO ≤0.3／SP 844 敵・神 ≥6.0 | 決定261 `gate-layout.mjs`（`docs/evidence/decision261/pilot/scripts/gate-layout.mjs.txt`） | PASS＋**神÷敵（面積）0.9〜1.15 を全 13 組**（新規指標） |
| G2 | キャラ÷カード高 PC ≥1.2／SP ≥1.0 | 同上 | PASS |
| G3 | 着弾中心 ∈ ink（敵 slash／数字・神 slash／数字） | 同上（決定229 方式） | 104/104 |
| G4 | 重なり 0・敵–神 ink 間隔 ≥6px（`--artScale` 込み） | 同上 | 0 |
| G5 | 決定254 T5：**同一 build 内**（入口消滅直後 vs +2s）HUD 9 要素の箱差 0。Before/After 差は設計変更として記録 | 決定254 `gate-lock.mjs`（evidence 複写） | 0 |
| G6 | 決定249 反応 parity（body／tone／OTOMO／deal／AP／scale／intent） | 決定261 G6（`gate249` ポート差替え） | 30/30 一致 |
| G7 | 反転：HUD `scale -1 1`・カットイン `-1 1`・`--atk-x` | gate-layout | 不変 |
| G8 | 文字切れ 0・横スクロール 0・名札 1 行・**HP バー幅 ≥ 現状×1.8（PC）／×1.3（SP）・共鳴ゲージ高 ≤ HP 高** | gate-layout＋offsetWidth 追加 | PASS |
| G9 | console error 0 | — | 0 |
| G10 | 決定250 法 入力ロック 5 回中央値 ±10ms・GameState 154 行 不一致 0・神の一撃 発火 14/14・決定253 託宣 同一 | 決定254／261 `gate-lock.mjs`・`gate-noshot` | PASS |
| G11 | 静的：tsc 0／oxlint 0／vitest（`hudPlate.test`・`battleViewportLayout.test`・`battleEntrance.test:26` の slice・`combatTimeline.test` の末尾 reduce・`useReactionLanguage.test` の `scale: -1 1` 目印） | — | 全 PASS |
| G12 | 決定240：`.intent` 高さ PC 25／SP 21（charge 2 行 43）SAME・構えクラス SAME（A1′・A3〜A6） | `scripts/decision240-intent/` `cmp.cjs` | SAME |
| G13 | コントラスト近似（名前・予告・あと N・ゲージ文字）：scrim 上で **≥7.0**、HP ラベルは現状 3.24 以上 | `scripts/hud-premium-audit/`（決定235 の方式） | 全 PASS |
| G14 | 環の擬似要素 `content` が none（3 つ）・名札の `::before` none・接地影 2 つ存在 | 新規 1 関数（gate-layout 内） | PASS |
| G15 | 決定228／230：SP 列幅が全ラウンド固定・バッジ 1 行（幅があれば）・共鳴札 3 段の解消を記録 | `scripts/decision228-sp-plate-fix`・`decision230-reso-badge/audit.mjs` | 再基準化 |

- **撤退順序**：D（artScale）が G3／G4 で落ちたら D だけ外す → C の scrim が G13 で落ちたら scrim の濃度を `cc→e6` へ → A／B が G1／G2 で落ちたら Pilot NO-GO（決定261 を守る）

### 6-4. Human QA（CEO・4 問・4/4 YES で PASS）

| # | 質問 | 対応する所感 |
|---|---|---|
| Q1 | 敵と神は同じ大きさに見えるか（**機工師・龍神・鬼将** の 3 体で確認。seed `d257-qa1&enemy=oni`／`enemy=karakuri`／`enemy=ryujin`） | ① |
| Q2 | 敵・神のまわりの円や枠は消え、**戦場に立って** 見えるか（接地影・名札の縁無し） | ②⑤ |
| Q3 | 敵 HP（左）・神 HP（右）は **長さ・位置とも一目で** 読めるか。予告・バフは読みにくくなっていないか | ③ |
| Q4 | 共鳴は **神側の「チャージ」** として読め、HP より目立っていないか（「あと N」・6/7 の光・7/7 の発光が見えるか） | ④ |

- Q4 NO → v3.1「共鳴 topbar 版」（TSX）を別 Preflight。Q2 NO で「まだ箱」→ v3.2 アリーナ枠（`.battle-main` radius／vignette）

---

## 7. 却下案と理由

| 案 | 理由 |
|---|---|
| A) v3-full（名札を上・HP 列幅いっぱい） | PC 660 で立ち絵 −23%（決定261 Human QA Q2 の成果を失う）。topbar 版の共鳴は TSX＋T5 再基準化＋SP に入らない |
| 共鳴を手札ドックへ | アリーナが ≈30px 縮む（PC 660 で −10%）。決定254 T5 dock 箱・`battleViewportLayout.test` に触れる |
| 共鳴を足元中央 | ink 間 74〜128／18〜55px に入らない。決定229 着弾域と重なる |
| 名札の完全撤去（文字だけ） | 鬼将の舞台は赤い空（`prod-pc660-taiyo-oni.jpg`）で text-shadow だけでは名前・予告のコントラストを保証できない（決定235 §1-2 の近似 16.6 は札の背景由来）→ 縁無し scrim で妥協 |
| 得意技バッジの TSX 移設（PlayerPanel） | 視覚的帰属は B で得られる。TSX 10 行の追加は Human QA の結果を見てから |
| 神側 `--artScale` | 神は 1 戦 1 柱で基準が揺れない。敵の正規化だけで神÷敵 0.99〜1.08 |
| `.enemy-avatar` 直接の scale 変更 | 決定247 の `scale:-1 1` 行は `useReactionLanguage.test` の目印。合成で済む `.enemy-avatar-wrap` を使う |
| `:has()` による CSS-only artScale | Safari 15.4 未満で無効。`data-enemy` 1 行の方が確実 |
| アリーナ枠（radius 20・vignette・arena-glow）の変更 | topbar／dock と同じ「カード」言語で全画面に波及。v3.2 |
| OTOMO の縮小／移動の追加 | 決定261 O-1／S-1 で確定・Human QA Q3 YES。本 Pilot は位置の帰属（神の列）だけ |

## 8. リスク・反証

| # | リスク | 反証・対処 |
|---|---|---|
| R1 | scrim 化で名前・予告のコントラスト低下（舞台の明るい背景） | G13 で ≥7.0。落ちたら濃度 `cc→e6`。HP ラベルは `hudPlate.css` の艶・縁取り不変 |
| R2 | PC 900〜1200px 幅（中間幅）で神列の名札列が細くなり共鳴ブロック（ゲージ・あと N・得意技・OTOMO）が縦に伸びて神の絵に重なる | 共鳴ブロックは `align-self:start` で名札の下に固定し、神舞台は `align-self:flex-start`（左端）なので列の右側は空き。G4 を 900／1024／1280／1508 の 4 幅で実測 |
| R3 | 決定254 T5「Before vs After 箱差 0」が設計上 0 にならない | T5 の本質（入口が HUD を動かさない＝同一 build 内差 0）は維持。Decision に「再基準化」と明記 |
| R4 | `--artScale` で機工師の絵が舞台から出て神に触れる／名札に重なる | 中心拡大・余白 ≥10% の 4 体のみ・上限 1.17。G4 で間隔 ≥6px、違反なら値を下げる |
| R5 | 連撃 lunge（`.enemy-avatar-wrap` の `transform` animation）と独立 `scale` の合成で突進距離が 1.05〜1.17 倍に見える | 最大 +4px 相当（24px×0.17）。決定229 §16-6 「最大 20px 触れる」の安全側は G4 で確認 |
| R6 | 環の撤去で「臨場感」が落ちる（旧 CEO 要望） | 代替は接地影＋決定240／249／252 の機能リム。Human QA Q2 で判定。paint 層 −3 は G10 のロック時間にも有利 |
| R7 | SP 660（iPhone Safari）で共鳴ブロック＋得意技 3 行＋OTOMO が神の頭に接する | OTOMO は S-1 lite で床のまま。得意技 3 行でも ≈145px ＜ 現 157px。G4 を sp660 × 蒼毘／福永／笑蓮 で実測 |
| R8 | 共鳴が神側に従属することで「あと 1 で発動」の緊張が弱まる | ゲージ長 142〜222px（現 SP 57）・7 分割・決定95／128 の発光は不変＝むしろ SP では読めるようになる（決定225 K「SP では buildup が読めない」の解消） |
| R9 | 6GB 機で Gate 104 run の再実行 | 決定261 と同じ 1 browser 直列・run 前の空きメモリ記録。Lane A と同時には走らせない |

## 9. CEO 判断事項

```
【CEO DECISION REQUIRED】
Issue：Duel HUD v3 Narrow Pilot（§6）の実装 GO。含まれる方向性変更＝
  (a) アリーナ上段を 3 列→2 列（共鳴の第 3 パネル廃止・神側に従属）
  (b) 決定235 で CEO Human QA PASS した「名札＝漆黒の札＋金縁＋角金具」を縁無し scrim に置き換える
      （ゲージの材質は不変）。敵・神・OTOMO の回転オーラ環（決定91 を含む）を撤去
  (c) TSX 1 行（data-enemy 属性）＋ CSS 1 ブロック。決定254 T5／240 A1／228／230 を再基準化
AI Recommendation：承認（GO WITH MODIFICATIONS のまま Pilot へ。Fast Gate → Human QA 4 問 → Release Gate）
Reason：CEO 5 項目の根本原因（P-1 の名札列 162／118px・第 3 列の共鳴・環 3 つ・ink の余白差）に
  CSS 主体で同時に効き、決定261 の立ち絵サイズを失わない唯一の案（§3）
Alternatives：v3-full（立ち絵 −23%）／共鳴を topbar・dock へ（TSX・SP 不成立・アリーナ縮小）／
  現状維持（K34 OPEN のまま）＝ §7
Risk：scrim のコントラスト（G13）・中間幅の重なり（G4）・artScale のはみ出し（G4）。撤退順序 §6-3
Impact if delayed：K34 は RC で CAN SHIP（C）のため Production 影響 0。ただし次の Human QA 機会を逃す
CEO Action：承認 / 拒否
```

## 10. 実装しなかったこと・runtime 変更 0 の証明

- 本書は worktree（master `a3ffa87` から分岐）に **本ファイル 1 本のみ** を追加。`src/`・`public/`・`scripts/`・他の docs・`DECISIONS.md` は未変更
- 実行したもの：`git status`／`git log`／`ls`／`grep`／`sed`／`cat`／`find`／`wc` と、decision261 の Production Smoke 画像 2 枚の閲覧のみ
- **起動していないもの**：ブラウザ（Playwright／Chrome）・`vite build`・`vitest`・`tsc`・`oxlint`・画像生成・simulation・dev server・Vercel。6GB 機で Lane A と並走中のため
- 本書の数値は「実測」と明記したもの（決定254 T5・決定261 LAYOUT_SUMMARY・決定230 §1）以外は **CSS の式からの机上値（※）**。Pilot の Fast Gate で実測に置き換える
- NEXT NOW（1 つ）：**CEO 承認後**、master から `feat/d2xx-duel-hud-v3` を切り §6-1 A〜D を実装 → §6-3 Fast Gate → §6-4 Human QA。承認まで runtime には触れない
