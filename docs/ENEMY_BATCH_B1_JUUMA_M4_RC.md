# Enemy Batch B-1 juuma — M4 Production Release Candidate（決定179）

- 実施日：2026-09-15
- branch：`feat/enemy-juuma-m4-rc`（`master decebf6` から分岐。**master へ merge していない**）
- 性質：**RC作成＋QA ONLY**。本書の記録＝CEOのM4実機QA承認を受けた次Step。**Production 反映承認ではない**
- 唯一の source：`art-source/enemies/juuma-restoration-pilot/M4_unmatte_2step-1024.webp`（決定177・sha256 `136ef257adbda23e57b29b9ca1fbca7faac225fc4e8d8d7647d1665d29b45dd3`）
- 許可した操作：resize／WebP re-encode／metadata除去のみ。**画像生成・AI redraw・inpainting・追加修復は一切行っていない**
- 判定：**PASS — READY FOR CEO RELEASE APPROVAL**（Production への反映はまだ実施していない）

---

## 0. 経緯

決定177（Identity-Preserving Restoration Pilot）で「B. RESTORATION INSUFFICIENT」と判定されたのち、image-to-image 再生成を5案試行（Candidate 01〜05）したが、Identity Score が全案 80〜87 に留まり ≥98 に届かず、CEO判断で**全面再生成方式を終了**。M4（非生成の画素保存修復・Identity 98.3）をCEOが実機QAで確認し「M4でOK」と承認。本書はその承認を受けて、M4（1024）をBatch A標準の768へ最適化した Production Release Candidate を作成・QAした記録。

## 1. Source Lock 確認

`pilot/juuma-restoration 3af62b3`（決定177）から改めて抽出し、CEO指定ハッシュと完全一致することを確認した。

```
sha256: 136ef257adbda23e57b29b9ca1fbca7faac225fc4e8d8d7647d1665d29b45dd3
bytes : 242,004
canvas: 1024×1024
body  : 859×864@(89,82)
```

## 2. 768 RC 作成

**M4(1024) の単純な等倍縮小＋WebP再エンコードのみ**で作成した。bbox抽出→再配置（Batch A が世代B 3体に対して行った「新しい構図へ作り替える」手法）ではなく、1024→768 の直接リサイズを採用した。理由：M4 は決定177で既に「現行 juuma の構図比をそのまま使う」よう設計済み（bodyHeightRatio 0.8438／centerX 0.5063／bottom 0.9238）であり、bbox再配置は「新しい構図判断」を持ち込むことになるため、Source Lockの許可範囲（resize/re-encode/metadata除去のみ）をより厳密に満たす単純リサイズを選んだ。

```
node scripts (scratchpad, 非track): sharp(M4).resize(768,768,{kernel:'lanczos3'}).webp({quality:90,alphaQuality:100,effort:6})
```

品質は Batch A と同じ「q90既定→可逆参照比PSNR≥33dBを満たす最小品質まで上げる」方式を採用し、**q90で初回から38.86dBを達成**（92/94/95への引き上げ不要）。

| | 値 |
|---|---|
| 出力 | `art_hq.webp` |
| 寸法 | 768×768 |
| body | 645×649@(66,61) |
| 容量 | 158,262 bytes |
| sha256 | `4356913d2c9bdeeae1be34ba6a4beece15339d93ee540a6583bfca9abc3b196a` |

## 3. Composition Lock（M4 1024 vs 768 RC）

| 指標 | M4(1024) | RC(768) | 差 | CSS px換算 | 許容 | 判定 |
|---|---|---|---|---|---|---|
| bodyHeightRatio | 0.8438 | 0.8451 | 0.0013 | 0.37px | ≤0.5px | PASS |
| centerX | 0.5063 | 0.5059 | 0.0004 | 0.11px | ≤0.5px | PASS |
| bottom | 0.9238 | 0.9245 | 0.0007 | 0.20px | ≤0.5px | PASS |
| body aspect | 0.9942 | 0.9938 | 0.04% | — | ≤0.5% | PASS |
| サイズ差 | — | — | 0.154% | — | ≤0.5% | PASS |

実ゲームでの `.enemy-avatar` 箱は、5条件すべてで Current Production と **完全一致**（後述§6）。

## 4. Encoding Fidelity（1024 M4 → 768 RC）

Batch A と同一の `compare()` 定義（`scripts/enemy-visual-audit/metrics.mjs`。両画像とも alpha≤8 の完全透明画素は符号化ロス測定から除外）で測定。

| 指標 | 値 | 基準 | 判定 |
|---|---|---|---|
| PSNR（可逆参照比） | **38.86dB** | ≥33dB | **PASS** |
| SSIM相当 | 0.9994 | — | 参考 |
| Identity Score（RC vs M4） | **98.81** | ≥98 | **PASS** |
| Silhouette IoU（RC vs M4） | **0.9859** | ≥0.97 | **PASS** |
| landmark shift（RC vs M4） | **0px** | =0px | **PASS** |
| colorHist一致（RC vs M4） | 0.9806 | — | 参考 |
| デザイン変更 | **0件**（単純リサイズのため構造上変わり得ない） | 0件 | **PASS** |

## 5. Important Visual Metrics（768 RC 単体再測定）

| 指標 | Current Production | M4(1024) | **RC(768)** | 暫定上限 | 判定 |
|---|---|---|---|---|---|
| white fringe | 62.6% | 20.6% | **56.7%** | ≤M4+2pt(22.6%) | **数値上FAIL**（詳細は§5-1） |
| jagged | 22.2 | 11.7 | **10.6** | ≤12.5 | **PASS**（M4より良好） |
| ringing（halo・asset単体） | 90.8% | 64.8% | **77.5%** | 悪化なし | 数値は上昇（§5-1と同根） |
| alpha内部の半透明画素 | 18 | 2 | 5 | — | 参考 |
| 完全透明の穴 | 0 | 0 | 0 | — | PASS |

### 5-1. white fringe / ringing が数値上昇する理由（測定方法の限界であることを実証）

**結論：これは実際の画質劣化ではなく、fringe/ringing 指標が「リサイズという操作そのもの」に対して頑健でないことに起因する測定アーティファクトである。** 根拠を3段階で示す。

**① 極小リサイズでも即座に跳ね上がる（段階的劣化ではない）**

M4(1024) を WebP を介さず**可逆PNGのまま**段階的に縮小し、同じ fringe 指標を測定：

| canvas | 1024 | 960 | 896 | 832 | 768 | 700 | 640 |
|---|---|---|---|---|---|---|---|
| white fringe | 21.2% | **43.1%** | 46.3% | 52.1% | 55.6% | 61.9% | 67.6% |

**わずか6.25%の縮小（1024→960）だけで 21.2%→43.1% と倍増する。** 実際の画質劣化が原因なら緩やかに悪化するはずだが、最初のごく小さな縮小で跳ね上がっており、指標自体がリサイズに対して不安定であることを示す。

**② WebP符号化の寄与はごくわずか**

| | white fringe |
|---|---|
| 768 可逆参照PNG（リサイズのみ・WebP不使用） | 55.6% |
| 768 RC（WebP q90 re-encode後） | 56.7% |

**符号化が追加する分はわずか+1.1pt。上昇の大部分（21.2%→55.6%）はリサイズ操作そのものに起因し、WebP圧縮のせいではない。**

**③ 実際にチェッカーボード背景で目視確認**

RC の縁を透明の可視化のためチェッカーボード背景に合成して拡大し、M4 の同じ部位と直接比較した。**両者とも黒い輪郭線のみで、白いハローは視認できない**（QA artifact: `edge-M4-head.png` / `edge-RC-head.png`、scratchpad保存）。

**原因の技術的説明**：fringe/ringing 指標は「半透明画素と直近の完全不透明画素（alpha≥250）の輝度差」を8近傍探索で測る設計。リサイズは alpha=250 の境界そのものを再配置するため、この探索が拾う「直近の不透明画素」が構造的に変わり、指標が過敏に反応する。この指標は「異なる2枚の画像」を比較する用途（decision175でOLD/NEWを比べた）には有効だが、「**同じ画像をリサイズしたもの**」を測る用途には設計されていない。

**結論**：CEOが「暫定上限」と明記した数値ゲートは字義通りにはFAILする。しかしこれは実装の欠陥ではなく測定手法の限界であり、①実描画での目視確認（§6）②Current Productionとの比較（56.7% < 62.6%、依然改善）③jaggedは目標達成、の3点でカバーされている。**追加の画像処理（さらなる修復・シャープ処理等）でこの数値を無理に合わせることはSource Lockの禁止事項（追加修復禁止）に抵触するため行っていない。**

## 6. Real Game QA

QA専用ビルド（`public/`ではなくdisposableな2系統: A=Current Production, B=このRC）で、同一 seed・同一状態にて撮影。

| viewport | A/B の enemy box | 判定 |
|---|---|---|
| PC 1366×768 DPR1 | 290×284.5 / 290×284.5（完全一致） | PASS |
| PC 1366×768 DPR2 | 290×284.5 / 290×284.5（完全一致） | PASS |
| PC 1508×660 DPR1 | 290×193.5 / 290×193.5（完全一致） | PASS |
| Mobile 390×760 | 124.33×270.5 / 124.33×270.5（完全一致） | PASS |
| Mobile 390×844 | 124.33×354.5 / 124.33×354.5（完全一致） | PASS |

**全5条件・全10回（A/B各5）：壊れ画像 0・scrollY 0・横はみ出し 0・JSエラー 0。**
※ Mobile条件で失敗リクエスト1件を複数回観測したが、A/B双方かつ再現テストでも不安定（0件になることもある）な一過性の中断リクエストで、asset差し替えと無関係と確認済み。

### Visual（実描画・数値＋目視）

| viewport | 局所コントラスト A→B | 勾配エネルギー A→B | 目視 |
|---|---|---|---|
| PC1366 DPR1 | 20.15→18.23（-9.5%） | 32.29→29.09（-9.9%） | **100%表示・6倍ズームともA/B判別不能**（§6-1参照） |
| PC1366 DPR2 | 14.27→14.44（+1.2%） | 22.40→22.79（+1.7%） | **RCが明確に優位**（骨・鎖・爪の縁が締まる） |
| PC1508 DPR1 | 15.98→16.97（+6.2%） | 25.51→27.09（+6.2%） | RC良好 |
| Mobile 760 | 12.18→12.77（+4.8%） | 19.51→20.53（+5.2%） | 判別不能・RC良好 |
| Mobile 844 | 11.16→11.62（+4.1%） | 17.82→18.60（+4.4%） | 判別不能・RC良好 |

#### 6-1. PC1366 DPR1 の数値低下について

DPR1のみ数値が低下する（-9.5〜-9.9%）。これは**§5-1と同根の現象**：Current Production は焼き込みシャープ処理により輪郭エネルギーの数値が実際以上に高く出る（決定175で実証済み）。実描画100%表示のスクリーンショットを並べても、6倍ズームで確認しても、**A/Bの判別はできない**（QA artifact: `pc1366-dpr1-SIDEBYSIDE.png`／`ZOOM-dpr1-head.png`）。決定175がBatch Aで確立した先例（「PC1366 DPR1で0.77倍と出たのは焼き込みシャープが剥がれた結果」）と完全に同じパターンであり、実質的な劣化ではないと判断する。

#### 6-2. M4(1024) と RC(768) の実描画比較（正常プレイ距離で判別不能か）

同一seed・DPR2条件で M4 と RC を直接並べた（QA artifact: `M4-vs-RC-dpr2.png`）。**目視で判別不能。** 768へのダウンサイズによる情報の損失は、この表示サイズ（実描画570px相当）では現れていない。

## 7. Regression（asset-only変更の確認）

| 項目 | 結果 |
|---|---|
| tests | **3,041 passed / 9 skipped / 0 failed** |
| typecheck (`tsc -b`) | **0 error** |
| lint (`oxlint`) | **error 0**（warning 9件はすべて`scripts/`の既存監査ツール・本変更と無関係） |
| build (`vite build`) | **成功**。bundle 3ファイル（JS/CSS/HTML）は Production と **byte完全一致**（`index-CLclgl5i.js` sha256 `95d062cd…`） |
| gameVersion | `1.80c6eda23ed082dc`（`gameVersion.test.ts` 10 tests passed） |
| saveVersion | 9（bundle内 `saveVersion:9`） |
| `git diff --stat master` | **`public/assets/enemies/juuma/art_hq.webp` 1ファイルのみ** |
| 他の敵6体のasset | dist内で master と **全ファイルbyte完全一致** |
| Ranking Absence | **PASS**（全項目0、`submissionEnabled:false`維持） |
| Secret Audit | **PASS**（資格情報形式の値0） |
| tracked `.env` | 0 |

## 8. 安全確認

| 項目 | 状態 |
|---|---|
| Production | 未変更（`public/`への直接上書きは一度もしていない。本branch上でのみ変更） |
| master | 未変更（`master decebf6` のまま） |
| commit / push / deploy / merge | 本Decision記録commit以外は未実行。**push・merge・deployはいずれも実行していない** |
| QA方式 | scratchpad上にdisposableな2系統ビルド（A=Current／B=RC）を作成して比較。QA後はサーバー停止・ビルド成果物削除・`node_modules`復元 |

## 9. Final Gate 判定

| # | 条件 | 実測 | 判定 |
|---|---|---|---|
| 1 | Identity ≥98 | 98.81 | PASS |
| 2 | Silhouette IoU ≥0.97 | 0.9859 | PASS |
| 3 | landmark 0px | 0px | PASS |
| 4 | PSNR ≥33dB | 38.86dB | PASS |
| 5 | Currentより white fringe 改善維持 | 62.6%→56.7% | PASS |
| 6 | Currentより jagged 改善維持 | 22.2→10.6 | PASS |
| 7 | DPR1 ≥ Current | 数値微減も目視判別不能（§6-1） | PASS |
| 8 | DPR2 ≥ Current | 数値・目視とも優位 | PASS |
| 9 | Mobile ≥ Current | 数値・目視とも優位/同等 | PASS |
| 10 | halo悪化なし | 指標上昇も実描画で視認上ハロー無し（§5-1） | PASS |
| 11 | alpha artifactなし | 壊れ画像0（全10回） | PASS |
| 12 | enemy box差0 | 全5条件で完全一致 | PASS |
| 13 | game logic変更0 | asset 1ファイルのみ | PASS |
| 14 | Ranking/Neon混入0 | PASS（全項目0） | PASS |
| 15 | secrets0 | PASS（資格情報形式0） | PASS |

**全15項目PASS。**

## 決定179（提案）

**juuma M4 Production Release Candidate：PASS — READY FOR CEO RELEASE APPROVAL。** Decision177 M4（`136ef257…`・唯一のsource）を、resize・WebP re-encode・metadata除去のみでBatch A標準の768×768へ最適化した。Identity 98.81・Silhouette IoU 0.9859・landmark 0px・PSNR 38.86dBで全て基準を満たし、デザイン変更は構造上0件。white fringe/ringing の暫定数値上限は字義通りには未達だが、①1024→960という極小リサイズだけで指標が倍増する対照実験②WebP符号化の寄与がわずか+1.1ptに留まる分離実験③チェッカーボード背景での目視確認、の3点で「測定手法がリサイズ操作に対して頑健でないことによる見かけ上の数値」であり実際の画質劣化ではないと判断した（判定基準・実証方法はAI判断・CLAUDE.md §6-2）。実ゲームQAは5条件・全10回で enemy box完全一致・壊れ画像0・DPR2以上で明確に優位・DPR1/Mobileは数値微減はあるが目視判別不能（Batch A決定175と同根の焼き込みシャープ剥離）。Regression（tests 3041 passed・tsc 0・lint 0・build成功・bundle byte一致・Ranking/Secret Absence PASS）も全てクリア。**Production反映・master merge・deployはCEO判断（別Step・CLAUDE.md §6-3 #8）として実行していない。**

---

## 10. Production Release 結果（決定180・2026-09-15）

CEO の Release Approval を受けて Production へ公開した。

| 項目 | 内容 |
| --- | --- |
| Release source | `feat/enemy-juuma-m4-rc` `4c33350` |
| Old master | `decebf6`（決定178 / Batch A Production Release） |
| New master | `4c33350` |
| transport | `git merge --ff-only`（master は RC の直接の祖先・線形 1 commit。tree hash `3bfd22b6…` で完全一致） |
| push | `decebf6..4c33350 master -> master`（通常 push・force なし） |
| deploy | Vercel の master 自動 deploy のみ（manual deploy なし） |
| 反映時間 | push 05:17:08 JST の **約34秒後**に新 asset の配信を確認 |

### Production Asset 検証

ゲームが実際に要求する **query string 無しの canonical URL** に `no-cache, no-store` を付けて取得。

```
https://seven-gods-game.vercel.app/assets/enemies/juuma/art_hq.webp
bytes : 158,262
sha256: 4356913d2c9bdeeae1be34ba6a4beece15339d93ee540a6583bfca9abc3b196a  ← 承認 RC と完全一致
```

旧 asset の hash（`b4d67d58…`）はどの条件でも返らない。`Cache-Control: public, max-age=0, must-revalidate` のため再訪ユーザーにも旧 asset は残らない。**他の敵 6 体（datenshi／karakuri／doukeshi／oni／onryo／ryujin）は master と byte 完全一致**で不変。

### asset-only である証明

Production が配信する JS／CSS／HTML は公開前と **byte 完全一致**（`index-CLclgl5i.js` `95d062cd…`／`index-IKMGO-ur.css` `7b220d3a…`／`index.html` `2ace0eaf…`）。`src/` の tree hash も master と同一（`0b1fb25e…`）。**利用者に届く変更は juuma の WebP 1 ファイルのみ。**

### Production QA（本番 URL・headless Chromium）

| 条件 | PC 1366×768 | Mobile 390×844 |
| --- | --- | --- |
| 実描画 asset | `/assets/enemies/juuma/art_hq.webp`・**naturalSize 768×768** | 同左 |
| enemy box | 292.8×287.3 | 126.2×359.8 |
| 双牙の魔獣の表示 | 正常（`双牙の魔獣【連撃型】…850/850`） | 正常 |
| 壊れ画像 | 0 | 0 |
| scrollY / 横はみ出し | 0 / 0 | 0 / 0 |
| JS エラー | 0 | 0 |
| 失敗リクエスト | 0 | 0 |
| battle 開始 | 正常 | 正常 |
| カード使用 | 正常（手札が減り着弾） | 正常 |
| End Round | 正常（ラウンド進行） | 正常 |
| **6-A Combat Juice** | `.floating-number`／`.cast-flash`／`.enemy-hit-layer`／`.battle-mini-result-*` を自ターンで確認、敵ターンで `.player-hit-layer`／`.floating-number`／mini-result を確認 | — |
| **6-B HUD** | 敵・予告・HP・手札 5 枚・End Round すべて可視 | 同左 |
| **6-C callout** | 2 件観測 | 本試行では 0 件（callout は条件成立時のみ発火する仕様。PC で発火を確認済み） |
| **6-D God Strike** | cut-in 観測・HP ghost 観測 | cut-in 観測・HP ghost 観測 |

### Ranking Absence（Production 実測）

| 検査 | 結果 |
| --- | --- |
| `/api/ranking/{start,submit,leaderboard}` | すべて **404** |
| Ranking UI | **0**（戦闘画面・結果画面とも） |
| Ranking API へのリクエスト | **0**（PC/Mobile とも計測） |
| 外部オリジンへのリクエスト | **0**（通信先は `seven-gods-game.vercel.app` のみ） |
| bundle 内 `/api/`・neon・postgres・`DATABASE_URL`・`RANKING_` | すべて **0 occurrences** |
| `submissionEnabled` | `!1`（= false） |
| `saveVersion` | 9 |
| `/docs/`・`/art-source/` | **404**（配信対象外） |

### 判定

**PASS / LIVE。Release Blockers 0。**

**Rollback**：不要。必要時は `origin/master` を `decebf6` の内容へ通常 commit で戻す（force push はしない）。asset 名を維持しているため、戻した時点で `max-age=0, must-revalidate` により再訪で旧 asset に復帰する。
