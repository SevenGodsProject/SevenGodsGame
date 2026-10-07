# Daily Retention Loop Preflight — 「明日も SEVEN GODS を開きたくなる最大の理由」

| 項目 | 値 |
|---|---|
| 日付 | 2026-10-07 |
| 種別 | **PREFLIGHT ONLY／docs-only**（本書 1 ファイルのみ作成） |
| 判断主体 | **AI 判断**（CLAUDE.md §6-2：複数案からの推奨案選定・実装順序） |
| baseline | master `641ea5c`（Production）・worktree `SevenGodsGame-integ` |
| runtime 変更 | **0**（`src`／`public`／`scripts`／build／vitest／browser／simulation すべて 0） |
| Decision 番号 | **追加なし**（候補採用時に PM が採番） |
| 製品目標（CEO brief） | 「プレイヤーが毎日遊びに来たくなる理由を作る」＝ログインではなく **Primary Fun「解く」を毎日味わいたくなる**こと |
| 仮説ループ | SOLVE → IMPROVE → COMPARE → COLLECT → RETURN |

---

## §0 結論

1. **Root Cause（1 件）**：現在の Daily は「今日の条件（敵・Seed・×1.25/×1.15）」は全員共通で成立しているが、**「今日の問い」に対する verdict（解けた／未解）と、3 回の挑戦が『読む→組む→決まる』の進歩として繋がる形が無い**。結果画面は点差だけ（`nextGoal.ts:114` D2「今日のベストまであと N 点」）、3 回目消費後は「次の敵まで HH:MM」（`nextGoal.ts:103` D1）で閉じる。だから明日は「新しい問い」ではなく「別の強化ボス」にしか見えない。
2. **推奨（1 案）**：**候補 1「今日の神託（Daily Puzzle）」を採用し、候補 2 の自己比較をその Result 行として同梱する**（合算 84/100）。新モード 0・新 storage 0・`DAILY_VERSION=1` 据え置き・`src/core` 0 で Pilot 可能。
3. **候補 3 Cosmetic 神籤は Phase C（GROWTH）へ送る**。P7「新図鑑・新通貨を作らない」との整合に設計制約が要り、P10 の state contract と RL-01 Save Compatibility Guard が前提。
4. **Roadmap 不変**：v1.0 critical path（D263 → Public Face → Release Safety → Practical QA → v1.0.0）には触れない。Phase A は **POST RELEASE**、Phase B／C は **GROWTH**。

---

## §1 CURRENT DAILY（事実）

| 項目 | 現状 | 根拠 |
|---|---|---|
| 回数 | 3 回／日・**開始時消費**（途中放棄も 1 回） | `rules.ts:211`・`dailyStorage.ts:120-129` |
| Seed | `daily-${dateKey}-${enemyId}`・表示用 seedId 6 桁・全員共通 | `dailyBoss.ts:84-89` |
| 敵 | 週次シャッフル巡回（週キー＝月曜、7 体が週 1 回ずつ） | `dailyBoss.ts:69-71, 86` |
| 難易度 | normal 固定・modifier HP×1.25／ATK×1.15・スコア倍率 **DROP**（farm 化防止） | `rules.ts:204-206, 212` |
| reset | JST 00:00（`timezoneOffsetMinutes: 540`） | `rules.ts:210`・`dailyBoss.ts:42-45` |
| Score／Records | `sevengods.daily` version 1・`results[]{godId,score,status,round,at}`・bestScore／bestGodId／bestByGod・30 日保持・通常戦績と完全分離 | `dailyStorage.ts:21-45, 81-88, 144-163` |
| version 不一致 | **無言初期化**（`parsed.version !== DAILY_VERSION` → 空） | `dailyStorage.ts:63-65`（RL-01） |
| Result 表示 | BEST 軸（更新／あと N 点／同点）＋前回軸（前回→今回の差） | `dailyDiff.ts:11-12`・`GameOverOverlay.tsx:322-330` |
| 次の目標 | D1「今日の挑戦は終了。次の敵まで HH:MM」／D2「今日のベストまであと N 点（残り n 回）」 | `nextGoal.ts:103, 114, 116` |
| Reward | **なし**（決定121・Phase7 Audit §10「なしのまま」）。決定267 の 3 役報酬は通常戦のみ | `PHASE7_RETURN_LOOP_COMMERCIAL_AUDIT.md:195`・`useGameEngine.ts:101-105` |
| God 選択 | 自由（神別ベストを表示） | `DailyChallengeScreen.tsx:43-49, 122` |
| 敵の「型」 | typeLabel（遅咲き型 等）は Daily 画面・Home に表示済み | `DailyChallengeScreen.tsx:70`・`HomeTodayPanel.tsx:88` |
| Replay 動機 | 「もう一度挑戦（残り N 回）」＋点差。**何を変えたか／何回で決めたかは出ない** | `nextGoal.ts:114`・Phase7 §10「本質の説明が無い」 |
| 翌日 | countdown のみ。翌日の敵・型の予告は無し（RP-06 Daily Tease は HYP のまま） | `HomeTodayPanel.tsx:114`・`MASTER_BACKLOG_AUDIT.md:160` |
| 競争 | Ranking READY-DORMANT（G1 神間 spread 13.82% FAIL・決定256／259） | `DAILY_COMPETITIVE_GATE_REJUDGMENT.md` §0 |
| Stakes | Daily では神階・報酬ボーナス無効（公平性） | `useGameEngine.ts:52, 101-105` |

---

## §2 ROOT CAUSE

### 採用（1 件）
**「今日の問い」に verdict が無く、3 回が『読む→組む→決まる』として繋がっていない。**
- Primary Fun「解く」は離散的な「決まった」瞬間を要する（`DECISION203_SOLVE_LEGIBILITY_AUDIT.md:17,27`）。Daily の UI は連続量（score）だけで閉じる。`status`／`round` は保存済み（`dailyStorage.ts:24-32`）なのに表示に使われない。
- 1 回目〜3 回目に役割が無い（`attemptsUsed` は残数表示のみ）。「2 回目で何を変えたか」を語る面が無い。
- 3 回目の後の RETURN 導線は「HH:MM」のみ。明日の問いが見えない。

### 却下した Root Cause
| 候補 | 却下理由 |
|---|---|
| 報酬が無い | 決定121・Phase7 §10 で「なしのまま」が確定。farm 化・P14 と衝突。報酬で来る人は「解く」ために来ない |
| 難易度が固定で飽きる | 週 7 体巡回＋Seed 日替わりで条件は毎日変わる。問題は「変わっているのに問いとして見えない」こと |
| 神間 spread（13.82%） | Ranking の公平性課題であり、一人で解く価値を直接は毀損しない（RP-05 は GROWTH で継続） |
| 3 回が少ない | best-of-3＝best-of-6（決定256 再判定）。回数増は farm 化のみ |
| Ranking が無い | P9「Self Before Others」。他者比較は自己比較が成立した後 |

---

## §3 CANDIDATES 100 点比較

配点：Primary Fun 30／Daily Retention 25／Replayability 15／Ranking 接続 10／Collection 5／実装 Cost 5／運営 Cost 5／Commercial 整合 5。

| 軸 | C1 今日の神託 | C2 Daily 比較 | C3 Cosmetic 神籤 | **C1＋C2 合算** |
|---|---|---|---|---|
| Primary Fun 30 | 26 | 15 | 6 | **27** |
| Daily Retention 25 | 19 | 15 | 14 | **21** |
| Replayability 15 | 12 | 11 | 4 | **13** |
| Ranking 接続 10 | 7 | 9 | 2 | **8** |
| Collection 5 | 1 | 1 | 5 | **1** |
| 実装 Cost 5 | 4 | 4 | 2 | **4** |
| 運営 Cost 5 | 5 | 5 | 3 | **5** |
| Commercial 整合 5 | 5 | 5 | 3 | **5** |
| **合計** | **79** | **65** | **39** | **84** |

### 根拠
- **C1 今日の神託**：既存 Daily（共通 Seed・typeLabel・results[]）を最大流用し「問い→答え→verdict」に言い換えるだけで「解く」を Daily に直結（Fun 26）。1=読む／2=組む／3=決める のラベルで 3 回に意味が生まれる（Replay 12）。Retention は「明日の問い」予告（RP-06・`weeklyBossOrder` は決定論なので翌日の型は純関数で算出可 `dailyBoss.ts:69`）で 19。Collection は無い。Cost は表示層のみ（4）。P6「Daily semantics を変えない」P8「Daily が心臓」整合（5）。
- **C2 Daily 比較**：自己比較は `dailyDiff.ts` に半分実装済みで、残りは「撃破 R の差」「昨日比」。Ranking への拡張点として最良（9）だが、単独では点差の精緻化に留まり「解く」へは間接（15）。
- **C3 Cosmetic 神籤**：Collection 5 だが「解く」に寄与しない（6）。P7「新図鑑・新通貨・新 Build 系を作らない」（`SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md:39`）と整合させる設計制約が必要（Commercial 3）。新 storage＝P10 contract＋RL-01 前提（Cost 2）。素材の運営負荷（3）。
- **合算**：C1 の verdict 行と C2 の自己比較行は同じ Result 面に乗るため実装は重複せず、Retention／Ranking 接続が相互補完する。

**決定：「明日も開きたくなる最大の理由」＝「今日の問いを解けたか、明日は何の問いか」。**

---

## §4 RECOMMENDATION（1 案）

**「今日の神託」＝既存 Daily の言い換え Pilot（C1）＋自己比較 Result 行（C2 の pre-Ranking 部分）。** 新モード・新 storage・新報酬は作らない。Ranking（Phase B）と神籤（Phase C）は Phase A が残す hook の上に段階接続する。

---

## §5 PHASE A — 最小 Pilot（既存 Daily のみ）

### 変更内容（表示層のみ・`src/core` 0）
| # | 変更 | ファイル | 備考 |
|---|---|---|---|
| A1 | Daily 画面に「今日の問い」1 行：`【遅咲き型】蒼海の龍神を 7R 以内に決める`（typeLabel＋敵名） | `DailyChallengeScreen.tsx:70` 付近 | 既存 `def.typeLabel` 流用 |
| A2 | 挑戦ラベル：1 回目「読む」／2 回目「組む」／3 回目「決める」（残数表示に併記） | `DailyChallengeScreen.tsx:98,148` | `attemptsUsed` から純算出 |
| A3 | verdict 行：`解けた（R{round} 撃破）`／`未解（7R 未撃破）`／`未解（敗北 R{round}）`。results[] の `status`／`round` を読むだけ | `dailyDiff.ts`（純関数追加）・`GameOverOverlay.tsx:322-330` | 新保存 0 |
| A4 | D2 文言に撃破 R 差を併記：「ベストまであと N 点・前回 R5 → 今回 R4」 | `nextGoal.ts:114`・`dailyDiff.ts` | round は保存済み |
| A5 | D1（3 回終了）を「今日の神託：解けた／未解。明日の問いは【溜め型】」へ。翌日の typeLabel のみ（Seed・敵名は出さない＝RP-06） | `nextGoal.ts:103`・`HomeTodayPanel.tsx:114` | `dailyBossFor(翌日キー)` は hooks 層で算出（`dailyClock.ts` 隣接）。`src/core` 変更不要 |
| A6 | Home に「今日の神託：未着手／読む済／解けた」1 行 | `HomeTodayPanel.tsx:98-100` | 既存 `day.bestScore` 隣 |

### state／storage への影響
- **`sevengods.daily` version 1 据え置き・フィールド追加 0**。すべて `results[]` と `attemptsUsed` から導出。
- RL-01（非 battleSave storage は version 不一致で無言初期化 `dailyStorage.ts:63-65`）に **抵触しない**。「何を変えたか」のメモ保存など新フィールドは **Phase A では禁止**（RL-01 完了後の Phase B 以降）。
- `saveVersion 9` 不変・`gameVersion` 不変・engine 不参照。

### Human QA（≤3 問・CEO）
1. Daily 画面を開いて 5 秒以内に「今日の問い」を言えたか。
2. 2 回目を始める前に「何を変えるか」を自分で決めたか（読む→組む）。
3. 3 回終えた画面の「明日の問いは【型】」を見て、明日開く気になったか。

### 自動 Gate
- `tsc`・`oxlint`・vitest（`dailyDiff`／`nextGoal`／翌日 typeLabel 純関数のテスト追加）。
- `ranking-absence.mjs` 17 項目 PASS（Ranking 文言を持ち込まない）。
- `git diff --stat -- src/core` **0 行**・`src/hooks/dailyStorage.ts` **0 行**。
- Daily smoke（Normal／Daily 3 回／続きから）。

### Rollback
- commit 1 個の revert。storage 形式不変のため **データ損失 0**・Production 影響は表示文言のみ。

---

## §6 PHASE B — Ranking 接続（whole merge 禁止）

### Phase A が残す hook
- verdict／attempt ラベル／比較行はすべて **`DailyDay` だけを引数にする純関数**にし、`others?: { rank; percentile; sample } | null` を受けられる型で定義する（Phase A では常に `null`）。
- Result の比較行は「自己（今回／前回／BEST）」を上、「他者」を下の **固定順**（P9）で枠だけ確保。
- `DailyResult` 行は既にランキング送信ペイロード（`dailyStorage.ts:13-15`）。追加フィールド無し。

### Phase B で持ち込む純部品のみ
- `src/core/replay/ranking.ts`（同順位 1,1,3）・`src/core/identity.ts`（Web Crypto）。UI 5 ファイルは REBUILD（RK-02）。
- 前提：TRIGGER（Daily 常連 evidence）・RP-05 神間 spread 是正・B1〜B4・identity／privacy ★ §6-3 #7。
- 「順位・percentile・friends」は verdict と同じ面に **1 行追加**するだけで済む設計にする。

---

## §7 PHASE C — Cosmetic 神籤（設計制約）

- **解禁条件**：当日「今日の神託」を 1 回プレイ（開始消費）で 1 回／日。未プレイ日は引けないが **罰も繰り越しも無い**。
- **絶対条件**：HP／攻撃／AP／カード性能／託宣性能／スコア／再挑戦／Ranking への影響 **0**。表示層（`Presentation は state を作らず結果を変えない` P10）のみ。
- **P7 整合**：「新図鑑」にしない。既存 4 軸（49 攻略・絆・自己ベスト・神階）の **外装**（称号・勝利演出・カード枠・神／OTOMO 外装）に限定。重複→通貨変換・天井・pity を **作らない**。
- **前提**：新 storage（`sevengods.omikuji` 等）は P10 contract（Owner／Default／Migration／Invalid）を先に書き、RL-01 Guard 完了後。素材は `ASSET_RIGHTS_LEDGER.md` 台帳必須。
- **作らないもの**：有料ガチャ／回数販売／強化・性能付き外装／期間限定 FOMO／ログイン日数条件。

---

## §8 DO NOT BUILD

| 項目 | 理由 |
|---|---|
| 懲罰的 login streak・欠席ペナルティ | P8「Return Without Obligation」。欠席罰なし（P6） |
| スタミナ／エネルギー／待ち時間 | P8。Daily 3 回は上限であって燃料ではない |
| 強カード／強 God ガチャ・Power 付き外装 | P7 Power Inflation 拒否・P14 |
| retry 販売・Daily 回数販売・Pay-to-Solve | P14。best-of-3＝best-of-6 で回数増は価値 0（決定256） |
| 大量 currency・duplicates 変換 | P7「新通貨を作らない」 |
| 強制的な日課（デイリーミッション 5 件等） | 「解く」以外の作業は Curiosity／Mastery を薄める |
| Daily のスコア倍率復活 | 決定121・`rules.ts:205` DROP 済み |
| 正解カード／推奨手の表示 | D262 NO-GO・North Star 衝突 |
| 回数 4 回以上・late-round 延長 | Late-Round × Enemy Identity 統合 Preflight NO-GO（2026-10-07・CEO 受容・恒久方針「7R は上限」。決定256 は Daily Competitive Gate で別件） |
| Ranking branch whole merge | RK-02・`ranking-absence` Gate FAIL |
| 候補 3 の Phase A 同時実装 | 新 storage＝RL-01 前提・P7 制約未設計 |
| 翌日 Seed／敵名の予告 | RP-06「型のみ」。solver 先読み（RK-06）を助長しない |

設計軸は **Curiosity（明日の問いは何か）／Mastery（今日の問いを解けたか）／Collection（Phase C・外装のみ）**。FOMO は使わない。

---

## §9 ROADMAP IMPACT（`ROADMAP_TO_RELEASE.md` の一本道は不変）

| Phase | 置き場所 | 理由 |
|---|---|---|
| **Phase A 今日の神託** | **§5 POST RELEASE**（RP-01／RP-06 と同列・Fast Gate 型・Human QA 3 問） | runtime 変更は D263 クローズ後（§1 ルール）。storage 0 のため RL-01 の完了を待たないが、v1.0 critical path（Public Face／A11y／RL-01／CI）には割り込まない。RP-06 Daily Tease は A5 に吸収 |
| **Phase B Ranking 接続** | **§6 GROWTH #2**（TRIGGER 後） | RP-05 神間 spread 是正が前提・★ identity／privacy |
| **Phase C Cosmetic 神籤** | **§6 GROWTH**（Phase B の evidence 後・CEO 課金判断 ★ とは独立） | P7／P10／RL-01 前提・素材台帳 |
| v1.0 前 | **なし**（本書は docs-only） | D263 継続・critical path 不変 |

`MASTER_BACKLOG_AUDIT.md` §3-6 へは「RP-07 今日の神託（Phase A）」として追記候補（本書では未追記）。

---

## §10 runtime 変更 0 の証明

- 本書 `docs/DAILY_RETENTION_LOOP_PREFLIGHT.md` **1 ファイルのみ作成**。他ファイルの Write／Edit 0。
- `src`／`public`／`scripts`／`package.json` 変更 0・commit 0・push 0・branch 操作 0。
- build／vitest／browser／simulation 実行 0（6GB RAM 配慮）。
- 参照 worktree は `SevenGodsGame-integ` のみ。`SevenGodsGame`（stale）・`SevenGodsGame-d263-pilot`（Pilot lane）には触れていない。
- 確認コマンド（CEO／PM 用・未実行）：`git -C C:\Users\kimi1\SevenGodsGame-integ status --short` → `?? docs/DAILY_RETENTION_LOOP_PREFLIGHT.md` のみ。
