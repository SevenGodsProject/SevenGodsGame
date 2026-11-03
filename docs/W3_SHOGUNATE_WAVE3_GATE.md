# W3 将軍家 第三陣（影・くノ一・鬼半蔵）— 実装・Gate 記録（決定288 v1.1・2026-11-03）

> **状態：IMPLEMENTED・自動 Gate ALL PASS・CEO Human QA 3 戦 待ち。** branch `feat/w3-shogunate-wave3`（起点 master `72025ae`＝v1.1.0 Production runtime）・worktree `SevenGodsGame-w3`。AI 判断（CLAUDE.md §6-2）。決定288 v1.1 §10-3 の W3。merge（＝v1.1.1 Production 公開）は CEO Gate。

## 0. 結論

| 項目 | 結果 |
|---|---|
| 追加 | 公式 Kit 将軍家 **3 体**（enemy_13 忍者衆・影／enemy_14 忍者衆・くノ一／enemy_15 影の頭領・鬼半蔵）。将軍家は 7 体＝通常 15 枚（CORE 7＋将軍家 7＋委ねる） |
| 判断の型 | 影＝**2 回の読み**（R2：R1 で 15 以上削られたか（HP 比 ≤0.85）で連撃 3×3／重撃 11 の静かな分岐・予告なし／R5：R4 溜め→HP 比 ≤0.35（hard 0.45）で攻撃 9／else 必殺 20「闇討ち」＝「あと N で闇討ちを止める」）／くノ一＝**疾風**（連撃中心・R5 溜め→R6「影走り」6×3 special＝ブロック配分と体力管理）／鬼半蔵＝**頭領**（HP 110・R4 軍略 HP 比 ≤0.55（hard 0.65）で連撃 4×3 special／else 必殺 24「鬼嶽・血風」・R7 必殺 26＝読みの期限が早く、終盤も重い） |
| engine | **変更 0**（既存語彙＋忠次型 tactic のみ。cond の ratio をデータで指定） |
| 見せ場（表示のみ・新 CSS 1 ファイル） | 影＝月光の藍・溜めで影が濃くなる／くノ一＝月の金・金の充填輪／鬼半蔵＝血風の朱・Enemy Break 連動で赤み増。3 体共通の舞台減光。既存の見た目は不変 |
| ★ | 実測（15 体 ★監査・24,192 run×15/12）：鬼半蔵 normal 31.7 → **★2**（機工師の帯）／影 25.3・くノ一 21.9 → ★1。既存 7 体の指数は v1.0.1 と完全一致 |
| build | JS `index-DNBBJmQ3.js` 488.35 kB（v1.1.0 485.39 → **+2.96 kB**）・CSS `index-DeaC83I8.css` 205.01 kB（+3.04 kB） |
| 外部費用 | 0 |
| 次 | push → PR → CI → **CEO iPhone Human QA**（§4・3 戦）→ CEO merge（v1.1.1）→ AI Smoke → LIVE 記録 → W4（忠勝・ドーマン） |

## 1. 変更内容

| 層 | 変更 |
|---|---|
| `src/core/data/enemies.ts` | `SHOGUNATE_ENEMY_IDS` に kage／kunoichi／onihanzo・3 defs（しきい値は Preflight sim で確定・rank は実測） |
| `src/components/battle/shogunateWave3.css`（新規）・`BattleScreen.tsx` import | 3 体の見せ場（`[data-enemy='enemy_13〜15']` に閉じる・reduce の @media なし） |
| `src/components/setup/creditsText.ts` | 将軍家 7 体の名前 |
| assets | `public/assets/enemies/{kage,kunoichi,onihanzo}/art.webp`（768²・alpha）・`backgrounds/stages/{12,13,14}-*.webp`（STG-03／05／02 の色相回転派生）。原本 `art-source/enemies/*`（sha256 は manifest と一致）。台帳 §10 |
| scripts | `scripts/shogunate-wave3-sim/`（Preflight sim）・受入 3 本の枚数 15／16・chip 7・threat モードの 1 戦を鬼半蔵へ |
| tests | roster 7 体（影 R2／R5・くノ一・鬼半蔵の値）・enemies 15 体・tacticLine 文言（闇討ち／血風） |

## 2. Gate 結果（直列・6 GB 機・preview :4198＝W3 dist）

| # | 項目 | 結果 | 証跡（`docs/evidence/shogunate-wave3/`） |
|---|---|---|---|
| G1 | tsc／oxlint／vitest full／build | **0／0／1,673 passed・17 skipped／488.35 kB** | commit・本書 |
| G2 | CORE 不変（sha256・golden・49・gameVersion） | **PASS（不変）** | vitest |
| G3 | cf2 決定論 probe（既存 7 体 PC＋龍神 sp375） | **8/8 MATCH**（turns／plays／heavy／帯遷移が統合 Gate 基準と一致・JS error 0） | `s10-cf2/` |
| G-★ | ★監査（15 体） | 既存 7 体 **指数・順序 v1.0.1 と一致**／鬼半蔵 31.7 → ★2・影 25.3・くノ一 21.9 → ★1 | `star/` |
| G4 | balanceSim 決定287（hard × 全神 × 将軍家 7 体 ≥50%） | **PASS** | vitest |
| G-P | Preflight sim（7 神 × 40 seed × normal／hard × greedy／burst） | 影 R5 then **51.8%**（normal greedy・帯 35〜65）・hard 51.1%／鬼半蔵 R4 then **38.9%**・hard 55.4%／hard 最善勝率：影 87.5・くノ一 99.6・鬼半蔵 65.4（≥50）。しきい値の調整履歴：鬼半蔵 既定 0.5 → 23.6% のため 0.55（hard 0.65）／影 R5 既定 0.5 → 79.6% のため 0.35（hard 0.45） | `sim.json` |
| G5a | 公開 受入（pc／sp375 × 3 モード・康政／鬼半蔵の 1 戦） | **210/210**：15 枚・将軍家 7 名・見出し 1・注記 chip 7（SP375 でカード内）・Pilot 0／忠次戦／康政 R3「あと24で采配を崩す」→ 260／鬼半蔵 R3「血風を止める」→ R4 鬼嶽・血風 240・JS error 0 | `acceptance/` |
| G5b | Threat 受入（lane1・15／16 枚） | **74/74** | `threat-acceptance/` |
| G6a | hardening | **9/9 ALL PASS** | `hardening/` |
| G6b | 旧セーブ互換（master＝v1.0.6 build :4195 → W3 :4198） | **44/44 PASS** | `save-migration/` |
| G7 | a11y minimum pack | **69/69 ALL PASS** | `a11y/` |
| S2 | 回帰受入（15 枚・version `v1.0.6 (72025ae)`＝build 時の HEAD） | **44/44** | `s2-acceptance/` |

## 3. 設計メモ（AI 判断）

- 影の R2 分岐は予告（charge）を挟まない「静かな分岐」＝「あと N」行を出さない。R1 で 15 以上削った（HP 比 ≤0.85）プレイヤーには連撃 3×3（9）、削れなかったら重撃 11。読みの材料は R1 の自分の行動＝決定263 の境界（未来情報の常時表示）を越えない
- 鬼半蔵の then（連撃 12）は else（24）の半分＝「追い込めば楽になる」が保たれ、R7 必殺 26 で終盤も重い。HP 110 のため既定 0.5 では then 率 23.6% だったので 0.55 に（必要ダメージ 50＝忠次 49 と同帯）。Enemy Break の崩れ（50%）より先に「✓」が出る（全難易度・頭領は読みの期限が早い）
- くノ一は tactic なし（判断は連撃に対するブロック配分と R6 への体力管理）

## 4. CEO Human QA（iPhone・3 戦・各 1 問・YES／NO）

準備：W3 preview `http://192.168.11.6:4198/`。敵選択の「将軍家」見出しの下に 7 体。
| # | 戦 | 問い | 期待 |
|---|---|---|---|
| Q1 | 影（ふつう） | R1 の削り方で R2 の手が変わる（連撃／重撃）ことと、R4「追い込めねば次は闇討ち」→ R5 の「あと N で闇討ちを止める」が読めるか | YES |
| Q2 | くノ一（ふつう） | 速い連撃にブロックで応じる手応えと、R6「影走り」のカットインに違和感がないか。肖像風の切り抜きも目視 | YES |
| Q3 | 鬼半蔵（ふつう） | 「あと N で血風を止める」→ 止めた／止めなかったで R4 が変わり、R7 の頭領斬りまで緊張が続くか。朱の見た目が邪魔でないか | YES |

## 5. 残リスク

- 影・くノ一の肖像風カットアウト（Q1／Q2 目視）
- 鬼半蔵 hard greedy 勝率 65.4%（詰みなし・やや重い）
- 将軍家 7 体の ★は ★1〜2 帯（実測方針のまま）

## 6. 変更していないもの

- engine・rules・既存 7 体・忠次・第二陣のデータ／CSS・Threat Pilot・Daily／49 盤／seed／gameVersion・save v9・BGM／SE／神ボイス・`battle.css`。外部費用 0・音声 0
