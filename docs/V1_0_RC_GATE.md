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
