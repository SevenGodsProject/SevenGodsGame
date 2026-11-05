# v1.1.6 QW#2 Production Smoke — スマホの託宣表示 3 点（2026-11-05）

> **状態：PASS（S0 bundle 一致／S2 44/44／oracle-sp-probe 本番 SP375・SP390・PC660 文字切れ 0・本番 URL 直撃・headless Chromium・1 browser 直列）。製品異常 0・Rollback 不要。** master = origin/master **`180688e`**（PR #27 merge・2026-11-05T21:07:11Z・CEO 操作）→ CI run `42109689648` success → Vercel Production **`7585380880`** success（21:07:57Z）。**次は CEO Human QA（iPhone）→ PASS で #3 R6〜R7 のラウンド表示の強調へ。**

## 1. 配信物（S0）

| 項目 | 結果 |
|---|---|
| Production URL | https://seven-gods-game.vercel.app/ → HTTP 200 |
| JS | `index-DJXXwXQA.js` **492,860 B**（QW#1 492,771 → +89 B＝文言 3 か所）。埋め込み `180688e`・`1.1.6`。**sha 正規化後、QW#2 Gate の最終 build（`index-CEn6nbiF.js`・`docs/V1_1_6_QW2_ORACLE_SP_GATE.md` §4）と byte 一致** |
| CSS | `index-B9HvAJ6t.css` **213,138 B**＝QW#1 と同一ハッシュ・byte 一致（CSS 変更 0） |
| 新 asset | なし |
| version 表示 | package version **1.1.6**（Home `v1.1.6 (180688e)`・S2 で検証）。QW#1 と同じ 1.1.6（sha で区別） |

## 2. Smoke 結果（`docs/evidence/v1_1_6-qw2-production-smoke/`）

| S | 項目 | 結果 |
|---|---|---|
| S2 | 回帰受入（v1.0.3 以降の確定文言・version `v1.1.6 (180688e)`・Tip 数 7・Tip ③・敵カード 18 枚・pc／sp375） | **44/44 PASS**・JS error 0・外部通信 0 |
| oracle | `scripts/release-audit/oracle-sp-probe.mjs`（大耀 × 業斧の鬼将・R1・SP375／SP390／PC660＋seed `qw2-oracle-2` SP375） | SP375：候補なし **「1枚引く＋神力1」58/62px**・候補あり **「出せる札＋1」45/62px**（姉御の号令＝5 字）・**「出せる:神託」44/62px**（seed 2）＝**文字切れ 0**。SP390 も同様（枠 67px）。PC660：長い形「今なら『姉御の号令』が出せる」119px／候補なし「1枚引く＋神力1（出せる札は増えない）」165px（枠 324）。ボタンの箱 SP 74／79×39・PC 342×44（Gate と同一）。JS error 0 |

- S5 228／d264 gate-lock 14/14 は QW#2 Gate（本番 bundle と byte 一致）で実施済み。本番での再実行は省略
- 画面（jpeg）：`screens/`（本番 SP375 の候補なし／効果のみ／札名付き・PC660 の候補なし／候補あり・5 枚）

## 3. UNVERIFIED（PASS 扱いにしない）

1. **本番 iOS 実機（CEO Human QA）**：託宣バーの 3 行目（今使うとどうなるか）が読める・切れない。Tip ⑥ の文が画面と一致している
2. S5／gate-lock の本番再実行（bundle byte 一致のため省略）

## 4. 証跡

`docs/evidence/v1_1_6-qw2-production-smoke/`：json／txt／jpg を commit（S2 `s2-acceptance.json`＋`s2-stdout.txt`・oracle `oracle-sp-probe.json`＋`oracle-sp-probe-seed2.json`＋stdout 2 本・`screens/*.jpg` 5 枚）。png は commit しない。

## 5. 次

- v1.1.6 QW#2 を **PRODUCTION LIVE** として `docs/DECISIONS.md`・`docs/RELEASE_STATUS.md`（A-00000000000）に記録（本 commit・docs-only）→ PR（merge は CEO）
- CEO Human QA（iPhone・本番 URL）→ PASS で第 3 優先「R6〜R7 のラウンド表示の強調」へ（独立 PR）
