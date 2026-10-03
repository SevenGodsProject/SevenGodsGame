# Final Practical QA v2 — Closeout（Session 1〜3 COMPLETE）と Commercial RC Triage

- 日付：2026-10-03
- 種別：**docs-only**（runtime・src・CSS・画像・音声・simulation・Production：変更 0。CEO 実プレイの結果を evidence 化し、最終 Triage と RC 判定を行う）
- 判断主体：Triage と RC 判定の推奨は **AI 判断**（CLAUDE.md §6-2）。Commercial RC の GO は **CEO**（P11）
- Production 基準：master = origin/master **`cce3bb4`**／runtime **`8cba184`**（決定261「対峙構図 v2」LIVE／CLOSED）／Vercel deployment **`6820829725`**。Final QA 中（Session 1〜3）に runtime を変えた commit は **0**（`git log 8cba184..origin/master -- src public package.json`＝0。以後の deployment `6820889748`／`6821509323` は docs-only）。配信 bundle `index-BRcv8Oau.js`／`index-BE9_YcYs.css`【実測】
- 決定255（Solution Diversity NO-GO）・257（Sound Layer v1 LIVE）・260（AP Flattening NO-GO）・261（対峙構図 v2 LIVE）：CLOSED
- 手順書：`docs/FINAL_PRACTICAL_QA_V2.md`／基準：`docs/FINAL_PRACTICAL_QA_COMMERCIAL_RC_PREFLIGHT.md` §2〜§4・`docs/COMMERCIAL_RC_KNOWN_ISSUES_TRIAGE.md`／Pre-Gate：`docs/COMMERCIAL_RC_PREGATE.md`（G1〜G19 PASS 17／FAIL 2 既知）
- 表記：【CEO】＝CEO の言葉・回答／【実測】／【docs】／【AI 判断】

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| Session 1〜3 | **COMPLETE → 正式 CLOSED（CEO・2026-10-03）**（S1 6/6 YES・S2 5/6 YES（Q2 NO）・S3 Daily 実施・自由所感 3 件）。evidence：`docs/evidence/final-practical-qa-v2/session-1.md`（S1・S2）・`session-3.md` |
| Primary Fun「解く」 | **成立**【CEO】S1 Q2「予告で行動を変えた」YES／S2 Q1 YES／S2 Q3 託宣の使い分け YES／S2 Q6 危険・敗北理由を理解 YES。critical（Q2 意図・Q7 敗北理由）に NO なし |
| 残課題（Final QA で新たに／繰り返し指摘） | A カード画像の品質統一（S1）／B カード選択が勝敗に効きにくい（S2 Q2 NO・決定260 NO-GO 後も OPEN）／C 神 vs 敵の相対スケール・ゲージ配置（S3「敵と神の大きさがアンバランス」「ゲージの場所」）／D 戦闘ボイス（S3） |
| Triage | **BLOCKER 0／MUST FIX BEFORE RC 1（K02 の iOS 割り込み後 BGM 再開＝未確認・5 分の Device Check・runtime 変更なし）／CAN SHIP 3（C・K01・OTOMO 面積ほか）／POST-RC 3（A・B・D）**（§3） |
| **COMMERCIAL RC** | **GO【CEO 決定・2026-10-03】**（§7。K02 Device Check PASS・Known Issues 承認済み・RC 基準 runtime `8cba184` 固定）。AI 推奨時の記述＝条件＝RC 前に K02 Device Check（5 分）と Known Issues 一覧の CEO 承認。A〜D は RC 後改善ロードマップへ（§5）。CEO が「RC 1 回につき 1 件」の昇格枠を使うなら C（Composition v3-lite：神／敵の相対 scale 正規化・CSS のみ）を推奨 |

---

## 1. Session 別結果【CEO】

### Session 1（初見に近い 1 戦・PC・2026-10-02）
- 所感：「対戦画面がかなりかっこよくなった。特に必殺技のカットインがいい。あとはカードの画像の質を揃えたいのと敵が左をむいているのを直したい。」
- Q1 戦闘は楽しいか **YES**／Q2 予告で行動を変えたか **YES**／Q3 敵の必殺は危険に感じたか **YES**／Q4 託宣のタイミングを考えたか **YES**／Q5 神の一撃は気持ちいいか **YES**／Q6 もう 1 戦したいか **YES**＝**6/6**
- 「敵が左を向いている」→ 決定261 F-1（必殺カットインの反転）＋入口／HUD の整理で対応（Human QA Q1 YES）。「カードの画像の質を揃えたい」→ A（§3）

### Session 2（別の神 × 別の敵・2026-10-02）
- 所感：「敵と神の大きさがカードより小さく感じる。OTOMO をもう少し小さくして敵と神の画像を大きくして戦っている臨場感を出せたら最高」
- Q1 予告で行動を変えたか **YES**／**Q2 手札によって今回はどう戦おうと考えたか NO**／Q3 託宣を使う／温存の判断 **YES**／Q4 敵の必殺を別の脅威として感じたか **YES**／Q5 神・敵による戦い方の違い **YES**／Q6 危険・敗北理由を理解したか **YES**＝**5/6**
- Q2 NO → Hand Decision Density Audit（14,700 試合：randomRO 99.6％＝reader 99.6％・Root Cause＝AP 逓増が手札総コストを R4 以降に追い越す）→ 決定260 AP Flattening Preflight（637,000 試合）＝**NO-GO**（通常で randomRO − reader は −0.3〜−2.9pt・価値が戻る面は難化の副作用）。**「カード選択が勝敗に効きにくい」観察は消えていない＝B として OPEN**
- 所感 → 決定261「対峙構図 v2」（Fast Gate G1〜G11 PASS・Human QA 4/4・PRODUCTION LIVE）

### Session 3（Daily・2026-10-03）
- 自由プレイでの指摘：
  - A'「敵と神の大きさがアンバランス」（添付画面では神が敵よりかなり大きく見える）→ **C**（God vs Enemy の相対 scale＝決定261 の次段階）
  - B'「ゲージの場所ももう少し考えた方がいいかも」→ **C**（Duel HUD：敵 HP・神 HP・共鳴の帰属の整理）
  - C'「対戦中、音楽のほかに敵や神の声を出せないか。必殺技を出す際や始まるときなど」→ **D**（Battle Voice Layer：Battle Start／Enemy Ultimate／God Strike／Victory・7 神の短いオリジナル台詞・7 敵の台詞／咆哮／機械音・既存人物／声優の模倣は前提にしない・決定257 の duck 経路と統合・未生成・未実装）
- Daily の体験（same-seed・3 回・best-of-3・Ranking UI なし）について進行・公平性・表示の問題の報告なし【CEO 所感に該当なし】
- K02（iOS で AudioContext 割り込み後に BGM が戻るか）：Session 3 の記録に確認の記述 **なし＝未確認**（§3・推測で PASS にしない）

---

## 2. 評価軸ごとの判定（Session 1〜3 ＋ Pre-Gate）

| 軸 | 判定 | 根拠 |
|---|---|---|
| Primary Fun「解く」 | **成立** | S1 Q2・S2 Q1 YES（予告で手を変える）／S2 Q3 託宣判断／S2 Q6 敗因理解。critical NO 0 |
| Combat Tension | **成立** | S1 Q3・S2 Q4 YES（必殺が別の脅威）／決定246〜252 の Human QA／Pre-Gate G2・G8 |
| Intent readability | **成立** | S1 Q2・S2 Q1／Pre-Gate G2 identity 147 行一致 |
| Oracle decision | **成立** | S1 Q4・S2 Q3 YES／Pre-Gate G5 14/14 |
| Enemy Ultimate | **成立** | S1 Q3・S2 Q4 YES／決定252 7/7／Pre-Gate G8 |
| God Strike payoff | **成立** | S1 Q5 YES／決定250 7/7・決定257 4/4／Pre-Gate G6・G7（dropped は既知 K23） |
| Retry／Result | **成立** | S1 Q6 YES／S2 Q6 YES／Pre-Gate G10 「続きから」2/2・G14 |
| Daily | **成立（評価は本体のみ）** | S3 実施・same-seed／3 回／best-of-3・Pre-Gate G11（残 3→2・seed PC／SP 同一）。Ranking UI は未実装のため評価外 |
| PC／iPhone | **成立** | S1・S2 PC・S3 iPhone／Pre-Gate G15・G16（横スクロール 0・箱差 0）／決定261 Human QA Q2 YES（PC／iPhone） |
| Sound | **成立・K02 未確認** | 決定257 4/4／Pre-Gate G18。iOS 割り込み後の再開は未確認（MUST：Device Check） |
| Visual hierarchy | **成立（次段階あり）** | 決定261 Human QA 4/4（カードより敵・神が主役）。S3 で神 vs 敵の相対 scale とゲージ配置の指摘＝C |

---

## 3. 残課題 Triage【AI 判断・基準＝TRIAGE §1】

| # | 項目 | 分類 | 判断 |
|---|---|---|---|
| **A** | Card Art Unity（60 枚の品質・画風・premium 感の統一。決定243「豪快な一撃」v2 と既存 59 枚の差） | **POST-RC** | presentation・asset 側。生成は CEO（§6-3 #5／#6・台帳）。Primary Fun／determinism／fairness に無関係。S1 で 1 回の指摘。Known Issue として記録し RC 後の asset ロードマップ（Enemy Art Brief v1.1 と同じレーン）へ |
| **B** | Card Decision Meaning（カード選択が勝敗に効きにくい） | **POST-RC（OPEN・設計研究）** | 「解く」自体は成立（S1 Q2・S2 Q1 YES）。決定255／260 の 2 回の Preflight で「保護対象（Oracle・敵表・HP・カード数値・AP）を触らずに通常で勝敗上の価値を持たせる数値は無い」と確定。残る lever は presentation（結果画面の「答えの可視化」＝選択の意味はスコア・残 HP・撃破 R に既にある）または設計レベルの見直し（CEO 判断）。MUST にしない理由＝commercial RC として許容不能ではない（Normal は入門面の段階設計） |
| **C** | Battle Composition v3 — Duel HUD（神 vs 敵の相対 scale・HP／名札／ゲージの帰属・「敵 vs 神」の構造） | **CAN SHIP（RC 1 回の昇格枠候補 #1）** | S2 の「カードより小さい」は決定261 で解消（Human QA YES）。S3 の「神が敵より大きい」は決定261 の神＝敵 ×0.9 の箱に対し、**敵原画の余白（機工師 trim 0.48 等）で ink が小さく見える**ことが原因【AI 判断・決定261 Known と一致】。ゲージ配置は決定235（名札）の設計範囲。いずれも進行・読みやすさを壊していない（Q4 YES）。昇格する場合の最小案＝**Composition v3-lite：敵ごとの ink 比で `--artScale` を正規化（CSS のみ）**。ゲージ再配置（Duel HUD）は Preflight が必要＝POST-RC |
| **D** | Battle Voice Layer（Battle Start／Enemy Ultimate／God Strike／Victory・7 神＋7 敵のオリジナル音声） | **POST-RC（NEEDS CEO）** | 権利・生成方式・費用＝CEO（§6-3 #5／#6）。決定257 の duck 経路・新 SeName 階層が受け皿。Lane 3 の Voice 評価（必要・条件付き・今は作らない）を維持。RC の条件にしない |
| K02 | iOS で AudioContext 割り込み後に BGM が再開するか | **MUST FIX BEFORE RC（確認のみ）** | Session 3 に証拠なし＝**未確認**。推測で PASS にしない。**Device Check（5 分・iPhone・runtime 変更なし）**：戦闘中に BGM が鳴っている状態でロック／着信／アプリ切替 → 復帰 → 次のタップ（SE）で BGM が戻るか。戻らなければ B（修正）、戻れば C（Known 削除） |
| K13 | 権利台帳の UNKNOWN（Temporary chat・2026-08 のプラン・生成時刻） | **CAN SHIP（UNKNOWN／unverifiable のまま）** | 証拠のないものは UNKNOWN 維持。CEO に推測入力を求めない。BLOCKER 化しない |
| K01 | 決定254 Known #5（PC 入口の JS 予約 +34〜266ms） | **CAN SHIP** | Pre-Gate G19・決定261 Gate で入力貫通 0・箱差 0 を再確認 |
| K23／K24 | dropped frames（headless）／SP DPR3 | **CAN SHIP** | 実行環境の揺らぎ・既知 |
| 決定261 Known | OTOMO 面積 0.35〜0.39％・SP 660 の神÷カード高 <1.0・PC 間隔 74〜128px・決定241 トーストの一時重なり | **CAN SHIP** | Human QA Q3／Q4 YES |
| K06〜K08・K11・K12・K16・K17・K30 | Home 静止・敵アート・Voice（＝D）・Daily spread／決定259 PARTIAL・Ranking・局所 outlier・Daily 端末時計 | **POST-RC／NEEDS CEO** | TRIAGE §2 のとおり |
| 既に CLOSED | 03 カード反応・06 脅威感・08 時間制限・09 後半の緊張／託宣・12 託宣可読性・13 敵攻撃・14 入口・02 の音（決定257）・01／02 の向きとサイズ（決定261） | — | Final QA で再指摘なし |

**集計**：BLOCKER 0／MUST FIX BEFORE RC 1（K02・確認のみ）／CAN SHIP 3 群（C・K01／K23／K24／決定261 Known・K13）／POST-RC 3（A・B・D）＋既存 D 群。

---

## 4. Commercial RC 判定【AI 判断・CEO 承認待ち】

```
【COMMERCIAL RC DECISION — Final Practical QA v2 後】
対象：Production master cce3bb4／runtime 8cba184／Vercel 6820829725
M3 Regression Gate：PASS 17/19・FAIL 2（G7 dropped＝K23・G19 PC 入口時刻＝K01：既知）・未計測 0（GF Ranking＝future gate）
Final QA v2：Session 1 2026-10-02 PC／Session 2 2026-10-02 PC／Session 3 2026-10-03 Daily（iPhone）
一番気になったこと（CEO の言葉）：S1「カードの画像の質を揃えたい」「敵が左を向いている」／S2「敵と神の大きさがカードより小さい」／S3「敵と神の大きさがアンバランス」「ゲージの場所」「敵や神の声を出せないか」
Q1〜Q10 相当：S1 6/6 YES・S2 5/6 YES（Q2 手札で戦い方を考えた NO）・critical（意図で手を変えた／敗因理解）NO 0

BLOCKER: なし
MUST FIX: K02 iOS 割り込み後の BGM 再開（未確認）→ RC 前に 5 分の Device Check（runtime 変更なし）
CAN SHIP: C Duel HUD／相対 scale（昇格枠候補 #1）・K01・K13（UNKNOWN 維持）・K23／K24・決定261 Known
DEFER / POST-RC: A Card Art Unity・B Card Decision Meaning（設計研究）・D Battle Voice Layer・Home 動き・敵アート・Daily spread（決定259）・Ranking・局所 outlier

Exit Criteria（v1 §3）：P0 0 ✓／P1 0 ✓（K02 は確認のみ）／deterministic mismatch 0 ✓（M3 G4・決定261 G10 154 行）／console error 0 ✓／save corruption 0 ✓（G10・実プレイ）／unrecoverable battle 0 ✓／input penetration 0 ✓／mobile 横スクロール 0 ✓／Human QA critical NO 0 ✓／台帳 ✓（SE-02 記入済み・UNKNOWN は維持）／Known Issues 承認 → CEO
COMMERCIAL RC EXIT: **GO（CEO 決定・2026-10-03。§7）**
GO の条件：K02 Device Check（結果が NO なら MUST の修正へ戻す）・Known Issues 一覧（本書 §3）の CEO 承認
```

- GO の理由【AI 判断】：Primary Fun・Combat Tension・Intent・Oracle・Ultimate・God Strike・Retry／Result・Daily・PC／iPhone・Sound・Visual hierarchy の 11 軸がすべて CEO 実プレイで成立し、BLOCKER／MUST（runtime 修正を要するもの）が 0。残る A〜D は「もっと良くできる」（art 統一・設計研究・次段階の構図・voice）であり、TRIAGE §1 の「単純な polish だけでは MUST にしない」に該当。ただし C は Final QA で 2 セッション連続（S2・S3）で指摘された軸のため、CEO が昇格枠を使うなら最優先候補として明示する
- HOLD にする場合の最小セット：K02 Device Check で BGM が戻らない場合のみ（決定257 の `bgm.ts` 再開経路の修正→Fast Gate→Human QA 1 問）

---

## 5. RC 前に残る作業と POST-RC ロードマップ

### 5-1. RC 前（最小）
1. ~~K02 Device Check~~ → **PASS（CEO・iPhone・2026-10-03）**。evidence `docs/evidence/final-practical-qa-v2/device-check-k02.md`。当初の指示：結果を `docs/evidence/final-practical-qa-v2/device-check-k02.md` に記録
2. ~~Known Issues 一覧（§3）の CEO 承認~~ → **承認済み（CEO・2026-10-03）**（RELEASE_STATUS「Known Non-blockers」の形式で Decision に残す）
3. （任意）CEO が昇格枠を使う場合：**C Composition v3-lite**（敵ごとの `--artScale` 正規化・CSS のみ・Fast Gate 型・Human QA 1 問）

### 5-2. POST-RC 改善ロードマップ（優先順：Primary Fun → Loop → fairness → presentation → cleanup）
| 順 | 項目 | 形 | 依存 |
|---|---|---|---|
| 1 | **B Card Decision Meaning**：（2026-10-03 追記：「答えの可視化」は決定262 NO-GO＝CEO Human QA NO。次＝「開幕の手札読み」Preflight）「答えの可視化」（結果画面に 盾／弱体／回復／一撃 のどれで解いたか・神階で組み合わせが必要になることを 1 行）＋設計レベルの再検討（Oracle／敵表／カードの保護を解く案は CEO 判断） | presentation Preflight → 設計判断 | 決定255／260 の結論 |
| 2 | **C Battle Composition v3 — Duel HUD**：神 vs 敵の相対 scale 正規化（v3-lite）→ HP／名札／共鳴ゲージの帰属を「敵 vs 神」の構図に再配置（Preflight） | CSS → TSX（決定235・240・241 の保護） | 決定261 |
| 3 | **D Battle Voice Layer**：Battle Start／Enemy Ultimate／God Strike／Victory・7 神＋7 敵のオリジナル音声（模倣なし）・決定257 の duck 経路と統合 | 権利・生成方式・費用の CEO 判断 → Preflight → Pilot | 決定257 |
| 4 | **A Card Art Unity**：60 枚の品質統一（決定243 の受入 MUST／TARGET と台帳の手順で 1 枚ずつ） | CEO 生成・台帳・accept-art | 決定242／243 |
| 5 | Enemy Art Brief v1.1 → 敵 7 体（CEO 判断）／Home の動き／Daily spread（決定259 残り）／Ranking（READY-DORMANT・D1〜D7） | 既存 docs のとおり | — |
| 6 | cleanup：worktree prune（約 12 本・CEO 確認）・決定210／211 番号整理・NEXT_MILESTONES の cleanup scope | docs／git | — |

---

## 6. 実装しなかったこと・runtime 変更 0 の証明
- runtime・src・CSS・画像・音声・simulation・Production：0。本書・evidence・既存 2 docs の更新のみ
- worktree `SevenGodsGame-d254-rc`・branch `docs/final-qa-closeout`（`cce3bb4` 起点）：`git status --porcelain` docs 以外 0・`git diff --stat cce3bb4 -- src public package.json` 0（§6 実行ログ）

### §6 実行ログ
- `git diff --stat cce3bb4 -- src public package.json index.html vite.config.ts` → 0 行【実測 2026-10-03】
- `git status --porcelain | grep -v docs/` → 0 件（変更は docs/ のみ）
- `node scripts/release-audit/ranking-absence.mjs` → RESULT: PASS（dist submissionEnabled:!0 = 0）
- `node scripts/release-audit/secret-audit.mjs` → RESULT: PASS（credential-format value 0）
- 変更ファイル：`docs/FINAL_PRACTICAL_QA_CLOSEOUT.md`（新規）・`docs/FINAL_PRACTICAL_QA_V2.md`・`docs/COMMERCIAL_RC_KNOWN_ISSUES_TRIAGE.md`・`docs/DECISIONS.md`（1 行追記）・`docs/evidence/final-practical-qa-v2/session-1.md`・`session-3.md`（新規）

## 7. CEO FINAL DECISION（2026-10-03）【CEO】

- **K02 Device Check：PASS**。手順＝戦闘中 BGM 再生 → iPhone でアプリ切替 → Safari 復帰 → ゲーム操作 → BGM 復帰。CEO「BGM が戻った」。evidence `docs/evidence/final-practical-qa-v2/device-check-k02.md`。K02 は CLOSED
- **Final Practical QA v2：Session 1〜3 COMPLETE → 正式 CLOSED**
- **Known Issues**：§3 の CAN SHIP／POST-RC 項目を既知課題として承認
- **COMMERCIAL RC = GO**（CEO 決定）。**RC 基準＝Production runtime `8cba184`**（決定261 対峙構図 v2・Vercel `6820829725`）を固定。runtime／src／CSS／画像／音声の変更・新規 simulation は行わない
- **POST-RC BACKLOG（消さずに保持）**：Card Decision Meaning（K33）／Battle Composition v3 — Duel HUD（K34）／Battle Voice Layer（K35）／Card Art Unity（K32）／Enemy Art（K07）／Home Motion（K06）／Daily God Spread（K11・決定259 PARTIAL）／Ranking integration（K12・READY-DORMANT）。いずれも RC GO を妨げない・正式な POST-RC 改善ロードマップ（§5-2）として保持
- 確定集計：BLOCKER 0／MUST FIX BEFORE RC 0（K02 PASS）／CAN SHIP（K01・K03〜K05・K09・K10・K13 UNKNOWN 維持・K14・K15・K18〜K29・K31・K34・決定261 Known）／POST-RC（K06〜K08・K11・K12・K16・K17・K30・K32・K33・K35）
