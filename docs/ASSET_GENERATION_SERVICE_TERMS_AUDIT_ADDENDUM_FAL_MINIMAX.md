# 生成サービス利用規約監査 補遺 — fal.ai ＋ MiniMax（VID-01 God Strike v2・大耀）

- 監査日／公式ページ取得日：**2026-10-07**（Infra/Rights・docs-only・AI 判断 CLAUDE.md §6-2）
- 禁止事項の遵守：API 呼び出し 0・サインイン 0・購入 0・runtime 変更 0・commit 0。sha256 は読み取り専用で算出
- 対象：`public/assets/gods/taiyo/god-strike-v2.mp4`（166,058B）＋ `god-strike-v2-poster.webp`（61,866B）。PRODUCTION LIVE 2026-09-30【docs：決定250 §9】。生成＝fal.ai `minimax/h3-max/image-to-video`・request_id `01a0ed24-623b-7e22-8acf-b4feb0e13b74`・768P・5s・seed 250・表示価格 $0.20・2026-09-29T12:29:35Z 送信【docs：`docs/evidence/decision250/try2/try2_request.json`・`try2_response.json`】。入力画像＝Kit 正典 `taiyo/main.webp` 系ポスター（1024² PNG・sha256 `57eabb31…`）。Kling Try1 素材は Production 不使用（v1 mp4 削除済み）【docs】
- 法的認定は行わない（決定194 P15）。公式文面に無いことは PASS にしない。第三者ブログは「参考・非確定」のみ
- **適用関係の前提**：CEO の契約相手は **fal.ai のみ**（FAL_KEY 課金）。MiniMax とは直接契約なし。fal モデルページは「fal's H3 Max is a post-trained variant of MiniMax H3 … co-optimized with our custom inference stack」（fal 自社推論）と記し、MiniMax 規約へのリンクは無い。fal ToS §14(b) は第三者モデルに「additional terms … may apply」とだけ言う。よって **MiniMax 列は「参考（拘束力 UNKNOWN）」**

URL キー（全文 §4）：F1 fal ToS／F2 fal Privacy／F3 fal AUP／F4 fal API Services／F5 fal DPA／F6 fal FAQ／F7 fal モデルページ／M2 MiniMax Open Platform ToS／M3 Hailuo Video ToS／M4 Hailuo Privacy

---

## §0 結論表

| 項目 | fal.ai | MiniMax（参考・直接契約なし） |
|---|---|---|
| 商用利用 | **CONDITIONAL** — F7 バッジ「Commercial use」＋F6 "Most models on fal are available for commercial use and are marked with a `Commercial use` badge"（多くのモデルは商用可、バッジで示す）。ToS 本文に Output の商用許諾条項は無い。F1 2026-09-08／F6 日付なし。取得 10-07 | **CONDITIONAL** — M2「you retain your ownership rights in Client input and generated content」（入力・生成物の所有権は顧客に残る）。商用禁止条項なし。※M3（Hailuo Web 版）は "must not access or use for any commercial purposes any part of the Services"（サービス自体の商用利用禁止）だが本件経路外。M2 Eff. 2026-03-30／M3 2026-08-19。取得 10-07 |
| 出力の所有権・ライセンス | **UNKNOWN** — F1 §4(c) "Company does not … entitle Company to any intellectual property rights in any Output Content"（fal は Output に権利を主張しない）。**顧客に帰属・許諾する文は無し**（§6(b) は Customer Input のみ）。F1 2026-09-08 | **PASS（参考）** — M2 同上「retain your ownership rights in … generated content」。M2 2026-03-30 |
| 有料／無料の差 | **PASS（差なし）** — F1 §9(a) 購入クレジット 365 日・無料／プロモ 90 日失効のみ。権利・学習の差分条項なし。従量課金（F8 pricing・日付なし） | **UNKNOWN** — M2 は従量 API で権利差の記載なし。M3（Web 版）も「free/paid で権利が異なる」文は確認できず。第三者ブログの「無料は商用不可」は**参考・非確定** |
| 帰属表示 | **PASS（義務なし）** — F1・F3・F4 に attribution 条項なし | **CONDITIONAL** — M2「place a prominent mark … within generated or edited content to inform the public of the use of deep synthesis technology」（深度合成の明示マーク）。ただし主語は "If you offer services based on these technologies"（当該技術でサービス提供する者）。M3 は "clearly disclose that it is AI-generated … whenever required by applicable law or reasonably necessary to avoid deception"。第三者ブログの「MiniMax H3 表示義務」は M2 に**該当文なし＝非確定** |
| 入力・出力の学習利用 | **CONDITIONAL** — F4 "Company will not use Client Content to create, train, develop (directly or indirectly) Company's products or services"（Client Content を学習に使わない）、例外 "Excluded Models"（一覧非公開・事前通知）。F1 §6(c) は匿名化 Usage Data を "design, develop, and offer … AI models" に使用可。F2 は学習明記なし。F4 日付なし | **CONDITIONAL** — M2 "We may use the input and generated content to provide, maintain, develop, and improve our Services"（サービス改善に利用可）。オプトアウト条項なし。M4（Hailuo）は学習明記なし・2025-12-09 |
| 入力画像の権利（保証） | **PASS（Kit §2 で充足）** — F1 §6(d) "has all rights, consents, licenses, and/or permissions necessary to grant the license in Section 6(a)"。Kit は参照入力を許可【docs：`SGG-CREATOR-KIT-RIGHTS.md` §2】 | **PASS（参考）** — M2「Client Content … are owned by you or that you have obtained legal authorization from the rights holders」 |
| 禁止用途 | **PASS** — F3 Dignity "Violates any copyright, trademark, or other intellectual property rights" ほか（CSAM・NCII・詐欺等）。本件は Kit 公認二次創作で抵触なし。F3 日付なし | **PASS（参考）** — M2 「infringing upon the intellectual property rights … of others」ほか。抵触なし |
| サブライセンス・再配布 | **PASS（Output に制限なし）** — F1 §6(e)(xii) は「Customer's rights under these Terms」（サービス利用権）の再販・サブライセンス禁止、§4(b)(ii) は API の End User 直接公開禁止。**Output の再配布制限は無し** | **PASS（参考）** — M2 (c) "sublicense, resell, or distribute any or all services outside of any integrated applications"＝サービスの再販禁止。生成物には及ばない |
| ゲームへの組み込み | **CONDITIONAL** — Output 帰属条項が無いため「許諾の明文」は無いが、禁止もなし。F7 バッジ＋F6 FAQ が根拠 | **PASS（参考）** — M2 "use our Service exclusively for your own products or projects"（自社製品向け利用）と所有権留保 |
| 生成動画の配信（Web ストリーミング） | **CONDITIONAL** — 同上。Output の配信を禁じる文なし。F4 の End User 禁止は **API 公開**のみ | **PASS（参考）** — 禁止文なし。M3 の AI 明示は「法令要求時・誤認回避に必要な時」 |

---

## §1 生成当時（2026-09-29〜30）の規約 vs 現在

| 文書 | 現在版の日付 | 当時の版 |
|---|---|---|
| fal ToS（F1） | Last Updated **2026-09-08** | **UNKNOWN**（当時の版は未取得。事実として記せるのは「現在版の Last Updated 2026-09-08 は生成日 09-29 より前」のみ。CEO 指示 2026-10-07：現在規約から過去を推定しない） |
| fal Privacy（F2） | 2026-07-22 | **UNKNOWN**（同上） |
| fal DPA（F5） | 2026-07-31 | **UNKNOWN**（同上。DPA 締結の有無も UNKNOWN） |
| fal AUP（F3）・API Services（F4） | **日付表示なし** | **UNKNOWN** |
| fal モデルページ（F7） | 日付なし。現在は秒課金（768p $0.048/s プロモ・10/15 まで、通常 $0.08/s） | 当時の表示価格 $0.20【docs】と現在の単価は整合しない → 当時のページ内容は **UNKNOWN**（バッジ有無も当時は未記録） |
| MiniMax Open Platform ToS（M2） | Effective **2026-03-30** | **UNKNOWN**（Effective 日付が生成日より前であることのみ事実。推定しない） |
| MiniMax 総則（M1） | 2026-04-15 | **UNKNOWN**（同上） |
| Hailuo Video ToS（M3）／Privacy（M4） | 2026-08-19／2025-12-09 | **UNKNOWN**（本件経路外） |

web.archive.org は本環境から取得不可（2 回失敗）。過去版の直接確認は行えていない。**結論：生成当時（2026-09-29〜30）に適用されていた規約の版は全文書 UNKNOWN。** §0 の判定はすべて「現在の規約（2026-10-07 取得）」に対するものであり、当時の規約への適用可否は本書では判定しない（CEO 指示 2026-10-07「過去規約が確認できなければ現在規約から過去を推定しない」）。

---

## §2 VID-01 台帳行（`ASSET_RIGHTS_LEDGER.md` §1-1 16 列）

| ID | Path（配信） | Source file（art-source） | Category | Creator | Model-Service | Generation date | Prompt reference | Reference inputs | Terms version・date checked | Commercial use | Modification | Attribution | Canonical source | Evidence（sha256） | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| VID-01 | `gods/taiyo/god-strike-v2.mp4`（166,058B）＋`gods/taiyo/god-strike-v2-poster.webp`（61,866B）。`BattleResonanceCutin` から実行時参照（大耀のみ） | `art-source/h3-god-strike/`（Try2 原本・main repo のみ・git 外） | god（演出動画） | CEO 生成（CEO 承認・FAL_KEY 課金）＋AI 非生成加工 | fal.ai `minimax/h3-max/image-to-video`・従量課金（プラン区分なし）・表示価格 $0.20 | 2026-09-29T12:29:35Z 送信（JST 09-29〜30） | `docs/evidence/decision250/try2/try2_request.json`（全文） | Kit `taiyo:GOD_MAIN` `main.webp`（sha `a9714359e8a5a2cc…`）由来ポスター 1024² PNG（sha `57eabb31856d1870…`）。first／end frame 同一 | fal ToS 2026-09-08／Privacy 2026-07-22／DPA 2026-07-31／AUP・API Services 日付なし；MiniMax Open Platform 2026-03-30（参考）；Kit Guidelines 1.0.0。AI 確認 2026-10-07（本書） | CONDITIONAL（fal：バッジ＋FAQ のみ、ToS に Output 帰属条項なし） | 非生成：W2 1.083〜2.250s 切り出し・等速・720²・H.264 CRF24・poster WebP【docs：決定250 §8-1】 | 義務なし（fal）。MiniMax 深度合成マークは「サービス提供者」向け・本件適用 UNKNOWN | 入力＝Kit manifest 一致。出力は生成物（正典なし） | mp4 `6664ccb449b9dcb7`／poster `f0329bb0b69ef472` | **△**（Output 帰属条項・当時のモデルページ・AUP/API 版が UNKNOWN） |

追加列（CEO 要望）：provider＝fal.ai（Features & Labels, Inc.）／model＝`minimax/h3-max/image-to-video`（fal 自社推論の post-trained 版）／generation evidence＝request_id `01a0ed24-623b-7e22-8acf-b4feb0e13b74`・`docs/evidence/decision250/try2/`・決定250 §8〜9／source image＝上記ポスター（Kit `main.webp` 由来）／output file＝上記 2 ファイル／current distribution＝Vercel Production LIVE（deploy `6738586429`・2026-09-30）／rights evidence＝本書 §0・§4

---

## §3 総合結論

**CONDITIONAL**（現在規約 2026-10-07 取得分に対して。生成当時の規約は UNKNOWN＝§1）。

理由：(0) 生成当時に適用されていた規約の版は確認できず UNKNOWN（現在規約から推定しない）。(1) fal ToS は「fal は Output に権利を主張しない」(§4(c)) と書くが「顧客が Output を所有・商用利用できる」とは書かず、商用可の根拠は**モデルページのバッジと FAQ**に留まる。(2) 禁止・再配布制限・帰属義務は無く、本件（無償 Web ゲーム・Kit 公認二次創作）に抵触する条項は fal・MiniMax とも見当たらない。(3) 入力画像の学習不使用は fal API Services に明記（例外 Excluded Models は一覧非公開）。(4) MiniMax 規約は直接契約が無く拘束力 UNKNOWN、内容上も阻害要因なし。(5) AUP・API Services・モデルページの当時版は確認できない。

**2026-10-07 AI 再検証**：F1（https://fal.ai/terms）を本日再取得し、Last Updated 2026-09-08・§4(c)「entitle Company to any intellectual property rights in any Output Content」の否定文・§6(a) Customer Input 帰属・§6(e)(xii) サブライセンス禁止・§6(a) Usage Data の AI モデル利用を再確認（本書 §0・§4 と一致）。

CEO に必要な行動：**なし（現状配信継続可）**。CEO が判断するのは §6-3 #5 の「このCONDITIONAL を受容するか」の 1 点のみ。受容する場合は `ASSET_RIGHTS_LEDGER.md` に本行を転記（AI 作業）。受容しない場合の代替は「Output 帰属の明文を fal サポートに書面で確認する」（外部問い合わせ＝CEO 操作）。AI は事実の推測を求めない。

---

## §4 取得ログ（2026-10-07）

| キー | URL | 結果 | 見つかったもの／無かったもの |
|---|---|---|---|
| F1 | https://www.fal.ai/legal/terms-of-service（= https://fal.ai/terms） | 200 | Last Updated 2026-09-08。§3 定義（Customer Input／Output Content／Usage Data）・§4(a)(b)(c)・§6(a)〜(e)・§9(a)・§14。**Output の顧客帰属条項なし** |
| F2 | https://fal.ai/privacy（= /legal/privacy-policy） | 200 | 2026-07-22。プロンプト・アップロード収集。学習明記なし。保持：解約後 30 日削除 |
| F3 | https://fal.ai/legal/acceptable-use-policy | 200 | 日付なし。Safety／Civility／Integrity／Dignity（IP）／Compliance／Criminality／Security |
| F4 | https://www.fal.ai/legal/api-services | 200 | 日付なし。Client Content 学習不使用・Excluded Models・第三者 API 転送条項。Output 配信許諾文なし |
| F5 | https://www.fal.ai/legal/data-processing-addendum | 200 | 2026-07-31。Deidentified Data で改善。学習明記なし |
| F6 | https://fal.ai/docs/documentation/model-apis/faq.md | 200 | "Each model has its own license… `Commercial use` badge"。生成物は CDN に最低 7 日保存。Output 所有の記述なし |
| F7 | https://fal.ai/models/minimax/h3-max/image-to-video | 200 | バッジ「Inference」「Commercial use」。fal 自社 post-trained・推論。秒課金。MiniMax 規約リンクなし |
| F8 | https://fal.ai/pricing | 200 | 従量課金。権利・学習の差なし。日付なし |
| F9 | https://www.fal.ai/legal | 200 | 文書一覧のみ。版履歴なし |
| F10 | https://www.fal.ai/legal/trust-and-safety | 200 | 表示・透かし条項なし（CSAM／NCII 対策・OpenAI Omni モデレーション） |
| M1 | https://www.minimax.io/terms-of-service-v2.html | 200 | 2026-04-15 総則。製品別規約へのリンクのみ |
| M2 | https://platform.minimax.io/protocol/terms-of-service | WebFetch＝タイトルのみ（JS）／**ブラウザで本文取得** | Effective 2026-03-30（Nanonoble Pte. Ltd.）。所有権留保・改善利用・深度合成マーク・Client Content 保証・禁止用途・サービス再販禁止。後半（準拠法）は出力上限で未読 |
| M3 | https://hailuoai.video/doc/terms-of-service.html | 200 | 2026-08-19。Web 版。商用アクセス禁止・AI 明示・UGC ライセンス・Singapore 法 |
| M4 | https://hailuoai.video/doc/privacy-policy.html | 200 | 2025-12-09。学習明記なし・顔データ非保持・Singapore |
| M5 | https://www.minimax.io/audio/doc/terms-of-service.html | 200 | 2025-06-19 App/Web 版。本件経路外 |
| M6 | https://www.minimax.io/privacy-policy-v2.html | 200 | 概要のみ・日付なし |
| — | https://platform.minimax.io/docs/guides/terms-of-service | タイトルのみ | 本文なし |
| — | web.archive.org（fal.ai/terms 2026-09-29 近傍）×2 | **取得不可** | 過去版未確認 |
| 参考・非確定 | atlascloud.ai／wavespeed.ai／seedance.tv／kingy.ai の「MiniMax H3 商用・表示義務」記事 | 検索結果のみ | 公式 M2 に「MiniMax H3 表示義務」の該当文なし。採用しない |
