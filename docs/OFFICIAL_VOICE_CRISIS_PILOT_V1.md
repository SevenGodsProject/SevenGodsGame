# Official Voice Crisis Pilot v1 — 大耀「ピンチ」（SGG Creator Kit v1.1 公式ボイス・2 本目）

- 日付：2026-10-21（Lane 3「公式ボイス」・Infra＋Dev・**AI 判断**（CLAUDE.md §6-2）・CEO 決定282 に基づく次期開発。設計は `docs/OFFICIAL_VOICE_EXPANSION_AUDIT_V1.md` §5・§6 のとおり）
- 状態：**v1.0.5 追従済み（merge `a96a409`・conflict 0・crisis 実装 不変）— Automated Gate PASS（2026-10-30・§5-2：tsc 0・targeted 60/60・full vitest 1,611・build・G-B 8/8 ALL PASS・着弾 +300ms 実測 296〜299ms）— CEO iPhone Human QA 4/4 PASS（2026-10-31・§7-2）— 実装 GO・統合候補**（master／RC merge・push・tag・deploy は未実施。iOS サイレントスイッチ・Safari 復帰は未確認）
- worktree／branch：`SevenGodsGame-voice-pilot`／`feat/official-voice-crisis-pilot-v1`（基点 `release/v1_0_2-rc` **`ba0af34`** → 2026-10-30 に Production v1.0.5 master **`a96a409`** を merge）
- 前提：`docs/OFFICIAL_VOICE_PILOT_V1.md`（大耀「あいさつ」・CEO Q8 3／3 PASS）／`docs/OFFICIAL_VOICE_EXPANSION_AUDIT_V1.md`（本 branch へ同一バイトでコピー・lane3v 側は未変更）／`docs/DECISION257_SOUND_LAYER_V1_PILOT.md`（duck 経路）
- 不変：**`src/core` 差分 0**（`git diff --stat release/v1_0_2-rc -- src/core`＝空。ゲーム規則・ダメージ・AP・敵・神・スコア・Seed・PRNG・save 不変）／既存 22 SE・BGM 音源・既存 greeting の時刻と挙動 不変／`docs/DECISIONS.md` 未編集（統合時に PM が 1 行追記）
- 禁止事項の遵守：取得した音声は **1 本のみ**（他 26 本は取得していない）・加工 0・full vitest／build／preview 起動 0・push／merge／tag／deploy 0・他 worktree 編集 0

---

## 0. 結論表

| # | 問い | 結論 |
|---|---|---|
| 0-1 | 何を足したか | **大耀の戦闘で、自分の HP が最大の 50%（`RULES.cardBonus.lowHpRatio`）以下に初めて落ちたバッチの「最後の自分への着弾 ＋300ms」に、大耀の公式ボイス「ピンチ」（8.86 秒）を 1 戦 1 回鳴らし、その間だけ BGM を下げる** |
| 0-2 | 素材 | Kit MCP `get_voice`（`taiyo-god`・`crisis`）→ `voice/v1/taiyo/taiyo-crisis.mp3`・142,893B・sha256 `3df318eda81d94bf1fdb99ac609026cdb4aa7c873c7ea30e59056d3ca5140098`＝監査 v1 §2-2 の値と一致・**原本＝配信＝MCP の 3 者一致**。台帳 **VOICE-KIT-08**（KNOWN ◎） |
| 0-3 | 尺（実測） | **8.858 秒**（MP3 フレーム走査からの `decodeAudioData` 相当＝(427,392 samples − encoder delay 576 − padding 1,618) ／ 48,000。同じ式で greeting は 11.783s＝Pilot v1 の Chromium 実測と一致）。監査 v1 の推定 8.9s と整合。CBR 128kbps・48kHz・mono・371 audio frames |
| 0-4 | 既存 greeting への影響 | **無し**（時刻・経路・音量・1 戦 1 回・skip 時の挙動は不変）。変わるのは `stopVoice` に `fadeMs` 引数が付いたこと（既定 0＝従来どおり即時）と、`playVoice` が優先度を見るようになったこと（greeting は何も鳴っていない入口直後に鳴るため常に 'play'） |
| 0-5 | 新規コード | runtime 4 ファイル（`feelTier.ts` 数値 4 項目・`sound.ts` 優先度／フェード／場面別 drop／神単位キャッシュ解放・`crisisVoice.ts` 純関数＋フック・`BattleScreen.tsx` import＋先読み 1 行＋フック呼び出し 1 行）。数値はすべて `VOICE_LAYER` に閉じる |
| 0-6 | テスト | `officialVoice.test.ts` 16（範囲 2 本・sha256 配信＋原本・優先度・フェード・場面別 drop・配線）／`crisisVoice.test.ts` 15（閾値・トリガ純関数・`planBatch` 結合：通常 458／必殺 1,560／連撃 1,900／自傷 390・決着除外）／`creditsScreen.test.ts` 17（禁止語維持・「大耀の音声（あいさつ・ピンチ）」）＝**48／48 PASS**・`tsc -b` 0 error |
| 0-7 | CEO 判断 | **不要**（§6-2：既存仕様の範囲・素材は Kit 公式・規約 §5 内・`src/core` 0）。Production 公開時のみ §6-3 #8。Human QA 3 問（§7）で GO／NO-GO |

---

## 1. 仕様（実装どおり）

| 項目 | 内容 | 根拠 |
|---|---|---|
| 対象 | 大耀（`taiyo`）× `crisis` の 1 本のみ。`OFFICIAL_VOICES` は `taiyo: { greeting, crisis }` の 2 エントリ | 監査 v1 §6-1 |
| 閾値 | `crisisThresholdHp(maxHp) = floor(maxHp × RULES.cardBonus.lowHpRatio)`（0.5）。ふつう 30→**15**／やさしい 35→**17**／むずかしい 27→**13**。条件⚡「HP が最大の 50% 以下」と同じ定義・**新しい数値は作らない** | `rules.ts` 既存値 |
| トリガ | バッチ前の HP が閾値より大きく、バッチ後の HP が閾値以下（敵の攻撃・連撃・必殺、自分のカードの自傷のどれでも）。**決着バッチ（`outcome` won／lost／finished）は除外**（敗北は `defeat_sting`＋ジングルの領分） | `crisisVoice.ts` `planCrisisVoice` |
| 時刻 | 最後の自分への着弾（`amount > 0` の `target: 'self'` step の最大 `atMs`）＋ `VOICE_LAYER.afterImpactMs.crisis`（300＝`SOUND_LAYER.duckTailMs`）。通常攻撃 158／105／228 → **458／405／528**・敵必殺 1,260 → **1,560**・魔獣連撃 1,600 → **1,900**・自傷 90 → **390**。自分への着弾が無いのに下がった想定外のバッチは commit＋300 | `combatTimeline.planBatch` の時刻をそのまま使う（時刻表の変更 0） |
| 1 戦 1 回 | フック内 `firedRef`（seed が変わる・ログ巻き戻しでリセット）。回復して再び落ちても鳴らない。「続きから」で既に 50% 以下なら鳴らない（`prevHp` が閾値以下） | `useCrisisVoice` |
| 1 チャネル・優先度 | `VOICE_LAYER.priority = { greeting: 1, crisis: 2, success: 3, fatigue: 3 }`。`resolveVoiceContention(active, next)`：鳴っている声より低い場面は **drop**（捨てる・キューしない）、同じ以上は **replace**（前の声を `stopFadeMs` 80ms で 0 へ ramp してから `stop`）。要求時と取得完了後の 2 回判定 | 監査 v1 §5-2 |
| 場面別 lateDrop | `voiceLateDropMs(scene)`：crisis **800ms**・他は共通 1,500ms。先読み済みなら即時（`requestedAt` は予約タイマー発火時） | 同上 |
| 先読み | 入口開始（`battleStartKey` 増分）で `releaseVoiceCacheExcept(godId)` → `preloadVoice(godId,'greeting')` → `preloadVoice(godId,'crisis')`（+143KB・遅延ロード）。他神の decode 済み PCM を捨てる（1 神分 ≈ 4〜6MB に抑える） | 監査 v1 §5-3 |
| BGM duck | `onStart(ms)` で `duckBgm(ms + VOICE_LAYER.duckTailMs)`＝決定257 の GainNode 経路。敵必殺の duck（着弾＋300 まで）と `duckUntil = max` で**合流**（復帰ランプを挟まない）。新しい経路 0 | `bgm.ts` |
| ミュート | `sound.ts` の `muted` 共有（新規再生・先読みしない。`setSoundMuted(true)` で鳴っている声は即時停止） | 既存 |
| unmount | `BattleScreen` の `stopVoice()`（既存）＋ フックの `clearTimer()`（予約解除） | 既存＋新規 |
| reduced-motion | 無関係（時刻は `planBatch` の `reduced` を useBattleSound と同じく渡すだけ。声の有無は変えない） | — |
| 音量 | `VOICE_LAYER.gain` 0.8 × master 0.85＝0.68 据え置き（場面別の差は付けない） | 監査 v1 §5-1 |
| 表示 | UI 追加 0。credits 1 文を「大耀の音声（あいさつ・ピンチ）」の事実文へ（禁止語「公式ボイス／公式の声／神の音声」は維持） | 監査 v1 §5-4 |

補足（語の解釈）：指示文の「敵 HP 比が初めて…以下になった敵ターン」は、監査 v1 §4-D／§6-1 の定義（**自分の HP** が最大の 50% 以下に初めて落ちたバッチ・敵ターンの最後の着弾＋300ms）として実装した。自傷で割った場合も同じ規則で鳴る（§4-D「敵の攻撃・自傷どちらでも」）。

## 2. 変更ファイル（runtime 4・test 3・asset 2・docs 3・credits 1）

| 種別 | ファイル | 変更 |
|---|---|---|
| runtime | `src/components/battle/feelTier.ts` | `VOICE_LAYER` に `priority`／`stopFadeMs 80`／`sceneLateDropMs { crisis: 800 }`／`afterImpactMs { crisis: 300 }` |
| runtime | `src/components/battle/sound.ts` | `OFFICIAL_VOICES.taiyo.crisis`・`resolveVoiceContention`・`voiceLateDropMs`・`getActiveVoiceScene`・`releaseVoiceCacheExcept`・`stopVoice(fadeMs = 0)`・`playVoice` の優先度判定（2 回）と場面別 drop。`SeName`・22 SE・`sfx` は不変 |
| runtime | `src/components/battle/crisisVoice.ts`（新規） | `crisisThresholdHp`・`planCrisisVoice`（純関数）・`useCrisisVoice`（フック：`planBatch`→判定→`setTimeout`→`playVoice`＋`duckBgm`） |
| runtime | `src/components/battle/BattleScreen.tsx` | import 2 行・入口の先読みブロック（解放＋2 本）・`useCrisisVoice(log, state, enemyVisualType)` 1 行。`handleEntranceDone`（greeting）は不変 |
| credits | `src/components/setup/creditsText.ts` | 素材 1 行目「大耀の音声（あいさつ・ピンチ）」 |
| test | `src/components/battle/officialVoice.test.ts` | 範囲 2 本・sha256（配信＋原本）・優先度・フェード・場面別 drop・配線（先読み 2・解放 1・greeting 1・crisis はフック 1） |
| test | `src/components/battle/crisisVoice.test.ts`（新規） | 閾値・純関数・`planBatch` 結合・決着除外・全ブロック |
| test | `src/components/creditsScreen.test.ts` | 必須語を「大耀の音声（あいさつ・ピンチ）」へ（禁止語は不変） |
| asset | `audio-source/voice/taiyo/taiyo-crisis.mp3`・`public/assets/voice/taiyo/crisis.mp3` | Kit 原本（同一バイト列・142,893B） |
| docs | `docs/ASSET_RIGHTS_LEDGER.md` | §3-L に **VOICE-KIT-08**（CRLF 維持・予約 02〜07 と衝突しない）＋予約注記更新 |
| docs | `docs/OFFICIAL_VOICE_EXPANSION_AUDIT_V1.md` | lane3v からの同一バイトコピー（sha256 `3a170a78…`） |
| docs | 本書 | — |

## 3. 素材の取得記録（2026-10-21）

| 手順 | 結果 |
|---|---|
| Kit MCP `tools/call get_voice`（`id: taiyo-god`, `scene: crisis`） | HTTP 200。`key voice/v1/taiyo/taiyo-crisis.mp3`・`bytes 142893`・`sha256 3df318ed…`・`label ピンチ`・`voicePolicy`／`termsUrl` は 2026-10-09 と同文（監査 v1 §2-1） |
| 取得（`url` から 1 本のみ） | 142,893B・sha256 **一致**（監査 v1 §2-2・MCP 返答） |
| 配置 | `audio-source/voice/taiyo/taiyo-crisis.mp3`（原本）＝`public/assets/voice/taiyo/crisis.mp3`（配信）・`cmp` 同一 |
| 尺 | ffprobe 不在のため Node で MP3 フレーム走査：ID3v2.4（45B・TSSE `Lavf62.12.100`）→ Info frame（`Lavc62.28`・frames 371・delay 576・padding 1,618）→ audio 371 frames × 1,152 ＝ 427,392 samples ＠48kHz・CBR 128kbps・mono。**decodeAudioData 相当 8.858s**（素 8.904s）。Chromium 実測は Gate の `acceptance.mjs` 拡張時に追記 |
| 他 26 本 | 取得 0（HEAD も 0） |

## 4. テスト・監査結果（本 worktree・2026-10-21）

| 項目 | 結果 |
|---|---|
| `npx tsc -b --noEmit` | **0 error** |
| `npx vitest run officialVoice.test.ts crisisVoice.test.ts creditsScreen.test.ts` | **3 files・48 tests PASS**（16＋15＋17） |
| `src/core` | 差分 **0**（`git diff --stat release/v1_0_2-rc -- src/core` 空） |
| sha256 | 原本＝配信＝MCP＝監査 v1 の 4 者一致 |
| 未実施（PM 直列） | full vitest・oxlint・build・Playwright（`acceptance.mjs` の crisis 拡張）・実機 |

## 5. Gate 案（PM が直列で回す）

| Gate | 内容 | PASS 条件 |
|---|---|---|
| G-A 自動 | full `vitest run`／`tsc`／`oxlint`／`vite build` | 既存件数＋31（officialVoice +6・crisisVoice +15 の新規／変更分。既存失敗 0）・build PASS・JS 増分 ≈ +1.5kB |
| G-B Playwright | `scripts/official-voice-pilot/acceptance.mjs` を拡張：蒼海の龍神（R4「大海嘯」20）で HP ≤ 50% に落ちる固定 seed、PC／SP × ミュート有無の 4 ケース | crisis の `AudioBufferSourceNode.start` が **1 回**・duration 8.858±0.05s・開始時刻＝最後の着弾＋300±50ms・duck ramp が「復帰 1.0 の予約の前に再 duck」＝合流（復帰ランプ無し）・greeting と同時に鳴らない・2 戦目以降は再トリガ 0・ミュート時 0・JS error 0 |
| G-C 実機 | iPhone（Safari）：BGM が下がる・ミュートで止まる・サイレントスイッチ ON 時の挙動（greeting と同じはず） | Human QA Q3 |
| G-D Human QA | §7 の 3 問 | Q1 YES ∧ Q2 YES ∧ Q3 YES → Production 候補（CEO §6-3 #8） |

### 5-1. G-B の実行コマンドと期待値（2026-10-22・Lane 3 Infra・スクリプト作成のみ。実行は PM が直列で）

**固定 seed の選定（engine 純関数・node 単体・200 seed ≈ 1.4 秒）**

```
node --import ./scripts/official-voice-pilot/ts-loader.mjs scripts/official-voice-pilot/crisis-seed.mjs <outJson> [--scan 200] [--seed crisis-003]
```

- `scripts/official-voice-pilot/ts-loader.mjs`（新規）：`combat-pilots-rc/ts-loader.mjs` の `.js→.ts` に加えて拡張子なしの相対 import（vite 流儀）を `.ts/.tsx/index.ts` へ振り替える resolve hook。Gate 専用・runtime 無関係
- `scripts/official-voice-pilot/crisis-seed.mjs`（新規）：大耀 × 蒼海の龍神（`?enemy=ryujin`）・UI 既定（おすすめデッキ・ふつう・guardian・報酬ボーナス無し）・方策「使える札を左から使う → 無くなったらラウンドを終える（託宣なし）」で 1 戦を回し、`planBatch`（visualType `heavy`）＋ `planCrisisVoice`（`crisisVoice.ts` を直接 import・同じ関数）でピンチの時刻を出す
- 走査結果（`crisis-001`〜`crisis-200`）：ピンチ発生 177／200・R3 69・R4 88・R5 17・R6 3。「R3〜R4 のラウンド終了で発生 ∧ その後にも決着でない HP 低下あり」の候補 87（R4 必殺 48・R3 通常 39）

| 候補 | 経路（ラウンド終了後 HP） | ピンチ | 後の低下 | 結果 | 採否 |
|---|---|---|---|---|---|
| **`crisis-003`（採用）** | R1 26 → R2 26 → R3 30 → **R4 大海嘯 20・ブロック 0・30→10** → R5 10→7 → R6 撃破 | R4 endRound・special・着弾 1,260 → **1,560** | R5 敵通常攻撃 3（10→7・playing） | won R6 | 閾値 15 を HP 満タンから一撃で割る＝台詞の文脈どおり。後の低下が敵攻撃（2 回目が鳴らないことの検証に最適） |
| `crisis-001`（代替 1） | R1 24 → R2 29 → R3 29 → R4 29→14 → R5 4 | R4 special → 1,560 | R5 自傷 14→12・敵 16 | won R6 | 同型。ブロック 5 で 15 ダメージ |
| `crisis-002`（代替 2） | R1 30 → R2 23 → R3 23→11 → R4 6 | R3 endRound・通常攻撃・着弾 228 → **528** | R4 敵 11→6 | won R6 | 通常攻撃（heavy 突進 228）側の時刻を見たいとき |

**受入（Playwright・PM が実行。preview 4173・Chromium headless・autoplay 許可）**

```
cd C:\Users\kimi1\SevenGodsGame-voice-pilot
npx vite build && npx vite preview --host 0.0.0.0 --port 4173        # 既存どおり（別ターミナル）
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/official-voice-pilot/acceptance.mjs <outJson> http://127.0.0.1:4173 [--only greeting|crisis]
```

- 既定は greeting 4 ＋ crisis 4 ＝ **8 ケース**（終了コード 0 ＝ allPass）。greeting 4 ケースの手順・計測フック・PASS 条件は Pilot v1 と**同一**（`HOOK` 不変。crisis は別フック `CRISIS_HOOK`）
- crisis の URL：`/?enemy=ryujin&seed=crisis-003`。神選択 → 大耀 → この構成で始める → **蒼海の龍神** → この構成でバトル開始。入口後、各ラウンド「押せる左端のカードを押す → 無くなったらラウンドを終える」を R5 まで。**R4 のラウンド終了だけは「あいさつ」が鳴り終わるのを待ってから押す**（Human play の間合い。二重再生の有無は別途 stop 記録から判定）
- 着弾時刻の標本：自分側の浮遊数字 `.player-panel .floating-number` の `animationstart`（`animation-delay`＝`planBatch` の着弾時刻 1,260）＝ 主判定。HP ラベル `.player-panel .hp-bar-label-text` の変化（MutationObserver。着弾＋hit stop 40＋HP_LAG 90）＝ 参考値 `deltaFromHpLabelMs`

| 判定 | crisis × 音あり（PC／SP） | crisis × ミュート（PC／SP） |
|---|---|---|
| (a) 取得・開始 | `taiyo/crisis.mp3` 要求 **1 回**（入口の先読み）・5 秒超 buffer start は greeting 1 ＋ crisis 1 ＝ **2**（crisis の duration 8.858±0.05s） | 要求 0・start 0（`/assets/voice/` 要求 0） |
| (b) 開始時刻 | `deltaFromFloatMs`＝声の start − "-200" の animationstart ＝ **300 ± 50ms** | — |
| (c) duck | 声の start の −50〜+200ms に `linearRamp` 値 < 1 → その後 1 へ。**合流**＝その再 duck の `ctxNow` が、必殺の duck が予約済みの「復帰 1.0」の `t` より前 | — |
| (d) 二重なし | 5 秒超 source の区間（start〜min(自然終了, stop)）の重なり **0ms** | — |
| (e) 1 戦 1 回 | R5 終了で HP 100→70（表示 ×10）まで進んで crisis start が **1 のまま** | 同じ HP 経路（音は engine に無関係） |
| 共通 | JS error 0・敵名「蒼海の龍神」・HP 経路 R1 260／R2 260／R3 300／R4 **100**／R5 70 が一致 | 同左 |

- 結果 json：`crisisMeasuredDurationSec`（Chromium `AudioBuffer.duration` 実測）を最上位に出す → 台帳 **VOICE-KIT-08** の実測欄へ転記。各ケースに `timing`（主／参考の両 delta）・`duck`（down／up／prevUp／merged）・`voiceIntervals`・`rounds`（押したカード名・HP ラベル）・浮遊数字／HP ラベル／ramp の全記録を残す
- 既知のリスク：Chromium の `setTimeout` 遅延（決定254 で ≈230ms の実測あり）が ±50 を超えた場合は (b) だけ FAIL する。その時は `deltaFromHpLabelMs` と `playerFloats` を見て「声が遅い」のか「標本が遅い」のかを切り分ける（声側の遅延なら `performance.now()` 基準への 1 行修正を検討＝決定254 の NEXT と同じ）

## 6. 既知の注意点

1. **台詞の内容は AI 未試聴**（文字起こしはしていない）。「ピンチ」の文脈と合うかは CEO が公式ページ（`https://sevengodsgames.com/creator-kit/`）で試聴して判断（コスト 0）
2. 声 8.9 秒は次ラウンドの思考に重なる（greeting 11.8s が R1 に重なるのと同型。CEO Q8-2 で許容済みだが戦闘中は注意資源が違う）
3. 次のカードで神の一撃が起きた場合、声の上に `burst_rise`＋`hit_l4` が乗る（声は止めない・duck は合流）。意図どおりだが Human QA で違和感を見る
4. 自傷で 50% を割った場合は R1〜R2 で greeting の最中に crisis が割り込む（80ms フェードで置き換え）。頻度は低い
5. iPhone の割り込み（着信・ロック）後の `AudioContext` は既知（決定257 §7 #2）

## 7. CEO Human QA（3 問・YES／NO）

| # | 問い | NO の場合 |
|---|---|---|
| Q1 | HP が半分を切った直後の声で「神が自分を見ている」と感じたか | 撤去（`OFFICIAL_VOICES.taiyo.crisis` と先読み 1 行を外す。原本・台帳行は残す） |
| Q2 | 次のラウンドの思考を邪魔しなかったか | crisis を「敵必殺の直後だけ」（`planBatch` の `isSpecial` 相当）に限定して再 QA 1 回 |
| Q3 | iPhone で BGM が下がり、ミュートで止まり、あいさつの後に自然につながったか | `VOICE_LAYER` の係数調整（gain／afterImpactMs） |

**2026-10-23 追記（Lane 4 独立 QA）**：開始方法（`?enemy=ryujin&seed=crisis-003`）・観察点・回答形式は `docs/OFFICIAL_VOICE_CRISIS_PILOT_V1_QA.md` §3。同書 §1 で seed 再現性・発火時刻・duck・二重再生防止を PASS（WARN 3・FAIL 0）、フック本体テスト `crisisVoiceHook.test.ts` 12 件を追加（runtime 変更 0）。

手順は `docs/OFFICIAL_VOICE_PILOT_V1.md` §9 と同じ（preview の起動は PM）。大耀 × **蒼海の龍神** を選び、R4「大海嘯」（20）を受けると「ふつう」なら HP 30→≤15 でほぼ確実に鳴る（決定246 sim：最低 HP ≤ 50% は 63〜64%／戦）。

## 8. 次の作業（AI 案）

1. PM：G-A（full vitest／build）→ G-B（`acceptance.mjs` 8 ケース＝§5-1 のコマンド。json の `crisisMeasuredDurationSec` を台帳 VOICE-KIT-08 の実測欄へ追記）→ preview 起動 → CEO Human QA
2. PASS 後：`docs/DECISIONS.md` に AI 判断 1 行（台帳 ID VOICE-KIT-08 のみ引用）・RC への統合順序は PM
3. その後：7 神 greeting 展開（data-only・VOICE-KIT-02〜07）→ C5 ジングル GainNode 化 → success → fatigue（CEO 試聴後）

## 5-2. Automated Gate 実走結果（2026-10-30・AI-PM 直列・v1.0.5 追従 merge f8013f1 の後）

| 項目 | 結果 | 証跡（docs/evidence/official-voice-crisis-pilot-v1/） |
|---|---|---|
| merge | Production v1.0.5 master a96a409 を merge・conflict 0・crisis 系 3 ファイルと音声 2 本は 64e6331 と同一バイト | git log f8013f1 |
| tsc | 0 | 10-tsc-after-merge.txt |
| targeted vitest | officialVoice／crisisVoice／crisisVoiceHook／creditsScreen **60/60 PASS** | 11-vitest-targeted-after-merge.txt |
| full vitest | **1,611 PASS・0 fail・17 skip**（v1.0.5 の 1,578 ＋ 本 branch 33） | 12-vitest-full-after-merge.txt |
| build | JS index-BDu5kkxP.js 477.95 kB（v1.0.5 475.99 → **+1.96 kB**・受入 ≤ +2.0 kB）／CSS 195.08 kB＝v1.0.5 と**同一ハッシュ ClB44gcF** | 13-build-after-merge.txt |
| G-B 受入（Playwright・preview 4173） | **8/8 ALL PASS**（greeting PC／SP × ミュート有無 4・crisis 4） | 14-acceptance-after-merge.json／.stdout.txt |

crisis × 音あり（PC／SP）の実測：入口で greeting＋crisis を各 1 回要求（先読み）→ greeting 1 本（11.783s）→ R4「大海嘯」で HP 300→100（表示）→ **ピンチ 1 本（8.858s）**。(b) 着弾 +300ms の実測は HP ラベル基準で **PC 299ms／SP 296ms**（許容 ±50）。(c) duck 0.343 → 復帰 1.0、必殺の duck と**合流**（merged true）。(d) 声の重なり 0ms。(e) R5 で HP 70 まで落ちても crisis は 1 本のまま。JS error 0・HP 経路 R1 260／R2 260／R3 300／R4 100／R5 70 が crisis-seed.mjs の予測と一致。crisis × ミュート：要求 0・start 0。

QA スクリプトの修正（runtime 変更 0・scripts/official-voice-pilot/acceptance.mjs の 3 箇所）：① 計測フックの MutationObserver が addInitScript 時に null の documentElement を観測していた → document を観測 ② greeting ケースの要求回数 1 固定 → 本仕様（入口で 2 本先読み）に合わせ「greeting 1 回・合計 ≤2」 ③ 着弾基準＝浮遊数字の animationstart が必殺（カットイン）の数字で標本に乗らないため、HP ラベル変化（着弾＋130ms）を代替基準として同じ許容幅で判定。初回実走（修正前）は greeting 音あり 2 ケースが②で、crisis 4 ケースが①③で FAIL したが、声の start 回数・ミュート 0 回・duck 合流は修正前から PASS 値だった。

残リスク：浮遊数字基準（deltaFromFloatMs）は null のまま＝QA 標本側の既知事項。iOS 実機（サイレントスイッチ・ホーム復帰・greeting 中の見送り）は §7 の CEO Human QA で確認。

## 7-2. CEO iPhone Human QA 結果（2026-10-31・build 7d48654＝index-BDu5kkxP.js・LAN preview 4173・大耀 × 蒼海の龍神）

| # | 設問 | CEO 回答 | 判定 |
|---|---|---|---|
| Q1 | HP 半分を切った直後の声が被弾と合って聞こえたか | 被弾と合って自然に聞こえた | PASS |
| Q2 | 声の明瞭さ・BGM との音量バランス | 声が明瞭で BGM とのバランスも良い | PASS |
| Q3 | 同一戦闘中の再生回数 | 1 回のみ | PASS |
| Q4 | 毎戦鳴ることの許容・ピンチの緊張感 | 毎戦聞いてもよく、緊張感が高まる | PASS |

**Human QA 4/4 PASS → AI-PM 判定：実装 GO・統合候補入り**（runtime 変更 0・push／merge／tag／deploy は未実施。統合は CEO）。

未確認として残す項目（実機未検証）：iOS サイレントスイッチ ON 時の挙動／Safari をホームに戻して復帰したときの再生・duck 復帰／greeting 再生中に crisis 条件が成立したときの見送り。いずれも greeting（決定282）と同じ経路のため既知挙動と同じと推定するが、Production 公開前の iPhone 最終 QA で 1 戦ずつ確認する。QA 用 preview 4173 は確認後に停止・ポート解放済み。
