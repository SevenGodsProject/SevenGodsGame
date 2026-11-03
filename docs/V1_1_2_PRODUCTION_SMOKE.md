# v1.1.2 Production Smoke — 将軍家 第四陣（忠勝・ドーマン・決定288 W4・2026-11-03）

> **状態：PASS（S2 44／S5 222／S6 6 MATCH／S8 44・本番 URL 直撃・headless Chromium・1 browser 直列）。製品異常 0・Rollback 不要。** master = origin/master **`f4828cf`**（PR #15・CEO merge 2026-11-03T13:34:09Z。直前に PR #14 v1.1.1 LIVE 記録 `390f7fe`・docs-only・13:30:51Z）→ master CI `41645496710` success → Vercel Production **`7520160454`** success（13:34:57Z）。決定289 の運用（push・PR・CI・Smoke は AI、merge は CEO）。CEO Human QA は W4 preview :4199 で 2 戦 PASS（Q1 忠勝・Q2 ドーマン）済み。

## 1. 配信物（S0）

| 項目 | 結果 |
|---|---|
| Production URL | https://seven-gods-game.vercel.app/ → HTTP 200 |
| JS | `index-C3B3nwXw.js` **491,101 B**（v1.1.1 488,352 → +2,749 B）。埋め込み `f4828cf`。**sha 正規化後、W4 Gate build（`index-IPcNdBFC.js`・埋め込み `ee4f187`）と byte 一致**（差分は埋め込み sha の 7 byte のみ）。文字列 `1.1.2`・`将軍四天王・忠勝`・`科学者・ドーマン`・`蜻蛉切・一閃`・`逆さ五重塔・反転` あり |
| CSS | `index-99EWKury.css` **207,296 B**＝W4 Gate build と同一ハッシュ・byte 一致（`shogunateWave4.css` の enemy_16／17 光層を含む） |
| 新 asset | `enemies/{tadakatsu,doman}/art.webp`（86,924／97,884 B）・`backgrounds/stages/{15-tadakatsu-bastion,16-doman-pagoda}.webp`（126,740／280,220 B）の 4 本すべて HTTP 200・repo と byte 数一致 |
| version 表示 | package version **1.1.2**（Home `v1.1.2 (f4828cf)`・S2 で検証）。v1.0.7 以降据え置いていた表示を本リリースで揃えた |

## 2. Smoke 結果（`docs/evidence/v1_1_2-production-smoke/`）

| S | 項目 | 結果 |
|---|---|---|
| S2 | 回帰受入（v1.0.3 以降の確定文言・version `v1.1.2 (f4828cf)`・敵カード 17 枚・pc／sp375） | **44/44 PASS**・JS error 0・外部通信 0 |
| S5 | 公開 受入（pc／sp375 × 通常／旧 `?pilot=shogunate`／`?pilot=threat`：17 枚（threat 18）・将軍家 9 名・見出し 1・注記 chip 9・Pilot 0／忠次戦 battleSave→続きから→records／ドーマン R3「共鳴あと4で五重塔を止める」→R4 逆さ五重塔 240） | **222/222 PASS**・JS error 0 |
| S6 | 忠次 probe normal（seed 3 × pc／sp375） | **6/6 MATCH**（v1.1.1 Smoke S6 基準：R1〜R4 intent・帯・HP・glow・「あと N」文言が一致）・errors 0 |
| S8 | 旧セーブ互換（master＝v1.0.6 build :4195 で作った A／B セーブ → 本番 URL） | **44/44 PASS**（本番 URL 直撃。v1.1.1 Smoke で到達できなかった localhost preview に今回は到達。Daily 残り回数・復元の round／HP／手札／topbar／daily タグ・battleSave 以外の 4 キー不変・JS error 0・外部通信 0・api 0） |

- 既存 7 体の決定論・Daily・49 盤・seed・gameVersion・save v9：W4 Gate（`docs/W4_SHOGUNATE_WAVE4_GATE.md`・cf2 8/8・★監査 指数一致・golden）で機械証明。本番 bundle は Gate 対象 runtime と byte 一致のため、本番で再実行していない項目（cf2・a11y 69・hardening 9・Threat 74）は Gate の結果を採用
- console error／外部通信：S2・S5・S6・S8 で JS error 0・外部オリジン通信 0（受入内）

## 3. UNVERIFIED（PASS 扱いにしない）

1. 本番 iOS 実機（CEO Human QA 2 戦は W4 preview :4199 で実施・merge 承認。本番 URL では未実施）
2. a11y 69・hardening 9・cf2 決定論・Threat 74 の本番再実行（bundle byte 一致のため省略）
3. 忠勝（enemy_16）の本番ブラウザ戦闘（S5 の戦闘対象はドーマン 1 戦。忠勝は tactic なし＝既存 charge→special 経路のみで、Gate の公開受入・cf2・★監査で検証済み）

## 4. 証跡

`docs/evidence/v1_1_2-production-smoke/`：json／txt を commit（S8 は `s8-save-migration.json`・`s8-stdout.txt`）。画像（webp／png）はローカルのみ。

## 5. 次

- 決定288 W4 を **PRODUCTION LIVE** として `docs/DECISIONS.md`・`docs/RELEASE_STATUS.md`（A-000000）に記録（本 commit・docs-only）→ PR（merge は CEO）
- W5（康虎 Boss ★5・将軍家 最終 1 体）を決定288 v1.1 §10-3 に従い別 branch で自律開始（実装・Gate・PR 作成まで。merge・Production 公開は CEO Gate）
