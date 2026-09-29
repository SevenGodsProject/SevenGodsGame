# 決定250 — God Strike Premium Cut-in v1（大耀）Pilot：Try1 → 実装 → Fast Gate → Human QA READY

- 日付：2026-09-29
- 種別：**presentation only の Pilot 実装**（`src/components/battle/` 3 ファイル変更＋2 ファイル追加＋動画 1 本）。engine／`src/core/`／rules／seed／score／戦闘結果／イベント順／入力ロック時刻：**変更 0**
- Production baseline：**`b1ae088`**（決定249 LIVE）。worktree `C:/Users/kimi1/SevenGodsGame-d250`・branch `feat/d250-god-strike-cutin-video`
- 判断主体：Try1 実行と候補 D の採用は **CEO 承認**（2026-09-29）。実装方式・Gate 判定は **AI 判断**（CLAUDE.md §6-2）
- 禁止事項の遵守：Try2／Try3 0・追加生成／課金 0・merge／push／deploy 0・他 6 神への展開 0・決定249 その他 runtime への変更 0（差分は God Strike カットインの表示経路のみ）・Try1 原本 18MB は Production に入れない（`art-source/h3-god-strike/`・`.vercelignore` の `art-source/` で除外）
- 証拠：`docs/evidence/h3-god-strike-try1/`（Try1・Root Cause）／`docs/evidence/decision250/`（Fast Gate）

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| Root Cause（モデル相違） | `docs/evidence/h3-god-strike-try1/ROOT_CAUSE_MODEL_SELECTION.md`。**承認成果物にモデル ID が無く、AI が自分の WEB 調査（H3 Max を含まない 3 候補）から Kling 2.5 Turbo Pro を選んでスクリプトにハードコードした**。`minimax/h3-max` は fal.ai に実在。再生成 0・確認課金 0 |
| 実装方式 | **既存 God Strike timeline への overlay**。カットインの円形ポートレート（`<img>`）の上に先読み済み `<video>` を重ね、カットイン mount（T+200）と同時に 1.2s 再生。**onComplete（T+1,100＝入力ロック解除・burst-banner・突き 1,300・着弾 1,600 の起点）は静止と同じ時刻**。動画は「カットインの unmount」だけを T+1,400 まで延ばす（overlay は `pointer-events: none`） |
| 入力ロック | **+0ms**（静止・動画とも `RESONANCE_CUTIN_MS` 900ms＝T+1,100 で解除。§6 の Fast Gate 実測） |
| 配信容量 | **MP4/H.264 1 本 389,541B**（720²・24fps・29f・CRF24・SSIM 0.983 対 lossless）。WebM は作らない（§3） |
| フォールバック | reduced-motion／未先読み（readyState<3）／error／404／play() reject／decode 失敗 → **現行の静止カットインそのもの**（何も足さないだけで成立）。ended 取りこぼしは timeout 1.2s＋0.4s で必ず退場 |
| Pilot commit | **`5acba73`**（`feat/d250-god-strike-cutin-video`・parent `b1ae088`・6 ファイル +346/−12）。未 merge・未 push |
| 自動 Gate | tsc 0／lint 0（error 0）／**1,265 PASS**（＋4）／build OK／JS **+1,919B**（≤+3KB）／CSS **+1,372B**（≤+2KB）。Fast Gate（Playwright）：**PASS**（§6）。God Strike timing：着弾 1,600・stop 80・突き 1,300 不変。入力ロック：PC 963→1,001（+38ms）・SP 984→1,024（+40ms） |
| Human QA | Before `:4261`（Production `b1ae088` dist）／After `:4262`。同 seed `rl-qa-7`（大耀 × 蒼海の龍神）。5 問・5/5 YES で PASS（§7） |
| STOP | Human QA READY で停止。merge／push／deploy なし |

## 1. Root Cause（要約・詳細は evidence）

- CEO 承認モデル `minimax/h3-max/image-to-video`（fal.ai「MiniMax H3 Max Image to Video」として実在）に対し、Try1 は `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` で生成された
- 原因：①決定250 候補（preflight §11／§13）が「モデル ID は WEB確認必要・CEO INPUT」のまま §19 の承認を求め、承認回答（FAL_KEY 設定＋Try1 指示）にもモデル ID が無かった ②AI が「WEB確認必要」を §6-2 の推奨案選定と解釈し、§6-3 #4／#6（課金先の同一性）として CEO へ戻さなかった ③fal.ai のモデル一覧を引かず H3 Max を候補に載せなかった
- 再発防止：課金を伴う生成は「モデル ID・単価・回数」を 1 行で書いた実行前確認を承認文に含め、スクリプトは ID を引数で受ける（ハードコード禁止）

## 2. 実装（presentation only）

### 2-1. タイムライン（commit＝T+0。engine は T+0 で確定済み・不変）

| T（ms） | 静止（Production） | 動画（本 Pilot・大耀で採用時） |
|---|---|---|
| 0 | 到達反応・SE `burst_ready`・`cutinActive`（ロック）・**採用判定 1 回**（`isGodStrikeVideoReady`） | 同じ |
| 200 | カットイン mount（暗転 0.2s→スライド） | 同じ＋`<video>` を円の中へ挿し `play()`。`playing` まで透明（下の静止画が見える） |
| 1,100 | `resonance-cutin-timer` 終了→**onComplete**：ロック解除・burst-banner・unmount | **onComplete 同時刻**：ロック解除・burst-banner。unmount せず `is-exiting`（暗転・集中線・帯・文字を 0.3s で引く） |
| 1,300 | 神の突き（`god-burst-strike`） | 同じ（動画末尾の白フラッシュと重なる） |
| 1,400 | — | 動画 `ended` → **onExit** → unmount（安全弁 1,800） |
| 1,600 | 着弾（`BURST_IMPACT_MS`・stop 80・数字・SE・揺れ） | 同じ |
| 2,000〜 | 進化バナー | 同じ |

### 2-2. 変更ファイル（branch `feat/d250-god-strike-cutin-video`・parent `b1ae088`）

| ファイル | 変更 |
|---|---|
| `src/components/battle/godStrikeVideo.ts`（新規） | 動画の対応表（**大耀のみ**）・尺 1,200／安全弁 400・採用判定 `isGodStrikeVideoReady`・先読み `createGodStrikeVideoPreload`・解放 `releaseGodStrikeVideo` |
| `src/components/battle/godStrikeVideo.test.ts`（新規） | 4 件：大耀 1 柱だけ／採用判定の全分岐／ブラウザ外・reduced・対象外で先読みしない／timeline 定数不変（200・900・1,300・1,600）と「動画はロック解除の後・着弾の前に終わる」 |
| `src/components/battle/BattleResonanceCutin.tsx` | props `video?`／`onExit?` 追加。ルート・`resonance-cutin-timer`・`handleAnimationEnd`・onComplete の時刻は不変。動画は `appendChild`→`play()`、`playing` で `is-video`、`ended`／`error`／timeout／reject で done、onComplete 後に `is-exiting`。退場＝「onComplete 済み かつ 動画 done」 |
| `src/components/battle/BattleScreen.tsx` | 戦闘開始時の keyvisual 先読みに動画先読みを追加（`stageGodId` 効果・戦闘終了で解放）。burst 検知時に採用判定を 1 回。`handleCutinComplete` から unmount を外し `handleCutinExit` へ（静止は同 tick＝挙動不変） |
| `src/components/battle/battle.css` | 決定250 ブロック（+86 行）：`.resonance-cutin-video-frame`（円・overflow hidden・playing まで透明）／`.resonance-cutin-video`（1.7 倍・中心 37.5%／32.5%＝顔と砲を主役に）／`.is-exiting` の undim・rays-out・band-out・caption-out |
| `public/assets/gods/taiyo/god-strike-v1.mp4`（新規） | 389,541B（§3） |

### 2-3. 不変の証明（設計）
- engine：`src/core/` 変更 0。動画の有無は `useBattleFx`／reducer／`planBatch`／`combatTimeline`／`useBattleSound`／`useFloatingNumbers`／`useMobileAutoFocus` のいずれにも渡らない（読んでいるのは BattleScreen の ref だけ）
- ロック：`cutinActive` は onComplete（900ms）で false。動画経路でも同じ関数・同じ時刻
- 着弾：`BURST_*` 定数は未変更（テストで固定）。敵側 `data-impact-at` は Before/After とも 1,600（Fast Gate）
- seed／score／結果：同 seed の Before/After で HP・結果画面を比較（Fast Gate）

## 3. 配信形式の監査（WebM／MP4）

| 観点 | 判断 |
|---|---|
| 再生互換 | MP4/H.264 High@3.1・yuv420p・無音は iOS/macOS Safari・Chrome・Edge・Firefox・Android Chrome の**すべてで再生可**。VP9/WebM でしか再生できない対象端末は無い |
| 容量 | MP4 CRF24＝**389,541B**（SSIM 0.9833・min 0.972）。WebM CRF32＝633,088B（候補 D）で MP4 より**大きい** |
| 結論 | **MP4 1 本のみ配信**（`<source>` 連鎖なし）。WebM を足すと配信資産が増えるだけで、fallback 経路も 1 本で足りる。CRF26（305KB・SSIM 0.979）は白フラッシュ周りのバンディングが増えるため CRF24 を採用 |
| 生成元 | Try1 原本 1440²・5.04s・18.3MB（`art-source/h3-god-strike/`）→ 1.10〜4.71s を 3 倍速で 29f に時間圧縮（候補 D・非生成後処理）→ 720²・24fps・faststart |

## 4. フォールバック行列（すべて「現行の静止カットイン」＝Production と同一体験）

| 事象 | 判定点 | 結果 |
|---|---|---|
| prefers-reduced-motion | 先読みしない＋採用判定 false | 静止（CSS の reduced ルールもそのまま） |
| 404／ネットワーク失敗 | 先読み要素の `error`→採用判定 false | 静止。console は「Failed to load resource」のリソースログのみ（JS error 0） |
| 取得が commit に間に合わない（低速回線） | `readyState < 3` → false | 静止（途中で切り替えない） |
| decode 失敗・play() reject（iOS 低電力など） | カットイン内 `error`／reject → done | 静止画が下にそのまま見える（`is-video` にならない） |
| `ended` 取りこぼし | timeout 1,200＋400 | onExit → unmount（ロック・着弾に影響なし） |
| 動画ファイルが 1 バイトも無い | 上と同じ | Production と同一 |

## 5. Try1 と候補 D（`docs/evidence/h3-god-strike-try1/README.md`）
- identity Gate 0〜0.4s PASS（顔 MAE 2.2）。全フレーム数値は目視で別人化ではない（再描画・火花・カメラの寄り）
- 候補 D＝1.10〜4.71s を 3 倍速で 1.2s：砲口の光→火花→砲火→白フラッシュの全弧。円の中では 1.7 倍に寄せ、顔・ゴーグル・頭巾の紋・砲を主役にする（`docs/evidence/decision250/circle_preview.webp`）

## 6. Fast Gate（Playwright・`docs/evidence/decision250/fast-gate/`）

- Pilot commit：**`5acba73`**（`feat/d250-god-strike-cutin-video`・parent `b1ae088`・6 ファイル +346/−12・worktree clean）。After の dist＝この内容の build（`index-DOwgT26B.js`／`index-C_DG_k4y.css`）。Before＝`SevenGodsGame-d249/dist`（JS md5 `b2557b14…`＝決定249 Release Gate の Production build）
- 手順：`?seed=rl-qa-7` 大耀 × 蒼海の龍神。攻撃カード優先で連打→R5 の「共振」で共鳴 7/7 → God Strike。すべての context で同じ手順・同じ R5・同じ結果
- 計測：`MutationObserver`（cutin mount／`is-video`／`is-exiting`／unmount／burst-banner／`enemy-reaction[data-impact-at]`／end-round の disabled）＋ media event（playing／ended／error）＋ `getVideoPlaybackQuality()`。時刻は**カットイン mount（T+200）基準**の ms

### 6-1. 自動 Gate

| 項目 | 結果 |
|---|---|
| tsc | 0 |
| lint（oxlint） | error 0（warning は既存 scripts のみ） |
| full tests | **1,265 PASS**／9 skipped（決定249 の 1,261 ＋ 4） |
| build | OK。JS 446,849B（**+1,919B**）／CSS 172,346B（**+1,372B**）／mp4 389,541B が dist に配置 |

### 6-2. 実機相当（headed Chrome・GPU あり・スクリーンショットなし）

| context | unlock（＝banner＋onComplete） | 動画 visible | 動画 ended | cutin unmount | impact 計画 | dropped/total | JS error | 横スクロール | 敵 HP 後／結果 |
|---|---|---|---|---|---|---|---|---|---|
| PC Before | **963** | — | — | 963 | 1,600・stop 80 | — | 0 | なし | 190/1,030 → 敗北（残 120） |
| PC After | **1,001（+38）** | 94 | 1,318 | 1,322 | 1,600・stop 80 | 5/33 | 0 | なし | **同一** |
| SP Before | **984** | — | — | 984 | 1,600・stop 80 | — | 0 | なし | 同一 |
| SP After | **1,024（+40）** | 100 | 1,286 | 1,291 | 1,600・stop 80 | 2/33 | 0 | なし | **同一** |

- **入力ロック Before/After：PC 963→1,001（+38ms）・SP 984→1,024（+40ms）**。どちらも `RESONANCE_CUTIN_MS` 900ms＋React handoff で、+500ms 禁止に対し **+40ms**。After でも unlock と burst-banner と onComplete は**同一イベント**（動画の終了とは独立）
- **God Strike timing Before/After：着弾計画 1,600ms・stop 80ms・突き 1,300 は全 context で同一**。差は「カットイン overlay の unmount が 963〜984 → 1,291〜1,322 になる」だけ（overlay は `pointer-events: none`・engine 非依存）
- **damage／seed／score／result：同 seed で敵 HP（190/1,030・特大 160 予告）・結果画面（敗北・残 HP 120／1,030）・進化バナー到達が Before/After 全 context で同一**
- console：JS error／pageerror **0**（全 12 context）。横スクロール 0

### 6-3. headless（Chromium・ソフトウェアデコード）での分岐確認

| context | 結果 |
|---|---|
| PC After reduced-motion | 動画要素なし（先読みも採用もしない）。unlock＝banner＝unmount 同時。stop 0ms＝Production の reduced と同一 |
| PC After 404（mp4 を 404 に差替え） | 先読みの `error` → 静止カットイン（`video+` なし）。JS error 0。console はブラウザのリソースログ「Failed to load resource: 404」1 件のみ（`onerror` は握っている） |
| PC After stall（mp4 応答を 90s 遅延＝uncached・低速） | `readyState < 3` → 静止カットイン。timing は Before と同じ（unlock＝banner＝unmount） |
| PC After cache（同 context で 2 戦） | 2 戦目も動画採用。vite preview は cache header を返さないため mp4 を再要求（206）。Production（Vercel 静的配信）では ETag による 304 再検証 |
| PC／SP After headless | 動画 visible 39〜285ms・ended 1,265〜1,502（ソフトウェアデコードで media clock 自体が遅れる）。unlock は Before 比 PC +190（1,311→1,501）・SP +9（971→980）。**headed（6-2）では PC +38・SP +40** |

### 6-4. 判定と留意点

- **Fast Gate：PASS**（CEO 指定 15 項目：tsc／lint／full tests／build／PC／SP／cached／uncached／failure fallback／reduced-motion／God Strike timing／input lock／damage timing／console error／horizontal scroll）
- 留意 1：**dropped frames**は headed PC 5/33・SP 2/33（決定250 preflight PG1 の PC ≤2% は未達）。カットイン開始時の CSS animation（dim／rays／band／slide）と decode 開始が重なる。体感は Human QA Q4／Q5 で判定。改善候補（次 Decision）：先読み時に 1 frame だけ `play()→pause()` して decoder を温める
- 留意 2：PC headed で `playing` が 2 回（94ms／358ms）＝再生開始直後に約 100ms の rebuffer。上と同じ原因
- 留意 3：動画の初フレーム（front_640 の全身ポーズ）と静止ポスター（keyvisual）はポーズが異なる（決定250 §5 の既知事項）。visible まで 94〜100ms は keyvisual が見え、その後 120ms でクロスフェード
- スクリーンショット：`pc-after-shot-b1-video.webp`（円の中で砲火→白フラッシュ）、`sp-after-b1-cutin-early.webp`（SP のカットイン構図）

## 7. Human QA（READY 後）

| | Before（Production `b1ae088`） | After（Pilot） |
|---|---|---|
| PC | `http://127.0.0.1:4261/?seed=rl-qa-7` | `http://127.0.0.1:4262/?seed=rl-qa-7` |
| iPhone（同じ Wi-Fi） | `http://192.168.11.6:4261/?seed=rl-qa-7` | `http://192.168.11.6:4262/?seed=rl-qa-7` |

- 大耀 × 蒼海の龍神・攻撃カード連打で共鳴 7/7 → God Strike（同 seed なので Before/After で同じ手順・同じ結果）
- iPhone は一時ファイアウォールが必要：管理者 PowerShell で `scratchpad/d250/qa-fw-add-d250.ps1`（group「QA D250 (temp)」TCP 4261/4262・LocalSubnet）。QA 後 `qa-fw-remove-d250.ps1`
- 5 問：Q1 God Strike が明確に特別な瞬間になったか／Q2 通常カード・PAYOFF との差が十分か／Q3 大耀本人として違和感がないか／Q4 テンポを邪魔しないか／Q5 商品品質が一段上がったか。**5/5 YES で PASS**。Q3 NO → 動画不採用（識別性は数値で救わない）。Q4 NO → 退場を 1,100 に戻す案（動画 0.9s 切り）で 1 回だけ再 QA

---

## 8. Pilot v2（H3 Max Try2 W2 ＋ ポスター連続性）— Fast Gate PASS → HUMAN QA READY（2026-09-30）

- 経緯：v1（Kling 候補 D）は CEO Human QA 4/5（Q3 NO）で CONDITIONAL FAIL → Q3 Root Cause 監査（`docs/evidence/decision250/q3-audit/`）→ H3 Max Try2（CEO 承認・1 回・request_id `01a0ed24-…b74`）→ Gate v2／v2R は FAIL だが残存 4 項目が形状・位置・ポーズではなく発光の色／照明変化であることを確認 → **CEO 決定：追加生成せず W2 を実ゲームで Human QA**
- 種別：**presentation only の Pilot 実装（Human QA 用・Production 不採用）**。commit **`a50b127`**（`feat/d250-god-strike-cutin-video`・parent `5acba73`・7 ファイル）。merge／push／deploy なし。Try3 0・API 0・課金 0

### 8-1. 変更

| 項目 | v1（5acba73） | v2（a50b127） |
|---|---|---|
| 動画 | Kling 候補 D・3 倍速・`god-strike-v1.mp4` 389,541B | **H3 Max Try2 W2（1.083〜2.250s・等速 29f）・`god-strike-v2.mp4` 166,058B** |
| ポスター | なし（円は keyvisual → 120ms で動画へ） | **`god-strike-v2-poster.webp` 61,866B**（Try2 静止 frame＝動画の先頭 frame と同じ画・同じ 720² 構図）。動画採用時は mount の瞬間から円に敷き（`.is-premium`）、動画は playing で同じ画の上に現れる |
| 先読み | 動画のみ | 動画＋ポスター（`new Image()`・keyvisual と同方式） |
| フォールバック | reduced／未先読み／404／stall → keyvisual 静止。error／reject → keyvisual | reduced／未先読み／404／stall → keyvisual 静止（ポスターも出さない）。**error／reject → ポスターが静止フォールバック** |
| timing | onComplete 900／突き 1,300／着弾 1,600／stop 80 | **不変** |
| bundle | JS 446,849／CSS 172,346 | JS 447,216（+367）／CSS 172,500（+154） |
| 配信資産 | 389,541B | **227,924B（−161,617B）** |
| tests | 1,265 | **1,266**（+1：動画を持つ神は同じ構図のポスターを持つ） |

### 8-2. Fast Gate（`docs/evidence/decision250/pilot-v2/fast-gate/`・Before `:4261`＝Production `b1ae088` dist／After `:4262`＝`a50b127` build）

- 自動：tsc 0／lint error 0（warning は既存 scripts のみ）／1,266 PASS／build OK
- headless 14 context（PC／SP × Before／After、reduced、404、stall、cache×2 戦、noshot、shot）：**全 context で JS error 0・横スクロール 0・着弾 1,600・stop 80（reduced は 0＝Production の reduced と同一）・同 seed の敵 HP 190/1,030・結果（敗北・残 120）が Before/After 同一**
- **headed Chrome（GPU）**：

| context | unlock | poster+ | video visible（playing） | ended | cutin unmount | dropped/total |
|---|---|---|---|---|---|---|
| PC Before | 1,305 | — | — | — | 1,305 | — |
| PC After | 1,034 | **0（mount と同時）** | 125 | 1,276 | 1,283 | **2/33** |
| SP Before | 1,094 | — | — | — | 1,094 | — |
| SP After | 979 | **0** | 78 | 1,263 | 1,265 | **2/33** |

- 入力ロック：After でも unlock＝banner＝onComplete は同一イベント（差は harness の揺れ。v1 と同じ機構で 900ms 起点）。ロック延長 0
- ポスター連続性：全 After context で `poster+` が `cutin+` と同時刻（0ms）、`.is-premium` true、ポスター `complete`・naturalWidth 720（`gate-headless.json` posterState）。keyvisual は円に一度も現れない（`pc-after-cutin-300.webp`／`sp-after-cutin-40.webp`）
- フォールバック：404 → `poster+` なし・keyvisual 静止・JS error 0（リソースログ 1 件のみ）／stall → `is-premium` false・静止／reduced → 静止・stop 0
- **v1 との比較**：配信容量 389,541 → 227,924B／poster continuity なし → あり／identity continuity（Gate v2R）：目のバイザー越し・紋・位置・カメラ・向き PASS（Kling は全 FAIL）、残るは発光の色／照明 4 項目／dropped frames headed PC 5/33 → **2/33**・SP 2/33 → 2/33
- **判定：Fast Gate PASS**（15 項目：tsc／lint／tests／build／PC／SP／cached／uncached／failure fallback／reduced／God Strike timing／input lock／damage timing／console error／horizontal scroll）

### 8-3. Human QA（READY）

| | Before（Production `b1ae088`） | After（Pilot v2 `a50b127`） |
|---|---|---|
| PC | `http://127.0.0.1:4261/?seed=rl-qa-7` | `http://127.0.0.1:4262/?seed=rl-qa-7` |
| iPhone（同じ Wi-Fi） | `http://192.168.11.6:4261/?seed=rl-qa-7` | `http://192.168.11.6:4262/?seed=rl-qa-7` |

大耀 × 蒼海の龍神・攻撃カード優先で連打 → R5 の「共振」で共鳴 7/7 → God Strike。7 問（Q3 大耀本人・Q6 ポスター→動画の連続性が NO なら FAIL）。iPhone は管理者 PowerShell で `qa-fw-add-d250.ps1`（group「QA D250 (temp)」・4261/4262・LocalSubnet）、QA 後 `qa-fw-remove-d250.ps1`。

---

## 9. Production Release — PRODUCTION LIVE / CLOSED（2026-09-30 JST）

- Human QA（CEO・2026-09-30）：**Q1〜Q7 すべて YES（7/7 PASS）**（Q3 大耀本人／Q6 ポスター→動画の連続性を含む）→ **CEO が Production Release を承認**。Gate と Smoke の判定は AI 判断
- 経緯の要約（本 Decision の全体）：Kling Try1（候補 D）Pilot v1 → CEO Human QA **4/5・Q3 identity NO（CONDITIONAL FAIL）** → Q3 Root Cause 監査（ポスター不連続・バイザー退色・紋の崩壊・寄り・腕）→ **H3 Max Try2**（`minimax/h3-max/image-to-video`・1 回・$0.20 表示価格）→ **Gate v2 / v2R は FAIL**（残存 4 項目は発光の色／照明）→ CEO 決定で **Pilot v2**（W2 ＋ ポスター連続性）→ Fast Gate PASS → **Human QA 7/7** → Release

| 項目 | 値 |
|---|---|
| final Production commit | **`a50b127`**（`feat/d250-god-strike-cutin-video`・parent `5acba73`・grand-parent `b1ae088`） |
| 統合方法 | ローカル master を `b1ae088 → a50b127` へ **fast-forward**（`git fetch . feat/d250-god-strike-cutin-video:master`）→ `git push origin master`。cherry-pick／merge commit なし。main worktree（`feat/d224`・決定213 runtime・未追跡 docs）には一切触れていない |
| Release Gate | 差分 `b1ae088..a50b127`＝2 commit／7 ファイル（`src/components/battle/` 5・`public/assets/gods/taiyo/` 2）。`src/core`／`src/hooks`／docs／art-source／Kling 混入 **0**。worktree clean。tsc 0／lint error 0／**1,266 PASS**／clean rebuild の JS `index-nu5j4YsL.js` md5 `d5770869…`・CSS `index-Bb2gHnj6.css` md5 `a88d74a6…`＝Human QA 版と一致。mp4 md5 `f4019454…`＝承認 W2（`candidate_1.083-2.250_720_crf24.mp4`）と一致・poster md5 `5d656907…`。Smoke 項目（PC／SP／cached／uncached／failure fallback／reduced／timing／lock／damage／same-seed／console／hScroll）は同一バイトの build に対する Fast Gate 実測（§8-2）で充足 → **PASS** |
| Vercel Production deployment | **`6738586429`**（sha `a50b127`・Production・success・2026-09-29T15:24:58Z） |
| Production URL | `https://seven-gods-game.vercel.app`（配信 JS/CSS md5＝承認 build と一致。`god-strike-v2.mp4` 200・166,058B・`video/mp4`・md5 一致／`god-strike-v2-poster.webp` 200・61,866B／旧 `god-strike-v1.mp4` は **404**） |
| **Production Smoke**（Playwright・`docs/evidence/decision250/pilot-v2/production-smoke/`） | **PASS**：After 系 11 context（PC／SP、reduced、404、stall、cache×2 戦、noshot、shot）すべてで JS error 0・横スクロール 0・着弾 1,600・stop 80（reduced 0）・同 seed（rl-qa-7・大耀 × 蒼海の龍神）の敵 HP 190/1,030・結果（敗北・残 120）が Before と同一。動画：poster+ は cutin mount と同時刻（0ms）・playing 20〜278ms（headless）・ended 後に unmount。404 → poster なし・keyvisual 静止・JS error 0／stall → 静止／reduced → 静止・stop 0／cache 2 戦目も再生 |
| Human QA 7/7 | Q1 特別な瞬間 YES／Q2 通常カードとの差 YES／Q3 大耀本人 YES／Q4 発光の自然さ YES／Q5 テンポ YES／Q6 ポスター→動画の連続性 YES／Q7 商品品質 YES |
| 配信資産 | mp4 **166,058B** ＋ poster **61,866B** ＝ **227,924B**（v1 Kling 案 389,541B より −161,617B）。JS +2,286B・CSS +1,526B（Production `b1ae088` 比） |
| timing Before／After | onComplete＝入力ロック解除 900ms 起点・突き 1,300・着弾 1,600・stop 80：**不変**。headed 実測（§8-2）unlock PC 1,305→1,034／SP 1,094→979（harness の揺れ・同一イベント）。動画は T+200 から 1.2s で unmount のみ延長（overlay・pointer-events none） |
| rollback target | Vercel **`6713037626`**（sha `b1ae088`・決定249） |
| cleanup | QA preview :4261／:4262 停止（pid 15772／4052）。一時ファイアウォール「QA D250 (temp)」は作成されておらず 0 件。FAL_KEY 未接触 |
| Production に入れていないもの | Kling 素材（v1 mp4 削除済み）・Try1 原本 18MB・Try2 原本 5.4MB・`art-source/`（`.vercelignore`）・他 6 神への展開・docs |
| known issues | ①dropped frames：headed PC/SP 2/33（preflight PG1 ≤2% は未達だが v1 の 5/33 から改善・Human QA Q5 YES）②発光中はバイザーの砲口側が橙→黄、肌が黄金色（Gate v2R の残存 4 項目・Human QA Q4 YES で許容）③ポスターは動画採用時のみ。reduced／未先読み／404／stall は keyvisual 静止（Production と同一）④**master の docs は 決定208 で止まったまま**（決定209〜250 の docs は main worktree に未 commit）→ Release 後の独立 docs-only 作業 |

**決定250：PRODUCTION LIVE / CLOSED。**
