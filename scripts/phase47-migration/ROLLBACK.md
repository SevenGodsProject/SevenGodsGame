# Phase 4.7：rollback 方針

## 原則

**schema は残す。戻すのはコードと運用フラグ。** DROP は標準手順にしない。

migration は「列を足す・テーブルを足す・NOT VALID の FK を足す」だけで、既存の
`players` / `daily_runs` の行を1つも変えない（`game_version` に番兵値を埋めるのみ）。
したがって **旧コード（Phase 4.4 の `postgresStore.ts`）は migration 後の schema でも動く**：
旧コードは `game_version` を読まず、INSERT では `game_version` を指定しない——ただし
**NOT NULL のため旧コードの INSERT は失敗する**。この1点が「旧コード互換」の唯一の破れなので、
logical rollback では旧コードで INSERT を走らせない（kill switch を閉じる）ことで吸収する。

## 第一候補：logical rollback（CEO承認不要・可逆）

1. **kill switch OFF**：`RULES.ranking.submissionEnabled = false` のまま／に戻す
   → クライアントは `/start` も `/submit` も呼ばない。サーバーは 503 を返す
2. **新APIを止める**：`api/` ラッパーが存在するなら `/ranking/start` を 503 固定にする
   （Phase 4.7 時点で `api/` は存在しない）
3. **old code compatible 状態へ**：Phase 4.6 以前のコードへ戻す場合も、
   kill switch が閉じていれば旧コードは DB へ書かない（読み取りのリーダーボードは
   `game_version` 列を無視するので動く）
4. **schema はそのまま残す**：`daily_days` / `daily_tickets` / `daily_runs.game_version` /
   `daily_runs_ticket_fk` を消さない。再開時にそのまま使える

この4段で「Phase 4.6 導入前と同じ外部挙動」に戻る。データ消失はゼロ。

## 第二候補：destructive rollback（**CEO承認事項** §6-3 #9）

logical rollback で足りない場合（例：schema 自体に欠陥が見つかった）にのみ検討する。
実行前に必ず `pg_dump` 相当のバックアップを取る。Neon なら **branch を切って保全**する。

```sql
-- 参考：完全に Phase 4.4 へ戻す（データ消失あり。CEO承認後にのみ）
BEGIN;
ALTER TABLE daily_runs DROP CONSTRAINT IF EXISTS daily_runs_ticket_fk;
ALTER TABLE daily_runs DROP COLUMN IF EXISTS game_version;   -- Phase 4.6 で入った run も列だけ失う
DROP TABLE IF EXISTS daily_tickets;                           -- ticket は全消失
DROP TABLE IF EXISTS daily_days;
COMMIT;
```

上記は `sql/` には置かない（誤って流さないため）。必要になったときに CEO 承認のもと手で流す。

## 判断表

| 事象 | 対応 |
|---|---|
| migration が途中で失敗 | 再実行（冪等）。schema は触らない |
| postflight NG | Production API を開かない。原因を直して再適用 |
| 適用後にサーバーの不具合 | logical rollback（kill switch OFF）。schema はそのまま |
| schema 設計そのものの欠陥 | Neon branch で保全 → CEO承認 → destructive rollback |
