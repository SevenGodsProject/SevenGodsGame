# Lane 1 — Threat Branch Pilot v1.1（CEO 条件付き GO 後：hard しきい値・文言監査・7 体展開設計）

**状態：** CEO 実プレイ QA 4／4 PASS（2026-10-17・`LANE1_THREAT_BRANCH_PILOT_V1.md` §8-1）を受けた**条件付き GO** の続き。branch `feat/lane1-threat-pilot-v1-1`（起点 `699c59c`＝Pilot v1 完成形）。ローカル commit のみ・push 0・merge 0・tag 0。
**本書は AI 判断の記録**（CLAUDE.md §6-2・§6-6）。CEO 判断は §0 と §1 に明示した箇所だけ。`docs/DECISIONS.md` 本体は未編集（行ドラフトは §0）。【Planner／Dev】記録・2026-10-17。

---

## 0. `docs/DECISIONS.md` 行ドラフト（決定282（候補）・本体は PM が統合時に転記）

| 日付 | 内容 |
|---|---|
| 2026-10-17 | 決定282（候補）**Threat Branch Pilot v1「業斧の鬼将・軍略」CEO 実プレイ QA 4／4 PASS → 条件付き GO（Pilot 継続採用。Production 公開・既存 7 体への展開は未承認）＋ v1.1：hard の分岐しきい値を難易度別（normal 0.5／hard 0.6）に**。**CEO 判断（2026-10-17）**：Q1 攻守を自分で選んだ YES／Q2 手札の数字を数えた YES／Q3 正解を教えられている感 NO／Q4 もう一度戦いたい YES（神：大耀 or 寿楽・敵 enemy_09・`?pilot=threat`・normal）＝合否基準（`LANE1_THREAT_BRANCH_PILOT_V1.md` §8）を全項目満たす。採否＝**条件付き GO**：Pilot として継続採用、ただし **Production 公開と既存 7 体への展開は別途 CEO 承認**（本 branch は push 0・merge 0）。**AI 判断（CLAUDE.md §6-2「バランス数値の調整」）**：① R3 文言「⚠ 傷が浅ければ次は断岩」は Q2 YES・Q3 NO のため**現状維持**（文言案 A「半身まで削らねば」は採用しない。静的監査＝12 字・SP375 で 2 行に折り返し横スクロール 0・既存グリフ⚡再利用・決定263 境界内）。② hard の then 率偏り（17.9%）の主因を engine 差し替えの寄与分解で再確認（`enemyHpMultiplier 1.15` が主因・v1 §10-5 の 76% と同方向）→ しきい値 {0.5, 0.55, 0.6, 0.65} × normal／hard の実走で **normal 0.5／hard 0.6（P1）を採用**（根拠は `LANE1_THREAT_BRANCH_PILOT_V1_1.md` §3・証跡 `docs/evidence/lane1-threat-branch/ratio-sweep-v1_1.json`）。実装＝`RULES.enemyTactic.hpRatioByDifficulty`（rules.ts に集約）＋ `EnemyTacticDef.cond.ratioByDifficulty`（データ）＋ `tactic.ts` が難易度を見て解決（ハードコード 0）。normal の挙動は不変（then 41.8% 再現・golden）・gameVersion `1.d794038a00b5b53c` 不変（CORE 7 体・指紋とも不変）。③ 既存 7 体への展開は**設計のみ**（§6：鬼将＝置換・機工師＝R5 分岐・道化＝R6 分岐が構造上成立、怨霊／龍神／魔獣／試練の影は予兆ラウンドが無く不成立）。展開の実施は CEO 承認待ち（§6-3 #1・本書 §6-6 に推奨案）。push 0・deploy 0・既存 7 体の値 0 変更 |

---

## 1. CEO 評価の記録（CEO 判断）

`LANE1_THREAT_BRANCH_PILOT_V1.md` §8-1 に結果表を追記した（4 問・日付・神・判定＝条件付き GO・未承認範囲）。本書では繰り返さない。v1.1 の各節は、この結果を前提にした AI 判断である。

- Q2 YES・Q3 NO → 文言は現状維持（§4）
- Q1 YES → then 13／else 26 の差・しきい値 0.5（normal）は据え置き（§3 で数字でも確認）
- 条件付き GO の「条件」＝Production 公開・7 体展開は未承認 → §6 は設計のみ・実装 0

## 2. hard の分岐偏りの検証（寄与分解の再確認・AI 判断）

**方法**：v1 §10-5 の分解は「与ダメージ分布の入れ替え」による反実仮想だった。v1.1 では独立な方法として、**engine の `RULES.difficulty.hard` を test 内で差し替え**（`vi.doMock`・ランタイム不変）、hard の 3 要素（`enemyHpMultiplier 1.15`／`enemyAtkMultiplier 1.15`／`playerMaxHpBonus −3`）を normal に 1 つずつ・2 つずつ入れた engine で then 率を実走した。7 神 × seed 40（`threat-branch-{0..39}`・v1 と同じ）・しきい値 0.5 固定・方策 greedy／raceAware／reader。証跡：`src/core/sim/threatBranchDecision.sim.test.ts`（`SIM_THREAT_BRANCH_V11=1`・describe「v1.1」）→ `docs/evidence/lane1-threat-branch/ratio-sweep-v1_1.json`・`RATIO_SWEEP_V1_1.md`（§A。**本節の数値はすべて生成物からの転記**）。

| 変種（hard 側の要素） | then greedy | 低下幅（41.8→17.9＝23.9pt）に占める割合 |
|---|---|---|
| hard（3 要素すべて） | 17.9% | 100% |
| **HP ×1.15 のみ** | **23.6%** | **76.2%** |
| ATK ×1.15 のみ | 42.1% | −1.3%（単独では偏りを作らない） |
| 自 HP −3 のみ | 42.5% | −2.9%（同上） |
| HP ×1.15 ＋ ATK ×1.15 | 23.2% | 77.8% |
| ATK ×1.15 ＋ 自 HP −3 | 36.1% | 23.8%（**2 つ揃うと**初めて効く＝交互作用） |

（raceAware／reader の列は `RATIO_SWEEP_V1_1.md` §A。傾向は同じ）

**判定（AI 判断）**
- v1 §10-5 の結論を独立な方法で再現した：**偏りの主因は `enemyHpMultiplier 1.15`（必要ダメージ 47→54）で 76%**。v1 の反実仮想（HP 倍率だけ 23.6%）と engine 差し替え（23.6%）が**一致**＝分解は方法に依存しない。
- 残り 24% は「ATK ×1.15 と自 HP −3 が**揃ったとき**」に出る（単独ではどちらも 0）。greedy の危険判定（残 HP 35% 未満）が hard の R2（敵 9→10）で発火して守りに回り、R2 の与ダメージが 19.1→16.4 に落ちる（v1 §10-5 の R2 −2.7 と同じ機序）。これは方策（人の守り方）に依存する部分で、しきい値では直接は直らない。
- したがって hard の補正は「必要ダメージを normal 並みに戻す」＝**しきい値を上げる**のが筋（ATK 側を触ると難易度そのものが変わる）。必要ダメージを normal と同じ 47 にする ratio は 1 − 47／108 ≈ 0.565 だが、残り 24%（与ダメージ低下）を補うには**それより高い値**が要る → §3 で 0.55／0.6／0.65 を実走して決める。

## 3. normal／hard の最適しきい値の比較（AI 判断）

**方法**：しきい値 {0.5, 0.55, 0.6, 0.65} × normal／hard を、`RULES.enemyTactic` を test 内で差し替えた engine（全難易度に同じ値）で実走。then 率（greedy／raceAware／reader・7 神 × 40 seed）、R3 の迷い率（v1 §10-1 と同じ R3 全手順の総当り・ε10 素点）、反転率 2 種（**両分岐到達可**＝R3 の手で then と else の両方へ行ける局面率、**手札差し替え**＝同一局面で手札だけ別 seed に替えると最善の側が入れ替わる率・ALT_HANDS 1）。証跡：`ratio-sweep-v1_1.json`・`RATIO_SWEEP_V1_1.md` §B（**転記**）。

| ratio | 難易度 | then の HP 上限／必要ダメ | then greedy | then raceAware | 迷う（ε10）／全 | then 到達不能 | 両分岐到達可 | 手札差し替えで反転 | G1 帯（35〜65%） |
|---|---|---|---|---|---|---|---|---|---|
| 0.50 | normal（**本番・QA PASS**） | ≤47／47 | **41.8%** | 58.9% | **42.5%** | 11.4% | **85.7%** | **38.2%** | PASS |
| 0.50 | hard（v1） | ≤54／54 | 17.9% | 27.1% | 44.3% | 25.4% | 74.6% | 26.1% | FAIL |
| 0.55 | normal | ≤51／43 | 58.6% | 65.7% | 45.7% | 6.1% | 89.3% | 40.4% | PASS（上寄り） |
| 0.55 | hard | ≤59／49 | 32.5% | 43.9% | 55.4% | 14.3% | 85.7% | 36.1% | FAIL |
| 0.60 | normal | ≤56／38 | 68.2% | 75.7% | 42.9% | 4.6% | 79.6% | 43.2% | FAIL（上限超） |
| 0.60 | hard（**P1**） | ≤64／44 | **48.2%** | 59.6% | **59.6%** | 7.5% | **92.5%** | **41.1%** | PASS |
| 0.65 | normal | ≤61／33 | 78.9% | 84.3% | 34.3% | 3.6% | 63.9% | 39.2% | FAIL（上限超） |
| 0.65 | hard | ≤70／38 | 66.1% | 74.6% | 57.5% | 5.0% | 89.3% | 45.8% | FAIL（上限超） |

normal 0.5（本番）の profile との距離（then greedy・then raceAware・迷う／全・到達不能・両分岐到達可 の pt 絶対差の合計・`RATIO_SWEEP_V1_1.md` 距離表から転記）：hard 0.5＝**82.6**／hard 0.55＝40.1／**hard 0.6＝34.9（最小）**／hard 0.65＝65.0。（normal 側は 0.5＝0／0.55＝35.7／0.6＝56.5／0.65＝100.3）

**判定（AI 判断）：P1「normal 0.5／hard 0.6」を採用。**
- **normal は 0.5 のまま**：0.55 は then 58.6%（帯の上端近く・raceAware 65.7% は帯外）、0.6 は 68.2% で帯外。0.5 は CEO QA が PASS した値であり、迷う 42.5%・両分岐到達可 85.7% を満たす。動かす理由が無い。
- **hard は 0.6**：then 48.2%（normal 41.8% と同帯・差 +6.4pt）、迷う 59.6%、到達不能 25.4→7.5%、両分岐到達可 92.5%、手札反転 41.1%（normal 38.2% と同水準）、勝率 100%・平均スコア 644→646（難易度は変わらない）。0.55 は then 32.5% で G1 の帯に届かず到達不能 14.3% が残る。0.65 は then 66.1%（raceAware 74.6%）で帯の上限を超え、normal 0.5 との距離も 65.0 と 0.6 の約 2 倍（実測）。
- 「必要ダメージを normal と同じ 47 にする」案（ratio 0.565・§2）は 0.55 と 0.6 の間で、then は 36〜40% 程度と推定される（G1 下限ぎりぎり）。§2 の交互作用分（与ダメージ低下 24%）を補えないため、0.6 を採る。
- 神別（hard・greedy・0.6）：恵比寿 75.0／大耀 32.5／蒼毘 52.5／彩花 45.0／**寿楽 50.0**（0.5 では 2.5%）／福栄 45.0／笑蓮 37.5%。寿楽 × hard の「分岐が無い」状態（v1 §10-3 読む価値 0）が解消される。恵比寿 75% は帯外だが normal 0.5 でも 62.5% と最も高い神（削る力の差）で、しきい値では均せない。
- **コスト／リスク**（v1 §10-5 で挙げた点の再評価）：(a) engine 変更＝`tactic.ts` に難易度引数を足すだけ・値は rules.ts に集約・ハードコード 0（§5）。(b) `enemyTactic.test.ts` 契約 1 を「HP 比と難易度で決まる」に改定。(c) gameVersion は不変（`RULES.enemyTactic` は指紋から除外済み・CORE 7 体に tactic 無し）。(d) **傷の光（≤0.5）との不一致**は hard のみ・プレイヤー有利側（§4 Known）。(e) 文言「傷が浅ければ」は定性なので hard 0.6 と矛盾しない。

## 4. 予告文言の分かりやすさ（静的監査・実装 0）

**判定：現状維持が最善。文言案 A「⚠ 半身まで削らねば次は断岩」は採用しない（根拠＝CEO QA Q2 YES・Q3 NO。v1 §10-4 の規則「Q2 YES かつ Q3 NO なら現状維持」）。** 以下は「現状の文言に問題が無いこと」の静的確認。

| 観点 | R3「⚡ ⚠ 傷が浅ければ次は断岩」 | R4 then「⚔ 130」／else「🔥 業斧・断岩 260」 | 判定 |
|---|---|---|---|
| 文字数 | label 12 字（⚠＋空白＋10 字）。既存最長の charge label は機工師「砲身に魔力を溜めている…」12 字・道化「⚠ 手品を仕込んでいる…」11 字 ＝ **既存の上限内** | else は鬼将 enemy_02 の R4 と**同一文字列**。then は通常攻撃の標準書式 | OK |
| SP375 幅 | `.enemy-plate .intent` 17px（`battle.css` 5497）。受入証跡 `acceptance/battle-r3-sp375.png`：**2 行に折り返し**（「⚠ 傷が浅ければ／次は断岩」）・`acceptance.json` 346 行 scrollWidth 375 ＝ 横スクロール 0。PC 1508 は 1 行 | else は既存 7 体と同じ表示（§7-2 で R4「業斧・断岩 260」を SP375 で実測） | OK（2 行は既存 charge label でも起きる挙動） |
| 既存グリフ（`cardStyle.ts` `getIntentGlyph`／`formatEnemyIntentText`） | 先頭の ⚡ は `bolt` グリフへ置換され、文言側の ⚠ は文字として残る（道化・機工師の「⚠ …」と同じ扱い） | 🔥→`burst`・⚔→既存 | OK（新グリフ 0・`intent.ts` 変更 0） |
| 決定263 境界（未来の段階表示をしない） | 条件の「形」（傷の深さで次が変わる）だけを言い、数値・未来ダメージ・推奨を出さない。EnemyPanel は tactic を事前解決しない（`pilotFlag.test.ts` が source-fixed） | R4 は解決後の 1 手先の予告のみ | OK |
| 難易度別しきい値（§5）との整合 | 「傷が浅ければ」は定性表現なので normal 47／hard 64 のどちらでも矛盾しない。文言案 A「半身」は hard 0.6 と**矛盾する**（＝採用しない理由がもう 1 つ増える） | — | OK |

**Known（hard のみ・表示側の手がかり）**：HP バーの傷の光（`visualHp.ts` `hpBand` ≤ 0.5）は hard のしきい値 0.6（≤64／108）と一致しない。HP 55〜64 の帯では「光らないが then」になる＝プレイヤーに**有利側**のずれ（追い込めたのに気付かない、はあり得るが、追い込めたつもりで必殺を受ける、は起きない）。normal は従来どおり一致（≤47）。表示側（`hpBand` は全敵共通）は触らない（v1 §3-4 の方針＝新規 CSS 0・未来情報 0）。hard を人が遊んだ所感が出たら再評価。

## 5. 最小限の改善の実装・テスト（commit `916daa4`・runtime 変更あり・push 0）

§2〜§3 が P1 を支持したため実装した。**変更は Pilot 敵の hard にだけ効く**（normal／easy は値が同じ・既存 7 体は tactic を持たない）。

| ファイル | 変更 | 不変ルールとの関係 |
|---|---|---|
| `src/core/data/rules.ts` | `enemyTactic.hpRatioByDifficulty: { easy: 0.5, normal: 0.5, hard: 0.6 }` を追加（根拠コメント付き） | 調整値は rules.ts に集約（§5 運用ルール）。gameVersion の指紋からは `enemyTactic` ごと除外済み（v1 §3-3） |
| `src/core/types/enemy.ts` | `EnemyTacticDef.cond.ratioByDifficulty?: Readonly<Partial<Record<Difficulty, number>>>` | 新 kind なし・intent 型不変（save v9 不変） |
| `src/core/engine/tactic.ts` | `tacticRatio(tactic, difficulty)`＝難易度の値 → `cond.ratio` フォールバック。`tacticBranch`／`resolveEnemyTactic` に `difficulty` 引数（必須） | engine は RULES を読まない（データ参照のみ）。`if (enemy === …)` 無し・Math.random 無し |
| `src/core/engine/round.ts` | `nextEnemyAction` が `state.difficulty` を渡す（解決は予告時 1 回・実行は intent をそのまま＝v1 契約 3 不変） | — |
| `src/core/data/enemies.ts` | enemy_09 の `cond` に `ratioByDifficulty: RULES.enemyTactic.hpRatioByDifficulty` を埋め込む | 既存 7 体（`CORE_ENEMIES`）は 1 文字も変更なし（sha256 golden） |

**テスト（narrow・heavy-run 経由）**：`enemyTactic.test.ts`（11→16）・`coreRoster.test.ts`（12）・`gameVersion.test.ts`・`useReactionLanguage.test.ts`・`pilotFlag.test.ts`（9）・`enemies.test.ts` ＝ **6 files・66 tests PASS**。`npx tsc -p tsconfig.app.json --noEmit` エラー 0。

新規・改定した契約：
- `RULES.enemyTactic.hpRatioByDifficulty.normal === defaultHpRatio`（easy も）＝ normal の挙動は不変。engine 経路で **normal 47／48・hard 64／65（108 × 0.6）・easy** の境界を確認
- `tacticRatio` のフォールバック：`ratioByDifficulty` を持たない tactic（決定274 忠次 enemy_08 など既存データ）は hard でも `cond.ratio`（互換）
- hard の HP 55〜64 の帯：v1 では else（必殺 26×1.15）、v1.1 では then（13×1.15）＝変更の全域を明示
- 保存盤面に `tactic`／`ratioByDifficulty` が現れない（save v9 不変）
- `coreRoster.test.ts`：`cond.ratioByDifficulty` が行動表に埋め込まれている（CORE が使えば指紋に自動で入る）・`rankingImpactSnapshot()` に `hpRatioByDifficulty`／`ratioByDifficulty`／`tactic` が**含まれない**・`getGameVersion() === '1.d794038a00b5b53c'`（golden 不変）
- `pilotFlag.test.ts`（source-fixed）：`round.ts` の呼び出しに `state.difficulty` が含まれる形へ更新。EnemyPanel／battle.css に tactic 無し（事前解決なし・新規 CSS 0）は不変

**normal の then 率 41.8% の再現**：§7（v1.1 sim 実装後の run・test C「runtime の実効しきい値と then 率」）で `normal:greedy 0.418`（v1 §5 G1 と同値）・`hard:greedy 0.482` を確認する。

## 6. 既存 7 体への展開（設計のみ・実装 0・AI 判断。実施は CEO 承認待ち）

### 6-1. 成立条件（Pilot v1 の成功則から）

軍略分岐が「手札で考える」を生むために必要な構造（v1 §1・§10 と CEO QA の結果から）：

1. **予兆ラウンド**（`charge`＝予告 0・label で条件の形を告げる）が分岐ラウンドの**直前**にある（1 手先・決定263 の境界内）
2. 分岐ラウンドの **else 側＝現行の峰（名前つき必殺）**、then 側＝軽い通常攻撃（0 にはしない）＝「追い込めなければ現行そのもの」で既存プレイヤーの体験を壊さない
3. 分岐ラウンドまでに**プレイヤーが削れる余地**がある（R3 以降が望ましい。R2 以前だと手札 1〜2 巡では届かず「到達不能」が増える＝v1 §10-1 の構造）
4. 決定246（峰 R4）・決定252（名前つき必殺・R3 溜め→R4 必殺 or R2 溜め→R3 開幕必殺）の行動表と**合計値・峰の位置を変えない**

### 6-2. 敵ごとの適用可否

| 敵 | 行動表（現行） | 予兆→峰 | 軍略の置き場 | 可否 | 備考 |
|---|---|---|---|---|---|
| 業斧の鬼将 enemy_02（94） | 5／9／溜／**必殺 26**／15／11／7 | R3→R4 | **R4**（enemy_09 と同一：then 13／else 必殺 26） | **○ 第 1 候補** | Pilot 検証済み（CEO QA PASS・sim 全項目）。実施＝enemy_02 の R3 label と R4 を enemy_09 の表で**置換**し、enemy_09（Pilot）と `?pilot=threat` 経路を外す。`CORE_ENEMIES` の sha・gameVersion が変わる（6-3） |
| 銀甲の機工師 enemy_04（100） | 6／溜／22／**溜 ⚠**／**必殺 24**／7／9 | R4→R5（R2→R3 にも溜め） | **R5**（then 例 12／else 必殺 24）。R4 label を条件形に | **○ 第 2 候補** | 峰が R5 なので R4 開始までに 4 ラウンド削れる＝到達しやすい → しきい値は 0.5 より**低め**（0.4 前後）を sim で決める。R2→R3 の 22 は固定のまま（二重分岐は 1 択化のリスク） |
| 乱舞の道化 enemy_07（92） | 4／溜 ⚠／**必殺 24**／9／溜／19／9 | R2→R3（開幕）・R5→R6（アンコール） | **R6**（then 例 9／else 19。R5 label を条件形に） | △ 第 3 候補（低優先） | R3 の開幕必殺は決定252 の目的（託宣を R3 に先に切らせる）そのもの＝分岐で回避可能にしない。R6 到達率 ≈35%（決定252）なので露出が小さい |
| 藍花の怨霊 enemy_03（95） | 3／6／13／**必殺 23**／18／9／4 | **無し**（R3 は attack 13） | — | × 不成立 | R3 を溜めにすると 13 を失い合計 76 が崩れる（決定246 の等価条件に反する）。`attack` に label を持たせる新機構（intent 書式・save 形式の変更）が要る＝v1.1 の範囲外 |
| 蒼海の龍神 enemy_06（103） | 4／7／12／**必殺 20**／16／9／5 | **無し** | — | × 不成立 | 怨霊と同じ。加えて決定216（龍神 R4「守りの姿勢」NO-GO）と同じ R4 に別機構を載せる形になり、NO-GO を覆すと誤読され得る → 除外 |
| 双牙の魔獣 enemy_05（85） | 連撃×7（R3 必殺連撃） | **無し** | — | × 不成立 | 溜め無し・峰 R4 は通常連撃 16。分岐の else 側に「名前つき必殺」が無い |
| 試練の影 enemy_01（103） | 5／8／11／15／13／9／6 | **無し**（必殺も無し） | — | × 対象外 | 入門型。決定252 でも必殺を持たせていない＝「読み」の負担を増やさない設計意図を維持 |

**結論（AI 判断）**：展開し得るのは **鬼将（置換）・機工師（R5）・道化（R6）の 3 体**。残り 4 体は予兆ラウンドが無く、今の機構（`charge` label でしか条件を告げられない）では成立しない。「attack に label を付ける」拡張は intent 書式・save・UI の全敵に波及するため、3 体の結果を見てから別 Decision で扱う。

### 6-3. 影響（gameVersion／Daily／save／戦績）

| 項目 | 影響 | 対処 |
|---|---|---|
| gameVersion | **変わる**（`CORE_ENEMIES` の JSON が変わる＝`dataFingerprint` が自動で変わる。`cond.ratio`／`ratioByDifficulty` も CORE に入れば指紋に入る＝v1 §3-3 の設計どおり取りこぼし無し） | Expected Specification Update。`coreRoster.test.ts`・`useReactionLanguage.test.ts` の golden・`CORE_GOLDEN_SHA256` を更新。`engineVersion` の手動 bump は不要（挙動は変わらない・データ差分） |
| Daily（決定139） | 同じ `dailyKey` の中で版が混在すると比較不能 | **JST 日付境界で deploy**（既存運用ルール）。Ranking は READY-DORMANT（決定274 と同じ扱い） |
| battleSave v9 | **不変**（intent は解決後の 4 kind のみ）。旧版で R3 途中に保存した鬼将戦を新版で開くと、R4 予告は新版の表で解決される（R3 label は保存済みの旧文言のまま表示） | 1 戦だけの表示差。移行コード不要 |
| 戦績・49 攻略盤・神階 | 敵 id 不変・攻略済み判定不変。then 側（受け 13）が出る分、鬼将の平均スコア・残 HP はわずかに上がる（sim：greedy 627→629 相当・勝率不変） | 記録の互換性は保たれる。過去 best との比較は「同じ敵・別の表」になる＝Known に記す |
| `enemyActions.test.ts`（必殺 6 行動）・`cardStyle.test.ts`（49 行動台帳）・`balanceSim.test.ts` | CORE の行動表を数える／出力する golden | 更新（3 体なら必殺の数は不変、台帳の R3 label と R4 kind が変わる） |
| 難易度別しきい値（§5） | `RULES.enemyTactic.hpRatioByDifficulty` を **3 体で共有**（敵ごとの値は `cond.ratio`／`cond.ratioByDifficulty` に埋め込むので、機工師の R5 は別の値にできる） | 敵ごとに sim で決める。rules.ts に敵別の表を増やすか、敵データ側に書くかは実装時に PM 判断 |

### 6-4. Gate（展開 1 体ごと）

| Gate | 基準 |
|---|---|
| G1 then 率（normal・greedy・7 神 pooled） | 35〜65%（v1 §5 と同じ） |
| G1' hard then 率 | normal との差 ≤ 10pt（§3 で hard 0.6 が満たす水準） |
| G2 読みの報酬 | reader 平均スコア > nonReader（v1 §10-3 の方法） |
| G3 難しくしすぎない | 置換後の勝率が置換前 ±3pt（normal／hard・reader） |
| G4 合計値・峰 | else 側の 7R 合計と峰の位置が現行と同一（決定246／252 不変）＝テストで固定 |
| G5 境界 | 新 kind 0・intent に tactic 0・EnemyPanel 事前解決 0・新規 CSS 0（`pilotFlag.test.ts` 相当を CORE 向けに） |
| G6 自動 Gate | tsc 0／lint 0／full vitest／build／headless 受入（PC・SP375 × R3 label・R4 両分岐） |
| G7 CEO 実プレイ QA | v1 §8 の 4 問を**敵ごと**に（鬼将は Pilot で済み＝置換後の再 QA は R3 label 同一なので省略可。機工師・道化は必須） |

### 6-5. 推奨する進め方（AI 判断）

- **Phase A：鬼将 1 体だけを置換**（enemy_09 の表をそのまま enemy_02 へ。Pilot 経路・enemy_09・`?pilot=threat` を削除）。QA 済み・sim 済み・新規文言 0。gameVersion 変更 1 回・JST 境界 deploy・Known に「鬼将の過去 best は旧表」を追記
- **Phase B：機工師（R5 分岐）** を Phase A の Production 実績（戦績・Daily 2 週間）を見てから Pilot → QA → 置換。しきい値は別途 sim
- **Phase C：道化（R6）** は Phase B の結果次第（露出 35% のため効果が小さい可能性）
- 3 体同時は却下：gameVersion の変更回数は 1 回で済むが、CEO QA が 3 体分同時に必要になり、1 体に問題が出たときに切り分けられない

### 6-6. CEO 判断が必要な点（§6-3 #1「既存 7 体への展開」＝条件付き GO の未承認範囲）

```
【CEO DECISION REQUIRED】
Issue：軍略分岐を既存 7 体のどこまで展開するか（Pilot 敵 enemy_09 のままでは通常プレイヤーに届かない）
AI Recommendation：Phase A＝業斧の鬼将（enemy_02）1 体だけを enemy_09 の行動表で置換し、Pilot 経路を外して Production へ（JST 日付境界 deploy・Gate G1〜G7）。機工師・道化は Phase B／C として別途 Pilot
Reason：鬼将は CEO QA 4／4 PASS・sim 全項目済み・新規文言 0・else 側＝現行そのもの。1 体なら問題時の切り分けが容易
Alternatives：3 体同時（却下：QA 3 体分・切り分け不能）／Pilot のまま維持（却下：誰にも届かない）／怨霊・龍神・魔獣へ新機構で展開（却下：intent 書式・save の変更を伴う別 Decision）
Risk：gameVersion 変更（Daily 比較は日付境界で切れる）・鬼将の過去 best との比較差（Known）・hard の傷の光としきい値の不一致（§4 Known）
Impact if delayed：Pilot の成果が通常プレイヤーに届かず、K33（手札で考える）が OPEN のまま
CEO Action：承認 / 拒否
```

## 7. 実行記録・UNRUN・残リスク

### 7-1. 実行記録（すべて heavy-run 経由・直列・2026-10-17）

| 実行 | 結果 |
|---|---|
| v1.1 sim **実装前**（`SIM_THREAT_BRANCH_V11=1`・seed 40） | C／A PASS。B は ratio 0.65 の engine 読み直しで `vi.doMock` の patch が反映されず（12 回目の読み直しで cond.ratio 0.5 のまま）失敗 → `loadEngine` に「patch が行動表と RULES に届いたことを検証し、届くまで最大 5 回読み直す」を追加（判断理由はコード内コメント）。0.5／0.55／0.6 の値はログに残り、実装後の run と**完全一致** |
| `npx tsc -p tsconfig.app.json --noEmit` | 1 回目：heavy-run の lock を他 Lane（lane2b）が 30 分保持していたため exit 97（UNRUN 扱い）→ lock 解放後に再試行 1 回：**エラー 0** |
| narrow vitest（6 files） | **66 tests PASS**（§5） |
| v1.1 sim **実装後**（同条件・0.65 含む） | **4 tests PASS・988.9 s**（runtime 1 s／分解 2.4 s／sweep 984.9 s）。読み直しの再試行 0 回。test C：runtime の実効 ratio easy 0.5／normal 0.5／**hard 0.6**、then の HP 上限 40／47／**64**、then 率 normal:greedy **41.8%**（v1 §5 G1 と同値＝normal 不変）・hard:greedy **48.2%**。ratio 0.5／0.55／0.6 の全列が実装前と一致＝engine の等価性 |
| full vitest（`--min-mb 900`） | 7-2 に記す |

証跡：`docs/evidence/lane1-threat-branch/ratio-sweep-v1_1.json`・`RATIO_SWEEP_V1_1.md`（実装後 run の生成物。**§2・§3 の表はここからの転記**）。実装前 run のログは scratchpad のみ（数値は一致するため evidence には置かない）。

### 7-2. full vitest

`npx vitest run`（heavy-run `--min-mb 900`・実装後）：**119 files passed / 8 skipped（127）・1468 tests passed / 17 skipped（1485）・42.9 s・exit 0**。v1 §7（1463 passed / 10 skipped）との差＝enemyTactic.test.ts +5・skip +7（v1.1 sim の 4 件＋既定 skip の sim 3 件）。失敗 0。

### 7-3. UNRUN・未実施

- `npm run build`：未実行（RAM 制約。runtime の差分は engine 関数の引数追加と rules の 1 項目で、型チェックとテストで担保。PM の統合時 Gate で実行）
- headless 受入（Playwright）：未実行（UI 変更 0・R3／R4 の表示は v1 §7-2 の受入と同一経路。hard の then 側表示「⚔ 150」は engine テストで担保）
- CEO 実プレイ（hard）：未実施。**hard の体験は人がまだ遊んでいない**（v1 §9 UNKNOWN のまま）

### 7-4. 残リスク（AI 判断）

1. hard のしきい値 0.6 と傷の光（≤0.5）の不一致（§4 Known・プレイヤー有利側）
2. 恵比寿 × hard の then 75%（帯外）＝削る力が高い神ではほぼ必ず追い込める。normal でも 62.5% で最高なので神差は構造的。しきい値で均すと他の神が壊れるため触らない
3. 決定274 忠次（enemy_08・別 branch）の tactic は `ratioByDifficulty` を持たないため、統合時も hard で 0.5 のまま（フォールバック契約）。忠次にも適用するかは将軍家 Pilot 側の判断
4. `threatBranchDecision.sim.test.ts` の `vi.doMock` 競合は再試行で回避したが根本原因（vitest の mock 解決タイミング）は未特定。sim 専用コードで runtime には無関係

### 7-5. 守った禁止事項

push／merge／tag／rebase／reset／checkout／stash／本体・他 worktree への書き込み／`docs/DECISIONS.md` 編集／既存 7 体の変更／新 kind／正解表示／画像生成／ファイル削除：いずれも**行っていない**。Bash 文字列にバッククォート 0。commit は本 worktree のローカルのみ（§7-6）。

### 7-6. commit（ローカル・push 0）

| sha | 内容 |
|---|---|
| `916daa4` | feat(pilot)：難易度別しきい値の runtime 実装＋テスト（runtime 変更あり） |
| `f5bcb4d` | test(sim)：v1.1 sim（寄与分解・ratio sweep）＋ evidence（runtime 変更 0） |
| （本書の commit） | docs：V1 §8-1（CEO QA 結果）・V1_1 本書（runtime 変更 0） |
