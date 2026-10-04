# 決定266 AC8 — 決定264 gate-layout 再実行（After=:4303 のみ・runs-layout JSON から自動生成）

runs: 52（pc660/after 13・pc800/after 13・sp660/after 13・sp844/after 13）

## A. 面積（画面比 %）・キャラ÷カード高・敵–神 ink 間隔（px）・OTOMO÷敵

| vp/side | n | 敵 % mean(min–max) | 神 % | OTOMO % | カード %/枚 | 敵÷カード高 | 神÷カード高 | 神÷敵 | OTOMO÷敵 | 間隔 mean(min–max) |
|---|---|---|---|---|---|---|---|---|---|---|
| pc660/after | 13 | 5.57 (5.12–5.95) | 5.71 (5.02–) | 0.25 (max 0.27) | 1.91 | 1.52 (min 1.49) | 1.46 (min 1.34) | 0.95 | 0.22 | 108.1 (80.0–130.0) |
| pc800/after | 13 | 6.00 (4.81–7.11) | 7.80 (6.86–) | 0.35 (max 0.39) | 1.86 | 1.60 (min 1.55) | 1.72 (min 1.59) | 1.08 | 0.25 | 125.8 (90.0–151.0) |
| sp660/after | 13 | 8.76 (7.03–10.39) | 7.16 (6.29–) | 0.23 (max 0.25) | 5.44 | 1.14 (min 1.10) | 0.97 (min 0.89) | 0.86 | 0.17 | 37.4 (16.0–52.0) |
| sp844/after | 13 | 8.35 (7.89–8.54) | 8.79 (7.73–) | 0.29 (max 0.33) | 4.80 | 1.11 (min 1.06) | 1.08 (min 0.99) | 0.97 | 0.19 | 35.8 (18.0–51.0) |

## B. 着弾中心∈ink（G3）・重なり（G4）・反転（G7）・文字切れ／横スクロール（G8）・console（G9）・名札行数

| vp/side | hit in-ink（敵 slash／数字・神 slash／数字） | 重なり合計（敵–神・敵–手札・神–手札・名札・OTOMO） | scale（HUD／cutin） | clipped 要素 | hScroll | console error | 名札行（敵名／神名／予告）max |
|---|---|---|---|---|---|---|---|
| pc660/after | 13/13・13/13 of 13 | 0・0・0・0・0 | -1 1/-1 1 | 0 | 0 | 0 | 1／1／1 |
| pc800/after | 13/13・13/13 of 13 | 0・0・0・0・0 | -1 1/-1 1 | 0 | 0 | 0 | 1／1／1 |
| sp660/after | 13/13・13/13 of 13 | 0・0・0・0・0 | -1 1/-1 1 | 0 | 0 | 0 | 1／1／1 |
| sp844/after | 13/13・13/13 of 13 | 0・0・0・0・0 | -1 1/-1 1 | 0 | 0 | 0 | 1／1／1 |

## C. 入口（決定254）T5 HUD 箱差・操作開放／消滅時刻（G5・G10 の一部）

| vp/side | 操作開放 ms mean(min–max) | 消滅 ms mean | HUD 箱差（消滅直後 vs +2s）0 の run | 要素別 最大差 px |
|---|---|---|---|---|
| pc660/after | 2773.0 (2500.0–3283.0) | 3202.5 | 13/13 | 0 |
| pc800/after | 2698.5 (2433.0–3183.0) | 3101.2 | 13/13 | 0 |
| sp660/after | 2502.5 (2417.0–3417.0) | 2898.8 | 13/13 | 0 |
| sp844/after | 2423.1 (2416.0–2433.0) | 2822.9 | 13/13 | 0 |

## D. per-run 一覧（After のみ・面積と間隔・敵÷カード）

| run | 敵 % | 神 % | OTOMO % | 敵÷カード | 神÷カード | 間隔 | hit 4/4 | overlap 敵–神 | clipped | errors |
|---|---|---|---|---|---|---|---|---|---|---|
| after-pc660-ebisu-ryujin | 5.56 | 5.09 | 0.25 | 1.49 | 1.41 | 129 | 4/4 | 0 | 0 | 0 |
| after-pc660-fukuei-ryujin | 5.56 | 5.54 | 0.25 | 1.49 | 1.34 | 111 | 4/4 | 0 | 0 | 0 |
| after-pc660-juraku-ryujin | 5.56 | 5.06 | 0.25 | 1.49 | 1.40 | 124 | 4/4 | 0 | 0 | 0 |
| after-pc660-saika-ryujin | 5.55 | 6.34 | 0.25 | 1.49 | 1.51 | 114 | 4/4 | 0 | 0 | 0 |
| after-pc660-shouren-ryujin | 5.56 | 5.02 | 0.27 | 1.49 | 1.37 | 130 | 4/4 | 0 | 0 | 0 |
| after-pc660-sobi-ryujin | 5.57 | 6.27 | 0.25 | 1.49 | 1.56 | 115 | 4/4 | 0 | 0 | 0 |
| after-pc660-taiyo-doukeshi | 5.90 | 5.85 | 0.25 | 1.49 | 1.48 | 81 | 4/4 | 0 | 0 | 0 |
| after-pc660-taiyo-juuma | 5.95 | 5.88 | 0.25 | 1.49 | 1.48 | 80 | 4/4 | 0 | 0 | 0 |
| after-pc660-taiyo-karakuri | 5.12 | 5.85 | 0.25 | 1.69 | 1.48 | 108 | 4/4 | 0 | 0 | 0 |
| after-pc660-taiyo-oni | 5.47 | 5.85 | 0.25 | 1.57 | 1.48 | 94 | 4/4 | 0 | 0 | 0 |
| after-pc660-taiyo-onryo | 5.43 | 5.79 | 0.25 | 1.61 | 1.47 | 102 | 4/4 | 0 | 0 | 0 |
| after-pc660-taiyo-ryujin | 5.56 | 5.84 | 0.25 | 1.49 | 1.48 | 128 | 4/4 | 0 | 0 | 0 |
| after-pc660-taiyo-trial | 5.58 | 5.84 | 0.25 | 1.52 | 1.48 | 89 | 4/4 | 0 | 0 | 0 |
| after-pc800-ebisu-ryujin | 5.83 | 6.94 | 0.36 | 1.55 | 1.67 | 150 | 4/4 | 0 | 0 | 0 |
| after-pc800-fukuei-ryujin | 5.85 | 7.59 | 0.36 | 1.55 | 1.59 | 128 | 4/4 | 0 | 0 | 0 |
| after-pc800-juraku-ryujin | 5.85 | 6.92 | 0.35 | 1.55 | 1.66 | 143 | 4/4 | 0 | 0 | 0 |
| after-pc800-saika-ryujin | 5.84 | 8.66 | 0.35 | 1.55 | 1.79 | 132 | 4/4 | 0 | 0 | 0 |
| after-pc800-shouren-ryujin | 5.84 | 6.86 | 0.39 | 1.55 | 1.62 | 151 | 4/4 | 0 | 0 | 0 |
| after-pc800-sobi-ryujin | 5.84 | 8.56 | 0.35 | 1.55 | 1.85 | 133 | 4/4 | 0 | 0 | 0 |
| after-pc800-taiyo-doukeshi | 7.09 | 8.00 | 0.35 | 1.66 | 1.75 | 90 | 4/4 | 0 | 0 | 0 |
| after-pc800-taiyo-juuma | 7.11 | 7.96 | 0.35 | 1.65 | 1.75 | 91 | 4/4 | 0 | 0 | 0 |
| after-pc800-taiyo-karakuri | 4.81 | 7.94 | 0.35 | 1.66 | 1.74 | 134 | 4/4 | 0 | 0 | 0 |
| after-pc800-taiyo-oni | 5.97 | 8.00 | 0.35 | 1.66 | 1.75 | 111 | 4/4 | 0 | 0 | 0 |
| after-pc800-taiyo-onryo | 5.65 | 7.99 | 0.35 | 1.66 | 1.75 | 121 | 4/4 | 0 | 0 | 0 |
| after-pc800-taiyo-ryujin | 5.85 | 8.00 | 0.35 | 1.55 | 1.75 | 149 | 4/4 | 0 | 0 | 0 |
| after-pc800-taiyo-trial | 6.46 | 8.00 | 0.35 | 1.66 | 1.75 | 102 | 4/4 | 0 | 0 | 0 |
| after-sp660-ebisu-ryujin | 8.53 | 6.38 | 0.23 | 1.10 | 0.94 | 51 | 4/4 | 0 | 0 | 0 |
| after-sp660-fukuei-ryujin | 8.54 | 6.97 | 0.23 | 1.10 | 0.89 | 41 | 4/4 | 0 | 0 | 0 |
| after-sp660-juraku-ryujin | 8.53 | 6.35 | 0.23 | 1.10 | 0.93 | 48 | 4/4 | 0 | 0 | 0 |
| after-sp660-saika-ryujin | 8.53 | 7.97 | 0.23 | 1.10 | 1.01 | 43 | 4/4 | 0 | 0 | 0 |
| after-sp660-shouren-ryujin | 8.52 | 6.29 | 0.25 | 1.10 | 0.91 | 52 | 4/4 | 0 | 0 | 0 |
| after-sp660-sobi-ryujin | 8.53 | 7.86 | 0.23 | 1.10 | 1.04 | 43 | 4/4 | 0 | 0 | 0 |
| after-sp660-taiyo-doukeshi | 10.34 | 7.33 | 0.23 | 1.18 | 0.98 | 16 | 4/4 | 0 | 0 | 0 |
| after-sp660-taiyo-juuma | 10.39 | 7.33 | 0.23 | 1.17 | 0.98 | 16 | 4/4 | 0 | 0 | 0 |
| after-sp660-taiyo-karakuri | 7.03 | 7.33 | 0.23 | 1.18 | 0.98 | 41 | 4/4 | 0 | 0 | 0 |
| after-sp660-taiyo-oni | 8.71 | 7.33 | 0.23 | 1.18 | 0.98 | 28 | 4/4 | 0 | 0 | 0 |
| after-sp660-taiyo-onryo | 8.25 | 7.33 | 0.23 | 1.18 | 0.98 | 34 | 4/4 | 0 | 0 | 0 |
| after-sp660-taiyo-ryujin | 8.52 | 7.33 | 0.23 | 1.10 | 0.98 | 51 | 4/4 | 0 | 0 | 0 |
| after-sp660-taiyo-trial | 9.42 | 7.33 | 0.23 | 1.18 | 0.98 | 22 | 4/4 | 0 | 0 | 0 |
| after-sp844-ebisu-ryujin | 8.53 | 7.83 | 0.30 | 1.10 | 1.04 | 50 | 4/4 | 0 | 0 | 0 |
| after-sp844-fukuei-ryujin | 8.53 | 8.54 | 0.29 | 1.10 | 0.99 | 37 | 4/4 | 0 | 0 | 0 |
| after-sp844-juraku-ryujin | 8.53 | 7.79 | 0.29 | 1.10 | 1.03 | 46 | 4/4 | 0 | 0 | 0 |
| after-sp844-saika-ryujin | 8.51 | 9.75 | 0.29 | 1.10 | 1.12 | 39 | 4/4 | 0 | 0 | 0 |
| after-sp844-shouren-ryujin | 8.53 | 7.73 | 0.33 | 1.10 | 1.01 | 51 | 4/4 | 0 | 0 | 0 |
| after-sp844-sobi-ryujin | 8.53 | 9.65 | 0.29 | 1.10 | 1.16 | 40 | 4/4 | 0 | 0 | 0 |
| after-sp844-taiyo-doukeshi | 8.50 | 9.00 | 0.29 | 1.07 | 1.09 | 18 | 4/4 | 0 | 0 | 0 |
| after-sp844-taiyo-juuma | 8.54 | 8.99 | 0.29 | 1.06 | 1.09 | 18 | 4/4 | 0 | 0 | 0 |
| after-sp844-taiyo-karakuri | 7.92 | 9.00 | 0.29 | 1.25 | 1.09 | 35 | 4/4 | 0 | 0 | 0 |
| after-sp844-taiyo-oni | 7.89 | 8.99 | 0.29 | 1.12 | 1.09 | 27 | 4/4 | 0 | 0 | 0 |
| after-sp844-taiyo-onryo | 7.90 | 8.99 | 0.29 | 1.16 | 1.09 | 32 | 4/4 | 0 | 0 | 0 |
| after-sp844-taiyo-ryujin | 8.52 | 8.99 | 0.29 | 1.10 | 1.09 | 49 | 4/4 | 0 | 0 | 0 |
| after-sp844-taiyo-trial | 8.06 | 9.00 | 0.29 | 1.09 | 1.09 | 24 | 4/4 | 0 | 0 | 0 |

## E. HUD 実寸（px・幅×高。全 run で同値のものは 1 つ）Before → After と倍率（G8）

| vp | 敵 HP Before | 敵 HP After | 倍率 | 神 HP Before | 神 HP After | 倍率 | 共鳴ゲージ Before | 共鳴ゲージ After | 共鳴高 ≤ HP 高 |
|---|---|---|---|---|---|---|---|---|---|
| pc660 |  | 307×18 | ×— |  | 219×18 | ×— |  | 217×12 | PASS |
| pc800 |  | 615×18 | ×— |  | 515×18 | ×— |  | 199×12 | PASS |
| sp660 |  | 154.5×18 | ×— |  | 137.5×18 | ×— |  | 133.5×12 | PASS |
| sp844 |  | 154.5×18 | ×— |  | 137.5×18 | ×— |  | 133.5×12 | PASS |

## F. 神÷敵（ink 面積）per 組（G1 新規指標・合格 0.9〜1.15）・--artScale・アリーナ上端からのはみ出し px・上部バー重なり

| run | Before 神÷敵 | After 神÷敵 | 判定 | artScale | 上端はみ出し | 上部バー重なり |
|---|---|---|---|---|---|---|
| pc660-ebisu-ryujin | — | 0.92 | PASS | 1.07 | 0 | 0 |
| pc660-fukuei-ryujin | — | 1.00 | PASS | 1.07 | 0 | 0 |
| pc660-juraku-ryujin | — | 0.91 | PASS | 1.07 | 0 | 0 |
| pc660-saika-ryujin | — | 1.14 | PASS | 1.07 | 0 | 0 |
| pc660-shouren-ryujin | — | 0.90 | PASS | 1.07 | 0 | 0 |
| pc660-sobi-ryujin | — | 1.13 | PASS | 1.07 | 0 | 0 |
| pc660-taiyo-doukeshi | — | 0.99 | PASS | 1 | 0 | 0 |
| pc660-taiyo-juuma | — | 0.99 | PASS | 1 | 0 | 0 |
| pc660-taiyo-karakuri | — | 1.14 | PASS | 1.13 | 0 | 0 |
| pc660-taiyo-oni | — | 1.07 | PASS | 1.05 | 0 | 0 |
| pc660-taiyo-onryo | — | 1.07 | PASS | 1.08 | 0 | 0 |
| pc660-taiyo-ryujin | — | 1.05 | PASS | 1.07 | 0 | 0 |
| pc660-taiyo-trial | — | 1.05 | PASS | 1.02 | 0 | 0 |
| pc800-ebisu-ryujin | — | 1.19 | out | 1 | 0 | 0 |
| pc800-fukuei-ryujin | — | 1.30 | out | 1 | 0 | 0 |
| pc800-juraku-ryujin | — | 1.18 | out | 1 | 0 | 0 |
| pc800-saika-ryujin | — | 1.48 | out | 1 | 0 | 0 |
| pc800-shouren-ryujin | — | 1.17 | out | 1 | 0 | 0 |
| pc800-sobi-ryujin | — | 1.47 | out | 1 | 0 | 0 |
| pc800-taiyo-doukeshi | — | 1.13 | PASS | 1 | 0 | 0 |
| pc800-taiyo-juuma | — | 1.12 | PASS | 1 | 0 | 0 |
| pc800-taiyo-karakuri | — | 1.65 | out | 1 | 0 | 0 |
| pc800-taiyo-oni | — | 1.34 | out | 1 | 0 | 0 |
| pc800-taiyo-onryo | — | 1.41 | out | 1 | 0 | 0 |
| pc800-taiyo-ryujin | — | 1.37 | out | 1 | 0 | 0 |
| pc800-taiyo-trial | — | 1.24 | out | 1 | 0 | 0 |
| sp660-ebisu-ryujin | — | 0.75 | out | 1 | 0 | 0 |
| sp660-fukuei-ryujin | — | 0.82 | out | 1 | 0 | 0 |
| sp660-juraku-ryujin | — | 0.74 | out | 1 | 0 | 0 |
| sp660-saika-ryujin | — | 0.93 | PASS | 1 | 0 | 0 |
| sp660-shouren-ryujin | — | 0.74 | out | 1 | 0 | 0 |
| sp660-sobi-ryujin | — | 0.92 | PASS | 1 | 0 | 0 |
| sp660-taiyo-doukeshi | — | 0.71 | out | 1 | 0 | 0 |
| sp660-taiyo-juuma | — | 0.71 | out | 1 | 0 | 0 |
| sp660-taiyo-karakuri | — | 1.04 | PASS | 1 | 0 | 0 |
| sp660-taiyo-oni | — | 0.84 | out | 1 | 0 | 0 |
| sp660-taiyo-onryo | — | 0.89 | out | 1 | 0 | 0 |
| sp660-taiyo-ryujin | — | 0.86 | out | 1 | 0 | 0 |
| sp660-taiyo-trial | — | 0.78 | out | 1 | 0 | 0 |
| sp844-ebisu-ryujin | — | 0.92 | PASS | 1.103 | 0 | 0 |
| sp844-fukuei-ryujin | — | 1.00 | PASS | 1.103 | 0 | 0 |
| sp844-juraku-ryujin | — | 0.91 | PASS | 1.103 | 0 | 0 |
| sp844-saika-ryujin | — | 1.15 | PASS | 1.103 | 0 | 0 |
| sp844-shouren-ryujin | — | 0.91 | PASS | 1.103 | 0 | 0 |
| sp844-sobi-ryujin | — | 1.13 | PASS | 1.103 | 0 | 0 |
| sp844-taiyo-doukeshi | — | 1.06 | PASS | 1 | 0 | 0 |
| sp844-taiyo-juuma | — | 1.05 | PASS | 1 | 0 | 0 |
| sp844-taiyo-karakuri | — | 1.14 | PASS | 1.17 | 0 | 0 |
| sp844-taiyo-oni | — | 1.14 | PASS | 1.05 | 0 | 0 |
| sp844-taiyo-onryo | — | 1.14 | PASS | 1.08 | 0 | 0 |
| sp844-taiyo-ryujin | — | 1.06 | PASS | 1.103 | 0 | 0 |
| sp844-taiyo-trial | — | 1.12 | PASS | 1.02 | 0 | 0 |

| vp | 神÷敵 0.9〜1.15 の組 | min | max |
|---|---|---|---|
| pc660 | 13/13 | 0.90 | 1.14 |
| pc800 | 2/13 | 1.12 | 1.65 |
| sp660 | 3/13 | 0.71 | 1.04 |
| sp844 | 13/13 | 0.91 | 1.15 |