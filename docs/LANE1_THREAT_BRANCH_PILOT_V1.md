# Lane 1 — Threat Branch Pilot v1（鬼将・軍略変種）

**状態：** 実装・自動 Gate 通過・ローカル commit のみ（push 0・merge 0・tag 0）。CEO 実プレイ QA 待ち（`?pilot=threat`）。
branch `feat/lane1-combat-read-pilot-v1`（master `7ba447f`＝Production v1.0.0 runtime から分岐）。2026-10-17・【Dev】記録。
`docs/DECISIONS.md`／`docs/RELEASE_STATUS.md` は未編集（統合時に PM が行う）。本書は AI 判断の記録であり、CEO 決定ではない。

---

## 1. Player Problem（PM 監査の結論・確認済み）

- v1.0.0 の敵 7 体は「攻撃／溜め／必殺／連撃」しか持たず、**勝敗を決めるのは託宣（加護）の時機だけ**。カードをランダムに出しても加護を読めば勝率 99.6%＝reader と同じ（HDD 監査）。1 択率 41%。→「手札で考える」が成立していない（**K33 OPEN**）。
- 失敗した Pilot：敵ガード（決定216）・数値で複数解（255）・AP 平準化（260）・事後説明（262）・未来情報の常時表示（263「正解を教えられている感」）。
- 成功した変更（240・246・252・忠次 274）の共通点＝**1 手先の予兆／読みの報酬が攻撃側かテンポに乗る／峰が R4**。
- 決定274 忠次「軍略」：R3 の溜め文言で条件を告げ、R4 開始時の敵 HP 比 ≤ 0.5 なら軽い手、超えていれば名前つき必殺。CEO 評価＝**戦略性 PASS・再戦意欲 PASS**。ただし忠次本体（enemy_08・画像・舞台・台詞・将軍家 docs）は Creator Kit 権利・素材の論点を伴うため、**機構だけ**を切り出して既存敵の変種で試す。

## 2. 3 案比較（AI 判断）

| 案 | 内容 | Player Value | Strategic Depth | Implementation Cost | Regression Risk | 既存 NO-GO との距離 |
|---|---|---|---|---|---|---|
| **A（採用）軍略分岐の既存敵 Pilot** | 鬼将のコピー 1 体に R4 tactic（HP ≤ 50% で attack 13／超なら必殺 26）。R3 の溜め文言で条件を告げる | 高：R3 に「追い込むか、R4 に備えるか」の目標が手札の数字で立つ。追い込めれば攻撃側に報酬（受け 26→13）| 高：R3 のカード選択＋託宣（天啓で越すか加護を温存するか）の 2 層。1 手先・事前に正解は出ない | 低：機構は決定274 で実装・テスト済み（移植）。新規素材 0・新 CSS 0 | 低：既存 7 体の値 0 変更。Pilot 敵は URL フラグでしか出ず、save／records／daily／gameVersion に触れない | 240／246／252／274 の成功則そのまま。216（敵ガード）・263（未来情報）は踏まない |
| B 必殺を受け切ったら共鳴+2 等のテンポ報酬 | 必殺をブロックで完全に受けたら共鳴ゲージ等を加算 | 中：受け切る動機が増えるが「加護を読む」既存解を強化するだけ | 低：手札の判断は「守り札を出す」1 択に収束しやすい（1 択率 41% を悪化させる懸念）| 中：共鳴・スコア式へ新規 effect／event。7 体の挙動が変わる | 中〜高：全敵に影響＝gameVersion 変更・Daily 影響 | 262（事後説明）に近い「結果に後から意味を足す」型 |
| C 妨害カードの意味付け（妨害値を予告に反映） | 妨害の debuff を予告表示に反映し、妨害札の価値を見せる | 中：表示改善で妨害札が選ばれやすくなる | 低〜中：判断の材料は増えるが、新しい分岐（目標）は生まれない | 中：intent 表示・`enemyActionTotal` の意味変更（加護の床計算に波及）| 中：予告の数値定義を変える＝全敵・既存テスト多数に波及 | 263 の「正解を教えられている感」に接近（妨害後の数値を常時表示） |

**結論：A を採用。** B は既存の「託宣だけで決まる」構造を変えず、C は表示変更であって判断の目標を作らない。A だけが「R3 の手札で目標を立てる」を生み、かつ既存 7 体・ランキングに触れずに Pilot できる。しきい値・数値は sim で確認（§5）。

## 3. 仕様

### 3-1. 汎用機構（決定274 の移植・忠次固有名は除く）
- `src/core/types/enemy.ts`：`EnemyTacticDef`（`kind: 'tactic'`・`cond: { type: 'enemyHpRatioAtMost', ratio }`・`then`／`else`）、`EnemyActionScript = EnemyActionDef | EnemyTacticDef`。`EnemyDef.actions: EnemyActionScript[]`
- `src/core/engine/tactic.ts`：`tacticBranch`／`resolveEnemyTactic`（純関数・乱数 0・「以下」で then・maxHp 0 は else）
- `src/core/engine/round.ts`：`nextEnemyAction` が解決してから倍率をかける（予告時 1 回。`runEnemyTurn` は intent をそのまま実行＝予告と実行は一致）
- `src/core/engine/intent.ts`：`enemyActionTotal` は解決前の tactic を 0 として受ける（charge と同じ）
- `src/core/data/rules.ts`：`enemyTactic: { defaultHpRatio: 0.5 }`

### 3-2. Pilot 敵 1 体（`src/core/data/enemies.ts`）
- `CORE_ENEMIES`（既存 7 体・不変）＋ `PILOT_ENEMIES`、`ENEMIES = [...CORE_ENEMIES, ...PILOT_ENEMIES]`、`PILOT_ENEMY_IDS = { oniTactic: 'enemy_09' }`（**08 は忠次用に予約**）、`isPilotEnemyId()`
- enemy_09 `業斧の鬼将・軍略`：maxHp 94・art・stage・visualType・rank 2・battleCries は鬼将（enemy_02）と**同一**（新規素材 0）。`typeLabel '重撃型（軍略）'`・`typeDescription 'R4は傷が深ければ斧が鈍る。R3までに追い込め。'`（25 字）
- actions：`5 / 9 / charge '⚠ 傷が浅ければ次は断岩' / tactic{ ≤0.5 → attack 13, else special 26 '業斧・断岩' } / 15 / 11 / 7`。7R 合計 then 60／else 73。**else 側は鬼将と完全同一**（＝追い込めなければ鬼将そのもの）。then を 0 にしない（追い込んでも受けは要る）
- `pickEnemyId`（「神に委ねる」）は CORE のみ参照

### 3-3. Pilot 経路
- `src/components/pilot/pilotFlag.ts`：`?pilot=threat` のときだけ有効（読み込み時 1 回。決定274 の `shogunatePilot.ts` と同じ構造・名前は汎用）
- `EnemySelectScreen.tsx`：Pilot 時のみ roster 末尾に PILOT_ENEMIES ＋ 案内「Threat Branch Pilot v1：この敵との戦いは戦績・セーブ・報酬に残りません」＋ 既存 chip クラス再利用の印「Pilot・記録に残らない」。攻略済みの印は Pilot 敵に出さない
- `MatchupBoard.tsx`：`CORE_ENEMIES`（49 盤に Pilot を出さない）
- `useGameEngine.ts`：Pilot 敵の対局は battleSave・runLog・records・matchup・daily・stake・bond・newBest・送信待ちに**一切書かない**（一括ガード）
- `BattleScreen.tsx`：Pilot 敵の対局は報酬カードを提示しない（`rewardDone = rewardDoneState || pilotBattle`。既存の条件式・`rewardDailyWiring.test.ts` の契約は不変）
- `core/replay/gameVersion.ts`：指紋の対象を **`CORE_ENEMIES`** に変更し、`RULES.enemyTactic` も除外。理由＝Pilot 敵の追加で既存プレイヤーの gameVersion（Daily 表・K26 day-lock）を変えないため。`RULES.enemyTactic.defaultHpRatio` は Pilot 敵の行動表に `cond.ratio` として埋め込まれるので、CORE 敵が将来 tactic を使えば CORE_ENEMIES の指紋に自動で入る（取りこぼし無し）。master の版 `1.d794038a00b5b53c` が据え置かれることをテストで固定

### 3-4. UI
- `EnemyPanel` の既存書式で足りる（R3：⚡＋溜め文言、R4：🔥＋「業斧・断岩」26 か ⚔ 13）。**新規 CSS・演出は追加しない**。
- 決定274 branch にあった「EnemyPanel が次ラウンドの tactic を現在 HP で事前解決して必殺充填 glow を切り替える」変更は**持ち込まない**（決定263「未来情報の常時表示」の境界。判断は文言と手札の数字で行わせる）

## 4. 守った境界

| 境界 | 手段 | 検証 |
|---|---|---|
| 既存 7 体不変（1 文字も） | `CORE_ENEMIES` を分離 | `coreRoster.test.ts`：JSON sha256 `b4ce1e31…9cdd4`＝master 実測と一致 |
| save v9 不変 | intent には解決後の 4 kind のみ | `enemyTactic.test.ts`：盤面 JSON に "tactic" が現れない |
| gameVersion 不変 | 指紋を CORE_ENEMIES・`enemyTactic` 除外 | `coreRoster.test.ts`／`useReactionLanguage.test.ts`：`1.d794038a00b5b53c` |
| Daily・seed・攻略盤不変 | `ENEMY_IDS`／`CORE_ENEMIES` のみ参照 | golden（pickEnemyId 14 seed・Daily 9 日・49 盤） |
| 戦績・セーブ・報酬に残さない | hook 一括ガード・報酬畳み | `pilotFlag.test.ts`（source-fixed） |
| 1 手先・正解表示なし | R3 charge 文言のみ・EnemyPanel 不変 | `pilotFlag.test.ts`：EnemyPanel／battle.css に tactic 無し |
| 新 kind なし | tactic は行動表専用・解決後は既存 4 kind | 型＋テスト |
| 新規素材 0 | 鬼将の art／stage 共有 | `coreRoster.test.ts` |
| 新敵 ID の衝突回避 | 08 予約・09 使用 | `coreRoster.test.ts`：enemy_08 未定義 |

既存テストの調整（CORE の性質であるもののみ）：`enemies.test.ts`（舞台 bg の一意性を CORE に）、`cardStyle.test.ts`（49 行動台帳を CORE に）、`enemyActions.test.ts`（必殺 6 行動を CORE に）、`balanceSim.test.ts`（Planner 出力を master と同一に保つため CORE に）。これら以外の「7 敵全部」ループ（enemySpawn・battleSaveStorage・startEnemy・useReactionLanguage）は `ENEMIES`（8 体）のまま通過＝Pilot 敵も同じ不変条件を満たす。

## 5. 決定論シミュレーション（`threatBranch.sim.test.ts`・`SIM_THREAT_BRANCH=1`）

`docs/evidence/lane1-threat-branch/sim.json`・`SIMULATION_SUMMARY.md`（表は JSON から生成）。7 神 × seed 40 × normal／hard × 方策 {greedy, raceAware, reader} × 敵 {enemy_02, enemy_09}。n＝280／セル。

| Gate | 基準 | 実測（normal） | 判定 |
|---|---|---|---|
| G1 then 率 | 35〜65%（greedy・全神 pooled） | **41.8%**（候補 0.45→28.9%／0.50→41.8%／0.55→58.6%。raceAware 58.9%・reader 41.8%） | PASS |
| G2 読みの報酬 | raceAware 勝率 ≥ greedy かつ平均スコア > greedy | 勝率 100% = 100%、スコア **630.1 > 627.0**（reader 628.7） | PASS（差は +3.1 点＝0.5%。形式上の通過。§6 参照） |
| G3 難しくしすぎない | enemy_09 reader 勝率が enemy_02 ±3pt | **100.0% vs 100.0%**（diff 0pt。hard：100.0% vs 98.6%） | PASS |
| G4 R3 の手が結果を変えた割合 | 報告のみ | R3 に攻撃札と妨害札の両方がある局面 48.9%（137/280）。その中で **then／else が反転 21.9%**（30/137・全体の 10.7%）。勝敗の反転 0%。スコア差あり 94.9% | 情報（§6） |

神別 then 率（normal・greedy）：恵比寿 62.5／大耀 37.5／蒼毘 47.5／彩花 32.5／寿楽 20.0／福栄 37.5／笑蓮 55.0。raceAware では全神 47.5〜80.0 へ上がる（寿楽 20→60 が最大）。

**しきい値の最終値：0.5（変更なし）。** 0.5 で G1 を満たす。0.55（58.6%）も範囲内だが、0.5 は「maxHp 94 → 47」で文言「傷が深ければ（半分）」と一致し、決定274 の設計値とも揃うため据え置き。
hard では then 率 17.9%（HP ×1.15 で 54 以下が必要）。G1 は normal の基準なので判定外だが、**hard では分岐が片寄る**ことを Known として残す（将来、難易度別 ratio か hard の maxHp 丸めで調整余地。今回は触らない）。

## 6. 推測と実測の区別

- **実測**：§5 の数値・§7 の Gate 結果・golden 一致。
- **実測の限界**：sim 方策は normal で全敵 100% 勝つ（HDD 監査 reader 99.6% と同傾向）。そのため G2 の「勝率」と G4 の「勝敗の反転」は差が出ない構造になっており、**G2 は形式上の PASS**（スコア +0.5%）。これは「勝敗は託宣で決まる」という Player Problem そのものの再現であり、本 Pilot が解こうとしている対象。**人が R3 で迷い、追い込めた／追い込めなかったで体験が変わるか**は sim では測れず、CEO 実プレイ QA（§8）でのみ判定できる。
- **推測**：G4 の「then／else 反転 21.9%（局面あり）」は「R3 の手札選択が R4 の受け（26 か 13 か）を本当に変える局面が 5 局に 1 局ある」と読める。妨害札を持たない彩花の sim デッキでは R3 の 2 択自体が立たない（withChoice 0）＝神によって体験が違う可能性（推測。実プレイで確認）。
- **推測**：raceAware の R4 託宣使用率が reader より低い（44.6% vs 60.0%）＝追い込めた局面では加護が要らず、託宣が後半（R5 15・R6 11）へ回る＝テンポに乗る報酬が出ている可能性。

## 7. 自動 Gate 結果（直列・2026-10-17）

| Gate | 結果 |
|---|---|
| `npx tsc -b --noEmit` | エラー 0 |
| `npx oxlint .` | exit 0・エラー 0・警告 11（すべて master 既存：`scripts/**` の未使用 import と `BattleScreen.tsx:275` の exhaustive-deps。本 Pilot の変更箇所に警告 0） |
| `npx vitest run`（full） | **119 files passed / 7 skipped（126）・1463 tests passed / 10 skipped（1473）**・49.8s |
| `SIM_THREAT_BRANCH=1 npx vitest run src/core/engine/threatBranch.sim.test.ts` | 1 passed・3.1s・決定論（同 seed 再実行で完全一致）・G1〜G3 PASS |
| `npm run build` | 成功・2.0s・`index-*.js` 469.33 kB（gzip 146.01 kB）・`index-*.css` 191.84 kB（gzip 35.75 kB） |

新規テスト：`coreRoster.test.ts`（12）・`enemyTactic.test.ts`（11）・`pilotFlag.test.ts`（9）＝32 件通過・`threatBranch.sim.test.ts`（1・既定 skip）。

## 8. CEO 実プレイ QA の手順

1. worktree `C:\Users\kimi1\SevenGodsGame-lane1` で `npm run dev` → 表示された port で **`http://localhost:<port>/?pilot=threat`** を開く（`?pilot=threat` が無いと Pilot 敵は出ない）
2. 神を選ぶ（推奨：大耀＝決定218 の QA と同じ神、または寿楽＝sim で then 率が最も低く「追い込めるか」が割れる神）→ 敵選択の**末尾**「業斧の鬼将・軍略」（印：Pilot・記録に残らない）
3. 比較として同じ神で「業斧の鬼将」（enemy_02）も 1 戦（R1〜R3 は同じ数字。R3 文言と R4 だけが違う）
4. R3 開始時の予告「⚡ ⚠ 傷が浅ければ次は断岩」を見て、手札の数字と敵 HP（47 以下にできるか）を見て手を決める。R4 の予告が「🔥 業斧・断岩 26」か「⚔ 13」かを確認
5. 終了後、ホーム→戦績・「続きから」・49 攻略盤に Pilot 戦が**残っていない**ことを確認

**設問（合否基準）**

| # | 設問 | 合格 |
|---|---|---|
| Q1 | R3 で「追い込むか、守る（R4 に備える）か」を**自分で**選んだと感じたか | YES |
| Q2 | 手札の数字を数えて R3 の手を決めたか（敵 HP 47 以下にできるかを計算したか） | YES |
| Q3 | 正解を教えられている感じがしたか | **NO が合格** |
| Q4 | もう一度戦いたいか（追い込めなかった／追い込めたとき、別の神でも試したいか） | YES |

合否：Q1・Q2・Q4 が YES かつ Q3 が NO で **PASS**。Q3 が YES なら文言（`⚠ 傷が浅ければ次は断岩`）の見直しが先。Q1 が NO なら then 13／else 26 の差か、しきい値 0.5 の調整候補（0.55）を sim で再評価。

## 9. 未完了・UNKNOWN・CEO 判断が必要な点

- **未完了**：CEO 実プレイ QA（§8）。`docs/DECISIONS.md`・`RELEASE_STATUS.md` への記録（PM）。Production への公開判断（Pilot 経路は URL フラグ隔離だが、runtime 変更を含む＝公開時は Gate 再実行と CEO 承認が必要）。
- **UNKNOWN**：人間の R3 判断時間・迷い（sim では測れない）。妨害札を持たない構築での R3 体験。hard の分岐片寄り（then 17.9%）が hard プレイヤーに「分岐が無い」と映るか。
- **CEO 判断が必要**：無し（§6-3 の 10 項目に該当しない）。Pilot の採否と Production 反映は QA 後に PM が【CEO DECISION REQUIRED】の形で上げる。
- **守れなかった点**：無し。禁止事項（push／merge／tag／branch 変更／他 worktree 変更／DECISIONS 編集／既存 7 体変更／新 kind／正解表示／`git add -A`）はいずれも行っていない。
