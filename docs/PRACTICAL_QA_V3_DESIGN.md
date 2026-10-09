> **状態（2026-10-09・Lane 3・AI 設計）：設計のみ。実施は CEO（＋初心者 1〜2 名）。runtime 変更 0・既存 NO-GO（決定263／216／214）は再開しない。preview URL は実施直前に AI が記入する。** 

# Practical QA v3 — v1.0 前の CEO 実践プレイ QA（設計ドラフト）

- 日付：2026-10-09（ドラフト・AI 判断・CLAUDE.md §6-2）／種別：**docs-only**（手順書。runtime・src・public・Production 変更 0・npm／vitest／build／playwright／git 書き込み 0）
- 読んだ一次情報：`docs/FINAL_PRACTICAL_QA_V2.md` §1・§6・§7・§11／`docs/PRACTICAL_QA_2026-09-28_AUDIT.md` §0・§11-1（RC1〜RC5）／`docs/PLAYER_JOURNEY_AUDIT.md` §5・§7・§8（PJ-02）・§11／`docs/MASTER_BACKLOG_AUDIT.md` :90（CF-03）・:132（UX-01）・:150-151（OB-05／06）・:158（RP-02）・:213（RL-05）／`docs/ROADMAP_TO_RELEASE.md` :67（§3 #4）・§7 DoD 項目 16／`docs/SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md` :10-16（North Star）・:23（P2）／`docs/DECISIONS.md` 決定263 CLOSED 行（2026-10-07）・決定255 CLOSED 行（2026-10-02）・決定217 行（2026-09-23）／`SevenGodsGame-voice-pilot/docs/OFFICIAL_VOICE_PILOT_V1.md` §5-1・§6・§8・§9／`docs/A11Y_MINIMUM_PACK_V1.md` §4
- 位置づけ：v2（`FINAL_PRACTICAL_QA_V2.md`・2026-10-03 CLOSED・RC GO）の Q1〜Q10 を**繰り返さない**。v3 は ROADMAP §3 #4 の 4 問（2 戦目の壁／託宣温存・導き／別構成／互換 Smoke）＋ v2 §11 の Beginner QA BQ1〜BQ4 ＋ Voice Pilot §6 Q1〜Q3 ＋ A11y §4 Q1 を **1 セッションに同梱**し（Voice §8「別 Human QA Lane を増やさない」）、DoD 項目 16「2 戦目の壁・託宣温存／導き・別構成の Human QA が 1 回ずつ記録されている」を満たす
- 注記（docs 不整合・本書では直さない）：ROADMAP :67 は Triage を「§1 ルール：A／B 0」と参照するが、ROADMAP §1 に A／B／C の定義は無い。本書 §4 が定義を置く。ROADMAP 側の参照先修正は別 docs-only 作業

---

## 1. 目的と North Star との対応

North Star（PRINCIPLES :12）「敵の意図を読み、神・OTOMO・カードを組み合わせて攻略の答えを見つけ、その答えが鮮やかに決まったときがうれしい」＝Primary Fun **解く**・Support Fun **組む・うまくなる**。v2 は CEO 本人が「解く」を体験できることを確認して RC GO にしたが、(a) 初心者層の External Evidence「やってみたけど少し難しい」（OB-05・原因 UNKNOWN）、(b) 2 戦目導線は「目的地だけ渡され、何を変えるかの判断材料を持たずに 4 画面を通る」（PJ §7 Root Cause）、(c) 託宣温存・導き・別構成の Human evidence 0（CF-03／RP-02）、(d) iPhone Safari 以外の互換 evidence 0（RL-05）が残る。v3 の目的は、**runtime を変えずに**この 4 つを「観察された事実」に変え、v1.0 の Gate（§4）を少人数で判定できる形で閉じること。決定263 が示したとおり「答えを教える」方向の UI は North Star を損なう（CEO Q3 YES → NO-GO）ため、設問も「教えてほしかったか」ではなく「自分で読めたか・選べたか」だけを聞く。

| North Star の段 | v3 で確かめること | 設問 | 元 ID |
|---|---|---|---|
| 読む（敵の意図） | 予告を見て、次の行動の意味を自分の言葉で言えたか | Q3 | BQ2・決定263 軸 |
| 解く（勝ち方が分かる） | 初陣 1 戦で「何をすれば勝てるか」が分かったか | Q1 | BQ1・OB-05 |
| 組む（カード・託宣） | 選ぶ基準が言えたか／託宣を温存・使い分けたか | Q4・Q5 | BQ3・CF-03・PJ-03 |
| うまくなる（再挑戦） | 「もう一度」を自分から押し、何を変えるか言えたか | Q6 | BQ4・Failure Teaches |
| 組む → 変わる（Replayability） | 構成を変えたら勝ち方が変わったか | Q7 | RP-02・決定267 |
| ループの継続（2 戦目） | 初陣後に自力で 2 戦目を始めたか・きっかけは何か | Q2 | UX-01・PJ-02 |
| 商用面（North Star 外・別 Gate） | 公式ボイス Pilot／HP pill 可読性／互換 Smoke | Q8・Q9・D1 | Voice §6・A11y §4・RL-05 |

---

## 2. セッション設計

| 項目 | 内容 |
|---|---|
| 所要 | **25〜35 分**（準備 3／初陣 6〜8／2 戦目 8〜10／3 戦目 6〜8／質問 5）。互換 Smoke D1 は別枠 5 分（端末があれば） |
| 人 | CEO 1 人（必須・Q1〜Q9）＋可能なら初心者 1〜2 名（Q1〜Q6 のみ・事前説明なし・CEO または AI が観察者） |
| 端末 | PC（初陣・2 戦目）＋ iPhone（3 戦目・Q8 の iPhone 項・Q9）。Android または別ブラウザ（Chrome／Firefox）があれば D1 を 1 戦 |
| ビルド | **integ master 最新**（読了時点 HEAD `b04cc42`・A11y Minimum Pack 統合済み）を `vite preview` で配信。**Production（`seven-gods-game.vercel.app`）ではない**。preview URL／LAN URL は AI が §7 で埋める。Voice Pilot（`SevenGodsGame-voice-pilot` `95125e5`）が master 未統合の場合、Q8 だけ Voice Pilot の preview（4173）で実施し、ビルド sha を別記する |
| 初期状態 | **localStorage クリア後**（§7）に開始＝初陣 preset（恵比寿 × 試練の影・おすすめデッキ・`src/components/setup/firstBattle.ts:23-25`）と Tutorial が再び出る状態。初心者は各自のブラウザで初回 |
| 原則 | v2 §1-4 と同じ：**プレイ中はチェック項目を見せない**。設問は 3 戦目の後にまとめて聞く。CEO の発言は言い換えず 1 行ずつ記録（v2 §1-5） |
| やめたくなったら | 止まった時刻・画面・言葉を記録して終了。それ自体を最重要 Finding にする（v2 §1-6） |

**遊ぶ順番（渡す行はこれだけ）**：「①初めて遊ぶつもりで、出てきたまま 1 戦してください。②終わったら、次に何をするか自分で決めて 2 戦目をしてください。③3 戦目は iPhone で、好きに遊んでください。終わったら声をかけてください。」

**観察者の事実ログ（1 行＝1 事実・解釈を書かない）**

| 列 | 記録すること |
|---|---|
| 時刻 | mm:ss（セッション開始からの経過） |
| 画面 | Home／神選択／難易度／敵選択／デッキ／降臨の間／Battle R#／結果 |
| 行動 | 押したもの・出したカード・切った託宣の種類（加護／導き／天啓）と R |
| 考えた秒数 | 手札が出てから最初のカードを出すまでの秒数（R ごと）。**10 秒以上止まった R は★** |
| 止まった画面 | 操作が 15 秒以上無かった画面名と、そのとき画面に出ていたもの |
| 予告 | 予告を見た・読んだ・言及した事実（視線・発言「次は…」など。無ければ「言及なし」） |
| 発言 | そのまま。「？」「え」などの短い声も書く |
| 結果 | 勝敗・R 数・残 HP・結果画面の seed・「もう一度」「別の神」「Home」のどれを押したか |
| 2 戦目導線 | 結果→次の戦闘開始までの秒数・通った画面の順・変えたもの（神／敵／難易度／デッキ） |

---

## 3. 設問（6 領域 × 1〜2 問・合計 9 問。各 YES／NO ＋ 自由記述 1 行。「△（分からない）」は NO 扱い）

| # | 領域 | 設問（聞き方そのまま） | 対象 | 元 | 自由記述の 1 行 |
|---|---|---|---|---|---|
| Q1 | ①初回プレイ | 初陣の 1 戦で「何をすれば勝てるゲームか」が分かりましたか | CEO・初心者 | BQ1・OB-05 | 分かったなら一言で。分からなかったなら「どこで」 |
| Q2 | ②2 戦目への動機 | 初陣の後、誰にも言われずに自分で 2 戦目を始めましたか | CEO・初心者 | UX-01・PJ-02① | きっかけ（結果画面の何／自分の気持ち）と、変えたもの |
| Q3 | ③敵 Intent 理解 | 敵の「次の行動」の表示を見ていて、その意味（何が来て何が困るか）を自分の言葉で言えますか | CEO・初心者 | BQ2・決定263 軸 | 実際に 1 つ言ってもらい、そのまま書く |
| Q4 | ④カード選択 | カードを選ぶとき、自分なりの基準がありましたか | CEO・初心者 | BQ3・PJ-03 | 基準を一言で（「予告に備える」「仕込んでから撃つ」等は誘導しない） |
| Q5 | ④カード選択 | 託宣を「今じゃない」と温存した、または 導き を使った場面がありましたか | CEO・初心者 | CF-03・ROADMAP #4 | どの R に何を切ったか（事実ログと照合） |
| Q6 | ⑤敗北からの再挑戦 | 負けた／危なかった後、自分から「もう一度」を押しましたか。押すなら今度は何を変えますか | CEO・初心者 | BQ4・v2 Q7 系 | 変える内容が言えたか（言えない＝BQ4 NO 相当） |
| Q7 | ⑤敗北からの再挑戦 | 神・デッキ・OTOMO のどれかを変えて、勝ち方（手順・効いたカード）が変わりましたか | CEO | RP-02・決定267 | 何を変えて何が変わったか |
| Q8 | ⑥公式ボイス Pilot（3 項） | (a) 大耀の声で「自分の神が目の前にいる」と感じたか／(b) 11.8 秒は長すぎたか（R1 でカードを読む邪魔になったか）／(c) iPhone で声の間 BGM が下がり、ミュートで声が止まったか | CEO | Voice §6 Q1〜Q3 | (b) が YES（長い）なら §5-1 (a) セッション 1 回／(b) 冒頭のみ のどちらを試すか |
| Q9 | A11y | 戦闘中、HP の数字が緑／赤バーの上で一目で読め、pill が邪魔に見えなかったか（PC と iPhone） | CEO | A11y §4 Q1 | 読みにくかった端末と場面 |

- **入れない設問**：「正解やおすすめを教えてほしかったか」「次の行動を先まで見たかったか」（決定263 Q3 で「教えられている感覚」が NO-GO の根拠になった軸を再開しない）。「難しかったか」も聞かない（OB-05 は原因が UNKNOWN。原因を特定するのは Q1／Q3／Q4／Q6 の NO の組み合わせ）
- Q1 の補助事実「敵の予告を見ていたか」は設問にせず、事実ログ「予告」列で観察者が記録する（初心者が「見ていた」と答えても言葉にできなければ Q3 NO）
- **互換 Smoke D1（設問ではなく端末行）**：Android または別ブラウザで 1 戦。「開始→勝敗→結果まで進んだか／音が出たか／横スクロール・文字切れが無かったか」を YES／NO で記録（RL-05）

---

## 4. Gate（少人数で判定できる）

| 分類 | 定義 | 典型 | v1.0 への扱い |
|---|---|---|---|
| **A** | 即時修正が必要 | 進行不能・白画面・保存消失（「続きから」失敗・戦績／絆／49 攻略が消える）・勝敗が出ない・同 seed で結果が変わる | v1.0 停止。Fast Gate で修正 → 該当戦だけ再実施 |
| **B** | v1.0 前に直す（North Star を損なう） | 「読む→解く→もう一度」のどれかが成立しない NO（下表） | v1.0 停止。**runtime 修正は別 Decision**（Narrow Pilot・Human QA 1 問再実施）。答えを教える UI・数値低下・おすすめ表示は選択肢に入れない（決定262／263・OB-05 禁止） |
| **C** | Known として公開可 | Replayability・託宣の使い分け・互換の軽微差・好み | `RELEASE_STATUS.md` 生存 Known に 1 行追加して v1.0 へ |

**v1.0 条件：A＝0 かつ B＝0**（ROADMAP :67「A／B 0」）。Q8・Q9・D1 は別 Gate（下表）で v1.0 を止めない。

| 設問 | CEO が NO | 初心者 1 人が NO | 初心者 2 人以上が NO | 備考 |
|---|---|---|---|---|
| Q1 勝ち方 | **B** | C＋記録（自由記述から対象を特定：ルール／UI／カード／予告／導入） | **B**（First Battle comprehension を重大課題＝OB-05 判定） | runtime 候補は OB-06 First Battle Guidance v1（正解は教えない）の Decision 化のみ |
| Q2 2 戦目自力 | **B**（UX-01 P1） | C＋記録（止まった画面を事実ログから特定） | **B** | 「2 戦目も preset 直行」「おすすめ神表示」は PJ §7 で却下済み・選ばない |
| Q3 Intent を言葉に | **B**（Primary Fun。v2 Q2 と同格） | C＋記録 | **B** | 決定263 Threat Shape の再開で解かない |
| Q4 選ぶ基準 | **B**（表示・導線の問題として扱う。数値は触らない＝決定255） | C＋記録 | **B**（PJ-03 Tutorial step 2 語彙差し替えを候補に） | 「おすすめカード highlight」は禁止 |
| Q5 託宣温存／導き | **C**（CF-03 は観測が目的。温存が無かった事実を Known に） ※「導きの存在に気づかなかった」が理由なら **B**（可読性） | C | C（理由が「気づかなかった」で揃えば B） | 決定246 で託宣 3 回／戦は確定済み・回数は触らない |
| Q6 もう一度＋何を変えるか | **B**（Failure Teaches） | C＋記録（BQ4 NO＝本人にも改善点が不明なら、原因欄を必ず書く） | **B** | 敗因表示・Recap の改善は別 Decision |
| Q7 別構成で勝ち方が変わった | **C**（RP-02 P2・POST RELEASE 枠） | — | — | CEO のみ。NO は Known「Normal は 1 解で足りる段階設計（決定255）」として記録 |
| Q8 公式ボイス (a)(b)(c) | **別 Gate**：(a) NO → Pilot 撤去（音源は原本のみ）／(b) 長い → §5-1 (a)or(b) を 1 つ選び再 QA 1 回／(c) NO → `duckLevel` 実機調整 | — | — | v1.0 を止めない（Voice §8：Release 条件にしない） |
| Q9 HP pill | **別 Gate**：α0.77 → 0.6〜0.9 で 1 回だけ再調整 → 再 QA 1 問 | — | — | v1.0 を止めない（基準 4.5:1 は α0.6 でも満たす） |
| D1 互換 Smoke | 進行不能・白画面 → **A**／音が出ない・文字切れ・横スクロール → **C**（対象ブラウザを Known に明記） | — | — | 公式対応は iPhone Safari＋PC Chromium（RL-05） |

- 同じ設問で CEO YES・初心者 NO のときは初心者側の規則を使う（CEO は熟練者のため、初心者の NO を上書きしない）
- 1 件ずつ：再現（結果画面の seed）→ 分類 → `docs/evidence/practical-qa-v3/triage.md` に 1 行（v2 §7 と同じ手順）。CEO の「遊ぶのをやめたくなった」は 1 段階上げる（C→B）
- B の修正着手は **新 Decision 番号・Narrow Pilot・Human QA 1 問再実施**を必ず伴う。本 QA 中に仕様を増やさない（v2 §6 の「思いついた新機能は CAN SHIP に記録して先へ」を踏襲）

---

## 5. 記録テンプレ（コピペ用）

```
# Practical QA v3 — evidence
日付：2026-MM-DD　所要：__ 分（開始 hh:mm／終了 hh:mm）
ビルド：integ master sha ________（Voice Pilot 同梱：YES／NO・別 sha ________）
preview URL：________　LAN URL：________
端末：PC（OS／ブラウザ ________）・iPhone（機種／iOS ________）・D1 端末 ________
初期化：localStorage クリア YES／NO（13 key）　音量：PC スピーカー ___%／iPhone サイレント OFF・___%
参加者：CEO／初心者 A（ゲーム経験：＿＿）／初心者 B（＿＿）

## 設問（YES／NO／△・自由記述 1 行）
Q1 勝ち方が分かった        CEO:__  A:__  B:__ ｜ ________
Q2 自力で 2 戦目           CEO:__  A:__  B:__ ｜ きっかけ：________ 変えたもの：________
Q3 Intent を言葉に         CEO:__  A:__  B:__ ｜ 言えた内容：________
Q4 選ぶ基準                CEO:__  A:__  B:__ ｜ 基準：________
Q5 託宣温存／導き          CEO:__  A:__  B:__ ｜ R_ に ____ を切った／温存した R：__
Q6 もう一度＋何を変える    CEO:__  A:__  B:__ ｜ 変える内容：________
Q7 別構成で勝ち方が変わった CEO:__ ｜ ________
Q8 Voice (a)__ (b)__ (c)__ ｜ (b)長いなら a／b：__
Q9 HP pill PC:__ iPhone:__ ｜ ________
D1 互換 Smoke（端末 ____）進行:__ 音:__ 表示:__ ｜ ________

## 事実ログ（時刻｜画面｜行動｜考えた秒数｜止まった画面｜予告｜発言｜結果）
00:00｜Home｜…
（戦ごとに：勝敗／R 数／残 HP／seed／結果→次戦開始までの秒数）

## 自由感想（最初に聞く・言い換えない）
一番気になったこと：________　一番楽しかった瞬間：________

## Triage（1 件 1 行：設問｜分類 A/B/C｜根拠（ログ行）｜再現 seed｜次アクション）
```

評価結果の置き場：`docs/evidence/practical-qa-v3/session.md`（事実ログ・発言）・`questions.md`・`triage.md`・`device-smoke.md`（D1）。

---

## 6. runtime 変更 0 と再開しない NO-GO

- 本書は手順書のみ。`src/`・`public/`・`scripts/`・`package.json`・Production・DECISIONS.md：変更 0。QA 実施中も runtime commit を行わない（修正は Triage 後に別 Decision）
- 再開しない：**決定263** Threat Shape v1（NO-GO・「正解を教えられている感覚」）／**決定216** 龍神 R4 守り（NO-GO）／**決定214** 7 OTOMO 展開（NO-GO）／決定262 Answer Visibility／決定255・260（数値変更で解かない）。Q3・Q4 の NO が出ても、これらの再開を対策候補に書かない
- OB-05 禁止事項（CEO 2026-10-07）：敵 HP／ATK 低下・強カード配布・おすすめカード表示・正解表示・自動選択 → v3 の Triage の選択肢からも除外

---

## 7. AI が事前に用意するもの（セッション前日まで）

| # | 用意 | 内容 |
|---|---|---|
| 1 | preview URL | integ master 最新を `vite preview --host 0.0.0.0 --port ____` で配信。PC：`http://127.0.0.1:____/`。ビルド sha と dist bundle 名を §5 に記入（Voice Pilot 未統合なら 4173 の Voice preview を Q8 用に別記） |
| 2 | LAN URL | iPhone（同じ Wi-Fi）：`http://192.168.__.__:____/`。AI が LAN から 200 を確認。開けない場合の Firewall 1 行（Voice §9 と同じ `New-NetFirewallRule … -Profile Private`・QA 後に Remove） |
| 3 | 初期化手順の案内（CEO 向け 3 行） | PC：DevTools → Application → Local Storage → 該当 origin の `sevengods.*` 13 key（battleSave／daily／dailyRunLog／deckPreference／matchups／otomoBond／pendingRuns／quota／records／rewardBonuses／rewardHistory／stakes／tutorialSeen）を全削除 → リロード。iPhone：設定 → Safari → 詳細 → Web サイトデータ → 該当ホストを削除。**ゲーム内に初期化 UI は無い**（grep 実測）。CEO 実アカウントの戦績を守る場合は別ブラウザ Profile（またはシークレット）を使う |
| 4 | 音量の案内 | PC：スピーカー・普段の音量。iPhone：サイレントスイッチ OFF・音量 50%・画面右上のスピーカーがミュートでないこと（Voice §9）。既知：iPhone は BGM が常に 1.0（v2 §5） |
| 5 | 記録用紙 | §5 テンプレを `docs/evidence/practical-qa-v3/` に空で置く。初心者用には Q1〜Q6 だけの用紙 |
| 6 | 観察の道具 | ストップウォッチ（考えた秒数・結果→次戦の秒数）。画面収録は CEO 任意 |
| 7 | 生存 Known 一覧 | `RELEASE_STATUS.md` §A-4 を手元に（既知を新規 Finding にしない） |
| 8 | D1 端末の有無確認 | Android／Chrome／Firefox のどれが手元にあるか CEO に 1 行で確認（無ければ D1 は「未実施・Known：iPhone Safari＋PC Chromium のみ検証」） |
