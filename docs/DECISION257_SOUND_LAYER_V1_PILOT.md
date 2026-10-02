# 決定257 God Strike / Enemy Ultimate Sound Layer v1 — Pilot

- 起点：master `fbc06c9`（runtime `a611270`＝決定254 LIVE）／branch `feat/d257-sound-layer-v1`／worktree `SevenGodsGame-d257`
- 判定者：【Dev】＋【Designer】（AI 判断・CLAUDE.md §6-2「軽微な演出調整」）。CEO 承認済みの方向性（Lane 3 監査 §5）に沿った Pilot
- 根拠：`docs/COMMERCIAL_PRESENTATION_AUDIT.md` §4〜§5・`docs/evidence/commercial-presentation-audit/sound-timeline.md`（無音区間：神の一撃 1,180ms／敵必殺カットイン 1,110ms・duck 0）

## §0 結論

**FAST GATE PASS → HUMAN QA READY**（AI 判断・Production deploy／push／merge 0）。Before :4281＝Production dist（`index-ePtASz7H.js` md5 `2a5bd4fc…`）／After :4282＝本 branch の dist（`index-BD0q8Mf-.js`）。

- 経緯：1 回目の全件計測はメモリ不足で停止（`gate-partial-killed.log.txt`）。計測を「1 run ＝ 1 プロセス・run ごとに JSON 保存」に作り直し（`drive257.mjs.txt`／`gate257.mjs.txt`）、28 run を直列で完走
- 計測側の修正 3 点（runtime 変更 0）：①入力ロック反復は 5R 打切りで一撃前に終わっていた → 7R ②Retry は勝利後の「報酬カードを選ぶ」で止まっていた → 報酬スキップ →「同じ構成でもう一度」③演出中のクリックが落ちて Before/After の手数がずれる揺らぎ（決定254 と同種）→ 手札の減少を確認して再押下。揺らいだ 2 組（道化 PC・Retry）は Before/After とも同じ手順で取り直し（旧結果は `runs-flaky/` に保存）
- SE 列の比較は開幕の `card_draw`（wav ロード待ち >400ms で鳴らさない既存ロジックで有無が揺れる）を除外し、予約遅延は AudioContext.currentTime の読み取り粒度 ±11ms を許容

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
| **`burst_rise`（新）** | **`SOUND_LAYER.riseGain.burst` 0.7** | **0.595** | ≤ 0.8×master（0.68）・`hit_l4`（0.85）未満＝着弾が最大のまま |
| `hit_l4`（既存） | impact[4] 1.0 | 0.85 | 不変 |
| `enemy_turn`（既存） | warning 0.5 | 0.425 | 不変 |
| **`enemy_rise`（新）** | **`SOUND_LAYER.riseGain.enemy` 0.75** | **0.6375** | ≤ 0.68・`self_hit_heavy`（0.85）未満。低域は聴感上小さいため burst より +0.05 |
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

## §4 変更ファイル一覧（実績：`git diff --stat fbc06c9` src／scripts／public＝9 files +558／−9）

| ファイル | 内容 |
|---|---|
| `scripts/gen-se.mjs` | `burst_rise`・`enemy_rise` の数式（末尾に追加＝既存 20 本の乱数列は不変）／`--only` と `SE_OUT` で「新規 2 本だけ書き出す」 |
| `public/assets/se/burst_rise.wav`・`enemy_rise.wav` | 新規 2 本（≤1.0s・各 ≤60KB） |
| `src/components/battle/feelTier.ts` | `SOUND_LAYER`（rise の音量・duck 係数）・純関数 `planSoundLayer` |
| `src/components/battle/sound.ts` | `SeName` +2・`sfx.burstRise`／`sfx.enemyRise`・`getAudioContext` export・SE ノードの `onended` 後 disconnect |
| `src/components/battle/bgm.ts` | GainNode 経路（lazy attach）・`duckBgm`／`releaseBgmDuck`・ジングル後のフェードイン |
| `src/components/battle/useBattleSound.ts` | `planSoundLayer` → rise と duck を既存の計画時刻に載せる・unmount で `releaseBgmDuck` |
| テスト | `soundLayer.test.ts`（新）・`sound.test.ts`（SE 数 20→22） |

## §5 Fast Gate 結果（`docs/evidence/decision257/gate.json` から転記）

| # | 項目 | 結果 | 判定 |
|---|---|---|---|
| 1 | 静的 | tsc 0／oxlint 0（src 0・既存の scripts 警告のみ）／vitest **1,303 PASS**（1,289＋14・skip 9）／build OK | PASS |
| 1 | bundle | JS 453,199→455,809B（**+2,610B**／gzip +773B）・CSS md5 同一 `1ac53796…` | 記録 |
| 1 | gameVersion golden | `src/core` diff 0 行・golden テスト（useReactionLanguage／gameVersion）PASS | PASS |
| 2 | METRIC LOCK | 11 組（3 seed × PC1508／SP390×844 ＋ SP390×660・reduced・音 OFF・AudioContext 無し・Retry）**242 行 不一致 0**・最終スコア同一 | PASS |
| 3 | God Strike（7 回） | `burst_rise` **T+450**（実効 gain 0.595）／`hit_l4` **1,600**（不変）／duck 開始 **11ms**（中央値。21・53 は計測側サンプラーの遅れ）・最低 **0.3429**（実効 0.35→**0.12**）・復帰開始 **1,909**・復帰完了 **2,208**・復帰後 **1.0**（7/7） | PASS |
| 3 | Enemy Ultimate（9 回） | 鬼将 R4 業斧・断岩：`enemy_rise` commit+189〜233（ブロックで着弾音なし）／道化 R3 乱舞・狂宴：+200・着弾 1,260／魔獣 技名付き連撃：+40・着弾 1,280／1,600。duck 開始 11ms（中央値）・最低 0.3429・復帰開始 1,568（連撃 1,909）・復帰後 **1.0**（9/9）。復帰完了は 1,867（連撃 2,208）。鬼将 2 回の 1,931／2,208 はサンプラーの遅れ（その後の値は 1.0） | PASS |
| 3 | Normal card／通常の敵 | duck の谷の数＝一撃＋必殺の数（全 run 一致）・新 SE の数も一致・Before の duck 0 | PASS |
| 3 | Entry | 神紋→顕現の SE 間隔 Before/After：1,250/1,247・1,248/1,248・1,254/1,251・1,252/1,204・1,250/1,248・1,246/1,248・1,249/1,250（reduced 117/149）＝最大差 **48ms**（≤50）・入口中の duck 0 | PASS |
| 3 | Retry（勝利→報酬スキップ→「同じ構成でもう一度」2 連打） | 新しい戦闘の R1 に入り、BGM gain **1.0**・以後の dip 0（残留 0）・error 0 | PASS |
| 3 | Reduced Motion | SE 列 Before/After 同一・rise T+450／着弾 1,600 不変・error 0 | PASS |
| 3 | 音 OFF（App のミュート） | SE 0・GainNode 経路 作られない・7R 完走・lock 一致・error 0 | PASS |
| 3 | AudioContext 無し | SE 0・duck 0・7R 完走・lock 一致・error 0 | PASS |
| 4 | duplicate SE | 0（全 run・同名同 rate 30ms 未満の重なり 0） | PASS |
| 4 | orphan AudioNode | 全 After run で BufferSource 生成数＝ended 数、disconnect＝2×ended（例 80／80／160）。duck 用 GainNode は 1 本だけ（イベントごとの生成 0） | PASS |
| 4 | console error／横スクロール | 0／0（28 run） | PASS |
| 4 | 入力ロック時間（一撃の burst_ready→カード再有効化・各 3 回） | Before 1,367／1,275／1,687・After 1,366／1,338／1,721 → **中央値 1,367 vs 1,366（差 1ms）** | PASS |
| 4 | 着弾 1,600／stop 80 | `hit_l4` の予約 1,600（全 run）・時刻定数ファイル diff 0・定数テスト PASS | PASS |
| 5 | レイアウト箱（PC1508×660／SP390×844／SP390×660） | 戦闘開始時の全要素の layout box：差 **0**（138〜148 要素 × 11 組） | PASS |
| — | BGM の音量 | GainNode 経路の後も element volume が効く（RMS 比 0.38≈0.35・ミュート時 RMS 0）＝duck 以外の音量は Before と同じ | PASS |
| — | QA seed | `d257-qa1`（大耀×鬼将）：R4 業斧・断岩＋神の一撃（gate の手順で）／`d257-qa2`（大耀×道化）：R3 乱舞・狂宴＋神の一撃 | 確認 |

## §6 Human QA 手順と URL

- After（本 Pilot）：`http://192.168.11.6:4282/?seed=d257-qa1&enemy=oni`／`http://192.168.11.6:4282/?seed=d257-qa2&enemy=doukeshi`
- Before（Production）：`http://192.168.11.6:4281/?seed=d257-qa1&enemy=oni`／`http://192.168.11.6:4281/?seed=d257-qa2&enemy=doukeshi`
- PC は `http://127.0.0.1:4281`／`:4282` でも可。iPhone は同じ LAN から開く（ファイアウォールの一時許可が要る場合は scratchpad の `d257-fw-open.ps1`／`d257-fw-close.ps1` を CEO が管理者で実行。AI は実行していない）
- 手順：大耀・ふつうを選んで戦う。鬼将は R3 の溜め → **R4 業斧・断岩**、道化は R2 の仕込み → **R3 乱舞・狂宴**。共鳴を 7 まで溜めて**神の一撃**。音あり（ミュート OFF）で、Before と After を聞き比べる
- 質問（4/4 YES で PASS）：
  - Q1 神の一撃が以前より気持ちいいか
  - Q2 敵の必殺が以前より怖く感じるか
  - Q3 両者を音だけで区別できるか
  - Q4 BGM の duck や SE がうるさくないか

## §7 Known

1. 神の一撃が起きる時期はプレイ次第（gate は自動手順で R6〜R7 に発生）。Human QA では共鳴カードを優先すると早く溜まる
2. BGM が音量ノード経路に載った後は、AudioContext が suspended になると BGM も鳴らない。次の SE／`playTrack` で resume する設計（iOS の割り込み後に要確認）
3. 経路は初回の duck で作るので、作る瞬間（一撃・必殺の commit）に一度だけ出力経路が切り替わる。duck の ramp と `burst_ready`／`enemy_turn` に重なる時刻のため聴感上は目立たない想定（Human QA で確認）
4. iPhone は element volume を無視するため、BGM は従来どおり 1.0 で鳴り、duck は 1.0→0.343。音量の絶対値は Before と同じ（監査 R5 の「BGM が大きい」は本 Pilot の範囲外）
5. 計測：入力ロックは 1 回ごとのばらつきが大きい（headless の main thread 揺れ。1,275〜1,721ms）ため中央値で判定。duck 開始・復帰完了の一部外れ値は 4ms サンプラーが演出中に止まったもの（予約された自動化は決定論）
6. ジングル前の pause は従来どおり即時（フェードは再開側 400ms のみ）。先頭のフェードアウトは v2 候補

## §8 runtime 保護の証明

- `git diff fbc06c9 -- src/core`：**0 行**／CSS：**0**／画像：**0**
- `combatTimeline.ts`／`enemyVfxTiming.ts`／`battleEntrance.ts`：**diff 0 行**（定数テスト `soundLayer.test.ts` でも 900／1,300／1,600／80／1,050／1,260／1,100 を固定）
- gameVersion golden：変更なし（`src/core` 0 行・関連テスト PASS）
- METRIC LOCK 242 行 不一致 0（GameState・スコア・Intent・結果が Before と同一）
- 既存 SE 20 本の wav md5 不変（`se-md5-before.txt`／`se-md5-after.txt`）
- push／deploy／merge 0・`docs/DECISIONS.md` 編集 0

## §9 CEO Human QA

- 判定：**PASS（4/4 YES）**・2026-10-02・CEO・PC＋iPhone（Before :4281＝Production dist／After :4282）
- Q1 神の一撃が以前より気持ちいいか：**はい**
- Q2 敵の必殺が以前より怖く感じるか：**はい**
- Q3 両者を音だけで区別できるか：**はい**
- Q4 BGM の duck や SE がうるさくないか：**はい**
- 次：Production Release Gate（CEO 承認）
