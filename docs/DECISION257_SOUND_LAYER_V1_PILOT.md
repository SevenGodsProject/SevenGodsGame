# 決定257 God Strike / Enemy Ultimate Sound Layer v1 — Pilot

- 起点：master `fbc06c9`（runtime `a611270`＝決定254 LIVE）／branch `feat/d257-sound-layer-v1`／worktree `SevenGodsGame-d257`
- 判定者：【Dev】＋【Designer】（AI 判断・CLAUDE.md §6-2「軽微な演出調整」）。CEO 承認済みの方向性（Lane 3 監査 §5）に沿った Pilot
- 根拠：`docs/COMMERCIAL_PRESENTATION_AUDIT.md` §4〜§5・`docs/evidence/commercial-presentation-audit/sound-timeline.md`（無音区間：神の一撃 1,180ms／敵必殺カットイン 1,110ms・duck 0）

## §0 結論

**FAST GATE：未完了（INCOMPLETE）— HUMAN QA READY ではない。** ブラウザ計測（gate257）が実行中にシステムのメモリ不足で Claude Code により停止された（コマンド自体の不具合ではない）。指示があるまで再実行しない。

| 項目 | 結果 |
|---|---|
| 静的 | tsc 0／oxlint 0（警告は scripts/ の既存のみ・src 0）／vitest **1,303 PASS**（1,289＋14）・skip 9／build OK |
| bundle | JS 453,199→455,809B（**+2,610B**・gzip 138,867→139,640＝+773B）／CSS md5 同一（） |
| 新 SE | burst_rise 900ms 39,734B／enemy_rise 1,000ms 44,144B。既存 20 本 md5 不変（全 22 本を別ディレクトリへ再生成しても 20 本一致） |
| runtime 保護 |  0・CSS 0・時刻定数ファイル（combatTimeline／enemyVfxTiming／battleEntrance）diff 0・golden（useReactionLanguage 等）PASS |
| ブラウザ smoke（PC・大耀×鬼将・1 回） | METRIC LOCK 22 行 不一致 0／console error 0／God Strike：rise T+450（gain 0.595）・hit_l4 1,600・duck 開始 11ms・最低 0.343（実効 0.12）・復帰完了 2,208ms・復帰後 1.0／Enemy Ultimate（R4 断岩）enemy_rise +200 発火／duplicate 0／SE ノード 80 本すべて ended・disconnect 160（=2×80）＝orphan 0／GainNode 経路後も element volume が効く（RMS 比 0.367≈0.35） |
| 全件 gate | lock 14 run（3 case × PC/SP＋SP660）は errors 0 で完走したが、raw JSON は最後に書く設計のため **結果は失われた**。lockrep（入力ロック反復）は 2 周で停止・値 null（計測側の検出不具合の疑い・要修正） |


## §1 設計（SOUND LAW）

### 1-1. 骨格

| 決め所 | anticipation | rise（新） | release | impact | return |
|---|---|---|---|---|---|
| God Strike（共鳴 7/7） | commit 0：既存 `burst_ready` | **`burst_rise`**：T+450〜≈1,350（明るい上昇・倍音・長三和音の 5 度） | T+1,300 神の突き（決定250 の動画・帯） | T+1,600 既存 `hit_l4`（変更なし） | BGM duck 復帰 T+1,900 → 2,200 |
| Enemy Ultimate（必殺／技名付き連撃） | 前ラウンドの既存 `enemy_charge`（溜め予告）＋ commit 0 の既存 `enemy_turn` | **`enemy_rise`**：commit+200〜≈1,200（低く暗い圧・短 2 度の唸り・トレモロ） | T+1,050 カットイン終了→ビーム | T+1,260 既存 `self_hit_heavy`（変更なし。技名付き連撃は 1,100／1,280／1,600） | BGM duck 復帰 T+1,560 → 1,860（連撃は 1,900 → 2,200） |

- 2 本は **音だけで区別できる**：`burst_rise`＝高域へ上がる・倍音豊か・協和（長 3 度／5 度）・シマー（高域ノイズ）／`enemy_rise`＝40〜90Hz の低域・のこぎり波 2 本の短 2 度（不協和のうなり）・低域ノイズの地鳴り・8→14Hz のトレモロ
- rise は **打撃（impact）を鳴らさない**：両方とも着弾の 50ms 以上前に減衰しきる（クレッシェンド→短い release）。impact は既存 `hit_l4`／`self_hit_heavy` のまま＝既存 SE と役割の重複 0
- 時刻は既存の時刻表（`enemyVfxTiming.ts`／`combatTimeline.planBatch`）から **導出するだけ**。`BURST_IMPACT_MS`・`SPECIAL_IMPACT_MS`・`MULTI_CUTIN_LEAD_MS` 等の定数は変更しない

### 1-2. BGM duck（WebAudio GainNode 経路）

- BGM（`HTMLAudioElement`）を **初回 duck 要求時に** `AudioContext.createMediaElementSource(audio) → GainNode(bgmGain) → destination` へ載せる（lazy attach）。iOS Safari で `HTMLMediaElement.volume` が効かなくても GainNode は効く（決定244 §8・監査 R5）
- attach の条件：AudioContext が存在し `state === 'running'`（＝ユーザー操作済み）・BGM が再生中（`!paused`）・BGM 非ミュート。満たさなければ **duck しない**（既存どおり＝無害な fallback）。attach 失敗（例外）時は以後 duck を諦める（`graphFailed`）
- 元の音量は **`audio.volume = 0.35` のまま**（GainNode の基準は 1.0）。duck は GainNode の相対倍率 **0.343（= 0.12 / 0.35）** にする → PC（volume が効く）では実効 0.35 → **0.12**、iOS（volume 無視＝1.0）では 1.0 → 0.343。どの環境でも「既存の音量 × 倍率」なので duck 以外の時間の音量は Before と同一
- 連続発火の合流：`duckUntil = max(duckUntil, now + hold)`。要求のたびに `cancelScheduledValues(now)` → `setValueAtTime(現在値, now)` → `linearRamp(0.343, now+60ms)` → `setValueAtTime(0.343, duckUntil)` → `linearRamp(1.0, duckUntil+300ms)` を **予約し直す**。自動化の最後は必ず 1.0 なので、どんな順序の連続発火でも「最後のイベントの復帰時刻」に 1 本で戻る（残留 0）
- 戦闘画面の unmount（Retry／もう一度／Home）では `releaseBgmDuck()`：duck 中なら 120ms で 1.0 へ戻し `duckUntil = 0`
- ジングル（③）：`playJingle` の開始で duck を解除（BGM は pause 中）。ジングル終了後の BGM 再開は、GainNode 経路が有る時だけ **0 → 1.0 を 400ms でフェードイン**（無い時は既存どおり即再開）。pause 自体のタイミング・ジングル音量・9,000+500ms フェードは変更しない

### 1-3. 変更しないもの（runtime 保護）

`src/core` 0・CSS 0・画像 0・入力ロック時間 0（音は commit 後の予約のみ・await 0）・決定250 cut-in（900／1,300／1,600／stop 80）・決定252 timing・決定254 Entry timing（Full 2.8s／Short 1.5s／reduced 0.9s／skip）・`combatTimeline.ts`／`enemyVfxTiming.ts`／`battleEntrance.ts` の差分 0・既存 SE 20 本の wav（md5 不変）・決定233 タップ経路（`immediateOnly`・30ms dedup）。

## §2 時刻表・gain 表・duck 曲線

### 2-1. 時刻表（commit＝0ms）

| イベント | 0 | 450 | 1,050 | 1,260 | 1,300 | 1,600 | duck 開始 | duck 最低点到達 | 復帰開始 | 復帰完了 |
|---|---|---|---|---|---|---|---|---|---|---|
| God Strike | `burst_ready`（既存） | `burst_rise` 開始（`BURST_IMPACT_MS − 1,150`） | — | — | 突き（release） | `hit_l4`（既存） | 0 | 60 | 1,900（`BURST_IMPACT_MS + 300`） | 2,200 |
| Enemy Ultimate（special） | `enemy_turn`（既存） | `enemy_rise` 開始 200（`SPECIAL_IMPACT_MS − 1,060`） | カットイン終了 | `self_hit_heavy`（既存） | — | — | 0 | 60 | 1,560（最後の敵着弾 + 300） | 1,860 |
| Enemy Ultimate（技名付き連撃） | `enemy_turn` | `enemy_rise` 開始 40（`MULTI_CUTIN_LEAD_MS − 1,060`） | — | 1,100／1,280／1,600 被弾（既存） | — | — | 0 | 60 | 1,900 | 2,200 |
| 通常カード・通常敵攻撃・溜め・Entry | 既存のまま | — | — | — | — | — | **duck 0・新 SE 0** | | | |

新定数（`feelTier.ts` の `SOUND_LAYER`・音だけの係数。既存の時刻定数は import して引き算するだけ）：`burstRiseLeadMs 1,150`／`enemyRiseLeadMs 1,060`／`duckTailMs 300`／`duckRampInMs 60`／`duckRampOutMs 300`／`duckReleaseMs 120`／`duckLevel 0.12/0.35`／`jingleResumeFadeMs 400`。

### 2-2. gain 表（実効＝係数 × master 0.85）

| SE | 係数 | 実効 | 比較 |
|---|---|---|---|
| `burst_ready`（既存） | stateChange 0.65 | 0.5525 | 不変 |
| **`burst_rise`（新）** | **rise.burst 0.7** | **0.595** | ≤ 0.8×master（0.68）・`hit_l4`（0.85）未満＝着弾が最大のまま |
| `hit_l4`（既存） | impact[4] 1.0 | 0.85 | 不変 |
| `enemy_turn`（既存） | warning 0.5 | 0.425 | 不変 |
| **`enemy_rise`（新）** | **rise.enemy 0.75** | **0.6375** | ≤ 0.68・`self_hit_heavy`（0.85）未満。低域は聴感上小さいため burst より +0.05 |
| `self_hit_heavy`（既存・必殺） | impact[4] 1.0 | 0.85 | 不変 |
| BGM（既存） | `volume 0.35` × GainNode 1.0 | 0.35 | duck 中のみ × 0.343 ＝ **0.12**（1/3） |

### 2-3. duck 曲線（GainNode・相対値）

```
1.000 ┐                                         ┌──────
      │\                                       /
      │ \ 60ms                         300ms  /
0.343 │  └───────────────────────────────────┘
      0  60                           1,900  2,200   (God Strike, ms)
      0  60                           1,560  1,860   (Enemy Ultimate special)
```

## §3 fallback 表

| 状況 | SE（rise） | BGM duck | 例外 | 入力ロック | ゲーム結果 |
|---|---|---|---|---|---|
| 音 OFF（`setSoundMuted(true)`） | 鳴らない（既存 `playBuffer` の muted） | BGM も `setBgmMuted(true)` → duck しない | 0 | 不変 | 不変 |
| BGM だけ鳴っていない（未再生・自動再生拒否・pause 中・ジングル中） | 鳴る | attach しない／何もしない | 0 | 不変 | 不変 |
| AudioContext 不可（`window.AudioContext` 無し） | 鳴らない（既存） | `getAudioContext()` が null → 何もしない | 0 | 不変 | 不変 |
| AudioContext suspended（初回 gesture 前） | 既存どおり resume を試みる | attach しない（BGM を無音にしないため） | 0 | 不変 | 不変 |
| `createMediaElementSource` 失敗 | 鳴る | `graphFailed` で以後 duck 無し・BGM は element 直出力のまま | 0（try/catch） | 不変 | 不変 |
| wav 取得・デコード失敗 | rise は fallback tone を持たない（無音。重要度が低い装飾のため） | 通常どおり | 0 | 不変 | 不変 |
| reduced motion | 鳴る（音は motion ではない）・時刻不変 | 通常どおり | 0 | 不変 | 不変 |
| 連続発火（一撃→必殺・Retry 連打） | 各 1 回（30ms dedup） | `duckUntil` を max で合流・unmount で 120ms 復帰 | 0 | 不変 | 不変 |

## §4 変更ファイル一覧（予定）

| ファイル | 内容 |
|---|---|
| `scripts/gen-se.mjs` | `burst_rise`・`enemy_rise` の数式（末尾に追加＝既存 20 本の乱数列は不変）／`--only` と `SE_OUT` で「新規 2 本だけ書き出す」 |
| `public/assets/se/burst_rise.wav`・`enemy_rise.wav` | 新規 2 本（≤1.0s・各 ≤60KB） |
| `src/components/battle/feelTier.ts` | `SE_GAIN.rise`・`SOUND_LAYER`・純関数 `planSoundLayer` |
| `src/components/battle/sound.ts` | `SeName` +2・`sfx.burstRise`／`sfx.enemyRise`・`getAudioContext` export・SE ノードの `onended` 後 disconnect |
| `src/components/battle/bgm.ts` | GainNode 経路（lazy attach）・`duckBgm`／`releaseBgmDuck`・ジングル後のフェードイン |
| `src/components/battle/useBattleSound.ts` | `planSoundLayer` → rise と duck を既存の計画時刻に載せる・unmount で `releaseBgmDuck` |
| テスト | `soundLayer.test.ts`（新）・`sound.test.ts`（SE 数 20→22） |
