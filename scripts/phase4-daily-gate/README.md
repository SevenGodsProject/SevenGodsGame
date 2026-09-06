# Phase 4.0 — Daily Ranking Competitive Gate 用 分析スクリプト

**用途：** 2026-09 Phase 4.0（Daily をオンライン総合ランキングとして公開してよいかの数値検証）専用の
分析ハーネス。本番コード（`src/`）には一切触れず、`src/core` の実エンジン（`applyAction`）と
**本番UIが呼ぶのと同じ `resolveDailyStart()`** を import して決定論シミュレーションを回し、
結果を `scripts/phase4-daily-gate/out/` に書き出す。

- `npm test` / `vitest run` の対象外（拡張子 `.audit.ts`、専用config `vitest.audit.config.ts`）
- 実行：`npx vitest run --config scripts/phase4-daily-gate/vitest.audit.config.ts`
- 個別：`npx vitest run --config scripts/phase4-daily-gate/vitest.audit.config.ts scripts/phase4-daily-gate/gate.audit.ts`

| file | 内容 |
| --- | --- |
| `dailyHarness.ts` | 共通：Daily条件の1試合ランナー（`resolveDailyStart` をそのまま使う）、heuristic 3戦略＋探索AI 4プロファイル、legalデッキ生成、Wilson 95%CI 等の統計ユーティリティ |
| `parity.audit.ts` | **Step 2 の検証**：ハーネスが本番Dailyと同一条件であること（seed・週次巡回・×1.25/×1.15・神階なし・JST境界・決定論）を機械的に確認 |
| `gate.audit.ts` | **本体**：Step 3 Matrix／Step 4 G1・G2／Step 5 Tie Density／Step 6 God Dominance／Step 7 Three Attempts／Step 8 bonusCopies paired |
| `diagnostics.audit.ts` | **追補**：D1 同点密度の人数感応度／D2 二次tie-break候補／D3 G1 FAIL の原因分解／D4 最小修正案の再simulation／D5 優位の順位換算 |
| `pilot.audit.ts` | 速度計測（サンプル数決定用） |
| `out/` | 各監査の出力（`*.md` 要約・`*.json` 生データ） |

**Daily条件の再現方針（重要）：** 開始条件をハーネス側で組み立てることを禁じ、
`resolveDailyStart(dateKey)` の戻り値をそのまま `START_GAME` へ渡す。
「通常モードの神階0の結果を Daily の代用にしない」という Phase 4.0 の前提は、この設計で構造的に担保される。

**データ差し替えについて：** `diagnostics.audit.ts` の D4 のみ、プロセス内で `GODS` の
`resonanceEffects` を一時的に差し替えて修正案を比較する（テスト終了時に必ず復元し、`expect` で確認する）。
本番データファイルは変更しない。

監査報告は `docs/PHASE4_DAILY_RANKING_COMPETITIVE_GATE.md`。
