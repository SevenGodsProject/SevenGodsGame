# v1.0.2 Production Smoke（2026-10-21〜22・決定282・PM 実施・AI 判断）

> **結論：PASS — v1.0.2 PRODUCTION LIVE**。Production https://seven-gods-game.vercel.app/ は merge commit `0d38c05`（PR #2・CEO merge 2026-10-21 14:29:51Z）を配信。Vercel Production deployment **`7228912965`**（success 14:41:18Z）。S1〜S7・bundle 一致・混入 0・console error 0・外部通信 0。Rollback 先＝deployment **`7133236766`**（v1.0.1・`1ce9876`・`index-B6IYVkjL.js`）。

- 公開経路（Ruleset `protect-master` 下の正規経路・AI の push／merge は deny）：RC `release/v1_0_2-rc` `4b1a59c` を **CEO が 5 段階 push**（70.6 MB pack の HTTP 408 を回避・各段 fast-forward・force 0）→ PM が PR #2 作成（本文 `docs/evidence/v1_0_2-rc/pr-body.md`）→ CI run 39616005998 GREEN（必須 check `tsc / oxlint / vitest / build` 50s）→ **CEO が `gh pr merge 2 --merge`** → master `0d38c05` → CI run 39617291567 GREEN → Vercel Production deployment 7228912965（merge から約 11.5 分後に反映。Preview は各段 push で 4 本作成）
- 実行：`node scripts/v1_0_2-rc/production-smoke.cjs --sha 0d38c05`（lane2b worktree・S7 は integ の v1.0.1 build `index-B6IYVkjL.js` を :4182 で preview）。証跡 `docs/evidence/v1_0_2-production-smoke/`（`run-summary.json`・各 step の json／stdout・500KB 超 PNG は WebP 化・pump 画像は削除）
- 混入 0：PR #2 の変更 428 ファイル（docs/evidence 375・src 32・scripts 9）に Lane 3〜9・ランキング・カード画像 v2・将軍家・crisis ボイスは含まれない（origin の両 ref で全ファイル照合）。Production JS の文字列検査でも 0（bundle-match）

## 1. 結果（S1〜S7）

| 項目 | 判定 | 端末 | 証拠 | 問題点 |
|---|---|---|---|---|
| **S1** Home 表示・v1.0.2 配信 | **PASS** | PC 1508／SP 390 | `s1-home.json` allPass：HTTP 200・title・右下ラベル **`v1.0.2 (0d38c05)`**・favicon・OGP・errors 0・failed 0・外部 0 | なし |
| **S1'** v1.0.1 受入（RC Gate G7a と同じ検査を Production に） | **PASS** | PC／SP375 | `s1b-v101-acceptance.json` **44/44**：Home ラベル／Brief 3 行・②確定文言／遊び方 ②・コツ 6・③／敵選択注記＋★7 体 新 rank・aria 一致／横 overflow 0／JS error 0／外部 0 | なし |
| **S1''** 語彙整合 3 点（本 Release の新規） | **PASS** | PC／SP375 | `s1c-vocab/result.json` **20/20**：遊び方 ①「得意技」・「神技」なし・71 字／② 図＝SVG グリフ＋「50」・「次の攻撃」「⚔」なし／共鳴名札「あと7で神の一撃」・「神技発動」なし／JS error 0 | なし |
| **S2** 新規開始・神選択・デッキ・戦闘開始 | **PASS** | PC 1366／1508・SP 760／844 | `s2-s4-qa-flow.json` A：4 viewport で scrollY 0・overflow 0・敵立ち絵 inView・予告「50」・手札 5/5 有効・HP ghost | なし |
| **S3** カード使用・神の一撃・勝敗処理 | **PASS** | 同上 | A：決着まで自動プレイ（神の一撃・HP ghost 観測）→ 結果 → 報酬。B：神域挑戦（10-21 銀甲の機工師 seed V3G5QB／10-22 乱舞の道化 seed ALU1RT＝実行中に JST 日付が替わった）開始→決着→残り回数。C（pc1508）：カードを出さず敗北「敗因：R4：業斧の鬼将の「業斧・断岩」で 260 ダメージ」・振り返り 2 行・ボタン 6 | なし |
| **S4** Save／Resume | **PASS** | 同上 | A：戦闘中リロード → Home「続きから」→ 再開後の盤面一致（qa-flow a07/a08） | なし |
| **S5** 公式ボイス・BGM duck・ミュート | **PASS** | PC／SP | `s5-official-voice.json` allPass：大耀 greeting 要求 1・11.783s の start 1・duck 0.343→1・ミュート時 0・errors 0 | なし |
| **S6** Legal／Credits | **PASS** | PC／SP375 | `s6-legal-credits.json` allPass **19/19 × 2** | なし |
| **S7** 旧セーブ互換（v1.0.1 build のセーブを Production で開く） | **PASS** | PC／SP375 × 通常／神域 | `s7-old-save-migration.json` **44/44**（channel:chromium・rcVersion 1.0.2）：records・stakes・otomoBond・daily・battleSave Resume 一致 | なし |

通信・エラー（全 run 共通）：qa-flow 4 viewport の総リクエスト 293／389／278／276・外部オリジン 0・`/api/` 0・failed 0・console error 0（hosts＝`seven-gods-game.vercel.app` のみ）。

## 2. bundle 一致（決定282 条件 5）

| 項目 | 判定 | 根拠（`bundle-match.json`） |
|---|---|---|
| JS | **PASS** | Production `index-v2yVENya.js` **470,721 B** ＝ RC Gate build `index-xO5hO-tv.js` **470,721 B**。埋め込み build sha（`0d38c05`⇄`32f7f77`）を正規化すると **byte 一致** |
| CSS | **PASS** | `index-o-E1J9Xm.css` sha256 同一（RC・統合 RC と同じハッシュ） |
| version／sha | **PASS** | JS に `1.0.2` と `0d38c05` あり |
| 混入トークン | **PASS** | `/api/ranking`・`RANKING_DATABASE_URL`・`tadatsugu`・`card_common_guard_01_v2`・`voice/taiyo/crisis`：すべて 0 |

## 3. Known・Rollback

- Known：変更なし（K01〜K39 据え置き）。統合 RC Gate v1 §4 の hard 演出ずれ（HP 55〜64・有利側のみ）据え置き。新規 0
- 観測メモ：Vercel の Production deployment 作成が merge から約 11.5 分遅れた（v1.0.1 は 35 秒）。Preview 4 本が直前に積まれたキューの影響と推測（未確認）。Smoke には影響なし
- Rollback（不合格時・未使用）：Vercel → Deployments → `7133236766`（v1.0.1）を Promote to Production（CEO のみ）。保存データは v9 のまま互換（S7）

## 4. 本 Release で変更したもの（runtime）

`docs/V1_0_2_RC_GATE.md` §0・§1 のとおり：軍略 Pilot v1.1（`?pilot=threat` 隔離）／Enemy Break v1（表示専用）／語彙整合 3 点／version 1.0.2。gameVersion `1.d794038a00b5b53c` 不変・save v9 不変・CORE 7 体の HP／行動表 不変。
