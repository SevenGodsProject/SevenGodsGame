# v1.0.1 Fast Gate — ★再付番（表示専用）＋語彙補完 案 B＋敵選択注記（engine 0・gameVersion 不変）

> 2026-10-17 CEO 正式承認「v1.0.1 Fast Gate 単独 Production Release」に基づき PM が作成。RC HEAD `c11afa0`（`f0c5001` ＋ docs `df27177` ＋ version bump）。

## 変更点（runtime 3 束・engine 0）

| # | 内容 | ファイル | 不変の証明 |
|---|---|---|---|
| 1 | **★再付番（表示専用）**：`rank` 7 値を実測（matrix 14,112 局・v1.0.0 engine）で再付番。龍神 4／怨霊 4／魔獣 3／鬼将 3／試練の影 2／機工師 2／道化 1（旧 3/3/2/2/1/4/4・Spearman ρ normal −0.31 → 0.97・ペア順序一致 8/18 → 18/18） | `src/core/data/enemies.ts`（rank 7 行＋コメント） | HP・行動表・台詞・stage・art は byte 不変（`09-seed-parity.txt`） |
| 2 | **gameVersion 不変**：`rank` は対局結果に影響しないため指紋入力の `rank` を v1.0.0 時点の定数へ固定（除外と等価）。版 `1.d794038a00b5b53c` は**据え置き**＝Daily day-lock・K26 の託宣表切替は起きない | `src/core/replay/gameVersion.ts`（`FINGERPRINT_RANK_V1_0_0`・`enemiesForFingerprint()`） | `gameVersion.test.ts` 新 4 件・`useReactionLanguage.test.ts` golden PASS |
| 3 | **語彙補完 案 B**：Brief ②「余った神力と防御は、次のラウンドへ持ち越せません。」（42 字・3 行合計 112/120）／遊び方 ②（⚡ 溜め→必殺・⚔ 連撃・防御はそのラウンドだけ・76 字）／攻略のコツ +1「防御は次のラウンドに残りません…」（40 字・6 本） | `src/components/setup/firstBattle.ts`・`src/components/tutorialContent.ts`（新規・文言データを `TutorialOverlay.tsx` から分離・描画不変） | 決定262／263 の境界：戦闘中の表示 0・正解表示 0・断定語 0（テストで固定） |
| 4 | **敵選択注記**：「★は脅威度（実測の手強さ：負けやすさ・受けるダメージ・倒すまでの長さ。最大5）。難易度の★とは別物です。」 | `src/components/setup/EnemySelectScreen.tsx`（1 文目） | 2 文目不変・HP／ダメージ数値 0（`enemySelectNote.test.ts`） |
| 5 | version `1.0.1` | `package.json`・`package-lock.json`（2 箇所）・`src/publicFace.test.ts` | `docs/evidence/v1_0_1-rc/10-version-bump.patch` |

- 不変：`src/core/engine`・rules・cards・gods・otomo・divination・replay 再開・storage・saveVersion 9・Known（K01 据え置き・新規 Known 0）
- 本 PR に Lane 1（軍略 Pilot・`enemy_09`）／Lane 2（Enemy Break）の runtime は**含まない**（別 Release。CEO 判定 2026-10-17「Pilot 継続採用・Production 公開は未承認」）
- 同梱される docs-only commit 5 件（`dfb8f71`・`aaa254b`・`173299b`・`426c611`・`7ba447f`＝INCIDENT 記録・v1.0.0 Smoke 結果・決定279 候補・Release Protection v1・Gate）：origin/master `d2135d2` → RC 起点 `7ba447f` の runtime 差分 0（`git diff --stat d2135d2 7ba447f -- . ':!docs' ':!*.md'` ＝ `scripts/release-audit/` のテスト用 2 ファイルのみ）

## Gate 結果（RC `f0c5001`・証跡 `docs/evidence/v1_0_1-rc/`）

| Gate | 結果 | 証跡 |
|---|---|---|
| G0 clean worktree（master `7ba447f` 起点） | PASS | `git log` |
| G1 ★再集計（案 A と 7/7 一致・`matchesPlanA: true`・同点 0） | PASS | `star-reeval.json` |
| G2 tsc | exit 0 | `01-tsc.txt` |
| G3 oxlint | 警告 11（master 既存と同数）・エラー 0 | `02-oxlint.txt` |
| G4 vitest | **118 files PASS・6 skip／1,450 tests PASS・9 skip**（40.66 s） | `03-vitest.txt` |
| G5 build | `index-D0ti6Z-R.js` 467.58 kB（gzip 145.48）・1.30 s | `04-build.txt` |
| G6 Ranking Absence | **18/18 PASS**（`docs/evidence/` を走査対象から除外・除外で消える検出 0） | `05-ranking-absence-v2.txt` |
| G7 Secret Audit | PASS（credential 形式 0・tracked .env 0） | `06-secret-audit.txt` |
| G8 Save Migration（master `7ba447f` 実セーブ → RC・PC／SP375） | **44/44 PASS** | `07-save-migration/save-migration.json`＋画像 17 |
| G9 acceptance（PC 1508×660／SP 375×667） | **44/44 PASS**・JS error 0・外部通信 0 | `08-acceptance/acceptance.json`＋画像 10 |
| G10 同 seed 一致（engine 差分 0 の機械証明） | PASS | `09-seed-parity.txt` |
| G11 version 1.0.1 | `c11afa0`・`publicFace.test.ts` 5/5 PASS・vitest full 再実行 **1,450 PASS・9 skip**（`12-release/g4-vitest.txt`）・build 再実行 `index-DuX83cAZ.js` 467.58 kB（gzip 145.48）／`index-Cpk4tFE6.css`（`12-release/g5-build.txt`） | `10-version-bump.patch` |
| G12 CI（必須 check `tsc / oxlint / vitest / build`） | 本 PR の Checks（必須 check `tsc / oxlint / vitest / build`） | 本 PR の Checks |

## Known

- 変更なし（K01〜K39 据え置き）。★の値が全 7 体で変わる（道化 4→1・機工師 4→2 等）のは**意図した修正**（注記 1 文目で定義を同時に示す）
- SP375 の遊び方 ② は 6 行（他ステップ ③ 83 字の範囲内・モーダル縦スクロール可）

## Rollback 手順（RL-02 初演習を deploy 直後に 1 往復）

1. Vercel → Deployments → **`6973326943`**（v1.0.0・`d2135d2`・`index-Da5QBYVM.js`）→ Promote to Production（CEO）
2. S1：`home-version-smoke.mjs` で `v1.0.0 (d2135d2)`・console 0 を確認（AI）
3. `<merge 後の deployment id>` を Promote で v1.0.1 に戻す → S1 で `v1.0.1 (<merge 後の sha>)` を確認
4. `docs/evidence/release-safety/rollback-drill-<date>.md` に記録 → DoD #11 DONE
- セーブ互換：saveVersion 9 共通・gameVersion 不変＝v1.0.1 ⇄ v1.0.0 でセーブ・託宣表・Daily はそのまま（★は表示のみ戻る）

## CEO チェック欄（merge 前）

- [ ] Gate G0〜G12 が上表どおり GREEN（CI の必須 check 1 本）
- [ ] 本 PR に Lane 1／Lane 2 の runtime が含まれていない（Files changed に `tactic.ts`・`enemyBreak.*` が無い）
- [ ] Vercel Ignored Build Step が **Automatic または Custom**（「Don't build anything」のままでは deploy されない）
- [ ] merge 方法＝**Create a merge commit**（Ruleset `protect-master`：merge のみ）
- [ ] merge 後：Production Smoke S1〜S6（AI）→ Human QA 10 分（CEO・Q1 ★の並び／Q2 Brief ②／Q3 遊び方 ②／Q4 違和感なし）→ Rollback 演習 1 往復（CEO Promote ×2）
