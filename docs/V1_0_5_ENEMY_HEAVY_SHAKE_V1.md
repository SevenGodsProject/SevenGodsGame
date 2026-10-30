# v1.0.5 候補：敵攻撃の重量感（Enemy Heavy Shake v1）

> **状態（2026-10-24・Dev・AI 判断（CLAUDE.md §6-2 軽微な演出調整））**：実装済み・targeted vitest／`tsc -b` PASS・**PM の直列 Gate 待ち**。branch `feat/v1_0_5-enemy-heavy-shake`（起点 origin/master `35a7f91`＝v1.0.4 Production）・ローカル commit のみ（push／merge／tag／deploy 0）。仕様の出典は `docs/COMBAT_PREMIUM_V3_TOP2.md`（Lane 6・branch `docs/lane6-combat-premium-v3`）§5「TOP2：(d)」。

---

## 0. 結論

敵の必殺（`special`・技名付き連撃）の自分側着弾と、敗北を決める最後の被弾で、戦闘エリア（`.battle-main`）を **3px／240ms**・**4px／280ms** 揺らす。神の一撃・撃破（5px／320ms）より常に小さく、「神の一撃が最上段」の単調性は保つ。揺れは結果ゲート（`planResultGate`＝表示 HP 終了＋200）より前に必ず終わり、ゲートの値は v1.0.3 から 1ms も変えていない。`prefers-reduced-motion` では既存の `!reduced` ガードで揺れない。

CEO 判断が必要な事項：**0**（§6-3 非該当）。

---

## 1. 仕様（実装どおり）

| 項目 | 値 |
|---|---|
| 対象 ① | 敵の必殺：`ENEMY_ACTED kind==='special'`、または `multiAttack`＋`label`（`planBatch` の既存 `isSpecial`）。自分側着弾（role `enemy`）の**最後の 1 発** |
| 対象 ② | 敗北の決着被弾：`outcome==='lost'` かつ `finalStep.role==='enemy'`（通常攻撃でも対象） |
| 統合 | ①②が同じ着弾なら ② の 1 本（4px） |
| 非対象 | 通常攻撃（敗北以外）・技名なし連撃・自傷（`selfCost`・自傷での敗北も含む）・カード |
| 敵側優先 | 同バッチに敵側の揺れ（L4・神の一撃・撃破のリアクション）があれば `selfShake=null`（揺れの二重を防ぐ。例：蒼毘の反撃での撃破） |
| 開始 | `atMs + stopMs`。必殺 1,260＋40＝**1,300**／技名付き連撃 1,600＋40＝1,640／敗北の決着は stop 90（例：必殺で敗北 1,350） |
| 振幅・長さ | 必殺 `SELF_SHAKE_SPECIAL_PX=3`・`SELF_SHAKE_MS.special=240`／決着 `SELF_SHAKE_FINAL_PX=4`・`SELF_SHAKE_MS.final=280` |
| キーフレーム | 既存の敵側揺れと共通（同じ WAAPI 呼び出し・同じ `arenaRef`・ease-out） |
| reduced-motion | 純関数は値を出す（stop は 0）。再生側の既存ガード `shake && arena && !reduced` で animate 0 回 |
| 結果ゲート | 不変。揺れ終わり（例：必殺で敗北 1,350＋280＝1,630）＜ ゲート 2,100 |

### 1-1. 揺れ終わりと結果ゲート（commit=0・ms）

| 敗北経路 | 揺れ開始 | 揺れ終わり | `planResultGate` | 余白 |
|---|---|---|---|---|
| 通常攻撃（normal 158） | 248 | 528 | 998 | 470 |
| 通常攻撃（heavy 228） | 318 | 598 | 1,068 | 470 |
| 必殺（1,260） | 1,350 | 1,630 | 2,100 | 470 |
| 技名付き連撃（最後 1,600） | 1,690 | 1,970 | 2,440 | 470 |

余白は常に `HP_LAG 90 + GHOST_HOLD 120 + GHOST_DRAIN 340 + 200 − 280 = 470ms`（着弾時刻に依存しない）。

---

## 2. 変更ファイル

| ファイル | 変更 | 行数 |
|---|---|---|
| `src/components/battle/enemyVfxTiming.ts` | `ARENA_SHAKE_PX`／`ARENA_SHAKE_MS`（既存の 3／5px・240／320ms を定数化・値不変）＋ `SELF_SHAKE_SPECIAL_PX`／`SELF_SHAKE_FINAL_PX`／`SELF_SHAKE_MS` | +15 |
| `src/components/battle/combatTimeline.ts` | `ShakePlan` 型・`BatchPlan.selfShake`（1 フィールド）と算出（条件 1 つ） | +18 |
| `src/components/battle/useCombatPresentation.ts` | 既存の WAAPI 呼び出しを「敵側 `big` が無ければ `plan.selfShake`」に拡張（キーフレーム共通・リテラル→定数） | +10／−3 |
| `src/components/battle/enemyHeavyShake.test.ts` | 新規・専用テスト 11 件 | +137 |

`src/core` 0・`battle.css` 0・音（`sound.ts`／`useBattleSound.ts`）0・save／storage 0・asset 0・`BattleScreen.tsx` 0・既存テスト変更 0。

---

## 3. 仕様書（TOP2 §5）との差分と理由

| # | 仕様書 | 実装 | 理由 |
|---|---|---|---|
| 1 | 「揺れは決着被弾の着弾時に終わる（1,300＋280＝1,580）」 | 敗北の決着は 1,350 開始・1,630 終わり | 実コードの `hitStopFor` は決着の一撃に `FINAL_HIT_STOP_MS=90` を使う（自分側の通常 stop 40 ではない）。開始は spec 自身の規則「`atMs + stopMs`」どおり。ゲート 2,100 より 470ms 前に終わるので受入条件は満たす |
| 2 | テストは `combatTimeline.test.ts` に 3 件 | 専用ファイル `enemyHeavyShake.test.ts` に 11 件 | 依頼の「専用ユニットテスト」に従い、既存テスト（他 branch で同時編集されやすい）を触らない。件数は受入 D-M2／D-M3 を全部カバーするため |
| 3 | 定数 3 つ | 定数 5 つ（既存の敵側 3／5px・240／320ms も定数化） | 「神の一撃より小さい」をテストでコードの実値と比較するため、および CLAUDE.md「調整値は集約」。値は不変（テスト 9 で固定） |
| 4 | 自分側着弾（ブロックの扱いは未記載） | 必殺を全ブロックしても揺れる | 必殺のカットイン・着弾リングはブロックに関わらず出る＝「重い一撃が来た」事実は同じ。揺れだけ消えると演出の段が欠ける。敗北の決着は `amount>0` の着弾のみ（既存 `finalStep` 規則） |
| 5 | `outcome==='lost'` の `finalStep`・role `enemy` | 同じ。自傷での敗北は揺らさない | 「敵攻撃の重量感」の範囲を守る（自傷は自分のカードの結果） |
| 6 | 行数見込み `useCombatPresentation.ts` +6／`combatTimeline.ts` +8 | +10／−3・+18 | doc コメント（周囲の密度に合わせた）と型定義の分 |

---

## 4. テスト結果（2026-10-24・ローカル）

| 種別 | 対象 | 結果 |
|---|---|---|
| targeted vitest | `enemyHeavyShake.test.ts`（新規 11）＋ `combatTimeline.test.ts` | 2 files・39 tests PASS |
| targeted vitest（関連） | `combatTimeline`／`useCombatPresentation`／`enemyVfxTiming` を参照する 11 files（battleEntrance・combatTimeline・decisionFeedback・enemyBreak・enemyHeavyShake・godStrikeStage・godStrikeVideo・soundLayer・useMobileAutoFocus・victoryReveal・visualHp） | 11 files・136 tests PASS |
| 型 | `npx tsc -b --noEmit` | exit 0 |
| 未実施（PM 管理） | full vitest・build・oxlint・Playwright probe | §5 の Gate で PM が直列実行 |

新規テスト 11 件の内訳：必殺 3px／1,300 開始・技名付き連撃は最後の 1 発 1,600・全ブロックでも揺れる・敗北の決着 4px（3 visualType）・必殺／連撃での敗北は 1 本に統合・通常攻撃／技名なし連撃／自傷／カード／自傷敗北／finished 通常は null・敵側の撃破揺れを優先・reduced は値あり＋再生側 `!reduced` ガード（ソース照合）・振幅／長さの階層（< 5px／320ms）・敗北 3 経路×3 visualType で揺れ終わり < ゲート・ゲート値の固定（998／2,100／2,440＝v1.0.3 の式どおり）。

---

## 5. PM が直列で流す Gate 案（6GB 環境・1 つずつ）

| 順 | Gate | 合格値 |
|---|---|---|
| G1 | `npx tsc -b --noEmit` | exit 0（Dev 実施済み・再確認） |
| G2 | oxlint（変更 4 ファイル） | 新規警告 0 |
| G3 | full vitest | v1.0.4 の件数＋新規 11、失敗 0 |
| G4 | build | OK・`src/core` diff 0 |
| G5 | probe（Playwright・PC 1280／SP 375）鬼将 R4「断岩」経路＝`defeat-check.mjs` と同じ seed | arena の transform が必殺着弾＋stop（1,300±30）で始まり 240／280±30 で 0 へ戻る／結果画面の出現時刻が v1.0.4 と ±16ms／`fxOffViewport` 増加 0／横スクロール 0／console error 0 |
| G6 | probe reduced（`reducedMotion: 'reduce'` context） | arena の `getAnimations()` 0 本 |
| G7 | 回帰 | 決定232 METRIC LOCK（着弾・stop・HP 時刻）不一致 0／勝利経路 timer 列不変／決定252 必殺着弾 1,260 不変 |
| G8 | 統合 | Break SE（`feat/v1_0_5-break-se`）とファイル重複 0 を `git diff --name-only` で確認してからマージ順を決める |

統合時の Decision 行（PM が `docs/DECISIONS.md` に追記）：「D224 §11『画面揺れは Tier 4／5 だけ』を、敵側 Tier 5（必殺）と敗北の決着被弾にも適用する。振幅は神の一撃（5px）未満の 3／4px に限り、神の一撃が最上段である単調性を保つ（AI 判断・CLAUDE.md §6-2・比較案＝(b)(c)(e)・検証＝本書 §4・§5）」。

---

## 6. CEO Human QA（同 seed Before／After・PC と iPhone・5 分）

| # | 質問 | 合格 |
|---|---|---|
| Q1 | 敵の必殺が「重い一撃が来た」と体で分かったか | YES |
| Q2 | 神の一撃の揺れの方が大きく感じたか | YES |
| Q3 | 酔う・うるさい・やりすぎと感じたか（iPhone でも確認） | NO |

不合格時の調整案（1 つだけ・自動調整しない）：Q3 YES → 必殺 2px、敗北の決着のみ 3px（`enemyVfxTiming.ts` の定数 2 つだけ）。
