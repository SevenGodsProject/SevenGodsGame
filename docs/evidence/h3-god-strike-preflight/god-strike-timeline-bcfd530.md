# God Strike（神の一撃）現行タイムライン — Production bcfd530【実測・実コード】

読み方：commit（engine が `RESONANCE_BURST` を含むイベント列を返し、`useBattleFx` が `burstKey` を進めた瞬間）を 0ms とする。定数はすべて `src/components/battle/enemyVfxTiming.ts`（`BURST_READY_LEAD_MS 200`・`RESONANCE_CUTIN_MS 900`・`BURST_HANDOFF_MS 200`・`BURST_GOD_ATTACK_MS 1300`・`BURST_STRIKE_PEAK_MS 300`・`BURST_IMPACT_MS 1600`・`BURST_BANNER_MS 900`・`BURST_EVOLVE_MS 2500`・`BURST_HIT_STOP_MS 80`）。

| t（ms） | 何が起きるか | 主体 | 出典（file:line） |
|---|---|---|---|
| −280〜0 | 共鳴を上げるカードの cast（閃光・飛翔・入力ロック 280） | Card／Arena | `useGameEngine.ts:74`、`BattleScreen.tsx:446-457` |
| 0 | engine：`applyResonance` → OTOMO 進化 → 神の効果 → OTOMO 効果（同期・1 バッチ）。表示側は `fx.burstKey`＋`miniResultKey` が同時に進む | engine | `src/core/engine/effects.ts:applyResonance`、`useBattleFx.ts:177-179` |
| 0 | **入力ロック開始**：`cutinActive=true`（`isPlayerTurn` が false） | HUD | `BattleScreen.tsx:155-163・298-305` |
| 0 | 共鳴ゲージの到達反応（`resonance-gauge-ready-flash` 0.9s・fill 100%） | HUD | `GodOtomoPanel.tsx:173`、`battle.css:4018-4030` |
| 0 | SE `burst_ready`（gain 0.65・420ms） | 音 | `useBattleSound.ts:69-72`、`sound.ts`（`burstReady`） |
| 0 | SP：敵パネルへ自動スクロール開始・保持 3,600ms（`FOCUS_HOLD_BURST_MS = 2500+900+200`） | HUD | `useMobileAutoFocus.ts:47・147-154` |
| 200 | **カットイン mount**（`BURST_READY_LEAD_MS`）：`.resonance-cutin` fixed・z-index 4・pointer-events none。暗転 0.2s（#05060d 80%）＋ 0.9s タイマー | Arena | `BattleScreen.tsx:161-162・496-497`、`battle.css:1511-1540` |
| 360 | 集中線 `rays` 0.45s（delay 0.16）・帯 `band` 0.4s（delay 0.16） | Arena | `battle.css:1573-1660` |
| 400 | 神グループ slide 0.4s（delay 0.2）：**円形ポートレート＝`god.art.keyvisual`**（`object-position` `KEYVISUAL_OBJECT_POSITION`＝大耀 `center 30%`）＋七つ刻みの環＋神名／「神の一撃」／共鳴発動 | Arena（神の静止画） | `BattleResonanceCutin.tsx:80-97`、`battle.css:1672-1735` |
| 540 | 題字 `title-in` 0.26s（delay 0.34） | Arena | `battle.css:1761` |
| 800 | 静止（スライド完了）。以後 300ms 見せる | Arena | `BattleResonanceCutin.tsx` コメント（STEP-R1） |
| **1,100** | `resonance-cutin-timer`（0.9s）の `animationend` → `onComplete`：カットイン unmount・**`cutinActive=false`（入力ロック解除）**・`burst-banner` mount（金の放射＋「✨ 大耀の一撃！」0.9s）。安全弁：1,100+400=1,500 で必ず完了 | Arena／HUD | `BattleResonanceCutin.tsx:53-66`、`BattleScreen.tsx:171-181`、`battle.css:1854-1870` |
| 1,300 | **神の突き開始**（`god-burst-strike` 0.6s・`animation-delay: 1.3s`）：0〜30% 引き −10px・50%（＝1,600）で +24px | God | `PlayerPanel.tsx:129`（`burstHit`）、`battle.css:4382-4395` |
| **1,600** | **着弾**（`BURST_IMPACT_MS`）：敵 `react-burst`（tier 4・stop 80ms・kb・揺れ・閃光）、数字 52px（`max`）、SE `hit_l4`（gain 1.0）、HP ゴースト、（OTOMO 効果の数字「カード+n／神力+n」も同時刻） | Enemy／HUD／音 | `combatTimeline.ts:153-156・226-231`、`useFloatingNumbers.ts:100-143`、`useBattleSound.ts:42-44` |
| 1,680 | 舞台の揺れ 5px・320ms（`atMs + stopMs`・reduced では無し） | Arena | `useCombatPresentation.ts:127-141` |
| 2,000 | `burst-banner` の `animationend` → OTOMO 進化があれば `evolve-banner`（🌱）mount。安全弁 2,000+400 | HUD | `BattleScreen.tsx:128-134・176-181` |
| 2,500 | `BURST_EVOLVE_MS`：OTOMO 立ち絵が新形態へ・`evolve-glow` 1.2s・SE `evolve`・`otomo-reacting` pop 0.5s（効果がある形態のみ） | OTOMO | `GodOtomoPanel.tsx:130-146`、`useBattleSound.ts:74-75` |
| 3,600 | SP の自動スクロール保持終了 | HUD | `useMobileAutoFocus.ts:47` |

## 撃破が神の一撃で決まる場合（`outcome === 'won'`・`finalStep`＝burst step）
| t（ms） | 何が起きるか | 出典 |
|---|---|---|
| 1,600 | 着弾（tier 4・stop 90＝`FINAL_HIT_STOP_MS`） | `combatTimeline.ts:190-199・253` |
| 1,860 | 敵の崩壊開始（1,600+90+170）・520ms | `combatTimeline.ts:286-299`（`planVictory`） |
| 2,240 | 「撃破」の拍（`victoryPhase='beat'`）・`victory_sting`・ジングル（BGM は pause） | `useCombatPresentation.ts:143-152`、`bgm.ts:169-200` |
| 3,090 | 勝利の舞台（決定226 `VictoryStage`・keyvisual 円形）→ 結果 | `BattleScreen.tsx:252-258` |

## reduced-motion（`prefers-reduced-motion: reduce`）
- カットイン：rays／band／group／title は transform なし・`resonance-cutin-static-in` 0.25s のフェードのみ。暗転・神名・題字・円は静的に全部出る（`battle.css:1814-1846`）
- 神の突き：`.god-burst-strike img { animation: none }`（`battle.css:4616-4629`）
- 着弾：hit stop 0（`combatTimeline.ts` `ctx.reduced`）、舞台の揺れなし（`useCombatPresentation.ts:129`）、SP スクロールは instant
- **タイムラインの時刻は reduced でも同じ**（カットイン 900・着弾 1,600）

## preload・資産
- `BattleScreen.tsx:260-266`：戦闘開始時に `new Image().src = god.art.keyvisual` で先読み（決定226。「続きから」でキャッシュに無いことがあるため）
- SE は `preloadSe()` を Boss Entrance 時に一括（`BattleScreen.tsx:233-240`）
- **`<video>` 要素は `src/` に 0 件【実測 grep】**。動画の再生経路・失敗時経路は現存しない（新設になる）
- BGM は `HTMLAudioElement`（volume 0.35）。ダッキングなし。勝敗ジングル時のみ pause→resume（`bgm.ts:160-205`）

## 音の関係（現行）
| t | 音 | gain |
|---|---|---|
| 0 | `burst_ready`（420ms） | 0.65 |
| 1,600 | `hit_l4`（580ms） | 1.0 |
| 2,500 | `evolve`（650ms・進化時のみ） | 0.65 |
| 2,240（撃破時） | `victory_sting`（900ms）＋ジングル（BGM pause） | 0.72／0.5 |

## 本 Preflight が着目する事実
1. **カットイン（200〜1,100）は神の静止画（keyvisual）を 900ms 見せる区間**で、engine の結果はすべて commit（0ms）で確定済み。以後は表示側のタイマー（CSS animationend＋setTimeout 安全弁）だけで進む＝**この区間の中身を差し替えても engine・seed・score には触れない**
2. カットインの完了は `animationend` と `setTimeout(900+400)` の**二重の安全弁**を既に持つ。動画に置き換えても同じ構造（`ended`／`error`／`timeout` の三重）で必ず先へ進める
3. 入力ロックは **0〜1,100** の 1,100ms（着弾 1,600 より前に解ける）。カットインを伸ばすと同じ比率でロックも伸びる（Pilot の予算に含める）
4. 1 戦あたりの発生：**0.30 回／戦（決定244）→ 0.55 回／戦（決定246 後・決定245 §5）**。2 回起きる試合は稀（共鳴 14 必要）
5. 現在の神の絵は `keyvisual.webp`（出所 UNKNOWN・台帳 GOD-K-02）。Kit 公式の絵は `main.webp`／`front_640.webp`（戦闘の立ち絵）
