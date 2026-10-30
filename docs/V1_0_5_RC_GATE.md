# v1.0.5 RC Gate（決定285 候補）

> **状態（2026-10-24・PM・AI 判断）：READY FOR CEO PRODUCTION RELEASE APPROVAL**。branch `release/v1_0_5-rc`・Gate HEAD `ca7840c`（以後は docs のみ）。push／merge／deploy 0。重いテストは直列。

## 結論：GO（FAIL 0・WARN 4）

| Gate | 結果 |
|---|---|
| Human QA（CEO iPhone） | 8/8 PASS（`docs/V1_0_5_HUMAN_QA.md`） |
| tsc／oxlint／vitest／build | 0／新規 0／**1,578 PASS**／`index-S5PX1Ko7.js` 475.99 kB（`1.0.5`／`ca7840c`） |
| 決定論・セーブ | `src/core` 差分 0（gameVersion・save v9 不変）・replay 84 PASS・storage／乱数／時刻の追加 0 |
| セキュリティ | Ranking Absence PASS・Secret PASS・PR 差分の credential 0・混入 0 |
| Home version | `v1.0.5 (ca7840c)` |
| 受入／敗北画面 | 44/44／18/18 |
| Stage B（G8） | PC 1 行・SP 2 行・横はみ出し 0・Primary 初期可視 |
| SE・揺れ probe | PC 23/23・SP375 24/24 |
| 旧セーブ（v1.0.4 Production → RC） | 44/44 |
| Retention | SP 15/15・PC 12/15 → G4c 再実行 1 回 PASS（下記 W3） |
| AC12 | 1/1 |
| SP 本文 | overflow 0（126 枚）・外枠は Known 同型 |

## WARN
1. W1：溜め予告中の half は鳴らさない条件 → 実画面では未観測（単体テストで固定）
2. W2：揺れの実時間 → headless 7〜22fps による遅れ。被弾との相対時刻（40／90ms）は一致・Human QA PASS
3. W3：PC の初陣 G4c → 自動操作が負ける回がある（seed 未固定）。NR1 のコードは v1.0.4 から差分 0・勝った回は PASS
4. W4：結果画面の出現時刻 → PC の中央値の差 +185ms（測定値の範囲は重なる）・SP は ±50ms 以内。結果ゲートの値は単体テストで不変

## 本番 v1.0.4（`35a7f91`）との差分
170 files。src は 16 files（+651／−10）：Stage B・Break SE・揺れ・version とテスト。scripts 5 本（QA のみ）。依存の変更は version のみ。push は約 8.9 MB（新規 branch 1 段で可）。

## Rollback
deployment `7283378458`（v1.0.4）。storage 形式は不変。
