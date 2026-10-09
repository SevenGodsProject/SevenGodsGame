> **状態（2026-10-10・AI 転記・CEO 報告の正式記録）：Practical QA v3 ＋ iPhone 性能 3 問 ＋ 公式ボイス Pilot Q8 ＋ A11y Q9 を CEO が 1 セッションで実施。A＝0／B＝0（CEO evidence）。本書は CEO が回答した設問だけを事実として記録し、報告に含まれない項目を PASS 扱いにしない。runtime 変更 0・merge／push／deploy 0。**

# Practical QA v3 — CEO 実機 QA 結果（正式記録）

- 日付：2026-10-10（CEO 報告受領・AI 転記）。実施者：**CEO 1 名（初心者 0 名）**
- 評価したビルド：本編＝integ master **`021795b`**（preview 4178・LAN `192.168.11.6`）／公式ボイス＝`feat/official-voice-pilot-v1` **`16140c9`**（preview 4173・別 URL・Q8 のみ）。記録時点の master HEAD は `9272592`（`021795b` との差は docs のみ。`git diff --stat 021795b master -- src public index.html package.json vite.config.ts .github`＝0）
- 設問の定義：`docs/PRACTICAL_QA_V3_DESIGN.md` §3・§4／性能 3 問：`docs/SP_PERF_EVIDENCE_V1.md` §4／ボイス Q8：voice-pilot `docs/OFFICIAL_VOICE_PILOT_V1.md` §6／A11y Q9：`docs/A11Y_MINIMUM_PACK_V1.md` §4／実施手順：`docs/PRACTICAL_QA_V3_SESSION_PLAN.md`（branch `feat/legal-credits-screen-v1`）
- 本書が守ること：CEO 評価と初見プレイヤー評価を混ぜない（§2）／A・B・C と別 Gate を設計 §4 の表どおりに分類する（§3）／未確認の権利・CI・Rollback を PASS 扱いしない（§4・§7）／既存 NO-GO（決定263／216／214）を再開しない

---

## 1. 回答（CEO 報告の転記・言い換えなし）

| # | 設問（設計上の問い） | CEO | 報告文（そのまま） | 設計が求めたが報告に無い記録 |
|---|---|---|---|---|
| P1 | Home が 3 秒以内に出た | **YES** | 「Home 3秒以内」 | 機種・iOS 版・cold（履歴消去）の有無 |
| P2 | 入口がカクつかず直後に操作可 | **YES** | 「戦闘開始まで滑らか」 | — |
| P3 | 引っかかり・発熱なし | **YES** | 「戦闘中の遅延・異常発熱なし」 | — |
| Q1 | 勝ち方が分かった | **YES** | 「勝ち方を理解」 | 自由記述 |
| Q2 | 自力で 2 戦目を始めた | **YES** | 「2戦目を遊びたい」 | きっかけ・止まった画面（報告は「遊びたい」＝意欲。CEO が続けて Q6・Q7 の複数戦を実施している事実を UX-01 の evidence として採用） |
| Q3 | 敵の次の行動を自分の言葉で言えた | **YES** | 「Enemy Intentを判断に活用」 | 言った言葉 |
| Q4 | カードを選ぶ基準が言えた | **YES** | 「組み合わせを考えてカード選択」 | 基準の内容 |
| Q5 | 託宣を温存した場面があった／導きを使った | **YES** | 「神託の使用タイミングを判断」 | 温存した R・**導きを使ったか（未記録＝K21「導き」使用率は未観測のまま）** |
| Q6 | 負けた後「もう一度」を押し何を変えたか | **YES** | 「敗北後に戦略を変えて再挑戦」 | 変えた内容・敗北戦の seed |
| Q7 | 構成を変えて勝ち方が変わった | **YES** | 「神・カード構成によって戦い方が変化」 | 変えた構成 |
| Q8 | 公式ボイス (1) 自分の神が目の前にいる (2) 11.8 秒は長すぎない (3) iPhone で BGM が下がりミュートで止まる | **3／3 PASS** | 「公式ボイス3/3 PASS」 | voice §9 補足（「続きから」で鳴らない／入口 skip でも鳴る）の所見 |
| Q9 | HP の数字が一目で読め、pill が邪魔でない | **YES** | 「HP数字が読みやすくpillも邪魔ではない」 | — |
| D1 | 互換 Smoke（Android／別ブラウザ） | **未実施** | 報告なし | 端末名 |
| A | A 事象（進行不能・白画面・保存消失・勝敗不成立・同 seed 不一致） | **報告なし** | 報告に記載なし（「なし」の明示記入は無い） | 再現手順・seed |

共通して未記録：iPhone 機種／iOS 版・PC ブラウザ名・各戦の seed・事実ログ（設計 §5）・所要時間・localStorage 初期化の有無。`docs/evidence/practical-qa-v3/` は作成していない（事実ログ・seed が無いため。本書が evidence の正本）。

## 2. CEO 評価と初見プレイヤー評価の区別

設計 §4 の規則：「同じ設問で CEO YES・初心者 NO のときは初心者側の規則を使う（CEO は熟練者のため、初心者の NO を上書きしない）」。本セッションは CEO 1 名のため、**初見プレイヤー評価は存在しない**。

| 観点 | CEO（熟練・制作者） | 初見プレイヤー（初心者 1〜2 名） | 含意 |
|---|---|---|---|
| Q1〜Q4・Q6（North Star「読む→解く→もう一度」） | 全 YES → **B 発生なし** | **未実施（0 名）** | v1.0 条件「A＝0 かつ B＝0」は **CEO evidence で成立**。初心者の NO は「1 人＝C／2 人以上＝B」だが、**未実施は NO ではなく「未観測」**。OB-05（External Evidence「やってみたけど少し難しい」・原因 UNKNOWN）は**解消していない** |
| Q5・Q7（Support Fun） | 全 YES | — | 設計上 CEO のみの設問。導きの使用有無は未記録 |
| Q8・Q9・P1〜P3 | PASS／YES | — | 別 Gate。初心者評価を要しない |
| 自由感想（一番気になった／一番楽しかった） | 未記録 | — | — |

→ RELEASE_STATUS 生存 Known への**追加候補（v1.0 凍結承認時に CEO が確定）**：「初見プレイヤーの Human evidence 0（Practical QA v3 は CEO のみ実施・OB-05 原因 UNKNOWN のまま）」（分類 C・BACKLOG OB-05／OB-06）。

## 3. A／B／C Gate 判定（設計 §4 の表に当てはめ）

| 分類 | 件数 | 根拠 | v1.0 への扱い |
|---|---|---|---|
| **A** | **0（報告ベース）** | CEO 報告に A 事象の記載なし。ただし「A 事象：なし」の明示記入は無いので「報告なし」と記す | 停止要因なし |
| **B** | **0** | Q1・Q2・Q3・Q4・Q6 が CEO YES（設計 §4：CEO NO で B） | 停止要因なし。Narrow Pilot 起票 0 |
| **C** | **0（新規 Known なし）** | Q5・Q7 も YES | — |
| 別 Gate Q8 | **PASS 3／3** | 撤去（Q8-1 NO）・短縮再 QA（Q8-2 長い）・duck 調整（Q8-3 NO）のいずれにも該当しない | Pilot は**統合候補**（§5）。v1.0 を止めない |
| 別 Gate Q9 | **YES** | pill α0.77 の再調整不要 | A11y Human QA 1 問 **PASS** |
| 別 Gate P1〜P3 | **YES×3** | Known K01（入口 JS 遅れ）の記録更新不要・Enemy Select preload 不要（`SP_PERF_EVIDENCE_V1.md` §5 維持） | DoD #15 成立（§4） |
| 別 Gate D1 | **未実施** | 報告なし | Known「公式対応は iPhone Safari＋PC Chromium（RL-05）」を v1.0 Known に明記 |

**判定：v1.0 条件（A＝0 かつ B＝0）は CEO evidence で成立。** 本書が PASS 扱いにしないもの：初見プレイヤー評価（未実施）／D1（未実施）／A 事象の明示「なし」／端末・seed・自由記述（未記録）／権利・CI・Rollback（本 QA の対象外・§7）。

## 4. DoD（ROADMAP §7）への反映

| DoD | 本 QA 前 | 本 QA 後 | 根拠 |
|---|---|---|---|
| #1 Primary Fun critical 設問 NO 0 | DONE/Prod（維持条件） | **維持**（Q1・Q3 YES） | §1 |
| #14 a11y 基準 全項目 PASS | DONE/master・Human QA 未 | **DONE/master（CEO Human QA Q9 PASS）** | §3 |
| #15 SP 実機 perf evidence 1 セット | PARTIAL（エミュレーションのみ） | **DONE/master（エミュレーション＋実機 3 問 YES）**。機種・iOS 版は未記録のまま | `SP_PERF_EVIDENCE_V1.md` §4-1 |
| #16 2 戦目の壁／託宣温存・導き／別構成 各 1 回 | NOT STARTED | **DONE（CEO 1 回ずつ：Q2／Q5／Q7）**。初心者 0 名 | §1・§2 |
| #17 敵アート／SE／Voice の GO・NO 記録 | NOT STARTED | **Voice：Human QA PASS＝統合 GO 候補（merge は CEO 承認）**。敵アート／SE 実音源：未決（§8 の推奨＝v1.0 は現状のまま。Known K07／K31 の凍結承認に含める） | §5 |
| #6 Legal／Credits 承認文言 | PARTIAL | 変化なし（§6） | — |
| #11 Rollback 演習／#12 CI／#13 push／#10 凍結／#18 tag | 未 | **変化なし（本 QA では確認していない・PASS 扱いしない）** | — |

## 5. 公式ボイス Pilot（大耀「あいさつ」）統合の進捗

| 項目 | 状態（2026-10-10） |
|---|---|
| Human QA | **PASS 3／3**（Q8）。voice §6 の NO 条件（撤去・短縮再 QA・duck 調整）に該当なし |
| 次の段階 | voice §8「CEO Human QA PASS 後に master へ merge（CEO 承認）」＝**統合 READY・CEO 承認待ち**。merge／push／deploy は未実施 |
| 統合前チェック（read-only・実測） | merge-base `6c8b226`／`git merge-tree --write-tree master feat/official-voice-pilot-v1`＝**conflict 0**／branch 差分 11 files（runtime 3＝`BattleScreen.tsx`・`sound.ts`・`feelTier.ts`。master 側は `6c8b226` 以降この 3 ファイルを変更していない＝実測 0）／`docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md` は master と**同一**／`docs/ASSET_RIGHTS_LEDGER.md` は §3-L の追記のみ／`src/core` 0 |
| 統合時に AI がやること | ①branch Gate を現 master 上で再実行（vitest 42・tsc・lint・build・Playwright 4/4）②`--no-ff` merge ③`creditsText.ts` に Draft §2-1 **A-1 の 1 文**（「神と OTOMO の画像、および神の音声は SEVENGODS Games Creator Kit の配布素材をそのまま使用しています（本作で制作した音声はありません）」）を追加（「公式ボイス」の語は使わない＝禁止語テスト維持）④master full Gate ⑤DECISIONS に統合行 |
| 残る所見 | voice §9 補足「入口 skip でも鳴る」は CEO 所見なし → 現状のまま統合し、Known に 1 行（C）。「続きから」では鳴らない（設計どおり） |
| 7 神展開（voice §7） | 条件（Q1 YES・Q2 確定）は成立。**AI 判断：v1.0 では大耀 1 本のまま、7 神は v1.0.x の別 Gate**（理由：6 本追加は Human QA を再度要する・+838KB・v1.0 の Gate を増やさない。権利は Kit §5 で KNOWN） |

## 6. Legal／Credits branch（`feat/legal-credits-screen-v1` `405a86f`）の未確定文言

実装・Fast Gate は PASS（`docs/LEGAL_CREDITS_SCREEN_V1.md` §3）。**画面の文は `src/components/setup/creditsText.ts` だけ**にあり、確定後の差し替えは 1 ファイル。未確定は文言 3 件＋前提 2 件。

| # | 箇所 | 現在の文言 | AI 推奨（CEO が「承認」で確定できる仮確定値） | 推奨の理由 | CEO が NO のとき |
|---|---|---|---|---|---|
| S4 | 生成 AI のサービス名 | 「敵・カード・背景などの一部の画像は、制作者が生成 AI を用いて作成しました。」 | **サービス名は書かない（現状のまま）** | 台帳 §3-C／E／F は UNKNOWN-ACCEPTED。サービス名を書くと規約版の確定表現に近づく（Draft §6 #4） | 「（ChatGPT ほか）」を同じ文に追記 |
| C1 | 問い合わせ先 | 「問い合わせ先は準備中です。」 | **v1.0 は「準備中」のまま公開し、窓口が決まり次第 1 行差し替え** | repo に窓口なし（Draft §5）。窓口の新設は外部サービス登録（§6-3 #6）を伴い得るため v1.0 を止めない | 載せない：ブロック省略＋「本作に関するお問い合わせは SGG 運営へは行わないでください」1 文／載せる：専用メール or フォーム 1 つ（個人連絡先は不可） |
| F3 | 制作者名 | 「制作：SEVENDAO GAMES」 | **維持し、同じ行に「（SGG 運営とは別の個人制作スタジオです）」を添える** | Home／OG 既表示と一致。なりすまし誤認（Kit F6）を文言側で下げる（Draft §6 #7） | 「制作者」とだけ書く |
| 前提 1 | SGG 運営への事前相談 | — | **相談する（公開前に 1 回）。ただし回答待ちで v1.0 を止めない** | タイトルが IP 名と同一（Draft §6 #6）。本作は 2026-08-31 から同タイトルで Production 公開中＝v1.0 は更新であり新規公開ではない | 相談しない：L1〜L2 を太字＋サブタイトル「非公式ファンゲーム」 |
| 前提 2 | 専門家確認の要否 | — | **不要**（断定表現を含まない・禁止語 9 パターンをテストで固定） | Draft §6 #1 | 先に確認：クレジット 2 行＋データ保存ブロックのみ先行表示 |
| A-1 | 公式ボイス統合時 | （未記載） | Voice 統合と同時に §5 の 1 文を追加（CEO 判断不要・事実記載） | sha256 原本＝配信＝MCP 一致 | — |

確定の形：CEO が本表の AI 推奨に「承認」（または行ごとの修正）→ AI が `creditsText.ts` を 1 回更新 → 契約テスト・Playwright 再実行 → branch を master へ merge（CEO 承認）。**本表の文言はいずれも未確定であり、画面には「準備中」を含む現行文のまま出る。**

## 7. Release Gate 残項目（優先度順・2026-10-10・`RELEASE_GATE_REMAINING_V1.md` §A を更新）

| 優先 | # | 項目 | 誰が | DoD | 状態 |
|---|---|---|---|---|---|
| **P0-1** | 1 | Legal 文言 3 件の確定（§6）→ AI：`creditsText.ts` 更新・Gate・branch merge | CEO 確定／AI 実装・merge は CEO 承認 | #6 | 未 |
| **P0-2** | 2 | 公式ボイス Pilot の master 統合（§5）＋ A-1 文追加 | CEO 承認／AI 実行 | #17 | 統合 READY |
| **P0-3** | 3 | CI 初回実行（`ci/first-run-<date>` 1 本の push＋Draft PR・master は押さない・`RELEASE_GATE_REMAINING_V1.md` §C） | CEO 承認／AI 実行 | #12 | 未実行（GREEN とは記録しない） |
| **P0-4** | 4 | RC Gate（決定267 型：clean RC worktree・`ranking-absence.mjs` 17・migration・同 seed）→ **master push＝Production deploy** → Production Smoke → DoD #5 の CEO 目視 | AI Gate／push は CEO | #5・#9・#13 | 未（master は origin より 23 commit 先行） |
| **P0-5** | 5 | Rollback 演習（Vercel Promote 2 回＋AI Smoke→`docs/evidence/release-safety/rollback-drill.md`） | CEO Promote／AI Smoke | #11 | 未実施（PASS 扱いしない） |
| **P0-6** | 6 | v1.0.0 生存 Known 凍結承認（§2 の追加候補・D1 未実施・voice skip・敵アート／SE 現状維持＝K07／K31 を含む）＋ `package.json` 1.0.0 ＋ tag `v1.0.0` ＋ 公開投稿 | CEO 承認・tag・投稿／AI bump・RELEASE_STATUS | #10・#17・#18 | 未 |
| P1 | 7 | TD-01 main repo（`SevenGodsGame` dirty）の patch 救出（push 0・CEO 指示「触らない」解除後） | AI | #13 | 未 |
| P1 | 8 | ROADMAP :67 の Triage 参照先修正・RELEASE_STATUS 生存 Known 再集計案（P0-6 の材料） | AI | #10 | 未 |
| P2（v1.0 後） | 9 | 7 神ボイス展開／初見プレイヤー Human QA（OB-05）／D1 Android Smoke／敵アート・SE 実音源の課金 GO-NO | — | — | v1.0 を止めない |

完了に変わったもの（本 QA）：#14・#15・#16（CEO evidence）・#1 維持。CEO 判断 7 件（`RELEASE_GATE_REMAINING_V1.md` §D）のうち **#5 実機 QA は完了、#6 のうち Voice は Human QA PASS** → 残る CEO 判断は §9 の 4 件。

## 8. 次の最短実行計画（1 つ・AI 推奨）：「RC-2 束ね」

CEO の返信 1 回（§9 の判断 1〜3）を受けて、AI が**同日・直列**で以下を実行し、最後に判断 4 を 1 回だけ求める。

| 順 | 作業 | 実行 | 所要（目安） | Gate |
|---|---|---|---|---|
| 1 | `creditsText.ts` に §6 の確定値を反映 → `creditsScreen.test.ts`・`acceptance.mjs` 再実行 → `feat/legal-credits-screen-v1` を master へ `--no-ff` merge | AI（merge は判断 1 の承認を根拠） | 30 分 | tsc／lint／vitest 13＋full／Playwright 38 |
| 2 | voice branch の Gate を現 master 上で再実行 → `--no-ff` merge → A-1 文追加 → master full Gate | AI（判断 2） | 45 分 | vitest 42＋full／build／Playwright 4 |
| 3 | `ci/first-run-2026-10-10` を master から作成 → push（この 1 本のみ）→ Draft PR → GREEN 確認 → PR close | AI（判断 3） | 10 分＋CI 3〜6 分 | 4 step 緑・run URL |
| 4 | clean RC worktree で決定267 型 Release Gate（`ranking-absence.mjs` 17・migration 10・同 seed・Playwright acceptance）→ 報告 | AI | 30 分 | 全 PASS |
| 5 | **判断 4**（push＝Production・Rollback 演習・凍結・tag）→ push → Vercel deploy → Production Smoke 6 → Rollback 演習（Promote 2 回）→ Known 凍結 → `1.0.0`・tag → DECISIONS LIVE 行 | CEO 操作／AI Smoke・記録 | CEO 30 分＋AI 30 分 | Smoke 全 PASS・rollback 先 id 記録 |

却下した代替案：(a) 文言未確定のまま Credits を merge して先に push → 未確認の文言が Production に出る（CEO 方針違反）／(b) Voice を v1.0 から外して先に push → Q8 PASS の evidence を捨て、公開後に runtime 追加＝Gate 2 回／(c) CI を省略して push → DoD #12 未達・CI は push と同時に初回実行＝RED でも Production 反映済みになる。

## 9. 公開までに本当に必要な CEO 判断（4 件・§6-3 該当のみ）

| # | 判断 | §6-3 | AI 推奨（「承認」で確定） | 延期した場合 |
|---|---|---|---|---|
| 1 | **Legal 文言 3 件（S4／C1／F3）の確定**＋前提 2 件（SGG 相談・専門家確認） | #5 | §6 の推奨値：S4 書かない／C1 準備中のまま／F3 維持＋注記／相談する（回答待ちで止めない）／専門家確認なし | Credits 画面を v1.0 に入れられない（DoD #6 未達） |
| 2 | **公式ボイス Pilot の master 統合**（大耀 1 本・7 神は v1.0 後） | merge は CEO 承認（運用ルール） | 統合する | Q8 PASS の evidence が v1.0 に反映されない |
| 3 | **CI 初回実行**（`ci/first-run-*` 1 本の origin push＋Draft PR。master は押さない。repo の public／private と Vercel Preview 設定を CEO が事前確認） | #8 準備 | 実行する | DoD #12 未達。push と同時の初回実行になり RED でも Production 反映済みになる |
| 4 | **Release 実行**（master push＝Production deploy・Rollback 演習 Promote 2 回・v1.0.0 生存 Known 凍結（初見 evidence 0・D1 未実施・voice skip・敵アート／SE 現状維持）・tag `v1.0.0`・公開投稿） | #8 | 判断 1〜3 と RC Gate 全 PASS の後に 1 回で承認 | 公開されない |

判断 4 は §8 の順 4 の報告を見てから。判断 1〜3 は 1 回の返信で同時に可。

## 10. 本書で変更したもの

docs-only：本書（新規）／`docs/SP_PERF_EVIDENCE_V1.md` §4-1・§5（実機 3 問の結果）／`docs/DECISIONS.md` 決定273（候補）行／`docs/RELEASE_STATUS.md` A-1 進行中・K21／`docs/ROADMAP_TO_RELEASE.md` §9 更新（5）。branch `feat/legal-credits-screen-v1` 側：`RELEASE_GATE_REMAINING_V1.md`（DoD 行・§D）／`LEGAL_CREDITS_SCREEN_V1.md` §2-1／`PRACTICAL_QA_V3_SESSION_PLAN.md`（実施済み）。runtime・`src/core`・public・package：0。push／deploy：0。
