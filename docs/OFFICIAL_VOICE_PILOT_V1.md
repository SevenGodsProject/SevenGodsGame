# Official Voice Pilot v1 — 大耀「あいさつ」（SGG Creator Kit v1.1 公式ボイス）

- 日付：2026-10-09（Lane 2・**AI 判断**（CLAUDE.md §6-2）・CEO 方針「公式ボイスは v1.0 への先行導入を検討する／まず大耀の『あいさつ』1 本で Pilot」2026-10-09）
- 状態：**IMPLEMENTED ON BRANCH — Automated Gate PASS — CEO Human QA READY**（master merge・push・deploy は未実施。merge は CEO 承認後）
- worktree／branch：`SevenGodsGame-voice-pilot`／`feat/official-voice-pilot-v1`（基点 integ `master` `6c8b226`）
- 前提監査：`docs/CREATOR_KIT_V1_1_AUDIT.md`（§2 公式ボイス・§5 権利）。重複監査はしない
- 不変：`src/core` 差分 0（ゲーム規則・ダメージ・AP・敵・神・スコア・Seed・PRNG 不変）／saveVersion 不変／gameVersion 不変／既存 22 SE 不変／BGM 音源不変／既存 7 敵 不変／決定263 CLOSED のまま

---

## 1. 何を足したか（1 文）

**新規開始の戦闘で、入口「降臨の間」が終わって操作できるようになった瞬間に、大耀の公式ボイス「あいさつ」（11.78 秒）を 1 回だけ鳴らし、その間だけ BGM を下げる。**

## 2. 仕様（実装どおり）

| 項目 | 内容 | 根拠 |
|---|---|---|
| 対象 | 大耀（`taiyo`）× `greeting` の 1 本のみ。他 6 神・他 3 場面は配信しない（`OFFICIAL_VOICES` に 1 エントリ） | Pilot 範囲。7 神展開は §7 の別 Gate |
| 音源 | Kit 配布 MP3 を**無改変**で配信（`public/assets/voice/taiyo/greeting.mp3`・189,357B・sha256 `cdb5d44c6b0c48d7…`＝原本＝Kit MCP `get_voice`）。原本は `audio-source/voice/taiyo/taiyo-greeting.mp3`（tracked） | 台帳 VOICE-KIT-01（`docs/ASSET_RIGHTS_LEDGER.md` §3-L）・`officialVoice.test.ts` が配信 sha256 を固定 |
| 尺・形式 | 11.783 秒（Chromium `decodeAudioData` 実測）・MP3 CBR 128kbps・48kHz・ID3v2.4 | §4 Evidence |
| 再生時刻 | `BossEntrance` の `onDone`（Full 2,800ms／Short 1,500ms／reduced 900ms／skip 時は即）＝`handleEntranceDone` の中で 1 回。新規開始（`battleStartKey` 増分）の入口でしか呼ばれないので「続きから」では鳴らない | `BattleScreen.tsx` |
| 先読み | 入口の開始時（`preloadSe()` の直後）に `preloadVoice(godId,'greeting')`＝入口の 1.5〜2.8 秒の間に fetch→decode。遅れて届いた場合（`VOICE_LAYER.lateDropMs`＝1,500ms 超）は鳴らさない | `sound.ts` `playVoice` |
| 経路 | SE と同じ WebAudio（`AudioContext` 共有・`AudioBufferSourceNode`→`GainNode`→destination）。fallback の合成トーン無し（失敗時は無音） | `sound.ts` 末尾 |
| 音量 | `VOICE_LAYER.gain` 0.8 × master 0.85＝**0.68**。神の一撃の着弾（impact[4] 0.85）未満・State Change（0.55）以上。`feelTier.ts` に閉じる（呼び出し側に数値なし） | 決定128 の階層 |
| BGM duck | `onStart(durationMs)` で `duckBgm(durationMs + VOICE_LAYER.duckTailMs 300)`＝決定257 の GainNode 経路（iOS Safari の volume 無視対策済み）。新しい経路は作らない | `bgm.ts` `duckBgm` |
| ミュート | `sound.ts` の `muted` を共有（新規再生しない・preload もしない）。さらに `setSoundMuted(true)` の瞬間に鳴っているボイスを停止（SE は短いので従来どおり） | App の 1 ボタンで SE／BGM／Voice が同時に止まる |
| 連続再生防止 | voice チャネルは常に 1 本（`playVoice` は前の source を `stopVoice()` してから開始）。1 戦 1 回は入口の構造で保証（`handleEntranceDone` は入口 1 回につき 1 回） | `officialVoice.test.ts` 配線テスト |
| 画面離脱 | `BattleScreen` の unmount で `stopVoice()`（Retry／もう一度／Home で鳴り続けない） | 同上 |
| 容量 | +189KB（戦闘開始時のみ・遅延ロード）。初回表示（LCP／CLS）に影響しない | §4 |
| 追加 UI | 0（設定項目・表示の追加なし） | — |

## 3. 変更ファイル（runtime 4・test 1・asset 2・docs 4・script 1）

| 種別 | ファイル | 変更 |
|---|---|---|
| runtime | `src/components/battle/feelTier.ts` | `VOICE_LAYER`（gain 0.8／duckTailMs 300／lateDropMs 1500）追加 |
| runtime | `src/components/battle/sound.ts` | `VOICE_BASE_PATH`／`VoiceScene`／`OFFICIAL_VOICES`／`hasOfficialVoice`／`preloadVoice`／`stopVoice`／`playVoice` 追加・`setSoundMuted(true)` で `stopVoice()`。`SeName`・22 SE・`sfx` は不変 |
| runtime | `src/components/battle/BattleScreen.tsx` | import 3 行・入口開始時 `preloadVoice` 1 行・`handleEntranceDone` で `playVoice`＋`duckBgm`・unmount で `stopVoice` |
| test | `src/components/battle/officialVoice.test.ts` | 配信ファイル存在／孤児 0／sha256 固定／Pilot 範囲 1 本／SE 22 不変／音量階層／ミュート／配線 1 回・duck・stopVoice（10 件） |
| asset | `audio-source/voice/taiyo/taiyo-greeting.mp3`・`public/assets/voice/taiyo/greeting.mp3` | Kit 原本（同一バイト列） |
| docs | `docs/ASSET_RIGHTS_LEDGER.md` | §3-L VOICE-KIT-01（KNOWN ◎）＋予約 02〜07 |
| docs | `docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md` | 公式 2026-10-08 版へ更新（§5「キャラクターの声」追加・節番号繰り下げ） |
| docs | `docs/OFFICIAL_VOICE_PILOT_V1.md`・`docs/evidence/official-voice-pilot/acceptance.json` | 本書・実測 |
| script | `scripts/official-voice-pilot/acceptance.mjs` | PC／SP × ミュート有無の 4 ケース計測 |

`src/core`・`public/assets/se`・`public/assets/bgm`・`package.json`・`index.html`・`vite.config.ts`・`docs/DECISIONS.md`・`docs/RELEASE_STATUS.md`・`docs/ROADMAP_TO_RELEASE.md`：**差分 0**（Lane 1 と同じファイルを編集しない。DECISIONS／RELEASE_STATUS の行は統合時に Lane 1 の後で 1 行追記する）。

## 4. Automated Gate（2026-10-09・本 worktree）

| 項目 | 結果 |
|---|---|
| 素材取得 | 公式 MCP `get_voice`（`taiyo-god`）の URL から取得。sha256 **原本＝配信＝MCP の 3 者一致**（`cdb5d44c6b0c48d7a676f11b2d69a4d4dbb69e0f90abb1efd143ba2264aba3cc`） |
| 尺・形式 | フレーム解析：493 frames・CBR 128kbps・48kHz・ID3v2.4（`Lavf62.12.100`）・Info ヘッダ → 素の長さ 11.83s。Chromium decode 実測 **11.783s**（PC／SP とも同値） |
| vitest（targeted） | `officialVoice`／`sound`／`battleEntrance`／`soundLayer`：**42 PASS・0 FAIL** |
| tsc -b | **0 error**（`state` null 安全化の 1 回の修正後） |
| oxlint | **error 0**（警告 3 は既存 `scripts/phase6b-layout-audit` のみ） |
| build | PASS。JS 461.73kB（gzip 143.43kB）・CSS 190.81kB（不変）。Lane 1 build（460.48kB）との差＝本 Pilot の voice チャネル分 ≈ +1.2kB |
| Playwright（`acceptance.mjs`・preview 4173・Chromium headless・autoplay 許可） | **4／4 PASS**。PC 1508×660：voice 取得 1 回（開始 3,076ms 後＝入口の間）・start 1 回（6,867ms・11.783s）・duck 0.343→1 予約・SE 2・JS error 0／SP 390×844（mobile・touch）：取得 1,502ms・start 5,168ms・11.783s・duck 0.343→1・SE 3・error 0／**ミュート ON**（PC／SP）：取得 0・start 0・SE 0・error 0・戦闘画面は正常 |
| 連続再生 | 同じ戦闘で 2 本目の start なし（start 後 1 秒監視）。voice チャネル 1 本はコードで固定 |
| 既存 BGM・SE との競合 | 入口の `godDescend`／`bossEntrance` は入口中に鳴り終わる（ボイスは入口後）。ボイス中に鳴り得る SE は初期手札 `card_draw`（0.3）と押下音（0.4）＝ボイス 0.8 より小さい。BGM は duck（0.343）で下がる。勝利・敗北ジングルとは時間帯が重ならない |
| ゲーム規則 | `git diff --stat 6c8b226 -- src/core`＝**0 行** |

## 5. 既知の注意点（Human QA で見る）

1. **尺 11.8 秒は長い**。R1 の思考中に重なる。CEO が「長い」と感じた場合の選択肢：(a) 1 戦 1 回 → セッション 1 回（`battleEntrance.ts` の Full／Short と同じ記憶）(b) 冒頭 3〜4 秒だけ使う（加工は §2 で許可。ただし「公式の声」の一部切り出しは Kit の意図から外れないか要確認）(c) 撤去。**本 Pilot ではどれも実装していない**（Human QA の答えを待つ）
2. **セリフ内容と決定20 の性格設定の整合**は未確認（AI は音声の文字起こしをしていない）。CEO が試聴して判断
3. 入口を **skip** したときもボイスは鳴る（skip は「早く始めたい」の意思表示なので、鳴らさない方が良い可能性あり。QA で確認）
4. iPhone 実機での duck（決定257 で経路は実機確認済み）とサイレントスイッチ挙動は実機 QA

## 6. CEO Human QA（3 問・YES／NO）

| # | 問い | NO の場合 |
|---|---|---|
| Q1 | 大耀の声で「自分の神が目の前にいる」と感じたか | 撤去（音源は原本のみ残す） |
| Q2 | 11.8 秒は長すぎないか（R1 の思考を邪魔しないか） | §5-1 の (a)／(b) を 1 つ選んで再 QA 1 回 |
| Q3 | iPhone で BGM が下がり、ミュートで止まるか | duck 経路の実機調整（`SOUND_LAYER.duckLevel`） |

## 7. 7 神への展開（別 Gate・本 Pilot の後）

- 条件：Q1 YES かつ Q2 の答えが確定
- 内容：`OFFICIAL_VOICES` に 6 エントリ・`public/assets/voice/<god>/greeting.mp3` 6 本（合計 ≈ 838KB・遅延ロード）・台帳 VOICE-KIT-02〜07（予約済み）・`officialVoice.test.ts` の範囲テストを 7 本へ
- コード変更：データ 6 行＋テスト 1 行（経路・UI の変更 0）
- Gate：同じ `acceptance.mjs` を神ごとに回す（7 × 2 viewport）

## 8. v1.0 への影響（AI 判断）

- 技術：`src/core` 0・save 0・UI 0・+189KB 遅延。Release Gate の回帰リスクは低
- 順序：**Public Face Pack v1（CM-01）→ Save Compatibility Guard → Release Safety → Practical QA v3 → v1.0** は変えない。本 Pilot は **CEO Human QA PASS 後に master へ merge**（CEO 承認）し、v1.0 の Practical QA v3 に「大耀の声」1 問を同梱する案を推奨（別 Human QA Lane を増やさない）
- 権利：Kit §5 で明文化済み（KNOWN）。CEO 判断事項なし（§6-3 #5 は「可否認定」であり、本件は Kit 規約の範囲内の利用。CEO が念のため SGG 運営へ相談する選択は可）
