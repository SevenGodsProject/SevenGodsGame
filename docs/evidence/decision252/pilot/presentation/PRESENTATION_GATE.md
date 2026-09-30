# 決定252 Pilot — Presentation regression gate（Playwright・Before :4271＝Production 7db95ae dist／After :4272＝Pilot dist・PC 1508×660／SP 390×844・6 組み合わせ × 2 端末 × Before/After＝24 走）

| case | 端末 | side | R | 予告文 | 名札 class | 立ち絵 class | 足元の環（::after 高さ） | カットイン | 立ち絵 box | 予告 box | 反転 scale | console error | 横スクロール | 決定249 R1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| taiyo-oni-normal | pc | before | 1 | 50 |  |  | — | — | [238,203,291,194] | [164,167,43,25] | -1 1 | 0 | なし | rl-brace |
| taiyo-oni-normal | pc | before | 2 | 90 |  |  | — | — | [237,201,293,195] | [164,167,43,25] | -1 1 | 0 | なし |  |
| taiyo-oni-normal | pc | before | 3 | 強打 130 | intent-tier-strong | intent-strong | — | — | [238,203,291,194] | [164,167,97,25] | -1 1 | 0 | なし |  |
| taiyo-oni-normal | pc | before | 4 | 特大 170 | intent-tier-huge | intent-huge | — | — | [236,115,294,105] | [164,167,96,25] | -1 1 | 0 | なし |  |
| taiyo-oni-normal | pc | after | 1 | 50 |  |  | — | — | [237,202,292,195] | [164,167,43,25] | -1 1 | 0 | なし | rl-brace |
| taiyo-oni-normal | pc | after | 2 | 90 |  |  | — | — | [237,202,292,195] | [164,167,43,25] | -1 1 | 0 | なし |  |
| taiyo-oni-normal | pc | after | 3 | 斧を振りかぶっている… | intent-tier-charge | charging charging-super | — | — | [236,199,294,196] | [164,167,200,25] | -1 1 | 0 | なし |  |
| taiyo-oni-normal | pc | after | 4 | 業斧・断岩 260 | intent-tier-huge | intent-special | 9.35938px | ✔ 業斧・断岩 | [238,117,291,104] | [164,167,150,25] | -1 1 | 0 | なし |  |
| taiyo-doukeshi-hard | pc | before | 1 | 50 |  |  | — | — | [237,202,291,194] | [164,167,43,25] | -1 1 | 0 | なし | rl-brace |
| taiyo-doukeshi-hard | pc | before | 2 | カードを宙に舞わせている… | intent-tier-charge | charging | — | — | [237,201,292,195] | [164,167,234,25] | -1 1 | 0 | なし |  |
| taiyo-doukeshi-hard | pc | before | 3 | 特大 220 | intent-tier-huge | intent-huge | — | — | [237,198,292,195] | [164,167,100,25] | -1 1 | 0 | なし |  |
| taiyo-doukeshi-hard | pc | before | 4 | カードを宙に舞わせている… | intent-tier-charge | charging | — | — | [236,117,294,106] | [164,167,234,25] | -1 1 | 0 | なし |  |
| taiyo-doukeshi-hard | pc | before | 5 | 特大 280 | intent-tier-huge | intent-huge | — | — | [236,115,294,105] | [164,167,100,25] | -1 1 | 0 | なし |  |
| taiyo-doukeshi-hard | pc | after | 1 | 50 |  |  | — | — | [238,203,290,194] | [164,167,43,25] | -1 1 | 0 | なし | rl-brace |
| taiyo-doukeshi-hard | pc | after | 2 | ⚠ 手品を仕込んでいる… | intent-tier-charge | charging charging-super | — | — | [236,199,294,196] | [164,167,224,25] | -1 1 | 0 | なし |  |
| taiyo-doukeshi-hard | pc | after | 3 | 乱舞・狂宴 280 | intent-tier-huge | intent-special | 17.4062px | ✔ 乱舞・狂宴 | [238,200,290,194] | [164,167,150,25] | -1 1 | 0 | なし |  |
| ebisu-juuma-stake6 | pc | before | 1 | 連撃 70+50 | intent-tier-strong | intent-strong | — | — | [238,203,291,194] | [164,167,124,25] | -1 1 | 0 | なし | rl-brace |
| ebisu-juuma-stake6 | pc | before | 2 | 連撃 70×2 | intent-tier-strong | intent-strong | — | — | [236,199,294,196] | [164,167,113,25] | -1 1 | 0 | なし |  |
| ebisu-juuma-stake6 | pc | before | 3 | 双牙乱撃 60+60+50 | intent-tier-huge | intent-special | 17.4062px | ✔ 双牙乱撃 | [237,199,291,194] | [164,167,201,25] | -1 1 | 0 | なし |  |
| ebisu-juuma-stake6 | pc | after | 1 | 連撃 60+40 | intent-tier-strong | intent-strong | — | — | [238,203,290,194] | [164,167,125,25] | -1 1 | 0 | なし | rl-brace |
| ebisu-juuma-stake6 | pc | after | 2 | 連撃 60×2 | intent-tier-strong | intent-strong | — | — | [236,199,294,196] | [164,167,114,25] | -1 1 | 0 | なし |  |
| ebisu-juuma-stake6 | pc | after | 3 | 双牙乱撃 60+60+50 | intent-tier-huge | intent-special | 17.4062px | ✔ 双牙乱撃 | [236,197,294,196] | [164,167,201,25] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | pc | before | 1 | 60 |  |  | — | — | [238,203,290,194] | [164,167,43,25] | -1 1 | 0 | なし | rl-brace |
| taiyo-karakuri-normal | pc | before | 2 | 砲身に魔力を溜めている… | intent-tier-charge | charging | — | — | [237,202,292,195] | [164,167,233,25] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | pc | before | 3 | 特大 220 | intent-tier-huge | intent-huge | — | — | [238,199,291,194] | [164,167,100,25] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | pc | before | 4 | ⚠ 主砲充填開始…！ | intent-tier-charge | charging charging-super | — | — | [236,118,293,105] | [164,167,203,25] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | pc | before | 5 | 主砲・神滅甲 240 | intent-tier-huge | intent-special | 9.35938px | ✔ 主砲・神滅甲 | [237,115,293,105] | [164,167,170,25] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | pc | after | 1 | 60 |  |  | — | — | [238,203,290,194] | [164,167,43,25] | -1 1 | 0 | なし | rl-brace |
| taiyo-karakuri-normal | pc | after | 2 | 砲身に魔力を溜めている… | intent-tier-charge | charging | — | — | [237,202,292,195] | [164,167,233,25] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | pc | after | 3 | 特大 220 | intent-tier-huge | intent-huge | — | — | [237,199,291,194] | [164,167,100,25] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | pc | after | 4 | ⚠ 主砲充填開始…！ | intent-tier-charge | charging charging-super | — | — | [236,117,294,106] | [164,167,203,25] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | pc | after | 5 | 主砲・神滅甲 240 | intent-tier-huge | intent-special | 9.35938px | ✔ 主砲・神滅甲 | [236,114,294,105] | [164,167,170,25] | -1 1 | 0 | なし |  |
| taiyo-onryo-normal | pc | before | 1 | 30 |  |  | — | — | [237,202,292,195] | [164,167,43,25] | -1 1 | 0 | なし | rl-rise rl-tone-power |
| taiyo-onryo-normal | pc | before | 2 | 60 |  |  | — | — | [238,203,291,194] | [164,167,43,25] | -1 1 | 0 | なし |  |
| taiyo-onryo-normal | pc | before | 3 | 強打 130 | intent-tier-strong | intent-strong | — | — | [237,202,292,195] | [164,167,97,25] | -1 1 | 0 | なし |  |
| taiyo-onryo-normal | pc | before | 4 | 特大 230 | intent-tier-huge | intent-huge | — | — | [238,117,291,104] | [164,167,100,25] | -1 1 | 0 | なし |  |
| taiyo-onryo-normal | pc | after | 1 | 30 |  |  | — | — | [238,203,291,194] | [164,167,43,25] | -1 1 | 0 | なし | rl-rise rl-tone-power |
| taiyo-onryo-normal | pc | after | 2 | 60 |  |  | — | — | [237,201,292,195] | [164,167,43,25] | -1 1 | 0 | なし |  |
| taiyo-onryo-normal | pc | after | 3 | 強打 130 | intent-tier-strong | intent-strong | — | — | [237,202,292,195] | [164,167,97,25] | -1 1 | 0 | なし |  |
| taiyo-onryo-normal | pc | after | 4 | 怨嗟の花 230 | intent-tier-huge | intent-special | 9.35938px | ✔ 怨嗟の花 | [238,118,290,104] | [164,167,137,25] | -1 1 | 0 | なし |  |
| taiyo-ryujin-normal | pc | before | 1 | 40 |  |  | — | — | [238,203,291,194] | [164,167,44,25] | -1 1 | 0 | なし | rl-brace |
| taiyo-ryujin-normal | pc | before | 2 | 70 |  |  | — | — | [237,202,292,195] | [164,167,43,25] | -1 1 | 0 | なし |  |
| taiyo-ryujin-normal | pc | before | 3 | 強打 120 | intent-tier-strong | intent-strong | — | — | [237,202,292,195] | [164,167,97,25] | -1 1 | 0 | なし |  |
| taiyo-ryujin-normal | pc | before | 4 | 特大 200 | intent-tier-huge | intent-huge | — | — | [238,118,290,104] | [164,167,100,25] | -1 1 | 0 | なし |  |
| taiyo-ryujin-normal | pc | after | 1 | 40 |  |  | — | — | [238,202,291,194] | [164,167,44,25] | -1 1 | 0 | なし | rl-brace |
| taiyo-ryujin-normal | pc | after | 2 | 70 |  |  | — | — | [237,202,292,195] | [164,167,43,25] | -1 1 | 0 | なし |  |
| taiyo-ryujin-normal | pc | after | 3 | 強打 120 | intent-tier-strong | intent-strong | — | — | [236,199,294,196] | [164,167,97,25] | -1 1 | 0 | なし |  |
| taiyo-ryujin-normal | pc | after | 4 | 大海嘯 200 | intent-tier-huge | intent-special | 9.35938px | ✔ 大海嘯 | [238,118,290,104] | [164,167,120,25] | -1 1 | 0 | なし |  |
| taiyo-oni-normal | sp | before | 1 | 50 |  |  | — | — | [10,389,176,168] | [30,158,37,21] | -1 1 | 0 | なし | rl-brace |
| taiyo-oni-normal | sp | before | 2 | 90 |  |  | — | — | [10,387,177,169] | [30,158,37,21] | -1 1 | 0 | なし |  |
| taiyo-oni-normal | sp | before | 3 | 強打 130 | intent-tier-strong | intent-strong | — | — | [9,385,178,170] | [30,158,82,21] | -1 1 | 0 | なし |  |
| taiyo-oni-normal | sp | before | 4 | 特大 170 | intent-tier-huge | intent-huge | — | — | [10,386,176,168] | [30,158,82,21] | -1 1 | 0 | なし |  |
| taiyo-oni-normal | sp | after | 1 | 50 |  |  | — | — | [10,389,176,168] | [30,158,37,21] | -1 1 | 0 | なし | rl-brace |
| taiyo-oni-normal | sp | after | 2 | 90 |  |  | — | — | [10,388,177,169] | [30,158,37,21] | -1 1 | 0 | なし |  |
| taiyo-oni-normal | sp | after | 3 | 斧を振りかぶっている… | intent-tier-charge | charging charging-super | — | — | [9,385,178,170] | [30,158,110,43] | -1 1 | 0 | なし |  |
| taiyo-oni-normal | sp | after | 4 | 業斧・断岩 260 | intent-tier-huge | intent-special | 15.0938px | ✔ 業斧・断岩 | [9,383,178,170] | [30,158,110,43] | -1 1 | 0 | なし |  |
| taiyo-doukeshi-hard | sp | before | 1 | 50 |  |  | — | — | [10,389,176,168] | [30,158,37,21] | -1 1 | 0 | なし | rl-brace |
| taiyo-doukeshi-hard | sp | before | 2 | カードを宙に舞わせている… | intent-tier-charge | charging | — | — | [10,389,176,168] | [30,158,110,43] | -1 1 | 0 | なし |  |
| taiyo-doukeshi-hard | sp | before | 3 | 特大 220 | intent-tier-huge | intent-huge | — | — | [10,384,177,169] | [30,158,85,21] | -1 1 | 0 | なし |  |
| taiyo-doukeshi-hard | sp | before | 4 | カードを宙に舞わせている… | intent-tier-charge | charging | — | — | [9,385,178,170] | [30,158,110,43] | -1 1 | 0 | なし |  |
| taiyo-doukeshi-hard | sp | before | 5 | 特大 280 | intent-tier-huge | intent-huge | — | — | [10,384,177,169] | [30,158,85,21] | -1 1 | 0 | なし |  |
| taiyo-doukeshi-hard | sp | after | 1 | 50 |  |  | — | — | [10,389,176,168] | [30,158,37,21] | -1 1 | 0 | なし | rl-brace |
| taiyo-doukeshi-hard | sp | after | 2 | ⚠ 手品を仕込んでいる… | intent-tier-charge | charging charging-super | — | — | [9,386,178,170] | [30,158,110,43] | -1 1 | 0 | なし |  |
| taiyo-doukeshi-hard | sp | after | 3 | 乱舞・狂宴 280 | intent-tier-huge | intent-special | 15.0938px | ✔ 乱舞・狂宴 | [9,382,178,170] | [30,158,110,43] | -1 1 | 0 | なし |  |
| ebisu-juuma-stake6 | sp | before | 1 | 連撃 70+50 | intent-tier-strong | intent-strong | — | — | [10,389,176,168] | [30,158,106,21] | -1 1 | 0 | なし | rl-brace |
| ebisu-juuma-stake6 | sp | before | 2 | 連撃 70×2 | intent-tier-strong | intent-strong | — | — | [10,388,176,168] | [30,158,96,21] | -1 1 | 0 | なし |  |
| ebisu-juuma-stake6 | sp | before | 3 | 双牙乱撃 60+60+50 | intent-tier-huge | intent-special | 15.0938px | ✔ 双牙乱撃 | [10,386,176,168] | [30,158,110,43] | -1 1 | 0 | なし |  |
| ebisu-juuma-stake6 | sp | after | 1 | 連撃 60+40 | intent-tier-strong | intent-strong | — | — | [10,389,176,168] | [30,158,106,21] | -1 1 | 0 | なし | rl-brace |
| ebisu-juuma-stake6 | sp | after | 2 | 連撃 60×2 | intent-tier-strong | intent-strong | — | — | [10,388,176,168] | [30,158,97,21] | -1 1 | 0 | なし |  |
| ebisu-juuma-stake6 | sp | after | 3 | 双牙乱撃 60+60+50 | intent-tier-huge | intent-special | 15.0938px | ✔ 双牙乱撃 | [10,385,176,168] | [30,158,110,43] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | sp | before | 1 | 60 |  |  | — | — | [10,389,176,168] | [30,158,37,21] | -1 1 | 0 | なし | rl-brace |
| taiyo-karakuri-normal | sp | before | 2 | 砲身に魔力を溜めている… | intent-tier-charge | charging | — | — | [10,387,177,169] | [30,158,110,43] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | sp | before | 3 | 特大 220 | intent-tier-huge | intent-huge | — | — | [9,383,178,170] | [30,158,85,21] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | sp | before | 4 | ⚠ 主砲充填開始…！ | intent-tier-charge | charging charging-super | — | — | [10,386,178,169] | [30,158,110,43] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | sp | before | 5 | 主砲・神滅甲 240 | intent-tier-huge | intent-special | 15.0938px | ✔ 主砲・神滅甲 | [10,385,176,168] | [30,158,110,43] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | sp | after | 1 | 60 |  |  | — | — | [10,389,176,168] | [30,158,37,21] | -1 1 | 0 | なし | rl-brace |
| taiyo-karakuri-normal | sp | after | 2 | 砲身に魔力を溜めている… | intent-tier-charge | charging | — | — | [10,387,177,169] | [30,158,110,43] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | sp | after | 3 | 特大 220 | intent-tier-huge | intent-huge | — | — | [9,382,178,170] | [30,158,85,21] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | sp | after | 4 | ⚠ 主砲充填開始…！ | intent-tier-charge | charging charging-super | — | — | [9,386,178,170] | [30,158,110,43] | -1 1 | 0 | なし |  |
| taiyo-karakuri-normal | sp | after | 5 | 主砲・神滅甲 240 | intent-tier-huge | intent-special | 15.0938px | ✔ 主砲・神滅甲 | [9,383,178,170] | [30,158,110,43] | -1 1 | 0 | なし |  |
| taiyo-onryo-normal | sp | before | 1 | 30 |  |  | — | — | [10,389,176,168] | [30,158,37,21] | -1 1 | 0 | なし | rl-rise rl-tone-power |
| taiyo-onryo-normal | sp | before | 2 | 60 |  |  | — | — | [10,387,177,169] | [30,158,37,21] | -1 1 | 0 | なし |  |
| taiyo-onryo-normal | sp | before | 3 | 強打 130 | intent-tier-strong | intent-strong | — | — | [10,388,177,169] | [30,158,82,21] | -1 1 | 0 | なし |  |
| taiyo-onryo-normal | sp | before | 4 | 特大 230 | intent-tier-huge | intent-huge | — | — | [10,386,176,168] | [30,158,85,21] | -1 1 | 0 | なし |  |
| taiyo-onryo-normal | sp | after | 1 | 30 |  |  | — | — | [10,389,176,168] | [30,158,37,21] | -1 1 | 0 | なし | rl-rise rl-tone-power |
| taiyo-onryo-normal | sp | after | 2 | 60 |  |  | — | — | [9,386,178,170] | [30,158,37,21] | -1 1 | 0 | なし |  |
| taiyo-onryo-normal | sp | after | 3 | 強打 130 | intent-tier-strong | intent-strong | — | — | [9,386,178,170] | [30,158,82,21] | -1 1 | 0 | なし |  |
| taiyo-onryo-normal | sp | after | 4 | 怨嗟の花 230 | intent-tier-huge | intent-special | 15.0938px | ✔ 怨嗟の花 | [10,386,176,168] | [30,158,110,43] | -1 1 | 0 | なし |  |
| taiyo-ryujin-normal | sp | before | 1 | 40 |  |  | — | — | [10,389,176,168] | [30,158,37,21] | -1 1 | 0 | なし | rl-brace |
| taiyo-ryujin-normal | sp | before | 2 | 70 |  |  | — | — | [10,387,177,169] | [30,158,36,21] | -1 1 | 0 | なし |  |
| taiyo-ryujin-normal | sp | before | 3 | 強打 120 | intent-tier-strong | intent-strong | — | — | [9,385,178,170] | [30,158,82,21] | -1 1 | 0 | なし |  |
| taiyo-ryujin-normal | sp | before | 4 | 特大 200 | intent-tier-huge | intent-huge | — | — | [10,386,176,168] | [30,158,85,21] | -1 1 | 0 | なし |  |
| taiyo-ryujin-normal | sp | after | 1 | 40 |  |  | — | — | [10,389,176,168] | [30,158,37,21] | -1 1 | 0 | なし | rl-brace |
| taiyo-ryujin-normal | sp | after | 2 | 70 |  |  | — | — | [9,385,178,170] | [30,158,36,21] | -1 1 | 0 | なし |  |
| taiyo-ryujin-normal | sp | after | 3 | 強打 120 | intent-tier-strong | intent-strong | — | — | [9,385,178,170] | [30,158,82,21] | -1 1 | 0 | なし |  |
| taiyo-ryujin-normal | sp | after | 4 | 大海嘯 200 | intent-tier-huge | intent-special | 15.0938px | ✔ 大海嘯 | [10,386,176,168] | [30,158,102,21] | -1 1 | 0 | なし |  |