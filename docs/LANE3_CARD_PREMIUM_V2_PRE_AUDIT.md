# LANE3 — Card Premium v2 PRE-AUDIT：大耀『豪快な一撃』（card_taiyo_attack_01）

- 日付：2026-09-27（AI 判断・監査／設計のみ。CLAUDE.md §6-2）
- 対象：大耀専用カード『豪快な一撃』1 枚だけ（決定224 READY material の唯一の Pilot カード）
- 基準：Production 同一 worktree `C:/Users/kimi1/SevenGodsGame-d229-rc`（`babe3e5`）。実測は同 worktree の既存 `dist` を `vite preview :4202` で配信（再 build なし・計測後に停止済み）
- 変更：**コード・asset・画像生成 0**。作成物は本書と `scripts/lane3-card-premium/`（計測スクリプト・スクリーンショット・既存原画の切り出しのみ）
- 表記：実測値は【実測】、目視は【目視】、根拠が弱い推定は【推測】

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 一番効いている弱さ | **絵が見えていない**。このカードは効果文＋条件文が全カードで最も長く、文字帯が**カード高さの 29〜30% の位置から始まる**（手札の他カードは 40〜75%）。文字の下は 66%→95% の暗幕。**顔（目の高さ＝原画の 33〜39%）は「大耀専用」と名前の行の真下、主役の小槌（原画の 43〜68%）は完全に暗幕と本文の下**。何も被っていない窓は原画の上 18〜20%（髪の先とエフェクトだけ）【実測】 |
| 2 番目 | **原画そのものに視線の階層がない**。顔の明度 0.40 に対し背景 0.25〜0.29（差 0.10〜0.15）、細部の密度（edge density）は顔 0.116・小槌 0.126・背景 0.10 と**ほぼ同じ**、彩度は全域 0.70 前後で均一。最も明るいのは顔ではなく左上の光の弧。100px 幅で見ると「赤紫の細かいノイズの中に何かいる」になる【実測＋目視】 |
| 3 番目 | **カードの大耀が、舞台の大耀と別人**。原画は茶髪ロング・赤い着物・木槌。舞台の公式 大耀（SGG Creator Kit）は金髪ショート・迷彩キャップ・オレンジのバイザー・ヘッドセット・迷彩パーカー・テック小槌・白い大袋。同じ画面の上下に 2 人の「大耀」が並ぶ【目視】。※決定37 は「神の顔そのものの一致は求めない」と決めており、スタイルガイド §11（公式ポートレートに忠実に）と食い違っている |
| 解像度 | **ボトルネックではない**。配信 512×768 は戦闘表示で 1 device px あたり原画 1.66 px（SP DPR3）／2.29 px（PC DPR2）。ただし原画の**実質の情報量は約 362px 幅**（決定37 の 2×2 シート 1 コマを 1024×1536 に拡大した master。往復 PSNR が 362px まで横ばい）で、デッキ構築（DPR3 で 450〜570 device px）では不足 |
| 付随して見つけた表示の欠陥（コード起因・未修正） | ①このカードだけ**コスト珠が楕円に潰れる**（SP 26×17px・PC 26×20.5px。他カードは 26×26）②SP で**条件文の最終行がカード下端から 9.8px はみ出す**（READY の金の縁の外に「ジ。」が出る）。原因は `.card-view > *:not(.card-view-clip){position:relative}` がコスト珠の `position:absolute` を上書きし、文字量の多いこのカードだけ flex で縮むため |
| ONE RECOMMENDED REDESIGN | **案B「Art Window v2」**：①原画を新規 1 枚（公式 大耀の意匠・小槌を振り抜く瞬間・焦点を上 50% に集めた構図・下 45% は暗く静かな地）②この 1 枚だけ文字帯を下 45% に固定（条件文を 1 行に圧縮・コスト珠の潰れと SP のはみ出しを修正）。**原画だけ（案A）では文字帯に食われ、レイアウトだけ（案C）では原画の階層不足が残る**ため、両方を 1 セットにする |
| 画像仕様（要点） | master **1536×2304 PNG（2:3・単体生成・拡大なし）** → 配信 **640×960 WebP q85・≤160KB**。焦点帯 y 5〜50%・文字帯 y 55〜100%（edge density ≤0.05・平均明度 ≤0.20）・コスト珠域 左上 16%×11%・左右 5% は切れてよい |
| Human QA | Before（Production）／After-1（レイアウトのみ）／After-2（レイアウト＋新原画）の 3 環境、同一 seed、5 問。**After-2 が After-1 に勝つこと＝原画の寄与**を成功条件に含める |
| CEO 判断 | 1 件：**公式 大耀の意匠で『豪快な一撃』v2 原画を 1 枚生成する（決定37 の「顔の一致は求めない」をこの 1 枚で上書き）**。AI 推奨＝承認 |
| NEXT NOW | CEO 判断を待つ間に、コードを触らない範囲で **After-1（原画据え置き・Art Window レイアウトのみ）の実装前 Preflight** を行う（AI 判断で進められる） |

---

## 1. CURRENT ART AUDIT（数値）

### 1-1. ファイル

| 項目 | 値 |
|---|---|
| 登録 | `src/core/data/cardArt.ts:64` `card_taiyo_attack_01 → /assets/cards/card_taiyo_attack_01.webp` |
| 配信ファイル | `public/assets/cards/card_taiyo_attack_01.webp`：**512×768**・WebP（VP8X・ICC あり・alpha チャンネルあり）・**117,682 B（115 KB）** |
| master | `art-source/cards/card_taiyo_attack_01.png`：1024×1536・RGBA 8bit・4,590,526 B（配信対象外） |
| 出自 | 決定37：ChatGPT で 4 枚を 1 シート生成 → 4 分割（**1 コマ 362×543 相当**）→ 1024×1536 に拡大 → Canvas で 512×768・WebP q0.85（`cardArt.ts` 冒頭コメント） |
| 実質解像度【実測】 | master を縮小→1024 に戻した往復 PSNR：724px 29.76dB／512px 29.72dB／**362px 29.23dB**／256px 26.47dB。724→362 の損失は 0.5dB だけで、256 で初めて落ちる＝**中身は約 362px 幅相当**。1024 と 724 の差（高周波）は拡大時のノイズ【推測：着物の細かい斑模様はこの拡大ノイズ】 |
| 描画属性 | `CardView.tsx`：`<img width=512 height=768 loading=lazy decoding=async>`、CSS `object-fit: cover; object-position: center 22%` |

### 1-2. 実表示（`scripts/lane3-card-premium/measure.mjs`・大耀 × 蒼海の龍神・seed `lane3-card-1`）

| viewport | DPR | カード（CSS px） | 絵の窓（clip） | cover 倍率 | 見えている原画 | device px | 原画 px／device px（配信 512） | 同（実質 362） |
|---|---|---|---|---|---|---|---|---|
| 360×780 | 3 | 100×158 | 96×154 | 0.2005 | x 16.6〜495.4・y 0〜768（**93.5%**） | 288×462 | **1.66** | 1.18 |
| 390×844 | 3 | 100×158 | 96×154 | 0.2005 | 同上 | 288×462 | 1.66 | 1.18 |
| 430×932 | 3 | 100×158 | 96×154 | 0.2005 | 同上 | 288×462 | 1.66 | 1.18 |
| 1280×800 | 2 | 116×164 | 112×160 | 0.2188 | x 0〜512・y 8〜739.5（**95.2%**） | 224×320 | **2.29** | 1.62 |
| 1508×660 | 2 | 116×164 | 112×160 | 0.2188 | 同上 | 224×320 | 2.29 | 1.62 |
| 参考：報酬 140px（DPR3） | 3 | 140 幅 | — | — | — | 420 幅 | 1.22 | 0.86 |
| 参考：デッキ構築 150〜190px（DPR3） | 3 | 150〜190 幅 | — | — | — | 450〜570 幅 | 0.90〜1.14 | **0.64〜0.80（不足）** |

→ **戦闘の手札では解像度は足りている**。弱さの原因は解像度ではない。

### 1-3. 文字帯（このカードが最悪値）

| 項目 | SP（360/390/430） | PC（1280/1508） |
|---|---|---|
| 文字帯（`.card-view-body`）の開始＝暗幕の開始 | カード上端から 28px（原画 y **139.6 / 768 = 18.2%**） | 31.5px（原画 y **152 / 768 = 19.8%**） |
| 最初の文字（「大耀専用」）の位置 | カード高さの **29.1%**（原画 y 219） | **30.2%**（原画 y 225） |
| 文字が載る面積（最初の文字〜下端） | **71.4%** | **70.3%** |
| 暗幕の濃さ | 帯の 35% 地点で `#05060d` 66%、下端 95%（`battle.css:2415`） | 同 |
| 同じ手札の他カードの文字開始【実測】 | 一撃 40.4%／後輩想い 55.5%／巫女の舞 59.5%／予言 74.2% | 41.8%／56.3%／59.7%／74.8% |
| 文字サイズ | 名前 11.5px・効果 9px・条件 9px | 名前 11.5px・効果 9.5px・条件 9px |
| はみ出し | **条件文の最終行が 9.8px 下へはみ出す**（`scrollHeight 166 > 154`） | なし（scrollHeight 162 > 160 だが帯は内側） |
| コスト珠 | **26×17px（楕円）** | **26×20.5px（楕円）** |

※文字帯の開始位置は `margin-top:auto` による「文字量で決まる」可変値。決定225 の「面積の約 45% が文字帯」は平均的なカードの値で、**READY の唯一の対象である本カードは 70% を超える**。

### 1-4. 何がどこに描かれ、何が見えているか（原画 512×768 座標・【目視】）

| 要素 | 原画上の位置 | 表示での状態 |
|---|---|---|
| 髪の先・髪飾り・左上の光の弧 | y 0〜200 | **唯一「被りなし」で見える**（ただし y 140 以降は暗幕が始まる） |
| 目・眉 | y 255〜300（33〜39%） | 「大耀専用」の行と名前の行の間。66% 暗幕の手前で見えるが**文字が横切る** |
| 口（叫び） | y 300〜340 | 名前「⚔ 豪快な一撃」の真下 |
| 小槌（「大」紋の木槌＝一撃の主役） | x 15〜225・y 330〜520（43〜68%） | **効果文の下・66〜90% 暗幕**。ほぼ見えない |
| 拳・胴・脚 | y 330〜650 | 効果文・条件文の下 |
| 下部の岩・火の粉 | y 600〜768 | 条件文の下（95% 暗幕） |

証拠：`scripts/lane3-card-premium/out/390x844-card-normal.png`・`1508x660-card-ready.png`・`390x844-hand-ready.png`・`analysis/sim-sp-dpr3-gray.png`

---

## 2. QUALITY GAP（商用カードとの差・効いている順）

比較の物差し（一般的な商用 TCG／デジタル CCG の作法【推測：個別タイトルの数値は未計測】）：①絵の窓はカードの 50〜60% を確保し文字は別の「板」に載る ②焦点（顔か武器）は 1 つで、最も明るく・最も細かく・最も彩度が高い ③背景は焦点より 1〜2 段暗く、細部が少ない ④枠は描かれた素材（金属・石・漆）で、絵の光と枠の光が同じ方向から来る ⑤キャラクターはゲーム内の同一人物と同じ意匠。

| 順位 | 差 | 事実 | 効き方 |
|---|---|---|---|
| 1 | **絵の窓が小さすぎる**（露出） | 被りなしの窓は原画の上 18〜20%。文字が 70% を占め、主役（小槌）は暗幕の下 | 絵をいくら良くしても見えない。READY の縁・面の光が「暗い文字の板」を囲むことになる |
| 2 | **焦点がない**（明暗・細部・彩度の階層） | 顔 − 背景の明度差 0.10〜0.15、edge density 顔 0.116 ≈ 小槌 0.126 ≈ 背景 0.10、彩度は全域 0.70。グレースケールで最も明るいのは左上の弧【実測】 | 100px 幅では「細かいノイズ」になる。比較：同じ攻撃の『一撃』全体 0.048・『剛撃』0.078、本カード全体 **0.098**（手札で最も騒がしい部類） |
| 3 | **キャラクターが公式 大耀と別人** | 舞台の神と手札の神が別デザイン | 「神と一緒に戦う」実感・IP の一貫性を削る。商用カードでは最も目立つ不一致 |
| 4 | **色の設計が型から外れている** | 攻撃＝赤のはずが橙＋**紫**（紫は妨害タイプの色）。大耀の神色は金 `#e8b33d` だが絵の金は小槌の縁だけ | タイプ色・神色・READY の金が絵の中で繋がらない |
| 5 | **素材の描き分けがない** | 木槌・着物・肌・岩が同じ斑テクスチャ（拡大ノイズ【推測】） | 「物」としての重さ・光沢がない。READY の「物になる」演出と絵の質感が噛み合わない |
| 6 | **奥行きの層がない** | 前景・中景・背景が同じ密度・同じピント | 平面的。カードの lift（3px）や接地影の立体感と矛盾 |
| 7 | **枠が CSS の線**（決定225 B で既知） | `border:2px`＋角丸＋box-shadow。READY 時だけ神色の縁・面取り | 本監査の範囲外（原画の問題ではない）。ただし 1 が直ると枠の弱さが次に目立つ【推測】 |
| 8 | **表示の欠陥**（1-3） | コスト珠の楕円化・SP で条件文がはみ出す | Premium の唯一のカードだけが「崩れて」見える。小さいが目に入る |

※解像度（1-2）は戦闘表示では差の原因ではない。「高解像度にすれば良くなる」ではない。

---

## 3. ART DIRECTION（案B 前提：絵の窓＝上 50%・文字帯＝下 45%）

| 観点 | 指示 | 理由・現状との差 |
|---|---|---|
| 人物・意匠 | **公式 大耀（SGG Creator Kit `taiyo-kozuchi:GOD_FRONT`/`GOD_MAIN`）**：迷彩キャップ（金の宝珠紋）・オレンジのバイザー・ヘッドセット・迷彩のノースリーブパーカー＋オレンジの発光ライン・指ぬきグローブ・金の腕輪・金と黒のテック小槌（打撃面が赤熱）。2.0〜2.3 頭身（スタイルガイド §1） | 舞台の神と同一人物にする（Gap 3）。※CEO 判断（§7） |
| ポーズ | 小槌を肩の上から**斜め手前へ振り抜く瞬間**（インパクトの 1 フレーム前）。体は 3/4 で右向き、踏み込みの足は下の文字帯へ流れて消えてよい | 「豪快な一撃」＝振り抜き。現状は小槌を体の横に構え、動きの頂点がない |
| 表情・視線 | 叫びではなく**不敵な笑み**（姉御肌・「玉砕上等」）。視線は打撃点（画面の右下手前） | 視線が打撃点へ向くと、見る人の目も顔→小槌へ流れる |
| 構図 | 左上→中央の対角線。**小槌の打撃面と顔を 1 つの塊**（焦点帯内・互いに原画幅 25% 以内）に置く。頭は原画幅の **34〜40%** | 焦点を 1 か所に集めると 100px 幅でも読める。現状の顔幅は約 25%【目視】 |
| 光源 | 主光：左上の暖かい白（神の立ち絵・舞台と同じ向き・スタイルガイド §4）。副光：小槌の赤熱が頬・グローブに落とす橙のリムライト。**光源は 2 つまで** | READY の面の光（135° 左上→右下）・点火の帯（115°）と方向を揃える |
| 素材 | 小槌＝金属（硬いハイライト＋映り込み）、布＝マット（影 1 段）、肌＝柔らかい影。**素材ごとに反射の強さを変える** | 現状はすべて同じ斑テクスチャ（Gap 5） |
| 奥行き | 3 層：前景（打撃面から飛ぶ火花・わずかなブレ）／中景（人物・最も鮮明）／背景（攻撃の赤の放射と青海波 15〜30%、ぼかし） | 現状は全層同じピント（Gap 6） |
| 色の階層 | 背景＝攻撃の赤（`#e5484d`）→暗い臙脂（`#3a0f12`＝カード地 `TYPE_STYLE.attack.dark`）。人物＝オリーブ迷彩＋オレンジ。**焦点＝金〜白**（大耀の神色 `#e8b33d`）。**紫は使わない** | タイプ色・神色・READY の金が 1 本の線で繋がる（Gap 4） |
| 焦点の数値目標 | 焦点域の平均明度 − 背景の平均明度 **≥ 0.20**、焦点域の edge density ≥ 0.10 かつ背景 ≤ 0.06、画面で最も明るい 5% の画素の **半分以上が焦点帯（顔＋打撃面）** | 現状 0.10〜0.15・背景 0.10（Gap 2）。`analyze.mjs` で測れる |
| エフェクト密度 | 衝撃の弧 1 種＋火の粉 1 種。画面の **≤40%**、顔の輪郭を横切らない | 現状は弧・岩・火の粉・紫の破片で 4 種・ほぼ全面 |
| 下 45%（文字帯） | 人物の脚・袋・火の粉が**暗い臙脂の地へ溶けて消える**。平均明度 ≤0.20・edge density ≤0.05。顔・手・小槌を置かない | 文字を暗幕なしで読める地にする。暗幕は薄くでき、絵が「板に隠される」感じが減る |
| 枠との関係 | 外周 3% は中〜暗の地（赤い枠線・金の READY 縁との明暗差を確保）。枠に接する位置に高輝度を置かない | 枠と絵が喧嘩しない |
| READY 時 | 通常時は金の焦点が「静かに光る」。READY で神色の縁（金）＋上辺 7px の光＋面の光が乗ると、**絵の金（小槌）と縁の金が同じ素材に見える**。点火の帯（左→右・115°）は小槌の振り抜き方向と揃う【推測：帯の通過が「振り抜き」の予告に見える】 | 決定224 の重ね層は変更しない（縁と面の光だけ・中央透明） |
| ⚡PAYOFF への接続 | カードの金の打撃面 → cast の金の輪 → 着弾の金リング → 34px 金の⚡数字。**カードから着弾まで同じ金** | 決定224 の階層（Normal < READY < ⚡PAYOFF < 共鳴 < 神の一撃）を崩さない。絵の中に⚡の文字・数字を描かない |
| 禁止 | 文字・ロゴ・カード枠を絵に描かない／写実・劇画調／流血／情景（鳥居・山など・スタイルガイド §5）／黒帯・余白（§14） | 既存ルール |

---

## 4. IMAGE SPEC

| 項目 | 仕様 | 根拠 |
|---|---|---|
| 生成方法 | **1 枚ずつ単体生成**（2×2 シートから切り出さない）。拡大（upscale）で解像度を作らない | 現行の実質 362px 幅・拡大ノイズの再発防止 |
| master | **1536×2304 PNG・RGB 8bit・sRGB・alpha なし**（2:3） | デッキ構築 DPR3 の最大 570 device px に対し 2.7 倍の余裕。再書き出しの原本 |
| 配信 | **640×960 WebP・quality 85（sharp `lanczos3`・effort 6）・alpha なし・≤160 KB** | 戦闘：SP DPR3 で 2.08／PC DPR2 で 2.86 原画 px/device px。デッキ構築 DPR3 570px を 1.12 でカバー。512 だとデッキ構築で 0.90。デコード後メモリ 2.46MB（1 枚だけ・デッキ構築 32 枚同時でも +0.9MB） |
| アスペクト | **2:3 を厳守**（`<img width=512 height=768>` の比率・`object-fit: cover` と一致。比率が同じなのでコード変更なしで 640×960 を置ける） | 既存 512×768 と互換 |
| 安全領域（案B レイアウト・原画に対する %） | ①**焦点帯**：x 12〜88%・y 5〜50%（顔の中心 ≈ x 50〜58%・y 22〜30%、打撃面は y 25〜50%）②**遷移帯**：y 50〜55%（人物の胴が暗くなり始める）③**文字帯**：y 55〜100%（平均明度 ≤0.20・edge density ≤0.05・顔／手／小槌なし）④**コスト珠域**：左上 x 0〜16%・y 0〜11%（重要物なし・中〜暗）⑤**READY 縁**：外周 3%、上辺 5%（上の 7px の光が乗る）に高輝度・重要物なし ⑥**cover の切れ**：左右各 5%（SP で 3.2% 切れる）・上 1%／下 4%（PC）は失ってよい | 1-2・1-3 の実測（SP 96×154 窓・PC 112×160 窓・object-position center 22%）と決定224 の重ね層の寸法 |
| 案A（現行レイアウトのまま）を選ぶ場合の安全領域 | 焦点帯 y 3〜27%（文字が 29% から始まるため）。顔幅は原画の 20% 前後に縮む | 参考のみ・非推奨（§5） |
| ファイル名・配置 | 配信：`public/assets/cards/card_taiyo_attack_01_v2.webp`／master：`art-source/cards/card_taiyo_attack_01_v2.png`／provenance（生成日・サービス・プロンプト・参照画像の assetId と sha256・`SGG-FAN-CREATION-GUIDELINES-1.0.0`）を `art-source/README.md` に 1 行 | 旧ファイルを残す（ロールバック）。`public/` はハッシュなしで配信されるため、同名上書きは CDN・ブラウザのキャッシュで旧絵が混ざる |
| 差し替え方法 | **新ファイル＋`cardArt.ts` の 1 行（`card_taiyo_attack_01` の参照先）を `_v2.webp` に変更**。表示ロジックの変更は不要 | 1 行のデータ表変更。同名上書きならコード 0 だがキャッシュ混在と Before/After の同時比較ができない |
| 案B のレイアウト（別途コード変更が必要） | この 1 枚だけ（`READY_MATERIAL_PILOT` と同じ「ID → 見た目」の許可リスト）：文字帯を下 45% に固定・条件文を 1 行（例「⚡共鳴4+ 敵に40」）・「大耀専用」を枠側の小さな札へ・コスト珠を `position:absolute` に戻す（潰れ解消）・SP のはみ出し 0 | 実装は別 Preflight（`CardView.tsx`／`battle.css`／表示文言の整形関数）。`src/core`・カード効果・数値は不変 |
| 書き出し前チェック（機械） | 四辺 8 点に黒帯・余白なし（スタイルガイド §14）／焦点・文字帯の数値目標（§3）を `scripts/lane3-card-premium/analyze.mjs` の領域統計で確認／配信 ≤160 KB／2:3 比率 ±0 | 既存手順＋本監査の指標 |

---

## 5. 候補比較と ONE RECOMMENDED REDESIGN

| 案 | 内容 | 効果（予測） | コスト・リスク | 判定 |
|---|---|---|---|---|
| **A. 原画だけ差し替え** | 現行レイアウトのまま、焦点を上 27% に押し込んだ新原画 | 小〜中。顔は原画幅の約 20%（SP で約 20 CSS px）にしかできず、小槌を窓に入れると人物が小さくなる。文字 70% は不変 | コード 0（同名上書き時）。生成 1 枚。**コスト珠の潰れ・はみ出しは残る** | 却下：絵の品質を上げても露出が 20% のまま |
| **B. Art Window v2（原画＋この 1 枚のレイアウト）** | §3 の新原画＋文字帯を下 45% に固定・条件 1 行化・コスト珠修正 | **大**。被りなしの窓 18〜20% → 約 50%（2.5 倍）。顔と小槌が窓の中。READY の縁が「絵」を囲む | 生成 1 枚＋表示コード変更（許可リスト方式・`src/core` 0）。手札で 1 枚だけ別レイアウト（決定224 と同じ Pilot の 2 言語）。文字の読みやすさの再確認が必要 | **推奨** |
| C. レイアウトだけ（原画据え置き） | B のレイアウトのみ | 中。顔は見えるが、原画の階層不足（Gap 2）・別人（Gap 3）・紫（Gap 4）は残り、「騒がしい絵が大きく見える」だけになる恐れ【推測】 | 生成 0。表示コード変更のみ | 単独では不採用。**B の途中段階（After-1）として QA の対照に使う** |
| （参考）D. 公式 GOD_FRONT 立ち絵をカードに使う | Kit の 1600px 立ち絵を切り抜いて背景と合成 | 意匠は完全一致・高解像度 | 座りポーズで「一撃」の動きがない・他カードの chibi セル塗りの型と画風が違う（スタイルガイド §11 の型） | 却下（参照画像として使う） |

**ONE RECOMMENDED REDESIGN：案B「Art Window v2」**
- 理由：Gap 1（露出）と Gap 2〜5（原画）は**片方だけ直すと、もう片方が残って効果が出ない**構造。B は両方を 1 枚で閉じ、しかも After-1（C）を中間に挟むことで「原画を作り直した価値」を Human QA で切り分けられる（P3 One Change は「1 枚・1 テーマ（Card Premium）」で守る）。
- 範囲：『豪快な一撃』1 枚だけ（決定224・決定229 の Narrow Pilot 方針を維持）。他の大耀カード 3 枚・共通カードの横展開はしない。
- P1 Gate：「解く」を強くするか → READY（条件成立）を**絵そのもので**見つけやすくし、⚡PAYOFF までの「答えが決まった」瞬間を太くする。情報（効果・条件）は減らさない（P2）。

---

## 6. BEFORE/AFTER HUMAN QA PLAN

| 項目 | 内容 |
|---|---|
| 環境 | Before＝Production 同一（`d229-rc` の dist）／After-1＝レイアウトのみ（原画据え置き）／After-2＝レイアウト＋新原画。ローカル 3 ポート並行（例 `:4202`／`:4203`／`:4204`）。実機 SP（390 前後）＋PC 1508×660。大耀 × 蒼海の龍神、seed `lane3-card-1`（初手に豪快な一撃が来ることを確認済み）。READY は共鳴 4 到達（決定218 の手順）で実際に点火させる |
| 手順 | Before → After-1 → After-2 の順に、手札を見る（3 秒）→ 共鳴 4 まで進める → 豪快な一撃を撃つ（⚡PAYOFF）。説明はしない |
| 問い 1 | 手札を見た瞬間、『豪快な一撃』が**誰が・何で・どう殴るカードか**、絵だけで分かりましたか？ |
| 問い 2 | 手札 5 枚の中で、この 1 枚が**一番「使いたい」カード**に見えましたか？ |
| 問い 3 | 舞台で戦っている大耀と、カードの大耀は**同じキャラクター**に見えましたか？ |
| 問い 4 | READY になったとき、絵と金の縁と光が**1 つの「物」として点いた**ように感じ、⚡の金の数字までつながって見えましたか？ |
| 問い 5 | 効果文と条件文は、Before と比べて**読みにくくなっていませんか**？ |
| 成功条件 | After-2 で Q1・Q2・Q3・Q4 が YES、Q5 が「悪化なし」。**かつ Q1 または Q2 で After-2 が After-1 より明確に上**（原画の寄与）。どれか 1 つでも After-2 が Before に負けたら NO-GO |
| 機械ゲート（QA 前） | 焦点帯と文字の重なり 0／SP 360・390・430 のはみ出し 0px／コスト珠 26×26／焦点 − 背景の明度差 ≥0.20／文字帯 edge density ≤0.05／配信 ≤160KB／READY の重ね層・点火・⚡PAYOFF（34px 金・金リング）が決定224 の実測値と同じ／console error 0／他カードの表示差分 0 |

---

## 7. CEO 判断が必要な事項

```
【CEO DECISION REQUIRED】
Issue：大耀『豪快な一撃』の原画を 1 枚、公式 大耀（SGG Creator Kit の意匠）で新規生成してよいか。
       あわせて、決定37「神専用カードは神の顔そのものの一致は求めない」を、この 1 枚については上書きする。
AI Recommendation：承認。§3 ART DIRECTION・§4 IMAGE SPEC どおり、公式 GOD_FRONT/GOD_MAIN を参照画像にして
       1 枚だけ単体生成する（生成作業は従来どおり CEO が画像生成サービスで行い、AI は依頼書・書き出し・計測を担当）。
Reason：弱さの 3 番目「舞台の神とカードの神が別人」は、原画を作り直さない限り直らない。READY 唯一のカードで
       最も目に入る。SGG 二次創作ガイドライン v1.0.0 §2 は公式素材の生成 AI への入力・参照画像としての使用・商用を許可している
       （ただし §2「生成物と公開方法の責任は制作者」・利用する生成サービスの規約の確認は制作者側）。
Alternatives：①現行の意匠のまま構図だけ直す（別人問題が残る）②公式立ち絵をそのまま使う（動きがなく画風の型から外れる）
       ③大耀の 4 枚すべてを作り直す（Narrow Pilot の範囲を超える・QA 前に投資が大きい）。
Risk：大耀のカード 4 枚のうち 1 枚だけ公式意匠になり、残り 3 枚（茶髪・着物）と不揃いになる（Pilot 期間中）。
       生成のばらつきで §4 の数値目標に届かず、再生成が数回必要になる可能性。ライセンス面の結論は AI では出さない。
Impact if delayed：After-1（レイアウトのみ）の Preflight・実装・計測は先に進められるが、Card Premium v2 の本題
       （原画の品質）の Human QA ができない。
CEO Action：承認 / 拒否
```

補足（AI では結論を出さない論点・整理のみ）：生成サービスの利用規約上の商用利用可否／生成物の権利帰属／Kit 素材を参照に使った事実の記録（P15 の素材台帳：Source・Creator・Terms・Evidence）。

---

## 8. Risks／触れないもの

**Risks**
1. 手札で 1 枚だけレイアウトが違う（決定225 が指摘した「2 言語」を一時的に強める）。Pilot で効果を確かめてから横展開を判断する
2. 条件文を 1 行に圧縮すると、条件の読み違えが起きうる（Q5 と機械ゲートで確認。成立時の金文字表示は維持）
3. 大耀カード 4 枚の意匠の不一致（§7 Risk）
4. 生成のばらつき（焦点・文字帯の数値目標を満たすまで再生成）
5. 640×960 のデコードメモリ（1 枚 +0.9MB。影響は小さい）
6. 同名上書きをした場合の CDN キャッシュ混在（新ファイル名で回避）
7. SP で READY のカードが手札の横スクロール外に出る可能性（決定224 既知・不変）
8. 本監査の「商用カードの作法」は一般論で、個別タイトルの実測はしていない【推測】

**触れないもの**：`src/core`（カード効果 14/2・bonus 4・数値・`text`）・balance・save・gameVersion・READY の点火条件と重ね層・⚡PAYOFF（34px・金リング・hit stop 50ms・音）・共鳴・神の一撃・他 3 枚の大耀カードと全共通カード・デッキ構築／報酬画面のレイアウト・`battle.css` の他の規則・決定213／229 の舞台。本監査では**コード・asset・`docs/DECISIONS.md` の変更なし、画像生成なし**。

**別件として記録（本監査では直さない）**：コスト珠の潰れ（`.card-view > *:not(.card-view-clip)` の `position:relative` が `.card-view-cost` の `absolute` を上書き。文字量の多いカードで flex に縮められる）と SP の条件文はみ出し 9.8px。どちらも Production で発生中。案B に含めて直すのが最小（単独 Hotfix にする場合は 1 規則の CSS）。

---

## 9. NEXT NOW（1 つ）

**CEO 判断（§7）を待つ間に、After-1「原画据え置き・Art Window レイアウトのみ（この 1 枚・許可リスト方式）」の実装前 Preflight を行う**（対象ファイル・文字の収まり計算・コスト珠の修正方法・決定224 の重ね層との重なり・SP 3 幅のはみ出し 0 を、コードを変えずに確認する。AI 判断の範囲）。

---

## 付録：証拠ファイル

- 計測：`scripts/lane3-card-premium/measure.mjs`（実表示）・`probe.mjs`（手札全カードの文字開始・コスト珠）・`analyze.mjs`（原画の領域統計・表示サイズ相当の縮小／グレースケール）・`res-probe.mjs`（master の実質解像度）
- 出力：`scripts/lane3-card-premium/out/measure.json`・`out/*-card-normal.png`・`*-card-ready.png`（DOM に class を付けた**擬似 READY**・見た目確認用）・`*-hand-ready.png`・`*-full.png`・`out/analysis/analysis.json`・`sim-sp-dpr3*.png`・`region-*.png`
- 領域統計（原画 512×768）：顔 明度 0.401・edge 0.116／小槌 0.359・0.126／背景左上 0.294・0.067／背景下 0.274・0.086／背景右 0.251・0.101／全体 0.303・0.098・彩度 0.696。比較（全体 edge）：一撃 0.048・剛撃 0.078・後輩想い 0.082・神楽舞（card_common_resonance_02）0.100

---

## 10. STEP A／A'／B 準備（2026-09-27 追記・CEO 承認「Art Window v2＋新原画」を受けて）

- 基準：Production 同一 build `C:/Users/kimi1/SevenGodsGame-d230-rc`（**45bfc9e**・決定230 RC）の既存 `dist` を `vite preview :4202` で配信（再 build なし）。候補は **Playwright の `page.addStyleTag`＋DOM の一時変更だけ**で試作・計測した
- patch の検証は、45bfc9e を `git archive` で **scratchpad に展開したコピー**（プロジェクト外・node_modules は junction）で行った：`tsc` 0 error・`oxlint` 0・`vitest` **1172 passed**・`vite build` 成功・その build（`:4203`）を注入なしで実測
- **runtime ファイルの変更 0**（`src/`・`public/`・package・test・`docs/DECISIONS.md`・Lane 2 のファイルに触れていない）・**画像生成 0**・サーバー 2 つとも停止済み
- 作成物：`scripts/lane3-card-premium/`（`proto-lib.mjs`・`proto-after1.mjs`・`defects-sweep.mjs`・`verify-impl.mjs`・`accept-art.mjs`・`css/`・`patches/`・`out/after1`・`out/defects`・`out/impl`・`out/accept`）、`docs/LANE3_IMAGE_BRIEF_GOUKAI_NO_ICHIGEKI.md`

### 10-1. STEP A'：Production の表示欠陥 2 件（先に直す）

**根本原因（1 つ）**：`src/components/battle/battle.css:2455-2458` の `.card-view > *:not(.card-view-clip) { position: relative; z-index: 1; }`（詳細度 0,2,0）が、`battle.css:2484-2500` の `.card-view-cost { position: absolute; top: -10px; left: -10px; … }`（0,1,0）の `position` を上書きしている。コスト珠は **relative＝flex（縦並び）の流れの中の 1 項目**になり、
- ①カードの高さが固定（`battle.css:5216-5222` の `body.battle-viewport .card-view { height: 164px }`、SP は `battle.css:5497-5500` の `height: 158px`）なので、中身が入りきらないカードでは **flex-shrink で珠が縦に潰れる**（26×17・26×20.5・26×23.2）
- ②珠の 26px＋gap 4px が流れの中に場所を取るため、**本文（`.card-view-body`・`margin-top:auto`＝`battle.css:2415-2424`／`5248-5251`）が下へ押し出され、カード下端からはみ出す**
- 見た目の位置（カード外形の左上から -1px）は、relative の「元の位置（padding 7px＋border 2px）−10px」でたまたま作られていた

**影響範囲（実測・`defects-sweep.mjs`・6 seed×5 画面×手札全カード＝150 件・13 種）**：このカードだけではなかった。

| 画面 | 珠が潰れるカード | 文字がカード下端からはみ出すカード |
|---|---|---|
| SP 360／390／430（カード 158px） | 豪快な一撃 26×17・**姉御の号令 26×17**・受け流し／神楽舞／速攻／呪縛 26×23.2 | **姉御の号令 15.1px**・豪快な一撃 3.8px（文字の最終行。本文の箱は 9.8px） |
| SP 390×700（カード 140px） | 手札のほぼ全カード 26×17 | 姉御の号令 33.1px・豪快な一撃 21.8px・受け流し／神楽舞／速攻／呪縛 3.8px |
| PC 1508×660／1280×800（164px） | 姉御の号令 26×17・豪快な一撃 26×20.5 | なし（姉御の号令は −0.2px で縁ぎりぎり） |

※§1-3 の「9.8px」は本文の箱の値で、**文字そのものは 3.8px はみ出す**（READY の金の縁の外に「ジ。」の下半分）。

**最小修正（CSS 1 規則・2 セレクタ）**：`scripts/lane3-card-premium/patches/card-defects-minfix.patch`（`battle.css` の `.card-view-cost` ブロックの直後に追加）

```css
.card-view > .card-view-cost { position: absolute; top: -2px; left: -2px; }
body.battle-viewport .card-view > .card-view-cost { top: -3px; left: -3px; }
```

（詳細度 0,2,0 を後ろに置いて absolute に戻す。top/left は従来の見た目の位置＝外形から -1px に合わせた値）

**検証（CSS 注入・同じ 150 件）**：
- 珠：**全件 26×26・位置 (-1,-1) で従来と同じ**
- はみ出し：**SP 360／390／430・PC で 0 件**（姉御の号令 15.1→−5.9px・豪快な一撃 3.8→−8px）
- 他のカード：はみ出していなかったカードは**文字の位置が 1 件も動かない**（位置が変わるのは、今まではみ出していた／押されていたカードだけ＝正しい位置に戻る）
- 残り：**390×700 のような低い SP（カード 140px）では、姉御の号令 12.1px・豪快な一撃 0.8px がまだはみ出す**（文字量がカードの高さを超えるため。珠の修正の範囲外。豪快な一撃は After-1 で 0 になる。姉御の号令は別件の文字量／高さの判断）
- console error 0
- 別件メモ（未検証・修正対象外）：`setup.css:763` の `.deck-builder-card > *:not(.deck-builder-card-clip)` も同じ形で `.deck-builder-card-cost`（`setup.css:768`）の absolute を上書きしている。デッキ構築はカードの高さが固定でない（min-height）ため潰れは起きにくいが、珠の位置が設計と違う可能性がある

**推奨（AI 判断）**：**Pilot の前に、独立した Narrow Hotfix の Decision（決定231 候補「コスト珠の潰れ・SP の文字はみ出し修正」・CSS のみ）として先に出す**。理由：①Production で今起きている欠陥で、Pilot 対象外の『姉御の号令』（大耀の推奨デッキ）の方がひどい（15px） ②Pilot に混ぜると、Human QA の Before／After の差が「珠と文字の修正」なのか「Art Window」なのか分けられない ③CSS 1 規則・他カードの位置不変が実測で確認済みで、リスクが小さい。**Pilot の Before は「Production＋A'」にする**。

### 10-2. STEP A：After-1「Art Window v2」（原画据え置き・レイアウトのみ）最終仕様

| 項目 | 仕様 |
|---|---|
| 対象 | 大耀『豪快な一撃』1 枚だけ。**表示専用の許可リスト** `src/components/battle/artWindow.ts` の `ART_WINDOW_V2: Map<CardDefId, { bonusShortJa }>`（`cardArt.ts`・`READY_MATERIAL_PILOT` と同じ「ID → 見た目」のデータ表。カード名の分岐なし・効果／条件の分岐なし＝不変ルール3の対象外）。原画のないカードには効かない |
| 文字帯 | `position:absolute; bottom:0; min-height: calc(45% + 10px)`＝**カードの下 45% に固定**（上 10px は暗幕の入り）。中身が 45% に入らない低い画面では**帯が上へ伸び、下端からは絶対にはみ出さない** |
| 「大耀専用」 | 本文から出して**右上の小さな札**（8px・暗い半透明の地・金の細枠） |
| 条件行 | **1 行**：`⚡／＋ 共鳴4以上:敵に40`（短文は `ART_WINDOW_V2` のデータ。**数値が `bonus.textJa` と一致することを test で検査**）。行の幅だけ左右 3px 広げる。折り返しは禁止しない（端末のフォント差で入らない時は 2 行になり帯が上へ伸びる＝文字が切れない）。元の全文は `title` に残す |
| 短文の候補比較（nowrap で幅を実測） | 「共鳴4以上で敵に40」SP で 3px 溢れ／「共鳴4以上なら敵に40」9〜12px 溢れ／**「共鳴4以上:敵に40」全画面 0**／「共鳴4+で敵に40」0 だが「4+」は読み違えの恐れ（§8 Risk 2）→ **「以上」を残せる最短の形を採用** |
| コスト珠 | A' と同じ（26×26・円）。After-1 単体でも本文が absolute になるので、このカードの珠は潰れない |
| READY | 決定224 の重ね層（`.card-view-ready-frame`・z-index 0・inset -2px）・点火の帯・⚡の金文字は**変更なし**。文字帯（z-index 1）は重ね層の上 |
| 名前・効果文 | 名前 line-height 1.15、効果文 line-height 1.2（3 行）、行間 gap 2px |
| CSS | 新ファイル `src/components/battle/artWindow.css`（`CardView.tsx` から import）。セレクタ `.card-view.card-view-artwin.card-view-has-art > …`（詳細度 0,4,0）で battle.css の `body.battle-viewport .card-view-has-art .card-view-body`（0,3,1）に**読み込み順に依存せず**勝つ＝**battle.css を触らない** |
| デッキ構築・報酬 | **`CardView` は戦闘の手札だけで使われている**（`RewardOverlay.tsx`／`DeckBuilderScreen.tsx` は独自のマークアップ `.reward-card`／`.deck-builder-card`）。After-1 はこの 2 画面に影響しない（差分 0）。After-2 の原画差し替えは 2 画面にも出る（切れ方は Image Brief §3） |

**実測（Production 同一 build に注入 → 同じ patch を当てた build で注入なしの再実測。両者の差 0）**

| 画面（カード） | 文字の開始（カード高さ比） | 暗幕の開始 | 絵の窓（文字より上／clip 比） | 文字のはみ出し | 条件行 | コスト珠 | READY の縁 |
|---|---|---|---|---|---|---|---|
| SP 360／390／430（100×158） | **29.1% → 54.9%** | 19.0% → 48.6% | **28.6% → 55.0%** | +3.8px → **−7.4px（0）** | 3 行 → **1 行** | 26×17 → **26×26** | 外形と一致（dx/dy/dw/dh 0）・opacity 1 |
| PC 1280×800／1508×660（116×164） | **30.2% → 54.9%** | 20.4% → 48.8% | 29.0% → 55.0% | −8px → −8.4px（0） | 2 行 → **1 行** | 26×20.5 → **26×26** | 同上 |
| 低い SP 390×700（100×140） | 32.9% → 50.1%（帯が上へ伸びる） | — | — | +21.8px → **−6px（0）** | 1 行 | 26×26 | 同上 |
| 低い PC 1280×620（116×150） | 30.7% → 52.2% | — | — | +2.5px → −6px（0） | 1 行 | 26×26 | 同上 |

- 原画上で文字が始まる位置：SP **55.0%**／PC **53.4%**／低い SP 48.5%（→ Image Brief の文字帯 55〜100%・遷移帯 47〜55%・焦点帯 5〜47% はこの実測から決めた）
- **本物の READY も確認**：patch 済み build で自動プレイ（豪快な一撃以外を出してラウンドを進める）→ **R3 に共鳴 4 以上で点火**（SP 390・PC 1508）。金の縁 `#e8b33d`（大耀の神色）・条件行 `⚡ 共鳴4以上:敵に40` 1 行・はみ出し 0・console error 0（`out/impl/*-impl-real-ready*.png`。暗く見えるのはそのラウンドの AP を使い切って `affordable=false`＝既存の opacity 0.45）
- 他のカード：手札の他 4 枚は Before と同一（位置・珠）
- スクリーンショット：`out/after1/<画面>-compare.png`（左から Before｜A'｜After-1｜After-1 READY）、`<画面>-6-after1-hand-ready.png`（手札の並び）、`out/impl/`（patch 済み build の実画面）

**patch**：`scripts/lane3-card-premium/patches/after1-art-window.patch`（45bfc9e に `git apply --check` で適用可を確認・適用はしていない）

| ファイル | 変更 |
|---|---|
| `src/components/battle/artWindow.ts`（新規） | 許可リスト `ART_WINDOW_V2`・`getArtWindow` |
| `src/components/battle/artWindow.css`（新規） | 上表の CSS |
| `src/components/battle/artWindow.test.ts`（新規） | 対象 1 枚・原画と bonus を持つ・**短文の数値＝`bonus.textJa` の数値**・閾値＝`RULES.cardBonus.chargedThreshold`・13 文字以内 |
| `src/components/battle/CardView.tsx` | `card-view-artwin` の付与・「専用」札を本文の外へ・条件行を短文に（`title` に全文） |
| `src/components/cardBonusText.ts`（＋`.test.ts`） | 先頭記号を付ける `formatBonusLine` を切り出し（`formatCardBonus` の出力は不変） |

**battle.css・`src/core`・カード効果・数値・save・gameVersion は触らない。**

### 10-3. STEP B：新原画の Image Brief

`docs/LANE3_IMAGE_BRIEF_GOUKAI_NO_ICHIGEKI.md`（ChatGPT 等にそのまま貼れる日本語／英語プロンプト・negative・参照画像・権利・書き出し・受け入れチェック）。要点：
- master **1536×2304 PNG 推奨／ネイティブ 1024×1536 を最低ライン**（多くのサービスの上限。**拡大で作るのは禁止**）→ 配信 **640×960 WebP q85・≤160KB**・`public/assets/cards/card_taiyo_attack_01_v2.webp`・`cardArt.ts:64` の 1 行だけ変更（After-2）
- 領域：焦点帯 x12〜88%・**y5〜47%**／遷移帯 y47〜55%／**文字帯 y55〜100%＝平均明度 ≤0.20・edge ≤0.05**／コスト珠域 **x0〜26%・y0〜15%**／専用札域 x52〜97%・y0〜11%／READY 縁 外周 3%（上 5%）
- **訂正**：§4 の「コスト珠域 左上 16%×11%」は、潰れた珠（26×17）で測った値だった。修正後の円い珠では **26%×15%** が正しい
- identity 13 項目（公式 `main.webp` 等を目視：金髪ショート・迷彩キャスケット＋ベージュの宝袋・オレンジのバイザー＋HUD・白い耳当て＋緑 LED＋黒マイク・金フープ・ノースリーブ迷彩ベスト＋オレンジの回路・金の腕輪・黒の指ぬきグローブ・シャンパンゴールドの円筒テック小槌＋同心円の赤熱打撃面＋金の冠＋黒い柄と金の柄尻）
- 機械検査 `scripts/lane3-card-premium/accept-art.mjs`（MUST 16・TARGET 4）。**校正：現行原画は MUST FAIL 12／TARGET FAIL 4＝不合格**（監査で見つけた弱さと一致）
- 生成は CEO（外部）。**有料サービス・新規課金が必要なら事前に CEO 承認**

### 10-4. Human QA 計画（改訂）

| 項目 | 内容 |
|---|---|
| 環境（3） | **Before**＝Production＋A'（A' を先に Hotfix で出していれば Production そのもの）／**After-1**＝Before＋`after1-art-window.patch`（原画据え置き）／**After-2**＝After-1＋新原画（`cardArt.ts` 1 行＋`_v2.webp`）。ローカル 3 ポート並行 `:4202`／`:4203`／`:4204`（それぞれ別 build） |
| 条件 | 大耀 × 蒼海の龍神 × ふつう、seed **`lane3-card-1`**（初手に豪快な一撃）。**実機 SP（390 前後）と PC 1508×660**、可能なら SP 360 も。READY は自分で共鳴 4 まで進めて点火させる（自動プレイでは R3 に点火）。**説明・誘導はしない** |
| 手順 | 各環境で：①手札を 3 秒見る ②共鳴 4 まで進める ③豪快な一撃を撃つ（⚡PAYOFF）。順番は Before → After-1 → After-2 |
| Q1 | 手札を見た瞬間、『豪快な一撃』が**誰が・何で・どう殴るカード**か、絵だけで分かったか |
| Q2 | 手札の中でこの 1 枚が**一番「使いたい」**カードに見えたか |
| Q3 | 舞台の大耀とカードの大耀は**同じキャラクター**に見えたか（After-1 は NO が期待値＝対照） |
| Q4 | READY で絵・金の縁・光が**1 つの物として点き**、⚡の金の数字までつながって見えたか |
| Q5 | 効果文と条件行（`共鳴4以上:敵に40`）は、Before より**読みにくくないか・条件を読み違えないか** |
| Q6（新） | 手札で**この 1 枚だけ形が違う**ことが、気になったか（違和感）／特別に見えたか |
| 成功条件 | **After-1**：Q1 が Before より良い、Q5 悪化なし、Q6 が「違和感」でない（→ レイアウトの価値）。**After-2**：Q1〜Q4 すべて YES、Q5 悪化なし、**かつ Q1 または Q2 で After-1 より明確に上**（→ 原画の価値）。After-2 が Before にどれか 1 問でも負けたら NO-GO |
| 機械ゲート（QA 前） | SP 360／390／430＋PC 2 画面＋低い画面 2 つで：文字のはみ出し 0・条件行 1 行・珠 26×26・READY の縁が外形と一致・文字開始 ≥54%（標準の高さ）・他カードの位置差 0・console error 0（`verify-impl.mjs` を再実行）。After-2 は `accept-art.mjs` 合格も条件 |

### 10-5. Lane 2 との実装順（同じ runtime ファイルを同時に触らない）

| 順 | 内容 | 触る runtime ファイル | Lane 2 との関係 |
|---|---|---|---|
| 0 | Lane 2 の実装・リリースを先に終える | Lane 2：`battle.css`・`BattleScreen.tsx`・`combatTimeline.ts`・`enemyVfxTiming.ts`・`useBattleFx.ts`（LANE2 監査に記載の対象） | — |
| 1 | **A'（決定231 候補・Narrow Hotfix）** `patches/card-defects-minfix.patch` | `src/components/battle/battle.css` **だけ**（1 hunk・`.card-view-cost` の直後・+15 行） | **battle.css が重なるので、必ず Lane 2 の battle.css 変更が入った後に適用**。`git apply --3way` で rebase（Lane 2 が同じ行を触っていなければ自動で当たる。当たらない時は `.card-view-cost` ブロックの直後に同じ 15 行を手で追記） |
| 2 | **After-1（Pilot のレイアウト）** `patches/after1-art-window.patch` | `CardView.tsx`・`cardBonusText.ts`＋test・新規 `artWindow.{ts,css,test.ts}` | **battle.css を触らない**。Lane 2 の対象ファイルと重ならない（Lane 2 は CardView を触らない計画）。ただし main の作業ツリーには `CardView.tsx` の未 commit 変更があるため、適用時は最新の `CardView.tsx` に `git apply --3way` で当てる |
| 3 | **After-2（新原画）** | `src/core/data/cardArt.ts` 1 行・`public/assets/cards/card_taiyo_attack_01_v2.webp`（新規）・`art-source/cards/card_taiyo_attack_01_v2.png`（新規）・`art-source/README.md` 1 行 | 重ならない。**原画が `accept-art.mjs` に合格してから** |

- 1 と 2 はそれぞれ別の Decision・別 commit（P3 One Change）。1 → 2 → Human QA（Before／After-1）→ 3 → Human QA（After-2）の順
- どの段も、Production 公開は従来どおりの Gate（Code Freeze・`docs/RELEASE_STATUS.md`）に従う

### 10-6. CEO の判断・作業が必要なこと

1. **新原画の生成（作業）**：Image Brief どおりに 1 枚生成して master を渡す（AI は生成しない）。**有料プラン・新規課金・API 課金が必要なら、使う前に承認**（現時点で課金の提案はしていない）
2. 生成サービスの利用規約（商用可否・入力画像の扱い）の確認（ライセンス判断は AI では出さない・§7 補足と同じ）
3. A'（決定231 候補）と After-1 の実装・リリースは AI 判断の範囲（CLAUDE.md §6-2：バグ修正・既存仕様内の軽微な UI 調整）。Production 公開時は通常の Gate

## 11. A'（決定231 候補）と After-1 の実装・Fast Gate（2026-09-27 追記・実装フェーズ）

- 作業ツリー：`C:/Users/kimi1/SevenGodsGame-lane3`（`git worktree add` で Production＝`master` **45bfc9e** から作成・`npm ci` 済み）。main の作業ツリーの runtime・他の worktree・`docs/DECISIONS.md`・Lane 2／HUD のファイルは触れていない
- **push／merge／deploy なし**（ローカル commit のみ）。画像生成 0・外部サービス 0・サーバーは 127.0.0.1 のみで、終了時に停止済み
- 実測スクリプト（新規・`scripts/lane3-card-premium/`）：`gate-aprime.mjs`（A'：Before／After 別 build 比較）・`gate-after1.mjs`（After-1：A' 比較）・`scroll-check.mjs`（後述のノイズ原因確認）。`verify-impl.mjs` は screenshot の hang 対策（各 15s timeout・try/catch）のみ変更。証拠：`out/gate-aprime/`・`out/gate-after1/`・`out/impl-after1/`

### 11-1. ブランチと commit（すべてローカル）

| 段 | ブランチ | commit | 親 | 変更ファイル（+/−） |
|---|---|---|---|---|
| A'（決定231 候補） | `feat/d231-card-cost-orb-fix` | **9fd53fc** | 45bfc9e | `src/components/battle/battle.css` **+15／−0**（1 ファイル） |
| After-1（Art Window v2） | `feat/lane3-after1-art-window` | **fd60d36** | 9fd53fc | `CardView.tsx` +15/−5・`artWindow.css` +47（新規）・`artWindow.test.ts` +38（新規）・`artWindow.ts` +24（新規）・`cardBonusText.test.ts` +8/−1・`cardBonusText.ts` +9/−1 ＝ **6 ファイル +141／−7** |

- After-1 は **ローカル commit 済み**（未 commit ではなく commit を選んだ：Human QA の対象を hash で固定でき、NO-GO なら branch ごと捨てられる）。worktree の最終状態＝After-1（A'＋Art Window）・`dist` は After-1 build（`index-NHVKeR-7.js`／`index-BP2SmNq8.css`）
- **patch からの逸脱：0**。両 patch とも `git apply` がそのまま当たった（`--3way` 不要・conflict 0）。`artWindow.css` は試作用 `css/artWindow.css` と改行コード以外同一（repo は `core.autocrlf=true`・作業ツリー CRLF で他ファイルと同じ）

### 11-2. Fast Gate 結果

| 項目 | A'（9fd53fc） | After-1（fd60d36） |
|---|---|---|
| `npx tsc -b --noEmit` | 0 error | 0 error |
| `npx oxlint src` | 0 warning／0 error | 0／0 |
| `npx vitest run --dir src` | 93 files・**1167 passed**（初回は `balanceSim.test.ts` の 決定126 STAKE-01 が 5s timeout＝preview サーバー起動と重なった負荷。**単独再実行 11/11 passed・12.7s** で PASS） | 94 files・**1172 passed**（1 回で全通過・36.3s。新規 `artWindow.test.ts` 4 件＋`cardBonusText.test.ts` +1 件を含む） |
| `npx vite build` | 成功（1.8s） | 成功（2.1s） |
| 隔離 | 変更は `battle.css` のみ。**JS バンドル md5 `8eedb711…` ＝ `SevenGodsGame-d230-rc/dist/assets/index-DCW9kCba.js` と完全一致**（ファイル名の hash は Vite が CSS も含めて付けるため `index-DrzyznQ0.js` に変わるが中身は同一）。`src/core`／`public`／`package*.json` 0 | `src/core` 0・`public` 0・`package*.json` 0（`git diff --stat master -- src/core public package.json package-lock.json` が空）。battle.css は触っていない |

**バンドル差分**

| 比較 | JS | CSS |
|---|---|---|
| A' vs Production（45bfc9e） | 437,394 B → 437,394 B（**±0・md5 同一**） | 158,356 B → 158,487 B（**+131 B**） |
| After-1 vs A' | 437,394 B → 437,663 B（**+269 B**） | 158,487 B → 159,279 B（**+792 B**） |

### 11-3. ブラウザ検証（Playwright・注入なし・別 build を別ポートで配信）

**A'**（Before＝Production dist `SevenGodsGame-d230-rc/dist` を `:4232`・After＝lane3 の A' build を `:4231`。d230-rc は再 build していない）。6 seed × SP 360／390／430＋PC 1280／1508 ＝ 手札 **150 件・13 種**（`out/gate-aprime/gate-aprime.json`）

| 検査 | 結果 |
|---|---|
| コスト珠 | After **150/150 が 26×26・位置 (-1,-1)・`position:absolute`・円**。Before で潰れていたのは 49 件（SP：姉御の号令／豪快な一撃 26×17、受け流し／神楽舞／速攻／呪縛 26×23.2。PC：姉御の号令 26×17、豪快な一撃 26×20.5） |
| 文字のはみ出し | After **0 件**（SP 姉御の号令 15.06 → −5.94px・豪快な一撃 3.81 → −8px。PC 姉御の号令 −0.22 → −8px） |
| 他カードの位置 | はみ出し・潰れのなかったカードの文字位置（textTop／textY／bonusY）の変化 **0 件** |
| READY 重ね層＋⚡（擬似 READY・豪快な一撃を含む 10 手札） | 縁 dx/dy/dw/dh **Before と同一（0/0/0/0・opacity 1）**・⚡ 条件行あり・はみ出し 0 |
| console error | Before 0／After 0 |
| 低い画面（記録のみ・A' の範囲外） | 390×700（カード 140px）：**姉御の号令 33.06 → 12.06px・豪快な一撃 21.81 → 0.81px が残る**（珠は 26×26 に直る。§10-1 の記載どおり。豪快な一撃は After-1 で 0 になる）。1280×620：残り 0 |
| 凍結した全要素比較（SP 390・PC 1508・seed `lane3-card-1`・手札 5 枚＝50 要素） | 動いた要素は **`.card-view-cost`（全カード：rect は同一で computed `position` が relative → absolute に変わるだけ）と、はみ出していた豪快な一撃の本文（body／god／name／text／bonus が SP で 11.8px 上へ＝正しい位置に戻る）だけ**。PC は body が動かず珠の高さ 20.5 → 26 のみ。**想定外の移動 0・手札の外の箱（`.hand`／敵／味方／共鳴／ボタン）の差 0**。画像：`out/gate-aprime/<画面>-lane3-card-1-{before,after}-{hand,full}.png` |

**After-1**（Before＝A' build（`out/dist-a-prime`）を `:4232`・After＝After-1 build を `:4231`。`out/gate-after1/gate-after1.json`・`out/impl-after1/impl.json`）

| 画面（カード） | 文字の開始（カード高さ比） | 暗幕の開始 | 文字のはみ出し | 条件行 | 珠 | 専用札 | READY の縁（擬似） |
|---|---|---|---|---|---|---|---|
| SP 360／390／430（100×158） | 21.6%（A'・「大耀専用」行）→ **54.9%** | 48.6% | −8 → −7.4px（0） | 3 行 → **1 行**（横 overflow 0） | 26×26・円・absolute | 本文の外（右上・8px・43×14） | dx/dy/dw/dh **0／0／0／0**・opacity 1・A' と同一 |
| PC 1280×800／1508×660（116×164） | 30.2% → **54.9%** | 48.8% | −8 → −8.4px（0） | 2 行 → **1 行** | 同上 | 同上 | 同上 |
| 低い SP 390×700（100×140） | 17.9% → **50.1%**（帯が上へ伸びる） | 43.0% | **+0.81 → −6px（0）** | 1 行 | 同上 | 同上 | 同上 |
| 低い PC 1280×620（116×150） | 23.7% → 52.2% | 45.6% | −8 → −6px（0） | 1 行 | 同上 | 同上 | 同上 |

- ※「文字の開始」は §10-2 と同じ定義（本文の最初の文字要素の上端）。A' の値が §10-2 の Before（29.1%）より小さいのは、A' では「大耀専用」行が本文の先頭に戻ったため（§10-2 の Before は珠に押し出された状態）。**絵の窓（clip 比）＝文字の開始 54.9%・暗幕 48.6%** は §10-2 の試作値（55.0%／48.6%）と一致
- **本物の READY**（`verify-impl.mjs`・自動プレイ・SP 390／PC 1508）：**R3 に共鳴 4 以上で点火**。縁 0/0/0/0・opacity 1・金 `#e8b33d`・条件行 `⚡ 共鳴4以上:敵に40` 1 行・はみ出し 0（−7.6／−8.5px）・珠 26.5×26.5（READY のカード拡大 1.02 倍込み＝26×26）・console error 0。画像：`out/impl-after1/*-impl-real-ready*.png`
- **他のカード**：豪快な一撃を含む手札（`lane3-card-1`・`lane3-card-5`×7 画面）で、豪快な一撃以外の**可視要素の rect・text の差 0**。`lane3-card-5`（豪快な一撃が 5 枚目）の SP 360／390 でだけ、`display:none` の `.card-view-type`（0×0）の x が 1〜19px 違って検出されたが、これは `scrollIntoView` が `.battle`（overflow-x hidden）を実行ごとに違う量だけ動かすためのノイズ（同一 build でも `.battle` の scrollWidth が実行ごとに変わる＝舞台アニメーションの位相依存。`hand.scrollLeft`・全カードの幅／高さ・document scroll は Before／After で一致。`scroll-check.mjs`）。レイアウト差ではない
- **豪快な一撃を含まない手札**（`lane3-card-0`・`lane3-card-2` × 6 画面＝12 run）：**全要素 diff 0・`card-view-artwin` 付与 0・外側の箱の差 0**
- console error：Before 0／After 0（全 run）
- 画像：`out/gate-after1/<画面>-{aprime,after1}-card-ready.png`（擬似 READY の 1 枚比較）・`390x844／1508x660-{aprime,after1}-hand.png`・`*-after1-full.png`

### 11-4. Known Risks

1. **低い SP（390×700 相当・カード 140px）で『姉御の号令』の文字が 12.1px はみ出したまま**（A' の範囲外・文字量がカード高さを超える別件。Production では 33.1px だったので悪化ではない）。Human QA の実機が 700px 級の高さなら見える。対応は別 Decision（文字量／カード高さ／Art Window の一般化のいずれか）
2. After-1 の条件行 1 行は **端末フォント幅に依存**（Chromium 実測は横 overflow 0）。入らない端末では 2 行に折れて帯が上へ伸びる設計（切れない）だが、その場合は「1 行」の価値が落ちる。Human QA Q5 で確認
3. **`.battle` の横 overflow（SP で scrollWidth が clientWidth を 40〜100px 超える・実行ごとに変動）** は Production からある既存挙動（overflow-x hidden なので操作では見えない）。今回の変更とは無関係だが、`scrollIntoView` を使う計測が不安定になる要因として記録
4. `balanceSim.test.ts` は並列負荷で 5s timeout に触れることがある（既知・単独再実行で通る）。CI 化する際は timeout か直列化の検討が要る
5. `setup.css:763` のデッキ構築側の同型の上書き（§10-1 の別件メモ）は **未対応・未検証**のまま

### 11-5. Human QA 環境メモ

| 環境 | dist | 配信例（127.0.0.1 のみ・再 build 不要） |
|---|---|---|
| **Before＝Production＋A'** | `C:/Users/kimi1/SevenGodsGame/scripts/lane3-card-premium/out/dist-a-prime/`（A' build のコピー。JS は Production と md5 同一） | `cd /c/Users/kimi1/SevenGodsGame-lane3 && npx vite preview --host 127.0.0.1 --port 4232 --strictPort --outDir /c/Users/kimi1/SevenGodsGame/scripts/lane3-card-premium/out/dist-a-prime` |
| **After-1＝A'＋Art Window** | `C:/Users/kimi1/SevenGodsGame-lane3/dist/`（fd60d36 の build） | `cd /c/Users/kimi1/SevenGodsGame-lane3 && npx vite preview --host 127.0.0.1 --port 4231 --strictPort` |

- 条件：大耀 × 蒼海の龍神 × ふつう・URL に `?seed=lane3-card-1`（初手：後輩想い／一撃／**豪快な一撃**／巫女の舞／予言。豪快な一撃は 3 枚目）。実機 SP（390 前後）＋PC 1508×660、可能なら SP 360。READY は自分で共鳴 4 まで進めて点火（自動プレイでは R3）。説明・誘導はしない
- 手順：各環境で ①手札を 3 秒見る ②共鳴 4 まで進める ③豪快な一撃を撃つ。順番は Before → After-1
- 質問（§10-4 と同じ 6 問）：**Q1** 手札を見た瞬間『豪快な一撃』が誰が・何で・どう殴るカードか絵だけで分かったか／**Q2** 手札の中でこの 1 枚が一番「使いたい」に見えたか／**Q3** 舞台の大耀とカードの大耀は同じキャラクターに見えたか（After-1 は NO が期待値＝対照）／**Q4** READY で絵・金の縁・光が 1 つの物として点き ⚡の金の数字までつながって見えたか／**Q5** 効果文と条件行（`共鳴4以上:敵に40`）は Before より読みにくくないか・条件を読み違えないか／**Q6** 手札でこの 1 枚だけ形が違うことが気になったか（違和感）／特別に見えたか
- 成功条件（After-1）：Q1 が Before より良い・Q5 悪化なし・Q6 が「違和感」でない
- 次の段：A'（9fd53fc）を 決定231 として通常の Gate（Code Freeze・`docs/RELEASE_STATUS.md`）で先に出す → After-1 Human QA → After-2（新原画・CEO 作業）。**本セクションの時点では release していない**

---

## 12. Human QA（After-1）PASS と Release Gate（決定231・決定236）— 2026-09-27

### 12-1. CEO Human QA（Before＝Production＋A'／After-1）— **PASS**
Q1 絵だけで誰が何でどう殴るか分かる **はい**／Q2 一番「使いたい」に見える **はい**／Q3 舞台の大耀と同じキャラクターに見える **いいえ**（原画据え置きの After-1 では想定どおり＝新原画の対照）／Q4 READY で絵・金の縁・光と⚡がひとつながり **はい**／Q5 効果文・条件行が Before より読みにくい **いいえ**／Q6 この 1 枚だけ形が違うことへの違和感 **いいえ**。合格条件（Q1 良化・Q5 悪化なし・Q6 違和感なし）を満たす。
後片付け：QA サーバー（:4195／:4196）停止、一時 Firewall `QA3 Lane3-HUD-Dock (temp)`（4195〜4199）を CEO の UAC 承認で削除（一時ルール 0 本）。

### 12-2. Release Gate — 2 段（**決定231 A' → 決定236 After-1**）・どちらも **PASS／Blocker 0 → PRODUCTION RELEASE READY（CEO 承認待ち）**
| 項目 | 決定231 A'（カードのコスト珠・はみ出し修正） | 決定236 After-1（豪快な一撃 Art Window v2・原画据え置き） |
|---|---|---|
| RC | `release/d231-card-cost-orb-rc`＝**`087734c`**（`9fd53fc` を決定233〜235 後の master `2389d21` へ rebase・衝突 0・commit 1 つ。worktree `SevenGodsGame-d231-rc`） | `release/d236-card-art-window-rc`＝**`41adb32`**（決定231 の上に commit 1 つ。worktree `SevenGodsGame-d236-rc`）。**決定231 の後にしか出せない** |
| 変更 | `battle.css` +15／−0（`.card-view > .card-view-cost { position:absolute }` の 1 規則） | `CardView.tsx` +15／−5・新規 `artWindow.{ts,css,test.ts}`・`cardBonusText.{ts,test.ts}`（6 ファイル +141／−7・カード ID の表示専用データ表・名前分岐なし） |
| Automated | full 96 files・**1,204 PASS**／tsc 0／lint 0／build PASS | full 97 files・**1,209 PASS**／tsc 0／lint 0／build PASS |
| Isolation | `src/core`／`public`（assets 一致）／package 0。**JS は現 Production と md5 一致**（`022a0de5…`＝CSS だけ）。CSS +131B | `src/core`／`public`／package 0。JS +275B・CSS +923B（決定231 比）。名前ハードコード 0 |
| ブラウザ Gate（`gate-aprime.mjs`／`gate-after1.mjs`・Before＝現 Production `2389d21` build） | 6 seed × SP 360／390／430＋PC 1280／1508＝150 件 13 種：**珠 150/150 が 26×26・absolute・はみ出し 0**（Before は 49 件が潰れ／はみ出し。姉御の号令 15.1→−5.9px・豪快な一撃 3.8→−8px）、はみ出していなかったカードの文字移動 0、擬似 READY 10 行 NG 0、凍結全要素比較（SP 390・PC 1508）で想定外 0・外側差分 0。低い画面の残り（Fast Gate と同じ・別件）：390×700 で姉御の号令 12.1px・豪快な一撃 0.8px（後者は決定236 で 0） | 文字の開始 30.2%→**54.9%**（SP／PC）・暗幕 48.8%（Fast Gate 時 48.6%）・条件行 2〜3 行→**1 行**（横 overflow 0）・珠 26×26・専用札は本文の外・READY の縁 dx/dy/dw/dh 0/0/0/0（決定231 と同一）・はみ出し 0（390×700 は +0.8→−6px・1280×620 −6px）・豪快な一撃なしの手札 12 run は全要素 diff 0・あり手札の他カードは可視要素 diff 0（`display:none` 0×0 要素の x 1px 差＝既知の scrollIntoView ノイズ）・console error 0 |
| Human QA 済みとの一致 | QA の Before は 245ecdc 基準の A' build。rebase 後は決定233〜235 が加わるため md5 は変わるが、A' の差分は同一 15 行で上のブラウザ Gate の結果は Fast Gate と同値 | QA の After-1 は `d1c7f3f`。rebase 後の差分は同一（6 ファイル）で、ブラウザ Gate の数値は Fast Gate と同値 |
| Rollback 先 | 現 Production **`6689788618`**（`2389d21`・決定235） | 決定231 のリリース後の deployment |
| Release 手順（CEO 承認後のみ） | fast-forward `2389d21`→`087734c` → push → 配信 md5 → Narrow Smoke（珠 26×26・はみ出し 0・READY） | 決定231 の Smoke PASS 後：fast-forward →`41adb32` → push → 配信 md5 → Narrow Smoke（文字の開始 ≥54%・条件行 1 行・READY の縁・他カード diff 0） |

**状態：決定231・決定236 = Release Gate PASS／PRODUCTION RELEASE READY — CEO 承認待ち（順序：231 → 236）。** After-2（新原画）は CEO の master 待ち。

---

## 13. 決定231 Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-27 JST・CEO 承認）
| 項目 | 値 |
|---|---|
| Release 直前 | master＝origin/master＝`2389d21`／RC `087734c`・worktree clean・commit 1 つ |
| merge／push | `git fetch . release/d231-card-cost-orb-rc:master`（fast-forward）→ `git push origin master`（18:16 JST・`2389d21..087734c`） |
| Vercel | deployment **`6690397819`**（`087734c`・Production）success（2026-09-27T09:17:29Z） |
| 配信 bundle | `index-DfMSiY-O.js`／`index-Cl7mJZMf.css`＝RC build と **md5 一致**（JS は決定235 と同一） |
| Rollback 先 | **`6689788618`**（`2389d21`・決定235） |
| Narrow Smoke（`gate-aprime.mjs`・Before＝直前の Production build／After＝Production） | 150 件 13 種：珠 150/150 が 26×26・absolute、はみ出し 0（Before 49 件が潰れ／はみ出し）、はみ出していなかったカードの文字移動 0、READY 10 行 NG 0、凍結全要素比較（SP 390・PC 1508）で想定外 0・外側差分 0、console error 0。既知の残り：390×700 で姉御の号令 12.1px（**後続 Hotfix 候補として保持**）・豪快な一撃 0.8px（決定236 で 0） |

**Decision231 カードのコスト珠・はみ出し修正 = PRODUCTION LIVE / CLOSED。** Production＝`087734c`。

## 14. 決定236 Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-27 JST・CEO 承認・決定231 の Smoke PASS 後）
| 項目 | 値 |
|---|---|
| Release 直前 | master＝origin/master＝`087734c`／RC `41adb32`（決定231 の直上・rebase 不要）・worktree clean |
| merge／push | `git fetch . release/d236-card-art-window-rc:master`（fast-forward）→ `git push origin master`（18:26 JST・`087734c..41adb32`） |
| Vercel | deployment **`6690483429`**（`41adb32`・Production）success（2026-09-27T09:26:43Z） |
| 配信 bundle | `index-C1FP55ON.js`／`index-PQq-xSNW.css`＝RC build と **md5 一致** |
| Rollback 先 | **`6690397819`**（`087734c`・決定231） |
| Narrow Smoke（`gate-after1.mjs`・Before＝決定231 build／After＝Production） | 豪快な一撃：文字の開始 21.6〜30.2%→**54.9%**（SP 360／390・PC 1508）・暗幕 48.5〜48.8%・条件行 3→1 行・横 overflow 0・珠 26×26・専用札は本文の外・READY の縁 0/0/0/0・はみ出し 0（390×700 も +0.8→−6px）・豪快な一撃なし手札 12 run 全要素 diff 0・あり手札の他カードは可視要素 diff 0（0×0 要素の 1px は既知の scroll ノイズ）・console error 0 |

**Decision236 Card Premium v2 After-1「Art Window v2」= PRODUCTION LIVE / CLOSED。** Production＝`41adb32`。After-2（新原画）は CEO の master 待ち。
