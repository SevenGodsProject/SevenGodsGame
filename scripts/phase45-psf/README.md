# Phase 4.5 — Production Security & Fairness Gate 用 検証ハーネス

**用途：** 2026-09 Phase 4.5（Daily ランキングを公開した場合に不正・不公平・運用事故が成立する経路の監査）専用。
本番コード（`src/`）には一切触れず、設計（`docs/PHASE4_5_PSF_GATE.md`）を**リファレンスモデル**として
書き下し、状態遷移を機械検証する。あわせて本番エンジンで「提出回数制限」の脆弱さを定量化する。

- `npm test` / `vitest run` の対象外（拡張子 `.audit.ts`、専用config `vitest.audit.config.ts`）
- 実行：`npx vitest run --config scripts/phase45-psf/vitest.audit.config.ts`

| file | 内容 |
| --- | --- |
| `ticketModel.ts` | **リファレンスモデル**：client-held secret（PSF-1）、run ticket の状態機械と `startRun` / `submitRun` の手順（PSF-2/3/4）、書き込み回数の計測（PSF-5）。本番へ持ち込む際の対応関係はファイル冒頭に記載 |
| `ticket.audit.ts` | 状態機械の検証 37件：正常3プレイ／4回目start／二重start／並列start（割り込み強制）／reload／resume／通信断／submit retry／期限切れ／23:59→00:01／複数端末／偽装／deploy跨ぎ／書き込み量 |
| `retryInflation.audit.ts` | PSF-2 定量：全7神 × 300試合を本番エンジン＋本番記録経路で回し、best-of-k の期待値を計測。出力 `out/retry_inflation.{json,md}` |
| `out/` | 計測出力 |

**本番コードとの関係：** `ticketModel.ts` は `node:crypto` を使うため `src/server` には置かない（境界テストが外部依存を禁止している）。
実装時はモデルの手順を `src/server/ranking` へ移し、`sha256` は Web Crypto（`crypto.subtle`）に置き換える。
