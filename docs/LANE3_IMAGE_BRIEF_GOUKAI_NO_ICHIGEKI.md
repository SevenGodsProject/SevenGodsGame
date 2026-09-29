# Image Brief：大耀『豪快な一撃』v2 原画（card_taiyo_attack_01_v2）

- 日付：2026-09-27（Lane 3・AI 作成の依頼書。Card Premium v2 Pilot／CEO 承認「Art Window v2＋新原画」の STEP B）
- 前提：`docs/LANE3_CARD_PREMIUM_V2_PRE_AUDIT.md` §3〜§4・§10、`docs/CARD_ART_STYLE_GUIDE.md`、公式 大耀（SGG Creator Kit `taiyo-kozuchi:GOD_MAIN`／`GOD_FRONT`）
- **生成するのは CEO（または外部の制作者）です。AI は画像を生成していません。** 有料の画像生成サービス・新しい課金・API 課金が必要になる場合は、**使う前に CEO の承認が必要**です（本書は既存の手段で生成できる前提で書いています）
- 表示位置の数値はすべて、Production 同一 build（`d230-rc`・45bfc9e）に After-1（Art Window v2）を適用した**実測**から逆算した値です（`scripts/lane3-card-premium/out/after1/after1.json`・`out/impl/impl.json`）

---

## 1. 目的（1 行）

手札 100px 幅でも「**大耀が・テック小槌を・振り抜いて殴る**」が一目で分かり、舞台の公式 大耀と**同じ人物**に見え、READY（金の縁）と ⚡PAYOFF（34px の金）に**同じ金**でつながる 1 枚を作る。

## 2. サイズ・形式

| 項目 | 仕様 |
|---|---|
| 生成（master） | **推奨 1536×2304 PNG**（2:3）。サービスの上限で出せない場合は **1024×1536 のネイティブ生成を最低ライン**として可（配信 640×960 に対し 1.6 倍・デッキ構築 DPR3 の 570 device px を超える） |
| 禁止 | 2×2 などのシートから切り出す／**拡大（upscale）で解像度を作る**（現行原画の「実質 362px」問題の再発になる） |
| 色 | sRGB・8bit・**alpha なし**（透過を使わない。四辺まで絵で埋める＝フルブリード） |
| 比率 | **2:3 厳守**（±0px）。`<img width=512 height=768>`・`object-fit: cover` と同じ比率なのでコード変更なしで置ける |

## 3. 表示のされ方（生成前に知っておくこと）

カード（手札）は **SP 100×158px／PC 116×164px**。絵はカード全面に敷かれ、Art Window v2 では**上 55% が絵の窓、下 45% に名前・効果文・条件行が載る**（【実測】文字の開始＝カード高さの 54.9%）。右上に「大耀専用」の小さな札、左上にコスト珠（直径 26px）、READY 時は外周に金の縁（1.5px）と上辺 7px の光が乗る。

| 原画上の位置（%） | 何が重なるか（実測からの逆算） |
|---|---|
| y 0〜15%・x 0〜26% | コスト珠（赤いグラデーションの丸・数字） |
| y 0〜11%・x 52〜97% | 「大耀専用」の札（暗い半透明の地に金文字 8px） |
| y 47〜55% | 文字帯の暗幕が始まる（SP 48.5%／PC 47.5%）。PC は文字が 53.4% から、低い画面（カード 140px）は 48.5% から載る |
| y 55〜100% | 名前（11.5px 白・太字）・効果文 3 行（9〜9.5px 淡色）・条件行 1 行（9px・READY 時は金） |
| 左右各 3.3% | SP で切れて見えない（cover） |
| 上 1%・下 3.7% | PC で切れて見えない（cover） |
| 外周 3%（上辺 5%） | READY の金の縁と上辺の光 |

参考：デッキ構築（幅 150〜190px・高さ 220px 以上）と報酬 3 択（140×200px）は Art Window v2 の対象外（従来どおり下部に暗い文字帯）。【計算】デッキ構築では上 5%・下 18% 程度、報酬では上下 2.4% 程度が切れる。**焦点帯（y 5〜47%）はどの画面でも残る。**

## 4. 領域の指定（原画に対する %・数値目標）

| 領域 | 範囲 | 置くもの | 数値目標（512×768 に縮小して測る。`accept-art.mjs`） |
|---|---|---|---|
| **焦点帯** | x 12〜88%・**y 5〜47%** | 顔（中心 x 50〜60%・y 20〜30%）と**小槌の打撃面**（中心 x 25〜45%・y 28〜44%）を 1 つの塊に。頭（帽子込み）の幅は画像幅の 34〜40% | 焦点帯の edge ≥ 左右帯の 1.8 倍／焦点帯 − 左右帯の平均明度 ≥0.10／**最も明るい 5% の画素の半分以上が焦点帯**／顔 − 左右帯の明度差 ≥0.20 |
| 遷移帯 | y 47〜55% | 胴・腕が暗くなり始める。**目・顔・打撃面を置かない** | 平均明度 ≤0.30 |
| **文字帯（text-safe）** | **y 55〜100%** | 脚・袋・火の粉が**暗い臙脂の地へ溶けて消える**。低ディテールのシルエットのみ | **平均明度 ≤0.20・edge density ≤0.05**（現行原画は 0.276・0.103） |
| コスト珠域 | x 0〜26%・y 0〜15% | 背景の地だけ（重要物なし・中〜暗） | 明度 0.12〜0.50・edge ≤0.08 |
| 専用札域 | x 52〜97%・y 0〜11% | 帽子の頂や髪先・背景は可。**目・バイザー・帽子の宝袋紋は置かない** | 明度 ≤0.55 |
| READY 縁 | 外周 3%・上辺 5% | 中〜暗の地。高輝度・重要物なし | 99 パーセンタイル明度 ≤0.85 |
| 背景の左右帯 | x 0〜12%／88〜100%・y 5〜47% | 攻撃の赤の放射・和柄の透かしだけ | edge ≤0.06 |

指標の定義は監査と同じ：明度＝Rec.709（0〜1）、edge density＝隣接画素（右・下）の明度差の絶対値の平均。

## 5. 大耀 identity チェックリスト（公式 `main.webp`／`front.webp`／`keyvisual.webp` を目視して抽出）

| # | 部位 | 公式の意匠（これに合わせる） |
|---|---|---|
| 1 | 髪 | **短めのハニーブロンド**（明るい金茶・毛先はやや濃い黄土）。帽子の下から頬〜あごの横に数束はみ出す。長髪・茶髪・ポニーテールにしない |
| 2 | 帽子 | **大きくふくらんだキャスケット（ニュースボーイ型）**。地は**暗いオリーブの迷彩ダマスク**（同系色の雲文・龍の地紋）。**正面向かって左の約 4 割がサンドベージュの切り替え**で、そこに**口を縛った宝袋の刺繍と丸い紋**がある |
| 3 | バイザー | 目の上を横切る**半透明オレンジのラップアラウンド・バイザー**（目が透けて見える）。向かって左のレンズに**小さな緑〜青緑の HUD 表示** |
| 4 | ヘッドセット | 片耳（向かって右）に**白〜銀の丸い耳当て＋緑に光る LED**、口元へ伸びる**黒いブームマイク（先端オレンジ）** |
| 5 | 顔 | **大きな琥珀〜茶色の瞳**（強いハイライト）、**太く濃い眉**、口を開けた**自信満々の笑顔（上の歯が見える）**。丸い輪郭・小さな鼻 |
| 6 | 耳飾り | 両耳に**小さな金のフープピアス** |
| 7 | 上着 | **ノースリーブのフード付きベスト（パーカー）**、帽子と同じオリーブ迷彩ダマスク。**フードの裏地はオレンジ**、**オレンジの紐と房**、胸〜腹に**縦に走る 2 本のオレンジに光る回路のライン**。肩・腕は素肌 |
| 8 | 腕輪 | 片方の二の腕（向かって右）に**金の腕輪（黒い漢字風の刻印）** |
| 9 | 手 | 両手に**黒い指ぬきグローブ**（手首にパッド） |
| 10 | 下半身 | 迷彩のだぶだぶパンツ＋**大きなオレンジの膝当て**、**黒いブーツに金のバックル**（文字帯では暗いシルエットでよい） |
| 11 | **テック小槌** | **円筒形の大きな頭＝シャンパンゴールド**、後ろ半分に**ガンメタの段付き円筒（リブ）**、**打撃面は同心円に光る（中心 赤 → 黄 → 白〜水色の縁）**、上から**熱の炎がゆらぐ**。頭の上に**金の飾り（雲形の冠・内側は黒）**、首元に**赤・黄・緑の小さな縦縞の発光マーク**。**柄は黒で指の溝があり、柄尻は金のキャップ**。「大」の字の木槌・木製の槌にしない |
| 12 | 体型 | **2.0〜2.3 頭身の chibi**（スタイルガイド §1）。元気な年少の「姉御」 |
| 13 | その他 | 白い大袋（薄紫の青海波）・翡翠の腕輪は**省略可**（入れるなら文字帯で暗く）。**雲の乗り物・山・鳥居・城は入れない**（keyvisual の背景は写さない） |

## 6. ポーズ・瞬間・構図・カメラ

- **瞬間**：テック小槌を**肩の上から斜め手前へ振り抜く、インパクトの 1 フレーム前**。打撃面が画面の手前（見る人の側・やや右下）へ向き、赤熱の同心円が見える
- **体**：3/4 で右向き、上半身をひねって振り抜く。**顔は正面寄りの 3/4**（バイザー越しに目が見える角度）。視線は打撃点（画面の右下手前）
- **表情**：**不敵な笑み**（口を開けた自信の笑顔。叫び顔・怒り顔にしない）
- **構図**：左上 → 中央の対角線。**顔と打撃面を焦点帯の中で 1 つの塊**に（両者の中心の距離は画像幅の 25% 以内）。踏み込みの脚は下の文字帯へ流れて暗く消える
- **カメラ**：目線の高さ〜やや下から、**バストアップ〜腰上のミディアムショット**（脚は文字帯で溶けるので実質バストアップの見え方）。頭頂から画面上端までの余白は 5〜8%（専用札の下に帽子の頂がかかってよい）

## 7. ライティング・明暗・素材・奥行き

| 項目 | 指示 |
|---|---|
| 主光（key） | **左上から暖かい白**（READY の面の光 135°・点火の帯 115° と同じ向き）。顔・帽子の上面・小槌の上面に当てる |
| 副光（rim） | **打撃面の赤熱が頬・グローブ・バイザーの縁に落とすオレンジ〜赤のリムライト**。光源は主光＋これの**2 つまで** |
| 明暗の分離 | 顔と打撃面の縁が最も明るい（明度 0.6〜0.9）／人物の中間 0.3〜0.5／背景の上部 0.2〜0.35／**下 45% は平均 0.20 以下** |
| 素材 | 小槌＝**金属**（硬いハイライト・映り込み）、布＝**マット**（影 1 段・迷彩の地紋は**低コントラスト**で 100px 幅でノイズにならない）、肌＝柔らかいセル影、バイザー＝半透明の光沢 |
| 奥行き | 3 層：前景（打撃面から飛ぶ火花・わずかなブレ）／中景（人物・最も鮮明）／背景（攻撃の赤の放射と青海波 15〜30%・ぼかし） |

## 8. 色の階層（タイプ色＝攻撃の赤）

1. **焦点＝金〜白**：打撃面の縁・小槌の金・バイザーのハイライト（大耀の神色 `#e8b33d`、READY の縁と同じ金）
2. **人物の差し色＝オレンジ**：バイザー・フード裏・回路のライン・膝当て
3. **人物の量＝オリーブ迷彩**：帽子・ベスト（彩度は抑えめ）
4. **背景＝攻撃の赤 `#e5484d` の放射 → 暗い臙脂 `#3a0f12`（カードの地と同じ）→ 下端は `#120507` 前後**
- **紫・マゼンタは使わない**（妨害タイプの色。現行原画は 3.9%）。青・水色は LED・HUD・打撃面の縁の**小さな点だけ**（合計 2% 以下）

## 9. エフェクト密度

- **衝撃の弧 1 種**（振り抜きの軌跡に沿う金白の弧・小槌の後ろ）＋**火の粉 1 種**（小さな橙の粒）だけ。画面の **40% 以下**
- **顔の輪郭を横切らない**。文字帯（下 45%）には**暗く小さな火の粉が少しだけ**（コントラストを上げない）
- 岩の破片・紫の破片・稲妻・煙の渦・多重の光輪は入れない

## 10. 禁止事項

**文字・数字・ロゴ・透かし（watermark）・署名／UI・ゲージ・アイコン・⚡マーク／カードの枠・額縁・角丸の縁取り／他のキャラクター（OTOMO「小槌」の精霊・人物・動物）／情景（山・鳥居・城・雲海・建物）／細かい背景ノイズ（岩の散乱・紙吹雪の全面散布）／写実・劇画調・厚塗り／流血・傷／黒帯・余白・透過**

## 11. 既存カードとの画風の揃え方（スタイルガイド準拠）

- 線画：**中太〜やや細めの均一な線**（公式 Kit 立ち絵の太い輪郭線はそのまま写さない＝スタイルガイド §2）
- 塗り：**2〜3 階調のフラットなセル塗り**（グラデーションは頬・金属・光だけ）
- 背景：地色＋和柄の透かし＋エフェクトの 2〜3 レイヤー（§5）。風景にしない
- 並べる相手：共通の攻撃カード（`card_common_attack_01`／`_02`）と同じ「ゲームアイコン的セルルック」。**ただし本カードは Pilot なので、下 45% を暗く静かにする点だけ既存カードより意図的に強い**

---

## 12. プロンプト

### 12-1. 日本語版（そのまま貼る）

```
ゲームのカードイラストを 1 枚だけ描いてください。縦長 2:3（可能なら 1536×2304px、無理なら 1024×1536px）。文字・ロゴ・枠・UI は一切入れないでください。

【キャラクター】添付した公式イラストの「大耀（たいよう）」と同じ人物・同じ衣装で描いてください。2.0〜2.3 頭身のデフォルメ（chibi）。
・短めのハニーブロンドの髪（帽子の下から頬の横に数束）
・大きくふくらんだキャスケット帽：暗いオリーブの迷彩ダマスク（雲文の地紋）、正面向かって左の約 4 割がサンドベージュの切り替えで、口を縛った宝袋の刺繍と丸い紋
・目の上に半透明オレンジのラップアラウンド・バイザー（目が透けて見える・左レンズに小さな緑の HUD 表示）
・片耳に白い耳当て（緑の LED）と黒いブームマイク（先端オレンジ）、両耳に小さな金のフープピアス
・大きな琥珀色の瞳、太い眉、口を開けた自信満々の笑顔
・オリーブ迷彩のノースリーブのフード付きベスト（フード裏はオレンジ、オレンジの紐と房、胸に縦 2 本のオレンジに光る回路のライン）、金の腕輪、黒い指ぬきグローブ
・テック小槌：円筒形のシャンパンゴールドの頭、後ろ半分はガンメタの段付き円筒、打撃面は同心円に光る（中心 赤→黄→白〜水色の縁）、上に熱の炎、頭の上に金の雲形の飾り、首元に赤黄緑の小さな発光マーク、黒い柄（指の溝）と金の柄尻

【瞬間とポーズ】テック小槌を肩の上から斜め手前へ振り抜く、インパクトの 1 フレーム前。体は 3/4 で右向きにひねり、顔は正面寄りの 3/4、視線は右下手前の打撃点。不敵な笑み。

【構図】顔と光る打撃面を画面の上半分（上から 5〜47%）に 1 つの塊として大きく置く（頭の幅は画面幅の約 35〜40%、顔の中心は画面の横 50〜60%・上から 20〜30%、打撃面の中心は横 25〜45%・上から 28〜44%）。画面の左上の角と右上の角には重要なものを置かない。画面の下 45% は、脚が暗い臙脂色の地へ溶けて消えるだけの、暗く静かで描き込みの少ない領域にする。

【光】主光は左上からの暖かい白。打撃面の赤熱が頬・グローブ・バイザーの縁にオレンジのリムライトを落とす。光源は 2 つまで。いちばん明るいのは顔と打撃面。

【色】背景は攻撃の赤の放射（#e5484d）から暗い臙脂（#3a0f12）、下端はほぼ黒い臙脂。焦点は金〜白（#e8b33d）。人物はオリーブ迷彩とオレンジ。紫・マゼンタは使わない。

【エフェクト】振り抜きの軌跡に沿う金白の衝撃の弧 1 つと、小さな橙の火の粉だけ。画面の 40% 以下。顔にかからない。背景の上の角に青海波の和柄を薄く（15〜30%）。

【画風】中太で均一な線、2〜3 階調のフラットなセル塗りの、ゲームアイコン的なデフォルメ・イラスト。風景・建物は描かない。写実・劇画調・厚塗りにしない。四辺まで絵で埋め、余白・黒帯・透過を作らない。
```

### 12-2. English version

```
Create exactly ONE game card illustration, vertical 2:3 (1536x2304 px if possible, otherwise 1024x1536 px). No text, no letters, no numbers, no logo, no watermark, no card frame, no UI.

CHARACTER: the same character and costume as the attached official "Taiyo" reference images. Chibi / super-deformed, 2.0-2.3 heads tall.
- short honey-blonde hair, a few strands falling beside the cheeks from under the cap
- oversized puffy newsboy cap (casquette) in dark olive camouflage damask with tone-on-tone auspicious-cloud pattern; the front-left ~40% is a sand-beige panel embroidered with a tied treasure sack and a round crest
- translucent orange wraparound visor across the eyes (eyes visible through it), tiny green HUD glyphs on the left lens
- white/silver ear unit with a glowing green LED on one ear and a black boom microphone with an orange tip; small gold hoop earrings
- large amber eyes, thick bold eyebrows, confident open-mouthed grin
- sleeveless hooded vest in the same olive camo damask (orange hood lining, orange drawstrings with tassels, two vertical glowing orange circuit lines down the chest), gold upper-arm band, black fingerless gloves
- TECH MALLET: large cylindrical champagne-gold head with a dark gunmetal ribbed rear section; the striking face glows in concentric rings (red core -> yellow -> white/cyan rim) with a heat flame rising from the top; gold cloud-shaped crown ornament on top; small red-yellow-green glowing stripe near the neck; black handle with finger grooves and a gold pommel cap

MOMENT & POSE: swinging the tech mallet from over the shoulder diagonally toward the viewer, one frame before impact. Body twisted in 3/4 view facing right, face in near-frontal 3/4, eyes on the impact point at the lower right foreground. Bold, fearless grin.

COMPOSITION: place the face and the glowing striking face together as ONE large focal cluster in the upper half of the image (5%-47% from the top; head width about 35-40% of the image width; face center at 50-60% horizontally and 20-30% from the top; striking-face center at 25-45% horizontally and 28-44% from the top). Keep the top-left and top-right corners free of important elements. The bottom 45% must be a dark, calm, low-detail area where the legs simply dissolve into deep maroon darkness.

LIGHTING: warm white key light from the upper left; the red-hot striking face casts an orange rim light on the cheek, gloves and visor edge. Maximum two light sources. The brightest areas are the face and the striking face.

COLOR: background is an attack-red radial glow (#e5484d) fading to dark maroon (#3a0f12) and near-black maroon at the bottom. Focal accents gold to white (#e8b33d). Character in olive camo and orange. No purple, no magenta.

EFFECTS: only one golden-white impact arc following the swing and small orange ember sparks, covering at most 40% of the image, never crossing the face. Faint seigaiha wave pattern (15-30% opacity) in the upper background corners.

STYLE: medium, even line weight; flat 2-3 tone cel shading; clean game-icon-like chibi illustration. No landscape or buildings. Not realistic, not painterly. Full bleed to all four edges: no margins, no black bars, no transparency.
```

### 12-3. Negative prompt（対応するサービスのみ）

```
text, letters, numbers, kanji, logo, watermark, signature, card frame, border, UI, icons, lightning symbol, multiple characters, extra people, spirit creature, animals, landscape, mountains, torii, castle, clouds platform, buildings, long hair, ponytail, brown hair, red kimono, wooden mallet, "大" emblem mallet, purple, magenta, violet, rocks, debris, cluttered background, noisy texture, busy pattern, realistic, photorealistic, painterly, thick poster outlines, blood, injury, black bars, blank margins, transparent background, cropped head, face covered by effects, text in lower area, bright lower half
```

## 13. 添付する参照画像と権利の注意

| 用途 | ファイル（リポジトリ内） | 公式 ID |
|---|---|---|
| 人物・衣装（主） | `public/assets/gods/taiyo/main.webp`（1600×1600） | `taiyo-kozuchi:GOD_MAIN` |
| 顔・表情（補） | `public/assets/gods/taiyo/front.webp`（または `front_640.webp`） | `taiyo-kozuchi:GOD_FRONT` |
| 衣装の別角度（任意） | `public/assets/gods/taiyo/keyvisual.webp`（**背景は写さない**と明記して添付） | SGG 公式キービジュアル |
| 画風（任意） | `public/assets/cards/card_common_attack_01.webp`・`card_common_attack_02.webp` | 自作カード絵（決定37） |

- **権利**：SGG 二次創作ガイドライン v1.0.0（`docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md`）§2 は、公式配布素材を**生成 AI サービスへの入力・参照画像として使うこと**と商用利用を許可している。ただし同 §2 のとおり**生成物と公開方法の責任は制作者**にあり、**利用する生成サービスの規約（商用可否・入力画像の扱い・生成物の権利）は CEO が確認**する。規約が不明確なサービスには公式素材をアップロードしない。**有料プラン・新規課金・API 課金が必要なら、使う前に CEO 承認**（AI は判断しない）
- **記録**：生成日・サービス名・プラン・プロンプト全文・添付した参照画像（ファイル名と公式 ID・sha256）・`SGG-FAN-CREATION-GUIDELINES-1.0.0` を `art-source/README.md` に 1 行（P15 素材台帳：Source／Creator／Terms／Evidence）

## 14. 書き出し・納品・配置

| 段 | 内容 |
|---|---|
| master | `art-source/cards/card_taiyo_attack_01_v2.png`（生成されたままの PNG・加工はクロップ禁止／色調整のみ可） |
| 配信 | **640×960 WebP・quality 85・effort 6・lanczos3・alpha なし・≤160KB**。160KB を超えたら q80→q75 まで下げてよい（q75 未満は不可。それでも超える場合は背景のノイズ過多＝再生成） |
| 書き出しコマンド（例） | `node -e "require('sharp')('art-source/cards/card_taiyo_attack_01_v2.png').removeAlpha().resize(640,960,{kernel:'lanczos3'}).webp({quality:85,effort:6}).toFile('public/assets/cards/card_taiyo_attack_01_v2.webp')"` |
| 配置 | `public/assets/cards/card_taiyo_attack_01_v2.webp`（**新しいファイル名**。旧 `card_taiyo_attack_01.webp` は残す＝ロールバック・Before 比較用。同名上書きはキャッシュで旧絵が混ざるため禁止） |
| 登録（After-2 の変更はこの 1 行だけ） | `src/core/data/cardArt.ts:64` の `card_taiyo_attack_01: '/assets/cards/card_taiyo_attack_01.webp'` → `'/assets/cards/card_taiyo_attack_01_v2.webp'`（`<img width=512 height=768>` は比率が同じなので変更不要） |
| 実施者 | 画像の生成＝CEO。書き出し・配置・登録・計測＝AI（実装担当 Lane） |

## 15. 受け入れチェック

### 15-1. 機械チェック（`node scripts/lane3-card-premium/accept-art.mjs <master.png> <delivered.webp> [--face x,y,w,h]`）

| ID | 区分 | 内容 |
|---|---|---|
| A1〜A3 | MUST | master ≥1024×1536（推奨 1536×2304）・2:3 ±0・alpha なし |
| A4・A5 | MUST | 文字帯 y 55〜100%：平均明度 ≤0.20・edge ≤0.05 |
| A6 | MUST | 遷移帯 y 47〜55%：平均明度 ≤0.30 |
| A7・A9・A10 | TARGET | 焦点帯 edge ≥ 左右帯 ×1.8／焦点帯 − 左右帯の明度 ≥0.10／最も明るい 5% の半分以上が焦点帯 |
| A8 | MUST | 左右帯（背景）edge ≤0.06 |
| A11・A12 | MUST | コスト珠域 明度 0.12〜0.50・edge ≤0.08／専用札域 明度 ≤0.55 |
| A13 | MUST | 外周 3%（上 5%）の 99 パーセンタイル明度 ≤0.85 |
| A14 | MUST | 紫の面積 ≤2%（色相 260〜335°・彩度 >0.35・明度 >0.12） |
| A15・A16 | MUST | 四辺が単色でない・四隅と四辺中央の 8 点が純黒／純白でない（スタイルガイド §14） |
| A17 | TARGET | 顔 − 左右帯の明度差 ≥0.20（`--face` で顔の枠を % 指定） |
| B1〜B4 | MUST | 配信 640×960 WebP・≤160KB・alpha なし・ファイル名 `card_taiyo_attack_01_v2.webp` |

**合格＝MUST 全部 PASS かつ TARGET の FAIL が 1 つ以下**（FAIL した TARGET は目視で理由を記録）。
校正（現行原画に掛けた結果）：MUST FAIL 12／TARGET FAIL 4＝不合格（文字帯 0.276／0.103・紫 3.9%・左右帯 edge 0.091・最も明るい画素の焦点帯率 0.37・顔の明度差 0.079）。妨害カード `card_common_hinder_01` の紫は 47.6%（紫の検出が効くことの確認）。
出力：`scripts/lane3-card-premium/out/accept/<名前>.json` と領域図 `<名前>-zones.png`（機械的に描いた枠のみ）。

### 15-2. 目視チェック（CEO または AI。After-2 の build で撮った SP 360・390・430／PC 1508 のスクリーンショットで判断）

1. 100×150px に縮小しても「**大耀が・小槌を・振り抜いて殴る**」と読める
2. §5 の identity 13 項目：特に **①金髪ショート ②迷彩キャスケット＋ベージュの宝袋 ③オレンジのバイザー ④ヘッドセット ⑪テック小槌（金の円筒・同心円の打撃面・黒い柄）** が揃っている。茶髪・着物・木槌が残っていない
3. 舞台の公式 大耀と**並べて同じ人物**に見える（手札と舞台を同じ画面で撮って確認）
4. 顔と打撃面が名前の行（カードの 55%）より上にあり、**文字が顔・小槌に一切かからない**
5. 効果文・条件行が**暗幕だけで読める**（文字の下に明るい模様・細かい模様がない）
6. コスト珠・「大耀専用」の札の下に、目・バイザー・紋・打撃面がない
7. READY（金の縁・上辺の光・点火の帯）が乗ったとき、**絵の金（小槌）と縁の金が同じ素材**に見え、⚡の金の数字（34px）までつながる
8. 手札の他のカード（共通カード）と並べて、画風（線・塗り・背景密度）が浮かない
9. 余計なもの（文字・透かし・枠・別の人物・風景・紫）がない
10. 生成物に、サービス固有の透かし・署名が入っていない

---

## 16. 生成が合格しなかったとき

- 数値の MUST が FAIL：プロンプトの該当節（構図・下 45%・色）を強めて**再生成**（生成画像を AI が加工して合わせることはしない。暗くするための全面の塗りつぶし・ぼかしは不可。軽い色調整のみ可）
- 3 回再生成しても A4／A5（文字帯）が通らない場合：After-2 は保留し、After-1（レイアウトのみ）で Human QA を先に行う（Pilot の判断を止めない）
- 有料サービスへの切り替えが必要になった場合：**CEO 判断**（§13）

## 17. 生成履歴と再生成用の追記（After-2 Pilot）

### 17-1. 1 回目（2026-09-27・CEO 生成・ChatGPT Plus・学習 OFF）— 機械受入 **FAIL**（MUST 6／TARGET 3）
master `art-source/cards/card_taiyo_attack_01_v2.png`（1024×1536・sRGB・alpha なし・C2PA `gpt-image` あり・sha256 `193594f4841f9cef…`。保存時の二重拡張子 `.png.png` を AI がリネームのみ・中身は無加工）

| 判定 | 項目 | 実測 | 原因（目視） |
|---|---|---|---|
| PASS | A1 A2 A3 A12 A14 A15 A16 | 1024×1536・2:3・alpha なし・専用札域 0.255・紫 0 | — |
| **FAIL MUST** | A4 文字帯 y55〜100% 明度 ≤0.20 | **0.292** | 下 45% にも炎・光の帯・火の粉が広がり、脚が闇に溶けていない |
| **FAIL MUST** | A5 文字帯 edge ≤0.05 | **0.0574** | 同上（光の筋・膝当て・ブーツの描き込み） |
| **FAIL MUST** | A6 遷移帯 y47〜55% 明度 ≤0.30 | **0.515** | 胴の位置に金白の衝撃の帯が横切る |
| **FAIL MUST** | A8 左右帯 edge ≤0.06 | **0.0871** | 背景全面が炎・粒・光の筋 |
| **FAIL MUST** | A11 コスト珠域 明度／edge | 0.476／**0.1062** | 左上の角に炎とエネルギー弧 |
| **FAIL MUST** | A13 外周 3% の 99pct 明度 ≤0.85 | **0.992** | 左辺〜左上が白飛び（打撃面が左端で切れ、外周まで発光） |
| FAIL TARGET | A7／A9／A10 | 0.1019/0.0871・0.043・0.291 | 焦点帯と背景の差がない（全面が明るく密） |

**identity（目視・AI 所見・最終判定は CEO Human QA）**：帽子（迷彩ダマスク＋ベージュ切り替え・宝袋紋）・オレンジのバイザー＋緑 HUD・白い耳当て＋ブームマイク・金フープ・琥珀の瞳・太眉・笑顔・迷彩ベスト＋オレンジ紐房・金の腕輪・黒グローブ・テック小槌（金＋ガンメタ・同心円の打撃面・雲形の飾り）が揃い、**舞台の大耀と同一人物に見える水準**。ただし打撃面が左端で切れ、胸の回路ライン 2 本が房で隠れている。結論：**絵の方向は正しい。落ちたのは構図と明暗（Brief §4 の領域指定）だけ** → §16 のとおり **再生成（2 回目）**。加工での救済はしない

### 17-2. 2 回目用プロンプト（§12-1 の先頭にこのブロックを追加し、他は変更しない）

```
【最重要・構図と明暗（必ず守る）】
・テック小槌の光る打撃面は画面の中に完全に収める（左端・上端で切らない）。打撃面の中心は画面の横 30〜45%・上から 30〜42%。顔の中心は横 50〜60%・上から 20〜30%。
・画面の下 45%（腰から下・脚・ブーツ）は、暗い臙脂（#3a0f12）〜ほぼ黒へ溶けて消える「暗く静かな領域」にする。そこに炎・光の帯・火の粉・衝撃の弧・明るい模様を一切置かない。膝当てやブーツも暗いシルエット程度にとどめる。
・光の弧は 1 本だけ、細く、打撃面の周りだけに描く。画面全体に炎や光の筋を広げない。エフェクトの面積は画面の 25% 以下。
・画面の四隅と四辺の外周 3% は暗い臙脂の地だけにする。特に左上（横 0〜26%・上 0〜15%）と右上は何も置かない。白飛びさせない。
・背景は赤の放射（#e5484d → #3a0f12）だけ。炎・粒・光の筋・稲妻の模様を背景に入れない。青海波は上の角に 15〜30% の薄さで。
・いちばん明るいのは顔と打撃面の 2 か所だけ。それ以外は中〜暗の明度に抑える。
・胸の縦 2 本のオレンジに光る回路ラインが見えるように、紐と房で隠さない。
```

Negative（§12-3）に追加：`fire filling the frame, glowing background everywhere, bright lower half, light streaks over legs, sparks in the lower area, cropped mallet head, mallet cut off at the edge, bright corners, white-out edges, energy arc in the top-left corner`

運用：添付は 1 回目と同じ Kit 公式 2 枚（`main.webp`・`front.webp`）のみ。学習 OFF 維持。保存名 `art-source/cards/card_taiyo_attack_01_v2.png`（**1 回目のファイルは AI が `card_taiyo_attack_01_v2_try1.png` に退避済み**・比較用に残す）。残り再生成回数：**2 回**

### 17-3. 2 回目（2026-09-27 23:37 保存・CEO 生成・ChatGPT Plus・学習 OFF・§17-2 の追記あり）— 機械受入 **MUST FAIL 2／TARGET FAIL 1**（大幅改善・AI 所見は下記）
master `art-source/cards/card_taiyo_attack_01_v2.png`（1024×1536・sRGB・alpha なし・C2PA `gpt-image` あり・sha256 `25a6dc0f700e7201…`。二重拡張子 `.png.png` を AI がリネームのみ）。配信候補 `card_taiyo_attack_01_v2.webp`＝640×960 q85・**92,130 B**（≤160KB）

| 判定 | 項目 | 1 回目 | **2 回目** | 所見 |
|---|---|---|---|---|
| PASS | A1 A2 A3 A9 A10 A11 A12 A13 A14 A16 | — | 文字帯 **0.051**／edge **0.0097**／遷移帯 **0.262**／焦点差 **0.203**／最明 5% の焦点帯率 **0.717**／コスト珠域 0.216/0.0678／外周 0.403 | 1 回目の FAIL（A4 A5 A6 A11 A13）はすべて解消。下 45% は暗い臙脂に溶け、四隅・外周は暗い地のみ |
| **FAIL MUST** | A8 左右帯 edge ≤0.06 | 0.0871 | **0.0644**（超過 7%） | 唯一許可したエフェクト＝打撃面の弧が左帯（x<12%・y 15〜37%）に掛かる。右帯は 0.017〜0.029 で合格域。SP では左 3.3% が cover で切れる |
| **FAIL MUST** | A15 四辺が単色でない（std>0.01） | PASS（下辺が明るかったため） | **下辺 std 0.002** | 下辺 1 行は rgb ≈(30,0,2) の暗い臙脂で純黒 0%（A16 の下辺 2 点 0.03／0.02 は合格）。**Brief §8「下端はほぼ黒い臙脂」を忠実に満たした結果**で、黒帯・余白（A15 の目的）ではない → A4 と A15 の仕様矛盾（指標側の欠陥） |
| FAIL TARGET | A7 焦点 edge ≥ 左右帯 1.8 倍 | 1.17 倍 | **1.65 倍** | TARGET FAIL ≤1 の許容内 |

**identity（AI 所見）**：1 回目と同じ水準で大耀の意匠が揃い、打撃面は画面内に収まり、胸の回路ライン 2 本も見える。構図は Brief §4 の領域指定にほぼ一致。

**AI 判断（要 CEO 確認）**：A15 は指標欠陥（下辺の校正が要る）、A8 は僅差。AI は accept-art.mjs の A15 校正を試みたが、受入基準の変更にあたるため実行を取り下げ、**スクリプトは元のまま**にした（基準を変える判断は CEO に委ねる）。推奨＝**2 回目を候補として Human QA へ進める（A8 僅差・A15 仕様矛盾を記録）**。代替＝3 回目（最後）の生成：「弧を左端まで伸ばさない・打撃面の中心を横 35〜45% へ」を追記。

### 17-4. CEO 決定（2026-09-27）— 2 回目を Human QA 候補として採用
- 3 回目は温存（最後の 1 回）。A15＝Brief §8 を満たしており黒帯・余白ではないため **指標側の問題として記録**（`accept-art.mjs` の基準は今回は変更しない）。A8＝0.0644（基準 0.06）を **既知の僅差**として記録し、実カードサイズで Human QA 判定
- Human QA 5 問：①舞台の大耀と同一人物に見えるか ②Before よりカード原画として明確に高品質か ③カード名・効果文・コストの読みやすさを邪魔していないか ④左側の光の弧が READY 金縁やカード UI と干渉して見えないか ⑤手札サイズでも顔と小槌が一瞬で認識できるか
- Human QA READY で停止。Production Release には進まない

---

## 18. After-2 Fast Gate（2026-09-28・AI 実施）— **HUMAN QA READY**

対象：§17 の 2 回目 master（`art-source/cards/card_taiyo_attack_01_v2.png`）を §14 のとおり書き出した配信ファイル。機械受入（§15-1）は 2 回目で **A8 左右帯 edge 0.0644（≤0.06 に対し僅差）・A15 下辺の較正問題**が残ったが、§17 の判断（再判定しない・目視 Human QA に回す）のとおり、本 Gate では再判定せず記録のみ。

### 18-1. 変更（Production `01b66f4` に対する diff＝この 2 ファイルだけ）

| ファイル | 内容 |
|---|---|
| `public/assets/cards/card_taiyo_attack_01_v2.webp`（新規） | 640×960・WebP・alpha なし・**92,130 B**（上限 160KB）・md5 `39ada1c61f6d6705e2886028dd1d2fa6`。旧 `card_taiyo_attack_01.webp`（117,682 B）は残す |
| `src/core/data/cardArt.ts:64` | `card_taiyo_attack_01: '/assets/cards/card_taiyo_attack_01_v2.webp'`（1 行） |

worktree `C:/Users/kimi1/SevenGodsGame-after2`・branch `feat/lane3-after2-art`・commit **`d1e3b30`**（`git diff 01b66f4 --stat`＝2 files changed, 1 insertion, 1 deletion）。push なし・merge なし・Production 変更なし・画像生成なし・原画ファイル無加工。

### 18-2. 静的チェック・テスト・ビルド（worktree）

| 項目 | 結果 |
|---|---|
| `tsc --noEmit -p tsconfig.app.json` | 0 error |
| `oxlint src` | 0 |
| `vitest run src/core src/components/battle` | **67 files / 793 passed**（20.6s。`src/core` と `src/components/battle` 配下の全 test。それ以外の hooks／setup／balanceSim 等の test は対象外＝未実行） |
| `vite build` | 成功。`dist/assets/index-BCpZWuo0.js`（441.21 kB）・`dist/assets/index-C_PvVv3w.css`（167.65 kB） |

**Production build（`C:/Users/kimi1/SevenGodsGame-d240-rc/dist`・`01b66f4`）との比較**

| bundle | Production | After-2 | 判定 |
|---|---|---|---|
| CSS | `index-C_PvVv3w.css` md5 `c198bfae4a056970164d553db163ce49` | `index-C_PvVv3w.css` md5 `c198bfae4a056970164d553db163ce49` | **byte-identical** |
| JS | `index-DI4DksbZ.js` md5 `d30c540489916ca399f5adb265aab782`（421,822 B） | `index-BCpZWuo0.js` md5 `9da84605ed56a1d6090ad1a973228520`（421,825 B） | **差分は path 文字列のみ**（+3 B＝`_v2`） |

JS の差分証明（`scratchpad/jsdiff.mjs`）：共通 prefix 307,558 B＋共通 suffix 114,264 B、差分区間は `card_taiyo_attack_01:\`/assets/cards/card_taiyo_attack_01.webp\`` → `…_01_v2.webp\`` の 1 箇所。After-2 の JS でこの path を旧 path に戻した文字列は **Production の JS と完全一致（`=== true`）**。dist のファイル一覧の差＝`assets/cards/card_taiyo_attack_01_v2.webp` の追加と JS の hash 名のみ。

### 18-3. ブラウザ Gate（BEFORE＝Production dist `:4232`／AFTER＝After-2 dist `:4231`・別 build・注入なし）

`scripts/lane3-card-premium/gate-after1.mjs`（決定236 の Gate をそのまま流用。出力名の `aprime`＝BEFORE（Production）、`after1`＝AFTER（After-2 build）に読み替え）→ `out/gate-after2/gate-after1.json`

| 検査 | 結果 |
|---|---|
| 『豪快な一撃』文字の開始（標準 5 画面） | **54.88%**（Before 54.88% と同値・≥54 PASS）。低い画面 390×700＝50.1%・1280×620＝52.24%（Before と同値） |
| 暗幕の開始 | SP 48.55%／PC 48.78%（Before と同値。Gate 出力の「artWin 54-56 false」は決定236 の実行でも同じ値 48.5／48.8 で出ていた較正済みの表示＝暗幕開始の実測値で、仕様 §3「SP 48.5%／PC 47.5%」どおり） |
| 文字のはみ出し（本文・条件行・READY 時） | 全画面 ≤0（−7.44／−8.36／READY −7.59／−8.53） |
| 条件行 | 1 行・横 overflow 0・`⚡ 共鳴4以上:敵に40` |
| コスト珠 | 26×26 @(−1,−1)・absolute・50% 円（全 14 件） |
| 「大耀専用」札 | 本文の外（全件） |
| READY の縁（重ね層） | dx/dy/dw/dh＝0/0/0/0・opacity 1・Before と同一（全 14 件） |
| 豪快な一撃を含む手札の他カード（seed 1／5・7 画面） | rect 差分は `lane3-card-5` の SP 4 画面で **x ±1px のみ**（手札の横スクロール位置の丸め。決定236 の Gate でも同じ seed・同じ ±1〜2px で発生した既知のノイズ。y/w/h/position/text の差 0） |
| 豪快な一撃を含まない手札（seed 0／2・6 画面＝12 run） | **moved 0・outerDiff 0・要素数一致** |
| console error | **Before 0／After 0** |

`scripts/lane3-card-premium/gate-after2-shots.mjs`（新規・After-2 用の追加撮影）→ `out/gate-after2/gate-after2-shots.json`・`gate-after2-shots-reward.json`

| 検査 | 結果 |
|---|---|
| 手札の `<img src>` | Before `/assets/cards/card_taiyo_attack_01.webp` → After `/assets/cards/card_taiyo_attack_01_v2.webp`（naturalSize 640×960・complete） |
| 手札全体の**画素 diff**（同一 clip・Δ>8/255 を数える） | 豪快な一撃の外形＋3px の**外＝0 px**（360／390／430／1508 の 4 画面とも）。内＝94,974 px（SP・dpr3）／52,570 px（PC・dpr2）＝**絵の画素だけが違う**。初回実行の 390×844 で外に 40 px（Δ≤11・12×13 px の塊・対象カードから 100px 以上離れた位置）が出たが再実行で 0＝一過性ノイズ |
| デッキ構築（390／1508） | `.deck-builder-card` の img が v2・カード 168×240.7（SP）／151×240.7（PC）。Before と同寸 |
| 報酬 3 択（390／1508・`?seed=lane3-reward-17&enemy=trial`・自動プレイで勝利） | 3 択＝剛撃／豪快な一撃／秘技・満ちる（Before・After 同一）。`.reward-card` の img が v2・140×200。Before と同寸 |
| console error | Before 0／After 0 |

### 18-4. スクリーンショット（`scripts/lane3-card-premium/out/gate-after2/`・左＝Before（Production）／右＝After-2）

| 種類 | ファイル |
|---|---|
| 手札のカード calm（Before｜After 横並び） | `360x780-card-calm-side.png`・`390x844-card-calm-side.png`・`430x932-card-calm-side.png`・`1508x660-card-calm-side.png` |
| 手札のカード READY（擬似・横並び） | `360x780-card-ready-side.png`・`390x844-card-ready-side.png`・`430x932-card-ready-side.png`・`1508x660-card-ready-side.png` |
| 手札全体（横並び） | `360x780-hand-side.png`・`390x844-hand-side.png`・`430x932-hand-side.png`・`1508x660-hand-side.png` |
| 画面全体 | `390x844-before-full.png`／`390x844-after2-full.png`・`1508x660-before-full.png`／`1508x660-after2-full.png` |
| デッキ構築（横並び＋全体） | `390x844-deck-card-side.png`・`1508x660-deck-card-side.png`・`{390x844,1508x660}-{before,after2}-deck-full.png` |
| 報酬 3 択（横並び＋全体） | `390x844-reward-side.png`・`1508x660-reward-side.png`・`{390x844,1508x660}-{before,after2}-reward-full.png` |
| 単体（横並びの元） | `<vp>-{before,after2}-card-{calm,ready}.png`・`<vp>-{before,after2}-hand.png`・`<vp>-{before,after2}-deck-card.png`・`<vp>-{before,after2}-reward.png` |
| gate-after1.mjs の出力（`aprime`＝Before・`after1`＝After-2） | `<vp>-aprime-card-ready.png`／`<vp>-after1-card-ready.png`（7 画面）・`{390x844,1508x660}-{aprime,after1}-hand.png`・`{390x844,1508x660}-after1-full.png` |
| ログ | `out/gate-after2-console.log`・`out/gate-after2-shots-console.log`・`out/gate-after2-shots-reward-console.log` |

AI 目視（§15-2 の予備確認・最終判定は CEO Human QA）：手札 100×158／116×164 でも「迷彩キャスケット＋宝袋紋・オレンジのバイザー＋緑 HUD・ヘッドセット・金の腕輪・テック小槌の同心円の打撃面」が読め、顔と打撃面は名前の行より上。文字帯（名前・効果文・条件行）は暗幕上で Before と同じ読みやすさ。コスト珠・専用札の下に目・打撃面はない。デッキ構築（高さ 240px＝原画の上 5%・下 18% が切れる）と報酬（140×200）でも焦点帯は残る。READY 時の金の縁と小槌の金は同系色で連続して見える。

### 18-5. Human QA の起動手順（CEO）

1. `cd C:/Users/kimi1/SevenGodsGame-after2 && npx vite preview --host 127.0.0.1 --port 4231 --strictPort`（dist は commit `d1e3b30` の build 済み。再 build 不要）
2. Before は `cd C:/Users/kimi1/SevenGodsGame-d240-rc && npx vite preview --host 127.0.0.1 --port 4232 --strictPort`（Production `01b66f4`）
3. `http://127.0.0.1:4231/?seed=lane3-card-1` → 大耀 → この構成で始める → 蒼海の龍神 → この構成でバトル開始（ふつう）。初手に『豪快な一撃』。質問は `LANE3_CARD_PREMIUM_V2_PRE_AUDIT.md` §11-5 の Q1〜Q6（After-1 は決定236 で Production 済みのため、Before＝Production がそのまま After-1 に相当）
4. 実機 SP は同一 LAN で `--host 0.0.0.0` に変えて開く（決定231／236 の Human QA と同じ手順）

**判定：HUMAN QA READY**（BLOCKER なし。サーバー 2 つとも停止済み・4231／4232 解放確認済み）

## 19. CEO Human QA（2026-09-28・PC＋iPhone・Before `01b66f4`／After-2 `d1e3b30`）— **PASS 5/5・2 回目の原画を採用**
①舞台の大耀と同一人物に見える **はい**／②Before より明確に高品質 **はい**／③読みやすさを邪魔していない **はい**／④左の弧が READY 金縁・UI と干渉しない **はい**／⑤手札サイズで顔と小槌が一瞬で分かる **はい**。3 回目の生成は不要（CEO）。
→ **Asset Pipeline Pilot の前提実験は成立**：CEO の既存手段（ChatGPT Plus・学習 OFF）＋Kit 公式 2 枚の参照入力で、機械受入（構図・明暗）と identity（Q1）を同時に満たす原画が 2 回で得られた。敵 7 体展開の判断材料として `docs/ENEMY_ART_DIRECTION_BRIEF_V1.md` へ引き継ぐ。

## 20. Release Gate（2026-09-28）— **PASS・Production Release 直前で停止（CEO 承認待ち）**
| 項目 | 値 |
|---|---|
| QA 後片付け | サーバー 4211／4212 停止（LISTEN 0）・Firewall「QA6 After2 (temp)」削除（残 0・`(temp)` 系 0・Wi-Fi Public） |
| RC | `release/after2-card-art-rc`＝**`d1e3b30`**（Production `01b66f4` 直上 1 commit・衝突 0） |
| Production との差分（最終確認） | **2 files のみ**：`public/assets/cards/card_taiyo_attack_01_v2.webp`（新規・92,130 B・md5 `39ada1c6…`）＋`src/core/data/cardArt.ts` 1 行（`card_taiyo_attack_01` の参照を `_v2.webp` へ）。旧 `card_taiyo_attack_01.webp` は残置 |
| Gate | tsc 0／lint 0／build OK。RC build＝Human QA の After build と **JS/CSS md5 一致**（`9da84605…`／`c198bfae…`）。CSS は Production と同一 |
| tests | full vitest **1,235 PASS**／9 skip（単独実行・timeout 0） |
| Rollback | Production `6692087936`（`01b66f4`）へ戻す or `cardArt.ts` の 1 行 revert |

## 21. Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-28 JST・CEO 承認）
| 項目 | 値 |
|---|---|
| merge／push | fast-forward `01b66f4`→**`d1e3b30`**、`git push origin master`（05:38 JST） |
| Vercel | deployment **`6697593799`** success |
| 配信 bundle | JS `index-BCpZWuo0.js` `9da84605…`／CSS `index-C_PvVv3w.css` `c198bfae…`＝RC と **md5 一致**。`card_taiyo_attack_01_v2.webp` 配信 **92,130 B・md5 `39ada1c6…` 一致**。旧 `card_taiyo_attack_01.webp`（117,682 B）も残置 |
| Narrow Production Smoke（Before＝ローカル `01b66f4` build／After＝Production） | ①豪快な一撃の `<img>`＝**`_v2.webp`**（手札 360/390/430/1508・デッキ構築 390/1508・報酬 3 択 390/1508 すべて）②**他 59 枚：手札全体の画素 diff は豪快な一撃の外形の外 0／9／29／98 px**（360/390/430/1508。内側 52,570〜95,003 px に対し ≤0.19%。Gate 時は 0 で、差は Vercel 配信と local preview のサブピクセル／アニメ位相の描画差＝要素数・箱・文字はすべて同一）③寸法／文字配置：文字開始 54.88%→54.88%・珠 26.52×26.52・条件行 1 行・READY 縁 0/0/0/0 同一（1508／1280／390 の全条件）④console error Before/After **0／0**。no-target 手札 12 run moved 0／outerDiff 0 |
| Rollback 先 | Vercel **`6692087936`**（`01b66f4`・決定240）、または `cardArt.ts` 1 行 revert |
| 後片付け | 一時 QA サーバー 0（4211／4212／4232 停止）・`(temp)` Firewall **0**・Wi-Fi Public |

**決定243 Lane3 After-2 = PRODUCTION LIVE / CLOSED。** Production＝**`d1e3b30`**。証拠 `scripts/lane3-card-premium/out/prod-after2/`。敵 7 体展開・次の asset 生成は CEO 指示まで開始しない。
