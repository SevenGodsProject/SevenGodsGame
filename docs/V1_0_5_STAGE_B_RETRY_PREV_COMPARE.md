# v1.0.5 Stage B — 同じ盤面 Retry の前回比 1 行（実装記録）

> **状態（2026-10-24・PM・AI 判断（CLAUDE.md §6-2））**：branch `feat/v1_0_5-retry-prev-compare`（起点 `origin/master` `35a7f91`＝v1.0.4 Production）。実装 `f771eec`。targeted vitest PASS・tsc 0・build PASS・SP 表示の実測 PASS。full vitest と RC Gate は、v1.0.5 RC を組むときに PM が直列で実行する。push／merge／deploy は 0。
> 設計の元：`docs/RETENTION_BUNDLE_V1_PLAN.md` §3-3 ④（Stage B）・`docs/V1_0_4_PREVIEW_GATE.md` §2（G8 で GO）。

## 0. 結論

| 項目 | 結論 |
|---|---|
| 判定 | **GO**：v1.0.5 RC の候補。条件は full Gate と CEO Human QA（§6） |
| 保存・決定論 | **既存のセーブ仕様と決定論を壊す変更は不要**だった。storage への書き込み 0・save v9 不変・`src/core` 差分 0・乱数と時刻の使用 0 |
| 表示 | 敗因の直後に 1 行：「同じ盤面 {n} 回目：前回 R{r}で敗北・敵HP {a}% → 今回 R{r'}で敗北・敵HP {b}%」。勝ったときは「→ 今回 R{r'}で撃破」、7R 未撃破は「7R 終了」 |

## 1. 比較してよい条件（先に検証した事実）

「同じ seed」だけでは同じ盤面にならない。理由は 2 つ。

1. **「続きから」の再開**では、GameFlow がデッキを保存済みの好み（`loadDeckPreference`）から読み直す（`GameFlow.tsx` の `onResume`）。そのため、同じ seed のまま、実際に戦ったのとは別のデッキで「同じ盤面でもう一度」が始まり得る。
2. **デッキの並び**：`createInitialState` は `buildDeckInstances(action.deck)` で入力の並びどおりに uid `c{位置}` を振り、そのあと seed でシャッフルする（`deck.ts:11-16`・`createInitialState.ts:52`）。カードの構成が同じでも、並びが違えば別の盤面になる。

そこで、**決着時の state そのもの**から鍵を作る（`retrySemantics.ts` の `sameBoardKey`）。鍵の要素は次のとおり。

- seed・mode・神・敵・難易度・神階・神階の選択・OTOMO の成長経路
- 山札＋手札＋捨て札＋除外を uid の番号順に並べ直したデッキの並び。engine がカードを作るのは開始時だけなので、これは開始時のデッキ入力と一致する

engine は決定論的なので、この鍵が一致すれば開始盤面も一致する。報酬ボーナスはデッキの検証にしか使われず、デッキの中身（コピー枚数）は鍵に含まれている。

**出さない条件**（どれか 1 つでも当てはまれば null）
- memo が無い（初回・ページの更新後）
- 鍵が一致しない（再開でデッキが変わった・別の盤面）
- 神域挑戦（Daily には別の前回比が既にある）
- 対局が進行中

## 2. 状態の持ち方（保存しない）

- `GameFlow` の `useState<SameBoardMemo | null>` だけに持つ。
- 作るのは「同じ盤面でもう一度」（`onRematch` の通常戦の分岐）で、敗北・未撃破の決着からだけ（`nextSameBoardMemo`。勝利・Daily なら null）。
- 同じ盤面が続く間は `count` を 1 ずつ増やし、別の盤面なら 1 から数え直す。
- `backToGodSelect` と `exitResult`（結果画面の他の出口すべて）で null に戻す。
- ページを更新すると消える。確かめられない比較は出さない。

## 3. 変更ファイル（`git diff --stat 35a7f91`）

| ファイル | +/− | 内容 |
|---|---|---|
| `src/components/battle/retrySemantics.ts` | +65/−1 | `SameBoardSource`・`SameBoardMemo`・`sameBoardKey`・`nextSameBoardMemo`・`describeSameBoardDiff`（純関数） |
| `src/components/GameFlow.tsx` | +9/−1 | memo の state・作る場所・捨てる場所・BattleScreen への受け渡し |
| `src/components/battle/BattleScreen.tsx` | +5 | prop `sameBoard` → `GameOverOverlay` の `sameBoardLine` |
| `src/components/battle/GameOverOverlay.tsx` | +12 | 敗因の直後に `[data-testid=same-board-diff]` の 1 行 |
| `src/components/battle/battle.css` | +2 | `.game-over-same-board`（12px・既存の色・新色 0） |
| `src/components/battle/sameBoardDiff.test.ts` | +134（新規） | 専用テスト 10 件（本物の reducer を動かす） |
| `scripts/v1_0_4-rc/defeat-g8.mjs` | +8/−1 | G8 計測に前回比の行（文言・行数・横はみ出し）を記録する項目を追加 |

## 4. テスト

| 対象 | 結果 |
|---|---|
| `sameBoardDiff.test.ts`（10）＋`retrySemantics.test.ts`＋`resultHub.test.ts` | 26/26 PASS |
| 変更ファイル（GameFlow・GameOverOverlay・BattleScreen・retrySemantics・battle.css）を参照するテスト 26 files | 284/284 PASS |
| `npx tsc -b --noEmit` | exit 0 |
| `npm run build` | PASS：`index-Coqe-_6s.js` 475.19 kB（v1.0.4 比 +1.2 kB）・CSS 195.08 kB |

専用テストで固定したこと：
- 同じ START_GAME からの対局は、決着の仕方が違っても同じ鍵になる
- seed・敵・難易度のどれかが違えば別の鍵になる
- 構成が同じでも並びが違うデッキは別の鍵になる
- 敗北 → 敗北の文言（敵 HP は実際の engine の値）
- 3 回目は count が進み、別の盤面を挟むと 1 から数え直す
- 別の盤面・memo なし・進行中・Daily では出さない
- 勝利・Daily からは memo を作らない
- 撃破と「7R 終了」の書き方、HP の切り上げ（残っているのに 0% と出さない）
- 正解・推奨・評価の語を含まない（決定263）

## 5. SP 表示の実測（`node scripts/v1_0_4-rc/defeat-g8.mjs docs/evidence/v1_0_5-stage-b/g8.json http://localhost:4207`）

経路：大耀 × 鬼将。カードを出さずにラウンドを終え、R4 断岩で敗北 → Primary「同じ盤面でもう一度」→ 2 回目も同じく敗北。

| viewport | 1 回目の敗北 | 2 回目の敗北（前回比あり） |
|---|---|---|
| PC 1508×660 | 行なし・Primary 下の余白 160px | 1 行・余白 **128px**・Primary は初期可視 |
| SP 375×667 | 行なし・余白 140px | 2 行（横はみ出し 0）・余白 **90px**・Primary と Secondary 2 つが初期可視 |
| SP 390×844 | 行なし・余白 179px | 2 行（横はみ出し 0）・余白 179px・Primary は初期可視 |

表示された文言：「同じ盤面 2 回目：前回 R4で敗北・敵HP 100% → 今回 R4で敗北・敵HP 100%」。同じ操作なので結果も同じになる＝事実のとおり。JS error 0（3 viewport）。証跡は `docs/evidence/v1_0_5-stage-b/`（g8.json・SP375 の 1 回目と 2 回目・SP390／PC の 2 回目）。

## 6. 残りの Gate と CEO Human QA

- **PM（v1.0.5 RC で直列）**：full vitest・oxlint の新規 0・build・旧セーブ互換 44/44（storage 差分 0 なので形式確認）・受入 44/44・敗北画面 18/18・G8 再計測。
- **CEO Human QA**（RETENTION_BUNDLE_V1_PLAN §3-5 Q5 と同じ基準）
  - Q5a：同じ盤面で 2 回目に負けたとき、「前より進んだ／戻った」が分かったか（YES で合格）
  - Q5b：「正解を教えられている」と感じたか（**NO で合格**）
- **不合格のときの調整案は 1 つだけ**：SP で 1 行に収まるよう、先頭を「同じ盤面 2 回目：」から「2 回目：」に短くする（文言の定数 1 つを変えるだけ）。
