# 決定216 — 蒼海の龍神 R4「守りの姿勢」Pilot：**NO-GO / PILOT WITHDRAWN**（2026-09-23）

決定215 の Pilot Spec を実装し、実 runtime で定量 Gate EG1〜EG9 を測定した結果 **EG1・EG2・EG5 が FAIL**。
CEO 判断により Pilot は採用せず、実装は取り下げた（balance 調整・数値調整・新しい報酬機構の追加による救済はしない）。
この文書は、取り下げた実装の測定結果と経緯を残すための記録である。**採用理由の記録ではない。**

## 1. 最重要の反証

> **「敵が守っている」こと自体は「攻撃しない理由」にならない。**

実 runtime（蒼海の龍神 × 恵比寿・推奨デッキ・ふつう・600 試合）：

| 方策 | score | 撃破R | 残HP | 被ダメ |
| --- | --- | --- | --- | --- |
| 対応（守りのラウンドは大技を温存） | **661.82** | 5.30 | 27.85 | 2.15 |
| reader（予告を無視） | **662.49** | 5.25 | 27.45 | 2.56 |
| heal（常に回復＝最良の代替） | **666.18** | 5.29 | 28.56 | 1.44 |

決定215 の scratch simulation は「対応が reader に **+12.3**・heal に **+7.6**」と予測していたが、
実 runtime では **reader に −0.66・heal に −4.35** となり、**再現しなかった**。

**原因**：敵にブロックが立っていても、そのラウンドに攻撃してブロックを削る行為自体が将来のダメージにつながるため、
温存の機会費用（そのラウンドに使えたはずの神力・手札）を上回れなかった。
＝「守っているから攻めない」は、この Core では合理的な判断にならない。

## 2. Gate 測定結果（実 runtime・修正後の実装で測定）

seed：d216-{0..199}・{1000..1199}・{2000..2199}（ふつう 600 試合／むずかしい 200 試合）。
baseline（現行）は比較のためメモリ上でだけ旧行動表へ戻したもの。Gate の定義・閾値・seed 群は決定215 §9 のまま。

| Gate | 結果 | 判定 |
| --- | --- | --- |
| EG1 行動分岐 | 99.17% / **0.99 ラウンド**（基準 1.0 以上） | **FAIL**（僅差） |
| EG2 読む価値 | 対応 661.82 ／ reader 662.49（−0.66）／ heal 666.18（−4.35） | **FAIL** |
| EG3 新しさ | 現行 Intent では対応方策の利点 0 | PASS |
| EG4 倍率依存でない | ブロック 5：対応 663.21／reader 666.46（−3.25）／heal 670.10（−6.89）＝不成立（下限は 8 付近） | PASS |
| EG5 難易度維持 | ふつうは全方策で勝ち数同数・被ダメ減。**むずかしいの対応方策だけ 199/200 < 200/200**、被ダメ 4.07 vs 3.17 | **FAIL** |
| EG6 決定論 | 20/20 一致（乱数を足していない） | PASS |
| EG7 Identity 維持 | guard 1 回・kind は attack/guard のみ・7R 合計 damage 73（現行と同じ） | PASS |
| EG8 OTOMO 設計余地 | 決定215 §6：小槌・琴音の 2 系統（Human QA 未実施） | PASS |
| EG9 score 影響 | 対応（提案）661.82 vs 現行の最良 671.48（**−1.44%**）・撃破R 5.30 vs 5.06 | PASS |

参考（むずかしい・200 試合）：現行 reader 699.99／提案 reader 686.83・提案 対応 687.17。

## 3. 決定215 シミュレーションとの乖離（PREDICTION NOT REPRODUCED IN RUNTIME）

| 項目 | 決定215 scratch simulation | 実 runtime（決定216） |
| --- | --- | --- |
| 対応 − reader | **+12.33** | **−0.66** |
| 対応 − heal | **+7.62** | **−4.35** |
| 行動分岐 | 100% / 1.0R | 99.17% / 0.99R |
| 敵ブロックの置き方 | **play ループの外から state を差し替え**、ラウンド開始時点で `enemy.block` を設定 | engine 実装（`startRound` で設定） |
| ダメージ再配分 | R5〜R7 を 13/18/22 と概算（敵ごとの budget 調整なし） | R5〜R7 を 14/19/24 とし **7R 合計 73 を現行と一致** |
| 対応方策の定義 | 同じ（敵ブロックがあるラウンドは大技を温存） | 同じ |

**何を近似していたか**：scratch は「敵ブロックがある」状態だけを外から作り、**ダメージ配分・engine の処理順・スコア計算の細部**は
近似のままだった。とくに damage budget が現行より少なめ（概算）になっていたため、提案側の被ダメが実際より軽く、
温存による撃破遅れのコストが過小評価された。

**教訓（恒久）**：
- **scratch の state 差し替えシミュレーションを、Release／Pilot の GO の単独根拠にしない。**
- GO の根拠にできるのは、①実 runtime での測定、または ②scratch の結果 ＋ 「実装後に同じ Gate を実 runtime で再測定する」ことを条件にした暫定 GO のみ。
- scratch と実装で差が出やすいのは「いつ状態が変わるか（処理順）」と「総量の budget」。この 2 つは実装前に必ず明示する。
- 決定215 の旧シミュレーション結果は削除せず、そのまま残す（`docs/DECISION215_ENEMY_INTENT_VOCABULARY_AUDIT.md` §7 に追記で注記）。

## 4. 実装中に見つけた不具合（履歴として保持）

| 項目 | 内容 |
| --- | --- |
| 症状 | 初期実装では guard のブロックを **敵ターン（ラウンド終盤）** で付与していた。ブロックは次のラウンド開始で 0 に戻るため、**プレイヤーのターン中は常に 0 で、一度も機能していなかった** |
| 発見 | golden を再生成しても outcome がまったく変わらなかったこと（enemy_06＝龍神の固定リプレイなのに score 345・enemyHp 8 のまま）から判明 |
| 修正 | 承認仕様どおり `startRound` でラウンド開始時に立てる形へ変更し、unit test で「ラウンド開始から立つ／プレイヤーの攻撃を実際に防ぐ／次のラウンド開始で消える」を固定 |
| 影響 | 修正後、golden の outcome が正しく変化（score 345→332・enemyHp 8→16。決着・ラウンド・自HP・rngCursor・手数は不変） |
| 最終 Gate | **§2 の測定はすべて修正後の runtime で行ったもの**（修正前の数値は Gate 判定に使っていない） |

## 5. テスト／記録の更新（実施したが、Pilot が NO-GO のため採用理由にはしない）

| 分類 | 内容 | 証拠 |
| --- | --- | --- |
| ① Expected Specification Update | `enemyActions.test.ts`：龍神だけが R4 に guard を 1 回持つこと、7R 合計 73、**他 6 体に guard が無いこと**、ラウンド開始から立つ挙動を検証（52 件 PASS） | 取り下げ前の working tree |
| ② Measurement Baseline Update | `actionDistribution.test.ts`：最終 runtime で再測定し median 1268→**1265**・p90 1425→**1426**（p95 1475・min・p99・max と Action 数分布は不変）。同じ測定を 2 回実行して一致を確認。タイミング修正前の暫定値（1264/1474）は無効として破棄 | 同上 |
| ③ Pre-existing Test Harness Assumption | `replay.test.ts` の入れ替え位置を「位置（floor(n/3)）」から「**同じラウンドで隣り合う PLAY_CARD の最初の組**」という固定規則へ変更（総当たり探索なし・assertion の意味は不変）。旧方式では才華だけが「同一結果」になっていた | 下表 |
| ④ Expected Golden Update | `gameVersion.test.ts`：現在の engine から**再生成**した実測値へ（`1.e01f29da1cbc1878`／score 332・enemyHp 16） | 同上 |

**③ の修正前後（4 神）**

| 神 | 旧方式で選ばれた 2 手 → 結果 | 新方式で選ばれた 2 手 → 結果 |
| --- | --- | --- |
| 恵比寿 | END_ROUND / PLAY_CARD c19 → 拒否 | PLAY_CARD c8 / c10 → **別結果** |
| 蒼毘 | END_ROUND / PLAY_CARD c5 → 別結果 | PLAY_CARD c5 / c6 → **別結果** |
| 才華 | USE_DIVINATION / PLAY_CARD c1 → **同一（FAIL の原因）** | PLAY_CARD c10 / c6 → **別結果** |
| 笑蓮 | PLAY_CARD c7 / END_ROUND → 拒否 | PLAY_CARD c5 / c6 → **別結果** |

Pre-Gate の状態（取り下げ前）：`tsc -b --noEmit` 0 ／ vitest 1,195 件 PASS ／ oxlint 0。

## 6. 取り下げ（Working Tree）

- 決定216 で変更した **製品 5 ファイル・テスト 4 ファイル** を、明示パスで HEAD の状態へ戻した（`git reset --hard`・`git clean -fd` は使っていない）。
- Gate 測定スクリプトと出力（`scripts/decision216-ryujin-guard/`）は、結果を本書 §2 に要約したうえで明示的に削除した。
- 決定216 以前から存在していた未 commit の変更・未追跡ファイルには手を触れていない。

## 7. 状態

**NO-GO / PILOT WITHDRAWN**（2026-09-23）。runtime・balance・tests・assets は決定216 前の状態。
実装・7 OTOMO 展開・Progression には着手していない。master `270b3e7`・Production `b0fbd3c` 不変。
次は決定217（Player Decision Opportunity Audit・docs-only）。
