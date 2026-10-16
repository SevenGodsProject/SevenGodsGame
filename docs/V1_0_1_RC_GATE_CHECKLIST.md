> **状態（2026-10-17・Lane 3・Dev／PM・AI 判断・RC 実装＋Gate 実測）：v1.0.1 Fast Gate 束 3 件（★再付番・語彙補完 案 B・敵選択注記）を worktree `SevenGodsGame-rc101`（branch `feat/v1_0_1-fast-gate-rc`・master `7ba447f` 起点）に実装し、G0〜G15 を「本 RC で PASS／CEO 作業／統合後」に分けて実測値を記入した。設計書 `V1_0_1_FAST_GATE_DESIGN.md` からの変更点は 1 つ：**`gameVersion` を変えない**（`rank` を指紋から除外し `1.d794038a00b5b53c` を据え置く＝Daily 不変。§2）。push／PR／merge／tag／deploy・`package.json` version・DECISIONS／RELEASE_STATUS 本体：いずれも未実施・未編集（PM が統合時に行う）。**

# v1.0.1 RC Gate Checklist — ★再付番＋語彙補完＋敵選択注記

- 入力：`docs/V1_0_1_FAST_GATE_DESIGN.md`（束・G0〜G15）／`docs/ENEMY_STAR_REEVAL_PREP_V1.md`（案 A）／`docs/FIRST_PLAYER_UX_IMPROVEMENT_PROPOSAL_V1.md` §4（確定文言）／enemy-audit `matrix.json`（14,112 局・v1.0.0 engine）
- 証跡：`docs/evidence/v1_0_1-rc/`（本書 §4 の表に対応）。スクリプト：`scripts/v1_0_1-rc/star-reeval.mjs`（★再集計）・`scripts/v1_0_1-rc/acceptance.mjs`（headless 受入）
- 不変（実測）：engine・rules・cards・gods・otomo・divination・replay 再開・storage・saveVersion 9（`09-seed-parity.txt`／`07-save-migration-deferred.txt` の `git diff --stat` 空）。Known 変更なし（K01 据え置き）。Lane 1 Pilot ファイル（`tactic.ts`・`PILOT_ENEMIES`・`pilotFlag.ts`）には触れていない

## 0. 結論（先に）

| 区分 | Gate | 結果 |
|---|---|---|
| **本 RC で PASS** | G0 clean worktree／G1 ★再集計（案 A と完全一致）／G2 tsc 0／G3 oxlint 新規 0（計 11＝master 基準）／G4 vitest **1,450 PASS・9 skip・124 files**／G5 build OK（`index-D0ti6Z-R.js` 467.58 kB・gzip 145.48 kB）／G6 Ranking Absence 17/18（**不合格 1 件は master 既存の自己一致**・RC 由来 0・§4 注）／G7 Secret 0／G9 acceptance **44/44**（PC 1508×660・SP 375×667）／G10 同 seed 一致（engine 差分 0 の機械証明＋決定論テスト） | 10 項目 PASS |
| **統合後（PM・Gate 実行時）** | G8 Save Migration（master 側 fixture 作成で script が TypeError・RC 由来ではない・§4 注）／G11 version `1.0.1`（本 RC は **1.0.0 のまま**＝PM 指示「Home の version 表示が不変」。統合 commit で `package.json`・lock 2 箇所・`publicFace.test.ts`）／G12 CI（PR 作成後）／G13 Production Smoke | 4 項目 |
| **CEO 作業** | G14 Human QA 10 分／G15 Rollback 演習（Promote 1 往復）／Release 実行の承認（設計書 §11・§6-3 #8） | 3 項目 |
| 設計書からの変更 | `gameVersion`：設計書「#1 で変わる（Expected Spec Update）」→ **変えない**。`rank` は表示専用で対局結果に影響しないため指紋から除外し、v1.0.0 の版 `1.d794038a00b5b53c` を据え置く（§2）。これにより R1（Daily day-lock の日中切替・K26）は**消滅**＝deploy 時刻の制約（JST 早朝）は不要になる | AI 判断（CLAUDE.md §6-2） |
| Lane 1 との衝突 | `enemies.ts`：行の重なり **0**。`gameVersion.ts`：`enemies: ENEMIES,` の 1 行が**両 Lane で変更**＝merge conflict 1 箇所（解消方針 §5）。`coreRoster.test.ts`（Lane 1）の sha256 golden は rank 変更で**更新が必要**（Lane 1 統合済みなら） | §5 |
| CEO 判断 | 新規 **0**（Release 実行の 1 件は設計書 §11 のまま。本 RC の判断はすべて §6-2 の範囲） | — |

## 1. ★ 再付番（G1）— 新旧対応と matrix 再集計

再集計：`node scripts/v1_0_1-rc/star-reeval.mjs`（入力 `C:\Users\kimi1\SevenGodsGame-enemy-audit\docs\evidence\enemy-star-audit\matrix.json`・engine `v1.0.0 (d2135d2 runtime)`・14,112 局・16 seed・6 打ち筋）→ `docs/evidence/v1_0_1-rc/star-reeval.json`。規則＝案 A（normal 全体指数 降順・同点は hard 指数・4/4/3/3/2/2/1・★5 は Boss 予約）。**normal 指数に同点なし**。

| 順 | 敵 | id | 旧★ | **新★** | 案 A | normal 指数 | hard 指数 | 初級 h-balanced 敗北% n／h | 初級 平均残 HP n／h |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 蒼海の龍神 | enemy_06 | 3 | **4** | 4 ○ | 37.7 | 56.7 | 3.6／43.8 | 18.5／8.7 |
| 2 | 藍花の怨霊 | enemy_03 | 3 | **4** | 4 ○ | 36.5 | 57.3 | 6.3／52.7 | 16.8／7.1 |
| 3 | 双牙の魔獣 | enemy_05 | 2 | **3** | 3 ○ | 34.0 | 50.8 | 0／30.4 | 18.2／11.2 |
| 4 | 業斧の鬼将 | enemy_02 | 2 | **3** | 3 ○ | 33.9 | 53.5 | 2.7／34.8 | 18.2／9.9 |
| 5 | 試練の影 | enemy_01 | 1 | **2** | 2 ○ | 33.8 | 48.5 | 1.8／14.3 | 20.7／14.9 |
| 6 | 銀甲の機工師 | enemy_04 | 4 | **2** | 2 ○ | 31.4 | 48.5 | 0.9／16.1 | 20.5／15.5 |
| 7 | 乱舞の道化 | enemy_07 | 4 | **1** | 1 ○ | 28.6 | 40.6 | 0／0.9 | 20.6／19.4 |

| 評価（再集計） | 旧★ | **新★** |
|---|---|---|
| Spearman ρ（★ vs 指数）easy／normal／hard | −0.48／−0.31／−0.21 | **0.53／0.97／0.98** |
| ρ（★ vs 初級 h-balanced 敗北率）normal／hard | −0.15／−0.11 | **0.77／0.97** |
| ペア順序一致（★が異なる組）normal／hard | 8/18・8/18 | **18/18・18/18** |
| ★ 分布 1〜5 | 1・2・2・2・0 | 1・2・2・2・0（★5 なし） |

- 案 A（`ENEMY_STAR_REEVAL_PREP_V1.md` §0）と**7 体すべて一致**（`matchesPlanA: true`）。不一致は無いので実測に従った修正は無い
- 再 sim（設計書 G1「112 秒」）は**実行していない**：RC の engine・rules・敵の行動表は matrix を作った v1.0.0 engine と byte 一致（`09-seed-parity.txt`：`git diff --stat d2135d2 7ba447f -- src` 空・RC の `src/core/engine` 等 差分 0）。同じ入力に同じ engine なので再 sim の結果は同一＝再集計で代替（Lane 1 が CORE 7 体を変えないことも `ENEMY_STAR_REEVAL_PREP_V1.md` §5 で確認済み）
- 実装：`src/core/data/enemies.ts` の `rank` 7 行＋コメント 5 行（規則・evidence パス・旧値）。HP・actions・battleCries・stage・art：**不変**（`09-seed-parity.txt` の行差分で確認）
- テスト：`enemies.test.ts` golden「龍神4/怨霊4/魔獣3/鬼将3/影2/機工師2/道化1」＋「normal 指数（7 値を埋め込み）の降順に並べると rank が 4/4/3/3/2/2/1・単調・分布 [1,2,2,2,0]」。「1〜4（★5 は Boss 予約）」の既存テストは据え置き

## 2. `gameVersion` を変えない判断（AI 判断・設計書からの変更）

| 項目 | 内容 |
|---|---|
| 事実 | `rankingImpactSnapshot()` は `enemies: ENEMIES` を丸ごと指紋に入れていた＝`rank` を変えると版が `1.d794038a00b5b53c` から動く（設計書・PREP §7 はこれを Expected Spec Update として受け入れていた） |
| `rank` の性質 | 読み手は `EnemySelectScreen`（★）・`DeckBuilderScreen`（対戦相手チップ）・`BossEntrance`（降臨の間）の **3 箇所の表示だけ**。`src/core/engine` に `rank` の参照は無い（grep 実測。`masteryDisplay.ts` 等の `.rank` は神技評価の別物）。対局結果・スコア・Daily の敵選出（`pickEnemyId`・`DAILY_BOSS_POOL`）に一切影響しない |
| PM 要件 | 「rank は表示専用で対局結果に影響しない」根拠で指紋から除外し、版 `1.d794038a00b5b53c` を**不変**にする（Daily の day-lock・リプレイ互換＝CEO の「Daily 不変」） |
| 制約 | `rank` を単に落とすと正規化文字列が変わり**版は 1 回動く**（除外と不変は素直には両立しない）。両立する唯一の方法は、指紋入力の `rank` を v1.0.0 時点の値に**固定**すること |
| **採用** | `gameVersion.ts` に `FINGERPRINT_RANK_V1_0_0`（enemy_01〜07 の旧値 1/2/3/4/2/3/4）を置き、`enemies: enemiesForFingerprint()`（`rank` だけをこの定数へ置換）を指紋に入れる。実データの `rank` を何に変えても指紋は変わらない＝除外と等価。表に無い id は 0（敵の追加は行動表の追加で版が変わるので取りこぼし無し）。この表は指紋互換のためだけに存在し、ゲームのどこからも読まれない |
| 却下 | (a) 単純除外＝版が 1 回動く（R1 復活・deploy 時刻制約）／(b) 据え置き（版が動く）＝設計書案・PM 要件に反する／(c) `engineVersion` 操作＝意味が違う |
| 検証 | `gameVersion.test.ts` 新 describe 4 件：版＝`1.d794038a00b5b53c`／`ENEMIES[5].rank` を 1・5・99 に変えても fingerprint 不変／対照：同じ敵の `maxHp` を変えると fingerprint は変わる／指紋入力の 7 体は id・maxHp を保持。既存 golden `useReactionLanguage.test.ts:86`（同値）も PASS |
| 効果 | 設計書 R1（Daily 表の日中切替・K26 の託宣表切替）は**起きない**。deploy 時刻の制約（JST 早朝）は不要。RELEASE_STATUS 行の「gameVersion <old> → <new>」は「**不変**」に置き換える（§8） |
| Lane 1 との関係 | Lane 1 は同じ目的（Pilot 敵で版を動かさない）で `enemies: CORE_ENEMIES` に変更。統合時は `enemies: enemiesForFingerprint()` の中身を `CORE_ENEMIES.map(...)` にする（§5）。Lane 1 の `coreRoster.test.ts` の sha256 golden は rank 変更で更新が要る（PREP §5 の既定どおり・Expected Spec Update。版 golden `1.d794038a00b5b53c` はそのまま PASS） |

## 3. 語彙補完 案 B・敵選択注記（G9 で実測）

| 箇所 | 確定文言 | 字数（コードポイント） | 実測行数 PC／SP375 | overflow |
|---|---|---|---|---|
| Brief ②（`setup/firstBattle.ts`） | カード左上の数字が必要な神力です。余った神力**と防御は、**次のラウンドへ持ち越せません。 | 42（3 行合計 **112／120**） | 2／3（設計見積 2／2。カード内 overflow 0） | 0 |
| 遊び方 ②（`tutorialContent.ts`） | 毎ラウンド、敵は次の行動を事前に見せます。⚡「溜め」は次のラウンドに大技（必殺）が来る合図、⚔ 連撃は複数回当たります。防御はそのラウンドだけ有効です。 | 76（③ 83 が最長のまま） | 3／**6**（設計見積 7） | 0 |
| 攻略のコツ ③（新規・6 本に） | 防御は次のラウンドに残りません。大技が予告されたラウンドに合わせて出しましょう。 | 40 | — | 0 |
| 敵選択注記 1 文目（`EnemySelectScreen.tsx`） | ★は**脅威度**（実測の手強さ：負けやすさ・受けるダメージ・倒すまでの長さ。最大5）。難易度の★とは別物です。 | 52（★込み。設計書の 51 は ★ 除き） | 2／3（設計見積 —／3） | 0 |

- 決定262／263 との整合：いずれも対局非依存のルール文・起動前または任意表示。戦闘画面への追加 0・「どの札を出すか」0・事後説明 0。断定語（絶対・必ず）0・「ブロック」0（テストで固定）
- 実装上の構造変更 1 件：`TutorialOverlay.tsx` の文言データ（`Visual`／`Section` 型・`SECTIONS`・`TIPS`）を `src/components/tutorialContent.ts` へ分離（component ファイルから定数を export すると oxlint `react(only-export-components)` が 2 件出るため）。文言・描画・A11y（Esc／focus trap）は不変（`a11yMinimum.test.ts`・`entranceWiring.test.ts` PASS）
- テスト：`firstBattle.test.ts`（+2：防御を含む・確定文言 42 字・合計 112 字・ブロック不使用）／`tutorialWording.test.ts`（新規 9 件：② 確定文言 76 字・4 概念の語・③ が最長・TIPS 6 本と ③ 40 字・断定語 0・描画で ② とコツ 6 本・dialog）／`enemySelectNote.test.ts`（新規 5 件：注記 1 文目・2 文目不変・旧文言消滅・★ aria-label が 7 体の rank と一致・HP／ダメージ数値 0・ThreatStars 1〜4）

## 4. Gate G0〜G15 実測

| # | 項目 | 区分 | 結果 | 証跡 |
|---|---|---|---|---|
| G0 | clean RC worktree | RC | `SevenGodsGame-rc101`・`feat/v1_0_1-fast-gate-rc`・master `7ba447f` 起点・開始時 tracked 差分 0 | `git log`（本書 §9） |
| G1 | ★ 再 sim（確認） | RC | 再集計で案 A と 7/7 一致（再 sim は engine byte 一致のため不要・§1） | `star-reeval.json`・`scripts/v1_0_1-rc/star-reeval.mjs` |
| G2 | tsc | RC | `npx tsc -b --noEmit` エラー 0 | `01-tsc.txt` |
| G3 | oxlint | RC | 警告 11・エラー 0。RC で触ったファイルの警告 0（master 既存 11＝設計書 G3 の基準と同数） | `02-oxlint.txt` |
| G4 | vitest full | RC | **118 files PASS・6 skipped（124）／1,450 tests PASS・9 skipped**・40.7 秒（heavy.lock 取得→実行→解放） | `03-vitest.txt` |
| G5 | build | RC | `npm run build` 成功・`index-D0ti6Z-R.js` 467.58 kB（gzip 145.48）・css 191.84 kB・1.30 秒 | `04-build.txt` |
| G6 | Ranking Absence | RC | **17/18**。不合格 1 件「DB schema / migration files: 2」＝`docs/evidence/v1-rc-gate/migration/{migration-reward.png,summary.json}`（master `7ba447f` に既存・v1.0.0 Gate の証跡フォルダ名が正規表現 `migrations?/` に自己一致）。RC の追加ファイルによる検出 0。他 17 項目 PASS（dist の `/api/`・neon・fetch・submissionEnabled 等 0） | `05-ranking-absence.txt` |
| G7 | Secret Audit | RC | PASS（credential 形式の値 0。残りは識別子・test token・ハッシュ） | `06-secret-audit.txt` |
| G8 | Save Migration | **統合後** | master `7ba447f` を scratchpad で build（`VITE_COMMIT_SHA=7ba447f`）し 4198 で配信・RC を 4197 で配信して実行 → master 側 fixture（通常戦を決着まで自動プレイ）が完了せず script 114 行で TypeError。RC 側への注入前の失敗＝RC 由来ではない。静的根拠：`src/hooks`・`replay/resume.ts` 等 差分 0・saveVersion 9 不変。統合 Gate で再実行（必要なら `playToEnd` timeout を延長） | `07-save-migration-deferred.txt`・`07-master-build.txt` |
| G9 | acceptance（Playwright・`vite preview` 4197） | RC | **44/44 PASS**（PC 1508×660／SP 375×667 × 22）：Home version `v1.0.0 (7ba447f)`・「初陣へ」→ Brief 3 行・② 確定文言・カード overflow 0／「詳しい遊び方」→ ② 確定文言・コツ 6 本・③ 確定文言・カード overflow 0／敵選択 注記 ①②・8 カード・★ 7 体＝新 rank（filled 数・aria-label 一致）・横 overflow 0／JS error 0／外部通信 0。スクリーンショット 12 枚（500KB 超 5 枚は WebP） | `08-acceptance/acceptance.json`・`08-acceptance/*.png|webp` |
| G10 | 同 seed 一致 | RC | engine 不変の機械証明：`git diff --stat d2135d2 7ba447f -- src` 空（Production → RC 起点 runtime 差分 0）・RC の `src/core/engine`／rules／cards／gods／otomo／divination／replay 差分 0・`enemies.ts` の差分は rank 7 行＋コメントのみ。決定論：`determinism.test.ts`・`replay.test.ts`・`gameVersion.test.ts`（golden replay 再生 OK）・`useReactionLanguage.test.ts`（同 seed 同 state）PASS（G4 に含む） | `09-seed-parity.txt` |
| G11 | version `1.0.1` | **統合後** | 本 RC は `package.json` 1.0.0 のまま（PM 指示「Home の version 表示が不変」）。統合 commit で `package.json`・`package-lock.json` 2 箇所・`publicFace.test.ts` を更新 | — |
| G12 | CI | **統合後** | PR 作成後に必須 check「tsc / oxlint / vitest / build」 | — |
| G13 | Production Smoke | **統合後** | S1〜S6（`V1_0_PRODUCTION_SMOKE.md`）・S1 期待値 `v1.0.1 (<merge sha>)` | — |
| G14 | Human QA 10 分 | **CEO** | Q1 ★の並び（龍神・怨霊 4／道化 1）／Q2 Brief ②／Q3 遊び方 ② の 3 概念／Q4 違和感なし | `human-qa.md`（未） |
| G15 | Rollback 演習 | **CEO** | Promote `6973326943` ⇄ `<id-101>`・S1 往復 | `docs/evidence/release-safety/`（未） |

重い実行の直列化：`npx vitest run`・`npm run build`・master の `vite build` は heavy.lock（`lane3-rc101`）取得→実行→解放で各 1 回。narrow vitest は 4 回（ロック不要）。

## 5. Lane 1（`SevenGodsGame-lane1`・`2c7d6b5`・36 files）との干渉

`git diff 7ba447f 2c7d6b5` を読んで本 RC の変更行と比較した（read-only）。

| ファイル | Lane 1 の変更行 | 本 RC の変更行 | 衝突 | 解消方針 |
|---|---|---|---|---|
| `src/core/data/enemies.ts` | `:3` import RULES／`:43` `ENEMIES`→`CORE_ENEMIES`／`:312-` PILOT ブロック追加／`:400-` `pickEnemyId` を CORE 参照 | `:57-61` コメント・`:62,102,140,176,217,253,290` rank 7 行（旧 `:57-58,98,136,172,213,249,286`） | **なし**（行の重なり 0・`enemy_09` の `rank: 2` は Lane 1 側のみ） | 自動 merge。統合後 `enemy_09`（鬼将の変種）の `rank` を **3**（本体の新★を継承・PREP §5）に合わせる 1 行を統合 commit で追加 |
| `src/core/replay/gameVersion.ts` | `:3` import `CORE_ENEMIES`／`:68` RULES destructure に `enemyTactic` 除外／`:73` `enemies: CORE_ENEMIES` ＋コメント | `:3` の直後に `import type { EnemyDef }`／`:66-91` `FINGERPRINT_RANK_V1_0_0`・`enemiesForFingerprint()`／`:98` `enemies: enemiesForFingerprint()` | **あり（1 箇所）**：`enemies: ENEMIES,` 行を両方が変更。import 行も隣接 | 統合時：import は両方残す（`CORE_ENEMIES`＋`type EnemyDef`）。`enemiesForFingerprint()` の中身を `CORE_ENEMIES.map(...)` に変え、snapshot は `enemies: enemiesForFingerprint()` を採る（Lane 1 の `enemyTactic` 除外はそのまま）。両 Lane の意図（版 `1.d794038a00b5b53c` 不変）は一致するので、統合後も `useReactionLanguage.test.ts`・`coreRoster.test.ts` の版 golden は**そのまま PASS** |
| `src/core/data/enemies.test.ts` | `:2` import に `CORE_ENEMIES`／`:67-76` stage 一意性を CORE に限定 | `:49-83` rank golden 2 件を差し替え・追加 | **なし**（行の重なり 0） | 自動 merge |
| `src/core/data/coreRoster.test.ts`（Lane 1 新規） | `CORE_GOLDEN_SHA256`＝`JSON.stringify(CORE_ENEMIES)` の sha256 | （本 RC には無い） | 衝突ではないが**golden が落ちる**（rank 7 値が JSON に入る） | 統合 commit で新 sha256 に更新（PREP §5「Expected Specification Update・CORE 不変契約は行動表の意図」をテストコメントに明記）。`GAME_VERSION_GOLDEN` は不変 |
| `src/components/setup/EnemySelectScreen.tsx` | `:3-4` import／`:58-60` roster 分岐／`:70-74` Pilot 注記 `<p>` 追加／`:93` matchup 条件／`:126-131` Pilot chip | `:62-64` 注記 1 文目（コメント 2 行＋文言 1 行） | **なし**（Lane 1 の挿入は `</p>` の後＝`:66` 以降。間に不変行 `:63-65` あり） | 自動 merge の見込み。衝突時は両方採る |
| `TutorialOverlay.tsx`・`tutorialContent.ts`・`firstBattle.ts`・テスト 3 本・scripts／evidence | Lane 1 は触れていない | — | なし | — |

**推奨 merge 順**：Lane 1 の採否確定 → **先に Lane 1 を master へ**（CEO QA PASS の場合）→ 本 RC を rebase／merge（conflict 1 箇所を上表どおり解消・`coreRoster.test.ts` golden 更新・`enemy_09` rank 3）→ version 1.0.1 → Gate 再実行（G4・G5・G6・G9）→ PR。Lane 1 取り下げなら本 RC をそのまま PR（conflict 0）。Lane 1 の Pilot runtime を v1.0.1 に**同梱するか**は設計書 §1 #5「別 Release」の判断のまま（本 RC は判断しない）。

## 6. 残存リスク

| # | リスク | 影響 | 緩和 |
|---|---|---|---|
| 1 | ★ が全 7 体で変わる（道化 4→1・機工師 4→2 など） | 既存プレイヤーの期待と不連続 | 注記 1 文目で定義を同時に示す（設計書 R6・意図した修正・Known に入れない） |
| 2 | `FINGERPRINT_RANK_V1_0_0` の定数が「死んだ値」に見える | 保守性 | `gameVersion.ts` の doc comment と `gameVersion.test.ts` で意図を固定。PM が望めば v1.1 で「単純除外＋版の 1 回更新」へ切り替え可能（その時は Daily リセット直後 deploy） |
| 3 | G8 Save Migration を本 RC で実測できていない | セーブ互換の実機確認が統合時に回る | storage／replay 再開コード差分 0・saveVersion 9 不変（静的）。統合 Gate で再実行 |
| 4 | G6 の自己一致（evidence フォルダ名 `migration/`） | 以後の Gate で毎回 17/18 | `ranking-absence.mjs` の tracked フィルタに `docs/evidence/` を加える 1 行（scripts/release-audit は本 RC の範囲外・PM 判断） |
| 5 | SP375 の遊び方 ② が 6 行（+約 40px） | 可読性 | モーダルは縦スクロール可・他ステップの範囲内（③ 83 字）。スクリーンショット `tutorial-2-sp375.png` で確認済み |
| 6 | Lane 1 との `gameVersion.ts` conflict 1 箇所 | 統合作業 | §5 の解消方針（意図が同じなので機械的） |
| 7 | `TutorialOverlay.tsx` の分離で a11y テストが見る正規表現 | 回帰 | `a11yMinimum.test.ts`・`entranceWiring.test.ts` PASS（G4 に含む） |

## 7. CEO 判断

新規 **0**。本 RC の判断（★の付番規則＝案 A・`gameVersion` 不変の実装方式・文言の確定・`TutorialOverlay` の分離・G8 の統合後送り）は CLAUDE.md §6-2（ゲーム内パラメータ・軽微な UI 調整・技術実装方式・テスト方式）の範囲で AI が決めた。CEO に残るのは設計書 §11 の 1 件（v1.0.1 Release 実行＝Human QA PASS 後に PM が提出）。

## 8. DECISIONS／RELEASE_STATUS 行ドラフト（PM が統合時に転記・本体は未編集）

**(a) `docs/DECISIONS.md` §5 変更履歴（設計書 §8 (a) を本 RC の実測で更新）**

```
| <date> | 決定281（候補）v1.0.1 Fast Gate「★再付番＋語彙補完＋敵選択注記」— RC feat/v1_0_1-fast-gate-rc（7ba447f 起点・commit ecf29a4/ffea356/<c3>）Gate PASS → PR <#> CI GREEN → CEO merge 承認 → PRODUCTION LIVE（deployment <id-101>・master <merge sha>・bundle <index-xxxx.js>）→ Rollback 演習 1 往復 PASS（6973326943 ⇄ <id-101>・RL-02 DONE）（束の選定・付番規則・文言・gameVersion 不変の実装方式・Gate 判定＝AI 判断（CLAUDE.md §6-2）／Release 実行・merge・Promote＝CEO §6-3 #8）。内容：① `rank` 7 値を実測で再付番（案 A＝normal 全体指数 降順・hard 同点処理・4/4/3/3/2/2/1・matrix 14,112 局の再集計 `docs/evidence/v1_0_1-rc/star-reeval.json`）：龍神 4／怨霊 4／魔獣 3／鬼将 3／試練の影 2／機工師 2／道化 1（旧 3/3/2/2/1/4/4・ρ normal −0.31 → 0.97・ペア一致 8/18 → 18/18）。表示専用・engine 0。**gameVersion は 1.d794038a00b5b53c のまま不変**（rank は対局結果に影響しないため指紋入力の rank を v1.0.0 時点の定数に固定＝除外と等価。Daily day-lock・K26 の切替は起きない。設計書の「Expected Spec Update」を取り下げ）。② Brief ②「余った神力と防御は、次のラウンドへ持ち越せません。」（42 字・3 行合計 112/120）・遊び方 ②（⚡ 溜め→必殺・⚔ 連撃・防御はそのラウンドだけ・76 字）・攻略のコツ +1「防御は次のラウンドに残りません…」（40 字・6 本）（`FIRST_PLAYER_UX_IMPROVEMENT_PROPOSAL_V1.md` 案 B）。文言データを `tutorialContent.ts` に分離。③ 敵選択注記「★は脅威度（実測の手強さ：負けやすさ・受けるダメージ・倒すまでの長さ。最大5）。難易度の★とは別物です。」。不変：engine・rules・カード・敵の行動表・セーブ互換（saveVersion 9）・決定262／263 の境界（戦闘中の表示 0・正解表示 0）。Gate（RC）：tsc 0／oxlint 新規 0（計 11）／vitest 1,450 PASS・9 skip／build 467.58 kB／ranking-absence 17/18（1 件は master 既存 evidence フォルダ名の自己一致）／secret 0／acceptance 44/44（PC 1508×660・SP375）／同 seed 一致（engine 差分 0）。統合 Gate：save-migration <結果>／version 1.0.1／CI <run>／Smoke S1〜S6 <結果>／Human QA Q1〜Q3 YES・Q4 NO（CEO <date>）。Known 変更：なし（K01 据え置き）。根拠 `docs/V1_0_1_FAST_GATE_DESIGN.md`・`docs/V1_0_1_RC_GATE_CHECKLIST.md` |
```

**(b) `docs/RELEASE_STATUS.md` A-0（設計書 §8 (b) からの差分のみ）**

- 「**Release**」の末尾：`（gameVersion は ENEMIES 指紋で <old> → <new>・結果不変）` → **`（gameVersion 1.d794038a00b5b53c 不変・rank は指紋から除外）`**
- A-4 K26 の注記：「v1.0.1 で gameVersion 変更＝旧セーブは次 R から新表」は**不要**（版が変わらないため託宣表の切替は起きない）
- 「**Release Gate**」→ `docs/V1_0_1_RC_GATE_CHECKLIST.md §4 G0〜G10 RC PASS（G6 17/18 既存自己一致）・G8/G11〜G13 統合時・G14/G15 CEO（evidence docs/evidence/v1_0_1-rc/）`
- deploy 時刻の制約「JST 早朝（Daily リセット直後）」：**不要**（R1 消滅）。任意の時刻でよいが Rollback 演習の都合で深夜帯推奨は残す（R9）

## 9. 本 RC で変更したもの・commit

| 種別 | ファイル |
|---|---|
| runtime（4） | `src/core/data/enemies.ts`（rank 7 値＋コメント）／`src/core/replay/gameVersion.ts`（rank 除外・版不変）／`src/components/setup/firstBattle.ts`（Brief ②）／`src/components/setup/EnemySelectScreen.tsx`（注記）／`src/components/TutorialOverlay.tsx`（文言データを分離・描画不変）／`src/components/tutorialContent.ts`（新規・② 本文・TIPS +1） |
| テスト（5） | `src/core/data/enemies.test.ts`／`src/core/replay/gameVersion.test.ts`／`src/components/setup/firstBattle.test.ts`／`src/components/tutorialWording.test.ts`（新規）／`src/components/setup/enemySelectNote.test.ts`（新規） |
| scripts（2） | `scripts/v1_0_1-rc/star-reeval.mjs`／`scripts/v1_0_1-rc/acceptance.mjs` |
| 証跡 | `docs/evidence/v1_0_1-rc/`（01〜09・star-reeval.json・08-acceptance 12 枚＋json） |
| docs | 本書。`DECISIONS.md`・`RELEASE_STATUS.md`・`package.json`・`.github/`：**未編集** |

commit（ローカルのみ・push 0）：`ecf29a4` ★再付番＋gameVersion 不変／`ffea356` 語彙補完＋敵選択注記／`<c3>` 受入スクリプト・証跡・本書。
