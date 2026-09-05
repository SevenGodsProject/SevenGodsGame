# Phase 3「神格」Step 1 — Current Code/Data Audit 用 分析スクリプト

**用途：** 2026-09 Phase 3 Step 1（7神プレイスタイル差別化の定量監査）専用の分析ハーネス。
本番コード（`src/`）には一切触れず、`src/core` の実エンジン（`applyAction`）を import して
決定論シミュレーションを回し、結果を `scripts/phase3-audit/out/` に書き出す。

- `npm test` / `vitest run` の対象外（拡張子 `.audit.ts`、専用config `vitest.audit.config.ts`）
- 実行：`npx vitest run --config scripts/phase3-audit/vitest.audit.config.ts`
- 個別：`npx vitest run --config scripts/phase3-audit/vitest.audit.config.ts scripts/phase3-audit/static.audit.ts`

| file | 内容 |
| --- | --- |
| `harness.ts` | 共通：計測付き1試合ランナー（イベント→指標）、既存balanceSim互換の3戦略AI、1R先読み探索AI（プレイスタイル・プロファイル） |
| `static.audit.ts` | 60カード・7神・OTOMO・共鳴・神託の静的構造解析（effect構成、条件/連鎖の有無、AP効率、デッキ内共鳴総量 等） |
| `baseline.audit.ts` | 7神×7敵×神階{0,1,3,5,7}×3戦略 の基礎指標（勝率・スコア・BURST頻度/到達R・Draw/AP/Block/Heal・ダメージ構成・OTOMO進化R・託宣R） |
| `playstyle.audit.ts` | 探索AI×5プロファイルで「神を変えると最適プレイスタイルが変わるか」を計測。God×Card 使用率マトリクス、報酬3択の神別分岐率 |
| `juraku.audit.ts` | 寿楽の強さを God burst / デッキ / debuff / OTOMO / 神階modifier / 敵相性へ分解する ablation |
| `smoke.audit.ts` | ハーネスの動作確認・速度計測（pilot） |
| `out/` | 各監査の出力（`*.md` 要約・`*.json` 生データ・`*.log`）。監査報告は `docs/PHASE3_STEP1_GOD_AUDIT.md` |

**注意：** `juraku.audit.ts` はプロセス内でのみ `GODS`/`OTOMOS` のデータオブジェクトを一時差し替えて比較する（テスト終了時に復元）。
本番データファイルは変更しない。
