# v1.1.1 Production Smoke — 将軍家 第三陣（影・くノ一・鬼半蔵・決定288 W3・2026-11-03）

> **状態：PASS（S2 44／S5 210／S6 6 MATCH・本番 URL 直撃・headless Chromium・1 browser 直列）。S8 旧セーブは本番 URL で未完走（UNVERIFIED・同一 runtime の W3 Gate G6b 44/44 を採用）。製品異常 0・Rollback 不要。** master = origin/master **`ee4f187`**（PR #13・CEO merge 2026-11-03T01:31:06Z。直前に PR #12 v1.1.0 LIVE 記録 `c91e7f1`・docs-only）→ master CI `41560245476` success → Vercel Production **`7507971142`** success（01:31:50Z）。決定289 の運用（push・PR・CI・Smoke は AI、merge は CEO）。

## 1. 配信物（S0）

| 項目 | 結果 |
|---|---|
| Production URL | https://seven-gods-game.vercel.app/ → HTTP 200 |
| JS | `index-BnKHkokd.js` **488,352 B**（v1.1.0 485,398 → +2,954 B）。埋め込み `ee4f187`。**sha 正規化後、W3 build（`index-DNBBJmQ3.js`・Gate 対象 runtime・埋め込み `72025ae`）と byte 一致**（差分は埋め込み sha の 7 byte のみ）。文字列 `闇討ち`・`影走り`・`鬼嶽・血風`・`鬼嶽・頭領斬り` あり |
| CSS | `index-DeaC83I8.css` **205,014 B**＝W3 build と同一ハッシュ・byte 一致（`enemy_13〜15` の光層を含む） |
| 新 asset | `enemies/{kage,kunoichi,onihanzo}/art.webp`・`backgrounds/stages/{12-kage-village,13-kunoichi-moonpath,14-onihanzo-fort}.webp` の 6 本すべて HTTP 200・repo と byte 数一致 |
| version 表示 | package version は 1.0.6 のまま（Home `v1.0.6 (ee4f187)`。次の version bump で揃える） |

## 2. Smoke 結果（`docs/evidence/v1_1_1-production-smoke/`）

| S | 項目 | 結果 |
|---|---|---|
| S2 | 回帰受入（v1.0.3 以降の確定文言・version・敵カード 15 枚・pc／sp375） | **44/44 PASS**・JS error 0 |
| S5 | 公開 受入（pc／sp375 × 通常／旧 `?pilot=shogunate`／`?pilot=threat`：15 枚・将軍家 7 名・見出し 1・注記 chip 7（SP375 でカード内）・Pilot 0／忠次戦 battleSave→続きから→records／康政 R3「あと24で采配を崩す」→R4 采配・総崩し／鬼半蔵 R3「血風を止める」→R4 鬼嶽・血風） | **210/210 PASS**・JS error 0 |
| S6 | 忠次 probe normal（seed 3 × pc／sp375） | **6/6 MATCH**（v1.1.0 Smoke S6 基準：R1〜R4 intent・帯・HP・glow・「あと N」文言が一致）・errors 0 |
| S8 | 旧セーブ互換（master＝v1.0.6 build :4195 で作った A／B セーブ → 本番 URL） | **本番 URL では未完走（UNVERIFIED・§3）**：headless Chromium から v1.0.6 側のローカル preview へ到達できず（`ERR_NETWORK_ACCESS_DENIED`・localhost／LAN IP／background の 3 回・curl は 200）。同一 runtime（bundle byte 一致）に対する W3 Gate G6b **44/44 PASS** を採用 |

- 既存 7 体の決定論・Daily・49 盤・seed・gameVersion・save v9：W3 Gate（`docs/W3_SHOGUNATE_WAVE3_GATE.md`・cf2 8/8・★監査 指数一致・golden）で機械証明。本番 bundle は Gate 対象 runtime と byte 一致のため、本番で再実行していない項目（cf2・a11y 69・hardening 9）は Gate の結果を採用
- console error／外部通信：S2・S5・S6 で JS error 0・外部オリジン通信 0（受入内）

## 3. UNVERIFIED（PASS 扱いにしない）

1. 本番 iOS 実機（CEO Human QA 3 戦は W3 preview :4198 で実施・merge 承認。本番 URL では未実施）
2. a11y 69・hardening 9・cf2 決定論の本番再実行（bundle byte 一致のため省略）
3. **S8 旧セーブ互換の本番 URL 実行**：v1.1.0 Smoke では同じ手順で 44/44 PASS したが、本セッションの headless Chromium は localhost／LAN IP いずれにも到達できなかった（v1.0.7 Smoke と同じ事象。原因は実行環境側のネットワーク制限と推定・runtime の問題ではない）。W3 Gate で同一 runtime に対し 44/44 PASS（`docs/evidence/shogunate-wave3/save-migration/`）。v1.0.7→v1.1.0 の本番直撃 PASS 実績があり、v1.1.0→v1.1.1 は engine 変更 0・save v9 不変

## 4. 証跡

`docs/evidence/v1_1_1-production-smoke/`：json／txt を commit（S8 は失敗ログ `s8-stdout.txt`）。画像（webp）はローカルのみ。

## 5. 次

- 決定288 W3 を **PRODUCTION LIVE** として `docs/DECISIONS.md`・`docs/RELEASE_STATUS.md`（A-00000）に記録（本 commit・docs-only）→ PR（merge は CEO）
- W4（忠勝・ドーマン）を決定288 v1.1 §10-3 に従い別 branch で自律開始
