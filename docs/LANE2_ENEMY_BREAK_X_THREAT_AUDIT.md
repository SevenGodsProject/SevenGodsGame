# Lane 2 — Enemy Break v1 × 軍略 Pilot（Threat Branch Pilot v1）組み合わせ監査

- 日付：2026-10-17（Lane 2・第 4 波）
- 担当：Designer／Dev（**AI 判断**：再検証・組み合わせ監査・改善要否の判定・QA 設計は CLAUDE.md §6-2 の範囲。Human QA は **CEO**）
- worktree `SevenGodsGame-lane2b`・branch `feat/lane2-combat-feel-v2-1`（起点 `f21d77e`＝Enemy Break v1 完成形）。**push／PR／merge（master・他 Lane）／tag／deploy 0**
- 検証用 branch `tmp/lane2-x-lane1-combo`（`f21d77e` から作成し `feat/lane1-combat-read-pilot-v1` `699c59c` を `--no-ff` で取り込んだ `60234a7`。**検証専用・削除しない・どこにも merge しない**）
- 対象外（禁止・遵守）：engine／`rules.ts`／カード・敵データの変更、`battle.css`／`BattleScreen.tsx`／`CardView.tsx`／`combatTimeline.ts`（d224 未回収差分の衝突ファイル）の編集、画像生成、既存 NO-GO（B 神の一撃バナー・C 攻撃札 hover リム・決定263 等）の再提案、DECISIONS.md 本体の編集（行ドラフトは §7）

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| §1 完成済み成果の再検証 | **一致**。`f972931`（runtime 5 ファイル）／`f21d77e`（docs＋証跡）の内容、`before`／`after`／`after-reduced` の `summary.json`・`probe.json` の値（帯の遷移 turn 17／21、kb −6.99／−4.99px、brightness 0.72、名札 ::after 0.469、cf2 の出現、FX 重なり 0、JS error 0）、`enemyBreak.test.ts` 17 件の内容は、`docs/COMBAT_FEEL_PREMIUM_V2_PILOT.md` §5〜§7 の記述と一致。差異 0（§1-3） |
| §2 組み合わせ監査 | merge **conflict 0**（両 Lane の変更ファイルは互いに素。`EnemyPanel.tsx`／`enemyBreak.*` は Lane 1 が触れていない）。(a) R3 で「軍略の予告（溜め・金の呼吸グロー）」と「Enemy Break 50% 帯の崩れ」は**同じ名札の上で同時に起きうる**が、要素・animation プロパティ・aria は別で競合なし。しかも **Enemy Break half の境界（表示 HP ≤ 47）と軍略 then の境界（HP ≤ 47）は 0〜94 の全 HP で一致**（§2-4）＝崩れは「予告の条件を満たした合図」として働く。(b) 予告文言は崩れ・閃きで隠れない（SP375 では名札と舞台が縦に分離。閃きは文字の上に最大 α≈0.17 の赤）。(c) 操作ロックは既存の 280ms（カード）／700ms（敵ターン）のみで、Enemy Break は timer・state・pointer-events を一切足さない＝崩れの再生中（≈490〜1,120ms）に手札は操作できる。(d) engine 差分：Lane 2 の `src/core` 差分 **0 行**、merge 後の `src/core` 差分は Lane 1 単独の差分と **sha256 一致** |
| §3 改善 Pilot | **不要**（根拠 §3）。「崩れを 120ms 遅らせる」等は、同時性そのものが設計上望ましい（崩れ＝then 到達の合図）ため採らない。既存はみ出し 2 件（L4 斬撃箱 13〜15px・回復リング 2px）は `battle.css` 衝突のため**記録のみ** |
| 自動 Gate（本監査で実行） | 境界一致チェック（node・heavy-run 不要）**PASS**／narrow vitest（merge 後 5 ファイル）**65 PASS**／build（merge 後）**OK**（CSS は Lane 2 After と同一ハッシュ）／headless 組み合わせ実測 `probe-threat.mjs` **6 run・JS error 0**（§2-6：R3 で帯をまたいだ 4 run すべて「ロック解除 < 崩れ開始」「崩れ中の予告文言 不変」「予告 viewport 外 0」「即ラウンド終了でも切替時に崩れ残り無し」）。vitest full／tsc／lint は **UNRUN**（RAM・統合時に PM） |
| CEO QA | **READY**（§4）。PM が lane2b で port 5182 を起動。所要 15 分 |
| CEO 判断が必要な点 | **0**（§6-3 の 10 項目に該当なし） |

## 1. 完成済み成果の再検証

### 1-1. commit の内容

| commit | 変更ファイル | 文書（`COMBAT_FEEL_PREMIUM_V2_PILOT.md` §5-1）との一致 |
|---|---|---|
| `f972931` feat | `enemyBreak.ts`（93 行・新規）／`enemyBreak.css`（108 行・新規）／`enemyBreak.test.ts`（118 行・17 件・新規）／`EnemyPanel.tsx`（+8／−1）／`scripts/lane2-combat-feel-v2/probe.mjs`（327 行・新規） | 一致（`git show --stat`：5 files・+654／−1） |
| `f21d77e` docs | `docs/COMBAT_FEEL_PREMIUM_V2_PILOT.md`（196 行）＋ `docs/evidence/combat-feel-v2/{before,after,after-reduced}/`（各 19 ファイル：撮影 18・`probe.json`・`summary.json`） | 一致 |

`src/core`・`rules.ts`・`combatTimeline`／`enemyVfxTiming`／`sound`／`battle.css` の変更 0（`git diff 7ba447f f21d77e -- src/core`＝0 行）。

### 1-2. 証跡（`summary.json`／`probe.json`）と文書 §7 の照合

| 文書の記述 | before | after | after-reduced | 判定 |
|---|---|---|---|---|
| 帯の遷移：turn 17（half）／turn 21（quarter）・PC／SP とも同一 | 17／21 | 17／21 | 17／21 | 一致 |
| `cf2-break` の出現 | `cf2Seen: []` | half＋quarter（PC・SP） | half＋quarter | 一致 |
| high→half の `.enemy-collapse` transform：PC −7.0px・SP −5.0px・scale 0.985 | none | `matrix(0.985027,…,-6.98718,0)`／`-4.99084` | （未撮影項目） | 一致 |
| 同 filter brightness 0.72／saturate 0.70 | none | `brightness(0.720513) saturate(0.700549)` | — | 一致 |
| 名札 ::after opacity 0.469 | — | 0.469388 | — | 一致 |
| 着弾 FX viewport 外：PC 0／SP 3→2〜3、名札・吹き出し・ドック重なり 0 | 0／3・0・0・0 | 0／2・0・0・0 | 0／2 | 一致 |
| 敵側 FX の中心が絵の中：PC 19/19→17/17・SP 21/21 | 19/19・21/21 | 17/17・21/21 | 13/13・17/17 | 一致 |
| 勝利まで完走・JS error 0 | true・0 | true・0 | true・0 | 一致 |
| reduced：重い突き 0 | — | — | heavyStrikes 0（PC・SP） | 一致 |

### 1-3. テスト（`enemyBreak.test.ts` 17 件）の内容

文書 §6 の内訳（帯の遷移 5／定数の階層 3／クラスと CSS 変数 2／CSS 5／EnemyPanel の配線 2）とソースの `describe`／`it` が一致。source pin（`useEnemyBreak(hpShown, enemy.maxHp, defeated || hpShown <= 0 || plan?.outcome === 'won')`・`className="enemy-plate"` 不変・`src/core/engine` 不参照）も `EnemyPanel.tsx` の現物と一致。実行結果は §5。

## 2. 軍略 Pilot（Lane 1）との組み合わせ監査

### 2-1. merge の記録

- `git checkout -b tmp/lane2-x-lane1-combo`（`f21d77e`）→ `git merge --no-ff feat/lane1-combat-read-pilot-v1`（`699c59c`）→ **`60234a7`・conflict 0・手編集 0**
- 理由：両 Lane は同じ起点 `7ba447f` から分岐し、変更ファイルが互いに素。Lane 1 の UI 変更（`BattleScreen.tsx` 8 行・`EnemySelectScreen.tsx`・`MatchupBoard.tsx`）と Lane 2 の UI 変更（`EnemyPanel.tsx` 9 行・`enemyBreak.*`）は別ファイル
- merge 後の `enemyBreak.ts`／`enemyBreak.css`／`EnemyPanel.tsx` は `f21d77e` と **差分 0**
- 検証後は `feat/lane2-combat-feel-v2-1` へ戻って作業。tmp branch は削除しない

### 2-2. (a) R3 で「軍略の予告」と「Enemy Break 50%」が同時に起きる局面の有無と見え方

**起きる。しかも設計上「起きて欲しい」局面である。**

時刻表（カードを押した瞬間＝0ms。定数は `useGameEngine.ts`／`enemyVfxTiming.ts`／`enemyBreak.ts`・不変）：

```
0          カード click。pendingCardUid でロック（CARD_PLAY_REVEAL_MS 280）
280        commit（engine の HP が減る）。ロック解除＝手札・「ラウンドを終える」が押せる
+90/+150   着弾（CARD_IMPACT_MS／CARD_HEAVY_IMPACT_MS）→ hit stop 30〜60ms（HIT_STOP_MS）
+90        HP_LAG_MS：表示 HP（visualHp）が減る → 帯が high→half をまたぐ
≈490〜580  .enemy-panel に cf2-break-half（同じ描画サイクル）
           体 420ms（≈910〜1,000）／名札の赤い閃き 520ms（≈1,010〜1,100）／傷 600ms（≈1,090〜1,180）
```

R3 の間、軍略の予告 `⚡ ⚠ 傷が浅ければ次は断岩` は `.enemy-plate .intent.intent-tier-charge`（金・`arena-glow-breathe` 1.8s 無限）として**ずっと**表示されている。したがって R3 中に表示 HP が 47 以下へ落ちた手では、名札の上で「金の呼吸グロー（予告）」と「赤い閃き（崩れ）」が ≈520ms 重なる。

| 観点 | コードの事実 | 判定 |
|---|---|---|
| 同一要素への animation 競合 | 予告のグローは `.intent-tier-charge::after`（`battle.css:659`）、崩れの閃きは `.enemy-plate::after`（`enemyBreak.css:48`）。**別要素の疑似要素**。体の崩れは `.enemy-collapse`（決定232 の `.enemy-reaction`・決定240／247 の `.enemy-avatar` とは別の階層）。`animation` ショートハンドの上書きは 0 | 競合なし |
| z-index／重なり順 | 両 ::after とも `position:absolute`・z-index 指定なし → 文書順で名札の ::after が予告の上に描かれる。閃きは `linear-gradient(90deg, #ff3b3b4d → #ff3b3b1f(55%) → transparent)` × opacity 最大 0.55 ＝ 予告のある左端でも **赤 α≈0.17**。文字（#ffd166・20px／SP 17px・text-shadow）は不透明のまま | 可読 |
| aria-live の二重読み上げ | `.intent` に aria-live なし（`aria-live` は `RewardOverlay` の toast と `VictoryStage` の sr 文のみ）。Enemy Break は DOM・文言を追加しない（class と CSS 変数だけ） | 二重読み上げ 0 |
| 予告文言の変化 | 予告は `state.enemy.intent` を直接描画。R3 中は不変。R4 の予告（`⚔ 130` か `🔥 業斧・断岩 260`）へ切り替わるのは「ラウンドを終える」を押した瞬間 | 崩れ中の文言変化 0（通常操作） |
| 最悪ケース（即操作） | 帯をまたいだ直後（≈500ms）にロックは既に解除されている（280ms）。ただし `END_ROUND` の commit は `ENEMY_TURN_REVEAL_MS` 700ms 後（`useGameEngine.ts` dispatch：`setIsEnemyTurn(true)` → 700ms → `commit`）なので、R4 予告（`⚔ 130`／`🔥 業斧・断岩 260`）が現れるのは**押してから ≥700ms 後**。閃き 520ms は崩れの開始後に押せば必ず終わっている（実測 §2-6：4 回とも「予告切替時に崩れ残り無し」）。残光と重なるのは、HP が減って見える前（カード click 後 280〜490ms）にラウンドを終えた場合のみ（≤≈120ms・現実的に起きない）。R3 の敵行動は charge（着弾なし・lunge なし）で敵側の新しい演出も無い | 実質 0 |
| reduced-motion | 崩れ＝名札の閃き（opacity）のみ。予告のグローは既存どおり | 情報は失わない |

**Lane 1 側の観察（本 Lane は触らない・記録のみ）**：`EnemyPanel.tsx` の `nextIsSpecial` は `def.actions[round]` の `kind` を見るため、enemy_09 の R3（次が `tactic`）では必殺充填の強化 glow（`enemy-avatar-charging-super`）は付かず、通常の `enemy-avatar-charging`（金）になる。Lane 1 文書 §3-4「次ラウンドの tactic を事前解決して glow を切り替える変更は持ち込まない（決定263 の境界）」と整合しており、**意図どおり**。Enemy Break はこの glow（`.enemy-avatar` の filter）に触れない。

### 2-3. (b) 画面視認性（SP375）

| 項目 | 事実 | 判定 |
|---|---|---|
| 名札と舞台の位置 | SP375 の実測（`after/summary.json` layout）：名札 `x23 y109 w161 h76`、舞台 `x10 y211 w191 h191`＝**縦に分離**。体の崩れ（translate −5px・横）と傷の円（舞台の足元）は名札の矩形に入らない | 予告は隠れない |
| Lane 1 の R3 撮影（`docs/evidence/lane1-threat-branch/acceptance/battle-r3-sp375.png`） | 予告は名札内で 2 行（`⚠ 傷が浅ければ／次は断岩`）、金の枠付き。名札の高さが 2 行ぶん増えるが、閃きは `inset:0`・`border-radius:inherit` で名札の寸法に追従 | はみ出し 0 |
| 赤い閃きと文字 | §2-2（α≈0.17・520ms・1 回） | 可読 |
| 横スクロール | Enemy Break は transform（合成層）のみ・layout を変えない。`after/summary.json`：`scrollW 375 = vw 375` | 0 |
| 既存のはみ出し 2 件（L4 斬撃箱 左端 13〜15px・回復リング 2px） | 本 Pilot 前から存在（`before` でも `fxOffViewport 3`）。`battle.css` が d224 衝突ファイルのため**今回は記録のみ・触らない** | 据え置き |

### 2-4. (c) 操作遅延

| 項目 | コードの事実 | 判定 |
|---|---|---|
| ロックの発生源 | `isPlayerTurn = phase==='playerTurn' && status==='playing' && !isEnemyTurn && !pendingCardUid && !cutinActive && !enemyCutinActive`（`BattleScreen.tsx:356`）。`pendingCardUid` は 280ms（`CARD_PLAY_REVEAL_MS`）、`isEnemyTurn` は 700ms（`ENEMY_TURN_REVEAL_MS`）、カットインは自前の時刻で解除 | Enemy Break は**どれにも関与しない** |
| Enemy Break が足すもの | `useEnemyBreak`：`useLayoutEffect` で class を 1 回更新するだけ。**setTimeout 0・animationend 待ち 0・GameState 0**。`enemyBreak.css`：`.enemy-plate::after` は `pointer-events:none`。手札・ドック・ボタンのセレクタは不参照（テストで固定） | timeline の延長 0 |
| 崩れ中の操作 | ロック解除（280ms）は崩れの開始（≈490ms）より**前**。崩れの 420〜760ms の間、手札・「ラウンドを終える」は操作可能（§2-2 の時刻表） | ブロック 0 |
| 描画負荷 | `.enemy-collapse` の `filter`＋`transform`（合成層・既存の hit stop と同系）、名札 ::after の opacity、傷の scale。新 DOM 0 | 既存着弾と同等 |

### 2-5. (d) 決定論・engine 差分 0

| 検証 | 結果 |
|---|---|
| `git diff 7ba447f f21d77e -- src/core` | **0 行**（Lane 2 は engine に触れていない） |
| `git diff f21d77e 60234a7 -- src/core` の sha256 ＝ `git diff 7ba447f 699c59c -- src/core` の sha256 | **一致**（`904fb276…3a41`）＝ merge 後の engine 差分は Lane 1 単独の差分と同一 |
| `enemyBreak.ts` の import | `react`・`./visualHp` のみ。`src/core/engine`／`src/core/data` 不参照（grep 0・テストで固定） |
| 境界の一致（軽量チェック・`node --experimental-strip-types`・heavy-run 不要） | enemy_09（maxHp 94・ratio 0.5）で HP 94→0 を全走査：`hpBand !== 'high'` ⇔ `tacticBranch === 'then'` の不一致 **0／95**。初めて then になる HP ＝ **47** ＝ 初めて half 帯になる HP。quarter 帯は 23。`resolveEnemyTactic(47)`＝attack 13・`(48)`＝special 26 |

### 2-6. headless 実測（merge 後 `60234a7` の build・`vite preview :4197`・`probe-threat.mjs`・大耀 × 業斧の鬼将・軍略・seed 3 本 × PC 1508×660／SP375×667）

証跡 `docs/evidence/combat-feel-v2/threat-combo/`（`summary-threat.json`・`probe-threat.json`・R3／R4 開始と崩れの最深部の撮影）。bot は「使える札を左から使う→ラウンドを終える」。R3 で帯をまたいだ手では**ボタンが戻った瞬間にラウンドを終える**（最悪ケースの再現）。

| run | R3 予告 | R3 で帯 high→half | R4 予告（分岐） | 崩れ開始（click 後） | ロック解除（ボタン） | 崩れ中の予告文言 | 予告グロー（charge）と閃きの同時フレーム | 名札 ::after peak | 予告 viewport 外／横スクロール／手札 pointer-events none | 即ラウンド終了 → 予告切替（click 後） | 切替時に崩れ残り | JS error |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pc／seed 01 | ⚠ 傷が浅ければ次は断岩 | なし（R4 の神託で half） | 🔥 業斧・断岩 260（else） | — | — | — | 0 | 0.55 | 0／0／0 | — | — | 0 |
| pc／seed 02 | 同 | **あり**（⚔ 豪快な一撃） | ⚔ 強打 130（then） | 667ms | 368ms | 不変（1 種） | **10** | 0.55 | 0／0／0 | +875ms | **なし** | 0 |
| pc／seed 03 | 同 | **あり** | ⚔ 強打 130（then） | 750ms | 418ms | 不変 | **8** | 0.55 | 0／0／0 | +971ms | **なし** | 0 |
| sp375／seed 01 | 同 | なし（R4 で half） | 🔥 業斧・断岩 260（else） | — | — | — | 0 | 0.55 | 0／0／0 | — | — | 0 |
| sp375／seed 02 | 同 | **あり** | ⚔ 強打 130（then） | 820ms | 81ms | 不変 | **21** | 0.55 | 0／0／0 | +1,167ms | **なし** | 0 |
| sp375／seed 03 | 同 | **あり** | ⚔ 強打 130（then） | 867ms | 49ms | 不変 | **22** | 0.55 | 0／0／0 | +768ms | **なし** | 0 |

- 崩れの最深部（名札 12%・体 20%）の computed style：`.enemy-collapse` transform PC −6.99px／SP −4.99px・scale 0.985（Lane 2 単独 After と同値）、名札 ::after opacity 0.55（peak）、予告の文字色 `rgb(255,209,102)`（金・不変）・20px／SP 17px、予告の呼吸グロー ::after opacity 0.51〜0.79（既存の 0.5〜0.8 の範囲＝崩れが乱していない）
- 撮影（`pc-cf2-threat-02-r3-break`／`sp375-cf2-threat-02-r3-break`）：赤い閃きの下でも予告「⚠ 傷が浅ければ次は断岩」は PC 1 行・SP 2 行とも判読できる。体は相手から離れる側へ崩れ、名札の矩形には入らない
- 「ロック解除 < 崩れ開始」は 4／4（崩れの再生中に手札・ボタンは操作可能）。即ラウンド終了でも R4 予告の切替は click の 700ms＋ 後で、4／4 とも崩れは終了済み
- seed 01（R3 で 47 以下にできず else）では R4 の神託（天啓）で half をまたぎ、`🔥 業斧・断岩 260` の予告の下で崩れが出た（charge グローなし・同時フレーム 0）＝「追い込めなかった」側でも崩れは 1 回だけ普通に出る
- 注：`breakEndMs`（JSON）は撮影のため全 animation を ≈1s 停止した区間を含む。実際の長さは定数どおり（体 420／名札 520／傷 600ms）。停止区間を除いた `breakActiveMs` を出す修正版 `probe-threat.mjs`（commit 済み）での再実行は heavy-run が exit 97（Lane 1 の sim が heavy.lock を再取得・空き RAM 551MB）で **UNRUN**。JSON の 4 件の `card` が Locator オブジェクトになっている点も同修正で直してある（実際の札は `⚔ 豪快な一撃`）
- 撮影の保管：PNG 26 枚（PC ≈1.2MB・SP375 ≈1.35MB）の WebP 変換（Chromium canvas）も同じ理由で UNRUN。commit するのは JSON 2 本＋鍵となる撮影 2 枚（`pc-cf2-threat-02-r3-break.png`／`sp375-cf2-threat-02-r3-break.png`）のみ。残り 24 枚は lane2b の作業ツリーに**未追跡のまま置く**（削除しない）。統合時に `scratchpad/webp-convert.mjs` 相当で WebP 化して追加するか、不要なら PM が捨てる

**意味**：敵は回復しないので、R1〜R3 のどこかで Enemy Break half が鳴った ⇔ R4 は必ず then（⚔ 13）。崩れは「予告の条件（傷が浅ければ…）を**満たした**合図」として機能し、HP の数字が既に示している情報に**気づきやすさ**を足すだけで、新しい未来情報は出さない（決定263「未来情報の常時表示」の境界は越えない。一回性・過去の事象への反応）。

## 3. 改善 Pilot の要否（AI 判断）

**不要。** 理由：

1. 同時発生は「競合」ではなく**設計上の一致**（§2-5）。崩れを 120ms 遅らせても、予告のグローは連続再生のため「重なり」は解消せず、着弾→崩れの因果（決定232 の時刻表に対する Enemy Break v1 の根拠）だけが弱くなる
2. 要素・プロパティ・aria・ロックのいずれにも競合が無い（§2-2〜2-4）
3. 最悪ケース（閃きの残光の下で R4 予告が切り替わる）は、R4 予告の commit が「ラウンドを終える」の 700ms 後（`ENEMY_TURN_REVEAL_MS`）であるため実測 4／4 で起きず（§2-6）、起きるとしても残光（赤）と切り替わる予告（⚔ 13＝追い込めた／🔥 26）は意味が矛盾しない。これを「予告切替時に閃きを打ち切る」にするには `BattleScreen`／`combatTimeline` 側の状態が要り、d224 衝突ファイルに触れる
4. `battle.css`（既存はみ出し 2 件）は衝突ファイルのため、本 Lane では触らない

**Human QA の結果で見直す条件**：§4 の Q4 が NO（崩れが予告の合図に見えず「別の出来事が 2 つ」に見えた）なら、`ENEMY_BREAK.plateMs.half` を 520→360ms に短縮し閃きの peak を 0.55→0.4 へ下げる案（`enemyBreak.ts` の定数 1 か所・`battle.css` 不変）を提示する。自動調整はしない。

## 4. CEO 実プレイ QA（READY・所要 15 分）

### 4-1. 起動（PM）

- **PM が lane2b で port 5182 を起動**する。推奨 checkout は **`tmp/lane2-x-lane1-combo`**（Enemy Break v1 と軍略 Pilot の両方を含む。通常の 7 体は Lane 1 でも 1 文字も変わらないので Q1〜Q3 の判定に影響しない）。Lane 1 の worktree（5181）は Enemy Break を含まないため、組み合わせ確認には使えない
- `feat/lane2-combat-feel-v2-1` のままで起動した場合は Q1〜Q3 のみ可能（Q4〜Q6 は統合後に実施）
- URL：通常 `http://localhost:5182/?enemy=ryujin`、組み合わせ `http://localhost:5182/?pilot=threat`（敵選択の**末尾**「業斧の鬼将・軍略」を選ぶ）

### 4-2. 手順

| # | 内容 | 時間 |
|---|---|---|
| 1 | 大耀 × **蒼海の龍神**（通常 7 体の 1 体・`?enemy=ryujin`）を 1 戦。HP（表示 1,030）が 50%（表示 ≤ 510）・25%（表示 ≤ 250）を切る瞬間を見る | 5 分 |
| 2 | 大耀 × **業斧の鬼将・軍略**（`?pilot=threat`）を 1〜2 戦。R3 の予告「⚡ ⚠ 傷が浅ければ次は断岩」を見ながら、R3 中に敵 HP を 470 以下へ落とす（崩れが出る）。R4 の予告が「⚔ 130」になることを確認。余裕があれば R3 で落とし切れない戦いも 1 回（崩れが出ず R4 が「🔥 業斧・断岩 260」） | 8 分 |

### 4-3. 設問と合否

| 設問 | 合格 |
|---|---|
| **Q1** 敵 HP が半分／4 分の 1 を切った瞬間、数字を読まなくても「追い詰めた」と分かったか | YES |
| **Q2** その反応は「攻撃の着弾」とは別の出来事（敵が崩れた）に見えたか。着弾と混ざって 2 回殴ったように見えなかったか | YES（別の出来事） |
| **Q3** 邪魔・長い・うるさいと感じたか | NO |
| **Q4（組み合わせ）** 軍略の R3 で HP を半分以下へ落とした瞬間の崩れが、「予告（傷が浅ければ次は断岩）の条件を満たした合図」として読めたか | YES |
| **Q5（組み合わせ）** 崩れ・赤い閃きの間、予告の文字が読めなくなった瞬間があったか（SP でも確認） | NO |
| **Q6（組み合わせ）** 崩れの間に手札や「ラウンドを終える」の操作が待たされたと感じたか | NO |

成功条件：Q1 YES・Q2 YES・Q3 NO・Q4 YES・Q5 NO・Q6 NO。NO／YES が逆の設問があれば自動調整せず停止し、§3 の調整案（定数 1 か所）または `COMBAT_FEEL_PREMIUM_V2_PILOT.md` §8 R1／R3／R4 から 1 つを提示する。

### 4-4. CEO 実プレイ QA 結果（2026-10-17・PM 記録）

| 項目 | 内容 |
|---|---|
| 実施 | 2026-10-17 午前。PM が lane2b を `tmp/lane2-x-lane1-combo`（60234a7＝Enemy Break v1 ＋ 軍略 Pilot v1 699c59c）に checkout し port 5182 を 1 本起動（空き RAM 1.2GB・dev サーバー他 0 本）。URL `http://127.0.0.1:5182/?pilot=threat` |
| 回答 | **Q1 YES／Q2 YES／Q3 NO／Q4 YES／Q5 NO／Q6 NO ＝ 6/6 PASS**（CEO「すべて OK」） |
| 判定 | **条件付き GO**：Enemy Break v1 と軍略 Pilot の組み合わせを Pilot として継続採用。Production 公開・既存 7 体への軍略展開は未承認（軍略 Pilot v1 と同じ条件）。追加の演出改修は CEO 指示により現時点では不要 |
| 判断履歴（訂正） | CEO から、最初の回答は設問の意図を誤解していたため無効とし「すべて OK」に訂正する旨の指示があった。PM が記録した QA 結果は本表の 1 件のみで、無効となった最初の回答・NO-GO 判定はどの文書にも記録していない（訂正前の記録は存在しない）。公式記録は本表とする |
| 次工程（CEO 指示） | ① 軍略 Pilot v1.1（lane1 916daa4／f5bcb4d／06e3bba）と Enemy Break v1 の統合 Gate を準備 ② hard の演出条件のずれ（傷の光 ≤0.5 と hard しきい値 0.6）を確認 ③ v1.0.1 の独立リリース方針は維持（本組み合わせは v1.0.1 に含めない） ④ push・merge・deploy は CEO 別途承認まで禁止 |

## 5. 自動 Gate（本監査で実行したもの・RAM 制約下）

| 項目 | 結果 |
|---|---|
| 境界一致チェック（§2-5・node 単体・heavy-run 不要） | **PASS**（不一致 0／95） |
| narrow vitest（merge 後 `60234a7`・`enemyBreak`／`enemyTactic`／`pilotFlag`／`coreRoster`／`cardStyle` の 5 ファイル・heavy-run `--min-mb 450`） | **5 files・65 PASS**（2.01s・08:17。1 回目は Lane 1 の sim が heavy.lock を保持しており exit 97、最後の 1 回の再試行で実行） |
| build（merge 後 `60234a7`・heavy-run `--min-mb 900`） | **OK**。`index-o-E1J9Xm.css` 194.85KB（Lane 2 単独 After と**同一ハッシュ**＝CSS は Lane 1 で変わらない）／`index-CYbN6yov.js` 470.21KB（Lane 2 After 468.16KB ＋ Lane 1 分 ≈2.05KB） |
| `vite preview`（dist・port 4197）＋ headless 組み合わせ実測 `scripts/lane2-combat-feel-v2/probe-threat.mjs`（heavy-run `--min-mb 900` 1 回の中で preview 起動→probe→preview 終了） | {{COMBO_PROBE}} |
| vitest full／`tsc -b`／lint（merge 後） | **UNRUN**（RAM 6GB・空き 400〜700MB の時間帯が長く、heavy.lock も Lane 1 の sim が保持していた。narrow／build／probe を優先。統合時に PM の Gate で実行） |

`probe-threat.mjs`（新規・受入ツール）が測るもの：各カードの着弾ごとに rAF で `cf2-*` animation の開始／終了時刻・予告の呼吸グローとの同時フレーム数・崩れ中の予告文言の不変・予告矩形の viewport 内・名札 ::after の peak opacity・「ラウンドを終える」が再び押せる時刻（崩れの終了より前か）・手札の pointer-events、R3 で帯をまたいだ手では**即ラウンド終了**して R4 予告への切替時刻と崩れの残りを記録。R3／R4 開始時と崩れの最深部を撮影。実行：`node scripts/lane2-combat-feel-v2/probe-threat.mjs <outDir> <baseUrl>`（`CF2_VIEWPORTS=pc,sp375`・`CF2T_SEEDS=…`）。

## 6. commit・残課題

- commit（ローカルのみ・push 0）：§8
- 残課題：統合時に PM が merge 後の vitest full・`tsc -b`・lint・build を 1 回実行（本監査では UNRUN の項目）。`probe-threat.mjs` が UNRUN の場合は統合後の preview に対して 1 回実行し、`docs/evidence/combat-feel-v2/threat-combo/` に置く
- 触れていないもの：`src/core`・`rules.ts`・`battle.css`・`BattleScreen.tsx`・`CardView.tsx`・`combatTimeline.ts`・`EnemyPanel.tsx`・`enemyBreak.*`（本監査で runtime 変更 **0**）・Lane 1 の worktree・DECISIONS.md 本体

## 7. DECISIONS.md 行ドラフト（PM が統合時に追加・本 Lane は本体を編集しない）

```
| 2026-10-17 | Lane2 Enemy Break v1 × Lane1 軍略 Pilot 組み合わせ監査（AI 判断・runtime 変更 0）。f972931／f21d77e の証跡・テストは文書と一致。tmp/lane2-x-lane1-combo（60234a7）で Lane 1 を --no-ff merge：conflict 0。R3 の軍略予告（金の呼吸グロー）と Enemy Break 50% の赤い閃きは同じ名札で同時に起きうるが、別要素・animation 競合 0・aria-live 0・ロック追加 0（崩れ ≈490〜1,120ms に対しロック解除 280ms）。Enemy Break half の境界（表示 HP ≤47）＝軍略 then の境界（HP ≤47）が全 HP で一致＝崩れは「予告の条件を満たした合図」。改善 Pilot 不要と判定（120ms 遅延は因果を弱めるだけ）。engine 差分：Lane 2 は 0 行・merge 後は Lane 1 単独と sha256 一致。既存はみ出し 2 件は battle.css 衝突のため記録のみ。CEO QA 6 問（Q1〜Q3＋組み合わせ Q4〜Q6・15 分・PM が lane2b 5182 を tmp branch で起動）。詳細 docs/LANE2_ENEMY_BREAK_X_THREAT_AUDIT.md。 |
```

## 8. commit 一覧（本監査）

| branch | commit | 内容 | runtime 変更 |
|---|---|---|---|
| `tmp/lane2-x-lane1-combo` | `60234a7` | `feat/lane1-combat-read-pilot-v1`（`699c59c`）を `--no-ff` で取り込んだ検証用 merge（conflict 0・手編集 0）。**どこにも merge しない・削除しない** | 両 Lane の既存 commit の和のみ |
| `feat/lane2-combat-feel-v2-1` | `68a691c` | `scripts/lane2-combat-feel-v2/probe-threat.mjs`（新規・受入ツール）＋ `docs/evidence/combat-feel-v2/threat-combo/`（JSON 2・撮影 2） | **0**（`src/` 不変） |
| `feat/lane2-combat-feel-v2-1` | （本文書の commit・`git log` 参照） | `docs/LANE2_ENEMY_BREAK_X_THREAT_AUDIT.md`（新規） | **0** |

push／PR／merge（master・他 Lane）／tag／deploy **0**。本 branch の先頭は `f21d77e`（Enemy Break v1 完成形）＋ 上記 2 commit で、`src/` は `f21d77e` と同一。
