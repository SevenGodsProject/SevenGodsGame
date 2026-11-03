# W2 将軍家 第二陣（岡っ引き・直政・康政）— 実装・Gate 記録（決定288 v1.1・2026-11-03）

> **状態：IMPLEMENTED・自動 Gate ALL PASS・CEO Human QA Q1〜Q3 PASS（2026-11-03）→ Release GO・CEO merge 待ち。** branch `feat/w2-shogunate-wave2`（起点 master `f7e263d`＝v1.0.7 Production runtime）・worktree `SevenGodsGame-w2`。AI 判断（CLAUDE.md §6-2）で実装・Gate を実施。決定288 v1.1 §10-3 の W2。merge（＝v1.1.0 Production 公開）は CEO Gate。

## 0. 結論

| 項目 | 結果 |
|---|---|
| 追加 | 公式 Kit 将軍家 **3 体**（enemy_10 捕り方・岡っ引き／enemy_11 将軍四天王・直政／enemy_12 将軍四天王・康政）を通常の Enemy Select に。将軍家は 4 体（忠次を含む）＝通常 12 枚（CORE 7＋将軍家 4＋委ねる） |
| 判断の型（差別化） | 岡っ引き＝**群れ**（偶数 R の小刻み連撃・R6 技名つき連撃＝ブロックの価値）／直政＝**追い込むと猛る**（R4 軍略：then 連撃 5×3 special・else 必殺 22＝忠次の逆の分岐の形）／康政＝**1 ラウンドで崩す**（R4 roundDamageAtLeast：R3 の 1 ラウンド実効ダメージ ≥ maxHp×0.25（hard 0.20）で采配が崩れる＝R2 温存→R3 一点集中の判断） |
| engine | cond 1 種追加（`roundDamageAtLeast`・+12 行相当）。`tacticBranch`／`resolveEnemyTactic` に省略可の `roundDamage`（既存呼び出し不変）・`round.ts` が `state.mastery.roundDamage` を渡す。`RULES.enemyTactic` に比 2 項（**指紋除外**）。save v9 不変・intent は既存 4 kind のみ |
| 見せ場（表示のみ・新 CSS 1 ファイル） | 岡っ引き＝提灯色の光層＋必殺充填の紫輪／直政＝Enemy Break の帯（half／quarter）に連動して赤熱／康政＝翠の光層＋「あと N で采配を崩す」→「✓ 采配を崩した」の緑転。3 体共通の舞台減光。既存 7 体・忠次の CSS は不変 |
| 不変（機械証明） | CORE 7 体 sha256・pickEnemyId golden・Daily golden・49 盤・gameVersion `1.d794038a00b5b53c`・save v9・BGM／SE／神ボイス・`battle.css` |
| ★ | 実測（12 体 ★監査）：岡っ引き normal 21.0／直政 28.4／康政 28.8 → **3 体とも ★1**（道化 28.6 の帯）。既存 7 体の指数は v1.0.1 と完全一致。数値調整は行わない（CEO 方針） |
| build | JS `index-BzZnWX0-.js` 485.39 kB（v1.0.7 481.16 → **+4.23 kB**）・CSS `index-CT4lzcIP.css` 201.97 kB（+3.33 kB：見出し 1 ブロック＋W2 CSS） |
| 外部費用 | 0（画像は Kit 公式・舞台は既存派生・音声なし） |
| 次 | push → PR → CI GREEN → **CEO iPhone Human QA**（§4・3 戦）→ CEO merge（v1.1.0）→ AI Smoke → 決定288 W2 LIVE 記録 → W3 |

## 1. 変更内容

| 層 | 変更 |
|---|---|
| `src/core/types/enemy.ts` | `EnemyTacticCond` union に `roundDamageAtLeast` |
| `src/core/engine/tactic.ts` | `tacticRoundDamageNeeded`（切り上げ）・`tacticBranch`／`resolveEnemyTactic` の第 5 引数 `roundDamage = 0` |
| `src/core/engine/round.ts` | `nextEnemyAction` が `state.mastery.roundDamage` を渡す（startRound のリセット前＝R4 開始時に R3 の値） |
| `src/core/data/rules.ts` | `enemyTactic.defaultRoundDamageRatio 0.25`・`roundDamageRatioByDifficulty { easy .25, normal .25, hard .2 }`（gameVersion 指紋から除外済みの区画） |
| `src/core/data/enemies.ts` | `SHOGUNATE_ENEMY_IDS` に okappiki／naomasa／yasumasa・3 defs（仮値は Preflight sim で確定）・rank 1（実測） |
| `src/components/battle/tacticLine.ts` | 康政型の残り（needed − roundDamage）・`tacticLineWords`（総攻めを止める／一文字を止める／采配を崩す） |
| `src/components/battle/EnemyPanel.tsx`・`BattleScreen.tsx` | `roundDamage` prop・文言の一般化・`shogunateWave2.css` import |
| `src/components/battle/shogunateWave2.css`（新規） | 3 体の見せ場（`[data-enemy='enemy_1x']` に閉じる・reduce の @media なし） |
| `src/components/setup/EnemySelectScreen.tsx`・`setup.css` | 将軍家の見出し（全幅・`enemy-section-shogunate`）・1 ブロック |
| `src/components/setup/creditsText.ts` | 将軍家 4 体の画像出典・創作の明記 |
| assets | `public/assets/enemies/{okappiki,naomasa,yasumasa}/art.webp`（768²・alpha）・`backgrounds/stages/{09,10,11}-*.webp`（既存派生）。原本 `art-source/enemies/*`（sha256 は manifest と一致）。台帳 `ASSET_RIGHTS_LEDGER.md` §9 |
| scripts | `scripts/shogunate-wave2-sim/`（Preflight sim）・受入 3 本の枚数 12／13・`shogunate-public-v1/acceptance.mjs` に康政／直政の 1 戦 |
| tests | tactic 契約（康政型・engine 経路）・tacticLine 文言・roster 4 体・coreRoster・enemies・pilotFlag／shogunateVisual の署名 pin |

## 2. Gate 結果（直列・6 GB 機・preview :4197＝W2 dist）

| # | 項目 | 結果 | 証跡（`docs/evidence/shogunate-wave2/`） |
|---|---|---|---|
| G1 | tsc／oxlint／vitest full／build | **0／0／1,668 passed・17 skipped／485.39 kB** | commit・本書 |
| G2 | CORE 不変（sha256・golden・49・gameVersion） | **PASS（不変）** | vitest |
| G3 | cf2 決定論 probe（既存 7 体 PC＋龍神 sp375） | **8/8 MATCH**（turns／plays／heavy／帯遷移が統合 Gate 基準と一致・JS error 0） | `s10-cf2/`・`COMPARE_VS_INTEGRATION_GATE.json` |
| G-★ | ★監査（12 体 × 7 神 × 3 難易度 × 16 seed × 6 打ち筋＝24,192 run・253 秒） | 既存 7 体 **指数・順序 v1.0.1 と一致**／岡っ引き 21.0・直政 28.4・康政 28.8 → ★1 | `star/` |
| G4 | balanceSim 決定287（hard × 全神 × 将軍家 4 体 ≥50%） | **PASS** | vitest |
| G-P | Preflight sim（7 神 × 40 seed × normal／hard × greedy／burst） | 直政 normal greedy **then 42.9%**（帯 35〜65）・hard 51.1%／康政 normal 狙わない **30.7%**・狙う **75.0%**（差 44pt）・hard 狙う 78.9%・burst 勝率 95.7 ≥ greedy 90.4／hard 最善勝率：直政 74.6・康政 82.1・岡っ引き 99.6（≥50） | `sim.json` |
| G5a | 公開 受入（pc／sp375 × 3 モード・康政／直政の 1 戦を追加） | **192/192**：12 枚・将軍家 4 名・見出し 1・注記 chip 4（SP375 でカード内）・Pilot 印／案内 0／忠次戦（battleSave→続きから→records）／康政 R3「あと24で采配を崩す」→ R4 采配・総崩し 260／直政 R3「一文字を止める」→ R4 猛り・一文字 220・JS error 0 | `acceptance/` |
| G5b | Threat 受入（lane1・12／13 枚） | **74/74** | `threat-acceptance/` |
| G6a | hardening | **9/9 ALL PASS** | `hardening/` |
| G6b | 旧セーブ互換（master＝v1.0.6 build :4195 → W2 :4197） | **44/44 PASS** | `save-migration/` |
| G7 | a11y minimum pack | **69/69** | `a11y/` |
| S2 | 回帰受入（12 枚・version `v1.0.6 (f7e263d)`＝build 時の HEAD） | **44/44** | `s2-acceptance/` |

## 3. 設計メモ（AI 判断）

- 岡っ引き MAIN（非透過イラスト）は生成 AI での切り抜きをせず、人物中心の切り出し＋放射状フェード（非生成）で「肖像」風に。舞台 09 は STG-02 の色相回転（提灯の紫）
- 直政の then は忠次と同じ条件（HP 比）だが **連撃 special**＝「追い込むと手数が増える」。else の必殺 22 より合計は小さい（15）ので「追い込む方が得」は保たれる（一択化せず、ブロックの配分が変わる）
- 康政 R2 は設計どおり 8（LANE3 計画の「R2 引き上げ」は sim で burst が支配戦略にならない＝greedy 90.4 vs burst 95.7・スコア同等のため採らない）
- Enemy Select の見出しは 11 枚になった時点の可読性のため（決定288 §2-3）。文言に「公式」は使わない

## 4. CEO Human QA（iPhone・3 戦・各 1 問・YES／NO）

準備：W2 preview `http://192.168.11.6:4197/`。敵選択の「将軍家」見出しの下に 4 体。
| # | 戦 | 問い | 期待 |
|---|---|---|---|
| Q1 | 岡っ引き（ふつう） | 小刻みな連撃にブロックで応じる「群れ」の手応えがあり、R6「十手・乱打」のカットインに違和感がないか | YES |
| Q2 | 直政（ふつう） | R3 の「あと N で一文字を止める」を読み、止めた／止めなかったで R4 が変わる（猛り連撃／一文字）のが分かるか。赤熱の見た目が邪魔でないか | YES |
| Q3 | 康政（ふつう） | R3 中に札を出すたび「あと N で采配を崩す」が減り、崩すと「✓」。R2 で温存して R3 に集中する判断が生まれたか | YES |

**結果（CEO・2026-11-03）：Q1 PASS（岡っ引き）／Q2 PASS（直政）／Q3 PASS（康政）→ v1.1.0 Release GO。** PR #10（v1.0.7 LIVE 記録）の merge に先立ち、同 branch を本 branch へ merge（DECISIONS の追記行 conflict のみ・両方保持・runtime 同一）。

## 5. 残リスク

- 3 体とも ★1（実測）：将軍家 4 体が全員 ★1 帯＝「★帯の穴」は埋まらない（数値調整はしない方針）
- 岡っ引きの肖像風カットアウト（CEO 目視 Q1）
- 直政 hard の burst 方策は弱い（30.4%）が最善方策（greedy 74.6%）で詰みなし

## 6. 変更していないもの

- 既存 7 体・忠次（enemy_08）のデータ／CSS・Threat Pilot（enemy_09）・Daily／49 盤／seed／gameVersion・save v9・全 storage・BGM／SE／神ボイス・`battle.css`
- 外部費用 0・音声 0
