# Static audit
cards=60 (common 32 / exclusive 28)
effects per card: single=25 two=35 3+=0
conditional=0 intentRef=0 chain=0

## effect kind usage (effect count / cards containing)
| kind | effects | cards |
| --- | --- | --- |
| damage:enemy | 21 | 21 |
| block | 15 | 15 |
| resonance | 13 | 13 |
| heal | 19 | 19 |
| debuff | 9 | 9 |
| draw | 7 | 7 |
| gainAp | 6 | 6 |
| damage:self | 3 | 3 |
| buff | 2 | 2 |

## signatures
| signature | count | cards |
| --- | --- | --- |
| debuff:enemy:atk | 6 | 呪縛、見切り、威嚇、金縛り、一喝、悪戯 |
| block+heal | 6 | 守りの陣、息継ぎ、後輩想い、誓いの盾、長生きの知恵、笑って許す |
| damage:enemy | 5 | 一撃、剛撃、神託、渾身の一撃、小さな託宣 |
| heal | 5 | 癒し、息吹、大治癒、福授け、福袋 |
| block | 4 | 守護、鉄壁の構え、不動の構え、懐の深さ |
| damage:enemy+resonance | 4 | 神速、乱舞、大漁、一心不乱 |
| block+resonance | 3 | 神楽舞、受け流し、秘技・満ちる |
| damage:enemy+damage:self | 3 | 捨身の一撃、豪快な一撃、一攫千金 |
| heal+resonance | 3 | 巫女の舞、恵比寿顔、気まぐれ |
| damage:enemy+heal | 3 | 潮招き、不屈の一歩、おおらかな一打 |
| damage:enemy+debuff:enemy:atk | 2 | 大喝、からかい半分 |
| buff:self:atk | 2 | 闘志、姉御の号令 |
| damage:enemy+gainAp | 2 | 連撃、独奏 |
| draw+gainAp | 2 | 見通し、アンコール |
| draw+resonance | 2 | 魅惑の舞、冒険者の勘 |
| resonance | 1 | 共振 |
| damage:enemy+draw | 1 | 速攻 |
| gainAp | 1 | 神力の泉 |
| draw | 1 | 予言 |
| debuff:enemy:atk+heal | 1 | 浄めの光 |
| block+damage:enemy | 1 | 反撃の刃 |
| block+draw | 1 | 喝采 |
| gainAp+heal | 1 | 幸運の女神 |

## gods / recommended decks
| god | arche | burst | otomo(guardian) | excl | avgCost | dmg | block | heal | res | resCards | maxBurst | draw | ap | debuff | buff | self |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 恵比寿 | attack | damage25+gainAp2 | incarnate:heal5 / doji:heal5+block8 | 8 | 1.7 | 109 | 20 | 32 | 13 | 6 | 1 | 3 | 0 | 5 | 0 | 0 |
| 大耀 | attack | damage36 | incarnate:buff3 / doji:buff3+block10 | 8 | 1.55 | 82 | 35 | 11 | 9 | 6 | 1 | 3 | 0 | 15 | 12 | 4 |
| 蒼毘 | defense | damage21+block20 | incarnate:block10 / doji:block10+heal6 | 8 | 1.75 | 82 | 52 | 9 | 7 | 4 | 1 | 3 | 0 | 66 | 0 | 0 |
| 才華 | technique | damage12+draw2+gainAp2 | incarnate:draw1 / doji:draw1+gainAp2 | 8 | 1.65 | 76 | 27 | 3 | 13 | 6 | 1 | 9 | 7 | 0 | 0 | 0 |
| 寿楽 | balance | damage23+debuff6 | incarnate:heal3+block3 / doji:heal3+block3+debuff3 | 8 | 1.9 | 115 | 11 | 24 | 9 | 4 | 1 | 2 | 0 | 80 | 0 | 0 |
| 福永 | attack | damage22+heal6+gainAp1 | incarnate:heal5 / doji:heal5+gainAp1+block4 | 8 | 1.55 | 84 | 20 | 29 | 7 | 4 | 1 | 5 | 2 | 15 | 0 | 4 |
| 笑蓮 | support | damage21+heal12+block12 | incarnate:heal8 / doji:heal8+block8 | 4 | 1.6 | 82 | 35 | 38 | 7 | 4 | 1 | 3 | 0 | 15 | 0 | 3 |

## card value per AP
| card | god | type | cost | dmg | blk | heal | res | draw | ap | debuff | buff | self | val/AP | sig |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 神力の泉 | 共通 | support | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 10 | gainAp |
| おおらかな一打 | 笑蓮 | attack | 1 | 7 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 10 | damage:enemy+heal |
| 見通し | 共通 | support | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 9 | draw+gainAp |
| 一喝 | 蒼毘 | hinder | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 18 | 0 | 0 | 9 | debuff:enemy:atk |
| 独奏 | 才華 | attack | 1 | 4 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 9 | damage:enemy+gainAp |
| 幸運の女神 | 福永 | support | 1 | 0 | 0 | 4 | 0 | 0 | 1 | 0 | 0 | 0 | 9 | gainAp+heal |
| 神託 | 共通 | oracle | 3 | 25 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8.33 | damage:enemy |
| 速攻 | 共通 | attack | 1 | 4 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 8 | damage:enemy+draw |
| 金縛り | 共通 | hinder | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 24 | 0 | 0 | 8 | debuff:enemy:atk |
| 悪戯 | 寿楽 | hinder | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 8 | debuff:enemy:atk |
| 長生きの知恵 | 寿楽 | guard | 1 | 0 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | block+heal |
| 笑って許す | 笑蓮 | support | 1 | 0 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | block+heal |
| 呪縛 | 共通 | hinder | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 15 | 0 | 0 | 7.5 | debuff:enemy:atk |
| からかい半分 | 寿楽 | attack | 2 | 7 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 7.5 | damage:enemy+debuff:enemy:atk |
| 大喝 | 共通 | attack | 3 | 18 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 7 | damage:enemy+debuff:enemy:atk |
| 小さな託宣 | 共通 | oracle | 1 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | damage:enemy |
| 潮招き | 恵比寿 | attack | 2 | 10 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | damage:enemy+heal |
| 誓いの盾 | 蒼毘 | guard | 1 | 0 | 4 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | block+heal |
| 反撃の刃 | 蒼毘 | attack | 2 | 8 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | block+damage:enemy |
| アンコール | 才華 | support | 2 | 0 | 0 | 0 | 0 | 1 | 2 | 0 | 0 | 0 | 7 | draw+gainAp |
| 気まぐれ | 寿楽 | resonance | 1 | 0 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 7 | heal+resonance |
| 渾身の一撃 | 共通 | attack | 3 | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6.67 | damage:enemy |
| 大漁 | 恵比寿 | attack | 2 | 8 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 6.5 | damage:enemy+resonance |
| 一心不乱 | 大耀 | attack | 1 | 4 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 6.5 | damage:enemy+resonance |
| 不動の構え | 蒼毘 | guard | 2 | 0 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6.5 | block |
| 一攫千金 | 福永 | attack | 2 | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 6.5 | damage:enemy+damage:self |
| 乱舞 | 共通 | attack | 2 | 10 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 6.25 | damage:enemy+resonance |
| 剛撃 | 共通 | attack | 2 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | damage:enemy |
| 鉄壁の構え | 共通 | guard | 2 | 0 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | block |
| 息吹 | 共通 | support | 2 | 0 | 0 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | heal |
| 守りの陣 | 共通 | guard | 2 | 0 | 8 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | block+heal |
| 息継ぎ | 共通 | support | 1 | 0 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | block+heal |
| 大治癒 | 共通 | support | 3 | 0 | 0 | 18 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | heal |
| 威嚇 | 共通 | hinder | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 6 | debuff:enemy:atk |
| 連撃 | 共通 | attack | 2 | 7 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 6 | damage:enemy+gainAp |
| 浄めの光 | 共通 | hinder | 2 | 0 | 0 | 6 | 0 | 0 | 0 | 6 | 0 | 0 | 6 | debuff:enemy:atk+heal |
| 福授け | 恵比寿 | support | 1 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | heal |
| 豪快な一撃 | 大耀 | attack | 2 | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 6 | damage:enemy+damage:self |
| 姉御の号令 | 大耀 | support | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 6 | buff:self:atk |
| 喝采 | 才華 | support | 1 | 0 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 6 | block+draw |
| 不屈の一歩 | 福永 | attack | 1 | 4 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | damage:enemy+heal |
| 魅惑の舞 | 才華 | resonance | 2 | 0 | 0 | 0 | 3 | 1 | 0 | 0 | 0 | 0 | 5.75 | draw+resonance |
| 神速 | 共通 | attack | 1 | 3 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 5.5 | damage:enemy+resonance |
| 受け流し | 共通 | guard | 1 | 0 | 3 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 5.5 | block+resonance |
| 巫女の舞 | 共通 | resonance | 1 | 0 | 0 | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 5.5 | heal+resonance |
| 恵比寿顔 | 恵比寿 | support | 2 | 0 | 0 | 6 | 2 | 0 | 0 | 0 | 0 | 0 | 5.5 | heal+resonance |
| 福袋 | 笑蓮 | support | 2 | 0 | 0 | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 5.5 | heal |
| 懐の深さ | 笑蓮 | guard | 2 | 0 | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5.5 | block |
| 神楽舞 | 共通 | resonance | 2 | 0 | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 5.25 | block+resonance |
| 一撃 | 共通 | attack | 1 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | damage:enemy |
| 守護 | 共通 | guard | 1 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | block |
| 共振 | 共通 | resonance | 1 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 5 | resonance |
| 癒し | 共通 | support | 1 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | heal |
| 見切り | 共通 | hinder | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 5 | debuff:enemy:atk |
| 秘技・満ちる | 共通 | resonance | 3 | 0 | 5 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 5 | block+resonance |
| 後輩想い | 大耀 | support | 2 | 0 | 6 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | block+heal |
| 冒険者の勘 | 福永 | resonance | 2 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 4.5 | draw+resonance |
| 予言 | 共通 | oracle | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 4 | draw |
| 闘志 | 共通 | support | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 4 | buff:self:atk |
| 捨身の一撃 | 共通 | attack | 1 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 3 | damage:enemy+damage:self |