
### T1 Full（初回）— 各時刻（ms・root animation startTime 基準）／計測 2026-10-01T14:48:57.705Z

| run | mount→anim | 神紋>0.3 | 神>0.5 | 敵art>0.5 | 舞台>0.5 | 操作可（pe none） | End Round 押せる | 消滅 | SE1（神紋） | SE2（顕現） | 入口中 hit（t≈1000） | frames >33 / n | median | CLS | error |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pc/before | 252 | 387 | 836 | 1637 | 1659 | 2692 | 2692 | 3045 | 476 | 1729 | end false／card false／oracle false | 15 / 122 | 17.7 | 0.00002 | 0 |
| pc/after | 250 | 391 | 836 | 1638 | 1672 | 2653 | 2653 | 3027 | 453 | 1703 | end false／card false／oracle false | 18 / 118 | 20.6 | 0.00002 | 0 |
| sp/before | 106 | 385 | 835 | 1635 | 1651 | 2435 | 2435 | 2837 | 270 | 1519 | end false／card false／oracle false | 2 / 167 | 16.8 | 0.00112 | 0 |
| sp/after | 179 | 384 | 835 | 1634 | 1651 | 2665 | 2665 | 3052 | 487 | 1736 | end false／card false／oracle false | 4 / 167 | 16.7 | 0.00112 | 0 |
| sp660/before | 105 | 384 | 834 | 1634 | 1651 | 2418 | 2418 | 2833 | 266 | 1513 | end false／card false／oracle false | 1 / 171 | 16.7 | 0.00142 | 0 |
| sp660/after | 347 | 384 | 836 | 1634 | 1652 | 2418 | 2418 | 2821 | 253 | 1506 | end false／card false／oracle false | 2 / 172 | 16.7 | 0.00142 | 0 |

### T1 転送量（click 後の request・bytes）と入口素材の先読み

| run | click 後 request 数 | click 後 bytes | click 後に取得した入口素材 | click 前に取得済みの入口素材（数） |
|---|---|---|---|---|
| pc/before | 22 | 2,486,238 | 0 | 18 |
| pc/after | 22 | 2,490,919 | 0 | 17 |
| sp/before | 22 | 2,486,238 | 0 | 18 |
| sp/after | 22 | 2,490,948 | 0 | 18 |
| sp660/before | 24 | 2,700,688 | 0 | 18 |
| sp660/after | 24 | 2,689,886 | 0 | 18 |

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
| pc | .enemy-avatar | [238,202,291,194] | [236,199,294,196] | 3px（enemy-idle の呼吸 transform・layout ではない） | [236,199,294,196] | 0（enemy-idle の呼吸 transform・layout ではない） |
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
| pc/before | 1281 | 737 | 神 -247／敵 -247 | 44ms 0.11s×1・49ms 0.15s×0.8・170ms 0.96s×1 | — |
| pc/after | 943 | 800 | 神 -157／敵 -157 | 33ms 0.15s×0.8・165ms 0.96s×1 | battle-entrance-out[opacity] |
| sp/before | 934 | 751 | 神 -157／敵 -157 | 18ms 0.11s×1・36ms 0.15s×0.8・169ms 0.96s×1 | — |
| sp/after | 937 | 752 | 神 -105／敵 -105 | 22ms 0.11s×1・43ms 0.15s×0.8・172ms 0.96s×1 | battle-entrance-out[opacity] |

### 性能（SP 390×844 headless・入口中の frame）

| run | n | >33ms | >50ms | max | median | 最初の frame | CLS | click 後 bytes | 入口素材 click 後 |
|---|---|---|---|---|---|---|---|---|---|
| before/1 | 148 | 13 | 3 | 207.9 | 16.9 | 203.69999999925494 | — | 0 | 0 |
| after/1 | 162 | 4 | 3 | 109.2 | 16.9 | 109.19999999925494 | — | 0 | 0 |
| before/2 | — | — | — | — | — | — | — | 0 | 0 |
| after/2 | — | — | — | — | — | — | — | 0 | 0 |
| before/3 | — | — | — | — | — | — | — | 0 | 0 |
| after/3 | — | — | — | — | — | — | — | 0 | 0 |

### 性能（追加サンプル perf2：headless N 本＋実 Chrome headed（GPU）N 本・SP 390×844・入口中の >33ms frame）

| 環境 | run | n | >33ms | >50ms | max | median |
|---|---|---|---|---|---|---|
| headless | before/1 | 148 | 13 | 3 | 207.9 | 16.9 |
| headless | after/1 | 162 | 4 | 3 | 109.2 | 16.9 |
| headed(GPU) | before/1 | 99 | 6 | 6 | 711.4 | 17.8 |
| headed(GPU) | after/1 | 159 | 4 | 2 | 201.5 | 17.8 |
| headed(GPU) | before/2 | 149 | 5 | 3 | 148.3 | 17.7 |
| headed(GPU) | after/2 | 161 | 2 | 2 | 201 | 17.7 |

summary: {"headless":{"before":{"runs":1,"over33":[13],"over33Median":13,"over33Max":13,"medianFrame":[16.9],"max":[207.9]},"after":{"runs":1,"over33":[4],"over33Median":4,"over33Max":4,"medianFrame":[16.9],"max":[109.2]}},"headed":{"before":{"runs":2,"over33":[5,6],"over33Median":6,"over33Max":6,"medianFrame":[17.8,17.7],"max":[711.4,148.3]},"after":{"runs":2,"over33":[2,4],"over33Median":4,"over33Max":4,"medianFrame":[17.8,17.7],"max":[201.5,201]}}}

### T3 Skip（入力貫通 0・未再生 SE キャンセル）

| run | 入力時刻（rel） | 入口中の入力 | skip→消滅 | skip→End Round 押せる | save 不変 | UI 不変（手札/AP/R/残り） | 手札 before→after | 顕現 SE が skip 後に鳴った | SE（rel） | 入力イベント（target） | error |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pc/card@300 | 472 | true | 224 | 224 | true | true | 5→5 | false |  | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| pc/end@300 | 336 | true | 216 | 216 | true | true | 5→5 | false | -37:0.11s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| pc/oracle@300 | 306 | true | 237 | 237 | true | true | 5→5 | false | -217:0.11s・270:0.15s | click→・pointerdown(入口)→battle-entrance-god・pointerup→battle-entrance-god・click→battle-entrance-god | 0 |
| pc/Enter@300 | 304 | true | 240 | 240 | true | true | 5→5 | false | -242:0.11s・271:0.15s | click→・keydown(入口)→card-view card-view-ha・keyup→card-view card-view-ha | 0 |
| pc/Space@300 | 304 | true | 251 | 251 | true | true | 5→5 | false | -239:0.11s・270:0.15s | click→・keydown(入口)→card-view card-view-ha・keyup→card-view card-view-ha | 0 |
| pc/EscapeOracle@300 | 306 | true | 224 | 224 | true | true | 5→5 | false | -197:0.11s・266:0.15s | click→・keydown(入口)→divination-choice・keyup→divination-choice | 0 |
| pc/card@60 | 114 | true | 219 | 219 | true | true | 5→5 | false | -146:0.11s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| pc/card@1800 | 1806 | true | 231 | 231 | true | true | 5→5 | false | -177:0.11s・263:0.15s・1509:0.96s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/card@300 | 303 | true | 210 | 210 | true | true | 5→5 | false | 8:0.11s・252:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/end@300 | 304 | true | 214 | 214 | true | true | 5→5 | false | 253:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/oracle@300 | 305 | true | 209 | 209 | true | true | 5→5 | false | 38:0.11s・270:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/card@1800 | 1804 | true | 216 | 216 | true | true | 5→5 | false | 187:0.11s・262:0.15s・1519:0.96s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |

### T2 Revisit（同セッション 2 戦目・ホーム経由・reload 後）

| vp | 1 戦目 variant／消滅 | 結果到達 | もう一度 variant／操作可／消滅／SE | ホーム経由 variant／消滅／見出し | reload→続きから 入口 | reload→新規 variant／消滅 | error |
|---|---|---|---|---|---|---|---|
| pc | full／2860 | true／true | short／1237／1756／-154:0.11s・141:0.15s・492:0.96s | short／1530／null | なし | full／2870 | 0 |
| sp | full／2837 | true／true | short／1199／1527／-58:0.11s・115:0.15s・476:0.96s | short／1517／null | なし | full／2819 | 0 |

### T6 続きから（入口なし）／T7 初陣・Daily

| run | variant | 入口 | 消滅（rel） | SE | End Round 有効 | click 後に取得した入口素材 | error |
|---|---|---|---|---|---|---|---|
| t6-resume/pc/before | — | なし | — | 0 | — | — | 0 |
| t6-resume/pc/after | — | なし | — | 0 | — | — | 0 |
| t7-first/pc/before | full | あり | 3230 | 587:0.15s・1828:0.96s | true | 0 | 0 |
| t7-first/sp/before | full | あり | 2823 | 21:0.11s・270:0.15s・1520:0.96s | true | 0 | 0 |
| t7-first/pc/after | full | あり | 2927 | -193:0.11s・298:0.15s・1549:0.96s | true | 0 | 0 |
| t7-first/sp/after | full | あり | 2829 | 13:0.11s・259:0.15s・1519:0.96s | true | 0 | 0 |
| t7-daily/pc/before | full | あり | 2834 | -179:0.11s・261:0.15s・1507:0.96s | true | DAILY tag true | 0 |
| t7-daily/pc/after | full | あり | 2821 | -204:0.11s・270:0.15s・1519:0.96s | true | DAILY tag true | 0 |

### 7 柱（選んだ神の見出し・画像・神色）

| god idx | 見出し | img | 敵名 | --god-accent | variant | 消滅 | error |
|---|---|---|---|---|---|---|---|
| 0 | 恵比寿 降臨 | /assets/gods/ebisu/front_640.webp | 試練の影 | #ff6b5e | full | 3041 | 0 |
| 1 | 大耀 降臨 | /assets/gods/taiyo/front_640.webp | 業斧の鬼将 | #e8b33d | full | 2822 | 0 |
| 2 | 蒼毘 降臨 | /assets/gods/sobi/front_640.webp | 藍花の怨霊 | #4d9fff | full | 2876 | 0 |
| 3 | 才華 降臨 | /assets/gods/saika/front_640.webp | 銀甲の機工師 | #c96bff | full | 2852 | 0 |
| 4 | 寿楽 降臨 | /assets/gods/juraku/front_640.webp | 双牙の魔獣 | #6ec972 | full | 2838 | 0 |
| 5 | 福永 降臨 | /assets/gods/fukuei/front_640.webp | 蒼海の龍神 | #3ddbb0 | full | 2863 | 0 |
| 6 | 笑蓮 降臨 | /assets/gods/shouren/front_640.webp | 乱舞の道化 | #ff7fb3 | full | 2885 | 0 |

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
