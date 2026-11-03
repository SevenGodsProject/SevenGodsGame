# W4 将軍家 第四陣（忠勝・ドーマン）— 実装・Gate 記録（決定288 v1.1・2026-11-03）

> **状態：IMPLEMENTED・自動 Gate ALL PASS・CEO Human QA 2 戦 待ち。** branch `feat/w4-shogunate-wave4`（起点 master `ee4f187`＝v1.1.1 Production runtime）・worktree `SevenGodsGame-w4`。AI 判断（CLAUDE.md §6-2）。決定288 v1.1 §10-3 の W4。merge（＝v1.1.2 Production 公開）は CEO Gate。

## 0. 結論

| 項目 | 結果 |
|---|---|
| 追加 | 公式 Kit 将軍家 **2 体**（enemy_16 将軍四天王・忠勝／enemy_17 科学者・ドーマン）。将軍家は 9 体＝通常 17 枚（CORE 7＋将軍家 9＋委ねる）。残りは康虎（W5・Boss ★5）のみ |
| 判断の型 | 忠勝＝**受けるか削り切るか**（HP 112・単発重撃＋R3／R6 溜め→R4「蜻蛉切・一閃」24／R7「蜻蛉切・断」28 の特大 2 発。tactic なし・敵ブロックなし）／ドーマン＝**共鳴を溜めるほど危ない**（R4／R7 が新 cond `resonanceAtLeast`：ラウンド開始時の共鳴ゲージが max×0.5＝**4 以上**なら塔は沈黙（攻撃 9／11）、届かなければ必殺 24「逆さ五重塔」／26「逆さ五重塔・反転」。ゲージは 7 で自動発動して 0 に戻る＝**撃つか温存するか**） |
| engine | cond 1 種追加（`resonanceAtLeast`・`tacticResonanceNeeded` ＋ 分岐 3 行）。`tacticBranch`／`resolveEnemyTactic` に省略可の `resonance`／`resonanceMax`（既存呼び出し不変）・`round.ts` が `state.resonance` を渡す。`RULES.enemyTactic.defaultResonanceRatio 0.5`（**指紋除外**区画）。ゲージは読むだけで触らない（決定217 不干渉）。save v9 不変・intent は既存 4 kind のみ |
| 見せ場（表示のみ・新 CSS 1 ファイル） | 忠勝＝黒鉄と橙の熱・Enemy Break の帯で橙が増す（盾が割れていく）／ドーマン＝紫の光層・溜めで紫の輪・「共鳴あと N で五重塔を止める」→「✓ 五重塔を止めた」の緑転（共鳴札を出すたびに減り、満タンで発動すると armed に戻る）。2 体共通の舞台減光。既存の見た目は不変 |
| version | package version **1.0.6 → 1.1.2**（v1.0.7〜v1.1.1 で据え置いた表示を揃える・Home `v1.1.2 (sha)`・S2 と旧セーブ互換で確認） |
| ★ | 実測（17 体 ★監査）：忠勝 normal 指数 41.9 → **★4**（龍神 37.7 を超え 17 体で最高・将軍家初の ★4）／ドーマン 30.0 → **★1**（道化 28.6〜機工師 31.4 の間）。既存 7 体の指数・順序は v1.0.1 と完全一致 |
| build | JS `index-IPcNdBFC.js` 491.10 kB（v1.1.1 488.35 → **+2.75 kB**）・CSS `index-99EWKury.css` 207.29 kB（+2.28 kB） |
| 外部費用 | 0 |
| 次 | push → PR → CI → **CEO iPhone Human QA**（§4・2 戦）→ CEO merge（v1.1.2）→ AI Smoke → LIVE 記録 → W5（康虎 Boss ★5） |

## 1. 変更内容

| 層 | 変更 |
|---|---|
| `src/core/types/enemy.ts` | `EnemyTacticCond` union に `resonanceAtLeast` |
| `src/core/engine/tactic.ts` | `tacticResonanceNeeded`（切り上げ・max 0 は到達不能）・`tacticBranch`／`resolveEnemyTactic` の第 6／7 引数 `resonance = 0, resonanceMax = 0` |
| `src/core/engine/round.ts` | `nextEnemyAction` が `state.resonance.value／max` を渡す |
| `src/core/data/rules.ts` | `enemyTactic.defaultResonanceRatio 0.5`（gameVersion 指紋から除外済みの区画） |
| `src/core/data/enemies.ts` | `SHOGUNATE_ENEMY_IDS` に tadakatsu／doman・2 defs・rank は実測 |
| `src/components/battle/tacticLine.ts` | `TacticLine.gauge?: 'resonance'`・ドーマン型の残り（needed − value）・文言「五重塔を止める」 |
| `src/components/battle/EnemyPanel.tsx`・`BattleScreen.tsx` | `resonance`／`resonanceMax` prop・「共鳴あと N で」（×10 スケール非適用）・`shogunateWave4.css` import |
| `src/components/battle/shogunateWave4.css`（新規） | 2 体の見せ場（`[data-enemy='enemy_16/17']` に閉じる・reduce の @media なし） |
| `src/components/setup/creditsText.ts` | 将軍家 9 体の名前 |
| `package.json`・`package-lock.json`・`src/publicFace.test.ts` | version 1.1.2 |
| assets | `public/assets/enemies/{tadakatsu,doman}/art.webp`（768²・alpha）・`backgrounds/stages/{15-tadakatsu-bastion,16-doman-pagoda}.webp`（STG-08／04 の非生成派生）。原本 `art-source/enemies/*`（sha256 は manifest と一致）。台帳 §11 |
| scripts | `scripts/shogunate-wave4-sim/`（Preflight sim）・受入 3 本の枚数 17／18・chip 9・legacy モードの 1 戦を康政 → ドーマン |
| tests | roster 9 体（忠勝・ドーマンの値・ゲージ 4／3 の分岐）・enemies 17 体・tactic 契約（ドーマン型・engine 経路：R3 終了時のゲージを 4 にして R4 開始→then・ゲージ不変）・tacticLine（共鳴あと N・R7・他型は引数を読まない）・source pin 4 件を新署名へ |

## 2. Gate 結果（直列・6 GB 機・preview :4199＝W4 dist）

| # | 項目 | 結果 | 証跡（`docs/evidence/shogunate-wave4/`） |
|---|---|---|---|
| G1 | tsc／oxlint／vitest full／build | **0／0（warning は既存 scripts のみ）／1,680 passed・17 skipped／491.10 kB** | commit・本書 |
| G2 | CORE 不変（sha256・golden・49・gameVersion） | **PASS（不変）** | vitest |
| G3 | cf2 決定論 probe（既存 7 体 PC＋龍神 sp375） | **8/8 MATCH（turns／plays／heavy／帯遷移が統合 Gate 基準と一致・JS error 0）** | `s10-cf2/`・`COMPARE_VS_INTEGRATION_GATE.json` |
| G-★ | ★監査（17 体） | 17 体 × 7 神 × 3 難易度 × 16 seed × 6 打ち筋：既存 7 体 **指数・順序 v1.0.1 と一致**／忠勝 41.9（hard 59.9）→ ★4・ドーマン 30.0（hard 44.0）→ ★1・将軍家 他 7 体は W3 と同値 | `star/` |
| G4 | balanceSim 決定287（hard × 全神 × 将軍家 9 体 ≥50%） | **PASS**（忠勝は HP 120 帯で福永 33%／笑蓮 45% の詰み → HP 112 で全神 ≥50%） | vitest |
| G-P | Preflight sim（7 神 × 40 seed × normal／hard × greedy／hold／guard・ratio 0.5） | ドーマン R4 then：normal greedy **23.9%**（読まなければ塔）・hold **69.6%**（差 45.7pt）・hard hold 69.6%／R7 then：hold 97.6%（normal）・85.4%（hard）／hold 勝率 98.9 ≥ greedy 95.7・hard 87.1／忠勝 normal 77.5%・hard greedy 26.8（素朴方策の参考値。詰み判定は balanceSim が正） | `sim.json` |
| G5a | 公開 受入（pc／sp375 × 3 モード・忠次／ドーマン／鬼半蔵の 1 戦） | **222/222**：17 枚・将軍家 9 名・見出し 1・注記 chip 9（SP375 でカード内）・Pilot 0／忠次戦／ドーマン R3「共鳴あと4で五重塔を止める」→ R4 逆さ五重塔 240／鬼半蔵 R3「血風を止める」→ R4 鬼嶽・血風 240・JS error 0 | `acceptance/` |
| G5b | Threat 受入（lane1・17／18 枚） | **74/74** | `threat-acceptance/` |
| G6a | hardening | **9/9 ALL PASS** | `hardening/` |
| G6b | 旧セーブ互換（master＝v1.0.6 build :4195 → W4 :4199） | **44/44 PASS** | `save-migration/` |
| G7 | a11y minimum pack | **69/69 ALL PASS** | `a11y/` |
| S2 | 回帰受入（17 枚・version `v1.1.2 (ee4f187)`＝build 時の HEAD） | **44/44** | `s2-acceptance/` |

## 3. 設計メモ（AI 判断）

- **ドーマンの cond を `resonanceAtLeast` にした理由**：ロードマップ §2-2 の案のとおり。then（軽い手）＝「ゲージを 4〜6 に置いて迎える」。ゲージは 7 で自動発動して 0 に戻るため「溜めるほど発動で失う」＝ロードマップの「共鳴を溜めるほど危ない」と「早めに撃つか温存するか」の両方が同じ機構で成り立つ。R3／R6 の溜め中に共鳴札を出すたび「共鳴あと N」が減り、発動すると armed に戻る＝未来情報ではなく「今の自分の状態」を読む（決定263 の境界内）。報酬問題（決定217）には触れない（ゲージを読むだけ）
- **しきい値 0.5（＝4）**：Preflight sim で greedy（読まない）23.9% vs hold 69.6%（差 45.7pt）。比較した 0.7（＝5）は greedy 9.3%／hold 43.9%（5〜6 の窓が狭く温存が成立しにくい・hold 勝率も 96.8 → 低下）ため 4 を採用（`docs/evidence/shogunate-wave4/sim.json` は 0.5 の本番値）
- **忠勝の HP 112**：ロードマップ案「HP 120 帯・26／30」は balanceSim 決定287（hard × 全神 × 3 戦略 × 40 戦）で福永 33%／笑蓮 45% の詰み。掃引（HP 96〜120 × 特大 20〜28）の結果、決め手は HP（7 R で削り切れるか）で、特大 24／28 を残して HP 112（既存最大 龍神 103・鬼半蔵 110 の上）に置いた。素朴方策の proxy sim は hard 27〜29% だが、defensive／balanced で全神 ≥50%（詰みなし）
- 鉄壁型は tactic を持たない（ロードマップどおり）。「受けるか削り切るか」は R3／R6 の溜め予告（1 手先）に対するブロック配分と、R7 までに 112 を削る攻めの配分で問う
- version bump 1.1.2 は本 wave に同梱（docs-only の bump を別 PR にしない＝CEO 操作最小化）。S2 の Home version・旧セーブ互換の「注入前後で version 表示不変」で機械確認

## 4. CEO Human QA（iPhone・2 戦・各 1 問・YES／NO）

準備：W4 preview `http://192.168.11.6:4199/`。敵選択の「将軍家」見出しの下に 9 体。
| # | 戦 | 問い | 期待 |
|---|---|---|---|
| Q1 | 忠勝（ふつう） | R3「次は蜻蛉切」→ R4 の特大を受ける（ブロック）か、削りに回すかの判断が生まれ、R7 の「蜻蛉切・断」まで緊張が続くか。黒鉄＋橙の見た目が邪魔でないか | YES |
| Q2 | ドーマン（ふつう） | R3「共鳴あと N で五重塔を止める」が共鳴札を出すたびに減り、4 以上で「✓」になる／満タンで発動すると戻る、が読めるか。撃つか温存するかを迷ったか | YES |

## 5. 残リスク

- 忠勝 hard：素朴方策では勝率 27〜29%（最善方策で ≥50%）＝hard は「受け」を要求する重さ（意図どおり・★実測で帯を確認）
- ドーマン：共鳴札の少ないデッキ（神によっては共鳴札 1〜2 枚）では hold が成立しにくい → then 率 byGod を sim.json に記録（最小の神でも 0 ではない）
- 2 体の立ち絵は FRONT（透過）＝切り抜き目視は不要

## 6. 変更していないもの

- 既存 7 体・忠次〜鬼半蔵のデータ／CSS・Threat Pilot・Daily／49 盤／seed／gameVersion・save v9・BGM／SE／神ボイス・`battle.css`・共鳴の機構（ゲージの増減・発動）。外部費用 0・音声 0
