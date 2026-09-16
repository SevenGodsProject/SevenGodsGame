# Phase 7 — Return Loop Commercial Direction Audit（AUDIT / DESIGN ONLY）

- 実施日：2026-09-16
- 対象：master `ffd8450`（Production LIVE・決定185）。src／asset／Production／Ranking／DB は一切変更していない
- 成果物：本書＋監査スクリプト `scripts/phase7-audit/{returnLoop,progression,masteryRaw}.audit.ts`（`npm test` には含まれない専用 config）
- 立場：Lead Game Designer / Product Designer / Economy Designer / UX Researcher / Technical Auditor による**独立監査**。ChatGPT案を前提にせず、コードベースを一次資料として検証した
- 一次資料：`src/components/**`・`src/hooks/**`・`src/core/**`（file:line を各所に併記）、`docs/PHASE6_COMMERCIAL_BENCHMARK_V2.md`、`docs/GAME_REPLAYABILITY_AUDIT.md`、`docs/DECISIONS.md`（決定43・121・126・153・162〜172）
- 数値表記：エンジン内部値（UI は damage/HP/block/heal/score を ×10 表示。`src/components/displayScale.ts:18`）

---

## 1. Executive Summary

**Decision：B. GO WITH MODIFICATIONS（Confidence: High）**

Return Loop（1戦終わるたびに次を遊びたくなる）を次の主題にすること自体は正しい。ベンチマーク v2 の最下位クラスターは Reward 45／Return Loop 48／Progression 50／Deck Building 52／Replay 60 であり、6-C/6-D で Decision Feedback・Victory・God Strike は既に持ち上げた。残る谷は「戦闘の外側」に集中している。

ただし ChatGPT 案の優先順位（2位「成長・報酬・収集」、3位「Daily＋Ranking」）を字義どおり実行すると、**存在しない問題を新システムで解こうとする**。監査で分かった事実は逆で、

1. **Return Loop に必要な表示要素の大半は既に実装済みだが、置き場所が悪い。** 結果画面には「自己ベストまであとN点」「今日のベストまであとN点」「次は神階Ⅳ本殿」「神技評価 →B（堂々）は40%」が既にある（`GameOverOverlay.tsx:215,248,324-339`, `masteryDisplay.ts:141`）。OTOMO 画面には「🔓 次の解放：…（あとNpt）」がある（`OtomoGrowthScreen.tsx:138`）。**しかし HOME は何も読まない**（`HomeScreen.tsx` は storage を一切 import せず、「今日の神域挑戦 ★★★★★」の★は固定 JSX。`HomeScreen.tsx:90`）。結果画面の出口は「同じ構成でもう一度／神・デッキを選び直す」の2つだけで、ホーム・Daily・デッキ編集への導線が無い（`GameOverOverlay.tsx:350-367`）。
2. **「戻る理由」を支える3つの支払い装置が構造的に弱い**（シミュレーション §15）：
   - 自己ベストは滅多に更新されない。同じ神×敵を24戦続けたとき更新率 **10〜12%**（8〜10戦に1回、最長無更新 14〜16戦）。スコア分布は sd 44〜53（平均の約5%）と極端に狭く、勝利300＋撃破R テンポ（290/290/290/240/170/90/0）が支配するため、上手くなっても伸び代は New 859 → Optimizer 960（+12%）しかない。
   - OTOMO は育たない。神の一撃が **0回の試合が 30〜57%**、童子到達は **0〜4%**。絆Lv は「試合終了時の形態」で 0/1/2 pt しか入らず 3pt で 1Lv、絆★3 は「Lv5 かつ童子到達1回」を要求する（`otomoGrowthDisplay.ts:79-84`）。New Player の童子到達 0% ⇒ ★3 は事実上到達不能。守りの絆／力の絆の選択は勝率 100%／100%、平均スコア 961／962 で**差が無い**。
   - 3択報酬は効かない。最強火力札を +1／+2 枚積んでも平均スコア 959→961→963、撃破R 4.13→3.84。ルール上は本物の強化だが、体感にも数字にも出ない（決定153 で D 案「勝利報酬を手に入るものにする」が 54点で後回しにされた理由と一致）。
3. **ふつう難易度は有能なプレイヤーにとって緊張が無い。** 先読み無しの単純戦略 AI ですら勝率 **100%**、終了HP 平均 22.6/30。むずかしいでも 99.3%。負けから学ぶループは人間の読み違いでしか発生しない。よって Return Loop を「生存のスリル」に頼って設計してはいけない。**戻る理由は「解く・極める・集める」側に置く**必要がある。

したがって修正版の方向性は：**新しい経済（EXP・通貨・ミッション）を作らず、①既存データを HOME と結果画面に「次の一歩」として再配置し（表示のみ・src/core diff 0）、②7神×7敵＝49マスの到達盤という SEVEN GODS 固有の収集目標を既存 records の拡張で作り、③OTOMO と神技評価の「支払い装置」を最小のルール調整で機能させ、④Daily を「同じ盤面を3回で解く」競技として HOME の主役に置き、⑤Ranking は Daily の常連が生まれてから段階公開する。**

69→80 の第一目標は、Phase 1〜3（表示再配置＋49マス＋OTOMO/Mastery の支払い修正）で Return Loop 48→70・Progression 50→70・Reward 45→60・Replay 60→72 程度を狙える（推定・§16）。新通貨・battle pass・gacha・PvP・stamina・login bonus・season は**現段階で不要**（§19）。

---

## 2. Current Feature Inventory（Audit 1）

分類：IMPLEMENTED（そのまま使える）／PARTIAL（あるが役割を果たしていない）／DORMANT（コードはあるが動いていない）／MISSING。

| 機能 | 分類 | どこで表示 | 何を保存 | プレイヤーに伝えていること | Return Loop 再利用 |
|---|---|---|---|---|---|
| Home | **PARTIAL** | `HomeScreen.tsx` | 何も読まない（`savedBattle` prop のみ） | 神を選ぶ／続きから／今日の神域挑戦（★固定）／遊び方／OTOMO／戦績 | **最重要の再配置先**。Daily の敵・残回数・今日のベスト、神階、OTOMO 次解放、49マス進捗をここへ |
| Battle | IMPLEMENTED | `BattleScreen.tsx` | `sevengods.battleSave`(v9) | ラウンド/神力/スコア、予告と tier、共鳴「あとNで神技発動」、託宣残回数、⚡光る手札、6-C callout、mini result | 既に「戦闘中の次の一歩」は十分。触らない |
| Result（GameOverOverlay） | **PARTIAL** | `GameOverOverlay.tsx` | — | 勝敗、振り返り≤3行、敗因、Daily ベスト差、OTOMO Lv UP、スコア内訳、自己ベスト差、神技評価＋次ランク、神階解放/次段/ベスト差、挑戦状コピー | 表示の材料は揃っている。**出口が2つしかない**（もう一度／選び直す）。Hub 化は表示のみで可能 |
| Reward 3-choice | **PARTIAL** | `RewardOverlay.tsx` | `sevengods.rewardBonuses` | 「次回以降このデッキで編成上限が1枚増えます」 | 権利が抽象的・効果が出ない（§7）。候補構造と「入手感」を修正 |
| God progression（神階） | IMPLEMENTED | `StakeSelector.tsx`, Result, Records | `sevengods.stakes`（hardCleared/maxCleared/bestByStake） | 🔒条件、Ⅰ〜Ⅶ の追加ルール、×倍率、段ごとの自己ベスト | 長期目標として機能する数少ない資産。**HOME に出ていない**。解放条件「むずかしいを1回撃破」が New から見えない |
| Mastery（神技評価） | **PARTIAL** | God select hint, Result（勝利時のみ） | **保存しない** | S/A/B/C、指標、次ランクまでの % | 4/7 神のみ・履歴なし。大耀は上級者でも 39% が C（§15） |
| OTOMO progression | **PARTIAL** | `OtomoGrowthScreen.tsx`, Result Lv UP | `sevengods.otomoBond`（battlesPlayed/resonanceCount/dojiReached） | Lv、★絆、次の解放、形態の記録、七柱との絆 n/7 | 「次の解放：あとNpt」は最良の進捗表示だが OTOMO 画面にしか無い。ペースが遅すぎる（§9） |
| OTOMO evolution（戦闘内） | IMPLEMENTED | `GodOtomoPanel.tsx` | `GameState.otomo.form` | 精霊態→受肉態→童子、神の一撃ごとに1段階、成長経路プレビュー | 神の一撃が1試合に0〜1回なので童子まで届かない（§9） |
| Records | IMPLEMENTED | `RecordScreen.tsx`, God select | `sevengods.records`(v1) | 神ごと：自己ベスト（難易度）、勝/敗/未撃破、最速撃破R、神階ベスト；Daily 直近7日 | **神×敵の記録が無い**。49マス化の土台 |
| Score | IMPLEMENTED | Result 内訳 | — | 実効ダメージ/連携/撃破/早期撃破/生存/難易度、×1.3、×神階 | 分散が小さく「ベスト更新」の頻度が低い（§15） |
| Daily | IMPLEMENTED | `DailyChallengeScreen.tsx`, Records | `sevengods.daily`(v1) | 今日の敵・SEED ID・残り3回・今日のベスト・神別ベスト・ルール・JST 0:00 | 「同じ盤面を3回で解く」という本質が**説明されていない**。HOME に出ない。報酬なし |
| Daily tries / Seed | IMPLEMENTED | 同上 | attemptsUsed（開始時消費） | 残り N/3、`daily-YYYY-MM-DD-enemyId` | 決定論の価値（§15 Q3）を伝える材料 |
| Tutorial | **PARTIAL** | `TutorialOverlay.tsx` | `sevengods.tutorialSeen` | 6ステップ＋コツ4行（説明書型、初回自動＋再表示可） | 戦闘中の状況コーチは**存在しない**。神階・Daily・報酬・神技の説明も無い |
| Deck builder / Recommended deck | IMPLEMENTED | `DeckBuilderScreen.tsx` | `sevengods.deckPreference`（**1枠のみ**、最後の神だけ） | 20枚、上限2（報酬で+N）、成長経路、共鳴発動効果 | 結果→デッキ改善の材料が渡っていない（§13） |
| Difficulty | IMPLEMENTED | God select step② | — | かんたん/ふつう/むずかしい | むずかしいでも AI 勝率 99.3%。緊張の源にならない |
| Stake（Ⅶの試練） | IMPLEMENTED | StakeSelector | stakeChoice | 巨躯/猛威/静寂 | — |
| Save / Resume | IMPLEMENTED | Home「続きから」 | battleSave v9（v3〜v8 移行あり） | 神・ラウンド | Home Today パネルの1要素 |
| Divination（託宣） | IMPLEMENTED | `DivinationPanel.tsx` | — | 残り回数、加護の盾プレビュー | 触らない |
| Resonance（共鳴/神の一撃） | IMPLEMENTED | `GodOtomoPanel.tsx` | — | ゲージ、あとN、発動効果 | OTOMO 支払いの鍵（§9） |
| God identity（得意技/⚡） | IMPLEMENTED | God select, battle badge | 保存なし（解放なし） | 得意技バッジ、発動中 | 初戦から全開放。進行要素ではない |
| Battle recap | IMPLEMENTED | Result | — | 勝利事実≤3行／敗因 G1-G4 1行／未撃破「あとN」 | 「今回の達成」は**既に実装済み**（提案 D は新機能ではない） |
| Ranking | **DORMANT** | — | `sevengods.pendingRuns`（消費者なし）、`dailyRunLog` | 「ランキングやオンライン通信はありません」 | 送信 payload は完成済み（ReplayInput/runReplay/clientRunId）。API・identity・ticket・UI は無い |
| QuotaProvider | DORMANT | — | `sevengods.quota`（呼び出し元なし） | — | 使わない |
| XP / Level / 通貨 / 実績 / ミッション / streak / 神×敵記録 / 敵図鑑 / Home の次目標 | **MISSING** | — | — | — | 通貨・XP・ミッションは**作らない**（§7,§19）。神×敵記録と Home 次目標は作る |

「新機能だと思っていたが既に存在する」もの：**(D) 今回の達成表示**（battleRecap）、**(B) あとN表示**（自己ベスト/今日のベスト/神階ベスト/Mastery次ランク/OTOMO次解放）、**(C) 次の解放表示**（神階「次は神階Ⅳ本殿」、OTOMO「🔓次の解放」）、**(G) 自己ベスト更新演出**（「✨ 自己ベスト更新！」テキスト）、**(I) Daily 3回**（残り N/3 とベスト差）。欠けているのは**配置と導線**であって機能ではない。

---

## 3. Current Player Journey（Audit 2）

画面遷移の一次資料：`GameFlow.tsx:25-27`（通常：home→godSelect→enemySelect→deckBuild→battle／Daily：home→daily→godSelect→deckBuild→battle）。

| Journey | ENTRY | ACTION | FEEDBACK | REWARD | NEXT ACTION | 監査 |
|---|---|---|---|---|---|---|
| 初回プレイ | 起動→説明書型チュートリアル（6ステップ 3,300字）→Home | 神を選ぶ（7神＋4バー＋得意技＋神技ヒント）→難易度→敵（脅威度★）→デッキ（20枚・78ボタン）→戦闘 | 予告 tier／⚡光る／6-C callout／mini result | 勝てば3択報酬（上限+1 の権利） | 「同じ構成でもう一度」「神・デッキを選び直す」 | 次に何をすべきか：**不明**。得たもの：「上限+1」は理解できない。成長実感：OTOMO Lv UP は 1〜2 試合に1回 1pt。もう一度遊ぶ理由：スコアを見ても比較対象が無い |
| 通常攻略（2戦目〜） | Home「神を選ぶ」（続きが無ければ） | 同上（デッキは最後の神のみ復元） | 同上 | 自己ベスト更新（10〜12%）／あとN点 | 同上 | 「あとN点」は出るが**どうすれば縮まるか**（撃破Rを1早める＝約70pt）が伝わらない |
| 勝利 | 撃破→結果 | 振り返り≤3行→スコア→神技評価→報酬→結果 | 神域制覇／自己ベスト差／神階次段／OTOMO Lv UP | 報酬3択 | もう一度／選び直す | **ホームへ戻れない**（選び直す→GodSelect→ホームへ戻る の2段）。Daily・デッキ編集への直行が無い |
| 敗北 | 結果 | 敗因 G1〜G4 1行＋固定助言 | 「あと一歩だった！」（敵HP≤10%） | なし | 同上 | 学びは6-C で改善済み。ただし G1〜G4 以外の敗北は無言（PHASE6C §7） |
| Daily | Home「今日の神域挑戦」（★固定） | 今日の敵・SEED・残回数・神別ベスト→神→デッキ→戦闘 | Daily タグ、結果に「今日のベスト更新／あとN点」「残り N 回」 | なし（報酬・神階・記録に反映されない） | 「もう一度挑戦（残りN回）」 | **Home に今日の敵も残回数も出ない**ため翌日戻る理由がホームに無い。「同じ盤面を3回」という競技の本質が未説明 |
| 再戦 | 結果「同じ構成でもう一度」 | 同 seed ではなく新 seed（`seed-${Date.now()}`、`useGameEngine.ts:294`） | — | — | — | 通常戦の再戦は「同じ構成・別の運」。Daily だけが同一盤面 |
| Deck 変更 | 「神・デッキを選び直す」→GodSelect→…→DeckBuilder | 20枚編成（前回の使用状況は表示されない） | validate エラーのみ | — | — | **結果画面からデッキ画面へ直接行けない**。何を変えるべきかの材料が無い |
| OTOMO 変更 | デッキ画面の成長経路ラジオ | 守り/力 | 「童子まで育つと：…」 | — | — | 実効差ゼロ（§15 Q6）。選ぶ理由が無い |
| 神変更 | GodSelect | 自己ベスト（勝数）が神カードに出る | — | — | — | 神ごとの進捗（神階最高到達・Mastery履歴）は出ない |
| 育成確認 | Home「OTOMOとの絆を見る」 | Lv/★/次の解放/形態の記録/七柱との絆 | — | — | 「ホームへ戻る」 | ここだけ「次の一歩」が明快。**Home から見えない** |

---

## 4. Drop-off Map（Audit 3）

Severity：S1（致命）〜S3（軽微）。Frequency：毎戦／数戦に1回／稀。Fix cost：Display（表示のみ・core diff 0）／Storage（storage 追加・saveVersion 影響なし）／Rules（`rules.ts`・gameVersion bump）。

| # | 離脱ポイント（コード実態） | Severity | Player impact | Frequency | Fix cost | 既存再利用 |
|---|---|---|---|---|---|---|
| D1 | 勝った直後に「次に何をするか」が結果画面に無い（出口2つ、Home/Daily/Deck へ直行不可 `GameOverOverlay.tsx:350-367`） | **S1** | 毎回の「終了→離脱」分岐で離脱を後押し | 毎戦 | Display | 既存の あとN／次段／次解放 の文言をそのまま並べ替え |
| D2 | Home がデータを読まない（Daily の敵・残回数・今日のベスト・続き・神階・OTOMO 次解放が出ない。`HomeScreen.tsx` 全体） | **S1** | 翌日「開く理由」がホームに無い（Benchmark v2 Return Loop 48 の主因） | 起動毎 | Display | `dailyBossFor`/`dailyAttemptsLeft`/`bestResultOf`/`loadGodStakeRecord`/`computeNextUnlockText` は全て既存 |
| D3 | 自己ベストが滅多に更新されない（更新率 10〜12%、sd≈5%） | **S1** | 「もう一度」の主動機が空振り。上達しても数字が動かない | 毎戦 | Storage（神×敵ベスト）＋将来 Rules | records に敵キーを追加すれば更新機会が7倍に分散し、「未踏の敵」が目標になる |
| D4 | 神技評価が C に張り付く（New：大耀 74%・蒼毘 46%／Optimizer でも大耀 39%）、しかも保存されないので上達が残らない | S2 | 「修行中」が固定ラベル化。次ランク % は出るが行動に翻訳されない | 4神で毎戦 | Rules（閾値）＋Storage（履歴） | `MASTERY_COPY`/`describeMastery` 既存。閾値は `rules.ts:143` |
| D5 | OTOMO が育たない（神の一撃0回が30〜57%、童子0〜4%、絆★3は童子必須、1試合 ≤2pt/3pt per Lv） | S2 | 「絆を深めよう」と言われるが 20〜30 戦しても★3 に届かない | 毎戦 | Storage（pt 計算式は display 側 `otomoBondStorage.ts:77-81`、engine 非依存） | pt を「試合終了時の形態」から「神の一撃回数（RESONANCE_BURST）」等へ変更可能。engine 不変 |
| D6 | 守りの絆／力の絆に実効差が無い（勝率・スコア同一） | S3 | 選択が儀式化 | デッキ毎 | Rules | 童子到達率が上がるまで差は出ない（D5 が先） |
| D7 | 3択報酬が「上限+1の権利」で入手感ゼロ、効果も測定不能（+0.4%） | S2 | 勝利の頂点で「得たものが分からない」 | 勝利毎 | Display（候補構造・入手演出）／Rules（自動投入は後回し） | `pickRewardCandidates`（`rewardPicker.ts`）は components 側。type 別1枚ずつの候補にする変更は core 非依存 |
| D8 | Daily の本質（同一 seed＝同じ盤面を3回で解く）が説明されない。同じ腕前で3回打つと**同一スコア**（§15 Q3） | S2 | 3回目に何を変えるべきかが分からず「運ゲー」と誤認 | Daily 毎 | Display | 結果画面の Daily ブロックに「同じ盤面・前回との差・変えた手」を出す |
| D9 | 神階の解放条件「むずかしいを1回撃破」が New から見えない（GodSelect step② の 🔒 文言のみ `StakeSelector.tsx:45`） | S2 | 最良の長期目標が発見されない | 起動毎 | Display | Home に「神階：🔒 むずかしい撃破で解放／最高到達Ⅲ」 |
| D10 | 結果→デッキへの導線と材料が無い（使用回数・⚡成立・未使用札が結果に出ない） | S2 | デッキ変更の仮説が持てない（Deck Building 52） | 毎戦 | Display（`cardsPlayed`/`cardsSeen` は events から集計可） | 6-C の `decisionFeedback.ts` と同じ「events から派生」方式 |
| D11 | 敗北 G1〜G4 以外は無言（多段ヒット合計・自傷・回復不足） | S3 | 「学びが返らない負け」 | 稀（AI 勝率 100% だが人間は負ける） | Display | PHASE6C §7 の既知残課題 |
| D12 | チュートリアルが説明書型で初戦に仕掛けが無い（吹き出し0・矢印0） | S2 | First 10m 58 | 初回のみ | Display | 6-C callout の仕組みを「初戦だけ」教育文言に流用できる |
| D13 | deckPreference が1枠のみ（神を替えると前のデッキが消える `deckPreferenceStorage.ts:56`） | S3 | 神を回す動機を削ぐ | 神変更毎 | Storage | 神ごと保存へ（version 同一・additive） |

---

## 5. Return Loop Proposal Validation（Audit 4）

| 案 | 判定 | 根拠（コード） |
|---|---|---|
| A. Result を次プレイへの Hub に | **KEEP** | 材料は全部ある（§2）。出口2つ→「もう一度／デッキを調整／今日の神域挑戦／ホーム」の4出口＋「次の目標1行」。core diff 0 |
| B. 「あと○EXPで○○」表示 | **MODIFY** | EXP は存在せず、作らない。既存の4種の「あとN」（自己ベスト・今日のベスト・神階ベスト・OTOMO pt）と Mastery 次ランク % を**1つだけ選んで**出す（優先規則は §16 P1） |
| C. 次の解放内容を事前表示 | **MODIFY** | 神階は「次は神階Ⅳ本殿：ブロック効率75%（加護除く）」が `describeStakeRules` で生成可能。OTOMO は `computeNextUnlockText` 既存。新しい解放物は作らない |
| D. 今回の戦闘で何を達成したか | **KEEP（実装済み）** | `battleRecap.ts:160-197`。追加は「49マスのどこを埋めたか」1行のみ |
| E. 次のおすすめ目標を1つ提示 | **KEEP** | ルールベースで1つ（未踏の敵 → 神階次段 → 神技次ランク → OTOMO 次解放 → Daily 残回数）。AI 推薦は不要 |
| F. Replay / Daily / Deck Adjust への CTA | **KEEP** | A と同一実装 |
| G. 自己ベスト更新演出 | **MODIFY** | 更新は 8〜10 戦に1回しか起きない（§15 Q2）。演出を豪華にしても頻度が低い。**神×敵ベスト**（更新機会が分散）と「未踏の敵を初撃破」を同格の祝いにする |
| H. Daily を Home の主要コンテンツ化 | **KEEP** | Benchmark v2「Daily 1本がホームに出ない」。`dailyBossFor(todayDailyKey())` を Home で呼ぶだけ |
| I. Daily 3回を「今日の挑戦」として明確化 | **KEEP（表現を変更）** | 「同じ敵・同じ運（Seed）」は既出（`DailyChallengeScreen.tsx:54-57`）。**「3回とも同じ盤面。上手さだけが点差になる」**と言い切る。Q3：同じ腕前は同点、腕前差で +50〜200 |
| J. Ranking で順位より自己ベスト差 | **DEFER（前半）／KEEP（後半）** | 自己ベスト差は既に結果画面にある。順位・percentile は Ranking 公開時（§11）。今は不要 |
| K. Tutorial を状況コーチ型へ | **MODIFY** | 説明書は残す（再表示用）。初戦〜3戦目だけ 6-C callout の枠で3種の「状況ヒント」を出す（§12）。全面置換はしない |
| L. Result から Deck 改善へ接続 | **KEEP** | 「今回使った／引いたが使えなかった／⚡未成立」の3行と「デッキを調整」CTA。高度な Advisor は作らない |
| M. OTOMO を敵・Deck で選び分けたくなる設計へ | **DEFER** | 前提条件（童子到達率）が 0〜4% では何を変えても選び分けは生まれない。まず D5 を直す。役割分類（Attack/Defense/…）は §9 で最小案のみ提示 |

---

## 6. Progression Risk（Audit 5）

| リスク | 現状の事実 | 判定 |
|---|---|---|
| Power Creep | 恒久バフは存在しない。報酬は「上限+1」で実測 +0.4% | 低。**新規の恒久 Power は作らない**（Mastery・絆・49マスは表示／記録のみ） |
| Grinding | 絆 Lv は 3pt/Lv・1試合 ≤2pt。★3 は童子必須 | 現状は「grind しても届かない」逆問題。ペース修正は必要だが上限を設ける（Lv 7 程度で称号完成） |
| Snowball | 神階×倍率は勝率をほぼ落とさず（Ⅵ で 97.8%）スコア +40% | 神階は既に「実力＝倍率」の設計。records の自己ベストは神階込み（`recordStorage.ts:131`）なので**段ごとのベスト**と混在しないよう表示で区別（既にある `bestByStake` を使う） |
| Daily 公平性 | Daily は報酬ボーナス無効・神階無効・修飾固定（`dailyFairness.test.ts` が源泉レベルで固定） | **維持**。新しい進行要素は全て「表示／記録」に留め、Daily の GameState に何も持ち込まない |
| Ranking Pay/Play-Time Advantage | 課金なし。Play-Time の優位は「上達」のみ（Q3：同 seed で腕前差 +5〜20%） | 健全。Normalized Daily は不要（既に normalized） |
| 初心者と古参の格差 | 神階解放は「むずかしい1勝」、New AI でも hard 99.3% | 格差は小さい。**見えない**ことが問題 |
| セーブ互換性 | saveVersion 9。records/daily/bond/stakes/reward は各 version 1 で additive normalize 方式 | 神×敵記録は records v1 に additive（version 据え置き＋normalize）で追加可。gameVersion に影響しない |
| 既存バランス崩壊 | Mastery 閾値は `RULES.mastery`（fingerprint 対象）→ 変更は gameVersion bump | Phase 3b でまとめて1回だけ bump（JST 0:00 deploy 制約） |
| 7神格差 | Mastery は 4/7 神のみ。恵比寿/才華/笑蓮は評価軸が無い | 3神に評価軸を追加する（§8）。Battle Score には足さない原則を維持 |
| OTOMO 格差 | 7体の童子効果は数値上は同格帯（heal5+block8 〜 dmg5+atk+2）だが到達しない | 到達率を上げる方が先。格差議論は到達後 |

**通常攻略の育成 × Daily 競技公平性の両立**：現行設計が既に正しい（Daily＝固定神階なし・報酬なし・修飾固定）。新たに必要なのは「育成の成果は**通常戦の記録と称号**として残り、Daily には**持ち込まない**」を Home/Result の文言で明示することだけ。比較した代替：Normalized Daily（既にそう）、固定神階（既に0固定）、固定 OTOMO Lv（絆は engine 非依存で既に無影響）、競技用補正（不要）、育成効果無効（既に無効）→ **追加仕様なし**。

---

## 7. Reward Economy（Audit 6）

| 候補 | 判定 | 理由 |
|---|---|---|
| God EXP | **不要** | 神階（Ⅰ〜Ⅶ）と神技評価が既に神ごとの「使い込み」軸。EXP を足すと Battle Score・Mastery・神階の3軸に4軸目が乗り、説明不能になる |
| OTOMO EXP | **不要（既存の絆 pt を修正）** | `resonanceCount` が既に EXP。計算式（終了時形態 0/1/2）を「神の一撃回数＋受肉態到達」に変え、ペースを 8〜12 戦で★2、20 戦前後で★3 にする（display/storage のみ） |
| 共通資源（通貨） | **不要** | 使い道が無い。使い道を作ると gacha/shop に向かう |
| unlock | **既存で足りる** | 神階7段×7神＝49、OTOMO 形態3×7＝21、49マス盤（新規だが記録の可視化） |
| cosmetic reward | **不要（今は）** | 絆称号（4段）と形態の記録が既に cosmetic。追加は Visual Phase 2 以降 |
| achievement | **最小形で採用** | 49マス盤の「初撃破／R3撃破／無傷勝利」の3種を**マスの状態**として表す（実績一覧画面は作らない） |
| mission | **不要** | Daily 3回が既に「今日のミッション」。デイリーミッション一覧は Daily を薄める |

**最小 Economy 提案**：通貨0・EXP0。進行の単位は「記録の充填」（49マス）、「段」（神階）、「絆★」（OTOMO）、「神技 S/A/B/C」（Mastery）の**4つの既存尺度だけ**。3択報酬は残すが、①候補を「攻撃1／守り1／その他1」の型別にして「次の戦略を選ぶ」体裁にし（`rewardPicker.ts` は components 側・seed 決定論維持）、②選んだ札にデッキ画面で「新着 3枚目」タグと自動プリセット（編成上限が増えた札を1枚追加した状態を初期値にする＝表示側）を付ける。自動投入をルール化する案（Benchmark v2 §6 B）は**保留**（Rules 変更・gameVersion）。

---

## 8. God Progression（Audit 7）

- 神階は「節目→能力理解→新しい攻略法」に**構造上は**対応している：Ⅰ で託宣 7→4（託宣の使いどころを学ぶ）、Ⅱ 初期手札−1（AP 配分）、Ⅳ ブロック効率75%（加護の価値）、Ⅴ 回復効率60%、Ⅵ 必殺+20%（予告読み）。各段が1つの技術に対応する設計は良い（`stakes.ts:46-53`）。問題は **New が到達条件を知らない**（D9）ことと、段の名前が Home に出ないこと。
- 神技評価：4神のみ。分布（§15 Q4）から、**大耀「爆発」B 閾値 0.37 は高すぎる**（New median 0.32・B到達 29%、Optimizer でも 60%）。B=0.30 なら New 67%／Casual 89%／Optimizer 90% で「堂々」が普通に取れ、A/S の差別化は残る。蒼毘は Optimizer が S 90% で天井が低い（S 0.85→0.9 検討余地）。寿楽・福永は妥当。
- 未評価の3神への軸案（Battle Score と重複しない・比率型・意図的停滞に報酬を与えない原則 決定160）：恵比寿「大漁」＝神力持ち越し禁止下での**神力使い切り率**（unusedAp 総和 ÷ 総AP、`round.ts:225-234` の `unusedAp` が既に event 化）；才華「手数」＝**ドロー/神力加算で得た追加リソースの実使用率**；笑蓮「無傷」＝**HP≥80% を維持したラウンド割合**（得意技条件と同一で説明可能）。いずれも events から計算でき、`rules.ts` に閾値追加＝gameVersion bump。
- 神技評価の**履歴保存**（神ごと最高グレード＋S/A 回数）を records に additive で追加し、God select カードに「最高 神技評価 A」を出す。これで「この神を使い込みたい」の可視化が完成する。

---

## 9. OTOMO Progression（Audit 8）

**判定：現状は「21枚のキャラ画像」に近い。**

根拠：(1) 童子到達 0〜4%、神の一撃 0 回が 30〜57%、(2) 守り／力で勝率・スコア同一、(3) 絆は display-only（`otomoBondStorage.ts:12-16`）で戦闘に影響しないと画面自身が宣言、(4) 21 の効果表（`otomo.ts`）は「heal/block/draw/gainAp/dmg/atk」の組合せで数値帯も似ている。なお「**doji到達不能／spirit効果dead code／OTOMO再設計／残り6神Mastery**」は STEP-SCORE2 時点（`docs/DECISIONS.md:266`）で既に既知バックログとして記録されており、本監査はそれを数値で裏付けた形になる（未着手のまま Production に至っている）。

最小変更で「敵によって OTOMO を選びたい」を作れるか：**今は作れない**。前提の到達率が低すぎるため、効果の差を大きくしても体験に現れない。順序は：

1. **到達率を上げずに支払いを可視化する**（display/storage）：絆 pt を「神の一撃1回=1pt、受肉態到達=+1、童子=+2」に変更（engine の `RESONANCE_BURST`/`OTOMO_EVOLVED` events を数える）。New でも 43% の試合で 1pt 入る。★2（Lv3=9pt）が 15〜20 戦、★3 は「童子必須」を「受肉態10回 or 童子1回」に緩和。
2. **神の一撃を1試合1回は狙える設計かを確認**（Rules・sim 必須）：現行 7 ゲージ／共鳴札の gain を変えるのは共鳴依存神（蒼毘・笑蓮）のバランスに直結する（決定126 の却下履歴）。Phase 3b で「共鳴札の平均 gain」ではなく **OTOMO 精霊態にも小さな常時効果**（例：受肉態前でも神の一撃時に +1 効果）を検討。ただし本監査では**推奨しない**（コアを触る）。
3. Role 分類：無理に7分類しない。効果表から自然に出る **3 役**（回復/盾＝鯛丸・寿鹿・ハク・笑袋、火力/バフ＝小槌・百勝、資源＝琴音）を**表示上のタグ**として付けるだけで「敵の型（遅咲き＝守り、溜め＝火力）に合わせて選ぶ」導線は作れる。数値は変えない。

---

## 10. Daily（Audit 9）

| 項目 | 現状 | 判定 |
|---|---|---|
| Home visibility | 「今日の神域挑戦 ★★★★★」ボタンのみ（★は固定） | **不足**。敵名・残回数・今日のベストを Home に出す（Display） |
| tries visibility | Daily 画面と結果画面のみ | Home へ |
| best score | Daily 画面・結果・戦績（7日） | 十分。Home に今日分だけ |
| boss visibility | Daily 画面の Boss カード | Home に敵名＋型（遅咲き型 等） |
| reward | なし（設計上：farm 化防止 決定121） | **なしのまま**。代わりに「今日のベスト」「7日分の履歴」「49マスの Daily 撃破バッジ」で報いる |
| reset communication | ルール文中の1文「日付は日本時間の0:00に切り替わります」 | Home に「次の敵まで HH:MM」（`todayDailyKey` から算出。表示のみ） |
| retry motivation | 「もう一度挑戦（残りN回）」 | **本質の説明が無い**。Q3 で示したとおり同じ盤面＝手順の改善がそのまま点差。結果画面に「1回目 8,970 → 2回目 9,690（+720）：R4 撃破が R3 に」と**前回との差分**を出す（`dailyStorage.results[]` に score/round が既にある） |
| fairness | 報酬・神階無効、修飾固定、source-level test | 維持 |

**Daily を中心に置いて通常攻略が死なないか**：死なない。理由は、通常攻略だけが持つものが3つある——3択報酬、神階（×倍率と段の突破）、49マス／絆の充填。Daily は「今日の1枚」、通常戦は「積み上げ」と役割が分かれている。Home では **Daily を上段・通常攻略の「次の目標」を下段**に並べ、どちらも1タップで始められる形にする。Daily の score multiplier は今後も入れない（決定121）。

---

## 11. Ranking（Audit 10）

現状：dormant（`submissionEnabled:false`、API/identity/ticket/UI なし、payload と pendingRuns は完成）。**本監査で有効化は行わない。**

| 層 | 順位 top10 | Personal Best 差 | 前回との差 | percentile | 近傍順位 | 今日の結果 |
|---|---|---|---|---|---|---|
| 初心者 | 価値低（上位は遠い） | **高**（既存） | **高**（Q3 の +50〜200 が見える） | 中 | 中 | 高 |
| 中級者 | 中 | 高 | 高 | **高** | 高 | 高 |
| 上級者 | **高** | 中 | 中 | 高 | 高 | 高 |

費用対効果：**(1) 前回との差・自己ベスト差（既存データ・費用ゼロ）→ (2) percentile（サーバ集計1値）→ (3) 近傍順位 → (4) top10**。順位表だけ先に出すと初心者に価値が無い。

公開時期：**Return Loop Phase では公開しない**。理由：(a) Daily の常連が Home 経由で生まれる前に順位表を出しても「空の表」、(b) Ranking 公開は CEO §6-3（Production API・Neon・identity）で別 Gate、(c) percentile を出すには参加者数が要る。Phase 5 に置く（§16）。

---

## 12. Beginner UX（Audit 11）

現状：説明書型（6ステップ・コツ4行・3,300字）、初回自動、再表示可、戦闘中の状況ヒント無し（`TutorialOverlay.tsx`）。説明過多（画面数6・クリック7 で初戦）かつ説明不足（神階・Daily・報酬・神技・OTOMO 成長経路の説明が無い）。

判定：**状況コーチ型を「初戦〜3戦目限定」で追加**し、説明書は残す。6-C callout（`BattleCallout.tsx`、700ms、pointer-events none）と同じ枠・同じ配置ルールを流用し、教育用は**3.5秒**表示・1ラウンド1回・初戦のみに限定する。具体例3つ：

1. R1 開始時、予告が出た瞬間：「⚔ 予告 50 ＝ この盾（🛡）で受け切れる。まず予告を見る」（`intent.ts` の telegraph 値と `previewIntentGuard` を使用）
2. 神力が余った状態で「ラウンドを終える」に触れたとき：「神力は持ち越せない。あと 1 で『速攻』が出せる」（`unusedAp` と手札の cost から判定）
3. 共鳴が 4 に達した最初のラウンド：「⚡ 光った札は今使うと追加効果」（`cardBonus.ts:58-79` の preview と同一判定）

理解確認は不要（callout は読み飛ばしても進行を止めない）。Battle interruption はゼロ（モーダルにしない）。

---

## 13. Deck Improvement Loop（Audit 12）

現状：Battle→Result→Deck Adjust→Replay のループは**成立していない**。結果画面からデッキ画面へ行けず、デッキ画面には前回の使用実績が無い（`DeckBuilderScreen.tsx` は counts と validate のみ）。

最小提案（Display＋小 Storage、Advisor なし）：
- 結果画面に3行：「使った札 上位3」「引いたが使えなかった札」「⚡が光ったのに使わなかった札」。すべて `GameEvent`（CARD_PLAYED/ドロー）と `cardBonus` preview から集計可能（6-C と同方式・core diff 0）。
- 「デッキを調整」CTA → DeckBuilder に直行（GameFlow に1遷移追加）。
- DeckBuilder の各カードに「直近5戦：使用 3／引き 4／⚡成立 1」の小さな実績（storage：`sevengods.cardStats` 新規・version 1・additive）。
- deckPreference を神ごと保存（D13）。
- 結論を言わない：どの札を抜くかはプレイヤーに委ねる。

---

## 14. Commercial Value vs Cost（Audit 13）

評価 1〜5（5=高）。Cost は人日概算。

| 改善 | Player Value | Retention | Strategic Depth | Cost | Regression Risk | Balance Risk | Save Risk | 判定 |
|---|---|---|---|---|---|---|---|---|
| P1-a Result Hub（4出口＋次の目標1行） | 5 | 5 | 2 | 1.5日 | 低（display） | 無 | 無 | **最優先** |
| P1-b Home Today パネル | 5 | 5 | 1 | 1.5日 | 低 | 無 | 無 | **最優先** |
| P1-c Daily「同じ盤面・前回との差」 | 4 | 4 | 3 | 1日 | 低 | 無 | 無 | 最優先 |
| P2-a 49マス（神×敵 records） | 5 | 5 | 3 | 3日 | 低（additive storage） | 無 | 低（normalize） | 高 |
| P2-b Daily Home hero＋次の敵まで HH:MM | 4 | 4 | 1 | 0.5日 | 低 | 無 | 無 | 高 |
| P2-c 神階の解放条件・次段を Home/God select に | 3 | 4 | 2 | 0.5日 | 低 | 無 | 無 | 高 |
| P3-a OTOMO 絆 pt 計算式（events ベース）＋★3 条件緩和 | 4 | 4 | 2 | 1.5日 | 低（storage/display） | 無 | 低 | 高 |
| P3-b 報酬候補の型別化＋新着タグ＋プリセット | 3 | 3 | 3 | 2日 | 低 | 無 | 無 | 中 |
| P3-c Mastery 7神化＋大耀閾値＋履歴保存 | 4 | 4 | 4 | 4日＋sim | 中（rules・gameVersion） | 中 | 低 | 中（3b にまとめる） |
| P4 Deck loop（結果3行＋cardStats＋神ごと deck 保存） | 4 | 3 | 4 | 3日 | 低 | 無 | 低 | 中 |
| P4 初戦コーチ3種 | 4（新規のみ） | 3 | 2 | 2日 | 低 | 無 | 無 | 中（新規実データで検証） |
| P5 Ranking（差分→percentile→順位） | 3〜5（層依存） | 4 | 2 | 大（API/identity/Neon/CEO Gate） | 高 | 無 | 無 | 後段 |
| OTOMO 戦闘効果の再設計 | 3 | 2 | 4 | 大＋sim | 高（core） | 高 | 中 | DEFER |
| 新通貨／EXP／ミッション／battle pass | 1 | 2（短期） | 0 | 大 | 高 | 高 | 高 | REJECT |

「既存画面再配置・既存データ表示・CTA・進捗可視化」で解決できる項目が上位を占める。巨大システムは不要。

---

## 15. Player-Type Simulation（Evidence）

方法：本番エンジン（`applyAction`）を Phase 3 監査ハーネス（`scripts/phase3-audit/harness*.ts`）経由で回す。New＝先読みなしヒューリスティック、Casual＝探索 AI balanced（budget 150）、Optimizer＝神に合ったプロファイル（budget 400）、Daily Competitor＝Optimizer で同一 seed 反復。7神×7敵×24 seed（1,176 戦/タイプ）、ふつう・神階なし・おすすめデッキ。出力：`scripts/phase7-audit/`（結果は scratchpad に保存。コミット対象外）。

**Q1 勝率・スコア**（SEEDS=24）

| type | games | win | finished | lost | avg score | avg win R | bursts/game | 終了HP(/30) | score p10/p50/p90 |
|---|---|---|---|---|---|---|---|---|---|
| New | 1176 | 100% | 0% | 0% | 859 | 5.15 | 0.43 | 22.6 | 788/866/922 |
| Casual | 1176 | 100% | 0% | 0% | 955 | 4.22 | 0.71 | 27.6 | 893/959/1011 |
| Optimizer | 1176 | 100% | 0% | 0% | 960 | 4.13 | 0.74 | 26.9 | 899/964/1015 |

むずかしい：New 99.3%／Optimizer 100%（R2）。敵別の Optimizer 平均スコアは 947〜972 で**敵による差がほぼ無い**（min–max 798〜1078）。

**Q2 自己ベスト更新頻度**（神×敵ごとに seed 順に 24 連戦）：更新率 New 12.1%／Casual 10.0%／Optimizer 12.2%、更新までの平均 8.2〜10 戦、最長無更新 13.7〜15.7 戦。8戦時点でも 18〜23%。

**Q3 Daily 同一 seed**：同じ腕前で3回＝21/21 ケースで**完全同一スコア**（決定論）。New→Casual→Optimizer の順に打つと +50〜+200（例：恵比寿×試練の影 786→916→969、蒼毘×藍花の怨霊 777→972→972）。

**Q4 神技評価**（勝利時、SEEDS=24）：C 率 New：大耀 74.4%／蒼毘 45.8%／寿楽 27.4%／福永 20.8%。Optimizer：大耀 38.7%／蒼毘 7.1%／寿楽 2.4%／福永 4.2%。raw 分布：大耀 New p50 0.32（B 0.37）、B×0.8=0.30 なら B 到達 New 29%→67%、Casual 61%→89%。蒼毘 Optimizer は S 到達 92%（天井が低い）。

**Q5 神階**（Optimizer）：なし 960（100%）→Ⅱ 1094（100%）→Ⅳ 1216（98.8%）→Ⅵ 1345（97.8%）。**倍率であって難度ではない**。

**Q6 OTOMO 成長経路**：guardian 961／power 962、勝率とも 100%、最終形態平均 0.73／0.72。童子到達 New 0%／Casual 3%／Optimizer 4%。神の一撃 0 回：New 57%／Casual 32%／Optimizer 30%。

**R1 報酬**：おすすめ 959（4.13R）／報酬+1 961（3.95R）／報酬+2 963（3.84R）。

**改善前→改善後の Return Loop 想定（どこで再戦理由が生まれるか）**

| タイプ | 改善前（現行） | 改善後（P1〜P3 想定） | 再戦理由が生まれる場所 |
|---|---|---|---|
| New Player | 勝つ（100%）が「次に何を」が無い。報酬の意味不明。OTOMO は 1pt。ホームに戻ると何も変わっていない | 結果に「未踏の敵 業斧の鬼将 に挑む」1行＋CTA。Home に 49マス 3/49、今日の敵、絆「あと2ptで★2」。初戦コーチ3種 | 結果画面の「次の目標」と Home の未踏マス |
| Casual | 神を回すとデッキが消える。自己ベストは10戦に1回。Daily は運だと思って1回で止める | 神ごと deck 保存。神×敵ベストで「この敵の自己ベスト更新」が7倍の機会。Daily 結果に「前回 +720：R4→R3」 | Daily 2〜3回目、神×敵ベスト |
| Optimizer | 神階を登る（×倍率）以外に伸び代が無い。大耀は上手くても C が4割。OTOMO の選択は無意味 | Mastery 閾値是正＋履歴で「S を全神で」。神階の段名と次段ルールが Home に。49マス「R3 撃破」バッジ | 神階Ⅶ×7神、Mastery S、49マスの上位バッジ |
| Daily Competitor | 同じ盤面と知らず3回打つ。ランキング無し | 「同じ盤面・前回との差・変えた手」で3回を「解く」体験に。percentile（P5） | Daily 3回目、翌日 Home の「次の敵まで HH:MM」 |

---

## 16. Proposed Roadmap（69 → 80）

原則：各 Phase は「表示／記録 → ルール」の順。Rules を触る Phase は1つにまとめ、gameVersion bump と JST 0:00 deploy を1回で済ませる。Daily の GameState には何も持ち込まない。

### Phase 1 — 帰り道を作る（Display-only、src/core diff 0、約4日）
- Goal：勝敗直後と起動直後に「次の一歩」が必ず見える。
- Player-visible：結果画面＝4出口（もう一度／デッキを調整／今日の神域挑戦／ホーム）＋「次の目標」1行（優先規則：Daily 残回数あり→今日のベスト差 ＞ 神階次段が近い ＞ 神技次ランク ＞ OTOMO 次解放 ＞ 自己ベスト差）。Home＝Today パネル（今日の敵・型・残り N/3・今日のベスト・次の敵まで HH:MM／続きから／神階 最高到達と 🔒条件／七柱との絆 n/7 と最も近い次解放／自己ベスト上位1）。Daily 結果に「前回との差＋撃破R の変化」。
- Reused：`dailyBossFor`/`dailyAttemptsLeft`/`bestResultOf`/`loadGodStakeRecord`/`maxSelectableStake`/`describeStakeRules`/`computeNextUnlockText`/`computeSevenBondSummary`/`loadGodRecord`、`GameOverOverlay` 既存文言、`GameFlow` 遷移。
- New：なし（GameFlow に「result→deckBuild」「result→daily」「result→home」の遷移追加のみ）。
- Risk：低。6-B の 100dvh grid と Home の CLS（決定170）を再測定。
- Acceptance（人間 QA 可能）：Before「勝利した」→ After「勝利後 10 秒以内に、次に挑む目標を1つ言える」；Before「Home を開いた」→ After「3 秒以内に今日の敵と残り回数を言える」；全結果画面に別アクティビティへの CTA が ≥2 ある。
- Expected impact：Return Loop 48→62、Replay 60→68、Progression 50→58。

### Phase 2 — 四十九の神域（Storage additive、約4日）
- Goal：「次はどの敵か」が常に決まっている。
- Player-visible：戦績に 7神×7敵の盤（未踏／撃破／R3以内撃破／無傷勝利／Daily 撃破の5状態）、Home に「未踏 N/49」、結果画面に「マスを埋めた」1行、神×敵の自己ベスト更新祝い。God select カードに「撃破 4/7 敵」。
- Reused：`sevengods.records` に `byEnemy: Record<enemyId,{bestBattleScore,wins,fastestWinRound,flawless}>` を additive 追加（version 据え置き・`normalizeRecord` で補完）。`recordGameResult` は既に `state` 全体を受け取る。
- New：盤 UI 1 画面分。
- Risk：低。records 互換テスト（`recordStorage.test.ts`）を拡張。
- Acceptance：Before「勝った」→ After「5 戦後に 5/49 が埋まり、未撃破の敵が名前で分かる」；Before「自己ベスト更新は 10 戦に 1 回」→ After「神×敵ベスト＋初撃破を合わせた『祝われる結果』が 3 戦に 1 回以上（sim で検証）」。
- Expected impact：Progression 50→68、Reward 45→52（達成の入手感）、Return Loop 62→68。

### Phase 3 — 支払い装置の修理
**3a（Display/Storage、約3.5日）**：OTOMO 絆 pt を events ベース（神の一撃=1、受肉態=+1、童子=+2）に変更し★3 条件を「受肉態10回 or 童子1回」へ。報酬候補を型別3枚に、選択後にデッキ画面で「新着 3枚目」タグと自動プリセット。deckPreference を神ごと保存。
**3b（Rules・gameVersion bump 1 回、約4日＋sim）**：Mastery を 7 神に（恵比寿「大漁」神力使い切り率／才華「手数」追加リソース使用率／笑蓮「無傷」HP≥80% ラウンド率）、大耀 B 0.37→0.30、蒼毘 S 0.85→0.90 を balanceSim＋`masteryRaw.audit.ts` で検証。神技評価の履歴（最高グレード・S/A 回数）を records に保存し God select に表示。
- Acceptance：Before「OTOMO は 20 戦で★1 のまま」→ After「New でも 15〜20 戦で★2、Casual は 25 戦以内に★3 を1体」（sim）；Before「大耀で勝っても 7 割 C」→ After「New の B 以上が 60% 超、Optimizer の S が 10% 未満のまま（天井維持）」；報酬選択後 5 秒以内に「3枚目が入った」ことをデッキ画面で確認できる。
- Expected impact：Progression 68→72、Reward 52→60、Character Identity 62→68。

### Phase 4 — デッキ改善ループと初戦コーチ（Display＋小 Storage、約5日）
- 結果3行（使った札／使えなかった札／⚡未成立）＋「デッキを調整」CTA。DeckBuilder に直近5戦の使用・引き・⚡成立（`sevengods.cardStats` v1）。初戦〜3戦目の状況コーチ3種（§12）。
- Acceptance：Before「デッキを変える理由が無い」→ After「結果画面から 1 タップでデッキへ行き、抜く候補を自分で1枚言える」；新規テスター 5 名で「初戦中に予告→盾の関係を理解した」が 4/5。
- Expected impact：Deck Building 52→64、First 10m 58→66、Loss Learning 66→70。

### Phase 5 — Ranking 段階公開（CEO §6-3 Gate、別途）
- 前提：Phase 1〜2 後に Daily の日次参加が観測できていること。順序：前回との差（既存）→ percentile → 近傍 → top10。Neon/API/identity/ticket は Phase 4 成果物と CEO 承認で。
- Acceptance：初心者が Daily 結果で「上位 N%」を見て翌日も開く（7日継続率で検証）。

合計（P1〜P4）：約 20 人日。69→80 の主要な持ち上げは P1〜P3 で達成見込み（推定 22 軸平均 +6〜8）。

---

## 17. Priority Re-ranking（1〜10）

| 順位 | 項目 | 元順位 | Priority | Reason | Expected Value | Cost | Risk | Dependency |
|---|---|---|---|---|---|---|---|---|
| 1 | Result Hub＋Home Today（Return Loop の表示再配置） | 1 | 最高 | 材料が全部あり、最下位軸3つに同時に効く | 高 | 低 | 低 | なし |
| 2 | Daily を Home の主役に＋「同じ盤面を3回」の言語化 | 3（Daily+Ranking） | 高 | Ranking を切り離せば表示のみ。翌日戻る唯一の理由を最短で作る | 高 | 低 | 低 | 1 |
| 3 | 49マス（神×敵記録・収集） | 2（成長・報酬・収集） | 高 | 「収集」は既存データの可視化で足りる。新経済不要 | 高 | 低〜中 | 低 | 1 |
| 4 | OTOMO 支払い修理（絆 pt・★3 条件・役割タグ） | 6 | 高 | 到達率 0〜4% が根本。engine 非依存で直せる | 中〜高 | 低 | 低 | なし |
| 5 | 神技評価 7神化＋閾値是正＋履歴 | 5（神ごとの攻略差） | 中〜高 | 「使い込みたい」の唯一の技術軸。Rules 変更は1回にまとめる | 中〜高 | 中 | 中 | sim |
| 6 | 報酬の型別化・入手感 | 2 の一部 | 中 | 効果は小さいが「勝利の頂点の空虚」を消す | 中 | 低 | 低 | 1 |
| 7 | デッキ改善ループ | 5 | 中 | Deck Building 52 に直効き。Advisor は作らない | 中 | 中 | 低 | 1 |
| 8 | 初戦コーチ3種 | 4（初心者導線） | 中 | 新規実データで検証してから拡大（Benchmark v2 の判断を維持） | 中（新規のみ） | 低 | 低 | 6-C 枠 |
| 9 | Ranking 段階公開 | 3 | 低（今は） | 参加者が生まれてから。CEO Gate | 層依存 | 高 | 高 | 2, CEO |
| 10 | Visual Quality Phase 2／Battle Juice 最終／コンテンツ拡張／PvP・Season | 7〜10 | 低 | Return Loop 完了後。PvP/Season は不要 | 低〜中 | 高 | 高 | 全部 |

順位変更の理由：「Daily＋Ranking」を分離した（Daily は今、Ranking は後）。「成長・報酬・収集」を「49マス（収集）」「OTOMO 修理」「報酬入手感」に分解し、**新経済を伴う部分を落とした**。「初心者導線」は cheap な3種だけ先行し、全面改修は新規データ待ち（元 4 位→8 位）。OTOMO は元 6 位→4 位（根本原因が判明したため）。

---

## 18. Critical Questions

1. **最大の弱点は本当に Return Loop か？**——半分正しい。正確には「戻る理由を支払う装置（自己ベスト・OTOMO・報酬）が構造的に弱く、かつ既に存在する『次の一歩』が Home と結果画面に出ていない」こと。Return Loop UI はその**最も安い露出手段**であり、装置の修理（P3）とセットで初めて効く。
2. **Return Loop 最優先で商用品質は最も効率よく上がるか？**——**表示再配置として**進めるなら Yes（P1〜P2 で最下位3軸に +10〜20）。新経済を作る解釈なら No（Reward/Progression は増えず、Balance/Save リスクだけ増える）。
3. **69→80 に絶対必要なもの**：Result Hub、Home Today、49マス、OTOMO 支払い修理、Mastery 7神化＋閾値是正、Daily の「同じ盤面」言語化。以上6つ。
4. **今作ってはいけないもの**：通貨・EXP・ミッション・login bonus・stamina・battle pass・gacha・PvP・season、AI Deck Advisor、順位表（参加者ゼロで）、OTOMO 戦闘効果の全面再設計（到達率を直す前）。
5. **既存機能の再利用だけでどこまで行けるか**：P1（純再配置）で Return Loop 48→62・Replay 60→68・Progression 50→58 程度（推定）。49マスは storage 1 フィールド追加が要るが「新機能」ではなく記録の粒度変更。
6. **Ranking はいつ公開すべきか**：Phase 5。Daily が Home の主役になり日次参加が観測できた後、まず「前回との差・percentile」から。CEO §6-3 の Production API/Neon Gate を別途通す。
7. **OTOMO Visual は後回しでよいか**：**よい**。OTOMO の問題は絵ではなく「戦闘で何も起きない（童子 0〜4%）」こと。Visual Phase 2 は P3 の後。
8. **最小工数で『もう1戦したい』を最大化する3施策**：(1) 結果画面の4出口＋「次の目標」1行、(2) Home Today パネル（Daily 敵・残回数・次の敵まで・未踏マス・絆次解放）、(3) 神×敵の自己ベストと初撃破の祝い（49マス）。
9. **重大な設計上の穴**：(a) スコア分散が小さく「ベスト更新」に頼る設計は必ず息切れする（テンポ帯 290/290/290/240/170/90/0 が原因。触るなら Rules・sim 必須で本監査では推奨しない）；(b) 通常戦の自己ベストに神階倍率が混入し、段ごとベストと二重管理になっている（表示で区別すること）；(c) ふつう難易度に緊張が無いため「敗北からの学び」ループは人間の読み違いにしか依存しない——Return Loop を「生存」に結びつけない；(d) deckPreference 1枠が神を回す動機を削ぐ（P3a で解消）。
10. **Lead Designer として次の1週間**：P1 を仕様化→実装（display-only）→Playwright で Acceptance を機械測定（結果画面の CTA 数、Home の Today 要素の DOM 存在、10 秒以内表示）→CEO 実機 QA。並行して 49マスの records スキーマ（additive）と互換テストを書き、P3b 用に `masteryRaw.audit.ts` の閾値候補を絞る。

---

## 19. Risks / Things NOT To Build

| 候補 | 現段階 | 理由 |
|---|---|---|
| battle pass | 不要 | 期限付き義務。7R×Daily 3回の設計思想（短く濃く）と矛盾 |
| gacha | 不要 | 通貨が無い。作ると Reward 軸の抽象性が悪化 |
| PvP | 不要 | 決定論 seed と Enemy Intent が強み。対人は別ゲーム |
| multiple currencies | 不要 | §7 |
| daily login bonus | 不要 | Daily 3回が既に「今日来た理由」。ログインだけで報酬を出すと Daily の価値が薄まる |
| energy / stamina | 不要 | 3 tries/day は Daily だけ。通常戦を制限すると 49マス・神階の積み上げが死ぬ |
| season system | 不要 | 週次ボス巡回（7体/週）が既に季節性の最小単位 |
| AI Deck Advisor | 不要 | プレイヤーが考える余地を残す（Audit 12） |
| 順位表を先に公開 | 危険 | 空の表・初心者に無価値・CEO Gate 未通過 |
| OTOMO 戦闘効果の大改修 | 時期尚早 | 到達率 0〜4% のまま効果を変えても体験に出ない |
| スコア式の再設計 | 保留 | 分散問題は認識するが Rules＋sim＋gameVersion の大工事。P1〜P3 の後に判断 |

主要リスク：(1) P1 で Home に情報を増やしすぎて 6-B/決定170 の CLS・44px を壊す→Playwright で再測定を Acceptance に含める；(2) P3b の Rules 変更は gameVersion bump＝JST 0:00 deploy 制約と Daily 途中セーブの扱い（`isExpiredDailySave` は日付のみ）→ deploy 直前に確認；(3) 49マスの「無傷勝利」判定は `blockAbsorbed`/被ダメ events から派生できるが定義を1つに固定する。

---

## 20. Final Recommendation

**B. GO WITH MODIFICATIONS（Confidence: High）**

- 方向性「1戦が面白い→1戦ごとに次を遊びたくなる」は正しく、現行コア（Enemy Intent × 7R × AP × Seed × 神 × OTOMO × Deck × 神託 × 共鳴）は触らない。
- ただし解法は「新しい成長・報酬・収集システム」ではなく、**①既存の『次の一歩』を Home と結果画面へ再配置（P1）、②49マスの到達盤で目標密度を7倍にする（P2）、③OTOMO と神技評価の支払い装置を最小修理（P3）、④Daily を『同じ盤面を3回で解く競技』として Home の主役に（P1/P2）、⑤Ranking は後段（P5）**。
- 通貨・EXP・ミッション・battle pass・gacha・PvP・stamina・login bonus・season は作らない。
- 次の一歩：Phase 1 の実装（display-only・src/core diff 0・saveVersion 不変）と、その Acceptance を Playwright で機械測定する QA を先に用意する。

---

### 付録 A — 監査スクリプトの再現方法

```
SEEDS=24 OUT_DIR=<任意> npx vitest run --config scripts/phase7-audit/vitest.audit.config.ts scripts/phase7-audit/returnLoop.audit.ts --reporter=verbose
SEEDS=12 OUT_DIR=<任意> npx vitest run --config scripts/phase7-audit/vitest.audit.config.ts scripts/phase7-audit/progression.audit.ts --reporter=verbose
SEEDS=24 OUT_DIR=<任意> npx vitest run --config scripts/phase7-audit/vitest.audit.config.ts scripts/phase7-audit/masteryRaw.audit.ts --reporter=verbose
```

`npm test`（既定 config）には含まれない。本番ロジックは一切変更しない（`src/` 差分 0）。

### 付録 B — 本監査で参照した主要ファイル

`src/components/setup/HomeScreen.tsx`、`GodSelectScreen.tsx`、`StakeSelector.tsx`、`EnemySelectScreen.tsx`、`DeckBuilderScreen.tsx`、`DailyChallengeScreen.tsx`、`RecordScreen.tsx`、`OtomoGrowthScreen.tsx`、`otomoGrowthDisplay.ts`；`src/components/battle/GameOverOverlay.tsx`、`RewardOverlay.tsx`、`rewardPicker.ts`、`battleRecap.ts`、`masteryDisplay.ts`、`decisionFeedback.ts`、`BattleCallout.tsx`、`GodOtomoPanel.tsx`；`src/components/TutorialOverlay.tsx`、`GameFlow.tsx`；`src/hooks/{recordStorage,rewardStorage,otomoBondStorage,stakeStorage,dailyStorage,deckPreferenceStorage,battleSaveStorage,tutorialStorage,pendingRunStorage,useGameEngine}.ts`；`src/core/data/{rules,stakes,gods,enemies,otomo,dailyBoss,deckBuilder,divination}.ts`；`src/core/engine/{round,effects,mastery,score,cardBonus,intent}.ts`；`src/core/replay/*`；`docs/PHASE6_COMMERCIAL_BENCHMARK_V2.md`、`docs/PHASE6C_DECISION_FEEDBACK.md`、`docs/GAME_REPLAYABILITY_AUDIT.md`、`docs/DECISIONS.md`（決定43・121・126・153・160・162・166〜172）。
