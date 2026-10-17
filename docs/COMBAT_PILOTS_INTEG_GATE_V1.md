# Combat Pilots 統合 RC Gate v1 — 軍略 Pilot v1.1（Lane 1）× Enemy Break v1（Lane 2）

> **状態（2026-10-17・Dev／Infra・AI 判断）：** branch `feat/combat-pilots-integ-rc`（worktree `SevenGodsGame-lane2b`・起点 master `7ba447f`）に Lane 1 `06e3bba` と Lane 2 `41748e9` を `--no-ff` で順に merge（**conflict 0**）し、自動 Gate G0〜G10 を heavy-run 経由で直列に実測した。**Production 公開・push・master への merge・tag・deploy はいずれも未実施**（CEO の別途承認まで禁止）。本 RC は **v1.0.1（rc101・★再付番 Fast Gate）とは別 Release** で、v1.0.1 の後に master を merge で追従する前提（§5）。CEO 判断は §0 と §7 に明示した箇所だけ、それ以外は AI 判断（CLAUDE.md §6-2・§6-6）。`docs/DECISIONS.md` 本体は未編集（行ドラフトは §7）。

- 入力：`docs/LANE1_THREAT_BRANCH_PILOT_V1.md`（§7 Gate・§8 QA・§8-1 CEO 結果）／`docs/LANE1_THREAT_BRANCH_PILOT_V1_1.md`（§4 Known・§5 実装・§6 7 体展開設計）／`docs/COMBAT_FEEL_PREMIUM_V2_PILOT.md`／`docs/LANE2_ENEMY_BREAK_X_THREAT_AUDIT.md`（§2-6 headless・§4-4 CEO QA 6/6・§5 Gate・§7 行ドラフト）／rc101 `docs/V1_0_1_RELEASE_READINESS.md` §2（統合順序・`gameVersion.ts` 最終形）／`docs/V1_0_1_RC_GATE_CHECKLIST.md`（G0〜G15 形式）
- 証跡：`docs/evidence/combat-pilots-rc/`（§3 の表に対応）。スクリプト：`scripts/combat-pilots-rc/`（`ts-loader.mjs`・`invariants.mjs`・`hard-boundary.mjs`・`gate-preview-run.cjs`）。Lane 1 `scripts/lane1-threat-branch/acceptance.mjs`・Lane 2 `scripts/lane2-combat-feel-v2/probe.mjs`（敵 slug の env 上書きを追加・既定値は不変）／`probe-threat.mjs` をそのまま使った
- 守った禁止事項：push／master への merge／tag／rebase／reset --hard／stash／branch 削除／ファイル削除／deploy／本番設定変更／画像生成／課金 API：いずれも**行っていない**。`battle.css`・`BattleScreen.tsx`・`CardView.tsx`・`combatTimeline.ts` は merge で入る差分以外に編集 0。hard のずれは「確認と記録」まで（表示コード変更 0）。Bash 文字列にバッククォート 0。lane2b の未追跡 PNG 22 枚（`docs/evidence/combat-feel-v2/threat-combo/`）は削除も commit もしていない

---

## 0. 結論（先に）

| 区分 | 内容 |
|---|---|
| merge | `7ba447f` → **`26adc19`**（Lane 1 `06e3bba`・`--no-ff`）→ **`25aead4`**（Lane 2 `41748e9`・`--no-ff`）。conflict **0**（過去の merge-tree どおり。手動解決 0） |
| 不変性（§2） | 4 点すべて PASS：CORE 7 体 sha256 `b4ce1e31…9cdd4` 不変／`getGameVersion()` `1.d794038a00b5b53c` 不変／save v9 不変／`src/core` 差分 sha256 ＝ Lane 1 v1.1 単独と**一致**（Lane 2 は `src/core` 0 行）。加えて指紋に `enemy_09`／`tactic`／`ratioByDifficulty` が入らないことを機械確認（13/13） |
| 自動 Gate（§3） | **G0〜G10 の 11 項目すべて PASS・FAIL 0・UNRUN 0**（heavy-run の exit 97＝0 回）。tsc 0／oxlint 11（master 基準・新規 0）／vitest **1,485 PASS**（期待と一致）／build OK／Ranking Absence 18/18（rc101 修正版。master 版は既知の証跡フォルダ自己一致で 17/18）／Secret 0／Lane 1 受入 **74/74**／Lane 2 probe **通常 7 体すべて** Enemy Break 再生・JS error 0 ＋ probe-threat **6/6**（Lane 2 §2-6 と同じ分岐・崩れ残り 0）／同 seed 一致／reduced-motion 既存テスト PASS。CEO 待ち＝**Production 公開の承認（既存の保留）のみ** |
| hard 演出ずれ（§4） | **Known として確定**：hard のみ HP **55〜64**（10 段・maxHp 108）で「軍略 then だが傷の光／Enemy Break half が出ない」（A）。「光るが else」（B）は easy／normal／hard すべて **0**＝プレイヤー有利側のみ。easy（≤40）／normal（≤47）は完全一致。3 案比較の AI 推奨＝**現状維持（案 C）**。実装は CEO 指示（追加の演出改修は不要）により行わない |
| v1.0.1 との関係（§5） | 本 RC は v1.0.1 の**後**。v1.0.1 が master に入った後に本 branch で `git merge master` → `gameVersion.ts` の 2 hunk conflict を rc101 READINESS §2-3 の最終形で解決＋`enemy_09` rank 3＋`coreRoster.test.ts` golden 更新を同一 commit で |
| CEO 判断（§8） | 新規 **0**。既存の未承認 2 件（本 RC の Production 公開・既存 7 体への軍略展開 Phase A）はそのまま |
| commit（§1-3） | merge 2 件＋Gate 証跡・文書 commit（push 0） |

---

## 1. branch・merge 記録・conflict

### 1-1. 手順（実行どおり）

| 順 | コマンド（lane2b） | 結果 sha | conflict |
|---|---|---|---|
| 0 | `git checkout -b feat/combat-pilots-integ-rc 7ba447f` | `7ba447f` | — |
| 1 | `git merge --no-ff 06e3bba`（Lane 1 `feat/lane1-threat-pilot-v1-1`・8 commit：`ae5baf7`〜`06e3bba`） | **`26adc19`** | **0** |
| 2 | `git merge --no-ff 41748e9`（Lane 2 `feat/lane2-combat-feel-v2-1`・5 commit：`f972931`〜`41748e9`） | **`25aead4`** | **0** |

両 Lane とも merge-base は `7ba447f`（3-way の共通祖先＝master）。Lane 1 は `src` 22 ファイル・Lane 2 は `src` 4 ファイル（`EnemyPanel.tsx`・`enemyBreak.ts`／`.css`／`.test.ts`）で、同一ファイルの変更は **`EnemyPanel.tsx` にも無い**（Lane 1 は `EnemyPanel.tsx` を触っていない）。証跡 `00-worktree.txt`（`git status`・`git log 7ba447f..HEAD` 15 commit）。

### 1-2. 解決した箇所

**なし**（conflict 0・手動編集 0）。Lane 2 の監査 §2-1（tmp branch `60234a7` での Lane 1 v1 × Lane 2 merge・conflict 0）が v1.1（`916daa4`／`f5bcb4d`／`06e3bba`・`src/core` の engine／rules／types・sim テスト・docs）でも成り立つことを本 merge で確認した。

### 1-3. commit（ローカル・push 0）

| sha | 内容 | runtime 変更 |
|---|---|---|
| `26adc19` | merge Lane 1 v1.1 | あり（Lane 1 の Pilot 機構・難易度別しきい値） |
| `25aead4` | merge Lane 2 Enemy Break v1 | あり（表示専用 `enemyBreak.*`・`EnemyPanel.tsx`） |
| （本書を含む commit・`git log --oneline -1`・PM が転記） | Gate 証跡・スクリプト・本書 | **0**（`scripts/`・`docs/` のみ。`probe.mjs` の env 上書きは受入ツールで runtime 外） |

---

## 2. 不変性の機械確認（`scripts/combat-pilots-rc/invariants.mjs`・node 単体・証跡 `02-invariants.json`・`09-seed-parity.txt`）

| # | 項目 | 期待 | 実測（HEAD `25aead4`） | 判定 |
|---|---|---|---|---|
| 1 | 既存 7 体 `CORE_ENEMIES` の `JSON.stringify` sha256 | `b4ce1e3165e408d73762bc131bccab1dc0905919c3f3b18dd539f54421f9cdd4`（`coreRoster.test.ts` golden） | 同値・7 体・CORE に `tactic` 無し | **PASS** |
| 2 | `getGameVersion()` | `1.d794038a00b5b53c` | 同値。`rankingImpactSnapshot()` に `enemy_09`／`"tactic"`／`ratioByDifficulty`／`hpRatioByDifficulty` を**含まない** | **PASS** |
| 3 | save version | `RULES.saveVersion === 9` | 9（`rules.ts` の該当行は diff の文脈行＝不変。`src/core/save` 差分 0） | **PASS** |
| 4 | `src/core` 差分 ＝ Lane 1 v1.1 単独 | `git diff 7ba447f HEAD -- src/core` の sha256 ＝ `git diff 7ba447f 06e3bba -- src/core` | 両方 `a8dca7c4ba94abe154dc6faa1b8b6cf15d40c1b2833ea8702d21b815a52e9952`。`git diff 06e3bba HEAD -- src/core` ＝ 0 行・`git diff 7ba447f 41748e9 -- src/core` ＝ 0 行（Lane 2 は engine に触れていない） | **PASS** |
| 5 | しきい値の実体 | `RULES.enemyTactic.hpRatioByDifficulty = {easy 0.5, normal 0.5, hard 0.6}`・`enemy_09` の `cond.ratioByDifficulty` に埋め込み | 同値（13/13 PASS の一部） | **PASS** |

`src` 全体：26 files・+2,752／−31（Lane 1 22＋Lane 2 4）。Production `d2135d2` → master `7ba447f` の `src` 差分は空（docs-only 5 commit）。

---

## 3. 自動 Gate G0〜G10（heavy-run `--min-mb 900` 経由・1 本ずつ直列・2026-10-17）

| # | Gate | 結果 | 数値 | 証跡（`docs/evidence/combat-pilots-rc/`） |
|---|---|---|---|---|
| G0 | clean worktree | **PASS** | tracked 差分 0（未追跡＝Lane 2 が意図して残した PNG 22 枚＋本 Gate の生成物のみ） | `00-worktree.txt` |
| G1 | `npx tsc -b --noEmit` | **PASS** | エラー 0・exit 0 | `01-tsc.txt` |
| G2 | `npx oxlint .` | **PASS** | 警告 **11**／エラー 0・exit 0。11 件は master 基準と同一（`scripts/**` 10・`BattleScreen.tsx:275` exhaustive-deps 1）。新規 **0**（`enemyBreak.*`・`tactic.ts`・`scripts/combat-pilots-rc/*` に指摘 0） | `02-oxlint.txt` |
| G3 | `npx vitest run`（full） | **PASS** | **120 files passed／8 skipped（128）・1,485 tests passed／17 skipped（1,502）**・32.1s・exit 0。期待（Lane 1 v1.1 の 1,468 ＋ Lane 2 `enemyBreak.test.ts` 17）＝ **1,485 と一致**。skip 17 ＝ Lane 1 と同じ（sim 既定 skip） | `03-vitest.txt` |
| G4 | `npm run build` | **PASS** | `index-Co3vECHT.js` **470.39 kB**（gzip 146.40）／`index-o-E1J9Xm.css` **194.85 kB**（gzip 36.28）・1.20s。CSS は Lane 2 単独 After と**同一ハッシュ**（Lane 1 は CSS 0）。JS は Lane 2 × Lane 1 v1（470.21）＋ v1.1 分 0.18 kB | `04-build.txt` |
| G5 | Ranking Absence | **PASS** | (a) 本 branch の `scripts/release-audit/ranking-absence.mjs`（master `7ba447f` 版）：**17/18**。不合格 1 件「DB schema / migration files: 2」＝ `docs/evidence/v1-rc-gate/migration/{migration-reward.png,summary.json}`（v1.0.0 Gate の証跡フォルダ名が `migrations?/` に自己一致・rc101 G6 初回と**同一**・コードではない）。(b) rc101 `f0c5001` 版（`docs/evidence/` を走査対象から除外・`git show` で scratchpad に取り出し cwd 本 worktree で実行）：**18/18 PASS**。dist `index-Co3vECHT.js`：`/api/` 0・neon 0・env 0・fetch は Vite polyfill／SE／voice の 3 件のみ・`submissionEnabled:!1`。本 branch の `ranking-absence.mjs` は v1.0.1 merge で f0c5001 版に揃うため**編集しない** | `05-ranking-absence.txt` |
| G6 | Secret Audit | **PASS** | tracked `.env` 0・credential 形式の値 0。命中の内訳 {build 1（dist の `PASSWORD` 識別子・rc101 と同一）, source 4（`rules.ts` の `NEON` 識別子 ×2 ＋ history）, 残りは docs 散文／script／test}＝ rc101 `06-secret-audit.txt` と同種 | `06-secret-audit.txt` |
| G7 | Lane 1 受入 `acceptance.mjs`（`vite preview` :4199・PC 1508×660／SP 375×667 × 通常 URL／`?pilot=threat`） | **PASS** | **74/74**（Lane 1 PM 検証 §7-2 と同数・81s）。通常 URL：敵カード 8・Pilot 敵／印／案内が出ない。Pilot URL：9 枚目「業斧の鬼将・軍略」＋印＋案内・横スクロール 0・鬼将の画像再利用（200）・対局中 `battleSave` 無し・R1 ⚔50・R2 ⚔90・**R3「⚠ 傷が浅ければ次は断岩」・R4「業斧・断岩 260」（else）**・決着後の localStorage キー集合が開戦直後と同一・JS error 0（PC／SP375 とも） | `07-acceptance/acceptance.json`・PNG 6 枚（1MB 超の PC 4 枚は scratchpad 保管・結果は JSON に全件） |
| G8 | Lane 2 probe（通常 7 体の Enemy Break・`?enemy=<slug>`・大耀・seed `cf2-pilot-01`・bot＝使える札を左から）＋ probe-threat（組み合わせ・seed 3 本 × PC／SP375） | **PASS** | **probe 7 体（龍神は PC＋SP375・他 6 体は PC）**：全 8 run で決着まで到達・JS error 0・着弾 FX の viewport 外 0（SP375 龍神の 2 件は Lane 2 After と同数＝既知の L4 斬撃箱）・名札／吹き出し／手札との重なり 0・FX 中心が絵の中 100%。**Enemy Break**：half の崩れ（`cf2-break-half`）は **7/7 体**で再生（龍神・試練の影・鬼将・怨霊・機工師 T17／魔獣・道化 T16）。quarter の崩れは龍神・試練の影・鬼将・魔獣で再生（T19〜21）。怨霊・機工師・道化は quarter 帯を**撃破の一撃**でまたいだ（道化 T21 の神託＝勝利画面 HP 0/920 を撮影で確認）ため設計どおり**再生なし**（`enemyBreak.test.ts` の suppress 契約）。龍神は Lane 2 After と**同一**（帯遷移 T17 half／T21 quarter・22 手・16 札・heavy 4）。**probe-threat 6/6**：seed 01＝R4 else「業斧・断岩 260」（R4 の神託で half・崩れ 1 回・charge グロー同時 0）／seed 02・03＝R3 で half→R4 then「強打 130」・崩れ開始 571〜980ms・ロック解除 137〜389ms（崩れより先に操作可）・予告文言は崩れ中も不変・名札 ::after peak 0.55・**即ラウンド終了でも予告切替（2,209〜2,811ms）は崩れ終了（1,788〜2,406ms）の後＝崩れ残り 0**（4/4）・JS error 0。Lane 2 §2-6 と同じ分岐・同じ水準（同時フレーム PC 9／SP 22） | `08-probe/<slug>/summary.json`・`probe.json`（7 体）・`08-probe/oni/*.png`（代表 2 枚）・`08-probe-threat/summary-threat.json`・`probe-threat.json`・WebP 4 枚 |
| G9 | 同 seed 一致（決定論） | **PASS** | engine 差分の機械証明（§2 #4）＋ G3 に含む決定論テスト（`determinism.test.ts`・`replay.test.ts`・`gameVersion.test.ts`・`coreRoster.test.ts`・`enemyTactic.test.ts`）PASS。G8 の probe は同 seed で Lane 2 の証跡と同じ進行（龍神：帯遷移 T17 half／T21 quarter・22 手・16 札・決着。probe-threat：seed 01 else／02・03 then＝Lane 2 §2-6 と一致） | `09-seed-parity.txt` |
| G10 | reduced-motion | **PASS（既存テストで可）** | `enemyBreak.test.ts` の reduced-motion 契約（閃きのみ・動き 0）が G3 に含まれ PASS。Lane 2 単独の `after-reduced` 実測（`docs/evidence/combat-feel-v2/after-reduced/`）は CSS 同一ハッシュ（G4）のため本 RC でも有効。再実測は RAM 節約のため**行っていない** | `03-vitest.txt`・G4 の CSS ハッシュ |

UNRUN：**なし**。再実測を意図して省いたもの：reduced-motion のブラウザ実測（G10・CSS 同一ハッシュで Lane 2 証跡が有効）／probe の SP375 を龍神以外の 6 体（帯の判定は viewport 非依存・RAM と時間の節約）／PNG の WebP 変換（probe-threat は内蔵・probe は未変換のため 1MB 超は scratchpad 保管）。

実行時間（preview 1 本・heavy-run 1 回・00:14〜00:42）：受入 81s・probe 龍神 320s（2 viewport）・他 6 体 139〜155s・probe-threat 397s。preview はラッパーが `taskkill /T /F` で終了（port 4199 LISTEN 0・heavy.lock 解放を確認）。

heavy-run の exit 97（RAM 不足）：**0 回**（lock は他 Lane が保持しておらず、空き RAM は開始時 1,173MB）。

---

## 4. hard 演出ずれの確認（表示コード変更 0・`scripts/combat-pilots-rc/hard-boundary.mjs`・証跡 `11-hard-boundary.json`／`.txt`）

### 4-1. 突き合わせたもの

| 側 | 条件 | 出典 |
|---|---|---|
| 表示（傷の光・Enemy Break half） | `hpBand(shown, max)`：`shown/max ≤ 0.5` で `half`・`≤ 0.25` で `quarter`（全敵共通・難易度を見ない） | `src/components/battle/visualHp.ts`・`enemyBreak.ts`（帯の遷移で 1 回） |
| engine（軍略 then） | `tacticBranch`：`hp/maxHp ≤ ratioByDifficulty[difficulty]`（easy 0.5／normal 0.5／hard **0.6**） | `src/core/engine/tactic.ts`・`rules.ts` `enemyTactic.hpRatioByDifficulty` |
| maxHp | `Math.round(enemyDef.maxHp × enemyHpMultiplier × …)`＝ enemy_09 94 × {0.85, 1, 1.15} → **80／94／108** | `createInitialState.ts`（式はスクリプトがソースから読んで照合） |

方法は Lane 2 監査 §2-5 の境界一致チェック（HP 全走査・node 単体）を 3 難易度へ広げたもの。表示側の `shown` は着弾後に実 HP へ収束するので、R4 開始時（予告解決時）には `shown === hp`＝同じ値で比較してよい。

### 4-2. 結果（HP 全走査）

| 難易度 | maxHp | 軍略 ratio | then になる HP 上限 | half（光る）HP 上限 | 走査 | A「then だが光らない」 | B「光るが else」 |
|---|---|---|---|---|---|---|---|
| easy | 80 | 0.5 | ≤40 | ≤40 | 81 | **0** | **0** |
| normal | 94 | 0.5 | ≤47 | ≤47 | 95 | **0** | **0**（Lane 2 §2-5 と同値） |
| hard | 108 | **0.6** | **≤64** | **≤54** | 109 | **10（HP 55〜64）** | **0** |

- hard の HP 55〜64：R4 の予告は **then（⚔ 13×1.15）** だが、名札の傷の光も Enemy Break half の崩れも**出ない**（光るのは 54 以下）。「追い込めたのに気付かない」（有利側）はあり得るが、「光ったのに必殺を受ける」（不利側・B）は全難易度で **0**＝崩れは hard でも**嘘をつかない**（Lane 2 の「崩れ＝条件を満たした合図」は hard では十分条件のまま、必要条件ではなくなる）
- 境界の解決値：hard `resolveEnemyTactic(64)` ＝ attack 13・`(65)` ＝ special 26（`enemyTactic.test.ts` の 64／65 契約と一致）。normal 47／48・easy 40／41
- 文言「⚠ 傷が浅ければ次は断岩」は定性なので矛盾しない（Lane 1 v1.1 §4）。ずれは**表示の手がかりが hard で 10 HP 分だけ遅れる**こと

### 4-3. 対処案の比較と AI 推奨（実装はしない）

| 案 | 内容 | 利点 | 欠点・リスク | 判定 |
|---|---|---|---|---|
| A 表示を 0.6 に合わせる | hard の `hpBand` の half 境界を 0.6 にする（難易度別）か、tactic を持つ敵だけ帯の境界を `cond` から引く | 手がかりと分岐が一致 | (1) `hpBand` は**全敵共通**：hard の既存 7 体でも傷の光・Enemy Break half が 60% で出るようになり、Production の見た目が変わる（CORE に軍略は無いのに）。(2) 敵ごとに境界を変えるには `EnemyPanel` が tactic の条件を**事前に読む**必要があり、決定263 の境界と `pilotFlag.test.ts`（EnemyPanel は tactic を事前解決しない）に反する。(3) `visualHp.ts`／`enemyBreak.ts` の変更＝d224 未回収差分の近傍で回帰リスク。CEO 指示「追加の演出改修は不要」 | 却下（今は） |
| B しきい値を 0.5 に戻す | `hpRatioByDifficulty.hard` を 0.5 に | 表示と一致・変更 1 行 | hard の then 率 48.2%→**17.9%**（G1 帯 35〜65% を外れる）・到達不能 7.5→25.4%・寿楽 × hard then 2.5%（分岐が無い）＝ v1.1 §3 が実走で退けた状態に戻る。0.55 も then 32.5% で帯外 | 却下 |
| **C 現状維持（Known）** | 表示 0.5／hard しきい値 0.6 のまま。Known として記録し、再評価の引き金を決める | 変更 0・不利側のずれ 0・normal／easy は一致・hard は Pilot 敵（`?pilot=threat`）でしか起きない・hard はまだ人が遊んでいない | hard の体験で「追い込めたのに合図が無い」所感が出る可能性（10 HP 幅） | **採用（AI 推奨）** |

**推奨＝案 C（現状維持）**。理由：ずれは有利側のみ（B＝0）・影響範囲は Pilot 敵の hard のみ・案 A は CORE 7 体の見た目に波及し決定263 の境界に触れる・案 B は v1.1 の実走結果を捨てる。**再評価の引き金**：(1) CEO が hard を実プレイして Q1〜Q4 のいずれかが落ちたとき、(2) 7 体展開 Phase A（鬼将置換）で軍略が通常プレイヤーの hard に届くとき。そのときの候補は案 A の (2) 型（tactic を持つ敵だけ `cond` から帯の境界を引く＝EnemyPanel が「条件の形」ではなく「数値」を事前に知る設計になるため、決定263 との整合を別 Decision で判断）。

---

## 5. v1.0.1（rc101・`feat/v1_0_1-fast-gate-rc`）との関係

| 項目 | 内容 |
|---|---|
| Release の分離 | 本 RC は **v1.0.1 に含めない**（CEO 指示・Lane 2 §4-4 次工程 ③）。v1.0.1 ＝ ★再付番＋語彙補完＋敵選択注記（engine 0）が先に master へ |
| 統合順序（rc101 READINESS §2-2 の AI 判断を踏襲） | ① v1.0.1 RC を master へ（PR → CI → CEO merge）② 本 branch で **`git merge master`**（rebase はしない＝Lane の証跡 sha・CEO QA PASS との対応を切らない）③ 同一 commit で 3 点（下表）④ Gate 再実行（G3・G4・G7・G8 ＋ v1.0.1 の `enemySelectNote.test.ts` 等）⑤ PR |
| 予想 conflict | **`src/core/replay/gameVersion.ts` 1 ファイル・2 hunk**（import 行と `enemies:` 行。rc101 READINESS §2-1 の merge-tree 実測）。`enemies.ts`・`enemies.test.ts`・`EnemySelectScreen.tsx` は auto-merge。Lane 2 側（`EnemyPanel.tsx`・`enemyBreak.*`）は v1.0.1 と無関係＝conflict 0 |

### 5-1. v1.0.1 merge 後に同一 commit で行う 3 点（rc101 READINESS §2-3 からの引用・PM がそのまま貼る）

| # | ファイル | 変更 |
|---|---|---|
| a | `src/core/replay/gameVersion.ts` | **(1) import は両方残す**（`CORE_ENEMIES` ＋ `import type { EnemyDef }`）。**(2) `enemiesForFingerprint()`** は RC 側のブロックを採り、中身を `CORE_ENEMIES.map((enemy) => ({ ...enemy, rank: FINGERPRINT_RANK_V1_0_0[enemy.id] ?? 0 }))` に（`ENEMIES` → `CORE_ENEMIES` の 1 語）。**(3) `rankingImpactSnapshot()`** は Lane 1 の `enemyTactic` 除外（`const { ranking: _ranking, replay, enemyTactic: _enemyTactic, ...rest } = RULES`）をそのまま残し、`enemies: enemiesForFingerprint()` を採る。結果：`getGameVersion()` ＝ `1.d794038a00b5b53c` のまま（両 Lane の golden がそのまま PASS） |
| b | `src/core/data/enemies.ts` `PILOT_ENEMIES[0]`（enemy_09） | `rank: 2,` → **`rank: 3,`**（本体 enemy_02 の新★3 を継承。表示専用・指紋に乗らない） |
| c | `src/core/data/coreRoster.test.ts` `:24` | `CORE_GOLDEN_SHA256` を新 sha256 に更新（`JSON.stringify(CORE_ENEMIES)` に `rank` が含まれるため）。値は統合 worktree で `npx vitest run src/core/data/coreRoster.test.ts` を 1 回走らせ `Received` を貼る。コメントに「v1.0.1 で rank 7 値を再付番（Expected Specification Update・HP／行動表は不変）」を追記。`GAME_VERSION_GOLDEN` の行は不変 |

注意：本 Gate の §2 #1（CORE sha256 `b4ce1e31…`）は **v1.0.1 merge 後に意図して変わる**（rank 再付番）。そのとき §2 #2（gameVersion）が不変であることが真の不変条件。`scripts/combat-pilots-rc/invariants.mjs` の `CORE_GOLDEN_SHA256` も同時に更新する。

---

## 6. Production 公開までに残る項目

| # | 項目 | 担当 | 状態 |
|---|---|---|---|
| 1 | v1.0.1 の master merge・Production 公開（別 Release） | CEO（承認）・PM | 待ち |
| 2 | 本 branch で `git merge master`（§5-1 の 3 点）→ Gate 再実行（G3・G4・G7・G8・v1.0.1 テスト） | PM／Dev | 未 |
| 3 | 本 RC の **Production 公開の CEO 承認**（Lane 1 §8-1・Lane 2 §4-4 の「未承認の範囲」） | **CEO** | 未（既存の保留） |
| 4 | version の決め方（v1.0.2 か v1.1.0 か＝`package.json`・lock・`publicFace.test.ts`・Home 表示） | PM（AI 判断） | 未 |
| 5 | PR 作成（本文：Lane 1 §0・Lane 2 §7／§10・本書 §0）・必須 check（tsc／oxlint／vitest／build）CI GREEN | PM | 未 |
| 6 | Production Smoke S1〜S6（`V1_0_PRODUCTION_SMOKE.md`）＋ 本 RC 固有 2 点：通常 URL で敵 7 体・Pilot 敵が出ない／`?pilot=threat` で enemy_09・印・案内 | PM | 未 |
| 7 | Rollback 手順（Vercel Promote 1 往復）・演習の要否 | PM・CEO | 未 |
| 8 | `docs/DECISIONS.md` 行の転記（§7 の 3 行）・`docs/RELEASE_STATUS.md`・`docs/KNOWN_ISSUES` 相当に §4 Known | PM | 未 |
| 9 | JST 日付境界 deploy の要否 | — | **不要**（gameVersion 不変・Daily pool 不変＝CORE 7 体） |
| 10 | hard の CEO 実プレイ（Lane 1 v1.1 §7-3 UNKNOWN）と §4 Known の再評価 | CEO（任意） | 未 |

---

## 7. `docs/DECISIONS.md` 行ドラフト（PM が転記・本体は未編集。AI 判断と CEO 判断を区別）

```
| 2026-10-17 | 決定282 **Threat Branch Pilot v1「業斧の鬼将・軍略」→ 条件付き GO ＋ v1.1 難易度別しきい値**。**CEO 判断（2026-10-17）**：実プレイ QA Q1 攻守を自分で選んだ YES／Q2 手札の数字を数えた YES／Q3 正解を教えられている感 NO／Q4 もう一度戦いたい YES（大耀 or 寿楽・enemy_09・`?pilot=threat`・normal）＝ 4/4 PASS → **条件付き GO**（Pilot 継続採用。**Production 公開・既存 7 体への展開は未承認**）。**AI 判断（§6-2 バランス数値）**：① R3 文言「⚠ 傷が浅ければ次は断岩」は現状維持（Q2 YES・Q3 NO）。② hard の then 率偏り（17.9%）の主因＝`enemyHpMultiplier 1.15`（寄与 76%・2 法一致）→ しきい値 {0.5,0.55,0.6,0.65}×難易度の実走で **normal 0.5／hard 0.6** を採用（then 48.2%・迷う 59.6%・到達不能 7.5%・normal との距離最小）。実装＝`RULES.enemyTactic.hpRatioByDifficulty`＋`cond.ratioByDifficulty`＋`tactic.ts` が難易度で解決（ハードコード 0・normal 不変・gameVersion `1.d794038a00b5b53c` 不変・save v9 不変）。③ 7 体展開は設計のみ（鬼将置換・機工師 R5・道化 R6 が成立。怨霊／龍神／魔獣／試練の影は予兆ラウンド無し）＝実施は CEO 承認待ち（Phase A 推奨）。Known：hard の傷の光（≤0.5）としきい値 0.6 の不一致（有利側のみ・`COMBAT_PILOTS_INTEG_GATE_V1.md` §4）。詳細 `LANE1_THREAT_BRANCH_PILOT_V1.md`／`_V1_1.md`。push 0 |
| 2026-10-17 | 決定283 **Enemy Break v1「追い詰めた」× 軍略 Pilot 組み合わせ → 条件付き GO**。**AI 判断**：Combat Feel Premium v2 の 6 観点監査で「HP 50%／25% をまたいだ瞬間が無反応」を最上位に置き、A Enemy Break／B 神の一撃書体／C 攻撃札 hover を比較して A を採用。表示専用（`enemyBreak.ts` 93・`enemyBreak.css` 108・`EnemyPanel.tsx` +8/−1）・engine／時刻表 0・2 回／戦・撃破の一撃では再生しない・reduced-motion は閃きのみ。組み合わせ監査：R3 の軍略予告（金の呼吸グロー）と Enemy Break 50% の赤い閃きは同じ名札で同時に起きうるが別要素・animation 競合 0・ロック追加 0（崩れ中も操作可）・normal の境界（表示 HP ≤47 ⇔ then ≤47）が全 HP で一致＝崩れは「予告の条件を満たした合図」・改善 Pilot 不要。**CEO 判断（2026-10-17・PM 記録）**：実プレイ QA（tmp `60234a7`・5182・`?pilot=threat`）Q1 YES／Q2 YES／Q3 NO／Q4 YES／Q5 NO／Q6 NO ＝ **6/6 PASS → 条件付き GO**（Pilot 継続採用。Production 公開・7 体展開は未承認。追加の演出改修は不要）。最初の回答は設問の誤解として CEO が無効化し「すべて OK」に訂正（訂正前の記録は存在しない）。詳細 `COMBAT_FEEL_PREMIUM_V2_PILOT.md`・`LANE2_ENEMY_BREAK_X_THREAT_AUDIT.md`。push 0 |
| 2026-10-17 | 決定284 **Combat Pilots 統合 RC Gate v1（軍略 v1.1 × Enemy Break v1）— Gate 11/11 PASS・PENDING CEO（Production 公開）**（AI 判断・runtime 変更は merge で入る両 Lane 分のみ）。`feat/combat-pilots-integ-rc`（lane2b・起点 master `7ba447f`）に Lane 1 `06e3bba` → Lane 2 `41748e9` を `--no-ff` merge（`26adc19`／`25aead4`・conflict 0）。不変性 4 点 PASS（CORE 7 体 sha256・gameVersion `1.d794038a00b5b53c`・save v9・`src/core` 差分＝Lane 1 単独と sha256 一致／Lane 2 0 行）。Gate：tsc 0／oxlint 11（master 基準・新規 0）／vitest **1,485 PASS**（120 files・期待と一致）／build js 470.39 kB・css 194.85 kB（Lane 2 と同一ハッシュ）／Ranking Absence 18/18（rc101 修正版・master 版 17/18 は既知の自己一致）／Secret 0／Lane 1 受入 74/74／Lane 2 probe 通常 7 体すべて Enemy Break half 再生・JS error 0・probe-threat 6/6（崩れ残り 0）／同 seed 一致／reduced-motion 既存テスト。UNRUN 0。hard 演出ずれ（Known）：hard のみ HP 55〜64 で「then だが傷の光／Enemy Break half が出ない」・「光るが else」は全難易度 0（有利側のみ）・easy／normal 一致。3 案（表示 0.6／しきい値 0.5／現状維持）を比較し**現状維持**を AI 推奨（CEO 指示により演出改修 0・再評価は hard 実プレイか Phase A 時）。v1.0.1 とは別 Release＝v1.0.1 後に `git merge master`（`gameVersion.ts` 2 hunk を rc101 READINESS §2-3 の最終形で解決・enemy_09 rank 3・coreRoster golden 更新）。**push 0・master merge 0・tag 0・deploy 0**。Production 公開は CEO 承認待ち。詳細 `COMBAT_PILOTS_INTEG_GATE_V1.md`・証跡 `docs/evidence/combat-pilots-rc/` |
```

---

## 8. CEO 判断が必要な点

**新規 0**。本 Gate の判断（merge 方式・Gate 構成・UNRUN の扱い・hard ずれの推奨案）はすべて CLAUDE.md §6-2 の範囲。CEO 判断として**既に保留中**のものは次の 2 件で、本書は新しい問いを足さない。

| 既存の保留 | 出典 | 本書での扱い |
|---|---|---|
| 本 RC（軍略 Pilot v1.1 × Enemy Break v1）の **Production 公開**（§6-3 #8） | Lane 1 §8-1・Lane 2 §4-4「未承認の範囲」 | §6 #3。v1.0.1 の公開後に、§5-1 の追従と Gate 再実行を終えてから PM が【CEO DECISION REQUIRED】を出す |
| 既存 7 体への軍略展開 **Phase A（鬼将置換）** | Lane 1 v1.1 §6-6 | 本書では触れない（Pilot のまま公開するかどうかとは独立） |

参考（形式のみ・今は出さない）：

```
【CEO DECISION REQUIRED】（v1.0.1 公開後・追従 Gate 再実行後に PM が提出）
Issue：統合 RC（軍略 Pilot v1.1 × Enemy Break v1）を Production へ公開するか
AI Recommendation：公開（Pilot 敵は `?pilot=threat` 限定・通常プレイヤーに見えるのは Enemy Break v1 のみ）
Reason：Gate 11/11 PASS（本書 §3）・gameVersion 不変・CEO QA 4/4＋6/6 PASS・hard ずれは有利側のみ
Alternatives：Enemy Break v1 だけ先に公開（軍略 Pilot は別 Release）／両方保留
Risk：Enemy Break の見た目が全プレイヤーに出る（reduced-motion は閃きのみ）／hard Pilot の 10 HP ずれ（Known）
Impact if delayed：Enemy Break の成果が届かない・Lane の master 追従が 2 Release 分たまる
CEO Action：承認 / 拒否
```
