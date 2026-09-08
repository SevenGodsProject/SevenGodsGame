# Phase 4.7 — DB Migration Gate（Design & Dry Run）

- **日付**：2026-09-08
- **branch**：`feat/daily-ranking-phase4`（Phase 4.6 `9f56e45` の上に積む）
- **区分**：AI判断（CLAUDE.md §6-2）。CEO指示「KAGURA / Phase 4.7」に基づく
- **やっていないこと**：Neon 本番への接続・DDL実行・migration適用・データ削除・merge・push・deploy・Vercel変更・Production API有効化
- **成果物**：`scripts/phase47-migration/`（migration package＋Dry Run 30件）、本書、決定141

---

## 0. 結論

| Gate | 判定 |
|---|---|
| MIG-1 schema差分 | **PASS** |
| MIG-2 legacy data互換 | **PASS**（Known Risk 1 の運用条件つき） |
| MIG-3 constraint correctness | **PASS** |
| MIG-4 migration idempotency | **PASS** |
| MIG-5 rollback safety | **PASS**（logical rollback。destructive は CEO承認事項） |
| MIG-6 integration readiness | **CONDITIONAL PASS**（順序依存。Neon 実機は次Gate） |
| MIG-7 secrets safety | **PASS** |
| **総合** | **READY FOR CEO APPROVAL**（適用は次Gate。本Gateでは禁止） |

Dry Run は **PGlite（PostgreSQL 18.3 / WASM）＝本物の Postgres** 上で 30/30 PASS。
Neon 実機では未検証（接続禁止のため）。

---

## 1. Current schema（Phase 4.4、git `9ebbfd6` の `schema.ts` から確定）

| table | columns | constraints | index |
|---|---|---|---|
| `players` | `player_id` PK, `created_at`, `attempt_day`, `attempt_count` | `players_pkey` | — |
| `daily_runs` | `daily_key`, `player_id`, `client_run_id`, `attempt_no`, `god_id`, `score`, `win`, `round`, `rng_cursor`, `action_count`, `submitted_at` | `daily_runs_pkey (daily_key, client_run_id)`, `daily_runs_attempt_range CHECK 1..3`, `daily_runs_attempt_unique (daily_key, player_id, attempt_no)`, `daily_runs_player_id_fkey`（自動命名・CASCADE） | `daily_runs_board_idx (daily_key, score DESC, submitted_at ASC)` |

Phase 4.4 の実DB検証（決定138）でこの schema が Neon に適用され、テスト行は `afterAll` で削除済み。
本Gateは **legacy 行が存在する前提**で設計した。

## 2. Target schema（Phase 4.6、現行 `schema.ts`・`postgresStore.ts` が期待する形）

| table | 追加/変更 |
|---|---|
| `daily_days` | **新規**：`daily_key` PK, `game_version` NOT NULL, `created_at` |
| `daily_tickets` | **新規**：`daily_key`, `player_id`, `client_run_id`, `attempt_no`, `issued_at`, `expires_at`, `game_version`, `closed_reason` |
| `daily_runs` | `game_version text NOT NULL` **追加**、`daily_runs_ticket_fk (daily_key, client_run_id) → daily_tickets` **追加** |
| `players` | 無変更 |

CEO指示の「`daily_tickets.created_at`」は Phase 4.6 実装では **`issued_at`**（発行時刻）が同じ役割を担う。
実装と完全一致させる方針により列名は `issued_at` のまま（追加列は作らない）。

## 3. schema diff（機械検証済み）

`Phase 4.4 DDL → migration` と `Phase 4.6 fresh DDL` の **列・制約・index が完全一致**（Dry Run B）。
唯一の意図的な差：migration 由来の `daily_runs_ticket_fk` は `convalidated = false`（NOT VALID）。

## 4. legacy data strategy — 1案

**FK を `NOT VALID` で追加する。** legacy 行は検査対象外のまま残り、新規・更新行だけが縛られる。

| 却下案 | 理由 |
|---|---|
| legacy 行を削除 | 禁止（データ削除）。ランキング履歴を壊す |
| legacy 行に偽 ticket を生成 | 「開始時に枠を予約した」という事実が無いのに ticket を捏造することになる。監査可能性を損なう |
| FK を付けない | Phase 4.6 の不変条件③（run は必ず ticket を持つ）が DB で守られない |

## 5. gameVersion backfill — 1案

**番兵値 `legacy-4.4` を backfill して NOT NULL にする。**

| 却下案 | 理由 |
|---|---|
| NULL 許容のまま | `postgresStore.toRun` が `string` を期待。NULL は実行時型不整合になり、src 変更が要る |
| 現行 `gameVersion` を backfill | Phase 4.6 以前の run を現在の版で検証した結果として**偽装**することになる（CEO禁止事項） |

番兵値は `<整数>.<16進16桁>` の形式から外れており、現行版と決して一致しない（Dry Run C で機械確認）。
リーダーボードは版で filter しないため legacy 行は従来どおり表示される。

## 6. migration 順序（8文・1トランザクション）

| # | 文 | 理由 |
|---|---|---|
| 1 | `CREATE TABLE IF NOT EXISTS daily_days` | 親テーブルを先に |
| 2 | `CREATE TABLE IF NOT EXISTS daily_tickets`（制約名すべて明示） | FK 先を先に |
| 3 | `CREATE UNIQUE INDEX IF NOT EXISTS daily_tickets_attempt_unique … WHERE closed_reason IS DISTINCT FROM 'voided'` | 部分UNIQUE |
| 4 | `ALTER TABLE daily_runs ADD COLUMN IF NOT EXISTS game_version text` | NULL許容・DEFAULT無し＝メタデータのみ、テーブル書き換え無し |
| 5 | `UPDATE daily_runs SET game_version = 'legacy-4.4' WHERE game_version IS NULL` | legacy 行だけ埋める |
| 6 | `ALTER COLUMN game_version SET NOT NULL` | 全行が埋まってから |
| 7 | `DO $$ … ADD CONSTRAINT daily_runs_ticket_fk … NOT VALID` | `pg_constraint` を見てから追加＝冪等。既存行は検査しない |
| 8 | `CREATE INDEX IF NOT EXISTS daily_runs_board_idx` | 4.4 で既存。無ければ作る |

順序を崩すと：4→6 を先にすると NULL 違反で止まる／7 を先に付けると legacy 行で即失敗。
ロック：ADD COLUMN（nullable, no default）と ADD CONSTRAINT NOT VALID は短い ACCESS EXCLUSIVE のみ。SET NOT NULL は全行走査だが行数は極小。

## 7. constraint 一覧（名前は `schema.ts` の `CONSTRAINT_NAMES` と `migration.ts` の `NAMES` で一致をテスト）

| table | name | 内容 |
|---|---|---|
| daily_days | `daily_days_pkey` | PK (daily_key) |
| daily_tickets | `daily_tickets_pkey` | PK (daily_key, client_run_id) |
| daily_tickets | `daily_tickets_attempt_range` | CHECK attempt_no BETWEEN 1 AND 3 |
| daily_tickets | `daily_tickets_closed_reason_check` | CHECK closed_reason IN ('abandoned','voided') |
| daily_tickets | `daily_tickets_daily_key_fkey` | FK → daily_days CASCADE |
| daily_tickets | `daily_tickets_player_id_fkey` | FK → players CASCADE |
| daily_runs | `daily_runs_pkey` / `_attempt_range` / `_attempt_unique` / `_player_id_fkey` | 4.4 から継続 |
| daily_runs | `daily_runs_ticket_fk` | FK (daily_key, client_run_id) → daily_tickets CASCADE **NOT VALID** |

## 8. index 一覧

| name | 定義 |
|---|---|
| `daily_tickets_attempt_unique` | UNIQUE (daily_key, player_id, attempt_no) WHERE closed_reason IS DISTINCT FROM 'voided' |
| `daily_runs_board_idx` | (daily_key, score DESC, submitted_at ASC) |
| PK/UNIQUE 由来 | `players_pkey`, `daily_days_pkey`, `daily_tickets_pkey`, `daily_runs_pkey`, `daily_runs_attempt_unique` |

## 9. FK 設計

- `daily_tickets → daily_days` CASCADE：`daily_days` を消せばその日の ticket と run が消える（剪定の1点入口）
- `daily_tickets → players` CASCADE、`daily_runs → players` CASCADE（4.4 継続）
- `daily_runs → daily_tickets` CASCADE・NOT VALID：legacy 行を許容。`VALIDATE CONSTRAINT` は legacy 行が剪定で消えたあと（別途判断）

## 10. concurrency safety（SQL レベル）

| 不変条件 | 守るもの | Dry Run |
|---|---|---|
| 非voided ≤ 3 | `daily_tickets_attempt_range` + 部分UNIQUE（番号は 1..3 しか存在せず、非voided 同士は同番号を取れない） | 4枠目 → 23514（制約名で判別） |
| open ≤ 1 | アプリ手順（放棄→発行）＋部分UNIQUE。DB単独では表現しない（postflight で監査） | 並列start×10 → 進行中1 |
| 同 clientRunId は1枚 | `daily_tickets_pkey` | 23505 pkey |
| voided の返還 | 部分UNIQUE の WHERE 句 | void → 同番号を再取得 |
| run は ticket を持つ | `daily_runs_ticket_fk` | ticket無し INSERT → 23503 |
| 同 ticket に run は1件 | `daily_runs_pkey` + `daily_runs_attempt_unique` | 同ticket submit×4 → 保存1 |
| day-lock | `daily_days_pkey` + `ON CONFLICT DO NOTHING … UNION` | 別版 → RULES_VERSION_LOCKED |

**エラー処理の修正（本Gateで src に加えた唯一の変更）**：`postgresStore.insertTicket` は 23514 を
`daily_tickets_attempt_range` のときだけ `attempts-exceeded` とし、他の制約名なら投げ直す。
名前を載せないドライバでは消費済み枠を数えてから判断する。23505 も `includes` から**完全一致**へ。

## 11〜13. forward migration / preflight / postflight

`scripts/phase47-migration/sql/`。preflight は20項目・postflight は16項目、いずれも1つの SELECT で
(check_name, value, ok) を返す。preflight は `migration_state` を NOT_MIGRATED / MIGRATED / PARTIAL に分類し、
drift（想定外の列）・孤立行・baseline 欠落を止める。空DB（Phase 4.4 未適用）では**エラーで止まる**＝適用させない。

## 14. rollback

`ROLLBACK.md`。第一候補は **logical rollback**（kill switch OFF → 新API停止 → 旧コード互換 → schema は残す）。
旧コードは読み取りは動くが、`game_version NOT NULL` と `daily_runs_ticket_fk` のため **INSERT は失敗する**——kill switch を閉じることで吸収する。
DROP を伴う destructive rollback は CEO承認事項（§6-3 #9）。`sql/` には置かない。

## 15. Dry Run 結果（PGlite / PostgreSQL 18.3）

| シナリオ | 結果 |
|---|---|
| A 空DB | migration は失敗し**何も残らない**（ROLLBACK）。fresh DDL → migration は no-op |
| B 4.4 のみ | migration 後の列・制約・index が fresh 4.6 と**完全一致** |
| C 4.4 + legacy 4行 | 行数・内容不変、版は `legacy-4.4`、偽 ticket 0、FK NOT VALID、ボードに残る、新 run は ticket 経由のみ、直接 INSERT は 23503 |
| D 途中再実行 | 8文のどこで止まっても再実行で target と同一の形・データ保持 |
| E 完了後再実行 | transaction 経路・1文ずつ経路とも no-op |
| 制約実挙動 | CHECK/部分UNIQUE/PK/closed_reason/day-lock/CASCADE すべて期待どおり |
| 本番コード | 3枠上限・並列start×10・同ID×10・void refund・同ticket×4・day-lock |
| preflight 負 | 空DB→エラー、drift→NG、PARTIAL→NG |
| postflight 負 | 部分UNIQUE欠落／NULL／秘密列 をそれぞれ検出 |
| integration readiness | fresh DDL は migration 済みDBで no-op。未適用DBへ先に流すと壊れる（順序の根拠） |

**計 30/30 PASS。** 回帰：245 files / 3,045 passed ＋ 18 skipped、tsc / oxlint / clean build PASS、バンドル同一ハッシュ（PGlite は devDependency で bundle 混入 0）。

## 16. integration readiness

`postgres.integration.test.ts`（18件）は migration 後の schema で実行可能。`beforeAll` の fresh DDL は no-op、
テスト専用日 `2026-09-09` の `daily_days` 初期化は他の日の legacy 行に触れない。
**必ず migration → postflight → integration test の順**（RUNBOOK 手順2〜4）。Neon 実機は次Gate。

## 17. Known Risks

1. **legacy 行と同じ `daily_key`・同じ `player_id` で新 ticket を発行すると `attempt_no` が衝突**し、提出が `RUN_ID_CONFLICT` になる（Dry Run C-3 で再現）。ticket は legacy 行を数えない設計のため。→ runbook：適用は前日ボード確定後〜当日最初の挑戦前（JST 00:15〜）に行う。Phase 4.4 のテスト行は削除済みなので実害は想定されないが、preflight の `runs_day_keys` で確認する
2. **Neon HTTP ドライバの `transaction([...])` は実機未検証**。使えなければ1文ずつ流す（冪等）
3. **open ≤ 1 は DB 単独では表現できない**（アプリ手順＋postflight 監査）。並列 start の真の同時実行は PGlite では再現できず、Phase 4.6 のメモリ実装で race 強制済み
4. `VALIDATE CONSTRAINT daily_runs_ticket_fk` は legacy 行がある限り不可。剪定後に別途判断
5. PGlite を devDependency に追加（bundle 混入 0、npm audit の増分 0）

## 18〜19. 判定

§0 のとおり。**READY FOR CEO APPROVAL／Neon 適用は本Gateでは禁止のまま。**

## 20. CEO承認が必要な操作

1. Neon 本番への migration 適用（§6-3 #8・#9）— RUNBOOK 手順2
2. destructive rollback（DROP TABLE / DROP COLUMN）— 必要になった場合のみ
3. `VALIDATE CONSTRAINT daily_runs_ticket_fk`（legacy 行を消す判断を伴う）

## 21. 次Gate の実行手順

RUNBOOK.md 手順0〜5：Dry Run → preflight → 適用（SQL Editor / psql / apply.mjs）→ postflight → 実DB18件 → 記録。
