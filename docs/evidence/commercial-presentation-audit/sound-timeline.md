# 音の時系列表（1 戦・机上復元）— Production `3dd8b5c`（runtime `a611270`）

復元元【実測】：`src/components/battle/sound.ts`（SeName 20・`sfx` API 265-305）／`feelTier.ts:33-55`（`SE_GAIN`・dedup 30ms）／`useBattleSound.ts`（イベント→音）／`combatTimeline.ts`（着弾時刻）／`enemyVfxTiming.ts`（定数）／`useCombatPresentation.ts:143-166`（勝敗）／`BossEntrance.tsx:31-36,134-135`（入口 SE）／`bgm.ts`（BGM・ジングル）／`GameFlow.tsx:123`（track 切替）。
WAV の尺＝(bytes−44)/44,100（22.05kHz・16bit・mono）【実測 `file`＋stat】。gain＝係数 × master 0.85。

## 1. SE inventory（20 本・計 337,372B・すべて `scripts/gen-se.mjs` 数式合成・権利 ◎）

| SeName | bytes | 尺 (ms) | 呼び出し（`sfx.*`） | gain（実効） | rate |
|---|---|---|---|---|---|
| card_play | 2,690 | 60 | cardTap／endRoundTap | 0.34 | 1.0／0.85 |
| card_draw | 4,896 | 110 | cardDrawn | 0.204 | — |
| divination | 12,834 | 290 | divination | 0.442 | — |
| hit_l1 | 5,336 | 120 | damageEnemy(1) | 0.383 | — |
| hit_l2 | 7,542 | 170 | damageEnemy(2) | 0.51 | — |
| hit_l3 | 11,510 | 260 | damageEnemy(3) | 0.68 | — |
| hit_l4 | 25,622 | 580 | damageEnemy(4)＝神の一撃・撃破 | 0.85 | — |
| self_hit | 6,660 | 150 | damageSelf／enemyMultiHit(0,1) | 0.51 | 1.0／1.06 |
| self_hit_heavy | 18,566 | 420 | damageSelf(heavy)／enemyMultiHit(≥2)／enemySpecialImpact | 0.68／0.68／0.85 | — |
| block | 4,014 | 90 | block | 0.408 | — |
| heal | 19,448 | 440 | heal | 0.442 | — |
| resonance_gain | 6,660 | 150 | resonanceGain／**godDescend（決定254）** | 0.255／0.5525 | 1.0／**0.8（≈188ms）** |
| burst_ready | 18,566 | 420 | burstReady | 0.5525 | — |
| evolve | 28,710 | 650 | otomoEvolve | 0.5525 | — |
| enemy_turn | 6,660 | 150 | enemyTurn | 0.425 | — |
| enemy_charge | 22,094 | 500 | enemyCharge | 0.425 | — |
| boss_entrance | 42,380 | 960 | bossEntrance | 0.765 | — |
| reward | 22,536 | 510 | reward／**bonusPayoff（決定224）** | 0.595 | 1.0／1.5（≈340ms） |
| victory_sting | 39,734 | 900 | victory | 0.612 | — |
| defeat_sting | 30,914 | 700 | defeat | 0.5525 | — |

Voice：**0**。`SeName` に voice 系なし（`sound.ts:34-55`）。

## 2. BGM・ジングル（`public/assets/bgm/`・Suno・台帳 △）

| track | webm | mp3 | 再生 | 音量 | 切替 |
|---|---|---|---|---|---|
| home | 1,650,886 | 2,910,294 | `HTMLAudioElement` loop | `volume 0.35`（`bgm.ts:14,82`） | `inBattle` の真偽で `src` 差し替え（`bgm.ts:112-115`・`GameFlow.tsx:123`）＝クロスフェード 0 |
| battle | 1,945,366 | 3,735,973 | 同上 | 0.35 | 戦闘 mount と同時（入口の暗転 0ms で即切替） |
| victory | 1,829,426 | 3,356,988 | ジングル（1 回） | 0.5（`bgm.ts:15`） | `bg.pause()`→再生→終了／9,000ms でフェード 500→`bg.play()`（`bgm.ts:163-205`）。BGM 側はフェードイン 0 |
| defeat | 1,727,978 | 3,026,278 | 同上 | 0.5 | 同上 |

- iOS Safari：`HTMLMediaElement.volume` は JS から設定不可（SOUND_PREMIUM §R5【docs・要実機】）→ iPhone では BGM 1.0 で鳴っている可能性。duck を `volume` で実装しても iPhone では効かない
- 動画 `god-strike-v2.mp4` は `muted`・`defaultMuted`（`godStrikeVideo.ts:67-70`）＝音声トラック不使用

## 3. 時系列（代表：大耀 × 蒼海の龍神・ふつう・セッション最初の 1 戦・God Strike あり・勝利）

t は各フェーズの基準（入口＝root animation 開始、カード＝タップ、バッチ＝commit）。「—」は SE 無し（BGM 0.35 のみ）。

### 3-1. 入口 Full（決定254・`BossEntrance.tsx:33`）

| t (ms) | 画面 | SE | 備考 |
|---|---|---|---|
| 0 | 暗転・BGM home→battle 即切替 | （開幕ドロー `CARD_DRAWN`×5 → `card_draw` 同時刻 5 本 → dedup で **1 本**【推測：log の先頭に初期手札が入るため mount 時に鳴る】） | 暗転の裏で紙音 1 回 |
| 250 | 神紋 | `resonance_gain`×0.8（188ms・0.55） | |
| 438〜1,500 | 神降臨「大耀 降臨」 | **—（1,062ms）** | 神の降臨そのものに音が無い |
| 1,500 | 舞台・敵の顕現 | `boss_entrance`（960ms・0.765） | |
| 2,400 | 操作可 | — | |
| 2,460〜 | HUD 開示・思考 | — | 思考時間は設計上無音（BGM のみ） |

Short：100 神紋／450 顕現／1,150 操作可。reduced：0／150／720。

### 3-2. 通常カード（L1・一撃）

| t | 画面 | SE |
|---|---|---|
| 0 | タップ（決定233） | `card_play`（60ms・0.34） |
| 60〜370 | ゴーストが神へ飛ぶ・commit 280 | **—（310ms）** |
| 370 | 着弾（commit+90）・stop 30・数字 | `hit_l1`（120ms・0.38） |
| 490〜 | トースト 1.4s・ミニ結果・HP ゴースト | — |

重い札（tier≥3）：着弾 commit+150＝430・`hit_l3`（260ms）。⚡：本体+150 に `reward`×1.5（≈340ms・0.595）。
守り札（GUARD）：commit に `block`（90ms・0.41）＋神の brace（決定249）。回復：`heal`（440ms）。共鳴：`resonance_gain`（150ms・0.255）。

### 3-3. ラウンド終了 → 敵の通常攻撃（龍神・heavy＝突進の最前 228ms）

| t | 画面 | SE |
|---|---|---|
| 0 | 押下 | `card_play`×0.85（60ms・0.34） |
| commit（≈700【docs：SOUND §2】） | 「⚔ 敵のターン」バナー・突進 | `enemy_turn`（150ms・0.425）＋ラウンド開始ドロー `card_draw`×2→dedup 1 |
| commit+228 | 被弾（stop 0〜40） | `self_hit`（150ms・0.51） |
| 〜+800 | 神の被弾反応・HP | — |

### 3-4. 敵必殺（龍神 R4「大海嘯」20＝決定252）

| t（commit） | 画面 | SE |
|---|---|---|
| 0 | バナー・**敵カットイン開始**（`ENEMY_CUTIN_TOTAL_MS` 1,050） | `enemy_turn`（150ms・0.425） |
| 150〜1,260 | カットイン（名前・🔥 200・フラッシュ）→ 突進（`enemy-lunge-delay-cutinend`）→ ビーム | **—（1,110ms）** |
| 1,260 | 着弾（`SPECIAL_IMPACT_MS`） | `self_hit_heavy`（420ms・**0.85**＝impact[4]） |
| 1,680〜 | 神の被弾・HP ゴースト | — |

連撃＋必殺（魔獣「双牙乱撃」）：カットイン 1,100 先行 → 1,100／1,280／1,600 に `self_hit`／`self_hit`／`self_hit_heavy`（rate 1.0／1.06／1.12）。
溜め（charge）：`enemy_charge`（500ms・0.425）のみ・突進なし。

### 3-5. 神の一撃（共鳴 7/7・`enemyVfxTiming.ts:81-106`・決定250 動画あり）

| t（commit） | 画面 | SE |
|---|---|---|
| −280 | タップ | `card_play` |
| 0 | 到達反応・ロック・採用判定 | `burst_ready`（420ms・0.5525）＋`resonance_gain`（+1 なら同時）＋札の他の音（block 等） |
| 200 | カットイン mount・ポスター→動画 1.2s（無音） | — |
| 420〜1,600 | 集中線・帯・「神の一撃」・動画（砲口の光→発射→白フラッシュ）・1,100 ロック解除＋バナー「✨ 大耀の一撃！」・1,300 突き・1,400 動画 ended | **—（1,180ms）** ← 本監査で最大の無音区間 |
| 1,600 | 着弾（stop 80・52px・揺れ 5px） | `hit_l4`（580ms・0.85） |
| 2,180〜2,500 | バナー終了 | — |
| 2,500 | 進化バナー「🌱」（該当時） | `evolve`（650ms・0.5525） |

BGM：全区間 0.35 のまま（duck 0）。

### 3-6. 勝利（最後の一撃 L4・`planVictory`）

| t（commit） | 画面 | SE／BGM |
|---|---|---|
| 370（例） | 最後の一撃（tier 4 上書き・stop 90） | `hit_l4`（580ms） |
| 630 | 敵フラッシュ→崩壊 520ms | — |
| 1,010 | 「撃破」拍・勝利の舞台（決定226） | `victory_sting`（900ms・0.612）＋`playJingle('victory')`：**battle BGM `pause()` 即停止**・ジングル 0.5（先頭 ≈5s は静かなイントロ【docs：SOUND §1-2】） |
| 1,860 | 報酬 | `reward`（510ms） |
| ≤10,010 | ジングル終了（自然 ended か 9,000+500 フェード） | **battle BGM が 0.35 で即再開**（フェードイン 0）・結果画面の間ずっと戦闘曲 |
| Home 復帰 | — | `src` を home へ即切替 |

### 3-7. 敗北（龍神 R4 必殺で敗北の例）

| t（commit） | 画面 | SE／BGM |
|---|---|---|
| 1,260 | 被弾（stop 40） | `self_hit_heavy` 0.85 |
| 1,970（=1,260+40+90+120+340+120） | 帳票モーダル即出し（舞台なし） | `defeat_sting`（700ms・0.5525）＋`playJingle('defeat')`（BGM 即停止） |
| 〜 | 結果 | ジングル後に battle BGM 再開 |

## 4. 無音区間（SE 無し・BGM のみ）の集計【机上】

| 区間 | 長さ | 1 戦あたり回数（Lane1 実測の発動率を前提） | 性格 |
|---|---|---|---|
| 入口 Full の神降臨（438〜1,500） | 1,062ms | 1（セッション初回のみ） | 儀式に音が無い |
| **神の一撃カットイン（420〜1,600）** | **1,180ms** | 通常 ≈0.55／hard ≈0.72／神階 ≈0.75〜0.80 | 最高額の asset（動画）が無音 |
| **敵必殺カットイン（150〜1,260）** | **1,110ms** | 7 敵中 6 体で 1（魔獣は連撃型・道化 R6 ≈35% で 2 回目） | 最大の脅威が無音 |
| タップ→着弾（60〜370／430） | 310〜370ms | 10〜16 | 設計どおり（溜め） |
| 思考時間 | 任意 | 7 ラウンド | 設計どおり |
| ジングル→BGM 再開の段差 | 0ms（即） | 1 | フェード 0 |

## 5. 重なり（dedup・duck）

- dedup：`name@rate` が 30ms 未満で重なる 2 本目以降は鳴らさない（`sound.ts:143-145`・`feelTier.ts:55`）。開幕ドロー×5・ラウンド開始×2・共鳴+2 は 1 本に圧縮（決定233）
- 7/7 の commit：`burst_ready`＋`resonance_gain`＋（block／heal 等）が同時刻＝名前が違うので dedup 対象外。合計 gain は決定233 以前の 2.08 から下がったが実測値は未更新【docs：SOUND §0 目標 ≤1.4】
- duck：**0**。BGM `volume` は固定（`bgm.ts:82`）。ジングルのみ `pause()` 方式
- Voice を足す場合：新 `SeName`（例 `voice_taiyo_burst`）は独自キー＝既存 dedup と衝突しない。gain は `stateChange 0.65` と `impact[4] 1.0` の間（案 0.8）＝`hit_l4` を超えない
