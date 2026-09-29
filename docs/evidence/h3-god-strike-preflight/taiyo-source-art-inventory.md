# 大耀 source art inventory（Production bcfd530・`public/assets/gods/taiyo/`）【実測：sharp metadata・台帳照合】

| file | 寸法 | alpha | size | 台帳（`docs/ASSET_RIGHTS_LEDGER.md`） | 出所 | 現在の用途 | H3 入力可否【AI 判断】 |
|---|---|---|---|---|---|---|---|
| `main.webp` | 1600×1600 | なし（白背景） | 216,400B | GOD-KIT-04 ◎ | **Kit そのもの**（`taiyo-kozuchi:GOD_MAIN`、sha `a9714359…`） | 神選択の代表絵（`gods.ts` `main`）※`main.png` が配信 | **可**（identity の正典。白背景のため合成前処理が要る） |
| `main.png` | 480×480 | あり | 283,255B | GOD-D-02 △ | Kit `main` の透過加工（決定34／35・非生成） | 神選択・アバター | 可（小さい） |
| `front.webp` | 1600×1600 | あり | 141,708B | GOD-KIT-05 ◎ | **Kit そのもの**（`GOD_FRONT`） | **未参照**（`gods.ts` コメント「別ポーズ」） | 可（ただし戦闘の立ち絵と別ポーズ＝一致しない） |
| `front.png` | 480×480 | あり | 283,255B | — | `main.png` と同一バイト【実測 size 一致】 | 旧 front（ロールバック用） | 不要 |
| `front_640.webp` | 640×640 | あり | 101,898B | GOD-D-01 △（非生成加工） | Kit `main.webp` RGB ＋ `main.png` alpha（決定130） | **戦闘の神の立ち絵**（`PlayerPanel`・カード）・決定243 の参照にも使用 | **可（推奨）**：戦闘で見えている絵そのもの＝identity の基準。1:1・透過 |
| `back.webp` | 1600×1600 | あり | 150,940B | GOD-KIT-06 ◎ | Kit（`GOD_BACK`） | 未参照 | 不要（背面） |
| `keyvisual.webp` | 675×900 | なし | 146,104B | **GOD-K-02 △・Creator UNKNOWN** | `art-source/reference/gods/taiyo-keyvisual.png`（2,969,795B・決定170 で配信対象外へ）。Kit 公式か CEO 生成か **未確定**（台帳 CEO INPUT #8） | **共鳴カットイン**・勝利の舞台・神選択の大絵 | **不可**（出所未確定の絵を生成 AI の入力にしない＝決定242／243 の運用と台帳 §1-4） |
| `keyvisual-home.webp` | 1086×1448 | なし | 311,704B | GOD-KH-01 △ | 同上の原本の再エンコード（非生成） | Home hero | 不可（同上） |

## 結論
- **H3 入力に使える大耀の絵は Kit 公式系の `main.webp`（1600²・RGB）と、その非生成派生 `front_640.webp`（640²・alpha）だけ**。決定243（カード原画）が CEO 承認で使った参照も `GOD_MAIN`＋`GOD_FRONT`（Kit）で、keyvisual は添付しない条件だった
- **推奨入力＝`front_640.webp`**：①戦闘で常に見えている絵と同一（同一人物判定の基準が既にある）②1:1＝カットインの円（≤252px・@2x 504px）に対して 640² は十分 ③透過なので、カットインの帯色（`--god-accent` の暗色）へ合成した平板背景を作れる（非生成の前処理・決定130 と同じ扱い）
- **現在のカットインが表示している `keyvisual.webp` は出所 UNKNOWN**。Pilot の動画は Kit 系から作るため、**フォールバックの静止画（keyvisual）と動画の初フレーム（front_640）は別ポーズになる**。Pilot 期間はこの不一致を「既知」として持ち、keyvisual の出所確定（台帳 CEO INPUT #8）を並行課題とする。動画がある環境では動画の初フレームがポスターになるので、同じ端末で両方を見ることはない

## Kit ガイドライン（`docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md`）で確認した範囲【docs】
- §2：動画制作、生成 AI サービスへの入力・参照画像としての使用、画像編集・生成補助を**許可**（責任は制作者）
- §5：公式と誤認させる表現・未改変素材の再配布を禁止。カットイン動画は改変・作品組み込みに該当
- §6：第三者権利の音声・音楽・フォントは対象外（動画は無音で作る＝問題なし）
- 生成サービス側の規約（入力画像の扱い・学習利用・商用利用）は **fal.ai の規約を別途確認**（決定242 と同じ 8 項目）。**repo に fal.ai の規約監査記録は無い【実測 grep】**
