> **状態（2026-10-17・CEO 正式承認「v1.0.1 Fast Gate 単独 Production Release」・AI-PM 実施）：S1〜S6 **全 PASS**・bundle 一致 PASS・混入 0。S7 旧セーブ互換（v1.0.0 実セーブ → Production v1.0.1）**PASS 44/44**。CEO 実機 Human QA（G14）・Rollback 演習（G15）は未実施（PASS 扱いにしない）。**

# v1.0.1 Production Smoke Test — 結果

- 対象：`https://seven-gods-game.vercel.app/`（公開 commit **`1ce9876`**＝PR #1 merge commit・Vercel deployment **`7133236766`**・Production bundle `index-B6IYVkjL.js`／`index-Cpk4tFE6.css`・Rollback 先 `6973326943`＝v1.0.0 `d2135d2`）
- 経路：RC `feat/v1_0_1-fast-gate-rc`（HEAD `ccbb664`＝`f0c5001` ＋ docs `df27177` ＋ version bump `c11afa0` ＋ 証跡 `ccbb664`）→ CEO push（2026-10-17 10:2x JST）→ PR #1 → CI run 38990577985 GREEN（必須 check `tsc / oxlint / vitest / build`・1m1s）→ mergeable `clean` → **CEO `gh pr merge 1 --merge`**（01:48:55Z）→ Vercel 自動 deploy `7133236766` success（10:49 JST）
- 方法：v1.0.0 Smoke と同じ（Playwright headless Chromium・隔離プロファイル＝本番ユーザーデータの変更 0・全リクエスト記録）。各ステップは `heavy-run.cjs`（空き RAM 450 MB 以上・1 本ずつ）で直列実行。dev サーバー 0 本
- 端末：PC 1508×660／SP 390×760（S1）、PC／SP375（S1'）、PC 1508×660／SP 390×844（S2〜S4・`--only pc1508,sp844`・RAM 制約）、PC／SP（S5・S6）
- Evidence：`docs/evidence/v1-0-1-production-smoke/`（JSON 7・stdout 6・スクリーンショット約 50・`bundle-match.json`・`run-summary.json`）

## 1. 事前監査（merge 前・停止条件に該当なし）

| 項目 | 結果 |
|---|---|
| 混入監査 | RC は Lane 1（軍略 Pilot v1／v1.1）・Lane 2（Enemy Break）・統合 RC・初心者監査の全 commit（11 件）を含まない（`git merge-base --is-ancestor` 全て否）。PR #1 の変更ファイル 194 件のうち runtime は 14 件＝v1.0.1 の対象のみ・`tactic`／`enemyBreak`／`pilotFlag`／`combat-pilots`／`LANE1`／`LANE2`／`FIRST_PLAYER_TUTORIAL` に一致 0 |
| master vs origin/master | `d2135d2..7ba447f` docs-only 5 commit・runtime 差分 0（計画どおり PR に同梱） |
| G11 version bump | `c11afa0`（`package.json`・lock 2 箇所・`publicFace.test.ts` 5/5 PASS） |
| G4 vitest full（再実行） | 118 files PASS・6 skip／**1,450 PASS・9 skip**（`docs/evidence/v1_0_1-rc/12-release/g4-vitest.txt`） |
| G5 build（再実行） | `index-DuX83cAZ.js` 467.58 kB（gzip 145.48）／`index-Cpk4tFE6.css` 191.84 kB（`12-release/g5-build.txt`） |
| G12 CI | PR #1 run 38990577985 **success**（必須 check 1 本） |
| Ruleset／deploy 前状態 | `protect-master` active・open PR 0・最新 deployment `6973326943`（v1.0.0） |

## 2. 結果（S1〜S6）

| 項目 | 判定 | 確認した端末 | 証拠 | 問題点 |
|---|---|---|---|---|
| **S1** Home 表示・v1.0.1 配信 | **PASS** | PC 1508／SP 390 | `s1-home.json` **11/11 × 2**：HTTP 200・title「SEVEN GODS：共鳴カードバトル」・右下ラベル **`v1.0.1 (1ce9876)`**・favicon・og:title・description・開始ボタン・横はみ出し 0・console error 0・失敗リクエスト 0・外部オリジン 0。`s1-home-pc1508.png`／`s1-home-sp390.png` | なし |
| **S1'** v1.0.1 受入（RC Gate G9 と同じ検査を Production に対して） | **PASS** | PC／SP375 | `s1b-v101-acceptance.json` **44/44**（pc 22・sp375 22）：Home ラベル／Brief ②「カード左上の数字が必要な神力です。余った神力と防御は、次のラウンドへ持ち越せません。」（PC 2 行・SP375 3 行）／遊び方 ②（PC 3 行・SP375 6 行）・コツ 6 本／敵選択 注記「★は脅威度（実測の手強さ…最大5）。難易度の★とは別物です。」＋★ 7 体＝新 rank・aria-label／overflow 0／JS error 0／外部通信 0。画像 10（`home-*`・`brief-*`・`tutorial-2-*`・`tutorial-tips-*`・`enemy-select-*`） | なし |
| **S2** 新規開始・神選択・デッキ編成・戦闘開始 | **PASS** | PC 1508・SP 844 | `s2-s4-qa-flow.json`／`s24-stdout.txt`：Home → 大耀 → 難易度 → 業斧の鬼将 → デッキ → 戦闘。両 viewport で敵立ち絵 inView・予告「50」・手札 5/5・「ラウンドを終える」有効・scroll 0・横はみ出し 0 | なし |
| **S3** カード使用・神の一撃・Enemy Intent・勝敗処理 | **PASS** | PC 1508・SP 844 | 神の一撃カットイン 1 回・callout 1・HP ghost。**勝利**（両 viewport）：「勝利／報酬カードを選ぶ ›／報酬 3 択」。神域挑戦（daily `enemy_01`・seed `daily-2026-10-17-enemy_01`）も勝利「今日のベスト 8,250（1回目）残り 2 回」→ Home「挑戦開始（残り2回）」・rankingUi false | なし |
| **S4** Save／Resume | **PASS** | PC 1508・SP 844 | リロード → Home「**続きから大耀 vs 業斧の鬼将・ラウンド2**」→ 再開後 round=2・手札 6・敵 inView・終了ボタン有効。神域挑戦も残り回数保持 | なし |
| **S5** 公式ボイス・BGM duck・ミュート | **PASS** | PC・SP | `s5-official-voice.json` `allPass: true`（4/4）：大耀で開戦 → `/assets/voice/taiyo/greeting.mp3` 要求 → 11.78 秒の buffer start 1 回・BGM duck 0.343 → 1 に復帰・ミュート時はボイス要求 0／start 0・errors 0 | なし |
| **S6** Legal／Credits 画面・承認文言 | **PASS** | PC・SP375 | `s6-legal-credits.json` `allPass: true`（19/19 × 2）：画面表示・確定文言・禁止語 0・横はみ出し 0・「戻る」で Home・localStorage 不変・JS error 0 | なし |

### 通信・エラー（全 run 共通）

| run | リクエスト総数 | 外部オリジン | `/api/` | 失敗 | console error |
|---|---|---|---|---|---|
| S2〜S4 PC 1508 | 393 | 0 | 0 | 0 | 0 |
| S2〜S4 SP 844 | 275 | 0 | 0 | 0 | 0 |
| S1／S1'／S5／S6 | — | 0 | 0 | 0 | 0 |

意図しない外部 API 通信：**0**。表示崩れ：横はみ出し 0。

## 3. 追加検証（CEO 必須条件 6）

| 項目 | 判定 | 根拠 |
|---|---|---|
| **Production bundle の一致** | **PASS** | `bundle-match.json`：Production `index-B6IYVkjL.js`（467,585 B）と RC Gate build `index-DuX83cAZ.js`（467,585 B・build sha `c11afa0`）は **build sha 文字列（`1ce9876`⇄`c11afa0`）を正規化すると byte 一致**（bundle 名の差は埋め込み sha の差のみ）。CSS `index-Cpk4tFE6.css` は sha256 同一。version 文字列 `1.0.1` あり |
| **通常 7 体の不変性** | **PASS** | 上記 byte 一致＋RC Gate G1（★再集計 7/7）・G10（`src/core/engine` 差分 0・決定論テスト）・`09-seed-parity.txt`。gameVersion `1.d794038a00b5b53c` 不変（`gameVersion.test.ts` golden・CI GREEN）。Production bundle に Lane 由来文字列（`enemy_09`・`ratioByDifficulty`・`enemy-break`・`break-half`）0 |
| **軍略 Pilot／Enemy Break の混入なし** | **PASS** | §1 混入監査＋Production bundle の文字列検査 0＋PR #1 Files changed に `tactic.ts`・`enemyBreak.*` なし |
| **console error** | **PASS** | 全 run 0（上表） |
| **旧セーブ互換（S7）** | **PASS 44/44**（s7-old-save-migration.json・画像 17・PC／SP375 × 通常／神域：Home「続きから大耀 vs 業斧の鬼将・ラウンド2」／「続きから神域挑戦・大耀 vs 試練の影・ラウンド2」・「挑戦する（残り2回）」・戦績・復元盤面 ラウンド 2／手札 6 が v1.0.0 と一致、battleSave 差分 0・他キー改変 0・外部通信 0・JS error 0） | v1.0.0 build（`7ba447f`・`index-Da5QBYVM.js`・ローカル preview）で実セーブ 2 種（通常戦 決着＋神域挑戦 決着＋通常戦 R2 途中／神域挑戦 R2 途中）を作り、**Production v1.0.1 に注入**して Home「続きから」・戦績・神域「残り回数」・復元盤面（ラウンド・神力・HP・手札）・battleSave 差分 0・他キー改変 0 を検査（RC Gate G8 と同じ `save-migration.mjs`）。注：新 headless Chromium（channel:'chromium'）が本日 localhost への navigate を `ERR_NETWORK_ACCESS_DENIED` で拒否したため、headless shell＋screenshot pump（対局予算 600 秒）で実行（`s7-old-save-stdout.txt`） |

## 4. 未実施（PASS 扱いにしない・CEO）

| # | 項目 | 担当 |
|---|---|---|
| G14 | Human QA 10 分（Q1 ★の並び／Q2 Brief ②／Q3 遊び方 ② の 3 概念／Q4 違和感なし）→ `docs/evidence/v1-0-1-fast-gate/human-qa.md` | CEO |
| G15 | Rollback 演習（Promote `6973326943` → S1 `v1.0.0 (d2135d2)` → Promote `7133236766` → S1 `v1.0.1 (1ce9876)`）・RL-02 初演習 | CEO Promote ×2・PM S1 ×2 |
| — | CEO 実機目視（iPhone／PC）・神託の実使用・BGM 聴感（v1.0.0 と同じ扱い） | CEO 任意 |

## 5. 復旧手順（不合格時・使用せず）

Vercel Deployments → `6973326943`（v1.0.0）→ Promote to Production（CEO）→ S1 で `v1.0.0 (d2135d2)` を確認。セーブ互換：saveVersion 9・gameVersion 不変のため v1.0.1 ⇄ v1.0.0 でセーブ・託宣表・Daily はそのまま（★表示だけ戻る）。

## 6. 本 Release で変更したもの（runtime）

`src/core/data/enemies.ts`（rank 7 行）・`src/core/replay/gameVersion.ts`（`FINGERPRINT_RANK_V1_0_0`・`enemiesForFingerprint()`）・`src/components/setup/firstBattle.ts`・`src/components/tutorialContent.ts`（新規）・`src/components/TutorialOverlay.tsx`・`src/components/setup/EnemySelectScreen.tsx`・`package.json`／`package-lock.json`（1.0.1）。engine・rules・cards・gods・otomo・divination・storage・saveVersion 9 は不変。Known：変更なし（K01〜K39 据え置き）。
