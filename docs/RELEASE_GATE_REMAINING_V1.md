> **状態（2026-10-09・Lane 3・AI 整理）：DoD の状態表と CI 初回実行の安全手順。CI の実行・master の push・Production 反映はいずれも CEO 承認後。本書は何も PASS 扱いにしない。** 
> **2026-10-10 更新：Practical QA v3 ＋ 実機 perf 3 問 ＋ Voice Q8 ＋ A11y Q9 を CEO が実施（A 0／B 0・CEO evidence・初見 0 名・D1 未実施）→ DoD #14／#15／#16 DONE・Voice Human QA PASS（統合 READY）。残項目の優先度順と CEO 判断 4 件は integ master の `docs/PRACTICAL_QA_V3_RESULT.md` §7・§9 を正とする。本書 §A の該当行だけ更新し、§C の CI 手順は不変。**

> **2026-10-10 追記（Lane 1）：RC-2 束ねの残項目三分（CEO 判断待ち／AI 完了可能／完了済み）・credits → voice の統合順序（merge-tree conflict 0・重複 0 実測）・CI 初回実行の安全条件 C1〜C8（UNVERIFIED 2 件＝Vercel Preview 設定・repo 可視性）は `docs/RC2_INTEGRATION_PLAN_V1.md`。Legal 文言の確定候補全文は `docs/LEGAL_CREDITS_SCREEN_V1.md` §2-2。本書 §C の手順は不変。**

# v1.0.0 Release Gate — 残作業と CI 初回実行の安全手順（read-only 調査・2026-10-09）

- 対象：`C:\Users\kimi1\SevenGodsGame-integ`（master `021795b`）。origin/master＝`641ea5c`（Production HEAD・`RELEASE_STATUS.md:12`）。**master は origin より 22 commit 先行・origin 側の新規 0**（`git rev-list --count`）。
- BEFORE RELEASE 3 Lane の docs（`SP_PERF_EVIDENCE_V1`／`PRACTICAL_QA_V3_DESIGN`／`LEGAL_CREDITS_DRAFT_V1`）は **integ master に merge 済み**（`021795b`）。`SevenGodsGame-rl01` は `feat/legal-credits-screen-v1` だが master と同一（独自 commit 0・tracked 変更 0）＝Legal 画面の実装は**未着手**。
- remote：`origin = https://github.com/SevenGodsProject/SevenGodsGame.git`（GitHub）。**repo が public か private かはローカルでは判定不能**（`gh repo view --json isPrivate` の read-only 照会で判る。本調査では未実行）。`gh` 2.97.0 が `SevenGodsProject` で認証済み（scope に `repo`／`workflow` あり）。
- 本書は編集 0・npm／git 書き込み 0 で作成。PASS と書いた項目は全て file／commit の根拠付き。

## A. DoD 18 項目の状態（ROADMAP §7）

状態の語：**DONE/master**＝integ master に統合済み（origin・Production 未反映）／**DONE/Prod**＝Production でも成立／**PARTIAL**／**NOT STARTED**／**CEO ONLY**＝CEO にしかできない工程を含む

| # | 項目 | ID | 状態 | 根拠 | 残作業（1 行） |
|---|---|---|---|---|---|
| 1 | Primary Fun critical 設問 NO 0 | — | DONE/Prod（維持） | `RELEASE_STATUS.md:17` Commercial RC GO 2026-10-03・**2026-10-10 Practical QA v3 Q1・Q3 CEO YES（`PRACTICAL_QA_V3_RESULT.md` §3：A 0／B 0）** | なし（初見プレイヤー evidence 0 は Known 候補） |
| 2 | 全到達可能・determinism 機械検査 | — | DONE/Prod | `RELEASE_STATUS.md:16` 決定267 Gate（vitest 1,330・parity）。master は 1,404 PASS（`889d8e8`） | v1.0 Release Gate（§4 #1）で clean RC から再実行 |
| 3 | 決定263 が LIVE or NO-GO で記録済み | CF-01 | DONE/Prod | DECISIONS 2026-10-07 NO-GO 行・commit `26a3171`・`RELEASE_STATUS.md:19` | なし |
| 4 | 閉じたレバーを再開していない | — | DONE（維持） | `RELEASE_STATUS.md` A-3・`PRACTICAL_QA_V3_DESIGN.md` §6「再開しない」 | なし（監視のみ） |
| 5 | OGP／description／favicon／version 表示が **Production** で確認できる | CM-01 | DONE/master・**Production 未反映** | `ec102ae`（決定268 `DECISIONS.md:510`）・`public/og-image.jpg`・`src/buildInfo.ts`・`publicFace.test.ts` | Production 反映（★#8）後に CEO が挑戦状 URL のカード表示を目視 — **CEO ONLY（公開）** |
| 6 | 著作権・クレジット・プライバシー・問い合わせ先が **承認文言**で表示 | CM-02／03 | PARTIAL（起草のみ） | `LEGAL_CREDITS_DRAFT_V1.md:1`「文言は未確定・CEO 確認待ち」§6 9 件・§5 問い合わせ先空欄。実装 branch は master と同一（commit 0） | CEO 文言確定（★#5）→ AI が静的 1 画面＋契約テスト（§7）→ Production — **CEO ONLY（文言）** |
| 7 | 権利台帳 全行 Status・UNKNOWN の扱い記録 | CM-04 | DONE/master（docs・未 push） | `ASSET_RIGHTS_LEDGER.md` §7（`5f881d8`）KNOWN 29／UNKNOWN-ACCEPTED 56／CONDITIONAL 1／BLOCKED 0・`RELEASE_STATUS.md:44` K13 | CM-02 文言で「UNKNOWN＝権利確認済みではない」を守るだけ |
| 8 | 課金・広告コード 0 | P14 | DONE/Prod | `MASTER_BACKLOG_AUDIT.md:203` CM-09 DROP・:200 analytics 0・`scripts/release-audit/ranking-absence.mjs` | v1.0 Gate で `ranking-absence.mjs` 17 項目を再実行 |
| 9 | storage version ポリシー＋旧／future 読込テスト（機械証明） | RL-01 | DONE/master | `c7b225b`（決定269 `DECISIONS.md:511`）・`STORAGE_VERSION_POLICY.md` §1 Key Registry 13 key（DoD 文言「14」は数え方差・battleSave 含む）・`storageCompat.test.ts`・RL-01b `2bc25ce` | Production 反映後、Rollback 演習（#11）で「新→旧→新」実機確認 |
| 10 | RELEASE_STATUS が Production HEAD と一致・生存 Known が CEO 承認 | RL-02 前半 | PARTIAL | `RELEASE_STATUS.md:12` `641ea5c` 一致（2026-10-07 完了）。A-4 は現行 Known。**v1.0.0 時点の凍結承認（§4 #3）は未** | v1.0 直前に A-4 を再集計 → **CEO ONLY（凍結承認）** |
| 11 | Rollback 演習 1 回の記録 | RL-02 後半 | NOT STARTED | `RELEASE_SAFETY_PREFLIGHT.md` §3 計画のみ・`RELEASE_STATUS.md:14`「演習は未実施」・rollback 先 `6859615239` | Vercel Promote 2 回（★#8）＋AI Smoke → `docs/evidence/release-safety/rollback-drill.md` — **CEO ONLY（Promote）** |
| 12 | CI（tsc／oxlint／vitest）が PR で自動実行 | RL-03 | DONE/master（定義のみ）・**未実行** | `.github/workflows/ci.yml`（`39186bf`→`d7003fd`）・決定270 `DECISIONS.md:512`「CI 未実行（GREEN とは記録しない）」・ROADMAP §9 (3) | §C の手順で GREEN 1 回 — **CEO ONLY（origin push 承認）** |
| 13 | main repo＝master・worktree ACTIVE のみ・docs branch が origin に存在 | TD-01／02・RL-07 | PARTIAL | TD-01 **未**：main repo は `feat/d224` で dirty 1,882 entries（`git status`・A-5「触らない」）／TD-02 73→16 完了（現 20＝`.claude/worktrees/agent-*` 6 本が増加）／RL-07 固有 docs 4 本は `d8f9e95` で master へ（branch push 0 本で足りる）が **master 未 push＝origin に無い** | TD-01 patch 救出（AI・push 不要）＋ master push（**CEO ONLY**） |
| 14 | a11y 基準文書が存在し全項目 PASS | A11Y-01／02 | **DONE/master（CEO Human QA PASS 2026-10-10）** | `b04cc42`（決定271）・`A11Y_MINIMUM_PACK_V1.md` §2 Playwright 70/70・**Q9 YES「HP 数字が読みやすく pill も邪魔ではない」（`PRACTICAL_QA_V3_RESULT.md` §1）** | なし（pill α 再調整不要） |
| 15 | SP 実機 perf evidence 1 セット | PF-01 | **DONE/master（エミュレーション＋実機 2026-10-10）** | `SP_PERF_EVIDENCE_V1.md` §3 エミュレーション＋**§4-1 実機 P1〜P3 YES**（機種・iOS 版は未記録） | なし |
| 16 | 「2 戦目の壁」「託宣温存／導き」「別構成で勝ち方」Human QA 各 1 回 | UX-01／CF-03／RP-02 | **DONE（CEO 1 回ずつ 2026-10-10）** | `PRACTICAL_QA_V3_RESULT.md` §1 Q2／Q5／Q7 YES（導きの使用有無・初見プレイヤーは未記録＝K21 未観測のまま） | なし（初見 QA は v1.0 後） |
| 17 | 敵アート／SE 実音源／Voice の GO か NO が記録 | AR-01／BF-01／02 | PARTIAL（Voice のみ） | **Voice：Human QA Q8 3／3 PASS（2026-10-10）＝統合 READY・merge は CEO 承認**（`PRACTICAL_QA_V3_RESULT.md` §5）。敵アート／SE 実音源：GO／NO 行なし | AI 推奨「v1.0 は現状のまま（K07／K31）」を Known 凍結承認に含める → **CEO ONLY（承認／拒否）** |
| 18 | `package.json` 1.0.0・tag `v1.0.0`・「正式公開」行・公開投稿 | — | NOT STARTED | `package.json:4` `1.0.0-rc.1`・`git tag` 0 本 | version bump＋行は AI、tag／公開／投稿は **CEO ONLY（#8）** |

集計：DONE/Prod 5（#1〜4・#8）／DONE/master 5（#5・#7・#9・#12 定義・#14 自動）／PARTIAL 4（#6・#10・#13・#15）／NOT STARTED 4（#11・#16・#17・#18）。

**2026-10-10 再集計**：DONE/Prod 5（#1〜4・#8）／DONE/master 7（#5・#7・#9・#12 定義・#14・#15・#16）／PARTIAL 4（#6・#10・#13・#17）／NOT STARTED 2（#11・#18）。**CEO にしかできない工程を含む：#5・#6・#10・#11・#12・#13・#14・#15・#16・#17・#18（11 項目）**。

## B. 未 push commit 一覧（`git log origin/master..master`・22 件・新しい順）

| commit | 内容 | 種別 |
|---|---|---|
| `021795b` | merge: feat/before-release-lanes-v1 | docs＋scripts（Kit Guidelines 更新含む） |
| `b9ab8f9` | Legal／Credits 表記案 v1＋Practical QA v3 設計 | docs-only |
| `1804f50` | PF-01 SP perf evidence v1（`scripts/sp-perf/emulated.mjs`） | scripts＋evidence（src／public 0） |
| `889d8e8` | 決定271 候補 行 | docs-only |
| **`b04cc42`** | merge: feat/a11y-minimum-pack-v1 | **runtime**（A11y） |
| **`0bff90a`** | A11y Minimum Pack v1 実体（HpBar・TutorialOverlay・contrast.ts・css） | **runtime** |
| `32e66c1` | 決定270 候補 行 | docs-only |
| `d8f9e95` | RL-07 固有 docs 4 本取り込み | docs-only |
| **`2bc25ce`** | merge: feat/rl01b-otomo-defid-guard | **runtime**（RL-01b） |
| **`d7003fd`** | merge: feat/release-safety-v1 | **runtime 周辺**（ci.yml・package.json・lockfile・migration.mjs） |
| `3d97695` | Preflight 文書修復 | docs-only |
| **`9b83307`** | RL-01b 実体（`otomoLookup.ts`・HomeScreen Resume 条件） | **runtime** |
| **`39186bf`** | Release Safety 実体（`.github/workflows/ci.yml`・playwright 1.63.0 exact） | **runtime 周辺** |
| `3884398` | 決定269 候補 行 | docs-only |
| **`c7b225b`** | RL-01 Save Compatibility Guard（hooks 8 key・storageGuard.ts） | **runtime** |
| `7a99e87` | 決定268 候補 行 | docs-only |
| **`ec102ae`** | CM-01 v2（og-image.jpg 1200×630・index.html） | **runtime** |
| **`55bbb8a`** | CM-01 v1（meta／OGP／favicon／manifest／version 表示・`vite.config.ts`） | **runtime** |
| `6c8b226` | Kit v1.1 活用監査 | docs-only |
| `26a3171` | 決定263 CLOSED | docs-only |
| `b8fc6a4` | External Human Evidence | docs-only |
| `5f881d8` | Rights Ledger B 承認反映 | docs-only |

- runtime 差分の実測（`git diff --stat origin/master..master -- src public index.html package.json .github scripts vite.config.ts`）：**42 files・+1,579／−71**。`src/core` 差分 0（各 Decision 行で確認済み）。
- 含意：**master を push した瞬間に ci.yml の `push: branches: [master]` が走り、Vercel の Git 連携が master を Production に自動 deploy する**（A-5 の Release 手順どおり）。したがって「CI だけ先に動かす」には master を push しない別経路（§C）が必要。

## C. CI 初回実行の安全手順（CEO 承認後に AI が実行・**master は push しない**）

前提：ci.yml は `pull_request → master`／`push → master`／`workflow_dispatch`・`permissions: contents: read`・**secrets 参照 0**（`cat` で確認）・Node 24（ローカルも v24.18.1）・`npm ci` → `tsc -b` → `oxlint` → `vitest run` → `vite build`・Playwright なし。

| 手順 | コマンド／操作（AI） | 確認点 |
|---|---|---|
| 0 | `gh repo view SevenGodsProject/SevenGodsGame --json isPrivate,visibility`（read-only） | **public なら docs 1,927 files／画像等 1,232 files／`art-source` 106 files が branch 経由で外部に見える**ことを CEO に先に伝える（§D） |
| 1 | `git fetch origin` → `git log -1 origin/master` が `641ea5c` のまま・`git status` tracked 0 を再確認 | origin 側に新規 commit があれば中止して報告 |
| 2 | `git branch ci/first-run-2026-10-09 master`（checkout 不要。内容＝master `021795b` と同一・新 commit 0） | `git diff master ci/first-run-2026-10-09 --stat` が空 |
| 3 | `git push -u origin ci/first-run-2026-10-09`（**この branch だけ**。`--all`／`--tags`／master 禁止） | `git branch -r` に出る。origin/master は不変 |
| 4 | `gh pr create --base master --head ci/first-run-2026-10-09 --draft --title "ci: first run (do not merge)" --body "CI 初回実行のみ。merge しない。"`（gh 不可なら Web で Draft PR） | `pull_request` trigger で `ci` が起動。**Draft でも Actions は走る** |
| 5 | `gh run list --workflow=ci.yml --limit 3` → `gh run watch <id>` または Actions タブ | 4 step（tsc／oxlint／vitest／build）の緑と所要時間・run URL |
| 6-GREEN | `RELEASE_STATUS.md` A-1「CI GREEN 1 回・run URL・日付」、ROADMAP §2 #4 を完了、DECISIONS 決定270 行に追記（docs-only commit を master へ・push はしない） | DoD #12 を「GREEN（PR 経由）」に更新 |
| 6-RED | 原因を分類：(a) `npm ci` 依存解決（lockfile と package.json の不整合・playwright 1.63.0 の postinstall はブラウザ DL なし）／(b) Node 24 系差（ローカル 24.18.1 と Actions の 24.x 差）／(c) テストの環境依存（`node:fs` を使う contract test 12 files は repo 内ファイルを読むだけで CI でも動く・`skipIf(!RUN)` の sim 9 件は CI でも skip＝ローカルの「9 skip」と一致するはず）／(d) Playwright 不要（ci.yml に含まれない） | 修正は別 branch・別承認。RED のまま「GREEN」とは記録しない |
| 7 | PR は **merge しない**。`gh pr close <n>` → `git push origin --delete ci/first-run-2026-10-09`（任意・CEO が残置を望めば残す） | origin/master が `641ea5c` のまま |
| 8 | master 本体の push（＝Production deploy＋`push` trigger）は **別承認**（§6-3 #8） | — |

リスク（CEO が承認前に知るべき点）：
- **公開露出**：repo が public なら、branch／PR 経由で Decision 文書・evidence 画像（`docs/evidence` 1,927 files）・`art-source`（CEO 原本画像）が閲覧可能になる。private でも GitHub 上には置かれる。
- **Actions 無料枠**：public repo は無制限、private は 2,000 分／月（Free）。本 run は 15 分 timeout・推定 3〜6 分。
- **secrets**：workflow は secrets を一切参照しない（`permissions: contents: read`）。PR からの fork 攻撃面も無し（自 branch）。
- **Vercel Git 連携**：Vercel が GitHub 連携で **branch push ごとに Preview deployment** を作る設定の可能性あり（`vercel.json`／`.vercel` は repo に無く、ローカルでは判定不能）。Preview は Production ではないが、**Preview URL が外部からアクセス可能になり得る**ため、CEO が Vercel Dashboard の Git 設定（Preview Deployments の有無・Deployment Protection）を**事前に確認**すること。Production（master）には影響しない。
- `concurrency: ci-${{ github.ref }}` により同 branch の再 push は前 run を cancel（想定どおり）。

## D. 本当に CEO が判断すべき事項（§6-3 該当のみ）

| # | 判断 | §6-3 | 関連 DoD |
|---|---|---|---|
| 1 | **CI 初回実行の承認**（`ci/first-run-*` branch 1 本の origin push＋Draft PR。master は押さない）— その前提として repo の public/private と Vercel Preview 設定の確認 | #8 準備 | #12 |
| 2 | **master 22 commit の origin push**（＝Production deploy。CM-01／RL-01／RL-01b／A11y が同時に公開される） | #8 | #5・#9・#13 |
| 3 | **Legal／Credits／Privacy 文言の確定**（`LEGAL_CREDITS_DRAFT_V1.md` §6 の 9 件・問い合わせ先） | #5 | #6 |
| 4 | **Rollback 演習**の Vercel Promote 2 回（Production 操作） | #8 | #11 |
| 5 | **Practical QA v3 1 セッション**＋ A11y Q9 ＋ iPhone perf 3 問（実機は CEO しか持たない） | 実機 | #14・#15・#16 |
| 6 | **敵アート／SE 実音源／Voice の GO・NO**（課金・権利） | #4／#5 | #17 |
| 7 | **v1.0.0 時点の生存 Known 凍結承認**＋ tag `v1.0.0`＋公開宣言投稿 | #8 | #10・#18 |

**2026-10-10 更新**：#5（実機 QA）は完了。#6 のうち Voice は Human QA PASS → 「master 統合の承認」に置き換わる。残る CEO 判断は **4 件**（`PRACTICAL_QA_V3_RESULT.md` §9：①Legal 文言確定 ②Voice 統合 ③CI 初回実行 ④Release 実行＝push・Rollback 演習・Known 凍結（敵アート／SE 現状維持を含む）・tag）。

AI 側で承認なしに進められるもの（参考）：TD-01 main repo の patch 救出（push 0）／Practical QA v3 の事前準備（§7）／AR-01・BF-01／02 の §6-4 1 枚起草／Legal 画面の実装（文言差し替え前提のプレースホルダ＋契約テスト）／RELEASE_STATUS の v1.0 Known 再集計案。
