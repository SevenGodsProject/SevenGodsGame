# 決定254 実測タイムライン（Production 同一 build：`index-0DI4r-CG.js`＝決定252 RC と同一 bundle 名）

- 計測日：2026-10-01／`vite preview`（127.0.0.1:4281・localhost＝回線遅延なし）／headless Chromium（GPU なし）／`--autoplay-policy=user-gesture-required`
- 神＝大耀・敵＝蒼海の龍神・難易度ふつう・神階 0。各 viewport で通常 2 回＋reduced 1 回＋初陣／続きから 1 回
- 生データ：`measure.json`（script：`measure.mjs.txt`）。静止フレーム：`*-f0/f1/f2-*.jpg`（script：`frames.mjs.txt`。BossEntrance の CSS animation を pause→currentTime 指定で撮影）
- t＝「この構成でバトル開始」の `click()` 直前の `performance.now()` からの ms。フレーム値は headless のため目安（PC は GPU なしのソフトウェア描画で特に悪く出る）

## A. 起動 → Home（cold）

| 指標 | PC 1508×660 | SP 390×844 |
|---|---|---|
| DOMContentLoaded | 203 | 100 |
| first-paint／FCP | 628／1,084 | 232／544 |
| LCP（要素） | 1,084（`home-hero-img`＝ebisu `keyvisual-hero.webp` 523,108B） | 560（同） |
| Home の animation | body 背景 3 本のみ（`particle-drift` 140s・`star-twinkle` 5s・`magic-circle-spin` 120s）。`setup.css` keyframes 0 | 同 |
| Home BGM | `play()`＝**NotAllowedError**（最初の操作まで無音） | 同 |
| CLS | 0 | 0 |

## B. Setup 画面遷移（すべて hard cut・遷移 animation 0。値は node 側計測で Playwright 往復込み）

| 操作 | PC run1／run2 | SP run1／run2 |
|---|---|---|
| Home「神を選ぶ」→ 神選択 | 581／383 | 239／227 |
| 神カード（大耀）→ 難易度・神階ステップ | 258／137 | 107／92 |
| 「この神で進む」→ 敵選択 | 471／407 | 387／217 |
| 敵（蒼海の龍神）→ デッキ構築 | 758／605 | 401／361 |
| 初陣：「初陣へ」→ 説明 3 行 | 175 | 170 |

## C. 「この構成でバトル開始」→ 操作可能（ms）

| 事象 | PC run1 | PC run2 | PC reduced | SP run1 | SP run2 | SP reduced |
|---|---|---|---|---|---|---|
| BattleScreen mount＝BossEntrance 表示（最初の rAF） | 82 | 72 | 56 | 185 | 171 | 167 |
| `.enemy-avatar` 表示・手札・End Round 有効 | 82 | 72 | 56 | 185 | 171 | 167 |
| BossEntrance 消滅 | 1,593 | 1,588 | 974 | 1,581 | 1,570 | 978 |
| battle BGM `play()` 呼出 → 再生開始 | 74→787 | 67→955 | 50→445 | 45→607 | 38→374 | 48→349 |
| `battle.webm`（1,945,366B）取得完了 | 748 | 1,016 | 409 | 395 | 323 | 323 |
| SE `card_draw`（0.11s）開始 | 389 | 205 | 406 | 421 | 282 | 321 |
| SE `boss_entrance`（0.96s）開始（AudioContext 予約） | 708 | 721 | 408 | 423 | 357 | 322 |
| rAF 間隔 median／>33ms 本数 | 45／60 of 78 | 44／55 of 81 | 21／4 | 17／2 | 18／4 | 17／2 |
| CLS（click 後 4s） | 0.00002 | 0.00002 | 0.00002 | 0.0011 | 0.0011 | 0.0011 |
| HUD 箱の差分（操作可能時 vs 3.85s） | 0（enemy-avatar のみ y 1px＝`enemy-idle` の transform） | 同 | 同 | 0 | 0 | 0 |
| console／page error | 0 | 0 | 0 | 0 | 0 | 0 |

- 初陣（出陣する）：PC mount 72・消滅 1,587／SP mount 89・消滅 1,612（通常戦と同じ BossEntrance）
- 続きから：PC mount 19／SP mount 13・BossEntrance なし・SE なし・即操作可（決定128 の仕様どおり）
- click 直後の取得（PC run1）：SE 20 本 372KB・`front_640.webp` 101,898B・OTOMO 24,616B・God Strike poster 61,866B＋mp4 166,058B・`battle.webm` 1,945,366B ＝ **約 2.3MB が t=0 に同時発行**

## D. BossEntrance の CSS（`battle.css:4124-4240`・`BossEntrance.tsx`）

| 要素 | keyframes | 時間（delay） |
|---|---|---|
| root | `boss-entrance-fade`：opacity 0→1（0〜120ms）→保持→0（1,170〜1,500ms） | 1,500 |
| 舞台背景 | `boss-entrance-bg`：scale 1.08→1 | 1,500 |
| 舞台名 | `boss-entrance-rise` | 500（0） |
| 敵 art | `boss-entrance-art`：translateY 24→0・scale .85→1（overshoot） | 600（100） |
| 敵名 | `boss-entrance-rise` | 500（300） |
| ★・型・タグ | `boss-entrance-rise` | 500（450） |
| START | `boss-entrance-rise` | 400（700） |
| reduced | 静止表示 → `boss-entrance-fade-reduced`（80%〜100% で消える） | 900 |
| timer | `BOSS_ENTRANCE_MS`＝1,500／`BOSS_ENTRANCE_REDUCED_MS`＝900 | skip なし |
| 入力 | `pointer-events: none`・z-index 5 | 背後の HUD は mount 直後から押せる（見えないまま） |
