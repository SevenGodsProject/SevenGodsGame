# Post-D254 Practical QA Re-Audit — 2026-09-28 Practical QA 14 項目の現 Production 再監査

- 日付：2026-10-02
- 種別：**AUDIT ONLY / docs-only**（runtime・src・CSS・画像・音声・カード数値・敵数値・託宣仕様・Production：変更 0。新規 asset／音声生成・H3／fal.ai・追加費用：0。merge／push／deploy：0。実装は本書では行わない）
- 判断主体：AI チーム（CLAUDE.md §6-2「複数案からの推奨案選定」「GO・NO-GO の技術判断」）。NEXT NOW の実装開始は CEO GO 後（§6-5）
- Baseline：Production **master = origin/master = `3dd8b5c`／runtime `a611270`**（決定254 PRODUCTION LIVE / CLOSED）。監査は clean worktree `SevenGodsGame-d254-rc`（HEAD `3dd8b5c`・`git status --porcelain` 0 行）で行い、simulation は同 worktree の Production engine をそのまま実行した（データ差し替え 0・`src/core` は決定252 `9316ce1` から変更なし）
- 対象：`docs/PRACTICAL_QA_2026-09-28_AUDIT.md`（決定244）の 14 Findings。**過去の判定はコピーせず**、現在の runtime／code／evidence を読み直して再判定した
- 表記：【実測】＝本監査の計測（simulation・コード読み・既存 evidence 画像の目視）／【docs】＝既存 Decision・Pilot 記録／【AI 判断】＝本書で決めた評価／【推測】＝根拠の弱い見込み
- 証拠：`docs/evidence/post-d254-practical-qa/`（simulation **289,100** 試合の JSON・JSON から自動生成した `SIMULATION_SUMMARY.md`・harness 原文・生成スクリプト）。**本書の数字はすべて evidence JSON から生成した表の引用**（決定252 の教訓：手入力なし）

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 14 項目の status | **CLOSED 7**（03・06・08・09・12・13・14）／**IMPROVED BUT REMAINS 4**（01・02・10・11）／**OPEN 3**（04・05・07）／**INSUFFICIENT 0** |
| current simulation（通常・reader／naive／greedy）【実測】 | win **99.6／83.9／72.7**（9/28：100／97.6／94.5）。naive 敗北 **16.1%**（9/28：2.4%）。撃破 R の最頻値 **R6（49.8%）**（9/28：R5 71%）。R5 の敵ターンを受ける率 **63.0%**（9/28 の R6 到達 28.7%）。託宣 **1.00 回／戦・R5 に集中・加護 26.3%**（9/28：毎 R・R1〜R3 に 70%・加護 1.1%）。神の一撃 **54.6%** の試合で発動。hard reader 96.3（naive 47.0）・Daily reader 90.9（未撃破 9.0%） |
| Item 10（手札で作戦を変える必要）【実測】 | **IMPROVED BUT REMAINS**。改善：読む／読まないで結果が分かれる seed が **49 セル中 47 セルで発生**（9/28：39 セルで 0）・平均 16.4%（hard 54.6%）、dead-card **27.8→19.6%**、使われない札 7 種→**3 種**。残り：**GUARD 札を禁じると −25.8pt（hard −57.6）だが、WEAKEN を禁じても −0.3pt・MEND を禁じても −0.5pt**＝「解く」答えが **盾＋加護の一択**。必殺ラウンドの手の型は seed 間で **14.7%** しか変わらない。初手に GUARD があるか・必殺 R に GUARD を引いたかは通常では勝敗に影響 0（加護が代替）。神階Ⅶ猛威では必殺 R に GUARD が無いと −12pt＝そこだけ「引き」が効く |
| remaining gameplay problems | ① **答えの一択化**（Item 10／11：敵が変わっても AP 配分は STRIKE 47〜53％・GUARD 13〜15％でほぼ同じ。差は託宣のタイミングと撃破 R だけ）② 試練の影は設計上「数字のみ」（入門）③ Daily／hard の reader 未撃破 9.0／3.4%（決定246 Known）④ 才華×双牙の魔獣（Ⅵ 45・Ⅶ 26.7%）と 蒼毘×機工師（Daily 35%）の outlier（**Known Issue 保持・今回修正しない**） |
| remaining presentation problems | ① 敵 7 体の絵の平面感・画風 4 系統・接地 0・明度（**asset 側・9/28 から変更 0**）② God Strike Voice 0（権利＝CEO §6-3 #5／#6）③ Home は静止（`setup.css` @keyframes 0・決定254 Preflight で C1 は「Home 側の第 2 段」として保留）④ 笑蓮（右向き＝敵に背）・才華の keyvisual 鏡像・カットイン／入口の原画向き（Kit 正典・決定247 の対象外）。詳細は Lane 3 `docs/COMMERCIAL_PRESENTATION_AUDIT.md` |
| highest commercial risk【AI 判断】 | **「次も解きたい」が止まる構造＝答えの一択化**。Commercial Player Loop（解けた→もう一回→成長した→**次も解きたい**→明日も来たい→人に見せたい）のうち、決定246〜253 で「解けた」「もう一回」は成立したが、どの敵にも同じ答え（盾を構えて加護）が通るため「成長した」「次も解きたい」が短期で頭打ちになる。North Star「神・OTOMO・カードを **組み合わせて** 答えを見つける」の「組み合わせ」が、現状は GUARD class 1 つに収束している |
| **NEXT NOW（1 件）** | **決定255 候補「Solution Diversity v1 Preflight」＝docs＋simulation only**：必殺（鬼将 断岩 26／怨霊 怨嗟の花 23／龍神 大海嘯 20／道化 狂宴 24／機工師 神滅甲 24／魔獣 乱撃）への答えを「盾＋加護」以外に **WEAKEN（弱体で受け切る）・MEND（受けて立て直す）・TEMPO／STRIKE（先に削り切る）** でも成立させる最小の数値案を、現 Production engine の paired-seed で比較し、受入帯（通常 reader ≥99・naive 敗北 ≥15% 維持／noGuard の勝率 74→85 以上／noWeaken・noMend が reader より **5pt 以上下がる**＝各 class に役割が生まれる／49 セル reader<50% 増加 0／God Strike 率 ±5pt）に入る 1 案を推奨する。**実装は CEO GO 後** |
| reason | Impact（North Star 直結・Primary Fun「解く」の深さ）× Evidence（289,100 試合・class 禁止 3 系列の差が明確）× Risk（数値のみ・`cards`／`rules.ts` の表・新 mechanic 0・決定252 と同じ Gate 手順が使える）× Reversibility（数値 2〜4 箇所）。Item 5（敵アート）は presentation 側の最大リスクだが **CEO 生成・権利・費用**（§6-3 #5／#6）に依存し、本 Preflight と並走できる |
| proposed next Preflight scope | 対象：`src/core/data/cards/`（WEAKEN 7／MEND 9／TEMPO 5 の amount・rounds・cost）と `rules.ts`（`cardBonus` 閾値・`divination.guardRatio`）の **数値のみ**。候補軸：(a) WEAKEN の `debuff amount × rounds` を必殺 1 発分に届く値へ（例：呪縛 −6×2R が 26 の必殺に対して何％か）(b) MEND の heal を「必殺を受けた後に R6 を戦える」値へ (c) `enemyBig`／`blocked` bonus を WEAKEN／MEND 側にも持たせる案（データのみ）(d) 加護の `guardRatio` 0.5 を下げて盾一択を弱める案（**反証用・採用しない前提**）。比較方策：reader／naive／greedy／ignoreUlt／oracleAware／noGuard／noMend／noWeaken（本書の harness をそのまま使う）。変えないもの：敵 7 体の表（決定252）・託宣回数 3／2・HP・AP・7R・スコア式・UI。Gate：決定252 と同じ実 runtime paired-seed・`balanceSim.test.ts`・gameVersion golden 更新は「仕様更新」として記録・Human QA 3 問（「盾以外でも解けた」「敵で答えが変わった」「理不尽ではない」） |

---

## 1. Baseline と方法

| 項目 | 内容 |
|---|---|
| Production | `3dd8b5c`（docs）／runtime `a611270`（決定254）。`git branch --contains 3dd8b5c` ＝ `master`・`release/d254-game-entry-rc`。rollback deployment `6770019105`【docs】 |
| 監査環境 | worktree `C:/Users/kimi1/SevenGodsGame-d254-rc`（HEAD `3dd8b5c`・clean）。main worktree（`feat/d224-premium-payoff-pilot`・決定213 runtime を含む・未 commit 差分あり）は **一切使わず・触らず** |
| simulation | 新規 harness `docs/evidence/post-d254-practical-qa/harness.post254.test.ts.txt`（scratch `scripts/post-d254-reaudit/` で実行し監査後に削除）。決定252／253 の方策（reader／naive／greedy／ignoreUlt／oracleAware）を **無変更で再利用**し、Item 10 用に **class 禁止 reader 3 系列（noGuard／noMend／noWeaken）**・カード使用集中・dead-card・手の型（plan signature）・必殺 R の手札感度・初手感度・paired seed（reader vs naive）を追加。**289,100 試合・84 秒**：通常／Easy／Hard／Daily＝7 神 × 7 敵 × 100 seed × 8 方策、神階Ⅰ〜Ⅶ（Ⅶ は猛威／巨躯／静寂）＝× 60 seed × 5 方策 |
| 数値表 | `gen-post254.mjs.txt` が JSON から `SIMULATION_SUMMARY.md` を生成。本書の数字はそこからの引用のみ |
| 照合 | 決定252 Release Gate（通常 99.8／easy 100／hard 97.0／Daily 91.8・Ⅴ 85.9／Ⅵ 83.9／Ⅶ猛威 71.1）【docs】と本監査（99.6／100／96.3／90.9・84.9／82.9／70.2）は seed 文字列（`p254-` vs `d252-`）が違うため ±1pt の範囲で一致【実測】 |
| 画像 | 現 Production build の既存 evidence（`docs/evidence/decision254/pilot/*.jpg`・`decision252/pilot/presentation/*.png`）を目視。新規撮影・新規生成 0 |
| 限界 | reader は「毎ラウンド完全な算術で判断する上限の人間」。実プレイヤーは naive〜reader の帯に写る（決定245）。本監査は **Human QA を新たに実施していない**。各 Pilot の CEO Human QA（決定246／249／250／251／252／253／254）を「その Pilot の設問に対する体験の根拠」として採用し、設問が元 Finding を直接問うていない場合は CLOSED にしない |

---

## 2. 決定246〜254 と 14 項目の照合【docs】

| 決定 | 内容（runtime） | Human QA（CEO） | 直接対応する Finding | 本監査での扱い |
|---|---|---|---|---|
| 246 Combat Tension v1 | 託宣 7→3（神階 4→2）・7 敵の峰を R4 へ並べ替え（数値のみ） | 3/3 YES（敵の攻撃を見て考えないと危ない／神託を切り札と感じる／R4〜R6 まで緊張が続き God Strike まで戦っている） | 06・09・10・12・13 の RC1 | 09・06 の体験根拠 |
| 247 PC 敵反転 | `battle.css` 1 規則（≥900px で `scale -1 1`） | **省略**（決定229 v2 の SP 版で PASS 済み・CEO 承認） | 01・02 | 01 は Human QA 省略のため CLOSED にしない |
| 249 Reaction Language v1 | 60/60 枚を 7 semantic に分類し、GUARD→神 brace／MEND→神 breathe＋OTOMO／WEAKEN→敵 stagger／ATTUNE・EMPOWER→神 rise／TEMPO→札＋神力 | 3/3 YES（意味の違い／God・OTOMO・Enemy が戦っている感じ／うるさすぎない） | 03・02 | 03 の体験根拠 |
| 250 God Strike Premium Cut-in v2 | 大耀 1 神のみ H3 Max 動画 1.2s（他 6 神は静止カットイン） | 7/7 YES | 02・07（Voice ではない） | 07 は未着手のまま |
| 251 神階 Re-centering | `lateRoundFrom` 5→6 | 5/5 YES | 09（神階側） | 09 の補強 |
| 252 Enemy Ultimate | 鬼将 R3 溜め→R4 断岩 26／怨霊 R4 怨嗟の花 23／龍神 R4 大海嘯 20／道化 R2 溜め→R3 狂宴 24・R6 19／Ⅵ 倍率を special のみ＋cap | 7/7 YES（Q3 鬼将と道化で戦い方が違う／Q5 託宣のタイミングが敵で変わる／Q6 Intent を読む意味／Q7 大技がクライマックス） | 11・13・10 | 13 の体験根拠。11 は sim で「要求されるプレイ」を再測定 |
| 253 Oracle Readability v1 | 役割語「守る／整える／攻める」＋状況表示 3 択（presentation-only） | 3/3 YES（役割が一目で分かる／導きで今できることが分かる／SP で窮屈でない） | 12 | 12 の体験根拠。人間の導き使用率は未観測（Known） |
| 254 降臨の間 | 暗転→神紋→選んだ神の降臨→舞台と敵の顕現→HUD（Full 2.8s／Short 1.5s／skip／reduced） | 5/5 YES（神が降臨した／対峙で「これから戦う」感／初回 2.8s／短縮版／SP 商用品質） | 14・04（入口側）・01（対峙） | 14 の体験根拠。Home 本体は対象外（Preflight C1 保留） |
| — | 敵 7 体アート：`public/assets/enemies/` は `d1e3b30` 以降 **commit 0**【実測】 | — | 05 | OPEN |
| — | Voice：`sound.ts` の `SeName` 20 本に voice 0・`public/assets` に音声 0【実測】 | — | 07 | OPEN |
| — | 思考時間：`rules.ts score`・`score.ts`・`replay/types.ts` に経過時間 0（`Date.now` は seed 生成と Daily 日付のみ）【実測】 | — | 08 | 現時点の問題ではない |

---

## 3. 現在 Production の simulation（`SIMULATION_SUMMARY.md` からの引用）

### 3-1. 9/28 → 現在（通常・reader／naive／greedy）【実測】

| 指標 | 9/28（決定244・`d1e3b30`） | 現在（`a611270`） | 変化 |
|---|---|---|---|
| win reader／naive／greedy | 100／97.6／94.5 | **99.6／83.9／72.7** | 「読まないと負ける」が成立（naive 敗北 2.4→16.1%） |
| hard reader／naive | 99.5／82.2 | **96.3／47.0** | 読む価値 17.3→49.2pt |
| 撃破 R（reader） | R5 までに 71%・最頻 R5 | **R4 2.7／R5 34.3／R6 49.8／R7 12.7%**・最頻 R6 | 敵の峰（R4）を 98〜100% が体験 |
| R5 の敵ターンを受ける率 | 28.7%（R6 到達） | **63.0%** | 山場が見える |
| 最低 HP が 50% 以下になる試合 | 40.9%（決定245 baseline） | **64.2%** | 危機が毎戦の 2/3 |
| 託宣 | 7 回・毎 R・R1〜R3 に 70%・加護 1.1% | **1.00 回／戦・R5 に 0.63・加護 26.3%**（oracleAware：1.54 回・加護 42／導き 43／天啓 15） | 「いつ・どれを切るか」が発生 |
| 神の一撃 | 0.30 回／戦（決定245） | **54.6% の試合で発動（平均 R4.9）** | — |
| dead-card（手札に来て出さない） | 27.8% | **19.6%**（hard 14.4） | — |
| 使われない札（<0.1 回／戦） | 7 種 | **3 種**（浄めの光 0.06・福袋 0.04・気まぐれ 0.04） | — |
| 49 セル reader 100% | 49/49 | **39/49**（10 セルで 1〜5 seed が未撃破） | 蒼毘×機工師 95 が最低。敗北 0・未撃破 0.4% |
| reader と naive で結果が分かれる seed | 39/49 セルで 0 | **47/49 セルで発生・平均 16.4%・最大 60%（才華×怨霊）** | 「読む」が seed ごとに効く |
| 敵プロファイル距離（10 次元） | 平均 0.15／最大 0.37（8 次元） | **平均 0.193／最大 0.347**（hard 0.222／0.440） | 微増（§3-3） |

### 3-2. 面 × 方策（抜粋）【実測】

| 面 | reader | naive | greedy | ignoreUlt | oracleAware | reader 未撃破 | reader 撃破 R | GS |
|---|---|---|---|---|---|---|---|---|
| 通常 | 99.6 | 83.9 | 72.7 | 83.4 | 99.4 | 0.4 | 5.73 | 54.6 |
| Easy | 100.0 | 99.8 | 98.9 | 98.6 | 100.0 | 0.0 | 5.21 | 33.2 |
| Hard | 96.3 | 47.0 | 31.5 | 54.9 | 95.6 | 3.4 | 6.16 | 71.5 |
| Daily | 90.9 | 53.7 | 37.3 | 58.8 | 88.9 | 9.0 | 6.35 | 75.1 |
| 神階Ⅰ／Ⅲ／Ⅴ | 99.6／88.9／84.9 | 61.4／50.3／33.1 | 48.3／38.7／27.3 | 69.6／59.9／47.2 | 99.3／86.6／80.4 | 0.2／9.9／9.9 | 5.79／6.27／6.26 | 62.5／74.4／77.5 |
| Ⅵ／Ⅶ猛威／Ⅶ巨躯／Ⅶ静寂 | 82.9／70.2／59.3／80.8 | 26.9／13.0／18.5／22.8 | 21.9／9.4／14.2／15.9 | 37.0／22.7／23.0／31.7 | 78.3／64.3／56.7／77.5 | 10.2／8.9／28.9／10.4 | 6.28／6.30／6.55／6.40 | 77.2／76.0／81.2／75.4 |

- 決定245 の受入帯：Normal「naive 敗北 ≥15%」**達成**（16.1）。「reader 85〜95／Hard reader 60〜75」は決定245 で **意図的に未達**（reader は上限 bot）のまま。Easy 保護（naive 99.8）達成
- 決定58／DAILY-01 の「少なくとも 1 方策 ≥50%」：reader<50% のセルは 通常／Easy／Hard 0、Daily 1（蒼毘×機工師 35）、Ⅵ 1（才華×魔獣 45）、Ⅶ猛威 7、Ⅶ巨躯 17、Ⅶ静寂 1【実測】＝決定251／252 の Known と同じ範囲

### 3-3. 敵 identity（reader・通常／hard）【実測】

| 敵 | 必殺到達 | 必殺 R 盾≥50% | 加護が必殺 R に集中 | reader−naive（通常／hard） | reader−ignoreUlt（通常／hard） | 撃破 R（通常） | 託宣/戦 |
|---|---|---|---|---|---|---|---|
| 試練の影 | —（必殺なし） | — | — | 4.9／31.1 | 0.0／0.0 | 5.90 | 1.10 |
| 業斧の鬼将 | 97.9 | 74.7 | 74.3 | 19.4／61.3 | 33.6／63.0 | 5.70 | 0.95 |
| 藍花の怨霊 | 98.1 | 63.6 | 60.8 | 28.6／60.6 | 33.1／62.4 | 5.69 | 1.02 |
| 銀甲の機工師 | 70.7 | 67.3 | 60.0 | 12.6／45.3 | 11.1／40.3 | 5.89 | 1.10 |
| 双牙の魔獣 | 100.0 | 63.6 | 21.5 | 16.1／51.1 | 7.1／20.3 | 5.39 | 0.74 |
| 蒼海の龍神 | 99.4 | 60.9 | 51.6 | 19.6／50.1 | 21.0／53.9 | 5.95 | 1.19 |
| 乱舞の道化 | 100.0 | 54.9 | 74.5 | 8.6／45.1 | 7.3／49.6 | 5.60 | 0.87 |

- 「必殺を無視すると負ける」は 鬼将・怨霊・龍神で通常 21〜34pt、hard で全 6 体 20〜63pt【実測】＝決定252 の Enemy Identity は runtime で生きている
- しかし **AP 配分（reader・通常）は STRIKE 48.3〜52.6％・GUARD 12.7〜14.7％・MEND 5.0〜7.5％・WEAKEN 10.4〜11.3％ で 7 敵ほぼ同一**。敵で変わるのは「加護の率（11〜45%）」「撃破 R（5.39〜5.95）」「被ダメ（17〜23）」＝**タイミングは変わるが、使う札の種類は変わらない**（§5 Item 11）

### 3-4. Item 10「引いた手札で作戦を変える必要があるか」【実測】

| 測定 | 結果（通常・reader） | 読み方 |
|---|---|---|
| card usage concentration | 出した 14.1 枚／見た 17.5 枚／dead-card 19.6%／50 種中 46 種が ≥0.1 回／戦／top5 占有 27.2%／Gini 0.39（naive 0.34・greedy 0.43） | 集中は弱い＝デッキの札は概ね全部使われる |
| 見ても出さない札 | 気まぐれ 16.4%・浄めの光 25.6%・福袋 31.1%・巫女の舞 45.6%・予言 53.2%・魅惑の舞 56.2%（見たら出す率） | 3〜6 種は役割がない |
| card-class dependence（reader から class を禁止） | **noGuard 73.8（−25.8pt・hard −57.6・Daily −48.8）／noMend 99.0（−0.5・hard −4.2）／noWeaken 99.9（−0.3・hard +0.5）** | **GUARD だけが「解く」に必須。WEAKEN・MEND は無くても勝てる**＝答えは盾一択 |
| hand sensitivity（初手） | 初手に GUARD あり 99.4／なし 99.8（最低 HP 15.2／14.5）。神階Ⅳ〜Ⅶ ではむしろ「なし」の方が高い（デッキ構成の神差） | 初手は結果を左右しない |
| hand sensitivity（必殺 R） | 必殺 R に出せる GUARD あり 99.6（被ダメ 6.3）／なし 99.8（8.4）。Ⅶ猛威 **75.5／63.6**・Ⅵ 85.2／80.3 | 通常では加護が GUARD の代わりになる。神階Ⅵ以上でだけ「引き」が効く |
| decision diversity | 7R の手の型が seed 間で異なる率 91.3%（naive 36.8%）。**必殺 R の手の型は 14.7%**（＝同じ神×敵なら必殺への答えは 6〜7 seed に 1 つしか変わらない） | 「毎戦違う手順」は成立。「必殺への答え」は定型 |
| same-policy success | naive 83.9／greedy 72.7（hard 47.0／31.5） | 固定方策は負ける＝9/28 の「どの手札でも勝つ」は解消 |
| seed dependence | 100% セル 39/49・負け seed ありセル 10/49・<50% 0・撃破 R σ 0.71・最低 HP σ 3.84・reader≠naive 平均 16.4%（最大 60% 才華×怨霊）・reader だけが勝つ seed 16.0% | 「読む」が seed 単位で効く |

**判定【AI 判断】**：「引いた手札によって作戦を変える必要があるか」＝**半分 YES**。何も考えずに出す／攻撃一辺倒は seed によって負けるようになり（same-policy success の崩壊）、dead-card も減った。しかし「変える作戦」の中身は **盾を構えるか・加護を切るかのタイミング**だけで、**どの class の札を引いたか**は結果に影響しない（WEAKEN／MEND を全部捨てても勝率が変わらない）。これは North Star の「カードを組み合わせて答えを見つける」のうち「組み合わせ」が未成立であることを示す。

---

## 4. Presentation 再評価（現 Production・既存 evidence の目視と実コード）【実測】

| 軸 | 現状 | 9/28 からの変化 | 残り |
|---|---|---|---|
| ART | 神 7 柱＝Kit 線画セル／敵 7 体＝4 画風（`public/assets/enemies/` 変更 0）／OTOMO 精霊態＝球体 | 0 | 敵 7 体（Brief v1 HOLD） |
| MATERIAL | 名札・ゲージ・ドックは漆黒＋金（決定234／235）。カードは READY 1 枚のみ material | 0 | 通常カードの CSS 線枠・AP 0 の全灰色（PREMIUM_REAUDIT §2-B） |
| DEPTH | 舞台レイヤー分離（決定229）。敵の接地影 0・敵 high-key 0.08〜0.21 vs 神 0.41〜0.71 | 0 | 敵が舞台に沈む（`pc1508-battle-ready.jpg` で龍神の水しぶきが舞台と二重） |
| LIGHT | 入口の神紋（神色 gradient・決定254）・必殺の紅蓮／金の環（決定240／252） | ＋入口・＋必殺の予兆 | 敵本体の明度は asset |
| MOTION | 決定249 で 60/60 枚に反応主体（≤4px・≤400ms）・決定252 構え・決定254 降臨 2.8s | ＋反応言語・＋入口 | Home 静止（`setup.css` keyframes 0）・OTOMO の存在感（SP で小） |
| TIMING | commit 0→カットイン 200→ロック解除 900→突き 1,300→着弾 1,600（決定250 で動画 1.2s が同じ時刻表に載る）・入口の animation 同期（決定254） | ＋ | D254 Known #5：main thread が重いと JS 予約が ≈230ms 遅れる（**修正しない**） |
| SOUND | SE 20 本（数式合成）・BGM 2・入口 `godDescend`（既存音の流用）・Voice 0 | ＋入口 SE 1 | Voice（CEO 権利）・SE は合成音のまま |
| IMPACT | tier 4 stop 80ms・52px 金・揺れ 5px・必殺カットイン（技名）・大耀のみ動画 | ＋必殺・＋大耀動画 | 他 6 神は静止カットイン |
| RETURN TO CALM | 勝利の舞台（決定226）・結果→報酬→Home。入口 Short 1.5s | 0 | 敗北側の「静けさ」は結果画面のみ【推測】 |

詳細・Voice 設計・Enemy Art Brief の改訂点は Lane 3 `docs/COMMERCIAL_PRESENTATION_AUDIT.md`。

---

## 5. 14 項目の判定

凡例：CLOSED＝元の体験上の問題が解消された根拠（CEO Human QA ＋ 実測）がある／IMPROVED BUT REMAINS＝改善の実測はあるが、元の問題の一部が残る、または元 Finding を直接問う Human QA がない／OPEN＝runtime 変更 0／INSUFFICIENT＝判定に足る根拠がない

| # | Finding | 9/28 | **現在** | 根拠【実測／docs】 | 残り・条件 |
|---|---|---|---|---|---|
| 01 | Character facing / confrontation | PARTIAL | **IMPROVED BUT REMAINS** | PC で敵 4/7 が神を向く（決定247・Gate 42 本・Human QA 省略）。決定254 Q2「対峙で『これから戦う』感」YES。`pc1508-battle-ready.jpg`：龍神が右（神）向き・大耀の砲口が左（敵）向き | 笑蓮は右向き（敵に背）・才華の keyvisual はカットイン／勝利で鏡像・カットイン／入口の敵は原画の向き（決定247 対象外）。Kit 正典のため反転不可＝**asset 側（Brief）でしか解けない**。PC 反転そのものの Human QA は未実施 |
| 02 | Battle lacks fighting atmosphere | SUPPORTED | **IMPROVED BUT REMAINS** | 決定249 Q2「God・OTOMO・Enemy が戦っている感じ」YES／決定252 Q7「大技がクライマックス」YES／決定250 7/7／決定254 Q2 YES。sim：最低 HP≤50% 64%・必殺到達 98〜100% | 敵の絵の平面感・接地 0（RC4・asset）・Voice 0・動画は大耀のみ。「戦っている空気」の残りは **asset 領域** |
| 03 | Non-ultimate cards react similarly | SUPPORTED | **CLOSED** | 決定249：60/60 枚が 7 semantic で「誰かが反応」（GUARD→神 brace／MEND→神 breathe＋OTOMO／WEAKEN→敵 stagger／ATTUNE・EMPOWER→神 rise／TEMPO→札＋神力）。Production Smoke 42 play で主体一致。CEO Q1「意味の違い」YES・Q3「うるさすぎない」YES | Known（決定249）：OTOMO 反応は SP で小・DEAL はラウンド開始ドローに付けない。閃光は type 別 6 色の同形（MATERIAL 側の残り・本 Finding の主訴ではない） |
| 04 | Home/start screen lacks motion/immersion | SUPPORTED | **OPEN** | `setup.css`・`daily.css`・`App.css`・`polish.css`・`press.css` の `@keyframes` **0**【実測】。背景は `index.css` の 3 本（140s／5s／120s）のみ。決定254 Preflight は C1「起動 Living Still（Home 側）」を **保留**、C2「4.5s 儀式」を棄却し、C3「降臨の間」（戦闘入口）を採用【docs】 | Home 本体は 9/28 と同じ静止 img。入口側は 14 で CLOSED。Home 側の第 2 段（C1）は未着手 |
| 05 | Enemy art flat / lacks depth | SUPPORTED | **OPEN** | `public/assets/enemies/` は `d1e3b30` 以降 commit 0【実測】。Brief v1 は DRAFT／HOLD【docs】。目視（`pc1508-battle-ready.jpg`）：龍神は水しぶき焼き込み・低明度・接地影 0 で舞台に沈む | 生成は CEO（§6-3 #5／#6）。向き（決定247）以外の 4 軸（明度・接地・画風・ポーズ）は asset 側 |
| 06 | Enemy/God stat scale weakens perceived threat | PARTIAL | **CLOSED** | 9/28 の root cause は「山場に届く前に決着」（RC1）で表示スケールではない。現在：必殺到達 98〜100%・最低 HP≤50% 64.2%・R5 の敵ターン 63%・被ダメ合計 20.7/30。決定246 Q1「敵の攻撃を見て考えないと危ない」YES・決定252 Q7 YES | 表示 ×10 は不変（変えない）。hard で reader 96.3 は決定245 の意図的未達。監視のみ |
| 07 | God Strike voice desired | INSUFFICIENT | **OPEN** | `SeName` 20 本に voice 0・`public/assets` に音声 0【実測】。決定250 は **動画**（大耀）で Voice ではない。技術経路（SE 経路・iOS DUCK）は 9/28 §8 のまま有効【docs】 | 権利・生成方法・費用＝CEO §6-3 #5／#6。効果の証拠は依然 0（Lane 3 で必要性を再評価） |
| 08 | Card selection time limit / competitive fairness | REFUTED | **CLOSED（現時点の問題ではない・監視）** | score／replay に経過時間 0・`Date.now` は seed と Daily 日付のみ【実測】。Ranking は dormant・同点同順位【docs】 | Ranking 起動時（Lane 2 Preflight）に「同点圧縮率」を監視指標として引き継ぐ。タイマー導入は不採用（方針 A） |
| 09 | Mid/late game too easy / Oracle scarcity | SUPPORTED | **CLOSED** | naive 敗北 2.4→**16.1%**・greedy 27.3%・撃破最頻 R5→**R6**・託宣 7→**3 回（使用 1.0 回／戦・R5 集中・加護 26%）**・神の一撃 54.6%。決定246 Human QA 3/3 YES（Q2「神託を切り札」・Q3「R4〜R6 まで緊張」）・決定251 5/5・決定252 7/7 | 残り（Known・修正しない）：hard reader 96.3／Daily reader 90.9・未撃破 9.0%／蒼毘×機工師 Daily 35%／才華×魔獣 Ⅵ 45・Ⅶ 26.7%。「上限 bot が負けない」は決定245 で受容済み |
| 10 | Draw variance too weak / any card can win | SUPPORTED | **IMPROVED BUT REMAINS** | 改善：reader≠naive seed 47/49 セル・平均 16.4%／dead-card 27.8→19.6%／使われない札 7→3 種／same-policy（naive 83.9・greedy 72.7）。残り：**noWeaken −0.3pt・noMend −0.5pt（GUARD だけ −25.8pt）**／必殺 R の手の型 14.7%／初手・必殺 R の GUARD 有無が通常で結果 0 差（§3-4） | 元 Finding を直接問う Human QA なし。「作戦を変える」＝盾のタイミングだけ。**NEXT NOW の対象** |
| 11 | Enemy threat differentiation weak | SUPPORTED | **IMPROVED BUT REMAINS** | 改善：7 敵 identity（決定252）・reader−ignoreUlt 鬼将 34／怨霊 33／龍神 21（通常）・加護の必殺 R 集中 52〜75%・託宣タイミングが敵で分化・CEO Q3「戦い方が違う」YES。残り：**AP 配分は 7 敵で STRIKE 48〜53％・GUARD 13〜15％とほぼ同一**・プロファイル距離 0.15→0.19 の微増・試練は数字のみ（設計）・魔獣／道化は通常で ignoreUlt 差 7pt | 「戦い方が違う」は体感 YES だが、実測は「タイミングが違う」止まり。10 と同根＝NEXT NOW に同梱 |
| 12 | Oracle 加護/導き/天啓 readability | PARTIAL | **CLOSED** | 決定253：役割語＋状況表示 3 択（PC／SP）・Human QA 3/3 YES（役割が一目で／導きで今できることが分かる／SP で窮屈でない）・Smoke 14/14。9/28 の本体「加護が 1% しか選ばれない」は 26.3%（oracleAware 42.3%）に解消 | Known（決定253）：人間の導き使用率は未観測（reader 方策は構造上 0%・oracleAware 42.8%）。次回 Practical QA で観測 |
| 13 | Enemy attacks predictable / monotonous | SUPPORTED | **CLOSED** | 決定252：6/7 体に名前つき必殺（溜め→解放の 2 段）・Identity Gate PASS・Human QA 7/7（Q1 溜め→大技が自然／Q2 道化 R3 が理不尽でなく予兆で対策可／Q7 クライマックス）。sim：必殺到達 98〜100% | 語彙は 4 種のまま（新 mechanic 3 案は決定252 で実測棄却）。試練の影は入門として数字のみ（設計）。「予告どおり」は North Star の仕様 |
| 14 | Game Entry Immersion | SUPPORTED | **CLOSED** | 決定254：降臨の間 Full 2.8s／Short 1.5s／skip 12 経路／reduced・Human QA 5/5（PC＋iPhone）・Smoke 15 項目・HUD 箱差 0・GameState 154 行一致 | Known（決定254）：#5 JS 予約の遅延 ≈230ms（**修正しない**）・SP ≤700px は START 省略・入口の敵は原画の向き |

**集計**：CLOSED 7／IMPROVED BUT REMAINS 4／OPEN 3／INSUFFICIENT 0。

---

## 6. Known Issues（保持・本監査で修正しない）

| # | 内容 | 出典 | 現在の実測 |
|---|---|---|---|
| K1 | D254 Known #5：main thread が重いと入口の JS 予約（SE・操作開放・消滅）が最大 ≈230ms 遅れる（映像は時刻どおり）。改善候補＝`performance.now()` 基準 1 行 | 決定254 | コード不変。**修正しない**（CEO 指示） |
| K2 | 才華×双牙の魔獣：Ⅵ 45.0／Ⅶ猛威 26.7／Ⅶ巨躯 26.7／Ⅶ静寂 26.7%（hard・Daily は 100） | 決定252 Known（Ⅶ猛威 15%） | **局所修正を先行しない**（CEO 指示）。NEXT NOW の Preflight で副作用として観察 |
| K3 | 蒼毘×銀甲の機工師：Daily 35.0／hard 65.0／Ⅴ 66.7 | 決定245／246 Known | 同上 |
| K4 | Daily reader 未撃破 9.0%・Ⅶ巨躯 未撃破 28.9% | 決定246／251 Known | 設計範囲（決定58／DAILY-01 違反 0） |
| K5 | 導きの人間使用率 未観測 | 決定253 Known | 次回 Practical QA |
| K6 | 神階Ⅴ naive ≥60% セル 12（蒼毘・寿楽） | 決定251 Known | 監視 |

---

## 7. 優先順位と NEXT NOW【AI 判断】

### 7-1. 残る問題の Commercial Player Loop／North Star への影響

| 残る問題 | Loop への影響 | North Star | Evidence | Risk／Cost | 依存 |
|---|---|---|---|---|---|
| **A 答えの一択化（10・11）** | 「成長した」「次も解きたい」が頭打ち（どの敵も盾＋加護で解ける） | **直結**（「組み合わせて答えを見つける」の「組み合わせ」が未成立） | 最強（289,100 試合・class 禁止 3 系列・必殺 R 型 14.7%） | 中（数値のみ・決定252 の Gate 手順再利用） | なし |
| B 敵 7 体アート（05・01・02） | 「人に見せたい」・第一印象 | Game Feel | 強（sharp 実測・目視） | 高（CEO 生成・権利・費用・identity Gate） | CEO §6-3 #5／#6 |
| C Home 静止（04） | 「明日も来たい」の入口 | 低 | 強（keyframes 0） | 低 | 決定254 C1 の再評価 |
| D Voice（07） | 「人に見せたい」 | Game Feel | 弱（効果の証拠 0） | 中（権利・iOS DUCK） | CEO §6-3 #5／#6 |
| E Known K2〜K4 | 神階上位の一部セル | 低〜中 | 強 | 低（局所数値） | **先行禁止** |

### 7-2. NEXT NOW（1 件）

**決定255 候補「Solution Diversity v1 Preflight」（docs＋simulation only・実装は CEO GO 後）**

- 問い：必殺への答えを「盾＋加護」以外（WEAKEN で受け切る／MEND で立て直す／TEMPO・STRIKE で先に削る）でも成立させられるか。**敵の表・託宣回数・HP・AP・7R・スコア式・UI は変えない**。カード数値（`src/core/data/cards/`）と `rules.ts` の `cardBonus`／`divination` 係数だけを候補軸にする
- 受入帯【AI 判断】：通常 reader ≥99・naive 敗北 ≥15% 維持／**noGuard 73.8→85 以上**（盾以外でも解ける）／**noWeaken・noMend が reader より 5pt 以上低下**（各 class に役割）／49 セル reader<50% の増加 0／God Strike 率 ±5pt／Easy naive ≥95／決定58・DAILY-01・STAKE-01 違反 0
- 方法：本書の harness（8 方策）を候補ごとに paired seed で再実行（1 案 ≈29 万試合・85 秒）。候補は 4〜6 案を比較し **1 案を推奨**。反証用に「加護を弱める案（d）」も走らせ、採用しない理由を記録する
- 却下した NEXT 候補：B（CEO 判断・費用に依存。Brief の改訂は Lane 3 が docs で進める）／C（North Star 寄与が低い）／D（効果の証拠 0・権利）／E（先行禁止）

---

## 8. CEO 判断が必要になる事項（§6-3 該当のみ）

| # | 事項 | 該当 | AI 推奨 |
|---|---|---|---|
| 1 | 決定255 候補 Preflight の開始（docs＋simulation・runtime 0）→ 結果を見て Pilot 実装の GO | §6-5（Phase 開始前） | Preflight 自体は AI 判断で開始可。**Pilot 実装は結果報告後に承認** |
| 2 | 敵 7 体アートの生成着手（Brief HOLD 解除・生成サービス・費用） | #5／#6 | Lane 3 の Brief 改訂を待って CEO 判断（本 Preflight と並走可） |
| 3 | God Strike Voice の権利・生成 | #5／#6 | Lane 3 の必要性評価の後 |

---

## 9. 実装しなかったこと・runtime 変更 0 の証明

- 実装・画像／音声生成・敵アート生成・balance 変更・Production 変更・merge／push／deploy：**すべて 0**
- 決定254 Known #5（`performance.now()`）・才華×魔獣 outlier・蒼毘×機工師：**触っていない**
- simulation harness は `scripts/post-d254-reaudit/`（scratch・未コミット）で実行し、監査後に削除。原文は `docs/evidence/post-d254-practical-qa/harness.post254.test.ts.txt`
- 証明（監査終了時に実行・§9 実行ログに転記）：worktree `SevenGodsGame-d254-rc` の `git status --porcelain` が docs 以外 0／`src/core/data/rules.ts`・`enemies.ts`・`divination.ts` の md5 が監査前後で同一／`git diff --stat -- src public` が 0

### §9 実行ログ
- 実行：2026-10-02（監査完了時・worktree `C:/Users/kimi1/SevenGodsGame-d254-rc`・branch `docs/lane1-post-d254-practical-qa-reaudit`（`3dd8b5c` から）・HEAD `3dd8b5c`）
- `git status --porcelain`：監査前 **0 行** → 監査後 `?? docs/POST_D254_PRACTICAL_QA_REAUDIT.md`・`?? docs/evidence/post-d254-practical-qa/` の **2 行のみ**（`scripts/post-d254-reaudit/` は削除済み・`src`／`public` の変更 0）
- md5（`src/core/data/rules.ts` `abfc36a1…`・`enemies.ts` `534936d5…`・`divination.ts` `99d5176f…`）：監査前後で **同一**
- `git diff --stat -- src public`：**0 行**
- simulation は Production engine をそのまま実行（データ差し替え・mutate 0・`node_modules` 共有）。vitest 1 ファイル・1 テスト PASS（`vitest-run.log.txt`）
- merge／push／deploy／Production 変更：**0**

## 10. Deliverables
1. 本書 `docs/POST_D254_PRACTICAL_QA_REAUDIT.md`
2. `docs/evidence/post-d254-practical-qa/`：`sim-post254.json`（289,100 試合・source of truth）・`SIMULATION_SUMMARY.md`（自動生成）・`gen-post254.mjs.txt`・`harness.post254.test.ts.txt`・`item10-extra.mjs.txt`／`ITEM10_EXTRA.txt`・`vitest-run.log.txt`
3. `docs/DECISIONS.md` に Re-Audit 記録を **追記のみ**（Lane 2／3 の記録も統合時に同じ commit で追記）
