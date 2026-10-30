# 将軍家 Pilot v0.6（忠次）改善設計 監査 — READ-ONLY

> 状態（2026-10-29・AI-PM Lane 1・**AI 判断**（CLAUDE.md §6-2））：v0.5 iPhone Human QA 完了（11 問・好評価 9／部分的肯定 2／否定 0・AI-PM 暫定 90/100）を受けた設計監査。**実装 0・runtime 変更 0**・docs／evidence のみ。push／merge／deploy 0。
> 対象：branch `feat/shogunate-pilot-v0.5`（worktree `SevenGodsGame-shogunate-v05`）。証跡 `docs/evidence/shogunate-v0_6-audit/`。

## 0. 結論

**GO（v0.6 実装へ進んでよい）**。最小変更は 2 点、いずれも忠次（enemy_08）に閉じる。

| # | 課題 | 最小変更 | 規模 |
|---|---|---|---|
| P0 | 赤い光の意味が「なんとなく」 | R3 の溜め中だけ、名札の予告の下に **「あと N で総攻めを止める」** を 1 行出す（N は表示 HP から毎フレーム計算・赤い光と同じ赤）。閾値を割った瞬間 **「✓ 総攻めを止めた」**（金）に変わる＝赤い輪が消える・崩れと**同じフレーム** | EnemyPanel に enemy_08 限定の分岐 1 つ＋CSS 1 ブロック（`[data-enemy='enemy_08']`） |
| P1 | hard で追い込み成功率が低い | 忠次の軍略条件に **`ratioByDifficulty: RULES.enemyTactic.hpRatioByDifficulty`** を足す（hard 0.6・easy／normal 0.5 のまま）。新しい調整値は作らない（enemy_09 で採用済みの既存値） | データ 1 行 |
| P2 | 分岐の価値の定量確認 | 変更なし。計測結果を §3 に記録（then はスコア約 +5%・残 HP +9〜10pt。勝率差は小さい） | — |

ゲーム仕様の根本（7R・コスト・勝敗条件・分岐の仕組み・予告文言・技名・数値 then 12／else 24）は変えない。既存 7 体・enemy_09 は変更 0。**実装開始は CEO の GO 確認後**（本書は依頼どおり監査のみ）。

## 1. P0：R3 予告の情報設計（1 案に絞る）

### 1-1. 現状（コードと実画面）

- R3 の予告は `charge` の文言「⚠ 傷が浅ければ次は総攻め」（`enemies.ts` 忠次 actions[2]）＋立ち絵の赤い輪（`enemy-avatar-charging-super`・v0.3 の drop-shadow ×5）。
- 赤い輪は**全敵共通の「次は必殺」の印**で、忠次では「表示 HP で軍略を解決した結果が必殺なら付く」（`EnemyPanel.tsx` v0.4 分岐）。つまり意味は「このままだと総攻め」だが、画面のどこにもそう書いていない。
- 「傷が浅ければ」には**どこまで削ればよいかの量**がない。プレイヤーは 50% の境界を知らず、札の「敵に 140 ダメージ」と比べる手掛かりもない。
- 実画面（`docs/evidence/shogunate-v0_5/07-probe/*-r3-start.webp`）：SP375 は予告が 2 行の大きな箱。その下に余白あり。名札のステータス行は `flex-wrap`（`battle.css:4837`）で 1 行足しても折り返すだけ。

### 1-2. 比較した案

| 案 | 内容 | 評価 | 判定 |
|---|---|---|---|
| A | HP バーに 50% の刻み（総攻めライン） | HP バーは `overflow:hidden`・数値の pill が中央付近（実画面で約 35〜65%）を覆う → **0.5／0.6 の刻みがちょうど数字の下に隠れる**。刻みをバーの外に出すには HpBar（敵・自分・チュートリアルで共有）の DOM を変える必要がある。量も「目で位置を読む」しかない | 却下 |
| B | 予告文言を「⚠ HP 490 以下で総攻めを止める」に変更 | 好評だった文言と雰囲気を変える（禁止事項「好評演出の削除」に抵触しうる）。SP で 3 行化の恐れ。数字が固定で、削るたびに引き算が要る | 却下 |
| C | 吹き出し（battleCries）で説明 | 台詞はラウンドごとの固定文。R3 中に HP が動いても変わらない。台詞は CEO 監修待ちの範囲 | 却下 |
| D | 遊び方／ヘルプに説明を追加 | 戦闘中に見ない。Pilot 専用の説明を共通画面に入れることになる | 却下 |
| **E** | **予告の下に「あと N で総攻めを止める」（N は残りダメージ・ライブ更新）→ 割ったら「✓ 総攻めを止めた」** | 文言・赤い輪・崩れは**そのまま**で、その意味と量を 1 行で足す。N は札の数字と同じ単位（表示 ×10）なので「140 の札 2 枚で届く」と即計算できる。輪と同じ赤で「赤い光＝総攻めの溜め」を結び、解除の瞬間は金（v0.4 の金の溜め光）で達成感を強める | **採用** |

### 1-3. 採用案 E の仕様（v0.6）

| 項目 | 仕様 |
|---|---|
| 出す条件 | `isShogunateEnemyId(enemy.defId)` かつ `enemy.intent.kind === 'charge'` かつ次の行動表が `tactic`（＝忠次の R3 だけ）。撃破中・結果画面では出さない。**enemy_09 には出さない**（決定263 の境界・Lane 1 の CEO QA 済み画面を不変に） |
| しきい値 HP | `thrHp = 表示 HP がこれ以下なら then になる最大の整数`。`tacticBranch(script, hp, maxHp, difficulty)` と**全 hp（0〜maxHp）・全難易度で一致**することをテストで固定（浮動小数の誤差対策） |
| 文言 | 未達：「あと {formatScaled(hpShown − thrHp)} で総攻めを止める」／到達：「✓ 総攻めを止めた」。文言は表示専用の定数（多言語化前の直書き方針どおり） |
| 色・形 | 未達＝赤い輪と同じ `#ff5c5c` の小さな丸＋文字（色だけに頼らない：文字で意味が分かる）。到達＝金 `#ffd9a1` 系。サイズは予告より一段小さく（PC 12px／SP 12px 目安・Gate で実測）。点滅・常時アニメなし |
| 同期 | 判定は `hpShown`（赤い輪・Enemy Break と同じ値）＝**輪の消失・崩れ・「止めた」が同じ描画フレーム** |
| アクセシビリティ | 文字で状態を表す。`aria-live` は付けない（削るたびに読み上げが連発するため。予告本体は既存のまま） |
| reduced-motion | 動きなし（文字と色の切替のみ）なので追加規則不要 |
| 敵のブロック | 忠次は行動表にブロックが無い＝N は「敵に与えるダメージ」と一致。将来ブロック持ちの将軍家に流用する場合は別 Decision |

## 2. P1：hard の分岐条件（sim 比較）

`docs/evidence/shogunate-v0_6-audit/sim-threshold-branch.json`（7 神 × 40 seed × 2 方策・敵定義はテストのメモリ上だけで差し替え＝ファイル変更 0。スクリプト同フォルダ `.txt`）。目標帯＝then 率 35〜65%（決定274 Gate G1）かつ normal を大きく超えない（難易度の逆転を避ける）。

| hard しきい値 | then 率 greedy／raceAware | R3 で届く局面 | 届かない局面 | 判定 |
|---|---|---|---|---|
| 0.50（現状） | 16.8%／22.5% | 26.1% | 73.9% | 一択化（帯外） |
| 0.55 | 32.9%／41.4% | 42.1% | 57.5% | greedy が帯に届かない |
| **0.60** | **43.9%／60.4%** | **56.4%** | **42.9%** | **帯内・normal（38.6%／52.1%）と同水準** |
| 0.65 | 68.9%／79.6% | 70.4% | 25.0% | 帯外・normal を超える（hard の方が追い込みやすい逆転） |

- 0.6 は `RULES.enemyTactic.hpRatioByDifficulty.hard`（Threat Pilot v1.1 で同じ理由で採用済み）と同値 → **新しい調整値ゼロ**・数値は rules.ts のまま（不変ルール 4）。
- easy／normal は 0.5 のまま＝**挙動 byte 不変**（sim の easy・normal 値は v0.5 と完全一致：normal 38.6%／52.1%、easy 63.6%／76.4%）。
- hard の難しさ：勝率 98.6〜98.9% は 0.5／0.6 で同じ（then 側が増えても else 側の負けが少し減るだけ）。
- 「届く局面」は R3 開始時の手札の攻撃合計＋天啓で見積もった上限（神力の制約は含まない粗い値）。相対比較にだけ使う。
- gameVersion：忠次は `SHOGUNATE_ENEMIES`（指紋外）・`ratioByDifficulty` も指紋除外（`invariants` の既存チェック）→ **不変の見込み**（実装 Gate で golden を確認）。

## 3. P2：分岐の価値（定量）

同 sim の then／else 別（最終スコア＝`getFinalScore`）：

| 難易度（しきい値） | then：勝率／残 HP／スコア | else：勝率／残 HP／スコア | 差（then − else） |
|---|---|---|---|
| normal（0.5）greedy | 100%／0.789／837 | 100%／0.685／794 | 残 HP +10.4pt・スコア +43（+5.4%） |
| hard（0.6）greedy | 100%／0.760／850 | 97.5%／0.673／811 | 勝率 +2.5pt・残 HP +8.7pt・スコア +39（+4.8%） |
| hard（0.6）raceAware | 100%／0.752／846 | 97.3%／0.719／809 | 勝率 +2.7pt・スコア +37 |

読み：分岐は**スコアと残 HP に一貫して効く**（Human QA の「分岐は勝敗・スコアに重要」と方向が一致）。勝敗への効き目は hard でも 2〜3pt と小さく、総攻め 240 の「恐怖」は主に演出と残 HP で生まれている。QA で否定 0 のため **v0.6 では報酬設計を変えない**（変更すると好評の手触りを動かすリスクの方が大きい）。bot は素朴なので絶対値ではなく方向として扱う。

## 4. 回帰条件（好評演出を守る）

| # | 守るもの（QA で好評） | 条件 | 検証 |
|---|---|---|---|
| G1 | R3 の予告文言 | 「⚠ 傷が浅ければ次は総攻め」が一字一句不変・書式／色不変 | `shogunateRoster.test.ts:128`・受入 |
| G2 | R3 の赤い輪 | 未達中は `box-shadow none`・`drop-shadow` ×5（v0.5 probe と同値） | `shogunate-pilot/probe.mjs` |
| G3 | 「追い込めた」の一体感 | 崩れの開始・赤い輪の消失・「✓ 総攻めを止めた」が**同一 rAF フレーム（差 0ms）**（PC・SP375） | probe に 1 項目追加 |
| G4 | R4 の答え合わせ | seed `sg-v04-01`＝強打 120（then）／`02`・`03`＝軍略・総攻め 240（else）・必殺カットイン・揺れ（3px／240ms）が v0.5 と同一（normal） | probe・se-shake-probe |
| G5 | 「あと N」の正しさ | 全 hp × 全難易度で `N == 0 ⇔ tacticBranch === 'then'`・N は表示 HP の減少に追従・R3 以外／撃破中は非表示 | 新規 vitest（表示ロジックの純関数） |
| G6 | easy／normal の挙動 | sim の then 率・勝率・スコアが v0.5 と完全一致 | 本 sim を v0.6 で再実行 |
| G7 | 既存 7 体 | CORE sha256 golden・gameVersion `1.d794038a00b5b53c`・cf2 probe 8 run が v1.0.2 RC G8 と完全一致・見た目差分 0（`[data-enemy='enemy_08']` 外の CSS 追加 0） | invariants・probe（v0.5 と同手順） |
| G8 | enemy_09 | 「あと N」行が出ない・解決分岐なし・受入（chip 1・notice 1）不変 | 受入・unit |
| G9 | SP レイアウト | SP375／390 で横はみ出し 0・名札が立ち絵の顔／吹き出しに重ならない・FX との重なり 0・名札の高さ増加 ≤ 1 行 | probe の layout・撮影 |
| G10 | Pilot 隔離 | `?pilot=shogunate` のときだけ・記録キー増加 0（受入 138 系） | 受入 |
| G11 | SE／揺れ・reduced-motion | v1.0.5 の計画値どおり・reduced-motion で動き 0 | se-shake-probe |

## 5. v0.6 実装計画（CEO GO 後・Pilot branch のみ）

| 手順 | 内容 | 担当 |
|---|---|---|
| 1 | branch `feat/shogunate-pilot-v0.6` を v0.5（本 HEAD）から作成 | PM |
| 2 | P1：`enemies.ts` 忠次 cond に `ratioByDifficulty: RULES.enemyTactic.hpRatioByDifficulty`。`shogunateRoster.test.ts`・`invariants.mjs` の「ratioByDifficulty なし」を Expected Specification Update として更新（理由コメント付き） | Planner／Dev |
| 3 | P0：表示ロジックを純関数（例 `tacticLine(script, hpShown, maxHp, difficulty) → { remaining, cleared } \| null`）として components 側に置き、`EnemyPanel` は enemy_08 のときだけ呼ぶ。`src/core` は P1 の 1 行以外 0 | Dev |
| 4 | CSS：`battle.css` 末尾の enemy_08 ブロックに 1 ルール群（未達＝赤／到達＝金） | Designer |
| 5 | テスト：G5 の全数テスト・enemy_09 非表示・CORE 不変 | Dev |
| 6 | Gate（直列）：tsc／oxlint 新規 0／full vitest／build／invariants／受入／probe（G2〜G4・G9）／既存 7 体 probe（G7）／se-shake（G11）／sim（G6・P1） | PM |
| 7 | CEO iPhone 再 QA（3 問・約 4 分）：①R3 で「あと N」を見て赤い光の意味が分かったか ②「あと N」を見て札を選んだか ③「止めた」の瞬間の達成感は v0.5 と同等以上か。任意で hard 1 戦 | CEO |

### 5-1. 受け入れ基準

| 区分 | 基準 |
|---|---|
| 自動 | §4 G1〜G11 すべて PASS・FAIL 0（headless の実時間ずれは従来どおり WARN 扱い） |
| sim | hard then 率 greedy 35〜65%（見込み 43.9%）・raceAware ≤ 65%（見込み 60.4%）／easy・normal は v0.5 と完全一致 |
| 表示 | SP375／PC で「あと N」が 1 行・横はみ出し 0・文字サイズ 12px 以上・背景とのコントラスト 4.5:1 以上 |
| Human QA | ①②が YES、③が「同等以上」。否定が出た場合は文言だけを 1 回調整（仕組みは変えない） |

### 5-2. リスク

| リスク | 対策 |
|---|---|
| 数字を出すことで「計算するだけ」になり、恐怖・緊張が薄れる | 出すのは R3 だけ・R1／R2 は出さない。QA ③で確認 |
| 決定263（正解・推奨手を出さない）との関係 | 出すのは条件の量だけで、どの札を出すべきかは出さない。enemy_09 には適用しない |
| hard の分岐が増えて難しさが下がる | sim で勝率 98.6〜98.9% は 0.5 と同値。総攻めを止めても then 12 の攻撃は残る |
| 表示 HP と実 HP のずれ | v0.4 と同じく表示 HP で判定。R4 開始時には一致（既存の設計） |

## 6. CEO 判断が必要な事項

なし（§6-3 該当なし）。P1 は既存の調整値の適用（§6-2 バランス調整）、P0 は表示のみ（§6-2 軽微な UI 改善）。依頼に従い、**実装の開始のみ CEO の GO を待つ**。
