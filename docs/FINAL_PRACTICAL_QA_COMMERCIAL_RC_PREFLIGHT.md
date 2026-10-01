# Final Practical QA / Commercial RC Gate Preflight — CEO 最終実践プレイと Commercial RC 入口 Gate の先行設計

- 日付：2026-10-02（Lane 1 Parallel Prep・Lane 2／3 の完了待ち時間に作成）
- 種別：**PREFLIGHT / DESIGN ONLY・docs-only**（runtime・src・Production・asset・音声：変更 0。simulation 再実行・Playwright・Chrome・vitest：実行 0。本書は「テストの設計」であり「テストの実行」ではない）
- 判断主体：AI チーム（CLAUDE.md §6-2「QA 方式」「テスト方式」）。**最終実践プレイの実施時期と Commercial RC への GO は CEO**
- Baseline：Production master `3dd8b5c`／runtime `a611270`（決定254 LIVE）。`docs/POST_D254_PRACTICAL_QA_REAUDIT.md`（Lane 1）の 14 項目 status を前提にする
- 原則：基準値は **既存 Decision／evidence に根拠があるものだけ**を採用し、出典を併記する。新しい数値基準は作らない（根拠のない項目は「観察のみ」と明記）
- 表記：【docs】＝既存 Decision・監査の記録／【実測】＝Lane 1 Re-Audit の計測／【AI 判断】＝本書で決めた設計／【future gate】＝現在未実装の将来機能に対する予約枠
- 参照原則：`SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md` P1（North Star First）・P2（Solve Is Visible）・P5（Anticipation, Then Reveal）・P6（Failure Teaches, Retry Is Free）・P7（Progress on Existing Axes）・P9（Self Before Others）・P11（Gate Before Release, CEO Says GO）・P13（Promise = Proof in 5 Seconds・Launch Gate は Entrance→One Battle→Another Battle→Tomorrow→Safety の順）

---

## 0. 結論（先に）

| 項目 | 内容 |
|---|---|
| 位置づけ | 「全ゲーム改善完了後に CEO が普通のプレイヤーとして Production を最初から最後まで遊ぶ」最終実践 QA（§1）と、その前に AI が自動で通す Regression Gate（§2）、その後 Commercial RC へ進む Exit Criteria（§3）、問題が出たときの 3 段階 Triage（§4）、Ranking 統合後の検証スロット予約（§5）を 1 つの文書に先行設計した |
| 最終実践 QA の形 | **3 セッション**（Entrance＋One Battle／Another Battle＋Progression／Tomorrow＝翌日の Daily）・各セッションは「遊ぶ → 遊び終わってから 16 の体験軸に YES／NO／△ で答える」。プレイ中にチェックリストを見ない（開発者チェックリストではなく「遊んで楽しいか」を測る）。答えを誘導しない設問形式は決定218 §8・決定246〜254 の Human QA と同じ |
| Regression Gate | CEO がプレイする build に対し、AI が先に通す自動 Gate **19 項目**（§2）。すべて既存 Gate（決定246〜254 の Release Gate・metric lock・skip 貫通・HUD 箱差・決定58／DAILY-01／STAKE-01 等）の再利用。Ranking は **future gate** |
| Commercial RC Exit Criteria | §3。BLOCKER 0／MUST FIX 0／core deterministic mismatch 0／console error 0／save corruption 0／unrecoverable battle 0／input penetration 0／mobile horizontal scroll 0／Human QA critical NO 0。いずれも決定197〜254 の Gate で既に使っている基準の集約で、新設は 0 |
| Triage | §4。BLOCKER／MUST FIX BEFORE RC／CAN SHIP・FOLLOW-UP の 3 段階。**妥協しない 5 領域**（Primary Fun「解く」・determinism・save・fairness・game-breaking UI）は見た目の好みと切り離し、見た目の好みは「FOLLOW-UP 上限 1 件／RC 1 回」の形で無限延期を防ぐ |
| Ranking future slot | §5。Lane 2 の結論を待つため仕様は決めず、最終 QA に Ranking が入った場合の **10 検証スロット**だけ予約 |
| runtime／Production 変更 | **0**（§7） |

---

## 1. FINAL PRACTICAL QA（CEO が普通のプレイヤーとして遊ぶ）

### 1-1. 設計方針【AI 判断】
1. **チェックリストを持たずに遊ぶ。** プレイ中は何も記録しない。1 セッションが終わってから §1-4 の体験軸に答える（決定244 の 14 Findings は「遊んだ後の自由記述」から生まれた。同じ形で集める）
2. **Production をそのまま遊ぶ**（`https://seven-gods-game.vercel.app`・新規 Vercel deployment なし）。PC 1 回＋iPhone 1 回（決定254 Human QA と同じ 2 環境）
3. **seed は固定しない。** Pilot の Human QA は `?seed=` 固定だったが、最終実践 QA は「普通のプレイヤー」なので seed 指定なし・チュートリアル既読状態は CEO の実アカウント（localStorage）のまま
4. **3 セッションに分ける**（P13 Launch Gate の順：Entrance→One Battle→Another Battle→Tomorrow→Safety）。Safety（Ranking／アカウント）は現状 dormant のため §5 の future slot
5. **答えは YES／NO／△ の 3 値＋自由記述 1 行。** △ は「分からなかった・気づかなかった」。NO と △ はどちらも §4 Triage の入力になる

### 1-2. セッション構成と画面フロー（現 Production の実フロー `GameFlow.tsx:31-385`【docs】）

| セッション | 画面フロー（実装どおり） | 想定時間 | 記録する体験軸（§1-4） |
|---|---|---|---|
| **S1 Entrance ＋ One Battle** | HOME（E1：3 秒で Home・チュートリアル自動表示なし）→ 神選択 → 難易度（ふつう）→ 敵選択（49 盤から 1 体）→ デッキ（おすすめのまま可）→ **降臨の間**（Full 2.8s・初回）→ Battle（予告を読む → 手札 → 託宣 → 共鳴 → 必殺 → 神の一撃）→ 勝利／敗北 → 結果（自己ベスト・神技評価・報酬 3 択）→ Retry | 1 戦 5〜8 分 | A1〜A10 |
| **S2 Another Battle ＋ Progression** | 結果 → もう一度（同 seed）または別の神／別の敵（降臨の間 Short 1.5s）→ 難易度「むずかしい」→ 神階（むずかしい解放後・`rules.ts:447 unlockDifficulty: 'hard'`）→ OTOMO 成長画面 → 記録（49 盤）→ HOME | 3〜4 戦 20〜30 分 | A11〜A14 |
| **S3 Tomorrow（翌日）** | HOME → 神域挑戦（Daily：同日同 seed・3 回・開始時消費・敵選択なし）→ 1〜3 戦 → 結果（今日のベスト）→ HOME | 翌日 10〜15 分 | A15・A16 |
| **S4 Safety【future gate】** | Ranking・アカウント・共有（Lane 2 の結論後） | — | §5 |

### 1-3. 「最初の 30 秒」の定義【AI 判断・P13 の 5 秒ルールから】
- 計測開始＝HOME が表示された瞬間。30 秒の間に **神を選び・敵を選び・降臨の間で神と敵が向き合うまで**到達できるか（E1 の 3 秒 Home ＋ 神選択 ＋ 敵選択 ＋ デッキ「おすすめのまま」＋ 降臨 2.8s）。到達できなければ「どこで止まったか」を自由記述
- 「遊びたくなるか」は到達の有無ではなく、降臨の間で **「この敵を倒したい」と思ったか**（A2）で測る

### 1-4. 体験軸 16 問（遊び終わってから答える・答えを誘導しない）

| # | 体験軸（CEO 指示） | 設問（YES／NO／△） | 対応する Decision・evidence【docs／実測】 | NO のときの §4 既定分類 |
|---|---|---|---|---|
| A1 | 最初の 30 秒で遊びたくなるか | Home から降臨の間まで、迷わず進めて「始めたい」と思ったか | 決定193 E1・決定254 Q1〜Q3 5/5 | MUST FIX（入口は商用の顔） |
| A2 | 敵を倒したくなるか | 降臨の間と予告を見て「こいつを倒したい」と思ったか | 決定254 Q2・決定240／252 | MUST FIX |
| A3 | 敵の意図を読む意味があるか | 予告を読んで手を変えた場面が 1 戦に 1 回以上あったか | 決定246 Q1・Lane 1 §3-1（reader−naive 15.7pt） | **BLOCKER**（North Star） |
| A4 | 手札を見て考えるか | 「どれを出すか」で 10 秒以上迷った場面があったか | Lane 1 §3-4（Item 10 IMPROVED BUT REMAINS） | MUST FIX |
| A5 | カード選択に意味があるか | 盾以外の札（弱体・回復・引く）で「助かった／効いた」と感じた場面があったか | Lane 1 §3-4（noWeaken −0.3／noMend −0.5＝**現状は NO が出る見込み**。決定255 候補の対象） | MUST FIX（決定255 で解く前提） |
| A6 | 託宣を切るタイミングを考えるか | 託宣を「今じゃない」と我慢した場面があったか／3 回で足りたか | 決定246 Q2・決定253 3/3・Lane 1（1.0 回／戦・R5 集中） | MUST FIX |
| A7 | 敵の必殺が怖いか | 溜め（⚠）を見て身構えたか・必殺を受けて「痛い」と思ったか | 決定252 Q1／Q2／Q7 7/7 | MUST FIX |
| A8 | 神の一撃が気持ちいいか | 共鳴 7 到達→カットイン→一撃で「決まった」と感じたか（大耀は動画・他 6 神は静止） | 決定250 7/7（大耀のみ）・Lane 1 §4 IMPACT | CAN SHIP（6 神の静止は既知） |
| A9 | 勝利が嬉しいか | 勝利の舞台→結果で達成感があったか | 決定226 5/5 | CAN SHIP |
| A10 | 敗北理由が分かるか | 負けたとき「どの手で負けたか」が結果画面で分かったか（`defeatCause.ts`） | P6・決定197／198 Solve Loop | **BLOCKER**（Failure Teaches） |
| A11 | Retry したくなるか | 負け／僅差のあと「もう一度」を押したか・同 seed で解き直せたか | P6・`sameSeedRetry` | MUST FIX |
| A12 | 別の神を使いたくなるか | 2 戦目に別の神を選びたくなったか・選んで戦い方が変わったか | Lane 1 §8（神別 GS 7〜98%・撃破 R 5.2〜6.1） | CAN SHIP（監視） |
| A13 | 別の敵を攻略したくなるか | 49 盤を見て「次はこいつ」と思ったか・敵で解き方が変わったか | Lane 1 §3-3（Item 11 IMPROVED BUT REMAINS） | MUST FIX（決定255 で同梱） |
| A14 | 成長を続けたくなるか | むずかしい→神階・OTOMO の絆・自己ベストのどれかで「次」が見えたか（P7 の 4 軸） | PHASE7 Return Loop 監査・決定251 | CAN SHIP（監視） |
| A15 | Daily を翌日も遊びたくなるか | 翌日 HOME を開いたとき神域挑戦を押したか・3 回の意味を感じたか | P8・DAILY-01・Lane 1（Daily reader 90.9） | MUST FIX |
| A16 | 人に見せたくなるか | スクリーンショットを撮りたい画面が 1 つでもあったか（どの画面か） | Lane 1 §4 ART（敵アート OPEN） | CAN SHIP（asset 側・Lane 3） |

- **critical 設問**＝A3・A10（North Star と Failure Teaches）。これが NO なら §3 の「Human QA critical NO = 0」を満たさない
- 16 問のほかに自由記述 3 行：「一番楽しかった瞬間」「一番つまらなかった／困った瞬間」「商用として恥ずかしい箇所」

### 1-5. 実施条件
- Production URL・CEO の実端末（PC ＋ iPhone）・通常ネットワーク。開発サーバー・`?seed=`・`?stake=` の URL パラメータは使わない（S2 の神階は UI から到達する）
- 実施前に AI が §2 Regression Gate を通し、「PASS／対象 build の JS・CSS md5」を報告してから CEO が遊ぶ（決定246〜254 と同じ順序）
- 実施後、CEO の回答（16 問＋自由記述）を `docs/evidence/final-practical-qa/` に記録し、§4 で Triage → §3 判定

---

## 2. REGRESSION GATE（最終実践 QA の前に AI が自動で通す）

すべて既存 Gate の再利用。実行環境は決定254 Release Gate と同じ（clean RC worktree・`vite preview`・Playwright は **1 プロセスずつ直列**・物理 RAM 6GB の制約【docs：決定254 Smoke はメモリ逼迫で一度停止し直列再開】）。

| # | protected | Gate（既存） | 合格基準（出典） | 現状 |
|---|---|---|---|---|
| G1 | 静的 | `tsc -b --noEmit`・`oxlint`・`vitest run`（単独実行） | tsc 0／lint 0／全件 PASS（決定254 時点 **1,289**）。Playwright 同時実行で重い sim テスト 3 件が timeout する既知事象あり → 単独で回す（決定253） | 現行 |
| G2 | Enemy Intent | Enemy Identity Gate（`identity.d252.test.ts.txt`）＋ 決定240 名札 class／SVG／構え | 7 敵 × 通常／hard／Ⅵ 全 7R の予告が `enemies.ts` の表と一致・溜め→必殺の 2 段（決定252） | 現行 |
| G3 | 7R・AP | `balanceSim.test.ts`・`enemyActions.test.ts` | 7R・AP 2〜8・持ち越しなし（`rules.ts`）・golden 一致 | 現行 |
| G4 | Seed（決定論） | 同 seed・同 action 列 → 保存 GameState が各ラウンド同一（metric lock） | **154 行 不一致 0**（決定253／254 Release Gate）・2 回実行の全試合ダイジェスト一致（決定246） | 現行 |
| G5 | Oracle | 決定253 gate（3 名前・3 役割語・状況表示・残数 3／神階 2） | 14/14（決定253 Smoke） | 現行 |
| G6 | Resonance | 共鳴 7 到達→`RESONANCE_BURST`→カットイン→一撃（決定250 6/6 発火） | 発火 100%・着弾 1,600／stop 80 不変 | 現行 |
| G7 | God Strike | 決定250 Fast Gate（poster+ 0ms・playing ≤278ms・404／stall／reduced は静止へ fallback） | dropped PC ≤2%／SP ≤5%（決定250 Preflight PG1・実測 2/33 で Human QA 受容） | 現行 |
| G8 | Enemy Ultimate | G2 と同じ＋Presentation gate（カットイン技名・紅蓮／金の環・PC 9.4px／SP 15.1px） | 決定252 Presentation gate 24 走 PASS | 現行 |
| G9 | Reaction Language | 決定249 gate（7 semantic → 正しい主体だけ反応・reduced は rim／dim のみ・layout 箱差 0px） | 42 play で主体一致・箱差 0 | 現行 |
| G10 | Save／Resume | `resumeRunLog`（保存ログをリプレイで再生・改ざん検出）・`saveVersion 9`・旧セーブ移行テスト | 回帰スイート 24 files／317 PASS（決定246）・save corruption 0 | 現行 |
| G11 | Daily | DAILY-01（同日同 seed・3 回・JST 固定）・`dailyBoss`／`dailyStart` テスト・balanceSim DAILY-01 | 「少なくとも 1 方策 ≥50%」違反 0 | 現行 |
| G12 | 49 Matchup | balanceSim 決定58（hard）・STAKE-01（神階段別下限）・Lane 1 harness（必要時のみ再実行） | 決定58／DAILY-01／STAKE-01 違反 0（決定251／252 Gate） | 現行 |
| G13 | Progression | 神階 unlock（`unlockDifficulty: 'hard'`）・OTOMO 成長・記録（49 盤）・自己ベスト | `otomoGrowthDisplay`／`matchupWiring`／`solveLoopWiring` テスト PASS | 現行 |
| G14 | Result | 決定207 Gate（低 PC viewport の recap・Daily 2 回目勝利の Secondary CTA 可視）・決定241 トースト重なり 0 | PASS（決定207／241） | 現行 |
| G15 | Mobile | SP 390×844・390×660：横スクロール 0・overflow 0・44px タップ領域（決定170）・>33ms frame 実 Chrome 最大 <8（決定254 T7） | 横スクロール 0・最大 7＜8（決定254） | 現行 |
| G16 | PC | PC 1508×660・1280×800：HUD 9 要素の箱差 0・敵反転 `scale -1 1`（決定247 21/21） | 箱差 0・21/21 | 現行 |
| G17 | Reduced Motion | 決定249（rim／dim のみ）・決定250（静止カットイン）・決定254（静止 0.9s・transform animation 0） | PASS（各 Gate） | 現行 |
| G18 | Sound | 決定233（押下→音 0〜2ms・30ms dedup・重複 0）・決定254 SE 時刻 ±50ms | PASS | 現行 |
| G19 | Entry | 決定254 T1〜T8（Full／Short／reduced の時刻 ±50ms・skip 12 経路 **貫通 0**・手札 5→5・GameState 不変・続きからは入口なし） | PASS | 現行 |
| GF | **Ranking【future gate】** | §5 の 10 スロット | Lane 2 の Preflight が GO／GO WITH MOD の場合のみ有効化 | 未実装 |

- 共通：console error 0・HTTP 200／304 のみ（RELEASE_STATUS §Smoke）・配信 JS／CSS md5 ＝ Gate 対象 build（決定246〜254 全件）
- **Gate の順序**：G1 → G4（決定論）→ G10（save）→ G2／G3／G5〜G9（戦闘）→ G11〜G13（進行）→ G14〜G19（表示）。G1／G4／G10 で FAIL したら以降は回さない（決定216 恒久教訓：実 runtime の paired-seed を単独根拠にする）

---

## 3. COMMERCIAL RC EXIT CRITERIA（Commercial RC へ進める条件）

| 条件 | 基準 | 出典（既存） | 判定方法 |
|---|---|---|---|
| P0 blocker | **0** | RELEASE_STATUS「8/31 blocker」運用・決定129 | §4 BLOCKER が 0 |
| P1 blocker | **0** | 同上（P1＝MUST FIX BEFORE RC） | §4 MUST FIX が 0（修正 → 再 Gate → 再 QA の 1 周を経て 0） |
| core deterministic mismatch | **0** | 決定246（paired-seed ダイジェスト一致）・決定253／254 metric lock 154 行 不一致 0 | G4 |
| console error | **0** | 決定246〜254 全 Smoke | G1〜G19 共通 |
| save corruption | **0** | `resumeRunLog` リプレイ検証・saveVersion 9・旧セーブ移行テスト（決定246） | G10 ＋ CEO 実プレイ中に「続きから」が 1 回以上成功 |
| unrecoverable battle | **0** | 決定250 三重安全弁（ended／error／timeout）・決定254 skip 貫通 0・入力ロック永久化は構造的に不可 | G6／G7／G19 ＋ CEO 実プレイで「操作不能」0 |
| input penetration | **0** | 決定254 T3（skip 12 経路・手札 5→5・GameState 不変） | G19 |
| mobile horizontal scroll | **0** | 決定228〜254 全 Gate | G15 |
| Human QA critical NO | **0** | 決定252（Q2／Q3／Q6 NO＝FAIL の運用） | §1-4 の A3・A10 が NO でない |
| Human QA non-critical NO | **MUST FIX 分類の NO が 0・CAN SHIP の NO は §4-3 の上限内** | 決定250 Pilot v1（4/5＝CONDITIONAL FAIL → Root Cause → v2 7/7）の前例 | §4 |
| 権利・台帳 | 配信 asset すべてが `ASSET_RIGHTS_LEDGER.md` に行を持つ（CEO INPUT 欄の UNKNOWN は CEO 判断） | 決定242／243・P15 | docs 照合 |
| Known Issues の明文化 | CAN SHIP／FOLLOW-UP の一覧が Decision に記録され、CEO が承認している | RELEASE_STATUS「Known Non-blockers（CEO 承認済み）」の形式 | docs |

- **新設した基準は 0**。上表はすべて決定197〜254 の Gate で既に用いている数値・運用の集約
- Exit は **CEO の GO**（P11）。AI は「Exit Criteria 充足／未充足」と「未充足の内訳（§4 分類つき）」だけを報告する

---

## 4. ISSUE TRIAGE（CEO 最終プレイで問題が出た場合）

### 4-1. 3 段階【AI 判断】

| 段階 | 定義 | 例 | 扱い |
|---|---|---|---|
| **BLOCKER** | 妥協しない 5 領域（**Primary Fun「解く」・determinism・save・fairness・game-breaking UI**）に触れる問題。North Star が成立しない／同 seed で結果が変わる／セーブが壊れる・消える／同条件で不公平（Daily の seed 不一致・回数超過）／進行不能・入力不能・横スクロールで操作不能 | A3 NO・A10 NO・metric lock 不一致・「続きから」失敗・Daily 4 回目が打てる・カードが押せない・勝利／敗北が出ない | **RC 停止**。Root Cause → 修正 → §2 全 Gate → §1 該当セッション再実施 |
| **MUST FIX BEFORE RC** | 5 領域には触れないが、Commercial Player Loop の 1 段（解けた→もう一回→成長した→次も解きたい→明日も来たい）を **止める**問題。§1-4 で「MUST FIX」既定の設問が NO | A1／A2／A4〜A7／A11／A13／A15 の NO・必殺が怖くない・託宣が余る／足りない・Retry の導線が見つからない | 修正 → 影響範囲の Gate のみ再実行（Fast Gate・決定247 の形）→ 該当設問だけ再 QA。**1 問につき再 QA は 1 回**（決定250 の v1→v2 と同じ） |
| **CAN SHIP / FOLLOW-UP** | Loop を止めない問題。見た目の好み・演出の強弱・音の質感・Known Issue の再確認・将来 asset で解くもの | A8／A9／A12／A14／A16 の NO・敵アートの平面感・Voice がない・Home が静止・6 神の静止カットイン・D254 Known #5・才華×魔獣 outlier | Decision に **Known Issue** として記録し RC へ進む。次の Phase の候補にする |

### 4-2. 分類の手順（1 件ずつ・5 分以内）
1. **再現**：同 seed（結果画面の seed 表示）で AI が再現する。NOT REPRODUCED に guess fix はしない（P11）
2. **5 領域テスト**：解く／determinism／save／fairness／game-breaking UI のどれかに触れるか → YES なら BLOCKER
3. **Loop テスト**：どの段を止めるか → 止めるなら MUST FIX、止めないなら CAN SHIP
4. **既定分類の上書き**：§1-4 の既定分類は出発点。CEO の自由記述に「遊ぶのをやめたくなった」が含まれる問題は 1 段階上げる
5. **記録**：`docs/evidence/final-practical-qa/triage.md` に 1 行（設問／再現 seed／分類／根拠／対応）

### 4-3. 見た目の好みで RC を無限延期しない仕組み【AI 判断】
- **CAN SHIP の上限**：RC 1 回につき、見た目・音の「好み」由来の修正は **最大 1 件**だけ MUST FIX へ昇格できる（CEO が選ぶ）。残りは Known Issue として記録し、次の Phase で扱う（決定224「Do not expand unless CEO says so」・PREMIUM_PHASE_JUDGMENT「code/CSS Premium phase closed」の運用と同じ）
- **再 QA の回数**：MUST FIX の再 QA は 1 問 1 回。2 回目も NO なら「設計の問題」として Preflight に戻し、RC はその項目を Known Issue にして進めるか止めるかを CEO が決める（§6-4 形式で推奨 1 案を添える）
- **asset 由来は RC の外**：敵アート・Voice・新規音源は生成・権利・費用が CEO 判断（§6-3 #5／#6）のため、RC Exit の条件に **含めない**（Lane 3 の次候補として別レーン）
- **妥協しない側の明文化**：5 領域の問題は件数・工数に関係なく BLOCKER。上限の対象外

---

## 5. RANKING FUTURE SLOT【future gate・Lane 2 の結論待ち】

Ranking の仕様（何を競うか・サーバー・匿名性・同点・リセット）は `docs/RANKING_INTEGRATION_PREFLIGHT.md`（Lane 2）に委ねる。本書は **最終 QA に Ranking が入った場合の検証スロット 10 件**だけを予約する。Lane 2 が NO-GO の場合、本節は空のまま残す。

| slot | 検証内容 | 自動 Gate か Human QA か | 既存の手がかり【docs】 |
|---|---|---|---|
| R1 | score submission：勝利／敗北／未撃破のそれぞれで送信が 1 回だけ行われる・送信失敗時に進行が止まらない | 自動 | RANKING_V1_AUDIT B1（`flushPendingRuns` 未呼出） |
| R2 | same Seed fairness：同日の全プレイヤーが同 seed・同敵・同ルールで戦っている（Daily の seed 生成が端末時計に依存しない） | 自動 ＋ CEO が 2 端末で同一 seed を確認 | RELEASE_STATUS Known 6（端末時計／localStorage 依存） |
| R3 | duplicate submission：同一 run の二重送信・再送が順位を増やさない | 自動 | RANKING_V1_AUDIT |
| R4 | retry：同 seed Retry のスコアが「3 回のうちのベスト」として扱われる（P6） | 自動 ＋ Human | DAILY-01 best-of-3 |
| R5 | Daily：JST 00:00 の切り替えで前日の run が当日に混ざらない | 自動 | `rules.ts daily.timezoneOffsetMinutes` |
| R6 | ties：同点同順位（1,1,3）・先着は無関係・同点圧縮率を記録 | 自動 | RANKING_V1_AUDIT・決定244 §9 |
| R7 | reset：リセット周期の前後で表示と保存が一致する | 自動 | Lane 2 |
| R8 | offline／error：オフライン・5xx・timeout でも戦闘と結果画面が成立し、送信は後送または破棄が明示される | 自動 ＋ Human（機内モード） | 決定250 の fallback 設計と同じ思想 |
| R9 | mobile：順位表が SP 390×844 で横スクロール 0・44px タップ | 自動 | G15 |
| R10 | abuse resistance：リプレイ改ざん・solver・複数アカウントへの耐性（サーバー検証・WAF） | 自動（改ざん検出テスト）＋ docs | RANKING_V1_AUDIT B2〜B4 |

- Ranking が入る場合の Human QA 設問（予約）：「順位を見て明日も遊びたくなったか」「自分の順位の理由が分かったか」「不公平だと感じた瞬間があったか（critical）」

---

## 6. 実施スケジュールの前提（決めない・条件だけ）
- 最終実践 QA は「全ゲーム改善完了後」。本書時点で未完了の候補：決定255 Solution Diversity（Lane 1 NEXT NOW）・Lane 3 の presentation 次候補・Lane 2 の Ranking 判定。**どれを「完了」に含めるかは CEO が決める**（§6-3 #1 ではないが Phase 開始前確認 §6-5 に準ずる）
- 最終実践 QA の対象 build は、その時点の Production（新規 deployment なし）。Gate は RC worktree で同 commit を再 build し md5 一致を確認する（決定246〜254 と同じ）

## 7. 実装しなかったこと・runtime 変更 0 の証明
- runtime／src／Production／asset／音声：変更 0。simulation・Playwright・Chrome・vitest：実行 0。画像・音声生成・H3／fal.ai：0
- Lane 2／3 worktree：未接触。`docs/DECISIONS.md`：本書からは追記しない（3-Lane 統合担当が後で編集）
- 証明：worktree `SevenGodsGame-d254-rc`（branch `docs/lane1-post-d254-practical-qa-reaudit`）で `git status --porcelain` が本書 1 ファイルのみ・`git diff --stat -- src public` 0（§7 実行ログ）

### §7 実行ログ
- 実行：2026-10-02（worktree `C:/Users/kimi1/SevenGodsGame-d254-rc`・branch `docs/lane1-post-d254-practical-qa-reaudit`・親 commit `eaaab9c`）
- `git status --porcelain`：`?? docs/FINAL_PRACTICAL_QA_COMMERCIAL_RC_PREFLIGHT.md` の 1 行のみ／`git diff --stat -- src public`：0 行
- simulation・Playwright・Chrome・vitest・画像／音声生成・H3／fal.ai：実行 0。Lane 2／3 worktree・`docs/DECISIONS.md`：未接触
- merge／push／deploy／Production 変更：0

## 8. Deliverables
1. 本書 `docs/FINAL_PRACTICAL_QA_COMMERCIAL_RC_PREFLIGHT.md`
2. `docs/evidence/final-practical-qa-preflight/`：作成しない（本書の根拠はすべて既存 docs／evidence への参照であり、新規計測 0。実施時に `docs/evidence/final-practical-qa/` を作る）
