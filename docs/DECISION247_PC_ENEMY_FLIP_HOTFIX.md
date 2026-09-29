# 決定247 — PC 敵反転 Fast Gate Hotfix

- 日付：2026-09-28
- 着手：**CEO 指示**（「PC敵反転Fast Gate Hotfixを開始してください」）。実装方式・Gate 判定は **AI 判断**（CLAUDE.md §6-2）
- 出典：決定244 §4-3（PC では敵 7 体中 4 体が神に背を向ける）・決定246 NEXT NOW
- Baseline：Production **`47940f1`**（決定246 LIVE・Vercel `6710790486`）
- 作業：worktree `C:/Users/kimi1/SevenGodsGame-d247`・branch **`hotfix/d247-pc-enemy-flip`**（`47940f1` から）・local commit **`bcfd530`**。**merge／push／deploy なし**
- 判定：**Fast Gate PASS → PRODUCTION RELEASE READY（CEO 承認待ち）**

---

## 0. 結論

| 項目 | 結果 |
|---|---|
| 変更 | `src/components/battle/battle.css` 末尾に 19 行（コメント 13 行＋規則 1 つ）。ほかのファイルは 0 |
| 規則 | `@media (min-width: 900px) { body.battle-viewport .enemy-avatar { scale: -1 1; --atk-x: -1; } }`＝決定229 v2 の SP 規則と同じ形を PC へ |
| JS | Production と内容が同一（md5 `4cbf9783…`。ファイル名だけ `index-DgQr5ePZ.js` に変化） |
| CSS | `index-C_PvVv3w.css` → `index-DRhlJuWv.css`（167.65 → 167.73 kB） |
| tsc／lint／test／build | 0／0／**1,235 PASS**（balanceSim 11 は単独）／OK |
| 向き | PC 1508×660・1280×800 の 7 敵すべてで `scale: -1 1` を確認。原画が左向きの 4 体（鬼将・機工師・龍神・道化）が神の方（右）を向く |
| 位置・大きさ | 絵の箱・神の箱の差は最大 1px（待機の呼吸アニメの採取タイミング差。CSS が変わらない SP でも同じ 1px が出る）。外側の箱は 0px |
| 着弾位置 | `.enemy-hit-layer` の箱は 21/21 で完全一致 |
| 突進の向き | Before／After とも 7 敵すべてで +x（神の方）。単発は 14〜16px、連撃（魔獣・外側の箱）は 19〜26px |
| SP | 規則は ≥900px のみ。SP 390×844 の 7 敵で `scale` は Before／After とも `-1 1`（決定229 v2 のまま） |
| console error／横スクロール | 0／なし（42 本すべて） |
| Human QA | **省略を推奨**（CSS 1 規則・決定229 v2 で CEO が Human QA PASS 済みの見た目を PC に広げるだけ・数値で完全判定済み）。省略の可否は CEO が Release 承認時に判断 |

## 1. 反転の安全性（コードで確認）

| 動き・演出 | 付いている要素 | PC での影響 |
|---|---|---|
| 待機の呼吸（enemy-idle） | `.enemy-avatar`（translateY・scale） | 上下のみ＝なし |
| 単発の突進（enemy-lunge*） | `.enemy-avatar`（`--atk-x`） | `--atk-x: -1` で打ち消し＝見た目は +x（実測で確認） |
| 連撃の突進（enemy-lunge-multi-*） | `.enemy-avatar-wrap` | 反転しない＝なし |
| 被弾・撃破 | `.enemy-reaction`・`.enemy-collapse` | なし |
| 着弾・数字・斬撃 | `.enemy-hit-layer`（兄弟） | なし（箱が完全一致） |
| 決定240 の構え | `.enemy-avatar`（filter・`translate` 縦のみ・`::after` 中央の環） | drop-shadow の x オフセットは 0、持ち上げは縦のみ、環は中央＝なし |
| 溜め・終盤 surge | filter のみ | なし |
| カットイン・ボス登場 | 別要素 | 原画の向きのまま（SP と同じ既知事項） |

## 2. Fast Gate（Playwright・ローカル build・seed `d247-gate-01`・大耀）
- Before：`47940f1` の RC build（`index-DPiBExjD.js`／`index-C_PvVv3w.css`＝Production と md5 一致）を `127.0.0.1:4471`
- After：`bcfd530` の build を `127.0.0.1:4472`
- 3 画面（PC 1508×660・PC 1280×800・SP 390×844）× 7 敵 × Before／After ＝ 42 本。各本で戦闘開始時の計測・撮影 → ラウンドを終えて敵の攻撃中の絵の中心 x を 40ms ごとに 40 回採取
- 結果：`docs/evidence/decision247/summary.tsv`・`gate.json`・PC スクリーンショット（鬼将・機工師・龍神・道化の Before／After）・スクリプト原文 `gate.mjs.txt`
- Gate 後に両サーバーを停止。ファイアウォール変更なし

## 3. Release 手順（CEO 承認後）
1. origin/master が `47940f1` のままか確認
2. `bcfd530` を origin/master へ fast-forward push（1 commit・1 ファイル）
3. Vercel Production deployment 確認・配信 CSS の md5 が `6122ab49…`（`index-DRhlJuWv.css`）と一致するか確認
4. Production Smoke：PC で 4 体が右向き・突進が神の方・SP 不変・console error 0
- rollback：Vercel `6710790486`（`47940f1`）

## 5. Production Release — **PRODUCTION LIVE / CLOSED**（Release は CEO 承認・Human QA 省略も CEO 承認）

| 項目 | 結果 |
|---|---|
| Release Gate | worktree clean・HEAD `bcfd530`・origin/master `47940f1`・差分 1 commit／`battle.css` 1 ファイル・fast-forward 可能・再 build の md5 が Fast Gate と一致・tsc 0／lint 0／1,235 PASS |
| 統合 | `git push origin bcfd530:refs/heads/master`（`47940f1..bcfd530`）→ ローカル master も `bcfd530` |
| Vercel | Production deployment **`6711329060`**（sha `bcfd530`・success） |
| 配信 bundle | `index-DgQr5ePZ.js`（md5 `4cbf9783…`）／`index-DRhlJuWv.css`（md5 `6122ab49…`）＝承認対象と一致 |
| rollback | Vercel `6710790486`（`47940f1`） |

### Production Smoke（`https://seven-gods-game.vercel.app`・PC 1508×660／1280×800・SP 390×844 × 7 敵＝21 本）— **PASS**
- PC・SP とも全敵で `scale: -1 1`。PC で鬼将・機工師・龍神・道化が神の方を向く（スクリーンショット）
- 突進は全 21 本で +x（神の方）。単発 13〜16px・連撃（魔獣）13〜20px
- console error 0・横スクロールなし
- 証拠：`docs/evidence/decision247/production-smoke/`

### 後片付け
- Gate 用ローカルサーバー :4471／:4472 停止済み・ファイアウォール変更なし
- worktree `SevenGodsGame-d247` は保持（過去の Release と同じ運用）

## 4. 変えていないもの
JS・ゲームデータ・数値・カード・敵・神・OTOMO・SP の表示・カットイン・ボス登場・神の絵（福永の兜の文字を守るため神は反転しない）。
