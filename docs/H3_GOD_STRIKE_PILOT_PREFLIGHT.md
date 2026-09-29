# 決定250 候補 — H3 God Strike Premium Cut-in Pilot Preflight

- 日付：2026-09-28
- 種別：**AUDIT / DESIGN / TECHNICAL PREFLIGHT ONLY**（H3 生成 0・fal.ai API 呼び出し 0・課金 0・画像／動画生成 0・runtime／CSS／asset 変更 0・branch／commit／merge／push／deploy 0）
- Production baseline：**`bcfd530`**（決定247 LIVE／CLOSED）。監査は clean worktree `SevenGodsGame-d247`（HEAD `bcfd530`＝origin/master）を読むだけ
- 判断主体：AI チーム（CLAUDE.md §6-2）。**生成の開始（fal.ai 課金）は §6-3 #4／#6 に該当し CEO 承認が必須**
- 別レーン：決定249 Reaction Language v1（worktree `SevenGodsGame-d249`）には**一切触れていない**（ファイル競合 0：本書は docs のみ）
- 証拠：`docs/evidence/h3-god-strike-preflight/`（現行タイムライン・大耀 source art 台帳照合・動画予算と Gate）
- 表記：【実測】＝実コード／実ファイル、【docs】＝既存 Decision、【AI 判断】＝本書の設計、【推測】＝根拠の弱い見込み、【WEB確認必要】＝repo に記録が無い外部情報

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 現行 God Strike | commit 0 → 到達反応＋`burst_ready` → **200〜1,100 カットイン（神の静止画 keyvisual を円で 900ms）** → 1,100 入力ロック解除＋バナー → 1,300 神の突き → **1,600 着弾**（stop 80・52px・`hit_l4`・揺れ 5px）→ 2,000 バナー終了 → 2,500 OTOMO 進化。engine の結果は 0ms で全部確定済み。二重の安全弁（`animationend`＋`setTimeout`）で必ず進む |
| 挿入点（1 つ） | **カットインの円形ポートレート（200〜1,100）を動画に差し替える**。`BattleResonanceCutin` の `<img>` の上に `<video>` を重ねるだけで、engine・reducer・イベント順・入力ロックの仕組み・突き／着弾／音の経路は不変 |
| 推奨尺 | **動画 1.2s（＋200ms のクロスフェード）＝カットイン枠 900 → 1,400ms**。着弾は 1,600 → **2,100**、入力ロックは 1,100 → 1,600（1 戦 ≤1 回・平均 0.55 回）。動画が無い／間に合わない端末は現行 900ms のまま（切替は commit 時に 1 回だけ判定） |
| 動きの方向 | 「anticipation（砲口に光が集まる）→ power gathering（体を前へ・光が増す）→ decisive motion（砲が画面左＝敵の方へ火を噴く）→ flash」。**カメラ固定・ズームなし・顔／髪／帽子／衣装／体格／座りポーズ／左上の主光は不変** |
| source art | **`front_640.webp`（Kit `main.webp` の非生成派生・戦闘の立ち絵そのもの・640²・透過）**。`keyvisual.webp` は出所 UNKNOWN（台帳 GOD-K-02）のため入力に使わない |
| 技術仕様 | 720×720・24fps・1.2s・無音・WebM/VP9 ≤450KB＋MP4/H.264 ≤650KB【推測】・戦闘開始時に選択神 1 本だけ低優先で取得・`readyState≥3` で採用 |
| フォールバック | 動画は**必須資産にしない**。404／decode 失敗／未取得／低電力モード／reduced-motion／`play()` reject のすべてで**現行の静止カットインへ即時**。engine は表示に依存しないので停止・ロック永久化・ダメージ不発・seed／score 変化は構造的に起きない |
| 生成計画 | fal.ai の image-to-video。入力＝`front_640.webp` を暗色の平板に合成した 1024² PNG（非生成前処理）。**最大 3 回**：Try1＝機械／目視で「顔・帽子の identity が最初の 0.4s で保てるか」だけを判定 → 保てるなら Try2（動きの改善）→ Try3 は改善可能性が明確な場合のみ |
| コスト | **モデル名・単価は repo に記録なし → WEB確認必要**。fal.ai 規約監査（8 項目）も未実施。**CEO 課金承認なしに API 実行・購入は行わない** |
| 7 神展開 | シーケンス・尺・encode・Gate は 7 神で共通化できる。**共有できないのは動きの内容（signature object が神ごとに違う）と identity 受入点**。配信 ≈7.7MB（1 戦で読むのは 1 本 ≤650KB）・生成 ≤21 回 |
| Human QA | A（現行）／B（H3 cut-in）を同 seed で比較。5 問・**5/5 YES で Commercial Expansion 候補** |
| **RECOMMENDED SPEC（1 案）** | **「Premium Cut-in v1（大耀）」＝カットインの円の中だけ 1.2s の H3 動画（Kit 系 `front_640` 入力・カメラ固定・砲撃 1 動作）。カットイン枠 1,400ms、着弾 2,100ms、全端末フォールバックあり、動画は必須資産にしない** |
| **GO / NO-GO** | **技術 Preflight：GO WITH CONDITIONS**（実装可能・安全に落とせる）。**生成：CEO 課金承認待ち（NO-GO のまま）**。採用は identity Gate（§11）と Human QA 5/5 に従う。過去 3 回の H3 NO-GO（決定211／219／222／223）は「canonical と空間的に整合しない」が原因で、**本 Pilot は canonical を置き換えず「円の中の 1.2s」に閉じ込める**ことで同じ失敗を繰り返さない設計 |
| **NEXT NOW（1 件）** | **CEO へ「fal.ai のモデル・単価・規約 3 点の確認と、Try1（1 回分）の課金承認」を §6-4 形式で提出する**（§13 の CEO INPUT 一覧）。承認まで生成・実装とも着手しない |

---

## 1. Current God Strike sequence（Production `bcfd530`）【実測】

詳細表：`docs/evidence/h3-god-strike-preflight/god-strike-timeline-bcfd530.md`

| t（ms） | 段階 | 主体 | 要点 |
|---|---|---|---|
| −280〜0 | trigger：共鳴を上げるカードの cast（入力ロック 280） | Card | `useGameEngine.ts:74` |
| 0 | engine が `RESONANCE_BURST`（進化→神効果→OTOMO 効果）を 1 バッチで確定。`burstKey`＋1 | engine | `effects.ts` `applyResonance`／`useBattleFx.ts:177` |
| 0 | **入力ロック**（`cutinActive`）・ゲージ到達反応 0.9s・SE `burst_ready`・SP 自動スクロール（保持 3,600） | HUD／音 | `BattleScreen.tsx:155-163`、`useMobileAutoFocus.ts:47` |
| 200 | **カットイン mount**：暗転 0.2s・集中線・帯・神の円（`keyvisual`・`center 30%`）・神名／「神の一撃」。0.9s タイマー | Arena | `BattleResonanceCutin.tsx`、`battle.css:1511-1846` |
| 1,100 | カットイン終了（`animationend`／安全弁 1,500）→ **ロック解除**・`burst-banner` 0.9s | HUD | `BattleScreen.tsx:171-181` |
| 1,300 | 神の突き（`god-burst-strike` 0.6s・delay 1.3s） | God | `battle.css:4382-4395` |
| **1,600** | **着弾**：敵 tier 4・stop 80・52px・`hit_l4`・HP ゴースト。1,680 に舞台 5px 揺れ | Enemy／Arena | `combatTimeline.ts:153-156・226-231` |
| 2,000〜2,500 | バナー終了 → 進化バナー → OTOMO 立ち絵切替・`evolve` | OTOMO | `GodOtomoPanel.tsx:130-146` |
| 撃破時 | 1,600 着弾（stop 90）→ 1,860 崩壊 → 2,240「撃破」＋`victory_sting`＋ジングル（BGM pause）→ 3,090 勝利の舞台 | — | `combatTimeline.ts:286-299` |
| reduced | 時刻は同じ。カットインはフェードのみ・突きなし・stop 0・揺れなし | — | `battle.css:1814-1846・4616` |
| preload | `keyvisual` を戦闘開始時に `new Image()`。**`<video>` は src に 0 件** | — | `BattleScreen.tsx:260-266` |
| BGM | ダッキングなし（`HTMLAudioElement` volume 0.35）。ジングル時だけ pause→resume | 音 | `bgm.ts:160-205` |

## 2. Recommended insertion point【AI 判断】

**カットインの円形ポートレート（200〜1,100）**。理由：
1. engine は 0ms で完了しており、この区間は**純粋な表示**（`BattleResonanceCutin` は「マウントされたら演出を始め、時間で必ず終わる」部品）
2. 完了は `animationend`＋`setTimeout(900+400)` の二重安全弁。動画は `ended`／`error`／`timeout` の**三重**にして同じ関数（`finish()`）を呼ぶだけ
3. 円（≤252px・@2x 504px）の中に閉じる＝**canonical（神の立ち絵・舞台）を 1 ピクセルも置き換えない**。決定204／219／223 の失敗（H3 と canonical の空間不整合）は、置き換える面が無ければ起きない
4. 着弾・音・数字・揺れは `BURST_IMPACT_MS` 系の定数から派生している（`combatTimeline`・`useBattleSound`・`useFloatingNumbers`・`useMobileAutoFocus`）。枠を伸ばすときは**この定数群だけ**を「premium のときの値」に切り替える（core 0）

避ける挿入点：着弾後（勝利の舞台と衝突）、突き中（神の立ち絵と動画が同時に動く）、cast 中（280ms は短すぎ・毎手の演出になる）。

## 3. Recommended cut-in duration【AI 判断】

| 案 | 動画 | カットイン枠 | 着弾 | 入力ロック | 評価 |
|---|---|---|---|---|---|
| A 現行枠のまま | 0.9s | 900（不変） | 1,600 | 1,100 | 時刻の変更 0。ただし H3 は 0.9s で「溜め→撃つ」を入れると忙しい |
| **B 1.2s** | **1.2s＋0.2s フェード** | **1,400** | **2,100** | **1,600** | 「溜め 0.4／撃つ 0.5／余韻 0.3」が入る。+500ms は 1 戦 ≤1 回・0.55 回／戦＝1 戦あたり平均 +275ms |
| C 2.0s | 2.0s | 2,200 | 2,900 | 2,400 | 2 回目以降に長い。決定226 の「撃破 3.4s」と合わせると 1 戦の演出時間が目立つ |

**B を採用**。anticipation は既存の 200ms（到達反応）＋暗転 200ms を使い、動画の最初の 0.4s は「光が集まる」だけにして静止画と地続きにする（同一人物に見せる時間）。

| 項目 | 仕様 |
|---|---|
| start timing | 200ms（現行のカットイン mount と同じ。動画は `readyState≥3` 済みなので `play()` 即時） |
| video duration | 1.2s（0〜0.4 anticipation／0.4〜0.9 decisive／0.9〜1.2 flash・余韻） |
| transition in | 現行の暗転 0.2s＋円のスライド 0.4s をそのまま。動画は静止画の上に `opacity 0→1` 120ms（初フレーム＝`front_640` 由来なので静止画からの飛びは小さい） |
| transition out | 1,400ms でカットイン unmount（現行と同じ経路）。最後の 200ms は白フラッシュ→`burst-banner` の金の放射へ |
| impact connection | 突き開始 1,800・着弾 2,100（`BURST_*` を premium 値へ）。動画の「撃つ」（0.9s＝t 1,100）と神の突き（1,800）は同じ方向（`--atk-x`＝左）。動画の火の方向は画面左固定＝PC／SP とも敵は左 |
| skip policy | Pilot では**なし**（現行カットインも skip 不可・pointer-events none・1 戦 ≤1 回）。2 回目以降の短縮は Human QA Q4 の結果で判断 |
| repeat behavior | 毎回同じ動画（決定論・差し替え不能な生成物なので 1 本固定） |
| first-use behavior | 初回も 2 回目も同じ（学習コストを作らない） |
| audio relationship | 動画は無音。既存 `burst_ready`（0ms）→ 動画 →`hit_l4`（2,100）。**BGM ダッキングは行わない**（決定244 §8：iOS の volume 制約・別 Decision） |
| RETURN TO CALM | 現行と同じ：バナー 0.9s → 進化 → idle。動画は unmount で解放 |

## 4. Motion direction（大耀）【AI 判断】

大耀の `front_640`：宝袋に座る・左手の小槌型の砲を画面左へ構える・ゴーグル・迷彩の頭巾（宝袋紋）・笑顔。signature object＝**砲**（砲口の赤い光）。

| 段階 | 時間 | 動かすもの | 動かさないもの |
|---|---|---|---|
| anticipation | 0〜0.4s | 砲口の光が強くなる・体がわずかに前傾（≤3%） | 顔・視線・髪・帽子・衣装の柄・体格・座りポーズ・背景 |
| power gathering | 0.4〜0.7s | 砲身に沿って光が走る・肩が少し上がる | 同上 |
| decisive motion | 0.7〜0.9s | **砲が画面左へ火を噴く**（反動で体が右へ 2〜3%）・銃口炎 | カメラ・顔の形・帽子の紋 |
| flash | 0.9〜1.2s | 画面が白〜金へ飛ぶ（transition out に接続） | — |

禁止（プロンプトの negative）：camera orbit／zoom／dolly、body rotation、衣装のデザイン変更、顔の変化・別人化、新しい物体（弾丸・キャラ・文字）、背景の創作（平板のまま）、口の開閉・表情変化の大きな動き、鯛・小槌・宝袋紋の消失。
カメラ移動は**不要**と判断：円 ≤252px の中では camera motion は identity drift と区別がつかない。「寄り」が欲しければ CSS の `scale` で決定論的に付けられる。

## 5. Canonical source art【実測・docs】

詳細：`docs/evidence/h3-god-strike-preflight/taiyo-source-art-inventory.md`

| file | 台帳 | H3 入力 |
|---|---|---|
| `main.webp` 1600² RGB | GOD-KIT-04 ◎ Kit そのもの | 可（白背景・要合成） |
| **`front_640.webp` 640² alpha** | GOD-D-01 △（Kit `main` の非生成派生・決定130） | **推奨**（戦闘の立ち絵そのもの・1:1・透過） |
| `front.webp` 1600² alpha | GOD-KIT-05 ◎ | 可だが別ポーズ（未参照） |
| `keyvisual.webp` 675×900 | **GOD-K-02 △・Creator UNKNOWN** | **不可**（出所未確定を生成入力にしない） |

含意：現在のカットインが表示している `keyvisual` は出所 UNKNOWN。動画は Kit 系から作るので、**動画の初フレーム（front_640 のポーズ）とフォールバック静止画（keyvisual）は別ポーズ**になる。Pilot ではこれを既知事項とし、keyvisual の出所確定（台帳 CEO INPUT #8）を並行課題にする。Kit ガイドライン §2 は生成 AI への入力・動画制作を許可【docs】。

## 6. Identity preservation rules【AI 判断】

| 要素 | ルール | 受入（機械） |
|---|---|---|
| face | 形・目・笑顔・ゴーグルの位置を固定。口は開かない | 顔領域の MAE（初フレーム比）0〜0.4s ≤ **8**、全フレーム ≤ **14**（決定223 の Gate「全フレーム ≤8」は円の中の 1.2s へ緩和。理由：decisive で反動が入るため。0.4s までは決定223 と同じ 8） |
| hair／頭巾 | 宝袋紋・迷彩の柄を保つ | 頭部領域の色ヒストグラム距離 ≤ 閾値（Try1 で校正） |
| costume | 迷彩ベスト・橙の腰・黒手袋・脚のプロテクター | 同上 |
| silhouette | 座り・砲を左に構えた輪郭 | 全フレームの alpha マスク IoU ≥ 0.85（合成板との差分で算出） |
| colors | 橙／黒／金／緑迷彩の 4 色 | 主要色の面積比 ±20% |
| body proportions | 2〜2.5 頭身 | 頭部 bbox 高さ ±10% |
| signature objects | 砲・宝袋 | 消失フレーム 0 |
| pose identity | 座ったまま・砲は左 | 砲の向きが右へ反転したフレーム 0 |
| lighting identity | 主光＝左上 | 顔の明部が右側へ移らない（目視） |

「動かすもの」＝砲口の光・銃口炎・体の ≤3% の前傾／反動・画面の明度。「絶対に動かさないもの」＝顔の形・帽子の紋・衣装デザイン・体格・座りポーズ・カメラ。

## 7. Video technical spec【AI 判断・容量は推測】

720×720・24fps・1.2s・無音・WebM/VP9（CRF 30〜33・2-pass）≤450KB ＋ MP4/H.264 High（CRF 20〜23・`+faststart`・音声なし）≤650KB。alpha なし（暗色の平板を焼き込む）。poster なし（下に既存の静止画）。根拠と端末別の前提：`video-budget-and-gate.md` §1〜§4。決定204 §1 の教訓（Baseline・18Mbps・AAC ありは不可）を仕様に固定。

## 8. Performance budget【AI 判断】

| 項目 | 許容値 |
|---|---|
| 初期バンドル差 | JS ≤ +3KB・CSS ≤ +2KB |
| 動画資産 | WebM ≤450KB・MP4 ≤650KB |
| first battle load | Before 比 ≤ +50ms（低優先の並列取得） |
| memory | ≤ +30MB（PC 計測）【推測】 |
| dropped frames | PC ≤2%・SP ≤5%・throttled Android ≤8% |
| layout shift | 0（fixed 層内） |
| console error | 0（`onerror` を握る） |
| 着弾時刻の誤差 | ≤40ms（PC）／≤80ms（throttled） |
| 入力ロック | premium 1,600 以下・static 1,100 不変 |

Gate の全 14 項目（PG1〜PG14）と測定方法：`video-budget-and-gate.md` §5。

## 9. Loading／preload strategy【AI 判断】

戦闘開始（Boss Entrance 1.5s）で選択神の動画 1 本だけを `<video preload="auto" muted playsinline fetchpriority="low">` として非表示で取得。commit 時に `readyState ≥ 3` かつ `error` なし・`prefers-reduced-motion` でない・`play()` が resolve、の 3 条件で premium 経路。満たさなければ現行。取得中でも判定は 1 回だけ（途中切替なし）。2 戦目以降は HTTP cache。戦闘終了で `src=''`＋`load()` で解放。初期バンドルは不変。

## 10. Fallback architecture【AI 判断】

```
commit(RESONANCE_BURST)
 ├ engine 完了（結果・seed・score 確定）           ← 動画と無関係（現行どおり）
 ├ premium = video.readyState>=3 && !error && !reduced   ← ここで 1 回だけ決める
 ├ BURST_* 定数 = premium ? PREMIUM : STATIC       ← combatTimeline / sound / numbers / focus が同じ値を使う
 └ cutin mount
     ├ premium: <img>（現行）の上に <video>。play() reject → 即 <img>、定数は premium のまま（静止画を 1,400 見せる）
     │          ended / error / timeout(1,400+400) → finish()（現行の onComplete と同じ 1 関数）
     └ static:  現行そのもの（900・安全弁 1,300）
```

保証：①engine は表示に依存しない（現行と同じ）②`finish()` は三重の安全弁で必ず 1 回呼ばれる＝ロック永久化なし ③ダメージ・数字・音は `planBatch` の時刻表で予約される（動画の再生状態を見ない）＝不発なし ④seed／score は engine の外で決まらない ⑤動画ファイルが 1 バイトも無くても現行と同一の体験。**「動画がなくてもゲームは 100% 成立」を満たす**。

## 11. H3 generation spec（まだ生成しない）【AI 判断】

| 項目 | 仕様 |
|---|---|
| input canonical image | `public/assets/gods/taiyo/front_640.webp` を、カットインの帯色（`GOD_THEME_COLOR.taiyo` の暗色）の平板に中央合成した **1024×1024 PNG**（非生成の前処理・決定130 と同じ扱い・台帳に 1 行） |
| H3 model | **fal.ai の image-to-video モデル。名前は repo に記録なし → WEB確認必要・CEO INPUT** |
| duration | 生成 2s 以上（モデルの最短）→ 最良の 1.2s を切り出し |
| resolution | モデル既定（≥720²）。1:1 を指定できないモデルなら 3:4 で生成し中央 1:1 を切り出す |
| prompt structure | ①identity lock（"the same chibi character, seated on a treasure sack, holding a mallet-shaped cannon pointing left, camo hood with treasure-bag crest, goggles, orange armor, unchanged face and outfit"）②camera lock（"static camera, no zoom, no pan"）③motion（"cannon muzzle glows brighter, energy lines run along the barrel, then the cannon fires a burst of light to the left with slight recoil, then bright flash"）④background（"plain dark background, no scenery"） |
| negative constraints | camera movement, zoom, rotation, turning, new objects, text, extra characters, background scenery, outfit change, face change, mouth movement, hair color change, missing cannon, missing sack |
| identity constraints | §6 の表（機械受入 6 項目） |
| maximum attempts | **3**（Try1 → 判定 → Try2 → 改善可能性が明確な場合のみ Try3） |
| acceptance criteria | 機械：§6 の 6 項目すべて／技術：PG9 容量／目視：AI が「顔・帽子・砲が同一」「撃つ動作が読める」を確認 → CEO Human QA 5 問 |

## 12. Maximum attempts と Try Gate【AI 判断】

| Try | 何を判定するか | 次へ進む条件 |
|---|---|---|
| **Try1** | **identity だけ**：最初の 0.4s で顔・帽子・砲が `front_640` と同一か（MAE ≤8・消失 0・反転 0）。動きの良し悪しは見ない | 満たす → Try2。満たさない → **打ち切り（NO-GO）**：モデルの限界であり、プロンプト調整で救わない（決定219／223 の教訓） |
| Try2 | 動き：砲撃が読めるか・反動が ≤3% か・flash が末尾にあるか。identity は Try1 と同じ基準を維持 | 満たす → 採用候補。動きだけ弱く**原因がプロンプト 1 箇所に特定できる** → Try3 |
| Try3 | Try2 の指摘 1 点だけ直す | 改善が計測で確認できたら採用候補。できなければ Try2 の出力を候補にするか NO-GO |

惰性の再生成を禁止するルール：各 Try の前に「何を直すか」を 1 行で書き、後に「直ったか」を数値で書く。書けない Try は行わない。

## 13. Cost information／unknowns

| 項目 | repo の記録 | 状態 |
|---|---|---|
| 過去の H3 生成（決定204／219／223 の Test01〜03） | 「fal.ai」「H3」とだけ記録。**モデル名・単価・回数の記録なし**。動画ファイルは repo 外 | — |
| 現在利用予定のモデル | 記録なし | **WEB確認必要**（CEO INPUT） |
| 1 本あたりの単価 | 記録なし | **WEB確認必要**（推測しない） |
| fal.ai 規約（商用利用・入力画像の学習利用・生成物の権利・帰属） | 監査なし（決定242 は ChatGPT のみ） | **CEO 確認（§6-3 #5）** |
| アカウント・残高・プラン | 記録なし | CEO INPUT |

Pilot 最大 3 回の費用上限を確定するために必要な情報：①モデル ID ②秒あたり／本あたりの単価と解像度・尺の刻み ③失敗（生成エラー）時の課金有無 ④現在の残高とプラン ⑤規約 8 項目（決定242 と同じ表）。**これらが揃うまで API 実行・購入・課金は行わない。**

## 14. 7-God expansion estimate【推測】

`video-budget-and-gate.md` §6。共有できる：シーケンス（尺・タイミング・フォールバック）・encode・Gate・機械受入スクリプト・前処理。共有できない：動きの内容（砲／竿／槍／ギター／杖／扇＝神ごとに brief）・identity 受入点。配信 ≈7.7MB（1 戦 1 本）・生成 ≤21 回・Human QA 7 戦。**Pilot が 5/5 で通っても、次の神は 1 柱ずつ**（笑蓮の寝そべりポーズなど、動作が成立しない神は動画を持たない選択も残す）。

## 15. Human QA design（Pilot 実装後）

- A＝Production（静止カットイン）／B＝Premium Cut-in。同 seed・大耀 × 蒼海の龍神（決定246 後は R4 の峰で共鳴が満ちやすい）。PC と iPhone。CEO には A/B を見せ、**採用判断だけ**を求める
- Q1 God Strike が明確に「特別な瞬間」になったか／Q2 通常カード・PAYOFF との差が十分か／Q3 大耀本人として違和感がないか／Q4 1 戦で見てもテンポを邪魔しないか／Q5 SEVEN GODS の商品品質を一段上げたと感じるか
- **5/5 YES → Commercial Expansion 候補**。Q3 NO → 動画は不採用（識別性は数値で救わない）。Q4 NO → 尺 1.2→0.9（案 A）で 1 回だけ再 QA

## 16. Risks

| リスク | 大きさ | 対応 |
|---|---|---|
| identity drift（決定223：0.5s で MAE 25〜31） | **高** | Try1 で最初の 0.4s だけを判定して早期打ち切り。円の中・1.2s・カメラ固定・初フレーム＝戦闘の立ち絵 |
| フォールバック静止画（keyvisual）と動画（front_640）のポーズ不一致 | 中 | 既知事項として記録。keyvisual の出所確定を並行 |
| 非決定な生成物＝差し替え不能（決定223 Gate ③） | 中 | 1 本固定・原本と生成パラメータを台帳へ。神の絵を変えたら再生成前提 |
| iOS 低電力モード・Safari の VP9 | 中 | `play()` reject → 静止。MP4 fallback。実機 Gate PG2 |
| 入力ロック +500ms | 低 | 1 戦 ≤1 回。Human QA Q4 |
| BGM と動画の音の関係 | 低 | 動画は無音・SE は既存の時刻表 |
| 決定249 との競合 | 0（本書は docs のみ） | 実装時は `BattleResonanceCutin`／`enemyVfxTiming`／`combatTimeline` を触るため、249 の Release 後に branch を切る |
| 規約・権利 | 中 | fal.ai 規約 8 項目・台帳 1 行が先（決定242 の運用） |

## 17. 変更禁止の遵守
battle balance・cards・Enemy・Oracle・AP・7R・Seed・score・Daily・Ranking・Reaction Language runtime・Entry Sequence・Enemy Ultimate・Voice・敵アート・神アート差替え：**すべて触れない**。決定249 とのファイル競合 0（docs のみ）。

## 18. runtime 変更 0 の証明
- 監査は `SevenGodsGame-d247`（`bcfd530`）を読むだけ：`git status --porcelain` 0 行
- 本 worktree（`SevenGodsGame`）の変更は `docs/H3_GOD_STRIKE_PILOT_PREFLIGHT.md`・`docs/evidence/h3-god-strike-preflight/`（3 ファイル）のみ。`docs/DECISIONS.md` は本レーンでは触れていない（親レーンが決定250 行を追記）
- H3 生成 0・fal.ai 呼び出し 0・課金 0・branch 0・commit 0

## 19. 【CEO DECISION REQUIRED】（2026-09-29 提出・§6-4 形式）

- Issue：H3 Premium Cut-in v1（大耀）の生成に進むか。進む場合、fal.ai の利用情報 5 項目の確認と Try1（1 回分）の課金承認
- AI Recommendation：**Try1（1 回）だけを承認し、identity Gate（最初の 0.4s・MAE ≤8・砲／宝袋の消失 0）で打ち切り判定する**。Try2／Try3 は Try1 の結果報告後に別途承認
- Reason：技術 Preflight は GO WITH CONDITIONS（挿入点・フォールバック・予算が確定し、動画がなくてもゲームは 100% 成立）。残る不確実性は「H3 が大耀の identity を 0.4s 保てるか」だけで、これは 1 回の生成でしか確かめられない。過去 3 回の NO-GO は canonical art の常時動画化で、今回は円の中・1.2s・カメラ固定に限定
- Alternatives：①3 回一括承認 → 惰性の再生成を招く（決定219／223 の教訓）ため却下 ②生成せず静止カットインの改善のみ → 「God Strike が特別な瞬間」の伸びしろが小さく Human QA 5 問を満たしにくいため保留 ③keyvisual を入力に使う → 出所 UNKNOWN（台帳 GOD-K-02）で権利上不可
- Risk：identity drift（決定223 で 0.5s に MAE 25〜31）→ Try1 で早期打ち切り。iOS 低電力・VP9 → MP4 fallback＋静止画。入力ロック +500ms（1 戦 ≤1 回）。規約（商用・学習利用・生成物の権利）は CEO 確認が先
- Impact if delayed：Production への影響 0（表示専用・未実装）。God Strike の premium 化と 7 神展開の判断が先送りになるだけ
- CEO Action：承認 / 拒否。承認の場合は次の 5 項目を CEO INPUT として提示：①fal.ai のモデル ID ②単価（本／秒・解像度・尺の刻み）③生成エラー時の課金有無 ④現在の残高とプラン ⑤規約 8 項目（商用可・入力画像の学習利用・生成物の権利・帰属・再配布・二次利用・削除・年齢等、決定242 と同じ表）。**揃うまで API 実行・購入・課金は行わない**
