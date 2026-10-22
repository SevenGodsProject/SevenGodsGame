# 将軍家 Pilot v0.4（忠次）PM Gate — G0〜G6 ＋ 旧セーブ互換・CEO iPhone QA 8 問の準備

> **状態（2026-10-22・Lane 2・Dev＋QA・AI 判断）：branch `feat/shogunate-pilot-v0.4`（起点 `f0daa46`・v1.0.2 RC `ba0af34` 由来）に対し PM Gate **G0〜G6 ＋ 旧セーブ互換 G7 を直列で実測し、すべて PASS**（G2 は契約テスト 1 件を v0.4 の例外へ締め直して再実行＝runtime 変更 0・G7 44/44）。UNRUN は G6(e) rAF p95（headless で計測不能・CEO QA Q6 で代替）の 1 項目のみ。**READY FOR CEO iPhone QA（`docs/SHOGUNATE_PILOT_V0_4.md` §5・8 問・5 分・seed 固定 2 戦）**。push／merge／tag／deploy／`docs/DECISIONS.md` 編集／他 worktree 編集／将軍家の他 9 体：いずれも**行っていない**。

- CEO 指示：2026-10-22「Lane 2：忠次 Pilot v0.4 の PM Gate（full vitest・build・Playwright・不変性検証・iPhone QA 8 問の準備）」
- 入力：`docs/SHOGUNATE_PILOT_V0_4.md`（§4 Gate G0〜G6 の状態・§5 QA）／`docs/SHOGUNATE_NEXT_PILOT_AUDIT_V1.md` §5-2（Gate 案）／v0.3 `5a357f1` の `scripts/shogunate-pilot/{acceptance,compare,pixdiff}.mjs`（`git show` で読み、RC 向けに移植）／Lane 1 `scripts/lane1-threat-branch/acceptance.mjs`／Lane 2 `scripts/lane2-combat-feel-v2/probe-threat.mjs`／`scripts/combat-pilots-rc/{gate-preview-run.cjs,invariants.mjs,ts-loader.mjs}`／`scripts/v1_0_2-rc/two-preview-run.cjs`／`scripts/release-audit/save-migration.mjs`
- 証跡：`docs/evidence/shogunate-pilot-v04/`（§3 の表に対応・500KB 超の PNG は WebP 化済み）
- 実行環境：RAM 6GB・node は常に 1 本（vitest／build／preview／probe を同時に走らせない）・preview は `gate-preview-run.cjs`（:4183・1 本）で起動し終了時に `taskkill /T /F`（4182／4183 の LISTEN 0 を毎回確認）。PM の v1.0.3 RC preview Gate（:4197）と重ならないよう、旧セーブ互換（二重 preview）は :4197 の解放後に実行

---

## 0. 結論（先に）

| 区分 | 内容 |
|---|---|
| 対象 | `feat/shogunate-pilot-v0.4` `f0daa46`（Lane 4 の ①〜③）＋ 本 Gate の commit ④〜⑥（テスト 1 file・scripts 4 本・証跡・docs のみ） |
| 不変性（§2） | CORE 7 体 sha256 `5678e3e7…0e91` **不変**／`getGameVersion()` `1.d794038a00b5b53c` **不変**（指紋に enemy_08・忠次・tadatsugu・軍略・tactic は乗らない・id は 7 つ）／save v9 不変／`src/core/engine`・`src/core/types`・`src/hooks` 差分 **0**（RC `ba0af34`・master `0d38c05` の両方に対して）／`pickEnemyId` 500 seed ⊆ CORE 7 |
| 自動 Gate（§3） | G0 merge-tree conflict 0／G1 tsc 0・oxlint 11（RC 基準と同一・新規 0）／G2 full vitest **124 file・1,528 passed・0 fail・17 skip**／G4 build `index-c1wgu65-.js` 472.64 kB（RC 比 +1.92）・css 196.74 kB（+1.89）／G5 invariants **20/20**／G6 Lane 1 受入 **74/74 不変**・忠次受入 **138/138**（normal／shogunate／all × PC／SP375）・enemy_08 probe **8/8 run・JS error 0**・崩れと赤い輪の除去 **同一フレーム（差 0ms・PC／SP375）** |
| G2 で見つけたもの | `enemyBreak.test.ts`「engine には触れない」（Lane 2 の source-pin）が v0.4 の `EnemyPanel` → `resolveEnemyTactic` import で **1 fail**。Lane 4 の Narrow Gate（対象 6 file）には含まれていなかった。**runtime は変えず**、契約を「engine import は純関数 `resolveEnemyTactic` の 1 行だけ・reducer／round 等は不可」に**締め直した**（§4-1） |
| 旧セーブ互換（G7） | **PASS 44/44**（v1.0.2 RC build :4182 × 本 branch build :4183・`save-migration.mjs`・216s・Home version `v1.0.2 (f0daa46)` 不変・§3-1） |
| UNRUN | **G6 の「SP375 rAF 間隔 p95 ≤ 33ms」のみ**（headless shell では screenshot・evaluate の停止が rAF 間隔に混入し計測不能＝probe-threat でも未報告の指標）。実機の計測は CEO QA **Q6** が担う。他に UNRUN なし |
| Known | 新規 0。監査 §4-4 の「drop-shadow ×5 ＋ Enemy Break の filter 入れ子」は probe で横スクロール 0・予告の viewport 外 0・JS error 0 を確認（体感のカクつきは Q6） |
| CEO 判断 | **不要**（承認済み Pilot の範囲内・branch 隔離・Production 0）。CEO の作業は **iPhone QA 8 問（5 分・2 戦）** のみ |

---

## 1. G0：worktree・HEAD・merge-tree

| # | 項目 | 実測 | 証跡 |
|---|---|---|---|
| 1 | worktree | `C:\Users\kimi1\SevenGodsGame-shogunate-pilot`・branch `feat/shogunate-pilot-v0.4`・HEAD `f0daa46`（tracked 差分 **0**・untracked は本 Gate の証跡フォルダのみ） | `00-worktree.txt` |
| 2 | merge-base | `0d38c05`（master・CEO 指定）× HEAD ＝ `ba0af34`（＝RC HEAD＝本 branch の起点） | 同上 |
| 3 | `git merge-tree --write-tree 0d38c05 HEAD` | **exit 0・conflict 0**・tree `c900dbaa`（merge はしていない・読み取りのみ） | 同上 |
| 4 | 参考：local master `1ce9876`（v1.0.1・`0d38c05` の祖先）× HEAD | exit 0・conflict 0・tree `e9ee8e9d` | 同上 |
| 5 | `git diff --stat 0d38c05..HEAD` | 24 files・+1,351／−181（`src/core/engine` 0・`src/core/types` 0・`src/hooks` 0） | `00-worktree.txt`・`05-engine-diff.txt` |

---

## 2. 不変性（機械証明・G5）

`node --import ./scripts/combat-pilots-rc/ts-loader.mjs scripts/shogunate-pilot/invariants.mjs`（`combat-pilots-rc/invariants.mjs` の v0.4 版・ENEMIES 9 前提）**20/20 PASS**：

| # | 項目 | 値 |
|---|---|---|
| 1 | CORE 7 体 JSON sha256 | `5678e3e757f603ae3b2a1974c772c5480222bea9c7e3e6a78f96d1b49bd70e91`（v1.0.2 と同値） |
| 2 | `getGameVersion()` | `1.d794038a00b5b53c`（v1.0.0 以来不変） |
| 3 | `RULES.saveVersion` | 9 |
| 4 | 指紋（`rankingImpactSnapshot`） | `enemy_08`／`enemy_09`／忠次／tadatsugu／軍略／`"tactic"`／`ratioByDifficulty`／`hpRatioByDifficulty` いずれも**含まない**・`"id":"enemy_0x"` は **7** |
| 5 | roster | `ENEMIES` ＝ CORE 7 ＋ PILOT 1（enemy_09）＋ SHOGUNATE 1（enemy_08 将軍四天王・忠次 maxHp 98）＝ **9**・enemy_08 は CORE／PILOT に無い・`isPilotEnemyId` は enemy_08／09 に真・CORE に偽・`isShogunateEnemyId` は enemy_08 だけ真 |
| 6 | 忠次の軍略 | R3 charge → R4 tactic `{enemyHpRatioAtMost, ratio 0.5}`（`ratioByDifficulty` 無し＝Enemy Break half 帯と境界一致）then attack 12／else special 24「軍略・総攻め」。`RULES.enemyTactic.hpRatioByDifficulty` は RC のまま |
| 7 | `pickEnemyId` | 500 seed の結果集合 ＝ CORE 7 体ちょうど |
| 8 | engine 差分 | `git diff ba0af34..HEAD -- src/core/engine` ＝ **0**（`0d38c05` 基準でも engine／types／hooks 0。`src/core` の差分は `data/enemies.ts`＋テスト 4 file のみ） |

---

## 3. 自動 Gate G0〜G7（直列・2026-10-22 11:41〜 UTC）

| # | Gate | 結果 | 実測値 | 証跡（`docs/evidence/shogunate-pilot-v04/`） |
|---|---|---|---|---|
| G0 | clean worktree・merge-tree | **PASS** | tracked 差分 0・HEAD `f0daa46`・master `0d38c05` × HEAD conflict 0（§1） | `00-worktree.txt` |
| G1 | `npx tsc -b --noEmit` | **PASS** | error 0・exit 0 | `01-tsc.txt` |
| G1b | `npx oxlint .` | **PASS** | warning **11**／error 0・exit 0。11 件は v1.0.2 RC Gate と同一（`scripts/**` 10・`BattleScreen.tsx:275` exhaustive-deps 1）。新規 0 | `02-oxlint.txt` |
| G2 | `npx vitest run`（full） | **PASS（再実行）** | 初回：**1 fail**（`enemyBreak.test.ts` > 「engine には触れない」・1,527 passed）→ 契約テストを §4-1 のとおり更新 → 再実行 **124 files passed／8 skipped（132）・1,528 passed／0 failed／17 skipped（1,545）・49.3s・exit 0**。RC 1,504 ＋ 新規 22（shogunateRoster 11＋shogunateVisual 11）＋ pilotFlag +1 ＋ enemyBreak の it 名変更 ±0 ＝ 期待 1,527 前後と整合（+1 は既存更新分） | `03-vitest-run1-fail.txt`・`03-vitest.txt` |
| G4 | `npm run build`（通常 `dist`） | **PASS** | `index-c1wgu65-.js` **472.64 kB**（gzip 147.21）／`index-DpHcH-gE.css` **196.74 kB**（gzip 36.68）・exit 0。v1.0.2 RC（470.72／194.85）比 JS +1.92 kB（enemies.ts の忠次＋pilotFlag 集合化＋EnemyPanel 3 行）・CSS +1.89 kB（battle.css 末尾 76 行）。素材 `tadatsugu/art.webp`・`08-shogunate-camp.webp` は dist に同梱 | `04-build.txt` |
| G5 | 不変性 | **PASS** | invariants **20/20**（§2）・engine 差分 0 | `05-invariants.json`・`05-invariants.txt`・`05-engine-diff.txt` |
| G6(a) | Lane 1 受入 `scripts/lane1-threat-branch/acceptance.mjs`（preview :4183） | **PASS** | **74/74**（95s）＝v1.0.2 RC Gate G7b と同数・同内容（通常 URL 7 体／`?pilot=threat` 8 体目「業斧の鬼将・軍略」＋印 1＋案内 1／R3「⚠ 傷が浅ければ次は断岩」→ R4 断岩 260／記録 0／JS error 0）。**不変** | `07a-lane1-acceptance/` |
| G6(b)(c) | 忠次受入 `scripts/shogunate-pilot/acceptance.mjs`（v0.3 を RC 向けに移植・normal／shogunate／all × PC／SP375） | **PASS** | **138/138**（128s）：通常 URL ＝ 7 体＋委ねる＝8 枚・印 0・案内 0／`?pilot=shogunate` ＝ 9 枚（8 体目「将軍四天王・忠次」）・印 `enemy-pilot-chip[data-pilot=shogunate]` 1（「幕府 Pilot・記録に残らない」）・案内 `enemy-shogunate-notice` 1・threat の印・案内 0／`?pilot=all` ＝ **10 枚（9 体＋委ねる）**・印 2・案内 2／忠次で開戦：公式画像 200・舞台 `08-shogunate-camp` 200・`.battle[data-enemy=enemy_08]`・R1 50・R2 90・R3「⚠ 傷が浅ければ次は総攻め」＋立ち絵 `charging-super`（**box-shadow none・filter に drop-shadow**）・R4 else「軍略・総攻め 240」（札 0 枚）・決着・localStorage のキー集合 不変（記録 0）・横 overflow 0・JS error 0 | `07b-acceptance/`（`result.json`・enemy-select ×6・battle-r3／r4・result） |
| G6(d) | enemy_08 probe `scripts/shogunate-pilot/probe.mjs`（`probe-threat.mjs` の複製＋v0.4 観測・`?pilot=shogunate&seed=sg-v04-01..04`・PC／SP375・damage 戦略） | **PASS** | **8/8 run 完走・JS error 0**（764s）。全 run で R3 開始時 `charging-super` ＋ `drop-shadow` ×5 ＋ `box-shadow none`（`data-enemy=enemy_08`）。**seed 01（PC／SP375）**：R3 の 2 枚目「豪快な一撃」で表示 HP 650 → 370（帯 high→half）＝ `cf2-break-half` の開始フレームと `charging-super` の除去フレームが **同一（frame 4／6・差 0ms）**・崩れ中の予告文言「⚠ 傷が浅ければ次は総攻め」不変・予告の viewport 外 0・横スクロール 0 → 即「ラウンドを終える」でも崩れ（≈1.7〜2.0s）は R4 予告切替前に終了（`breakStillRunningAtIntentChange: false`）→ **R4 then「強打 120」**。**seed 02〜04**：R3 終了時 HP 800／800／840 → **R4 else「軍略・総攻め 240」**（帯 half は R4 で遷移・必殺充填の除去は起きない＝正しい）。then 1／else 3 の両分岐を PC／SP375 で確認 | `08-probe/`（`summary.json`・`probe.json`・r3-start／r4-start／break／end ×8 run）。初回（左から出す戦略・SP375 seed 02 で click の navigation 待ち timeout → 堅牢化して再実行）は `08-probe-run1-first/`・`07-08-stdout.txt` |
| G6(e) | rAF 間隔 p95（SP375 ≤ 33ms） | **UNRUN** | headless shell では `page.screenshot`／`evaluate` の停止が rAF 間隔に混入し（計測値 p95 ≈0.2〜2.4s）指標として無効。`probe-threat.mjs`（RC Gate G8t）でも未報告の指標。**実機の計測は CEO QA Q6**（カクつき・遅れ） | `08-probe/summary.json`（`rafP95LiveMsMax`・参考値） |
| G7 | 旧セーブ互換 `scripts/release-audit/save-migration.mjs`（v1.0.2 RC build `C:\Users\kimi1\SevenGodsGame-lane2b\dist` :4182 × 本 branch `dist` :4183・`two-preview-run.cjs`） | **PASS** | **44/44**（216s・`channel:chromium`）：v1.0.2 RC Gate G11 と同数。詳細 §3-1 | `09-save-migration/`・`09-stdout.txt`・`09-gate.log` |

### 3-1. G7 旧セーブ互換（:4197 解放後に実行・2026-10-22 12:26〜12:30 UTC）

| 項目 | 実測 |
|---|---|
| 構成 | `two-preview-run.cjs --master-dir C:/Users/kimi1/SevenGodsGame-lane2b --master-port 4182 --rc-port 4183`（master 側＝v1.0.2 RC build `index-xO5hO-tv.js`＝Production v1.0.2 と同一バンドル・RC 側＝本 branch `dist`＝`f0daa46` build）・`save-migration.mjs`・`channel:chromium`（screenshot pump 無し） |
| 結果 | **44/44 PASS・exit 0（216s）**：master A（通常戦 決着→神域挑戦 決着→新規通常戦 R2 途中セーブ：`version 9・round 2・enemy_02・hand 6・deck 13`）／master B（神域挑戦 R2 途中セーブ）を本 branch build に注入し、PC／SP375 × normal／daily で **Home version `v1.0.2 (f0daa46)` 不変**・「続きから」文言・今日の試練（残り回数）・戦績画面の神カード・神域挑戦 7 日行・復元（ラウンド・HP・手札枚数・手札名・topbar・daily タグ）4 系統・復元後の battleSave state 差分 0・battleSave 以外のキー 欠損 0／改変 0・復元した対局を決着まで進められる・決着で records +1／daily 不変・daily results 1／attemptsUsed 1（二重消費なし）・JS error 0／外部通信 0／api 0 |
| 読み | save v9 のまま（§2）・`EnemyState.intent` の型不変・忠次は `?pilot=shogunate` が無ければ roster に現れないため、v1.0.2 のセーブ（CORE 7 体）は本 branch で従来どおり復元・決着できる。Pilot 対局自体は battleSave を書かない（G6(b)） |
| 終了 | preview 2 本とも `taskkill /T /F`・port 4182／4183 の LISTEN **0** を確認 |
| 証跡 | `09-save-migration/result.json`・master-*／rc-*（PC は WebP・SP375 は PNG ≤500KB）・`09-stdout.txt`・`09-gate.log`・`09-cmds.json` |

---

## 4. Gate で変えたもの（runtime 0）

### 4-1. `src/components/battle/enemyBreak.test.ts`（契約テスト 1 it）

| 項目 | 内容 |
|---|---|
| 事象 | Lane 2 Enemy Break v1 の source-pin「`EnemyPanel.tsx` は `from '../../core/engine` を含まない」が、v0.4 の `import { resolveEnemyTactic } from '../../core/engine/tactic'` で fail |
| 判断（AI・CLAUDE.md §6-2 テスト方式） | v0.4 の設計（`SHOGUNATE_PILOT_V0_4.md` §0・監査 §4-3）は「表示 HP で `resolveEnemyTactic` を解決し崩れと同フレームにする」ことが要点で、この import は意図したもの。`resolveEnemyTactic` は乱数 0・state を読まない純関数で、`pilotFlag.test.ts`・`shogunateVisual.test.ts` が「enemy_08 限定・1 か所・`hpShown`」を既に固定している。runtime を変える代替（関数を engine 外へ移す等）は Gate の禁止事項。よって**契約を緩めるのではなく締め直す**：engine import は `resolveEnemyTactic` の **1 行だけ**を許し、`reducer`／`round`／`endRound`／`playCard`／`createInitialState`／`index` の import を明示的に禁止（1 行でも増えれば fail） |
| 変更 | it 名＋本文 6 行（`split(/\r?\n/)` で CRLF 対応）。他のテスト・runtime 0 |

### 4-2. 新規 scripts（`scripts/shogunate-pilot/`・テスト／QA 用・runtime 無関係）

| ファイル | 由来 | 内容 |
|---|---|---|
| `invariants.mjs` | `combat-pilots-rc/invariants.mjs` | ENEMIES 9 前提・忠次 7 項目を追加（§2） |
| `acceptance.mjs` | v0.3 `5a357f1` の同名 | testid を RC 構造へ（`enemy-shogunate-notice`・`enemy-pilot-chip[data-pilot=shogunate]`）・`?pilot=all` の 10 枚・R3 グローの DOM 計測・WebP 化 |
| `probe.mjs` | `lane2-combat-feel-v2/probe-threat.mjs` | enemy_08・`charging-super` と `cf2-break-half` の同フレーム判定・R3 グローの計測・`SG_STRATEGY=damage`（ダメージ最大の札から出す）・run 単位 try/catch・`noWaitAfter` |
| `webp-evidence.mjs` | 新規（sharp） | 証跡ポリシーの 500KB 超 PNG → WebP q82 |

v0.3 の `compare.mjs`／`pixdiff.mjs`（v0.1〜v0.3 の撮り比べ用）は本 Gate の対象外（比較対象の v0.1／v0.2 preview を立てない）ため移植していない。

---

## 5. CEO iPhone QA の準備（`docs/SHOGUNATE_PILOT_V0_4.md` §5・確定）

| 項目 | 内容 |
|---|---|
| 前提 | 本 branch `npm run build` → `npx vite preview --host 0.0.0.0 --port 4183 --strictPort`（LAN・Firewall 4183）。4182 は v1.0.2 RC build の比較用 |
| URL | `http://192.168.11.6:4183/?pilot=shogunate&seed=sg-v04-01`（seed 固定＝probe と同じ進行） |
| 2 戦 | **A（then）**：各ラウンドでダメージ最大の札から出す（R1 一心不乱 ×2 → R2 神託 → R3 豪快な一撃 ×2・HP 980→900→650→**370**）→ R3 の 2 枚目で崩れ＋赤い輪が消える（Q8）→ R4 ⚔ 強打 120 → 決着まで（Q7）／**B（else）**：R1〜R3 札 0 枚 → R3 の赤い輪（Q1）→ R4 🔥 軍略・総攻め 240 |
| 設問 | Q1〜Q8（YES／NO・見るところ・NO のときの読み）を §5 の表に確定。期待：Q1・2・3・4・7・8 YES／Q5・6 NO |
| 当初案からの変更 | 「R1・R2 素通し → R3 だけで 490 以下」は R3 の神力 4（持ち越しなし）では届かず then を見られない（probe 4 seed すべて）ため **seed 固定 2 戦**へ |

---

## 6. 残課題・次の手順

| # | 内容 | 誰が |
|---|---|---|
| 1 | CEO iPhone QA（§5・5 分）→ 結果を `SHOGUNATE_PILOT_V0_4.md` §5 に追記（PM） | CEO／PM |
| 2 | `docs/DECISIONS.md` 決定274 行への転記（AI 判断・本 Gate の結果を含む） | PM |
| 3 | master への統合経路：merge-tree conflict 0（G0）。統合時は full vitest・build を master 上で再実行（本 Gate は branch 上の値） | PM |
| 4 | `SHOGUNATE_PILOT_V0_4.md` §6 の #3（hard の then 率 sim）・#5（台詞監修・Credits）は本 Gate の対象外 | Planner／CEO |

## 7. 本 Gate で変更していないもの

runtime（`src/**` のテスト以外）：0。`docs/DECISIONS.md`：0。他 worktree：0。将軍家の他 9 体：0。origin push／merge／tag／deploy：0。ファイル削除：0（証跡ポリシーに従い 500KB 超の PNG を同名 WebP に置換したのみ）。
