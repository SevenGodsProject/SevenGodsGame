# v1.0.5 Production Smoke（決定285 PRODUCTION LIVE）

> **結論：PASS — v1.0.5 PRODUCTION LIVE**（2026-10-24・PM）。
> - PR #5 は CEO が merge：merge commit `a96a409`・2026-10-23T23:47:00Z
> - master のツリーは承認済み RC `77c2195` と一致
> - master CI：run 40041578951 success
> - Vercel Production：deployment **`7291166485`** success
> - Rollback 先は `7283378458`（v1.0.4）を維持・未使用

| S | 項目 | 結果 |
|---|---|---|
| 配信物 | JS／CSS | `index-BkzgPXaH.js` 475,991 B＝RC build と sha の正規化後に byte 一致・CSS 完全一致・忠次などの未承認機能の文字列 0 |
| S1 | 起動・version | `v1.0.5 (a96a409)` ALL PASS |
| S2 | 受入（回帰） | 44/44 |
| S3 | 戦闘・敗北画面 | 18/18 |
| S4 | 再戦比較（Stage B） | PC・SP375・SP390 とも前回比あり・横はみ出し 0・Primary 初期可視・JS error 0 |
| S5 | 旧セーブ互換（v1.0.4 build → Production） | 44/44 |
| S6 | Break SE・揺れ（probe） | PC 20/20（魔獣で half・quarter の SE 2 回）・SP375 19/20 |

**WARN**
1. SP375 の 4 戦では quarter の崩しが起きなかった（half から一気に撃破）。シナリオの網羅不足で、SE の回数・速度・時刻差は SP でも PASS。quarter は PC で確認済み（同じ build）
2. 揺れの実時間：headless 描画の遅れ（RC Gate W2 と同じ）
3. 溜め予告中の half：実画面では未観測（RC Gate W1 と同じ）

証跡：`docs/evidence/v1_0_5-production-smoke/`。
