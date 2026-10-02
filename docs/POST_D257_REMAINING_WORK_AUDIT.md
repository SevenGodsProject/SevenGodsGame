# Post-D257 Remaining Work Audit — Commercial RC までに「本当に残っている仕事」の整理

- 日付：2026-10-02
- 種別：**AUDIT ONLY / docs-only**（ブラウザ・Playwright・vitest・build・simulation・server・runtime／src／public 変更・Production 操作：すべて 0。決定257 Release lane には一切触れていない）
- 判断主体：AI チーム（CLAUDE.md §6-2「複数案からの推奨案選定」）。実装・生成・Release の開始は CEO
- Baseline：master = origin/master **`538a3ef`**（決定257 runtime＝`a410f22`・Vercel deployment `6809771068` success・Production Smoke は本書時点で **進行中**＝決定257 は CLOSED 前）。それ以前の Production runtime は `a611270`（決定254）
- 読んだもの：`docs/PRACTICAL_QA_2026-09-28_AUDIT.md`（決定244）／`POST_D254_PRACTICAL_QA_REAUDIT.md`（Lane 1）／`COMMERCIAL_PRESENTATION_AUDIT.md`（Lane 3）／`RANKING_INTEGRATION_PREFLIGHT.md`（決定256）／`DAILY_COMPETITIVE_GATE_REJUDGMENT.md`／`SOLUTION_DIVERSITY_V1_PREFLIGHT.md`（決定255）／`DAILY_GOD_SPREAD_PREFLIGHT.md`（決定259 PARTIAL）／`DECISION257_SOUND_LAYER_V1_PILOT.md`／`FINAL_PRACTICAL_QA_COMMERCIAL_RC_PREFLIGHT.md`／`SEVENGODS_NEXT_MILESTONES.md`／`RELEASE_STATUS.md`／`docs/DECISIONS.md` 決定244〜259 行。**新しい計測は 0**（既存 evidence の統合のみ）
- 原則：決定255 の結論（Normal に複数解必須を数値で強制しない・段階設計を保護）を尊重する。決定259 の未検証部分は推測で埋めない。Enemy Art 大量生成・Voice 生成・H3／fal.ai・追加費用は扱わない。Ranking は READY-DORMANT（Production 統合を前提にしない）
- 表記：【docs】＝既存 Decision／evidence の記録／【AI 判断】＝本書の分類

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 14 項目の再分類 | **CLOSED 8**（03・06・08・09・12・13・14・＋02 の「音」側は決定257 CLOSED 後に CLOSED 見込み）／**IMPROVED BUT REMAINS 3**（01・02・11）／**OPEN 1**（04）／**BLOCKED / DEFERRED 2**（05・07）。10 は決定255 で「設計上の段階設計」として **DEFERRED（by design）** |
| Commercial RC までに **必ず**やること（MUST） | **4 件だけ**：M1 決定257 の Production Smoke → CLOSED 記録（進行中）／M2 新規 SE 2 本の権利台帳行（`ASSET_RIGHTS_LEDGER.md`・自作合成＝権利 ◎）／M3 Regression Gate G1〜G19 を現 Production で 1 回通す（`FINAL_PRACTICAL_QA_COMMERCIAL_RC_PREFLIGHT.md` §2・1 browser 直列）＋ Known Issues 一覧の確定／M4 CEO の Final Practical QA（3 セッション・16 体験軸・critical＝A3／A10）→ Triage → Exit Criteria 判定 |
| SHOULD（RC 前に入れると Exit が通りやすい小物） | S1 MATERIAL 残（fixed バナー 3 枚の `system-ui`＋絵文字→既存 SVG・pill 2 種）／S2 RETURN TO CALM（敗北の帳票即出し・結果画面の戦闘 BGM 即再開を 1 段ラップ）／S3 D254 Known #5（JS 予約の `performance.now()` 基準 1 行）／S4 作業環境の衛生（worktree 59 本の prune・main worktree `feat/d224` の docs と決定213 runtime の分離・決定210／211 の番号未記録の整理） |
| POST-RC / GROWTH | Home の動き（04）／「答えの可視化」（決定255 の発見を結果画面へ）／SP 空き帯・OTOMO の存在感／Daily 神間 spread の是正（決定259 の残り）／Ranking（READY-DORMANT・TRIGGER 待ち） |
| BLOCKED / NEEDS CEO | 敵 7 体アート（05・生成・権利・費用）／God Strike Voice（07・権利・生成）／決定259 の再開（RAM ≥700MB・約 2 時間の simulation 枠）／Ranking 解除（D1〜D7） |
| **NEXT NOW**（決定257 CLOSED 後に開始） | **「Commercial RC Pre-Gate」＝M2＋M3**：SE 2 本の台帳行を書き、Regression Gate G1〜G19 を Production `538a3ef` で 1 回通して Known Issues 一覧を確定する（docs＋evidence・runtime 0・1 browser／1 run 直列）。これが CEO Final Practical QA（M4）の前提 |
| **NEXT AFTER** | **S1＋S2 の小型 hotfix 束（Fast Gate 型）**：MATERIAL 残 3 枚と RETURN TO CALM の 1 段ラップ。CSS／sound の表示層のみ・`src/core` 0・Human QA は省略可を提案（決定247 型） |
| **PARALLEL PREP**（docs-only・CEO 判断不要） | **Enemy Art Brief v1.1**（Lane 3 の改訂 8 点＝PC 反転の反映・`artFacing` を入口／カットインへ・入口 Human QA・順序＝試練の影を先頭 等）を docs で確定し、CEO が「生成するかどうか」を判断できる状態にする。生成は行わない |
| **DEFER** | **決定259 Daily 神間 spread 是正（残り約 213,000 試合・約 2 時間）**：Ranking が READY-DORMANT で TRIGGER 未到達のあいだは Commercial RC の条件に含めない。再開は RAM 枠が確保できたときに PARALLEL PREP として扱う |

「全部やる」ではなく、**RC までは M1〜M4 の 4 件**（うち 2 件は CEO 実施）に絞る。

---

## 1. 決定244〜259 の到達点（docs 統合）【docs】

| 決定 | 状態 | 14 項目への効果 |
|---|---|---|
| 244 Practical QA 監査 | CLOSED | 14 Findings・RC1〜RC5 |
| 245／246 Combat Tension v1 | LIVE | 09・06・12 の RC1 解消（naive 敗北 2.4→16.1%・託宣 3 回・峰 R4） |
| 247 PC 敵反転 | LIVE | 01 の HUD 向き（PC） |
| 248／249 Reaction Language v1 | LIVE | 03（60/60 枚に反応主体） |
| 250 God Strike Cut-in v2 | LIVE | 02 の映像（大耀のみ動画） |
| 251 神階 Re-centering | LIVE | 09 の神階側 |
| 252 Enemy Ultimate | LIVE | 13・11（7 identity・必殺 6/7） |
| 253 Oracle Readability | LIVE | 12（役割語・状況表示） |
| 254 降臨の間 | LIVE | 14（入口の儀式） |
| 255 Solution Diversity | **CLOSED（NO-GO・runtime 変更なし）** | 10・11 の残りは「Normal＝入門〜標準／神階Ⅲ以降＝組み合わせ必須」の段階設計として保護 |
| 256 Ranking Preflight／Daily Gate | NO-GO／READY-DORMANT | G1 13.82% FAIL・fairness PASS・解除条件 D1〜D7 |
| 257 Sound Layer v1 | **Release 中**（Human QA 4/4・Gate PASS・deploy success・Smoke 進行中） | 02 の音・Sound Premium の最大の穴（神の一撃 1,180ms／必殺 1,110ms の無音・duck 0） |
| 259 Daily spread Preflight | **PARTIAL** | 才華＝3 段 AP 機関／寿楽・福永＝tempo 段差。候補比較は未検証 |
| Final Practical QA Preflight | docs 完成 | M3／M4 の設計（G1〜G19・16 体験軸・Exit Criteria・Triage） |

---

## 2. 14 項目の再分類【AI 判断】

| # | Finding | 分類 | 根拠【docs】 | 残り（事実のみ） | RC 分類 |
|---|---|---|---|---|---|
| 01 | Character facing | **IMPROVED BUT REMAINS** | 決定247（PC 反転）・決定254 Q2 YES | 笑蓮＝右向き（Kit 正典）／才華 keyvisual の鏡像／**敵カットイン `BattleEnemyCutin.tsx:64` は原画のまま＝左向き 4 体が必殺で神に背**／入口の敵は原画 | POST-RC（Brief v1.1 と同時。v2 art で向きが変わるため CSS 単独反転は Lane 3 で却下） |
| 02 | Battle atmosphere | **IMPROVED BUT REMAINS** | 249・250・252・254 の Human QA YES／257 で無音区間を解消（CLOSED 待ち） | 敵アートの平面感・接地 0（asset）／MATERIAL のバナー 3 枚・pill 2 種／SP 空き帯 | 音＝M1／MATERIAL＝SHOULD S1／asset＝BLOCKED |
| 03 | Card reaction | **CLOSED** | 決定249 3/3・Smoke 42 play | Known（OTOMO SP 小・DEAL はラウンド開始に付けない） | — |
| 04 | Home motion | **OPEN** | `setup.css` keyframes 0・決定254 Preflight で C1 保留 | Home は静止 | POST-RC / GROWTH（Loop 寄与は最小＝Lane 3） |
| 05 | Enemy art | **BLOCKED / DEFERRED** | `public/assets/enemies/` 変更 0・Brief v1 MUST E2／E4／E5／E6／E7 FAIL・HOLD | 生成・権利・費用＝CEO §6-3 #5／#6 | BLOCKED / NEEDS CEO（Brief v1.1 は PARALLEL PREP） |
| 06 | Stat scale | **CLOSED** | RC1 解消・決定246 Q1 YES | 表示 ×10 は不変（変えない） | — |
| 07 | God Strike Voice | **BLOCKED / DEFERRED** | SeName に voice 0・Lane 3「必要（条件付き）だが今は作らない」・CEO 保留 | 権利・生成方式・費用＝CEO | BLOCKED / NEEDS CEO |
| 08 | 時間制限／公平性 | **CLOSED（監視）** | 時間は記録も評価もしない（決定256 で再確認） | Ranking 起動時に同点圧縮率を監視 | — |
| 09 | 後半の緊張／託宣 | **CLOSED** | 決定246 3/3・251 5/5・252 7/7・Lane 1 実測 | Known：hard reader 96／Daily reader 91・未撃破 9%／outlier K2・K3 | — |
| 10 | Draw／Solve diversity | **DEFERRED（by design・決定255）** | planner で答えは分散（guard 86／oracle 50／weaken 53／mend 29）、必要性は神階Ⅲ以降で立ち上がる。数値で Normal に必須化は NO-GO | 「答えの可視化」は presentation 候補のみ | POST-RC（可視化）。Normal の数値変更は行わない |
| 11 | Enemy differentiation | **IMPROVED BUT REMAINS** | 決定252 7/7・planner では敵で答えが変わる（魔獣＝MEND 38%・道化＝加護 72%・機工師＝撃破 37%） | 試練の影は数字のみ（入門・設計）。reader の AP 配分はほぼ同一（heuristics 由来） | DEFER（設計範囲。Final QA の A13 で体感を確認） |
| 12 | Oracle readability | **CLOSED（監視）** | 決定253 3/3・Smoke 14/14 | 人間の導き使用率は未観測 → Final QA A6 で観測 | — |
| 13 | Enemy attacks monotony | **CLOSED** | 決定252（必殺 6/7・Identity Gate） | 語彙 4 種（新 mechanic 3 案は実測棄却） | — |
| 14 | Game entry | **CLOSED** | 決定254 5/5・Smoke 15 項目 | Known #5（JS 予約 ≈230ms・修正しない指示→S3 候補として記録のみ） | SHOULD S3（CEO が解除した場合） |

### 2-1. 14 項目の外にある残候補

| 候補 | 分類 | 根拠【docs】 | RC 分類 |
|---|---|---|---|
| Daily 神間 spread／Ranking | **BLOCKED / DEFERRED** | 決定256 G1 13.82% FAIL・READY-DORMANT・解除条件 D1〜D7／決定259 PARTIAL（原因＝才華の 3 段 AP 機関・寿楽／福永の tempo 段差。候補 24 案は未検証） | DEFER（TRIGGER 未到達。RC 条件に含めない） |
| Sound Premium 残 | **IMPROVED（257 後）** | 257 で rise 2 本＋duck。残＝RETURN TO CALM（敗北帳票即出し・結果画面の戦闘 BGM 即再開・ジングル前の即停止）・Voice（BLOCKED） | SHOULD S2 |
| MATERIAL 残 | OPEN（小） | fixed バナー 3 枚（`battle.css:1946-2045`・`system-ui`＋絵文字）・pill 2 種・中央閃光 PNG 6 枚 1.98MB（Lane 3） | SHOULD S1 |
| Character Art Unity（神・OTOMO・敵） | BLOCKED | 敵 7 体が 4 画風・Kit 線画セルと不一致（Brief v1） | BLOCKED / NEEDS CEO |
| technical debt | OPEN | 59 worktree（`git worktree list`）・main worktree は `feat/d224` に決定213 runtime と未 commit 差分・決定210／211 番号未記録（NEEDS REVIEW）・`python` が Store スタブ・RAM 6GB で Gate が 3 回 OOM 停止・NEXT_MILESTONES の cleanup scope（`otomo.defId` guard・`deckPreference` 版方針・GitHub Actions 1 本・`.vercelignore` dead asset） | SHOULD S4（Regression Gate を clean 環境で回すための最小限）／残りは POST-RC |

---

## 3. Commercial RC 分類（Primary Fun → Loop → fairness → presentation → cleanup の順）

### 3-1. MUST BEFORE COMMERCIAL RC（4 件・これ以外は RC の条件にしない）

| # | 内容 | 軸 | 根拠 | 状態 |
|---|---|---|---|---|
| M1 | 決定257 Production Smoke → PRODUCTION LIVE / CLOSED 記録 | presentation（最大の無音の穴） | Human QA 4/4・Gate PASS・deploy `6809771068` success | **進行中**（本書は触れない） |
| M2 | `ASSET_RIGHTS_LEDGER.md` に `burst_rise.wav`／`enemy_rise.wav` の 2 行（Source＝`gen-se.mjs` 数式合成・Creator＝AI チーム・Terms＝自作・Evidence＝`docs/evidence/decision257/se-new-analysis.txt`） | fairness／rights（Exit Criteria「配信 asset すべてに台帳行」） | P15・決定242／243 | 未着手（docs 1 行×2） |
| M3 | Regression Gate G1〜G19 を Production `538a3ef` で 1 回通し、Known Issues 一覧を確定 | Primary Fun の保護（determinism／save／intent） | `FINAL_PRACTICAL_QA_COMMERCIAL_RC_PREFLIGHT.md` §2・既存 Gate の再利用のみ | 未着手（1 browser 直列・RAM に注意） |
| M4 | CEO Final Practical QA（S1 Entrance＋One Battle／S2 Another Battle＋Progression／S3 翌日の Daily）→ Triage → Exit Criteria | Primary Fun・Loop | 同 §1・§3・§4 | CEO 実施（M3 の後） |

### 3-2. SHOULD BEFORE COMMERCIAL RC（小型・Fast Gate 型・Human QA 省略可）

| # | 内容 | 軸 | 規模 |
|---|---|---|---|
| S1 | MATERIAL 残：fixed バナー 3 枚の書体・絵文字→既存 SVG／pill 2 種の名札材質化 | presentation | CSS＋TSX 数十行・`src/core` 0 |
| S2 | RETURN TO CALM：敗北→結果の 1 拍（結果画面の戦闘 BGM 即再開・ジングル前の即停止に 150〜300ms のラップ） | presentation（音） | `bgm.ts` 数行（決定257 の経路を再利用） |
| S3 | D254 Known #5：JS 予約の `performance.now()` 基準 1 行（CEO が「修正しない」を解除した場合のみ） | cleanup | 1 行 |
| S4 | 作業環境の衛生：`git worktree prune`＋不要 worktree の一覧提示（削除は CEO 確認）・main worktree の docs を master と突き合わせ（決定213 runtime は branch に残す）・決定210／211 の番号整理 | cleanup（M3 を clean 環境で回すため） | docs／git 操作のみ |

### 3-3. POST-RC / GROWTH

- Home の動き（04・決定254 C1「Home 側の第 2 段」）
- 「答えの可視化」（結果画面に 盾／弱体／回復／一撃 のどれで解いたか・神階で組み合わせが要ることを 1 行）＝決定255 の発見の presentation 化
- SP 空き帯・OTOMO の存在感・敵カットインの向き（Brief v1.1 と同時）
- Daily 神間 spread の是正（決定259 の残り。TRIGGER と RAM 枠が揃ってから）
- Ranking（READY-DORMANT・D1〜D7）
- NEXT_MILESTONES の残 cleanup（`otomo.defId` guard・`deckPreference` 版方針・GitHub Actions・`.vercelignore`）

### 3-4. BLOCKED / NEEDS CEO

| 項目 | 何を決めるか | AI 推奨【AI 判断】 |
|---|---|---|
| 敵 7 体アート | 生成するか・サービス・費用（§6-3 #5／#6） | Brief v1.1（PARALLEL PREP）を読んでから判断。RC の条件にはしない |
| God Strike Voice | 権利・生成方式・費用 | 保留のまま（決定257 の duck 経路が受け皿） |
| 決定259 の再開 | RAM ≥700MB・約 2 時間の枠を取るか | Ranking TRIGGER が出るまで DEFER |
| D254 Known #5 | 「修正しない」の解除 | S3 として解除可（1 行・Fast Gate） |

---

## 4. NEXT の 4 件（各 1 件）

| 枠 | 内容 | 条件 |
|---|---|---|
| **NEXT NOW** | **Commercial RC Pre-Gate＝M2＋M3**（台帳 2 行＋Regression Gate G1〜G19 を Production で 1 回＋Known Issues 一覧確定） | **決定257 CLOSED 後に開始**。docs＋evidence・runtime 0・1 browser／1 run 直列 |
| **NEXT AFTER** | **S1＋S2 hotfix 束**（MATERIAL 残・RETURN TO CALM） | Fast Gate 型・`src/core` 0・CEO GO 後 |
| **PARALLEL PREP** | **Enemy Art Brief v1.1**（Lane 3 の改訂 8 点を docs で確定。生成はしない） | docs-only・CEO 判断不要 |
| **DEFER** | **決定259 Daily 神間 spread の残り simulation** | Ranking TRIGGER 到達・RAM 枠確保まで |

---

## 5. 実装しなかったこと・runtime 変更 0 の証明
- ブラウザ・Playwright・vitest・build・simulation・server・画像／音声生成・H3／fal.ai・費用・Production 操作・push：**0**
- 決定257 Release lane（`SevenGodsGame-d257-rc`・`release/d257-sound-layer-rc`・master）：未接触
- worktree `C:/Users/kimi1/SevenGodsGame-rwa`・branch `docs/post-d257-remaining-work-audit`（`538a3ef` 起点）：`git status --porcelain` は本書 1 ファイルのみ・`git diff --stat 538a3ef -- src public package.json` 0（§5 実行ログ）

### §5 実行ログ
- 実行：2026-10-02（worktree `C:/Users/kimi1/SevenGodsGame-rwa`・branch `docs/post-d257-remaining-work-audit`・HEAD `538a3ef`）
- `git status --porcelain`：`?? docs/POST_D257_REMAINING_WORK_AUDIT.md` の 1 行のみ／`git diff --stat 538a3ef -- src public package.json`：0 行
- ブラウザ・vitest・build・simulation・server・生成・push・Production 操作：0。決定257 Release lane：未接触
