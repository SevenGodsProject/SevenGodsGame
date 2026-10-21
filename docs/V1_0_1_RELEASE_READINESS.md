> **状態（2026-10-17・Infra／PM 補佐・AI 判断・docs／evidence のみ・runtime 変更 0・push 0）：v1.0.1 RC（`feat/v1_0_1-fast-gate-rc`・HEAD `f0c5001`）の公開準備を棚卸しした。①証跡突合＝**11 Gate 全て一致（不一致 0）**・文書の記述ずれ 3 件（証跡の実体とは無関係・§1-3）。②Lane 1／2 との重なり＝`git merge-tree`（メモリ内・worktree 不変）で **RC×Lane 1 conflict 1 ファイル（`gameVersion.ts`）／RC×Lane 2 conflict 0／Lane 1×Lane 2 conflict 0** を機械確認（§2）。③未完了＝CEO 6・PM／AI 12・自動 3（§3）。④準備物＝`10-version-bump.patch`（`git apply --check` OK・未適用）・`11-pr-body.md`・Smoke S1〜S6 の v1.0.1 手順（§4）。⑤origin／Ruleset／deployment を gh GET で再確認（§4-4）。CEO 判断：新規 0（設計書 §11 の Release 承認 1 件のまま）。**

# v1.0.1 Release Readiness — 証跡突合・Lane 依存・未完了一覧・準備物

- 入力：`docs/V1_0_1_RC_GATE_CHECKLIST.md`（RC Gate）／`docs/evidence/v1_0_1-rc/`／`SevenGodsGame-lane3/docs/V1_0_1_FAST_GATE_DESIGN.md`（§5 公開経路・§6 Ignored Build Step・§7 Rollback）／`RELEASE_GATE_REMAINING_2026-10-17_UPDATE.md`（残件 C-1〜C-12）／`SevenGodsGame-integ/docs/RELEASE_STATUS.md` A-0／`V1_0_PRODUCTION_SMOKE.md`
- 方法：read-only。`git diff --stat`・`git merge-tree --write-tree`・`gh api`（GET のみ）・JSON の summary 読取。vitest／build／Playwright は**実行していない**（RAM 制約・Lane 1／2 が使用中）
- 前提（本日の CEO 判定）：Lane 1 軍略 Pilot v1 ＝ 実プレイ QA 4 項目 PASS・条件付き GO（Pilot 継続採用・Production 公開・7 体展開は未承認）→ **v1.0.1 には Lane 1／Lane 2 の runtime を含めない**（別 Release）

## 0. 結論（先に）

| 項目 | 結果 |
|---|---|
| 証跡突合（§1） | **11/11 一致**（G0〜G10）。RC HEAD `f0c5001` ＝ 証跡取得 commit `9c222a0` ＋ 2 commit（`cea8c82`・`f0c5001`）で、追加分は `scripts/release-audit/` 3 ファイル＋docs／evidence のみ＝**`src/` 差分 0**（`git diff --stat 9c222a0 f0c5001 -- src` 空） |
| Lane 依存（§2） | RC×Lane 1：conflict **1**（`src/core/replay/gameVersion.ts`・import 1 箇所＋`enemies:` 1 行）、自動 merge 3（`enemies.ts`・`enemies.test.ts`・`EnemySelectScreen.tsx`）。RC×Lane 2：**0**。Lane 1×Lane 2：**0**。統合順＝**v1.0.1（RC 単独）が先** → Lane 1／2 は v1.0.1 後の master を **merge で取り込む**（rebase 不要・§2-2） |
| 未完了（§3） | **CEO 6 件（≈25 分）／PM・AI 12 件（≈1.5 h）／自動 3 件（≈10 分）**。クリティカルパス：version bump → push（CEO 指示）→ PR → CI → CEO merge → deploy → Smoke → Human QA → Rollback 演習 → docs PR |
| 準備物（§4） | `docs/evidence/v1_0_1-rc/10-version-bump.patch`（3 ファイル・4 箇所・`git apply --check` OK・**未適用**）／`11-pr-body.md`（PR 本文）／Smoke S1〜S6 の v1.0.1 手順（§4-3） |
| 外部状態（§4-4） | origin `SevenGodsProject/SevenGodsGame` master ＝ **`d2135d2`**（pushed_at 2026-10-09T23:48:11Z・以後 push 0）／Ruleset `protect-master` **active**（PR 必須・merge のみ・必須 check `tsc / oxlint / vitest / build`・non-FF 禁止）／最新 deployment **`6973326943`**（`d2135d2`・Production・state success）／open PR 0／Vercel Ignored Build Step ＝ **Automatic**（PM 実測 2026-10-17・GET 不可のため文書値） |
| CEO 判断 | 新規 **0**。設計書 §11（v1.0.1 Release 実行＝push 指示・merge・Promote）の 1 件のみ。本書の判断（統合順・conflict 解決形・patch の内容・Smoke 手順）は CLAUDE.md §6-2 の範囲 |

## 1. 証跡突合（チェックリスト §4 × `docs/evidence/v1_0_1-rc/` 実体）

### 1-1. Gate 11 項目

| Gate | チェックリスト §4 の記載 | 証跡ファイル（実体） | 突合した値 | 判定 |
|---|---|---|---|---|
| G0 | clean worktree・`7ba447f` 起点 | `git log`（RC 5 commit：`ecf29a4`→`ffea356`→`9c222a0`→`cea8c82`→`f0c5001`・parent `7ba447f`） | `git status --short` 0 行（2026-10-17 本作業時点） | 一致 |
| G1 | 案 A と 7/7 一致 | `star-reeval.json`（8,070 B・05:41） | `matchesPlanA: true`・`rankById` 01:2／02:3／03:4／04:2／05:3／06:4／07:1・`tiesInNormalIndex: []`・`rows` 7・`engineRuns` 14,112・`seeds` 16・`sourceEngine` v1.0.0 (d2135d2 runtime)・ρ normal −0.31→0.97・pair 8/18→18/18 | 一致 |
| G2 | tsc エラー 0 | `01-tsc.txt`（05:52） | `tsc exit=0` | 一致 |
| G3 | 警告 11・エラー 0 | `02-oxlint.txt`（05:52） | `warning` 11 行・`oxlint exit=0`・RC で触ったファイルの警告 0（11 件は scripts／`BattleScreen.tsx:275` 既存） | 一致 |
| G4 | 118 files PASS・6 skip／1,450 PASS・9 skip・40.7 s | `03-vitest.txt`（05:52） | `Test Files 118 passed │ 6 skipped (124)`・`Tests 1450 passed │ 9 skipped (1459)`・`Duration 40.66s`・`vitest exit=0` | 一致 |
| G5 | `index-D0ti6Z-R.js` 467.58 kB・gzip 145.48・1.30 s | `04-build.txt`（05:52） | 同値・css 191.84 kB・`build exit=0` | 一致 |
| G6 | 18/18（初回 17/18 は据え置き） | `05-ranking-absence-v2.txt`（06:32）／`05-ranking-absence.txt`（05:54） | v2：`PASS` 18 行・`RESULT: PASS`・`exit=0`・除外影響 0 の説明付き／初回：`FAIL DB schema / migration files: 2`・`RESULT: FAIL (1)` | 一致 |
| G7 | credential 形式 0 | `06-secret-audit.txt`（503,196 B・05:54） | `tracked .env files: 0`・`RESULT: PASS`・`exit=0`（hits：docs(prose) 6,424・script 75・test 37・source 2・build 1・other 5＝識別子） | 一致 |
| G8 | 44/44（master 7ba447f → RC・PC／SP375・画像 17） | `07-save-migration/save-migration.json`（42,756 B・06:47）・`run-stdout.txt`・`run1-stdout-hung-at-close.txt`・画像 17（master 5 webp・RC 7 webp＋5 png） | `summary {checks:44, pass:44, fail:0}`・`result: PASS`・`headless: channel:chromium`・`rcVersion 1.0.0`・`ok:false` 0 件・RC Home `v1.0.0 (9c222a0)` | 一致 |
| G9 | 44/44（PC 22／SP375 22）・JS error 0・外部通信 0 | `08-acceptance/acceptance.json`（13,904 B・05:53） | `pass 44 / total 44`・pc 22/22・sp375 22/22・`errors []`・`expectVersion 1.0.0`・`expectSha 7ba447f` | 一致 |
| G10 | engine 差分 0・決定論テスト PASS | `09-seed-parity.txt`（05:55） | `git diff --stat d2135d2 7ba447f -- src` 空・RC の `src/core` 差分＝`enemies.ts`／`enemies.test.ts`／`gameVersion.ts`／`gameVersion.test.ts` の 4 ファイルのみ・`enemies.ts` の差分＝rank 7 行＋コメント | 一致 |

- 証跡 tracked 数：**42 ファイル**（`git ls-files docs/evidence/v1_0_1-rc`）＝`git diff --stat 7ba447f f0c5001 -- docs/evidence` の 42 と一致。本書で追加するのは `10-version-bump.patch`・`11-pr-body.md` の 2 件
- 時刻の整合：証跡 05:41〜06:48（JST）→ commit `9c222a0` 06:07:55・`cea8c82` 06:50:28・`f0c5001` 06:50:30。G6 v2（06:32）と G8（06:47）は `9c222a0` **後**に取得し `cea8c82`／`f0c5001` で commit（`05-ranking-absence-v2.txt` 冒頭「HEAD: 9c222a0 + 未commit の scripts/release-audit 変更」と一致）

### 1-2. RC HEAD `f0c5001` と証跡 sha の対応（機械確認）

| 範囲 | `git diff --stat` | runtime（`src/`・`public/`・`package*.json`・`.github/`） |
|---|---|---|
| `9c222a0..f0c5001`（証跡取得後の 2 commit） | 25 files：`docs/V1_0_1_RC_GATE_CHECKLIST.md`・`docs/evidence/v1_0_1-rc/`（22）・`scripts/release-audit/_lib.mjs`（4 行）・`ranking-absence.mjs`（3 行）・`save-migration.mjs`（353 行） | **0**（`-- src` 空） |
| `7ba447f..f0c5001`（RC 全体） | 59 files：`src/` 11（runtime 6＝`enemies.ts`・`gameVersion.ts`・`firstBattle.ts`・`EnemySelectScreen.tsx`・`TutorialOverlay.tsx`・`tutorialContent.ts`／テスト 5）・`scripts/` 5・docs 1・evidence 42 | `src/` 11 のみ。`package.json`・`package-lock.json`・`.github/` 差分 **0**（G11 未実施＝設計どおり） |
| `d2135d2..7ba447f`（origin/master → RC 起点・docs 5 commit） | `scripts/release-audit/home-version-smoke.mjs`（+56）・`qa-flow.mjs`（+8）以外は docs／md のみ | **0**（`src` 空＝`09-seed-parity.txt` と同じ） |

→ 証跡（`9c222a0` build・G8 の Home ラベル `v1.0.0 (9c222a0)`）は **HEAD `f0c5001` の runtime と byte 同一**。Gate の再取得は不要（version bump 後の G4／G5 再実行は別・§3）。

### 1-3. 文書の記述ずれ（証跡の実体には影響しない・修正はしない）

| # | 箇所 | 記載 | 実体 | 扱い |
|---|---|---|---|---|
| 1 | チェックリスト §4 G9・冒頭・§9 | 「スクリーンショット 12 枚（500KB 超 5 枚は WebP）」 | `08-acceptance/` の画像は **10 枚**（PC 5＋SP 5・`acceptance.json` の `shots` も 5＋5）、WebP は **4**（`home-pc`・`brief-pc`・`enemy-select-pc`・`enemy-select-sp375`） | 枚数の誤記。統合時の DECISIONS 行には「acceptance 44/44・画像 10」と書く |
| 2 | チェックリスト §9 | 「runtime（4）」 | 列挙は **6 ファイル**（`TutorialOverlay.tsx`・`tutorialContent.ts` を含む） | 件数の誤記 |
| 3 | チェックリスト §5 | Lane 1 ＝ `2c7d6b5`・36 files | Lane 1 の最新は **`699c59c`**（39 files・`feat/lane1-combat-read-pilot-v1` と `feat/lane1-threat-pilot-v1-1` は同一 sha）。追加 3 件は docs §10・`threatBranchDecision.sim.test.ts`・`enemyTactic.test.ts` 等で RC と重ならない。§5 の結論（conflict 1・`gameVersion.ts`）は §2-1 の `merge-tree` で**再確認済み** | 現状値を本書 §2 で更新 |

## 2. Lane 1・Lane 2 との依存関係

### 2-1. 触ったファイルの重なり（`git diff --stat 7ba447f..<branch>` × `git merge-tree`）

対象：RC `feat/v1_0_1-fast-gate-rc`（`f0c5001`・src 11）／Lane 1 `feat/lane1-threat-pilot-v1-1`（`699c59c`・src 22・worktree clean）／Lane 2 `feat/lane2-combat-feel-v2-1`（`f21d77e`・src 4・worktree clean）。いずれも `7ba447f` 起点。

| ファイル | RC | Lane 1 | Lane 2 | `merge-tree` RC×Lane 1 | 解消 |
|---|---|---|---|---|---|
| `src/core/replay/gameVersion.ts` | +30（`FINGERPRINT_RANK_V1_0_0`・`enemiesForFingerprint()`・`enemies:` 行） | +14（`CORE_ENEMIES` import・`enemyTactic` 除外・`enemies: CORE_ENEMIES`） | — | **CONFLICT（content）**：import 行（`:3-8`）と `enemies:` 行（`:108-117`）の 2 hunk | §2-3 の最終形 |
| `src/core/data/enemies.ts` | 20（rank 7 行＋コメント 5 行） | 74（`CORE_ENEMIES`／`PILOT_ENEMIES`／`enemy_09`／`pickEnemyId`） | — | Auto-merging | 統合後 `enemy_09` の `rank: 2` → **3** を 1 行追加（§2-3） |
| `src/core/data/enemies.test.ts` | 39（rank golden） | 5（CORE 限定） | — | Auto-merging | なし |
| `src/components/setup/EnemySelectScreen.tsx` | 4（注記 1 文目） | 21（Pilot 分岐・注記 `<p>`・chip） | — | Auto-merging | なし |
| `src/core/data/coreRoster.test.ts` | — | 新規 155（`CORE_GOLDEN_SHA256`＝`JSON.stringify(CORE_ENEMIES)` の sha256） | — | （衝突なし・**golden が落ちる**） | 統合後に新 sha256 へ更新（§2-3） |
| `src/components/TutorialOverlay.tsx`・`tutorialContent.ts`・`firstBattle.ts`・`tutorialWording.test.ts`・`enemySelectNote.test.ts`・`firstBattle.test.ts`・`gameVersion.test.ts` | RC のみ | — | — | — | — |
| `src/core/engine/{tactic,round,intent}.ts`・`enemyTactic.test.ts`・`threatBranch.sim.test.ts`・`src/core/sim/threatBranchDecision.sim.test.ts`・`src/core/types/enemy.ts`・`index.ts`・`rules.ts`・`balanceSim.test.ts`・`enemyActions.test.ts`・`src/hooks/useGameEngine.ts`・`src/components/pilot/pilotFlag*.ts`・`MatchupBoard.tsx`・`BattleScreen.tsx`・`cardStyle.test.ts` | — | Lane 1 のみ | — | — | — |
| `src/components/battle/EnemyPanel.tsx`・`enemyBreak.{ts,css,test.ts}` | — | — | Lane 2 のみ | — | — |

`git merge-tree --write-tree`（メモリ内・worktree 不変）の結果：**RC×Lane 1 ＝ conflict 1 ファイル（`gameVersion.ts`）**／**RC×Lane 2 ＝ conflict 0（clean tree `4934361`）**／**Lane 1×Lane 2 ＝ conflict 0（clean tree `b58580e`）**。docs／evidence／scripts はディレクトリが分かれており重なり 0。

### 2-2. 統合順序（AI 判断）

| 順 | 内容 | 根拠 |
|---|---|---|
| 1 | **v1.0.1 ＝ RC 単独**を先に master へ（PR → CI → CEO merge） | CEO 判定（Lane 1 は Production 未承認）・設計書 §1 #5「別 Release」・engine 0 の束だけで Gate と Rollback の切り分けが明快。RC は `7ba447f` 起点＝origin/master `d2135d2` との差は docs 5 commit（runtime 0）だけなので conflict 0 |
| 2 | Lane 1／Lane 2 は v1.0.1 後の master を **`git merge master`** で取り込む（rebase はしない） | rebase は commit sha を書き換え、Lane 1 の証跡（`acceptance.json`・docs §7-2 の sha 参照）と CEO QA PASS の対応が切れる。merge なら Lane 側の履歴・証跡 sha は不変で、conflict 解決は `gameVersion.ts` の 1 箇所（§2-3）を 1 回だけ |
| 3 | Lane 1 の取り込み時に 3 点を同じ commit で：`gameVersion.ts` 最終形／`enemy_09` rank 3／`coreRoster.test.ts` golden 更新 | いずれも「版 `1.d794038a00b5b53c` 不変」を両 Lane が共有しているため機械的 |
| 4 | Lane 2 は merge のみ（conflict 0・golden 影響 0） | `EnemyPanel.tsx`・`enemyBreak.*` は RC／Lane 1 と無関係 |

却下：(a) Lane 1 を先に master へ → v1.0.1 に Pilot runtime（`round.ts`・`intent.ts`・`tactic.ts`）が混ざり CEO 判定に反する／(b) Lane 側を rebase → 証跡 sha が切れる・Lane 1 は別エージェント作業中で履歴書換えは禁止事項に近い／(c) RC を Lane 1 の上に rebase → RC 証跡（`9c222a0` build）が無効になり Gate 再取得が必要。

### 2-3. `gameVersion.ts` の conflict 解決・最終形（統合時に PM がそのまま貼る）

`git merge master`（v1.0.1 後）を Lane 1 側で実行すると `gameVersion.ts` に 2 hunk の conflict が出る（§2-1）。解決後の該当部分は次のとおり（本文の他の行は両 Lane とも不変）。

**(1) import（`:1-8`）：両方残す**

```ts
import { RULES } from '../data/rules.js'
import { ALL_CARDS } from '../data/cards/index.js'
import { CORE_ENEMIES } from '../data/enemies.js'
import type { EnemyDef } from '../types/index.js'
import { GODS } from '../data/gods.js'
import { OTOMOS } from '../data/otomo.js'
import { DIVINATION_CHOICES } from '../data/divination.js'
```

**(2) `enemiesForFingerprint()`（RC 側のブロック・`ENEMIES` → `CORE_ENEMIES` の 1 語だけ変更）**

```ts
/**
 * 指紋に乗せる敵データ：**CORE 7 体（`CORE_ENEMIES`）**の `rank` だけを v1.0.0 時点の定数へ置き換えたもの。
 * Threat Branch Pilot v1（Lane 1）の Pilot 敵（`PILOT_ENEMIES`）は Daily の pool に入らず `?pilot=threat` でしか
 * 選べないため指紋に入れない（1 体足すだけで版が動くのを防ぐ）。v1.0.1 の ★再付番は `rank` を v1.0.0 の値に固定して
 * 吸収する。両方の意図は同じ「版 `1.d794038a00b5b53c` を据え置く」で、golden（`gameVersion.test.ts`・
 * `useReactionLanguage.test.ts`・`coreRoster.test.ts`）が不変を確認する。
 */
function enemiesForFingerprint(): EnemyDef[] {
  return CORE_ENEMIES.map((enemy) => ({ ...enemy, rank: FINGERPRINT_RANK_V1_0_0[enemy.id] ?? 0 }))
}
```

**(3) `rankingImpactSnapshot()`：Lane 1 の `enemyTactic` 除外はそのまま・`enemies:` は RC 側を採る**

```ts
export function rankingImpactSnapshot(): string {
  // Threat Branch Pilot v1（`docs/LANE1_THREAT_BRANCH_PILOT_V1.md`）：`RULES.enemyTactic` も除く。
  // この値は Pilot 敵（`PILOT_ENEMIES`）の行動表にだけ埋め込まれ、ランキング対象（Daily＝CORE 7 体）の対局には
  // 一切現れない。CORE 敵が将来 tactic を使えば `cond.ratio` として CORE_ENEMIES の指紋に自動で入るので、取りこぼしは無い
  const { ranking: _ranking, replay, enemyTactic: _enemyTactic, ...rest } = RULES
  const { pendingRuns: _pendingRuns, ...replayRest } = replay
  return stableStringify({
    rules: { ...rest, replay: replayRest },
    cards: ALL_CARDS,
    // v1.0.1 ★再付番（rank を v1.0.0 値に固定）＋ Threat Branch Pilot v1（CORE 7 体のみ）。上の enemiesForFingerprint() を参照
    enemies: enemiesForFingerprint(),
    gods: GODS,
    otomos: OTOMOS,
    // Phase 5-E（決定158）：神託の3択も対局結果を直接変える。Phase 4.6 の列挙から漏れていたため追加
    // （導き・天啓の数値や効果の種類は `RULES` に無く、ここに入れないと変更しても版が変わらなかった）
    divination: DIVINATION_CHOICES,
  })
}
```

版が不変である理由（機械的）：`CORE_ENEMIES` ＝ v1.0.0 の `ENEMIES` 7 体（Lane 1 の `coreRoster.test.ts` が sha256 で固定）に `rank` だけ v1.0.0 の値を戻すので、正規化文字列は v1.0.0 と byte 一致。`RULES.enemyTactic` は Lane 1 が除外済み。→ `getGameVersion()` ＝ `1.d794038a00b5b53c`（両 Lane の golden がそのまま PASS）。

**同じ統合 commit で行う 2 点**

| # | ファイル | 変更 | 理由 |
|---|---|---|---|
| a | `src/core/data/enemies.ts` `PILOT_ENEMIES[0]`（`enemy_09` 業斧の鬼将・軍略） | `rank: 2,` → `rank: 3,` | 本体 `enemy_02` の新★3 を継承（`ENEMY_STAR_REEVAL_PREP_V1.md` §5）。表示専用・指紋に乗らない（CORE 外） |
| b | `src/core/data/coreRoster.test.ts` `:24` | `CORE_GOLDEN_SHA256 = '<新 sha256>'`（旧 `b4ce1e3165e408d73762bc131bccab1dc0905919c3f3b18dd539f54421f9cdd4`）。コメントに「v1.0.1 で rank 7 値を再付番（Expected Specification Update・HP／行動表は不変＝`enemies.ts` の差分は rank 行のみ）」を追記 | `JSON.stringify(CORE_ENEMIES)` に `rank` が含まれる。新値は統合 worktree で `npx vitest run src/core/data/coreRoster.test.ts` を 1 回走らせ、失敗出力の `Received` をそのまま貼る（`GAME_VERSION_GOLDEN` `1.d794038a00b5b53c` の行は落ちない） |

統合後の確認（Lane 1 側）：`npx vitest run src/core/replay src/core/data src/components/setup` → `gameVersion.test.ts`（版不変・rank 無関係・maxHp 対照）・`coreRoster.test.ts`・`enemies.test.ts`（rank golden 4/4/3/3/2/2/1）・`enemySelectNote.test.ts`（★ aria-label 7 体）・`useReactionLanguage.test.ts` が PASS。

## 3. 公開に必要な未完了項目（CEO／PM・AI／自動）

前提：Ruleset `protect-master` 下の経路＝RC push（作業 branch のみ）→ PR → CI GREEN → CEO merge（merge commit）→ Vercel 自動 deploy → Smoke → Human QA → Rollback 演習 → docs PR。直接 push・fast-forward は Ruleset＋pre-push hook（`.git/hooks/pre-push`・全 worktree 共有）で不可。

| 順 | 項目 | 区分 | 内容 | 所要 | 依存 |
|---|---|---|---|---|---|
| 1 | G11 version bump | **PM** | RC worktree で `git apply docs/evidence/v1_0_1-rc/10-version-bump.patch` → narrow vitest `src/publicFace.test.ts`（heavy-run 経由）→ commit「chore(release): v1.0.1 version bump（package.json・lock 2 箇所・publicFace.test.ts）」 | 5 分 | — |
| 2 | G4／G5 再実行（version 変更分） | **PM** | `npx vitest run`（1,450 PASS 期待・version テスト 1 件が 1.0.1 に）・`npm run build`（bundle 名が `index-D0ti6Z-R.js` から変わる＝PR 本文 G5 に転記） | 5 分（RAM 450 MB 確保時。不可なら CI の run を G4／G5 証跡とする） | 1 |
| 3 | Ignored Build Step の確認 | **CEO** | Vercel → Settings → Build and Deployment → Ignored Build Step が **Automatic**（現状）か **Custom**（設計書 §6 推奨・`git diff --quiet "${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}" HEAD -- . ':!docs' ':!scripts' ':!*.md'`）であること。「Don't build anything」なら戻す。Custom にするなら **merge 前**（docs PR の再 deploy を抑止・順 12） | 2 分 | — |
| 4 | RC branch push の指示 | **CEO** | 「`feat/v1_0_1-fast-gate-rc` を origin へ push してよい」の 1 行（作業 branch のみ・master は hook で拒否される） | 1 分 | 1 |
| 5 | push | **PM** | `git push -u origin feat/v1_0_1-fast-gate-rc`（`--no-verify` 不使用）。出力に `refs/heads/master` が無いことを確認。同梱 docs 5 commit（`dfb8f71`〜`7ba447f`・runtime 0）も同時に公開される（C-3 の解消・§3-1） | 2 分 | 4 |
| 6 | PR 作成 | **PM** | `gh pr create --base master --head feat/v1_0_1-fast-gate-rc --title "release: v1.0.1 Fast Gate（★再付番＋語彙補完＋敵選択注記・engine 0）" --body-file docs/evidence/v1_0_1-rc/11-pr-body.md`。本文の `<>`（G11 sha・G5 bundle）を埋めてから | 3 分 | 5 |
| 7 | CI | **自動** | GitHub Actions `ci`（`.github/workflows/ci.yml`・job `gate`）＝必須 check **`tsc / oxlint / vitest / build`**（integration_id 15368・strict false）。pull_request トリガー・Node 24・ubuntu | 4〜6 分 | 6 |
| 8 | mergeability 確認 | **PM** | `gh api repos/SevenGodsProject/SevenGodsGame/pulls/<n> --jq '{mergeable,mergeable_state}'` → `clean` を確認。Ruleset の `require_extra_approval_for_unattributed_changes: true` は commit author（`zenouoria@gmail.com`）が GitHub `SevenGodsProject` に帰属済み（`d2135d2` の `author.login` で確認）のため影響なしの見込み。`blocked` なら理由を CEO に報告 | 1 分 | 7 |
| 9 | merge 承認・実行 | **CEO** | PR 画面で **Create a merge commit**（Ruleset：merge のみ）。または CEO の当該指示で PM が `gh pr merge <n> --merge` | 1 分 | 8・設計書 §11 承認 |
| 10 | Vercel deploy | **自動** | master merge → build → deployment `<id-101>`（Ready）。確認：`gh api 'repos/SevenGodsProject/SevenGodsGame/deployments?per_page=1'` の sha ＝ merge sha・statuses state success | 3 分 | 9 |
| 11 | G13 Production Smoke S1〜S6 | **PM** | §4-3 の手順（期待値 `v1.0.1 (<merge sha>)`・外部通信 0・console error 0）。証跡 `docs/evidence/v1-0-1-production-smoke/` | 15〜25 分（RAM：heavy-run 経由・viewport を絞る） | 10 |
| 12 | G14 Human QA | **CEO** | Production で 10 分：Q1 敵選択で ★ の並び（龍神・怨霊 4／道化 1）が「難しさ」として納得できる／Q2 Brief ②「余った神力と防御は…」が読める／Q3 遊び方 ② の 3 概念（溜め→必殺・連撃・防御はそのラウンドだけ）が分かる／Q4 違和感（正解を教えられている感）が**ない**。結果を 1 行で PM へ → `docs/evidence/v1-0-1-fast-gate/human-qa.md` | 10 分 | 10 |
| 13 | G15 Rollback 演習（Promote 2 回） | **CEO** | Vercel Deployments → `6973326943` → Promote to Production → （PM が S1 で `v1.0.0 (d2135d2)` 確認）→ `<id-101>` → Promote → （PM が S1 で `v1.0.1 (<merge sha>)` 確認）。深夜帯・公開 URL は ≈3 分 v1.0.0 に戻る | 5 分 | 11 |
| 14 | Rollback 演習の S1 ×2 と記録 | **PM** | `home-version-smoke.mjs` を 2 回（v1.0.0・v1.0.1）→ `docs/evidence/release-safety/rollback-drill-2026-10-xx.md`（時刻・deployment id・S1 結果・セーブ互換の記述＝saveVersion 9・gameVersion 不変）→ DoD #11 DONE | 10 分 | 13 |
| 15 | DECISIONS／RELEASE_STATUS LIVE 行 | **PM** | 決定281 行（チェックリスト §8 (a) を実測値で埋める・acceptance 画像は「10 枚」）＋ RELEASE_STATUS A-0 の更新（§8 (b)：Production HEAD `<merge sha>`・deployment `<id-101>`・Rollback 先 `6973326943`・gameVersion 不変・Release 手順行を Ruleset 下の経路へ）＋ 決定280 候補（Release Protection v1 適用記録・C-6）。docs-only branch → PR → CI → CEO merge | 20 分 | 14 |
| 16 | docs PR の merge | **CEO** | Create a merge commit。Ignored Build Step が Automatic のままなら docs-only merge でも再 build され Production deployment id が変わる（runtime 同一・Home の sha ラベルだけ変わる）＝害は無いが LIVE 行の deployment id は **最終 id** を記録する | 1 分 | 15 |
| 17 | tag `v1.0.1`（任意） | **CEO** | `v1.0.0` も未作成（C-4）。作るなら両方を同じ窓で（annotated・merge sha）。Vercel は tag push で deploy しない・CI も走らない | 3 分 | 16 |
| 18 | Lane 1／Lane 2 の追従 | **PM** | §2-2 順 2〜4（`git merge master`・conflict 1 箇所・golden 更新・`enemy_09` rank 3）。Lane のエージェントが作業中の worktree には触れず、各 Lane の区切りで実施 | 15 分 | 16 |
| 19 | 旧 branch／worktree の整理 | **CEO**（承認）／PM | `WORKTREE_CLEANUP_PLAN_2026-10-17.md` §7（C-10）。Gate と別日 | — | 16 |
| 20 | 初見プレイヤー QA（C-8）・Smoke 未実施 3 点（C-1：CEO 実機目視・神託の実使用・BGM 聴感） | **CEO** | v1.0.1 の Human QA（順 12）と同じ実機セッションで ①実機目視 を兼ねられる。②③は任意 | 15 分 | 12 |

集計：**CEO 6 件**（順 3・4・9・12・13・16。17・19・20 は任意）≈ 25 分／**PM・AI 12 件**（順 1・2・5・6・8・11・14・15・18 ＋ §4 準備済 3 件）≈ 1.5 h／**自動 3 件**（順 7・10 ＋ docs PR の CI）≈ 10 分。クリティカルパス（順 1→16）≈ 2 h（CEO の着席 3 回：push 指示＋Ignored Build Step 確認・merge、Human QA＋Rollback Promote、docs PR merge）。

### 3-1. 同梱 docs 5 commit の扱い（AI 判断）

RC は `7ba447f` 起点のため、RC branch の push で origin/master `d2135d2` → `7ba447f` の docs-only 5 commit（INCIDENT 記録・v1.0.0 Smoke 結果・決定279 候補・Release Protection v1・Gate）も公開される。選択肢：(a) **RC の PR に同梱**（1 PR・1 CI・1 deploy）／(b) 先に docs PR（`7ba447f` で branch → PR → merge）→ RC PR。採用 **(a)**：(b) は Ignored Build Step Automatic 下で docs-only merge が 1 回余分に Production を再 build し（Home の sha が `7ba447f` 系の merge sha に変わる）、その抑止には順 3 の Custom 設定（CEO）が先に要る。(a) なら runtime 差分 0 の docs が v1.0.1 と同じ 1 回の build に乗るだけで、INCIDENT 行を含む記録が v1.0.1 と同時に公開される。PR 本文（`11-pr-body.md`）に同梱 5 commit と runtime 差分 0 を明記済み。

### 3-2. リスク（公開作業）

| # | リスク | 緩和 |
|---|---|---|
| 1 | Ignored Build Step が「Don't build anything」のままで merge → deploy されない | 順 3 で CEO が確認。merge 後 5 分で deployment が無ければ Dashboard で Redeploy（CEO・設計書 §6） |
| 2 | Ruleset `require_extra_approval_for_unattributed_changes: true` で PR が `blocked` | 順 8 で GET 確認。既存 commit の author は帰属済み（`d2135d2` → `author.login: SevenGodsProject`）。blocked なら Ruleset の当該項目を CEO が一時 off（GitHub 設定変更＝#8） |
| 3 | PC の RAM 不足で順 2／11 が走らない | 順 2 は CI run で代替可（G4／G5 は CI の必須 check と同内容）。順 11 は viewport を `--only pc1508,sp844` に絞り直列・heavy-run `--min-mb 450` |
| 4 | Rollback 演習中に Daily の挑戦をしているプレイヤーがいる | gameVersion 不変のため v1.0.0 ⇄ v1.0.1 で Daily 表・託宣表・セーブは共通（★表示だけ戻る）。深夜帯実施 |
| 5 | Lane 1 取り込み時に `coreRoster.test.ts` golden を更新し忘れる | §2-3 (b)・CI で落ちる（必須 check） |

## 4. 準備物（CEO 判断不要・本 Lane で作成済み）

### 4-1. `docs/evidence/v1_0_1-rc/10-version-bump.patch`（G11・未適用）

- 内容：`package.json` `:4` `1.0.0` → `1.0.1`／`package-lock.json` `:3`（root）・`:9`（`packages[""]`）の 2 箇所／`src/publicFace.test.ts` `:57-58`（it 名と `expect(APP_VERSION).toBe('1.0.1')`）。依存パッケージ側の `"version": "1.0.0"` は触らない（lock `:720` の `1.0.1` は別パッケージ・無関係）
- 生成：RC commit `f0c5001` の index 内容（`git show`・LF）から scratchpad で作成。検証：scratchpad の一時 repo に orig をコピーして `git apply --check` → OK・適用後 `grep` で 4 箇所が `1.0.1`。RC worktree では **`git apply --check` のみ**（適用なし・`git status` 0 行のまま）
- 適用後に PASS すべきテスト：`src/publicFace.test.ts`（`APP_VERSION` ＝ `1.0.1`・`buildLabel()` ＝ `v1.0.1 (<sha>)`）。`buildInfo.ts` は `package.json` を読むため他の変更は不要

### 4-2. `docs/evidence/v1_0_1-rc/11-pr-body.md`（PR 本文ドラフト）

変更点 5 行（束 3 件＋gameVersion 不変＋version）・不変の証明・同梱 docs 5 commit・Gate 結果表 G0〜G12・Known・Rollback 手順・CEO チェック欄 5 項目。`<>` は G11 sha・G5 bundle・CI run URL の 3 箇所。

### 4-3. Production Smoke S1〜S6（v1.0.1 用・G13）

共通：`PLAYWRIGHT_MODULE=<playwright/index.mjs のパス>`・base `https://seven-gods-game.vercel.app`・出力 `docs/evidence/v1-0-1-production-smoke/`・各コマンドは heavy-run（`--min-mb 450`）経由で直列・dev／preview サーバーは不要（Production を直接読む）。期待値の `<sha>` ＝ master の merge commit 7 桁（`gh api repos/SevenGodsProject/SevenGodsGame/branches/master --jq '.commit.sha[0:7]'`）。

| S | コマンド（rc101 で実行） | 期待値（v1.0.1） | 証跡 |
|---|---|---|---|
| S1 | `node scripts/release-audit/home-version-smoke.mjs docs/evidence/v1-0-1-production-smoke/s1-home.json https://seven-gods-game.vercel.app 1.0.1 <sha>` | 22/22：HTTP 200・title「SEVEN GODS：共鳴カードバトル」・右下 **`v1.0.1 (<sha>)`**・favicon／og:title／description・開始ボタン・横はみ出し 0・console error 0・失敗リクエスト 0・外部オリジン 0。配信 JS は `index-Da5QBYVM.js` **以外**（新 bundle 名を記録） | `s1-home.json`・`s1-home-pc1508.png`・`s1-home-sp390.png` |
| S1' | `node scripts/v1_0_1-rc/acceptance.mjs docs/evidence/v1-0-1-production-smoke/s1b-v101-acceptance.json https://seven-gods-game.vercel.app --sha <sha> --version 1.0.1` | **44/44**（RC Gate G9 と同じ検査を Production に対して）：Home ラベル／Brief ②／遊び方 ②・コツ 6 本／敵選択 注記 1 文目・★ 7 体＝新 rank・aria-label／overflow 0／JS error 0／外部通信 0 | `s1b-v101-acceptance.json`＋画像 10 |
| S2〜S4 | `node scripts/release-audit/qa-flow.mjs docs/evidence/v1-0-1-production-smoke/s2-s4-qa-flow.json https://seven-gods-game.vercel.app --shots docs/evidence/v1-0-1-production-smoke/qa-flow-shots --only pc1508,sp844 --play-timeout 420000` | S2：Home → 大耀 → 難易度 → 業斧の鬼将（chip ★**3**・旧 2）→ デッキ → 戦闘（敵立ち絵 inView・予告「50」・手札 5/5・scroll 0）／S3：カード使用・神の一撃カットイン・Enemy Intent・勝利（報酬 3 択）または敗北（敗因 1 行）／S4：リロード → 「続きから大耀 vs 業斧の鬼将・ラウンド2」→ round 2・手札 6・神域挑戦「残り2回」保持。外部通信 0・`/api/` 0・console error 0。RAM 余裕があれば `--only` を外し 4 viewport（v1.0.0 と同条件） | `s2-s4-qa-flow.json`・`qa-flow-shots/*` |
| S5 | `node scripts/official-voice-pilot/acceptance.mjs docs/evidence/v1-0-1-production-smoke/s5-official-voice.json https://seven-gods-game.vercel.app` | 4/4：大耀で開戦 → 5 秒超 buffer の start 1 回・BGM duck（ramp ＜1 → 1）・ミュート時 0・`/assets/voice/taiyo/greeting.mp3` 200 | `s5-official-voice.json` |
| S6 | `node scripts/legal-credits/acceptance.mjs docs/evidence/v1-0-1-production-smoke/s6-legal-credits.json https://seven-gods-game.vercel.app` | 40/40：Legal／Credits 画面・確定文言・禁止語 0・横はみ出し 0・「戻る」で Home・localStorage 不変・JS error 0 | `s6-legal-credits.json` |

判定：S1・S1'・S2〜S4・S5・S6 全 PASS かつ外部通信 0・console error 0 で G13 PASS。v1.0.0 と同じく「CEO 実機目視・神託の実使用・BGM 聴感」は PASS 扱いにしない（順 20）。結果は `docs/V1_0_1_PRODUCTION_SMOKE.md`（新規・v1.0.0 の書式）に表で記録。

### 4-4. origin／Ruleset／Vercel の現状（gh GET のみ・2026-10-17）

| 項目 | 値 | 取得 |
|---|---|---|
| repo | `SevenGodsProject/SevenGodsGame`・public・default `master`・**pushed_at 2026-10-09T23:48:11Z**（INCIDENT push 以後 push 0） | `gh api repos/...` |
| origin/master | **`d2135d2`**（protected: true）＝ローカル tracking と一致。`d2135d2..7ba447f` ＝ 未 push docs 5 commit | `gh api .../branches/master`・`git rev-parse origin/master` |
| Ruleset | `protect-master`（id 24855598）**active**・対象 `~DEFAULT_BRANCH`・rules：deletion 禁止／non_fast_forward 禁止／pull_request（allowed_merge_methods **merge のみ**・approving_review 0・`require_extra_approval_for_unattributed_changes: true`）／required_status_checks **`tsc / oxlint / vitest / build`**（strict false） | `gh api .../rulesets/24855598` |
| CI | 最新 master run `38006192084`（`ci`・`d2135d2`・success）。workflow `ci.yml`：pull_request／push（master）／dispatch・job `gate` | `gh api .../actions/runs?branch=master` |
| deployment | 最新 **`6973326943`**（sha `d2135d2`・environment Production・state **success**・2026-10-09T23:48:46Z）。次点 `6894630098`（`641ea5c`）・`6894408979`（`12e1ad5`）。GitHub Deployments API 上は `6973326943` が最新＝現 Production（Vercel API は token なし・CLI 未導入のため GET 不可。Promote 等の Vercel 側状態は Dashboard で CEO 確認） | `gh api .../deployments`・`.../statuses` |
| open PR | 0 | `gh api .../pulls?state=open` |
| pre-push hook | `C:\Users\kimi1\SevenGodsGame\.git\hooks\pre-push` 存在（origin の `refs/heads/master` のみ拒否・作業 branch は通す） | `ls` |
| Ignored Build Step | **Automatic**（`RELEASE_GATE_REMAINING_2026-10-17_UPDATE.md` C-2・PM 実測 2026-10-17・設定更新 2026-10-09T23:48:45Z）。GET 不可のため文書値 | 文書 |
| 決定番号 | 決定279 まで integ DECISIONS に記載。**決定280**＝Release Protection v1 適用記録（lane3 監査で予約）・**決定281**＝v1.0.1（チェックリスト §8）。重複なし | `grep` |

## 5. CEO 判断

新規 **0**。残るのは設計書 §11 の 1 件（v1.0.1 Release 実行：push 指示 → merge → Rollback Promote）で、提出条件「G0〜G12 PASS」のうち G11・G12 は順 1〜7 の後に揃う。本書の判断（統合順＝RC 単独先行・Lane は merge 追従／docs 5 commit 同梱／conflict 最終形／Smoke 手順）はすべて CLAUDE.md §6-2（技術実装方式・実装順序・テスト方式）の範囲。

## 6. 本書で変更したもの

| 種別 | ファイル |
|---|---|
| docs（新規） | `docs/V1_0_1_RELEASE_READINESS.md`（本書） |
| evidence（新規） | `docs/evidence/v1_0_1-rc/10-version-bump.patch`・`docs/evidence/v1_0_1-rc/11-pr-body.md` |
| runtime・テスト・scripts・`package*.json`・`.github/`・Lane 1／2 の worktree・integ | **変更 0**（patch は未適用） |
| git 操作 | ローカル commit 1 件（rc101・docs／evidence のみ）。push／PR／merge／tag／deploy／rebase／stash／削除：**0** |
