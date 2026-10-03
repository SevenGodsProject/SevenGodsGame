# 決定264（候補）— Battle Composition v3「Duel HUD v3：2 柱 HUD＋神側チャージ」Narrow Pilot

- 日付：2026-10-03（実装・Gate 前半）〜 2026-10-04（Gate 後半・本書）・【Designer】＋【Dev】
- 着手：**CEO GO**（Lane B「Duel HUD v3」Pilot。Preflight §9 の方向性変更＝3 列→2 列・決定235 名札材質の置き換え・環撤去を含む）。数値・実装方式・Gate 判定・再基準化は **AI 判断**（CLAUDE.md §6-2）
- 仕様：`docs/BATTLE_COMPOSITION_V3_DUEL_HUD_PREFLIGHT.md`（branch `docs/composition-v3-duel-hud-preflight`・`e4116bc`。本 worktree には無い）§6。Lane 順の根拠 `6fb92fc:docs/POST_D262_LANE_AB_EXECUTION_ORDER.md`
- Baseline：master＝**`a3ffa87`**（runtime＝Production `8cba184`＝決定261 LIVE。配信 JS `index-BRcv8Oau.js` md5 `e6c26c81…`）
- 作業：worktree `.claude/worktrees/agent-a2b3ab0df4dba6c75`・branch **`feat/d264-duel-hud-v3`**。runtime commit **`90093b2`**（CSS 1 ブロック＋TSX 1 行＋契約 test）。**push／merge／deploy なし**
- 状態：**Fast Gate G1〜G15 PASS（G10 SP は条件つき・§4-3）→ HUMAN QA READY**

---

## §1. 目的と CEO 5 指摘への対応

「UI の箱の中にキャラがいる」→「敵と神が同じ戦場で対峙している」。決定261（対峙構図 v2）で立ち絵は大きくなったが、名札を立ち絵の横へ置いた副作用で HP が短くなり、共鳴が第 3 列の最大 HUD になった（Preflight §2）。

| # | CEO 所感【CEO】 | 本 Pilot の対応 | 実測（PC 1508×660 中心） |
|---|---|---|---|
| 1 | 敵と神の相対サイズがアンバランス | **D** 敵のみ `--artScale`（原画の余白差の正規化・縮小しない） | 神÷敵（ink 面積）PC 660 **0.98〜1.46 → 0.90〜1.14（13/13 が 0.9〜1.15）**・SP 844 も 13/13 |
| 2 | 敵・神の周囲の円形／角丸四角プレート | **C** 回転オーラ環 3 つを撤去・名札 3 枚を縁無し scrim へ（角金具 none）・負傷円を足元の楕円へ | 環／角金具の擬似要素 `content` 6/6 が none |
| 3 | 敵 HP・神 HP ゲージが短い | **A** アリーナ上段を［敵｜神］2 列（共鳴の第 3 列を廃止） | 敵 HP **144→307px（×2.13）**・神 HP **100→219px（×2.20）**／SP 110→155（×1.40）・85→138（×1.62） |
| 4 | 共鳴パネルの場所 | **B** 共鳴を神の名札の直下へ従属（横型 12px・7 分割） | 共鳴ゲージ 276×16 → 217×12（HP 18px より細い）。READY 発光・5／6 グロー class は不変 |
| 5 | 上部に箱が多い・戦場に立っていない | **C** 名札の箱を陰へ・足元に接地影 2 つ | 接地影 `::after` 2/2 存在。SP の共鳴札 3 段（高さ 129〜140px）→ 69〜81px |

## §2. 変更内容（runtime commit `90093b2`）

| ファイル | 変更 | 位置 |
|---|---|---|
| `src/components/battle/battle.css` | **+328 行・1 ブロック**（`決定264（候補）Battle Composition v3` コメント〜） | **決定261 ブロックの後・決定254 Game Entry ブロックの直前**（`battleEntrance.test.ts:26` の「決定254〜末尾」slice に混ざらない） |
| `src/components/battle/EnemyPanel.tsx` | **1 行**：root に `data-enemy={enemy.defId}`（ロジック 0） | 旧 146 行 |
| `src/components/battle/duelHud.test.ts` | 新規・契約 6 件（ブロック位置・TSX 1 行・reduce／`.enemy-avatar`／`.intent`／animation 不使用・環と角金具・2 列） | — |

ブロック内訳：C 環撤去 → C scrim（敵 90deg／神・共鳴 270deg、`#05060dcc→99→00`）→ C 接地影 → C 負傷楕円 → B 神側チャージ → D `--artScale`（機工師 enemy_04 1.17〔PC 660 は 1.13：1.17 で頭がアリーナ上端を 7px 越えたため 0.02 刻みで下げた〕・怨霊 1.08・龍神 1.07〔SP 844 は 1.103〕・鬼将 1.05・試練の影 1.02〔SP 844 で神÷敵 1.16 のため〕・魔獣／道化 1。PC >720px 高と SP ≤760px 高は 1）→ A／B PC（≥900px）2 列＋subgrid → A／B SP（<900px）2 列。

**AI 判断（Preflight からの変更）**：`--artScale` の値は Preflight 机上値を G1／G4 実測で 0.02 刻み補正（上記〔〕）。中心拡大ではなく **足元固定**（`translate: 0 calc((1 - s) * 50%)`）とした＝床線と接地影がずれない。

## §3. 変更しなかったこと

`src/core`・`src/core/data/rules.ts`（数値）・Enemy Intent・7R・AP・deterministic seed・`combatTimeline.ts`／`enemyVfxTiming.ts`／`battleEntrance.ts`（`git diff --stat a3ffa87 90093b2` で 0 行）・`hudPlate.css`（ゲージの材質＝決定235 は不変。詳細度 0,4,1 で上書き）・`.intent` の文字 20／17px と行高（決定240 A1）・`.enemy-avatar` の filter／translate／`scale:-1 1`（決定240／247）・決定249 の animation・決定250／252 カットイン・決定254 入口・`.result-toast`（決定241）・吹き出し（決定228 C）・reduce の @media（決定232）・画像・音。決定263 Threat Shape・勝利報酬 Audit は含めない。build：JS の差分は `data-enemy` 属性のみ（`docs/evidence/decision264/js-diff.txt`）、CSS 183,063 → 188,861B（+5,798B）。

## §4. Fast Gate（Preflight §6-3 G1〜G15）【実測】

- Before＝`SevenGodsGame-integ`（master `a3ffa87` clean build）`:4301`・配信 JS md5 **`e6c26c81152c542c1e48711db95c0958`**（Production `8cba184` と同一・`preview-served.txt` に実測記録）／After＝本 worktree `90093b2` の build `:4302`・JS `index-BRctlqgI.js` md5 `1931958c…`・CSS `index-DCQyIuIn.css`（`build.txt` と同名＝再 build なし）
- 6GB 機：browser／build／vitest は完全直列（`scripts/d264-duel-hud/lockrun.sh`／`lib.mjs withBrowser` の `browser.lock`）。1 browser・1 context ずつ。経過は `docs/evidence/decision264/run-gates.log.txt`
- 経緯：2026-10-03 15:51 に G6（gate249）の途中でセッションが停止（PNG 2 枚のみ）→ 10-04 に evidence を WIP commit で保全（`9777151`）し、G6 から再開。layout 104 run・gate-hud 24 run は再実行していない（evidence 再利用）

### 4-1. 結果表

| G | 内容（合格基準） | 結果 | 主要数値 | evidence |
|---|---|---|---|---|
| G1 | 面積 PC 660 敵・神 ≥4.0・OTOMO ≤0.3／SP 844 敵・神 ≥6.0／**神÷敵 0.9〜1.15 全 13 組** | **PASS** | PC 660 敵 min **5.12**（Before 4.00）・神 min 5.02・OTOMO max 0.27／SP 844 敵 min 7.77・神 min 7.76／神÷敵 **PC 660 13/13（0.90〜1.14）・SP 844 13/13（0.91〜1.15）** | `layout/LAYOUT_SUMMARY.md` §A・§F |
| G2 | キャラ÷カード高 PC ≥1.2／SP ≥1.0 | **PASS**（SP 神 0.99 は Before 同値） | PC 敵 min 1.48・神 min 1.34／SP 844 敵 min 1.06・神 min 0.99（Before 0.99＝決定261 Known #2） | 同 §A |
| G3 | 着弾中心 ∈ ink | **PASS 104/104** | 敵 slash／数字・神 slash／数字 4/4 × 52 run（After） | 同 §B・§D |
| G4 | 重なり 0・敵–神 ink 間隔 ≥6px | **PASS** | 重なり 0（敵–神・敵／神–手札・名札・OTOMO）・間隔 min **15px**（sp660 魔獣。Before 15）・上部バー重なり 0・アリーナ上端はみ出し 0 | 同 §B・§F |
| G5 | 決定254 T5：同一 build 内 HUD 9 要素の箱差 0 | **PASS** | 全 run 最大差 0px（pc800 は入口ありの 9 run） | 同 §C |
| G6 | 決定249 反応 parity 30/30 | **PASS 30/30** | Before／After の同一 play 30 組で body／tone／OTOMO／deal／AP／strikeAnim／anim／enemyScale／intent／hScroll 全一致。7 semantic 網羅。reduced は `rl-rim-only`／`rl-otomo-rim`／`rl-stagger-dim` のみ。console error 0（10/10 context） | `g6-reaction/summary.tsv`・`gate.json`・`gate249.log.txt` |
| G7 | 反転：HUD `scale -1 1`・カットイン `-1 1` | **PASS** | 全 104 run `-1 1／-1 1` | `layout/LAYOUT_SUMMARY.md` §B |
| G8 | 文字切れ 0・横スクロール 0・名札 1 行・HP 幅 ≥×1.8（PC）／×1.3（SP）・共鳴高 ≤ HP 高 | **PASS** | clipped 0・hScroll 0・名札 1 行／HP **PC ×2.13・×2.20／SP ×1.40・×1.62**（PC 800 ×1.40＝名札が上の P-2 で元々長い）／共鳴 12px ≤ 18px | 同 §B・§E |
| G9 | console error 0 | **PASS** | layout 104・hud 24・G6 10・G10 lock 14・gate250 40・gate252 36・probe 計 0 | 各 log |
| G10a | 決定254 metric lock：GameState 不一致 0・神の一撃 発火・決定253 託宣 同一・決定240 intent 同一 | **PASS** | 保存 GameState **154 行 不一致 0**・神の一撃 **14/14**・託宣 3 択の表示／残数 7/7 同一・intent class 7/7 同一・反応集合 7/7 同一。`finalText` の差は「共鳴」見出し（After で非表示＝設計どおり）の 1 語のみ | `g10-lock/gate-lock.json`・`gate-lock.log.txt` |
| G10b | 決定250 法 入力ロック 中央値 ±10ms（神の一撃） | **PC PASS／SP 条件つき PASS（§4-3）** | 10 回：PC **1,314 → 1,309（−5ms）**／SP 1,124 → 1,216（+91ms・下記の二峰性）。着弾 1,600ms・stop 80ms 20/20 同一・発火 20/20・console 0 | `g10-godstrike-lock/run1〜10/summary-noshot.tsv`・`gate-noshot.json`・`run*.log.txt` |
| G10c | 決定252 敵必殺（runs=5＋SP 追加 8） | **PASS（timing 不変）** | カットイン表示時間（mount→unmount）中央値 PC 1,669→1,469・**SP 1,459→1,461（+2ms）**／mount→操作再開の差 中央値 3〜4ms で同一／R4 予告「業斧・断岩 260」・R5 GameState 全 36 回同一・console 0。unlock 中央値は PC −55・SP +66（13 回）＝enemy turn の JS 予約の揺れ（Before 自体 2,251〜4,695ms） | `g10-enemy-ultimate.stdout.txt`・`g10-enemy-ultimate/gate252.json`・`gate252-sp-recheck.json` |
| G11 | 静的 tsc 0／oxlint 0／vitest 全 PASS | **PASS** | tsc 0・oxlint 0・vitest **1,303 PASS**（9 skip・`duelHud.test` 6 件・`battleEntrance.test` slice・`combatTimeline.test` reduce・`useReactionLanguage.test` 反転目印 含む） | `tsc.txt`・`oxlint.txt`・`vitest.txt`・`build.txt`・`js-diff.txt` |
| G12 | 決定240：`.intent` 高さ PC 25／SP 21 SAME・構え class SAME | **PASS** | `.intent` 高さ PC 25／SP 21.3・文字 20／17px（24/24 run 同値）・intent class 7/7（G10a）・G6 intentSame 30/30 | `gate-hud/gate-hud.json`（`pseudo.intentBox`） |
| G13 | コントラスト（名前・予告・あと N・ゲージ文字）≥7.0／HP ラベルは現状以上 | **PASS**（HP ラベルは基準の読み替え・§5） | After の最小（P95 背景＝安全側）：敵名 12.26・【型】8.23・予告 **8.39**・神名 13.37・あと N **9.12**・共鳴ラベル 10.63／HP ラベル 中央値 **敵 3.24＝Before 3.24・神 1.96＝Before 1.96**（24/24 run 同値） | `gate-hud/gate-hud.json`・`g13-hplabel/` |
| G14 | 環 3 つ none・名札の角金具 none・接地影 2 つ | **PASS** | After 12/12 run：環 `none×3`・角金具 `none×3`・接地影 `""×2`（Before は環／角金具あり・影 none） | `gate-hud/gate-hud.json`（`pseudo`） |
| G15 | 決定228／230：SP 列幅 全ラウンド固定・バッジ 1 行・共鳴札 3 段の解消（再基準化） | **PASS（再基準化）** | SP 列の x／幅：全 play で単一値（敵 23／168・神 215／152）。得意技バッジ 蒼毘・福永 **2→1 行**・笑蓮 **3→2 行**／共鳴札の高さ 129〜140 → **69〜81px** | `g6-reaction/gate.json`・`g13-hplabel/g15-sp-plate.json`・`g15-*.png` |

**判定（AI 判断）：Fast Gate PASS → HUMAN QA READY**。修正 commit は不要（撤退順序 D→C→A/B のいずれにも該当しない）。

### 4-2. 再基準化したロック（設計上の変更・旧 baseline は不変）

決定254 T5（Before/After の名札の箱差＝設計変更。同一 build 内差 0 は維持）・決定240 A1（名札幅）・決定228（SP 3 列 → 2 列）・決定230（共鳴札の幅 73 → 152px・バッジ行数）・決定235（名札の材質のみ。ゲージ材質は不変）。旧 baseline JSON（`docs/evidence/decision254/`・`250`・`252`・`240` 等）は**上書き・削除していない**。本 Pilot の新基準は `docs/evidence/decision264/` 配下にのみ書いた。

### 4-3. G10b SP の Root Cause（AI 判断：Pilot 起因の遅れではない）

- 決定250 の入力ロックは「`resonance-cutin-timer`（900ms の CSS animation）の `animationend`」で解除され、取りこぼし時は **mount＋1,300ms の fallback**（`CUTIN_FALLBACK_MS` 400）。headless ではこの animationend が描画の混み具合で遅れ、計測値は **≈1,000〜1,200ms（animationend）と ≈1,305〜1,317ms（fallback）の二峰**になる（PC Before は 10 回中 7 回が fallback 側＝1,308〜1,321ms）。SP Before 1,014〜**1,808**／After 1,002〜**1,317** で、**上限（体感の最悪値）は After の方が小さい**
- 直接の切り分け（`scripts/d264-duel-hud/probe-anim.mjs`）：戦闘画面の上で god-strike-v2.mp4 を全面再生しながら 900ms の CSS animation の animationend の遅れを 16 試行ずつ測定 → **SP（390×844・DPR 2）Before 中央値 36ms／After 37ms**（After から接地影／scrim／artScale を外しても 30〜37ms）＝**描画コストの差は無い**。PC は Before 84／After 122／After−artScale 68／−接地影 101／−scrim 109（context ごとの中央値が 50〜131 で揺れ、試行間ばらつきの範囲。gate250 の PC 中央値は −5ms）
- 結論：SP の +91ms は二峰分布の混合比の差（試行ごとの発火経路＝カード直後／ラウンド終了後の違いも混在）であり、Pilot の CSS による描画負荷ではない。撤退（D／C の取り外し）は行わない。**残リスク**として「PC で artScale を外すと animationend が早まる傾向（68 vs 122ms・有意差は未確定）」を Known #4 に記録

## §5. G13 HP ラベルのコントラスト：Root Cause（AI 判断）

**結論：誤計測ではない／Pilot の回帰でもない＝ pre-existing / unchanged（別 Issue 候補）。Preflight G13 の「HP ラベル 3.24 以上」は基準の書き方の誤り。**

1. **計測対象は正しい**：`.hp-bar-label`（`HpBar.tsx`）は `inset:0` の span で、HP の fill（敵 `#e5484d`／神 `#4dbd74`・inline style）の**上に z-index 2 で重なる白文字**（`#e8e9f3`・11px・400）。文字中心の `elementsFromPoint` は `span.hp-bar-label > div.hp-bar-fill > div.hp-bar-ghost > div.hp-bar`（Before／After・PC／SP で同一）＝背景として fill を拾うのが正しい。fill 幅 100%（開始時）・艶 `hudPlate.css:66–74` の gradient・`text-shadow: 0 0 2px #000, 0 1px 2px #000, 0 0 1px #000` も Before／After 同一（`g13-hplabel/probe-hplabel.json`・HP バーのクロップ 8 枚）
2. **値は Before＝After**：gate-hud の 24 run で敵 HP 中央値 3.24／P95 2.53（PC）・2.66（SP）、神 HP 中央値 1.96／P95 1.65・1.71。**全組で Before と完全同値**。理論値も白 × `#e5484d` ≈3.0、白 × `#4dbd74` ≈1.9 で一致
3. **基準の読み違い**：3.24 は決定235（`docs/HUD_PREMIUM_PRE_AUDIT.md` §52・§339）の **敵 HP の中央値**で、同書は神 HP 1.96 を併記し「悪化させない（3.24→3.24・1.96→1.96）」を合格としていた。gate-hud の判定列は P95（最も明るい背景画素＝より厳しい）で、指標も対象も 3.24 と合っていなかった。決定235 と同じ「中央値・Before 以下にしない」で読むと **PASS**
4. **別 Issue 候補（Known #1）**：HP 数字は fill 上の白文字で、可読性を黒の text-shadow 3 重に頼っている（コントラスト計測は text-shadow を無視＝安全側）。神 HP 1.96 は WCAG の数値基準を満たさない既存仕様。決定264 の回帰とは混同しない
5. **SP の `burstHead`（あと N）16→10・`intent` 11→8.4 の低下**：Before は不透明の漆黒の札（決定235）の上、After は**右／左へ透明に消える scrim（`#05060dcc→99→00`）の上**で、SP では文字が scrim の薄い側（70〜100%）まで伸び、背景の戦場画の明るい画素が P95 に入るため。中央値は 12.5／10.5 以上、最小 P95 でも **9.12／8.39 ≥7.0**。得意技バッジ（`passive`・G13 対象外）は P95 6.44→**5.29**（AA 4.5 は満たす。Before も 7.0 未満）＝ Known #2

## §6. Human QA（CEO）— HUMAN QA READY

- **Before**（Production と同一 JS）：PC `http://127.0.0.1:4301/`／LAN `http://192.168.11.6:4301/`
- **After**（本 Pilot）：PC `http://127.0.0.1:4302/`／LAN `http://192.168.11.6:4302/`
- 推奨（Preflight §6-4・engine は不変のため決定257 の発生確認が有効）：
  - `?seed=d257-qa1&enemy=oni`（大耀 × 業斧の鬼将：R3 溜め → R4 業斧・断岩＋神の一撃）
  - `?seed=d257-qa1&enemy=karakuri`（大耀 × 銀甲の機工師：artScale 最大）
  - `?seed=d257-qa1&enemy=ryujin`（大耀 × 蒼海の龍神）
  - 任意：iPhone で 笑蓮／蒼毘（得意技の神）× 龍神＝共鳴チャージ＋バッジの縦
- 質問（4 問・4/4 YES で PASS）：
  - **Q1** 敵と神は同じ大きさに見えるか（鬼将・機工師・龍神）
  - **Q2** 敵・神のまわりの円や枠は消え、戦場に立って見えるか（接地影・名札の縁無し）
  - **Q3** 敵 HP（左）・神 HP（右）は長さ・位置とも一目で読めるか。予告・バフは読みにくくなっていないか
  - **Q4** 共鳴は神側の「チャージ」として読め、HP より目立っていないか（あと N・6/7 の光・7/7 の発光）
- Q4 NO → v3.1「共鳴 topbar 版」（TSX）を別 Preflight／Q2 NO（まだ箱）→ v3.2 アリーナ枠。Production deploy・push・merge は **CEO Human QA の後**（Release Gate は別途）

## §7. Known（Pilot 後も残る）

1. **HP 数字のコントラスト（pre-existing）**：fill 上の白文字（敵 3.24・神 1.96 中央値）。text-shadow 頼み。決定235 から不変。別 Issue 候補（例：数字を fill の外へ／濃い縁取り）
2. 得意技バッジ（`.god-passive-badge`・#9aa3cc）の P95 コントラスト 6.4→5.3（scrim の薄い側）。AA は満たす
3. PC 1280×800（P-2・名札が上）と SP ≤760px 高は `--artScale 1`（名札／神の頭の上限のため）で、神÷敵は Before と同じ 1.13〜1.67／0.71〜1.04（範囲外）。CEO の主画面 PC 660・iPhone 844 は 13/13
4. headless の入力ロック計測は二峰性（§4-3）。PC で artScale の有無が animationend の遅れに効く兆候（68 vs 122ms・未確定）。Release Gate で実機（PC Chrome）の 1 回計測を推奨
5. SP 390×660 の神÷カード高 0.89〜0.98（決定261 Known #2 のまま）

## §8. Rollback

- runtime は `90093b2` 1 commit のみ → `git revert 90093b2`（CSS 1 ブロック・TSX 1 行・test 1 本が戻る。engine／save／数値に影響なし）
- 旧 baseline JSON（決定254 T5／250／252／240）は不変のまま保持。本 Pilot の evidence は `docs/evidence/decision264/` に分離
- Production は未変更（`8cba184`）。rollback 先の evidence（決定261 PRODUCTION LIVE）も保持

## §9. runtime 保護の証明・commit

- `git diff --stat a3ffa87 90093b2 -- src/core src/core/data/rules.ts src/components/battle/{combatTimeline,enemyVfxTiming,battleEntrance}.ts src/components/battle/hudPlate.css`：0 行
- commit：`90093b2`（runtime）→ `9777151`（Fast Gate 途中 evidence と harness の保全・docs/scripts のみ）→ 本書・Gate 後半 evidence（docs/scripts のみ）。push／merge／deploy 0
- harness の追加・変更（計測専用）：`probe-hplabel.mjs`（G13／G15）・`probe-anim.mjs`（G10 Root Cause）・`gate252.mjs` に `vps=`／`tag=`（既存出力を上書きしない別名保存）
