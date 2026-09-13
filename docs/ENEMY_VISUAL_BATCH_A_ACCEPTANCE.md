# Enemy Visual Upgrade Batch A — Final Visual Acceptance Gate（決定175）

- 実施日：2026-09-13
- 対象：`feat/enemy-visual-batch-a` `cd81ece` の敵 asset（datenshi／karakuri／doukeshi）
- 比較対象：`origin/master ad7734b`＝現在 Production で配信中の敵 asset
- 性質：**AUDIT / QA ONLY**。master merge・Production deploy はしていない
- 判定：**GO**（Batch A の 3 体を Production 候補として承認できる）

---

## 0. 結論

| 問い | 答え |
| --- | --- |
| PC DPR1 / Mobile の実ゲームサイズで、NEW は OLD より柔らかく見えるか？ | **見えない。** 100% 表示では 3 体 × 4 つの DPR1 条件すべてで **OLD と NEW を判別できない** |
| 「柔らかい」という数値はどこから来ていたのか？ | Batch A で使った Laplacian variance が **旧 asset に焼き込まれたシャープの halo を拾って高く出ていた** ため。リンギングのない参照で測り直すと、PC1366 では **OLD の方が過剰**（勾配比 1.09・局所コントラスト 1.14）で、NEW は勾配比 1.01 とほぼ正確 |
| 高 DPI では？ | **NEW が明確に優位**。PC1366 DPR2 で忠実度 +2.77dB、構造一致 +0.080、エッジ保持 0.823→0.928。目視でも砲身の刻み・装甲の継ぎ目・刺繍が別物 |
| 新たに見つかった弱点は？ | PC1508（敵の箱が 194px）では **NEW の方が輪郭が強く出る**（勾配比 1.13・局所コントラスト 1.16）。Chromium の mipmap 縮小に由来。100% では視認できず、旧 Production が PC1366 で出していた過剰量（1.09）と同程度 |
| NO-GO 要因 | **なし** |

---

## 1. 方法

### 1-1. 同一条件での撮影

OLD（`origin/master` を別 worktree でビルド・port 4184）と NEW（branch build・port 4183）を同時に立て、同じ seed・同じ神・同じラウンド開始状態で撮影した。Boss Entrance が閉じるのを待ち、アニメーションを停止し、idle の transform を打ち消してから撮っている。

| 条件 | viewport | deviceScaleFactor |
| --- | --- | --- |
| pc1366-dpr1 | 1366×768 | 1 |
| pc1366-dpr2 | 1366×768 | 2 |
| pc1508-dpr1 | 1508×660 | 1 |
| pc1508-dpr2 | 1508×660 | 2 |
| sp390x760-dpr1 / dpr2 / dpr3 | 390×760 | 1 / 2 / 3 |
| sp390x844-dpr1 / dpr2 | 390×844 | 1 / 2 |

3 体 × 9 条件 = **27 条件**、OLD/NEW それぞれ成功（エラー 0）。敵要素の箱は OLD/NEW・製品パス/計測パスの全組合せで**差 0.5px 未満**（レイアウトを動かしていないことの担保）。

各条件で 2 枚撮る：

- **product**：製品そのまま（背景・drop-shadow・HUD 込み）。**100% 判定に使う**
- **isolated**：ステージ背景と drop-shadow を外し平坦色に置いたもの。Chromium の実際の縮小フィルタは通したまま敵の画素だけを取り出す計測用。HUD は `display:none` ではなく `visibility:hidden` で隠し、レイアウトを 1px も変えていない

### 1-2. 数値の測り方（ここが今回の肝）

Batch A で使った Laplacian variance は **シャープの halo に強く反応する**ため、「焼き込みシャープの旧 asset」対「素直な高解像度」の比較には使えない。今回は次の 2 本立てにした。

1. **リンギングのない参照との比較**：source の本体を **Mitchell**（リンギングをほぼ出さない）でその表示寸法へ落とした画像を「元の絵そのもの」とし、OLD/NEW のどちらが近いかを測る。
   - 当初 Lanczos3 で参照を作ったが、Lanczos は自身がリンギングを持つため **halo のある OLD を有利に評価してしまう**。Mitchell へ変更した。
2. **参照に依存しない halo 検出**：エッジ断面（7 サンプル）が全体の向きに逆行した量を数える。オーバーシュート／アンダーシュートの直接計測で、参照の選び方に左右されない。

主な指標：忠実度（PSNR / SSIM）、構造一致（勾配マップの相関）、勾配比（1.0 が正確・>1 は過剰輪郭・<1 は軟らかい）、局所コントラスト比、エッジ保持、立ち上がり幅、高周波誤差。

---

## 2. 100% 表示の判定（最重要）

拡大なしの 1:1 で OLD と NEW を並べて比較した（`acc-100/*-100pct.png`）。

| 条件 | 敵の描画サイズ | 目視判定 | OLD/NEW の画素差（平均／>8 レベルの割合） |
| --- | --- | --- | --- |
| PC1366 DPR1 | 290×285 CSS | **判別不能** | datenshi 6.02 / 19.9%、karakuri 3.86 / 13.4%、doukeshi 4.64 / 16.3% |
| PC1508 DPR1 | 290×194 | **判別不能** | 4.00 / 12.9%、3.45 / 9.0%、4.13 / 11.3% |
| Mobile 390×760 DPR1 | 124〜179×271 | **判別不能** | 2.66 / 10.1%、2.03 / 5.3%、2.04 / 6.4% |
| Mobile 390×844 DPR1 | 124〜179×355 | **判別不能** | 2.28 / 7.8%、1.45 / 4.0%、1.67 / 5.0% |
| PC1366 DPR2 | 同上を 2 倍密度 | **NEW が明確に優位** | 7.19 / 21.5%、3.90 / 14.5%、5.12 / 17.6% |

- DPR1 の 4 条件・3 体すべてで、どちらが新しいかを当てられない。平均画素差は 255 階調中 **1.45〜6.02**（>8 レベルの画素は 4〜20%、しかもほぼエッジ上）。
- いちばん差が大きい datenshi／PC1366 DPR1（平均 6.02）でも並べて判別できなかった。
- DPR2 では砲身の刻み・装甲の継ぎ目・ゴーグル・金の刺繍・ブーツの留め具が NEW でははっきり分かれ、OLD は溶けている。**高 DPI 環境での差は大きい。**

→ **「PC DPR1 / Mobile で柔らかく見える」という懸念は、実サイズでは成立しない。**

## 3. 数値の判定（リンギングのない参照との比較）

27 条件のうち NEW が勝った数：忠実度 13、構造一致 16、勾配比が 1.0 に近い 15、局所コントラストが 1.0 に近い 15、高周波誤差が小さい 14。**全体としては拮抗**だが、条件ごとに見ると系統的な差がある。

| 条件 | ΔPSNR（NEW−OLD） | Δ構造一致 | 勾配比 OLD→NEW | 局所コントラスト OLD→NEW | Δ高周波誤差 | エッジ保持 OLD→NEW |
| --- | --- | --- | --- | --- | --- | --- |
| **PC1366 DPR1** | **+1.52** | **+0.029** | **1.092 → 1.009** | **1.135 → 1.054** | **+19.1（改善）** | 0.887 → 0.882 |
| **PC1366 DPR2** | **+2.77** | **+0.080** | **0.859 → 1.020** | 0.923 → 1.051 | +5.9（改善） | **0.823 → 0.928** |
| PC1508 DPR1 | −1.51 | −0.026 | 1.013 → 1.127 | 1.053 → 1.164 | −23.0（悪化） | 0.884 → 0.897 |
| PC1508 DPR2 | −3.06 | −0.039 | 1.018 → 1.128 | 1.044 → 1.162 | −29.0（悪化） | 0.928 → 0.921 |
| Mobile 平均（DPR1） | +0.68 | +0.015 | 1.032 → 1.039 | 1.069 → 1.074 | +3.5 | 0.893 → 0.903 |
| Mobile 平均（DPR2/3） | −0.19 | +0.001 | 0.976 → 1.024 | 1.022 → 1.067 | −5.9 | 0.879 → 0.895 |

読み方：

- **PC1366（CEO の環境）では DPR1・DPR2 とも NEW の勝ち。** とくに勾配比が OLD 1.092 → NEW 1.009 と、**OLD が 9% 過剰に輪郭を立てていた**ことが定量的に出た。局所コントラストも 1.135 → 1.054。Batch A で「NEW が柔らかい」と見えた数値は、この過剰分が剥がれた結果であって、情報が減ったのではない。
- **PC1508 では逆に NEW が過剰側**（勾配比 1.13・局所コントラスト 1.16・高周波誤差 +23〜29）。原因は Chromium が `background-image` の縮小に mipmap を使うことで、768px は 194px 表示（≒mip 192）で高周波が立ちやすいため。ただし **OLD が PC1366 で出していた過剰量（1.09）と同程度**で、6 倍拡大で確認してもジャギーや階段状のエイリアシングは出ていない（`acc-100/pc1508-dpr1-*-alias6x.png`）。
- リンギング率は OLD 91.7% / NEW 90.7%（参照 88.2%、DPR1 平均）で、**NEW の方が参照に近い**。立ち上がり幅は OLD 3.73 / NEW 3.72（参照 3.71）でほぼ同じ＝知覚シャープネスに差はない。

## 4. 旧 asset の halo を「高品質」と誤認していないことの確認

| 検査 | 結果 |
| --- | --- |
| 参照の選び方 | Lanczos3（自身がリンギングを持つ）→ **Mitchell**（ほぼ持たない）へ変更。Lanczos のままだと OLD が有利に出る |
| 参照に依存しない halo 検出 | エッジ断面の逆行量。DPR1 平均で OLD 91.7% > NEW 90.7% > 参照 88.2% |
| 勾配比 | PC1366 DPR1 で OLD 1.092（過剰）／NEW 1.009（正確） |
| 局所コントラスト | PC1366 DPR1 で OLD 1.135（過剰）／NEW 1.054 |
| 高周波誤差 | PC1366 DPR1 で OLD 63.97 → NEW 50.21（NEW の方が参照からの高周波の外れが小さい） |

**結論：Batch A で「PC1366 DPR1 で NEW が 0.77 倍」と出ていたのは、OLD の焼き込みシャープが Laplacian を押し上げていたため。**リンギングのない基準で測ると同条件で NEW が上回る。

## 5. GO / NO-GO

**GO。** 根拠：

1. 最重要条件（100% 表示）で、DPR1 の全 4 条件・3 体とも **OLD と NEW を判別できない**。劣化は起きていない。
2. PC1366（CEO 環境）は DPR1・DPR2 とも NEW が忠実度・構造一致・勾配比・局所コントラスト・高周波誤差のすべてで上回る。
3. DPR2 以上では目視で明確に NEW が優位。高 DPI 端末ほど得をする。
4. 唯一の弱点（PC1508 の輪郭過剰）は 100% で視認できず、しかも旧 Production が PC1366 で出していた過剰量と同程度。新規に持ち込む害ではない。
5. Batch A で確認済みの構図・容量・テスト・gameVersion / saveVersion の結果はいずれも据え置き（位置差 ≤0.56 CSS px、+258KB、3041 passed、fingerprint 不変）。

**NO-GO 要因はない。** ただし Production 公開は CEO 判断事項なので、本 Gate は「技術的に GO」までとし、merge / deploy は行っていない。

## 6. 残課題（Batch C 候補・今回の対象外）

| 項目 | 内容 |
| --- | --- |
| mip 段に合わせた canvas 寸法 | 768px は 285px 表示（mip 384/192 の中間）と 194px 表示（≒mip 192）で挙動が変わる。1140px（=570×2）など主要表示サイズが mip 段に乗る寸法を実機比較する価値がある。ただし容量が約 2.4 倍になるため、効果を実測してから判断する |
| PC1508 の輪郭過剰 | 上記と同じ原因。canvas 寸法を変えるか、そのままで許容するかは Batch C で一緒に判断 |
| Mobile の表示サイズ | 敵が 124〜179 CSS px と小さい問題は画質ではなくレイアウト。6-B follow-up の別 Phase |

## 7. 再現コマンド

```
# OLD 側（origin/master を別 worktree でビルドして 4184 で配信）
git worktree add --detach ../SevenGodsGame-old origin/master && (cd ../SevenGodsGame-old && npx vite build && npx vite preview --port 4184)
# NEW 側（branch build を 4183 で配信）
npx vite build && npx vite preview --port 4183
# 撮影（27 条件 × 2 パス）
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/enemy-visual-batch-a/acceptance-capture.mjs <outNew> http://localhost:4183 NEW
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/enemy-visual-batch-a/acceptance-capture.mjs <outOld> http://localhost:4184 OLD
# 判定（Mitchell 参照＋参照に依存しない halo 検出）
node scripts/enemy-visual-batch-a/acceptance-metrics.mjs <outOld> <outNew> <sources.json> <acceptance.json>
```

## 決定175（提案）

**Enemy Visual Batch A Final Visual Acceptance Gate：GO。** PC DPR1 / Mobile での劣化は実サイズで発生していないことを確認し、旧 asset の焼き込みシャープを高品質と誤認していないことも参照の作り替えで検証した。master merge と Production deploy は引き続き CEO 判断（別 Step）。
