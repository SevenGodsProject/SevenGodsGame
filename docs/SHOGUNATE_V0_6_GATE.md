# 将軍家 Pilot v0.6（忠次）実装 Gate — GO（Human QA へ）

> 2026-10-29・AI-PM Lane 1。CEO 実装 GO（監査 `e4218de`＝`docs/SHOGUNATE_V0_6_DESIGN_AUDIT.md`）に基づく。branch `feat/shogunate-pilot-v0.6`（worktree `SevenGodsGame-shogunate-v05`）。実装 `42f4d18`＋Gate 指摘の修正 `ae7a893`。**push／merge／deploy 0・Production 変更 0**。証跡 `docs/evidence/shogunate-v0_6/`。

## 0. 結論

**GO**（自動・sim・表示の Gate はすべて PASS。WARN 3 件は §3。iPhone Human QA へ進める）。

## 1. 変更ファイル（`git diff --stat e4218de..ae7a893`・runtime は 4 ファイル）

| ファイル | 内容 |
|---|---|
| `src/core/data/enemies.ts` | 忠次の軍略 cond に `ratioByDifficulty: RULES.enemyTactic.hpRatioByDifficulty`（既存値。hard 0.6／easy・normal 0.5）。**`src/core` の runtime 差分はこの 1 行＋コメントのみ** |
| `src/components/battle/tacticLine.ts`（新規） | 「あと N」の純関数。N は engine の `tacticBranch` で then になる最大 HP から計算（浮動小数でずれない） |
| `src/components/battle/EnemyPanel.tsx` | 忠次（`isShogunateEnemyId`）・撃破中以外・予告＝溜め・次＝軍略のときだけ予告の下に 1 行。未達は「あと{N}で」＋「総攻めを止める」の 2 span、到達は「✓ 総攻めを止めた」 |
| `src/components/battle/battle.css` | 末尾の enemy_08 ブロックに `.enemy-assault-line` 系（全セレクタ `[data-enemy='enemy_08']`・animation なし） |
| `src/components/battle/tacticLine.test.ts`（新規） | 全難易度 × 全 HP で N＝0 ⇔ then・N の最小性・赤い輪と同値・R3 だけ・既存 7 体 0・enemy_09 非表示・コントラスト 4.5 以上 |
| `src/core/data/shogunateRoster.test.ts` | Expected Specification Update：cond に ratioByDifficulty／G5 境界（easy・normal は崩れと一致、hard は then 67・half 56＝11 HP 手前） |
| `scripts/shogunate-pilot/invariants.mjs`・`probe.mjs` | 不変条件 ⑥ の更新／probe に「あと N」行の状態・同フレーム性・欠け・`SG_DIFFICULTY`（QA ツールのみ） |

## 2. Gate 結果

| # | 項目 | 結果 | 根拠 |
|---|---|---|---|
| 1 | tsc | **0** | `01-tsc.txt` |
| 2 | oxlint | **新規 0**（warning 11＝v0.5 と同一集合） | `02-oxlint.txt` |
| 3 | full vitest | **1,610 PASS・0 fail**（v0.5 1,602＋新規 8） | `03-vitest-full.txt` |
| 4 | build | PASS（JS 478.64 kB・+0.74 kB／CSS 197.74 kB・+0.77 kB） | `04-build.txt` |
| 5 | 不変性 | **20/20**：CORE sha256 `5678e3e7…`・**gameVersion `1.d794038a00b5b53c` 不変**・save v9・指紋に忠次／ratioByDifficulty なし・pickEnemyId ⊆ CORE 7 | `05-invariants.json` |
| 6 | 忠次 受入（Pilot 隔離・通常 URL 7 体） | **138/138** | `06-acceptance/` |
| 7a | 忠次 probe normal（PC・SP375 × seed 3） | **PASS**：R4 は v0.5 と同一（01 then 強打 120／02・03 else 総攻め 240）・R3 文言不変・赤い輪 drop-shadow ×5／box-shadow none 不変・**「あと N」は R3 だけ**（R1・R2・R4 なし）・**「✓ 止めた」・赤い輪の消失・崩れが同一フレーム（PC 1509ms・SP 888ms・差 0）**・JS error 0 | `07-probe-normal/summary.json` |
| 7b | 忠次 probe hard（PC・SP375 × seed 2） | **PASS**：01＝R3 で「あと130」→「✓ 止めた」と赤い輪の消失が同一フレーム → R4 強打 140（then）／02＝R4 総攻め 280（else）・JS error 0。崩れ（50%）は別の札で発生（§3 W1） | `07-probe-hard/summary.json` |
| 8 | 表示（欠け） | **PASS**：全 run で「あと N」行が名札の内側・viewport の内側・横の溢れ 0・page 横スクロール 0・13px。PC 1 行（h24）／SP375 2 行（h41・句の切れ目で改行） | 7a／7b の `tacticLineByRound` |
| 9 | 既存 受入（Home `v1.0.5 (ae7a893)`・遊び方・敵選択） | **44/44** | `08-acceptance44/` |
| 10 | 敗北画面 | **18/18**（`42f4d18` build） | `09-defeat/` |
| 11 | 既存 7 体の決定論（cf2 probe 8 run） | **PASS**：7 run は手数・札・heavy・帯遷移が v1.0.2 RC G8／v0.5 と完全一致。怨霊 PC の 1 回目のみ 14 手（クリック取りこぼし）→ 再実行で 18 手・T17 half＝一致。SP375 龍神のレイアウト矩形は v0.5 と完全一致 | `10-core7-regression/`（`*-rerun-*` 含む） |
| 12 | SE／揺れ | **PC 21/21・SP375 21/21**（`42f4d18` build） | `11-se-shake/` |
| 13 | sim（v0.6 実データ） | **PASS**：easy・normal の忠次は v0.5 と**完全一致**（normal then 38.6%／52.1%）・hard then **16.8% → 43.9%**（目標 35〜65%）・hard 負け 1.1%（不変）・忠次以外 27 行（既存 7 体・enemy_09 × 3 難易度）完全一致 | `12-sim/sim-v06.json` |

`42f4d18` と `ae7a893` の build 差は忠次の行の markup（span 分割）と enemy_08 限定 CSS 1 ルールだけ＝既存 7 体の描画に入らないため、#10〜#12 は `42f4d18` の結果を採用し、#6〜#9 は `ae7a893` で再実行した。

### 2-1. 追加確認（CEO 指定）

| 確認 | 結果 |
|---|---|
| 残り必要ダメージ表示と実際の分岐結果が一致 | unit：3 難易度 × 全 HP で N＝0 ⇔ then・赤い輪と同値／実画面：then の run は全て R3 で「✓ 止めた」→ R4 then、else の run は R3 末まで「あと N」→ R4 総攻め（PC・SP・normal・hard の 10 run で例外 0） |
| SP で表示が欠けない | 名札内・viewport 内・溢れ 0（全 SP run）。2 行で句の切れ目改行 |
| R3 以外に新しい表示が出ない | 全 10 run で R1・R2・R4 は行なし／unit で 7 ラウンド走査・既存 7 体の行動表で 0 |
| 既存 7 体の決定的挙動 | #11・#13（sim 27 行一致・cf2 probe 一致） |
| gameVersion・Production | gameVersion 不変（#5）・push／merge／deploy 0・origin 操作 0 |

## 3. 残リスク（WARN）

| # | 内容 | 影響 | 対応案 |
|---|---|---|---|
| W1 | **hard だけ「崩れ」と「✓ 止めた／赤い輪の消失」が別の瞬間**（then 境界 60%＝HP 67、崩れは 50%＝HP 56）。v0.4 で全難易度一致にしていた設計（`SHOGUNATE_PILOT_V0_4.md`）を、CEO 承認の hard 0.6 で hard だけ外した。監査書 §4 G3 の「同一フレーム」は easy／normal でのみ成立（監査時の見落とし・本 Gate で実測確認） | hard の「追い込めた」が 2 回の出来事に見える可能性（normal・easy は従来どおり 1 つ） | iPhone QA の任意 hard 1 戦で確認。気になる場合の候補は別 Decision（例：忠次だけ崩れの帯をしきい値に合わせる）＝**未承認の仕様追加になるため今回は入れていない** |
| W2 | SP375 で「あと N」行が 2 行（h41）になり、名札が忠次の兜の飾りの先に約 12px（CSS px）重なる。顔・体・吹き出し・FX には重ならない。到達後は 1 行に戻る | 見た目のみ | Human QA Q1 で確認。気になる場合は SP だけ丸を外す・余白を詰める（CSS のみ） |
| W3 | headless 計測の揺らぎ：怨霊 PC 1 回目のクリック取りこぼし（再実行で一致）／SP 龍神の神側被弾リング 4px の画面外が標本窓次第で 0〜1 件増える（レイアウト矩形は v0.5 と完全一致＝v0.6 と無関係の既存挙動） | 計測のみ | 既知として記録 |

sim の raceAware（hard）は 43.9%（監査時の見込み 60.4%）。本 sim の raceAware bot は狙うしきい値を 0.5 に固定しているため（bot 側の都合）。greedy は見込みと完全一致。

## 4. iPhone Human QA（再 QA・約 4 分・3 問）

### 4-1. LAN preview の起動（PM が実行）

1. worktree `C:\Users\kimi1\SevenGodsGame-shogunate-v05`（branch `feat/shogunate-pilot-v0.6`・`dist` は `ae7a893` の build）
2. `npx vite preview --host 0.0.0.0 --port 4183 --strictPort`（1 本だけ）
3. PC から `http://192.168.11.6:4183/` が 200・`index-xHGmRIvy.js` を返すことを確認
4. QA 後は `taskkill /PID <pid> /T /F` → 4183 の LISTEN 0 を確認

### 4-2. CEO の手順

- iPhone は PC と同じ Wi-Fi・Safari プライベートタブ・ホーム右下が `v1.0.5 (ae7a893)`
- URL：`http://192.168.11.6:4183/?pilot=shogunate&seed=sg-v04-01`
- 戦 A（約 3 分）：v0.5 と同じ手順（大耀 → ふつう → 忠次 → R1 ⚔一心不乱 ×2 → R2 🌟神託 → **R3 で予告の下の「あと160で／総攻めを止める」を見る** → ⚔豪快な一撃 ×2（数字が減り、2 枚目で「✓ 総攻めを止めた」に変わる＝赤い光が消える・崩れる）→ 決着まで
- 任意（約 1 分）：むずかしいで同じ URL → R3 で「あと130」→ 1 枚目で「✓ 止めた」（崩れは次の札で起きる＝W1 の確認）

### 4-3. 3 問（プレイ後に 1 問ずつ）

| # | 設問 | 期待 |
|---|---|---|
| 1 | R3 で「あと N」を見て、**赤い光の意味（このままだと総攻めが来る）が分かった**か | YES |
| 2 | 「あと N」を見て、**どの札を出すかを決めた**か | YES |
| 3 | 「✓ 総攻めを止めた」の瞬間の**達成感は v0.5 と同じかそれ以上**か | 同等以上 |

否定が出た場合：文言だけを 1 回調整（仕組みは変えない）。hard を遊んだ場合は「崩れが遅れて見えたのが気になったか」を 1 行で聞く（W1 の判断材料）。

## 5. CEO iPhone Human QA 結果（2026-10-30・build `ae7a893`・LAN preview 192.168.11.6:4183・`?pilot=shogunate&seed=sg-v04-01`・ふつう）

| 項目 | 結果 |
|---|---|
| 戦闘 | 勝利。R4 は「強打 120」（then・probe と一致） |
| R3 | ⚔豪快な一撃 1 枚目で「あと N」が減少、2 枚目で「✓ 総攻めを止めた」・赤い光の消失・崩れが**同期** |
| Q1 赤い光の意味 | **はっきり分かった** |
| Q2 札の選択に役立ったか | **役立った** |
| Q3 達成感 | **v0.5 より v0.6 の方が強い** |
| W2（SP の 2 行表示） | 文字は読めるが、**兜の飾りと重なっている** → §6 で修正 |

判定（AI-PM）：**機能・ゲームデザインは合格（条件付き GO）**。残課題は W2 の表示重なりのみ。W1（hard の崩れと「✓ 止めた」のずれ）は今回未プレイ＝未判定のまま残す。

## 6. W2 修正（SP の「あと N」行を 1 行化）— Gate PASS

**変更**：`src/components/battle/battle.css` の enemy_08 ブロック末尾に `@media (max-width: 899px)` を 1 つ追加（11px・`line-height 1.2`・`padding 0 6px`・`margin-top −2px`・丸 `::before` 非表示）。すべて `[data-enemy='enemy_08']` 配下＝既存 7 体・enemy_09・PC は不変。文言・2 span の折り返し規則・`tacticLine.ts`・`EnemyPanel.tsx`・`src/core`・しきい値・演出タイミングは**変更 0**。probe（`scripts/shogunate-pilot/probe.mjs`）に viewport `sp320`／`sp360`／`sp390` と「名札下端 − 立ち絵の不透明な最初の行（兜の飾りの先）」の計測 `plateOverlapByRound` を追加（QA ツールのみ）。

**計測**（`docs/evidence/shogunate-v0_6/13-w2-fix/probe-normal/summary.json`・normal・seed sg-v04-01・R3 開始時。重なりは正＝名札が飾りに乗る／負＝隙間）：

| viewport | 行の高さ・行数・px | 修正前の重なり（推定：h41 換算） | **修正後の重なり** | R1（行なし・基準） |
|---|---|---|---|---|
| sp375（iPhone 優先） | h15・1 行・11px | 約 +19 | **−6.8（解消）** | −40.7 |
| sp390 | h15・1 行・11px | 解消済み（余白大） | **−154.5** | −186.5 |
| sp360（標準最小幅） | h15・1 行・11px | 約 +27 | **+1.5（飾りの先端のみ）** | −31.8 |
| sp320（標準外） | h28・2 行・11px | 約 +67 | +54.2（修正前から R1 で +6＝構図の限界） | +6 |
| pc | h24・1 行・13px（不変） | — | 名札が立ち絵に重なる既存構図のまま（R3 +27px は v0.6 Gate と同じ） | — |

**回帰**：R4 分岐 then（強打 120）・「✓ 止めた」と赤い輪の消失・崩れの**同一フレーム**（5 viewport すべて `sameFrameAsSuperOff: true`）・行は R3 だけ・名札の内側・viewport の内側・横の溢れ 0・JS error 0。hard（sp375・`probe-hard/summary.json`・最終 build）：「あと130」が h15・1 行・重なり −8.0 → 「✓ 止めた」と赤い輪の消失が同一フレーム → R4 強打 140（then）。tsc 0（build 内）・**full vitest 1,610 PASS**（`05-vitest-full.txt`）・build PASS（CSS 197.96 kB＝+0.22 kB・JS 478.64 kB 不変、`01-build.txt`）・**不変性 20/20**（CORE sha256・gameVersion `1.d794038a00b5b53c`・save v9、`06-invariants.txt`）。

**残リスク**：W1 は未判定のまま（hard を遊んだときに確認）。sp360 の +1.5px は飾りの先端 1〜2px が名札の半透明背景の下に入る程度で、顔・体には触れない。sp320 は本プロジェクトの標準 viewport（360×640 以上）外で、修正前から R1 時点で名札が飾りに乗る構図＝別 Decision（SP の名札と舞台の配置）で扱う。iOS Safari の実フォント幅で 11px の 1 行が 375px の列幅（147px）に収まるかは headless（Windows フォント）での計測＝CEO の次回 iPhone 確認で「1 行になっているか」を 1 問だけ聞く。
