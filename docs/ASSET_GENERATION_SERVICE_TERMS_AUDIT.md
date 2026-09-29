# 画像生成「既存サービス」利用規約監査（8 項目）

- 監査日：2026-09-27（公式ページ取得日も同日）
- 役割：docs-only リサーチ（AI 判断・CLAUDE.md §6-2）。**生成 API 呼び出し 0・画像生成 0・アップロード 0・サインイン 0・購入 0・runtime 変更 0・commit 0**
- 目的：`docs/PREMIUM_PHASE_JUDGMENT_2026-09-27.md` §6「(A) 生成サービスの利用規約の確認」（CLAUDE.md §6-3 #5）の判断材料を揃える。**法的結論は出さない**（決定194 P15）。公式文面に書いていないことは PASS にせず UNKNOWN とし、確認に必要なものを書く
- 引用は原文英語＋日本語要約。「推測」と書いた箇所以外は公式ページまたは repo 内ファイルの記録

---

## 0. 結論表

| # | 項目 | 判定 | 根拠（URL・版日付・要旨） |
| --- | --- | --- | --- |
| 1 | サービス名 | **PASS（特定済み）** | **ChatGPT（OpenAI・個人向け Web アプリ）の画像生成機能**。repo 記録（`docs/card-art-prompts.md:1-3`、決定32/37/41、`docs/ENEMY_VISUAL_BATCH_A.md:27-29`）に加え、原本 PNG に埋め込まれた C2PA マニフェストが `claim_generator = "OpenAI Media Service API"`、`softwareAgent name = "gpt-image", version = "2.0"` を記録（カード原本 25/56 枚・敵原本 3/3 枚・神キービジュアル原本 7/7 枚）。§1 参照 |
| 2 | 現在のプラン | **UNKNOWN（CEO INPUT）** | repo にプラン記録なし。公式 Pricing（https://openai.com/chatgpt/pricing/ 取得 2026-09-27）の個人プランは **Free / Go / Plus / Pro**、法人は **Business / Enterprise**（旧 Team は Business 表記）。プランで #6 の既定値が変わる（個人＝学習 ON 既定、Business/Enterprise/Edu/API＝学習 OFF 既定） |
| 3 | 確認した規約の日付／版 | **PASS（記録済み）** | Terms of Use **Effective: January 1, 2026**／Usage Policies **Effective: October 29, 2025**／Privacy Policy **Updated: July 30, 2026**／Business Terms **Updated: December 1, 2025・Effective: January 1, 2026**／Sharing & publication policy **Updated: November 14, 2022**／How your data is used（policies 版）**Updated: March 13, 2026**／Enterprise privacy **Updated: January 8, 2026**／Help Center 各記事は相対日付（§2-3 に換算値）。全 URL は §2-3 と `scripts/asset-terms-audit/excerpts.md` |
| 4 | 商用ゲームへの生成物利用可否 | **PASS（規約上の権利譲渡あり）＋ 法的留保** | Terms of Use「Ownership of content」: *"you (a) retain your ownership rights in Input and (b) own the Output. We hereby assign to you all our right, title, and interest, if any, in and to Output."*（法の許す範囲）。商用利用を禁じる条項なし（個人向け Terms・Usage Policies とも）。ただし「Similarity of content」（他ユーザーが類似 Output を受け取り得る）と、**AI 生成物の著作権保護は各国法上不確実**（米国著作権局 Part 2 報告 2025-01-29）は残る＝規約 PASS／法的保護は UNKNOWN |
| 5 | Kit 公式画像を参照画像として入力できるか | **PASS（両側の文面あり）** | サービス側：Terms「You represent and warrant that you have all rights, licenses, and permissions needed to provide Input」＋ Usage Policies「attempts to infringe on intellectual property rights of others」禁止。Kit 側：ガイドライン §2「生成AIサービスへの入力、プロンプトや参照画像としての使用、画像編集、生成補助」を許可（`docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md:28`）。**ただし #6 の学習既定と Kit §2「利用するAIサービスの規約…を守ってください」により、学習 OFF の状態で入力するのが安全側** |
| 6 | 入力画像が学習・モデル改善に利用される条件 | **NG（既定のまま）／PASS（対策後）— 現状は UNKNOWN（CEO INPUT）** | Help「How your data is used…」（Updated 21 hours ago＝2026-09-26 相当）: *"When you use our services for individuals, such as ChatGPT and Codex, we may use your content to train our models."* 個人プラン（Free/Go/Plus/Pro）は **既定 ON**。OFF にする手段：(a) Settings > Data controls > **Improve the model for everyone** を OFF、(b) Privacy Portal「Do not train on my content」、(c) **Temporary chat**（一時的な間は学習不使用・30 日で削除）。Business/Enterprise/Edu/API は**既定 OFF**。画像も同じ扱い（Image Inputs FAQ: *"Our approach to using content, including images, remains the same"*）。**過去に生成したときの設定は repo に記録なし → CEO INPUT** |
| 7 | 生成物の権利／利用許諾 | **PASS（条件付き）** | 権利：#4 の譲渡条項。制限：*"Represent that Output was human-generated when it was not"* 禁止、*"Use Output to develop models that compete with OpenAI"* 禁止、*"Automatically or programmatically extract data or Output"* 禁止。**帰属表示（attribution）義務は個人向け Terms に記載なし**（Sharing & publication policy は「AI 生成であることを明示」「自分の名前／会社名に帰属」を求めるが、同ポリシーは 2022 年版で API／SNS 共有・出版物を対象にした文面）。保証：*"AS IS"*、非侵害保証なし、個人向けには IP 補償（indemnity by OpenAI）なし（Business Terms 13.1 には OpenAI 側の IP 補償あり） |
| 8 | 商用ゲーム asset としての制約（統合） | **PASS（条件付き）／開示は UNKNOWN** | (a) Usage Policies：IP 侵害・なりすまし・実在人物の likeness 無断使用・性的／残虐表現などの禁止（Kit §5 と同方向）。(b) Kit §5：ほぼ未改変の再配布禁止・公式誤認表示禁止・なりすまし禁止。(c) 「人間が作ったと表示しない」（OpenAI Terms）。(d) **AI 生成の開示義務**：OpenAI 個人向け Terms に「ゲーム内で AI 生成と表示せよ」という条項は**ない**（Sharing & publication policy は文章出版・SNS 向け）。Web 配信（Vercel）の現行形態では Google Play／App Store の AI 方針は**未適用**（Play の AI-Generated Content policy は「アプリ内で AI 生成する機能」を対象）。ストア配信時の開示要否は **UNKNOWN**。(e) C2PA：ChatGPT 生成画像は C2PA＋SynthID を持つ（公式）。repo の原本 PNG には残存、**配信用 WebP には残っていない**（再エンコードで除去＝公式も「file conversions で除去され得る」と記載。SynthID 透かしは残る可能性あり） |

**総合：規約面は「READY 条件付き」。ブロッカーは #2・#6 の CEO INPUT（プランと学習設定）のみ。** §4 参照。

---

## 1. 特定した「既存サービス」と repo 内の証拠

### 1-1. docs の記録（path:line）

| 証拠 | 内容 |
| --- | --- |
| `docs/card-art-prompts.md:1-3` | 「カードイラスト生成プロンプト集（ChatGPT用）」「ChatGPT（Web版）に貼るプロンプト集」 |
| `docs/battle-fx-prompts.md:1-3` | 「（ChatGPT/Gemini用）」「ChatGPT（Web版）またはGeminiに貼って生成し」。進捗（決定41）：背景・FX 6 種を「生成・組み込み完了」 |
| `docs/god-portrait-prompts.md:1` | 「（ChatGPT/Gemini用）」 |
| `docs/ENEMY_VISUAL_BATCH_A.md:27-29` | source ファイル名 `ChatGPT Image 2026年8月23日 06_14_42.png`（datenshi）／`…8月23日 07_59_42.png`（karakuri）／`…8月24日 00_11_33.png`（doukeshi）。ChatGPT Web のダウンロード命名規則 |
| `docs/DECISIONS.md:174`（決定32） | 「CEOがChatGPTで生成した7体分のキャラクターイラスト」 |
| `docs/DECISIONS.md:182`（決定37） | 「CEOがChatGPT（Web）でカード4枚を2×2または横並びの1シート画像として生成」 |
| `docs/DECISIONS.md`（決定41） | 「CEOがChatGPTで生成した実アセット（背景・スキルエフェクト・神6柱の立ち絵）を組み込んだ」 |
| `docs/DECISIONS.md:190`（決定31 行） | 「実イラスト素材（CEOがChatGPT/Gemini等で生成予定）」＝計画段階の表現 |
| `docs/DECISIONS.md:275`（決定120） | BGM は **Suno**（画像ではない。有料プラン時の生成を CEO が確認済み） |
| `docs/DECISION204_LIVING_HERO_LAYER_ARCHITECTURE_AUDIT.md:143` | `ebisu-env.mp4/.webm` は **fal**（H3 動画・model/version 未記録）。**動画であり本監査の画像スコープ外**、規約確認は未了のまま |
| `docs/PREMIUM_PHASE_JUDGMENT_2026-09-27.md:75` | カード 60 枚「CEO が ChatGPT で生成（決定37）」台帳「△（サービス版・日付・規約未記録）」 |

**Gemini／Sora／DALL·E／gpt-image／4o の記録**：`docs/` を grep した結果、Gemini は上記の「ChatGPT/Gemini用」「ChatGPT/Gemini等で生成予定」という**選択肢としての言及のみ**で、**Gemini で生成した asset の記録は 1 件もない**。Sora・DALL·E・gpt-image・4o の記述は **0 件**。**CEO のプラン（Free/Plus/Pro/Team）、使用モデル、規約の版日付を記した doc も 0 件**（`docs/ASSET_RIGHTS_LEDGER.md` は未作成）。

### 1-2. 原本ファイルの C2PA マニフェスト（今回新規に確認・本監査の決定的証拠）

`art-source/` と `public/assets/` の全画像ファイルをバイナリ走査（読み取りのみ）した結果：

| ディレクトリ | 枚数 | C2PA あり | claim_generator | softwareAgent | 記録日（`when`） |
| --- | --- | --- | --- | --- | --- |
| `art-source/cards/*.png` | 56 | **25** | `OpenAI Media Service API` | `gpt-image` v`2.0` | 2026-08-04 ほか |
| `art-source/enemies/{datenshi,karakuri,doukeshi}-source.png` | 3 | **3** | 同上 | 同上 | 2026-08-22／08-22／08-23 |
| `art-source/reference/gods/*-keyvisual.png` | 7 | **7** | 同上 | 同上 | 2026-08-18〜08-19 |
| `art-source/otomo/**`、`art-source/enemies/*-restoration-pilot/` | 39 | 0 | — | — | — |
| `public/assets/**`（配信用 webp/jpg/png 全 156 枚） | 156 | **0** | — | — | — |

- `digitalSourceType = http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia`（AI 生成メディア）
- 31 枚のカード原本に C2PA がないのは、決定37 の「2×2 シートを System.Drawing で 4 分割→再保存」でメタデータが落ちたためと**推測**（C2PA が残る 25 枚は単体で保存されたもの、と推測）
- 配信用 `public/assets/**` は WebP／JPEG 再エンコードを経ており C2PA は**残っていない**。OpenAI 公式も *"Metadata … can sometimes be removed by platforms, editing tools, or file conversions."* と記載。SynthID 透かしは「some edits or transformations を通じて残り得る」と記載されるため、配信画像に残っている可能性は**あるが未確認**
- OTOMO 素材（`art-source/otomo/**`）は SGG Creator Kit 公式素材（`docs/assets-kit/manifest.json`）であり生成物ではない

**結論**：これまでの画像 asset（カード・敵・神キービジュアル・背景・FX）の生成元は **OpenAI ChatGPT（個人向け Web）画像生成、モデルは gpt-image 系**である。Help Center「Images in ChatGPT」（Updated 17 days ago ≒ 2026-09-10）は現行を「ChatGPT Images 2.5」と表記し、**DALL·E は ChatGPT から退役済み**（*"we’ve retired the official DALL·E GPT from ChatGPT"*）。

---

## 2. 各項目の詳細

### 2-1. サービス名・製品面・モデル

- サービス：**ChatGPT**（OpenAI OpCo, LLC・個人向け Terms of Use の対象。*"These Terms of Use apply to your use of ChatGPT, DALL·E, and OpenAI’s other services for individuals"*）
- 製品面：ChatGPT Web の画像生成（Help「Images in ChatGPT」: *"ChatGPT Images lets you create new images and edit existing images in ChatGPT … You can also upload an existing image and describe the changes you want ChatGPT to make."* / *"ChatGPT Images is available on all tiers."*）
- モデル：C2PA 記録より `gpt-image` v2.0（2026-08 時点）。現行の公式表記は「ChatGPT Images 2.5」。**過去のどのバッチがどのモデル版かは C2PA を持つ 35 枚のみ確定、他は UNKNOWN**

### 2-2. 現在のプラン（CEO INPUT）

- 公式 Pricing（2026-09-27 取得）：個人 **Free**（*"Limited and slower image generation"*）／**Go**（*"More image creation"*、*"This plan may include ads"*）／**Plus**（*"More complex and accurate image creation"*）／**Pro**（*"Unlimited and faster image creation"*）。法人 **Business／Enterprise／Higher Education**。価格は JS 描画のため取得テキストに含まれず（未記録）
- プランが他項目に与える影響：
  - #6 学習既定：**Free/Go/Plus/Pro＝ON 既定**（Help 8983130: *"If you are on a ChatGPT Plus, ChatGPT Pro or ChatGPT Free plan on a personal workspace, data sharing is enabled for you by default"*）／**Business/Enterprise/Edu/API＝OFF 既定**
  - #4・#7 権利：個人向け Terms と Business Terms の譲渡条項は同旨。**IP 補償は Business Terms のみ**（13.1）
  - Go プランには広告あり（Privacy Policy: Free/Go ユーザーへの広告パーソナライズ）

### 2-3. 確認した規約の日付／版（取得日 2026-09-27）

| 文書 | URL | 版日付（ページ記載） |
| --- | --- | --- |
| Terms of Use（個人向け） | https://openai.com/policies/terms-of-use | **Effective: January 1, 2026**（Published: January 1, 2026） |
| 同 日本語版 | https://openai.com/ja-JP/policies/terms-of-use/ | 2026年1月1日発効 |
| Europe Terms of Use（参考） | https://openai.com/policies/eu-terms-of-use/ | （取得のみ・本件は日本居住のため米国版が適用と**推測**） |
| Usage Policies | https://openai.com/policies/usage-policies/ | **Effective: October 29, 2025**（Changelog 2025-10-29「universal set of policies across OpenAI products」） |
| Privacy Policy | https://openai.com/policies/privacy-policy/ | **Updated: July 30, 2026** |
| Business Terms（比較用） | https://openai.com/policies/business-terms | **Updated: December 1, 2025 / Effective: January 1, 2026** |
| Sharing & publication policy | https://openai.com/policies/sharing-publication-policy/ | **Updated: November 14, 2022**（現存。Terms から参照されている） |
| How your data is used to improve model performance（policies 版） | https://openai.com/policies/how-your-data-is-used-to-improve-model-performance/ | **Updated: March 13, 2026** |
| Enterprise privacy | https://openai.com/enterprise-privacy/ | **Updated: January 8, 2026** |
| Help: How your data is used… | https://help.openai.com/en/articles/5722486 | Updated: 21 hours ago（≒ 2026-09-26） |
| Help: Data controls in ChatGPT | https://help.openai.com/en/articles/7730893 | Updated: 3 hours ago（≒ 2026-09-27） |
| Help: Temporary chat in ChatGPT | https://help.openai.com/en/articles/8914046 | Updated: 8 days ago（≒ 2026-09-19） |
| Help: keep history on but disable training | https://help.openai.com/en/articles/8983130 | Updated: 26 days ago（≒ 2026-09-01） |
| Help: Provenance signals (C2PA, SynthID) | https://help.openai.com/en/articles/8912793 | Updated: 30 days ago（≒ 2026-08-28） |
| Help: Images in ChatGPT | https://help.openai.com/en/articles/11084440 | Updated: 17 days ago（≒ 2026-09-10） |
| Help: ChatGPT Image Inputs FAQ | https://help.openai.com/en/articles/8400551 | Updated: last month |
| ChatGPT Pricing | https://openai.com/chatgpt/pricing/ | 日付記載なし |

画像生成専用の別規約（"Images terms" 等）は Terms／Usage Policies／Help 内に**見当たらなかった**（DALL·E 時代の "Can I sell images I create with DALL·E" 記事 6425277 は **404**＝廃止）。旧「Content Policy」も現行 Usage Policies に統合済み（Changelog 2023-02-15）。

### 2-4. 商用ゲームへの生成物利用可否

原文（Terms of Use, Content）：
> **Ownership of content.** As between you and OpenAI, and to the extent permitted by applicable law, you (a) retain your ownership rights in Input and (b) own the Output. We hereby assign to you all our right, title, and interest, if any, in and to Output.
>
> **Similarity of content.** Due to the nature of our Services and artificial intelligence generally, output may not be unique and other users may receive similar output from our Services. Our assignment above does not extend to other users’ output or any Third Party Output.

要約：OpenAI は Output に関する自社の権利を（あるとすれば）ユーザーに譲渡する。商用利用の制限条項は**ない**。ただし (1) "if any"＝OpenAI 自身が権利を持つとは限らない、(2) 他ユーザーが類似 Output を得ても排他できない、(3) *"AS IS"* で非侵害保証なし。

法的留保（PASS/FAIL ではなく不確実性として記録）：米国著作権局 *Copyright and Artificial Intelligence, Part 2: Copyrightability*（2025-01-29、https://www.copyright.gov/ai/）は、プロンプト入力のみでは著作者性を認めず、人間による選択・配列・改変部分に限り保護対象とする立場。日本は文化庁「AIと著作権に関する考え方について」（2024-03）が同様に「創作的寄与」を要件とする（本監査では一次文書未取得・**要確認**）。→ **生成画像そのものの独占（第三者の模倣を止める力）は保証されない**。SEVEN GODS の商用利用（自ら使う）には障害にならないが、素材の独自性を守るのは Kit キャラクター側の権利（SGG）と、CEO 側の加工・選択・構成に依る。

### 2-5. Kit 公式画像を参照画像として入力できるか

サービス側：
> You are responsible for Content, including ensuring that it does not violate any applicable law or these Terms. **You represent and warrant that you have all rights, licenses, and permissions needed to provide Input to our Services.**（Terms of Use, Your content）
>
> …you cannot use our services for: … destruction, compromise, or breach of another’s system or property, including malicious or abusive cyber activity or **attempts to infringe on intellectual property rights of others**（Usage Policies, Protect people）

要約：第三者画像の入力は、ユーザーが必要な権利・許諾を持っていれば可（明示的な禁止なし）。「ライセンスされた著作物のアップロード」を個別に扱う条項は**ない**＝一般条項に帰着。

Kit 側（`docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md`）：
> ## 2. 許可していること … - 生成AIサービスへの入力、プロンプトや参照画像としての使用、画像編集、生成補助 / - AIモデルの学習、追加学習、ファインチューニングなど、二次創作を行うためのAI利用
>
> AIを利用した場合も、生成物と公開方法についての責任は制作者にあります。利用するAIサービスの規約、第三者の権利、適用法令を守ってください。
>
> 学習済みモデル、LoRA、学習データセットそのものを第三者へ配布または販売する場合は … 事前にSGG運営へご相談ください。

要約：Kit は参照入力を明示的に許可。ただし「AIサービスの規約を守る」責任は制作者。**個人プランの学習 ON 既定のまま Kit 画像を入力すると、Kit 画像が OpenAI の学習データに入り得る**（§2「AIモデルの学習…二次創作を行うためのAI利用」は制作者自身の学習を許すもので、第三者＝OpenAI の汎用学習まで明示的に許すとは読めない・**解釈**）。→ #6 対策とセットで PASS。

### 2-6. 入力画像が学習・モデル改善に利用される条件（本監査の最大リスク）

原文（Help 5722486, 2026-09-26 相当）：
> **Services for individuals** — When you use our services for individuals, such as ChatGPT and Codex, we may use your content to train our models. You can choose whether your conversations help improve our models. To opt out, turn off **Improve the model for everyone** under Settings > Data controls in ChatGPT, or select **Do not train on my content** in our Privacy Portal. … After you opt out, we won’t use your new conversations to improve our models.
>
> **Temporary chats** — Temporary chats are not used to improve OpenAI models while they remain temporary … If you save a temporary chat, it becomes a regular chat and follows your account’s personalization and model-improvement settings.
>
> **Business services and managed workspaces** — By default, we don’t use inputs or outputs from ChatGPT Business, ChatGPT Enterprise, ChatGPT Edu, or our API to improve our models.
>
> **FAQ** — If you proactively choose to submit feedback, such as by selecting thumbs up or thumbs down on a response, the entire conversation associated with that feedback may be used to improve our models, even if you’ve opted out.

原文（Help 8983130）：
> If you are on a ChatGPT Plus, ChatGPT Pro or ChatGPT Free plan on a personal workspace, data sharing is enabled for you by default, however, you can opt out …

原文（Help 8400551 Image Inputs FAQ）：
> Are my images used to improve your models? Our approach to using content, including images, remains the same for each product. … For ChatGPT Enterprise, we do not use content to train our models.

原文（Help 7730893 Data controls）：
> When Improve the model for everyone is off, your new conversations won’t be used to train OpenAI models. … Temporary chat … may be retained for up to 30 days for safety purposes

要約：
- 個人プラン：**既定で学習に使われる**。OFF は「新しい会話」からのみ有効（遡及しない）。OFF でも thumbs up/down を押すとその会話全体が学習対象
- Temporary chat は学習不使用（保存すると設定に従う。アップロード画像は保存時に Library に入り得る）
- Business/Enterprise/Edu/API は既定 OFF
- **CEO の過去バッチ（2026-08-04〜08-24）の設定状態は repo に記録がなく UNKNOWN**。既定 ON のままなら、そのときの Kit 参照画像（神キービジュアル生成で `public/assets/gods/*/main.webp` 等を参照に使った可能性・**推測**）と生成物は学習対象だった可能性がある → Kit §7「AI利用」の相談対象になり得る

### 2-7. 生成物の権利／利用許諾（制限一覧）

Terms of Use「What you cannot do」より：
> - Use our Services in a way that infringes, misappropriates or violates anyone’s rights.
> - Automatically or programmatically extract data or Output (defined below).
> - **Represent that Output was human-generated when it was not.**
> - **Use Output to develop models that compete with OpenAI.**

- 帰属表示：個人向け Terms・Usage Policies に **attribution 義務なし**。Sharing & publication policy（2022）は SNS 共有・API 共著出版に「自分の名前／会社名に帰属」「AI 生成であることを見逃しようのない形で表示」を求めるが、ゲーム asset への適用は文面上明確でない（**UNKNOWN・保守的には本則に従う**）
- 保証・補償：*"OUR SERVICES ARE PROVIDED 'AS IS' … DISCLAIM ALL WARRANTIES INCLUDING … NON-INFRINGEMENT"*。個人向けに OpenAI からの IP 補償はない。個人向け Indemnity 条項は「If you are a business or organization」に対してユーザー側が OpenAI を補償する片務
- 名称・ロゴ：*"You may only use our name and logo in accordance with our Brand Guidelines"*（ゲーム内で「OpenAI」「ChatGPT」ロゴを使う場合のみ関係）

### 2-8. 商用ゲーム asset として使う際の制約（統合）

| 制約源 | 内容 | SEVEN GODS への当てはめ |
| --- | --- | --- |
| OpenAI Usage Policies（2025-10-29） | IP 侵害試行、なりすまし、実在人物の likeness 無断使用、性的暴力・残虐、未成年の性的描写 等の禁止 | Kit キャラクターは許諾済み（§2）。神・OTOMO は架空。Kit §5 と同方向で、現行 asset に抵触事由なし（**目視監査は本監査の範囲外**） |
| OpenAI Terms | 人間製と偽らない／Output で競合モデルを作らない | 「手描き」と表示しない。学習利用しない |
| Kit §5 | ほぼ未改変の再配布・素材集販売禁止／公式・公認誤認表示禁止／なりすまし禁止 | 生成物は加工済みの二次創作。「公式」「公認」を名乗らない。クレジット（§4）は任意 |
| Kit §7 | 迷ったら公開前に運営へ相談（AI 利用・公開場所を明記） | **#6 が既定 ON のまま Kit 画像を入力した過去がある場合は相談対象になり得る** |
| AI 生成の開示 | OpenAI 個人向け Terms に「製品内で AI 生成と表示せよ」の条項なし。Sharing & publication policy は出版・SNS 向け。Google Play「AI-Generated Content policy」は**アプリ内で AI 生成する機能**を対象（asset 静的利用は対象外と読める）。App Store は未取得 | 現行は Web（Vercel）配信＝ストア方針未適用。**開示要否は UNKNOWN**。安全側の推奨：クレジット画面に「一部画像は生成 AI（OpenAI ChatGPT）を用いて制作」＋ Kit §4 のクレジットを併記（義務ではなく任意） |
| C2PA／SynthID | 公式：*"Supported images generated with ChatGPT, Codex, and the OpenAI API include both signals."* *"Metadata … can sometimes be removed by platforms, editing tools, or file conversions."* | 原本 PNG に C2PA 残存（35 枚）。配信 WebP には無し（再エンコード）。**意図的に除去したのではなく変換の副作用**。原本は台帳の証拠として保全価値あり |

---

## 3. CEO INPUT（CEO しか埋められない項目）

| # | 項目 | 用途 |
| --- | --- | --- |
| C1 | **ChatGPT のプラン**（Free / Go / Plus / Pro / Business / Enterprise）— 2026-08 の生成時と現在 | #2・#6 の既定値確定。Business 以上なら #6 は既定 PASS |
| C2 | **Data controls「Improve the model for everyone」の現状**（ON/OFF）と、**2026-08-04〜08-24 の生成時の状態**（覚えていなければ「不明」で可） | #6 判定。OFF の証跡（設定画面のスクリーンショット、決定120 の Suno と同じ運用） |
| C3 | 生成時に **Temporary chat** を使ったか | #6 の代替根拠 |
| C4 | **Kit 公式画像を参照画像としてアップロードしたか**（どの asset で・どのファイルを）— 神キービジュアル 7 枚・OTOMO 等 | #5・Kit §7 相談要否 |
| C5 | Terms of Use（2026-01-01 版）に同意した／継続利用している日付（アカウント作成日で可） | 台帳 Terms Version 欄 |
| C6 | 過去の生成に使ったモデル表記（ChatGPT の UI に出ていた名称。不明なら C2PA の `gpt-image 2.0` を採用） | 台帳 Model-Service 欄 |
| C7 | thumbs up/down フィードバックを Kit 画像を含む会話で送った記憶の有無 | #6 例外条項 |
| C8 | 今後の生成で **課金変更が必要か**（現在の枠で足りるか） | §6-3 #4 |

---

## 4. READY／BLOCKED 判定材料

### 【ASSET GENERATION READY】の条件（すべて満たす）

1. **C1＋C2 が確定**し、次のいずれか：(a) Business/Enterprise 等の既定 OFF プラン、(b) 個人プランで「Improve the model for everyone」OFF を**証跡付きで確認**、(c) 生成セッションを **Temporary chat** で行う運用を決める（保存しない・thumbs を押さない）
2. 台帳 `docs/ASSET_RIGHTS_LEDGER.md`（未作成）の 1 行目に「Service: OpenAI ChatGPT Images（gpt-image）／Plan／Terms: Terms of Use 2026-01-01・Usage Policies 2025-10-29・Privacy 2026-07-30／Training: OFF（証跡）／Date」を記入
3. Kit 参照入力は #6 対策済みの状態でのみ行う（Kit §2 の許可＋「AIサービスの規約を守る」の両立）
4. 生成物は「人間製」と表示しない。クレジット表記（任意）を決める

### BLOCKED のまま残るもの

- **C1／C2 が未回答**の間は、Kit 画像の新規アップロードは行わない（学習 ON 既定のリスク）。文章プロンプトのみの生成は規約上の障害なし（identity が落ちるのは既知）
- **過去バッチが学習 ON のまま Kit 画像を入力していた**と判明した場合：規約違反ではない（Kit §2 が入力を許可、OpenAI 側も許諾済み入力は可）が、Kit §7「AI利用…判断に迷う場合は相談」に該当し得る → **AI 推奨：SGG 運営へ「参照入力に使った素材・サービス名・学習設定・公開場所」を添えて事前相談**（CEO 判断・§6-3 #5）
- 著作権保護の不確実性（§2-4）は解消不能。台帳に「AI 生成・人間による加工／選択あり」を記録して受容する

### AI 推奨（判断は CEO）

**READY（条件付き）**。理由：規約 8 項目のうち、文面で確認できないものは「プラン」「学習設定の現状」の 2 つだけで、どちらも CEO が 5 分で確認・設定できる（設定 OFF は無料・即時）。新規課金は不要。文章のみの生成は今日から可能、Kit 参照入力は C1/C2 確定後。

---

## 5. リスクと反証

| リスク | 反証・緩和 |
| --- | --- |
| 個人プラン既定 ON のまま Kit 画像を入力した過去がある | 規約違反ではない（両側で許諾）。Kit §7 の相談で解消可能。OFF は遡及しない（Help: "new conversations"）ので過去分は残る |
| 生成画像の著作権が薄い（第三者の模倣を止めにくい） | Kit キャラクター自体の権利は SGG にあり、模倣者も Kit ガイドラインに縛られる。SEVEN GODS の独自性は構成・演出・カード設計側で担保 |
| 「Similarity of content」で他ユーザーが似た絵を得る | 参照画像＋独自プロンプト（`docs/card-art-prompts.md` 等）で希少化。完全排他は不可能と受容 |
| Sharing & publication policy（2022）を厳格に読むと AI 生成の明示が要る | 同ポリシーは API 共著出版・SNS 向け文面で、ゲーム asset への適用は不明。**任意でクレジット表記**すれば両解釈で安全 |
| 配信 WebP に C2PA が無い＝「provenance を消した」と見られる | 意図的除去ではなく変換の副作用（公式も想定）。原本 PNG（C2PA 付き）を `art-source/` に保全済み。SynthID は残存し得る |
| Help Center 記事は相対日付で「版」が固定できない | 取得日と相対日付を併記（§2-3）。`scripts/asset-terms-audit/excerpts.md` に原文を保存 |
| fal（H3 動画）の規約は未確認 | 本監査の画像スコープ外。動画は決定219 で NO-GO・未使用のため現時点の公開リスクなし（使う場合は別監査） |
| Gemini を使った asset があるかもしれない | docs に記録なし・原本 PNG の C2PA は全て OpenAI。**Gemini 生成の証拠は 0**。参考として Google ToS（Effective July 30, 2026）は「Google won’t claim ownership over that content」「misleading others into thinking that generative AI content was created by a human」禁止、Gemini Apps は Keep Activity ON 既定で学習・人手レビュー対象（Privacy Hub Last updated: September 24, 2026）。将来使うなら同じ 8 項目で別監査 |
| 本監査は AI による規約読解であり法的助言ではない | 決定194 P15 のとおり法的結論は出さない。必要なら専門家確認 |

---

## 付記：本監査で行っていないこと

- 生成 API 呼び出し・画像生成・画像や素材のアップロード・サインイン・購入・課金変更：**0**
- runtime／assets／tests の変更：**0**。作成ファイルは本書と `scripts/asset-terms-audit/excerpts.md` のみ
- commit：**0**

---

## 6. 判定の更新（2026-09-27・CEO INPUT 受領後）— **【ASSET GENERATION READY】（After-2『豪快な一撃』1 枚に限る）**

| READY 条件（§4） | 状態 | 根拠 |
|---|---|---|
| 1. C1＋C2 の確定 | **満たす** | C1 プラン＝**Plus**（個人プラン）。C2「モデル改善に協力する」＝**2026-09-27 に OFF・OFF 状態のスクリーンショット確認済み**（(b) に該当）。今後の Kit 参照生成は OFF 維持（CEO 方針） |
| 2. 台帳 1 行目の記入 | **満たす** | `docs/ASSET_RIGHTS_LEDGER.md` §2 CARD-NEXT-01：Service／Plan／Terms 版／Training OFF（日付）を記入済み。Generation date・添付実績・sha256 は生成後 |
| 3. Kit 参照入力は #6 対策済みの状態でのみ | **満たす（運用）** | 添付は Kit 公式 `GOD_MAIN`／`GOD_FRONT`（manifest sha256 一致・◎）に限定。出所 UNKNOWN の keyvisual は添付しない |
| 4. 「人間製」と表示しない・クレジット任意 | **満たす** | 台帳 Attribution 列に記録。ゲーム内表示の方針は Launch Gate（Rights）で別途 |

- **過去（2026-08）の学習設定・Temporary chat は UNKNOWN のまま記録**（CEO 指示：推測で補完しない）。過去バッチに関する Kit §7 相談の要否は §4 のとおり CEO 判断として保留（After-2 の READY 判定には影響しない：After-2 は OFF 状態で新規に生成するため）
- 判定の範囲：**After-2 の 1 枚**。敵 7 体などの次の生成は台帳の新規行＋同じ 4 条件の確認を都度行う
- 画像生成は **CEO の最終承認（プロンプト・参照画像・保存仕様）を得るまで開始しない**
