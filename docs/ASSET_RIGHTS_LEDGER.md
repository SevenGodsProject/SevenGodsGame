# Asset Rights Ledger（素材権利台帳）— 雛形＋現状棚卸し

- 作成日：2026-09-27（docs-only・AI 作成。`PREMIUM_PHASE_JUDGMENT_2026-09-27.md` §2-3／§5-3・`SEVENGODS_47_LESSONS_CONSOLIDATION_AUDIT.md` §21-b（P15）・`SEVENGODS_NEXT_MILESTONES.md` L4 の「台帳雛形」を実体化したもの）
- 性質：**記録のみ**。runtime／assets／scripts／`docs/DECISIONS.md` への変更 0。法的認定は行わない（§21-b と同じ）。「誰が・何で・いつ・どの規約で作ったか」を後から遡れるようにする台帳であり、可否の判断は CEO（CLAUDE.md §6-3 #5）
- 表記：【実測】＝本日 `node`（`crypto`）で served ファイルの sha256 を計算・Kit `manifest.json` の sha256 と照合した結果／【docs】＝Decision・監査文書の記録／**UNKNOWN**＝docs に記録がない（推測で埋めない）
- 除外ローカルファイル `敵画像`（repo 直下・69 byte のメモ・未追跡）は本台帳でも**内容を転記しない・commit しない**（`docs/RELEASE_STATUS.md`「含めない」）。敵 世代 A の原本シートは repo 外にあることだけを記す

---

## 0. 目的

1. **P15（台帳）**：`public/` に配信されている全 asset について Source／Creator／Terms／Evidence を 1 行で答えられる状態にする。Launch Gate（Rights）で「後から全 asset を遡る」事態を避ける
2. **asset phase の前提**：Lane3 After-2（`card_taiyo_attack_01_v2`）と Enemy Art Direction Brief v1（`docs/ENEMY_ART_DIRECTION_BRIEF_V1.md`）で新しい画像が `public/` に入る前に、**必ず本台帳の 1 行が先に埋まっている**ことをルールにする（§1-4）
3. **CEO INPUT の範囲を固定する**：AI が docs から埋められない cell（生成サービスのプラン・生成日・規約版と確認日）を §4 に列挙し、CEO は §4 だけを見れば記入が終わるようにする

## 1. 記入ルール

### 1-1. 列の定義（16 列）

| 列 | 意味 | 記入者 |
|---|---|---|
| ID | 本台帳内の識別子（`<群>-<連番>`）。ファイルを差し替えても ID は新しく振る（旧行は残す） | AI |
| Path（配信） | `public/assets/` からの相対パス。実行時参照の有無（未参照なら明記） | AI |
| Source file（art-source） | 配信ファイルの直接の元（`art-source/`／`audio-source/` の相対パス）。無ければ「未保全」 | AI |
| Category | god／enemy／otomo／card／stage／fx／se／bgm | AI |
| Creator | **Kit 公式**（SGG Creator Kit v1）／**CEO 生成**（CEO が生成 AI サービスで作った）／**AI 非生成加工**（AI チームが sharp・Canvas 等で加工。生成・描き直しなし）／**自作**（数式合成等） | AI |
| Model-Service | 生成に使ったサービス名＋プラン（例：ChatGPT（Web）／プラン UNKNOWN）。Kit・自作は「—」 | AI（名）／**CEO（プラン）** |
| Generation date | 生成日（Kit は `releasedAt`）。docs から決定日しか分からない場合は「≈決定日」と書く | AI／**CEO** |
| Prompt reference | プロンプト全文が載っている docs のパス。無ければ UNKNOWN | AI |
| Reference inputs | 生成時に参照画像として入力した Kit ファイル（assetId・sha256）。入力していないなら「なし」、不明なら UNKNOWN | **CEO** |
| Terms version・date checked | 適用規約の版と、それを確認した日。Kit は `SGG-FAN-CREATION-GUIDELINES-1.0.0`（Effective 2026-07-16） | AI（Kit）／**CEO（生成サービス）** |
| Commercial use | 可／不可／UNKNOWN（規約と根拠） | AI／**CEO** |
| Modification | 改変の可否と、実際に施した加工の要約 | AI |
| Attribution | 表記義務（Kit＝任意 §4） | AI／**CEO** |
| Canonical source | 正典の所在（Kit は manifest の assetId と sha256 の一致） | AI |
| Evidence（sha256） | **配信ファイル**の sha256（本表は先頭 16 桁。全桁は §1-3 のコマンドで再計算） | AI |
| Status | ◎ 記録済み／△ 一部未記録／✗ 未記録／UNKNOWN（未配置） | AI |

### 1-2. Status の判定規則

- **◎ 記録済み**：Creator・Terms・Canonical／Source・Evidence の 4 つが埋まっている（Kit 公式・自作・Kit からの非生成加工）
- **△ 一部未記録**：Creator と Source（原本の保全）はあるが、Model-Service のプラン／生成日／規約版・確認日のいずれかが UNKNOWN
- **✗ 未記録**：原本が保全されておらず、かつ 規約版・確認日が UNKNOWN（「何で作ったか」以外を後から証明できない）
- **UNKNOWN**：予約行（ファイル未配置）

### 1-3. Evidence（sha256）の取り方（読み取り専用・依存追加なし）

```
node -e "const c=require('crypto'),f=require('fs');console.log(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex'))" public/assets/<path>
```

本表の値はこのコマンドと同じ計算（Node `crypto`）で 2026-09-27 に採取した。Kit 公式ファイルは `docs/assets-kit/manifest.json` の `sha256` と**全 21（神）＋7（OTOMO doji）で一致**【実測】。

### 1-4. 運用（新しい画像が入るとき）

1. master が届いたら **先に** §2 の予約行（または新しい行）を埋める。Reference inputs・Model-Service・Generation date・Terms は CEO からの申告を転記し、「CEO 申告（日付）」と付記する
2. 受入検査（`accept-art.mjs` 等）→ 書き出し → `public/` 配置 → Evidence（配信 sha256）を記入 → Status を更新
3. 旧ファイルは削除せず行も残す（ロールバック用）。差し替え後の行には「supersedes <旧 ID>」を Modification に書く
4. `docs/DECISIONS.md` には「台帳 ID」だけを引用する（台帳の中身を Decision に二重に書かない）

### 1-5. 本台帳が判断しないこと

- 生成サービスの規約（入力画像の扱い・商用可否・生成物の権利）の解釈 → **CEO**（§6-3 #5）。台帳は「版と確認日」を記録するだけ
- Kit 素材の参照入力そのものは Guidelines §2 で許可【docs】。ただし「利用する AI サービスの規約を守る」責任は制作者（同 §2）

---

## 2. 次の記入行（予約）— Lane3 After-2『豪快な一撃』v2

| ID | Path（配信） | Source file（art-source） | Category | Creator | Model-Service | Generation date | Prompt reference | Reference inputs | Terms version・date checked | Commercial use | Modification | Attribution | Canonical source | Evidence（sha256） | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CARD-NEXT-01 | `cards/card_taiyo_attack_01_v2.webp`（予定・640×960・alpha なし・≤160KB） | `art-source/cards/card_taiyo_attack_01_v2.png`（予定・master ネイティブ 1024×1536 以上・拡大禁止） | card | CEO 生成（予定） | **OpenAI ChatGPT（個人向け Web）画像生成／gpt-image／プラン＝Plus**（CEO INPUT C1・2026-09-27） | （生成後に記入） | `docs/LANE3_IMAGE_BRIEF_GOUKAI_NO_ICHIGEKI.md` §12-1（最終プロンプト・変更禁止） | **予定**：`taiyo-kozuchi:GOD_MAIN`＝`public/assets/gods/taiyo/main.webp`（sha256 `a9714359e8a5a2cc…`）／`taiyo-kozuchi:GOD_FRONT`＝`front.webp`（`910bb1911dc8d4c6…`）。任意：自作 `cards/card_common_attack_01.webp`・`_02.webp`（画風）。**keyvisual は添付しない**（出所 UNKNOWN・§4 #8）。実際に添付したものを生成後に CEO 申告 | Kit：`SGG-FAN-CREATION-GUIDELINES-1.0.0`（§2 参照入力許可）／OpenAI：Terms of Use Eff. 2026-01-01・Usage Policies Eff. 2025-10-29・Privacy Upd. 2026-07-30（AI 確認 2026-09-27・`docs/ASSET_GENERATION_SERVICE_TERMS_AUDIT.md`）／**学習利用：「モデル改善に協力する」OFF（CEO が 2026-09-27 に変更・OFF 状態のスクリーンショット確認済み）** | 可（Terms「Ownership of content」Output 譲渡・AI 確認 2026-09-27） | 予定：sharp resize 640×960 q85 のみ（クロップ・塗り足し禁止。Brief §14） | 義務なし（個人向け Terms・AI 確認 2026-09-27）。「人間製」と表示しない | supersedes CARD-TAIYO-01（旧 `card_taiyo_attack_01.webp` は残す） | （配置後に記入） | **READY（生成待ち）**→ 生成後に Generation date・Reference inputs 実績・sha256 を記入して ◎ |

### 2-1. CEO INPUT 受領記録（2026-09-27）— 生成サービスの運用条件

| # | 項目 | CEO 回答 | 台帳への反映 |
|---|---|---|---|
| C1 | ChatGPT の現在のプラン | **Plus** | 本行および今後の生成行の Model-Service に「Plus」を記入。**2026-08 当時のプランは UNKNOWN のまま**（§3 の既存行は変更しない） |
| C2 | 「モデル改善に協力する」（Improve the model for everyone） | **2026-09-27 に OFF へ変更済み・OFF 状態のスクリーンショット確認済み**。過去（2026-08）の設定状態は **UNKNOWN** | 本行の Terms 列に「学習利用 OFF（2026-09-27）」を記入。§3 の 2026-08 生成行（カード・敵 3 体・keyvisual）は **UNKNOWN のまま・推測で補完しない** |
| C3 | 過去の Temporary chat 使用有無 | **UNKNOWN** | §3 の既存行に「Temporary chat：UNKNOWN」として扱う |
| 方針 | Kit 参照画像を使う新規生成 | **今後は OFF 状態を維持**して生成する | 新規行は「Training OFF の証跡（日付・SS）」が無ければ Status を ◎ にしない（§1-4 に追加） |

### 2-2. 生成履歴（CARD-NEXT-01）

| 回 | 日時 | サービス／プラン／学習 | 添付（CEO 申告待ち・想定 GOD_MAIN＋GOD_FRONT） | master | sha256 | C2PA | 機械受入 | 備考 |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-09-27（保存 23:27 JST・生成時刻は CEO 申告） | ChatGPT（Web）Plus／「モデル改善に協力する」OFF | 未申告 | `art-source/cards/card_taiyo_attack_01_v2_try1.png`（1024×1536・alpha なし） | `193594f4841f9cef554420ed43c22f75ecdbadc376c3969d0dc229288fed0b45` | あり（`gpt-image`） | **FAIL**（MUST 6／TARGET 3・Brief §17-1） | 保存時の `.png.png` を AI がリネームのみ（中身は無加工）。2 回目へ（Brief §17-2） |
| 2 | 2026-09-27（保存 23:37 JST・生成時刻は CEO 申告） | ChatGPT（Web）Plus／「モデル改善に協力する」OFF | 未申告（想定 GOD_MAIN＋GOD_FRONT） | `art-source/cards/card_taiyo_attack_01_v2.png`（1024×1536・alpha なし）→ 配信候補 `card_taiyo_attack_01_v2.webp` 640×960・92,130 B（worktree `SevenGodsGame-after2`・Production 未反映） | `25a6dc0f700e7201323d6fd940a6f69d10629167aba6e599edbbfcdf82017d45` | あり（`gpt-image`） | **MUST FAIL 2（A8 0.0644 僅差・A15 下辺＝仕様矛盾）／TARGET FAIL 1**（Brief §17-3）→ **CEO 判断で候補採用（A15 指標側の問題・A8 既知の僅差として記録・基準は不変）** | `.png.png` をリネームのみ。**CEO Human QA 5/5 PASS（2026-09-28・PC＋iPhone）→ 採用**（Brief §19）。3 回目不要。Release Gate PASS・RC `d1e3b30`・**CEO 承認で Production Release（Vercel `6697593799`・2026-09-28）→ 配信中**（Brief §21）。**Status ◎（配信済み・権利記録済み）**：配信 `cards/card_taiyo_attack_01_v2.webp` md5 `39ada1c61f6d…`・92,130 B。残る CEO 申告 2 cell＝生成時刻・添付ファイル名（想定 GOD_MAIN＋GOD_FRONT）を受領次第、§2 予約行を本表 §3-E へ転記して確定 |

---

## 3. 現状棚卸し（2026-09-27・`public/assets/` 209 ファイル【実測】）

以下、群ごとに表を分ける。列は §1-1 と同じ順。sha256 は先頭 16 桁。

### 3-A. 神 — Kit 公式ファイル（配信中・21 行）

共通：Creator＝Kit 公式／Model-Service＝—／Generation date＝Kit `releasedAt` 2026-07-16／Prompt reference＝—／Reference inputs＝—／Terms＝`SGG-FAN-CREATION-GUIDELINES-1.0.0`（Effective 2026-07-16・repo 取込済み `docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md`・**CEO の確認日 UNKNOWN**）／Commercial＝可（§1）／Modification＝可（§2）・本ファイルは**無加工**／Attribution＝任意（§4）／Canonical＝manifest assetId の sha256 と**一致**【実測】／Status＝◎。参照状況：`main.webp` は `front_640` の RGB 原本（決定130）・`front.webp` は別ポーズで未使用（`gods.ts` 注記）・`back.webp` は未参照（決定37 行の備考）。

| ID | Path（配信） | Source | Category | Canonical（assetId） | Evidence（sha256） | Status |
|---|---|---|---|---|---|---|
| GOD-KIT-01 | `gods/ebisu/main.webp`（1600²・alpha なし） | Kit そのもの | god | `ebisu-taimaru:GOD_MAIN` | `4e21434fce3abce5` | ◎ |
| GOD-KIT-02 | `gods/ebisu/front.webp`（1600²・alpha）・未参照 | Kit そのもの | god | `ebisu-taimaru:GOD_FRONT` | `13402eb9a0af6ccf` | ◎ |
| GOD-KIT-03 | `gods/ebisu/back.webp`・未参照 | Kit そのもの | god | `ebisu-taimaru:GOD_BACK` | `397976923af704cf` | ◎ |
| GOD-KIT-04 | `gods/taiyo/main.webp` | Kit そのもの | god | `taiyo-kozuchi:GOD_MAIN` | `a9714359e8a5a2cc` | ◎ |
| GOD-KIT-05 | `gods/taiyo/front.webp`・未参照 | Kit そのもの | god | `taiyo-kozuchi:GOD_FRONT` | `910bb1911dc8d4c6` | ◎ |
| GOD-KIT-06 | `gods/taiyo/back.webp`・未参照 | Kit そのもの | god | `taiyo-kozuchi:GOD_BACK` | `164483ba2ac457ad` | ◎ |
| GOD-KIT-07 | `gods/sobi/main.webp` | Kit そのもの | god | `sobi-momokatsu:GOD_MAIN` | `cae2088d841184e6` | ◎ |
| GOD-KIT-08 | `gods/sobi/front.webp`・未参照 | Kit そのもの | god | `sobi-momokatsu:GOD_FRONT` | `11b12ab3b251681f` | ◎ |
| GOD-KIT-09 | `gods/sobi/back.webp`・未参照 | Kit そのもの | god | `sobi-momokatsu:GOD_BACK` | `5f7074c220fccb1d` | ◎ |
| GOD-KIT-10 | `gods/saika/main.webp` | Kit そのもの | god | `saika-kotone:GOD_MAIN` | `d4e0c9b65b60bc95` | ◎ |
| GOD-KIT-11 | `gods/saika/front.webp`・未参照 | Kit そのもの | god | `saika-kotone:GOD_FRONT` | `77d38e3347fdaa32` | ◎ |
| GOD-KIT-12 | `gods/saika/back.webp`・未参照 | Kit そのもの | god | `saika-kotone:GOD_BACK` | `18d0381b9ea5c4d0` | ◎ |
| GOD-KIT-13 | `gods/juraku/main.webp` | Kit そのもの | god | `juraku-juka:GOD_MAIN` | `77df4155a9e57343` | ◎ |
| GOD-KIT-14 | `gods/juraku/front.webp`・未参照 | Kit そのもの | god | `juraku-juka:GOD_FRONT` | `4954b73847fc50bb` | ◎ |
| GOD-KIT-15 | `gods/juraku/back.webp`・未参照 | Kit そのもの | god | `juraku-juka:GOD_BACK` | `8676d5d4852235bd` | ◎ |
| GOD-KIT-16 | `gods/fukuei/main.webp` | Kit そのもの | god | `fukuei-haku:GOD_MAIN` | `d379f5e4fad4bbdc` | ◎ |
| GOD-KIT-17 | `gods/fukuei/front.webp`・未参照 | Kit そのもの | god | `fukuei-haku:GOD_FRONT` | `6690c13bc61d3a55` | ◎ |
| GOD-KIT-18 | `gods/fukuei/back.webp`・未参照 | Kit そのもの | god | `fukuei-haku:GOD_BACK` | `f136e9c0b37353d2` | ◎ |
| GOD-KIT-19 | `gods/shouren/main.webp` | Kit そのもの | god | `shouren-shofuku:GOD_MAIN` | `328ac59724358ffe` | ◎ |
| GOD-KIT-20 | `gods/shouren/front.webp`・未参照 | Kit そのもの | god | `shouren-shofuku:GOD_FRONT` | `6f64d85f633c11ab` | ◎ |
| GOD-KIT-21 | `gods/shouren/back.webp`・未参照 | Kit そのもの | god | `shouren-shofuku:GOD_BACK` | `d751ce554bc78633` | ◎ |

### 3-B. 神 — Kit からの派生・キービジュアル（12 行）

| ID | Path（配信） | Source file（art-source） | Category | Creator | Model-Service | Generation date | Prompt reference | Reference inputs | Terms version・date checked | Commercial use | Modification | Attribution | Canonical source | Evidence（sha256） | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GOD-D-01 | `gods/<id>/front_640.webp` ×7（640²・alpha）・戦闘の神の絵 | Kit `main.webp`（RGB）＋`main.png`（alpha）（決定130） | god | AI 非生成加工 | — | 2026-09-06（決定130） | — | — | Kit `SGG-FAN-CREATION-GUIDELINES-1.0.0` | 可 | 可・実施：RGB＝`main.webp`・alpha＝`front.png`・白マット除去・640px q88（決定130）。描き直し 0 | 任意 | GOD-KIT-01/04/07/10/13/16/19（RGB） | ebisu `3c76f0bffae00ec6`・taiyo `0565932c16f1cd2e`・sobi `7341691882248c84`・saika `5592a712d735e542`・juraku `f262f517f519c94d`・fukuei `1f28517b4297476f`・shouren `5aabaa312f287b85` | ◎ |
| GOD-D-02 | `gods/<id>/main.png` ×7（480²・alpha）・神選択の絵（`gods.ts` `main`） | 配信ファイルそのもの（art-source なし） | god | AI 非生成加工 | — | git 初出 2026-08-14 `7ddbd5c`【実測】（決定34／35＝2026-08-04 の Canvas 透過処理） | — | — | Kit（同上） | 可 | 可・実施：ブラウザ Canvas で白背景を閾値アルファ抜き→480px（決定34／35）。**注**：決定41／42（2026-08-08）で ChatGPT 生成の立ち絵へ差し替えた記録があるが、決定130（2026-09-06）は `front.png` と Kit `main.webp` を同一の絵（PSNR 35.3〜37.9dB）と実測。**Kit へ戻した経緯の決定番号は UNKNOWN** | 任意 | Kit GOD_MAIN（決定130 の PSNR 実測に基づく） | ebisu `d05cc50733913b2f`・taiyo `ada8ef5f13445c6c`・sobi `e18d571938d9e7a3`・saika `55c26f988f54877e`・juraku `acd05ff87fcd9eca`・fukuei `37e2c3d387459372`・shouren `9e725df5e6424fe2` | △ |
| GOD-D-03 | `gods/<id>/front.png` ×7（480²）・**未参照**（`front_640` のロールバック用・`gods.ts` 注記） | 同上 | god | AI 非生成加工 | — | 同上 | — | — | Kit（同上） | 可 | 同上（`main.png` と**バイト一致**【実測：sha256 同一】） | 任意 | 同上 | `main.png` と同一 | △ |
| GOD-K-01 | `gods/ebisu/keyvisual.webp`（675×900・alpha なし）・E1 Home／勝利の舞台 | `art-source/reference/gods/ebisu-keyvisual.png` | god | **UNKNOWN**（docs：Lane3 Brief §13「SGG 公式キービジュアル」／判定 §2-1「Kit 派生と推定・生成記録なし」。Kit manifest には無い） | UNKNOWN | UNKNOWN（git 初出 ≤2026-08-20 `d0fb629`【実測・恵比寿のみ調査】） | `docs/god-portrait-prompts.md`（§21-b は「prompts doc のみ」と記載。該当プロンプトかは UNKNOWN） | UNKNOWN | UNKNOWN（公式配布物なら Kit Guidelines・生成物なら生成サービス規約） | UNKNOWN | 実施：原本 PNG → WebP 縮小（非生成） | UNKNOWN | 原本 PNG（art-source）。正典性（公式か生成か）UNKNOWN | `18c8f07b089b61a1` | △ |
| GOD-K-02 | `gods/taiyo/keyvisual.webp` | `art-source/reference/gods/taiyo-keyvisual.png` | god | UNKNOWN（同上） | UNKNOWN | UNKNOWN | 同上 | UNKNOWN | UNKNOWN | UNKNOWN | 同上 | UNKNOWN | 同上 | `19e81ba6a8b8d6b1` | △ |
| GOD-K-03 | `gods/sobi/keyvisual.webp` | `art-source/reference/gods/sobi-keyvisual.png` | god | UNKNOWN | UNKNOWN | UNKNOWN | 同上 | UNKNOWN | UNKNOWN | UNKNOWN | 同上 | UNKNOWN | 同上 | `219d0040064544e0` | △ |
| GOD-K-04 | `gods/saika/keyvisual.webp` | `art-source/reference/gods/saika-keyvisual.png` | god | UNKNOWN | UNKNOWN | UNKNOWN | 同上 | UNKNOWN | UNKNOWN | UNKNOWN | 同上 | UNKNOWN | 同上 | `e38b1cc33484506a` | △ |
| GOD-K-05 | `gods/juraku/keyvisual.webp` | `art-source/reference/gods/juraku-keyvisual.png` | god | UNKNOWN | UNKNOWN | UNKNOWN | 同上 | UNKNOWN | UNKNOWN | UNKNOWN | 同上 | UNKNOWN | 同上 | `99631a0f802ad44e` | △ |
| GOD-K-06 | `gods/fukuei/keyvisual.webp`（720×900） | `art-source/reference/gods/fukuei-keyvisual.png` | god | UNKNOWN | UNKNOWN | UNKNOWN | 同上 | UNKNOWN | UNKNOWN | UNKNOWN | 同上 | UNKNOWN | 同上 | `6923f2e977d016c7` | △ |
| GOD-K-07 | `gods/shouren/keyvisual.webp`（900×900） | `art-source/reference/gods/shouren-keyvisual.png` | god | UNKNOWN | UNKNOWN | UNKNOWN | 同上 | UNKNOWN | UNKNOWN | UNKNOWN | 同上 | UNKNOWN | 同上 | `e5d068f283d07cfd` | △ |
| GOD-KH-01 | `gods/<id>/keyvisual-home.webp` ×5（1086×1448／fukuei 1086×1357）・E1 Home 高 DPI 用 | 同上の原本 PNG（`PHASE7_ENTRANCE_E1_MINIMAL_SPEC.md` §14-3「非生成の再エンコード」） | god | AI 非生成加工（原本の Creator は GOD-K と同じ UNKNOWN） | — | 2026-09-18（決定193） | — | — | 原本と同じ（UNKNOWN） | UNKNOWN | 実施：再エンコードのみ（5 柱＝大耀・蒼毘・才華・寿楽・福永。CEO 指示で恵比寿・笑蓮は対象外） | UNKNOWN | 原本 PNG | taiyo `b495381a18a854c2`・sobi `c09001be35fae591`・saika `5b797d68c9e33a4f`・juraku `533a26b5adc8bc91`・fukuei `449b307f6568ea57` | △ |
| GOD-KH-02 | `gods/ebisu/keyvisual-hero.webp`（1086×1448・q88・510KB）・E1 Home 恵比寿 | `art-source/reference/gods/ebisu-keyvisual.png` | god | AI 非生成加工（原本 UNKNOWN） | — | 2026-08-20 `7e4951f`「improve Ebisu hero key visual quality」【実測】 | — | — | UNKNOWN | UNKNOWN | 再エンコードのみ | UNKNOWN | 原本 PNG | `3c5b3fa918333d0d` | △ |

### 3-C. 敵（配信 7 行＋未参照 3 行）

共通：Category＝enemy／Attribution＝UNKNOWN（生成サービス規約次第）／Commercial＝UNKNOWN（同）。敵は自前 IP（Kit の名称・キャラクターを含まない）。**世代 A の原本シート**（`ChatGPT Image 2026年8月4日 07_35_20.png`・1536×1024・7 体分）は **repo 外**（CEO の Downloads。`ENEMY_VISUAL_QUALITY_AUDIT.md` §3・決定182）で、本台帳は所在のみ記す。

| ID | Path（配信） | Source file（art-source） | Creator | Model-Service | Generation date | Prompt reference | Reference inputs | Terms version・date checked | Modification | Canonical source | Evidence（sha256） | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ENM-01 | `enemies/datenshi/art.webp`（768²・alpha）・試練の影 | `art-source/enemies/datenshi-source.png`（1199×1312・sha `348ac6e23c7321cb`） | CEO 生成 | ChatGPT（ファイル名「ChatGPT Image 2026年8月23日 06_14_42.png」【docs：Batch A §2】）・プラン UNKNOWN | 2026-08-23 | UNKNOWN（決定99 に「刷新」の記録・プロンプト本文なし） | UNKNOWN | UNKNOWN | 非生成：bbox 抽出→Lanczos3 縮小→768² 配置→WebP q90（決定174／178）。生成補完 0 | source PNG（相関 0.998） | `29202bed62c3006c` | △ |
| ENM-02 | `enemies/oni/art_hq.webp`（768²）・業斧の鬼将 | `art-source/enemies/oni-restoration-pilot/M4_unmatte_2step-1024.webp`（sha `78de6fe912a699f0…`・決定181） | CEO 生成（原本）＋AI 非生成修復 | ChatGPT（世代 A シート）・プラン UNKNOWN | 2026-08-04（決定32） | UNKNOWN | UNKNOWN | UNKNOWN | 非生成修復 M4：白マット除去＋2 段拡大（決定177 方式）→1024→768 単純縮小 q90 alphaQuality 100（決定181）。**CEO 実機 QA 承認 2026-09-15**。AI redraw／inpainting 0 | 世代 A シート（repo 外）→ `oni/art.png`（ENM-U2） | `6c25cdb815e2cb0a` | △ |
| ENM-03 | `enemies/onryo/art_hq.webp`（576×768・aspect 0.75 固定）・藍花の怨霊 | `art-source/enemies/onryo-restoration-pilot/M4i_unmatte_interior_2step-768x1024.webp`（sha `38747b968841fc9f…`・決定183） | CEO 生成（原本）＋AI 非生成修復 | ChatGPT（世代 A シート）・プラン UNKNOWN | 2026-08-04 | UNKNOWN | UNKNOWN | UNKNOWN | 非生成修復 M4i：白マット除去＋内部 alpha 復元＋2 倍拡大→768×1024→576×768（決定183）。**CEO 実機 QA 承認 2026-09-16** | 同上 → `onryo/art.png` | `962040549a488436` | △ |
| ENM-04 | `enemies/karakuri/art.webp`（768²）・銀甲の機工師 | `art-source/enemies/karakuri-source.png`（1065×1477・sha `c4e629ad0ccf5958`） | CEO 生成 | ChatGPT（「ChatGPT Image 2026年8月23日 07_59_42.png」）・プラン UNKNOWN | 2026-08-23 | UNKNOWN（決定100） | UNKNOWN | UNKNOWN | 非生成：決定174 と同じ（q90） | source PNG（相関 0.9996） | `d879f1e91b876739` | △ |
| ENM-05 | `enemies/juuma/art_hq.webp`（768²）・双牙の魔獣 | `art-source/enemies/juuma-restoration-pilot/M4_unmatte_2step-1024.webp`（sha `136ef257adbda23e…`・決定179） | CEO 生成（原本）＋AI 非生成修復 | ChatGPT（世代 A シート）・プラン UNKNOWN | 2026-08-04 | UNKNOWN | UNKNOWN | UNKNOWN | 非生成修復 M4（決定177）→768 q90（決定179）。image-to-image 再生成 5 案は Identity 80〜87 で**棄却**（決定179）。**CEO 実機 QA 承認 2026-09-15** | 同上 → `juuma/art.png` | `4356913d2c9bdeea` | △ |
| ENM-06 | `enemies/ryujin/art_hq.webp`（768²）・蒼海の龍神 | `art-source/enemies/ryujin-restoration-pilot/M4i_unmatte_interior_2step-1024.webp`（sha `10f8a39ae0beefdf…`・決定182） | CEO 生成（原本）＋AI 非生成修復 | ChatGPT（世代 A シート 左下セル）・プラン UNKNOWN | 2026-08-04 | UNKNOWN | UNKNOWN | UNKNOWN | 非生成修復 M4i（決定182）。**CEO 実機 QA 承認 2026-09-15** | 同上 → `ryujin/art.png` | `76266bb4344e1f07` | △ |
| ENM-07 | `enemies/doukeshi/art.webp`（768²・q94）・乱舞の道化 | `art-source/enemies/doukeshi-source.png`（1254×1254・sha `198789b1e10e320a`） | CEO 生成 | ChatGPT（「ChatGPT Image 2026年8月24日 00_11_33.png」）・プラン UNKNOWN | 2026-08-24 | UNKNOWN（決定100） | UNKNOWN | UNKNOWN | 非生成：決定174（q94＝PSNR 33dB を満たす最小品質） | source PNG（相関 0.9995） | `5ecf72492d7e20a9` | △ |
| ENM-U1 | `enemies/{datenshi,karakuri,doukeshi}/art.png`（512²／384×512）・**未参照**・決定99／100 前の**旧デザイン**（`enemies.ts` 注記：現行とは別キャラクター画像・source に使ってはならない） | 未保全（配信ファイルのみ） | CEO 生成 | ChatGPT（世代 A シート・決定32）・プラン UNKNOWN | 2026-08-04 | UNKNOWN | UNKNOWN | UNKNOWN | .NET System.Drawing でシート切り出し（決定32）・白背景透過（決定34） | 世代 A シート（repo 外） | datenshi `602f0287bf964b62`・karakuri `ad0929bf61f22d98`・doukeshi `cdd7603e2fa1c011` | △ |
| ENM-U2 | `enemies/{oni,juuma,onryo,ryujin}/art.png`（384×512／512²）・**未参照**・世代 A の切り出し原本（ENM-02／03／05／06 の修復元） | 配信ファイルそのものが唯一の repo 内原本 | CEO 生成 | 同上 | 2026-08-04 | UNKNOWN | UNKNOWN | UNKNOWN | 同上 | 同上 | oni `2ba0342b0aa82d72`・juuma `87896fb2262d6543`・onryo `5ecff994d675c517`・ryujin `1e1d2c40140c0fd4` | △ |
| ENM-U3 | `enemies/{juuma,oni}/art.webp`（512²）・**未参照**・旧配信版（commit `5b1e1b7` の軽加工・決定100） | ENM-U2 | CEO 生成＋AI 非生成加工 | 同上 | 2026-08-04（加工 2026-08-24） | UNKNOWN | UNKNOWN | UNKNOWN | bbox 抽出・512² 化・破片除去（決定100） | ENM-U2 | juuma `d82dc1db38a66001`・oni `5f763eaaa5648e84` | △ |

### 3-D. OTOMO（5 行）

| ID | Path（配信） | Source file（art-source） | Category | Creator | Model-Service | Generation date | Prompt reference | Reference inputs | Terms version・date checked | Commercial use | Modification | Attribution | Canonical source | Evidence（sha256） | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| OTM-KIT-01 | `otomo/<id>/doji.webp` ×7（1600²・alpha なし・0.78〜0.89MB）・**実行時参照 0**【実測：`src` grep】（`.vercelignore` 候補・判定 §3 #8） | Kit そのもの | otomo | Kit 公式 | — | 2026-07-16 | — | — | Kit `SGG-FAN-CREATION-GUIDELINES-1.0.0` | 可 | 無加工 | 任意 | `<pair>:OTOMO_DOJI`（7/7 manifest sha256 一致【実測】） | taimaru `fd5c665fb90902ae`・kozuchi `866bfd931d4e33c6`・momokatsu `345a1f4be250d044`・kotone `d1a3c42ef6435a72`・juka `e5000ed33af1e980`・haku `fe99f18a205e7468`・shofuku `e2296971b394877a` | ◎ |
| OTM-D-01 | `otomo/<id>/spirit_320.webp` ×7（320²・alpha） | `art-source/otomo/<id>/spirit_transparent.webp`（決定117）← Kit `spirit.webp`（art-source・manifest 一致【実測】） | otomo | AI 非生成加工 | — | 透過 2026-08-28（決定117）・320 化 2026-09-06（決定130） | — | — | Kit | 可 | 可・実施：PLAN-C ハイブリッド背景除去（決定117）→320px（決定130）。描き直し 0 | 任意 | `<pair>:OTOMO_SPIRIT` | taimaru `cf7e6d93496b760d`・kozuchi `0c15680e11d5061b`・momokatsu `c4ddf0e08854ccad`・kotone `7bbd2c2076373faf`・juka `cb5611ca26bc00cc`・haku `a6c5e34754853bd7`・shofuku `c2299d7a8916fdfb` | ◎ |
| OTM-D-02 | `otomo/<id>/incarnate_320.webp` ×7 | `art-source/otomo/<id>/incarnate_transparent.webp` ← Kit `incarnate.webp`（manifest 一致【実測】） | otomo | AI 非生成加工 | — | 同上 | — | — | Kit | 可 | 同上 | 任意 | `<pair>:OTOMO_INCARNATE` | taimaru `51c80f01f6463c7e`・kozuchi `d08eb18f9b6bd08d`・momokatsu `4a145cb103a852d4`・kotone `ea46f5f9e34b208e`・juka `e07d92813be21c1f`・haku `3c82221ff69d5625`・shofuku `8bd92e2d92d1b272` | ◎ |
| OTM-D-03 | `otomo/<id>/doji_320.webp` ×7 | `art-source/otomo/<id>/doji_transparent.webp` ← OTM-KIT-01 | otomo | AI 非生成加工 | — | 同上 | — | — | Kit | 可 | 同上 | 任意 | `<pair>:OTOMO_DOJI` | taimaru `a322fa16ed899be3`・kozuchi `63af8959614f2b46`・momokatsu `98e310ac24c0908e`・kotone `68d423bd564f5ac8`・juka `5a6546e39f2666f0`・haku `8ae933a16ce85429`・shofuku `b4b64500dd40e6e6` | ◎ |
| OTM-BG-01 | `otomo/<id>/background.webp` ×7（900×437／shofuku 900×404）・OTOMO 絆カードの背景（`godStyle.ts` `OTOMO_BACKGROUND_IMAGE`） | **未保全**（`godStyle.ts` 注記：CEO 承認の参考イメージ 7 枚（Downloads・リポジトリ外）から切り出し。「原本は保存していない」） | otomo | **UNKNOWN**（CEO 提供の参考画像。生成か否か docs に記録なし） | UNKNOWN | git 初出 2026-08-21 `ee433f7`【実測】 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | 実施：パネル切り出し＋WebP 軽量化（非生成） | UNKNOWN | なし（原本未保全） | taimaru `5acfd974dbac6ef5`・kozuchi `7f7ae7b6990b543c`・momokatsu `ad6430fa7241b5c4`・kotone `cbdeb6a4fe9044a2`・juka `b9efe05b4d78fa8b`・haku `0a2cb6c652f43bf6`・shofuku `33c19fa8498e5c9e` | ✗ |

### 3-E. カード（60 枚・16 行）

共通【docs：決定37】：Creator＝CEO 生成／Model-Service＝ChatGPT（Web）・**プラン UNKNOWN**／生成方式＝4 枚を 2×2 または横並びの 1 シートで生成→PowerShell System.Drawing で 4 分割（各 362×543 相当）→1024×1536 へ**拡大**リサイズ＝master（`art-source/cards/*.png`・56 枚）→Canvas API で 512×768 WebP q0.85（決定84 記載の手順）／Prompt reference＝`docs/card-art-prompts.md`（①土台＋バッチ別）／Reference inputs＝**UNKNOWN**（神専用カードは「顔の一致は求めない」方針＝Kit 画像を入力したかは未記録）／Terms＝**UNKNOWN**（サービス規約の版・確認日）／Commercial＝UNKNOWN／Modification＝上記の切り出し・リサイズ・WebP 化のみ／Attribution＝UNKNOWN／Canonical＝master PNG（決定84 の 4 枚は master 未保全）／Generation date＝≈2026-08-05〜06（決定37・共通→神専用の順）・決定84 の 4 枚＝2026-08-16／git：`7ddbd5c`（08-14）・`7f53f25`（08-16 optimize）。画風＝E（`CARD_ART_STYLE_GUIDE.md`）。

| ID | Path（配信） | Source（art-source/cards） | Generation date | Evidence（sha256・配信） | Status |
|---|---|---|---|---|---|
| CARD-CA-01 | `cards/card_common_attack_01〜08.webp`（8） | 同名 PNG 8 枚 | ≈2026-08-05（決定37 バッチ 1〜2） | 01 `e53aaacc6c395c59`・02 `e6ad9bc883de1c0b`・03 `bcbb279a2da4526f`・04 `ba4429e1114c3e86`・05 `768aea3bedda89f4`・06 `0db9a0143a8136b7`・07 `4cb24c3cd94fa6dd`・08 `a8f1e9c18ffe5f2b` | △ |
| CARD-CA-02 | `cards/card_common_attack_09.webp`（連撃） | **未保全**（art-source に無し） | 2026-08-16（決定84） | `c085c86713532a81` | ✗ |
| CARD-CG-01 | `cards/card_common_guard_01〜04.webp`（4） | 同名 PNG 4 枚 | ≈2026-08-05 | 01 `c812bcab6b6f779c`・02 `127a352f5ca02798`・03 `61ce04d51343af35`・04 `ccdfc186233a965c` | △ |
| CARD-CH-01 | `cards/card_common_hinder_01〜04.webp`（4） | 同名 PNG 4 枚 | ≈2026-08-05 | 01 `5d950dff209549c1`・02 `e2eba140d7b2d70f`・03 `11a23f044ea62f55`・04 `1fb57f872f470d4f` | △ |
| CARD-CH-02 | `cards/card_common_hinder_05.webp`（浄めの光） | **未保全** | 2026-08-16（決定84） | `c9d569d8eea6606d` | ✗ |
| CARD-CO-01 | `cards/card_common_oracle_01〜03.webp`（3・alpha あり） | 同名 PNG 3 枚 | ≈2026-08-06（バッチ 7-2） | 01 `ba52f64d78f76ed3`・02 `d562f568e65730ac`・03 `47dcdf38bcf04260` | △ |
| CARD-CR-01 | `cards/card_common_resonance_01〜04.webp`（4） | 同名 PNG 4 枚 | ≈2026-08-05 | 01 `1dae1d6c9aae731d`・02 `44a7867a9aea8771`・03 `035af70cb219560c`・04 `1d16bb8a1b73b4f8` | △ |
| CARD-CS-01 | `cards/card_common_support_01〜05.webp`（5） | 同名 PNG 5 枚 | ≈2026-08-05 | 01 `23cfeb45f8ab9942`・02 `2b5dde61a9c5d0b9`・03 `3eca75fc8aae46c4`・04 `6322866bf7347750`・05 `1dafa4a9482f1197` | △ |
| CARD-CS-02 | `cards/card_common_support_06〜07.webp`（闘志・見通し） | **未保全** | 2026-08-16（決定84） | 06 `db4fb4f03c4ba811`・07 `aa27703d5bc4e1ba` | ✗ |
| CARD-EBISU-01 | `cards/card_ebisu_{attack_01,attack_02,support_01,support_02}.webp`（4・alpha あり・スタイルガイド C 評価「再生成した方がよい」＝再生成の記録なし） | 同名 PNG 4 枚 | ≈2026-08-06（バッチ 8） | `47f763c45edf192b`・`61c237da76695458`・`9bb6c7618830312c`・`24001f4610b39aba` | △ |
| CARD-TAIYO-01 | `cards/card_taiyo_{attack_01,attack_02,support_01,support_02}.webp`（4）。`attack_01` は CARD-NEXT-01 で supersede 予定（旧ファイルは残す） | 同名 PNG 4 枚 | ≈2026-08-06（バッチ 9） | attack_01 `442aa5ae733ec7c2`・attack_02 `7676a075ff5bab6e`・support_01 `d638c1c8f4cc8634`・support_02 `15bfa978a823d2f8` | △ |
| CARD-SOBI-01 | `cards/card_sobi_{attack_01,guard_01,guard_02,hinder_01}.webp`（4） | 同名 PNG 4 枚 | ≈2026-08-06（バッチ 10） | `26b851522df60a2c`・`0fa19bc6210cf7c4`・`bf0ea31cb906d91b`・`2696ca25cf85046a` | △ |
| CARD-SAIKA-01 | `cards/card_saika_{attack_01,resonance_01,support_01,support_02}.webp`（4） | 同名 PNG 4 枚 | ≈2026-08-06（バッチ 11） | `dd6d24d8a28eb927`・`5976d86d9341eebe`・`6f2fb20b0c5e07e7`・`1b66d07064ee3984` | △ |
| CARD-JURAKU-01 | `cards/card_juraku_{attack_01,guard_01,hinder_01,resonance_01}.webp`（4） | 同名 PNG 4 枚 | ≈2026-08-06（バッチ 12） | `af4ca261f0b71721`・`9e18f6c49582bdb5`・`35950307052b754a`・`94ad4c9b4f4d4cf7` | △ |
| CARD-FUKUEI-01 | `cards/card_fukuei_{attack_01,attack_02,resonance_01,support_01}.webp`（4） | 同名 PNG 4 枚 | ≈2026-08-06（バッチ 13） | `57db7edafd0aede9`・`de02cb8423da0d59`・`7fa4fa97c758483a`・`58624a0b652489dd` | △ |
| CARD-SHOUREN-01 | `cards/card_shouren_{attack_01,guard_01,support_01,support_02}.webp`（4） | 同名 PNG 4 枚 | ≈2026-08-06（バッチ 14） | `5cab7acc53e7e45c`・`a03998fd9639b275`・`79f8cf37554700e0`・`86b390d50a64be21` | △ |

### 3-F. ステージ背景（7 行）＋アリーナ（1 行）

共通【docs：決定124】：Creator＝CEO 生成／Model-Service＝ChatGPT・**プラン UNKNOWN**／生成＝1 ステージ 1 生成・各 1672×941／配信＝1600×900 WebP（非生成の縮小・エンコード）／**原本未保全**（art-source なし）／Prompt reference＝UNKNOWN（決定124 にアート方向の記述のみ・プロンプト本文の docs なし）／Reference inputs＝UNKNOWN／Terms＝UNKNOWN／Commercial＝UNKNOWN／Attribution＝UNKNOWN／Generation date＝≈2026-08-30（決定124・commit `8b2a980` 同日【実測】）／画風＝F（厚塗り風景）。Status＝✗（原本未保全＋規約 UNKNOWN。判定 §2-1 と同じ）。

| ID | Path（配信） | 敵（`enemies.ts` `stage`） | Evidence（sha256） | Status |
|---|---|---|---|---|
| STG-01 | `backgrounds/stages/01-trial-shadow.webp`（237,844B） | 試練の影「褪色の神殿」accent `#6b5b95` | `9fc80c6ee199b1cb` | ✗ |
| STG-02 | `backgrounds/stages/02-oni-castle.webp`（214,090B） | 業斧の鬼将「戦火の陣」`#e5484d` | `0a55b064af931b58` | ✗ |
| STG-03 | `backgrounds/stages/03-ghost-hydrangea.webp`（297,936B） | 藍花の怨霊「藍花の廃社」`#7a4fc4` | `a605a815164fe717` | ✗ |
| STG-04 | `backgrounds/stages/04-mecha-workshop.webp`（271,074B） | 銀甲の機工師「機巧工房」`#9b59b6` | `e7c28deee5545e93` | ✗ |
| STG-05 | `backgrounds/stages/05-beast-moonpeak.webp`（308,102B） | 双牙の魔獣「月牙の霊峰」`#9fb8e8` | `3b4a4fce06f89ec8` | ✗ |
| STG-06 | `backgrounds/stages/06-dragon-ocean.webp`（321,686B） | 蒼海の龍神「蒼海の宮」`#1a3a6b` | `b0f489e3071b971e` | ✗ |
| STG-07 | `backgrounds/stages/07-jester-festival.webp`（281,906B） | 乱舞の道化「幻惑の舞台」`#c0122f` | `91d943203db98938` | ✗ |
| STG-ARENA | `backgrounds/arena.jpg`（1672×941・308,876B・`battle.css` の `--stage-bg` フォールバック） | 共通（決定41 ①・`docs/battle-fx-prompts.md` ①がプロンプト・CEO 生成 ChatGPT・≈2026-08-07・原本未保全・プラン／規約 UNKNOWN） | `533c6ee080eba531` | ✗ |

### 3-G. FX（6 行）

共通【docs：決定41 ②】：Creator＝CEO 生成／Model-Service＝ChatGPT・**プラン UNKNOWN**／生成＝6 種を **1 シート（2×3）黒背景**で生成→6 分割・縮小→320×480 PNG（黒地のまま `mix-blend-mode: screen` で合成）／**原本シート未保全**／Prompt reference＝`docs/battle-fx-prompts.md` ②／Reference inputs＝UNKNOWN／Terms＝UNKNOWN／Commercial＝UNKNOWN／Attribution＝UNKNOWN／Generation date＝≈2026-08-07（決定41 の記録日 08-08）／git 初出 `7ddbd5c`（08-14）。Status＝✗。

| ID | Path（配信） | 用途（`cardStyle.ts` `CAST_FX`） | Evidence（sha256） | Status |
|---|---|---|---|---|
| FX-01 | `fx/cast-attack.png`（262,996B） | 攻撃 | `9804938c983d8ffe` | ✗ |
| FX-02 | `fx/cast-guard.png`（317,711B） | 防御 | `5bc29f019fca029c` | ✗ |
| FX-03 | `fx/cast-hinder.png`（346,520B） | 妨害 | `87fd0f3921720edb` | ✗ |
| FX-04 | `fx/cast-oracle.png`（429,419B） | 神託 | `47d22097c07b0207` | ✗ |
| FX-05 | `fx/cast-resonance.png`（320,747B） | 共鳴 | `13376136d604bcc3` | ✗ |
| FX-06 | `fx/cast-support.png`（301,894B） | 支援 | `1eb6e347abf05bbf` | ✗ |

### 3-H. SE（1 行・20 ファイル）

| ID | Path（配信） | Source | Category | Creator | Model-Service | Generation date | Prompt reference | Reference inputs | Terms | Commercial | Modification | Attribution | Canonical | Evidence（sha256） | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SE-01 | `se/*.wav` ×20（16-bit mono 22.05kHz・計 337KB） | `scripts/gen-se.mjs`（決定論的に再生成可） | se | 自作（数式合成。サンプル・録音・第三者素材 0） | — | 決定128（`docs/SE_ASSETS.md`） | — | — | プロジェクト所有 | 可 | — | 不要 | `scripts/gen-se.mjs` | block `9299399a8be8236b`・boss_entrance `376668d2b9a27e64`・burst_ready `ce60a29f46086bda`・card_draw `d9e83fcaa644ccaa`・card_play `d9efb827b66db183`・defeat_sting `8d80352ddf24c6e7`・divination `becc37cce673516e`・enemy_charge `3b0abdd2ebca060d`・enemy_turn `c1fabaeca7747e55`・evolve `a46a5a7dbc122979`・heal `cf93e1d018887abf`・hit_l1 `678524a5775e3158`・hit_l2 `43a423c2ee5613d6`・hit_l3 `c9048d12a58a23cb`・hit_l4 `7ee4b80b1935eef5`・resonance_gain `69221957596390b7`・reward `e3a9aa4435614517`・self_hit `a214d6c648ec1274`・self_hit_heavy `840153a5af76c0e6`・victory_sting `5d6e919689dab946` | ◎ |

### 3-I. BGM（4 行）

共通【docs：決定120・170】：Creator＝CEO 生成／Model-Service＝**Suno**（ID3v2 `made with suno`・Suno, Inc. 署名の C2PA マニフェスト・systemVersion `chirp-auk-turbo-t2`）・プラン＝**有料プラン**（「2026-08-13 の生成時は有料プランだった」を CEO がアカウント側で確認・スクリーンショット保存【docs：決定120】。**プラン名（Pro／Premier）は UNKNOWN**）／Source＝`audio-source/bgm/*.mp3`（200kbps 原音源）／配信＝WebM Opus 48k（主）＋MP3 96k（フォールバック）（決定170・非生成の再エンコード）／Prompt reference＝`docs/bgm-prompts.md`／Reference inputs＝なし（テキストプロンプトのみ・docs 記載）／**Terms version＝UNKNOWN**（Suno 利用規約の版・確認日は未記録。§21-b と同じ）／Commercial＝可（Suno の規定「有料プラン加入中に生成した曲＝commercial use rights」に対し CEO 確認済み・決定120。著作権の帰属保証は Suno 規約上なし）／Attribution＝UNKNOWN（規約の版に依存）／Modification＝再エンコードのみ。Status＝△。

| ID | Path（配信） | 曲名／song id | Generation date | Evidence（sha256：webm／mp3） | Status |
|---|---|---|---|---|---|
| BGM-01 | `bgm/battle.webm`＋`bgm/battle.mp3` | 「七神の戦場」 `c057529a-440b-4756-af43-6895fe01e6d9` | 2026-08-13 12:48:51Z（決定120・ID3 記録） | `94a9a3c41f24dad8`／`08a31184f78f0a23` | △ |
| BGM-02 | `bgm/home.webm`＋`bgm/home.mp3` | UNKNOWN（決定120「4 曲とも Suno」・song id は battle のみ docs に記載） | UNKNOWN（≈2026-08-13〜14・決定52〜55） | `04dd82303caf26df`／`40c09b7a73519cbb` | △ |
| BGM-03 | `bgm/victory.webm`＋`bgm/victory.mp3` | UNKNOWN | UNKNOWN（同上） | `dc3226d20861a299`／`1e951ffca1257b34` | △ |
| BGM-04 | `bgm/defeat.webm`＋`bgm/defeat.mp3` | UNKNOWN | UNKNOWN（同上） | `70315a7201058f16`／`6b70df4b909c7168` | △ |

### 3-J. その他

| ID | Path | 備考 | Status |
|---|---|---|---|
| MISC-01 | `.gitkeep`（305B） | asset ではない（sha `f25a69ce7c163180`） | — |

---

## 4. CEO INPUT 欄 — CEO にしか埋められない cell（これ以外は AI が埋め済み）

記入は本表の右列に書き込めば AI が §3 へ転記する。**推奨（判定 §6）**：カード 60 枚・背景 7 枚を作った既存サービスをそのまま使い、規約を確認した旨と版・日付を記録する。新規サービス・有料プランは追加しない。

| # | 対象行 | 埋める cell | 現在値 | 必要な理由 | CEO 記入 |
|---|---|---|---|---|---|
| 1 | CARD-*（16 行・60 枚） | Model-Service の**プラン**（ChatGPT のプラン名）／Generation date（バッチごとの実日付。≈08-05〜06・08-16 の確定）／**Terms version・確認日**／Commercial／Attribution | プラン UNKNOWN・日付 ≈・Terms UNKNOWN | P15・Launch Gate（Rights）。After-2（CARD-NEXT-01）は同じサービスの想定なので、ここが埋まれば After-2 の行もほぼ埋まる | |
| 2 | CARD-*（神専用 28 枚） | **Reference inputs**：生成時に Kit の神画像（`main.webp`／`front.webp`／keyvisual）を添付したか。したならファイル名 | UNKNOWN | Guidelines §2 は許可。サービス側の「入力画像の扱い」規約と紐づけるため | |
| 3 | CARD-CA-02／CH-02／CS-02（決定84 の 4 枚） | master PNG の所在（Downloads 等）→ `art-source/cards/` へ保全可か | 未保全 | ✗ → △ に上げる唯一の手段 | |
| 4 | STG-01〜07・STG-ARENA | プラン／生成日（7 枚各）／Terms version・確認日／**原本 1672×941 PNG の所在**（保全できれば art-source へ） | ✗（判定 §2-1 と同じ） | LCP 要素・7 枚全部が常時表示 | |
| 5 | FX-01〜06 | プラン／生成日／Terms／**原本シート（2×3・黒地）の所在** | ✗ | 同上 | |
| 6 | ENM-01／04／07（生成系 3 体） | プラン／Terms version・確認日／プロンプト本文（あれば docs へ）／Reference inputs（Kit 画像を入力したか） | △ | Enemy Brief v1 は同じ経路で v2 を作る前提。3 体の記録が「前例」になる | |
| 7 | ENM-02／03／05／06・ENM-U1〜U3（世代 A シート由来） | プラン／Terms version・確認日／**原本シート（`ChatGPT Image 2026年8月4日 07_35_20.png`・1536×1024）を `art-source/enemies/` に保全してよいか**（除外ローカル `敵画像` メモとは別物として） | △・原本 repo 外 | 修復版 4 体の Canonical を repo 内で閉じるため | |
| 8 | GOD-K-01〜07・GOD-KH-01／02（keyvisual 7 柱） | **Creator**：SGG 公式配布物（Kit 外の公式キービジュアル）か、CEO が生成したものか。公式なら入手元 URL・入手日・適用規約（Kit Guidelines か別か）。生成ならサービス／プラン／日付／Terms | UNKNOWN | E1 Home・勝利の舞台・カットインで最も大きく表示される画像。「公式・公認と誤認させない」（Guidelines §5）の観点で出所が要る | |
| 9 | OTM-BG-01（OTOMO 絆カード背景 7 枚） | 参考イメージ 7 枚の**出所**（生成ならサービス／プラン／日付／Terms・第三者素材なら権利元）・原本の所在 | ✗ | 原本未保全 | |
| 10 | BGM-01〜04 | **Suno 利用規約の版と確認日**／プラン名（Pro／Premier）／home・victory・defeat の song id と生成日時（ID3 から AI が読めるが、docs 記録がないため CEO のアカウント側と突合） | Terms UNKNOWN | 決定120 の「残る未確定」 | |
| 11 | GOD-D-02／03（`main.png`／`front.png`） | 決定41／42（生成立ち絵へ差し替え）の後、Kit の絵へ**戻した日付・経緯**（決定番号があれば） | UNKNOWN | 現ファイルが Kit 派生であることは決定130 の実測で裏付けられているため優先度低 | |
| 12 | 全 Kit 行（GOD-KIT／OTM-KIT／OTM-D） | Kit Guidelines v1.0.0 を CEO が確認した**日付**（1 つでよい） | UNKNOWN | 「Terms version・date checked」列を完成させる | |

CEO INPUT が不要なもの：SE（自作）、Kit 公式ファイルの sha256 照合（AI 実測済み）、非生成加工の履歴（決定117／130／174／177〜183 に記録済み）。

---

## 5. 集計（2026-09-27）

| 群 | 行数 | ◎ | △ | ✗ | UNKNOWN |
|---|---|---|---|---|---|
| 3-A 神 Kit 公式 | 21 | 21 | 0 | 0 | 0 |
| 3-B 神 派生・keyvisual | 12 | 1 | 11 | 0 | 0 |
| 3-C 敵 | 10 | 0 | 10 | 0 | 0 |
| 3-D OTOMO | 5 | 4 | 0 | 1 | 0 |
| 3-E カード | 16 | 0 | 13 | 3 | 0 |
| 3-F ステージ・アリーナ | 8 | 0 | 0 | 8 | 0 |
| 3-G FX | 6 | 0 | 0 | 6 | 0 |
| 3-H SE | 1 | 1 | 0 | 0 | 0 |
| 3-I BGM | 4 | 0 | 4 | 0 | 0 |
| §2 予約行 | 1 | 0 | 0 | 0 | 1 |
| **計** | **84** | **27** | **38** | **18** | **1** |

- ファイル数ベース（`public/assets/` は **209 ファイル**【実測：`inventory.json` rows＝209・`find` 209。判定 §付録の「218」は誤記】。`.gitkeep` を除く 208）：◎＝神 Kit 21＋front_640 7＋OTOMO doji 7＋OTOMO _320 21＋SE 20＝**76**／△＝神 main.png・front.png 14＋keyvisual 7＋keyvisual-home 5＋keyvisual-hero 1＋敵 16＋カード 56＋BGM 8＝**107**／✗＝OTOMO background 7＋カード 4＋ステージ 7＋アリーナ 1＋FX 6＝**25**（76＋107＋25＝208・一致）
- UNKNOWN cell の主因は 3 つ：①生成サービスの**プラン・規約版・確認日**（カード・敵・背景・FX・BGM の全行）②**原本未保全**（背景 8・FX 6・OTOMO 背景 7・カード 4）③**keyvisual の出所**（公式か生成か）

## 6. 参照

- `docs/PREMIUM_PHASE_JUDGMENT_2026-09-27.md` §2（棚卸し・画風系統 A〜F）・§2-3（権利整理）・§5-3・§6（CEO 確認事項）
- `docs/SEVENGODS_47_LESSONS_CONSOLIDATION_AUDIT.md` §21-b（本台帳の要求元）・`docs/SEVENGODS_NEXT_MILESTONES.md` L4
- `docs/assets-kit/manifest.json`（Kit sha256・`rightsTermsVersion`）・`docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md`（Guidelines v1.0.0）
- `art-source/README.md`（原本の所在と書き出し手順）・`docs/ENEMY_VISUAL_BATCH_A.md`・`docs/ENEMY_VISUAL_QUALITY_AUDIT.md`・`docs/SE_ASSETS.md`・`docs/card-art-prompts.md`・`docs/battle-fx-prompts.md`・`docs/bgm-prompts.md`・`docs/god-portrait-prompts.md`
- `scripts/premium-phase-judgment/out/inventory.json`（寸法・形式・容量）
- 次の記入：`docs/LANE3_IMAGE_BRIEF_GOUKAI_NO_ICHIGEKI.md` §13〜§14（After-2）・`docs/ENEMY_ART_DIRECTION_BRIEF_V1.md` §13（敵 v2）
