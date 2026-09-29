# Card Play Travel PRE-AUDIT（出したカードが戦場へ入る — 監査／原因／設計のみ）

- 日付：2026-09-27／作成：AI（pipeline slot・監査／原因／設計のみ）
- 対象コード：Production と同一の worktree `C:/Users/kimi1/SevenGodsGame-hud-rc`（**`2389d21`**＝決定235 の後）。読み取りのみ
- **runtime 変更 0**（`src/`・`public/`・`package*.json`・テスト・`docs/DECISIONS.md`・他レーンの docs／scripts は未編集。worktree／branch／commit／deploy なし。hud-rc の再 build なし）
- 計測：hud-rc の既存 `dist` を `vite preview`（127.0.0.1:4301）で配信し、Playwright（headless Chromium）で採取。**計測後にサーバー停止済み**（4301 の待ち受け 0。Lane 3 の 4195／4196 には触れていない）
  - `scripts/card-play-travel-audit/probe.mjs`：タップ→commit の時刻・座標・animation、途中フレームの撮影（280ms の commit タイマーだけをページ内で一時延長して止めて撮る）、Pilot の試作（page script の WAAPI だけで複製カードを神へ飛ばす）
  - `scripts/card-play-travel-audit/blendcheck.mjs`：中央の閃光の「黒い四角」が実描画かどうかの確認（止めずに実時間で撮影）
  - 出力：`scripts/card-play-travel-audit/out/`（`probe.json`・`probe-hotfix.json`・`blendcheck.json`・`{pc,sp,sp-reduced}-{before,proto}-{000,060,120,200,270}.png`・`hotfix-{pc,sp}-*.png`・`blend-*.png`）
  - 対戦：大耀 × 蒼海の龍神・`?seed=d223-pilot-01`。PC 1508×660／SP 390×844／SP reduced-motion
- 本書の判断はすべて **AI 判断**（CLAUDE.md §6）。CEO 判断が必要な事項（§6-3）には該当しない（表示専用・数値／勝敗／save／入力ロック不変）

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 「カードが戦場に入らない」の正体 | **カードの一生が手札の中で終わる設計**。`card-play`（0.28s）は手札の位置で拡大→縮小→フェードするだけで、**行き先（神・敵）の座標をどこにも渡していない**。しかも SP の手札は横スクロール帯（`overflow-y: hidden`・上余白 26px）なので、**手札の中の要素は 26px より上へは動けない**（動かすと切れる）＝「外へ出す」には手札の外の層が要る |
| **新しく見つけた欠陥（重要）** | **中央の閃光（cast-flash）の PNG が、光ではなく「黒い不透明な四角」として描かれている**。`.cast-flash` は `position: fixed; z-index: 8` で独立した重なり（stacking context）になり、中の `.cast-flash-art` の `mix-blend-mode: screen` はその中だけで合成される＝**背景の舞台と合成されず、PNG の黒地がそのまま出る**。実測で 1 辺 386px の黒い四角が回転しながら、PC では**神の上**、SP では舞台の中央を 0〜280ms 覆う（`out/blend-production.png`・`out/pc-before-120.png`）。コンテナへ `mix-blend-mode: screen` を 1 行足すと本来の光になる（`out/blend-blend-on-container.png`） |
| **推奨 Narrow Pilot（1 つ）** | **Card Travel v1「神へ捧げる」**：タップの瞬間、**画面に出ている同じカードを複製した「ゴースト」**を手札の外（`position: fixed` の層）に出し、**240ms で神の立ち絵へ飛ばして吸い込ませる**（持ち上げ 60ms → 弧を描いて加速 → 神の胸元で縮んで消える）。手札の元カードはその瞬間に不可視。**新規 asset 0・新規 SE 0・`CardView.tsx`／`battle.css` の編集 0** |
| 前提（別 Decision・先に出す） | **H0 Hotfix：`.cast-flash { mix-blend-mode: screen; }`（CSS 1 行）**。黒い四角が神の上に残ったままだとゴーストが黒の中へ消えるため。Lane 3 の A'（珠修正を Pilot 前に独立 Hotfix）と同じ理由で分ける（Human QA の差を切り分ける） |
| 主な数値 | ゴースト 240ms（commit 280ms の **40ms 前に消える**）／持ち上げ 16px・×1.10／弧の高さ ≤40px／終点：神の立ち絵の中心 x・上から 45%／終端 scale 0.22・opacity 0。飛ぶ距離の実測 PC 408px・SP 310px |
| 入力ロック | **増分 0ms**：`CARD_PLAY_REVEAL_MS = 280` と `isPlayerTurn` の式は不変。ゴーストは `pointer-events: none`・`inert`・新しい state なし・commit 前に消える |
| 既存タイムラインとの同期 | 0ms タップ SE（決定233）＝持ち上げ開始／220ms 神の構え完了（既存）≒ ゴースト到着 204〜240ms／280ms commit → 神の突き → 着弾 370ms（重い 430ms・決定232）は**不変** |
| 触らないもの | `src/core`・`CARD_PLAY_REVEAL_MS`・`planBatch`・着弾時刻・hit stop・SE・神の構え／突き・中央閃光の位置と時間（H0 の合成方法以外）・決定224 の金の輪・`CardView.tsx`・`battle.css`（Pilot 分） |
| Verdict | **H0 Hotfix → Card Travel v1 Pilot の順で GO（AI 判断）**。Before／After を同じ seed で Human QA（§7） |

---

## 1. CURRENT CARD PLAY TIMELINE（Production `2389d21`・時刻はタップ＝0ms）

| 時刻 | 何が起きるか | file:line | 実測（headless） |
|---|---|---|---|
| 0 | クリック → `sfx.cardTap()`（決定233：押した瞬間の音）→ `setPendingCardUid(uid)` → 280ms のタイマー予約 | `src/hooks/useGameEngine.ts:392-404` | — |
| 0（次の描画） | `pendingCardUid` があるので `isPlayerTurn = false` → **全カード・「ラウンドを終える」が disabled（入力ロック開始）** | `BattleScreen.tsx:296-302`・`:559` | `.card-view-playing` 出現 5〜55ms |
| 0〜280 | **`card-play` 0.28s ease-in**：0→40%（112ms）で scale 1.08・上 10px・brightness 1.3、→100% で scale 0.6・上 40px・opacity 0。**手札の位置で消える** | `battle.css:2460-2481` | opacity：60ms 0.93／120ms 0.76／200ms 0.43／270ms 0.06。SP でも上余白 26px の中に収まり切れていない（visible 100%） |
| 0〜 | **cast-flash** を mount：`position: fixed; inset: 0; place-items: center; z-index: 8`＝**画面の中央**。リング 0.35s、タイプ別 pop（attack 0.4s／guard・resonance・hinder 0.45s／support・oracle 0.5s）、PNG 320×320＋アイコン 130px | `BattleScreen.tsx:444-456`・`battle.css:185-223`・`:259-380` | 閃光の中心 PC (754,330)／SP (195,422)。**PNG の黒地が不透明な四角で出る**（§2 R2） |
| 0〜220 | 神の構え（敵にダメージを与えるカードだけ）：−7px・scale 0.97・220ms | `BattleScreen.tsx:322`・`battle.css:4327-4333` | — |
| 280 | commit：`setPendingCardUid(null)`＋`dispatch(PLAY_CARD)`。**カードの DOM 削除・cast-flash unmount・手札の詰め直し・入力ロック解除**が同時 | `useGameEngine.ts:399-402` | カード削除＝閃光消失＝ロック解除：301〜343ms（初回コールドの 1 回だけ 555ms） |
| 280〜 | 神の突き `god-strike` 0.34s（重い本体は `god-strike-heavy` 0.52s） | `battle.css:4334-4345`・決定232 の追記ブロック | — |
| 370 | 通常の着弾（`CARD_IMPACT_MS = 90`） | `enemyVfxTiming.ts:123`・`combatTimeline.ts:126-127` | 決定232 計測値 |
| 430 | 重い本体（生 tier≥3）の着弾（`CARD_HEAVY_IMPACT_MS = 150`） | `enemyVfxTiming.ts:142` | 決定232 計測値 |
| 本体＋150 | 条件⚡（決定224：34px 金・stop 50） | `enemyVfxTiming.ts:127` | 通常 520／重い 580 |
| 1,880 | 神の一撃（共鳴 7/7・`BURST_IMPACT_MS` 1,600） | `enemyVfxTiming.ts:102` | 決定232 計測値 |

座標（実測・`out/probe.json`）：

| | 手札（受け流し）中心 | 神の立ち絵 | 敵の立ち絵 | 中央閃光の中心 | 閃光中心→神中心 |
|---|---|---|---|---|---|
| PC 1508×660 | (507,572) | 242×168・中心 (835,311) | 中心 (383,297) | (754,330) | **81px** |
| SP 390×844 | (68,755) | 142×142・中心 (254,489) | 中心 (98,471) | (195,422) | **89px** |

- 手札：PC は `overflow: visible`、SP は `overflow-x: auto; overflow-y: hidden; padding-top: 26px`（`battle.css:5469-5481`）
- 手札から上の祖先に transform／filter／contain は無い＝`position: fixed` の要素は正しく画面基準で置ける（実測 `fixedBlockingAncestor: null`）

---

## 2. ROOT CAUSE

### R1. カードの行き先がコードに存在しない（主因）
- `CardView` は `playing` を受け取って `card-view-playing` クラスを付けるだけ（`CardView.tsx:78`）。演出は `card-play` keyframes（`battle.css:2460`）で、**translate は自分の位置からの相対値（上へ 40px）だけ**。神（`PlayerPanel`）・敵（`EnemyPanel`）の座標を CardView へ渡す経路はどこにも無い
- ⇒ どのカードも「その場で少し浮いて縮んで消える」。**戦場に何も届かない**（決定225 §H・W7/W8 の指摘と一致）

### R2. 中央閃光が「どこにも属さない」うえに、黒い四角として描かれている
- 位置：`.cast-flash` は `position: fixed; inset: 0; display: grid; place-items: center`（`battle.css:185-192`）＝画面の真ん中。神・敵・カードのどれにも紐づかない
- 描画の欠陥：`.cast-flash-art` の `mix-blend-mode: screen`（`battle.css:216-223`）は、**親 `.cast-flash` が `position: fixed＋z-index: 8` で独立した重なりを作るため、その中（透明な背景）とだけ合成される**。結果、PNG の黒地がそのまま出る
  - 実測（止めずに実時間 110ms で撮影）：SP で 386×386 の黒い四角が回転しながら舞台の大半を覆う（`out/blend-production.png`）。PC では**神の立ち絵の上に黒い四角が重なる**（`out/pc-before-120.png`）
  - `.cast-flash { mix-blend-mode: screen }` を足すと、黒地が消えて光だけが舞台に乗る（`out/blend-blend-on-container.png`・`out/hotfix-pc-proto-200.png`）
  - いつから：`battle.css:174-184` のコメントのとおり、第二次完成フェーズ P0-1 で `absolute`→`fixed` に変えた時点から【推測：それ以前の z-index の有無は履歴を遡っていない。仕様上、fixed は必ず独立した重なりになる】
- ⇒ 決定225 が「中央の固定 PNG」と書いた閃光は、実際には**毎手 0〜280ms、神（PC）／舞台（SP）を黒い板で隠している**。カードを神へ飛ばしても、このままでは黒い板の中へ消える

### R3. 閃光とカードが commit で途中から消える
- cast-flash は `pendingCardDef` がある間だけ描かれる（`BattleScreen.tsx:444`）。pop は 0.4〜0.5s なのに 280ms で unmount＝**56〜70% の地点で切れる**（実測：閃光消失＝カード削除＝ロック解除が同時刻）
- 同時に手札が詰め直される（残りのカードが一瞬で横へ跳ぶ）。本 Pilot の範囲外（§8・次候補）

### R4. SP の手札は「外へ出られない」器
- SP の `.hand` は `overflow-y: hidden`（横スクロールのため）。手札の中の要素を 26px より上へ動かすと切れる。**戦場へ飛ばすには、手札の外の層（`position: fixed`）に別の要素を置くしかない**。`position: fixed` は祖先に transform が無ければ `overflow` に切られない（実測で確認）

### R5（小）：`card-play` に reduced-motion の打ち消しが無い
- reduced-motion でも scale 1.08→0.6・上 40px が動く（`battle.css` の reduced ブロックに `card-view-playing` の規則が無い）

---

## 3. COMMERCIAL GAP（推測は【推測】）

| # | Gap | 根拠 |
|---|---|---|
| C1 | **カードが手札を出ない** | 本作は手札の位置で消える（R1）。商用のカードバトラーは、出したカードが手札を離れて「効果が起きる場所」へ動くのが通例：Slay the Spire はカードが手札から中央へ動いてから捨て札へ飛ぶ、Hearthstone は手札から盤面／中央へ、Marvel Snap は手札からロケーションへ【推測：公開プレイ映像の一般的観察。フレーム単位の計測はしていない】 |
| C2 | **原因（カード）と結果（神の突き・着弾）が別の場所** | カードは手札、閃光は画面中央、突きは神、着弾は敵。視線が 3 か所に割れる。商用作は「カードの絵 → 行為者／対象」を 1 本の線でつなぐ【推測】 |
| C3 | **毎手、黒い板が出る** | R2 の欠陥。「光が出る」つもりの演出が「黒い札が一瞬かぶさる」に見える。これは好みではなく描画の欠陥（仕様上の合成範囲の誤り） |
| C4 | 良くできている部分（触らない） | タップ 0ms の音（決定233）、神の構え 220ms→突き→着弾の 3 拍（決定162／232）、⚡の金（決定224）、神の一撃（1,600ms）。**足りないのは「カード自身が届く」1 拍だけ** |

「カードを大きく中央に見せれば豪華」は答えではない：SP（390px）でカードを中央に拡大して止めると、舞台が隠れ、読ませるための保持時間（≥300ms）が要る＝入力ロックを延ばすか着弾と重なる（§4 案 C）。

---

## 4. 候補比較（3 案＋参考）

| 案 | 内容 | 良い点 | 却下理由／判定 |
|---|---|---|---|
| **A. 神へ捧げる（Card Travel v1）** | 同じカードの複製を手札の外へ出し、240ms で**神の立ち絵へ**飛ばして吸い込ませる。全カード共通の行き先＝神 | ①手札→神→（既存の突き）→敵が 1 本の線になる ②commit 前に終わる＝入力ロック 0・着弾時刻 0 変更 ③画面の絵をそのまま使う＝asset 0 ④行き先が 1 つ＝カード種類の分岐が要らない（不変ルール 3 に抵触しない）⑤「七柱の神にカードを捧げると、神が動く」は本作の IP に合う | **採用** |
| B. 対象へ撃つ（敵ダメージは敵へ、防御・回復は神へ） | カードを弾のように対象へ飛ばす | 「当たる」が直接見える | ①攻撃の担い手が 2 つになる（カードと神の突きが同時に敵へ向かう）②敵へ届くのに 370ms（着弾）まで要る＝commit（280）を越えて神の突き・数字と重なる ③SP では手札（下）→敵（左上）の経路が託宣バーと神を横切る ④妨害・共鳴・ドローの「行き先」を効果ごとに決める必要がある＝範囲が広い。**却下** |
| C. 中央で見せてから飛ばす（Hearthstone 風） | カードを中央で ×1.4 に拡大して 300ms 保持 → 飛ばす | カードの絵を見せられる（Lane 3 の Art Window と相性） | ①読ませる保持で 280ms を越える＝入力ロック延長か着弾との重なり ②SP では拡大カード（100→140px 幅）が舞台の中心を隠す ③毎手（16.5 回／戦）見せると疲れる【推測】。**却下（READY の見せ場に限った別案として保留）** |
| 参考 D. A＋中央閃光を神の位置へ移す | 閃光の中心を神へ | 1 点に集まる | 閃光の中心は既に神から 81px（PC）／89px（SP）＝得が小さい。決定224 の金の輪（`.cast-flash-payoff::after` 200px）の位置も動く＝決定224 の再 QA が要る。**本 Pilot 外（A の QA 後に必要なら）** |

---

## 5. ONE RECOMMENDED NARROW PILOT — Card Travel v1「神へ捧げる」

### 5-0. 前提：H0 Hotfix（別 Decision・先に出す）
- 内容：`battle.css` の `.cast-flash` 規則（`:185-192`）に **`mix-blend-mode: screen;` を 1 行追加**。他は変えない
- 理由：R2 の欠陥（黒い四角）は Pilot と無関係に Production で毎手起きている。Pilot に混ぜると Human QA の差が「黒が消えた」のか「カードが飛んだ」のか分けられない（Lane 3 §10 の A' と同じ判断）
- 副作用：リング（`::before`）・アイコン・決定224 の金の輪（`::after`）も screen 合成になり、明るい背景（月）の上ではやや淡くなる。**決定224 の金の輪が見えることを H0 の Gate で確認**する
- Human QA（1 問）：「カードを出した瞬間、光の後ろに黒い四角が見えましたか？」— Before は YES、After が NO なら PASS
- 分類：バグ修正（CLAUDE.md §6-2）。決定番号は PM が採番

### 5-1. Pilot の時刻表（After・タップ＝0ms）

| 時刻 | ゴースト（新規） | 既存（不変） |
|---|---|---|
| 0 | 手札の元カードと同じ位置・同じ見た目で出現。元カードは不可視 | タップ SE（決定233）・入力ロック開始・cast-flash 開始・神の構え開始 |
| 0〜60 | **持ち上げ**：上へ 16px・×1.10（ease-out）＝「掴んだ」 | — |
| 60〜204 | **飛翔**：弧（最大 40px 上へ膨らむ）を描いて神へ加速（ease-in）。×1.10→0.42、神の側へ最大 10° 傾く | 閃光のピーク（〜250ms）＝ゴーストは閃光の下（z 7 < 8）を通り、光に包まれる |
| 204〜240 | **吸い込み**：神の胸元（立ち絵の上から 45%）で ×0.42→0.22・opacity 1→0。**240ms で DOM から削除** | 220ms 神の構え完了 |
| 280 | （存在しない） | commit → 神の突き → 着弾 370（重い 430）→ ⚡ → … すべて不変 |

### 5-2. なぜこれが最小か
- 変更は**新規 3 ファイル＋`BattleScreen.tsx` 2 行**。`CardView.tsx`（Lane 3 After-1 が編集）・`battle.css`（全レーン共有）・`enemyVfxTiming.ts`／`combatTimeline.ts`（決定232）を触らない
- 描画は既存の DOM を `cloneNode` で複製するだけ＝**手札に出ている絵・READY の縁・Lane 3 の Art Window レイアウトがそのまま飛ぶ**（別に描き直さない＝見た目の食い違いが起きない）
- アニメーションは WAAPI（`Element.animate`）で transform／opacity のみ。前例：`useCombatPresentation.ts:131` の画面揺れ（`arena.animate`）

---

## 6. FINAL SPEC（実装者がそのまま着手できる粒度）

前提：ベースは **Production `2389d21`**（hud-rc と同じ）＋ H0。main の作業ツリー（`feat/d224-premium-payoff-pilot`）は Production より古く、同じファイルに未 commit 差分があるので使わない。

### 6-1. 新規 `src/components/battle/cardTravel.ts`（純粋関数と定数・DOM に触れない）
```ts
/** 出したカードが神へ届くまで。commit（CARD_PLAY_REVEAL_MS 280）の 40ms 前に必ず終わる */
export const CARD_TRAVEL_MS = 240
export const CARD_TRAVEL_LIFT_PX = 16
export const CARD_TRAVEL_LIFT_SCALE = 1.1
export const CARD_TRAVEL_ARC_MAX_PX = 40
export const CARD_TRAVEL_MID_SCALE = 0.42
export const CARD_TRAVEL_END_SCALE = 0.22
export const CARD_TRAVEL_TILT_DEG = 10
/** 終点：神の立ち絵の中心 x・上から 45%（胸元） */
export const CARD_TRAVEL_TARGET_Y = 0.45

export type TravelRect = { left: number; top: number; width: number; height: number }

/**
 * 元カードの見た目上の矩形 from（getBoundingClientRect）と、未変形の幅 baseWidth（offsetWidth）、
 * 神の立ち絵の矩形 to から、WAAPI の keyframes を作る。transform と opacity だけを使う
 */
export function planCardTravel(from: TravelRect, baseWidth: number, to: TravelRect): Keyframe[]
```
- 計算：`s0 = from.width / baseWidth`（hover・READY の scale を引き継いで最初のフレームで跳ねない）。`dx = (to.left + to.width/2) − (from.left + from.width/2)`、`dy = (to.top + to.height*0.45) − (from.top + from.height/2)`、`side = dx < 0 ? −1 : 1`、`arc = min(CARD_TRAVEL_ARC_MAX_PX, hypot(dx,dy) × 0.1)`
- keyframes（offset／easing は各区間の始点に置く）：
  - `0`：`translate(0,0) scale(s0) rotate(0)`・opacity 1・easing `cubic-bezier(0.2,0.8,0.3,1)`
  - `0.25`（60ms）：`translate(0,−16px) scale(1.1)`・opacity 1・easing `cubic-bezier(0.55,0,0.85,0.35)`
  - `0.55`（132ms）：`translate(dx×0.45, dy×0.55 − arc) scale(0.78) rotate(side×6deg)`・opacity 1
  - `0.85`（204ms）：`translate(dx, dy) scale(0.42) rotate(side×10deg)`・opacity 1・easing `linear`
  - `1`（240ms）：`translate(dx, dy) scale(0.22) rotate(side×10deg)`・opacity 0
- `rules.ts` に置かない理由：ゲーム数値ではなく演出の時刻・距離（決定162／224／232 の `HIT_STOP_MS` 等と同じ扱い）

### 6-2. 新規 `src/components/battle/useCardTravel.ts`（DOM 側。`import './cardTravel.css'`）
```ts
export function useCardTravel(pendingCardUid: string | null): void
```
- `useLayoutEffect(…, [pendingCardUid])`（描画前に差し替える＝元カードの `card-play` が 1 フレームも見えない）
  1. `!pendingCardUid || prefersReducedMotion()` → 何もしない
  2. `src = document.querySelector<HTMLElement>('.hand .card-view-playing')`、`god = document.querySelector<HTMLElement>('.player-avatar')`。どちらか無ければ何もしない（**フォールバック＝現行の `card-play` がそのまま動く**）
  3. `from = src.getBoundingClientRect()`、`base = src.offsetWidth`、`to = god.getBoundingClientRect()`（読み取りはタップ 1 回につき 1 度だけ。フレームごとの読み取りなし）
  4. `ghost = src.cloneNode(true) as HTMLElement`：`card-view-playing` を外す／`.card-view-ignite` を削除／`aria-hidden="true"`・`inert`・`tabindex="-1"`／`card-travel-ghost` を付ける／`style.left/top = 中心 − base 寸法の半分`、`style.width/height = offsetWidth/offsetHeight`
  5. `document.body.appendChild(ghost)`、`src.dataset.travel = '1'`（React が管理しない属性＝再描画で消えない。元カードは commit で DOM ごと消える）
  6. `anim = ghost.animate(planCardTravel(from, base, to), { duration: CARD_TRAVEL_MS, fill: 'forwards' })`、`anim.onfinish = () => ghost.remove()`
  7. cleanup：`anim.cancel(); ghost.remove()`（連打・画面遷移・StrictMode の二重実行でも残らない）
- ゴーストは同時に最大 1 枚（`pendingCardUid` は 1 つ。240ms で消え、次に押せるのは 280ms 以降）

### 6-3. 新規 `src/components/battle/cardTravel.css`
```css
/* Card Travel v1（表示専用）：ゴーストが飛んでいる間、手札の元カードは見せない */
.card-view.card-view-playing[data-travel] {
  animation: none;
  opacity: 0;
}
.card-travel-ghost {
  position: fixed;
  margin: 0;
  z-index: 7; /* cast-flash（8）の下＝閃光の光に包まれて届く。報酬（9）より下 */
  pointer-events: none;
  transform-origin: 50% 50%;
  translate: none; /* READY の持ち上げ（独立プロパティ）は s0／中心合わせで引き継ぎ済み。二重に掛けない */
  scale: none;
  transition: none;
  will-change: transform, opacity;
}
.card-travel-ghost .card-view-shine {
  display: none;
}
/* reduced-motion：ゴーストは出さない（useCardTravel が判定）。元カードはその場で 120ms フェードのみ（R5 も同時に解消） */
@keyframes card-play-reduced {
  from { opacity: 1; }
  to { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .card-view.card-view-playing {
    animation: card-play-reduced 0.12s linear forwards;
  }
}
```
- 詳細度：`.card-view.card-view-playing[data-travel]`（0,3,0）・`.card-view.card-view-playing`（0,2,0）は、`battle.css` の `.card-view-playing`（0,1,0）より高い＝**読み込み順に依存しない**
- ゴーストのカード寸法：PC・SP のカード寸法規則は `body.battle-viewport .card-view` 等の全体規則で、手札に限定されるのは `:first-child`／`:last-child` の margin だけ（`battle.css:5489-5495`）。Lane 3 の `artWindow.css` も `.card-view.card-view-artwin…` で手札に限定しない（`scripts/lane3-card-premium/patches/after1-art-window.patch` 確認）＝**body 直下のゴーストでも同じ見た目**。念のため width／height は inline で固定
- ゴーストを `.hand` の中に入れない理由：`:last-child` が変わって最後のカードの `margin-right: auto` が外れ、手札が横にずれるため

### 6-4. `src/components/battle/BattleScreen.tsx`（2 行）
- `import { useCardTravel } from './useCardTravel'`
- `useCardTravel(pendingCardUid)` を、`if (!state) return null`（`:288`）より**前**の hooks 群に 1 行（hooks の順序規則）
- それ以外（cast-flash・windUp・`isPlayerTurn`・`CardView` への props）は変更しない

### 6-5. テスト（新規 `cardTravel.test.ts`）
1. `CARD_TRAVEL_MS + 40 <= CARD_PLAY_REVEAL_MS`（`src/hooks/useGameEngine.ts` から import）＝commit 前に必ず終わる
2. keyframes のプロパティが `transform`・`opacity`（＋`offset`・`easing`）だけ
3. offset が 0→1 で単調増加、最後の opacity が 0、最後の translate が (dx, dy)
4. `dx < 0` で傾きが負、`dx > 0` で正（PC は神が右・SP は神が中央右のため両方を固定）
5. 弧の高さ ≤ 40px（長距離でも暴れない）、`s0` が from.width／baseWidth
- 既存テストへの影響：なし（`combatTimeline`・`visualHp`・`decisionFeedback` は commit 基準の相対時刻で、本 Pilot は commit 以降を変えない）

### 6-6. SP／PC・reduced-motion
| | PC 1508×660 | SP 390×844（横スクロール手札） | reduced-motion |
|---|---|---|---|
| 経路 | 手札（中央下）→ 右上の神へ 408px | 手札（下）→ 中央右の神へ 310px。`position: fixed` なので手札の `overflow-y: hidden` に切られない（試作で確認：`out/sp-proto-120.png`） | ゴーストなし。元カードが 120ms の opacity だけで消える |
| 横スクロール中のカード | — | `getBoundingClientRect` はスクロール後の見た目の位置＝そのまま正しい始点 | — |
| 閃光 | H0 後：神の周りに光（`out/hotfix-pc-proto-200.png`） | H0 後：舞台の中央に光（`out/hotfix-sp-proto-120.png`） | 変更なし（cast-flash の reduced は既存方針のまま） |

### 6-7. 入力ロック増 0 の根拠
- 入力を止める条件は `isPlayerTurn`（`BattleScreen.tsx:296-302`：`pendingCardUid`・`cutinActive`・`enemyCutinActive`）だけ。Pilot はこの式・`CARD_PLAY_REVEAL_MS`（280）・`playCard` の順序（`useGameEngine.ts:392-404`）を変えない
- ゴーストは新しい state を持たず、`pointer-events: none`＋`inert`、240ms（< 280ms）で消える＝commit の時点で画面に存在しない
- 計測で確認する（§7 N1）：タップ→「ラウンドを終える」が押せるまでの時間が Before と同じ

### 6-8. 既存決定・他レーンとの整合／ファイル競合回避
| 対象 | 整合 |
|---|---|
| 決定224（READY・⚡PAYOFF） | ゴーストは `cloneNode` なので **READY の縁（`.card-view-ready-frame`）ごと飛ぶ**＝「金のカードが神へ届く」。点火の帯（`.card-view-ignite`）は複製から外す（飛びながら再点火しない）。cast-flash の金の輪（`.cast-flash-payoff::after`）・⚡ 34px 金・stop 50 は不変 |
| 決定226（勝利の演出） | ゴーストは commit の 40ms 前に消える＝撃破→崩壊→「撃破」→勝利の舞台の時刻表に触れない |
| 決定229（SP 舞台） | 行き先は `.player-avatar`（`.player-stage` 内）の矩形。敵の反転・着弾レイヤー・`--atk-x` は不変 |
| 決定232（重さの階層） | 着弾 370／430・hit stop・重い突きは commit 基準で不変。ゴースト到着（204〜240）→ 神の構え完了（220）→ 突き（280）＝**溜めの前にカードが神へ入る**順になる |
| 決定233（タップ音） | 音（0ms）と持ち上げ開始（0〜60ms）が揃う。SE の変更なし |
| 決定234（ドック） | 手札はドック内のまま。ゴーストは body 直下の fixed でドックの外を飛ぶ。ボタンの配置・disabled 制御は不変 |
| 決定235（HUD 名札） | 経路は手札→神（PC は託宣の行を横切る。SP は託宣の行と神の下半分）。名札（上部）は横切らない |
| 神の一撃（共鳴 7/7） | カットインは commit 後（`BattleScreen.tsx:141-170` の `cutinActive`）。ゴーストは既に無い＝重ならない |
| 多段ヒット | ゴーストはカード 1 枚につき 1 回。ヒット回数・間隔（`CARD_HIT_GAP_MS`）は不変 |
| ダメージ以外（防御・回復・ドロー・共鳴・妨害） | 行き先は全カード神（効果の種類で分岐しない＝不変ルール 3 と無関係）。神の構えは従来どおり敵ダメージのカードだけ |
| **Lane 3 After-1（Art Window）** | `CardView.tsx` を触らないので**ファイル競合 0**。複製なので、After-1／After-2（新原画）が入ればゴーストも自動でその見た目になる。artWindow.css は手札に限定しない選択子（確認済み） |
| ファイル競合 | 新規 3＋`BattleScreen.tsx` 2 行のみ。H0 は `battle.css` 1 行（`.cast-flash` 規則の中）。他レーン（lane3）の対象 `CardView.tsx`・`cardBonusText.ts`・`artWindow.*` とは重ならない |
| 不変ルール | `src/core` 変更 0・`Math.random` なし・カード名分岐なし・数値／Intent／AP／7 ラウンド／seed／score／save／gameVersion 不変 |

### 6-9. 性能（モバイル）
- アニメーションするのはゴースト 1 枚（PC 116×164・SP 100×158）の transform／opacity だけ＝合成スレッドで動く。試作でも animate されたプロパティは `transform`・`opacity` のみ（`out/probe.json` の `perf.animatedProps`）
- レイアウトの読み取りはタップ 1 回につき `getBoundingClientRect`×2＋`offsetWidth/Height`（React の commit 直後＝強制レイアウト 1 回）。フレームごとの JS・読み取り・書き込みはなし
- 画像は手札に既に読み込み済みの同じ URL（複製の `<img>` はキャッシュから即時に描かれる）
- headless 参考値：SP の試作 300ms の rAF 最大間隔 32ms（GPU なしの headless。実機値ではない）【要実機確認】

---

## 7. ACCEPTANCE CRITERIA

### 数値（全部 PASS で Human QA へ）
| # | 項目 | 基準 |
|---|---|---|
| N1 | 入力ロック | タップ→「ラウンドを終える」が押せるまで：After − Before の中央値（各 5 回）が **+5ms 以内**。`CARD_PLAY_REVEAL_MS === 280` |
| N2 | ゴーストの寿命 | タップ +260ms で `.card-travel-ghost` が 0 個。10 枚連続で出しても同時に 2 個以上にならない |
| N3 | 終点 | ゴーストの最後の中心が神の立ち絵の（中心 x・上から 45%）から **±12px 以内**（PC 1508／SP 390／SP 360） |
| N4 | 手札で切れない | SP で 120ms 時点のゴースト上端が手札の上端より上（`overflow-y: hidden` に切られていない） |
| N5 | 描画負荷 | ゴーストの animate プロパティ ⊆ {transform, opacity}。Performance trace で 20〜240ms にゴースト起因の Layout 0 |
| N6 | 着弾の時刻 | 通常 370／重い 430／⚡ 本体＋150／神の一撃 1,600（commit 基準）が Before と同値（Lane 2 `hitprobe.mjs`） |
| N7 | reduced-motion | ゴースト 0 個。元カードは opacity のみ 120ms（translate／scale の変化 0） |
| N8 | READY（豪快な一撃） | ゴーストに `.card-view-ready-frame` があり、cast-flash の金の輪・⚡ 34px 金が Before と同じ。After-1 が入っていればゴーストも Art Window の見た目 |
| N9 | 回帰 | 決定224／226／229／232／234／235 の既存 gate が SAME。console error 0 |
| N10 | H0 | 閃光の矩形の角（本来は背景が透ける場所）が舞台の画素になる（黒 0）。金の輪が月の上でも視認できる |

### Human QA（同じ seed で Before＝Production＋H0／After＝＋Pilot。PC と SP 各 1 戦。大耀 × 蒼海の龍神・`d223-pilot-01`。説明はしない）
- **Q1**：カードを出したとき、カードが手札から飛んで神のところへ届いたように見えましたか？（はい／いいえ）
- **Q2**：カードを続けて出したとき、前より待たされる・もたつくと感じましたか？（はい／いいえ）
- **Q3**：カードが神に届いてから敵に当たるまでが、ひと続きの動きに見えましたか？（はい／いいえ）
- 合格：Q1 はい・Q2 いいえ・Q3 はい。どれか外れたら自動で追加調整せず停止（事前の調整案：Q2 が「はい」なら 240→200ms、Q1 が「いいえ」なら終端 scale 0.22→0.3 で「届いた」を大きく見せる）

---

## 8. Risks・触れないもの

### Risks
| # | リスク | 対策 |
|---|---|---|
| K1 | 複製と元カードの見た目のズレ（hover・READY の translate／scale） | 中心合わせ＋`s0`＋ゴーストの `translate/scale: none`。N3 と目視で確認 |
| K2 | H0 で閃光全体（リング・アイコン・金の輪）が淡くなる | H0 の Gate（N10）で決定224 の金の輪の視認を確認。淡すぎる場合は金の輪だけ `mix-blend-mode: normal` を戻す（`::after` は親の合成に含まれるため、要検証）【推測】 |
| K3 | iOS Safari の `inert`（15.5+）・WAAPI（13.4+） | `inert` が無くても `pointer-events: none`＋`aria-hidden` で機能は同じ。WAAPI が無い環境は `animate` の有無で判定し、無ければ何もしない（現行の `card-play` にフォールバック） |
| K4 | 240ms の飛翔中の画面回転・リサイズ | 240ms で消えるので実害なし（終点がずれるだけ） |
| K5 | 「全部神へ」が防御・共鳴カードで不自然に見える【推測】 | Q1／Q3 で確認。必要なら次の Pilot で効果の種類（データ）ごとの行き先を検討（案 B の一部） |
| K6 | commit 時の手札の詰め直し（残りのカードが一瞬で跳ぶ）は残る | 本 Pilot 外。次候補「Hand Close FLIP」（§9） |
| K7 | headless 計測の限界 | 実機（SP）での滑らかさ・発熱は Human QA で確認。rAF 値は参考値 |

### 触れないもの
`src/core`・`CARD_PLAY_REVEAL_MS`・`playCard` の順序・`isPlayerTurn`・`planBatch`／着弾時刻／hit stop・SE（決定233 含む）・神の構え／突き（決定232）・cast-flash の位置・大きさ・時間（H0 の合成方法以外）・決定224 の READY／金の輪／⚡・決定226 の勝利・決定229 の舞台・決定234 のドック・決定235 の名札・`CardView.tsx`・`battle.css`（Pilot 分）・`docs/DECISIONS.md`・他 worktree（`SevenGodsGame-lane3` とその QA サーバー）

---

## 9. NEXT NOW
**H0 Hotfix（`.cast-flash { mix-blend-mode: screen; }`・CSS 1 行）を Production `2389d21` から新しい worktree で実装し、Before／After の撮影（`scripts/card-play-travel-audit/blendcheck.mjs` を流用）と N10・決定224 の金の輪の視認を確認 → Human QA 1 問 → 別 Decision として出す。** その上に §6 の Card Travel v1（新規 3 ファイル＋`BattleScreen.tsx` 2 行）を実装し、§7 の数値判定 → Human QA 3 問。
- 次候補（本 Pilot 外）：Hand Close FLIP（commit 時の手札の詰め直しを 120ms で滑らせる）／案 C を READY カードの見せ場だけに限定した「Showcase」（Lane 3 After-2 の後）

---

## 10. H0 Hotfix 実装・Fast Gate（決定237）

- 日付：2026-09-27／実施：AI（CLAUDE.md §6-2「バグ修正」として自律実施。commit・push・merge・deploy は行っていない）
- worktree：`C:/Users/kimi1/SevenGodsGame-d237`・branch `feat/d237-cast-flash-blend`（`master` = Production `2389d21` から作成・**未 commit**）
- 差分：`src/components/battle/battle.css` **+20 / −0**（末尾に追記ブロック 1 つ。既存規則は 1 行も変えていない）＋ 新規 `src/components/battle/castFlashBlend.test.ts`（57 行・CSS 契約テスト 3 件）。`src/core`／`public`／`package*.json` の差分 **0**
- 証跡：`scripts/card-play-travel-audit/h0gate.mjs`（Gate スクリプト）・`out/h0gate.json`・`out/h0-{sp,pc}-{before,after}-*.png`

### 10-1. 根本原因の再確認（§2 R2）
`.cast-flash-art`（黒地 PNG）の `mix-blend-mode: screen` は「自分の後ろにある画素」と合成するが、親 `.cast-flash` が `position: fixed`（＋`z-index: 8`）で**独立した合成グループ**になるため、後ろにあるのはグループ内の透明な背景だけ。透明に対する screen は元の色そのもの（`Cr = Cs`）なので、黒地が黒のまま出ていた。実測（本 Gate・タップ +120ms・`⚔ 一撃`）：Before は閃光の矩形（439×439）内で **舞台より暗くなった画素が SP 49.4%／PC 34.9%**、ほぼ黒（輝度 <10）が **SP 30.7%／PC 28.2%**（舞台自体のほぼ黒は 0.1%／2.6%）。PC では大耀の名札・立ち絵の上に黒い板が乗る（`out/h0-pc-before-120.png`）。

### 10-2. 採用した修正と理由
```css
.cast-flash { mix-blend-mode: screen; }   /* battle.css 末尾・決定237 ブロック */
```
- **合成をグループの外側へ移す**：グループ全体（リング `::before`・アイコン・art・決定224 の金の輪 `::after`）が舞台の画素と screen 合成される。screen は輝度を下げないので、黒地は舞台に溶けて光だけが残る
- `isolation: isolate` は**不要**：fixed で既に独立グループであり、足しても挙動は変わらず宣言が増えるだけ。逆に `isolation` で問題は直らない（問題は「グループが独立していること」そのものではなく「合成の境界が art の 1 段内側にある」こと）
- 子（`.cast-flash-art`）の `mix-blend-mode: screen` はそのまま残す：グループ内では透明に対する screen＝恒等なので害はなく、既存規則を触らない方が差分と回帰リスクが小さい
- アイコン（`.cast-flash-icon`）を screen から外す方法は CSS に無い（親の blend は子を含めてグループ単位で適用される）。暗い舞台では見た目がほぼ同じであること、明るい月の上でも読めることを 10-4 の数値と目視で確認した
- 位置・大きさ・時間（`cast-flash-pop*` 0.35〜0.5s・`CARD_PLAY_REVEAL_MS` 280）・`z-index: 8`・reduced-motion の既存規則は不変（CSS 契約テストで固定）

### 10-3. 自動 Gate
| 項目 | 結果 |
|---|---|
| 対象テスト（`castFlashBlend`・`combatTimeline`・`readyMaterial`・`victoryReveal`・`battleViewportLayout`・`godStrikeStage`・`visualHp`） | **PASS 72/72**（初回は `visualHp` の engine 動的 import 1 件が別レーンの browser gate と重なり timeout → 単独で再実行 **13/13 PASS**。`pressFeel` テストは存在しない） |
| `npx vitest run --dir src`（全件） | **97 files / 1,207 tests PASS**（28.6s・timeout なし。`balanceSim`／`replay` の再実行は不要だった） |
| `npx tsc -b --noEmit` | exit 0 |
| `npx oxlint src` | exit 0 |
| `npx vite build`（clean） | 成功（164 modules・1.09s） |

### 10-4. Isolation・bundle delta
| 項目 | Before（hud-rc `2389d21`） | After（d237） |
|---|---|---|
| JS `index-*.js` md5 | `022a0de5b9f374aecea1cd5a09a02bc0` | `022a0de5b9f374aecea1cd5a09a02bc0`（**同一**。ファイル名の hash だけ変わる） |
| CSS bytes | 164,658 | 164,692（**+34 B** ＝ minify 後の `.cast-flash{mix-blend-mode:screen}` 1 個・grep で 1 件） |
| `src/core`／`public`／`package*.json` | — | 差分 0 |

### 10-5. Browser Gate（Before :4312 = hud-rc dist／After :4311 = d237 dist・`?seed=d223-pilot-01`・大耀 × 蒼海の龍神・deviceScaleFactor 1）
方法：commit の 280ms タイマーだけ page script で保持し、閃光のアニメーションを **+120ms で一時停止**して撮影。同じ瞬間に `.cast-flash` だけ `visibility: hidden` にした画像を「舞台」の基準にし（神の構え・出したカードの動きを差分から除く）、閃光の矩形（`.cast-flash-art` の bounding box 439×439）内を画素で数えた。console error は全 4 走行で **0**。

**N10（通常のカード `⚔ 一撃`・+120ms）**
| 指標（閃光の矩形内） | SP 390 Before | SP 390 After | PC 1508 Before | PC 1508 After |
|---|---|---|---|---|
| 舞台より暗い画素（Δ<−12） | **49.4%** | **3.4%** | **34.9%** | **0.4%** |
| ほぼ黒（輝度 <10）／舞台自体 | 30.7%／0.1% | 0.4%／0.1% | 28.2%／2.6% | 3.0%／2.6% |
| 平均輝度（舞台＝65／58） | 42.7（暗くなる） | 79.3（明るくなる） | 44.9 | 71.6 |
| 舞台と同じ画素（|Δ|≤6） | 35.7% | 60.3% | 47.6% | 71.1% |
| アイコン矩形の点灯（Δ>40） | 19.8% | 52.1% | 31.9% | 55.4% |
| `.cast-flash` computed blend | normal | screen | normal | screen |

- After の「ほぼ黒」は舞台自体のほぼ黒と同率（SP 0.4% vs 0.1%・PC 3.0% vs 2.6%）＝**黒い板は消えた**。残る「暗い画素」3.4%／0.4% は矩形の縁のアンチエイリアスと art の回転境界（screen は輝度を下げないので、閃光そのものによる暗化ではない）
- 角（bbox 12〜20px 内側）：PC は Before／After とも舞台のまま（回転した art の bbox の角は art の外）。SP は bbox が画面外（x=−21）に出るため計測不能 → 矩形全体の指標で判定した
- 目視：SP は舞台の中央に光だけが乗り、龍神と大耀が透けて見える。PC は大耀の名札・立ち絵の上に光が乗る（`out/h0-{sp,pc}-after-120.png`）。アイコン（⚔ の矢印）は After でも中央で読める（点灯率は Before より高い）

**決定224（READY の `⚔ 豪快な一撃`・`cast-flash-payoff` 付与を確認）**
| 指標 | SP Before | SP After | PC Before | PC After |
|---|---|---|---|---|
| 金の輪：基準に無かった金画素（半径 30〜125px の環・+60ms／+120ms） | 432／302 | **658／663** | 405／294 | **810／548** |
| 基準にあった金が消えた画素（同環） | 671／703（黒い板に隠れる） | 179／199（明るい場所で白へ寄る） | 893／879 | 260／297 |
| 矩形内の暗い画素（+60／+120） | 45.3%／49.0% | 2.2%／1.2% | 31.9%／33.3% | 0.7%／0.6% |
| ⚡ `.floating-number-bonus` | `⚡-40` 34px `rgb(255,209,102)` | 同左 | 同左 | 同左 |

- 金の輪は After の方が多く見える（Before は黒い板の中に輪だけが浮いていた）。K2（screen で淡くなる）は「基準にあった金が消えた」179〜297px として数値に出ているが、これは月・衣装の金が白へ寄る分で、輪の視認を損なっていない（`out/h0-{sp,pc}-after-ready-060.png`）
- ⚡ 34px 金は Before／After 同値（決定224 不変）

### 10-6. Known Risks
| # | リスク | 評価 |
|---|---|---|
| R-a | 明るい背景（月・白い光）の上でアイコン・金の輪が淡くなる（K2） | 本 seed の PC（月の直下）で点灯率 55%・金画素 +810 を確認。他の神／舞台では未計測。淡すぎる場合の後退策は「金の輪だけ通常合成」だが、`::after` は親の blend に含まれるため CSS だけでは分離できず、要素分離（TSX）が必要【推測】 |
| R-b | `mix-blend-mode` 付きの fixed 要素は合成時に backdrop の読み戻しが要る（GPU 負荷） | 280ms × 1 要素。Chromium では blend を持つ層は独立 render surface になるだけで、Layout／Paint は増えない。本 Gate で console error 0・撮影中のフレーム落ちは観測していない（数値計測はしていない） |
| R-c | reduced-motion | 新規ブロックは media query の外・`mix-blend-mode` のみ。reduced で `cast-flash-payoff::after` を消す既存規則は後方の同一ファイル内にありそのまま有効（契約テストで固定） |
| R-d | 将来 `.cast-flash` の祖先に `isolation: isolate`／`opacity<1`／`transform` などを付けると、合成の境界がそこで止まり効果が縮む | `.battle-main` は overflow のみで独立グループを作らない（現状）。触る場合は本 §10 を参照 |

### 10-7. Human QA について（AI 推奨・CEO 判断）
- 本件は「黒い板が出る／出ない」という **画素で判定できる視覚欠陥の修正** で、Before→After の差は SP 49.4%→3.4%・PC 34.9%→0.4%（舞台より暗い画素）と大きく、目視のスクリーンショットでも一目で分かる。ゲームの手触り・時間・入力は変えていない（JS md5 同一・CSS +34B）
- **AI 推奨：Human QA は省略可**（数値 Gate と目視スクリーンショットを証跡とし、Production 反映後の通常プレイで「光の後ろに黒い四角が見えない」ことを CEO が確認する程度で足りる）。省略しない場合の 1 問は §5-0 のとおり：「カードを出した瞬間、光の後ろに黒い四角が見えましたか？」— Before YES／After NO で PASS
- 理由：判定基準が主観に依存しない／変更面が 1 宣言／他決定の Gate 値（⚡ 34px・金の輪・時刻表）が SAME。残る不確実性（R-a の他の神／舞台での淡さ）は Human QA 1 戦では拾えず、Card Travel v1 Pilot（§6）の Human QA 3 問と同じ seed で一緒に見る方が効率的

### 10-8. 次の手
決定237 として PM が採番・`docs/DECISIONS.md` へ AI 判断として記録 → RC worktree で Production 反映（Code Freeze・当日運用ルールは `docs/RELEASE_STATUS.md`）→ その上に §6 の Card Travel v1 Pilot。サーバー :4311／:4312 は停止済み。`SevenGodsGame-d237/dist` は built のまま残してある。

---

## 11. 決定237 Release Gate（2026-09-27）— **PASS／Blocker 0 → PRODUCTION RELEASE READY（CEO 承認待ち・Human QA 省略は CEO 判断）**
| 項目 | 結果 |
|---|---|
| commit | Fast Gate 済みの差分をそのまま local commit **`ed333e1`**（`feat/d237-cast-flash-blend`・`battle.css` +20／−0＝実質 `.cast-flash { mix-blend-mode: screen }` 1 宣言＋新規 `castFlashBlend.test.ts` 57 行。差分は `scripts/card-play-travel-audit/out/d237-h0.diff`） |
| RC | `release/d237-cast-flash-rc`＝**`ed333e1`**（新規 worktree `C:/Users/kimi1/SevenGodsGame-d237-rc`・`npm ci`）。親は master＝origin/master＝**`2389d21`**（現 Production）・commit 1 つ・worktree clean |
| Automated | full 97 files・**1,207 PASS**（タイムアウト 0）／tsc 0／lint 0／clean build PASS |
| Isolation | 変更は `battle.css`（末尾追記）＋契約テストのみ。`src/core`／`public`（assets 一致）／package 0。**JS は現 Production と md5 一致**（`022a0de5…`）。CSS 164,658→164,692B（**+34B**） |
| 効果（§10 の Fast Gate・+120ms 停止撮影） | 閃光矩形内の「舞台より暗い画素」**SP 49.4%→3.4%・PC 34.9%→0.4%**（舞台自体と同率＝黒い板の消失）。アイコン点灯率 SP 20→52%・PC 32→55%。決定224：`cast-flash-payoff` 付与・金の輪の金画素 SP 432→658・PC 405→810・⚡ 34px 金 同値。時刻・入力ロック・reduced-motion 不変。console error 0 |
| Human QA | **AI 推奨＝省略可**（画素で判定できる視覚欠陥・Before→After 差が大きい・時間／入力／JS 不変）。実施する場合は 1 問「光の後ろに黒い四角が見えましたか？」（Before はい／After いいえ）。Card Travel v1 Pilot の Human QA と同 seed で一緒に見る方が効率的 |
| 順序 | 決定231→236 が先に承認された場合は、リリース後の master へ rebase（`battle.css` 末尾追記どうしのため衝突し得る→手動で解決・再 build・最小 Gate） |
| Rollback 先 | 現 Production **`6689788618`**（`2389d21`） |
| Blockers | **0** |

---

## 12. 決定237 Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-27 JST・CEO 承認・Human QA 省略は CEO 判断）
| 項目 | 値 |
|---|---|
| 順序 | CEO 指示「決定231 → 236 → 237」。決定236 の Smoke PASS 後に着手 |
| rebase | RC `ed333e1` を master `41adb32`（決定236）へ rebase → **`73ac787`**（衝突 0）。`battle.css` に決定231 の `.card-view > .card-view-cost` 規則と決定237 の `.cast-flash { mix-blend-mode: screen }` の両方が残っていることを grep で確認。最小 Gate：full 98 files・**1,212 PASS**／tsc 0／lint 0／build PASS／JS は決定236 の Production と md5 一致（`e27bdc75…`）／CSS +34B／assets 一致 |
| merge／push | `git fetch . release/d237-cast-flash-rc:master`（fast-forward）→ `git push origin master`（18:35 JST・`41adb32..73ac787`） |
| Vercel | deployment **`6690568688`**（`73ac787`・Production）success（2026-09-27T09:35:55Z） |
| 配信 bundle | `index-Ct-mStRS.js`／`index-pUuHSEGr.css`＝RC build と **md5 一致** |
| Rollback 先 | **`6690483429`**（`41adb32`・決定236） |
| Narrow Smoke（`h0gate.mjs`・Before＝決定236 build／After＝Production・SP 390／PC 1508・+120ms 停止撮影） | 閃光矩形内の「舞台より暗い画素」**SP 49.5%→3.4%・PC 34.9%→0%**、ほぼ黒 SP 30.7%→0.4%・PC 28.2%→2.5%、アイコン点灯率 SP 19%→55%・PC 32%→31〜72%。決定224：READY の `cast-flash-payoff` 付与・⚡ `34px rgb(255,209,102)` 同値・金の輪の新規金画素 SP 435→674・PC 405→810。console error 0 |

**Decision237 Cast Flash Blend Hotfix = PRODUCTION LIVE / CLOSED。** Production＝**`73ac787`**。次：Card Travel v1 Pilot を独立レーンで実装（Human QA 必須）。

---

## 13. Card Travel v1 Pilot 実装・Fast Gate（2026-09-27）— **数値 Gate PASS → HUMAN QA READY（未 commit・未リリース）**

- 実施：AI（CLAUDE.md §6-2 の範囲。commit・push・merge・deploy・firewall 変更は行っていない）
- worktree：`C:/Users/kimi1/SevenGodsGame-travel`・branch `feat/card-travel-v1`（`master`＝Production **`73ac787`**＝決定237 から作成・`npm ci` 済み・**未 commit**）
- 差分（`git status`）：新規 `src/components/battle/cardTravel.ts`（87 行・純粋関数と定数）／`useCardTravel.ts`（79 行・DOM 側）／`cardTravel.css`（49 行）／`cardTravel.test.ts`（182 行・15 件）＋ `BattleScreen.tsx` **+3／−0**（import 1 行・コメント 1 行・`useCardTravel(pendingCardUid)` 1 行。`if (!state) return null` より前の hooks 群）。`CardView.tsx`・`battle.css`・`combatTimeline.ts`・`enemyVfxTiming.ts`・`useGameEngine.ts`・sound・`artWindow.*`・`hudPlate.*`・`dockControls.*`・`src/core`・`public`・`package*.json` の差分 **0**
- 証跡：`scripts/card-play-travel-audit/travelgate.mjs`（Gate スクリプト）・`out/travelgate-{pc,pc-hold,sp,pc2,final}.json`・`out/travel-{pc,sp,sp360}-{before,after}-{000,060,120,200,238}.png`・`out/travel-pc-{before,after}-ready-*.png`
- After の build：`SevenGodsGame-travel/dist`（`index-DZDR6tHS.js`／`index-CypN0Oz5.css`・built のまま残置）。Before：`SevenGodsGame-d237-rc/dist`（Production と md5 一致・再 build なし）

### 13-1. 自動 Gate
| 項目 | 結果 |
|---|---|
| 新規 `cardTravel.test.ts`（時刻 240+40≤280／定数／keyframes が transform・opacity のみ／offset 単調／終点 (dx,dy)・opacity 0／傾きの符号／弧 ≤40px／s0／CSS 契約） | **15/15 PASS** |
| 対象テスト（`cardTravel`・`combatTimeline`・`readyMaterial`・`victoryReveal`・`battleViewportLayout`・`godStrikeStage`・`castFlashBlend`・`artWindow`） | **77/77 PASS** |
| `npx vitest run --dir src`（全件・browser 計測の後に単独実行） | **99 files / 1,226 tests PASS**（26.3s・timeout 0） |
| `npx tsc -b --noEmit`／`npx oxlint src`／`npx vite build`（clean） | exit 0／exit 0／成功（169 modules） |

### 13-2. Isolation・bundle delta（Before＝d237-rc dist）
| | Before | After | delta |
|---|---|---|---|
| JS `index-*.js` | 438,536 B（md5 `e27bdc75…`） | 440,522 B | **+1,986 B**（useCardTravel＋cardTravel） |
| CSS `index-*.css` | 165,615 B | 166,149 B | **+534 B**（cardTravel.css） |
| `public/` 由来の assets・index.html 以外 | md5 一致 | 同左 | 0（index.html は hash 名のみ） |

### 13-3. Browser Gate（headless Chromium・Before :4322＝Production build／After :4321＝travel build・`?seed=d223-pilot-01`・大耀 × 蒼海の龍神・deviceScaleFactor 1・計測後にサーバー停止済み）
方法：①**停止撮影**：commit（280ms）とゴースト削除タイマー（240ms）だけ page script で保持し、ゴースト（WAAPI）・閃光・神の構えを 0／60／120／200／238ms で止めて撮影・矩形を読む。②**実時間**：Before→After を直列に走らせ（CPU を取り合わない）、タップ→「ラウンドを終える」の `disabled` が外れた時刻を MutationObserver で採る（フレームに量子化されない）。ゴーストの出現／消滅も MutationObserver。着弾は `.enemy-reaction[data-impact-at]`・`--stop`、突きは `.player-avatar-wrap` の class と animation duration、⚡は `.floating-number-bonus` の size／color／delay。console error・pageerror を数える。headless は GPU なしで **フレーム間隔が 30〜90ms、時々 250〜2,400ms の停滞**が Before／After の双方で起きる（K7）。停滞した手（rAF 最大間隔 ≥250ms）は表に併記した。

| # | 項目 | 基準 | 結果 | 判定 |
|---|---|---|---|---|
| N1 | 入力ロック（タップ→押せるまで・MutationObserver・中央値） | After−Before ≤ +5ms | **PC 1508：Before 292 [285–300] → After 296 [286–363]（停滞 1 手 2,400 を除く 4 手の中央値 291）＝+4ms**／**SP 390：Before 291 [282–347] → After 305 [284–414]（停滞 2 手を除く 4 手 284・288・295・305＝中央値 291.5）＝+14（停滞込み）／+0.5（除く）**。別走行（rAF 基準）SP 390：314→317（+3）。`CARD_PLAY_REVEAL_MS === 280`・`isPlayerTurn` の式・`playCard` の順序は不変（構造上、増分 0） | **PASS**（headless の停滞分は Human QA Q2 で確認） |
| N2 | ゴーストの寿命 | +260ms で 0 個・同時 ≤1 | 出現：タップ +5〜11ms（初回コールドのみ 15〜25ms）。同時数 **最大 1**（全 47 手）。+260ms 時点の個数 **0**（最終走行の全 24 手）。DOM 削除：**PC 246〜257ms・SP360 245〜256ms**（停滞していない手）、停滞した手は 280〜2,396（同じ手の commit も同じだけ遅れる） | **PASS** |
| N3 | 終点（238ms のゴースト中心 vs 神の中心 x・上から 45%） | ±12px | **PC (0.0, −0.2)／SP 390 (0.0, 0.0)／SP 360 (0.0, +1.6)**。飛ぶ距離：PC 一撃 303px（後悔想い 376px）・SP 390 283px・SP 360 260px | **PASS** |
| N4 | 手札で切れない（SP・120ms） | ゴースト上端 < 手札上端 | **SP 390：578.8 < 650**（60ms 時点 652.1 で既に手札の上縁）／**SP 360：517.2 < 586**。`position: fixed`＝`overflow-y: hidden` の外（`out/travel-sp-after-120.png`） | **PASS** |
| N5 | 描画負荷 | animate プロパティ ⊆ {transform, opacity}・Layout 増分 0 | animate プロパティ **["opacity","transform"]**（duration 240・fill forwards・5 keyframes）。CDP `LayoutCount` 増分（タップ +20〜240ms の窓）：PC Before [1,1,1,1,1,1] / After [0,0,1,1,1,0]、SP Before [0,0,0,0,0,0] / After [5*,0,0,1,0,1]（*＝停滞した手で窓が commit を跨いだ）。読み取りはタップ 1 回に `getBoundingClientRect`×2＋`offsetWidth/Height` のみ | **PASS**（After ≤ Before） |
| N6 | 着弾の時刻（commit 基準） | Before と同値 | 同じ手順（同 seed・同カード列）で **通常 90（stop 30／40ms）・⚡付き 90+240（stop 50）・重い 150（stop 60・`god-strike-heavy` 520ms）・神の一撃 1,600（stop 90・`god-burst-strike` 600ms）** が Before／After で**完全一致**（`out/travelgate-pc.json`・16 手走行） | **PASS** |
| N7 | reduced-motion（SP 390） | ゴースト 0・元カードは opacity のみ 120ms | ゴースト **0 個**。元カードの animation **`card-play-reduced` 0.12s**、computed transform **`none`** のまま（Before は `card-play` 0.28s で scale 1.08・−14px まで動いていた＝§2 R5 も解消） | **PASS** |
| N8 | READY（豪快な一撃・PC） | ゴーストに READY の縁・金の輪・⚡34px 金が Before と同じ | ゴーストの class **`card-view card-view-exclusive card-view-has-art card-view-artwin card-view-ready card-travel-ghost`**、`.card-view-ready-frame` の opacity **1**、`.card-view-ignite` **0**（複製から除去）。cast-flash **`cast-flash-payoff`** 付与、⚡ **`⚡-40` 34px `rgb(255,209,102)` delay 240ms**、着弾 [90, 40ms]・[240, 50ms]＝Before と同値。Art Window（決定236）の見た目ごと飛ぶ（`out/travel-pc-after-ready-120.png`）。K1：0ms の複製と元カードの各部（name／body／cost／illustration／clip）の矩形差 **0.0px** | **PASS** |
| N9 | 回帰・console | 既存 gate SAME・error 0 | 全 1,226 テスト PASS。console error／pageerror **0**（全 18 走行）。決定231 の珠・234 のドック・235 の名札は DOM／CSS 不変（ゴーストは body 直下の fixed でドックの外） | **PASS** |
| N10 | H0（決定237） | `.cast-flash` が screen | 全フレームで computed `mix-blend-mode: screen`（Before＝After） | **PASS** |

目視（`out/travel-pc-after-{060,120,200}.png`・`travel-sp-after-*.png`）：60ms で手札から 16px 持ち上がり、120ms で弧を描いて舞台へ入り、200ms で神の胸元に小さく届く。閃光（z 8）の光の中を通り、神の構え（220ms）→ 突き（280ms〜）へつながる。

### 13-4. 仕様（§6）からの逸脱と理由
| # | 逸脱 | 理由 |
|---|---|---|
| D1 | `useCardTravel`：`animate()` の直後に **`anim.startTime = document.timeline.currentTime`** を設定し、**同じ長さ（240ms）の `setTimeout` でも削除**する（`onfinish` と早い方） | 仕様どおり `onfinish` だけだと、開始が次の描画機会（最大 1 フレーム）遅れ、`finish` イベントも終了後の次のフレームで届くため、headless（フレーム 30〜60ms）で DOM 削除が **284〜295ms** になり commit と同時になった。開始を「今のフレーム」に固定すると終了はタップ +240＋数 ms に確定し、タイマーは開始時刻より後にしか鳴らない（その時点で fill: forwards の最終フレーム＝opacity 0）ので見た目の欠けは起きない。修正後の DOM 削除 **245〜257ms**（N2） |
| D2 | CSS の選択子を **`body .card-view.card-travel-ghost`**（0,2,1）にした（仕様は `.card-travel-ghost`） | `.card-view.card-view-ready`（0,2,0）の `translate: 0 −3px; scale: 1.02` と `.card-view` の `transition` に、読み込み順に関係なく勝つため。`box-sizing: border-box`・`animation: none`・`cursor: default` も追加（複製は `<button>` のため） |
| D3 | 複製から `disabled` 属性を外す | `inert`＋`pointer-events: none` で入力は届かない。UA の disabled 描画差を消すため（`.card-view:disabled` は cursor のみだが念のため） |
| D4 | `cardTravel.ts` に `travelVector()` を追加公開 | keyframes と同じ式で端点を返し、テストと計測で使う（DOM に触れない） |
| D5 | `useCardTravel.ts` に `spawnCardTravel(doc)` を公開 | hook の中身を純粋な DOM 関数に分け、後日 jsdom が入ればそのまま単体テストできる |
| D6 | `BattleScreen.tsx` は +3 行（import・コメント・呼び出し） | 仕様の 2 行＋説明コメント 1 行 |

### 13-5. Known Risks
| # | リスク | 評価 |
|---|---|---|
| R1 | 実機の滑らかさ・発熱（K7） | headless は GPU なしのため参考値のみ（rAF 最大間隔 33〜90ms、停滞 250〜2,400ms が Before／After 双方で発生）。合成スレッドの transform／opacity 1 枚＝Production の閃光（PNG 320px・回転）より軽い想定。**iPhone 実機の Human QA で確認** |
| R2 | `Element.animate` の無い環境 | `typeof src.animate !== 'function'` で何もしない（現行の card-play にフォールバック）。iOS Safari 13.4+ は対応 |
| R3 | 「全部神へ」が防御・回復・共鳴カードで不自然に見える（K5） | 本 Gate の停止撮影も支援カード（後悔想い）で「神へ届く」絵になっている。判定は Human QA Q1／Q3 |
| R4 | commit 時の手札の詰め直しは残る（K6） | 本 Pilot 外（次候補 Hand Close FLIP） |
| R5 | 手札を横スクロール中のタップ（SP） | `getBoundingClientRect` はスクロール後の見た目の位置＝正しい始点（§6-6）。本 Gate では先頭カードのみ計測 |

### 13-6. Human QA 計画（必須・CEO が iPhone で実施）
- **Before**：`C:/Users/kimi1/SevenGodsGame-d237-rc/dist`（Production `73ac787` と同一）／**After**：`C:/Users/kimi1/SevenGodsGame-travel/dist`（本 Pilot）。LAN サーバー・firewall は親（PM）が用意する
- 対戦：大耀 × 蒼海の龍神・`?seed=d223-pilot-01`（本 Gate と同じ。⚔ 一撃 → ✨ 巫女の舞 → ⚔ 剛撃 → … → R4 で READY の ⚔ 豪快な一撃）。予備 seed：`d223-pilot-02`・`travel-qa-01`（ASCII のみ）
- 手順：Before → After の順で各 1 戦（4 ラウンド以上）。説明はしない。SP のみで可（PC は任意）
- 質問（はい／いいえ）：
  - **Q1** カードを出したとき、カードが手札から飛んで神のところへ届いたように見えましたか？
  - **Q2** カードを続けて出したとき、前より待たされる・もたつくと感じましたか？
  - **Q3** カードが神に届いてから敵に当たるまでが、ひと続きの動きに見えましたか？
- 合格：Q1 はい・Q2 いいえ・Q3 はい。外れたら自動で追加調整せず停止（事前の調整案：Q2「はい」→ 240→200ms、Q1「いいえ」→ 終端 scale 0.22→0.30）
- PASS 後：PM が決定番号を採番し `docs/DECISIONS.md` に AI 判断として記録 → RC worktree → Production（Code Freeze・当日運用ルールは `docs/RELEASE_STATUS.md`）

---

## 14. 決定239 — Human QA PASS と Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-27 JST・CEO 承認）
### 14-1. CEO Human QA（iPhone）— **PASS**
Q1 カードが手札から飛んで神に届いたように見える **はい**／Q2 続けて出したとき待たされる・もたつく **いいえ**／Q3 神に届いてから敵に当たるまでがひと続き **はい**。Card Travel v1「神へ捧げる」を **決定239** とする。

### 14-2. Release
| 項目 | 値 |
|---|---|
| commit／RC | Human QA 済みの差分を local commit `4a117dd`（`feat/card-travel-v1`・5 ファイル +400／−0）→ 決定238 のリリース後の master `06e8285` へ rebase → RC `release/d239-card-travel-rc`＝**`f8183eb`**（衝突 0・commit 1 つ。worktree `SevenGodsGame-d239-rc`） |
| Gate（rebase 後） | targeted 9 files・81 PASS／full 100 files・**1,230 PASS**（ブラウザ計測と非同時）／tsc 0／lint 0／build PASS。**JS は Human QA の After と md5 一致**（`0e165ec0…`）、CSS は決定238 の +65B 分だけ差（+534B は同一）。assets 一致 |
| merge／push | fast-forward `06e8285`→`f8183eb` → `git push origin master`（19:24 JST） |
| Vercel | deployment **`6691009755`**（`f8183eb`・Production）success（2026-09-27T10:24:42Z） |
| 配信 bundle | `index-gFRVx41T.js`／`index-BSf8CngN.css`＝RC build と **md5 一致** |
| Rollback 先 | **`6690969281`**（`06e8285`・決定238） |

### 14-3. Narrow Production Smoke（`travelgate.mjs`・Before＝決定238 build／After＝Production・PC 1508・SP 390＋reduced）
- 着弾：`react-l1 impactAt 90 stop 30ms`・突き 340ms が Before と同値（N6）。N3 終点誤差 (0.0, −0.6)px。READY（豪快な一撃）のゴーストは 0／60／120／200／238ms すべてで READY の縁付き（N8）。reduced：ゴースト 0・`card-play-reduced` 0.12s（N7）。console error 0（全 run）
- ゴーストの出現 SP +6〜18ms、消失 248〜269ms（停滞していない手）。SP の入力ロック中央値 Before 339 → After 330ms（増加なし）
- **計測上の注意**：Vercel 越しの headless では rAF の停滞（maxGap 最大 440ms）が Before／After とも出て、停滞した手はゴーストの消失・入力解除の採取値が伸びる（PC After の run は停滞が大きめ）。入力ロックの式（280ms）と `playCard` の順序は不変で、iPhone 実機の Human QA Q2「もたつかない」で確認済み → 欠陥ではなく計測のばらつきとして記録

**Decision239 Card Travel v1 = PRODUCTION LIVE / CLOSED。** Production＝**`f8183eb`**。
