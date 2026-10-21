# v1.0.2 RC Gate — 軍略 Pilot v1.1 × Enemy Break v1 ＋ 初心者導線 語彙整合ホットフィックス（決定282 候補）

> **状態（2026-10-21・Lane 1・PM／Dev・AI 判断）：RC `release/v1_0_2-rc`（worktree `SevenGodsGame-lane2b`・起点＝統合 RC `fe1eb37`）に master `1ce9876`（v1.0.1）を merge し、Gate G0〜G12（13 系統・細分を含めて 17 項目）を**すべて実測で PASS**。**READY FOR CEO PRODUCTION RELEASE APPROVAL**（push／PR／master merge／deploy は未実施・CEO 承認後に Ruleset 下の正規経路で公開）。

- CEO 指示：2026-10-21「決定282候補：v1.0.2 統合RC制作」（AI-PM 第 1 優先作業の承認）＋同日「5 レーン並列開発体制」Lane 1
- 入力：`docs/COMBAT_PILOTS_INTEG_GATE_V1.md`（統合 RC `fe1eb37`・Gate 11/11）／`docs/V1_0_1_RELEASE_READINESS.md` §2-3（`gameVersion.ts` conflict の最終形）／`docs/FIRST_PLAYER_TUTORIAL_AUDIT_V1.md` §10-1（語彙整合 (a)(b)(c)）／`docs/V1_0_1_RC_GATE_CHECKLIST.md`（Gate 項目の基準）
- 証跡：`docs/evidence/v1_0_2-rc/`（本書 §3 の表に対応。500KB 超の PNG は WebP に変換済み）
- 守った禁止事項：`git push`／master への merge／tag／rebase／reset --hard／stash／branch 削除／deploy／本番設定変更：いずれも**行っていない**。既存 Gate の基準は緩和していない

---

## 0. 結論（先に）

| 区分 | 内容 |
|---|---|
| 内容 | ① 軍略 Pilot v1.1（Lane 1・enemy_09・`?pilot=threat` 隔離・難易度別しきい値）② Enemy Break v1（Lane 2・表示 HP 50%／25% 帯で敵が 1 回崩れる・表示専用）③ 語彙整合ホットフィックス 3 点（共鳴名札「神技発動」→「神の一撃」／遊び方 ①「神技」→「得意技」／遊び方 ② 図を SVG グリフ＋「50」）④ version 1.0.2 ⑤ 決定281 の公開記録 docs（`fa941e8`）の同梱 |
| 起点と commit | `fe1eb37`（統合 RC）→ **`3412180`** merge master `1ce9876`（conflict 1＝`gameVersion.ts` を READINESS §2-3 の最終形で解決・enemy_09 rank 2→3・CORE golden 更新）→ **`340f5f7`** 語彙 (a)(b)(c) → **`33fa29f`** version 1.0.2 → **`c46ac22`** `pilotFlag.test.ts` 契約更新 → **`32f7f77`** `invariants.mjs` golden → **`10463c8`** merge `fa941e8`（決定281 記録・docs のみ）→ 本書＋証跡 commit |
| 不変性（§2） | `getGameVersion()` ＝ **`1.d794038a00b5b53c` 不変**（golden 3 本 PASS）／save v9 不変／CORE 7 体の HP・行動表 不変（差分は v1.0.1 の rank 行のみ＝golden sha256 を `5678e3e7…` に更新）／`src/core` の差分＝Lane 1 v1.1 ＋ v1.0.1 rank のみ／Daily pool・攻略盤は CORE 7 体のまま（`pilotFlag.test.ts`） |
| 自動 Gate（§3） | **G0〜G12（13 系統・細分を含めて 17 項目）すべて PASS・FAIL 0・UNRUN 0**（内訳：G2b invariants／G7a・G7b・G7c 受入 3 種／G8t probe-threat を細分として数える）：tsc 0／oxlint 11（master 基準・新規 0）／vitest **1,504 PASS・0 fail・17 skip**／build `index-xO5hO-tv.js` 470.72 kB・css 194.85 kB／invariants 13/13／Ranking Absence PASS／Secret PASS／v1.0.1 受入 **44/44**／Lane 1 受入 **74/74**／語彙確認 **20/20**（PC・SP375）／probe 7 体 8 run 決着・JS error 0／probe-threat 6/6／**Save Migration 44/44**（master v1.0.1 build × RC build）／Home version `v1.0.2 (32f7f77)` |
| Known | 統合 RC Gate v1 §4 の「hard 演出ずれ（HP 55〜64・プレイヤー有利側のみ）」を**据え置き**（表示コード変更 0・AI 推奨＝現状維持）。SP375 龍神の着弾 FX viewport 外 2 件＝Lane 2 After と同数（既知の L4 斬撃）。新規 Known 0 |
| CEO 判断 | **Production 公開承認 1 件のみ**（CLAUDE.md §6-3 #8）。内容・仕様の新規判断 0（軍略 v1.1 は CEO QA 4/4・Enemy Break は 6/6 PASS 済み・語彙 3 点は §6-2 の軽微な UX 調整） |
| 公開経路 | CEO：RC branch を push → PR → CI GREEN（`tsc / oxlint / vitest / build`）→ `gh pr merge --merge` → Vercel 自動 deploy → Production Smoke（`docs/V1_0_1_PRODUCTION_SMOKE.md` S1〜S7 を v1.0.2 の値で）。Rollback 先＝deployment `7133236766`（v1.0.1） |

---

## 1. branch・merge 記録・conflict 解決

| # | 項目 | 内容 |
|---|---|---|
| 1 | 起点 | `feat/combat-pilots-integ-rc` `fe1eb37`（Lane 1 `06e3bba` ＋ Lane 2 `41748e9`・Gate 11/11）。同 worktree で `release/v1_0_2-rc` を新設（Lane の branch は不変） |
| 2 | master 同期 | integ worktree の `master` を `origin/master` `1ce9876` へ **fast-forward**（ahead 0／behind 9 → 0）。origin への操作 0 |
| 3 | merge | `git merge --no-ff master`：auto-merge 66 files・**conflict 1**（`src/core/replay/gameVersion.ts` 2 hunk） |
| 4 | 解決（READINESS §2-3 の最終形をそのまま） | (1) import は `CORE_ENEMIES` ＋ `EnemyDef` 型の両方 (2) `enemiesForFingerprint()` は `CORE_ENEMIES.map(... rank: FINGERPRINT_RANK_V1_0_0[id] ?? 0)` (3) `rankingImpactSnapshot()` の `enemies:` は `enemiesForFingerprint()`。両 Lane の意図「版 `1.d794038a00b5b53c` を据え置く」は両立 |
| 5 | 同一 commit の 2 点（§2-3 表） | (a) `enemies.ts` `PILOT_ENEMIES[0]`（enemy_09）`rank: 2` → `3`（本体 enemy_02 の新★3 を継承・表示専用・CORE 外＝指紋に乗らない）(b) `coreRoster.test.ts` `CORE_GOLDEN_SHA256` `b4ce1e31…` → **`5678e3e757f603ae3b2a1974c772c5480222bea9c7e3e6a78f96d1b49bd70e91`**（v1.0.1 の rank 7 値再付番＝Expected Specification Update・HP／行動表は不変） |
| 6 | golden の参照範囲 | `enemies.test.ts`（★再付番 2 件）・`gameVersion.test.ts`（指紋 7 体）・`enemySelectNote.test.ts`（既定の敵選択は CORE のみ描画）・`pilotFlag.test.ts`（配線契約）を **CORE 7 体**基準へ。Pilot 敵は `ENEMIES`（CORE＋Pilot）にだけ現れる前提は不変 |
| 7 | 語彙 (a)(b)(c) | `GodOtomoPanel.tsx`（名札 1 行＋コメント）・`tutorialContent.ts`（① 75→71 字）・`TutorialOverlay.tsx`（図＝`GlyphIcon sword`＋`formatScaled(amount)`・import 1 行）。CSS 規則・engine・storage・画像 0。同梱 B-3（② の ⚔ 絵文字除去）と案 2（防御（ブロック）文言）は**本 RC に含めない**（Lane 5 `NEXT_QUALITY_IMPROVEMENT_PLAN_V1.md` 束 #1） |
| 8 | version | `package.json`・`package-lock.json` 2 箇所・`src/publicFace.test.ts`＝1.0.2（`@rolldown/pluginutils` 1.0.1 は依存の版・不変） |
| 9 | 決定281 記録 | `docs/v1_0_1-release-record` `fa941e8`（docs／evidence 84 files・runtime 0）を `--no-ff` merge（conflict 0）。RELEASE_STATUS A-0＝v1.0.1 PRODUCTION LIVE の記録が RC に揃う |

---

## 2. 不変性（機械証明）

| # | 項目 | 結果 | 証跡 |
|---|---|---|---|
| 1 | `getGameVersion()` | `1.d794038a00b5b53c` **不変**（`gameVersion.test.ts`・`useReactionLanguage.test.ts`・`coreRoster.test.ts` golden PASS・`invariants.mjs` ②） | `02-invariants.json`・`03-vitest.txt` |
| 2 | CORE 7 体 | JSON sha256 `5678e3e7…`（v1.0.1 master と同一・rank 以外 0 差分）／`enemies.test.ts` rank golden 龍神4／怨霊4／魔獣3／鬼将3／影2／機工師2／道化1 PASS | `02-invariants.json` |
| 3 | 指紋の除外 | `RULES.enemyTactic`・`ratioByDifficulty`・`hpRatioByDifficulty` は指紋に入らない／Pilot 敵は指紋に入らない（`invariants.mjs` 13/13） | `02-invariants.json` |
| 4 | save／storage | saveVersion 9 不変・Save Migration 44/44（§3 G11） | `09-save-migration/` |
| 5 | Daily／攻略盤 | `DAILY_BOSS_POOL`・`MATCHUP_ENEMIES`＝`Object.values(ENEMY_IDS)`（CORE 7 体）不変（`pilotFlag.test.ts`） | `03-vitest.txt` |

---

## 3. 自動 Gate G0〜G12（13 系統・細分を含めて 17 項目・直列・2026-10-21 12:5x〜13:4x UTC）

| # | Gate | 結果 | 数値 | 証跡（`docs/evidence/v1_0_2-rc/`） |
|---|---|---|---|---|
| G0 | clean worktree | **PASS** | tracked 差分 0（未追跡＝Lane 2 の証跡 PNG と本 Gate の生成物のみ） | — |
| G1 | `npx tsc -b --noEmit` | **PASS** | エラー 0・exit 0 | `01-tsc.txt` |
| G2 | `npx oxlint .` | **PASS** | 警告 **11**／エラー 0・exit 0。11 件は master 基準と同一（`scripts/**` 10・`BattleScreen.tsx` exhaustive-deps 1）。新規 0 | `02-oxlint.txt` |
| G2b | invariants | **PASS** | **13/13**（CORE sha・gameVersion・指紋除外・Pilot データ） | `02-invariants.json` |
| G3 | `npx vitest run`（full） | **PASS** | **122 files passed／8 skipped（130）・1,504 tests passed／0 failed／17 skipped（1,521）**・44.3s・exit 0。統合 RC 1,485 ＋ v1.0.1 の追加テスト＝合算と一致。初回 run の 1 fail（`pilotFlag.test.ts` の `gameVersion.ts` 文字列契約）は統合形へ更新（`c46ac22`）して再実行 | `03-vitest.txt` |
| G4 | `npm run build` | **PASS** | HEAD `32f7f77`：`index-xO5hO-tv.js` **470.72 kB**（gzip 146.54）／`index-o-E1J9Xm.css` **194.85 kB**（gzip 36.28・統合 RC と同一ハッシュ＝CSS 変更 0）。JS は統合 RC 470.39 ＋ v1.0.1 分 ＋ 語彙 3 点＝ +0.33 kB | `04-build.txt` |
| G5 | Ranking Absence | **PASS** | `ranking-absence.mjs`（rc101 修正版・`docs/evidence/` 除外）RESULT PASS（dist に ranking／api 0） | `05-ranking-absence.txt` |
| G6 | Secret Audit | **PASS** | `secret-audit.mjs 1ce9876`：credential 形式の値 0（残りは docs 散文・識別子・ハッシュ） | `06-secret-audit.txt` |
| G7a | v1.0.1 受入 `scripts/v1_0_1-rc/acceptance.mjs`（preview :4199・PC 1508×660／SP 375×667） | **PASS** | **44/44**：Home version `v1.0.2 (32f7f77)`・Brief 3 行・② 確定文言・遊び方 ②／コツ 6／③・敵選択注記＋★7 体 新 rank・aria 一致・横 overflow 0・JS error 0・外部通信 0 | `07a-v101-acceptance/` |
| G7b | Lane 1 受入 `scripts/lane1-threat-branch/acceptance.mjs` | **PASS** | **74/74**（統合 RC Gate v1 G7 と同数・108s）：通常 URL 敵 7 体・Pilot URL 8 体目「業斧の鬼将・軍略」＋印＋案内・R3「⚠ 傷が浅ければ次は断岩」→R4 分岐・記録 0・JS error 0 | `07b-lane1-acceptance/` |
| G7c | 語彙確認 `scripts/v1_0_2-rc/vocab-check.mjs`（新規・QA 用） | **PASS** | **20/20**（PC・SP375 × 10）：(b) ① に「得意技」あり「神技」なし・71 字／(c) ② 図＝SVG グリフ 1＋「50」・「次の攻撃」「⚔」なし・overflow 0／(a) 共鳴名札「あと7で神の一撃」・画面に「神技発動」なし／JS error 0。スクリーンショット `tutorial-1/2-*`・`battle-plate-*`（降臨演出後に再撮影） | `07c-vocab/` |
| G8 | Lane 2 probe（通常 7 体・`?enemy=<slug>`・大耀・seed `cf2-pilot-01`） | **PASS** | **7 体 8 run すべて決着・JS error 0・着弾 FX viewport 外 0（SP375 龍神のみ 2＝Lane 2 After と同数・既知）・名札／吹き出し／ドック被り 0・FX 中心は敵の絵の中 100%**。帯遷移：龍神 half@T17／quarter@T21（22 手・16 札）＝統合 RC Gate v1 と**同一進行** | `08-probe/<slug>/summary.json` |
| G8t | probe-threat（軍略 × Enemy Break・seed 3 × PC／SP375） | **PASS** | **6/6 run**：seed 01＝else／02・03＝then（統合 RC Gate v1 と同一）・各 run で崩れ 1 回・JS error 0・R3 予告「⚠ 傷が浅ければ次は断岩」不変 | `08-probe-threat/summary-threat.json` |
| G9 | 同 seed 一致（決定論） | **PASS** | §2 の機械証明＋G3 の決定論テスト＋G8／G8t の進行が統合 RC Gate v1 の証跡と一致 | — |
| G10 | reduced-motion | **PASS（既存テスト）** | `enemyBreak.test.ts` の reduced-motion 契約が G3 に含まれ PASS。CSS は統合 RC と同一ハッシュ（G4） | `03-vitest.txt` |
| G11 | Save Migration（master v1.0.1 build × RC build・`save-migration.mjs`・`channel:chromium`） | **PASS** | **44/44**（200s）：master A 通常戦決着→神域挑戦→途中セーブ／B 神域途中セーブ を RC で開く：records・stakes・otomoBond・daily・battleSave Resume・PC／SP375 すべて一致。master build＝`index-B6IYVkjL.js`（Production と同一バンドル名） | `09-save-migration/`・`09-master-build.txt` |
| G12 | Home version smoke | **PASS** | `v1.0.2 (32f7f77)`・title／favicon／OGP 配信・errors 0・外部通信 0（初回は `PLAYWRIGHT_MODULE` 未指定で引数エラー exit 1＝再実行で PASS） | `10-home-version.json` |

UNRUN：**なし**。意図して省いたもの：reduced-motion のブラウザ再実測（CSS 同一ハッシュ）／probe の SP375 を龍神以外（帯判定は viewport 非依存）／`hard-boundary.mjs`（表示コード変更 0・Known 据え置き）。

実行環境：RAM 6GB・preview は `gate-preview-run.cjs`（:4199・1 本）→ `two-preview-run.cjs`（master :4182 ＋ RC :4181・Save Migration 用に新設）で起動し、終了時に `taskkill /T /F`（LISTEN 0 を確認）。

---

## 4. Known（据え置き・新規 0）

| # | 内容 | 扱い |
|---|---|---|
| 1 | hard のみ HP 55〜64（10 段）で「軍略 then だが Enemy Break half が出ない」（プレイヤー有利側のみ） | 統合 RC Gate v1 §4 のまま据え置き。表示コード変更 0 |
| 2 | SP375 龍神の着弾 FX viewport 外 2 件（L4 斬撃） | Lane 2 After と同数・既知 |
| 3 | 遊び方 ② の ⚔ 絵文字（同梱 B-3）・防御（ブロック）文言（案 2） | 本 RC 対象外。v1.0.3 候補 束 #1（Lane 5） |
| 4 | Home の version ラベルの sha は build 時 HEAD（`32f7f77`）。本書・証跡 commit 後の HEAD とは異なるが、Production は merge commit の sha で Vercel が build する（v1.0.1 と同じ運用） | — |

---

## 5. 公開までの残手順（CEO／PM）

| # | 誰 | 作業 |
|---|---|---|
| 1 | CEO | 本 RC の Production 公開を承認（§6-4 形式は `docs/DECISIONS.md` 決定282 候補行） |
| 2 | CEO | `release/v1_0_2-rc` を origin へ push → PR 作成（本文＝本書 §0・§3）→ CI GREEN → `gh pr merge --merge` |
| 3 | PM | Production Smoke S1〜S7（v1.0.2・sha＝merge commit）→ RELEASE_STATUS A-0 を v1.0.2 に更新 → 決定282 を PRODUCTION LIVE に確定 |
| 4 | PM | 公開後：Lane 5 束 #1〜#3（v1.0.3 候補）・Lane 3 crisis Pilot・Lane 4 忠次 v0.4 を RC HEAD から派生 |
