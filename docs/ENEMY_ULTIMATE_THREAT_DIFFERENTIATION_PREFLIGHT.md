# 決定252 — Enemy Ultimate / Threat Differentiation Preflight（2026-09-30）

**PREFLIGHT ONLY**：runtime／src／Production 変更 0・実装 0。Audit／Design／Simulation のみ。
Production baseline：master = origin/master `7db95ae`（runtime `b9b126e`・決定251 LIVE / CLOSED）。
simulation は `docs/evidence/decision252/`（総試合数 **1,634,080**・harness `harness.d252.preflight.test.ts.txt`・集計 `SIMULATION_SUMMARY.md`）。
判断はすべて **AI 判断**（CLAUDE.md §6-2）。CEO 判断が必要な事項（§6-3）は本 Preflight には含まれない（下記 §14）。

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| Root cause | 敵 7 体の「問題」は**予告の数列の形**（峰の高さ・位置・前後の谷）だけで決まっており、4 体（試練・鬼将・怨霊・龍神）は kind が attack のみ＝**名前も予兆も無い**。読む価値そのものは 5 体にある（通常で reader−naive 12〜27pt）が、**乱舞の道化だけは読む価値が無い**（greedy 97.6%・R−G 2.4pt）。Ⅵ〜Ⅶ の魔獣崩落は「必殺・連撃 +20%」が連撃のみの敵に全ラウンド乗る構造 |
| Threat vocabulary | 既存 4 kind（attack／charge／multiAttack／special）＋ 3 tier（normal／strong／huge）で **7 つの異なる問題を作れる**ことを実測。新 mechanic（break・自己回復・自己強化）は 3 案 × 変種を実 engine ＋ emulation で試し **すべて棄却**（読まない側を楽にする／未撃破を 3 倍にする／効果が測定限界以下） |
| 最終 SPEC（1 案） | **データ表 4 体＋倍率規則 1 つ**：①鬼将 R3 溜め→R4 必殺「業斧・断岩」260・HP 100→94 ②怨霊 R4 を必殺「怨嗟の花」230（数値不変） ③龍神 R4 を必殺「大海嘯」200（数値不変） ④道化 R2 溜め→**R3 必殺「乱舞・狂宴」240**＋R5 溜め→R6 190（合計不変） ⑤神階Ⅵ「必殺・連撃 +20%」を **必殺（special）だけ**に限定し、敵別上限を `RULES.stakes.specialMulCap`（機工師 1.1・怨霊 1.0・龍神 1.0）へ一般化。試練・機工師・魔獣の表は不変 |
| 双牙の魔獣 | **A（必殺のみ倍率）を採用**。魔獣の identity は「毎ラウンド連撃＝序盤の圧」であり必殺は R3 の双牙乱撃だけ。B（表の並べ替え）は通常戦を変えるうえ Ⅵ +7pt 止まり。A は通常／Ⅰ〜Ⅴ／むずかしい／Daily を一切変えず Ⅵ 50.6→74.1・Ⅶ猛威 31.0→52.9 |
| 結果（reader・100 seed） | 通常／easy 全敵 同一水準（99.6〜100）。Ⅴ 83.7→85.9・**Ⅵ 78.9→83.9・Ⅶ猛威 64.5→71.1**・Ⅶ巨躯 55.0→60.4・Ⅶ静寂 78.2→82.7。未撃破 全段 ±1pt。reader > naive > greedy を全段維持（R−N 15.6〜59.6pt） |
| reader vs 必殺無視 | 通常：鬼将 **33.9pt**・怨霊 **35.0**・龍神 **20.3**・機工師 9.4・魔獣 7.0・道化 6.4（道化は通常が易しい。むずかしい 47・Ⅵ 61・Ⅶ猛威 82）。「必殺を無視すると負ける」が測定可能になった（現行は 4 体で概念自体が無い） |
| 49 セル | reader<50%：Ⅵ 4→1・Ⅶ猛威 13→7・Ⅶ巨躯 21→15・Ⅶ静寂 4→2・Ⅴ 0→0 |
| 実装量 | runtime 4 ファイル（`enemies.ts` 表 4＋HP 1＋説明文 4／`rules.ts` cap 1 record／`stakes.ts` 参照 1＋Ⅵ文言／`round.ts` 条件 1 行）＋テスト期待値更新 6 件＋`gameVersion` golden。**save version 不変（v9）**・新 kind 0・新 Effect 0・tutorial 影響 0 |
| 演出 | 決定240（special 構え＋足元の環・charge の金／紅蓮 pulse）と決定249（stagger 等）と既存の必殺カットイン／`enemy_charge` SE を**そのまま再利用**。新規生成 0。Pilot 追加候補は「予兆（次ラウンドの kind）」の小さな cue 1 つのみ（任意） |
| GO / NO-GO | **GO**（Pilot＝data＋rule 1 値＋テスト更新＋paired-seed Gate で §9 表と一致。Human QA 必要：鬼将・道化） |
| NEXT NOW（1 件） | **決定252 Pilot（CEO GO 待ち・自動実装しない）** |

---

## 1. CURRENT ENEMY AUDIT（Production `b9b126e`・`src/core/data/enemies.ts`・通常難度）

### 1-1. 7 敵 × R1〜R7 台帳（内部値。表示は ×10。tier：n=normal <10／s=strong 10〜14／h=huge ≥15。予告文は `formatEnemyIntent`）

| 敵 | HP | R1 | R2 | R3 | R4 | R5 | R6 | R7 | 合計 | 峰 | kind |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 試練の影 | 103 | ⚔5 n | ⚔8 n | 💥11 s | 🔥15 h | 💥13 s | ⚔9 n | ⚔6 n | 67 | R4 | attack のみ |
| 業斧の鬼将 | 100 | ⚔5 n | ⚔9 n | 💥13 s | 🔥17 h | 🔥15 h | 💥11 s | ⚔7 n | 77 | R4 | attack のみ |
| 藍花の怨霊 | 95 | ⚔3 n | ⚔6 n | 💥13 s | 🔥23 h | 🔥18 h | ⚔9 n | ⚔4 n | 76 | R4 | attack のみ |
| 銀甲の機工師 | 100 | ⚔6 n | ⚡溜め | 🔥22 h | ⚡⚠充填 | 🔥主砲・神滅甲 24 special | ⚔7 n | ⚔9 n | 68 | R5 | attack＋charge×2＋special |
| 双牙の魔獣 | 85 | ⚔連撃 5+4 n | 💥連撃 5+5 s | 🔥双牙乱撃 4×3 special | 🔥連撃 8×2 h | 🔥連撃 8+7 h | 💥連撃 7×2 s | 💥連撃 7+6 s | 89 | R4 | multiAttack 全 R |
| 蒼海の龍神 | 103 | ⚔4 n | ⚔7 n | 💥12 s | 🔥20 h | 🔥16 h | ⚔9 n | ⚔5 n | 73 | R4 | attack のみ |
| 乱舞の道化 | 92 | ⚔4 n | ⚡溜め | 🔥19 h | ⚡溜め | 🔥24 h | 💥12 s | ⚔6 n | 65 | R5 | attack＋charge×2（**R5 の 24 は special ではない**＝カットイン無し・Ⅵ倍率無し） |

決定240 台帳：49 行動＝normal 21／strong 10／huge 12／special 2／charge 4。special を持つのは機工師 R5・魔獣 R3 の 2 行動のみ。

### 1-2. 数値以外に何が違うか（Intent 表示・演出・engine 挙動）

| 軸 | 試練 | 鬼将 | 怨霊 | 機工師 | 魔獣 | 龍神 | 道化 |
|---|---|---|---|---|---|---|---|
| 1R 前の予兆（engine） | 無 | 無 | 無 | charge×2 | 無 | 無 | charge×2 |
| 名前つき必殺（カットイン・🔥＋技名） | 無 | 無 | 無 | 主砲・神滅甲 | 双牙乱撃 | 無 | 無 |
| 立ち絵の構え（決定240） | huge R4 | huge R4〜5 | huge R4〜5 | huge R3・special R5・charge 金／紅蓮 | special R3・huge R4〜5 | huge R4〜5 | huge R3・R5・charge 金 |
| 神階Ⅵ「必殺・連撃 +20%」 | 無 | 無 | 無 | R5 のみ（cap 1.1） | **全 7 ラウンド** | 無 | 無 |
| engine 上の形 | 単発 | 単発 | 単発 | 単発／0 ダメ | 連撃（block は同一 pool・debuff は合計へ 1 回＝**単発と等価**） | 単発 | 単発／0 ダメ |
| God／OTOMO／Card との相互作用 | `enemyBig`（予告 ≥10）R3〜5・`blocked` 成立しやすい R1〜2 | 同左 R3〜6 | R3〜5 のみ enemyBig。R1〜2 は「盾を張る理由」が無い | 溜めラウンド（予告 0）は `blocked`／`enemyBig`／加護が**成立しない**＝攻撃・共鳴の仕込み専用 | R1〜2 から enemyBig 圏（9・10）。寿楽 Mastery は 1 action = 1 sample | R3〜5 enemyBig | 溜め R2・R4 は仕込み専用。R3・R5 enemyBig |

**engine 上、multiAttack は同じ合計の単発と等価**（block は 1 pool を逐次消費・debuff は合計へ 1 回・Mastery も 1 action = 1 票）。魔獣の「連撃」は表示・演出上の差であり、決定 PROTOTYPE-01／02 の判断どおり per-hit 適用は禁止されている。したがって「形（shape）」で問題を作る余地は現行 engine に無く、問題は**峰の位置・高さ・谷**で作られている。

### 1-3. 各敵が今プレイヤーに要求している判断／できていない判断／クライマックス／counterplay（実測：`SIMULATION_SUMMARY.md` §1-2）

| 敵 | 要求している判断（実測） | 要求できていない判断 | クライマックス | counterplay | 読む価値（通常 R−N／R−G） |
|---|---|---|---|---|---|
| 試練の影 | R4 峰（150）を 1 回受ける。入門 | 特に無し（意図どおり） | R4 huge（無名） | 盾 1 枚 or 加護 | 3.8／22.9 |
| 業斧の鬼将 | R3〜R6 の連続 strong／huge を配分して受ける（「受け切りながら削る」） | いつ来るかは数列を覚えるだけ。予兆・名前が無い | R4 huge 170（無名） | 盾＋加護（加護率 31%） | 17.6／36.9 |
| 藍花の怨霊 | R1〜2 は攻めに全振り、R4（230＝HP の 77%）に加護・盾を温存する | 予兆が無い（R3 130 → R4 230 の急伸は数列を知らないと読めない） | R4 huge 230（無名） | 加護（**加護率 43%＝最高**）＋盾 | **26.9**／36.9 |
| 銀甲の機工師 | 溜め R2／R4 に攻め、R3／R5 に受ける（**二段の律動**） | 十分（K-C2 で検証済み） | R5 主砲・神滅甲 240 | 加護を R5 に残す（Ⅴ 加護 77%） | 13.8／13.8（greedy 85.7＝溜めが自由ラウンドを与える） |
| 双牙の魔獣 | R1〜R3 の序盤の圧（7.2／6.5 被ダメ＝最大）を凌ぎつつ R3 乱撃を受け、HP 85 を R5 前に削る（**tempo**） | 十分 | R3 双牙乱撃 40×3 | 早めの盾＋短期決戦（撃破 R **5.31＝最速**） | 11.7／29.8 |
| 蒼海の龍神 | R3〜R5 の幅広い波（12／20／16）を HP 103 の長期戦で凌ぐ（**持久**：未撃破 Ⅲ 17%＝最多） | 予兆・名前が無い | R4 huge 200（無名） | 盾 3 ラウンド分＋回復・撃破ペース | 19.5／37.9 |
| 乱舞の道化 | **無い**：溜め 2 回の自由ラウンドで greedy が 97.6%・naive 94.3%。R5 240 は無名で HP 30 の全快から死なない | 予告確認（説明文「毎ターン予告確認が重要」）が**報われない** | R5 240（無名・カットイン無し） | 不要 | **5.7／2.4** |

### 1-4. Root Cause（決定244 RC2 の再定義）

1. **予告の「形」は 5 体で機能している**（R−N 12〜27pt）。足りないのは名前・予兆・演出であって、数値の問題ではない（怨霊・龍神）。
2. **道化だけは問題が無い**：溜め 2 回＝プレイヤーの自由ラウンド 2 回。峰 R5 240 は special でなく、R3 190 の後に来るため「読まなくても殴り切れる」。
3. **鬼将は機工師の下位互換**：数列が単調に上がるだけで、溜め・必殺・名前の何も無い。
4. **魔獣 × Ⅵ〜Ⅶ**：`specialMultiplierFor` が multiAttack にも掛かるため、連撃のみの魔獣は全 7 ラウンド +20%（Ⅵ 4 神 16〜38%）。
5. 決定215／216／217 の教訓（守る理由だけでは判断が生まれない・スコアは防御を評価しない・scratch と実 runtime の乖離）は本 Preflight でも再現した（§2-3）。

---

## 2. THREAT VOCABULARY

### 2-1. 既存語彙の監査（決定215 §2 の更新）

| 軸 | 語彙 | 実装済みの効果 | 7 敵での使用 |
|---|---|---|---|
| Timing | `charge`（予告 0・label） | 1R 前の予兆。次が special なら立ち絵 紅蓮 pulse（`enemy-avatar-charging-super`）、そうでなければ金 | 機工師 2・道化 2 |
| Magnitude | tier normal／strong／huge（10／15） | 名札色・グリフ・構え（決定240） | 全敵 |
| Signature | `special`（name） | 🔥＋技名・カットイン（`BattleEnemyCutin`）・Ⅵ倍率・`defeatCause`「必殺技」 | 機工師 1 |
| Shape | `multiAttack`（hits・name・special） | 多段 DAMAGE_DEALT・多段 lunge・「40×3」表示。engine は単発と等価 | 魔獣 7 |
| 峰の位置 | 表の並び | R3／R4／R5 | 全敵 |

### 2-2. 既存表現でどこまで差別化できるか（実測）

| 手段 | 効果（実測） | 採否 |
|---|---|---|
| 峰の**位置**（R3／R4／R5）を変える | 道化 R5→R3：通常 greedy 97.6→80.1、Ⅵ naive 49.6→28.9、Ⅶ猛威 naive 33.6→8.6。託宣を R3 で切る率 1→9%（Ⅴ 53%） | **採用**（道化） |
| 峰の**前に谷**（charge）を置く | 鬼将：予兆＋加護の集中（Ⅴ 加護 R4 77%）。ただし自由ラウンドは greedy を楽にするため、峰を上げて相殺（17→26）し HP で撃破 R を戻す | **採用**（鬼将） |
| 峰に**名前**を付ける（special 化） | 数値不変でも「必殺を無視する方策」との差が測定可能になる（怨霊 35pt・龍神 20pt）。Ⅵ倍率は cap で制御 | **採用**（怨霊・龍神） |
| 峰を**平らに**する（flat） | 龍神 flat：naive 79→96（峰が無いと読まなくても死なない） | 棄却 |
| 峰を**鈍らせる**（plateau） | 怨霊 20/17/13：R−N 27→14 | 棄却 |

### 2-3. 新規 mechanic の検証（最小限の 3 案・すべて棄却）

| 案 | 内容 | 結果 | 棄却理由 |
|---|---|---|---|
| break（崩し） | 溜め中に閾値ダメージを与えると次の攻撃が −W | 道化：greedy 通常 97.5→99.6、naive Ⅲ 65→82。R+−R ≈ 0 | greedy は元々溜めラウンドに全力で殴る＝break は「読まない側への贈り物」。決定217（スコアは防御を評価しない）の逆で、**攻撃報酬は読まない側も取れる** |
| 自己回復（潜航） | 溜め中に敵 HP+120（閾値で阻止可） | 龍神：未撃破 Ⅲ 19→30〜36%、Ⅵ 19→31〜35% | 0 ダメージの休み＋回復で試合が伸び、決定244 の未撃破 ≤10% 帯を大きく外れる |
| 自己強化（祟り） | 溜め中に敵 atk+30 × 5R | 怨霊：naive 71→90・greedy 65→84。debuff 優先方策の利点 +0.4〜1.1pt | 0 ダメージの R2 が楽にし過ぎる。block と debuff は AP 効率が等価で「弱体化させる判断」は分離できない |

**結論：7 敵 = 既存 4 kind × 峰の位置・高さ・谷 × 名前。新システム 0。**

---

## 3. 7 ENEMY IDENTITY TABLE（最終）

| 敵 | 問題（一言） | 何を見るか | 何を温存するか | いつ切るか | 表の変更 |
|---|---|---|---|---|---|
| 試練の影 | **入門**：峰を読み 1 回守る | R4 huge の構え | 何も | R4 に盾 1 枚 | 不変（チュートリアル基準線） |
| 業斧の鬼将 | **受け切る**：予告された一撃「断岩」260 を受け、直後も続く圧を凌ぐ | R3「斧を振りかぶっている…」（紅蓮 pulse） | 加護（R4 用）・盾 | R4 に加護＋盾を集中（Ⅴ 加護 R4 77%）。R3 は攻め | R3 溜め→R4 必殺 260・R5〜7 15/11/7・HP 94 |
| 藍花の怨霊 | **温存**：序盤は攻めに全振り、R4「怨嗟の花」230 に加護と HP を残す | R3 strong→R4 special の急伸（予兆 cue） | 加護（加護率 44%＝最高）・HP | R4 の 1 回だけ | R4 を special 化（数値不変） |
| 銀甲の機工師 | **二段の律動**：溜め R2／R4 に攻め、R3／R5 に受ける | 2 回の溜め | 加護を R5 主砲へ | R3 は盾、R5 は加護＋盾 | 不変 |
| 双牙の魔獣 | **速攻**：序盤の圧を凌ぎ R3 乱撃を受け、HP 85 を短期で削る | R1〜R3 の連撃 | 何も（早く切る） | R2〜R3 に盾、以後は攻め | 不変＋Ⅵ倍率を必殺のみへ |
| 蒼海の龍神 | **持久**：R3〜R5 の幅広い波「大海嘯」を HP 103 の長期戦で受け続け、撃破ペースを落とさない | 3 ラウンドの波（予兆 cue） | 回復・HP | R3〜R5 に盾を分散、R4 に加護 | R4 を special 化（数値不変） |
| 乱舞の道化 | **開幕**：ゲーム最速の必殺「狂宴」240 が R3 に来る。託宣を**先に**切る | R2「⚠ 手品を仕込んでいる…」 | 何も（R3 に全部使う） | **R3 に加護＋盾**、以後は攻め。R5 溜め→R6 190 はアンコール | R2 溜め→R3 必殺 240／R4 9／R5 溜め→R6 19／R7 9 |

7 つの「いつ切るか」：R4（試練）／R4 集中（鬼将）／R4 温存（怨霊）／R3・R5 二段（機工師）／R2〜R3 早切り（魔獣）／R3〜R5 分散（龍神）／**R3 先切り**（道化）。

---

## 4. 7 SIGNATURE / ULTIMATE SPEC（最終 1 案）

### 4-1. `src/core/data/enemies.ts`（内部値）

| 敵 | R1 | R2 | R3 | R4 | R5 | R6 | R7 | 合計 | HP |
|---|---|---|---|---|---|---|---|---|---|
| 試練の影 | 5 | 8 | 11 | 15 | 13 | 9 | 6 | 67（不変） | 103 |
| 業斧の鬼将 | 5 | 9 | **charge「斧を振りかぶっている…」** | **special「業斧・断岩」26** | 15 | 11 | 7 | 73（77） | **94**（100） |
| 藍花の怨霊 | 3 | 6 | 13 | **special「怨嗟の花」23** | 18 | 9 | 4 | 76（不変） | 95 |
| 銀甲の機工師 | 6 | charge | 22 | charge ⚠ | special 主砲・神滅甲 24 | 7 | 9 | 68（不変） | 100 |
| 双牙の魔獣 | 5+4 | 5+5 | 双牙乱撃 4×3 | 8+8 | 8+7 | 7+7 | 7+6 | 89（不変） | 85 |
| 蒼海の龍神 | 4 | 7 | 12 | **special「大海嘯」20** | 16 | 9 | 5 | 73（不変） | 103 |
| 乱舞の道化 | 4 | **charge「⚠ 手品を仕込んでいる…」** | **special「乱舞・狂宴」24** | 9 | **charge「また何か仕込んでいる…」** | 19 | 9 | 65（不変） | 92 |

- 各 Signature の条件チェック：予兆 ≥1R 前（鬼将・道化＝charge／怨霊・龍神・魔獣・機工師＝直前ラウンドが strong／charge・§7 の予兆 cue で補強）／Intent から理解可能（🔥＋技名＋数値）／counter 可能（加護 50%＋盾・debuff。通常で必殺による死亡 0）／Seed deterministic（表のみ）／7R 内（R3〜R5）／AP system 不変／Oracle scarcity と相互作用（§9-5：使用ラウンドが敵ごとに変わる）／Resonance・God Strike を邪魔しない（GS 率 −5〜0pt）／初見殺しでない（通常の狂宴 240 は R2 後の HP 26 から未防御でも生存。Ⅶ猛威でも必殺死亡 <4%）／unavoidable damage 0。
- 説明文（`typeDescription` ≤30 字）更新案：鬼将「溜めの次に断岩。R4を受け切れ。」／怨霊「R4に怨嗟の花。峰に備え温存せよ。」／龍神「R4の大海嘯。長い波を受け続けろ。」／道化「R3に開幕の必殺。託宣を先に切れ。」。`typeLabel` は不変。

### 4-2. `src/core/data/rules.ts`／`stakes.ts`／`engine/round.ts`（倍率規則）

```
// rules.ts stakes
specialMul: 1.2,
/** 決定252：必殺の敵別上限。怨嗟の花／大海嘯は溜めの無い「峰そのもの」で数値も不変のため 1.0（Ⅵ でも伸びない）。機工師は決定126 の 1.1 を移設 */
specialMulCap: { enemy_04: 1.1, enemy_03: 1.0, enemy_06: 1.0 } as Partial<Record<string, number>>,
// specialMulCapKarakuri は specialMulCap.enemy_04 へ統合（stakes.test / stakeRules.test の参照を更新）
```
- `stakes.ts specialMultiplierFor`：`cap = RULES.stakes.specialMulCap[enemyId] ?? Infinity`。
- `round.ts nextEnemyAction`：`specialMul` の条件を `raw.kind === 'special' || (raw.kind === 'multiAttack' && raw.special)` へ（通常連撃には掛けない）。
- `stakes.ts STAKE_LEVELS[Ⅵ].addedRuleJa`／`describeStakeRules`：「敵の必殺・連撃+20%」→「敵の必殺+20%」。
- 難易度・Daily・神階 ATK・late surge の倍率は不変。

### 4-3. 変えないもの
試練・機工師・魔獣の表、全 HP（鬼将以外）、カード 60 枚、神／OTOMO、託宣 3／神階 2、共鳴、スコア式、`EnemyActionDef` 型（新 kind・新フィールド 0）、`Effect` 型、save version 9、tutorial（試練の影は不変）。

---

## 5. 双牙の魔獣の最終処理

| 案 | 内容 | Ⅵ（4 神平均） | Ⅶ猛威 | 通常／Ⅰ〜Ⅴ／むずかしい／Daily | Identity 整合 |
|---|---|---|---|---|---|
| A（採用） | 「必殺・連撃 +20%」を special 行動だけへ | 50.6→**74.1**（恵比寿 33→77・大耀 28→56・才華 16→39・福永 29→69） | 31.0→**52.9** | **全値同一** | ○ 魔獣の必殺は R3 双牙乱撃だけ。「毎ラウンド連撃」は shape であり Ultimate ではない。Ⅵ「禁足地：敵の大技が牙を剥く」の flavor と一致 |
| B | 表を pre-246 の並び（峰 R7）へ | 57.6 | 37.0 | 通常 naive +4pt・Ⅲ／Ⅴ +4pt | × E1（峰 R4）の原則に反し、決定246 の Combat Tension を魔獣だけ戻す |

魔獣は「何を解く敵か」＝**速攻**（序盤被ダメ最大・撃破 R 最速・HP 最小）。この identity に必要なのは連撃の**形**であって Ⅵ の倍率ではない。単なる nerf ではなく、倍率規則を「必殺」の定義に揃える整理として A を採用。残る弱点：Ⅶ猛威 才華×魔獣 15%・Ⅵ 才華×魔獣 39%（才華は盾 0 の技巧デッキ。神階Ⅶ の「神の弱点を避ける選択」の範囲と判断）。

---

## 6. SIMULATION（詳細 `docs/evidence/decision252/SIMULATION_SUMMARY.md`）

- battle count：**1,634,080**（audit 152,880／魔獣 A・B 75,600／tuning 249,200／final F1 578,200／final F2 578,200）
- 条件：7 神 × 7 敵 × 5 方策（reader／readerPlus／naive／greedy／**ignoreUlt**）× Normal 神階 0〜Ⅶ（猛威・巨躯・静寂）× 100 seed ＋ Easy／Hard／Daily × 60 seed。すべて paired（`d252-0..99`）
- engine：Production `b9b126e` そのもの。表はデータ差し替えで**実 engine 実行**。Ⅵ〜Ⅶ の「必殺のみ倍率」だけ emulation（積の順序が違うだけ。0.5 境界の丸め差の可能性を Pilot Gate で確認）

### 6-1. Normal（神階 0）／Easy／Hard／Daily（reader・prod→SPEC）
通常 99.8→99.8／easy 100→100／hard 95.9→96.7（鬼将 96.7→98.8・道化 99.8→100、他不変）／Daily 91.4→92.4（鬼将 91.2→94.3・道化 93.8→95.7、他不変）。naive／greedy は通常 84.6→84.2／74.7→72.7。

### 6-2. 神階Ⅰ〜Ⅶ（reader・prod→SPEC）
Ⅰ 99.7→99.7／Ⅱ 98.0→98.1／Ⅲ 89.4→90.2／Ⅳ 86.4→87.9／Ⅴ 83.7→85.9／Ⅵ 78.9→83.9／Ⅶ猛威 64.5→71.1／Ⅶ巨躯 55.0→60.4／Ⅶ静寂 78.2→82.7。決定251 の単調減少（各段 ≤ 前段 +5）維持。未撃破 全段 ±1pt。

### 6-3. 49-cell outliers（reader <50%・prod→SPEC）
Ⅴ 0→0／Ⅵ 4→1／Ⅶ猛威 13→7／Ⅶ巨躯 21→15／Ⅶ静寂 4→2。残る 7（Ⅶ猛威）：魔獣 4 セル・怨霊 2（大耀 43・才華 30）・龍神 1（大耀 38）＝すべて現行と同値以上。

### 6-4. reader vs ignore-counter gap（通常／むずかしい／Ⅵ／Ⅶ猛威・SPEC）
鬼将 34／65／74／72・怨霊 35／67／57／50・龍神 20／55／49／44・機工師 9／41／49／58・魔獣 7／15／27／29・道化 6／47／61／82・試練 0（必殺なし）。**7 体中 6 体で「必殺を無視すると測定可能に負ける」**。readerPlus（敵固有カウンター知識）は reader と差 0（±0.4）＝解くのに隠し知識は要らない。

### 6-5. Oracle interaction（通常・reader）
託宣使用ラウンド：道化 R3 9%（prod 1%・Ⅴ 53% vs 13%）／鬼将 R4 19%（16%・Ⅴ 77% vs 66%）／怨霊 R4 27%（不変）／機工師 R5 70%（不変）／魔獣 R3〜5（不変）。加護率：鬼将 28・怨霊 44・龍神 27・道化 17・機工師 17・魔獣 38・試練 12％＝敵ごとに違う。託宣枯渇時死亡・使用回数は全段 prod ±0.1。

### 6-6. God Strike interaction
GS 率（通常）：鬼将 61→56（撃破が R5.75→5.64 へ早まる）・道化 45→44、他不変。神階Ⅴ〜Ⅶ は ±3pt 以内（魔獣 Ⅵ 60→69＝生存が増えた分）。BURST 到達ラウンド不変（4.6〜5.2）。

---

## 7. PRESENTATION HOOK（実装しない・既存資産の割当のみ）

| Signature | Intent cue | enemy pose／reaction | HUD cue | release cue | impact cue | 新規資産 |
|---|---|---|---|---|---|---|
| 鬼将 断岩 | R3 `⚡ 斧を振りかぶっている…`＋`enemy-avatar-charging-super`（次が special＝紅蓮 pulse・既存 `EnemyPanel` 判定） | R4 special 構え＋足元の環（決定240） | 名札 `intent-tier-huge`・🔥グリフ（既存） | `BattleEnemyCutin`（技名「業斧・断岩」・既存 special 経路）＋`enemy_charge` SE（R3）・敵ターン SE | 単発 lunge heavy／`hit-shake`（決定232 着弾）・`defeatCause`「必殺技」 | 0 |
| 怨霊 怨嗟の花 | **予兆 cue（任意）**：R3 名札の下に「次：🔥」の小グリフ（`actions[round]` の kind から静的に決まる・決定240 の `GlyphIcon` 再利用） | R4 special 構え＋環 | 同上 | カットイン（既存） | 単発 lunge | 0 |
| 機工師 主砲 | 既存（K-C2） | 既存 | 既存 | 既存 | 既存 | 0 |
| 魔獣 双牙乱撃 | 既存 | 既存 | 既存 | 既存 | 多段 lunge | 0 |
| 龍神 大海嘯 | 予兆 cue（任意）・R4 🔥 | special 構え＋環 | 同上 | カットイン | lunge heavy（`visualType: heavy`） | 0 |
| 道化 狂宴 | R2 `⚡ ⚠ 手品を仕込んでいる…`＋紅蓮 pulse（自動）／R5 金 pulse（次は attack） | R3 special 構え＋環 | 同上 | カットイン（R3）＋`enemy_charge` SE | 単発 lunge | 0 |
| 試練 峰 | R4 huge 構え（既存） | 既存 | 既存 | — | — | 0 |

- 決定240 `getIntentDangerLevel`／`getIntentStanceClass` は kind と閾値だけで判定するため**変更不要**。台帳テスト（49 行動：normal 21／strong 10／huge 12／special 2／charge 4）は SPEC で **22／8／8／6／5** へ期待値更新。
- 決定249 Reaction Language：敵側は `rl-stagger`（WEAKEN）のみで敵 kind に依存せず**変更不要**。
- 予兆 cue は Pilot の任意項目（UI のみ・`EnemyPanel` が既に `nextAction` を参照している）。無くても charge を持つ鬼将・道化・機工師は engine の予兆で成立、怨霊・龍神は直前ラウンドの strong 構え＋`typeDescription` で成立。
- 新規動画／画像／音声生成 0。

---

## 8. COMPLEXITY BUDGET

| 項目 | 内容 |
|---|---|
| runtime 変更 | `enemies.ts`（表 4 体・HP 1・説明文 4）／`rules.ts`（`specialMulCap` record・`specialMulCapKarakuri` 統合）／`stakes.ts`（`specialMultiplierFor` 参照・Ⅵ 文言）／`round.ts`（`specialMul` 条件 1 行）＝**4 ファイル・新 kind 0・新 Effect 0・新 subsystem 0** |
| UI | 必須 0（既存の special／charge 経路が自動で働く）。任意：予兆 cue（`EnemyPanel.tsx`＋`battle.css` 末尾） |
| save compatibility | `GameState`・`EnemyActionDef` 不変 → **saveVersion 9 のまま**。進行中セーブは次ラウンドから新表（決定246／251 と同じ扱い） |
| gameVersion | `dataFingerprint` が enemies／rules の変更を自動反映 → golden 更新（決定216 の「Expected Specification Update」手順）。Ranking は dormant |
| tests（期待値更新） | `enemyActions.test.ts`（「5 体は attack/charge のみ」→ 新台帳）／`cardStyle.test.ts` 台帳 21/10/12/2/4→22/8/8/6/5／`stakes.test.ts` cap 参照／`stakeRules.test.ts` Ⅵ（魔獣 R1 は倍率無し→R3 で検証）／`useReactionLanguage.test.ts` golden／`enemies.test.ts` 説明文 ≤30 字。`balanceSim.test.ts` 決定58・DAILY-01・STAKE-01 ゲートは再実行（SPEC 値は各 floor を満たす見込み：Ⅵ 最悪神 蒼毘 59%・Ⅶ猛威 最悪神 大耀 50%）。決定236〜251 の golden で敵表に依存するものは再生成 |
| tutorial | 試練の影 不変・`TutorialOverlay` 文言は汎用 → **影響 0** |
| 決定216 リスク | 表はデータのため実 engine で測定済み。emulation は Ⅵ〜Ⅶ の倍率順序のみ → Pilot Gate で paired-seed 再計算し §6 と一致確認（許容差：Ⅵ〜Ⅶ ±0.5pt・他は完全一致） |

---

## 9. RISKS

1. **鬼将 HP 100→94**：決定36 の調整（108→100）に続く 2 度目の HP 変更。通常 reader 100→99.9・greedy 64→67（−3pt の緩和）。撃破 R 5.75→5.64、GS 率 61→56。演出上「神の一撃を見る前に倒す」試合が 5pt 増える（決定250 との相互作用は軽微）。
2. **道化の開幕必殺**：通常は未防御でも生存（HP 26 − 24）だが、むずかしい（28）・神階Ⅰ（28）・Daily（28）では R1 の被弾込みで**未防御なら致死**。予兆（⚠＋紅蓮 pulse）と加護 120＋盾で解ける設計だが、Human QA で「初見で読めるか」を必ず確認（§12）。
3. **怨霊・龍神の cap 1.0**：Ⅵ の文言「必殺+20%」がこの 2 体には乗らない（機工師の 1.1 と同型の例外）。説明は `specialMulCap` のコメントと DECISIONS に残す。cap 1.1 案は Ⅶ猛威 −8pt（棄却理由 §5 SIMULATION_SUMMARY）。
4. **naive／greedy の緩和**：通常 naive 84.6→84.2・greedy 74.7→72.7（むしろ厳しく）。神階Ⅰ〜Ⅳ も naive −1〜2pt。決定251 の副作用（naive +9〜11pt）を戻す方向。
5. **道化の R6 190（アンコール）**：撃破 R 5.57 のため到達率 ≈35%。「R6〜7 は見えない」（K-C2）と同じ性質だが、Signature は R3 に置いたため identity は成立。
6. **emulation の丸め**：Ⅵ〜Ⅶ で `round(raw × 1.2 × M)` と `round(raw × M × 1.2)` が 0.5 境界で 1 ずれる可能性（浮動小数点）。Pilot Gate で検出。
7. **cardStyle 台帳・golden の更新量**：テスト 6 ファイル。いずれも「仕様更新」であり挙動回帰ではない。

---

## 10. GO / NO-GO

**GO**。根拠：①通常／easy／hard／Daily で reader 同一水準・未撃破不変 ②Ⅴ〜Ⅶ +2〜7pt（決定251 の再中心化を魔獣・鬼将で補完）③reader > naive > greedy 全段維持 ④7 体中 6 体で「必殺を無視すると負ける」が測定可能 ⑤新 mechanic 0・save 不変・4 ファイル。

## 11. exact Pilot scope（CEO GO 後に実装。本 Preflight では実装しない）

1. branch：`feat/d252-enemy-ultimate`（master `7db95ae` から。決定213 runtime 混入 0）
2. `enemies.ts`：§4-1 の 4 表＋鬼将 `maxHp: 94`＋説明文 4 件（≤30 字）
3. `rules.ts`：`specialMulCap` record（`specialMulCapKarakuri` を統合）／`stakes.ts`：参照＋Ⅵ 文言／`round.ts`：`specialMul` 条件
4. tests：§8 の期待値更新＋`gameVersion` golden（Expected Specification Update として記録）
5. Gate：tsc／lint／vitest 全件／build／**paired-seed 再計算 578,200 試合が §6 と一致**（Ⅵ〜Ⅶ ±0.5pt）／決定58・DAILY-01・STAKE-01 違反 0／CSS md5 = Production
6. Human QA（Before/After・PC＋iPhone）：① 大耀 × 業斧の鬼将 通常（R3 溜め→R4 断岩を読んで加護＋盾） ② 大耀 × 乱舞の道化 むずかしい（R2 ⚠ → R3 狂宴を初見で読めるか） ③ 恵比寿 × 双牙の魔獣 神階Ⅵ（連撃の予告が Production より小さい）。3 問（読めたか／解けたか／うるさくないか）
7. 任意（Pilot に含めるかは実装時の AI 判断）：予兆 cue（UI のみ・CSS 末尾追記・reduced-motion 追加 0）

## 12. Human QA 想定質問（Pilot 用）
Q1 溜めの予告を見て「次に必殺が来る」と分かったか／Q2 必殺を受ける前に加護・盾を選べたか／Q3 7 体の敵が「別の問題」に感じられたか（道化・鬼将・魔獣の 3 戦）。

## 13. 実装しなかったこと・触っていないこと
src／runtime／Production／assets 0。`scripts/decision252/` は scratch（未コミット・`docs/evidence/decision252/*.txt` に写し）。docs のみ：本書・`docs/evidence/decision252/`・`docs/DECISIONS.md` 1 行。

## 14. CEO 判断が必要になる事項
無し（§6-3 該当 0）。Pilot 実装開始は §6-5 により CEO GO を待つ（本 Preflight は STOP）。

## 15. NEXT NOW（1 件）
**決定252 Pilot：§11 の実装 → paired-seed Gate → Human QA READY**（CEO GO 後・自動実装しない）。
