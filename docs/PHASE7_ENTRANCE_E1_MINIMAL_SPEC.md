# Phase 7 Entrance E1 — Minimal Specification（SPEC / AUDIT ONLY）

- 作成日：2026-09-17
- 対象：master＝origin/master＝`88ca430`（runtime `838d3de`。決定192 PASS / LIVE）。Production の bundle は `index-BJC-pvmE.js`／`index-2sSahltn.css` で、`838d3de..88ca430` の差分は `docs/DECISIONS.md` 1 行のみ＝**現在のコードと Production の runtime は一致**
- 位置づけ：**仕様化と監査のみ**。src／CSS／asset／storage／Ranking／Neon／DB／Production は一切変更していない。成果物は本書、`docs/PHASE7_ENTRANCE_FIRST_IMPRESSION_AUDIT.md` への Errata 追記、分析専用の `scripts/entrance-e1/`（`firstBattle.audit.ts`・`vitest.audit.config.ts`）、scratchpad 上の計測スクリプトのみ。**いずれも未 commit**
- 上流：`docs/PHASE7_ENTRANCE_FIRST_IMPRESSION_AUDIT.md`（判定 B. GO WITH MODIFICATIONS・44/100）。開発順「Hardening LIVE → Entrance E1 → Phase 7 P3 → Entrance E2」は **CEO指示**（2026-09-17）。本書の設計判断・数値・AC はすべて **AI判断**（CLAUDE.md §6-2・§6-6）
- 表記：**【実測】**＝Production／コード／シミュレーションで確認、**【推測】**＝根拠からの推定、**【予測】**＝実装後の見込み

---

## 0. Final Decision

**A. READY FOR IMPLEMENTATION／Confidence：Medium–High**

- High の部分：E1 は `src/core` 差分 0・storage 書き込み 0・新規 key 0・migration 0 で成立することをコードで確認した。Hero God は既存 storage から read-only で確定的に決められる。初陣の神は `balanceSim` で決定した。Daily・P1・P2・Hardening の不変条件と、更新が必要な AC を分離した
- Medium の部分：見た目の出来（神ごとの切り出し位置、6 柱の高画質版の必要性と容量）は実装時の目視確認が要る。期待スコアは予測。月蝕綺譚は未配信（2026-09-19）で、実機の入口は未確認（E1 の設計はこれに依存しない）
- 実装は開始していない。実装開始は CEO の指示を待つ（CLAUDE.md §6-5）

---

## 1. Audit Document Verification（Step 1）

| 区分 | 内容 | 検証結果 |
|---|---|---|
| 実測値 | 7 クリック・6 遷移・約 4,200 字・スクロール 3 か所／モーダル 699 字・閉じるボタンは要スクロール／SP の神の占有率 0〜19%／PC Primary 128×52px・0.7%／続きから 1 クリック／Daily 4 クリック／初回転送 2,282KB | 計測 JSON と一致。コード（`App.tsx` の自動モーダル、`HomeScreen.tsx` の `FEATURED_GOD = GODS[0]`、`bgm.ts` の `retryOnNextUserGesture`）とも一致 |
| コード参照 | `GameFlow.tsx` が `getRecommendedDeck` を import 済み、`engine.startGame` で即開始できる／`deckPreference` に `godId` が残る | 一致（§3・§4 で詳細化） |
| 競合の事実 | 月蝕綺譚・商用 4 作 | 出典つきの記述と【推測】の区別は維持されている。再調査はしていない |
| 推測・予測 | 人間の所要時間、E1 後 62〜70 点 | 本書 §22 で再計算（62〜68、中心 66） |
| **不正確だった記述** | 構図（神は切り抜きではない）／Daily を Primary にする条件／「初回」の条件／LCP 6.0 秒は 1 回値 | **監査文書に「付録 0 Errata」として追記済み**。本書の内容を正とする |

---

## 2. Current Home Architecture（Step 2）

```
App.tsx
 ├─ <header.app-header>  … 全画面共通。タイトル文字＋ミュート／遊び方／感想の 3 アイコン
 ├─ <GameFlow>           … useGameEngine を保持。setupScreen で画面を切替
 │    ├─ home        → HomeScreen（props：savedBattle／onStartFresh／onResume／onShowTutorial／onShowOtomoGrowth／onShowRecord／onShowDaily）
 │    │                 ├─ HomeTodayPanel（dailyBossFor・dailyStorage を読むだけ。onOpenDaily）
 │    │                 └─ HomeProgressRow（stake／otomoBond／record を読むだけ）
 │    ├─ daily       → DailyChallengeScreen（「挑戦開始」で dailyKey を確定 → godSelect）
 │    ├─ godSelect   → GodSelectScreen（神 → 難易度／神階 → 確定。Daily では難易度を飛ばす）
 │    ├─ enemySelect → EnemySelectScreen（通常のみ）
 │    ├─ deckBuild   → DeckBuilderScreen（確定時に saveDeckPreference ＋ startGame／beginDailyChallenge）
 │    ├─ record／otomoGrowth
 │    └─ engine.state あり → BattleScreen（Result Hub・exitResult → planResultTransition）
 ├─ TutorialOverlay（showTutorial。初期値 !hasSeenTutorial()。閉じると markTutorialSeen）
 └─ FeedbackOverlay
```

- 続きから：`GameFlow` が `loadResumableBattle()`（期限切れの Daily セーブは破棄）で読み、Home へ戻るたびに読み直す。`HomeScreen` は `canResume = savedBattle && savedGod && savedEnemyKnown`（決定191）
- 進行中セーブがある状態で新規開始すると `guardDiscard` が確認ダイアログを出す
- Daily の回数消費は `beginDailyChallenge` → `engine.startDailyGame` → `startDailyAttempt` のみ（Home・Daily 画面・神選択・デッキ編成では消費しない）
- **E1 に必要な変更は Home 周辺に閉じる**：`HomeScreen`／`HomeTodayPanel`／Home の CSS／`App.tsx` の 1 行／`GameFlow` に開始関数 1 つ／短い説明モーダル 1 つ／read-only ヘルパー 1 つ。`useGameEngine`・各選択画面・Battle・Result・storage schema は触らない（§23）

---

## 3. Hero God Rule（Step 3）

**決定：次の順で最初に成立した神を Home の中心に置く。すべて read-only。新規 key 0・書き込み 0。**

| 順 | 出所 | 条件 | 検証【実測：コード】 |
|---|---|---|---|
| 1 | 続きの神 `savedBattle.godId` | `canResume` が true（既存の判定そのまま。`GODS.find` で既知の神のみ） | `HomeScreen.tsx` に既存の `savedGod` |
| 2 | 最後に使った神 `sevengods.deckPreference` の `godId` | 形が正しい（既存の `isSavedDeckPreference`）かつ `version === RULES.saveVersion`（既存の読み込みと同じ規則）かつ `GODS` に存在する | 下記 |
| 3 | fallback：恵比寿（現行の `FEATURED_GOD`） | 上記が不成立、または storage が読めない | 現行どおり |

「最後に使った神」は既存 storage から確実に取れるか：

- `saveDeckPreference(godId, deck)` の呼び出しは `GameFlow.tsx` の**デッキ確定時の 1 か所だけ**で、通常戦・神域挑戦の両方が必ず通る。保存は 1 件だけで常に上書き＝**「最後にデッキを確定した神」そのもの**
- 「続きから」と「もう一度」は保存しないが、どちらも同じ神のままなので矛盾しない
- 既存の読み取り関数 `loadDeckPreference(godId)` は神を引数に取るため、`godId` だけを返す **read-only 関数 `loadLastUsedGodId(): GodId | null` を 1 つ追加**する（schema・書き込みは不変）。未知の `godId`（破損・改ざん）は `null`＝fallback。決定191 と同じ「読むだけ・直さない・消さない」
- 「初陣へ」（§7）は `saveDeckPreference` を呼ばない。初陣の神＝fallback の神＝恵比寿なので、初戦後の Home も恵比寿で一貫する

不採用：Daily の `bestGodId`（その日の最高点の神で、毎日変わる）／戦績の勝数最多の神（7 回読む・同数の扱いが要る・「今の相棒」とずれる）／`GameFlow` の `godId` state（リロードで消える）。

表示：神名（`nameJa`）・型のバッジ・タグライン（既存の `god.tagline`）。画像は §13・§14。**E1 では神の絵を操作要素にしない**（操作要素の予算のため）。

---

## 4. Hero Enemy Rule（Step 4）

- **出所は `dailyBossFor(todayDailyKey())` の 1 つだけ**（現行の `HomeTodayPanel` と同じ）。新しい enemy state は作らない。seed・reset・敵の決定には触れない
- 敵の ID は**定義（`ENEMIES`）から決定論的に生成**され、storage を経由しない。したがって未知 ID の経路を新設しない（§17）
- 表示：敵の切り抜き（既存の `def.art`。768×768・alpha あり【実測】）を「今日の神域挑戦」ブロックの左に置く。PC 112〜120px、SP 64px。背後に既存の `def.stage.accent` の光（現行の `--daily-accent` を流用）
- 続きがある時も Primary が「初陣へ」の時も、絵は常に今日の敵（＝Today ブロックの一部）。続きの相手は「続きから」の副文言で文字として示す（現行どおり `safeEnemyName`）
- 主従：神＝画面の 44〜52%、敵＝1〜3%。敵は神と同じ面に並べず、Today ブロックの中に収める。**神が主役、敵は「今日の試練」**

---

## 5. Home Visual Hierarchy（Step 5）

| 順位 | 要素 | 続きがある時 |
|---|---|---|
| 1 | Hero God（全面の場面） | 続きの神になる |
| 2 | Primary CTA（金・1 個） | 「続きから」 |
| 3 | 今日の神域挑戦（敵の絵・残り回数・ベスト） | 変わらない（Primary より下） |
| 4 | 進行（1 行・最大 3 チップ） | 変わらない |
| 5 | 下位の操作（Secondary ボタン・リンク 2 本） | 「神を選ぶ」が Secondary |

ロゴは順位の外に置く常設要素（3 秒でタイトルを認識させるため、PC は右カラムの最上部、SP は絵の上に重ねる）。

### 5-1. PC wireframe（1508×660／1366×768）

```
┌───────────────────────────────┬──────────────────────────────────┐
│ [Hero God：幅 52%・高さ 100%]      │                     (音)(遊び方)(感想) ← 浮かせる │
│  キービジュアルを cover で敷く      │  SEVENDAO GAMES                            │
│  右端 25% は紺へフェード            │  SEVEN GODS（44px）  共鳴カードバトル          │
│                               │                                            │
│                               │  ┏━━━━━━━━━━━━━━━━━━━━┓  ← Primary（金・1 個）│
│                               │  ┃ 続きから／初陣へ／神域へ挑む／神を選ぶ ┃    幅 320px 以上・高さ 64px 以上│
│                               │  ┃ 副文言 1 行                        ┃                │
│                               │  ┗━━━━━━━━━━━━━━━━━━━━┛                │
│                               │  [ Secondary ]（枠のみ・金にしない・0〜1 個）      │
│                               │                                            │
│                               │  ▌今日の神域挑戦 ★★★★★              9月17日 │
│  攻撃型                         │  ▌(敵の絵 112px) 双牙の魔獣【連撃型】神域強化     │
│  恵比寿（28px）                  │  ▌  残り 3/3・まだ挑戦していません  [挑戦する…] │
│ 「今日も上機嫌、明日はもっと大漁」    │  （神階…）（七柱との絆…）（自己ベスト…） ← 1 行・3 個まで│
│                               │  🏆 戦績を見る   ♥ OTOMOとの絆を見る            │
└───────────────────────────────┴──────────────────────────────────┘
```

- 右カラムは最大幅 520px・縦中央。高さの見積り：ロゴ 110＋Primary 64＋Secondary 48＋Today 116＋進行 28＋リンク 44＋余白 84＝494px ≤ 660px【推測】。**ページの縦スクロール 0**
- 神の占有率：幅 52%×高さ 100%＝約 52%（フェード部を除いても 39% 以上）【予測】
- 1366×768 は同じ構成で、縦の余白が増えるだけ

### 5-2. Mobile wireframe（390×844／390×760）

```
┌──────────────────────────┐
│ SEVEN GODS（28px）   (音)(遊)(感) │ ← ヘッダーは透明にして絵の上に重ねる
│                          │
│   [Hero God：幅 100%・高さ 44vh]   │   844 → 371px（44%）／760 → 334px（44%）
│   下 35% は紺へフェード            │
│ 攻撃型  恵比寿                  │
│ 「今日も上機嫌、明日はもっと大漁」    │
├──────────────────────────┤
│ ┏━━━━━━━━━━━━━━━━━━┓ │ ← Primary：幅いっぱい・高さ 60〜64px
│ ┃ Primary ＋ 副文言 1 行        ┃ │
│ ┗━━━━━━━━━━━━━━━━━━┛ │
│ [ Secondary（0〜1 個・44px） ]   │
│ ▌今日の神域挑戦 ★★★★★   9月17日 │
│ ▌(絵64) 双牙の魔獣【連撃型】      │
│ ▌ 残り 3/3・ベスト —  [挑戦する] │
│ （神階）（絆）（自己ベスト）        │ ← 1 行。入りきらなければ右から落とす
│ 🏆 戦績を見る  ♥ OTOMOとの絆を見る │
└──────────────────────────┘
```

- 下半分の見積り：Primary 64＋Secondary 44＋Today 96＋進行 28＋リンク 44＋余白 84＝360px ≤ 426px（390×760 の残り）【推測】。**390×760 でも縦スクロール 0**（現行 1.44〜1.6 画面【実測】）
- 「共鳴カードバトル」は SP ではロゴの直下に 13px で置く（何のゲームかの認識を維持）
- ヘッダーの文字 `SEVEN GODS`（`.app-title`）と Home の `h1` が二重になるため、**Home の時だけ**ヘッダーを透明・枠なしにしてタイトル文字を隠す。CSS の `.app:has(.home-screen)` で行い、`App.tsx` の構造は変えない（`:has` 非対応の古いブラウザでは現行のバーのまま＝機能は落ちない）

---

## 6. Primary CTA State Machine（Step 6）

**金色の Primary は常に 1 個。上から順に評価し、最初に成立した状態を採る。**

| 状態 | 条件（すべて read-only） | 表示文言 | 副文言 | 遷移先（既存の関数） | Daily の回数を消費する時点 | 戻る操作 |
|---|---|---|---|---|---|---|
| **A 続きあり** | `canResume`（現行どおり） | 続きから | `{神域挑戦・}{神名} vs {敵名}・ラウンド{n}`（現行どおり） | `onResume` → `engine.resumeGame` | 消費しない（再開） | 戦闘内の既存メニュー |
| **B 完全新規** | A でない かつ プレイの痕跡が無い（下記） | 初陣へ | おすすめの構成ですぐ戦う | 短い説明（§8）→ `engine.startGame`（§7） | 関係なし（通常戦） | 説明の「もどる」で Home。戦闘後は Result Hub |
| **D 今日の神域が手つかず** | A・B でない かつ 今日の `attemptsUsed === 0` かつ `attemptsLeft > 0` | 神域へ挑む | 今日の試練：{敵名}・残り {n}/3 | `onShowDaily`（Daily 画面へ。現行と同じ） | **現行どおり戦闘開始時のみ**（`beginDailyChallenge` → `startDailyGame`） | Daily 画面の「ホームへ戻る」 |
| **C 通常復帰** | 上記以外（今日すでに挑戦した／使い切った） | 神を選ぶ | 通常攻略：神と敵を選んで戦う | `onStartFresh`（現行と同じ。`guardDiscard` あり） | 関係なし | 神選択の「ホームへ戻る」 |

- 「プレイの痕跡が無い」＝`savedBattle` なし **かつ** 7 神すべての戦績が `wins + losses + finished === 0` **かつ** `loadLastUsedGodId() === null` **かつ** Daily の履歴に `attemptsUsed > 0` の日が無い。`tutorialSeen` は条件に使わない（旧版で説明だけ読んで未プレイの人にも「初陣へ」を出してよい）
- **P1 の Next Goal との整合**：`nextGoal.ts` の N4 は「今日の神域挑戦が手つかず（`attemptsUsed === 0`）」の時だけ Daily を勧める。状態 D の条件はこれと同一。1 回でも挑戦した日は Daily を Primary にしない＝**Daily を強制しない**（Today ブロックの小さい CTA からはいつでも行ける）
- Secondary（枠のみ・金にしない）：A →「神を選ぶ」／B →「神を選ぶ」／D →「神を選ぶ」／C → なし
- Today ブロックの CTA（`data-testid="home-today-cta"`）：D の時は **Primary 自身がこの testid を持ち、Today ブロック内のボタンは出さない**（同じ行き先のボタンを 2 つ並べない）。A・B・C の時は Today ブロック内に小さい枠ボタンとして残す（「挑戦する（残りN回）」／「今日の記録を見る」。現行の文言）
- 「神を選ぶ」「続きから」の文言・`data-testid="home-start"`／`home-resume"`・クラス `.home-cta-primary`（その時の Primary に付く）は維持（全 QA スクリプトが依存）
- 状態の決定は純粋関数 `selectHomePrimary(input)` に切り出し、unit test で 4 状態と境界（未知 enemyId の保存＝A にならない、Daily 0/3、日付またぎ）を固定する

---

## 7. First-Time Flow（Step 7）

### 7-1. 設計

```
Home（状態 B）
  └─「初陣へ」                       … クリック 1
      └─ 短い説明（3 行・スクロールなし）
          └─「出陣する」              … クリック 2   → engine.startGame(恵比寿, おすすめデッキ, 'normal', 報酬ボーナス, 'guardian', 試練の影, 0, null)
              └─ Battle：手札のカード … クリック 3（現行どおり 1 タップで使用【実測】）
```

- **3 クリック・画面遷移 1（Home → Battle）＋モーダル 1・スクロール 0・判断 0**（現状 7 クリック・6 遷移・スクロール 3・判断 4【実測】）
- preset は UI 層の定数 1 か所（`firstBattle.ts`：`godId`／`enemyId`／`difficulty`）。`src/core/data/rules.ts` には置かない（バランス値ではなく画面導線の既定値で、`src/core` 差分 0 を守るため。AI判断）
- `GameFlow` の開始関数は、`setGodId`／`setDeck`／`setDifficulty('normal')`／`setStake(0)`／`setStakeChoice(null)`／`setOtomoGrowthPath('guardian')`／`setSelectedEnemyId(試練の影)`／`setDailyKey(null)` を行ってから既存の `engine.startGame` を呼ぶ。これで Result の「もう一度」「デッキを調整」（P1）がそのまま動く
- 状態 B は `savedBattle` が無い時だけなので `guardDiscard` は不要
- 戦績・報酬・神×敵の初撃破（P2）・OTOMO の絆は**通常戦と同じ決着処理**を通る。初勝利で P2 の初撃破 1 行が出る
- 一本道にしない：「神を選ぶ」は Secondary として初期 viewport 内に残す。ロック・段階解放は作らない

### 7-2. 初陣の神：balanceSim による決定【実測】

`scripts/entrance-e1/firstBattle.audit.ts`（分析専用。既存の `phase3-audit` ハーネスを使用）。条件：敵＝試練の影／おすすめデッキ／神階なし／各セル 300 seed。初心者の代理は 3 種：**Tapper**（手札の左から出せるだけ出す・託宣を使わない）、**Attacker**（守らない）、**Balanced**（Phase 7 監査の New Player と同じ）。

難易度「ふつう」の結果（HP・被ダメージは内部値。表示は ×10）：

| 神 | 勝率 T／A／B | 敗北率（最大） | 勝利ラウンド T／A／B | 平均被ダメージ B | 平均残 HP T／A／B | 固有の仕組み（理解難度） |
|---|---|---|---|---|---|---|
| **恵比寿** | **100／100／100** | **0** | 5.8／4.9／5.1 | 22.6 | 25.0／17.6／23.8 | **なし（神技評価の対象外）＝最も単純** |
| 大耀 | 100／**95**／100 | **5.0**（Attacker） | 5.8／4.8／5.2 | 19.2 | 19.2／11.5／20.5 | 自傷つきの大技（豪快な一撃）。守らないと負ける |
| 蒼毘 | 100／100／100 | 0 | 5.7／5.4／5.3 | 26.6 | 27.1／23.7／23.9 | 反撃の構え（防御型） |
| 才華 | 100／100／100 | 0 | 5.8／4.7／5.0 | 17.0 | 16.2／**8.4**／16.5 | 神力・手札を増やす技巧型。残 HP が最小 |
| 寿楽 | 99／100／100 | 0（未撃破 1%） | **6.6**／5.5／5.5 | 32.3 | 29.1／24.8／26.2 | 制御型。決着が最も遅い |
| 福永 | 99／99.3／100 | 1.0 | 6.3／5.3／5.7 | 25.5 | 25.4／19.1／24.8 | 大勝負（賭け） |
| 笑蓮 | 100／99.7／100 | 0.3 | 6.1／5.1／5.2 | 20.4 | 28.2／23.5／25.6 | 無傷の慈愛（被弾しない条件） |

- **手札事故（出せるカードが 1 枚も無いラウンド）は全条件で 0%**。余り神力は 0〜0.2／ラウンド。試練の影×おすすめデッキなら事故は起きない
- 「かんたん」は全神・全代理で勝率 100%。ただし「ふつう」でも最低 95% のため、**難易度は既存の推奨どおり「ふつう」**でよい（戦績・スコアの基準を通常プレイと揃えられる）
- **決定：恵比寿・ふつう**。根拠：①全 6 条件で勝率 100%・敗北 0（大耀は守らない初心者で 5% 負ける）、②残 HP が 3 代理すべてで上位、③固有の神技を持たず、初戦で覚えることが最少（神技評価の表示も出ない）、④神選択の説明が「扱いやすい速攻型」、⑤Home の fallback の神と一致し、高画質のキービジュアルが既にある
- 監査時点の「恵比寿を第一候補」は、シミュレーションで**確定**に変わった

---

## 8. Tutorial Reduction（Step 8）

現行の 6 節＋コツ 4 行（699 字）を分類した。**削除はしない**。完全版は現行どおりヘッダーの本のアイコンからいつでも開ける。

| 現行の内容 | 分類 | 理由 |
|---|---|---|
| ② 敵の予告を見よう | **初陣前（1 行目）** | 最初の判断に必要 |
| ③ 神力を使ってカードを出そう／コツ「持ち越せません」 | **初陣前（2 行目）** | 最初の操作に必要 |
| ⑤「ラウンドを終える」／⑥ 7 ラウンド以内に HP 0 で勝利 | **初陣前（3 行目）** | 進め方と勝利条件 |
| ④ 共鳴と託宣 | 戦闘中に必要 | 戦闘画面に「共鳴 0・あと7で神技発動」「託宣（残り7回・1ラウンド1回まで）」の表示が既にある【実測】。初陣前には出さない |
| ① 神とデッキを選ぼう・神技 | 初戦後でよい | 初陣は preset。Result Hub（P1）から神選択へ進む時に必要になる |
| ⑥ の注記（OTOMO の絆）・スコア・コツ 3 本 | 遊び方（完全版）へ | 初戦の勝敗に不要 |

初陣前の 3 行（実仕様に基づく。約 95 字）：

1. 敵は次の行動を予告します。⚔ の数字が、次に受ける攻撃です。
2. 神力の分だけカードを出せます。余った神力は次のラウンドへ持ち越せません。
3. 出し終えたら「ラウンドを終える」。7 ラウンド以内に敵の HP を 0 にすれば勝利です。

- ボタン：「出陣する」（Primary）／「もどる」／文字リンク「詳しい遊び方」（完全版を開く）。**3 つともスクロールなしで見える**こと
- 起動時の自動モーダルは廃止（`App.tsx` の初期値を `false` に）。`markTutorialSeen` は、短い説明を閉じた時と完全版を閉じた時に呼ぶ（既存 key・既存関数。タイミングが変わるだけ）。旧ビルドへ rollback した場合、説明を一度も閉じていない人にだけ旧モーダルが出る＝害なし
- 戦闘中のチュートリアルとの重複：戦闘中にあるのは決断 callout（`BattleCallout`・700ms）と Boss Entrance のみで、教育用のコーチは無い【実測】。重複なし。状況コーチ（過去監査 §12 の 3 例）は E1 の範囲外

---

## 9. God Select Mobile（Step 9）

**決定：E1 では変更しない。E2 へ送る。**

- 390px で 4.2〜4.6 画面【実測】という問題は残るが、E1 では**新規プレイヤーが神選択を通らない**ため、第一印象への影響は外れる
- 復帰プレイヤーは一覧を知っており、P2 の印（「撃破 k/7 敵」）のテストが構造に依存している。ここを触ると P2 の基準取り直しが増える
- E2 での最小案（参考）：冒頭の説明 2 ブロックを 1 行＋折りたたみに／神の絵を大きく／確定ボタンを画面下に固定

---

## 10. Secondary Navigation（Step 10）

**ヘッダーのアイコンを除く操作要素は最大 5 個。**

| 状態 | Primary | Secondary | Today CTA | 下位リンク | 合計 |
|---|---|---|---|---|---|
| A | 続きから | 神を選ぶ | 挑戦する／今日の記録を見る | 戦績を見る・OTOMOとの絆を見る | 5 |
| B | 初陣へ | 神を選ぶ | 挑戦する | 同上 | 5 |
| D | 神域へ挑む（＝Today CTA） | 神を選ぶ | （Primary が兼ねる） | 同上 | 4 |
| C | 神を選ぶ | — | 挑戦する／今日の記録を見る | 同上 | 4 |

- **Home の「遊び方を見る」リンクは、ヘッダーの既存の本のアイコン（同じ機能・`aria-label="遊び方を見る"`）に一本化**する。機能の削除ではなく重複の解消。新規プレイヤーには短い説明の中に「詳しい遊び方」がある
- 「編成」は Home に新設しない（デッキ編成は神を選んだ後の既存経路。Result の「デッキを調整」も既存）
- 下位リンクは下線をやめ、アイコン＋ラベル（枠なし・44px 以上）。文言「戦績を見る」「OTOMOとの絆を見る」は維持（QA スクリプトが依存）
- 既存機能はすべて到達可能：通常戦／神域挑戦／続きから／戦績（＋P2 攻略板）／OTOMO の絆／遊び方／ミュート／感想

---

## 11. Progress Budget（Step 11）

**Home の進行表示は 1 行・最大 3 チップ。E1 では行も枠も増やさない。**

| 候補 | E1 での扱い | 理由 |
|---|---|---|
| Daily | チップにしない | Today ブロックが担当 |
| 自己ベスト（PB） | **チップ 1**（現行どおり） | 最優先。SP で入りきらない時も最後まで残す |
| 神階 | **チップ 2**（現行どおり）。ただし**未解放で戦績 0 の時は出さない** | 「🔒『むずかしい』撃破で解放」は新規に意味が通じない |
| OTOMO（七柱との絆） | **チップ 3**（現行どおり `achievedCount > 0` の時）＝**P3 の予約枠** | P3 はこのチップの中身を「OTOMO の次の成長」等に差し替える。行・枠は増やさない |
| 神×敵（P2） | **Home に出さない** | `loadMatchups()` は初回読み込み時に取り込み（書き込み）を行う。Home で呼ぶと「Home の表示だけで storage write 0」に反する。攻略板は戦績画面のまま |
| Mastery | 出さない | P3 の設計事項 |

- SP は 1 行に収める（現行は 2 行・54px【実測】）。収まらない時は優先度の低い順（絆 → 神階）に落とす
- **P3 用の予約**：Home に追加してよいのは「チップ 3 の中身の差し替え」と「Hero God の足元の 1 要素（神／OTOMO の成長を示す 1 行）」まで。新しい枠・行・ボタンは足さない。これを P3 の設計制約とする

---

## 12. World Language（Step 12）

| 箇所 | E1 の文言 | 判断 |
|---|---|---|
| Primary A | 続きから | 現行維持 |
| Primary B | **初陣へ**／副文言「おすすめの構成ですぐ戦う」 | 世界観語＋平易な副文言で両立 |
| Primary D | **神域へ挑む**／副文言「今日の試練：{敵名}・残り {n}/3」 | 「神域」は Daily の意味でのみ使う |
| Primary C・Secondary | 神を選ぶ | 現行維持（QA 依存・世界観語として成立） |
| Home の名称 | 付けない（見出しなし）。戻るボタンは「ホームへ戻る」のまま | 「神域へ戻る」は Daily と混同するため不採用 |
| Today の見出し | 今日の神域挑戦 | 現行維持 |
| 短い説明のボタン | 出陣する／もどる／詳しい遊び方 | 「出陣」は E2 で選択画面にも広げる候補 |
| 日付 | 「9月17日」（testid は維持） | ISO 形式をやめる |
| タグライン | 七柱の神と挑む、七日間の物語。 | 現行維持（PC のみ。SP は神のタグラインを優先） |

共鳴・神託・試練・神階・七柱・OTOMO は既存の箇所のまま。新しい固有語は作らない。

---

## 13. Visual Treatment（Step 13）

**SEVEN GODS 独自の構図（1 案）：「神の絵が、そのまま入口の場面になる」**

- 神のキービジュアルは背景込みの矩形イラスト（恵比寿なら鳥居・夕焼け・海）。これを枠から出し、PC は左 52%、SP は上 44% に `object-fit: cover` で敷く。**絵の中の世界が Home の「場所」になる**（新規アート 0）
- 絵の端は紺へフェード（PC は右 25%、SP は下 35%）。UI はその上に半透明の暗い面で重ねる
- 神名・型・タグラインは絵の左下に重ねる（暗いグラデーションの上。コントラスト比 4.5:1 以上）
- 今日の敵は透過の切り抜きを Today ブロックに小さく置く。敵ごとのアクセント色の光（既存の `stage.accent`）
- **金は Primary だけ**。Today の CTA・Secondary は金にしない。Today ブロックの全周の枠線をやめ、左のアクセント線＋半透明の面にする。下位リンクの下線をやめる
- 神ごとの切り出し位置（顔が切れない `object-position`）は UI 層の定数で 7 柱ぶん持つ（`godStyle.ts` に追加）。実装時に 4 viewport×7 柱を目視確認
- 月蝕綺譚の構図（瞳の超クローズアップ、8 タブ、案内役の常駐、雲文様）は使わない
- 音・動き（入場演出、BGM の解錠、神の微動）は **E2**。E1 は静止

---

## 14. Performance Budget（Step 14）

### 14-1. Baseline【実測：Production、390×844・DPR2、1.6Mbps・RTT150ms・CPU 4x、キャッシュ無効、各 3 回】

| 条件 | FCP 中央値 | **LCP 中央値** | LCP の範囲 | CLS 最大 | LCP 要素 |
|---|---|---|---|---|---|
| 新規 | 2.7 秒 | **5.8 秒** | 5.5〜7.7 秒 | 0 | 恵比寿の高画質版 |
| 復帰 | 2.3 秒 | **6.1 秒** | 5.8〜6.5 秒 | 0 | 同上 |

- LCP は `keyvisual-hero.webp`（511KB）の**ダウンロード完了時刻とほぼ一致**（5.5〜7.6 秒）。つまり LCP は「Hero 画像のバイト数」で決まる
- 現状、SP ではこの 511KB の絵は**画面外にあるのに**遅延読み込みされず、LCP を支配している。E1 で絵を第一画面に出しても、**同じ 1 枚である限り LCP は悪化しない**

### 14-2. 既存素材【実測】

| 素材 | 寸法 | 容量 |
|---|---|---|
| `gods/*/keyvisual.webp`（7 柱・軽量版） | 675×900 | 126〜198KB |
| `gods/ebisu/keyvisual-hero.webp`（恵比寿のみ） | 1086×1448・quality 88 | 510KB |
| 敵の切り抜き `enemies/*/art(_hq).webp` | 768×768・alpha | 63〜181KB |
| 原本 `art-source/reference/gods/*-keyvisual.png`（配信対象外・保護対象） | 1086×1448（5 柱）／福永 1122×1402／笑蓮 1254×1254 | 2.5〜3.3MB |

### 14-3. 既存画像だけで成立するか

- **成立する**（E1 の機能としては）。ただし軽量版 675px 幅は、SP・DPR3（必要 1,170px）で 1.73 倍、PC・DPR2（必要 約 1,500px）で 2 倍以上の拡大になる。過去に CEO の実機確認で「軽量版をトップに使うと高 DPI で明確に粗い」と判明しており（`HomeScreen.tsx` のコメント）、**恵比寿以外の 6 柱は同じ問題が出る**【推測】
- したがって **Home 用の高画質版を 7 柱ぶん用意する（条件付きで E1 に含める）**。生成はしない。既存の原本からの再エンコードのみ

| 項目 | 仕様 |
|---|---|
| 対象 | 7 柱：`public/assets/gods/{id}/keyvisual-home.webp`（新規ファイル名。既存の `keyvisual.webp`／`keyvisual-hero.webp` は変更しない） |
| 元データ | `art-source/reference/gods/{id}-keyvisual.png`（読み取りのみ。原本は変更しない） |
| サイズ | 幅 1086px・縦横比は原本のまま（福永は 1122→1086、笑蓮は 1254→1086 に縮小。拡大はしない） |
| 品質 | WebP quality 82（恵比寿が 350KB を超える場合のみ 78 まで下げる） |
| 予測容量 | 1 枚 280〜360KB【予測。恵比寿 q88＝510KB からの推定】。リポジトリ増 約 2.0〜2.5MB。**読み込むのは選択中の 1 枚だけ** |
| 配信 | `<img srcset="keyvisual.webp 675w, keyvisual-home.webp 1086w" sizes="(max-width: 700px) 100vw, 52vw" width height fetchpriority="high" decoding="async">`。敵の絵は `fetchpriority="low"` |
| 道具 | 一回限りのスクリプト（`package.json` の依存は増やさない） |
| 判定 | 実装時に DPR2・DPR3 のスクリーンショットで軽量版と比較し、差が見えなければ再エンコードを見送る（＝新規 asset 0 で出す） |

### 14-4. 予算

| 指標 | 予算 | 根拠 |
|---|---|---|
| LCP（上記の回線制限・3 回の中央値） | **≤ 6.7 秒**（baseline 6.1 秒＋10%）。目標 ≤ 4.8 秒 | 350KB の絵なら 4.2〜4.8 秒【予測：バイト比からの推定】 |
| LCP の素材 | ≤ 520KB（目標 ≤ 360KB） | 現行 511KB |
| 初回転送量 | ≤ 2,500KB（現行 2,282KB＋敵の絵 最大 181KB） | BGM 1,612KB の遅延取得は E2 |
| CLS | ≤ 0.1（目標 0） | 絵の箱を固定寸法にし `width`／`height` を付ける。現行 0 |
| decode | `decoding="async"`。1086×1448 の decode は 1 枚のみ | 現行と同じ枚数 |
| DPR | 1／2／3 で絵が粗くない（目視） | §14-3 |

---

## 15. P1 Integrity（Step 15）

**意味として絶対に変えてはいけないもの**

| 項目 | E1 での扱い |
|---|---|
| 続きからが最上位の Primary・**1 クリックで再開**（AC4） | 状態 A。DOM 上も Today より前。`onResume` は無変更 |
| Home 起動後、Daily の敵と残り回数がスクロールなしで読める（AC3） | Today ブロックは 4 viewport すべてで第一画面内。文言「残り N/3」の形式を維持（AC3 の判定が正規表現で依存） |
| Primary が viewport 内・44px 以上（AC5・AC5+） | 強化される |
| Daily：開始ごとに回数 +1・seed 不変・残り 0 で開始不可（AC7） | 無変更（§18） |
| Home の CLS ≤ 0.1・ボタンはすべて 44px 以上（AC13） | 維持 |
| Result Hub／Next Goal／Daily Difference／報酬の流れ（AC1・AC2・AC9〜AC11・AC16・EXTRA-2〜4） | Result 側は一切触らない。`exitResult`／`planResultTransition` は無変更。Home の受け口（`home`／`daily`／`godSelect`）も同じ |
| 戦闘画面のレイアウト不変（AC6） | 触らない |
| testid：`home-resume`／`home-start`／`home-today`／`-enemy`／`-status`／`-attempts`／`-best`／`-countdown`／`-cta`／`-date`／`home-progress`、クラス `.home-screen`／`.home-cta-primary`／`.home-cta-secondary`／`.home-links` | すべて維持 |

**Home の構造変更に伴い、基準の更新が必要なもの**

| AC | 現行 | E1 での更新 |
|---|---|---|
| P1 AC12 | PC 1508×660 で Home の**3 リンク**が viewport 内 | **2 リンク**（戦績・OTOMO）に更新。遊び方はヘッダーへ一本化 |
| P1 acceptance の初回モーダル確認（`acceptance.mjs` の「わかった」を必須とする 1 か所） | 初回にモーダルがある前提 | 「初回にモーダルが**無い**」へ反転（E1 の AC1） |
| `qa-flow.mjs` の `startLabel`（`.home-cta-primary` の文言の記録） | 「神を選ぶ」 | 状態に応じて「初陣へ」／「神域へ挑む」になる。記録値の期待を更新 |

その他の QA スクリプトの「わかった」クリックは「あれば押す」作りで、影響なし【実測：スクリプトの該当行】。

---

## 16. P2 Integrity（Step 16）

- 神×敵攻略（`matchupStorage`・`MatchupBoard`）、神選択の印「撃破 k/7 敵」、敵選択の印、初撃破の 1 行：**E1 は触らない**。神選択・敵選択・戦績・Result を変更しないため、P2 の AC1〜AC4・AC10〜AC18・EXTRA-1〜3 はそのまま再実行できる
- 「初陣へ」の勝利も既存の `recordMatchupClear`（`useGameEngine.ts` の 1 か所）を通る。呼び出しは増やさない
- **Home に P2 を表示しない**（§11。`loadMatchups()` の初回取り込みが書き込みを伴うため）
- 基準の更新が必要：**P2 AC19「Home の出力が P2 前後で同一」**は P1 ビルドと Home の文字列を比べる試験で、E1 で Home を変えれば必ず不一致になる。E1 では「Today のデータ（敵名・残り回数・ベスト）と進行チップの**値**が E1 前後で同一」に置き換える

---

## 17. Hardening Integrity（Step 17）

- 未知 enemyId の保存：`canResume` の条件（`savedEnemyKnown`）と `safeEnemyName` は無変更。状態 A にならず、Home はクラッシュしない。Hero God は規則 2（最後に使った神）→ 3（恵比寿）へ落ちる。保存は消さない・直さない
- 未知の履歴：戦績画面は触らない
- **Hero Enemy は storage を経由しない**（`dailyBossFor` が定義から返す）。Home で `getEnemyDef` に storage 由来の ID を渡す箇所を新設しない
- **Hero God は storage 由来**（`battleSave.godId`／`deckPreference.godId`）なので、必ず `GODS.find` で既知の神だけを採り、未知なら fallback。`getGodDef` のような「投げる」参照を Home で使わない
- OTOMO は Home に描かない（決定192 の Known Risk `otomo.defId` に触れない・増やさない）
- ソース固定テストを追加：Home 系ファイルが `getEnemyDef(` を storage 由来の値に使っていないこと、`localStorage.setItem` を含まないこと
- Hardening acceptance（H1〜H10）と壊れたデータの追加検証（閲覧で storage 変化 0・新規ゲーム開始可）を E1 の gate で再実行。「新規ゲーム開始可」の経路は「神を選ぶ」（状態 C／D の Primary または Secondary）で維持される

---

## 18. Daily Integrity（Step 18）

| 不変 | E1 での保証 |
|---|---|
| 1 日 3 回 | `RULES.daily.attemptsPerDay`・`dailyStorage` 無変更 |
| JST の日付切替 | `dailyClock.ts` 無変更。Home は既存の `useMinuteClock` で再評価（状態 D ↔ C の切替も同じ時計） |
| seed・敵の決定 | `dailyBossFor`・`startDailyGame` 無変更 |
| 回数を消費する時点 | **戦闘開始時のみ**（`beginDailyChallenge` → `startDailyGame` → `startDailyAttempt`）。Home の Primary「神域へ挑む」は `setSetupScreen('daily')` を呼ぶだけで、現行の Today CTA と同じ関数 |
| Home の表示だけで storage を書かない | Home が呼ぶのは読み取り関数のみ（`loadDailyDay`／`dailyAttemptsLeft`／`loadRecentDailyDays`／`loadGodRecord`／`loadGodStakeRecord`／`loadOtomoBond`／`loadLastUsedGodId`／`loadBattleSave`）。`loadMatchups` は呼ばない |

Home → Daily → 戦闘のクリック数（4）は E1 では変えない（Daily 画面を飛ばす短縮は回数消費の確認 UI に関わるため E2 以降で検討）。

---

## 19. Storage / Core（Step 19）

| 項目 | E1 の見込み |
|---|---|
| 新規 storage key | **0** |
| Home の表示による storage write | **0** |
| 既存 key への新しい書き込み | 0（`tutorialSeen` は既存関数を既存の意味で呼ぶ。呼ぶ時点が「起動時のモーダルを閉じた時」から「説明を閉じた時」に変わるだけ） |
| migration／cleanup | 0 |
| `src/core` 差分 | **0** |
| `src/hooks` 差分 | `deckPreferenceStorage.ts` に read-only 関数 1 つを追加（schema・書き込み・既存関数は不変） |
| saveVersion | 9（不変） |
| gameVersion | `1.80c6eda23ed082dc`（不変。`src/core` に触れないため） |
| Score／Seed／cards／enemy・god・OTOMO 定義／Ranking／Neon／DB | 差分 0 |

実現不能な項目は無い。

---

## 20. E1 vs E2 Boundary（Step 20）

| E1 に含める（これ以外は入れない） | E2 へ送る |
|---|---|
| Home の再構成（§5・§13） | セッション初回のタイトル画面・入場演出 |
| Hero God＝続きの神／最後に使った神／恵比寿（§3） | BGM の解錠を兼ねた「タップで入る」、BGM の遅延取得 |
| 今日の敵の絵（§4） | 神の微動・光などの追加の動き |
| Primary の状態機械（§6） | 神選択の再設計（SP 4.6 画面の解消）、確定ボタンの下部固定 |
| 「初陣へ」＋短い説明、起動時モーダルの廃止（§7・§8） | 「出陣」系の文言を選択画面へ展開 |
| 下位操作の整理・進行 1 行（§10・§11） | Home から「前回と同じ構成で」、Daily 画面の短縮 |
| 文言（§12）、日付表記 | 戦闘中の状況コーチ |
| Home 用の高画質版 7 枚（条件付き・§14-3） | OTOMO を Home に出す（P3 と合わせて） |
| Entrance 用 acceptance、P1／P2 の基準更新（§15・§16） | 見た目の磨き込みフェーズ |

---

## 21. Player Simulation（Step 21）

Current は Production の実測。E1 は仕様からの机上計算。所要時間は【推測】（クリック 1.2 秒／判断 2〜4 秒／読む速度 9 字/秒／スクロール 1 秒/画面／システム待ちは実測値）。

| Profile | 経路 | 指標 | Current【実測】 | E1 Spec |
|---|---|---|---|---|
| **New**（初見・説明を半分読む） | 起動 → 最初のカード | clicks | 7 | **3** |
| | | transitions | 6 | **1**（＋モーダル 1） |
| | | scroll が必要なクリック | 3 | **0** |
| | | decision points | 4（CTA・7 神・8 敵・デッキ） | **0〜1**（Primary が 1 つ） |
| | | 通過する文字数 | 約 4,200 | **約 300**（Home 約 120＋説明 約 95＋戦闘の初見） |
| | | 所要時間【推測】 | 120〜250 秒 | **32〜40 秒** |
| **Casual**（復帰・今日の神域が手つかず） | Home → Daily の戦闘 | clicks | 4 | 4（変更なし） |
| | | scroll | 1〜2 | 1〜2（変更なし。Daily 画面は E1 対象外） |
| | | decision points | 3（どの CTA か・神・デッキ） | **2**（Primary が Daily を指す） |
| | | Home で読む量 | 230 字・ボタン 9 | 約 150 字・操作要素 4 |
| | | 所要時間【推測】 | 25〜40 秒 | 22〜35 秒 |
| **Returning**（続きあり） | Home → 戦闘 | clicks | 1 | **1（維持）** |
| | | 所要時間【実測】 | 1.1〜3.1 秒 | 同じ |
| | | Home の神 | 常に恵比寿 | **続きの神** |
| **Optimizer**（神・敵・デッキを選ぶ） | Home → 通常戦 | clicks | 5＋デッキ編集 | 5＋デッキ編集（変更なし） |
| | | decision points | 4 | 4（意図どおり残す） |
| | | Home の神 | 常に恵比寿 | **最後に使った神** |
| | | SP の神選択 | 4.2〜4.6 画面 | 同じ（E2） |

E1 が数字で効くのは New だけ。Casual・Returning・Optimizer は「どれを押すか迷わない」「自分の神がいる」という認知面の改善で、クリック数は変わらない。これは意図した範囲（復帰導線は P1 で既に良い）。

---

## 22. Commercial Re-Score（Step 22）

baseline 44／100。**E1 の値は予測**。前回の 62〜70 を再計算した。

| 項目 | Current | E1【予測】 | 再計算の根拠 |
|---|---|---|---|
| First 3 Seconds | 4 | 7 | モーダルなし・神が第一画面・Primary 1 個。音と動きは無いまま |
| World Immersion | 4 | 6 | 神の絵が場面になる。選択画面はフォームのまま、入場演出なし |
| Hero Character Presence | 4 | 7 | 占有率 44〜52%・自分の神・今日の敵の絵。OTOMO は 0 のまま |
| Primary CTA | 5 | 8 | 金 1 個・最大・状態で決まる |
| First Battle Friction | 3 | 6 | 新規 7→3 クリック。復帰の通常戦 5 クリックと SP の神選択は据え置き |
| New Player Guidance | 4 | 6 | preset＋3 行。戦闘中のコーチは無い |
| Returning Player Guidance | 7 | 7 | 維持（クリック数は同じ） |
| Home Visual Hierarchy | 5 | 7 | 5 階層を固定・同格の金を解消 |
| Mobile Entrance | 3 | 6 | 第一画面に神 44%・縦スクロール 0 |
| Commercial Polish | 5 | 6 | ランディングページの構図・下線リンク・ISO 日付を解消。動きなし |
| **合計** | **44** | **66（レンジ 62〜68）** | |

前回の上限 70 は、E1 から外した要素（音・動き・神選択）を含まないと届かないと判断し、**上限を 68 に下げた**。実装後に同じ計測スクリプトで再測定し、採点し直す。

---

## 23. Expected Runtime Diff（Step 23）

| # | ファイル | WHY | WHAT | RISK |
|---|---|---|---|---|
| 1 | `src/components/setup/HomeScreen.tsx` | Home の再構成 | 2 カラムのランディング構図をやめ、Hero God の面＋操作カラムへ。Primary を `selectHomePrimary` の結果で描く。「遊び方を見る」リンクを外す。props に `onStartFirstBattle` を追加 | 中：P1 の testid・クラスの取りこぼし → ソース固定テストで固定 |
| 2 | `src/components/setup/HomeTodayPanel.tsx` | 今日の敵の絵・CTA の出し分け | 敵の切り抜きを追加。状態 D では内側の CTA を出さない（Primary が testid を持つ）。日付表記。進行チップの規則（未解放の神階を新規に出さない・1 行） | 中：P1 AC3 の文言形式 → 維持を test で固定 |
| 3 | `src/components/setup/setup.css`（Home の区画 約 180 行） | 見た目 | Home の区画を書き換え。`.app:has(.home-screen)` でヘッダーを透明に。金は Primary のみ | 中：他画面と共有のクラス（`.home-cta-primary`／`-secondary` は Daily・神選択でも使用）→ Home 限定のセレクタで上書きし、共有クラスの定義は変えない |
| 4 | `src/components/setup/homePrimary.ts`（新規）＋test | 状態機械を純粋関数に | §6 の 4 状態。React・storage・時計に依存しない（入力を注入） | 低 |
| 5 | `src/components/setup/heroGod.ts`（新規）＋test | Hero God の決定 | §3 の 3 規則 | 低 |
| 6 | `src/hooks/deckPreferenceStorage.ts`＋test | 最後に使った神を読む | `loadLastUsedGodId()` を追加（read-only） | 低：既存関数・schema は不変 |
| 7 | `src/components/setup/firstBattle.ts`（新規）＋test | 初陣の preset | 恵比寿／試練の影／ふつう。ID が定義に存在することを test で固定 | 低 |
| 8 | `src/components/setup/godStyle.ts` | 神ごとの切り出し位置 | `object-position` の定数 7 件 | 低 |
| 9 | `src/components/GameFlow.tsx` | 初陣の開始 | `startFirstBattle()`（state を揃えて既存の `engine.startGame` を呼ぶ）と、短い説明の開閉 state。約 30 行 | 中：「もう一度」「デッキを調整」が preset の値で動くこと → acceptance で確認 |
| 10 | `src/components/FirstBattleBrief.tsx`（新規。`tutorial.css` のクラスを流用） | 3 行の説明 | 出陣する／もどる／詳しい遊び方 | 低 |
| 11 | `src/App.tsx` | 起動時の自動モーダルを廃止 | `useState(() => !hasSeenTutorial())` → `useState(false)`。`closeTutorial` は現行どおり | 低 |
| 12 | `src/components/entranceWiring.test.ts`（新規） | 不変条件の固定 | Home 系が `localStorage.setItem`・`loadMatchups`・storage 由来の `getEnemyDef` を含まない／testid・文言の存在 | 低 |
| 13 | `scripts/entrance-e1/acceptance.mjs`（新規）、`scripts/phase7-p1/summarize.mjs`・`acceptance.mjs`、`scripts/phase7-p2/acceptance.mjs`、`scripts/release-audit/qa-flow.mjs` の基準更新 | QA | §24 の AC を自己判定。§15・§16 の 3＋1 か所を更新 | 中 |
| 14 | `public/assets/gods/*/keyvisual-home.webp` ×7（**条件付き**） | 高 DPI での粗さ | §14-3。非生成の再エンコード | 低：既存ファイルは不変。容量 約 2.0〜2.5MB 増 |

触らない：`src/core/**`、`useGameEngine.ts`、`GodSelectScreen`／`EnemySelectScreen`／`DeckBuilderScreen`／`DailyChallengeScreen`／`RecordScreen`／`OtomoGrowthScreen`、`src/components/battle/**`、storage の各モジュールの書き込み側、`index.html`、`package.json`、Ranking／Neon／DB。

規模は runtime 11 ファイル（新規 5・変更 6）で、大きな書き換えは #1〜#3 のみ。巨大変更ではないため、これ以上の縮小は不要と判断。

---

## 24. Acceptance Criteria（Step 24）

計測は 4 viewport（PC 1508×660／1366×768、SP 390×844／390×760）。独立コンテキスト＋fixture。実ユーザーの storage には触れない。

| # | 基準 | 判定方法 |
|---|---|---|
| AC1 | 初回（storage 空）の起動時に**説明モーダルが無い** | `.tutorial-overlay` が存在しない |
| AC2 | 初期 viewport 内に、タイトル（`h1`）・Hero God の絵・Primary CTA がすべて入っている（新規・復帰とも） | rect |
| AC3 | Hero God の絵の viewport 占有率が **PC 35% 以上・SP 35% 以上**（目標 PC 45%・SP 40%）。顔の領域に操作要素が重ならない | rect の交差面積 |
| AC3b | Hero God＝続きの神（`canResume` 時）／最後にデッキを確定した神／どちらも無ければ恵比寿。未知の `godId` は恵比寿 | fixture 4 種 |
| AC4 | **金色の Primary はちょうど 1 個**（`.home-cta-primary` が 1 要素）。面積は Home 内のどの操作要素よりも大きく、PC 320×64px 以上・SP 幅いっぱい×60px 以上 | DOM・computed style |
| AC4b | 状態機械：A 続きから／B 初陣へ／D 神域へ挑む／C 神を選ぶ が §6 の条件どおり出る。Daily を 1 回以上使った日は D にならない | fixture 6 種＋unit test |
| AC5 | 今日の敵の**名前と絵**が初期 viewport 内 | rect・`img` の読み込み完了 |
| AC6 | Daily の状態（「残り N/3」または「今日の3回は終了」＋次の敵までの時間）が初期 viewport 内 | 既存 testid |
| AC7 | 新規：URL を開いてから最初のカードの使用まで **3 クリック以下** | 実クリック計測 |
| AC8 | 新規：その経路で**スクロールが必要なクリック 0**。Home のページ縦スクロール 0（4 viewport） | クリック前の rect・`scrollHeight` |
| AC9 | 新規：自動操作で 15 秒以内に最初のカード。人間の目標 60 秒以内（短い説明は 120 字以下・3 行・ボタンがスクロールなしで見える） | 計測・文字数 |
| AC10 | **続きから 1 クリック**で戦闘に戻る。未知 enemyId の保存では「続きから」を出さない | 既存の計測＋Hardening fixture |
| AC11 | PC 2 viewport：操作要素（ヘッダーのアイコンを除く）5 個以下、すべて viewport 内、下位リンク 2 本が viewport 内 | DOM |
| AC12 | SP 2 viewport：同上。ボタンはすべて高さ 44px 以上。進行表示は 1 行・3 チップ以下 | DOM |
| AC13 | `scrollX = 0`（Home・短い説明・戦闘開始直後） | `scrollWidth` |
| AC14 | LCP（§14-1 と同じ回線制限・3 回の中央値）**≤ 6.7 秒**。LCP の素材 ≤ 520KB。初回転送量 ≤ 2,500KB | CDP |
| AC15 | Home の CLS ≤ 0.1（目標 0） | layout-shift |
| AC16 | P1 回帰なし：AC1〜AC11・AC13・AC14・AC16・EXTRA-1〜4 が PASS。AC12 は「2 リンク」に更新して PASS | `scripts/phase7-p1` |
| AC17 | P2 回帰なし：AC19 を §16 のとおり置き換えた上で全 AC PASS | `scripts/phase7-p2` |
| AC18 | Hardening 回帰なし：H1〜H10 PASS、壊れたデータで閲覧による storage 変化 0・新規ゲーム開始可 | `scripts/hardening-invalid-enemy-id` ほか |
| AC19 | Daily 不変：Home の Primary／Today CTA を押しても回数は減らない。戦闘開始ごとに +1・seed 不変・残り 0 で開始不可・JST の日付切替で状態が変わる | P1 AC7＋fixture |
| AC20 | 不変条件：`src/core` 差分 0／新規 key 0／Home の表示による storage write 0（起動〜Home〜戦績〜Home で全 key が 1 バイトも変わらない。P2 の matchups 取り込みは戦績画面の既存仕様として別扱い）／migration 0／saveVersion 9／gameVersion 不変／Ranking Absence PASS／Secret Audit PASS | 既存の invariant audit |
| AC21 | 初陣：恵比寿・おすすめデッキ・試練の影・ふつうで始まる。決着後の「もう一度」「デッキを調整」「ホームへ」が動く。勝利で戦績・報酬・P2 の初撃破が通常戦と同じに記録される | acceptance |
| AC22 | 既存プレイヤー（戦績あり）に「初陣へ」を出さない。「神を選ぶ」は全状態で初期 viewport 内にある | fixture |
| AC23 | 既存機能への到達：通常戦／神域挑戦／戦績／OTOMO の絆／遊び方（ヘッダー）／ミュート／感想 がすべて Home から 1 クリック | 経路テスト |
| AC24 | 文字のコントラスト比 4.5:1 以上（絵の上の神名・タグライン・ロゴ）。`prefers-reduced-motion` で新しい動きが無い（E1 は動きを足さない） | 計測 |
| AC25 | JS error 0（全シナリオ） | pageerror |
| AC26 | `npm test`・`tsc -b`・lint error 0・clean build 成功 | gate |

---

## 25. Risks

| リスク | 影響 | 対策 |
|---|---|---|
| 神ごとに顔の位置が違い、cover の切り出しで顔が切れる | 第一印象 | 7 柱×4 viewport を目視。`object-position` を神ごとに持つ。福永（4:5）・笑蓮（正方形）は特に確認 |
| 高画質版の容量が予測を超える | LCP | quality を 78 まで下げる。超える場合は軽量版で出し、E2 で再検討 |
| 共有クラス（`.home-cta-primary` 等）の変更が Daily・神選択へ波及 | P1／P2 回帰 | Home 限定のセレクタで上書き。既存 acceptance を再実行 |
| 新規プレイヤーが短い説明も読まずに始めて負ける | 第一印象 | シミュレーションでは何も読まない Tapper でも勝率 100%【実測】 |
| 「初陣へ」の漢字が読みにくい | 理解性 | 副文言「おすすめの構成ですぐ戦う」で補う。CEO QA で違和感があれば「はじめての戦いへ」に差し替え（文言のみ） |
| `:has()` 非対応のブラウザ | ヘッダーが現行のバーのまま | 機能は落ちない（表示の劣化のみ） |
| 効果を実ユーザーの数字で確認できない | 判断の確度 | 計測スクリプトの再測定と CEO QA で確認。計測基盤の導入は別判断（§6-3 に該当しうる） |
| 月蝕綺譚の実機確認が未了 | ベンチマークの確度 | 2026-09-19 以降に確認し、差があれば E2 に反映。E1 の設計は依存していない |

---

## 26. Estimated Cost【推測】

| 作業 | 日数 |
|---|---|
| Home の再構成（#1〜#3・#8）＋4 viewport の調整 | 2.0 |
| 状態機械・Hero God・初陣・短い説明（#4〜#7・#9〜#11）＋unit test | 1.0 |
| Entrance acceptance の新設、P1／P2／qa-flow の基準更新 | 1.0 |
| 高画質版 7 枚の再エンコードと性能計測（条件付き） | 0.5 |
| Release Gate 相当の自動 QA・CEO QA 用 preview | 0.5〜1.0 |
| **合計** | **5.0〜5.5 日** |

---

## 27. Next Step

CEO の指示を待って「Entrance E1 Implementation」（feature branch で実装 → 自動 QA → CEO QA 用 preview → CEO QA 待ち。Production への反映はその後の Release Gate）。P3・E2 には着手しない。

---

### 付録 A — 再現方法

```
# 初陣の神のシミュレーション（分析専用。npm test には含まれない）
SEEDS=300 OUT_DIR=<出力先> npx vitest run --config scripts/entrance-e1/vitest.audit.config.ts

# 回線制限時の LCP／CLS baseline（scratchpad の lcp-baseline.mjs）
node lcp-baseline.mjs <out.json> https://seven-gods-game.vercel.app
```

### 付録 B — 本書で参照した主要ファイル

`src/App.tsx`／`src/components/GameFlow.tsx`／`src/components/setup/HomeScreen.tsx`／`HomeTodayPanel.tsx`／`GodSelectScreen.tsx`／`EnemySelectScreen.tsx`／`DeckBuilderScreen.tsx`／`DailyChallengeScreen.tsx`／`src/components/TutorialOverlay.tsx`／`src/components/battle/nextGoal.ts`／`bgm.ts`／`src/hooks/deckPreferenceStorage.ts`／`dailyStorage.ts`／`matchupStorage.ts`／`recordStorage.ts`／`tutorialStorage.ts`／`src/core/data/enemies.ts`／`gods.ts`／`scripts/phase7-p1/*`／`scripts/phase7-p2/acceptance.mjs`／`scripts/hardening-invalid-enemy-id/acceptance.mjs`／`scripts/release-audit/*`／`scripts/phase3-audit/harness.ts`・`step2/harness2.ts`

---

### 付録 C — 実装（決定193）と本仕様の差分

E1 の実装は branch `feat/entrance-e1` で行った。本仕様に対して**意図的に変えた点**と、仕様に書いていなかったが必要になった点は次のとおり（いずれも AI判断。実測の根拠つき）。

| # | 仕様 | 実装 | 理由 |
|---|---|---|---|
| 1 | §14-3：Home 用の高画質版を 7 柱ぶん用意（条件付き） | **5 柱だけ**（大耀・蒼毘・才華・寿楽・福永）を再エンコード。恵比寿は既存の `keyvisual-hero.webp`、笑蓮は既存の軽量版のまま | CEO 指示「全 7 枚を機械的に作り直さない／神ごとにスクリーンショットで確認してから」。PC 1508×660・DPR2 で 1 画像ピクセルが 2 倍以上に伸びる 5 柱だけ線の甘さが目視で確認できた（恵比寿 1.44 倍・笑蓮 1.74 倍は許容）。容量は 304〜438KB（quality 78〜82）で、いずれも現行の恵比寿 511KB 以下 |
| 2 | （記載なし） | **今日の敵の絵は Hero 画像の読み込み後に読み込む**（`showEnemyArt`） | 同時に取りに行くと回線の細い端末で帯域を取り合い、LCP が 5.4 → 6.8 秒に悪化した（実測）。遅延読み込みで 5.88 秒（上限 6.7 秒）に戻した。箱は先に確保するので CLS は 0 のまま |
| 3 | （記載なし） | **絵の上の文字の読みやすさ**：型バッジの地を暗くし、SP のロゴの後ろにだけ柔らかい暗がりを敷く | 初版はバッジ 1.7〜2.1、SP のジャンル名 1.3 とコントラスト比 4.5 を下回っていた（実測）。修正後は最悪でも 5.84 |
| 4 | §23：`scripts/phase7-p1/summarize.mjs` などの基準更新 | 加えて **`src/hooks/dailyFairness.test.ts` の既存ガードを更新**（通常モードの `engine.startGame` は 2 か所 → 3 か所。いずれも `loadRewardBonuses` を渡すという意味は維持） | 初陣が 3 つ目の通常モード開始経路になったため。ガードの意味は弱めていない |
| 5 | §23 #2 | `formatTodayLabel` は `HomeTodayPanel.tsx` の中に置き、export しない | 部品ファイルから関数を export すると lint（react/only-export-components）の警告が増えるため |
| 6 | §15 | P1 acceptance の「初回モーダルを必須とする箇所」は**変更不要だった** | 該当箇所は「あれば押す」作りで、判定には使われていなかった（実測でも AC12 以外は無変更で PASS） |
| 7 | §24 AC14 | 目標 LCP ≤ 4.8 秒は**未達**（新規 5.88 秒）。上限 6.7 秒は満たす | 新規プレイヤーの Hero は恵比寿の既存 511KB のままで、画像の大きさが LCP を決めるため。恵比寿の再エンコードは「既存ファイルを変えない」方針と、CEO 指示の「必要な神だけ」に従い見送った。E2 で BGM の遅延取得とあわせて再検討する |

実測値（最終ビルド `index-CK975gJt.js`）は決定193 に記録した。
