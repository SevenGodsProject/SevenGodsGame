# W5 将軍家 最終（十七代将軍・康虎 Boss ★5）— 実装・Gate 記録（決定288 v1.1・2026-11-03）

> **状態：IMPLEMENTED・自動 Gate ALL PASS・CEO Human QA 1 戦 待ち。** branch `feat/w5-shogunate-wave5`（起点 master `f4828cf`＝v1.1.2 Production runtime）・worktree `SevenGodsGame-w4`。AI 判断（CLAUDE.md §6-2）。決定288 v1.1 §10-3 の W5（ロードマップ表記では W6 康虎）。merge（＝v1.1.3 Production 公開）は CEO Gate。

## 0. 結論

| 項目 | 結果 |
|---|---|
| 追加 | 公式 Kit 将軍家 **1 体**（enemy_18 十七代将軍・康虎）。将軍家は **10 体＝全員公開**（通常 18 枚＝CORE 7＋将軍家 10＋委ねる）。決定288 v1.1 の敵追加はこれで完了（残りは W6 演出品質向上と最終 Gate） |
| 判断の型 | **追い込まねば裁きが下る**（全語彙の複合）：R2 連撃 5×3／R3 溜め→R4 忠次型 tactic（R3 終了時に HP を **6 割以下**（hard 65%）まで追い込めば「近習の槍」6×3、届かなければ必殺 32「将軍の威」）／R5 重撃 14／R6 溜め→R7 忠次型 tactic 2 段目（**15% 以下**（hard 20%）まで追い込めば 12、届かなければ必殺 36「穢土の裁き」）。HP **114**（既存最大 忠勝 112 の上）・合計 then 67／else 105（既存最大 82 の上） |
| engine | **変更 0**。cond は既存 `enemyHpRatioAtMost`。Boss 専用の比 2 組を `RULES.enemyTactic.bossOpeningHpRatio 0.6（hard 0.65）`／`bossFinalHpRatio 0.15（hard 0.2）` に集約（**指紋除外**区画・敵データが `cond.ratio` として埋め込む）。save v9 不変・intent は既存 4 kind のみ |
| ★5 | `rank: 5`＝v1.0.1 から空けてあった Boss 予約枠を使用。`enemies.test.ts` を「通常 ≤4・康虎のみ 5」へ更新。星 UI は既存 5 個固定（`MAX_THREAT_STARS`）のためそのまま。Daily／49 盤／委ねる seed は CORE 固定＝康虎は出ない |
| 見せ場（表示のみ・新 CSS 1 ファイル） | 黒と金の威光・Enemy Break の帯で金が褪せて赤が差す（将軍が追い込まれていく）・溜めは金の輪・大広間の減光＋上からの金の薄明。既存の見た目は不変 |
| version | package version **1.1.2 → 1.1.3**（Home `v1.1.3 (sha)`） |
| ★実測 | 康虎 normal 指数 **48.4**（hard 63.3）＝18 体で最上位（忠勝 41.9 ★4 を +6.5 上回る）→ **★5**（Boss 枠・帯の上限 ★4 ≥36.5 を超える位置）。既存 7 体・将軍家 9 体の指数は W4 と完全一致 |
| build | JS `index-Dc6IP1lD.js 492.68 kB（v1.1.2 491.10 → +1.58 kB）`・CSS `index-DyYCyOuG.css 208.95 kB（+1.66 kB）` |
| 外部費用 | 0（Kit 原本は公式配布 URL から取得・sha256 一致） |
| 次 | push → PR → CI → **CEO iPhone Human QA**（§4・1 戦）→ CEO merge（v1.1.3）→ AI Smoke → LIVE 記録 → W6（敵演出 品質向上・横断）→ 最終 Release Gate → 運営報告書 |

## 1. 変更内容

| 層 | 変更 |
|---|---|
| `src/core/data/rules.ts` | `enemyTactic.bossOpeningHpRatio／ByDifficulty`・`bossFinalHpRatio／ByDifficulty`（gameVersion 指紋から除外済みの区画） |
| `src/core/data/enemies.ts` | `SHOGUNATE_ENEMY_IDS.yasutora`（enemy_18）・def 1 体（rank 5） |
| `src/components/battle/BattleScreen.tsx` | `shogunateWave5.css` import |
| `src/components/battle/shogunateWave5.css`（新規） | 康虎の見せ場（`[data-enemy='enemy_18']` に閉じる・reduce の @media なし） |
| `src/components/setup/creditsText.ts` | 将軍家 10 体の名前 |
| `package.json`・`package-lock.json`・`src/publicFace.test.ts` | version 1.1.3 |
| assets | `public/assets/enemies/yasutora/art.webp`（768²・alpha・72,062 B）・`backgrounds/stages/17-yasutora-throne.webp`（STG-02 の非生成派生・187,116 B）。原本 `art-source/enemies/yasutora/yasutora_front.webp`（sha256 `fb7b5dcf…` manifest 一致）。台帳 §12 |
| scripts | `scripts/shogunate-wave5-sim/`（Preflight sim）・受入 3 本の枚数 18／19・chip 10・threat モードの 1 戦を鬼半蔵 → 康虎（legacy モードはドーマンのまま） |
| tests | enemies 18 体・rank「通常 ≤4・康虎のみ 5」／roster 10 体・康虎の値・2 段 tactic の分岐・17 体で素材一意／tactic 契約（比は rules・engine 経路：R6 終了時 HP を final 比以下にして R7 開始 → then）／tacticLine（「将軍の威を止める」「穢土の裁きを止める」・R6 の残り） |

## 2. Gate 結果（直列・6 GB 機・preview :4199＝W5 dist）

| # | 項目 | 結果 | 証跡（`docs/evidence/shogunate-wave5/`） |
|---|---|---|---|
| G1 | tsc／oxlint／vitest full／build | **0／0（warning は既存 scripts のみ）／1,687 passed・17 skipped／492.68 kB** | commit・本書 |
| G2 | CORE 不変（sha256・golden・49・gameVersion） | **PASS（不変）** | vitest |
| G3 | cf2 決定論 probe（既存 7 体 PC＋龍神 sp375） | **8/8 MATCH（turns／plays／heavy／帯遷移が統合 Gate 基準と一致・JS error 0）** | `s10-cf2/`・`COMPARE_VS_INTEGRATION_GATE.json` |
| G-★ | ★監査（18 体） | 18 体 × 7 神 × 3 難易度 × 16 seed × 6 打ち筋：既存 7 体 **指数・順序 v1.0.1 と一致**／将軍家 9 体は W4 と同値／康虎 48.4（hard 63.3・easy 31.2）→ 最上位 → ★5（`star-reeval-w5.json`：coreIndexMatchesV101・shogunateW4IndexMatches・yasutoraIsTop すべて true） | `star/` |
| G4 | balanceSim 決定287（hard × 全神 × 将軍家 10 体 ≥50%） | **PASS**（HP 掃引 §3：116 以上は必殺を 24／28 まで下げても 1 神が 43〜48% で詰み → 114。114 では必殺 32／36 でも全神 ≥50%） | vitest |
| G-P | Preflight sim（7 神 × 40 seed × normal／hard × greedy／guard／rush） | normal R4 then：greedy **28.9%**・guard 21.4%・rush **43.9%**（rush − guard 22.5pt ≥ 10）／R7 then：greedy 52.4%・rush 64.7%／勝率 normal 41〜51%・hard 9〜15%（素朴方策の参考値。詰み判定は balanceSim が正） | `sim.json`・`sim-stdout.txt` |
| G5a | 公開 受入（pc／sp375 × 3 モード・忠次／ドーマン／康虎の 1 戦） | **228/228（18 枚・将軍家 10 名・見出し 1・注記 chip 10・Pilot 0／忠次戦／ドーマン R3「共鳴あと4で五重塔を止める」→ R4 逆さ五重塔 240／康虎 R3「将軍の威を止める」→ R4 将軍の威 320・JS error 0）** | `acceptance/` |
| G5b | Threat 受入（lane1・18／19 枚） | **74/74** | `threat-acceptance/` |
| G6a | hardening | **10/10 ALL PASS** | `hardening/` |
| G6b | 旧セーブ互換（master＝v1.0.6 build :4195 → W5 :4199） | **44/44 PASS** | `save-migration/` |
| G7 | a11y minimum pack | **69/69 ALL PASS** | `a11y/` |
| S2 | 回帰受入（18 枚・version `v1.1.3 (sha)`＝build 時の HEAD） | **44/44** | `s2-acceptance/` |

## 3. 設計メモ（AI 判断）

- **HP 114**：ロードマップ案「HP 140 帯」は balanceSim 決定287（hard × 全神 × 3 戦略 × 40 戦）で大耀 8%／寿楽 3%／福永 3%／笑蓮 0% の詰み。掃引（HP 112〜128 × 必殺 24〜38）で決め手は HP（116 以上は必殺を 24／28 に下げても 45% 止まり）→ 114 が上限＝既存最大（忠勝 112）の上に置いた。Boss の重さは HP ではなく **全語彙＋必殺 2 発（32／36）＋合計 105** で出す
- **★5 を実測で裏づける配分**：ロードマップ値（連撃 4×3・近習 5×3・必殺 30／34・合計 98）では ★監査の normal 指数が 40.5 で忠勝（41.9・★4）を下回った。Enemy Select の注記「★は実測の手強さ」に反しないよう、balanceSim を満たす範囲で連撃を 5×3／近習を 6×3 に上げたうえで候補 3 つ（必殺 +2 のみ／+R1 +2・R5 +2／+R1 +4・R5 +4）を ★監査と Preflight sim で比較し、指数 48.4（最上位・忠勝 +6.5）で素朴方策の normal 勝率が最も高い（41〜51%）**必殺 +2 のみ（32／36・合計 105）** を採用（他 2 案は 51.3／53.9 だが normal 勝率 35%／27〜33%）
- **2 段 tactic の比**：忠次型の既定 0.5 では 3 R で 57 を要求し、Preflight sim の R4 then 率が greedy 8.6%／rush 16.4%（＝ほぼ常に「将軍の威」が来る＝判断が成立しない）。比の掃引（opening 0.6〜0.75 × final 0.1〜0.2）で、**0.6／0.15** が「読めば止まり（rush 43.6%）・読まなければ来る（guard 25%）・2 段目も五分（then7 59%）」の帯。0.7 以上は then4 69〜83% で裁きが珍しくなりすぎる
- 2 段目（R7）の問いは「R6 までにとどめの帯（15%）へ入れたか」。入れていれば R7 は 12 で済む＝R7 の攻めに回せる。入れていなければ 34 を受けるかブロックするか（忠勝の「受けるか削り切るか」が最終 R に重なる）
- 敵ブロック・手札封じ・共鳴干渉は使わない（ロードマップ §2-2「不採用」どおり）。Boss は **既存語彙の密度** で表現する
- version bump 1.1.3 は本 wave に同梱（W4 と同じ）

## 4. CEO Human QA（iPhone・1 戦・YES／NO）

準備：W5 preview `http://192.168.11.6:4199/`。敵選択の「将軍家」見出しの下に 10 体。康虎のカードは ★5。
| # | 戦 | 問い | 期待 |
|---|---|---|---|
| Q1 | 康虎（ふつう） | R3「あと N で将軍の威を止める」を見て R3 までに追い込もうとしたか／R6「あと N で穢土の裁きを止める」で最終 R の受け・攻めを迷ったか。★5・黒金の見た目が Boss として読めるか | YES |

## 5. 残リスク

- hard：素朴方策では勝率 19〜29%（最善方策で全神 ≥50%）＝Boss の hard は「読み＋受け」を要求する重さ（意図どおり）
- R4 の「近習の槍」6×3 は連撃＝ブロックは 1 pool から逐次消費（既存 魔獣と同じ仕様）。読めた側の報酬が「軽い」ことは sim の then 側勝率で確認
- 立ち絵は FRONT（透過）＝切り抜き目視は不要。舞台は STG-02 派生の金（Boss の色）

## 6. 変更していないもの

- 既存 7 体・忠次〜ドーマンのデータ／CSS・Threat Pilot・Daily／49 盤／seed／gameVersion・save v9・engine（tactic／round／reducer）・BGM／SE／神ボイス・`battle.css`。外部費用 0・音声 0
