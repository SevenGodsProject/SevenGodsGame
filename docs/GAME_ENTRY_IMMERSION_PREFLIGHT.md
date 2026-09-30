# 決定254 Game Entry / Home Immersion Preflight（PREFLIGHT ONLY）

- 作成日：2026-10-01／Lane 2・docs-only
- Baseline：master＝origin/master＝`6d6c272`（runtime `9316ce1`・決定252 LIVE）。worktree `C:/Users/kimi1/SevenGodsGame-d254`・branch `docs/d254-game-entry-preflight`
- 位置づけ：**監査と SPEC のみ**。runtime／src／CSS／asset／tests／Production 変更 0・実装 0・画像／動画／音声の生成 0・有料 API／fal.ai／H3 0・commit／push／deploy 0
- 判断：本書の比較・推奨・GO 判定はすべて **AI 判断**（CLAUDE.md §6-2・§6-6）。Pilot 着手は CEO GO 後
- 表記：【実測】＝今回の Playwright 計測・コード確認（`docs/evidence/decision254/`）／【docs】＝既存文書／【推測】＝見込み
- 上流：決定128（Boss Entrance）・決定193（Entrance E1）・`docs/PHASE7_ENTRANCE_CINEMATIC_FEASIBILITY.md`（未実装）・決定244 RC5（`docs/PRACTICAL_QA_2026-09-28_AUDIT.md` §7）・決定250（God Strike cut-in）

---

## §0. 結論（先に）

| 項目 | 結論（AI 判断） |
|---|---|
| 判定 | **GO（Pilot 可・CEO GO 待ち）**／Confidence：Medium-High（技術は既存部品の延長。体感は Human QA で確定） |
| 何が弱いか | 神を選び・敵を選び・デッキを組んだ**直後の 1.5 秒に、選んだ神が一度も出てこない**。BossEntrance は敵だけの紹介で、SEVEN GODS の核である「神が降りてくる」瞬間が入口に無い |
| 採用案 | **C3「降臨の間」**：既存 BossEntrance を拡張し、①暗転 → ②神紋の光 → ③**選んだ神の降臨**（`front_640.webp`）→ ④舞台と敵の顕現（既存 BossEntrance の中身）→ ⑤HUD 開示 → ⑥操作 |
| 尺 | **初回（セッション最初の戦闘）2,800ms（操作可能 2,400ms）**／**再訪（同セッション 2 戦目以降・もう一度・同じ盤面でもう一度）1,500ms（操作可能 1,150ms）＝現行と同じ総尺**／reduced-motion 900ms（現行と同じ） |
| skip | 画面タップ／Enter／Space／Esc で即 ⑤ へ（200ms で HUD）。タップは HUD へ貫通しない。engine 状態・seed・手札は click 時点で確定済みのまま |
| 新規素材 | **0**（画像・動画・音声とも。既存の `front_640.webp`・舞台背景・敵 art・SE `resonance_gain`／`boss_entrance`・CSS のみ） |
| 追加転送量 | **0B**（使う素材は現行でも戦闘開始時に取得済み。取得の時刻をデッキ構築画面へ前倒しするだけ）。CSS／JS 増分 ≈ 6KB（gzip ≈ 2KB）【推測】 |
| 決定250 との関係 | 時間的に重ならない（God Strike は共鳴 7/7＝カード操作が要る。入口の間は操作できない）。z-index 5（入口）＞ 4（cut-in）。`.resonance-cutin-*`・God Strike の mp4／poster・`burst_ready`／`hit_l4` は**使わない**（決め所の語彙を先に消費しない） |
| 触らないもの | `src/core/**`・`enemyVfxTiming.ts`・`rules.ts`・`godStrikeVideo.ts`・`bgm.ts`・save（v9）・storage key・seed・勝敗・スコア |
| NEXT NOW | **Pilot（CEO GO 後）**：runtime 5 ファイル＋テスト 1 ファイル・約 +330 行（§8・§12） |

---

## §1. Current timeline（現行・実測）

計測条件：Production と同一 bundle（`index-0DI4r-CG.js`）を `vite preview`（127.0.0.1:4281）で配信。headless Chromium・localhost（回線遅延なし）・`--autoplay-policy=user-gesture-required`・大耀 × 蒼海の龍神。t＝「この構成でバトル開始」を押した瞬間。詳細表と生データは `docs/evidence/decision254/timeline.md`・`measure.json`。

### 1-1. PC 1508×660

| t（ms） | 見えるもの | 動くもの | 鳴るもの | 入力 |
|---|---|---|---|---|
| 起動 0→1,084 | Home（E1）。LCP＝恵比寿 `keyvisual-hero.webp`（523KB）1,084ms | body 背景 3 本だけ（`particle-drift` 140s／`star-twinkle` 5s／`magic-circle-spin` 120s）。**Home 固有の animation 0**（`setup.css` keyframes 0） | Home BGM は `play()` 拒否（NotAllowedError）→ 最初の操作で開始 | 即 |
| Home → 神選択 → 難易度・神階 → 敵選択 → デッキ構築 | 各画面 | **遷移 animation 0**（すべて hard cut。React の再描画 1 frame） | Home BGM 継続 | 即 |
| 0 | click。`engine.startGame` は同期 | — | — | — |
| 0〜120 | **HUD が一瞬透ける**（root の fade-in が opacity 0→1 に 120ms かかるため） | `boss-entrance-fade` 開始 | `playTrack('battle')`（t≈50〜74）＝**Home BGM がここで止まる** | **HUD 有効（72〜82ms）** |
| 72〜82 | BattleScreen mount・BossEntrance 表示（**敵の舞台・敵 art・敵名・★・型**。神は出ない） | 背景 scale 1.08→1（1,500）・舞台名 rise（0〜500）・敵 art（100〜700）・敵名（300〜800）・★/型（450〜950）・START（700〜1,100） | — | 押せるが**見えない**（`pointer-events:none`・背景はほぼ不透明） |
| 205〜406 | 〃 | 〃 | SE `card_draw`（0.11s） | 〃 |
| 408〜721 | 〃 | 〃 | SE `boss_entrance`（0.96s）＝**絵より 0.35〜0.65s 遅れ**（SE を mount 時に初めて取得するため） | 〃 |
| 445〜955 | 〃 | 〃 | battle BGM 再生開始（`battle.webm` 1.9MB 取得後）＝**Home BGM 停止から 0.4〜0.9s 無音** | 〃 |
| 1,170〜1,500 | 戦闘画面が現れる | root opacity 1→0 | — | 〃 |
| 1,588〜1,593 | BossEntrance 消滅 | 常駐：`arena-glow-breathe` 9s・`enemy-idle`×2 3.4s・`portrait-aura-spin` 14s・背景 3 本 | — | 見えて押せる |

- 同時取得（t≈0〜1,000）：SE 20 本 372KB・`front_640.webp` 102KB・OTOMO 25KB・God Strike poster 62KB＋mp4 166KB・`battle.webm` 1.9MB ＝**約 2.3MB が click 直後に一斉発行**【実測】
- フレーム：PC headless は GPU なしのため median 44〜45ms（>33ms が 55〜60／78〜81）。reduced では median 21ms。**PC の値は実機の目安にならない**（PHASE7 Cinematic Feasibility §9-1 と同じ注意）
- CLS 0.00002・HUD 箱差分 0（enemy-avatar の y 1px は `enemy-idle` の transform）・console error 0

### 1-2. SP 390×844

| t（ms） | 見えるもの | 動くもの | 鳴るもの | 入力 |
|---|---|---|---|---|
| 起動 0→560 | Home。FCP 544（タイトル）・LCP 560（hero） | 背景 3 本のみ | BGM 拒否 → 最初の操作 | 即 |
| setup 各画面 | 〃 | hard cut | Home BGM | 即 |
| 0〜185 | 最初の frame が重い（mount 171〜185ms）。HUD が 1〜2 frame 透ける | fade-in | `playTrack('battle')` t≈38〜45 | **HUD 有効 171〜185** |
| 171〜1,170 | BossEntrance（敵のみ） | PC と同じ keyframes | `card_draw` 282〜421・`boss_entrance` 322〜423（絵より 0.15〜0.25s 遅れ） | 見えないまま押せる |
| 349〜607 | 〃 | 〃 | battle BGM 開始（無音 0.3〜0.6s） | 〃 |
| 1,570〜1,581 | 消滅・戦闘画面 | 常駐 animation | — | 見えて押せる |

- フレーム median 17〜18ms・>33ms 2〜4 本（mount の 1 frame が 129〜202ms）・CLS 0.0011（mount 時 t≈184〜209 の SVG 等。BossEntrance 由来ではない）・HUD 箱差分 0・error 0
- reduced-motion：PC／SP とも 974〜978ms で消滅（静止 900ms）。入力は同じく mount 直後から
- 初陣（出陣する）：通常戦と同じ BossEntrance（PC 1,587／SP 1,612 で消滅）
- 続きから：mount 13〜19ms・BossEntrance なし・SE なし（決定128 の仕様どおり）

---

## §2. Root Cause（AI 判断）

| # | Root cause | 証拠【実測／docs】 | 体験への影響 |
|---|---|---|---|
| RC-A | **神の不在**：選んだ神は入口に一度も出ない。BossEntrance は敵の舞台・敵 art・敵名だけ。神は戦闘 HUD の小さな avatar として現れるだけ | `BossEntrance.tsx` に godId 引数なし。frames `*-f1-entrance-*.jpg` | 「七柱の神と挑む」の核（神降臨・共鳴）が入口で語られない。神選択の決断が報われる瞬間が無い |
| RC-B | **切り替えに儀式が無い**：Home → 神選択 → 敵選択 → デッキ → 戦闘の 5 回がすべて hard cut。Home 固有の動き 0 | `setup.css`／`polish.css`／`press.css`／`dockControls.css` の `@keyframes` 0。§1 の遷移時間 | 世界へ「入っていく」感覚が無い（決定244 #04・#14 SUPPORTED） |
| RC-C | **見えない入力受付と skip 不可**：HUD は 56〜185ms で操作可能だが、BossEntrance がほぼ不透明に 1.17s 覆う。skip なし。「もう一度」でも毎回 1.5s | `pointer-events:none`・timer のみ。§1 の入力列 | 速いプレイヤーは待たされ、遅いプレイヤーは見えないまま押せる。反復での疲労 |
| RC-D | **音が絵に遅れ、BGM に空白**：SE は mount 時に初めて取得 → `boss_entrance` が絵より 0.15〜0.65s 遅れる（localhost。実回線ではさらに遅れる【推測】）。BGM 切替で 0.3〜0.9s 無音 | `preloadSe()` が BattleScreen の effect 内。§1 の音の列 | 登場の「ドン」が敵の顕現と合わない |
| RC-E | **読み込みの集中**：約 2.3MB（BGM 1.9MB・SE 372KB・God Strike 228KB・portrait）が click 直後に一斉発行 | §1-1 同時取得 | 回線が細い端末で入口の絵・SE がさらに遅れる【推測】 |
| 副次 | fade-in の 120ms で HUD が一瞬透ける／敵の R1 台詞（`enemy-line-pop` 300ms）が不透明な入口の下で再生され見えない | `boss-entrance-fade` 0%→8%・§1 animsAt120ms | 小さな「ちらつき」と演出の空打ち |

**まとめ**：入口の欠点は「動きが少ない」ことより、**入口が"敵の紹介"で終わり、"自分の神が降りて敵と対峙する"という SEVEN GODS 固有の物語が 1 秒も無い**こと（RC-A）。RC-C〜E は同じ部品（BossEntrance）の作りの問題で、同じ Pilot でまとめて直せる。

---

## §3. 候補比較（AI 判断）

評価：◎＝強い／○／△／×。Player Value〜独自性は相対評価。

| 候補 | 内容 | Player Value | Game Feel | Retention | 実装コスト | Regression Risk | SEVEN GODS 独自性 | 新規素材 | 判定 |
|---|---|---|---|---|---|---|---|---|---|
| C1 起動 Living Still（PHASE7 Cinematic 第 1 段） | 起動時に Home hero を拡大 → タップで Home。ロゴ・粒子・光の帯 | ○（第一印象） | ○ | △（毎セッション 1 タップ追加・E1 の「続きから 1 タップ」に例外処理が要る） | △（3.5 日【docs】・既存 QA 6 本の Home 到達処理を修正） | △（LCP・E1 CEO PASS 済み Home の DOM に状態を足す） | ○ | 0 | 保留（Home 側の第 2 段） |
| C2 起動 4.5s 儀式（決定244 §7-2 草案） | 黒 → 背景粒子 → hero → タイトル → UI を段差表示。revisit 1.5s | ○ | ○ | ×（毎セッション Primary まで 4.5s。復帰勢に不利） | ○ | △（LCP・Home の全要素に animation） | △（世界観の語りが弱い：誰と戦うかと無関係） | 0 | 棄却 |
| **C3 降臨の間（BossEntrance 拡張）** | **選んだ神の降臨 → 舞台と敵の顕現 → 対峙 → HUD**。初回 2.8s／再訪 1.5s／skip／reduced 0.9s | **◎**（神・敵・デッキの決断直後に報う） | **◎**（音と絵の同期・HUD のちらつき解消・skip） | **○**（2 戦目以降は現行と同尺。skip で短縮可） | **◎**（5 ファイル・約 +330 行・既存部品の延長） | **○**（BossEntrance の局所変更。engine 0。入力の遮断だけ注意） | **◎**（神降臨 → 敵と対峙＝神 × 敵 攻略の物語そのもの） | **0** | **採用** |
| C4 画面遷移クロスフェードのみ | setup 画面間を 180ms crossfade・BossEntrance に skip だけ追加 | △ | ○ | ○ | ◎ | ◎ | ×（どのゲームにもある） | 0 | 棄却（RC-A を解かない）。C3 後の小改善として保留 |
| C5 神降臨の動画（生成） | 神ごとの降臨ムービー | ◎【推測】 | ◎ | △ | ×（7 柱生成・権利確認） | △ | ◎ | **要（動画 7 本）** | **棄却**（新規生成は本件の制約外・§6-3 #5/#6・H3／COV-M NO-GO【docs 決定219〜223】） |
| C3' C3＋keyvisual 版 | 神の絵を `keyvisual.webp` にする | ○ | ○ | ○ | ◎ | ○ | △ | 0 | 棄却：keyvisual は God Strike cut-in（決定250）と Victory Stage（決定226）の決め所の絵。入口で使うと決め所の新鮮さを削る |
| C3'' C3＋神ごとの専用降臨 SE | 神ごとに声・専用音 | ○ | ◎ | ○ | △ | ○ | ◎ | **要（音声 7 本）** | 棄却（新規生成・声は §6-3 #5） |

**採用理由（C3・AI 判断）**
1. RC-A（神の不在）を直接解くのは C3 だけ。C1／C2 は Home の見栄えで、「自分の神が降りて、選んだ敵と対峙する」という決断の payoff にならない
2. 時間コストが最小：追加は**セッションの最初の 1 戦だけ +1.3s**、2 戦目以降は現行と同じ 1.5s、しかも skip 可（現行は skip 不可）
3. Regression が局所：BossEntrance は表示専用・`pointer-events` と timer だけの部品で、engine・Home（E1 CEO PASS）・QA スクリプトの Home 到達処理に触れない
4. RC-C／D／E（入力・音・読み込み）が同じ部品の修正でまとめて解ける
5. C1（Home 起動演出）は否定しない。C3 の Human QA を通した後、同じ「神紋の光」語彙で Home 側の第 2 段にできる（語彙の共有で独自性が増す）

---

## §4. 提案する Entry Sequence（C3「降臨の間」）と exact timing

### 4-1. 物語（SEVEN GODS 独自の枠組み）

「共鳴の門が開く → 神紋が灯る → **選んだ神が降臨する** → 神の前に舞台が開け、敵が顕れる → 神と敵が対峙する → 門が閉じ、戦場（HUD）が現れる」。演出の主語は常に**プレイヤーの神**で、敵はその神の前に顕れる。語は既存の世界観語（神降臨・共鳴・神域）だけを使い、他作品の構図・文言は使わない。

### 4-2. Full（セッション最初の戦闘・初陣を含む）＝総尺 2,800ms／操作可能 2,400ms

| Phase | t（ms） | 見せるもの | 動き（transform／opacity のみ） | 音 | 入力 |
|---|---|---|---|---|---|
| P0 暗転 | 0〜250 | 入口を**最初から不透明**で mount（HUD を 1 frame も透かさない）。舞台背景は未表示 | 黒 `#05060d` の幕 opacity 1（固定） | battle BGM 切替は現行どおり（`playTrack('battle')`・変更なし） | タップ＝skip |
| P1 神紋・光 | 250〜750 | 神の色（`GOD_THEME_COLOR[godId].base`）の神紋（CSS `conic-gradient`＋`radial-gradient` の円 1 枚） | scale 0.6→1.0・rotate 0→40deg・opacity 0→0.85（500ms ease-out） | **SE `resonance_gain`（既存・0.15s）rate 0.8・gain `SE_GAIN.stateChange`**（t=250） | 〃 |
| P2 神降臨 | 600〜1,500 | **選んだ神 `front_640.webp`**＋「{神名} 降臨」（小さな字間の広い見出し） | 神：translateY(-18px)→0・scale 1.04→1.0・opacity 0→1（650ms ease-out、600〜1,250）。見出し：`boss-entrance-rise`（既存 keyframe 再利用・900〜1,400）。神紋は 1,250 から opacity 0.85→0.35 | — | 〃 |
| P3 短い SE | 1,500 | — | — | **SE `boss_entrance`（既存・0.96s・gain `bigMoment`）**＝敵の顕現と同時（事前取得済みなので遅れ 0） | 〃 |
| P4 舞台・敵の顕現（対峙） | 1,500〜2,400 | 敵の舞台背景（`def.stage.bg`）・敵 art・舞台名・敵名・★・型・DAILY／神階タグ（**現行 BossEntrance の中身をそのまま**） | 背景 `boss-entrance-bg`（scale 1.08→1・900ms）・敵 art `boss-entrance-art`（1,550〜2,150）・名前群 `boss-entrance-rise`（1,650〜2,250 に段差）。**PC**：神は左 1/3 に留まり opacity 0.9（対峙）。**SP**：神は scale 0.62・translateY(+24vh)・opacity 0.55 へ沈み、敵が上中央に立つ | （`boss_entrance` の余韻） | 〃 |
| P5 HUD 開示 | 2,400〜2,800 | 戦闘 HUD（mount 済み・配置確定済み） | 入口 root の opacity 1→0（400ms）。**HUD 側は一切 animate しない**（layout shift 0） | — | **2,400 から操作可**（root を `pointer-events:none` に切替） |
| P6 操作 | 2,800 | 戦闘画面 | 入口を unmount | — | 可 |

### 4-3. Short（再訪）＝総尺 1,500ms（現行と同じ）／操作可能 1,150ms

対象：同じセッション（ページ読み込み）内の 2 戦目以降・「もう一度」・Solve Loop の「同じ盤面でもう一度」・Daily の再挑戦。

| Phase | t（ms） | 内容 | 音 |
|---|---|---|---|
| P0 暗転 | 0〜100 | 不透明で mount | — |
| P1＋P2 神降臨（短） | 100〜550 | 神紋なし。神 `front_640` を 400ms で降ろす（translateY -12→0・opacity 0→1） | `resonance_gain` rate 0.8（t=100） |
| P4 舞台・敵 | 450〜1,150 | 現行 BossEntrance の中身を 700ms に圧縮（art 450〜900・名前群 550〜1,050） | `boss_entrance`（t=450） |
| P5 HUD | 1,150〜1,500 | root opacity 1→0（350ms） | — |
| 操作 | **1,150** | — | — |

### 4-4. PC／SP の差

| 項目 | PC 1508×660（横長） | SP 390×844（縦長） |
|---|---|---|
| 構図 | **横の対峙**：神＝左（中心 x 30%・高さ 62vh）、敵＝右（中心 x 68%・`min(34vh, 260px)`） | **縦の継承**：神＝中央上（幅 64vw）→ P4 で下へ沈み、敵が上中央へ |
| 神の画像 | `front_640.webp`（640² 相当・1 倍表示で等倍以下） | 同（DPR3 で 64vw≈250CSSpx＝750 物理 px → 640 から 1.17 倍拡大。甘さは Human QA 項目） |
| 文字 | 神見出し 22px・敵名 `clamp(26px, 6vw, 40px)`（現行） | 神見出し 18px・敵名は現行と同じ |
| skip ヒント | 右下「クリックでスキップ」11px・opacity 0.55（t≥800） | 下中央「タップでスキップ」11px（t≥800） |
| 時間 | Full／Short／reduced とも同じ ms | 同じ（SP だけ短くはしない：体験の一貫性） |

---

## §5. First visit／Revisit／Skip／Reduced motion

| 条件 | 挙動 | 判定の仕組み |
|---|---|---|
| First（セッション最初の戦闘） | Full 2,800ms | `BossEntrance.tsx` のモジュール変数 `fullEntranceShownThisSession`（**メモリのみ・storage 不使用**）。Full を 1 回 mount した時点で true（skip しても true） |
| Revisit（同セッション 2 戦目以降・もう一度・同盤面リトライ・Daily 再挑戦） | Short 1,500ms（現行と同尺） | 同上 |
| 新しいセッション（再読み込み・再訪問） | Full 1 回 → 以後 Short | ページ読み込みでモジュール変数が初期化される |
| 続きから | **入口なし**（現行どおり。`battleStartKey` が増えない） | 変更なし |
| Skip | 入口の root が P0〜P4 の間 `pointer-events:auto`。`pointerdown`（タップ／クリック）・`keydown`（Enter／Space／Esc）で即 P5 へ（fade 200ms）。**未再生の SE（`boss_entrance` の予約）は取り消す**、再生中の SE はそのまま。タップは `stopPropagation`＋入口が最前面なので**手札・End Round に貫通しない** | 保持されるもの：engine state（click 時に確定済み）・seed・R1 の敵意図・手札・BGM・session フラグ。失うもの：なし |
| Reduced motion（`prefers-reduced-motion: reduce`） | **900ms（現行と同じ）**：神（左／上）と敵（右／下）・名前・★ を**最初から静止で同時表示**（scale／translate／rotate／神紋なし）→ 720〜900ms で opacity 1→0。操作可能 720ms。SE は同じ 2 本（音は motion ではない）。Skip は fade 0ms で即 unmount | `reducedMotion.ts` の `prefersReducedMotion()`（決定250 と同じ関数に統一。現行の inline `matchMedia` を置換） |
| 安全弁 | どの状態でも `setTimeout` が総尺で必ず `onDone`（現行と同じ方式）。神画像の読み込み失敗時は神の `<img>` を隠し見出しだけ（`onError`）。入口の JS 例外は ErrorBoundary 外に出さない（表示専用・state 非依存） | — |

**AI 判断（storage を使わない理由）**：localStorage の「一生に一度だけ Full」は儀式が 1 回で消え Retention に寄与しない。sessionStorage でも同等だが、新規 key は CLAUDE.md §3-5（version 付与）・Storage 監査の対象を増やす。メモリ変数は新規 key 0・save v9 不変・再訪（再読み込み）で自然に Full に戻り、要件「first visit full／revisit shortened」を満たす。

---

## §6. 再利用する素材（新規素材：**不要**）

| 用途 | 素材 | bytes【実測 `ls -la`】 | 現行での取得時刻 |
|---|---|---|---|
| 神降臨（7 柱） | `public/assets/gods/{id}/front_640.webp` | ebisu 91,982／taiyo 101,898／sobi 94,576／saika 117,202／juraku 87,342／fukuei 107,520／shouren 98,604 | 戦闘 mount 時（`PlayerPanel` の avatar） |
| 舞台背景（7 敵） | `public/assets/backgrounds/stages/0{1-7}-*.webp` | 237,844／214,090／297,936／271,074／308,102／321,686／281,906 | 戦闘 mount 時（現行 BossEntrance・舞台） |
| 敵 art | `public/assets/enemies/*`（現行 BossEntrance と同じ `def.art`） | 変更なし | 同上 |
| SE 神紋 | `public/assets/se/resonance_gain.wav`（0.15s） | 6,660 | 戦闘 mount 時（`preloadSe()`） |
| SE 顕現 | `public/assets/se/boss_entrance.wav`（0.96s） | 42,380 | 同上 |
| BGM | `bgm/battle.webm` 1,945,366／`battle.mp3` 3,735,973（切替のタイミング・音量は**変更なし**） | — | 現行どおり |
| CSS | 既存 keyframes `boss-entrance-bg`／`boss-entrance-art`／`boss-entrance-rise` を再利用＋新規 keyframes 3 本（神紋・神降臨・PC/SP の対峙移動）を `battle.css` 末尾に追記 | CSS 増分 ≈ 3.5KB | — |
| 神の色 | `godStyle.ts` の `GOD_THEME_COLOR[godId].base`（既存値） | — | — |

**使わないもの（理由）**：`keyvisual.webp`（God Strike cut-in と Victory Stage の決め所の絵）／`back.webp`（白背景未処理【`GameOverOverlay.tsx:300` のコメント】）／`main.png`（259〜324KB・`front_640` と同じ絵で重い）／`keyvisual-home.webp`・`keyvisual-hero.webp`（Home の hero。311〜523KB）／`god-strike-v2.mp4`・`god-strike-v2-poster.webp`（決定250 の payoff 専用）／`fx/cast-*.png`（262〜429KB・カード種別の演出で意味が違う）／SE `burst_ready`・`hit_l4`（God Strike の音の語彙）。

**新規素材が必要な variant（すべて棄却）**：C5 神降臨動画（7 本）／C3'' 神ごとの降臨ボイス・専用 SE（7 本）／神紋の専用画像（CSS で代替できるため不要）。

---

## §7. Performance risk と計画

| 指標 | 予算（Pilot Gate） | 守り方 |
|---|---|---|
| Layout shift | **HUD 箱差分 0**（入口消滅直後 vs +2s）・CLS ≤ Production（PC 0.00002／SP 0.0011） | 入口は `position:fixed`。HUD は animate しない。入口の中だけで transform |
| 入力遅延 | click → mount の frame は Production と同等（PC ≤ 90ms／SP ≤ 200ms headless）。skip → 操作可能 ≤ 250ms | `engine.startGame` の呼び出し位置・同期性は不変。入口は mount 同 frame |
| Dropped frame | SP headless：入口中の >33ms frame ≤ 4（Production 2〜4 と同等）。PC headless は参考値。**実機 iPhone／PC を Human QA で確認** | transform／opacity のみ。`filter`・`mix-blend-mode`・`box-shadow` の animation 禁止（PHASE7 §9-1：blend が主因【docs】）。同時に動く層 ≤ 4（神紋・神・敵 art・文字群）。`will-change` は入口の間だけ |
| Preload | 入口の素材を **click 前に**取得・decode | `DeckBuilderScreen` mount 時に `new Image()`＋`img.decode()`：神 `front_640`・敵 art・舞台背景。同時に既存 `preloadSe()` を前倒し（同じ 20 本・同じ 372KB。BattleScreen 側の呼び出しは重複しても no-op＝`loading` Map でキャッシュ済み） |
| 資産サイズ | 新規 0B。前倒し分：神 87〜117KB＋舞台 214〜322KB＋敵 art＋SE 372KB（**すべて現行でも戦闘開始時に取得している同じ bytes**） | 初陣（デッキ構築を通らない）は `FirstBattleBrief` 表示時に同じ preload を呼ぶ |
| BGM | 変更しない（無音 0.3〜0.9s は P0〜P1 の SE が埋める） | `bgm.ts` 0 行。BGM の前倒し取得（1.9MB）は SP の回線コストが大きいので**しない**（AI 判断） |
| 決定250 動画 | God Strike の先読み（mp4 166KB＋poster 62KB）は現行どおり戦闘 mount 時 | 入口の素材は先に取得済みなので帯域を取り合わない |
| 実回線 | localhost 計測のみ。SP 1.6Mbps 等の回線制限計測は Pilot Gate で実施 | preload が間に合わない場合も入口は時刻どおり進む（神 img は読み込み完了で opacity を上げる。未完了なら見出しのみ） |

---

## §8. Implementation scope（Pilot で変更するファイル）

| ファイル | 変更 | 見込み |
|---|---|---|
| `src/components/battle/BossEntrance.tsx` | `godId`・`variant`（'full'／'short'）を受ける／phase timer（`BATTLE_ENTRANCE_FULL_MS`=2,800・`_FULL_CONTROL_MS`=2,400・`_SHORT_MS`=1,500・`_SHORT_CONTROL_MS`=1,150・reduced 900／720・`SKIP_FADE_MS`=200 を同ファイルに export。**`enemyVfxTiming.ts` には置かない**）／skip（pointerdown・keydown）／SE 予約と取消／セッション変数／`prefersReducedMotion()` へ統一 | +95／−10 |
| `src/components/battle/battle.css` | **末尾追記のみ**：`.battle-entrance-*`（神紋・神・見出し・対峙の PC/SP 配置・skip ヒント・reduced）＋keyframes 3 本。既存 `.boss-entrance-*` は削除せず、root の fade-in だけ新 class で上書き（不透明で開始） | +140 |
| `src/components/battle/BattleScreen.tsx` | `<BossEntrance>` へ `godId={state.godId}` と variant を渡す。`sfx.bossEntrance()` の即時呼び出しを BossEntrance 内の予約へ移す（`preloadSe()` は残す） | +6／−2 |
| `src/components/battle/sound.ts` | `sfx.godDescend = () => playBuffer('resonance_gain', { gain: SE_GAIN.stateChange, rate: 0.8 })`（既存音源・既存 gain）＋`sfx.bossEntrance` に `delayMs` 引数（既存 playBuffer の option） | +3 |
| `src/components/setup/DeckBuilderScreen.tsx`（＋`FirstBattleBrief.tsx` 1 行） | mount 時の preload（神 `front_640`・敵 art・舞台背景・`preloadSe()`）。表示・操作は不変 | +14 |
| `src/components/battle/battleEntrance.test.ts`（新規） | 尺・操作可能時刻の定数関係（full>short・control<total・short=現行 1,500・reduced=900）／セッション変数（1 回目 full・2 回目 short）／skip で SE 予約が取り消される／`enemyVfxTiming.ts`・`src/core` を import しない（ソース固定）／`.resonance-cutin`・`god-strike` を参照しない | +80 |
| **変更しない** | `src/core/**`・`enemyVfxTiming.ts`・`godStrikeVideo.ts`・`BattleResonanceCutin.tsx`・`bgm.ts`・`rules.ts`・`GameFlow.tsx`・`HomeScreen.tsx`・storage 全部・save v9・`useGameEngine`（`battleStartKey` の意味も不変） | 0 |

合計：runtime 5 ファイル（＋1 行）＋テスト 1・**約 +340／−12 行**・新規 storage key 0・新規 asset 0。

**結果・seed・戦闘時刻の保証**：engine は click 時に同期で開始済み（現行と同一）。入口は React の表示層で、reducer への dispatch は 0。スコア式に実時間の要素は無い（`src/core` で時刻を使うのは Daily の日付判定 `dailyBoss.ts` のみ【実測 grep】）。入口の間にカードを押せなくなる変更は「実時間」だけに作用し、engine の入力列・seed・R1 の手札／意図は不変。`enemyVfxTiming.ts` の全定数（`RESONANCE_CUTIN_MS` 900・`BURST_IMPACT_MS` 1,600 等）は 0 行変更。

---

## §9. 決定250 God Strike cut-in との関係（衝突しない保証）

| 観点 | 入口（本件） | God Strike（決定250） | 衝突しない理由 |
|---|---|---|---|
| 発生時刻 | 新規開始の直後 0〜2,800ms | 共鳴 7/7 に達したカード使用の後 | 新規開始時の共鳴は 0。7/7 にはカード操作が要り、入口の間（P0〜P4）は入力を入口が受ける＝**物理的に同時発生しない**。続きから（共鳴 7 の保存もありうる）は入口を出さない |
| mount | BattleScreen の `entranceKey`（`battleStartKey` 増分時） | `BattleResonanceCutin`（`fx.burstKey`） | 別 state・別 component。入口は cut-in の state を読まない・書かない |
| z-index | 5（現行 BossEntrance と同じ） | 4（`.resonance-cutin`） | 万一重なっても入口が上で、入口は時刻で必ず消える |
| CSS | 新 class `.battle-entrance-*`＋既存 `boss-entrance-*` keyframes | `.resonance-cutin-*`／`.resonance-cutin-video` | **selector を共有しない**（決定250 のテスト・Gate の md5 比較に影響しない） |
| 素材 | `front_640`・舞台・敵 art | `keyvisual`・`god-strike-v2.mp4`・poster | 絵を共有しない。決め所の絵を入口で先に見せない |
| 音 | `resonance_gain`（rate 0.8）・`boss_entrance` | `burst_ready`・`hit_l4` | 音の語彙を共有しない |
| reduced-motion | `prefersReducedMotion()`（同じ関数）：静止 900ms | 同関数：動画なし・静止 cut-in | 判定源が同じなので片方だけ動く状態が起きない |
| 先読み | デッキ構築 mount 時（入口素材） | 戦闘 mount 時（mp4＋poster・現行どおり） | 取得時刻がずれるので帯域を取り合わない。`createGodStrikeVideoPreload` は 0 行変更 |
| timing 定数 | `BossEntrance.tsx` 内に定義 | `enemyVfxTiming.ts`／`godStrikeVideo.ts` | ファイルを分け、入口側から import しない（テストで固定） |

---

## §10. Risks

| リスク | 影響 | 対策 |
|---|---|---|
| 入口中の入力遮断で既存の自動 QA が遅くなる／失敗する | Playwright の `locator.click()` は「要素が遮られている」間は自動で待つ（最大 2.8s）。`el.click()` を evaluate で呼ぶスクリプトは入口を貫通して押せる | Pilot Gate で主要 Gate スクリプト（release-audit・solve-loop・daily）を実走。必要なら共通 helper に「入口があれば skip をクリック」1 行（`わかった` と同じ扱い） |
| 初回 +1.3s が「待たされる」と感じる | Retention 微減【推測】 | セッション 1 回のみ・skip は t=0 から有効・2 戦目以降は現行と同尺。Human QA Q3 で確認 |
| SP DPR3 で `front_640` が甘い | 神の見え方 | 64vw 表示で 1.17 倍拡大に留まる。Human QA Q5。駄目なら `front.webp`（141〜232KB）へ差し替え（非生成・既存） |
| 神の絵と敵の絵の画風差・大きさ差 | 対峙の違和感 | 敵 art は現行サイズ・神は PC 62vh に上限。Human QA Q2 |
| 実機 PC／iPhone のフレーム落ち | カクつき | transform／opacity のみ・層 ≤4・blend/filter 禁止。Human QA で実機確認（headless PC は参考値） |
| preload が遅回線で間に合わない | 神が出ないまま進む | 時刻は止めない。未取得なら見出しのみ（体験は現行と同等以上） |
| 「降臨」の文言・演出が他作品の模倣に見える | IP | 構図は「神紋 → 神 → 敵の舞台」で SEVEN GODS の既存素材と語だけ。動画・固有ロゴ演出なし |
| 決定250 Pilot（大耀のみ動画）との検証交差 | Gate の比較が複雑化 | selector・素材・音・定数を共有しない（§9）。God Strike の Gate スクリプトをそのまま回帰に使う |
| E1（Home）への波及 | Home の CEO PASS を崩す | Home・GameFlow は 0 行変更 |

---

## §11. GO／NO-GO

**GO（Pilot 実装に進んでよい）— AI 判断・CEO GO 待ち**

| 条件 | 状態 |
|---|---|
| 新規素材 0 | ✔（§6） |
| engine／seed／結果／`enemyVfxTiming.ts` 不変 | ✔（§8・§9） |
| 追加転送量 0・layout shift 0 の設計 | ✔（§7） |
| first／revisit／skip／reduced の全経路が定義済み | ✔（§5） |
| 決定250 と非衝突 | ✔（§9） |
| CEO 判断事項（§6-3）への該当 | なし（既存仕様の範囲の演出改善。根本コンセプト・課金・権利・Production 公開は含まない。Production 公開は別途 CEO 承認） |
| 残る不確実性 | 体感（尺・構図・神の拡大率）→ Human QA で確定 |

NO-GO にする条件（Pilot 中に判明した場合）：HUD 箱差分 ≠ 0／SP headless で入口中の >33ms frame が 8 以上／skip のタップがカード使用に貫通／既存 Gate スクリプトの失敗が helper 1 行で解消しない。

---

## §12. Exact Pilot scope

1. **branch**：`feat/d254-battle-entrance`（master の最新から。決定213・feat/d224 の runtime 混入 0）
2. **実装**：§8 の 5 ファイル＋テスト 1 ファイル。7 柱すべて同じ仕組み（神ごとの数値は `GOD_THEME_COLOR` の既存値のみ。神ごとの調整値は追加しない）
3. **自動 Gate**
   - tsc 0／lint 0／vitest 全 PASS（現行 1,266＋新規）／build OK／`src/core`・`enemyVfxTiming.ts`・`godStrikeVideo.ts`・`bgm.ts` の diff 0
   - Playwright（PC 1508×660・SP 390×844・reduced 各 1）：
     - T1 Full：mount ≤ Production＋20ms／操作可能 2,400±50ms／消滅 2,800±80ms／`resonance_gain` 開始 250±80ms／`boss_entrance` 開始 1,500±80ms（preload 済み）
     - T2 Short（同セッション 2 戦目・「もう一度」）：操作可能 1,150±50／消滅 1,500±80（**現行と同尺**）
     - T3 Skip：t=300 でタップ → 操作可能 ≤ 550ms・手札の枚数と AP が不変（タップが貫通しない）・`boss_entrance` が鳴らない
     - T4 Reduced：消滅 900±80・入口中の `getAnimations()` に transform 系 keyframes 0
     - T5 Layout：入口消滅直後と +2s の HUD 箱（topbar・enemy-avatar・hand・end-round・god-otomo-plate・hp・intent）差分 0・CLS ≤ Production
     - T6 続きから：入口なし（mount ≤ 30ms）
     - T7 回帰：決定250 God Strike（大耀で 7/7 → 動画 cut-in）・Victory Reveal・Daily 開始・初陣・Solve Loop リトライが PASS。console error 0
     - T8 同一 seed の 2 対局で R1 手札・敵意図・結果ログが Production と一致（engine 不変の確認）
4. **Human QA（CEO・PC＋iPhone 実機）**：5 問
   - Q1 デッキを組んで開始したとき、「自分の神が降りてきて、選んだ敵と向き合った」と感じたか
   - Q2 神と敵の大きさ・位置（PC は左右の対峙、iPhone は上下）に違和感はないか
   - Q3 初回 2.8 秒は長いか。2 戦目以降（1.5 秒）とタップでのスキップは快適か
   - Q4 音（神紋の鈴 → 敵の顕現のドン）が絵と合っているか
   - Q5 iPhone で神の絵が甘く見えないか・カクつかないか
5. **Production 公開**：Human QA PASS 後、別途 Release Gate と CEO 承認（§6-3 #8）

---

## §13. 触っていないこと

- runtime／`src/**`／CSS／tests／`public/assets/**`：変更 0（worktree の `scripts/decision254/*.mjs` は計測用の使い捨てで commit しない。写しを `docs/evidence/decision254/*.txt` に保存）
- 画像・動画・音声の生成 0／有料 API・fal.ai・H3 0
- `src/core`・`enemyVfxTiming.ts`・`rules.ts`・save・storage・seed・カード／敵数値：0
- Production（`6d6c272`／runtime `9316ce1`）・他 worktree・main checkout（`feat/d224-premium-payoff-pilot` の未 commit 変更を含む）：不変
- commit／push／merge／deploy：0
- 敵 7 体アート（HOLD 継続）・God Strike Voice（§6-3 #5）：対象外
