# 決定208 — Solve Legibility v1 Production Release — Production Verification

- 日付：2026-09-20
- 区分：Production 公開は **CEO 承認**（2026-09-20・決定207 Release 承認）。Release 手順の実施と Production Isolation QA の判定は **AI判断**（CLAUDE.md §6-2）
- 上流：決定206（実装・Human QA PASS）、決定207（Release Gate PASS・RC `b0fbd3c`）
- Rollback 先（未使用）：Vercel Instant Rollback で deployment `6534866730`（= `bba4c67`）。saveVersion 不変のため保存データの巻き戻しは不要

---

## 1. Release の実施

| 手順 | 結果 |
| --- | --- |
| master を RC へ fast-forward | `3551898` → **`b0fbd3c`**（`git merge --ff-only release/solve-legibility-v1-rc`。conflict なし） |
| `git push origin master` | **10:08:53 JST**（`bba4c67..b0fbd3c`） |
| Vercel 自動 deploy | GitHub deployment **`6547621402`**（sha `b0fbd3c`・environment Production）**success 10:09:20 JST** |
| Production の配信 commit | `https://seven-gods-game.vercel.app/` が **`index-4DPzUUkG.js` / `index-C-pQDi18.css`** を配信（決定207 RC の clean build と同名） |
| byte／hash 比較（ローカル clean build master `b0fbd3c` vs Production 配信物） | **3/3 一致**：`index.html` `f90d63f0…`、JS `4561c44d…`、CSS `ad9eb056…` |
| 配信物に決定206／207 の変更が含まれるか | JS に「予告を読む戦い」「魔獣に挑む（神を選ぶ）」「予告された攻撃」「盾で防いだ量」。CSS に `@media (width>=1024px) and (height<=700px){.game-over-recap{padding-top:4px;padding-bottom:4px;line-height:1.5}}`（minifier が range 構文へ変換） |
| `/api/ranking/*` | 404（Ranking 不在のまま） |

## 2. Production Isolation QA（`https://seven-gods-game.vercel.app`・Playwright 1 本ずつ順次・保存は空コンテキスト）

| # | スイート | 結果 |
| --- | --- | --- |
| 1 | 決定206 受け入れ（11 シナリオ・38 判定。主要導線「初陣 → 報酬 → 『双牙の魔獣／予告を読む戦い』 → 魔獣戦 → factual Result」、1 回だけ、Save/Resume、Daily、神階、direct seed、old save、7R 未撃破、M=0、同じ盤面で 無操作→守る） | **PASS 38/38** |
| 2 | Solve Loop（17） | **PASS 17/17** |
| 3 | E1 | **ALL PASS**（24 項目・AC21 22/22。初陣まで 3.2〜7.7 s・3 クリック） |
| 4 | Interaction Feel | **PASS 27/27**（1 回目 24/27：AC3 の演出タイミング 3 値が一律 +200 ms 前後（496／568／724 ms）。演出 CSS・JS は決定206 で未変更、同一条件の再実行で 27/27・設計値内 ＝ 計測機の負荷／回線の揺れ） |
| 5 | qa-flow（4 viewport：戦闘・続きから・勝利・敗北・Daily） | **正常**（4 viewport：戦闘 scroll 0・「続きから 大耀 vs 業斧の鬼将・ラウンド2」再開・勝利 recap 1・敗北 recap 2 行・Daily 勝利「今日のベスト 9,060（1回目）残り 2 回」・external 0・api 0・failed 0・errors 0） |
| 6 | Save Migration（Production → Production：保存の再開・戦績保持） | **PASS**（保存 v9・R2 を「続きから」→ 勝利。records／reward／stakes 保持。Daily 再開（乱舞の道化）→ 回数 1・残り 2 回。api/external/errors 0） |
| 7 | phase7-p1（Result Hub／Home／Daily・AC10 PC1508×660 を含む） | **PASS**（AC1〜AC16・EXTRA-1〜4 全通過。**AC10 18/18**：pc1508 Daily 2 回目勝利で Secondary top 563・可視、出口 3 個。AC6 は前ビルド比較のため本 QA では N/A（0/0）— 決定207 Gate で Production `bba4c67` と比較済み 2/2） |
| 8 | phase7-p2（49 progression） | **ALL PASS**（AC1〜AC19・EXTRA-1〜3。初撃破の即時反映・2 勝目で重複 0・敗北で点灯なし・壊れた保存でも進行。`--p1` は Production 自身のため AC17／AC19 は同一ビルド比較） |
| 9 | Hardening（不正 enemyId） | **ALL PASS**（H1〜H10。未知の敵 ID を含む保存・Daily・matchups でクラッシュ 0） |
| 10 | screens-smoke | **壊れた画像 0**（PC／SP 各 9 画面） |
| 11 | CLS | **PC 0.0074 / SP 0.046**（決定202・207 と同値。44px 未満 0・errors 0） |
| 12 | Ranking Absence（dist＝Production と sha256 一致） | **PASS**（18/18） |
| 13 | Secret Audit | **PASS** |

## 3. 判定

**PRODUCTION LIVE — PASS**（Production Isolation QA 13 本すべて PASS。異常なし・Rollback 不要）

- 決定206 の主要導線「初陣 → 報酬 → 『双牙の魔獣／予告を読む戦い』 → 魔獣戦 → factual Result」を Production で機械確認（決定206 受け入れ 38/38）。回帰 12 本も PASS
- 再実行 1 件（Interaction Feel AC3）は計測機の負荷／回線の揺れで、同一条件の再実行で 27/27・設計値内。製品の変更なし
- Production への追加修正・再 deploy 0。Rollback 先 `6534866730`（`bba4c67`）は未使用
- Living Hero／H3／COV-M は未着手（CEO 指示：Production Verification 完了後に別 Decision）

## 4. Git 状態（Production 確認完了時点）

| 項目 | 値 |
| --- | --- |
| Production 配信 commit | **`b0fbd3c`**（origin/master） |
| GitHub deployment | **`6547621402`**（Production・success 2026-09-20 10:09:20 JST） |
| bundle | `index-4DPzUUkG.js`（sha256 `4561c44d…a01ab`）／`index-C-pQDi18.css`（`ad9eb056…9daae`）／`index.html`（`f90d63f0…b272`）— ローカル clean build と 3/3 一致 |
| master（ローカル） | `b0fbd3c` ＋ 本文書の docs commit 1 件（**push しない**：push は再 deploy を伴うため。次の Release で同梱） |
| feature／RC | `feat/solve-legibility-v1` = `c9dd970`、`release/solve-legibility-v1-rc` = `b0fbd3c`（役目終了・削除せず保持） |
| 休眠 | `feat/daily-ranking-phase4` = `762168f` 不変。Neon 0・`.env` 0 |
| Preview | `localhost:4181`（vite preview）は Production と同一ビルドを配信中 |
