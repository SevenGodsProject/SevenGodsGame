# 決定252 Pilot — Enemy Identity Gate（実 runtime・大耀 推奨デッキ・seed d252-identity・自HP 1000 固定で全 7R を観測）

rules: specialMul 1.2 / specialMulCap {"enemy_04":1.1,"enemy_03":1,"enemy_06":1} / 神階Ⅵ 表示: 託宣は2回まで・R6以降 敵の攻撃+30%・敵の攻撃+15%・初期手札−1・敵HP+15%・ブロック効率75%（加護を除く）・回復効率60%・敵の必殺+20%

## 試練の影（HP 103・標準・入門型「基本を守れば戦える。R4に攻撃が強まる。」）

| ctx | R | kind | 名前／label | 予告 amount | 予告表示（formatEnemyIntent） | danger | 名札 class | 構え class | charging-super | ENEMY_ACTED |
|---|---|---|---|---|---|---|---|---|---|---|
| normal | 1 | attack |  | 5 | ⚔ 50 | none | — | — |  | attack 5 |
| normal | 2 | attack |  | 8 | ⚔ 80 | none | — | — |  | attack 8 |
| normal | 3 | attack |  | 11 | 💥 強打 110 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 11 |
| normal | 4 | attack |  | 15 | 🔥 特大 150 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 15 |
| normal | 5 | attack |  | 13 | 💥 強打 130 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 13 |
| normal | 6 | attack |  | 9 | ⚔ 90 | none | — | — |  | attack 9 |
| normal | 7 | attack |  | 6 | ⚔ 60 | none | — | — |  | attack 6 |
| hard | 1 | attack |  | 6 | ⚔ 60 | none | — | — |  | attack 6 |
| hard | 2 | attack |  | 9 | ⚔ 90 | none | — | — |  | attack 9 |
| hard | 3 | attack |  | 13 | 💥 強打 130 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 13 |
| hard | 4 | attack |  | 17 | 🔥 特大 170 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 17 |
| hard | 5 | attack |  | 15 | 🔥 特大 150 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 15 |
| hard | 6 | attack |  | 10 | 💥 強打 100 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 10 |
| hard | 7 | attack |  | 7 | ⚔ 70 | none | — | — |  | attack 7 |
| Ⅵ | 1 | attack |  | 6 | ⚔ 60 | none | — | — |  | attack 6 |
| Ⅵ | 2 | attack |  | 9 | ⚔ 90 | none | — | — |  | attack 9 |
| Ⅵ | 3 | attack |  | 13 | 💥 強打 130 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 13 |
| Ⅵ | 4 | attack |  | 17 | 🔥 特大 170 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 17 |
| Ⅵ | 5 | attack |  | 15 | 🔥 特大 150 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 15 |
| Ⅵ | 6 | attack |  | 13 | 💥 強打 130 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 13 |
| Ⅵ | 7 | attack |  | 9 | ⚔ 90 | none | — | — |  | attack 9 |

## 業斧の鬼将（HP 94・重撃型「溜めの次に断岩。R4を受け切れ。」）

| ctx | R | kind | 名前／label | 予告 amount | 予告表示（formatEnemyIntent） | danger | 名札 class | 構え class | charging-super | ENEMY_ACTED |
|---|---|---|---|---|---|---|---|---|---|---|
| normal | 1 | attack |  | 5 | ⚔ 50 | none | — | — |  | attack 5 |
| normal | 2 | attack |  | 9 | ⚔ 90 | none | — | — |  | attack 9 |
| normal | 3 | charge | 斧を振りかぶっている… | 0 | ⚡ 斧を振りかぶっている… | charge | intent-tier-charge | — | **yes** | charge 0 斧を振りかぶっている… |
| normal | 4 | special | 業斧・断岩 | 26 | 🔥 業斧・断岩 260 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 26 業斧・断岩 |
| normal | 5 | attack |  | 15 | 🔥 特大 150 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 15 |
| normal | 6 | attack |  | 11 | 💥 強打 110 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 11 |
| normal | 7 | attack |  | 7 | ⚔ 70 | none | — | — |  | attack 7 |
| hard | 1 | attack |  | 6 | ⚔ 60 | none | — | — |  | attack 6 |
| hard | 2 | attack |  | 10 | 💥 強打 100 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 10 |
| hard | 3 | charge | 斧を振りかぶっている… | 0 | ⚡ 斧を振りかぶっている… | charge | intent-tier-charge | — | **yes** | charge 0 斧を振りかぶっている… |
| hard | 4 | special | 業斧・断岩 | 30 | 🔥 業斧・断岩 300 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 30 業斧・断岩 |
| hard | 5 | attack |  | 17 | 🔥 特大 170 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 17 |
| hard | 6 | attack |  | 13 | 💥 強打 130 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 13 |
| hard | 7 | attack |  | 8 | ⚔ 80 | none | — | — |  | attack 8 |
| Ⅵ | 1 | attack |  | 6 | ⚔ 60 | none | — | — |  | attack 6 |
| Ⅵ | 2 | attack |  | 10 | 💥 強打 100 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 10 |
| Ⅵ | 3 | charge | 斧を振りかぶっている… | 0 | ⚡ 斧を振りかぶっている… | charge | intent-tier-charge | — | **yes** | charge 0 斧を振りかぶっている… |
| Ⅵ | 4 | special | 業斧・断岩 | 36 | 🔥 業斧・断岩 360 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 36 業斧・断岩 |
| Ⅵ | 5 | attack |  | 17 | 🔥 特大 170 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 17 |
| Ⅵ | 6 | attack |  | 16 | 🔥 特大 160 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 16 |
| Ⅵ | 7 | attack |  | 10 | 💥 強打 100 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 10 |

## 藍花の怨霊（HP 95・遅咲き型「R4に怨嗟の花。峰に備え温存せよ。」）

| ctx | R | kind | 名前／label | 予告 amount | 予告表示（formatEnemyIntent） | danger | 名札 class | 構え class | charging-super | ENEMY_ACTED |
|---|---|---|---|---|---|---|---|---|---|---|
| normal | 1 | attack |  | 3 | ⚔ 30 | none | — | — |  | attack 3 |
| normal | 2 | attack |  | 6 | ⚔ 60 | none | — | — |  | attack 6 |
| normal | 3 | attack |  | 13 | 💥 強打 130 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 13 |
| normal | 4 | special | 怨嗟の花 | 23 | 🔥 怨嗟の花 230 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 23 怨嗟の花 |
| normal | 5 | attack |  | 18 | 🔥 特大 180 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 18 |
| normal | 6 | attack |  | 9 | ⚔ 90 | none | — | — |  | attack 9 |
| normal | 7 | attack |  | 4 | ⚔ 40 | none | — | — |  | attack 4 |
| hard | 1 | attack |  | 3 | ⚔ 30 | none | — | — |  | attack 3 |
| hard | 2 | attack |  | 7 | ⚔ 70 | none | — | — |  | attack 7 |
| hard | 3 | attack |  | 15 | 🔥 特大 150 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 15 |
| hard | 4 | special | 怨嗟の花 | 26 | 🔥 怨嗟の花 260 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 26 怨嗟の花 |
| hard | 5 | attack |  | 21 | 🔥 特大 210 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 21 |
| hard | 6 | attack |  | 10 | 💥 強打 100 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 10 |
| hard | 7 | attack |  | 5 | ⚔ 50 | none | — | — |  | attack 5 |
| Ⅵ | 1 | attack |  | 3 | ⚔ 30 | none | — | — |  | attack 3 |
| Ⅵ | 2 | attack |  | 7 | ⚔ 70 | none | — | — |  | attack 7 |
| Ⅵ | 3 | attack |  | 15 | 🔥 特大 150 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 15 |
| Ⅵ | 4 | special | 怨嗟の花 | 26 | 🔥 怨嗟の花 260 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 26 怨嗟の花 |
| Ⅵ | 5 | attack |  | 21 | 🔥 特大 210 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 21 |
| Ⅵ | 6 | attack |  | 13 | 💥 強打 130 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 13 |
| Ⅵ | 7 | attack |  | 6 | ⚔ 60 | none | — | — |  | attack 6 |

## 銀甲の機工師（HP 100・溜め型「溜めの次に大技。R5の主砲に備えよ。」）

| ctx | R | kind | 名前／label | 予告 amount | 予告表示（formatEnemyIntent） | danger | 名札 class | 構え class | charging-super | ENEMY_ACTED |
|---|---|---|---|---|---|---|---|---|---|---|
| normal | 1 | attack |  | 6 | ⚔ 60 | none | — | — |  | attack 6 |
| normal | 2 | charge | 砲身に魔力を溜めている… | 0 | ⚡ 砲身に魔力を溜めている… | charge | intent-tier-charge | — |  | charge 0 砲身に魔力を溜めている… |
| normal | 3 | attack |  | 22 | 🔥 特大 220 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 22 |
| normal | 4 | charge | ⚠ 主砲充填開始…！ | 0 | ⚡ ⚠ 主砲充填開始…！ | charge | intent-tier-charge | — | **yes** | charge 0 ⚠ 主砲充填開始…！ |
| normal | 5 | special | 主砲・神滅甲 | 24 | 🔥 主砲・神滅甲 240 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 24 主砲・神滅甲 |
| normal | 6 | attack |  | 7 | ⚔ 70 | none | — | — |  | attack 7 |
| normal | 7 | attack |  | 9 | ⚔ 90 | none | — | — |  | attack 9 |
| hard | 1 | attack |  | 7 | ⚔ 70 | none | — | — |  | attack 7 |
| hard | 2 | charge | 砲身に魔力を溜めている… | 0 | ⚡ 砲身に魔力を溜めている… | charge | intent-tier-charge | — |  | charge 0 砲身に魔力を溜めている… |
| hard | 3 | attack |  | 25 | 🔥 特大 250 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 25 |
| hard | 4 | charge | ⚠ 主砲充填開始…！ | 0 | ⚡ ⚠ 主砲充填開始…！ | charge | intent-tier-charge | — | **yes** | charge 0 ⚠ 主砲充填開始…！ |
| hard | 5 | special | 主砲・神滅甲 | 28 | 🔥 主砲・神滅甲 280 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 28 主砲・神滅甲 |
| hard | 6 | attack |  | 8 | ⚔ 80 | none | — | — |  | attack 8 |
| hard | 7 | attack |  | 10 | 💥 強打 100 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 10 |
| Ⅵ | 1 | attack |  | 7 | ⚔ 70 | none | — | — |  | attack 7 |
| Ⅵ | 2 | charge | 砲身に魔力を溜めている… | 0 | ⚡ 砲身に魔力を溜めている… | charge | intent-tier-charge | — |  | charge 0 砲身に魔力を溜めている… |
| Ⅵ | 3 | attack |  | 25 | 🔥 特大 250 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 25 |
| Ⅵ | 4 | charge | ⚠ 主砲充填開始…！ | 0 | ⚡ ⚠ 主砲充填開始…！ | charge | intent-tier-charge | — | **yes** | charge 0 ⚠ 主砲充填開始…！ |
| Ⅵ | 5 | special | 主砲・神滅甲 | 30 | 🔥 主砲・神滅甲 300 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 30 主砲・神滅甲 |
| Ⅵ | 6 | attack |  | 10 | 💥 強打 100 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 10 |
| Ⅵ | 7 | attack |  | 13 | 💥 強打 130 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 13 |

## 双牙の魔獣（HP 85・連撃型「毎ラウンド連撃。序盤から圧が激しい。」）

| ctx | R | kind | 名前／label | 予告 amount | 予告表示（formatEnemyIntent） | danger | 名札 class | 構え class | charging-super | ENEMY_ACTED |
|---|---|---|---|---|---|---|---|---|---|---|
| normal | 1 | multiAttack |  | 9 | ⚔ 連撃 50+40 | none | — | — |  | multiAttack 9 |
| normal | 2 | multiAttack |  | 10 | ⚔ 連撃 50×2 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | multiAttack 10 |
| normal | 3 | multiAttack | 双牙乱撃 | 12 | 🔥 双牙乱撃 40×3 | special | intent-tier-huge | enemy-avatar-intent-special |  | multiAttack 12 双牙乱撃 |
| normal | 4 | multiAttack |  | 16 | ⚔ 連撃 80×2 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | multiAttack 16 |
| normal | 5 | multiAttack |  | 15 | ⚔ 連撃 80+70 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | multiAttack 15 |
| normal | 6 | multiAttack |  | 14 | ⚔ 連撃 70×2 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | multiAttack 14 |
| normal | 7 | multiAttack |  | 13 | ⚔ 連撃 70+60 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | multiAttack 13 |
| hard | 1 | multiAttack |  | 10 | ⚔ 連撃 60+40 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | multiAttack 10 |
| hard | 2 | multiAttack |  | 12 | ⚔ 連撃 60×2 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | multiAttack 12 |
| hard | 3 | multiAttack | 双牙乱撃 | 14 | 🔥 双牙乱撃 50+50+40 | special | intent-tier-huge | enemy-avatar-intent-special |  | multiAttack 14 双牙乱撃 |
| hard | 4 | multiAttack |  | 18 | ⚔ 連撃 90×2 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | multiAttack 18 |
| hard | 5 | multiAttack |  | 17 | ⚔ 連撃 100+70 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | multiAttack 17 |
| hard | 6 | multiAttack |  | 16 | ⚔ 連撃 80×2 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | multiAttack 16 |
| hard | 7 | multiAttack |  | 15 | ⚔ 連撃 90+60 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | multiAttack 15 |
| Ⅵ | 1 | multiAttack |  | 10 | ⚔ 連撃 60+40 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | multiAttack 10 |
| Ⅵ | 2 | multiAttack |  | 12 | ⚔ 連撃 60×2 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | multiAttack 12 |
| Ⅵ | 3 | multiAttack | 双牙乱撃 | 17 | 🔥 双牙乱撃 60+60+50 | special | intent-tier-huge | enemy-avatar-intent-special |  | multiAttack 17 双牙乱撃 |
| Ⅵ | 4 | multiAttack |  | 18 | ⚔ 連撃 90×2 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | multiAttack 18 |
| Ⅵ | 5 | multiAttack |  | 17 | ⚔ 連撃 100+70 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | multiAttack 17 |
| Ⅵ | 6 | multiAttack |  | 21 | ⚔ 連撃 110+100 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | multiAttack 21 |
| Ⅵ | 7 | multiAttack |  | 19 | ⚔ 連撃 110+80 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | multiAttack 19 |

## 蒼海の龍神（HP 103・耐久型「R4の大海嘯。長い波を受け続けろ。」）

| ctx | R | kind | 名前／label | 予告 amount | 予告表示（formatEnemyIntent） | danger | 名札 class | 構え class | charging-super | ENEMY_ACTED |
|---|---|---|---|---|---|---|---|---|---|---|
| normal | 1 | attack |  | 4 | ⚔ 40 | none | — | — |  | attack 4 |
| normal | 2 | attack |  | 7 | ⚔ 70 | none | — | — |  | attack 7 |
| normal | 3 | attack |  | 12 | 💥 強打 120 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 12 |
| normal | 4 | special | 大海嘯 | 20 | 🔥 大海嘯 200 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 20 大海嘯 |
| normal | 5 | attack |  | 16 | 🔥 特大 160 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 16 |
| normal | 6 | attack |  | 9 | ⚔ 90 | none | — | — |  | attack 9 |
| normal | 7 | attack |  | 5 | ⚔ 50 | none | — | — |  | attack 5 |
| hard | 1 | attack |  | 5 | ⚔ 50 | none | — | — |  | attack 5 |
| hard | 2 | attack |  | 8 | ⚔ 80 | none | — | — |  | attack 8 |
| hard | 3 | attack |  | 14 | 💥 強打 140 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 14 |
| hard | 4 | special | 大海嘯 | 23 | 🔥 大海嘯 230 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 23 大海嘯 |
| hard | 5 | attack |  | 18 | 🔥 特大 180 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 18 |
| hard | 6 | attack |  | 10 | 💥 強打 100 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 10 |
| hard | 7 | attack |  | 6 | ⚔ 60 | none | — | — |  | attack 6 |
| Ⅵ | 1 | attack |  | 5 | ⚔ 50 | none | — | — |  | attack 5 |
| Ⅵ | 2 | attack |  | 8 | ⚔ 80 | none | — | — |  | attack 8 |
| Ⅵ | 3 | attack |  | 14 | 💥 強打 140 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 14 |
| Ⅵ | 4 | special | 大海嘯 | 23 | 🔥 大海嘯 230 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 23 大海嘯 |
| Ⅵ | 5 | attack |  | 18 | 🔥 特大 180 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 18 |
| Ⅵ | 6 | attack |  | 13 | 💥 強打 130 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 13 |
| Ⅵ | 7 | attack |  | 7 | ⚔ 70 | none | — | — |  | attack 7 |

## 乱舞の道化（HP 92・トリック型「R3に開幕の必殺。託宣を先に切れ。」）

| ctx | R | kind | 名前／label | 予告 amount | 予告表示（formatEnemyIntent） | danger | 名札 class | 構え class | charging-super | ENEMY_ACTED |
|---|---|---|---|---|---|---|---|---|---|---|
| normal | 1 | attack |  | 4 | ⚔ 40 | none | — | — |  | attack 4 |
| normal | 2 | charge | ⚠ 手品を仕込んでいる… | 0 | ⚡ ⚠ 手品を仕込んでいる… | charge | intent-tier-charge | — | **yes** | charge 0 ⚠ 手品を仕込んでいる… |
| normal | 3 | special | 乱舞・狂宴 | 24 | 🔥 乱舞・狂宴 240 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 24 乱舞・狂宴 |
| normal | 4 | attack |  | 9 | ⚔ 90 | none | — | — |  | attack 9 |
| normal | 5 | charge | また何か仕込んでいる… | 0 | ⚡ また何か仕込んでいる… | charge | intent-tier-charge | — |  | charge 0 また何か仕込んでいる… |
| normal | 6 | attack |  | 19 | 🔥 特大 190 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 19 |
| normal | 7 | attack |  | 9 | ⚔ 90 | none | — | — |  | attack 9 |
| hard | 1 | attack |  | 5 | ⚔ 50 | none | — | — |  | attack 5 |
| hard | 2 | charge | ⚠ 手品を仕込んでいる… | 0 | ⚡ ⚠ 手品を仕込んでいる… | charge | intent-tier-charge | — | **yes** | charge 0 ⚠ 手品を仕込んでいる… |
| hard | 3 | special | 乱舞・狂宴 | 28 | 🔥 乱舞・狂宴 280 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 28 乱舞・狂宴 |
| hard | 4 | attack |  | 10 | 💥 強打 100 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 10 |
| hard | 5 | charge | また何か仕込んでいる… | 0 | ⚡ また何か仕込んでいる… | charge | intent-tier-charge | — |  | charge 0 また何か仕込んでいる… |
| hard | 6 | attack |  | 22 | 🔥 特大 220 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 22 |
| hard | 7 | attack |  | 10 | 💥 強打 100 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 10 |
| Ⅵ | 1 | attack |  | 5 | ⚔ 50 | none | — | — |  | attack 5 |
| Ⅵ | 2 | charge | ⚠ 手品を仕込んでいる… | 0 | ⚡ ⚠ 手品を仕込んでいる… | charge | intent-tier-charge | — | **yes** | charge 0 ⚠ 手品を仕込んでいる… |
| Ⅵ | 3 | special | 乱舞・狂宴 | 33 | 🔥 乱舞・狂宴 330 | special | intent-tier-huge | enemy-avatar-intent-special |  | special 33 乱舞・狂宴 |
| Ⅵ | 4 | attack |  | 10 | 💥 強打 100 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 10 |
| Ⅵ | 5 | charge | また何か仕込んでいる… | 0 | ⚡ また何か仕込んでいる… | charge | intent-tier-charge | — |  | charge 0 また何か仕込んでいる… |
| Ⅵ | 6 | attack |  | 28 | 🔥 特大 280 | huge | intent-tier-huge | enemy-avatar-intent-huge |  | attack 28 |
| Ⅵ | 7 | attack |  | 13 | 💥 強打 130 | strong | intent-tier-strong | enemy-avatar-intent-strong |  | attack 13 |
