# Phase 4.4 — Pre-Production DB Validation

- **日付**：2026-09-07
- **branch**：`feat/daily-ranking-phase4`（Phase 4.3 `3e3f01e` の上に積む独立commit。merge・push・deploy いずれも未実施）
- **区分**：AI判断（CLAUDE.md §6-2）。CEOは ①Neon Free ②匿名ID を承認、③Production公開 ④Vercel有料plan は**未承認**
- **やっていないこと**：Production 公開・Vercel plan 変更・課金設定・Preview 公開・`api/` の作成・ゲーム本体の変更

---

> **更新（2026-09-08）：Step 1 のブロックが解除され、実DB検証13件が全PASSしました。**
> 現在の状態は **§16〜§18** を参照してください。§0〜§15 は 2026-09-07 時点の記録として原文のまま残しています。
> Phase 4.4 の **Final PASS は credential ローテーション後の再実行が条件**（§16-5）。
> **Production Release は NO-GO**（§17 の Production Security / Fairness Gate が未監査・§18）。

---

## 0. 結論の要約（先に正直に）

| 区分 | 状態 |
|---|---|
| Step 1（Neon プロジェクト作成） | **未実施・ブロック**。Neon はログインが必要で、**アカウント作成とパスワード入力は私の側では実行できない** |
| Step 2〜3（Postgres 実装・スキーマ再監査） | **完了** |
| Step 4〜9（並行・3run・冪等・検証・順位・障害） | **設計と実装は完了。検証はメモリ実装＋制約設計に対して実施**。実DBでの再検証は接続情報が入り次第、用意済みのテストを走らせるだけ |
| Step 10（秘密情報監査） | **完了**（実在のギャップを1件発見・修正） |
| Step 11（Preview） | **未実施**（CEO未承認のため意図的に行わない） |
| Step 12（回帰） | **完了** |

**Phase 4.4 の本来の目的（実DBでの検証）は達成できていません。** その一点だけが残っており、
CEO が Neon の接続文字列を用意すれば、追加のコード作業なしに検証が走ります（§1-2）。

---

## 1. Neon Free Setup（Step 1）

### 1-1. 何が起きたか

環境を確認したところ、DB接続情報も CLI も存在しませんでした。

| 確認項目 | 結果 |
|---|---|
| `DATABASE_URL` 等の環境変数 | **無し** |
| `psql` / `docker` / `vercel` / `neonctl` | **すべて未インストール** |
| `.env*` ファイル | **無し** |
| `~/.vercel` / `~/.config/neonctl` | **無し** |

次に Chrome で `console.neon.tech` を開いたところ、**ログイン画面**でした（未ログイン）。
アカウント作成には Google / GitHub / Microsoft の OAuth か、メールアドレスとパスワードの入力が必要です。

**アカウントの作成と、認証のためのパスワード入力は、私の側では実行できません。**
CEO が明示的に承認した作業であっても、この一線は越えません。ブラウザのタブは開いたまま
放置せず閉じ、認証情報の入力は一切行っていません。

> **有料契約・payment method の登録画面には到達していません。** CEO の停止条件
> （「有料契約や payment method 登録が必須になる場合は停止」）とは**別の理由**で停止しています。

### 1-2. CEO にお願いしたいこと（所要 2〜3分）

1. https://console.neon.tech/signup で **Free Plan** のアカウントを作成
   （Free で開始され、payment method の登録は求められません。求められた場合はそこで中止してください）
2. プロジェクトを1つ作成（例：`sevengods-ranking`。リージョンは任意）
3. ダッシュボードの **Connection string** をコピー
4. ターミナルで次を実行（接続文字列は**このチャットに貼らないでください**）：

```
npm i -D @neondatabase/serverless
RANKING_DATABASE_URL=<接続文字列> npx vitest run src/server/ranking/postgres.integration.test.ts
```

これだけで Step 4〜9 の実DB検証（13件）が走ります。**追加のコード作業は不要**です。
接続文字列を `.env.local` に置く場合も安全です（`.gitignore` で除外済み・§6）。

---

## 2. スキーマ再監査（Step 3）

### 2-1. 再監査で見つけた問題と、その対処

Phase 4.3 の `schema.sql` を実DBへ適用する前に読み直し、**3点**を直しました。

| # | 問題 | 対処 |
|---|---|---|
| 1 | テーブルが `ranking_runs` / `ranking_attempts` の2つで、CEO指定の `players` / `daily_runs` と違う | `players` / `daily_runs` へ改め、**提出試行のカウンタは `players` の列に畳んだ**（当日ぶんだけ持てばよく、履歴用テーブルは不要）。**テーブルは2つだけ** |
| 2 | 1日3回の上限が**DBに表現されていなかった**（アプリ側の count 頼み＝Known Risk #3 の原因） | `attempt_no` 列＋`CHECK (attempt_no BETWEEN 1 AND 3)`＋`UNIQUE (daily_key, player_id, attempt_no)` を追加 |
| 3 | 上限の「3」を `.sql` に直書きすると `RULES.daily.attemptsPerDay` と二重管理になる（不変ルール4違反） | **DDLをTSから生成**（`schema.ts`）。`.sql` ファイルは削除し、上限は1か所にしか存在しない |

### 2-2. 最終スキーマ

```sql
CREATE TABLE IF NOT EXISTS players (
  player_id     text        PRIMARY KEY,   -- 端末生成の乱数16進。氏名・メール等は扱わない
  created_at    timestamptz NOT NULL DEFAULT now(),
  attempt_day   date,                      -- レート制限：当日ぶんだけ保持
  attempt_count integer     NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_runs (
  daily_key     text        NOT NULL,
  player_id     text        NOT NULL REFERENCES players (player_id) ON DELETE CASCADE,
  client_run_id text        NOT NULL,
  attempt_no    smallint    NOT NULL,      -- その日の何回目か
  god_id        text        NOT NULL,
  score         integer     NOT NULL,      -- 以下すべて runReplay の計算値
  win           boolean     NOT NULL,
  round         smallint    NOT NULL,
  rng_cursor    integer     NOT NULL,
  action_count  smallint    NOT NULL,
  submitted_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT daily_runs_pkey           PRIMARY KEY (daily_key, client_run_id),
  CONSTRAINT daily_runs_attempt_range  CHECK (attempt_no BETWEEN 1 AND 3),
  CONSTRAINT daily_runs_attempt_unique UNIQUE (daily_key, player_id, attempt_no)
);

CREATE INDEX IF NOT EXISTS daily_runs_board_idx
  ON daily_runs (daily_key, score DESC, submitted_at ASC);
```

**個人情報の列は1つもありません**（email / name / ip / user_agent / cookie / fingerprint いずれも不在をテストで固定）。

---

## 3. Postgres RankingStore（Step 2）

`src/server/ranking/postgresStore.ts`。**ドライバに依存しません**——SQLを実行する関数
（`SqlExecutor`）を注入してもらう形なので、`src/server` は「外部パッケージ import 0件」を保ったままです
（境界テストで機械検査）。`@neondatabase/serverless` / `pg` / `postgres.js` のどれでも同じコードが動きます。

DB固有のコードはこのファイルだけに閉じており、`submit.ts` / `leaderboard.ts` は SQL を1行も持ちません。

---

## 4. 同時実行の解消（Step 4／Known Risk #3）

### 4-1. 「countしてからinsert」をやめた

Phase 4.3 の弱点は「回数を数えてから挿入する」ことでした。2つの提出が同時に来ると
どちらも「今2件だから3件目にできる」と判断し、4件入りえます。

対処は **挿入そのものを最終権限にする**ことです。`attempt_no` を INSERT の中で決めます：

```sql
INSERT INTO daily_runs (..., attempt_no, ...)
SELECT $1, $2, $3, COALESCE(MAX(attempt_no), 0) + 1, ...
  FROM daily_runs WHERE daily_key = $1 AND player_id = $2
RETURNING attempt_no
```

同時に2つ来た場合：

- 両方が同じ `attempt_no` を狙う → **UNIQUE 違反（23505）** で片方が落ち、数え直して再試行
- 上限を超える番号になる → **CHECK 違反（23514）** → `attempts-exceeded`

**ロックもトランザクションも使いません。** DBの制約だけで保証できるので、これが
「最小かつ正しい方式」だと判断しました。`submitRun` 側の事前 count は残していますが、
これは無駄な書き込みを避けるための速い経路にすぎず、**判定の権限は持ちません**
（`insertRun` が `attempts-exceeded` を返せば、事前判定を通っていても拒否されます）。

### 4-2. 検証結果（メモリ実装＋強制レース）

実DBが無いため、**事前countの直後に必ず割り込みが入る**ようストアを包んで検証しました。
上限判定が事前countに依存していれば、この条件下では必ず4件以上入ります。

| 並列数 | 保存された件数 | 判定 |
|---|---|---|
| 2 | 2 | PASS |
| 3 | 3 | PASS |
| 4 | **3** | PASS |
| 10 | **3** | PASS |
| 8（割り込みを50回に増やした最悪条件） | **3** | PASS |

- 別プレイヤー3人がそれぞれ5並列 → 各人ちょうど3件（互いに干渉しない）
- 同じ `clientRunId` を6並列 → 保存は**1件**（全リクエストは成功として返る＝冪等）

> **これは実DB検証ではありません。** 証明しているのは「判定が挿入側へ移っている」ことで、
> Postgres の制約が期待どおり働くことは §1-2 の手順で確認する必要があります。

---

## 5. 3回制限（Step 6）

| 回 | 結果 |
|---|---|
| 1回目 | PASS（`runsUsed: 1`） |
| 2回目 | PASS（`runsUsed: 2`） |
| 3回目 | PASS（`runsUsed: 3`） |
| **4回目** | **REJECT（`ATTEMPTS_EXCEEDED`）** |

使い切ったあとでも、**既に受理済みの run の再送は通ります**（`duplicate`）。
再送で枠を失わない設計（Phase 4.3 §3-1）が3回制限と両立していることを確認しました。

---

## 6. 冪等性（Step 5）

| 状況 | 結果 |
|---|---|
| 同一 payload の再送 ×3 | すべて `ok: true` / `accepted: 'duplicate'`、保存は1件のまま |
| 提出**試行**のカウント | 再送では増えない（枠を消費しない） |
| 同じ `clientRunId` ＋ **改ざん payload** | **`RUN_ID_CONFLICT`** で拒否 |
| 他人の `clientRunId` を名乗る | `BAD_IDENTITY` で拒否 |
| 同時に同じ `clientRunId` が挿入された | 相手の登録を正として `duplicate` を返す（`insertRun` の `duplicate` 経路） |

---

## 7. Replay 検証（Step 7）

DBへ保存される `score` は必ず `ReplayInput → 本番エンジン → VerifiedOutcome` の計算値です。

- `SubmitRequest` に score/win/HP/rngCursor のフィールドは**存在しない**
- `score: 999999` を混ぜても、保存されるのは検証済みスコア（実DBテストでも `SELECT score` で確認する）
- `daily_runs` の列は `RankingRun` の計算値のみ

**client 申告 score が DB へ入る経路はゼロ**であることを、型・実装・テストの3層で固定しています。

---

## 8. リーダーボード（Step 8）

| 性質 | 結果 |
|---|---|
| best of 3 / 1 player 1 row | PASS |
| Top 100（上限で頭打ち） | PASS |
| self（圏外でも必ず返る） | PASS |
| 同点＝同順位（1, 1, 3 方式） | PASS |
| 先着は同順位内の表示順にのみ効く | PASS（提出順を入れ替えても順位は不変） |
| 1,000人・137種（決定131 §6-2 の実測規模） | PASS（順位の種類数＝スコアの種類数） |

---

## 9. 障害テスト（Step 9）

| 障害 | 挙動 |
|---|---|
| DB接続失敗 | 例外として上がる（握りつぶして「成功」にしない）→ HTTP層が500へ変換 |
| statement timeout（57014） | 同上 |
| 主キー違反（23505・同じrun） | `duplicate` として正常に処理 |
| CHECK違反（23514・上限超過） | `attempts-exceeded` |
| `attempt_no` 競合（23505） | 数え直して再試行。上限＋1回で打ち切り、**無限ループしない** |
| 未知のSQLSTATE（42P01 等） | 握りつぶさず投げ直す |
| 不正な ReplayInput / stale Daily / 改ざん run / 4回目 | すべて拒否し、**DBへ書き込まない** |
| 拒否メッセージ | 接続情報・SQL・ホスト名を含まない（テストで固定） |

### 9-1. DB障害でゲームは壊れない

ランキングは「決着後に控えを送るだけ」の後付けの仕組みで、**対局の進行・保存・再開はランキングを知りません**。
サーバーが落ちていても：

- 対局は普通に進み、セーブ・再開も従来どおり
- 行動ログの控え（`pendingRuns`）は残り、次回の再送で拾われる
- クライアントは kill switch が閉じている限り、そもそも通信しない

---

## 10. 秘密情報監査（Step 10）

### 10-1. 実在のギャップを1件発見・修正

**`.gitignore` が `.env` を除外していませんでした。** `*.local` はありましたが、
`.env` / `.env.production` は拾えません。CEO が接続文字列を `.env` に置いた場合、
**commit されうる状態**でした。次を追加し、実際に `git check-ignore` で無視されることを確認しました：

```
.env
.env.*
!.env.example
*.pem
*.key
```

### 10-2. 監査結果（tracked files 全体 ＋ `src` 全ソース）

| 検査 | 結果 |
|---|---|
| `DATABASE_URL=<値>` の commit | **0件** |
| `.env` 系ファイルの tracked | **0件** |
| 接続文字列（postgres:// 等）の tracked | **0件** |
| Neon エンドポイント・ロールパスワード・APIキー・Bearer・秘密鍵・AWSキー | **0件** |
| クライアントバンドルへの混入 | **0件**（`daily_runs`・`attempt_no`・`RANKING_DATABASE_URL` いずれも不在） |
| console へ接続情報を出す記述 | **0件** |
| docs 内の秘密情報 | **0件**（本書の例示はすべて `<接続文字列>` のプレースホルダ） |
| 接続情報の読み取り箇所 | **1か所のみ**（実DB統合テスト。`process.env` 経由でのみ読む） |

サーバー実装（`postgresStore.ts`）は接続情報を**受け取りません**（SQL実行関数を注入される側）。
これらはすべて `secrets.test.ts` が機械検査しており、**検出しても値は出力しません**（ファイル名とパターン名のみ）。

---

## 11. Preview（Step 11）

**実施していません。** Vercel の有料plan変更が未承認であり、Preview Function を動かすこと自体が
現在の利用条件上どう扱われるかを CEO が確認中のためです（CEO 指示④）。
Production URL には一切触れていません。**ローカル＋（将来の）Neon 実DB だけで本Gateは成立します。**

---

## 12. 回帰（Step 12）

| 項目 | 結果 |
|---|---|
| `tsc -b` | **PASS** |
| `oxlint` | **PASS**（警告2件は `scripts/phase3-audit/` の既存・無関係） |
| `npx vitest run` | **241 files / 2,937 passed ＋ 13 skipped 全PASS**（Phase 4.3は 237 / 2,908。**+4ファイル・+29テスト＋実DB 13件はskip**） |
| clean build | **PASS**（1.53s） |
| Phase 4.0 harness | parity 7/7 PASS・`out/*.json` md5 **完全一致＝再simulationなし** |
| Phase 4.1 / 4.2 / 4.3 | 全テスト PASS |

### バンドル

| | Phase 4.3 | Phase 4.4 |
|---|---|---|
| CSS | `index-CDbAuk7l.css` | **同一** |
| JS | `index-CLjXu-bP.js` 383,570 B | **同一ハッシュ・同一バイト数** |

**バンドルは1バイトも変わっていません。** Phase 4.4 の作業はすべてサーバー側で、
クライアントへは一切届きません。

### ゲーム本体

`src/core` / `src/components` / `src/hooks` / `src/core/data/rules.ts` の差分は**すべて 0**。
Daily seed・3回制限・JST reset・saveVersion(9)・score式・神balance いずれも無変更です。

変更したのは `src/server/**` と `.gitignore` だけです。

---

## 13. Failure Gate

| NO-GO条件 | 判定 |
|---|---|
| 並列submitで4件以上入る | **無し**（2/3/4/10並列＋最悪条件で常に3件） |
| idempotency破損 | **無し** |
| client score保存 | **無し**（型・実装・テストの3層で遮断） |
| secret漏洩 | **無し**（むしろ `.gitignore` のギャップを塞いだ） |
| DB障害でゲーム不能 | **無し**（ランキングは対局に触れない） |
| ランキング規則不一致 | **無し**（`assignRanks` を必ず通す） |
| Productionへ誤公開 | **無し**（deploy・push・merge いずれも未実施） |
| 有料契約発生 | **無し**（アカウント作成にも到達していない） |
| Vercel plan変更 | **無し** |
| 既存Daily仕様変更 | **無し** |

> ## 判定：**コード面は PASS ／ 実DB検証は未実施（Step 1 ブロック）**
>
> Phase 4.4 の本来の目的である「Neon 実DB での検証」は**達成していません**。
> Failure Gate はすべてクリアしていますが、それは「実DBで壊れないことを確認した」という意味ではなく
> 「実DBで壊れない設計になっており、そう検証できる状態が整った」という意味です。

---

## 14. Known Risks

1. **実DB未検証。** Postgres の制約が期待どおり働くこと（CHECK/UNIQUE の SQLSTATE、
   `INSERT ... SELECT` の原子性、Neon serverless ドライバの挙動）は**未確認**。
   §1-2 の手順で確認できる状態にはなっている。
2. **Neon serverless ドライバの API 形（`neon(url)(text, params)`）は未検証。**
   ドライバのバージョンによって呼び出し形が異なる場合、`postgres.integration.test.ts` の
   `connect()` を数行直す必要がある。`SqlExecutor` を注入する設計なので影響はそこだけに閉じる。
3. **`attempt_no` 再試行の上限**は `attemptsPerDay + 1` 回。極端な競合が続くと
   正当な提出が `attempts-exceeded` になりうる（3並列程度では起こらない）。
4. **`daily_runs` の剪定が運用タスク未設定。** `buildPruneSql` は用意したが、
   定期実行の仕組み（cron / Vercel Cron）は未設定。Free Plan のストレージは
   1日あたり最大3行×参加者数と極小なので当面問題にならない。
5. **匿名IDは端末単位**（Phase 4.3 から継続）。localStorage を消せば3回制限を回避できる。
6. **クライアントの送信は kill switch で閉じたまま**。UI接続・送信タイミングは未実装。
7. **Phase 4.2 から継続**：記録できないrun・途中離脱の告知UI未実装／実機QA未実施。
8. **寿楽の G1 FAIL** は別Balance Patchとしてbacklog。
9. `useGameEngine.ts` の `setStakeResult(null)` 重複は未修正（cleanup backlog）。

---

## 15. 次にやること

| # | やること | 前提 |
|---|---|---|
| 1 | Neon Free プロジェクト作成 → 接続文字列 | **CEO の操作**（§1-2） |
| 2 | 実DB検証（13件）を実行し、Known Risk 1・2 を潰す | 1 |
| 3 | `api/` の薄いラッパー ＋ `submissionEnabled = true` | Vercel 利用条件の確認（CEO 指示④） |
| 4 | ランキングUI（同順位・同点人数・パーセンタイル） | `assignRanks`（実装済み） |
| 5 | 実機QA → Production 公開 | **CEO 承認（§6-3 #8）** |

---

## 16. 実DB検証の実行結果（2026-09-08・Step 1 ブロック解除後）

- **区分**：AI判断（CLAUDE.md §6-2）。CEO は Secrets監査・実DB再監査・回帰の実施を承認。merge / push / deploy / Vercel変更 / Production API有効化はいずれも**禁止指示のもと未実施**
- **接続情報の扱い**：接続文字列は環境変数 `RANKING_DATABASE_URL` としてシェルにのみ渡し、**ファイル・docs・commit のいずれにも書いていない**。本書にも値は記載しない
- **接続先**：Neon Free（pooled connection・TLS必須）

### 16-1. 実DB統合テスト（Known Risk 1・2 の解消）

`src/server/ranking/postgres.integration.test.ts` を実DBに対して実行：

| 項目 | 結果 |
|---|---|
| Test Files | **1 passed (1)** |
| Tests | **13 passed / 1 skipped (14)** |
| Duration | 14.45s |

skip 1件は `describe.skipIf(enabled)`（実DB有効時は動かない「スキップ理由」ブロック）であり、**想定どおりの挙動**。実DB本体の13件は全PASS。

これにより Known Risk を2件解消した：

| Known Risk | 従前 | 現在 |
|---|---|---|
| 1. 実DB未検証（CHECK/UNIQUE の SQLSTATE、`INSERT ... SELECT` の原子性、Neon ドライバ挙動） | 未確認 | **解消**。実DB13件で確認済み |
| 2. Neon serverless ドライバの API 形（`neon(url)(text, params)`）未検証 | 未確認 | **解消**。`f5c5aba` の修正形で実DB動作を確認 |

### 16-2. 全体回帰（実DB有効のまま実行）

| 項目 | 結果 |
|---|---|
| `npx vitest run` | **241 files passed / 2,949 passed ＋ 1 skipped（計2,950）** 76.83s |
| `npx tsc -b` | **PASS**（exit 0） |
| `npx oxlint` | **PASS**（exit 0。警告2件は `scripts/phase3-audit/` の既存・Phase 4.4 と無関係） |
| clean build（`dist`・`*.tsbuildinfo` 削除後に `npm run build`） | **PASS**（2.33s） |

§12（DB無効時）との差分は**説明可能な範囲に完全に一致**している：

| | §12（DB無効） | §16（DB有効） | 差 |
|---|---|---|---|
| passed | 2,937 | **2,949** | **+12** |
| skipped | 13 | **1** | **−12** |
| 合計 | 2,950 | 2,950 | **0** |

実DBブロックの13件が skip→pass、プレースホルダ1件が pass→skip。**新規failure・新規skipはゼロ**。

DB接続を読むテストは実質 `postgres.integration.test.ts` の1本のみであることも再確認した
（`concurrency.test.ts` はコメントでの言及、`secrets.test.ts` は**検知用パターン**としての出現）。

### 16-3. バンドル（クライアント無変更の再確認）

| | Phase 4.3 / 4.4 記録 | 今回の clean build |
|---|---|---|
| CSS | `index-CDbAuk7l.css` 96.42 kB | **同一** |
| JS | `index-CLjXu-bP.js` 383,570 B | **同一ハッシュ・同一バイト数** |

`dist` に対する混入検査も実施し、`neon.tech` / `RANKING_DATABASE_URL` / `neondb` / `connectionString` / `npg_` の**いずれも0件**。クライアントへは一切届いていない。

### 16-4. Secrets 監査（再実施・値は非表示）

| 検査範囲 | 手法 | 結果 |
|---|---|---|
| 作業ツリー全体（`node_modules` / `.git` 除く） | 実credentialの完全一致検索（パスワード・エンドポイント・ホスト） | **0件** |
| git履歴 全132コミット・全ref | `git log --all -S`（pickaxe）×3パターン | **0件** |
| git履歴 全132コミット・blobレベル | 認証情報付きURL形式 `postgres(ql)?://user:pass@` の総当たり | **0件** |
| git履歴 全132コミット・blobレベル | 高リスクトークン形式（`npg_` / `sk-` / `ghp_` / `AKIA` / `xox*`） | **0件** |
| `.env` 系ファイル | ディスク実在・`git ls-files` | **ディスク上に存在せず・tracked 0件** |
| `.gitignore` | `.env` / `.env.*` / `*.pem` / `*.key` / `*.local` | **設定済み**（§10-1 の対応が有効） |
| stash / reflog | `git stash list` | **0件** |
| クライアントバンドル | `dist` 混入検査 | **0件**（§16-3） |

`neon.tech` を含む5ファイル（`docs/DECISIONS.md`・`docs/PHASE4_NEON_DB_VALIDATION.md`・`replayBoundary.test.ts`・`failure.test.ts`・`rankingBoundary.test.ts`）はいずれも**プレースホルダまたは検知用パターン**であり、実エンドポイントとは一致しない（完全一致検索で0件）。

`src/server/ranking/secrets.test.ts` の `npg_` は**値ではなく検知用の正規表現**。同ファイルは「srcに接続文字列が埋め込まれていない」「接続情報は環境変数からしか読まない」「クライアント側へ入り込む経路が無い」「ログへ出す記述が無い」を機械検査する常設ガードとして機能している。

> **結論：旧credential はコード・docs・git履歴のいずれにも含まれていない。** 露出はチャット経路のみであり、リポジトリ側の対処は不要。

### 16-5. credential ローテーション（CEO承認済み・未実施）

CEO判断により、現行の Neon ロールパスワードは**露出済み資格情報**として扱い、**Production公開前に必ずローテーション**する。

**ローテーション後、以下を再実行して同一結果を確認するまで Phase 4.4 を Final PASS としない：**

```
npx vitest run src/server/ranking/postgres.integration.test.ts
# 期待値： Test Files 1 passed / Tests 13 passed | 1 skipped (14)
```

新しい接続文字列も `.env` に置かず、環境変数としてのみ渡すこと（`.gitignore` は設定済みだが、そもそも書かないのが最も安全）。

### 16-6. 依存関係の状態（**自動修正は行っていない**）

`npm audit` の結果は以下のとおり。CEO指示により `npm audit fix` および脆弱性の自動修正は**実行していない**。

| 項目 | 内容 |
|---|---|
| 検出 | **1 high** — `nanoid` < 3.3.18（GHSA-2v37-7h3g-55p8。size=0 のカスタムジェネレータが無限ループしうる） |
| 依存経路 | `vite@8.2.0` → `postcss@8.5.25` → `nanoid@3.3.16` |
| production 到達性 | **無し**。`npm ls nanoid --omit=dev` は空（= devDependency 経由のビルド時のみ） |
| 出荷物への影響 | **無し**。`dist` はビルド成果物であり `nanoid` を同梱しない |
| AI判断 | **Phase 4.4 の GO/NO-GO 条件にしない**。ビルド時限定かつ本番依存に到達しないため。`vite` の upstream 更新に追随する形で解消するのが正道で、`npm audit fix` による強制上書きは vite/postcss のツリーを壊すリスクの方が大きい |

`@neondatabase/serverless` は **devDependency** に置かれており、クライアントバンドルにも production 依存にも入らない（§16-3 と整合）。

---

## 17. Production Security / Fairness Gate（**次Phaseの Gate 候補**・本Phaseでは実装しない）

CEO指示により、以下は **Phase 4.4 に混ぜて大改修せず**、次Phaseの独立Gateとして整理する。
いずれも「技術的に動くか」ではなく「**公開して不正・不公平が起きないか**」を問う項目であり、Phase 4.4 の実DB技術Gateとは別物である。

| # | Gate項目 | 現状 | 想定される破られ方 | 次Phaseで問うこと |
|---|---|---|---|---|
| **PSF-1** | 匿名identityの不正リセット／偽装対策 | 匿名IDは端末単位（localStorage）。Known Risk 5 として既知 | localStorage を消すだけで新規プレイヤーとして再登録でき、3回制限を無限に回避できる。他人の `playerId` を騙る経路は `BAD_IDENTITY` で塞いであるが、**自分を増やす**のは塞げていない | サーバー側で identity を発行・署名するか、コストを非対称にする（proof-of-work／レート制限／端末指紋）。完全防御は不可能なので**「どこまでを許容するか」の線引きを先に決める** |
| **PSF-2** | 3 attempts/day を「提出回数」ではなく**実プレイ開始時点**で保証できるか | DB制約（`CHECK (attempt_no BETWEEN 1 AND 3)` ＋ `UNIQUE (daily_key, player_id, attempt_no)`）は**提出**に対して効いている | プレイは何度でもでき、**良い結果が出た3回だけを提出**できる（実質的な引き直し無制限）。現行設計は「3回提出」であって「3回勝負」ではない | 開始時に枠を確保する設計（start API で `attempt_no` を先取り）に変えるか、現行の「best of 3 submissions」を仕様として明示するか。**ゲーム性の根幹に触れるため §6-3 #1 該当の可能性あり** |
| **PSF-3** | rules / game version の固定 | `saveVersion(9)`・`RULES` はクライアント側に存在。ランキングは replay 検証を通す | バランス調整で `RULES` を変えると、**同一 daily_key の過去スコアと新スコアが比較不能**になる。replay 検証も旧ruleでは再現しなくなる | ランキング行に `rulesVersion` を持たせ、異なるバージョンを同一ボードで混ぜない。または daily_key に rulesVersion を含める |
| **PSF-4** | 日付跨ぎ提出 | `dailyKeyOf()` による JST reset は実装済み。stale Daily の提出は拒否される | 23:59 に開始して 00:01 に提出した場合の帰属、端末時計の改変、サーバー時刻との乖離 | 「開始時刻の daily_key」と「提出時刻の daily_key」の不一致をどう扱うか（許容窓／開始時刻をサーバー発行にする）を決めて固定する |
| **PSF-5** | rate limit / abuse 対策 | 無し。`api/` 自体が未作成 | 提出エンドポイントへの大量リクエスト、Neon Free のクォータ枯渇（= 実質DoS）、`daily_runs` の肥大化 | IP/identity 単位のレート制限、Vercel 側の保護、`buildPruneSql` の定期実行（Known Risk 4）をセットで設計する |

> **AI判断**：PSF-2 は「best of 3 submissions」と「3回勝負」でゲーム体験が本質的に変わるため、
> 実装着手前に **CEO判断（§6-3 #1）** を仰ぐ必要があると考える。他の4項目は §6-2 の範囲で設計・実装可能。

---

## 18. 判定（2026-09-08 時点）

| Gate | 判定 |
|---|---|
| Phase 4.4 実DB技術Gate | **暫定 PASS**（実DB13件・全体回帰・型・lint・clean build すべて通過） |
| Phase 4.4 Final PASS | **未達**。credential ローテーション後の再実行（§16-5）が条件 |
| Production Release | **NO-GO**。§17 の PSF-1〜5 が未監査であり、CEO指示により明示的に NO-GO とする |

merge / push / deploy / Vercel変更 / Production API有効化：**いずれも未実施**。branch は `feat/daily-ranking-phase4` を維持。
