> **状態（2026-10-10・CEO 承認「RC-2 CI First Run」・AI 実行）：private ミラー CI GREEN（`e09c1f8`）→ clean RC worktree で Release Gate 全項目 PASS → **AI 判定：GO（Production 公開可・公開の実行は CEO ④ 判断）**。origin への push・Production deploy・Vercel 設定変更・保護 worktree の変更・ゲーム仕様の変更はいずれも行っていない。**公開元 repo（`SevenGodsProject/SevenGodsGame`）の CI は未実行**（master push と同時に初めて走る）。**

# v1.0 Release Candidate Gate — RC-2（credits＋voice 統合後）

## 1. CI First Run（private ミラー・承認条件 1〜6）

| 条件 | 実施 | 結果 |
|---|---|---|
| 1 repo 作成 | `gh repo create SevenGodsProject/SevenGodsGame-ci --private`（fork ではない・Vercel 未連携） | `isPrivate: true`・`visibility: PRIVATE` |
| 2 push 前の private 確認 | `gh repo view --json isPrivate` を push 直前に再確認 | `true` |
| 3 秘密情報・認証情報・大容量 | (a) 資格情報パターン（ghp_／github_pat_／sk-／AKIA／PRIVATE KEY／xox／AIza／Bearer）を HEAD 全 tracked と master 全履歴の追加行で grep → **0**。(b) 本作の `scripts/release-audit/secret-audit.mjs 641ea5c` → **PASS**（残る hit は識別子・散文・ハッシュ・`.env` という語の参照のみ。`docs/evidence/v1-rc-gate/secret-audit.txt`）。(c) master 履歴 315 commit・blob 3,899 個・**644MB**。50MB 超 **0**（GitHub 上限 100MB）。3MB 超は評価 JSON（最大 18.4MB `sim255-tune.json`）・BGM 原本 mp3（≤7.1MB）・カード原画 PNG（≤4.6MB）＝すべて **origin/master で既に公開済み**の既存ファイル。(d) `.claude/settings.local.json` は 2026-08-15 に commit され 2026-09-13 `85c94ee` で削除済み＝履歴に残る（内容は権限 allowlist・ローカルパスのみ・資格情報なし・origin で既に公開済み）。(e) 個人識別：home パス `kimi1`・LAN IP `192.168.11.x` が docs に含まれる（origin で既に公開済み・private ミラーでは追加露出なし） | **不要な新規露出 0**。既公開の情報を private に複製するのみ |
| 4 対象 commit | integ master **`e09c1f8`**（credits `6ffadbf`・voice `e0ea825`・A-1 `f2366a6`・決定275 候補 `f84b20d`・CI 経路調査 `e09c1f8`）を `git push mirror master:master`（origin には push しない） | ミラー `refs/heads/master` = `e09c1f8d…` |
| 5 CI 実行 | push → `push: branches [master]` で `ci` が自動起動（run `38002245813`） | **GREEN**：npm ci／tsc／oxlint（warning 11・error 0）／vitest（116 files passed・6 skipped）／build（894ms）。所要 60 秒。`docs/evidence/rc2-integration/mirror-ci-run-38002245813.json` |
| 6 RED 時 | — | 該当なし |

**区別**：上は **private ミラーでの GREEN**。**公開元 repo の CI は未実行**（ci.yml が origin/master に無いため、master push 時に初めて走る＝Production deploy と同時）。

## 2. RC Gate（承認条件 7・clean worktree `SevenGodsGame-v1rc` = `e09c1f8`・node_modules は integ への junction・tracked 差分 0）

| # | 項目 | 手段 | 結果 | Evidence（`docs/evidence/v1-rc-gate/`） |
|---|---|---|---|---|
| G1 | 型・lint・単体・build | private ミラー CI（§1）＋ローカル full vitest 1,431 PASS（`f84b20d`・決定275 候補） | **PASS** | `rc2-integration/mirror-ci-run-*.json` |
| G2 | Ranking Absence（課金・広告・ランキング backend・外部通信 0） | `scripts/release-audit/ranking-absence.mjs --dist`（RC dist） | **PASS 18/18**。初回は FAIL 2＝voice 統合で増えた**同一オリジンの MP3 fetch**（`sound.ts:376` `VOICE_BASE_PATH='/assets/voice/'`・dist は `arrayBuffer()→decode`）を監査の allowlist が SE .wav しか知らなかったため → 監査スクリプトの allowlist に voice を追加して再実行（**監査ツールの更新のみ・runtime 不変**） | `ranking-absence.txt` |
| G3 | Secret Audit | `secret-audit.mjs 641ea5c` | **PASS** | `secret-audit.txt` |
| G4 | 通し QA（Home → 神 → 難易度 → 敵 → デッキ → 戦闘 → 中断 → 続きから → 決着 → 振り返り → 報酬／神域挑戦／敗北）× 4 viewport（PC 1366・1508／SP 390×760・390×844） | `release-audit/qa-flow.mjs`（RC 4184） | **PASS**：全 viewport で external 0／api 0／failed 0／errors 0・続きから OK・報酬 3 択・神域挑戦の残り回数表示・敗北画面 | `qa-flow.json`・`qa-flow-shots/`（70 枚） |
| G5 | Save Migration（Production master `641ea5c` の build で作った localStorage を RC で開く） | `release-audit/save-migration.mjs`（master 4185 → RC 4184） | **PASS**：通常戦「続きから大耀 vs 業斧の鬼将・ラウンド2」再開・決着まで・records／reward／stakes 保持・神域挑戦「続きから…ラウンド2」再開・残り回数「挑戦開始（残り2回）」・external／api 0 | `save-migration.json` |
| G6 | storage version（決定267 Gate 項目 15） | `d267-reward-relevance-v1/migration.mjs`（RC） | **PASS 10/10** | `migration/summary.json` |
| G7 | A11y Minimum Pack | `a11y-minimum-pack/acceptance.mjs`（RC） | **PASS 72/72**（決定271 時 70→72 は項目追加） | `a11y-acceptance.json` |
| G8 | Legal／Credits 画面（確定文言） | `legal-credits/acceptance.mjs`（RC） | **PASS 40/40** | `legal-credits-acceptance.json` |
| G9 | 公式ボイス（大耀「あいさつ」1 回・ミュート時 0） | `official-voice-pilot/acceptance.mjs`（RC） | **PASS 4/4** | `official-voice-acceptance.json` |
| G10 | 決定論・同 seed parity | vitest の replay／golden 系（CI 内で PASS）。実機再生成は 決定267 Gate と同一 suite | **PASS（CI 経由）** | — |
| G11 | 閉じたレバー（決定263／216／214）を再開していない | DECISIONS 末尾まで確認 | **PASS** | — |

**RC build**：JS 464.74kB／CSS 193.62kB（gzip 144.65／36.11kB）・`dist/assets/voice/taiyo/greeting.mp3` 含む・`package.json` `1.0.0-rc.1`。

## 3. Known 凍結候補（v1.0.0 時点・CEO 承認待ち＝DoD #10）

`RELEASE_STATUS.md` A-4 の現行 Known（K01〜K35）に加えて：

| Known | 内容 | 分類 |
|---|---|---|
| K36 | 公式ボイス：入口を skip しても鳴る（`OFFICIAL_VOICE_PILOT_V1.md` §5 #3・CEO Q8 PASS 時に許容） | C |
| K37 | Credits S6「生成記録が揃っていない素材を制作者の責任で使用」は AI 追加文（CEO が不要なら 1 行削除） | 文言 |
| K38 | 忠次 Pilot（v0.1〜v0.3）・Card Art Pilot 6 は v1.0 に**含まれない**（別 branch・post-v1.0） | — |
| K39 | 公開元 repo の CI は Production 公開と同時に初回実行（ミラーでは GREEN） | 運用 |

## 4. 判定と残り（CEO ④ のみ）

**AI 判定：GO。** 自動 Gate は全項目 PASS、権利・文言は CEO 条件付き承認済み（決定275 候補）、未解決事項は Credits 画面と台帳で開示済み。残るのは CEO 以外に実行できない操作だけ：

| 順 | 操作 | 誰が | 備考 |
|---|---|---|---|
| 1 | `package.json` を `1.0.0` へ・RELEASE_STATUS に「正式公開」行（AI 下書き） | AI（CEO GO 後） | runtime 差分は version 文字列のみ。CI は再実行（ミラー） |
| 2 | `git push origin master`（**= Vercel Production 自動 deploy ＝ 公開**。同時に公開元 CI 初回実行） | **CEO** | §6-3 #8 |
| 3 | Production Smoke 6 項目（A-5）→ 異常なら Vercel Dashboard で rollback（Promote 前 deployment） | AI 測定／**CEO 操作** | rollback 先＝現 Production `641ea5c` の deployment |
| 4 | Rollback 演習 1 回（DoD #11・Vercel Promote 2 回） | **CEO** | `RELEASE_SAFETY_PREFLIGHT.md` §3 |
| 5 | Known 凍結承認（§3）・tag `v1.0.0`・公開投稿 | **CEO** | DoD #10／#18 |
| 6 | private ミラーの扱い：CI 専用として保持 or 削除 | CEO | 費用 0 |

## 5. 後片付け（本 Gate で作ったもの）

- worktree `SevenGodsGame-v1rc`（`release/v1-0-0-rc` = `e09c1f8`）・`SevenGodsGame-prodmaster`（detached `641ea5c`）：残置（削除は `git worktree remove`・CEO 不要なら AI が次回整理）。Gate 用 preview 4184／4185 は停止済み（4180〜4182 の忠次 Pilot は維持）
- `C:\Users\kimi1\SevenGodsGame-rc` は以前からある **node_modules だけのフォルダ**（git ではない）。触っていない
- remote `mirror`（integ のみ）：`https://github.com/SevenGodsProject/SevenGodsGame-ci.git`

## 6. Release Preparation（CEO 承認「v1.0 Release Preparation」2026-10-10・AI 実行・公開待機）

### 6-1. version 1.0.0（承認条件 1〜4）

| 項目 | 結果 |
|---|---|
| 1 version 更新 | `package.json` `1.0.0-rc.1 → 1.0.0`・`package-lock.json` の 2 箇所（root と `packages[""]`）・`src/publicFace.test.ts` の期待値。**runtime 差分は version 文字列のみ**（`src/buildInfo.ts` が `__APP_VERSION__` 経由で表示＝Home 右下 `v1.0.0 (<sha>)`） |
| 2 整合性 | `require('package.json').version === package-lock root === packages[""]` ＝ `1.0.0`・`1.0.0-rc.1` の残り 0（tracked・非 docs）。lockfile の依存ツリーは不変（version 以外の差分 0）。private ミラー CI の `npm ci` が lock と package.json の整合を再検証（6-2） |
| 3 最小差分 commit | `ac126e6`「release: version 1.0.0」＝3 files・+5/−5。本 §6 と DECISIONS 行は別 commit（docs-only） |
| 4 ミラー CI | 最終 sha（本 docs commit）を `mirror` へ push → run は報告に記載（GREEN 確認後に待機） |

### 6-2. origin/master との差分（承認条件 5）

- origin/master `641ea5c`（Production 決定267）→ master：**46 commit**（version bump と本 docs を含む）。213 files（+24,317／−108）。内訳：`src` 34 files／`public` 7（OG 画像・icons・manifest・voice MP3）／`index.html` 1（meta）／`.github` 1（ci.yml）／`package.json`・lock／`scripts` 9／`docs` 157
- runtime を変える commit は 13：CM-01 Public Face（`55bbb8a`・`ec102ae`）／RL-01 Save Compatibility Guard（`c7b225b`）／RL-01b otomo.defId guard（`9b83307`・`2bc25ce`）／RL-03 CI＋playwright exact（`39186bf`）／A11y Minimum Pack（`0bff90a`）／Legal・Credits（`4bfff2b`・`7e8e992`・`f2366a6`）／Official Voice（`95125e5`・`e0ea825`）／version（`ac126e6`）。`src/core` の差分は RL-01 の storage version 台帳のみ（engine・rules・カード・敵は不変＝`gameVersion` 不変）
- 公開時に初めて外部に見えるもの：上記 docs 157（evidence 画像・JSON 含む）。資格情報 0（§1 条件 3）

### 6-3. Production Smoke 手順（公開直後・AI 実測＝read-only・CEO 確認は 1 問）

前提：`git push origin master` → Vercel 自動 deploy（Git 連携）→ Dashboard の Deployments に新 deployment（commit = 最終 sha）が **Ready** になってから。URL `https://seven-gods-game.vercel.app/`。

| # | 項目 | 手段 | 合格 |
|---|---|---|---|
| S1 | Home が表示され、右下の version が `v1.0.0 (<最終 sha 7 桁>)`、`<title>`／OGP／favicon が CM-01 のもの | Playwright（`scripts/release-hygiene/screens-smoke.mjs` 相当）＋`curl -I`（200・HTML） | version 一致・console error 0 |
| S2 | Credits 画面：確定文言（C1 2 文目・F3 括弧・S6・A-1「大耀の音声」）が出て「戻る」で Home | `node scripts/legal-credits/acceptance.mjs <out> https://seven-gods-game.vercel.app`（PC・SP375） | 40/40 |
| S3 | 公式ボイス：大耀で開戦 → 入口の終わりに 1 回・ミュート時 0・`/assets/voice/taiyo/greeting.mp3` が 200 | `node scripts/official-voice-pilot/acceptance.mjs <out> https://seven-gods-game.vercel.app` | 4/4 |
| S4 | 通し：Home → 神 → 難易度 → 敵 → デッキ → 戦闘 1 ラウンド → 中断 → 続きから → 決着 → 報酬／神域挑戦 1 回／外部通信・`/api/` 0 | `node scripts/release-audit/qa-flow.mjs <out> https://seven-gods-game.vercel.app`（4 viewport・約 25 分）※短縮時は PC 1508 だけ | external 0・api 0・errors 0 |
| S5 | 旧版セーブ互換：公開前の端末（CEO iPhone・前版で 1 戦した状態）で開いて「続きから」「戦績」「今日の神域挑戦の残り回数」が欠けない | **CEO 実機 1 問**（RL-01：version 不一致の key は無言初期化ではなく保護される） | 欠け 0 |
| S6 | A11y：HP 数字のコントラスト・ミュートの aria・Tutorial の Esc | `node scripts/a11y-minimum-pack/acceptance.mjs <out> https://seven-gods-game.vercel.app` | 72/72 |

S1〜S4・S6 は AI が直列で実測し `docs/evidence/v1-0-production-smoke/` に保存。1 つでも不合格なら 6-4 の rollback を CEO に提案（AI は Production を操作しない）。

### 6-4. Rollback 手順（承認条件 5・**演習は CEO 禁止事項のため未実施**）

| 手順 | 内容 | 誰が |
|---|---|---|
| 0 | 現 Production＝deployment `6894408979`（決定267・commit `641ea5c`）。v1.0 公開後の **rollback 先はこの deployment** | 記録済み（`RELEASE_STATUS.md` A-1） |
| 1 | Vercel Dashboard → Project `seven-gods-game` → Deployments → `6894408979` → **Promote to Production**（Instant Rollback 機能があればそれでも可） | **CEO**（§6-3 #8） |
| 2 | Smoke S1 で version が `v1.0.0-rc.1` 系ではなく**前版の表示（CM-01 以前＝version 表示なし）**に戻ったこと・console 0 を確認 | AI |
| 3 | セーブ互換：v1.0 で作ったセーブを前版で開く → RL-01 は前版に無いため、前版が知らない key（`rewardHistory` 等）は**前版の挙動どおり**（v1.0 → 前版の後方互換は決定267 時点と同じ。`saveVersion` 9 は共通＝進行中バトルは読める） | AI（記録） |
| 4 | 戻した後に再公開する場合は、修正 commit → ミラー CI GREEN → `git push origin master`（新 deployment）。Promote で v1.0 deployment を再指定するだけでも可 | CEO |

所要：Promote 1 回 ≈1 分（Vercel の切替は即時・CDN 反映 ≈数十秒）。演習（Promote 2 回）は CEO の指示があるまで行わない。

### 6-5. Known K36〜K39 の最終確認（承認条件 6）

| Known | 事実（最終確認 2026-10-10） | リリース可否への影響 |
|---|---|---|
| K36 入口 skip でもボイスが鳴る | `OFFICIAL_VOICE_PILOT_V1.md` §5 #3・`BossEntrance` の `onDone` は skip 時も呼ばれる設計。CEO Human QA Q8 3/3 PASS 時に許容。ミュート時は鳴らない（受入 4/4） | **影響なし**（挙動は 1 回・≤12 秒・ミュートで止まる）。改善は post-v1.0（BF-02 系） |
| K37 Credits S6 は AI 追加文 | `creditsText.ts` 30 行目。事実のみ・禁止語 0（契約テスト 54 PASS）。CEO が不要なら 1 行削除 → 再 Gate は `creditsScreen.test.ts`＋legal-credits 受入のみ（Fast Gate） | **影響なし**（削除しても権利表示の要件 Kit §4 は満たす） |
| K38 忠次 Pilot・Card Art Pilot 6 は v1.0 に含まれない | master に `enemy_08`／`shogunate` の参照 0（`git grep` 実測）。Pilot は別 branch `feat/shogunate-pilot-v0.3`・Card Art は docs のみ | **影響なし**（v1.0 の敵 7 体・カード 60 枚は Production と同一データ・`gameVersion` 不変） |
| K39 公開元 repo の CI は Production 公開と同時に初回実行 | ci.yml は origin/master に無い。master push で `push` トリガー → GREEN／RED に関わらず Vercel は deploy 済み。同一 sha はミラーで GREEN 済み | **影響なし**（同一 sha・同一 lockfile・同一 workflow で GREEN 済み。公開元 RED の場合は環境差＝調査のみで Production 判断には使わない） |

結論：K36〜K39 はいずれも **リリース可否に影響しない**（凍結リストへ追加・CEO 承認＝DoD #10）。
