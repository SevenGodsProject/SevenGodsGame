# Card Decision Meaning —「答えの可視化」Preflight（決定262 候補・POST-RC #1）

- 日付：2026-10-03
- 種別：**PREFLIGHT ONLY／docs-only**。runtime／src／CSS／画像／音声／Production：変更 0。**新規 simulation 0**（決定255・Hand Decision Density Audit の既存 evidence JSON を再集計して引用）。ブラウザ 0
- 判断主体：Preflight の開始は **CEO 指示**（2026-10-03「Card Decision Meaning 答えの可視化 Preflight を開始してください」）。調査・比較・判定・SPEC は **AI 判断**（CLAUDE.md §6-2）。Pilot 実装の GO は CEO
- 前提：**Commercial RC = GO（CEO・2026-10-03）・RC 基準 runtime `8cba184` 固定**。本件は K33（POST-RC・OPEN）＝RC 後の第 1 項目。RC 前の runtime 変更は行わない
- 対象 Known：K33「Card Decision Meaning：カード選択が勝敗に効きにくい」（Final Practical QA v2 Session 2 Q2 NO「手札によって今回はどう戦おうと考えたか」）
- 参照：`docs/SOLUTION_DIVERSITY_V1_PREFLIGHT.md`（決定255 NO-GO・§2-2／§2-3 答えの型）・`docs/DECISION260_AP_FLATTENING_PREFLIGHT.md`（NO-GO）・`docs/HAND_DECISION_DENSITY_AUDIT.md`・`docs/PHASE6C_DECISION_FEEDBACK.md`（決定167 振り返り）・`docs/DECISION226_VICTORY_REVEAL_PREFLIGHT.md`・`docs/COMMERCIAL_RC_KNOWN_ISSUES_TRIAGE.md` §7（K33）
- 表記：【実測】＝既存 evidence JSON の再集計／【コード】＝master `7364c17` の読み取り／【AI 判断】

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 判定 | **GO WITH MODIFICATIONS**（Narrow Pilot・POST-RC） |
| 何を可視化するか | 結果画面の「振り返り」に **「解き方」1 行**を足す：**必殺ラウンドを「何で」受けたか**（盾札／加護／弱体／回復／必殺前に撃破）を、ログの事実だけから 1 文で言う。例「R4 の必殺（310）を、盾札と加護で受け切りました」「R4 の必殺（310）を、加護だけで受け切りました」「必殺の前（R3）に撃破しました」 |
| なぜそれが「カード選択の意味」になるか | 決定255／260 で確定したとおり、通常面では**カード選択は勝敗を変えない**（randomRO 99.6％＝reader 99.6％）。勝敗で意味を出す数値解は無い。残る lever は **「自分は何で解いたか」を名前で返す**こと＝プレイヤーが次の戦いで手札を見るときの語彙（盾札・弱体・回復・加護）を与える。特に **「加護だけで受け切った」が言語化される**と、「札を使っていない」事実がそのまま見える（S2 Q2 NO の正体を本人に返す） |
| 既存の振り返り（決定167）との差 | 現状は「予告された攻撃 N 回のうち M 回を無傷で受け切りました（盾で防いだ量 X・封じ K 回）」＝**量**は言うが**手段**は言わない。盾が札由来か加護由来か、弱体が効いていたか、は一切出ない【コード】 |
| 却下した案 | 札の型ごとの使用枚数チップ（帳票感・決定225 の「内訳の帳票感」残差を悪化）／「神階Ⅲ以降は弱体・回復も要ります」の固定文（generic 固定文の禁止・決定167）／結果画面でのスコア差強調（randomRO と reader の撃破 R 差 0.08・必殺被ダメ差 1.2＝数値では見えない） |
| 範囲外として分離 | **開幕の手札読み**（戦闘開始時に「この敵の必殺 R4・310／手札の盾札 n 枚」を見せる）＝S2 Q2「手札でどう戦おうと考えたか」に**直接**効く lever は結果画面ではなく戦闘開始時。本 Preflight の対象外として **別 Preflight 候補**に記録（§7） |
| 実装範囲（Pilot） | `src/components/battle/battleRecap.ts`（純関数＋テスト）と `GameOverOverlay.tsx` の表示のみ。**`src/core` 0・engine 0・event 追加 0・save 0・CSS 追記ほぼ 0**（既存 `.game-over-recap` を再利用）。振り返りの行数上限 3 は維持（「解き方」行を優先 1 位に置き、最下位の行を落とす） |
| Gate | vitest（reducer 実走で行とログの事実が一致・虚偽 0・禁止語 0・不完全ログで非表示）／PC・SP 結果画面の箇所 diff（振り返り以外 0）／console 0／決定241 toast・決定226 Victory Reveal・Result Hub の順序不変。戦闘中の timing には触れないため決定250／252／254 の lock 再計測は不要【AI 判断】 |
| Human QA | 2 戦後に 1 問：「結果の 1 行を見て、次の戦いで『どの札で受けるか』を意識しましたか」＋ S2 Q2 の再質問 |

---

## 1. 問題の再定義【AI 判断】

- Final QA v2 Session 2 Q2 NO：「手札によって今回はどう戦おうと考えたか」→ **NO**。所感「考えなくても勝てる」
- 決定255（Solution Diversity）／260（AP 平準化）／Hand Decision Density Audit の結論：通常面で randomRO（札は無作為・託宣だけ読む）＝reader（99.6％）。必殺は加護（＋任意の盾）で受かり、与ダメージは加算的 → **どの札を出すかは勝敗を変えない**。保護対象（Oracle・敵表・HP・カード数値・AP）を触らずに数値で変える解は無い
- したがって本 Preflight の問いは「カード選択で勝敗を変える」ではなく、**「カード選択に意味があったことをプレイヤー自身が認識できるか」**＝presentation の問い。評価軸は Player Value（自分の解き方が分かる）／Retention（次の戦いで手札を見る理由）／UX（結果画面の帳票感を増やさない）／Regression Risk（engine・save・timing 0）

---

## 2. 現状の結果画面に「答え」はどこまで出ているか【コード】

| 表示 | 出どころ | 「何で解いたか」が分かるか |
|---|---|---|
| 勝利／敗北／未撃破・敵の残り HP | `GameOverOverlay.tsx` | — |
| **振り返り（最大 3 行）** | `battleRecap.ts` `buildBattleRecap` | 1 行目「予告された攻撃 N 回のうち M 回を無傷で受け切りました（盾で防いだ量 X・封じ K 回）」＝**量のみ**。「神の一撃で決着」「HP n％から立て直し」「得意技 N 回」「⚡ N 回」。**盾の出どころ（札／加護）・弱体・回復の寄与は出ない** |
| 敗因 1 行＋ G1〜G4 | `defeatCause.ts`・`defeatGuidance` | 敗北時のみ。G1「310 の大技に対し盾は 20」は量のみ |
| スコア内訳（実効ダメージ／連携／撃破／早期撃破／生存／難易度） | `ScoreState`（決定109 BASE-D） | 札の型は出ない。SP では畳まれる |
| 神技評価・神階・Result Hub・挑戦状 | 決定110／126／187 | — |

- ログの事実（`GameEvent`）：`CARD_PLAYED {defId}`・`DIVINATION_USED {choiceIndex}`・`BLOCK_GAINED`・`BUFF_APPLIED {target:'enemy', stat:'atk', amount<0, rounds}`・`HEALED`・`ENEMY_INTENT_SET`／`ENEMY_ACTED {kind, amount}`・`DAMAGE_DEALT {blocked}`・`ROUND_STARTED {round}`。**「必殺を何で受けたか」は、`splitBatches`（区切り＝CARD_PLAYED／DIVINATION_USED／ENEMY_ACTED）で切ると、BLOCK_GAINED が CARD_PLAYED バッチにあれば札由来、DIVINATION_USED バッチにあれば加護由来と判別できる**。弱体は BUFF_APPLIED の `rounds` と ROUND_STARTED の数で有効期間を復元。回復は HEALED。札の型は `cardSemantic.ts` `primarySemantic(effects)`（決定249・表示側の既存分類：STRIKE／GUARD／MEND／WEAKEN／ATTUNE／TEMPO／EMPOWER）
- 制約：ログは React state のみで**永続化されない** → 「続きから」再開の戦闘は不完全ログ（`GAME_STARTED` なし）。決定167 と同じ `complete` ガードで**非表示**にする。engine に「必殺をブロックした」事実は無い（表示側 `evaluateDefense` が導出）。CARD_PLAYED に round は無い（直前の ROUND_STARTED から復元・既存手法）

---

## 3. 答えは実際に「戦闘ごとに違う」か【実測・既存 evidence】

決定255 final（`docs/evidence/decision255/sim255-final.json`・prod・各 4,900 試合）の必殺ラウンドの答え（必殺が来た戦闘のみ・率）：

| 面・方策 | 必殺到達 | guard | 加護 | 弱体が効いている | mend | 必殺前に撃破 | 答えの型 上位 |
|---|---|---|---|---|---|---|---|
| 通常・planner | 78.3％ | 86.0 | 50.0 | 53.1 | 28.6 | 8.0 | 加護＋盾 17.3／加護＋盾＋弱体 16.5／盾＋弱体 16.0／加護＋盾＋回復 9.9／盾のみ 8.1／加護＋盾＋弱体＋回復 6.3／弱体のみ 5.7／盾＋回復 4.1 |
| 通常・reader | 80.9％ | 90.4 | 15.7 | 46.2 | 30.3 | 5.3 | 盾のみ 27.3／盾＋弱体 26.2／盾＋回復 11.1／加護＋盾＋回復 6.6／盾＋弱体＋回復 6.4／弱体のみ 5.1 |
| 通常・naive | 78.1％ | 58.3 | 0 | 49.8 | 33.2 | 8.2 | 盾＋弱体 19.4／盾のみ 18.0／弱体のみ 13.9／盾＋回復 10.2／**素受け 9.1**／回復のみ 7.4 |
| Hard・planner | 83.6％ | 92.1 | 67.2 | 51.3 | 34.9 | 2.4 | 加護＋盾 22.4／加護＋盾＋弱体 19.4／加護＋盾＋回復 15.8／盾＋弱体 13.3／全部 9.7 |
| 神階Ⅴ・planner | 84.6％ | 93.7 | 75.8 | 48.3 | 41.3 | 1.3 | 加護＋盾 22.9／加護＋盾＋弱体 20.9／加護＋盾＋回復 20.8／全部 11.2 |

- **答えの型は 8 種以上がそれぞれ 4％超**＝1 行は戦闘ごとに変わる（generic 固定文にならない）。敵でも変わる（決定255 §2-3：魔獣は加護 5.7％・回復 37.9％／道化は加護 71.9％／機工師は必殺 R に撃破 36.6％）
- 「加護だけ」「盾札だけ」「素受け」が区別できる＝**札を使ったか使わなかったかが文に出る**
- 必殺に到達しない戦闘（約 15〜22％）は「必殺の前（R n）に撃破しました」＝常に 1 行ある

数値での可視化が効かない根拠（Hand Decision Density Audit `hdd.json`・通常 1,960 試合）：

| 方策 | 勝率 | 撃破 R | 必殺で受けた被ダメ | 必殺を生存 |
|---|---|---|---|---|
| reader | 99.6 | 5.72 | 7.2 | 100.0 |
| randomRO（札は無作為） | 99.6 | 5.80 | 8.3 | 99.7 |
| planner | 99.9 | 5.51 | 4.2 | 100.0 |

- randomRO と reader の差は撃破 R 0.08・被ダメ 1.2＝**スコア／ラウンド／HP の数字を強調しても「札の意味」は見えない**。見えるのは「何で受けたか」という**質の違い**だけ

---

## 4. 候補の比較【AI 判断】

| 案 | 内容 | Player Value | 帳票感・UX | 虚偽リスク | 実装 | 判定 |
|---|---|---|---|---|---|---|
| **V1 解き方 1 行** | 必殺ラウンドを何で受けたか（盾札／加護／弱体／回復／必殺前撃破）を 1 文。振り返り優先 1 位 | 高（戦闘固有・語彙を与える・「加護だけ」が見える） | 行数上限 3 を維持＝増えない | 低（ログの事実のみ・reducer テスト） | 小（`battleRecap.ts`＋test＋表示） | **採用** |
| V2 札の型チップ | STRIKE n／GUARD n／WEAKEN n／MEND n の使用枚数 | 中（何をしたかは分かるが「効いたか」は分からない） | 悪化（決定225 残差「内訳の帳票感」） | 低 | 小〜中（CSS 追加） | 却下 |
| V3 神階ヒント固定文 | 「神階Ⅲ以降は弱体・回復の札も要ります」 | 低〜中（教示） | generic 固定文（決定167 で禁止） | 中（後知恵・断定に近い） | 小 | 却下（Result Hub「次の目標」の文脈で別検討） |
| V4 スコア差の強調 | 札選択の結果をスコアで見せる | 低（§3：差が 0.08R／1.2 被ダメ） | — | — | — | 却下 |
| V5 開幕の手札読み | 戦闘開始時に敵の必殺 R・量と手札の盾札数を見せる | 高（S2 Q2 に直接効く） | 戦闘画面＝決定240 Intent・254 入口と干渉 | 低 | 中（HUD・timing Gate 必要） | **範囲外・別 Preflight 候補**（§7） |

---

## 5. SPEC（Pilot・1 案）

### 5-1. 「解き方」行の生成（`battleRecap.ts` に純関数を追加）
1. `splitBatches(log)` で 1 アクション＝1 バッチに切る。`complete`（`GAME_STARTED` あり）でなければ**行を出さない**
2. 必殺ラウンド＝`ENEMY_ACTED` の `amount ≥ RULES.cardBonus.enemyBigThreshold`（`evaluateDefense` の `big` と同じ基準）を含む最初のバッチ。round は直前の `ROUND_STARTED`
3. そのラウンドの「答え」集合：
   - **盾札**＝同ラウンドの CARD_PLAYED バッチに `BLOCK_GAINED(self)` がある
   - **加護**＝同ラウンドの DIVINATION_USED バッチに `BLOCK_GAINED(self)` がある（加護の choiceIndex は `DIVINATION_CHOICES` から解決）
   - **弱体**＝必殺時点で `BUFF_APPLIED(enemy, atk, <0)` が有効（`rounds` と ROUND_STARTED 数で復元）
   - **回復**＝同ラウンドに `HEALED` がある
   - **素受け**＝上記なし
   - 必殺が無い（必殺前に撃破）＝`GAME_ENDED(won)` が必殺より前
4. 文（後知恵・断定なし。禁止語 `勝てた|べきだった|出せば` は既存テストを流用）：
   - 「R{n} の必殺（{量}）を、{盾札／加護／盾札と加護}で受け切りました」（HP 被害 0）
   - 「R{n} の必殺（{量}）を、{手段}で受けました（被害 {x}）」（HP 被害あり）
   - 弱体あり：「弱体で R{n} の必殺を {実行値} まで削り、{手段}で受けました」
   - 回復あり：末尾に「・回復で立て直し」
   - 「R{n} の必殺（{量}）を、素受けしました」（敗北時は既存 G1 が優先・重複させない）
   - 「必殺の前（R{n}）に撃破しました」
5. 振り返りの順序：**解き方 → 神の一撃で決着 → 予告攻撃 N 回中 M 回無傷 → HP 立て直し → 得意技 → ⚡**。上限 3 行は維持（最下位から落とす）。敗北時は既存の敗因 1 行＋G1〜G4 を優先し、「解き方」は 1 行だけ添える

### 5-2. 保護
- `src/core` 0・engine 0・GameEvent 追加 0・save／replay 0・RULES 0・Daily 共有テキスト 0
- 決定167 の「虚偽 0・generic 固定文のみ禁止・後知恵禁止・不完全ログで回数系非表示」をそのまま適用
- 決定226 Victory Reveal・決定187 Result Hub の順序・決定241 toast・決定261 構図：不変
- CSS：既存 `.game-over-recap` を再利用。追記は 0〜数行（強調なし）

### 5-3. Gate（Fast Gate 型・直列・ブラウザ 1）
| # | 内容 | 合格 |
|---|---|---|
| G1 | vitest：reducer 実走で 7 敵×2 方針のログを作り、行とログの事実が一致（盾札／加護／弱体／回復／素受け／必殺前撃破の 6 型を各 1 件以上） | 虚偽 0 |
| G2 | 禁止語（`勝てた|べきだった|出せば`）0・不完全ログで非表示 | PASS |
| G3 | tsc 0・oxlint 0・vitest 全件 | PASS |
| G4 | PC 1508／SP 844・660 の結果画面 screenshot：振り返り以外の箱 diff 0・横スクロール 0・console 0 | PASS |
| G5 | 行数 ≤3・1 行の長さ（SP で 2 行折返し以内） | PASS |
| G6 | 既存 `battleRecap.test.ts`／`decisionFeedback` テスト不変 | PASS |

### 5-4. Human QA（CEO・2 戦＋1 問）
- 通常 1 戦（加護で受ける敵：乱舞の道化）＋ 1 戦（回復で受ける敵：双牙の魔獣）
- Q：「結果の『解き方』の 1 行を見て、次の戦いで『どの札で受けるか』を意識しましたか」（YES／NO）
- 再質問：Session 2 Q2「手札によって今回はどう戦おうと考えたか」

---

## 6. リスクと反証【AI 判断】
- **効かないリスク**：結果画面は事後。S2 Q2 の「開幕に手札で考える」には間接的にしか効かない → Human QA の再質問で測り、NO なら V5（開幕の手札読み）を次に回す。本案を「K33 の解決」とは記録しない（**K33 は OPEN 維持・presentation 第 1 手**）
- **帳票感の悪化**：行数上限 3 を守る・チップや表を足さない（決定225 残差を増やさない）
- **虚偽**：加護／札の帰属はバッチ構造に依存。reducer 実走テストで 6 型を網羅。復元できない場合は行を出さない（決定167 と同じ原則）
- **続きから**：不完全ログは非表示（既存ガード）
- RC への影響：**なし**（RC 基準 `8cba184` は固定。本件は RC 後 Pilot）

---

## 7. 範囲外として分離した候補（記録のみ）
- **V5 開幕の手札読み**（Battle Start Hand Read）：戦闘開始時に「この敵の必殺：R4・310」と「手札の盾札 n 枚」を見せる。S2 Q2 に直接効く唯一の lever。決定240 Intent・決定254 入口・決定261 構図と同じ戦闘画面を触るため、別 Preflight（HUD・timing Gate を含む）が必要。優先度：本案の Human QA 再質問が NO のとき NEXT
- V3 の派生：Result Hub「次の目標」に神階昇格時だけ「神階Ⅲ以降は弱体・回復の札も要ります」を 1 回出す（generic 固定文にならない条件付き）。決定255 §2 の数値（Ⅴ noWeaken −17.8）が根拠。Pilot には含めない

---

## 8. CEO 判断事項
```
【CEO DECISION REQUIRED】
Issue：決定262 候補「答えの可視化」Narrow Pilot を POST-RC 第 1 項目として実装開始するか
AI Recommendation：GO WITH MODIFICATIONS — V1「解き方 1 行」のみ（振り返りに 1 行・上限 3 行維持・src/core 0）
Reason：札選択の意味は数値では見えない（randomRO≈reader）が、「何で受けたか」はログから虚偽なく言え、戦闘ごとに 8 型以上に分かれる。既存の振り返り（決定167）の枠に収まり、engine・save・timing を触らない
Alternatives：V2 型チップ（帳票感）／V3 固定文（generic 禁止）／V4 スコア強調（差が無い）／V5 開幕手札読み（範囲外・別 Preflight）
Risk：事後表示のため S2 Q2 への効果は間接的。Human QA の再質問で測り、NO なら V5 へ
Impact if delayed：K33 は OPEN のまま。RC には影響なし
CEO Action：承認 / 拒否（承認時：RC 後に worktree で Pilot → Fast Gate G1〜G6 → Human QA 2 戦 1 問）
```

---

## 9. 実装しなかったこと・runtime 変更 0 の証明
- 本書のみ。simulation・ブラウザ・build・vitest：実行 0。引用数値はすべて既存 evidence（`docs/evidence/decision255/sim255-final.json`・`docs/evidence/hand-decision-density/hdd.json`）の再集計
- worktree `SevenGodsGame-d254-rc`・branch `docs/d262-answer-visibility-preflight`（`7364c17` 起点）：`git status --porcelain` docs 以外 0
