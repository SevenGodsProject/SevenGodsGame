# HUD Premium PRE-AUDIT — 戦闘 HUD の「Web アプリ感」の実測・原因・Narrow Pilot 設計

- 日付：2026-09-27／作成：AI（旧 Lane 1 枠・監査／原因／設計のみ）
- 対象コード：Production と同一の worktree `C:/Users/kimi1/SevenGodsGame-d230-rc`（`45bfc9e`＝決定230 を含む Production）
- **runtime 変更 0**（`src/`・`public/`・package・テスト・`docs/DECISIONS.md` 未編集。branch／worktree／commit／push／deploy なし）。build もしていない（既存 `dist` を `vite preview :4221` で配信し、計測後に停止済み）
- 証拠：`scripts/hud-premium-audit/`
  - `inventory.mjs`：HUD 51 セレクタの形・材質・書体（CDP で実際に描画に使われたフォント）・絵文字・近似コントラスト・寸法を 5 画面（SP 360×780／390×844／430×932、PC 1280×800／1508×660・DPR 2・SP は touch）× 2 組（蒼毘×藍花の怨霊＝得意技バッジあり／大耀×蒼海の龍神）× 2 局面（開始直後 calm／3 手後 mid）で採取。`PROTO=` で CSS をページ内に一時注入してプロトタイプを撮る
  - `proto-a-plate.css`（案A）・`proto-b-font.css`（案B）・`proto-c-dock.css`（案C）・`diff.cjs`（Before と各案の寸法差）
  - 出力 `out/`：`base-inventory.json`・`protoA/B/C-inventory.json`・全画面／等倍切り出し（`*-crop-topbar|plates|dock.png`）
- 判断はすべて **AI 判断**（CLAUDE.md §6-2：軽微な UI 調整・既存仕様の範囲内の改善）。§6-3 に該当する事項なし

---

## 0. 結論

| 項目 | 結論 |
|---|---|
| Web アプリ感の正体（実測） | ① **「半透明の角丸箱＋白ヘアライン」が名札・上部バー・託宣・吹き出しで同じ文法**（角丸 8／10／12／14／18／20px＋pill＝7 種、ヘアライン `#ffffff14`、材質＝暗色グラデ 55〜80% 不透明）②**ゲージが全部 pill**（HP×2・共鳴・神力の 4 本＋バフ・得意技・ラウンドを終える。SP 5〜7 個／PC 6〜8 個）③**書体が OS の UI フォント 2 系統**（本文＝`system-ui` スタック、`<button>` 4 種＝UA 既定 `Arial`→Windows では Yu Gothic UI と Meiryo が同じ HUD に混在）④**絵文字**（常時 2：予告 ⚔・託宣 🙏。一時表示を含めると HUD のコード 18 箇所） |
| 決定225 の記述との差 | 「ガラス板（blur）」は**すでに名札・パネルでは無効**（`battle.css:3287` で `backdrop-filter: none`）。実測で blur が残るのは **app-header（6px）1 個だけ**。残っている「ガラス感」は blur ではなく**半透明＋ヘアライン＋角丸**の組み合わせ |
| 知覚品質への寄与が最大で、可読性リスクが最小の要素 | **アリーナ上部の名札 3 枚とその中のゲージ 3 本**（敵 HP・神 HP・共鳴）。毎ヒット・毎ターン視線が来る場所で、材質だけ変えれば**寸法は 1px も動かない**（実測 3,520 値で差 0・§4） |
| 推奨 Narrow Pilot | **HUD Plate & Gauge Material v1**：名札 3 枚を「漆黒の札＋金の細縁＋角金具」、ゲージ 3 本を「角の立った溝＋金枠＋上面の艶」、名札内のバッジを角丸 3px に。**新 asset 0・TSX 0・書体／文字サイズ／余白／文言 0 変更**。新規 CSS 1 ファイル＋ import 1 行 |
| 却下（今回） | 書体変更（SP 360 で「あと7で神技発動」2→3 行・共鳴札 +18px＝決定230 の回帰）／ドック操作の形（寸法が最大 28px 動く・決定164 レイアウト Gate のやり直し）／絵文字→SVG（TSX＋テスト 2 本＋Lane2 と同じ `BattleScreen.tsx`） |
| Lane 競合 | Lane2（`battle.css` 末尾・`BattleScreen.tsx`・`PlayerPanel.tsx` ほか）・Lane3（カード）の**どのファイルにも触れない**配置にする（§6-1） |
| CEO 判断 | **不要**（§6-3 非該当）。Release は通常どおり CEO 承認 |
| NEXT NOW | §9：Production `45bfc9e` から Pilot ブランチを切り、§6 の 2 ファイルを実装 → §7 の自動 Gate → Before/After Human QA |

---

## 1. HUD INVENTORY（実測・`out/base-inventory.json`）

### 1-1. 画面全体の集計（戦闘画面・見えている要素のみ。カード内は除外）

| 指標 | SP 360／390／430 | PC 1280／1508 | 備考 |
|---|---|---|---|
| `backdrop-filter` を持つ要素 | **1**（app-header `blur(6px)`） | 1 | 名札・パネルは `battle.css:3287` で無効化済み。上部バーも実測 null |
| pill（角丸 ≥ 高さ/2・横長） | **5**（ap-gauge・ap-fill・hp-bar×2・resonance-gauge）＋mid でバフ 1 | **6〜8**（上記＋得意技バッジ・ラウンドを終える・バフ） | SP の得意技バッジは決定230 で角丸 8px の札に変更済み |
| 円（50%） | 3（ヘッダーのアイコン）＋カードのコスト珠 | 同 | |
| 角丸の種類（pill 以外） | **7 種**：50%・8・10・12・14・18・20px | 同 | 決定225 W3「階層による差がない」を再確認 |
| 計算上のフォント（`font-family`） | 2 スタック：`system-ui, 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP'`（14〜22 要素）＋ **`Arial`（6 要素＝`<button>`）** | 同 | `<button>` は `font-family` を継承しない（UA 既定）。`index.css:3` は `:root` にしか指定していない |
| 実際に描かれたフォント（CDP・Windows Chromium） | 本文：**Yu Gothic UI**／ボタン（託宣・ラウンドを終える）：**Meiryo**／予告の ⚔：**Segoe UI Symbol** | 同 | 同じ HUD に和文 2 書体＋記号 1 書体 |
| 常時見える絵文字（HUD） | **2**：⚔（`.intent`）・🙏（`.divination-panel-title`） | 2 | カード内 5（Lane3 範囲） |
| 一時表示を含む絵文字のコード箇所（HUD） | **18**：予告 `cardStyle.ts:98-110`（⚡🔥🔥⚔🔥💥⚔）、ブロック 🛡（`EnemyPanel:127`・`PlayerPanel:103`）、🙏（`DivinationPanel:38`）、バナー ✨🌱⚔（`BattleScreen:516/522/528`）、ミニ結果 ⚔🛡✨🔥（`BattleMiniResult:91-124`）、敵カットイン 🔥（`BattleEnemyCutin:69`） | 同 | 結果画面（💠✨⛩）は HUD 外 |

### 1-2. 要素別（代表：蒼毘×藍花の怨霊・mid。寸法は SP 360／PC 1508）

| 要素 | 形（radius） | 材質 | 書体・サイズ・太さ | アイコン | 近似コントラスト※ | SP 360 寸法 | PC 1508 寸法 | Web 信号 |
|---|---|---|---|---|---|---|---|---|
| app-header | 0 | **blur 6px**＋縦グラデ＋金ヘアライン | system-ui 16/800（タイトル字間 .22em） | SVG 3（円ボタン 26px） | 12.9〜15.4 | 360×35 | 1508×35 | blur・円いアイコンボタン |
| 上部バー `.battle-topbar` | 12px | 斜めグラデ b0→c0＋金ヘアライン `#ffd16633` | system-ui 13/600 | なし（文字「ラウンド／神力／スコア」） | 15.3 | 348×42.5 | 1240×42.5 | ダッシュボードの見出し帯。PC では 3 語が 1240px に散る |
| 神力ゲージ `.ap-gauge` | **pill** | 単色 `#16203c`＋青グラデ | — | — | — | 58.6×6 | 58.6×6 | pill |
| 名札 `.enemy/.player/.god-otomo-plate` | 10px | 縦グラデ `#05060dcc→8c`＋白ヘアライン `#ffffff14` | 名前 12.5〜14/700 | — | 16.6 | 112×93／89×72／65×128.5 | 456×86／383×78／294×77 | 半透明角丸箱（最大の Web 信号・常時・視線の中心） |
| HP バー `.hp-bar` | **pill** | 単色トラック＋単色 fill（inline `background`）＋ゴースト | ラベル 11/400・中央 | — | **白×赤 fill 3.24／白×緑 fill 1.96**（`text-shadow 0 1px 2px` 頼み） | 98×18 | 438×18 | pill・フラット |
| 予告 `.intent` | 0 | なし | 17（SP）／20（PC）/700 | **絵文字 ⚔**（Windows では Segoe UI Symbol のモノクロ、端末で字形が変わる【推測：iOS では U+2694 がカラー絵文字で出ることがある】） | 11.9 | 36.5×21 | 43×25 | 絵文字 |
| バフ `.badge-buff` | **pill** | 単色 `#241a38` | 10（SP）／12（PC） | — | 7.4 | 81×15 | 104×22 | pill（決定228 で 10px 1 行化） |
| ブロック `.badge-block` | pill | 単色 | 同 | **絵文字 🛡** | — | — | — | pill＋絵文字 |
| 得意技 `.god-passive-badge` | 8px（SP・決定230）／**pill**（PC） | `#ffffff0d`＋ヘアライン | 10/400 | — | 7.75 | 61×32 | 97×21 | pill |
| 共鳴ゲージ `.resonance-gauge` | **pill** | 単色トラック＋金→橙グラデ fill | ラベル 10/700・中央 | — | 空 13.3／**金 fill 上 1.19・橙 1.67**（影頼み） | 47×16 | 276×16 | pill・フラット |
| 「あと N で神技発動」 | 0 | なし | 12/800 金 | — | 16.8 | 47×36（2 行） | 276×18 | — |
| 吹き出し | 10〜12px | グラデ＋紫ヘアライン | 11〜12 | — | 13.7 | 96×33 | — | チャットの吹き出し |
| 託宣パネル | 10px | グラデ＋紫ヘアライン | 見出し 10〜11/700 | **絵文字 🙏**＋SVG 3 | 9.3 | 348×69 | 1240×56 | 半透明箱＋絵文字 |
| 託宣ボタン `.divination-choice` | 8px | 単色＋1px 枠 | **Arial→Meiryo** 10〜11 | SVG グリフ 22px | 9.1〜15 | 73×39 | 342×44 | CSS ボタン・書体混在 |
| ラウンドを終える | **pill**（SP は 48px の円） | 金グラデ 26→0a＋金 1px 枠＋外光 | **Arial→Meiryo** 10（SP）／13（PC）/700 | — | 10.1 | 48×44.5（**3 行折返し**） | 112×62（**「ラウンドを終／える」と語中で折返し**） | pill ボタン・語中折返し |
| ログ | 8px | 半透明＋白ヘアライン | Arial→Meiryo 10〜11/700 灰 | — | **4.95**（最低） | 44×44.5 | 112×29 | 灰色の汎用ボタン |

※近似コントラスト：文字色と「祖先の背景色＋最初のグラデ色を夜空 `#080a1c` に重ねた色」の比（WCAG 式）。背景画像は無視＝**近似値**。ゲージのラベルはトラック（空）と fill 上を別計算。

### 1-3. 読みやすさの既存保護（崩してはいけない数値）
- 決定228：SP の 3 列 `minmax(0, 1.22fr / 1fr / 0.78fr)`＝列幅 **130／107／83px**（360）、バッジ **10px・padding 1px 4px・1 行**、吹き出し 2 行 30px
- 決定230：SP の共鳴札見出しは折返し可、「共鳴」1 行、得意技バッジは語の境目で折返し（10px/9px）、共鳴札 128.5〜140px
- 決定164：`battle-viewport` の一画面固定（topbar／arena／dock の grid）。予告は名札内で最大（PC 20／SP 17px）

---

## 2. ROOT CAUSE

| # | 原因（コード） | 結果 |
|---|---|---|
| R1 | **HUD の全部品が 1 つの「Web カード」文法から作られている**：`.panel`（`battle.css:413`）→名札（`:4672`）→託宣→吹き出しまで「暗色半透明グラデ＋1px 白/紫ヘアライン＋角丸 8〜14px」。材質の段（金属・漆・紙）も、縁の装飾（角金具・二重線・面取り）も無い | 何を見ても「ダッシュボードのカード」。決定225 の G3／W2／W3 |
| R2 | **ゲージと小部品の既定形が `border-radius: 999px`**（`.hp-bar :462`・`.resonance-gauge :790`・`.ap-gauge :105`・`.badge :555`・`.god-passive-badge :2551`・`.end-round-button :13`）。fill は単色（inline `background`）で艶・枠・端の意匠が無い | pill は Web UI 部品（プログレスバー・タグ・CTA）の記号。商業カードゲームのゲージは「枠に嵌った溝」が一般的【推測】 |
| R3 | **書体を OS に任せている**：`:root { font-family: system-ui … }`（`index.css:3`）のみで、`<button>` に `font: inherit` が無い → UA 既定（Arial→和文は OS 代替）。Windows では Yu Gothic UI／Meiryo が混在。明朝はカットインと勝利だけ（`battle.css:1738/6480`） | 文字の見た目がブラウザの既定値。ボタンだけ字形が違う |
| R4 | **アイコンを文字（絵文字）で持っている**：予告・ブロック・託宣・バナー・ミニ結果が文字列に絵文字を埋め込む（`cardStyle.ts:98-110` ほか 18 箇所）。一方、託宣ボタンとヘッダーは SVG グリフ（`cardIcon.tsx` の `GlyphIcon`）＝**2 系統** | 端末ごとに字形・色が変わる（Windows はモノクロ記号、iOS/Android はカラー絵文字【推測：OS の絵文字フォント依存】）。SNS／チャットの記号に見える |
| R5 | **ボタンの文言が幅に対して長いのに `word-break` 未指定**：「ラウンドを終える」が SP 48px 円で 3 行、PC 112px で「終／える」と語中改行 | CSS ボタンの既定挙動が露出 |

**根は R1＋R2＝「部品の材質と形」**。書体（R3）と絵文字（R4）は目立つが、変えると寸法と文言（テスト）が動く。材質と形は**寸法を変えずに**変えられる（§4 で実証）。

---

## 3. COMMERCIAL GAP

| 観点 | SEVEN GODS（実測） | 商業カードゲームの HUD の一般的な作り【推測：国内外のスマホ／PC カードゲーム一般の観察に基づく。特定タイトルの計測はしていない】 | 差の大きさ |
|---|---|---|---|
| 名札の材質 | 半透明の暗色箱＋白ヘアライン・角丸 10px | 不透明の地（漆・石・金属）＋装飾枠（角金具・二重線）＋落ち影。世界観の素材で「物」に見せる | **大**（常時・視線の中心） |
| ゲージ | pill・単色 fill・中央に小さな白文字 | 角の立った溝＋金属枠・fill に上面の艶と下面の陰・数値は太い縁取り文字 | **大**（毎ヒット見る） |
| 数値の書体 | system-ui 11px・比例数字 | 専用の数字書体または太い縁取り＋等幅数字 | 中 |
| アイコン | 絵文字＋SVG の 2 系統 | 1 系統の自前アイコン（同じ線幅・同じ色規則） | 中（常時 2 個） |
| ボタン | pill の金枠・UA フォント・語中改行 | 札・板の形、主要操作は大きく、文字は 1〜2 行で語を切らない | 中（SP で目立つ） |
| 階層 | 全部品が同じ角丸・同じ余白 | 重要度で材質と縁の強さを変える（主＝金縁、従＝暗い縁） | 中 |

**SEVEN GODS 独自性との関係**：金（`#ffd166`）と藍黒は既にブランド色。案A はこの 2 色だけで「神社の漆の札・金具」を表現し、新しい色系統を持ち込まない。

---

## 4. 候補比較（同じ盤面にページ内で CSS を一時注入して実測・`diff.cjs`）

| 案 | 内容 | 寸法差（Before 比・全 VP） | 知覚品質 | 可読性リスク | 実装・競合 | 判定 |
|---|---|---|---|---|---|---|
| **A 名札＋ゲージの材質** | 名札 3 枚：漆黒の不透明地＋金の細縁＋角金具／HP×2・共鳴：角 2px の溝＋金枠＋艶／名札内バッジの角丸 3px | **0**（3,520 値比較・|Δ|>0.5px は吹き出しの登場アニメ 4 件のみ＝全案共通のノイズ） | 高（常時・視線の中心。等倍切り出しで「箱」→「札」）pill 2〜4 個減 | 低：文字・サイズ・余白 不変。不透明度は上がる（地 55〜80%→94〜95%）＝文字の背景は暗く安定。ラベルの縁取りを強化 | 新 CSS 1＋import 1 行。Lane2／3 のファイルに触れない | **採用** |
| B 書体（明朝） | 名前・上部バー・「あと N」・ボタンを明朝へ | **129 件・最大 18px**。SP 360 で「あと7で神技発動」**2→3 行・共鳴札 128.5→146.5px**（決定230 の回帰）、上部バー「ラウンド」69→87px | 高（和の格） | **高**：SP の細い列で折返しが増える。Android の和文明朝は端末依存【推測：Noto Serif CJK が無い端末ではゴシックに落ちて見た目が不定】。Web フォントは和文で数百 KB〜数 MB（サブセットでも asset・ライセンス判断が要る） | 決定164／228／230 のレイアウト Gate をやり直し | 却下（Pilot にしない。数字だけの欧文ディスプレイ書体は将来候補） |
| C ドック操作の形 | ラウンドを終える／ログ／託宣を角 3〜4px・`font: inherit`・`keep-all` | **188 件・最大 28px**（SP：ボタン幅 48→62、ドック高 −3px、アリーナ +3px） | 中（語中改行の解消は明確な改善） | 中：手札・託宣の位置が動く＝誤タップ対策（決定77／164）の再検証 | `battle.css` の dock 周り（Lane3 のカード領域と隣接） | 保留（次の Pilot 候補 1 位。`font: inherit` と `word-break: keep-all` は hygiene として別扱いも可） |
| D 絵文字→SVG | 予告・ブロック・託宣の絵文字を `GlyphIcon` へ | 未計測（アイコン幅が変わる） | 中〜高 | 中：予告は「解く」の最重要情報。tier の識別（⚔/💥/🔥/⚡）を形で置き換える設計が要る | TSX 4〜6 ファイル＋`cardStyle.test.ts`・`fxToastText.test.ts`。バナーは Lane2 と同じ `BattleScreen.tsx` | 却下（今回）。A の後に「予告 1 行だけ」で別 Preflight |

プロトタイプ画像：`out/protoA-*-crop-plates.png`（After）と `out/base-*-crop-plates.png`（Before）、案B／C は `out/protoB-*`・`out/protoC-*`。

---

## 5. ONE RECOMMENDED NARROW PILOT — **HUD Plate & Gauge Material v1**

- 範囲：**アリーナ上部の名札 3 枚（敵・神・共鳴）とその中身**だけ。上部バー・ドック・吹き出し・バナー・トースト・結果画面・チュートリアル・カードは触らない
- 変えるのは**材質と角の形だけ**：`border-radius`・`border-color`・`background`・`box-shadow`・装飾擬似要素（`::before`／`::after`）・ラベルの `text-shadow`／`font-variant-numeric`
- 変えないもの：幅・高さ・padding・margin・gap・font-size・font-family・font-weight・文言・色トークン（金・赤・緑・紫は既存値の派生のみ）・アニメーション・z-index・DOM
- 新 asset 0（CSS グラデのみ）・TSX 0（import 1 行を除く）・`src/core` 0

---

## 6. FINAL SPEC

### 6-1. ファイル（Lane 競合回避を最優先に配置）

| ファイル | 変更 | 理由 |
|---|---|---|
| `src/components/battle/hudPlate.css`（**新規**） | §6-2 の CSS 全部 | `battle.css` は Lane2（末尾追記）・Lane3（カード）が触る。**同じファイルに入れない** |
| `src/components/battle/HpBar.tsx` | 先頭に `import './hudPlate.css'` の 1 行 | HpBar は敵・神の名札の両方が使う HUD 部品で、Lane2（`BattleScreen`・`PlayerPanel`・`combatTimeline`・`useBattleFx`・`enemyVfxTiming`・`battle.css`）／Lane3（`CardView`・`cardArt`）のどちらの変更対象でもない |
| `src/components/battle/hudPlate.test.ts`（新規・任意だが推奨） | `hudPlate.css` を読み、**寸法系プロパティ（width／height／min-*／max-*／padding／margin／gap／font-size／font-family／line-height／display／position 以外の配置）が 0 件**であること、全セレクタが `body.battle-viewport .battle-main` で始まることを検査 | 「材質だけ」の契約を機械的に守る（`battleViewportLayout.test.ts` の CSS 読み取りと同じ手法） |

- **読み込み順に依存しない**：HpBar は `BattleScreen` の `import './battle.css'`（48 行）より先に評価されるため、CSS は battle.css より前に入る。よって全セレクタを `body.battle-viewport .battle-main …`（詳細度 0,3,1 以上）にし、既存の競合ルール（最大 0,3,1：`body.battle-viewport .god-otomo-plate .god-passive-badge`）には **0,4,1** で勝つ。`position: relative` は既存（`battle.css:6644` SP の `z-index: 2` を含む）を上書きしない＝**z-index は宣言しない**
- チュートリアル（`TutorialOverlay.tsx` の `.hp-bar`／`.resonance-gauge`）は `.battle-main` の外なので不変（意図どおり。見た目の差は次段で揃える）

### 6-2. CSS（`proto-a-plate.css` をセレクタ強化したもの。値は実測で確認済み）

```css
/* HUD Plate & Gauge Material v1 — 材質と角の形だけ。寸法・書体・文言は変えない */

/* 名札 3 枚：漆黒の札＋金の細縁＋角金具 */
body.battle-viewport .battle-main .enemy-plate,
body.battle-viewport .battle-main .player-plate,
body.battle-viewport .battle-main .god-otomo-plate {
  border-radius: 3px;                         /* 10 → 3 */
  border-color: #b8914a8c;                    /* #ffffff14 → 金 55% */
  background:
    linear-gradient(180deg, #ffe7b012 0%, #ffe7b000 26%),   /* 上面の艶 */
    linear-gradient(180deg, #110d19f0 0%, #07060cf2 100%);  /* 地：80〜55% → 94〜95% 不透明 */
  box-shadow:
    inset 0 0 0 1px #000000b3,                /* 金縁の内側の黒線＝二重縁 */
    inset 0 2px 0 -1px #ffe3a026,             /* 上辺のハイライト */
    0 3px 8px -2px #000000cc;                 /* 落ち影（舞台から浮かせる） */
}
body.battle-viewport .battle-main .enemy-plate::before,
body.battle-viewport .battle-main .player-plate::before,
body.battle-viewport .battle-main .god-otomo-plate::before {
  content: '';
  position: absolute;                         /* 親は既存で position: relative（:6644 ほか） */
  inset: -1px;
  pointer-events: none;
  --k: #e2bd6a;                               /* 角金具 7×2px の L 字 ×4 */
  background:
    linear-gradient(var(--k), var(--k)) left top / 7px 2px no-repeat,
    linear-gradient(var(--k), var(--k)) left top / 2px 7px no-repeat,
    linear-gradient(var(--k), var(--k)) right top / 7px 2px no-repeat,
    linear-gradient(var(--k), var(--k)) right top / 2px 7px no-repeat,
    linear-gradient(var(--k), var(--k)) left bottom / 7px 2px no-repeat,
    linear-gradient(var(--k), var(--k)) left bottom / 2px 7px no-repeat,
    linear-gradient(var(--k), var(--k)) right bottom / 7px 2px no-repeat,
    linear-gradient(var(--k), var(--k)) right bottom / 2px 7px no-repeat;
}

/* ゲージ（敵 HP・神 HP・共鳴）：pill → 溝＋金枠＋艶 */
body.battle-viewport .battle-main .hp-bar,
body.battle-viewport .battle-main .resonance-gauge {
  border-radius: 2px;                         /* 999 → 2 */
  background: linear-gradient(180deg, #05060b 0%, #10142a 100%);
  box-shadow:
    inset 0 1px 2px #000000e6,
    0 0 0 1px #b8914a73;
}
body.battle-viewport .battle-main .hp-bar::after,
body.battle-viewport .battle-main .resonance-gauge::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;                                 /* fill(1) の上・label(2) の下。hp-bar は isolation: isolate 済み */
  pointer-events: none;
  background: linear-gradient(180deg, #ffffff38 0%, #ffffff0a 42%, #00000000 55%, #00000040 100%);
}
body.battle-viewport .battle-main .hp-bar-label,
body.battle-viewport .battle-main .resonance-gauge-label {
  z-index: 2;
  font-variant-numeric: tabular-nums;         /* 減っていく数字の横揺れを止める（幅は不変を Gate で確認） */
  text-shadow: 0 0 2px #000, 0 1px 2px #000, 0 0 1px #000;  /* 白×緑 1.96・白×金 1.19 を縁取りで補う */
}
body.battle-viewport .battle-main .hp-bar.hp-bar-quarter {   /* 決定162「追い詰めた」の赤い外周は残す */
  box-shadow: inset 0 1px 2px #000000e6, 0 0 0 1px #ff5c5c99, 0 0 12px #ff5c5c55;
}
body.battle-viewport .battle-main .resonance-gauge-wrap::after {  /* 決定95 の mid/high グローの形を溝に合わせる */
  border-radius: 3px;
}

/* 名札内のバッジ：pill → 札（角丸だけ。10px・padding・折返しは決定228/230 のまま） */
body.battle-viewport .battle-main .enemy-plate .badge,
body.battle-viewport .battle-main .player-plate .badge,
body.battle-viewport .battle-main .god-otomo-plate .god-passive-badge {
  border-radius: 3px;
}
```

### 6-3. SP／PC
- 同一 CSS（メディアクエリ無し）。寸法を変えないため SP 専用の分岐は不要。実測：SP 360／390／430・PC 1280／1508 で寸法差 0
- 角金具 7px は SP の最小札（共鳴 65×128.5・神 89×72）でも文字と重ならない（padding 4〜8px の外側・`inset: -1px` の縁上）

### 6-4. reduced-motion
- 本 Pilot は**アニメーションを追加しない**（静的な材質のみ）。既存の `resonance-ready-flash`（`box-shadow` の keyframes は宣言より優先されるため READY の閃光は残る）・決定95 の呼吸グロー・`badge-block-pulse` と、その reduced-motion 分岐（`battle.css:4208` ほか）は不変

### 6-5. 性能
- `backdrop-filter` を**増やさない**（現状 1 → 1）。追加は静的な擬似要素 6 個（グラデのみ・アニメなし）。HP の幅トランジションは既存どおり fill だけが再描画され、艶の `::after` は不変【推測：合成コストは無視できる。実機 fps は Gate で確認】
- 付記：headless Chromium の rAF（16〜20fps）はソフトウェア描画のため性能判断に使わない

### 6-6. 既存決定との整合
| 決定 | 整合 |
|---|---|
| 224（Premium Payoff・READY 素材） | カード・⚡の見た目に触れない。金の色味（`#e2bd6a`／`#b8914a`）は READY の金（`#ffd166`）より一段暗くし、**⚡・READY より目立たせない**（HUD は舞台の脇役） |
| 226（勝利の舞台） | 勝利・結果画面に触れない |
| 228（SP 列幅・バッジ 1 行・吹き出し） | 列幅 130／107／83・バッジ 10px・padding・1 行・吹き出し 30px をすべて不変（寸法差 0 を Gate で再確認） |
| 229（SP 舞台レイヤー） | 名札の高さ不変＝立ち絵の上端・足元不変。不透明度が上がる分、名札の後ろの月・背景は見えにくくなるが、名札の面積は不変 |
| 230（得意技バッジ・共鳴見出し） | バッジの角丸だけ 8→3px。`word-break`・折返し・幅 `calc(100% + 14px)`・10/9px は不変 |
| 162（HP ゴースト・追い詰め） | ゴースト・fill・ラベルの z 順（0/1/2）を維持。`hp-bar-quarter` の赤外周を明示的に残す |

### 6-7. Lane 競合回避
- **Lane2（hit weight）**：`battle.css` 末尾追記・`BattleScreen.tsx`・`PlayerPanel.tsx`・`combatTimeline.ts`・`useBattleFx.ts`・`enemyVfxTiming.ts`・`combatTimeline.test.ts` → 本 Pilot は**どれにも触れない**。視覚上の接点は敵の被弾揺れ（`.enemy-avatar` 側）だけで、名札は揺れの対象外
- **Lane3（card layout）**：`CardView.tsx`・`cardArt.ts`・カード素材 → 触れない。`.card-view` 内のセレクタを 1 つも書かない
- マージ順はどれが先でも衝突 0（テキスト上の重なり無し）

---

## 7. ACCEPTANCE CRITERIA

### 7-1. 自動 Gate（数値）
| # | 基準 | 方法 |
|---|---|---|
| A1 | HUD 51 セレクタの x/y/w/h 差が **全 VP（360／390／430／1280／1508）× 2 組 × 2 局面で |Δ| ≤ 0.5px**（吹き出しの登場アニメは除外） | `inventory.mjs` を Before（Production）／After で実行し `diff.cjs` |
| A2 | 名札内の pill 0（HP×2・共鳴・バフ・ブロック・得意技）。画面全体の pill（calm）：SP 5→**2**（神力ゲージのみ）／PC 6〜8→**3〜5**（プロトタイプ実測） | 同（`totals.pills`） |
| A3 | `backdrop-filter` 要素数 1 のまま（増やさない） | 同 |
| A4 | `hudPlate.css` に寸法・書体系プロパティ 0 件、全セレクタが `body.battle-viewport .battle-main` 始まり | `hudPlate.test.ts` |
| A5 | `npm test`・`tsc`・`lint`・`build` 全通過。既存 `battleViewportLayout.test.ts`・`godStrikeStage.test.ts` 不変で通過 | CI 相当 |
| A6 | 決定95 のグロー（mid/high）・READY 閃光・`hp-bar-quarter`・ブロックパルスがそれぞれ発生すること（撮影で目視確認） | Playwright で共鳴 4〜7／HP 25% 以下の盤面を作って撮影 |
| A7 | コンソールエラー 0・pageerror 0 | 同 |

### 7-2. Human QA（Before＝Production／After＝Pilot・同じ seed・SP 実機＋PC）
1. 画面を開いた瞬間、上の 3 枚の札は「Web の箱」より「ゲームの札」に見えたか（Before と比べて）
2. 敵の HP・予告・バフ、神の HP、共鳴の数と「あと N」は、Before と同じ速さで読めたか（**遅くなっていないこと**が合格条件）
3. HP が減るとき、バーの減り方は Before より「削っている」感じがしたか（悪化していないか）
4. 金の縁や角金具が、⚡や READY のカード、神の一撃より目立って邪魔に感じたか（**NO が合格**）
5. 月や背景が札で隠れて寂しくなったと感じたか（YES の場合は地の不透明度 94%→88% を次の調整値とする）

---

## 8. Risks・触れないもの

| リスク | 対策 |
|---|---|
| 地の不透明度が上がり、名札の後ろの背景（月・社殿）が見えにくい | 名札の面積は不変。Human QA Q5。調整値は地の alpha のみ（寸法に影響しない） |
| 金縁が増えて「金＝特別（⚡・READY・神技）」の意味が薄まる | 金を 1 段暗く（`#b8914a` 55%・角金具 `#e2bd6a` 2px）。Q4 で確認。問題なら縁を藍（`#5a4a7a`）へ、角金具だけ金 |
| 詳細度 0,4,1 が将来の CSS と衝突 | `hudPlate.test.ts` でセレクタ接頭辞を固定。以後の HUD 材質変更はこのファイルに集約 |
| `tabular-nums` で数字幅が変わる | Gate A1 で HP／共鳴ラベルの幅を確認（ラベルは `inset: 0` の中央寄せで箱の幅に影響しない。実測差 0） |
| iOS Safari の擬似要素・`inset` 対応 | iOS 14.5+ で `inset` 対応【推測：現行対象端末では問題なし】。Human QA の SP 実機で確認 |
| チュートリアルのゲージが旧形のまま | 意図的（範囲外）。次段で揃える |

**触れないもの**：`src/core`・数値・save・文言・書体・文字サイズ・余白・上部バー・託宣・ラウンドを終える・ログ・吹き出し・バナー・トースト・ミニ結果・結果画面・カード（Lane3）・演出タイミングと被弾（Lane2）・`battle.css`・`docs/DECISIONS.md`（採用時に PM が追記）

**次の Pilot 候補（順）**：① 案C のうち hygiene 分（`<button>` の `font: inherit`＋「ラウンドを終える」の `word-break: keep-all`）＋ドック操作の札化（レイアウト Gate 込み）② 予告 1 行の絵文字→グリフ（tier の形を設計してから）③ 上部バーを同じ札の文法へ（PC で 3 語が散る問題を含む）④ 数字だけの欧文ディスプレイ書体（Web フォント・ライセンスは CEO 判断対象になり得る）

---

## 9. NEXT NOW（1 つ）

**Production `45bfc9e` から Pilot ブランチ（例 `feat/hud-plate-material-v1`）を切り、§6-1 の `hudPlate.css`（新規）＋`HpBar.tsx` の import 1 行（＋`hudPlate.test.ts`）を実装 → §7-1 の自動 Gate（`scripts/hud-premium-audit/inventory.mjs` で Before／After の寸法差 0 と pill 数）→ Before／After を並べて Human QA（§7-2）。**

---

## 10. Pilot 実装・Fast Gate（2026-09-27・AI 判断・Human QA 待ち）

### 10-1. 作業場所
- worktree：`C:/Users/kimi1/SevenGodsGame-hud`／branch：`feat/hud-plate-material-v1`（`master`＝`45bfc9e`＝Production から作成。**未 commit・未 push・未 deploy**）
- `dist` はビルド済みのまま残置（After＝`SevenGodsGame-hud/dist`）

### 10-2. 変更ファイル（+／−）
| ファイル | 変更 |
|---|---|
| `src/components/battle/hudPlate.css`（新規） | +94／−0（コメント込み） |
| `src/components/battle/HpBar.tsx` | +1／−0（先頭に `import './hudPlate.css'`） |
| `src/components/battle/hudPlate.test.ts`（新規） | +100／−0（9 テスト） |

`battle.css`・`BattleScreen.tsx`・`PlayerPanel.tsx`・`CardView.tsx`・`cardArt.ts`・`src/core`・`public/`・package：**変更 0**。

### 10-3. 仕様からの逸脱（すべて AI 判断・理由付き）
| # | 仕様（§6-2） | 実装 | 理由 |
|---|---|---|---|
| D1 | 名札に `position` を書かない（「親は既存で relative」） | 名札 3 枚に `position: relative`（オフセット無し・z-index 無し） | 実測で **PC の 3 枚と SP の共鳴札は `position: static`** だった（SP の敵・神だけ relative＋z-index:2）。このままだと角金具 `::before` が別の祖先を基準に描かれる。プロトタイプ（`proto-a-plate.css`）は relative を持っていた。名札内の絶対配置の子（`.intent-tier-*::after` 等）はすべて自分自身が relative のため基準は変わらない。寸法差 0 を A1 で確認 |
| D2 | ゲージの艶を `::after`（z-index:1）、ラベルに z-index:2 | **z-index を 1 つも宣言しない**。艶はラベル（`inset:0` の絶対配置で fill・ゴーストより上に描かれる既存要素）の `background` に敷く | 共鳴ゲージは stacking context を作らない（isolation 無し）ため、z-index:1/2 が名札・舞台の重なり順に漏れる恐れがある。ラベル背景なら「fill の上・文字の下」が z-index 無しで成立し、擬似要素も 2 個減る |
| D3 | 艶のグラデ `#ffffff38 0% → #ffffff0a 42% → 透明 55% → #00000040 100%` | `#ffffff38 0% → 透明 30% → 透明 62% → #00000040 100%` | 初回 Gate の実測で HP 数字の背景が明るくなり、コントラストが **3.24→3.13（敵 HP）・1.96→1.91（神 HP）** に低下＝§7 の「悪化させない」に抵触。艶を文字の帯（中央 30〜70%）から外して再計測し **3.24→3.24・1.96→1.96** に復帰 |
| D4 | 角金具の変数名 `--k` | `--hud-plate-corner` | グローバルな短い変数名の衝突回避（見た目は同一） |

### 10-4. 自動 Gate
| 項目 | 結果 |
|---|---|
| `hudPlate.test.ts`（A4：寸法・書体・z-index・animation 等の宣言 0／全セレクタ `body.battle-viewport .battle-main` 始まり／position・inset の用途固定／quarter の赤外周／pill 0／blur 0／`#ffd166` 不使用） | **PASS 9/9** |
| 対象 battle テスト（`battleViewportLayout`・`combatTimeline`・`godStrikeStage`・`readyMaterial`・`victoryReveal`＋hudPlate） | **PASS 57/57**。`pressFeel.test.ts` は Production（`45bfc9e`）に存在しない（他 Lane のファイル）ため対象外 |
| 全体 `npx vitest run --dir src` | 1174/1176 PASS。失敗 2 件は `src/core/engine/balanceSim.test.ts`（STAKE-01）と `src/core/replay/determinism.test.ts` の **5000ms タイムアウト**（他 Lane 並走による負荷。本変更は `src/core` 0・CSS のみ）。2 ファイルを単独・`--testTimeout 60000` で再実行し **18/18 PASS**（19.1s） |
| `npx tsc -b --noEmit` | **PASS**（出力 0） |
| `npx oxlint src` | **PASS**（警告・エラー 0） |
| `npm run build` | **PASS** |

### 10-5. 隔離・バンドル差（Before＝`SevenGodsGame-d230-rc/dist`）
- 変更は §10-2 の 3 ファイルのみ（`git status`：M 1・?? 2）。`src/core`／`public`／package：0
- JS：`437,394 → 437,394` bytes、**内容バイト一致**（`cmp` 差 0。CSS の読み込みは JS に何も足さない）
- CSS：`158,356 → 160,676` bytes（**+2,320**）、gzip -9 `29,439 → 29,840`（**+401 bytes**）。新 asset 0

### 10-6. ブラウザ Gate（§7-1 A1〜A3・A6・A7）
- 方法：`scripts/hud-premium-audit/gate-inventory.mjs`（`inventory.mjs` の派生。名札内 pill・**実画素コントラスト**・状態演出 A6 を追加）＋`gate-diff.cjs`。Before＝`vite preview :4242`（d230-rc、再ビルドなし）／After＝`:4241`（hud）。5 画面（SP 360×780／390×844／430×932・PC 1280×800／1508×660・DPR 2）× 2 組（蒼毘×藍花の怨霊＝得意技バッジあり／大耀×蒼海の龍神）× 2 局面（calm／3 手後 mid）、seed `hudaudit-<組>`（ASCII）
- 出力：`scripts/hud-premium-audit/out/gate/`（`before-sp`・`before-pc`・`after-v2-*`＝最終 CSS、`v1-after-*`＝D3 調整前、`gate-diff.txt`）
- 実画素コントラスト：対象要素の文字だけ透明にして背景を撮影し、文字行の中央帯の画素ごとに WCAG 比を出した中央値（**text-shadow の縁取りは含めない＝保守的**）

| # | 基準 | 結果 | 判定 |
|---|---|---|---|
| A1 | HUD 51 セレクタの x/y/w/h 差 |Δ| ≤ 0.5px | **3,440 値比較・|Δ|>0.5px 0 件・最大 0.0px**（除外：吹き出しの登場アニメ 12 件。別に 360/大耀 calm の一時トースト `mini-result` が Before のみ撮影時に在席＝表示タイミングの揺れで寸法差ではない） | PASS |
| A1' | 決定228（SP 列幅 130/107/83 等・バッジ 10px 1 行）・決定230（蒼毘 SP 360 の共鳴札・得意技バッジ・「共鳴」1 行） | 上記 0 件に `enemy/player/reso-panel`・`reso-plate`・`specialty-badge`・`reso-title`・`enemy-badge` を全 VP で含む | PASS |
| A2 | 名札内の pill 0／画面全体の pill（calm） | 名札内 calm/mid **3〜4/4〜5 → 0/0**（全 20 組）。全体 SP **5→2**（神力ゲージのみ）／PC 1280 **7〜8→4**・1508 **6〜7→3** | PASS |
| A3 | `backdrop-filter` 要素数 | **1→1**（app-header のみ）全組 | PASS |
| A6 | 決定95 mid/high グロー・READY 閃光・`hp-bar-quarter`・ブロックパルス | 全 10 組で mid＝opacity 0.45、high＝`arena-glow-breathe`（角丸 3px に追従）、READY＝`resonance-ready-flash`、quarter＝赤外周 `#ff5c5c` 維持、ブロック＝`badge-block-pulse`（角 3px） | PASS |
| A7 | コンソールエラー・pageerror | **0→0**（全組） | PASS |
| C | HP／予告／共鳴ラベルのコントラスト（中央値） | 敵 HP **3.24→3.24**・神 HP **1.96→1.96**（全組同値）／共鳴ラベル **13.31→16.11**／「あと N」**7.28〜15.51→15.62〜16.57**／予告 18/20 で上昇（例 SP 大耀 8.77→11.55）、PC 蒼毘の 2 計測のみ **12.00→11.86・11.91→11.85**（−0.5〜−1.2%、全値 11.4 以上＝AAA 7:1 の 1.6 倍） | PASS（許容差内。下記リスク R2） |

### 10-7. Known Risks
- **R1 神 HP の数字（白×緑）は元々 1.96 と低い**：本 Pilot で悪化はしていない（同値）が改善もしていない。可読性は縁取り（text-shadow 3 重に強化）頼み。次段で「fill を 1 段暗く」等を別途検討
- **R2 名札の地が不透明・わずかに温色になった分、名前の実画素コントラストは 15.6〜16.7 → 14.8〜15.6（−3〜−7%）**。全値 AAA の 2 倍以上で読み速度への影響は無いと判断（§7 の対象外項目）。Human QA Q2 で確認
- **R3 名札の後ろの月・背景が見えにくくなる**（地 55〜80% → 94〜95%）。Q5 で確認。調整は地の alpha だけ（寸法に影響しない）
- **R4 名札が PC で positioned になった（D1）**：z-index は付けていないため重なり順の変化は「同じ親の中で静的な兄弟より上に描く」だけ。撮影上は吹き出し・立ち絵・VFX との重なりに差は見られない。実機 Human QA でも確認
- **R5 headless 計測は負荷に弱い**：4 並列で PC の撮影が 30s タイムアウト、3 並列で初回遷移が 20s タイムアウトした（いずれも再実行で全件 PASS。ゲーム側のエラーは 0）
- iOS Safari の `inset`・擬似要素：SP 実機 QA で確認（§8 のとおり）

### 10-8. Human QA 計画
- **Before**＝`C:/Users/kimi1/SevenGodsGame-d230-rc/dist`（Production と同一）／**After**＝`C:/Users/kimi1/SevenGodsGame-hud/dist`。別ポートで `npx vite preview` し、同じ seed で並べて比較
- seed：`?seed=hudaudit-soubi-onryo`（蒼毘 × 藍花の怨霊）・`?seed=hudaudit-taiyo-ryujin`（大耀 × 蒼海の龍神）
- 見比べ用の画像：`scripts/hud-premium-audit/out/gate/before-sp/before-390x844-*.png` ↔ `after-v2-1/after-390x844-*.png`、`before-pc/before-1508x660-*.png` ↔ `after-v2-3/after-1508x660-*.png`（名札だけの拡大は `*-crop-plates.png`）
- 質問（はい／いいえ）：
  1. 上の 3 枚の札は、前より「ゲームの札」らしく見えますか？（はい＝合格）
  2. HP・予告・共鳴の数字は、前と同じくらいすぐ読めますか？（はい＝合格）
  3. HP が減るとき、前より「削っている」感じがしますか？（はい＝良い／前と同じでも可、悪くなったら不合格）
  4. 金の縁や角の飾りが、⚡や光るカード・神の一撃より目立って邪魔ですか？（いいえ＝合格）
  5. 札のせいで月や背景が隠れて寂しくなりましたか？（いいえ＝合格。はいなら札の地を少し透かす：94%→88%）

---

## 11. 決定235 — Human QA PASS と Release Gate（2026-09-27）

### 11-1. CEO Human QA — **PASS**
CEO 判定「HUD は Human QA PASS」。本 Pilot を **決定235 HUD Plate & Gauge Material v1** とする。

### 11-2. Release Gate — **PASS／Blocker 0 → PRODUCTION RELEASE READY（CEO 承認待ち）**
| 項目 | 結果 |
|---|---|
| commit | Human QA 済みの差分をそのまま local commit `84e636d`（`feat/hud-plate-material-v1`・3 ファイル +195。差分は `scripts/hud-premium-audit/out/hud-v1-qa.diff`） |
| RC | `release/d235-hud-plate-rc`（新規 worktree `C:/Users/kimi1/SevenGodsGame-hud-rc`・`npm ci`）。決定233・決定234 のリリース後の master `a3a363a` へ rebase → **`2389d21`**（衝突 0・親＝clean Production `a3a363a`・commit 1 つ） |
| Automated | full 96 files・**1,204 PASS**（他レーンの計測なしで実行・タイムアウト 0）／tsc 0／lint 0／clean build PASS |
| Isolation | 変更は `HpBar.tsx`（import 1 行）・新規 `hudPlate.css`・新規 `hudPlate.test.ts` のみ。`src/core`／`public`（assets 一致）／package 差分 0。**JS `index-B3NN-14B.js` は現 Production と md5 一致（`022a0de5…`）**＝CSS だけの変更 |
| QA 時との同等性 | CSS 増分は Production 比 +2,320B（gzip +338B）で QA 時の増分と同じ。`gate-inventory.mjs`（SP 390・PC 1508・蒼毘×藍花の怨霊・Before＝現 Production）：**寸法 696 値で |Δ|>0.5px 0 件**（決定234 の Dock と衝突なし）・名札内 pill 3〜5→0・blur 1→1・console error 0→0・コントラストは共鳴ラベル 13.3→16.1／HP 同値／名前 −3〜−7%（15.0 以上・QA 時の Known Risk と同じ） |
| Bundle（Production `a3a363a` 比） | JS ±0（md5 一致）／CSS 162,338→164,658B（**+2,320B**）／新規 asset 0 |
| Blockers | **0** |
| Rollback 先 | 現 Production deployment **`6689677741`**（`a3a363a`・決定234） |
| Release 手順（CEO 承認後のみ・未実施） | `git fetch . release/d235-hud-plate-rc:master`（fast-forward `a3a363a`→`2389d21`）→ push → 配信 bundle と RC の md5 一致確認 → Narrow Production Smoke（寸法差 0・名札内 pill 0・決定230 の得意技バッジ・console error） |

**状態：決定235 = Human QA PASS（CEO）／Release Gate PASS（AI 判断）／PRODUCTION RELEASE READY — CEO 承認待ち。**

---

## 12. 決定235 Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-27 JST・CEO 承認）
| 項目 | 値 |
|---|---|
| Release 直前 | master＝origin/master＝`a3a363a`／RC `2389d21`・worktree clean・commit 1 つ |
| merge／push | `git fetch . release/d235-hud-plate-rc:master`（fast-forward）→ `git push origin master`（17:10 JST・`a3a363a..2389d21`） |
| Vercel | deployment **`6689788618`**（`2389d21`・Production）success（2026-09-27T08:10:40Z） |
| 配信 bundle | `index-B3NN-14B.js`／`index-ijVH4wDy.css`＝RC build と **md5 一致**（JS は決定234 と同一） |
| Rollback 先 | **`6689677741`**（`a3a363a`・決定234） |

### 12-1. Narrow Production Smoke（`gate-inventory.mjs`＋`gate-diff`・Before＝直前の Production `a3a363a` build／After＝Production・SP 360／390・PC 1508 × 蒼毘×藍花の怨霊（得意技あり＝決定230 の札）・大耀×蒼海の龍神）
- 寸法：**2,064 値で |Δ|>0.5px 0 件**（最大 0.0px）
- 名札内の pill：calm 3〜4／mid 4〜5 → **0／0**。画面全体の pill 5〜6 → 2（AP ゲージのみ・対象外）
- blur 要素 1 → 1、console error 0 → 0
- 証跡：`scripts/hud-premium-audit/out/prod235/`

**Decision235 HUD Plate & Gauge Material v1 = PRODUCTION LIVE / CLOSED。** Production＝**`2389d21`**。
