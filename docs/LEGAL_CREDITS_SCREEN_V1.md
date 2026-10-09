# Legal／Credits 画面 v1（CM-02／03）— 実装・Fast Gate・CEO 最終確認用の文言表

- 日付：2026-10-09（Lane 1・**AI 判断**（CLAUDE.md §6-2）・CEO 採用方針 2026-10-09）
- 状態：**IMPLEMENTED ON BRANCH `feat/legal-credits-screen-v1` — Fast Gate PASS — 文言は CEO 最終確認待ち（§2）**。master merge・push・deploy は未実施。権利の可否認定はしない（§6-3 #5）
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
