# Asset Rights Ledger — CEO INPUT 整理（1 枚・2026-10-07）

- 種別：docs-only（AI 作成・CLAUDE.md §6-2）。台帳本体 `docs/ASSET_RIGHTS_LEDGER.md`（2026-09-27 版・§4 CEO INPUT 12 項目）と `docs/ASSET_GENERATION_SERVICE_TERMS_AUDIT.md`（規約監査 8 項目・「READY 条件付き・ブロッカーは #2 プラン・#6 学習設定」）を読み、**CEO が「承認／記入／拒否」だけで答えられる形**に圧縮したもの
- 前提ルール（2026-10-03 Known Issues Triage K13 更新・CEO 承認）：**「CEO に推測入力を求めない・UNKNOWN／unverifiable は維持・BLOCKER 化しない」**。本書は「今すぐ確認できる事実」と「UNKNOWN のまま承認して閉じる判断」を分け、推測を求めない
- 対応 DoD：`ROADMAP_TO_RELEASE.md` §7 **B-7**「配信 asset 全行に Status があり、UNKNOWN 行は『CEO 承認のうえ維持』か『配信除外』のどちらかが記録されている」
- runtime 変更 0・commit 0・Decision 番号追加 0

---

## 0. 結論（先に）

| 項目 | 内容 |
|---|---|
| CEO が答える項目 | **A：事実確認 4 件**（スクリーンショット／ファイル所在があれば埋まる）＋ **B：UNKNOWN 維持の承認 1 件（一括）**＋ **C：台帳の新規行 2 件の承認**（AI 記入済み・確認のみ） |
| v1.0 Release に必要な最小 | **B の一括承認**（これで DoD B-7 は満たせる）。A は「できる範囲で」。C は AI が記入し CEO は読むだけ |
| 推奨 | 台帳の UNKNOWN cell（プラン名・2026-08 当時の学習設定・Temporary chat・keyvisual 出所・原本所在）は **「2026-10-07 時点で確認不能として維持」を CEO 承認で確定**し、**今後の新規生成行のみ ◎ 基準（Training OFF の証跡＋生成日＋添付申告）を必須**にする。配信除外は提案しない（Guidelines・OpenAI Terms とも商用利用の権利譲渡が文面上あり、除外の必要性が docs に無い） |

---

## 1. A：今すぐ事実確認できるもの（4 件・スクリーンショット or ファイルの所在で埋まる）

| # | 台帳 | 聞くこと（1 つ） | 答え方 | 反映先 |
|---|---|---|---|---|
| A-1 | §4 #12 全 Kit 行 | **Kit Guidelines v1.0.0（`docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md`）を CEO が読んで確認した日付** | 日付 1 つ（例「2026-08-14」。覚えていなければ「本日 2026-10-07 に再確認」でよい） | GOD-KIT／OTM-KIT／OTM-D 全行の「Terms version・date checked」を完成（◎ 維持） |
| A-2 | §2 CARD-NEXT-01 | 決定243 v2 原画（`card_taiyo_attack_01_v2.png`・2026-09-27 23:37 保存）の **生成時に添付した Kit 画像のファイル名**（想定：`taiyo/main.webp`＋`front.webp`） | 「想定どおり」／「他：＿」／「覚えていない→UNKNOWN」 | §2 → §3-E へ転記して ◎ 確定 |
| A-3 | §4 #3／#4／#5／#7／#9（原本未保全） | 以下の原本が **CEO の PC（Downloads 等）にまだあるか**：①決定84 カード 4 枚の master PNG ②ステージ背景 7 枚＋アリーナの 1672×941 PNG ③FX 2×3 シート ④世代 A 敵シート `ChatGPT Image 2026年8月4日 07_35_20.png` ⑤OTOMO 絆背景の参考画像 7 枚 | ①〜⑤それぞれ「ある／ない／不明」。「ある」なら `art-source/` へ保全（AI がコピー・sha256 記録。commit は別途） | ✗ 25 ファイル → △ へ（原本保全）。無ければ UNKNOWN 維持（B へ） |
| A-4 | §4 #10 BGM | **Suno のプラン名（Pro／Premier）と、利用規約を確認した日付**（決定120 で「有料プランだった」SS は保存済み。版・日付のみ） | プラン名 1 つ＋日付 1 つ（不明なら UNKNOWN） | BGM-01〜04 を △ → ◎ 候補（song id 3 曲は AI が ID3 から読める） |

A は **答えられる分だけ**でよい。答えが無いものは自動的に B に入る。

---

## 2. B：UNKNOWN のまま「確認不能として維持」を承認するもの（一括 1 回）

以下は docs に記録が無く、今から事実を復元できない cell。K13 ルールにより推測入力を求めない。**CEO が「承認」と答えれば台帳の各行に「UNKNOWN（2026-10-07 CEO 承認・確認不能として維持）」を記入し、Status は現状（△／✗）のまま "承認済み UNKNOWN" として DoD B-7 を満たす。**

| 台帳 | cell | 対象 |
|---|---|---|
| §4 #1／#6／#7 | ChatGPT の **2026-08 当時のプラン名**・**当時の学習設定（ON/OFF）**・**Temporary chat 使用有無**（C2・C3 で既に UNKNOWN と回答済み） | カード 56 枚・敵 7 体・背景 8・FX 6・keyvisual 7 |
| §4 #1／#4／#5／#6 | **生成の実日付**（≈08-05〜06・08-16・08-23〜24・08-30・08-07 の「≈」を確定値にできない） | 同上 |
| §4 #2／#6 | 神専用カード 28 枚・敵 3 体の生成時に **Kit 画像を添付したか** | カード 28・敵 3 |
| §4 #8 | **keyvisual 7 柱の出所**（SGG 公式配布物か CEO 生成か）。C2PA は `gpt-image` を記録（規約監査 §1）＝生成の可能性が高いが「公式配布物を入力した生成」か「公式そのもの」かは不明 | GOD-K-01〜07・GOD-KH-01／02 |
| §4 #9 | OTOMO 絆背景 7 枚の **参考画像の出所** | OTM-BG-01 |
| §4 #11 | `main.png`／`front.png` を Kit へ戻した **決定番号**（実測で Kit 派生と裏付け済み・優先度低） | GOD-D-02／03 |

**AI 推奨：承認。** 理由：①規約面は「READY 条件付き」で、残るブロッカーは #2 プラン・#6 学習設定＝いずれも **現在値は回答済み**（Plus・OFF 2026-09-27）。過去値は配信物の権利譲渡（OpenAI Terms「own the Output」）に影響しない ②「人間製と表示しない」「公式・公認と誤認させない」は **CM-02 Legal／Credits 画面**で担保する（台帳側で解く問題ではない）③配信除外にすると 7 神 keyvisual・背景 7・FX 6 が消え、Production 体験が崩れる。除外を正当化する規約上の根拠が docs に無い

```
【CEO DECISION REQUIRED — Rights Ledger B】
Issue：台帳の UNKNOWN cell（上表）を「確認不能として維持」で確定してよいか
AI Recommendation：承認（一括）。以後の新規生成行のみ ◎ 基準を必須化
Reason：現在値（Plus／学習 OFF）は回答済み・権利譲渡は規約文面あり・推測入力は K13 で禁止
Alternatives：配信除外（却下：根拠なし・体験崩壊）／個別に思い出して記入（却下：K13 違反・遅延）
Risk：LOW（法的保護の不確実性は AI 生成物一般の論点で、台帳の記入で変わらない。専門家確認は CM-02 と同時）
Impact if delayed：DoD B-7 が閉じず v1.0 Release Gate で「台帳 ✓」を付けられない
CEO Action：承認 / 拒否
```

---

## 3. C：台帳に未記入の配信 asset（AI が行を起こす・CEO は内容確認のみ）

| # | 新規 ID（案） | Path（配信） | 事実（docs） | 不足 cell（CEO） |
|---|---|---|---|---|
| C-1 | **VID-01** | `gods/taiyo/god-strike-v2.mp4`（166,058B）＋`god-strike-v2-poster.webp`（61,866B）— 決定250 LIVE（2026-09-30） | Creator＝CEO 生成（fal.ai 経由・**`minimax/h3-max/image-to-video`** Try2・request_id `01a0ed24-…b74`・表示価格 $0.20）。入力＝Kit 正典 `taiyo/main.webp` 系ポスター。Kling Try1 素材は Production 不使用（v1 mp4 削除済み）。原本 `art-source/h3-god-strike/`（main repo のみ・git 外・**25MB・唯一の実体**） | **fal.ai の利用規約の版・確認日／MiniMax（H3 Max）の生成物権利条項の確認日／支払いアカウント**（fal.ai Terms は規約監査 8 項目の対象外＝未監査） |
| C-2 | CARD-NEXT-01 → **CARD-TAIYO-02** | `cards/card_taiyo_attack_01_v2.webp`（92,130B・決定243 LIVE） | §2 の記録は完成済み（Plus・学習 OFF SS・C2PA `gpt-image`・sha256）。残 2 cell＝生成時刻・添付ファイル名（A-2） | A-2 の回答のみ |
| C-3 | （重複記録）GOD-D-03 | `gods/<id>/front.png` ×7＝`main.png` とバイト同一・未参照（MASTER_BACKLOG AR-06） | 権利は GOD-D-02 と同一。削除は PF-03 で扱う（台帳は行を残す） | なし |

**AI 推奨（C-1）**：fal.ai／MiniMax の規約は **規約監査の追補（docs-only・AI 実施）** を先に行い、CEO には「確認日」だけを求める。原本 25MB は `art-source/h3-god-strike/` を git 管理に入れるか外部保全するかを **WORKTREE 監査 §4-3 ②** と同時に決める。

---

## 4. 反映手順（CEO 回答後・docs-only・AI）

1. A の回答 → 該当行を更新（sha256 再計算は不要・Evidence 列は配信ファイルで固定）
2. B の承認 → 各 UNKNOWN cell に「UNKNOWN（2026-10-07 CEO 承認・確認不能として維持）」を記入し、§5 集計に「承認済み UNKNOWN」列を追加
3. C-1 行追加（規約監査追補のあと）・C-2 転記・C-3 注記
4. `docs/DECISIONS.md` に「台帳 ID と承認日」のみ 1 行（内容は台帳へ）。commit は CEO 指示後
5. v1.0 Release Gate の Exit Criteria「台帳 ✓」は **A/B/C の記録完了**をもって PASS とする（`RELEASE_STATUS.md` に転記）

## 5. runtime 変更 0 の証明
- 本書 1 ファイルのみ作成（integ・untracked）。台帳本体・DECISIONS.md・src／public・main repo：未変更。生成 API／購入／外部サービス：0

---

## 6. 反映記録（2026-10-07・CEO 回答後・AI 作業）

- **CEO 回答**：B＝条件付き承認（UNKNOWN＝権利確認済みとは扱わない・推測補完なし・配信除外を要する Evidence なし・Legal／Credits は CM-02・DoD で「UNKNOWN 0」と偽装しない）／A-1〜A-4＝記憶で答えず Evidence・機械確認のみ／C-1＝AI で規約監査を実施／CARD-NEXT-01＝既存 Evidence のみ転記
- **反映先**：`docs/ASSET_RIGHTS_LEDGER.md` §1-2（事実状態 KNOWN／UNKNOWN-ACCEPTED／CONDITIONAL／BLOCKED）・§2-3（C-2 転記）・§3-K（C-1 VID-01）・§7（A-1〜A-4 結果・B の #1〜#12 最終状態・A-3 原本所在表・集計 86 行＝KNOWN 29／UNKNOWN-ACCEPTED 56／CONDITIONAL 1／BLOCKED 0）。規約監査補遺 `ASSET_GENERATION_SERVICE_TERMS_AUDIT_ADDENDUM_FAL_MINIMAX.md` は §1 の「推定」を UNKNOWN に訂正（当時規約は現在規約から推定しない）
- **A の結果**：A-1＝AI 再確認 2026-10-07 を記録（CEO 初回確認日は UNKNOWN-ACCEPTED）／A-2＝UNKNOWN-ACCEPTED／A-3＝25 ファイル中 24 の原本を機械照合で特定（`support_07` のみ NOT FOUND）・`SevenGodsGame-integ/art-source/` へ untracked で複製・commit は TD-04 と同時に判断／A-4＝UNKNOWN-ACCEPTED（証跡スクリーンショットは所在不明）
- **§4 手順 4（DECISIONS.md 1 行）**：実施（2026-10-07 行）。§4 手順 5（v1.0 Release Gate「台帳 ✓」）：DoD B-7 は「UNKNOWN 0」ではなく「全 86 行に事実状態＋UNKNOWN-ACCEPTED の根拠（台帳 §7）」で PASS 扱い＝`RELEASE_STATUS.md` K13 行に転記
- 本書 §0〜§5 は依頼時点の記録として保持（§3 C-2「A-2 の回答のみ」・§5「台帳本体未変更」は依頼時点の事実。反映後の状態は台帳 §7 が正）
