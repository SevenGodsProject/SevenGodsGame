# v1.1.5 Production Smoke — 将軍家 9 体の戦闘背景（舞台画像）復元 Hotfix（決定288・2026-11-05）

> **状態：PASS（S0 bundle 一致／本番 stage-bg-probe 34/34／S2 44/44・本番 URL 直撃・headless Chromium・1 browser 直列）。製品異常 0・Rollback 不要。** master = origin/master **`01ffc94`**（PR #23 merge・2026-11-05T10:27:23Z・CEO 操作）→ CI run `42010850426` success → Vercel Production **`7571139748`** success（10:28:10Z）。**v1.1 完成宣言は CEO Human QA（iPhone・本番）まで保留。**

## 1. 配信物（S0）

| 項目 | 結果 |
|---|---|
| Production URL | https://seven-gods-game.vercel.app/ → HTTP 200 |
| JS | `index-BSquymkM.js` **492,733 B**（v1.1.4 と同サイズ）。埋め込み `01ffc94`・`1.1.5`。**sha 正規化後、Hotfix Gate build（`index-Cx9pXbN3.js`・`docs/V1_1_5_STAGE_BG_HOTFIX_GATE.md` §4）と byte 一致** |
| CSS | `index-CtARvCu4.css` **213,029 B**＝Hotfix Gate build と同一ハッシュ・byte 一致（v1.1.4 212,461 → +568 B＝Wave2〜5 の `.battle-main` 規則に舞台画像層を併記した分） |
| 新 asset | なし（既存の舞台 10 枚 `backgrounds/stages/08〜17` をそのまま使用。画像の追加／改変 0） |
| version 表示 | package version **1.1.5**（Home `v1.1.5 (01ffc94)`・S2 で検証） |

## 2. Smoke 結果（`docs/evidence/v1_1_5-production-smoke/`）

| S | 項目 | 結果 |
|---|---|---|
| stage-bg | `scripts/release-audit/stage-bg-probe.mjs`（大耀 × 17 体 × pc 1508×660／sp375 375×667・`.battle-main` の計算済み background-image に `backgrounds/stages/NN-*.webp` が含まれるか） | **34/34 画像あり**（本番 v1.1.4 では 16/34＝将軍家 9 体（enemy_10〜18）が画像なし → 本 Hotfix で 9 体とも復元）・JS error 0 |
| S2 | 回帰受入（v1.0.3 以降の確定文言・version `v1.1.5 (01ffc94)`・敵カード 18 枚・pc／sp375） | **44/44 PASS**・JS error 0・外部通信 0 |

- stage-bg と S2 は 2 回目で成立。1 回目（10:30〜10:35Z）は stage-bg の後半 7 件（sp375・康政〜康虎）で開発機のネットワーク切替（`net::ERR_NETWORK_CHANGED` → `ERR_NAME_NOT_RESOLVED`・到達した 27 件は全て画像あり）、直後の S2 は初回 navigation で同じ理由により開始できず＝製品側ではない（v1.1.4 Smoke S8 と同種）。接続復旧（HTTP 200）を確認して全体を再実行し 34/34・44/44。1 回目の json／stdout も `*-run1-network-transient*` として保存
- S5 228／S6 6 MATCH／cf2 8 MATCH は Hotfix Gate（本番 bundle と byte 一致）で実施済み（`docs/V1_1_5_STAGE_BG_HOTFIX_GATE.md` §4）。本番での再実行は省略
- 画面（jpeg）：`screens/` に本番の 将軍家（岡っ引き enemy_10・康虎 enemy_18）と既存（龍神 enemy_06・忠次 enemy_08）の pc／sp375 を保存（8 枚）。全 34 枚は scratchpad

## 3. UNVERIFIED（PASS 扱いにしない）

1. **本番 iOS 実機（CEO Human QA）**：将軍家（岡っ引き／康虎ほか）の戦闘で舞台画像が見え、周辺減光との重なりの視認性に問題がないこと。本 Hotfix で初めて本番に出る見た目のため必須 → 完成宣言の再開は CEO 判断
2. S5／S6／cf2 の本番再実行（bundle byte 一致のため省略）

## 4. 証跡

`docs/evidence/v1_1_5-production-smoke/`：json／txt／jpg を commit（stage-bg `stage-bg-probe.json`＋`stage-bg-stdout.txt`・S2 `s2-acceptance.json`＋`s2-stdout.txt`・`screens/prod-*.jpg` 8 枚・1 回目の `stage-bg-run1-network-transient.json`＋stdout 2 本）。png は commit しない。

## 5. 次

- 決定288 v1.1.5 Hotfix を **PRODUCTION LIVE** として `docs/DECISIONS.md`・`docs/RELEASE_STATUS.md`（A-000000000）に記録（本 commit・docs-only）→ PR（merge は CEO）
- CEO Human QA（iPhone・本番 URL）→ PASS なら v1.1 完成宣言の再開を CEO が判断（AI は宣言しない）
