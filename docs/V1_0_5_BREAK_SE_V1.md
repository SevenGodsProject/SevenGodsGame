# v1.0.5 候補 — Enemy Break SE v1（Combat Premium v3 TOP1）

> **状態（2026-10-24・Dev・AI 判断（CLAUDE.md §6-2：軽微な演出・SE 調整））**：実装完了・targeted vitest PASS・`tsc -b --noEmit` PASS。**PM の直列 Gate（full vitest・build・probe）と CEO Human QA 待ち**。branch `feat/v1_0_5-break-se`（起点 origin/master `35a7f91`＝v1.0.4 Production）・ローカル commit のみ。push／merge／tag／deploy 0。
>
> 仕様の出典：`docs/COMBAT_PREMIUM_V3_TOP2.md` §4（branch `docs/lane6-combat-premium-v3`・Lane 6）。

---

## 0. 結論

敵の表示 HP が 50%／25% の帯をまたいで崩れた（Enemy Break）瞬間に、既存音源 `enemy_charge` を低い速度（half 0.7／quarter 0.6）で 1 回だけ鳴らす。**新規音源 0・着弾時刻表（`combatTimeline.ts`／`enemyVfxTiming.ts`）変更 0・`src/core` 変更 0・CSS 変更 0・save／storage 変更 0**。

---

## 1. 仕様（実装値）

| 項目 | 値 | 実装位置 |
|---|---|---|
| 起点 | `useEnemyBreak` が `key` を進めた描画（表示 HP が half／quarter の帯へ**下がった**とき）。suppress（撃破の一撃・表示 HP 0・崩壊中）・初回・帯が上がった描画では鳴らない | `enemyBreak.ts` `breakSeToPlay` |
| 時刻 | 崩しのクラスと同じ描画サイクル（`useLayoutEffect`）・予約オフセット 0。新しい timer 0＝着弾 T＋stop＋`HP_LAG_MS`（90） | `enemyBreak.ts` `useEnemyBreakSe` |
| 音源 | 既存 `enemy_charge`（SE 本数 22 のまま） | `sound.ts` `sfx.enemyBreak` |
| rate | half **0.7**／quarter **0.6** | `feelTier.ts` `BREAK_SE.rate` |
| 音量 | 専用係数 `BREAK_SE.gain` **0.55** × master 0.85 ＝実効 **0.4675**（溜め予告 0.425 ＜ 崩し 0.4675 ＜ L2 着弾 0.51 ＜ 声 0.68） | `feelTier.ts` `BREAK_SE.gain` |
| 抑止 | 敵が溜め予告中（`enemy.intent?.kind === 'charge'`＝`enemy-avatar-charging` と同じ真偽値）なら half は鳴らさず quarter だけ鳴らす | `enemyBreak.ts` `shouldPlayBreakSe` |
| dedup | キーは `enemy_charge@0.7`／`@0.6`。溜め予告 `enemy_charge@1` とは別キー＝重複抑制（30ms）の対象外 | 既存 `playBuffer` |
| reduced-motion | 音は不変＝鳴る（決定257 の方針） | 分岐なし |
| ミュート | 既存 `playBuffer` の `muted` ガード＝鳴らない | 既存経路 |

---

## 2. 仕様書と実コードの差分（判断理由）

| # | 仕様書（v3 §4） | 実装 | 理由 |
|---|---|---|---|
| 1 | `EnemyPanel.tsx` に `useEffect`（key 依存）＋6 行 | 再生の hook `useEnemyBreakSe` を `enemyBreak.ts` に置き、`EnemyPanel` は 1 行の呼び出し＋溜め判定の変数化（+3／−1 実質） | ①仕様の起点が「`useEnemyBreak` と同じ `useLayoutEffect`」。`useEffect` だと paint 後（最大 1 フレーム遅れ）になり A-M3（±16ms）の余裕を削るため、崩しと同じ `useLayoutEffect` にした。②`EnemyPanel` は別 Lane（敵の揺れ）と近い場所なので、差分を最小にする |
| 2 | 抑止の純関数 `shouldPlayBreakSe(level, charging)` のみ | 加えて `breakSeToPlay(fx, playedKey, charging)`（key が進んだ描画だけ 1 回返す純関数） | 本 repo に React のテスト基盤（testing-library／jsdom）が無い。「1 回だけ鳴る」を hook 抜きの純関数で検証できるようにした。hook 側は ref で `playedKey` を進めるだけ |
| 3 | `enemyBreak.test.ts` +30・`sound.test.ts` +12 | 専用ファイル `breakSe.test.ts`（13 件） | `sound.test.ts` は SE マニフェスト検証、`enemyBreak.test.ts` は表示の回帰と役割が違う。偽 AudioContext は `tapFeedback.test.ts` と同型でファイル内に閉じた |
| 4 | 抑止の根拠「`charge` 予告と同じ瞬間に同じ音源が並ぶ」 | 規則はそのまま実装 | コード確認：`intent` は `startRound`（`core/engine/round.ts:110`）で決まり、溜めの警告音 `sfx.enemyCharge` は敵の手番（`ENEMY_ACTED kind charge`）で鳴る。プレイヤー手番の Break と**同時刻**に重なることはほぼ無い。ただし溜めの構え（光）が出ている間に同じ音源の低い版が鳴ると「敵の予告音」と取り違える恐れがあるので、抑止規則は意味の衝突回避として有効と判断し、仕様どおり残した |
| 5 | `BREAK_SE = { rate, gain }` を `feelTier.ts` | 同じ（音源名は `sfx.enemyBreak` 内で `'enemy_charge'`） | `feelTier.ts` は `SeName` を import できない（`sound.ts` が `feelTier.ts` を import する向き）。既存の `TAP_END_ROUND_RATE`／`SOUND_LAYER` と同じく数値だけを置いた |
| 6 | 作業場所 `SevenGodsGame-v105breakse` | 実在する worktree `C:/Users/kimi1/SevenGodsGame-v105-breakse`（branch `feat/v1_0_5-break-se`・起点 `35a7f91`） | 指示のパスはハイフン欠落。`git worktree list` で branch・起点が一致することを確認 |

---

## 3. 変更ファイルと行数

| ファイル | 行数（+／−） | 内容 |
|---|---|---|
| `src/components/battle/feelTier.ts` | +11／−0 | `BREAK_SE` 定数 |
| `src/components/battle/sound.ts` | +6／−1 | import と `sfx.enemyBreak(level)` |
| `src/components/battle/enemyBreak.ts` | +33／−0 | `shouldPlayBreakSe`・`breakSeToPlay`・`useEnemyBreakSe` |
| `src/components/battle/EnemyPanel.tsx` | +5／−2 | `charging` の変数化・hook 呼び出し（揺れ・クラス・markup は不変） |
| `src/components/battle/breakSe.test.ts` | +187（新規） | 専用テスト 13 件 |
| `docs/V1_0_5_BREAK_SE_V1.md` | 新規 | 本書 |

触れていないもの：`src/core`・`combatTimeline.ts`・`enemyVfxTiming.ts`・`useBattleSound.ts`・`useCombatPresentation.ts`・`battle.css`・`enemyBreak.css`・`public/`・save・storage・`docs/DECISIONS.md`（Decision 行は PM 統合時）。

---

## 4. テスト結果（Dev 実行分）

| 種別 | コマンド | 結果 |
|---|---|---|
| 専用 | `npx vitest run src/components/battle/breakSe.test.ts` | **13/13 PASS** |
| 関連 targeted | 上記＋`enemyBreak`／`sound`／`tapFeedback`／`soundLayer`／`feelTier`／`officialVoice`／`combatTimeline`／`duelHud`／`battleViewportLayout`（`EnemyPanel.tsx?raw` を読むテストを含む）10 ファイル | **121/121 PASS** |
| 型 | `npx tsc -b --noEmit` | **exit 0** |
| lint | `npx oxlint`（変更 5 ファイル） | **exit 0** |

`breakSe.test.ts` の内訳：数値 2（rate・gain・実効 0.4675・階層）／純関数 4（抑止 4 通り・1 戦の遷移で half 1＋quarter 1 のみ・high→quarter 1 回・帯上昇で 0）／配線・時刻表 4（`EnemyPanel` の真偽値共有・`useLayoutEffect` で timer 0・`useBattleSound` は予約しない・`HP_LAG_MS`／`HIT_STOP_MS` 不変）／再生 3（偽 AudioContext：予約オフセット 0・rate・gain／溜め予告と同時でも dedup 対象外／ミュート時 0）。

未実行（禁止・PM 直列）：full vitest・build・Playwright・dev server。

---

## 5. PM が直列で流す Gate 案

| 順 | Gate | 合格値 | 対応する受入（v3 §4-3） |
|---|---|---|---|
| G1 | `npx tsc -b --noEmit`・`npx oxlint` | 0／新規 0 | A-M1 |
| G2 | full vitest | v1.0.4 の件数＋13・FAIL 0 | A-M1／A-M2 |
| G3 | `npm run build` | OK・`src/core` diff 0（`git diff 35a7f91 -- src/core` 空） | A-M1 |
| G4 | probe（龍神 PC／SP375・鬼将 `?pilot=threat` 3 seed）：`AudioBufferSourceNode.start` を hook して `enemy_charge@0.7／0.6` の回数と時刻を記録 | 帯の遷移 1 回につき 1 回・Break 開始（`cf2-break` クラス付与）との差 ±16ms・着弾音との差＝stop＋90 ±16ms・console error 0 | A-M2／A-M3 |
| G5 | 回帰：決定232 METRIC LOCK・決定257 rise／duck・`unlockedBeforeBreakEnd` 6/6 | 不一致 0 | A-M4 |
| G6 | CEO Human QA（同 seed Before＝v1.0.4／After） | 下記 3/3 | A-H |

推奨：G4 は既存の probe（Enemy Break v1 の計測スクリプト）に start の hook を足すだけで足りる。v1.0.5 の他 Lane（`feat/v1_0_5-enemy-heavy-shake`）とはファイル重複 0（本 branch は `combatTimeline.ts`／`useCombatPresentation.ts`／`enemyVfxTiming.ts` を触らない）。

---

## 6. CEO Human QA（3 問・同 seed で Before／After）

1. **Q1**：HP が半分／4 分の 1 を切った瞬間、**音だけで**「追い詰めた」と分かりましたか？（YES が合格）
2. **Q2**：その音は、攻撃が当たった音とは**別の出来事**に聞こえましたか？（YES が合格）
3. **Q3**：うるさい・音が多すぎると感じましたか？（NO が合格）

不合格時の調整案（1 つだけ・自動調整しない）：Q3 が YES → quarter（4 分の 1）だけ鳴らす（`shouldPlayBreakSe` を `level === 'quarter'` に変える 1 行）。

---

## 7. Decision 行の案（PM 統合時に `docs/DECISIONS.md` へ）

「Enemy Break SE v1：敵の表示 HP が 50%／25% の帯をまたいだ崩しの瞬間に、既存 `enemy_charge` を rate 0.7／0.6・専用係数 0.55（実効 0.4675）で 1 回鳴らす。溜め予告中の half は鳴らさない。v2 監査の `stateChange` 流用案（実効 0.5525）は溜め予告・L2 着弾を上回るため却下（AI 判断・CLAUDE.md §6-2・比較案＝v3 §2 の (b)(c)(d)(e)・検証＝本書 §4／§5）。」
