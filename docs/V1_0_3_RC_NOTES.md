> **状態（2026-10-22・Lane 3 Dev・branch `release/v1_0_3-rc`・AI 判断）：CEO 指示「v1.0.3 RC の追加実装 2 点＋小 2 点」を 1343024 の上に **3 commit で実装済み**（`229a8ac` 敗北画面の事実行／`55bbd0b` RETURN TO CALM 小＋SP 手札本文 9.5px／本書＋Playwright スクリプト）。すべて display-only：`src/core` 差分 0・engine／seed／score／save／`gameVersion` 0・`rules.ts` 0・`docs/DECISIONS.md` 編集 0。変更ファイル限定 vitest **9 ファイル 93/93 PASS**・`tsc -b --noEmit` PASS・oxlint 新規 0（既存警告 1 は master 由来）。full vitest／build／preview／Playwright 実行／push は**していない**（PM 直列）。CEO 判断 新規 0 件（v1.0.3 Production 公開承認のみ）。**

# v1.0.3 RC Notes — 敗北画面の事実行 ＋ 敗北 RETURN TO CALM（小）＋ SP 手札本文 9.5px

- CEO 指示：2026-10-22「v1.0.3 RC 追加実装」（Lane 6 TOP1・Lane 7 §15 #1 の小・Lane 5 予備 #6・Lane 8 §4 案 F）
- 入力（読み取りのみ）：Lane 6 `FUN_BALANCE_AUDIT_V1.md` §7 #1／Lane 7 `COMBAT_PREMIUM_AUDIT_V2.md` §15 #1・§17／Lane 5 `docs/NEXT_QUALITY_IMPROVEMENT_PLAN_V1.md` 予備 #6／Lane 8 `MOBILE_UX_AUDIT_V1.md` §4（scratchpad）
- 守った禁止事項：`src/core` 変更／`gameVersion`・save・rules 変更／`DECISIONS.md` 編集／他 worktree 編集／機能の追加混入／`git push`・merge・tag・deploy・ファイル削除・`git add .`／full vitest・build・preview・Playwright 実行：いずれも**行っていない**

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| **① 敗北画面の事実行（Lane 6 TOP1）** | **実装済み**（`229a8ac`）。敗北時の「敗因：」枠の中に 1 行「**必殺260を加護（予告の50%のブロック）で受けていれば残HP110**」を追加（例）。「敵の残り HP Y／あと一歩だった！」は**既存**（`game-over-enemy-hp`・STEP-UX6-B）のため**重複させず**、不足していた「残 HP X」だけを足した。計算は表示層の純関数 `defeatFacts.ts`（新規）＋テスト 9 件（うち 1 件は **engine replay で X の一致を検証**：同じ seed で決着 R に加護を使って受け直すと残 HP が X になる） |
| **② 敗北 RETURN TO CALM（小）** | **実装済み**（`55bbd0b`）。`planResultGate` の `+120` → **`+200`**（`enemyVfxTiming.ts` に `RESULT_GATE_AFTER_HP_MS = 200`・BF-03 の 150〜300ms 帯の中央）。結果画面 BGM 再開のラップは**既存**（決定257：ジングル終了後 `jingleResumeFadeMs` 400ms で 0→1.0 fade-in）のため追加変更 0。K25（ジングル前の BGM 即停止）は Lane 7 §15 #1 の `fadeOutBgm`＋`defeatPhase` 3 状態＋暗転＝**次期**（今回は入れない） |
| **③ SP 手札本文 9px → 9.5px** | **実装済み**（`55bbd0b`）。`battle.css` の `@media (max-width: 899px)` 本体（158px 札）の `.card-view-text` を **9.5px** に。**140px 札**（`and (max-height: 720px)`・SP375×667 など）は Lane 8 案 F のとおり **9px 据え置き**（別 media block 1 つ・決定238 のテスト `cardGodLabelLowscreen.test.ts`「規則 3 つ」は不変）。条件行 `.card-view-bonus` 9px・PC 9.5px 不変 |
| **④ 実機表示確認の準備** | `scripts/v1_0_3-rc/sp-text-check.mjs` 新規（PC 1508×660／SP 375×667／SP 390×844）。デッキ編成画面の全カードと戦闘の手札 5 枚で `scrollHeight <= clientHeight`・`scrollWidth <= clientWidth`・computed font-size を記録、スクリーンショット保存。**実行は PM 直列**（§4） |
| **テスト・監査** | vitest（変更ファイル限定・9 ファイル）**93/93 PASS**／`tsc -b --noEmit` PASS／oxlint 変更 8 ファイル 新規 0／`git diff 1343024 -- src/core` **0** |
| **CEO 判断** | 新規 0 件（内容は CLAUDE.md §6-2 軽微 UI・演出調整）。v1.0.3 Production 公開承認は RC Gate 側 |

---

## 1. 変更ファイル（runtime 5・test 3・script 1・docs 1）

| ファイル | 変更 | commit |
|---|---|---|
| `src/components/battle/defeatFacts.ts` | **新規**（108 行）：`deriveDefeatGuardFact(log, state)`・`describeDefeatGuardFact(fact)` | `229a8ac` |
| `src/components/battle/defeatFacts.test.ts` | **新規** 9 件 | `229a8ac` |
| `src/components/battle/GameOverOverlay.tsx` | `defeatFact` prop 追加・敗因枠の中に `<span className="game-over-defeat-fact" data-testid="defeat-fact">` 1 行（CSS 追加 0） | `229a8ac` |
| `src/components/battle/BattleScreen.tsx` | `defeatFact={state.status === 'lost' ? deriveDefeatGuardFact(log, state) : null}`（import +1） | `229a8ac` |
| `src/components/battle/enemyVfxTiming.ts` | `RESULT_GATE_AFTER_HP_MS = 200` 追加 | `55bbd0b` |
| `src/components/battle/combatTimeline.ts` | `planResultGate`：`+ 120` → `+ RESULT_GATE_AFTER_HP_MS` | `55bbd0b` |
| `src/components/battle/combatTimeline.test.ts` | +1 件（200ms・150〜300 帯内・勝利経路 `planVictory` 独立・anchor 無し 0） | `55bbd0b` |
| `src/components/battle/battle.css` | `:5638` `.card-view-text` 9px→9.5px（コメント付き）／`(max-width:899px) and (max-height:720px)` の**別 block** で 9px 据え置き（+6 行） | `55bbd0b` |
| `src/components/battle/spHandTextSize.test.ts` | **新規** 3 件（158px 側 9.5px 1 回・140px 側 9px・条件行／PC 不変） | `55bbd0b` |
| `scripts/v1_0_3-rc/sp-text-check.mjs` | **新規**（Playwright・未実行） | 本 commit |
| `docs/V1_0_3_RC_NOTES.md` | 本書 | 本 commit |

`src/core` 差分 0（`git diff 1343024 -- src/core` 空）。`gameVersion.ts`・save・`rules.ts` 変更 0。

---

## 2. 文言の前後（敗北時の結果画面）

### 2-1. Before（v1.0.2）

```
敗北
敵の残りHP 120 / 1200　（残り ≤10% なら「あと一歩だった！」）
・予告された攻撃3回のうち、無傷で受け切った攻撃はありませんでした（盾で防いだ量 0）
・R4：260の大技に対し、盾は0でした。加護や防御札で予告ぶんの盾を用意すると受け切れます
敗因：R4：蒼海の龍神の「龍の咆哮」で 260 ダメージ
```

### 2-2. After（v1.0.3 RC）— 敗因枠に 1 行追加（それ以外は不変）

```
敗因：R4：蒼海の龍神の「龍の咆哮」で 260 ダメージ
　　　必殺260を加護（予告の50%のブロック）で受けていれば残HP110   ← 追加（31 字）
```

- 文言テンプレート：`{必殺|連撃|攻撃}{N}を加護（予告の{guardRatio×100}%のブロック）で受けていれば残HP{X}`（N・X は ×10 表示値・`formatScaled`）。最長でも 40 字以内（テストで固定：4 桁×2 でも 39 字）
- SP375 の敗因枠（内幅 ≈ 300px・13px）で **2 行**に折り返す（31 字 × 13px ≈ 403px）。PC は 1 行
- 「予告の50%」は `RULES.divination.guardRatio` から表示（加護の託宣の説明文「敵の予告の50%ぶんブロックを得る」と同じ比率・数値の直書き 0）

### 2-3. 出す条件／出さない条件（決定263 Closeout の境界）

| 出す | 出さない（null） |
|---|---|
| 敗北（`lost`）で、決定打が敵の攻撃（attack／special／multiAttack）、ログが `GAME_STARTED` から揃っていて HP の復元が終了時の HP と一致、その R に加護を**使っていない**、加護込みで残 HP **1 以上** | 勝利・未撃破／「続きから」でログが途中から／自傷・溜め／その R に加護を使用済み（「使っていれば」が成り立たない）／加護だけでは残 HP 0（「加護でも無理」と読まれ次の行動を変えないため）／`guardIgnoresBlockEfficiency` が false の設定（engine の係数が要るため主張しない） |

計算：盾は通った分がある時点で使い切られているので「盾の総量＝吸収量」。加護 `G = max(guardMin, floor(予告 × guardRatio))` を足した盾で同じ連撃を順に受けると吸収は `min(盾, 合計)` → `残HP = 決着直前HP − max(0, 合計 − (吸収 + G))`。engine replay テスト（4 敵 × 3 seed・手を出さず敗北した対局）で **X ＝ 実際の残 HP** を確認済み。

### 2-4. RETURN TO CALM（小）の時刻

| 項目 | Before | After |
|---|---|---|
| 結果画面 mount ＋ `sfx.defeat()` ＋ `playJingle('defeat')` | 最後の着弾の表示 HP 変化の終わり **+120ms** | **+200ms** |
| 安全弁 | `+1,500`（`PRESENTATION_SAFETY_MS`） | 不変 |
| 勝利経路（`planVictory`） | — | 不変（テストで独立を固定） |
| BGM | ジングル前に `bg.pause()`（即停止・K25）→ ジングル後に 400ms fade-in で再開（決定257） | **不変**（再開ラップは既存。即停止側の `fadeOutBgm` は Lane 7 §15 #1＝次期） |

### 2-5. SP 手札本文の実効値

| viewport | 札の高さ | 本文 Before | 本文 After | 条件行 |
|---|---|---|---|---|
| PC ≥900px | 158px | 9.5px | 9.5px（不変） | 9px |
| SP ≤899px・高さ ≥721px（390×844 など） | 158px | **9px** | **9.5px** | 9px |
| SP ≤899px・高さ ≤720px（375×667 など） | 140px | 9px | 9px（据え置き・Lane 8 案 F） | 9px |

---

## 3. テスト・監査（本 Lane で実行したもの）

| 種別 | 対象 | 結果 |
|---|---|---|
| vitest（変更ファイル限定） | `defeatFacts`（9）・`combatTimeline`・`spHandTextSize`（3）・`cardGodLabelLowscreen`・`defeatCause`・`battleRecap`・`dockControls`・`matchupWiring`・`resultTransitions` | **9 files・93/93 PASS** |
| `npx tsc -b --noEmit` | 1 回 | **PASS**（exit 0） |
| oxlint | 変更 8 ファイル | 新規 0（`BattleScreen.tsx:276` の exhaustive-deps 警告は master 由来・本変更の行ではない） |
| `node --check` | `scripts/v1_0_3-rc/sp-text-check.mjs` | 構文 OK（**実行はしていない**） |
| `src/core` 差分 | `git diff 1343024 -- src/core` | 0 |

---

## 4. Fast Gate 項目（PM 直列・本 Lane では未実行）

| # | 項目 | 合格値 | 手順 |
|---|---|---|---|
| F1 | full vitest | PASS・0 fail（v1.0.2 の 1,504 ＋ 本 Lane +13 件） | `npx vitest run` |
| F2 | build | OK・`src/core` 由来の chunk 変化 0・`getGameVersion()` 不変 | `npx vite build`＋invariants golden |
| F3 | SP 手札本文（実機 DOM） | `sp-text-check.mjs` **全 PASS**：デッキ編成全カード overflow 0／手札 5 枚 overflow 0／本文 font-size PC 9.5・SP375×667 9・SP390×844 9.5／条件行 9／横スク 0／JS error 0 | preview を立てて `node scripts/v1_0_3-rc/sp-text-check.mjs docs/evidence/v1_0_3-rc/sp-text/result.json http://localhost:<port>` |
| F4 | 敗北画面の事実行（実機） | 敗北 seed（例：手を出さず龍神に R4 で敗北）で `[data-testid="defeat-fact"]` が敗因枠内に 1 行・SP375 で 2 行以内・既存「敵の残りHP」行と重複なし | 既存 probe（`08-probe` 型）の敗北 seed、または手動 1 戦 |
| F5 | RETURN TO CALM（実機） | 結果 mount ＝ 最後の着弾の表示 HP 終了 **+200 ±50ms**／勝利の時刻列 Before と同一（決定232 METRIC LOCK 不一致 0） | 既存 Gate スクリプト（`lane2-combat-feel-v2/probe.mjs` 系）の敗北 run |
| F6 | 回帰 | 決定238 の `cardGodLabelLowscreen` PASS（本 Lane で確認済み）・`fxOffViewport` SP375 ≤2 | 既存 |

---

## 5. CEO 目視 3 分の項目（Human QA・YES／NO）

| # | 見るもの | 期待 | 所要 |
|---|---|---|---|
| H1 | **敗北画面**（iPhone）：手を出さずに「ラウンドを終える」を押し続けて蒼海の龍神（または怨霊）に負ける | 敗因の赤枠の中に「必殺◯◯を加護（予告の50%のブロック）で受けていれば残HP◯◯」が **2 行以内**で読める。「正解を教えられている」感じが**しない**（事後の事実として読める） | 1 分 |
| H2 | **負けた瞬間の間**：同じ敗北で、最後の一撃 → 結果画面が出るまで | 「一拍置いてから結果が出た」と感じる・待たされたとは感じない（+80ms の差。気にならなければ OK） | 30 秒 |
| H3 | **手札の本文**（iPhone 縦・390×844 相当の機種）：戦闘開始直後の手札 5 枚 | 本文がわずかに読みやすい・はみ出し／切れ 0。375×667 相当（SE 系）では変化なし | 1 分 |

NO があれば自動調整せず停止し、調整案 1 つを提示する：H1 → 文言を「加護なら残HP◯◯」へ短縮／H2 → 200→160／H3 → 9.5→9.25。

---

## 6. 残課題・次期

- **Lane 7 §15 #1 の本体**（`defeatPhase: 'none'|'calm'|'done'`・`defeat-calm` 暗転 0.2s・`fadeOutBgm(180ms)`・`DEFEAT_CALM_MS = 240`・tap／Enter／Esc skip）は**今回入れていない**（CEO 指示どおり次期）。本 Lane の `RESULT_GATE_AFTER_HP_MS` は §17 M2「`planResultGate` の値が Before と同一」の **Before が 200 に更新された**ことを次期の Preflight に明記すること
- `sp-text-check.mjs` の実行と証跡（`docs/evidence/v1_0_3-rc/sp-text/`）は PM 直列。デッキ編成画面の DOM は `.deck-builder-card`（本文 12px）・戦闘は `.hand .card-view`（本文 `.card-view-text`）
- 敗北の事実行は「加護だけでは残 HP 0」のとき出さない設計。実プレイで「出ない敗北」が多いと感じた場合は、Lane 6 §2-2（ブロック 0 68%・敵 ≤25% で敗北 84%）の集計と突き合わせてから検討（文言の追加は決定263 の境界を再確認してから）
