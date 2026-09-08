# Phase 4.6 — PSF Production Implementation（本番コードへの最小実装）

- **日付**：2026-09-08
- **branch**：`feat/daily-ranking-phase4`（Phase 4.5 `2b67d0b` の上に積む。merge・push・deploy・Vercel変更・Production API有効化・**Neon本番schema変更** いずれも未実施）
- **区分**：AI判断（CLAUDE.md §6-2）。CEO指示「KAGURA / Phase 4.6」に基づき、**決定139／Phase 4.5 §8〜§14 を実装仕様として**本番コードへ落とす
- **前提**：Phase 4.4 Final PASS（決定138）／Phase 4.5 設計 CONDITIONAL GO（決定139）
- **Production Release は引き続き NO-GO**

---

## 1. 実装ファイル

### 新規

| file | 役割 |
|---|---|
| `src/core/identity.ts` | 匿名identityの導出（`playerId = SHA-256(playerSecret)[0:32]`）。**クライアントとサーバーの共有実装** |
| `src/core/replay/gameVersion.ts` | `gameVersion = <engineVersion>.<dataFingerprint>`。FNV-1a・純TS・外部依存0 |
| `src/core/replay/gameVersion.test.ts` | golden replay test（engineVersion 上げ忘れの検出） |
| `src/server/ranking/ticket.ts` | run ticket の型・状態機械・期限計算 |
| `src/server/ranking/start.ts` | `POST /ranking/start` 相当（枠の予約） |
| `src/server/ranking/identity.ts` | 照合（実装は core から借りるだけ） |
| `src/server/ranking/ticket.test.ts` | 状態機械を**本番コード**に対して検証（S1〜S9） |
| `src/server/ranking/identity.test.ts` | PSF-1（偽装・griefing・sybil残余） |
| `src/server/ranking/rankingTestUtils.ts` | テスト用 identity／runId／ticket発行（本番からは参照されない） |
| `src/hooks/rankingTicketStorage.ts` | ticketの控え。時計ずれ補正つき |
| `src/hooks/dailySessionStart.ts` | 開始の段取り（枠の予約→控え→START_GAME）とUI文言 |
| `src/hooks/rankingTicket.test.ts` | 控えと段取りの検証 |

### 変更

| file | 変更点 |
|---|---|
| `src/core/data/rules.ts` | `ranking` に `ticketTtlMinutes` 90／`dayEndGraceMinutes` 15／`maxBodyBytes` 65536／`leaderboardCacheSeconds` 15／`pruneEveryStarts` 16／`playerSecretLength` 64／`engineVersion` 1 を追加。**既存の値は無変更**（`saveVersion` 9 のまま） |
| `src/server/ranking/types.ts` | `SubmitRequest.playerSecret`、`RankingRun.attemptNo`／`.gameVersion`、拒否コード4種を追加。`STALE_DAILY_KEY` を廃止 |
| `src/server/ranking/store.ts` | ticket操作・`lockDayVersion`・`pruneBefore` を追加。メモリ実装も同じ意味論で更新 |
| `src/server/ranking/schema.ts` | `daily_days`・`daily_tickets`（部分UNIQUE）を追加、`daily_runs` に `game_version` とticketへのFKを追加 |
| `src/server/ranking/postgresStore.ts` | 上記の実装。制約名でエラーを判別。数え直しループを廃止 |
| `src/server/ranking/submit.ts` | 秘密照合とticket必須化。書き込み前検査の順序を固定 |
| `src/server/ranking/leaderboard.ts` | store単位の短期キャッシュ（`now` を渡したときだけ） |
| `src/server/ranking/http.ts` | `/ranking/start` 追加、body上限、`Cache-Control` |
| `src/hooks/anonymousPlayerId.ts` | 秘密ベースへ移行。旧 `sevengods.playerId` は破棄 |
| `src/hooks/rankingClient.ts` | `startRankedRun` 追加。提出に秘密を同梱。**開始前に送り残しをflush** |
| `src/hooks/useGameEngine.ts` | `DailyRunSession` を受け取り、`dailyRanked` を公開。再開時にticketから復元 |
| `src/components/GameFlow.tsx` | Daily開始を `beginDailyChallenge` に集約（予約→START_GAME）。二重クリックをrefで遮断 |
| `src/components/setup/DailyChallengeScreen.tsx` | 開始前の注意文と、ランキング対象外の案内 |
| `src/components/battle/GameOverOverlay.tsx` / `BattleScreen.tsx` | 結果画面に「ランキングに記録されません」を明示 |
| `src/server/ranking/secrets.test.ts` | `playerSecret` のログ・保存・URL・DB列の検査を追加 |

---

## 2. Identity 実装（PSF-1）

- 端末は **256bit の `playerSecret`**（`sevengods.playerSecret`）を持つ。公開IDは `SHA-256(secret)` の先頭32桁で、長さ・文字種は Phase 4.3 の `playerId` と互換
- 導出は `src/core/identity.ts` の**1実装だけ**。サーバーは `deps.ts` 経由で同じ関数を借りる（二重実装によるズレを構造的に排除）
- サーバーは秘密を**保存しない**。DBに列が無く、応答にもログにも出さない
- 照合は定数時間比較。形式不正ならハッシュ計算もしない
- **移行**：旧 `sevengods.playerId` は引き継がず破棄して新しい秘密を発行する。旧IDは公開値と同一で秘密として使えず（それが直した欠陥そのもの）、送信は kill switch で止まったままなのでサーバー側に旧IDのデータは1件も無い。引き継ぐ資産が無く、公開値と同じ資格情報を残す方が危険

---

## 3. Ticket state machine

`src/server/ranking/ticket.ts` に実装。状態は5つで、`closed_reason` と「runの有無」と時刻から導く（状態を列として持たない）。

| 状態 | 定義 | 枠 |
|---|---|---|
| open | `closedReason` なし・run無し・期限内 | 消費 |
| submitted | runが存在 | 消費 |
| expired | 期限切れ・run無し | 消費 |
| abandoned | 別の挑戦を開始したので放棄 | 消費 |
| voided | deploy跨ぎで無効化 | **返還** |

不変条件（すべてテストで固定）：

1. identity・dailyKey につき **open ≤ 1**
2. 非voided ticket ≤ `attemptsPerDay`（DBの CHECK＋部分UNIQUE）
3. run は必ず ticket を持つ（DBのFK）
4. 同じ `clientRunId` の start は冪等
5. 拒否時はDBへ書かない
6. voided だけが番号を返還する（部分UNIQUEが `voided` を除外）

---

## 4. Start 実装

`startRun(request, deps)`：身元 → dailyKey（**サーバー時刻**） → day-lock → 冪等（同ID） → 残枠 → 進行中の放棄 → 発行 → 剪定（1/16）。

- 枠が残っていないときは **open ticket を放棄しない**（最後の1回を再開できる）
- 並列startで番号が衝突したら**再採番せず**、生きているticketを読み直して返す
- 応答：`dailyKey / attemptNo / attemptsUsed / attemptsPerDay / issuedAt / expiresAt / gameVersion / state / reused / abandoned / serverNow`
- HTTP：新規201／再取得200／`BAD_IDENTITY` 400／`ATTEMPTS_EXCEEDED` 409／`RULES_VERSION_LOCKED` 423／`RETRY` 503／kill switch 503／body超過 413
- **`api/` は作っていない**（Vercelが自動公開するため。Production exposure禁止）

---

## 5. Submit 改修

順序を固定し、**高コスト処理とDB書き込みは身元とticketを確かめた後にしか起きない**：

1. 身元（読み書き0） → 2. ticket（読み取り1・書き込み0） → 3. 冪等 → 4. closed/expired → 5. 版（不一致は void＝返還） → 6. レート制限（**ここで初めて書く**） → 7. リプレイ検証 → 8. 保存

- `playerSecret` 必須。`playerId` だけでは他人になりすませない
- client申告scoreは従来どおり受け取らない（型に無い）
- `attempt_no` は ticket が決めた番号を写す（提出順では決まらない）
- 新コード：`NO_TICKET` 404／`TICKET_CLOSED` 409／`TICKET_EXPIRED` 410／`RULES_VERSION_MISMATCH` 409（`refunded`）
- `STALE_DAILY_KEY` は廃止。別日を名乗ればticketが見つからず `NO_TICKET` になる（端末時計を判定に使わない）
- 再送は冪等。**受理済みなら期限後の再送も duplicate として受け取れる**

---

## 6. gameVersion / day-lock（PSF-3）

`gameVersion = "<engineVersion>.<dataFingerprint>"`

- `dataFingerprint`：`RULES`（`ranking` と `replay.pendingRuns` を除く）＋ カード＋敵＋神＋OTOMO を安定化JSONにして FNV-1a（2初期値・16進16桁）。**データが1つでも変われば必ず変わる**
- `engineVersion`：手動整数。reducer・スコア・RNGの挙動変更はデータに現れないため
- **golden replay test** が「固定リプレイの結果が変わったのに `gameVersion` が変わっていない」状態を落とす＝上げ忘れを機械的に検出する
- day-lock：その日の最初のticketが版を固定（`daily_days`）。以後その日に別の版の**新規開始**を許さない
- 進行中のrunが版を跨いだ場合は受理せず、ただし**枠を返す**（プレイヤーの落ち度ではない）。rollbackすれば同じ番号を取り直せる

現在値：`1.da595899c6a9db43`（Phase 4.6 でゲームデータを変更していないことの証拠でもある）。

---

## 7. Date boundary（PSF-4）

- dailyKey は **サーバー時刻**で決まる。リクエストに含めない
- `expiresAt = min(issuedAt + 90分, 翌日00:00 JST + 15分)`
- 23:59 開始 → 00:01 提出は**前日のボードに入る**／00:20 は `TICKET_EXPIRED`
- 00:01 開始は翌日の枠（前日の枠とは独立）
- 端末時計を偽装して別日を名乗ってもticketが無く、書き込みも起きない
- クライアントは `serverNow - receivedAt` を時計ずれとして補正し、残り時間をサーバー基準で表示する

---

## 8. DB schema 変更案（**本Phaseでは適用しない**）

`schema.ts` から生成。テーブルは4つ（`players` / `daily_days` / `daily_tickets` / `daily_runs`）。

- `daily_tickets`：PK `(daily_key, client_run_id)`、`CHECK (attempt_no BETWEEN 1 AND 3)`、
  部分UNIQUE `(daily_key, player_id, attempt_no) WHERE closed_reason IS DISTINCT FROM 'voided'`
- `daily_runs`：`game_version` 列を追加、`(daily_key, client_run_id)` → `daily_tickets` へFK
- 上限の数値は `RULES` から生成（不変ルール4）
- 秘密・個人情報の列は無い（テストで機械検査）

> **Neon本番schemaへのmigrationは適用していない。** CEO指示（「まずschema/testコード
> まで。実DBmigrationは別Gateで実施する」「Neon本番schema変更禁止」）に従い、
> 実DB統合テストも**実行していない**（実行＝スキーマ適用になるため）。§14 参照。

---

## 9. Client integration

```
ranked Daily 開始：
  createClientRunId()
    → startRankedRun()        … 送り残しをflush → POST /ranking/start
    → saveTicket()            … ★START_GAME より前に控える
    → startDailyGame(..., session)
```

- 開始は `GameFlow.beginDailyChallenge` の**1か所に集約**（デッキ確定と「もう一度挑戦」の2経路が通る）
- 二重クリックは **ref** で遮断（stateだと同一tick内で2回通り、1操作で枠を2つ失う）
- サーバーが決めた `dailyKey` を採用（デッキ構築中に日付が変わっても破綻しない）
- reload/resume：`resumeRunLog` が成立し、控えたticketの `clientRunId`・`dailyKey` が一致すれば **ranked のまま再開**
- **通常モードは一切変更していない**。`saveVersion` も 9 のまま

---

## 10. Offline fallback

| 状況 | 挙動 |
|---|---|
| kill switch off（現在） | 通信せず、従来どおり即座に開始。ランキングの語も出さない |
| サーバー不達・5xx・応答が壊れている | **ランキング対象外として遊べる**（`unavailable`）。ゲームは止めない |
| 更新直後（423） | 遊べる（`version-locked`）。「日付が変わってから再開します」と案内 |
| 乱数が使えない | 遊べる（`identity`）。記録・提出はできない |
| **枠切れ（409）** | **ここだけ開始を止める**（1日3回勝負そのもの） |

結果画面には「この挑戦はランキングに記録されません（記録は端末に残ります）」を表示。
Daily画面には開始前に「始めると1回使う／途中でやめても・別の挑戦を始めても・90分を過ぎても戻らない」を表示。

---

## 11. Abuse guard

| 層 | 実装 |
|---|---|
| body | `maxBodyBytes` 65536 を **JSON解析・リプレイ検証より前**に切る（413） |
| identity | 身元不正はハッシュ計算前に弾き、DBへ書かない |
| ticket | ticket無しの提出は読み取り1回で拒否、書き込み0 |
| 提出試行 | `maxSubmitAttemptsPerDay` 30。不正リプレイ連打はここで止まりrunは1件も入らない |
| leaderboard | store単位の15秒キャッシュ ＋ `Cache-Control: public, s-maxage=15, stale-while-revalidate=60` |
| 剪定 | 外部cron無し。`/start` の約1/16で `retentionDays` より古い `daily_days` を削除（CASCADE） |
| IP | **アプリDBに保存しない**（列も無い） |
| Vercel Firewall | **今回は変更していない**（deploy承認後にCEO承認のもとで設定） |

正当な1日（3挑戦・3提出）の書き込みは **9回**（ticket3＋試行3＋run3）。

---

## 12. 本番コードでの 37 シナリオ

`ticket.test.ts` / `identity.test.ts` / `concurrency.test.ts` / `submit.test.ts` / `http.test.ts` /
`rankingClient.test.ts` / `rankingTicket.test.ts` に分散して実装。CEO指定の項目との対応：

| 要求 | 実装場所 | 結果 |
|---|---|---|
| 正常3プレイ／4回目start | ticket S1 | PASS |
| 同ID二重start | ticket S2 | PASS |
| 別ID並列start／2・3・4・5・10並列 | concurrency | PASS |
| start応答喪失retry | ticket S3 | PASS |
| reload／resume | ticket S3・rankingTicket | PASS |
| TTL expiry | ticket S3・S4 | PASS |
| submit retry／並列submit | ticket S3・concurrency | PASS |
| payload差し替え | submit | PASS |
| 23:59→00:01／grace超過 | ticket S5 | PASS |
| 端末時計偽装 | ticket S5・submit | PASS |
| 複数端末 | ticket S6 | PASS |
| public playerIdのみの偽装／secret不一致 | identity | PASS |
| sybil残余確認 | identity | PASS（**防げないことを明示的に固定**） |
| day-lock／version mismatch void・refund | ticket S7・http | PASS |
| ticket無しspam／invalid replay spam | submit・ticket S8 | PASS |
| body size | http | PASS |
| DB constraint | concurrency（DDL）＋ postgres.integration（実DB・**未実行**） | 実DBは §14 |

---

## 13. 判定

| Gate | 判定 |
|---|---|
| Phase 4.6 実装 | **PASS**（メモリ実装に対する全シナリオ・全回帰が通過） |
| 実DB再検証 | **未実施**（migration禁止のため。別Gate） |
| Production Release | **NO-GO** |

---

## 14. Known Risks

1. **実DB未適用・未検証。** `daily_days`／`daily_tickets` の追加と `daily_runs` の列追加は
   既存Neon DBに対して**後方互換ではない**（`CREATE TABLE IF NOT EXISTS` では既存
   `daily_runs` に列が増えない）。移行SQLの作成と適用は次Gate。統合テストは18件へ拡張済みだが、
   実行すると**スキーマ適用そのもの**になるため今Phaseでは走らせていない
2. **多重クリックで別 `clientRunId` が並走した場合**、Phase 4.5 §12 は「1枚に畳む」としているが、
   サーバー側の番号衝突による集約は**真に同時**のときしか働かない。直列化した場合は
   それぞれが「新しい挑戦」として枠を消費する（＝仕様どおりの挙動でもある）。
   実際の防波堤は**クライアント側の契約**（`clientRunId` を1回だけ発行して再利用する・
   refによる入口の一本化）であり、今回そこを実装・強化した。サーバーの公平性
   （枠が上限を超えない）は常に保たれる
3. **C層のオフライン最適化・save-scumming**（決定139 §16-1）。設計上の残余で本Phaseの対象外
4. **sybil**（identityの量産）。匿名である以上ふさげない。緩和はedge側のレート制限で、未設定
5. **Vercel Firewall 未設定**、plan/利用条件は CEO確認④のまま
6. `daily_runs` の CHECK 違反は内部矛盾として投げ直す設計に変えた（従来は
   `attempts-exceeded` へ翻訳していた）。ticketが番号を保証するため、発火＝データ破損の合図

---

## 15. 次Gate

1. **DB Migration Gate**：`daily_days`／`daily_tickets` 作成、`daily_runs` の列追加とFK付与の移行SQL、Neonへの適用（CEO承認）、実DB統合テスト18件の実行
2. **Edge Gate**：Vercel plan／利用条件の確認（CEO確認④）、WAF rate limit 1本の設定
3. **Production Release Gate**：実機QA、kill switch を開ける判断（§6-3 #8）
