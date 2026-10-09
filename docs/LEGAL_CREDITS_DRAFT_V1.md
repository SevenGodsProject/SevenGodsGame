> **状態（2026-10-09・Lane 1・AI 起草）：文言は未確定。CEO 確認待ち（§6）。法的に未確認の事項は「権利クリア」「許諾済み」と記載しない。** 実装（Credits 画面）は CEO が文言 A を承認してから。

# SEVEN GODS — Legal／Credits 文言ドラフト（CM-02／CM-03）

- 作成日：2026-10-09（AI ドラフト・docs-only・repo 変更 0・読み取り元 `C:\Users\kimi1\SevenGodsGame-integ` master `b04cc42`）
- 性質：**文言の最終決定は CEO／専門家**（`docs/ROADMAP_TO_RELEASE.md:64`・`docs/MASTER_BACKLOG_AUDIT.md:196` ともに「文言 ★ CEO／専門家」）。本書は「事実に反しない・禁止語を含まない」下書きと根拠表を用意するもので、法的認定は行わない（`docs/ASSET_RIGHTS_LEDGER.md:4`）
- 出典の書き方：`ファイル:行` または `ファイル §節`。Kit ガイドラインは master の repo コピー（v1.0.0・2026-07-16・`docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md`）と、`feat/official-voice-pilot-v1` が保持する更新版（Updated 2026-10-08・§5「キャラクターの声」追加・旧 §5〜§8 → §6〜§9）の両方を参照し、**更新版 §5 を有効なルールとして扱う**（`docs/CREATOR_KIT_V1_1_AUDIT.md` §5-1 で公式サイト・workers.dev・MCP の 3 経路同一テキストを確認済み）。以下、節番号は「旧§n→新§m」の形で併記する

---

## 0. 前提事実（文言が依拠するもの）

| # | 事実 | 出典 |
|---|---|---|
| F1 | 二次創作・商用利用 OK・印税不要・事前申請不要 | RIGHTS v1.0.0 L15-18（§1） |
| F2 | Kit など公式配布素材の加工と作品への組み込みが許可 | RIGHTS L26（§2） |
| F3 | 生成 AI への入力・参照画像利用が許可。ただし生成物と公開方法の責任は制作者 | RIGHTS L28-31（§2） |
| F4 | クレジットは**任意**。書式 3 種：「SEVENGODS（SGG）二次創作」「Based on SEVENGODS Games」「SEVENGODS Games Creator Kit」。記載しても公式・公認・提携にはならない | RIGHTS L48-56（§4） |
| F5 | 公式の声＝Kit 配布音声のみ。自作ボイスに「公式」「公式ボイス」「公認」と書いてはならない | 更新版 L59-64（新 §5）・`CREATOR_KIT_V1_1_AUDIT.md` §5-1 |
| F6 | 二次創作を公式設定・公認・提携作品であるかのように表示すること、SGG 運営・関係者へのなりすましは禁止 | RIGHTS L65-66（旧 §5→新 §6） |
| F7 | 第三者が権利を持つ音楽・音声・フォント等は Kit ガイドラインの対象外（制作者が自ら許可を得る） | RIGHTS L75（旧 §6→新 §7） |
| F8 | 二次創作に新たに加えた創作的表現の権利は制作者に帰属。SGG の原作品・キャラ・名称・ロゴ・公式素材の権利は移転しない | RIGHTS L77（旧 §6→新 §7） |
| F9 | SGG 運営の個別回答は「公式」「公認」「提携」表示を許可するものではない | RIGHTS L93（旧 §7→新 §8） |
| F10 | 事実状態の定義：**UNKNOWN-ACCEPTED＝権利確認済みではない**（CEO が UNKNOWN を認識・推測補完なし・配信除外 Evidence なし・Legal 上の扱いは CM-02） | `ASSET_RIGHTS_LEDGER.md:46`（§1-2）・§7-0 |
| F11 | 集計 86 行＝KNOWN 29／UNKNOWN-ACCEPTED 56／CONDITIONAL 1／BLOCKED 0 | `ASSET_RIGHTS_LEDGER.md` §7-4 |
| F12 | CM-02 への引き継ぎ：AI 生成物を「人間製」と表示しない・「公式・公認」と誤認させない／Kit 表記と「非公式」明示の要否／UNKNOWN-ACCEPTED 56 行の扱い／VID-01 CONDITIONAL の受容可否 | `ASSET_RIGHTS_LEDGER.md` §7-5 |
| F13 | 既に公開面に「SEVENGODS（SGG）二次創作」の表記あり：meta description・webmanifest description・OG 画像の credit 行 | `index.html:8`・`public/site.webmanifest`（description）・`scripts/public-face/gen-og-image.mjs:48` |
| F14 | アプリ UI 内にはクレジット・非公式表示が**無い**（コード注釈のみ） | `CREATOR_KIT_V1_1_AUDIT.md` §5-2 #6 |
| F15 | Home の eyebrow に「SEVENDAO GAMES」、OG 画像にも同文字列 | `src/components/setup/HomeScreen.tsx:129`・`gen-og-image.mjs:43` |

---

## 1. 表示場所の提案と最小構成

### 1-1. 場所

| 項目 | 提案 | 理由・出典 |
|---|---|---|
| 入口 | **Home 画面 `.home-links` に 3 つ目のボタン「クレジット・権利表記」**（既存は「戦績を見る」「OTOMOとの絆を見る」の 2 つ） | `HomeScreen.tsx:180-189`。ROADMAP の指定「静的 1 画面（Home footer リンク）」`ROADMAP_TO_RELEASE.md:64` |
| 画面 | 新規 **`CreditsScreen.tsx`**（静的・読み取り専用・storage 0・外部リンク 0 を基本） | CM-02／03 は「同一画面で可」`MASTER_BACKLOG_AUDIT.md:197` |
| 戦闘中 | **出さない**。BattleScreen・結果画面・カットインには一切追加しない | 戦闘 UI の情報密度（決定264／266 の Duel HUD）を崩さない。依頼条件 |
| 併記先（任意・既存） | meta description／webmanifest／OG 画像の「SEVENGODS（SGG）二次創作」は**そのまま維持**（文言 A と矛盾しない） | F13 |
| バージョン表示 | Credits 画面の末尾に `buildLabel()` と同じ版表示を再掲（Feedback で「どの版の文言か」を特定できる） | `HomeScreen.tsx:191-194` |

### 1-2. 画面に載せる最小構成（上から順）

| 順 | ブロック | 内容 | 必須 |
|---|---|---|---|
| 1 | 見出し | 「クレジット・権利表記」 | 必須 |
| 2 | 非公式二次創作の宣言 | 文言 A の第 1〜2 文 | **必須**（F6・F12） |
| 3 | Kit クレジット | 「SEVENGODS（SGG）二次創作」＋「SEVENGODS Games Creator Kit」 | 任意（F4）だが掲載推奨 |
| 4 | 素材の出所 | BGM／SE／画像（生成 AI）／アイコン・OGP／動画 を 1 行ずつ | 必須（F12 #1「人間製と表示しない」） |
| 5 | プライバシー | 文言 §4-1（localStorage のみ・送信 0） | 必須（CM-03） |
| 6 | 問い合わせ先 | §5（CEO 確認待ち・空欄可） | CEO 判断 |
| 7 | 折りたたみ「詳細」 | 文言 B（§2-2） | 任意 |
| 8 | 版表示 | `buildLabel()` | 推奨 |
| 9 | 戻る | Home へ戻るボタン（Esc も可・A11y Minimum Pack の流儀） | 必須 |

---

## 2. 文言案

### 2-1. 文言案 A（最小・画面用・300 字以内）

**A-0：master 現状（公式ボイス未統合）— 256 字（実測・300 字以内）**

> 本作「SEVEN GODS：共鳴カードバトル」は、SEVENGODS（SGG）の二次創作ガイドラインに基づく非公式のファン作品です。SGG 運営による公式・公認・提携作品ではありません。
> 神と OTOMO の画像は SEVENGODS Games Creator Kit の配布素材を使用しています。BGM は制作者が Suno で生成、効果音は自作、敵・カード・背景など一部の画像は制作者が生成 AI で作成したものです。
> 本作はデータをお使いの端末内（localStorage）にのみ保存し、外部へ送信しません。

**A-1：Lane 2（`feat/official-voice-pilot-v1`・大耀「あいさつ」）が統合された場合に差し替える 1 文**（第 2 段落の 1 文目を置換）

> 神と OTOMO の画像、および神の音声は SEVENGODS Games Creator Kit の配布素材をそのまま使用しています（本作で制作した音声はありません）。

- 根拠：Kit 配布 MP3 を無改変で配信・配信 sha256＝原本＝Kit MCP の 3 者一致（voice-pilot `docs/ASSET_RIGHTS_LEDGER.md:319,323`・`docs/OFFICIAL_VOICE_PILOT_V1.md:20`）。「公式」の語は F5 により Kit 配布分そのものにのみ使えるが、**画面文言では「公式」を使わず「Creator Kit の配布素材をそのまま」と書く**（禁止語テストを単純化するため・§7）
- 注意：Pilot は大耀 1 本のみ。「神の音声」と総称して差し支えないが、7 神展開前に「全神に音声がある」と読める表現は避ける（現行案は数を書かない）

### 2-2. 文言案 B（詳細・画面内の折りたたみ or docs 用）

> **本作について**
> 「SEVEN GODS：共鳴カードバトル」は、SEVENGODS（SGG）が公開している二次創作ガイドライン（Effective 2026-07-16・Updated 2026-10-08）に基づいて制作された、非公式のファン作品です。SGG 運営が発行・公認・提携・保証するものではなく、本作の内容は SGG の公式設定ではありません。SEVENGODS の原作品・キャラクター・世界観・名称・ロゴ・公式配布素材に関する権利は SGG に帰属します。本作で新たに加えた創作的表現の権利は、法令上認められる範囲で制作者に帰属します。
>
> **クレジット**
> - SEVENGODS（SGG）二次創作
> - SEVENGODS Games Creator Kit
>
> **使用素材の出所**
> - 神・OTOMO の画像：SEVENGODS Games Creator Kit の配布素材（無改変、または背景除去・縮小のみ）
> - （Lane 2 統合時のみ）神の音声：SEVENGODS Games Creator Kit の配布音声をそのまま使用。本作で制作・合成した音声はありません
> - BGM（4 曲）：制作者が Suno で生成
> - 効果音：制作者がプログラムで合成した自作音源（録音・外部素材を含みません）
> - 敵キャラクター・カードイラスト・ステージ背景・演出画像・OTOMO 絆カード背景・神のキービジュアルの一部：制作者が生成 AI（ChatGPT）で作成
> - アイコン・OGP 画像：自作（OGP 画像は上記キービジュアルを含みます）
> - 戦闘演出動画（大耀「神の一撃」）：制作者が生成 AI（fal.ai 上の MiniMax モデル）で作成
> - 上記の生成 AI 素材は人の手描き・演奏によるものではありません
>
> **プライバシー**
> §4-1 を参照
>
> **免責**
> 本作は無料で提供され、その内容・継続性を保証するものではありません。本作に関するお問い合わせは SGG 運営ではなく、下記の制作者窓口へお願いします。
>
> **お問い合わせ**
> （§5・CEO 確認待ち）

- 文言 B で**書いていないこと**（意図的）：「権利処理済み」「許諾済み」「ライセンス取得済み」「商用利用可」「公式」「公認」「提携」「人間製」。UNKNOWN-ACCEPTED 56 行・CONDITIONAL 1 行を「確認済み」に見せる表現を含まない（F10・F11）
- 「Updated 2026-10-08」の日付は、master のコピーが旧版のままなので**統合時に repo コピーを更新してから**載せる（`CREATOR_KIT_V1_1_AUDIT.md` §5-2 #2）。更新前に出すなら日付を省く

---

## 3. 権利表記の根拠表（素材群ごと）

凡例：事実状態は `ASSET_RIGHTS_LEDGER.md` §1-2／§7-4。「書いてよい」は事実状態の範囲内で真実な表現、「書いてはいけない」は未確認事項を確認済みに見せる表現。

| 素材群（台帳 ID） | Creator | Terms（版・確認日） | 事実状態 | 画面に書いてよい表現 | 書いてはいけない表現 | 出典 |
|---|---|---|---|---|---|---|
| 神 Kit 公式画像 ×21（GOD-KIT-01〜21）／OTOMO doji ×7（OTM-KIT-01） | Kit 公式（無加工・manifest sha256 一致） | `SGG-FAN-CREATION-GUIDELINES-1.0.0`・AI 再確認 2026-10-07（CEO 初回確認日は UNKNOWN-ACCEPTED） | **KNOWN** | 「SEVENGODS Games Creator Kit の配布素材」「Creator Kit の素材を使用」 | 「公式ゲーム」「SGG 公認」「提携」。Kit 素材を本作の自作と読める表現 | 台帳 §3-A L108・§3-D L172 |
| 神 Kit 派生（GOD-D-01〜03：front_640／main.png）／OTOMO 派生（OTM-D-01〜03：_320 透過） | AI 非生成加工（背景除去・縮小のみ・描き直し 0） | 同上 | **KNOWN**（GOD-D-02／03 は Kit へ戻した決定番号のみ UNKNOWN-ACCEPTED） | 「Creator Kit の素材（背景除去・縮小のみ）」 | 「加工なし」とは書かない（透過処理あり） | 台帳 §3-B L138-140・§3-D L173-175・§7-2 #11 |
| 神キービジュアル ×7＋home／hero 版（GOD-K-01〜07・GOD-KH-01／02） | **UNKNOWN**（公式配布物か CEO 生成か未確定。原本に OpenAI C2PA `gpt-image` を実測） | UNKNOWN | **UNKNOWN-ACCEPTED** | 「神のキービジュアルの一部は制作者が生成 AI で作成」（C2PA 実測に基づく最小表現）。または出所を特定しない「本作の画像の一部は制作者が生成 AI で作成」 | 「SGG 公式キービジュアル」「Kit 配布」（Kit manifest に無い）／「権利確認済み」 | 台帳 §3-B L141-149・§7-2 #8 |
| 敵 ×7（ENM-01〜07）＋未参照 ENM-U1〜U3 | CEO 生成（ChatGPT）＋AI 非生成修復。敵は自前 IP（Kit の名称・キャラを含まない） | ChatGPT 規約の版・当時プラン UNKNOWN | **UNKNOWN-ACCEPTED** | 「敵キャラクターは制作者が生成 AI（ChatGPT）で作成」 | 「オリジナルイラスト（手描き）」「権利クリア」「商用利用許諾済み」 | 台帳 §3-C L153-166・§7-2 #6／#7 |
| カード ×60（CARD-*・CARD-TAIYO-02） | CEO 生成（ChatGPT gpt-image）。TAIYO-02 のみ Plus・学習 OFF・Terms Eff. 2026-01-01 を AI 確認 | 59 枚＝UNKNOWN／TAIYO-02＝KNOWN | **UNKNOWN-ACCEPTED 16 行／KNOWN 1 行** | 「カードイラストは制作者が生成 AI（ChatGPT）で作成」 | 「権利処理済み」。神専用カードを「Kit 素材」と書かない（Reference inputs UNKNOWN） | 台帳 §3-E L180-201・§2-3 L98・§7-2 #1／#2 |
| ステージ背景 ×7＋アリーナ（STG-01〜07・STG-ARENA） | CEO 生成（ChatGPT・原本 C2PA 実測） | UNKNOWN | **UNKNOWN-ACCEPTED** | 「ステージ背景は制作者が生成 AI で作成」 | 同上 | 台帳 §3-F L205-216 |
| FX ×6（FX-01〜06） | CEO 生成（ChatGPT・1 シート） | UNKNOWN | **UNKNOWN-ACCEPTED** | 「演出画像は制作者が生成 AI で作成」 | 同上 | 台帳 §3-G L220-229 |
| OTOMO 絆カード背景 ×7（OTM-BG-01） | CEO 生成（原本 C2PA `gpt-image` 実測） | UNKNOWN | **UNKNOWN-ACCEPTED** | 「OTOMO 絆カードの背景は制作者が生成 AI で作成」 | 同上 | 台帳 §3-D L176・§7-2 #9 |
| SE ×22（SE-01／02） | 自作（`scripts/gen-se.mjs` 数式合成。サンプル・録音・第三者素材・AI 音声 0） | プロジェクト所有 | **KNOWN** | 「効果音は自作（プログラム合成）」 | 「収録」「ボイス」と混同させる表現 | 台帳 §3-H L235-236 |
| BGM ×4（BGM-01〜04） | CEO 生成（Suno・ID3／C2PA 実測）・有料プラン時生成を CEO が確認（決定120）。プラン名・規約版は UNKNOWN-ACCEPTED | Suno 規約の版・確認日 **未記録** | **UNKNOWN-ACCEPTED** | 「BGM は制作者が Suno で生成」 | 「Suno 商用ライセンス取得済み」「著作権は制作者」（Suno 規約上の帰属保証なし・決定120） | 台帳 §3-I・`DECISIONS.md:275`・§7-1 A-4 |
| アイコン（ICON-01：favicon／apple-touch／192／512） | 自作（幾何＋zlib の決定論生成。外部素材・AI・フォント 0） | プロジェクト所有 | **KNOWN** | 「アイコンは自作」 | — | 台帳 §3-J ICON-01 |
| OGP 画像（OG-01） | AI 非生成加工（恵比寿 keyvisual-hero＋自作 favicon＋OS フォント） | 元画像（GOD-K-01）に従う | **UNKNOWN-ACCEPTED** | 「OGP 画像は自作合成（キービジュアルを含む）」 | 「完全自作」（keyvisual を含むため） | 台帳 §3-J OG-01 |
| 演出動画（VID-01：大耀 god-strike-v2.mp4＋poster） | CEO 生成（fal.ai `minimax/h3-max/image-to-video`・入力は Kit `taiyo:GOD_MAIN` 由来ポスター）＋非生成加工 | fal ToS 2026-09-08 ほか（AI 確認 2026-10-07）。**生成当時の版は UNKNOWN** | **CONDITIONAL**（fal は Output に権利主張なし §4(c)・顧客帰属の明文なし） | 「戦闘演出動画は制作者が生成 AI（fal.ai 上の MiniMax モデル）で作成」 | 「ライセンス取得済み」「商用利用権あり」（根拠はバッジ＋FAQ のみ）。MiniMax 深度合成マークの要否は UNKNOWN のため「表示義務なし」とも書かない | 台帳 §3-K・`ASSET_GENERATION_SERVICE_TERMS_AUDIT_ADDENDUM_FAL_MINIMAX.md` §0／§3 |
| 公式ボイス（VOICE-KIT-01・大耀 greeting）※ Lane 2 のみ | Kit 公式（無改変・3 者 sha256 一致） | 1.0.0（Updated 2026-10-08）・AI 確認 2026-10-09 | **KNOWN** | 「Creator Kit の配布音声をそのまま使用」「本作で制作した音声はありません」 | 本作側の自作音声を「公式」「公式ボイス」「公認」と書くこと（F5）。画面文言では「公式」自体を使わない（§7 テスト） | voice-pilot 台帳 §3-L L319/323 |
| 紹介動画（PV・決定265）※ ゲーム外・repo 未配信 | TTS 23 本＝fal `minimax/speech-2.6-hd`／Lip Sync＝fal `sync-lipsync/v2`／H3 演技素材再利用 | 決定265 行（`docs/d265-video-final-delivery` 分岐の `DECISIONS.md`）。規約状態は台帳に行なし | **台帳未記載**（ゲーム内では使用しない） | ゲーム内 Credits では**触れない**。PV 側に載せるなら「ナレーション・音声は AI 生成（非公式）」 | PV 内の AI 音声を「公式ボイス」「公認」と書くこと（F5）。神のキャラに lipsync した場合は特に注意 | d265 分岐 `DECISIONS.md` 決定265 行 |

**共通ルール（全行）**：UNKNOWN-ACCEPTED は「制作者が生成 AI で作成」とだけ書く。「権利クリア」「権利処理済み」「許諾済み」「公式」「公認」「提携」は全素材で禁止語（§7 テスト対象）。

---

## 4. Privacy／Feedback 文言（事実ベース）

### 4-1. 画面用文言（CM-03・最小）

> **プライバシー**
> 本作はアカウント登録を必要とせず、Cookie を使用しません。戦績・セーブ・設定などのデータは、お使いのブラウザ内（localStorage）にのみ保存され、本作が外部のサーバーへ送信することはありません。ブラウザのサイトデータを削除すると、これらの記録は失われます。
> 「フィードバック」機能は、画面の状態をテキストにまとめてクリップボードにコピーするだけで、自動送信は行いません。コピーした内容をどこへ送るかは、あなたが決めます。
> 結果画面の「挑戦状」も同様に、テキストをクリップボードへコピーするだけです。
> ランキング機能は現在稼働しておらず、プレイ内容がサーバーへ送られることはありません。
> ※ 本作はホスティングサービス（Vercel）上で配信されています。配信サーバー側の通常のアクセス記録については、本作のプログラムが収集・閲覧するものではありません。（この 1 文は CEO 確認：載せるか・表現）

### 4-2. 根拠（`src/` grep・2026-10-09 master）

| 主張 | 根拠 |
|---|---|
| 外部送信 0 | `fetch(` の使用は `src/components/battle/sound.ts:104` の 1 件のみで、取得先は同一オリジンの `SE_BASE_PATH = '/assets/se/'`（`sound.ts:92`）。`navigator.sendBeacon`・`XMLHttpRequest`・analytics・`gtag`・`document.cookie`・`Sentry` は src に 0 件。`package.json` に `@vercel/analytics`／`speed-insights`／`sentry` 依存なし。src 内の外部 URL は `SHARE_BASE_URL = 'https://seven-gods-game.vercel.app/'`（`shareText.ts:15`・自ドメイン・文字列生成のみ） |
| Cookie 0・アカウント 0 | `document.cookie` 0 件。認証・ログイン関連コード 0（CLAUDE.md §4「ランキング・アカウント（サーバー導入時。MVPではやらない）」） |
| localStorage のみ | キーは `sevengods.*` 13 本（`docs/STORAGE_VERSION_POLICY.md:14-26`・src grep で同一 13 キー確認：battleSave／daily／dailyRunLog／deckPreference／matchups／otomoBond／pendingRuns／quota／records／rewardBonuses／rewardHistory／stakes／tutorialSeen） |
| フィードバック＝コピーのみ | `FeedbackOverlay.tsx:18-22`（「クリップボードにコピーするだけ。送り先（Discord・…」）・`:32-33` `navigator.clipboard.writeText`・失敗時は手動コピー用テキストエリア（`:65-68`） |
| 挑戦状＝コピーのみ | `shareText.ts:43-44` `navigator.clipboard.writeText`。通常モードは `?seed=&stake=` を含む URL 文字列を生成（`shareText.ts:11`）。URL パラメータは `useGameEngine.ts:46/56/62` で**読むだけ** |
| Ranking 未稼働 | `src/core/data/rules.ts:260` `submissionEnabled: false`（コメント：送信先が存在しない・CEO 承認後に true）。`sevengods.pendingRuns` は READY-DORMANT（`STORAGE_VERSION_POLICY.md:20`）。`pendingRunStorage.ts`／`gameVersion.ts` に API・endpoint 文字列 0 |
| エラー送信 0 | `src/components/ErrorBoundary.tsx:28` は `console.error` のみ。CM-05（Sentry）は P2 未着手（`MASTER_BACKLOG_AUDIT.md:199`） |
| Vercel 側ログ | `MASTER_BACKLOG_AUDIT.md:177` RK-10 が「Vercel request log の IP」を Ranking 前提の表記課題として記載。本作コードは関与しない事実のみ書く |

### 4-3. 将来の差し替え点

| 将来の変更 | 差し替える文 | トリガー |
|---|---|---|
| Ranking 稼働（`submissionEnabled: true`） | 「ランキング機能は現在稼働しておらず…」→「神域挑戦の結果（行動ログ・匿名 ID）はランキング集計のためサーバーへ送信されます」＋保持期間・匿名 ID の説明（RK-10） | Phase 4.4・CEO 承認（`rules.ts:255-259`） |
| Sentry 等 error reporting（CM-05） | 「外部へ送信しません」→「エラー発生時に技術情報（画面名・エラー内容・ブラウザ種別）を送信します」。送信先サービス名を明記 | CM-05 着手（外部サービス＝CEO 判断 §6-3 #6） |
| Vercel Analytics／KPI（CM-06・RK-01） | Cookie 0・送信 0 の記述を撤回し、計測内容を列挙 | 方針は DO NOT START（`MASTER_BACKLOG_AUDIT.md:200`） |
| PWA／Service Worker（RL-09） | 「ブラウザ内にのみ保存」に「オフライン用キャッシュ」を追記 | P3 |
| テスト固定 | §7 の禁止語テストに「外部送信しません」の文が**存在すること**を追加し、上記変更時にテストが落ちて文言更新を強制する | 実装時 |

---

## 5. 問い合わせ先

| 探索先 | 結果 |
|---|---|
| `README.md` | Production URL のみ（`README.md:6`）。メール・SNS・フォーム記載なし |
| `index.html`・`site.webmanifest`・`src/components/setup/` | 問い合わせ先なし |
| `docs/ROADMAP_TO_RELEASE.md:64`・`:118`・`MASTER_BACKLOG_AUDIT.md:196` | 「問い合わせ先」は CM-02 の**未決項目**として列挙されているのみ |
| Kit ガイドライン L85（旧 §7→新 §8） | SGG 運営の窓口（公式 X の DM・公式 Discord・公式サイトの問い合わせフォーム）＝**SGG の窓口であり本作の窓口ではない**。本作の画面に SGG の窓口を載せない（なりすまし・誤認 F6） |

→ **結論：repo に本作の問い合わせ先は無い。「CEO 確認待ち」として空欄。** 画面には「お問い合わせ：（準備中）」の 1 行を置くか、ブロックごと省略する（§6 #2）。

---

## 6. CEO 確認待ち一覧

| # | 項目 | AI 推奨 | 仮に NO の場合の文言 |
|---|---|---|---|
| 1 | **文言 A／B の最終決定**（専門家確認の要否を含む） | 文言 A をそのまま画面へ・B は折りたたみ。専門家確認は「権利処理済み」等の断定を含まないため最小リスクだが、CM-02 の DoD（`ROADMAP_TO_RELEASE.md:118`「CEO／専門家承認の文言」）上は CEO 承認で足りるか CEO が決める | NO（専門家確認を先に）：画面は「クレジット：SEVENGODS（SGG）二次創作／SEVENGODS Games Creator Kit」と §4-1 プライバシーの 2 ブロックのみ先行表示し、素材出所の列挙は専門家確認後に追加 |
| 2 | **問い合わせ先**（メール／X／Discord／フォームのどれを載せるか・載せないか） | 専用メールアドレスか問い合わせフォーム 1 つ。個人の連絡先は載せない | NO（載せない）：ブロックを省略。「本作に関するお問い合わせは SGG 運営へは行わないでください」の 1 文だけ残す |
| 3 | **Suno 規約の版・プラン名**（UNKNOWN-ACCEPTED 維持か、再確認するか） | 維持。文言は「制作者が Suno で生成」のみ（§3） | NO（再確認する）：確認が取れるまで同じ文言。確認後も「商用ライセンス」等の断定は追加しない（Suno 規約に帰属保証なし・決定120） |
| 4 | **敵画像の扱い**（UNKNOWN-ACCEPTED の ChatGPT 生成 7 体を「制作者が生成 AI で作成」と表示して配信継続） | 継続（BLOCKED 0・F10） | NO（表示したくない）：素材出所の列挙を「本作の画像の一部は制作者が生成 AI で作成したものです」の 1 文に畳む（素材群名を出さない。ただし「人間製」とは書かない） |
| 5 | **VID-01（演出動画）の CONDITIONAL 受容** | 受容・文言は「生成 AI（fal.ai 上の MiniMax モデル）で作成」。fal サポートへの書面確認は任意 | NO（受容しない）：動画の行を削除し、`BattleResonanceCutin` の動画を poster 静止画フォールバックへ切り替える runtime 変更が別途必要（本書の範囲外・Fast Gate） |
| 6 | **SGG 運営への相談要否** | **相談を推奨**（公開前・ガイドライン L9／L83 の「迷ったら相談」）。理由：①タイトル「SEVEN GODS」が IP 名と同一（更新版 §5 は IP を「SEVEN GODS」と表記）②Home／OG の「SEVENDAO GAMES」が SGG 関連組織と誤認される余地（F6 なりすまし禁止）③Kit 公式ボイスを「そのまま」使うゲームは Kit v1.1 公開直後の先行例。相談しても「公式」表示は許可されない（F9）ので文言は変わらない | NO（相談しない）：文言 A の「SGG 運営による公式・公認・提携作品ではありません」を見出し直下に太字で置き、サブタイトルに「非公式ファンゲーム」を追加する（誤認リスクを文言側で下げる） |
| 7 | **「SEVENDAO GAMES」表記の扱い**（制作者名として Credits に載せるか） | 「制作：SEVENDAO GAMES」を載せ、同じ行に「SGG 運営とは別の個人制作スタジオです」を添える | NO：制作者名を載せず「制作者」とだけ書く |
| 8 | **Vercel アクセス記録の 1 文**（§4-1 末尾） | 載せる（事実であり、「送信 0」との整合を守る） | NO：削除。ただし「外部送信 0」は本作コードについての記述であることを「本作が」の主語で明示したまま残す |
| 9 | **PV（決定265）の AI 音声表記** | ゲーム内 Credits では触れない。PV 公開時は説明欄に「ナレーション・音声は AI 生成（SGG 公式ボイスではありません）」 | NO（表記しない）：F5 に抵触し得るため AI は非推奨。最低限「公式」「公認」を含む語を PV の説明に書かない |

---

## 7. 実装メモ（AI 向け・コードは書かない）

| # | 変更点 | 内容 | 根拠 |
|---|---|---|---|
| 1 | `src/components/setup/HomeScreen.tsx` `.home-links` | 3 つ目の `home-howto-button`「クレジット・権利表記」を追加（`onShowCredits` prop）。アイコンは既存 `TrophyIcon`／`HeartIcon` と同系の線画 1 つ（新規画像素材 0） | `HomeScreen.tsx:180-189` |
| 2 | `src/components/GameFlow.tsx` | `SetupScreen` union（`:32`）に `'credits'` を追加・`setupScreen === 'credits'` 分岐で `CreditsScreen` を描画・戻るで `'home'` | `GameFlow.tsx:32,268,291` |
| 3 | 新規 `src/components/setup/CreditsScreen.tsx` | 静的 JSX のみ。props は `onBack` と `buildLabel` 相当の版文字列。**storage 読み書き 0・fetch 0・外部リンク 0**（問い合わせ先が URL になる場合のみ `rel="noopener noreferrer"` の `<a>` 1 本）。見出し `h1`・`<details>` で文言 B を折りたたみ。Esc で戻る（A11y Minimum Pack の Tutorial と同じ扱い） | §1-2 |
| 4 | 文言の置き場 | 文言を JSX に直書きせず `src/components/setup/creditsText.ts`（純粋 TS・定数）に分離。テストと画面が同じ定数を参照する | §7 #6 のテスト対象を 1 ファイルに閉じる |
| 5 | `src/components/feedback/feedbackSnapshot.ts` | **要追加**：`SnapshotInput.setupScreen`（`:43`）と `FeedbackSnapshot.screen`（`:17`）に `'credits'`／`'クレジット'` を追加。現行の分岐は未知値を `'戦績'` にフォールバックする（`:62-76`）ため、追加しないと Credits 画面からのフィードバックが「戦績」と記録される | `feedbackSnapshot.ts:62-76` |
| 6 | テスト（vitest・ソース固定） | (a) `creditsText.ts` の全文字列に禁止語 **「公式」「公認」「提携」「権利クリア」「権利処理済み」「許諾済み」「ライセンス取得」「人間製」** が含まれないこと（ただし「公式・公認・提携作品ではありません」の否定文は許容するため、否定文を除外する正規表現 or 否定文を別定数にして個別検査）。(b) 必須文「非公式」「SEVENGODS（SGG）二次創作」「SEVENGODS Games Creator Kit」「外部へ送信しません」「localStorage」が存在すること。(c) `CreditsScreen.tsx` のソースに `localStorage`・`fetch(`・`navigator.sendBeacon`・`http` が無いこと（決定132 の「ソース文字列検査」と同方式）。(d) Lane 2 統合後は「本作で制作した音声はありません」の存在を `OFFICIAL_VOICES` のエントリ数 ≥1 と連動して検査 | `src/core/replay` の境界テスト方式（決定132） |
| 7 | Playwright 受入 | Home → Credits → 戻る（PC／SP375）。CLS 0・横スクロール 0・`home-version` と Credits の版表示が一致 | A11y Minimum Pack の受入と同型 |
| 8 | docs | `docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md` を更新版（Updated 2026-10-08）へ差し替え（Lane 2 と同じ内容・docs-only）／`docs/DECISIONS.md` に CM-02／03 行（AI 判断・CEO 承認文言の版を記録）／`docs/RELEASE_STATUS.md` の DoD #6 を更新 | `CREATOR_KIT_V1_1_AUDIT.md` §5-2 #2・`ROADMAP_TO_RELEASE.md:118` |
| 9 | やらないこと | 戦闘画面・結果画面・カットインへの表示追加／`src/core` 変更／新規画像・フォント素材／外部リンク（SGG 公式窓口を含む）／「権利クリア」系の断定 | §1-1・F6 |

---

## 付録：禁止語・必須語 一覧（テスト用）

| 区分 | 語 | 理由 |
|---|---|---|
| 禁止（肯定文で） | 公式／公認／提携／公式ボイス | F5・F6・F9 |
| 禁止 | 権利クリア／権利処理済み／許諾済み／ライセンス取得済み／商用利用権あり／著作権は制作者 | F10（UNKNOWN-ACCEPTED 56・CONDITIONAL 1）・決定120 |
| 禁止 | 人間製／手描き／オリジナルイラスト（生成 AI 素材に対して） | 台帳 §7-5 #1 |
| 許容（否定文のみ） | 「公式・公認・提携作品ではありません」「公式ボイスではありません」 | F4 L56・F5 |
| 必須 | 非公式／SEVENGODS（SGG）二次創作／SEVENGODS Games Creator Kit／生成 AI で作成／外部へ送信しません／localStorage | §2・§4 |
