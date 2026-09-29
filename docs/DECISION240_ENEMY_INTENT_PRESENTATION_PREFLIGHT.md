# 決定240 Enemy Intent Presentation v1 — 予告を板の文字から敵の構えへ（Preflight ＋ 自動 Gate）

- 日付：2026-09-27
- 担当：Lane A（AI 判断・CLAUDE.md §6）。CEO は Preflight → 実装 → 自動 Gate → Human QA READY まで GO 済み
- ブランチ：`feat/d240-enemy-intent-v1`（Production `f8183eb` から・worktree `SevenGodsGame-intent`）。**merge／push／deploy はしない**
- 設計ソース：`docs/PREMIUM_REAUDIT_2026-09-27.md` §0／§4、`docs/DECISION225_BATTLE_SCREEN_PREMIUM_QUALITY_AUDIT.md` §F、`docs/HUD_PREMIUM_PRE_AUDIT.md` §4 案 D
- 判定：**§9 の末尾**（HUMAN QA READY／BLOCKER）

---

## 0. 結論（先に）

| 項目 | 内容 |
|---|---|
| 何をしたか | ① 名札の予告 `.intent` の先頭絵文字（⚔／💥／🔥／⚡）を既存 SVG `GlyphIcon`（sword／swordHeavy／burst／bolt）へ置換 ② 予告の危険度（strong／huge／special）を **敵の立ち絵そのもの**に「構え」として出す（charge は既存 `enemy-avatar-charging` のまま・normal は何も足さない） |
| 変えていないもの | `formatEnemyIntent` の文言（語・数値）、`getIntentTierClass`（名札の色）、`src/core`、rules、save、予告の数値・tier 閾値、入力ロック、保護決定 224／226／229／232〜239 の CSS ブロック、新 asset／SE 0 |
| 変更ファイル（runtime） | `src/components/battle/cardStyle.ts`（純関数 4 つ追加）／`cardStyle.test.ts`（5 件追加）／`EnemyPanel.tsx`（クラス 1 つ・グリフ 1 つ）／`battle.css`（末尾に 決定240 ブロック追記のみ） |
| 容量 | 本番 build の差：CSS +1,359 B・JS +685 B（合計 +2,044 B ≤ 2,048 B）。gzip では +495 B |
| 自動 Gate | tsc 0／lint（src）0／vitest 1,250 件（後述）／build OK／Playwright Before＝`f8183eb` vs After＝本ブランチ、PC 1508×660・SP 390×844、3 敵（龍神・機工師・魔獣）× 2 端末 × Before/After＝12 戦 ＋ reduced-motion 2 戦。§9 |
| Human QA | **必要**（§8。3 問・同 seed Before/After・PC と iPhone）。「板を読む前に体で分かるか」は数値で判定できない |

---

## 1. 現状の描画経路（Production `f8183eb`）

| 層 | 場所 | 何をしているか |
|---|---|---|
| 予告の文言 | `cardStyle.ts:96-110 formatEnemyIntent` | `⚡ label`／`🔥 技名 240`／`⚔ 連撃 50+40`／`🔥 特大 220`／`💥 強打 110`／`⚔ 40`。**先頭の絵文字が tier の唯一の「形」の手がかり** |
| 名札の色 | `cardStyle.ts:122-135 getIntentTierClass` → `battle.css:619-660` | strong＝文字色のみ／huge＝text-shadow＋outline／charge＝金＋`::after` の呼吸（pulse は charge だけ） |
| 名札の寸法 | `battle.css:4733`（PC 20px・line-height 1.25＝25px）／`:5376`（SP 17px＝21.25px） | box-model に影響する装飾を使わない設計（`.battle-mini-result` の top が依存） |
| 敵の立ち絵 | `EnemyPanel.tsx:92-104` | `enemy-avatar-surge-*`（datenshi／onryo・R5 以降）と `enemy-avatar-charging(-super)`（charge の間）だけ。**strong／huge／special の間、立ち絵は何も変わらない** |
| 立ち絵の光 | `battle.css:3257`（STAGE-LITE） | `box-shadow: none; filter: drop-shadow(黒 12px) drop-shadow(紫 26px) drop-shadow(薄金 1px)`＝**輪郭追従**。charging は同じ連鎖の紫を金 32px に置換 |
| 絵文字の字形 | headless／Windows：Segoe UI Symbol（モノクロ）、iOS：カラー絵文字 | 端末で見え方が違う（決定225 §F・HUD 監査 §2） |

---

## 2. 予告の台帳（`src/core/data/enemies.ts`・通常難度・修正子なし）

危険度は `getIntentDangerLevel`（新設・表示専用）＝ `getIntentTierClass` と同じ判定（kind と 10／15 閾値、連撃は合計）。

| 敵 | R1 | R2 | R3 | R4 | R5 | R6 | R7 | normal | strong | huge | special | charge |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 試練の影（trial・lateSurgeMild） | 5 n | 6 n | 8 n | 9 n | 11 **S** | 13 **S** | 15 **H** | 4 | 2 | 1 | 0 | 0 |
| 業斧の鬼将（oni） | 5 n | 7 n | 9 n | 11 **S** | 13 **S** | 15 **H** | 17 **H** | 3 | 2 | 2 | 0 | 0 |
| 藍花の怨霊（onryo・lateSurgeStrong） | 3 n | 4 n | 6 n | 9 n | 13 **S** | 18 **H** | 23 **H** | 4 | 1 | 2 | 0 | 0 |
| 銀甲の機工師（karakuri） | 6 n | ⚡ **C** | 22 **H** | ⚡ **C**（super） | 主砲・神滅甲 24 **SP** | 7 n | 9 n | 3 | 0 | 1 | 1 | 2 |
| 双牙の魔獣（juuma・fast） | 5+4 n | 5+5 **S** | 双牙乱撃 4×3 **SP** | 7+6 **S** | 7+7 **S** | 8+7 **H** | 8+8 **H** | 1 | 3 | 2 | 1 | 0 |
| 蒼海の龍神（ryujin・heavy） | 4 n | 5 n | 7 n | 9 n | 12 **S** | 16 **H** | 20 **H** | 4 | 1 | 2 | 0 | 0 |
| 乱舞の道化（doukeshi） | 4 n | ⚡ **C** | 19 **H** | 6 n | 12 **S** | ⚡ **C** | 24 **H** | 2 | 1 | 2 | 0 | 2 |
| **合計 49** | | | | | | | | **21** | **10** | **12** | **2** | **4** |

- 危険（strong／huge／special／charge）＝ **28／49（57%）**。再監査 §0 の「27／49・normal 22」は概算で、静的データからの正確な数は上表（`cardStyle.test.ts` の台帳テストで固定）
- 1 戦で「構え」が変わる回数：龍神 3 回（R5 S→R6 H→R7 H は同形）、機工師 5 回、魔獣 6 回。normal は 21 行動＝**立ち絵は何も変わらない**
- 難易度（easy 0.85／hard 1.15）・Daily・神階・後半激化は `nextEnemyAction` で数値を掛けるため、tier の境界（10／15）をまたぐ行動がある（例：hard の龍神 R4 9→10.35→丸めで strong）。判定は表示側で `enemy.intent` の実値を読むだけなので、名札の色と構えは常に一致する

---

## 3. 提案仕様（level ごと・色に頼らない区別）

| level | 名札のグリフ | 立ち絵の構え（`.enemy-avatar` に付くクラス） | **色以外の手がかり** | 動き |
|---|---|---|---|---|
| normal（21） | `sword`（⚔ の代替） | なし | — | なし（静かなラウンドは静かなまま） |
| strong（10） | `swordHeavy`（💥 の代替・太い剣） | `enemy-avatar-intent-strong`：輪郭に沿う**細い一重のリム**（drop-shadow 2px） | 太さ＝細い・一重・姿勢そのまま | なし。付いた瞬間だけ 240ms で落ち着く（transition・motion 許可時のみ） |
| huge（12） | `burst`（🔥 の代替・八方の放射） | `enemy-avatar-intent-huge`：**太い二重のリム**（3px の芯 ＋ 24px の輪）＋ **3px 持ち上げ**（独立プロパティ `translate`） | 太さ＝太い・二重・姿勢が浮く | 同上 |
| special（2） | `burst` | `enemy-avatar-intent-special`：huge と同じ二重リム＋持ち上げ ＋ **足元の環**（`::after`・楕円 2px 枠＋内外グロー。高さ＝箱の 9%・幅＝高さ×8＝箱の高さ基準なので、手札 2 段で舞台が低い時も絵の足元に収まる） | 形＝足元に環がある（huge との差は形） | 同上 |
| charge（4） | `bolt`（⚡ の代替） | **既存のまま**：`enemy-avatar-charging`（金 32px）／`-super`（紅蓮）。pulse は名札の `.intent-tier-charge::after`（既存） | 色＝金（既存）・呼吸（既存・最上位のみ） | 既存 |

- 実装方式：既存 `filter: drop-shadow` 連鎖（STAGE-LITE）に赤のリムを **挟むだけ**。`box-shadow`・`animation`・keyframes は使わない → 決定232 の反応（親 `.enemy-reaction` の transform／filter animation）、決定229 の反転（`scale: -1 1`）、lunge（`transform`）と衝突しない
- 終盤 surge（試練の影・怨霊の紫）は `--d240-aura` に逃がして危険ラウンドでも保持する（構えが surge を消さない）
- 撃破中（`defeated`）は構えクラスを付けない（`.enemy-defeat` の崩壊と重ねない）
- 調整値はすべて `battle.css` 末尾ブロックの `--d240-*`（rim-thin 2px／rim-core 3px／rim-wide 24px／lift -3px／settle 240ms）。JS に px／ms は無い。新 timer 0・新 lock 0
- reduced-motion：追加 animation 0。settle の transition は `@media (prefers-reduced-motion: no-preference)` の中にだけ書く（reduce では最初から無い＝打ち消し不要）。静的なリム・環は残す（情報を失わない）
- グリフ：`.intent-glyph { width:.85em; height:.85em; margin-right:.2em; vertical-align:-.1em }`＝絵文字＋空白（実測 1.05em）と同じ幅。行高 1.25 の中に収まり、名札の寸法は不変（A1 で実測）。色は予告の文字色を継承（`stroke="currentColor"`）。**Gate 1 回目（1em＋0.3em）は SP 390 の「連撃 50+40」が 110px の列幅で折り返し名札が 76→97px になったため 0.85em に縮めた**（`scripts/decision240-intent/out-iter1-glyph1em/`）

### 3-1. 純関数（`cardStyle.ts`・表示専用・unit test 付き）

| 関数 | 入出力 |
|---|---|
| `getIntentDangerLevel(intent)` | `'none' \| 'strong' \| 'huge' \| 'special' \| 'charge'`。null／normal → none |
| `getIntentGlyph(intent)` | `GlyphKey \| null`（sword／swordHeavy／burst／bolt。既存キーのみ・`cardIcon.tsx` 変更 0） |
| `formatEnemyIntentText(intent)` | `formatEnemyIntent` の先頭絵文字 1 つ＋空白を除いたもの（語・数値は同一。`formatEnemyIntent` 自体は不変） |
| `getIntentStanceClass(intent)` | `'enemy-avatar-intent-strong' \| '-huge' \| '-special' \| ''`（normal・charge・null は空） |

---

## 4. 触るもの／触らないもの

| 触る | 触らない |
|---|---|
| `cardStyle.ts`（末尾に追記＋`import type { GlyphKey }`）／`cardStyle.test.ts`（末尾に describe 1 つ）／`EnemyPanel.tsx`（import・`stanceClass`・`.intent` の描画）／`battle.css`（末尾ブロックのみ） | `src/core/*`・`rules.ts`・`formatEnemyIntent`・`getIntentTierClass`・`cardIcon.tsx`・`enemyVfxTiming.ts`・`combatTimeline.ts`・決定224／226／229／232〜239 のブロック・`.result-toast`（別 lane）・`battle.css:602-660`（名札の tier 色）・`:3257-3292`（STAGE-LITE）・`:3872`（charging-super） |

---

## 5. 受け入れ基準（A1〜A9）

| # | 基準 | 計測 |
|---|---|---|
| A1 | 名札の寸法 ±0：`.intent`／`.enemy-plate`／`.enemy-plate-status` の offset 幅・高さが Before と SAME（PC・SP・全ラウンド） | Playwright（offset＝transform を含まない layout 値） |
| A2 | `.intent` の絵文字 0・SVG 1（予告なし時は SVG 0） | 同上（`[☀-➿\u{1F300}-\u{1FAFF}]`） |
| A3 | normal の行動で構えクラス 0。strong／huge／special で期待クラス。charge は既存クラスのみ | unit test（台帳 49 行動）＋ Playwright の実ラウンド |
| A4 | 決定232 の着弾（`data-impact-at`・`--stop`・反応クラス・神の突きの duration）が Before と SAME（≥3 手） | Playwright（龍神 R1〜R3 の攻撃 1 枚ずつ・PC と SP） |
| A5 | 決定229：SP の `scale: -1 1` が全ラウンド維持。構えは左右対称（drop-shadow のオフセット 0・環は中央） | Playwright（computed `scale`） |
| A6 | 撃破中に構えクラスを付けない（コード）／`translate` は `.enemy-avatar` の layout 箱（offset）を変えない | コード＋Playwright |
| A7 | reduced-motion：追加 animation 0・transition 0（`transitionDuration` 0s）。静的リムは残る | Playwright（`reducedMotion: 'reduce'`） |
| A8 | console error 0（全戦） | Playwright |
| A9 | 本番 build の JS＋CSS 差 ≤ 2KB／JS に新 timer・lock 0 | `dist/assets` の byte 差＋コード |

---

## 6. 反証（採用前に潰した点）

- **「四角い光」（再監査 R1）**：Production は既に `box-shadow: none; filter: drop-shadow` で輪郭追従（STAGE-LITE `battle.css:3257`）。本件も同じ連鎖に挟むため矩形にはならない（§10 の切り抜きで確認）
- **`impact-flash` の filter と衝突（R1・R5）**：`impact-flash` は親 `.enemy-reaction` の animation。`.enemy-avatar` の filter とは要素が違う → 合成される（明るさ×リム）。`box-shadow` の上書き問題（R5）は使わないので発生しない
- **グリフ幅で SP 360 の予告が折り返す（R2）**：グリフ 1em＋0.3em。絵文字（⚔ 約 1em＋空白）とほぼ同幅。A1 で高さ ±0 を実測
- **surge が消える**：`--d240-aura` で保持。試練の影 R5〜7・怨霊 R5〜7 は surge＋構えが同時に出る
- **決定232 の test が「ファイル最後の reduced @media は 232 のもの」を前提にしている**：本ブロックでは `prefers-reduced-motion: reduce` を書かず、`no-preference` で settle を有効化する側に倒した（test を触らない）
- **charge を触っていないか**：`chargingClass` の式・`enemy-avatar-charging(-super)` の CSS・`.intent-tier-charge` は無変更。`getIntentStanceClass` は charge で空文字
- **毎ラウンド光って疲れる（R3・決定224 §11）**：normal 21／49 は無変化。loop は増やしていない（pulse は charge の名札だけ・既存）。Human QA Q3 で最終判断

---

## 7. リスク

| # | リスク | 程度 | 対策 |
|---|---|---|---|
| R1 | drop-shadow が 5 段（huge）になり GPU 負荷が上がる | 低 | 既存 charging が 3 段・32px。SP でも idle 3.4s の合成は既存どおり。Human QA で iPhone 実機の体感を確認 |
| R2 | 足元の環（special）が PC の 10px レターボックスで足から少し離れる | 低 | §10 の切り抜きで確認。位置は `bottom: 1.5%; height: 9%` |
| R3 | huge の 3px 持ち上げが着弾位置と 3px ずれる | 低 | 着弾レイヤーは兄弟 `.enemy-hit-layer`（不変）。3px は idle 呼吸（-3px）と同程度 |
| R4 | 絵文字→SVG で iOS のカラー絵文字が消え、色の情報が減る | 低 | 文字色（tier 色）と形（4 グリフ）で担保。SVG は端末差 0 |

---

## 8. Human QA 計画（CEO・3 問）

- 同 seed Before／After：Before＝Production（`https://` の現行）／After＝本ブランチの preview。`?seed=d240-pilot-01`（ASCII）
- 組み合わせ：**大耀 × 蒼海の龍神**（R5 強打・R6 特大＝strong→huge の差）、**大耀 × 銀甲の機工師**（R2 溜め・R3 特大・R4 必殺充填・R5 必殺＝charge／huge／special）、余裕があれば **双牙の魔獣**（R2 強打・R3 必殺連撃）
- 端末：PC（1508 幅程度）と iPhone（縦）
- 質問（YES／NO）：
  1. **予告の板を読む前でも「次は危なそうだ」と敵の様子で感じたか**（期待 YES）
  2. **normal のラウンドとの違いが分かったか**（期待 YES。「毎ラウンド同じに見える」なら NO）
  3. **光りすぎ・うるさすぎ・戦闘の邪魔になっていないか**（期待 NO＝邪魔ではない）
- 撤退条件：Q3 が「邪魔」、Q2 が NO、または予告の数字・技名が読みにくくなった

---

## 9. 自動 Gate 結果（2026-09-27・worktree `SevenGodsGame-intent`）

### 9-1. 静的 Gate

| 項目 | 結果 |
|---|---|
| `tsc -b --noEmit` | 0 error |
| `oxlint src` | 0 warning／0 error（`scripts/` の既存 10 warning は Production と同じ・対象外） |
| `vitest run`（全件） | 1,244 件中 **1,234 passed／9 skipped**、残り 1 件＝`balanceSim.test.ts` STAKE-01 が全件並列時に 5,000ms timeout（3 回とも同じ 1 件・assertion 失敗ではない）→ **単独再実行で 11/11 PASS（6.2s）**。本件の変更は `src/core` 0 のため無関係（重い core test は指示どおり単独で再実行） |
| 追加 unit test | `cardStyle.test.ts` +5 件（危険度判定・グリフ・文言の同一性・構えクラス・**49 行動の台帳**） |
| 決定232 test（`combatTimeline.test.ts` 8.） | PASS。初版で本ブロックに `prefers-reduced-motion: reduce` を書いたところ「ファイル末尾の reduce @media は 232 のもの」という前提で FAIL → settle を `no-preference` 側に倒して解消（test は触っていない） |
| `npm run build` | OK。`dist/assets` の差：CSS 166,214 → 167,573 B（**+1,359**）／JS 440,522 → 441,207 B（**+685**）／合計 **+2,044 B ≤ 2,048** |
| JS の新 timer／lock | 0（`EnemyPanel.tsx`・`cardStyle.ts` に setTimeout／rAF／state 追加なし。`Math.random` 0） |
| 保護ブロック | `battle.css` の diff は `@@ -6856,3 +6856,83 @@` の **末尾 1 hunk のみ**（+80／−0）。決定224／226／229／232〜239・`.result-toast`（1990-2004）・`:602-660`・`:3257`・`:3872` は無変更 |

### 9-2. Playwright（Before＝`f8183eb`（d239-rc dist・:4361）／After＝本ブランチ dist（:4362）・seed `d240-pilot-01`・大耀）

実行：`scripts/decision240-intent/gate.mjs`（PC 1508×660・SP 390×844 × 龍神／機工師／魔獣 × Before/After＝12 戦）＋ reduced-motion（機工師・PC・2 戦）。比較：`cmp.cjs`。生データ `out/gate.json`・`out/gate-sp.json`・`out/gate-reduced.json`。

| # | 基準 | 結果 | 証拠 |
|---|---|---|---|
| A1 | 名札の寸法 ±0 | **PASS**：全 35 ラウンド（PC 15・SP 15・reduced 5）で `.intent` 高さ（PC 25／SP 21、charge の 2 行は 43）・`.enemy-plate`（PC 86／SP 76 または 97）・`.enemy-plate-status` が Before と SAME。`.intent` の幅は絵文字→SVG で −12〜+1px（PC「特大 220」112→100・SP「強打 120」92→82）＝短くなる方向のみ | `cmp.cjs` 出力 A1=true ×35 |
| A2 | `.intent` の絵文字 0・SVG 1 | **PASS**：35/35 で先頭絵文字 0・`svg.intent-glyph` 1。charge の label「⚠ 主砲充填開始…！」の ⚠ は文言の一部（`formatEnemyIntent` 不変の条件）として残る | 同上 |
| A3 | normal で構えクラス 0／期待クラス | **PASS**：normal 13 ラウンド＝構えクラス 0・立ち絵の class は Before と完全一致。strong 4（龍神 R5・魔獣 R2）＝`intent-strong`、huge 7（龍神 R6/R7・機工師 R3）＝`intent-huge`、special 4（機工師 R5・魔獣 R3）＝`intent-special`、charge 6（機工師 R2/R4）＝既存 `enemy-avatar-charging(-super)` のみ。unit test で 49 行動すべて確認 | 同上・`cardStyle.test.ts` |
| A4 | 決定232 の着弾 SAME | **PASS**：龍神 R1〜R3 の攻撃（一撃・速攻・呪縛）× PC/SP＝6 手。`data-impact-at`＝90・`--stop`＝30ms・`react-l1`・反応 animation の名前／delay／duration・神の突き（0.34s）が Before と一致（呪縛は妨害＝反応 0 で両者一致） | `cmp.cjs` A4=true ×6 |
| A5 | 決定229 の反転 | **PASS**：SP 15/15 ラウンドで computed `scale: -1 1`（Before と同じ）。構えは drop-shadow オフセット 0・環は `left:50%; translate:-50%` の中央 | `cmp.cjs` A5=true |
| A6 | layout 箱 ±0 | **PASS**：`.enemy-avatar` の offset（PC 83,0,290,194／手札 2 段時 83,−82,290,104／SP 0,0,176,168）が 35/35 で SAME。huge／special の `translate: 0 −3px` は合成のみ | `cmp.cjs` A6=true |
| A7 | reduced-motion | **PASS**：`transitionDuration` が全ラウンド 0s（`all 0s`）。追加 animation 0（`animationName` は Before と同じ enemy-idle／lunge のみ）。静的リム・環は残る（R3 huge・R5 special の filter 長 237） | `gate-reduced.json` |
| A8 | console error 0 | **PASS**：0（headless の「AudioContext encountered an error from the audio device」は Before/After 双方の環境ノイズで、Production 監査でも既知） | `consoleErrors` |
| A9 | 容量 ≤2KB・新 timer 0 | **PASS**：+2,044 B（§9-1） | `dist/assets` |

### 9-3. 反復（Gate で見つけて直したもの）

1. **グリフ 1em＋0.3em → 0.85em＋0.2em**：1 回目の Gate で SP 390 の魔獣 R1「連撃 50+40」が 110px の列幅で折り返し、名札が 76→97px（+21px）になった。絵文字＋空白の実測幅（1.05em）に合わせて縮小 → 2 回目で ±0（`out-iter1-glyph1em/` に 1 回目の証跡）
2. **special の環を箱の高さ基準に**：PC で手札が 2 段になると舞台の箱が 290×104 まで低くなり、`left:14%; right:14%` の環（幅 209px）が絵（幅 ≈100px）の外まで広がった。`height: 9%; aspect-ratio: 8/1` に変えて幅を高さから決める（104px の箱で 75px・SP 168px の箱で 121px）

### 9-4. 判定に含めなかったもの（Human QA へ）

- strong の「細いリム」は SP 390 では控えめ（PC 280px では輪郭に赤い線が読める）。**「normal と違うと分かるか」（Q2）は CEO の目で判定**。弱ければ `--d240-rim-thin` を 2→3px に上げる 1 行の調整で済む
- iPhone 実機の GPU 負荷（drop-shadow 5 段）は headless では測れない

---

## 10. 構えカタログ（`scripts/decision240-intent/out/`・After＝本ブランチ）

各 level について PC と SP を 1 枚以上。`*-stage.png` は敵の舞台の切り抜き（+40px）、同名の `.png` は全画面。Before は同じファイル名の `-before-` 版。

| level | 敵・ラウンド | PC | SP |
|---|---|---|---|
| normal | 蒼海の龍神 R1「40」 | `ryujin-pc-after-r1-normal-stage.png` | `ryujin-sp-after-r1-normal-stage.png` |
| strong（細い一重リム） | 蒼海の龍神 R5「強打 120」 | `ryujin-pc-after-r5-strong-stage.png` | `ryujin-sp-after-r5-strong-stage.png` |
| strong（連撃） | 双牙の魔獣 R2「連撃 50×2」 | `juuma-pc-after-r2-strong-stage.png` | `juuma-sp-after-r2-strong-stage.png` |
| huge（太い二重リム＋持ち上げ） | 蒼海の龍神 R6「特大 160」／銀甲の機工師 R3「特大 220」 | `ryujin-pc-after-r6-huge-stage.png`・`karakuri-pc-after-r3-huge-stage.png` | `ryujin-sp-after-r6-huge-stage.png`・`karakuri-sp-after-r3-huge-stage.png` |
| special（＋足元の環） | 銀甲の機工師 R5「主砲・神滅甲 240」／双牙の魔獣 R3「双牙乱撃 40×3」 | `karakuri-pc-after-r5-special-stage.png`・`juuma-pc-after-r3-special-stage.png` | `karakuri-sp-after-r5-special-stage.png`・`juuma-sp-after-r3-special-stage.png` |
| charge（既存・金） | 銀甲の機工師 R2「砲身に魔力を溜めている…」 | `karakuri-pc-after-r2-charge-stage.png` | `karakuri-sp-after-r2-charge-stage.png` |
| charge-super（既存・紅蓮） | 銀甲の機工師 R4「⚠ 主砲充填開始…！」 | `karakuri-pc-after-r4-charge-super-stage.png` | `karakuri-sp-after-r4-charge-super-stage.png` |
| reduced-motion | 銀甲の機工師 R1〜R5（PC） | `karakuri-pc-reduced-after-r*-stage.png` | — |

Before/After の同ラウンド比較例：`ryujin-pc-before-r5-tier-strong.png` vs `ryujin-pc-after-r5-strong.png`（PC 全画面）、`karakuri-sp-before-r5-tier-huge.png` vs `karakuri-sp-after-r5-special.png`（SP 全画面）。

---

## 11. 判定

**HUMAN QA READY**（A1〜A9 すべて PASS・保護決定のブロック無変更・merge／push なし）。CEO は §8 の 3 問で判定。撤退条件に当たれば worktree のブランチを捨てるだけで Production への影響は 0。

---

## Human QA（CEO・iPhone＋PC・Before `361a1c6`／After `01b66f4`）— **PASS**
Q1 予告板を読む前でも危険そうだと感じる **はい**／Q2 normal との違いが分かる **はい**／Q3 光りすぎ・うるさすぎ・邪魔になっていない **はい**。CEO 決定：strong の細リムは 2px のまま・追加調整なし。QA サーバー 4201／4202 停止・Firewall「QA5 Intent-D240 (temp)」2 本削除（残 0・Wi-Fi Public）。

## Release Gate — **PASS・Blocker 0**（PRODUCTION RELEASE READY）
| 項目 | 値 |
|---|---|
| RC | `release/d240-enemy-intent-rc`＝**`01b66f4`**（決定241 `361a1c6` 直上 1 commit・rebase 衝突 0・4 files +236/−4） |
| tests | full vitest **1,235 PASS**／9 skip（単独実行・timeout 0）、tsc 0、lint 0 |
| build | RC build＝Human QA の After build と **JS/CSS md5 一致**（`d30c5404…`／`c198bfae…`） |
| Rollback 先（予定） | 現 Production `6691898960`（`361a1c6`・決定241） |

## Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-27 JST・CEO 承認）
| 項目 | 値 |
|---|---|
| merge／push | fast-forward `361a1c6`→**`01b66f4`**、`git push origin master`（21:18 JST） |
| Vercel | deployment **`6692087936`** success |
| 配信 bundle | `index-DI4DksbZ.js`／`index-C_PvVv3w.css`＝RC build と **md5 一致**（`d30c5404…`／`c198bfae…`） |
| Narrow Production Smoke（`gate.mjs`・Before＝`361a1c6` ローカル／After＝Production・PC 1508＋SP 390・龍神／機工師／獣魔） | **A1 名札寸法 ±0**（全ラウンド・SP の 2 行予告も 97/97）／**A2 絵文字 0・SVG 1**／**A3 normal 構え 0**・危険クラス一致（strong→細リム・huge／special→`translate 0 -3px`・special→足元の環・charge→既存 pulse）／**A4 決定232 着弾 90ms・stop 30ms・`hit-shake-light`／`impact-flash`／`god-strike` 340ms SAME**／**A5 SP `scale:-1 1` SAME**／**A6 立ち絵の箱 ±0**／**A8 console error 0** |
| 計測ノイズ（欠陥ではない） | 初回 run で ①機工師 SP After の `page.screenshot` 30s timeout（Vercel 越し headless の停滞）②龍神 SP R2 の Before 側で着弾サンプル取りこぼし（After は 90/30ms で仕様どおり）③獣魔 SP After に `AudioContext … audio device` 1 件（headless の音声デバイス由来・アプリ側エラーではない）→ SP 2 体を再実行し **全項目 PASS・error 0** |
| Rollback 先 | **`6691898960`**（`361a1c6`・決定241） |

**Decision240 Enemy Intent Presentation v1 = PRODUCTION LIVE / CLOSED。** Production＝**`01b66f4`**。証拠 `scripts/decision240-intent/out/prod/`。
