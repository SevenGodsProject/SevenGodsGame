# Ranking v1 AUDIT / DESIGN — 既存 Phase 4 ランキング枝の実物監査と、SEVEN GODS 向け Ranking v1 推奨仕様

- 日付：2026-09-27
- 種別：**監査・設計のみ**（runtime 変更 0・merge 0・push 0・deploy 0・Neon 操作 0・環境変数操作 0）
- 対象：Production `master` = `2389d21` ／ dormant branch `feat/daily-ranking-phase4` = `762168f`（merge-base `489352c`）
- 証拠の読み方：`[B] path:line` = `feat/daily-ranking-phase4` の実物、`[M] path:line` = `master 2389d21` の実物。行番号は `git show <ref>:<path>` の値
- 補助成果物：`scripts/ranking-audit/inventory.mjs`（git 読み取りだけの棚卸し。`out/inventory.json` / `out/inventory.md`）
- 秘密情報：本書は接続文字列・鍵・トークンを **一切含まない**。環境変数は「名前が存在する」ことだけを記す
- 位置づけ：`docs/SEVENGODS_NEXT_MILESTONES.md` 「TRIGGER. Ranking staged activation」到達時に 1 案として提出する仕様書。P9（Self Before Others）に従い、**本書は Ranking を起動しない**

---

## 0. 結論（表）

| 項目 | 結論 |
|---|---|
| Phase 4 枝の信頼モデル | **健全**。クライアント申告スコアは型として存在せず（`[B] src/server/ranking/types.ts:12-16`、`[M] src/core/replay/types.ts:41-57`）、サーバーが本番エンジンでリプレイして結果を計算する（`[B] src/server/ranking/submit.ts:138-143`）。ticket・client-held secret・day-lock も実装済み |
| Phase 4 枝の再利用可否 | **whole merge は不可**（master と 48/59 commit で分岐、UI 6 ファイルが両側で書き換え済み。§1-9）。**サーバー側 (`src/server/ranking`・`api/`) と core 追加 2 ファイルは file-level で KEEP 可能**。UI と hooks の配線は REBUILD |
| SERVER VERIFIED | **可能・実装済み**。`src/core` は外部 import 0（`[M] src/core/replay/replay.ts:21-25`、境界テスト）。Node 20+/Vercel Functions で `runReplay` をそのまま実行。1 件あたり CPU 数 ms、Function 往復は DB 5 クエリ込みで 1〜1.5 秒（region 不一致時。§4-4） |
| 推奨 Ranking v1（1 案） | **v1.0 = 「今日（Daily）」1 面のみ・サーバー検証済みスコアだけ・匿名 secret＋プリセット称号・TOP3 表彰台＋4 位以下 10 件＋自分の順位常時表示。** 週間（Best 3 of 7）と「1プレイ最高（神域殿堂・30 日）」は v1.1、通常戦ボードは **不採用**（§5） |
| Security Blocker | **4 件**（§7）：B1 決着時に提出されない配線欠落／B2 submit だけ閉じる env が無い／B3 Preview と Production が同じ Neon DB で、本番テーブルにテスト行が既にある／B4 Sybil の緩和（edge rate limit）が未設定。いずれも `src/core`・`src/server` の判定ロジックに触れず直せる |
| CEO 判断（§6-3） | Neon Free 継続と Vercel Hobby 規約適合（#5・#6）／匿名 identity の本番運用とプライバシー表記（#7）／自由入力ニックネーム（#7）／各 Stage の Production 反映（#8）／本番 DB のテスト行削除・Preview 用 Neon branch（#9）（§8） |
| 実装概算 | Stage 0（閉じた移植）1.5 AI-lane 日／Stage 1（閲覧のみ）1 日／Stage 2（提出開放）3〜4 日／Stage 3（週間・殿堂）2 日。合計 **7.5〜8.5 AI-lane 日**、人間換算 15〜20 人日（§9） |
| Production 導入 | 4 段階・各段で止まれる・rollback は環境変数 1 本（§10）。**Trigger（Daily 常連の evidence）到達前は Stage 0 も着手しない**（P9） |
| NEXT NOW | **1 つ**：TRIGGER 到達判定を §6-4 形式で CEO に提出（§13） |

---

## 1. 既存 Phase 4 枝の実物監査（項目ごと・file:line）

### 1-0. 枝の位置と規模（`scripts/ranking-audit/out/inventory.json`）

| 事実 | 値 | 証拠 |
|---|---|---|
| branch HEAD | `762168f`（Release Hygiene Gate・決定170） | `git rev-parse` |
| merge-base with master | `489352c` | `git merge-base` |
| branch-only commits / master-only commits | **59 / 48** | `git log --oneline master..branch` / 逆 |
| master に無いランキング専用ファイル | **94 files / 20,276 lines**（server 5,032・api 1,059・hooks 1,742・core 261・UI 673・docs 4,527・scripts 6,956。うちテスト 5,527 行） | inventory.json |
| テスト数（`it(`） | server 168・api 39・core/replay 88（master に既存）・setup UI 57 | `grep -c` |
| 決定171 Clean RC（`85c94ee`）で除外した経路 | `api/`・`src/server/`・`tsconfig.api.json`・ranking hooks 5 本・`DailyRankingPanel`+`dailyRanking`・`core/replay/ranking.ts`・`core/identity.ts`・`docs/PHASE4_*`・`scripts/phase4*`・Neon/pglite 依存 | `git show 85c94ee`（コミット本文） |
| master に **既に入っている** replay 基盤 | `src/core/replay/{types,replay,gameVersion,runLog,resume,index}.ts`、`src/hooks/{pendingRunStorage,clientRunId,dailyRunLogStorage}.ts`、`useGameEngine` の記録配線 | `[M] src/hooks/useGameEngine.ts:23-26, 198-234, 262-268, 360-386` |
| tracked `.env` | **0**。ランキング源泉に資格情報形の URL **0** | inventory.json `secrets` |
| 環境変数（名前のみ） | `RANKING_API_ENABLED`／`RANKING_DATABASE_URL`／`RANKING_PREVIEW_UNLOCK`／`VERCEL_ENV` | `[B] api/_lib/env.ts:13-27, 73-84` |
| Neon 本番 DB の状態 | Phase 4.6 schema 適用済み（決定142・CEO 承認）。**Preview QA のテスト行が本番テーブルに残る**（2026-09-09 の 1 件 ほか） | `[B] docs/PHASE4_10_PRODUCTION_RELEASE_GATE.md` §4-2、決定149 |

### 1-1. 実装されているもの（機能一覧）

| 機能 | 状態 | 証拠 |
|---|---|---|
| 行動ログ記録（Daily のみ、受理された Action だけ） | master に実装済み | `[M] src/core/replay/runLog.ts:118-133`（`applyAndRecord`）、`:56-67`（通常モードは `null`） |
| 送信待ちの控え（localStorage `sevengods.pendingRuns`、v1、上限 20 件・7 日） | master に実装済み・**送信はしない** | `[M] src/hooks/pendingRunStorage.ts:1-45`、`[M] src/core/data/rules.ts:236-243` |
| リプレイ検証器 `runReplay` | master に実装済み | `[M] src/core/replay/replay.ts:36-140` |
| 版 `gameVersion` = `engineVersion.dataFingerprint` | master に実装済み | `[M] src/core/replay/gameVersion.ts:67-99` |
| 競技順位（1,1,3 方式・同点同順位・先着は順位に無関係） | 枝のみ | `[B] src/core/replay/ranking.ts:49-86` |
| 匿名 identity（端末 secret 64hex → 公開 ID = SHA-256 先頭 32hex、定数時間比較） | 枝のみ | `[B] src/core/identity.ts:25-83` |
| run ticket（開始で枠予約・状態機械 5 状態・TTL 90 分＋日末 15 分猶予） | 枝のみ | `[B] src/server/ranking/ticket.ts:32-97`、`[B] src/server/ranking/start.ts:83-213` |
| 提出（8 段の順序・再送も再検証・day-lock・レート制限・保存は計算値のみ） | 枝のみ | `[B] src/server/ranking/submit.ts:53-187` |
| リーダーボード（1 人 1 行=その日のベスト→`assignRanks`、15 秒キャッシュ、`self` 常時返却） | 枝のみ | `[B] src/server/ranking/leaderboard.ts:20-35, 88-124` |
| HTTP 受け口（ホスティング非依存、kill switch、64KB 門番、CDN cache header） | 枝のみ | `[B] src/server/ranking/http.ts:117-229` |
| Vercel Functions 薄層（env 3 門番、秘密漏洩の最終検査、body 先読み） | 枝のみ | `[B] api/_lib/handler.ts:52-76, 86-115, 154-200`、`[B] api/ranking/{start,submit,leaderboard}.ts` |
| Postgres 保存層（ドライバ非依存・`$n` プレースホルダ・DB 制約が最終権限） | 枝のみ | `[B] src/server/ranking/postgresStore.ts:1-40, 133-186, 273-302` |
| DB schema 4 表＋migration package（dry run 済み・Neon 適用済み） | 枝のみ | `[B] src/server/ranking/schema.ts:58-131`、`[B] scripts/phase47-migration/sql/001_phase46_tickets.sql` |
| クライアント：start→ticket 控え→START_GAME、pending 再送、閲覧クライアント | 枝のみ | `[B] src/hooks/rankingClient.ts:110-160, 195`、`[B] src/hooks/leaderboardClient.ts:142-186`、`[B] src/hooks/dailySessionStart.ts:43-79` |
| UI：Daily 画面のランキング表（Top10・自分の行・6 状態の文言）、決着画面の導線 | 枝のみ | `[B] src/components/setup/DailyRankingPanel.tsx:63-163`、`[B] docs/PHASE4_9_LEADERBOARD_UI.md` §2-5, §2-7 |
| Production Release Gate（Phase 4.10） | **NO-GO**（Blocker 2 件） | `[B] docs/PHASE4_10_PRODUCTION_RELEASE_GATE.md` §0, §8 |

### 1-2. データモデル（DB）

`[B] src/server/ranking/schema.ts:58-131`（DDL は `RULES` から生成。上限 3 が DDL に現れるため `.sql` 直書きを避けた理由が `:3-11`）

| 表 | 主キー | 主な列 | 役割 |
|---|---|---|---|
| `players` | `player_id` | `created_at`・`attempt_day`・`attempt_count` | 公開 ID と当日の提出**試行**カウンタ（レート制限） |
| `daily_days` | `daily_key` | `game_version` | その日の版を固定（day-lock） |
| `daily_tickets` | `(daily_key, client_run_id)` | `player_id`・`attempt_no`(1..3 CHECK)・`issued_at`・`expires_at`・`game_version`・`closed_reason`('abandoned'/'voided') | 挑戦枠の予約。部分 UNIQUE `(daily_key, player_id, attempt_no) WHERE closed_reason IS DISTINCT FROM 'voided'` が「1 日 3 枠」の最終権限 |
| `daily_runs` | `(daily_key, client_run_id)` | `attempt_no`・`game_version`・`god_id`・`score`・`win`・`round`・`rng_cursor`・`action_count`・`submitted_at`、FK→ticket | 検証済み結果。**行動ログ本体は保存していない**（§7 S6） |

存在しない列：氏名・メール・IP・端末情報・`playerSecret`・申告スコア（`:19-21`。`concurrency.test.ts` が禁止列を機械検査）。剪定：`daily_days` 削除 → CASCADE（`:149-152`）、`start` の 1/16 回で実行（`[B] start.ts:220-225`、`RULES.ranking.pruneEveryStarts=16`、`RULES.daily.retentionDays=30`）。

### 1-3. API／プロバイダ

- ホスティング：Vercel Functions（Web 標準 `Request`/`Response`。`[B] api/_lib/handler.ts:20-23`）。`vercel.json` は不在（Vite 自動検出）。`.vercelignore` で `*.test.ts`・`scripts/phase47-migration/` を除外（`[B] .vercelignore`）
- DB：Neon Postgres、HTTP ドライバ `@neondatabase/serverless ^1.1.0`（`[B] package.json:15`。**枝では dependencies**。決定143 時点の devDependencies 問題は解消済み）。dry-run 用に `@electric-sql/pglite`（devDependencies）
- ルート：`POST /api/ranking/start`／`POST /api/ranking/submit`／`GET /api/ranking/leaderboard?dailyKey=&limit=&playerId=`（`[B] src/server/ranking/http.ts:123, 163, 199`）
- 門番（順序）：`RANKING_API_ENABLED`≠'1' → 503 `api_disabled`（DB に触れない）／`RANKING_DATABASE_URL` 無し → 503 `database_unconfigured`／`RANKING_PREVIEW_UNLOCK` は **production では読んで捨てる**（`[B] api/_lib/env.ts:75-83`）。kill switch 既定値は `RULES.ranking.submissionEnabled=false`（`[M] src/core/data/rules.ts:255`）
- 応答の安全：`containsSecret`（`playerSecret` 文字列 or 64hex を含む応答は 500 に落として出さない。`[B] handler.ts:52-64`）、`cache-control: no-store` 既定、`x-content-type-options`・`referrer-policy`（`:65-75`）、例外は名前だけログ（`:192-198`）。CORS ヘッダを出さない＝同一オリジン専用（4.10 §4-1）
- 型チェック：`tsconfig.api.json`（`include: ["api"]`、bundler 解決）。`api/` は `tsc -b` の参照に追加（`[B] tsconfig.json` +3 行）

### 1-4. 認証／プレイヤー識別

- **アカウントではない**。端末が 256bit の秘密（`sevengods.playerSecret`）を持ち、公開 ID は `SHA-256(secret)` 先頭 32hex（`[B] src/core/identity.ts:46-54`、`[B] src/hooks/anonymousPlayerId.ts:32-34, 97-107`）。旧 `sevengods.playerId`（Phase 4.3〜4.5 の公開 ID＝資格情報だった欠陥）は移行時に削除（`:66-83`）
- サーバーは秘密を保存しない（DB 列なし・ログなし・応答なし。`[B] src/server/ranking/identity.ts:15-17`、`secrets.test.ts`）
- 表示名：**無い**。`プレイヤー XXXX`（先頭 4hex 大文字。`[B] src/components/setup/dailyRanking.ts:25-34`）。自分の行は「あなた」
- Sybil（identity 量産）：**塞がない**と明記（`[B] src/core/identity.ts:16-19`）。緩和は edge のレート制限（4.10 §3-2、Vercel WAF・CEO 操作）

### 1-5. スコア提出経路（クライアント→サーバー）

1. Daily 開始前：`prepareDailyStart`→`startRankedRun(clientRunId)`→`POST /start`→ticket を `sevengods.rankingTicket` に保存→START_GAME（`[B] src/hooks/dailySessionStart.ts:43-79`、`[B] src/hooks/rankingClient.ts:110-160`）。サーバー不通・閉鎖時は `ranked:false` で **ゲームはそのまま遊べる**（`:24-27`）
2. 対局中：`applyAndRecord` が受理 Action だけを `DailyRunLog` に追記（master 既存）
3. 決着時：`enqueuePendingRun` で控えに入れる **だけ**（`[M] src/hooks/useGameEngine.ts:227-234`）
4. 送信：`flushPendingRuns` の呼び出し元は **`startRankedRun` 内の 1 箇所のみ**（`[B] rankingClient.ts:132`）→ **その日の最後の 1 回は当日中に提出されず、1 日 1 回の人は一度も載らない**（4.10 §4-0 Blocker B1）
5. サーバー：`submitRun` 8 段（`[B] submit.ts:53-187`）。再送であっても必ず再検証し、保存済みと一致して初めて `duplicate`（`:83-108`）

### 1-6. サーバー側検証（決定論シミュレーションの再実行）

- **やっている**。`runReplay(input)` が `resolveDailyStart(dailyKey)` で seed・敵・補正を再導出し（`[M] replay.ts:74-85`）、`validateDeck`（`:91-94`）、Action 種別検査（`:97-103`）、`applyAction` を START_GAME から全 Action に適用（`:106-133`）、決着必須（`:135-137`）、`getFinalScore(state.score, state.stake)` で表示スコアを計算（`:147-164`）。stake は渡さない＝Daily は神階 0 固定（`:120`）
- 申告値 `claimedSeed`/`claimedEnemyId` は照合専用で、一致しても再導出値を使う（`[M] src/core/replay/types.ts:36-39`）
- 保存するのは `VerifiedOutcome` の一部（score/win/round/rngCursor/actionCount）だけ（`[B] submit.ts:145-159`）
- 拒否コード：`MALFORMED`／`FORMAT_VERSION`／`MODE`／`DAILY_KEY`／`SEED_MISMATCH`／`ENEMY_MISMATCH`／`ACTION_LIMIT`(400)／`ACTION_TYPE`／`DECK`／`ENGINE_REJECTED`／`NOT_FINISHED`（`[M] types.ts:60-82`）＋ 提出層の `BAD_IDENTITY`／`RUN_ID_CONFLICT`／`RATE_LIMITED`(30/日)／`ATTEMPTS_EXCEEDED`／`NO_TICKET`／`TICKET_CLOSED`／`TICKET_EXPIRED`／`RULES_VERSION_MISMATCH`（`[B] types.ts:56-77`）

### 1-7. 不正対策（何が効き、何が効かないか）

| 脅威 | 対策 | 判定 | 証拠 |
|---|---|---|---|
| スコア改ざん | 申告値を受け取らない・サーバーが再計算 | **効く** | `[M] types.ts:41-57`、`[B] submit.ts:138-143` |
| 何度も遊んで良い 3 回だけ提出（best-of-N） | 開始時に ticket で枠消費。実測で best-of-300 は best-of-3 の 1.5〜2.3 倍 | **効く** | `[B] ticket.ts:6-15`、`[B] docs/PHASE4_5_PSF_GATE.md:22, 118` |
| 他人の公開 ID を名乗って枠を食い潰す | 秘密の照合（定数時間） | **効く** | `[B] identity.ts:76-83` |
| 端末時計偽装（明日の Daily を先に） | `dailyKey` はサーバー時刻。ticket 無しは `NO_TICKET` | **効く** | `[B] start.ts:95-96`、`[B] submit.ts:72-80` |
| deploy 途中で条件が変わる | day-lock（版を日単位で固定、進行中は `voided` で枠返還） | **効く** | `[B] start.ts:98-107`、`[B] submit.ts:119-129` |
| 同 `clientRunId` で中身差し替え | 再送も再検証、不一致は `RUN_ID_CONFLICT` | **効く** | `[B] submit.ts:83-98` |
| 巨大 body／総当たり | 64KB（Content-Length と実バイト両方）・400 action・30 試行/日 | **効く** | `[B] handler.ts:86-115`、`RULES.replay.maxActions`、`RULES.ranking.maxSubmitAttemptsPerDay` |
| SQL injection | 全クエリ `$n`、列名は定数 | **効く** | `[B] postgresStore.ts:27-30, 133-186` |
| 秘密の漏洩 | body のみ送信・DB 列なし・応答検査・ログは例外名だけ | **効く** | `[B] rankingClient.ts:18-21`、`[B] handler.ts:52-64, 192-198` |
| Sybil（identity 量産） | アプリ層では **効かない**。edge rate limit（未設定） | **要 CEO 操作** | `[B] identity.ts:16-19`、4.10 §3-2 |
| 公開・決定論 seed のオフライン探索（solver） | **効かない**（設計上受容。137 種前後のスコア頭打ちが根拠） | 監視で緩和（§4-6） | `[B] ranking.ts:4-9`、`[M] dailyBoss.ts:84-89`（seed = `daily-${date}-${enemy}` で事前計算可能） |
| 行動ログの共有（他人の解をそのまま提出） | 同点は同順位（1,1,3）なので順位上の利得ゼロ。ログは API から出ない | **実害小**・検知列を追加（§4-5） | `[B] ranking.ts:11-16`、`[B] leaderboard.ts:101-111` |

### 1-8. Daily／seed／難易度／Retry／神・OTOMO・デッキとの関係

| 条件 | Daily での扱い | 証拠 |
|---|---|---|
| seed・敵 | `dailyKey` だけから決定論導出（JST 日付、週次シャッフル巡回で 7 体が週 1 回ずつ） | `[M] src/core/data/dailyBoss.ts:42-45, 56-71, 84-89` |
| 難易度・神階・補正 | `difficulty:'normal'`、stake 無し、`modifier {enemyHpMul 1.25, enemyAtkMul 1.15}` | `[M] src/core/data/dailyStart.ts:29-39`、`[M] replay.ts:120`、`[M] rules.ts:204-210` |
| 報酬ボーナス（bonusCopies） | Daily では不使用（型ごと削除。決定132） | `[M] replay.ts:88-90` |
| Retry | 1 日 3 回（`attemptsPerDay: 3`）、ticket 方式では **開始で消費**。通常戦の「同じ盤面で再戦」（決定196）は Daily に触れない | `[M] src/components/battle/retrySemantics.ts:19-22`、`[B] ticket.ts:6-15` |
| 神・デッキ・OTOMO 成長路 | プレイヤーが選ぶ。`ReplayInput` に含まれ、サーバーが `validateDeck` で検証。`otomoGrowthPath` は再生に入る | `[M] types.ts:48-51`、`[M] replay.ts:108-121` |
| 通常戦 | `?seed=`・`?enemy=` バックドア、神階 0〜7（`stakeScoreScale ×(1+0.08×段)`）、敗北時同 seed 再戦 → **比較不能** | `[M] src/hooks/useGameEngine.ts:41-56`、`[M] src/core/engine/score.ts:13-18` |
| 表示スコア | 内部値 ×10（`displayScale`。決定149） | `[B] docs/PHASE4_9_LEADERBOARD_UI.md` §8-1 |

### 1-9. Production `2389d21` との差分と衝突

`git diff master feat/daily-ranking-phase4 --stat`（2 点比較）は **346 files / +20,840 / −124,589**。−12 万行の大半は master 側で増えた監査出力（`scripts/release-*/out/*.json`）と決定 172〜237 の UI であり、枝はそれらを持たない＝**枝は master から見て 48 commit 分「古い」**。

| 共有ファイル | master の commit 数（merge-base 以降） | 枝 vs master | 衝突の中身 |
|---|---|---|---|
| `src/components/battle/GameOverOverlay.tsx` | 4 | +141/−231 | master は result-hub／次の目標／Victory Reveal（決定196・226）で再構成。枝の `game-over-daily` ランキング節は **手で再配置** |
| `src/components/battle/BattleScreen.tsx` | 6 | +18/−51 | master は決定 224〜237 の視覚パッチ（**main worktree に未コミット差分あり**）。`onOpenRanking` prop は再配線 |
| `src/components/GameFlow.tsx` | 6 | +39/−118 | master は `prepareDailyStart` を持たない（決定171 で切断）。同 seed 再戦・Entrance 配線と交差 |
| `src/hooks/useGameEngine.ts` | 4 | +58/−42 | `DailyRunSession`（ticket 配線）を master の記録配線に **再度縫い直す** |
| `src/components/setup/HomeScreen.tsx` | 4 | +73/−136 | master は `HomeTodayPanel` に分割済み。枝の Home 変更は捨てる |
| `src/components/setup/DailyChallengeScreen.tsx` | 1 | +26/−0 | 追加のみ（`daily-facts` 直後にパネル）。低リスク |
| `src/core/replay/index.ts` / `tsconfig.json` / `package.json` / `.vercelignore` | 0〜1 | 数行 | 機械的 |
| `src/core/data/rules.ts` | 1 | 0 | **差分なし**（`RULES.ranking` は master に残っている） |

- save `version`：両側とも `saveVersion: 9`（`[M] rules.ts:421`、`[B] rules.ts:421`）。ランキングはセーブ形式を変えず、独自キー（`sevengods.playerSecret`・`sevengods.rankingTicket`・`sevengods.pendingRuns` v1）に閉じる → **セーブ移行リスク 0**
- `gameVersion`：master の `dataFingerprint` は決定 172 以降のカード・敵・数値変更で枝時点（`1.da595899c6a9db43`）と **必ず異なる**。day-lock により「移植当日」は版が変わる → Stage 2 の deploy は JST 0:00 直後（4.10 §7 C-12）
- `scripts/release-audit/ranking-absence.mjs` は「ランキング経路が無いこと」を 17 項目で検査する（`[M] scripts/release-audit/ranking-absence.mjs:22-62`）。Stage 0 以降は **この監査の期待値を段階ごとに反転**する必要がある（§10）

---

## 2. KEEP／MODIFY／REBUILD 判定表

| # | 部品 | 判定 | 理由 |
|---|---|---|---|
| 1 | `src/core/replay/*`（master 既存） | **KEEP** | 検証器・版・記録の核。境界テストで外部依存 0 |
| 2 | `[B] src/core/replay/ranking.ts`（`assignRanks`） | **KEEP** | 決定133 の順位規則を関数化。純粋・テスト済み |
| 3 | `[B] src/core/identity.ts` | **KEEP** | Web Crypto のみ・クライアント／サーバー共有実装。Red Team §16 #8「identity は 1 度だけ作る」に合致 |
| 4 | `[B] src/server/ranking/{types,ticket,start,submit,leaderboard,store,http,identity,index,deps}.ts` | **KEEP** | ホスティング非依存・時刻注入・168 テスト。判定順序が乱用対策そのもの |
| 5 | `[B] src/server/ranking/schema.ts` + `postgresStore.ts` | **MODIFY** | 列追加：`replay_input jsonb`（7 日保持）・`input_hash`・`actions_hash`・`duration_ms`・`build_sha`（§4-5）。`daily_runs_ticket_fk` の `VALIDATE CONSTRAINT`（CEO 承認事項のまま） |
| 6 | `[B] scripts/phase47-migration/*` | **MODIFY** | 002 migration（上記列）を同じ形式（preflight/apply/postflight・pglite dry run）で追加 |
| 7 | `[B] api/_lib/env.ts` + `handler.ts` | **MODIFY** | B2：`RANKING_SUBMISSION_DISABLED=1`（閉める向き・全環境）を追加（4.10 §2-3）。`build_sha` は `VERCEL_GIT_COMMIT_SHA` から読む（値はログに出さない） |
| 8 | `[B] api/ranking/*.ts` | **KEEP** | 各 13 行の詰め替え。Vercel が Functions を束ねない問題は `.js` 拡張子で解決済み（決定144） |
| 9 | `[B] src/hooks/rankingClient.ts` | **MODIFY** | B1：決着時と Daily 画面 mount 時に `flushPendingRuns()`。既存の再送設計は維持 |
| 10 | `[B] src/hooks/{anonymousPlayerId,rankingTicketStorage,leaderboardClient}.ts` | **KEEP** | localStorage 独自 version・try/catch・秘密は body のみ |
| 11 | `[B] src/hooks/dailySessionStart.ts` + `useGameEngine` の ticket 配線 | **REBUILD** | master の `useGameEngine`（決定196 同 seed 再戦・記録配線）に合わせて縫い直す。ロジックは流用、diff は書き直し |
| 12 | `[B] src/components/GameFlow.tsx` / `HomeScreen.tsx` の差分 | **REBUILD** | master 側が再構成済み。`HomeTodayPanel` に順位チップを足す形にする |
| 13 | `[B] src/components/setup/dailyRanking.ts`（表示モデル） | **MODIFY** | 称号（§5-4）と表彰台（§6）を追加。`shortPlayerLabel` はフォールバックとして残す |
| 14 | `[B] src/components/setup/DailyRankingPanel.tsx` + `daily.css` 差分 | **REBUILD** | 現状は表のみ・神は文字（`:142`）・神アイコン無し・表彰台無し。CEO 参照構成（TOP3 表彰台・神アイコン）に作り直す。文言 6 状態（4.9 §2-5）は流用 |
| 15 | `[B] GameOverOverlay.tsx` のランキング節 | **REBUILD** | master の result-hub 構成に「今日の順位 1 行＋ランキングを見る」を再配置 |
| 16 | `[B] docs/PHASE4_*`（12 本） | **KEEP（参照）** | 設計根拠。移植時に `docs/` へそのまま持ち込む（`.vercelignore` で配信除外済み） |
| 17 | `[B] scripts/phase4-daily-gate`・`phase45-psf`・`phase49-ui` | **KEEP（参照・非配信）** | 再検証ハーネス。Stage 2 の再判定で使う |
| 18 | `[B] package.json` の `@neondatabase/serverless`（dependencies）・`@electric-sql/pglite`（dev） | **KEEP** | Stage 0 で追加。`ranking-absence` 監査の期待値更新が必要 |
| 19 | 枝の履歴（59 commit）そのもの | **捨てる** | whole merge 禁止（P9・NEXT_MILESTONES DO NOT START YET）。file-level cherry-pick で master 起点の新 branch に移植 |

---

## 3. 公平性設計（固定・記録・表示する条件）

原則：**同じ問題を解いた者同士だけを並べる**。比較不能な条件は「固定」して同一にするか、「別ボード」に分ける。並べる条件の差は「記録」し、必要なものだけ「表示」する。

| 条件 | 扱い | v1.0 の値 | 記録 | 表示 | 根拠 |
|---|---|---|---|---|---|
| 日付キー（JST） | **固定**（サーバー時刻） | ボードのキー | ○ | ○（ボード見出し） | `[B] start.ts:95-96` |
| seed・敵・神域補正 | **固定**（`dailyKey` から再導出） | 全員同一 | −（再導出可） | 敵名・SeedID（既存 `daily-facts`） | `[M] dailyBoss.ts:84-89` |
| 難易度・神階 | **固定** | normal・神階 0 | − | 「神階なし」注記 1 回 | `[M] dailyStart.ts:35`、`[M] replay.ts:120` |
| 報酬ボーナス・課金効果 | **固定（無効）** | 無し | − | − | `[M] replay.ts:88-90`、§5-6 |
| コード版（`gameVersion`） | **固定（日単位）** | day-lock | ○ | − | `[B] start.ts:98-107` |
| 神 | **選択・記録・表示** | 7 神いずれか | ○ `god_id` | ○ 名前＋アイコン | 「神×敵の相性を読む」が解の一部（North Star） |
| デッキ 20 枚 | 選択・**記録**（`replay_input` 内） | 検証済みのみ | ○（7 日） | ×（v1.0。Phase 2 で「解を見る」に使う） | `[M] replay.ts:91-94` |
| OTOMO 成長路 | 選択・記録 | guardian/…（現行値） | ○（`replay_input` 内） | × | `[M] runLog.ts:64` |
| 挑戦回数 | **上限 3・開始で消費・best-of-3** | 3 | ○ `attempt_no` | ○「n 回目で到達」（自分の行のみ。他人は非表示） | `[B] ticket.ts:6-15` |
| 提出時刻 | 記録 | − | ○ | ×（順位に使わない） | `[B] ranking.ts:15` |
| 所要時間（ticket 発行→提出） | **記録のみ**（新規） | − | ○ `duration_ms` | × | §4-6 監視 |

**Retry の扱い（決定）**：**best-of-3・開始で枠消費**（Phase 4.6 のまま）。「初回のみ」は通信断で枠を失った人を救えず、「別ボード」は参加者を薄めるため不採用。ただし自分の行にだけ「1 回目で到達」を出し、**一発で解いたことを本人が誇れる**ようにする（他人の試行回数は表示しない＝晒さない）。

**「1プレイ最高」が seed farming を避ける方法**：通常戦は `?seed=`・神階・同 seed 再戦により farming が構造的に可能で、かつ ticket が無い → **通常戦ボードは作らない**。「1プレイ最高」は **Daily 系列だけ**から派生させ、「直近 30 日の日次ベストの最高（神域殿堂）」として **敵名・日付を必ず併記**する（日ごとに問題が違うことを隠さない）。Daily は 1 日 3 枠なので farming は上限 3 に閉じる。

**週間の集計**：`weekKeyOf`（月曜起点 JST。`[M] dailyBoss.ts:56-66`）ごとに、**日次ベストの上位 3 日の合計（Best 3 of 7）**。全 7 日の合計にしないのは P8（login streak・FOMO を作らない）に抵触するため。3 日は「週に 3 回帰ってくれば満点が狙える」線で、常連 evidence（TRIGGER）とも整合する。提出経路は増やさず `daily_runs` から派生計算するだけ（新しい信頼境界を作らない）。

---

## 4. SERVER VERIFIED 設計（決定論シミュレーションの再検証・拒否条件・コスト）

### 4-1. 実行可能性

- `src/core` は React・Phaser・DOM・外部パッケージを import しない（`git grep "from '[^./]" master -- src/core/**/*.ts` = 0 件、`replayBoundary.test.ts`／`rankingBoundary.test.ts` が機械検査）。`crypto.subtle` は Node 19+ の `globalThis.crypto` にある（Vercel Node 20/22 で可。ローカル node v24）
- Phase 4.8 Preview 実機で `submit` が **205 点で一致**（決定150、4.10 §4-1「replay 改ざん」）＝ Node 上の再生とブラウザの結果が一致することは実証済み

### 4-2. 版の固定（version pinning）

- `gameVersion = "<engineVersion>.<dataFingerprint>"`。`dataFingerprint` は `RULES`（`ranking`・`replay.pendingRuns` を除く）＋カード・敵・神・OTOMO・神託 3 択の正規化 JSON の FNV-1a×2（`[M] gameVersion.ts:67-99`）。`engineVersion` は手動で、上げ忘れは golden test が検出
- 追加（MODIFY）：`build_sha`（`VERCEL_GIT_COMMIT_SHA`）を run に保存。FNV-1a は衝突耐性の証明が無い非暗号ハッシュだが、**版は秘密でも改ざん耐性でもなく「同じか違うか」の札**（`gameVersion.ts:31-38`）なので設計上問題ない。`build_sha` は監査時に「どのコードで検証したか」を一意にするためだけに持つ
- `ReplayInput.version`（`RULES.replay.formatVersion=1`）はログ構造の版で、`saveVersion` とは独立（`[M] rules.ts:216-222`）

### 4-3. 受理・拒否条件（確定版）

| 段 | 条件 | 結果 |
|---|---|---|
| 0 | `RANKING_API_ENABLED`≠1／DB 未設定／`RANKING_SUBMISSION_DISABLED`=1（新規） | 503（何も書かない） |
| 1 | body > 64KB・JSON 不正・形式不正 | 413／400 |
| 2 | 秘密が公開 ID と一致しない・`clientRunId` 形式不正 | 400 `BAD_IDENTITY` |
| 3 | ticket 無し／他人の ticket | 404 `NO_TICKET`／400 |
| 4 | 受理済み `clientRunId` の再送 → **再検証**して一致 | 200 `duplicate`（枠・試行を消費しない） |
| 4' | 再送で中身が違う | 409 `RUN_ID_CONFLICT` |
| 5 | ticket が closed／expired | 409／410 |
| 6 | 版不一致 | 409 `RULES_VERSION_MISMATCH`（**枠返還**） |
| 7 | 提出試行 ≥30/日 | 429 |
| 8 | `runReplay` 拒否（11 コード） | 422 `REPLAY_REJECTED` + `replayCode` |
| 8' | 新規：`input_hash` が同一プレイヤーの別 run と一致 | 受理するが `duplicate_of` を記録（同点なので順位に影響なし） |
| 9 | INSERT 競合 | 再読して `duplicate` か 409 |

**クライアントのスコアは一切信用しない**：入力型に存在しない（`[M] types.ts:41-57`）。返すのもサーバー計算値だけ（`[B] http.ts:186-195`）。

### 4-4. コスト・レイテンシ

| 項目 | 見積り | 根拠 |
|---|---|---|
| リプレイ CPU | 数 ms／件（≤400 action、実分布 max 34・P99 30） | `[M] rules.ts:225-232`、4.10 §3-1 |
| Function 往復（submit） | DB 5 クエリ＋replay。region 不一致で **1〜1.5 秒**、region 一致で 0.3〜0.5 秒 | 4.10 §5-2 実測（DB 1 クエリ ≈200 ms、cold 879 ms） |
| leaderboard | cache MISS ≈440 ms／CDN HIT 30〜60 ms（15 秒 `s-maxage`） | 同上 |
| Neon Free（1,000 人/日） | storage：現行 ≈25 MB/30 日。**`replay_input` を足すと** ≈4 KB×3×1,000 = 12 MB/日 → **7 日保持で ≈84 MB**（0.5 GB の 17%）。compute・egress は無視できる | 4.10 §5-1 ＋本監査の試算（1 action ≈100 B） |
| 上限到達時 | API 500 → UI「取得できませんでした」／start は `ranked:false` → **ゲームは遊べる** | `[B] rankingClient.ts:24-27` |

`replay_input` は **全件 30 日**にすると ≈360 MB で Free 上限に迫るため、**全件 7 日＋`input_hash` は 30 日**とする。Top 100 は 30 日保持（表彰・異議申立て用）。

### 4-5. 保存する／しないもの（MODIFY 後）

| 保存する | 保存しない |
|---|---|
| 計算値（score/win/round/rngCursor/actionCount）、`attempt_no`、`game_version`、`build_sha`、`god_id`、`replay_input`（7 日／Top100 は 30 日）、`input_hash`・`actions_hash`（30 日）、`duration_ms`、`title_id`（称号。§5-4） | `playerSecret`、氏名・メール・IP・UA・端末情報、申告スコア、自由入力文字列（v1.0） |

### 4-6. 監視（North Star guard と不正の早期検知。週 1・読み取り SQL のみ）

1. `attempt_no` 分布：ベスト run の何割が 1 回目か（**「読んで解いた」の指標**。目標 ≥40%）
2. `duration_ms / action_count`：1 action あたり 1.5 秒未満の run 比率（オフライン solver・ログ再生の疑い）。拒否しない・フラグのみ
3. `actions_hash` クラスタ：同一ログを持つ異なる `player_id` の数（解の共有。同点なので順位利得は無いが人口の質を見る）
4. 同点圧縮率：`totalPlayers / distinct scores`（決定131 の 137 種頭打ちの実測）
5. Neon：storage・compute・egress の月内消費（compute 50% で K0 検討）

---

## 5. 推奨 Ranking v1 仕様（1 案）

### 5-1. ボード

| 版 | ボード | 集計 | 提出経路 |
|---|---|---|---|
| **v1.0** | **今日（Daily）** | 1 人 1 行＝その日のベスト（best-of-3）→ `assignRanks`（1,1,3・同点同順位） | サーバー検証（既存） |
| v1.1 | 週間（月〜日 JST） | 日次ベストの **上位 3 日の合計**（Best 3 of 7） | 派生計算のみ |
| v1.1 | 神域殿堂（「1プレイ最高」） | 直近 30 日の日次ベストの最高。**敵名・日付を併記**。敵別タブ（7 体） | 派生計算のみ |
| Phase 2 | 大会・チーム・神別 | 設計のみ（§11） | − |
| 不採用 | 通常戦ボード | `?seed=`・神階・同 seed 再戦・ticket 無しで比較不能 | − |

### 5-2. 順位規則（決定133 を維持）

同点は同順位・次は人数ぶん飛ぶ・先着は順位を決めない・`topPercent` と `pointsToNextRank` を併記（`[B] ranking.ts:11-16`）。

### 5-3. 公平性（§3 の確定値）

固定：日付・seed・敵・補正・難易度 normal・神階 0・ボーナス無効・版（day-lock）。選択・記録・表示：神。選択・記録のみ：デッキ・OTOMO 成長路・試行番号・所要時間。Retry：best-of-3・開始で枠消費。

### 5-4. プレイヤー identity（最小・プライバシー安全）

- v1.0：**匿名 secret（既存）＋プリセット称号**。称号は `title_id`（例：`ebisu-01`「恵比寿の巫女」…各神 3 種＋汎用 3 種 = 24 種）を **列挙から選ぶ**。自由入力ゼロ＝モデレーション不要・個人情報ゼロ・多言語化も辞書 1 枚。未選択は `プレイヤー XXXX`（既存）
- 称号は `players.title_id smallint` に保存（識別子ではない・いつでも変更可）。プレイヤーが選んだ称号は「解いた自分」の表現であって Pay-to-anything ではない（P14：外装は愛着の表現）
- v1.1 以降（**CEO 判断**）：自由入力ニックネーム（NG ワード辞書・通報・取り下げ手順が要る）／アカウント連携（端末を跨ぐ復元）。identity は Share・課金と共通の 1 基盤とする（Red Team §16 #8）
- プライバシー表記：「ランキングは端末で生成した匿名 ID と、あなたの操作記録（カードを出した順）だけを送ります。名前・メール・端末情報は送りません」。Vercel の request log に IP が残る点は表記に含める（4.10 §4-2）

### 5-5. North Star guard（「読んで解く」を報い、グラインドを報いない）

- ticket 3 枠が **グラインドを構造的に不可能**にする（best-of-300 の 1.5〜2.3 倍を遮断）
- 自分の行の「1 回目で到達」表示、§4-6 の `attempt_no` 分布を KPI にする
- 週間は Best 3 of 7（毎日を強制しない）。連続日数・ログインボーナス・「あと n 日」演出は **入れない**（P8）
- 表示は「順位」より「上位 n%」「次の順位まで n 点」を同格で出す（人口が少ないうちは順位が粗い。決定131 §6）
- 敵の意図表示・戦闘 HUD には **一切触れない**（ランキングは Setup／Result 層にだけ住む）

### 5-6. No Pay-to-Win／Pay-to-Solve（明示的に除外するもの）

除外：有料の挑戦枠追加・有料 retry・有料ヒント／敵意図の先読み・有料カード／OTOMO 効果・報酬ボーナス（Daily では既に無効）・順位に影響する外装・広告視聴での枠回復・「順位を上げる」課金全般。許容：順位に影響しない称号／外装（v1.0 は無料プリセットのみ。課金は §6-3 #4 で別途）。

---

## 6. UI 仕様

CEO 参照構成（TOP3 表彰台・名前・神・神アイコン・スコア・4 位以下リスト・自分の順位常時表示）を SEVEN GODS に適合させる。

| 要素 | 仕様 |
|---|---|
| 置き場所（主） | `DailyChallengeScreen` の `daily-facts` 直後（決定148 の位置。`[M] DailyChallengeScreen.tsx:76`） |
| 置き場所（副） | `HomeTodayPanel` に順位チップ 1 個（「今日 12 位・上位 8%」。未参加は「今日のランキングを見る」）。`GameOverOverlay` の Daily 結果に「今日の順位 1 行＋ランキングを見る」（master の result-hub 内。`[M] GameOverOverlay.tsx:344-366`） |
| 戦闘 HUD | **変更なし**（`BattleScreen` には prop 1 本 `onOpenRanking` も足さない。結果画面から遷移） |
| 表彰台（TOP3） | 中央 1 位・左 2 位・右 3 位。各：神アイコン（`public/assets/gods/<godId>/front_640.webp`、`main.webp` はフォールバック）・称号 or `プレイヤー XXXX`・スコア（×10 表示）・神名。同点で 1 位が 2 人なら 2 人とも 1 位段に（3 位段は空）。1,1,3 のときは「1 位・1 位・3 位」と表示 |
| 4 位以下 | 表（順位・称号・神アイコン小＋神名・スコア・勝利／未撃破）を 10 位まで（`leaderboardTopCount`）。「もっと見る」で 100 位まで（`leaderboardLimit`）。ページングは公開後（4.10 L4） |
| 自分の順位 | **常時表示**：パネル上部に固定行（順位・上位 n%・同点 n 人・次の順位まで n 点・「1 回目で到達」）。Top 外でも `self` から必ず出る（`[B] leaderboard.ts:114-122`） |
| 状態文言 | 4.9 §2-5 の 6 状態を流用（読み込み中／準備中／取得失敗／接続不可／0 人／自分の記録なし）＋「現在は閲覧のみ」（提出閉鎖時） |
| SP（≤640px） | 表彰台は 3 列固定・アイコン 56px、表は内部スクロール、横あふれ 0（4.9 §3・§8-3 の実測を踏襲） |
| PC | 表彰台 3 列＋表を 2 段。Daily 画面の縦長化を避けるため表は既定 10 行 |
| アクセシビリティ | 色だけに頼らない（勝利／未撃破は文字）。自分の行は文字「あなた」で判別（4.9 §2-4） |
| 素材 | 神アイコンは既存 `public/assets/gods/*`（7 神×`front_640.webp`）。新規画像 0 |
| 文言 | 日本語直書き（MVP 方針）。称号辞書は 1 ファイルに集約 |

---

## 7. セキュリティ上の Blocker（Stage 2＝提出開放の前に必須）

| # | Blocker | 影響 | 修正（`src/core`・`src/server` の判定ロジックは無変更） | 出典 |
|---|---|---|---|---|
| **B1** | 決着時に `flushPendingRuns()` が呼ばれない（呼び出し元は `startRankedRun` 内の 1 箇所） | その日の最後の 1 回が載らない・1 日 1 回の人は一度も載らない。**公平性の欠陥** | 決着時と Daily 画面 mount 時に呼ぶ・呼び出しを検査するテスト・Preview で UI だけの一周 | `[B] rankingClient.ts:132`、4.10 §4-0 |
| **B2** | submit だけ閉じる環境変数が無い（production では `undefined` → 定数へフォールバック） | 緊急停止にコード deploy が要る | `RANKING_SUBMISSION_DISABLED=1`（全環境・閉める向き）を `env.ts`/`handler.ts` に追加。K0 rollback test | `[B] handler.ts:186-188`、4.10 §2-3 |
| **B3** | Preview と Production が **同じ Neon DB**。本番 `daily_runs` に Preview のテスト行が既にある | 公開初日のボードにテスト行が混ざる／QA が本番を汚す | 公開前に Preview 用 Neon branch（無料）を切る。テスト行の削除は **CEO 承認（§6-3 #9）**。代替：剪定（30 日）で自然消滅を待ち、公開後 Preview を unlock しない運用 | 4.10 §4-2、決定149 |
| **B4** | Sybil の緩和が未設定（アプリ層では原理的に不可） | 1 人が identity を量産して枠を増やせる（順位利得は同点で小さいが人口指標を汚す） | Vercel WAF Rate Limiting 1 rule（IP/JA4、`/api/ranking/start` 対象。Hobby 無料）。**CEO 操作**。有料と判明したら停止 | `[B] identity.ts:16-19`、4.10 §3-2 |
| S5（非 Blocker） | 公開・決定論 seed は前日でも計算できる（solver・オフライン探索） | 「暇な人」ではなく「機械」が上位に来る可能性 | v1 は受容＋§4-6 #2 監視。Phase 2 案：サーバー配布の日次 salt を seed に混ぜる（Daily semantics 変更＝**CEO 判断**・オフライン Daily が不可になる） | `[M] dailyBoss.ts:84-89` |
| S6（MODIFY） | 行動ログ本体を保存していない | 再検証・異議申立て・不正行の調査・取り下げができない | `replay_input jsonb`（7 日）＋ハッシュ（30 日） | `[B] schema.ts:99-126` |
| S7（運用） | 不正／異常スコアの取り下げ手順が無い | 一人で回せない（Red Team §16 #5） | `daily_runs.hidden boolean` と読み取り SQL 手順書（DELETE ではなく非表示） | − |
| S8（規約） | Vercel Hobby の非商用条件への適合が未確認 | 公開後に停止される | **CEO 確認**（4.10 §9 #5） | − |

---

## 8. CEO 判断が必要な事項（§6-3 該当。§6-4 形式で到達時に 1 案ずつ提出）

| # | 事項 | §6-3 | AI 推奨 |
|---|---|---|---|
| 1 | Neon Free のまま公開してよいか／Vercel Hobby 規約適合 | #5・#6 | Free のまま Stage 1 を開始し、§4-6 #5 で監視。規約は公開前に確認 |
| 2 | 匿名 identity（端末 secret）の本番運用とプライバシー表記文 | #7 | §5-4 の表記で承認。アカウントは作らない |
| 3 | 自由入力ニックネーム | #7 | **v1.0 では入れない**（プリセット称号）。v1.1 でモデレーション手順込みで再提出 |
| 4 | 各 Stage の master merge・Production deploy・環境変数投入 | #8 | Stage ごとに §6-4 形式で承認 |
| 5 | 本番 DB のテスト行削除／Preview 用 Neon branch 作成／`VALIDATE CONSTRAINT` | #9 | Neon branch は作る（無料・不可逆でない）。削除は剪定に任せ、公開初日を 30 日以降にできるなら削除不要 |
| 6 | Vercel WAF rate limit rule | 操作のみ（無料なら） | 設定する。有料なら停止して再提出 |
| 7 | Daily seed への日次 salt（Phase 2・S5） | #1（Daily 概念） | **v1 では提案しない**。solver evidence が出たら再提出 |
| 8 | 称号・外装の課金化 | #4 | v1 では扱わない |

---

## 9. 実装概算（AI-lane 日／人間換算人日）

| Stage | 内容 | AI-lane 日 | 人日換算 |
|---|---|---|---|
| 0 | master 起点 branch に KEEP 部品を file-level 移植（`src/server/ranking`・`api`・`core/identity`・`core/replay/ranking`・hooks 3 本・docs/scripts）、依存追加、`tsconfig` 参照、`ranking-absence` 監査の期待値を Stage 別に更新、テスト緑（API は既定で閉）。**配線 0・deploy 0** | 1.5 | 3 |
| 1 | 閲覧のみ：`leaderboardClient`＋新 UI（表彰台・表・自分の行・称号辞書）を Daily 画面に配置、`HomeTodayPanel` チップ。R1→R2（env 2 キー）。Preview 実機 QA | 1.0（＋CEO 操作 0.5h） | 2〜3 |
| 2 | 提出開放：B1・B2、`replay_input`/hash/duration/title 列の 002 migration（dry run→CEO 承認→適用）、ticket 配線を master の `useGameEngine` に縫い直し、結果画面の 1 行、region 調整、WAF rule、rollback test、JST 0:00 deploy | 3〜4（＋CEO 操作 2h） | 7〜9 |
| 3 | 週間（Best 3 of 7）・神域殿堂（30 日・敵別）を派生 API＋タブで追加。監視 SQL 5 本を `scripts/ranking-audit/` に | 2.0 | 4 |
| 計 | | **7.5〜8.5** | **16〜19** |

前提：`src/core`・`src/server` の判定ロジックは無変更（168+39 テストをそのまま通す）。工数の 6 割は master 側 UI（決定 172〜237）への再配線と実機 QA。

---

## 10. Production 導入手順（段階・rollback）

**前提ゲート**：TRIGGER（Daily 常連の evidence）到達を CEO が判定するまで **Stage 0 も着手しない**（P9・NEXT_MILESTONES「DO NOT START YET」）。

| 段 | 操作 | 直後の Production | 確認 | rollback |
|---|---|---|---|---|
| **Stage 0** | 移植 branch を作る。merge しない | 変化なし | tests・tsc・lint・`ranking-absence`（Stage 0 期待値） | branch 破棄 |
| **Stage 1a**（R1） | Stage 0＋閲覧 UI を `--no-ff` merge → deploy。env 無し | `/api/ranking/*` 全 503 `api_disabled`。UI「まだ準備中です」。通常戦無変化 | 4.10 §7 C-1〜C-4b | `git revert -m 1 <merge>` |
| **Stage 1b**（R2） | `RANKING_API_ENABLED=1`・`RANKING_DATABASE_URL` を Production に投入 → **再デプロイ** | board 200（空 or テスト行なし）。start/submit 503 `submission_disabled`。UI「閲覧のみ」 | C-5〜C-8b | 変数を外す→再デプロイ |
| **Stage 2**（R3） | B1・B2・002 migration・配線を merge。`submissionEnabled: true` の 1 行 commit を **JST 0:00 直後**に deploy。WAF rule・region 調整・rollback test 済み | 公開：start 201→決着→UI だけで submit 201→board | C-9〜C-19 | **K0** `RANKING_SUBMISSION_DISABLED=1`→再デプロイ（board 維持・DB 静止）／K1 `RANKING_API_ENABLED` 削除／K3 merge revert |
| **Stage 3** | 週間・殿堂（読み取り派生のみ） | タブ追加 | 派生 API の 200・空状態 | 同 K0/K1 |

運用ルール：変数は「追加／削除 → 必ず再デプロイ」・同名行の重複確認（決定146/147/151）。公開後は Preview を unlock しない（B3 が解けるまで）。監視は §4-6 を週 1。

---

## 11. Phase 2 候補（設計のみ・実装しない）

| 候補 | 設計要点 | 前提 |
|---|---|---|
| 神別ボード | `daily_runs.god_id` でフィルタするだけ（新テーブル不要）。同日・同敵で「この神で一番うまく解いた人」。神×敵相性の学習に直結（North Star） | 参加者が神ごとに ≥10 人 |
| 週末大会（単発） | 特定 `dailyKey` を「大会日」と宣言し、当日ボードに大会バッジ。ルール・枠・検証は Daily と同一（新経路を作らない）。賞は称号のみ | 週間ボード稼働・運営 1 人で回ること |
| チーム | 招待コード（サーバー発行の乱数）で `team_id` を `players` に紐づけ、週間 Best 3 of 7 をチーム合算。個人情報 0 のまま可 | identity 基盤の安定・モデレーション（チーム名は称号と同じプリセット制） |
| 日次 salt seed（S5 対策） | サーバーが JST 0:00 に公開する salt を seed に混ぜる。オフライン Daily は不可になる → Daily 概念変更＝CEO | solver evidence |
| 解の閲覧（Top 3 の行動ログ再生） | `replay_input` を `runReplay` で再生して「答え」を見せる。学習価値は高いが「翌日以降に公開」など Daily 期間中は非公開 | replay 再生 UI |

---

## 12. Risks

| # | リスク | 影響 | 緩和 |
|---|---|---|---|
| R1 | 人口不足で「参加 3 人・全員 1 位」 | 順位が意味を持たない | 上位 n%・次の順位まで n 点を同格表示。TRIGGER 到達前に開かない |
| R2 | master への再配線で決定 196／226／224〜237 の UI を壊す | Solve Loop・Victory Reveal の回帰 | 配線は結果画面 1 行＋Setup 層のみ。既存 `solveLoopWiring`・`resultHub` テストを回帰ゲートに |
| R3 | 版が日中に変わる deploy | その日の新規 start 不可（423） | Stage 2 以降のランキング影響 deploy は JST 0:00 直後に限定 |
| R4 | Neon Free 停止（翌月まで） | ボード消失・提出不可 | ゲームは遊べる設計。監視 50% で K0 |
| R5 | solver／ログ共有で上位が機械化 | 「読んで解く」の毀損 | §4-6 #2・#3 監視、同点同順位で利得を消す、Phase 2 salt |
| R6 | Sybil による人口指標の汚染 | KPI の誤読 | WAF rule（B4）・`totalPlayers` を identity ではなく「提出のあった identity」で数える（既存） |
| R7 | 称号がプリセットでは物足りない | 自己表現の弱さ | v1.1 で自由入力を CEO 判断付きで再提出 |
| R8 | Vercel Hobby 規約 | 停止 | 公開前 CEO 確認（S8） |
| R9 | `ranking-absence` 監査を更新し忘れ、Release Gate が常に FAIL/PASS を誤る | ゲートの信頼低下 | Stage 別期待値をスクリプト引数で切り替える設計に |

---

## 13. NEXT NOW（1 つ）

**TRIGGER 到達判定を §6-4 形式で CEO に 1 枚提出する**（AI 推奨：Daily 常連の evidence＝Feedback の声または CEO の実感が無ければ **NO**＝Ranking は dormant のまま・本書を「READY-DORMANT 仕様」として保持。あれば **Stage 0 のみ承認**＝閉じた移植・runtime 影響 0・deploy 0）。

```
【CEO DECISION REQUIRED】
Issue：Ranking staged activation の TRIGGER（Daily 常連の evidence）に到達したか
AI Recommendation：evidence 無し → dormant 維持（本書を仕様として保持）／evidence 有り → Stage 0（閉じた移植）のみ承認
Reason：Phase 4 枝の信頼モデルは健全で再利用可能だが、人口 evidence 無しに公開すると「参加 3 人・全員 1 位」になり P9 に反する
Alternatives：Stage 0 を今すぐ着手（却下：DO NOT START YET に Ranking・identity が明記）／whole merge（却下：48/59 commit 分岐・UI 6 ファイル衝突）
Risk：evidence 判定の主観性（計測基盤が無い）。Feedback の声を根拠にする
Impact if delayed：無し（ゲーム本体に影響しない）
CEO Action：承認 / 拒否
```

---

## 付録 A. 本監査で触れたもの／触れていないもの

- 書いたファイル：`docs/RANKING_V1_AUDIT.md`（本書）・`scripts/ranking-audit/inventory.mjs`・`scripts/ranking-audit/out/{inventory.json,inventory.md}`
- 読んだだけ：`master` と `feat/daily-ranking-phase4` の各ファイル（`git show`／detached worktree `SevenGodsGame-rankaudit`。監査終了時に `git worktree remove --force` で削除）
- 変更していない：runtime・テスト・`docs/DECISIONS.md`・他レーンの worktree／docs／scripts・Neon・Vercel・環境変数・package
- 秘密：接続文字列・鍵・トークンは読んでいない・出力していない（tracked `.env` 0、資格情報形の文字列 0 を機械確認）
