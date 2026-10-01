# Asset inventory（`public/assets/`・Production `3dd8b5c`・2026-10-02）【実測：`find`＋`stat`＋`file`】

ファイル数 **210**（`.gitkeep` 含む。9/27 台帳の 209 ＋ 決定250 の mp4／poster 2 − 旧 `god-strike-v1.mp4` 削除 … 台帳 §5 との差は決定250 分）。寸法は `file` の出力（JPEG の `arena.jpg` は密度 96×96 が返るため寸法未確認）。

## 1. 神（7 柱 × 7〜9 ファイル）

| 種別 | 寸法 | bytes（7 柱の範囲） | 参照元 | 用途 |
|---|---|---|---|---|
| `front_640.webp` | 640² | 87,342〜117,202 | `gods.ts:45` | 戦闘立ち絵・**入口の降臨（決定254）** |
| `front.webp`／`main.webp`／`back.webp` | 1600² | 98,442〜231,930 | `gods.ts:39-46`（main.png は 480²） | 神選択・結果 |
| `keyvisual.webp` | 675×900（笑蓮 900²） | 129,620〜202,800 | `gods.ts:49` | **God Strike カットイン**・勝利の舞台 |
| `keyvisual-home.webp`（6 柱）／`keyvisual-hero.webp`（恵比寿） | 1086×1357〜1448 | 311,704〜523,108 | `heroGod.ts` | Home hero（静止） |
| `taiyo/god-strike-v2.mp4` | 720²・24fps・29f | **166,058** | `godStrikeVideo.ts:24` | 決定250（大耀のみ） |
| `taiyo/god-strike-v2-poster.webp` | 720² | **61,866** | `godStrikeVideo.ts:34` | 同上 |

権利：Kit 公式 21 行 ◎／keyvisual 系 △（出所 CEO INPUT #8）／動画・ポスターは `front_640` 入力の H3 Max 生成（決定250・台帳行は未記入【docs：D250 §9】）。

## 2. 敵（7 体・配信 7 ＋ 未参照 10）

| 敵 | 配信（`enemies.ts`） | 寸法 | bytes | 向き（原画） | high-key【docs：Brief §1-1】 | 台帳 |
|---|---|---|---|---|---|---|
| 試練の影 | `datenshi/art.webp` | 768² | 185,616 | 正面 | 0.10 | △ |
| 業斧の鬼将 | `oni/art_hq.webp` | 768² | 123,010 | 左 | 0.08 | △ |
| 藍花の怨霊 | `onryo/art_hq.webp` | 576×768 | 147,326 | 正面 | 0.21 | △ |
| 銀甲の機工師 | `karakuri/art.webp` | 768² | 105,280 | 左 | 0.16 | △ |
| 双牙の魔獣 | `juuma/art_hq.webp` | 768² | 158,262 | 正面〜右 | 0.16 | △ |
| 蒼海の龍神 | `ryujin/art_hq.webp` | 768² | 173,286 | 左 | 0.21 | △ |
| 乱舞の道化 | `doukeshi/art.webp` | 768² | 182,510 | 左 | 0.12 | △ |
| 未参照 | `*/art.png` ×7（384×512／512²）・`juuma/art.webp`・`oni/art.webp`（512²） | — | 2,780,030 | — | — | ENM-U1〜U3 |

`d1e3b30` 以降 変更 0。やられ差分・被弾差分・v2：**0 ファイル**（Brief v1 は HOLD）。

## 3. OTOMO（7 体 × 5）

| 種別 | 寸法 | bytes | 用途 |
|---|---|---|---|
| `spirit_320`／`incarnate_320`／`doji_320.webp` | 320² | 7,700〜31,052 | 戦闘ポートレート（0.75 倍表示・`GodOtomoPanel.tsx:193-201`） |
| `doji.webp` | 1600² | 782,056〜894,326 | 絆画面 |
| `background.webp` | 900×437（笑福 900×404） | 38,240〜58,730 | 絆カード背景 |

## 4. カード（60 枚 ＋ v2 候補 1）

- `cards/card_*.webp` 60 枚・512×768・78,766〜182,188B。`card_taiyo_attack_01_v2.webp` 640×960・92,130B（Lane3 After-2 候補・`cards.ts` 未参照）

## 5. 舞台・FX

| 種別 | ファイル | 寸法 | bytes |
|---|---|---|---|
| 舞台背景 | `backgrounds/stages/01〜07-*.webp` | 1600×900 | 214,090〜321,686（計 1,932,638） |
| アリーナ | `backgrounds/arena.jpg` | 未確認 | 308,876 |
| 閃光 | `fx/cast-{attack,guard,hinder,oracle,resonance,support}.png` | 320×480 | 262,996〜429,419（**計 1,979,287**・PNG・`mix-blend-mode: screen`・同形 6 色） |

## 6. 音

| 種別 | ファイル | bytes | 備考 |
|---|---|---|---|
| SE | `se/*.wav` ×20 | 337,372 | 22.05kHz mono・`gen-se.mjs` 自作・◎。尺 60〜960ms（sound-timeline §1） |
| BGM | `bgm/{home,battle}.{webm,mp3}` | 10,242,519 | Suno・△・loop・0.35 |
| ジングル | `bgm/{victory,defeat}.{webm,mp3}` | 9,940,670 | Suno・△・0.5・9s 上限 |
| Voice | — | **0** | — |

## 7. 合計・所見【AI 判断】

- 画像 asset は「神＝Kit セル・白フチ・high-key」「敵＝3 世代混在・low-key」「OTOMO＝320px 球体」「閃光＝PNG 実写風」の 4 言語。決定249／250／254 はこの比率を変えていない（動画 1 本が大耀にだけ premium を足した）
- 音 asset は 20.5MB 中 20.2MB が BGM。SE は 337KB で 20 本。決め所（神の一撃・敵必殺・入口の降臨）に固有音は 0
- 閃光 PNG 6 枚 1.98MB は `cast-flash` 1 回ごとに 1 枚を `<img>` で表示（`BattleScreen.tsx:499`）。WebP 化・座標化は 9/27 §5-1 #8 の候補のまま
