> **状態（2026-10-21・Lane 5「v1.0.3 UX 改善候補」・Dev＋Planner・実装 branch `feat/v1_0_3-ux-bundle`・AI 判断）：CEO 決定282（v1.0.2 RC 承認）を受け、`docs/NEXT_QUALITY_IMPROVEMENT_PLAN_V1.md` §5 の推奨 3 束のうち **束 #1「初心者語彙 完結」と束 #3「Home 2 戦目導線」を実装**し、**束 #2「SP 戦闘可読性」は設計（measure-all の所在と実測手順）のみ**に留めた。起点＝`release/v1_0_2-rc` `ba0af34`（branch 作成時の tip。作業中に RC は `4b1a59c`＝docs／scripts のみ 1 件進んだ。本 branch と重なるファイル 0）。runtime 変更＝`tutorialContent.ts`・`homePrimary.ts`・`HomeScreen.tsx`・`defeatCause.ts` の 4 ファイル（engine 0・gameVersion 0・save 0・CSS 規則 0）。変更ファイル限定の vitest 6 ファイル 81/81 PASS・`tsc -b --noEmit` PASS・oxlint 0。full vitest／build／preview／push／DECISIONS 編集／他 worktree 編集 0。CEO 判断 新規 0 件（v1.0.3 Production 公開承認のみ）。**

# v1.0.3 UX Bundle v1 — 束 #1・#3 実装 ＋ 束 #2 設計

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| **束 #1 初心者語彙 完結** | **実装済み**（commit `42bec1a`）。遊び方 ②「⚔ 連撃」→「連撃」（76→74 字）／③「防御」→「防御（ブロック）」（81→87 字・最長のまま）／コツ ③「防御（ブロック）」（40→46 字）／コツ 7 本目「予告の「強打」「特大」は、ふつうの攻撃より大きい一撃の印です。」（31 字）。Brief（`firstBattle.ts`）は不変＝`firstBattle.test.ts` は **据え置きで PASS**（変更 0） |
| **束 #3 Home 2 戦目導線** | **実装済み**（commit `db859b6`）。`selectHomePrimary` の順序 A→B→**C'**→D→C。C'＝`isFirstBattleOnly`（決着した対局 ≤1・神域挑戦 0・保存バトル無し）のとき既存の `'normal'`（「神を選ぶ」）。状態値は増やさない。同梱 C-4：`defeatCause.ts` の label 既定「必殺技」→「必殺」。**予備 #6（`planResultGate` +120→200ms）は入れていない**（`combatTimeline.ts` は Lane 1 と衝突するため） |
| **束 #2 SP 戦闘可読性** | **設計のみ**（§3）。決定238 の measure-all は **main repo の untracked** `C:\Users\kimi1\SevenGodsGame\scripts\card-text-overflow-audit\measure-all.mjs`（145 行・git 履歴には無い）にある。ただし旧セッションの scratchpad（`cards.mjs`・`gods.mjs`）に依存しており **そのままでは動かない** → §3-2 の 2 手順（esbuild で再生成＋候補 CSS を 1 本足す）で再実行できる。実行は PM（build／preview を伴うため） |
| **テスト・監査** | vitest（変更ファイル限定）：`tutorialWording`＋`firstBattle` 24/24、`homePrimary`＋`defeatCause`＋`entranceWiring`＋`resultTransitions` 57/57。`tsc -b --noEmit` PASS。oxlint（変更 7 ファイル）0。full vitest／build は PM が直列で実行（§4） |
| **CEO 判断** | 新規 0 件。束 #1＝§6-2 軽微な UI・UX 調整／束 #3＝既存仕様の範囲内の改善（決定193 §6 の順序に C' を 1 つ挿入・AI 判断として DECISIONS 行を PM が採番）。v1.0.3 Production 公開（§6-3 #8）のみ CEO |

## 1. 束 #1「初心者語彙 完結」（commit `42bec1a`）

### 1-1. 文言の前後（字数＝`[...str].length`）

| # | 場所 | 前 | 後 | 字数 |
|---|---|---|---|---|
| (1) | `src/components/tutorialContent.ts:73` 遊び方 ② | …⚡「溜め」は次のラウンドに大技（必殺）が来る合図、**⚔ 連撃**は複数回当たります。防御はそのラウンドだけ有効です。 | …⚡「溜め」は次のラウンドに大技（必殺）が来る合図、**連撃**は複数回当たります。防御はそのラウンドだけ有効です。 | 76 → **74** |
| (2) | `tutorialContent.ts:80` 遊び方 ③ | …神力の範囲で、攻撃・**防御**・回復のカードを使えます。 | …神力の範囲で、攻撃・**防御（ブロック）**・回復のカードを使えます。 | 81 → **87**（最長のまま） |
| (3) | `tutorialContent.ts:115` コツ ③ | **防御**は次のラウンドに残りません。大技が予告されたラウンドに合わせて出しましょう。 | **防御（ブロック）**は次のラウンドに残りません。大技が予告されたラウンドに合わせて出しましょう。 | 40 → **46** |
| (4) | `tutorialContent.ts:123` コツ 7 本目（新規・末尾） | — | 予告の「強打」「特大」は、ふつうの攻撃より大きい一撃の印です。 | **31** |
| (5) | `src/components/tutorial.css:202` コメント | 箇条書き最大4行 | 箇条書き最大7行 | コメントのみ |

- 「ブロック」を書く場所は ③ とコツ ③ の **2 箇所のみ**。Brief（`firstBattle.ts:34-38`）は「防御」のまま（`firstBattle.test.ts:47` の「ブロック」不使用は据え置き）
- (1) の根拠（B-3）：合計 ≥15 の連撃は実戦で ⚔ ではなく burst グリフになる（`cardStyle.ts`）ため、遊び方で ⚔ を連撃の記号として約束しない
- (4) の根拠（A-3）：初陣 R3「💥 強打」R4「🔥 特大」（`cardStyle.ts:109-110` の tier 表示）を初めて見る語として補う。どの札で受けるかは言わない（決定263 の境界）。禁止語（おすすめ・正解・このカード・絶対・必ず）0

### 1-2. 変更ファイルと行数

| ファイル | 変更 | 差分 |
|---|---|---|
| `src/components/tutorialContent.ts` | 本文 3 行＋TIPS 1 本＋コメント | +15 / −7（runtime 文字列 4 行） |
| `src/components/tutorialWording.test.ts` | ② 74 字・⚔ 非約束／③ 確定文言 87 字（describe 追加）／TIPS 7 本・コツ ③ 46 字・7 本目 31 字／禁止語 5 件／「ブロック」は ③ とコツ ③ のみ／描画 7 `<li>` | +56 / −18 |
| `src/components/tutorial.css` | コメント 1 行 | +1 / −1（CSS 規則 0） |

### 1-3. テスト

- `npx vitest run src/components/tutorialWording.test.ts src/components/setup/firstBattle.test.ts` → **24/24 PASS**
- `firstBattle.test.ts` は **変更していない**（Brief 不変のため既存の確定文言・42 字・112 字・「ブロック」不使用がそのまま成立）
- `a11yMinimum.test.ts`・`entranceWiring.test.ts`：構造のみ＝対象外（`entranceWiring` は束 #3 で実行済み PASS）

## 2. 束 #3「Home 2 戦目導線」（commit `db859b6`）

### 2-1. 仕様（AI 判断）

| 項目 | 内容 |
|---|---|
| 旧順序（決定193 §6） | A resume → B firstBattle → D daily（`todayAttemptsUsed === 0 && todayAttemptsLeft > 0`）→ C normal |
| 新順序 | A → B → **C'（`firstBattleOnly` → `'normal'`）** → D → C |
| C' の条件 `isFirstBattleOnly(PlayTraceInput)` | `hasSavedBattle === false` **かつ** `dailyAttemptsUsed` に 1 以上が無い **かつ** `godRecords` の wins＋losses＋finished 合計 **≤ 1**。`lastUsedGodId` は見ない（デッキを確定しただけの 0 戦も「2 戦目ではない」として C' に含める＝計画書 §5-3 比較案 (b)「D を『2 戦以上』に条件付け」と同じ意味） |
| 状態値 | `HomePrimaryState` は不変（`'normal'` を返す）。`HomePrimaryInput` に `firstBattleOnly: boolean` を 1 項目追加（必須） |
| 呼び出し側 | `HomeScreen.tsx:91-103`：`hasPlayTrace` に渡していたオブジェクトを `trace` に束ね、`isFirstBattleOnly(trace)` を渡す（読み取りのみ・書き込み 0・`loadGodRecord` 呼び出し回数は不変） |
| 不変 | Daily semantics（同日同 Seed・3 回・開始時消費・P6／P8）／Today ブロック CTA（決定187 N4 の到達経路）／`home-state-*` クラス・`data-primary`／`entranceWiring.test.ts` の配線正規表現 |
| 根拠 | 旧順序では初陣（★1）直後の 1 回だけ、必ず最高難度の神域（DAILY ★★★★★）が金色の Primary になり、「Daily を強制しない」（決定193 §6）の趣旨と食い違う。比較案：(a) 現状維持（不整合が残る）／(b) D を「2 戦以上」に条件付け（**採用**・状態値を増やさず runtime 最小）／(c) Daily を Primary から外す（決定187 N4 と衝突・却下） |
| 採用条件（計画書 §5-3） | (i) QA Kit U1 で「分からなかった」2 名以上、または (ii) v1.0.2 公開後 2 週間 QA Kit 未実施なら構造上の不整合を理由に AI 判断で採用。**本 branch は実装を先行**し、v1.0.3 Release 時に (i)/(ii) のどちらで採用したかを DECISIONS 行に記録する（PM 採番）。採用しない判断になった場合は commit `db859b6` の `homePrimary`／`HomeScreen` 部分だけを revert できる（C-4 は独立） |

### 2-2. 変更ファイルと行数

| ファイル | 変更 | 差分 |
|---|---|---|
| `src/components/setup/homePrimary.ts` | `isFirstBattleOnly` 関数（6 行）＋型 1 項目＋分岐 1 行＋コメント | +22 / −0（runtime 実行行 ≈8） |
| `src/components/setup/HomeScreen.tsx` | `trace` 束ね＋`firstBattleOnly` 受け渡し＋import | +6 / −3 |
| `src/components/setup/homePrimary.test.ts` | `isFirstBattleOnly` 4 件＋C'／D／C 3 件（計画書の 3 件）＋既存 7 件は入力に `firstBattleOnly` を足すのみ | +56 / −7 |
| `src/components/battle/defeatCause.ts:53` | C-4：label 既定 `'必殺技'` → `'必殺'`（遊び方 ②「大技（必殺）」・敵パネル「必殺」と 1 語に統一） | +2 / −1 |
| `src/components/battle/defeatCause.test.ts` | special の既定 label「必殺」1 件 | +12 / −0 |

**入れていないもの**：予備 #6 `planResultGate` +120→200ms（`combatTimeline.ts`・`combatTimeline.test.ts`＝Lane 1 の `battle.css`／timeline 系と衝突回避。v1.0.4 以降で BF-03 と一緒に扱う）。

### 2-3. テスト

- `npx vitest run src/components/setup/homePrimary.test.ts src/components/battle/defeatCause.test.ts src/components/entranceWiring.test.ts src/components/resultTransitions.test.ts` → **57/57 PASS**
- `nextGoal.test.ts`（決定187 N4）：`selectHomePrimary` と別関数＝対象外（import 無し・grep 実測）
- 旧セーブ互換：`godRecords`・`dailyAttemptsUsed` の **読み取りのみ**（書き込み 0・version 変更 0）。v1.0.0／v1.0.1 の実セーブで Home の Primary が変わるのは「決着 ≤1・神域 0・保存バトル無し」の保存だけ（§4 Gate 3 で確認）

### 2-4. DECISIONS 行ドラフト（PM 採番・AI 判断として記録）

> **決定2xx（AI 判断・v1.0.3）Home Primary に C'「初陣 1 戦まで → 神を選ぶ」を挿入。** 根拠＝初陣直後の 1 回だけ最高難度の神域が必ず Primary になる構造上の不整合（決定193 §6「Daily を強制しない」の趣旨との食い違い）。比較案 (a) 現状維持／(b) D を「2 戦以上」に条件付け／(c) Daily を Primary から外す → (b) 採用。検証＝`homePrimary.test.ts` 21 件（旧 14 ＋ 7）・`entranceWiring` 配線不変・Daily semantics／Today CTA 不変・save 0。採用条件＝計画書 §5-3 (i)/(ii) のうち〔PM が記入〕。同梱 C-4「必殺技」→「必殺」。

## 3. 束 #2「SP 戦闘可読性」— 設計のみ（実行は PM）

### 3-1. measure-all の所在（調査結果）

| 項目 | 結果 |
|---|---|
| git 履歴 | `git log --all -- 'scripts/card-text-overflow-audit'` **0 件**（コミットされていない）。`git log --all -- 'scripts/*measure*'` で見つかるのは `card-art-pilot6/measure-unity.mjs`・`d266-viewport-stability/measure-hand.mjs`・`phase6b-layout-audit/measure.mjs`・`release-solve-legibility-v1/measure-ac10.mjs` の 4 本＝別用途 |
| 実体 | **main repo の untracked**：`C:\Users\kimi1\SevenGodsGame\scripts\card-text-overflow-audit\`（`measure-all.mjs` 145 行・`shots-and-stress.mjs` 134 行・`d238-verify-goukai.mjs` 103 行・`css/`・`patches/`・`out/`（`measure-all.json`・`measure-all-pc.json`・`d238-before/`・`d238-after/`・`prod238/`・390x700／390x844 の前後 PNG）） |
| 使い方（ヘッダ） | `node measure-all.mjs <outDir> [BASE=http://127.0.0.1:4331] [pc]`。SP＝360×640／375×667／390×700（カード 140px）／390×844／430×932（158px）、PC＝1280×620／1280×800／1508×660。`?seed=ovf-audit-1` で 大耀 × 蒼海の龍神 を開き、手札 1 枚目（原画あり・artwin でない札）の文字を 60 種ぶん順に差し替えて `textOverflowPx`（本文最下端 − カード下端・正＝はみ出し）を測る。候補 CSS は `page.addStyleTag` で注入し、ゲームのファイルは変更しない |
| **壊れている依存** | 14〜15 行目が旧セッションの scratchpad `…/59921c23-…/scratchpad/cards.mjs`・`gods.mjs` を import している（`ALL_CARDS`・`getGodDef`）。その scratchpad に両ファイルは **既に無い**（`d229-v1-dist`・`img`・`qa-a-prime`・`rc` のみ）。`createRequire('C:/Users/kimi1/SevenGodsGame/package.json')` で playwright を解決するため、main repo の node_modules があれば実行主体はどの worktree でもよい |

### 3-2. 再実行手順（PM・v1.0.2 公開後・Lane 1 Gate と同時に走らせない）

1. **依存の再生成**（scratchpad に 2 ファイル・ゲームのファイルは触らない）
   - `npx esbuild src/core/data/cards/index.ts --bundle --format=esm --outfile=<scratch>/cards.mjs`
   - `npx esbuild src/core/data/gods.ts --bundle --format=esm --outfile=<scratch>/gods.mjs`
   - `measure-all.mjs` の `const S = '…'` を新しい scratchpad パスに 1 行差し替える（コピーを `<scratch>/measure-all.mjs` に置いて編集し、原本は残す）
2. **候補 CSS を 1 本足す**（コピー側のみ・既存の候補 C／B' と同型）
   - `const CSS_D = 'body.battle-viewport .card-view-text{font-size:10px} body.battle-viewport .card-view-bonus{font-size:9.5px}'`（第 1 段階＝計画書 §5-2 (1)(2)）
   - ループ内で `addStyleTag({ content: CSS_D })` → `measureDefs(page, defs, { ready: true })` と `{ ready: false }` を 1 回ずつ → tag を remove。結果を `result.vps[].d` に追加
   - 第 2 段階（10.5px）は `CSS_D2` として同時に測ってよい（判定は別）
3. **配信**：v1.0.2 公開版（Production）の build を `vite preview --port 4331` で配信（再 build なし）。Before＝Production の CSS、After＝CSS_D 注入（同じ build で前後が取れる＝決定238 と同型）
4. **実行**：`node <scratch>/measure-all.mjs <evidence>/v1_0_3/measure-sp` と同 `… pc` の 2 回（`out/measure-all.json`・`measure-all-pc.json`）
5. **判定（決定238 と同じ基準）**：`d`（ready＝⚡ 接頭辞あり）の `textOverflowPx` が **60 枚 × 5 SP 画面すべて ≤ 0** かつ PC 3 画面 ≤ 0 かつ `errors 0` → 第 1 段階を採用。1 件でも > 0 なら、(a) `.card-view-text` を 9.5px に戻し `.card-view-bonus` 9.5px のみ採用、または (b) 140px 時のみ旧値へ戻す media 規則 1 本（`@media (max-width: 899px) and (max-height: 720px)`＝決定238 と同型・+4 行）を候補に足して再測定
6. **実装時**（PASS 後・別 commit）：`battle.css:5368-5378`（本文 px・条件行 px）、`:516-527`（浮遊数字 `text-shadow`／`-webkit-text-stroke` 2 行）、`hudPlate.css` 神 HP fill 1 値。`cardGodLabelLowscreen.test.ts`（140px 規則）・`battleViewportLayout.test.ts`（`--hand-step` 116px）・`hudPlate.test.ts`（寸法）は非対象（計画書 §5-2 のとおり）
7. **スクリーンショット**：初陣 R1／R2 手札（SP375・SP390×700・PC 1508）・道化 戦の浮遊数字 L1〜L4・神 HP バー。コントラスト実測 神 HP fill vs 白 ≥ 3.0

本 branch では `battle.css`・`hudPlate.css` を **触っていない**（Lane 1 の `battle.css` との衝突回避）。

## 4. Fast Gate 案（PM が直列実行・≈30 分）

| # | 項目 | 期待 |
|---|---|---|
| G1 | `npx tsc -b --noEmit`／`npx oxlint src` | PASS（本 branch で tsc PASS・oxlint 変更 7 ファイル 0 を確認済み） |
| G2 | `npx vitest run`（full） | 1,504 ＋ 追加 11 件（tutorialWording 8→11・homePrimary 14→21・defeatCause +1）＝1,515 前後・失敗 0 |
| G3 | `npx vite build` | JS 差分は `homePrimary`／`HomeScreen`／`defeatCause`／`tutorialContent` のみ。CSS 増分 0 B（コメントのみ）。bundle size 470.72kB ± 1kB |
| G4 | スクリーンショット（決定論）：遊び方 ②③＋コツ（SP375・PC）／初陣 1 戦後の Home（SP375・PC） | ② 7 行以内・コツ 7 本が枠内（`.tutorial-tips` が ≈18px 伸びる・オーバーレイ内スクロール）／Home の金色 Primary が「神を選ぶ」・Today ブロックの CTA から神域へ行ける |
| G5 | 決定論 Playwright（`acceptance.mjs` 系）：初陣 → Home（Primary＝`data-primary="normal"`）／2 戦目後 → Home（Daily 未挑戦なら `daily`）／Daily 1 回後 → `normal` | 3 経路 PASS |
| G6 | 旧セーブ互換：`docs/evidence/v1_0_1-rc/07-save-migration` の 2 種で Home の Primary | 「決着 ≤1・神域 0・保存バトル無し」の保存を除き不変 |
| G7 | `ranking-absence.mjs`／Secret Audit（RC 定型） | 0 件 |
| G8 | 文言禁止語：「おすすめ」「正解」「このカード」「絶対」「必ず」 | 0 件（`tutorialWording.test.ts` で固定済み） |
| G9 | `git diff --stat release/v1_0_2-rc` で `src/core/engine`・`gameVersion.ts`・`enemies.ts`・`battle.css`・`combatTimeline.ts`・`EnemyPanel.tsx`・`enemyBreak.*` が **0 件** | 本 branch で確認済み（§6） |

## 5. CEO 目視 3 分の項目

1. **遊び方 ③**（Home または戦闘の「遊び方」）：「攻撃・防御（ブロック）・回復のカード」と読める（SP 実機で 1 画面に収まる）… 1 分
2. **攻略のコツ 7 本目**：「予告の「強打」「特大」は、ふつうの攻撃より大きい一撃の印です。」が末尾にあり、コツ ③ が「防御（ブロック）は次のラウンドに残りません。」… 30 秒
3. **初陣 1 戦直後の Home**：金色の Primary が「神域へ挑む」ではなく「神を選ぶ」。Today ブロックの「神域へ挑む」は残っている … 1 分
4. **敗北画面（必殺で敗北した場合のみ）**：敗因が「…の「必殺」で N ダメージ」（名前つき必殺はこれまでどおり技名）… 30 秒

## 6. 禁止事項・衝突回避の確認（実測）

- `git diff --stat release/v1_0_2-rc HEAD` の変更ファイル：`src/components/{tutorialContent.ts, tutorialWording.test.ts, tutorial.css, setup/homePrimary.ts, setup/homePrimary.test.ts, setup/HomeScreen.tsx, battle/defeatCause.ts, battle/defeatCause.test.ts}` の 8 ファイル（＋本書と計画書 2 本）。`src/core/engine`・`gameVersion.ts`・`enemies.ts`・`battle.css`・`hudPlate.css`・`combatTimeline.ts`・`EnemyPanel.tsx`・`enemyBreak.*`＝**0**
- push／merge／tag／deploy／ファイル削除／`git add .`／`docs/DECISIONS.md` 編集／他 worktree 編集／full vitest／vite build／dev・preview 起動＝**0**。`npm ci` は本 worktree で 1 回（node_modules 不在のため）
- `npx tsc -b --noEmit` 1 回・oxlint は変更ファイル限定・vitest は変更ファイル限定（6 ファイル・2 回）

## 7. 残課題・次の作業

| # | 内容 | 担当 |
|---|---|---|
| 1 | RC tip が `4b1a59c`（docs／scripts のみ）へ 1 件進んだ。統合時に `release/v1_0_2-rc` 公開後の master へ rebase または merge（重なるファイル 0） | PM |
| 2 | Fast Gate §4（full vitest／build／スクリーンショット／Playwright 3 経路／旧セーブ 2 種）。Lane 1 の Gate と同時に走らせない | PM |
| 3 | 束 #3 の採用条件 (i)/(ii) の確定と DECISIONS 行（§2-4 ドラフト）の採番 | PM |
| 4 | 束 #2：§3-2 の手順で measure-all を再実行（Before／After）→ PASS なら `battle.css`・`hudPlate.css` を別 commit で実装（v1.0.2 公開後） | PM → Dev |
| 5 | 予備 #6 `planResultGate` +200ms は v1.0.4 以降（BF-03・`combatTimeline.ts`） | 保留 |
| 6 | v1.0.3 Production 公開承認（§6-3 #8）＝CEO 判断はこれのみ | CEO |
