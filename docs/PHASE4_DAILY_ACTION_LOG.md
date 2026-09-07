# Phase 4.2 — Production Action Log Integration

- **日付**：2026-09-07
- **branch**：`feat/daily-ranking-phase4`（Phase 4.1 `4aed4ca` の上に積む独立commit。merge・push・deploy いずれも未実施）
- **区分**：AI判断（CLAUDE.md §6-2）。CEOは Phase 4.1 PASS ／ Phase 4.2 GO を承認済み
- **基準**：Phase 4.1 Replay Foundation（決定132 / `docs/PHASE4_DAILY_REPLAY_FOUNDATION.md`）
- **目的**：「実際のDailyプレイで発生した操作を記録し、そのログを Phase 4.1 Replay へ渡すと実プレイ結果を完全再現できる」状態にする
- **やっていないこと**：Neon・DB・Vercel Functions・Ranking API・ランキングUI・anonymous account・display name・Production deploy・寿楽balance変更・score式変更・Daily seed変更・3回制限変更・JST reset変更・saveVersion変更

---

## 1. 成果物

| ファイル | 区分 | 内容 |
|---|---|---|
| `src/core/replay/runLog.ts` | 新規 | `DailyRunLog` と **`applyAndRecord`（本番の唯一の記録経路）** |
| `src/core/replay/resume.ts` | 新規 | `resumeRunLog`（中断・再開の突き合わせ）／`deepEqual` |
| `src/core/replay/ranking.ts` | 新規 | `assignRanks`（同点＝同順位の規則。Phase 4.3/4.4が使う） |
| `src/core/replay/index.ts` | 変更 | 上記の公開 |
| `src/hooks/clientRunId.ts` | 新規 | `createClientRunId`（ブラウザ標準cryptoのみ） |
| `src/hooks/dailyRunLogStorage.ts` | 新規 | 進行中runのログ永続化（`sevengods.dailyRunLog`） |
| `src/hooks/pendingRunStorage.ts` | 新規 | 送信待ちrunの控え（`sevengods.pendingRuns`） |
| `src/hooks/useGameEngine.ts` | 変更 | 記録経路の配線（dispatch・commit・resume・start） |
| `src/core/data/rules.ts` | 変更 | `RULES.replay.pendingRuns` 追加のみ |
| `src/core/replay/replayTestUtils.ts` | 変更 | 本番記録経路を通す `playRecordedDailyRun` を追加 |
| `src/core/replay/actionLog.test.ts` | 新規テスト | Live→Replay統合・Accepted Only・Privacy（12件） |
| `src/core/replay/actionDistribution.test.ts` | 新規テスト | action数／payload分布（5件） |
| `src/core/replay/resume.test.ts` | 新規テスト | 中断・再開（10件） |
| `src/core/replay/ranking.test.ts` | 新規テスト | 同点＝同順位（8件） |
| `src/hooks/dailyRunStorage.test.ts` | 新規テスト | clientRunId・永続化・送信待ち・UI配線ガード（26件） |

---

## 2. Logging architecture（Step 1・2）

### 2-1. 記録するのは「エンジンが受理したAction」

`useGameEngine.dispatch` は `applyAction` を try/catch で包み、例外が出た操作は state を
更新しない（＝無かったことになる）。記録もこの境界と**完全に一致**していなければならない。
そこで適用と記録を1つの純粋関数に閉じ込めた。

```ts
// src/core/replay/runLog.ts
export function applyAndRecord(state, action, log, clientRunId?): { result, log }
```

- 例外が出れば **この関数も同じ例外を投げる** → 呼び出し側は log を差し替えない → 記録は増えない
- `START_GAME` は記録に含めない（Phase 4.1の契約。代わりにDailyなら新しい記録を作る）
- 通常モードは常に `log: null`（記録しない）
- `log` が無い状態でDailyの操作が来ても**記録を作らない**（途中から始めると先頭が欠けたログになり、リプレイが必ず失敗するため）

UI側でログを組み立てる余地が無いので、「画面には出たがエンジンに届かなかった操作」も
「届いたのに記録されなかった操作」も構造的に発生しない。

### 2-2. 記録はcommitと同時に進める

`dispatch` の中で記録を進めてはいけない。`END_ROUND` は演出のため **700ms 遅らせて commit** される
（`ENEMY_TURN_REVEAL_MS`）。dispatch時点で記録を進めると、その700msの間にブラウザを閉じたとき
「ログだけ1手先」の状態で保存され、再開時に必ず食い違う。

```
dispatch  : applyAndRecord() → 結果と次のログを計算するだけ
commit    : setState(state) と runLogRef=log と saveBattle/saveRunLog を同時に行う
```

これで **永続化されるログと永続化される盤面は常に同じ地点を指す**。

### 2-3. 二重記録が起きないこと

| 経路 | なぜ二重にならないか |
|---|---|
| React の re-render | ログは `useRef` に持つ。レンダリングでは触らない |
| StrictMode の二重実行 | 対象はレンダリングと state updater。`applyAndRecord` はイベントハンドラから呼ばれる純粋関数で、どちらでもない |
| 二度押し（同じカード） | 2回目はエンジンが `手札にないカードです` で拒否 → 記録されない |
| 敵ターン中の操作 | `isPlayerTurn` が false でボタンが無効。仮に届いてもエンジンが拒否 |
| `appendAction` の副作用 | 新しい配列を返すだけで元のログを変更しない（同じ入力で2回呼んでも結果は同じ） |

テストで固定：誤操作（手札に無いカード・存在しない託宣）を各ラウンドに混ぜたrunと、
混ぜないrunで **行動ログもGameStateも完全に一致する**ことを7神で確認（`actionLog.test.ts`）。

---

## 3. clientRunId（Step 3）

```ts
createClientRunId()  // crypto.randomUUID() → 無ければ crypto.getRandomValues の16進32桁
```

| 要件 | 満たし方 |
|---|---|
| runごとに一意 | 暗号論的乱数のみ。200件生成して重複ゼロをテスト |
| retryしても同じID | run開始時に**1度だけ**発行し、行動ログと一緒に永続化する。中断・再開しても、将来の再送でも同じIDのまま |
| 二重submit防止に使える | サーバーはこのIDで冪等に扱える。控えも同じIDなら**追加ではなく置換** |
| 個人情報を含めない | 乱数のみ。端末・ブラウザ・アカウント情報を混ぜない |
| seedやscoreから生成しない | Daily seedは全員共通なので導出すると衝突・推測可能になる。スコア由来だと「retryで同じID」を満たせない |
| 独自UUID実装を避ける | `crypto.randomUUID()` が第一。secure context以外では同じ`crypto`の標準乱数を16進表記するだけ |

どちらも使えない環境では**例外を投げる**。推測可能なIDを黙って発行するより、
「そのrunは提出対象にできない」と分かる方が安全なため（`startDailyGame` は catch して
記録なしで進行し、ゲーム自体は普通に遊べる）。

---

## 4. ReplayInput assembly（Step 4）

```
DailyRunLog { version, clientRunId, dailyKey, godId, deck, otomoGrowthPath, actions }
                        │  toReplayInput() は clientRunId を落とすだけ
                        ▼
ReplayInput { version, mode:'daily', dailyKey, godId, deck, otomoGrowthPath, actions }
```

`DailyRunLog` を「`ReplayInput` に `clientRunId` を足しただけ」の形にしてあるのは、
2つの構造がずれていく余地を残さないため。

**client側のscoreをpayloadの真実として扱わない**：`score`・`win`・`status`・`playerHp`・
`enemyHp`・`round`・`rngCursor`・`seed` は `DailyRunLog` にも `ReplayInput` にも
**フィールドが存在しない**。したがって「検証用truthとして追加する」ことが構造的にできない。
テストで `Object.keys(input)` が上記7項目ちょうどであることを固定している。

将来サーバーへ送るpayloadは `{ clientRunId, input: ReplayInput }` の2つだけ。

---

## 5. Live → Replay 統合結果（Step 5・最重要Gate）

検証は**本番の記録経路を通したログ**で行う。`playRecordedDailyRun` は
`useGameEngine.dispatch` と同じ形（`applyAndRecord` を try/catch で包み、例外時は
state も log も進めない）で呼ぶため、テスト用に組み立てたログではない。

| 条件 | 規模 |
|---|---|
| 神 | **7柱すべて** |
| 敵 / Daily seed | 7連日（2026-09-07〜13）＝**7体すべて・7 seed**（週次巡回1巡） |
| デッキ | おすすめ＋機械生成2種 ＝ **3種／神** |
| 打ち筋 | policySeed 3種 |
| **合計** | **441 run** ＋ 託宣あり/なし14run ＋ OTOMO絆2種14run ＋ 誤操作混入7run |

> ### 結果：**全runで GameState が構造的に完全一致。不一致 0件。**

比較した項目（Phase 4.1と同じ基準）：GameState全体（`toEqual`）に加えて
`score`（内訳全項目）・`player.hp`・`enemy.hp`・`round`・`status`・`rngCursor`・
`resonance`・`otomo`・`mastery`・`deck`・`hand`・`discard`、および
`VerifiedOutcome` の `score`（`getFinalScore`）・`win`・`rngCursor`・`actionCount`。

---

## 6. Action数 / payload byte 分布（Step 6）

本番記録経路を通した **1,470 run**（7神 × 7 Daily seed × 3デッキ × 10打ち筋、全run決着）の実測。

| | min | median | P90 | P95 | P99 | max |
|---|---|---|---|---|---|---|
| **actions / run** | 7 | 24 | 26 | 27 | 30 | **34** |
| **payload bytes**（`ReplayInput` 全体のJSON） | 790 | 1,257 | 1,412 | 1,443 | 1,541 | **1,695** |

payload はデッキ20枚のID配列が支配的で、行動ログ自体は数百バイト。
CEO想定の「1run 30〜60 actions・1〜2KB」の範囲に収まっている
（action数が想定下限寄りなのは、検証用の打ち筋がときどき早めに手を止めるため。
上振れ側＝上限の判定には影響しない）。

### maxActions 判定

> **`RULES.replay.maxActions = 400` を維持する。**

- 実測 max **34** に対して **約11.8倍**の余裕。P99（30）に対しては **13.3倍**
- 理論上限の見積り（山札20枚を2巡＋託宣＋END_ROUND ≒ 336）も下回る
- 下げれば正当な長期戦を落とすリスクが増え、上げればDoS対策としての意味が薄れる
- **理由なく変更しない**という指示どおり、変更しない

実測値はテストで固定してあり（`actionDistribution.test.ts`）、エンジンか打ち筋が変われば
テストが落ちてdocsの更新が必要だと分かる。

---

## 7. 中断・再開（Step 7）

### 7-1. 監査結果：Daily は途中save/resume できる

`battleSaveStorage` は `status === 'playing'` の GameState を無条件で保存し、
`isExpiredDailySave` が日付跨ぎだけを弾く。つまり **Daily は同じ日のうちなら中断・再開できる**。
したがって「resume前までのactionsを失う」設計は禁止事項に該当し、対応が必須だった。

### 7-2. 実装：ログを別枠で永続化し、再開時にリプレイで突き合わせる

```
毎アクション: commit() → saveBattle(state) と saveRunLog(log) を同時に
再開時      : resumeRunLog(savedState, loadRunLog())
                ├─ 日付・神・OTOMOの絆が一致するか
                ├─ ログを runReplay({requireFinished:false}) にかける
                └─ 得られた盤面が savedState と構造的に一致するか
```

**突き合わせにリプレイそのものを使う**のが要点。「同じログから同じ盤面が出る」ことは
リプレイ検証と同じ問いなので、専用の整合チェックを別に書く必要がない（Phase 4.1の資産を再利用）。

一致しなければログを捨てる（`ok:false`）。ログと盤面がずれたまま追記を続けると、決着時に
「本人は正しく遊んだのにリプレイが通らない」提出物ができてしまい、原因の切り分けもできなくなる。
捨てた場合も**ゲームの続行は妨げない**——そのrunが提出対象外になるだけで、
`dailyRunLogAvailable: false` として hook から見える（Phase 4.3/4.4のUI告知に使う）。

### 7-3. テスト結果（`resume.test.ts`／10件 PASS）

| 検証 | 結果 |
|---|---|
| 7神すべてで、途中保存した盤面とログ（JSON往復後）から引き継げる | PASS |
| 引き継いだ後に続きを記録し、決着まで進めても**通しでリプレイが一致**する | PASS |
| 中断前のactionsが残っている（先頭が欠けない）・`clientRunId`が変わらない | PASS |
| ログ欠落・余分なaction・再生不能なログは `state-mismatch` で捨てる | PASS |
| 日付・神・OTOMOの絆が食い違うログは `key-mismatch` で捨てる | PASS |
| 通常モードのセーブでは引き継がない（`not-daily`） | PASS |
| **完走ログの任意の中断点**（1手目〜最終手前）すべてで引き継げる | PASS |

保存層のテスト（`dailyRunStorage.test.ts`）では、版違い・壊れたJSON・形式違反・
action数超過を読み込まないこと、localStorageが使えなくても例外を投げないことも固定している。

---

## 8. 送信待ちrun（Step 8）

`sevengods.pendingRuns`（専用バージョン `PENDING_RUNS_VERSION = 1`。`RULES.saveVersion` とは分離）。

```ts
type PendingRun = { clientRunId, dailyKey, attempts, createdAt, input: ReplayInput }
```

| 要件 | 実装 |
|---|---|
| 未送信runを失わない | 決着時に `commit` から必ず1件 `enqueuePendingRun` |
| retryで同じclientRunId | run開始時のIDをそのまま保持。再送で振り直さない |
| 重複を増やさない | 同じ `clientRunId` は追加ではなく**置換** |
| 上限を設ける | `RULES.replay.pendingRuns.maxRuns = 20`。超えたら古い順に捨てる |
| 古いrunを無限保存しない | `retentionDays = 7`。日付キーで剪定 |
| 既存localStorage設計と整合 | 専用キー・専用バージョン・try/catch・形式検査（`dailyStorage` 等と同じ作法） |

**Phase 4.2 ではネットワークに一切触れない。** `fetch` を呼ばないことをテストで固定している
（`useGameEngine` のソース検査でも `fetch(` / `XMLHttpRequest` / `sendBeacon` / `WebSocket` の
不在を機械検査）。

---

## 9. 未完走run（Step 7・仕様）

| 状態 | 扱い |
|---|---|
| 決着した（won / lost / finished） | `pendingRuns` へ控える＝将来の提出対象 |
| 途中離脱（`status === 'playing'` のまま） | **提出対象外**。`pendingRuns` へ入る経路が無い |
| 同上 | Replay validation の対象外（`runReplay` は既定で `NOT_FINISHED` を拒否） |
| 同上 | ranking score なし |
| **ゲーム本体の save/resume** | **従来どおり維持**（決定29は無変更）。続きから遊べる |

未完走runは `commit` の決着分岐を通らないため、そもそも控えに入らない。
「途中離脱は記録されない」ことのプレイヤーへの告知は Phase 4.3/4.4 のUI課題として残す。

---

## 10. Privacy / Payload（Step 9）

payload に含まれるのは**ゲーム検証に必要な情報だけ**：

- `version` / `mode` / `dailyKey` / `godId` / `deck` / `otomoGrowthPath` / `actions`
- 添えるのは `clientRunId`（乱数のみ）だけ

含まれないもの：email・IP・browser fingerprint・device情報・名前・cookie・
timezone・userAgent・他のlocalStorageの内容。**行動ログの1件1件も**、
`PLAY_CARD{type,uid}` / `END_ROUND{type}` / `USE_DIVINATION{type,choiceIndex}` の
キーちょうどしか持たない（**タイムスタンプも持たない**——提出時刻は順位を決めないので、
ログに残す理由が無い）。

これらはテストで機械的に固定している（`actionLog.test.ts` の Privacy 3件、
`dailyRunStorage.test.ts` の控えpayload検査）。

---

## 11. Security boundary（Step 10）

> **Phase 4.2 終了時点でも「client log = 信頼できる」とは扱わない。**

クライアントがするのは `ReplayInput` を組み立てて控えることだけ。
正規の結果は Phase 4.3 のサーバー側が算出する：

```
dailyKey  ─→ resolveDailyStart() で seed / 敵 / 難易度 / 補正を再導出
          ─→ production engine で actions を再生
          ─→ VerifiedOutcome（score・win・HP・rngCursor）を算出
```

クライアントが計算した値は payload に存在しないので、サーバーが誤って信用する経路も無い。
`src/core/replay` が React・DOM・localStorage・外部パッケージへ依存しないことは
`replayBoundary.test.ts` が推移的依存の閉包を走査して機械検査しており、
Phase 4.2 で追加した `runLog.ts` / `resume.ts` / `ranking.ts` もその検査対象に入っている。

**注意**：`resumeRunLog` はクライアント側でも `runReplay` を呼ぶ。これは
「再開時にログと盤面が合っているか」を自分で確かめるためのもので、**結果の権威ではない**。
サーバーは提出された `ReplayInput` を自分で再生し直す。

---

## 12. Tie ranking rule（Step 11）

Phase 4.0（決定131 §6）で、Daily は決定論パズルゆえ到達しうるスコアの種類数が
参加人数に依存せず **137前後で頭打ち**になり、1,000人で1順位あたり3.11人、
3,000人で8.71人が同点になると実測した。二次tie-break（撃破R・残HP・操作回数）は
撃破R＝tempo・残HP＝survival として既にスコア式へ織り込まれているため解消率1〜12%で無力。

> ## 正式な規則（Phase 4.3 Backend / Phase 4.4 UI の要件として固定）
>
> 1. **同じスコアは同順位**（`1, 1, 3` 方式＝competition ranking）
> 2. **同順位の人数を併記する**（`12位（同点9人）`）
> 3. **パーセンタイルを併記する**（`上位 3%`）。参加者が増えるほど順位より意味を持つ
> 4. **提出時刻（先着）は順位を決めない。** 同順位内の表示順にしか使わない
> 5. 「次の順位まであと○点」は**次の異なるスコア**までの差分

規則をコメントだけに置くと実装のたびに解釈がぶれるため、**実行できる純粋関数**として固定した：

```ts
// src/core/replay/ranking.ts
assignRanks(entries) → { entry, score, rank, tiedCount, topPercent, pointsToNextRank }[]
```

これはランキングUIでもBackendでもなく、順位の定義だけを持つ関数である（今回UIは実装していない）。
テストで `1,1,3` 方式・同点人数・パーセンタイル・「あと○点」・**提出順が順位を変えないこと**・
決定131が測った1,000人／137種の規模でも規則が崩れないことを固定している。

---

## 13. Regression QA（Step 12）

| 項目 | 結果 |
|---|---|
| `tsc -b` | **PASS** |
| `oxlint` | **PASS**（警告2件は `scripts/phase3-audit/` の既存・無関係） |
| `npx vitest run`（repo全体） | **232 files / 2,850 tests 全PASS**（Phase 4.1は 227 / 2,789。**+5ファイル・+61テスト**、既存テストは1件も変更していない） |
| clean build | **PASS**（1.90s） |
| 通常battle・Daily・Daily 3回・JST reset・save/resume・bonusCopies・Phase 3神格・card bonus・stakes・score・OTOMO・BURST | **PASS**（該当46ファイル／542テストを個別にも再実行） |
| **Phase 4.0 harness** | `parity.audit.ts` **7/7 PASS**、`out/*.json` の md5 は実行前後で**完全一致**＝再simulationなし |
| **Phase 4.1 Replay** | `src/core/replay` 全テスト PASS（Determinism 441試合・Tamper・境界検査を含む） |
| `balanceSim` STAKE-01 タイムアウト | 再現せず PASS（値は未変更） |

### バンドルへの影響

| | Phase 4.1 | Phase 4.2 |
|---|---|---|
| CSS | `index-CDbAuk7l.css` | **同一ハッシュ（CSS変更ゼロ）** |
| JS | 376,42x B | 383,480 B（**+約7.0 kB**、gzip 115.52→117.62 kB） |

Phase 4.1 では `src/core/replay` はアプリから未importでtree-shakeされていたが、
Phase 4.2 で `useGameEngine` が実際に使うため入る。増分の中身は `runLog` / `resume`
（＋`resumeRunLog` が呼ぶ `replay.ts`）／2つのstorage／`clientRunId`。
`assignRanks` は Phase 4.3/4.4 まで未使用のため**tree-shakeされてバンドルに入っていない**
（`pointsToNextRank` の出現数 0 で確認）。

---

## 14. production code 影響

| 対象 | 判定 |
|---|---|
| `src/core/engine/` | **差分ゼロ** |
| `src/core/data/gods.ts` / `cards/` / `enemies.ts` / `stakes.ts` / `decks.ts` / `deckBuilder.ts` / `dailyBoss.ts` / `dailyStart.ts` | **差分ゼロ**（寿楽balance変更の混入なし） |
| `src/core/types/` | **差分ゼロ** |
| `src/core/data/rules.ts` | `RULES.replay.pendingRuns` **追加のみ**（既存の数値は1つも変更なし） |
| `src/hooks/useGameEngine.ts` | 記録経路の配線のみ。**ゲームの判定・順序・タイミングは無変更** |
| Daily seed / 3回制限 / JST reset / score式 / saveVersion(9) | **無変更**（テストで固定） |
| 通常モード | 記録しないだけ。`bonusCopies`（決定43）も従来どおり |
| Backend / DB / Ranking API / Neon / Vercel Functions / 送信処理 | **作成ゼロ**（`fetch` 等の不在を機械検査） |

---

## 15. Failure Gate 判定

| NO-GO条件 | 判定 |
|---|---|
| 実プレイlogとReplayが一致しない | **無し**（441run＋追加ケースで完全一致・不一致0件） |
| Action二重記録 | **無し**（ref保持・純粋関数・エンジン拒否の3重で担保。誤操作混入runでも一致） |
| resumeでlog消失 | **無し**（別枠で永続化し、任意の中断点で引き継げることを確認） |
| 通常modeへ不要な影響 | **無し**（記録しないだけ。既存テストは1件も変更していない） |
| saveVersion変更が必要 | **無し**（9のまま。ログ・控えは独立バージョン） |
| client scoreを信頼する構造 | **無し**（payloadに結果フィールドが存在しない） |
| payloadに個人情報 | **無し**（機械検査） |
| maxActionsが実分布に不足 | **無し**（実測max 34 に対し400＝約11.8倍の余裕） |
| Daily seed / 3回 / JST reset 変更 | **無し** |
| 寿楽balance変更混入 | **無し**（`gods.ts`・`cards/`・`engine/` 差分0） |
| Phase 4.0 / 4.1 regression | **無し**（harness parity 7/7・出力md5一致／Replay全テストPASS） |

> ## **PASS ／ Phase 4.3 Backend GO**

---

## 16. Known Risks

1. **UI配線の検証はソース検査**である。このリポジトリにはReactを描画するテスト基盤
   （@testing-library / jsdom）が無く、`useGameEngine` 自体をレンダリングして
   検証できていない。記録の中身は本番と同じ `applyAndRecord` を通して441runで
   検証済みだが、「Reactの状態遷移そのもの」は構文検査で固定しているにとどまる。
   **実機でのDailyプレイ→提出待ちrun生成の目視確認は未実施**（Phase 4.3で本番QAが必要）。
2. **`dailyRunLogAvailable` を表示に使っていない。** 記録できていないrun
   （乱数が使えない環境・再開でログを引き継げなかった場合）をプレイヤーへ伝えるUIは
   Phase 4.3/4.4 の課題。現状は静かに提出対象外になる。
3. **途中離脱が記録されないことの告知が無い。** 仕様としては正しいが、
   プレイヤーには「離脱すると順位に載らない」ことを伝える必要がある（Phase 4.3/4.4）。
4. **localStorageが使えない環境では記録が残らない。** 例外は握りつぶしてゲームは
   続行できるが、そのrunは提出できない。プライベートブラウジング等で起こりうる。
5. **`pendingRuns` は同じ日に3回挑戦すれば3件溜まる。** どれを提出するか
   （ベストのみか全件か）は Phase 4.3 のBackend仕様として未決定。上限20件・7日で
   溢れることは無い規模だが、方針は決める必要がある。
6. **`maxActions = 400` は実測（max 34）から見て余裕が大きい。** DoS対策としては
   400 action ≒ 12KB程度で十分小さく問題にならないが、本番の実ログが集まった段階で
   下げる余地はある（今回は「理由なく変更しない」に従い据え置き）。
7. **バンドルが約7.0 kB増えた**（gzip +2.1 kB）。`resumeRunLog` がクライアント側でも
   `runReplay` を呼ぶため。機能上必要な増分だが、初回ロードへの影響は小さいとはいえゼロではない。
8. **同点密度は依然として未解決**（決定131 §13-2）。規則は本Phaseで固定したが、
   実装（Backend/UI）は Phase 4.3/4.4。**Production公開前の必須要件**として残る。
9. **寿楽の G1 FAIL は未対応**（決定131 §13-3）。指示どおり別Balance Patchとしてbacklog。
10. **`useGameEngine.ts` の `setStakeResult(null)` 重複**（決定131 §13-4）は今回も未修正。

---

## 17. Phase 4.3 への引き継ぎ

| やること | 依存 |
|---|---|
| Ranking Backend（Neon / Vercel Functions / API）— **CEO判断事項**（§6-3 #6・#7） | `runReplay` と `VerifiedOutcome` |
| 提出処理（`pendingRuns` を送り、成功したら `removePendingRun`） | 本Phaseの控え構造 |
| 1日3回のうちどのrunを提出するかの方針決定 | Known Risk 5 |
| 同点＝同順位・パーセンタイル併記の実装 | `assignRanks`（本Phaseで固定） |
| 記録できないrun・途中離脱の告知UI | `dailyRunLogAvailable` |
| anonymous player ID / display name — **CEO判断事項**（§6-3 #7） | 未着手 |

**実行**：`npx vitest run src/core/replay src/hooks`（`npm test` にも含まれる）
