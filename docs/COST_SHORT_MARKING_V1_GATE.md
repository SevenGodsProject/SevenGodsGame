# Cost-Short Marking v1 — Fast Gate 総括と CEO Human QA（2026-10-30・Lane 2）

- 状態：**Fast Gate 1 段目・2 段目 ALL PASS（FAIL 0）— CEO Human QA READY（LAN preview `http://192.168.11.6:4184/`）**。push／merge／tag／deploy は未実施（統合は CEO）
- worktree／branch：`SevenGodsGame-csm1`／`feat/cost-short-marking-v1`（起点 Production v1.0.5 `a96a409`）
- commit：実装 `ce8d293`（runtime 3 ファイル＋新 CSS 1＋契約テスト 1）→ 証跡 1 段目 `d044617` → 証跡 2 段目 `4a7cd99`。本書は docs-only
- 設計：Lane 3 Card Premium v2 次工程監査（2026-10-29・AI 判断）「珠の右（上端）に『あとN』帯＋short 時 opacity .45→.7・CSS は新ファイル・engine 0」
- 不変：`src/core` 差分 0（gameVersion `1.d794038a00b5b53c`・save v9 不変）／`disabled={!playable || !affordable}` 不変／`battle.css`・`press.css`・`artWindow.*`・`cardTravel.*`・`rules.ts` 変更 0／既存 7 敵・Pilot 敵の挙動 0

---

## 0. 結論表

| # | 問い | 結論 |
|---|---|---|
| 0-1 | 何を足したか | 神力（AP）が足りない札のコスト珠の右上に「あとN」（N＝不足 AP）の帯を出し、その札の明度を .45→.7 に上げた。表示専用・押せる／押せないの判定は不変 |
| 0-2 | 触ったもの | `CardView.tsx`（prop `apCurrent`・`short` 算出・`card-view-short`／`.card-view-short-tag`）・`BattleScreen.tsx`（`apCurrent={state.ap.current}` 1 行）・新規 `cardShort.css`（34 行）・新規 `cardShort.test.ts`（契約 6 件） |
| 0-3 | 設計からの逸脱 | 帯セレクタを `.card-view > .card-view-short-tag`（0,2,0）ではなく `.card-view.card-view-short > .card-view-short-tag`（0,3,0）にした。理由＝`cardShort.css` が `battle.css` より先にバンドルされ、`battle.css:2576` の `.card-view > *:not(.card-view-clip)` と同点では負けるため |
| 0-4 | Gate | 1 段目：tsc 0・契約 6/6・full vitest **1,584 PASS**（v1.0.5 の 1,578＋6）・build JS 476.20 kB（+0.21 kB）／2 段目：ブラウザ probe 7 系統すべて PASS（§2） |
| 0-5 | 残リスク | 2 件（§3）。どちらも回帰ではなく、修正は任意の 1 行 |
| 0-6 | CEO 判断 | 不要（CLAUDE.md §6-2：既存仕様の範囲・表示専用）。Human QA 3 問（§4）で GO／NO-GO。Production 公開時のみ §6-3 #8 |

## 1. Fast Gate 1 段目（`docs/evidence/cost-short-marking-v1/01〜04`）

| 項目 | 結果 |
|---|---|
| tsc | 0 エラー（`01-tsc.txt` 空） |
| 契約テスト `cardShort.test.ts` | 6/6（`disabled` 式不変・short は `!playing` 条件・CSS に `.hand`／`transform`／`animation` 無し・font-size ≥10px） |
| full vitest | **1,584 PASS・0 fail**（`03-vitest-full.txt`） |
| build | `index-0HgrFnqq.js` 476.20 kB（v1.0.5 475.99 → +0.21 kB）・CSS 195.50 kB（`04-build.txt`）。preview 4184 はこの build を配信（`index.html` 参照一致を 2026-10-30 に再確認） |

## 2. Fast Gate 2 段目（ブラウザ probe・`docs/evidence/cost-short-marking-v1/GATE2_SUMMARY.md`）

| # | Gate | 結果 | 主要数値 |
|---|---|---|---|
| 2-1 | measure-hand（手札 5/7/9/10 の箱 Before/After） | PASS | 16 行すべて rect ハッシュ一致・最大差 0 px |
| 2-2 | polish-probe（名前／珠の被覆・hover／focus） | PASS | 24 行 hit 100%・決定266 polish After と同値 |
| 2-3 | hover-probe（pc900・手札 10） | PASS | d266 版と完全一致 |
| 2-4 | gate249（反応言語 timeline・入力ロック） | PASS | After 30 行すべて Before と箱差 0・判定一致 |
| 2-5 | gate250（God Strike・engine 結果） | PASS | 結果画面・burst R5 まで Before/After 完全一致 |
| 2-6 | gate252（敵必殺 cutin timing） | PASS | 12 run engine state 一致 |
| 2-7 | 60 札 × SP 3 幅＋PC 2 幅（新規 probe） | PASS | はみ出し **0/556**・交差 0・font 10px・最小コントラスト **5.25:1**・敵ターン中の帯 0 |
| 2-8 | a11y minimum pack | PASS | 69/69・JS error 0 |

網羅：45/60 種で帯を実測（2 行名の最悪例＝姉御の号令、Art Window 札＝豪快な一撃を含む）。残り 13 種は同一 CSS・同一寸法で幾何は代表できる。

## 3. 残リスク（修正していない・PM 判断）

| # | 事象 | 影響 | 任意の修正 |
|---|---|---|---|
| R1 | 姉御の号令（2 行名）で帯と名前帯の間隔 6 px・`.card-view-body` の透明上端が帯の下に z 順で重なる | 名前テキストとの交差 0・帯の下端がわずかに暗くなる程度 | 帯に `z-index: 2`（1 行・未適用） |
| R2 | 配札アニメ `rl-deal-fade`（opacity .4 から）中の ≤0.5 秒だけ帯コントラストが 2.3:1 | 既存の配札演出そのもの・settle 後は全件 5.25:1 | 無し（既存演出の範囲） |

## 4. CEO Human QA（iPhone・LAN preview）

- URL：`http://192.168.11.6:4184/`（通常の戦闘で可。固定盤面にする場合は `http://192.168.11.6:4184/?seed=csm1-a`）
- 推奨：神＝**大耀**（Art Window 札「豪快な一撃」と 2 行名「姉御の号令」の両方が手札に来る）。R1〜R3 で AP を使い切った直後の手札を見る
- 見るもの：AP が足りない札の珠の右上に「あと1」「あと2」の小さな帯／その札は少し暗い（以前より明るい）／敵ターン中は帯が出ない

| # | 設問 | 期待 |
|---|---|---|
| Q1 | 「あとN」の意味（あと N 神力で出せる）が、説明なしで分かったか | YES |
| Q2 | 出せる札と出せない札の見分けは、以前（より暗い表示）より弱くなっていないか | 弱くなっていない |
| Q3 | 帯が札の絵・名前・「大耀専用」小札・珠と重なって読みにくい、または邪魔に感じる場面があったか | NO |

Q2 が NG のとき：`cardShort.css` の opacity を .6＋`filter: none` に切替（1 行・コントラスト約 7.5:1・再 Gate は 2-7 のみ）。Q3 が NG のとき：R1 の `z-index: 2` を適用し 2-7 を再実行。Q1 が NG のとき：文言のみ 1 回調整（「あと N」→「神力あと N」は Art Window 小札と衝突するため不可・代替は色の強調）。

## 5. 統合メモ（CEO 作業・AI は push／merge をしない）

- 変更ファイルは `CardView.tsx`・`BattleScreen.tsx`（1 行）・`cardShort.css`・`cardShort.test.ts`。忠次 v0.6（`feat/shogunate-pilot-v0.6` `96e6ff0`・17 ファイル）とは同一ファイルの編集 0。`git merge-tree a96a409 4a7cd99 96e6ff0` の conflict マーカー **0**（2026-10-30 実測）＝どちらを先に統合しても衝突しない
- untracked の大きな PNG／jpg（`05-measure-hand/shots`・`06-polish`・`07-hover`・`08-gate249-252/gate249/*.png`）は証跡の原画で commit 対象外。削除していない

## 6. CEO iPhone Human QA 結果（2026-10-30・LAN preview 192.168.11.6:4184・build index-0HgrFnqq.js＝ce8d293）

| # | 設問 | 結果 |
|---|---|---|
| Q1 | 「あとN」の意味が説明なしで分かったか | **すぐ分かった** |
| Q2 | 出せる札と出せない札の見分けは弱くなっていないか | **以前より明確に区別できた** |
| Q3 | 帯が絵・名前・専用小札と重なって読みにくい／邪魔か | **重なりなし。絵も文字も見やすい** |

判定（AI-PM）：**Human QA 3/3 PASS。自動 Gate（1 段目・2 段目 ALL PASS）と合わせて実装合格**。追加の仕様変更なし。§3 の任意修正（R1 z-index・R2 配札フェード）は適用しない（QA で問題にならなかったため）。状態：**IMPLEMENTATION PASSED — 統合待ち（push／merge は CEO）**。preview 4184 は QA 後に停止（LISTEN 0 確認）。
