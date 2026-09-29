# 決定199 — Interaction Feel / Interaction Laws Audit

- 日付：2026-09-19
- モード：READ / MEASURE / TEST / DESIGN ONLY（runtime 変更 0・commit 0・push 0・Production 変更 0）
- 対象：master `3470545`（runtime は Production `3b416da` と同一・`src` 差分 0）。実測は同ビルドの `dist` を `vite preview :4181` で配信して実施
- 区分：判定・設計は **AI判断**（CLAUDE.md §6-2）。実装着手は CEO 指示待ち
- 監査スクリプト：`scripts/decision199-interaction-audit/measure.mjs`（untracked・監査用）。結果 `out/measure.json`
- 上流：決定194 §14 Interaction Laws 候補、決定195 §13、決定198（E1 ＋ Solve Loop v1 LIVE）

---

## 1. Decision199 Verdict

**PASS WITH MODIFICATIONS。**

- Interaction Laws 6 条のうち **Law 2・3・6 は既に実装で満たされている**（hit stop 4 段・共鳴 cut-in・`src/core` の純粋性）。
- **Law 1（押せるものは反応する）は Production で事実上ゼロ**：`:active` は全 51 ボタン中 1 件、pointerdown 直後に style が変わる要素は 0、UI 押下音 0、`touch-action`／`tap-highlight` 0。カードは press から 280ms（音）〜370ms（着弾）まで無反応。
- **Law 4 は戦闘内で成立、Law 5 は 2 箇所で違反**（報酬選択後に結果カードが remount され 1.9 秒の演出が再生される／勝利演出が skip 不可）。
- 過去 Human QA の「カードを選ぶとスクロールで着弾が見えない」は **現行レイアウトでは再現しない**（SP 2 viewport で戦闘中の全領域が 100% 可視・scrollY 0）。
- iOS sticky hover は **Chromium mobile emulation で再現**（End Round が敵ターン後に `translateY(-2px)` のまま）。
- 推奨：**Interaction Feel v1 を CSS のみで実装する（§13）**。runtime ロジック・RNG・state に触れない。

---

## 2. Current Interaction Inventory

全 51 個の `<button type="button">`。`<a>` 0、`role="button"` 0、div+onClick 0（backdrop の div 2 つを除く）。入力は 100% React `onClick`。

| 画面 | 要素 | hover | :active | focus-visible | 押下 SFX |
| --- | --- | --- | --- | --- | --- |
| Home | Primary CTA（続きから／初陣へ／神域へ／神を選ぶ） | translateY(-2px)＋glow | ✖ | UA 既定 | ✖ |
| Home | Home Today CTA・戦績／OTOMO リンク・ヘッダー 3 アイコン | 色／背景 | ✖ | UA 既定 | ✖ |
| Setup | 神タイル（`.god-select-card`） | translateY(-3px)＋glow | ✖ | UA 既定 | ✖ |
| Setup | 難易度 3 択・神階 chip・絆経路 radio | 枠色（選択状態と alpha 差のみ） | ✖ | UA 既定 | ✖ |
| Setup | この構成で始める（`.god-select-confirm`） | translateY(-2px) | ✖ | UA 既定 | ✖ |
| Setup | 敵タイル（`.enemy-select-card`） | translateY(-3px) | **✔ 唯一**（-1px scale .99） | **✔ 唯一** | ✖ |
| Setup | デッキ ±・戻す・全て外す・バトル開始 | translateY(-2px)（±は色のみ） | ✖ | UA 既定 | ✖ |
| Battle | 手札カード（`.card-view`） | translateY(-8px) scale(1.04)＋shine | ✖ | UA 既定 | 280ms 後（commit 時） |
| Battle | ラウンドを終える（`.end-round-button`） | translateY(-2px)＋glow | ✖ | UA 既定 | 700ms 後（enemy_turn） |
| Battle | 神託 3 択（`.divination-choice`） | 背景のみ・transition 0 | ✖ | UA 既定 | commit 時（即時） |
| Battle | ログ toggle・ConfirmDialog・Tutorial・Feedback・初陣説明 | 色／brightness | ✖ | UA 既定 | ✖ |
| Result | Primary（`.result-cta-primary`）・Secondary・Tertiary・共有 | gradient/glow（transition 宣言なし＝瞬時） | ✖ | UA 既定 | ✖ |
| Reward | 報酬カード（`.reward-card`）・見送る | translateY(-4px) | ✖ | UA 既定 | **✔ `reward`（アプリ唯一のボタン音）** |

死んでいる CSS：`.home-cta-daily`・`.game-over-rank-link`・`.game-over-share-button`。

---

## 3. Static Code Measurements（src・test 除く）

| 項目 | 件数 | 決定194 時 |
| --- | --- | --- |
| `<button` / `onClick=` | 51 / 55 | – |
| `role="button"` / `<a` / `onPointer*` / `onTouch*` / `onKeyDown` / `onDoubleClick` | 0 / 0 / 0 / 0 / 0 / 0 | – |
| CSS `:hover` | **42**（うち transform／shadow を動かすもの 11） | – |
| CSS `:active` | **1** | 1 |
| CSS `:focus-visible` / `:focus` | 3 / 4 | – |
| `transition:` / `transform:` / `@keyframes` / `animation:` | 33 / 172 / 92 / 104 | – |
| `-webkit-tap-highlight-color` / `touch-action` / `user-select` | **0 / 0 / 0** | 0 / 0 / 0 |
| `cursor: pointer` / `cursor: not-allowed` | 30 / 9 | – |
| `disabled=` / `aria-disabled` / `aria-pressed` / `aria-live` | 11 / 0 / 1 / 0 | – |
| `@media (prefers-reduced-motion` | 9 ブロック | 9 |
| `@media (hover: hover)` / `(pointer: coarse)` | **0 / 0** | 0 |
| `will-change` | 1（背景層のみ） | – |
| UI ボタン押下で鳴る SFX | **1**（報酬カード） | 0 |

---

## 4. PC / Touch Findings（実測＋コード）

### 4-1. press feedback 実測（PC・pointerdown 60ms 後の computed style 差分）

| 要素 | hover で変わるもの | **press で変わるもの** | transition |
| --- | --- | --- | --- |
| Home Primary CTA | transform／boxShadow | **なし** | .15s／.2s |
| 神タイル | transform／boxShadow／borderColor | boxShadow／borderColor（hover の transition が追いついただけ） | .15s |
| この構成で始める | transform／boxShadow | **なし** | .15s |
| 敵タイル | transform／borderColor | **なし（`:active` があるのに 60ms 時点で transform は -3px のまま＝hover が勝つ）** | .15s |
| バトル開始 | **なし（hover もなし）** | **なし** | .2s |
| **手札カード** | transform（-8px scale 1.04） | **なし** | .15s |
| 神託 | background | **なし** | **0s** |
| ラウンドを終える | transform／boxShadow | **なし** | .15s |
| 結果 Primary／Secondary | transform／boxShadow | boxShadow のみ（transition 追従） | .15s |

→ **押した瞬間に変わる要素は 0**。唯一の `:active` も hover の translateY(-3px) と競合し、実測では -3px のまま（`:active` の -1px は hover より詳細度が同じで後勝ちのはずだが、hover→active の遷移が .15s のため 60ms では見えない）。

### 4-2. touch（Chromium mobile emulation・390×844／760）

| 要素 | tap 後 | 判定 |
| --- | --- | --- |
| 神タイル・敵タイル | 要素が unmount（画面遷移） | 安全 |
| 難易度 3 択 | boxShadow／borderColor が変化したまま＝**hover が latch**。選択状態と alpha しか違わないため区別不能 | 曖昧 |
| **ラウンドを終える** | tap 直後 none → 敵ターン後 **`translateY(-2px)` のまま**（hover latch＋`:not(:disabled)` 復帰） | **sticky hover 再現** |
| tap highlight | `rgba(51,181,229,.4)`（Android 既定の青）／PC `rgba(0,0,0,.18)` | 未制御 |
| `touch-action` | `auto`（全要素） | double-tap zoom・300ms 遅延の余地 |
| viewport meta | `width=device-width, initial-scale=1.0`（`user-scalable` 制限なし＝a11y 上は正） | – |

結論：**hover だけで状態を表現している**（press 状態が存在しない）。iOS Safari でも同じ挙動が予想される（未実機）。

---

## 5. Card Interaction Findings

| 段階 | 実装 | 実測（PC／SP） |
| --- | --- | --- |
| Idle | 132×190（SP 100×158／140）、`cursor:pointer`、unaffordable のみ inline opacity .45 | – |
| Hover | translateY(-8px) scale(1.04)＋shine .55s（PC のみ意味がある） | hover 250ms 後に transform 反映 |
| **Touch / press** | **何もない**（`:active` なし・pointer handler なし） | press 60ms 後 差分 0 |
| Selected | **存在しない**（click＝即 play） | – |
| Commit | `setPendingCardUid` → `.card-view-playing`＝`card-play .28s`（scale 1.08→0.6・Y-40px・opacity 0）＋cast-flash | click→手札から消える **327ms**（280＋描画） |
| 音 | `card_play` は **commit（+280ms）時**に発火。press 時は無音 | – |
| 着弾 | `CARD_IMPACT_MS 90` → hit stop（0/20/45/60ms）→ shake／flash／数字 | click→数字 **327〜348ms**、HP 表示変化 **514〜549ms** |
| 入力復帰 | `pendingCardUid` null＝**+280ms（着弾の 90ms 前）** | 実測 521ms（HP 変化後に計測が拾った値） |
| disabled | `!playable || !affordable`。**敵ターン／pending 中のカードは opacity 1 のまま**（cursor:not-allowed のみ＝touch では無情報） | – |

**「押した瞬間に入力されたと感じるか」→ No。** 視覚 0ms→なし、音 280ms、着弾 370ms。Combat Juice（着弾以降）は強いが、その手前の「入力の手応え」が空白。

---

## 6. CTA Findings

| CTA | Idle→hover→press→release→遷移 |
| --- | --- |
| Home Primary | hover で浮く（PC）→ **press 変化なし** → click で画面が瞬時に切替（fade なし）。SP は hover が無いので **何も起きずに画面が変わる** |
| 出陣する | 同上 → `startGame` 同期 → BossEntrance 1.5s（`pointer-events:none`＝下の盤面はタップ可能） |
| バトル開始 | hover なし・press なし → 瞬時切替・BGM ハードカット |
| 結果 Primary（同じ盤面でもう一度） | hover glow（transition 宣言なし＝瞬時）→ press 変化なし → **click から手札表示まで 16ms・入力可能 20ms**（fade なし）。**二重押しガードなし**（`runExit` は ref／disabled なし。通常戦で 2 回 `startGame` が走りうる・未実証） |
| 報酬カード | hover -4px → press 変化なし → **唯一の押下 SFX** → 260ms 後 pick → **結果カードが remount し 1.9s の演出を再生** |

---

## 7. Audio Findings

- SFX 20 種は **戦闘イベント駆動**（`useBattleSound` がログを見る）。UI ボタンで鳴るのは報酬カードの `reward` だけ。
- **入力感が弱い無音操作**：カード press（音は +280ms）、ラウンド終了 click（音は +700ms の `enemy_turn`）、Home Primary、神／敵／難易度選択、バトル開始、結果の全ボタン、再戦。神託だけは commit が即時のため実質 press 音がある。
- **疲労・重複リスク**：`card_draw` がラウンド開始時に **枚数ぶん同時刻に発火**（5 枚＝同位相 5 重・クリップ懸念）、`resonance_gain` がほぼ毎カード、multi-hit は 110ms 間隔でプレイヤー側はピッチ変化なし。cooldown／dedup／voice limit は無い。
- BGM は home／battle のハードカット。勝敗ジングルあり。SFX の AudioContext は初回 `getCtx()` で resume＝**初回タップは無音になりうる**（未実機）。

---

## 8. Timing Findings（source 定数＋実測）

| 区間 | 値 |
| --- | --- |
| press → 可視反応 | **なし**（0 要素） |
| card click → 手札から消える | 280ms（実測 327） |
| card click → `card_play` 音 | 280ms |
| card click → 着弾（数字・flash） | 370ms（実測 327〜348） |
| card click → 敵 HP 表示変化 | 460〜520ms（実測 514〜549） |
| card click → 入力復帰 | **280ms（着弾前）** |
| End Round click → ボタン disabled | 12ms（実測） |
| End Round → 敵の着弾 | 805〜928ms（special 1,960） |
| End Round → 入力復帰 | **700ms（敵が振る前）**・実測 713 |
| 共鳴 BURST（commit 基準） | ready 0 → cut-in 200〜1,100 → strike 1,300 → **impact 1,600** → evolve 2,500。入力復帰 ~1,100（impact 前） |
| 勝利（カード撃破） | click → 結果 overlay 1,860 → **Primary 操作可能 ≈ 4,260ms**（skip 不可） |
| 勝利（BURST 撃破） | ≈ 5,770ms |
| 敗北 | click → overlay ≈ 1,570 → ボタン ≈ 2,170ms |
| 報酬 | 開く fade 250 → pick → 260 → 結果 remount＋1.9s 演出 |
| 再戦 click → 手札 | **16ms**（fade なし） |
| reduced motion | `card-play` は無効化されるが、JS の 280／700／260ms 待ちは短縮されない。`.hit-shake` 基底クラスは reduce 下でも 0.4s（tier 版のみ gate） |

「入力→可視反応が遅く感じない」は、**戦闘の着弾（370ms）は妥当、press（∞）が問題**。また 3 箇所で **結果が見える前に入力が戻る**（カード 280 vs 370、End Round 700 vs 805+、BURST 1,100 vs 1,600）。

---

## 9. Battle Visibility Findings

| viewport | 敵プレート | 敵スプライト | HP バー | 神託 | 手札 | End Round | scrollY |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 390×844 | 100%（109〜185） | 100%（190〜552） | 100% | 100% | 100%（650〜838） | 100% | 0（開始・タップ前・着弾時・整定後すべて） |
| 390×760 | 100%（109〜185） | 100%（190〜468） | 100% | 100% | 100%（566〜754） | 100% | 0 |

現行は `body.battle-viewport`（`#root` 100dvh・overflow hidden・3 行 grid・≤899px は敵｜神｜OTOMO の 3 列）で **ページスクロールが存在せず**、`useMobileAutoFocus` は意図的に不活性（`isPageScrollable()` false）。過去 Human QA の「スクロールで着弾が見えない」は **6-B のレイアウト以降は再現しない**。≤460px 高さの escape hatch だけがスクロール復帰する。

**判定：見えている。演出を強くする前提は満たされている。** 残る可視性の問題は BossEntrance 1.5s が `pointer-events:none` で下の盤面がタップ可能なこと（入力が演出中に通る）。

---

## 10. Accessibility Findings

- **keyboard focus**：Tab 移動で UA 既定 outline が全要素に出る（実測：Home 9 要素・Battle 10 要素で `outline:true`）。ただし暗背景に対する既定リングのコントラストは未計測。専用 `:focus-visible` は敵タイルのみ（`outline:none`＋金枠）。
- **focus trap**：全ダイアログでなし。Escape は ConfirmDialog・初陣説明のみ。Tutorial／Feedback／Reward／GameOver は `role="dialog"` なし（Tutorial・Reward・GameOver）／Escape なし。
- **disabled clarity**：End Round・デッキ確定・神託・神階 chip は明確（opacity .3〜.45）。**手札カードは「敵ターン／pending 中」に見た目が変わらない**。結果 Tertiary の disabled は opacity .8 でほぼ判別不能。
- **選択状態 vs hover**：難易度・神階・絆経路は `#ffd16688`（hover）と `#ffd166`（選択）の alpha 差のみ。
- **reduced motion**：9 ブロックで戦闘演出は概ね gate。overlay fade は意図的に非 gate。hover 系 transition は非 gate。`.hit-shake` 基底は非 gate。
- **設計条件（Feel 改善時）**：①`:active` は transform／opacity のみで色コントラストを下げない ②reduced-motion では transition 時間 0・沈み量は維持（状態は伝える） ③`:focus-visible` を `:hover` と分離し、押下状態で focus ring を消さない ④hover を `@media (hover: hover)` に閉じ込めても選択状態は別クラスで残す ⑤disabled は opacity か枠で必ず表現。

---

## 11. Performance Risks

- 現状の演出は ~100% CSS keyframes／transition。JS ループは score roll-up の rAF と WAAPI の arena shake（±3〜5px・240〜320ms）だけ。layout 読み取りは impact 経路に無い。animation lib 0。
- **v1 で足す `:active` は transform／opacity／filter のみ** → compositor 完結・rerender 0・layout thrash 0。
- 注意点：①`filter` は GPU 負荷がやや高いので brightness の使用は Primary 数個に限定 ②`transition` を `:active` 用に短く（60ms）する場合、hover 用（150ms）と競合しないよう `transition-duration` を状態別に分ける ③React 側の rerender は変えない（CSS のみ）④カードは press 中も `card-play` keyframes と競合しない（`.card-view-playing` は `pointer-events:none` で `:active` が乗らない）。
- RNG／state timing coupling：`:active` は state を持たないため 0。

---

## 12. Interaction Laws — Final（採用するもののみ）

| # | Law | 判定 | 現状 | v1 での扱い |
| --- | --- | --- | --- | --- |
| 1 | 押せるものは押した瞬間に反応する | **採用・未実装** | pointerdown 反応 0 要素 | **v1 の主対象** |
| 2 | 強い行動ほど重い | 採用・実装済み | hit stop 0/20/45/60・BURST 80・最終 90 | 触らない |
| 3 | 重要な成功には返答 | 採用・実装済み | cut-in・flash・SE・OTOMO 進化 | 触らない |
| 4 | 予告→タメ→開示 | 採用・実装済み（戦闘内） | READY 200 → cut-in 900 → impact | 触らない |
| 5 | 繰り返す操作は短く | 採用・**部分違反** | 報酬後の結果 remount 1.9s 再生／勝利演出 skip 不可 | v1 では触らない（別 milestone：L6） |
| 6 | 演出は結果を変えない | 採用・実装済み | `src/core` 純粋・replayBoundary | 規約として維持 |
| 7（補則） | 頻度×強度：頻繁なものほど軽く | 採用 | – | Tier 予算（§13） |

---

## 13. Minimum Interaction Feel v1（1 案）

**「CSS だけで Law 1 をゲーム全体に敷く」— 4 つの小さな規則を 1 つの新規 CSS ファイルに集約する。runtime JS・state・RNG・音は触らない。**

### 13-1. Importance Tier と Feedback Budget

| Tier | 対象 | press 予算 | release |
| --- | --- | --- | --- |
| **T1 頻繁・軽い** | 手札カード、神託 3 択、デッキ ±、ログ toggle、ヘッダーアイコン、Tertiary リンク | `transform: translateY(1px) scale(.985)`、遷移 **60ms in**、色変化なし、音なし | 既存 hover transition（150ms） |
| **T2 意思決定** | Home Primary／Home Today／出陣する／この構成で始める／バトル開始／ラウンドを終える／結果 Primary・Secondary／報酬カード／神・敵タイル／難易度・神階・絆 radio／戻る系 | `transform: translateY(1px) scale(.97)` ＋ `filter: brightness(.94)`、**60ms in**、音なし（v1） | 150ms |
| **T3 クライマックス** | 神技（BURST）・撃破・初撃破 | **変更なし**（既存 cut-in／hit stop／ジングル） | – |

### 13-2. 4 つの規則（すべて CSS）

1. **Touch hygiene（全 button・card 共通）**：`touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none;`（textarea は除外）。
2. **Hover guard**：transform／shadow を動かす hover 11 件を `@media (hover: hover) and (pointer: fine)` に閉じ込める。色だけの hover は残す。選択状態（`-active`／`aria-checked`）は hover と切り離した専用ルールで維持。
3. **Press state（Tier 別 `:active`）**：上表の値。`:active` の transition は `transform 60ms ease-out, filter 60ms` とし、hover の 150ms と分離。`:disabled` には付けない。`.card-view-playing` には付かない（`pointer-events:none`）。
4. **Disabled cue**：`.card-view:disabled { opacity: .55 }`（inline .45 の unaffordable はそのまま）。敵ターン／pending 中に「押せない」が見える。

### 13-3. 追加する a11y 条件

- `:focus-visible` を T1／T2 の共通セレクタに `outline: 2px solid #ffd166; outline-offset: 2px` で付与（敵タイルの既存規則は維持）。
- `@media (prefers-reduced-motion: reduce)` で `:active` の transition-duration を 0 に（沈みは残す）。

### 13-4. 含めないもの（v1）

- 押下 SFX（`card_play` を press 時へ移す JS 変更は **v1.1 候補**。まず視覚だけで「返ってくる」かを Human QA で確かめる）
- 入力復帰タイミングの変更（280／700／1,100ms）＝JS・体感リズムに影響
- 報酬後の remount 演出短縮・勝利演出 skip（Law 5・別 milestone）
- 結果 Primary の二重押しガード（バグ修正扱いで別 commit・§17 参照）
- `card_draw` 同時発火の間引き（音・別 commit）

---

## 14. Expected Files / Diff（実装するなら）

| ファイル | 変更 | 目安 |
| --- | --- | --- |
| `src/components/press.css`（**新規**） | Touch hygiene・Tier 別 `:active`・focus-visible・reduced-motion・card disabled cue | +90〜120 行 |
| `src/App.tsx` | `import './components/press.css'` 1 行（読み込み順は既存 CSS の後） | +1 |
| `src/components/setup/setup.css` | hover 8 件を `@media (hover: hover) and (pointer: fine)` で包む（`.god-select-card:hover`・`.god-select-confirm:hover`・`.home-cta-primary:hover`・`.enemy-select-card:hover`＋`::after`・`.deck-builder-toolbar/actions button:hover`・`.deck-builder-card:hover`・`.home-today-cta:hover`） | ±40 |
| `src/components/battle/battle.css` | hover 3 件を包む（`.end-round-button…:hover, .game-over-card button:hover`・`.card-view:hover`＋shine・`.reward-card:hover`） | ±25 |
| `src/components/feedback/feedback.css`・`tutorial.css` | `translateY(-2px)` hover 2 件を包む | ±10 |
| runtime TS/TSX | **0**（`App.tsx` の import 1 行のみ） | – |
| `src/core` | **0** | – |

想定 diff：CSS 約 +130／±75、TSX +1。`saveVersion`・`gameVersion`・storage・依存：不変。

---

## 15. Automated QA Plan（実装時に必須）

| 種別 | テスト | 根拠 |
| --- | --- | --- |
| source-pinned（vitest） | transform／shadow を動かす `:hover` がすべて `@media (hover: hover)` 内にある（CSS を `?raw` で読み regex 判定）／`:active` が T1・T2 セレクタに存在／`touch-action: manipulation` と `-webkit-tap-highlight-color` が press.css に存在／`src/core` 差分 0 | Law 1・hover guard |
| 決定論（既存） | `sameSeedRetry.test.ts`・`determinism.test.ts`・`replayBoundary.test.ts` が変化なし | Law 6 |
| Playwright（新規 `scripts/interaction-feel-v1/acceptance.mjs`） | ①PC：pointerdown 60ms 後に T1／T2 各要素の transform が idle と異なる（Home Primary・カード・End Round・結果 Primary・報酬カード・神託・神タイル）②SP emulation：End Round を tap → 敵ターン後 transform が `none`（sticky hover 解消）③SP：カード click→消える 280±40ms・数字 370±60ms（タイミング不変）④disabled カードの opacity ≤ .6 ⑤Tab で focus ring が見える⑥reduced-motion で `:active` transition 0s ⑦CLS PC ≤ .01／SP ≤ .05・44px 未満 0（既存 cls.mjs）⑧全画面 404／JS error 0（既存 screens-smoke） | 実測で Law 1 |
| 二重起動 | 既存 `pendingCardUid`・End Round disabled・Daily ref の動作不変（既存 acceptance）。結果 Primary は別 commit でガード追加を推奨 | 安全 |
| 不変 | Daily semantics（`solveLoopWiring.test.ts`）・Result Hub（`resultHub.test.ts`）・Ranking Absence・Secret Audit・外部通信 0（qa-flow） | 契約 |

---

## 16. CEO Human QA（5 分以内）

iPhone と PC の両方で。**質問は 1 つ：「押したことがすぐ返ってくる感じがあるか」**。

1. Home の金色ボタンを **押し込んで離す**（沈んでから進むか）
2. 戦闘でカードを **3 枚** タップする（触った瞬間に沈み、そのまま飛んでいくか。押せないカードが薄く見えるか）
3. 「ラウンドを終える」をタップ → 敵のターンが終わったあと、**ボタンが浮いたまま光っていないか**（iPhone）
4. わざと負けて「同じ盤面でもう一度」を押す（沈むか）
5. 勝って報酬カードを 1 枚押す（沈み→音→確定の順に感じるか）
6. デッキ画面で ± を **素早く 5 回** タップ（拡大ズームや遅れが無いか）

---

## 17. Explicit Non-Goals

- Combat Juice の強化（hit stop・shake・cut-in の数値変更）
- 入力復帰タイミング・演出時間の変更（Law 5 は L6 で扱う）
- UI 押下 SFX の追加（v1.1 で判断）・`card_draw` 重複の修正
- 結果 Primary の二重押しガード（**バグ候補として別 commit 推奨**：`runExit` に ref ガード。Solve Loop の同 seed 再戦が 2 回走る恐れ）
- BossEntrance 中の入力遮断
- focus trap／Escape／`aria-live`（a11y milestone）
- 画面遷移の fade・BGM クロスフェード
- Living Hero・OTOMO・Solve Legibility・Ranking・Neon・analytics・monetization
- 全ボタン固有アニメ・粒子・haptic API・アニメ lib・UI 全面刷新

---

## 18. Recommendation

**IMPLEMENT（Interaction Feel v1・CSS のみ）。**

理由：①Law 1 の欠落は「pointerdown 反応 0 要素・`:active` 1／51・touch 制御 0」と実測で確定し、カードゲームの最頻操作（カード）に手応えが無い ②sticky hover は emulation で再現し、hover guard は同じ CSS 変更で解ける ③変更は transform／opacity／filter の CSS のみで runtime・RNG・state・音に触れず、`git revert` 1 回で戻せる ④可視性・Combat Juice・決定論は既に成立しており、「入力の手応え」だけが空白＝North Star の「答えを入力した瞬間」を最小コストで埋められる ⑤想定 1.5〜2 日・Human QA 5 分。

実装は CEO の指示があるまで行わない。

---

## 付録：実測ログ（`scripts/decision199-interaction-audit/out/measure.json`・抜粋）

- PC カード：click→leave 327.2ms、数字 327.2ms、HP 変化 521.1ms（1,000→920）、press 変化なし
- PC End Round：disabled 11.6ms、次入力 712.6ms
- PC 再戦：手札 16ms、入力可能 20ms
- SP844 End Round：tap 後 `none` → 敵ターン後 `matrix(1,0,0,1,0,-2)`
- SP 可視率：全領域 100%・scrollY 0（開始／タップ前／着弾／整定）
- reduced：`card-play` none 0s、`.hit-shake` 0.4s、カード transition .15s
- console error：全シナリオ 0
