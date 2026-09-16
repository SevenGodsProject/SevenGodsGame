# Phase 7 P1 — Result Hub + Home Today Minimal Specification（SPEC ONLY）

- 作成日：2026-09-16
- 対象：master `3ca2435`（決定186 Phase 7 Audit CLOSE。Production は決定185 LIVE）
- 位置づけ：**仕様化のみ**。src／CSS／asset／save／Ranking／Production は一切変更していない。本書と scratchpad 上の実画面計測スクリプトのみが成果物
- 上流：`docs/PHASE7_RETURN_LOOP_COMMERCIAL_AUDIT.md` §16 Phase 1（Result Hub／Home Today／Daily「前回との差」）、決定186
- 一次資料：`src/components/GameFlow.tsx`、`src/components/setup/HomeScreen.tsx`、`src/components/battle/{BattleScreen,GameOverOverlay,RewardOverlay}.tsx`、`src/hooks/{useGameEngine,recordStorage,dailyStorage,dailyClock,stakeStorage,otomoBondStorage,rewardStorage,deckPreferenceStorage,battleSaveStorage}.ts`、`src/components/battle/masteryDisplay.ts`、`src/components/setup/otomoGrowthDisplay.ts`、`src/core/data/{stakes,dailyBoss,rules}.ts`、`battle.css`／`setup.css`／`daily.css`
- 実画面計測：ローカル build（`3ca2435` そのまま）を `vite preview` で起動し、Playwright で PC 1508×660（CEO 環境）と SP 390×844 の Home（続きなし／あり）・Result（通常勝利／通常敗北／Daily 勝利／Daily 敗北）12 シナリオを撮影・DOM 計測（JS error 0）。数値は §4・§7 に記載
- 数値表記：UI は内部値の ×10 表示（`displayScale.ts`）。本書の「点」は表示値

---

## 1. Executive Summary

**Decision：B. READY WITH MODIFICATIONS（Confidence: High）**

- P1 は **既存データの再配置だけで成立する**。新しい永続データは **不要**（§3・§9）。`src/core` 変更 0・saveVersion 9 不変・gameVersion `1.80c6eda23ed082dc` 不変（§13・§14）
- 実画面計測で確定した現状の問題は3つ：(1) 結果画面の出口は2つで「ホーム／Daily／デッキ」へ直行できない、(2) 12 シナリオ中 **8 件で出口ボタンが初期ビューポート外**（カード内スクロールが必要。SP の通常勝利は 983px のカードに対し可視 715px）、(3) 「挑戦状をコピー」が金枠・全幅で**最も目立つボタン**になっており、行動導線より共有導線が上位に見える（§4）
- Home は PC/SP とも全 CTA が初期ビュー内だが、**storage を一切読まない**ため「今日何をするか」が書かれていない（§7）
- 決定186 の案からの修正点（§5・§8・§9）：
  1. 4出口を等価に並べず、**「次の目標」1行と Primary CTA を 1:1 で結ぶ**（目標が決まれば Primary が決まる）。Primary は結果種別×状況で変わり、「もう一度」固定ではない
  2. Home Today は「今日の敵・残り N/3・今日のベスト・挑戦ボタン」の4要素に絞る。「次の敵まで HH:MM」は**残り0回のときだけ**表示、「絆の次解放」は **DEFER**（七柱との絆 n/7 のみ）
  3. Daily「前回との差」は **`sevengods.daily.results[]` から導出**（新規保存なし）。比較の主軸は BEST、副軸に前回
  4. 「挑戦状をコピー」を **Tertiary（テキストリンク）へ降格**
  5. 工数は決定186 の約4日に対し **約5.5人日**（Playwright Acceptance と CLS 再計測を含む）
- 次の一歩：§19 の実装順序で P1 を実装する。着手前の CEO 確認事項は無い（§6-2 範囲）

---

## 2. P1 Goal

| | Before（現状・実測） | After（P1） |
|---|---|---|
| 戦闘終了後 | 勝敗→振り返り→スコア→内訳→神技→共有→（スクロール）→「もう一度／選び直す」。次に何をするかは自分で考える | 勝敗→振り返り→スコア→**次の目標 1行**→**Primary CTA**（初期ビュー内）→内訳・神技→Secondary／Tertiary 出口 |
| Home 起動直後 | ゲームモードを選ぶ場所（神を選ぶ／続きから／今日の神域挑戦★固定／3リンク） | **今日の敵・残り回数・今日のベスト**が読める場所。続きがあれば「続きから」が最上位 |

体験目標（人間 QA で判定可能）：勝利後 10 秒以内に「次に挑む目標」を 1 つ言える／Home を開いて 3 秒以内に「今日の敵と残り回数」を言える。

---

## 3. Existing Data Map

「P1 で再利用可能か」＝表示・再配置だけで使えるか。**新規保存が要る項目は無い**。

| データ | source（関数・型） | 型 | 保存場所 | 現在の利用画面 | P1 再利用 |
|---|---|---|---|---|---|
| score（今回） | `state.score: ScoreState`、最終値 `getFinalScore(score, stake)` | number | `sevengods.battleSave`（決着時に消去） | Result | ○ そのまま |
| previous score（通常） | **無い**（通常戦の直前スコアは保存されない。records は best/勝敗数のみ） | — | — | — | × 通常では「前回」を出さない |
| previous score（Daily） | `loadDailyDay(dailyKey).results[]`（`DailyResult{godId,score,status,round,at}`、時系列 push。決着時に今回分も追加済み） | DailyResult[] | `sevengods.daily` v1 | Daily 画面（神別ベスト）、戦績 | ○ `results[len-2]` が前回 |
| best score（通常） | `recordGameResult` 戻り値 `{isNewBest, prevBest}`、`loadGodRecord(god).bestBattleScore/bestBattleScoreDifficulty/wins/losses/finished/fastestWinRound` | GodRecord | `sevengods.records` v1 | Result（自己ベスト差）、GodSelect（自己ベスト・勝数）、戦績 | ○ |
| best score（Daily） | `recordDailyResult` 戻り値 `DailyRecordResult{isNewBest, prevBest, attemptsLeft}`、`loadDailyDay(key).bestScore/bestGodId/bestByGod` | — | `sevengods.daily` | Result、Daily 画面 | ○ |
| difficulty | `state.difficulty` | 'easy'/'normal'/'hard' | battleSave | GodSelect、Result 内訳 | ○（Daily は常に normal） |
| stake（神階） | `state.stake/stakeChoice`、`recordStakeResult`→`StakeResultOutcome{stake,isNewStakeBest,prevStakeBest,clearedNew,hardClearedNow}`、`loadGodStakeRecord(god){hardCleared,maxCleared,bestByStake}`、`isStakeUnlocked`、`maxSelectableStake`、`getStakeLevelDef`、`stakeLabel`、`describeStakeRules` | — | `sevengods.stakes` v1 | Result（突破・次段・段別ベスト）、StakeSelector | ○ |
| god | `state.godId`、`getGodDef` | GodId | battleSave | 全画面 | ○ |
| enemy | `state.enemy.defId/hp/maxHp`、`getEnemyDef(id).name/typeLabel/typeDescription/stage.nameJa/art` | — | battleSave | Battle、Result（残りHP） | ○ |
| OTOMO | `state.otomo.defId/form`、`getOtomoDef` | — | battleSave | Battle、Result（肖像・Lv UP） | ○ |
| Mastery（神技評価） | `getMastery(state)`→`MasteryResult{title,grade,raw,...}`（大耀・寿楽・蒼毘・福永のみ、他3神は null）、閾値 `RULES.mastery.{taiyo,sobi,juraku,fukuei}.{b,a,s}`、`describeMastery` | — | **保存なし**（決着時のみ） | Result（勝利時） | ○ 決着画面内のみ。履歴は無い |
| 絆（OTOMO bond） | `recordOtomoBond`→`{prevRecord,nextRecord}`、`loadOtomoBond(god){battlesPlayed,resonanceCount,dojiReached}`、`computeOtomoGrowthDisplay`→`{level,pointsInLevel,bondTier,nextUnlockText,...}`、`computeSevenBondSummary`、`detectOtomoLevelUp` | — | `sevengods.otomoBond` v1 | Result（Lv UP）、OTOMO 画面 | ○ |
| Daily boss | `dailyBossFor(todayDailyKey())`→`{enemyId, seed, seedId, ...}` | DailyBoss | 導出（保存なし） | Daily 画面、DeckBuilder（表示） | ○ |
| Daily seed | 同上 `seed`（`daily-YYYY-MM-DD-enemyId`）・`seedId` | string | 導出 | Daily 画面（SEED ID） | ○ 表示のみ。生成には触れない |
| Daily tries remaining | `dailyAttemptsLeft(key)`＝`RULES.daily.attemptsPerDay(3) − attemptsUsed` | number | `sevengods.daily` | Daily 画面、Result、GameFlow（もう一度の可否） | ○ |
| Daily reset | `todayDailyKey(now)`＝`dailyKeyOf`（`RULES.daily.timezoneOffsetMinutes`=540 で JST 日付）、`isExpiredDailySave` | string | 導出 | GameFlow（期限切れセーブ破棄） | ○ 「次の敵まで」は同じ関数で**表示用に**算出可（保存なし） |
| records（7神） | `loadGodRecord` ×7 | GodRecord | `sevengods.records` | 戦績、GodSelect | ○ |
| resume | `loadBattleSave()`→`GameState`（`GameFlow` が Home 表示のたび再読込。`mode/dailyKey/godId/round/enemy.defId` を含む） | GameState \| null | `sevengods.battleSave` v9 | Home（続きから） | ○ 敵名も出せる |
| reward | `loadRewardBonuses(god)`、`addRewardBonus`（勝利時 1 回） | Map | `sevengods.rewardBonuses` v1 | RewardOverlay、DeckBuilder | △ P1 では表示変更なし（3択・確定タイミング不変） |
| battle recap | `buildBattleRecap(log, state)`→`BattleRecap{kind, lines≤3}`、`deriveDefeatCause` | — | 導出 | Result | ○ そのまま |
| 続き・遷移 | `GameFlow` の `setupScreen`（home/godSelect/enemySelect/deckBuild/otomoGrowth/record/daily）、`backToGodSelect`、`goHome`、`beginDailyChallenge` | — | — | — | ○ 遷移を3本追加（§13） |

**存在しないもの（P1 では扱わない）**：通常戦の直前スコア、神×敵ごとの記録（P2）、神技評価の履歴、難易度ごとの勝利記録（かんたん／ふつうを個別に「未クリア」と判定できない。むずかしいだけは `isStakeUnlocked` で判定可）、OTOMO の「あと N pt」の神横断比較（文字列 `nextUnlockText` のみ）。

---

## 4. Current Result Audit（コード＋実画面）

### 4-1. 表示要素と順序（`GameOverOverlay.tsx`、上から）

1. 勝敗ラベル（`.game-over-status`）／敗北・未撃破時は敵の残りHP（≤10% で「あと一歩だった！」）
2. 「神域制覇」（勝利）
3. 振り返り ≤3行（Phase 6-C）／敗因 1行（敗北）
4. Daily ブロック（今日のベスト更新／あとN点／同点＋残り回数）
5. 絆Lv UP バッジ
6. 神＋OTOMO 肖像（勝利のみ・112px）
7. スコア（勝利時 0.6s 遅延＋0.8s ロールアップ）→「自己ベスト更新！」または「自己ベストまであとN点」
8. スコア内訳 `<dl>`（6項目＋小計。**257px**）
9. 神技評価（4神・勝利時。93px）
10. 神階ブロック（解放／突破／段別ベスト）
11. **挑戦状をコピー**（`.game-over-share-button`、金枠・SP では幅 324px／高さ 68px）
12. 出口：勝利で報酬未確定なら「報酬カードを選ぶ ›」のみ／確定後「同じ構成でもう一度」「神・デッキを選び直す」の **2つ**

勝利時は 8〜12 が `result-rise` アニメーションで **1.4s／1.6s／1.9s 遅れて**出現（`battle.css:4138-4141`）。

### 4-2. 実測（`3ca2435`、settled 状態）

| シナリオ | VP | カード scrollH / 可視 | 出口ボタンが初期ビュー内 | 備考 |
|---|---|---|---|---|
| 通常勝利 | PC 1508×660 | 903 / 559 | **×**（top 883） | 内訳・神技・共有・出口すべてスクロール下 |
| 通常勝利 | SP 390×844 | 983 / 715 | **×**（top 918・977） | 共有ボタン top 836 |
| 通常敗北 | PC | 679 / 559 | **×**（top 658） | 共有は可視・出口は不可視 |
| 通常敗北 | SP | 759 / 715 | ○ | ぎりぎり収まる |
| Daily 勝利 | PC | 989 / 559 | **×**（top 978） | Daily ブロック 67px が加わる |
| Daily 勝利 | SP | 1069 / 715 | **×**（top 1013・1072） | |
| Daily 敗北 | PC | 774 / 559 | **×**（top 753） | |
| Daily 敗北 | SP | 854 / 715 | △（もう一度○・選び直す×） | |

「結果を見たあと次に何を押せばよいか」：**現状は「スクロールして探す」**。最初に目に入るボタンは共有（金枠）で、行動導線ではない。

### 4-3. 文言の問題（実測で発見）

- Daily 敗北・今日のベスト未記録（`prevBest=0`、score 0）で **「今日のベストと同点です（敗北）」** と出る（`daily.prevBest > finalScore` が偽で else 分岐）。誤解を招くため P1 で文言規則を修正する（§9）
- 通常敗北で `prevBest>0` かつ自己ベスト未更新のとき「自己ベストまであとN点」は出るが、敗北の次目標としては弱い（§6 で敗北は「撃破」を目標にする）

### 4-4. 通常／Daily・勝利／敗北の差

| | 勝利 | 敗北 |
|---|---|---|
| 通常 | 肖像・自己ベスト・神技・神階・報酬（別オーバーレイ）→出口2 | 残りHP・敗因・（自己ベスト差）→出口2 |
| Daily | 上記＋Daily ブロック。神階・報酬は無い。出口は「もう一度挑戦（残りN回）」（残り0で disabled）＋「選び直す」（残り0なら Daily 画面へ） | 残りHP・敗因・Daily ブロック→同上 |

---

## 5. Result Hub Specification

### 5-1. 4出口の検証と情報階層

| 出口 | 遷移（`GameFlow`） | 判定 | 理由 |
|---|---|---|---|
| もう一度 | `onRematch`（既存。通常＝同じ神・デッキ・敵・神階で新 seed／Daily＝同 seed・残回数消費） | **KEEP** | 既存挙動そのまま |
| デッキを調整 | **新規遷移** `result → deckBuild`（godId・enemy・difficulty・stake・stakeChoice・otomoGrowthPath・dailyKey を保持し `engine.resetGame()` → `setupScreen('deckBuild')`）。Daily 残り0なら `daily` へ | **KEEP** | 「選び直す」経由の 2 段（GodSelect→Enemy→Deck）を 1 タップに |
| 今日の神域挑戦へ | **新規遷移** `result → daily`（`engine.resetGame()`・`setDailyKey(null)`・`setupScreen('daily')`。Daily 画面が残回数・今日のベストを表示） | **KEEP** | Daily 画面は既存 |
| ホーム | **新規遷移** `result → home`（`engine.resetGame()` → `goHome()`） | **KEEP** | 決着時に `clearBattleSave` 済みなので Home に幽霊の「続きから」は出ない |
| 神・デッキを選び直す | `onReselect`（既存） | **KEEP（Secondary/Tertiary）** | 神階・難易度を変えたいときの唯一の入口 |
| 挑戦状をコピー | 既存 | **MODIFY → Tertiary** | 金枠の主張を落としテキストリンク化 |

**階層規則**：出口は最大 5 つだが、**Primary 1・Secondary 2・Tertiary 残り**。同じ強さで並べない。

- Primary：全幅・金グラデ（`.home-cta-primary` と同じ視覚言語）・44px 以上・**「次の目標」の直下**
- Secondary：2 つを横並び（SP は 2 列グリッド）・アウトライン
- Tertiary：テキストリンク 1 行（「ホームへ」「選び直す」「挑戦状をコピー」の残り）。カード末尾

### 5-2. Primary CTA Rules（結果種別ごとに独立に判断）

原則：**Primary CTA ＝ §6 で選ばれた「次の目標」を達成する出口**。目標→出口の対応表は §6-3。その上で、結果種別ごとの既定値は次のとおり。

| 結果 | Primary | Secondary | Tertiary | 根拠 |
|---|---|---|---|---|
| 通常勝利 | 目標依存。既定は **同じ構成でもう一度**（自己ベスト差・神技次ランク・段別ベスト・絆は同じ構成の再戦で縮まる）。目標が「今日の神域挑戦（未挑戦）」なら **今日の神域挑戦へ**、「神階解放／次段」なら **神階に挑む（選び直す）** | デッキを調整／今日の神域挑戦へ（Primary と重複しない 2 つ） | ホームへ・神・デッキを選び直す・挑戦状をコピー | 監査 §15：同構成の再戦で自己ベスト更新は 10〜12%。目標を 1 つに絞って Primary に結ぶ方が「もう一度」の空振りを減らす |
| 通常敗北／未撃破 | **同じ構成でもう一度** | デッキを調整／神・デッキを選び直す | ホームへ・今日の神域挑戦へ・挑戦状 | 人間の敗北は読み違い（AI 勝率 100%）。振り返り 1〜3 行（既存）→即再戦が学習ループ。P1 ではデッキ改善材料が無い（P4）ため「デッキを調整」は Secondary |
| Daily 勝利・残り>0 | **もう一度挑戦（残りN回）**（同 seed） | デッキを調整／神・デッキを選び直す（同じ日の残回数内） | ホームへ・挑戦状 | 「同じ盤面を3回で解く」競技の中核。今日のベスト差が目標 |
| Daily 勝利・残り0 | **ホームへ** | 神を選ぶ（通常攻略）＝選び直す／戦績を見る（Daily 7日） | 挑戦状 | 今日の Daily は終了。Home Today が「次の敵まで HH:MM」と通常攻略の入口を示す（§8）。「もう一度」は disabled のまま残さない（Primary が押せない画面を作らない） |
| Daily 敗北・残り>0 | **もう一度挑戦（残りN回）** | 神・デッキを選び直す／デッキを調整 | ホームへ・挑戦状 | 同じ盤面で敗因（既存 1 行）を潰すのが最短 |
| Daily 敗北・残り0 | **ホームへ** | 神を選ぶ／戦績を見る | 挑戦状 | 同上 |
| 勝利・報酬未確定 | **報酬カードを選ぶ ›**（既存・単独） | なし | なし | Phase 6-C「勝利1回＝報酬の判断1回」を維持。Hub は報酬確定後に出す |

### 5-3. 配置（勝利時のアニメーションを含む）

- カード内順序を **P0→P1→P2→P3** に並べ替える（§10）。**「次の目標」＋Primary CTA を内訳より上**に置く
- 勝利時の `result-rise` 遅延は「次の目標＋Primary」を **スコア直後（1.4s）**の段に合わせ、内訳・神技を後段（1.6s/1.9s）へ。出口が先に押せるようにする（reduced-motion は即表示・既存）
- Secondary 2 つは Primary の直下、Tertiary はカード末尾。SP では Primary＋Secondary が初期ビュー内に入る（§16 AC5/AC10 で機械測定）
- 肖像（勝利）は据え置き。SP で初期ビューを圧迫する場合は高さ 112→96px を CSS で許容（P1 判断）

---

## 6. Next Goal Logic

### 6-1. 原則

- 「今もっとも意味のある次目標を **1 つ**」。Mission Engine・複数目標の列挙はしない
- **既存データだけ**で数値まで正確に言えるものに限る。言えないものは候補から除外（§6-4）
- 純関数 `selectNextGoal(input): NextGoal` として `src/components/battle/nextGoal.ts` に置く（React・storage 非依存。入力は決着時に BattleScreen/GameFlow が既存 API から集めて渡す）。単体テストで規則を固定する

入力（すべて既存）：`status`、`mode`、`finalScore`、`godId`、`enemyName`、`enemyHpRatio`、`newBest/prevBest`（通常）、`dailyResult{isNewBest,prevBest,attemptsLeft}`＋`dailyDay.attemptsUsed`（Daily／今日）、`stakeResult`、`stake`、`difficulty`、`mastery`＋`RULES.mastery[god]`、`bond{prev,next}`→`computeOtomoGrowthDisplay(next)`、`isStakeUnlocked(godId)`、`todayDaily{enemyName, attemptsLeft, attemptsUsed}`。

### 6-2. 優先順位（上から最初に成立した 1 つ）

**通常モード**

| # | 条件 | 目標文（例） | 出口 |
|---|---|---|---|
| N1 | `status !== 'won'` | 「{敵名}を撃破する（残りHP {N}%）」。残りHP≤10% は「あと一歩！{敵名}を撃破する」 | もう一度 |
| N2 | `stakeResult.hardClearedNow` | 「神階Ⅰ「参道」に挑む（解放！）」 | 神階に挑む（選び直す） |
| N3 | `stakeResult.clearedNew && stake < 7` | 「次は神階{n+1}「{名}」：{describeStakeRules の追加ルール 1 行}」 | 神階に挑む（選び直す） |
| N4 | 今日の Daily が **未挑戦**（`attemptsUsed === 0`）かつ `attemptsLeft > 0` | 「今日の神域挑戦：{今日の敵名}に挑む（残り3回）」 | 今日の神域挑戦へ |
| N5 | `mastery` あり・`grade !== 'S'`・次ランク閾値との差 ≤ 0.10 | 「神技評価 →{次ランク}（{語}）まであと{差×100}pt」 | もう一度 |
| N6 | `!newBest && prevBest > 0 && (prevBest − finalScore) ≤ prevBest × 0.10` | 「自己ベストまであと{N}点」 | もう一度 |
| N7 | `stake > 0 && !isNewStakeBest && prevStakeBest > finalScore` | 「{神階名}のベストまであと{N}点」 | もう一度 |
| N8 | 絆 tier ≤ 2 で次解放までの必要 pt ≤ 3（`computeOtomoGrowthDisplay` の level/pointsInLevel から算出。tier2 で童子未到達なら「童子形態での対局終了」を併記） | 「絆称号「{次称号}」まであと{N}pt」 | もう一度 |
| N9 | `!isStakeUnlocked(godId) && difficulty !== 'hard'` | 「「むずかしい」を1回撃破して神階を解放する」 | 難易度を上げる（選び直す） |
| N10 | 既定（`newBest`） | 「自己ベスト {score} をさらに伸ばす」 | もう一度 |
| N10' | 既定（それ以外） | 「自己ベスト {prevBest} を超える（あと{N}点）」 | もう一度 |

**Daily モード**

| # | 条件 | 目標文 | 出口 |
|---|---|---|---|
| D1 | `attemptsLeft > 0 && status !== 'won'` | 「同じ盤面で{敵名}を撃破する（残り{M}回）」 | もう一度挑戦 |
| D2 | `attemptsLeft > 0 && !isNewBest && prevBest > finalScore` | 「今日のベストまであと{N}点（残り{M}回）」 | もう一度挑戦 |
| D3 | `attemptsLeft > 0 && isNewBest` | 「今日のベスト {score}。残り{M}回でさらに更新する」 | もう一度挑戦 |
| D4 | `attemptsLeft === 0` | 「今日の挑戦は終了。次の敵まで {HH:MM}」 | ホームへ |

N4 を N5〜N7 より上に置く理由：Daily は 1 日 1 回しか「未挑戦」状態が無く、翌日に戻る唯一の理由（監査 §10）。同構成の再戦目標は明日も成立する。N1〜N3 を最上位にする理由：敗北の次目標は撃破以外に無く、神階の解放・突破は稀で価値が高い（監査 §8）。

### 6-3. 目標→Primary 出口の対応

`もう一度`→「同じ構成でもう一度」／`もう一度挑戦`→「もう一度挑戦（残りN回）」／`今日の神域挑戦へ`→新規遷移 daily／`神階に挑む（選び直す）`・`難易度を上げる（選び直す）`→`onReselect`（ラベルのみ文脈化。神階の事前選択は `GameFlow` の `stake` state が既に保持しているため追加実装なし）／`ホームへ`→新規遷移 home。

### 6-4. 除外した候補と理由

- 未クリア難易度（かんたん／ふつう）：難易度別の勝利記録が無い（`GodRecord` は最終スコアの難易度と勝数のみ）。むずかしいだけ N9 で扱う
- 未踏の敵：神×敵の記録が無い（P2）
- 神技評価の履歴・3神（恵比寿・才華・笑蓮）の神技：データが無い（P3b）
- OTOMO の神横断「最も近い次解放」：`nextUnlockText` は文字列で、数値比較の API が無い。神ごと（N8）のみ
- 「前回との差」（通常）：直前スコアが保存されない

---

## 7. Current Home Audit（コード＋実画面）

`HomeScreen.tsx`（126 行）は **props の `savedBattle` 以外の状態を持たず、storage を import しない**。表示は固定文言＋4 CTA＋3 リンク＋恵比寿ヒーロー画像。

| 要素 | PC 1508×660（top/高さ） | SP 390×844（top/高さ） | 備考 |
|---|---|---|---|
| ヘッダー | 0 / 59 | 0 / 59 | App 共通 |
| タイトル塊（eyebrow〜tagline） | 148〜340 | 107〜251 | |
| 神を選ぶ（primary） | 366 / 52 | 277 / 52 | |
| 続きから（secondary・ある時） | 366 / 52（横並び） | 341 / 51（折返し） | 「神・ラウンド」のみ。敵名なし |
| 今日の神域挑戦 ★★★★★ | 436 / 44 | 347（続きあり 410）/ 44 | ★は固定 JSX（脅威度 5 の定数） |
| 遊び方／OTOMO／戦績（各 44px 行） | 491〜643 | 401〜553（続きあり 464〜616） | 縦 3 段＝162px |
| 恵比寿ヒーロー | 79 / 605（右列・下端が 684＞660） | 585 / 427（**初期ビュー外**） | PC は 24px はみ出し（scrollH 704） |

既存の入口：Daily（`onShowDaily`）・Resume（`onResume`）・OTOMO（`onShowOtomoGrowth`）・戦績（`onShowRecord`）・遊び方。神階への入口は GodSelect 内のみ（Home から不可視）。

Today パネル追加時の懸念と対策：
- **PC 660px 高**：テキスト列は 643px まで使い切っている。Today（約 110px）を足すと戦績リンクが下へ落ちる → 3 リンクを **1 行の横並び**にして 108px を回収（CSS のみ）
- **SP**：最下リンク 553（続きあり 616）→ Today 110px を足しても 663〜726 で 844 内。ヒーロー画像は現状どおり 2 画面目
- **CTA 過多**：Today パネルの「挑戦する」が既存の `今日の神域挑戦` ボタンを**置き換える**（重複させない）。Home の主 CTA は「神を選ぶ」「続きから」「Today の挑戦する」の最大 3 つ
- **CLS**：Today は固定高（min-height）で先に箱を確保し、storage 読込は同期（localStorage）なので後から高さが跳ねない。決定170 の再計測を Acceptance に含める（§16 AC13）

---

## 8. Home Today Specification

### 8-1. 項目判定

| 候補（決定186） | 判定 | 仕様 |
|---|---|---|
| 今日の敵 | **KEEP** | `dailyBossFor(todayDailyKey())` → `getEnemyDef` の `name`＋`【typeLabel】`＋「神域強化」チップ。画像は出さない（CLS・ファーストビュー節約。Daily 画面に既にある） |
| 残り N/3 | **KEEP** | `dailyAttemptsLeft(key)` / `RULES.daily.attemptsPerDay` |
| 今日の BEST | **KEEP（条件付き）** | `loadDailyDay(key).bestScore > 0` のとき「今日のベスト {score}（{神}）」＋`DailyStatusBadge`。0 なら「まだ挑戦していません」 |
| 次の敵まで HH:MM | **MODIFY** | **残り 0 回のときだけ**「今日の3回は終了・次の敵まで HH:MM」。残りがあるときは「今すぐ挑む」と競合するため出さない。算出は `dailyClock.ts` に純関数 `msUntilNextDailyKey(now)`（`todayDailyKey` と同じ JST 変換で翌日 0:00 との差）。1 分毎に再描画（表示専用・保存なし） |
| 続きから | **KEEP・MODIFY（格上げ）** | `savedBattle` があるとき **ページ最上位の Primary**（金）に。文言を「続きから　{神} vs {敵名}・ラウンド{n}」（`savedBattle.enemy.defId` から敵名。Daily なら「神域挑戦・」を前置＝既存）。「神を選ぶ」は Secondary へ。無いときは従来どおり「神を選ぶ」が Primary |
| 神階 | **MODIFY（1 行）** | Today とは別の「進行」行に 1 チップ：全神の `loadGodStakeRecord` から最大 `maxCleared` を取り「神階：最高 神階{numeral}{名}（{神}）」。全神未解放なら「神階：🔒 むずかしいを1回撃破で解放」（`isStakeUnlocked` が全 false） |
| 絆の次解放 | **DEFER** | 神横断で「最も近い」を数値比較する API が無く、文字列は長い。「進行」行に **「七柱との絆 {n}/7」**（`computeSevenBondSummary(7 records)`）のみ。次解放は OTOMO 画面（既存）に任せる |
| 自己ベスト上位1 | **MODIFY（1 チップ）** | 「進行」行に「自己ベスト {score}（{神}）」（`loadGodRecord` ×7 の最大 `bestBattleScore`。0 なら非表示） |
| 未踏マス／49 | **REJECT（P1）** | P2 |

### 8-2. Today パネル（`HomeTodayPanel`、新規・表示専用）

- 位置：CTA 行（続きから／神を選ぶ）の直下、3 リンクの上。既存 `home-cta-daily` ボタンを置き換える
- 内容（3 行＋ボタン、min-height 固定）：
  1. 見出し「今日の神域挑戦」＋「★★★★★」（`DAILY_THREAT_STARS`）＋日付キー
  2. 「{敵名}【{型}】 神域強化」
  3. 「残り {N}/3 ・ 今日のベスト {score}（{神}）」／未挑戦なら「残り 3/3 ・ まだ挑戦していません」
  4. ボタン：残り>0「挑戦する（残りN回）」→ `onShowDaily`（Daily 画面を経由。開始・回数消費のロジックは既存のまま）／残り0「今日の記録を見る」→ `onShowDaily`、脇に「次の敵まで HH:MM」
- 読み込み：マウント時に 1 回（`useMemo`／`useState` 初期化）。Home は `setupScreen==='home'` のたびに再マウントされるので常に最新
- 「進行」行：Today の下に小さなチップ 3 つ（神階／絆 n/7／自己ベスト）。データが無いチップは出さない。タップで神階→「神を選ぶ」、絆→OTOMO 画面、自己ベスト→戦績（既存遷移の再利用）

### 8-3. 3 秒で分かる、の担保

初期ビューの読み順（SP）：タイトル → [続きから]/[神を選ぶ] → **Today：敵名・残り回数・ベスト・挑戦する** → 進行チップ → リンク行。Today の敵名と残り回数は **常に 1 行目・2 行目**に固定。

---

## 9. Daily Difference Specification

### 9-1. 実データの確認

- `recordDailyResult` は決着時に `results[]` へ `{godId, score, status, round, at}` を **push**（時系列）。`GameOverOverlay` 表示時点では今回分が末尾にある → **前回＝`results[results.length − 2]`**（無ければ 1 回目）
- `DailyRecordResult` に `prevBest`・`isNewBest`・`attemptsLeft` がある
- 取得は `loadDailyDay(state.dailyKey)`（読み取りのみ。他画面と同じ流儀）。**新規保存は不要**

### 9-2. 表示規則（Daily ブロックを 2 行に固定）

| 状況 | 1 行目（BEST 軸＝目標） | 2 行目（前回軸＝進歩） |
|---|---|---|
| 1 回目 | 「今日のベスト {score}（1回目）」／敗北で score が BEST 未満なら「今日のベストはまだありません」 | 「残り {M} 回」 |
| 2〜3 回目・ベスト更新 | 「✨ 今日のベスト更新！ {score}（+{score−prevBest}）」 | 「前回 {prev} → 今回 {score}（{±diff}）」＋両方勝利なら「撃破 R{prevRound}→R{round}」 |
| 2〜3 回目・未更新 | 「今日のベスト {best} まであと {N} 点」 | 同上 |
| 2〜3 回目・同点 | 「今日のベスト {best} と同点」 | 同上 |
| 残り 0 | 上記に加え「今日の挑戦は終了」（§6 D4 が目標行を担当） | |

- §4-3 の誤表示（`prevBest=0` で「同点」）は「今日のベストはまだありません」に置換
- 比較対象の選定理由：目標は **BEST**（3 回の最高が今日の記録）、進歩は **前回**（同じ盤面での手順改善が点差＝監査 §15 Q3）。「今回 vs 前回」だけでは 3 回目に 1 回目を超えたのか分からず、「今回 vs BEST」だけでは進歩が見えない。両方を 1 行ずつ
- 純関数 `describeDailyDiff(day: DailyDay, current: {score,status,round}, result: DailyRecordResult)` を `src/components/battle/dailyDiff.ts` に置き、単体テストで固定

---

## 10. Information Hierarchy

### Result

| 優先 | 要素 | PC | SP 390×844 |
|---|---|---|---|
| P0 | 勝敗・（残りHP／あと一歩）・振り返り≤3行・敗因 | 上部 | 上部（現状どおり） |
| P1 | スコア・自己ベスト（更新／あとN）・Daily 2 行（§9）・絆Lv UP | スコア直後 | 同左。肖像は P1 の前（勝利） |
| P2 | **次の目標 1 行 → Primary CTA → Secondary 2** | スコア直後・初期ビュー内 | 初期ビュー内（AC5/AC10） |
| P3 | 内訳（6 項目）・神技評価・神階ブロック | 後段。内訳は `<details>`「内訳を見る」で折りたたみ可（PC は open 既定、SP は closed 既定） | 折りたたみ |
| P4 | Tertiary リンク（ホームへ／選び直す／挑戦状をコピー） | 末尾 | 末尾 |

PC と SP は同じ順序だが、**SP は P3 を折りたたむ**（単純縮小ではなく段の出し分け）。

### Home

| 優先 | 要素 | PC | SP |
|---|---|---|---|
| P0 | 続きから（ある時）／神を選ぶ | 左列 CTA 行 | タイトル直下 |
| P1 | **Today**（敵・残り・ベスト・挑戦する） | 左列 CTA 行の直下 | 同左 |
| P2 | 進行チップ（神階／絆／自己ベスト） | Today 直下 1 行 | 同左 |
| P3 | 遊び方／OTOMO／戦績 | **横 1 行** | 横 1 行（折返し可） |
| P4 | ヒーロー画像 | 右列 | 2 画面目（現状） |

---

## 11. Wireframes（ASCII）

### 11-1. Result — Normal Win（SP 390×844、報酬確定後・settled）

```
┌──────────────────────────────────────┐
│                勝利                  │
│              神域制覇                │
│ ┌──────────────────────────────────┐ │
│ │◆ 大技を1回、無傷で受け切りました │ │
│ │◆ ⚡の条件を5回成立させました     │ │
│ └──────────────────────────────────┘ │
│        [神]  [OTOMO]  （肖像 96px）  │
│            スコア 8,940              │
│         ✨ 自己ベスト更新！          │
│──────────────────────────────────────│
│ 次の目標                             │
│ ▶ 神技評価 →S（神業）まであと3pt      │
│ ┌──────────────────────────────────┐ │
│ │      同じ構成でもう一度  (Primary)│ │
│ └──────────────────────────────────┘ │
│ [ デッキを調整 ] [ 今日の神域挑戦へ ] │  ← Secondary 2列
│──────────────────────────────────────│ ← ここまで初期ビュー内
│ ▸ 内訳を見る（折りたたみ）            │
│ 神技評価 A（見事）                    │
│  1ラウンドで削った敵HPの割合 55% → S は 58%│
│  1ラウンドに火力を集中させるほど…      │
│ ⛩ 神階Ⅲ 拝殿 突破！ 次は神階Ⅳ「本殿」  │ （該当時）
│                                      │
│  ホームへ ・ 神・デッキを選び直す ・ 挑戦状をコピー │ ← Tertiary
└──────────────────────────────────────┘
```

### 11-2. Result — Normal Lose（SP）

```
┌──────────────────────────────────────┐
│                敗北                  │
│        敵の残りHP 120 / 1,000 あと一歩だった！│
│ ┌──────────────────────────────────┐ │
│ │◆ R4：110の大技に対し、盾は0でした…│ │
│ └──────────────────────────────────┘ │
│  敗因：R4：業斧の鬼将の「攻撃」で110  │
│            スコア 3,120              │
│──────────────────────────────────────│
│ 次の目標                             │
│ ▶ あと一歩！業斧の鬼将を撃破する       │
│ ┌──────────────────────────────────┐ │
│ │      同じ構成でもう一度  (Primary)│ │
│ └──────────────────────────────────┘ │
│ [ デッキを調整 ] [ 神・デッキを選び直す ]│
│──────────────────────────────────────│
│ ▸ 内訳を見る                          │
│  ホームへ ・ 今日の神域挑戦へ ・ 挑戦状をコピー │
└──────────────────────────────────────┘
```

### 11-3. Result — Daily Win（SP、2 回目・残り 1）

```
┌──────────────────────────────────────┐
│                勝利                  │
│              神域制覇                │
│ ┌ 振り返り ≤3行 ────────────────────┐ │
│ └──────────────────────────────────┘ │
│        [神]  [OTOMO]                 │
│            スコア 9,690              │
│ ✨ 今日のベスト更新！ 9,690（+720）    │
│ 前回 8,970 → 今回 9,690（+720）撃破 R4→R3│
│──────────────────────────────────────│
│ 次の目標                             │
│ ▶ 今日のベスト 9,690。残り1回でさらに更新│
│ ┌──────────────────────────────────┐ │
│ │    もう一度挑戦（残り1回）(Primary)│ │
│ └──────────────────────────────────┘ │
│ [ デッキを調整 ] [ 神・デッキを選び直す ]│
│──────────────────────────────────────│
│ ▸ 内訳を見る ／ 神技評価 …            │
│  ホームへ ・ 挑戦状をコピー            │
└──────────────────────────────────────┘
```

### 11-4. Result — Daily Lose（SP、3 回目・残り 0）

```
┌──────────────────────────────────────┐
│                敗北                  │
│        敵の残りHP 300 / 1,290        │
│ ┌ 振り返り／敗因 ───────────────────┐ │
│ └──────────────────────────────────┘ │
│            スコア 2,400              │
│ 今日のベスト 9,690 まであと 7,290 点   │
│ 前回 9,690 → 今回 2,400（−7,290）      │
│──────────────────────────────────────│
│ 次の目標                             │
│ ▶ 今日の挑戦は終了。次の敵まで 05:12   │
│ ┌──────────────────────────────────┐ │
│ │           ホームへ      (Primary) │ │
│ └──────────────────────────────────┘ │
│ [ 神を選ぶ（通常攻略） ] [ 戦績を見る ] │
│──────────────────────────────────────│
│ ▸ 内訳を見る                          │
│  挑戦状をコピー                       │
└──────────────────────────────────────┘
```

### 11-5. Home — No Resume（SP）

```
┌ SEVEN GODS                 🔊 📖 💬 ┐
│           SEVENDAO GAMES             │
│            SEVEN GODS                │
│           共鳴カードバトル            │
│      七柱の神と挑む、七日間の物語。    │
│ ┌──────────────────────────────────┐ │
│ │           神を選ぶ      (Primary) │ │
│ └──────────────────────────────────┘ │
│ ┌ 今日の神域挑戦 ★★★★★  2026-09-16 ┐│
│ │ 蒼海の龍神【耐久型】 神域強化      ││
│ │ 残り 3/3 ・ まだ挑戦していません   ││
│ │ [ 挑戦する（残り3回） ]            ││
│ └──────────────────────────────────┘│
│ 神階：🔒 むずかしい撃破で解放 ・ 絆 2/7 ・ 自己ベスト 8,940（大耀）│
│ 📖 遊び方 ・ ❤ OTOMOとの絆 ・ 🏆 戦績  │ ← 横1行
│──────────────────────────────────────│ ← 初期ビュー下端（約 700px）
│ ┌──────────────────────────────────┐ │
│ │        恵比寿 ヒーロー画像         │ │
```

### 11-6. Home — Resume Exists（SP）

```
┌ SEVEN GODS                 🔊 📖 💬 ┐
│            SEVEN GODS                │
│           共鳴カードバトル            │
│ ┌──────────────────────────────────┐ │
│ │ ▶ 続きから 大耀 vs 業斧の鬼将・R2 │ │  ← Primary（金）
│ └──────────────────────────────────┘ │
│ [ 神を選ぶ ]                         │  ← Secondary
│ ┌ 今日の神域挑戦 ★★★★★ ──────────┐│
│ │ 蒼海の龍神【耐久型】 神域強化      ││
│ │ 残り 1/3 ・ 今日のベスト 9,690（大耀）勝利││
│ │ [ 挑戦する（残り1回） ]            ││
│ └──────────────────────────────────┘│
│ 神階：最高 神階Ⅲ 拝殿（大耀）・ 絆 2/7 ・ 自己ベスト 8,940│
│ 📖 遊び方 ・ ❤ OTOMOとの絆 ・ 🏆 戦績  │
```

残り 0 のとき Today の 3〜4 行目：「今日の3回は終了 ・ 今日のベスト 9,690（大耀）」「[ 今日の記録を見る ]  次の敵まで 05:12」。

### 11-7. Home — PC 1508×660（構造が異なるため）

```
┌ SEVEN GODS ──────────────────────────────────────── 🔊 📖 💬 ┐
│  SEVENDAO GAMES                          ┌──────────────────┐ │
│  SEVEN GODS                              │                  │ │
│  共鳴カードバトル                         │   恵比寿          │ │
│  七柱の神と挑む、七日間の物語。            │   ヒーロー画像     │ │
│  [▶ 続きから 大耀 vs 業斧の鬼将・R2] [神を選ぶ]│                │ │
│  ┌ 今日の神域挑戦 ★★★★★ 2026-09-16 ─────┐ │                  │ │
│  │ 蒼海の龍神【耐久型】 神域強化          │ │                  │ │
│  │ 残り 3/3 ・ まだ挑戦していません       │ │                  │ │
│  │ [ 挑戦する（残り3回） ]                │ │                  │ │
│  └────────────────────────────────────┘ │                  │ │
│  神階：🔒 … ・ 絆 2/7 ・ 自己ベスト 8,940  └──────────────────┘ │
│  📖 遊び方 ・ ❤ OTOMOとの絆 ・ 🏆 戦績（横1行）                 │
└────────────────────────────────────────────────────────────────┘
```

Result は PC でも中央カード（幅 ≈490px・max-height 85vh）で SP と同構造のため、PC 専用 wireframe は省略（P3 の折りたたみが open 既定になる点だけ異なる）。

---

## 12. Component Reuse

| 区分 | 対象 | 内容 |
|---|---|---|
| reuse | `GameOverOverlay.tsx` の各ブロック（status／recap／daily／portraits／score／new-best／best-gap／breakdown／mastery／stake／share） | JSX はそのまま、順序と包み（`<details>`）だけ変える |
| reuse | `DailyStatusBadge`、`formatScaled`、`stakeLabel`／`getStakeLevelDef`／`describeStakeRules`、`describeMastery`、`computeOtomoGrowthDisplay`／`computeSevenBondSummary`、`dailyBossFor`／`todayDailyKey`／`dailyAttemptsLeft`／`loadDailyDay`／`bestResultOf`、`loadGodStakeRecord`／`isStakeUnlocked`、`loadGodRecord`、`loadOtomoBond`、`getEnemyDef`／`getGodDef` | 呼ぶだけ |
| reuse | `.home-cta-primary`／`.home-cta-secondary` の視覚言語 | Result の Primary／Secondary に同じトーン（CSS クラス追加） |
| extend | `GameOverOverlay` props | `nextGoal: NextGoal`、`dailyDiff`、`onAdjustDeck`、`onGoDaily`、`onGoHome`、`todayDaily` を追加 |
| extend | `BattleScreen` props | 上記 3 コールバックの通過と、決着時の `selectNextGoal` 入力収集 |
| extend | `GameFlow` | 遷移 3 本（§13）。既存 `backToGodSelect`／`goHome`／`onRematch` は変更しない |
| extend | `HomeScreen` props | 変更なし（Today は内部で読む）。Resume の格上げは JSX/CSS |
| reorder | Result カード内の要素順、Home の CTA 行と 3 リンク | |
| new（最小） | `HomeTodayPanel.tsx`（表示専用）、`nextGoal.ts`（純関数）、`dailyDiff.ts`（純関数）、`dailyClock.ts` に `msUntilNextDailyKey` 追加 | 新規 3 ファイル＋関数 1 |

大規模リファクタは行わない。`GameOverOverlay` の 371 行を分割しない（順序変更と `<details>` 包みのみ）。

---

## 13. Runtime Scope（将来実装時の想定変更ファイル）

| 分類 | ファイル | 変更内容 |
|---|---|---|
| UI-only | `src/components/battle/GameOverOverlay.tsx` | 要素順の再配置・次の目標行・Primary/Secondary/Tertiary・Daily 2 行・`<details>`・共有リンク化 |
| UI-only | `src/components/setup/HomeScreen.tsx` | Resume 格上げ（敵名表示）・`HomeTodayPanel` 配置・進行チップ・3 リンク横並び |
| UI-only（新規） | `src/components/setup/HomeTodayPanel.tsx` | Today パネル（storage 読み取りのみ） |
| UI-only（新規・純関数） | `src/components/battle/nextGoal.ts`、`src/components/battle/dailyDiff.ts` | §6・§9 の規則 |
| hook/controller | `src/components/GameFlow.tsx` | `adjustDeck`（result→deckBuild）・`goDailyFromResult`（result→daily）・`goHomeFromResult`（result→home）を追加し `BattleScreen` へ渡す |
| hook/controller | `src/components/battle/BattleScreen.tsx` | props 通過・`selectNextGoal` 入力の収集（`engine` の `newBest/prevBest/dailyResult/stakeResult/otomoBondChange`＋`loadDailyDay`／`isStakeUnlocked`／`dailyAttemptsLeft`） |
| storage read-only | `src/hooks/dailyClock.ts` | `msUntilNextDailyKey(now)` 追加（純関数・保存なし） |
| storage read-only | `dailyStorage`／`stakeStorage`／`otomoBondStorage`／`recordStorage` | **変更なし**（読み取り関数を呼ぶだけ） |
| CSS | `src/components/battle/battle.css` | Result の階層（`.result-cta-primary/-secondary/-tertiary`）、`result-rise` の段替え、`<details>`、共有リンク |
| CSS | `src/components/setup/setup.css`、`daily.css` | Today パネル・進行チップ・3 リンク横並び・Resume 格上げ |
| test | `nextGoal.test.ts`、`dailyDiff.test.ts`、`dailyClock.test.ts`（次リセット）、`homeToday.test.ts`（表示ロジック） | 単体 |
| test（Playwright） | `scripts/phase7-p1/acceptance.mjs`（新規・非 runtime） | §16 の機械測定 |

**src/core 変更：0**（想定）。`rules.ts`・`dailyBoss.ts`・`stakes.ts`・engine は読み取りのみ。BLOCKER なし。

---

## 14. Invariants（P1 実装で絶対に変えないもの）

1. `src/core/**` の差分 0。`gameVersion.test.ts` の期待値 `1.80c6eda23ed082dc` 不変、`RULES.saveVersion` 9 不変
2. Daily：seed 文字列 `daily-YYYY-MM-DD-enemyId`、`seedId`、JST 日付キー、`attemptsPerDay` 3、**回数消費は `startDailyAttempt`（`startDailyGame` 内）だけ**。新規遷移「デッキを調整」→確定は既存の `beginDailyChallenge` を通るため二重消費・無消費の経路を作らない
3. 記録の書き込みタイミング（`recordGameResult`／`recordDailyResult`／`recordStakeResult`／`recordOtomoBond`＝決着の瞬間 1 回）に触れない。P1 は**読み取りのみ**
4. 報酬：3 択の選出・確定 1 回・`rewardPending` ゲートは不変。Hub は報酬確定後にのみ出る
5. `onRematch`／`onReselect`／`resumeGame`／`resetGame` の挙動不変。新規遷移は必ず `engine.resetGame()` を先に呼ぶ（`backToGodSelect` と同じ）
6. Battle 画面（`.battle` 配下）の DOM・CSS に変更なし。Result は `position: fixed` のオーバーレイ内のみ
7. storage キー・version・スキーマに変更なし（`sevengods.records/daily/stakes/otomoBond/rewardBonuses/deckPreference/battleSave`）
8. Home の既存遷移（`onStartFresh` の破棄確認ダイアログを含む）と `loadResumableBattle` の期限切れ破棄は不変
9. Ranking／Neon／API：触れない（`submissionEnabled:false`、`/api/*` 不在のまま）

---

## 15. Regression Risks

| 領域 | リスク | 対策 |
|---|---|---|
| Daily tries | 「デッキを調整」→確定で回数が 2 回引かれる／引かれない | 遷移は `deckBuild` へ戻すだけで、開始は既存 `beginDailyChallenge`。残り 0 なら `daily` 画面へ（`backToGodSelect` と同じ分岐）。`startDaily.test.ts` に経路テストを追加 |
| Daily reset | 「次の敵まで」の JST 計算ずれ | `dailyKeyOf` と同じオフセットで算出する純関数＋境界テスト（23:59:59／0:00:00 JST） |
| Seed | 表示のために seed を触る | `dailyBossFor` の戻り値を表示するだけ。生成コードに変更なし |
| save/resume | 結果→ホームで幽霊の「続きから」 | 決着時に `clearBattleSave` 済み。Home は再マウントで再読込（既存 useEffect） |
| reward | Hub が報酬より先に出る | `rewardPending` の分岐を維持（Primary＝報酬カードを選ぶ） |
| records | 表示のための読み取りが書き込みを誘発 | `load*` 関数のみ使用。書き込み関数を import しない（lint ルールではなくレビュー項目） |
| Mastery | 次ランク差の計算で閾値を別定義してしまう | `RULES.mastery` を参照。`masteryDisplay.ts` の `nextRank` を export して再利用 |
| mobile scroll | Result カード内の `max-height: 85vh` と `<details>` の相互作用 | Primary が初期ビュー内に入ることを AC5 で機械測定。`overflow-y:auto` は維持 |
| battle restart | 「もう一度」が新規遷移の追加で壊れる | `onRematch` は無変更。E2E で通常・Daily の再戦を確認 |
| deck edit transition | `deckBuild` へ戻ったとき `godId` が null で GodSelect に落ちる | `adjustDeck` は `godId` を保持したまま遷移。`state` は `resetGame` 前に `enemy.defId` を控える |
| Home CLS | Today で高さが跳ねる | 固定 min-height・同期読込・画像なし。決定170 の手順で再計測（AC13） |
| PC 660px | Today 追加で戦績リンクが落ちる | 3 リンク横並びで −108px（AC12） |
| 勝利アニメ | 段替えで内訳の出現が遅く見える | 1.4s→1.9s の範囲内で並べ替えるだけ。reduced-motion 即表示は維持 |

---

## 16. Acceptance Criteria（人間 QA＋Playwright）

| AC | 条件 | 測定 |
|---|---|---|
| AC1 | 通常勝利後、Result 画面だけで次の行動候補（Primary 1＋Secondary 2）を理解できる | 人間：5 名中 4 名が 10 秒以内に「次に何を押すか」を言える／機械：`[data-testid=result-primary]` 1 個、`[data-testid=result-secondary]` 2 個 |
| AC2 | Daily 終了後、今回が今日のベストに対してどうだったか理解できる | 機械：`[data-testid=daily-diff]` に「今日のベスト」を含む 1 行目と（2 回目以降）「前回」を含む 2 行目 |
| AC3 | Home 起動後、Daily 敵と残回数がスクロールなしで読める | 機械：`[data-testid=home-today]` の敵名・「残り N/3」の bounding box が 390×844 のビューポート内 |
| AC4 | Resume がある場合「続きから」が Today に埋もれない | 機械：`.home-cta-primary` のテキストが「続きから」で始まり、Today より上（offsetTop 比較） |
| AC5 | 390×844 で主要 CTA が viewport 内 | 機械：4 種の Result（settled 後 ≤2.5s）で Primary の `top+height ≤ 844`、Home で Primary＋Today ボタンが viewport 内 |
| AC6 | Result/Home 変更で Battle layout が変化しない | 機械：`scripts/phase6b-layout-audit/measure.mjs` の計測値が実装前後で一致（敵ポートレート・予告・手札の rect） |
| AC7 | Daily Seed／tries／reset 完全不変 | 機械：`dailyFairness.test.ts`・`dailyStorage.test.ts`・`startDaily.test.ts` PASS＋E2E で 3 経路（Daily 画面／もう一度／デッキを調整）とも `attemptsUsed` が開始ごとに +1 |
| AC8 | saveVersion／gameVersion 不変 | 機械：`gameVersion.test.ts` PASS、`git diff --stat src/core` が空 |
| AC9 | 「次の目標」は 1 行（SP で最大 2 行折返し） | 機械：`[data-testid=next-goal]` の高さ ≤ line-height×2、テキスト非空 |
| AC10 | Result 初期ビュー内に別アクティビティへの CTA が ≥2 | 機械：viewport 内の `button` のうち「もう一度」以外が 2 個以上（settled） |
| AC11 | 共有ボタンが Primary より目立たない | 機械：共有要素の面積 < Primary の面積、かつ DOM 順で Primary より後 |
| AC12 | PC 1508×660 で Home の 3 リンクが viewport 内 | 機械：各リンクの `bottom ≤ 660` |
| AC13 | Home CLS ≤ 0.1・全ボタン高さ ≥ 44px | 機械：決定170 の手順（実クリック・`PerformanceObserver` layout-shift）・`getBoundingClientRect().height ≥ 44` |
| AC14 | 12 シナリオ（PC/SP × Home 2 × Result 4）で JS error 0 | 機械：`pageerror`／console error 0 |
| AC15 | `npm test` 全 PASS・`tsc -b` 0・lint error 0 | 機械 |
| AC16 | Daily 敗北・ベスト未記録で「同点」と表示しない | 機械：`prevBest=0` のシナリオで `[data-testid=daily-diff]` に「同点」を含まない |

`scripts/phase7-p1/acceptance.mjs`（新規）は本監査の計測スクリプト（scratchpad）を土台にし、上記 AC3〜AC5・AC9〜AC14・AC16 を JSON で出力する。

---

## 17. Scope Exclusions（P1 対象外）

49マス到達盤（P2）／新通貨／God EXP／OTOMO EXP／Mission system／Achievement system／Ranking 公開・順位表・percentile（P5・CEO Gate）／Season／PvP／Gacha／Battle Pass／login bonus／stamina／AI Deck Advisor／結果画面の「使った札・使えなかった札」3 行（P4）／DeckBuilder の使用実績（P4）／初戦コーチ（P4）／OTOMO 絆 pt 計算式・★3 条件（P3a）／報酬候補の型別化（P3a）／Mastery 閾値・7 神化・履歴（P3b）／deckPreference の神ごと保存（P3a）／神階の事前選択 UI（既存 GodSelect のまま）／Result の肖像・振り返り・内訳の内容変更（順序のみ）／サウンド・VFX。

---

## 18. Cost Estimate

| 項目 | 変更規模 | 想定ファイル数 | Risk | 工数 |
|---|---|---|---|---|
| Result Hub（順序・階層・3 遷移・共有降格・`<details>`・勝利アニメ段替え） | 中（JSX 並べ替え＋props 6＋GameFlow 3 関数＋CSS 40〜60 行） | 4（GameOverOverlay／BattleScreen／GameFlow／battle.css） | 低〜中（遷移・Daily 回数） | 1.5 日 |
| Next Goal Logic（純関数＋入力収集＋テスト） | 小〜中（規則 14 本） | 3（nextGoal.ts／test／BattleScreen） | 低 | 1.0 日 |
| Home Today（パネル・進行チップ・Resume 格上げ・3 リンク横並び・次リセット計算） | 中 | 5（HomeTodayPanel／HomeScreen／dailyClock／setup.css／test） | 低（CLS 再計測要） | 1.5 日 |
| Daily Difference（純関数＋2 行表示＋誤表示修正） | 小 | 3（dailyDiff.ts／test／GameOverOverlay） | 低 | 0.5 日 |
| QA（Playwright acceptance 新規・12 シナリオ・CLS・Battle 不変計測・CEO 実機 QA 支援） | 中 | 1（acceptance.mjs）＋既存 measure.mjs | — | 1.0 日 |
| **合計** | | **約 12 ファイル（src 9・test 4・scripts 1）** | | **約 5.5 人日** |

決定186 の「約 4 日」は Result Hub＋Home Today の実装分としては妥当だが、**Playwright Acceptance の作成と CLS 再計測（決定170 の Gate）を含めると 5.5 人日**が現実的。超過分は QA であり、実装の範囲は増えていない。

---

## 19. Implementation Order

1. 純関数とテストを先に固定：`nextGoal.ts`（§6 の 14 規則）、`dailyDiff.ts`（§9）、`dailyClock.msUntilNextDailyKey`（境界テスト）
2. `GameFlow` に遷移 3 本を追加し、`BattleScreen`→`GameOverOverlay` へ props を通す（この時点で既存 2 出口＋新 3 出口が動く）
3. `GameOverOverlay` の再配置・階層 CSS・`<details>`・共有降格・勝利アニメ段替え
4. `HomeTodayPanel`＋`HomeScreen`（Resume 格上げ・進行チップ・3 リンク横並び）＋CSS
5. `scripts/phase7-p1/acceptance.mjs` を作成し AC3〜AC16 を機械測定。`measure.mjs` で Battle 不変を確認。決定170 手順で Home CLS 再計測
6. `npm test`／`tsc -b`／lint／`gameVersion.test.ts` → RC branch（`feat/return-loop-p1`）→ CEO 実機 QA（AC1・AC2 の人間評価）→ Production Release Gate（§6-3 #8・別 Step）

---

## 20. Final Recommendation

**B. READY WITH MODIFICATIONS（Confidence: High）**

- P1 は display-only で成立し、新規永続データ・`src/core` 変更・saveVersion／gameVersion 変更は **不要**。BLOCKER なし
- 決定186 からの修正は 5 点（§1）。いずれも実データ（storage の実フィールド・実画面計測）に基づく縮小または階層化であり、方向性は変えない
- 実装は §19 の順序で、RC branch 上で行う。Production 反映は別 Step（Release Gate・CEO 承認）
- 次の一歩：P1 実装着手（本書 §13 の範囲）。CEO 確認事項は無い

---

### 付録 A — 実画面計測の再現

scratchpad の `p7p1/capture.mjs`（本書作成時に使用・コミット対象外）：`npm run build` → `npx vite preview --port 4181` → `node capture.mjs <outDir> http://localhost:4181`。PC 1508×660／SP 390×844 で Home 2 種・Result 4 種を撮影し、要素の top/height/初期ビュー内判定を `report.json` に出力。勝利の settled 状態は `SETTLE_MS=5000`。実装時は同スクリプトを `scripts/phase7-p1/acceptance.mjs` として整備する。

### 付録 B — 本書で参照した主要 file:line

`GameFlow.tsx:27`（SetupScreen）・`:150-167`（backToGodSelect／goHome）・`:295-330`（onRematch）／`HomeScreen.tsx:79-118`／`GameOverOverlay.tsx:207-225`（Daily ブロック）・`:353-367`（出口）／`BattleScreen.tsx:582-603`／`useGameEngine.ts:199-241`（決着時の記録）・`:294`（再戦 seed）／`recordStorage.ts:123-151`／`dailyStorage.ts:144-176`／`dailyClock.ts`／`stakeStorage.ts:70-135`（`recordStakeResult` :104）／`otomoBondStorage.ts:138-152`／`otomoGrowthDisplay.ts`／`masteryDisplay.ts`／`stakes.ts:151-171`／`dailyBoss.ts`／`battle.css:2784-2830`（overlay/card）・`:4138-4141`（result-rise）／`setup.css:879-1060`（home）／`daily.css:8-30`（home-cta-daily）／`rules.ts:205-209`（daily）・`:143-171`（mastery）・`:419`（unlockDifficulty）。

---

### 付録 C — 実装記録（決定187・2026-09-17・branch `feat/phase7-p1-result-home`）

本書を唯一の正式仕様として実装した。仕様の意図を保ったまま実装時に AI 判断で決めた細部は次のとおり（すべて §6-2 の範囲）。

| # | 本書の記載 | 実装 | 理由 |
|---|---|---|---|
| C-1 | N5 の文言例「神技評価 →S（神業）まであと3pt」 | 「神技評価 S（神業）へ：55% → 58%」 | Human Play QA（2026-09-06）で神技評価の差分表現「あと○%」を廃止済み（`masteryDisplay.test.ts` で固定）。既存の「現在値 → 次ランク閾値」の形に揃えた。目標の中身（次ランク）は同じ |
| C-2 | N5 の条件「次ランク閾値との差 ≤ 0.10」 | 同条件に加え、ゲート未達（福永の評価対象外・寿楽の「かんたん」上限A・寿楽 A→S ゲート未達）と距離 0 以下は候補外 | raw を上げてもランクが上がらない状態を「近い目標」と誤案内しないため |
| C-3 | 進行チップ「タップで神階→神を選ぶ、絆→OTOMO、自己ベスト→戦績」 | 操作要素にしない（文字チップのみ） | 同じ行き先は直下のリンク行に既にあり、ボタン化すると CTA が 3 つ増え、PC 1508×660 で 3 リンクが画面外に落ちる（AC12）ため |
| C-4 | §13 の新規遷移は 3 本（deckBuild／daily／home） | 5 本（＋「神を選ぶ（通常攻略）」→ godSelect、「戦績を見る」→ record） | §5-2 の表で Daily 残り 0 の Secondary にこの 2 つが指定されているため。いずれも既存画面への遷移のみ |
| C-5 | 「デッキを調整」（Daily）は同じ日の残り回数内でデッキ画面へ | 同条件に加え、日付をまたいだ場合は神域挑戦画面へ戻す | 昨日の seed のままデッキ画面から開始させないため（回数の消費は既存 `beginDailyChallenge` のみ） |
| C-6 | Result → ホーム | 遷移時に保存状態を読み直す | 「続きから」で再開した対局はホーム画面のまま始まり、ホームへ直行すると再読込の effect が走らず、決着済みのセーブが「続きから」として残る経路があったため（E2E で幽霊の続き 0 を確認） |
| C-7 | Daily 2 行目「両方勝利なら 撃破 R→R」 | 両方勝利かつラウンドが変わったときだけ | 「R4→R4」は情報が無く、行を長くするだけのため |
| C-8 | Daily 1 行目「今日のベスト {score}（1回目）」 | 「（{attemptsUsed}回目）」 | 途中放棄した挑戦も回数に数えるため、放棄後の初決着を「1回目」と誤表示しないため |
| C-9 | 同点時の目標（通常 N10・Daily D2） | 「自己ベスト N を超える」「今日のベスト N を超える（残りM回）」 | 規則表に同点の分岐が無く、「あと 0 点」を出さないため |
| C-10 | 報酬未確定時は「報酬カードを選ぶ」単独 | 挑戦状のコピーも報酬確定後に出す | Tertiary も含めて単独にする（Phase 6-C の「勝利 1 回＝報酬の判断 1 回」） |
| C-11 | スコア内訳の折りたたみ見出し「内訳を見る」 | 「スコア内訳」（▸／▾ で開閉を示す） | 開いた状態でも同じ見出しで読めるため |
| C-12 | （本書に記載なし） | `scripts/release-audit/{_lib,save-migration,qa-flow}.mjs` の「続きから」「今日の神域挑戦」の探し方をクラスから文言へ変更 | Release Gate では同じスクリプトを変更前・変更後の両ビルドに使う。P1 で「続きから」が `.home-cta-secondary` から最上位の Primary へ移ったため |

使われなくなった既存 CSS（`daily.css` の `.home-cta-daily`）は差分を小さく保つため残した（表示には影響しない）。

受け入れ試験：`node scripts/phase7-p1/acceptance.mjs <outDir> <rcUrl> --baseline <変更前ビルドUrl>` → `node scripts/phase7-p1/summarize.mjs <outDir>/acceptance.json`。結果は決定187 に記録。
