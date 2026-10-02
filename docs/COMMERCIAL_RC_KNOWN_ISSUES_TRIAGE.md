# Commercial RC — Known Issues 統合と Triage 事前確定（Final Practical QA v2 の判断テンプレート）

- 日付：2026-10-02
- 種別：**docs-only**（ブラウザ・Playwright・vitest・build・simulation・server・runtime／src／public 変更・Production 操作・生成・外部サービス・push・`docs/DECISIONS.md` 編集：すべて 0。M3 Regression Gate とは分離して作成）
- 判断主体：AI チーム（CLAUDE.md §6-2「QA 方式」）。**Commercial RC の GO／HOLD は CEO**。本書は GO／HOLD を記入しない
- Baseline：master `3b8d739`（docs）／runtime `538a3ef`（決定257 LIVE・Vercel `6809771068`・rollback `6795279150`）
- 参照：決定246〜257 の各 Known（`docs/DECISIONS.md`）／`POST_D257_REMAINING_WORK_AUDIT.md`／`FINAL_PRACTICAL_QA_V2.md`／`FINAL_PRACTICAL_QA_COMMERCIAL_RC_PREFLIGHT.md` §3〜§4／`RELEASE_STATUS.md` Known Non-blockers 1〜16／`ASSET_RIGHTS_LEDGER.md`／`SEVENGODS_NEXT_MILESTONES.md` cleanup scope。決定259 は PARTIAL としてのみ扱う（未検証部分は書かない）
- 原則：新しい改善点は探さない。既知問題を **重複除去**して仮分類し、M3 の結果が要るものは「**M3 判定待ち**」と明記（PASS を先取りしない）
- 表記：【docs】＝既存記録／【AI 判断】＝本書の仮分類

---

## 0. 結論（先に）

| 項目 | 内容 |
|---|---|
| 既知問題の総数 | **31 件**（重複除去後）。A BLOCKER **0**（仮・M3 判定待ち 6 件を除く）／B MUST FIX BEFORE RC **2**（いずれも「対応＝記録・確認」で runtime 変更なし）／C CAN SHIP・FOLLOW-UP **17**／D DEFERRED・BLOCKED **12** |
| M3 判定待ち | 6 件（determinism・save・Daily・mobile 表示・音・Entry の各 Gate。§2 の「M3」列） |
| RC 判断ルール（§3） | BLOCKER／MUST に上げるのは「解く」不成立・determinism 破壊・save 破損・fairness 重大・進行不能・入力不能・重大なモバイル崩れ・重大な音声障害・再現性の高いクラッシュ **のみ**。見た目・追加演出・将来機能は C か D |
| 判断テンプレート | §5（Final Practical QA v2 の直後に AI が埋め、CEO が GO／HOLD を記入） |

---

## 1. RC 判断ルール（固定・Final QA 中に変えない）

| 上げる条件（A／B） | 上げない条件（C／D） |
|---|---|
| Primary Fun「解く」が成立しない（Q2 NO：予告を読んでも手が変わらない） | 見た目の好み・演出の強弱・音の質感 |
| determinism 破壊（同 seed・同手順で結果／保存 GameState が変わる） | 追加演出・新機能の思いつき |
| save 破損（「続きから」失敗・進行の消失・未知 ID で例外） | asset 側で解くもの（敵アート・Voice・画風統一） |
| competitive fairness の重大問題（Daily の seed 不一致・4 回目が打てる・時間が評価される） | Ranking（READY-DORMANT・未実装） |
| 進行不能・入力不能（操作ロック永久化・ボタンが押せない・勝敗が出ない） | 神階上位の局所 outlier（決定58／DAILY-01 の「≥50% 方策」を満たす範囲） |
| 重大なモバイル表示崩れ（横スクロールで操作不能・重要 UI が画面外） | 軽微な省略・ellipsis・余白 |
| 重大な音声障害（無音のまま戻らない・二重再生が止まらない・爆音） | iPhone の BGM 音量差・経路切替の一瞬 |
| 再現性の高いクラッシュ（console error を伴う画面停止） | headless 由来の外れ値・計測側の揺らぎ |

- A と B の違い：A＝上記のうち「解く」「determinism」「save」「fairness」「game-breaking UI」に触れるもの（RC 停止・全 Gate 再実行）。B＝それ以外で Loop の 1 段を止めるもの（修正 → 影響範囲の Gate → 該当 Q を 1 回だけ再 QA）
- C の昇格は **RC 1 回につき 1 件**（CEO が選ぶ）。D は RC の条件に含めない

---

## 2. Known Issues 統合表（重複除去・31 件）

凡例：分類＝A BLOCKER／B MUST FIX BEFORE RC／C CAN SHIP・FOLLOW-UP／D DEFERRED・BLOCKED。M3＝M3 Regression Gate の判定で確定する項目（PASS を先取りしない）

### 2-1. CEO 指定の整理対象

| # | 既知問題 | 出典【docs】 | 事実 | 仮分類【AI 判断】 | 根拠・条件 |
|---|---|---|---|---|---|
| K01 | D254 Known #5：main thread が重いと入口の JS 予約（SE・操作開放・消滅）が最大 ≈230ms 遅れる（映像は時刻どおり・入力ロック維持） | 決定254 Release | 改善候補＝`performance.now()` 基準 1 行。CEO 指示で「修正しない」 | **C**（M3 G19 で Entry 時刻 ±50ms が PASS なら C 確定。FAIL なら B） | 進行不能・入力不能ではない。**M3 判定待ち（G19）** |
| K02 | D257：iOS で AudioContext が割り込まれた（着信・バックグラウンド）後に BGM が再開するか未確認 | 決定257 §7／§10 Known | 設計＝次の SE か `playTrack` で再開。実機未確認 | **B（確認のみ）** → Final QA v2 Session 3（iPhone）で「割り込み後に音が戻るか」を 1 回確認。戻らなければ B の修正対象、戻れば C | 「無音のまま戻らない」は重大な音声障害に該当し得るため確認を RC 前の必須に置く（runtime 変更は結果次第） |
| K03 | D257：初回 duck の瞬間に BGM の出力経路が 1 回切り替わる（HTMLAudio→WebAudio GainNode） | 決定257 §7 | duck の音量低下と同時で目立たない想定。Human QA 4/4 で指摘なし | **C** | 設計どおり・CEO Q4 YES |
| K04 | iPhone では `HTMLMediaElement.volume` が無視され BGM が 1.0 で鳴る。duck は 1.0→0.343 | 決定244 §8・決定257 §7 | 既知のプラットフォーム制約。SE との音量比（R5）は Human QA で許容 | **C** | 爆音・無音ではない。Session 3 の §5「音量」で再確認 |
| K05 | God／Enemy facing の残り：笑蓮は右向き（Kit 正典）・才華の keyvisual は戦闘絵と鏡像・敵カットイン（`BattleEnemyCutin.tsx:64`）と入口は原画の向き（左向き 4 体が必殺で神に背） | 決定244 §4・決定247・Lane 3 | HUD の向きは PC／SP とも解消（決定247・229） | **C** | 対峙感は決定254 Q2 YES。CSS 単独反転は v2 art で逆転するため Brief v1.1 と同時（D 寄り） |
| K06 | Home が静止（`setup.css` keyframes 0） | 決定244 §7・決定254 Preflight C1 保留 | 入口の儀式は決定254 で CLOSED | **D** | Loop 寄与最小（Lane 3）。RC 条件にしない |
| K07 | Enemy Art unity：敵 7 体が 4 画風・high-key 0.08〜0.21・接地 0・Brief v1 MUST E2／E4／E5／E6／E7 FAIL | Brief v1・Lane 3・Remaining Work Audit | 生成・権利・費用＝CEO §6-3 #5／#6 | **D（BLOCKED／NEEDS CEO）** | asset 側。Brief v1.1 は PARALLEL PREP |
| K08 | God Strike Voice なし（SeName に voice 0） | 決定244 §8・Lane 3・CEO 保留 | 決定257 の duck 経路が受け皿 | **D（BLOCKED／NEEDS CEO）** | 権利・生成方式・費用 |
| K09 | Oracle SP：長い札名は ellipsis・導き候補複数は先頭 1 枚・神力満タン時は fallback 表示 | 決定253 Known | Human QA 3/3 YES・Smoke 14/14 | **C** | 情報は役割語と短形で担保。Final QA §5「文字」で再確認 |
| K10 | 未知 `otomo.defId` の guard が無い（保存データに存在しない OTOMO id が入った場合の耐性。決定191／192 の enemyId 耐性と同型） | NEXT_MILESTONES cleanup ①・決定191 | 現状の save v9 で発生経路は無い（OTOMO は 7 体固定・id 変更なし） | **C（M3 G10 で save／resume スイート PASS なら C。例外が出れば A）** | save 破損に該当し得るが、再現経路が無い。**M3 判定待ち（G10）** |
| K11 | Daily 神間 spread 13.82%（G1 ≤5% FAIL）・決定259 PARTIAL（才華 3 段 AP 機関／寿楽・福永 tempo 段差・候補 24 案 未検証） | 決定256・259 | same-seed fairness は PASS・G2 PASS。Ranking 未実装のため順位は存在しない | **D** | 「fairness 重大」には当たらない（同じ問題を同じ条件で解く保証は成立）。Ranking TRIGGER と RAM 枠が揃ってから |
| K12 | Ranking READY-DORMANT（Security Blocker B1〜B4 未修正・TRIGGER 未到達・解除条件 D1〜D7） | 決定256 | Production に Ranking コードの送信先 0・kill switch false | **D** | RC の条件に含めない（Final QA v2 でも評価しない） |
| K13 | Asset Rights Ledger の UNKNOWN 残：C3「過去の Temporary chat 使用有無」UNKNOWN・2026-08 当時のプラン UNKNOWN・Model-Service プラン欄 UNKNOWN の既存行・CARD-NEXT-01 の生成時刻／添付ファイル名（CEO 入力待ち） | 決定242・243・台帳 §1-2／§2-1 | 新規 SE 2 本は SE-02 として ◎ 記入済み（M2） | **B（記録のみ・CEO INPUT）** | Exit Criteria「配信 asset すべてに台帳行」は満たす。UNKNOWN 欄の確定は **CEO の記入**（§6-3 #5）。runtime 変更 0 |
| K14 | worktree／docs hygiene：worktree 59 本・main worktree `feat/d224` に決定213 runtime と未 commit 差分・決定210／211 番号未記録（NEEDS REVIEW）・`python` は Store スタブ・RAM 6GB で Gate が OOM 停止 3 回 | Remaining Work Audit S4・NEXT_MILESTONES | Regression Gate を clean 環境で回すための衛生 | **C（SHOULD）** | 進行・save に無関係。削除は CEO 確認（一覧提示まで AI） |

### 2-2. 決定246〜257 の Known（上記以外）

| # | 既知問題 | 出典【docs】 | 仮分類 | 根拠 |
|---|---|---|---|---|
| K15 | hard reader 96.3／Daily reader 90.9・未撃破 9.0%（上限 bot でも負けない／詰む） | 決定245・246・Lane 1 | **C** | 決定245 で意図的未達と受容。決定58／DAILY-01 違反 0 |
| K16 | 才華×双牙の魔獣：Ⅵ 45／Ⅶ猛威・巨躯・静寂 26.7% | 決定252・Lane 1 K2 | **D** | CEO 指示「局所修正を先行しない」。神階上位の局所 outlier |
| K17 | 蒼毘×銀甲の機工師：Daily 35／hard 65／Ⅴ 66.7% | 決定245・246 Known | **D** | 同上（Daily セル 1 つが <50% だが他方策で ≥50%＝DAILY-01 違反 0） |
| K18 | Ⅶ巨躯 未撃破 28.9%・神階Ⅰ〜Ⅳ naive +9〜11pt・Ⅴ naive≥60% セル 12 | 決定251 Known | **C** | 設計範囲・監視 |
| K19 | 道化 hard は無防御なら R3 狂宴 280 で致死 | 決定252 Known | **C** | 予兆→加護で解ける設計・Human QA Q2 YES |
| K20 | 鬼将の God Strike 率 61→56％ | 決定252 Known | **C** | 監視のみ |
| K21 | 人間の導き使用率は未観測（reader 方策は構造上 0%・oracleAware 43%） | 決定253 Known | **C（観測）** | Final QA v2 Q4 で観測 |
| K22 | 決定249：OTOMO の反応は SP で小さい（設計）・DEAL はラウンド開始ドローに付けない・ロック計測 harness の外れ値 | 決定249 Known | **C** | 設計どおり |
| K23 | 決定250：dropped frames 2/33・発光中の色変化（許容）・他 6 神は静止カットイン | 決定250 Known | **C** | Human QA 7/7 |
| K24 | 決定254：headless（GPU なし）の >33ms 外れ値・SP DPR3 の 1.17 倍拡大・SP ≤700px は START 省略 | 決定254 Known | **C（M3 G15 で SP 横スクロール 0・>33ms 最大 <8 が PASS なら C）** | **M3 判定待ち（G15）** |
| K25 | 決定257：神の一撃の時期はプレイ次第（自動手順では R6〜7）・入力ロックは中央値判定・ジングル前の停止は即時（フェードは再開側 400ms のみ） | 決定257 Known | **C** | 重大な音声障害ではない。S2 RETURN TO CALM の対象（NEXT AFTER） |
| K26 | 決定246：旧セーブは残り託宣回数ぶん使える（gameVersion 変更時の進行中 save は次ラウンドから新表） | 決定246・252 Known | **C（M3 G10 の旧セーブ移行テスト PASS が前提）** | **M3 判定待ち（G10）** |

### 2-3. RELEASE_STATUS Known Non-blockers（8/31 時点・CEO 承認済み・現状確認）

| # | 既知問題 | 現状 | 仮分類 |
|---|---|---|---|
| K27 | Mobile Auto Focus の smooth scroll が目標手前で停止・scroll anchoring 差 50〜80px（1・4） | 決定228／229 の SP 舞台レイヤー後も報告なし | **C（M3 G15 で横スクロール 0 が条件）** **M3 判定待ち** |
| K28 | 乱舞の道化の紅背景で浮遊ダメージ数字のコントラスト低め（2） | 決定240／252 で名札・予告側は改善。数字は未変更 | **C** |
| K29 | Enemy Select cold load 1〜3 秒・701〜899px Battle 縦スクロール・375px 難易度画面 899px（3・5・8） | 未変更 | **C** |
| K30 | Daily Phase 1 の端末時計／localStorage 依存・挑戦状の真正性は自己申告（6・9） | 決定256 で Ranking 側はサーバー時刻設計。Daily 本体は現状のまま | **D**（Ranking と連動） |
| K31 | 寿楽の一強（7）・共通カードの差別化 UNRESOLVED RISK（13）・大耀／寿楽の神技評価偏り（14・15）・SE は数式合成（10）・Boss Entrance 中もカードは押せる（11）・Gate 3 WAIVED（12）・`balanceSim` STAKE-01 timeout 脆弱性（16） | 7 は決定259 で「tempo 段差」として再定義（PARTIAL）／10 は決定257 で rise 2 本を追加（合成のまま）／11 は決定254 の skip 設計で意図どおり／16 は vitest 単独実行で回避 | **C**（7・13 は D 寄り） |

---

## 3. 分類の集計（仮・M3 前）

| 分類 | 件数 | 内訳 |
|---|---|---|
| A BLOCKER | **0**（仮） | M3 判定待ちで A に転じ得るもの：K10（save）・K26（旧セーブ） |
| B MUST FIX BEFORE RC | **2** | K02（iOS 割り込み後の BGM 再開を Session 3 で確認）・K13（台帳 UNKNOWN の CEO 記入）。いずれも runtime 変更なしの「確認・記録」 |
| C CAN SHIP／FOLLOW-UP | **17** | K01・K03・K04・K05・K09・K10・K14・K15・K18〜K29・K31（M3 判定待ち：K01・K10・K24・K26・K27） |
| D DEFERRED／BLOCKED | **12** | K06・K07・K08・K11・K12・K16・K17・K30・（K31 の 7・13） |

M3 判定待ち：**6 件**（K01 G19・K10 G10・K24 G15・K26 G10・K27 G15・共通 console error 0）。M3 で FAIL が出た場合は §1 のルールで A／B に上げ、§5 に記入する。

---

## 4. Final Practical QA v2 で新しい問題が出た場合の手順（事前確定）

1. **再現**：結果画面の seed 表示を使って AI が同 seed で再現（1 browser／1 run）。NOT REPRODUCED に guess fix はしない
2. **§1 のルールで A／B／C／D**：5 領域（解く・determinism・save・fairness・game-breaking UI）に触れれば A、Loop の 1 段を止めれば B、それ以外は C か D
3. **既定分類の上書き**：Final QA v2 §6 の各 Q の既定（Q2／Q7 NO＝A、Q1／Q3／Q4／Q5／Q8／Q9 NO＝B、Q6／Q10 NO＝C）を出発点にし、CEO の「遊ぶのをやめたくなった」発言があれば 1 段階上げる
4. **記録**：`docs/evidence/final-practical-qa-v2/triage.md` に 1 行（設問／再現 seed／分類／根拠／対応）
5. **C の昇格上限**：RC 1 回につき 1 件（CEO が選ぶ）。D は RC の条件にしない
6. **決定255 の保護**：Normal で「盾＋加護で解けた」こと自体は問題にしない。Q3 NO は表示・導線の問題として扱い、カード数値は変えない
7. **決定259 の保護**：Daily の神間差を Final QA の所見だけで B に上げない（PARTIAL の未検証を補完しない）

---

## 5. Final Practical QA v2 後の判断テンプレート（AI が埋め、CEO が GO／HOLD を記入）

```
【COMMERCIAL RC DECISION — Final Practical QA v2 後】
対象：Production <sha>／runtime <sha>／Vercel <deployment id>
M3 Regression Gate：PASS <n>/19・FAIL <m>・未計測 <k>（GF Ranking＝future gate）
Final QA v2：Session 1 <日付・端末>／Session 2 <日付・端末>／Session 3 <日付・端末>
一番気になったこと（CEO の言葉）：
Q1〜Q10：Q1 _ Q2 _ Q3 _ Q4 _ Q5 _ Q6 _ Q7 _ Q8 _ Q9 _ Q10 _（critical＝Q2・Q7）

BLOCKER:
  （件数 0 が RC 条件。1 件でもあれば RC 停止・Root Cause → 修正 → 全 Gate → 該当 Session 再実施）
MUST FIX:
  （件数 0 が RC 条件。修正 → 影響範囲の Gate → 該当 Q を 1 回だけ再 QA）
CAN SHIP:
  （Known Issue として記録。昇格は RC 1 回につき 1 件・CEO が選ぶ）
DEFER:
  （RC の条件に含めない：Home 動き／敵アート／Voice／Ranking／決定259 残り／神階局所 outlier）

Exit Criteria（v1 §3）：P0 0 _／P1 0 _／deterministic mismatch 0 _／console error 0 _／save corruption 0 _／unrecoverable battle 0 _／input penetration 0 _／mobile 横スクロール 0 _／Human QA critical NO 0 _／台帳 _／Known Issues 承認 _
COMMERCIAL RC EXIT: GO / HOLD   ← CEO が記入（本書では未記入）
HOLD の場合の再開条件：
```

---

## 6. 実装しなかったこと・runtime 変更 0 の証明
- 本書は既知問題の統合と手順の事前確定のみ。runtime・src・public・Production・決定259 simulation・生成・外部サービス・push・`docs/DECISIONS.md`：すべて 0。M3 Regression Gate（別 worktree `SevenGodsGame-rcgate`）には触れていない
- worktree `C:/Users/kimi1/SevenGodsGame-rwa`・branch `docs/rc-pregate-m2-ledger`（`3b8d739` 起点・M2 の commit `593f33d` の上）：`git status --porcelain` は本書 1 ファイルのみ・`git diff --stat 3b8d739 -- src public package.json` 0（§6 実行ログ）

### §6 実行ログ
- 実行：2026-10-02（worktree `C:/Users/kimi1/SevenGodsGame-rwa`・branch `docs/rc-pregate-m2-ledger`・親 `593f33d`・base `3b8d739`）
- `git status --porcelain`：`?? docs/COMMERCIAL_RC_KNOWN_ISSUES_TRIAGE.md` の 1 行のみ／`git diff --stat 3b8d739 -- src public package.json`：0 行
- ブラウザ・vitest・build・simulation・server・生成・外部サービス・push・DECISIONS 編集・M3 worktree：0
