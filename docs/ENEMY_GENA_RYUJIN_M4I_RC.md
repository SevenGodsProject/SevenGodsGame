# 敵ビジュアル世代A ryujin — M4i Production Release Candidate（決定182）

- 実施日：2026-09-15
- branch：`feat/enemy-ryujin-m4i-rc`（`master 8256b60` から分岐。**master へ merge していない**）
- 性質：**RC作成＋QA ONLY**。CEOの ryujin M4i 実機QA承認（2026-09-15・disposable QA build `localhost:4180/?enemy=ryujin&seed=ceo-qa`）を受けた次Step。**Production 反映承認ではない**
- 唯一の source：`art-source/enemies/ryujin-restoration-pilot/M4i_unmatte_interior_2step-1024.webp`（sha256 `10f8a39ae0beefdfb7ba10bef37c3d178934768c9fb109bd3e2f1f5584c2687d`）
- 許可した操作：resize／WebP re-encode／metadata除去のみ。**画像生成・AI redraw・inpainting・追加修復・AI upscale・形状補完は一切行っていない**
- 手法：juuma 決定179／oni 決定181 と同一パイプライン・同一指標定義
- 判定：**PASS — READY FOR CEO RELEASE APPROVAL**（Production への反映はまだ実施していない）

---

## 0. Step 0 — Cleanup / Source Lock

CEO QAサーバー（`localhost:4180`）を停止し、disposable QA buildを整理。開始時点で `master` HEAD＝`origin/master`＝`8256b60`、tracked差分0。oni RC（`feat/enemy-oni-m4-rc` `5d3ef85`・asset sha256 `6c25cdb8…`）は不変を確認。

ryujin唯一のsourceを起動前に再ハッシュ確認し、CEO指定値と完全一致：

```
sha256 : 10f8a39ae0beefdfb7ba10bef37c3d178934768c9fb109bd3e2f1f5584c2687d
bytes  : 261,826
canvas : 1024×1024
```

## 1. M4i の来歴（要約）

Gen A 7体シート（`Downloads/ChatGPT Image 2026年8月4日 07_35_20.png`・1536×1024・sha256 `fcbefbde…`）の左下セル（left=0, top=512, 512×512）が唯一のsourceで、`art.png` の不透明画素とRGB完全一致（相関1.0000・maxDiff 0）を確認済み。ryujinはProduction拡大率1.0（juuma/oniと異なり拡大ぼけは無い）。主因は①source自体のドット輪郭②白マット汚染（縁の48.6%が汚染・白合成モデル残差25.6 vs 無視時72.7）③alpha contamination（本体内部の半透明983px＋透明の穴188、100%が白系＝白い泡・ハイライトを背景と誤認）。

M4i = 白マット除去（unmatte）＋ **interior alpha restore**（本体内部で誤って半透明／透明にされた画素をシート元画素（RGB完全一致確認済み）でα=255へ復元。シート画素が純白（≥252）の場合は「本物の背景の隙間」とみなし触らない。1,732px復元・155px guard）＋2段拡大。KBM系（M5/M6i）は下顎の牙が痩せ・泡が灰色化するためREJECT。

## 2. 768 RC 作成

juuma 決定179／oni 決定181 と同一の理由（ryujinの構図比は既にM4iで確定しており、bbox再配置は新しい構図判断を持ち込むため）で、**M4i(1024) の単純な等倍縮小＋WebP再エンコードのみ**で作成した。

```
sharp(M4i).resize(768,768,{kernel:'lanczos3'}).webp({quality:90,alphaQuality:100,effort:6})
```

q90で初回から**PSNR 36.52dB**を達成（92/94/95への引き上げ不要）。

| | 値 |
|---|---|
| 出力 | `art_hq.webp` |
| 寸法 | 768×768 |
| body | 565×612@(203,59) |
| 容量 | 173,286 bytes |
| sha256 | `76266bb4344e1f070c7417c5cbf5b6c0c663cfe331210d3bfd06bd28d33ddb6e` |

## 3. Composition Lock（M4i 1024 vs 768 RC）

| 指標 | M4i(1024) | RC(768) | 差 | CSS px換算＊ | 許容 | 判定 |
|---|---|---|---|---|---|---|
| bodyHeightRatio | 0.7979 | 0.7969 | 0.0010 | 0.28px | ≤0.5px | PASS |
| centerX | 0.6318 | 0.6322 | 0.0004 | 0.12px | ≤0.5px | PASS |
| bottom | 0.8740 | 0.8737 | 0.0003 | 0.09px | ≤0.5px | PASS |
| body aspect | 0.9229 | 0.9232 | 0.03% | — | ≤0.5% | PASS |
| サイズ差（本体 565×612 vs 期待値 565.5×612.75） | — | — | <0.15% | — | ≤0.5% | PASS |

＊実ゲームで実測した `.enemy-avatar` box（PC1366 DPR1・後述§7）290.0×284.5px を基準に換算。

## 4. Identity Gate（RC vs M4i）

juuma 決定177/179／oni 決定181 と同一定義（本体 bbox を 256×256 に正規化し、silhouette IoU・4象限ランドマークずれ・色域ヒストグラム交差から算出）。

| 指標 | 値 | 基準 | 判定 |
|---|---|---|---|
| Identity Score（RC vs M4i） | **99.08** | ≥98 | **PASS** |
| Silhouette IoU（RC vs M4i） | **0.9921** | ≥0.97 | **PASS** |
| landmark shift（RC vs M4i） | **0px**（4象限すべて） | =0px | **PASS** |
| colorHistIntersection | 0.9788 | — | 参考 |
| デザイン変更 | **0件**（単純リサイズのため構造上変わり得ない） | 0件 | **PASS** |

## 5. Encoding Fidelity

| 指標 | 値 | 基準 | 判定 |
|---|---|---|---|
| PSNR（可逆参照比） | **36.52dB** | ≥33dB | **PASS** |
| SSIM相当 | 0.9993 | — | 参考 |

## 6. Important Visual Metrics（Current Production / M4i / RC 同一手法で再測定）

| 指標 | Current Production | M4i(1024) | **RC(768)** | 判定 |
|---|---|---|---|---|
| white fringe | 57.2% | 13.9% | **48.5%** | 数値上はM4i比+34.6pt（§6-1参照） |
| jagged（per100行） | 25.1 | 17.2 | **17.4** | **PASS**（Currentより大幅改善・M4iとほぼ同等） |
| ringing（halo） | 96.1% | 76.8% | **85.0%** | 数値は上昇（§6-1と同根）だがCurrentより改善維持 |

### 6-1. white fringe / halo 数値上昇の切り分け（juuma決定179／oni決定181と同型の3点診断）

**(a) 対照実験**：M4i(1024)を可逆PNGリサイズのみで段階的に縮小。

| size | white fringe | halo |
|---|---|---|
| 1024 | 13.9% | 76.8% |
| 950 | 37.9% | 77.0% |
| 900 | 42.7% | 79.3% |
| 850 | 46.1% | 81.5% |
| 800 | 50.6% | 83.4% |
| 768 | 48.3% | 84.8% |
| 700 | 57.5% | 86.4% |
| 600 | 65.3% | 88.9% |

→ 1024→950だけで白フチが13.9%→37.9%へ急増し、600まで概ね単調増加。WebPを介さない可逆リサイズだけで再現するため、リサイズ自体（半透明alpha縁のサンプル画素数減少への感度）が主因。

**(b) 分離実験**：768での resizeのみ寄与とWebP追加寄与を分離。

| | white fringe | halo |
|---|---|---|
| resizeのみ（可逆PNG） | 48.3% | 84.8% |
| resize＋WebP q90 | 48.6% | 85.0% |

→ WebP再エンコードの寄与は**+0.3pt／+0.2ptのみ**。上昇の大部分（+34.4pt）はリサイズ自体に起因。

**(c) 目視確認**：チェッカーボード背景合成でCurrent／M4i／RCの全体像・飛沫（splash）・口元・角・水晶球・台座を拡大比較。飛沫のCurrentで見られた白灰色のブロック状パッチがRCではテクスチャ化されて改善、水滴の分離・牙/歯の隙間・水晶球・金台座いずれも欠損/変形/新規halo/明部侵食なし。RCはM4iと同等の忠実度で、Currentより明確に高精細。

**結論**：white fringe/haloの数値上昇は測定アーティファクトと判定。追加の画像処理（Source Lock違反）は行っていない。FAIL条件（Currentより実描画で悪化／M4iより目視で白フチ増加／新規halo発生／明部パーツ侵食）はいずれも非該当。

## 7. Alpha-Specific Gate（ryujin固有の重要Gate）

| 指標 | Current | M4i(1024) | RC(768) | 判定 |
|---|---|---|---|---|
| fullyEnclosedTransparentPx（真の孤立ホール・隣接±1px全周不透明） | 5 | **0** | **0** | **PASS**（新規hole 0。むしろCurrentの既知5個も再発なし） |
| semiDeep（内部半透明・4px内側に不透明が全周） | 983 | 1143 | 609 | 参考（解像度縮小に伴い比例減少・異常な増加なし） |

目視確認（§6-1(c)）：泡・飛沫の灰色化なし、水滴同士の接続（誤って一体化）なし、牙/歯の隙間を誤って埋めた形跡なし、白パーツ（歯・角の縞・泡のハイライト）の侵食なし、内部alpha contaminationの再発なし。768 resizeによる通常のantialias変化（縁の中間アルファ値の再配置）と実際のalpha破壊は目視・数値の両面で分離して判定し、後者に該当する事象は確認されなかった。

## 8. Identity Lock Visual Check（11項目）

チェッカーボード背景・DPR2拡大クロップで全項目を目視確認。

| # | 項目 | 判定 |
|---|---|---|
| 1 | 骨白色の長い吻＋青緑鱗 | PASS（欠損・変形なし） |
| 2 | 金色の眼＋黒い縦瞳 | PASS |
| 3 | 赤い口腔＋上下の白い牙・歯列 | PASS（歯列クロップで欠損・痩せ・変形なし確認） |
| 4 | 淡クリーム色の枝角2本＋金の環 | PASS |
| 5 | 紫〜マゼンタの鬣・背鰭 | PASS（DPR2クロップで形状変化なし） |
| 6 | 青緑〜紫の髭 | PASS |
| 7 | 青い水晶球2個＋金台座 | PASS（クロップで変形なし確認） |
| 8 | クリーム色の腕＋金腕輪＋鉤爪 | PASS |
| 9 | 青緑鱗・紫ハイライト・金装飾・腹板 | PASS |
| 10 | 金の宝壺状台座＋白〜シアンの飛沫 | PASS（台座クロップで宝石・装飾の欠損なし。飛沫は§6-1(c)で確認） |
| 11 | S字とぐろ・左腕上右腕下の非対称構図 | PASS（Composition Lock §3で数値確認） |

## 9. Real Rendering QA（Playwright・deviceScaleFactor込み実描画）

`vite preview`のQA専用ビルド（A=Current Production・B=RC768。いずれも`public/`を恒久変更しないdisposable領域）で5条件を実描画。

| 条件 | box（CSS px、A/B） | device px | broken | JS err | scrollY | overflowX | 目視判定 |
|---|---|---|---|---|---|---|---|
| 1366×768 DPR1 | 290.0×284.5（完全一致） | 290×285 | 0/0 | 0/0 | 0/0 | false/false | **PASS**（100%表示でA/B判別不能。meanGrad A30.57/B26.63の差は測定上のみで目視差なし） |
| 1366×768 DPR2 | 290.0×284.5（完全一致） | 580×570 | 0/0 | 0/0 | 0/0 | false/false | **PASS**（鬣・角・牙・水晶球・台座いずれも欠損なし。飛沫のブロック状パッチがRCで改善。meanGrad A23.31/B23.30でほぼ同値） |
| 1508×660 DPR1 | 290.0×193.5（完全一致） | 290×194 | 0/0 | 0/0 | 0/0 | false/false | **PASS**（meanGrad A19.19/B21.41でRC優位） |
| 390×760 | 188.4×270.5（完全一致） | 188×271 | 0/0 | 0/0 | 0/0 | false/false | **PASS**（表示サイズが小さくA/B判別不能。目視で破綻なし） |
| 390×844 | 188.4×354.5（完全一致） | 188×355 | 0/0 | 0/0 | 0/0 | false/false | **PASS**（同上） |

meanGradがDPR1/mobileで一部A>Bとなる箇所があるが、これはCurrent Productionのalpha contamination（白い偽エッジ）が勾配指標に混入し実際の解像度以上の値を示す効果と考えられ（§6-1と同根の測定特性）、全条件のチェッカーボード目視・拡大クロップでA/B判別不能または RCが同等以上であることを確認した。「JS/CSSが同じだからPASS」の代替判定は行っていない。

## 10. Regression

- **tests**：3,041 passed／9 skipped／0 failed
- **typecheck**：`tsc -b` 0 error
- **lint**：`oxlint` 0 error（既存warningのみ、本変更と無関係）
- **build**：成功
- **bundle byte一致**：`dist/assets/index-CLclgl5i.js`・`index-IKMGO-ur.css`・`index.html` が変更前ビルドとbyte完全一致
- **他アセット不変**：datenshi／karakuri／doukeshi／juuma／oni（masterの旧art_hq.webp）／onryoの全アセットがmasterとbyte完全一致
- **`src/`不変**：`git diff master -- src/` 差分0
- **設定不変**：`package.json`／`package-lock.json`／`vite.config.ts`／`vercel.json`／`index.html`すべて`master`と差分0
- **gameVersion／saveVersion**：`src/`不変のため自動的に不変（`saveVersion: 9`確認）

## 11. Ranking / Security Gate

bundle内`ranking`/`neon`/`postgres`/`DATABASE_URL`走査のヒットは既存の`submissionEnabled:!1`プレースホルダのみ。tracked `.env` 0。secret 0。

## 12. 変更スコープ

- `public/assets/enemies/ryujin/art_hq.webp`（Production asset・変更）
- `art-source/enemies/ryujin-restoration-pilot/M4i_unmatte_interior_2step-1024.webp`（配信対象外・新規provenance）
- `art-source/README.md`（配信対象外・1行追記）
- `docs/DECISIONS.md`（配信対象外・1行追記）
- `docs/ENEMY_GENA_RYUJIN_M4I_RC.md`（配信対象外・本書）

`src/`／CSS／他の敵asset（oni含む。masterの旧版のまま）／Daily／Ranking／Neon・DB／save logic／`package.json`・lockfile：**すべて変更0**。

## 13. Safety

master＝`8256b60`＝origin/master（不変）。oni RC（`feat/enemy-oni-m4-rc` `5d3ef85`・asset `6c25cdb8…`）は不変。本commitはmasterへmerge・pushしていない。

## 14. Final Decision

**PASS**

**READY FOR CEO RELEASE APPROVAL**

Production・master・origin・deployへの反映はまだ行っていない。次のStepはCEOのProduction Release承認（CLAUDE.md §6-3 #8）。
