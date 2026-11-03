# v1.1.3 Production Smoke — 将軍家 最終・十七代将軍・康虎 Boss ★5（決定288 W5・2026-11-04）

> **状態：PASS（S2 44／S5 228／S6 6 MATCH／S8 44・本番 URL 直撃・headless Chromium・1 browser 直列）。製品異常 0・Rollback 不要。** master = origin/master **`11dd335`**（PR #17・CEO merge 2026-11-03T20:34:32Z。PR #16 v1.1.2 LIVE 記録は #17 に同梱済みのため同時に MERGED）→ master CI `41713835469` success → Vercel Production **`7530012443`** success（20:37:28Z）。決定289 の運用（push・PR・CI・Smoke は AI、merge は CEO）。CEO Human QA は W5 preview :4199（康虎 1 戦）の案内後に CEO が merge を実行（merge をもって CEO Gate 通過と解釈。QA 所見の明示報告は未受領）。**これで将軍家 10 体の公開が完了（敵 18 体）。**

## 1. 配信物（S0）

| 項目 | 結果 |
|---|---|
| Production URL | https://seven-gods-game.vercel.app/ → HTTP 200 |
| JS | `index-3bbx8noM.js` **492,682 B**（v1.1.2 491,101 → +1,581 B）。埋め込み `11dd335`。**sha 正規化後、W5 Gate build（`index-Dc6IP1lD.js`・埋め込み `f4828cf`）と byte 一致**（差分は埋め込み sha の 7 byte のみ・正規化後 sha256 `875cb1825b0c53df…` 両者一致）。文字列 `十七代将軍・康虎`・`将軍の威`・`穢土の裁き`・`近習の槍` あり |
| CSS | `index-DyYCyOuG.css` **208,959 B**＝W5 Gate build と同一ハッシュ・byte 一致（`shogunateWave5.css` の enemy_18 黒金層を含む） |
| 新 asset | `enemies/yasutora/art.webp`（72,062 B）・`backgrounds/stages/17-yasutora-throne.webp`（187,116 B）の 2 本とも HTTP 200・repo と byte 数一致 |
| version 表示 | package version **1.1.3**（Home `v1.1.3 (11dd335)`・S2 で検証） |

## 2. Smoke 結果（`docs/evidence/v1_1_3-production-smoke/`）

| S | 項目 | 結果 |
|---|---|---|
| S2 | 回帰受入（v1.0.3 以降の確定文言・version `v1.1.3 (11dd335)`・敵カード 18 枚・pc／sp375） | **44/44 PASS**・JS error 0・外部通信 0 |
| S5 | 公開 受入（pc／sp375 × 通常／旧 `?pilot=shogunate`／`?pilot=threat`：18 枚（threat 19）・将軍家 10 名・見出し 1・注記 chip 10・Pilot 0／忠次戦 battleSave→続きから→records／ドーマン R3「共鳴あと4で五重塔を止める」→R4 逆さ五重塔 240／**康虎 R3「あと N で将軍の威を止める」→R4 将軍の威 320**） | **228/228 PASS**・JS error 0 |
| S6 | 忠次 probe normal（seed 3 × pc／sp375） | **6/6 MATCH**（v1.1.2 Smoke S6 基準：R1〜R4 intent・帯・HP・glow・「あと N」文言が一致）・errors 0 |
| S8 | 旧セーブ互換（master＝v1.0.6 build :4195 で作った A／B セーブ → 本番 URL） | **44/44 PASS**（本番 URL 直撃。Daily 残り回数・復元の round／HP／手札／topbar／daily タグ・battleSave 以外の 4 キー不変・JS error 0・外部通信 0・api 0） |

- 既存 7 体・将軍家 9 体の決定論・Daily・49 盤・seed・gameVersion・save v9：W5 Gate（`docs/W5_SHOGUNATE_WAVE5_GATE.md`・cf2 8/8・★監査 指数一致・golden・balanceSim 決定287）で機械証明。本番 bundle は Gate 対象 runtime と byte 一致のため、本番で再実行していない項目（cf2・a11y 69・hardening 10・Threat 74）は Gate の結果を採用
- console error／外部通信：S2・S5・S6・S8 で JS error 0・外部オリジン通信 0（受入内）

## 3. UNVERIFIED（PASS 扱いにしない）

1. 本番 iOS 実機（CEO Human QA は W5 preview :4199 の案内後に merge。本番 URL では未実施・QA 所見の明示報告は未受領）
2. a11y 69・hardening 10・cf2 決定論・Threat 74 の本番再実行（bundle byte 一致のため省略）
3. 康虎の本番ブラウザ戦闘は S5 の threat 経路（R3 tactic line armed → R4 else「将軍の威」）のみ。then 経路（近習の槍）と R7 2 段目（穢土の裁き）は Gate の vitest（engine 経路）・Preflight sim・★監査で検証済み

## 4. 証跡

`docs/evidence/v1_1_3-production-smoke/`：json／txt を commit（S2 `s2-acceptance.json`・S5 `s5-acceptance.json`・S6 `s6-probe-normal/probe.json`＋`s6-COMPARE_VS_V1_1_2_SMOKE.txt`・S8 `s8-save-migration.json`・各 stdout）。画像（webp／png）はローカルのみ。

## 5. 次

- 決定288 W5 を **PRODUCTION LIVE** として `docs/DECISIONS.md`・`docs/RELEASE_STATUS.md`（A-0000000）に記録（本 commit・docs-only）→ PR（merge は CEO）
- W6（敵演出 品質向上・10 体横断・表示のみ・v1.1.4）を決定288 v1.1 §10-3 に従い別 branch で自律開始（READ-ONLY 監査で各敵 1 点を選定 → 実装・Gate・PR 作成まで。merge・Production 公開は CEO Gate）→ 最終 Release Gate → 運営報告書
