
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

### T4 Reduced motion

| run | 消滅 | 操作可 | 神/敵 表示 | SE | animation（transform 系） |
|---|---|---|---|---|---|
| pc/before | 667 | -252 | 神 —／敵 -252 | 50ms 0.11s×1・60ms 0.96s×1 | — |
| pc/after | 990 | 752 | 神 -303／敵 -303 | 27ms 0.11s×1・42ms 0.15s×0.8・160ms 0.96s×1 | battle-entrance-out[opacity] |
| sp/before | 534 | -217 | 神 —／敵 -217 | 456ms 0.96s×1 | — |
| sp/after | 917 | 734 | 神 -265／敵 -265 | 26ms 0.11s×1・37ms 0.15s×0.8・152ms 0.96s×1 | battle-entrance-out[opacity] |

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

### T2 Revisit（同セッション 2 戦目・ホーム経由・reload 後）

| vp | 1 戦目 variant／消滅 | 結果到達 | もう一度 variant／操作可／消滅／SE | ホーム経由 variant／消滅／見出し | reload→続きから 入口 | reload→新規 variant／消滅 | error |
|---|---|---|---|---|---|---|---|
| pc | full／2807 | true／true | short／1188／1580／-133:0.11s・128:0.15s・475:0.96s | short／1512／null | なし | full／2852 | 0 |
| sp | full／2818 | true／true | short／1175／1518／-57:0.11s・112:0.15s・466:0.96s | short／1531／null | なし | full／2861 | 0 |

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
