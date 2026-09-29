# 決定223 補助資料 — 大耀『豪快な一撃』Premium Combat Language Narrow Pilot：実装前 Preflight

- 日付：2026-09-23
- 種別：**PREFLIGHT ONLY**（runtime／assets／balance／tests／画像生成／H3／commit／push／merge／deploy／Ranking／Neon／secrets：すべて 0。本書は docs-only・未 commit）
- 判断主体：AI チーム（CLAUDE.md §6-2）。**本書は決定223（Premium Combat Language Final Audit）の補助資料**であり、独立した決定番号を持たない。旧ファイル名 `DECISION224_PAYOFF_PILOT_PREFLIGHT.md` は CEO 指示（2026-09-23）で改名（決定224 は別途「External Game Visual Benchmark Audit」に使用するため）
- 前提：決定218 Human QA **PASS（4/4 YES・CEO 判定）**＝Setup→Payoff の gameplay hypothesis は成立済み。本 Pilot は mechanics を変えず、「解けた／決まった」の感覚だけを presentation layer で増幅する
- 対象：大耀『豪快な一撃』`card_taiyo_attack_01`（`src/core/data/cards/taiyo.ts:21-40`・`bonus.when: 'charged'`・本体 140＋自傷 20・共鳴 4 以上で +40）
- 参照：`docs/DECISION223_PREMIUM_COMBAT_LANGUAGE_FINAL_AUDIT.md` §5〜§12・§18（監査案）。**監査案の数値は本書で実コードに当てて再判定した**（そのまま採用しない）

---

## 1. 決定218 close-out 結果

| 項目 | 結果 |
|---|---|
| 判定 | **PASS**（Q1〜Q4 すべて YES・CEO 判定・4 問が揃ってから確定） |
| Preview | `:4184`＝HEAD `43c10a4` clean build。起動前に再ビルドし `index-X7cOlknS.js`／`index-vOvz1T_R.css` の同一ハッシュを確認。決定220／222 の実験コード混入 0 |
| 条件 | 大耀 × 蒼海の龍神 × ふつう × 推奨デッキ × 構えなし。順番のコツ・コンボの正解は未説明 |
| 記録 | `docs/DECISION218_SETUP_PAYOFF_EXPERIENCE_AUDIT.md` §10・`docs/DECISIONS.md` 2 行（決定223 採用・決定218 close-out） |
| 意味 | 現行 visual のままでプレイヤーが Setup→Payoff を自力で発見できる＝**本 Pilot は「見えるようにする」ためではなく「決まった感を強くする」ためのもの**。Before（baseline）はこの QA |

---

## 2. Pilot 対象の実コード位置（HEAD `43c10a4`）

| 段階 | 実装箇所 | 現状の値 |
|---|---|---|
| READY 判定 | `src/core/engine/cardBonus.ts:64-79` `previewBonusTrigger`（`charged`＝`state.resonance.value >= 4`） | engine と一致保証 |
| READY 表示 | `BattleScreen.tsx:539` `bonusReady={isPlayerTurn && previewBonusTrigger(state, def)}` → `CardView.tsx:87-91` `.card-view-bonus-ready` → `battle.css:2540-2544` | **文字色 #ffd166＋text-shadow のみ**。アニメ・枠・lift なし |
| isPlayerTurn の定義 | `BattleScreen.tsx:280-286` `phase==='playerTurn' && status==='playing' && !isEnemyTurn && !pendingCardUid && !cutinActive && !enemyCutinActive` | **cast 中（`pendingCardUid`・280ms）と敵ターン中は false** ← §3 の要点 |
| SETUP → state | `useGameEngine.CARD_PLAY_REVEAL_MS = 280`（タップ → commit）。共振（共鳴+2）の commit で `resonance.value` 更新 → 手札再描画 | — |
| PAYOFF 時刻 | `combatTimeline.ts` `planBatch`：`role: 'bonus'`＝`lastBodyAt + BONUS_GAP_MS`（90＋150＝**240ms**・commit 基準） | — |
| PAYOFF hit stop | `combatTimeline.ts` `hitStopFor`：`if (s.role === 'bonus') return 0` | **0ms** |
| PAYOFF 敵反応 | `planBatch` 末尾：`enemyReactions[1] = { tier: bonusStep.final ? 4 : 1, minor: !bonusStep.final }` → `EnemyPanel.tsx` `Reaction`（入れ子 2 層目）→ `battle.css:4437-4441` `.enemy-reaction.react-minor`（`--kb: 3px`・`juice-stop`・`hit-shake-l1` 0.26s・`juice-bonus-flash` 0.32s） | 弱（金 sepia flash はある） |
| PAYOFF 斬撃 | `EnemyPanel.tsx` `slash-fx slash-minor`（`battle.css:4461-4468`・金・scale 0.7） | あり |
| PAYOFF 数字 | `useFloatingNumbers.ts:100-109` `text: '⚡-40'`・`bonus: true`・`tier: 1`・`leftPercent: 66` → `battle.css:4479` `.floating-number-l1` 16px → `:4527` `.floating-number-bonus` **20px** 金 | 小 |
| PAYOFF 音 | `useBattleSound.ts:33-36` `sfx.damageEnemy(st.tier, st.atMs)`＝4 ダメージ → L1 → **`hit_l1` gain 0.45（最小）** | 本体（140→L2 `hit_l2` 0.6）より小さい |
| PAYOFF callout | `decisionFeedback.ts:243-254` 「⚡ 条件成立／共鳴4以上」`atMs: anchor`・`CALLOUT_MS` 700・同条件は 1R 1 回 | 既存・変更しない |
| 表示 HP | `visualHpStartMs = atMs + stopMs + HP_LAG_MS(90)` | stop 変更で 40ms 後ろへ（許容） |
| reduced-motion | `planBatch` `ctx.reduced` → 全 stop 0／`battle.css:4609-4640` 反応・突き停止・`:4614` `.react-minor` | 既存で担保 |
| 手札（SP） | `battle.css:5489-5500` `.hand` `overflow-x: auto`・4 枚可視 | 点火カードが画面外の可能性 |
| SE 基盤 | `sound.ts`（`SeName` union・`SE_NAMES`・`playBuffer`・`fallbackTone`）、`feelTier.ts` `SE_GAIN`、`scripts/gen-se.mjs`（`chime()` 等の決定論生成）、`BattleScreen.tsx:234` `preloadSe()` | 1 音追加は 4 箇所 |

---

## 3. READY の実装方法（Preflight 結果：**監査案を修正**）

**問題（実コードで発見）**：監査案「`.card-view-bonus-ready` の class 付与に CSS animation を載せて 1 回点火」は **成立しない**。`bonusReady` は `isPlayerTurn` でゲートされており、`isPlayerTurn` は **cast 中（280ms）・敵ターン中・カットイン中に false** になる。したがって class 付与型だと、
- どのカードを出しても 280ms 後に**手札の成立済みカード全部が再点火**する
- 毎ラウンド開始時（敵ターン明け）にも再点火する
- 神の一撃／敵必殺のカットイン明けにも再点火する

→ 「1 回だけ」が壊れ、ノイズ源になる（決定223 §5 原則 3 に違反）。

**採用する方法**：点火の起点を **engine 条件の false→true 遷移**（ゲート前の `previewBonusTrigger`）にし、JS の ref 比較で 1 回だけ発火する。

| 要素 | 仕様 |
|---|---|
| prop | `BattleScreen.tsx`：`bonusReady={isPlayerTurn && armed}` はそのまま。新たに `bonusArmed={armed}`（`armed = previewBonusTrigger(state, def)`・ゲートなし）を渡す |
| 遷移検出 | `CardView.tsx`：`const prevArmed = useRef(bonusArmed)`・`const [igniteKey, setIgniteKey] = useState(0)`。`useEffect` で `!prevArmed.current && bonusArmed` のとき `setIgniteKey(k => k + 1)`、毎回 `prevArmed.current = bonusArmed`。**mount 時は現在値で初期化＝引いた時点で既に成立しているカードは点火しない**（静的な rim だけ） |
| 点火 DOM | `igniteKey > 0` のとき `.card-view-clip` 内に `<span key={igniteKey} className="card-view-ignite" aria-hidden />` を 1 つ（key 変更で再 mount → animation 1 回） |
| 点火の見た目 | `@keyframes card-ready-ignite`：金の rim light が枠を一周（`conic-gradient` を `mask` で枠幅 2px に絞り `rotate` 0→360deg・opacity 0→1→0）＋ コスト珠の glint（`filter: brightness` 1→1.6→1・`.card-view-cost` に `animation`）。**duration 450ms・delay 150ms**（§6）。`transform`／`opacity`／`filter` のみ |
| 持続状態 | `.card-view-bonus-ready`（既存 class）に `transform: translateY(-2px)` と `box-shadow` 追加（静的な金 rim：`0 0 0 1px #ffd16699, 0 0 14px -2px #ffd16688`）。`.card-view` の既存 `transition: transform .15s` で滑らかに上がる。**hover 時は `translateY(-8px)` が上書き**（PC・既存どおり） |
| 音 | **無音**（Hearthstone の「出せる札」表示と同じ位置づけ。手札の情報であって出来事ではない） |
| 対象 | `CardDef.bonus` を持つ全 23 枚に自動適用（カード ID 分岐なし＝不変ルール 3）。QA の注視対象だけが『豪快な一撃』 |
| 二重点火の抑止 | 同じカードで `armed` が true→false→true（共鳴 4 未満に落ちてから再度 4 以上）になれば再点火する。これは正しい（状態が本当に変わった） |

---

## 4. PAYOFF の実装方法（Preflight 結果：**監査案を一部修正**）

**問題（実コードで発見）**：監査案「bonus 反応を tier 2（通常 shake）に格上げ」は **二重 shake** を作る。bonus 反応は `EnemyPanel.tsx` で本体反応の**入れ子**（`reactions[1]` が `reactions[0]` の子）であり、本体の `hit-shake` 0.4s（110〜510ms）と bonus の `hit-shake` 0.4s（280〜680ms）が重なると transform が合成され、敵立ち絵が 2 方向に暴れる。

**採用する方法**：shake は既存の minor のまま（`hit-shake-l1` 0.26s・`--kb: 3px`）にし、「強さ」は **hit stop・金リング・数字・音**の 4 つで作る。

| 要素 | 仕様 | 変更箇所 |
|---|---|---|
| hit stop | `hitStopFor`：`role === 'bonus'` → `BONUS_HIT_STOP_MS`（**40ms**・新定数）。`ctx.reduced` なら従来どおり 0 | `enemyVfxTiming.ts`・`combatTimeline.ts` |
| 敵反応 | `enemyReactions[1]` は `tier 1 / minor: true` を**維持**（既存テスト `combatTimeline.test.ts:103` `minor === true` を壊さない）。`stopMs` が 40 になることで `.react-minor` の `juice-stop`（ノックバック姿勢で静止・brightness 2.2）が 40ms 掛かる | `combatTimeline.ts` のみ |
| 金リング | `EnemyPanel.tsx` `enemy-hit-layer` 内に、`r.minor && !r.final` の反応へ `<div className="impact-ring impact-ring-payoff juice-delayed" style={{'--impact-delay': r.atMs}} />` を 1 つ追加。`battle.css`：`.impact-ring-payoff`＝既存 `.impact-ring`（`impact-ring-burst` 0.42s・scale 0.25→1.7）の色を金（border `#ffe08a`・glow `#ffd166`）に、width 110px。`animation-delay` は既存 `.juice-delayed` の `--impact-delay` 方式 | `EnemyPanel.tsx`・`battle.css` |
| 数字 | `.floating-number-bonus`：20px → **30px**・`opacity: 1`（`.floating-number-l1` の 0.9 を上書き）・`text-shadow` 金 2 段・`animation-name: float-up-bonus`（`float-up-l3` の複製：scale 0.7→1.22→1）。`useFloatingNumbers.ts` は**変更不要**（class は既に付く） | `battle.css` |
| 音 | §7 | `useBattleSound.ts`・`sound.ts`・`gen-se.mjs` |
| callout | 変更なし（同時刻に「⚡ 条件成立／共鳴4以上」が出る） | — |
| 神の一撃と同バッチ | bonus step は `afterBurst` 分岐より後ろに評価されるため、共鳴 7 到達と同バッチでは bonus が `burst` に吸収される設計は**既存のまま**。追加の抑止は不要 | — |
| 撃破と同バッチ | `bonusStep.final` なら既存の L4・final 経路（52px・stop 90）。金リングは `!r.final` 条件で出さない（撃破リングと重ねない） | — |

---

## 5. 既存演出との競合（Preflight）

| 競合候補 | 判定 | 根拠・対処 |
|---|---|---|
| 本体 shake × bonus shake（二重 shake） | **回避**（§4） | bonus は minor のまま。合成しても最大 5＋3px |
| 本体数字（左 42〜58%）× ⚡数字（左 66%） | 問題なし | 既存の横ずらし（`enemyLeft`）を維持。30px 化で幅が増えるが 66% 起点で右側に余白あり |
| ⚡数字 × callout | 問題なし | callout は `bottom: 90px`（PC）／`55%・bottom 76px`（SP）で数字帯の下 |
| 金リング × 斬撃 slash-minor | 許容 | 同時刻・同位置。リング 0.42s／斬撃 0.3s 前後。視覚的に一体の「決まった」になる。うるさければリングだけ残す（Human QA 観察項目） |
| cast-flash（共振・回転 0.5s）× READY 点火 | **回避**（§6） | 点火に 150ms delay。cast-flash が消えかけた頃に手札が点く |
| resonance ゲージ更新（`resonance_gain` SE・段階 class）× READY 点火 | 許容 | 音は SETUP 側、光は手札側で役割が分かれる |
| 敵必殺カットイン中の READY | 問題なし | 点火は engine 条件の遷移でのみ発火。カットイン明けの `isPlayerTurn` 復帰では発火しない（§3） |
| 決定125 mobile auto-focus | 影響なし | `battle-viewport` 一画面レイアウトではスクロール対象がない |
| 決定200 press（1px 沈み） | 問題なし | `:active` は `transform` を上書きするが 60ms のみ |
| 表示 HP のゴースト | 許容 | bonus 分の HP 減少が 40ms 遅れる（着弾を見せてから減る、の方向に一致） |
| `card-view-bonus-ready` の他画面利用 | なし | 報酬画面は `.reward-card-effect-bonus`（別 class）。デッキ構築は `bonusReady` を渡していない |

---

## 6. timing 案（タップ＝0ms・実測ではなく実コードの定数から計算）

| 時刻 | 段階 | 画面・音 | 入力 |
|---|---|---|---|
| **SETUP：共振をタップ** | | | |
| 0 | cast | `card-play` 0.28s・cast-flash（共鳴・回転 0.5s）・`card_play` SE | 280ms ブロック（既存） |
| 280 | commit | 共鳴 2→4・`resonance_gain` SE・ゲージ更新・手札再描画（`armed` false→true） | 解除 |
| **430** | **READY 点火開始**（delay 150） | 『豪快な一撃』の枠を金の rim が一周・珠 glint・2px lift | 可（思考中） |
| 880 | 点火終了 | 静的な金 rim＋2px lift＋金文字が残る | 可 |
| **PAYOFF：豪快な一撃をタップ** | | | |
| 0 | cast | `card-play`・cast-flash（攻撃）・神 wind-up 220ms・`card_play` | 280ms ブロック（既存） |
| 280 | commit（=timeline 0） | — | 解除 |
| 370 | IMPACT（+90） | god-strike 最前・本体 140（L2）：stop 20・`hit-shake` 0.4s・22px・`hit_l2` 0.6 | 可 |
| **520** | **PAYOFF（+240）** | ⚡+40：**stop 40**（ノックバック静止）・金リング 0.42s・**30px「⚡-40」**・斬撃 minor・**`bonus_payoff` SE**・callout 0.7s | 可 |
| 560 | | 表示 HP（bonus 分）が減り始める（+90 lag） | 可 |
| 940 | | リング消滅 | 可 |
| 1,220 | RETURN | callout 消滅（520＋700）。数字は 1,420 まで上昇 | 可 |

**入力ブロック増分：0ms**（既存の 280ms のみ）。追加の可視 tail：READY 450ms（手札内・非ブロック）／PAYOFF 約 600ms（非ブロック）。

---

## 7. SE は本当に必要か

| 案 | 内容 | 判定 |
|---|---|---|
| A 音は変えない | bonus は `hit_l1` 0.45 のまま | ✗ 「本体より小さい音」が残り、G-A の逆転が耳では解消しない |
| B 既存音を強くする | bonus に `hit_l3`（0.8）を割り当て | △ 同じ打撃族が 150ms 間隔で 2 回鳴るだけで「別の出来事」に聞こえない。連撃と区別できない |
| **C 専用音 1 音で置き換える** | `bonus_payoff`：`gen-se.mjs` の `chime([1047, 1568], 180, 60, 0.3)` 相当（短い上昇 2 音・金属質・≤200ms）。bonus step では `hit_l1` を鳴らさず **これに置き換える**（1 手あたりの発音数は 2 のまま：本体 `hit_l2`＋`bonus_payoff`）。gain は `SE_GAIN.reward`（0.7） | **採用** |

必要と判断する理由：①視線が手札↔敵で動く 240ms の間に起きる出来事は、音だけが確実に届く ②「決まった」を打撃族と別の音色にすることで、通常ヒットとの階層差が耳で成立する ③容量 ≤25KB・生成は決定論・外部素材 0。
注意：`chime` は `heal`／`divination`／`resonance_gain`／`reward` でも使う。**`heal`（660/990/1320・260ms）と混同しない**よう、周波数を 1 オクターブ上・長さ半分・金属質（倍音）にする。実装後に 4 音を連続再生して聞き分けを確認する。
`fallbackTone`（WAV 取得失敗時）にも `case 'bonus_payoff'` を追加（1047→1568 の 2 音）。

---

## 8. performance／reduced-motion

| 項目 | 判定 | 根拠 |
|---|---|---|
| 追加 DOM | READY：手札 1 枚につき `<span>` 1（点火中のみ）／PAYOFF：`<div>` 1（リング） | ≤2 要素 |
| animate するプロパティ | `transform`・`opacity`・`filter`（点火の珠）のみ。**`box-shadow` は animate しない**（静的 rim として class に固定） | paint を起こさない |
| JS | `CardView` に `useRef`＋`useState`＋`useEffect` 各 1。新規 timer 0。`planBatch` 呼び出し回数不変 | main thread 増分 <1ms |
| mobile（390×844） | 手札 4 枚可視・横スクロール。**点火カードが画面外の可能性**（推奨デッキで手札 5〜6 枚） | Pilot では対処せず QA で観察（PC 1508 で先に測る）。将来案：成立カードを可視域へ `scrollIntoView({inline:'nearest'})` |
| 容量 | CSS ≤4KB・JS ≤1KB・WAV ≤25KB。画像 0 | ≤35KB（決定223 §12 内） |
| reduced-motion | stop：`ctx.reduced` で 0（既存）／リング：`display: none`（`enemy-defeat-ring` と同じ扱い）／点火：sweep なし・静的 rim のみ／数字 30px と SE は残す（情報を失わない） | `battle.css` の既存 `@media (prefers-reduced-motion: reduce)` 節に追記 |
| backdrop-filter／mix-blend-mode | 新規使用 0 | — |
| 検証 | `scripts/phase6-commercial-benchmark/perf.mjs` の同条件で Before/After・DevTools Paint flashing で手札全体が再描画されないこと・CLS 0 | 実装時 |

---

## 9. 変更予定ファイル（実装時・本書では変更しない）

| # | ファイル | 変更 | `src/core` |
|---|---|---|---|
| 1 | `src/components/battle/enemyVfxTiming.ts` | `BONUS_HIT_STOP_MS = 40` 追加 | 0 |
| 2 | `src/components/battle/combatTimeline.ts` | `hitStopFor`：bonus → `BONUS_HIT_STOP_MS`（reduced は 0） | 0 |
| 3 | `src/components/battle/BattleScreen.tsx` | `CardView` に `bonusArmed` を追加で渡す（1 行） | 0 |
| 4 | `src/components/battle/CardView.tsx` | `bonusArmed` prop・ref 遷移検出・`card-view-ignite` span | 0 |
| 5 | `src/components/battle/EnemyPanel.tsx` | minor 反応へ `impact-ring-payoff` 1 要素 | 0 |
| 6 | `src/components/battle/battle.css` | `card-ready-ignite`／`.card-view-bonus-ready` 静的 rim＋lift／`.impact-ring-payoff`／`.floating-number-bonus` 30px＋`float-up-bonus`／reduced-motion 節 | 0 |
| 7 | `src/components/battle/sound.ts` | `SeName` に `bonus_payoff`・`SE_NAMES`・`sfx.bonusPayoff(delayMs)`・`fallbackTone` case | 0 |
| 8 | `src/components/battle/useBattleSound.ts` | bonus step：`damageEnemy` → `bonusPayoff(st.atMs)` | 0 |
| 9 | `scripts/gen-se.mjs`＋`public/assets/se/bonus_payoff.wav` | 1 音生成（実装時のみ。今は生成しない） | 0 |
| 10 | tests（実装時） | `combatTimeline.test.ts` に「bonus の stopMs は 40／reduced で 0」を**追加**（既存 `minor === true` は不変）・`sound.test.ts` に名前追加・`CardView` の遷移検出 1 件 | 0 |

golden／gameVersion：表示層のみで不変。`docs/SE_ASSETS.md` に 1 行追記。

---

## 10. Human QA Before／After 方法

| 項目 | 内容 |
|---|---|
| Before（済） | 決定218 QA（本日・`:4184`・HEAD 43c10a4）。seed は未記録 |
| seed 固定 | 通常モードは `?seed=<文字列>` で盤面を固定できる（`useGameEngine.ts:316-319`・決定126）。After QA では **事前に決めた seed**（例 `?seed=d223-pilot-01`）を Before／After 両方に付けて同一盤面にする |
| 手順 | ①`:4184`（baseline・現行 build）で `http://127.0.0.1:4184/?seed=d223-pilot-01` を開き、大耀 × 龍神 × ふつう × 推奨で 1 戦 ②Pilot build を別ポート `:4185` で起動し、同じ URL＋seed で 1 戦 ③決定223 §15 の 5 問に答える（Q1 点いた瞬間に気づいた／Q2 ⚡が決まったと分かった／Q3 自分の順番の結果と分かった／Q4 一続きに感じた／Q5 テンポが悪くなった＝NO） |
| 順序 | baseline → pilot。差分の有無（「点いた」「決まった」）を後で確認する形にする。ブラインド不要（操作起因の演出は因果を測る） |
| 補助観察 | 点火に気づいた回数／⚡を狙って順番を変えた回数／PAYOFF 中に次のカードへ手が伸びたか／SP でも実施する場合は点火カードが画面外だった回数 |
| 撤退条件 | 決定223 §16 のまま（Q1〜Q3 のいずれか NO／Q5 YES／入力ブロック増分 >0／`src/core` 差分・golden 変化・tests FAIL／reduced-motion で情報喪失） |

---

## 11. 判定

**GO WITH MODIFICATIONS**（決定223 §5〜§12 の案に対する修正 4 点）

1. **READY の起点**：CSS class 付与ではなく、ゲート前の engine 条件（`previewBonusTrigger`）の false→true 遷移を JS ref で検出する（§3。class 付与型は cast 明け・ラウンド明け・カットイン明けに再点火する）
2. **PAYOFF の敵反応**：tier 2 格上げをやめ、minor shake を維持。強さは hit stop 40ms・金リング・30px 数字・専用 SE で作る（§4。二重 shake 回避・既存テスト不変）
3. **READY の timing**：delay 150ms・duration 450ms（cast-flash の消え際に点く。§6）
4. **SE**：追加ではなく置き換え（bonus step の `hit_l1` → `bonus_payoff`。1 手の発音数を増やさない。§7）

変更なしで採用：画像 0・`src/core` 0・入力ブロック増分 0・≤35KB・callout 不変・H3 不使用・カード ID 分岐なし。

## 12. NEXT NOW（1 つ）

**実装待機。** CEO は本 Preflight を受領したうえで GO を**保留**（2026-09-23）。新しい指示が来るまで、runtime／assets／tests／branch 作成／SE 生成のいずれも行わない。GO が出た場合の手順は §9（10 項目・新ブランチ `feat/d223-payoff-pilot`）・§8（計測）・§10（`:4185`・`?seed=d223-pilot-01`）のとおり。

---

## 13. 記録
- runtime／assets／balance／tests／画像生成／H3／fal.ai／commit／push／merge／deploy／Ranking／Neon／secrets：すべて 0
- 本書・決定218 §10・DECISIONS.md 2 行は未 commit（CEO 承認後に PM が commit）
- CEO 受領（2026-09-23）：Preflight 結果を受領。**GO は保留・実装待機**。決定218 PASS は確定・保持。本書で判明した事項（READY 単純 CSS の再点火問題／engine 条件 false→true 遷移検出案／PAYOFF tier 格上げの二重 shake 問題／hit stop・ring・数字・SE による階層化案／入力ブロック増分 0ms／reduced-motion 案／same seed Before/After QA 案）は保持する
- Preview `:4184` は起動したまま（baseline として After QA でも使う）
