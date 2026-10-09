# Post-D262 Lane A／Lane B 統合比較と実行順（AI 決定・1 本）

- 日付：2026-10-03
- 種別：**docs-only**（docs／evidence の比較のみ。新規 simulation・ブラウザ・build：0。実装：0）
- 判断主体：実行順の決定は **AI 判断**（CLAUDE.md §6-2「実装順序」「複数案からの推奨案選定」）。各 Pilot の開始 GO は CEO（Lane A は決定4 の境界、Lane B は決定235 の材質変更を含むため）
- 対象：
  - **Lane A**：`docs/OPENING_HAND_READ_PREFLIGHT.md`（決定263 候補「Threat Shape v1」＝敵 7 R の脅威の形を段階だけで常時表示・GO WITH MODIFICATIONS）
  - **Lane B**：`docs/BATTLE_COMPOSITION_V3_DUEL_HUD_PREFLIGHT.md`（Duel HUD v3「2 柱 HUD＋神側チャージ」＝3 列→2 列・HP ×2.0〜2.2・共鳴を神側へ従属・環撤去・scrim・接地影・敵 `--artScale`・GO WITH MODIFICATIONS）
- 前提：Commercial RC = GO・RC 基準 runtime `8cba184` 固定。両 Lane とも POST-RC。master `a3ffa87`

---

## 0. 決定（先に）

| 順 | 内容 | 形 |
|---|---|---|
| **1. 先に実装** | **Lane B「Duel HUD v3」Narrow Pilot** | CSS 1 ブロック＋TSX 1 行 → Fast Gate（決定261 layout gate・254 T5・250／252 lock・240 A1・228／230 再基準化）→ Human QA 4 問 |
| **2. 次に実装** | **Lane A「Threat Shape v1」Narrow Pilot**。帯は **Duel HUD v3 の敵側（左）HP 長ゲージの直下**に置く（「敵の脅威タイムライン」として同じ列・同じ幅） | core 純関数＋EnemyPanel 帯＋CSS → Fast Gate → Human QA（怨霊→機工師・S2 Q2 再質問） |
| **3. 並行可能な準備** | Lane B の Gate が走っている間に Lane A の **layout に依存しない部分**：`previewEnemyActions(state)`（`src/core/engine`・純関数・`nextEnemyAction` と一致を固定する vitest）＋段階 glyph 対応表（`cardStyle.ts` の tier 流用）＋帯の DOM 仕様（テキスト＝glyph と技名のみ）。**ブラウザ・build は使わない**。vitest は単一ファイル・Lane B のブラウザ Gate と同時に走らせない（直列） | コード＋テスト（UI なし） |

**なぜ B → A か（1 文）**：A の帯は「敵の HUD の一部」であり、B が敵 HUD の列・幅・材質を作り直すため、**B の後に A を置けば配置・Gate 再基準化・Human QA がそれぞれ 1 回で済む**（A → B だと A の帯を B で置き直し、T5／A1 の再基準化と A の Human QA が 2 回になる）。

---

## 1. 比較表【AI 判断・docs／evidence】

| 軸 | Lane A Threat Shape v1 | Lane B Duel HUD v3 | 読み |
|---|---|---|---|
| Primary Fun「解く」への効果 | **直接**（K33：開幕に「大技の R に何を残すか」という問いを置く。S2 Q2 の lever）。効果の有無は Human QA でしか分からない（決定262 と同じ分離評価） | **間接**（HP・共鳴・Intent の可読性と対峙の構図。「解く」の判断材料を読みやすくする） | A ＞ B |
| CEO Human QA で出た問題への直接性 | S2 Q2 NO（1 回・決定262 で presentation 側は NO） | **S2・S3・決定262 QA の 3 セッションで繰り返し出た 5 項目**（サイズ・環／枠・HP 短い・共鳴の場所・箱が多い）に 1 案で同時に効く | B ＞ A |
| 体験改善の大きさ | 成立すれば大（カード選択に意味の「問い」が戻る）。不成立なら 0 | 確実に中〜大（毎戦・全画面に効く。決定261 の Human QA 4/4 と同系統で CEO 評価の再現性が高い） | 期待値は B、上限は A |
| 実装リスク | 小（core 純関数＋帯 1 行。決定4 の境界＝CEO 判断で解消） | 中（grid 3→2 列は全幅に影響。scrim コントラスト・中間幅の重なり・artScale はみ出し。撤退順序 D→C→A/B あり） | A ＜ B |
| 既存 Core への影響 | `src/core/engine` に**読み取り専用の純関数 1 つ追加**（ルール・乱数・state 変更 0・gameVersion 不変） | **0**（TSX 1 行＝data 属性・CSS のみ） | B ＜ A（どちらも軽微） |
| 再基準化するロック | 決定240 A1（帯を名札の外に置けば ±0）・決定254 T5（帯のぶん下の箱が動けば再基準化） | 決定254 T5・240 A1（幅）・228・230・235（材質） | A ＜ B |
| Human QA コスト | 2 戦＋再質問 1（怨霊→機工師） | 4 問（機工師・龍神・鬼将） | 同程度。**順序で合計が変わる**（§2） |
| Production rollback 容易性 | commit revert のみ（save／version 不変） | commit revert のみ（CSS＋属性 1 行）。ロックの baseline は旧 JSON を保持して戻す | 同等 |
| 6GB RAM での実行負荷 | 軽（vitest 1 ファイル＋Playwright 7 敵 × 2 面＝短い） | 重め（layout gate 104 runs＋timing lock 5 回中央値 ×2＋T5＋A1＝直列で長い） | A ＜ B |

---

## 2. 順序の比較（A→B／B→A／並列）

| 順序 | 利点 | 欠点 | 判定 |
|---|---|---|---|
| A → B | 「解く」の lever の答えが先に出る。軽い | A の帯は現 3 列レイアウトの名札下に置く → B で名札列・幅・材質が変わり**帯を置き直す**。T5／A1 の再基準化が **2 回**、A の Human QA も B 後に**再確認**が要る（帯の見え方が変わる） | 却下 |
| **B → A** | B で敵 HUD（左・長い HP）を確定 → A の帯を**その直下に 1 回で**設計。再基準化 1 回・Human QA 各 1 回。A の core 純関数と glyph 表は B の Gate 中に**並行で**用意できる | 「解く」の答えが B の Gate＋QA のぶん遅れる（約 1〜2 日） | **採用** |
| 並列（両方同時に実装） | 最短 | 同じ `EnemyPanel.tsx`／`battle.css` の敵 HUD を 2 本が触る＝衝突。6GB でブラウザ Gate を 2 本同時に走らせられない（決定257／259 の OOM 実績） | 却下 |

---

## 3. 実行計画（1 本）

1. **CEO GO（Lane B）** → worktree で Duel HUD v3 Pilot：§6-1 A〜D（CSS 1 ブロック＋`data-enemy` 1 行）→ Fast Gate（直列・ブラウザ 1）→ **HUMAN QA READY**（4 問）
2. **並行（Lane A 準備・UI なし）**：`src/core/engine/previewEnemyActions.ts`＋`previewEnemyActions.test.ts`（7 敵 × 通常／Hard／神階Ⅰ〜Ⅶ／Daily 修正子で `nextEnemyAction` と一致）、glyph 対応表、帯の DOM 仕様。vitest は Lane B のブラウザ Gate と**同時に走らせない**
3. **Lane B Human QA 4/4** → Release Gate → Production（決定264 相当）。NO の場合＝撤退順序（D artScale → C 環／scrim の濃度 → A/B）で縮退し、A は**現レイアウトの名札下**に置く（準備した core 関数はそのまま使える）
4. **CEO GO（Lane A・決定4 境界の承認）** → Threat Shape v1 を Duel HUD v3 の敵 HP 直下に実装 → Fast Gate → Human QA（怨霊→機工師・S2 Q2 再質問）
5. Lane A Human QA：Q2 YES → Release Gate。**NO → 拡張せず STOP**（K33 は presentation では解けないと確定・設計レベルの再検討へ）

---

## 4. 却下した統合案
- A 単独先行（上記 §2）／B の中に A の帯を同梱して 1 Pilot にする（**変更点が 2 つ混ざり Human QA で効果を分離できない**＝決定262 の教訓「正しさと効果を分けて評価」に反する）／両 Lane の Human QA をまとめて 1 回にする（同上）

## 5. 変更しなかったこと
- runtime／src／CSS／simulation／ブラウザ／build：0。本書と Lane A／B の Preflight 2 本を branch `docs/post-d262-lanes-integration`（`a3ffa87` 起点）に集約（未 push・CEO GO 後に統合）
