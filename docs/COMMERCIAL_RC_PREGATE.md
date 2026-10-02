# Commercial RC Pre-Gate M3 — Regression Gate G1〜G19 を現 Production で 1 回通し、Known Issues 一覧を確定する

- 日付：2026-10-02 23:24 〜 2026-10-03 01:37 JST
- 種別：**GATE（計測）＋ docs**（runtime・src・public・package.json：変更 0。Production 操作（push／deploy）0。`docs/DECISIONS.md` 編集 0。外部サービス・費用 0）
- 判断主体：Gate の実行と PASS／FAIL 判定・Known Issues の分類案は **AI 判断**（CLAUDE.md §6-2「QA 方式」「GO・NO-GO の技術判断」）。**Known Issues 一覧の承認と Commercial RC への GO は CEO**（P11）
- 対象：**Production `https://seven-gods-game.vercel.app`**（master＝origin/master `3b8d739`・runtime `538a3ef`＝決定257 Sound Layer v1 LIVE・Vercel deployment `6809771068`）。対照＝同 commit を clean build した dist を `vite preview :4291`
- 仕様：`docs/FINAL_PRACTICAL_QA_COMMERCIAL_RC_PREFLIGHT.md` §2（G1〜G19）・§3（Exit Criteria）・§4（Triage）／`docs/FINAL_PRACTICAL_QA_V2.md`／`docs/POST_D257_REMAINING_WORK_AUDIT.md` §2・§2-1／Known Issues の統合表は branch `docs/rc-pregate-m2-ledger` の `docs/COMMERCIAL_RC_KNOWN_ISSUES_TRIAGE.md`（`6ca6320`・K01〜K31・M3 判定待ち 6 件）を入力に使った
- 表記：【実測】＝本 Gate の evidence JSON から転記（手入力なし・`summary.json` は `scripts/aggregate.mjs.txt` が生成）／【docs】＝既存 Decision・evidence／【AI 判断】＝本書の判定・分類

---

## 0. 結論

### 0-1. G1〜G19 の結果【実測】

**PASS 17／FAIL 2（いずれも既知 Known の再現・新規回帰ではない）／未計測 0**。GF Ranking＝future gate（未実装）。

| # | protected | 結果 | 主要数値【実測】 | evidence |
|---|---|---|---|---|
| G1 | 静的 | **PASS** | tsc exit 0／oxlint **error 0**（warning 10 はすべて `scripts/`・`src/` 0）／vitest **1,303 PASS・0 FAIL**（9 skipped・期待値 1,303＝決定257 と同数）／build JS md5 `e6c26c81…`＝配信 JS md5・CSS `1ac53796…` 一致 | `vitest.txt`・`vitest.json`・`build.txt`・`served.txt`・`oxlint.txt` |
| G2 | Enemy Intent | **PASS** | Identity Gate 147 行（7 敵 × 通常／hard／Ⅵ × 7R）・決定252 Pilot と **差分 0 行**・アサーション 1/1・溜め→必殺 9 行／名札 class・構え・足元の環は G8 で preview・決定252 と差分 0 | `g2/` |
| G3 | 7R・AP | **PASS** | engine／data／replay 8 files **102 PASS・0 FAIL**（balanceSim 11・enemyActions 24・reducer 17・determinism 7・gameVersion 10 ほか） | `vitest-extract/g3-vitest.json` |
| G4 | Seed（決定論） | **PASS** | metric lock **154 行 不一致 0**（Production vs preview・3 ケース × PC／SP＋SP660）・14 run console error 0・横スクロール 0・God Strike 14/14 run 発火 | `g4/gate-lock.json` |
| G5 | Oracle | **PASS** | 決定253 Smoke 14 項目 **14/14**・決定253 Production Smoke（同 seed）と託宣表示 **7/7 run 同一**・同 run の metric lock 154 行 不一致 0 | `g5/g5-oracle-14.json` |
| G6 | Resonance | **PASS** | 共鳴→BURST→カットイン：G4 14/14 発火・G7 15/15 burst・着弾 impactAt **1600** 19/19・stop 80ms（reduced 0ms）・G18 burst_rise 450ms→hit_l4 1600ms 5/5 | `summary.json` G6 |
| G7 | God Strike | **FAIL（dropped のみ）** | 構造 headless **15/15**・headed **4/4**（poster+ 0〜1ms・headed playing 188／273ms ≤278・404／stall／reduced は静止へ fallback 3/3・入力ロック解除 1226〜1319ms）。**dropped（headed 実 Chrome）PC 4/33（12.1%）／SP 5/33（15.2%）＞ 基準 2%／5%**。同一 build の preview も PC 5/33・SP 1/33 | `g7/`・`g7-headed/` |
| G8 | Enemy Ultimate | **PASS** | Presentation gate **24 走**・console error 0・横スクロール 0・カットイン 12 回・足元の環 PC 9.36／17.41px・SP 15.09px・preview と決定252 Pilot After の両方に対し **差分 0** | `g8/g8-analysis.json` |
| G9 | Reaction Language | **PASS** | **75 play** 主体一致 75/75・決定249 Fast Gate After と列差分 0 行・layout 箱差（pair）0・reduced 15 play で変形 0（rim／dim のみ）・console error 0 | `g9/g9-analysis.json` |
| G10 | Save／Resume | **PASS** | vitest 12 files **161 PASS**（resume・replay・改ざん検出 2 件・旧セーブ移行 10 件・enemyId 耐性）／ブラウザ「続きから」PC・SP 2/2：save v9・R2 で復帰・GameState 完全一致・入口なし・error 0 | `vitest-extract/g10-vitest.json`・`g-extra/daily-resume-*.json` |
| G11 | Daily | **PASS** | vitest 8 files **91 PASS**・DAILY-01 PASS／ブラウザ：神域挑戦 開始前「残り 3/3」→ 開始後 reload で「残り 2/3」（開始時消費）・敵選択なし・SEED ID `86R3PH`（PC・SP 同一）・1 回目敗北の結果「残り 2 回」 | `g-extra/`・`g14/ac10/` |
| G12 | 49 Matchup | **PASS** | balanceSim 決定58（hard）・DAILY-01・STAKE-01 の 3 件 PASS | `vitest-extract/g12-vitest.json` |
| G13 | Progression | **PASS** | vitest 10 files **143 PASS**（otomoGrowthDisplay・matchupWiring・solveLoopWiring・stake／record／reward storage 等）／戦績画面 PC・SP：7 行 × 49 マス・横スクロール 0・OTOMO 絆画面 表示・error 0 | `vitest-extract/g13-vitest.json`・`g-extra/records-*.json` |
| G14 | Result | **PASS** | 決定241：6 条件（PC1508／1280・SP390／360・reduced 2）でトースト∩名札・予告・共鳴・手札 **0px²**・画面内／決定207：PC 1508×660 Daily 2 回目勝利で Secondary CTA 2 個とも可視（overflow −22.4px） | `g14/` |
| G15 | Mobile | **PASS（再試行で）** | SP 390×844／390×660 横スクロール 0（G4 SP 6 run・G5・G8・G9・G19）・託宣 3 択 79×39・overflow 0・End Round 高さ 44px／>33ms frame 実 Chrome（headed）最大：1 回目 **13**（≥8・preview も 9）→ 再試行 **5**（＜8） | `g15/` |
| G16 | PC | **PASS** | 敵反転 `scale: -1 1` **21/21**（1508×660・1280×800・SP）・hit layer 21/21 同一・突進 21/21 神方向・error 0／PC 1508×660 HUD 10 要素 箱差 0（enemy-avatar は呼吸 transform） | `g16/`・`g19/tables.md` T5 |
| G17 | Reduced Motion | **PASS** | 決定249 reduced 15 play 変形 0／決定250 reduced は静止カットイン・stop 0ms／決定254 reduced の animation は `battle-entrance-out[opacity]` のみ（PC・SP）／決定257 reduced でも rise・duck 正常・error 0 | `summary.json` G17 |
| G18 | Sound | **PASS** | 決定233：タップ→押下音 **0.2〜0.5ms**（PC・SP 各 9 タップ・1 タップ 1 回・遅延予約 0ms）・30ms 内重複 **0**／決定257：burst_rise 450ms・enemy_rise 200ms・duck 実効 0.12・戻り 1,867〜2,293ms・新 SE 各 1 回・重複 0・lock 22 行 不一致 0・console error 0 | `g-extra/press-*.json`・`g18/gate.json` |
| G19 | Entry | **FAIL（PC 本番の時刻のみ）** | skip **12 経路 貫通 0**（GameState・UI 不変 12/12・手札 5→5 12/12・skip 後の顕現 SE 0）・Full／Short／Retry Short／ホーム経由 Short／reload 新規 Full・続きからは入口なし・7 柱の見出し正。時刻 ±50ms：**SP／SP660 は 2 回とも範囲内**、**PC 本番は JS 予約（操作開放・消滅・SE）が 2 回とも +159〜+266ms**（preview PC は −47〜+101ms） | `g19/` |
| GF | Ranking | **future gate** | 未実装（READY-DORMANT・決定256）。本 Gate の対象外 | — |

- 共通【実測】：console error **0**（全 Gate）／extras の HTTP は 200／304／206 以外 **0**（G7 の 404 は route で意図的に返すケースの 1 件のみ）
- Gate の順序：G1 → G4 → G10（vitest 部分は G1 と同時）→ 戦闘 → 進行 → 表示。G1／G4／G10 は PASS のため停止条件に該当せず全項目を実施

### 0-2. FAIL 2 件の原因と分類案【AI 判断】

| G | 事実【実測】 | 原因 | 既知との照合【docs】 | 分類案 |
|---|---|---|---|---|
| G7 dropped | headed PC 4/33・SP 5/33（基準 2%／5%）。構造（poster・playing・fallback・着弾・ロック）は全 PASS | 動画デコード時の frame 落ち。同 build の preview でも PC 5/33 が出る＝配信差ではなく実行環境（RAM 6GB・空き 0.9〜1.3GB）由来の揺らぎ | 決定250 Pilot 自身が「headed PC 5/33・SP 2/33（PG1 未達→Human QA で体感判定）」で **Human QA 7/7 受容**・Known「dropped 2/33」（K23） | **CAN SHIP**（K23 の再現。5 領域に触れない。CEO Final QA A8／Q で体感を確認） |
| G19 時刻（PC 本番） | JS 予約が +159〜+266ms（2/2 run）。2 回目は CSS の神表示 +133ms・舞台 +352ms も 1 回観測。SP は ±20ms 以内 | main thread が重い時の JS 予約遅延（`setTimeout` 基準）。本番は CDN から入口素材を取得・デコードするため PC headless で再現しやすい | 決定254 Known #5（≈230ms・入力ロック維持）＝K01。決定254 Production Smoke でも PC 本番 released 2,653／2,692ms（＋148〜187ms）を記録し **CEO が Known として受容**（「修正しない」） | **CAN SHIP**（K01 の再現。入力貫通 0・入力ロック維持＝5 領域に触れない）。CSS 側の 1 回の遅延は観察 O1 として K01 に併記（headed 実 Chrome での再計測は S3 修正時に行う） |

**BLOCKER 候補：0／MUST FIX 候補：0**（M3 の範囲）。

### 0-3. Commercial RC Exit Criteria の充足状況（v1 §3）

| 条件 | 状態 | 根拠 |
|---|---|---|
| P0 blocker 0 | **M3 範囲で充足**（0）／最終判定は M4 後 | §0-2 |
| P1 blocker（MUST FIX）0 | **M3 範囲で充足**（0）。残る B 2 件（K02 iOS 割り込み後の BGM 再開確認・K13 台帳 UNKNOWN の CEO 記入）は runtime 変更なしの確認・記録 | §0-4 |
| core deterministic mismatch 0 | **充足**【実測】 | G4 154 行・G5 154 行・G18 22 行＝**330 行 不一致 0** |
| console error 0 | **充足**【実測】 | 全 Gate 0 |
| save corruption 0 | **自動側は充足**【実測】／CEO 実プレイ中の「続きから」1 回以上は **M4 待ち** | G10 |
| unrecoverable battle 0 | **自動側は充足**【実測】（God Strike 404／stall／reduced すべて静止 fallback でロック解除・skip 貫通 0）／CEO 実プレイは M4 待ち | G6・G7・G19 |
| input penetration 0 | **充足**【実測】 | G19 T3 12/12 |
| mobile horizontal scroll 0 | **充足**【実測】 | G15（SP 手札は `overflow-x: auto` の内部スクロール＝設計。page 横スクロール 0） |
| Human QA critical NO 0 | **M4 待ち**（v2 の Q2／Q7） | — |
| Human QA non-critical | **M4 待ち** | — |
| 権利・台帳 | **M2 完了（branch `docs/rc-pregate-m2-ledger` `593f33d`・SE-02 行）／master 未統合**。UNKNOWN 欄は CEO 記入（K13） | 【docs】 |
| Known Issues の明文化 | **本書 §0-4 で確定案を提示**／CEO 承認待ち | §0-4 |

### 0-4. Known Issues 一覧（確定案）【AI 判断】

入力＝`COMMERCIAL_RC_KNOWN_ISSUES_TRIAGE.md`（K01〜K31・重複除去済み）＋決定246〜257 の Known＋Remaining Work Audit §2／§2-1。M3 判定待ち 6 件（K01・K10・K24・K26・K27・共通 console error）を **本 Gate の実測で確定**した。分類は v1 §4 の 3 段階（RC で許容＝CAN SHIP／要対応＝MUST／CEO 判断）に寄せ、RC の条件に含めないものは DEFER（CEO 判断）として示す。

#### (A) RC で許容（CAN SHIP / FOLLOW-UP）— 21 件（K27〜K29 は 1 行に集約）

| # | 既知問題 | M3 の確定根拠【実測】 | 次の扱い |
|---|---|---|---|
| K01 | 入口の JS 予約が重い main thread で遅れる（決定254 Known #5）。**本 Gate で PC 本番 +159〜+266ms を再現・CSS 遅延 1 回（O1）を併記** | G19：入力貫通 0・入力ロック維持・SP ±20ms | SHOULD S3（`performance.now()` 基準 1 行・CEO が「修正しない」を解除した場合） |
| K03 | 初回 duck で BGM 出力経路が 1 回切り替わる | G18 duck 正常 5/5 | 監視 |
| K04 | iPhone は volume 無視で BGM 1.0→0.343 | —（実機項目） | Final QA v2 §5 で確認 |
| K05 | 向きの残り（笑蓮・才華 keyvisual・敵カットイン／入口の敵が原画の向き） | G16 HUD 側 21/21 反転 | Brief v1.1 と同時 |
| K09 | 託宣 SP の ellipsis・導き候補は先頭 1 枚・満タン時 fallback | G5 14/14・SP 79×39 | Final QA で確認 |
| K10 | 未知 `otomo.defId` の guard なし | G10：save 系 161 PASS・発生経路なし | POST-RC cleanup |
| K14 | worktree／docs hygiene（本 Gate 中も RAM 由来の揺らぎ＝G7・G15 1 回目） | — | SHOULD S4 |
| K15 | hard reader 96／Daily reader 91・未撃破 9% | G12 決定58／DAILY-01 PASS | 監視 |
| K18 | Ⅶ巨躯 未撃破 28.9%・神階Ⅰ〜Ⅳ naive +9〜11pt | G12 STAKE-01 PASS | 監視 |
| K19 | 道化 hard 無防御なら R3 致死 | G2 予兆→必殺 表は不変 | 設計どおり |
| K20 | 鬼将 God Strike 率 61→56% | — | 監視 |
| K21 | 人間の導き使用率は未観測 | — | Final QA v2 で観測 |
| K22 | OTOMO 反応は SP で小さい・DEAL はラウンド開始に付けない | G9 75/75 一致 | 設計どおり |
| K23 | God Strike dropped frames（**本 Gate で PC 4/33・SP 5/33 を再現**）・発光中の色変化・他 6 神は静止 | G7 構造 19/19 PASS | 監視（体感は Final QA A8） |
| K24 | headless の >33ms 外れ値・SP DPR3 1.17 倍・SP ≤700px は START 省略 | G15 再試行 headed 最大 5・1 回目 13 は preview も 9 | 監視 |
| K25 | 神の一撃の時期はプレイ次第・ロックは中央値判定・ジングル前の停止は即時 | G18 | SHOULD S2（RETURN TO CALM） |
| K26 | 旧セーブは残り託宣回数ぶん使える（gameVersion 変更時は次ラウンドから新表） | G10 移行テスト 10 件 PASS | 設計どおり |
| K27〜K29 | Auto Focus scroll 差・道化背景の数字コントラスト・Enemy Select cold load／701〜899px 縦スクロール | G15 横スクロール 0 | 監視 |
| K31 | 寿楽一強・共通カード差別化・神技評価偏り・SE 数式合成・入口中も skip で押せる・Gate 3 WAIVED・STAKE-01 timeout 脆弱性 | G1 で vitest 単独実行 timeout 0 | 監視（7・13 は DEFER 寄り） |

#### (B) 要対応（MUST・RC 前に確認／記録）— 2 件（いずれも runtime 変更なし）

| # | 内容 | 対応 | 担当 |
|---|---|---|---|
| K02 | iOS で AudioContext が割り込まれた後に BGM が戻るか（実機未確認） | Final QA v2 Session 3（iPhone）で 1 回確認。戻らなければ修正対象、戻れば CAN SHIP | CEO 実機＋AI 記録 |
| K13 | `ASSET_RIGHTS_LEDGER.md` の UNKNOWN 欄（Temporary chat 使用有無・当時のプラン等） | CEO が記入（§6-3 #5）。SE 2 本の行は M2 で記入済み（未統合） | CEO |

#### (C) CEO 判断（RC の条件に含めない DEFER／BLOCKED）— 8 件＋判断事項 2（K31 の一部・K01 修正の解除）

| # | 内容 | 何を決めるか |
|---|---|---|
| K06 | Home が静止 | POST-RC の Lane 3 で扱うか |
| K07 | 敵 7 体のアート統一 | 生成・権利・費用（§6-3 #5／#6） |
| K08 | God Strike Voice | 権利・生成方式・費用 |
| K11 | Daily 神間 spread 13.82%・決定259 PARTIAL | 再開（RAM ≥700MB・約 2h）の時期 |
| K12 | Ranking READY-DORMANT | 解除条件 D1〜D7 |
| K16 | 才華×双牙の魔獣（Ⅵ〜Ⅶ） | 局所修正をするか（現指示：先行しない） |
| K17 | 蒼毘×銀甲の機工師（Daily／hard／Ⅴ） | 同上 |
| K30 | Daily の端末時計／localStorage 依存・挑戦状の自己申告 | Ranking と連動 |
| K31-7／13 | 寿楽一強・共通カード差別化 | 決定259 再開時に扱うか |
| D254 #5 解除 | K01 の 1 行修正を許可するか | S3 として解除するか |

- **新規の Known（本 Gate で初めて記録）**：O1（PC 本番の入口で CSS の神表示 +133ms・舞台 +352ms を 1/2 run で観測。headless・CDN 取得時。入力は開放前でロック維持）→ K01 に併記（CAN SHIP）
- 合計（K01〜K31＝31 件）：CAN SHIP 21／MUST 2／CEO 判断 8（ほかに CEO が決める判断事項 2）。v2 Triage 文書の A0／B2／C17／D12 と比べ、**A（BLOCKER）0 を M3 実測で確定**・M3 判定待ち 6 件はすべて C に確定

---

## 1. 方法

### 1-1. build・URL・md5【実測】
- worktree `C:/Users/kimi1/SevenGodsGame-rcgate`・branch `docs/commercial-rc-pregate`・起点 `3b8d739`（`git diff --stat 538a3ef 3b8d739 -- src public package.json index.html vite.config.ts` 0 行＝runtime は `538a3ef` と同一）・`node_modules` は main worktree へのジャンクション
- Production：`GET /` 200・`assets/index-BD0q8Mf-.js` 200（455,809 B・md5 `e6c26c81152c542c1e48711db95c0958`）・`assets/index-DDJDc11N.css` 200（180,301 B・md5 `1ac5379697d98f763428d58e668306df`）＝決定257 Release の期待値と一致（`served.txt`）
- 対照 build：`npm run build`（tsc -b＋vite build）→ JS／CSS md5 とも配信と一致（`build.txt`）→ `vite preview --port 4291 --host 127.0.0.1 --strictPort` を 1 本（23:28〜01:36・その後停止）
- 流用スクリプト：決定247／249／250／252／253／254／257 の `.mjs.txt` を **URL・ポート・出力先だけ**変更（`scripts/` に写し・差分は BASES／OUT／seed ファイルのパスの各 1 行。しきい値・操作手順は不変）。新規は G10／G11／G13／G18（決定233）用の `extras.mjs`（1 run＝1 browser＝1 context）と、判定用の analyzer（`analyze-g5／g7／g8／g9.mjs`・`extract-vitest.mjs`・`aggregate.mjs`）。いずれも計測専用で runtime に含めない
- 両側の割り当て：G4／G5 は「before＝Production・after＝preview」の旧スクリプト既定の都合で G4 は before=Production、G5 以降は **before＝preview／after＝Production** に統一（判定は Production 側を主に見る）

### 1-2. 実行順とメモリ（1 browser／1 context／1 run 直列）【実測】
- 各 run 直前に空きメモリを記録（`memory.log.txt`）：最小 **410MB**（G1 build）・ブラウザ run 中の最小 **523MB**（G4）・最大 1,334MB。**<300MB 待機 0 回・OOM 停止 0 回**
- ロック：ブラウザ実行中のみ `sevengods-locks/browser.lock` を作成・終了ごとに削除。`sim.lock` は期間中 1 度も無し
- 実行順：G1（tsc→oxlint→vitest 単独 34s→build）→ G2（identity・vitest 単独）→ G4（30 分）→ preview と extras の動作確認 2 run（preview のみ・結果は scratch）→ chain（G5→G19→G15→G8→G9→G7→G7 headed→G16→G18 ×6→G14 ×2→extras ×6・`chain.ps1.txt`）→ G19 t1／t4 再計測 → G15 再試行
- headed（実 Chrome）は G7 noshot 4 run と G15 perf2 の 2 回だけ（`--window-size=420,900` 等・CEO の Chrome／Edge／VS Code は終了していない）

---

## 2. 各 G の詳細（evidence からの転記）

### G1 静的【実測】
- tsc `-b --noEmit` exit 0／oxlint：error 0・warning 10（`scripts/phase3-audit`・`phase6*`・`enemy-visual-batch-a`・`solve-legibility-v1` の既存・`src/` 0）
- vitest：Test Files 106 passed／6 skipped（112）・Tests **1,303 passed／9 skipped（1,312）**・34.40s（ブラウザ無し・単独）
- build：`dist/assets/index-BD0q8Mf-.js` 455.80 kB／`index-DDJDc11N.css` 180.30 kB・md5 は配信と一致

### G2 Enemy Intent【実測】
- `identity.d252.test.ts`（出力先のみ変更）：147 行・ctx normal／hard／Ⅵ 各 49・`chargingSuper` 9 行・決定252 Pilot の `enemy-identity-gate.json` と **行単位で完全一致（差分 0）**・Signature Threat のアサーション 1/1 PASS
- 名札 class／構え／足元の環：G8 で Production と preview・決定252 Pilot After の 3 者一致

### G3 7R・AP【実測】
- enemies 12・stakes 11・balanceSim 11・enemyActions 24・reducer 17・stakeRules 10・determinism 7・gameVersion 10＝102 PASS（`g3-vitest.json`）

### G4 Seed（metric lock）【実測】
- 3 ケース（大耀×鬼将 通常・恵比寿×魔獣 神階Ⅴ・大耀×道化 通常）× PC 1508×660／SP 390×844（＋SP 390×660 は鬼将のみ）× Production／preview＝14 run・7R・各ラウンド before／afterPlay／afterEnemy の保存 GameState と final を比較 → **154 行 不一致 0**・console error 0・横スクロール 0・God Strike 14/14

### G5 Oracle【実測】
| # | 項目 | 結果 |
|---|---|---|
| 1 | 加護「守る」＋ブロック preview | PASS |
| 2 | 導き「整える」＋「今なら『…』が出せる」 | PASS |
| 3 | 導き 候補なし fallback | PASS |
| 4 | 天啓「攻める」40ダメージ | PASS |
| 5 | 天啓「今なら 撃破」 | PASS |
| 6 | 通常 残 3（R1） | PASS |
| 7 | 神階 残 2（R1・神階Ⅴ） | PASS |
| 8 | SP 3 択 visible（79×39） | PASS |
| 9 | overflow 0 | PASS |
| 10 | 横スクロール 0 | PASS |
| 11 | 決定252 予告・必殺 同一（preview vs Production） | PASS |
| 12 | 決定249 反応 同一 | PASS |
| 13 | God Strike 発火 | PASS |
| 14 | console error 0 | PASS |
- 決定253 Production Smoke（2026-10-01・同 seed・同手順）と託宣 3 択の文字列・残数が 7/7 run で同一。lock 154 行 不一致 0

### G6 Resonance【実測】
- G4 14/14 run で共鳴→カットイン発火／G7 burst 15/15・impactAt 1600 が 19/19・stop 80ms（reduced 0ms）／G18：burst_rise 450ms・hit_l4 1600ms・入力ロック解除 1,201〜1,423ms（5/5）

### G7 God Strike【実測】
| label | burst | poster+ | is-video | unlock | impactAt | stop | dropped | 判定 |
|---|---|---|---|---|---|---|---|---|
| headed pc-before（preview） | R5 | 0 | 153 | 1021 | 1600 | 80ms | 5/33 | 構造 PASS |
| headed pc-after（Production） | R5 | 0 | 188 | 1048 | 1600 | 80ms | **4/33** | 構造 PASS・dropped ＞2% |
| headed sp-before（preview） | R5 | 0 | 133 | 1155 | 1600 | 80ms | 1/33 | 構造 PASS |
| headed sp-after（Production） | R5 | 0 | 273 | 1127 | 1600 | 80ms | **5/33** | 構造 PASS・dropped ＞5% |
- headless 15 ケース：全 PASS（poster+ 0〜1ms・reduced／404／stall は video なしの静止カットイン・unlock 1226／1311／1319ms・cache 2 戦目も再生・console error 0・横スクロール 0）。headless の is-video・dropped は参考値（決定250 と同じ扱い）
- 戦闘結果（敵 HP）は PC・SP とも Production と preview で 1 種類に一致

### G8 Enemy Ultimate【実測】
- 6 ケース × PC／SP × preview／Production＝24 走・console error 0・横スクロール 0・敵カットイン 12（業斧・断岩／乱舞・狂宴／双牙乱撃／主砲・神滅甲／怨嗟の花／大海嘯）・環 PC 9.36px（special）／17.41px（技名付き連撃）・SP 15.09px・予告文／tier／構え／環／カットイン文字の差分：preview 比 0・決定252 Pilot After 比 0

### G9 Reaction Language【実測】
- 2 シナリオ × PC／SP × preview／Production（＋PC reduced）＝75 play。期待主体（brace／breathe／rise／stagger／strike／deal）と一致 75/75・決定249 After 行との列差分 0・pair 箱差 0・reduced 15 play は rim／dim のみ（変形 0）・console error 0

### G10 Save／Resume【実測】
- vitest：resume 10・replay 29・replayBoundary 7・actionLog 12・determinism 7・gameVersion 10・battleSaveStorage 24（v3〜v9 移行・未知版は読まない・改ざん）・godIdentitySave・dailyRunStorage・enemyId 耐性 2 本・scoreLegacyIntegrity＝12 files 161 PASS
- ブラウザ（Production・PC／SP）：神域挑戦を R1→R2 まで進め保存（version 9・1,944 B）→ reload → Home に「続きから」→ 押下 → R2・手札 6・保存 GameState が復帰前後で完全一致・入口なし・error 0（G19 T6 も入口なし）
- 注：v1 §2 の「24 files／317 PASS（決定246 の回帰スイート）」と同一の選定ではない（本書は G1 全件 1,303 PASS の中から save 系を抜き出した）

### G11 Daily【実測】
- vitest：dailyClock・dailyFairness・dailyRunStorage・dailyStorage・startDaily・dailyBoss・dailyModifier・dailyDiff＝8 files 91 PASS・DAILY-01 PASS
- ブラウザ（Production・2026-10-03 JST の Daily＝蒼海の龍神・神域強化）：開始前「残り 3/3」→ 開始（敵選択なし・topbar に DAILY）→ reload 後「残り 2/3」「挑戦する（残り2回）」（開始時消費）・SEED ID `86R3PH` は PC・SP 同一／決定207 の手順で 1 回目敗北の結果画面に「残り 2 回」

### G12 49 Matchup【実測】
- balanceSim：決定58（hard×全神×全敵で 1 戦略以上 ≥50%）1,537ms・DAILY-01 918ms・STAKE-01 2,768ms＝3/3 PASS（単独実行・timeout 0）

### G13 Progression【実測】
- vitest 10 files 143 PASS（otomoGrowthDisplay 27・matchupWiring 12・solveLoopWiring 7・matchupStorage 23・otomoBondStorage 13・stakeStorage 7・recordStorage 9・rewardStorage 7・mastery 11・masteryDisplay 27）
- ブラウザ：Home「戦績を見る」→ 7 行 × 49 マス・「0 / 49」・横スクロール 0／「OTOMOとの絆を見る」表示・横スクロール 0（PC・SP）

### G14 Result【実測】
- 決定241（`measure.mjs`・base のみ Production）：PC1508・PC1280・SP390・SP360・PC1508 reduced・SP390 reduced で、トーストが完全可視の瞬間に名札 3 枚・タイトル 3 つ・予告・共鳴ゲージ・手札との重なり **0px²**・画面内 100%・error 0
- 決定207（`measure-ac10.mjs`・Production・1508×660）：1 回目 敗北 overflow −40.2px／2 回目 勝利「今日のベスト更新」overflow **−22.4px**・Secondary 2 個とも viewport 内・カード可視域内・recap 3 行

### G15 Mobile【実測】
- 横スクロール：G4 の SP／SP660 6 run・G5・G8・G9・G19（t7-first/sp）・extras（SP）すべて 0
- 託宣 3 択 79×39・overflow 0（G5）／End Round（SP）`[272,582,58,44]`＝高さ 44px（G19 T5）
- >33ms frame（SP 390×844・入口中・実 Chrome headed 4 run）：1 回目 [2,3,8,13]＝最大 13（preview も [3,3,8,9]）／再試行 [3,3,4,5]＝**最大 5**（preview [2,3,4,5]）。1 回目は perf2.json の書き込み先 dir 未作成で JSON が出ず、ログ行から機械抽出（`perf2-run1-from-log.json`）
- 注：SP の手札は `overflow-x: auto` の内部スクロール（`battle.css` の `body.battle-viewport .battle-dock-row .hand`）。6 枚目が手札枠の外にあるのは設計で、page の横スクロールは 0

### G16 PC【実測】
- 決定247 gate：1508×660・1280×800・SP 390×844 × 7 敵で Production の `scale` が **`-1 1` 21/21**・hit layer 箱 21/21 一致・敵の突進は 21/21 で神の方向（+dx）・error 0・横スクロール 0
- HUD 箱（PC 1508×660・入口消滅直後と +2s・preview vs Production）：topbar・敵名札・神名札・手札・ドック・託宣・End Round・神 OTOMO 名札・予告＝差 0／敵立ち絵は呼吸 transform の 3〜4px（layout ではない）。1280×800 の HUD 9 要素は今回 avatar／hit／player のみ（決定247 gate の測定範囲）

### G17 Reduced Motion【実測】
- 決定249：reduced 15 play で変形 0（`rl-rim-only`・`rl-stagger-dim`・tone のみ）／決定250：reduced は静止カットイン・stop 0ms・unlock 1,226ms／決定254：reduced の animation は PC・SP とも `battle-entrance-out`（opacity）のみ・操作可 752〜817ms・消滅 917〜992ms／決定257：reduced でも burst_rise・enemy_rise 各 1 回・duck 正常・error 0

### G18 Sound【実測】
- 決定233（`extras.mjs` press）：PC（mouse）・SP（touch）各 9 タップ（カード 6・ラウンド終了 3）で click→`card_play` 開始 **0.2〜0.5ms**・予約遅延 0ms・1 タップ 1 回（結果確定時の card_play 0）・ラウンド終了は rate 0.85・30ms 内の同音同 rate 重複 **0**
- 決定257（`smoke257.mjs` 6 run＋`analyze-smoke.mjs`）：lock 22 行 不一致 0・burst_rise 450ms／hit_l4 1600ms・enemy_rise 200ms・duck 実効 0.12（0.343×0.35）・戻り完了 burst 2,208〜2,293ms／必殺 1,867ms・新 SE 各 1 回・重複 0・既存 SE 列は Production と preview で一致（最大差 11ms）・console error 0（決定257 Production Smoke と同値）

### G19 Entry【実測】
| run | 神紋 | 神 | 敵 | 舞台 | 操作開放 | 消滅（決定254 Release 値との差 ms） |
|---|---|---|---|---|---|---|
| PC preview 1 回目 | −7 | +5 | +100 | +72 | +101 | +38 |
| PC preview 2 回目 | +3 | −5 | +1 | +5 | −47 | −22 |
| **PC Production 1 回目** | +37 | −2 | +4 | +8 | **+266** | **+251** |
| **PC Production 2 回目** | −1 | **+133** | +1 | **+352** | **+159** | **+199** |
| SP Production 1／2 回目 | −1／0 | −1／0 | −1／−1 | −1／+1 | −1／−18 | −18／−11 |
| SP660 Production 1／2 回目 | −1／0 | −1／0 | 0／+1 | 0／+1 | 0／+17 | +2／+13 |
- T3 skip 12 経路（PC：card・end・oracle・Enter・Space・Escape（託宣）@300 の 6＋card@60・card@1800／SP：card・end・oracle@300＋card@1800）：入口中の入力 12/12・**GameState 不変・UI 不変 12/12・手札 5→5 12/12**・skip 後に顕現 SE が鳴った 0・入口の残骸 0・error 0
- T2：PC・SP とも 1 戦目 Full→もう一度 Short→ホーム経由 Short→reload 後の続きから＝入口なし→reload 後の新規＝Full・error 0／T6 続きから＝入口なし（preview・Production）／T7 初陣（PC・SP）・Daily（PC）＝Full・横スクロール 0・error 0／7 柱「{神名} 降臨」見出し・画像・神色 7/7
- T4 reduced：G17 参照。表は `g19/tables.md`（`gen254.mjs` で JSON から生成）

---

## 3. FAIL・未計測の原因と再実行手順

| 対象 | 原因 | 再実行手順 |
|---|---|---|
| G7 dropped | 実行環境の frame 落ち（同 build の preview も同水準）。決定250 時点から PG1 未達で Human QA 受容 | RAM に余裕（空き ≥1.5GB）がある状態で `HEADED=1 CHANNEL=chrome node scripts/gate250.mjs <out> noshot`（BASES の after＝Production）を 1 回。改善を狙うなら asset 側（動画の解像度・bitrate）の別 Decision |
| G19 時刻（PC 本番） | 決定254 Known #5（JS 予約が main thread の負荷で遅れる） | S3（`performance.now()` 基準 1 行）を実装した場合のみ `node scripts/gate2.mjs only=t1,t4`（`D254_AFTER`＝Production）を 2 回。CSS 側の O1 は headed 実 Chrome で 1 回確認 |
| G15 1 回目 | 同上の環境揺らぎ（preview も 9）＋ perf2.json の出力 dir 未作成（計測値はログに残存） | 再試行済み（PASS）。再計測は `D254_OUT=<dir> node perf2.mjs 4 4`（dir を先に作る） |
| 未計測 | **0 件**（OOM 停止 0） | — |

---

## 4. runtime 変更 0 の証明

- 実行ログ（commit 直前）：`git status --porcelain` は `?? docs/COMMERCIAL_RC_PREGATE.md` と `?? docs/evidence/commercial-rc-pregate/` の 2 行のみ（docs 以外 0）／`git diff --stat 3b8d739 -- src public package.json` 0 行
- 計測用スクリプトは worktree 内の未追跡 dir `.rcgate-scratch/` で実行し、`.txt` 写しを `docs/evidence/commercial-rc-pregate/scripts/` に収録後に削除。`dist/` と `node_modules`（ジャンクション）は ignore 対象で commit しない
- スクリーンショット（約 160 枚・122MB）は収録ポリシー（大容量画像は収録しない）に従い commit せず、セッション scratch のみに残した。判定はすべて JSON／TSV で行っている
- Production 操作（push／deploy）0・`docs/DECISIONS.md` 編集 0・他 worktree 変更 0・外部サービス／費用 0・一時ファイアウォール規則 0（preview は 127.0.0.1 のみ）
- 後片付け：preview `:4291`（PID 12816）停止・Playwright／chrome-headless-shell 残存 0・`sevengods-locks/` 空

## 5. 次の一手【AI 判断】
- M3 は完了。Exit Criteria のうち残りは **M4（CEO Final Practical QA v2）由来の 4 項目**（Human QA critical／non-critical・実プレイの「続きから」・実プレイの操作不能 0）と **CEO の記入・承認 3 件**（K13 台帳 UNKNOWN・Known Issues 一覧の承認・M2 の master 統合）
- 本書の Known Issues 確定案（CAN SHIP 21／MUST 2／CEO 判断 8＋判断事項 2）を CEO が承認すれば、Final Practical QA v2 を開始できる
