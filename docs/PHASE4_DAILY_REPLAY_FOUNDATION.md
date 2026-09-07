# Phase 4.1 — Daily Fairness Fix ＋ Replay Foundation

- **日付**：2026-09-07
- **branch**：`feat/daily-ranking-phase4`（Phase 4.0 の `7ef714a` の上に積む独立commit。merge・push・deploy いずれも未実施）
- **区分**：AI判断（CLAUDE.md §6-2）。CEO承認済み前提＝①Daily bonusCopies 無効化 ②Phase 4.0 の CONDITIONAL GO
- **前提**：Phase 4.0 監査（決定131 / `docs/PHASE4_DAILY_RANKING_COMPETITIVE_GATE.md`）。simulation は再実行していない
- **やっていないこと**：Neon・DB・Ranking API・ランキングUI・display name・anonymous ID・rate limit・Production deploy・寿楽balance変更・score計算変更・Daily seed変更・3回制限変更・JST reset変更

---

## 1. 成果物

| ファイル | 区分 | 内容 |
|---|---|---|
| `src/core/replay/types.ts` | 新規 | `ReplayInput` / `ReplayAction` / `VerifiedOutcome` / 拒否コード |
| `src/core/replay/replay.ts` | 新規 | `runReplay()` 本体 |
| `src/core/replay/index.ts` | 新規 | 公開エントリ（ランキングBackendはここだけ import すればよい） |
| `src/core/replay/replayTestUtils.ts` | 新規 | テスト専用の実プレイ再現ドライバ（本番の到達範囲外） |
| `src/core/data/dailyStart.ts` | 新規（移動） | `resolveDailyStart` の実体。中身は移動前と同一 |
| `src/hooks/startDaily.ts` | 変更 | 上記の再エクスポートのみの互換層に |
| `src/hooks/useGameEngine.ts` | 変更 | `startDailyGame` から `bonusCopies` 引数を削除 |
| `src/components/GameFlow.tsx` | 変更 | Daily開始の2箇所から `loadRewardBonuses` を外す |
| `src/components/setup/DeckBuilderScreen.tsx` | 変更 | Daily時は空Map／不正な保存デッキはおすすめへフォールバック |
| `src/components/setup/DailyChallengeScreen.tsx` | 変更 | 「全員共通の条件」に編成ルールを明記 |
| `src/core/data/rules.ts` | 変更 | `RULES.replay`（formatVersion / maxActions）を追加 |
| `src/core/replay/replay.test.ts` | 新規テスト | Validation 20件 ＋ Tamper 9件（計29） |
| `src/core/replay/determinism.test.ts` | 新規テスト | ライブ vs リプレイ 7件（441試合） |
| `src/core/replay/replayBoundary.test.ts` | 新規テスト | アーキテクチャ境界 7件 |
| `src/hooks/dailyFairness.test.ts` | 新規テスト | Daily公平性・不変項目 19件 |

---

## 2. Daily 公平性修正（Step 1）

### 2-1. 実装した3箇所

Phase 4.0 §13-1 が指した3箇所を実コードで再確認し、**行番号ではなく構造で**特定して直した。

| # | 箇所 | 変更 |
|---|---|---|
| 1 | `useGameEngine.startDailyGame` | **`bonusCopies` 引数そのものを削除**し、`dispatch` にも乗せない |
| 2 | `GameFlow.tsx` のDaily開始2箇所（デッキ確定／もう一度挑戦） | `loadRewardBonuses(godId)` を渡さない（①の型変更により渡せない） |
| 3 | `DeckBuilderScreen.tsx` | `dailyChallenge ? new Map() : loadRewardBonuses(godId)` |

### 2-2. 「undefinedを渡す」ではなく「引数を消した」理由

Phase 4.0 の提案は「第4引数を `undefined` に」だったが、実装では**引数を型から削除**した。
`resolveDailyStart` が `forcedId` を受け取らない設計そのものが「Daily で敵選択を無効化する実装」に
なっているのと同じ考え方で、**渡し忘れ・渡し直しが起きる余地を消す**ほうが強い。
将来 `startDailyGame` の呼び出しが増えても、報酬ボーナスが復活することは型レベルで不可能になる。
通常モード（`startGame`）は `bonusCopies` を受け取り続け、決定43 のメタ進行は無変更。

### 2-3. 追加で必要だった1点（Phase 4.0 の設計に無かった）

`DeckBuilderScreen` は決定27 で「前回この神で使った編成」を初期表示する。
通常モードで報酬ボーナスを使って **1種3枚** のデッキを保存していると、Daily の構築画面に
その不正なデッキが復元され、**プレイヤーが自力で直すまで挑戦を開始できない**。
そこで「Daily では、保存デッキが公平版の編成ルールで不正ならおすすめ構成へフォールバックする」
を追加した。おすすめ構成は全7神とも1種2枚以内で常に合法であることをテストで固定している。

### 2-4. 画面表示

`DailyChallengeScreen` の「全員共通の条件」に次を追記した。

> **編成ルールも全員同じ**で、同じカードは2枚まで（通常モードの報酬ボーナスは使いません）。

枚数は `RULES.deckBuilding.maxCopiesPerCard` から描画しており、数値をUIへ直書きしていない。

### 2-5. テスト（`src/hooks/dailyFairness.test.ts`／19件 PASS）

| 要件 | 検証 | 結果 |
|---|---|---|
| 通常modeではbonusCopies維持 | 報酬取得 → 上限+1／3枚積みデッキで `START_GAME` が通る／盤面に3枚存在する | PASS |
| DailyではbonusCopies無効 | 報酬を持っていても3枚積みDailyは `デッキが不正です` で開始できない（**7神すべて**） | PASS |
| Daily deck builderでも追加copy不可 | `getMaxCopies(id, new Map())` が2のまま。通常側は3のまま | PASS |
| Daily開始時validateDeckと一致 | 画面が不正と判定するデッキは開始も不正／合法と判定するデッキは7神とも開始できる | PASS |
| Daily seed完全不変 | 7連日の `enemyId`・`seed`・`seedId` を実測値で固定（7体が1回ずつ） | PASS |
| 1日3回不変 | `attemptsPerDay=3`／4回目が `ok:false` | PASS |
| JST reset不変 | `14:59:59Z`→当日／`15:00:00Z`→翌日 | PASS |
| saveVersion不変 | `RULES.saveVersion === 9`、開始直後の `state.version === 9` | PASS |
| UI配線ガード | Daily開始2箇所に `loadRewardBonuses` が無い／通常2箇所には在る／`startDailyGame` 実装にも無い | PASS |

> UI配線ガードだけはソース検査（`import.meta.glob` の `?raw`）で行っている。
> このリポジトリには React を描画するテスト基盤（@testing-library 等）が無いため。
> 行番号ではなく「呼び出し式の中身」で照合しているので、前後の編集で位置がずれても壊れない。

---

## 3. Replay Contract（Step 2）

### 3-1. 目標と達成状況

> 「同じDaily開始条件 ＋ action log」から、最終GameState・score・win/loss・round・rngCursor を
> production engine で完全再現できること

**達成**。441試合で GameState が完全一致（§7）。

### 3-2. 設計の中心

```
ReplayInput（日付キー・神・デッキ・操作ログ）
        │
        ├─ resolveDailyStart(dailyKey) ← seed・敵・難易度・補正を**サーバー側で再導出**
        │
        └─ applyAction(null, START_GAME) → applyAction × actions → GameState
                                                                      │
                                                          VerifiedOutcome（score等を計算）
```

- **クライアントの申告値は入力に存在しない。** `score`・`win`・`playerHp`・`rngCursor` は
  `ReplayInput` の型にフィールドが無く、JSONに紛れ込んでも無視される（テストで固定）
- **seed・敵も申告させない。** `dailyKey` から再導出する。`claimedSeed` / `claimedEnemyId` は
  **照合専用**で、食い違えば拒否する。一致しても使うのは再導出値のほう
- **`START_GAME` は操作ログに含めない。** 含められる形にすると、それ自体が
  「seed・敵・補正・bonusCopies をクライアントが宣言する経路」になるため

---

## 4. ReplayInput（Step 3）

```ts
type ReplayInput = {
  version: number            // RULES.replay.formatVersion と一致必須
  mode: 'daily'              // Phase 4.1 は神域挑戦のみ
  dailyKey: string           // JST YYYY-MM-DD。ここから敵・seed・補正が全て決まる
  godId: GodId
  deck: CardDefId[]          // 20枚・1種2枚まで（報酬ボーナス無し）
  otomoGrowthPath?: GrowthPath
  actions: ReplayAction[]
  claimedSeed?: string       // 照合専用（不一致なら拒否）
  claimedEnemyId?: EnemyId   // 照合専用（不一致なら拒否）
}
```

`saveVersion`（現在9）とは**独立した** `formatVersion`（現在1）を持つ。
セーブデータとリプレイは別物であり、片方の構造変更でもう片方の互換性を壊さないため。

出力は `VerifiedOutcome`（`dailyKey` / `enemyId` / `seed` / `seedId` / `godId` / `status` /
`win` / `round` / `score` / `scoreBreakdown` / `playerHp` / `enemyHp` / `rngCursor` / `actionCount`）。
ランキングはこの**計算された値だけ**を保存・比較する。

---

## 5. Action形式（Step 4）

**新しいAction型は作っていない。** 既存の `GameAction` から `START_GAME` を除いただけ：

```ts
type ReplayAction = Exclude<GameAction, { type: 'START_GAME' }>
// = PLAY_CARD{uid} | END_ROUND | USE_DIVINATION{choiceIndex}
```

二重定義にすると「UIが発行するAction」と「リプレイが再生するAction」がいつかずれ、
その瞬間に一致保証が壊れる。card uid（`c0`〜`c19`）はデッキ順から決まるため、
デッキ配列さえ同じなら uid も一致する（`buildDeckInstances`）。

**ログの実測サイズ**（147試合・おすすめデッキ・決定論ドライバ）：

| | 最小 | 平均 | 最大 |
|---|---|---|---|
| action数 | 9 | 22 | **32** |
| JSONバイト数 | 260 | 650 | **1,018** |

CEO想定の「1run 30〜60 actions・1〜2KB」に収まる。上限 `RULES.replay.maxActions = 400`
（約12KB相当）は DoS 対策の門番であって、正当な試合を落とさない余裕を持たせた値。

**UIからの本番 action logging 組込みは Phase 4.2 に残した**（今回はエンジン側の契約のみ）。

---

## 6. Validation（Step 5）— 二重実装しない

「手札に無い」「AP不足」「順序違反」「決着後の操作」は**すべて既存エンジンが既に例外で表明している**。
`runReplay` はそれを再実装せず、`applyAction` を try/catch で包んで `ENGINE_REJECTED` へ翻訳するだけ。
デッキ検証も UI・`createInitialState` と**同じ `validateDeck` を呼ぶ**（判定基準は常に1つ）。

リプレイ固有に持つのは、エンジンが原理的に知り得ない4点だけ：フォーマット版・action数上限・申告値照合・決着到達の要求。

| 拒否理由 | コード | 出所 |
|---|---|---|
| 存在しないcard uid | `ENGINE_REJECTED` | `playCard`（`手札にないカードです`） |
| 手札にないcard使用 | `ENGINE_REJECTED` | 同上 |
| AP不足 | `ENGINE_REJECTED` | `playCard`（`神力が足りません`） |
| 不正なtarget（存在しない託宣） | `ENGINE_REJECTED` | `applyDivination` |
| 不正なaction順（同一ラウンドで託宣2回 等） | `ENGINE_REJECTED` | `applyDivination` |
| 終了後action | `ENGINE_REJECTED` | `endRound` / `playCard`（phase・status判定） |
| god/deck不整合・枚数違反・3枚積み | `DECK` | `validateDeck`（同一実装） |
| 異常に長いaction log | `ACTION_LIMIT` | リプレイ固有（エンジンを1手も動かさない） |
| Daily seed不一致 | `SEED_MISMATCH` | リプレイ固有 |
| enemy不一致 | `ENEMY_MISMATCH` | リプレイ固有 |
| `START_GAME` 混入・未知のtype | `ACTION_TYPE` | リプレイ固有 |
| フォーマット版・mode・日付キー不正 | `FORMAT_VERSION` / `MODE` / `DAILY_KEY` | リプレイ固有 |
| 決着していない | `NOT_FINISHED` | リプレイ固有（既定で必須） |
| 形が壊れている | `MALFORMED` | リプレイ固有 |

`ENGINE_REJECTED` は落ちた操作の位置（`actionIndex`）も返すため、Backend 側でそのまま
メトリクス・ログに使える。**20件すべて PASS。**

---

## 7. Determinism（Step 6）

`playDailyRun`（本番と同じ `PLAY_CARD` / `END_ROUND` / `USE_DIVINATION` を発行する決定論ドライバ）で
実際にプレイし、その操作ログだけを `runReplay` へ渡して突き合わせた。

| 条件 | 規模 |
|---|---|
| 神 | **7柱すべて** |
| 敵 / Daily seed | 7連日（2026-09-07〜13）＝ **7体すべて・7 seed**（週次巡回の1巡） |
| デッキ | おすすめ＋機械生成2種 ＝ **3種／神** |
| 打ち筋 | policySeed 3種（＋託宣あり／なし、OTOMO絆2種の追加ケース） |
| **合計** | **441試合**（7×7×3×3）＋ 追加ケース |

**結果：441試合すべてで GameState が完全一致。**

一致の定義は **GameState全体の構造的同値**（`toEqual`）。JSONのbyte比較にしなかったのは、
「意味は同じでキー順だけ違う」ケースで落ちる脆いテストになるため。GameState は関数・Date・Map を
含まないプレーンなデータなので、構造的同値は実質的に完全一致と等価である。
その上で CEO 指定の主要項目は個別にも明示検証している：

`score`（内訳全項目）／`player.hp`／`enemy.hp`／`round`／`status`（win/loss）／`rngCursor`／
`resonance`／`otomo`／`mastery`／`hand`／`deck`／`discard`、および `VerifiedOutcome` の
`score`（`getFinalScore`）・`win`・`round`・`rngCursor`・`enemyId`・`seed`・`actionCount`。

補助検証：同じ入力を2回リプレイしても完全同一（再実行の再現性）／託宣あり・なしの両方で一致／
OTOMOの絆（guardian・power）を変えても各々一致。

---

## 8. Tamper Tests（Step 7）

判定基準は「**拒否される**か、**改ざん前とは違う正規結果を返す**か」のいずれか。
`expectRejectedOrDifferent` が「受理され、かつ結果が改ざん前と同一」を必ず失敗させる。

| 改ざん | 結果 |
|---|---|
| action削除（中間の1手） | 拒否 または 別結果 |
| action追加（`END_ROUND` を中間へ挿入） | 拒否 または 別結果 |
| 順序変更（全反転） | 拒否 または 別結果 |
| 順序変更（隣接2手の入れ替え） | 拒否 または 別結果 |
| card uid改ざん | **必ず拒否**（`ENGINE_REJECTED`） |
| enemy改ざん | **必ず拒否**（`ENEMY_MISMATCH`） |
| seed改ざん | **必ず拒否**（`SEED_MISMATCH`） |
| 日付キーすり替え | 別の敵・別のseedになり同一結果にならない |
| deck改ざん（他神の専用カード） | **必ず拒否**（`DECK`） |
| deck改ざん（合法だが中身違い） | 別結果 |
| 神のすり替え | 拒否 または 別結果 |
| 過剰action数 | **必ず拒否**（`ACTION_LIMIT`） |
| **score/win/HP/rngCursor の自己申告を混入** | **完全に無視され、正直なリプレイと同一の結果になる** |

削除・追加・順序変更は4神（恵比寿・蒼毘・才華・笑蓮）で実施。**9件すべて PASS。**

**クライアント自己申告scoreを受理する経路は存在しない**：型にフィールドが無いこと（コンパイル時）と、
JSONに混ぜても結果が変わらないこと（実行時）の両方をテストで固定している。

---

## 9. Server利用境界（Step 8）

`src/core/replay/**` は将来 Vercel Node Function からそのまま import できる必要がある。
これを口約束にせず、`replayBoundary.test.ts` が `runReplay` から到達できる
**全ファイル（推移的な依存の閉包）** を機械的に検査する。

| 検査 | 結果 |
|---|---|
| 到達する全ファイルが `src/core` の中にある（hooks・componentsへ逆流しない） | PASS |
| 外部パッケージを一切importしない（react・phaser含む） | PASS（bare import **0件**） |
| `window` / `document` / `localStorage` / `sessionStorage` / `navigator` / `Phaser` / `fetch(` を参照しない | PASS |
| `Math.random` を使わない（不変ルール2） | PASS |
| Neon / Supabase / Firebase / `DATABASE_URL` / `process.env` を参照しない | PASS |
| クロールが空振りしていない（`replay.ts`・`reducer.ts`・`dailyStart.ts` を含み11ファイル以上） | PASS |
| テスト専用の `replayTestUtils.ts` が本番の到達範囲に入っていない | PASS |

検査はコメントを除去してから行う（core は「Math.randomを使わない」等をコメントで多数明記しており、
素のテキスト検索では自己言及に当たるため）。

### 9-1. `resolveDailyStart` を core へ移した理由

リプレイは `resolveDailyStart` を必要とするが、実体は `src/hooks/startDaily.ts` にあった。
core が hooks を参照するのは層の逆流なので、実体を `src/core/data/dailyStart.ts` へ移し、
`src/hooks/startDaily.ts` は**再エクスポートだけの互換層**にした。

- 関数の中身・戻り値・Daily seedの導出方式は**一切変更していない**
- 既存の import パス（UI・`startDaily.test.ts`・**Phase 4.0 監査ハーネス**）は無変更で動く

---

## 10. Regression QA（Step 9）

| 項目 | 結果 |
|---|---|
| `tsc -b`（typecheck） | **PASS** |
| `oxlint` | **PASS**（警告2件は `scripts/phase3-audit/` の既存・本変更と無関係） |
| `npx vitest run`（repo全体） | **227 files / 2,789 tests 全PASS**（新規4ファイル・62テストを追加。既存テストは1件も変更していない） |
| clean build（`rm -rf dist && npm run build`） | **PASS**（2.16s） |
| 通常battle・Daily・save/resume・神格・card bonus・stakes・score・OTOMO・BURST | **PASS**（該当52ファイル／611テストを個別にも再実行） |
| `balanceSim` STAKE-01 タイムアウト（既知の環境要因） | 今回は**再現せずPASS**（タイムアウト値は変更していない） |
| **Phase 4.0 監査ハーネスの回帰** | `parity.audit.ts` **7/7 PASS**。`out/*.json` の md5 は**実行前後で完全一致**＝**再simulationを行っていない** |

### 10-1. バンドルへの影響

| | Phase 4.0時点 | Phase 4.1 |
|---|---|---|
| CSS | `index-CDbAuk7l.css` 96,42x B | **同一ハッシュ `index-CDbAuk7l.css`**（CSS変更ゼロ） |
| JS | 376,179 B / gzip 115.41 kB | 376,42x B / gzip 115.52 kB（**+約240B**） |

**`src/core/replay/**` はバンドルに入っていない**（アプリ側が import していないためtree-shakeされる）。
バンドル内に現れるのは `RULES.replay: {formatVersion:1, maxActions:400}` という数値2つだけで、
差分の実体は Daily 画面の追記テキストとデッキ構築画面の分岐である。

---

## 11. Failure Gate 判定

| NO-GO条件 | 判定 |
|---|---|
| liveとreplayで結果不一致 | **無し**（441試合で完全一致） |
| client scoreを信用する必要がある | **無し**（型・実行時の両方で受け付けない） |
| ReplayがReact/DOM/localStorage依存 | **無し**（境界テストで機械検査） |
| Daily seed方式を変更する必要がある | **無し**（`dailyBossFor` 無変更・実測値で固定） |
| saveVersion変更が必要 | **無し**（9のまま） |
| 通常modeのbonusCopiesを壊す | **無し**（決定43はテストで維持を確認） |
| Daily 3回制限を壊す | **無し** |
| validationを二重実装 | **無し**（エンジン例外の翻訳＋`validateDeck`の共用） |
| Phase 4.0 harnessを壊す | **無し**（parity 7/7・出力ファイル無変更） |
| 寿楽balance変更が混入 | **無し**（`src/core/data/gods.ts`・`cards/`・`src/core/engine/` の差分**0**） |

> ## **PASS ／ Phase 4.2 GO**

---

## 12. Known Risks

1. **本番UIはまだ行動ログを記録していない。** Phase 4.1 は「Replayで必要なAction型とreplay関数」までで、
   `useGameEngine` から実際にログを溜めて提出する配線は Phase 4.2 に残っている。したがって
   「本番プレイで生成されたログが必ずリプレイを通る」ことは、Phase 4.2 の実配線後に再確認が必要。
   現時点で分かっているのは「本番と同じActionを同じ順で流せば必ず一致する」ことまで。
2. **リプレイ対象は Daily のみ。** `mode: 'normal'` は拒否する。通常モードは敵選択・難易度・神階・
   URLバックドア（`?enemy=` / `?seed=` / `?stake=`）を持ち、開始条件をサーバーが再導出できないため、
   同じ契約では検証できない。通常モードのリプレイが必要になったら別設計が要る。
3. **`RULES.replay.maxActions = 400` は理論上限の証明ではない。** 「山札20枚を2巡＋託宣＋END_ROUND」から
   逆算した実務的な余裕値（実測最大32の12倍以上）。AP獲得カードを絡めた極端な長期戦が
   これを超える可能性は理論的には残る。超えた場合は正当な試合が `ACTION_LIMIT` で落ちるため、
   Phase 4.2 で本番ログの実分布を見て再確認する。
4. **決着していないログは受理しない**（既定）。中断・離脱した試合はランキングへ出せない。
   これは意図した仕様だが、UI側で「途中離脱は記録されない」ことを伝える必要がある（Phase 4.2）。
5. **同点密度は未解決**（Phase 4.0 §13-2）。1,000人以上で一意順位を提示すると先着が実質の決定要因になる。
   Production公開前に「同点は同順位・パーセンタイル併記」の実装が必須。本Phaseでは扱っていない。
6. **寿楽の G1 FAIL は未対応**（Phase 4.0 §13-3）。CEO指示どおり別Balance Patchとしてbacklogに残す。
7. **`useGameEngine.ts` の `setStakeResult(null)` 重複とインデント崩れ**（Phase 4.0 §13-4）は
   今回も修正していない（挙動に影響なし・cleanup backlog 継続）。
8. **UI配線ガードはソース文字列の検査**である。React描画テスト基盤が無いための代替手段であり、
   呼び出しの形を大きく変えるリファクタリングでは、テスト側も追随して直す必要がある。

---

## 13. Phase 4.2 への引き継ぎ

| やること | 依存 |
|---|---|
| `useGameEngine` で行動ログを記録し、決着時に `ReplayInput` を組み立てる | 本Phaseの `ReplayAction` をそのまま使う |
| 本番ログを `runReplay` に通す統合テスト（実プレイ由来のログで一致確認） | Known Risk 1 の解消 |
| `maxActions` の実分布による再確認 | Known Risk 3 の解消 |
| ランキングBackend（Neon / API）— **CEO判断事項**（CLAUDE.md §6-3 #6・#7） | 本Phaseの `VerifiedOutcome` を保存対象にする |
| 同点を同順位として表示する（Production公開前の必須要件） | Phase 4.0 §13-2 |

**実行**：`npx vitest run src/core/replay src/hooks/dailyFairness.test.ts`（`npm test` にも含まれる）
