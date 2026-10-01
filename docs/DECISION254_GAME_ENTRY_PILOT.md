# 決定254 — Game Entry / Home Immersion「降臨の間」Pilot（2026-10-01）

**状態：AUTOMATED GATE PASS → HUMAN QA READY（STOP）**。merge／push／deploy 0。Production = master = origin/master `98067ec`（runtime `4d7b940`・決定253 LIVE）不変。
Preflight：`docs/GAME_ENTRY_IMMERSION_PREFLIGHT.md`（docs-only commit `83f25e2`・保持）。Pilot GO は CEO（2026-10-01・Preflight C3 を正式承認）。実装方式・Gate 判定は AI 判断（CLAUDE.md §6-2）。
branch `feat/d254-battle-entrance`（`98067ec` → `4a887f7`（Preflight docs 取り込み）→ 本 Pilot commit。worktree `C:/Users/kimi1/SevenGodsGame-d254`）。evidence：`docs/evidence/decision254/pilot/`（表はすべて `gen254.mjs.txt` で JSON から生成）。

## 0. 結論（先に）

| 項目 | 結果 |
|---|---|
| implementation diff | runtime **6 ファイル＋新規 1**：`BossEntrance.tsx`（Full／Short／reduced の時刻表・skip・SE 予約・時計の同期）／`battleEntrance.ts`（新規：セッション変数＋先読み）／`BattleScreen.tsx`（godId・variant 配線、mount 時の即時 `sfx.bossEntrance()` を廃止）／`battle.css` 末尾追記（`.battle-entrance-*`・keyframes 7 本）／`sound.ts`（`sfx.godDescend`＝既存 `resonance_gain` を rate 0.8）／`DeckBuilderScreen.tsx`・`FirstBattleBrief.tsx`（先読み各 1 effect）。テスト新規 1（`battleEntrance.test.ts`・14 件）。**`src/core` 0・`enemyVfxTiming.ts` 0・`godStrikeVideo.ts` 0・`bgm.ts` 0・数値 0・save v9 不変・gameVersion 不変・新規 asset 0（画像／動画／音声の生成 0・H3／fal.ai 0）・新規 storage key 0** |
| exact timeline（実測・root animation 開始基準） | Full：神紋 385／神 835〜839／敵 1635〜1640／舞台 1651〜1665／**操作可 2419〜2434**／消滅 2825〜2828／SE 神紋 259〜270・顕現 1514〜1519 ms（PC 1508×660・SP 390×844・SP 390×660 とも）。Short：§3。reduced：§3 |
| skip | タップ（card／End Round／Oracle の真上）・Enter・Space・Esc の全経路で入口が消え、**手札・AP・ラウンド・託宣残・保存 state が不変（貫通 0）**、未再生の顕現 SE は鳴らない（§3 T3） |
| PC／SP | PC：神＝左（x 30%）・敵＝右（x 68%）の対峙。敵は原画の向き（左向き 4 体＝神の方を向く。決定247 の HUD 反転は `.enemy-avatar` のみで入口は対象外＝矛盾なし）。SP：神＝中央上 → 舞台開示で下へ沈み、敵が上中央。overflow 0・横スクロール 0 |
| performance | SP 390×844 入口中の >33ms frame：**実 Chrome（GPU）After [2,2,2,2,4,7]（中央値 2・最大 7 ＜ 8）**／Before [3,3,3,5,5,7]。headless（GPU なし）After 中央値 3（11 本中 9 本 ≤ 6・外れ値 14／11 は software raster 特有＝known #9）。frame median 16.7ms。HUD 箱：入口消滅直後 vs +2s 差 0・Before vs After 差 0。CLS Before と同値。click 後に取得する入口素材 **0**（Before 3＝`resonance_gain`／`boss_entrance`／`front_640`）・click 後 bytes PC −151KB／SP −272KB |
| metric lock（T8） | 同 seed・同 action 列・3 ケース × PC／SP／SP660＝14 対局：保存 GameState（hand／AP／HP／block／enemy HP・block／託宣残／共鳴／intent／rngCursor／score／status）147 snapshot＋final 7＝**154 行 不一致 0**（§6） |
| regression | 決定247 敵反転・決定249 反応集合・決定250 God Strike cut-in（14/14 発火・z 4・入口 z 5・selector／素材／音 非共有）・決定252 予告／必殺・決定253 託宣表示：Before／After 同一（§6） |
| tests | tsc 0／oxlint 0／**vitest 1,289 PASS**（＋14 新規）／build OK `index-ePtASz7H.js`（§5） |
| Human QA | READY：Before `:4271`（Production dist `index-CzXreZSv.js`）／After `:4272`（§8） |

## 1. implementation diff（`git diff 4a887f7`）

| ファイル | 変更 |
|---|---|
| `src/components/battle/BossEntrance.tsx` | props `godId`・`variant`。時刻表 `BATTLE_ENTRANCE_TIMING`（full／short／reduced）と定数 `BATTLE_ENTRANCE_FULL_MS` 2,800／`_FULL_CONTROL_MS` 2,400／`_SHORT_MS` 1,500／`_SHORT_CONTROL_MS` 1,150／`_REDUCED_MS` 900／`_REDUCED_CONTROL_MS` 720／`_SKIP_FADE_MS` 200（`enemyVfxTiming.ts` には置かない）。mount 時に root の CSS animation の `ready` を待ち、**root animation の startTime を基準に**入口配下の全 animation の startTime を揃え、SE（神紋 250／顕現 1,500）・操作開放・消滅を「基準からの経過」を差し引いて予約（ready が来ない環境は 400ms で開始）。skip＝`pointerdown`（root）＋`keydown`（Enter／Space／Esc・capture）→ 予約を全部取り消し `.is-skipped`（200ms fade）。`absorbSkipTail` が直後の `click`／`keyup` を 1 回だけ捕捉して HUD へ渡さない。reduced は `prefersReducedMotion()`（決定250 と同じ関数）。神画像の `onError` で見出しだけ残す |
| `src/components/battle/battleEntrance.ts`（新規） | `takeBattleEntranceVariant()`：モジュール変数（メモリのみ・storage 0）で最初の 1 回だけ `'full'`、以後 `'short'`。`preloadBattleEntrance(godId, enemyId)`：神 `front_640`・敵 art・舞台背景を `new Image()`＋`decode()`、SE 2 本を `preloadSe()` |
| `src/components/battle/BattleScreen.tsx` | `battleStartKey` 増分時に `takeBattleEntranceVariant()` を消費し `<BossEntrance godId variant>` へ。mount 直後の `sfx.bossEntrance()` を廃止（入口が時刻どおり予約）。`preloadSe()` は従来どおり |
| `src/components/battle/battle.css`（末尾追記のみ） | `.battle-entrance`（fixed・z 5・不透明 `#05060d`・`pointer-events:auto`→`.is-released` で none）／`-full`・`-short`・`-reduced` の root fade-out（2.4s+0.4／1.15s+0.35／0.72s+0.18）／`.is-skipped` 0.2s／`-bg`（既存 `boss-entrance-bg` 再利用）／`-god-slot`・`-sigil`（`--god-accent`＝`GOD_THEME_COLOR`・conic／radial gradient・CSS のみ）・`-god`・`-god-title`／敵は既存 `.boss-entrance-*` の中身を P4 の時刻へ／skip ヒント／reduced（animation none・静止）／SP ≤700px で START を省略／PC ≥900px の対峙配置。keyframes 新規 7 本（out／in／sigil／sigil-dim／descend／sink／hint／face）＝transform／opacity のみ |
| `src/components/battle/sound.ts` | `sfx.godDescend = () => playBuffer('resonance_gain', { gain: SE_GAIN.stateChange, rate: 0.8 })`（+2 行） |
| `src/components/setup/DeckBuilderScreen.tsx`／`src/components/FirstBattleBrief.tsx` | mount 時に `preloadBattleEntrance()`（表示・操作は不変） |
| 変えていないもの | `src/core/**`・`enemyVfxTiming.ts`・`godStrikeVideo.ts`・`BattleResonanceCutin.tsx`・`bgm.ts`（BGM 仕様不変）・`rules.ts`・`GameFlow.tsx`・`HomeScreen.tsx`・storage・save v9・gameVersion・enemies／cards／gods／otomo／HP／AP／score／seed／7R・決定250／252／253 の表示 |

## 2. exact timeline（設計＝Preflight §4／実測＝§3）

| Phase | Full（初回） | Short（再訪・Retry） | reduced |
|---|---|---|---|
| P0 暗転（不透明で mount） | 0〜250 | 0〜100 | 0（静止で同時表示） |
| P1 神紋・光＋SE `resonance_gain`×0.8 | 250〜750（SE 250） | なし（SE 100） | SE 0 |
| P2 神降臨（`front_640`＋「{神名} 降臨」） | 600〜1,500 | 100〜550 | 静止 |
| P3 SE `boss_entrance` | 1,500 | 450 | 150 |
| P4 舞台・敵の顕現（対峙） | 1,500〜2,400 | 450〜1,150 | 静止 |
| P5 HUD 開示（root opacity 1→0・HUD は animate しない） | 2,400〜2,800 | 1,150〜1,500 | 720〜900 |
| 操作可能 | **2,400** | **1,150** | **720** |
| skip 後 | 200ms で消滅（HUD 即操作） | 同 | 0ms |

**読み方**：t＝0 は入口 root の CSS animation の startTime（compositor が描き始めた時刻＝JS の start() の基準）。Before（旧 BossEntrance）は JS の時計が mount 起点のため rel が負になる箇所がある（参考）。mount→anim＝click 後に入口が mount されてから最初の描画 frame まで（headless の重い 1 frame。Before も同程度）。After は PC／SP／SP660 とも **神紋 384〜385・神 834〜854・敵 1635〜1647・舞台 1650〜1673・操作可 2418〜2438・消滅 2825〜2852・SE 259〜269／1506〜1525**＝設計（250〜750／600〜1,500／1,500〜／2,400／2,800／250／1,500）に対し ±50ms（hit test・opacity 判定は 1 frame 粒度）。入口中（t≈1,000）の hit test は End Round／card／Oracle とも false＝入力ロック。CLS・横スクロール・console error・入口の残骸（leftover）はすべて Before と同じ 0。

### T1 Full（初回）— 各時刻（ms・root animation startTime 基準）／計測 2026-10-01T11:59:10.998Z

| run | mount→anim | 神紋>0.3 | 神>0.5 | 敵art>0.5 | 舞台>0.5 | 操作可（pe none） | End Round 押せる | 消滅 | SE1（神紋） | SE2（顕現） | 入口中 hit（t≈1000） | frames >33 / n | median | CLS | error |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pc/before | 426 | — | — | 241 | -426 | -426 | -426 | 1083 | — | -206 | — | 6 / 39 | 25.7 | 0.00002 | 0 |
| pc/after | 387 | 385 | 854 | 1647 | 1673 | 2438 | 2438 | 2852 | 261 | 1525 | end false／card false／oracle false | 10 / 125 | 21.4 | 0.00002 | 0 |
| sp/before | 237 | — | — | 202 | -237 | -237 | -237 | 1276 | — | 10 | — | 4 / 65 | 19.1 | 0.00112 | 0 |
| sp/after | 254 | 385 | 834 | 1635 | 1651 | 2435 | 2435 | 2840 | 269 | 1519 | end false／card false／oracle false | 2 / 169 | 16.8 | 0.00112 | 0 |
| sp660/before | 77 | — | — | 201 | -77 | -77 | -77 | 1315 | — | 59 | — | 3 / 71 | 17.5 | 0.00142 | 0 |
| sp660/after | 347 | 384 | 835 | 1635 | 1650 | 2418 | 2418 | 2825 | 259 | 1506 | end false／card false／oracle false | 2 / 169 | 16.8 | 0.00142 | 0 |

### T1 転送量（click 後の request・bytes）と入口素材の先読み

| run | click 後 request 数 | click 後 bytes | click 後に取得した入口素材 | click 前に取得済みの入口素材（数） |
|---|---|---|---|---|
| pc/before | 25 | 2,637,176 | se/resonance_gain.wav・se/boss_entrance.wav・gods/taiyo/front_640.webp | 14 |
| pc/after | 22 | 2,486,238 | 0 | 18 |
| sp/before | 27 | 2,851,626 | se/resonance_gain.wav・se/boss_entrance.wav・gods/taiyo/front_640.webp | 15 |
| sp/after | 23 | 2,579,654 | 0 | 18 |
| sp660/before | 25 | 2,637,176 | se/resonance_gain.wav・se/boss_entrance.wav・gods/taiyo/front_640.webp | 15 |
| sp660/after | 25 | 2,805,776 | 0 | 18 |


**先読み**：After は click 後に入口素材（SE 2 本・神 `front_640`・舞台・敵 art）を 1 つも取得しない（デッキ構築画面の mount 時に取得・decode 済み）。click 後 bytes は PC −151KB／SP −272KB（同じ bytes を前倒ししただけ。追加転送 0B）。BGM（`battle.webm` 1.9MB）の取得時刻・音量は変更なし。
## 3. first／revisit／retry／skip／reduced／continue（実測）

### T2 Revisit（同セッション 2 戦目・ホーム経由・reload 後）

| vp | 1 戦目 variant／消滅 | 結果到達 | もう一度 variant／操作可／消滅／SE | ホーム経由 variant／消滅／見出し | reload→続きから 入口 | reload→新規 variant／消滅 | error |
|---|---|---|---|---|---|---|---|
| pc | full／2807 | true／true | short／1188／1580／-133:0.11s・128:0.15s・475:0.96s | short／1512／null | なし | full／2852 | 0 |
| sp | full／2818 | true／true | short／1175／1518／-57:0.11s・112:0.15s・466:0.96s | short／1531／null | なし | full／2861 | 0 |


**判定**：1 戦目 Full（2,807〜2,818）→ 7R 戦って結果 →「もう一度」Short（操作可 1,175〜1,188・消滅 1,518〜1,580・SE 112〜128／466〜475）→ ホーム経由の新規開始も Short → reload → 「続きから」は入口なし（mount 13〜31ms・SE 0）→ reload → 新規開始は Full に戻る。判定はモジュール変数のみ（storage 不使用。save・gameVersion 不変）。「ホーム経由」列の見出しは入口消滅後に読んだため「—」（見出しの正しさは 7 柱の表）。
### T3 Skip（入力貫通 0・未再生 SE キャンセル）

| run | 入力時刻（rel） | 入口中の入力 | skip→消滅 | skip→End Round 押せる | save 不変 | UI 不変（手札/AP/R/残り） | 手札 before→after | 顕現 SE が skip 後に鳴った | SE（rel） | 入力イベント（target） | error |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pc/card@300 | 312 | true | 486 | 486 | true | true | 5→5 | false | -189:0.11s・257:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| pc/end@300 | 304 | true | 225 | 225 | true | true | 5→5 | false | -188:0.11s・253:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| pc/oracle@300 | 305 | true | 234 | 234 | true | true | 5→5 | false | -174:0.11s・266:0.15s | click→・pointerdown(入口)→battle-entrance-god・pointerup→battle-entrance-god・click→battle-entrance-god | 0 |
| pc/Enter@300 | 304 | true | 238 | 238 | true | true | 5→5 | false | -176:0.11s・269:0.15s | click→・keydown(入口)→card-view card-view-ex・keyup→card-view card-view-ex | 0 |
| pc/Space@300 | 307 | true | 223 | 223 | true | true | 5→5 | false | -195:0.11s・262:0.15s | click→・keydown(入口)→card-view card-view-ha・keyup→card-view card-view-ha | 0 |
| pc/EscapeOracle@300 | 305 | true | 217 | 217 | true | true | 5→5 | false | -206:0.11s・303:0.15s | click→・keydown(入口)→divination-choice・keyup→divination-choice | 0 |
| pc/card@60 | 90 | true | 224 | 224 | true | true | 5→5 | false | -165:0.11s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| pc/card@1800 | 1814 | true | 226 | 226 | true | true | 5→5 | false | -217:0.11s・287:0.15s・1548:0.96s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/card@300 | 307 | true | 223 | 223 | true | true | 5→5 | false | 17:0.11s・278:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/end@300 | 304 | true | 226 | 226 | true | true | 5→5 | false | 13:0.11s・254:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/oracle@300 | 305 | true | 215 | 215 | true | true | 5→5 | false | 9:0.11s・286:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/card@1800 | 1808 | true | 212 | 212 | true | true | 5→5 | false | 9:0.11s・267:0.15s・1517:0.96s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |


**判定**：12 経路すべて入口中（animation 開始から ≈300ms／60ms／1,800ms）に入力し、skip → 消滅 212〜238ms（`pc/card@300` の 486ms は headless PC の長い frame 1 本。設計 200ms＋1 frame）。保存 GameState・手札 5→5・AP・ラウンド・託宣残 すべて不変＝**貫通 0**。顕現 SE（0.96s）は @300／@60 で鳴らない（予約取消。@60 では神紋 SE も取消）。@1,800 は既に鳴った顕現 SE を止めない（設計どおり）。入力イベントの target はすべて入口（`battle-entrance-bg`／`-god`）か、key の場合はフォーカス中の card／Oracle（capture で入口が先に受け、直後の keyup／click は `absorbSkipTail` が捨てる）。
### T4 Reduced motion

| run | 消滅 | 操作可 | 神/敵 表示 | SE | animation（transform 系） |
|---|---|---|---|---|---|
| pc/before | 667 | -252 | 神 —／敵 -252 | 50ms 0.11s×1・60ms 0.96s×1 | — |
| pc/after | 990 | 752 | 神 -303／敵 -303 | 27ms 0.11s×1・42ms 0.15s×0.8・160ms 0.96s×1 | battle-entrance-out[opacity] |
| sp/before | 534 | -217 | 神 —／敵 -217 | 456ms 0.96s×1 | — |
| sp/after | 917 | 734 | 神 -265／敵 -265 | 26ms 0.11s×1・37ms 0.15s×0.8・152ms 0.96s×1 | battle-entrance-out[opacity] |


**判定**：After は神と敵を最初から静止で同時表示（godVisible／enemyArtVisible＝mount frame）、入口配下の animation は root の opacity（`battle-entrance-out`）だけ＝transform 系 0。消滅 917〜990・操作可 734〜752（設計 900／720＋1 frame。click 起点の絶対値は mount 56〜151 → 消滅 1,333〜1,349）。Before（旧 reduced 900ms）の rel 値は旧実装の時計差の参考値（絶対値：消滅 968〜972）。SE は reduced でも 2 本（音は motion ではない）。
### T6 続きから（入口なし）／T7 初陣・Daily

| run | variant | 入口 | 消滅（rel） | SE | End Round 有効 | click 後に取得した入口素材 | error |
|---|---|---|---|---|---|---|---|
| t6-resume/pc/before | — | なし | — | 0 | — | — | 0 |
| t6-resume/pc/after | — | なし | — | 0 | — | — | 0 |
| t7-first/pc/before | legacy | あり | 1171 | -139:0.11s・-100:0.96s | true | se/resonance_gain.wav・se/boss_entrance.wav・gods/ebisu/front_640.webp・backgrounds/stages/01-trial-shadow.webp・enemies/datenshi/art.webp | 0 |
| t7-first/sp/before | legacy | あり | 1326 | 100:0.11s・101:0.96s | true | se/resonance_gain.wav・se/boss_entrance.wav・gods/ebisu/front_640.webp・backgrounds/stages/01-trial-shadow.webp・enemies/datenshi/art.webp | 0 |
| t7-first/pc/after | full | あり | 2867 | -130:0.11s・263:0.15s・1507:0.96s | true | 0 | 0 |
| t7-first/sp/after | full | あり | 2834 | 43:0.11s・276:0.15s・1529:0.96s | true | 0 | 0 |
| t7-daily/pc/before | legacy | あり | 1184 | -181:0.11s・-158:0.96s | true | DAILY tag true | 0 |
| t7-daily/pc/after | full | あり | 2866 | -158:0.11s・269:0.15s・1513:0.96s | true | DAILY tag true | 0 |


**判定**：続きからは Before／After とも入口なし・SE なし。初陣（出陣する）は After で Full（PC 2,867／SP 2,834）・`FirstBattleBrief` の先読みで click 後の入口素材 0（Before は 5 本を click 後に取得）。Daily は After で Full・DAILY タグ表示・End Round 有効。
### 7 柱（選んだ神の見出し・画像・神色）

| god idx | 見出し | img | 敵名 | --god-accent | variant | 消滅 | error |
|---|---|---|---|---|---|---|---|
| 0 | 恵比寿 降臨 | /assets/gods/ebisu/front_640.webp | 試練の影 | #ff6b5e | full | 2819 | 0 |
| 1 | 大耀 降臨 | /assets/gods/taiyo/front_640.webp | 業斧の鬼将 | #e8b33d | full | 2869 | 0 |
| 2 | 蒼毘 降臨 | /assets/gods/sobi/front_640.webp | 藍花の怨霊 | #4d9fff | full | 2867 | 0 |
| 3 | 才華 降臨 | /assets/gods/saika/front_640.webp | 銀甲の機工師 | #c96bff | full | 2836 | 0 |
| 4 | 寿楽 降臨 | /assets/gods/juraku/front_640.webp | 双牙の魔獣 | #6ec972 | full | 2819 | 0 |
| 5 | 福永 降臨 | /assets/gods/fukuei/front_640.webp | 蒼海の龍神 | #3ddbb0 | full | 2839 | 0 |
| 6 | 笑蓮 降臨 | /assets/gods/shouren/front_640.webp | 乱舞の道化 | #ff7fb3 | full | 2838 | 0 |


**判定**：7 柱すべて見出し「{神名} 降臨」・`front_640.webp`・`--god-accent`＝`GOD_THEME_COLOR[godId].base`・敵名が選択どおり。HUD の神アバターと同じ画像（correct selected God）。
## 4. performance（SP 390×844 headless Chromium・GPU なし＝参考値。実機は Human QA Q5）

**結論**：>33ms frame（入口中・SP 390×844）は **実 Chrome（GPU）After 6 本＝[2,2,2,2,4,7]（中央値 2・最大 7 ＜ 8）**、Before 同条件＝[3,3,3,5,5,7]（中央値 5）。headless（GPU なし・software raster）After 8＋3 本＝[1,2,2,3,3,3,3,14]＋[11,3,2]（中央値 3）、Before＝[1,2,2,2,3,3,4,4]＋[4,3,2]。headless の外れ値（14・11）は 1,100〜2,200ms に 40〜130ms の frame が連続する software raster 特有の型で、GPU 付きでは再現しない（Human QA Q5 で実機確認。known issue #9）。frame median は After 16.7ms（60fps）。入口は Before の 1.5s に対し 2.8s と窓が長いため本数は増えやすいが、1 秒あたりでは After の方が少ない。

### 性能（SP 390×844 headless・入口中の frame）

| run | n | >33ms | >50ms | max | median | 最初の frame | CLS | click 後 bytes | 入口素材 click 後 |
|---|---|---|---|---|---|---|---|---|---|
| before/1 | 72 | 4 | 3 | 133.4 | 17.6 | 133.4 | 0.00112 | 2,947,870 | 3 |
| after/1 | 148 | 11 | 7 | 114.5 | 17 | 114.5 | 0.00112 | 2,486,238 | 0 |
| before/2 | 72 | 3 | 2 | 131.7 | 17.7 | 131.7 | 0.00112 | 2,733,420 | 3 |
| after/2 | 166 | 3 | 2 | 100.7 | 16.7 | 100.7 | 0.00112 | 2,579,654 | 0 |
| before/3 | 70 | 2 | 2 | 150.4 | 18.2 | 150.4 | 0.00112 | 2,733,420 | 3 |
| after/3 | 165 | 2 | 1 | 85.4 | 16.8 | 15.7 | 0.00112 | 2,486,238 | 0 |

### 性能（追加サンプル perf2：headless N 本＋実 Chrome headed（GPU）N 本・SP 390×844・入口中の >33ms frame）

| 環境 | run | n | >33ms | >50ms | max | median |
|---|---|---|---|---|---|---|
| headless | before/1 | 60 | 2 | 2 | 156.5 | 21.9 |
| headless | after/1 | 168 | 3 | 2 | 126 | 16.7 |
| headless | before/2 | 70 | 3 | 2 | 150.9 | 17.7 |
| headless | after/2 | 162 | 3 | 3 | 132 | 16.8 |
| headless | before/3 | 55 | 2 | 1 | 149.1 | 22.3 |
| headless | after/3 | 167 | 2 | 2 | 113.6 | 16.7 |
| headless | before/4 | 64 | 4 | 3 | 135.9 | 19.6 |
| headless | after/4 | 170 | 1 | 1 | 107.1 | 16.8 |
| headless | before/5 | 69 | 4 | 4 | 126.2 | 18.8 |
| headless | after/5 | 169 | 3 | 2 | 124.9 | 16.9 |
| headless | before/6 | 76 | 3 | 2 | 128.7 | 17.2 |
| headless | after/6 | 152 | 3 | 1 | 83 | 16.9 |
| headless | before/7 | 76 | 2 | 1 | 91 | 17 |
| headless | after/7 | 168 | 2 | 1 | 83.4 | 16.8 |
| headless | before/8 | 78 | 1 | 1 | 97.3 | 16.9 |
| headless | after/8 | 122 | 14 | 10 | 132.8 | 17 |
| headed(GPU) | before/1 | 6 | 5 | 3 | 612.4 | 57.5 |
| headed(GPU) | after/1 | 165 | 4 | 4 | 98 | 16.7 |
| headed(GPU) | before/2 | 75 | 3 | 1 | 121 | 16.7 |
| headed(GPU) | after/2 | 172 | 2 | 1 | 71.5 | 16.7 |
| headed(GPU) | before/3 | 70 | 3 | 3 | 213.6 | 16.7 |
| headed(GPU) | after/3 | 171 | 2 | 2 | 114.9 | 16.7 |
| headed(GPU) | before/4 | 58 | 7 | 3 | 194.3 | 16.7 |
| headed(GPU) | after/4 | 171 | 2 | 1 | 59 | 16.7 |
| headed(GPU) | before/5 | 76 | 3 | 2 | 109.6 | 16.7 |
| headed(GPU) | after/5 | 167 | 2 | 1 | 103.3 | 16.7 |
| headed(GPU) | before/6 | 31 | 5 | 4 | 491 | 16.7 |
| headed(GPU) | after/6 | 152 | 7 | 3 | 206.3 | 16.7 |

summary: {"headless":{"before":{"runs":8,"over33":[1,2,2,2,3,3,4,4],"over33Median":3,"over33Max":4,"medianFrame":[21.9,17.7,22.3,19.6,18.8,17.2,17,16.9],"max":[156.5,150.9,149.1,135.9,126.2,128.7,91,97.3]},"after":{"runs":8,"over33":[1,2,2,3,3,3,3,14],"over33Median":3,"over33Max":14,"medianFrame":[16.7,16.8,16.7,16.8,16.9,16.9,16.8,17],"max":[126,132,113.6,107.1,124.9,83,83.4,132.8]}},"headed":{"before":{"runs":6,"over33":[3,3,3,5,5,7],"over33Median":5,"over33Max":7,"medianFrame":[57.5,16.7,16.7,16.7,16.7,16.7],"max":[612.4,121,213.6,194.3,109.6,491]},"after":{"runs":6,"over33":[2,2,2,2,4,7],"over33Median":2,"over33Max":7,"medianFrame":[16.7,16.7,16.7,16.7,16.7,16.7],"max":[98,71.5,114.9,59,103.3,206.3]}}}

### T5 Layout：HUD 箱（入口消滅直後 vs +2s・Before vs After）

| vp | HUD | After 消滅直後 | After +2s | 差 | Before +2s | Before/After 差 |
|---|---|---|---|---|---|---|
| pc | .battle-topbar | [134,41,1240,43] | [134,41,1240,43] | 0 | [134,41,1240,43] | 0 |
| pc | .enemy-plate | [155,113,456,86] | [155,113,456,86] | 0 | [155,113,456,86] | 0 |
| pc | .player-plate | [643,113,383,78] | [643,113,383,78] | 0 | [643,113,383,78] | 0 |
| pc | .hand | [134,490,1118,164] | [134,490,1118,164] | 0 | [134,490,1118,164] | 0 |
| pc | .battle-dock | [134,426,1240,228] | [134,426,1240,228] | 0 | [134,426,1240,228] | 0 |
| pc | .divination-panel | [134,426,1240,56] | [134,426,1240,56] | 0 | [134,426,1240,56] | 0 |
| pc | .end-round-button | [1262,524,112,62] | [1262,524,112,62] | 0 | [1262,524,112,62] | 0 |
| pc | .god-otomo-plate | [1059,113,294,76] | [1059,113,294,76] | 0 | [1059,113,294,76] | 0 |
| pc | .intent | [164,167,44,25] | [164,167,44,25] | 0 | [164,167,44,25] | 0 |
| pc | .enemy-avatar | [238,203,291,194] | [236,199,294,196] | 4px（enemy-idle の呼吸 transform・layout ではない） | [238,203,290,194] | 4px（enemy-idle の呼吸 transform・layout ではない） |
| sp | .battle-topbar | [6,41,378,43] | [6,41,378,43] | 0 | [6,41,378,43] | 0 |
| sp | .enemy-plate | [23,109,124,76] | [23,109,124,76] | 0 | [23,109,124,76] | 0 |
| sp | .player-plate | [171,109,99,72] | [171,109,99,72] | 0 | [171,109,99,72] | 0 |
| sp | .hand | [6,650,378,188] | [6,650,378,188] | 0 | [6,650,378,188] | 0 |
| sp | .battle-dock | [6,577,378,261] | [6,577,378,261] | 0 | [6,577,378,261] | 0 |
| sp | .divination-panel | [6,577,378,69] | [6,577,378,69] | 0 | [6,577,378,69] | 0 |
| sp | .end-round-button | [272,582,58,44] | [272,582,58,44] | 0 | [272,582,58,44] | 0 |
| sp | .god-otomo-plate | [294,109,73,94] | [294,109,73,94] | 0 | [294,109,73,94] | 0 |
| sp | .intent | [30,158,37,21] | [30,158,37,21] | 0 | [30,158,37,21] | 0 |
| sp | .enemy-avatar | [10,388,176,168] | [9,385,178,170] | 3px（enemy-idle の呼吸 transform・layout ではない） | [10,389,176,168] | 4px（enemy-idle の呼吸 transform・layout ではない） |
| sp660 | .battle-topbar | [6,41,378,43] | [6,41,378,43] | 0 | [6,41,378,43] | 0 |
| sp660 | .enemy-plate | [23,109,124,76] | [23,109,124,76] | 0 | [23,109,124,76] | 0 |
| sp660 | .player-plate | [171,109,99,72] | [171,109,99,72] | 0 | [171,109,99,72] | 0 |
| sp660 | .hand | [6,484,378,170] | [6,484,378,170] | 0 | [6,484,378,170] | 0 |
| sp660 | .battle-dock | [6,411,378,243] | [6,411,378,243] | 0 | [6,411,378,243] | 0 |
| sp660 | .divination-panel | [6,411,378,69] | [6,411,378,69] | 0 | [6,411,378,69] | 0 |
| sp660 | .end-round-button | [272,416,58,44] | [272,416,58,44] | 0 | [272,416,58,44] | 0 |
| sp660 | .god-otomo-plate | [294,109,73,94] | [294,109,73,94] | 0 | [294,109,73,94] | 0 |
| sp660 | .intent | [30,158,37,21] | [30,158,37,21] | 0 | [30,158,37,21] | 0 |
| sp660 | .enemy-avatar | [10,214,184,176] | [9,211,186,178] | 3px（enemy-idle の呼吸 transform・layout ではない） | [10,215,184,176] | 4px（enemy-idle の呼吸 transform・layout ではない） |


**判定**：HUD 9 要素（topbar・enemy-plate・player-plate・hand・dock・託宣パネル・End Round・god-otomo-plate・intent）の箱は入口消滅直後／+2s／Before すべて同一＝**HUD 位置ずれ 0**。`.enemy-avatar` の 3〜4px は常駐の呼吸 transform（`enemy-idle`）の採取位相差で layout ではない（Preflight §1-1 と同じ）。CLS は Before と同値（PC 0.00002／SP 0.00112／SP660 0.00142。mount 時の SVG 等で入口由来ではない）。
## 5. tests

| 項目 | 結果 |
|---|---|
| tsc | 0 |
| oxlint | 0 error（warning は既存 `scripts/**` のみ） |
| vitest | **1,289 PASS**（Production 1,275 ＋ 新規 `battleEntrance.test.ts` 14 件。env ゲートの `scripts/phase5*` 監査テスト 6 ファイル／9 件は従来どおり skip）。`docs/evidence/decision254/pilot/vitest.txt` |
| build | OK：`index-ePtASz7H.js` 453.19 KB（Production `index-CzXreZSv.js` 449.88 KB → +3.3 KB・gzip +0.7 KB）／`index-DDJDc11N.css` 180.30 KB（+7.1 KB・gzip +0.7 KB）。`build.txt` |
| 新規テスト 14 件の契約 | 尺と操作可能時刻（Full 2,800／2,400・Short 1,500／1,150＝旧 BossEntrance と同尺・reduced 900／720・skip 200）／CSS の root fade-out が操作可能時刻から始まり総尺で終わる（TS と CSS の一致）／SE 時刻／first→full・以後 short／storage・save・gameVersion に触れない／BattleScreen は `battleStartKey` 増分時だけ variant を消費し即時 SE を呼ばない／skip が予約を全部取り消す／root animation の startTime 基準で同期し経過分を差し引く／pointer-events auto→none／最初の frame から不透明／`enemyVfxTiming`・`godStrikeVideo`・`core/engine`・`BattleResonanceCutin` を import しない／God Strike の selector・素材・音を使わない／keyframes は transform・opacity のみ／reduced は transform animation なし |
| `src/core` | diff 0（`git diff 4a887f7 -- src/core` 空）。gameVersion golden 不変（`gameVersion.test.ts` PASS） |

## 6. metric lock（T8）と regression

### T8 METRIC LOCK（同 seed・同 action 列・Before vs After の保存 state）

| case/vp | rounds B／A | 比較 snapshot 数 | 不一致 | final status score B／A | reaction 同一（種類数） | God Strike B／A | error B／A |
|---|---|---|---|---|---|---|---|
| taiyo-oni-normal/pc | 7／7 | 21 | 0 | null null／null null | true（7） | true／true | 0／0 |
| ebisu-juuma-stake5/pc | 7／7 | 21 | 0 | null null／null null | true（7） | true／true | 0／0 |
| taiyo-doukeshi-normal/pc | 7／7 | 21 | 0 | null null／null null | true（7） | true／true | 0／0 |
| taiyo-oni-normal/sp | 7／7 | 21 | 0 | null null／null null | true（7） | true／true | 0／0 |
| ebisu-juuma-stake5/sp | 7／7 | 21 | 0 | null null／null null | true（7） | true／true | 0／0 |
| taiyo-doukeshi-normal/sp | 7／7 | 21 | 0 | null null／null null | true（7） | true／true | 0／0 |
| taiyo-oni-normal/sp660 | 7／7 | 21 | 0 | null null／null null | true（7） | true／true | 0／0 |

合計 snapshot 147・不一致 0


**判定**：3 ケース（大耀×鬼将 通常 seed d254-qa1／恵比寿×魔獣 神階Ⅴ d254-qa2／大耀×道化 通常 d254-qa3）× PC／SP（＋SP660 1 ケース）＝14 対局・7R・毎 R 3 時点＝147 snapshot（＋final 7＝154 行）で保存 GameState・予告文・託宣残が **Before／After 完全一致（不一致 0）**。

**regression**：決定247 敵反転（PC／SP とも `.enemy-avatar` scale `-1 1`）同一／決定249 反応クラス集合（7 種）同一／決定250 God Strike 全 14 対局で発火・`resonance-cutin` z 4・`god-strike-v2.mp4`＋`keyvisual.webp`・cut-in 中に入口要素なし（Before／After 同一。3 ケースで cut-in の採取位相（動画読み込み前／退出中）が異なるだけで素材・z・入口不在は同一）／決定252 予告・立ち絵 class 同一／決定253 託宣 3 択の名前・役割語・状況表示 visible・overflow 0 同一／横スクロール 0／console error 0（28 context）。
## 7. known issues

| # | 内容 | 影響・扱い |
|---|---|---|
| 1 | **時計の同期（Pilot 中に発見・修正済み）**：神紋の animation は main thread で、root・神・敵の animation は compositor で動く。mount 直後の frame が重い端末では神紋だけ stall 分（headless PC で 233〜1,700ms）先に進んでいた。さらに PC では root animation の `ready` が compositor の開始より ≈300ms 遅れて解決し、JS の予約（SE・操作開放）が遅れていた | `start(base)`：root animation の startTime を基準に入口配下の全 animation を揃え、予約は経過分を差し引く。安全弁（400ms）の時点で startTime 未確定なら全 animation を「今」から開始。修正後の実測は §2〜§3（PC／SP とも ±50ms） |
| 2 | headless Chromium（GPU なし）の PC frame 値は参考値（Preflight §1-1 と同じ注意）。SP は Before より少ない | 実機の滑らかさは Human QA Q5 |
| 3 | SP DPR3 では `front_640` を 64vw（≈250 CSS px＝750 物理 px）で 1.17 倍拡大 | Human QA Q5。甘ければ既存 `front.webp` へ差し替え（非生成） |
| 4 | SP 高さ ≤700px（390×660 等）は沈んだ神と重ならないよう「START」の文字を省く（敵名・★・型は残す） | 設計どおり |
| 5 | 入口の敵は原画の向き（左向き 4 体＝鬼将・機工師・龍神・道化）。PC の対峙では神が左なので**敵は神の方を向く**。戦闘 HUD（決定247 で `scale -1 1`）とは向きが反転するが「敵は常に神の方を向く」意図は一致 | 矛盾なし。決定247 の規則（`.enemy-avatar` のみ）は不変 |
| 6 | 初陣（出陣する）・Daily もセッション最初の 1 戦なら Full | 設計どおり（セッション変数は経路を区別しない） |
| 7 | skip の入力で AudioContext が初めて resume される環境（自動再生制限）では、skip 前に予約済みで未再生の SE が skip 後に鳴る可能性は**ない**（予約＝`setTimeout` を取り消すため `playBuffer` 自体を呼ばない）。再生中の SE は止めない | 設計どおり |
| 8 | 前セッションの Gate v1（`gate-entrance*.json`・毎 frame の hit test で計測負荷が高く、click 起点の絶対時刻で評価）は #1 の発見に使ったのち廃止。本書の表は Gate v2（root animation startTime 基準）のみ | 旧 JSON は evidence から削除 |
| 9 | headless Chromium（GPU なし・software raster）の SP 計測で 11 本中 2 本が >33ms frame 11／14 本（1,100〜2,200ms に 40〜130ms の frame が連続）。実 Chrome（GPU）6 本は最大 7・中央値 2 で再現せず | NO-GO 条件「SP >33ms frame ≥ 8」は GPU 付き実測で満たす。実機（iPhone）の滑らかさは Human QA Q5 で確定。もし実機で重ければ候補＝P4 の舞台 scale（`boss-entrance-bg` 1.08→1）を opacity のみに落とす（CSS 1 規則） |

## 8. Human QA（READY）

| 項目 | Before（Production） | After（Pilot） |
|---|---|---|
| PC | `http://127.0.0.1:4271/` | `http://127.0.0.1:4272/` |
| iPhone（同一 Wi-Fi） | `http://192.168.11.6:4271/` | `http://192.168.11.6:4272/` |
| 配信 bundle | `index-CzXreZSv.js`（md5 `c1ba6f85…`＝Production） | `index-ePtASz7H.js`（md5 `2a5bd4fc…`＝本 commit の build） |
| サーバー | `vite preview --outDir ../SevenGodsGame-d253-rc/dist --port 4271 --host` | `vite preview --port 4272 --host`（worktree -d254） |

- iPhone 接続には Windows ファイアウォールの一時許可が必要（管理者 PowerShell で scratchpad `d254/qa-fw-add-d254.ps1`、QA 後に `qa-fw-remove-d254.ps1`。グループ「QA D254 (temp)」・TCP 4271／4272・LocalSubnet のみ）。未実行（CEO 操作）
- 手順：Home → はじめる → 神を選ぶ（任意の 1 柱）→ 難易度 → 敵 → デッキ構築 → 「この構成でバトル開始」＝**初回 Full（2.8 秒）**。結果画面「もう一度」／Solve Loop の「同じ盤面でもう一度」／ホーム経由の新規開始＝**Short（1.5 秒）**。入口中に画面タップ（PC はクリック・Enter・Space・Esc）＝**skip**。再読み込み → 「続きから」＝入口なし。再読み込み → 新規開始＝Full に戻る
- reduced motion：iPhone「設定 > アクセシビリティ > 動作 > 視差効果を減らす」／Windows「設定 > アクセシビリティ > 視覚効果 > アニメーション効果 オフ」で静止 0.9 秒
- Human QA 5 問（5/5 YES で PASS）
  - Q1 戦闘開始時に「選んだ神が降臨した」と感じるか
  - Q2 神と敵が対峙し、「これから戦う」感じが強くなったか
  - Q3 2.8 秒の初回演出は長すぎず、十分に特別感があるか
  - Q4 再戦・Retry の短縮版はテンポを邪魔しないか
  - Q5 スマホでも商用品質として自然で、重さ・ガタつき・窮屈さを感じないか
- PASS 後：Release Gate（RC branch・md5 一致・fast-forward）と Production 公開は別途 CEO 承認（§6-3 #8）

## 9. 触っていないこと・STOP

- `src/core/**`・Enemy tables・Enemy Ultimate・Oracle 数値・cards・God 数値・OTOMO・HP/AP・score・Seed・7R：0。決定250 God Strike cut-in・決定252 Intent/Ultimate・決定253 Oracle Readability：0
- 新規画像／動画／音声：0（生成 0・H3 0・fal.ai 0・追加費用 0）。`public/assets/**` 変更 0
- save／storage key／gameVersion：0。BGM 仕様（`bgm.ts`）：0
- master merge／push／Production deploy：0。Human QA 結果待ちで STOP

## 8. Production Release（2026-10-01・PRODUCTION LIVE / CLOSED）

Human QA：**Q1〜Q5 5/5 YES**（CEO・2026-10-01）→ CEO 承認 → Release Gate → 統合 → deploy → Smoke。表はすべて `docs/evidence/decision254/release/`・`production-smoke/` の JSON から `gen254.mjs.txt` で生成（`release/tables.md`・`production-smoke/tables.md`）。

| 項目 | 結果 |
|---|---|
| RC | `release/d254-game-entry-rc` = **`a611270`**（clean worktree `SevenGodsGame-d254-rc`・`git status` 0） |
| lineage | `98067ec`（master）→ `4a887f7`（Preflight docs）→ `a611270`。merge-base＝`98067ec`・fast-forward。feat/d224 の runtime（CardView／EnemyPanel／combatTimeline／enemyVfxTiming／useBattleSound／sound.test）混入 0・決定213 runtime 混入 0 |
| git diff scope | src 8 ファイル・+707／−21（`BossEntrance.tsx`／`battleEntrance.ts` 新規／`battleEntrance.test.ts` 新規／`BattleScreen.tsx`／`battle.css`／`sound.ts` +2／`DeckBuilderScreen.tsx`／`FirstBattleBrief.tsx`）。`src/core`・`enemyVfxTiming.ts`・`godStrikeVideo.ts`・`bgm.ts`・`hooks`・`public/assets` 差分 0。新規 asset 0・追加費用 0 |
| tsc／lint／tests／build（RC） | 0／0／**1,289 PASS**（＋9 skip＝env ゲート監査）／`index-ePtASz7H.js` md5 `2a5bd4fc…`＝**Pilot Human QA dist と一致**・`index-DDJDc11N.css` md5 `1ac53796…` |
| metric lock（RC） | Production dist :4271 vs RC dist :4273・PC／SP／SP660 × 3 組＝14 対局・154 行：**不一致 0**（hand／AP／HP／block／敵 HP・block／託宣残／共鳴／intent／rngCursor／score／status）。1 回目・2 回目の走では God Strike cut-in 中にクリックが落ちて操作列が揺れる計測側の揺らぎで R5 以降に 4／8 行の差が出たため、cut-in の消滅を待ってから次のクリックを打つよう**計測スクリプトだけ**を修正して確定（runtime 変更 0・R5 開始時の state は 3 走とも完全一致。`release/gate-lock.json`・`gate-lock-flaky-run2.log.txt`）。決定249 反応集合 同一／決定250 God Strike 14/14 発火・cut-in 中に入口要素なし／決定252 予告・立ち絵 同一／決定253 託宣表示 同一 |
| Entry 回帰（RC） | T1 Full：神紋 385〜390／神 835〜839／敵 1634〜1643／操作可 2418〜2505／消滅 2822〜2867／SE 261〜288・1507〜1547（PC／SP／SP660）・入口中 hit 0／T2 もう一度・ホーム経由＝Short（操作可 1,189〜1,204）・reload→続きから 入口なし・reload→新規 Full／T3 12 経路 skip→消滅 204〜251ms・手札 5→5・保存 state 不変・顕現 SE 取消／T4 reduced 静止・transform animation 0／T5 HUD 9 要素 箱差 0／T6 続きから 入口なし／T7 初陣・Daily Full・先読み 0 取得／7 柱 正／横スクロール 0・console error 0（`release/gate2-all.json`） |
| performance（RC・SP 390×844 >33ms frame） | **実 Chrome（GPU）After [1,1,4,6]（最大 6 ＜ 8）**／Before [3,3,5,5]。headless After [3,3,3,16]＋[4,2,11]／Before [3,4,5,12]＋[4,2,3]＝software raster の既知外れ値（Pilot known #9）で Before にも出る＝新しい悪化なし。click 後の入口素材取得 0（追加転送 0B） |
| master → origin/master | **`a611270`**（ff・push 2026-10-01 23:07 JST） |
| Vercel Production deployment | **`6786399725`**（sha `a611270`・Production・success・2026-10-01T14:07:46Z） |
| Production URL | `https://seven-gods-game.vercel.app/`（配信 `index-ePtASz7H.js` md5 `2a5bd4fc…`＝RC build・`index-DDJDc11N.css` 200） |
| rollback target | GitHub/Vercel deployment **`6770019105`**（sha `98067ec`・runtime `4d7b940`＝決定253） |

### 8-1. Production Smoke（`production-smoke/`・RC dist :4273 vs 本番・PC 1508×660／SP 390×844／SP 390×660）
実行：本番 `https://seven-gods-game.vercel.app`（配信 `index-ePtASz7H.js` md5 `2a5bd4fc…`）vs RC dist :4273。1 回目の走が T1／T4／anims 完了直後にメモリ逼迫（物理 6GB・空き 0.7GB）で停止したため、CEO 承認（Smoke Resume）後に **項目単位で直列再開**（headless 1 ブラウザ・headed は perf 2 本のみ）。各項目の JSON：`gate2-t3.json`／`gate2-t2.json`／`gate2-t6.json`／`gate2-t7.json`／`gate2-gods.json`／`gate2-t1-t4-anims.json`（中断で JSON 未保存だった T1／T4／anims を 1 ブラウザで取り直し。1 回目の数値は `gate2.log.txt`）／`gate-lock.json`／`perf2.json`。統合 `gate2-all.json`・表 `tables.md`。

| # | 項目 | 結果 |
|---|---|---|
| 1 | Full Entry 発火 | ✔ PC／SP／SP660 とも variant full・神紋 384〜391／神 834〜836／敵 1634〜1651 ms（1 回目・取り直しとも） |
| 2 | selected God 正しい | ✔ 7 柱すべて `front_640.webp`＝HUD アバターと同一 |
| 3 | 「{神名} 降臨」 | ✔ 恵比寿／大耀／蒼毘／才華／寿楽／福永／笑蓮 降臨・神色 `--god-accent` 一致 |
| 4 | God／Enemy 対峙 | ✔ PC 神左・敵右（敵名・★・型 表示）／SP 神中央上→沈み・敵上中央。overflow 0 |
| 5 | stage reveal | ✔ 舞台 1651〜1672 ms・`boss-entrance-bg` |
| 6 | HUD reveal | ✔ 1 回目：操作可 2418〜2442／消滅 2811〜2849。取り直し：sp660 2418／2821、PC・SP は 2653〜2665／3027〜3052（JS 側のみ +230ms＝known #5・映像は時刻どおり・入口中の hit 0） |
| 7 | Short Entry | ✔ もう一度：操作可 1199〜1237／消滅 1527〜1756（PC は長い frame 1 本）・SE 115〜141／476〜492 |
| 8 | Retry Short | ✔ ホーム経由の新規開始も Short（1517〜1530）。reload→新規は Full に戻る（2819〜2870） |
| 9 | Skip | ✔ 12 経路 skip→消滅 209〜251 ms |
| 10 | Skip penetration 0 | ✔ 手札 5→5・保存 GameState・AP・R・託宣残 不変・未再生 SE 取消（12/12） |
| 11 | Reduced Motion | ✔ 静止表示・transform animation 0・消滅 937〜943／操作可 752〜800（取り直し。1 回目の SP は停止直前の負荷で 1418） |
| 12 | Continue／Resume 入口なし | ✔ mount 11〜35 ms・SE 0（T6・T2 reload） |
| 13 | 決定252 Intent／Ultimate | ✔ 予告文・立ち絵 class・必殺が RC と全ラウンド一致（Lock 154 行） |
| 14 | 決定253 Oracle Readability | ✔ 役割語 守る／整える／攻める・名前・状況表示 visible・overflow 0・託宣残 一致 |
| 15 | 決定250 God Strike | ✔ 14/14 対局で発火・`resonance-cutin` z 4・`god-strike-v2.mp4`＋`keyvisual.webp`・cut-in 中に入口要素なし |
| 追加 | console error | ✔ 0（全 context） |
| 追加 | 横スクロール | ✔ 0 |
| 追加 | HUD 位置差 | ✔ 9 要素 0（消滅直後 vs +2s・RC vs 本番）。`.enemy-avatar` は呼吸 transform の位相差のみ |
| 追加 | 決定247 | ✔ `.enemy-avatar` scale `-1 1`（PC／SP） |
| 追加 | 決定249 | ✔ 反応クラス集合 7 種 同一 |
| parity | 同 seed GameState（RC vs 本番） | ✔ **154 行 不一致 0**（hand／AP／HP／block／敵 HP・block／託宣残／共鳴／intent／rngCursor／score／status） |
| perf | SP 390×844 >33ms frame | ✔ **実 Chrome（GPU）本番 [2,4]（最大 4 ＜ 8。Pilot 7・Release Gate 6 から悪化なし）**・headless 本番 4 |
| preload | click 後の入口素材取得 | ✔ 0（追加転送 0B） |

### 8-2. cleanup
- QA サーバー :4271（Production dist）／:4272（Pilot dist）／:4273（RC dist）停止（listen 0）。Claude 側の node／headless プロセス 0。CEO の Google Chrome（12 プロセス）には触れていない
- 一時ファイアウォール規則：作成していない（0 件を確認）
- RC worktree `SevenGodsGame-d254-rc`・branch `release/d254-game-entry-rc` は保持。計測スクリプト `scripts/decision254/*.mjs` は commit せず、写しを evidence に `.mjs.txt` で保存
- 最終メモリ状態：物理 6,020MB・空き約 1,440MB（Smoke 完了・プロセス停止後）

### 8-3. Known Issues（CLOSED 時点）
1. headless（GPU なし）の SP 計測で >33ms frame の外れ値（11〜16 本）が Before／After とも出る。GPU 付き実 Chrome と iPhone 実機（Human QA Q5 YES）では再現しない。
2. SP DPR3 では `front_640` を 1.17 倍拡大（Q5 YES で許容）。
3. SP 高さ ≤700px は「START」文字を省略。
4. 入口の敵は原画の向き（PC の対峙では神の方を向く。HUD の決定247 反転とは別要素）。
5. mount 直後に main thread が重い環境では、JS 予約の基準 `document.timeline.currentTime` が frame 開始時刻で止まっているため、SE・操作開放・消滅が最大 ≈230ms 遅れることがある（絵は compositor で時刻どおり。入力ロックは維持される＝安全側）。Production Smoke の取り直し（空きメモリ 1.4GB の環境）で PC／SP に +230ms を観測、1 回目の走と sp660 は設計値どおり。改善候補＝`performance.now()` 基準（1 行・NEXT NOW 提案）。
