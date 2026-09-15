# 敵ビジュアル世代A onryo — M4i Production Release Candidate（決定183）

- 実施日：2026-09-16
- branch：`feat/enemy-onryo-m4i-rc`（`master 8256b60` から分岐。**master へ merge していない**）
- 性質：**RC作成＋QA ONLY**。CEOの onryo M4i 実機QA承認（2026-09-16・disposable QA build `localhost:4180/?enemy=onryo&seed=ceo-qa`）を受けた次Step。**Production 反映承認ではない**
- 唯一の source：`art-source/enemies/onryo-restoration-pilot/M4i_unmatte_interior_2step-768x1024.webp`（sha256 `38747b968841fc9f13e56b414979489930ddc5e3b2a9603e619907e3dca2b05b`）
- 許可した操作：resize／WebP re-encode／metadata除去のみ。**画像生成・AI redraw・inpainting・追加修復・AI upscale・正方形化・recomposeは一切行っていない**
- 判定：**PASS — READY FOR CEO RELEASE APPROVAL**（Production への反映はまだ実施していない）

---

## 0. Step 0 — Cleanup / State Lock

CEO QAサーバー（`localhost:4180`）を停止、disposable QA build整理。開始時点で `master` HEAD＝`origin/master`＝`8256b60`、tracked差分0。既存RC（oni `feat/enemy-oni-m4-rc` `5d3ef85`・asset `6c25cdb8…`／ryujin `feat/enemy-ryujin-m4i-rc` `5077849`・asset `76266bb4…`）は不変を確認。

Source（M4i Master）を起動前に再ハッシュ確認し、CEO指定値と完全一致：

```
sha256 : 38747b968841fc9f13e56b414979489930ddc5e3b2a9603e619907e3dca2b05b
bytes  : 223,636
canvas : 768×1024（aspect 0.7500）
```

## 1. CRITICAL — Aspect Ratio Lock

onryoの Current Production（384×512、aspect 0.7500）は `.enemy-avatar`（240×260・aspect 0.923・`background-size: contain`）に対しheight-limitedでletterbox表示されている。もし正方形canvasへ変換すると image aspect が変わり width-limited に転じ、キャラクターが箱内で相対的に大きく表示される＝**構図変更**になる。

このため、M4i Master（768×1024）・本RC（576×768）とも **aspect 0.7500 を完全固定**し、bbox抽出→正方形recomposeは一切行っていない（Pilot時点の判断を踏襲）。

## 2. Production RC サイズ決定

onryoは他のGen A敵（juuma/oni/ryujinはいずれも正方形canvas）と異なり非正方形のため、「768×768へ機械的に合わせる」ことは行わず、実測device-pixel requirementに基づいて客観的にサイズを決定した。

**実測**：CEO指定5viewportについて、`.enemy-avatar` box（CSS px）とimage aspect(0.75)から実際に描画される画像サイズ（device px）を算出。

| 条件 | box CSS (W×H) | box aspect | limited by | 描画device px (W×H) |
|---|---|---|---|---|
| 1366×768 DPR1 | 290.0×284.5 | 1.0193 | height | 213.4×284.5 |
| **1366×768 DPR2** | 290.0×284.5 | 1.0193 | height | **426.8×569.0**（最大） |
| 1508×660 DPR1 | 290.0×193.5 | 1.4987 | height | 145.1×193.5 |
| 390×760 | 124.3×270.5 | 0.4595 | width | 124.3×165.7 |
| 390×844 | 124.3×354.5 | 0.3506 | width | 124.3×165.7 |

**最大device-pixel requirement：426.8×569.0**（PC 1366 DPR2）。

**候補比較**：

| 候補 | dimensions | headroom（W/H） | 判定 |
|---|---|---|---|
| 576×768（CEO第一候補） | aspect0.75 | 135.0% / 135.0% | 採用 |
| 768×1024（Master維持） | aspect0.75 | 179.9% / 180.0% | 参考（過剰） |

576×768は最大実描画要件に対し35%のheadroomを確保しつつ、Current（384×512）比で線形解像度1.5倍を達成する。768×1024は要件を満たすが過剰（headroom 80%）でファイルサイズも約1.5倍（220KB vs 147KB）大きい。両候補ともQuantitative Gate・Real Rendering QAでPASSしたため（§4, §7）、**576×768を採用**した（「ファイルサイズ削減のためにGateを下げた」のではなく、両候補がGateをPASSした上でdevice-pixel requirementに対し十分かつ過剰でない576×768を選定）。

## 3. Export

```
sharp(M4i).resize(576,768,{kernel:'lanczos3'}).webp({quality:90,alphaQuality:100,effort:6})
```

q90で初回から**PSNR 35.99dB**を達成（92/94/95への引き上げ不要）。

| | 値 |
|---|---|
| 出力 | `art_hq.webp` |
| 寸法 | 576×768（aspect 0.7500・**Current/Masterと同一比率**） |
| body | 511×654@(41,45) |
| 容量 | 147,326 bytes |
| sha256 | `962040549a488436b100512fe55be52a1f2bb3ce6fd618cd40ab7164be0f7d59` |

## 4. Composition Lock（M4i 768×1024 vs RC 576×768）

| 指標 | M4i(1024) | RC(576×768) | 差 | CSS px換算＊ | 許容 | 判定 |
|---|---|---|---|---|---|---|
| bodyHeightRatio | 0.8506 | 0.8516 | 0.0010 | 0.28px | ≤0.5px | PASS |
| centerX | 0.5150 | 0.5148 | 0.0002 | 0.04px | ≤0.5px | PASS |
| bottom | 0.9092 | 0.9102 | 0.0010 | 0.28px | ≤0.5px | PASS |
| body aspect | 0.7819 | 0.7813 | 0.08% | — | ≤0.5% | PASS |
| canvas aspect | 0.7500 | 0.7500 | **0%** | — | 固定 | **PASS（完全一致）** |

＊実測`.enemy-avatar`の最大描画高さ（PC1366 DPR1・284.5px）を基準に換算。

## 5. Identity Gate（RC vs M4i）

| 指標 | 値 | 基準 | 判定 |
|---|---|---|---|
| Identity Score（RC vs M4i） | **98.93** | ≥98 | **PASS** |
| Silhouette IoU（RC vs M4i） | **0.9886** | ≥0.97 | **PASS** |
| landmark shift（RC vs M4i） | **0px**（4象限すべて） | =0px | **PASS** |
| colorHistIntersection | 0.9799 | — | 参考 |
| デザイン変更 | **0件** | 0件 | **PASS** |

参考：768×1024（re-encodeのみ）候補ではIdentity 99.74・IoU 1.0000（無変更に近い）。576×768選定はサイズ判断（§2）に基づく。

## 6. Encoding Fidelity

PSNR（可逆参照比）**35.99dB**（基準≥33dB PASS）、SSIM相当 0.9994。

## 7. Important Visual Metrics と Alpha Integrity

| 指標 | Current | M4i(1024) | **RC(576×768)** |
|---|---|---|---|
| white fringe | 64.9% | 11.7% | 45.8% |
| jagged | 25.2 | 17.7 | 19.7 |
| halo | 94.1% | 75.3% | 82.6% |
| alpha深部 | 807 (10.06%) | 609 | 423 |
| holes | 2 | **0** | **0** |

### 7-1. white fringe/halo 数値上昇の切り分け（juuma決定179/oni決定181/ryujin決定182と同型の3点診断）

**(a) 対照実験**（aspect 0.75固定のまま段階的に縮小）：

| size | white fringe | halo |
|---|---|---|
| 768×1024 | 11.7% | 75.3% |
| 713×950 | 35.4% | 75.2% |
| 675×900 | 38.6% | 77.4% |
| 638×850 | 42.0% | 79.1% |
| 600×800 | 47.1% | 80.9% |
| **576×768** | **45.5%** | **82.5%** |
| 525×700 | 58.2% | 84.1% |
| 450×600 | 66.5% | 86.5% |
| 432×576 | 69.8% | 87.2% |

→ 1024→950だけで白フチが11.7%→35.4%へ急増。可逆PNGリサイズのみ（WebP不使用）で再現するため、リサイズ自体が主因。

**(b) 分離実験**：576×768でresizeのみ寄与（45.5%/82.5%）とWebP追加寄与（45.8%/82.6%＝**+0.3pt/+0.1ptのみ**）を分離。

**(c) 目視確認**：チェッカーボード背景・dark背景の両方で全体像、および手・指・爪、髪先の渦、顔、髑髏の拡大クロップを確認。フィンガー分離明瞭・毛先の渦巻き保持・白い肌や髪の誤穿孔なし・紫炎の縁に新規halo/白フチの視認増加なし。

**結論**：数値上昇は測定アーティファクト。追加の画像処理（Source Lock違反）は行っていない。

### 7-2. Alpha Integrity（M4iで修復したalphaの保持確認）

- **new transparent holes = 0**（Current 2 → M4i/RC ともに0）
- 顔／髪先／指・爪／髑髏4体／紫炎：目視確認ですべて欠損・侵食なし（§7-1(c)）
- 白い肌を背景と誤認する再発：確認されず
- 離れたエフェクト同士の誤接続：確認されず

## 8. Identity Lock Visual Check（12項目）

| # | 項目 | 判定 |
|---|---|---|
| 1 | 青白い顔＋微笑んだ口元 | PASS |
| 2 | 紫系の瞳＋濃い目元 | PASS |
| 3 | 水色の長い波打つ髪 | PASS |
| 4 | ハート型前髪＋渦巻く細い毛先 | PASS（拡大クロップで欠損なし確認） |
| 5 | 黒〜紫の烏帽子型装飾＋金縁＋紫宝石 | PASS |
| 6 | 左右の手・指・長い爪 | PASS（拡大クロップで分離明瞭確認） |
| 7 | 黒地着物＋金/臙脂刺繍＋紫裏地 | PASS |
| 8 | 臙脂色の蝶結び＋金房 | PASS |
| 9 | 黒い下駄＋渦巻く着物裾 | PASS |
| 10 | 四隅の髑髏4体＋紫〜マゼンタ炎 | PASS（拡大クロップで欠損なし確認） |
| 11 | 黒・紫・水色・金・臙脂・白の主要配色 | PASS |
| 12 | Currentと同一の非対称要素を含む全体シルエット | PASS（Composition Lock §4で数値確認） |

## 9. Real Rendering QA（Playwright・deviceScaleFactor込み実描画）

A=Current Production（384×512）・B=RC（576×768）でQA専用ビルド（disposable、`public/`は恒久変更なし）を5条件実描画。

| 条件 | box（CSS px、A/B） | device px | broken | JS err | scrollY | overflowX | 目視判定 |
|---|---|---|---|---|---|---|---|
| 1366×768 DPR1 | 290.0×284.5（完全一致） | 290×285 | 0/0 | 0/0 | 0/0 | false/false | **PASS**（判別不能。meanGrad A25.71/B22.39は測定上のみ） |
| 1366×768 DPR2 | 290.0×284.5（完全一致） | 580×570 | 0/0 | 0/0 | 0/0 | false/false | **PASS**（B優位。頭部装飾・着物模様が明瞭。meanGrad A18.66/B18.75） |
| 1508×660 DPR1 | 290.0×193.5（完全一致） | 290×194 | 0/0 | 0/0 | 0/0 | false/false | **PASS**（meanGrad A16.80/B18.45でB優位） |
| 390×760 | 124.3×270.5（完全一致） | 124×271 | 0/0 | 0/0 | 0/0 | false/false | **PASS**（判別不能） |
| 390×844 | 124.3×354.5（完全一致） | 124×355 | 0/0 | 0/0 | 0/0 | false/false | **PASS**（判別不能） |

全条件でenemy box・実描画サイズ・位置が完全一致（aspect比固定の効果を実証）。「JS/CSSが同じだからPASS」の代替判定は行っていない。

## 10. Regression

- tests: 3,041 passed／9 skipped／0 failed
- typecheck: `tsc -b` 0 error
- lint: `oxlint` 0 error（既存warningのみ）
- build: 成功、JS/CSS/HTML byte完全一致
- 他アセット不変：datenshi／karakuri／doukeshi／juuma／oni（masterの旧版）／ryujin（masterの旧版）すべてmasterとbyte完全一致
- `src/`不変：`git diff master -- src/` 差分0
- 設定不変：`package.json`／lockfile／`vite.config.ts`／`vercel.json`／`index.html`すべて差分0
- gameVersion／saveVersion（9）：`src/`不変のため自動的に不変

## 11. Ranking / Security Gate

bundle内`ranking`/`neon`/`postgres`/`DATABASE_URL`走査のヒットは既存の`submissionEnabled:!1`プレースホルダのみ。tracked `.env` 0。secret 0。

## 12. 変更スコープ

- `public/assets/enemies/onryo/art_hq.webp`（Production asset・変更。**寸法384×512→576×768、aspect比0.75は不変**）
- `art-source/enemies/onryo-restoration-pilot/M4i_unmatte_interior_2step-768x1024.webp`（配信対象外・新規provenance）
- `art-source/README.md`（配信対象外・1行追記）
- `docs/DECISIONS.md`（配信対象外・1行追記）
- `docs/ENEMY_GENA_ONRYO_M4I_RC.md`（配信対象外・本書）

`src/`／CSS／他の敵asset（oni・ryujinはmasterの旧版のまま）／Daily／Ranking／Neon・DB／save logic／`package.json`・lockfile：**すべて変更0**。

## 13. Safety

master＝`8256b60`＝origin/master（不変）。oni RC（`feat/enemy-oni-m4-rc` `5d3ef85`・asset `6c25cdb8…`）・ryujin RC（`feat/enemy-ryujin-m4i-rc` `5077849`・asset `76266bb4…`）は不変。本commitはmasterへmerge・pushしていない。

## 14. Final Decision

**PASS**

**READY FOR CEO RELEASE APPROVAL**

Production・master・origin・deployへの反映はまだ行っていない。次のStepはCEOのProduction Release承認（CLAUDE.md §6-3 #8）。これでGeneration A 4体（juuma／oni／ryujin／onryo）すべてのM4/M4i RCが揃った。
