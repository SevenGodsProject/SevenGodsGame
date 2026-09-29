# 決定244 — 2026-09-28 CEO Practical QA / Combat Alive Root-Cause Audit

- 日付：2026-09-28
- 種別：**AUDIT ONLY / docs-only**（Production runtime・CSS・画像・音声・カード数値・敵数値・神託仕様：変更 0。外部 API・有料生成・H3・画像生成・音声生成：0。敵 7 体アート生成：未着手のまま HOLD。merge／push／deploy：0）
- 判断主体：AI チーム（CLAUDE.md §6-2「複数案からの推奨案選定」「GO・NO-GO の技術判断」）。**実装 Phase の決定は CEO／相棒のレビュー後**
- Baseline：Production **`d1e3b30`**（= `master` = `origin/master`・Vercel Deployment `6697593799`・決定243 Lane3 After-2 LIVE）。本 worktree の HEAD `43c10a4`（`feat/d224-premium-payoff-pilot`）は `src/core` に決定213（OTOMO 構え・未 Release）を含むため、**engine／data の監査はすべて `git archive d1e3b30` を scratch に展開した Production そのものの写し**で行った
- 表記：【実測】＝本監査の計測（sim／画像／コード読み）、【docs】＝既存 Decision・監査の記録、【AI 判断】＝本書で決めた評価、【推測】＝根拠の弱い見込み
- 証拠：`docs/evidence/decision244/`（simulation 47,040 試合・60 枚カード表・既存 `balanceSim.test.ts` 照合・harness 原文）

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 14 件の判定 | **SUPPORTED 9**（02・03・04・05・09・10・11・13・14）／**PARTIAL 3**（01・06・12）／**REFUTED 1**（08：現時点の問題ではない）／**INSUFFICIENT 1**（07：提案。効果の証拠なし・実現性は条件付き GO） |
| Root Cause の数 | **5 つ**（＋08 は欠陥ではなく設計方針）。**RC1「決着が敵のクライマックスより早い」**（R5 までに 71% 撃破・R6〜R7 の敵の山場は 29%／2% しか到達しない・託宣 7 回＝毎ラウンド）が 06・09・10・11・13 の共通原因。RC2 敵語彙が 4 種で 4 体は「数字だけ」／RC3 反応の主語が HUD でキャラではない／RC4 原画の向き・接地・画風が舞台と揃わない／RC5 入口の儀式がない |
| 最重要の数値 | 【実測】ふつう：**予告を読む方策 100%・何も考えない方策 97.6%・攻撃一辺倒 94.5%** が勝つ（7 神 × 7 敵 × 40 seed）。**敗北はふつう全ラウンドで 0**。託宣を 1 回も使わなくても 96.4%。R1〜R3 の敵の実効ダメージは HP の 10〜17%、R6〜R7 の 130〜240 は試合の 2〜29% しか体験されない |
| North Star との関係 | Primary Fun＝「解く」が **ふつうでは成立していない**（解かなくても勝つ）。むずかしいでも「読む」だけで 99.5%。「神・OTOMO・デッキの組み合わせ」は 7 神とも 99〜100% で差が出ない |
| P0 | **RC1 Combat Tension v1**（託宣の希少化 ＋ 敵の山場を R3〜R5 の窓へ。`rules.ts`／`enemies.ts` の数値のみ・Preflight sim 先行）／**Fast Gate Hotfix：PC でも敵の絵を反転**（決定229 v2 の 1 規則を ≥900px へ） |
| P1 | RC3 Card Reaction Language v1（UI のみ・6〜8 語彙）／RC2 Enemy Ultimate（**RC1 の後**。R6〜R7 に置く必殺技は現行ペースでは不可視）／RC4 Enemy Art Direction Brief の HOLD 解除（向き・接地・明度の受入 3 条件を追加） |
| P2 | RC5 Entry Sequence（CSS のみ・2〜5s・skip・reduced-motion）／God Strike Voice（権利・生成は CEO §6-3 #5／#6）／08 は監視のみ／12 は RC1 Pilot に同梱（加護が「効く」状態になってから名称を直す） |
| **NEXT NOW（1 件）** | **決定245 候補「Combat Tension v1 Preflight」＝docs＋simulation only**。託宣 7→3／戦と、7 敵それぞれの「山場」を R3〜R5 に置く案を paired-seed で比較し、ふつう＝「何も考えない方策の敗北 ≥15%・読む方策 85〜95%」、むずかしい＝「読む方策 60〜75%」の帯に入る 1 案を推奨。**実装は CEO GO 後**（§6-5：Phase 開始前の確認） |

---

## 1. Baseline と方法

| 項目 | 内容 |
|---|---|
| Production | `d1e3b30`（`git branch --contains` で `master`・`origin/master` を確認）。HEAD との `src/core` 差分は決定213 の 16 ファイル（未 Release）→ 監査対象から除外 |
| engine の写し | `git archive d1e3b30 \| tar -x` を scratch へ展開し、`node_modules` はジャンクションで共有。repo の Working Tree には触れていない（§15 で証明） |
| simulation | 新規 harness（`docs/evidence/decision244/harness.d244.audit.test.ts.txt`）：7 神 × 7 敵 × 3 難易度 × 8 方策 × 40 seed ＝ **47,040 試合・15 秒**。方策＝reader（予告を読み、致死なら盾→デバフ→回復、殺し切れるなら攻撃、それ以外は AP 効率攻撃。託宣は致死で加護・とどめで天啓・それ以外は天啓）／naive（手札の左から順に出す・託宣は常に天啓）／aggressive／defensive（既存 `balanceSim` と同じ考え方）。託宣の使用回数を方策側で 7（every）／3／2／1／0 に制限した 5 系列で「いつ切るか」を測った |
| 照合 | 既存 Planner 用 `balanceSim.test.ts`（無変更）を同じ写しで実行し、ふつう 7 神 × 7 敵で balanced／defensive **100%** を再確認（`balanceSim-crosscheck.md`） |
| 画像 | 神 7 柱 `front_640.webp`（戦闘）・`keyvisual*.webp`（Home／神選択／カットイン／勝利）・`front.webp`（未使用の別ポーズ）、敵 7 体の配信 art、OTOMO 7 体の精霊態を目視。数値は `docs/ENEMY_ART_DIRECTION_BRIEF_V1.md` §1-1 の sharp 実測【docs】を引用 |
| 限界 | reader は毎ラウンド完全な算術で判断する「上限に近い人間」。実プレイヤーの勝率はこれより低い。ただし CEO 本人の体感（09・10）と決定57 の CEO 指摘「負けがほとんど起きない」【docs】が同じ方向を示す |

---

## 2. 実コード／実データの棚卸し

### 2-A. Combat progression（`src/core/data/rules.ts`・`engine/`）【実測】

| 項目 | Production の値 | 出典 |
|---|---|---|
| ラウンド | 7。7R 終了で未撃破＝`finished`（敗北扱い・スコアは残る） | `rules.ts totalRounds`／`round.ts finishRound` |
| AP | R1〜R7 ＝ **2/3/4/5/6/7/8**・持ち越しなし | `rules.ts ap.perRound` |
| 手札 | 初期 5・毎 R +2・上限 10・山札 20・切れたら捨札を reshuffle | `rules.ts deck` |
| HP | 神 **30**（表示 300）・全 7 神同一。難易度で +5／0／−3 | `rules.ts player.maxHp`・`difficulty` |
| 敵 | HP 85〜103（表示 850〜1030）・難易度 ×0.85／1／1.15 | `enemies.ts` |
| 敵ダメージ | 7R の固定表（`actions[round-1]`）。乱数 0。デバフは合計へ 1 回。表示 ×10 | `round.ts nextEnemyAction` |
| ブロック | ラウンド開始で 0。神階Ⅳ以降のみ効率 0.75 | `round.ts startRound`／`effects.ts` |
| 回復 | 上限は maxHp。神階Ⅴ以降のみ効率 0.6 | `effects.ts` |
| 共鳴 | 7 で自動発動（神の一撃＋OTOMO 形態効果）・OTOMO は発動ごとに 1 段成長 | `effects.ts applyResonance` |
| 神の一撃 | 神ごとに固定（大耀 36 純火力／恵比寿 25+AP2／蒼毘 21+block20／才華 12+draw2+AP2／寿楽 23+atk−6×3R／福永 22+heal6+AP1／笑蓮 21+heal12+block12） | `gods.ts` |
| 託宣 | **1 戦 7 回（通常）／4 回（神階Ⅰ〜Ⅶ）・1R 1 回・AP 0** | `rules.ts divination.count`／`stakes.ts` |
| 勝敗 | 敵 HP 0＝won／神 HP 0＝lost／R7 終了＝finished | `effects.ts applyDamage`・`round.ts` |
| スコア | 実効ダメージ ×1.2・連携 12/8/4・撃破 300・テンポ 290/290/290/240/170/90/0・残 HP ≤30・難易度 −20/0/+30・×1.3 | `rules.ts score`／`score.ts` |
| 時間 | **スコア・リプレイ・行動ログに経過時間の項目は 0**。`Date.now` は seed 生成のみ | `useGameEngine.ts:317`・`replay/types.ts` |

### 2-B. カード 60 枚（`docs/evidence/decision244/card-table-60-and-recommended-decks.md`）【実測】

- 内訳：共通 32 ＋ 神専用 4 × 7。type＝attack 19／support 16／guard 8／resonance 7／hinder 7／oracle 3
- ダメージ効率：3.0〜8.3 dmg/AP（基準 5）。神託 25/3AP・小さな託宣 7/1AP・一攫千金 7.5・豪快な一撃 7.0 が上位
- 条件付き追加効果（`bonus`）：共通 16 ＋ 専用 8。条件は combo／charged／enemyBig／lowHp／blocked の 5 種
- おすすめデッキ 7 種：総ダメージ 76〜115・dmg/AP 2.30〜3.21。寿楽 115（大喝×2・渾身×2）が最大、才華 76 が最小
- **使用実態（reader／ふつう）**：1 コピーあたり 1 戦に **0.04 回しか出ない札**がある（浄めの光 0.04・気まぐれ 0.04・福袋 0.12・恵比寿顔 0.13・巫女の舞 0.18・福授け 0.18・癒し 0.19）。回復札は「必要になる被ダメージが来ない」ので出番がない。手札に来たのに一度も使われない札の割合（dead-card rate）は **27.8%**（ふつう）・19.0%（むずかしい）
- 代替性：攻撃札は 1AP 4〜5／2AP 10〜15／3AP 18〜25 と刻みが細かく、どの札を引いても「AP を全部ダメージに変える」ことができる（§3-B の根拠）

### 2-C. 敵 7 体（`src/core/data/enemies.ts`）【実測】

| 敵 | HP | 7R 予告（内部値） | 語彙 | 固有機構 | rank | 実質の差 |
|---|---|---|---|---|---|---|
| 試練の影 | 103 | 5/6/8/9/11/13/15 | attack のみ | なし | 1 | 数字のみ |
| 業斧の鬼将 | 100 | 5/7/9/11/13/15/17 | attack のみ | なし | 2 | 数字のみ |
| 藍花の怨霊 | 95 | 3/4/6/9/13/**18/23** | attack のみ | なし（後半急伸） | 3 | 数字のみ（急伸は R6〜R7＝§3-A のとおり到達率 2〜29%） |
| 銀甲の機工師 | 100 | 6/溜/22/⚠溜/**必殺 24**/7/9 | attack＋charge×2＋special | 2 段 telegraph（決定 K-C2） | 4 | **有** |
| 双牙の魔獣 | 85 | 連撃 5+4／5+5／**4×3 必殺**／7+6／7+7／8+7／8+8 | multiAttack 全 R | 連撃・R3 必殺 | 2 | **有** |
| 蒼海の龍神 | 103 | 4/5/7/9/12/16/20 | attack のみ | なし（決定216 の「守り」Pilot は NO-GO） | 3 | 数字のみ |
| 乱舞の道化 | 92 | 4/溜/19/6/12/溜/24 | attack＋charge×2 | 溜め→大技 ×2 | 4 | 有（溜めのみ） |

- 語彙は **4 種（attack／charge／multiAttack／special）**。attack 以外を持つのは **3 体**（決定214 §0 の指摘【docs】と一致）
- 差別化に使える機構（デバフ・ブロック・手札干渉・共鳴干渉）は敵側に **0**。`EnemyActionDef` に `special` を足した決定 K-C2 の runtime 触点は 17 ファイル（`grep "'special'"`）
- 決定 K-C2 のコメント【docs】：「R7 配置は平均撃破 R5.7 のため **発動率 0%＝不可視**と実証され棄却」→ **敵の山場を R6〜R7 に置くと体験されない**ことは Production の設計履歴自体が証明している（RC1）

### 2-D. 神・OTOMO（`gods.ts`／`otomo.ts`／`godPassive.ts`）【実測】

- HP は **7 神すべて 30**。差は得意技（蒼毘 反撃・笑蓮 HP≥80% で +50%・福永 HP≤50% で +50% の 3 神のみ）と専用 4 枚と神の一撃
- OTOMO：精霊態は効果 **0**（空配列）。受肉態・童子で heal／block／draw／AP／buff。共鳴発動 1 回目で受肉態（発動率は §3-A：ふつうで 1 戦 0.4 回程度）→ **童子の効果を見る試合はまれ**
- 向き・配置・接地・光は §4

### 2-E. 託宣 3 種（`divination.ts`・`applyDivination.ts`）【実測】

| 名称 | 効果（内部値） | 制限 | 期待値（ふつう） | UI |
|---|---|---|---|---|
| 加護の託宣 | 予告合計 × 0.5（切捨て）のブロック・最低 2。神階のブロック効率を受けない | 1R 1 回・1 戦 7 回・AP 0 | 予告 4〜24 → ブロック 2〜12（表示 20〜120） | 名称＋効果文＋実数プレビュー（Phase 5-D）。**画面高が小さいときは効果文を CSS で畳む**（`DivinationPanel.tsx:50` コメント）→ SP では名称だけが見える場面がある【要確認】 |
| 導きの託宣 | draw 1 ＋ AP 1 | 同上 | 1 枚 ＋ 1AP（実質 1AP カード 1 枚ぶん） | 名称＋効果文 |
| 天啓の託宣 | 敵に 4（表示 40） | 同上 | 4 ダメージ＝1AP 攻撃札とほぼ同価値・AP 不要 | 名称＋効果文 |

- 通常戦では **7 回＝全ラウンド**使える（平均決着 R5.2 なので実質無制限）。神階では 4 回。
- 【実測】reader は毎ラウンド使い、**98.9% が天啓**（ふつう）。加護は 1.1%。「いつ・どれを切るか」は現行では発生しない（§3-D）

---

## 3. Simulation（`docs/evidence/decision244/simulation-47040-games.md`）

### 3-0. 方策 × 難易度（7 神 × 7 敵 × 40 seed）【実測】

| 方策 | 託宣 | easy 勝率 | normal 勝率 | hard 勝率 | normal 敗北 | hard 敗北 |
|---|---|---|---|---|---|---|
| reader（読む） | 毎 R | 100.0% | **100.0%** | **99.5%** | 0.0% | 0.2% |
| naive（左から出す） | 毎 R | 99.9% | **97.6%** | 82.2% | 2.4% | 17.8% |
| aggressive（攻撃のみ） | 毎 R | 99.9% | 94.5% | 65.9% | 5.5% | 34.1% |
| defensive（守り優先） | 毎 R | 100.0% | 100.0% | 97.2% | 0.0% | 0.0% |
| reader | 0 回 | 99.6% | **96.4%** | 82.5% | 0.5% | 7.2% |
| reader | 3 回 | 99.9% | 99.5% | 95.2% | 0.0% | 0.2% |

- 既存 `balanceSim.test.ts`（別 AI）も ふつう 7 × 7 で balanced／defensive **100%**、hard aggressive のみ 才華 28%・大耀 70%【実測・照合】
- §11 の Target Experience と比較：Easy ✅／**Normal ✗**（「何も考えないと負けることがある」→ 2.4%）／**Hard ✗**（「敵固有攻略と組み合わせを理解しないと安定しない」→ 読むだけで 99.5%・7 神とも 98〜100%）

### 3-A. Round Tension Curve（reader／毎 R・ふつう）【実測】

| R | 生存 | AP | 使用枚数 | 神の出力 | 敵の予告 | 敵の実効ダメージ | 神 HP（終） | 敵 HP（終） | 託宣使用 | 累積勝利 | 累積敗北 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R1 | 1960 | 2 | 1.62 | 13.0 | 5.1 | 3.7 | 25.9 | 83.8 | 100% | 0% | 0% |
| R2 | 1960 | 3 | 1.51 | 21.8 | 4.0 | 3.0 | 23.2 | 61.9 | 100% | 0% | 0% |
| R3 | 1960 | 4 | 2.57 | 18.8 | 10.9 | 5.2 | 19.4 | 43.0 | 99.9% | 0.3% | 0% |
| R4 | 1955 | 5 | 3.01 | 23.4 | 6.7 | 1.8 | 19.7 | 19.5 | 89.8% | 14.8% | 0% |
| R5 | 1669 | 6 | 2.61 | 18.2 | 11.3 | 0.9 | 21.3 | 4.3 | 44.0% | **71.3%** | 0% |
| R6 | 563 | 7 | 1.77 | 12.0 | 8.5 | 0.1 | 23.0 | 0.5 | 16.7% | 97.8% | 0% |
| R7 | 44 | 8 | 1.07 | 6.9 | 13.1 | 0.0 | 25.5 | 0.0 | 0% | 100% | 0% |

- 仮説「R が進むほど敵の脅威増加よりプレイヤーの行動量／出力増加が大きく R5〜R7 が簡単」→ **SUPPORTED**。敵の予告は R3 以降 10〜13 だが **実効ダメージは R4 以降 1.8→0.9→0.1→0.0 に減る**（ブロック・デバフ・撃破）。神の HP は R3 で底（19.4）を打ち、以後 **回復して増える**
- **敗北は全ラウンドで 0**。R6 に到達する試合 28.7%、R7 は 2.2%。敵表の最大値（怨霊 18/23・道化 24・龍神 16/20・鬼将 15/17）は **ほぼ体験されない**。むずかしいでも R5 で 41%・R6 で 89% 撃破、R7 到達 10.5%、敗北 3/1960
- 敵別（ふつう）：撃破 R は 4.80（魔獣）〜5.38（龍神）の幅しかない。被ダメージ 9.3（怨霊）〜20.1（魔獣）
- 共鳴：発動は 1 戦 0.4 回（R4〜R5 に集中）。**OTOMO 童子（2 回目）はほぼ出ない**

### 3-B. Draw Sensitivity（同一 神 × 敵 × 難易度・40 seed＝山札順だけが変わる）【実測】

- ふつう：**49/49 セルで reader 100%**。撃破ラウンドの標準偏差 0.61R・残 HP の標準偏差 4.55/30・dead-card 27.8%
- 「読む」と「左から出す」で **結果が分かれた seed は 49 セル中 39 セルで 0/40**。分かれるのは 機工師・魔獣 の 10 セル（最大 才華×魔獣 10/40）
- むずかしい：reader 100% が 40/49。naive との差が 50pt 以上のセルは **8 セルすべて 機工師 か 魔獣**（才華×魔獣 83pt・恵比寿×魔獣 70pt・才華×機工師 70pt…）
- 仮説「ドローが変わっても解法・結果があまり変わらない」→ **ふつうで SUPPORTED**。むずかしいの 機工師・魔獣 だけが「引いた手札で解き方が変わる」状態に近い（PARTIAL）

### 3-C. Enemy Diversity（reader／毎 R）【実測】

| 難易度 | 攻撃 AP 比率の幅 | 盾 AP 比率の幅 | 加護選択率の幅 | 被ダメージの幅 | 8 次元プロファイル距離（平均／最大） |
|---|---|---|---|---|---|
| easy | 47.1〜51.0% | 4.5〜9.6% | 0.0〜0.2% | 6.3〜16.9 | 0.15／0.36 |
| normal | 42.0〜48.1% | 7.6〜12.3% | 0.0〜3.8% | 9.3〜20.1 | 0.15／0.37 |
| hard | 39.3〜44.1% | 10.0〜12.9% | 0.5〜**15.0%** | 12.2〜23.7 | 0.18／0.44 |

- 仮説「敵が変わっても要求されるプレイがほぼ同じ」→ **SUPPORTED**（試練・鬼将・怨霊・龍神・道化）。**機工師・魔獣だけ**が むずかしいで加護 13〜15%・naive 敗北 55〜83pt と、別の解き方を要求する
- 差は主に「被ダメージ量」と「撃破ラウンド ±0.3」＝ **HP・攻撃力の数字差**。決定214 §0「4 体は単発攻撃が増えていくだけ」【docs】と一致

### 3-D. Oracle Value（reader・託宣回数を方策側で制限）【実測】

| 託宣上限 | normal 勝率 | hard 勝率 | 使用時期（R1-3／R4-5／R6-7） | 加護の割合（normal／hard） |
|---|---|---|---|---|
| 毎 R（現行 7） | 100.0% | 99.5% | **69.5%**／29.4%／1.1% | 1.1%／5.4% |
| 3 回 | 99.5% | 95.2% | 3.4%／**73.4%**／23.3% | 28.4%／49.0% |
| 2 回 | 98.8% | 93.1% | 8.0%／26.1%／65.9% | 29.4%／56.5% |
| 1 回 | 98.0% | 90.5% | 15.6%／46.7%／37.8% | 33.4%／66.9% |
| 0 回 | 96.4% | 82.5% | — | — |

- 現行：託宣は **R1〜R3 に 70% 消費される「毎ラウンド 40 ダメージのボタン」**。加護が選ばれるのは 1%（ふつう）
- 上限 1〜3 回にすると、使用は **R4〜R5 に集中**し、**加護が 28〜67% に上がる**＝「いつ・どれを切るか」が発生する。勝率はふつう 98〜99.5% を維持（詰まない）
- 「毎 R 使う」は「0 回」に対して ふつう +3.6pt・むずかしい +17pt。敵別（hard）：機工師 +37pt・魔獣 +21pt・試練 +18pt・龍神 +16pt・鬼将 +11pt・道化 +9pt・怨霊 +6pt
- 仮説「毎ラウンド使えてありがたみがない」→ **SUPPORTED**。「いつ切るか」が最も発生する条件＝**1 戦 2〜3 回**（R4〜R5 に 60〜73% が集まり、加護／天啓が拮抗する）

### 3-E. HP／Damage Psychology（内部値。表示 ×10）【実測】

| 敵 | 敵 HP／神 HP | R1 の一撃／神 HP | 最大の一撃／神 HP | 7R 合計／神 HP | 神の平均攻撃札（9.4）／敵 HP |
|---|---|---|---|---|---|
| 試練の影 | 3.43× | 16.7% | 50.0%（R7） | 223% | 9.2% |
| 業斧の鬼将 | 3.33× | 16.7% | 56.7%（R7） | 257% | 9.4% |
| 藍花の怨霊 | 3.17× | 10.0% | 76.7%（R7） | 253% | 9.9% |
| 銀甲の機工師 | 3.33× | 20.0% | 80.0%（R5） | 227% | 9.4% |
| 双牙の魔獣 | 2.83× | 30.0% | 53.3%（R7） | 297% | 11.1% |
| 蒼海の龍神 | 3.43× | 13.3% | 66.7%（R7） | 243% | 9.2% |
| 乱舞の道化 | 3.07× | 13.3% | 80.0%（R7） | 217% | 10.2% |

- 敵の 7R スクリプトは神 HP の **2.2〜3.0 倍**を撃ってくる設計だが、実際に受ける合計は **HP の 48.1%**（ふつう・reader）。勝利時に HP 30% 以下で終わる試合 **0.6%**（hard 2.7%）、80% 以上で終わる試合 34.6%
- **「40」が弱いのではなく、40〜60 の来るラウンド（R1〜R2＝HP の 10〜20%）しか印象に残らず、150〜240 の来るラウンドを 2〜29% しか体験していない**。表示スケール（×10）の変更では解決しない（§10 の 06）

---

## 4. Visual / Battle Presence Audit

### 4-1. 配置と向きの現行ルール【実測】
- PC（≥900px）：敵＝左・神＝右。SP（<900px）：決定229 v2 の舞台レイヤーで同じく敵＝左・神＝右
- 突進・ノックバックは `--atk-x`（敵 +1・神 −1）で **動きは相手の方向**
- 原画の反転：**SP のみ** `body.battle-viewport .enemy-avatar { scale: -1 1 }`（決定229 v2）。**PC・カットイン・ボス登場は原画の向きのまま**（`battle.css:6743-6755`・決定229 §16-6 Known Risk 3【docs】）

### 4-2. 神 7 柱（戦闘 `front_640.webp`）【実測・目視】

| 神 | 体 | 顔・視線 | 武器／行動ベクトル | 戦闘での向き（敵＝左） | 備考 |
|---|---|---|---|---|---|
| 恵比寿 | やや左 | 正面（ウインク） | 竿は右へ弧 | 弱い左 | 鯛に座る（足元焼き込み） |
| 大耀 | 正面 | 正面 | **砲口 左** | 左 ✅ | 袋に座る |
| 蒼毘 | 3/4 左 | 左 | **槍の穂先 左** | 左 ✅（最も強い） | 立ち |
| 才華 | ほぼ正面・腰はやや左 | 正面（やや右に傾く） | ギター ネック 左下 | **弱い左／ほぼ中立** | `keyvisual`（Home・神選択・カットイン・勝利）は **腰・ギターが右**＝戦闘絵と鏡像の別ポーズ |
| 寿楽 | 左 | 左 | 蹴り 左 | 左 ✅ | |
| 福永 | やや左 | 正面 | 手を上げる（方向なし） | 弱い左 | 兜に文字（反転不可） |
| 笑蓮 | 寝そべり・体は右へ伸びる | **右** | なし | **右＝敵に背** | `keyvisual` も右向き。`front.webp`（未使用別ポーズ）は正面・兜文字「招福招来」あり |

- CEO 01「才華が右を向く」：戦闘絵は中立〜弱い左。**右向きの印象は keyvisual 系（Home hero・神選択・共鳴カットイン・勝利舞台）**と、実際に右を向いている **笑蓮** から来る。決定229 §16-6 #6「笑蓮・才華は正面寄りのため向き合いの印象が弱い」【docs】と一致
- OTOMO 精霊態 7 体：**全員正面の球体**で向きを持たない（中立）。受肉態・童子は発動 1〜2 回目でしか出ない（§3-A）

### 4-3. 敵 7 体（配信 art・PC は原画のまま／SP は反転）【実測・目視 ＋ Brief §1-1 の sharp 実測】

| 敵 | DIRECTION（原画） | PC での向き | LIGHT（high-key） | DEPTH | GROUNDING | POSE |
|---|---|---|---|---|---|---|
| 試練の影 | 正面 | 中立 | 0.10（暗い） | 平面・厚塗り、翼でシルエットは強い | 浮遊・影 0 | 静止（立ち） |
| 業斧の鬼将 | 左 | **神に背** | 0.08 | ドット復元・粒状 | 影 0 | 静止 |
| 藍花の怨霊 | 正面 | 中立 | 0.21 | 平面・髑髏の衛星 | 浮遊・影 0 | 静止（両手を広げる） |
| 銀甲の機工師 | 左 | **神に背** | 0.16（trim 0.48＝小さい） | 厚塗り・最も立体的 | 影 0 | 構え（照準） |
| 双牙の魔獣 | 正面〜やや右 | 中立〜神寄り | 0.16 | ドット復元 | 影 0 | **前傾（最も動的）** |
| 蒼海の龍神 | 左 | **神に背** | 0.21 | ドット復元・**水しぶきが焼き込み** | 原画の水＝舞台と二重 | 動的 |
| 乱舞の道化 | 左 | **神に背** | 0.12 | 厚塗り | 浮遊・影 0 | 動的（手を伸ばす） |
| 神 7 柱（参考） | 左 5／正面 2 | — | **0.41〜0.71** | Kit 線画セル・白フチ | 雲・袋に座る（焼き込み） | 1 枚絵 |

- **PC では 4/7 の敵が神に背を向けたまま**（SP は決定229 v2 で解消済み）
- 05「平面的・置いた絵に見える」：原因は解像度ではなく **(a) 明度＝敵は high-key 0.08〜0.21 vs 神 0.41〜0.71 で沈む (b) 接地影・床要素 0 (c) 画風が 4 系統**（Brief §1・判定 §1-1 ③【docs】）。CSS だけの接地影・リム・乗算は 6-D で「1 つの世界に達しない」【docs】、Living Background／Lighting Breath は Human QA FAIL（決定220〜222）【docs】
- 05 の LIGHT／DEPTH／GROUNDING／POSE／DIRECTION は **DIRECTION（PC）だけが CSS 1 規則で直る**。残り 4 軸は asset 側（Enemy Art Direction Brief v1 の受入 MUST：high-key ≥0.20・足元透明・主光左上・向き右）

---

## 5. Card Reaction Language Audit（`useBattleFx.ts`・`combatTimeline.ts`・`PlayerPanel.tsx`・`EnemyPanel.tsx`・`GodOtomoPanel.tsx`・`useBattleSound.ts`）【実測】

### 5-1. 現行：どのイベントで誰が反応するか

| カードの意味 | engine event | 神（立ち絵） | OTOMO | 敵（立ち絵） | 舞台 | HUD | 音 |
|---|---|---|---|---|---|---|---|
| ATTACK | `DAMAGE_DEALT(enemy)` | **突き**（god-strike／heavy） | — | **hit-stop・後退・斬撃・数字**（tier 1〜4） | tier4 で揺れ | HP ゴースト | hit_l1〜l4 |
| DEFENSE | `BLOCK_GAINED` | — | — | — | — | 盾バッジのパルス・トースト | block |
| HEAL | `HEALED` | — | — | — | — | HP バーのパルス | heal |
| DRAW／HAND | `CARD_DRAWN` | — | — | — | — | ミニ結果 | card_draw |
| BUFF | `BUFF_APPLIED(self)` | — | — | — | — | バッジ・ミニ結果 | — |
| DEBUFF | `BUFF_APPLIED(enemy)` | — | — | **—** | — | バッジ・ミニ結果 | — |
| RESONANCE | `RESONANCE_GAINED` | — | — | — | — | ゲージ | resonance_gain |
| GOD STRIKE | `RESONANCE_BURST` | **burst-strike** | **otomo-reacting** | tier4 | 揺れ 5px | カットイン | burst_ready → hit_l4 |
| ENEMY ULTIMATE | `ENEMY_ACTED(special)` | 被弾（多段・特大） | — | 突進・カットイン | — | 予告 tier | self_hit_heavy |
| 全カード共通 | `CARD_PLAYED` | 札が神の胸元へ飛ぶ（決定239） | — | — | 中央の閃光＝**type 別 6 画像（同じ形・色違い）** | — | card_play（0ms） |

- **キャラクターが反応するのは ATTACK と GOD STRIKE と敵の攻撃だけ**。60 枚中 attack 19＋oracle 3 以外の **38 枚は「HUD の数字が変わる」以上のことが画面で起きない**。03 は SUPPORTED
- 03 の根拠は「演出が少ない」ではなく「**反応の主語が HUD**」（RC3）

### 5-2. 6〜8 語彙の Reaction Language（設計ノート・実装なし）【AI 判断】

| # | 語彙 | 反応する者 | 既存イベントから引ける（core 変更 0） |
|---|---|---|---|
| 1 | ATTACK | 神 → 敵（現行） | ✅ |
| 2 | GUARD | **神が構える**（立ち絵の姿勢・盾の光を神の前に）。敵は無反応 | `BLOCK_GAINED` ✅ |
| 3 | HEAL | **神が息を吹き返す**（明度・上向きの光）＋ OTOMO が寄る | `HEALED` ✅ |
| 4 | DEBUFF | **敵がひるむ／沈む**（暗転・予告数字に打ち消し線） | `BUFF_APPLIED(enemy)` ✅ |
| 5 | BUFF／RESONANCE | 神のオーラ ＋ OTOMO の反応（既存 otomo-reacting の弱い版） | `BUFF_APPLIED(self)`／`RESONANCE_GAINED` ✅ |
| 6 | DRAW／HAND | OTOMO が札を差し出す（決定239 の逆向き移動を再利用） | `CARD_DRAWN` ✅ |
| 7 | ENEMY ULTIMATE | 敵 ＋ **神が身構える** ＋ 舞台の暗転 | `ENEMY_INTENT_SET(special)`／`ENEMY_ACTED` ✅（現行はカットインのみ） |
| 8 | GOD STRIKE | 神＋OTOMO＋敵＋舞台＋音＋（Voice 枠） | ✅ |

- 60 枚 60 種類は不要。**8 語彙で 60 枚すべてが「誰かが反応する」**状態にできる。UI・CSS のみ、決定224／226／229／232〜241 の保護ブロックと衝突しない置き方（末尾追記）が可能【推測：Preflight で確認】

---

## 6. Enemy Ultimate Feasibility

### 6-1. 現行 Intent Core が既に持つもの【実測】
- `charge`（予告 label・ダメージ 0）→ 次 R に `special`（名前つき・カットイン・`specialMul`）＝ **TELEGRAPH → RELEASE → IMPACT** の 2 段は実装済み（機工師 R4→R5）。**PREPARE／PLAYER COUNTER WINDOW ＝ 溜めのラウンドそのもの**（そこで盾・デバフ・回復・共鳴の仕込みができる）
- 不可条件（完全ランダム即死・Intent 非表示・不可視攻撃）は現行構造で **原理的に発生しない**（乱数 0・予告必須）

### 6-2. 7 役割 × 7 敵の mapping（仮・確定仕様ではない）【AI 判断】

| 役割 | 候補 | 既存 identity との整合 | core 変更 | リスク／前例 |
|---|---|---|---|---|
| 1 Heavy Strike | 業斧の鬼将 | 「重撃型」そのまま。R4 溜め→R5 必殺（内部 20 前後） | **なし**（`actions` の表のみ） | 機工師 K-C2 の手順を再利用 |
| 2 Escalation／Speed | 藍花の怨霊 | 「遅咲き型」。ただし現行の急伸（R6〜R7）は不可視 → **急伸を R4〜R5 へ前倒し**。または「祟り」＝ラウンドごとに強くなるデバフ | 前倒しなら **なし**／祟りなら **あり**（新 Effect） | RC1 と同根 |
| 3 Multi-hit | 双牙の魔獣 | 実装済み | なし | — |
| 4 Hand／Action Disruption | 乱舞の道化 | 「トリック型」。溜め→「手札 1 枚を裏返す／次 R の AP −1」 | **あり**（player 側の hand／AP に触る新 kind） | 決定216 の教訓：**「守る理由」だけでは判断が生まれない**。報酬（例：裏返された札を出すと共鳴 +）が要る |
| 5 Resonance Disruption | 蒼海の龍神 または 怨霊 | 「波が飲み込む」＝共鳴ゲージ −2 | **あり**（resonance を減らす新 Effect） | 決定217【docs】：スコアが防御的価値を評価しないため、対応方策が greedy に勝てない構造。Pilot 設計で報酬軸を同時に扱う |
| 6 Counter | 蒼海の龍神 | 「耐久型」。「その R に攻撃した分の 50% を返す」 | **あり** | 決定215／216 の「守りの姿勢」は runtime で NO-GO（EG1〜EG5 FAIL）。Counter は「攻撃しない理由」ではなく「小さく攻撃する理由」を作る点で異なるが、**同じ検証（実 runtime・paired seed）を通さないと GO にできない** |
| 7 Final Exam | 銀甲の機工師（現行の 2 段試験）／将来の ★5 | 試練の影（rank 1・入門）は Final Exam に不向き。`rank` 5 は Boss 予約【docs】 | なし | — |

- **前提条件：RC1**。R6〜R7 に置く必殺技は「発動率 0%」（K-A/K-B の前例）。7 敵の山場は **R3〜R5 の窓**に置く
- core 変更を伴う 4・5・6 は **決定213／216 と同じ「実 runtime paired-seed Gate」**（scratch の state 差し替え sim を単独根拠にしない・決定216 恒久教訓【docs】）が必要

---

## 7. Immersion Audit（Home／Entry）

### 7-1. 現状【実測】

| 段階 | 実装 | 動き |
|---|---|---|
| initial load | `App.tsx`：E1（決定193）で 3 秒 Home を見せる（チュートリアル自動表示は廃止） | なし（即表示） |
| Home hero | `HomeScreen.tsx`：`HOME_HERO_ART`（keyvisual-home）を `<img>` ＋ 右端・足元グラデ（`setup.css:2554-2576`） | **`setup.css` に `@keyframes` 0**（`polish.css`・`press.css`・`App.css` も 0）＝静止 |
| 背景 | `index.css`：`particle-drift 140s`・`star-twinkle 5s`・`magic-circle-spin 120s` の 3 本（app 全体の背景） | ある（超低速・気づきにくい） |
| audio | `bgm.ts`：home／battle の 2 トラック（HTMLAudioElement・volume 0.35・loop）。初回は gesture 後に再生 | — |
| transition into battle | `BossEntrance.tsx`：**1.5s（reduced 0.9s）**。舞台名→敵の絵→名前→脅威度★→type→START。`boss-entrance-*` keyframes 5 本・SE `boss_entrance` | あり。**skip 不可**（timer のみ）。PHASE6 benchmark §「タップで短縮」【docs】は未実装 |
| Victory | 決定226 Victory Reveal（Human QA 5/5） | あり |

- 04・14：**Home＝静止・入口の儀式＝なし**。戦闘入口は 1.5s のカードだけ。SUPPORTED

### 7-2. Entry Sequence 第一候補（設計ノート・実装なし）【AI 判断】

| 時間 | 段階 | 使う既存資産 | 実装 |
|---|---|---|---|
| 0.0〜0.4s | BLACK | — | body 背景の opacity |
| 0.4〜1.5s | 神域の気配／光 | `index.css` の粒子・魔法陣（既存）を fade-in・魔法陣は 1 回だけ速く回す | CSS |
| 1.5〜3.0s | God presence | `HOME_HERO_ART[heroGod]`（既存 hero 選定 `heroGod.ts`）を 1.06→1.0 に沈める＋左上リム | CSS `transform`／`opacity` のみ |
| 3.0〜3.8s | SEVEN GODS | `app-title` を字間から締める | CSS |
| 3.8〜4.5s | UI reveal | Home の Primary → Today → 記録 を 60ms 段差で立ち上げ | CSS |

- 要件：**first visit＝フル（≈4.5s）／revisit＝短縮（≈1.5s・sessionStorage）**・タップで skip・`prefers-reduced-motion` は crossfade のみ・**canonical art は無加工**（transform／opacity のみ・reduced-motion.ts 既存）・新規画像／動画 0・GPU 合成プロパティのみ（mobile）。H3／COV-M NO-GO（決定219〜223）【docs】を尊重し全面動画化はしない
- Boss Entrance にも同じ「skip」を足す（表示層のタイマー短縮のみ）

---

## 8. God Strike Voice Feasibility（設計・監査のみ）

| 項目 | 現状【実測】 | 実現性【AI 判断】 |
|---|---|---|
| SE 経路 | `sound.ts`：WebAudio `AudioBuffer`（wav・22.05kHz mono・`loadBuffer` で fetch→decode・gain ノード・master 0.85・30ms dedup）。20 音源すべて `scripts/gen-se.mjs` の数式合成（`SOUND_PREMIUM_PRE_AUDIT.md`【docs】） | Voice は **新 `SeName`（例 `voice_taiyo_burst`）を同じ経路に足すだけ**。1 本 ≤1.0s・wav ≈44KB（webm/opus なら ≈15KB だが SE 経路は wav 前提） |
| BGM 経路 | `bgm.ts`：HTMLAudioElement・`volume 0.35`・loop。ジングルは **BGM を pause** して再生→終了で resume | DUCK は `el.volume` のランプで PC／Android は可。**iOS Safari は HTMLMediaElement.volume を無視する（既知の制約【知識・要実機確認】）** → iPhone では (a) ジングルと同じ「pause→resume」型の DUCK か (b) BGM を WebAudio（`createMediaElementSource`）へ経路変更 が必要。(a) は決定233 で実機 QA 済みの経路 |
| タイミング | 神の一撃は `RESONANCE_BURST` → `burst_ready`（gain 0.65）→ `BURST_IMPACT_MS` に `hit_l4`（gain 1.0）。カットイン `BattleResonanceCutin` は keyvisual | TENSION＝既存 `burst_ready` の直後／BGM DUCK＝カットイン開始／SHORT VOICE＝カットイン中（≤1.0s）／RELEASE→IMPACT＝既存 `hit_l4`／BGM RETURN＝impact +300ms。**既存の `planBatch` の時刻に載るので Lane2 の時刻変更にも追従** |
| autoplay | 初回 gesture 後のみ再生（`retryOnNextUserGesture`） | 一撃は必ずカードタップの後＝制約なし |
| mute／設定 | `setSoundMuted`／`setBgmMuted` に一本化 | 同じ経路で mute される |
| bundle | SE 合計 337KB・BGM 20MB（mp3＋webm） | 7 神 × 1 本 ≈ 0.3MB（wav）。選択神だけ lazy-load なら初回 44KB |
| 権利 | `SGG-CREATOR-KIT-RIGHTS.md:75`：**音声は Kit の対象外・第三者権利は制作者が許可を取る**【docs】。Kit に音源 0 | **CEO 判断（§6-3 #5）**：キャラクターボイスの生成（AI 音声サービス）・収録・利用規約。外部サービス登録／有料は **#6**。AI は音声を生成しない |
| Pilot | 大耀 1 神・一撃時 1 本 | 技術 GO（条件：iOS の DUCK 方式を実機で確定・権利 CEO 確認）。効果の証拠は 0 → Human QA 必須 |

---

## 9. Thinking Time

| 事実【実測】 | 内容 |
|---|---|
| スコア | 経過時間の項目 **0**（`rules.ts score`・`score.ts`） |
| リプレイ／行動ログ | 時刻 **0**（`replay/types.ts`）。サーバー検証は行動列のみ |
| pause／background | engine は純関数・タイマー 0 → タブ切替で何も起きない（表示層の timer は演出のみ） |
| Daily | 1 日 3 回・同 seed・best-of-3【docs】 |
| Ranking spec | `RANKING_V1_AUDIT.md`：**同点同順位（1,1,3）・先着は順位に無関係**・同点圧縮率を監視指標に持つ【docs】。Ranking は dormant（起動しない） |

| 案 | 内容 | 評価【AI 判断】 |
|---|---|---|
| A 通常戦 無制限 | 現行 | **採用**。Primary Fun＝解く。時間で急かすと「読む」を殺す |
| B 競技のみ経過時間スコア | Daily のスコアに時間係数 | 不採用：スコア式・リプレイ検証・サーバー・プライバシー（時刻収集）の全部に触る。background-tab の扱いが決まらない |
| C 手番タイマー | 1 手 n 秒 | 不採用：SP の中断（通知・着信）で不利。UX 破壊 |
| D 総試合時計 | 1 戦 n 分 | 不採用（現時点）。solver／ログ共有対策として **将来の候補**にだけ残す（同点同順位で利得が消える設計が既にある） |

- 推奨：**A＋Ranking は無タイマー・同点同順位のまま**。「時間をかけられる人が有利」は同点で吸収され、Trigger（Daily 常連 evidence）到達前は Ranking 自体を起動しない（RANKING audit §13）。監視は「同点圧縮率」で足りる

---

## 10. 14 件の判定

凡例：Core＝`src/core`（engine／data／types）に触るか。Risk＝回帰リスク。Fix＝最小の信頼できる修正（実装ではない）

| # | Finding | Verdict | Evidence（要点） | Root Cause | Player Impact | Related | Core? | Risk | Smallest credible fix |
|---|---|---|---|---|---|---|---|---|---|
| 01 | Character Direction | **PARTIAL** | 才華の戦闘絵は中立〜弱い左（敵の方）。右向きの印象は keyvisual 系（Home／神選択／カットイン／勝利）と **笑蓮（右＝敵に背）**。PC では敵 4/7 が神に背（§4-2・4-3） | RC4（Kit の「左向き」慣習・keyvisual と front が鏡像の別ポーズ・PC 未反転） | 中（対峙感） | 02・05 | NO | 低 | ① PC にも決定229 v2 の反転 1 規則 ② 笑蓮・才華は Kit 正典のため反転しない。Kit の代替ポーズは正面で解決しない → Brief の「向き＝右」を敵側で担保 |
| 02 | Battle Confrontation | **SUPPORTED** | PC で敵 4/7 が背を向ける・接地影 0・敵 high-key 0.08〜0.21 vs 神 0.41〜0.71・キャラが反応するのは攻撃時だけ（§4・§5） | RC3＋RC4 | 高 | 01・03・05 | NO | 低（CSS）／中（asset） | PC 反転 Hotfix → Reaction Language v1 → Enemy Art Brief |
| 03 | Card Reaction Diversity | **SUPPORTED** | 反応の主語＝HUD。38/60 枚はキャラ無反応。閃光は type 別の同形 6 画像（§5-1） | RC3 | 高（毎手） | 02・07・13 | NO | 低〜中（CSS・既存イベントのみ） | Reaction Language v1（8 語彙・UI のみ） |
| 04 | Home／Entry Motion | **SUPPORTED** | `setup.css` keyframes 0・hero は静止 img・BossEntrance 1.5s skip 不可（§7-1） | RC5 | 中（第一印象） | 14・07 | NO | 低 | Entry Sequence v1（CSS・skip・reduced） |
| 05 | Enemy Depth | **SUPPORTED** | Brief §1-1：low-key・接地 0・画風 4 系統・CSS 案は 6-D／220〜222 で FAIL（§4-3） | RC4（asset） | 高 | 01・02 | NO | 中（asset 差替え・rollback は `art` 1 行） | Brief v1 の HOLD 解除＋受入に「向き右・high-key ≥0.20・足元透明」（既に MUST）を維持 |
| 06 | HP／Damage Scale | **PARTIAL** | 敵 HP は神の 2.8〜3.4×、R1 の一撃は HP の 10〜20%、最大は 50〜80% だが到達 2〜29%。受ける合計は HP の 48%（§3-E） | **RC1**（山場に届く前に決着） | 中 | 09・13 | NO（数値のみ） | 中 | 表示スケールは変えない。山場を R3〜R5 へ（RC1 Preflight）。必要なら「敵の一撃／神 HP」比の表示補助は別途 |
| 07 | God Strike Voice | **INSUFFICIENT** | 効果の証拠 0。技術は GO 条件付き（iOS DUCK・権利）（§8） | RC3／RC5 の延長 | 中（推測） | 03・14 | NO | 低（音） | 大耀 1 本 Pilot（権利 CEO 確認後） |
| 08 | Thinking Time | **REFUTED（現時点）** | 時間はどこにも記録・評価されない。Ranking は dormant・同点同順位（§9） | — | 低（将来） | — | NO | — | A＋無タイマー。同点圧縮率を監視 |
| 09 | Late-game Tension／Oracle Scarcity | **SUPPORTED** | 敗北 0／R5 撃破 71%／R6 到達 29%／敵実効ダメージ R4 以降 1.8→0.0／託宣 7 回・70% を R1〜R3 で天啓に消費（§3-A・3-D） | **RC1** | 最高 | 06・10・11・12・13 | **YES（数値のみ：`rules.ts divination.count`・`enemies.ts actions`）** | 中（balance） | 託宣 1 戦 2〜3 回＋山場前倒し（Preflight sim で 1 案） |
| 10 | Draw／Solve Diversity | **SUPPORTED**（ふつう）／PARTIAL（むずかしい） | 49/49 セル 100%・reader＝naive の seed 39/49 セル・dead-card 27.8%・使われない札 7 種（§3-B・§2-B） | RC1＋RC2 | 高 | 09・11 | YES（数値）／NO | 中 | RC1 の後に、機工師・魔獣型の「手札で解き方が変わる」状態を他 5 体へ（RC2） |
| 11 | Enemy Threat Diversity | **SUPPORTED** | 4/7 が attack のみ・プロファイル距離平均 0.15・加護率 0〜3.8%・差は被ダメージ量だけ（§2-C・§3-C） | RC2（＋RC1） | 高 | 10・13 | YES | 中〜高 | 7 敵の山場を R3〜R5 に置き、まず data-only（表）で 3 体（鬼将・怨霊・道化）を差別化 |
| 12 | Oracle Readability | **PARTIAL** | 名称は抽象（加護／導き／天啓）だが効果文＋加護の実数プレビューは実装済み。SP の低い画面で効果文が畳まれる【要確認】。**加護が 1% しか選ばれない＝役割が体験されない**のが本体（§2-E・§3-D） | RC1（＋UI） | 中 | 09 | NO | 低 | RC1 Pilot に同梱：回数制限後に名称へ役割語（例「盾の託宣」）と 1 語の副題 |
| 13 | Enemy Attack Monotony／Ultimate | **SUPPORTED** | Intent は正確・4 体 attack のみ・必殺は 2 体（§2-C・§6） | RC2（前提 RC1） | 高 | 09・11・03 | YES（役割 4〜6）／NO（1・2・7） | 高（決定216 前例） | RC1 → data-only 必殺 3 体 → core を伴う役割は runtime paired-seed Gate |
| 14 | Game Entry Immersion | **SUPPORTED** | 04 と同じ。世界へ入る儀式は BossEntrance 1.5s のみ（§7） | RC5 | 中 | 04・07 | NO | 低 | Entry Sequence v1 |

---

## 11. Cross-Finding Root Cause と優先順位

### 11-1. 5 つの Root Cause

| RC | 名称 | 症状 | 一言の証拠 |
|---|---|---|---|
| **RC1** | 決着が敵のクライマックスより早い（Pacing／Oracle abundance） | 06・09・10・11・12・13 | R5 撃破 71%・敗北 0・託宣 7 回・K-C2「R7 配置は発動率 0%」 |
| **RC2** | 敵の語彙が 4 種・4 体は数字だけ | 10・11・13 | attack-only 4/7・プロファイル距離 0.15・決定214 |
| **RC3** | 反応の主語が HUD でキャラではない | 02・03・07 | 38/60 枚でキャラ無反応・閃光は同形 6 画像 |
| **RC4** | 原画の向き・接地・明度・画風が舞台と揃っていない | 01・02・05 | PC 敵 4/7 が背・high-key 0.08〜0.21・接地 0・画風 4 系統 |
| **RC5** | 入口の儀式がない | 04・14・07 | Home keyframes 0・BossEntrance 1.5s のみ |
| — | 08 は欠陥ではない（方針 A） | 08 | 時間は未使用・同点同順位 |

### 11-2. 優先順位（Impact × North Star × Evidence × Risk × Reversibility）【AI 判断】

| 群 | 項目 | Impact | North Star | Evidence | Risk | Reversible | 依存 |
|---|---|---|---|---|---|---|---|
| **P0** | RC1 Combat Tension v1（託宣 2〜3 回／戦・山場を R3〜R5 へ。`rules.ts`・`enemies.ts` の数値のみ） | 最高 | **Primary Fun＝解く に直結** | 最強（47,040 試合＋balanceSim＋CEO 体感＋決定57） | 中 | 高（数値 2 箇所・gameVersion 指紋が自動で上がる） | なし。**Preflight sim → CEO GO → 実装** |
| **P0（Hotfix）** | PC でも敵の絵を反転（決定229 v2 の 1 規則を ≥900px へ・`--atk-x` 打消し込み） | 中 | Game Feel | 強（画像・CSS） | 低 | 高 | なし。Fast Gate |
| **P1** | RC3 Card Reaction Language v1（8 語彙・UI のみ） | 高 | Game Feel／Support Fun | 強（コード） | 低〜中 | 高（CSS 末尾追記） | RC2 の「ENEMY ULTIMATE」語彙は RC2 後に足す |
| **P1** | RC2 Enemy Ultimate（まず data-only 3 体 → core 役割は runtime Gate） | 高 | 解く／組む | 強 | 高（決定216） | 中 | **RC1 が前提**（山場の窓） |
| **P1** | RC4 Enemy Art Direction Brief v1 の HOLD 解除（受入 MUST 維持・PC 向きは Hotfix 側で担保） | 高 | Game Feel | 強（Brief 実測） | 中 | 高（`art` 1 行） | CEO 生成・権利台帳（既存手順） |
| **P2** | RC5 Entry Sequence v1（CSS・skip・reduced・first/revisit） | 中 | Retention／第一印象 | 強（現状 0） | 低 | 高 | なし |
| **P2** | God Strike Voice Pilot（大耀 1 本） | 中（推測） | Game Feel | 弱 | 低 | 高 | **権利・生成は CEO §6-3 #5／#6**・iOS DUCK 実機確認 |
| **P2** | 12 の名称・副題 | 低〜中 | UX | 中 | 低 | 高 | RC1 の後 |
| 監視 | 08 同点圧縮率 | 低 | — | — | — | — | Ranking Trigger |

- **依存の要点**：RC2（敵必殺）と 06（数字の重さ）は RC1 なしでは効かない（R6〜R7 は見えない）。RC3 の「ENEMY ULTIMATE」語彙は RC2 の後。RC4・RC5 は独立レーンで並走できる（3 レーン運用に適合）

### 11-3. RC1 Preflight で比較する案（次 Decision の入力・本書では決めない）
1. 託宣 **7→3／戦**（`rules.ts divination.count`。神階は 4→2 or 3 を別途）
2. 7 敵の **山場を R3〜R5 の窓**に置く（`enemies.ts actions` の表のみ：鬼将 R4 溜め→R5 必殺、怨霊の急伸を R4〜R5 へ、道化の 2 回目の溜めを R5→R6 から R4→R5 へ 等）
3. （必要なら）神 HP／敵 HP／AP 表は動かさない（決定36・57・126 の検証を無効化しないため最後の手段）
- 受入帯【AI 判断・§11 Target Experience から】：Easy＝naive ≥95%／Normal＝**naive の敗北 ≥15%・reader 85〜95%**／Hard＝**reader 60〜75%**・7 神とも 40% を下回らない・未撃破（finished）≤10%
- Gate：paired-seed（決定216 恒久教訓：**実 runtime**）・`balanceSim.test.ts`・golden 更新は「仕様更新」として記録

---

## 12. CEO 判断が必要になる事項（§6-3 該当のみ・本監査では判断しない）

| # | 事項 | 該当 | AI 推奨 |
|---|---|---|---|
| 1 | RC1 の実装 Phase 開始（託宣回数・敵表＝根本コンセプトではないが §6-5「Phase 開始前」に該当） | §6-5 | Preflight の結果を見て **承認** |
| 2 | God Strike Voice の権利・生成サービス | #5・#6 | 権利整理まで Pilot は保留 |
| 3 | 敵 7 体アートの生成着手（Brief HOLD 解除） | 既存の CEO 生成フロー | 本監査の受入 3 条件を Brief に反映後、解除 |

---

## 13. 実装しなかったこと・触っていないこと
- 実装・画像生成・音声生成・敵 7 体アート生成・Production 変更・merge／push／deploy：**すべて 0**
- 決定229 の SP 反転・決定240 の構え・決定213 の OTOMO 構え：評価はしたが変更していない
- 本 worktree の未 commit 変更（`src/components/battle/*` の決定224 Pilot 差分）は **本監査の前から存在**し、本監査は 1 バイトも触っていない（§15）

---

## 14. Deliverables
1. 本書 `docs/PRACTICAL_QA_2026-09-28_AUDIT.md`
2. `docs/evidence/decision244/`：`simulation-47040-games.md`・`card-table-60-and-recommended-decks.md`・`balanceSim-crosscheck.md`・`harness.d244.audit.test.ts.txt`（scratch で実行した harness の原文。repo の test には入れていない）
3. `docs/DECISIONS.md` に決定244（Audit 開始／結果）を **追記のみ**

## 15. runtime 変更 0 の証明（監査終了時に実行）
- `git status --porcelain` を監査前後で比較：**増えたのは `docs/PRACTICAL_QA_2026-09-28_AUDIT.md` と `docs/evidence/decision244/` のみ**、`docs/DECISIONS.md` は追記（既存行の変更 0）
- `src/core/data/rules.ts`・`enemies.ts`・`divination.ts` の md5 が監査前後で同一
- `git diff --stat -- src public` が監査前後で同一（決定224 Pilot の既存差分のみ）
- 結果は末尾「§15 実行ログ」に転記

### §15 実行ログ
- 実行：2026-09-28（監査完了時・worktree `C:/Users/kimi1/SevenGodsGame`・branch `feat/d224-premium-payoff-pilot`・HEAD `43c10a4`）
- `git status --porcelain` 前後 diff：追加は `?? docs/PRACTICAL_QA_2026-09-28_AUDIT.md` と `?? docs/evidence/` の 2 行のみ（1,872 行 → 1,874 行）
- `docs/DECISIONS.md`：HEAD 比 numstat **63 追加／0 削除**（監査前 62 追加＝決定219〜243 の未 commit 追記・本監査で決定244 の **1 行を末尾へ追記**。既存行の変更 0・`grep -c "^-|"` ＝ 0）
- md5（`src/core/data/rules.ts`・`enemies.ts`・`divination.ts`）：監査前後で **OK（同一）**
- `git diff --stat -- src public`：**10 files / +277 / −13** ＝ 監査前から存在する決定224 Pilot の未 commit 差分のみ（監査前の全体 12 files の内訳＝src 10 ＋ docs 2）。本監査による src／public の変更 **0**
- simulation は scratch（`git archive d1e3b30` の写し）で実行し、repo の test／scripts には追加していない。harness は `docs/evidence/decision244/harness.d244.audit.test.ts.txt` に原文のみ保存
- merge／push／deploy／commit：**0**
