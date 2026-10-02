# Final Practical QA v2 — ゼノちゃん本人が「普通に遊んで」確かめる最終 Human QA 手順

- 日付：2026-10-02
- 種別：**docs-only**（QA の手順書。テストの実行ではない。runtime・src・public・Production：変更 0。ブラウザ・vitest・build・simulation・server：使用 0）
- 位置づけ：`docs/FINAL_PRACTICAL_QA_COMMERCIAL_RC_PREFLIGHT.md`（v1＝設計）を、決定246〜257 の改善と `docs/POST_D257_REMAINING_WORK_AUDIT.md` を反映して **実施用の手順**に書き直したもの。Regression Gate（G1〜G19）・Exit Criteria・Triage の基準は v1 と矛盾させない（v1 を正とし、本書は実施面だけを定める）
- 前提の状態：決定246〜254 は PRODUCTION LIVE／決定255 は NO-GO で CLOSED（runtime 変更なし）／**決定257 Sound Layer v1 は Human QA 4/4 PASS・Release 進行中（CLOSED とは断定しない）**／決定259 Daily 神間 spread は PARTIAL（未検証部分は本書に書かない）／Ranking は READY-DORMANT（本書に Ranking UI の評価は含めない）／Home の動き・敵アート・Voice は Final QA の必須完成条件に **含めない**
- 原則：**最初は普通のプレイヤーとして自然に遊ぶ**。チェック項目はプレイ中に見ない。遊び終わってから自由感想 → 最大 10 問 → Triage の順

---

## 0. 全体の流れ（1 枚）

| 段階 | 誰が | 何を | 所要 |
|---|---|---|---|
| 準備 | AI | §1 の条件を満たす（Regression Gate 1 回・Known Issues 一覧・台帳行・QA 用紙の用意）。CEO には「遊ぶ順番」だけ渡す | — |
| Session 1 | CEO | 初見に近い 1 戦（PC）→ 自由感想 → Q1〜Q10 | 10〜15 分 |
| Session 2 | CEO | 別の神×別の敵で 2〜3 戦（PC または iPhone）→ 自由感想 → Q1〜Q10 | 20〜30 分 |
| Session 3 | CEO | 別日に Daily 1〜3 戦（iPhone 推奨）→ 自由感想 → Q1〜Q10 | 翌日 10〜15 分 |
| 端末確認 | CEO | §5 の PC／iPhone 確認（Session 2・3 の中で自然に） | — |
| Triage | AI → CEO | §7 で分類 → §8 Exit Criteria 判定 → CEO が RC GO／NO-GO | — |

---

## 1. 実施条件

1. **Production のみ**：`https://seven-gods-game.vercel.app/`。QA サーバー・`?seed=`・`?stake=`・`?enemy=` の URL パラメータ・DevTools は使わない（原則不要。問題が出たときだけ AI が再現に使う）
2. **PC ＋ iPhone**：Session 1 は PC、Session 2 は PC か iPhone のどちらか、Session 3 は iPhone 推奨。音は両端末とも **スピーカーで音量を普段どおり**（ミュートにしない）
3. **通常プレイ**：CEO の実アカウント（localStorage）のまま。チュートリアル既読・記録・OTOMO の絆は現状のまま遊ぶ。神・敵・デッキは **自分で選ぶ**（おすすめデッキのままでもよい）
4. **最初はチェック項目を見せない**：CEO に渡すのは §2〜§4 の「遊ぶ順番」の行だけ。§6 の質問は各 Session の **終了後**に AI が読み上げる（または用紙を開く）
5. **記録は AI が取る**：CEO の発言をそのまま 1 行ずつ `docs/evidence/final-practical-qa-v2/session-N.md` に書く。言い換え・要約をしない（決定244 の 14 Findings はこの形から生まれた）
6. **やめたくなったら止める**：「つまらない」「分からない」で止まった時刻と画面を記録する。それ自体が最重要の Finding

---

## 2. Session 1 — 初見に近い 1 戦（PC）

**CEO に渡す行**：「Home から始めて、好きな神と敵を選び、普段どおりに 1 戦してください。勝っても負けても、結果画面まで進んだら声をかけてください。」

- 流れ（実装どおり）：Home（3 秒で表示）→ 神選択 → 難易度（ふつう）→ 敵選択（49 盤から）→ デッキ → **降臨の間**（初回 Full 2.8s）→ Battle（予告 → 手札 → 託宣 3 回 → 共鳴 → 必殺 → 神の一撃）→ 勝利／敗北 → 結果
- AI が **見ているだけで**記録すること（CEO に聞かない）：Home を開いてから降臨の間に入るまでの時間／迷って止まった画面／降臨の間を skip したか／1 戦の時間／託宣を何回・どの R に切ったか／必殺の R に何をしたか／神の一撃が出たか／結果画面で最初に目が行った場所（CEO の発言から）
- 終了後の **主観記録**（CEO の言葉で。YES／NO は求めない）：
  - 楽しい
  - 戦っている感じ
  - 敵が怖い
  - カードを考える
  - 神の一撃が気持ちいい
  - もう 1 回やりたい
- 続けて §6 の Q1〜Q10

## 3. Session 2 — 別の神 × 別の敵で再戦（PC または iPhone）

**CEO に渡す行**：「Session 1 と違う神と、違う敵を選んで 2〜3 戦してください。むずかしい や 神階 に行きたくなったら行ってください。終わったら声をかけてください。」

- 流れ：結果 → もう一度（同 seed）または別の神／別の敵（降臨の間 Short 1.5s）→ むずかしい → 神階（むずかしい解放後）→ OTOMO 成長 → 記録（49 盤）→ Home のうち、CEO が自然に辿った順を記録する（誘導しない）
- 終了後に **確認する 6 点**（Q1〜Q10 と重なる部分は Q で聞く。ここは AI の観察＋CEO の言葉）：
  1. 予告（Intent）を見て行動を変えたか（変えた場面を 1 つ言ってもらう）
  2. 手札を見て考えたか（迷った札を 1 枚言ってもらう）
  3. 託宣を温存した／使い分けたか（加護・導き・天啓のどれを・いつ）
  4. 敵の必殺（溜め → 大技）に対応したか（盾・弱体・回復・加護・先に削る のどれで）
  5. 神／OTOMO／カードの違いを感じたか（Session 1 の神と比べて何が違ったか）
  6. 敗北または危機の理由が理解できたか（結果画面の敗因表示・残 HP・どの手で危なくなったか）
- 続けて §6 の Q1〜Q10

## 4. Session 3 — Daily（別日・iPhone 推奨）

**CEO に渡す行**：「翌日、Home から『神域挑戦』を開いて、1〜3 回遊んでください。終わったら声をかけてください。」

- 前提（実装どおり）：同日同 seed・敵は週次巡回で 1 体・**3 回まで・開始時に消費・best-of-3**・難易度は normal 基準・補正あり・敵選択なし。Ranking UI は未実装のため **評価しない**
- 観察：Home で神域挑戦を押したか（押さなかったら理由を聞く）／1 回目と 2 回目で神・デッキ・手順を変えたか／「同じ盤面でもう一度」の意味が伝わっているか／3 回の消費が理解できているか（「あと N 回」の表示）／今日のベストが結果に出たか
- 終了後の主観記録：「明日も遊びたいか」「3 回の意味を感じたか」「同じ seed で工夫した実感があるか」
- 続けて §6 の Q1〜Q10（Q8〜Q10 が主）

---

## 5. PC／iPhone 確認（Session 2・3 の中で自然に）

| 項目 | PC | iPhone | 何を見るか（CEO は普段どおり操作。AI が発言から記録） |
|---|---|---|---|
| 操作感 | ○ | ○ | 押したら即反応するか（決定233 タップ音 0ms）・誤タップ・スクロールの引っかかり |
| 文字 | ○ | ○ | 読めない・切れる・重なる箇所（カード説明・予告・託宣の役割語「守る／整える／攻める」） |
| 横スクロール | ○ | ○ | 横に動く画面があるか（あれば画面名） |
| 音量 | ○ | ○ | BGM と SE のバランス（iPhone は BGM が常に 1.0 で鳴る既知の制約→うるさいか） |
| BGM duck | ○ | ○ | 神の一撃・必殺の瞬間に BGM が沈んで戻るか・戻らない／二重になる場面があるか（決定257） |
| SE | ○ | ○ | 神の一撃の「上昇」と必殺の「圧」が音だけで区別できるか・うるさくないか |
| Entry | ○ | ○ | 降臨の間（初回 Full／2 戦目 Short／skip）が長すぎないか・ガタつき |
| God Strike cut-in | ○ | ○ | 大耀は動画・他 6 神は静止カットイン（既知）。気持ちいいか |
| Enemy Ultimate | ○ | ○ | 溜め（⚠）→ 大技 が怖いか・理不尽でないか（道化の R3 狂宴・鬼将の R4 断岩） |
| Result | ○ | ○ | 勝利の舞台・敗因表示・自己ベスト・報酬 3 択・「もう一度」の導線 |
| Retry | ○ | ○ | 「同じ盤面でもう一度」→ 降臨の間 Short → R1 に入るか・音が残らないか |

---

## 6. 各 Session 終了後の質問（最大 10 問・自由感想を最優先）

**最初に必ず**：「**一番気になったことは何ですか**」（自由回答・AI は言い換えずに記録）。次に「一番楽しかった瞬間」「商用として恥ずかしいと思った箇所」。

その後、YES／NO／△（分からなかった）で：

| # | 質問 | 主に | NO のときの §7 既定 |
|---|---|---|---|
| Q1 | 最初の 30 秒で「始めたい」と思ったか | S1 | MUST FIX |
| Q2 | 敵の予告を読んで手を変えた場面が 1 戦に 1 回以上あったか | S1・S2 | **BLOCKER**（Primary Fun） |
| Q3 | 「どれを出すか」で迷った場面があったか | S1・S2 | MUST FIX |
| Q4 | 託宣を「今じゃない」と我慢した、または使い分けた場面があったか | S1・S2 | MUST FIX |
| Q5 | 敵の必殺（溜め→大技）が怖かったか。理不尽ではなかったか | S1・S2 | MUST FIX |
| Q6 | 神の一撃は気持ちよかったか。音と絵で「決まった」と感じたか | S1・S2 | CAN SHIP |
| Q7 | 負けた／危なかったとき、理由が分かったか | S1・S2 | **BLOCKER**（Failure Teaches） |
| Q8 | 「もう一度」または「別の神・別の敵」を自分から押したくなったか | S2・S3 | MUST FIX |
| Q9 | Daily を翌日も遊びたいか。3 回・同じ盤面の意味を感じたか | S3 | MUST FIX |
| Q10 | 人に見せたい画面が 1 つでもあったか（どの画面か） | 全 | CAN SHIP |

- critical＝**Q2・Q7**。どちらかが NO なら §8 の「Human QA critical NO = 0」を満たさない
- 「△」は NO と同じく §7 の入力にする（分からなかった＝伝わっていない）
- Final QA 中に CEO が新機能を思いついた場合：既存体験を壊す問題でなければ **CAN SHIP / FOLLOW-UP** に記録して先へ進む（本 QA で仕様を増やさない）

---

## 7. Triage（v1 §4 と同じ基準・実施面だけ補足）

| 段階 | 定義 | 典型 | 扱い |
|---|---|---|---|
| **BLOCKER** | **Primary Fun「解く」・determinism・save・fairness・game-breaking UI** のどれかに触れる | Q2／Q7 NO・同 seed で結果が変わる・「続きから」失敗・Daily が 4 回打てる／seed が違う・操作不能・横スクロールで操作できない・勝敗が出ない | RC 停止。再現 → Root Cause → 修正 → Regression Gate 全件 → 該当 Session 再実施 |
| **MUST FIX BEFORE RC** | Loop の 1 段（解けた→もう一回→成長した→次も解きたい→明日も来たい）を止める | Q1／Q3／Q4／Q5／Q8／Q9 NO・必殺が怖くない・託宣が余る／足りない・Retry の導線が見つからない・音が二重／残留 | 修正 → 影響範囲の Gate のみ → 該当 Q だけ再 QA（1 問 1 回） |
| **CAN SHIP / FOLLOW-UP** | Loop を止めない・見た目／音の好み・Known Issue の再確認・asset で解くもの | Q6／Q10 NO・敵アートの平面感・Voice がない・Home が静止・6 神の静止カットイン・iPhone の BGM 1.0・D254 Known #5 | Known Issue として記録し RC へ。見た目の好み由来の昇格は **RC 1 回につき 1 件**（CEO が選ぶ） |

- 手順：1 件ずつ、再現（同 seed は結果画面の seed 表示）→ 5 領域テスト → Loop テスト → 既定分類の上書き（CEO の「遊ぶのをやめたくなった」は 1 段階上げる）→ `docs/evidence/final-practical-qa-v2/triage.md` に 1 行
- 決定255 の結論を守る：Normal で「盾＋加護で解けた」こと自体は問題にしない。Q3 NO が出た場合も、数値変更ではなく表示・導線の問題として扱う
- Home の動き・敵アート・Voice・Ranking は **CAN SHIP / FOLLOW-UP か BLOCKED／NEEDS CEO** に置き、RC の条件に昇格させない

---

## 8. Commercial RC Exit Criteria（v1 §3 と同一・再掲のみ）

P0 blocker 0／P1（MUST FIX）0／core deterministic mismatch 0（metric lock）／console error 0／save corruption 0（「続きから」1 回以上成功）／unrecoverable battle 0／input penetration 0／mobile 横スクロール 0／Human QA critical NO 0（Q2・Q7）／MUST FIX 由来の NO 0・CAN SHIP の NO は §7 の上限内／配信 asset に台帳行（決定257 の SE 2 本を含む）／Known Issues 一覧の CEO 承認。**新設基準なし**。Exit の GO は CEO。

---

## 9. 記録の置き場
- `docs/evidence/final-practical-qa-v2/session-1.md`／`session-2.md`／`session-3.md`（CEO の言葉をそのまま）・`questions.md`（Q1〜Q10 の回答）・`triage.md`・`device-check.md`（§5）
- Regression Gate の結果は v1 §2 のとおり `docs/evidence/final-practical-qa-v2/gate/`（Pre-Gate を別 Decision として実施した場合はその evidence を参照）

## 10. 実装しなかったこと・runtime 変更 0 の証明
- 本書は手順書のみ。runtime・src・public・Production・決定257 Release lane・決定259 simulation・外部サービス・push・`docs/DECISIONS.md`：すべて 0
- worktree `C:/Users/kimi1/SevenGodsGame-rwa`・branch `docs/post-d257-remaining-work-audit`：`git status --porcelain` は本書 1 ファイルのみ・`git diff --stat 538a3ef -- src public package.json` 0（§10 実行ログ）

### §10 実行ログ
- 実行：2026-10-02（worktree `C:/Users/kimi1/SevenGodsGame-rwa`・branch `docs/post-d257-remaining-work-audit`・親 `aae81fb`・base `538a3ef`）
- `git status --porcelain`：`?? docs/FINAL_PRACTICAL_QA_V2.md` の 1 行のみ／`git diff --stat 538a3ef -- src public package.json`：0 行
- ブラウザ・vitest・build・simulation・server・外部サービス・push・DECISIONS 編集・決定257 Release lane・決定259 simulation：0
