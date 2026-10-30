# 神 HP 危険帯 Static v1 — 実装 Gate（2026-10-30・Lane 2・AI 判断）

- 状態：**IMPLEMENTED — Fast Gate ALL PASS（FAIL 0）— CEO iPhone Human QA READY（LAN preview `http://192.168.11.6:4185/`）**。push／merge／tag／deploy は未実施（統合は CEO）
- worktree／branch：`SevenGodsGame-hpband`／`feat/self-hp-danger-band-v1`（起点 Production v1.0.5 `a96a409`）。commit：実装 `6e15504`（＋本書・証跡の docs commit）
- 設計：Lane 2 Combat Feel v2 次工程監査（2026-10-29）§4-1 の最小案／`docs/LANE3_NEXT_PLAN_V1.md` §2-①（CEO GO 2026-10-30「神HP危険帯 Static v1 実装GO」）
- 不変：`src/core` 差分 0（gameVersion・save v9 不変）／`rules.ts`・`battle.css`・`visualHp.ts`・timeline／timing／presentation・`sound*`・`EnemyPanel`／`enemyBreak*`・立ち絵 filter 変更 0／既存 7 敵・Pilot 敵の挙動 0／アニメーション・timer 追加 0

---

## 0. 結論表

| # | 問い | 結論 |
|---|---|---|
| 0-1 | 何を足したか | 神（自分側）の表示 HP が **50% 以下**で HP バーが**橙**（fill `#d9a441`・1px 橙枠・数字の前に「▽」）、**25% 以下**で**橙赤**（fill `#ff7a45`・2px 枠＋12px の弱い外光・「▼」）。回復で 50% を超えれば緑に戻る |
| 0-2 | 段階の決め方 | 敵と同じ `hpBand(hpShown, maxHp)`（表示 HP 起点＝着弾→stop→HP_LAG 90ms→主バー 180ms と同期）。half の境界は engine の「HP が最大の 50% 以下」（`RULES.cardBonus.lowHpRatio`）と一致＝**新しい数値しきい値は作らない** |
| 0-3 | 触ったもの | `PlayerPanel.tsx`（+15：`SELF_HP_FILL`／`SELF_HP_MARKER`・`band`・根 `player-band-*`・HpBar の 3 prop）／`HpBar.tsx`（+8：`marker` prop・pill 内に `aria-hidden` の記号）／`hudPlate.css`（+15：`.hp-bar-self-half`／`-quarter` の box-shadow 2 規則）／テスト：新規 `selfHpBand.test.ts`（9 件）・`a11yMinimum.test.ts`（神 fill 3 色を検査） |
| 0-4 | 色だけに頼らない | 枠の太さ（1px／2px）＋記号（▽／▼）＋明度差。記号は pill の中（数字と同じ暗い背景）で、読み上げには含めない（`aria-hidden`） |
| 0-5 | 敵との区別 | 敵の「追い詰めた」は赤（fill `#e5484d`・枠 `#ff5c5c`）。自分側は橙系で**同じ色を使わない**（契約テストで固定） |
| 0-6 | 過剰演出の回避 | 静的クラスのみ。点滅・拡大・揺れ・新 SE 0。quarter の外光は敵 quarter と同じ 12px。reduced-motion の追記不要 |
| 0-7 | Gate | tsc 0／vitest **1,587 PASS**（v1.0.5 1,578＋9）／build JS **+0.28 kB**・CSS **+0.25 kB**（受入 ≤ +1.5／+1.0）／専用 probe **160/160**／Combat Feel v2 probe Before/After 同一進行／a11y pack **69/69** |
| 0-8 | CEO 判断 | 不要（§6-2・表示専用・既存概念の可視化）。Human QA 3 問（§4）で GO／NO-GO |

## 1. Fast Gate（`docs/evidence/self-hp-danger-band-v1/`）

| # | 項目 | 結果 | 証跡 |
|---|---|---|---|
| 1-1 | tsc | 0 | `01-tsc.txt` |
| 1-2 | full vitest | **1,587 PASS・0 fail・17 skip** | `02-vitest-full.txt` |
| 1-3 | build | `index-B89SBNAb.js` 476.27 kB（v1.0.5 475.99 → +0.28 kB）／CSS 195.33 kB（+0.25 kB） | `03-build.txt` |
| 1-4 | src/core | `git diff a96a409 -- src/core` 空 | — |

## 2. ブラウザ probe（Playwright chromium・headless・1 browser 直列・After `:4185`＝本 build／Before `:4186`＝v1.0.5 build）

### 2-1. 専用 probe（`04-danger-band-probe/danger-band-probe.mjs`・`summary.json`）— **160/160 PASS**

盤面：大耀 × 双牙の魔獣（9/10/12 → R2 末 HP 11＝half）・大耀 × 試練の影（5/8/11 → R3 末 HP 6＝quarter）。札を出さず「ラウンドを終える」だけで HP を落とし、各ラウンド末（settle 1.8s 後）に計測。viewport pc 1508×660／sp375 375×667。

| 計測 | high（R1 開始・R1〜R2 末） | half（魔獣 R2 末・HP 110/300） | quarter（影 R3 末・HP 60/300） |
|---|---|---|---|
| 根クラス | `player-band-high` | `player-band-half` | `player-band-quarter` |
| fill | `rgb(77,189,116)`（従来の緑） | `rgb(217,164,65)` | `rgb(255,122,69)` |
| バーのクラス／枠 | self クラス無し・金枠（不変） | `hp-bar-self-half`・`0 0 0 1px rgba(217,164,65,.8)` | `hp-bar-self-quarter`・`0 0 0 2px rgba(255,122,69,.8)`＋`0 0 12px` |
| 記号 | 無し | 「▽」`aria-hidden="true"` | 「▼」`aria-hidden="true"` |
| 数字のコントラスト（pill × fill） | 11.73 | **11.55**（記号も 11.55） | **12.11**（記号も 12.11） |
| `.hp-bar` の animation | none | none | none |
| 敵バー | self クラス 0（不変） | 同左 | 同左 |
| 箱（名札・バー・fill・敵バー・パネル）Before/After | **|Δ| 0** | **|Δ| 0** | **|Δ| 0** |
| 数字 pill | 幅 59.9 | 幅 73.9（記号分 +14・高さ 14 不変・バー内側） | 幅 68.0（同） |
| 横はみ出し | 0 | 0 | 0 |
| JS error | 0（Before／After とも） | 0 | 0 |

Before（v1.0.5）は全ラウンドで `player-band-*` 無し・fill 緑（回帰基準）。スクリーンショット（PNG・untracked）：scratchpad `hpband/out/after-{pc,sp375}-{juuma,trial}-R{n}.png`。

### 2-2. Combat Feel v2 probe（`05-cf2-probe/`・大耀 × 蒼海の龍神・PC／SP375）

| | After | Before |
|---|---|---|
| pc | turns 22・plays 16・heavy 4・offViewport 0・overPlate 0・敵帯遷移 turn17 half／turn21 quarter・errors 0 | 同一（turns 22・plays 16・heavy 4・offViewport 0・overPlate 0・同じ turn で遷移） |
| sp375 | turns 22・plays 16・heavy 4・offViewport **2**・overPlate 0・errors 0 | 同一進行・offViewport **3** |

sp375 の offViewport は Production v1.0.2 以降の既知（決定282「SP375 龍神 2＝既知」・浮遊数字の標本差で 2〜3 に揺れる）。名札被り 0・進行同一。

### 2-3. a11y minimum pack（`06-a11y/acceptance-after.json`）— **69/69 ALL PASS**（pc／sp／sp375 × 23 項目）。神 HP 数字 11.73・敵 13.42・JS error 0。

## 3. 残リスク

| # | 事象 | 影響 | 対応 |
|---|---|---|---|
| R1 | `heal-pulse`（回復時 0.7s の緑 drop-shadow）と橙枠の重なり | 一瞬 2 色が重なる（既存演出は不変・probe では回復札を使っていない） | Human QA Q3 で「うるさいか」を確認 |
| R2 | sp360 以下の 2px 枠の視認 | 標準最小幅 360 では枠 1〜2px＝記号▼が主役 | Q1 で「色・枠・記号のどれで気づいたか」を聞く |
| R3 | 記号で pill の幅が +14px | バー内側に収まる（実測）。名札・バーの箱は不変 | 無し |

## 4. CEO iPhone Human QA（3 問）

- URL：`http://192.168.11.6:4185/`（通常の戦闘。固定盤面なら `http://192.168.11.6:4185/?seed=hpband-juuma` で大耀 × 双牙の魔獣を選ぶと、札を出さなければ R2 末に橙、`?seed=hpband-trial` × 試練の影なら R3 末に橙赤）
- 見るもの：自分（右）の HP バーが 50% 以下で橙＋「▽」、25% 以下で橙赤＋「▼」＋外光。敵（左）の赤とは別の色

| # | 設問 | 期待 |
|---|---|---|
| Q1 | HP が減ったとき、**危ない**と気づいたか（色・枠・記号のどれで） | YES |
| Q2 | 自分の橙／橙赤と、敵の赤（追い詰めた）を**混同しなかった**か | 混同なし |
| Q3 | 点滅・光・記号が**うるさい／過剰**と感じたか | NO |

NG のとき：Q2 NG → quarter の外光を外す（hudPlate.css 1 行）。Q3 NG → quarter の外光 12px→6px、または記号を「▼」→「!」に（1 行ずつ）。Q1 NG → half の枠を 2px に（1 行）。

## 5. 統合メモ（CEO 作業・AI は push／merge をしない）

- 変更ファイルは `PlayerPanel.tsx`・`HpBar.tsx`・`hudPlate.css`・テスト 2。忠次 v0.6（`battle.css` ほか）・CSM v1（`CardView.tsx`・`BattleScreen.tsx`・`cardShort.*`）・crisis ボイス（`sound.ts`・`feelTier.ts`・`crisisVoice.ts`・`BattleScreen.tsx`）と**同一ファイルの編集 0**
- 次工程（crisis ボイス）は本帯と同じ 50% 境界で「絵（着弾＋130ms）→ 音（着弾＋300ms）」の順になる（`docs/LANE3_NEXT_PLAN_V1.md` §2-②）
