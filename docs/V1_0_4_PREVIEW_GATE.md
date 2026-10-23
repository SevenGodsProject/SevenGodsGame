# v1.0.4 Preview Gate（途中記録・2026-10-23・PM）

> **状態**：対象は branch `feat/v1_0_4-retention-bundle`、HEAD `bf683b4`。比較の基準は v1.0.3 の build（`release/v1_0_3-rc` の dist `index-C_e5frXY.js`＝Production と同じ runtime）。**G1・G2・G6・G7 は PASS**。G3・G4 は一部だけ実測済み。G4b・G3w（勝利経路）・G8・AC6・entrance-e1 は、**PC のメモリ不足で preview と Playwright がシステムに停止されたため未完了**。push・merge・deploy はしていない。Stage B は**実装していない**。

## 1. 実測結果

| G | 結果 | 根拠 |
|---|---|---|
| G1 | **PASS** | full vitest：1,544 PASS・17 skip・fail 0（v1.0.3 の 1,528＋16）。oxlint：警告 11・エラー 0（v1.0.3 と同じ件数・同じ内容）。build：JS 473.99kB・CSS 194.99kB |
| G2 | **PASS** | `src/core` の差分 0。src に追加された `setItem` 0（増えた 1 行は「setItem を呼ばない」ことを確かめるテストのアサーション） |
| G3 | **一部 PASS** | phase7-p1 の Daily 3 回を 4 viewport で実行。敗北時の verdict は「今日の問い：未解（R{n} 敗北）」。D4 は「今日の挑戦は終了。明日の問いは【耐久型】・次の敵まで HH:MM」で、SP844 では 2 行（AC9 の SP 上限 2 行以内）。勝利時の verdict（G3w）は未実測 |
| Home countdown | **PASS・期待値の変更は不要** | DOM の文言が仕様書 RETENTION_BUNDLE_V1 §3 と一致：「明日の問いは【耐久型】・次の敵まで 01:46」。残りがあるときは null（10 件）、残り 0 のときだけ表示（v1.0.3 と同じ）。phase7 の正規表現 `/次の敵まで \d\d:\d\d/` は先頭に固定されていないので変更なしで PASS（AC7 20/20）。**期待値は書き換えていない** |
| G4a | **PASS** | 初めて撃破した通常戦の勝利（4 viewport）で `next-goal[data-goal-id=NM1]`「業斧の鬼将を別の神でも攻略する（この敵 1/7 神）」と Primary「別の神で挑む」が出る。Secondary の「今日の神域挑戦へ」も残る |
| G4b／G4c | 未完了 | `scripts/v1_0_4-rc/retention-check.mjs`（2 勝目に NM1 が出ない）と entrance-e1（初陣は NR1 のまま）は、どちらも実行前または実行中に停止 |
| G6 | **PASS** | Home Today の高さは +15〜18px（1 行分）：pc1508 109→127／sp844 135→153／pc1366 112→127／sp760 135→153。3 回使い切った後も pc1508 122→140、sp844 176→194。横はみ出し 0。CTA と Primary は画面内 |
| G7 | **PASS** | runtime に新しく入った語は「今日の問い」「明日の問い」だけ。src の追加行で「失敗」「正解」「推奨」「ランキング」に当たったのは、コメント「正解の提示はしない」の 1 件だけ。bundle 中の「失敗」「推奨」は各 1 件で、v1.0.3 の bundle と同じ数 |
| G8 | 未完了 | `scripts/v1_0_4-rc/defeat-g8.mjs` は作成済み・未実行 |

### phase7-p1 受入スクリプト（旧版）の FAIL の切り分け

同じスクリプトを v1.0.3 の build にも流して比較した。

| AC | v1.0.3 | v1.0.4 | 判定 |
|---|---|---|---|
| AC6 | FAIL（0/0） | FAIL（0/0） | もともとの FAIL。`--baseline` を付けずに実行したため比較対象が 0 件になっている。`--layout-only --baseline` で再実行が必要 |
| AC12 | FAIL（0/2） | FAIL（0/2） | もともとの FAIL。Home のリンクが 3 本になっているのに、スクリプトは 2 本を想定している |
| AC2 | PASS 10/10 | FAIL 0/10 | **行の位置ずれだけが原因**。仕様（§3「best 行の上に 1 行」）のとおり、`daily-diff` の先頭に verdict 行が入り、スクリプトの `[0]` が 1 行ずれた。verdict 行を除いて判定し直すと **10/10**。ベスト行・前回行は残っている。旧スクリプトは書き換えていない |

## 2. Stage B（同じ盤面 Retry の前回比）

**判断を保留し、現 RC には自動で追加しない。** G8（敗北画面で Primary の下にどれだけ余白があるか。PC 1508×660／SP375×667／SP390×844、1 回目と 2 回目の敗北）が未実測のため。GO の条件は、2 回目の敗北で全 viewport の `slackPx ≥ 21`（1 行足しても Primary が初期の可視領域に残る）。満たさなければ v1.0.5 に回す。

## 3. 再開手順（メモリに余裕があるときに直列で 1 本ずつ）

1. `npx vite preview --port 4204 --strictPort`（retention）・`npx vite preview --port 4205 --strictPort`（lane3＝v1.0.3）
2. `node scripts/v1_0_4-rc/retention-check.mjs <out> http://localhost:4204`（G4b・G3w）
3. `node scripts/v1_0_4-rc/defeat-g8.mjs <out>/g8.json http://localhost:4204`（G8 → Stage B の GO／NO-GO）
4. `node scripts/phase7-p1/acceptance.mjs <out> http://localhost:4204 --layout-only --baseline http://localhost:4205`（AC6）
5. entrance-e1 を 4204 と 4205 で実行して比較（G4c 初陣 NR1。1 本 10 分以上かかる）

Release に向けた GO 条件（独立監査 M1〜M7：RC を 1f713d6 から作り 57584ad を合流・1.0.4 への version bump・決定284・旧セーブ互換・Rollback 先 7256475048）は、この Preview Gate とは別に RC Gate で満たす。
