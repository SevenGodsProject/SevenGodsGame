# v1.0.7 Production Smoke — 将軍家 第一陣 公開 v1（決定287・2026-11-03）

> **状態：PASS（S2 44／S5 150／S6 6 MATCH・本番 URL 直撃・headless Chromium・1 browser 直列）。S8 旧セーブは本番 URL で未完走（UNVERIFIED・同一 runtime の W1 Gate 44/44 を採用）。製品異常 0・Rollback 不要。** master = origin/master **`f7e263d`**（PR #9・CEO merge 2026-11-02T22:58:07Z）→ master CI `41541637863` success → Vercel Production **`7505565396`** success（22:58:55Z）。決定289 の運用（push・PR・CI・Smoke は AI、merge は CEO）で実施。

## 1. 配信物（S0）

| 項目 | 結果 |
|---|---|
| Production URL | https://seven-gods-game.vercel.app/ → HTTP 200 |
| JS | `index-ha74wdvd.js` **481,166 B**（v1.0.6 481,118 → +48 B）。埋め込み `f7e263d`・`1.0.6`。**sha 正規化後、W1 build（`dist/assets/index-C4CSv3Pe.js`・Gate 対象 runtime）と byte 一致** |
| CSS | `index-Tat7Jjqr.css` **198,643 B**＝v1.0.6 と同一ハッシュ |
| 機能文字列 | 「攻略盤の対象外」「将軍四天王」あり／「幕府 Pilot」「enemy-shogunate-notice」**なし**（Pilot 案内の撤去を bundle で確認） |
| version 表示 | package version は 1.0.6 のまま（W1 は version bump を含まない）→ Home `v1.0.6 (f7e263d)`。次の version bump で 1.0.7 に揃える（表示の整合は RELEASE_STATUS に明記） |

## 2. Smoke 結果

| S | 項目 | 結果 | 証跡（`docs/evidence/v1_0_7-production-smoke/`） |
|---|---|---|---|
| S2 | 回帰受入（v1.0.3 以降の確定文言・Home version `v1.0.6 (f7e263d)`・敵カード 9 枚・pc／sp375） | **44/44 PASS**・JS error 0 | `s2-acceptance/`・`s2-stdout.txt` |
| S5 | 忠次 公開 受入（pc／sp375 × 通常／旧 `?pilot=shogunate`／`?pilot=threat`） | **150/150 PASS**：通常 9 枚・忠次 ★1・注記「攻略盤の対象外・戦績は残る」が SP375 でカード内／Pilot 印・案内 0／旧 URL は通常と同じ／threat は 10 枚＋印 1＋案内 1／忠次戦：battleSave → 再読込「続きから」で R1 復元 → R4 総攻め 240 → records 書込・battleSave 消去・matchups に enemy_08 なし・JS error 0 | `s5-shogunate/`・`s5-stdout.txt` |
| S6 | 忠次 probe normal（seed 3 × pc／sp375） | **6/6 MATCH**（v1.0.6 Smoke S6 基準：R1〜R4 intent・帯・HP・glow・「あと N」文言が一致）・JS error 0 | `s6-probe-normal/`・`s6-stdout.txt`・`s6-COMPARE_VS_V1_0_6_SMOKE.txt` |
| S8 | 旧セーブ互換（master＝v1.0.6 build で作った A／B セーブ → 本番） | **本番 URL では未完走（UNVERIFIED・§3）**：headless Chromium から master 側のローカル preview（localhost）へ到達できず（ERR_NETWORK_ACCESS_DENIED・4 回）。同一 runtime（bundle byte 一致）に対する W1 Gate の S8 **44/44 PASS** を根拠に採用 | `s8-stdout.txt`（失敗ログ）・W1 Gate `docs/evidence/shogunate-public-v1/save-migration/` |

- 既存 7 体の決定論・Daily・49 盤・seed・gameVersion・save v9：W1 Gate（`docs/W1_SHOGUNATE_PUBLIC_V1_GATE.md`・cf2 8/8・★監査 指数一致・golden テスト）で機械証明済み。本番 bundle は Gate 対象 runtime と byte 一致のため、本番で再実行していない項目（cf2・a11y 69・hardening）は Gate の結果をそのまま採用
- console error／外部通信：S2・S5 で JS error 0・外部オリジン通信 0（受入内）

## 3. UNVERIFIED（PASS 扱いにしない）

1. 本番 iOS 実機（CEO Human QA 2/2 は W1 preview :4195 で実施。本番 URL では未実施）
2. a11y 69・hardening 9・cf2 決定論の本番再実行（bundle byte 一致のため省略）
3. **S8 旧セーブ互換の本番 URL 実行**：master 側（v1.0.6 build）をローカル preview で配信する必要があるが、本セッションの headless Chromium は localhost へ到達できなかった（4 回・ERR_NETWORK_ACCESS_DENIED・curl は 200）。W1 Gate で同一 runtime（sha 正規化後 byte 一致）に対し 44/44 PASS

## 4. Smoke 実施上の事象

- 旧セーブ（S8）：master 側を v1.0.6 RC build のローカル preview（:4196／:4195）で配信したが、headless Chromium が localhost へ到達できず（ERR_NETWORK_ACCESS_DENIED）、本番 URL 直撃の S8 は未完走。§3 のとおり W1 Gate の結果を採用
- 6 GB 機：1 browser 直列・他の probe と同時実行なし

## 5. 証跡

`docs/evidence/v1_0_7-production-smoke/`：json／txt を commit。画像（png）はローカルのみ。

## 6. 次

- 決定287 を **PRODUCTION LIVE** として `docs/DECISIONS.md`・`docs/RELEASE_STATUS.md`（A-000）に記録（本 commit・docs-only）→ push → PR（merge は CEO）
- W2（岡っ引き・直政・康政）は本記録の後に開始（決定288 v1.1 §10-3）
