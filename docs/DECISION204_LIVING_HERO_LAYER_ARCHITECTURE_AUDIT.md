# 決定204（候補）— Living Hero Layer Architecture 技術監査

- 日付：2026-09-19（CEO AWAY MODE・Phase D）
- モード：**READ / MEASURE / TEST / DESIGN ONLY**（Production／runtime／master 変更 0・push 0・deploy 0・課金 0・fal 追加生成 0・asset 差し替え 0）
- 対象：H3 Test01〜03（`C:\Users\kimi1\Downloads\ebisu-h3-test0{1,2,3}.mp4`）、canonical `public/assets/gods/ebisu/keyvisual-hero.webp`（1086×1448）、E1 Home（Production `bba4c67`）、`docs/PHASE7_ENTRANCE_CINEMATIC_FEASIBILITY.md`（未 commit）
- 前提（CEO 確認済み）：H3 単体では恵比寿・巨大鯛・構図が temporal regeneration する。水面・夕景・反射など**環境の動画素材としては有望**
- 区分：構成の選定は **AI判断**（CLAUDE.md §6-2）。素材生成の費用・権利は §11 で CEO／Specialist 判断に分離
- 計測スクリプト：`scripts/decision204-living-hero-audit/probe-video.mjs`（untracked）。**ヘッドレス Edge がこの動画の decode で毎回クラッシュ**（空きメモリ 0.9GB 環境）したため、ブラウザ内 decode／フレーム抽出は未完。諸元は MP4 ヘッダ解析で取得

---

## 0. 結論（先に）

**採用構成（1 案）：「Canonical-over-Video ＋ 羽根つき環境マット」（COV-M）**

```
.home-hero-art（position:relative・overflow:hidden・既存）
 ├ <video class="home-hero-env">   … H3 由来の環境ループ（768×1024・無音・5.18s→ping-pong 10.4s）。最下層・opacity 0 で開始
 ├ <img  class="home-hero-img">    … canonical still（既存・LCP 要素・fetchPriority high）
 │     data-living="on" のとき mask-image: url(ebisu-env-matte.webp) を付ける
 │     ＝ 空・海面・港の灯だけ透け、恵比寿・鯛・竿・糸・幟・しぶきは 100% 元のピクセル
 └ ::after                          … 既存の紺グラデ（変更なし）
```

- **神は 1 ピクセルも動画に依存しない**（still が最上層・マットの不透明部は元絵そのもの）→ 同一性は構造的に保証
- 透明動画は**不要**（透けるのは still 側。VP9 alpha／HEVC alpha の二重管理を避ける）
- canvas も**不要**（CSS `mask-image` は compositor 完結。iOS 15.4+ 無接頭辞・それ以前は `-webkit-mask-image`。repo 内で既に `battle.css:1727/2389` が mask を使用）
- 動画が来ない／再生できない／`prefers-reduced-motion`／低電力モード／2g・3g → **マットを外して E1 と同一の静止 Home**（poster も canonical と同じ URL）
- LCP 不変（LCP 要素は今の `<img>` のまま。動画は `load` 後・`preload="none"`・`playing` まで opacity 0）／CLS 0（absolute・既存ボックス内）／追加転送 ≤1.0MB（動画 1 本・遅延）＋マット ≤100KB
- 既存 E1 との統合位置は `HomeScreen.tsx` の `.home-hero-art` 内・`<img>` の**前**に `<video>` を 1 要素追加するだけ。`heroGod.ts`／`homePrimary.ts`／storage は不変

**今回は実装しない。** 次段は「Ebisu 1 柱の試作（マット 1 枚・動画 1 本の再エンコード）→ Human seam test ×3 → 判定」。

---

## 1. H3 Test01〜03 の実測諸元（MP4 ヘッダ解析）

| 項目 | Test01 | Test02 | Test03 | 判定 |
| --- | --- | --- | --- | --- |
| 容量 | 11.46MB | 10.84MB | 11.12MB | **そのままは不可**（予算 ≤1.2MB／柱） |
| 解像度 | 768×1024 | 768×1024 | 768×1024 | 3:4＝canonical（1086×1448）と同比 → 位置合わせ可 |
| 尺／フレーム | 5.18s／124f（≈23.9fps） | 同 | 同 | 5 秒ループの素材として妥当。ループ設計はされていない |
| codec | H.264 **Baseline**（profile 66）level 4.1 | 同 | 同 | 再エンコード必須（High profile・CRF・`+faststart`） |
| ビットレート | ≈18.5Mbps | ≈17.5Mbps | ≈18.0Mbps | 1.0〜1.5Mbps へ（÷12〜18） |
| 音声 | AAC あり | あり | あり | **除去必須**（音つきは iOS で自動再生不可） |
| faststart | ○ | ○ | ○ | – |
| 生成日時 | 05:43 | 05:49 | 05:52 | 同一プロンプト系列と推定【未確認】 |

**未計測（要 実機／別環境）**：フレーム単位の環境ドリフト量・ループ継ぎ目の差分・3 本のうち空／海面の動きが最も自然なもの。理由：ヘッドレス Edge（`channel: 'msedge'`）が本動画の decode で renderer crash（`--disable-gpu`・software decode 指定でも再現）。Playwright 同梱 Chromium は H.264 非対応。**CEO 帰宅後に PC の Edge／iPhone で目視選定**する。

---

## 2. canonical の領域分析（目視・`keyvisual-hero.webp`）

| 領域 | 位置 | 動かしてよいか | 備考 |
| --- | --- | --- | --- |
| 空・夕陽・雲 | 上 35%（横幅全体） | **可**（H3 の主戦場） | 低周波＝マット境界のドリフトが目立ちにくい |
| 鳥 3 羽 | 左上 | 可（動画に任せる） | 逆再生 loop では飛び方が不自然になりうる → マット境界の外に置くか許容 |
| 海面・鳥居の反射・太陽の道 | 左中（水平線〜鯛の頭上） | **可**（もっとも効果が大きい） | 鳥居本体（高周波・直線）は **固定**：動画側でズレると即バレる |
| 港の建物・帆柱・提灯 | 右中 | 建物＝固定／**提灯の明滅のみ可**（ごく弱く） | 高周波。基本は still |
| 恵比寿・鯛・幟「恵比寿」「大漁」 | 中央〜右下 | **不可（100% 固定）** | 同一性の核 |
| 竿・釣り糸 | 空を横切る細線 | **不可** | ここが「領域マスクでは足りない」理由。**ピクセル単位の前景マット**が要る |
| 水しぶき | 下部（鯛の周囲） | 原則固定 | 鯛と絡んでいるため分離不能。動かすと継ぎ目が出る |

→ 透ける領域は **空（上帯）＋ 開けた海面（左帯）＋ 提灯の明滅（任意・弱）** に限定。境界は 12〜24px の羽根（feather）。

---

## 3. 構成の比較

| 構成 | 同一性 | 継ぎ目 | 透明動画 | 実装層 | 負荷 | fallback | 評価 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A. H3 動画をそのまま Hero に | **×**（神が再生成される） | – | 不要 | video | 低 | poster | **NO-GO**（決定195・feasibility §8-2 と同じ結論） |
| **B. COV-M：canonical still を最上層＋環境マットで透かす／下に環境動画** | **◎**（still が最上層） | マット境界のみ（低周波領域に置けば小） | **不要** | CSS `mask-image` | 低（compositor） | マットを外すだけで E1 | **採用** |
| C. 被写体だけ切り抜いた透過 still を動画の上に | ◎ | **大**（鳥居・港・しぶきまで動画側になりドリフトが見える） | 不要（still 側 alpha） | img alpha | 低 | 切り抜き still を残せば E1 と非同一 | 不採用 |
| D. canvas で毎フレーム合成（video → still with matte） | ◎ | B と同じ | 不要 | JS＋2D | **中**（毎フレーム drawImage・rerender 0 だが CPU） | 同 | B が非対応の環境の保険のみ |
| E. `clip-path: polygon()` で領域を切る | ◎ | **硬い境界**（羽根なし） | 不要 | CSS | 低 | 同 | 不採用（fallback にも不向き） |
| F. 環境だけの透過動画（VP9 alpha WebM ＋ HEVC alpha MOV） | ◎ | 動画側 alpha に依存 | **必要** | video | 中 | 二重管理 | 不採用（feasibility §3 と同じ） |
| G. CSS のみの living still（feasibility 第 1 段） | ◎ | なし | 不要 | CSS | 最低 | – | **B と併用可**（camera pull-back・粒子）。単独では「静止画に見える」懸念が残る |

## 4. foreground / background mask の作り方（設計）

- **形式**：1086×1448・グレースケール（白＝still を表示、黒＝動画を透かす）・WebP lossless または PNG-8。想定 50〜120KB。`mask-mode: luminance`（既定は alpha なので `mask-mode: luminance` を明示、または alpha PNG で作る）
- **内容**：恵比寿・鯛・竿・釣り糸・幟・しぶき・鳥居本体・建物＝白。空・海面・（任意）提灯の光暈＝黒。境界は 12〜24px の羽根
- **作成手段**：①手作業（GIMP／Photoshop の選択＋ぼかし。0.5 日／柱）②ローカル AI セグメンテーション（rembg／SAM 等。細線の竿・糸は手直し必須）。**fal 追加生成は不要**（マットは canonical から作る）
- **検証**：still × マット × 単色背景を重ねて表示し、神・鯛・糸が 100% 残ることを目視＋差分 0 で確認（同一性テスト）

## 5. 動画側の仕様（既存 H3 を再エンコードして使う）

| 項目 | 仕様 |
| --- | --- |
| 素材 | Test01〜03 のうち空・海面のドリフトが最小のもの 1 本（CEO 目視で選定） |
| ループ | **ping-pong 連結**（順→逆・10.36s）で継ぎ目を消す。逆再生で不自然なもの（鳥の飛行）はマット外か許容。トリム loop（同位相の 2 点を探す）は 5s 素材では困難 |
| 解像度 | 768×1024 のまま（透ける領域は低周波・SP の Hero 箱は 390×44svh なので十分。DPR3 で 1.5 倍拡大だが空・海面は甘さが出ない） |
| MP4 | H.264 **High**・yuv420p・CRF 26〜28・`+faststart`・**音声なし**・目標 0.6〜1.0MB |
| WebM | VP9・同条件・`<source>` の先頭（対応ブラウザが選ぶ）・目標 0.4〜0.7MB |
| 色 | still と色温度・露出を合わせる（グレーディングはエンコード時。CSS `mix-blend-mode` は使わない＝feasibility §9-1 で負荷主因） |
| 属性 | `muted playsinline loop preload="none" disablepictureinpicture` `poster=<canonical と同 URL>`。`autoplay` 属性は付けず、`load` 後に JS で `src` を付けて `play()`。`playing` 到達で `data-living="on"`（マット適用・opacity 1 へ 400ms） |
| 停止 | `visibilitychange`（非表示で pause）・Home を離れたら unmount・`navigator.connection.saveData`／`effectiveType` 2g/3g では読み込まない |

## 6. iPhone Safari・fallback

| ケース | 挙動 |
| --- | --- |
| 通常 | 無音・inline・ループの自動再生は可（feasibility 付録 A-1）。`playing` 後にのみ表示 |
| 低電力モード | 自動再生されず**ネイティブ再生ボタンが出る**（付録 A-2）→ `playing` が来ないので動画は opacity 0 のまま・マット未適用＝E1 と同一。ボタンは `opacity:0`＋`pointer-events:none` の要素上には見えない【要実機確認】 |
| `prefers-reduced-motion: reduce` | `<video>` を描画しない・マット無し（CSS 1 行） |
| 画像読込失敗／動画失敗 | `error` でマット無し。still だけが残る |
| 旧 Safari（<15.4） | `-webkit-mask-image` を併記 |
| 2g／3g／saveData | 読み込まない |

## 7. 性能・LCP・CLS

| 指標 | 見込み | 守り方 |
| --- | --- | --- |
| LCP | **不変**（E1 と同じ still が LCP 要素） | 動画は `load` 後に取得・`playing` まで opacity 0（描画されないので LCP 候補にならない）。poster は同 URL（キャッシュ） |
| CLS | **0** | `.home-hero-art` は `position:relative; overflow:hidden`・video は `position:absolute; inset:0; object-fit:cover; object-position` を still と同値 |
| 転送 | ＋0.6〜1.0MB（動画・柱ごと・遅延）＋ ≤120KB（マット） | 予算 ≤1.2MB／柱（feasibility §9-2）内 |
| decode／GPU | 768×1024・24fps・H.264 は iPhone でハードウェア decode。同時に動くのは動画 1＋既存の星空・魔法陣（CSS） | `mix-blend-mode`・`filter` のアニメ禁止。非表示で pause。SP は Home でのみ |
| メモリ | 動画 1 本分の decode バッファ（数十 MB） | Home 以外で unmount |
| rerender | **0**（React state は `data-living` の切替 1 回のみ、または DOM 属性を ref で直接） | – |

## 8. 継ぎ目（seam）の設計と検証

- 継ぎ目が出る場所は **マット境界**だけ。境界を空・海面の低周波領域に置き、12〜24px の羽根で溶かす
- 動画の環境ドリフト（構図の再生成）は境界付近でのみ問題になる → 鳥居・建物・帆柱は still 側に残す（境界を高周波の物体に掛けない）
- 検証（Motion Law 7）：**Human seam test ×3**（PC Edge・iPhone・iPhone 低電力）＋ 機械：①still×マット合成と E1 の差分＝神・鯛・糸・幟の領域で 0 ②ループ端の 2 フレーム差分（ping-pong なら定義上 0）
- 「別の絵に見える」判定は E1 の Hero 画像そのものと並べて行う（決定195 P12）

## 9. 既存 Entrance E1 との統合位置

- `HomeScreen.tsx`：`.home-hero-art` 内・`<img className="home-hero-img">` の**直前**に `<video className="home-hero-env">` を 1 要素（Hero God に環境動画が定義されている神のみ）。`godStyle.ts` の `HOME_HERO_ART` に `env?: { mp4, webm, matte }` を任意追加（Ebisu のみ埋める）
- `setup.css`：`.home-hero-env { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0; transition:opacity .4s }`／`.home-hero-art[data-living="on"] .home-hero-env { opacity:1 }`／`.home-hero-art[data-living="on"] .home-hero-img { -webkit-mask-image:url(...); mask-image:url(...); mask-size:cover; mask-position: 既存 objectPosition と同値 }`／`@media (prefers-reduced-motion: reduce) { .home-hero-env { display:none } }`
- **Entrance（feasibility §5 の tap-to-enter・camera pull-back）とは独立**。Living Hero Layer は E1 Home にそのまま載る（クリック数不変・AC7 不変）。第 1 段 CSS（camera pull-back）を後から足す場合も、両者は `transform` と `opacity` の別プロパティで衝突しない
- state 追加 0・storage 0・`src/core` 0・`heroGod.ts`／`homePrimary.ts` 不変

## 10. Asset Rights Ledger への影響

| Asset | Source | Creator / Generator | Terms | 台帳への記入（要） |
| --- | --- | --- | --- | --- |
| `keyvisual-hero.webp`（canonical） | SGG Creator Kit 派生（決定194 §21-b で「未記録」） | 生成元・日付 未記録 | Kit ガイドライン v1.0.0（商用可・改変可） | **CEO INPUT**（既知の空欄） |
| `ebisu-env-matte.webp`（新） | canonical から作成 | 社内（手作業／ローカル AI） | canonical に従属 | 派生物として記入 |
| `ebisu-env.mp4`／`.webm`（新） | H3 Test0x を再エンコード | **fal（H3・model/version 要記録）**・2026-09-19 05:43〜05:52 | fal 利用規約（出力の権利・商用可否）＋ Kit ガイドライン（キャラクターを含む派生物） | **CEO／Specialist**：fal の規約版・出力の権利の確認。動画内に神が写っていても表示は still が覆うが、**素材としては Kit キャラクターの派生物**として扱う |
| poster | canonical と同 URL | – | – | 追加なし |

AI は権利の結論を出さない（決定194 P15）。台帳雛形は決定194 L4 のまま。

## 11. リスクと未検証事項

| 項目 | 状態 |
| --- | --- |
| H3 3 本の環境ドリフト量・ループ端の差分・最良クリップの選定 | **未検証**（ヘッドレス Edge crash）。CEO 帰宅後に目視 |
| iPhone 低電力モードでネイティブ再生ボタンが `opacity:0` の video 上に描かれないか | **未検証**（要実機） |
| iOS で `mask-image` on `<img>` ＋ `object-fit` の組み合わせでマット位置が `object-position` と一致するか | 要実機（`mask-position` を同値にする設計） |
| ping-pong 逆再生の違和感（鳥・波の向き） | 要目視。鳥はマット外に置くことで回避可 |
| 動画と still の色差 | エンコード時グレーディングで吸収。CSS blend は使わない |
| 費用 | **今回 0**（既存 Test0x を再利用。fal 追加生成なし）。7 柱展開は柱ごとに H3 生成が要る → CEO 判断（費用・権利） |

## 12. 次段（実装しない・CEO 帰宅後）

1. CEO が Test01〜03 を PC/iPhone で目視し、空・海面が最も自然な 1 本を選ぶ
2. Ebisu 環境マット 1 枚（手作業 or ローカルセグメンテーション＋手直し）
3. 選定クリップを ping-pong・無音・H.264 High 0.6〜1.0MB／VP9 0.4〜0.7MB に再エンコード（ffmpeg。現環境に無いため導入が要る）
4. preview 上で COV-M を試作（`HomeScreen.tsx` 1 要素＋CSS 10 行程度）→ Human seam test ×3 ＋ 同一性差分 0 ＋ LCP/CLS 再計測
5. PASS なら Release Gate → 決定 20x

```
【CEO DECISION REQUIRED】（帰宅後）
Issue：Living Hero を「Canonical-over-Video ＋ 環境マット（COV-M）」で Ebisu 1 柱試作へ進めるか
AI Recommendation：進める（費用 0・既存 H3 素材の再利用・同一性は構造的に保証・E1 と同一の fallback）
Reason：CEO 確認済みの H3 の性質（環境は有望・構図は再生成）に対し、still を最上層に置く構成だけが同一性と環境の動きを両立する
Alternatives：A（動画そのまま）NO-GO／C（被写体切り抜き）継ぎ目大／F（透過動画）二重管理／G（CSS のみ）は併用可だが単独では「静止画」懸念が残る
Risk：マット境界の継ぎ目（低周波領域に限定して緩和）・iPhone 低電力モードのネイティブ UI（実機で確認）・fal 出力の権利（Specialist）
CEO Action：承認 / 保留
```
