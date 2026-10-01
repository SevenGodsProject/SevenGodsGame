# 決定255 — Solution Diversity v1 Preflight（「盾＋加護だけがほぼ唯一の正解」の数値改善 可否）

- 日付：2026-10-02
- 種別：**PREFLIGHT ONLY／docs＋simulation**（runtime・src・Production・asset・音声：変更 0。カード数値・`rules.ts` 係数の変更は harness 内の一時的な書き換えのみで、各 variant 後に Production 値へ復元。実装 0・merge／push／deploy 0）
- 判断主体：AI チーム（CLAUDE.md §6-2「バランス数値の調整」「複数案からの推奨案選定」「GO・NO-GO の技術判断」）。Preflight 開始は CEO 承認済み（2026-10-02 CEO DECISION）。**Pilot 実装は本書の判定が GO でも CEO GO 後**
- Baseline：Production runtime **`a611270`**（master `e2add7a`＝3-Lane docs 統合後。`src/core` は決定252 `9316ce1` から変更なし）。clean worktree `SevenGodsGame-d254-rc`・branch `docs/lane1-post-d254-practical-qa-reaudit`
- 問い（CEO）：「Intent を読めば勝てる」状態を壊さず、「盾＋加護だけがほぼ唯一の正解」を **カード数値と最小限の `rules.ts` 係数だけ**で改善できるか。敵表・託宣回数・HP・AP 基本ルール・God Strike・Reaction Language・Daily／score semantics は保護
- 表記：【実測】＝本 Preflight の simulation／【docs】＝既存 Decision／【AI 判断】／【推測】
- 証拠：`docs/evidence/decision255/`（`sim255-tune.json` 1,375,920 試合・`sim255-final.json` 919,240 試合・合計 **2,295,160 試合**・`SIMULATION_SUMMARY.md` は `gen255.mjs.txt` で JSON から自動生成・harness 原文 `harness.d255.test.ts.txt`・`ITEM_RANK_EXTRA.txt`）。本書の数字はすべてそこからの引用

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| **判定** | **NO-GO**（カード数値・`rules.ts` 係数の探索空間では、保護条件を守ったまま「WEAKEN／MEND が勝敗に必要な局面」を通常／Hard に作ることができない。8 variant すべてが **逆方向**＝naive／greedy の勝率を上げて通常を易化し、reader−naive の「読む価値」を 15.7→8.7pt まで削り、神階Ⅲ〜Ⅶ で既に成立している WEAKEN／MEND の必要性も半減させる） |
| 推奨 SPEC | **数値変更なし（Production `a611270` のまま）**。推奨は「変えない」の 1 案。却下した 8 案と理由は §4 |
| 最重要の発見【実測】 | ① **公平に札を評価する方策（planner）では、WEAKEN／MEND／ATTUNE は既に使われている**：必殺 R の答えは GUARD 86％・加護 50％・弱体が効いている 53％・MEND 29％（通常）で、答えの型は「加護＋盾」17％／「加護＋盾＋弱体」17％／「盾＋弱体」16％／「加護＋盾＋回復」10％／「盾のみ」8％／「弱体のみ」6％ と分散している。Lane 1 の reader が WEAKEN を「盾が無いときの代替」としか扱わなかったため、−0.3pt という「無意味」に見える値が出ていた。② しかし **勝敗への必要性**は通常／Hard では GUARD（−18／−46pt）と ATTUNE（−10／−29pt）に集中し、WEAKEN −0.1／−1.9・MEND −0.3／−3.7 のまま。③ **神階では必要性が段階的に立ち上がる**：WEAKEN 禁止＝Ⅰ −2.0／Ⅱ −5.1／Ⅲ −8.0／Ⅳ −11.8／Ⅴ −17.8／Ⅵ −19.8／Ⅶ猛威 −23.6、MEND 禁止＝Ⅰ −4.1／Ⅲ −12.3／Ⅴ −16.9／Ⅶ −17pt。**「答えを組み合わせないと勝てない」は P7 の進行軸＝神階に既に実装されている** |
| North Star との関係【AI 判断】 | 「神・OTOMO・カードを組み合わせて答えを見つける」は、通常＝「読んで盾を構える」入門、神階Ⅲ以降＝「盾＋弱体＋回復＋一撃の組み合わせ」の本番、という **段階設計として成立している**。通常で組み合わせを「必須」にする手段は、保護対象（敵表・HP・託宣回数）を触るか、通常を易化するかのどちらかしかない（§3-4） |
| 保護条件 | 8 variant とも Easy naive ≥99.8・49 セル reader<50% の増加 0・未撃破 増加 0・reader>naive>greedy 維持（§5）。**破れたのは「通常を『何をしても勝てる』状態へ戻さない」**（naive 83.9→91.0・greedy 72.7→80.7＝決定245 の受入帯「naive 敗北 ≥15%」を WMA は 9.0% で割る） |
| Item 10／11 の再解釈 | Item 10「引いた手札で作戦を変える必要」：planner でも必殺 R の手の型は seed 間で 14.6％ しか変わらず、paired（planner≠naive）16.1％＝Lane 1 と同じ。**通常の残りは数値では解けない**（設計上の入門面）。Item 11「敵ごとの答え」：planner では **敵で答えが変わる**（魔獣＝加護 6％・MEND 38％／道化＝加護 72％／機工師＝その R に撃破 37％／怨霊＝MEND 38％・planner−naive 28pt）＝Lane 1 の reader より差が大きく、決定252 の identity は planner 視点では成立 |
| **NEXT（1 件）** | 数値 Pilot は行わない。**CEO 承認済みの順序どおり NEXT AFTER＝決定257「God Strike / Enemy Ultimate Sound Layer v1」へ進む**（決定255 Pilot が無いため着手禁止条件は解除されるが、実装 GO は CEO）。本 Preflight の発見を活かす候補は **presentation 側**＝「答えの可視化（結果画面に『盾／弱体／回復／一撃のどれで解いたか』と、神階で組み合わせが必要になることを 1 行で示す）」を Lane 3 の次候補リストに追加するに留める（本書では設計しない） |

---

## 1. 方法

| 項目 | 内容 |
|---|---|
| harness | `harness.d255.test.ts.txt`（scratch `scripts/decision255/` で実行・監査後に削除）。Lane 1 harness を拡張 |
| 方策 | **reader／naive／greedy／oracleAware**＝Lane 1・決定252／253 と同一（無変更）。**planner（新規）**＝敵の既知の 7R 表を 3R 先読みし、各札を HP 単位で評価（GUARD＝今 R の未ブロック分・WEAKEN＝持続 R 分の軽減合計（翌 R 以降 ×0.9）・MEND＝回復可能量 ×0.6〜1.0・STRIKE＝与ダメ＋撃破 +15・util ×0.5）し、圧力（今 R と次 2R の未防御被ダメで HP が 35％ を割るか）に応じて防御の重みを 0.6／1.2／1.6／3 に切り替え、致死なら最も救える札を優先。託宣は oracleAware と同じ 3 択 EV。**class 禁止**＝`p_no<CLASS>`（planner から GUARD／WEAKEN／MEND／TEMPO／ATTUNE／EMPOWER を禁止。noGuard は加護も使わない）と `r_no<CLASS>`（reader から・Lane 1 と同一） |
| variant（データのみ・各 variant 後に復元） | **prod**／**W1** WEAKEN 持続 +1R／**W2** WEAKEN 量 +1／**W3** W1＋W2／**M1** MEND 量 +2／**WM** W1＋M1／**A1** primary ATTUNE 札の共鳴 +1／**WMA** W1＋M1＋A1／**G0**【反証用】加護 guardRatio 0.5→0.4 |
| 規模 | tune＝9 variant × 13 方策 × 通常／Easy／Hard／Daily × 49 セル × 60 seed＝**1,375,920 試合（483s）**。final＝prod／WMA × 14 方策 × 4 面 × 100 seed ＋ 神階Ⅰ〜Ⅶ（3 択）× 7 方策 × 60 seed＝**919,240 試合（283s）**。RAM 6GB のため単一プロセス・決定256 の軽量 sim とだけ並走 |
| 照合 | prod の reader／naive／greedy 通常 99.6／83.9／72.7・Hard 96.3／47.0／31.5・Daily 90.9／53.7／37.3・Ⅴ 84.9／Ⅵ 82.9／Ⅶ猛威 70.2 ＝ Lane 1（同 seed 文字列）と完全一致【実測】 |
| 限界 | planner も reader も「表を知っている bot」。人間は naive〜planner の帯に写る。Human QA は行っていない（NO-GO のため不要） |

---

## 2. 現 Production の実態（prod・planner）【実測】

### 2-1. class 依存（planner − p_no<CLASS>・pt）と読む価値

| 面 | planner | −GUARD | −WEAKEN | −MEND | −TEMPO | −ATTUNE | −EMPOWER | reader | planner−naive |
|---|---|---|---|---|---|---|---|---|---|
| 通常 | 100.0 | 18.1 | 0.1 | 0.3 | 1.3 | 9.6 | 0.0 | 99.6 | 16.1 |
| Easy | 100.0 | 2.2 | 0.0 | 0.0 | 0.1 | 0.1 | 0.0 | 100.0 | 0.2 |
| Hard | 98.4 | 46.2 | 1.9 | 3.7 | 8.6 | 28.7 | 0.0 | 96.3 | 51.3 |
| Daily | 95.5 | 38.3 | 1.7 | 0.8 | 14.5 | 37.4 | 0.4 | 90.9 | 41.8 |
| 神階Ⅰ | 99.3 | 32.1 | 2.0 | 4.1 | — | — | — | 99.6 | 37.9 |
| Ⅲ | 93.1 | 44.3 | 8.0 | 12.3 | — | — | — | 88.9 | 42.8 |
| Ⅴ | 86.9 | 50.5 | 17.8 | 16.9 | — | — | — | 84.9 | 53.8 |
| Ⅵ | 85.4 | 54.3 | 19.8 | 18.2 | — | — | — | 82.9 | 58.5 |
| Ⅶ猛威 | 67.2 | 49.4 | 23.6 | 16.9 | — | — | — | 70.2 | 54.2 |
| Ⅶ巨躯 | 65.3 | 43.9 | 24.8 | 16.9 | — | — | — | 59.3 | 46.8 |
| Ⅶ静寂 | 82.6 | 54.0 | 20.2 | 17.3 | — | — | — | 80.8 | 59.8 |

- 通常／Easy では GUARD と ATTUNE（神の一撃ルート）だけが勝敗に効く。**神階Ⅲ以降は GUARD・WEAKEN・MEND の 3 つがすべて必要**（Ⅶ猛威で WEAKEN 禁止 −23.6・MEND 禁止 −16.9）。敵別（Ⅵ）：WEAKEN 必要性は 魔獣 30.7／怨霊 26.9／龍神 24.5／試練 17.1／鬼将 15.7／機工師 15.7／道化 8.1pt、MEND は 鬼将 22.1／怨霊 21.4／龍神 20.7／魔獣 20.0／試練 19.8pt（`ITEM_RANK_EXTRA.txt`）

### 2-2. 勝率以外の class 価値（通常・planner と p_no<CLASS>）

| 方策 | win | 撃破 R | 勝利スコア | 勝利時 HP | 最低 HP | 被ダメ | GS |
|---|---|---|---|---|---|---|---|
| planner | 100.0 | 5.50 | 843.9 | 25.2 | 21.1 | 12.9 | 68.3 |
| p_noGuard | 81.6 | 5.19 | 850.8 | 18.4 | 10.7 | 25.2 | 61.0 |
| p_noWeaken | 99.9 | 5.33 | 852.2 | 22.9 | 18.2 | 17.3 | 75.7 |
| p_noMend | 99.6 | 5.43 | 838.4 | 22.1 | 19.3 | 12.3 | 62.6 |
| p_noTempo | 98.6 | 5.61 | 824.7 | 24.5 | 20.6 | 13.8 | 69.7 |
| p_noAttune | 90.4 | 5.96 | 791.6 | 22.6 | 19.4 | 16.1 | 2.9 |
| reader（参考） | 99.6 | 5.73 | 807.8 | 20.0 | 15.0 | 20.8 | 56.1 |

- WEAKEN の役割＝**被ダメ −4.4・最低 HP +2.9 と引き換えに 撃破 R +0.17・スコア −8**（安全を買う札）。MEND＝勝利時 HP +3.1・スコア +5.5。ATTUNE＝撃破 R −0.46・スコア +52（最大のテンポ装置）。TEMPO＝スコア +19。**class はすでに役割分担している**が、通常ではどれも「勝敗」には要らない

### 2-3. 必殺ラウンドの答え（planner・通常）と敵による違い

| 敵 | GUARD | 加護 | 弱体が効いている | MEND | その R に撃破 | planner−naive |
|---|---|---|---|---|---|---|
| 業斧の鬼将 | 94.6 | 64.4 | 52.2 | 22.7 | 5.4 | 19.4 |
| 藍花の怨霊 | 91.6 | 65.6 | 51.0 | 37.6 | 4.7 | 28.4 |
| 銀甲の機工師 | 84.8 | 35.6 | 55.0 | 22.9 | **36.6** | 13.7 |
| 双牙の魔獣 | 58.7 | **5.7** | 54.4 | **37.9** | 0.1 | 16.1 |
| 蒼海の龍神 | 91.0 | 56.0 | 52.3 | 35.4 | 1.9 | 20.4 |
| 乱舞の道化 | 95.6 | **71.9** | 53.9 | 15.0 | 0.3 | 8.7 |

- 答えの型（通常・全体）：加護＋盾 17.3／加護＋盾＋弱体 16.5／盾＋弱体 16.0／加護＋盾＋回復 9.9／盾のみ 8.1／加護＋盾＋弱体＋回復 6.3／弱体のみ 5.7／盾＋回復 4.1／撃破 4.3％。必殺前に WEAKEN を置く率 45％
- **敵で答えが変わる**：魔獣（連撃・乱撃）は加護をほぼ使わず MEND で受け、道化（開幕狂宴）は加護で受け、機工師は主砲の R に撃破しにいく。Lane 1 の reader（加護 11〜45％・AP 配分ほぼ同一）より差が大きい＝Item 11 の「要求されるプレイが同じ」は **reader の heuristics が原因の一部**だった

---

## 3. variant の結果（tune 60 seed・final 100 seed）【実測】

### 3-1. 勝率（通常）と読む価値・易化

| variant | reader | naive | greedy | planner | p_noGuard | p_noWeaken | p_noMend | reader−naive | naive 敗北 |
|---|---|---|---|---|---|---|---|---|---|
| **prod** | 99.6 | 83.9 | 72.7 | 100.0 | 81.9 | 99.9 | 99.7 | **15.7** | **16.1%** |
| W1 | 99.5 | 84.2 | 73.5 | 100.0 | 83.1 | 100.0 | 99.7 | 15.3 | 15.8 |
| W2 | 99.6 | 84.6 | 73.7 | 100.0 | 82.9 | 99.4 | 99.7 | 15.0 | 15.4 |
| W3 | 99.6 | 85.4 | 74.6 | 100.0 | 84.3 | 99.4 | 99.7 | 14.2 | 14.6 |
| M1 | 99.6 | 86.6 | 75.6 | 100.0 | 86.2 | 99.9 | 99.6 | 13.0 | 13.4 |
| WM | 99.6 | 87.2 | 76.4 | 100.0 | 87.3 | 100.0 | 99.7 | 12.4 | 12.8 |
| A1 | 99.8 | 87.3 | 77.7 | 100.0 | 88.6 | 100.0 | 99.9 | 12.4 | 12.7 |
| WMA（final） | 99.7 | 91.0 | 80.7 | 100.0 | 92.0 | 100.0 | 100.0 | 8.7 | 9.0 |
| G0【反証】 | 99.6 | 83.3 | 72.7 | 100.0 | 81.6 | 99.7 | 99.5 | 16.3 | 16.7 |

- **どの variant でも p_noWeaken／p_noMend は 99.4〜100**＝WEAKEN／MEND を強くしても「無くても勝てる」は変わらない。変わるのは **naive／greedy が勝つようになる**こと（WMA で naive 敗北 9.0％＝決定245 受入帯 ≥15％ を割る）
- Hard：WEAKEN 必要性 W2 で 4.5pt・W3 4.4pt が最大（prod 2.4）。MEND 必要性は M1 4.3（prod 4.3）で不変。Daily：W2 4.5・WMA 0.1
- 神階（WMA・final）：WEAKEN 必要性 Ⅴ 17.8→**10.0**・Ⅵ 19.8→**11.2**・Ⅶ猛威 23.6→20.5、MEND Ⅴ 16.9→11.2・Ⅵ 18.2→12.2、reader−naive Ⅰ 38.2→25.2・Ⅴ 51.8→41.9＝**組み合わせの必要性と読む価値を上から削る**。神階の reader 勝率は +2〜7pt 上がる（Ⅴ 84.9→89.1・Ⅶ猛威 70.2→81.9）＝HP sponge 化ではなく易化
- G0（加護 0.5→0.4）：全面で変化 ±0.3pt 以内＝planner は加護が弱くなれば盾札に寄せるだけ。「盾側を弱める」も答えの一択を崩さない

### 3-2. 保護条件（§5 表の要約）
- Easy naive：全 variant 99.8〜99.9 ✓／49 セル reader<50%：増加 0 ✓／未撃破：増加 0 ✓／reader>naive>greedy：全面 ○ ✓／God Strike：A1 系で +12〜14pt（56→68〜76％）＝Lane 1 の受入帯 ±5pt を超える ✗／**通常の易化**：W3 以降で naive 敗北 <15％ ✗

### 3-3. 手札感度・decision diversity
- 必殺 R に GUARD 札がある／ないの勝率差：planner で 通常 100.0／99.9・Hard 99.3／97.0・Daily 97.5／93.7（prod）。variant で縮まる（WMA Daily 98.1／97.6）＝「引きが効く局面」は増えず減る
- planner≠naive の seed 率：通常 16.1→9.6（WMA）／Hard 52.1→41.5／Daily 45.7→35.2＝**読む価値が seed 単位でも減る**
- 必殺 R の答えの型の多様度：18.7→18.2（WMA）、必殺前 class 集合の種類 64→56＝多様度は増えない

### 3-4. なぜ数値では解けないか【AI 判断】
- 必殺は 20〜26（×難易度）。盾札 12〜13 ＋ 加護 10〜13 で **単独経路として足りる**。WEAKEN／MEND を強くしても「盾でも解ける」は残り、「盾がなくても解ける」が増えるだけ＝必要性ではなく冗長性が増える
- 必要性を作る条件は「盾＋加護の合計を必殺が上回る」か「盾の資源が足りない」のどちらか。前者は敵表／HP（保護）、後者は加護回数／デッキ構成（保護・別 Decision）。**保護を守ったまま通常で必要性を作る数値は存在しない**（G0 の反証も同じ結論）
- 一方 神階Ⅲ以降は ×1.3 以降の倍率で「盾＋加護」が足りなくなり、WEAKEN／MEND が必要になる＝段階設計はすでに機能している

---

## 4. 却下した案と理由

| 案 | 内容 | 却下理由【実測】 |
|---|---|---|
| W1／W2／W3 | WEAKEN 持続 +1R／量 +1／両方 | WEAKEN 必要性 通常 +0.5pt 以内・Hard 最大 +2.1pt。naive +0.3〜1.5pt の易化。神階で reader−naive 低下 |
| M1 | MEND +2 | MEND 必要性 不変（通常 0.4・Hard 4.3）。p_noGuard 81.6→86.2＝盾なしで勝ちやすくなるだけ。naive +2.7 |
| WM | W1＋M1 | 同上の合算。naive +3.3・reader−naive 15.7→12.4 |
| A1 | ATTUNE 共鳴 +1 | WEAKEN／MEND に無関係。GS 56→68％（受入帯 ±5pt 超）・naive +3.4・通常の撃破 R −0.2 |
| WMA | W1＋M1＋A1 | **最も易化**：naive 敗北 9.0％（<15％）・reader−naive 8.7・神階の WEAKEN／MEND 必要性 半減・GS +22pt |
| G0 | 加護 0.5→0.4（反証用） | 全面 ±0.3pt 以内＝盾側を弱めても一択は崩れない。採用しない前提どおり |
| （未実施）敵表・HP・託宣回数の変更 | 必要性を作れる唯一の経路 | **CEO 保護対象**。本 Preflight の探索空間外 |

---

## 5. 保護条件の全表（final・prod vs WMA）

| 面 | easy naive | reader<50% セル | planner<50% セル | reader 未撃破 | reader GS | 順序 |
|---|---|---|---|---|---|---|
| 通常 prod／WMA | 99.8／99.9 | 0／0 | 0／0 | 0.4／0.3 | 54.6／62.0 | ○／○ |
| Hard | 99.8／99.9 | 0／0 | 0／0 | 3.4／2.7 | 71.5／77.4 | ○／○ |
| Daily | 99.8／99.9 | 1／1 | 0／0 | 9.0／8.0 | 75.1／79.3 | ○／○ |
| Ⅴ | 99.8／99.9 | 0／0 | 0／0 | 9.9／9.4 | 77.5／81.5 | ○／○ |
| Ⅶ猛威 | 99.8／99.9 | 7／2 | 15／3 | 8.9／9.3 | 76.0／84.3 | ○／○ |
| Ⅶ巨躯 | 99.8／99.9 | 17／14 | 15／7 | 28.9／29.2 | 81.2／84.5 | ○／○ |

- Known Issue K2（才華×魔獣）・K3（蒼毘×機工師）は触っていない（prod の値は Lane 1 と同一）

---

## 6. 判定と NEXT

- **NO-GO**：数値 Pilot を行わない。Production の数値は `a611270` のまま
- Item 10 の status は **IMPROVED BUT REMAINS のまま**だが、残りの性質を更新する：「通常で盾＋加護が十分なのは入門面の設計であり、組み合わせの必要性は神階Ⅲ以降で段階的に立ち上がる（P7）。数値で通常に必要性を作ることは保護条件と両立しない」。Item 11 は planner 視点では「敵で答えが変わる」が成立（§2-3）
- **NEXT（1 件）**：CEO 承認済みの順序どおり **決定257「God Strike / Enemy Ultimate Sound Layer v1」**（NEXT AFTER）へ。決定255 Pilot が存在しないため「決定255 Pilot 後まで開始禁止」の条件は空になるが、**実装開始は CEO GO 後**（§6-5）。本 Preflight の発見（答えが分散していること・神階で組み合わせが必須になること）を伝える **presentation 候補「答えの可視化」**は Lane 3 の次候補リストへ追記するに留め、本書では設計しない

## 7. CEO 判断が必要になる事項
- なし（NO-GO＝runtime 変更なし。§6-3 該当なし）。決定257 の実装開始 GO は別途

## 8. 実装しなかったこと・runtime 変更 0 の証明
- 実装・balance 変更・Production 変更・新規 asset／音声・H3／fal.ai・費用：**0**。harness の variant は実行中のメモリ上の書き換えのみで、各 variant 終了時と全体終了時に Production 値へ復元（`restore(PROD)`）
- scratch `scripts/decision255/` は evidence へ `.txt` 複写後に削除
- 証明（§8 実行ログ）：`git status --porcelain` が docs 以外 0／`src/core/data/rules.ts`・`enemies.ts`・`divination.ts`・`cards/common.ts` の md5 が監査前後で同一／`git diff --stat e2add7a -- src public package.json` 0

### §8 実行ログ
- 実行：2026-10-02（worktree `C:/Users/kimi1/SevenGodsGame-d254-rc`・branch `docs/lane1-post-d254-practical-qa-reaudit`・親 `e8c2cae`＝master `e2add7a` と同一 docs）
- `git status --porcelain`：`?? docs/SOLUTION_DIVERSITY_V1_PREFLIGHT.md`・`?? docs/evidence/decision255/` の 2 行のみ（`scripts/decision255/` 削除済み）
- md5：`rules.ts` abfc36a1…・`enemies.ts` 534936d5…・`divination.ts` 99d5176f…・`cards/common.ts` dbb6d431… ＝ 監査前（Lane 1 §9・smoke 時点）と同一
- `git diff --stat e2add7a -- src public package.json`：0 行
- simulation：vitest 2 回（tune 1,375,920 試合 483s／final 919,240 試合 283s）PASS。variant の書き換えはメモリ上のみ・終了時 `restore(PROD)`
- merge／push／deploy／Production 変更：0

## 9. Deliverables
1. 本書 `docs/SOLUTION_DIVERSITY_V1_PREFLIGHT.md`
2. `docs/evidence/decision255/`：`sim255-tune.json`・`sim255-final.json`・`SIMULATION_SUMMARY.md`（自動生成）・`gen255.mjs.txt`・`harness.d255.test.ts.txt`・`ITEM_RANK_EXTRA.txt`・`vitest-run-tune.log.txt`／`vitest-run-final.log.txt`
3. `docs/DECISIONS.md` 決定255 行（統合担当が追記）
