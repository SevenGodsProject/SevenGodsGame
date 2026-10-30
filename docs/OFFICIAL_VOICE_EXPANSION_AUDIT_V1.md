# 公式ボイス展開監査 v1 — 残り 27 本の素材構成・規約整合・導入方法・次 Pilot 推奨（SGG Creator Kit v1.1）

- 状態：**AUDIT COMPLETE — read-only／docs-only・runtime 変更 0・音声取得 0 本・Production 影響 0**（2026-10-21・Lane 3「公式ボイス」・Infra＋Designer・**AI 判断**（CLAUDE.md §6-2）。権利の可否認定は行わない（§6-3 #5 は CEO））
- 基点：origin/master **`1ce9876`**（Production v1.0.1・`package.json` 1.0.1）。本書は worktree `SevenGodsGame-lane3v`／branch `docs/lane3-official-voice-expansion-v1` に **本書 1 ファイルのみ** commit する（push・merge・tag・deploy 0）
- 一次情報：Kit MCP `https://sgg-creator-kit.svc-manage-2020.workers.dev/mcp`（`initialize`／`tools/list`／`get_usage_terms`／`get_voice` × 7 神＝JSON-RPC の読み取りのみ。**音声本体の GET は 0**・ヘッダ確認は `HEAD` のみ）／公式サイト `https://sevengodsgames.com/creator-kit/`・`/creator-kit/v1/RIGHTS.md`・`/creator-kit/v1/manifest.json`／本リポジトリの実コード（`src/components/battle/sound.ts`・`useBattleSound.ts`・`bgm.ts`・`feelTier.ts`・`combatTimeline.ts`・`enemyVfxTiming.ts`・`BossEntrance.tsx`・`BattleScreen.tsx`・`useCombatPresentation.ts`・`officialVoice.test.ts`・`creditsText.ts`）
- 前提監査：`docs/CREATOR_KIT_V1_1_AUDIT.md`（2026-10-09）・`docs/OFFICIAL_VOICE_PILOT_V1.md`（Pilot v1 仕様）・`docs/PRACTICAL_QA_V3_RESULT.md` §5（CEO Q8 **3／3 PASS**）・`docs/DECISION257_SOUND_LAYER_V1_PILOT.md`（duck 経路・無音窓）・`docs/evidence/commercial-presentation-audit/sound-timeline.md`（時系列）
- 禁止事項の遵守：`src/`・`public/`・`docs/DECISIONS.md`・`docs/ASSET_RIGHTS_LEDGER.md`・`docs/assets-kit/*` は未編集／vitest・build・dev サーバー未起動／他 worktree は読み取りのみ

---

## 0. 結論表

| # | 問い | 結論 |
|---|---|---|
| 0-1 | 既存の大耀「あいさつ」実装は展開の土台として足りるか | **足りる（経路の追加 0 で 2 本目を載せられる）**。voice チャネル 1 本・ミュート共有・遅延 drop 1,500ms・unmount 停止・duck 経路（決定257）はすべて `sound.ts`／`BattleScreen.tsx` に実装済み（§1）。不足は 3 点＝①`stopVoice()` が**即時停止**（2 本目が前の声を切るときクリック音の恐れ）②decode 済み `AudioBuffer` の**キャッシュが無期限**（神を替えるたび積み上がる）③`handleEntranceDone` と `preloadVoice` が `'greeting'` 固定 |
| 0-2 | 残り 27 本の素材構成 | 7 神 × 4 場面＝28 本（MP3・`audio/mpeg`）。**28 本合計 4,593,900B**・配信済み 1 本を除く **27 本＝4,404,543B（≈4.4MB）**。全 28 本の key・bytes・sha256 を §2 に一覧化（Kit MCP `get_voice` の返答そのまま）。尺は **推定 7.7〜15.8 秒**（大耀 greeting の実測 CBR 128kbps＝16,000B/s から換算。実測は Pilot 着手時） |
| 0-3 | 取得方法 | Kit MCP `get_voice` の `url`（workers.dev）または公式サイト `/creator-kit/voice/v1/<god>/<god>-<scene>.mp3`（**両者 ETag 同一**）。**CORS ヘッダ無し**＝本作 origin からの直接 fetch は不可 → Pilot v1 と同じ **自前配信（`public/assets/voice/<god>/<scene>.mp3`・無改変・sha256 を `officialVoice.test.ts` で固定）** が前提（§2-3） |
| 0-4 | Guidelines 最新版との整合 | **repo コピー `docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md` は既に最新版（§5「キャラクターの声」を含む・Updated 2026-10-08）**。公式サイト・MCP `get_usage_terms`・repo コピーの 3 者は **本文同一**（LF 正規化後 diff 0。repo コピーは CRLF のため生 sha256 だけ異なる）。指示文の前提「repo コピーは §5 を含まない旧版」は 2026-10-09 監査時点の事実で、`b9ab8f9`（決定272 候補・BEFORE RELEASE 3 Lane）で更新済み＝**更新作業は不要・CEO 判断も不要**（§3）。残る相違は `docs/assets-kit/manifest.json` が 1.0.0（公式 1.1.0）のみで、ボイスはどの manifest にも無いため本件に影響なし |
| 0-5 | 導入方法の比較（5 配置） | **◎ 危機（crisis・HP ≤ 50% 初回到達）** ／ ○ 戦闘開始（greeting・既存。他 6 神は data 追加のみ）／ △ 勝利（success・ジングルが HTMLAudio 直結で duck 不可・iOS では 1.0 で鳴るため先に `bgm.ts` の経路変更が要る）／ ✗ 必殺技（敵・神のカットインの無音窓は 1,110／1,180ms。Kit 4 場面はどれも 7 秒超の台詞で**掛け声ではない**＝同期不可）／ ✗ 疲労（fatigue「お疲れ」＝内容未確認。後半ラウンドに置く根拠が無く、敗北・終局か戦闘外が候補）（§4） |
| 0-6 | 音量・duck・競合・スマホ | 音量は `VOICE_LAYER.gain` 0.8（実効 0.68）据え置き。**優先度つき 1 チャネル**（greeting 1 ＜ crisis 2 ＜ success／fatigue 3・同順位は後勝ち・低い方は鳴らさない）＋ **80ms フェード停止** ＋ **1 戦 1 場面 1 回** ＋ duck は決定257 の合流規則で自動連結。スマホ：iOS `volume` 無視（K04）は voice が GainNode 経路なので影響なし・autoplay は入口の gesture 済み AudioContext で解決済み・decode PCM は 1 本 ≈2.3〜6.1MB → **神単位でキャッシュを捨てる**（§5） |
| 0-7 | 次の Pilot（1 つ） | **大耀 × crisis（ピンチ）× 「HP が最大の 50% 以下に初めて落ちた敵ターンの着弾後（最後の着弾＋300ms）」・1 戦 1 回**。閾値は新設せず `RULES.cardBonus.lowHpRatio`（0.5）を参照（`rules.ts` 既存値・UI 文言「HPが最大の50%以下」と一致）。発火率は決定246 sim の「最低 HP ≤ 50%」63〜64%／戦。コスト S（runtime 3 ファイル・data 1 行・asset 1 本・test・台帳 1 行・credits 1 文）。**CEO 判断不要**（§6-2。Production 公開時のみ §6-3 #8）。7 神 greeting 展開は本 Pilot の後に data-only で続ける（§6） |

---

## 1. 既存の大耀「あいさつ」実装（コード確認・`1ce9876`）

| 観点 | 実装（ファイル：行） | 展開時の含意 |
|---|---|---|
| 配信表 | `sound.ts` `OFFICIAL_VOICES = { taiyo: { greeting: 'taiyo/greeting.mp3' } }`・`VoiceScene = 'greeting' \| 'crisis' \| 'fatigue' \| 'success'`・`VOICE_BASE_PATH '/assets/voice/'` | 4 場面の型は既に宣言済み。追加は**データ 1 行／本** |
| 先読み | `BattleScreen.tsx:273-275`：`battleStartKey` 増分（新規開始）時に `preloadSe()` の直後で `preloadVoice(state.godId, 'greeting')`（入口の 0.9〜2.8 秒の間に fetch→`decodeAudioData`） | `'greeting'` 固定。2 場面目は呼び出しを足す（`crisis` も入口で先読みしてよい＝+143KB） |
| 再生時刻 | `BattleScreen.tsx:284-288` `handleEntranceDone`（`BossEntrance` の `onDone`＝Full **2,800ms**／Short **1,500ms**／reduced **900ms**／skip **+200ms**）で `playVoice(godId,'greeting',{ onStart:(ms)=>duckBgm(ms + VOICE_LAYER.duckTailMs) })` | 「続きから」では `battleStartKey` が増えないので鳴らない。**skip しても鳴る**（Known K36・CEO Q8 で許容） |
| 遅延 drop | `sound.ts` `playVoice`：キャッシュ未着なら `loadVoice` 完了後に `late = now − requestedAt` が **`VOICE_LAYER.lateDropMs` 1,500ms** 超なら鳴らさない | 戦闘中の場面（crisis）は「着弾の直後」に意味があるため、**drop 閾値を場面別に短く**（crisis 800ms 目安）する余地 |
| 1 チャネル | `activeVoice` 1 本。`playVoice` の `start` は `stopVoice()` してから `AudioBufferSourceNode→GainNode→destination` | 2 本目が前の声を**即時 `stop()`** で切る＝波形の途中で切るクリック音の恐れ（§5-2 で 80ms フェードを提案） |
| ミュート共有 | `setSoundMuted(true)` で `stopVoice()`（`sound.ts:35-38`）・`playVoice`／`preloadVoice` はミュート中 false／no-op。App の 1 ボタンが `setSoundMuted`＋`setBgmMuted` を同時切替（`App.tsx:38-41`） | 変更不要 |
| unmount 停止 | `BattleScreen.tsx:290` `useEffect(() => () => stopVoice(), [])`・`useBattleSound.ts:31` `releaseBgmDuck()` | 変更不要（Retry／もう一度／Home で止まる） |
| 音量 | `feelTier.ts` `VOICE_LAYER.gain 0.8` × `SE_GAIN.master 0.85`＝**0.68**（impact L3 0.68 と同値・L4 0.85 未満・stateChange 0.55 以上） | 据え置き（§5-1） |
| BGM duck | `bgm.ts` `duckBgm(holdMs)`：GainNode 経路（初回 lazy attach・iOS `volume` 無視対策）。60ms で ×0.343 → hold → 300ms で 1.0。**連続呼び出しは「最後に終わるもの」に合流**（`duckUntil = max`）。ジングル中（`jingleTimer`）・BGM 停止中・ミュート中は **false** | 戦闘中の声は決定257 の duck（神の一撃 1,900ms／敵必殺 ≤2,200ms）と自動で連結する。**勝利・敗北のジングル中は duck できない**（§4-C） |
| fallback | 合成トーン無し（取得・decode 失敗＝無音）。`officialVoice.test.ts` が配信ファイルの存在・孤児 0・sha256 固定・範囲 1 本・SE 22 不変・音量階層・配線 1 回を固定 | 展開時はテストの「範囲＝`['taiyo:greeting']`」と `KIT_SHA256` を更新する |
| 表示文言 | `src/components/setup/creditsText.ts:27`「…および**大耀の音声（あいさつ）**は『SEVENGODS Games Creator Kit』の配布素材をそのまま使用しています（声の素材を本作で制作してはいません）」。`creditsScreen.test.ts` が「公式ボイス／公式の声／神の音声」を禁止語に固定 | 2 本目以降で **credits の 1 文を事実に合わせて改訂**（例「大耀の音声（あいさつ・ピンチ）」）。禁止語規則は維持 |

---

## 2. 残り 27 本の素材構成（Kit MCP `get_voice`・2026-10-21・メタデータのみ）

### 2-1. MCP の事実

| 項目 | 実測 |
|---|---|
| Endpoint／Server | `POST /mcp` 200・`sgg-creator-kit` **v0.3.0**・protocol `2025-06-18`・ステートレス。`GET` は 405 |
| Tools（5・全て `readOnlyHint: true`） | `search_characters`／`get_character`／`get_model`／**`get_voice`**（`id`・任意 `scene`）／`get_usage_terms` |
| `get_voice` の返答 | `character{id,name,nameEn}`・`voice[]{scene,label,key,format,mimeType,bytes,sha256,url}`・`voicePolicy`（「Official SEVEN GODS voices are only the clips distributed in this kit. Creators may make and use their own voices, but must not label them 公式, 公式ボイス, 公認…」）・`termsUrl`（`https://sgg-creator-kit.svc-manage-2020.workers.dev/RIGHTS.md`・`HEAD` 200） |
| 配信ヘッダ（`HEAD` のみ） | `Content-Type: audio/mpeg`・`Cache-Control: public, max-age=0, must-revalidate`・`ETag` あり（workers.dev と公式サイトで**同一 ETag**）・`Content-Length` 無し・**`Access-Control-Allow-Origin` 無し** |
| 公式ページ | `https://sevengodsgames.com/creator-kit/`（200・263KB）に 28 本の `voice/v1/<god>/<god>-<scene>.mp3` がリンクされている（試聴は CEO がブラウザで可・コスト 0） |

### 2-2. 28 本一覧（★＝配信済み VOICE-KIT-01）

尺は推定（bytes ÷ 16,000B/s。大耀 greeting の実測「189,357B＝11.783s」と一致する換算。全本が同じ CBR 128kbps／48kHz という仮定つき）。

| 神 | id | 場面 | label | key | bytes | sha256 | 尺（推定 s） |
|---|---|---|---|---|---|---|---|
| 恵比寿 | ebisu | greeting | あいさつ | voice/v1/ebisu/ebisu-greeting.mp3 | 122,925 | 394d471a39573a583ad5500b614361e7b8ea5e13542530fb457d0c8493302073 | 7.7 |
| 恵比寿 | ebisu | crisis | ピンチ | voice/v1/ebisu/ebisu-crisis.mp3 | 146,349 | 5d0ce61793ed776240f426ef580e0f2f6f35c39578a3bfdcb46388cf02658131 | 9.1 |
| 恵比寿 | ebisu | fatigue | お疲れ | voice/v1/ebisu/ebisu-fatigue.mp3 | 185,517 | 1485532fc401d27a0c6ed867121623d60ec8fa086d9d4e23f27e49be80966640 | 11.6 |
| 恵比寿 | ebisu | success | 勝利 | voice/v1/ebisu/ebisu-success.mp3 | 178,605 | 44dfb22aa047fe298018653acde93f8ebfaa73105ddf2cb0931f12217c15d6c3 | 11.2 |
| 大耀 ★ | taiyo | greeting | あいさつ | voice/v1/taiyo/taiyo-greeting.mp3 | 189,357 | cdb5d44c6b0c48d7a676f11b2d69a4d4dbb69e0f90abb1efd143ba2264aba3cc | 11.8（実測 11.783） |
| 大耀 | taiyo | crisis | ピンチ | voice/v1/taiyo/taiyo-crisis.mp3 | 142,893 | 3df318eda81d94bf1fdb99ac609026cdb4aa7c873c7ea30e59056d3ca5140098 | 8.9 |
| 大耀 | taiyo | fatigue | お疲れ | voice/v1/taiyo/taiyo-fatigue.mp3 | 222,765 | c3bb2a53942fcff0c3edd7af2982c5f945d567947789f8712dd5e5cfffac20f0 | 13.9 |
| 大耀 | taiyo | success | 勝利 | voice/v1/taiyo/taiyo-success.mp3 | 132,909 | c480aeae8d31ec983faf189de0c20f3cfeae2b00f94ba607d7c113c777eef999 | 8.3 |
| 蒼毘 | sobi | greeting | あいさつ | voice/v1/sobi/sobi-greeting.mp3 | 139,821 | 3c8fb08a10091bb33e7ab281c67426bac81197417698036c16593f1392f1ab5f | 8.7 |
| 蒼毘 | sobi | crisis | ピンチ | voice/v1/sobi/sobi-crisis.mp3 | 175,533 | b89f33dc3221ee3970b717496e638e5045e117872e57009af12c22a7f31f3a04 | 11.0 |
| 蒼毘 | sobi | fatigue | お疲れ | voice/v1/sobi/sobi-fatigue.mp3 | 252,333 | 7f6ecb175ea43da058132e3d1c057e69b86d8e1275c2fe64b41ed512f7a81215 | 15.8 |
| 蒼毘 | sobi | success | 勝利 | voice/v1/sobi/sobi-success.mp3 | 139,053 | 2d2f689bec177755282f7a7c68af0073952010f2fbbc16724fc1e08cb2e1437d | 8.7 |
| 才華 | saika | greeting | あいさつ | voice/v1/saika/saika-greeting.mp3 | 170,541 | bf0673d692aa95e50b95430508689ec6268e224e05ac668af9a9db5ac81a531a | 10.7 |
| 才華 | saika | crisis | ピンチ | voice/v1/saika/saika-crisis.mp3 | 194,349 | cda5c854bb1908e1c5fcbbef60da219e97f919496e27377f5dece7002d3c2074 | 12.1 |
| 才華 | saika | fatigue | お疲れ | voice/v1/saika/saika-fatigue.mp3 | 190,125 | 996ee4c2c89bc27e6786f7c20a4eb492e70f2531760cf42554637abf59c6b756 | 11.9 |
| 才華 | saika | success | 勝利 | voice/v1/saika/saika-success.mp3 | 135,213 | 20d6e434395f3dbabf385a8ce1bd24d13f21e79db98d6fdbe4ed2a9c88296a4a | 8.5 |
| 寿楽 | juraku | greeting | あいさつ | voice/v1/juraku/juraku-greeting.mp3 | 125,229 | 390fc34987e9f8f0ab6a95203b3c58435fcd31c61aea158d0d86db3feee49133 | 7.8 |
| 寿楽 | juraku | crisis | ピンチ | voice/v1/juraku/juraku-crisis.mp3 | 189,741 | 65e3a0bcabc04e3c178c514f372ee83f23904b8faec6bee97ed127e8b48c1faf | 11.9 |
| 寿楽 | juraku | fatigue | お疲れ | voice/v1/juraku/juraku-fatigue.mp3 | 143,277 | 87c41d2dc830539b4a165132ffa695805d5324562c5efd089f222d3362606199 | 9.0 |
| 寿楽 | juraku | success | 勝利 | voice/v1/juraku/juraku-success.mp3 | 124,077 | 00535f374595a9b3f03c4f75a721e54861f990d6519e4d3f240d80d2dc7a3817 | 7.8 |
| 福永 | fukuei | greeting | あいさつ | voice/v1/fukuei/fukuei-greeting.mp3 | 128,685 | 33fef2b936a0f08c52c6515810d94a3ab57faa53e7ab791b9d91b8dfeca7acac | 8.0 |
| 福永 | fukuei | crisis | ピンチ | voice/v1/fukuei/fukuei-crisis.mp3 | 157,869 | a2a4d03f409bd5c3bd2ebf526b6fe85bdffb712464c56f6d8696501690f6af21 | 9.9 |
| 福永 | fukuei | fatigue | お疲れ | voice/v1/fukuei/fukuei-fatigue.mp3 | 152,109 | 11678e0236da92465d1e5a30e6e6516b30ec1f018d426123654e634338a58dc4 | 9.5 |
| 福永 | fukuei | success | 勝利 | voice/v1/fukuei/fukuei-success.mp3 | 161,325 | b16a17a85387be034a309197069b66a8c59b0f556070161c79908d85aae62d83 | 10.1 |
| 笑蓮 | shouren | greeting | あいさつ | voice/v1/shouren/shouren-greeting.mp3 | 150,957 | 8b0ed0067a46c24dd1ae7c59ebd3459c096504c0d5ca19c35782449e81822595 | 9.4 |
| 笑蓮 | shouren | crisis | ピンチ | voice/v1/shouren/shouren-crisis.mp3 | 187,053 | 31c9e5ddcdbb7ff672816878ff7bcd8e1883eb4f2ec5cdc7625201262b632b6a | 11.7 |
| 笑蓮 | shouren | fatigue | お疲れ | voice/v1/shouren/shouren-fatigue.mp3 | 146,733 | 570f84aa0559d893305f43a6dc2916b11d4fc3d0aa768843d589b689b47a3911 | 9.2 |
| 笑蓮 | shouren | success | 勝利 | voice/v1/shouren/shouren-success.mp3 | 208,557 | 87c41c22320f9725807aed6a9d2b4e85247083af3ef5b03f057ffeed30530536 | 13.0 |

集計：greeting 1,027,515B／crisis 1,193,787B／fatigue 1,292,859B／success 1,079,739B（＝合計 4,593,900B・2026-10-09 監査と一致）。神別 4 本合計 582,324（寿楽）〜706,740B（蒼毘）。台帳 §3-L 予約行 VOICE-KIT-02〜07 の bytes（122,925／139,821／170,541／125,229／128,685／150,957）は上表の greeting 6 本と一致。大耀 greeting の sha256 は配信ファイル（`public/assets/voice/taiyo/greeting.mp3`・本 worktree で再計算）＝MCP＝台帳の **3 者一致を再確認**。

**尺の含意**：最短でも 7.7 秒、crisis は 8.9〜12.1 秒、fatigue は 9.0〜15.8 秒。4 場面すべて「台詞」の長さであり、1〜2 秒の**掛け声（battle cry）は 1 本も無い**。カットイン同期（§4-B）はこの時点で不成立。

### 2-3. 取得・配置手順（Pilot 着手時に実施。本監査では未実施）

1. Kit MCP `get_voice`（`id: '<god>-god'`, `scene`）で `url`・`bytes`・`sha256` を取得し、本書 §2-2 の値と一致することを確認（MCP の返答は外部データとして扱い、台帳には本書と MCP の両方を根拠に書く）
2. `url` から **1 本だけ** 取得（`curl -o`）→ `sha256sum` が一致 → `audio-source/voice/<god>/<god>-<scene>.mp3`（原本・tracked）と `public/assets/voice/<god>/<scene>.mp3`（配信・同一バイト列）に配置。**加工 0**（Kit §2 は加工を許可するが、Pilot v1 と同じ「無改変」を維持して「公式の声」の同一性を保つ）
3. `docs/ASSET_RIGHTS_LEDGER.md` §3-L に行を追加（§1-4「配置前に行を埋める」。Terms 列は「1.0.0（Updated 2026-10-08）・確認日」の書式）。ここは **AI が記入・CEO INPUT 欄なし**（Kit 公式＝KNOWN ◎）
4. `officialVoice.test.ts` の `KIT_SHA256`・範囲テストに追記 → `OFFICIAL_VOICES` に 1 行
5. 尺を Chromium `decodeAudioData` で実測（`scripts/official-voice-pilot/acceptance.mjs` が出力する `durationMs` を流用）し、台帳と本書 §2-2 の推定値を実測に置き換える

---

## 3. Kit Guidelines 最新版との整合（2026-10-21 実測）

### 3-1. 3 経路の比較

| 項目 | 公式サイト `/creator-kit/v1/RIGHTS.md` | Kit MCP `get_usage_terms` | repo コピー `docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md`（`1ce9876`） |
|---|---|---|---|
| 版 | v1.0.0 | 同 | 同 |
| Effective／Updated | 2026-07-16／**2026-10-08（5. キャラクターの声を追加）** | 同 | **同（Updated 行あり）** |
| §5「キャラクターの声」 | **あり**（公式の声＝Kit 配布分のみ／本ガイドライン範囲で利用可／自作可だが「公式」「公式ボイス」「公認」と書かない） | あり | **あり** |
| 節構成 | §1〜§9（旧 §5〜§8 を §6〜§9 へ繰り下げ） | 同 | 同 |
| 本文（LF 正規化・`diff`） | 基準 | **差分 0**（sha256 `bb691b07…` 同一） | **差分 0** |
| 生ファイル | LF・7,584B | 同 | **CRLF**（`core.autocrlf=true` の checkout）→ 生 sha256 `571ea3be…` は不一致だが**内容は同一** |
| 最終更新 commit | — | — | `b9ab8f9`「Kit Guidelines の repo コピーを公式 2026-10-08 版（§5 キャラクターの声）へ更新」（決定272 候補・v1.0.0 に同梱） |
| `termsId`（manifest） | `SGG-FAN-CREATION-GUIDELINES-1.0.0`（**据え置き**・`kitVersion` 1.1.0） | （`voicePolicy` 文＋`termsUrl` のみ） | repo `manifest.json` は `kitVersion` **1.0.0**・`termsId` 同値 |

### 3-2. 判定

- **repo コピーの更新は不要**。指示文の前提（「§5 を含まない旧版」）は 2026-10-09 の `CREATOR_KIT_V1_1_AUDIT.md` §5-2 #2 時点の事実で、その後 `b9ab8f9` で更新され v1.0.0／v1.0.1 の Production に含まれている。本監査で改めて 3 経路同一を確認した
- `termsId` 据え置きは Kit 側の運用で、本作の台帳は既に「1.0.0（Updated 2026-10-08）・AI 確認 2026-10-09」の書式（VOICE-KIT-01）。展開時の行も同書式にする
- `docs/assets-kit/manifest.json`（1.0.0）は公式 1.1.0 と差があるが、**ボイスはどの manifest にも載らない**（`godVoiceRulesIncluded: 0`）ため本件では取込不要（三面図・将軍家を使う時点で取込）
- 今後 Guidelines が再改訂された場合の手順（CEO 判断事項「権利」§6-3 #5 に該当するため AI は提案まで）：①公式 `/creator-kit/v1/RIGHTS.md` を取得し repo コピーと LF 正規化 diff ②差分の要旨と本作への影響（配信中の Kit 素材・credits 文言・台帳 Terms 列）を 1 表で CEO に報告 ③CEO 承認後に docs-only で repo コピーと台帳 Terms 列を更新 ④`creditsScreen.test.ts` の禁止語との整合を再確認
- 補足（権利・表示）：Kit §5 は「公式の声＝Kit 配布分」と定義しており、本作が **Kit 配布音声を無改変で使う限り §5 の範囲内**。本作側の表示は credits で「公式」を名乗らない（禁止語テスト）。展開で変わるのは credits の事実文のみ

---

## 4. 導入方法の比較（配置 5 案 × 既存時刻表との競合）

時刻はすべて **commit（engine が結果を確定した瞬間）＝0ms**。音量は実効値（係数 × master 0.85）。

### 4-A. 戦闘開始＝greeting（既存・Pilot v1 で PASS）

| 時刻 | 既存の出来事 | 音 |
|---|---|---|
| 入口 0〜2,800（Full）／0〜1,500（Short）／0〜900（reduced）／skip +200 | 降臨の間（`BossEntrance`） | `godDescend` 250／100／0ms・`boss_entrance` 1,500／450／150ms（bigMoment 0.765） |
| 入口終了（`onDone`） | 操作開放・R1 思考 | **voice greeting 11.8s（0.68）**・BGM duck 12.1s |
| 直後 | 初期手札・押下 | `card_draw` 0.24・tap 0.34（声より小さい） |

競合：無し（CEO Q8 3／3 PASS）。他 6 神へは **data 6 行＋ファイル 6 本（1,027,515−189,357＝838,158B）**。尺 7.7〜10.7 秒＝大耀より短く、Q8-2「長すぎない」の判断はそのまま使える。

### 4-B. 必殺技（敵のカットイン／神の一撃）— **✗ 同期不可**

| 決め所 | 時刻表（commit=0） | 無音窓 | 4 場面の適合 |
|---|---|---|---|
| 敵の必殺（`special`：鬼将 R4「業斧・断岩」26・怨霊 R4「怨嗟の花」23・機工師 R5「主砲・神滅甲」24・龍神 R4「大海嘯」20・道化 R3「乱舞・狂宴」24） | 0 `enemy_turn`（0.425）→ 150〜1,050 カットイン → **200 `enemy_rise`**（1,000ms・0.64）→ **1,260 `self_hit_heavy`**（0.85・`SPECIAL_IMPACT_MS`）→ duck 0〜1,560 → 300ms で復帰 | 150〜1,260＝**1,110ms** | 窓に入るのは ≤1.0 秒の掛け声だけ。Kit の最短は 7.7 秒。カットインは**敵の見せ場**で、神の台詞を重ねると主語が割れる（決定244 RC3 の逆効果） |
| 魔獣 R3「双牙乱撃」（技名つき連撃） | 0 → カットイン → **1,100／1,280／1,600 着弾**（`MULTI_CUTIN_LEAD_MS`＋`[0,180,500]`）→ duck 〜1,900 | 同上 | 同上 |
| 神の一撃（`RESONANCE_BURST`） | 0 `burst_ready`（0.55）→ 200〜1,100 共鳴カットイン（大耀は動画 200〜1,400・決定250）→ **450 `burst_rise`**（900ms・0.595）→ 1,300 突き → **1,600 `hit_l4`**（0.85）→ 2,400 `evolve` → duck 0〜1,900 | 420〜1,600＝**1,180ms** | 同上。「神の一撃の声（BF-02／K08／K35）」は Kit 外の自作となるため **§6-3 #5／#6（CEO）** のまま。公式ボイスは BF-02 の代替にならない（2026-10-09 監査と同じ結論） |

### 4-C. 勝利＝success — **△（ジングル経路の変更が先）**

`planVictory`（`combatTimeline.ts`）：最後の着弾 F（通常カード 90／重い突き 150／⚡ 240／神の一撃 1,600／反撃 ≈438）→ 崩壊 **F+260**（stop 90＋170）→ 「撃破」拍 **F+640**（＋380）→ 報酬・`done` **F+1,490**（＋850）。

| 時刻 | 既存の音 | success（8.3s）を置く案 | 競合 |
|---|---|---|---|
| F+640（拍） | `victory_sting` 900ms（0.612）＋ **`playJingle('victory')`＝battle BGM `pause()`・ジングル HTMLAudio 0.5（iOS は `volume` 無視＝1.0・K04）・最大 9,000＋500ms フェード** | C1：拍と同時 | 3 音源同時。**ジングルは GainNode を通らず duck 不可**（`duckBgm` は `jingleTimer` 中に false）。iOS ではジングル 1.0 ＞ 声 0.68＝声が埋もれる |
| F+1,540 | sting 終了 | C2：sting の後 | ジングルは続く（同上） |
| F+1,490 | 報酬・勝利の舞台（決定226。tap で全表示） | C3：報酬表示で | 同上＋tap skip 時に声だけ残る |
| — | — | C4：ジングルを声の後に遅らせる | 決定54／226 の勝利の手触り（CEO Human QA 済み）を変える＝**本件の範囲外** |
| — | — | **C5：ジングルも GainNode 経路へ載せ、声の間だけ ×0.343**（`bgm.ts` の `jingleAudio` に `createMediaElementSource`） | 技術的に正道。**副次効果で K04（iOS でジングル 1.0）も解ける**。コスト M（`bgm.ts`＋実機 QA）。success はこの後に Pilot |

### 4-D. 危機＝crisis（HP 低下）— **◎ 推奨**

| 設計項目 | 案 |
|---|---|
| トリガ | プレイヤー HP が **`floor(maxHp × RULES.cardBonus.lowHpRatio)`（0.5）以下に初めて落ちた**バッチ（敵の攻撃・自傷どちらでも）。maxHp は難易度込み（ふつう 30→≤15／やさしい 35→≤17／むずかしい 27→≤13）。**新しい数値は作らない**（`rules.ts` 既存値・`decisionFeedback.ts` の「HPが最大の50%以下」と同じ定義） |
| 判定場所 | presentation 層（`useCombatPresentation` が `state.player.hp` と直前値を持つ）。`src/core` 不変・イベント追加 0 |
| 時刻 | **最後の自分への着弾 + `SOUND_LAYER.duckTailMs`（300）**＝決定257 の duck 復帰開始点に声の duck を合流させる（復帰ランプを挟まない）。通常攻撃：158（fast 105／heavy 228）＋300＝**≈458**／必殺：1,260＋300＝**1,560**／魔獣連撃：1,600＋300＝**1,900**。表示 HP の収束（着弾＋40＋90＋120＋340＝＋590）より 290ms 早いが、HP バーが動いている最中に声が入る方が「反応」として自然（数字は既に出ている） |
| 除外 | 同バッチが `GAME_ENDED`（敗北・終局）なら鳴らさない（敗北は `defeat_sting`＋ジングルの領分）。greeting 再生中（R1〜R2 で自傷により到達した場合）は優先度規則（§5-2）で greeting を 80ms フェードして置き換える |
| 1 戦 1 回 | `BattleScreen` の ref（`battleStartKey` でリセット）。回復で 50% を超えて再び落ちても鳴らさない |
| 発火率 | 決定246 Pilot の決定論 sim：**最低 HP ≤ 50% が 63.1〜64.2%／戦**（ふつう）。撃破最頻 R6・R5 の敵ターンを受ける率 63%＝主に **R3〜R5 の敵必殺の直後**に鳴る（鬼将・怨霊・龍神 R4／機工師 R5／道化・魔獣 R3） |
| 競合 | 次ラウンド開始の `card_draw` ×2（0.24）・押下 0.34・カード着弾 0.38〜0.85（L4 のみ声より大きい）。声 8.9 秒は R(n+1) の思考に重なる＝**greeting 11.8 秒が R1 思考に重なるのと同型**（CEO Q8-2 で許容済み）。次のカードで神の一撃が起きた場合は声の上に `burst_rise`＋`hit_l4` が乗る（声は止めない。duck は合流） |
| 実装範囲 | `sound.ts`（優先度・フェード停止・場面別 drop）／`feelTier.ts`（`VOICE_LAYER` に priority・fadeMs・crisis drop）／`BattleScreen.tsx` or `useCombatPresentation.ts`（判定＋呼び出し 1 箇所・入口で `preloadVoice(god,'crisis')`）／`OFFICIAL_VOICES` 1 行／asset 1 本／`officialVoice.test.ts`／台帳 1 行／`creditsText.ts` 1 文。`src/core` 0 |

代替トリガの比較：HP ≤ 25%（決定162 の「傷の色」第 2 段階）＝より強い瞬間だが発火率が低く Human QA で再現しにくい／敵の `charge` 予告時＝「ピンチ」の意味と合わず予告読みの主語を奪う／ラウンド固定（R5）＝状態と無関係。→ 50% を採用。

### 4-E. 疲労＝fatigue「お疲れ」— **✗（内容確認前は配置しない）**

| 候補 | 時刻表 | 判定 |
|---|---|---|
| E1：R6 開始（`RULES.lateRoundFrom` 6・到達 62.7%） | `ROUND_STARTED` 直後（`card_draw` ×2） | label「お疲れ」は「お疲れさま」＝労いの台詞である可能性が高く、戦闘中盤の「疲労」とは別物。**台詞を聴かずに置くのは危険**（決定20 の性格設定との整合も未確認） |
| E2：敗北・終局（`planResultGate`＝最後の着弾＋590＋120。龍神 R4 必殺なら ≈1,970） | `defeat_sting` 700ms（0.55）＋ `playJingle('defeat')`（BGM 即停止・HTMLAudio） | 4-C と同じジングル競合（C5 が先） |
| E3：戦闘後に Home へ戻った時（home BGM 稼働） | 画面遷移 | 戦闘外で duck 経路（`bgmGain`）は home BGM にも使えるが、`BattleScreen` 外に voice の呼び出しを増やす＝設計の拡張 |
| E4：連戦 N 戦目の入口（greeting の代わり） | 4-A と同じ | greeting と排他にすれば競合 0。内容次第で最も自然 |

→ fatigue は **CEO が公式ページで 7 本を試聴**（コスト 0・取得不要）して内容を確定してから配置を決める。本書は候補のみ。

---

## 5. 音量・BGM duck・再生競合・スマホ制約の設計

### 5-1. 音量（`feelTier.ts` に閉じる・数値はコードに書かない）

| 音源 | 実効 | 位置づけ |
|---|---|---|
| voice | **0.68**（`VOICE_LAYER.gain` 0.8 × 0.85） | impact L3（0.68）と同じ・L4（0.85）／bigMoment（0.765）未満・stateChange（0.55）以上。据え置き（Q8 で実機 PASS） |
| BGM duck 中 | 0.12（PC）／0.343（iOS） | 声の間は ×0.343（決定257 と同じ） |
| ジングル | 0.5（iOS 1.0） | **声より大きい可能性**（4-C・C5 で解決） |

場面別の音量差は付けない（1 本の係数）。必要なら `VOICE_LAYER.sceneGain` を後から足す。

### 5-2. 再生競合（1 チャネル・優先度・フェード・1 戦 1 回）

| 規則 | 内容 | 理由 |
|---|---|---|
| 1 チャネル | 現行どおり同時 1 本 | 台詞の重なりは理解不能になる |
| 優先度 | `VOICE_PRIORITY = { greeting: 1, crisis: 2, success: 3, fatigue: 3 }`。再生中より**低い**場面は鳴らさない（捨てる・キューしない）／同じ以上は置き換える | 戦闘の状態に近い声ほど優先。キューは「数秒前の状態の台詞」を鳴らすので不採用 |
| 停止 | `stopVoice(fadeMs = VOICE_LAYER.stopFadeMs 80)`：GainNode を 80ms で 0 へ ramp → `stop(at+0.08)`。ミュート・unmount は従来どおり即時でよい（無音になるため） | 現行の即時 `stop()` は波形途中で切る＝クリック音 |
| 1 戦 1 場面 1 回 | `BattleScreen` の `Set<VoiceScene>`（`battleStartKey` でリセット） | 連続トリガ（連撃で何度も 50% を跨ぐ等）の抑止 |
| 場面別 drop | `lateDropMs`：greeting 1,500（現行）／**crisis 800**／success 1,500 | crisis は着弾からの距離に意味がある。800ms 超なら「遅れて来た反応」になる |
| SE との同時 | 制御しない（SE は短く、声は L4 未満） | 決定128 の階層で既に整合 |
| duck | `duckBgm(duration + 300)` を `onStart` で呼ぶ（現行）。決定257 の duck と**合流**（`duckUntil = max`）。ジングル中は false＝勝利・敗北では duck しない（4-C） | 新しい経路を作らない |

### 5-3. スマホ制約

| 制約 | 事実 | 設計 |
|---|---|---|
| iOS `HTMLMediaElement.volume` 無視（K04） | BGM 1.0・ジングル 1.0 で鳴る | voice は `AudioBufferSourceNode→GainNode`＝**影響なし**。BGM duck は GainNode（K03 の経路切替 1 回）。ジングルだけ未対応（C5） |
| autoplay | `AudioContext` は戦闘開始の tap（`preloadSe`／`sfx.cardTap`／`playTrack`）で running。voice は timer から `start()` するが、running な ctx では gesture 不要（Pilot v1 の SP 4/4・CEO iPhone Q8-3 PASS） | 変更不要。iOS の割り込み（着信・ロック）後は ctx が `interrupted`→`getCtx()` の `resume()` 試行に任せる（決定257 §7 #2 と同じ既知） |
| サイレントスイッチ | Pilot v1 §5 #4 のとおり未確認 | Pilot の実機 QA 1 問に含める（greeting と同じ経路なので挙動は同じはず） |
| decode 遅延 | MP3 ≈140〜250KB の `decodeAudioData` は入口の 0.9〜2.8 秒で十分（Pilot v1 実測：SP で取得 1,502ms・start 5,168ms） | crisis も入口で先読み（+143KB）。success／fatigue は使うときに（勝利は予測不能だが `GAME_ENDED` から拍まで 640ms あり、drop 1,500 で吸収） |
| メモリ | decode 後の PCM は **48kHz × ch × 4B × 秒**＝11.8 秒で 2.3MB（mono）〜4.5MB（stereo）、蒼毘 fatigue 15.8 秒で 3.0〜6.1MB。現行 `voiceBuffers` は**無期限キャッシュ**（神を替えるたび増える） | **神単位で捨てる**：新規開始時に `releaseVoicesExcept(godId)`（Map から他神を delete）。上限は 1 神 4 本 ≈ 9〜19MB |
| 転送量 | 1 戦 ≤ 1 神分 582〜707KB（全 4 本の場合）。Vercel の静的配信は `ETag` 再検証（2 戦目以降 304） | 遅延ロードのまま。LCP／CLS 影響 0 |
| 低速回線 | 取得が入口に間に合わなければ drop（無音） | fallback トーンは作らない（Kit 原本以外を「声」にしない） |

### 5-4. 権利・表示の設計（§6-3 #5 に触れない範囲）

- 配信は Kit 原本の無改変のみ。`officialVoice.test.ts` が sha256 を固定
- credits（`creditsText.ts`）は「大耀の音声（あいさつ・ピンチ）」のように**場面を列挙した事実文**に改訂。「公式ボイス」「神の音声」の総称は禁止語テストのまま
- 台帳 §3-L：1 本 1 行（Pilot v1 と同じ列）。Terms 列「1.0.0（Updated 2026-10-08）・確認日」

---

## 6. 次の Pilot 推奨（1 つ）

### 6-1. 推奨：**大耀 × crisis（ピンチ）× 「HP ≤ 50% 初回到達の敵ターン・最後の着弾＋300ms」・1 戦 1 回**

| 項目 | 内容 |
|---|---|
| 素材 | `voice/v1/taiyo/taiyo-crisis.mp3`・142,893B・sha256 `3df318eda81d94bf1fdb99ac609026cdb4aa7c873c7ea30e59056d3ca5140098`・推定 8.9 秒（配置前に実測） |
| 理由 1（情報価値） | greeting は「戦闘前の儀式」で PASS した。次に分からないのは「**戦闘中**に神が口を開いて邪魔にならないか」。これが NO なら 28 本計画は greeting 7 本（4-A）に縮む。crisis は 4 場面の中で唯一、戦闘中に置く根拠（ゲーム規則の「ピンチ」定義）があり、この問いに最短で答える |
| 理由 2（Player Value） | 決定244 RC3「反応の主語が HUD」への直接の答え。HP が半分を切った瞬間に**神が自分を見て声を出す**＝「自分の神が目の前にいる」（Q8-1）を戦闘中に延長する |
| 理由 3（比較対象） | 大耀は決定218／232／250／257／Voice Pilot v1 の Human QA 基準神。龍神 R4「大海嘯」（20）はCEO が決定213／218 で繰り返し見た場面で、**同じ戦闘で再現できる** |
| 理由 4（規則との一致） | 閾値 0.5＝`RULES.cardBonus.lowHpRatio`（条件⚡「HP が最大の 50% 以下」）・福永「大勝負」0.5 と同じ語彙。新設値 0・`src/core` 0 |
| 理由 5（コスト） | S：runtime 3 ファイル（`sound.ts`・`feelTier.ts`・`BattleScreen.tsx`／`useCombatPresentation.ts`）＋ data 1 行 ＋ asset 1 本（+143KB 遅延）＋ test ＋ 台帳 1 行 ＋ credits 1 文。Gate は `acceptance.mjs` の拡張で回せる |
| 却下した案 | 7 神 greeting 展開（情報価値が低い：技術は Pilot v1 と同一。**本 Pilot の後に data-only で続ける**）／success（C5 のジングル経路変更が先・M）／fatigue（内容未確認）／カットイン同期（尺で不成立） |
| リスク | ①台詞の内容が「ピンチ」の文脈と合わない可能性（未試聴。Pilot 着手時に 1 本取得して AI が尺・内容を確認し、CEO が公式ページで試聴）②R(n+1) の思考 8.9 秒に声が重なる（Q8-2 と同型だが、戦闘中は注意資源が違う）③greeting との 2 本目で優先度・フェード・キャッシュ解放の新規コードが入る（純関数テストで固定）④iOS 実機（duck 合流・サイレントスイッチ） |
| Gate 案（自動） | vitest：`officialVoice.test.ts`（範囲 `['taiyo:greeting','taiyo:crisis']`・sha256 2 本・優先度の純関数・フェード停止・1 戦 1 回・crisis drop 800）＋既存 `sound`／`soundLayer`／`battleEntrance`／tsc／oxlint／build。Playwright：`acceptance.mjs` を拡張し、龍神 R4 必殺で HP ≤ 50% に落ちる固定 seed で「crisis start 1 回・開始時刻＝最後の着弾＋300±50ms・duck 合流（復帰ランプ無し）・greeting と二重に鳴らない・ミュート時 0」を PC／SP × ミュート有無の 4 ケースで計測 |
| Gate 案（Human QA・3 問 YES／NO） | Q1 ピンチの声で「神が自分を見ている」と感じたか（NO→撤去・原本のみ残す）／Q2 次のラウンドの思考を邪魔しなかったか（NO→crisis を「敵必殺の直後だけ」に限定して再 QA 1 回）／Q3 iPhone で BGM が下がり・ミュートで止まり・greeting の後に自然につながったか（NO→`VOICE_LAYER` の係数調整） |
| 統合順序 | Lane 1（RC 制作中・`SevenGodsGame-lane2b`）が触る `BattleScreen.tsx`／`sound.ts` と**同一ファイル**になり得るため、**Lane 1 の RC 統合後**に Pilot branch を切る（Lane 間同一ファイル編集禁止・2026-10-17 CEO 方針） |
| CEO 判断 | **不要**（§6-2：既存仕様の範囲・素材は Kit 公式・規約 §5 内・`src/core` 0）。必要になるのは Production 公開時（§6-3 #8）と、CEO が「戦闘中のボイス自体を望まない」と表明した場合のみ。本書の推奨は AI 判断として記録（§6-6） |

### 6-2. その後の順序（AI 案・本書では着手しない）

1. **大耀 crisis Pilot**（本書 §6-1）→ Human QA
2. **7 神 greeting 展開**（data 6 行・838KB・台帳 VOICE-KIT-02〜07・CEO が 6 神の声を試聴＝決定20 の性格整合）
3. **C5 ジングル GainNode 化**（K04 も解消）→ **success**（7 神）
4. **fatigue** は CEO 試聴後に配置を決定（E4「連戦の入口」が有力候補）
5. 28 本到達後：`OFFICIAL_VOICES` は 7 × 4 の完全表に。credits 文は「神の音声（あいさつ・ピンチ・勝利・お疲れ）」の列挙形へ（禁止語規則は維持）

---

## 7. 本書の制約と証拠

- 取得した MCP 返答（`initialize`／`tools/list`／`get_usage_terms`／`get_voice` × 7）と公式 `RIGHTS.md`／`manifest.json`／ページ HTML は session scratchpad のみに保存（repo 外）。**音声本体は 0 本**（`HEAD` のみ 2 本）
- 本 worktree `SevenGodsGame-lane3v` は `origin/master 1ce9876` から新規作成。`git status` は本書 1 ファイルのみ。`git add docs/OFFICIAL_VOICE_EXPANSION_AUDIT_V1.md` で staged → commit 1 件。push・merge・tag・deploy・削除・`git add .` は 0
- 他 worktree（`SevenGodsGame`・`SevenGodsGame-lane2b`）は未使用（読み取りもしていない）。vitest／build／dev サーバー未起動
- 尺の推定（§2-2）は仮定つき（全本 CBR 128kbps）。Pilot 着手時に 1 本ずつ実測して置き換える
- 参照：`docs/CREATOR_KIT_V1_1_AUDIT.md`／`docs/OFFICIAL_VOICE_PILOT_V1.md`／`docs/PRACTICAL_QA_V3_RESULT.md` §5／`docs/V1_0_RC_GATE.md` G9・K36／`docs/DECISION257_SOUND_LAYER_V1_PILOT.md`／`docs/evidence/commercial-presentation-audit/sound-timeline.md` §3-6・§4／`docs/ASSET_RIGHTS_LEDGER.md` §1-4・§3-L／`docs/DECISIONS.md` 決定244・246・254・257
