# 敵ビジュアル世代A oni — M4 Production Release Candidate（決定181）

- 実施日：2026-09-15
- branch：`feat/enemy-oni-m4-rc`（`master 8256b60` から分岐。**master へ merge していない**）
- 性質：**RC作成＋QA ONLY**。CEOの oni M4 実機QA承認（2026-09-15・`localhost:4180/?enemy=oni&seed=ceo-qa`）を受けた次Step。**Production 反映承認ではない**
- 唯一の source：`art-source/enemies/oni-restoration-pilot/M4_unmatte_2step-1024.webp`（sha256 `78de6fe912a699f026f1dca8aac249345d4d0dc42214025d588a0c160111101f`）
- 許可した操作：resize／WebP re-encode／metadata除去のみ。**画像生成・AI redraw・inpainting・追加修復は一切行っていない**
- 手法：juuma 決定179（`feat/enemy-juuma-m4-rc`）と同一パイプライン・同一指標定義を流用（scratchpad, 非track の sharp スクリプト）
- 判定：**PASS — READY FOR CEO RELEASE APPROVAL**（Production への反映はまだ実施していない）

---

## 0. CEO QA Cleanup（Step 0）

- `localhost:4180/?enemy=oni&seed=ceo-qa` のQAサーバー：確認時点で既にリスナーなし（cleanup不要）。disposable QA buildも repository 外に見当たらず
- 開始時点：`master` HEAD＝`origin/master`＝`8256b60`（決定180 の Production release 系列から予期しない変更なし）、tracked差分 0（除外ローカルフォルダ「敵画像」のみ untracked で残置・不変）

## 1. Source Lock 確認

CEO指定ハッシュと完全一致することを、起動前に再ハッシュ確認した。

```
sha256 : 78de6fe912a699f026f1dca8aac249345d4d0dc42214025d588a0c160111101f
bytes  : 192,478
canvas : 1024×1024
body   : 720×870@(152,78)
```

過去セッションの scratchpad（`oni-audit/pilot/M4_unmatte_2step-1024.webp`）から本セッションの scratchpad へ再取得し、コピー後に再度 sha256 を照合して完全一致を確認した。

## 2. 768 RC 作成

juuma 決定179 と同じ理由（M4 は現行 Production の構図比をそのまま使うよう設計済みのため、bbox 再配置ではなく単純リサイズの方が Source Lock を厳密に満たす）で、**M4(1024) の単純な等倍縮小＋WebP再エンコードのみ**で作成した。

```
sharp(M4).resize(768,768,{kernel:'lanczos3'}).webp({quality:90,alphaQuality:100,effort:6})
```

品質は「q90既定→33dB未達なら段階的に92/94/95へ引き上げ」方式。**q90で初回から37.6dBを達成**したため、引き上げ不要。

| | 値 |
|---|---|
| 出力 | `art_hq.webp` |
| 寸法 | 768×768 |
| body | 540×653@(114,58) |
| 容量 | 123,010 bytes |
| sha256 | `6c25cdb815e2cb0a48277d51f9f8f74940e84f281c9a6a3b8554942968bd18ca` |

## 3. Composition Lock（M4 1024 vs 768 RC）

| 指標 | M4(1024) | RC(768) | 差 | CSS px換算＊ | 許容 | 判定 |
|---|---|---|---|---|---|---|
| bodyHeightRatio | 0.8496 | 0.8503 | 0.0007 | 0.14px | ≤0.5px | PASS |
| centerX | 0.5000 | 0.5000 | 0.0000 | 0.00px | ≤0.5px | PASS |
| bottom | 0.9258 | 0.9258 | 0.0000 | 0.00px | ≤0.5px | PASS |
| body aspect | 0.8276 | 0.8270 | 0.07% | — | ≤0.5% | PASS |
| サイズ差（本体 540×653 vs 期待値 540×652.5） | — | — | 0.08% | — | ≤0.5% | PASS |

＊実ゲームで実測した `.enemy-avatar` box（PC・後述§6）290.83×203.97px を基準に換算。

実ゲームでの enemy box は、後述§6の実機QAで oni の `.enemy-avatar` 背景画像として RC が正しく描画され、Current Production と同一の box 寸法（asset差し替えのみで CSS 側は完全不変）であることを確認した。

## 4. Identity Gate（RC vs M4）

juuma 決定177/179 と同一定義（本体 bbox を 256×256 に正規化し、silhouette IoU・4象限ランドマークずれ・色域ヒストグラム交差から算出。`score = IoU×50 + 25 + colorHist×25`、landmark 0px で満点25）。

| 指標 | 値 | 基準 | 判定 |
|---|---|---|---|
| Identity Score（RC vs M4） | **99.15** | ≥98 | **PASS** |
| Silhouette IoU（RC vs M4） | **0.9965** | ≥0.97 | **PASS** |
| landmark shift（RC vs M4） | **0px**（4象限すべて） | =0px | **PASS** |
| colorHistIntersection | 0.9732 | — | 参考 |
| デザイン変更 | **0件**（単純リサイズのため構造上変わり得ない） | 0件 | **PASS** |

参考：RC vs Current Production（世代差はあるが構図の相似のみ確認） Identity 98.54／IoU 0.9903／landmark 0px。

## 5. Encoding Fidelity（1024 M4 → 768 RC）

juuma 決定179 と同一の `compare()` 定義（alpha≤8 の完全透明画素は符号化ロス測定から除外）で、可逆参照（M4を768へ Lanczos 縮小した PNG）と q90 WebP を比較。

| 指標 | 値 | 基準 | 判定 |
|---|---|---|---|
| PSNR（可逆参照比） | **37.6dB** | ≥33dB | **PASS** |
| SSIM相当 | 0.9989 | — | 参考 |

## 6. Important Visual Metrics（Current Production / M4 / RC 同一手法で再測定）

| 指標 | Current Production | M4(1024) | **RC(768)** | 判定 |
|---|---|---|---|---|
| white fringe | 87.4% | 33.8% | **74.5%** | 数値上は M4比+40.7pt（詳細は§6-1） |
| jagged（per100行） | 26.2 | 16.1 | **15.9** | **PASS**（M4よりわずかに良好、Currentより大幅改善） |
| ringing（halo・asset単体） | 94.4% | 78.3% | **84.2%** | 数値は上昇（§6-1と同根） |
| alpha内部の半透明画素 | 8,956 | 32,467 | 21,524 | 参考（縮小によるサンプル数変化） |
| 完全透明の穴 | 0 | 0 | 0 | PASS |

CEO提示の Current Production（white fringe 87.4% / jagged 26.2 / halo 94.4%）・M4（33.8% / 16.1 / 78.3%）の数値は、本セッションの再測定と完全一致した（測定手法の同一性を確認）。

### 6-1. white fringe / halo 数値上昇の切り分け（juuma 決定179 と同型の3点診断）

M4→RC で white fringe・halo が数値上は上昇するが、Current Production（87.4% / 94.4%）は依然として下回っており、**実描画での悪化ではない**。以下3点で「measurement artifact（縮小によるサンプル点減少への感度）」であり実劣化でないことを確認した。

**(a) 対照実験**：M4(1024)を複数サイズへ**可逆PNGリサイズのみ**（WebP変換なし）で縮小し、fringe/halo がサイズに強く鋭敏であることを確認。

| size | white fringe | halo |
|---|---|---|
| 1024 | 33.8% | 78.3% |
| 950 | 63.9% | 77.1% |
| 900 | 67.0% | 79.1% |
| 850 | 72.2% | 80.9% |
| 800 | 73.9% | 82.6% |
| 768 | 74.2% | 84.0% |
| 700 | 79.5% | 85.4% |
| 600 | 85.0% | 88.0% |

→ 1024→768 だけで白フチが 33.8%→74.2% に跳ね上がり、600まで単調増加。**WebPを介さない可逆リサイズだけで再現**するため、圧縮由来ではなくリサイズ自体（半透明alpha縁のサンプル画素数が縮小で減り、統計が縁の少数画素に敏感になる）が主因と判定。

**(b) 分離実験**：768での「resizeのみ寄与」と「WebP再エンコードの追加寄与」を分離。

| | white fringe | halo |
|---|---|---|
| resizeのみ（可逆PNG） | 74.2% | 84.0% |
| resize＋WebP q90 | 74.5% | 84.2% |

→ WebP再エンコードの寄与は **+0.3pt / +0.2pt のみ**。数値上昇の大部分（+40.4pt）はリサイズ自体に起因し、圧縮品質の問題ではない。

**(c) 目視確認**：チェッカーボード背景合成で Current Production／M4／RC を並べて確認（全体像＋斧刃先・角・顔の拡大クロップ）。

- 白フチ・新規haloの目視増加：なし（RCはM4と同等の忠実度。斧刃先の輪郭・金装飾・白髭・牙・viewer左右の角・金縞いずれも欠損／変形なし）
- 明部パーツ（斧刃・金装飾・角の金縞）の侵食：なし
- RCはCurrent Productionより明確に高精細（輪郭のジャギー・白フチ双方が視覚的に改善）

**結論**：white fringe/halo の数値上昇は測定アーティファクトと判定。追加の画像処理（Source Lock違反）は行っていない。FAIL条件（Currentより実描画で悪化／M4より目視で白フチ増加／新規halo発生／明部パーツ侵食）はいずれも該当しない。

## 7. Real Game QA（QA専用ビルド・Current Productionへは未反映の状態で確認）

`vite preview`（QA専用・ポート4181）を起動し、`?enemy=oni&seed=rc-qa` で実プレイを実施。

- **描画**：`.enemy-avatar` の background-image が `assets/enemies/oni/art_hq.webp` を参照し、box 290.83×203.97px（PC）で正しく描画。破損画像 0
- **ネットワーク**：`GET /assets/enemies/oni/art_hq.webp` → 200 OK・`image/webp`・123,010 bytes（コミット予定ファイルと完全一致）
- **JSエラー**：0（Chrome拡張由来の無関係な警告のみ）
- **実プレイ**：カード使用でoni HP 1,000→970（ダメージ反映）、スコア 0→50、手札5→4枚、恵比寿へのブロック付与エフェクトを確認。戦闘の基本ループが正常動作
- **viewport**：本ツールの制約で実ブラウザ側のウィンドウリサイズがDPR/実ビューポートに反映されない事象があり、CEO指定の5viewport（1366×768 DPR1/DPR2・1508×660 DPR1・390×760・390×844）個別の実測はできなかった。ただし §8 で JS/CSS/HTML が Current Production と byte完全一致であることを証明しており、asset以外のレイアウト挙動（enemy box寸法・レスポンシブ動作）は全viewportでCurrent Productionと完全に同一になる。実測できたPC相当viewportでは box一致・破損0・エラー0を確認済み

## 8. Regression

- **tests**：3,041 passed／9 skipped／0 failed（`vitest run`）
- **typecheck**：`tsc -b` 0 error
- **lint**：`oxlint` 0 error（既存警告のみ、本変更と無関係）
- **build**：成功
- **bundle byte一致**：`dist/assets/index-CLclgl5i.js`・`index-IKMGO-ur.css`・`index.html` が変更前ビルドと byte完全一致（asset-only変更であることをbyteで証明）
- **他アセット不変**：datenshi／karakuri／doukeshi／juuma（art.webp・art_hq.webp）／ryujin／onryo の全アセットが `master` と byte完全一致
- **`src/` 不変**：`git diff master -- src/` 差分 0
- **設定不変**：`package.json`／`package-lock.json`／`vite.config.ts`／`vercel.json`／`index.html` すべて `master` と差分 0（sharpは `npm i sharp --no-save` でrepo非汚染のローカル導入のみ）

## 9. Ranking / Security Gate

- bundle内 `ranking`/`neon`/`postgres`/`DATABASE_URL` 走査：ヒットは既存の `ranking:{submissionEnabled:!1,...}` プレースホルダのみ（変更前ビルドにも同一内容で存在。新規混入なし）
- tracked `.env`：0
- secret：0

## 10. 変更スコープ

含まれるファイル（`master` との差分）：

- `public/assets/enemies/oni/art_hq.webp`（Production asset・変更）
- `art-source/enemies/oni-restoration-pilot/M4_unmatte_2step-1024.webp`（配信対象外・新規、provenance）
- `art-source/README.md`（配信対象外・1行追記）
- `docs/DECISIONS.md`（配信対象外・1行追記）
- `docs/ENEMY_GENA_ONI_M4_RC.md`（配信対象外・本書）

`src/`／CSS／他の敵asset／Daily／Ranking／Neon・DB／`api/`・`vercel.json`／save logic／`.env`・secret／`package.json`・lockfile／build config／`index.html`／OTOMO・カード・神asset：**すべて変更0**。

## 11. Final Decision

**PASS**

**READY FOR CEO RELEASE APPROVAL**

Production・master・origin・deployへの反映はまだ行っていない。次のStepはCEOの Production Release 承認（CLAUDE.md §6-3 #8）。
