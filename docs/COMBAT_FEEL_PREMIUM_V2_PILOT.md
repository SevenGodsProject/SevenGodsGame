# Combat Feel Premium v2 Pilot — Enemy Break v1「追い詰めた」の一回性反応

- 日付：2026-10-17（Lane 2・第 3 波「空き Lane の即時再稼働」）
- 担当：Designer／Dev（**AI 判断**：監査・候補比較・選定・実装方式・Gate 判定は CLAUDE.md §6-2 の範囲。Human QA は **CEO**）
- worktree `SevenGodsGame-lane2b`・branch `feat/lane2-combat-feel-v2-pilot`（master `7ba447f` 起点）。**push／PR／merge／tag／deploy 0・master 不変・Production v1.0.0 `d2135d2` 不変**
- 対象外（禁止）：engine／`rules.ts`／カード効果／敵行動の変更、`src/core` への React・Phaser import、画像・動画生成、大規模演出変更、DECISIONS.md 本体の編集（行ドラフトは §10）

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 監査（6 観点） | ①〜⑤は決定200／224／232／233／237／239／240／247／249／250／257 で**階層は数値上成立**。残る未解決のうち「新 asset・CEO Final 判定・d224 未回収差分のファイル」を除くと、**②敵の被弾リアクションの「HP 50%／25% をまたいだ瞬間が無反応」**（決定225 §D「HP ゲージを減らす作業」の残因③・`PREMIUM_REAUDIT` §3 #5 未着手）が最も頻度と効果が高い。⑥ SP375 は実測で**着弾 FX の中心が敵の絵の中 100%・名札／吹き出し／手札ドックとの重なり 0**（§3） |
| 選定（3 案比較 §4） | **A. Enemy Break v1**＝表示 HP が 50%／25% の帯をまたいで下がった瞬間に 1 回だけ、敵の体が崩れて暗くなり・名札に赤い閃きが走り・既存の傷の円がふくらんで現れる。CSS＋表示 hook のみ・新 DOM／文言／SE／asset 0・engine／時刻表 0 |
| 実装 | 新規 `src/components/battle/enemyBreak.ts`（93 行）・`enemyBreak.css`（108 行）、`EnemyPanel.tsx` +8／−1（import 2・hook 1・根の className と style）。**触ったファイル 3・追加 CSS/TS 201 行のうち runtime は CSS 108＋TS 93（hook／定数／注釈込み）** |
| 自動 Gate | narrow 80 PASS（新規 `enemyBreak.test.ts` 17 件含む）／**full vitest 1,448 PASS・9 skipped（117 files）**／`tsc -b` 0／oxlint：変更ファイルの指摘 0（既存 scripts の warning のみ・error 0）／build OK：CSS 191.84→194.85KB（+3.0KB）・JS 467.28→468.16KB（+0.9KB） |
| ブラウザ実測（§7） | PC 1508×660／SP375×667 × Before（master 7ba447f build）／After：帯の遷移時刻に `cf2-break-half`／`-quarter` が付く（同一フレーム）。遷移の瞬間（崩し 20% 地点）で 体 translate −7.0px（SP −5.0px）・brightness 0.72／saturate 0.70・名札 ::after opacity 0.47・quarter は −8.7px（SP −6.1px）／0.45。着弾 FX の viewport 内・重なり 0・絵の中 100% は Before と同値。console／JS error 0・勝利まで完走 |
| reduced-motion（§7-3） | `prefers-reduced-motion: reduce` の context で 体 transform `none`・傷の scale `none`・名札の閃き（opacity）だけ再生 |
| 状態 | **Fast Gate PASS — PENDING CEO HUMAN QA（§9 の 3 問）**。ローカル commit のみ |

## 1. 前提と重複回避

- 決定242 で「コード/CSS 中心の Premium 改善 Phase」は一区切り（Hotfix 待機列のみ）。本 Lane は CEO 指示「空き Lane の即時再稼働」による**小規模 Pilot**で、既存決定・NO-GO は覆さない
- **d224 未回収差分**（main repo dirty・`SevenGodsGame-lane3/docs/evidence/td01/main-repo-tracked.patch` 591 行）は、決定224 の READY／⚡PAYOFF（`BONUS_HIT_STOP_MS`・`impact-ring-payoff`・`cast-flash-payoff`・`readyMaterial`）で、**内容はすべて master `862367f` 以降に Production 済み**（patch の基点 `43c10a4` が古いだけ）。本 Lane はこれを再実装せず、同 patch が触る 8 ファイル（BattleScreen／CardView／EnemyPanel／battle.css／combatTimeline／enemyVfxTiming／sound／useBattleSound）のうち **EnemyPanel.tsx だけ**を触り、hunk も重ならない（patch は 164〜185 行の着弾レイヤー、本 Lane は 13〜15 行の import と 128〜136 行の根の className）。CSS は `battle.css` ではなく**新規 `enemyBreak.css`**に置く
- Lane 間の同一ファイル編集：Lane 1（`src/core/sim/`・Pilot runtime）・Lane 2 cardart（docs／art-source）・Lane 3 rc101（rank 表示・enemy select）と**重なるファイル 0**

## 2. 監査：6 観点 × 現行 master ／ 到達点 ／ 未解決 ／ 失敗 Pilot の教訓

根拠は現行 master `7ba447f` の実コード（`combatTimeline.ts`・`enemyVfxTiming.ts`・`useBattleFx.ts`・`EnemyPanel.tsx`・`PlayerPanel.tsx`・`battle.css`・`sound.ts`）と DECISIONS.md の各行、`DECISION225_*`・`DECISION229_*`・`PREMIUM_REAUDIT_2026-09-27.md`・`LANE2_COMBAT_FEEL_V2_PRE_AUDIT.md`・`PRACTICAL_QA_2026-09-28_AUDIT.md`・`POST_D254_PRACTICAL_QA_REAUDIT.md`。

| # | 観点 | 現行 master の実装 | 過去決定での到達点 | 未解決点 | 失敗 Pilot／注意の教訓 |
|---|---|---|---|---|---|
| ① | 攻撃命中時の手応え | hit stop 梯子 **L1 30 < L2 40 < L3 45 < ⚡50 < L4 60 < 神の一撃 80 < 撃破 90ms**（`HIT_STOP_MS`・`BONUS_HIT_STOP_MS`）。生 tier≥3 の本体は溜め→重い突き（`CARD_HEAVY_IMPACT_MS` 150・28px／SP 22px）。斬撃 slash-l1〜l4（scale 0.8〜1.55）・数字 16／22／30／40／52px・SE hit_l1〜l4（gain 0.45〜1.0）。押下音 0ms（決定233）・閃光 blend（237）・札のゴーストが神へ飛ぶ（239） | 決定232 Human QA **PASS（v1.1 Final・CEO）**。決定224 ⚡PAYOFF 5/5 | L1↔L2 の差が小さい（stop 10ms・kb 1px・数字 6px。`PREMIUM_REAUDIT` §2-I）／`.cast-flash` が画面中央固定（W7）／同じ結果の三重表示（トースト・数字・ミニ結果）は決定203／205 の可読性成果物で**文言保護** | 溜め 190→150ms（CEO「多少もたつく」）：**時間を伸ばす調整は体感を悪化させる**。CEO が v1.1 を Final と判定 → L1／L2 の再調整は「もたつき」再燃リスクで**今は触らない** |
| ② | 敵の被弾リアクション | `.enemy-reaction`＝juice-stop（ノックバック姿勢で静止）→ hit-shake-l1〜l4（kb 4／5／8／11・撃破 14px）＋ impact-flash。決定249 WEAKEN で `rl-stagger`、決定240 の構え（filter）、決定229／247 の反転（`scale -1 1`）。HP 50%／25% で `.enemy-wound`（PC：中央 260px 円 `#ff3b3b30`／SP：足元の楕円）が**静かに付く** | 決定249 Human QA PASS（反応の主語がキャラへ）。決定240 PASS | **HP 帯をまたいだ瞬間が無反応**（§3 実測：PC では見た目の変化が HP バー以外に無い。決定225 §D「`pc-ebisu-oni-20-wound`：450/1000 で差が分からない」）／敵の絵は変わらない（やられ絵＝asset・決定255 OPEN 05）／決定225 §D「HP ゲージを減らす作業」の残因③ | 決定220／222 Living Background **FAIL**（低振幅・常時の環境演出は「どこが動いているか分からない」）→ **一回性・局所・明確な対比**でないと気づかれない。決定249 の設計則「既定はリム／明度／opacity・動きは no-preference の中だけ」 |
| ③ | 大ダメージの演出 | L3／L4：数字 30／40px・slash 1.25／1.55・hit stop 45／60。L4／神の一撃／撃破だけ戦闘エリアの WAAPI 揺れ（3／5px・決定224 §11「画面揺れ・暗転は Tier 4/5 だけ」）。⚡は金リング 110px＋34px 金数字（224） | 決定224 PASS・決定232 PASS | 進化バナー／神の一撃バナーが神に重なる（PC-6・候補 #7）／**SP375 で L4 の斬撃線の箱が左端を 13〜15px はみ出す**（§3・視認への影響は小・既存） | 「L2/L3 への画面揺れ・数字拡大」は決定224 §11 を侵食しインフレ → 却下済み（`LANE2_PRE_AUDIT` §4 D） |
| ④ | 神の必殺技（God Strike）の迫力 | 到達反応 200 → カットイン 900（大耀は H3 Max 動画 v2・他 6 神は keyvisual）→ handoff 200 → 溜め・突き 600 → 着弾 1,600（stop 80・52px・揺れ）→ バナー 900 → 進化。決定257 の `burst_rise`（T+450）＋BGM duck | 決定250 Human QA **7/7 PASS**（大耀）・決定257 PASS | バナー「✨ 大耀の一撃！」が system-ui＋絵文字（決定225 §L②）／進化バナーの重なり／スキップ不可（Law 5）／他 6 神の動画は**CEO 課金判断（§6-3 #4／#6）** | 決定250 Try1→Gate v2 NO-GO→Pilot v2：**閾値緩和で PASS させない・形状／位置／semantic 優先**。本 Lane の「画像・動画生成禁止・大規模演出変更禁止」により対象外 |
| ⑤ | カード選択時の操作感 | 決定200 Interaction Feel v1（押下／hover の Tier）・決定233 押下音 0ms・決定239 ゴースト travel・決定224 READY material（`READY_MATERIAL_PILOT`＝大耀 1 枚のみ）・決定249 DEAL rise・決定231／236／238 の札 | 決定200 PASS・決定224 PASS・決定249 PASS | READY material が Pilot 札のみ／通常カードの枠 material（G7・回帰面 高）／無効カードの二重減光（G14）／SP 手札 5 枚目以降が横スクロール外（Known） | d224 未回収差分が **CardView／BattleScreen** を触っているため、本 Lane ではこの 2 ファイルを編集しない（衝突回避） |
| ⑥ | スマートフォンで着弾演出が見えるか | 決定164 一画面固定（`body.battle-viewport`）・決定229 v2 舞台レイヤー分離（着弾は `.enemy-stage` 内 `*-hit-layer` に CSS 配置＝絵と一緒に動く）・決定228／230 名札・決定261／264 構図 | 決定229 Gate 着弾中心 100%・Human QA PASS／決定261・264 PASS | §3 の実測で **新規の欠陥 0**。残：L4 斬撃の箱の左はみ出し 13〜15px、神側の回復リング（240px）が右端を 2px 超える 1 フレーム（いずれも既存） | 決定229 v1 FAIL WITH MODIFICATIONS：「絵だけ動かすと着弾がずれる → 舞台の箱ごと動かす」。本 Lane は箱・絵・着弾レイヤーの位置に触れない |

## 3. SP375 実測（⑥）— headless Playwright・Before build（master `7ba447f`）

スクリプト `scripts/lane2-combat-feel-v2/probe.mjs`（lane1 `acceptance.mjs` と同じ起動手順）。大耀 × 蒼海の龍神（`?enemy=ryujin&seed=cf2-pilot-01`）を素朴な方策（使える札を左から → ラウンドを終える）で勝利まで 1 戦。各手ごとに rAF で DOM を標本化（opacity>0.05 のフレームのみ集計）。評価はしない（数値と撮影）。

| 計測 | PC 1508×660 | SP375×667（DPR 2） |
|---|---|---|
| 敵の絵（`.enemy-avatar`）／舞台（`.enemy-stage`） | 322×305 @ (477,92)／300×285 | **191×183 @ (10,215)**／191×191 |
| 敵の名札（`.enemy-plate`）／手札ドック（`.battle-dock`） | 325×86 @ (155,113)／1240×228 @ y426 | 161×76 @ (23,109)／363×243 @ **y418** |
| 着弾 FX の総数（数字・斬撃・リング・被弾） | 32 | 48 |
| viewport の外に出たフレームを持つ FX | 0 | **3**（L4 斬撃 2・神側回復リング 1） |
| 名札／吹き出し／手札ドックと 30% 超重なった FX | 0／0／0 | **0／0／0** |
| 敵側 FX の中心がその側の絵の中 | 19/19 | **21/21（100%）** |
| HP 帯の遷移（表示 HP） | high→half：turn 17（`一撃` −50＋⚡−30＝590→510）／half→quarter：turn 21（`神託` −250） | 同じ手で同じ遷移（決定論） |
| 重い突き（`god-strike-heavy`）／勝利まで完走／JS error | 4／YES／0 | 4／YES／0 |

- **SP375 の結論：着弾・被弾演出は viewport 内に収まり、UI 文字帯（名札・吹き出し）や手札に隠れていない**。斬撃・数字・金リングの中心は 100% 敵の絵の中（決定229 Gate と同値）
- 残存（既存・本 Lane で直さない）：L4 斬撃 `slash-l4`（scale 1.55・inset 22% 10% の箱）が 191px の舞台で左端を **x −15〜−13px** はみ出す（`#root { overflow:hidden }` で切れる。斜めの光の帯の端だけで視認影響は小）。神側 `impact-ring`（回復 240px）が 1 フレーム右端を 2px 超える
- 帯の遷移の瞬間の Before 撮影（`before/pc-17-break-half.webp`・`before/sp375-17-break-half.webp`）：**PC は HP バー以外に見た目の変化が無い**（`.enemy-wound` の静的な `#ff3b3b30` は撮影でも判別不能）。SP は足元の楕円が後から静かに付くだけ

## 4. 改善案 3 つの比較 → 1 つ選定（AI 判断）

評価軸：Game Feel／Player Value、工数、リスク（既存ルール不変・d224 差分との衝突・SP・a11y／reduced-motion・性能）。頻度は決定232 の 980 戦シミュ（敵への着弾 12.13 回／戦・L1 6.70・⚡0.94・神の一撃 0.40・撃破 1.0）と本実測。

| 案 | 内容 | 効果（Game Feel／Player Value） | 工数 | リスク | 判定 |
|---|---|---|---|---|---|
| **A. Enemy Break v1**（HP 50%／25% の一回性反応） | 表示 HP の帯が下がった瞬間、体が崩れて暗くなる（kb 7／10px・420／560ms）＋名札の赤い閃き（opacity 0.55／0.7）＋傷の円のふくらみ。CSS＋hook・新 DOM／文言／SE 0 | **高**：**2 回／戦 確定**で「削っている」を体に出す。決定225 §D の CEO 主訴「HP ゲージを減らす作業」の残因③に直接当たる。決定232 の梯子（4<5<**7**<8<**10**<11<14）に収まり、着弾→HP が削れる→崩れる の「第 2 拍」になる | **小**：新規 2 ファイル＋`EnemyPanel.tsx` 8 行 | engine／時刻表 0。d224 差分とは hunk 不重複。SP は kb を小さく（5／7px）。reduced では opacity のみ。性能：1 要素の transform／filter＋疑似要素 opacity＋傷 1 枚、2 回／戦 | **採用** |
| B. 神の一撃バナー／進化バナーの位置と書体（候補 #7） | 「✨ 大耀の一撃！」を明朝＋SVG へ、進化バナーを神の顔から外す | 低〜中：0.4〜1 回／戦。決定250 動画 7/7 PASS の直後で相対効果は小 | 小〜中 | **`BattleScreen.tsx` 520／532 行＝d224 未回収差分が触るファイル**（衝突リスク）。決定203／205 の文言保護の確認が要る | 却下（d224 差分の回収後に Hotfix 列で） |
| C. 攻撃カードの hover／press で敵にターゲットのリムを出す（⑤） | 手札の攻撃札を押している間、敵の絵に神色の細リムを 120ms で点灯 | 中（PC のみ。**SP は hover が無く、press は 280ms で commit**＝点灯が見えない） | 中 | **`CardView.tsx`／`BattleScreen.tsx`＝d224 差分のファイル**。決定200 で PASS 済みの Interaction Feel に層を重ねる＝「押した瞬間」の設計を再検証する必要 | 却下 |
| （参考）D. L1／L2 の差の再調整 | stop／kb／数字を L1 と L2 で離す | 7.7 回／戦 | 小 | **CEO が決定232 v1.1 を Final と判定**（「もたつく」再燃リスク） | 却下（既存 CEO 判定） |

**選定理由（A）**：①効果が確定頻度（2 回／戦）で出る唯一の案で、CEO 既知の主訴（決定225 §D ③）に未着手のまま残っていた（`PREMIUM_REAUDIT` §3 #5・§5-1 6）。②同監査の懸念「決定232 の時刻表に乗せる必要あり」は、**表示 HP の帯（visualHp が着弾→hit stop→`HP_LAG_MS` 後に解放する値）を起点にすれば時刻表を変えずに自然に後拍になる**ことをコードで確認して解消した（`combatTimeline`／`enemyVfxTiming` 変更 0）。③既存ルール（engine・数値・カード効果・敵行動）に一切触れず、d224 差分・他 Lane とファイル衝突が無い。④SP375 では絵が 191px なので kb を 5／7px に落とし、決定229 の近い舞台を守る。

反証（採用前に潰した点）：
- 「撃破の一撃でも 25% をまたぐ → 崩しと崩壊（決定226）が重なる」→ `suppress`（表示 HP 0・`plan.outcome === 'won'`・`defeated`）で再生しない。CSS 側も `.enemy-collapse:not(.enemy-defeat)` で崩壊中は外す
- 「再開（続きから）で帯が既に低い → 初回に鳴る」→ 初回（prevBand null）は再生しない（テスト G1）
- 「敵の回復で帯が上下して何度も鳴る」→ 敵の行動に heal は無い（`enemies.ts`）。上がった場合は level を外すだけ（テスト G5）
- 「着弾の揺れ（内側 `.enemy-reaction`）と transform が競合する」→ 別要素（外側 `.enemy-collapse`）に掛けるので合成される。`.enemy-avatar` の filter（決定240）・scale（決定247）には触れない

## 5. 実装内容

### 5-1. 変更ファイル（`git diff --numstat`）

| ファイル | 変更 | 役割 |
|---|---|---|
| `src/components/battle/enemyBreak.ts`（新規・93 行） | 定数 `ENEMY_BREAK`（bodyMs 420／560・plateMs 520／760・woundMs 600／720・kbPx 7／10・kbPxSp 5／7）、純関数 `nextEnemyBreak`（帯の遷移→再生キー）、`enemyBreakClass`／`enemyBreakVars`、hook `useEnemyBreak`（useLayoutEffect・HP と同じ描画サイクル） | 時間・距離の真実は TS 1 か所。CSS は `var(--cf2-*)` で受ける |
| `src/components/battle/enemyBreak.css`（新規・108 行） | `.enemy-panel.cf2-break-half|quarter` の子孫だけに掛ける：体 `.enemy-collapse:not(.enemy-defeat)`・名札 `.enemy-plate::after`（opacity）・傷 `.enemy-wound(-quarter)`。`@media (max-width: 899px)` で SP の kb、`prefers-reduced-motion` で動きを止める | `battle.css` 不変（d224 差分と衝突しない） |
| `src/components/battle/EnemyPanel.tsx`（+8／−1） | import 2 行・hook 1 行・CSS 変数 1 行・根 `.enemy-panel` の className と style | 名札・舞台・体の markup は不変（既存テスト `battleViewportLayout.test.ts` の `className="enemy-plate"` pin を守る） |
| `src/components/battle/enemyBreak.test.ts`（新規・118 行・17 件） | §6 | — |
| `scripts/lane2-combat-feel-v2/probe.mjs`（新規） | §3／§7 の計測 | 受入ツール |

### 5-2. 動き（commit＝0ms の時刻表には触れない）

```
着弾 atMs → hit stop（決定232）→ +HP_LAG_MS 90 → 表示 HP が帯をまたぐ（visualHp）
                                              └→ 同じ描画サイクルで .enemy-panel に cf2-break-half|quarter
                                                   体：相手から離れる方向（--atk-x/--atk-y）へ kb 7px（SP 5）→ 戻る 420ms・brightness 0.72／saturate 0.70
                                                   名札：::after 赤いグラデ＋1px リム opacity 0→0.55→0 520ms
                                                   傷：既存 .enemy-wound が opacity 0→1.6→1・scale 0.6→1.14→1 600ms（終点＝既存の静止状態）
quarter：kb 10px（SP 7）・560ms・brightness 0.6、名札 2 拍（0.7→0.18→0.6）760ms、傷 720ms
```

- 階層（ノックバック px・PC）：L1 4 < L2 5 < **break-half 7** < L3 8 < **break-quarter 10** < L4 11 < 撃破 14（テストで固定）
- 時間：体 420／560ms は L4 の揺れ 0.7s より短く hit stop 60ms より長い（テスト）
- 再生しない条件：初回・同じ帯・帯が上がった・`defeated`・表示 HP 0・`plan.outcome === 'won'`
- reduced-motion：体と傷の animation `none`、名札の閃き（opacity）だけ残す＝情報は失わない（決定249 と同じ方針）
- 音：**追加しない**（v1）。帯の遷移は着弾音の 90ms＋stop 後に来るため、既存 SE を重ねると「二重の着弾」に聞こえる懸念があり、`sound.ts`／`useBattleSound.ts` は d224 差分のファイルでもある。Human QA で「音が欲しい」が出た場合の候補は `resonance_gain` の低速再生（既存 `godDescend` と同系）＝新規音源 0

## 6. テスト結果（自動）

| 項目 | 結果 |
|---|---|
| narrow vitest（`enemyBreak.test.ts`・`battleViewportLayout`・`combatTimeline`・`duelHud`・`hudPlate`・`useReactionLanguage`） | **80 PASS**（6 files） |
| 新規 `enemyBreak.test.ts` 17 件 | 帯の遷移 5（初回／同帯 0・high→half／half→quarter・一撃で high→quarter・suppress・上昇で level 解除）／定数の階層 3／クラスと CSS 変数 2／CSS 5（var 受け・--atk 向き・セレクタがすべて `.enemy-panel.cf2-break*` 配下・`.enemy-reaction`／`.enemy-avatar`／着弾レイヤー不参照・reduced-motion・150 行以内）／EnemyPanel の配線 2（suppress 条件・markup 不変・engine 不参照） |
| full vitest（heavy.lock 取得・単独実行） | **117 files PASS・6 skipped／1,448 PASS・9 skipped**（Before 1,431＋新規 17）・36.96s |
| `tsc -b` | 0 |
| oxlint 1.76.0（`npm run lint`） | **warning 11／error 0**。11 件はすべて既存（`scripts/` 10・`BattleScreen.tsx:275` exhaustive-deps 1＝master と同一）。変更ファイル（`enemyBreak.ts`／`enemyBreak.test.ts`／`EnemyPanel.tsx`／`probe.mjs`）の指摘 **0** |
| build（heavy.lock） | OK。`index-o-E1J9Xm.css` 194.85KB（Before `index-Cpk4tFE6.css` 191.84KB・**+3.01KB**）／`index-Wt87PgC2.js` 468.16KB（Before `index-BjYHWFY7.js` 467.28KB・**+0.88KB**） |
| `src/core`／`rules.ts`／assets／save／gameVersion | 変更 0（`git status`：`src/components/battle/` 3 ファイル＋scripts＋docs のみ） |

## 7. ブラウザ実測：Before／After（PC 1508×660・SP375×667・同一 seed・同一 bot）

Before＝`:4195`（master `7ba447f` の clean build）／After＝`:4196`（本 branch の build）。`probe.mjs` は帯の遷移を `waitForFunction` で待ち、全 animation を一時停止（cf2-* は 20%＝崩しの最深部へ）して撮影・計測し、再開する。

### 7-1. 帯の遷移の瞬間の computed style

| 計測（遷移の瞬間・20% 地点） | Before PC | After PC | Before SP375 | After SP375 |
|---|---|---|---|---|
| high→half：`.enemy-collapse` transform | none | **matrix(0.985, …, −6.99, 0)**＝kb −7.0px・scale 0.985 | none | **−4.99px**・0.985 |
| 同 filter | none | **brightness(0.72) saturate(0.70)** | none | 同 |
| 同 `.enemy-plate::after` opacity | （疑似要素なし＝1 を返す） | **0.469** | — | **0.469** |
| 同 `.enemy-wound` opacity／scale | 1／none（静的） | 0.997／**0.936**（ふくらみ中） | 同 | 同 |
| half→quarter：transform | none | **−8.67px**・0.978 | none | **−6.07px**・0.978 |
| 同 filter／plate opacity／wound scale | none／—／none | brightness(0.72) saturate(0.63)／**0.446**／**1.118** | 同 | 同 |
| 再生された animation | 0 | `cf2-plate-flash-*`・`cf2-wound-bloom-*`・`cf2-break-body-*`（half 520／600／420ms・quarter 760／720／560ms） | 0 | 同 |

### 7-2. 既存の着弾演出・進行の不変（Before→After）

| 項目 | PC | SP375 |
|---|---|---|
| 着弾 FX の viewport 外／名札・吹き出し・ドックとの重なり | 0／0／0／0 → 0／0／0／0 | 3／0／0／0 → 2〜3／0／0／0（§3 の既存 2 件＋回復リング 1 フレーム。bot のクリック時刻差で ±1） |
| 敵側 FX の中心が絵の中 | 19/19 → 17/17（100%） | 21/21 → 21/21（100%） |
| 帯の遷移の手・ラウンド | turn 17（R5）half／turn 21（R6）quarter（同一） | 同一 |
| 重い突き 4／勝利まで完走／JS error 0 | 同一 | 同一 |
| `cf2-break` クラスの出現時刻 | 帯の遷移と**同じフレーム**（PC t=815〜1,382・SP t=1,051〜3,673。差は bot の待ち時間） | 同 |

### 7-3. reduced-motion（`prefers-reduced-motion: reduce` の context・After）

結果 `docs/evidence/combat-feel-v2/after-reduced/`（§11）。PC／SP375 とも勝利まで完走・JS error 0。

| 遷移の瞬間（20% 地点） | PC | SP375 |
|---|---|---|
| 再生された cf2 animation | **`cf2-plate-flash-half@520` のみ**（quarter は `cf2-plate-flash-quarter@760` のみ） | 同 |
| `.enemy-collapse` transform／filter | **none／none** | none／none |
| `.enemy-plate::after` opacity | 0.469（half）／0.446（quarter） | 同 |
| `.enemy-wound` scale | **none**（静的に現れる＝既存どおり） | none |
| 重い突き `god-strike-heavy` | 0（決定232 の reduced 挙動＝既存） | 0 |

→ 動き（体・傷）は止まり、情報（名札の赤い閃き・傷の色・HP）は残る。

### 7-4. 撮影（`docs/evidence/combat-feel-v2/`・500KB 超は WebP）

- `before/`・`after/`：`*-00-calm`・`*-01/03/04-impact`（最初の 3 手の着弾 +400ms）・`*-17-break-half`／`*-21-break-quarter`（帯の遷移の瞬間・20% 地点）・`*-17-band-half`／`*-21-band-quarter`（遷移の手の終わり）・`*-99-end`
- `after-reduced/`：同構成（reduce）
- `probe.json`／`summary.json`：全手の FX 矩形集計・帯の遷移時刻・cf2 出現・layout・エラー

## 8. 残存リスクと触れていないもの

| # | リスク | 影響 | 対処／備考 |
|---|---|---|---|
| R1 | 崩しが着弾の揺れ（決定232）の直後に重なり「2 回殴られた」ように見える | 中（Human QA Q2 で確認） | 体の崩しは外側要素で合成・暗転と名札の閃きで「状態の変化」として見せる。NO なら体の崩しだけ外し名札＋傷に絞る調整案を用意（定数 1 か所） |
| R2 | 一撃で 50% と 25% を同時にまたぐと quarter 1 回だけ（half の拍は出ない） | 低 | 仕様（到達帯を 1 回）。テストで固定 |
| R3 | 傷の円の「ふくらみ」は PC では peak でも薄い（静止値 `#ff3b3b30` を変えていない） | 低 | 静止状態の設計（決定162「静かに傷の色が付く」）を尊重。Human QA で「気づかない」なら peak の opacity（1.6→2.0）だけを上げる |
| R4 | SE を足していない | 低〜中 | §5-2。Human QA の結果で判断（新規音源 0 の範囲） |
| R5 | 名札の `::after` は hudPlate.css の `::before`（角金具）と別だが、将来 `.enemy-plate::after` を他決定が使うと競合 | 低 | クラス `cf2-break` 配下に限定・新規 CSS ファイル |
| R6 | bot（probe）は実プレイヤーと手順が違う。Before/After の FX 件数差 ±数件は bot のクリック時刻の差 | 低 | 遷移の手・ラウンドは同一（決定論）。評価は帯の遷移時刻と computed style で行った |
| — | 触れていない：`src/core`・`rules.ts`・カード／敵データ・`combatTimeline`／`enemyVfxTiming`／`useBattleFx`／`sound`／`useBattleSound`・`battle.css`・`CardView`／`BattleScreen`／`PlayerPanel`・assets・save・gameVersion・DECISIONS.md 本体 | — | — |

## 9. CEO 実プレイ QA（3 問・`npm run dev` または `vite preview` で大耀 × 蒼海の龍神を 1 戦）

1. **Q1** 敵の HP が半分／4 分の 1 を切った瞬間、HP の数字を読まなくても「追い詰めた」と分かりましたか。（YES が合格）
2. **Q2** その反応は「攻撃の着弾」とは別の出来事（敵が崩れた）として見えましたか。着弾と混ざって 2 回殴ったように見えませんでしたか。（別の出来事に見えた＝YES が合格）
3. **Q3** 邪魔・長い・うるさいと感じましたか。（**NO が合格**。NO の場合、追加で「音が欲しい」かを一言）

成功条件：Q1 YES・Q2 YES・Q3 NO。NO があれば自動調整せず停止し、§8 R1／R3／R4 の調整案から 1 つを提示する。

## 10. DECISIONS.md 行ドラフト（PM が統合時に追加・本 Lane は本体を編集しない）

```
| 2026-10-17 | Lane2 Combat Feel Premium v2 Pilot「Enemy Break v1 — 追い詰めた」。「**Fast Gate PASS — PENDING CEO HUMAN QA**」（6 観点監査・3 案比較・選定・実装方式・Gate 判定は **AI 判断**（CLAUDE.md §6-2）。Human QA は **CEO**。commit／push／merge／deploy 0・master `7ba447f` 不変・Production `d2135d2` 不変）。監査：①〜⑤の階層は決定200／224／232／249／250／257 で成立、⑥ SP375 実測＝着弾 FX の中心が絵の中 100%・名札／吹き出し／手札との重なり 0・新規欠陥 0（既存：L4 斬撃の箱が左端 13〜15px はみ出し）。未解決で最も効果が高いのは「HP 50%／25% をまたいだ瞬間が無反応」（決定225 §D 残因③・PREMIUM_REAUDIT §3 #5）。候補 A Enemy Break／B 神の一撃バナー書体／C 攻撃札 hover ターゲットを比較し A を採用（2 回／戦 確定・engine／時刻表 0・d224 未回収差分とファイル hunk 不重複）。実装：新規 `enemyBreak.ts`（93）・`enemyBreak.css`（108）・`EnemyPanel.tsx` +8/−1。表示 HP の帯が下がった瞬間に 1 回、体 kb 7/10px（SP 5/7）420/560ms＋名札の赤い閃き（opacity）＋傷の円のふくらみ。階層 L1 4<L2 5<half 7<L3 8<quarter 10<L4 11<撃破 14。撃破の一撃・表示 HP 0・再開時は再生しない。reduced-motion は閃きのみ。Gate：vitest full 1,448 PASS（+17）・tsc 0・lint 変更ファイル 0・build CSS +3.0KB／JS +0.9KB・PC／SP375 × Before／After で遷移フレームに transform −7.0/−8.7px（SP −5.0/−6.1）・brightness 0.72・名札 0.47 を実測、既存着弾の viewport 内・重なり 0・絵の中 100% は不変・console 0。Human QA 3 問（§9）。詳細 `docs/COMBAT_FEEL_PREMIUM_V2_PILOT.md`・証跡 `docs/evidence/combat-feel-v2/`。 |
```

## 11. 証跡一覧

- `docs/evidence/combat-feel-v2/before/`（Before build `index-BjYHWFY7.js`／`index-Cpk4tFE6.css`）
- `docs/evidence/combat-feel-v2/after/`（After build `index-Wt87PgC2.js`／`index-o-E1J9Xm.css`）
- `docs/evidence/combat-feel-v2/after-reduced/`（After・`prefers-reduced-motion: reduce`）
- `scripts/lane2-combat-feel-v2/probe.mjs`（`node scripts/lane2-combat-feel-v2/probe.mjs <outDir> <baseUrl> [maxActions]`、`CF2_REDUCED=1`・`CF2_VIEWPORTS=pc,sp375`）
- 重い実行の直列化：`npm run build`・`npx vitest run` は scratchpad `heavy.lock` を取得して各 1 回ずつ実行（ロック待ち 0 回）
