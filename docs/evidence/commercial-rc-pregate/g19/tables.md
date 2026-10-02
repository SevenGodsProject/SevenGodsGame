
### T1 Full（初回）— 各時刻（ms・root animation startTime 基準）／計測 2026-10-02T15:13:45.257Z

| run | mount→anim | 神紋>0.3 | 神>0.5 | 敵art>0.5 | 舞台>0.5 | 操作可（pe none） | End Round 押せる | 消滅 | SE1（神紋） | SE2（顕現） | 入口中 hit（t≈1000） | frames >33 / n | median | CLS | error |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pc/before | 462 | 383 | 844 | 1743 | 1743 | 2606 | 2606 | 2905 | 284 | 1532 | end false／card false／oracle false | 22 / 107 | 17.7 | 0.00002 | 0 |
| pc/after | 82 | 427 | 837 | 1647 | 1679 | 2771 | 2771 | 3118 | 538 | 1787 | end false／card false／oracle false | 21 / 106 | 22.7 | 0.00002 | 0 |
| sp/before | 237 | 386 | 835 | 1634 | 1651 | 2435 | 2435 | 2835 | 271 | 1517 | end false／card false／oracle false | 3 / 169 | 16.7 | 0.00112 | 0 |
| sp/after | 190 | 384 | 834 | 1634 | 1650 | 2434 | 2434 | 2818 | 257 | 1518 | end false／card false／oracle false | 3 / 168 | 16.7 | 0.00112 | 0 |
| sp660/before | 98 | 384 | 834 | 1635 | 1651 | 2418 | 2418 | 2825 | 264 | 1511 | end false／card false／oracle false | 1 / 171 | 16.7 | 0.00142 | 0 |
| sp660/after | 104 | 384 | 834 | 1634 | 1651 | 2418 | 2418 | 2824 | 254 | 1518 | end false／card false／oracle false | 1 / 171 | 16.6 | 0.00142 | 0 |

### T1 転送量（click 後の request・bytes）と入口素材の先読み

| run | click 後 request 数 | click 後 bytes | click 後に取得した入口素材 | click 前に取得済みの入口素材（数） |
|---|---|---|---|---|
| pc/before | 24 | 2,570,116 | 0 | 18 |
| pc/after | 24 | 2,575,178 | 0 | 17 |
| sp/before | 25 | 2,666,360 | 0 | 18 |
| sp/after | 24 | 2,575,190 | 0 | 18 |
| sp660/before | 26 | 2,793,410 | 0 | 18 |
| sp660/after | 25 | 2,696,474 | 0 | 18 |

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
| pc | .enemy-avatar | [238,203,291,194] | [236,199,294,196] | 4px（enemy-idle の呼吸 transform・layout ではない） | [236,199,294,196] | 0（enemy-idle の呼吸 transform・layout ではない） |
| sp | .battle-topbar | [6,41,378,43] | [6,41,378,43] | 0 | [6,41,378,43] | 0 |
| sp | .enemy-plate | [23,109,124,76] | [23,109,124,76] | 0 | [23,109,124,76] | 0 |
| sp | .player-plate | [171,109,99,72] | [171,109,99,72] | 0 | [171,109,99,72] | 0 |
| sp | .hand | [6,650,378,188] | [6,650,378,188] | 0 | [6,650,378,188] | 0 |
| sp | .battle-dock | [6,577,378,261] | [6,577,378,261] | 0 | [6,577,378,261] | 0 |
| sp | .divination-panel | [6,577,378,69] | [6,577,378,69] | 0 | [6,577,378,69] | 0 |
| sp | .end-round-button | [272,582,58,44] | [272,582,58,44] | 0 | [272,582,58,44] | 0 |
| sp | .god-otomo-plate | [294,109,73,94] | [294,109,73,94] | 0 | [294,109,73,94] | 0 |
| sp | .intent | [30,158,37,21] | [30,158,37,21] | 0 | [30,158,37,21] | 0 |
| sp | .enemy-avatar | [10,388,176,168] | [9,385,178,170] | 3px（enemy-idle の呼吸 transform・layout ではない） | [9,385,178,170] | 0（enemy-idle の呼吸 transform・layout ではない） |
| sp660 | .battle-topbar | [6,41,378,43] | [6,41,378,43] | 0 | [6,41,378,43] | 0 |
| sp660 | .enemy-plate | [23,109,124,76] | [23,109,124,76] | 0 | [23,109,124,76] | 0 |
| sp660 | .player-plate | [171,109,99,72] | [171,109,99,72] | 0 | [171,109,99,72] | 0 |
| sp660 | .hand | [6,484,378,170] | [6,484,378,170] | 0 | [6,484,378,170] | 0 |
| sp660 | .battle-dock | [6,411,378,243] | [6,411,378,243] | 0 | [6,411,378,243] | 0 |
| sp660 | .divination-panel | [6,411,378,69] | [6,411,378,69] | 0 | [6,411,378,69] | 0 |
| sp660 | .end-round-button | [272,416,58,44] | [272,416,58,44] | 0 | [272,416,58,44] | 0 |
| sp660 | .god-otomo-plate | [294,109,73,94] | [294,109,73,94] | 0 | [294,109,73,94] | 0 |
| sp660 | .intent | [30,158,37,21] | [30,158,37,21] | 0 | [30,158,37,21] | 0 |
| sp660 | .enemy-avatar | [10,214,184,176] | [9,211,186,178] | 3px（enemy-idle の呼吸 transform・layout ではない） | [9,211,186,178] | 0（enemy-idle の呼吸 transform・layout ではない） |

### T4 Reduced motion

| run | 消滅 | 操作可 | 神/敵 表示 | SE | animation（transform 系） |
|---|---|---|---|---|---|
| pc/before | 1094 | 935 | 神 -642／敵 -642 | 196ms 0.15s×0.8・326ms 0.96s×1 | — |
| pc/after | 1201 | 1025 | 神 -132／敵 -132 | 330ms 0.15s×0.8・440ms 0.96s×1 | battle-entrance-out[opacity] |
| sp/before | 918 | 751 | 神 -285／敵 -285 | 27ms 0.11s×1・38ms 0.15s×0.8・153ms 0.96s×1 | — |
| sp/after | 952 | 773 | 神 -160／敵 -160 | 20ms 0.11s×1・53ms 0.15s×0.8・182ms 0.96s×1 | battle-entrance-out[opacity] |

### 性能（SP 390×844 headless・入口中の frame）

| run | n | >33ms | >50ms | max | median | 最初の frame | CLS | click 後 bytes | 入口素材 click 後 |
|---|---|---|---|---|---|---|---|---|---|
| before/1 | 170 | 3 | 2 | 135.4 | 16.7 | 135.4 | 0.00112 | 2,570,116 | 0 |
| after/1 | 165 | 2 | 2 | 93.8 | 16.7 | 15.4 | 0.00112 | 2,792,959 | 0 |
| before/2 | 169 | 3 | 2 | 127.6 | 16.7 | 127.6 | 0.00112 | 2,787,394 | 0 |
| after/2 | 170 | 1 | 1 | 108.3 | 16.7 | 15.4 | 0.00112 | 2,575,147 | 0 |
| before/3 | 168 | 3 | 2 | 96.2 | 16.8 | 96.2 | 0.00112 | 2,691,150 | 0 |
| after/3 | 168 | 1 | 1 | 64.4 | 16.8 | 20.4 | 0.00112 | 2,792,983 | 0 |

### T3 Skip（入力貫通 0・未再生 SE キャンセル）

| run | 入力時刻（rel） | 入口中の入力 | skip→消滅 | skip→End Round 押せる | save 不変 | UI 不変（手札/AP/R/残り） | 手札 before→after | 顕現 SE が skip 後に鳴った | SE（rel） | 入力イベント（target） | error |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pc/card@300 | 310 | true | 241 | 241 | true | true | 5→5 | false |  | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| pc/end@300 | 304 | true | 242 | 242 | true | true | 5→5 | false | -213:0.11s・283:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| pc/oracle@300 | 304 | true | 226 | 226 | true | true | 5→5 | false | -216:0.11s・307:0.15s | click→・pointerdown(入口)→battle-entrance-god・pointerup→battle-entrance-god・click→battle-entrance-god | 0 |
| pc/Enter@300 | 304 | true | 237 | 237 | true | true | 5→5 | false | -174:0.11s・262:0.15s | click→・keydown(入口)→card-view card-view-ex・keyup→card-view card-view-ex | 0 |
| pc/Space@300 | 304 | true | 272 | 272 | true | true | 5→5 | false | -214:0.11s・271:0.15s | click→・keydown(入口)→card-view card-view-ha・keyup→card-view card-view-ha | 0 |
| pc/EscapeOracle@300 | 384 | true | 258 | 258 | true | true | 5→5 | false |  | click→・keydown(入口)→divination-choice・keyup→divination-choice | 0 |
| pc/card@60 | 368 | true | 250 | 250 | true | true | 5→5 | false | -25:0.11s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| pc/card@1800 | 1808 | true | 220 | 220 | true | true | 5→5 | false | 525:0.15s・1776:0.96s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/card@300 | 306 | true | 217 | 217 | true | true | 5→5 | false | 14:0.11s・270:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/end@300 | 305 | true | 211 | 211 | true | true | 5→5 | false | 21:0.11s・253:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/oracle@300 | 305 | true | 231 | 231 | true | true | 5→5 | false | 9:0.11s・270:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/card@1800 | 1809 | true | 226 | 226 | true | true | 5→5 | false | 13:0.11s・261:0.15s・1510:0.96s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |

### T2 Revisit（同セッション 2 戦目・ホーム経由・reload 後）

| vp | 1 戦目 variant／消滅 | 結果到達 | もう一度 variant／操作可／消滅／SE | ホーム経由 variant／消滅／見出し | reload→続きから 入口 | reload→新規 variant／消滅 | error |
|---|---|---|---|---|---|---|---|
| pc | full／2863 | true／true | short／1181／1552／-167:0.11s・124:0.15s・509:0.96s | short／1575／null | なし | full／2836 | 0 |
| sp | full／2811 | true／true | short／1197／1538／-41:0.11s・126:0.15s・473:0.96s | short／1528／null | なし | full／2813 | 0 |

### T6 続きから（入口なし）／T7 初陣・Daily

| run | variant | 入口 | 消滅（rel） | SE | End Round 有効 | click 後に取得した入口素材 | error |
|---|---|---|---|---|---|---|---|
| t6-resume/pc/before | — | なし | — | 0 | — | — | 0 |
| t6-resume/pc/after | — | なし | — | 0 | — | — | 0 |
| t7-first/pc/before | full | あり | 2882 | -157:0.11s・284:0.15s・1541:0.96s | true | 0 | 0 |
| t7-first/sp/before | full | あり | 2820 | 8:0.11s・260:0.15s・1520:0.96s | true | 0 | 0 |
| t7-first/pc/after | full | あり | 3128 | 10:0.11s・554:0.15s・1808:0.96s | true | 0 | 0 |
| t7-first/sp/after | full | あり | 2847 | 34:0.11s・268:0.15s・1528:0.96s | true | 0 | 0 |
| t7-daily/pc/before | full | あり | 2865 | -199:0.11s・270:0.15s・1519:0.96s | true | DAILY tag true | 0 |
| t7-daily/pc/after | full | あり | 2826 | -161:0.11s・266:0.15s・1516:0.96s | true | DAILY tag true | 0 |

### 7 柱（選んだ神の見出し・画像・神色）

| god idx | 見出し | img | 敵名 | --god-accent | variant | 消滅 | error |
|---|---|---|---|---|---|---|---|
| 0 | 恵比寿 降臨 | /assets/gods/ebisu/front_640.webp | 試練の影 | #ff6b5e | full | 2880 | 0 |
| 1 | 大耀 降臨 | /assets/gods/taiyo/front_640.webp | 業斧の鬼将 | #e8b33d | full | 2831 | 0 |
| 2 | 蒼毘 降臨 | /assets/gods/sobi/front_640.webp | 藍花の怨霊 | #4d9fff | full | 2872 | 0 |
| 3 | 才華 降臨 | /assets/gods/saika/front_640.webp | 銀甲の機工師 | #c96bff | full | 2824 | 0 |
| 4 | 寿楽 降臨 | /assets/gods/juraku/front_640.webp | 双牙の魔獣 | #6ec972 | full | 2861 | 0 |
| 5 | 福永 降臨 | /assets/gods/fukuei/front_640.webp | 蒼海の龍神 | #3ddbb0 | full | 2903 | 0 |
| 6 | 笑蓮 降臨 | /assets/gods/shouren/front_640.webp | 乱舞の道化 | #ff7fb3 | full | 2861 | 0 |
