# v1.0.3 Production Smoke（2026-10-23・決定283・PM 実施・AI 判断）

> **結論：PASS — v1.0.3 PRODUCTION LIVE**。Production https://seven-gods-game.vercel.app/ は merge commit `1f713d6`（PR #3・CEO merge）を配信。Vercel Production deployment **`7256475048`**（2026-10-22T15:35:35Z）。master CI run 39806163745 success。S1〜S9・bundle 一致・混入 0・console error 0・外部通信 0。Rollback 先＝deployment **`7228912965`**（v1.0.2・`0d38c05`）。

- 公開経路：RC `release/v1_0_3-rc` `bbc2263` を CEO が 2 段階 push（1343024＝21.8 MB → HEAD＝7.5 MB）→ PM が PR #3 → CI run 39805676129 GREEN（1m39s）→ CEO `gh pr merge 3 --merge` → master `1f713d6` → CI 39806163745 success → Vercel 自動 deploy
- 実行：lane3 worktree で `node scripts/v1_0_2-rc/production-smoke.cjs --sha 1f713d6 --version 1.0.3 --rc-build-sha 374e7c0 --master-dir C:/Users/kimi1/SevenGodsGame-lane2b --acceptance scripts/v1_0_3-rc/acceptance.mjs --out docs/evidence/v1_0_3-production-smoke`、続けて S8 `defeat-check.mjs`・S9 `sp-text-check.mjs` を Production URL に対して実行。証跡 `docs/evidence/v1_0_3-production-smoke/`（500KB 超 PNG は WebP 化）

## 1. 結果

| 項目 | 判定 | 実測 |
|---|---|---|
| S1 Home・v1.0.3 配信 | PASS | allPass（PC 1508／SP 390）・ラベル `v1.0.3 (1f713d6)`・errors 0・外部 0 |
| S1' 受入（v1.0.3 版） | PASS | **44/44**（Brief・遊び方 ② 74 字・③ 87 字・コツ 7 本・敵選択・overflow 0） |
| S1'' 語彙 3 点（v1.0.2 回帰） | PASS | **20/20** |
| S2〜S4 通し（新規開始・戦闘・勝敗・神域・Resume） | PASS | 4 viewport（PC 1366／1508・SP 760／844）：敵 inView・総リクエスト 271／370／253／256・外部 0・`/api/` 0・failed 0・console error 0。敗北経路（pc1508 C）で結果画面「敗北」 |
| S5 公式ボイス・duck・ミュート | PASS | allPass |
| S6 Legal／Credits | PASS | 19/19 × 2 |
| S7 旧セーブ互換（v1.0.2 build のセーブを Production で開く） | PASS | **44/44**（rcVersion 1.0.3） |
| S8 敗北画面の事実行（本 Release） | PASS | **18/18**：PC・SP375 で「必殺260を加護（予告の50%のブロック）で受けていれば残HP30」・「敵の残り HP」行 1 回・overflow 0 |
| S9 SP 手札本文（本 Release） | PASS（Known 3） | 26/29：本文・テキストの overflow 0（3 viewport）・font-size PC 9.5／SP390 **9.5**／SP375 9。FAIL 3＝外枠 2px（SP375）と `scale(1.04)` の見かけ高さ（SP375／SP390）＝RC Gate・v1.0.2 Production と同型の Known |
| RETURN TO CALM +200ms | PASS（単体） | `combatTimeline.test.ts` で固定・bundle 一致により Production に同一コード |

## 2. bundle 一致

| 項目 | 判定 | 根拠（`bundle-match.json`） |
|---|---|---|
| JS | PASS | Production `index-CAKmzlrW.js` **472,846 B** ＝ RC build `index-C_e5frXY.js` 472,846 B（埋め込み sha `1f713d6`⇄`374e7c0` を正規化して byte 一致） |
| CSS | PASS | `index-bwEHtD6x.css` sha256 同一 |
| version／sha | PASS | `1.0.3`・`1f713d6` を含む |
| 混入トークン | PASS | `/api/ranking`・`RANKING_DATABASE_URL`・`tadatsugu`・`card_common_guard_01_v2`・`voice/taiyo/crisis`：0 |

## 3. Known・Rollback
- Known：K01〜K39 据え置き。v1.0.3 Gate で記録した札の外枠 2px／`scale(1.04)` は v1.0.2 から存在（本 Release 変更外）
- Rollback（未使用）：Vercel → Deployments → `7228912965`（v1.0.2）を Promote（CEO のみ）。保存データ v9 互換
