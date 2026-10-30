# v1.0.4 Retention 束 v1（RETENTION_BUNDLE_V1）

> **状態（2026-10-23・Lane 2・Dev・AI 判断（CLAUDE.md §6-2））**：branch `feat/v1_0_4-retention-bundle`（起点 `origin/master` `1f713d6`＝v1.0.3 Production）。Stage A ①〜③ を **1 commit ずつ実装済み・ローカル commit のみ（push／merge／tag／deploy 0）**。変更ファイル限定 vitest PASS・`tsc -b --noEmit` PASS。full vitest・build・preview・Playwright（Fast Gate G1 の残り・G3〜G7）は **未実行（PM が直列で実行）**。Stage B（同じ盤面 Retry の前回比）は G8 実測待ちのため **実装していない**。設計書：`docs/RETENTION_BUNDLE_V1_PLAN.md`（Lane 5 統合計画 v1 の写し・§3／§9）。

---

## 0. 結論

| 項目 | 結論 |
|---|---|
| 実装 | ① OTOMO 絆 ★3 の到達可能化／② 49 攻略の初撃破直後の次の目標 NM1／③ Daily「今日の問い」最小版。設計書 §3-3 の文言・位置どおり |
| commit | ① `70bd104`／② `1904941`／③ `3886fbd`（各 revert 可能） |
| 不変条件 | `src/core` 差分 0・`rules.ts` 無変更（gameVersion 不変）・`localStorage.setItem` 追加 0・`sevengods.*` スキーマ不変・save v9 不変・`combatTimeline.ts`／`battle.css` 差分 0 |
| テスト | 変更ファイル限定 vitest：otomoGrowthDisplay／nextGoal／resultContext／dailyDiff／dailyClock／entranceWiring すべて PASS。`tsc -b --noEmit` exit 0 |
| 設計書からの差分（AI 判断） | 2 件（§5）。Home の verdict は「ベスト結果」ではなく「撃破があれば最短ラウンドの撃破」を優先／「明日の型」は `tomorrowDailyTypeLabel` 1 関数に集約（3 箇所の重複回避） |
| CEO 判断 | 不要（§6-2 の範囲。v1.0.4 Production 公開承認のみ §6-3 #8） |

---

## 1. ① OTOMO 絆 ★3 の到達可能化（`70bd104`）

| 箇所 | Before | After |
|---|---|---|
| ★3「固い絆で結ばれた相棒」の条件 | Lv5 **かつ** 童子形態で対局終了 1 回以上 | **Lv5（12pt）のみ** |
| 童子の記録（ギャラリー） | ★3 で開く | **`dojiReached > 0` で開く**（★ に依らない） |
| OTOMO 画面「次の解放」tier2 | 「絆称号「固い絆で結ばれた相棒」＋童子の記録（あと N pt・童子形態での対局終了が1回以上必要）」 | 「絆称号「固い絆で結ばれた相棒」（あと N pt）」 |
| 同 tier3・童子未到達 | （tier3 に到達できなかった） | 「童子の記録（童子形態で対局を終えると解放）」 |
| 同 tier3・童子到達 | 非表示（null） | 非表示（null）＝不変 |
| 次の目標 N8 | 「絆称号「固い絆で結ばれた相棒」まであと N pt（童子形態での対局終了も必要）」 | 「絆称号「固い絆で結ばれた相棒」まであと N pt」 |

既存の Lv5 記録は適用時に ★3 へ **昇格のみ**（Lv5 未満は従来の判定のまま＝降格 0。テストで固定）。

## 2. ② 49 攻略 → 次の目標 NM1（`1904941`）

| 箇所 | Before | After |
|---|---|---|
| 通常戦で初撃破した勝利の結果画面「次の目標」 | N4（今日の神域挑戦）や N5〜N10 | **NM1**「{敵}を別の神でも攻略する（この敵 k/7 神）」・Primary「別の神で挑む（神を選び直す）」・action `reselect` |
| 評価順 | N2→N3→NR1→N4→… | N2→N3→NR1→**NM1**→N4→…（設計書 §3-2 (a) 案 B） |
| 出ない条件 | — | 初撃破でない／その敵を 7 神すべて撃破済み／記録なし（storage 不可）／敗北・未撃破／神域挑戦 |

「別の神で挑む」は既存 `backToGodSelect`（LANE-D：敵選択もリセット）を変えない＝文言で「同じ敵が選ばれている」とは約束しない。母数 49 は出さない。

## 3. ③ Daily「今日の問い」最小版（`3886fbd`）

| 画面 | Before | After |
|---|---|---|
| 神域挑戦の結果画面（best 行の上に 1 行） | （なし） | 「今日の問い：解けた（R{n} 撃破）」／「今日の問い：未解（R{n} 敗北）」／「今日の問い：未解（7R 未撃破）」 |
| 同・次の目標 D4（残り 0 回） | 「今日の挑戦は終了。次の敵まで HH:MM」 | 「今日の挑戦は終了。明日の問いは【{型}】・次の敵まで HH:MM」 |
| Home 今日の神域挑戦（status 行の下に 1 行） | （なし） | 未挑戦「今日の問い：未着手」／挑戦済み「今日の問い：解けた（R{n} 撃破）」など |
| Home 残り 0 の countdown 行 | 「次の敵まで HH:MM」 | 「明日の問いは【{型}】・次の敵まで HH:MM」 |
| 神域挑戦画面の終了文（残り 0） | 「また明日、新しい敵が待っています。」 | 「明日の問いは【{型}】。また明日。」 |

未来情報は **明日の型のみ**（敵名・Seed は出さない）。countdown の露出条件（残り 0 のときだけ）は不変。正解・推奨手は出さない（決定263）。

---

## 4. 変更ファイルと行数（`git diff --numstat origin/master`・コメント込み）

| ファイル | + / − | 項目 |
|---|---|---|
| `src/components/setup/otomoGrowthDisplay.ts` | 21 / 32 | ① |
| `src/components/battle/nextGoal.ts` | 19 / 4 | ①（1）②（13）③（5） |
| `src/components/battle/resultContext.ts` | 14 / 5 | ②③ |
| `src/components/battle/BattleScreen.tsx` | 1 / 1 | ② |
| `src/components/battle/dailyDiff.ts` | 19 / 1 | ③ |
| `src/hooks/dailyClock.ts` | 12 / 1 | ③ |
| `src/components/battle/GameOverOverlay.tsx` | 5 / 1 | ③ |
| `src/components/setup/HomeTodayPanel.tsx` | 7 / 2 | ③ |
| `src/components/setup/DailyChallengeScreen.tsx` | 2 / 1 | ③ |
| `src/components/setup/daily.css` | 3 / 0 | ③（CSS 3 行・既存色） |
| テスト 5 ファイル | 121 / 24 | ①②③ |
| `docs/RETENTION_BUNDLE_V1_PLAN.md`（新規）・本書（新規） | — | docs |

runtime はコメント込みで +103 / −48（純増 55 行）。設計書の目安 ≈57 行＋CSS 3 の範囲内。

## 5. 設計書からの差分（AI 判断・比較つき）

1. **Home の verdict の元データ**：設計書は `bestResultOf(day)`（スコア最高の結果）。スコア最高が敗北でも撃破が別にある日（例：敗北 9,000／撃破 7,000）に「未解」と出てしまうため、**撃破があれば最短ラウンドの撃破 → 無ければベスト結果 → 無ければ最後の結果** の順にした（`describeDailyDayVerdict`）。保存済みの `status`／`round` を読むだけで、storage・semantics は不変。
2. **明日の型の取得**：設計書は resultContext・Home・神域挑戦画面の 3 箇所で `getEnemyDef(dailyBossFor(nextDailyKey(now)).enemyId).typeLabel` を書く案。同じ式の 3 重複を避け `dailyClock.ts` に `tomorrowDailyTypeLabel(now)` を 1 つ置いた（+4 行・テスト 1）。
3. `ResultEngineSnapshot.matchupClear` は **任意フィールド**にした（既存テストの呼び出しを変えずに済む・未指定なら NM1 は出ない）。

## 6. テスト（本 Lane で実行したもの）

| コマンド | 結果 |
|---|---|
| `npx vitest run otomoGrowthDisplay.test.ts nextGoal.test.ts resultContext.test.ts`（①②） | 3 files・73 tests PASS |
| `npx vitest run dailyDiff.test.ts dailyClock.test.ts nextGoal.test.ts resultContext.test.ts`（③） | 4 files・69 tests PASS |
| `npx vitest run entranceWiring.test.ts`（Home testid の配線確認） | 23 tests PASS |
| `npx tsc -b --noEmit` | exit 0 |
| 新規・更新テスト | ① 更新 6・新規 3／② 新規 5／③ 新規 8（dailyDiff 4・dailyClock 2・nextGoal 1・resultContext 1） |

未実行（PM が直列で実行）：full vitest・oxlint・`vite build`・preview・Playwright。

## 7. Fast Gate 案（設計書 §3-4 を本実装に合わせて具体化）

| G | 項目 | 合格 |
|---|---|---|
| G1 | `tsc -b --noEmit`／oxlint 新規 0／full vitest／`vite build` | すべて PASS・既存件数 −0 |
| G2 | `git diff --stat origin/master -- src/core` 空／`git diff origin/master -- src` に `setItem` 追加 0／`gameVersion.test.ts` 不変 | 本 Lane で前 2 項は確認済み（空／0） |
| G3 | Daily（seed 固定）：勝利→`[data-testid=daily-verdict]`「今日の問い：解けた（R{n} 撃破）」／敗北→「未解（R{n} 敗北）」／3 回目後→D4 と `home-today-countdown` に「明日の問いは【型】」／`home-today-verdict` | 4/4 |
| G4 | 通常戦・初撃破 seed：`matchup-clear` と `next-goal[data-goal-id=NM1]` が同時表示／同 seed 2 勝目は NM1 なし／初陣 seed は NR1 のまま | 3/3 |
| G5 | 旧セーブ互換（`docs/evidence/v1_0_1-rc/07-save-migration`）：Daily・Home・OTOMO 画面が追加 1 行と ★3 の昇格以外不変・console error 0 | PASS |
| G6 | PC 1508×660／SP 390×844／SP 375×667：Home Today の高さ増 ≤1 行・横スクロール 0・結果画面 Primary が初期可視領域 | PASS |
| G7 | 新語は「今日の問い」「明日の問い」の 2 つのみ（「失敗」「正解」「推奨」0）・Ranking 文言 0 | grep 0 |
| G8 | （Stage B 用・本束では対象外）敗北画面の行数 Before 値を記録 | 記録のみ |

## 8. CEO 目視 3 分（YES／NO）

1. Daily を 1 戦して結果画面：「今日の問いを解けたか／解けなかったか」が 3 秒以内に分かったか（YES）。
2. Home に戻る：「今日の問い」1 行で今日の状態が分かり、3 回目後なら「明日の問いは【型】」で明日も開く気になったか（YES）。
3. 通常戦で初撃破：「別の神でも攻略する（この敵 k/7 神）」を押したくなったか（YES）／「49 個やらされる」と感じたか（NO）。
4. OTOMO 画面：「固い絆」までの残り pt で「届きそう」と思えたか（YES）／Lv5・童子未到達の「童子の記録（…解放）」に違和感があったか（NO）。

不合格時の調整案（各 1 つ・自動調整しない）：Daily＝「明日の型」行を外す／NM1＝「（この敵 k/7 神）」を外す／★3＝解放文を「童子の記録（未到達）」に短縮。

## 9. 残課題

- Stage B（同じ盤面 Retry の前回比）は G8 実測後に別 commit で判断（本 branch 未実装）。
- `docs/DECISIONS.md` の行（決定70／71 の絆表示条件・決定187 の Next Goal 順序の見直し＝AI 判断）は PM が採番して記録する（本 Lane は編集していない）。
- `OtomoGrowthScreen.tsx:147` のコメント「解放条件は display.unlockedForms（bondTier から導出）」は実装と一部ずれる（童子は `dojiReached` 由来）。runtime 影響なし・次回同ファイル編集時に直す。
- 翌日の型は CORE 7 体で 7 種すべて異なるため「型のみ」でも翌日の敵が特定できる（設計書 §6-1 #3 で節度として許容済み）。
