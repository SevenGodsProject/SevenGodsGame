# Decision248 — 60 枚 semantic table（Production bcfd530・カードは決定244 以降不変）

出典：効果＝`src/core/data/cards/*.ts`（決定244 evidence の表と同一）。frequency＝決定244 simulation（reader／ふつう）の「その札を含む推奨デッキでの 1 戦あたり使用回数」（推奨デッキ外の札は 0＝実プレイ頻度データなし）。

| # | card ID | name | God/common | type | cost | mechanical effect | primary | secondary | modifiers | current visual response | current subject | desired subject | freq/戦 | decks | intensity req |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | card_common_attack_01 | 一撃 | common | attack | 1 | 敵に5・⚡combo→damage:enemy3 | **STRIKE** |  | PAYOFF(combo) | God 突き＋Enemy 被弾（stop／揺れ／数字／SE） | God+Enemy+Card+HUD | God → Enemy | 0.80 | 恵比寿/大耀/蒼毘/福永/笑蓮 | L1（既存 ladder） |
| 2 | card_common_attack_02 | 剛撃 | common | attack | 2 | 敵に12・⚡charged→damage:enemy4 | **STRIKE** |  | PAYOFF(charged) | God 突き＋Enemy 被弾（stop／揺れ／数字／SE） | God+Enemy+Card+HUD | God → Enemy | 0.81 | 恵比寿/大耀/蒼毘/才華/福永/笑蓮 | L2（既存 ladder） |
| 3 | card_common_guard_01 | 守護 | common | guard | 1 | block5・⚡blocked→damage:enemy3 | **GUARD** |  | PAYOFF(blocked) | HUD 盾バッジ pulse・トースト・SE block | Card+HUD | God（構える） | 0.58 | 恵比寿/大耀/才華/福永/笑蓮 | Tier1 |
| 4 | card_common_resonance_01 | 共振 | common | resonance | 1 | 共鳴+2・⚡combo→resonance1 | **ATTUNE** |  | PAYOFF(combo) | HUD 共鳴ゲージ fill・SE resonance_gain | Card+HUD | God（高まる・共鳴色）＋OTOMO（応える・小） | 0.62 | 恵比寿/大耀/蒼毘/才華/寿楽/福永/笑蓮 | Tier1 |
| 5 | card_common_support_01 | 癒し | common | support | 1 | heal5・⚡enemyBig→block3 | **MEND** |  | PAYOFF(enemyBig) | HUD HP バー pulse・トースト・SE heal・数字 | Card+HUD | God（息を吹き返す）＋OTOMO（寄る・小） | 0.19 | 福永/笑蓮 | Tier1 |
| 6 | card_common_hinder_01 | 呪縛 | common | hinder | 2 | 敵atk−5・⚡enemyBig→damage:enemy4 | **WEAKEN** |  | PAYOFF(enemyBig) | HUD 敵バフ欄（文字）・予告値の減算 | Card+HUD | Enemy（よろめく・沈む） | 0.85 | 大耀/蒼毘/寿楽/福永/笑蓮 | Tier1 |
| 7 | card_common_oracle_01 | 神託 | common | oracle | 3 | 敵に25 | **STRIKE** |  |  | God 突き＋Enemy 被弾（stop／揺れ／数字／SE） | God+Enemy+Card+HUD | God → Enemy | 0.85 | 恵比寿/大耀/蒼毘/才華/寿楽/福永/笑蓮 | L4/L3（重い一撃・既存 ladder） |
| 8 | card_common_attack_03 | 速攻 | common | attack | 1 | 敵に4・draw1・⚡combo→gainAp1 | **STRIKE** | TEMPO | PAYOFF(combo) | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／HUD ミニ結果「カード+n」・SE card_draw | God+Enemy+Card+HUD | God → Enemy | 0.70 | 恵比寿/大耀/蒼毘/才華/福永/笑蓮 | L1（既存 ladder） |
| 9 | card_common_attack_04 | 渾身の一撃 | common | attack | 3 | 敵に20・⚡enemyBig→debuff:enemy3 | **STRIKE** |  | PAYOFF(enemyBig) | God 突き＋Enemy 被弾（stop／揺れ／数字／SE） | God+Enemy+Card+HUD | God → Enemy | 0.98 | 恵比寿/蒼毘/才華/寿楽/笑蓮 | L4/L3（重い一撃・既存 ladder） |
| 10 | card_common_guard_02 | 鉄壁の構え | common | guard | 2 | block12・⚡blocked→heal3 | **GUARD** |  | PAYOFF(blocked) | HUD 盾バッジ pulse・トースト・SE block | Card+HUD | God（構える） | 0.59 | 恵比寿/大耀/才華/福永/笑蓮 | Tier1 |
| 11 | card_common_support_02 | 息吹 | common | support | 2 | heal12 | **MEND** |  |  | HUD HP バー pulse・トースト・SE heal・数字 | Card+HUD | God（息を吹き返す）＋OTOMO（寄る・小） | 0.26 | 福永/笑蓮 | Tier1 |
| 12 | card_common_support_03 | 神力の泉 | common | support | 1 | AP+2 | **TEMPO** |  |  | HUD ミニ結果「神力+n」 | Card+HUD | Hand／Card（配り直し）＋HUD 神力 | 0.00 | — | Tier1 |
| 13 | card_common_hinder_02 | 見切り | common | hinder | 1 | 敵atk−5・⚡combo→draw1 | **WEAKEN** |  | PAYOFF(combo) | HUD 敵バフ欄（文字）・予告値の減算 | Card+HUD | Enemy（よろめく・沈む） | 0.59 | 恵比寿 | Tier1 |
| 14 | card_common_resonance_02 | 神楽舞 | common | resonance | 2 | block3・共鳴+3・⚡charged→damage:enemy4 | **ATTUNE** |  | PAYOFF(charged) | HUD 盾バッジ pulse・トースト・SE block／HUD 共鳴ゲージ fill・SE resonance_gain | Card+HUD | God（高まる・共鳴色）＋OTOMO（応える・小） | 0.29 | 恵比寿/大耀/蒼毘/才華/寿楽/笑蓮 | Tier1 |
| 15 | card_common_oracle_02 | 予言 | common | oracle | 2 | draw2 | **TEMPO** |  |  | HUD ミニ結果「カード+n」・SE card_draw | Card+HUD | Hand／Card（配り直し）＋HUD 神力 | 0.43 | 恵比寿/大耀/蒼毘/才華/寿楽/福永/笑蓮 | Tier1 |
| 16 | card_common_attack_05 | 捨身の一撃 | common | attack | 1 | 敵に6・自分に3 | **STRIKE** |  | RISK | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／God 自傷の揺れ（90ms） | God+Enemy+Card+HUD | God → Enemy | 0.81 | 笑蓮 | L1（既存 ladder） |
| 17 | card_common_attack_06 | 神速 | common | attack | 1 | 敵に3・共鳴+1 | **STRIKE** | ATTUNE | SETUP(charged) | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／HUD 共鳴ゲージ fill・SE resonance_gain | God+Enemy+Card+HUD | God → Enemy | 0.71 | 笑蓮 | L1（既存 ladder） |
| 18 | card_common_attack_07 | 乱舞 | common | attack | 2 | 敵に10・共鳴+1・⚡charged→resonance1 | **STRIKE** |  | PAYOFF(charged) SETUP(charged) | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／HUD 共鳴ゲージ fill・SE resonance_gain | God+Enemy+Card+HUD | God → Enemy | 0.00 | — | L2（既存 ladder） |
| 19 | card_common_attack_08 | 大喝 | common | attack | 3 | 敵に18・敵atk−3・⚡combo→damage:enemy6 | **STRIKE** |  | PAYOFF(combo) | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／HUD 敵バフ欄（文字）・予告値の減算 | God+Enemy+Card+HUD | God → Enemy | 1.40 | 寿楽 | L4/L3（重い一撃・既存 ladder） |
| 20 | card_common_guard_03 | 受け流し | common | guard | 1 | block3・共鳴+1・⚡blocked→resonance1 | **GUARD** | ATTUNE | PAYOFF(blocked) SETUP(charged) | HUD 盾バッジ pulse・トースト・SE block／HUD 共鳴ゲージ fill・SE resonance_gain | Card+HUD | God（構える） | 0.41 | 大耀/蒼毘/才華/福永 | Tier1 |
| 21 | card_common_guard_04 | 守りの陣 | common | guard | 2 | block8・heal4・⚡enemyBig→block4 | **GUARD** | MEND | PAYOFF(enemyBig) | HUD 盾バッジ pulse・トースト・SE block／HUD HP バー pulse・トースト・SE heal・数字 | Card+HUD | God（構える） | 0.00 | — | Tier1 |
| 22 | card_common_resonance_03 | 巫女の舞 | common | resonance | 1 | heal3・共鳴+1 | **MEND** | ATTUNE | SETUP(charged) | HUD HP バー pulse・トースト・SE heal・数字／HUD 共鳴ゲージ fill・SE resonance_gain | Card+HUD | God（息を吹き返す）＋OTOMO（寄る・小） | 0.18 | 大耀/蒼毘/才華/笑蓮 | Tier1 |
| 23 | card_common_resonance_04 | 秘技・満ちる | common | resonance | 3 | block5・共鳴+4 | **ATTUNE** | GUARD |  | HUD 盾バッジ pulse・トースト・SE block／HUD 共鳴ゲージ fill・SE resonance_gain | Card+HUD | God（高まる・共鳴色）＋OTOMO（応える・小） | 0.00 | — | Tier1+（大技だが体の反応は Tier1 上限） |
| 24 | card_common_support_04 | 息継ぎ | common | support | 1 | block3・heal3 | **GUARD** | MEND |  | HUD 盾バッジ pulse・トースト・SE block／HUD HP バー pulse・トースト・SE heal・数字 | Card+HUD | God（構える） | 0.00 | — | Tier1 |
| 25 | card_common_support_05 | 大治癒 | common | support | 3 | heal18 | **MEND** |  |  | HUD HP バー pulse・トースト・SE heal・数字 | Card+HUD | God（息を吹き返す）＋OTOMO（寄る・小） | 0.00 | — | Tier1+（大技だが体の反応は Tier1 上限） |
| 26 | card_common_hinder_03 | 威嚇 | common | hinder | 1 | 敵atk−3 | **WEAKEN** |  |  | HUD 敵バフ欄（文字）・予告値の減算 | Card+HUD | Enemy（よろめく・沈む） | 0.00 | — | Tier1 |
| 27 | card_common_hinder_04 | 金縛り | common | hinder | 3 | 敵atk−6 | **WEAKEN** |  |  | HUD 敵バフ欄（文字）・予告値の減算 | Card+HUD | Enemy（よろめく・沈む） | 0.00 | — | Tier1+（大技だが体の反応は Tier1 上限） |
| 28 | card_common_oracle_03 | 小さな託宣 | common | oracle | 1 | 敵に7 | **STRIKE** |  |  | God 突き＋Enemy 被弾（stop／揺れ／数字／SE） | God+Enemy+Card+HUD | God → Enemy | 0.80 | 恵比寿 | L1（既存 ladder） |
| 29 | card_common_support_06 | 闘志 | common | support | 1 | atk+2 | **EMPOWER** |  |  | HUD バフバッジ（文字） | Card+HUD | God（高まる・金） | 0.00 | — | Tier1 |
| 30 | card_common_attack_09 | 連撃 | common | attack | 2 | 敵に7・AP+1・⚡combo→damage:enemy5 | **STRIKE** | TEMPO | PAYOFF(combo) | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／HUD ミニ結果「神力+n」 | God+Enemy+Card+HUD | God → Enemy | 0.87 | 才華 | L1（既存 ladder） |
| 31 | card_common_support_07 | 見通し | common | support | 1 | draw1・AP+1 | **TEMPO** |  |  | HUD ミニ結果「カード+n」・SE card_draw／HUD ミニ結果「神力+n」 | Card+HUD | Hand／Card（配り直し）＋HUD 神力 | 0.00 | — | Tier1 |
| 32 | card_common_hinder_05 | 浄めの光 | common | hinder | 2 | heal6・敵atk−3 | **MEND** | WEAKEN |  | HUD HP バー pulse・トースト・SE heal・数字／HUD 敵バフ欄（文字）・予告値の減算 | Card+HUD | God（息を吹き返す）＋OTOMO（寄る・小） | 0.08 | 寿楽 | Tier1 |
| 33 | card_ebisu_attack_01 | 大漁 | ebisu | attack | 2 | 敵に8・共鳴+2 | **STRIKE** | ATTUNE | SETUP(charged) | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／HUD 共鳴ゲージ fill・SE resonance_gain | God+Enemy+Card+HUD | God → Enemy | 0.97 | 恵比寿 | L1（既存 ladder） |
| 34 | card_ebisu_support_01 | 福授け | ebisu | support | 1 | heal6 | **MEND** |  |  | HUD HP バー pulse・トースト・SE heal・数字 | Card+HUD | God（息を吹き返す）＋OTOMO（寄る・小） | 0.36 | 恵比寿 | Tier1 |
| 35 | card_ebisu_attack_02 | 潮招き | ebisu | attack | 2 | 敵に10・heal4 | **STRIKE** |  |  | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／HUD HP バー pulse・トースト・SE heal・数字 | God+Enemy+Card+HUD | God → Enemy | 1.26 | 恵比寿 | L2（既存 ladder） |
| 36 | card_ebisu_support_02 | 恵比寿顔 | ebisu | support | 2 | heal6・共鳴+2 | **MEND** | ATTUNE | SETUP(charged) | HUD HP バー pulse・トースト・SE heal・数字／HUD 共鳴ゲージ fill・SE resonance_gain | Card+HUD | God（息を吹き返す）＋OTOMO（寄る・小） | 0.25 | 恵比寿 | Tier1 |
| 37 | card_taiyo_attack_01 | 豪快な一撃 | taiyo | attack | 2 | 敵に14・自分に2・⚡charged→damage:enemy4 | **STRIKE** |  | RISK PAYOFF(charged) | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／God 自傷の揺れ（90ms） | God+Enemy+Card+HUD | God → Enemy | 1.50 | 大耀 | L2（既存 ladder） |
| 38 | card_taiyo_support_01 | 姉御の号令 | taiyo | support | 1 | atk+3・⚡charged→buff:self3 | **EMPOWER** |  | PAYOFF(charged) | HUD バフバッジ（文字） | Card+HUD | God（高まる・金） | 1.28 | 大耀 | Tier1 |
| 39 | card_taiyo_attack_02 | 一心不乱 | taiyo | attack | 1 | 敵に4・共鳴+1 | **STRIKE** | ATTUNE | SETUP(charged) | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／HUD 共鳴ゲージ fill・SE resonance_gain | God+Enemy+Card+HUD | God → Enemy | 1.30 | 大耀 | L1（既存 ladder） |
| 40 | card_taiyo_support_02 | 後輩想い | taiyo | support | 2 | block6・heal4 | **GUARD** | MEND |  | HUD 盾バッジ pulse・トースト・SE block／HUD HP バー pulse・トースト・SE heal・数字 | Card+HUD | God（構える） | 1.10 | 大耀 | Tier1 |
| 41 | card_sobi_guard_01 | 不動の構え | sobi | guard | 2 | block13・⚡blocked→damage:enemy6 | **GUARD** |  | PAYOFF(blocked) | HUD 盾バッジ pulse・トースト・SE block | Card+HUD | God（構える） | 0.45 | 蒼毘 | Tier1 |
| 42 | card_sobi_guard_02 | 誓いの盾 | sobi | guard | 1 | block4・heal3 | **GUARD** | MEND |  | HUD 盾バッジ pulse・トースト・SE block／HUD HP バー pulse・トースト・SE heal・数字 | Card+HUD | God（構える） | 0.59 | 蒼毘 | Tier1 |
| 43 | card_sobi_attack_01 | 反撃の刃 | sobi | attack | 2 | 敵に8・block6・⚡blocked→damage:enemy6 | **STRIKE** | GUARD | PAYOFF(blocked) | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／HUD 盾バッジ pulse・トースト・SE block | God+Enemy+Card+HUD | God → Enemy | 1.47 | 蒼毘 | L1（既存 ladder） |
| 44 | card_sobi_hinder_01 | 一喝 | sobi | hinder | 2 | 敵atk−6・⚡enemyBig→damage:enemy6 | **WEAKEN** |  | PAYOFF(enemyBig) | HUD 敵バフ欄（文字）・予告値の減算 | Card+HUD | Enemy（よろめく・沈む） | 1.32 | 蒼毘 | Tier1 |
| 45 | card_saika_resonance_01 | 魅惑の舞 | saika | resonance | 2 | draw1・共鳴+3 | **ATTUNE** | TEMPO |  | HUD ミニ結果「カード+n」・SE card_draw／HUD 共鳴ゲージ fill・SE resonance_gain | Card+HUD | God（高まる・共鳴色）＋OTOMO（応える・小） | 1.14 | 才華 | Tier1 |
| 46 | card_saika_support_01 | 喝采 | saika | support | 1 | block2・draw1 | **TEMPO** | GUARD |  | HUD 盾バッジ pulse・トースト・SE block／HUD ミニ結果「カード+n」・SE card_draw | Card+HUD | Hand／Card（配り直し）＋HUD 神力 | 0.56 | 才華 | Tier1 |
| 47 | card_saika_attack_01 | 独奏 | saika | attack | 1 | 敵に4・AP+1 | **STRIKE** | TEMPO |  | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／HUD ミニ結果「神力+n」 | God+Enemy+Card+HUD | God → Enemy | 0.00 | 才華 | L1（既存 ladder） |
| 48 | card_saika_support_02 | アンコール | saika | support | 2 | draw1・AP+2 | **TEMPO** |  |  | HUD ミニ結果「カード+n」・SE card_draw／HUD ミニ結果「神力+n」 | Card+HUD | Hand／Card（配り直し）＋HUD 神力 | 1.88 | 才華 | Tier1 |
| 49 | card_juraku_hinder_01 | 悪戯 | juraku | hinder | 1 | 敵atk−4 | **WEAKEN** |  |  | HUD 敵バフ欄（文字）・予告値の減算 | Card+HUD | Enemy（よろめく・沈む） | 1.12 | 寿楽 | Tier1 |
| 50 | card_juraku_guard_01 | 長生きの知恵 | juraku | guard | 1 | block4・heal4 | **GUARD** | MEND |  | HUD 盾バッジ pulse・トースト・SE block／HUD HP バー pulse・トースト・SE heal・数字 | Card+HUD | God（構える） | 0.82 | 寿楽 | Tier1 |
| 51 | card_juraku_attack_01 | からかい半分 | juraku | attack | 2 | 敵に7・敵atk−4 | **WEAKEN** | STRIKE |  | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／HUD 敵バフ欄（文字）・予告値の減算 | God+Enemy+Card+HUD | Enemy（よろめく・沈む） | 1.14 | 寿楽 | L1（既存 ladder） |
| 52 | card_juraku_resonance_01 | 気まぐれ | juraku | resonance | 1 | heal2・共鳴+2 | **ATTUNE** |  |  | HUD HP バー pulse・トースト・SE heal・数字／HUD 共鳴ゲージ fill・SE resonance_gain | Card+HUD | God（高まる・共鳴色）＋OTOMO（応える・小） | 0.07 | 寿楽 | Tier1 |
| 53 | card_fukuei_attack_01 | 一攫千金 | fukuei | attack | 2 | 敵に15・自分に2 | **STRIKE** |  | RISK | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／God 自傷の揺れ（90ms） | God+Enemy+Card+HUD | God → Enemy | 1.65 | 福永 | L4/L3（重い一撃・既存 ladder） |
| 54 | card_fukuei_support_01 | 幸運の女神 | fukuei | support | 1 | heal4・AP+1 | **MEND** | TEMPO |  | HUD HP バー pulse・トースト・SE heal・数字／HUD ミニ結果「神力+n」 | Card+HUD | God（息を吹き返す）＋OTOMO（寄る・小） | 1.50 | 福永 | Tier1 |
| 55 | card_fukuei_resonance_01 | 冒険者の勘 | fukuei | resonance | 2 | draw1・共鳴+2 | **ATTUNE** | TEMPO |  | HUD ミニ結果「カード+n」・SE card_draw／HUD 共鳴ゲージ fill・SE resonance_gain | Card+HUD | God（高まる・共鳴色）＋OTOMO（応える・小） | 1.26 | 福永 | Tier1 |
| 56 | card_fukuei_attack_02 | 不屈の一歩 | fukuei | attack | 1 | 敵に4・heal2 | **STRIKE** | MEND |  | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／HUD HP バー pulse・トースト・SE heal・数字 | God+Enemy+Card+HUD | God → Enemy | 1.49 | 福永 | L1（既存 ladder） |
| 57 | card_shouren_support_01 | 福袋 | shouren | support | 2 | heal11・⚡lowHp→resonance2 | **MEND** |  | PAYOFF(lowHp) | HUD HP バー pulse・トースト・SE heal・数字 | Card+HUD | God（息を吹き返す）＋OTOMO（寄る・小） | 0.12 | 笑蓮 | Tier1 |
| 58 | card_shouren_guard_01 | 懐の深さ | shouren | guard | 2 | block11 | **GUARD** |  |  | HUD 盾バッジ pulse・トースト・SE block | Card+HUD | God（構える） | 0.45 | 笑蓮 | Tier1 |
| 59 | card_shouren_support_02 | 笑って許す | shouren | support | 1 | block4・heal4・⚡blocked→draw1 | **GUARD** | MEND | PAYOFF(blocked) | HUD 盾バッジ pulse・トースト・SE block／HUD HP バー pulse・トースト・SE heal・数字 | Card+HUD | God（構える） | 0.50 | 笑蓮 | Tier1 |
| 60 | card_shouren_attack_01 | おおらかな一打 | shouren | attack | 1 | 敵に7・heal3 | **STRIKE** |  |  | God 突き＋Enemy 被弾（stop／揺れ／数字／SE）／HUD HP バー pulse・トースト・SE heal・数字 | God+Enemy+Card+HUD | God → Enemy | 0.84 | 笑蓮 | L1（既存 ladder） |

## primary semantic の内訳

| semantic | 枚数 | カード |
|---|---|---|
| STRIKE | 20 | 一撃、剛撃、神託、速攻、渾身の一撃、捨身の一撃、神速、乱舞、大喝、小さな託宣、連撃、大漁、潮招き、豪快な一撃、一心不乱、反撃の刃、独奏、一攫千金、不屈の一歩、おおらかな一打 |
| GUARD | 11 | 守護、鉄壁の構え、受け流し、守りの陣、息継ぎ、後輩想い、不動の構え、誓いの盾、長生きの知恵、懐の深さ、笑って許す |
| MEND | 9 | 癒し、息吹、巫女の舞、大治癒、浄めの光、福授け、恵比寿顔、幸運の女神、福袋 |
| WEAKEN | 7 | 呪縛、見切り、威嚇、金縛り、一喝、悪戯、からかい半分 |
| ATTUNE | 6 | 共振、神楽舞、秘技・満ちる、魅惑の舞、気まぐれ、冒険者の勘 |
| TEMPO | 5 | 神力の泉、予言、見通し、喝采、アンコール |
| EMPOWER | 2 | 闘志、姉御の号令 |

## 1 戦あたりの発生回数（reader／ふつう・推奨デッキ）

| semantic | 恵比寿 | 大耀 | 蒼毘 | 才華 | 寿楽 | 福永 | 笑蓮 | 平均 |
|---|---|---|---|---|---|---|---|---|
| STRIKE | 7.17 | 5.96 | 5.61 | 4.21 | 3.23 | 6.30 | 6.50 | 5.57 |
| GUARD | 1.17 | 2.68 | 1.45 | 1.58 | 0.82 | 1.58 | 2.12 | 1.63 |
| ATTUNE | 0.91 | 0.91 | 0.91 | 2.05 | 0.98 | 1.88 | 0.91 | 1.22 |
| MEND | 0.61 | 0.18 | 0.18 | 0.18 | 0.08 | 1.95 | 0.75 | 0.56 |
| WEAKEN | 0.59 | 0.85 | 2.17 | 0.00 | 3.11 | 0.85 | 0.85 | 1.20 |
| TEMPO | 0.43 | 0.43 | 0.43 | 2.87 | 0.43 | 0.43 | 0.43 | 0.78 |
| EMPOWER | 0.00 | 1.28 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.18 |

## 現行の反応主体（再検証）

- キャラクター（God／Enemy）が動くカード：**21/60**（敵ダメージまたは自傷を持つ札）。残り **39/60** は Card（閃光・飛翔）と HUD だけが動く
- 決定244 の「38/60」と一致（差 0）

推奨デッキ外（頻度データなし）：神力の泉、乱舞、守りの陣、秘技・満ちる、息継ぎ、大治癒、威嚇、金縛り、闘志、見通し、独奏（11 枚）