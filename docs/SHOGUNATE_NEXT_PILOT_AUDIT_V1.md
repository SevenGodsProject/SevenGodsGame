> **状態（2026-10-21・Lane 4「将軍家・新敵キャラクター」・Planner＋Dev・AI 判断・docs-only・read-only 調査）：AUDIT COMPLETE — 実装 0／ダウンロード 0／`src`・`public`・`art-source`・`docs/DECISIONS.md` 変更 0。忠次 Pilot v0.3（`feat/shogunate-pilot-v0.3` @ `5a357f1`）は Production master `1ce9876`（v1.0.1）に対して merge-tree **conflict 0**、v1.0.2 RC（`release/v1_0_2-rc` @ `fe1eb37`・Lane 1 編集中）に対しては **12 ファイル conflict**。推奨する次期 Pilot ＝「**忠次 v0.4：v1.0.2 RC 追従 ＋ Enemy Break 併用 ＋ 予告グローの表示 HP 同期（1 行）**」（CEO 判断 不要・CEO の作業は iPhone 5 分の設問回答のみ）。Preview 4180〜4182 は本日時点で**停止中**（本 Lane では再起動しない）。**

# 将軍家 次期 Pilot 監査 v1 — 忠次 v0.3 の実装状態・iPhone QA 設問・新敵 9 体の優先順位・Enemy Break 互換性・次の 1 手

- 日付：2026-10-21／担当：Lane 4（Planner＋Dev）／区分：**AI 判断（CLAUDE.md §6-2）・docs-only**
- 基点：`origin/master` `1ce9876`（Production v1.0.1）。worktree `C:\Users\kimi1\SevenGodsGame-lane4`・branch `docs/lane4-shogunate-next-pilot-v1`
- 読み取り専用で参照した worktree：`SevenGodsGame-shogunate-pilot`（`feat/shogunate-pilot-v0.3` `5a357f1`・merge-base `b2739e4`）／`SevenGodsGame-lane2b`（`release/v1_0_2-rc` `fe1eb37`・Lane 1 編集中＝閲覧のみ・実行 0）／`SevenGodsGame-lane1`（`06e3bba`）
- 入力：`docs/SHOGUNATE_PILOT_V0_1.md`〜`V0_3.md`・`V0_2_REVIEW.md`・`docs/SHOGUNATE_FACTION_DESIGN_V1.md`・`docs/assets-kit/shogunate-manifest.json`（10 体・16 枚）・Pilot branch の `src` 差分・RC の `enemyBreak.ts`／`.css`／`EnemyPanel.tsx`／`enemies.ts`／`tactic.ts`・`docs/COMBAT_PILOTS_INTEG_GATE_V1.md`・`docs/LANE2_ENEMY_BREAK_X_THREAT_AUDIT.md`・`docs/LANE1_THREAT_BRANCH_PILOT_V1_1.md`・`docs/DECISIONS.md`（決定274・279）
- 守った禁止事項：未取得 9 体のダウンロード 0・Kit MCP 画像取得 0・`src`／`public`／`art-source` 変更 0・`docs/DECISIONS.md` 編集 0・push／merge／tag／deploy／削除／`git add .`／他 worktree の git 書き込み 0・vitest／vite build／dev サーバー起動 0・Bash 文字列内バッククォート 0

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 忠次 v0.3 の状態（§1） | branch 5 commit（v0.1 `47fae57` → v0.2 `bfea4b7` → review `c6f872f` → v0.3 `5a357f1`）。merge-base `b2739e4` からの差分 **120 files（+4,463／−29）**。うち `src` **25**（runtime 17・test 8）、`src/core` runtime **7**（`enemies.ts`・`rules.ts`・`engine/tactic.ts`〔新規〕・`engine/round.ts`・`engine/intent.ts`・`types/enemy.ts`・`types/index.ts`）。隔離＝`?pilot=shogunate`（`components/pilot/shogunatePilot.ts`・読み込み時 1 回）＋`CORE_ENEMIES`／`SHOGUNATE_ENEMIES` の配列分離＋`useGameEngine` の記録ガード＋`BattleScreen` の報酬畳み込み。新規テスト **36 it**（+ sim 1 skip）・full vitest **1,439 PASS**・Playwright 受入 **80／80**（check 22 か所 × PC／SP375 × 通常／Pilot） |
| Production との乖離（§1-6） | `git merge-tree 1ce9876 5a357f1` ＝ **conflict 0**（tree `af5c8d1`）。ただし **v1.0.2 RC `fe1eb37` とは 12 ファイル conflict**（`tactic.ts`・`enemyTactic.test.ts` は add/add、`enemies.ts`・`rules.ts`・`round.ts`・`intent.ts`・`types/enemy.ts`・`BattleScreen.tsx`・`EnemySelectScreen.tsx`・`MatchupBoard.tsx`・`cardStyle.test.ts`・`useGameEngine.ts`）。RC は決定274 の「軍略」を enemy_09 向けに**再実装**（難易度別しきい値 `ratioByDifficulty`・`resolveEnemyTactic` が第 4 引数 `difficulty` を取る）しているため、textual に自動 merge される `EnemyPanel.tsx` も **型エラー（引数不足）＝意味的 conflict** になる。`?pilot=` の値も `threat`（RC）と `shogunate`（忠次）で**排他** |
| iPhone QA（§2） | YES／NO **7 問**（5 分）。v0.3 の要点は **R3 の 1 場面**（赤い光が「箱」か「輪郭」か）。前提：PM が `SevenGodsGame-shogunate-pilot` で `vite preview --outDir dist-v03 --port 4182` を再起動（本日 4180〜4182 は **LISTEN なし**）・同一 Wi-Fi・Firewall 4182 |
| 新敵 9 体の優先順位（§3） | **1 直政 → 2 康政 → 3 岡っ引き → 4 忠勝 → 5 くノ一 → 6 影 → 7 鬼半蔵 → 8 ドーマン → 9 康虎**。上位 3 体は **engine 変更 0〜S** で入る（直政＝既存語彙＋軍略の「分岐の形」違い／康政＝軍略の条件種別 +1／岡っ引き＝attack のみ ★1）。4 位以降は新語彙（反撃・封じ・共鳴干渉）か ★5 Boss の test 更新が先行条件。**どの 1 体にも舞台背景 1 枚（CEO 生成＝§6-3 #5／#6）・台詞 7 本（CEO 監修）・台帳 2 行**が付く |
| Enemy Break 互換性（§4） | **設計上は一致・CSS セレクタの重なり 0**。`hpBand`（≤0.5 half／≤0.25 quarter）と軍略 `then`（≤0.5）は**同じ境界**（忠次 98：normal 49・easy 41・hard 56。v0.3 は難易度別しきい値を持たないため全難易度で不一致 0）。v0.3 の R3 赤グロー（`.enemy-avatar` の drop-shadow）と Enemy Break（`.enemy-collapse` の transform／brightness・`.enemy-plate::after`・`.enemy-wound`）は**別要素**＝クラス競合なし。**ただしタイミングに 1 点**：Pilot の `EnemyPanel` は予告グローの分岐を **engine の実 HP** で解決するため、カードをタップした瞬間（着弾前）に赤→金へ切り替わり、Enemy Break（表示 HP・着弾後 +90ms）より**先に**合図が出る。RC の enemy_09 は逆に tactic を解決しないため R3 に必殺充填グローが**付かない**（強化なし）。統合時は **`hpShown` で解決する 1 行**に揃えるのが最適（§4-3） |
| 次期 Pilot（§5） | **推奨＝忠次 v0.4**：①v1.0.2 RC へ追従（conflict 12 ファイルの解決・`tactic.ts` は RC 版へ一本化・`?pilot=` の値を複数受け付ける）②Enemy Break を忠次でそのまま併用（追加 CSS 0）③`EnemyPanel` の分岐解決を `hpShown`＋`difficulty` に（3 行）。コスト：触るファイル ≈15・新規テスト +3・AI 0.5 日・**CEO 5 分 × 1 回**（§2 の 7 問を v0.4 で一括）。CEO 判断：**不要**（承認済み Pilot の範囲内・branch 隔離・Production 0）。四天王 1 体追加（直政）は **v0.4 PASS 後**（RC 追従前に体を増やすと同じ conflict hunk を 2 回解くことになる） |
| CEO 判断が必要か | **不要**。CEO の作業は「§2 の 7 問に iPhone で答える」だけ（v0.3 のまま今すぐ可／v0.4 完成後に 1 回でまとめることも可＝推奨） |

---

## 1. 忠次 Pilot v0.3 の実装状態（read-only・`SevenGodsGame-shogunate-pilot`）

### 1-1. branch と commit

| sha | 版 | 内容（commit message 要約） | runtime |
|---|---|---|---|
| `47fae57` | v0.1 | 忠次 × 1 体（軍略・R4 分岐）を `?pilot=shogunate` で試験導入。42 files・+2,478／−26 | あり（engine＋UI） |
| `bfea4b7` | v0.2 | 背景・キャラ・演出の一体感（額縁統一・soft-light・金茶グロー・周辺減光・heavy 突進・入口／カットイン filter）。34 files | あり（表示のみ・`visualType` 1 語） |
| `b30576c` | — | acceptance.mjs の出力先分離＋v0.2 受入スクショ 10 枚 | 0 |
| `c6f872f` | review | v0.2「改善効果 NOT DEMONSTRATED」の分析（画素差 1.5〜6.4%・箱型グローの特定） | 0 |
| `5a357f1` | v0.3 | R3 必殺充填の箱型 `box-shadow` を enemy_08 だけ drop-shadow へ（CSS 1 ルール）＋契約テスト +1＋pixdiff | あり（CSS 11 行） |

merge-base（integ master 当時）＝ `b2739e4`。Production は `1ce9876`（v1.0.1・★再付番を含む）。

### 1-2. 差分ファイル一覧（`git diff --stat b2739e4 5a357f1`＝120 files・+4,463／−29）

| 区分 | 件数 | ファイル |
|---|---|---|
| `src/core` runtime | **7** | `data/enemies.ts`（`CORE_ENEMIES` 改名・`SHOGUNATE_ENEMY_IDS`／`SHOGUNATE_ENEMIES`／`ENEMIES = [...CORE, ...SHOGUNATE]`／`isShogunateEnemyId`／`pickEnemyId` は CORE 参照）、`data/rules.ts`（`enemyTactic.defaultHpRatio: 0.5`）、`engine/tactic.ts`（新規 22 行：`tacticBranch`／`resolveEnemyTactic`）、`engine/round.ts`（`nextEnemyAction` が解決してから倍率）、`engine/intent.ts`（`enemyActionTotal` が `EnemyActionScript` を受ける）、`types/enemy.ts`（`EnemyTacticDef`・`EnemyActionScript`）、`types/index.ts`（re-export） |
| `src/core` test | 4 | `engine/enemyTactic.test.ts`（10）、`data/shogunateRoster.test.ts`（9）、`engine/shogunateTactic.sim.test.ts`（1・`SIM_SHOGUNATE=1` のみ）、`data/enemies.test.ts`／`engine/enemyActions.test.ts`（CORE を回す更新） |
| `src/components`・`src/hooks` runtime | 10 | `pilot/shogunatePilot.ts`（新規 32 行）、`setup/EnemySelectScreen.tsx`（Pilot 時だけ末尾に追加・印「幕府 Pilot・記録に残らない」）、`setup/MatchupBoard.tsx`（49 盤は CORE）、`setup/setup.css`（chip／notice）、`battle/EnemyPanel.tsx`（次 R が tactic なら実 HP で解決して必殺充填判定・`--enemy-art` 注入）、`battle/BattleScreen.tsx`（Pilot 敵は報酬を畳む・`.battle` に `data-enemy`）、`battle/BossEntrance.tsx`／`battle/BattleEnemyCutin.tsx`（`data-enemy`）、`battle/battle.css`（末尾 76 行の Pilot ブロック・全セレクタ `[data-enemy='enemy_08']`）、`hooks/useGameEngine.ts`（Pilot 対局は battleSave・戦績・攻略盤・神階・絆・Daily・送信待ちを書かない） |
| `src/components` test | 4 | `pilot/shogunatePilot.test.ts`（8）、`battle/shogunateVisual.test.ts`（8）、`battle/cardStyle.test.ts`／`battle/useReactionLanguage.test.ts`（golden 更新） |
| 素材 | 3 | `art-source/enemies/tadatsugu/tadatsugu_front.webp`（Kit 原本 138,730B・sha256 manifest 一致）、`public/assets/enemies/tadatsugu/art.webp`（768²・57,326B）、`public/assets/backgrounds/stages/08-shogunate-camp.webp`（STG-02 の非生成派生・164,216B） |
| scripts | 4 | `scripts/shogunate-pilot/{prepare-assets,acceptance,compare,pixdiff}.mjs` |
| docs | 6 | `SHOGUNATE_PILOT_V0_1/2/3.md`・`V0_2_REVIEW.md`・`assets-kit/shogunate-manifest.json`（公式の無改変コピー）・`ASSET_RIGHTS_LEDGER.md` §8（ENEMY-KIT-01 ◎／STG-08） |
| evidence | ≈95 | `docs/evidence/shogunate-pilot{,-v02,-v03}/`（acceptance.json ×3・compare.json・pixdiff ×2・sim.json・PNG ≈80 枚） |
| その他 | 1 | `.gitignore`（`dist-v03`） |

### 1-3. engine 差分の性質

- **`EnemyState.intent` の型は不変**（解決後の既存 4 kind だけが入る）→ **save v9 不変**。`tactic` は行動表（静的データ）にだけ存在
- 乱数 0（seed 以外の入力は敵 HP 比のみ）・予告は 1 手先のまま・正解表示なし・敵ブロックなし（決定216／263 の境界内）
- 既存 7 体は `shogunateRoster.test.ts` が JSON の sha256 で固定。`pickEnemyId`（14 seed golden＋500 seed）・Daily 9 日 golden・49 盤 7×7 いずれも不変
- `gameVersion` は v0.1 時点で `ENEMIES` 全体を指紋にしていたため golden が動いた（`1.d794038a00b5b53c → 1.1e2bb49b546a2bc1`）。**RC（`fe1eb37`）では指紋が `CORE_ENEMIES` だけ**になっているので、RC 追従後は忠次を足しても `gameVersion` が動かない（§1-6）

### 1-4. v0.1 → v0.3 の変更点（要約）

| 版 | 変えたもの | 変えていないもの | 自動 Gate |
|---|---|---|---|
| v0.1 | 軍略 engine・忠次データ（HP 98・★3・7R＝5／9／charge「⚠ 傷が浅ければ次は総攻め」／tactic（≤50%：attack 12・超：special 24「軍略・総攻め」）／15／10／6）・Pilot 経路・記録ガード | 既存 7 体・seed・Daily・Save | tsc 0・vitest 1,431・受入 80/80・sim（then 率 38.6%・raceAware 52.1%） |
| v0.2 | 立ち絵の額縁統一（高さ 652・上 60／下 56）・soft-light の光レイヤー・外光 紫→金茶・接地影・背景 彩度 0.42／明度 0.7・暖色の周辺減光・`visualType: 'heavy'`・入口／カットイン filter・PC `--artScale 1.04` | engine・行動表・`RULES`・既存 7 体 CSS | vitest 1,438・受入 80/80・画素差 1.5〜6.4%（CEO：改善効果 NOT DEMONSTRATED） |
| v0.3 | `.enemy-panel[data-enemy='enemy_08'] .enemy-avatar.enemy-avatar-charging.enemy-avatar-charging-super { box-shadow: none; filter: drop-shadow ×5 }`（紅蓮の芯＋広い輪＋金の内光） | 画像・engine・既存 7 体の charging-super（`box-shadow` の箱のまま） | vitest 1,439・受入 80/80・R3 の輪の変化率 PC 81%／SP 53%・他場面 ≤2.4% |

### 1-5. テスト・受入の数

| 種別 | 数 | 根拠 |
|---|---|---|
| 新規 unit（it） | **36**＝`enemyTactic` 10＋`shogunateRoster` 9＋`shogunatePilot` 8＋`shogunateVisual` 8＋`shogunateTactic.sim` 1（既定 skip） | `grep -c "^\s*it("` |
| full vitest（v0.3） | 1,439 PASS・10 skip・0 fail（125 files） | `SHOGUNATE_PILOT_V0_3.md` §3（本 Lane では再実行していない） |
| Playwright 受入 | **80／80**（`acceptance.mjs` の `check(` 22 か所 × PC 1508×660／SP375 × 通常 URL／Pilot URL・core 7 名のループ含む） | `docs/evidence/shogunate-pilot-v03/acceptance.json` |
| 比較撮影 | 入口／R1／R3 溜め／R4 予告 × PC／SP × v0.1／v0.2／v0.3 ＝ 24 枚＋`pixdiff` 2 本 | 同 `compare.json`・`pixdiff-v0{1,2}-vs-v03.json` |

### 1-6. Production・RC との乖離（`git merge-tree --write-tree`・読み取りのみ）

| 対象 | 結果 | 意味 |
|---|---|---|
| **master `1ce9876`（Production v1.0.1）× `5a357f1`** | **conflict 0**（tree `af5c8d1`） | v1.0.1 の変更（★再付番・Fast Gate）は忠次 branch と textual に干渉しない。ただし後述の ★ の意味変化（§3-2）に注意 |
| **RC `fe1eb37`（v1.0.2・Lane 1 編集中）× `5a357f1`** | **conflict 12 files**：`src/core/engine/tactic.ts`（add/add）・`src/core/engine/enemyTactic.test.ts`（add/add）・`src/core/data/enemies.ts`・`src/core/data/rules.ts`・`src/core/engine/round.ts`・`src/core/engine/intent.ts`・`src/core/types/enemy.ts`・`src/components/battle/BattleScreen.tsx`・`src/components/setup/EnemySelectScreen.tsx`・`src/components/setup/MatchupBoard.tsx`・`src/components/battle/cardStyle.test.ts`・`src/hooks/useGameEngine.ts` | RC（Lane 1）が決定274 の軍略機構を **enemy_09 向けに再実装**しているため、同じ場所に別の文面が入っている。中身はほぼ同型（`EnemyTacticDef`・`resolveEnemyTactic`・`CORE_ENEMIES` 分離・`isPilotEnemyId`・`?pilot=` スイッチ）＝**解決方針は「RC 版を正とし、忠次のデータと表示だけを載せ替える」** |
| Lane 1 `06e3bba` × `5a357f1` | 同 12 files（`useGameEngine.ts` も content conflict） | 同上 |

**textual には自動 merge されるが意味的に衝突する箇所（RC 追従時に必ず扱う）**

| # | 箇所 | 内容 | 対処（AI 案） |
|---|---|---|---|
| 1 | `EnemyPanel.tsx` | 忠次版は `resolveEnemyTactic(nextScript, enemy.hp, enemy.maxHp)`（3 引数）。RC の `tactic.ts` は `(script, hp, maxHp, difficulty)` の 4 引数 → **tsc エラー**。RC の `EnemyPanel` は tactic を解決しない（enemy_09 の R3 は必殺充填の強化グローが付かない＝`LANE2_ENEMY_BREAK_X_THREAT_AUDIT.md` §2-2 に記録済み） | `EnemyPanel` に `difficulty` prop を足し（`BattleScreen` が `state.difficulty` を渡す）、解決には **`hpShown`** を使う（§4-3）。enemy_09 にも同じ強化グローが付くようになる（表示のみ・Lane 1 と要共有） |
| 2 | `?pilot=` クエリ | RC `pilotFlag.ts` は値 `threat`、忠次 `shogunatePilot.ts` は値 `shogunate`。同じキーで**排他**＝1 つの URL で両 Pilot を同時に出せない | `pilotFlag.ts` に一本化し、値を集合で受ける（`threat`／`shogunate`／`all`、またはカンマ区切り）。`EnemySelectScreen` は値ごとに `PILOT_ENEMIES`／`SHOGUNATE_ENEMIES` を末尾に足す |
| 3 | `enemies.ts` | RC：`ENEMIES = [...CORE, ...PILOT]`・`isPilotEnemyId`。忠次：`[...CORE, ...SHOGUNATE]`・`isShogunateEnemyId`。RC のコメントに「enemy_08 は決定274 忠次のために予約」とあり id は衝突しない | `ENEMIES = [...CORE, ...PILOT, ...SHOGUNATE]`、記録ガードは `isPilotEnemyId ∥ isShogunateEnemyId`（または `isPilotEnemyId` が両配列を見る） |
| 4 | `rules.ts` `enemyTactic` | RC は `defaultHpRatio 0.5`＋`hpRatioByDifficulty {easy 0.5, normal 0.5, hard 0.6}`。忠次は `defaultHpRatio` のみ | RC の表をそのまま使う。忠次の `cond` に `ratioByDifficulty` を埋めるかは §4-1 の表で判断（埋めると hard で enemy_09 と同じ Known が出る） |
| 5 | `gameVersion.ts`・`useReactionLanguage.test.ts` | RC は指紋を `CORE_ENEMIES` 限定へ変更済み（`1.d794038a00b5b53c` 不変）。忠次 branch の golden 更新（`1.1e2bb49b…`）は RC 上では不要になる | 忠次側の golden 変更を**捨てる**（RC の値に戻す）。`visualType: 'heavy'` も CORE 外なので指紋に乗らない |
| 6 | `enemies.test.ts`（stage bg・art の一意性） | RC の enemy_09 は鬼将と同じ bg／art を共有しているため、一意性検査は CORE 限定か Pilot 除外になっているはず（**未確認**・RC 追従時に読む） | 忠次は専用 bg（08）・専用 art を持つのでどちらでも通る |
| 7 | `cardStyle.test.ts`・`enemyActions.test.ts`（7 敵 × 7 行動の台帳） | 両 branch とも CORE を回すよう更新しているが文面が違う | RC 版を採用 |

結論：**Production（v1.0.1）単体への merge は可能だが、v1.0.2 RC が先に master へ入る前提（`COMBAT_PILOTS_INTEG_GATE_V1.md` §5）なので、忠次は「RC の後に RC へ追従」が唯一の現実的な経路。** その追従作業そのものを次期 Pilot（v0.4）に含める（§5）。

---

## 2. iPhone 実機 QA の確認項目（CEO 5 分・YES／NO）

### 2-1. 前提（本 Lane では何も起動しない）

| 項目 | 内容 |
|---|---|
| Preview の状態 | 2026-10-21 時点で **4180／4181／4182 とも LISTEN なし**（`netstat` 読み取り）。再起動は **PM／Lane 担当**が `SevenGodsGame-shogunate-pilot` で行う：PowerShell `cd C:\Users\kimi1\SevenGodsGame-shogunate-pilot; npx vite preview --outDir dist-v03 --host 0.0.0.0 --port 4182 --strictPort`（`dist-v03` が残っていればビルド不要。無ければ Lane 1 の RAM 競合を避けて時間帯を分けて `vite build --outDir dist-v03`） |
| URL | iPhone（同じ Wi-Fi）：`http://192.168.11.6:4182/?pilot=shogunate`。**`?pilot=shogunate` が無いと忠次は出ない**。LAN の IP が変わっていれば `ipconfig` で読み替え |
| Firewall | iPhone から開けないとき、管理者 PowerShell で 1 回 `New-NetFirewallRule -DisplayName "SEVEN GODS preview 4182" -Direction Inbound -Protocol TCP -LocalPort 4182 -Profile Private -Action Allow`（QA 後に `Remove-NetFirewallRule -DisplayName "SEVEN GODS preview 4182"`） |
| 操作 | 神＝大耀（受入と同じ）→ 難易度 normal → Enemy Select の**末尾**「将軍四天王・忠次」（印「幕府 Pilot・記録に残らない」）→ おすすめデッキ → 入口 → **R1・R2 はカードを出さずに「ラウンドを終える」** → R3 の溜めを見る → 以降は普通に戦う（R3 でまとめて殴って HP を 490 以下（表示）へ追い込めれば R4 は ⚔120、追い込めなければ 🔥 軍略・総攻め 240） |
| 比較対象 | 必要なら v0.1（4180）・v0.2（4181）を同条件で。v0.3 の差は **R3 の 1 場面**にしか無い（§1-4） |
| 記録先 | `docs/evidence/shogunate-pilot-v03/comparison-sheet.md`（既存）。本書 §2-2 の 7 問の回答を PM が `docs/DECISIONS.md` 決定274 行へ転記 |

### 2-2. 設問（7 問・YES／NO・期待値つき）

| # | 設問 | 見るところ | 期待 | NO のときの読み |
|---|---|---|---|---|
| Q1 | R3 の溜め（「⚠ 傷が浅ければ次は総攻め」）で、忠次の周りの**赤い光が鎧の輪郭に沿って**見えた（角丸の「箱」に見えなかった）か | R3・立ち絵の周囲 | **YES** | v0.3 の 1 手が iPhone の 192×184 では小さすぎる → PC 比較へ切替・または 7 体展開を止める |
| Q2 | v0.1／v0.2 と比べて（または記憶と比べて）「忠次が舞台の中にいる」感じが**増した**か | R1〜R4 全体 | **YES** | 視覚的一体感 PARTIAL のまま＝v0.2 の色調層を外して v0.1＋v0.3 だけに戻す案（CSS ブロック内で閉じる） |
| Q3 | R3 の予告を読んで、「**R3 までに追い込む**」か「**R4 の総攻めに備える**」かを自分で決めたか（どちらでも YES） | R3 の手札選択 | **YES**（v0.1 で PASS 済みの再確認） | 戦略性の再評価が必要（文言・しきい値） |
| Q4 | R4 の予告（⚔120 か 🔥240）が、R3 で自分がやったことの**答え合わせ**に感じられたか | R4 開始時 | **YES** | 1 手先予告の因果が伝わっていない → 文言案を 1 つだけ提示 |
| Q5 | 入口（降臨の間）・必殺カットイン・戦闘中で、忠次の**色味や光が食い違って**見えたか | 入口／カットイン／R1 | **NO** | v0.2 の filter 値（sepia 0.16 など）の再調整 1 回 |
| Q6 | 画面の**カクつき・遅れ・崩れ**（文字のはみ出し・横スクロール・立ち絵の欠け）があったか | 全体・特に R3〜R4 | **NO** | drop-shadow ×5 連鎖の iPhone 負荷 → 輪の段数を 5→3 に減らす（CSS 1 行） |
| Q7 | **もう一度忠次と戦いたい**か | 決着後 | **YES**（v0.1 で PASS 済み） | 再戦意欲の低下要因を聞き取り（1 行） |

合否（AI 案）：**Q1・Q2・Q3・Q4・Q7 が YES、Q5・Q6 が NO** で v0.3 を Pilot 正式版とする。Q1 だけ NO なら「形の変化が SP で不足」と判定し、PC 目視で補う。Q6 が YES なら性能問題として v0.4 で輪の段数を減らす。

### 2-3. 観察ポイント（CEO が意識しなくてよい・記録者向け）

- R3 で HP が 490（表示）を割った瞬間：赤い光が**金の溜め光**へ変わる（Pilot の `EnemyPanel` が実 HP で分岐を解決するため。Enemy Break は v0.3 に**含まれない**＝崩れは出ない）
- R4 で else（🔥240）のときカットインの立ち絵に sepia が掛かる（v0.2 #9）
- 決着後の「報酬カードを選ぶ」が出ない・戦績に残らない（Pilot ガードの正常動作）

---

## 3. 新敵 9 体の導入優先順位（素材・役割・重複・必要作業）

### 3-1. 前提の確認（manifest `docs/assets-kit/shogunate-manifest.json`・v1.0.0・2026-10-08・read-only）

- 10 体／16 枚・WEBP 1600×1600・`faction.side: "enemy"`。ローカル原本は忠次 FRONT のみ（`art-source/enemies/tadatsugu/`）。**他 9 体は未取得**（本 Lane でも取得していない）
- 使うスロットは **1 体 1 枚**（既存 `EnemyDef.art` は 1 枚）。FRONT／MAIN のどちらかがあれば足りる。BACK は現状の UI に使い道が無い（忠次でも未取得）＝**BACK の有無は優先度に影響しない**
- Kit に舞台背景は無い → **1 体につき舞台 1 枚**が要る（`enemies.test.ts` の一意性・既存 7 枚は CEO 生成）。暫定は忠次と同じ「既存 STG からの非生成派生」も可だが、台帳で ✗ を引き継ぐ
- 将軍家に公式ボイス無し・口調本文は配布対象外 → 台詞 7 本はすべて非公式のファン創作（CEO 監修）。画面に「公式」「公認」を書かない（規約 §6）

### 3-2. 既存ロスターとの重複（v1.0.1 ★再付番後の実値・`1ce9876` `enemies.ts`）

| 敵 | HP | ★ | typeLabel | visualType | 舞台 | 語彙 |
|---|---|---|---|---|---|---|
| 試練の影 | 103 | 2 | 標準・入門型 | standard | 褪色の神殿 `#6b5b95` | attack |
| 業斧の鬼将 | 94 | 3 | 重撃型 | standard | 戦火の陣 `#e5484d` | attack＋charge＋special |
| 藍花の怨霊 | 95 | 4 | 遅咲き型 | standard | 藍花の廃社 `#7a4fc4` | attack＋special |
| 銀甲の機工師 | 100 | 2 | 溜め型 | standard | 機巧工房 `#9b59b6` | attack＋charge×2＋special |
| 双牙の魔獣 | 85 | 3 | 連撃型 | fast | 月牙の霊峰 `#9fb8e8` | multiAttack |
| 蒼海の龍神 | 103 | 4 | 耐久型 | heavy | 蒼海の宮 `#1a3a6b` | attack＋special |
| 乱舞の道化 | 92 | 1 | トリック型 | standard | 幻惑の舞台 `#c0122f` | attack＋charge×2＋special |
| 将軍四天王・忠次（Pilot） | 98 | 3 | 軍略型 | heavy | 軍議の本陣 `#8c6d1f` | attack＋charge＋**tactic** |
| 業斧の鬼将・軍略（RC Pilot enemy_09） | 94 | 3 | 重撃型（軍略） | standard | 戦火の陣（共有） | attack＋charge＋tactic |

- ★ は v1.0.1 で「体感難度」へ再付番された（設計 v1 §2-1 の rank 列は旧値）。**★3 が最も混んでいる**（鬼将・魔獣・忠次・enemy_09）、**★1 は道化だけ**、**★5 は空（Boss 予約）**
- 空いている archetype：条件分岐（忠次で着手済み）・資源干渉（封じ）・反撃・共鳴干渉・Boss ★5。**「同じ語彙で体だけ増やす」と決定244「敵の差が薄い」を再現**する（設計 v1 §2-3）

### 3-3. 9 体の評価表

| 優先 | 名（公式） | role（manifest） | 2D スロット | 役割から導く型（設計 v1 §1） | ★案 | 既存との重複 | 新規作業（engine／データ／素材／文言／台帳） | 根拠 |
|---|---|---|---|---|---|---|---|---|
| **1** | 直政 | 将軍四天王（最も好戦的・忠勝に対抗心） | FRONT＋BACK | 重撃／連撃。**軍略の「分岐の形」違い**：then＝連撃（multiAttack）・else＝重撃（attack 大） | ★3〜4 | 型は鬼将／魔獣と近い。分岐の then／else を「軽い手／必殺」ではなく「連撃／一撃」にすれば**問題の形**が変わる | engine **0**（tactic 既存）／データ 1 体／FRONT 1 枚＋舞台 1 枚／台詞 7／台帳 2 行／テスト：roster sha・cries・分岐 2 件 | 最小コストで「軍略が忠次固有ではなく語彙である」ことを示せる。四天王 2 体目で陣営の厚みが出る。FRONT あり |
| **2** | 康政 | 将軍四天王（文化人・随一の指揮官） | FRONT＋BACK | **軍略の条件種別 +1**（例：`cond.type: 'playerHpRatioAtMost'` や `'resonanceAtLeast'`＝プレイヤー側の状態で手を変える） | ★4 | 条件が敵 HP 以外になるので忠次と被らない。★4 は怨霊／龍神と同帯 | engine **S**（`cond` union に 1 種・`tacticBranch` に 1 分岐・test 3）／他は直政と同じ | 「指揮官＝相手を見て手を変える」が役割に正直。engine は小さいが**型の追加**なので直政の後 |
| **3** | 岡っ引き | 捕り方 | MAIN のみ | 入門 ★1（attack のみ・数値個性） | ★1 | ★1 は道化だけ＝**帯の穴を埋める**。語彙は試練の影と同じ | engine **0**／データ 1 体／MAIN 1 枚＋舞台 1 枚／台詞 7／台帳 2 行 | 最安だが新しさ 0。「将軍家の下っ端→四天王→将軍」の階段の起点として、Daily 2 週ローテ等の**ロスター拡張を決めた後**に入れる方が価値が出る |
| 4 | 忠勝 | 将軍四天王（最強の軍神・最後の盾） | FRONT＋BACK | 反撃（`counter`：与えた分を返す） | ★4 | 未カバー語彙。決定216（敵の守り NO-GO）に最も近い構造 | engine **M**（intent 1 kind 追加 → **save v10**・`runEnemyTurn` 加算・予告文言）／paired-seed sim Gate 必須 | 設計 v1 §3-3 の一択化リスク（「反撃 R は殴らない」）を Preflight sim で先に潰す必要がある |
| 5 | くノ一 | 影（忍者衆）・女忍 | MAIN のみ | 封じ（`seal`）軽量版・連撃寄り | ★2 | 未カバー語彙（資源干渉）。★2 は試練の影／機工師 | engine **M〜L**（手札の封印状態 → **save v10**・`playCard` ガード・`CardView` 表示・報酬設計） | 封じは「守る理由」だけでは判断が生まれない（決定216 教訓）→ 解除後ボーナス等の報酬設計が先 |
| 6 | 影 | 影（忍者衆）・諜報と暗殺 | MAIN のみ | 封じ（本命） | ★3 | くノ一と同語彙・★3 混雑 | くノ一と同じ基盤を共有（2 体目は engine 0） | くノ一で基盤を作った後 |
| 7 | 鬼半蔵 | 影の頭領（鬼嶽一族） | FRONT＋BACK | 封じ＋連撃の複合 | ★4 | 封じ基盤に依存 | engine 0（基盤後）／複合行動表の sim | 影 2 体の後に「頭領」として置くと陣営の階層が立つ |
| 8 | ドーマン | 科学者（元陰陽寮・逆さ五重塔） | FRONT のみ | 共鳴／託宣への干渉 | ★4（特殊） | 未定義語彙。決定217 の報酬問題（託宣の時機で勝敗が決まる）を先に解く必要 | engine **M〜L**（共鳴ゲージ／託宣への介入＝`src/core` の中心に触れる）／Preflight 必須 | 設計上最も面白いが、託宣バランスの再設計と同時でないと一択化（「託宣を先に切る」）に落ちる |
| 9 | 康虎 | 17 代将軍（独裁者・姿を見せない） | FRONT＋BACK | 最終 Boss ★5（全語彙の複合・HP 高） | **★5** | ★5 は空＝重複 0。ただし `enemies.test.ts` の「rank 1〜4」更新・Daily 除外・49 盤除外・★5 の UI 表示が先行 | engine 0〜S／test 更新／HP・行動表の sim／**専用舞台は必須**（流用不可） | 語彙が揃ってから。先に出すと「ただの HP が高い敵」になる（設計 v1 §4-1 敗因と同じ） |

### 3-4. 順序の根拠（AI 判断）

1. **engine 0 → S → M の順**（Regression Risk と save version を守る）：直政・康政・岡っ引きは save v9 のまま入る。忠勝以降は save v10 か託宣再設計が要る
2. **「軍略が語彙である」証明を先に**：忠次 1 体では「忠次のギミック」で終わる。直政で then／else の形を変え、康政で条件種別を変えれば、鬼将変種（enemy_09）と合わせて **4 体で軍略が語彙になる**（Lane 1 v1.1 §6 の「既存 7 体への展開」とも整合）
3. **★ の穴**：★1（道化のみ）→ 岡っ引き、★5（空）→ 康虎。ただし ★1 は新しさが無く、★5 は先行作業が多いので中位
4. **素材スロットは優先度に効かない**（1 体 1 枚で足りる）。効くのは **舞台 1 枚／体の CEO 生成**（§6-3 #5／#6）＝体を増やすほど CEO 判断が線形に増える → **1 体ずつ**
5. 全 9 体に共通する固定費：台詞 7 本の監修・台帳 2 行・Credits（CM-02）文言の「将軍家」追記・Daily／攻略盤／戦績への組み込み方（別 Decision）

---

## 4. Enemy Break v1 との互換性（将軍家の敵・忠次 v0.3 の R3 グロー）

### 4-1. 発火条件の一致（数値）

| 側 | 条件 | 出典 |
|---|---|---|
| Enemy Break（表示） | `hpBand(hpShown, maxHp)`：`≤ 0.5` → half、`≤ 0.25` → quarter。帯が**下がった瞬間に 1 回**（初回描画・帯上昇・撃破の一撃は再生しない） | RC `visualHp.ts:107-111`・`enemyBreak.ts` `nextEnemyBreak` |
| 軍略 then（engine） | `hp / maxHp ≤ ratio`（忠次 v0.3：`0.5` 固定。RC enemy_09：`ratioByDifficulty` easy 0.5／normal 0.5／hard 0.6） | Pilot `tactic.ts`／RC `tactic.ts` |

忠次（maxHp 98・`enemyHpMultiplier` easy 0.85／normal 1／hard 1.15 → 83／98／113）で全 HP を走査した境界：

| 難易度 | maxHp | then になる HP 上限（ratio 0.5） | half（崩れ・傷の光）HP 上限 | A「then だが崩れない」 | B「崩れたが else」 |
|---|---|---|---|---|---|
| easy | 83 | ≤41 | ≤41 | **0** | **0** |
| normal | 98 | ≤49 | ≤49 | **0** | **0** |
| hard | 113 | ≤56 | ≤56 | **0** | **0** |
| hard（RC の表を埋めた場合 ratio 0.6） | 113 | ≤67 | ≤56 | **11（HP 57〜67）** | **0** |

- v0.3 のまま（難易度別しきい値なし）なら**全難易度で一致**。RC 追従時に `ratioByDifficulty` を忠次にも埋めると、enemy_09 と同じ Known（hard のみ有利側 10〜11 HP の遅れ・`COMBAT_PILOTS_INTEG_GATE_V1.md` §4）が出る。**B（崩れたのに必殺）は両案とも 0**＝崩れは忠次でも嘘をつかない
- 敵は回復しないので、R1〜R3 で half の崩れが出た ⇔ R4 は必ず then（⚔120）。**崩れ＝「追い込めた」の合図**として軍略と同じ情報を体で示す（Lane 2 監査 §2-5 と同じ結論が忠次にも成立）
- quarter（≤24）は軍略と無関係（R4 以降に自然に出る）。必殺充填（R3）は敵ターンに HP が減らないので Enemy Break と同フレームにはならない。必殺カットイン（R4 敵ターン）も同様

### 4-2. CSS の競合（クラス・要素）

| 層 | 忠次 v0.2／v0.3 が触る要素（全て `[data-enemy='enemy_08']` 限定） | Enemy Break v1 が触る要素（全て `.enemy-panel.cf2-break*` の子孫） | 重なり |
|---|---|---|---|
| 立ち絵 | `.enemy-avatar`（filter：外光・charging-super の drop-shadow ×5）、`.enemy-avatar::before`（soft-light の光レイヤー・mask） | **触らない**（test が「`.enemy-avatar` に触れない」を固定） | **0** |
| 体の崩し | — | `.enemy-collapse:not(.enemy-defeat)`（transform＋filter brightness／saturate・420／560ms） | 0（別要素。ただし `.enemy-collapse` は `.enemy-avatar` の**祖先**＝§4-4） |
| 名札 | — | `.enemy-plate::after`（赤い閃き・opacity） | 0 |
| 傷 | — | `.enemy-wound`／`.enemy-wound-quarter`（bloom） | 0 |
| 舞台 | `.enemy-stage`／`.enemy-stage::after`（接地影）、`.battle-main`（周辺減光） | — | 0 |
| 入口・カットイン | `.boss-entrance-art`・`.enemy-cutin-image`（filter） | — | 0 |
| @media | reduce を書かない（決定232） | reduce で体・傷の animation を止め閃きだけ残す | 0（独立） |
| 詳細度 | `.enemy-panel[data-enemy] .enemy-avatar.enemy-avatar-charging.enemy-avatar-charging-super`（0,4,1 相当） | `.enemy-panel.cf2-break-half .enemy-collapse:not(.enemy-defeat)` | 別プロパティ・別要素＝上書き関係なし |

RC の merge 記録（Lane 1 × Lane 2・conflict 0・`EnemyPanel.tsx` は Lane 1 が触っていない）に対し、忠次は `EnemyPanel.tsx` を触る（§1-6 #1）が、Enemy Break の hunk（import 2 行・根の className／style）と忠次の hunk（`nextAction` の解決・`--enemy-art`）は**行が離れている**ため textual conflict は出ない（merge-tree でも `EnemyPanel.tsx` は Auto-merging）。

### 4-3. タイミング（R3 で HP 49 を割る場面・normal）

| 時刻 | 忠次 v0.3（単体） | Enemy Break 併用時に加わるもの | 備考 |
|---|---|---|---|
| t0：カードをタップ | engine が `hp ≤ 49` に更新 → 同フレームの再描画で `EnemyPanel` の `nextAction` が then（attack 12）に解決 → `charging-super` が外れ、**赤い輪（v0.3）→ 金の溜め光（既存 `.enemy-avatar-charging`＝drop-shadow）** | — | **着弾前**に予告グローが変わる（実 HP で解決しているため） |
| t0＋突進／詠唱（heavy 0.65s）＋hit stop | 着弾 FX | — | — |
| ＋`HP_LAG_MS` 90 | 表示 HP が 49 を割る | `cf2-break-half`：体が離れる方向へ −7px（SP −5px）・brightness 0.72・420ms／名札の閃き 520ms／傷の bloom 600ms | Lane 2 実測（enemy_09）と同じ順序「着弾 → HP が削れる → 崩れる」 |

- **観察される違和感の候補**：赤→金の切り替え（t0）と崩れ（t0＋数百 ms）が**別の瞬間**に出る。v0.3 単体では切り替えだけなので気付きにくいが、崩れが加わると「合図が 2 回」に見える可能性（Lane 2 監査 §3 が「同時性は設計上望ましい」と判断した根拠は、enemy_09 では予告グローが変わらないから）
- **最適解（AI 判断・表示のみ・1 行）**：`EnemyPanel` の解決を `resolveEnemyTactic(nextScript, hpShown, enemy.maxHp, difficulty)` にする。表示 HP で解決すれば、赤→金の切り替えと崩れが**同じフレーム**（帯の遷移）に揃い、「赤い輪が消えて体が崩れる＝追い込めた」が 1 つの出来事になる。engine は `startRound` で実 HP を使うので予告と実行の一致は不変（R4 開始時には `hpShown === hp`）。RC の enemy_09 にも同じ強化グローが付くようになる（Lane 1 と共有して判断）
- hard で `ratioByDifficulty 0.6` を埋めた場合：HP 57〜67 では赤→金の切り替えは出る（engine 側の then）が崩れは出ない（表示側 0.5）。`hpShown` で解決しても境界が違うので揃わない＝enemy_09 と同じ Known。忠次は **v0.4 では難易度別しきい値を埋めない**（0.5 固定）方が表示と完全一致する。hard の then 率は忠次の sim で別途確認（Lane 1 の hard 偏り 17.9% は enemy_09 の値）

### 4-4. 描画負荷（iPhone）

- 忠次 R3 の立ち絵は `filter: drop-shadow ×5`（v0.3）。Enemy Break の崩れは祖先 `.enemy-collapse` に `filter: brightness() saturate()` の animation を掛けるため、**420ms の間、子の drop-shadow 連鎖を含む部分木が毎フレーム再ラスタライズ**される可能性がある（filter の入れ子）。PC では問題にならないが iPhone は未計測 → §2-2 Q6 と v0.4 Gate の probe（`probe-threat.mjs` と同型）で rAF の間隔を測る。重ければ輪の段数 5→3（CSS 1 行）
- 崩れ中は祖先の brightness 0.72 で赤／金のグローも暗くなる＝「光が一瞬沈む」。これは Lane 2 の設計意図（崩れて暗くなる）と同方向で、競合ではない

### 4-5. 将軍家 9 体への一般化

- Enemy Break は**全敵共通**（`hpBand` は難易度・敵種を見ない）ので、将軍家を増やしても個別対応は不要。必要なのは「軍略のしきい値を 0.5 に揃える」か「ずれを Known として受け入れる」かの**データ側の判断だけ**
- 分岐条件が敵 HP 以外になる康政（§3-3 #2）では、崩れと分岐の対応が**切れる**（崩れは HP の合図のまま・分岐は別の合図が要る）→ 康政の設計時に予告文言で担保する
- 康虎（★5・HP 高）では half／quarter の到達が遅く、崩れが R5〜R6 に寄る → 7R 上限の方針と衝突しないか sim で確認

---

## 5. 最小コストの次期 Pilot（1 つ・AI 推奨）

### 5-1. 比較した案

| 案 | 内容 | コスト（ファイル／テスト／AI／CEO） | リスク | 価値 |
|---|---|---|---|---|
| A | 忠次 v0.3 の CEO 評価だけを完了（追加実装 0） | 0／0／0／**5 分** | 評価が PASS でも merge 経路（RC 追従）が未着手のまま | v0.3 の問い（箱→輪郭）に答えが出る |
| **B（採用）** | **忠次 v0.4 ＝ v1.0.2 RC へ追従 ＋ Enemy Break 併用 ＋ `EnemyPanel` の解決を `hpShown`＋`difficulty` に** | conflict 12 ファイルの解決（RC 版を正・忠次はデータと表示だけ）＋`pilotFlag` 一本化＋`ENEMIES` 3 配列＋EnemyPanel 3 行 ≈ **15 ファイル**／新規テスト **+3**（境界一致・`hpShown` 解決・`?pilot=` 集合）・既存 36 を RC 上で PASS／AI **0.5 日**／**CEO 5 分 × 1 回**（§2 の 7 問を v0.4 で一括。v0.3 の問いも含む） | RC が Lane 1 の編集で動く（追従は RC が固まってから）・hard の Known を忠次にも持ち込むか（§4-3：持ち込まない） | 忠次が **CEO QA PASS 済みの機構（enemy_09）と同じ基盤**に乗り、Enemy Break との組み合わせも 1 回で評価できる。以後の 9 体展開がすべてこの経路に乗る |
| C | 四天王 1 体追加（直政・§3-3 #1） | enemies.ts +1・FRONT 取得 1・舞台 1（CEO 生成）・台詞 7・台帳 2 行・テスト +4／AI 1 日／CEO 10 分＋舞台生成 | 忠次の RC 追従前に体を増やすと**同じ conflict hunk を 2 回解く**。舞台生成は CEO 判断（§6-3 #5／#6）が先に要る | 「軍略が語彙である」証明の第一歩 |
| D | 忠次 v0.3 を RC へ統合して Production | B＋Release Gate／CEO 判断 #8 | Production 公開は CEO 承認事項・RC 自体が未公開 | — |

### 5-2. 推奨＝B「忠次 v0.4」

| 項目 | 内容 |
|---|---|
| 前提 | v1.0.2 RC（`release/v1_0_2-rc`）の Lane 1 作業が止まり HEAD が固定されたら着手（それまでは A＝CEO が v0.3 を 4182 で評価してもよい。5 分で済み、結果は v0.4 にそのまま効く） |
| 手順（AI） | ①`feat/shogunate-pilot-v0.4` を RC HEAD から切り、`5a357f1` の差分を「RC 版 engine を正」として載せ替える（`tactic.ts`／`types`／`round.ts`／`intent.ts`／`rules.ts` は RC のまま・`enemies.ts` に `SHOGUNATE_ENEMIES` を追加し `ENEMIES = [...CORE, ...PILOT, ...SHOGUNATE]`・記録ガードは両 Pilot 共通）②`pilotFlag.ts` を集合対応（`threat`／`shogunate`／`all`）・`shogunatePilot.ts` は削除せず薄い wrapper か統合③`EnemyPanel` の解決を `hpShown`＋`difficulty`（`BattleScreen` が渡す）④忠次の `cond` は `ratio 0.5` のみ（難易度別は埋めない）⑤`gameVersion` golden は RC の値に戻す⑥`battle.css` 末尾の Pilot ブロックはそのまま（Enemy Break は `enemyBreak.css` 側＝衝突 0） |
| Gate 案（自動・PASS 条件） | G0 `git merge-tree` RC HEAD × v0.4 ＝ conflict 0／G1 tsc 0・oxlint 新規 0／G2 full vitest ＝ RC 1,485 ＋ 忠次 36 ＋ 新規 3（±golden）PASS・0 fail／G3 不変性：CORE 7 体 sha256 `b4ce1e31…9cdd4`・`gameVersion` `1.d794038a00b5b53c`・save v9・`src/core` 差分 ＝ RC ＋ `enemies.ts` の `SHOGUNATE_ENEMIES` のみ／G4 Playwright：`acceptance.mjs` 80/80（URL は `?pilot=shogunate`）＋`?pilot=threat` の既存 74/74 が不変＋`?pilot=all` で 9 体＋委ねる＝10 枚・横はみ出し 0／G5 境界一致：忠次 easy／normal／hard の全 HP 走査で A＝0・B＝0／G6 組み合わせ probe（`probe-threat.mjs` 同型・enemy_08）：R3 で帯 high→half の瞬間に `cf2-break-half` と `charging-super` 除去が**同フレーム**・崩れ中の予告文言不変・JS error 0・SP375 rAF 間隔の p95 ≤ 33ms |
| Human QA（CEO・5 分） | §2-2 の 7 問（Q1 箱→輪郭／Q2 一体感／Q3 判断／Q4 答え合わせ／Q5 色の食い違い／Q6 カクつき／Q7 再戦）＋ 1 問追加：**Q8「R3 で忠次が崩れた瞬間、『追い込めた』と分かったか」（期待 YES）** |
| CEO 判断の要否 | **不要**。理由：忠次 Pilot は CEO 実装承認済み（決定274）・RC 追従は技術実装方式（§6-2）・Enemy Break は CEO QA 6/6 PASS 済みの表示専用機能・branch 隔離で Production 0。CEO が行うのは評価の回答のみ。Production 公開（#8）と 7 体展開は従来どおり別途承認 |
| 却下理由 | A 単独：merge 経路が進まない／C：忠次の経路が固まる前に体を増やすと conflict 解決が二重になる＋舞台生成の CEO 判断が先に要る／D：Production は CEO 事項・RC 未公開 |
| v0.4 の後 | PASS → **直政（§3-3 #1）** を同じ経路で 1 体（engine 0・舞台 1 枚の生成手段を CEO に 1 問）。NG → 原因（SP の形の変化不足／カクつき／合図の二重化）ごとに CSS 1 行の修正で再評価 |

---

## 6. 残課題（本 Lane の外）

| # | 内容 | 誰が |
|---|---|---|
| 1 | v0.3 の CEO iPhone 評価（§2・4182 の再起動は PM） | CEO／PM |
| 2 | v1.0.2 RC の HEAD 固定の連絡（Lane 1）→ v0.4 着手 | PM |
| 3 | `EnemyPanel` の `hpShown` 解決を enemy_09 にも適用するか（表示が変わる＝Lane 1 の CEO QA 済み画面に影響） | Lane 1 と合議（AI 判断の範囲） |
| 4 | 台詞 7 本・二つ名の監修（v0.1 から継続）／Credits（CM-02）の「将軍家」追記／Daily・攻略盤・戦績への組み込み方（別 Decision） | CEO／AI 起票 |
| 5 | 直政以降の舞台背景の生成手段（CEO 生成・§6-3 #5／#6）。暫定は既存 STG の非生成派生（台帳 ✗ 継承） | CEO |
| 6 | 決定274 行への本書の転記（AI 判断・docs/DECISIONS.md は PM が編集） | PM |

## 7. 本書で変更していないもの

`src`／`public`／`art-source`／`docs/DECISIONS.md`：変更 0。将軍家 9 体の画像：取得 0。他 worktree：git 書き込み 0（`log`・`show`・`diff`・`merge-tree --write-tree` の読み取りのみ。merge-tree は working tree と index を変えない）。vitest／build／preview：実行 0。origin push／merge／tag／deploy：0。
