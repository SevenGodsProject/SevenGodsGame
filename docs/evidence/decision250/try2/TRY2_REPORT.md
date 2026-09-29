# 決定250 H3 Max Try2 — 実行記録と Gate v2 判定（2026-09-29）

- 種別：**CEO 承認の生成 1 回**（2026-09-29 承認条件：`minimax/h3-max/image-to-video`・768P・5s・1 回・上限 $0.40）＋ Gate v2 判定。runtime 変更 0・commit 0・Try3 0・再送 0
- スクリプト：`gen_try2.mjs`（実行前に `MODEL_ID` の完全一致・他モデル名 0・`submitted.json` 不在を機械確認してから実行。`try2_request.json` に記録）
- FAL_KEY：環境変数からのみ読み、値は表示・保存していない（`grep -c 'Key '` ＝ 0 を確認）
- 原本：`art-source/h3-god-strike/try2/taiyo_god_strike_try2_raw_h3max.mp4`（md5 `46175669…`・**commit しない**）

## 1. 実行【実測】

| 項目 | 値 |
|---|---|
| model ID（request/response とも） | **`minimax/h3-max/image-to-video`**（response_url が `queue.fal.run/minimax/h3-max/requests/…`） |
| request count | **1**（submit 1・status polling は課金なし） |
| request_id | `01a0ed24-623b-7e22-8acf-b4feb0e13b74` |
| resolution / duration / seed | 768P（出力 768×768）／5（出力 5.167s・124f・24fps）／**seed 250** |
| prompt_expansion_mode | `disabled`（response の `expanded_prompt: null` で確認） |
| image_url / end_image_url | 同じ入力板（sha256 `57eabb31…`・`front_640` 由来）。keyvisual は未使用 |
| inference | 3.73s（metrics）／HTTP 200／COMPLETED |
| 原本サイズ | **5,400,116B**（H.264・8.2Mbps） |
| actual cost | fal.ai 表示価格 768P **$0.04/s（9/30 まで）× 5s ＝ $0.20**（通常単価なら $0.40）。**ダッシュボードの請求額で要照合** |

## 2. 原本の構造【Gate v2 全 124 frame・`try2_sheet_every4.webp`】

| 区間 | 内容 |
|---|---|
| 0.00〜1.30s | **完全静止**（入力板の再描画 1 枚のまま。faceShift 0） |
| 1.33〜2.25s | 砲口の光が強まる→光粒子→砲口の火球（左）。キャラの姿勢・顔・手は不変、**キャラ全体が黄金色に照らされる** |
| 2.29〜3.10s | **白フラッシュ＋放射光が画面全体を覆う 0.8s**（顔も白〜黄に飛ぶ。プロンプトの "brief flash" より長く強い） |
| 3.17〜5.17s | 静止に戻り、**最終 frame は最初の frame と同一**（`end_image_url` の拘束が効いた） |

カメラ：静止（顔 ROI のシフト補正量は全区間 ≤2px。bbox 指標の「scale 1.29・shift −147」は左へ伸びる火球と全画面フラッシュが bbox を押し広げたもの＝光であってカメラではない）。腕・ポーズ：不変。反転：なし。

## 3. 配信候補（等速・3 倍速なし）

| 候補 | 原本区間 | 内容 | 720² MP4 CRF24 |
|---|---|---|---|
| **W1** | **1.125〜2.333s（frame 27〜55・29f）** | 光の高まり→粒子→火球→**白フラッシュの最初の 1 frame で終わる** | **176,514B**（`candidate_1.125-2.333_720_crf24.mp4`・md5 `aeaf46f7…`） |
| W2 | 1.083〜2.250s（frame 26〜54） | 同上でフラッシュ frame を含まない | 166,058B |

## 4. Gate v2 判定（参照＝入力板を出力解像度 768 に合わせたもの・`gate_v2_candidate_*.json`）

まず事実：**動きのない静止 frame（frame 1）ですら**入力板との face MAE は 17.8・mouth 16.2・hand 14.8・sack 17.3・silhouette IoU 0.864・new_objects 5.2% で、閾値（14／16／14／14／0.90／0.8%）を外れる。差分画像（`diff_plate_vs_f001.webp`）は**輪郭線だけ**＝768 出力の軟化と全体の微小な暗化であり、目視では入力板と同一。Gate v2 の絶対閾値は Kling（1440→1024・鮮鋭）で較正したもので、H3 の 768 出力には**そのまま転用できない**（Gate 側の較正不足。生成前に固定したので本判定では変更しない）。

| 項目 | W1（27〜55） | W2（26〜54） | 判定（固定閾値） | 実体（目視＋差分） |
|---|---|---|---|---|
| face | max 45.4（フラッシュ frame）／〜33 | max 33.2 | **FAIL** | 顔の形・目・眉・口は不変。31〜33 は火球の**黄金色の照明**（f037／f053 の顔クロップ） |
| eyes | 目 Δ −34（frame 55）／〜−8 | 目 Δ ≤8.4 | W1 FAIL／**W2 PASS** | 目はバイザー越しのまま。フラッシュ frame のみ白飛び |
| visor／goggles | 直下 Δ −30（frame 55）／〜−10 | ≤10.2 | W1 FAIL／**W2 PASS** | 位置・形不変。橙が照明で黄に寄る |
| eyebrows | 32.6／〜24 | 24.1 | FAIL | 形不変（照明） |
| mouth | 27.9／〜26 | 26.4 | FAIL | 形不変（照明）。静止 frame でも 16.2 |
| hood | 25.6／〜17 | 16.8 | FAIL（≤16） | 迷彩と形は不変 |
| **hood emblem（宝袋紋）** | NCC min **0.862** | **0.883** | **PASS** | 紋の形が保持（Kling は 0.012 まで崩壊） |
| hand | 79（flash）／〜28 | 28.1 | FAIL | 砲の上の手の形・位置は不変。砲口の光に最も近く照明差が大きい |
| cannon | 89／〜56 | 56.1 | FAIL（≤20） | 砲本体は不変。砲口の火球が ROI に入る（プロンプトで許可した動き） |
| treasure bag | 21.4 | 20.4 | FAIL（≤14） | 不変。静止 frame でも 17.3（軟化） |
| silhouette | IoU 0.36（flash）／〜0.75 | 0.547 | FAIL | 火球・粒子が「平板でない画素」として silhouette 外に乗る |
| pose | — | — | 目視 **PASS** | 座り・手・腕・砲の持ち方すべて不変（Kling は 3.3s で腕が伸びた） |
| orientation | 砲火は左 | 左 | PASS（W2 は frame 26 で bright 画素が少なく重心が右へ寄る計測揺れ） | 反転 0 |
| camera movement | faceShift ≤2px | ≤2px | bbox 指標は FAIL／**顔シフトでは PASS** | カメラ静止 |
| camera zoom | scale 1.29（flash frame の bbox） | 同 | bbox 指標は FAIL／**顔スケール不変** | 寄りなし |
| new objects | 25%（flash）／〜13% | 13.7% | FAIL（≤0.8%） | 粒子・火球・放射光（許可した動き）。**ピンクの光跡のような未指示の物体はなし** |

**Gate v2（固定閾値）の機械判定：W1・W2 とも NO-GO。** ただし FAIL の内訳は「(a) 768 出力の軟化＝静止 frame でも外れる、(b) 火球・フラッシュの**照明**がキャラ全体に乗る、(c) 光そのものが bbox／silhouette／new-object 指標に入る」の 3 種で、**顔・目・バイザー位置・眉・口・頭巾・紋・手・砲・宝袋・ポーズ・向き・カメラの「形」は全区間で不変**（semantic 2 項目は W2 で PASS）。

補助（参考・仕様外）：参照を Try2 自身の静止 frame にした自己参照では W2 の hood 12.3・sack 9.8 が PASS に入り、残る差は照明由来の face 31.8／hand 25.1／cannon 54.7 と光の指標のみ（`gate_v2_candidate_26-54_selfref.json`）。

## 5. Kling Try1（候補 D 区間・1024 参照）との比較

| 指標 | Kling D（1.10〜4.71s・3 倍速） | H3 Max W2（1.083〜2.25s・等速） |
|---|---|---|
| face MAE 最大 | 88 | 33（照明） |
| 目／直下の橙 Δ | −25／−54（2.2s 以降に退色） | −8／−10（**保持**） |
| 宝袋紋 NCC 最小 | 0.012（崩壊） | 0.883（保持） |
| hand MAE 最大 | 116（腕が伸びる） | 28（形不変・照明） |
| カメラ | 1.00→1.29 の寄り | 静止（顔シフト ≤2px） |
| ポーズ | 3.3s 以降に変化 | 不変 |
| 未指示の物体 | ピンクの光跡（頭上） | なし |
| 時間圧縮 | 3 倍速（必要だった） | 不要（等速で砲撃が収まる） |
| 尺内の白フラッシュ | 最後 1〜2 frame | W1 最後 1 frame／W2 なし（原本では 0.8s 続く） |
| 配信サイズ | 389,541B | 176,514B（W1）／166,058B（W2） |

## 6. 目視（円クロップ・`candidate_29frames_as_seen_in_circle.webp`／`poster_vs_candidate_circle.webp`）【AI 判断】

- 円の中で見えるのは同じ大耀。顔・目・バイザー・眉・口・頭巾・紋・手が最後まで動かず、砲口だけが光→粒子→火球へ進む。CEO 指示の「canonical 大耀を固定したまま、神力と砲撃だけが生きる」に**方向として合致**
- 残る懸念 2 点：①火球以降（W2 の後半 2/3）で**キャラ全体が黄金色に照らされる**（肌が黄、迷彩が黄緑）。形は同じでも「色が違う大耀」に見える可能性がある ②ポスター（keyvisual）→動画の不連続は Q3 監査 #1 のとおり残る（モデル非依存・表示側）

## 7. 判定

- **Gate v2（生成前に固定した閾値）：NO-GO**（W1・W2 とも複数項目 FAIL）
- **identity の実体：Kling Try1 の失敗 4 点（目の退色・紋の崩壊・寄り・腕のポーズ）はすべて解消**。残るのは「照明の乗り」と「Gate の 768 較正」
- 追加生成は行わない（Try3 禁止）。Pilot v2 実装も行わない
- AI 推奨（判断は CEO・相棒）：本記録の sheet を目視し、①黄金色の照明を「God Strike の演出」として許容できるか ②Gate v2 を 768 出力の静止 frame で再基準化（差分をベースライン補正）して再判定する価値があるか、の 2 点を決めてから次の Decision へ。②は機械の再計算だけで課金 0

## 8. Gate v2 Recalibrated（768 baseline 分離・2026-09-29・`GATE_V2R.md`）

- 静止 baseline：Try2 の静止 frame は入力板に対し線画 NCC 0.82〜0.92・輝度 NCC 0.93〜0.97（768 軟化）。この差を baseline として引いた**追加 drift** で判定
- W1（フラッシュ frame 含む）：FAIL 10 項目。W2（フラッシュなし）：**FAIL 4 項目**（face／eyes／visor／cannonBody の線画形状 drop 0.18〜0.23・閾値 0.15）。**PASS 17 項目**（brows／mouth／hood／crest／hand／sack の形状、全ランドマーク位置 ≤4px、目のバイザー越し、silhouette 本体、pan 4px／zoom 3px、非光の新規物体 0、向き）
- FAIL 4 項目の drift は火球の輝度に比例して滑らかに増え、位置ずれ・不連続なし。発生源はバイザー上の映り込み（砲口側がオレンジ→黄）と肌・頭巾の黄金色化（`W2_face_progression.webp`）
- 全 29-frame 窓の走査：全項目 PASS は静止区間のみ。砲撃を含む窓は最少 4 項目が外れる
- 実装修正 2 件（silhouette マスクの stride バグ・線画マスクの局所正規化）は `GATE_V2R.md` §3 に記録。閾値の緩和なし
- **判定：FAIL（W1・W2）。推奨候補は W2。Pilot v2 Human QA は本 Gate では承認されない**。「バイザーの色変化と黄金色の照明で別物に見えるか」は CEO・相棒の目視判断
