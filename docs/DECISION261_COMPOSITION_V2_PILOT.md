# 決定261（候補）— 対峙構図 v2 Narrow Pilot

- 日付：2026-10-03・【Designer】＋【Dev】
- 着手：**CEO GO**（「対峙構図 v2」Narrow Pilot）。数値・実装方式・Gate 判定は **AI 判断**（CLAUDE.md §6-2）
- 仕様：`docs/BATTLE_CHARACTER_COMPOSITION_V2_PREFLIGHT.md`（推奨 SPEC P-1／P-2／S-1／O-1／F-1）
- Baseline：master＝origin/master＝**`694dd0b`**（runtime `538a3ef`＝決定257 LIVE）
- 作業：worktree `C:/Users/kimi1/SevenGodsGame-comp-pilot`・branch **`feat/d261-composition-v2`**（`694dd0b`＋Preflight docs `1af0547` の cherry-pick）。**push／merge／deploy なし**
- 範囲：`src/components/battle/battle.css` に 1 ブロック追記のみ（TSX／`src/core`／画像／数値 0）

---

## §1. 変数表（`--comp-*`・すべて本ブロック内に集約）

| 変数 | 置き場所 | 値（初期案＝Preflight 基準） | 意味 |
|---|---|---|---|
| `--comp-plate-min` | PC ≤720px 高：`.enemy-panel`／`.player-panel` | `170px` | 名札列の最小幅（名前＋【型】・HP・予告が入る幅） |
| `--comp-stage` | 同上 | `min(calc(100% - var(--comp-plate-min) - 8px), 300px)` | 敵の舞台列の幅（＝正方形の絵の背丈） |
| `--comp-god-ratio` | PC／SP 共通 | `0.9` | 神の箱＝敵の箱 ×0.9（Enemy ≈ God） |
| `--comp-enemy-max` | PC >720px 高 | `340px` | 名札が上のままの PC の敵箱の上限（旧 290） |
| `--comp-god-max` | PC >720px 高 | `306px` | 同・神（旧 238＝0.82 → 0.9） |
| `--comp-otomo-ratio` | SP | `0.6` | OTOMO の箱＝`--d229-otomo-basis` × 0.6（旧 0.75） |

SP は既存の `--d229-*` の**式の形を保ったまま値だけ**上書きする（`--d229-otomo-basis` は据え置き）。

## §2. PC／SP の数値（Preflight 机上値 → 実装の目標）

| viewport | 要素 | Before（現行） | After 目標 | 方式 |
|---|---|---|---|---|
| PC 1508×660 | 敵の箱 | 290×196 → 絵 196 | **≈280** | P-1：panel を 2 列 grid（名札＝内側の外列・舞台＝内側） |
| 〃 | 神の箱 | 238×168（82%）→ 168 | **≈252**（0.9×） | 同上（`max-height:82%` を解除） |
| 〃 | ink 間（敵–神） | ≈325px | **≈60〜75px** | 敵の舞台＝敵列の右端、神の舞台＝神列の左端 |
| 〃 | OTOMO 箱 | 92（14vh） | **56**（`clamp(36px, 8.5vh, 76px)`） | O-1 |
| PC 1280×800 | 敵／神の箱 | 290／238 cap | **≤340／≤306**（高さで決まる） | P-2：名札は上のまま、舞台の箱そのものを列の端へ寄せる |
| 〃 | OTOMO | 112 | **68** | O-1 |
| SP 390×844 | 敵／神の箱 | 176／141 | **≈204／≈184** | S-1：床幅 100%−8px・(床−6)/(0.88+0.9) |
| 〃 | ink 間 | ≈10px | ≈10px（重なり 0） | 決定229 の式（敵の後方余白 0.02・前方 0.12）を踏襲 |
| 〃 | OTOMO | 50.6（basis×0.75） | **40.5**（basis×0.6）・共鳴札の直下へ | S-1／O-1 |
| SP 390×660 | 敵／神の箱 | 184／147 | **≈204／≈184**（cap 100%−84px） | ≤700px 高は吹き出し非表示のため cap 124→84 |

**P-2 の実装上の注意（AI 判断・Preflight からの変更）**：着弾レイヤー（`.enemy-hit-layer`／`.player-hit-layer`）は**舞台の箱**（`.enemy-stage`／`.player-stage`）の `inset:0` にある。Preflight 案の「`justify-content: flex-end` で絵だけを箱の中で寄せる」は、名札が上にある PC（>720px 高）では舞台が列幅いっぱい（≈458px）のまま絵だけが端へ動き、**着弾中心（舞台の中央）が絵から最大 ≈60px 外れる**（決定229 の不変条件違反）。そのため本 Pilot は**舞台の箱そのものの幅を絵の上限に合わせて列の端へ寄せる**（`width: min(100%, 上限)`＋`align-self: flex-end／flex-start`）。P-1（≤720px 高）は舞台が grid 列＝絵の幅なので同じ性質を自然に満たす。

## §3. 挿入位置・保護ブロックとの関係

| 項目 | 方針 |
|---|---|
| 挿入位置 | `battle.css` の**決定254 ブロック（`/* === 決定254 Game Entry「降臨の間」Pilot`）の直前**。`battleEntrance.test.ts:26` が決定254 コメント〜ファイル末尾を slice するため、末尾に置くと 254 の CSS 契約 test に混入する |
| reduce | `@media (prefers-reduced-motion: reduce)` を書かない（`combatTimeline.test.ts` の「最後の reduce ブロック＝決定232」前提） |
| 決定229 | SP の式の形（basis・0.88・6px・`bottom:8px`・`aspect-ratio:1/1`）は不変。舞台の箱ごと動く＝着弾レイヤーは追従 |
| 決定240 | `.enemy-avatar` の `filter`／`translate`／`::after`（足元環）に触れない。本ブロックは `max-width`／`max-height` のみ |
| 決定247 | `scale: -1 1; --atk-x: -1` に触れない。F-1 は別要素 `.enemy-cutin-image` の `scale` |
| 決定249 | `.player-avatar-wrap`／`.enemy-reaction-idle` の transform・animation に触れない（layout のみ） |
| 決定250／252 | `.resonance-cutin-*`・`.enemy-cutin`（fixed）の位置・timing は不変。F-1 は画像の鏡像化のみ（kenburns の `transform` と独立 `scale` が合成） |
| 決定254 | 入口（`BossEntrance`）の CSS に触れない。HUD 箱差 T5 は同一 build 内比較（入口あり／なし） |
| 決定241／mini-result | 位置は不変。近づいた神・敵との重なり時間を計測し Known として記録 |
| 決定257 | 音・timing 定数・`combatTimeline`／`enemyVfxTiming`／`battleEntrance.ts` 不変 |
| DOM | TSX 変更 0（grid 化は既存の子要素に `grid-column`／`grid-row` を当てるだけ）。`battleViewportLayout.test.ts` の「名札が立ち絵より上（DOM 順）」は不変 |

## §4. Fast Gate 結果（1）— layout（G1〜G5・G7〜G9・入口時刻）【実測】

- 実行：`scripts/d261/gate-layout.mjs`（evidence 複写 `pilot/scripts/gate-layout.mjs.txt`・`lib.mjs.txt`）。Before＝master `694dd0b` の clean build（`:4301`・JS `e6c26c81…`・CSS `1ac53796…`）／After＝本 Pilot `5191c3d` の build（`:4302`・JS md5 **同一**・CSS `a5a77fd0…`＝+2,933B）。4 viewport × 13 組（大耀×7 敵＋7 神×龍神）× Before／After＝**104 run・FAIL 0・console error 0**。1 browser／1 context／1 run 直列、各 run 前の空きメモリ 381〜1,066MB。集計＝`analyze-layout.mjs.txt` → `pilot/LAYOUT_SUMMARY.md`・`layout-summary.json`（手入力なし）
- 途中、background agent の停止により After 39 run 完了時点で中断 → 証拠のある run は再実行せず、残り 65 run を main で直列再開（`gate-layout.log.txt` に時刻）

### 4-1. 面積・大きさ・距離（平均。括弧は min–max）

| viewport | 側 | 敵 % | 神 % | OTOMO % | カード %/枚 | 敵÷カード高 | 神÷カード高 | 神÷敵 | 敵–神 ink 間隔 px |
|---|---|---|---|---|---|---|---|---|---|
| PC 1508×660 | Before | 2.31（1.86–2.74） | 2.34 | 0.58 | 1.91 | 0.98 | 0.93 | 0.95 | 321（300–336） |
| 〃 | **After** | **4.99（4.01–5.92）** | **5.70（5.00–）** | **0.25** | 1.91 | **1.44（min 1.40）** | **1.45（min 1.34）** | 1.01 | **105（74–128）** |
| PC 1280×800 | Before | 5.11 | 4.73 | 0.83 | 1.86 | 1.48 | 1.34 | 0.91 | 260（228–282） |
| 〃 | **After** | **6.01（4.83–7.13）** | **7.82（6.86–）** | 0.35 | 1.86 | 1.60 | 1.73 | 1.08 | **126（90–151）** |
| SP 390×844 | Before | 5.24 | 5.13 | 0.62 | 4.80 | 0.88 | 0.82 | 0.93 | 44（25–57） |
| 〃 | **After** | **7.20（5.79–8.55）** | **8.79（7.73–）** | 0.39 | 4.80 | **1.03（min 1.00）** | **1.08（min 0.99）** | 1.04 | 40（18–55） |
| SP 390×660 | Before | 7.35 | 7.17 | 0.48 | 5.44 | 1.04 | 0.97 | 0.93 | 43（23–56） |
| 〃 | **After** | **8.32（6.68–9.87）** | 7.16 | 0.31 | 5.44 | **1.11（min 1.07）** | 0.97（min 0.89） | 0.88 | 37（16–51） |

- PC 1508×660（CEO が見た画面）：敵 **2.3→5.0%（×2.2）**・神 **2.3→5.7%（×2.4）**・OTOMO 0.58→0.25%（×0.43）・敵–神の間隔 **321→105px**。キャラの背丈はカードの **1.4〜1.5 倍**（Before 0.93〜0.98）
- SP 390×844：敵 5.2→7.2%・神 5.1→8.8%・OTOMO 0.62→0.39%。キャラ÷カード高は 0.82〜0.88 → **1.00〜1.08**
- 向き：HUD の `scale -1 1`（決定247）は Before／After とも全 run で同一。**必殺カットインの `scale` は Before「none」→ After「-1 1」**（F-1）

### 4-2. 基準との差（Preflight §8 の目標値に対して）【AI 判断】

| 基準 | 結果 | Root Cause・採否 |
|---|---|---|
| G1 PC 敵・神 ≥4.0% | **PASS**（敵 min 4.01＝機工師・神 min 5.00） | 機工師は原画の余白（trim 0.48）が大きく ink が小さい。箱は他の敵と同じ 280px |
| G1 PC OTOMO ≤0.3% | 1508×660 **PASS** 0.25／1280×800 **0.35（未達 +0.05）** | PC >720px 高は `clamp(36px, 8.5vh, 76px)` の上限 76px＝68px 箱。Before 0.83 からは ×0.42。これ以上小さくすると OTOMO の絵が判別できない（36〜40px）ため **据え置き**（CAN SHIP） |
| G1 SP 敵・神 ≥6.0% | 敵 **PASS**（min 5.79＝機工師 sp844 のみ未達）・神 **PASS**（sp660 は Before と同値 7.17） | sp660 の神は **S-1 lite**：神の頭の上限が共鳴札（得意技の神は 3 段）の下端で、縦に伸ばせない（§3 と CSS コメント）。横幅の余りは敵へ回した（敵 7.35→8.32%） |
| G1 SP OTOMO ≤0.3% | sp660 0.31／**sp844 0.39（未達 +0.09）** | basis×0.52 で 41px 箱。Before 0.62 からは ×0.63。相棒の絵の判別限界（≈40px）のため **据え置き**（CAN SHIP）。「補助役」としては PC／SP とも敵の 0.20〜0.25 倍 |
| G2 PC キャラ÷カード ≥1.2 | **PASS**（min 1.34） | — |
| G2 SP キャラ÷カード ≥1.0 | 敵 **PASS**（min 1.00）・神 **sp844 PASS（min 0.99）／sp660 0.89〜0.98（未達）** | sp660 は上記の縦の束縛（神の箱 147 据え置き）。カードは 158px のため 0.97。**解くには共鳴札の縦を縮める（決定230 の保護）か重なりを許す（決定229 で CEO が退けた案 D）しかない** → 据え置き・Known |
| 敵–神 間隔 ≈60〜75px（PC） | 74〜128px（平均 105） | 机上値は「箱の端」基準。実測は ink 基準で、原画の余白ぶん（龍神・機工師は trim が小さい）広がる。Before 321 からは **1/3**。これ以上寄せるには舞台の箱を重ねる（着弾中心が絵から外れる＝決定229 違反）ため **据え置き** |
| G3 着弾中心 ∈ ink | **PASS 104/104**（敵 slash／数字・神 slash／数字） | 舞台の箱ごと寄せる方式（§2 P-2 注）が効いている |
| G4 重なり 0 | **PASS**（敵–神・敵／神–手札・名札・OTOMO すべて 0） | — |
| G5 決定254 T5 HUD 箱差 0 | **PASS 104/104**（最大差 0px） | 入口は不変 |
| G7 反転 | **PASS**（HUD `-1 1` 不変・カットイン `-1 1` 追加） | — |
| G8 文字の切れ 0・横スクロール 0 | **PASS**（clipped 0・hScroll 0・名札 1 行） | P-1 の名札列 162px で名前・【型】・HP・予告が 1 行に収まる |
| G9 console error 0 | **PASS** | — |
| 入口の操作開放時刻 | 中央値 PC 2,633→2,667／2,683ms・SP 2,433→2,433ms | PC +34〜50ms＝決定254 Known #5（JS 予約の遅れ）の範囲。G10 のロック計測で確定 |

## §5. Fast Gate 結果（2）— G6 反応主体・G10 決定論／入力ロック・G11 静的【実測】

| G | 項目 | 結果 | 証拠 |
|---|---|---|---|
| G6 | 決定249 Reaction Language（決定249 Fast Gate のスクリプトをポートだけ差し替え・PC／SP × 大耀×龍神・寿楽×道化 × Before／After／After-reduced＝10 context・75 play） | **PASS**：Before／After の同一 play 30 組で body／tone／OTOMO／deal／AP／strikeAnim／anim／scale／intent／hScroll **すべて一致（30/30）**。7 semantic（STRIKE／GUARD／MEND／WEAKEN／ATTUNE／TEMPO／EMPOWER）網羅。reduced は `rl-rim-only`／`rl-stagger-dim`／`rl-otomo-rim` のみ（動きなし）。console error 0（10/10） | `g6-reaction/summary.tsv`・`gate.json`・`gate249.log.txt` |
| G10 | metric lock（決定254 `gate-lock.mjs` を env でポート差し替え・3 ケース × PC／SP／SP660 × Before／After＝14 run） | **PASS**：同 seed・同 action 列で保存 GameState **154 行 不一致 0**、最終スコア・結果・決定249 反応集合（7/7 組）一致、神の一撃 発火 14/14、決定253 託宣 3 択の表示・残数 同一、console error 0 | `g10-lock/gate-lock.json`・`gate-lock.log.txt` |
| G10 | 入力ロック時間（決定250 法：共鳴 7→一撃→`end-round-button` の disabled 解除まで・Before／After × PC／SP） | **PASS（5 回の中央値）**：unlock PC Before {1,308／1,272／1,305／1,251／1,317}＝**1,305** → After {1,312／1,314／1,316／1,306／1,311}＝**1,312（+7ms）**、SP Before {999／1,007／1,036／1,268／1,028}＝**1,028** → After {1,023／1,036／1,084／998／1,171}＝**1,036（+8ms）**。着弾 1,600／stop 80・結果・敵 HP・errors 0 は 20/20 で一致。**経緯**：最初の 3 回は SP が +24／+29／+48ms と揃って遅く（基準 ±10ms 超過）、S-1 で OTOMO に付けた「相棒の札」（radial-gradient＋box-shadow＝新規 paint 層）を Root Cause 候補として外し再 build（CSS `index-BE9_YcYs.css`・幾何は不変）→ 4・5 回目は SP −270／+143ms と **Before 自体が 999〜1,268ms で揺れ**、headless の計測ノイズが支配的と判断。装飾は外したまま（paint 層が 1 つ減る・OTOMO の見え方は Human QA Q3 で判定）。run1〜3＝装飾あり・run4〜5＝装飾なし（`g10-godstrike-lock/run*`） | `g10-godstrike-lock/summary-noshot.tsv`・`gate-noshot.json` |
| G11 | 静的 | **PASS**：`tsc -b --noEmit` 0／`oxlint` src 0（警告は既存 `scripts/` のみ）／`vitest run` **1,303 PASS**（9 skip・`battleEntrance.test.ts` の CSS 契約・`combatTimeline.test.ts` の reduce 前提・`useReactionLanguage.test.ts` の反転目印 含む）／build：JS **md5 Production と同一**（`e6c26c81…`＝CSS のみの変更）・CSS 180,301→183,234B（+2,933B） | `tsc.txt`・`oxlint.txt`・`vitest.txt`・`build.txt` |
| — | 決定250 カットインの snapshot | After の `taiyo-oni/pc` で `resonance-cutin` の採取が 1 回多い（video 属性なし→あり）。採取タイミングの揺らぎ（poster→video の切替を 2 回捉えた）で、video／poster／img／z は同一。回帰ではない | `g10-lock/gate-lock.json` cutins |

- per-play のロック（G6 の `lock=`）は Before 中央値 299ms／After 349ms、同一 play の差は中央値 +13ms（PC +32・SP +8）だがばらつき −242〜+278ms＝計測側の揺らぎ（決定257 でも同種）。判定は上記の決定250 法で行う

### 5-1. 保護決定への回帰（まとめ）

| 決定 | 確認 | 結果 |
|---|---|---|
| 229 | 着弾中心 ∈ 絵・SP 3 列固定・敵–神 重なり 0 | 104/104・0 |
| 240 | 名札の予告・構え（`.enemy-avatar` の filter／translate 不変） | 予告 1 行・class 不変（G10 の 決定240 intent 判定 同一） |
| 241 | トーストの位置 | 不変（CSS 未変更）。近づいた神・敵との重なり時間は Known（§7） |
| 247 | `scale: -1 1`・`--atk-x` | HUD 全 run `-1 1`・突進方向不変 |
| 249 | 反応主体・transform | 30/30 一致 |
| 250 | カットイン動画の位置・timing | 発火 14/14・着弾 1,600／stop 80 は CSS 外（timing 定数 diff 0） |
| 252 | 必殺の環・カットイン | 環は `.enemy-avatar::after`（不変）・カットインは F-1 で鏡像のみ |
| 254 | 入口 T5 HUD 箱差・操作開放 | 箱差 0（104/104）・操作開放 中央値 PC +34〜50ms（Known #5 の範囲）・SP ±0 |
| 257 | 音・timing 定数 | diff 0 |
| `src/core`・数値・画像 | diff 0 | `git diff --stat 694dd0b -- src/core` 0 |

## §6. Human QA（CEO）— HUMAN QA READY

- Before（Production `694dd0b` の clean build）：`http://192.168.11.6:4301/`／After（本 Pilot）：`http://192.168.11.6:4302/`（`0.0.0.0` で起動中・PC は `127.0.0.1` でも可・一時ファイアウォールは未変更。iPhone から届かない場合は PC だけで実施し、iPhone は次回）
- 推奨 seed（決定257 で両イベントの発生を機械確認済み・engine は不変）：
  - `?seed=d257-qa1&enemy=oni`（大耀 × 業斧の鬼将・ふつう：R3 溜め → R4 業斧・断岩＋神の一撃）
  - `?seed=d257-qa2&enemy=doukeshi`（大耀 × 乱舞の道化・ふつう：R3 乱舞・狂宴＋神の一撃）
  - 任意：OTOMO の見え方は 蒼毘／福永／笑蓮（得意技で共鳴札が 3 段）で SP を確認
- 質問（4 問・4/4 YES で PASS）：
  - **Q1** 敵は神の方を向いているか（立ち絵＋必殺のカットイン）
  - **Q2** 敵と神はカードより大きく、戦って見えるか（PC／iPhone）
  - **Q3** OTOMO は相棒として邪魔にならない大きさ・位置か
  - **Q4** 名札・手札は読みにくくなっていないか
- Production deploy・push・merge は **CEO Human QA の後**（Release Gate は別途）

## §7. Known（Pilot 後も残る）

1. OTOMO の面積は PC 1280×800 で 0.35％・SP 844 で 0.39％（Preflight の ≤0.3％ を +0.05〜0.09 超過）。相棒の絵の判別限界（≈40px）で据え置き
2. SP 390×660 の神÷カード高 0.89〜0.98（<1.0）：神の頭の上限が共鳴札の下端（得意技の神は 3 段）。解くには共鳴札の縦（決定230 保護）か重なり（決定229 で CEO 却下の案 D）
3. PC の敵–神 ink 間隔 74〜128px（Preflight 机上 60〜75px は箱基準。ink 基準では原画の余白ぶん広がる）
4. 決定241 `.result-toast`・mini-result が近づいた神・敵に 0.7〜1.4s 重なり得る（pointer-events なし・既知）
5. 入口の操作開放 PC +34〜50ms（決定254 Known #5 の範囲）
6. 魔獣の HUD 向き（一律反転で「やや左」）・笑蓮／才華 keyvisual・入口の神の向きは本 Pilot の対象外（Brief v1.1 と同時）

## §8. runtime 保護の証明
- `git diff --stat 694dd0b -- src/core`：0 行／`combatTimeline.ts`・`enemyVfxTiming.ts`・`battleEntrance.ts`：0 行／画像・数値・TSX：0 行。変更は `battle.css` 1 ブロック（+195 行）のみ
- build JS md5＝Production `e6c26c81…`（同一）
- commit：`5191c3d`（CSS）→ 以降 docs のみ。push／merge／deploy 0。一時 FW 0。ロックディレクトリ空
