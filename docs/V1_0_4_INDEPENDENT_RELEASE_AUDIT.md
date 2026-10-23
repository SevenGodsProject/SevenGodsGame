# v1.0.4 独立 Release 監査（Retention 束 v1）

> **状態（2026-10-23・Lane 7・独立監査・READ-ONLY・AI 判断（CLAUDE.md §6-2））**
> 対象：`feat/v1_0_4-retention-bundle` HEAD `bf683b4`（worktree `C:/Users/kimi1/SevenGodsGame-retention`・編集 0）
> 基準：`origin/master` `1f713d6`（v1.0.3 Production・deployment `7256475048`）
> 差分 commit：`70bd104`（①絆★3）／`1904941`（②NM1）／`3886fbd`（③今日の問い）／`6464997`（実装記録）／`bf683b4`（AC19 例外の契約テスト＋証跡）
> 実行したもの：`git diff/show/log`、targeted vitest 7 files（matchupWiring・nextGoal・resultContext・dailyDiff・dailyClock・otomoGrowthDisplay・matchupStorage）＝**134/134 PASS**（実行後 `git status` 差分 0）。build・Playwright は未実行（PM 直列管理）。
> 実装者記録（`docs/RETENTION_BUNDLE_V1.md`）の結論は前提にせず、コードから再判定した。

---

## 0. 結論

| # | 監査項目 | 判定 | 要点 |
|---|---|---|---|
| 1 | AC19 新規例外と決定206 前例の整合 | **WARN** | 形（判定材料は resultContext に閉じ、nextGoal は入力を受けるだけ）は 206 と同型。ただし 206 より一段広い（nextGoal.ts が初めて matchup という語を持つ）、DECISIONS への記録が未了（決定284 は「候補」・DECISIONS.md に 0 件）、テストコメントが旧前提のまま矛盾 |
| 2 | 契約テストが不変条件を弱めていないか | **WARN** | 弱化は nextGoal.ts 1 ファイル・「storage を触らない」へ限定されており実害なし。ただし ①実装 commit `1904941`〜`6464997` の 3 commit は契約テストが赤（実装後にテストを合わせた順序）②nextGoal の新検査は resultContext 側のような「参照語の完全一致」ではなく禁止語リスト方式 |
| 3 | 初撃破判定・撃破神数の参照経路 | **PASS** | 新しい storage 読み込み 0。`useGameEngine` が決着時に 1 回だけ記録した `MatchupClearResult` を props で流すだけ。保存失敗時 null・敗北／Pilot／神域挑戦では出ない・再開で再発火しない |
| 4 | gameVersion／save v9／storage 書き込み | **PASS**（version 表記のみ WARN） | `src/core`・`rules.ts` 差分 0、`setItem`／`localStorage` 追加 0、新規キー 0、migration 不要。`package.json` は **1.0.3 のまま**（v1.0.4 RC で bump 必要） |
| 5 | 未公開機能の混入 | **PASS** | 差分 22 ファイルに shogunate／voice／crisis／ranking／pilot／api／public／art-source／core 0 |
| 6 | Preview Gate・旧セーブ互換・Rollback | **WARN（未整備）** | G1 相当（tsc／oxlint／vitest 1,544／build）の証跡のみ。v1.0.3 Gate の G5 Ranking Absence・G6 Secret・G7 受入・G11 旧セーブ互換・Home version smoke・Rollback 先の明記が無い。v1.0.3 公開記録 `57584ad` も未取り込み |
| 7 | GO／NO-GO 条件 | — | §7。**現時点の判定：NO-GO（RC 未構成）／コード内容は GO 可能（BLOCKER 0）** |

**BLOCKER：0 件**（コードの正しさ・保存互換・混入の観点で公開を止める欠陥は無い）。
**公開前に必須の条件（MUST）：7 件**（§7-1）。いずれも RC 構成・記録・Gate 実測で解消できる作業で、runtime の追加修正は不要。

---

## 1. AC19 新規例外と決定206 前例の整合 — WARN

### 1-1. 元の不変条件
- 決定189 仕様 `docs/PHASE7_P2_49_MATRIX_SPEC.md:397`：「AC19｜Home と Next Goal の出力が P2 前後で同一」。目的は **P1 の判断（Home・Next Goal・Result Hub）を 49 攻略から切り離す**こと。
- 契約テスト `src/components/matchupWiring.test.ts:51-61`（`describe('P1 の判断…は神×敵を参照しない（AC19）')`）で、対象ファイルに `/matchup/i` が 1 文字も無いことを固定していた。

### 1-2. 決定206 の前例（1 つ目の例外）
- `docs/DECISIONS.md:363`：「決定189 AC19 の例外（AI判断）：`resultContext.ts` のみ matchup を読み取り参照可（書き込み呼び出し無しをテストで固定）」。
- 形：①判定材料（魔獣既撃破）は resultContext が **読むだけ**で組み立てる ②`nextGoal.ts` は `earlyRead` という **matchup を含まない名前**の入力を受けるだけ ③nextGoal.ts は `/matchup/i` 検査に残ったまま ④DECISIONS に決定番号付きで記録。

### 1-3. 今回（NM1・2 つ目の例外）
| 観点 | 決定206 | 今回 | 評価 |
|---|---|---|---|
| 根拠 | NR1 の判定に「魔獣既撃破」が必要 | NM1 の判定に「初撃破か・この敵の撃破神数」が必要 | 同型・妥当 |
| 取得経路 | resultContext が `loadMatchups` で読む | **storage を読まない**。`useGameEngine.ts:238` で決着時に記録済みの `MatchupClearResult` を `BattleScreen.tsx:719` → `resultContext.ts:112-115` で写すだけ | 206 より **狭い**（新規読み込み 0） |
| nextGoal.ts の扱い | `/matchup/i` 検査対象のまま | 検査対象から外し（`matchupWiring.test.ts:52-61` の it.each から削除）、入力名 `matchup`（`nextGoal.ts:81`）を許可 | 206 より **広い**。`earlyRead` と同様に matchup を含まない入力名（例 `firstClear`）にすれば nextGoal.ts を元の検査に残せた |
| 記録 | DECISIONS 決定206 に明記 | commit `bf683b4` と実装記録のみ。**DECISIONS.md に決定284 の行が無い**（`grep -c 決定284` = 0） | 未了 |
| テストコメント | — | `matchupWiring.test.ts:72`「nextGoal.ts 自体は上の検査どおり matchup を知らない」が **新実装と矛盾したまま** | 要修正（docs/コメントのみ） |

**判定 WARN**：例外の根拠・取得経路は前例と整合（むしろ狭い）。ただし「nextGoal.ts は matchup を知らない」という 206 時点の境界を一段緩めた点と、記録未了・矛盾コメントが残る。公開前に DECISIONS へ AI 判断として記録すれば解消（§7-1 M3）。nextGoal.ts の入力名変更は任意（SHOULD）。

---

## 2. 契約テストの変更前後比較 — WARN

### 2-1. 変更前（`1f713d6`）→ 変更後（`bf683b4`）
| テスト | 変更前 | 変更後 | 強度 |
|---|---|---|---|
| nextGoal.ts | `not.toMatch(/matchup/i)`（全面禁止） | `not.toMatch(/matchupStorage/)`・`not.toMatch(/\b(loadMatchups\|countMatchupsByEnemy\|recordMatchupClear)\b/)`・`not.toMatch(/localStorage\|\.setItem\s*\(/)`（`matchupWiring.test.ts:64-69`） | **弱化**（参照禁止 → storage 接触禁止） |
| resultContext.ts | 参照語の完全一致 `['countMatchupsByEnemy','loadMatchups','matchupStorage','matchups']` | 完全一致 `['MatchupClearResult','countMatchupsByEnemy','loadMatchups','matchup','matchupClear','matchupStorage','matchups']`（`:77`）＋書き込み呼び出し禁止は不変（`:79`） | 同等（許可語 3 つ追加・完全一致方式は維持） |
| HomeScreen／HomeTodayPanel／resultHub／dailyDiff／resultTransitions | `/matchup/i` 禁止 | 不変 | 不変 |
| 記録点 1 か所・recordDailyResult より前・startDailyAttempt 1 か所・書き込みキー 1 つ・表示部品は書かない | — | 不変（`:31-47`・`:84-93`） | 不変 |

### 2-2. 評価
- 弱化は **nextGoal.ts 1 ファイル**に限定。nextGoal.ts が matchupStorage の関数・定数（`MATCHUP_TOTAL` 等）を使うには import 文に `matchupStorage` が必要なので、新検査で実質的に storage 接触は防げている。**「書き込み 0・新規読み込み 0」という本来の安全上の不変条件は弱まっていない**。
- 一方、AC19 の当初の意図「P1 の判断は 49 攻略を知らない」は nextGoal.ts について明示的に放棄された（意図的な仕様変更であり、記録が必要＝§1）。
- **順序の問題**：`matchupWiring.test.ts` は `bf683b4` でしか変更されていない（`git diff --stat`）。`1904941` 時点で nextGoal.ts に `matchup` が入ったため、`1904941`／`3886fbd`／`6464997` の 3 commit では本テストが **赤**（実装記録 §6 の targeted vitest に matchupWiring が含まれていない）。「実装 → 契約テストを実装に合わせて緩める」順で、契約テストが事前の歯止めとして働かなかった。HEAD では full vitest 1,544 PASS（`docs/evidence/v1_0_4-retention/03-vitest.txt`）。
- **Rollback 上の帰結**：実装記録は「各 commit revert 可能」とするが、`1904941` だけを revert すると `bf683b4` の完全一致リスト（`matchup`／`matchupClear`／`MatchupClearResult`）が満たされず赤になる。NM1 を外すときは **`1904941` と `bf683b4` を対で revert** する必要がある。
- SHOULD：nextGoal.ts も resultContext と同じ「参照語の完全一致（`['matchup']`）」にすると、将来の import 追加を構造的に検出できる。

**判定 WARN**（BLOCKER ではない）。

---

## 3. 初撃破判定と撃破神数の参照経路 — PASS

| 段 | 箇所 | 内容 |
|---|---|---|
| 記録 | `src/hooks/useGameEngine.ts:238` | 決着分岐（非 Pilot・`clearBattleSave()` 後）で `recordMatchupClear` を 1 回。Pilot 敵は `:226` で null |
| 判定 | `src/hooks/matchupStorage.ts:205-226` | `status==='won'` 以外 null／`add()` が集合に新規追加した時だけ `isFirstClear=true`／**初撃破で write 失敗なら null**（保存できていない初撃破を祝わない）／future version・storage 不可は null／`enemyClearedCount`＝記録後の `countMatchupsByEnemy` |
| 受け渡し | `BattleScreen.tsx:719` → `resultContext.ts:112-115` | `state.status==='won' && engine.matchupClear` の時だけ `{isFirstClear, enemyClearedCount}` を写す。新規 storage 読み込み 0 |
| 表示判定 | `nextGoal.ts:169-179` | 通常モードのみ（神域挑戦は `selectDailyGoal` で先に分岐）。評価順 N1→N2→N3→NR1→**NM1**→N4。`isFirstClear && enemyClearedCount < 7` |

**初回のみの保証**：集合追加の冪等性（AC13 既存テスト）＋ `matchupClear` は新規対局・再戦・選び直しで null に戻る（`useGameEngine.ts:323,369,439,472`）＋決着時に battleSave を消すため「続きから」で結果画面が再生成されない。→ 同じ組み合わせで 2 回目は出ない（`nextGoal.test.ts` NM1 2 件目、`resultContext.test.ts` で実データ経由の NM1 を確認）。

**既存データでの誤発火**：
- 既存 `sevengods.matchups` がある v1.0.3 プレイヤー：記録済みの組み合わせでは `isFirstClear=false` → 出ない。
- キーが無い（または壊れた）場合：決定189 の §12 取り込み（daily 勝利 30 日分のみ）を経て判定。**P2 以前の通常戦の勝利は推測で埋めない仕様**のため、その組み合わせで初めて勝つと「初撃破」になる。これは既存の「✨ 初撃破」1 行（決定189 承認済み）と同一条件で、NM1 固有の新たな誤発火ではない（Known・許容）。
- 旧 OTOMO 記録・daily 記録は NM1 に関与しない。

**INFO**：`nextGoal.ts:172,175` の `7` は直書き（同種の既存コード `matchupCelebration.ts:21-22` は `MATCHUP_GODS.length`）。調整値ではないので §3 不変ルール 4 違反ではないが、整合のため定数参照が望ましい（SHOULD）。

---

## 4. gameVersion・save v9・storage 書き込み不変性 — PASS（version 表記 WARN）

| 項目 | 結果 | 根拠 |
|---|---|---|
| `src/core` 差分 | 0 | `git diff --stat 1f713d6 bf683b4` に `src/core` なし |
| `rules.ts`／`enemies.ts`／gameVersion 指紋 | 不変 | 同上（`RULES` は `dailyDiff.ts` で **読むだけ**＝`RULES.totalRounds`） |
| save v9（battleSave） | 不変・migration 不要 | battleSave 関連ファイル差分 0 |
| `localStorage`／`setItem`／`sevengods.*` 追加 | 0 | `git diff 1f713d6 bf683b4 -- src` の追加行で該当はテスト内の禁止パターン 1 行のみ |
| 新規キー・書き込みタイミング | 0・不変 | ③は保存済み `status`／`round` の読み取り（`dailyDiff.ts` `describeDailyVerdict`／`describeDailyDayVerdict`）、明日の型は `dailyBossFor(nextDailyKey(now))` の純計算（`dailyClock.ts`） |
| ① OTOMO ★3 | 表示層の導出のみ | `otomoGrowthDisplay.ts:82`（tier3＝Lv5）・`:94`（童子の記録＝`dojiReached>0`）。保存スキーマ不変。既存 Lv5・童子未到達は ★3 に **昇格のみ**、Lv5 未満は不変（テストで固定） |
| アプリ version | **1.0.3 のまま** | `package.json:4`、build 証跡 `sevengodsgame@1.0.3`。v1.0.3 RC では `package.json`・`package-lock.json`・`publicFace.test.ts` を同時更新した前例（`V1_0_3_RC_GATE.md` §1 ⑥） |

**INFO（旧データ）**：`dailyStorage.ts` は `results` 要素を検証せずキャストする。`round` は Daily 導入 commit `d8af12d` から常に保存されているので通常データでは問題ないが、手改変データでは「R undefined」表示になり得る（既存 `describeDailyDiff` と同水準の前提・runtime error ではない）。

---

## 5. 未公開機能の混入防止 — PASS

`git diff --name-only 1f713d6 bf683b4`（22 files）を検査：`shogunate`／`tadatsugu`／`voice`／`crisis`／`ranking`／`pilot`／`api/`／`public/`／`art-source`／`audio-source`／`src/core`／`enemies`／`rules`：**0**。
`?pilot=threat` 等の Pilot ガードは master 既存コード（`useGameEngine.ts:217-227`）で差分外。新規アセット 0・依存追加 0（`package.json` 差分 0）。

---

## 6. Preview Gate・旧セーブ互換・Rollback — WARN（未整備）

v1.0.3 の Gate 構成（`docs/V1_0_3_RC_GATE.md` G0〜G11）と比較：

| v1.0.3 Gate | v1.0.4 branch の状態 |
|---|---|
| G1 tsc／G2 oxlint／G3 vitest／G4 build | **有**（`docs/evidence/v1_0_4-retention/01〜04`：tsc 0・oxlint 11（新規 0）・vitest 124 files 1,544 PASS／17 skip（1,528＋16 と一致）・build `index-B60pMilO.js` 473.99 kB（+1.15 kB）） |
| G5 Ranking Absence／G6 Secret Audit | **無** |
| G7 受入（版別 acceptance.mjs）・語彙・敗北画面・SP 本文 | **無**（実装記録 §7 G3〜G7 は「案」のみ） |
| G8 Home version smoke（`v1.0.4 (sha)`） | **無**（version 未 bump のため実施不能） |
| G9 前回公開記録の取り込み | **無**：v1.0.3 公開記録 `57584ad`（DECISIONS 決定283 LIVE・RELEASE_STATUS A-0・Production Smoke 証跡）が branch の祖先に無い（`merge-base --is-ancestor` 偽）。決定番号 284 の採番・RELEASE_STATUS の衝突回避のため RC で先に取り込む必要あり |
| G11 旧セーブ互換（前版 build × RC build・`save-migration.mjs`） | **無**。①で既存 OTOMO 記録の表示が変わる（★3 昇格）ため、**v1.0.3 Production と byte 一致の build で作ったセーブ**での実測が必要 |
| Rollback 先の明記 | **無**。正しい Rollback 先＝deployment **`7256475048`（v1.0.3・master `1f713d6`）**（`57584ad` 記録）。storage 書き込み 0 のため Rollback 時のデータ互換リスクは無い（v1.0.4 で作られるデータ＝v1.0.3 と同一形式） |
| push サイズ計画 | 未記載（今回の差分は小さいが `57584ad` 取り込みで証跡 PNG 群が増える。v1.0.3 の 25 MB 分割基準で再計測） |

---

## 7. v1.0.4 GO／NO-GO 条件

### 7-1. 公開前に必須（MUST・1 つでも欠ければ NO-GO）
| # | 条件 | 合格基準 |
|---|---|---|
| M1 | RC の構成 | `origin/master 1f713d6` 起点の RC に、本 branch と v1.0.3 公開記録 `57584ad` を merge（conflict 0）。他 Lane（shogunate／voice／crisis／card art／ranking）混入 0 を `--name-only` で再確認 |
| M2 | version | `package.json`・`package-lock.json`・`publicFace.test.ts` を 1.0.4 へ。Home 表示 `v1.0.4 (sha)` を smoke で確認。gameVersion 指紋は **不変**（`1.d794038a00b5b53c` のまま）であること |
| M3 | Decision 記録 | DECISIONS.md に決定284（候補）を **AI 判断**として追記：①絆 ★3 条件変更（決定70／71・Phase1.5 の見直し）②NM1 と評価順（決定187 の順序見直し）③AC19 の 2 つ目の例外（範囲＝nextGoal.ts は入力を受けるだけ・storage 接触禁止をテストで固定、決定206 との差分）④今日の問い |
| M4 | 自動 Gate（RC HEAD で再実測） | tsc 0／oxlint 新規 0／full vitest 0 fail（件数＝1,544＋M2 分の差のみ）／build 成功／Ranking Absence PASS／Secret Audit PASS／`git diff 1f713d6 -- src/core` 空 |
| M5 | 受入（ブラウザ） | 実装記録 §7 の G3（Daily verdict・D4・Home countdown の「明日の問い」）、G4（初撃破で `matchup-clear` と NM1 同時表示／同組み合わせ 2 勝目は NM1 なし／初陣は NR1 のまま）、G6（PC 1508×660・SP 390×844・375×667 で横スクロール 0・Primary 初期可視）、G7（新語 2 つのみ）を全件 PASS |
| M6 | 旧セーブ互換 | v1.0.3 Production と byte 一致の build で作ったセーブ → RC build で開いて `save-migration` 全件 PASS。OTOMO 画面の差分は ★3 昇格と「次の解放」文言のみ・console error 0 |
| M7 | Rollback 計画 | RC Gate 文書に Rollback 先 `7256475048`（v1.0.3）を明記。NM1 単独撤回時は `1904941`＋`bf683b4` を対で revert することを明記 |

### 7-2. 推奨（SHOULD・公開判断を止めない）
- S1：`matchupWiring.test.ts:72` の矛盾コメントを更新（nextGoal は入力名 `matchup` を持つ）。
- S2：nextGoal.ts の検査を参照語完全一致（`['matchup']`）へ、または入力名を matchup を含まない名前へ。
- S3：`nextGoal.ts:172,175` の `7` を `MATCHUP_GODS.length` 相当に。
- S4：`OtomoGrowthScreen.tsx:147` の旧コメント（童子は `dojiReached` 由来）を更新（実装記録 §9 で既知）。
- S5：NM1 は新規プレイヤーの勝利の大半（新しい組み合わせ）で N4（今日の神域挑戦）より先に出る。結果画面からの Daily 導線が初期に減る点を CEO 目視 3 分の #3 と併せて観察（Home の Daily 導線は不変）。
- S6：Home で 3 回すべて途中放棄した日は「今日の 3 回は終了」と「今日の問い：未着手」が並ぶ（既存「まだ挑戦していません」と同じ基準）。文言の違和感が出たら「未解（記録なし）」等を検討。

### 7-3. NO-GO 条件（いずれか 1 つで公開中止）
- `src/core`／`rules.ts`／gameVersion 指紋／save v9 の変化、または `setItem`・新規 storage キーの追加が RC 差分に出た。
- 旧セーブ互換（M6）で FAIL・console error・OTOMO の **降格**（★が下がる）が 1 件でも出た。
- 同じ組み合わせの 2 勝目・敗北・神域挑戦・Pilot 敵で NM1 が出た。
- 他 Lane の未公開機能（shogunate・voice・crisis・ranking UI/API・pilot フラグ有効化）が RC に混入。
- full vitest に fail（特に `matchupWiring.test.ts`）。

### 7-4. 現時点の判定
- **コード内容：GO 可能**（BLOCKER 0。§1〜§5 の WARN は記録・コメント・テスト強度の問題で runtime の安全性を損なわない）。
- **Release としては NO-GO（現時点）**：M1〜M7 が未了（RC 未構成・version 未 bump・DECISIONS 未記録・Gate G5〜G11 未実測・Rollback 未記載）。M1〜M7 を満たせば **READY FOR CEO PRODUCTION RELEASE APPROVAL**（CEO 判断は §6-3 #8 の公開承認 1 件のみ）。
