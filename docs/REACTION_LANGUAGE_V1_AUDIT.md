# 決定248 — Reaction Language v1 Audit（AUDIT / DESIGN only）

- 日付：2026-09-28
- 種別：**AUDIT / DESIGN / SIMULATION ONLY**（runtime・CSS・画像・音声・merge・push・deploy：0。Production `bcfd530`（決定247 LIVE）不変）
- 判断主体：AI チーム（CLAUDE.md §6-2）。**実装 GO は CEO**
- 出典：Production `bcfd530` の実コード（worktree `SevenGodsGame-d247`＝origin/master・clean）、決定244 §5（38/60 の指摘）、決定224／229／232／233／234／235／240／246／247
- 証拠：`docs/evidence/decision248/`（60 枚 semantic 表・現行反応インベントリ・提案 primitive 表・code evidence・Human QA 案・分類スクリプト原文）

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| Production の現状 | カードを出したとき**キャラクターが動くのは 21/60 枚**（敵ダメージを持つ札。自傷 3 枚はすべて敵ダメージ札に含まれる）。**39/60 は Card（閃光・飛翔）と HUD だけ**。決定244 の「38」は `予言` の数え違いで、正しくは 39 |
| 根本原因 | 反応が **event 種別 → HUD の部品**に直結していて、「誰が」を持たない。閃光は 6 type で色とアイコンが違うだけで、**形・場所（画面中央）・時間（0.35s）・方向が全 60 枚で同じ**。神が動く条件は `dealsEnemyDamage` の 1 条件だけ（`BattleScreen.tsx:320`）、敵が動く条件は `DAMAGE_DEALT(enemy)` だけ |
| 60 枚の分類 | **7 semantic で 60/60・unknown 0**：STRIKE 20／GUARD 11／MEND 9／WEAKEN 7／ATTUNE 6／TEMPO 5／EMPOWER 2。横断の modifier：PAYOFF（⚡持ち 23）・RISK（自傷 3）・SETUP（共鳴を上げる 9） |
| 推奨 vocabulary | 上の 7 semantic。候補の「SETUP／PAYOFF」は**カードの種類ではなく状態の軸**（⚡は 23 枚に横断・SETUP は順番の問題）なので、semantic ではなく modifier として扱う。「DRAW／BUFF」は TEMPO／EMPOWER に名前を変えて残す。EMPOWER（2 枚・1 戦 0.2 回）は独立 primitive を持たず RISE を金色で共有 |
| 推奨 primitive | **6 個**：P1 STRIKE（既存）／P2 BRACE（神が沈む・盾リム）／P3 BREATHE（神が持ち上がる・緑リム・OTOMO 小）／P4 STAGGER（敵がよろめき沈む）／P5 RISE（神が高まる・共鳴色／金・OTOMO 小）／P6 DEAL（引いた札が立ち上がる）。⚡・神の一撃・撃破は既存 Tier 2〜3 のまま |
| 階層 | P2〜P6 はすべて Tier 1（≤4px・≤400ms・stop 0・数字なし・音は既存のまま）。決定232 の ladder（L1〜L4）・決定224 の Tier 表（READY 2／PAYOFF 3／共鳴 4／神の一撃 5）を**侵食しない** |
| 既存資産の再利用 | 動きの経路（`--atk-x`・`.enemy-reaction` wrapper・`otomo-reaction-pop`）、色（heal 緑・block 青・共鳴紫・金）、決定240 の「filter を変数で差し替える」手法、reduced-motion の 4 ブロック。**新規画像・音・依存 0**。SE は既存 20 本で足りる（新規音は要件にしない） |
| SP／reduced-motion | transform（translate／scale）と opacity と既存 filter 経路だけ。SP 390 でも 4px の動きは神 ≤240px の絵の 1.7%＝読みを壊さない。reduced では P2〜P6 は 120ms のリム／opacity フェードのみ |
| 規模 | 7〜8 ファイル・**≈300〜400 行**（runtime ≈220・test ≈100）。CSS +2.5〜3.5KB・JS +1〜1.5KB。core 0・save 0・gameVersion 0 |
| **RECOMMENDED SPEC（1 案）** | **Reaction Language v1 Narrow Pilot**＝semantic 判定の純関数（効果データから・カード名分岐なし）＋ P2〜P6 の 5 primitive を **1 度に**入れる（1 つずつでは「意味の違い」が比較できない）。⚡・神の一撃・撃破・入力ロック・数値・音は不変。Gate G1〜G9 → Human QA 3 問 |
| **GO / NO-GO** | **GO**（Narrow Pilot の実装に進める価値がある。実装開始は CEO GO 後） |
| **NEXT NOW（1 件）** | **決定249 候補「Reaction Language v1 Narrow Pilot 実装 → Fast Gate（G1〜G9）→ CEO Human QA 3 問」**。branch は `bcfd530` から。神階Ⅴ〜Ⅶの再調整・導きの託宣・Entry・Voice は混ぜない |

---

## 1. Production の現状（実コード）

### 1-1. カードを出したときに起きること（60 枚共通）
| 段階 | 時刻 | 起きること | 主体 |
|---|---|---|---|
| タップ | 0ms | `card_play` SE・押下の沈み（決定233／200） | Card・音 |
| cast | 280ms（入力ロック） | 画面中央の閃光（type 別 6 画像＋アイコン・0.35s。power tier で光量）、ゴーストが神の胸元へ飛ぶ（決定239）、**敵ダメージ札だけ**神が −7px 構える | Arena・Card・（God） |
| commit | 0 | engine 適用 → `useBattleFx` が key を増やす → 各パネルが再マウントで CSS animation | 下表 |

### 1-2. event 別に「誰が動くか」（`docs/evidence/decision248/current-reaction-inventory.md` §2 の要約）
| event | God | OTOMO | Enemy | Arena | Card | HUD |
|---|---|---|---|---|---|---|
| 敵ダメージ | **突き**（tier で軽重） | — | **stop／kb／揺れ／数字** | tier4 揺れ | 閃光・飛翔 | HP ゴースト・トースト |
| 自傷 | 揺れ | — | — | — | 同上 | ミニ結果 |
| ブロック | — | — | — | — | 同上 | **盾バッジ pulse**・トースト |
| 回復 | — | — | — | — | 同上 | **HP バー pulse**・数字 |
| ドロー／AP | — | — | — | — | 同上（引いた札は**その場に出現**） | ミニ結果 |
| バフ | — | — | — | — | 同上 | バッジ（文字） |
| デバフ | — | — | **なし** | — | 同上 | 敵バフ欄（文字）・予告値 |
| 共鳴上昇 | — | — | — | — | 同上 | ゲージ fill |
| ⚡（決定224） | — | — | 金リング・stop 50 | — | READY 材質（1 枚） | 34px 金の数字 |
| 神の一撃 | 溜め→突き 24px | **pop 0.5s** | tier4・stop 80 | 暗転・揺れ 5px | — | バナー |

### 1-3. 現行の問題（再検証）
- キャラクターが動く札は **21/60**（敵ダメージまたは自傷を持つ札）。**39/60 は HUD と閃光だけ**
- 1 戦（reader・ふつう・推奨デッキ平均）で STRIKE 5.6 回に対し、GUARD 1.6・ATTUNE 1.2・WEAKEN 1.2・TEMPO 0.8・MEND 0.6・EMPOWER 0.2＝**非攻撃の手が 5.5 回／戦（12〜15 手の 4 割）**。この 4 割の手で「誰も動かない」
- 閃光は「何を使ったか」を色とアイコンで言うが、**「誰が・どうなったか」を言わない**。防御札を出しても神は動かず、デバフを当てても敵は動かない。CEO の「反応が似ている」はこの構造そのもの
- 一方で攻撃側は決定232 で L1〜L4 の階層・決定224 で ⚡・決定226 で撃破が整っており、**「攻撃だけが戦っている」**非対称になっている

### 1-4. 根本原因（1 つ）
反応の設計単位が **「event → HUD の部品」**であり、**「カードの意味 → 反応する主体」**という層が存在しない。`useBattleFx` は `HEALED`→`healKey`、`BLOCK_GAINED`→`blockGainKey` を作るが、受け手はどちらも名札（HUD）の要素。神の立ち絵にクラスが付く条件は `godAttackKey`（敵ダメージ／神の一撃）だけ、敵の立ち絵は `DAMAGE_DEALT(enemy)` だけ。

## 2. 60 枚の semantic 分類（`docs/evidence/decision248/60-card-semantic-table.md`）

### 2-1. 導出の方法
効果データ（`Effect[]`）を AP 等価で重み付け（damage／block／heal＝1・draw／AP＝4・resonance＝2.5・buff／debuff＝amount×2）し、最大を primary、その 50% 以上を secondary とした。**カード名では分岐しない**（不変ルール 3 と同じ思想。実装時も同じ純関数）。

### 2-2. 結果
| semantic | 枚数 | 1 戦の回数（平均） | 主なカード | 現在の主体 | 望ましい主体 |
|---|---|---|---|---|---|
| STRIKE（敵を打つ） | 20 | 5.6 | 一撃・剛撃・渾身・豪快な一撃・神託・小さな託宣・独奏 | God→Enemy（既存） | God → Enemy |
| GUARD（身を守る） | 11 | 1.6 | 守護・鉄壁の構え・受け流し・守りの陣・不動の構え・懐の深さ・後輩想い | HUD | **God（構える）** |
| MEND（癒す） | 9 | 0.6 | 癒し・息吹・大治癒・福授け・福袋・浄めの光・幸運の女神 | HUD | **God（息を吹き返す）＋OTOMO 小** |
| WEAKEN（敵を弱める） | 7 | 1.2 | 呪縛・見切り・威嚇・金縛り・悪戯・一喝・からかい半分 | HUD | **Enemy（よろめく）** |
| ATTUNE（共鳴を満たす） | 6 | 1.2 | 共振・神楽舞・秘技・満ちる・気まぐれ・魅惑の舞・冒険者の勘 | HUD（ゲージ） | **God（高まる）＋OTOMO 小** |
| TEMPO（手札・神力） | 5 | 0.8 | 神力の泉・予言・見通し・アンコール・喝采 | HUD | **Hand／Card（配り直し）** |
| EMPOWER（攻撃力を上げる） | 2 | 0.2 | 闘志・姉御の号令 | HUD | God（高まる・金） |

- 複合札 24 枚（例：反撃の刃＝STRIKE＋GUARD、守りの陣＝GUARD＋MEND、恵比寿顔＝MEND＋ATTUNE）。規則：**体の反応は primary 1 つ・secondary は HUD の既存反応**
- modifier：**PAYOFF** 23 枚（⚡持ち。既存 Tier 2 のまま）、**RISK** 3 枚（捨身・豪快・一攫千金。既存の自傷揺れ）、**SETUP** 9 枚（共鳴を上げる札＝`charged` を作る）。SETUP は「順番」の意味なので、反応は ATTUNE（RISE）で表し、SETUP 専用の primitive は作らない
- 候補 8 分類との差：DRAW→TEMPO（AP 増加も同じ「手が広がる」）、BUFF→EMPOWER、DEBUFF→WEAKEN、**SETUP／PAYOFF は semantic から外して modifier へ**。分類数は 7（＋modifier 3）

## 3. 反応する主体の設計（§4 の要求）

| semantic | 誰が | どう | なぜその主体か |
|---|---|---|---|
| STRIKE | God → Enemy | 既存の突き→被弾 | 攻め手と受け手の両方が動く唯一の系。維持 |
| GUARD | **God** | 相手と反対へ沈み込む（構える）＋盾色のリム | 「守る」のは神。敵は無反応が正しい（決定216：守りは相手の行動理由にならない） |
| MEND | **God**（＋OTOMO 小） | 持ち上がる（息を吹き返す）＋緑リム | 回復は神の体に起きる。OTOMO は「支える」役（回復効果の多くは OTOMO 由来＝`otomo.ts`） |
| WEAKEN | **Enemy** | よろめき（±3px）＋沈む（明度） | 弱体は敵に起きる。予告値が減ることと同じ場所で見せる |
| ATTUNE／EMPOWER | **God**（ATTUNE は OTOMO 小） | 高まる（scale 1.03・上へ 2px）＋外へ広がるリム（共鳴色／金） | 神の力が満ちる。共鳴は OTOMO の成長にもつながる（`applyResonance`） |
| TEMPO | **Hand／Card** | 引いた札が下から立ち上がる・AP バー 1 回明滅 | 「手が広がった」は手札で起きる。神は動かない（動かすと嘘になる） |
| 託宣 3 種 | 同じ規則 | 加護＝GUARD／導き＝TEMPO／天啓＝STRIKE | 託宣も同じ語彙で読める（決定246 で「切り札」になった加護に体の反応が付く） |

## 4. Reaction Primitive（`docs/evidence/decision248/proposed-primitive-table.md`）

| primitive | 主体 | 動き（候補値） | 時間 | 強度 | reduced |
|---|---|---|---|---|---|
| P1 STRIKE | God→Enemy | 既存（決定232） | 340〜520ms | L1〜L4 | 既存 |
| P2 BRACE | God | 相手の逆へ 4px・下へ 2px・scale 0.98 → 戻る。盾色（#7fb2ff）リム 1 回 | 320ms | Tier 1 | リム 120ms のみ |
| P3 BREATHE | God（+OTOMO） | 上へ 3px・scale 1.02 → 戻る。緑（#4dbd74）リム。OTOMO は pop 小型（1.06・3px・0.35s・ラベル無し） | 400ms | Tier 1 | リムのみ |
| P4 STAGGER | Enemy | 反応 wrapper が ±3px を 2 往復＋brightness 0.78 → 戻る（内側の filter に触れない） | 360ms | Tier 1 | 明度 120ms のみ |
| P5 RISE | God（+OTOMO） | scale 1.03・上へ 2px → 戻る。外へ広がるリム：ATTUNE 紫（#c39bff）／EMPOWER 金（#ffd166） | 400ms | Tier 1 | リムのみ |
| P6 DEAL | Hand | 引いた札が下 8px から 160ms で立ち上がる（1 枚ごと +40ms）。AP 増は AP バー 200ms 明滅 | 160〜240ms | Tier 0〜1 | opacity 120ms のみ |

共通規則：時刻＝commit（0ms）。同一バッチに STRIKE があれば STRIKE 優先（BRACE／STAGGER は出さない）。共鳴 7 到達のバッチでは RISE を出さない（カットインへ譲る）。次の commit（≥280ms）で key 再マウント＝置換。音は追加しない（既存 SE がそのまま同時刻に鳴る）。**Interaction Laws 1〜7 との照合は primitive 表 §3**。

## 5. 強度の階層

| Tier（本監査） | 決定224 の Tier | 場面 | 動き | stop | 数字 | 音 | 1 戦の回数 |
|---|---|---|---|---|---|---|---|
| 0 | 0 CALM | 待機・DEAL の HUD 側 | 呼吸・明滅 | — | — | — | 常時 |
| 1 | 1 通常 | P2〜P6・STRIKE L1／L2 | ≤4px・≤400ms | 0／30／40 | なし／16／22 | 既存 | ≈11（STRIKE 5.6＋その他 5.5） |
| 2 | 1 の L3／L4＋3 PAYOFF | 重い一撃（溜め 150ms・28px）・⚡ | 13→28px | 45／60／50 | 30／40／34 金 | `hit_l3`／`hit_l4`／`reward` | ≈2〜4 |
| 3 | 4 共鳴＋5 神の一撃・撃破 | 神の一撃・撃破・勝利の舞台 | 24px・崩壊・暗転 | 80／90 | 52 | 1.0・sting | ≤1 |

- **P2〜P6 は Tier 1 の下限側**（stop 0・数字なし・音の追加なし・画面揺れなし）。Tier 2〜3 の要素（stop ≥45・金・暗転・揺れ）を一切使わない＝決定224 §11「画面揺れ・暗転は Tier 4／5 だけ」・決定232 の ladder と両立
- 「通常カードが神の一撃より派手」は構造的に起きない（P2〜P6 の最大 4px／400ms ＜ L1 の 4px kb＋揺れ）

## 6. 既存資産・SE の再利用

| 資産 | 再利用 |
|---|---|
| `--atk-x`（決定229／247 の向き変数） | BRACE の「相手の逆へ」を同じ変数で決める（PC・SP で自動的に正しい向き） |
| `.enemy-reaction` wrapper（`--impact-delay`／`--stop`） | STAGGER を `react-weaken` として同じ wrapper に載せる（内側 `.enemy-avatar` の filter＝決定240 の構え・決定247 の反転に触れない） |
| `otomo-reaction-pop` | BREATHE／RISE の OTOMO 小型版（振幅を 1/2） |
| `heal-pulse` 緑・`badge-block-pulse` 青・共鳴紫・金 | リムの色をこの 4 色に固定（新色を作らない） |
| 決定240 の「filter を CSS 変数で差し替え」 | 神側にも `--rl-rim` を用意し、drop-shadow 連鎖の 1 段だけを入れ替える（transition で 240ms settle） |
| reduced-motion ブロック（`battle.css:4616` 系） | 同じ形で P2〜P6 の transform を 0 にする |
| SE 20 本 | **追加しない**。block（90ms）・heal（440ms）・card_draw（110ms）・resonance_gain（150ms）が既に同時刻に鳴っており、体の反応が付けば音と動きが一致する。God Strike Voice は別 Decision |

## 7. SP／reduced-motion の安全性
- 動きは translate／scale／opacity と、既存経路の filter（wrapper の brightness・drop-shadow の変数差し替え）だけ。particle・video・canvas・WebGL・DOM 量産・カード別画像・60 個の animation：**0**
- SP 390×844（決定229 v2）：神 ≤240px・敵 ≤300px・OTOMO 0.75 倍（38〜50px）。4px は神の絵の ≈1.7%、敵の ±3px は ≈1%。名札・予告・手札の箱は動かない（G6 で 0px を要求）
- OTOMO は SP で小さいため BREATHE／RISE の OTOMO 小型 pop は「見えたら良い」扱い（PASS 条件にしない）
- reduced-motion：P2〜P6 は 120ms のリム／opacity フェードのみ。既存の 4 ブロックと同じ規約。**決定232 のテストが「ファイル末尾の reduce ブロックは 232 のもの」を前提にしている**ため、新しい reduce 規則は 232 のブロックへ追記するか、テストを「Pre-existing Test Harness Assumption」として更新する（実装時に選ぶ）

## 8. 実装規模（見積もり）
| 対象 | 行数 |
|---|---|
| `cardSemantic.ts`（新規・純関数）＋test | 60〜80 |
| `useBattleFx.ts`（key 5 種） | 30〜40 |
| `PlayerPanel.tsx`／`EnemyPanel.tsx`／`GodOtomoPanel.tsx`／`BattleScreen.tsx`（class・変数） | 50〜70 |
| `combatTimeline.ts`（reaction plan に weaken 1 種） | 10〜15 |
| `battle.css`（keyframes 5・規則 12〜16・reduce 1・末尾追記） | 110〜140 |
| tests（semantic 60/60・unknown 0・fx key・reduce） | 60〜80 |
| **合計** | **≈300〜400 行（7〜8 ファイル）** |

bundle：CSS +2.5〜3.5KB・JS +1〜1.5KB。core／save／gameVersion／assets：0。1 レーン・Fast Gate 1 日以内が目安。

## 9. 回帰リスク
| リスク | 対応 |
|---|---|
| `.enemy-avatar` の filter 衝突（決定240 の構え・STAGE-LITE の影・決定247 の scale） | STAGGER は**外側の wrapper**に置く。内側には触れない |
| 神の立ち絵の transform 衝突（`player-windup`・`god-strike`・被弾の揺れ） | BRACE／BREATHE／RISE は `player-avatar-wrap` の**さらに外側**か、既存と同じ「複合クラスで animation を 1 本の list にする」手法（`.hit-shake-flash` と同じ）。同一バッチは STRIKE 優先で重ならない |
| DEAL と SP の手札スクロール（`overflow-x: auto`・上余白 26px） | 8px の立ち上がりは余白内。READY の lift 3px（独立プロパティ）と合成される |
| 入力ロックの延長 | 0（P2〜P6 は commit 後の表示のみ。280ms 不変を G4 で実測） |
| 決定232 の reduce ブロック前提テスト | 実装時に「末尾のブロックへ追記」を選ぶ |
| 頻度×強度の疲労 | 1 戦 ≈11 回の Tier 1。DEAL は開幕 5 枚を 1 回の連鎖（160＋40×4＝320ms）に収める。Human QA Q3 で判定 |
| 神階・Daily・スコア・決定論 | 触れない（表示のみ）。G3 で gameVersion 同一・golden 同一・1,235 PASS |

## 10. Human QA 設計（`docs/evidence/decision248/human-qa-proposal.md`）
- 推奨 2 戦：大耀 × 蒼海の龍神（STRIKE／GUARD／MEND／ATTUNE が 1 戦で出る）、寿楽 × 乱舞の道化（WEAKEN 中心）。託宣は R4 の峰で加護
- 3 問：Q1 意味の違いが感じられるか／Q2 God・OTOMO・Enemy が反応して戦っている感じが増えたか／Q3 うるさすぎず読みの邪魔にならないか。**3/3 YES で PASS**
- NO のときの調整は 1 回まで・候補値の範囲内（≤6px・≤450ms）。primitive は増やさない
- 機械 Gate G1〜G9（semantic 60/60・決定論・engine 不変・入力ロック 280ms・reduced・箱 0px・保護ブロック不変・回数上限・bundle）

## 11. 変更禁止の遵守
balance・カード数値／効果・敵行動・託宣・AP・7R・seed・神／OTOMO 能力・敵 HP・難易度・スコア・Daily・Ranking・新 Enemy Ultimate・新カード・新 asset・画像／音声生成・H3・Entry Sequence・敵アート：**すべて触れない**。決定246／247 不変。神階Ⅴ〜Ⅶは既知回帰として保持。

## 12. runtime 変更 0 の証明
- 監査は worktree `SevenGodsGame-d247`（origin/master＝`bcfd530`）を読むだけ。`git status` は 0 行のまま
- 本 worktree の変更は `docs/REACTION_LANGUAGE_V1_AUDIT.md`・`docs/evidence/decision248/`・`docs/DECISIONS.md` の 1 行追記のみ
