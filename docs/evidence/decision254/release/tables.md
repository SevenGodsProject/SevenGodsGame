
### T1 Full（初回）— 各時刻（ms・root animation startTime 基準）／計測 2026-10-01T13:11:25.931Z

| run | mount→anim | 神紋>0.3 | 神>0.5 | 敵art>0.5 | 舞台>0.5 | 操作可（pe none） | End Round 押せる | 消滅 | SE1（神紋） | SE2（顕現） | 入口中 hit（t≈1000） | frames >33 / n | median | CLS | error |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pc/before | 425 | — | — | 204 | -425 | -425 | -425 | 1263 | — | 103 | — | 12 / 28 | 30.7 | 0.00002 | 0 |
| pc/after | 369 | 390 | 839 | 1643 | 1671 | 2505 | 2505 | 2867 | 288 | 1547 | end false／card false／oracle false | 31 / 68 | 30.4 | 0.00002 | 0 |
| sp/before | 255 | — | — | 194 | -255 | -255 | -255 | 1265 | — | 91 | — | 19 / 39 | 32.4 | 0.00112 | 0 |
| sp/after | 263 | 385 | 835 | 1635 | 1651 | 2435 | 2435 | 2836 | 271 | 1521 | end false／card false／oracle false | 2 / 168 | 16.8 | 0.00112 | 0 |
| sp660/before | 331 | — | — | 195 | -331 | -331 | -331 | 1198 | — | 72 | — | 15 / 33 | 30.2 | 0.00142 | 0 |
| sp660/after | 269 | 385 | 835 | 1634 | 1651 | 2418 | 2418 | 2822 | 261 | 1507 | end false／card false／oracle false | 3 / 167 | 16.8 | 0.00142 | 0 |

### T1 転送量（click 後の request・bytes）と入口素材の先読み

| run | click 後 request 数 | click 後 bytes | click 後に取得した入口素材 | click 前に取得済みの入口素材（数） |
|---|---|---|---|---|
| pc/before | 25 | 2,637,176 | se/resonance_gain.wav・se/boss_entrance.wav・gods/taiyo/front_640.webp | 15 |
| pc/after | 22 | 2,486,238 | 0 | 17 |
| sp/before | 25 | 2,637,176 | se/resonance_gain.wav・se/boss_entrance.wav・gods/taiyo/front_640.webp | 15 |
| sp/after | 23 | 2,579,654 | 0 | 18 |
| sp660/before | 26 | 2,758,210 | se/resonance_gain.wav・se/boss_entrance.wav・gods/taiyo/front_640.webp | 15 |
| sp660/after | 23 | 2,579,654 | 0 | 18 |

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
| pc/before | 434 | -466 | 神 —／敵 -466 | 12ms 0.11s×1・147ms 0.96s×1 | — |
| pc/after | 950 | 797 | 神 -362／敵 -362 | 368ms 0.15s×0.8・374ms 0.96s×1 | battle-entrance-out[opacity] |
| sp/before | 633 | -279 | 神 —／敵 -279 | 82ms 0.11s×1・85ms 0.96s×1 | — |
| sp/after | 1001 | 806 | 神 -188／敵 -188 | 143ms 0.15s×0.8・317ms 0.96s×1 | battle-entrance-out[opacity] |

### 性能（SP 390×844 headless・入口中の frame）

| run | n | >33ms | >50ms | max | median | 最初の frame | CLS | click 後 bytes | 入口素材 click 後 |
|---|---|---|---|---|---|---|---|---|---|
| before/1 | 67 | 4 | 3 | 173.6 | 18.2 | 173.6 | 0.00112 | 2,733,420 | 3 |
| after/1 | 160 | 4 | 1 | 101.9 | 17 | 18.7 | 0.00112 | 2,700,688 | 0 |
| before/2 | 71 | 2 | 1 | 97 | 17.7 | 24.3 | 0.00112 | 2,733,420 | 3 |
| after/2 | 169 | 2 | 1 | 100.6 | 16.8 | 20.2 | 0.00112 | 2,486,238 | 0 |
| before/3 | 66 | 3 | 2 | 152.3 | 18.9 | 152.3 | 0.00112 | 2,637,176 | 3 |
| after/3 | 142 | 11 | 4 | 114.3 | 17 | 97.6 | 0.00112 | 2,703,516 | 0 |

### 性能（追加サンプル perf2：headless N 本＋実 Chrome headed（GPU）N 本・SP 390×844・入口中の >33ms frame）

| 環境 | run | n | >33ms | >50ms | max | median |
|---|---|---|---|---|---|---|
| headless | before/1 | 65 | 4 | 3 | 156.3 | 18.6 |
| headless | after/1 | 164 | 3 | 1 | 86.7 | 16.8 |
| headless | before/2 | 58 | 3 | 2 | 175.6 | 20.5 |
| headless | after/2 | 112 | 16 | 13 | 216.1 | 18.1 |
| headless | before/3 | 61 | 5 | 3 | 149.9 | 20 |
| headless | after/3 | 167 | 3 | 2 | 135.1 | 16.8 |
| headless | before/4 | 47 | 12 | 3 | 123.2 | 25.9 |
| headless | after/4 | 164 | 3 | 2 | 162.7 | 16.8 |
| headed(GPU) | before/1 | 24 | 5 | 3 | 721.4 | 17.4 |
| headed(GPU) | after/1 | 162 | 4 | 3 | 148.1 | 16.7 |
| headed(GPU) | before/2 | 73 | 3 | 3 | 157.8 | 16.7 |
| headed(GPU) | after/2 | 153 | 6 | 3 | 587.8 | 16.7 |
| headed(GPU) | before/3 | 35 | 3 | 3 | 489.2 | 16.7 |
| headed(GPU) | after/3 | 172 | 1 | 1 | 78.5 | 16.7 |
| headed(GPU) | before/4 | 32 | 5 | 4 | 821.1 | 16.6 |
| headed(GPU) | after/4 | 171 | 1 | 1 | 68.9 | 16.6 |

summary: {"headless":{"before":{"runs":4,"over33":[3,4,5,12],"over33Median":5,"over33Max":12,"medianFrame":[18.6,20.5,20,25.9],"max":[156.3,175.6,149.9,123.2]},"after":{"runs":4,"over33":[3,3,3,16],"over33Median":3,"over33Max":16,"medianFrame":[16.8,18.1,16.8,16.8],"max":[86.7,216.1,135.1,162.7]}},"headed":{"before":{"runs":4,"over33":[3,3,5,5],"over33Median":5,"over33Max":5,"medianFrame":[17.4,16.7,16.7,16.6],"max":[721.4,157.8,489.2,821.1]},"after":{"runs":4,"over33":[1,1,4,6],"over33Median":4,"over33Max":6,"medianFrame":[16.7,16.7,16.7,16.6],"max":[148.1,587.8,78.5,68.9]}}}

### T3 Skip（入力貫通 0・未再生 SE キャンセル）

| run | 入力時刻（rel） | 入口中の入力 | skip→消滅 | skip→End Round 押せる | save 不変 | UI 不変（手札/AP/R/残り） | 手札 before→after | 顕現 SE が skip 後に鳴った | SE（rel） | 入力イベント（target） | error |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pc/card@300 | 304 | true | 206 | 206 | true | true | 5→5 | false | 2:0.11s・264:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| pc/end@300 | 304 | true | 228 | 228 | true | true | 5→5 | false | -213:0.11s・263:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| pc/oracle@300 | 303 | true | 210 | 210 | true | true | 5→5 | false | -247:0.11s・267:0.15s | click→・pointerdown(入口)→battle-entrance-god・pointerup→battle-entrance-god・click→battle-entrance-god | 0 |
| pc/Enter@300 | 305 | true | 221 | 221 | true | true | 5→5 | false | -17:0.11s・254:0.15s | click→・keydown(入口)→card-view card-view-ha・keyup→card-view card-view-ha | 0 |
| pc/Space@300 | 305 | true | 241 | 241 | true | true | 5→5 | false | -198:0.11s・268:0.15s | click→・keydown(入口)→card-view card-view-ha・keyup→card-view card-view-ha | 0 |
| pc/EscapeOracle@300 | 304 | true | 246 | 246 | true | true | 5→5 | false | -157:0.11s・271:0.15s | click→・keydown(入口)→divination-choice・keyup→divination-choice | 0 |
| pc/card@60 | 188 | true | 251 | 251 | true | true | 5→5 | false | -198:0.11s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| pc/card@1800 | 1823 | true | 232 | 232 | true | true | 5→5 | false | -139:0.11s・263:0.15s・1519:0.96s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/card@300 | 305 | true | 204 | 204 | true | true | 5→5 | false | 9:0.11s・252:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/end@300 | 307 | true | 213 | 213 | true | true | 5→5 | false | 15:0.11s・269:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/oracle@300 | 306 | true | 209 | 209 | true | true | 5→5 | false | 23:0.11s・266:0.15s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |
| sp/card@1800 | 1815 | true | 226 | 226 | true | true | 5→5 | false | 32:0.11s・256:0.15s・1504:0.96s | click→・pointerdown(入口)→battle-entrance-bg・pointerup→battle-entrance-bg・click→battle-entrance-bg | 0 |

### T2 Revisit（同セッション 2 戦目・ホーム経由・reload 後）

| vp | 1 戦目 variant／消滅 | 結果到達 | もう一度 variant／操作可／消滅／SE | ホーム経由 variant／消滅／見出し | reload→続きから 入口 | reload→新規 variant／消滅 | error |
|---|---|---|---|---|---|---|---|
| pc | full／3045 | true／true | short／1189／1553／-138:0.11s・123:0.15s・459:0.96s | short／1559／null | なし | full／2817 | 0 |
| sp | full／2821 | true／true | short／1204／1573／-66:0.11s・131:0.15s・478:0.96s | short／1523／null | なし | full／2855 | 0 |

### T6 続きから（入口なし）／T7 初陣・Daily

| run | variant | 入口 | 消滅（rel） | SE | End Round 有効 | click 後に取得した入口素材 | error |
|---|---|---|---|---|---|---|---|
| t6-resume/pc/before | — | なし | — | 0 | — | — | 0 |
| t6-resume/pc/after | — | なし | — | 0 | — | — | 0 |
| t7-first/pc/before | legacy | あり | 1178 | -141:0.11s・-27:0.96s | true | se/resonance_gain.wav・se/boss_entrance.wav・gods/ebisu/front_640.webp・backgrounds/stages/01-trial-shadow.webp・enemies/datenshi/art.webp | 0 |
| t7-first/sp/before | legacy | あり | 1292 | 108:0.11s・110:0.96s | true | se/resonance_gain.wav・se/boss_entrance.wav・gods/ebisu/front_640.webp・backgrounds/stages/01-trial-shadow.webp・enemies/datenshi/art.webp | 0 |
| t7-first/pc/after | full | あり | 3042 | 469:0.15s・1730:0.96s | true | 0 | 0 |
| t7-first/sp/after | full | あり | 2825 | 14:0.11s・262:0.15s・1519:0.96s | true | 0 | 0 |
| t7-daily/pc/before | legacy | あり | 1128 | -207:0.11s・-185:0.96s | true | DAILY tag true | 0 |
| t7-daily/pc/after | full | あり | 2864 | -238:0.11s・269:0.15s・1519:0.96s | true | DAILY tag true | 0 |

### 7 柱（選んだ神の見出し・画像・神色）

| god idx | 見出し | img | 敵名 | --god-accent | variant | 消滅 | error |
|---|---|---|---|---|---|---|---|
| 0 | 恵比寿 降臨 | /assets/gods/ebisu/front_640.webp | 試練の影 | #ff6b5e | full | 3094 | 0 |
| 1 | 大耀 降臨 | /assets/gods/taiyo/front_640.webp | 業斧の鬼将 | #e8b33d | full | 3051 | 0 |
| 2 | 蒼毘 降臨 | /assets/gods/sobi/front_640.webp | 藍花の怨霊 | #4d9fff | full | 2885 | 0 |
| 3 | 才華 降臨 | /assets/gods/saika/front_640.webp | 銀甲の機工師 | #c96bff | full | 2856 | 0 |
| 4 | 寿楽 降臨 | /assets/gods/juraku/front_640.webp | 双牙の魔獣 | #6ec972 | full | 2858 | 0 |
| 5 | 福永 降臨 | /assets/gods/fukuei/front_640.webp | 蒼海の龍神 | #3ddbb0 | full | 2834 | 0 |
| 6 | 笑蓮 降臨 | /assets/gods/shouren/front_640.webp | 乱舞の道化 | #ff7fb3 | full | 2813 | 0 |

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
