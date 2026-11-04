# v1.1.4 Production Smoke — 将軍家 敵演出 品質向上（10 体横断・表示のみ・決定288 W6・2026-11-04）

> **状態：PASS（S0 bundle 一致／S2 44／S5 228／S6 6 MATCH／S8 44・本番 URL 直撃・headless Chromium・1 browser 直列）。製品異常 0・Rollback 不要。** master = origin/master **`8af0082`**（PR #19 merge・2026-11-04T13:49:40Z・CEO 操作）→ CI run `41841665058` success → Vercel Production **`7547769021`** success（13:50:28Z）。決定288 v1.1 §10-3 の 6 wave（W1〜W6）が全て LIVE＝最終スコープの実装完了。最終 Release Gate は `docs/FINAL_RELEASE_GATE_V1_1.md`。

## 1. 配信物（S0）

| 項目 | 結果 |
|---|---|
| Production URL | https://seven-gods-game.vercel.app/ → HTTP 200 |
| JS | `index-CwO8p6YY.js` **492,733 B**（v1.1.3 492,682 → +51 B）。埋め込み `8af0082`。**sha 正規化後、W6 Gate build（`index-BwV2EshF.js`・埋め込み `11dd335`）と byte 一致** |
| CSS | `index-BI3ZCUzF.css` **212,461 B**＝W6 Gate build と同一ハッシュ・byte 一致（`shogunateWave6.css` を含む） |
| 新 asset | なし（W6 は CSS と `data-tactic` 属性のみ・画像の追加／改変 0） |
| version 表示 | package version **1.1.4**（Home `v1.1.4 (8af0082)`・S2 で検証） |

## 2. Smoke 結果（`docs/evidence/v1_1_4-production-smoke/`）

| S | 項目 | 結果 |
|---|---|---|
| S2 | 回帰受入（v1.0.3 以降の確定文言・version `v1.1.4 (8af0082)`・敵カード 18 枚・pc／sp375） | **44/44 PASS**・JS error 0・外部通信 0 |
| S5 | 公開 受入（pc／sp375 × 通常／旧 `?pilot=shogunate`／`?pilot=threat`：18 枚（threat 19）・将軍家 10 名・見出し 1・注記 chip 10・Pilot 0／忠次戦 battleSave→続きから／ドーマン R3→R4 逆さ五重塔／康虎 R3「将軍の威を止める」→R4 将軍の威） | **228/228 PASS**・JS error 0 |
| S6 | 忠次 probe normal（seed 3 × pc／sp375） | **6/6 MATCH**（v1.1.3 本番 Smoke S6 基準：R1〜R4 intent・帯・HP・glow・「あと N」文言が一致）・errors 0・W6 の溜め drop-shadow あり |
| S8 | 旧セーブ互換（master＝v1.0.6 build `localhost:4197` で作った A／B セーブ → 本番 URL） | **44/44 PASS**（本番 URL 直撃。Daily 残り回数・復元の round／HP／手札・battleSave 以外 4 キー不変・JS error 0・外部通信 0） |

- S8 は 4 回目で成立。1 回目は `rc-pc-normal` の console に `net::ERR_NETWORK_CHANGED`（開発機のネットワーク切替・43/44・復元の状態チェック自体は PASS）、2〜3 回目は base を `127.0.0.1:4197` にしたときの初回 navigation で Bash sandbox 由来の `net::ERR_NETWORK_ACCESS_DENIED`（W6 Gate G6 と同じ事象）。base を `localhost:4197`（preview 既定 host）にして 44/44。失敗ログは `s8-stdout.run1〜run3-fail-*.txt` に保存。製品側の問題ではない
- 既存 7 体・将軍家 10 体の決定論：最終 Gate の 7 神 × 10 体 × normal／hard 140 組（W6 Gate build＝本番 bundle と byte 一致）140/140（`docs/FINAL_RELEASE_GATE_V1_1.md` §4-1）。cf2 8/8・a11y 69・hardening 10・Threat 74 は W6 Gate（同一 bundle）
- console error／外部通信：S2・S5・S6・S8 で JS error 0・外部オリジン通信 0

## 3. UNVERIFIED（PASS 扱いにしない）

1. 本番 iOS 実機（CEO Human QA は W6 preview :4198 で Q1／Q2 PASS。本番 URL での通しは `docs/FINAL_RELEASE_GATE_V1_1.md` §6 C1〜C10）
2. a11y 69・hardening 10・cf2 決定論・Threat 74 の本番再実行（bundle byte 一致のため省略）
3. Rollback 演習（Promote）は未実施（CEO 操作・最終 Gate §5）

## 4. 証跡

`docs/evidence/v1_1_4-production-smoke/`：json／txt を commit（S2 `s2-acceptance.json`・S5 `s5-acceptance.json`・S6 `s6-probe-normal/probe.json`＋`s6-COMPARE_VS_V1_1_3_SMOKE.txt`・S8 `s8-save-migration.json`＋失敗ログ 3 本）。png は commit しない。

## 5. 次

- 決定288 W6 を **PRODUCTION LIVE**、最終 Release Gate v1.1 を `docs/DECISIONS.md`・`docs/RELEASE_STATUS.md`（A-00000000・A-4 K40〜K47 凍結案）に記録（本 commit・docs-only）→ PR（merge は CEO）
- CEO 操作：K40〜K47 凍結の承認／拒否・Rollback 演習（Promote 2 回・AI が Smoke で確認）・tag `v1.1.4`（任意）・運営報告書 `docs/OPERATIONS_REPORT_V1.md` の共有
