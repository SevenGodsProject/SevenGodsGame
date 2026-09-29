# 決定228 — ② SP 緊急修正 Preflight：バフでプレートが縦に伸び、共鳴パネルが潰れる問題（実装前）

- 日付：2026-09-25
- 種別：**PREFLIGHT ONLY／docs-only**（runtime／tests／assets／branch／commit／push／deploy：すべて 0。計測はページへの CSS 一時注入のみで、ゲームコードは変更していない）
- 判断主体：AI チーム（CLAUDE.md §6-2：レスポンシブ対応・軽微な UI 調整・バグ修正）。実装 GO は CEO 判断（これまでの運用どおり）
- 前提：Production＝master＝origin/master＝`5263c3d`（決定226 Victory Reveal LIVE・決定227）。計測は同一 build（`index-B1Bpf-GW.js`）をローカル `:4190` で配信
- 対象：決定225 の SP-2（共鳴パネルが 1 文字幅に潰れる）と SP-3（バフ 3〜4 個で神／敵プレートが縦に伸びて舞台を覆う）。決定226 には混ぜていない

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| Verdict | **GO**（CSS のみ・SP のみ・`src/core`／TSX／文言／数値の変更 0） |
| 根本原因 | ①**敵の掛け声の吹き出し（`white-space: nowrap`）が grid の `fr` 列の最小幅（min-content）を押し上げ、敵列を最大 207px に太らせる → 神列 78px・共鳴列 49px に潰れる**（SP-2 と神側の SP-3）②バフのバッジ（≈104px）が敵列に 1 行 1 個しか入らず縦に積まれる（敵側の SP-3） |
| 修正（推奨 ABC） | A：SP の 3 列を `minmax(0, …fr)` にして比率を中身に関係なく固定／B：プレート内のバッジを 1 行化（10px・余白を詰める。文言は不変）／C：吹き出しを SP だけ 2 行まで折り返す（11px・高さ 30px。台詞を「…」で切らない） |
| 効果（最悪ケース） | 360px・大耀×龍神・バフ 3：共鳴列 49→**83px**・「あと N」8 行→**2 行**・神プレート 211→**87px**・神の立ち絵 136→**238px**。360px・寿楽×魔獣・デバフ 4：敵プレート 273→**165px**・敵の立ち絵 93→**201px** |
| PC | 影響 0（`max-width: 899px` 内のみ。PC 1508×660 で 3 案とも全数値が同一） |
| 追加の強制待機・timer・asset | 0／0／0 |
| NEXT NOW | **CEO GO 後、master `5263c3d` から `feat/d228-sp-plate-fix` を切り、§7 の CSS を実装 → Gate → Before/After Human QA** |

---

## 1. 現象の実測（Production 相当 build・Playwright・DPR 2・touch）

条件：SP 390×844／360×780／414×896、PC 1508×660。大耀×蒼海の龍神（seed `d225-taiyo-ryujin`）・寿楽×双牙の魔獣（`d225-juraku-juuma`）・恵比寿×業斧の鬼将・才華×銀甲の機工師。bot はバフ／デバフ札を優先して状態が付く盤面を作る。スクリプト・生データ：`scripts/decision228-sp-plate-preflight/`。

| 盤面 | 列幅（敵／神／共鳴） | プレート高（敵／神／共鳴） | 立ち絵高（敵／神） | 共鳴の文字 |
|---|---|---|---|---|
| 390・魔獣・バフ 0（設計どおり） | 142／117／91 | 97／72／94 | 334／301 | 「共鳴」1 行・「あと N」2 行 |
| 390・龍神・バフ 0 | **178／96／75** | 76／72／112 | 355／301 | 「あと N」3 行 |
| 390・龍神・バフ 3（神 2＋敵 1） | **207／80／63** | 102／**211**／149 | 331／**190** | 「共鳴」2 行・「あと N」4 行 |
| 360・龍神・バフ 3 | **207／78／49** | 102／**211**／**221** | 266／**136** | 「共鳴」2 行・「あと N」**8 行** |
| 390・魔獣・デバフ 4 | 142／117／91 | **180**／72／94 | **250**／301 | 正常 |
| 360・魔獣・デバフ 4 | 131／106／83 | **273**／72／112 | **93**／249 | 「あと N」3 行 |

- バフ 0 でも龍神だけ列が崩れている＝**バフが原因ではなく、敵列を太らせる別の要素がある**
- 神のバフ「攻撃力 +30（2）」1 個が 80px の列で **4 行**に折れる（「攻撃 / 力 / +30 / （2）」）
- 敵のデバフは 1 行に収まるが 1 行 1 個で縦に積まれる
- 横スクロールは全ケース 0。console error 0

## 2. 根本原因

### 2-1. 敵列が太る（SP-2・神側 SP-3）
- `body.battle-viewport .battle-main { grid-template-columns: 1.22fr 1fr 0.78fr }`（`battle.css` ≈5333・`max-width: 899px`）。`fr` の最小値は `auto`＝**中身の min-content**
- 敵パネル内で折り返さない最大の要素は**掛け声の吹き出し**（`white-space: nowrap`・`max-width: 94%`）。min-content の計算では `%` の max-width が効かず、台詞の全長（龍神は 149〜187px）が敵列の最小幅になる
- 実測：吹き出しの `scrollWidth` 186／158／187／149px と敵列 206／178／207／169px が回ごとに連動（台詞は毎ラウンド変わるため、**同じ戦闘でもラウンドごとに列幅が揺れる**）。魔獣（台詞 73〜131px）は列が設計どおり
- 結果：比率 1.22:1:0.78 が崩れ、神列と共鳴列が押し潰される。吹き出しは本来「…」で省略する設計（`text-overflow: ellipsis`）だが、列が太るため設計どおりに働いていなかった

### 2-2. 敵プレートが縦に伸びる（敵側 SP-3）
- `.enemy-plate-status`／`.buff-list` は `flex-wrap: wrap`。デバフのバッジ「攻撃力 -30（1）」は 12px 相当で ≈104px。敵列の内幅（≈114〜126px）に 2 個並ばず、1 行 1 個で縦に積まれる
- 寿楽のデッキはデバフ札が多く、R4 以降に 3〜4 個が常態化する

## 3. 修正候補の比較（同じ盤面にページ内で CSS を一時注入して比較・`probe.mjs`）

| 案 | 内容 | 360・龍神・バフ 3 | 360・魔獣・デバフ 4 | 副作用 |
|---|---|---|---|---|
| V0 現行 | — | 列 207/78/49・神プレート 211・神の絵 136・「あと N」8 行 | 敵プレート 273・敵の絵 93 | — |
| A | 3 列を `minmax(0, …fr)` | 列 130/107/83・神プレート 139（バッジ 2 行）・「あと N」2 行 | **変化なし**（273／93） | 吹き出しが設計どおり「…」で切れる。**全 49 台詞中 390px で 35、360px で 42 が省略**＝台詞が読めない |
| A＋B | ＋バッジ 1 行化（10px） | 神プレート 87・神の絵 239 | 敵プレート 165・敵の絵 201 | 吹き出しの省略は A と同じ |
| **A＋B＋C（推奨）** | ＋吹き出し 2 行（11px・高さ 30px） | 同上 | 同上 | **台詞の省略 0**（49 台詞すべて 2 行以内：360／390／414px）。吹き出しが敵の絵の頭に 4px 多く重なる（26→30px） |
| 却下：同じ能力のバフを 1 個に合算（「攻撃力 -140（1〜2）」） | TSX＋文言の変更 | — | 敵プレートはさらに低くなる | どのバフがいつ切れるかの情報が失われる。表示仕様の変更で緊急修正の範囲を超える |
| 却下：バフを舞台の上に重ねる（absolute） | — | — | プレート高固定 | 立ち絵を常時隠す。決定225 の「板が舞台を覆う」を別の形で再現する |
| 却下：「攻撃力」を「攻」などに略す | 文言変更 | — | 2 個並ぶ | 可読性・用語の一貫性が落ちる |

補足：**現行 Production でも長い台詞はすでに「…」で切れている**（龍神「小さき者よ、海の重みを…」など。`cutW` 実測）。C はこれも解消する。

## 4. 推奨案 ABC の実測（全ケース・`out/probe-sp.json`）

| 盤面 | 列幅 | プレート高（敵／神／共鳴） | 立ち絵（敵／神） | 共鳴 | バッジ最大行数 |
|---|---|---|---|---|---|
| 414・魔獣・デバフ 4 | 152/125/97 | 144/72/94（現行 180） | 339/346（現行 303） | 1 行／2 行 | 1 |
| 390・龍神・バフ 3 | 142/117/91 | 93/87/94（現行 102/211/149） | 342/291（現行 331/190） | 1 行／2 行 | 1 |
| 390・魔獣・デバフ 4 | 142/117/91 | 144/72/94（現行 180） | 287/302（現行 250） | 1 行／2 行 | 1 |
| 360・龍神・バフ 3 | 130/107/83 | 93/87/94（現行 102/211/221） | 277/238（現行 266/136） | 1 行／2 行 | 1 |
| 360・魔獣・デバフ 4 | 130/107/83 | 165/72/94（現行 273/72/112） | 201/250（現行 93/249） | 1 行／2 行 | 1 |
| PC 1508×660・魔獣・デバフ 4 | 478/405/316（**不変**） | 112/78/76（不変） | 168/166（不変） | 不変 | 不変 |

- 列幅は台詞・バフに関係なく**常に設計比率**（ラウンドごとの揺れも消える）
- 横スクロール 0・console error 0
- 残る伸び：360px でデバフ 4 個のとき敵プレート +68px（97→165）。情報はすべて 1 行で読める。これ以上の圧縮は §3 の却下案（情報・文言の変更）になるため行わない

## 5. 影響範囲とリスク

| 項目 | 内容 |
|---|---|
| 変更ファイル | `src/components/battle/battle.css` のみ（`@media (max-width: 899px)` ブロック内・約 25 行）。TSX・`src/core`・文言・数値・assets 0 |
| PC（≥900px） | 対象外（media query）。実測で全数値同一 |
| 低い画面（高さ ≤700px） | 吹き出しは既存どおり非表示（C は効かない）。A・B は効く |
| 龍神など台詞の長い敵 | 現行は敵列が太っていた分だけ立ち絵が大きく見えていた。修正後は他の敵と同じ設計どおりの列幅に戻る（390 で幅 207→142px。高さはほぼ同じ 331→342） |
| バッジ 10px | 小さい文字。DPR 2 の撮影では読めるが、Human QA で実機の可読性を確認する |
| 吹き出し 11px・2 行 | 12px→11px。敵の絵の頭に重なる量が 26→30px（+4px） |
| タブレット（幅 600〜899px） | A・B・C が効く範囲。タブレット幅は本 Preflight で未計測 → 実装 Gate で 768×1024 を追加 |
| 決定224／226 | 触れるセレクタが無い（READY・⚡・金リング・勝利の舞台は無関係）。実装 Gate で回帰確認 |
| 新規 timer／強制待機／入力ブロック | 0（CSS のレイアウトのみ） |
| rollback | `battle.css` の決定228 ブロックを削除するだけ |

## 6. 実装 Gate（実装時に実施）
1. targeted／full tests・`tsc -b --noEmit`・oxlint・clean build
2. 本 Preflight の `probe.mjs` を実装 build に対して実行し、§4 の値を再現（CSS 注入ではなく実装で）
3. SP 360／390／414、タブレット 768×1024、PC 1508×660（全数値が Production と同一であること）
4. 7 神 × 7 敵のうち、台詞の長い敵（龍神）とデバフの多い寿楽を含む PC／SP の撮影
5. 決定224（READY・⚡ 34/52px 金・金リング）・決定226（勝利の舞台・skip）の回帰
6. console error 0・横スクロール 0・`src/core`／assets／save 差分 0

## 7. 実装する CSS（案・`battle.css` の `@media (max-width: 899px)` 内）
```css
/* 決定228：SP のアリーナ 3 列を中身（吹き出し・バッジ）に関係なく設計比率に固定する */
body.battle-viewport .battle-main {
  grid-template-columns: minmax(0, 1.22fr) minmax(0, 1fr) minmax(0, 0.78fr);
}
body.battle-viewport .battle-main > .panel,
body.battle-viewport .ally-row > .panel {
  min-width: 0;
}
/* バフ・ブロックのバッジを 1 行で詰める（文言は不変） */
body.battle-viewport .enemy-plate-status .badge,
body.battle-viewport .player-plate-status .badge {
  font-size: 10px;
  padding: 1px 4px;
  line-height: 1.3;
  white-space: nowrap;
}
body.battle-viewport .buff-list { gap: 2px; }
body.battle-viewport .enemy-plate-status,
body.battle-viewport .player-plate-status { gap: 2px 4px; }
/* 掛け声は 2 行まで（「…」で台詞を切らない） */
body.battle-viewport .enemy-speech-bubble {
  white-space: normal;
  height: 30px;
  padding: 2px 8px;
  margin-bottom: -35px;
  font-size: 11px;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: clip;
  border-radius: 10px;
}
```

## 8. Human QA（実装後・同一 seed・Before＝Production／After＝修正 build・SP 実機）
1. バフ・デバフが 3〜4 個付いても、共鳴ゲージと「あと N で神技発動」が読めましたか？
2. バフ・デバフの数字（例：攻撃力 -30（1））が読めましたか？
3. 敵と神の立ち絵が、プレートに隠されずに見えましたか？
4. 敵の掛け声が途中で切れずに読めましたか？
5. 修正前より見づらくなった・狭くなった所はありましたか？
成功：Q1〜Q4 YES・Q5 NO。

## 9. Verdict
**GO**（推奨案 ABC・CSS のみ・SP のみ）

## 10. NEXT NOW（1 つ）
**CEO の GO を受けて、master `5263c3d` から新ブランチ `feat/d228-sp-plate-fix` を切り、§7 を実装して §6 の Gate と Before/After Human QA 環境を用意する。** GO まで runtime には触れない。

---

## 11. 実装記録と Gate（2026-09-25・CEO GO 後）— **Gate PASS／PENDING HUMAN QA**

CEO GO（A＋B＋C をそのまま Narrow Fix として実装）に基づき実施。**merge／push／deploy なし。Production `5263c3d` 不変。**

### 11-1. ブランチ・変更
- worktree `C:/Users/kimi1/SevenGodsGame-d228`・ブランチ `feat/d228-sp-plate-fix`（master `5263c3d` から）。**未 commit**（Human QA 後に commit する）
- 変更：`src/components/battle/battle.css` の 1 ファイルのみ・+47／−1 行（宣言 22 個＋コメント）。差分全文 `scripts/decision228-sp-plate-fix/out/d228.diff`
  - A：SP ブロックの `grid-template-columns` を `minmax(0, 1.22fr) minmax(0, 1fr) minmax(0, 0.78fr)` に 1 行置換＋パネルの `min-width: 0`
  - B：プレート内バッジ 10px・padding 1px 4px・行間 1.3、バフ列の gap 2px
  - C：`@media (max-width: 899px) and (min-height: 701px)` で吹き出しを 11px・最大 2 行・高さ 33px（既存の「高さ 700px 以下は非表示」を壊さないため min-height 付きの別ブロック）
- 変更 0：TSX・`src/core`・文言・数値・assets・save・gameVersion・決定224／226 のセレクタ・PC（≥900px）

### 11-2. Preflight からの訂正（3 点・いずれも範囲内の数値訂正。記録として隠さない）
| # | Preflight | 実装 | 理由（実測） |
|---|---|---|---|
| 1 | 吹き出し 高さ 30px・margin −35px | **33px・−38px** | `box-sizing: border-box` のため 30px では 2 行目が 3.2px 欠けた（360px で 32 本・390px で 24 本・430px で 15 本）。2 行（13.2×2）＋padding 4＋枠 2＝32.4px。Preflight の計測は中身の行数だけを数えており、枠内に収まるかを見ていなかった |
| 2 | バッジ `white-space: nowrap` | **nowrap を付けない** | 360px の神列（プレート内幅 ≈75px）で「攻撃力 +30（2）」（83.8px）が枠から 2px はみ出した（14 サンプル）。nowrap を外し、そこだけ 2 行に折り返す。390px 以上は 1 行のまま。iOS の字形が広い場合も枠内で折り返す |
| 3 | （なし） | 吹き出しの文字を上下中央（`-webkit-box-pack: center`＋`align-content: center`） | 高さ固定のため 1 行の台詞が上に寄り、下に空白ができた。中心ずれ 0.1px に |

補足：CEO 指示 B の「1 行に複数配置」について。SP 360〜430px の敵列内幅（≈114〜143px）に 10px のバッジ（≈81px）は 2 個並ばない（文言を変えない限り不可）。実装は Preflight どおり「1 個を 1 行に収め、幅があれば並ぶ」。768px では 1 行に 3 個並ぶ（実測）。

### 11-3. Automated Gate（最終 CSS・worktree の `src` のみ）
| Gate | 結果 |
|---|---|
| targeted（CSS を読む `battleViewportLayout`・`godStrikeStage`・`pressFeel`＋`victoryReveal`・`combatTimeline`・`readyMaterial`） | 6 files・**59 PASS** |
| full（`vitest run --dir src`） | **93 files・1,167 PASS** |
| typecheck（`tsc -b --noEmit`） | exit 0 |
| lint（`oxlint src`） | 0 件 |
| clean build | PASS（`index-cRLqOkr2.css`・JS `index-DWyomJC9.js` は **Production JS と md5 一致**＝JS の中身は byte 同一。名前のハッシュだけ CSS 名に連動して変わる） |
| bundle | JS ±0B／CSS raw +735B（155,820→156,555）・gzip +136B。非 bundle ファイル（assets）は Production build と md5 一致 |

### 11-4. Visual Gate（最終 build `:4192` と Production `:4191` を同一 seed・同一 bot で全手計測）
seed `d225-taiyo-ryujin`（大耀×蒼海の龍神・バフ 0〜3・長い台詞）／`d225-juraku-juuma`（寿楽×双牙の魔獣・デバフ 4）。幅 360×780／390×844／430×932／768×1024／1508×660。`scripts/decision228-sp-plate-fix/`。

| 幅・組 | 列幅（全ラウンド）After｜Before | 最悪時プレート高（敵/神/共鳴）After｜Before | 最悪時の立ち絵（敵/神）After｜Before | 共鳴（「共鳴」/「あと N」行数）After｜Before |
|---|---|---|---|---|
| 360 龍神 バフ 3 | **130/107/83 固定**｜169〜207/63〜85/49〜66 | 93/130/94｜102/237/221 | 272/204｜264/115 | 1/3｜2/**8** |
| 360 魔獣 デバフ 4 | 130/107/83 固定｜130〜151/95〜107/74〜83 | **165**/72/94｜**273**/72/112 | **201**/249｜**93**/249 | 1/3｜1/3 |
| 390 龍神 バフ 3 | 142/117/91 固定｜169〜207/80〜102/63〜79 | 93/104/94｜102/237/149 | 341/278｜332/168 | 1/2｜2/4 |
| 390 魔獣 デバフ 4 | 142/117/91 固定｜142〜151/112〜117/87〜91 | 144/72/94｜180/72/94 | 287/298｜251/292 | 1/2｜1/2 |
| 430 龍神 バフ 3 | 159/130/101 固定｜169〜207/103〜124/80〜97 | 93/104/94｜102/165/112 | 421/352｜419/301 | 1/2｜1/3 |
| 430 魔獣 デバフ 4 | 159/130/101 固定｜同 | 144/72/94｜180/72/94 | 375/373｜339/362 | 1/2｜1/2 |
| 768 龍神／魔獣 | 296/243/189 固定｜同 | 魔獣 110/72/76｜128/72/76（バッジが 1 行に 3 個並ぶ） | 501/448｜489/454 | 1/1｜1/1 |
| 1508×660 | 478/405/316｜同 | 同一 | 同一 | 同一 |

全幅・全サンプル共通（After）：バッジ 1 行（360px の神列のみ 2 行・枠内）／バッジ同士の重なり 0／プレート枠外 0／プレート同士の重なり 0／テキストの横切れ 0／吹き出し最大 2 行・「…」省略 **0**（Before は龍神の台詞 21/21 が省略）・欠け 0・1 行でも上下中央／横スクロール 0／console error 0。**列幅はラウンド・台詞・バフに関係なく一定（揺れ 0）**。

全 49 台詞（`cries.json`）を実装 CSS の吹き出しに入れた計測：360／390／430／768px で 3 行以上 0・欠け 0・中心ずれ 0.1px。

**PC の一致**：アニメーションを止めた状態で戦闘画面の全要素（149／143 個）の位置・大きさ・文字サイズを比較し、1508×660・1280×800・900×700（SP 境界の直上）で **差分 0**。

### 11-5. Regression（`gate.mjs`・After `:4192` と Before `:4191` を同一条件で比較）
| 対象 | 結果 |
|---|---|
| 決定224（seed `d223-pilot-01`・PC／SP） | **SAME**：豪快な一撃 READY・点火 2（再点火 0）・金リング 2・神の一撃 1・通常⚡ 34px 金（2 回）。撃破⚡ 52px 金／通常⚡ 34px 金（計算値）も一致 |
| 決定226（seed `d226-qa-01`・PC／SP・初撃破→再撃破） | **SAME**：勝利の舞台・神名・初撃破（1 戦目のみ）・舞台 tap→結果・段階表示 tap→全表示・報酬の自動オープン 0・ジングル 1 回・スコア・報酬 3 枚・再戦（同 seed・同構成） |
| 敗北 | 舞台 0・「敗北」・`defeat.webm`（Before と同じ） |
| console error | 0（全 run） |
| タイミング | JS は byte 同一（時刻表・入力ブロック判定に差なし）。計測上の揺れは最大 ≈200ms（負荷） |

### 11-6. Known Risk
1. バッジ 10px の実機可読性（Human QA Q3）
2. 360px では神のバフが 2 行に折れる（枠内・読める）。「あと N で神技発動」は 360px の共鳴列（83px）で 3 行
3. 龍神など台詞の長い敵：現行は列が太っていた分だけ敵の絵が横に大きかった。修正後は他の敵と同じ設計比率
4. 吹き出しは 11px・高さ 33px で、敵の絵の頭に重なる量が 26→33px（+7px）
5. デバフ 4 個の 360px では敵プレートがまだ +68px 伸びる（97→165・情報は全部読める）
6. **iPhone からの LAN アクセス**：Wi-Fi が「パブリック」・Firewall 有効・node の許可ルールなし＝ブロックされる可能性が高い（Firewall は変更していない）

### 11-7. Human QA 環境（`--host 0.0.0.0`）
| | PC | iPhone（同じ Wi-Fi・LAN IP `192.168.11.6`） | build |
|---|---|---|---|
| Before | `http://127.0.0.1:4191/?seed=d228-qa-01` | `http://192.168.11.6:4191/?seed=d228-qa-01` | Production `5263c3d`（`index-B1Bpf-GW.js`／`index-D9GkTIr_.css`） |
| After | `http://127.0.0.1:4192/?seed=d228-qa-01` | `http://192.168.11.6:4192/?seed=d228-qa-01` | 決定228（`index-DWyomJC9.js`＝Production と同一 JS／`index-cRLqOkr2.css`） |
4 URL とも HTTP 200（PC から確認）。再現のコツ：デバフは「寿楽 × 双牙の魔獣」でデバフ札を続けて出す。バフ 3 個と長い台詞は「大耀 × 蒼海の龍神」（R5 前後）。Before と After は別オリジンのため、保存（初撃破など）は別々。

**一時 Firewall ルール（2026-09-25・CEO 指示・Human QA 専用）**：iPhone から届かなかったため、受信許可ルールを 2 つ追加（管理者は UAC で CEO が承認）。`Decision228 QA TCP 4191 (temp)` と `Decision228 QA TCP 4192 (temp)`、グループは `Decision228 QA (temp)`。条件は Inbound／Allow／TCP 4191・4192 だけ／RemoteAddress `LocalSubnet`／Profile `Public` だけ／Program Any（node.exe 全体は許可していない）。Wi-Fi は「パブリック」のまま、既存ルールは変更なし。追加する前にプレビューサーバーが止まっていたので、同じ dist から `vite preview --host 0.0.0.0` で起動し直した（:4191＝`SevenGodsGame-d226-rc`、:4192＝`SevenGodsGame-d228`・build はしていない・asset hash は上の表と同じ）。
**Human QA 終了後に削除する（管理者 PowerShell）**：
```powershell
Remove-NetFirewallRule -Group "Decision228 QA (temp)"
Get-NetFirewallRule -Group "Decision228 QA (temp)" -ErrorAction SilentlyContinue   # 何も出なければ削除済み
```

### 11-8. 状態
**Decision228 = Gate PASS／PENDING HUMAN QA**（Q1〜Q4 YES・Q5 NO で PASS）。commit／push／merge／deploy なし。

---

## 12. CEO Human QA（2026-09-25）— **PASS**
CEO 所感：「すごくよくなっている」。SP で神・敵プレートが太り、共鳴の情報が潰れる問題の改善を実機（iPhone・LAN）で確認。**Decision228 Human QA = PASS（CEO 判定）**。

Human QA で見つかった新しい Visual 課題 2 件は **Decision228 に混ぜない**（Decision228 は SP の情報欠損修正として閉じる）。§14 で次の Decision へ引き継ぐ。

## 13. Production Release Gate（2026-09-25）— **PASS／Release Blocker 0 → PRODUCTION RELEASE READY（CEO 承認待ち）**
**AI 判断**・Gate のみ。Human QA 後の追加改善 0・Decision228 の CSS 変更 0。merge／push／deploy／Production 変更なし。

### 13-1. RC
| 項目 | 結果 |
|---|---|
| commit | `feat/d228-sp-plate-fix` に Human QA 済みの差分をそのまま local commit **`b70df63`**（commit 前に作業差分と `out/d228.diff` の +/− 行が一致することを確認。battle.css md5 `3f21e364…`） |
| RC | ブランチ `release/d228-sp-plate-fix-rc`＝**`b70df63`**（新規 worktree `C:/Users/kimi1/SevenGodsGame-d228-rc`・`npm ci` のクリーン環境）。親は master＝origin/master＝**`5263c3d`**＝clean master の上に commit 1 つ（`git rev-list master..RC`＝1） |
| RC build | `index-cRLqOkr2.css`（md5 `379aafb2…`＝**Human QA の After と byte 同一**）／`index-DWyomJC9.js`（md5 `8eedb711…`＝**Production の `index-B1Bpf-GW.js` と byte 同一**） |

### 13-2. Automated（RC worktree）
| Gate | 結果 |
|---|---|
| targeted（`battleViewportLayout`・`combatTimeline`・`godStrikeStage`・`readyMaterial`・`victoryReveal`・`pressFeel`） | 6 files・**59 PASS** |
| full（`vitest run --dir src`） | **93 files・1,167 PASS** |
| typecheck（`tsc -b --noEmit`） | exit 0 |
| lint（`oxlint src`） | exit 0・0 件 |
| clean build（`rm -rf dist && npm run build`） | PASS |

### 13-3. Isolation（`git diff 5263c3d..b70df63`）
| 項目 | 結果 |
|---|---|
| runtime 変更 | `src/components/battle/battle.css` **1 ファイルのみ**（+47／−1） |
| `src/core` | diff 0 |
| assets（`public/`）・`package.json`・lock | diff 0。build の非 bundle ファイル 210 個が Production build と md5 全一致・`index.html` はハッシュ名以外同一 |
| save／gameVersion | diff 0（追加行に `version`／`gameVersion`／`localStorage`／`save` の一致 0。JS が byte 同一） |
| 決定213（構え）混入 | 0（追加行に `stance`／`構え`／`溜め返し`／`STANCE_`／`otomoStance` 0・tree に `*stance*` ファイルなし） |
| H3／Living Background（決定219〜223） | 0（追加行に `living`／`h3`／`envVfx`／`breath`／`lighting`／`決定219〜223` 0・tree に該当ファイルなし） |

### 13-4. Visual（RC `127.0.0.1:4192` と Production `127.0.0.1:4191`・同一 seed・同一 bot・全手計測。`layoutgate.mjs`／`gatesum-rc.cjs`・出力 `out-rc/layout/`）
seed `d225-taiyo-ryujin`（大耀×蒼海の龍神・バフ 3・長い台詞）／`d225-juraku-juuma`（寿楽×双牙の魔獣・デバフ 4）。

| 幅 | 列幅（全ラウンド）RC｜Production | 共鳴（「あと N」最大行）RC｜Prod | 最悪プレート高 敵/神/共鳴 RC｜Prod | 吹き出し 最大行・「…」省略 RC｜Prod |
|---|---|---|---|---|
| 360 龍神 | **130/107/83 固定**｜169〜207/63〜85/49〜66 | **3**｜8 | 93/130/94｜102/237/221 | 2 行・**0/21**｜1 行・21/21 |
| 360 魔獣 | 130/107/83 固定｜130〜151/95〜107/74〜83 | 3｜3 | 165/72/94｜273/72/112 | 2 行・0/17｜12/17 |
| 390 龍神 | 142/117/91 固定｜169〜207/80〜102/63〜79 | 2｜4 | 93/104/94｜102/237/149 | 2 行・0/21｜21/21 |
| 390 魔獣 | 142/117/91 固定｜揺れあり | 2｜2 | 144/72/94｜180/72/94 | 1 行・0/17｜9/17 |
| 430 龍神 | 159/130/101 固定｜169〜207/103〜124/80〜97 | 2｜3 | 93/104/94｜102/165/112 | 2 行・0/21｜23/23 |
| 430 魔獣 | 159/130/101 固定｜同 | 2｜2 | 144/72/94｜180/72/94 | 1 行・0/17｜0/17 |
| 768 両組 | 296/243/189 固定｜同 | 1｜1 | 魔獣 110/72/76｜128/72/76（バッジ 1 行に 3 個） | 1 行・0｜0 |
| 900／1280／1508 | 338/287/224・478/405/316・478/405/316｜同 | 1｜1 | 同一 | 1280 は 1 行・0（900・1508 は高さ 700 以下で非表示＝Production と同じ） |

全 7 幅 × 2 組（RC）：共鳴の情報欠損 0（「共鳴」1 行・ゲージ 1 行）／列幅の揺れ 0／バッジ 10px（SP・768）は最大 2 行（360 の神列のみ）で枠外 0・重なり 0／吹き出し最大 2 行・省略 0・欠け 0／プレート重なり 0／テキストの横切れ 0／横スクロール 0／console error 0。
**PC の一致**（`pcstatic.mjs`・アニメーション停止・戦闘画面の全要素の位置・大きさ・文字サイズ）：1508×660・1280×800・900×700 の 2 時点とも **差分 0**（149／143 要素）。live 計測の PC サンプル差は立ち絵の呼吸アニメ ±1px のタイミング差のみ（列幅・プレート・文字サイズ・吹き出しは同一）。

### 13-5. Regression（`gate.mjs`・RC と Production を同一条件で。`cmp-rc.cjs`・出力 `out-rc/regress/`）
| 対象 | 結果 |
|---|---|
| 決定224（PC／SP） | **SAME**：豪快な一撃 READY・点火 2・金リング 2・神の一撃（カットイン）1・通常⚡ **34px 金** `rgb(255,209,102)`・撃破⚡ **52px 金** `rgb(255,224,138)`・共鳴 |
| 決定226（PC／SP・初撃破→再撃破） | **SAME**：勝利の舞台（神名 大耀）・初撃破（1 戦目のみ）・tap skip・結果・報酬の自動オープン 0・ジングル・スコア・報酬 3 枚・再戦（同 seed・同構成） |
| 敗北 | 舞台 0・「敗北」・`defeat.webm`（Production と同じ） |
| console error | 0（全 run） |
| 入力ブロック中央値 | RC 313〜329ms／Production 302〜339ms（JS 同一・負荷の揺れの範囲） |

### 13-6. Bundle（Production `5263c3d` 比・RC clean build）
| | Production | RC | 差 |
|---|---|---|---|
| JS | 437,394B（gzip 132,961） | 437,394B（gzip 132,961） | **±0（md5 一致）** |
| CSS | 155,820B（gzip 28,951） | 156,555B（gzip 29,087） | **+735B／gzip +136B** |
| 新規 asset | — | — | **0**（非 bundle 210 ファイル md5 一致） |

### 13-7. Blockers
**0**

### 13-8. Known Risks（Release 後も残す）
1. バッジ 10px（SP・768）の可読性（Human QA では問題なし）
2. 360px では神のバフが 2 行に折れる（枠内・読める）
3. 「あと N で神技発動」が 360px で 3 行（Production は最大 8 行）
4. 蒼海の龍神など台詞の長い敵が以前より細く見える（列が太らなくなった分。他の敵と同じ設計比率）
5. 吹き出しの立ち絵への重なりが +7px（26→33px）

### 13-9. QA 環境の後片付け
- 一時 Firewall ルール `Decision228 QA (temp)`（2 本）を UAC で削除 → 残り 0。Wi-Fi は「パブリック」のまま、既存ルールは変更なし
- Human QA サーバー（0.0.0.0:4191／4192）と Gate 用サーバー（127.0.0.1:4191／4192）を停止 → LISTEN 0
- 影響確認：RC／`feat/d228-sp-plate-fix`／`SevenGodsGame-d226-rc` の worktree とも追跡ファイルの変更 0。master＝origin/master＝`5263c3d` 不変。remote に d228 ブランチなし（push 0）

### 13-10. Release 手順（CEO 承認後のみ・未実施）
決定227 と同じ：`git fetch . release/d228-sp-plate-fix-rc:master`（fast-forward のみ `5263c3d`→`b70df63`）→ `git push origin master` → Vercel 配信 bundle が `index-DWyomJC9.js`／`index-cRLqOkr2.css` と md5 一致することを確認。Rollback 先＝現 Production deployment 6645113068（`5263c3d`）。

## 14. 次の Decision への引き継ぎ（CEO の新しい所感・Decision228 には混ぜない）
| # | CEO 所感 | 引き継ぎ先 | 範囲 |
|---|---|---|---|
| **V-1** | 「敵と神の大きさが小さいと感じる」 | **③ Combat Feel v2** の開始時、Battle Composition 監査の項目 | 単純な画像拡大はしない。神・敵の画面占有率、舞台の余白、plate、Intent、Resonance、hand との競合を計測し、神・敵を戦場の主役として一段大きくできるか検証する |
| **V-2** | 「カードの絵柄の質を高めたい」 | **④ Card Premium v2** | CSS／material だけでなく**カード原画そのもの**の Visual Quality を対象にする。60 枚を一度に変えない。Narrow Pilot 候補＝**大耀「豪快な一撃」1 枚** |

## 15. 状態
**Decision228 = Human QA PASS（CEO）／Production Release Gate PASS（AI 判断）／PRODUCTION RELEASE READY — CEO 承認待ち。** merge／push／deploy なし。Production `5263c3d` 不変。

---

## 16. Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-26 JST・CEO 承認）

| 項目 | 値 |
|---|---|
| 承認 | CEO「Decision228 Production Release を承認します。RC `release/d228-sp-plate-fix-rc` `b70df63`」 |
| Release 直前 | master＝origin/master＝`5263c3d`（`git fetch` 後に確認）／RC `b70df63`・RC worktree の追跡ファイル変更 0・untracked 0・`master..RC`＝commit 1 つ（`battle.css` のみ） |
| merge | `git fetch . release/d228-sp-plate-fix-rc:master`（fast-forward のみ・checkout なし）`5263c3d..b70df63` |
| push | `git push origin master`（04:58 JST・`5263c3d..b70df63`） |
| Vercel | deployment **`6669035294`**（sha `b70df63`・Production）**success**（2026-09-25T19:58:49Z） |
| 配信 bundle | `index-DWyomJC9.js`／`index-cRLqOkr2.css`。RC clean build と **md5 一致**（JS `8eedb711…`・CSS `379aafb2…`）。非 bundle ファイル 21 個を抜き取りで md5 一致（`.gitkeep` だけは配信対象外） |
| **Rollback 先** | 直前の Production deployment **`6645113068`**（`5263c3d`・決定226）。Vercel Instant Rollback。saveVersion／gameVersion 不変のため保存データの巻き戻しは不要 |

### 16-1. Isolation 再確認（`5263c3d..b70df63`）
変更は `src/components/battle/battle.css` の 1 ファイルだけ。`src/core`／`public`（assets）／`package.json` の差分 0。JS は Production 直前と byte 同一なので、save の意味・gameVersion は変わらない。配信 JS に `otomoStance`／`溜め返し`／`連撃の構え`／`stance-deck-swap` の一致 0（決定213 は含まない）。H3／Living Background の混入 0。

### 16-2. Production Smoke QA（`https://seven-gods-game.vercel.app`・Playwright・空のコンテキスト）
| 確認 | PC（1508×660・1280×800） | SP（360・390・430） |
|---|---|---|
| Home 正常 → 神選択 → Battle 開始 | ✅ | ✅ |
| God／Enemy／Resonance の表示・列の潰れの再発 | ✅ 列 478/405/316 固定 | ✅ 列 130/107/83・142/117/91・159/130/101 で固定（RC Gate と同一） |
| 敵の台詞 | ✅ 1 行・省略 0 | ✅ 最大 2 行・省略 0・欠け 0 |
| バフ／デバフ | ✅ 枠外 0・重なり 0 | ✅ 10px・枠外 0・重なり 0 |
| カードを使う（17 手） | ✅ | ✅ |
| 決定224：READY（豪快な一撃）・点火 2・金リング 2・⚡34px 金・撃破⚡52px 金 | ✅ SAME | ✅ SAME |
| 共鳴・神の一撃（カットイン 1） | ✅ | ✅ |
| 決定226：勝利の舞台・初撃破（1 戦目のみ）・tap skip・結果・報酬の自動オープン 0 | ✅ SAME | ✅ SAME |
| 再戦（同 seed・同構成）・敗北で舞台 0 | ✅ | ✅ |
| console error | 0 | 0 |

- スコア：1 回目の run で SP の再戦だけ 8,060 になった（RC Gate は 8,090）。そのときは入力ブロックが最大 1,430ms で 1 手が未計測だった＝レイアウト計測を並行していた負荷による bot の操作タイミングのずれ。同じ scenario を Production で再実行すると **初戦・再戦とも 8,090（手順も 17 手とも同一）**、local RC を今日の日付で実行しても 8,090。配信 JS は RC と byte 同一なので、コードの差ではない
- 「次の目標」の Daily 名は日付の変化（09-25→09-26）で 双牙の魔獣→乱舞の道化 に変わる（RC を今日実行しても同じ）
- 証拠：`scripts/decision228-sp-plate-fix/out-prod/`（`regress`・`regress-rerun`・`layout`）

### 16-3. 状態
**Decision228 ② SP 緊急修正 = PRODUCTION LIVE / CLOSED。** Production＝master＝origin/master＝**`b70df63`**。docs（本文書・DECISIONS.md）は runtime release に混ぜず、main worktree の未 commit docs として別に管理する（既存の docs hygiene どおり）。
次：V-1 → **決定229 Combat Feel v2／Battle Composition Audit（Preflight のみ）**、V-2 → **決定230 Card Premium v2（保留・豪快な一撃 1 枚の Narrow Pilot 方針）**。
