# Legal／Credits 画面 v1（CM-02／03）— 実装・Fast Gate・CEO 最終確認用の文言表

- 日付：2026-10-09（Lane 1・**AI 判断**（CLAUDE.md §6-2）・CEO 採用方針 2026-10-09）
- 状態：**IMPLEMENTED ON BRANCH `feat/legal-credits-screen-v1` — Fast Gate PASS — 文言は CEO 条件付き承認（2026-10-10・§2-3）を反映済み・master 統合へ**。push・deploy は未実施。権利の可否認定はしない（§6-3 #5）
- 起草元：`docs/LEGAL_CREDITS_DRAFT_V1.md`（文言 A を CEO 方針で修正：「外部送信なし」の断定を外し Vercel の但し書きを入れる／公式ボイスに触れない／問い合わせ先は準備中）
- 不変：`src/core` 0・storage 0（画面は表示のみ）・既存画面の文言 0・色・骨格は RecordScreen と同じ

---

## 1. 実装

| ファイル | 内容 |
|---|---|
| `src/components/setup/creditsText.ts`（新規） | 画面に出る文字列は**ここだけ**（title／lead／3 節／末尾クレジット行／Home のリンク文言） |
| `src/components/setup/CreditsScreen.tsx`（新規） | 静的 1 画面（`setup-screen` 骨格・`setup-title`・戻るは `home-cta-secondary`）。storage／fetch 0 |
| `src/components/setup/HomeScreen.tsx` | `.home-links` に 3 つ目のボタン「クレジット・権利表記」（`InfoIcon`・既存の `home-howto-button`＝44px） |
| `src/components/GameFlow.tsx` | `SetupScreen` に `'credits'`・ルート 1 本 |
| `src/components/feedback/feedbackSnapshot.ts` | 画面名「クレジット」（未知値が「戦績」に落ちないように） |
| `src/components/icons.tsx` | `InfoIcon`（丸に i・SVG） |
| `src/components/setup/setup.css` | `.credits-*` 読みやすい幅・行間だけ（新しい色なし） |
| `src/components/creditsScreen.test.ts`（新規） | 禁止語 9 パターン／必須語／配線／snapshot／「文言は creditsText.ts にだけ」 |
| `scripts/legal-credits/acceptance.mjs`（新規） | PC・SP375：リンク 44px → 画面 → 禁止語 0・必須語 9・横はみ出し 0・戻る・localStorage 不変・error 0 |

## 2. 文言と状態（CEO が 1 文ずつ最終確認する表）

凡例：**事実確認済み**＝コード・台帳・規約の Evidence がある／**CEO 確認待ち**＝採否・表現を CEO が決める／**書かない**＝方針で除外

| # | 画面の文 | 根拠 | 状態 |
|---|---|---|---|
| L1 | 本作「SEVEN GODS：共鳴カードバトル」は、SEVENGODS（SGG）の二次創作ガイドラインに基づく非公式のファン作品です。 | Kit Guidelines §1〜§2（二次創作 OK）・§6 旧 §5（公式と誤認させない） | 事実確認済み（表現は CEO 確認） |
| L2 | SGG 運営による公式・公認・提携作品ではありません。 | 同 §6 | 事実確認済み |
| S1 | 神と OTOMO の画像は「SEVENGODS Games Creator Kit」の配布素材を使用しています。 | 台帳 §3-A／3-D（Kit 公式・KNOWN）・§4 クレジット書式 | 事実確認済み |
| S2 | BGM は制作者が Suno で生成しました。 | 台帳 §3-I（Suno・有料プラン・規約版 UNKNOWN-ACCEPTED） | 事実確認済み（「権利クリア」とは書かない） |
| S3 | 効果音は制作者が合成して作成しました。 | 台帳 §3-H（数式合成・KNOWN） | 事実確認済み |
| S4 | 敵・カード・背景などの一部の画像は、制作者が生成 AI を用いて作成しました。 | 台帳 §3-C／3-E／3-F（CEO 生成・UNKNOWN-ACCEPTED） | 事実確認済み（サービス名は書かない＝CEO 確認待ち：書くか） |
| S5 | アイコンと SNS 用の画像は、上記の素材と自作の図形を組み合わせて作成しました。 | 台帳 ICON-01（自作）・OG-01（既存画像の合成） | 事実確認済み |
| D1 | ゲームの記録（戦績・デッキ・進行中のバトルなど）は、お使いの端末内（localStorage）に保存します。アカウント登録はありません。 | `STORAGE_VERSION_POLICY.md` Key Registry・認証コード 0 | 事実確認済み |
| D2 | ゲーム自体がプレイデータを外部へ送信する仕組みは持っていません（配信元 Vercel の標準的なアクセス記録は除きます）。 | `src` の `fetch(` は同一オリジンの SE のみ・sendBeacon／XHR／analytics 0・Ranking `submissionEnabled:false`（Draft §4） | 事実確認済み（CEO 方針どおり「外部送信なし」と断定しない） |
| D3 | フィードバックの文章はクリップボードへコピーされるだけで、自動では送信されません。 | `FeedbackOverlay.tsx` `navigator.clipboard.writeText` のみ | 事実確認済み |
| C1 | 問い合わせ先は準備中です。 | repo に窓口の記載なし | **CEO 確認待ち**（メール／X／Discord／フォーム／載せない） |
| F1〜F3 | SEVENGODS（SGG）二次創作／SEVENGODS Games Creator Kit／制作：SEVENDAO GAMES | Kit §4 の書式 2 つ＋Home 既表示の制作者名 | F1・F2 事実確認済み／**F3 CEO 確認待ち**（制作者名の表記） |
| — | 公式ボイス（大耀「あいさつ」） | Pilot 未統合 | **書かない**（統合時に Draft §2-1 A-1 の 1 文を追加） |
| — | 「権利クリア」「許諾済み」「商用利用可」「人間製」 | 台帳の UNKNOWN-ACCEPTED／CONDITIONAL を確定表現にしない | **書かない**（テストで禁止） |
| — | PV（演出動画・fal.ai／MiniMax・CONDITIONAL） | ゲーム内に動画は含まれない（PV は外部公開物） | **書かない**（PV 公開時は説明欄で表記＝Draft §6 #9） |

### 2-1. 未確定文言の整理（2026-10-10・CEO が「承認」で確定できる形）

§2 の「CEO 確認待ち」は **文言 3 件＋前提 2 件**。AI 推奨値を置く（確定ではない。画面は現行文のまま）。詳細は integ master `docs/PRACTICAL_QA_V3_RESULT.md` §6。

| # | 箇所 | 現在 | AI 推奨 | NO のとき |
|---|---|---|---|---|
| S4 | 生成 AI のサービス名 | 書いていない | **書かない（現状維持）** | 「（ChatGPT ほか）」を追記 |
| C1 | 問い合わせ先 | 「問い合わせ先は準備中です。」 | **v1.0 は「準備中」のまま・窓口確定後に 1 行差し替え** | 載せない（ブロック省略＋「SGG 運営へは行わないでください」1 文）／載せる（専用メール or フォーム 1 つ） |
| F3 | 制作者名 | 「制作：SEVENDAO GAMES」 | **維持＋「（SGG 運営とは別の個人制作スタジオです）」を添える** | 「制作者」のみ |
| 前提 1 | SGG 運営への事前相談 | — | **相談する。回答待ちで v1.0 を止めない**（同タイトルで 2026-08-31 から公開中＝更新） | 相談しない：L1〜L2 太字＋サブタイトル「非公式ファンゲーム」 |
| 前提 2 | 専門家確認 | — | **不要**（断定表現なし・禁止語テスト） | クレジット 2 行＋データ保存のみ先行表示 |
| A-1 | 公式ボイス統合時の 1 文 | 未記載 | Voice 統合（Q8 3／3 PASS・統合 READY）と同時に Draft §2-1 A-1 を追加（事実記載・CEO 判断不要） | — |

確定後の作業：`creditsText.ts` 1 回更新 → `creditsScreen.test.ts`・`scripts/legal-credits/acceptance.mjs` 再実行 → master merge（CEO 承認）。

### 2-2. 確定候補（2026-10-10・AI 推奨の全文・**未確定＝CEO 承認待ち**。画面は現行文のまま）

CEO が「承認」と返せば AI がそのまま `creditsText.ts` に反映する。行ごとの修正も可。権利の可否（許諾済み・権利クリア等）はどの文にも書かない（禁止語テスト維持）。根拠は Kit Guidelines §4（クレジット書式は任意・記載しても公式にならない）・§5（公式の声＝Kit 配布音声のみ・自作音声に「公式」を付けない）・§6（公式／公認／提携と誤認させない・なりすまし禁止）、台帳 §3-C／E／F（生成 AI 画像＝UNKNOWN-ACCEPTED）、生成サービス規約監査 #2／#6（プランと学習設定＝CEO INPUT・repo に記録なし）。

| # | 箇所 | 確定候補（この文のまま画面へ） | 現行からの差分 | 根拠（要約） |
|---|---|---|---|---|
| S4 | 生成 AI の画像 | 「敵・カード・背景などの一部の画像は、制作者が生成 AI を用いて作成しました。」 | **変更なし**（サービス名を書かない） | 台帳 §3-C／E／F は UNKNOWN-ACCEPTED、規約監査 #2／#6 はプラン・学習設定が CEO INPUT のまま。サービス名を書くと規約版・プランの確定表現に近づく。事実（制作者が生成 AI で作成）だけを書く |
| C1 | 問い合わせ先 | 「問い合わせ先は準備中です。本作に関するお問い合わせを SGG 運営へ送ることはお控えください。」 | 2 文目を**追加** | Kit §8 は「迷ったら SGG 運営へ相談」をクリエイター向けに書いており、プレイヤーが SGG 運営へ本作の問い合わせをすると運営側の負担になる。窓口未確定（repo に記載なし・新設は外部サービス登録 §6-3 #6 を伴い得る）のため v1.0 は「準備中」。窓口確定後に 1 文目だけ差し替え |
| F3 | 制作者名 | 「制作：SEVENDAO GAMES（SGG 運営とは別の個人制作スタジオです）」 | 括弧書きを**追加** | Home／OG と同じ表記を維持。Kit §6「SGG 運営・関係者へのなりすまし禁止」を文言側で下げる。法人登記・運営との関係は repo に記載なし＝断定を避け「別の」とだけ書く |
| 前提 1 | SGG 運営への事前相談 | （画面文ではない）**相談する。回答待ちで v1.0 を止めない** | — | Kit 冒頭「迷ったら公開前に相談」。本作はタイトルが IP 名と同一で 2026-08-31 から同タイトルで Production 公開中＝v1.0 は更新。相談文面は CEO 名義（AI は下書き可・送信は CEO） |
| 前提 2 | 専門家確認 | （画面文ではない）**不要** | — | 断定表現 0・禁止語 9 パターンをテストで固定・権利認定を含まない |
| A-1 | Voice 統合時の素材 1 行目 | 「神と OTOMO の画像、および神の音声は「SEVENGODS Games Creator Kit」の配布素材をそのまま使用しています（本作で制作した音声はありません）。」 | S1 を**置換**（Voice 統合と同時・CEO 判断不要の事実記載） | Kit §5（公式の声＝Kit 配布音声）・台帳 VOICE-KIT-01 KNOWN（原本＝配信＝MCP sha256 一致）。「公式ボイス」の語は使わない（Kit §5 の「公式」は Kit 配布分にしか使えず、禁止語テストも維持） |

確定候補で変わるファイル：`src/components/setup/creditsText.ts`（C1 の 2 文目・F3 の括弧・A-1 の置換）と `src/components/creditsScreen.test.ts`（必須語の更新 2 箇所：F3 の行・A-1 後の S1）。Kit §4 の書式 2 行（F1・F2）・L1〜L2・D1〜D3・S2・S3・S5 は変更なし。統合順序・CI 安全条件は `docs/RC2_INTEGRATION_PLAN_V1.md`。

### 2-3. 反映（2026-10-10・CEO 条件付き承認「SGG との関係・制作者名の事実整合性を確認し、誤認を招く表現があれば修正する。権利条件の未解決事項を隠さない」）

| # | 画面文（反映済み・`creditsText.ts`） | 事実整合性の確認（AI・2026-10-10） |
|---|---|---|
| S4 | 変更なし | 事実（制作者が生成 AI で作成）のみ。サービス名・プランは書かない |
| **S6（新規）** | 「生成 AI で作成した素材の一部には、生成時の記録（利用プラン・生成日時など）が揃っていないものがあり、制作者の責任で使用しています。」 | CEO 条件「権利条件の未解決事項を隠さない」の画面側の反映。根拠：Rights Ledger §1-2「UNKNOWN-ACCEPTED ＝ 権利確認済みではない」・§7-4（KNOWN 29／UNKNOWN-ACCEPTED 56／CONDITIONAL 1）。権利の可否は書かない（禁止語テスト維持）。**AI 追加＝CEO が不要と判断すれば 1 行削除で戻せる** |
| C1 | 「問い合わせ先は準備中です。本作に関するお問い合わせを SGG 運営へ送ることはお控えください。」 | 窓口は repo に記載なし（事実）。SGG 運営を本作の窓口と誤認させない |
| F3 | 「制作：SEVENDAO GAMES（SGG 運営とは別の個人制作スタジオです）」 | 表記は Home の eyebrow「SEVENDAO GAMES」と一致（`HomeScreen.tsx`）。CLAUDE.md §1「SEVENDAO ゲーム開発スタジオ」・CEO 1 名＝個人制作。法人登記・SGG 運営との契約は repo に記載なし＝「別の」とだけ書き、関係の有無を断定しない。GitHub org 名 `SevenGodsProject`・タイトルが IP 名と同一である点は L1（非公式のファン作品）と F3 で補う |
| L1 | 変更なし | Kit §4（クレジットを記載しても公式・公認・提携にはならない）・§6（誤認表示の禁止）と整合 |
| A-1 | voice 統合時に反映（master 上） | 「大耀の音声」と限定して書く（統合されるのは大耀「あいさつ」1 本のみ＝「神の音声」と総称しない） |

**隠していない未解決事項（画面外・公開前 Gate §4 と台帳で管理）**：SGG 運営への事前相談は未送信（前提 1：相談する・回答待ちで v1.0 を止めない・送信は CEO 名義）／台帳 UNKNOWN-ACCEPTED 56 行・CONDITIONAL 1（VID-01・動画でありゲーム本体には含まれない）／OTM-BG-01 原本は 2026-10-07 に所在判明・art-source 複製は untracked（TD-04）／問い合わせ窓口は未確定。

## 3. Fast Gate（2026-10-09・worktree `SevenGodsGame-rl01`）

| 項目 | 結果 |
|---|---|
| tsc -b | 0 error |
| oxlint | error 0 |
| vitest（creditsScreen 13＋entranceWiring／feedback／a11yMinimum／pressFeel／otomoIdHardening） | **78 PASS** |
| build | PASS（JS 465.38kB・CSS 191.84kB：画面 1 枚＋文言 ≈ +3kB） |
| Playwright `acceptance.mjs`（PC 1508×660／SP 375×667） | **38／38 PASS**（リンク 44px・画面表示・禁止語 0・必須語 9・横はみ出し 0・戻る・localStorage 不変・JS error 0）→ `docs/evidence/legal-credits/` |
| full vitest | **1,420 PASS・9 skip・0 fail**（115 files・+16） |

## 4. 公開前 Gate に残すもの（本画面では解決しない）

| 項目 | 誰が | 内容 |
|---|---|---|
| 文言の最終確認 | CEO | §2 の「CEO 確認待ち」3 件（S4 のサービス名・C1 問い合わせ先・F3 制作者名）と、全文の表現 |
| SGG 運営への事前相談 | CEO | Draft §6 #6（AI 推奨：相談する。タイトルが IP 名と同一のため） |
| Suno 規約版・敵画像・PV の CONDITIONAL | CEO | 台帳の事実状態は維持。画面は「制作者が生成」までしか書かない |
| 専門家確認の要否 | CEO | Draft §6 #1 |

## 5. 最終 Gate（commit 前・2026-10-09）

| 項目 | 結果 |
|---|---|
| tsc 0／oxlint 0 | PASS |
| full vitest | 1,420 PASS・9 skip・0 fail |
| Playwright | 38／38 PASS |
| src/core 差分 | 0 行 |
