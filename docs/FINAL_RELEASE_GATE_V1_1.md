# 最終 Production Release Gate v1.1 — 決定288 v1.1 最終スコープの完了判定（2026-11-04・AI 実施・CEO Gate 項目を明示）

> **状態：自動 Gate 部分 ALL PASS。CEO にしかできない項目（Rollback 演習・Known 凍結の承認・tag／公開宣言）を §7 に分離。** 対象は v1.1.4（W6 敵演出 品質向上）＝決定288 v1.1 §10-3 の最終 wave。根拠は `docs/FINAL_SCOPE_ROADMAP_V1.md` §6（DoD 18 再点検・Known 凍結・最終 Smoke・CEO 操作）。本書は何も「CEO 承認済み」とは書かない。CEO の承認は本書への返答（承認／拒否）で記録する。
>
> 本番（v1.1.4）の Smoke 結果は `docs/V1_1_4_PRODUCTION_SMOKE.md`。本書 §4-2 はその要約。

## 0. 結論（先に）

| 区分 | 判定 | 根拠 |
|---|---|---|
| DoD 18 再点検（§1） | **AI で判定できる 15 項目 PASS・CEO ONLY 3 項目（#10 Known 凍結の承認・#11 Rollback 演習・#18 tag／公開宣言）** | §1 の表 |
| 生存 Known の凍結（§2） | **K01〜K39（CEO 承認 2026-10-11）＋ v1.0.2〜v1.1.4 で増えた K40〜K47 を凍結案として提示** | §2 |
| 権利台帳 全行 Status（§3） | **PASS**（将軍家 10 体 × 立ち絵 10 行 ◎ KNOWN・舞台 10 行 UNKNOWN-ACCEPTED 継承・音声 0 行＝付けない方針） | §3 |
| 最終 Smoke：7 神 × 将軍家 10 体 × normal／hard（§4-1） | **140/140 PASS**（決定論 140/140・JS error 0・外部通信 0・横はみ出し 0） | `docs/evidence/final-gate/matrix-gatebuild/` |
| 本番 v1.1.4 Smoke（§4-2） | **PASS**（S2 44／S5 228／S6 6 MATCH／S8 44・bundle は W6 Gate build と byte 一致） | `docs/V1_1_4_PRODUCTION_SMOKE.md` |
| Ranking 不在監査（§4-3） | **PASS**（W6 build dist・`ranking-absence.mjs`） | `docs/evidence/final-gate/ranking-absence.txt` |
| CEO 操作（§7） | Rollback 演習（Promote 2 回）・Known 凍結 承認・tag `v1.1.4`（任意）・公開宣言・SGG 運営への任意連絡 | §5・§7 |

## 1. DoD 18 項目の再点検（`docs/ROADMAP_TO_RELEASE.md` §7・前回の状態表は `RELEASE_GATE_REMAINING_V1.md` §A＝2026-10-10）

状態の語：**DONE/Prod**＝Production で成立／**PARTIAL**／**CEO ONLY**＝CEO にしかできない工程を含む。

| # | 項目 | 状態 | 根拠（2026-11-04 時点） |
|---|---|---|---|
| 1 | Primary Fun critical 設問 NO 0 | DONE/Prod（維持） | 2026-10-10 Practical QA v3（A 0／B 0）。W1〜W6 の CEO Human QA（各 wave 1〜3 問）はすべて PASS（DECISIONS 決定287／288 各行） |
| 2 | 全到達可能・determinism 機械検査 | DONE/Prod | vitest **1,695**（`replayBoundary`／`sameSeedRetry`／parity／golden）＋本 Gate §4-1 **7 神 × 将軍家 10 体 × 2 難易度 140 組 すべて同 seed 同結果**＋cf2 8/8（既存 7 体） |
| 3 | 決定263 が LIVE or NO-GO で記録済み | DONE/Prod | DECISIONS 2026-10-07 NO-GO 行（変更なし） |
| 4 | 閉じたレバーを再開していない | DONE（維持） | W1〜W6 で `RELEASE_STATUS.md` A-3 のレバーを再開した変更 0（敵ボイスは決定288 v1.1 で除外＝閉じた側） |
| 5 | OGP／description／favicon／version 表示が Production で確認できる | DONE/Prod | 各 Smoke S2 で Home `v1.1.x (sha)` を検証（v1.1.3 `86ed9ea`・v1.1.4 は §4-2） |
| 6 | 著作権・クレジット・プライバシー・問い合わせ先が承認文言で表示 | DONE/Prod（注記つき） | Credits は v1.0.0 公開時の文言（CEO「維持」決定 2026-10-10・K37）。将軍家 10 体の帰属文（Creator Kit 将軍家の配布素材・非公式）は W2〜W5 で追加し CEO Human QA を通過。**問い合わせ先は「準備中」のまま**（`creditsText.ts`・K47 として §2 に記載・運営引き継ぎ事項）。専門家（法務）確認は未（§6-3 #5＝CEO 判断事項） |
| 7 | 権利台帳 全行 Status・UNKNOWN の扱い記録 | DONE | §3。既存 86 行（KNOWN 29／UNKNOWN-ACCEPTED 56／CONDITIONAL 1）＋将軍家 20 行（◎ KNOWN 10／UNKNOWN-ACCEPTED 継承 10）。UNKNOWN の扱いは 2026-10-07 CEO 決定「B 条件付き承認」のまま |
| 8 | 課金・広告コード 0 | DONE/Prod | `scripts/release-audit/ranking-absence.mjs --dist dist`（W6 build）**RESULT: PASS**（§4-3）。W1〜W6 の runtime 変更に課金・広告・外部通信の追加 0（各 Gate の hardening／公開受入で外部オリジン通信 0） |
| 9 | storage version ポリシー＋旧／future 読込テスト | DONE/Prod | `storageCompat.test.ts`＋各 wave の旧セーブ互換 44/44（v1.1.3 は本番 URL 直撃で 44/44・W6 Gate 44/44） |
| 10 | RELEASE_STATUS が Production HEAD と一致・生存 Known が CEO 承認 | PARTIAL → **CEO ONLY（承認）** | HEAD 一致：v1.1.3 `86ed9ea`（PR #18）・v1.1.4 は §4-2 記入後に一致。Known：K01〜K39 は CEO 承認済み（2026-10-11）。**K40〜K47（§2）は本書で初めて一覧化＝CEO の承認待ち** |
| 11 | Rollback 演習 1 回の記録 | **CEO ONLY（未実施）** | v1.0.0 以来 Promote は未使用。手順は §5。実施後に AI が Smoke（S2）で「戻った／戻した」を機械確認し `docs/evidence/final-gate/rollback-drill/` に記録 |
| 12 | CI（tsc／oxlint／vitest）が PR で自動実行 | DONE/Prod | PR #1〜#19 すべて CI success（master run も success）。W6：tsc 0／oxlint 0／vitest 1,695／build |
| 13 | main repo＝master・worktree ACTIVE のみ・docs branch が origin | PARTIAL | docs branch：W1〜W6 の LIVE 記録 PR は origin に存在（merge 済み）。main repo は `feat/d224` で dirty のまま（K14・A-5「触らない」＝CEO 承認の残置）。worktree は 54 本（うち W1〜W6 の 6 本は ACTIVE）。整理は本スコープ外（CEO OK が要る削除を含むため） |
| 14 | a11y 基準文書が存在し全項目 PASS | DONE/Prod | `A11Y_MINIMUM_PACK_V1.md`・各 wave 69/69（W6 69/69） |
| 15 | SP 実機 perf evidence 1 セット | DONE | `SP_PERF_EVIDENCE_V1.md` §3〜§4＋各 wave の sp375 probe（rafP95・JS error 0） |
| 16 | 「2 戦目の壁」「託宣温存／導き」「別構成で勝ち方」Human QA 各 1 回 | DONE | `PRACTICAL_QA_V3_RESULT.md`（2026-10-10） |
| 17 | 敵アート／SE 実音源／Voice の GO か NO が記録 | DONE | 敵アート：将軍家 10 体＝Kit 公式画像（決定288 CEO 承認・無改変〜非生成加工のみ）／既存 7 体の画風統一＝NO（K07・課金判断は行わない）。SE 実音源：NO（K31 数式合成 据え置き）。Voice：神側 GO（v1.0.0 Q8）・**将軍家は NO（決定288 v1.1 修正案・CEO 推奨「公式ボイスなし＝付けない」）** |
| 18 | `package.json`・tag・「正式公開」行・公開投稿 | PARTIAL → **CEO ONLY（tag／投稿）** | version **1.1.4**（PR #19）。DECISIONS「正式公開」行＝決定279（v1.0.0）。tag は `v1.0.0` 含め **0 本**（CEO ONLY・任意）。公開投稿は未記録（CEO） |

集計：DONE 15／CEO ONLY 3（#10 承認・#11 演習・#18 tag／投稿）／PARTIAL のうち AI 側で残作業なし（#13 は CEO 承認の残置）。

## 2. 生存 Known の凍結（案・CEO 承認で確定）

K01〜K39（`RELEASE_STATUS.md` A-4・CEO 承認 2026-10-11・CLOSED：K02）に、v1.0.2〜v1.1.4 の Decision 行・Gate 文書で記録された残リスクを **K40〜K47** として付番する。いずれも「修正しない／本スコープでは扱わない」ものであり、製品異常ではない。

| Known | 内容 | 出所 | 分類 |
|---|---|---|---|
| K40 | 札の外枠 2〜4px／`scale(1.04)`（v1.0.2 から存在） | RELEASE_STATUS A-00／A-0q | C |
| K41 | hard の演出ずれ（有利側のみ） | v1.0.6 統合 RC Gate v1 §4 | C |
| K42 | 将軍家の ★帯：★1〜2（忠次・岡っ引き・直政・康政・影・くノ一・鬼半蔵・忠勝・ドーマン）・Boss 康虎 ★5。★帯の穴は数値調整で埋めない（実測方針） | W1〜W5 Gate §5 | D |
| K43 | 将軍家 hard の重さ：素朴方策（ダメージ最大の札を出すだけ）では 直政 30%・忠勝 27〜29%・康虎 19〜29%（最善方策で全神 ≥50%＝詰みなし）。本 Gate §4-1 の素朴方策でも四天王・Boss は R4 に敗北する組が多い（意図した「止めるか受けるか」の設計） | W2／W4／W5 Gate・§4-1 | D（監視） |
| K44 | 鬼半蔵・康虎の立ち絵は神より高いまま（面積優先で据え置き）・SP 375×667 の神÷敵は 0.77〜0.82（決定261 S-1 lite の許容 ≥0.70） | W6 Gate §1-3・G2 | C |
| K45 | Enemy Select が 18 枚になり SP375 で縦スクロールが増える（横はみ出し 0） | W1 Gate §5・公開受入 | C |
| K46 | 「あと N」行の重複 CSS（W6 で据え置き） | W6 Gate §1-3 | C |
| K47 | Credits の問い合わせ先が「準備中」（SGG 運営へ送らない旨の 1 文あり）。確定は CEO | `creditsText.ts` | 文言 |

環境側（製品 Known ではない・記録のみ）：Bash sandbox 由来の一過性 `net::ERR_NETWORK_ACCESS_DENIED`（W6 Gate G6）／6 GB 機の headless で 140 組中 3 組の 2 回目が画面遷移の click timeout・Page crashed で中断 → やり直しで一致（§4-1・証跡 `*.crash-retry*.json`）。

## 3. 権利台帳（`docs/ASSET_RIGHTS_LEDGER.md` §8〜§12・将軍家 10 体 × 立ち絵・舞台・音声）

| 区分 | 行 | Status | 根拠 |
|---|---|---|---|
| 立ち絵（配信 `enemies/<slug>/art.webp`） | ENEMY-KIT-01〜10（10 行） | **◎ KNOWN**（原本保全・manifest sha256 一致・Terms 確認日） | §8〜§12 各行・Kit 原本 FRONT／MAIN から非生成加工（トリム・切り出し・放射状フェード・768² リサイズ）のみ |
| 舞台（`backgrounds/stages/08〜17`） | STG-08〜17（10 行） | **UNKNOWN-ACCEPTED（STG-02／03／04 の Status を継承）** | 既存舞台からの非生成派生（色相回転・減光・彩度）。原本未保全の ✗ を継承＝2026-10-07 CEO「B 条件付き承認」の扱い |
| 音声 | 0 行 | — | 将軍家に公式ボイスなし → 本作も付けない（決定288 v1.1 修正案） |

全 20 行に Status あり。BLOCKED 0。新規生成（AI 画像生成・音声生成）0・外部費用 0。

## 4. 最終 Smoke

### 4-1. 7 神 × 将軍家 10 体 × normal／hard の決定論 probe（W6 Gate build＝PR #19 の dist・preview :4198）

- スクリプト：`scripts/final-gate/matrix-probe.mjs`（新規・計測のみ）。1 組＝seed `final-v114` 固定・pc 1508×660・「使える札のうち敵ダメージ最大の札を出す → 札が尽きたらラウンドを終える」で決着まで。**同じ組を 2 回走らせ fingerprint（R1〜R7 開始時の予告・帯・敵 HP・神 HP・「あと N」行＋出した札＋勝敗）の一致を判定**。pageerror／console error／外部オリジン通信／横はみ出しを同時に記録
- 結果：**140 組 PASS 140／FAIL 0**。決定論 **140/140**・errors **0**・外部通信 **0**・横はみ出し **0**。所要 198 分（1 browser 直列）
- 勝敗（素朴方策・参考値であり難易度の判定ではない）：WIN 77／LOSE 63。神別 normal／hard の勝ち数：恵比寿 3／3・大耀 6／4・蒼毘 10／10・才華 7／2・寿楽 9／4・福永 4／3・笑蓮 7／5（各 10 体中）。敵別（7 神中）：岡っ引き 7／7・くノ一 7／7・影 7／6・忠次 5／3・直政 5／1・康政 4／1・鬼半蔵 4／2・ドーマン 4／2・忠勝 2／1・康虎 1／1 → 四天王・Boss は「止める／受ける」をしない方策では R4 で敗北する設計どおり（K43）
- 札選びの版（probe 側の時刻依存を消す修正・engine 不変）：v1 64 組／v1.1 3 組／v1.2 2 組／v1.3 71 組（`summary.json` の `policy`）。v1 で「不一致」になった 5 組は、神 HP 表示の追従アニメ中の読み取り（settle 待ちで解消）と、才華の札を引く札の直後に新しい札が配られる間・カットイン中を「使える札 0」と誤判定した probe の問題（カットイン／配り中は待つ v1.3 で解消・`*.policy-v1*-retry.json` に保存）。engine の不一致は 0
- 証跡：`docs/evidence/final-gate/matrix-gatebuild/summary.json`（140 行）・組ごとの json（2 回分の全記録）・`matrix-probe.log.txt`

### 4-2. 本番 v1.1.4 Smoke（2026-11-04・本番 URL 直撃）

- master `8af0082`（PR #19 merge 2026-11-04T13:49:40Z・CEO 操作）→ CI `41841665058` success → Vercel Production **`7547769021`** success（13:50:28Z）
- bundle：`index-CwO8p6YY.js` 492,733 B は W6 Gate build（`index-BwV2EshF.js`）と sha 正規化後 byte 一致・`index-BI3ZCUzF.css` 212,461 B 同一 → §4-1 の 140 組は本番 bundle に対する結果と同値
- **S2 44/44**（Home `v1.1.4 (8af0082)`）／**S5 228/228**／**S6 忠次 6/6 MATCH**（v1.1.3 本番基準）／**S8 旧セーブ 44/44**（本番 URL 直撃・4 回目で成立：1 回目 `ERR_NETWORK_CHANGED`（開発機のネットワーク切替・43/44）、2〜3 回目 base `127.0.0.1` での sandbox 由来 `ERR_NETWORK_ACCESS_DENIED` → base `localhost` で PASS）。JS error 0・外部通信 0
- 詳細 `docs/V1_1_4_PRODUCTION_SMOKE.md`。Rollback 先 `7542751824`（v1.1.3 `86ed9ea`）

### 4-3. Ranking 不在監査（W6 build）

`node scripts/release-audit/ranking-absence.mjs --dist dist` → **RESULT: PASS**（tracked files・依存・dist に ranking backend／Neon／API／提出 0・`submissionEnabled` false のみ）。証跡 `docs/evidence/final-gate/ranking-absence.txt`。

### 4-4. 画面（運営報告書 §4 用・W6 build・大耀 × 康虎 R1）

`docs/evidence/final-gate/screens/`：pc／sp × Home・神選択・Enemy Select・降臨の間・戦闘 R1（jpeg・JS error 0）。本番 URL での撮り直しは v1.1.4 Smoke で bundle byte 一致を確認するため省略。

## 5. Rollback 演習（CEO ONLY・`docs/RELEASE_SAFETY_PREFLIGHT.md` §3 の計画をそのまま）

Promote は Vercel の権限が CEO にしかないため、演習は CEO 操作 2 回＋AI の確認 2 回で構成する。所要 約 10 分。実施は任意のタイミング（v1.1.4 LIVE 後）。

1. CEO：Vercel Dashboard → Project `seven-gods-game` → Deployments → **v1.1.3 の deployment `7542751824`**（sha `86ed9ea`）→ 「Promote to Production」
2. AI：`node scripts/v1_0_3-rc/acceptance.mjs <out> https://seven-gods-game.vercel.app/ --sha 86ed9ea` で Home `v1.1.3 (86ed9ea)` を機械確認（戻った証跡）
3. CEO：同じ手順で **v1.1.4 の deployment `7547769021`** を Promote to Production
4. AI：同コマンドを `--sha 8af0082` で再実行（戻した証跡）→ `docs/evidence/final-gate/rollback-drill/` に保存 → DoD #11 DONE を `RELEASE_STATUS.md` に記録

注意：Promote の間（数十秒）は外部ユーザーに v1.1.3 が見える。将軍家 10 体・save v9 は両版で同じため、セーブの互換に影響はない。

## 6. CEO 最終通しプレイ チェック項目（本番 URL・iPhone・1 周 約 20 分・YES／NO で可）

| # | 画面 | 確認すること | 期待 |
|---|---|---|---|
| C1 | Home | 右下の version が `v1.1.4 (8af0082)` | YES |
| C2 | Home → クレジット | 「非公式のファン作品」「将軍家の敵の画像は Creator Kit（将軍家）」の記載・問い合わせ先「準備中」 | 表示される |
| C3 | 神を選ぶ | 7 柱すべて選べる・難易度 3 段 | YES |
| C4 | 挑む敵を選ぼう | 既存 7 体＋「将軍家」見出しの下に 10 体（★と注記 chip）・Pilot 表記 0 | 18 枚 |
| C5 | 戦闘（岡っ引き・ふつう） | 入口で立ち絵に舞台色の外光・連撃のとき紫の残像 | 違和感なし |
| C6 | 戦闘（忠次・ふつう） | R3 の「あと N で総攻めを止める」行が読める・止めたら ✓ | YES |
| C7 | 戦闘（康虎・むずかしい） | R3 の「将軍の威を止める」→ 止めなければ R4 将軍の威・追い込んだ最終帯で裁きの光が金→緋 | 違和感なし |
| C8 | 戦闘（任意の既存 7 体 1 戦） | 立ち絵の大きさ・演出が以前と同じ | 変化なし |
| C9 | 結果 → ホーム | 戦績・神階・Daily の残り回数が残っている（v1.1.3 のセーブが引き継がれる） | YES |
| C10 | 音 | BGM／SE／大耀の声が以前どおり・ミュートで止まる・バックグラウンド復帰で BGM が戻る | YES |

NO が 1 つでもあれば AI が Fast Gate で調査（Rollback 判断は CEO）。

## 7. CEO 操作（§6-3 #8 該当・この 4 点だけ）

| # | 操作 | 必須／任意 | AI の後続 |
|---|---|---|---|
| 1 | §2 の K40〜K47 凍結の **承認／拒否**（返答 1 行） | 必須（DoD #10） | `RELEASE_STATUS.md` A-4 に凍結を記録 |
| 2 | §5 Rollback 演習（Promote 2 回） | 必須（DoD #11）・時期は任意 | Smoke で確認・記録 |
| 3 | tag `v1.1.4`（`git tag v1.1.4 8af0082 && git push origin v1.1.4`）・公開宣言 | 任意（DoD #18） | — |
| 4 | SGG 運営への任意の事前連絡（規約 §8）＝運営報告書（`docs/OPERATIONS_REPORT_V1.md`）と同時 | 任意（推奨） | 共有ページ 1 枚は CEO の公開範囲で |

## 8. 変更していないもの

engine・enemies.ts・rules.ts・save v9・gameVersion・Daily・49 攻略盤・seed・BGM／SE／神ボイス・Ranking（休眠）・Neon・secrets・`.claude/`・`.env*`・`敵画像/`。本書と `scripts/final-gate/*`（計測のみ）・`docs/evidence/final-gate/*` は docs／scripts のみ。
