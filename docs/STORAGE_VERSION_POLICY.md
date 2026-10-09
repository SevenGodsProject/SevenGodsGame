# Storage Version Policy — Save Compatibility Guard（RL-01）

- 日付：2026-10-09（Lane 1・**AI 判断**（CLAUDE.md §6-2）・`docs/ROADMAP_TO_RELEASE.md` §2 #3 の実体化・CEO 指示 2026-10-09「既存 Save の互換性・移行・消失リスクを調査し、既存データを破壊しない最小実装」）
- 状態：**IMPLEMENTED ON BRANCH `feat/rl01-save-compat-guard`**（master merge は CEO 承認後。push・deploy 0）
- 調査：read-only サブエージェントの棚卸し（13 key・file:line 付き。scratchpad `rl01_survey.md`）を AI-PM が実コードで再検証したうえで本書と実装に反映
- 不変：**保存形式（JSON の形）は 13 key すべて不変・`RULES.saveVersion` 9 不変・各 key の version 定数 不変・`src/core` 差分 0**。変わるのは「未来 version を上書きしない」「壊れた 1 件のために残りを捨てない」「`null` で throw しない」の 3 点だけ

---

## 1. Key Registry（13 key・2026-10-09 時点）

| # | key | version | 型 | 実装 | 中身 |
|---|---|---|---|---|---|
| 1 | `sevengods.records` | 1 | **台帳** | `recordStorage.ts` | 神ごとの戦績（自己ベスト・勝敗数） |
| 2 | `sevengods.otomoBond` | 1 | 台帳 | `otomoBondStorage.ts` | 神ごとの OTOMO 絆（形態到達回数） |
| 3 | `sevengods.stakes` | 1 | 台帳 | `stakeStorage.ts` | 神階の解放・段別ベスト |
| 4 | `sevengods.daily` | 1 | 台帳 | `dailyStorage.ts` | 神域挑戦の日別記録（回数・結果・ベスト）。30 日保持 |
| 5 | `sevengods.rewardBonuses` | 1 | 台帳 | `rewardStorage.ts` | 報酬で増えた編成上限 |
| 6 | `sevengods.rewardHistory` | 1 | 台帳 | `rewardHistoryStorage.ts` | 報酬の提示・見送り履歴（反復抑制） |
| 7 | `sevengods.pendingRuns` | 1 | 台帳 | `pendingRunStorage.ts` | Ranking 送信待ち run（READY-DORMANT） |
| 8 | `sevengods.quota` | 1 | 台帳 | `localQuotaProvider.ts` | 託宣枠（runtime 呼び出し 0・休眠） |
| 9 | `sevengods.matchups` | 1 | 台帳 | `matchupStorage.ts` | 神×敵 49 攻略（決定189）。**最初から future＝読まない・書かない** |
| 10 | `sevengods.battleSave` | `RULES.saveVersion`＝9 | **スロット** | `battleSaveStorage.ts` | 進行中バトル 1 件。v3→v9 の migration 連鎖あり |
| 11 | `sevengods.dailyRunLog` | 1（内側 `replay.formatVersion` 1） | スロット | `dailyRunLogStorage.ts` | 進行中 Daily run の行動ログ 1 件 |
| 12 | `sevengods.deckPreference` | `RULES.saveVersion`＝9 | スロット | `deckPreferenceStorage.ts` | 最後に使ったデッキ 1 件 |
| 13 | `sevengods.tutorialSeen` | なし（文字列 `'true'`） | フラグ | `tutorialStorage.ts` | 設計上 version なし |

**台帳**＝積み上がる記録（消えると戻らない）。**スロット**＝常に 1 件で、次の行為が上書きしてよいもの。

## 2. 規則

| # | 規則 | 適用 |
|---|---|---|
| R1 | **version を上げるなら migration 必須**。旧 version を読んで新形式へ変換し、変換できないものだけ空にする（`battleSaveStorage.ts` の v3→v9 連鎖が手本） | 全 key。現状 version を上げた前例は battleSave のみ |
| R2 | **version を上げないなら「追加のみ互換」**。フィールドの追加は default-fill で読む（`recordStorage.ts` `normalizeRecord` が手本）。既存フィールドの意味変更・削除は R1 |
| R3 | **未来 version（このビルドより大きい）は読まない・書かない**。読み取りは「空」を返してよいが、**書き込みは行わない**（`setItemGuarded` が false を返す）。これにより rollback／新旧混在時に新しいビルドの記録を旧ビルドが消さない | **台帳型 9 key**。スロット型 3 key は例外（次の進行が上書きしてよい。進行中 1 件の価値 < 操作不能の害） |
| R4 | **壊れた JSON＝無いものとして扱う**（例外を外へ出さない・読み取りでは書き換えない）。**部分的に壊れた記録は、その 1 件だけ除外して残りを残す**（`pickValidEntries`）。`.every` で全体を捨てない | 台帳型 |
| R5 | **読み取り API は書かない**（読み取りの副作用で key を作らない・直さない）。例外：`matchupStorage` の初回取り込み（決定189 で設計として承認済み）と `localQuotaProvider.getState`（休眠・日付切替の更新。R3 の guard は掛かる） | 全 key |
| R6 | `deckPreference` は `saveVersion` を共有し bump で破棄される（`deckPreferenceStorage.ts` L13-15 の設計コメント）。**v1.0 では現状維持**（デッキ 1 件は再構成できる）。`saveVersion` を 10 に上げる変更が入るときに R1 の対象にするかを決める（NEXT_MILESTONES L4 ②） | deckPreference |
| R7 | 新しい key を足すときは本表に 1 行追加し、`storageCompat.test.ts` の `LEDGER` に 1 エントリ足す（台帳型なら `setItemGuarded` を使う） | 運用 |

## 3. 今回の実装（最小）

| ファイル | 変更 |
|---|---|
| `src/hooks/storageGuard.ts`（新規・`src/core` 非依存） | `storedVersion(key)`／`isFutureStored(key, v)`／`setItemGuarded(key, v, json)`／`pickValidEntries(obj, guard)` |
| `recordStorage.ts`・`otomoBondStorage.ts`・`rewardHistoryStorage.ts`・`localQuotaProvider.ts` | `save()` → `setItemGuarded`（R3）。`isXxxData` の `.every` を外し、`load()` で `pickValidEntries`（R4） |
| `stakeStorage.ts` | `save()` → `setItemGuarded`（R3）。`byGod === null` を弾く（従来は `typeof null === 'object'` を通して `load().byGod[godId]` で throw → `HomeTodayPanel` から ErrorBoundary に到達し得た） |
| `dailyStorage.ts` | `saveData()` → `setItemGuarded`（R3）。`isDailyDayLike`（日付キー正・`results` 配列）で日ごとに検証し壊れた日だけ除外、欠けた項目は `normalizeDay` が読み取り時に default-fill（R2。`bestByGod` など後から足された項目を持たない古い日も読める・書き戻さない）。従来は `results` 欠落で `bestResultOf`／`recordDailyResult` が throw し得た |
| `rewardStorage.ts`・`pendingRunStorage.ts` | `save()`／`write()` → `setItemGuarded`（R3） |
| `src/hooks/storageCompat.test.ts`（新規） | 台帳型 8 key × 5〜6 ケース（無い／壊れた JSON／旧 version／未来 version の読み書き raw 不変／storage 不可／一部不正 5 key）＋スロット型 3 key（未来＝null・raw 不変）＋部品 3 件。quota は読み取りが書き戻す設計（R5 例外）のため「読み取りで raw 不変」のみ省く（`readMayWrite`） |

変更しないもの：`battleSaveStorage.ts`（migration 連鎖は既に R1 を満たす）、`dailyRunLogStorage.ts`・`deckPreferenceStorage.ts`（スロット型）、`matchupStorage.ts`（既に R3／R4 を満たす）、`tutorialStorage.ts`、保存形式、`RULES.saveVersion`、`src/core`。

## 4. 残り（本 branch に含めない）

1. `scripts/release-audit/save-migration.mjs` に **合成 fixture 注入モード**（旧 version／未来 version を localStorage に注入して 2 ビルドで読む）を足す（現状は 2 ビルド実機比較のみ・≈0.5〜1 人日）
2. `scripts/d267-reward-relevance-v1/migration.mjs` M2 は「version 2 は確定時に v1 で書き直される」を PASS 条件にしている → R3 と逆なので、次に同スクリプトを使う前に条件を反転する
3. `otomo.defId` guard（決定191 同型・NEXT_MILESTONES L4 ①）：`isSavedBattle` に検証なし・`getOtomoDef` 未防御 3 箇所。別 commit（Save に触れるため別 Gate）
4. R6（deckPreference の版方針）は `saveVersion` bump が必要になった時点で決める
