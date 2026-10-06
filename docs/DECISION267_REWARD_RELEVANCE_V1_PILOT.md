# 決定267 Reward Relevance v1「3 役ローテーション」Narrow Pilot

- 日付：2026-10-06（実装・自動 Gate）
- branch：`feat/d267-reward-relevance-v1`（worktree `C:\Users\kimi1\SevenGodsGame-d267-pilot`・base＝master `202e476`＝Production）
- 判断主体：Pilot 開始＝**CEO 承認（2026-10-06）**。実装方式・Gate 判定・未決 3 件（U1 配色・U2 トースト長・U3 QA seed）＝**AI 判断**（CLAUDE.md §6-2）。Human QA＝**CEO**。
- 状態：**CEO HUMAN QA PASS（2026-10-07・Q1 YES／Q2 YES／トースト 1,200ms 問題なし）→ Release Gate へ**（仕様変更なし・merge／push／deploy 未実施）
- 正とした設計：`docs/DECISION267_REWARD_RELEVANCE_V1_PILOT_FINAL_DESIGN.md`（再設計なし。§10 の bonus 参照の記述のみ実コードへ訂正）
- 前提文書：`docs/VICTORY_REWARD_VALUE_AUDIT.md`・`docs/DECISION267_REWARD_RELEVANCE_V1_PREFLIGHT.md`

## 0. 結論（先に）

| 項目 | 結果 |
|---|---|
| runtime commit | `a2e02b5`（① history storage）→ `db2a472`（② picker 純関数＋test）→ `ce84a61`（③ RewardOverlay＋CSS）→ `da84195`（④ BattleScreen 2 行＋wiring test）。docs `2ed4f95`（Pilot 開始・文書取り込み） |
| 不変 | **`git diff --stat master -- src/core` 空**（AC16）。`rules.ts`・カード・engine・replay・score・seed・`sevengods.rewardBonuses` v1・`RULES.saveVersion` 9 すべて不変 |
| 静的 | `tsc -b --noEmit` exit 0／`oxlint src` 0 error／`vitest run` **1,330 PASS**・9 skip・110 files（既存 1,312 ＋ 新規 18） |
| 新規 test | `rewardHistoryStorage.test.ts` 5 件（H1〜H5）／`rewardPicker.test.ts` 10 件（P1〜P10）／`rewardDailyWiring.test.ts` 3 件（W1）＝**18 件**（Final Design §13 の 16 件＋wiring を 3 分割） |
| Playwright | `scripts/d267-reward-relevance-v1/acceptance.mjs` **U1〜U6 6/6 PASS**（PC 1508×660 ×3・SP 390×844 ×3・1 browser 直列・console error 0・勝利 bot は全 run 1 回目で勝利） |
| build | `vite build` → `index-3It0LpNO.js`（460,270B）／`index-CJxzYDUP.css`（190,810B）。Human QA preview `:4305` はこの dist を配信（`docs/evidence/decision267/pilot/preview-served.txt`） |
| 証跡 | `docs/evidence/decision267/pilot/`（tsc／oxlint／vitest／diff-stat／core-diff-stat／acceptance-summary.json／screens 8 枚） |

## 1. 実装内容（Final Design §16 どおり）

| ファイル | 種別 | 内容 |
|---|---|---|
| `src/hooks/rewardHistoryStorage.ts` | 新規 | key `sevengods.rewardHistory`・version 1・神ごと `offered`／`declined` 各 ≤6（FIFO `appendFifo`）。version 違い・JSON 壊れ・型不一致は空で開始（保存データは消さない）。`localStorage` 不在・`setItem` 例外は握りつぶす |
| `src/components/battle/rewardPicker.ts` | 追記（既存 23 行は不変） | `pickRewardOffer`（A 即戦力 A1→A2／B 神の個性／C 次の構築／fill・解除 declined→offered・最終 legacy）、`affinityScore`（専用札の `bonus.when`／type から導出・神名分岐なし）、`collectDeckCardIds`（deck＋hand＋discard＋exhausted）、`formatRewardCopies` |
| `src/components/battle/RewardOverlay.tsx` | 変更 | props `deckFromState`／`onPick(cardId, offeredIds)`／`onSkip(offeredIds)`。`useMemo` で `loadRewardBonuses`／`loadRewardHistory`／`getRecommendedDeck`／deck20 fallback → `pickRewardOffer`。役割チップ（`data-role`）・「いま n 枚編成中／上限 m → m+1」・見送り注記・選択後トースト（`REWARD_TOAST_MS`＝1,200）。storage へは**書かない**（AC18） |
| `src/components/battle/BattleScreen.tsx` | 変更 | 表示条件・`rewardPending` に `state.mode !== 'daily'`（§8）。`onPick`＝`pushOfferedRewards`＋`addRewardBonus`、`onSkip`＝`pushOfferedRewards`＋`pushDeclinedRewards`（確定時記録＝D3）。`deckFromState={collectDeckCardIds(state)}` |
| `src/components/battle/battle.css` | 末尾追記 | `.reward-card-tags`／`.reward-role-chip[data-role]`（即戦力 `#ffd166`・神の個性 `#4d9fff`・次の構築 `#4dbd74`・新しい選択肢 `#a9adc4`＝U1 AI 判断）／`.reward-copies-*`／`.reward-skip-note`／`.reward-toast` |
| `scripts/d267-reward-relevance-v1/acceptance.mjs` | 新規 | §14 U1〜U6 |

## 2. Acceptance Criteria 判定

| AC | 判定 | 根拠 |
|---|---|---|
| AC1 3 枚・重複なし | PASS | P1〜P9 不変条件・U1〜U4 |
| AC2 同入力同出力／seed で変わる | PASS | P1 |
| AC3 2 枚積み共通札が `ready` 先頭 | PASS | P2（速攻×2 → `ready` 速攻 2/2） |
| AC4 1 枚入りへの fallback＋「2 枚目を足してから 3 枚目」 | PASS | P3・P10・U1／U2（`いま 1 枚編成中／上限 2 → 3／2 枚目を足してから 3 枚目`） |
| AC5 `identity` ちょうど 1 枚／無ければ `next` 2 枚 | PASS | P5・P6・U1／U2（潮招き＝専用）・U3／U4 |
| AC6 `next` は未採用共通札・相性順 | PASS | P7（大耀で乱舞が先頭・affinity ≥4） |
| AC7 offered ∪ declined 除外（pool 36・excluded 12） | PASS | P8 |
| AC8 専用 4 種 bonus 済み → `identity` 0・`next` 2 | PASS | P6・U3／U4（恵比寿 fixture） |
| AC9 小 pool の解除順 declined→offered・legacy 一致 | PASS | P9 |
| AC10 選択で bonus +1・offered 3・declined 不変 | PASS | U1／U2 |
| AC11 見送りで bonus 不変・offered＝declined＝3 枚 | PASS | U3／U4 |
| AC12 2 勝目に 1 勝目の 3 枚が出ない | PASS | U3／U4（別 seed・共通 0 枚） |
| AC13 チップ・枚数行が枠内・横スク 0（PC／SP） | PASS | U1〜U4（`getBoundingClientRect` 包含・`scrollWidth<=clientWidth`） |
| AC14 トースト文言 → Result Hub | PASS | U1／U2（`次回の編成で『共振』を 3 枚まで積めます`） |
| AC15 Daily で open-reward 無し・result-hub 直接・history 未作成 | PASS | U5／U6（`sevengods.rewardHistory` key 不在） |
| AC16 `src/core` 差分 0・tsc 0・oxlint 0・vitest 全件 | PASS | `core-diff-stat.txt`／`tsc.txt`／`oxlint-src.txt`／`vitest.txt` |
| AC17 BattleScreen の 2 式が各 1 つ | PASS | W1 |
| AC18 RewardOverlay は storage を書かない | PASS | W1 |

## 3. 未決 3 件の確定【AI 判断】

| # | 確定 |
|---|---|
| U1 配色 | 既存 token：即戦力＝共鳴の金 `#ffd166`／神の個性＝レアの青 `#4d9fff`／次の構築＝支援の緑 `#4dbd74`／新しい選択肢＝灰 `#a9adc4` |
| U2 トースト | 1,200ms で実装（`REWARD_TOAST_MS`）。Human QA Q2 で「戻りが遅い」なら 900ms へ |
| U3 QA seed | U1／U2 は `?seed=d267-u1`／`d267-u2`（恵比寿×試練の影）。U3／U4 は無指定（2 勝目の seed が変わることを検証するため） |

## 4. 実測の 3 択（Playwright・恵比寿×試練の影・おすすめデッキ）

| run | 3 択（役：札） | 備考 |
|---|---|---|
| U1 PC | 即戦力：共振（1/2）／神の個性：潮招き（専用・2/2）／次の構築：癒し（0） | 選択→トースト「次回の編成で『共振』を 3 枚まで積めます」 |
| U2 SP | 即戦力：見切り／神の個性：潮招き／次の構築：大喝 | SP は 2＋1 段（Final Design どおり） |
| U3 PC 1 勝目 | 即戦力：神託／次の構築：大喝・連撃 | 専用 bonus 済み → 神の個性 0。見送り → offered＝declined |
| U3 PC 2 勝目 | 即戦力：共振／次の構築：乱舞・癒し | 1 勝目の 3 枚と交わらない |

※ 恵比寿のおすすめデッキは共通札がすべて 1 枚ずつのため、初回の「即戦力」は A2（1 枚入り）になる（Final Design §9 後方互換の記述どおり）。

## 5. Human QA（CEO・Preflight §6）

- preview：`http://127.0.0.1:4305/`（Pilot dist・`index-3It0LpNO.js`）
- 大耀 × 鬼将（ふつう・おすすめデッキ）で 2 連勝。
- Q1：3 択のどれかを「取りたい」と思ったか（YES／NO）
- Q2：取ったあと、次の編成で何が変わるか画面で分かったか（YES／NO）
- 観察事項（AI が併せて聞く）：選択後トースト 1,200ms が長いと感じたか（U2）

## 6. rollback

Final Design §15 どおり。branch の runtime 4 commit を revert（merge 後は merge commit を `git revert -m 1`）。`sevengods.rewardHistory` は旧コードが読まないため残っても無害。`sevengods.rewardBonuses` は形式不変。

## 7. CEO Human QA 結果（2026-10-07）

| 設問 | 回答 |
|---|---|
| Q1：3 択のどれかを「取りたい」と思ったか | **YES** |
| Q2：取ったあと、次の編成で何が変わるか画面で分かったか | **YES** |
| トースト 1,200ms（U2） | **問題なし**（900ms への短縮は不要） |

**判定：HUMAN QA PASS（CEO）**。仕様変更なしで Release Gate（clean RC worktree・完全シリアル）へ進む。Production deploy は Release Gate PASS 後の CEO 最終承認まで行わない。
