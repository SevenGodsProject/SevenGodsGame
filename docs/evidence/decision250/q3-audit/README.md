# 決定250 Q3 Root Cause Audit（CEO Human QA 4/5・Q3「大耀本人」NO）— 2026-09-29

- 種別：**AUDIT ONLY**（生成 0・fal.ai API 0・課金 0・runtime 変更 0・commit 0）。本フォルダの画像は配信 mp4（commit `5acba73` の `god-strike-v1.mp4`）と既存 evidence から ffmpeg／sharp で切り出した**非生成の解析物**
- Human QA（CEO・2026-09-29）：Q1 YES／Q2 YES／**Q3 NO**／Q4 YES／Q5 YES ＝ 4/5 → **CONDITIONAL FAIL**。Kling 動画は Production 不採用（CEO）

## 1. 本フォルダの証拠

| ファイル | 内容 |
|---|---|
| `D_29frames_as_seen_in_circle.webp` | 配信 mp4 の全 29 frame を、CSS どおり（zoom 1.7・中心 37.5%/32.5%）に**円の中で実際に見える領域**で切り出した contact sheet |
| `poster_vs_video_circle.webp` | 左端＝カットインの静止ポスター（`keyvisual.webp`・`center 30%`）、以降＝動画 frame 1／8／15／22／29 の円切り出し。**120ms のクロスフェードで何から何へ変わるか** |
| `face_canonical_vs_D_frames.webp` | 顔領域（`analyze.mjs` の R.face）の 3 倍拡大。左＝canonical `front_640` を入力板と同じ合成で置いたもの（合成位置の再現ズレあり・参考）、以降＝frame 1／8／15／22／27／29 |
| `D_face_luminance.json` | 29 frame の顔領域の平均輝度と白飛び率（>235） |

## 2. 機械 Gate と Human Q3 の食い違い（Root Cause）

1. **Gate が測った区間と配信区間が重ならない**：Try1 Gate は原本 **0〜0.4s** の顔 MAE（2.2 ≤ 8）で PASS。配信した候補 D は原本 **1.10〜4.71s**。この区間のシフト補正後の顔 MAE は **18.7 → 86**（閾値 14 を全 frame で超過）。§2 の「数値 FAIL だが目視で別人化ではない」は AI 目視であり、CEO の目視で否定された
2. **Gate の参照画像がプレイヤーの参照と違う**：Gate は動画 frame0 と**入力板**を比べた。プレイヤーが直前まで見ているのは **`keyvisual`（Home／神選択／カットイン／勝利すべて同一）**。動画は `front_640` 系＋Kling の再描画なので、「keyvisual の大耀 → 別の描き方の大耀」を 120ms で見せている。この不連続は MAE の測定対象に入っていない
3. **MAE は意味的な変化に鈍い**：ゴーグルの位置（後述）のように「色も面積も近いが意味が違う」変化は MAE 8 前後にしか出ない
4. **評価スケールが違う**：AI は 1024² 全身で目視、CEO は円の中で **1.7 倍**に寄った顔を見た。頭巾・目・ゴーグルの差が拡大されている

## 3. 「大耀本人ではない」と感じさせた可能性（優先順位・実物目視）

| 順位 | 要因 | 実測・根拠 | 影響 |
|---|---|---|---|
| **1** | **ポスター（keyvisual）→ 動画の不連続** | `poster_vs_video_circle.webp` 左 2 枚：塗り（厚塗り→線画＋平塗り）・顔の大きさ（円の約 30%→約 45%）・構図（全身→顔と砲）・頭巾の描き方・背景（夕景→暗色平板）が 120ms で切り替わる | **最大**。モデルを変えても消えない（表示側の問題） |
| **2** | **バイザー越しの目が失われる（訂正済み）** | canonical：目は半透明オレンジのバイザー**越し**。当初「バイザーが目の下へ移動」と記述したが、Gate v2 の較正（`../try2/gate_v2.mjs`・目領域と目の直下の R−B 橙かぶり）で実測すると、Kling は原本 **2.2s まで橙かぶりを保持**（Δ ≤4）し、**2.2s 以降に退色**（目 Δ −8〜−25・直下 Δ −30〜−54）。つまり「移動」ではなく「バイザーの橙が抜けて目が素の白目に見える」変化。D では frame 9（約 375ms）以降に相当し、目が大きく白く見え「一般的なちびキャラ」の顔になる | **大**。D の後半 2/3 |
| **3** | **頭巾の宝袋紋** | canonical：迷彩頭巾＋前面に金の宝袋紋。動画：前面が金のターバン状の帯に再解釈され、紋の形が消える（crest MAE 17→80）。円の最上部に 1.7 倍で映る | **大** |
| **4** | **カメラの寄り＋腕のポーズ** | 原本 1.00→1.28 倍の寄りが 3 倍速で 1.2s に圧縮。原本 3.3s（D の frame 19・約 750ms）以降は腕が伸びて砲を突き出す（canonical は砲の上に手を置く座りポーズ） | **中**。後半 0.45s |
| **5** | **頭上のピンクの光跡（新規物体）** | 砲口から上へ伸びる energy line が D の全 frame で頭の左上を囲む | 中〜小 |
| **6** | 3 倍速化 | 原本は実効 12fps（motion MAE が 1 frame おきに 5.5／0.8 と交互）。3 倍速で 1 frame ごとにサンプルするため微小なジッター | 小（Q4 は YES） |
| **7** | 白フラッシュ | 顔の白飛びは最後の 1〜2 frame のみ（frame 29 で 31.5%、それ以前は ≤19%） | 小 |
| — | 体型・手（〜750ms）・砲の形・宝袋・主光 | 保持。宝袋は 1.7 倍の円ではほぼ枠外 | 要因ではない |

**候補 D の後処理（3 倍速）の寄与**：要因 4 と 6 を強めたが、要因 1〜3 は等速でも存在する。D の区間選定は「砲撃の全弧を 1.2s に入れる」ためで、identity の観点では frame 1 の時点で既に要因 2・3・5 を含んでいた。

**Kling（モデル）の寄与**：要因 2・3・5（frame 1 からの再解釈）、4（`static camera` を無視した寄り・腕の伸び）は Kling 2.5 Turbo Pro の出力に起因。要因 1 はモデル非依存。

## 4. H3 Max Try2 で Q3 改善が期待できるか【WEB 実測（fal.ai・2026-09-29 閲覧）＋AI 判断】

| 項目 | fal.ai の記載 |
|---|---|
| endpoint | `minimax/h3-max/image-to-video`（`image_url`＝先頭 frame・**`end_image_url`＝末尾 frame**・`duration` 既定 5・`resolution` 480P/768P/1080P・**`prompt_expansion_mode` disabled/balanced/quality**・`seed`・negative_prompt **なし**） |
| 単価 | 768P **$0.04/s**（50% off・**9/30 まで**）→ 以後 $0.08/s。1080P $0.08/s → $0.16/s |
| 参考 | `minimax/h3-max/reference-to-video`：参照画像複数（正方形 1 枚＝1,024 token・4,096 token まで無償）で被写体一貫性。768P $0.08/s |

- **要因 1（ポスター不連続）は Try2 では直らない**。Pilot v2 で「動画採用時のポスター＝動画の先頭 frame と同じ画（入力板由来）」にする表示側の変更が必須（presentation only）
- **要因 2・3・5・4 には合理的な改善余地がある**：①`end_image_url` に先頭と同じ入力板を渡し「同じ画に戻る」拘束を掛けられる（Kling には無い）②`prompt_expansion_mode: disabled` で書き換えによるカメラワーク付与を防げる ③動かす対象を砲口の光・光粒子・発射フラッシュ・≤3% の反動に限定する。ただし frame 1 の再描画（ゴーグル・紋）を防げるかは**未知**（H3 Max の実出力は本レーンに 0 件）
- **Gate v2（Try2 の前に固定）**：(a) 判定区間＝配信する 1.2s そのもの・円クロップ（zoom 1.7）で評価 (b) 参照＝画面上の直前画（ポスター）と入力板の両方 (c) 意味チェックを追加：目がバイザー越し（目領域の橙かぶり）・宝袋紋のテンプレート一致・頭部周辺の新規物体 0 (d) 全 frame シフト補正 MAE ≤14・寄り（bbox scale）≤1.03・3 倍速なし（等速で切れる尺を要求）
- **判定**：**GO WITH CONDITIONS**（Try2 1 回・768P・5s・上限 $0.40・Gate v2 と表示側修正をセットで）

## 5. H3 Max 用 改善 prompt 案（identity 最優先・未実行）

パラメータ：`image_url`＝入力板（`taiyo_god_strike_input_1024.png`・sha256 `57eabb31…`）／`end_image_url`＝同じ入力板／`resolution` 768P／`duration` 5／`prompt_expansion_mode` **disabled**／`seed` 固定（記録する）／音声なし。

```
Locked-off static camera, one continuous shot. No zoom, no pan, no dolly, no rotation, no cut, no camera shake.
The input image is both the first frame and the last frame. The drawing itself never changes: the same chibi boy,
the same face and eyebrows, the same eyes seen THROUGH the translucent orange goggle visor, the same open smile,
the same camouflage hood with the golden treasure-bag crest on the front, the same ear communicator, the same
sleeveless camo outfit, orange knee pad, black fingerless gloves, the same hand resting on top of the golden
mallet-shaped cannon, the same seated pose on the white treasure sack, the same body proportions, the same line art,
flat colors and dark plain background. Nothing is redrawn, re-lit, added or removed.
Only these four things move: (1) the red-orange glow inside the cannon muzzle brightens to white-gold; (2) a few small
golden light particles gather toward the muzzle; (3) the cannon fires one short bright golden burst straight to the
left with a tiny recoil of the cannon and shoulders, less than three percent of the frame; (4) a brief white-gold
flash at the muzzle, then the glow fades and everything settles back into exactly the starting pose.
The burst only adds a faint warm rim light on the cannon side; the face, hood, goggles, hands and outfit stay exactly
as drawn. 2D anime illustration, clean lines, flat colors, no motion blur, no text, no extra objects, no extra characters.
```

## 6. 概算コスト（実行せず確認のみ・fal.ai 表示価格）

| 案 | 単価 | 5s × 1 回 |
|---|---|---|
| image-to-video 768P（推奨） | $0.04/s（〜9/30）→ $0.08/s | **$0.20**（〜9/30）→ **$0.40** |
| image-to-video 1080P | $0.08/s → $0.16/s | $0.40 → $0.80 |
| reference-to-video 768P（参照 ≤4 枚は無償） | $0.08/s | $0.40 |

生成エラー時の課金有無・`duration` の下限は fal.ai ページに明記なし（前回セッションのメモ「5s が下限」は未検証）。
