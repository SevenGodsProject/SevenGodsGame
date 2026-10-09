# 将軍家（SHOGUNATE）敵陣営 設計 v1 — 公式 10 体の整理・新しい攻略判断・最初の 1 体

- 日付：2026-10-09
- 区分：**AI 判断（CLAUDE.md §6-2）・docs-only・runtime 変更 0・Lane 3**
- 基点：integ `master` `6c8b226`（clean checkout `SevenGodsGame-shogunate`）
- ペルソナ：Planner（Game Planner）
- 前提：本書は **設計書のみ**。runtime 実装・素材ダウンロード・Rights Ledger への記入・Decision 番号の付与は本書の範囲外。権利の可否認定は行わない（§6-3 #5 は CEO）
- 入力：`docs/CREATOR_KIT_V1_1_AUDIT.md` §3／§5、`src/core/data/enemies.ts`、`src/core/types/enemy.ts`、`src/core/data/dailyBoss.ts`、`src/core/data/rules.ts`、`src/core/engine/round.ts`、`docs/DECISIONS.md`（決定215〜217・244・252・255・263・7R 恒久方針）、`docs/PRACTICAL_QA_2026-09-28_AUDIT.md` §2-C／§3-C／§6／§11

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 最初の 1 体 | **将軍四天王・忠次（軍師）**。FRONT＋BACK 両スロットあり・役割「軍師」が新メカニクスに最も正直に写る |
| 新メカニクス | **軍略（`tactic`：条件分岐 Intent）**＝「R4 の行動が、R4 開始時の敵 HP で分岐する」。乱数 0・予告は従来どおり 1 手先・正解表示なし・敵ブロックなし・save v9 不変 |
| 生まれる判断 | 「R3 までに敵を半分以下まで追い込む（攻め切る／天啓を R3 に使う）か、追い込めないと見て R4 の総攻めに備える（加護・盾を残す）か」＝ **期限つきの『仕込んでから撃つ』**（決定217 P-B／P-D の延長） |
| NEXT ACTION | **「将軍家 Pilot v1 Preflight（忠次）」を docs＋決定論 simulation のみで起票**（§7） |
| 既存 7 体 | **置き換え・改変は一切しない**（§5-4） |

---

## 1. 公式 10 体の特徴整理

出典：`docs/CREATOR_KIT_V1_1_AUDIT.md` §3-1（将軍家 manifest `kitId sgg-creator-kit-shogunate`・`kitVersion 1.0.0`・`releasedAt 2026-10-08`・10 体／16 枚・WEBP 1600×1600）。manifest の `assetId` 文字列は監査書に転記されていないため **本書では記載しない**（Pilot 時に manifest から転記。神の例：`ebisu-taimaru:GOD_MAIN` 形式）。「役割」「公式プロフィール」は監査書 §3-1 の 1 行要約のみを根拠とし、それ以上の設定は作らない。

| # | 名 | 役割（公式プロフィール要約・監査 §3-1） | 2D スロット | 役割から自然に導ける gameplay archetype（AI 判断） |
|---|---|---|---|---|
| 1 | 康虎 | 17 代将軍・独裁者 | FRONT＋BACK | **最終ボス ★5**（`rank` 5 は Boss 予約・`enemy.ts:87-92`）。全語彙の複合 |
| 2 | 忠勝 | 将軍四天王・最強の盾 | FRONT＋BACK | 盾＝「反撃」型（敵ブロックは決定216 で NO-GO のため **守りではなく返す**） |
| 3 | 直政 | 将軍四天王・好戦 | FRONT＋BACK | 重撃／連撃（既存 鬼将・魔獣の語彙で表現可） |
| 4 | 忠次 | 将軍四天王・軍師 | FRONT＋BACK | **条件分岐 Intent（軍略）**＝戦況を読んで手を変える |
| 5 | 康政 | 将軍四天王・文化人の指揮官 | FRONT＋BACK | 指揮＝軍略の変種（条件を「共鳴ゲージ」に取る等）。陣形（多体）は v1.1 では扱わない |
| 6 | 鬼半蔵 | 忍者衆「影」の頭領 | FRONT＋BACK | 特殊枠：封じ＋連撃の複合（★4） |
| 7 | 影 | 忍者衆 | MAIN のみ | 手札干渉（封じ）・中位 |
| 8 | くノ一 | 忍者衆 | MAIN のみ | 手札干渉（封じ）の軽量版・連撃寄り・入門〜中位 |
| 9 | ドーマン | 元陰陽寮の科学者 | FRONT のみ | 特殊枠：共鳴／託宣への干渉（決定217 の報酬問題を先に解く必要あり） |
| 10 | 岡っ引き | 捕り方 | MAIN のみ | **入門 ★1**（attack のみ・数値で個性） |

- 四天王 4 名と「最強の盾／好戦／軍師／文化人の指揮官」の対応は監査 §3-1 の列挙順で読んだもの。**Pilot 着手時に manifest の各 profile 本文で再確認する**（順序違いなら本書 §4 の人選のみ差し替え。メカニクス設計は不変）
- ボイス：将軍家は公式ボイス **無し**（監査 §3-1「OTOMO and SHOGUNATE have none」）。口調本文も配布対象外（規約 新 §7）→ 本書の battleCries は **すべて非公式のファン創作文**

---

## 2. 既存 7 敵との比較 — 何が既にあり、何が無いか

### 2-1. 既存 7 体の identity（`src/core/data/enemies.ts` 実表・決定252 で確定）

| 敵 | HP | 7R 行動（内部値） | 語彙 | identity | rank |
|---|---|---|---|---|---|
| 試練の影 | 103 | 5/8/11/15/13/9/6 | attack | 入門（数値のみ）`enemies.ts:72-78` | 1 |
| 業斧の鬼将 | 94 | 5/9/溜/必殺 26/15/11/7 | attack＋charge＋special | 受け切る `enemies.ts:116-122` | 2 |
| 藍花の怨霊 | 95 | 3/6/13/必殺 23/18/9/4 | attack＋special | 温存して峰を受ける `enemies.ts:150-158` | 3 |
| 銀甲の機工師 | 100 | 6/溜/22/⚠溜/必殺 24/7/9 | attack＋charge×2＋special | 二段 telegraph `enemies.ts:190-196` | 4 |
| 双牙の魔獣 | 85 | 連撃 全 R・R3 必殺 4×3 | multiAttack | 速攻・連撃 `enemies.ts:230-237` | 2 |
| 蒼海の龍神 | 103 | 4/7/12/必殺 20/16/9/5 | attack＋special | 耐久（決定216 の守り Pilot は NO-GO） `enemies.ts:265-272` | 3 |
| 乱舞の道化 | 92 | 4/⚠溜/必殺 24/9/溜/19/9 | attack＋charge×2＋special | 開幕必殺＝託宣を先に切る `enemies.ts:303-309` | 4 |

### 2-2. カバー済み／未カバーの archetype

| archetype | 状態 | 根拠 |
|---|---|---|
| 入門・重撃・遅咲き・溜め・連撃・耐久・トリック | **カバー済み** | 上表 typeLabel 7 種 |
| 名前つき必殺（Ultimate）＋予兆（charge） | **カバー済み・LIVE** | 決定252（Production `76a67a8`） |
| 峰の位置・高さ・谷で作る「問題の形」 | **カバー済み・CLOSED** | 決定252「Threat vocabulary：既存 4 kind × 峰 × 名前で 7 問題を作れる」 |
| 敵の守り（block／guard） | **却下・再開しない** | 決定216 NO-GO「敵が守っていること自体は攻撃しない理由にならない」 |
| 敵の自己回復／break／自己強化 | **却下** | 決定252「新 mechanic 3 案は emulation で全て棄却（読まない側を楽にする・未撃破 3 倍・効果 <1pt）」 |
| 未来 Threat の常時可視化（7R の形） | **却下・CLOSED** | 決定263 CEO Human QA Q3 YES「正解を教えられている感覚」→ NO-GO・再開しない |
| R6〜R7 延命のための HP／ATK／AP／新 mechanic | **禁止（恒久）** | 決定 2026-10-07「7R は上限。実質的クライマックス R4〜R5 を尊重する」 |
| **条件分岐・適応 Intent**（敵が戦況で手を変える） | **未カバー** | 4 kind は「敵がどう殴るか」のみ（決定215）。7 体すべて state 非依存の固定表（`round.ts:70` `actionForRound(enemyDef.actions, state.round)`） |
| **資源干渉**（手札・AP・共鳴への干渉） | **未カバー** | 「差別化に使える機構（デバフ・ブロック・手札干渉・共鳴干渉）は敵側に 0」（Practical QA §2-C） |
| **反撃**（与えた分を返す） | **未カバー・仮案のみ** | Practical QA §6-2 role 6（龍神案）。runtime paired-seed Gate が必須と注記 |
| **陣形・多体戦** | **未カバー・高コスト** | `EnemyState` は単体（`enemy.ts:98-108`）。v1.1 対象外 |
| **Boss tier ★5** | **予約枠のみ** | `enemies.test.ts:41-47`（rank 1〜4 を保証・★5 は将来 Boss） |

### 2-3. 「敵の差が薄い」の実測（追加の根拠）

- 決定244：4/7 が attack のみ・8 次元プレイプロファイル距離 平均 0.15・別の解き方を要求するのは機工師・魔獣の 2 体だけ（Practical QA §3-C）
- 決定255 CLOSED：カード数値・`rules.ts` 係数の探索では「盾＋加護」以外の答えを通常／Hard に作れない → **答えの分岐は敵側の語彙でしか作れない**
- 監査 `CREATOR_KIT_V1_1_AUDIT.md` §3-2：「語彙を足さずに 10 体を追加しても『敵の差が薄い』が再現する」→ 将軍家は **新語彙 1 つとセットで** 導入する

---

## 3. 新しい攻略判断の設計 — 候補 3 案

共通の不変条件（全案で満たす）：
乱数 0（seed 以外）／予告は当該 R の 1 手先（決定4）／正解・推奨行動の表示なし（決定263）／敵ブロック・守りの姿勢なし（決定216）／7R 上限・R6〜R7 延命目的でない（恒久方針）／`src/core` に React・Phaser を持ち込まない／数値は `rules.ts` に集約／`Math.random` 不使用。

### 3-1. 候補 A：軍略（`tactic`）— 条件分岐 Intent【推奨】

| 項目 | 内容 |
|---|---|
| 定義 | `EnemyActionDef` に `{ kind: 'tactic'; label: string; cond: { type: 'enemyHpRatioAtMost'; ratio: number }; then: EnemyActionDef; else: EnemyActionDef }` を追加。`nextEnemyAction`（`round.ts:70-88`）が **ラウンド開始時の `state.enemy.hp / maxHp`** で then／else を **確定の action へ解決してから** 倍率をかける。`EnemyState.intent` に入るのは解決後の attack／special だけ（既存 4 kind のまま） |
| 生まれる判断 | 「R4 開始までに敵を一定割合以下へ追い込めば R4 は軽い手、追い込めなければ名前つき総攻め」。R1〜R3 で **攻め切る（順番を組む・天啓を R3 に使う）か、間に合わないと読んで R4 に備える（加護・盾を残す）か**。決定217 の「仕込んでから撃つ」に **期限** を与え、託宣 3 択に「天啓＝攻め切る／加護＝受け切る」の二者択一を作る |
| 既存原則との整合 | 読みの報酬が **攻撃側に乗る**（決定217 P-B：成功例は読みの報酬を攻撃に変換していた）／「1 手の選択」ではなく **順番づけ**（P-D）／峰は R4（決定246・7R 方針）／予告は 1 手先のまま（R3 の `charge` ラベルで「次 R は戦況で手が変わる」と告げるだけ。未来の数値は出さない） |
| core 変更見積（S〜M） | `types/enemy.ts` 1 variant／`round.ts` `nextEnemyAction` に解決 6〜10 行／`intent.ts` `enemyActionTotal` に `tactic → 0`（解決前の表を読む UI 用の保険）／`enemyActionLabel` 1 行／`rules.ts` に `enemy.tactic`（ratio 既定値）／`enemies.ts` に 1 体追加。**UI 変更 0**（intent は既存 kind） |
| save／replay | `EnemyState.intent` の取りうる形は不変 → **save v9 不変**（`rules.ts` saveVersion）。`ENEMIES` 追加で `gameVersion.ts:73` の `dataFingerprint` が変わる（golden 更新・Ranking は決定256 で NO-GO のため実害なし）。**注意**：`pickEnemyId(seed)` が `hash % ENEMIES.length`（`enemies.ts:329-335`）のため、`ENEMIES` へ直接追加すると**既存 seed の敵が変わる** → §5-3 の分離が必須 |
| 一択化リスク | ①閾値が緩いと全員が then（軽い手）＝分岐が無い ②厳しいと全員が else＝「R4 必殺」の既存型と同じ。**対策**：ratio を sim で「reader の分岐率 35〜65%・神ごとに偏り ±20pt 以内」に調整。then 側を 0 にしない（追い込んでも殴られる）ことで「追い込み＝無敵」を防ぐ |
| 検証（決定論 balanceSim） | 既存 harness（`balanceSim.test.ts` の `playOneGame`／`summarizeWinRate`・決定252 式 paired-seed）に方策 `raceAware`（R3 に天啓で閾値越えを狙う）を追加。Gate 案：G1 分岐率 35〜65%（reader・通常）／G2 reader − naive ≥ 10pt（既存 5 体と同水準）／G3 score：raceAware ≥ greedy（決定217 の構造問題を越える）／G4 未撃破 ±1pt／G5 決定58・126・DAILY-01 の既存 gate（`ENEMIES` を回すため自動適用）／G6 既存 7 体の 49 セル **Δ0.00**（既存表に触れない証明） |

### 3-2. 候補 B：封じ（`seal`）— 手札干渉（資源干渉）

| 項目 | 内容 |
|---|---|
| 定義 | `{ kind: 'attack'; amount; seal: 1 }`：攻撃解決後、**手札の最大コスト札 1 枚（同値は左端）** を次 R だけ使用不可にする。選択は決定論（乱数なし）・予告に「封じ」を明記 |
| 生まれる判断 | 「封じられる前にその札を今出す（AP を割く）か、封じを受け入れて別の札を残すか」＝手札の順番づけ（P-D）。忍者衆（影・くノ一・鬼半蔵）の役割に正直 |
| core 変更見積（M〜L） | `GameState.hand` に封印状態（`sealedCardIndex` または `hand[i].sealed`）→ `playCard.ts` ガード・`endRound`／`startRound` で解除・`createInitialState`・**save v10**・replay golden・`CardView` に封印表示・`formatEnemyIntent` 文言・`enemyActionTotal` は amount のみ |
| save／replay | **save v9 → v10**（state 構造が変わる）＋ migration。gameVersion hash 変更 |
| 一択化リスク | 「最大コスト札を毎回先に出す」で固定化しやすい。守る理由だけでは判断が生まれない（決定244 §6-2 role 4・決定216 教訓）→ 封じを受けた札に報酬を付ける（例：解除後に出すと共鳴 +1）設計が要るが、新 Effect が増える。**資源を奪う体験は「AP 削減」に近く恒久方針と誤認されやすい** |
| 検証 | 同 harness。G：封じ回避率 30〜70%／reader − naive ≥ 10pt／封じ 0 の対照との score 差で「報酬が攻撃側にあるか」を確認 |

### 3-3. 候補 C：反撃の盾（`counter`）— 与えた分を返す

| 項目 | 内容 |
|---|---|
| 定義 | `{ kind: 'counter'; amount; ratio }`：その R の通常攻撃 `amount` に加え、**その R にプレイヤーが与えた実効ダメージ × ratio（切り捨て）** を敵ターンで追加して返す。`state.mastery.roundDamage`（`round.ts:117` で R ごとにリセット）が既にあるため追跡用 state は不要 |
| 生まれる判断 | 「反撃 R は小さく殴る（support／resonance／hinder で仕込む）か、反撃を受けてでも殴り切るか」。決定255 の「答えが盾＋加護一択」に対し、**攻撃以外の札を使う R** を作る |
| core 変更見積（M） | `types/enemy.ts` 1 variant／`round.ts` `runEnemyTurn` に加算 1 ブロック／`enemyActionTotal` は amount のみ（反撃分は予告に「＋与えた分の半分」と文言で出す）／UI 文言 |
| save／replay | intent の形が増える → v7 と同じ理由で **save v10**（`rules.ts` saveVersion コメント：旧版は新 intent を読めない） |
| 一択化リスク | **高い**。「反撃 R は殴らない」が唯一解になりやすく、決定216 の「攻撃しない理由では判断が生まれない」と同じ構造に落ちる危険。決定217 P-A（防御的な判断は greedy に勝てない）。テンポ損失が撃破を R6 側へ押す（7R 方針と逆行）。反撃 R を R2〜R3 に置けば緩和されるが、Pilot Gate 通過の見込みは A より低い |
| 検証 | 同 harness。G：反撃 R に攻撃札 0 枚の方策 vs 殴り切る方策の score 差が ±3pt 以内（どちらも成立）／reader − naive ≥ 10pt／撃破 R の中央値 +0.3R 以内 |

### 3-4. 3 案の比較（AI 判断）

| 軸 | A 軍略 | B 封じ | C 反撃 |
|---|---|---|---|
| 新しさ（既存 7 体・却下済み案との距離） | ◎ 適応 Intent は 0 | ◎ 資源干渉は 0 | △ 決定216／217 の構造に近い |
| 読みの報酬が攻撃に乗る（決定217） | ◎ | △ 報酬設計が別途必要 | ✗ |
| 「解く」を侵食しない（決定263） | ◎ 1 手先のまま | ○ | ○ |
| 7R 方針（R4〜R5 尊重・延命しない） | ◎ 峰 R4 | ○ | △ テンポ損 |
| core コスト／save | ◎ S〜M・v9 不変・UI 0 | ✗ M〜L・v10・UI あり | △ M・v10 |
| 一択化リスク | △（閾値調整で制御可） | △ | ✗ |
| 役割への正直さ | ◎ 軍師 | ◎ 忍者 | ○ 盾（守りではなく返す、という翻訳が要る） |

**A を採用。** B は v1.1.1（影・くノ一）で報酬設計とセットに、C は Preflight で A の Gate が通った後に「反撃 R を R2〜R3 に置く」条件で再評価する。

---

## 4. 最初の 1 体の選定

### 4-1. 採点（各軸 0〜10・重みは決定 2026-10-07「次にゲームを最も面白くする 1 件」の配分に準拠：Primary Fun 高・コスト／Regression 中）

| 候補 | Player Value ×3 | Strategic Depth ×2 | Game Feel ×1 | Rights ×1 | Impl. Cost ×2 | Regression Risk ×2 | 独自性 ×1 | **合計／120** |
|---|---|---|---|---|---|---|---|---|
| **忠次（軍略）** | 8 | 9 | 7 | 9 | 8 | 8 | 9 | **100** |
| 影（封じ） | 7 | 8 | 7 | 8（MAIN 1 枚） | 5 | 5 | 9 | 80 |
| 忠勝（反撃） | 6 | 6 | 7 | 9 | 6 | 5 | 6 | 73 |
| 岡っ引き（入門・attack のみ） | 4 | 2 | 5 | 8 | 10 | 9 | 2 | 65 |
| 康虎（★5 Boss） | 9 | 8 | 9 | 9 | 3 | 3 | 8 | 76 |

敗因：影＝save v10・UI 変更・報酬設計が未解決で第 1 弾の Regression が大きい／忠勝＝決定216・217 の構造に最も近く Gate 通過の見込みが低い／岡っ引き＝新語彙 0 で「敵の差が薄い」を 8 体目として再現する（監査 §3-2）／康虎＝全語彙が揃ってから（★5 の test 更新・Daily 除外・HP 設計が先行作業に依存）。

### 4-2. 忠次 ドラフト（数値は Preflight sim で調整前提。**名前・技名・台詞は非公式のファン創作**）

| 項目 | ドラフト |
|---|---|
| id | `enemy_08`（`ENEMY_IDS.tadatsugu` 仮。§5-3 の分離配列に置く） |
| name（表示） | 「軍略の忠次」（仮・非公式の二つ名。公式名「忠次」＋役割語。Pilot で manifest の表記に合わせる） |
| maxHp | **98**（鬼将 94〜龍神 103 の中間。then 分岐の閾値計算を切りの良い 49 にする） |
| rank | **3**（四天王＝中〜高位。★4 は機工師・道化の二段読みと同格扱いにしない） |
| typeLabel | 「軍略型」 |
| typeDescription | 「R4、こちらの傷が浅ければ総攻め。R3 までに追い込め。」（既存の「R4を受け切れ」「託宣を先に切れ」と同じ命令形・同じ長さ） |
| visualType | `standard` |
| stage | nameJa「軍議の本陣」・accent `#8c6d1f`（金茶：将軍家の格と軍師の落ち着き。既存 7 色と非重複）・bg `/assets/backgrounds/stages/08-shogunate-camp.webp`（**新規生成が必要**：`enemies.test.ts:67-76` が敵ごとに一意の stage bg を要求。生成は CEO 生成＝§6-3 #5／#6 のため Preflight で手段を確定） |
| art | `/assets/enemies/tadatsugu/art.webp`（Kit FRONT 1600² → 512² webp・§6-3） |

7R 行動表（内部値。表示は ×10）：

| R | kind | 値 | 文言（予告） | 意図 |
|---|---|---|---|---|
| 1 | attack | 5 | — | 試練の影と同じ入り（読みの導入） |
| 2 | attack | 9 | — | 鬼将 R2 と同値 |
| 3 | charge | 0 | 「戦況を読んでいる…」 | 次 R が分岐することの 1 手先予告（数値・分岐先の値は出さない） |
| 4 | **tactic** | then：attack **12**／else：special **24**「軍略・総攻め」 | cond：R4 開始時 敵 HP ≤ **50%**（`ratio 0.5` → 49 以下） | 追い込めば軽い手、追い込めなければ名前つき必殺（決定252 と同じカットイン・倍率 `specialMul`・cap は Preflight で決定） |
| 5 | attack | 15 | — | 二番目の峰（決定246 の形） |
| 6 | attack | 10 | — | 減衰 |
| 7 | attack | 6 | — | 減衰 |

- 7R 合計：then 57／else 69（既存 65〜77 の帯の下端〜中央。then を鬼将 73 より明確に軽くし「追い込みの報酬」を体感させる）
- 閾値 0.5 は初期値。Preflight で 0.45／0.50／0.55 を paired-seed で比較し、reader 分岐率 35〜65% を満たす値を `rules.ts` `enemy.tactic.defaultRatio` に置く
- 「追い込めば R4 は 12」でも **0 ではない** → 追い込んでも受けは要る（一択化の防止）
- 託宣との関係：天啓（敵に 4＝表示 40・`divination.ts:40`）を R3 に使えば閾値越えの最後の一押しになる。加護（予告 × 0.5・`rules.ts` guardRatio）は R4 の 24 に対し 12 ブロック。**どちらを R3〜R4 に使うかが 1 戦 3 回の託宣の使いどころになる**（決定246 の託宣希少化と整合）

battleCries（7 本・`(round-1) % 7` 順・**非公式のファン創作**。公式の口調本文は配布対象外のため、監査 §3-1 の役割「軍師」から AI が起こした仮文。Pilot で CEO 監修）：

| R | 台詞（仮） |
|---|---|
| 1 | 「布陣は整った。まずは小手調べといこう」 |
| 2 | 「焦るな。戦は、数で読む」 |
| 3 | 「……ほう。その手で来るか」 |
| 4 | 「軍略は、相手の傷で決まる」 |
| 5 | 「次の一手は、もう決めてある」 |
| 6 | 「読み切れぬ戦など、ない」 |
| 7 | 「ここまで読めたのは、そなたが初めてだ」 |

---

## 5. v1.1 コンテンツ構成

### 5-1. 展開順（tiers）

| 版 | 追加 | tier | 新語彙 | 前提 |
|---|---|---|---|---|
| v1.1.0 | **忠次** | 中〜高（★3） | `tactic`（A） | Preflight GO・Human QA PASS |
| v1.1.1 | 岡っ引き／くノ一 | 入門（★1）／中（★2） | 岡っ引き：0（attack のみ・数値個性）／くノ一：`seal`（B・軽量版・報酬設計込み） | v1.1.0 の `tactic` Gate 通過・B の報酬設計 Preflight |
| v1.1.2 | 影／直政／忠勝 | 中（★2〜3） | 影：`seal`／直政：既存（multiAttack＋special）／忠勝：`counter`（C・R2〜R3 配置で再評価） | C は A・B の後に runtime paired-seed Gate |
| v1.1.3 | 康政／鬼半蔵／ドーマン | 高・特殊（★4） | 康政：`tactic` 変種（cond を共鳴ゲージ等に）／鬼半蔵：`seal`＋連撃複合／ドーマン：共鳴干渉（決定217 の報酬問題を先に解く・FRONT のみ） | 各 1 体ずつ Narrow Pilot |
| v1.1.4 | **康虎** | **Boss ★5** | 新語彙 0（全語彙の複合・HP 高） | `enemies.test.ts:41-47` の「rank ≤ 4」を「通常 ≤4・Boss のみ 5」へ更新／Daily 除外 |

### 5-2. 密結合（追加時に必ず扱うもの）

| 結合点 | 現状（file:line） | 扱い |
|---|---|---|
| Daily 曜日ローテ | `DAILY_BOSS_POOL = Object.values(ENEMY_IDS)`・7 体が 1 週間に 1 回ずつ（`dailyBoss.ts:32-33`・test「1週間で7体が必ず1回ずつ」） | **v1.1 では pool を既存 7 体に固定**。将軍家を Daily に入れる設計（2 週 14 体ローテ等）は v1.1.2 以降に別 Decision |
| 49 攻略盤 | `MATCHUP_ENEMIES = Object.values(ENEMY_IDS)`・`MATCHUP_TOTAL = 7×7`（`matchupStorage.ts:38-39`・「0〜49」`:181`） | pool と同じく既存 7 体に固定（盤は 49 のまま）。将軍家の攻略記録は v1.1.1 で「第二盤」として別 key（storage version 付き）を設計 |
| seed → 敵 | `pickEnemyId = hash % ENEMIES.length`（`enemies.ts:329-335`） | **既存 seed の敵が変わらないよう、`pickEnemyId` は既存 7 体の配列を参照し続ける**（§5-3） |
| gameVersion | `rankingImpactSnapshot` が `ENEMIES` を含む（`gameVersion.ts:73`） | 追加で指紋が変わる＝想定どおり。golden 更新を「Expected Specification Update」として記録 |
| balanceSim | 決定58（hard×全神×全敵 ≥50%）・DAILY-01・決定126（Ⅰ〜Ⅶ×7×7）が `ENEMIES` を走査（`balanceSim.test.ts:469-523, 716-738`） | 将軍家を `ENEMIES` に含めれば **自動で Gate 対象**。DAILY-01 の走査は Daily pool と一致させる（pool 固定なら走査も 7 体） |
| 敵テスト | `enemies.test.ts`：unique id／HP・actions・art／cries／label／rank 1〜4／stage 一意 bg／art 実在 | 全項目をそのまま満たす。★5 のみ v1.1.4 で更新 |
| 舞台背景 | 敵ごとに `/assets/backgrounds/stages/NN-xxx.webp` 一意（test）・既存 7 枚 214〜322KB | 1 体 1 枚の新規生成（CEO 生成・権利／費用は §6-3）。Kit に背景素材は無い（`docs/assets-kit/manifest.json` の slot は GOD_×3／OTOMO_×3 のみ） |
| 立ち絵 | 既存 `public/assets/enemies/<id>/art*.webp` 65〜186KB・512² | Kit FRONT 1600² webp → 512² webp（§6-3）。`art-source/` に原本保全 |
| Enemy Select | `EnemySelectScreen.tsx:68` が `ENEMIES.map` | 8 体目が自動で並ぶ。SP 390px でのカード段組を Playwright で確認（新 UI 0） |
| 初戦・Tutorial | `firstBattle.ts:25`・`TutorialOverlay.tsx:35` は `ENEMY_IDS.trial` 固定 | 影響 0 |

### 5-3. 配列分離の提案（実装時の指針・本書では未実装）

- `CORE_ENEMIES`（既存 7・順序不変）と `SHOGUNATE_ENEMIES`（将軍家）を分け、`ENEMIES = [...CORE_ENEMIES, ...SHOGUNATE_ENEMIES]`
- `pickEnemyId`・`DAILY_BOSS_POOL`・`MATCHUP_ENEMIES` は **`CORE_ENEMIES` 由来の 7 id を参照**（既存 seed・Daily・49 盤を一切動かさない）
- `getEnemyDef`・Enemy Select・balanceSim の既存 gate は `ENEMIES`（8 体）を参照

### 5-4. 明示：既存 7 体は置き換えも改変もしない

- 現行 7 体の `maxHp`・`actions`・`battleCries`・`typeLabel`・`art`・`stage`・`rank` は **1 文字も変更しない**。Gate G6（§3-1）で既存 49 セルの Δ0.00 を証明する
- 現行 7 体の絵を将軍家へ差し替える案は IP 設定変更＝§6-3 #3 のため **提案しない**（監査 §3-2 と同じ）

---

## 6. 権利・容量・素材利用条件

### 6-1. Kit 規約（監査 §5-1 で 3 経路同一テキストを確認済み）

| 項目 | 内容 | 本設計での扱い |
|---|---|---|
| termsId | `SGG-FAN-CREATION-GUIDELINES-1.0.0`（Effective 2026-07-16・**Updated 2026-10-08**：§5「キャラクターの声」追加・旧 §5〜§8 は §6〜§9 へ） | 台帳には「1.0.0（Updated 2026-10-08）・確認日」と書く（監査 §5-2 #1） |
| 商用利用・印税 | 可・不要（§1） | — |
| クレジット | **任意**（§4・3 書式。例「Based on SEVENGODS Games」。記載しても公式・公認にはならない） | CM-01 の meta description に載せる方針（監査 §5-2 #6）を踏襲 |
| 禁止 | 非公式設定を公式・公認・提携作品であるかのように表示（新 §6） | 画面・docs・台帳のどこにも「公式」「公認」を書かない。本書の二つ名・技名・台詞は **非公式のファン創作** と明記（§4-2） |
| 声 | 将軍家に公式ボイス **無し**。自作（AI 生成・自演）は自由だが「公式」「公式ボイス」「公認」と書かない（新 §5） | v1.1 では敵ボイスを作らない。将来作る場合も「公式」と絶対に表記しない |
| 口調設定本文 | 配布対象外（新 §7） | 台詞は役割 1 行からの創作であり、公式口調を再現したものではないと明記 |
| repo コピー | `docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md` は §5 を含まない旧版（監査 §5-2 #2） | Pilot 着手時に最新テキストへ更新（docs-only） |

### 6-2. Rights Ledger 行テンプレート（`docs/ASSET_RIGHTS_LEDGER.md` §1 の列定義に準拠・**本書では記入しない**）

| 列 | 忠次 立ち絵（配信） |
|---|---|
| ID | `ENEMY-KIT-01` |
| Path（配信） | `enemies/tadatsugu/art.webp`（512×512・alpha あり・実行時参照：`enemies.ts` art） |
| Source file（art-source） | `art-source/enemies/tadatsugu/<manifest filename>.webp`（Kit 原本 1600×1600・無加工） |
| Category | enemy |
| Creator | **Kit 公式**（SGG Creator Kit **shogunate v1.0.0**） |
| Model-Service | — |
| Generation date | `releasedAt 2026-10-08` |
| Prompt reference | — |
| Reference inputs | なし |
| Terms version・date checked | `SGG-FAN-CREATION-GUIDELINES-1.0.0`（Updated 2026-10-08）・確認日＝Pilot 着手日 |
| Commercial use | 可（§1） |
| Modification | 可（§2）。実施：bbox 抽出・512² リサイズ・webp 再エンコード（sharp・AI 非生成加工） |
| Attribution | 任意（§4） |
| Canonical source | 将軍家 manifest の `assetId`（忠次 FRONT）＋ `sha256`（manifest 値と原本の一致を確認） |
| Evidence（sha256） | 配信ファイルの sha256 先頭 16 桁（§1-3 のコマンドで採取） |
| Status | 原本保全・sha256 一致・Terms 確認日の 3 つが揃うまで △。揃えば ◎（KNOWN） |

舞台背景 `08-shogunate-camp.webp` は **CEO 生成** 行（`STAGE-xx`・Model-Service・Training OFF 証跡・Reference inputs は §1-4 の運用どおり CEO 記入）。

### 6-3. 容量見積（1 体あたり）

| 素材 | 元 | 配信 | 見積 |
|---|---|---|---|
| 立ち絵 | Kit FRONT webp 1600×1600（容量は未取得・ダウンロード禁止のため） | 512×512 webp・alpha・quality 80〜85 | **≈60〜120KB**（既存 7 体 65〜186KB の帯の下〜中。bbox 抽出で余白を落とすため上限側に寄らない） |
| 舞台背景 | 新規生成（1024² 以上） | 既存と同じ横長 webp | ≈210〜320KB（既存 7 枚の実測帯） |
| 合計 | — | — | **≈0.3〜0.45MB／体**。遅延ロード（Enemy Select で選んだ敵のみ）なら LCP 影響 0 |

---

## 7. 結論

| 項目 | 結論 |
|---|---|
| 推奨する最初の 1 体 | **将軍四天王・忠次（軍師）**：FRONT＋BACK あり・役割が新メカニクスに正直・save v9 不変・UI 変更 0 で Regression が最小 |
| 推奨する 1 メカニクス | **軍略（`tactic`：R4 開始時の敵 HP 比で then／else を解決する条件分岐 Intent）**。生まれる判断＝「R3 までに追い込むか、R4 に備えるか」＝期限つきの「仕込んでから撃つ」。乱数 0・1 手先予告・正解表示なし・敵ブロックなし・峰 R4 |
| NEXT ACTION（1 件） | **「将軍家 Pilot v1 Preflight（忠次・軍略）」を docs＋決定論 simulation のみで起票**：①manifest から assetId／sha256／profile 本文を転記して §1・§4 の表記を確定 ②`ratio` 0.45／0.50／0.55 × then 値 10／12／14 を paired-seed（通常／easy／hard／Daily／神階Ⅰ〜Ⅶ・既存 5 方策＋`raceAware`）で比較し Gate G1〜G6 を判定 ③背景 1 枚の生成手段（CEO 生成・§6-3 #5／#6）を確定 ④`CORE_ENEMIES` 分離の影響（`pickEnemyId`・Daily・49 盤 Δ0）を test で先に固定 |

- 本書の判断はすべて **AI 判断（CLAUDE.md §6-2）**。CEO 判断が必要になるのは Pilot の実装 Phase 開始（§6-5）・背景生成の権利／費用（§6-3 #5／#6）・Production 公開（§6-3 #8）のみ
- **runtime 実装は本書の範囲外**。`src/`・`public/`・`package.json`・Rights Ledger・DECISIONS.md は本書作成で変更していない
- 優先順位 **Public Face Pack v1（CM-01）→ Save Compatibility Guard → Release Safety → Practical QA v3 → v1.0** は不変（`docs/ROADMAP_TO_RELEASE.md`）。将軍家は v1.0 公開後の Growth Phase（監査 §3-2「敵語彙設計 → K07 敵アート判断 → roster 拡張」）に位置づける
