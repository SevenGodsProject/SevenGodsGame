# Lane 5 — 継続率・やり込み改善 統合計画 v1（RETENTION_INTEGRATION_PLAN_V1）

> **状態（2026-10-22・Lane 5「継続率・やり込み改善」・Planner・完全 READ-ONLY・AI 判断（CLAUDE.md §6-2）・リポジトリ外スクラッチ）**：Lane 6（Fun & Balance）・Lane 7（Combat Premium v2）・Lane 8（Mobile UX）・Lane 9（Retention Design）の 4 監査と、v1.0.3 RC（`C:\Users\kimi1\SevenGodsGame-lane3` `release/v1_0_3-rc` HEAD `1343024`）のコードを読むだけで、①提案を 1 表に統合（§2）、②v1.0.4 候補「Retention 束 v1」を設計（§3）、③評価方法（§4）、④CEO 判断の要否（§5）をまとめた。**コード・素材・リポジトリ内文書の変更 0・commit／push／merge／deploy 0・ブラウザ／vitest／build／sim の起動 0**。数値はすべて既存監査・既存 evidence の引用であり、本書で新たに測ったものは無い。未測定は【推測】と明記する。
>
> **CEO 指示文の途切れについて（事実）**：本 Lane への指示文は「Daily「今日の問い」／49 Progression／OTOMO 育成／敗北…」で途切れている。途切れた先に何が続くかは不明のため、本書は **Lane 9 の TOP5 全項目（①Daily「今日の問い」最小版／②49 攻略 → 次の目標 NM1／③Home 初陣直後 Primary／④同じ盤面 Retry の前回比／⑤OTOMO 絆 ★3 条件）と次点 ⑥（大耀 Mastery B 閾値）** を対象にした。途切れた部分に「敗北体験」以外の観点（例：長期やり込み・Ranking）が含まれていた場合は §6 の残課題として再読が必要。

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| **統合の結果** | 4 Lane の提案 27 件を 1 表（§2）に統合。重複は 5 組（Home 2 戦目導線＝Lane 9 #3／Lane 5 束 #3、敗北 RETURN TO CALM＝Lane 7 #1／Lane 5 予備 #6、浮遊数字の縁取り＝Lane 7 #5／Lane 5 束 #2、SP 本文 px＝Lane 8 #1／Lane 5 束 #2、敗北画面の事実行＝Lane 6 #1／別 Dev 実装中）を 1 行ずつにまとめ、出典を併記 |
| **v1.0.3 で解消（予定を含む）** | 6 件：Home 2 戦目導線（commit `db859b6`・**実装済み**）／初心者語彙（`42bec1a`・実装済み）／敗北画面の事実行（Lane 6 #1・別 Dev・**1 行**）／RETURN TO CALM 小 +200ms（Lane 5 予備 #6・別 Dev）／SP 本文 9.5px（Lane 8 #1・別 Dev・**`battle.css:5637` SP ブロックに反映済み・140px 札は 9px 据え置き**）／C-4「必殺技」→「必殺」（`db859b6`・実装済み）。別 Dev の 3 件は本書の執筆中に lane3 の作業ツリーへ **未 commit の差分**として現れた（§1-2・本書は読むだけ） |
| **v1.0.4 候補「Retention 束 v1」（§3）** | **採用 4 件・順序＝①絆 ★3 条件の到達可能化 → ②49 攻略 NM1 → ③Daily「今日の問い」最小版 → ④同じ盤面 Retry 前回比**。①〜③＝Stage A **runtime ≈57 行（目安 ≤60 以内）**＋CSS 3 行・テスト ≈22 件。④＝Stage B ≈26 行（**採用・ただし v1.0.3 の敗北画面（事実行 2 行追加後）の行数を Fast Gate G8 で見てから同 Release に入れるか決める**＝条件付き）。全件 engine 0・`src/core` 0・gameVersion 不変・save／storage 書き込み 0・新 key 0 |
| **v1.0.4 候補（別束・他 Lane 管轄）** | 敗北 RETURN TO CALM v1 完全版（Lane 7 #1）／Enemy Break SE v1（Lane 7 #2）／Tier-5 バナー MATERIAL（Lane 7 #3）／cast-*.png WebP＋preload（Lane 8 #2）／Enemy Select 背景段階読込（Lane 8 #3）／Gate スクリプト拡張（Lane 8 #4・runtime 0） |
| **保留** | 大耀 Mastery B 0.37→0.30（gameVersion 変更・CF-04 と同時に別 Decision）／軍略 CORE 展開 Phase A（**CEO 既存未承認**）／Daily スコア神別正規化（Ranking TRIGGER まで）／福永の受け札調整（カードデータ＝balanceSim 必須）／OTOMO 戦略価値の再計測（sim 1 回・runtime 0）／ジングル GainNode 化（iPhone 実機 QA 必須）／未参照 12.6MB 退避（Rights Ledger 同期） |
| **原則違反チェック** | 統合表の全行で Pay to Solve／ガチャ／スタミナ／ログイン強制 **0**。閉じたレバー（決定263・262・216・214・220〜222・127・255・260・232 数値・「7R は上限」）は **再提案していない**。Daily semantics（同日同 Seed・3 回・開始時消費・JST・欠席罰なし）は不変 |
| **評価** | KPI（翌日復帰・2 戦目開始率・49 埋まり日数・★3 到達率）は **計測基盤 0 で観測不能**（§4-3）。固定 seed 決定論 sim（Lane 6 harness `scripts/lane6-fun-balance-audit/`・決定259 Daily harness・`returnLoop.audit.ts`・`sameSeedRetry.test.ts`）で測れる代替指標を §4-1、Human QA 設問を §4-2 に置く。効果見込みは全件【推測】 |
| **CEO 判断** | **不要（0 件）**。Retention 束 v1 は CLAUDE.md §6-2（軽微な UI・UX 調整／既存仕様の範囲内の改善）。CEO が関わるのは v1.0.4 Production 公開承認（§6-3 #8）と、保留項目のうち既存未承認の軍略 Phase A・★課金素材（BF-01／02／05）のみ＝本書で新たに増やしていない |

---

## 1. 前提・読んだもの・v1.0.3 RC の現状

### 1-1. 入力（すべて読むだけ）

| 入力 | 場所 | 使った部分 |
|---|---|---|
| Lane 9 Retention Design v1 | `...\scratchpad\lane9\RETENTION_DESIGN_V1.md` | §2 観点別分解・§3 TOP5・§4 TOP1 Pilot 仕様・§5 評価・§6 残課題 |
| Lane 6 Fun & Balance Audit v1 | `C:\Users\kimi1\SevenGodsGame-enemy-audit\docs\FUN_BALANCE_AUDIT_V1.md` | §2-2 敗因の収束（必殺 56%・R4 73%・ブロック 0 68%・敵 ≤25% で敗北 84%）・§4-2 逆転率・§7 TOP5・§8 未計測 U1〜U8 |
| Lane 7 Combat Premium Audit v2 | `C:\Users\kimi1\SevenGodsGame-lane7\docs\COMBAT_PREMIUM_AUDIT_V2.md` | §0 結論表・§4-3 敗北 RETURN TO CALM PARTIAL・§15 次期仕様・§16 TOP5・§17 受入基準 |
| Lane 8 Mobile UX Audit v1 | `...\scratchpad\lane8\MOBILE_UX_AUDIT_V1.md` | §0 結論表・§4 HUD 情報密度（SP 本文 9px＝`battle.css:5638`）・§9 TOP5・§10 未測定 |
| v1.0.3 RC | `C:\Users\kimi1\SevenGodsGame-lane3`（`release/v1_0_3-rc` `1343024`）：`docs/V1_0_3_UX_BUNDLE_V1.md`・`docs/NEXT_QUALITY_IMPROVEMENT_PLAN_V1.md`・`docs/RELEASE_STATUS.md` §A-4 | 束 #1／#3 の実装記録・束 #2 設計・予備 #6 の扱い |
| コード（RC・読むだけ） | `src/components/battle/nextGoal.ts`（227 行）・`dailyDiff.ts`（96）・`resultContext.ts`（111）・`GameOverOverlay.tsx`・`BattleScreen.tsx`・`retrySemantics.ts`・`matchupCelebration.ts`／`src/components/setup/HomeTodayPanel.tsx`（175）・`homePrimary.ts`（68）・`otomoGrowthDisplay.ts`（222）・`OtomoGrowthScreen.tsx`・`DailyChallengeScreen.tsx`／`src/components/GameFlow.tsx`・`resultTransitions.ts`／`src/hooks/matchupStorage.ts`（227）・`dailyClock.ts`・`dailyStorage.ts`・`otomoBondStorage.ts`・`useGameEngine.ts`／`src/core/data/rules.ts`（471）・`enemies.ts` | §3 の触るファイル・行数・既存テスト件数の根拠（付録 A） |

### 1-2. v1.0.3 RC の現状（事実・2026-10-22 時点）

- `release/v1_0_3-rc` HEAD `1343024`＝master `0d38c05`（v1.0.2 Production）＋ Lane 5 束 #1（`42bec1a`）＋ 束 #3＋C-4（`db859b6`）＋ docs（`2654aed`・`418a387`）。作業ツリーは **clean**（`git status --short` 空）。
- `selectHomePrimary` は **A → B → C' → D → C** に変更済み（`homePrimary.ts:61-68`・`isFirstBattleOnly` :45-50）。Lane 9 #3「Home 初陣直後 Primary 整合」は **解消済み**。
- 別 Dev が実装中の 3 件（敗北画面の事実行／RETURN TO CALM 小 +200ms／SP 本文 9.5px）は、本書の読み始め時点では lane3 の作業ツリーが clean で branch／commit にも無かったが、**本書の執筆中（同日）に lane3 の作業ツリーへ未 commit の差分として現れた**（`git status`：`BattleScreen.tsx`・`GameOverOverlay.tsx` +17・`battle.css` +13／−1・`combatTimeline.ts` +3／−1・`combatTimeline.test.ts` +13・`enemyVfxTiming.ts` +7・新規 `defeatFacts.ts`／`defeatFacts.test.ts`／`spHandTextSize.test.ts`）。本書はこれらを **読むだけ**で触っていない。内容（diff の読み取り）：(a) 事実行＝`deriveDefeatGuardFact`／`describeDefeatGuardFact`（`lost` のときだけ・計算できたときだけ・敗因の枠の中に `<br/>`＋`span.game-over-defeat-fact` で **1 行**。「敵の残り HP」は既存行が担い重複させない）、(b) `planResultGate`＝`visualHpEndMs + 200`（テストで固定・勝利経路不変）、(c) SP 本文は **`battle.css:5637` 側（SP ブロック）で 9→9.5px・`max-height:720px`（140px 札）では 9px に戻す**＝Lane 8 §4 案 F の編集位置訂正は **既に反映済み**。
- 束 #2 の SP 本文 px について Lane 8 §4-1 が出した **編集位置の訂正**（SP の実効値は `battle.css:5638-5640`・Lane 5 計画の `:5368-5371` は PC 側）は、上記 (c) のとおり Dev 側で正しい位置に当てられている。残るのは measure-all Gate（決定238 と同じはみ出し測定）の実行のみ。
- `combatTimeline.ts`（`planResultGate`）は Lane 1 系と衝突するため束 #3 から外された（`V1_0_3_UX_BUNDLE_V1.md` §2-2）。別 Dev の +200ms は同ファイルを触る＝本書の Retention 束は `combatTimeline.ts` を **触らない**。

### 1-3. 閉じたレバー（再提案しない）と原則チェックの基準

| 閉じたレバー | 根拠 | 本書での扱い |
|---|---|---|
| 未来情報・正解・推奨手の表示 | 決定262・263 NO-GO・K33 OPEN | 出すのは **決着後の事実**（verdict・前回比・初撃破の k/7）だけ。推奨手 0 |
| 龍神 R4 守り／7 OTOMO 戦闘展開／Living Background | 決定216・214・220〜222 | 触れない。OTOMO は表示層の到達条件のみ |
| BURST 任意発動／AP 平準化／Solution Diversity／「7R は上限」／hit stop 数値 | 決定127・260・255・267・232 | engine・RULES・presentation 定数の数値は提案しない |
| hard 緩和・怨霊／龍神 R4 数値・託宣 3→4 | Lane 6 §7「採用しない案」・2026-10-07 CEO 指示 | 再提案しない |
| Daily semantics | P6・P8・決定121・196 | 不変。表示層のみ |
| 新通貨・新図鑑・ログイン streak・スタミナ・課金 | P7・P8・P14 | 0 |

---

## 2. 統合表（Lane 6〜9 の提案を 1 表に・重複は 1 行）

採点の語彙：効果＝PV（Player Value）／Ret（Retention）を 1〜5。コスト＝runtime 行数（本書の読みで補正）＋テスト。リスク＝engine／gameVersion／save の 3 軸（0＝触らない）。区分＝**v1.0.3 で解消**／**v1.0.4 候補（Retention 束）**／**v1.0.4 候補（別束）**／**保留**／**随時（runtime 0）**。原則＝Pay to Solve／ガチャ／スタミナ／ログイン強制／FOMO／未来情報 の 6 項目（すべて 0 なら「0」）。閉じ＝閉じたレバーの再提案か。効果はすべて【推測】（§4-3）。

| # | 項目 | 出典 Lane | 効果 PV／Ret | コスト（runtime 行・テスト） | リスク engine／gameVersion／save | 区分 | 原則／閉じ | 備考 |
|---|---|---|---|---|---|---|---|---|
| 1 | Home 初陣直後の Primary を「神を選ぶ」に（C'） | L9 #3＝L5 束 #3 | 3／4 | 実装済み（`homePrimary.ts` +9・`HomeScreen.tsx`・テスト 7 件） | 0／0／0 | **v1.0.3 で解消（済・`db859b6`）** | 0／なし | Lane 9 は支持のみ。決定193 §6 の順序見直し＝AI 判断・DECISIONS 行は PM 採番 |
| 2 | 初心者語彙 完結（防御（ブロック）・連撃・強打／特大） | L5 束 #1 | 3／2 | 実装済み（`tutorialContent.ts` 4 行） | 0／0／0 | **v1.0.3 で解消（済・`42bec1a`）** | 0／なし | Retention への寄与は初陣理解経由【推測】 |
| 3 | 敗北画面の事実行（「{技} N を加護で受けていれば残 HP X」。「敵の残り HP」は既存行が担う） | **L6 #1**（L9 2-6 と整合） | 4／4 | 別 Dev 実装中（lane3 未 commit：`defeatFacts.ts` 新規・`GameOverOverlay.tsx` +17・`BattleScreen.tsx` +2・テスト新規） | 0／0／0 | **v1.0.3 で解消予定（別 Dev・作業ツリーに差分あり）** | 0／なし（決定263 の境界内＝事後の事実・`lost` かつ計算できたときだけ） | 敗因の枠の中に **1 行**（2 行ではない）。本書 §3 の ④「前回比」と同じ敗北画面＝行数の合計を Fast Gate G8 で見る |
| 4 | RETURN TO CALM 小（`planResultGate` +120→+200ms） | L5 予備 #6（L7 #1 の部分） | 2／2 | 1 値＋テスト 1（lane3 未 commit：`combatTimeline.ts` +3／−1・テスト +13・`enemyVfxTiming.ts` +7） | 0／0／0 | **v1.0.3 で解消予定（別 Dev・作業ツリーに差分あり）** | 0／なし | `combatTimeline.ts`＝Lane 1 衝突ファイル。本書の束は触らない。勝利経路（`planVictory`）はテストで不変を固定 |
| 5 | SP 手札本文 9→9.5px（158px 札のみ・140px 札＝`max-height:720px` は 9px 据え置き） | **L8 #1**＝L5 束 #2 ③ | 3／2 | CSS +13／−1（lane3 未 commit：`battle.css:5637` SP ブロック＋`:5709` 以降の 140px 用 media）＋`spHandTextSize.test.ts` 新規＋measure-all Gate | 0／0／0 | **v1.0.3 で解消予定（別 Dev・作業ツリーに差分あり）** | 0／なし | Lane 8 §4-1 の編集位置訂正（`:5638` 側）は **反映済み**。残りは measure-all（決定238）の実測 |
| 6 | 浮遊数字の縁取り＋神 HP コントラスト ≥3.0 | L7 #5＝L5 束 #2 ②④ | 2／1 | CSS 3〜4 行＋`hudPlate.css` 1 値 | 0／0／0 | **v1.0.3 束 #2 の範囲（Lane 5 管轄）** | 0／なし | Lane 8 §4-2：縁取りは `battle.css:4761-4770` に **既存**＝実測（道化 紅背景 U8）で縮小の可能性 |
| 7 | C-4「必殺技」→「必殺」 | L5 #12 | 1／0 | 1 語 | 0／0／0 | **v1.0.3 で解消（済・`db859b6`）** | 0／なし | — |
| 8 | **OTOMO 絆 ★3 の到達可能化**（tier3＝Lv5。童子ギャラリーは `dojiReached>0` で分離） | **L9 #5**（L6 §5-1「絆の到達先が弱い」と整合） | 3／3 | ≈11 行（`otomoGrowthDisplay.ts` 10・`nextGoal.ts` 1）＋テスト 8 件更新／追加 | 0／0／0（storage 読み取りのみ・version 据え置き） | **v1.0.4 候補（Retention 束・順序 ①）** | 0／なし（決定214 の戦闘展開ではない。決定70／71 の表示仕様見直し＝AI 判断） | 決定186：童子到達 0〜4%＝★3 事実上到達不能。既存 Lv5 記録は適用時に ★3 へ **昇格のみ**（降格 0） |
| 9 | **49 攻略 → 次の目標 NM1**（初撃破の直後だけ「別の神でも攻略する（この敵 k/7 神）」） | **L9 #2** | 4／4 | ≈15 行（`nextGoal.ts` 10・`resultContext.ts` 4・`BattleScreen.tsx` 1）＋テスト 5 件 | 0／0／0 | **v1.0.4 候補（Retention 束・順序 ②）** | 0／なし | 位置＝NR1 の後・**N4 の前**（Lane 9 案は N4 の後。本書 §3-2 で比較し変更）。母数 49 は出さない |
| 10 | **Daily「今日の問い」最小版**（verdict 1 行＋「明日の問いは【型】」＋Home 1 行） | **L9 #1**（DAILY_RETENTION_LOOP_PREFLIGHT §2 Root Cause） | 5／5 | ≈31 行（7 ファイル）＋CSS 3＋テスト 9 件 | 0／0／0（`sevengods.daily` v1 据え置き） | **v1.0.4 候補（Retention 束・順序 ③）** | 0（countdown の露出条件不変・型は Seed／敵名を出さない）／なし | `results[]` の `status`／`round` は保存済みで表示未使用（`dailyStorage.ts:26-31`） |
| 11 | **同じ盤面 Retry の「前回比」1 行**（session 内 state・storage 0） | **L9 #4**（L6 §2-2「敵 ≤25% で敗北 84%」が数値の土台） | 4／4 | ≈26 行（`retrySemantics.ts` 12・`GameFlow.tsx` 9・`BattleScreen.tsx` 2・`GameOverOverlay.tsx` 3）＋テスト 5 件 | 0／0／0 | **v1.0.4 候補（Retention 束・順序 ④・Stage B 条件付き）** | 0（過去の事実のみ）／なし（決定196 の延長） | 敗北画面の行数が #3（事実行 2 行）と合算で増える → G8 で判定。ブラウザ更新で消える＝正直に出さない |
| 12 | 大耀 Mastery B 閾値 0.37→0.30（`rules.ts:148`） | L9 次点 ⑥（決定186 Q4 evidence） | 2／2 | 1 値＋golden 更新 | 0／**変わる**（`dataFingerprint` に `RULES.mastery` 含む）／0（K26 託宣表切替） | **保留**（CF-04 再集計と同時に別 Decision） | 0／なし | Fast Gate ではなく通常 Gate。v1.0.4 束には入れない |
| 13 | 敗北 RETURN TO CALM v1 完全版（calm 240ms＋BGM fade 180ms＋tap skip） | **L7 #1**（BF-03・L5 予備 #6 の上位） | 3／3 | ≈50 行（`useCombatPresentation.ts` 18・`bgm.ts` 14・`battle.css` 12・`enemyVfxTiming.ts` 2・`BattleScreen.tsx` 3）＋テスト 5 | 0／0／0 | **v1.0.4 候補（別束・Lane 7 管轄）** | 0／なし（決定232 数値は不変） | #4 の +200ms が v1.0.3 で先に入る＝完全版は Before／After 同 seed の CEO 聴感 QA（L7 §17-2 #1）が要る。Retention 束と別 PR |
| 14 | Enemy Break SE v1（既存 `enemy_charge` rate 0.7／0.6・新規音源 0） | L7 #2 | 3／2 | ≈15 行＋テスト 4 | 0／0／0 | **v1.0.4 候補（別束・Lane 7）** | 0／なし | Game Feel 軸。Retention への寄与は間接【推測】 |
| 15 | Tier-5 バナー MATERIAL 統一＋進化バナー位置 | L7 #3（BF-08・PC-6） | 2／1 | CSS ±40＋TSX ±6 | 0／0／0 | **v1.0.4 候補（別束・Lane 7）** | 0／なし | `battle.css` を束 #2 と共有＝v1.0.3 公開後 |
| 16 | ジングル GainNode 化（K04・K25・Lane 3 C5） | L7 #4 | 2／2 | `bgm.ts` ≈40 行＋iPhone 実機 QA | 0／0／0 | **保留**（実機 QA 必須・M） | 0／なし | 勝利／敗北ボイスの前提。Lane 3 と実装 Lane を 1 つに |
| 17 | `fx/cast-*.png` 2.0MB → WebP＋入口 preload | L8 #2 | 2／1 | S（画像変換＋`battleEntrance.ts` 5 行） | 0／0／0 | **v1.0.4 候補（別束・資産系）** | 0／なし | 初回 cast-flash 欠落【推測・U5】。Lane 7 素材系と PM 調整 |
| 18 | Enemy Select 舞台背景の段階読込（K29 cold 1〜3s） | L8 #3（UX-05／PF-02） | 3／2 | S（`EnemySelectScreen.tsx` 1 要素＋CSS 3） | 0／0／0 | **v1.0.4 候補（別束）** | 0／なし | 2 戦目以降の「待ち」を削る＝Retention に間接【推測】 |
| 19 | Gate スクリプト拡張（`sp414`／`spland`／戦闘中 rAF >33ms・768px で K29 再評価） | L8 #4 | 1／0 | XS（scripts のみ） | 0／0／0 | **随時（runtime 0）** | 0／なし | Gate 実行は Production Gate 終了後・RAM 競合回避 |
| 20 | 未参照 12.6MB を `art-source/` へ退避 | L8 #5（AR-06／PF-03） | 1／0 | XS（移動のみ） | 0／0／0 | **保留**（Rights Ledger K13・CM-04 と同期） | 0／なし | 削除ではなく移動。Lane 7 と調整 |
| 21 | 軍略の CORE 展開 Phase A（鬼将 enemy_02 → 軍略版） | L6 #2 | 5／3 | M | **engine**／**変わる**／0 | **保留（CEO 既存未承認）** | 0／なし | K33 直撃だが gameVersion 指紋・Daily／49 盤に波及。本書で再起案しない |
| 22 | Daily スコアの神別正規化（集計側） | L6 #3（K11・決定256 G1 FAIL） | 2／2 | S（集計側） | 0／0／0 | **保留**（Ranking TRIGGER まで） | 0／なし | 一人で解く価値には効かない（DAILY_RETENTION_LOOP_PREFLIGHT §2） |
| 23 | 福永の受け札供給の再調整（paired-seed 比較） | L6 #4（「福永一弱」hard 70.7%） | 3／2 | カードデータ＋balanceSim | **カード数値（engine 相当）**／**変わる**（`dataFingerprint` にカード含む【要確認】）／0 | **保留**（別 Decision・sim 必須） | 0／なし（決定255 の保護条件を守る前提。「強カード配布禁止」の CEO 指示との整合を要確認） | v1.0.x の Fast Gate 枠外 |
| 24 | OTOMO 戦略価値の再計測（guardian／power paired-seed・U4） | L6 #5 | —（計測） | sim 1 回 ≈7 分・runtime 0 | 0／0／0 | **保留（計測のみ・Planner 別タスク）** | 0／なし | 差 <1pt なら決定214 NO-GO 確定→OTOMO は絆（表示）軸に固定＝#8 の前提を強める |
| 25 | Home「神を選ぶ」Secondary に NR1 と同じ 1 行 | L9 2-1 補足案 | 2／2 | ≈3 行 | 0／0／0 | **保留**（束 #3 の Human QA 後） | 0（P13「5 秒で約束」と衝突し得る）／なし | #1 の Human QA（CEO 目視）で「神を選ぶ」が自然に押されれば不要 |
| 26 | RP-01 通常戦の神×敵 best／前回の保存（新 state） | L9 2-7 LATER | 3／3 | storage version +1・State Contract | 0／0／**新 key or v2** | **保留**（State Contract 作成後・別 Decision） | 0／なし | #11 の session 内 state が「保存せずに済む最小版」。保存版は RP-01 として後日 |
| 27 | Home 絆チップを tier3 件数へ置換・段付き 49 | L9 2-7 LATER | 2／2 | 小（決定187 付録 C の見直し） | 0／0／0 | **保留** | 0／なし | #8 で ★3 が到達可能になった後に意味を持つ |

**重複の統合（出典併記）**：#1（L9 #3＋L5 束 #3）／#3（L6 #1＋L9 2-6）／#4＋#13（L5 予備 #6＋L7 #1）／#5（L8 #1＋L5 束 #2 ③）／#6（L7 #5＋L5 束 #2 ②④）。Lane 6 の「採用しない案」（hard 緩和・R4 数値・託宣 3→4）と Lane 7 §6-4、Lane 9 §1-3 の閉じたレバーは表に載せていない（再提案しないため）。

---

## 3. v1.0.4 候補「Retention 束 v1」の設計

### 3-1. 採否と順序（AI 判断）

| 順序 | 項目 | 採否 | 理由（比較） |
|---|---|---|---|
| ① | **絆 ★3 の到達可能化**（#8） | **採用・Stage A** | 最小（≈11 行）・他と独立・純関数 3 つ＋テストで固定できる。先に入れると「次の目標 N8」の文言（童子条件の削除）が ②③ のテスト期待値に先に反映され、`nextGoal.ts` を触る回数が 1 往復減る |
| ② | **49 攻略 NM1**（#9） | **採用・Stage A** | `nextGoal.ts`・`resultContext.ts` を ③ と共有＝連続して触る。最大 48 回しか出ない「初撃破の瞬間」限定で、既存 N5〜N10 の優先順位は不変 |
| ③ | **Daily「今日の問い」最小版**（#10） | **採用・Stage A** | Lane 9 TOP1（80 点）。7 ファイルに散るため束の中で最も大きい（≈31 行）。Lane 9 §4 の V7（Daily 画面の「今日の問い：【型】{敵}を 7R 以内に撃破」1 行）は **落とし**、終了文の差し替え 1 行だけにする（≤60 行に収める・Daily 画面は既に敵名＋型＋Seed＋残り回数があり情報過多を避ける） |
| ④ | **同じ盤面 Retry の前回比**（#11） | **採用・Stage B（条件付き）** | 効果は高い（Solve Loop の「Learning」を画面が返す）が、敗北画面の行数が v1.0.3 の事実行（#3・2 行）と合算で増える（敗因 1＋recap ≤3＋事実行 2＋残り HP 1＋あと一歩 1＋**前回比 1**）。PC 1508×660（決定207 で recap 余白を詰めた経緯）と SP375 で初期可視領域から Primary が押し出されないかを **Fast Gate G8 で先に測る**。G8 PASS なら同 Release、FAIL なら v1.0.5 へ分離（文言短縮の調整案 1 つ＝「同じ盤面 2 回目：23% → 8%」） |
| — | 次点 ⑥ 大耀 Mastery B 閾値 | **不採用（保留）** | gameVersion 変更＝束の不変条件に反する |

**束の不変条件**：engine 0（`git diff --stat -- src/core` が空）・`RULES` 無変更（gameVersion 不変・golden 不変）・storage 書き込み 0（diff に `localStorage.setItem` 追加 0・`sevengods.daily` v1／`sevengods.matchups` v1／`sevengods.otomoBond` 据え置き）・saveVersion 9 不変・Daily semantics 不変・`combatTimeline.ts`／`battle.css` を触らない（Lane 1／束 #2／Lane 7 との衝突回避）・新語は「今日の問い」「明日の問い」「同じ盤面 n 回目」の 3 つだけ。

**起点**：v1.0.3 Production 公開後の master（`GameOverOverlay.tsx` を別 Dev の事実行と本束 ③④ が共有するため、v1.0.3 RC への同梱はしない）。branch 名案：`feat/v1_0_4-retention-bundle`。commit は 4 件（①〜④ を 1 commit ずつ・各 revert 可能）。

### 3-2. 設計判断 2 件（Lane 9 からの変更点・比較つき）

**(a) NM1 の位置：NR1 の後・N4 の前（Lane 9 案「N4 の後」から変更）**

| 案 | 順序 | 利点 | 欠点 |
|---|---|---|---|
| A（Lane 9） | N2→N3→NR1→**N4**→NM1→N5… | 決定187 の「翌日に戻る理由」N4 を一切動かさない | Daily 未着手の日に初撃破すると NM1 が **出ない**（N4 が先に成立）。N4 は毎日成立し得るので、初撃破（通算 ≤48 回・初期ほど集中）の大半を N4 が覆う【推測】 |
| **B（採用）** | N2→N3→NR1→**NM1**→N4→N5… | 初撃破の瞬間は 48 回限りで、同じ敵・同じ予告列に「別の神で」向かう動機が最も高い（Lane 9 2-3）。N4 には Home Primary D・Home Today CTA・翌勝利の N4 という代替経路があり、NM1 には無い | 初撃破で勝った日の Daily 誘導が結果画面から 1 回消える（Home には残る） |

既存 `nextGoal.test.ts` 30 件は `matchup` 入力を渡していない（型に `matchup?` を追加するだけ）ため **期待値不変**。NR1 は NM1 より先に評価するので、初陣（恵比寿×試練の影）の初勝利は従来どおり NR1。

**(b) ★3 の条件：tier3＝Lv5（12pt）。童子ギャラリーは `dojiReached > 0` で開く（称号と記録を分離）**

| 案 | 内容 | 利点 | 欠点 |
|---|---|---|---|
| A（Lane 9） | tier3＝Lv5。童子ギャラリーも tier3 で開く | 最小（≈7 行） | 童子に 1 度も到達していない記録で「童子の記録」が開く＝「記録として閲覧」（決定71・CEO 指示の表現）が事実と食い違う |
| **B（採用）** | tier3＝Lv5（称号・★・カード枠発光）。`unlockedForms` の童子は `record.dojiReached > 0` のとき（tier に依らない） | 「記録」の意味を守る。`dojiReached` に見える役割が残る（P7 到達先）。メイン肖像は童子固定表示のまま（`otomoGrowthDisplay.ts:58-59`）なので童子の絵自体は従来どおり見える | +4 行。tier3 で童子未到達のとき「次の解放」文が null でなく「童子の記録（童子形態で対局を終えると解放）」になる |

### 3-3. 触るファイル・行数・文言（Stage A ①〜③ ≈57 行＋CSS 3／Stage B ④ ≈26 行）

| 項 | ファイル:行（RC `lane3`） | 変更 | 文言（確定案） | 行数 |
|---|---|---|---|---|
| ①-1 | `src/components/setup/otomoGrowthDisplay.ts:79-84` `computeBondTier` | `if (record.dojiReached > 0 && level >= 5) return 3` → `if (level >= 5) return 3` | — | ±1 |
| ①-2 | 同 `:93-97` `computeUnlockedForms(tier)` → `(tier, record)` | tier≥1 で受肉態、**`record.dojiReached > 0` で童子**（tier3 の条件から外す） | — | +2 |
| ①-3 | 同 `:119-129` `computeNextUnlockText` tier2 | 童子条件の分岐を削り `あと${pointsNeeded}pt` のみ。tier3 で `dojiReached === 0` なら新文 | tier2：「絆称号「固い絆で結ばれた相棒」（あと N pt）」／tier3 童子未到達：「童子の記録（童子形態で対局を終えると解放）」／tier3 童子到達：null | −4／+3 |
| ①-4 | 同 `:193-222` `NextBondGoal`／`computeNextBondGoal` | `needsDoji` フィールドを削除（常に false になるため） | — | −3 |
| ①-5 | `src/components/battle/nextGoal.ts:201` N8 | `${bond.needsDoji ? '（童子形態での対局終了も必要）' : ''}` を削除 | N8：「絆称号「固い絆で結ばれた相棒」まであと N pt」 | ±1 |
| ①-T | `otomoGrowthDisplay.test.ts`（27 件中 6 件更新：:32-42・:83-98・:122-131・:196）＋新規 2 件（tier3 童子未到達の解放文／`dojiReached>0` で tier2 でも童子閲覧可）／`nextGoal.test.ts` N8 期待値 1 件 | — | — | テスト 9 件 |
| ②-1 | `src/components/battle/nextGoal.ts:55-82` `NextGoalInput` | `matchup?: { isFirstClear: boolean; enemyClearedCount: number } \| null` を追加 | — | +1 |
| ②-2 | 同 `:164-165`（NR1 の直後・N4 の前） | `NM1`：`matchup?.isFirstClear && matchup.enemyClearedCount < 7` のとき | text：「{敵}を別の神でも攻略する（この敵 k/7 神）」／action `reselect`／primaryLabel：「別の神で挑む（神を選び直す）」 | +9 |
| ②-3 | `src/components/battle/resultContext.ts:23-29` `ResultEngineSnapshot`・`:91-107` normal 分岐 | `matchupClear: MatchupClearResult \| null` を snapshot に追加し、`goalInput.matchup` へ `{ isFirstClear, enemyClearedCount }` を写す（`status==='won'` のみ） | — | +4 |
| ②-4 | `src/components/battle/BattleScreen.tsx:716` | `collectResultContext(state, { …, matchupClear })` | — | +1 |
| ②-T | `nextGoal.test.ts` +3（初撃破で NM1／k=7 なら出ない／NR1 が優先）・`resultContext.test.ts` +2（won で写す／lost で null） | — | — | テスト 5 件 |
| ③-1 | `src/components/battle/dailyDiff.ts`（末尾） | `describeDailyVerdict(current: DailyDiffCurrent): string`（`status`／`round` だけで決める純関数） | `won`：「今日の問い：解けた（R{round} 撃破）」／`lost`：「今日の問い：未解（R{round} 敗北）」／`finished`：「今日の問い：未解（7R 未撃破）」 | +8 |
| ③-2 | `src/components/battle/GameOverOverlay.tsx:323-333` `game-over-daily` | best 行の **上**に `<p className="game-over-daily-verdict" data-testid="daily-verdict">`（`context.dailyCurrent` があるときだけ） | ③-1 の文言 | +3 |
| ③-3 | `src/hooks/dailyClock.ts`（`:34-39` の後） | `nextDailyKey(now)`＝`dailyKeyOf(new Date(now.getTime() + msUntilNextDailyKey(now)))`（既存 2 関数の合成・`src/core` 不変） | — | +4 |
| ③-4 | `src/components/battle/resultContext.ts:73-86` daily 分岐 | `goalInput.daily.tomorrowTypeLabel: getEnemyDef(dailyBossFor(nextDailyKey(now)).enemyId).typeLabel`（読み取りのみ・CORE ID のみ到達） | — | +3 |
| ③-5 | `src/components/battle/nextGoal.ts:81`（型）・`:100-105` D4 | 型に `tomorrowTypeLabel?: string`。D4 文言を変更（型が無ければ従来文） | D4：「今日の挑戦は終了。明日の問いは【{型}】・次の敵まで {HH:MM}」 | +5 |
| ③-6 | `src/components/setup/HomeTodayPanel.tsx:91-117` | 「今日のベスト」行の下に verdict 1 行（`bestResultOf(day)` の `status`／`round` から ③-1 と同じ語・未挑戦は「今日の問い：未着手」）。残り 0 の countdown 行に「明日の問いは【{型}】・」を前置 | 未挑戦：「今日の問い：未着手」／挑戦済み：③-1（ベスト結果）／残り 0：「明日の問いは【{型}】・次の敵まで HH:MM」 | +6 |
| ③-7 | `src/components/setup/DailyChallengeScreen.tsx:153` | 終了文の差し替え（`nextDailyKey` で型を引く） | 「明日の問いは【{型}】。また明日。」 | +2 |
| ③-8 | `src/components/setup/daily.css`（既存 daily 行と同じトークン・新色 0） | `.game-over-daily-verdict`／`.home-today-verdict` | — | CSS +3 |
| ③-T | `dailyDiff.test.ts` +3（won／lost／finished）・`nextGoal.test.ts` +2（D4 型あり／なし）・`dailyClock.test.ts` +2（JST 23:59→翌日キー・月跨ぎ）・`resultContext.test.ts` +1（daily で型が入る）・Home 配線テスト +1（残り 0 で「明日の問い」） | — | — | テスト 9 件 |
| ④-1 | `src/components/battle/retrySemantics.ts`（末尾） | `SameBoardMemo = { seed; status; enemyHpRatio; round; count }`／`describeSameBoardDiff(prev: SameBoardMemo, cur: {status; enemyHpRatio; round}): string \| null`（seed 不一致なら null） | 敗北→敗北：「同じ盤面 {n} 回目：前回 R{r1}・敵 HP {a}% → 今回 R{r2}・{b}%」／敗北→勝利：「同じ盤面 {n} 回目：前回 敵 HP {a}% → 今回 撃破」 | +12 |
| ④-2 | `src/components/GameFlow.tsx:398-430` `onRematch`・`:162-175` `backToGodSelect`・`exitResult` | `useState<SameBoardMemo \| null>`。`isSameBoardRematch` が真のとき `{ seed: engine.state.seed, status, enemyHpRatio, round, count+1 }` を保持（`plan.carry` と同じ寿命・保存しない）。選び直し／結果出口で null | — | +9 |
| ④-3 | `src/components/battle/BattleScreen.tsx` | prop `sameBoard?: SameBoardMemo \| null` を `GameOverOverlay` へ通す | — | +2 |
| ④-4 | `src/components/battle/GameOverOverlay.tsx:184` 付近 | `mode==='normal'` かつ `sameBoard?.seed === enemy の seed` のとき 1 行（敗因の直後・recap の前）。Daily には出さない（前回軸が既にある） | ④-1 の文言 | +3 |
| ④-T | `retrySemantics.test.ts` +3（敗北→敗北／敗北→勝利／seed 不一致 null）・GameFlow 配線テスト +2（同 seed 再戦で count 2／勝利後は消える） | — | — | テスト 5 件 |

合計：Stage A runtime ≈57 行（①11・②15・③31）＋CSS 3・テスト ≈23 件／Stage B ≈26 行・テスト 5 件。**`src/core` 0・`combatTimeline.ts` 0・`battle.css` 0**。

**NM1 の Primary「別の神で挑む（神を選び直す）」の遷移先について（事実）**：`backToGodSelect`（`GameFlow.tsx:162-175`）は LANE-D の方針で **敵の選択もリセットする**（`setSelectedEnemyId(null)`）。したがって「別の神で挑む」を押しても敵は引き継がれず、神選択 → 敵選択（「✓ {神}で撃破済み」表示あり）を通る。Lane 9 残課題 8 への回答＝**引き継がない**。本束では LANE-D を変えず、文言を「同じ敵が選ばれている」と約束しない形（上記）にする。敵を引き継ぐ `carry` 追加は決定済みの LANE-D（「委ねたつもりが同じ敵と再戦」の混乱回避）と衝突するため採らない。

### 3-4. Fast Gate 項目（PM が直列実行・≈30 分・Stage B 込み ≈40 分）

| G | 項目 | 合格 |
|---|---|---|
| G1 | `tsc -b --noEmit`／oxlint 新規 0／変更ファイル限定 vitest（新規・更新 ≈28 件）／full vitest／`vite build` | すべて PASS・既存件数 −0 |
| G2 | `git diff --stat -- src/core` が空・`git diff` に `localStorage.setItem` の追加 0・`RULES` 参照の追加は読み取りのみ・gameVersion golden（`gameVersion.test.ts`）不変 | 空／0／不変 |
| G3 | 決定論 Playwright（既存 Daily smoke 系・seed 固定）：Daily 勝利→結果に「今日の問い：解けた（R{n} 撃破）」／敗北→「未解（R{n} 敗北）」／3 回目後→D4 と Home 残り 0 に「明日の問いは【型】」／JST 23:59 固定時刻で翌日キー＝翌日の敵の型 | 4/4 |
| G4 | 通常戦・初撃破 seed（`?enemy=&seed=`）：結果に「✨ 初撃破：…」と「次の目標」NM1 が同時に出る／同 seed 2 勝目は NM1 が出ない／初陣 seed は NR1 のまま | 3/3 |
| G5 | 旧セーブ互換（`docs/evidence/v1_0_1-rc/07-save-migration` の実セーブ）：Daily・Home・OTOMO 画面が追加 1 行と ★ の **昇格** 以外不変・降格 0・console error 0 | 44/44 相当 |
| G6 | PC 1508×660／SP 390×844／SP375×667：Home Today ブロックの高さ増 ≤1 行・横スクロール 0・結果画面の Primary が初期可視領域（決定207 の基準） | PASS |
| G7 | 語彙：新語 3 つ以外の新規語 0（「失敗」「正解」「推奨」を使わない）・勝敗語は既存 `STATUS_LABEL`（撃破／敗北／未撃破）を再利用・Ranking 文言 0 | grep 0 |
| G8（Stage B） | 敗北画面（事実行 2 行入り）＋前回比 1 行で PC 660px／SP375 の初期可視領域に Primary「同じ盤面でもう一度」が残る／行数 ≤ v1.0.3 比 +1 | PASS なら同 Release・FAIL なら ④ を v1.0.5 へ |

### 3-5. CEO 目視 3 分（YES／NO）

1. Daily を 1 戦して結果画面を見る：「今日の問いを解けたか／解けなかったか」が 3 秒以内に分かったか（YES）。
2. Home に戻る：「今日の問い」1 行で今日の状態が分かり、3 回目後なら「明日の問いは【型】」で明日も開く気になったか（YES）。
3. 通常戦で初撃破（seed 指定）：結果の「別の神でも攻略する（この敵 k/7 神）」を押したくなったか（YES）／「49 個やらされる」と感じたか（NO）。
4. OTOMO 画面：「固い絆」までの残り pt を見て「届きそう」と思えたか（YES）／童子未到達で「童子の記録（…解放）」に違和感があったか（NO）。
5. （Stage B）同じ盤面で 2 回目に負けたとき「前回より進んだ／戻った」が分かったか（YES）／「正解を教えられている」感覚があったか（**NO が合格**・決定263 Q3 と同基準）。

合格条件：全問合格。不合格の調整案は各 1 つ（Daily：「明日の型」行だけ外す／NM1：文言から「（この敵 k/7 神）」を外す／★3：解放文を「童子の記録（未到達）」に短縮／前回比：数値を %→「あと一歩」語に丸める）。自動調整はせず停止して報告（決定232 と同じ運用）。

---

## 4. 評価方法

### 4-1. 固定 seed の決定論 sim で測れる指標（既存ハーネス流用・本書では未実行）

| 指標 | 使うもの（流用） | 何が分かるか | 対応 |
|---|---|---|---|
| Daily verdict 分布（神 × 日付の「解けた」率・撃破 R 分布） | 決定259 harness（7 神 × 168 日 × 3 探索・JSON 出力済み）。Lane 6 harness は通常モードのみ（U7）なので Daily modifier 経路は決定259 側 | 「未解」が常態化する神／日が無いか（verdict が落胆だけにならないか）。初級代表の Daily 勝率は **未計測**（Lane 6 §2 は通常 94.6／hard 79.0・Daily は HP×1.25／ATK×1.15 で hard 寄り【推測】） | ③ |
| NM1 の出現回数と位置（勝利列のうち初撃破で終わる割合・N4 を置き換える回数） | `scripts/phase7-audit/returnLoop.audit.ts` q1_rows（type／god／enemy／status）から「神を順に回す journey」を再生 | New／Casual／Optimizer 各で NM1 ≤48 回・初撃破が何戦目に集中するか・案 B で N4 を奪う回数 | ② |
| 前回比の単調性（同 seed で h-aggressive → h-balanced → s-balanced の順に打ち直したときの敵 HP 比・撃破 R） | Lane 6 harness `scripts/lane6-fun-balance-audit/`（seed `star-audit-1..16`・打ち筋 6・parity 21/21 確認済み）＋`sameSeedRetry.test.ts` | 「前回比」に出る数値が打ち筋の上達で改善するか（嘘の進歩表示にならないか）。Lane 6 §2-2：normal の敗北は敵 ≤25% で 84%＝前回比は「23% → 8%」帯の小さな数字が中心【事実からの推定】 | ④ |
| Lv5（12pt）到達までの戦数分布 | returnLoop `otomoForm` 列（決着時形態 0／1／2）の累積。Lane 6 §5-1 共鳴 0.70／0.81 回／試合・決定186 神の一撃 0 回 30〜57% | ★3 が ≈18〜28 戦帯に入るか【推測の検証】・神別の偏り（才華 1.35 回／蒼毘 0.61 回＝才華が最速・蒼毘が最遅【推測】） | ① |
| 束 #3 の Primary 遷移（v1.0.3） | 決定論 Playwright（Lane 5 Fast Gate） | 初陣→Home「神を選ぶ」・2 戦後→「神域へ挑む」 | 解消済み |

いずれも `src/core` を変えないため **既存 golden と完全一致が前提**（スコア・予告列・手札が 1 でもずれたら実装ミス）。sim の実行は Planner の別タスク（Lane 6 harness 207 秒・単一プロセス・他 Gate と同時実行しない）。

### 4-2. Human QA 設問（CEO 1 名＋可能なら初見 3〜5 名・YES／NO）

| 項目 | 設問 | 合格 |
|---|---|---|
| ③ Daily | §3-5 Q1・Q2＋「正解や取るべき手を教えられている感覚があったか」 | YES・YES・**NO** |
| ② NM1 | §3-5 Q3＋「押した先で敵を選び直す画面で、同じ敵を選べると分かったか」 | YES・NO・YES |
| ① ★3 | §3-5 Q4 | YES・NO |
| ④ 前回比 | §3-5 Q5 | YES・NO |
| v1.0.3 事実行（#3）との併読 | 敗北画面で「事実行」と「前回比」が別の情報に読めたか／多いと感じたか | YES・**NO** |
| 敗北 RETURN TO CALM（#4／#13・Lane 7 §17-2 #1） | 負けた瞬間に結果の前に「終わった」と分かったか／音と画面が一続きか／待たされたか | YES・YES・NO |

初見プレイヤー evidence は現状 0（OB-05）。初見 QA の実施有無は CEO の運用判断（本書は設問の用意のみ）。

### 4-3. 観測できない指標（明示）

| 指標 | 理由 | 代替 |
|---|---|---|
| D1／D7 翌日復帰率・Daily 日次参加率・3 回消化率 | 計測基盤 0（`src` に analytics／sendBeacon なし）。外部サービス導入は CEO 判断（§6-3 #6） | CEO Human QA・Feedback の声・決定論 sim（§4-1） |
| 初陣→2 戦目開始率・敗北→再挑戦率・同じ盤面での試行回数 | 同上。Retry 回数は storage に無い（④ は session 内のみ） | Playwright 決定論・Human QA |
| 49 の埋まり日数・神の使用分布・乗り換え率（NM1 の効果） | `sevengods.matchups` は集合のみ・時刻なし | sim journey（§4-1） |
| 絆 Lv5／★3 到達率（実プレイ） | 同上 | returnLoop `otomoForm` から推定 |
| 人間の難易度別勝率・託宣残・R4 加護使用（Lane 6 U1）／hard の人間評価（U8） | QA n＝1〜数名 | Practical QA v4（Lane 6 §8 設計） |
| Production 公開前後の比較（Lane 6 U2） | 公開前後の人間データ無し | 公開後 14 日の localStorage 自己申告（K30 の範囲） |

---

## 5. CEO 判断が必要か

**不要（0 件）。** Retention 束 v1（①〜④）は CLAUDE.md §6-2「軽微な UI・UX 調整／既存仕様の範囲内の改善」に該当し、Daily semantics・課金・IP・engine・save・gameVersion に触れない。決定70／71（絆称号）・決定187（Next Goal 順序）・決定196（同じ盤面 Retry）の見直しはいずれも AI 判断範囲として `docs/DECISIONS.md` に「AI 判断（Lane 5 統合・Lane 9 設計）」の行を PM が採番して記録する。

CEO に関わるのは以下だけで、本書で新たに増やしていない：
- v1.0.4 Production 公開承認（§6-3 #8）＝PM が §6-4 形式で 1 案提出。
- 保留項目のうち既存未承認：軍略 CORE 展開 Phase A（#21）・★課金素材（BF-01／02／05・Lane 7）。
- 福永の受け札調整（#23）は「強カード配布禁止」の CEO 指示（2026-10-07）との整合確認が要るため、起案する場合は別 Decision で §6-4 形式。

---

## 6. 残課題・次の作業

### 6-1. 残課題

1. **SP 本文 9.5px**：Lane 8 §4-1 の編集位置訂正（`:5638` 側・158px 札のみ）は別 Dev の未 commit 差分で **反映済み**（§1-2 (c)）。残るのは measure-all（決定238・`scripts/card-text-overflow-audit/measure-all.mjs`＝main repo untracked・`V1_0_3_UX_BUNDLE_V1.md` §3-2 の再生成手順）を v1.0.3 Fast Gate で実行すること（PM）。
2. 別 Dev の 3 件（事実行／+200ms／9.5px）は本日時点で **lane3 の作業ツリーに未 commit の差分として存在**（§1-2）。commit され v1.0.3 RC に入った時点で本書 §2 #3〜#5 を「解消済み」へ更新し、敗北画面の行数（敗因 1＋事実行 1＋recap ≤3＋残り HP 1＋あと一歩 1）を G8 の Before 値として記録する。
3. 翌日の `typeLabel` は CORE 7 体で **7 種すべて異なる**（`enemies.ts:54,100,137,174,215,251,288`・軍略版は `:344`「重撃型（軍略）」）＝「型のみ」でも翌日の敵が特定できる【事実】。`dailyBossFor` は公開純関数で現状でも計算可（K30）のため節度（RP-06）として許容する判断（Lane 9 2-2 と同じ）。軍略 Phase A が CORE に入ると型ラベルが「重撃型（軍略）」になる＝そのときは丸めを再検討。
4. ④ 前回比の採否は G8 の実測待ち（本書では推測）。
5. CLAUDE.md §4 の OTOMO「空配列」・「resonanceEffects 共通」記述は stale（Lane 9 1-2 と同じ指摘・本書は read-only）。
6. 効果見込みは全件【推測】。採用後も実プレイ指標は取れないため、合否は Human QA 設問（§4-2）で判定する運用になる。
7. 指示文の途切れ：途切れた先に「長期やり込み（神階・Ranking）」が含まれていた場合、本書 §2 #22・#26・#27 の保留扱いで足りるかを再確認する。

### 6-2. 次の作業（推奨順・すべて AI 判断範囲）

| # | 作業 | 担当 |
|---|---|---|
| 1 | v1.0.3 Fast Gate で measure-all（SP 9.5px のはみ出し）を実行し、G8 の Before 値（敗北画面の行数）を同 Gate で記録 | PM |
| 2 | 本書を `docs/RETENTION_INTEGRATION_PLAN_V1.md` として取り込むか判断（docs-only commit・v1.0.3 公開後）・DECISIONS 行の採番（AI 判断として） | PM |
| 3 | v1.0.3 Production 公開後、master 起点で `feat/v1_0_4-retention-bundle` を作成し ①→②→③ を 1 commit ずつ実装 → §3-4 G1〜G7 → CEO 目視 §3-5 Q1〜Q4 | Dev |
| 4 | §4-1 の sim 4 本（Daily verdict 分布／NM1 出現／前回比単調性／Lv5 到達戦数）を既存ハーネスで 1 回ずつ実行し、③ の「未解」率と ① の到達帯を確定 | Planner |
| 5 | G8（敗北画面の行数）を測り ④ を同 Release に入れるか v1.0.5 へ分離するか決める | PM＋Dev |
| 6 | 別束（Lane 7 #13〜#15・Lane 8 #17〜#19）は各 Lane の計画に従い、`battle.css`／`combatTimeline.ts` を触る束と本束を **同じ Release の別 PR** にする | PM |

---

## 付録 A. 根拠 file:line（RC `SevenGodsGame-lane3` `1343024`）

- Home Primary（解消済み）：`src/components/setup/homePrimary.ts:45-50`（`isFirstBattleOnly`）・`:61-68`（A→B→C'→D→C）
- Next Goal：`src/components/battle/nextGoal.ts:97-117`（D1〜D4・D4 は `:100-105`）・`:152-164`（NR1）・`:165-169`（N4）・`:195-205`（N8・`needsDoji` 文言 `:201`）・入力型 `:55-82`
- Daily 差分：`src/components/battle/dailyDiff.ts:19-25`（`DailyDiffCurrent` に `status`／`round`）・`:52-96`／`src/hooks/dailyStorage.ts:26-31`（`DailyResult.status`／`round`）・`:197`（`bestResultOf`）／`src/hooks/dailyClock.ts:34-39`（`msUntilNextDailyKey`）・`:46-51`
- 結果文脈：`src/components/battle/resultContext.ts:23-29`（`ResultEngineSnapshot`）・`:73-86`（daily 分岐）・`:89-110`（normal 分岐・`todayDaily`・`earlyRead`）／`BattleScreen.tsx:98`（`matchupClear`）・`:716-719`（`collectResultContext` 呼び出し・`matchupClear` prop）
- 結果画面：`src/components/battle/GameOverOverlay.tsx:184`（`defeatText`）・`:195-204`（残り HP・あと一歩）・`:315-319`（初撃破 1 行）・`:323-333`（`game-over-daily`）
- 49 攻略：`src/hooks/matchupStorage.ts:186-197`（`MatchupClearResult`：`isFirstClear`・`enemyClearedCount`）・`:205-227`（`recordMatchupClear`）／`src/components/battle/matchupCelebration.ts:15-22`／`src/hooks/useGameEngine.ts:238`（決着時に 1 回）・`:488`
- 同じ盤面 Retry：`src/components/battle/retrySemantics.ts:37-39`（`isSameBoardRematch`）・`:46`（`resolveRematchSeed`）／`src/components/GameFlow.tsx:398-430`（`onRematch`）・`:162-175`（`backToGodSelect`＝敵リセット）・`:245-250`（`carry`）／`src/components/resultTransitions.ts:18-24`（`NormalCarry`）
- OTOMO 絆：`src/components/setup/otomoGrowthDisplay.ts:79-84`（`computeBondTier`）・`:93-97`（`computeUnlockedForms`）・`:99-132`（`computeNextUnlockText`）・`:208-222`（`computeNextBondGoal`）／`OtomoGrowthScreen.tsx:138-139`（次の解放）・`:156`（ギャラリー）・`:176`（童子到達 N 回）／`src/hooks/otomoBondStorage.ts:62-63`・`:148`（`dojiReached`）
- Home Today：`src/components/setup/HomeTodayPanel.tsx:56-60`（`day`・`bestResultOf`）・`:91-117`（残り／ベスト／countdown）／`DailyChallengeScreen.tsx:70`（型）・`:153`（終了文）
- 型ラベル：`src/core/data/enemies.ts:54,100,137,174,215,251,288`（CORE 7 体・7 種）・`:344`（軍略）
- RULES：`src/core/data/rules.ts:146-148`（`mastery.taiyo.b` 0.37）・`:209-215`（`daily`）
- 既存テスト件数：`nextGoal.test.ts` 30・`dailyDiff.test.ts` 11・`otomoGrowthDisplay.test.ts` 27・`homePrimary.test.ts` 15・`resultContext.test.ts` 8・`dailyClock.test.ts` 7・`matchupCelebration.test.ts` 6
- 他 Lane：Lane 6 §2-2（敗因）・§4-2（逆転）・§5-1（共鳴 0.70／0.81）・§7・§8／Lane 7 §4-3・§15 #1・§17／Lane 8 §4-1（`battle.css:5638`）・§9／Lane 9 §2〜§6／`docs/V1_0_3_UX_BUNDLE_V1.md` §0・§2-2／`docs/NEXT_QUALITY_IMPROVEMENT_PLAN_V1.md` §4・§5-3

---

## 9. 補完評価（CEO 補完指示 2026-10-22・再調査なし・§2 統合表と §3 束設計はそのまま維持）

> 番号は CEO 指示の「§9」に合わせた（§7・§8 は欠番）。採点は本書 §2〜§4 の既読事実からの **AI 判断**で、効果の数値根拠は全件【推測】（§4-3）。採点の向き：①②は高いほど効果大、③は高いほど **低コスト**、④は高いほど **既存ルールへの影響なし**、⑤は高いほど **セーブ互換・商用原則の問題なし**。

### 9-1. 5 項目 × 5 基準（1〜5 点＋根拠 1 行）

| 項目 | ①次の 1 戦を始めたくなるか | ②「解く楽しさ」を強化できるか | ③実装コスト | ④既存ゲームルールへの影響 | ⑤セーブ互換・商用原則 | 合計 |
|---|---|---|---|---|---|---|
| **Daily「今日の問い」最小版**（§2 #10・束 ③） | **4**：「明日の問いは【型】」が翌日の 1 戦の理由になる（今日の 2〜3 回目は既存 D1〜D3 が担う） | **4**：verdict「解けた／未解（R{n}）」で「問いを解けたか」が結果画面で初めて言える（DAILY_RETENTION_LOOP_PREFLIGHT §2 Root Cause の直撃） | **3**：≈31 行・7 ファイル＝束の中で最大（`dailyDiff`／`nextGoal` D4／`resultContext`／`HomeTodayPanel`／`DailyChallengeScreen`／`dailyClock`） | **5**：Daily semantics（同日同 Seed・3 回・開始時消費・JST）不変・engine 0・`results[]` の保存済み `status`／`round` を読むだけ | **5**：storage 書き込み 0・`sevengods.daily` v1 据え置き・countdown 露出条件不変（FOMO 不変）・Pay to Solve／ガチャ／スタミナ／ログイン強制 0 | **21** |
| **49 Progression → 次の目標 NM1**（§2 #9・束 ②） | **5**：初撃破の直後に「別の神でも攻略する（この敵 k/7 神）」＝次の 1 戦の相手が決まる（≤48 回の瞬間限定） | **3**：同じ敵・同じ予告列（seed 非依存）を別の神で解き直す＝解法の多様性。推奨手 0 なので「教えられる感」は無い | **4**：≈15 行・3 ファイル（`nextGoal` 1 ルール・`resultContext` 4 行・`BattleScreen` 1 行） | **5**：Next Goal の順序に 1 ルールを足すだけ（NR1 の後・N4 の前）。既存 N5〜N10・`matchups` の記録規則は不変 | **5**：`sevengods.matchups` v1 の読み取りのみ・新 state 0・母数 49 は出さない（「やらされる」感の回避） | **22** |
| **OTOMO 育成（絆 ★3 到達可能化）**（§2 #8・束 ①） | **2**：長期の到達先（≈18〜28 戦【推測】）であり、次の 1 戦の直接動機にはなりにくい | **1**：戦闘非関与（決定212「外しても差 0.03」・決定214 NO-GO 継続）＝解く楽しさとは別軸 | **5**：≈11 行・純関数 3 つ＋テスト更新（本束で最小） | **5**：表示層の到達条件のみ。共鳴・形態変化・`powerPathEffects` は不変 | **4**：`sevengods.otomoBond` 据え置き・書き込み 0。既存 Lv5 記録は適用時に ★3 へ **昇格のみ**（降格 0・表示変化を G5 で確認） | **17** |
| **敗北から再挑戦する動機**（v1.0.3：事実行 1 行＋同じ盤面 Retry 既存＋RETURN TO CALM +200ms／v1.0.4：前回比＝§2 #11・束 ④ Stage B） | **4**：Lane 6 §2-2「敵 ≤25% で敗北 84%」＝「あと一歩」が構造的に多く、同じ盤面 Retry（決定196）が既に受け皿。前回比は「進んだ」を見せて 2〜3 回目の再戦を支える | **5**：Solve Loop の「Learning」を画面が返す（前回 R4・23% → 今回 R5・8%）＝解く楽しさの核心。事実行（加護で受けていれば残 HP X）と対で「次は分かる」 | **3**：前回比 ≈26 行（`retrySemantics` 純関数＋`GameFlow` session state＋結果画面 1 行）。v1.0.3 分は別 Dev 実装中 | **5**：決定196 の延長（seed・勝敗・スコア不変）。決定263 の境界内（過去の事実のみ・推奨手 0） | **5**：session 内 state・保存 0・ブラウザ更新で消える＝正直に出さない。商用原則 0 | **22**（Stage B 条件付き＝G8 の行数判定は不変） |
| **2 戦目→3 戦目の継続導線**（束 #3 の先・§9-2） | **4**：2 戦目の結果画面で 3 戦目の相手を通常戦で 1 つ示す（NM1 案 B）＝追加実装 0 で満たす | **3**：3 戦目が「別の神で同じ敵」なら解法の違いを体験できる。「魔獣（予告を読む）」の次に自然 | **5**：本束 ②③ で満たすため **追加 runtime 0** | **5**：Home Primary（A→B→C'→D→C）は変えない（決定193・v1.0.3 束 #3 を再提案しない） | **5**：新 state 0・ログイン強制 0（Daily は Today CTA から任意） | **22** |

### 9-2. 「2 戦目→3 戦目」に束 #3 の先で何が要るか（1 段落）

v1.0.3 束 #3 で初陣直後の Home Primary は「神を選ぶ」になり、初陣に勝てば結果画面 NR1 が 2 戦目の相手（双牙の魔獣・予告を読む戦い）を示す（`nextGoal.ts:152-164`・解消済み＝再提案しない）。問題は **2 戦目の結果画面と、その後の Home** にある：2 戦目を終えると `isFirstBattleOnly` が偽になり Home は D「神域へ挑む」（★5・HP×1.25／ATK×1.15）が金色 Primary に戻り、結果画面も N4「今日の神域挑戦」が最初に成立する（`nextGoal.ts:165-169`）＝**3 戦目の候補が「最高難度の Daily」しか無い**。Lane 6 §2 の初級代表（h-balanced）は hard で ≈72%・Daily は通常と hard の間【推測】なので、3 戦目で Daily に負ける経路は OB-05「少し難しい」の候補になる【推測】。束 #3 の先に要るのは「2 戦目の結果画面で、通常戦の 3 戦目の相手を 1 つ示す」ことであり、本束 ② NM1（案 B：NR1 の後・N4 の前）がこれを **追加実装 0 で担う**（2 戦目の魔獣撃破は初撃破＝NM1「双牙の魔獣を別の神でも攻略する（この敵 1/7 神）」が出て、3 戦目は通常戦に留まる。負けた場合は既存 N1「同じ盤面でもう一度」＋v1.0.3 事実行で足りる）。Home 側の D（Daily）は決定193 の「Daily を強制しない」の範囲内でそのまま残し、Daily の意味づけは本束 ③ の「今日の問い」1 行が補う。Home「神を選ぶ」Secondary への 1 行追加（§2 #25）は P13「5 秒で約束」と衝突し得るため保留のまま。新 state・新画面・ログイン導線は増やさない。

### 9-3. 結論（維持）

- **v1.0.4 候補 3 件を維持**：①絆 ★3 到達可能化（17 点・最小コスト・長期の到達先）／②49 攻略の次目標 NM1（22 点・2→3 戦目の導線を兼ねる）／③Daily「今日の問い」最小版（21 点・翌日の理由）＝Stage A ≈57 行。④同じ盤面 Retry の前回比（22 点）は **Stage B 条件付きのまま**（v1.0.3 の事実行を含む敗北画面の行数を Fast Gate G8 で測ってから同 Release か v1.0.5 かを決める）。採点で順位は変わらない。
- **v1.0.3 への混入禁止**：本束は `GameOverOverlay.tsx` を別 Dev の事実行と共有するため、v1.0.3 RC（`release/v1_0_3-rc`）には入れない。**v1.0.3 Production 公開後に master 起点で別 branch（`feat/v1_0_4-retention-bundle`）で着手**し、①→②→③ を 1 commit ずつ・各 revert 可能にする。
- リポジトリへの書き込み・commit・push：本補完も含めて **0**（本書はスクラッチのみ）。CEO 判断：引き続き **不要（0 件）**（§5）。
