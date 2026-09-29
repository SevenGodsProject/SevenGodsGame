# LANE 2 — Combat Feel v2 PRE-AUDIT（Normal / Heavy / Bonus / God Strike / Kill の重さの階層）

- 日付：2026-09-27／作成：AI（Lane 2・監査／原因／設計／シミュレーションのみ）
- 対象コード：Production と同一の worktree `C:/Users/kimi1/SevenGodsGame-d229-rc`（`release/d229-sp-stage-layer-rc`・`babe3e5`）
- **runtime 変更 0**（`src/`・`public/`・`package*.json`・テスト・`docs/DECISIONS.md` は未編集。commit／branch／deploy なし。ブラウザ計測は行っていない＝サーバー起動 0）
- 証拠：`scripts/lane2-combat-feel/tierSim.audit.ts`（実エンジン `applyAction`＋Production の `planBatch` による決定論シミュレーション。7 神 × 7 敵 × 20 seed＝980 戦）、出力 `scripts/lane2-combat-feel/out/{static-tiers,sim-frequency,sim-before-after}.md`
  - 実行：`npx vitest run --config scripts/lane2-combat-feel/vitest.lane2.config.mjs`（main repo から。d229-rc の src を import するだけ）
- 本書の判断はすべて **AI 判断**（CLAUDE.md §6）。CEO 判断が必要な事項（§6-3）には該当しない（表示専用・数値／勝敗／save 不変）

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 「押したら数字が出た」の正体 | **1 戦で最も多く見る一撃（L1＝敵への着弾の 55%・6.7 回／戦）に「体の反応」がほぼ無い**（hit stop 0ms・ノックバック 2px・揺れ 2px＝描かれた敵の絵 141〜167px の約 1.3%）。見えるのは閃光・細い斬撃線・16px の数字だけ |
| 階層の構造的欠陥 | 重さが**受け手（敵）の着弾後の見た目だけ**で表現され、**時間（溜め）と攻め手（神）の軸が無い**。L1〜L4 の通常カードは全部「commit +90ms・神の突き 18px・同じ 0.34s」で着弾する。L2 と L3 の揺れ振幅は同じ 7px |
| 良くできている部分（触らない） | ⚡PAYOFF（決定224：stop 50・34px 金・金リング・`reward`×1.5）、神の一撃（1,600ms の溜め・stop 80・52px・画面揺れ 5px）、撃破（stop 90・52px・崩壊→「撃破」→決定226 の勝利の舞台） |
| **推奨 Narrow Pilot（1 つ）** | **Card Hit Weight Ladder v1**：カード本体の着弾（role=`card`／`passive`）だけを対象に、①**床**：L1 の hit stop 0→30ms・ノックバック 2→4px・揺れ 2→4px、L2 の hit stop 20→40ms　②**重さの段**：生 tier≥3 の本体だけ「重い突き」（0.52s・引き 13px→突き 28px）で**着弾 90→190ms**（溜め 100ms を追加）。新規 asset 0・新規 SE 0 |
| 触らないもの | ⚡（決定224）・神の一撃・撃破／勝利（決定226）・SP 舞台レイヤー（決定229）・数字サイズ・SE・入力ブロック・`src/core`・数値・save |
| コスト（シミュ） | 入力ブロック増分 **0ms**（着弾はすべて commit 後。操作ロックは cast 280ms とカットインだけ）。1 戦あたり見た目の延長：敵の静止 +238ms、重い着弾の遅れ +199ms（1.99 回／戦 × 100ms） |
| 不変条件の検証（シミュ 980 戦） | 本体→⚡の間隔 150ms の違反 0／本体→⚡の順序違反 0／神の一撃バッチで重い突きが出る件数 0（抑止）／最長の着弾（神の一撃 1,880ms）不変 |
| Verdict | **Pilot 実装 GO（AI 判断）**。Before／After を同じ seed で Human QA（§7） |
| NEXT NOW | §9：d229-rc（babe3e5）から Pilot ブランチを切り、§6 の 6 ファイルを実装 → §7 の数値判定 → Human QA |

---

## 1. ROOT CAUSE

### R1. 最頻の一撃に「体の反応」が無い（L1 が 55%）
- 分類は `feelTier.ts:25-30`（`rawTier`）：内部値 <10（表示 <100）が L1。カードの敵ダメージ効果 **32 個中 24 個が L1**（本体 21 個中 13・⚡11 個中 11。`out/static-tiers.md`、決定225 の「24/32」と一致）
- 980 戦シミュ（`out/sim-frequency.md`）：敵への着弾 12.13 回／戦のうち **L1 通常 6.70（55.2%）**・L2 通常 1.01（8.3%）
- L1 の反応（`battle.css:4393-4397`）：`--kb: 2px`、`hit-shake-l1`（`battle.css:3922`：±2px・0.28s）、hit stop `HIT_STOP_MS[1] = 0`（`enemyVfxTiming.ts:132`）。**L2 の hit stop 20ms も 60Hz で約 1 フレーム**＝知覚閾値付近【推測：一般に 2 フレーム（≈33ms）未満の hit stop は「止まった」と感じにくい】
- 結果：L1 で動くのは閃光（`impact-flash` brightness 2.4・0.25s）・斬撃線（`slash-l1` scale 0.8・opacity 0.85）・16px の数字（`battle.css:4453`）・`hit_l1`（120ms・gain 0.45×0.85）。**敵の絵そのものはほぼ動かない＝「数字が出た」**

### R2. 重さの軸が「受け手の着弾後」だけ。時間と攻め手に段が無い
- 通常カードの着弾は tier に関係なく `CARD_IMPACT_MS = 90`（`enemyVfxTiming.ts:123`、`combatTimeline.ts:143`）
- 神の突きは tier に関係なく `god-strike 0.34s`・最前 18px（`battle.css:4336-4346`、`PlayerPanel.tsx:126` は `burstHit` 以外で分岐しない）。構え（cast 中）も全カード共通の −7px（`battle.css:4332`）
- ⇒ 渾身の一撃（200）も速攻（40）も**同じ速さ・同じ動きで届く**。重さを示すのは届いた後の揺れ・数字・音だけ
- 時間の段があるのは神の一撃（`BURST_IMPACT_MS = 1600`、`enemyVfxTiming.ts:102`）だけ

### R3. Normal と Heavy の境目がぼやけている
- L2（クラス無し＝既定 `.enemy-reaction`、`battle.css:4385`）は `hit-shake`（`battle.css:828`：最大 ±7px・0.4s）、L3 は `hit-shake-l3`（`battle.css:3928`：最大 7px＋回転 0.6°・0.5s）＝**振幅が同じ**
- L1→L2 は 2px→7px の大きな段、L2→L3 は小さな段＝段の間隔が逆

### R4（参考・本 Pilot 外）：タップの瞬間に音が無い
- `card_play` SE は `CARD_PLAYED` イベント＝commit（タップ +280ms）で鳴る（`useBattleSound.ts:54-55`。`CardView`／`BattleScreen` にタップ時の `sfx` は無い）。決定225 §H の「0ms に `card_play`」は実際は 280ms。タップ直後 280ms は無音で、その後 `card_play`（60ms）と `hit_l1`（+90ms）が続けて鳴る。**入力応答の問題で、重さの階層とは別**（§4 候補 F・§9 の次候補）

---

## 2. CURRENT TIMING MAP（Production babe3e5・時刻はタップ＝0ms。commit＝280ms）

共通：タップ → `pendingCardUid`（入力ロック）→ `CARD_PLAY_REVEAL_MS = 280`（`useGameEngine.ts:73, 395-399`）→ commit。cast-flash（`battle.css:185-380`）・神の構え 220ms（`battle.css:4332`）は全カード共通。**入力ロックは cast 280ms と共鳴／敵カットインだけ**（`BattleScreen.tsx:296-302`）。着弾以降は入力をブロックしない。

| 段 | 着弾 | hit stop | 攻め手 | 敵の反応（kb／揺れ／閃光） | 数字 | 音（file・gain×0.85） | 画面 | 表示 HP 開始 |
|---|---|---|---|---|---|---|---|---|
| Normal L1（<100） | **370** | **0** | 突き 18px・0.34s | **2px**／±2px 0.28s／2.4 | 16px | `hit_l1` 120ms・0.45 | — | 460 |
| Normal L2（100〜） | 370 | 20 | 同上 | 5px／±7px 0.4s／2.4 | 22px | `hit_l2` 170ms・0.6 | — | 480 |
| Heavy L3（150〜） | **370** | 45 | **同上** | 8px／±7px＋0.6° 0.5s／2.55 | 30px（pop 1.22） | `hit_l3` 260ms・0.8 | — | 505 |
| Heavy L4（250〜） | 370 | 60 | 同上 | 11px／±11px 0.7s／2.8 | 40px | `hit_l4` 580ms・1.0 | WAAPI 3px・240ms | 520 |
| Bonus ⚡（決定224） | 本体 +150＝520 | 50 | — | 3px／±2px 0.26s／金 | **34px 金** | `reward`×1.5・0.7 | 金リング 110px | 660 |
| God Strike（共鳴 7） | **1,880** | 80 | 溜め→突き 24px・0.6s | L4＋burst | **52px** | `hit_l4`・1.0 | 5px・320ms／暗転カットイン | 2,050 |
| Kill（最後の一撃） | 本体の時刻（370） | 90 | 本体と同じ | L4・kb 14px → 崩壊 520ms | 52px（⚡なら金 52px） | L4＋`victory_sting` | 5px・320ms | → 崩壊 630・「撃破」1,010・報酬 1,860 |

出典（file:line）：
- 着弾時刻：`enemyVfxTiming.ts:123`（CARD 90）・`:127`（BONUS_GAP 150）・`:81/93/102`（burst 200/1300/1600）・`combatTimeline.ts:124-146`
- hit stop：`enemyVfxTiming.ts:132`（L1〜L4）・`:137`（⚡50）・`:139`（burst 80）・`:141`（final 90）、割当 `combatTimeline.ts:222-229`。reduced では 0（`combatTimeline.ts:185`）
- 敵の反応：`EnemyPanel.tsx:219-236`（`--impact-delay`/`--stop`）、CSS `battle.css:4373-4414`（juice-stop・react-l1/l3/l4/final/minor）、揺れ keyframes `battle.css:828`（L2）・`3922/3928/3936`（L1/L3/L4）
- 斬撃：`EnemyPanel.tsx:344-361`、`battle.css:962-990`・`3958-3960`（l1 0.8／l3 1.25／l4 1.55）。⚡は斬撃の代わりに金リング（`battle.css:6297-6314`）
- 数字：`useFloatingNumbers.ts:96-118`（delay＝着弾時刻・`max`＝神の一撃／最後の一撃）、サイズ `battle.css:4453-4489`（後勝ちで 16/22/30/40/52。3963-3976 の 15/19/26/34 は上書き済み）・⚡ `battle.css:6316-6336`
- 音：`useBattleSound.ts:34-49`（着弾時刻で予約）、`sound.ts:241-243`、`feelTier.ts:33-42`（gain）。wav 長さは `public/assets/se/*.wav` のヘッダから算出
- 画面揺れ：`useCombatPresentation.ts:126-141`（tier≥4／burst／final のみ・amp 3 or 5px）
- 撃破：`combatTimeline.ts:256-269`（planVictory）、`enemyVfxTiming.ts:155-164`、`battle.css:4543-4562`、`useCombatPresentation.ts:143-156`
- reduced-motion：`battle.css:4583-4618`（揺れ・突き・崩壊を停止、閃光・数字・HP 変化は残す）・`4193-4207`・`6345-6361`（⚡）

1 戦あたりの頻度（980 戦・heuristic balanced・`out/sim-frequency.md`）：

| 段 | 回／戦 | 割合 |
|---|---|---|
| Normal L1 | 6.70 | 55.2% |
| Normal L2 | 1.01 | 8.3% |
| Heavy L3 | 0.92 | 7.6% |
| Heavy L4（撃破でない） | 0.73 | 6.0% |
| Bonus ⚡ | 0.94 | 7.7% |
| Passive（得意技の追加） | 0.62 | 5.1% |
| God Strike（撃破でない） | 0.22 | 1.8%（共鳴 BURST 自体は 0.40 回／戦。うち 0.22 が撃破と重なる） |
| Kill | 1.00 | 8.2%（最後の一撃の役：card 65%・burst 22%・⚡ 8%・passive 5%） |

神ごとの差（抜粋）：寿楽は L2 が 0・L3 が 2.23 回／戦、笑蓮は Passive 2.91 回／戦、蒼毘は ⚡1.90 回／戦。**どの神でも L1 が 5.1〜7.6 回／戦で最多**。
限界：AI は Phase 3 監査の heuristic（`scripts/phase3-audit/harness.ts`）で normal 難易度の勝率 100%。実プレイヤーの手順・勝率とは違う。頻度の比は参考値。

---

## 3. COMMERCIAL GAP（根拠付き。推測は【推測】）

| # | Gap | 根拠 |
|---|---|---|
| C1 | **最頻の一撃に物理的な反応が無い** | コード：L1 kb 2px・揺れ 2px・stop 0（§1 R1）。描かれた敵の絵は PC 1508×660 で高さ 141〜167px（決定229 §0 実測）＝2px は約 1.3%。業界の game feel の定番（Vlambeer「The Art of Screenshake」・「Juice it or lose it」）は「小さな一撃でも対象が反応する」ことを最初に挙げる【推測：講演内容の要約。数値の出典ではない】 |
| C2 | **重い一撃に「溜め」が無い** | 渾身の一撃（3AP・200）と速攻（1AP・40）が同じ 90ms・同じ 18px の突きで届く（§1 R2）。アクション／格闘ゲームは重い技ほど予備動作が長い（anticipation）のが通例【推測：一般論。特定作品の数値は未確認】 |
| C3 | **Normal と Heavy の境目の段が小さい** | L2 と L3 の揺れ振幅が同じ 7px（§1 R3）。差は stop（20→45ms）・数字（22→30px）・閃光（2.4→2.55）だけ |
| C4 | 上位の段は既に商業水準に近い | 決定223 §4（hit stop ladder ◎）・決定225 §I/L/M（⚡・神の一撃・撃破は階層として成立）。**問題は下の段（Normal／Heavy）に集中している** |
| C5 | カードバトラーの通常攻撃との差【推測】 | Slay the Spire 系の通常攻撃は「攻め手が前に出る → 対象が白く光り小さく跳ねる → 斬撃 VFX → 数字」の 4 つが揃う印象。本作の L1 は 2 つ目の「跳ねる」が欠け、数字だけが目立つ（実機フレーム計測はしていない） |

「数字を大きくする」は答えではない：数字だけを大きくすると「数字が出るゲーム」の印象がむしろ強まる（決定225 §15-2「エフェクト追加を品質と誤認しない」）。**足りないのは数字ではなく、敵の体の反応と、重い一撃の溜め**。

---

## 4. 候補比較

| 案 | 内容 | 効く範囲（回／戦） | 良い点 | 却下理由／判定 |
|---|---|---|---|---|
| **A. Card Hit Weight Ladder v1** | 床（L1/L2 の stop・L1 の kb／揺れ）＋重さの段（生 tier≥3 の本体だけ溜め→重い突き・着弾 190ms） | 床 7.7＋重い 1.99 | 下の段の 2 つの欠陥（R1・R2/R3）を 1 つの仕組み（本体の着弾時刻と stop）で直す。上の段は不変。asset 0 | **採用** |
| B. 床だけ（L1/L2 の stop・kb） | A の①のみ | 7.7 | 最も安い | 単独だと L2 40ms と L3 45ms が近づき、**Normal と Heavy の差がさらに縮む**（階層が悪化）。A の一部として採用 |
| C. 重さの段だけ | A の②のみ | 1.99 | 階層が 1 段増える | 55% を占める L1 の「数字が出ただけ」が残り、CEO の主訴に届かない。A の一部として採用 |
| D. 画面揺れを L2/L3 へ・数字拡大 | WAAPI 揺れを tier≥2 へ、数字 +4〜8px | 9.4 | 派手 | 決定224 §11「画面揺れ・暗転は Tier 4/5 だけ」を侵食。インフレ・疲労。数字が目立つ方向＝主訴の逆。**却下** |
| E. 着弾スパーク／新 SE の重ね | 粒子・新しい合成音・`hit_l*` の多層化 | 全部 | 質感は上がる | 新 asset（音色の質は耳で未確認＝決定225 §O）。本 Lane の条件「新 asset を避ける」に反する。**却下（将来）** |
| F. タップ時に `card_play` を鳴らす（R4） | SE をタップ 0ms へ移す | 全カード | 入力応答が即時に | 重さの階層ではなく入力応答。二重再生の設計が要る。**本 Pilot 外・次候補**（§9 注記） |

---

## 5. ONE RECOMMENDED PILOT — Card Hit Weight Ladder v1

**一文で：** 通常カードの一撃に「敵が殴られた反応」の床を作り、重い一撃だけ「溜めてから届く」ようにする。⚡・神の一撃・撃破は一切変えない。

後（After）の階層（タップ＝0ms）：

| 段 | 着弾 | hit stop | 攻め手 | 敵 kb／揺れ | 数字 | 音 | 画面 |
|---|---|---|---|---|---|---|---|
| Normal L1 | 370 | **30**（←0） | 突き 18px | **4px／±4px 0.3s**（←2/±2） | 16px | `hit_l1` | — |
| Normal L2 | 370 | **40**（←20） | 突き 18px | 5px／±7px | 22px | `hit_l2` | — |
| Heavy L3 | **470**（←370） | 45 | **重い突き：引き 13px → 28px・0.52s** | 8px／±7px＋回転 | 30px | `hit_l3`（着弾に追従） | — |
| Heavy L4 | **470** | 60 | 重い突き | 11px／±11px | 40px | `hit_l4` | 3px |
| Bonus ⚡ | 本体 +150（重い本体なら 620） | 50 | — | 不変 | 34px 金 | `reward`×1.5 | 金リング |
| God Strike | 1,880 | 80 | 不変 | 不変 | 52px | 不変 | 不変 |
| Kill | 本体の時刻（重いカードなら 470） | 90 | 本体と同じ | 不変 | 52px | 不変 | 不変 |

hit stop の単調性：**L1 30 < L2 40 < L3 45 < ⚡50 < L4 60 < 神の一撃 80 < 撃破 90**（決定224 の「⚡ は L3 より上・L4 より下」を保持）。
時間の段：**Normal 370ms → Heavy 470ms → God Strike 1,880ms**（今は Normal＝Heavy＝370ms）。

シミュレーション（`out/sim-before-after.md`・980 戦・§6 の仕様をモデル化した `planAfter`）：

| 指標 | 値 |
|---|---|
| 重い突きのバッチ | 1.99 回／戦（うち撃破 0.35） |
| 神の一撃バッチで重い突きになる件数 | 0（抑止ルールどおり） |
| 敵の静止時間の増加 | +238ms／戦（L1 6.7 回 × 30ms＋L2 1.0 回 × 20ms＋passive 分） |
| 重い着弾の遅れ | +199ms／戦（1.99 × 100ms） |
| 入力ブロックの増加 | **0ms**（着弾は commit 後。次のカードは commit 直後から押せる） |
| 本体→⚡の間隔（150ms）違反／順序違反 | 0／0（⚡が重い本体の後に来るバッチ 28 件でも同じ間隔） |
| 撃破が重いカードのときの勝利の時刻表 | 崩壊 450・「撃破」830・報酬 1,680（commit 起点。軽い場合 350/730/1,580 から +100ms のみ・順序不変） |
| 最長の着弾 | 1,880ms（神の一撃）で不変 |

最速連打の影響：commit 後すぐ次のカードを押しても次の commit は ≥280ms 後。重い着弾は 190ms で必ずその前に届く（着弾が次のカードに追い越されることはない）。揺れの後半は今と同じく次の着弾で打ち切られる（既存挙動。重い場合は打ち切りが 100ms 早い＝§8 R2）。

---

## 6. FINAL SPEC（実装者がそのまま着手できる粒度）

前提：**ベースは Production と同じ `babe3e5`（d229-rc）**。main の作業ツリー（`feat/d224-premium-payoff-pilot`）は Production より古く、同じファイルに未 commit の差分がある（`combatTimeline.ts`・`enemyVfxTiming.ts`・`battle.css` 等）ため、そこから始めない。Lane 1 が `SevenGodsGame-d230` で `battle.css` を編集中＝CSS は**末尾に独立ブロックとして追記**し、衝突面を最小にする。

### 6-1. `src/components/battle/enemyVfxTiming.ts`（表示専用の定数。既存の `HIT_STOP_MS`・`BONUS_HIT_STOP_MS` と同じ置き場所）
- `HIT_STOP_MS` を `{ 1: 30, 2: 40, 3: 45, 4: 60 }` に（`:132`）。コメントに「L1 30 < L2 40 < L3 45 < ⚡50 < L4 60 < burst 80 < final 90」
- 追加：`export const CARD_HEAVY_IMPACT_MS = 190`（重い突き god-strike-heavy 0.52s の 36.5%＝最前。battle.css と一致）
- 追加：`export const HEAVY_STRIKE_MIN_TIER = 3`（FeelTier。閾値は `feelTier.ts` の `RULES.baselineDamagePerAp` 由来のまま＝新しい数値閾値は作らない）
- rules.ts には置かない理由：ゲーム数値ではなく演出時刻。決定162／224 の前例（`HIT_STOP_MS`・`BONUS_HIT_STOP_MS`）と同じ

### 6-2. `src/components/battle/combatTimeline.ts`（`planBatch`）
1. ループの前に前走査：`hasBurst = events.some(e => e.t === 'RESONANCE_BURST')`。既存と同じフラグ（enemyTurn／afterBurst／inBonus／inPassive）で「card 役の敵ダメージ」だけを拾い、`maxCardTier = max(damageFeelTier(amount + blocked))`
2. `const heavy = !ctx.reduced && !hasBurst && maxCardTier >= HEAVY_STRIKE_MIN_TIER`、`const cardImpactMs = heavy ? CARD_HEAVY_IMPACT_MS : CARD_IMPACT_MS`
3. `lastBodyAt` の初期値（`:111`）・card 役の `atMs`（`:143`）・selfCost の `atMs`（`:161`）を `cardImpactMs` 基準に。bonus／passive（カード後）は `lastBodyAt` 基準のまま＝自動で追従（間隔 150ms 不変）
4. `BatchPlan` に `strike: 'light' | 'heavy' | null` を追加（card 役の敵ダメージが無ければ null）。**撃破で tier を 4 に上書きする処理（`:181`）より前の生 tier で決める**（撃破だから重い、にはしない）
5. hit stop の割当（`hitStopFor`）は変更不要（テーブル参照のため）

### 6-3. `src/components/battle/useBattleFx.ts`
- `BattleFx` に `heavyStrike: boolean`（初期 false）。`godAttack > 0 ? batchPlan.strike === 'heavy' : prev.heavyStrike`（`burstHit` と同じ更新規則・`:549` の隣）
- `planBatch(newEvents, { enemyVisualType })`（`:354`）に `reduced: prefersReducedMotion()` を渡す（reduced では重い突きを出さない判定と `revealDelayMs` を着弾計画と一致させる）

### 6-4. `src/components/battle/BattleScreen.tsx` ／ `PlayerPanel.tsx`
- BattleScreen：`<PlayerPanel … heavyStrike={fx.heavyStrike} />`
- PlayerPanel（`:126`）：`attackKey > 0 ? (burstHit ? ' god-burst-strike' : heavyStrike ? ' god-strike god-strike-heavy' : ' god-strike') : ''`。DOM 構造・key は不変

### 6-5. `src/components/battle/battle.css`（**末尾に追記する 1 ブロック**。既存ルールは編集しない）
```css
/* === Combat Feel v2 Pilot：Card Hit Weight Ladder v1（表示専用） ===
   床：L1 の体の反応（kb 4px・±4px）。hit-shake-l1 は ⚡(react-minor)・自分側 L1 が使うので触らず、別の keyframes を使う
   重さの段：生 tier≥3 の本体だけ溜め→突き。最前 36.5%＝190ms＝enemyVfxTiming.ts の CARD_HEAVY_IMPACT_MS と一致 */
@keyframes hit-shake-light {
  0% { transform: translate(0, 0); }
  30% { transform: translate(-4px, 1px); }
  60% { transform: translate(4px, -1px); }
  100% { transform: translate(0, 0); }
}
.enemy-reaction.react-l1 {
  --kb: 4px;
  animation-name: juice-stop, hit-shake-light, impact-flash;
  animation-duration: var(--stop, 0ms), 0.3s, 0.25s;
}
@keyframes god-strike-heavy {
  0%    { transform: translate(calc(var(--atk-x, -1) * -6px),  calc(var(--atk-y, 0) * -6px))  scale(0.97); }
  24%   { transform: translate(calc(var(--atk-x, -1) * -13px), calc(var(--atk-y, 0) * -13px)) scale(0.95); }
  36.5% { transform: translate(calc(var(--atk-x, -1) * var(--strike-heavy, 28px)), calc(var(--atk-y, 0) * var(--strike-heavy, 28px))) scale(1.1); }
  62%   { transform: translate(calc(var(--atk-x, -1) * -4px),  calc(var(--atk-y, 0) * -4px))  scale(0.99); }
  100%  { transform: translate(0, 0) scale(1); }
}
.god-strike.god-strike-heavy img {
  animation:
    enemy-idle 3.4s ease-in-out infinite,
    god-strike-heavy 0.52s cubic-bezier(0.2, 0.8, 0.3, 1);
}
/* SP（決定229 の舞台）：神と敵が近いので突きは 22px（今の 18px の +4px まで） */
@media (max-width: 899px) {
  body.battle-viewport .player-panel { --strike-heavy: 22px; }
}
/* reduced-motion：上の 2 ルールは既存の reduced ルール（4583-4598）と同じ詳細度で後ろにあるため、ここで必ず打ち消す */
@media (prefers-reduced-motion: reduce) {
  .enemy-reaction.react-l1 { --kb: 0px; animation-name: none, none, impact-flash; }
  .god-strike.god-strike-heavy img { animation: none; }
}
```
- 注意（必読）：追記した `.enemy-reaction.react-l1` は既存の reduced 用ルール（`battle.css:4585`・同じ詳細度 0,2,0）より**後ろ**にあるため、reduced の打ち消しを同じブロックに置かないと reduced でも揺れが出る
- 向き：`--atk-x` は `.player-panel`（PC/SP とも −1、`battle.css:5264-5266`）から継承。決定229 の敵の反転（`.enemy-avatar { scale: -1 1; --atk-x: -1 }`、`battle.css:6711-6714`）は `.enemy-avatar` だけに効くので、`.enemy-reaction`（外側）のノックバック方向と着弾レイヤーの位置は不変

### 6-6. テスト（`combatTimeline.test.ts` に追加。既存テストは現状のまま通る見込み：L1/L2 の量を使う・atMs の固定値を見るのは軽い本体だけ）
1. L1/L2/L3/L4 本体の stopMs＝30/40/45/60、⚡50・burst 80・final 90、全体が単調増加
2. 生 tier≥3 の本体（例：`dmg('enemy', 20)`）→ `atMs === CARD_HEAVY_IMPACT_MS`・`strike === 'heavy'`／L2 以下 → 90・`'light'`
3. 同じバッチに `RESONANCE_BURST` → 本体 90・`strike === 'light'`（神の一撃は不変）
4. `reduced: true` → 本体 90・stop 0
5. 重い本体＋⚡：`bonus.atMs − body.atMs === BONUS_GAP_MS`、selfCost の atMs＝本体
6. 撃破：軽いカード（量 3）で `strike === 'light'`（撃破で tier 4 になっても重い突きにしない）、重いカード撃破で `planVictory` の各時刻が軽い場合 +100ms
7. `CARD_HEAVY_IMPACT_MS === Math.round(520 * 0.365)`（CSS の 0.52s・36.5% との同期を固定）

### 6-7. 不変条件・既存決定との整合
- `src/core` 変更 0・`Math.random` なし・カード名分岐なし（生 tier＝`damageFeelTier` のデータ由来）・数値／Intent／AP／7 ラウンド／seed／score／カード効果／save／gameVersion 不変
- 決定224：⚡ の 34px 金・撃破 52px 金・金リング・stop 50・`reward`×1.5・`react-minor`（`hit-shake-l1`）は**編集しない**。READY／cast の金の輪も不変
- 決定226：`planVictory`・`resolveVictorySkip`・勝利の舞台は不変（重いカードで撃破したときだけ時刻表全体が +100ms ずれる。順序・長さは同じ）
- 着弾計画から派生するもの（数字の delay・SE 予約・表示 HP・結果トースト `revealMs`・決定224 の callout＝`lastImpactMs + CALLOUT_AFTER_IMPACT_MS`）は**コード変更なしで重い本体に追従**（+100ms）。`visualHp.test.ts`・`decisionFeedback.test.ts` は相対時刻で検証しているため影響なし（確認済み）
- 決定229：`.enemy-stage`／`.player-stage` 内の着弾レイヤー、敵の `scale: -1 1`・`--atk-x: -1` は不変。SP の突きは 22px に制限

---

## 7. ACCEPTANCE CRITERIA

### 数値で判定（全部 PASS で Human QA へ）
| # | 判定 | 方法 |
|---|---|---|
| A1 | §6-6 の 7 テスト PASS、既存の `npm test` 全件 PASS、`npm run build` PASS、lint 0 | CI／ローカル |
| A2 | 入力ロックの長さ不変：タップ → 次のカードが押せるまで 280ms±1 フレーム（L1・重い・⚡ の 3 種） | ブラウザ probe（`scripts/decision229-battle-composition/fxprobe.mjs` と同じ起動手順・ASCII seed） |
| A3 | 重い本体：神の絵の最前（translate の極値）が commit +190±20ms、敵の `juice-stop` 開始が +190±20ms、数字・`hit_l3` の予約時刻も 190 | probe（`getComputedStyle`／`data-impact-at`） |
| A4 | L1：敵の `.enemy-reaction` の最大変位 ≥ 3.5px（今 ≈ 2px）、静止 30ms | probe（rAF で transform を採取） |
| A5 | 決定224 Regression SAME：⚡ 数字 34px 金（`#ffd166`）・撃破⚡ 52px（`#ffe08a`）・金リング 110px・`react-minor` の keyframes 名 `hit-shake-l1` | computed style 比較（Before/After） |
| A6 | 決定226 SAME：撃破 → 崩壊 → 「撃破」→ 勝利の舞台 → skip の動作が同じ（重いカード撃破は +100ms のみ） | 既存 victoryReveal テスト＋probe |
| A7 | 決定229 SAME：SP 360/390/430 で着弾中心がその側の絵の中 100%、敵の反転 `scale: -1 1`、SP の重い突きの神の絵の水平移動 ≤ 22px（今の 18px +4） | `fxprobe.mjs` |
| A8 | reduced-motion：重い突き・L1 の揺れ・ノックバック 0、hit stop 0、本体の着弾 90ms、閃光・数字・HP 変化は残る | `emulateMedia({ reducedMotion: 'reduce' })` |
| A9 | console error 0・PC（≥900px）のレイアウト差分 0（transform 以外） | probe |

### Human QA（同じ seed で Before／After。PC と SP 各 1 戦。例：大耀 × 蒼海の龍神、福永 × 任意）
1. 普通の一撃（40〜80）で、敵が「殴られた」と感じますか？（「数字が出ただけ」ではないか）
2. 重い一撃（渾身の一撃・一攫千金・号令込みの豪快な一撃）は、届く前から「重いのが来る」と分かりますか？
3. カードを続けて出すとき、もたつき・待たされる感じはありませんか？
4. ⚡・神の一撃・撃破は、重い一撃より上に見えますか？（逆転していないか）
5. 1 戦を通して、うるさい・疲れる感じはありませんか？

判定：Q1・Q2・Q4 が YES、Q3・Q5 が NO なら採用。Q3 が YES なら `CARD_HEAVY_IMPACT_MS` を 190→150 に下げて再 QA（1 回まで）。Q5 が YES なら床（L1 の揺れ 4px）を 3px に戻す。

---

## 8. Risks ／ 触れないもの

| # | リスク | 程度 | 対策 |
|---|---|---|---|
| R1 | 重い突き 100ms の溜めが「もたつき」に見える | 中 | 入力は止めない（A2）。Human QA Q3。190→150 の 1 段階だけ調整可 |
| R2 | 最速連打時、重い一撃の揺れが次の着弾で今より 100ms 早く打ち切られる | 低 | 既存挙動（新しい計画でリアクションを再マウント）。通常の間合いでは発生しない |
| R3 | バフで tier が変わる（号令込みの豪快な一撃は 170＝重い）→ 同じカードでも重い／軽いが変わる | 低（意図どおり） | 「実際に与えた量」で重さが決まる＝正しい情報。cast の構え（カード定義基準）とは一致しない場合がある |
| R4 | SP で神の突きが敵の絵に少し重なる（決定229 で既知の「攻撃の瞬間に触れる」が +4px） | 低 | 22px に制限・A7 で計測 |
| R5 | reduced の打ち消し漏れ（詳細度・順序） | 中 | §6-5 のブロック内に reduced を必ず置く・A8 |
| R6 | `battle.css` を Lane 1（d230）が編集中 | 中 | 末尾追記のみ。merge は Lane 1 の後 |
| R7 | シミュの AI は勝率 100%（heuristic）で実プレイと手順が違う | 低 | 頻度は比の参考。判断（L1 が最多）は静的データ（24/32）でも同じ |
| R8 | 床の底上げで「全部が揺れる」インフレ | 低 | 画面揺れは L4 以上のまま。数字サイズ・SE は不変。L1 の揺れは 4px（L2 の 7px 未満） |

触れないもの：⚡PAYOFF 一式（決定224）・READY／cast の金の輪・神の一撃（カットイン・バナー・時刻）・撃破／崩壊／勝利の舞台（決定226）・SP 舞台レイヤー（決定229）・数字サイズ（16/22/30/40/34/52px）・SE の音源と gain・画面揺れの条件・cast 280ms・入力ロック・結果トースト／ミニ結果（決定203/205 の可読性）・`src/core` と rules.ts・save・asset。

---

## 9. NEXT NOW（1 つ）

**d229-rc（`babe3e5`）から Pilot ブランチを切り、§6 の 6 ファイル（enemyVfxTiming.ts・combatTimeline.ts・useBattleFx.ts・BattleScreen.tsx・PlayerPanel.tsx・battle.css 末尾追記）とテスト 7 件を実装し、§7 の A1〜A9 を計測して Before／After の同 seed Human QA に出す。**

（Pilot 採用後の次候補メモ：§4 F「タップ 0ms で `card_play`」＝入力応答。今回の階層とは独立に小さく検証できる）

---

## 10. Pilot 実装・Fast Gate（2026-09-27・CEO 実装 GO を受けて・AI 判断）

- worktree：`C:/Users/kimi1/SevenGodsGame-lane2`（branch `feat/lane2-hit-weight-ladder`、base＝`release/d230-reso-badge-rc` `45bfc9e`＝決定230 RC）。**未 commit・未 push・deploy なし**
- 本節の判断はすべて AI 判断（CLAUDE.md §6）。表示専用で §6-3 に該当しない。**採用は Human QA の後**（数値だけで採用を宣言しない）

### 10-1. 変更ファイル（`git diff --numstat`：追加／削除）

| ファイル | +/− | 内容 |
|---|---|---|
| `src/components/battle/enemyVfxTiming.ts` | +12/−1 | `HIT_STOP_MS` を `{1:30, 2:40, 3:45, 4:60}`、`CARD_HEAVY_IMPACT_MS = 190`、`HEAVY_STRIKE_MIN_TIER = 3`（§6-1 どおり） |
| `src/components/battle/combatTimeline.ts` | +33/−3 | 前走査で card 役の生 tier 最大 → `heavy = !reduced && !hasBurst && tier≥3`、`cardImpactMs` を本体・`lastBodyAt`・selfCost に適用、`BatchPlan.strike`（§6-2 どおり） |
| `src/components/battle/useBattleFx.ts` | +8/−1 | `heavyStrike`（`burstHit` と同じ更新規則）、`planBatch` に `reduced: prefersReducedMotion()`（§6-3） |
| `src/components/battle/PlayerPanel.tsx` | +4/−1 | `heavyStrike?`（既定 false）→ `god-strike god-strike-heavy`。DOM・key 不変（§6-4） |
| `src/components/battle/BattleScreen.tsx` | +1/−0 | `heavyStrike={fx.heavyStrike}` |
| `src/components/battle/battle.css` | +37/−0 | **末尾に 1 ブロック追記のみ**（既存ルールの編集 0）。reduced の打ち消しを同じブロック内に置いた |
| `src/components/battle/combatTimeline.test.ts` | +113/−0 | §6-6 の 7 件＋CSS 衝突面のガード 1 件＝8 件追加 |

`src/core` 0・`public/` 0・`package*.json` 0・`docs/DECISIONS.md` 0・新規 asset 0・新規 SE 0。

### 10-2. 仕様との差分（1 件・理由付き）

- **D1：L1 床の CSS セレクタを `.enemy-reaction.react-l1:not(.react-minor)` にした**（§6-5 は `.enemy-reaction.react-l1`）。
  理由：⚡の小反応は `EnemyPanel.tsx` で tier 1 として描かれ、クラスが **`enemy-reaction react-l1 react-minor` の両方**になる。§6-5 のままでは、末尾追記（同じ詳細度 0,2,0・後勝ち）が決定224 の `.enemy-reaction.react-minor`（`hit-shake-l1`・kb 3px・`juice-bonus-flash`）を上書きし、⚡の反応が `hit-shake-light`／kb 4px／`impact-flash` に変わってしまう（決定224 Regression）。`:not(.react-minor)` で⚡を除外し、reduced の打ち消しも同じセレクタにした。ブラウザ実測で⚡反応は Before と同一（kb 3px・`hit-shake-l1`・stop 50・最大変位 3.00px）。テスト 8 でも固定
- それ以外（定数値・置き場所・計画ロジック・クラス名・keyframes・SP 22px・reduced）は §6 のとおり

### 10-3. Automated（lane2 worktree）

| 項目 | 結果 |
|---|---|
| 追加テスト（`combatTimeline.test.ts`・8 件） | PASS |
| 対象 6 ファイル（`battleViewportLayout`・`combatTimeline`・`godStrikeStage`・`readyMaterial`・`victoryReveal`・`pressFeel`） | 67/67 PASS |
| 全件 `npx vitest run --dir src` | **93 files／1,175 tests PASS**（1,167＋8） |
| `npx tsc -b --noEmit` | 0 error |
| `npx oxlint src` | 0 |
| `rm -rf dist && npm run build` | PASS（dist は Human QA 用に残置） |

Bundle（vs `SevenGodsGame-d230-rc/dist`）：JS 437,394 → 437,925 B（**+531 B**、gzip 比 +193 B）、CSS 158,356 → 159,521 B（**+1,165 B**、gzip +277 B）。

### 10-4. ブラウザ計測（A1〜A9）

方法：After＝`127.0.0.1:4211`（lane2 dist）、Before＝`127.0.0.1:4212`（d230-rc dist・再 build なし）。ASCII seed のみ。
- 新規 `scripts/lane2-combat-feel/hitprobe.mjs`：1 戦を通して、新しく付いた神の突き（`.player-avatar-wrap`）と敵の反応（`.enemy-reaction`）の **CSS animation を一時停止して `currentTime` を 5ms 刻みで動かし、実際に計算される transform を読む**（決定論スキャン）。ヘッドレスは描画直後に 250ms 前後のメインスレッド停滞があり、rAF 採取では ±20ms を判定できないため（煙試験で確認）。時刻は **commit（クラスが付いた瞬間）＝0**。加えて数字の `animation-delay`、SE の予約（`AudioBufferSourceNode.start(when)`）、入力ブロック（タップ→ラウンド終了ボタンが押せるまで）を採取
- 回した組：PC 1508×660・SP 390×844 × {大耀×蒼海の龍神 `d223-pilot-01`（READY／⚡／撃破）、寿楽×双牙の魔獣 `d225-juraku-juuma`（連撃・重い一撃 3 回）}、SP 360/430 × 寿楽×魔獣（22px の幅依存）、reduced（PC 寿楽×魔獣・SP 大耀×龍神）＝各 8 戦 × Before/After。出力 `out/pilot/hit-{after,before}.json`・集計 `out/pilot/hit-summary.txt`（`hitsum.cjs`）
- 回帰：`gate.mjs`（決定224/226。pc-d224・sp-d224・pc-win・sp-win）、`fxprobe.mjs`（決定229。360/390/430 × 2 組）、`layoutgate.mjs`（PC 1508 × 2 組）を decision229 から複製して実行（`out/pilot/gate-*`・`fx-*`・`layout/`）。複製時の変更は出力先・`img.decode()` 失敗時の再試行・スクリーンショット無効化（`NOSHOT`）だけ

| # | 判定 | 実測（After／Before） | 結果 |
|---|---|---|---|
| A1 | テスト・build・lint | §10-3 のとおり | **PASS** |
| A2 | 入力ブロック不変 | 入力ロックのコード（`CARD_PLAY_REVEAL_MS` 280・`BattleScreen` のロック条件）は差分 0。同じ手 35 組の対比較（LEAN 実行＝採取なし・`blockpair.cjs`・`out/pilot/block-summary.txt`）：差（After−Before）の中央値 **+4ms**・平均 **−41ms**。最小値 After 303〜326ms／Before 291〜324ms（280ms＋ポーリング 1〜3 フレーム）。着弾（最大 190ms）は commit 後でロックの外 | **PASS**（注：ヘッドレスは 1 手ごとに 300〜1,400ms の揺れがあり「280ms±1 フレーム」の直接判定はできない。系統的な増加が無いことで判定） |
| A3 | 重い本体の同期 | 神の突きの最前 **commit +185ms**（5ms 刻み。keyframe 36.5%＝189.8ms）・PC **27.97px**／引き **13px**。敵の `juice-stop` 開始 **+190ms**（delay 190・stop 45）。数字 `animation-delay` **190ms**、`hit_l3`（260ms 音源）の予約 **+190**（Before +90）。重い一撃の撃破も本体 190・数字 190・`hit_l4` +190。重い突きの観測 n＝PC 4・SP 4・360/430 各 3 | **PASS**（190±20 内） |
| A4 | L1 の体の反応 | `.enemy-reaction` 最大変位 **4.12px**（Before 2.24px）、`juice-stop` **30ms**（Before 0）、kb 4px・`hit-shake-light` 0.3s。L2 は stop **40ms**（Before 20）・7px 不変 | **PASS**（≥3.5px） |
| A5 | 決定224 SAME | `probe224` SAME（⚡ 34px `rgb(255,209,102)`・撃破⚡ 52px `rgb(255,224,138)`・撃破本体 52px）。実戦の⚡：34px 金 ×2・金リング 2・ignite 2・READY `⚔ 豪快な一撃`（Before と同一）。⚡反応は `hit-shake-l1`・kb 3px・stop 50・変位 3.00px（Before と同一）。`reward` SE の予約（510ms 音源 +240）も同一 | **PASS** |
| A6 | 決定226 SAME | gate 比較：sp-d224・pc-win（初回／2 回目 skip）・sp-win（初回／2 回目 skip）は全項目 SAME（舞台 live・神名・「初めての勝利」・skip・報酬・再戦・jingle・スコア 7,900／8,090・手順同一）。pc-d224 は初回に舞台の採取モードが A live／B backdrop と出たが、**再実行で両方 live＝採取時刻のゆらぎ**（`gate-*-r2`）。順序（崩壊 < 撃破 < 結果 < 操作可能）は全ケースで保持。重いカードの撃破は本体 190・数字 190（+100ms のみ）。`victoryReveal` テスト PASS | **PASS** |
| A7 | 決定229 SAME | 着弾中心がその側の絵の中：After 360 18/18・12/12、390 15/15・15/15、430 16/16・11/11（**100%**）、Before も 100%。名札への重なり 0。SP の重い突きの水平移動 **21.97px**（360/390/430 とも。≤22px）、PC 27.97px。敵の反転 `scale:-1 1` は fxprobe の絵判定が前提としており、判定は Before と同じく成立 | **PASS** |
| A8 | reduced-motion | 神の突きのアニメーション 0（`god-strike`・`god-burst-strike` とも animation なし）、重い突きは計画側で出ない（着弾 90ms・`god-strike-heavy` クラス 0）、反応は `impact-flash` のみ（揺れ・kb 0）、hit stop（`--stop`）0ms、数字は PC 6／SP 9 件とも残る、SE・HP 変化の予約は Before と同一 | **PASS** |
| A9 | console error 0・PC レイアウト差 0 | 全実行で console／page error **0**（hitprobe 16 戦＋LEAN 8 戦・gate 10 シナリオ・fxprobe 12 戦・layoutgate 4 戦）。PC 1508 の列幅・名札・共鳴パネル・名札の重なり・切れ・横スクロールは **SAME**。差があったのは絵の高さ（突き／待機の scale）とブロック数値の pop だけ＝transform 中の採取 | **PASS** |

補足：hit stop の階層は実測でも **L1 30 < L2 40 < L3 45 < ⚡50 < L4 60 < 神の一撃 80 < 撃破 90**（L4 60 は撃破でない L4 が今回の seed に出なかったためテスト 1 で固定）。時間の段は Normal 90 → Heavy 190 → 神の一撃 1,600（commit 起点）。神の一撃（1,600ms・24px・stop 80・52px）は Before と完全に同じ。

### 10-5. Known Risks

| # | リスク | 程度 | 状態 |
|---|---|---|---|
| K1 | 重い突きの溜め 100ms が「もたつき」に見える（§8 R1） | 中 | 入力は止めない（A2）。Human QA Q3 で判定。YES なら `CARD_HEAVY_IMPACT_MS` 190→150（CSS の 0.52s／36.5% も同時に合わせる）を 1 回だけ |
| K2 | SP で神の絵が敵の絵に触れる瞬間が +4px（§8 R4） | 低 | 22px に制限済み。寿楽×魔獣は **Before でも接触**（rAF 採取の最小間隔 Before −4〜−17px／After −6〜−16px。ヘッドレスのフレーム落ちで粗い）。悪化は計測誤差の範囲 |
| K3 | 同じカードでもバフ込みの量で重い／軽いが変わる（§8 R3） | 低（意図どおり） | 実測：大耀×龍神の重い一撃は撃破の 1 回のみ、寿楽×魔獣は 3 回／戦 |
| K4 | battle.css を他 Lane が編集 | 中 | 末尾追記 37 行のみ。merge は決定230（Production）の後。`:not(.react-minor)` の前提（⚡反応のクラス構成）が変わったらテスト 8 が落ちる |
| K5 | ブラウザ計測の限界 | 低 | 時刻は CSS animation の実 timing を止めて読む方式（描画フレームの見え方そのものではない）。入力ブロックはヘッドレスの揺れが大きく、実機の体感は Human QA で確認 |
| K6 | 重い本体の後の⚡は commit +340ms | 低 | 間隔 150ms は不変（テスト 5）。今回の seed では重い本体＋⚡の組は出なかった（ブラウザ未観測・テストのみ） |

### 10-6. Human QA（必須）

- **Before**：決定230 build＝`C:/Users/kimi1/SevenGodsGame-d230-rc/dist`（`cd /c/Users/kimi1/SevenGodsGame-d230-rc && npx vite preview --host 127.0.0.1 --port 4212 --strictPort`）
- **After**：`C:/Users/kimi1/SevenGodsGame-lane2/dist`（`cd /c/Users/kimi1/SevenGodsGame-lane2 && npx vite preview --host 127.0.0.1 --port 4211 --strictPort`）
- 同じ seed で PC と SP 各 1 戦：
  - `http://127.0.0.1:4211/?seed=d225-juraku-juuma` ↔ `http://127.0.0.1:4212/?seed=d225-juraku-juuma`（寿楽 × 双牙の魔獣：**重い一撃が 1 戦 3 回**・連撃・神の一撃・撃破が重い一撃）
  - `http://127.0.0.1:4211/?seed=d223-pilot-01` ↔ `http://127.0.0.1:4212/?seed=d223-pilot-01`（大耀 × 蒼海の龍神：READY→⚡・L1/L2 の床・神の一撃）
- 質問（§7 のとおり）：
  1. 普通の一撃（40〜80）で、敵が「殴られた」と感じますか？（「数字が出ただけ」ではないか）
  2. 重い一撃（渾身の一撃・一攫千金・号令込みの豪快な一撃）は、届く前から「重いのが来る」と分かりますか？
  3. カードを続けて出すとき、もたつき・待たされる感じはありませんか？
  4. ⚡・神の一撃・撃破は、重い一撃より上に見えますか？（逆転していないか）
  5. 1 戦を通して、うるさい・疲れる感じはありませんか？
- 判定：Q1・Q2・Q4 が YES、Q3・Q5 が NO なら採用。Q3 が YES なら 190→150 で再 QA（1 回まで）。Q5 が YES なら L1 の揺れ 4px → 3px

### 10-7. Verdict

**Fast Gate PASS（A1〜A9 すべて PASS）→ PENDING HUMAN QA**。仕様との差分は D1（⚡の反応を守るためのセレクタ限定）の 1 件だけ。commit・merge・release はしていない。サーバー（4211/4212）は停止済み。

---

## 11. Human QA（1 回目）と調整 v1.1（2026-09-27）
### 11-1. CEO Human QA（1 回目）— **PASS WITH MODIFICATION**
Q1 普通の攻撃でも殴った感じ **YES**／Q2 重い攻撃が事前から重そう → 質問の意味が直感的に伝わらず、再確認／Q3 連続使用 → **多少のもたつき**／Q4 ⚡・神の一撃・撃破が格上 **YES**／Q5 うるさい・疲れる **NO**（問題なし）。
維持：L1 の反応（30ms・4px）・⚡ の階層・神の一撃・撃破・決定224／226／229。

### 11-2. 調整 v1.1：重い一撃の溜め 190 → 150ms（事前に用意した調整案）
- `enemyVfxTiming.ts`：`CARD_HEAVY_IMPACT_MS` 190→**150**
- `battle.css`（Pilot の追記ブロック内）：`god-strike-heavy`（0.52s）の引き 24%→**16.35%**（85ms）・最前 36.5%→**28.85%**（150ms）。**突きの速さ（引き→最前 65ms）・引き 13px・突き 28px（SP 22px）は据え置き**、溜めの時間だけ短縮
- `combatTimeline.test.ts`：テスト 6 の「撃破時の勝利の時刻表のずれ」を固定値 100 から `CARD_HEAVY_IMPACT_MS − CARD_IMPACT_MS`（＝60ms）に、テスト 7 を 28.85% に
- damage／AP／Seed／score／カード効果／入力ロックは変更なし

### 11-3. Fast Gate（v1.1）
| 項目 | 結果 |
|---|---|
| Automated | targeted 6 files・**67 PASS**／full 93 files・**1,175 PASS**／tsc 0／lint 0／clean build（`index-hHIFle-A.js`／`index-1fDLvVaw.css`）。1 回目の full で `balanceSim` が並行負荷でタイムアウト → 単独 11/11 PASS → 負荷なしで全件 PASS |
| 重い突き（`hitprobe.mjs`・寿楽×双牙の魔獣・PC 1508／SP 390／SP 360） | 最前・着弾・敵の反応開始とも **150ms**（Before 190）。引き 13px・突き PC 28px／SP 22px |
| 維持（Before＝Production と同値） | L1：止まり 30ms・変位 4.12px／⚡：240ms・34px 金・止まり 50ms／神の一撃：1,600ms・止まり 80ms／撃破：止まり 90ms・52px |
| 撃破が重い一撃のとき | 勝利の時刻表のずれ +100ms → **+60ms** |
| console error | 0 |
| 決定224／226／229 | 変更は時刻の定数 1 つとキーフレームの % だけ。§10 の証跡を再利用（再実行なし） |

### 11-4. Human QA（2 回目・1 回だけ）
- Before＝Production `45bfc9e`（`:4195`）／After＝v1.1（`:4196`）・LAN `192.168.11.6`・一時 Firewall `Lane2 QA (temp)` を継続使用
- 問い（2 問・YES／NO）：①重いカードを出した瞬間、敵に当たる前の神の動きを見て「強い攻撃が来る」と感じますか？ ②カードを続けて出したとき、さっきよりテンポが良くなりましたか？
- 判定：Q1・Q2 とも YES なら Lane2 Human QA PASS。NO があれば自動で追加調整せず停止

---

## 12. 決定232 — Human QA（2 回目）PASS と Release Gate（2026-09-27）

### 12-1. CEO Human QA（v1.1）— **PASS**
Q1 重いカードで、当たる前の神の動きから「強い攻撃が来る」と感じる **YES**／Q2 v1 よりテンポが良くなった **YES**。**採用値：重い一撃の溜め 150ms。v1.1 を Final とし、これ以上の調整はしない（CEO）。** 本 Pilot を **決定232 Card Hit Weight Ladder v1.1** とする（決定231 は Lane3 のカードのコスト珠修正の候補として予約済み）。

### 12-2. Release Gate — **PASS／Blocker 0 → PRODUCTION RELEASE READY（CEO 承認待ち）**
| 項目 | 結果 |
|---|---|
| commit | Human QA 済みの v1.1 差分をそのまま local commit **`245ecdc`**（`feat/lane2-hit-weight-ladder`・7 ファイル +211／−6。差分は `scripts/lane2-combat-feel/out/pilot/lane2-v1.1-qa.diff`） |
| RC | `release/d232-hit-weight-rc`＝**`245ecdc`**（新規 worktree `C:/Users/kimi1/SevenGodsGame-lane2-rc`・`npm ci`）。親は master＝origin/master＝**`45bfc9e`**＝clean Production の上に commit 1 つ・worktree clean |
| Human QA 済みとの一致 | RC clean build の **CSS `index-1fDLvVaw.css`（md5 `faca49ef…`）・JS `index-hHIFle-A.js`（md5 `efb4d67a…`）が Human QA の After と byte 同一** |
| Automated | targeted 6 files・**67 PASS**／tsc 0／lint 0／clean build PASS。full は 1,170 PASS＋5 件がタイムアウト（他の 3 レーンが並行で計測中の CPU 負荷。対象は `src/core` の重いシミュレーション `balanceSim`／`replay/actionLog`／`replay/determinism`）→ 3 ファイルを単独で再実行して **30/30 PASS**。RC は `src/core` の差分 0 のため、決定論・リプレイへの影響はない |
| Isolation | 変更は `src/components/battle/` の 7 ファイルのみ（`BattleScreen.tsx`・`PlayerPanel.tsx`・`battle.css`・`combatTimeline.ts`・`combatTimeline.test.ts`・`enemyVfxTiming.ts`・`useBattleFx.ts`）。`src/core`／`public`（assets 210 ファイル md5 一致）／package 差分 0。save・gameVersion・`Math.random`・決定213／H3 の混入 0 |
| 決定224／226／229／230 | Fast Gate（§10）と v1.1 計測（§11-3）の証跡を再利用：⚡ 34px 金・撃破⚡ 52px 金・金リング・SE、勝利の流れ（重い撃破は +60ms）、SP 着弾 100%・敵反転、PC 静的 SAME。v1.1 の変更は定数 1 つとキーフレームの % だけ |
| Bundle（Production `45bfc9e` 比） | JS 437,394→437,925B（**+531B**・gzip +187B）／CSS 158,356→159,525B（**+1,169B**・gzip +278B）／新規 asset 0 |
| Blockers | **0** |
| Rollback 先 | 現 Production deployment **`6688164950`**（`45bfc9e`・status success） |
| Release 手順（CEO 承認後のみ・未実施） | `git fetch . release/d232-hit-weight-rc:master`（fast-forward `45bfc9e`→`245ecdc`）→ `git push origin master` → 配信 bundle と RC の md5 一致確認 → Narrow Production Smoke（重い突き 150ms・L1 30ms／4px・⚡・神の一撃・撃破・勝利・console error） |

### 12-3. 後片付け
Human QA サーバー（:4195／:4196）は停止。一時 Firewall `Lane2 QA (temp)`（2 本）は残っている（削除は UAC が必要。管理者 PowerShell：`Remove-NetFirewallRule -Group "Lane2 QA (temp)"`）。待ち受けるサーバーは 0。

**状態：決定232 = Human QA PASS（CEO）／Release Gate PASS（AI 判断）／PRODUCTION RELEASE READY — CEO 承認待ち。** merge／push／deploy なし。

---

## 13. 決定232 Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-27 JST・CEO 承認）
| 項目 | 値 |
|---|---|
| Release 直前 | master＝origin/master＝`45bfc9e`／RC `245ecdc`・worktree clean・`master..RC`＝commit 1 つ（7 ファイル） |
| merge／push | `git fetch . release/d232-hit-weight-rc:master`（fast-forward）→ `git push origin master`（15:41 JST・`45bfc9e..245ecdc`） |
| Vercel | deployment **`6689024801`**（`245ecdc`・Production）success（2026-09-27T06:41:31Z） |
| 配信 bundle | `index-hHIFle-A.js`／`index-1fDLvVaw.css`＝RC build と **md5 一致**（＝Human QA の After と同一）。配信 JS に決定213 の一致 0 |
| Rollback 先 | **`6688164950`**（`45bfc9e`・決定230） |

### 13-1. Narrow Production Smoke（`https://seven-gods-game.vercel.app`）
| 確認 | 結果 |
|---|---|
| 重い一撃（`hitprobe.mjs`・寿楽×双牙の魔獣 PC／SP・大耀×龍神 PC） | 突きの最前・着弾・敵の反応 **150ms**、引き 13px、突き PC 28px／SP 22px（Human QA 時と同値） |
| L1 の反応 | 止まり 30ms・変位 4.12px・`hit-shake-light` |
| ⚡ の階層 | 240ms・34px 金 `rgb(255,209,102)`・止まり 50ms。撃破⚡ 52px |
| 神の一撃 | 1,600ms・止まり 80ms・24px |
| 撃破 | 止まり 90ms・52px（重い一撃での撃破は 150ms） |
| 勝利の流れ（決定224／226・`gate.mjs` pc-d224／pc-win／sp-win） | READY・点火・金リング・カットイン・⚡ SAME、勝利の舞台・初撃破・skip・スコア 8,090・報酬・再戦 SAME。1 回目の SP 初撃破だけ舞台の記録時点がずれ（既知の採取タイミングの揺れ）、単独再実行で一致 |
| 決定229 構図（`fxprobe.mjs` SP 390） | 着弾中心 26/26 が絵の中・名札との重なり 0 |
| 決定230（`audit.mjs` SP 390 × 蒼毘・大耀） | 「共鳴」1 行・得意技バッジ札の中（2 行）・画面外 0 |
| console error | 0（全 run） |
- 証跡：`scripts/lane2-combat-feel/out/prod232/`・`scripts/decision230-reso-badge/out/smoke232/`

### 13-2. コア試験の運用（CEO 指示・2026-09-27）
Release Gate の full テストで出た 5 件のタイムアウト（`balanceSim`／`replay/actionLog`／`replay/determinism`）は、並行レーンのブラウザ計測の負荷下で発生し、単独再実行で 30/30 PASS・RC の `src/core` 差分 0 だった。**今後、Release Gate で重い core simulation（balance／replay／determinism 等）を実行するときは、他レーンの重いブラウザ計測と同時に実行しない**（他レーン全体は止めない。Audit・docs・design 等の軽作業は並行可）。

**Decision232 Card Hit Weight Ladder v1.1 = PRODUCTION LIVE / CLOSED。** Production＝master＝origin/master＝**`245ecdc`**。
