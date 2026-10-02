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
