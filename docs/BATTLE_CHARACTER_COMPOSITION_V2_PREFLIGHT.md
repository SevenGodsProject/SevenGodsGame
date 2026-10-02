# Battle Character Composition v2 Preflight — 「神 vs 敵」を戦場の視覚的主役にする

- 作成：2026-10-03・【Designer】＋【PM】・**docs-only／PREFLIGHT ONLY**（runtime／CSS／画像／src／Production／build／vitest／ブラウザ／simulation／外部サービス 変更 0。実装は CEO GO 後）
- Baseline：master＝origin/master＝**`694dd0b`**（runtime `538a3ef`＝決定257 LIVE）。worktree `C:/Users/kimi1/SevenGodsGame-comp`・branch `docs/battle-composition-v2-preflight`
- 起点：Final Practical QA v2 Session 1・2 の CEO 実プレイ所感 ①「敵が左を向いているのを直したい」②「敵と神の大きさがカードより小さく感じる。OTOMO をもう少し小さくして、敵と神の画像を大きくして戦っている臨場感を出せたら最高」
- 目標仮説：**Battle visual hierarchy：Enemy ≈ God ＞ OTOMO**（カードは操作対象として読みやすさを維持しつつ、戦場キャラクターより主役になりすぎない）
- 表記：【実測】＝コード読み・画像寸法（file:line）／【docs】＝既存 Decision・監査の引用／【AI 判断】／【推測】
- 判断主体：監査・SPEC 選定・GO／HOLD は **AI 判断**（CLAUDE.md §6-2）。実装開始は CEO GO（§6-5）

---

## §0. 結論

| 項目 | 結論 |
|---|---|
| **Root Cause（所感②・大きさ）** | 絵の解像度ではなく **置き場所と箱の制約**。**PC 1508×660**：アリーナ高 327px のうち名札が 107px を縦に消費し、立ち絵の箱は 196px（敵）／168px（神）→ ink 高 141〜167px＝**カード 1 枚の高さ 164px と同じ**（占有 敵 2.4%・神 2.3% vs カード 1.9%／枚・手札ドック 28.4%）。さらに敵と神は列の中央に置かれ **ink 間 ≈300〜325px** 離れている（対峙ではなく「同じ画面にいる」）。OTOMO は `14vh`＝92px の箱（ink ≈60〜65px）で **敵の 0.4 倍＝相棒ではなく 3 人目**。**SP 390×844**：決定229 v2 の床幅式が「OTOMO を床に残す＋重なり 0」を最悪ケースで保証するため、敵箱 176px／神箱 141px が上限（ink 高 143／130 vs **カード 158px**）。上の空き帯 ≈200px は正方形 art では使えない【実測 §1】 |
| **Root Cause（所感①・向き）** | HUD は決定229 v2／247 で PC・SP とも敵を反転済み。残る「左向き」は **(a) 敵必殺カットイン `BattleEnemyCutin.tsx:64`＝原画のまま（左向き 4 体が自分の必殺で神に背・決定252 で全 7 体に必殺が付き毎戦 1 回・画面最大の敵表示 150〜250px）**、**(b) 双牙の魔獣＝原画が「正面〜やや右」のため一律反転で HUD では「やや左」に反転**、(c) 入口（PC：神 30%／敵 68%・原画のまま＝神の方を向くが HUD と左右が逆＝連続性の切れ目）、(d) 笑蓮（右向き・Kit 正典）・才華 keyvisual 鏡像（asset）【実測 §3・§4】 |
| **推奨 hierarchy** | 面積（画面比）：PC 1508×660 **敵 ≈4.5% ≈ 神 ≈4.5% ＞ カード 1.9%／枚 ＞ OTOMO ≤0.2%**（ink 高：キャラ ≥ カード ×1.25）／SP 390×844 **敵 ≈6.3% ≈ 神 ≈6.5% ＞ カード 4.8%／枚 ＞ OTOMO ≤0.3%**（キャラ ≥ カード ×1.05）。位置：敵＝左・神＝右（不変）、ink 間 PC 60〜80px・SP ≈10px、OTOMO は床から離して神の右上（SP）／共鳴列（PC）。明度は asset（Brief v1.1）に委ねる【§5】 |
| **SPEC 1 案（CSS のみ・`src/core` 0・画像 0）** | **「対峙構図 v2」＝ 4 本柱**：**P-1 PC（≥900px・高さ ≤720px）名札を立ち絵の横へ（panel を 2 列 grid）→ 敵箱 196→280px（×1.43）・神箱 0.9×敵＝252px**／**P-2 PC 近接**：敵の舞台を列の右端・神の舞台を列の左端に寄せ ink 間 ≈325→≈60〜75px（高さ >720px の PC は名札上のまま max-width 290→340・238→306 と近接のみ）／**S-1 SP OTOMO を床から外して共鳴札の直下へ**＋床幅 100%−8px＋神＝敵 ×0.9 → 敵箱 176→205px（×1.16）・神箱 141→184px（×1.31）・低い画面（≤700px 高）は上端 cap を 124→84px／**O-1 OTOMO ×0.6**（PC `clamp(36px, 8.5vh, 76px)`・SP `basis×0.6`）／**F-1 敵カットイン反転 `.enemy-cutin-image { scale: -1 1 }`**（HUD と同じ規則＝v2 art の `artFacing` 移行時に 3 面同時に切替）。入口・魔獣・笑蓮・才華は Known【§6】 |
| **Regression Risk 上位 3** | ① 決定241 `.result-toast`（`top: max(104px, 32%)`）と `.battle-mini-result`（`bottom: 10px`）が、近づいた神・敵の頭／足元に 0.7〜1.4s 重なる（pointer-events なし・z 3〜4 で可読性は保つ）② 決定229 の着弾中心＝箱 `inset:0` の相対位置なので箱ごと動けば不変だが、PC で箱が正方形に近づくため `floating-number top:34%` が胸より上に来る敵がいる（trim の低い機工師）③ 決定254 `battleEntrance.test.ts:26` が「決定254 ブロック＝ファイル末尾」を前提に slice するため、**新ブロックは決定254 ブロックの直前（`battle.css:7227` の前）に挿入**し、決定232 の「末尾の reduce ブロック」前提のため reduce の @media を書かない【§7】 |
| **GO／HOLD** | **GO（条件つき・AI 判断）**：Narrow Pilot として CSS 1 ブロック（約 120 行）を実装 → Fast Gate（§8・1 browser／1 run 直列）→ CEO Human QA 4 問（§9）。**HOLD**：奥行き重なり構図（案 D）・入口の左右入替・魔獣／笑蓮／才華の個別向き（データ駆動 `artFacing` または asset）【§10】 |

---

## §1. 現状 Root Cause（PC／SP）

### 1-1. 寸法の出どころ【実測】

| 要素 | 規則 | file:line |
|---|---|---|
| 戦闘画面 3 行 grid（topbar／arena／dock） | `grid-template-rows: auto minmax(0,1fr) auto`・gap 8px | `battle.css:4986-4999` |
| アリーナ 3 列 | `grid-template-columns: 1.18fr 1fr 0.78fr`・padding 10・gap 10 | `battle.css:5030-5032`・`5009-5020` |
| 名札の最小高 | `.enemy-plate, .player-plate { min-height: 78px }` | `battle.css:5051-5054` |
| 敵の箱 | `.enemy-avatar { width:100%; max-width:290px; height:100%; min-height:104px; background-position:center bottom }` | `battle.css:5165-5171` |
| 神の箱 | `.player-avatar { max-height: 82% }`／`max-width: 238px; height:100%; min-height:92px` | `battle.css:5067-5069`・`5205-5212` |
| OTOMO（PC） | `.portrait img { height: min(100%, clamp(56px, 14vh, 128px)) }`（後置で `clamp(48px,8vh,80px)` :5253 を上書き） | `battle.css:5709-5713` |
| OTOMO（SP） | `clamp(48px, 8vh, 76px)` → 決定229 v2 で `--d229-otomo = basis × 0.75` | `battle.css:5797-5800`・`6808-6811`・`6855-6857` |
| カード（PC） | `.card-view { width:116px; height:164px }`（≤640px 高は 150px :5426-5428） | `battle.css:5341-5347` |
| カード（SP） | `width:100px; height:158px`（横スクロール） | `battle.css:5621-5624` |
| SP 舞台（決定229 v2） | `--d229-otomo-basis: clamp(48px,8vh,76px)`・`--d229-floor: 100% − 16px − basis×0.9`・`--d229-enemy: min((floor − 6px)/1.68, 300px)`・`--d229-god: min(enemy×0.8, 240px)`・`--d229-gap: 6px + basis×0.135`・`max-height: calc(100% − 124px)`・`bottom: 8px` | `battle.css:6807-6814`・`6780-6787`・`6819-6830` |
| 敵の反転 | SP `scale: -1 1; --atk-x: -1`／PC `@media (min-width:900px)` 同形 | `battle.css:6845-6848`・`7062-7067` |
| 原画 | 神 `front_640.webp` 640×640 alpha／敵 768×768 alpha（怨霊のみ 576×768）／OTOMO `spirit_320.webp` 320×320 alpha／神 keyvisual 675×900（笑蓮 900×900・福永 720×900） | WebP ヘッダ実測（`public/assets/**`） |

### 1-2. PC 1508×660（CEO 標準 PC 窓・evidence `pc1508-battle-ready.jpg`）【実測・机上】

| 項目 | 値 | 根拠 |
|---|---|---|
| 画面 | 995,280 px² | 1508×660 |
| アリーナ | 1240×327（列 478／405／316） | 決定229 §4【docs】・`:5030` の fr 比で再計算一致 |
| 名札の縦消費 | HUD 下端 y=107（arena pad 10＋panel pad 10＋plate 78＋gap 5＋α） | 決定229 §4【docs】・`:3277`・`:5053` |
| 敵の箱／描画 | 290×196 → contain 196×196 → **ink 高 156〜167px・占有 2.4%** | `:5167`・決定229 §3【docs】 |
| 神の箱／描画 | 238×168（82%）→ 168×168 → **ink 高 141〜164px・占有 2.3%** | `:5068`・`:5208`・決定229 §3 |
| OTOMO | 箱 92px（14vh）→ ink ≈60〜65px・≈0.35%・**敵 ink の 0.4 倍** | `:5712`・画像目視（x≈1170〜1220・y≈320〜385） |
| カード | 116×164＝19,024 px²＝**1.9%／枚**・5 枚 9.6%。ドック全体 ≈28.4%・上部 HUD 10.2% | `:5341-5347`・決定229 §3 |
| 敵 ink 高 ÷ カード高 | 156〜167 ÷ 164 ＝ **0.95〜1.02**（神 0.86〜1.0） | 上記 |
| 敵と神の距離 | 列中心 x≈383 と ≈835（452px）。ink 間の空き ≈300〜325px（敵右端 ≈435・神左端 ≈760） | 画像目視・列幅 |
| 空き帯 | 絵の頭と名札の間 12px＝**縦は満杯**（横は列幅の 60% が空） | 決定229 §4 |

→ **所感②の PC 側 Root Cause**：縦が束縛（名札が立ち絵の上に積まれ、327px のアリーナの 1/3 を名札が取る）。横は余っているのに正方形 art は横では大きくならない。カードは 164px で立ち絵と同じ背丈・しかも 5 枚並ぶため面積の合計で立ち絵 2 体（4.7%）の 2 倍（9.6%）。**距離 325px** で「戦っている」構図にならず、OTOMO が敵の 0.4 倍の背丈で床に立ち「3 人目」に見える。

### 1-3. PC 1280×800【docs・机上】

敵箱 294×321 → 290 で幅 cap → ink 234〜273（5.3%）・神 203〜237（4.7%）・絵の頭が HUD 下端に接する（−12px）・OTOMO 箱 112px（14vh）・カード 164。**ここでは大きさより「名札と頭の接触」と「距離」と「OTOMO 112px」が問題**。

### 1-4. SP 390×844（evidence `sp844-battle-ready.jpg`）【実測・机上】

| 項目 | 値 | 根拠 |
|---|---|---|
| 画面／アリーナ | 329,160 px²／378×480 | 決定229 §4 |
| `--d229-*` | 8vh=67.5 → basis 67.5・OTOMO 50.6・床 378−16−60.75＝301.25・**敵箱 175.7・神箱 140.6**・gap 15.1 | `:6807-6814` を代入 |
| ink | **敵 高 143px・5.3%／神 130px・5.1%**（24 件すべて v1 と同一） | 決定229 §16・§18【docs】 |
| OTOMO | 箱 50.6 → ink ≈35〜40・≈0.4% | 画像目視（x≈345〜380・y≈505〜545） |
| カード | 100×158＝15,800＝**4.8%／枚**・可視 ≈3.5 枚 ≈17% | `:5621-5624` |
| 敵 ink 高 ÷ カード高 | 143 ÷ 158 ＝ **0.90**（神 0.82） | 上記 |
| 空き帯 | 名札下端 ≈190 → 絵の頭 ≈400 ＝ **≈200px**（吹き出し 1 個のみ） | `COMMERCIAL_PRESENTATION_AUDIT.md` #6【docs】・画像目視 |
| 束縛 | `max-height: calc(100% − 124px)`＝356px ≫ 箱 176 → **縦は余り・横（床幅と重なり 0）が束縛** | `:6785`・`:6811` |

→ **所感②の SP 側 Root Cause**：決定229 §12-9 #1「敵の大きさは目安 ≈8% に届かない。さらに大きくするには OTOMO の置き場所（床から外す）か重なりを許す判断が要る」【docs】が未解決のまま。床幅から OTOMO 分（basis×0.9＝61px）と余白 16px が引かれ、残りを 1.68 で割るため敵箱は 176px が上限。空き帯 200px は正方形 art には使えない。

### 1-5. SP 390×660（evidence `sp660-battle-ready.jpg`）【机上】

8vh=52.8 → basis 52.8・OTOMO 39.6・床 314.5・敵箱 183.6／cap `100%−124`＝≈184 → **縦と横が同時に束縛**。神 146.9。ink 敵 ≈150（≈6%）・神 ≈137（≈5%）。カード 158（660>640 なので 150 にならない）＝6.1%／枚。空き帯 ≈50px。低い画面では「名札（72）＋吹き出し（33）＋余白」の 124px cap が効くが、**≤700px 高では吹き出しは `display:none`（`:5396-5401`）なので 33px は死に余白**。

---

## §2. PC／SP 別の問題（4 viewport）

| viewport | 束縛 | 敵 ink 高／占有 | 神 | OTOMO 箱 | カード高／枚占有 | 距離（ink 間） | 主な問題 |
|---|---|---|---|---|---|---|---|
| **1508×660** | 縦（名札 107px） | 156〜167／2.4% | 141〜164／2.3% | 92（0.4×敵） | 164／1.9% | ≈325px | キャラ＝カードの背丈・遠い・OTOMO 大 |
| **1280×800** | 幅 cap 290 | 234〜273／5.3% | 203〜237／4.7% | 112（0.45×敵） | 164／1.6% | ≈330px | 頭が名札に接触・遠い・OTOMO 大 |
| **390×844** | 横（床幅・重なり 0） | 143／5.3% | 130／5.1% | 50.6（0.35×敵） | 158／4.8% | ≈10px | キャラ＜カード・上の空き帯 200px |
| **390×660** | 横＋縦（cap 124） | ≈150／≈6% | ≈137／≈5% | 39.6 | 158／6.1% | ≈10px | cap の 33px が死に余白 |

共通：**キャラ ink 高 ÷ カード高 ＝ 0.82〜1.02** → CEO 所感②「カードより小さく感じる」は 4 viewport すべてで数値どおり【実測】。

---

## §3. 7 Gods／7 Enemies／7 OTOMO 監査表（決定244 §4-2／4-3 を現 Production `538a3ef` で更新）

### 3-1. 神 7 柱（戦闘 `front_640`・反転なし・敵＝左）【docs：決定229 §14-1・PQA 9/28 §4-2】

| 神 | 原画の向き（体／視線／武器） | HUD（PC／SP） | 入口 PC（神 x30%・敵 x68%） | 共鳴カットイン／勝利舞台（keyvisual） | 「神は敵を見る」 |
|---|---|---|---|---|---|
| 恵比寿 | 弱い左／正面ウインク／竿は右弧 | 弱い左＝敵の方 | 弱い左＝**敵に背**（敵は右） | keyvisual 675×900 | ○（弱） |
| 大耀 | 正面／正面／砲口 左 | 左 ✅ | 砲口が敵と逆 | keyvisual | ◎ |
| 蒼毘 | 3/4 左／左／槍 左 | 左 ✅（最強） | 敵に背 | keyvisual | ◎ |
| 才華 | ほぼ正面・腰やや左／やや右 | 中立〜弱い左 | 中立 | **keyvisual は腰・ギターが右＝戦闘絵と鏡像の別ポーズ** | △ |
| 寿楽 | 左／左／蹴り 左 | 左 ✅ | 敵に背 | keyvisual | ◎ |
| 福永 | やや左／正面／方向なし | 弱い左 | 中立 | keyvisual 720×900 | ○（弱）・兜に文字＝反転不可 |
| 笑蓮 | 寝そべり・体は右／**視線 右** | **右＝敵に背** | 右＝敵の方（入口だけ正しい） | keyvisual 900×900・右向き | ✗（asset・Kit 正典） |

注：入口 PC は神が左・敵が右（`battle.css:7470-7479`・`7502-7507`）なので、**左向きの神 5 柱は入口で敵に背を向ける**（決定254 Q2 YES で CEO PASS 済み・2.4s の儀式・Known として記録のみ）。

### 3-2. 敵 7 体（HUD は PC／SP とも `scale: -1 1`・入口／カットインは原画）【実測・docs】

| 敵 | 原画の向き | HUD（反転後） | 入口 PC（敵 x68%・原画） | 必殺カットイン `BattleEnemyCutin.tsx:64`（原画・150〜250px） | 「敵は神を見る」 |
|---|---|---|---|---|---|
| 試練の影（datenshi） | 正面 | 中立（鏡像） | 中立 | 中立 | ○ |
| 業斧の鬼将（oni） | 左 | **右＝神の方 ✅** | 左＝神の方 ✅ | **左＝神に背 ✗** | HUD ○／カットイン ✗ |
| 藍花の怨霊（onryo） | 正面（576×768） | 中立 | 中立 | 中立 | ○ |
| 銀甲の機工師（karakuri） | 左（trim 0.48） | 右 ✅ | 左 ✅ | **左 ✗** | HUD ○／カットイン ✗ |
| 双牙の魔獣（juuma） | **正面〜やや右** | **やや左＝一律反転で神から逸れる ✗（弱）** | やや右＝神に背（弱） | やや右（中立） | △（唯一 HUD で逆転） |
| 蒼海の龍神（ryujin） | 左 | 右 ✅ | 左 ✅ | **左 ✗** | HUD ○／カットイン ✗ |
| 乱舞の道化（doukeshi） | 左 | 右 ✅ | 左 ✅ | **左 ✗** | HUD ○／カットイン ✗ |

→ **向きが成立していない組み合わせ**：(1) 必殺カットイン × 鬼将・機工師・龍神・道化（4/7・毎戦 1 回・最大表示）(2) HUD × 魔獣（弱・一律反転の副作用）(3) HUD × 笑蓮（神側・asset）(4) 入口 PC × 左向きの神 5 柱（儀式・PASS 済み）。

### 3-3. OTOMO 7 体（精霊態 `spirit_320`・320×320）【docs：PQA 9/28 §4-2】

| OTOMO | 原画 | HUD 位置（PC／SP） | 補助役として成立 |
|---|---|---|---|
| 鯛丸・小槌・百勝・琴音・寿鹿・ハク・笑袋 | **全員正面の球体・向きなし** | PC：共鳴列の床（`:5702-5713` 「床に立つ 3 人目」設計）箱 92〜112px／SP：共鳴列の右端・床（`:6861-6864`）箱 38〜51px | **PC ✗**（敵の 0.4〜0.45 倍の背丈で床に立ち 3 人目）／**SP △**（小さいが床に並ぶため「3 人目」の構図は同じ） |

→ 向きは問題なし。**問題は「床の 3 人目」という置き方と PC の 14vh**。受肉態・童子は発動 1〜2 回目にしか出ない（§3-A【docs】）ため精霊態で判断してよい。

---

## §4. orientation 残存箇所と解き方

| # | 箇所 | 現状 | CSS で解けるか | asset でしか解けないか | v2 art（Brief v1.1・右向き）で逆転するか | 判断【AI】 |
|---|---|---|---|---|---|---|
| 1 | **敵必殺カットイン** `BattleEnemyCutin.tsx:64`（`.enemy-cutin-image` `:3543-3548`・Ken Burns `translateX(2%)`） | 原画・左向き 4 体が神に背 | **解ける**：`.enemy-cutin-image { scale: -1 1 }` 1 規則（独立プロパティ＝kenburns の `transform` と合成。pan が鏡像になるだけ） | — | **逆転する。ただし HUD の `.enemy-avatar` も同じ**＝v2 の 1 体目で Brief §5-2 の `artFacing` を入れる時に 3 面（HUD／カットイン／入口）を同じ属性で切替えれば追加コスト 0 | **SPEC に含める（F-1）**。Lane 3 の却下理由「v2 で逆転」は HUD にも等しく当てはまり、現に HUD は反転運用中＝規則の一貫性で解決 |
| 2 | 入口 `BossEntrance.tsx:216`（PC 神 x30%／敵 x68%） | 原画・左向き 4 体は神の方 ✅・正面 3 体 中立・魔獣やや背 | 解ける（位置入替＋反転）が **決定254 CEO Q2 YES の PASS 済み画面を変える** | — | 入替＋反転すると逆転（#1 と同じ扱い） | **Known・保留**。HUD との左右逆転（連続性）は Phase 2 候補 |
| 3 | HUD × 双牙の魔獣（原画 正面〜やや右） | 一律反転でやや左 | CSS 単独では **敵 1 体を狙えない**（`.enemy-avatar` に id 属性なし。`[style*="juuma"]` は path 依存のハック・`alt` 名指定は不変ルール 3 の精神に反する） | データ駆動 `artFacing: 'right'`（`enemies.ts` 1 行＋TSX `data-art-facing` 1 属性＝runtime・Brief §5-2 で設計済） | v2 で魔獣が右向きに描かれれば自然に解消 | **Known**（弱・正面寄り） |
| 4 | 笑蓮（右向き・Kit 正典・兜文字なし） | HUD で敵に背 | `.player-avatar` に神の id 属性なし（`PlayerPanel.tsx:155` は `alt` のみ）→ CSS 単独不可。反転は Kit 正典の鏡像＝権利・設定判断 | asset（Kit の別ポーズ `front.webp` は正面・兜文字「招福招来」あり＝反転不可） | — | **HOLD（asset・CEO §6-3 #3／#5）** |
| 5 | 才華 keyvisual（鏡像の別ポーズ） | 共鳴カットイン／勝利舞台で右向き | `[data-god="saika"]`（`BattleResonanceCutin.tsx:194`・`VictoryStage.tsx:67`）で CSS 反転は可能だが別ポーズの鏡像＝絵の意図を変える | asset | — | **HOLD（asset）** |

---

## §5. 推奨 visual hierarchy【AI 判断】

| 層 | 面積（画面比） | 高さ | 位置 | 明度・役割 |
|---|---|---|---|---|
| **Enemy** | PC 1508×660 ≈4.5%／SP 844 ≈6.3% | ≥ カード ×1.25（PC）・×1.05（SP） | 左・床（`bottom:8px` 不変）・神との ink 間 PC 60〜80px／SP ≈10px | 脅威。リム（決定240）・紅蓮（決定252）は不変。明度は asset（Brief） |
| **God** | PC ≈4.5%／SP ≈6.5%（**敵 ≈ 神**＝箱 0.9×） | 敵と同背丈（±5%） | 右・床・敵の隣 | 操作主体。反応（決定249）は wrapper に載る＝不変 |
| **Card（1 枚）** | PC 1.9%／SP 4.8%（不変） | 164／158（不変） | ドック | 操作対象。**単体ではキャラより小さく、列としては読みやすさ優先で面積不変** |
| **OTOMO** | PC ≤0.2%／SP ≤0.3% | 敵 ink の 0.18〜0.25 倍 | **床から離す**：SP は共鳴札の直下（神の右上・空き帯の中）／PC は共鳴列・床から 10px 上 | 相棒・補助。反応（pop・rl-otomo-subtle）は同位置で再生 |

根拠：決定229 設計 §11「敵 ＞ 神 ＞ OTOMO（0.82）」は「脅威が正面に立つ」意図だったが、CEO 所感②は「敵と神」を一体で主役にしたい要望＝**Enemy ≈ God** が Player Value（自分の神が戦っている実感）と Strategic Depth（敵の構えを読む）の両方に効く。OTOMO は決定214「戦略的役割が決まるまで見た目先行しない」【docs】に従い **小さく・補助位置へ**（存在感を増す方向には触れない）。

---

## §6. SPEC 候補（1 案に絞る）— 「対峙構図 v2」

### 6-1. 採用 SPEC（CSS 1 ブロック・`src/core` 0・TSX 0・画像 0）

挿入位置：`battle.css` の **決定254 ブロック（`:7227`）の直前**（理由 §7 #3）。調整値はすべて `--comp-*` 変数に集約。

**P-1 PC（`@media (min-width: 900px) and (max-height: 720px)`）：名札を立ち絵の横へ**

```css
body.battle-viewport .enemy-panel,
body.battle-viewport .player-panel {
  --comp-plate-min: 170px;           /* 名札の最小幅（HP 1,030/1,030・予告 20px が入る） */
  --comp-stage: min(calc(100% - var(--comp-plate-min) - 8px), 300px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  column-gap: 8px;
  align-items: start;
}
body.battle-viewport .enemy-panel  { grid-template-columns: minmax(0, 1fr) var(--comp-stage); }
body.battle-viewport .player-panel { grid-template-columns: calc(var(--comp-stage) * 0.9) minmax(0, 1fr); }
body.battle-viewport .enemy-plate  { grid-column: 1; grid-row: 1; }
body.battle-viewport .enemy-speech-bubble { grid-column: 1; grid-row: 2; align-self: start; margin-bottom: 0; max-width: 100%; }
body.battle-viewport .enemy-stage  { grid-column: 2; grid-row: 1 / span 2; height: 100%; }
body.battle-viewport .player-stage { grid-column: 1; grid-row: 1 / span 2; height: 100%; }
body.battle-viewport .player-plate { grid-column: 2; grid-row: 1; }
body.battle-viewport .enemy-avatar  { max-width: none; }
body.battle-viewport .player-avatar { max-width: none; max-height: none; }
```

- 1508×660：panel 内幅 458 → 敵舞台 ＝ min(458−178, 300) ＝ **280px**（箱 196→280・×1.43）→ ink 高 ≈196〜244（中央 224）・≈4.5%。神舞台 252px → ink ≈214〜242・≈4.5%。**敵 ink 高 ÷ カード高 164 ＝ 1.2〜1.5** ✓
- 名札 170〜178px 幅：名前＋【型】が 2 行・予告「連撃 50+40」＋バッジが 2〜3 行に折り返しても高さ ≤150px（列高 287）で収まる。`.enemy-plate .intent` の font-size は触れない（test `battleViewportLayout.test.ts:119` 不変）
- ≤700px 高では吹き出し非表示（既存 `:5396`）。700〜720px は列 1 の 2 行目へ

**P-2 PC 近接（`@media (min-width: 900px)` 全体）**

```css
body.battle-viewport .enemy-stage, body.battle-viewport .enemy-stage > .enemy-collapse { justify-content: flex-end; }
body.battle-viewport .player-windup, body.battle-viewport .player-avatar-wrap > div { justify-content: flex-start; }
```

- 高さ >720px（例 1280×800）は名札上のまま、`.enemy-avatar { max-width: 340px }`・`.player-avatar { max-width: 306px }`（0.9）。1280×800：敵箱 min(327, 340)＝327（290→×1.13）
- ink 間：panel pad 10＋border 1＋gap 10＋border 1＋pad 10 ＝ 32px ＋ 敵の後方透明余白（反転後 ≥10%・≈28px）＋ 神の前方余白 ≈0 ＝ **≈60〜75px**（現 ≈325px）。突き 16〜24px・突進 18〜24px は `--atk-x` のまま相手方向＝**攻撃時でも ink 間 ≥ 30px**（決定229 §16-6 #4 の「最大 20px 触れる」より安全側）

**S-1 SP（`@media (max-width: 899px)`）：OTOMO を床から外し、床幅を 2 人で使う**

```css
body.battle-viewport .battle-main {
  --comp-god-ratio: 0.9;
  --d229-otomo: calc(var(--d229-otomo-basis) * 0.6);
  --d229-floor: calc(100% - 8px);                                         /* OTOMO 分を引かない・側余白 4px */
  --d229-enemy: min(calc((var(--d229-floor) - 6px) / (0.88 + var(--comp-god-ratio))), 300px);
  --d229-god: min(calc(var(--d229-enemy) * var(--comp-god-ratio)), 270px);
  --d229-gap: 6px;
}
body.battle-viewport .enemy-stage  { left: calc(4px - var(--d229-enemy) * 0.02); }
body.battle-viewport .player-stage { left: calc(4px + var(--d229-enemy) * 0.88 + var(--d229-gap)); }
body.battle-viewport .god-otomo-portraits { align-items: flex-start; margin-right: -8px; flex: 0 0 auto; margin-top: 6px; }
body.battle-viewport .portrait { justify-content: flex-start; }
@media (max-width: 899px) and (max-height: 700px) {
  body.battle-viewport .enemy-stage, body.battle-viewport .player-stage { max-height: calc(100% - 84px); } /* 吹き出し非表示時の cap */
}
```

- 390×844：床 370 → 敵箱 (370−6)/1.78 ＝ **204.5**（176→×1.16）→ ink 高 ≈168・≈6.3%。神箱 **184**（141→×1.31）→ ink ≈171・≈6.5%。**敵 ≈ 神** ✓。ink 間 ＝ 6 ＋ 0.02×204 ≈ **10px**（重なり 0 at rest・決定229 の式を踏襲）。**敵 ink 高 ÷ カード高 158 ＝ 1.06**
- 390×660：cap 308−84＝224 → 敵 min(204.5, 224)＝204.5（183.6→×1.11）・神 184（×1.25）
- OTOMO：共鳴札（y≈100〜175）の直下 y≈185〜225・右寄せ＝**空き帯の中に浮く相棒**。神の頭（y≈400）とは 170px 離れ重なり 0
- D229 の `--d229-otomo-basis` は据え置き＝式の基準は不変（Narrow Fix の作法を踏襲）

**O-1 OTOMO ×0.6**

```css
@media (min-width: 900px) { body.battle-viewport .portrait img { height: min(100%, clamp(36px, 8.5vh, 76px)); } }
```

- PC 660：92→**56px**（ink ≈38〜40・敵 ink の 0.17 倍）／800：112→**68px**。SP：50.6→**40.5px**（844）・39.6→31.7→min 32px（660）。`.otomo-reaction-label`（max-width 190・中央重ね `:1458`）は相対位置のまま。`.portrait-otomo::before` のオーラ（130px 固定 `:724-740`）は PC で画像より大きくなるが z −1・blur 済み＝視覚上の問題なし（Fast Gate で確認）

**F-1 敵カットイン反転**

```css
.enemy-cutin-image { scale: -1 1; }
```

- `BattleEnemyCutin.tsx:64` は TSX 不変。kenburns（`:3550-3556` `scale(1.06) translateX(2%)`）は `transform`＝独立 `scale` と合成され pan が左へ 2% になるだけ。v2 art（右向き）導入時は Brief §5-2 R2 の `artFacing` で HUD と同時に外す

**変えないもの**：DOM／JSX／`src/core`／画像／`.enemy-avatar` の `scale`・`translate`・`filter`（決定240／247）／`.player-avatar-wrap` の transform（決定249）／`--atk-x`／名札の font-size・文言／カードの寸法／入口／共鳴カットイン／勝利舞台／音。

### 6-2. 却下した案と理由【AI 判断】

| 案 | 内容 | 却下理由 |
|---|---|---|
| A 一律 scale | `.enemy-avatar`／`.player-avatar` に `scale: 1.2` | 箱を超えて描画＝名札・隣列に食い込む。決定247 の `scale: -1 1` と同じプロパティで衝突（上書き）。着弾レイヤー（inset:0）と絵がずれる＝決定229 の「着弾中心が絵の中」を壊す |
| B 名札の縮小（PC） | plate min-height 78→48（名前＋HP を 1 行） | 得られるのは +30px（×1.15）のみ。決定203／205 の可読性成果（名札の情報）を削る。P-1 は +84px（×1.43）で可読性不変 |
| C ドックの縮小 | PC カード 164→150・託宣バー圧縮 | +24px（×1.12）。カードの読みやすさ（決定238 の文字あふれ）を再び危険に。CEO の要望は「キャラを大きく」であり「カードを小さく」ではない |
| **D 奥行き対峙（重なり許容）** | SP で敵箱 0.62×床・神箱 0.56×床を 18〜34% 重ね、神を手前・下に、敵を奥・上に | 敵 ≈7.3〜7.5% まで届くが、ink が静止時 18〜58px 重なる＝決定229 で CEO 指示「読みやすさ・演出位置を壊すなら縮小する」により却下した案②の再提出になる。`.slash-fx inset 22% 10%`・決定240 special の足元環（幅 0.72×箱）・魔獣の突進 26px が重なり域に入る。**Phase 2 候補として保留**（本 Pilot の Human QA で「まだ小さい」が出た場合に限り、別 Preflight で） |
| E SP 2 段 HUD | SP の 3 列名札を 2 段にして立ち絵の帯を広げる | 幅の束縛は変わらない（正方形 art）。決定228／230 の名札 Hotfix を巻き戻す |
| F 入口の左右入替＋反転 | 入口を HUD と同じ敵左／神右へ | 決定254 CEO Q2 YES の PASS 済み画面。連続性の価値はあるが本件の所感①②の主因ではない。Phase 2 |
| G 敵ごとの向きデータ `artFacing` | 魔獣だけ反転しない | runtime（`enemies.ts`＋TSX）＝本 Preflight の「CSS のみ」の外。Brief §5-2 の v2 1 体目で導入 |

---

## §7. Regression Risk（決定別の衝突点と回避策）

| 決定 | 衝突点 | 回避策 |
|---|---|---|
| **229**（着弾中心が絵の中・SP 3 列固定） | SP：式の形は不変（basis・0.88・6px）。床幅と比率だけ変更＝箱ごと動くので `.enemy-hit-layer`／`.player-hit-layer`（inset:0）は追従。PC P-1：箱が 196→280 の正方形になり `floating-number top:34%` が trim の低い機工師（0.48）で胸より上に出る可能性 | Fast Gate で 7 敵 × 4 viewport の「着弾中心 ∈ ink bbox」100% を再計測（決定229 の alpha>32 方式を再利用）。外れたら `--comp-stage` 上限 300→280 |
| **240**（構えグロー・足元環） | `.enemy-avatar` の `filter`／`translate`／`::after` に触れない。環は `height: 9%`・aspect 8/1＝箱基準で追従 | 本ブロックは `.enemy-avatar` に `max-width` のみ |
| **247**（反転） | `scale: -1 1; --atk-x: -1` は `.enemy-avatar`。本ブロックは `scale` を書かない。F-1 は別要素 `.enemy-cutin-image` | Fast Gate：computed `scale` が PC／SP とも `-1 1`、cutin 画像も `-1 1` |
| **249**（反応 wrapper の transform） | `.player-avatar-wrap` の `rl-*` animation は transform。本ブロックは `.player-avatar-wrap > div` の `justify-content` のみ（layout）＝合成なし。`.enemy-reaction-idle.rl-stagger` も不変 | Fast Gate：GUARD／MEND 反応で `animationName` が `rl-brace`／`rl-breathe` のまま、主体＝立ち絵 wrapper |
| **250**（カットイン動画の位置） | `.resonance-cutin-*` は `position: fixed`（`:1511`）＝舞台 layout と独立 | 触れない。Smoke で 1 回目視 |
| **252**（環・カットイン） | 紅蓮の充填（`:3982`）＝filter のみ。必殺カットイン（fixed `:3446`）は F-1 で鏡像化 | 鏡像で「砲口が神の方」になる＝意図どおり。Fast Gate で 7 体の cutin 1 枚ずつ |
| **254**（入口の HUD 箱差 0・T5） | `battleEntrance.test.ts:26` は決定254 コメント〜**ファイル末尾**を slice＝新ブロックを末尾に置くと test の対象に混入する | **新ブロックは `:7227` の直前に挿入**。T5「入口あり／なしで HUD 箱差 0」は同一 build 内比較＝layout 変更は両側に等しく掛かり差 0 |
| **232**（末尾の reduce ブロック前提 `combatTimeline.test.ts:359`） | 新ブロックに `@media (prefers-reduced-motion: reduce)` を書くと「最後の reduce ブロック＝232」が崩れる | reduce を書かない（決定240／249 と同じ作法） |
| **241**（result-toast）・mini-result | `top: max(104px, 32%)`（`:2092`）・`bottom: 10px`（`:5731`）が近づいた神・敵の頭／足元に 0.7〜1.4s 重なる | pointer-events なし・z 3〜4 で可読性は保つ。Known。必要なら toast の `left` を OTOMO 列側へ寄せる微調整（別 Hotfix） |
| **238**（カード文字あふれ）・**257**（音） | 無関係（カード寸法・音は不変） | — |
| **viewport test** `battleViewportLayout.test.ts:96-110` | 「名札が立ち絵より上」は **TSX の DOM 順**を見る＝grid で視覚順を変えても DOM 不変で PASS | — |

---

## §8. Fast Gate 案（1 browser／1 run 直列・ローカル build・既存 harness 再利用）

| # | 項目 | 計測 | 合格 |
|---|---|---|---|
| G1 | 面積比（px²／画面） | 1508×660・1280×800・390×844・390×660 × 大耀×7 敵＋7 神×龍神（13 組）の calm フレームで ink bbox（alpha>32・決定229 方式） | PC660：敵 ≥4.0%・神 ≥4.0%・OTOMO ≤0.3%／SP844：敵 ≥6.0%・神 ≥6.0%・OTOMO ≤0.4%／神÷敵 ink 高 0.9〜1.1 |
| G2 | キャラ vs カード | ink 高 ÷ `.card-view` 高 | PC ≥1.2・SP ≥1.0 |
| G3 | 着弾中心が絵の中 | `floating-number`／`impact-ring` 中心 ∈ ink bbox | 7 敵 × 4 viewport ＝ 28/28 |
| G4 | 重なり 0 | 敵–神 ink bbox gap（静止）・神–OTOMO・名札–絵の頭 | ≥6px・≥0・≥4px |
| G5 | HUD 箱差（決定254 T5） | 入口あり／なしの `.enemy-plate`・`.player-plate`・`.god-otomo-plate` getBoundingClientRect | 差 0 |
| G6 | 決定249 反応の主体 | GUARD／MEND で `.player-avatar-wrap` の animationName | `rl-brace`／`rl-breathe`・敵 `rl-stagger` |
| G7 | 決定247 反転 | computed `scale` | `.enemy-avatar` PC/SP `-1 1`・`.enemy-cutin-image` `-1 1` |
| G8 | 横スクロール 0 | `scrollWidth ≤ innerWidth`（document／`.hand` 以外） | 4 viewport |
| G9 | console | error 0・warning 0（新規） | 0 |
| G10 | 入力ロック不変 | 決定254 `gate-lock.mjs` 再実行（カットイン中のカード押下拒否） | 既存と同値 |
| G11 | 回帰 | `tsc`／lint／vitest 全件（1,235+）・build・CSS 以外の bundle 内容同一 | PASS・JS 同一 |

evidence：`docs/evidence/decisionNNN/pilot/`（4 viewport × 13 組 ＝ 52 枚＋cutin 7 枚）。1 run で ≈4 分【推測】。

---

## §9. Human QA（CEO・最大 4 問・PC 1 戦＋iPhone 1 戦）

1. **敵は神の方を向いていますか**（戦闘中の立ち絵と、敵の必殺カットインの両方で）
2. **敵と神はカードより大きく、「戦っている」ように見えますか**（PC と iPhone それぞれ）
3. **OTOMO は「相棒」として邪魔にならない大きさ・位置ですか**（小さすぎて消えていないか）
4. **名札（HP・予告）と手札は読みにくくなっていませんか**（PC で名札が立ち絵の横に移った点を含む）

判定：Q1・Q2 が YES で採用。Q3 NO（消えた）→ OTOMO 0.6→0.7。Q4 NO → P-1 を撤回し P-2＋S-1＋O-1＋F-1 のみで再 Gate。

---

## §10. GO／HOLD【AI 判断】

**GO（条件つき）**：CSS 1 ブロック（約 120 行・`--comp-*` 変数 6 個）の Narrow Pilot として実装可。条件＝(1) 決定254 ブロックの直前に挿入 (2) reduce の @media を書かない (3) Fast Gate G1〜G11 PASS (4) CEO Human QA 4 問。
**HOLD**：案 D 奥行き対峙／入口の左右入替／魔獣・笑蓮・才華の個別向き（`artFacing` データ化は v2 art 1 体目で・asset は Brief v1.1 HOLD 継続）。
**実装開始は CEO GO 後**（CLAUDE.md §6-5）。推定工数：実装 1h・Gate 1 run・docs 30 分【推測】。

---

## §11. 実装しなかったこと・runtime 変更 0 の証明

- 本書は docs 1 ファイルのみ。runtime／CSS／TSX／画像／`src/core`／`package.json`／Production／`docs/DECISIONS.md` 変更 0。画像生成・ブラウザ・Playwright・build・vitest・simulation・外部サービス 0。他レーン（`SevenGodsGame-d254-rc`・決定259・Final Practical QA Session 3）に未接触
- 証明（commit 直前に実行・結果は commit message と最終報告に記載）：
  - `git -C C:/Users/kimi1/SevenGodsGame-comp status --porcelain` → docs 以外 0
  - `git -C C:/Users/kimi1/SevenGodsGame-comp diff --stat 694dd0b -- src public package.json` → 0 行
- 画像寸法は WebP ヘッダ（RIFF/VP8X）を node 1 行で読んだのみ（生成・変換 0）。evidence 画像は既存（決定247／250／252／254）の閲覧のみ・新規撮影 0
