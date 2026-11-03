# v1.1.0 Production Smoke — 将軍家 第二陣（岡っ引き・直政・康政・決定288 W2・2026-11-03）

> **状態：ALL PASS（本番 URL 直撃・headless Chromium・1 browser 直列）。製品異常 0・Rollback 不要。** master = origin/master **`72025ae`**（PR #11・CEO merge 2026-11-03T00:15:29Z）→ master CI `41551556420` success → Vercel Production **`7506844432`** success（00:16:21Z）。決定289 の運用（push・PR・CI・Smoke は AI、merge は CEO）。

## 1. 配信物（S0）

| 項目 | 結果 |
|---|---|
| JS | `index-BHsQ7ZzN.js` **485,398 B**（v1.0.7 481,166 → +4,232 B）。埋め込み `72025ae`。**sha 正規化後、W2 build（`index-BzZnWX0-.js`・Gate 対象 runtime）と byte 一致**。文字列 `采配を崩す`・`猛り・一文字`・`十手・乱打`・`roundDamageAtLeast` あり |
| CSS | `index-CT4lzcIP.css` **201,976 B**＝W2 build と同一ハッシュ |
| 新 asset | `enemies/{okappiki,naomasa,yasumasa}/art.webp`・`backgrounds/stages/{09,10,11}-*.webp` の 6 本すべて HTTP 200・byte 一致 |
| version 表示 | package version は 1.0.6 のまま（Home `v1.0.6 (72025ae)`。次の version bump で揃える） |

## 2. Smoke 結果（`docs/evidence/v1_1_0-production-smoke/`）

| S | 項目 | 結果 |
|---|---|---|
| S2 | 回帰受入（確定文言・version・敵カード 12 枚・pc／sp375） | **44/44 PASS**・JS error 0 |
| S5 | 公開 受入（12 枚・将軍家 4 名・見出し・注記 chip 4・Pilot 0／忠次戦 battleSave→続きから→records／康政 R3「あと24で采配を崩す」→R4 采配・総崩し 260／直政 R3「一文字を止める」→R4 猛り・一文字 220） | **192/192 PASS**・JS error 0 |
| S6 | 忠次 probe normal（seed 3 × pc／sp375） | **6/6 MATCH**（v1.0.6 Smoke S6 基準） |
| S8 | 旧セーブ互換（master＝v1.0.6 build :4195 で作った A／B セーブ → **本番 URL**） | **44/44 PASS**（Home「続きから」・残り回数・戦績・復元盤面・battleSave 差分 0・他キー改変 0・JS error 0・外部通信 0） |

- 既存 7 体の決定論・Daily・49 盤・seed・gameVersion：W2 Gate（cf2 8/8・★監査 指数一致・golden）で機械証明・bundle byte 一致
- v1.0.7 Smoke で UNVERIFIED だった S8（本番 URL 直撃）は、本 Smoke で **PASS**（旧セーブ A／B は同じ手順・同じ v1.0.6 build から作成）＝v1.0.7→v1.1.0 の save 互換も本番で確認

## 3. UNVERIFIED

1. 本番 iOS 実機（CEO Human QA 3 戦は W2 preview :4197 で PASS。本番 URL では未実施）
2. a11y 69・hardening 9・cf2 決定論の本番再実行（bundle byte 一致のため W2 Gate の結果を採用）

## 4. 次

- 決定288 W2 を **PRODUCTION LIVE** として `docs/DECISIONS.md`・`docs/RELEASE_STATUS.md`（A-0000）に記録（本 commit）→ PR（merge は CEO）
- W3（影・くノ一・鬼半蔵）は別 branch で実装済み（`feat/w3-shogunate-wave3`）→ Gate → PR
