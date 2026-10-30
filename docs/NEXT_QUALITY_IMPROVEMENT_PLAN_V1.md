> **状態（2026-10-21・Lane 5「UX・次期品質改善」・Planner／Designer・READ-ONLY・docs-only・AI 判断）：Production v1.0.1（`1ce9876`）と Lane 1 制作中の v1.0.2 RC（`SevenGodsGame-lane2b` `release/v1_0_2-rc` `fe1eb37`・軍略 Pilot v1.1 × Enemy Break v1 ＋ 初心者語彙ホットフィックス 3 点）を前提に、①初心者導線監査（`FIRST_PLAYER_TUTORIAL_AUDIT_V1.md` §8）の未対応 18 件を再整理（Lane 1 で解消 2 件・残 16 件＝A 3／B 6／C 7）、②戦闘爽快感・HUD・カード視認性の既存監査 13 本の結論を 1 表に集約（PASS／LIVE 14 領域・OPEN 残課題 27 件）、③次の改善 16 件を効果 × コスト × リスクでスコア化し、④上位 5 件を v1.0.3 候補 3 束として仕様スケッチ化した。推奨＝**束 #1「初心者語彙 完結」（A-4 防御↔ブロック・B-3 連撃絵文字・A-3 強打／特大コツ）**＋**束 #2「SP 戦闘可読性」（カード本文 9.5px の引き上げ・浮遊数字の縁取り・神 HP コントラスト）**＋**束 #3「Home 2 戦目導線」（初陣直後の Primary を「神を選ぶ」へ・条件付き）**。runtime 見積 合計 ≈20 行・engine 0・gameVersion 0・save 0。束 #1・#2 は Lane 1 と同じファイル（`tutorialContent.ts`・`battle.css`）を触るため **v1.0.2 公開後に着手**。CEO 判断は v1.0.3 Production 公開（§6-3 #8）のみ・新規 0 件。本書は調査・設計のみ：runtime／engine／CSS／テスト／scripts 変更 0・新規計測 0（スクリーンショット・Playwright・dev サーバー・vitest・build 起動 0）・他 worktree の編集 0・push 0。**

# Next Quality Improvement Plan v1 — 次期品質改善計画（v1.0.3 候補）

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| **初心者導線 未対応 18 件の現状** | Lane 1 の 3 点修正（(a) 神技発動→神の一撃／(b) ①神技→得意技／(c) ② 図 SVG＋50）で **A-1・A-2 の 2 件が解消**。残 **16 件（A 3／B 6／C 7）**。「同梱 B-3」（② の ⚔ 除去）と「案 2」（防御（ブロック）橋渡し）は Lane 1 に含まれず**未対応のまま**（§2） |
| **戦闘爽快感・HUD・カードの到達点** | 既存監査 13 本のうち **決定226／229／230／231／232／233／234／235／236／237／238／239／246／247／249 は PRODUCTION LIVE**。Enemy Break v1 は v1.0.2 RC で PENDING CEO。残る OPEN は 27 件（§3）。うち「次に効く」のは **SP カード本文 9.5px（可読性未実測）**・**Hand Close FLIP**・**敵占有率 5.1〜5.4%（目安 8%）**・**SE 実音源（BF-01 ★課金）**の 4 つ。新しい計測は本書ではしない |
| **スコア上位 5 件（§4）** | ① A-4 防御（ブロック）橋渡し 25.5 ／ ② 浮遊ダメージ数字の縁取り 22.0 ／ ③ SP カード本文の引き上げ 22.0 ／ ④ Home 初陣直後の Primary 21.5 ／ ⑤ B-3＋A-3 連撃絵文字除去＋強打・特大コツ 21.0。（6 位 敗北 RETURN TO CALM 20.5・7 位 Hand Close FLIP 19.0） |
| **推奨 3 束（§5）** | **束 #1「初心者語彙 完結」**＝①＋⑤（`tutorialContent.ts` 4 行＋テスト 3 行・engine 0）／**束 #2「SP 戦闘可読性」**＝②＋③＋神 HP コントラスト（`battle.css` 4〜6 行＋`hudPlate.css` 1 値・測定 Gate 必須）／**束 #3「Home 2 戦目導線」**＝④（`homePrimary.ts` 1 関数＋テスト・**条件付き**） |
| **Lane 1 との衝突** | 束 #1（`tutorialContent.ts`・`tutorialWording.test.ts`）と束 #2（`battle.css`）は Lane 1 の編集ファイルと重なる → **v1.0.2 公開後に着手**（RC branch から派生）。束 #3（`homePrimary.ts`・`homePrimary.test.ts`）は Lane 1 の 35 ファイル差分に含まれない → v1.0.2 公開を待たず branch 作成可（Gate 実行は RAM 競合のため Lane 1 Gate 終了後） |
| **コスト合計** | runtime ≈20 行（束 #1 4・束 #2 6〜8・束 #3 ≈8）＋テスト ≈12 行。engine／storage／gameVersion／save／画像 0。Dev ≈2.5 h＋Fast Gate 3 回（各 ≈30 分・束 #2 はスクリーンショット Gate 込み ≈60 分）＋CEO 目視 計 ≈10 分 |
| **CEO 判断** | **新規 0 件**。全件 CLAUDE.md §6-2（軽微な UI・UX 調整／既存仕様の範囲内の改善／バグ修正）。束 #3 は決定193 §6 の Primary 順序見直しに当たるが AI 判断範囲＝採用時に `docs/DECISIONS.md` に AI 判断として記録。必要なのは v1.0.3 Production 公開承認（§6-3 #8）のみ |
| **閉じたレバーとの関係** | 決定263 Card Decision Meaning・決定216 龍神 R4・決定214 OTOMO 7 体・Living Background（決定220〜222）には **一切触れない**（§4 の候補からも除外） |

## 1. 方法・範囲・前提

- READ-ONLY：cat／sed／grep／git log／git diff --stat／git status のみ。node・vitest・build・Playwright・dev サーバー・ブラウザ：起動 0。スクリーンショット新規 0。他 worktree の編集・git 操作 0
- 書いた場所：`SevenGodsGame-lane3`（`docs/lane3-quality-next-audit`・`72a69db` 起点）本書 1 ファイルのみ
- 読み取り専用で参照：`SevenGodsGame-lane2b`（`release/v1_0_2-rc` `fe1eb37`・**v1.0.1 master の merge 作業中**＝`git status` に staged M／MM が 13 件・merge-base は `7ba447f`。本書の行番号参照は `fe1eb37` 時点の作業ツリー）／`SevenGodsGame`（main repo・`feat/d224-premium-payoff-pilot` dirty・`docs/` untracked 監査文書）／`SevenGodsGame-rc101`（v1.0.1 の記録：`RELEASE_STATUS.md` §A-0／A-4・`DECISIONS.md` 決定270〜281）
- 読んだ文書：`FIRST_PLAYER_TUTORIAL_AUDIT_V1.md`（全文）・`DECISION225_BATTLE_SCREEN_PREMIUM_QUALITY_AUDIT.md`・`DECISION229_COMBAT_FEEL_V2_BATTLE_COMPOSITION_AUDIT.md`・`HUD_PREMIUM_PRE_AUDIT.md`・`DOCK_CONTROLS_PRE_AUDIT.md`・`LANE3_CARD_PREMIUM_V2_PRE_AUDIT.md`・`CARD_PLAY_TRAVEL_PRE_AUDIT.md`・`CARD_TEXT_OVERFLOW_HOTFIX_PRE_AUDIT.md`・`SOUND_PREMIUM_PRE_AUDIT.md`・`PRACTICAL_QA_2026-09-28_AUDIT.md`・`SEVENGODS_NEXT_MILESTONES.md`・`SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md`・lane2b `COMBAT_FEEL_PREMIUM_V2_PILOT.md`・`LANE2_COMBAT_FEEL_V2_PRE_AUDIT.md`・`COMBAT_PILOTS_INTEG_GATE_V1.md`・lane3 `LANE3_QUALITY_NEXT_STEPS_AUDIT_2026-10-17.md` §0〜§1・`MASTER_BACKLOG_AUDIT.md`（UX／BF／CF／AR 行）・`FIRST_PLAYER_QA_KIT_V1.md`（状態行）・`FIRST_PLAYER_UX_IMPROVEMENT_PROPOSAL_V1.md`（案 C／D 行）
- 読んだコード（lane2b・読むだけ）：`components/setup/homePrimary.ts`・`StakeSelector.tsx`・`GodSelectScreen.tsx:212-232`・`components/tutorialContent.ts`・`TutorialOverlay.tsx:40-48`・`tutorial.css:118-122`・`components/battle/{CardView.tsx:85-150, cardStyle.ts:140-172, cardBonusText.ts:10-20, decisionFeedback.ts:225-235, defeatCause.ts:45-58, GodOtomoPanel.tsx:183-187, enemyVfxTiming.ts:160-175, useCombatPresentation.ts:150-178, combatTimeline.ts:302-311, battleEntrance.ts, battle.css:496-561,4098-4110,4564-4590,5350-5385,5605-5615, hudPlate.css}`・`core/data/stakes.ts:152-164`・`hooks/tutorialStorage.ts`
- Lane 1 の runtime 差分（`git diff --stat 1ce9876 fe1eb37 -- src`・35 files・+2,876／−420）のうち **v1.0.2 固有**：`EnemyPanel.tsx`・`BattleScreen.tsx`・`enemyBreak.{ts,css,test.ts}`・`pilot/pilotFlag.{ts,test.ts}`・`setup/MatchupBoard.tsx`・`core/data/{enemies,rules}.ts`・`core/engine/{intent,round,tactic}.ts`・`core/types/enemy.ts`・`core/replay/gameVersion.ts`・`hooks/useGameEngine.ts`・`cardStyle.test.ts`・`coreRoster.test.ts`＋sim テスト。`TutorialOverlay.tsx`・`tutorialContent.ts`・`firstBattle.ts`・`EnemySelectScreen.tsx` は v1.0.1 merge 由来。**`fe1eb37` 時点ではホットフィックス (a)(b)(c) は未適用**（`GodOtomoPanel.tsx:185` は「神技発動」のまま・`TutorialOverlay.tsx:44` は「⚔ 次の攻撃：{amount}」のまま）＝Lane 1 が merge 後に適用する前提で本書は「解消予定」として扱う
- 採点の前提（§4）：**効果 E**＝Player Value＋Game Feel＋UX＋Retention（各 0〜5・合計 0〜20）／**コスト C**（0〜5・5＝最小：runtime 行数・テスト・CEO 時間）／**リスク R**（0〜5・5＝最小：engine／gameVersion／save への影響・既存 Gate・Lane 1 衝突）。**合計＝E ＋ 1.5C ＋ 1.5R（最大 35）**。初見プレイヤーの実データは 0 名のまま（QA Kit v1 未実施）＝効果の採点は推測（§6）

## 2. 初心者導線 未対応 18 件の再整理（タスク 1）

出典＝`FIRST_PLAYER_TUTORIAL_AUDIT_V1.md` §8。「Lane 1 で解消」＝v1.0.2 RC の語彙整合ホットフィックス 3 点（(a)(b)(c)）で消えるもの。**「同梱 B-3」「案 2」は Lane 1 に含まれないため未対応側に残す。**

| ID | 重大度 | 該当画面 | 問題（要約） | 根拠（file:line・lane2b） | 既存改善との重複 | Lane 1 で解消 | 本書の扱い |
|---|---|---|---|---|---|---|---|
| A-1 | A | 戦闘 共鳴名札／遊び方 ① | 「神技」が BURST／Mastery／得意技の 3 義 | `GodOtomoPanel.tsx:185`・`tutorialContent.ts:61` | 新規（監査 v1） | **解消**（(a)(b)） | **除外** |
| A-2 | A | 遊び方 ② 図 | 「⚔ 次の攻撃：5」が ×10 未反映・絵文字・接頭語 | `TutorialOverlay.tsx:44` | 新規 | **解消**（(c)） | **除外** |
| A-3 | A | 初陣 R3〜R5 予告 | 「強打」「特大」とグリフ変化（R4 は必殺と同じ burst）が未説明 | `enemies.ts:72-82`・`cardStyle.ts:146-152` | 新規 | ✗ | **束 #1**（コツ 1 本） |
| A-4 | A | Brief ②／遊び方 ③／コツ ③ ↔ 手札・加護 | 「防御」と「ブロック」の橋渡しなし（SP では「防御」の語が戦闘画面に出ない）。v1.0.1 テストが「ブロック不使用」を誤前提で固定 | `common.ts:88,97,128,204`・`oraclePreview.ts:105`・`battle.css:5364`・`tutorialWording.test.ts:46` | 新規（＝監査 §9 案 2） | ✗（案 2 は不含） | **束 #1** |
| A-5 | A | Home（初陣直後） | 金色 Primary が「神域へ挑む」（最高難度）・「神を選ぶ」が二次 | `homePrimary.ts:49-54`（D daily が C normal より先） | UX-01 と隣接（別件） | ✗ | **束 #3**（条件付き） |
| B-1 | B | 遊び方 ④／初陣手札 | 「小さな託宣」「神託」カード × 「託宣」バーの語衝突 | `deckBuilder.ts:167,169`・`tutorialContent.ts:82` | 部分対応（④ は「神託」のみ） | ✗ | v1.1（④ 再構成と同時・§4 #13） |
| B-2 | B | 手札 条件行／判断フィードバック | ⚡ が「溜め（危険）」「条件成立（好機）」「連携！」の 3 用途 | `cardBonusText.ts:16`・`decisionFeedback.ts:231`・`cardStyle.ts:163` | 決定224 READY material・決定240 の資産 | ✗ | v1.1（§4 #12・記号設計を伴う） |
| B-3 | B | 遊び方 ② | 「⚔ 連撃」と書くが合計 ≥15 の連撃は burst グリフ | `cardStyle.ts:146-152`・`tutorialContent.ts:69` | 新規（＝監査「同梱 B-3」） | ✗（同梱は不含） | **束 #1** |
| B-4 | B | 手札（SP375） | カード本文 9.5px・条件行 9px。可読性の実測なし | `battle.css:5368-5378` | Practical QA #12「SP で効果文が畳まれる【要確認】」と同件 | ✗ | **束 #2**（測定 Gate 必須） |
| B-5 | B→**C** | 2 戦目 難易度画面 | 「神階」が無説明で出る | `GodSelectScreen.tsx:220-227` | UX-01／UX-02 | ✗ | **据え置き（重大度を C に下げる）**：初見の 2 戦目は `maxSelectable === 0` のロック表示「🔒 この神で「むずかしい」を1回撃破すると解放」＋フレーバー 1 行（`StakeSelector.tsx:40-50`）が出るため、選べない段階で説明は足りる（監査 v1 は locked 分岐を読んでいなかった） |
| B-6 | B | 手札（SP） | 先頭絵文字 6 種（✨🌿💀🌟）の意味が遊び方に無く SP ではタイプ名も消える | `cardStyle.ts:14-19`・`battle.css:5364` | 新規 | ✗ | v1.1（③ の図を記号凡例に・§4 #11） |
| C-1 | C | Brief ② | 神力が増えることが Brief に無い | `firstBattle.ts:36` | 決定193 §8（120 字） | ✗ | 据え置き |
| C-2 | C | 手札 | 手札上限 10・捨札が無説明 | `rules.ts:37-39` | — | ✗ | 据え置き |
| C-3 | C | 手札 | 使えない札の暗転理由の文字表示なし | `CardView.tsx:89,96` | 遊び方 ③ で説明 | ✗ | 据え置き |
| C-4 | C | 敗北画面 | 「必殺」（遊び方）と「必殺技」（敗因）の表記ゆれ | `defeatCause.ts:52` | — | ✗ | 束 #3 に同梱可（1 語・`defeatCause.ts` は Lane 1 非対象・§4 #15） |
| C-5 | C | — | `tutorialSeen` が write-only（`hasSeenTutorial` の呼び出し 0＝grep 再確認） | `hooks/tutorialStorage.ts:11` | TD | ✗ | TD（セーブ互換に触れないが削除は別 commit） |
| C-6 | C | — | `tutorial.css` コメント「最大4行」が 6 本と不一致 | `tutorial.css:198-201` | — | ✗ | 束 #1 に同梱（コメント 1 行） |
| C-7 | C | 手札（鉄壁の構え 等） | 本文に「このラウンド」が無い | `common.ts:204` 他 | `cardTextScale.test.ts` 照合 | ✗ | 据え置き（v1.0.1 コツ ③ で補う） |

**集計**：18 件 → Lane 1 で解消 **2**（A-1・A-2）／残 **16**（A 3：A-3・A-4・A-5／B 6：B-1〜B-6（B-5 は C 相当に格下げ）／C 7）。本書の束 #1〜#3 で **A 3 件すべて＋B-3・B-4＋C-4・C-6 の計 7 件**を扱う。残 9 件は v1.1（B-1・B-2・B-6）・据え置き（C-1・C-2・C-3・C-7）・TD（C-5）。

**Lane 1 統合時の注記（監査 v1 §10-5 の再掲・本書では決めない）**：鬼将 R3 の予告 label「⚠ 傷が浅ければ次は断岩」（Pilot 隔離・`?pilot=threat`）は条件分岐の予告で、遊び方 ②「⚡『溜め』は次のラウンドに大技が来る合図」と「必ず来る」ニュアンスで食い違う。Pilot が隔離解除（7 体展開 Phase A）される時に ② を「大技が来る合図（敵によっては条件つき）」等へ広げる判断が要る。束 #1 の文言はこの拡張余地（② 76→74 字）を残す。

## 3. 戦闘爽快感・HUD・カード視認性の到達点（タスク 2・既存文書の集約）

新規計測なし。「状態」＝各文書の末尾記載と `RELEASE_STATUS.md` A-2（Production 機能一覧）の突合。OPEN は各文書の「残課題／Known／後続」から転記し、lane2b のコードで実装の有無を grep で確認したものに ✔ を付けた。

| # | 領域 | 文書（決定） | 状態 | PASS 済み（要点） | OPEN（残課題） | 次に効くか |
|---|---|---|---|---|---|---|
| 1 | 勝利の舞台（撃破→勝利） | DECISION225 → 決定226 Victory Reveal | **LIVE** | `keyvisual-hero` の舞台・「勝利」明朝・count-up・tap skip・新規 asset 0 | PC-4 `handLimit: 10` でアリーナ ≈430→≈190px／READY 札が SP 横スクロール外に出る／未使用の金の斬撃線 CSS | 低（PC-4 は稀） |
| 2 | 対峙構図（敵と神の大きさ） | DECISION229 → 決定229 v2 | **LIVE** | SP 舞台レイヤー分離・敵反転・OTOMO 0.75 倍・着弾が絵の中 100%・CEO QA PASS | **敵占有 5.1〜5.4%（目安 ≈8%）**／OTOMO 38〜50px／鏡像で利き手逆／魔獣が攻撃時に神と ≤20px 接触／案 C（trim）・案 D（PC HUD 縦圧縮）未着手＝UX-04（L・HIGH） | 中（効果大だが L・HIGH＝v1.1） |
| 3 | SP 得意技バッジ切れ | DECISION230 | **LIVE** | 決定229 §残課題 → 決定230 hotfix | — | — |
| 4 | HUD の素材（ガラス板→Plate） | HUD_PREMIUM_PRE_AUDIT → 決定235 | **LIVE** | pill 3〜5→0・blur 1→1・|Δ|>0.5px 0 件・9 テスト | **R1 神 HP 白×緑 コントラスト 1.96**／R2 名前 −3〜−7%／R3 名札背後の背景／次候補：上部バー・欧文数字書体 | 低〜中（R1 は 1 値） |
| 5 | ドック操作列 | DOCK_CONTROLS_PRE_AUDIT → 決定234 | **LIVE** | metric-locked・SP 操作列 96→106px・A1〜A10 PASS | iPhone `auto-phrase` 非対応／託宣ボタンの省略（K09）／チュートリアルは旧配色 | 低 |
| 6 | カード Premium v2（大耀） | LANE3_CARD_PREMIUM_V2 → 決定231・236 | **LIVE** | コスト珠修正（+15）・Art Window v2（文字開始 30.2→54.9%）・Human QA PASS | After-2 新原画＝**CEO master 待ち**（AR-04・P2 カード画質統一と同線）／`setup.css:763` デッキ構築側 未検証 | 中（P2 カード画質統一は別 Lane 領域） |
| 7 | カード文言はみ出し | CARD_TEXT_OVERFLOW → 決定238 | **LIVE** | 140px 時のみ専用行非表示（+8 行・契約テスト 4 件）・余裕 5.5〜5.94px | 端末フォント +10% で姉御の号令 +11.06px／文言変更時は measure-all を Gate／デッキ構築側 未検証 | **束 #2 の前提**（本文 px を上げる時は同 Gate 必須） |
| 8 | カードが神へ飛ぶ | CARD_PLAY_TRAVEL → 決定237・239 | **LIVE** | cast-flash 黒四角解消・ゴースト 240ms・N1〜N10 PASS・iPhone QA PASS | **Hand Close FLIP（120ms・K6／R4）＝未実装 ✔（grep `FLIP\|hand-close` 0 件）**／Showcase（案 C）保留／明るい背景で淡い（R-a）／全札が飛ぶ不自然さ（K5） | 中（Game Feel・`BattleScreen.tsx` が Lane 1 対象） |
| 9 | 音（押下即応） | SOUND_PREMIUM → 決定233 Tap Feedback | **LIVE** | 押下 0〜2ms・commit `card_play` 0・重複 0・7/7 ≤5 層・iPhone QA YES | 候補 B 最上段分離（`hit_l4`）／C BGM Web Audio／D 先読み／v1.1 音程・hover・拒否音／**E・F 新音源＝BF-01 ★課金**／K6 `hit_l4` true peak +2.2dBFS／R5 iOS volume | 中（★を伴う） |
| 10 | 一撃の重さ | LANE2_COMBAT_FEEL_V2 → 決定232 v1.1 | **LIVE** | hit stop 梯子 L1 30〜撃破 90ms・溜め 150ms（CEO「以後調整しない」） | K1〜K6（K2 SP +4px 接触・K6 ⚡ +340ms 未観測） | 低（CEO 凍結） |
| 11 | 実プレイ QA 14 件 | PRACTICAL_QA_2026-09-28 → 決定244 | 9 SUPPORTED → 対応 | RC1 → 決定246 Combat Tension LIVE／PC 反転 → 決定247 LIVE／RC3 キャラ反応 → 決定249 Reaction Language LIVE／BossEntrance skip → `battleEntrance.ts` に skip 実装 ✔ | RC2 敵語彙 4 種 → **Lane 1 軍略 Pilot（enemy_09 隔離・7 体展開 Phase A は CEO 未承認）**／RC5 Home keyframes 0 → K06・閉じたレバー／**#12 SP 効果文が畳まれる【要確認】＝B-4 と同件** | **#12 は束 #2** |
| 12 | Enemy Break v1（HP 50／25% 崩れ） | lane2b COMBAT_FEEL_PREMIUM_V2_PILOT → 決定283 候補 | **v1.0.2 RC・PENDING CEO** | Fast Gate PASS・kb −7.0／−8.7px・階層 half 7 < quarter 10・CEO 実プレイ 6/6 | R1 着弾直後の重なり「2 回殴った」／R3 傷の円が薄い／**R4 SE なし**／L4 斬撃の箱 13〜15px はみ出し／hard HP 55〜64 演出ずれ（Known・現状維持） | Lane 1 領域（本書は扱わない） |
| 13 | 敗北の間（RETURN TO CALM） | BF-03・`enemyVfxTiming.ts` | **PARTIAL ✔** | `planResultGate` が `visualHpEndMs + 120`（`combatTimeline.ts:305`）で帳票を 1 拍遅らせる | BF-03 の仕様値 150〜300ms と結果画面 BGM 即再開のラップは未確認（K25 ジングル前即停止） | 中（§4 #6） |
| 14 | 浮遊ダメージ数字 | BF-07／K28（道化 紅背景） | OPEN | `.floating-number` text-shadow `0 2px 4px #000, 0 0 14px currentColor`（`battle.css:522-524`）・段階サイズ L1 15px〜L4 | 紅背景での `#ff6b6b` 文字のコントラスト未測定・縁取り（stroke）なし | **束 #2** |
| 15 | その他 Known | K22〜K29・BF-08 | OPEN | — | OTOMO 反応 SP 小（K22）／Auto Focus 停止位置（K27）／Enemy Select cold load 1〜3s（K28＝UX-05）／701〜899px 縦スクロール（K29）／バナー MATERIAL 残（BF-08） | 低〜中（UX-05 は §4 #10） |

**読み**：戦闘演出（P3）は決定224〜267 で「素材・重さ・構図・音・勝利・反応」の各層が一度ずつ通っており、残る OPEN は (i) **可読性の未実測**（B-4／#12／BF-07／R1）、(ii) **一段上の Game Feel**（Hand Close FLIP・敵占有 8%・SE 実音源）、(iii) **★課金を伴う素材**（After-2・BF-01・AR-01）の 3 群。CEO 方針（P2 カード画質統一 → P3 戦闘演出）と「既存成果の再利用優先」に照らすと、(i) は小さく確実、(ii) は v1.1 の Pilot 候補、(iii) は別 Lane（Card Art）と CEO 課金判断に委ねるのが筋。本書は (i) を束 #2 に、(ii) を §4 の下位候補に置く。

## 4. 候補 16 件のスコア（タスク 3）

採点規則は §1。「Lane 1」列＝v1.0.2 RC と同じ runtime ファイルを触るか（✔ なら v1.0.2 公開後に着手）。

| # | 候補 | 対象 ID | PV | GF | UX | Ret | E | C | R | **合計** | Lane 1 | 判定 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 防御（ブロック）橋渡し：遊び方 ③・コツ ③ に「（ブロック）」＋テスト前提修正 | A-4 | 4 | 1 | 4 | 3 | 12 | 5 | 4 | **25.5** | ✔ `tutorialContent.ts` | **束 #1** |
| 2 | 浮遊ダメージ数字の縁取り（`-webkit-text-stroke` or 2 層 shadow） | BF-07／K28 | 1 | 2 | 3 | 1 | 7 | 5 | 5 | **22.0** | ✔ `battle.css` | **束 #2** |
| 3 | SP カード本文 9.5→10px／条件行 9→9.5px（measure Gate 付き） | B-4／QA #12 | 3 | 2 | 5 | 3 | 13 | 3 | 3 | **22.0** | ✔ `battle.css` | **束 #2** |
| 4 | Home 初陣直後の Primary を「神を選ぶ」に（D daily を「痕跡 2 戦以上」に条件付け） | A-5 | 3 | 0 | 4 | 4 | 11 | 4 | 3 | **21.5** | ✗ | **束 #3**（条件付き） |
| 5 | ② の「⚔ 連撃」→「連撃」＋コツ 7 本目「強打・特大」 | B-3・A-3 | 3 | 1 | 3 | 2 | 9 | 4 | 4 | **21.0** | ✔ `tutorialContent.ts` | **束 #1** |
| 6 | 敗北 RETURN TO CALM（120→200ms＋BGM 再開ラップ） | BF-03／K25 | 2 | 3 | 2 | 3 | 10 | 3.5 | 3.5 | 20.5 | ✗（`combatTimeline.ts`・`useCombatPresentation.ts`） | v1.0.3 予備（束 #3 に同梱可・CEO 聴感 1 分） |
| 7 | Hand Close FLIP 120ms（commit 時の手札詰め直し） | Card Travel K6／R4 | 2 | 4 | 3 | 1 | 10 | 3 | 3 | 19.0 | ✔ `BattleScreen.tsx` | v1.1 Pilot |
| 8 | 神 HP 白×緑 コントラスト 1.96 → ≥3.0（1 値） | HUD R1 | 1 | 0 | 3 | 1 | 5 | 5 | 4 | 18.5 | ✗ `hudPlate.css` | **束 #2 同梱** |
| 9 | 敵選択 cold load 1〜3s：背景 7 枚の `<link rel=preload>`／段階読込 | UX-05／K28 | 1 | 0 | 3 | 2 | 6 | 4 | 4 | 18.0 | ✗（`EnemySelectScreen.tsx`＝v1.0.1 merge 由来・v1.0.2 固有差分なし） | v1.0.3 予備 |
| 10 | 遊び方 ③ の図を 6 記号の凡例に | B-6 | 3 | 0 | 3 | 2 | 8 | 3 | 3 | 17.0 | ✔ `TutorialOverlay.tsx` | v1.1 |
| 11 | 遊び方 ④ に「小さな託宣」（④ 再構成） | B-1 | 2 | 0 | 2 | 2 | 6 | 4 | 3 | 16.5 | ✔ | v1.1 |
| 12 | 「必殺」「必殺技」の 1 語統一（敗因側を「必殺」に） | C-4 | 1 | 0 | 2 | 0 | 3 | 5 | 4 | 16.5 | ✗ `defeatCause.ts` | 束 #3 同梱 |
| 13 | 音 候補 B（最上段 `hit_l4` 分離）＋Enemy Break SE | SOUND B／EB R4 | 2 | 4 | 1 | 1 | 8 | 2 | 3 | 15.5 | ✗ `sound.ts`（main repo d224 で dirty） | v1.1（新音源は BF-01 ★） |
| 14 | SP 空き帯 ≈200px／敵占有 8%（案 C trim・案 D PC HUD 圧縮） | UX-04／D229 残 | 3 | 4 | 3 | 2 | 12 | 1 | 1 | 15.0 | ✔ `battle.css` | v1.1 以降（L・HIGH） |
| 15 | ⚡ の 3 用途分離（READY 接頭記号の変更） | B-2 | 2 | 1 | 3 | 1 | 7 | 3 | 2 | 14.5 | ✔ `cardBonusText.ts`（決定224 資産） | v1.1 |
| 16 | `tutorialSeen` dead storage 削除＋`tutorial.css` コメント | C-5・C-6 | 0 | 0 | 1 | 0 | 1 | 5 | 4 | 14.5 | ✗／✔（css） | TD（C-6 は束 #1 同梱） |

**除外した候補（閉じたレバー・別 Lane）**：決定263 系（未来段階表示・おすすめ）／決定216 龍神 R4／決定214 OTOMO 7 体／Living Background／Enemy Break R1・R3（Lane 1 の Pilot 残課題）／After-2 新原画・AR-01 敵アート・BF-01 SE 実音源（★課金・CEO 判断 §6-3 #4／#5／#6）／ランキング（P1a 保留）。

**反証（なぜ上位がこの並びか）**：#3 は効果 E が最大（13）だが、コストに「はみ出し測定 Gate」（決定238 の余裕 5.5px）が乗り、リスクに 140px カードの契約テストが乗るため #1 に負ける。#4 は Retention 4 で効果は高いが、決定193 §6 の順序を覆すため「初見 0 名」の現状では根拠が推測に留まり R 3。#7 Hand Close FLIP は Game Feel 4 だが `BattleScreen.tsx` が Lane 1 対象で、v1.0.2 の Enemy Break と同じ手札〜着弾の時間軸を触るため、Enemy Break の CEO QA 結果（R1「2 回殴った」）を見てから設計する方が安全＝v1.1 Pilot。#14 は効果 12 で最も「見た目が変わる」が L・HIGH（舞台 art 設計要）で v1.0.x の Fast Gate には乗らない。

## 5. v1.0.3 候補の仕様スケッチ（タスク 4・`FIRST_PLAYER_TUTORIAL_AUDIT_V1.md` §10 の形式）

### 5-1. 束 #1「初心者語彙 完結」（候補 #1＋#5＋C-6）— **v1.0.2 公開後に着手**

Lane 1 の v1.0.2 RC が `tutorialContent.ts`・`tutorialWording.test.ts`（v1.0.1 merge＋ホットフィックス (b)）を触るため、**v1.0.2 公開後の master から派生**する。

#### 文言（字数＝コードポイント・`[...str].length` 基準）

| # | ファイル:行（lane2b `fe1eb37`） | 現行 | 案 | 字数 |
|---|---|---|---|---|
| (1) | `src/components/tutorialContent.ts:69` ② | 「…⚡「溜め」は次のラウンドに大技（必殺）が来る合図、**⚔ 連撃**は複数回当たります。防御はそのラウンドだけ有効です。」 | 「…⚡「溜め」は次のラウンドに大技（必殺）が来る合図、**連撃**は複数回当たります。防御はそのラウンドだけ有効です。」 | 76→**74**（B-3：合計 ≥15 の連撃は burst グリフ＝`cardStyle.ts:150-151` のため ⚔ を約束しない） |
| (2) | `tutorialContent.ts:74` ③ | 「…神力の範囲で、攻撃・**防御**・回復のカードを使えます。」 | 「…神力の範囲で、攻撃・**防御（ブロック）**・回復のカードを使えます。」 | 81→**87**（③ 最長のまま・`tutorialWording.test.ts` の「③ が最長」判定は PASS 見込み） |
| (3) | `tutorialContent.ts:108` コツ ③ | 「防御は次のラウンドに残りません。大技が予告されたラウンドに合わせて出しましょう。」 | 「**防御（ブロック）**は次のラウンドに残りません。大技が予告されたラウンドに合わせて出しましょう。」 | 40→**46** |
| (4) | `tutorialContent.ts` TIPS 末尾に 1 本追加（7 本目） | — | 「予告の「強打」「特大」は、ふつうの攻撃より大きい一撃の印です。」 | **31**（A-3：初陣 R3「強打 110」R4「特大 150」R5「強打 130」＝`enemies.ts` 11／15／13 × tier 10／15。どの札で受けるかは言わない＝決定263 境界内） |
| (5) | `src/components/tutorial.css:200` コメント | 「箇条書き最大4行」 | 「箇条書き最大7行」 | コメントのみ（C-6） |

Brief（`firstBattle.ts:34-38`）は **不変**（「防御」のまま・`firstBattle.test.ts` の「ブロック」不使用は据え置き）。「ブロック」を許すのは遊び方 ③ とコツ ③ の 2 箇所のみ。

#### 触るファイルと行数

| ファイル | 変更 | 行 |
|---|---|---|
| `tutorialContent.ts` | :69（②）・:74（③）・:108（コツ ③）・TIPS +1 | **4** |
| `tutorialWording.test.ts` | ② 確定文言 76→74／コツ ③ 40→46／「ブロック」禁止を ③・コツ ③ 以外に限定／TIPS 本数 6→7 | **3〜4** |
| `tutorial.css` | :200 コメント | 1 |
| **合計** | runtime 4 行・テスト 3〜4 行・コメント 1 行。**engine 0・storage 0・CSS 規則 0・gameVersion 0・画像 0** | — |

#### テスト影響（grep 実測・lane2b）

- `tutorialWording.test.ts`：② の確定文言・コツ ③ の字数・「ブロック」不使用・TIPS 本数を固定（v1.0.1 で追加・Lane 1 が merge 中）→ 上表の 3〜4 行を更新
- `firstBattle.test.ts`：Brief 不変＝据え置き
- `a11yMinimum.test.ts`・`entranceWiring.test.ts`：構造のみ＝不変
- SP375 の縦長化：コツ 7 本で `.tutorial-tips` が 1 行（≈18px）伸びる。遊び方はオーバーレイ内スクロール（`TutorialOverlay.tsx` focus trap 済み）のため折返しの実害は無い見込み（スクリーンショット Gate で確認）

#### Fast Gate 項目

1. tsc／oxlint／vitest（full）／vite build
2. スクリーンショット：遊び方 ②③＋コツ（SP375・PC）・SP375 で ② が 7 行以内／コツ 7 本が枠内
3. `ranking-absence.mjs`／Secret Audit（RC 定型）
4. CEO 目視 2 分：遊び方 ③「防御（ブロック）」・コツ 7 本目
5. 文言禁止語チェック：「おすすめ」「正解」「このカード」0 件（決定263・CEO 禁止 5 項目）

#### 決定との整合・CEO 判断

決定193 §8（Brief 3 行 120 字）不変／決定263（未来段階・おすすめ NO-GO）＝どの札とも言わない／決定253 無関係／決定15（託宣／神託の呼び分け）維持。**CEO 判断：不要**（§6-2 軽微な UI・UX 調整）。v1.0.3 Release 承認に同梱。

### 5-2. 束 #2「SP 戦闘可読性」（候補 #3＋#2＋#8）— **v1.0.2 公開後に着手**

`battle.css` は Lane 1 が Enemy Break の着弾・立ち絵層で触る可能性があるため v1.0.2 公開後。`hudPlate.css` は Lane 1 対象外だが同じ Gate（SP375 スクリーンショット）に載せるため同束にする。

#### 変更案

| # | ファイル:行（lane2b `fe1eb37`） | 現行 | 案 | 根拠 |
|---|---|---|---|---|
| (1) | `src/components/battle/battle.css:5368-5371` `body.battle-viewport .card-view-text` | `font-size: 9.5px; line-height: 1.3` | `font-size: 10px; line-height: 1.3`（**第 1 段階**。測定 PASS なら 10.5px を第 2 段階で検討） | B-4：SP 本文 9.5px はモバイル本文の一般的下限（11〜12px）を下回る。116×164px の札で本文 3 行＋条件行 3 行が入る必要があり、Art Window v2 後は文字開始 54.9%＝本文領域 ≈74px。10px なら本文 2〜3 行（13px×3=39）＋条件 2 行（11.25×2=22.5）＋名前 15 ＝ 76.5px で境界上 → **はみ出し測定が必須** |
| (2) | `battle.css:5373-5378` `.card-view-bonus` | `font-size: 9px; line-height: 1.25` | `font-size: 9.5px; line-height: 1.25` | 同上（条件行は 2〜3 行になりやすい札＝守護・共振が初陣に入る） |
| (3) | `battle.css:516-527` `.floating-number` | `text-shadow: 0 2px 4px #000, 0 0 14px currentColor` | `text-shadow: 0 2px 4px #000, 0 0 2px #000, 0 0 14px currentColor; paint-order: stroke fill; -webkit-text-stroke: 0.6px #0008`（**2 行追加**） | BF-07／K28：道化の紅背景で `#ff6b6b` の数字が沈む。stroke は段階サイズ L1 15px でも潰れない 0.6px に留める |
| (4) | `src/components/battle/hudPlate.css`（神 HP の fill 色・該当行は実装時に特定） | 白×緑 コントラスト 1.96（HUD 監査 R1） | 緑を 1 段暗く（例 `#4dbd74` → `#2f8f55` 相当）して ≥3.0 | HUD 監査 R1。`hudPlate.test.ts` は寸法（|Δ|>0.5px）を見るため色変更は非対象（実装時に grep で再確認） |

**はみ出し測定 Gate（必須・決定238 と同じ基準）**：`docs/CARD_TEXT_OVERFLOW_HOTFIX_PRE_AUDIT.md` の measure-all（60 枚 × SP 116×164／低 SP 100×140／PC）を再実行し、**はみ出し 0 件**を条件に採用。1 件でも出た札がある場合は (1) を 9.5px に戻し (2) のみ採用、または 140px 時のみ旧値に戻す media 規則 1 本を足す（決定238 と同型・+4 行）。lane2b `scripts/` に measure-all の所在を本書では確認できていない（`find -iname '*measure*'` で d266／phase6b／solve-legibility のみ）→ 実装時に決定238 の RC branch から取り出す。

#### 触るファイルと行数

| ファイル | 変更 | 行 |
|---|---|---|
| `battle.css` | :5369（本文 px）・:5374（条件行 px）・:522-524（text-shadow／stroke 2 行） | **4** |
| `hudPlate.css` | 神 HP fill 1 値 | 1 |
| 契約テスト（任意） | `cardGodLabelLowscreen.test.ts` に「SP 本文 ≥10px」の 1 件を足すか判断（既存 4 件は 140px 規則のみ＝不変） | 0〜6 |
| **合計** | runtime（CSS）5 行・テスト 0〜6 行。**engine 0・JS 0・gameVersion 0・画像 0** | — |

#### テスト影響

- `cardGodLabelLowscreen.test.ts`（決定238 契約・4 件）：140px 規則のみ参照＝不変
- `battleViewportLayout.test.ts`（決定266）：`--hand-step` の 116px を参照＝カード幅は変えないので不変
- `hudPlate.test.ts`（9 件）：寸法のみ＝不変（色は非対象）
- `pressFeel.test.ts`・`cardTravel.test.ts`：`.card-view` の transform／animation を参照＝font-size 非対象

#### Fast Gate 項目

1. tsc／oxlint／vitest／build／CSS 増分 ≤300B
2. **measure-all 再実行：60 枚 × 3 サイズではみ出し 0**（PASS しなければ第 1 段階を縮小）
3. スクリーンショット：初陣 R1／R2 手札（SP375・SP390×700・PC 1508）・道化 戦（紅背景の浮遊数字 L1〜L4）・神 HP バー
4. コントラスト実測：神 HP fill vs 白文字 ≥3.0（WCAG AA 大文字相当）
5. CEO 目視 3 分（SP 実機：手札の読みやすさ・道化の数字・HP バー）

#### 決定との整合・CEO 判断

決定205／206（事実表示のみ）：情報を増減しない／決定238（140px 規則）：維持／決定266（Hand Readability）：カード幅・step は不変／決定224 READY material：`.card-view-ready-frame` に触れない。**CEO 判断：不要**（§6-2 軽微な UI 調整・アクセシビリティ改善）。Practical QA #12【要確認】を本束のスクリーンショットで確定する。

### 5-3. 束 #3「Home 2 戦目導線」（候補 #4・同梱 #12 C-4・予備 #6）— **Lane 1 非衝突・条件付き**

`homePrimary.ts`・`homePrimary.test.ts`・`defeatCause.ts` は Lane 1 の 35 ファイル差分に含まれない（§1 実測）。branch は v1.0.2 公開を待たず作成できるが、Gate 実行（vitest／build）は RAM 競合回避のため Lane 1 の Gate 終了後。

#### 採用条件（AI 判断・推測を根拠にしないための歯止め）

次のいずれかで採用する：(i) `FIRST_PLAYER_QA_KIT_V1.md` U1「初陣後に自力で 2 戦目を始められたか」で「分からなかった」が 3〜5 名中 **2 名以上**／(ii) QA Kit が v1.0.2 公開後 **2 週間**実施されない場合は、初陣直後に最高難度（DAILY ★★★★★）が Primary になる構造上の不整合（決定193 §6「Daily を強制しない」の趣旨と、初陣直後の 1 回だけ必ず Daily が Primary になる実装の食い違い）を理由に AI 判断で採用し、`docs/DECISIONS.md` に AI 判断として記録する。

#### 変更案

| # | ファイル:行 | 現行 | 案 |
|---|---|---|---|
| (1) | `src/components/setup/homePrimary.ts:49-54` `selectHomePrimary` | A resume → B firstBattle → **D daily（`todayAttemptsUsed === 0 && todayAttemptsLeft > 0`）** → C normal | A → B → **C' secondBattle**（痕跡が「初陣 1 戦のみ」＝`godRecords` の合計が 1 かつ `dailyAttemptsUsed` 合計 0 かつ `hasSavedBattle` false）のとき `'normal'`（「神を選ぶ」）→ D daily → C normal。`HomePrimaryInput` に `battleCount: number`（`godRecords` 合計）を 1 項目追加し、`GameFlow`／`HomeScreen` の呼び出し側で集計を渡す |
| (2) | `HomeScreen.tsx:162-177` | Primary が daily のとき Today ブロック CTA | 不変（`'normal'` の既存分岐をそのまま使う。新しい状態値は足さない） |
| (3) | `src/components/battle/defeatCause.ts:52` | `'必殺技'` | `'必殺'`（遊び方 ②「大技（必殺）」・道化 `typeDescription`「必殺」と統一） |
| (予備 #6) | `src/components/battle/combatTimeline.ts:305` `planResultGate` | `visualHpEndMs(anchor) + 120` | `+ 200`（BF-03 の 150〜300ms 帯の中央）。結果画面の BGM 再開ラップ（K25）は `useCombatPresentation.ts:160-166` の `playJingle('defeat')` 後に BGM を fade-in する既存 API があるかを実装時に確認。無ければ本束に入れない |

Daily の semantics（同日同 Seed・3 回・開始時消費・P6／P8）は **不変**。変えるのは Home の Primary の選び方だけで、Today ブロックの CTA からはこれまでどおり神域へ行ける（決定187 N4 の到達経路は残る）。

#### 触るファイルと行数

| ファイル | 変更 | 行 |
|---|---|---|
| `homePrimary.ts` | 型 1 項目＋分岐 2 行＋コメント | **≈5** |
| `GameFlow.tsx` or `HomeScreen.tsx`（呼び出し側） | `battleCount` の集計 1 行＋受け渡し 1 行 | 2 |
| `homePrimary.test.ts` | 「初陣 1 戦のみ → normal」「2 戦以上＋Daily 未挑戦 → daily」「Daily 1 回でも挑戦済み → normal」の 3 件 | ≈15 |
| `defeatCause.ts` | :52 1 語 | 1 |
| `defeatCause.test.ts`（あれば） | 「必殺技」を固定する箇所の更新（実装時に grep） | 0〜1 |
| `combatTimeline.ts`（予備） | :305 1 値 | 1 |
| `combatTimeline.test.ts`（予備） | `planResultGate` の期待値（+120 を固定していれば 1 行） | 0〜1 |
| **合計** | runtime ≈9 行・テスト ≈17 行。**engine 0・storage 0・gameVersion 0・save 0**（`godRecords` は既存の読み取りのみ・書き込み 0） | — |

#### テスト影響

- `homePrimary.test.ts`：既存ケース（resume／firstBattle／daily／normal）は不変・3 件追加
- `nextGoal.test.ts`（決定187 N4）：Next Goal の選択は `selectHomePrimary` と別関数＝不変（実装時に import 関係を grep で再確認）
- `defeatCause` を参照するテスト：「必殺技」を文字列で固定していれば 1 行

#### Fast Gate 項目

1. tsc／oxlint／vitest／build
2. 決定論 Playwright（既存 `acceptance.mjs` 系）：初陣 → Home で Primary が「神を選ぶ」／2 戦目後 → Home で Primary が「神域へ挑む」（Daily 未挑戦時）／Daily 1 回後 → 「神を選ぶ」
3. 旧セーブ互換：v1.0.0／v1.0.1 の実セーブ（`docs/evidence/v1_0_1-rc/07-save-migration` の 2 種）で Home の Primary が（初陣 1 戦のみの保存を除き）**不変**
4. CEO 目視 1 分（初陣後の Home）

#### 決定との整合・CEO 判断

決定193 §6（Primary の順序 A→B→D→C）：**順序に C' を 1 つ挿入**＝既存決定の見直し（AI 判断範囲・§6-2「既存仕様の範囲内の改善」）。採用時は `docs/DECISIONS.md` に「AI 判断・根拠＝初陣直後の 1 回だけ最高難度が Primary になる構造上の不整合・比較案＝(a) 現状維持 (b) D を『2 戦以上』に条件付け (c) Daily を Primary から外す→(b) 採用」を記録。決定187 N4（Daily 到達）：Today ブロック CTA で到達経路維持。P6／P8（Daily semantics）：不変。**CEO 判断：不要**（上記の採用条件で AI が判断・記録）。

### 5-4. 束の順序と Release 単位

| 順 | 束 | 着手可能時期 | Gate 時間 | Release |
|---|---|---|---|---|
| 1 | 束 #3（Home 2 戦目導線＋C-4） | 今（branch 作成）／Gate は Lane 1 Gate 後 | ≈30 分 | v1.0.3 |
| 2 | 束 #1（初心者語彙 完結） | **v1.0.2 公開後** | ≈30 分 | v1.0.3 |
| 3 | 束 #2（SP 戦闘可読性） | **v1.0.2 公開後** | ≈60 分（measure-all＋スクリーンショット） | v1.0.3（measure NG なら v1.0.4 へ分離） |

3 束とも gameVersion 不変（engine／rules／カード／敵の行動表に触れない）＝ランキング指紋・託宣表の切替（K26）は起きない。v1.0.3 の PR は 1 本（Ruleset 下・CEO merge）。DECISIONS 行は PM が v1.0.3 Release 行で一括採番（本書は採番しない）。

## 6. 推測と実測の区別・限界

| 項目 | 区分 |
|---|---|
| 各ファイルの文言・px 値・関数の分岐・Lane 1 の差分ファイル一覧 | **実測**（grep／sed／git diff --stat・lane2b `fe1eb37`） |
| Hand Close FLIP 未実装・BossEntrance skip 実装済み・`hasSeenTutorial` 呼び出し 0・`planResultGate` +120ms | **実測**（grep） |
| 既存監査 13 本の PASS／OPEN | **転記**（各文書の記載を要約。文書以後の変更は `RELEASE_STATUS.md` A-2 と lane2b のコードで突合） |
| 束 #2 の本文 10px が 116×164px に収まるか | **推測**（手計算 76.5px vs 領域 ≈74px＝境界上。measure-all を Gate に置くのはこのため） |
| 束 #3 の Retention 効果・束 #1 の理解向上 | **推測**（初見プレイヤー 0 名。QA Kit v1 未実施） |
| スコアの PV／GF／UX／Ret | **推測**（根拠は各監査の記述・North Star・P 原則。数値は順位付けのためのもので絶対値に意味はない） |
| 読んでいないもの | `GameOverOverlay.tsx` 本文・`HomeScreen.tsx` 本文・`GameFlow.tsx`・`hudPlate.css` の神 HP 該当行・決定238 の measure-all の所在・`useReactionLanguage.ts` の対象札数（RC3「38/60」の解消率） |
| 新規計測 | **0**（スクリーンショット・Playwright・dev サーバー・vitest・build は禁止条件のため未実施。束 #2 の可読性は Fast Gate で初めて実測される） |

## 7. CEO 判断が必要な点

**新規 0 件。** 束 #1〜#3 はいずれも CLAUDE.md §6-2（軽微な UI・UX 調整／既存仕様の範囲内の改善／アクセシビリティ改善／バグ修正）に該当する。束 #3 は決定193 §6 の順序見直しだが AI 判断範囲（§5-3 の採用条件で判断・`docs/DECISIONS.md` に AI 判断として記録）。必要になるのは v1.0.3 の Production 公開承認（§6-3 #8）のみで、その時点で §6-4 形式の 1 案を PM が提出する。

★課金を伴う候補（After-2 新原画・BF-01 SE 実音源・AR-01 敵アート）は本書の推奨に含めない（§6-3 #4／#5／#6 の判断が先）。

---

本書で変更したもの：本書 1 ファイルのみ（lane3 worktree・docs-only・runtime／テスト／scripts 変更 0・他 worktree の編集 0・push 0）。
