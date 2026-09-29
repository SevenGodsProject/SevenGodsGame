# 決定250 Gate v2 Recalibrated（768 baseline 分離・形状／位置／semantic 優先）— 2026-09-29

- 目的：H3 Max 768P が静止状態でも生む resampling・軟化・微小な明度差・codec 差を **baseline noise** として分離し、配信候補 1.2s で生じた**追加 identity drift** だけを測る。閾値を「PASS させるために緩める」ことはしない
- 実装：`gate_v2r.mjs`（sharp のみ・非生成）。参照＝入力板を 768 に合わせたもの。baseline＝Try2 の動き出し前の静止 frame（1,5,9,13,17,21 の平均）。追加 drift＝candidate − baseline
- 追加生成 0・API 0・課金 0・runtime 変更 0

## 1. 指標（1024² 空間・ROI は `GATE_V2.md` と同じ＋ cannonBody [230,330,170,170]）

| 種別 | 指標 | 閾値（事前固定） |
|---|---|---|
| 形状（主） | **線画マスク NCC**：局所平均（15×15）より 20 以上暗い画素＝線。滑らかな照明は局所平均に吸収される。silhouette（膨張）内のみ。±8px 探索 | drop ≤ 0.15 |
| 形状（副） | Sobel エッジ NCC／輝度 NCC（±8px 探索） | drop ≤ 0.25／≤ 0.25 |
| 位置 | 各 ROI の最良シフトの baseline からのずれ（visor・crest・hand・cannonBody・face） | ≤ 4px |
| semantic | 目・目の直下の橙かぶり（R−B）の **減少**のみ（黄金色の照明で増える方向は許容） | ≥ −15 |
| silhouette 本体 | 板の silhouette 画素が背景色へ戻った率（欠損）＋ silhouette 外・発射域外で「光でない」差分（暖色かつ板より明るい＝光は除外） | 欠損 ≤ +1.0%／非光差分 ≤ +0.3% |
| カメラ | 線画ランドマーク（紋・バイザー・手・砲本体・宝袋）のシフト中央値＝pan、手−紋の縦距離の変化＝zoom | pan ≤ 4px／zoom ≤ 5px |
| 向き | 発射域（左）と鏡像域（右）の高輝度画素の多寡 | 左 |

## 2. 較正【実測】

| 入力 | 結果 |
|---|---|
| Try2 静止 frame 0〜24 | **全 21 項目 PASS**（line drop ≤0.018・位置 0・橙 Δ −1・pan/zoom 0・非光差分 0） |
| Kling Try1 候補 D 全区間（baseline＝Kling frame 1） | 20 項目 FAIL（line drop 0.88〜0.98・位置 8px・橙 −23/−53・zoom 16px・欠損 +2.1%） |
| Kling Try1 候補 D の最初の 1.2s（等速） | 18 項目 FAIL（zoom 15px・欠損 +1.3%・全 ROI の線画 drop >0.15） |

## 3. 実装上の修正（結果に影響したもの・事実記録）

1. **silhouette マスクの stride バグ**：sharp の `raw()` はグレースケール PNG でも 3ch で返るため、`data[k]` で読んだ初版（`gate_v2.mjs`・`gate_v2r.mjs` 初版）はマスクが崩れていた（59% が silhouette 扱い）。`data[k * channels]` に修正。これにより new-object・欠損・線画マスクの範囲が正しくなった（`gate_v2.mjs` の silhouette IoU／new_objects 値は無効。face／eyes／crest／hand などの ROI 指標は影響なし）
2. **線画マスクを絶対閾値（luma<90）から局所正規化へ**：絶対閾値では黄金色の照明で黒線が明るくなりマスクから抜け、照明が形状 drift に混入した。局所平均差に変更（照明不変）。閾値 0.15 は変更していない
3. カメラ指標を bbox（光に押し広げられる）からランドマーク間距離へ変更

## 4. 結果

### W1（1.125〜2.333s・frame 27〜55・最後がフラッシュ frame）
FAIL 10 項目：face／eyes／visor／hand／cannonBody の形状、crest／hand／cannonBody の位置（5px）、eyes_through_visor（フラッシュ frame で −32／−27）、pan 5px。**フラッシュ frame が identity の可視性を損なう**

### W2（1.083〜2.250s・frame 26〜54・フラッシュなし）
| 項目 | 結果 | 値（追加 drift の最大） |
|---|---|---|
| brows／mouth／hood／**crest**／hand／sack の形状 | **PASS** | line drop 0.10〜0.15 以下 |
| 全ランドマーク位置（visor・crest・hand・cannonBody・face） | **PASS** | ≤ 4px |
| **eyes_through_visor** | **PASS** | 目 −6.4／直下 −7.1（減少は小） |
| silhouette 本体（欠損・非光差分） | **PASS** | 欠損 −0.02%・非光差分 0 |
| camera pan／zoom | **PASS** | 4px／3px |
| new objects（非光） | **PASS** | 0 |
| orientation | **PASS** | 左 |
| **face** 形状 | FAIL | line drop 0.177（閾値 0.15）・edge 0.195（≤0.25 OK） |
| **eyes** 形状 | FAIL | line 0.186 |
| **visor** 形状 | FAIL | line 0.221 |
| **cannonBody** 形状 | FAIL | line 0.229・edge 0.306 |

- drift の時間推移：frame 26〜32 はほぼ 0、火球の点灯（frame 34〜）から**輝度に比例して滑らかに増え** 0.13〜0.22 で頭打ち。位置は 3px 以内・不連続な跳びなし。再描画（Kling の 0.9 前後）とは 1 桁違う
- 発生源（エッジ画像 `edges_plate_f001_f037_f053.webp`・顔推移 `W2_face_progression.webp`）：バイザー上の**火球の映り込み（帯状のハイライト）**と、肌・頭巾の黄金色化。輪郭（目・眉・口・バイザー縁・紋）は同じ位置にある

### 全 29-frame 窓の走査（`gate_v2r_all_0-123.json`）
- 21 項目すべて PASS する窓は **静止区間のみ**（0.00〜0.25s 始まり、3.21s 以降）。砲撃を含む窓は最少でも 4 項目（face／eyes／visor／cannonBody）が外れる
- 火球を含まない窓（〜1.0s 始まり）は visor／cannonBody が外れ、かつ砲撃が読めない

## 5. 判定
- **機械判定：W1 FAIL／W2 FAIL**（閾値は事前固定のまま。緩和なし）
- 推奨候補（人が見る場合）：**W2**（フラッシュ frame を含まず、目のバイザー越し・紋・位置・カメラ・向き・本体が PASS）
- FAIL 4 項目は火球の照明と映り込みに相関し、形状の不連続や位置ずれは検出されていない。「光で別物に見えるか」は機械では決められないため、判断は CEO・相棒の目視に委ねる（本 Gate は Pilot v2 Human QA を**承認しない**）
