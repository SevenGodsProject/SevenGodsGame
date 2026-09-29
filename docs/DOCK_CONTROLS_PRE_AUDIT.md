# Battle Dock Controls PRE-AUDIT（監査・原因・設計のみ／runtime 変更 0）

- 日付：2026-09-27／AI 判断（CLAUDE.md §6-2：軽微な UI・UX 調整・既存仕様の範囲内の改善）。CEO 判断事項（§6-3）は含まない
- 対象：戦闘画面の「ドック」＝託宣バー・「ラウンドを終える」・ログ・手札の横スクロール領域
- 出発点：`docs/HUD_PREMIUM_PRE_AUDIT.md` §4 案C（ドック操作の形）＝「最大 28px 動く」で保留、§8「次の Pilot 候補 ①」
- 読んだコード（読み取りのみ）：`SevenGodsGame-lane2-rc`（`245ecdc`＝現 Production）の `BattleScreen.tsx:536-583`、`DivinationPanel.tsx`、`battle.css`（`:10-65`／`:2048-2141`／`:4746-4816`／`:5166-5212`／`:5417-5500`／`:5603-5650`／`:5849-5880`）、`components/press.css`、`pressFeel.test.ts`、`battleViewportLayout.test.ts`、`useMobileAutoFocus.ts`、`index.css:1-6`、`cardIcon.tsx`
- 実測（軽量・1 VP 1 ロード・計 8 ロード）：`scripts/dock-controls-audit/measure.mjs`（同じページで Before を測ったあとプロトタイプ CSS を `addStyleTag` で注入して After を測る）。`vite preview`（127.0.0.1:4271・再ビルドなし）→ 計測後に停止済み。CEO の 4195–4199 には触れていない
  - プロトタイプ：`proto-dock-v1.css`（初版）→ `proto-dock-v2.css`（残差修正版＝本書の推奨値）
  - 出力：`scripts/dock-controls-audit/out/`（`before-*.png`・`v1-*`・`v2-*`・`*-crop-dock.png`・`v1/v2-measure.json`）
  - 盤面：大耀 × 蒼海の龍神・`?seed=dockaudit-taiyo`・開始直後。VP：SP 360×780／390×844（touch・DPR2）、PC 1280×800／1508×660

---

## 0. 結論

| 項目 | 結論 |
|---|---|
| 前回（HUD 監査 案C）が「28px 動いた」本当の理由 | ①**`font-family: inherit` だけを当てたため**、`<button>` の UA 既定 `font` 一括指定が残した `line-height: normal` が Meiryo（≈1.5）→ Yu Gothic UI（≈1.33）に変わり、託宣ボタンが 39→36px・ドック −3px・アリーナ +3px（名札 3 枚が 4px 動いた）②**`word-break: keep-all`** が区切りの無い「ラウンドを終える」を 1 行の塊にし、**ボタンからはみ出した**（PC 高さ 62→39＝−23px、SP はログに食い込む。`out/` ではなく HUD 監査の `protoC-390x844-*-crop-dock.png` で確認）③**最大 28.4px は文字の span の幅**（書体が細くなった分の自然な縮み）で、レイアウトの移動ではない |
| 根本原因（ドックが Web ボタンに見える） | R1 UA 既定の `<button>` 書体（Arial→Windows では **Meiryo**）が本文（Yu Gothic UI）と混在／R2 材質が「半透明＋角丸 8px／pill」の Web 文法／R3 「ラウンドを終える」の折返しを**幅任せ**にしている（SP「ラウン／ドを終／える」3 行、PC「ラウンドを終／える」）／R4 託宣見出しの絵文字 🙏 |
| 推奨 Pilot | **Dock Controls Plate v1（metric-locked）**：新規 `dockControls.css` 1 枚＋`DivinationPanel.tsx`（import 1 行・🙏→`GlyphIcon`）。書体を本文へ揃え、**行送りを Before の実寸 px で固定**して高さを 1px も動かさない。「ラウンドを終える」は `word-break: auto-phrase`＋幅で「ラウンドを／終える」。材質は HUD Pilot と同じ「漆黒の札＋金の細縁・角 3px」 |
| 寸法差（v2 実測） | **ドック外 0 件（全 4 VP・名札・アリーナ・上部バー・立ち絵・ゲージ）**。ドックの高さ 0・託宣ボタンの高さ 0・「ラウンドを終える」の高さ 0（PC 62／SP 44）。動くのは **SP の託宣バー横方向だけ**：操作列 96→106px（+10）、託宣 3 枚が各 −3.4px（390：82.7→79.3／360：72.7→69.3） |
| 折返し | 全 4 VP で **「ラウンドを／終える」2 行・はみ出し 0**（Before：SP 3 行「ラウン／ドを終／える」、PC「ラウンドを終／える」） |
| 書体（CDP・Windows Chromium） | ドックの Meiryo 3 箇所 → **0**（託宣名・ラウンドを終える・ログがすべて Yu Gothic UI＝名札と同じ）。絵文字フォント（Segoe UI Emoji）→ 0 |
| タップ領域 | SP：ラウンドを終える 48×44.5 → **58×44**、ログ 44×44（不変）、託宣 69〜79×39＋判定 45（決定170 の `::after` 不変）。PC：112×62・ログ 112×29＋判定 45（不変） |
| 競合 | `battle.css`・`BattleScreen.tsx`・`CardView.tsx`・`press.css`・`sound.ts` 系に**触れない**。HUD（`hudPlate.css`／`HpBar.tsx`）・Lane3（`CardView.tsx`・`artWindow.*`・`battle.css` 末尾）・Sound（`sound.ts`・`feelTier.ts`・`useBattleSound.ts`・`useGameEngine.ts`）とファイル重複 0、セレクタ重複 0 |
| NEXT NOW | §9：Production から Pilot ブランチを切り §6 を実装 → §7-1 の Gate（`measure.mjs` を Before／After ビルドで実行）→ Before／After Human QA |

---

## 1. DOCK INVENTORY（Before＝Production `245ecdc`・Windows Chromium 実測）

| 要素 | 形 | 材質 | 書体（実描画） | 絵文字 | タップ領域 SP 390 | 寸法 SP 360／390 | 寸法 PC 1280／1508 | 備考 |
|---|---|---|---|---|---|---|---|---|
| 託宣パネル `.divination-panel` | 角丸 10px | 紫グラデ 69〜80% ＋ `backdrop-filter: blur(8px)` ＋紫ヘアライン | 見出し Yu Gothic UI 10〜11/700＋**Segoe UI Emoji（🙏）** | **🙏 1**（`DivinationPanel.tsx:38`） | — | 348×69／378×69 | 1240×73／1240×56 | SP は縦積み（見出し行＋3 択行）、右 106px を操作列に予約 |
| 託宣ボタン `.divination-choice` ×3 | 角丸 8px | 単色 `#150f24`＋紫 1px 枠 | **Meiryo**（`<button>` UA 既定 Arial→和文代替）10/700（名）・9（今なら） | — | 83×39（判定 `::after` 45） | 72.7×39／82.7×39 | 341.6×61／341.6×44 | SP は glyph と効果文を畳む。「今なら ブロック20」は 360 で省略（…）、390 も Meiryo では省略 |
| ラウンドを終える `.end-round-button` | **pill**（SP は 48×44.5 の楕円） | 金グラデ 26→0a%＋金 1px 枠＋外光 | **Meiryo** 10/700（SP）・13/700（PC） | — | **48×44.5** | 48×44.5（**3 行「ラウン／ドを終／える」**） | 112×62（**「ラウンドを終／える」語中改行**） | SP は `width:62px` 指定だが、ログの `min-width:44px`（決定170）で操作列 96px に収まらず 48px へ縮む |
| ログ `.battle-log-toggle` | 角丸 8px | 半透明 `#14152caa`＋白ヘアライン | **Meiryo** 10〜11/700 灰 `#9aa3cc` | — | 44×44 | 44×44.5 | 112×29（判定 45） | 近似コントラスト 4.95（HUD 監査で最低） |
| 手札 `.hand`（SP） | — | — | — | カード内（Lane3 範囲） | — | 横スクロール 556/348・556/378 | 折返し 1118/1118 | スクロールバー非表示。右端のカードが画面端で切れて「続き」が見える＝自然なピーク |

**行送りの実寸（Meiryo `normal`＝metric lock の目標値）**：託宣名 PC 11px→**17px**／SP 10px→**15px**、今なら SP 9px→**14px**、効果文 PC 10px→15px（root の 1.5 と一致）、ラウンドを終える PC 13px→**20px**（2 行 40＋padding 20＋枠 2＝62）、ログ PC 11px→**17px**（17＋10＋2＝29）。SP の「ラウンドを終える」は既存の `line-height: 1.15` 指定。

**レイアウト上の性質**：SP の操作列は `position:absolute`（ドック基準）＝その高さはドックに影響しない。PC の操作列は手札（164px）より低い＝その高さもドックに影響しない。**ドックの高さを決めるのは託宣ボタンの高さ（＝託宣の行送り）だけ**。これが「寸法を動かさない」設計の鍵。

---

## 2. ROOT CAUSE

| # | 原因 | 根拠 | 効果 |
|---|---|---|---|
| R1 | **`<button>` が UA 既定の `font` 一括指定を持つ**（Chromium：`font: -webkit-small-control` 相当）。`index.css:3` の `font-family: system-ui…`・`line-height: 1.5` は `<button>` に継承されない | CDP：託宣名・ラウンドを終える・ログ＝Meiryo、見出し・名札＝Yu Gothic UI | 同じ画面に和文 2 書体。**しかも Meiryo の `line-height: normal`（≈1.5）がドックの高さを決めている**＝書体だけ直すと高さが変わる（前回の −3px の正体） |
| R2 | 材質が Web の文法（角丸 8/10px・pill・半透明・白ヘアライン） | `battle.css:10-30`・`:2048-2085`・`:4792-4816` | 「ゲームの札」ではなく「Web フォームのボタン」に見える。HUD Pilot（名札＝漆黒＋金細縁・角 3px）と並ぶと差が際立つ |
| R3 | **「ラウンドを終える」の折返しを幅任せ**にしている（`word-break` 未指定・句の区切り情報なし） | SP 内幅 38px＝3 字/行、PC 内幅 94px＝6 字/行 | SP 3 行・PC「終／える」の語中改行。主操作の文言が一番崩れている |
| R3' | SP で「ラウンドを終える」の幅が**意図（62px）と違う 48px** になっている | `:5631-5646` 操作列 96px に 62＋4＋ログ 44（決定170 の `min-width`）＝110 が入らず flex で縮む | 決定170 の副作用。3 行になった直接原因 |
| R4 | 託宣見出しの絵文字 🙏（ドック唯一の絵文字） | `DivinationPanel.tsx:38`（文字列に直書き） | OS ごとに字形・色が変わる。隣の託宣 3 択は自前 SVG（`GlyphIcon`）＝アイコン 2 系統 |
| R5 | 主操作の階層が弱い | 金 pill はドック唯一の金だが、SP では 48px の小さな楕円で 3 行、託宣 3 択と同じくらいの面積 | 【推測】初見で「どこでターンを終えるか」が文字を読まないと分からない |

**前回案C が失敗した因果**：R1 の片側（`font-family`）だけを直し、行送り（`line-height`）を放置 → 高さが変わる。R3 を `keep-all` で直そうとして折返し機会ごと消す → はみ出し。**R1 は「書体＋行送りを同時に明示」、R3 は「句で折る（auto-phrase）＋幅で保証」**が正しい手当て（§4 案A で実証）。

---

## 3. COMMERCIAL GAP

| 観点 | 現状 | 商用カードゲームの水準【推測：Slay the Spire／Hearthstone／Marvel Snap 等の一般的な画面構成からの推測】 | 差 |
|---|---|---|---|
| 主操作（ターン終了） | 小さな金 pill、SP で 3 行 | 画面で最も独自の形を持つ 1 個のボタン。文言は崩れない（1〜2 行・句で折る） | 大 |
| 書体 | ボタンだけ別書体（Windows） | UI 全体で 1〜2 書体に統一 | 中（Windows PC で顕著） |
| 材質 | 半透明の角丸箱 | 盤面と同じ世界観の素材（札・金具・漆）で操作系が統一 | 中 |
| アイコン | 絵文字 1＋SVG | 自前アイコン 1 系統 | 小（常時 1 個） |
| 階層 | 託宣・終了・ログがほぼ同格 | Primary 1・Secondary・Tertiary が一目で分かる | 中 |
| 手札スクロール | ピーク（右端のカードが切れる）で続きが分かる | 同等 | 差なし（今回触らない） |

---

## 4. 候補比較（3 案）

| 案 | 内容 | 寸法差（実測・Before 比） | 知覚品質 | リスク | 競合 | 判定 |
|---|---|---|---|---|---|---|
| **A Dock Controls Plate v1（metric-locked）** | 書体 inherit＋行送り px 固定＋`auto-phrase`＋PC 内側余白 18px／SP 操作列 +10px＋漆黒の札・金細縁・角 3px＋🙏→GlyphIcon | **ドック外 0 件**（4 VP）。ドック内：SP の託宣バー横方向のみ（+10／各 −3.4px）。高さ差 0 | 高：主操作の文言が整い、書体が揃い、HUD Pilot と同じ材質言語 | 低〜中：SP の託宣 3 枚が 3.4px 狭くなる（「今なら」の省略が増える可能性。Windows では逆に Yu Gothic UI の方が細く 390 で省略が**消えた**） | 新 CSS 1＋`DivinationPanel.tsx`（どの Pilot も触っていない） | **採用** |
| B Hygiene のみ | 書体＋行送り固定＋`auto-phrase` だけ（材質・絵文字は触らない） | A と同じ（SP +10 を含む） | 中：崩れは直るが「Web ボタン」感は残る | 低 | 同上 | 却下（A と同コスト・同リスクで品質が低い。A の材質だけを外せば B になるので、Human QA で材質が NO の場合の後退先として保持） |
| C 構造変更 | 文言を「ターン終了」等へ短縮、`<wbr>` 挿入、SP でログを別位置へ、終了ボタンを大型化 | 未計測（ドック・アリーナの高さが変わる） | 高になり得る | 高：文言変更はチュートリアル（`TutorialOverlay.tsx`）と整合が要る。ログ移動は決定164／170 の Gate やり直し | **`BattleScreen.tsx`＝Lane2 と同じファイル** | 却下（今回）。A の Human QA 後に「主操作の大型化」だけ別 Preflight の余地 |
| （参考）前回 案C | `font-family` のみ inherit＋`keep-all`＋角 3〜4px | 188 件・最大 28.4px（うち実移動は名札 4px） | — | はみ出し | — | 却下済み（原因は §2） |

**SP の +10px が避けられない理由**：日本語フォントの多くは仮名が全角（Hiragino・Noto Sans CJK・Meiryo）で、「ラウンドを」5 字＝10px×5＝**50px** の内幅が要る。現状 48px（内幅 38）では「ラウンド／を終える」が最良で、助詞が行頭に来る。ゼロ移動案（ログの見た目を 36px にして判定を `::after` で 44px に広げる）も検討したが、①内幅 50 ちょうどで丸め誤差に弱い②決定170 が「見た目も 44px」に直した判断を戻すことになる、ため不採用。+10px はドック内の横方向だけで、名札・アリーナ・手札・高さには波及しない（実測）。

---

## 5. ONE RECOMMENDED NARROW PILOT — **Dock Controls Plate v1**

- 範囲：**託宣バー（パネル・3 択・見出しのアイコン）・ラウンドを終える・ログ**の形・材質・書体・行送り・折返し
- 変えない：ドックの高さ・託宣ボタンの高さ・ラウンドを終える／ログの高さ・PC の全寸法・文言・font-size・font-weight・色の意味（金＝主操作・紫＝託宣）・press 反応（`press.css`）・focus-visible・disabled 表現・DOM 構造（見出しのアイコン 1 要素を除く）・`src/core`
- 唯一の寸法変更：**SP（≤899px）の操作列 96→106px とそれに合わせた託宣パネルの右予約 106→116px**
- 新 asset 0・新アニメーション 0・`backdrop-filter` 増減 0

---

## 6. FINAL SPEC

### 6-1. ファイル（競合回避を最優先）

| ファイル | 変更 | 理由 |
|---|---|---|
| `src/components/battle/dockControls.css`（新規） | §6-2 の全規則 | `battle.css` を触らない（Lane2 末尾追記・Lane3 A' の `.card-view > .card-view-cost` と物理的に離す） |
| `src/components/battle/DivinationPanel.tsx` | ① 先頭に `import './dockControls.css'` ② 38 行目 `🙏 託宣（…）` → `<GlyphIcon glyph="eye" className="divination-panel-glyph" />託宣（…）` | 他のどの Pilot も触っていないファイル。`GlyphIcon`・`eye` は既存（`cardIcon.tsx`）。star は「天啓」と重なるため使わない（プロトタイプの画像は代用で star） |
| `src/components/battle/dockControls.test.ts`（新規） | §7-1 A6〜A9 の静的検査 | `hudPlate.test.ts` と同じ型 |

**cascade の注意**：`DivinationPanel` は `BattleScreen.tsx:43` で `battle.css`（`:48`）より先に import される＝`dockControls.css` は `battle.css` より**前**に並ぶ。よって全セレクタを `body.battle-viewport .battle-dock …`（詳細度 0,3,1〜0,4,1）で書き、`battle.css` の最強の同系規則（メディアクエリ内 0,3,1）に順序でなく詳細度で勝つ。`:hover` と `.is-open` は battle.css 側（0,2,0〜0,3,0）が負けるため、**本ファイルに hover／is-open を書き直す**（書かないと hover が消える）。

### 6-2. 値（`proto-dock-v2.css` と同値＋hover・見出しアイコン）

```css
/* 書体：本文（index.css の system-ui スタック）と揃える */
body.battle-viewport .battle-dock .divination-choice,
body.battle-viewport .battle-dock .battle-dock-actions .end-round-button,
body.battle-viewport .battle-dock .battle-dock-actions .battle-log-toggle { font-family: inherit; }

/* metric lock：Before（Meiryo normal）の行送りを px で固定＝高さ差 0 */
body.battle-viewport .battle-dock .divination-choice { line-height: 1.5; }          /* 効果文 10px→15 */
body.battle-viewport .battle-dock .divination-choice-name { line-height: 17px; }    /* PC 11px */

/* 託宣バー（Secondary：紫の札） */
body.battle-viewport .battle-dock .divination-panel { border-radius: 4px; }
body.battle-viewport .battle-dock .divination-choice {
  border-radius: 3px;
  background: linear-gradient(180deg, #ffffff0a 0%, #ffffff00 40%), linear-gradient(180deg, #1a1330 0%, #0e0a19 100%);
  box-shadow: inset 0 0 0 1px #000000a6;
}
body.battle-viewport .battle-dock .divination-choice-glyph { border-radius: 3px; }
body.battle-viewport .battle-dock .divination-panel-glyph {
  display: inline-block; width: 1.2em; height: 1.2em; vertical-align: -0.22em; margin-right: 0.45em; color: #e2bd6a;
}   /* 🙏＋空白と同じ送り幅（PC 実測で見出し幅差 0） */

/* ラウンドを終える（Primary：漆黒の札＋金の細縁） */
body.battle-viewport .battle-dock .battle-dock-actions .end-round-button {
  border-radius: 3px;
  border-color: #e2bd6a;
  background: linear-gradient(180deg, #ffe7b026 0%, #ffe7b000 38%), linear-gradient(180deg, #3d2c0c 0%, #1b1306 100%);
  color: #ffd88a;
  text-shadow: 0 1px 1px #000000cc;
  box-shadow: inset 0 0 0 1px #000000b3, inset 0 2px 0 -1px #ffe3a04d, 0 0 12px -4px #ffd16677, 0 3px 8px -2px #000000cc;
  word-break: auto-phrase;        /* 句で折る（Chromium 119+・html lang="ja"）。非対応は幅で保証 */
  line-height: 20px;              /* PC：2 行×20＝62px（Before と同じ） */
  padding-left: 18px; padding-right: 18px;   /* PC：内幅 94→74＝5 字（67.6）入り 6 字（81.1）入らない */
}

/* ログ（Tertiary：漆黒・金を弱く） */
body.battle-viewport .battle-dock .battle-dock-actions .battle-log-toggle {
  border-radius: 3px; border-color: #b8914a59;
  background: linear-gradient(180deg, #16131f 0%, #0b0a12 100%);
  color: #b9c0dd;                 /* 近似コントラスト 4.95 → 約 10【近似：地色の単色近似】 */
  line-height: 17px;              /* PC：29px を維持 */
}
body.battle-viewport .battle-dock .battle-dock-actions .battle-log-toggle.is-open {
  border-color: #e2bd6a99; background: linear-gradient(180deg, #2a2110 0%, #14100a 100%); color: #ffd9a0;
}

/* hover は決定200 と同じ guard の中だけ（touch で残らない） */
@media (hover: hover) and (pointer: fine) {
  body.battle-viewport .battle-dock .battle-dock-actions .end-round-button:not(:disabled):hover {
    background: linear-gradient(180deg, #ffe7b040 0%, #ffe7b000 44%), linear-gradient(180deg, #4a360f 0%, #221808 100%);
    box-shadow: inset 0 0 0 1px #000000b3, inset 0 2px 0 -1px #ffe3a066, 0 0 20px -3px #ffd166aa, 0 3px 8px -2px #000000cc;
  }   /* battle.css:32 の translateY(-2px) は transform なので残る（本ファイルは transform を書かない） */
  body.battle-viewport .battle-dock .divination-choice:hover:not(:disabled) {
    background: linear-gradient(180deg, #ffffff12 0%, #ffffff00 40%), linear-gradient(180deg, #261b3e 0%, #150f24 100%);
  }
  body.battle-viewport .battle-dock .battle-dock-actions .battle-log-toggle:hover { border-color: #ffd16688; color: #ffd9a0; }
}

/* SP（battle.css の 390 系メディアクエリと同じ境界） */
@media (max-width: 899px) {
  body.battle-viewport .battle-dock .divination-panel { padding-right: 116px; }    /* 106 → 116 */
  body.battle-viewport .battle-dock .battle-dock-actions { width: 106px; }          /* 96 → 106：終了 58＋4＋ログ 44 */
  body.battle-viewport .battle-dock .battle-dock-actions .end-round-button {
    padding: 4px 2px;             /* 幅 58＝内幅 52：全角仮名 5 字（50）入り 6 字（60）入らない */
    line-height: 1.15;            /* 既存値を明示（PC の 20px を打ち消す） */
  }
  body.battle-viewport .battle-dock .battle-dock-actions .battle-log-toggle { line-height: 1.5; }
  body.battle-viewport .battle-dock .divination-choice-name { line-height: 15px; }    /* SP 10px */
  body.battle-viewport .battle-dock .divination-choice-preview { line-height: 14px; } /* SP 9px */
}
```

### 6-3. SP／PC の結果（v2 実測）

| | SP 360 | SP 390 | PC 1280 | PC 1508 |
|---|---|---|---|---|
| ラウンドを終える | 48×44.5 → **58×44**・3 行 → **「ラウンドを／終える」** | 同 | 112×62 → **112×62**・「ラウンドを／終える」 | 同 |
| 託宣ボタン | 72.7×39 → 69.3×**39** | 82.7×39 → 79.3×**39** | 341.6×61 → 341.6×**61** | 341.6×44 → **44** |
| 「今なら」省略 | 省略 → 省略（Before から） | **省略 → 全表示**（Windows） | 全表示 | 全表示 |
| ドック外の差 | **0** | **0** | **0** | **0** |
| ドック内の差（>0.5px） | 13 件（すべて託宣バー／操作列の x・w、最大 10） | 13 件（同） | 3 件（文字 span の幅のみ） | 2 件（同） |

見た目：`out/before-*-crop-dock.png` と `out/v2-*-crop-dock.png` を並べて比較（見出しのアイコンは代用の star）。

### 6-4. reduced-motion
- アニメーション・transition を**追加しない**。`press.css` の Tier1／Tier2 の沈み（`transform`／`filter`）と reduced-motion 分岐、`battle.css:26` の transition はそのまま効く（本ファイルは `transform`・`filter`・`transition`・`opacity`・`outline` を書かない＝押下・disabled・focus-visible の表現は不変）

### 6-5. 他 Pilot とのファイル競合回避・適用順
| Pilot | 触るファイル | 本 Pilot との関係 |
|---|---|---|
| HUD Plate v1 | `hudPlate.css`（新）・`HpBar.tsx` | ファイル重複 0。セレクタは `.battle-main` 配下、本件は `.battle-dock` 配下＝重複 0。色（`#e2bd6a`・`#b8914a`）を共有して材質言語を揃える |
| Lane3 After-1 / A' | `CardView.tsx`・`cardBonusText.ts`・`artWindow.*`・`battle.css`（`.card-view > .card-view-cost`） | 重複 0。本件は `.card-view` を 1 つも書かない。手札の `.hand` も触らない |
| Sound tap SE | `sound.ts`・`feelTier.ts`・`useBattleSound.ts`・`useGameEngine.ts` | 重複 0。終了ボタン押下の SE は JS 側で、本件の CSS と独立 |
| Lane2（決定232 以降） | `BattleScreen.tsx`・`battle.css` 末尾など | 重複 0（`BattleScreen.tsx` を触らない） |

**適用順**：どれが先でもテキスト衝突 0。推奨は HUD → 本件（材質の色を HUD と目視で揃えやすい）。Lane3 A' が `battle.css` に入っても、本件の詳細度（0,3,1〜0,4,1）は影響を受けない。

---

## 7. ACCEPTANCE CRITERIA

### 7-1. 自動 Gate
| # | 基準 | 方法 |
|---|---|---|
| A1 | **ドック外の要素（上部バー・`.battle-main`・名札 3 枚・敵立ち絵・HP・予告・共鳴ゲージ・神の立ち絵）の x/y/w/h 差 ≤ 0.5px**（360／390／1280／1508） | `measure.mjs` を Before（Production dist）と After（Pilot dist）で実行し比較 |
| A2 | ドック・託宣パネル・託宣ボタン・ラウンドを終える・ログの**高さ差 ≤ 0.5px**。幅・x の差は SP の託宣バー／操作列だけで ≤ 10px | 同 |
| A3 | 「ラウンドを終える」が全 VP で `ラウンドを／終える`（2 行）かつ `scrollWidth − clientWidth = 0` | 同（`endRound.text`・`textOverflow`） |
| A4 | CDP の実描画フォントでドック内の Meiryo・Segoe UI Emoji が 0 | 同（`fonts`） |
| A5 | タップ領域：SP 終了 ≥ 44×44（実測 58×44）・ログ 44×44・託宣の判定 45、PC ログ判定 45 | 同（`hits`） |
| A6 | `dockControls.css` の全セレクタが `body.battle-viewport .battle-dock` 始まり。`transform`／`opacity`／`outline`／`transition`／`animation`／`font-size`／`font-weight` を含まない。寸法プロパティは許可リスト（SP の `width`・`padding-right`・`padding`、PC の `padding-left/right`、`line-height`）のみ | `dockControls.test.ts` |
| A7 | `:hover` はすべて `@media (hover: hover) and (pointer: fine)` 内（決定200） | 同 |
| A8 | `DivinationPanel.tsx` に `\p{Extended_Pictographic}` が 0 | 同 |
| A9 | `npm test`・`tsc`・`lint`・`build` 全通過。`battleViewportLayout.test.ts`・`pressFeel.test.ts` 無変更で通過 | CI 相当 |
| A10 | pageerror／console error 0 | `measure.mjs` |

### 7-2. Human QA（Before＝Production／After＝Pilot・同じ seed・SP 実機＋PC）
1. 「ラウンドを終える」は、文字を読む前に「ここでターンを終える」ボタンだと分かったか（はい が合格）
2. 託宣・ラウンドを終える・ログが、Web のボタンではなく上の名札と同じ「札」の仲間に見えたか（はい が合格）
3. 託宣を押そうとして、狭くなった・押しにくい・「今なら ブロック◯」が読めなくなったと感じたか（**いいえ が合格**）
4. 金の縁の「ラウンドを終える」が、⚡や READY のカードより目立って邪魔に感じたか（**いいえ が合格**。はい の場合は外光 `0 0 12px -4px` を 0 にするのが次の調整値）

---

## 8. Risks・触れないもの

| リスク | 対策 |
|---|---|
| SP の託宣 3 枚が各 3.4px 狭くなり、仮名が全角の端末（iOS の Hiragino・Android の Noto）で「今なら ブロック◯」の省略が増える【推測：360 は Before から省略、390 は端末依存】 | 情報は `title`・押下後のブロック表示で失われない（Phase 5-D の既存方針）。Human QA Q3。悪化なら託宣の間隔 6→4px で 1.3px/枚を戻す（高さに影響しない） |
| `word-break: auto-phrase` は Safari・Firefox 非対応 | 幅で保証：SP 内幅 52（全角 5 字 50 ≦ 52 ＜ 6 字 60）、PC 内幅 74（5 字 67.6 ≦ 74 ＜ 6 字 81.1）。Windows の Yu Gothic UI は仮名が詰まり幅だけでは 6 字入る（v1 で実測）が、Windows の Chromium/Edge は auto-phrase 対応。**iPhone 実機での 2 行確認を Human QA に含める** |
| 行送りの px 固定で、Windows 以外の端末では数 px 以下の高さ差が出る【推測：Hiragino／Noto の normal はほぼ 1.45〜1.5 で、固定値との差は 1 行 0.5px 程度】 | Gate は Windows Chromium（決定164／170／228–232 と同じ測定系）で差 0。実機 Human QA で目視 |
| 詳細度 0,4,1 で将来の `battle.css` 変更が効かない | `dockControls.test.ts` で接頭辞を固定し、以後のドック材質変更はこのファイルに集約 |
| 見出しアイコン（`eye`）の意味が伝わらない | 文言「託宣（残り…）」は不変。アイコンは装飾（`aria-hidden`） |

**触れないもの**：`src/core`・数値・save・文言・font-size・font-weight・`battle.css`・`BattleScreen.tsx`・`CardView.tsx`・`press.css`・手札（`.hand`・スクロール・カード）・上部バー・名札（HUD Pilot）・チュートリアル（`TutorialOverlay.tsx` の終了ボタン見本は旧配色のまま＝意図的・次段で揃える）・結果画面の `.game-over-card button`（`.end-round-button` と既定を共有しているが本件は `.battle-dock` 配下のみ）・`docs/DECISIONS.md`（採用時に PM が追記）

---

## 9. NEXT NOW（1 つ）

**Production から Pilot ブランチ（例 `feat/dock-controls-plate-v1`）を切り、§6-1 の 3 ファイル（`dockControls.css` 新規・`DivinationPanel.tsx` 2 箇所・`dockControls.test.ts` 新規）を実装 → Pilot を build して `scripts/dock-controls-audit/measure.mjs` の計測関数で Before／After（dist 同士）を比較し §7-1 A1〜A5・A10 を確認 → Before／After を並べて Human QA（§7-2、iPhone 実機を含む）。**

---

## 10. Pilot 実装・Fast Gate（2026-09-27／AI 判断・Human QA 待ち）

### 10-1. 作業場所
- worktree：`C:/Users/kimi1/SevenGodsGame-dock`／branch `feat/dock-controls-plate-v1`（`master`＝`245ecdc`＝Production から作成）。**未 commit・未 push・未 merge・未 deploy**
- 本書と `scripts/dock-controls-audit/` は main worktree で未追跡だったため、この worktree へ複製してから本節を追記（main worktree は無変更）

### 10-2. 変更ファイル（仕様 §6-1 の 3 ファイルのみ）
| ファイル | 差分 | 内容 |
|---|---|---|
| `src/components/battle/dockControls.css` | 新規 +120 | §6-2 と同値（書体 inherit・metric lock・auto-phrase・漆黒の札＋金細縁・hover は決定200 guard 内・SP 操作列 106／右予約 116） |
| `src/components/battle/DivinationPanel.tsx` | +2 −1 | `import './dockControls.css'` 1 行／🙏 → `<GlyphIcon glyph="eye" className="divination-panel-glyph" />`（`aria-hidden`、文言は不変） |
| `src/components/battle/dockControls.test.ts` | 新規 +127（8 件） | 読み込み元・接頭辞 `body.battle-viewport .battle-dock`（A6）・禁止プロパティ（transform／opacity／outline／transition／animation／font-size／font-weight／filter）・寸法の許可リスト・SP 106／116・auto-phrase・hover guard（A7）・絵文字 0（A8） |
| `scripts/dock-controls-audit/measure-ab.mjs` | 新規（計測用） | Before／After を別サーバーで 1 VP ずつ逐次実測し比較。`ANIM=none` で対照計測 |

`src/core`・`public`・`package*.json`・`battle.css`・`BattleScreen.tsx`・`CardView.tsx`・`press.css`・sound 系・`HpBar.tsx`／`hudPlate.*`・`docs/DECISIONS.md`：**変更 0**。

### 10-3. 自動 Gate
| 項目 | 結果 |
|---|---|
| `dockControls.test.ts`＋`battleViewportLayout`・`combatTimeline`・`pressFeel`・`readyMaterial`・`victoryReveal` | 6 files／64 tests PASS（既存テストは無変更） |
| `npx vitest run --dir src`（ブラウザ計測と非同時） | **94 files／1183 tests PASS**（31s・タイムアウト 0） |
| `npx tsc -b --noEmit`／`npx oxlint src` | 0／0 |
| clean build（`rm -rf dist && npm run build`） | PASS（`dist` は dock worktree に残置） |

### 10-4. バンドル差（vs `SevenGodsGame-lane2-rc/dist`＝Production 245ecdc）
| | Before | After | 差 |
|---|---|---|---|
| CSS | 159,525 B（gz 30,063） | 162,338 B（gz 30,563） | +2,813 B（gz +500） |
| JS | 437,925 B（gz 133,437） | 437,983 B（gz 133,441） | +58 B（gz +4） |
| その他の出力ファイル | — | — | 一覧同一（asset 追加 0） |

### 10-5. ブラウザ実測（A1〜A10）
方法：After＝`vite preview` 127.0.0.1:4281（dock `dist`）、Before＝127.0.0.1:4282（lane2-rc `dist`・再ビルドなし）。`?seed=dockaudit-taiyo`・大耀 × 蒼海の龍神・開始直後。Windows Chromium（playwright）、SP は touch・DPR2。5 VP × 2 ロードを逐次（1 ロード 9〜23 秒）。計測後に 4281／4282 を停止。出力：`scripts/dock-controls-audit/out/pilot/`（`ab-measure.json`・`ab-measure-animnone.json`・`before|after-<VP>.png`・`*-crop-dock.png`）

| # | SP 360 | SP 390 | SP 430 | PC 1280 | PC 1508 | 判定 |
|---|---|---|---|---|---|---|
| A1 ドック外の差（>0.5px） | 0 | 0 | 0 ※ | 0 ※ | 0 ※ | PASS |
| A2 高さ差（ドック・託宣パネル・託宣 3 枚・行・手札・操作列・終了・ログ） | 0 | 0 | 0 | 0 | 0 | PASS |
| A2 x・幅の差（文字 span 除く） | 託宣バー／操作列のみ・最大 10（託宣 −3.4／枚） | 同 | 同（−3.3／枚） | 0 | 0 | PASS |
| A3 「ラウンドを終える」 | ラウンドを／終える・はみ出し 0 | 同 | 同 | 同 | 同 | PASS（Before：SP「ラウン／ドを終／える」、PC「ラウンドを終／える」） |
| A4 ドック内 Meiryo／Segoe UI Emoji | 0（Before：Meiryo 4 箇所＋Arial＋Emoji 1） | 0 | 0 | 0 | 0 | PASS（すべて Yu Gothic UI＝名札と同じ） |
| A5 タップ領域 | 終了 58×44・ログ 44×44（判定 45）・託宣 69.3×39（判定 45） | 終了 58×44・託宣 79.3×39 | 終了 58×44・託宣 92.7×39 | 終了 112×62・ログ 112×29（判定 45）・託宣 341.6×61 | 112×62・託宣 341.6×44 | PASS（決定164／170 ≥44） |
| A6〜A8 静的検査 | — | — | — | — | — | PASS（`dockControls.test.ts`） |
| A9 test／tsc／lint／build | — | — | — | — | — | PASS |
| A10 pageerror／console error（Before/After） | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | PASS |

※ 通常計測（アニメーションを一時停止するだけ）では 430／1280／1508 で**敵立ち絵 `.enemy-avatar` のみ** 0.6〜1.9px の差が出た。Before と After が別ロードのため待機アニメーション（transform）の位相が違うことが原因で、`ANIM=none`（両方のアニメーションを無効化）の対照計測では 3 VP とも**ドック外 0**。ドック内の差・折返し・書体も同一結果。

補足：
- 見出しアイコン：`svg`（`aria-hidden="true"`）SP 12×12／PC 13.2×13.2、見出し文字列は「託宣（残り7回・1ラウンド1回まで）」（🙏 のみ除去）
- 「今なら ブロック20」：360 は Before／After とも省略（…）、390 は Before 省略 → **After 全表示**、430 以上は両方全表示（Windows）
- PC hover：終了ボタンは hover 用グラデーションに切り替わり、`battle.css` の `translateY(-2px)` は残る（`matrix(1,0,0,1,0,-2)`）
- reduced-motion：本ファイルは transition／animation／transform を書かない（静的検査で固定）ので既存の reduced-motion 分岐は不変

### 10-6. 仕様からの逸脱
- 実装上の逸脱 **0**（値は §6-2 と同一）。追加は計測スクリプト 1 本と SP 430 VP の追加計測のみ
- 本書と計測フォルダを dock worktree へ複製した（main worktree へは書き込まない制約のため）。採用時は dock 側の版を正とする

### 10-7. Known Risks
| リスク | 状況／次の手 |
|---|---|
| iPhone（Safari）は `word-break: auto-phrase` 非対応 | 幅（SP 内幅 52px＝全角 5 字）で「ラウンドを／終える」を保証する設計。Windows Chromium でしか実測していない → **Human QA で iPhone 実機の 2 行を確認** |
| 仮名が全角の端末で託宣 3 枚（各 −3.4px）の「今なら ブロック◯」が省略されやすくなる | 360 は Before から省略。悪化時は託宣の間隔 6→4px で戻す（高さ不変） |
| 行送り px 固定で非 Windows 端末に 1px 未満の高さ差【推測】 | 実機目視 |
| 詳細度 0,4,1 のため将来 `battle.css` 側のドック変更が効かない | ドック材質の変更は本ファイルに集約（test で接頭辞固定） |
| `pressFeel.test.ts` の sticky hover 監査一覧に本ファイルが入っていない | 同等の検査（A7）を `dockControls.test.ts` が担う。一覧への追加は `pressFeel.test.ts` 変更になるため採用時に PM 判断 |
| チュートリアルの終了ボタン見本は旧配色のまま | 意図的（§8）。次段で揃える |

### 10-8. Human QA 計画（Before／After を並べて比較）
- Before：`C:/Users/kimi1/SevenGodsGame-lane2-rc/dist`（Production 245ecdc）
- After：`C:/Users/kimi1/SevenGodsGame-dock/dist`
- 盤面：`?seed=dockaudit-taiyo` → 大耀 → 蒼海の龍神 → バトル開始直後（PC と SP 実機、できれば iPhone を含む）
- 質問（はい／いいえ）
  1. 「ラウンドを終える」は、文字を読む前に「ここでターンを終えるボタンだ」と分かりましたか？（**はい** が合格）
  2. iPhone で「ラウンドを終える」が「ラウンドを」「終える」のちょうど 2 行に分かれて、ボタンからはみ出していませんか？（**はい** が合格）
  3. 託宣・ラウンドを終える・ログが、Web のボタンではなく上の名札と同じ「札」の仲間に見えましたか？（**はい** が合格）
  4. 託宣のボタンが狭くなった・押しにくい・「今なら ブロック◯」が読めなくなった、と感じましたか？（**いいえ** が合格）
  5. 金の縁の「ラウンドを終える」が、⚡や READY のカードより目立ちすぎて邪魔だと感じましたか？（**いいえ** が合格。はい の場合は外光 `0 0 12px -4px` を 0 にするのが次の調整）
  6. 託宣の見出しの目のアイコン（元は 🙏）に違和感はありませんか？（**はい（違和感なし）** が合格）

**結論：Fast Gate PASS（A1〜A10 すべて合格）→ Human QA READY。**

---

## 11. 決定234 — Human QA PASS と Release Gate（2026-09-27）

### 11-1. CEO Human QA — **PASS**
Q1 文字を読む前に「ターンを終えるボタン」と分かる **はい**／Q2 iPhone で「ラウンドを」「終える」の 2 行・はみ出しなし **はい**／Q3 札の仲間に見える **はい**／Q4 託宣が狭い・押しにくい・読めない **いいえ**／Q5 金の縁が⚡・READY より目立ちすぎ **いいえ**／Q6 目のアイコンに違和感 **いいえ**。本 Pilot を **決定234 Dock Controls Plate v1** とする。

### 11-2. Release Gate — **PASS／Blocker 0 → PRODUCTION RELEASE READY（CEO 承認待ち）**
| 項目 | 結果 |
|---|---|
| commit | Human QA 済みの差分をそのまま local commit **`74cfb0e`**（`feat/dock-controls-plate-v1`・3 ファイル +249／−1。差分は `scripts/dock-controls-audit/out/dock-v1-qa.diff`） |
| RC | `release/d234-dock-controls-rc`＝**`74cfb0e`**（新規 worktree `C:/Users/kimi1/SevenGodsGame-dock-rc`・`npm ci`）。親は master＝origin/master＝**`245ecdc`**＝clean Production の上に commit 1 つ・worktree clean |
| Human QA 済みとの一致 | RC clean build の **JS `index-0q9BFYPl.js`（md5 `41a412fa…`）・CSS `index-C4MvV85H.css`（md5 `0704c650…`）が Human QA の After と byte 同一** |
| Automated | targeted 6 files・**64 PASS**／full 94 files・**1,183 PASS**（他レーンのブラウザ計測 0 の状態で実行・タイムアウト 0）／tsc 0／lint 0／clean build PASS |
| Isolation | 変更は `DivinationPanel.tsx`（import 1 行・🙏→`GlyphIcon eye`）・新規 `dockControls.css`・新規 `dockControls.test.ts` のみ。`src/core`／`public`（assets 210 ファイル md5 一致）／package 差分 0。save・gameVersion・`Math.random`・決定213 の混入 0 |
| 決定224／226／228〜232 | Fast Gate（§10）の証跡を再利用：ドック外の移動 0（凍結比較）・ドック各部の高さ差 0・console error 0 |
| Bundle（Production `245ecdc` 比） | JS 437,925→437,983B（**+58B**・gzip +8B）／CSS 159,525→162,338B（**+2,813B**・gzip +482B）／新規 asset 0 |
| Blockers | **0** |
| Rollback 先 | 現 Production deployment **`6689024801`**（`245ecdc`） |
| 決定233（Sound）との順序 | どちらも `245ecdc` の上の RC。ファイルは重ならない（Sound＝sound 系 5 ファイル、Dock＝上の 3 ファイル）。**後から出す方は、先に出た方の master へ rebase して再 build → md5 は変わるため、テスト・build・Narrow Smoke を最小構成で取り直す** |
| Release 手順（CEO 承認後のみ・未実施） | `git fetch . release/d234-dock-controls-rc:master`（fast-forward）→ `git push origin master` → 配信 bundle と RC の md5 一致確認 → Narrow Production Smoke（ドック外の移動 0・「ラウンドを／終える」2 行・Meiryo／絵文字 0・タップ領域・console error） |

**状態：決定234 = Human QA PASS（CEO）／Release Gate PASS（AI 判断）／PRODUCTION RELEASE READY — CEO 承認待ち。**

---

## 12. 決定234 Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-27 JST・CEO 承認）
| 項目 | 値 |
|---|---|
| 順序 | CEO 指示「決定233 Sound → 決定234 Dock の順で、1 つずつ Release → Smoke PASS を確認してから次へ」。決定233 の Smoke PASS 後に着手 |
| rebase | RC を新しい master `c6d4462`（決定233）へ rebase：`74cfb0e`→**`a3a363a`**（衝突 0・差分は同じ 3 ファイル）。最小の Gate を取り直し：full 95 files・**1,195 PASS**（Sound＋Dock のテストを含む・他レーンの計測なし）／tsc 0／lint 0／build PASS。**CSS `index-C4MvV85H.css` は Human QA の After と md5 一致（`0704c650…`）**＝見た目は QA 時と同一。JS `index-CxMPEs7X.js`（決定233 比 +59B）。assets 一致 |
| merge／push | `git fetch . release/d234-dock-controls-rc:master`（fast-forward）→ `git push origin master`（16:58 JST・`c6d4462..a3a363a`） |
| Vercel | deployment **`6689677741`**（`a3a363a`・Production）success（2026-09-27T07:58:36Z） |
| 配信 bundle | `index-CxMPEs7X.js`／`index-C4MvV85H.css`＝RC build と **md5 一致** |
| Rollback 先 | **`6689622311`**（`c6d4462`・決定233） |

### 12-1. Narrow Production Smoke（`measure-ab.mjs`・Before＝直前の Production `c6d4462` build／After＝Production）
| 幅 | ドック外の移動 | 高さ・位置の差 | 「ラウンドを終える」 | はみ出し | Meiryo／絵文字 | タップ領域（終了／ログ／託宣） | error |
|---|---|---|---|---|---|---|---|
| 360×780 | 0 | 0 | ラウンドを／終える（Before：ラウン／ドを終／える） | 0 | 0 | 58×44／44×44／45px | 0 |
| 390×844 | 0 | 0 | 同上 | 0 | 0 | 58×44／44×44／45px | 0 |
| 1508×660 | 0 | 0 | ラウンドを／終える（Before：ラウンドを終／える） | 0 | 0 | 112×62／112×29（判定 45px）／44px | 0 |
- 証跡：`scripts/dock-controls-audit/out/prod234/`

**Decision234 Dock Controls Plate v1 = PRODUCTION LIVE / CLOSED。** Production＝**`a3a363a`**。
