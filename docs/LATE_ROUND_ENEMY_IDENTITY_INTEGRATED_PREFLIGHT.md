# Late-Round × Enemy Identity 統合 Preflight — NO-GO（AI 判断・CEO 受容）

- 日付：2026-10-07
- 種別：**PREFLIGHT ONLY／docs-only／read-only**（npm／vite／vitest／tsc／Playwright／ブラウザ／build／simulation 0・runtime 変更 0）。既存 evidence JSON（`docs/evidence/decision252/sim252-final-F1.json`・`docs/evidence/decision260/sim260.json`）の読み取りパースのみ
- 判断主体：Preflight と NO-GO 判定＝**AI 判断**（CLAUDE.md §6-2）。方針の受容＝**CEO**（2026-10-07）。**新しい runtime Decision は作らない**
- 対象 runtime：master `202e476`（Production・`src/core` は決定264／266／267 で不変）
- 前提監査（同週）：Core Fun Health Audit（A：R6〜R7 の Decision Density が低い）・Enemy Identity Audit（B：試練・怨霊・龍神は R4 単峰の数値族）

## 0. 結論

| 項目 | 結論 |
|---|---|
| 問い | 「敵ごとに後半ラウンド（R5〜R7）で異なる判断を要求すれば、Late-Round Decision Density（A）と Enemy Identity（B）を同時に改善できるか」 |
| 判定 | **NOT SUPPORTED（1 レバーで両方は解けない）。R5 に限れば PARTIALLY** |
| 推奨 | **統合 Pilot：NO-GO**。R6〜R7 の空白は「7R は上限であって目標ではない。クライマックスは R4〜R5（決定246・CEO Human QA Q3『R4〜R6 まで緊張が続く』YES）」として**設計受容** |
| CEO 決定（恒久方針） | **「7R をすべて濃くする」こと自体を目的にしない。7R は上限。現在の実質的クライマックスである R4〜R5 を尊重する。R6〜R7 を無理に延命するための HP 増加／ATK 増加／AP 削減／新 mechanic 追加は行わない。** |

## 1. 根拠

### 1-1. A（R6〜R7 の空白）は敵非依存【実測】

| 証拠 | 値 | 出典 |
|---|---|---|
| reader の撃破 R（通常） | 魔獣 5.36〜龍神 5.94（幅 0.58R）。表の形（単峰／二峰／溜め）が違っても撃破 R はほぼ同じ | sim260 A0 `byEnemy` |
| R7 被ダメ | 7 敵すべて 0.0（reader・greedy とも） | F1 JSON `dmgByRound` |
| R6 敵行動の解決率（被ダメ÷表値の近似） | 7〜19%（到達率 62.7%・被ダメ 0.5〜2.1 に対し表値 7〜19） | F1 JSON・決定246 §5 |
| AP を R5〜R7 で削っても | 出す枚数 R5 3.4→3.1・R6 2.5→2.5、randomRO−reader −0.3pt | 決定260 A1 |
| 出した枚数／未使用 AP／1 択率 | R5 3.39／0.50／44.7% → R6 2.46／1.66／46.6% → R7 1.43／4.46／67.4% | sim260 `playedPerRound`・HDD §2-2 |
| R5 託宣の山（42〜72%） | reader の「残り回数 ≥ 残り R なら使う」規則の産物＝後半に守る対象が無いのは「残り R が少ない」こと | 決定246 harness |

→ 後半の空白は「AP 逓増 × 山札消化 × 加護 × 撃破テンポ」の敵非依存の構造。敵表を R6〜R7 でどう変えても**見えない**（決定252 K-A/K-B：R7 必殺 発動率 0%・道化 R6 アンコール到達 ≈35%）。

### 1-2. B を後半で深める「既存 kind の余地」が無い【コード】

| 語彙 | engine 上の意味 | 後半の「問い」に使えるか |
|---|---|---|
| `attack {amount}` | 単発 | 大きさのみ |
| `charge {label}` | 予告 0・次 R の予兆。`blocked`／`enemyBig` 不成立（`cardBonus.ts`） | 「自由 R」を作る＝greedy を楽にする（決定252 §3-1 で 2 段溜め棄却） |
| `multiAttack {hits}` | **合計と等価**（`intent.ts`・`round.ts`・per-hit 禁止） | 表示差のみ |
| `special {amount,name}` | 🔥表示・カットイン・Ⅵ倍率 | R6〜R7 では発動前に撃破 |
| 敵 guard／自己強化／自己回復／break | — | 決定216 NO-GO／決定252 §2-3 棄却 |
| cardBonus 条件 | blocked／enemyBig／lowHp／combo／charged のみ（ラウンド番号・敵 ID 条件は無い） | 新条件＝`src/core` 変更 |

→ 「答えの型」（盾＋加護／弱体／回復／撃破）を敵で変える force は既存 kind では作れず、新 kind は計 4 案棄却済み。

### 1-3. R5 は共有の窓だが、空なのは道化 1 体のみ

7 敵中 5 体（怨霊 18／龍神 16／機工師 必殺 24／鬼将 15／魔獣 15）は既に R5 に実の問いを持ち、試練は入門基準線（決定252 §3-1 据え置き）。R5 が空（被ダメ 0・溜め）なのは**道化だけ**＝「統合レバー」ではなく「1 敵の局所修正」。

## 2. 7 敵 R1〜R7 の「決定の質」（forced／real／trivial／none）

| 敵 | R1 | R2 | R3 | R4 | R5 | R6 | R7 |
|---|---|---|---|---|---|---|---|
| 試練 | trivial | trivial | trivial | **real** | real（弱） | none | none |
| 鬼将 | trivial | trivial | real（自由 R） | **forced** | real | none | none |
| 怨霊 | trivial | trivial | real | **forced** | **real**（第 2 峰 18・MEND 38%） | none | none |
| 機工師 | trivial | real（自由 R） | **forced** | real（主砲前に倒すか） | **forced／real** | none | none |
| 魔獣 | **real** | real | **forced**（型が違う） | real | trivial（tempo） | none | none |
| 龍神 | trivial | trivial | real | **forced** | real | none | none |
| 道化 | trivial | real（託宣先切り） | **forced** | trivial | **none（R5 で唯一）** | none | none |

forced／real は R2〜R5 に集中し、**R6〜R7 は 7 敵すべて none**。原因は表の値ではなく R6 の敵行動がそもそも解決されない（撃破の最頻値 R6＝「プレイヤーターンで倒す R」）。

## 3. 候補レバー比較（すべて棄却または局所）

| # | レバー | A への効果 | B への効果 | 衝突 | 判定 |
|---|---|---|---|---|---|
| L1 | 敵別「第二の問い」を R5 に（表 R4〜R7 の並べ替え・多重集合不変） | R5 のみ。実質 道化 1 体 | 道化のみ + | 決定252 確定表 → 新 Decision | 局所候補（統合レバーではない）。**着手せず記録のみ** |
| L2 | 神階Ⅰ「R6+ ×1.3」を通常にパターンとして持ち込む | R6 解決率 7〜19% で見えない。見せるには撃破 R を遅らせる＝HP sponge | 0 | 決定246 の逆行・難化と同義 | 棄却 |
| L3 | スコア／テンポ再設計 | 方策は勝率最適＝密度指標は動かない | 0 | 決定109・決定246 Known 5 | 棄却 |
| L4 | カード側の後半条件（新 BonusCond） | randomRO＝reader の構造は不変 | 0 | 決定255 CLOSED・`src/core` 変更 | 棄却 |
| L5 | 新 kind（貫通・呪い等） | 理論上のみ | 理論上のみ | 加護の約束／決定252／216／260 と衝突 | 棄却 |
| L6 | 撃破テンポを遅らせる（HP↑／火力↓／AP↓） | 難化 | 0 | 絶対条件 3 件に直撃 | 検討対象外 |

## 4. 反証（Red-team）と判定基準

- 最強の反論：後半の空白は敵非依存の 4 積（AP 逓増 × 山札消化 × 加護 × 撃破テンポ）で決まり、敵表の形は関与していない。§1-1 の証拠はすべてこれを支持する。
- 統合仮説を**反証**する最小テスト（未実行）：決定252 harness で 7 敵の R5〜R7 を同一値（例 13/9/6）に差し替えた paired-seed を走らせ、R5〜R7 の出した枚数・1 択率・未使用 AP が ±0.2 以内かつ撃破 R ±0.1 以内なら棄却確定。
- 統合仮説を**支持**し得る証拠（現状なし）：planner の R5 の答えの型が敵ごとに ≥10pt 分かれ、かつ R5 を変えると R6 解決率が動く結果。

## 5. 絶対条件との照合

| 条件 | 推奨（NO-GO＋設計受容） |
|---|---|
| 決定260 AP 平準化 NO-GO | OK（触れない） |
| HP／ATK 増のみの難化禁止 | OK |
| 決定252 FINAL SPEC | OK（L1 は要新 Decision のため着手しない） |
| 決定216 敵 guard NO-GO | OK |
| per-hit 禁止 | OK |
| Core（Intent × 7R × AP × seed）維持 | OK |
| 目的＝密度（難易度ではない） | OK |

## 6. 証拠ギャップ（記録のみ・実行しない）

1. 敵別×ラウンド別の密度指標（出した枚数・未使用 AP・1 択率）は全敵集計のみ。
2. reader の R5 託宣は規則の産物。R5 の「本当の判断」は planner の R5 答えの型で測る必要がある（未測定）。
3. R6 敵行動の解決率は近似値（`ENEMY_ACTED` 発火率は未記録）。
4. 人間側の後半体験：決定246 Q3 YES 以外に、R6〜R7 を「空白」と感じた CEO 所感は無い。A は sim 指標上の現象。

## 7. 変更しなかったこと

runtime／`rules.ts`／`enemies.ts`／カード／score／seed／Enemy Intent／7R：**0**。新 runtime Decision：**作らない**（CEO 指示）。道化 R4／R5 入れ替えは候補として記録するにとどめる。
