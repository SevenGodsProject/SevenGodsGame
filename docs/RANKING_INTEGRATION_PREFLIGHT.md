# Ranking Integration Preflight — LANE 2（3-Lane Parallel Audit）

- 日付：2026-10-02
- 担当：【Infra】＋【PM】（AI 判断・CLAUDE.md §6-2「QA 方式／GO・NO-GO の技術判断」）
- 種別：**静的調査・docs のみ**。runtime 変更 0・merge 0・cherry-pick 0・push 0・deploy 0・テスト実行 0・ブラウザ自動化 0・Neon／Vercel／環境変数操作 0
- Baseline：Production master = origin/master = `3dd8b5c`（runtime `a611270`、決定254 LIVE）。worktree `C:/Users/kimi1/SevenGodsGame-lane2-ranking`（branch `docs/lane2-ranking-integration-preflight`、`3dd8b5c` 起点）
- 旧枝：`feat/daily-ranking-phase4` = `762168f`（merge-base `489352c`）。**読むだけ**（`git show` / `git diff --stat`）
- 前提文書：`docs/RANKING_V1_AUDIT.md`（2026-09-27、Production `2389d21` 時点の監査）。本書はその結論を **`3dd8b5c` で再検証**し、差分と新規発見を上書きではなく追記する
- 表記規約：【実測】＝本調査のコード読み・git 計測／【docs】＝既存 Decision・監査文書／【AI 判断】／【推測】＝未計測の見立て。`[M] path:line` = `3dd8b5c` の実物、`[B] path:line` = 旧枝 `762168f` の実物
- 証拠：`docs/evidence/ranking-integration-preflight/`（grep 結果・diff --stat・Decision 行抜粋・旧枝ファイルの read-only コピー・`inventory.json`）

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| **判定** | **NO-GO（統合は現時点で着手しない。READY-DORMANT を維持）** |
| 根拠 1 | **TRIGGER 未到達**：`docs/SEVENGODS_NEXT_MILESTONES.md:77-79`「Trigger：Daily 常連の evidence」に対し、evidence は 0・計測基盤も 0。同 `:88` の DO NOT START YET に `whole ranking branch merge` が明記。P9（`SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md:45`）「Ranking は Daily 常連の evidence が出るまで dormant」【docs】 |
| 根拠 2 | **公開前の未解決事項が残る**：Security Blocker B1〜B4（決定152・RANKING_V1_AUDIT §7）は旧枝で未修正のまま【docs・実測：旧枝 HEAD は 2026-09-12 の `762168f` から動いていない】。加えて本調査で **競技適性 Gate の失効**を確認：決定131（Phase 4.0）は G1「神間 best-score spread ≤5%」が **FAIL（7.91%・寿楽）**のまま、その後 決定246／251／252 で敵カーブ・託宣回数・必殺が変わり（`[M]` engine 非テスト 13 ファイル +159/−88）、現行エンジンで **再判定されていない**【実測】 |
| 根拠 3 | **部品は健全で、待つコストが 0**：信頼モデル（申告スコアを型に持たない `[M] src/core/replay/types.ts:41-57`、サーバー再計算 `[B] src/server/ranking/submit.ts` 8 段）は `3dd8b5c` でも成立。replay 基盤は master 既存で、Ranking v1 AUDIT（`2389d21`）以降の drift は replay runtime 0 ファイル・共有 UI は `BattleScreen.tsx` と `rules.ts` の 2 本のみ【実測】。dormant 維持で Production・セーブ・Daily に影響なし |
| Ranking readiness | **READY-DORMANT**：仕様（RANKING_V1_AUDIT §5〜§10）と部品（旧枝 46 ファイル・+8,630 行・server 168 テスト）は揃っている。欠けているのは「公平性の再判定」「Blocker 修正」「人口 evidence」の 3 つで、いずれもコード部品の問題ではない |
| reuse／discard | **KEEP（file-level 移植）**＝`src/server/ranking/*`・`api/*`・`src/core/identity.ts`・`src/core/replay/ranking.ts`・hooks 3 本（`anonymousPlayerId`／`rankingTicketStorage`／`leaderboardClient`）・`docs/PHASE4_*`・`scripts/phase4*`（非配信）。**MODIFY**＝`schema.ts`／`postgresStore.ts`／`api/_lib/env.ts`／`handler.ts`／`rankingClient.ts`／`dailyRanking.ts`。**REBUILD**＝`useGameEngine`・`GameFlow`・`HomeScreen`・`GameOverOverlay`・`DailyRankingPanel` の配線と UI。**DISCARD**＝枝の履歴 59 commit（whole merge 禁止）・枝側の Phase 5／6 UI 差分（master が別実装済み）・master の dead CSS（§3-1）。詳細 §12 |
| fairness design（要点） | 「**同じ問題を解いた者同士だけを並べる**」。固定＝JST 日付（サーバー時刻）・seed・敵・補正 ×1.25/×1.15・難易度 normal・神階 0・報酬ボーナス無効・版（day-lock）。選択・記録・表示＝神。選択・記録のみ＝デッキ・OTOMO 成長路・試行番号。試行＝**3 回・開始時に ticket で消費・best-of-3**（P6 の semantics を変えない）。順位＝同点同順位（1,1,3）・先着無関係・時間は記録も評価もしない。P2W／P2S／有料枠／有料 retry は作らない（P14・NEXT_MILESTONES DO NOT START YET）。詳細 §11 |
| 推奨 NEXT（1 件） | **Daily Competitive Gate の再判定（決定131 ハーネスを現行エンジン `a611270` で再実行）**。旧枝 `[B] scripts/phase4-daily-gate/`（`dailyHarness.ts`・`gate.audit.ts`）を master 起点の docs/scripts-only 枝へ file-level で移し、G1（神間 spread ≤5%）／G2（全神勝率）／best-of-3 vs best-of-N 倍率を再計測する。runtime 変更 0・deploy 0・Lane1 の simulation 完了後（RAM 6GB）に実行。結果が G1 FAIL なら Ranking 以前に **Daily のバランス課題**として Lane1／Planner へ渡す。TRIGGER 到達の有無に関係なく価値がある（Daily そのものの公平性の確認）【AI 判断】 |
| CEO 判断が必要な事項 | **現時点ではなし**（統合に着手しないため §6-3 のいずれにも触れない）。将来 Stage 到達時に必要になる 8 件は RANKING_V1_AUDIT §8 のまま有効（Neon Free／Vercel Hobby 規約 #5・#6、匿名 identity とプライバシー表記 #7、自由入力名 #7、各 Stage の本番反映 #8、本番 DB のテスト行削除・Preview 用 branch #9、WAF、日次 salt #1、称号課金 #4）。§15 に §6-4 形式の雛形を置く |

---

## 1. 調査方法

| 手段 | 対象 | 証拠ファイル |
|---|---|---|
| `grep -rniE "ranking\|leaderboard\|\brank\b"` | `[M] src/`（ts/tsx/css） | `01_production_src_grep_ranking.txt`（97 行） |
| `ls api/`・`cat vercel.json`・`ls -a \| grep env`・`grep import.meta.env\|VITE_` | `[M]` ルート・`src/` | §2-1（api 無・vercel.json 無・.env 無・`import.meta.env` 0 件） |
| `git branch -a`・`git log --all --grep` | 枝の所在・履歴 | §2-2 |
| `git merge-base`・`git rev-list --count`・`git diff --stat 3dd8b5c..762168f -- <ranking paths>` | 旧枝の規模と分岐 | `02_*`・`03_*`・`09_*` |
| `git show 85c94ee --stat` | 決定171 の除外範囲 | `04_decision171_removal_commit.txt` |
| `grep -n "Ranking\|ランキング" docs/DECISIONS.md` | 75 行ヒット・主要 10 行を抜粋 | `05_*`・`05b_*`・`06_*` |
| `git diff 2389d21..3dd8b5c --stat -- src/core src/hooks` ほか | Ranking v1 AUDIT 以降の drift | `07_*`・`08_*` |
| `git show 762168f:<path>` | 旧枝の中核 9 ファイルを read-only で複写 | `phase4-branch-readonly/` |
| コード読み | `rules.ts`・`score.ts`・`stakes.ts`・`dailyBoss.ts`・`dailyStart.ts`・`createInitialState.ts`・`replay/*`・`useGameEngine.ts`・`dailyStorage.ts`・`retrySemantics.ts`・`ranking-absence.mjs` | `10_*`・`11_*` |

実行していないもの：vitest／npm test／build／Playwright／Chrome／Neon／Vercel／環境変数の読み書き。したがって「現行の `gameVersion` 文字列」「現行エンジンでの神間 spread」などの**計測値は本書に無い**（必要箇所は【推測】と明記）。

---

## 2. インベントリ

### 2-1. Production `3dd8b5c` に残っている Ranking 関連【実測】

| 種別 | 実物 | 状態 |
|---|---|---|
| 調整値 | `[M] src/core/data/rules.ts:253-328` `RULES.ranking`：`submissionEnabled: false`（:260）・`leaderboardLimit 100`（:262）・`leaderboardTopCount 10`（:269）・`leaderboardTimeoutMs 6000`（:275）・`ticketTtlMinutes 90`・`dayEndGraceMinutes 15`・`maxBodyBytes 65536`・`leaderboardCacheSeconds 15`・`pruneEveryStarts 16`・`playerSecretLength 64`・`engineVersion 1`（:316）・`maxSubmitAttemptsPerDay 30`・`playerIdLength 32` | 残置（kill switch false）。エンジンは参照しない（:250-251 コメント） |
| replay 基盤 | `[M] src/core/replay/{types,replay,runLog,resume,gameVersion,index}.ts` ＋ テスト 8 本（`actionDistribution`・`actionLog`・`determinism`・`gameVersion`・`replay`・`replayBoundary`・`resume`・`replayTestUtils`） | **稼働中**（Daily の行動ログ記録に使用） |
| 記録配線 | `[M] src/hooks/useGameEngine.ts:23-26`（import）・`:228-229`（決着時 `enqueuePendingRun`）・`:268`（`applyAndRecord`）・`:360-364`（`createClientRunId`）、`[M] src/hooks/pendingRunStorage.ts:29-32`（key `sevengods.pendingRuns`・`PENDING_RUNS_VERSION = 1`）、`clientRunId.ts`、`dailyRunLogStorage.ts` | 稼働中・**送信はしない**（送信先コード 0） |
| 版 | `[M] src/core/replay/gameVersion.ts` `getGameVersion() = "<engineVersion>.<dataFingerprint>"`、golden test `[M] gameVersion.test.ts:196-235`（GOLDEN `1.6c581e56a02c0730` :97） | 稼働中 |
| UI 残骸（dead CSS） | `[M] src/components/battle/battle.css:4371-4409`（`.game-over-daily-rank`・`.game-over-rank-link`・`.game-over-rank-note`）、`[M] src/components/setup/daily.css:321-539`（`.daily-ranking-*` 34 行） | **TSX からの参照 0**（`grep game-over-rank\|onOpenRanking\|daily-ranking` → tsx 0 件）。配信 CSS に残る dead code |
| 文言方針 | `[M] src/components/setup/DailyChallengeScreen.tsx:33`「『ランキング』の語はオンライン実装まで使わない」 | 画面に「ランキング」の語は無い |
| Release Gate | `[M] scripts/release-audit/ranking-absence.mjs`（17 項目：api/・src/server・tsconfig.api.json・ranking hooks・PHASE4 docs・*.sql・Neon 依存・lockfile・fetch 呼び出し・`/api/` 文字列・`RANKING_*` env・`submissionEnabled === false`・dist 検査） | 稼働中（決定172 以降の全 Release Gate で PASS） |
| `.vercelignore` | `[M] .vercelignore`（Phase 4.8 由来。`*.test.ts`・`docs/`・`art-source/` 等を配信除外） | 残置・無害 |
| 無いもの | `api/`・`vercel.json`・tracked `.env*`・`import.meta.env`／`VITE_*`（src 0 件）・`@neondatabase/serverless`／`@electric-sql/pglite`（`package.json` deps は phaser／react／react-dom のみ）・`src/server/`・`tsconfig.api.json` | 決定171（`85c94ee`）で path 単位除外 |

「rank」ヒットの大半は **神階（stakes）・脅威度★（`EnemyDef.rank`）・絆ランク（OTOMO）・Mastery の next-rank** であり Ranking とは無関係（`01_production_src_grep_ranking.txt` 参照）。

### 2-2. Phase 4 dormant Ranking（旧枝 `feat/daily-ranking-phase4`）【実測】

| 事実 | 値 |
|---|---|
| HEAD | `762168f`（2026-09-12、決定170 Release Hygiene Gate） |
| merge-base with master | `489352c` |
| master-only / branch-only commits | **75 / 59**（Ranking v1 AUDIT 時点 48/59 → master 側がさらに 27 commit 進んだ） |
| Ranking 専用ファイル（master に無い） | **46 ファイル／+8,630 行**（`02_phase4_branch_ranking_diffstat.txt`）：`api/` 8・`src/server/ranking/` 25・hooks 8・`core/identity.ts`・`core/replay/ranking{,.test}.ts`・`components/setup/dailyRanking{,.test}.ts`・`tsconfig.api.json`・`package.json` +2 |
| docs | `docs/PHASE4_*` 12 本（`PHASE4_5_PSF_GATE`・`PHASE4_6_PSF_IMPLEMENTATION`・`PHASE4_7_DB_MIGRATION_GATE`・`PHASE4_8_*` 2・`PHASE4_9_LEADERBOARD_UI`・`PHASE4_10_PRODUCTION_RELEASE_GATE`・`PHASE4_DAILY_*` 3・`PHASE4_NEON_DB_VALIDATION`・`PHASE4_RANKING_BACKEND`） |
| scripts | `scripts/phase4-daily-gate/`（決定131 ハーネス）・`phase47-migration/`（SQL・RUNBOOK・ROLLBACK・pglite dry run）・`phase48-api/preview-qa.mjs`・`phase49-ui/` |
| 依存 | `@neondatabase/serverless ^1.1.0`（dependencies）・`@electric-sql/pglite ^0.5.8`（dev） |
| 環境変数（名前のみ） | `RANKING_API_ENABLED`・`RANKING_DATABASE_URL`・`RANKING_PREVIEW_UNLOCK`・`VERCEL_ENV`（`[B] api/_lib/env.ts:13-27, 74-79`） |
| 決定171 で除外した経路 | `api/`・`src/server/`・`tsconfig.api.json`・ranking hooks 5・`DailyRankingPanel`+`dailyRanking`・`core/replay/ranking.ts`・`core/identity.ts`・`docs/PHASE4_*`・`scripts/phase4*`・Neon/pglite 依存。手で切断 9 箇所（`useGameEngine` ticket 配線・`GameFlow prepareDailyStart/onOpenRanking`・`DailyChallengeScreen` パネル・`GameOverOverlay` ランキング節・`BattleScreen onOpenRanking`・`replay/index` の rank export・`tsconfig.json` api 参照・`.vercelignore`）（`04_decision171_removal_commit.txt`） |
| Phase 4.10 Gate | **NO-GO**（G2 kill switch FAIL・G4 セキュリティ FAIL 1 件、`[B] docs/PHASE4_10_PRODUCTION_RELEASE_GATE.md` §0） |

### 2-3. Decision 履歴（`docs/DECISIONS.md`）【docs】

Ranking 関連 75 行。要点（行番号は `DECISIONS.md` の物理行）：

| 行 | Decision | 要点 |
|---|---|---|
| 122 | §3-2 後回し | 「ランキング・アカウント｜やらない｜サーバー導入時」 |
| 293 | 決定131 Phase 4.0 | 競技適性 Gate：G2 PASS（7 神勝率 100%）／**G1 FAIL（spread 7.91%・寿楽）**。神差は combo と tempo だけで決まる |
| 294 | 決定132 Phase 4.1 | Daily 公平化（bonusCopies 型ごと削除）＋ replay 基盤 |
| 296 | 決定134 Phase 4.3 | Backend を契約なしで完成。クライアントが送れるのは `playerId`／`clientRunId`／`ReplayInput` の 3 つだけ |
| 301 | 決定139 Phase 4.5 | best-of-300 は best-of-3 の **1.475〜2.261 倍**（2,100 試合）→ 提出回数制限では公平性が成立しない → run ticket |
| 302 | 決定140 Phase 4.6 | client-held secret・ticket・day-lock を実装 |
| 305-306 | 決定143／144 Phase 4.8 | Vercel Functions・env 門番 3 枚・`.js` 拡張子問題 |
| 310 | 決定148 Phase 4.9 | Leaderboard UI（Daily 画面 `daily-facts` 直後） |
| 314 | 決定152 Phase 4.10 | **NO-GO**：B1 決着時 `flushPendingRuns` 未呼び出し／B2 submit だけ閉じる env 無し |
| 332-333 | 決定171／172 | Clean RC（ranking 除外）→ Production LIVE（`de039d8`） |
| 427 | Ranking v1 AUDIT | 推奨 v1.0＝Daily 1 面・サーバー検証済み・匿名 secret＋称号・TOP3 表彰台。Blocker B1〜B4。TRIGGER 到達前は Stage 0 も着手しない |

---

## 3. 論点 1：Production に残る Ranking／score 送信コード

- **送信コードは 0**【実測】：`src/` に `fetch(`・`/api/` 文字列・`RANKING_*`・`VITE_*` は無い（`ranking-absence.mjs` 17 項目が Release Gate で機械検査。決定172 以降毎回 PASS【docs】）。
- **残っているのは「記録」まで**：`applyAndRecord`→`DailyRunLog`→決着時 `enqueuePendingRun`（`[M] useGameEngine.ts:228-229`）→ `localStorage sevengods.pendingRuns`（上限 20 件・7 日）。送信先が無いので控えは剪定で消える。
- **feature flag**：`RULES.ranking.submissionEnabled=false`（クライアント定数）。環境変数・`import.meta.env` による切替は **存在しない**（0 件）。
- **dead CSS**（§2-1）：`battle.css` 4 ルール・`daily.css` 34 行。害は配信サイズのみ【実測】。Stage 0 着手時に「捨てる」か「再利用する」かを決める（§12 #20）。

## 4. 論点 2：backend／data persistence

| 項目 | 実物 | 状態 |
|---|---|---|
| DB | Neon Postgres（HTTP ドライバ）。schema 4 表 `players`／`daily_days`／`daily_tickets`／`daily_runs`（`[B] src/server/ranking/schema.ts:58-131`、DDL は `RULES` から生成） | Phase 4.6 schema は **本番 Neon に適用済み**（決定142・CEO 承認）。Preview QA のテスト行が本番表に残る（B3）【docs】 |
| 保存形式 | 計算値のみ（score/win/round/rng_cursor/action_count/god_id/attempt_no/game_version）。**行動ログ本体・秘密・氏名・メール・IP・端末情報の列は無い**（`[B] schema.ts:19-21`、`concurrency.test.ts` が禁止列を検査） | 健全。ただし再検証・異議申立てができない（S6 → `replay_input jsonb` 7 日保持を MODIFY） |
| `version` | `daily_days.game_version`（day-lock）・`daily_tickets.game_version`・`daily_runs.game_version`。クライアント側は `pendingRuns` v1・`rankingTicket`・`playerSecret` が独自 key＋version。**セーブデータ `saveVersion` は変えない** | 不変ルール 5 を満たす |
| 現 Production | **サーバー・DB・KV・環境変数のいずれも Production コードから参照されない**【実測】 | dormant |

## 5. 論点 3：account dependency

- **アカウントは無い**。端末 256bit 秘密（`sevengods.playerSecret`）→ 公開 ID = SHA-256 先頭 32hex（`[B] src/core/identity.ts:1-30, 46-54`）。サーバーは秘密を保存しない（照合して捨てる。定数時間比較）。
- 個人情報：氏名・メール・端末情報は扱わない。表示名は `プレイヤー XXXX`（先頭 4hex）。Vercel request log に IP が残る点はプライバシー表記に要記載（4.10 §4-2）【docs】。
- Sybil（identity 量産）は**アプリ層で塞がない**設計（`[B] identity.ts:16-19`）。緩和は edge rate limit（WAF）＝ CEO 操作（B4）。
- 端末を跨ぐ復元（アカウント連携）・自由入力ニックネームは v1.1 以降・CEO 判断（§6-3 #7）。

## 6. 論点 4：score semantics と North Star

【実測】`[M] src/core/data/rules.ts:118-140`・`[M] src/core/engine/score.ts:17-18`・`[M] src/core/data/stakes.ts:146-149`：

```
表示スコア = round( (perDamage 1.2 × 実効ダメージ
                    + comboSteps [12,8,4]（5 枚目以降 +3）
                    + 勝利時 victoryBase 300 + tempoByRound[撃破R−1] ([290,290,290,240,170,90,0])
                    + 勝利時 survivalMax 30 × 残HP率
                    + 勝利時 difficultyBonus {easy −20, normal 0, hard +30})
                  × finalScale 1.3 × stakeScoreScale(神階) (= 1 + 0.08×段) )
```

Daily では `difficulty: 'normal'`（`[M] dailyStart.ts:35`）・神階は渡さない（replay は stake 無し＝×1.0）・補正は敵 HP ×1.25／攻撃 ×1.15（`[M] rules.ts:212`）・**Daily 用スコア倍率は付けない**（`[M] rules.ts:204-206`「★スコア倍率は過剰で farm 化するため DROP」）。

**North Star（`SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md:12`「敵の意図を読み、神・OTOMO・カードを組み合わせて攻略の答えを見つけ、その答えが鮮やかに決まったときがうれしい」）に照らした妥当性**【AI 判断】：

| 項 | 評価 |
|---|---|
| 「読む」が報われるか | **部分的に**。予告を読んで正しくブロック→生存（survival ≤30）→早期撃破（tempo 最大 290）→勝利 300 で報われる。ただし tempo と combo（1R に何枚出すか）の寄与が大きく、決定131 の因子分解では「全神が damage 145.4・victory 300 で揃い、**神差は combo と tempo だけ**」【docs】 |
| 「組む」が報われるか | **はい**。神・デッキ・OTOMO 成長路は選択可能で `ReplayInput` に入り検証される（`[M] types.ts:48-51`）。神は表示する（§11） |
| グラインドが報われないか | **ticket 3 枠が前提**。枠が無ければ best-of-300 で 1.5〜2.3 倍（決定139）＝「暇な人」が勝つボードになる |
| 時間が評価されるか | **されない**（経過時間の項目 0。§10）。「時間をかけられる人が有利」は同点同順位で吸収する（決定244 §9 と同じ結論） |
| 難易度係数 | Daily は normal 固定・神階 0 固定なので係数差は無い。通常戦（×1.3 finalScale は共通、神階 ×(1+0.08×段)、`?seed=`・同 seed 再戦）は比較不能 → **通常戦ボードは作らない**（RANKING_V1_AUDIT §5-1 を維持） |

**結論**：Daily best-of-3 の表示スコアを競うこと自体は North Star と矛盾しない。ただし「**神を選んだ時点で上限が決まる**」なら「組む」が死ぬ。決定131 G1（spread 7.91%・基準 5%）は FAIL のまま決定246（託宣 3 回・峰 R4）・251（late surge R6）・252（必殺）を経ており、**現行エンジンで再計測するまで「競技として公平」とは言えない**（§0 推奨 NEXT）。

## 7. 論点 5：Daily との関係

【実測】`[M] src/core/data/rules.ts:209-215`・`[M] src/core/data/dailyBoss.ts`：

| 条件 | 実装 | Ranking への含意 |
|---|---|---|
| 日付 | JST 固定（`timezoneOffsetMinutes 540`、`dailyKeyOf(now)` :42-45。`new Date()` は引数で受ける） | クライアントは `dailyClock.ts:11` の端末時計で `dailyKey` を決める → **オフラインでは端末時計が「今日」を決める**。Ranking ではサーバー時刻の `dailyKey`（`[B] start.ts:95-96`）で上書きし、不一致は ticket 無しとして拒否 |
| 敵 | 週次シャッフル巡回（`weekKeyOf` :56-66 月曜起点、`weeklyBossOrder` :69-71、7 体が週 1 回ずつ） | 「同じ問題」の根拠。週間集計（Best 3 of 7）は `weekKey` で派生可能 |
| seed | `daily-${dateKey}-${enemyId}`（:87）→ `seedId` 6 桁（:74-82） | **公開・事前計算可能**（S5：solver はオフラインで翌日の問題を解ける。v1 は受容＋監視） |
| 3 回 | `attemptsPerDay: 3`。**クライアント localStorage のみで数える**（`[M] src/hooks/dailyStorage.ts:120-128`、`useGameEngine.ts:345`） | localStorage を消せば無限に遊べる → Ranking では ticket（サーバー）が最終権限。クライアント側の 3 回は UI の案内として残す |
| best-of-3 | `dailyStorage.ts:150-159`（`bestScore`・`bestByGod`） | サーバー側は `daily_runs` から 1 人 1 行（その日のベスト）→ `assignRanks` |
| modifier | `{enemyHpMul 1.25, enemyAtkMul 1.15}`（:212）。`dailyFairness.test.ts:202` で不変を固定 | 全員同一。`dataFingerprint` に含まれる（変えれば版が変わる） |
| 報酬ボーナス | Daily は型ごと不使用（決定132）。`dailyFairness.test.ts:126-166` | 「購入優位」の経路が構造的に無い |
| Retry | `[M] src/components/battle/retrySemantics.ts:19-22`「神域挑戦は既存経路のまま。seed の意味論に触れない」 | 決定196 の同 seed 再戦は通常戦の敗北時のみ。Daily は 3 枠＝同 seed 3 回 |

## 8. 論点 6：deterministic seed・リプレイ・検証

- **決定論**【実測】：`[M] src/core/engine/createInitialState.ts:21` `createRng(action.seed, 0)`、`:56-57` `seed`／`rngCursor` を state に保持、`:134` `rngCursor: rng.callCount()`。core に `Math.random`／`Date.now`／`performance.now` は **0 件**（`replayBoundary.test.ts:136` が機械検査、`10_nondeterminism_tamper_time_grep.txt`）。
- **`Date.now` は seed 生成のみ**【実測】：`[M] useGameEngine.ts:317` `resolveForcedSeed() ?? requestedSeed ?? \`seed-${Date.now()}\``（**通常戦のみ**）。Daily は `:369-372` で `resolveDailyStart(dailyKey)` の seed を使い `Date.now` を通らない。
- **同 seed 再現**【docs・実測】：`[M] src/core/engine/sameSeedRetry.test.ts:72-104`（決定196）「同じ seed・同じ構成なら開始直後の GameState が完全一致」「7 神×7 敵で同じ初期手札・山札」「敵の予告列は seed に依存しない」。
- **行動列から再計算できるか**：**できる**。`[M] src/core/replay/replay.ts`（`runReplay`）は `resolveDailyStart(dailyKey)` で seed・敵・補正を再導出 → `validateDeck` → Action 種別検査 → `applyAction` を全 Action に適用 → 決着必須 → `getFinalScore` を**サーバー側で計算**。`ReplayInput`（`[M] types.ts:41-57`）に score／HP／勝敗／rngCursor の**フィールドが無い**（「型にフィールドが存在しないこと自体が実装」）。
- **改ざん検出テスト**【実測】：`[M] replay.test.ts:309-389`（card uid 改ざん／enemy・seed 改ざん／deck 改ざんは「拒否」か「別の正規結果」）、`[M] resume.test.ts:152`（盤面と食い違うログは捨てる）。
- **版**：`getGameVersion()` = `engineVersion.dataFingerprint`（FNV-1a 16hex）。`RULES.ranking`・`RULES.replay.pendingRuns` は指紋から除外（運用つまみで版が変わらない）。`engineVersion` は **1 のまま一度も上がっていない**（`git log -S"engineVersion: "` は `85c94ee` のみ【実測】）。ただし 489352c 以降の engine 変更 13 ファイルはすべてデータ変更（rules／cards／enemies／divination）を伴い `dataFingerprint` が変わるため day-lock は機能する。golden test（`gameVersion.test.ts:202-235`）は「結果が変わったのに版が同じ」だけを検出する設計で、現行版 ≠ GOLDEN（`1.6c581e56a02c0730`）の間は第 3 テストが早期 return する【実測】。**Stage 0 着手時に GOLDEN を現行版で取り直す**（§12 #21）。

## 9. 論点 7：同点・difficulty・神階・retry・3 attempts

| 項 | 現状 | Ranking v1 での扱い |
|---|---|---|
| 同点 | `[B] src/core/replay/ranking.ts:49-86` `assignRanks`：スコア降順の安定ソート、同点同順位、次順位は人数ぶん飛ぶ（**1,1,3**）、`tiedCount`・`topPercent`・`pointsToNextRank` を返す。先着は順位に無関係 | 維持（決定133） |
| difficulty | Daily は normal 固定。通常戦は easy/normal/hard（`difficultyBonus −20/0/+30`） | Daily のみ対象 |
| 神階 | `stakeScoreScale ×(1+0.08×段)`、Ⅰ〜Ⅶ（`stakes.ts`）。Daily は 0 固定 | Daily のみ対象。「神階なし」注記 1 回 |
| retry | 通常戦の敗北時のみ同 seed（決定196）。Daily は 3 枠 | ticket：**開始で枠消費**・best-of-3。TTL 90 分＋日末猶予 15 分 |
| 3 attempts | クライアント localStorage（§7） | サーバー `daily_tickets` の部分 UNIQUE `(daily_key, player_id, attempt_no) WHERE closed_reason IS DISTINCT FROM 'voided'` が最終権限 |

## 10. 論点 8：card selection time（経過時間）の再確認

【実測】`grep -rnE "elapsed|duration|timeMs|thinking" src/core/replay src/core/engine/score.ts src/core/types` → **0 件**。`DailyRunLog`（`[M] runLog.ts:29-43`）は `version/clientRunId/dailyKey/godId/deck/otomoGrowthPath/actions` のみ、`ReplayInput` も同様。`ScoreState`・`RULES.score` に時間項目は無い。決定244 §9（`docs/PRACTICAL_QA_2026-09-28_AUDIT.md:59, 334-368`）「スコア・リプレイ・行動ログに経過時間の項目は 0。`Date.now` は seed 生成のみ」を **`3dd8b5c` でも確認**。結論は同じ：**Ranking は無タイマー・同点同順位**。所要時間（ticket 発行→提出）はサーバー側 `duration_ms` として**監視用に記録のみ**（順位に使わない。RANKING_V1_AUDIT §3）。

## 11. 論点 9〜11：exploit surface・privacy／security・競技公平性

### 11-1. exploit surface【docs・実測】

| 脅威 | 対策 | 判定 | 根拠 |
|---|---|---|---|
| クライアント側 score 送信・改ざん | 申告値を受け取らない（型に無い）・サーバーが本番エンジンで再計算 | 効く | `[M] types.ts:41-57`、`[B] submit.ts` 7 段目 `runReplay` |
| リプレイ改ざん | uid／enemy／seed／deck 改ざんは拒否か別結果。`claimedSeed`／`claimedEnemyId` は照合専用 | 効く | `[M] replay.test.ts:309-389` |
| 何度も遊んで良い 3 回だけ提出 | ticket（開始で枠消費）。best-of-300 = 1.5〜2.3 倍を遮断 | 効く | 決定139、`[B] ticket.ts` |
| localStorage 消去で 3 回超 | サーバー側 UNIQUE が最終権限 | 効く | `[B] schema.ts` |
| 端末時計偽装（明日の Daily を先に） | `dailyKey` はサーバー時刻。ticket 無しは `NO_TICKET` | 効く | `[B] start.ts:95-96`、`[B] submit.ts` 2 段目 |
| seed 先読み・solver・bot | seed は `daily-${date}-${enemy}` で前日に計算可能。**アプリ層では防げない** | 受容＋監視（`attempt_no` 分布・上位の所要時間・同点圧縮率）。Phase 2 案：日次 salt（Daily 概念変更＝CEO #1） | `[M] dailyBoss.ts:87` |
| 行動ログ共有（他人の解を提出） | 同点同順位なので順位利得 0。ログは API から出ない | 実害小。検知列（`actions_hash`）を MODIFY で追加 | `[B] ranking.ts` |
| 複数アカウント（Sybil） | アプリ層不可。edge WAF rate limit（`/api/ranking/start`） | **要 CEO 操作**（B4） | `[B] identity.ts:16-19` |
| 他人の公開 ID で枠を食い潰す | 秘密の定数時間照合 | 効く | `[B] identity.ts:76-83` |
| deploy 跨ぎで条件が変わる | day-lock（版を日単位で固定、進行中は `voided` で枠返還） | 効く | `[B] start.ts:98-107`、`[B] submit.ts` 5 段目 |
| 巨大 body／総当たり | 64KB（Content-Length と実バイト）・400 action・30 試行/日 | 効く | `[B] handler.ts`、`RULES.replay.maxActions`、`RULES.ranking.maxSubmitAttemptsPerDay` |
| 同 `clientRunId` で中身差し替え | 再送も再検証。不一致は `RUN_ID_CONFLICT` | 効く | `[B] submit.ts` 3 段目 |

### 11-2. privacy／security・reset 周期・rollback・secrets【docs】

- 送るもの：匿名 ID・秘密（body のみ・HTTPS）・操作記録（カードを出した順）。送らないもの：名前・メール・端末情報。Vercel request log の IP は表記に含める。
- 保存期間：`RULES.daily.retentionDays 30` で `daily_days` 削除 → CASCADE（`start` の 1/16 回で剪定）。**leaderboard reset 周期＝日次（JST 0:00＋猶予 15 分で確定）**、週間は `weekKey`（月曜）で派生、殿堂は直近 30 日。
- rollback：K0 `RANKING_SUBMISSION_DISABLED=1`（B2 で追加・board 維持）／K1 `RANKING_API_ENABLED` 削除（全 503・DB に触れない）／K3 merge revert。いずれも**環境変数 1 本→再デプロイ**で、ゲーム本体は影響を受けない（Daily はオフラインで遊べる設計 `ranked:false`）。
- secrets：Production で必要な env は **2 キー**（`RANKING_API_ENABLED`・`RANKING_DATABASE_URL`）。tracked `.env` 0・資格情報形の文字列 0（`secret-audit.mjs`）。本書も接続文字列・鍵を含まない。
- 既知の運用欠陥：Preview と Production が**同一 Neon DB**（B3）。公開前に Preview 用 Neon branch（無料）を切り、テスト行の削除は CEO 承認（§6-3 #9）か 30 日剪定に任せる。

### 11-3. 競技公平性（同じ Seed・同じルール・同じ試行条件の保証）【AI 判断】

原則「**同じ問題を解いた者同士だけを並べる**」（RANKING_V1_AUDIT §3 を `3dd8b5c` で再確認し維持）：

| 条件 | 保証の方法 | 実装の所在 |
|---|---|---|
| 同じ日付 | サーバー時刻で `dailyKey` を決める（端末時計を信じない） | `[B] start.ts:95-96` |
| 同じ seed・敵・補正 | `dailyKey` だけから `resolveDailyStart` で再導出（申告値は照合専用） | `[M] dailyStart.ts:29-39`、`[M] replay.ts` |
| 同じルール（版） | day-lock：その日最初の start の `gameVersion` に固定。異なる版の start は 423、進行中は `voided` で枠返還。Ranking 影響 deploy は JST 0:00 直後に限定 | `[B] start.ts:98-107`、`[M] gameVersion.ts` |
| 同じ難易度・神階 | normal・神階 0 を**型で固定**（Daily 開始が引数を受け取らない） | `[M] dailyStart.ts`、`[M] useGameEngine.ts:369-383` |
| 同じ編成ルール | 1 種 2 枚・報酬ボーナス無効を `validateDeck` で検証。購入優位の経路なし | `[M] replay.ts`、`dailyFairness.test.ts` |
| 同じ試行条件 | 3 枠・開始で消費・best-of-3・TTL 90 分・日末猶予 15 分。DB UNIQUE が最終権限 | `[B] ticket.ts`、`[B] schema.ts` |
| 神・デッキ・OTOMO | 選択自由。神は**表示**（North Star「神×敵の相性を読む」）、デッキ・OTOMO は記録のみ | `[B] types.ts`、§12 MODIFY #5 |
| 順位 | 同点同順位（1,1,3）・先着無関係・時間不使用 | `[B] ranking.ts:49-86` |

**禁止事項（P14「Fun Is Not For Sale」`PRINCIPLES.md:59-60`「『解く』・勝利・再挑戦・競争優位を売らない」、NEXT_MILESTONES DO NOT START YET `paid retry／paid Daily attempts／power-selling OTOMO`）**：有料の挑戦枠追加・有料 retry・有料ヒント／敵意図の先読み・有料カード／OTOMO 効果・報酬ボーナス・順位に影響する外装・広告視聴での枠回復。許容は順位に影響しない称号／外装のみ（v1.0 は無料プリセット）。

---

## 12. 論点 12：Phase 4 から再利用できる部分／捨てる部分（ファイル単位）

`3dd8b5c` での再検証結果。RANKING_V1_AUDIT §2 の 19 項目を踏襲し、drift（§13）に基づき #20・#21 を追加。

| # | 部品（旧枝 `[B]`／master `[M]`） | 判定 | 理由 |
|---|---|---|---|
| 1 | `[M] src/core/replay/{types,replay,runLog,resume,gameVersion,index}.ts` | **KEEP（master 既存）** | 検証器・版・記録の核。2389d21 以降 runtime 変更 0【実測】 |
| 2 | `[B] src/core/replay/ranking.ts`（+test） | **KEEP** | 純関数・1,1,3・テスト済み。外部依存 0 |
| 3 | `[B] src/core/identity.ts` | **KEEP** | Web Crypto のみ。クライアント／サーバー共有の唯一の導出 |
| 4 | `[B] src/server/ranking/{types,ticket,start,submit,leaderboard,store,http,identity,index,deps}.ts`（+tests 168） | **KEEP** | ホスティング非依存・時刻注入・判定順序が乱用対策そのもの。master の `src/core` API（`runReplay`・`getGameVersion`・`dailyKeyOf`）は不変なので再結合可【実測：`replay/index.ts` の export は決定171 で rank export 3 行を外しただけ】 |
| 5 | `[B] src/server/ranking/schema.ts`・`postgresStore.ts` | **MODIFY** | 列追加：`replay_input jsonb`（7 日）・`input_hash`・`actions_hash`・`duration_ms`・`build_sha`・`hidden boolean`（取り下げ用）・`title_id smallint` |
| 6 | `[B] scripts/phase47-migration/*` | **MODIFY** | 002 migration を同形式（preflight/apply/postflight・pglite dry run）で追加 |
| 7 | `[B] api/_lib/env.ts`・`handler.ts` | **MODIFY** | B2：`RANKING_SUBMISSION_DISABLED=1`（閉める向き・全環境）を追加。`build_sha` は `VERCEL_GIT_COMMIT_SHA` から |
| 8 | `[B] api/ranking/{start,submit,leaderboard}.ts` | **KEEP** | 各 13 行の詰め替え。`.js` 拡張子問題は解決済み（決定144） |
| 9 | `[B] src/hooks/rankingClient.ts` | **MODIFY** | B1：決着時と Daily 画面 mount 時に `flushPendingRuns()` |
| 10 | `[B] src/hooks/{anonymousPlayerId,rankingTicketStorage,leaderboardClient}.ts` | **KEEP** | 独自 version・try/catch・秘密は body のみ |
| 11 | `[B] src/hooks/dailySessionStart.ts`＋`useGameEngine` ticket 配線 | **REBUILD** | master の `useGameEngine` は決定196・Phase 7 で再構成済み（枝 vs master +100/−? 【実測：`08_*`】）。ロジック流用・diff は書き直し |
| 12 | `[B] src/components/GameFlow.tsx`・`HomeScreen.tsx` 差分 | **REBUILD** | master は `HomeTodayPanel` 分割・Entrance E1・決定254 降臨の間を実装済み（枝 vs master GameFlow 157 行・HomeScreen 209 行差）。`HomeTodayPanel` に順位チップ 1 個を足す形へ |
| 13 | `[B] src/components/setup/dailyRanking.ts`（+test） | **MODIFY** | 称号・表彰台を追加。`shortPlayerLabel` はフォールバック |
| 14 | `[B] DailyRankingPanel.tsx`＋`daily.css` 差分 | **REBUILD** | 表のみ・神アイコン無し。TOP3 表彰台＋自分の行常時表示に作り直す。文言 6 状態は流用 |
| 15 | `[B] GameOverOverlay.tsx` ランキング節 | **REBUILD** | master は result-hub・Victory Reveal（決定196・226）で再構成（枝 vs master 372 行差）。「今日の順位 1 行＋ランキングを見る」を再配置 |
| 16 | `[B] docs/PHASE4_*` 12 本 | **KEEP（参照）** | 設計根拠。`.vercelignore` で `docs/` は配信除外済み |
| 17 | `[B] scripts/phase4-daily-gate`・`phase45-psf`・`phase48-api`・`phase49-ui` | **KEEP（参照・非配信）** | **`phase4-daily-gate` は推奨 NEXT の再判定ハーネス**（§0） |
| 18 | `[B] package.json` の `@neondatabase/serverless`（deps）・`@electric-sql/pglite`（dev） | **KEEP** | Stage 0 で追加。`ranking-absence.mjs` の期待値を Stage 別に反転 |
| 19 | 枝の履歴（59 commit）そのもの | **DISCARD** | whole merge 禁止（NEXT_MILESTONES DO NOT START YET・CEO 指示）。file-level 移植で master 起点の新 branch へ |
| 20 | `[M] battle.css:4371-4409`・`[M] daily.css:321-539`（dead CSS） | **DISCARD（Stage 0 で削除）** | TSX 参照 0【実測】。REBUILD #14・#15 は新 CSS を書くため流用価値が低い。削除は見た目不変（Release Hygiene の範囲） |
| 21 | `[M] gameVersion.test.ts` GOLDEN（`1.6c581e56a02c0730`） | **MODIFY（Stage 0 で取り直し）** | 現行版 ≠ GOLDEN の間、第 3 テスト（版据え置きなら結果不変）が早期 return で無効化されている【実測 :220-221】。Ranking 稼働中は「版据え置き＝結果不変」の保証が公平性に直結する |
| 22 | 枝側の Phase 5／6 ゲーム変更（`src/core/data/*`・`components/battle/*` の枝版） | **DISCARD** | 決定171 で master に取り込み済み。枝版は古い |

---

## 13. Ranking v1 AUDIT（`2389d21`）以降の drift【実測】

| 範囲 | `2389d21..3dd8b5c` | 影響 |
|---|---|---|
| `src/core`・`src/hooks` | 13 ファイル +205/−100（`cardArt`・`enemies`・`rules`・`stakes`・`round.ts` 5 行・テスト 8 本）。commits：`47940f1` 決定246／`b9b126e` 決定251／`9316ce1` 決定252 | `dataFingerprint` が変わる（day-lock は問題なし）。**競技適性（神間 spread・勝率）は未再計測** |
| `src/core/replay/*` runtime | **0 ファイル**（テストのみ） | KEEP #1 の前提は不変 |
| `src/hooks/*` | **0 ファイル** | 記録配線は不変 |
| 共有 UI（枝と衝突するファイル） | `BattleScreen.tsx` +81 行・`rules.ts` +36 行のみ。`GameOverOverlay`・`GameFlow`・`useGameEngine`・`HomeScreen`・`DailyChallengeScreen` は **変更なし** | RANKING_V1_AUDIT §1-9 の衝突分析は有効。REBUILD 工数の見積（§2 #11〜15）は据え置き |
| 分岐 | master-only 48 → **75** commit | whole merge 不可の根拠が強まった |

---

## 14. 設計案（1 案・比較の結果）

### 14-1. 比較した案

| 案 | 内容 | 評価 |
|---|---|---|
| A. 今すぐ Stage 0（閉じた移植）に着手 | KEEP 部品を master 起点 branch へ移植し、API 既定閉・配線 0 | **却下**。TRIGGER 未到達・DO NOT START YET に `whole ranking branch merge` と `premature persistent analytics`。移植後も Blocker と競技適性再判定が残り、着手の価値が evidence に先行する（P9・P11） |
| B. dormant 維持＋Daily Competitive Gate 再判定（推奨） | runtime 0。`phase4-daily-gate` を現行エンジンで再実行し G1／G2／best-of-N を再計測。結果は Lane1（balance）と Ranking の両方に効く | **採用**。Ranking を起動せずに「Daily が競技として公平か」を確定できる。RAM は Lane1 完了後 |
| C. 通常戦スコアも含む「総合ランキング」 | 通常戦の自己ベストを提出 | **却下**。`?seed=`・神階・同 seed 再戦で比較不能。ticket が無い |
| D. seed に日次 salt を混ぜて solver を塞ぐ | サーバー配布 salt | **却下（v1）**。Daily のオフライン性（P6 semantics）を壊す＝CEO #1。solver evidence が無い |

### 14-2. 採用案 B の中身（実装は本書の範囲外）

1. **Daily Competitive Gate 再判定**（docs/scripts-only・runtime 0）：`[B] scripts/phase4-daily-gate/{dailyHarness,gate.audit,diagnostics.audit}.ts` を master 起点の `docs/` 系 branch へ file-level で移し、現行 `resolveDailyStart` を import して 7 神×実 Daily シード×打ち筋で G1（spread ≤5%）・G2（勝率）・best-of-3 vs best-of-30／300 を再計測。結果 JSON を `docs/evidence/` に収録し、Decision 文書の表は JSON から生成する（決定252 の教訓）。
2. **G1 FAIL なら**：Ranking の前に Planner レーンへ「神間 spread」を渡す（combo 偏重・寿楽の BURST が Battle Score に乗らない問題は決定131 で特定済み）。
3. **G1／G2 PASS かつ TRIGGER 到達なら**：RANKING_V1_AUDIT §10 の Stage 0 → 1a → 1b → 2 → 3 をそのまま使う（本書 §12 の #20・#21 を Stage 0 の作業に追加）。
4. **TRIGGER の判定基準**（AI 推奨・CEO 承認は Stage 0 時）：Feedback の声（L6）または CEO 実感で「Daily を 3 日以上続ける人がいる」。計測基盤は `premature persistent analytics` に該当するため作らない。

---

## 15. Risk

| # | リスク | 影響 | 緩和 |
|---|---|---|---|
| R1 | 競技適性 Gate を再判定せずに Ranking を開くと「神を選んだ時点で順位が決まる」 | North Star の「組む」が死ぬ・不公平 | §0 推奨 NEXT を Stage 0 の前提にする |
| R2 | 旧枝がさらに古くなる（master-only 75 commit） | 再配線工数の増加 | KEEP 部品は `src/core` API に依存するだけで drift の影響を受けない（§13）。REBUILD 部品は元々書き直し |
| R3 | engineVersion が 1 のまま・GOLDEN が古い | 版据え置きで結果が変わっても検出されない窓 | Stage 0 で GOLDEN 取り直し（#21）・engine 挙動変更時の +1 を Release Gate 項目に追加 |
| R4 | 人口不足で「参加 3 人・全員 1 位」 | 順位が意味を持たない | TRIGGER 前に開かない。上位 n%・次の順位まで n 点を同格表示 |
| R5 | solver／ログ共有で上位が機械化 | 「読んで解く」の毀損 | 監視（`attempt_no` 分布・所要時間・同点圧縮率）、同点同順位、Phase 2 salt |
| R6 | Preview と Production が同一 Neon DB（B3） | 公開初日にテスト行が混ざる | Preview 用 Neon branch・テスト行は剪定（30 日）か CEO 承認削除 |
| R7 | Vercel Hobby／Neon Free の規約・停止 | ボード消失 | ゲームは遊べる設計（`ranked:false`）。公開前 CEO 確認 |
| R8 | dead CSS 削除時の見た目回帰 | 低 | TSX 参照 0 を再確認してから削除。Release Hygiene の diff 検査 |

---

## 16. 実装しなかったこと

- runtime／`src/`／`public/`／`package.json`／設定ファイルの変更（0 バイト）
- 旧枝の merge／cherry-pick／checkout（`git show`／`git diff --stat` のみ）
- `docs/DECISIONS.md` の編集（統合担当が追記）
- vitest／build／Playwright／Chrome／Neon／Vercel／環境変数の操作
- 現行 `gameVersion` 文字列の算出、現行エンジンでの神間 spread・勝率の計測（→ 推奨 NEXT）
- Stage 0 の移植 branch 作成

---

## 17. runtime 変更 0 の証明

commit 直前に以下を実行し、結果を §17-1 に転記した（`docs/` 以外の変更 0）。

```
git -C C:/Users/kimi1/SevenGodsGame-lane2-ranking status --porcelain
git -C C:/Users/kimi1/SevenGodsGame-lane2-ranking diff --stat -- src public package.json
git -C C:/Users/kimi1/SevenGodsGame-lane2-ranking diff --cached --stat -- src public package.json
```

### 17-1. 実測結果（2026-10-02・commit 直前）

```
$ git status --porcelain
?? docs/RANKING_INTEGRATION_PREFLIGHT.md
?? docs/evidence/ranking-integration-preflight/

$ git diff --stat -- src public package.json
(出力なし = 0 ファイル)

$ git diff --cached --stat -- src public package.json
(出力なし = 0 ファイル)

$ git status --porcelain | grep -v "docs/"
(出力なし = docs/ 以外の変更・未追跡 0)
```

`src/`・`public/`・`package.json`・設定ファイルの変更 **0**。worktree は `3dd8b5c` から docs のみ追加。

---

## 18. CEO 判断（§6-4 雛形・現時点では提出しない）

現時点で §6-3 に該当する判断は無い。Stage 0 に進む条件が揃ったときに、以下 1 枚だけを提出する（RANKING_V1_AUDIT §13 を本書で更新）。

```
【CEO DECISION REQUIRED】（将来・条件到達時のみ）
Issue：Ranking staged activation の Stage 0（閉じた移植・runtime 影響 0・deploy 0）に着手してよいか
AI Recommendation：Daily Competitive Gate 再判定 G1/G2 PASS ＋ TRIGGER（Daily 常連 evidence）の両方が揃ったときのみ Stage 0 を承認
Reason：部品は健全（§11-1）だが、公平性の再判定と人口 evidence が無い状態で開くと P9 と North Star に反する
Alternatives：今すぐ Stage 0（却下：DO NOT START YET）／通常戦ボード（却下：比較不能）／日次 salt（却下：Daily semantics 変更）
Risk：旧枝の再配線工数が drift で増える（KEEP 部品は影響なし）
Impact if delayed：ゲーム本体・Daily・セーブに影響なし
CEO Action：承認 / 拒否
```

---

## 付録 A. 証拠ファイル一覧（`docs/evidence/ranking-integration-preflight/`）

| ファイル | 内容 |
|---|---|
| `inventory.json` | 本書の要約（baseline・旧枝規模・Production 残存・drift・判定） |
| `01_production_src_grep_ranking.txt` | `[M] src/` の rank／ranking／leaderboard grep 97 行 |
| `02_phase4_branch_ranking_diffstat.txt` | 旧枝 Ranking 専用 46 ファイル／+8,630 行の diff --stat |
| `03_phase4_branch_log.txt` | 旧枝 59 commit の一覧 |
| `04_decision171_removal_commit.txt` | `85c94ee` の本文と除外 stat |
| `05_decisions_md_ranking_lines.txt`／`05b_*_short.txt` | `DECISIONS.md` の Ranking 75 行（全文／160 字） |
| `06_decisions_phase4_rows_excerpt.txt` | 決定131／132／134／140／143／144／148／152／171／172 の抜粋 |
| `07_master_drift_since_ranking_v1_audit_2389d21.txt` | `2389d21..3dd8b5c` の core/hooks diff --stat と commit |
| `08_shared_ui_drift_2389d21_to_3dd8b5c.txt` | 共有 UI の drift と枝との差 |
| `09_branch_divergence_counts.txt` | master-only 75／branch-only 59 |
| `10_nondeterminism_tamper_time_grep.txt` | `Date.now`／`Math.random`／改ざんテスト／時間項目 grep |
| `11_production_key_snippets_3dd8b5c.txt` | rules／score／dailyBoss／useGameEngine／types／golden の該当行 |
| `phase4-branch-readonly/` | 旧枝 9 ファイルの `git show` 複写（`identity`・`ranking`・`types`・`schema`・`env`・`handler`・`submit`・`start`・`rankingClient`）。読み取り専用・runtime には置かない |
