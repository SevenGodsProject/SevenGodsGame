# Phase 4.7 — DB Migration Gate（Design & Dry Run）

Phase 4.4 schema（Neon に適用済み）→ Phase 4.6 schema（run ticket / day-lock / game_version）への
**forward migration package**。本 Gate では Neon 本番へ**接続も適用もしない**。

- 情報源は `migration.ts` のみ。`sql/*.sql` は生成物（`dryrun.audit.ts` が書き出す）
- Dry Run は **PGlite（PostgreSQL 18.3 を WASM でプロセス内実行）** 上で行う＝本物の Postgres
- 実行：`npx vitest run --config scripts/phase47-migration/vitest.audit.config.ts`
- 適用手順：`RUNBOOK.md`／戻し方：`ROLLBACK.md`／監査報告：`docs/PHASE4_7_DB_MIGRATION_GATE.md`

| file | 内容 |
|---|---|
| `migration.ts` | forward migration（8文）・preflight・postflight・制約名 |
| `pgliteHarness.ts` | PGlite ハーネス。Phase 4.4 schema（git 9ebbfd6）を固定して持つ |
| `dryrun.audit.ts` | A 空DB／B 4.4のみ／C legacy あり／D 途中再実行／E 完了後再実行、制約の実挙動、本番コードでの並列・上限・void・day-lock、preflight/postflight の正負、integration readiness（30件） |
| `apply.mjs` | 次Gate用の適用ツール。`--apply` 無しでは DDL を流さない。接続文字列は出力しない |
| `sql/` | 生成された SQL（接続情報・エンドポイントを含まない） |
