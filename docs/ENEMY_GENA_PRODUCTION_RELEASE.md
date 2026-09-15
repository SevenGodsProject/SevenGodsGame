# 敵ビジュアル世代A Final Production Release（決定185）— PASS / LIVE

- 実施日：2026-09-16（push 05:34:51 JST）
- Production 公開は **CEO承認**（CLAUDE.md §6-3 #8・「Production Releaseを承認」2026-09-16）。transport 方式・Gate 設計・QA 方式・GO/NO-GO は **AI判断**（§6-2）
- Release source：`release/enemy-gena-final-rc` `d532b45`（決定184 Integrated Release Gate PASS）
- 旧 master：`8256b60` → 新 master＝origin/master：**`d532b45`**（`git merge --ff-only`・通常 push・force なし・手動 deploy なし）
- 判定：**PASS / LIVE**

---

## 1. Release Source Lock

開始時点で `master`＝`origin/master`＝`8256b60`、release HEAD `d532b45`、working tree clean、master は release の直接の祖先（`master..release` 1 commit・fast-forward 可能）。release HEAD の blob を再照合：oni `6c25cdb8…`（123,010B）／ryujin `76266bb4…`（173,286B）／onryo `96204054…`（147,326B）／juuma `4356913d…`（158,262B・不変）／datenshi `29202bed…`／karakuri `d879f1e9…`／doukeshi `5ecf7249…`（不変）。`master..release` の runtime 差分（`public/`・`src/`・`api/`・`vercel.json`・`index.html`・`package.json`・lockfile・`vite.config.ts`）は **3 asset のみ**。

## 2. Pre-Release Gate（release tree で再実行）

tests **3,041 passed／9 skipped／0 failed**、`tsc -b` 0 error、lint 0 error、clean build 成功。`index.html` `2ace0eaf…`／JS `95d062cd…`／CSS `7b220d3a…` が決定184 承認 bundle・統合前 master build の双方と byte 完全一致。gameVersion `1.80c6eda23ed082dc`・saveVersion 9。Ranking Absence（`ranking-absence.mjs`）PASS、Secret Audit PASS、tracked `.env` 0、`.claude/settings.local.json` tracked false、dist の `DATABASE_URL`/`NEON_`/`RANKING_`/bypass 0・neon/postgres 0・`submissionEnabled:!1` 1／`!0` 0。

## 3. Merge / Push

`git checkout master` → origin/master が `8256b60` のままであることを再 fetch で確認 → `git merge --ff-only release/enemy-gena-final-rc` → master HEAD `d532b45`（master tree＝release tree `d30e3b91…`）→ `8256b60..master` の runtime 差分は 3 asset のみ → 通常 `git push origin master`（`8256b60..d532b45`）→ `origin/master`＝`master`＝`d532b45`。Vercel の master 連携自動 deploy のみ。

## 4. Production Deployment Verification（実配信物）

push の約 10 秒後に新 asset の配信を確認（`Last-Modified: 2026-09-15 20:35:29 GMT`、`Cache-Control: public, max-age=0, must-revalidate`）。canonical URL（query 無し・no-cache）で取得：

| enemy | HTTP | dimensions | aspect | bytes | sha256 | 判定 |
|---|---|---|---|---|---|---|
| juuma | 200 | 768×768 | 1.0000 | 158,262 | `4356913d…` | 既存のまま（不変） |
| oni | 200 | 768×768 | 1.0000 | 123,010 | `6c25cdb8…` | **NEW・承認 RC 一致** |
| ryujin | 200 | 768×768 | 1.0000 | 173,286 | `76266bb4…` | **NEW・承認 RC 一致** |
| onryo | 200 | 576×768 | **0.7500** | 147,326 | `96204054…` | **NEW・承認 RC 一致** |
| datenshi／karakuri／doukeshi | 200 | 768×768 | — | — | `29202bed…`／`d879f1e9…`／`5ecf7249…` | 不変 |

旧 hash（oni `f47ccb65…`／ryujin `d5e040ae…`／onryo `b1f3e7e5…`）は release 直前の Production で取得できたものと一致し、release 後はどの条件でも返らない。

## 5. Production Bundle Verification

Production から実配信された `index.html`（`2ace0eaf…`）／`assets/index-CLclgl5i.js`（`95d062cd…`）／`assets/index-IKMGO-ur.css`（`7b220d3a…`）が決定184 承認 bundle と **byte 完全一致**（`cmp`）。＝ゲームロジック変更 0 を Production 実配信物でも確認。`/api/`・`/docs/`・`/art-source/` は 404。

## 6. Production Smoke QA（本番 URL・Playwright・deviceScaleFactor 指定）

4体 × 3条件（1366×768 DPR1／DPR2・390×844）＝12 conditions **全 PASS**：broken image 0・JS error 0・scrollY 0・overflowX false・enemy box（PC 290.0×284.5／mobile 124.3×354.5・ryujin 188.4×354.5＝各 RC QA と一致）・HUD 可視・手札 5・End Round 有効。PC DPR1 では 4体すべてでカード使用→`.floating-numbers`／`.cast-flash`／`.enemy-hit-layer`／`.battle-mini-result-*` 観測、End Round でラウンド進行、`.god-strike` 観測。onryo は aspect 0.7500 を維持。

## 7. Ranking Absence — Production

実プレイ（Home→戦闘 3 ラウンド→戦績）中の全 92 リクエストを記録：外部オリジン **0**・`/api/` **0**・ranking／leaderboard／submit を含む URL **0**・失敗 **0**・JS error **0**。Ranking UI：Home 0・戦闘 0、戦績画面の「ランキング」語は「ランキングやオンライン通信はありません」の免責文言 1 件のみ。`/api/ranking/{start,submit,leaderboard}` はすべて **404**（既存の非公開状態から変化なし）。Production JS：`/api/` 0・ranking path 0・`submissionEnabled:!1` 1／`!0` 0。

## 8. Neon / Security — Production（件数のみ）

Production JS：neon／postgres 0・`DATABASE_URL`／`NEON_`／`RANKING_`／bypass 0・credential-format 値 0。tracked `.env` 0、`.claude/settings.local.json` 非 tracked。秘密値は表示していない。

## 9. Save / Daily Production Smoke（`save-migration.mjs`・headless・実ユーザーの storage に触れない）

Production 上で通常戦を決着（勝利・戦績保存）→ 通常戦ラウンド 2 中断 → 神域挑戦ラウンド 2 中断のセーブ（version 9）を作り、同じ Production で再読込：「続きから（大耀・ラウンド2）」再開 **PASS**（hand 6・敵表示・End Round）、戦績／報酬／神階 preserved、決着可（勝利）。神域挑戦「続きから（神域挑戦・大耀・ラウンド2）」再開 **PASS** → 勝利・「残り回数 2 回」（3→2）。Daily seed `daily-2026-09-16-enemy_06`（形式不変）、boss 表示正常、JST 日付キー、storage key `sevengods.daily`。通信：API 0・外部 0・エラー 0。

## 10. Scope / Safety

Production assets changed：**exactly 3**（oni／ryujin／onryo）。`src/`・CSS・game logic・Daily・Ranking・server・save logic・audio・background・cards・OTOMO・gods・juuma・Gen B：変更 0。force push 0・手動 deploy 0・unexpected files 0・secrets exposed 0。QA preview はすべて停止。

## 11. Rollback

不要。必要時は `origin/master` を `8256b60` の内容へ通常 commit で戻す（force push はしない）。本決定の記録 commit は docs のみで、`docs/` は `.vercelignore` により配信外のため JS／CSS／HTML／asset は不変（push 後に hash 同一を確認する）。

## 12. Final Decision

**PASS / LIVE** — Generation A 4体（juuma・oni・ryujin・onryo）の非生成修復版がすべて Production で配信中。敵画質改善フェーズ（決定173 Batch A → 世代 A 4体）完了。
