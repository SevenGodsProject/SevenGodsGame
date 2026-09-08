# Phase 4.7 → 次Gate：Neon migration 適用 RUNBOOK

**本書の手順は CEO 承認（CLAUDE.md §6-3 #8・#9）後の次Gateでのみ実行する。**
Phase 4.7 では手順0〜1（読み取りのみ）だけを想定し、手順2以降は実行しない。

| file | 役割 |
|---|---|
| `migration.ts` | **唯一の情報源**。`sql/*.sql` はここから生成（`dryrun.audit.ts` が書き出す） |
| `sql/001_phase46_tickets.sql` | forward migration（psql / Neon SQL Editor 用。BEGIN〜COMMIT） |
| `sql/001_phase46_tickets.statements.json` | 同内容を1文ずつ（HTTP ドライバ用） |
| `sql/preflight.sql` | 適用前検査（読み取り専用・1つの SELECT） |
| `sql/postflight.sql` | 適用後検査（読み取り専用・1つの SELECT） |
| `apply.mjs` | preflight → 適用 → postflight を連続実行。`--apply` 無しでは DDL を流さない |
| `ROLLBACK.md` | logical rollback（第一候補）と、CEO承認が要る destructive rollback |
| `dryrun.audit.ts` | PGlite（実 Postgres）での Dry Run 30件 |

## 前提

- 接続文字列は環境変数 `RANKING_DATABASE_URL` としてシェルにのみ渡す。ファイルに書かない。ログに出さない
- `git rev-parse HEAD` が承認された commit であること
- 適用は **JST 00:15〜（前日のボードが確定したあと）〜 その日の最初の挑戦より前** に行う
  （legacy 行と同じ `daily_key` に新 ticket を発行すると `attempt_no` が衝突しうる。Known Risk 参照）
- `RULES.ranking.submissionEnabled` は **false のまま**（kill switch は閉じたまま適用する）

## 手順

### 0. Dry Run（ローカル・接続不要）

```
npx vitest run --config scripts/phase47-migration/vitest.audit.config.ts
```
30件すべて PASS であること。`sql/*.sql` がこの実行で再生成される（差分が出たら commit する）。

### 1. preflight（読み取りのみ）

```
node scripts/phase47-migration/apply.mjs
```
- `migration_state = NOT_MIGRATED` かつ全行 ok → 手順2へ
- `MIGRATED` → 既に適用済み。手順3へ
- `PARTIAL` → 前回の途中失敗。冪等なので手順2の再実行でよいが、**人が preflight の値を読んで判断**する
- NG が1つでもある／エラーで止まる → **STOP**。`runs_unexpected_columns` や `runs_orphan_rows` は手で調べる

### 2. 適用（CEO承認後）

いずれか1つ。どれも同じ SQL。

**A. Neon SQL Editor（推奨・トランザクション）**
`sql/001_phase46_tickets.sql` の内容を貼り付けて Run。エラーが出れば全体が ROLLBACK される。

**B. psql**
```
psql "$RANKING_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/phase47-migration/sql/001_phase46_tickets.sql
```

**C. apply.mjs（HTTP ドライバ）**
```
node scripts/phase47-migration/apply.mjs --apply
```
preflight → 適用 → postflight を連続実行。transaction 経路が使えなければ1文ずつ流す（冪等）。

途中で失敗したら：原因（権限・想定外の列など）を取り除き、**同じコマンドを再実行**する。
migration は冪等なので、どの地点で止まっても再実行で target に収束する（Dry Run D で確認済み）。

### 3. postflight

```
node scripts/phase47-migration/apply.mjs --postflight
```
**1行でも NG があれば Production API を開かない。** `runs_ticket_fk_validated = false` は legacy 行がある間の正常値。

### 4. 実DB統合テスト（18件）

```
npx vitest run src/server/ranking/postgres.integration.test.ts
```
期待値：`Tests 18 passed | 1 skipped (19)`。
このテストは fresh DDL（`CREATE TABLE IF NOT EXISTS`）を流すが、migration 済みDBでは no-op（Dry Run で確認済み）。
**順序を逆にしない**：未適用の Neon に先に流すと `daily_runs` に列が増えず失敗する。

### 5. 記録

`docs/DECISIONS.md` に適用日時・commit・preflight/postflight の要約（値のみ。接続情報は書かない）を追記する。

## 失敗時

`ROLLBACK.md` の logical rollback を第一候補にする。schema は残す。
DROP TABLE / DROP COLUMN は **CEO承認事項**（§6-3 #9）。
