# Phase 4.5 — Production Security & Fairness Gate（設計監査）

- **日付**：2026-09-08
- **branch**：`feat/daily-ranking-phase4`（Phase 4.4 Final PASS `9ebbfd6` の上に積む。merge・push・deploy・Vercel変更・Production API有効化・Neon schema変更 いずれも未実施）
- **区分**：AI判断（CLAUDE.md §6-2）。CEO指示「KAGURA / Phase 4.5」に基づく**設計監査のみ**。本番実装は行わない
- **前提（Baseline）**：Phase 4.4 Final PASS。ローテーション後の Neon credential で実DB統合テスト 13 passed / 1 skipped。実DB制約・3-attempt DB constraint・concurrency・idempotency・server replay・leaderboard 確認済み。**Production Release は引き続き NO-GO**
- **成果物**：本書、`scripts/phase45-psf/`（リファレンスモデル＋状態機械検証 37件＋本番エンジン計測 2,100試合）、`docs/DECISIONS.md` 決定139

---

## 0. 結論の要約

| 項目 | 判定 |
|---|---|
| PSF-1 匿名identity | **CONDITIONAL PASS**（偽装は塞げる。量産＝sybil は匿名である限り残る） |
| PSF-2 3 attempts/day | **設計 PASS**（run ticket で「1日3回勝負」をサーバーが保証。C層のオフライン最適化は残余） |
| PSF-3 rules/game version | **設計 PASS**（day-lock ＋ ticket/run への stamp。運用依存ではなく機械的） |
| PSF-4 日付跨ぎ | **設計 PASS**（server time ＋ ticket の dailyKey ＋ grace 15分） |
| PSF-5 rate limit / abuse | **CONDITIONAL PASS**（app層はPASS。edge層は Vercel Hobby の WAF rate limit が一次情報で利用可と確認できたが、本プロジェクトの plan/利用条件は CEO確認④のまま） |
| **Production Ranking 総合** | **CONDITIONAL GO（設計）／deploy は NO-GO** |

**最重要の発見**：現行の「3 submissions」は、同じ腕のプレイヤーでも **300回遊んで良い3回を出せば best-of-3 の 1.5〜2.3 倍**のスコアになる（§4-2、本番エンジン全7神 2,100試合）。提出回数の制限では Daily の公平性は成立しない。

**推奨アーキテクチャは1案**（§8）：**client-held secret ＋ run ticket（start時に枠を予約）＋ day-locked rulesVersion**。API は **1本追加**（`/start`）、テーブルは **2つ追加**（`daily_tickets` / `daily_days`）、`daily_runs` に列1つ追加。ログイン・外部Auth・CAPTCHA・課金・Daily seed 非公開化はいずれも**使わない**。

---

## 1. 現行実装の事実（監査で確認した根拠）

| # | 事実 | 根拠 |
|---|---|---|
| F1 | `playerId` は端末生成の乱数32桁で、**それ自体が唯一の資格情報**。秘密は無い | `src/hooks/anonymousPlayerId.ts` |
| F2 | `playerId` は**リーダーボードで公開**される | `src/server/ranking/leaderboard.ts` L58（`LeaderboardRow.playerId`） |
| F3 | 3回制限は `daily_runs` の `CHECK/UNIQUE` で**提出**に対して効く。プレイ回数は localStorage のカウンタのみ | `schema.ts`・`src/hooks/dailyStorage.ts` |
| F4 | Daily seed は `daily-${dateKey}-${enemyId}` で dailyKey から完全決定。全挑戦が**同一の山札順** | `src/core/data/dailyBoss.ts` L87 |
| F5 | `submitRun` は `recordAttempt`（DB書き込み）を**日付検査・リプレイ検証より前**に行う。形式が正しければ誰でも `players` 行を作れる | `submit.ts` 手順3→4、`postgresStore.ts` L179 |
| F6 | `STALE_DAILY_KEY` は提出時刻のサーバー日付と比較。23:59開始→00:01提出は**拒否される** | `submit.ts` 手順4 |
| F7 | `ReplayInput` には `formatVersion` しかなく、ルール・カード・エンジンの版は無い | `src/core/replay/types.ts` |
| F8 | リーダーボード GET は毎回 `listDayRuns` 全走査＋順位付け。キャッシュ無し | `leaderboard.ts` |
| F9 | クライアントの Daily 開始はサーバーを呼ばない（kill switch下で完全オフライン） | `useGameEngine.startDailyGame` |

---

## 2. Threat Model（3層）

- **A. 普通のユーザー**：UIだけ。incognito・別ブラウザ・別端末は使える
- **B. DevTools を使えるユーザー**：localStorage の編集・削除、リクエストの改変、セーブのコピー／復元
- **C. API を直接叩き、自作 script を使えるユーザー**：本番エンジン（公開バンドル）をローカルで回し、任意の `ReplayInput` を生成・送信できる

### 2-1. 攻撃経路の総覧（現行 → 対策後）

| ID | 攻撃 | 層 | 現行 | 影響 | 対策後 | 残余 |
|---|---|---|---|---|---|---|
| T1 | 他人の `playerId`（ボード公開値）で提出し、その人の枠・rate limit を食い潰す（griefing） | C | **成功**（F1・F2） | 上位者を狙い撃ちで提出不能にできる | **失敗**：secret のハッシュ不一致 → `BAD_IDENTITY`、書き込み0 | 無し |
| T2 | 他人の `clientRunId` を名乗る／同IDで中身差し替え | B/C | 失敗（Phase 4.3 で対処済み） | — | 失敗（維持） | 無し |
| T3 | localStorage 削除・incognito・別ブラウザで**新しい identity** を得て枠を増やす（sybil） | A/B/C | **成功** | 1人が無制限に挑戦・提出できる | **成功**（匿名である限り塞げない） | **残る**。緩和：edge rate limit（IP/JA4）、identity 生成に必ず `/start` の往復を要求 |
| T4 | 何度でもプレイして良い3回だけ提出（best-of-N） | A/B | **成功**（F3・F4） | best-of-3 比 **1.5〜2.3倍**（§4-2） | **失敗**：start で枠を予約。UI経由の再挑戦は必ず枠を消費 | 無し（A/B） |
| T5 | ローカルで本番エンジンを回して最適解を探索し、その action log を提出 | C | **成功** | 人間の上限を超えるスコア | **成功**（seed公開・決定論・クライアント側演算の帰結） | **残る**。TTL 90分で1 ticket あたりの探索時間は上限化されるが、script には十分な時間。§16-1 |
| T6 | セーブのコピー／復元で1runの途中を「やり直す」（save-scumming） | B | **成功** | 手番単位の巻き戻し | **成功**（`resumeRunLog` はログと盤面の整合しか見ない） | **残る**。T5 の劣化版で影響は T5 に包含される |
| T7 | 端末時計を進めて「明日のDaily」を先に遊ぶ／昨日の seed を今日提出 | B | 一部成功（クライアントは端末時計で dailyKey を出す。提出はサーバー日付で弾く） | 正当プレイヤーの run が `STALE_DAILY_KEY` で消える事故を含む | **失敗**：dailyKey はサーバーが ticket で決め、クライアントはそれを使う | 無し |
| T8 | 23:59開始→00:01提出が拒否される（攻撃ではなく事故） | A | **発生する**（F6） | 正当プレイヤーが run を失う | **解消**：ticket の dailyKey で提出、grace 15分 | 無し |
| T9 | deploy で `RULES`/カード/エンジンが変わり、朝と夜のスコアが比較不能になる | 運用 | **発生しうる**（F7） | 同一ボード内で条件が違う／再検証不能 | **機械的に防止**：その日の最初の ticket が版を固定。版が変われば新規 ticket を発行しない | 無し（当日の残り時間は新規挑戦不可＝運用への強い信号） |
| T10 | 形式だけ正しい `playerId` を量産して `players` 行を膨らませる | C | **成功**（F5） | 0.5 GB を埋める／compute 消費 | **失敗**：ticket を持たない提出は**書き込み0**で拒否。行が増えるのは `/start` 経由のみ | **残る**（`/start` spam）。edge rate limit ＋ 剪定で緩和 |
| T11 | 不正リプレイ連打（CPU消費） | C | 30回/identity/日で止まる | Vercel 実行時間 | 維持。ただし ticket 保持者のみ検証まで進む | identity 量産と組み合わせた分だけ残る |
| T12 | 巨大 action log | C | `maxActions 400`（Phase 4.1） | JSON parse／replay 時間 | 維持＋body 上限 64 KB を wrapper で先に切る | 無し |
| T13 | leaderboard GET 連打 | C | **毎回 DB 全走査**（F8） | Neon CU-hours／egress 5 GB | in-memory 15秒 cache ＋ `s-maxage` | 残るのは cache miss 分のみ |
| T14 | 同一 credential を2端末で同時に使い、両方で遊んで良い方を出す | A/B | **成功**（枠は提出時にしか減らない） | best-of-2 | **失敗**：open ticket は identity につき常に1枚。端末Bの start で端末Aの ticket は放棄 | 無し |
| T15 | DB/サーバー障害でゲーム本体が壊れる | 運用 | 壊れない（Phase 4.4 §9-1） | — | 維持：`/start` 失敗時は**非ランク挑戦**として遊べる（§12-4） | 無し |

---

## 3. PSF-1 匿名identity

### 3-1. 比較

| 案 | 偽装防止 | sybil 防止 | 追加API | 追加secret | 追加DB | 判定 |
|---|---|---|---|---|---|---|
| 現行（公開乱数ID） | ✗（T1） | ✗ | 0 | 0 | 0 | 不採用 |
| **client-held secret → 公開ID＝SHA-256(secret)[0:32]** | ✓ | ✗ | **0** | **0** | **0** | **採用** |
| server-issued signed token（HMAC） | ✓ | ✗（発行は rate limit 可） | +1（issue） | +1（署名鍵の管理・ローテーション） | 0 | 不採用：秘密が1つ増え、issue が spam 面になる。得られるのは「発行の rate limit」だけで、それは `/start` の edge rate limit で代替できる |
| HttpOnly cookie | ✓（XSS耐性） | ✗ | 0 | 0 | 0 | 不採用：同一 origin 前提でローカル開発・静的配信が複雑化。B層は cookie を消せるので sybil 耐性は同じ。XSS 経路は本アプリに外部スクリプトが無いので価値が小さい |
| 外部Auth／ログイン | ✓ | △ | 多 | 多 | 多 | 制約により除外 |

### 3-2. 仕様

- クライアントは `crypto.getRandomValues` で **256bit の `playerSecret`** を生成し localStorage に保持（既存 `sevengods.playerId` は廃止。本番データはまだ無いので移行不要）
- 公開ID `playerId = SHA-256(playerSecret)` の先頭32桁（既存の形式・長さ・DB列と互換）
- `secret` は **POST body にのみ**載せる（GET の query には出さない）。リーダーボードには従来どおり公開IDのみ
- サーバーは `crypto.subtle.digest('SHA-256')`（Web Crypto。Node 20 / Vercel / ブラウザ共通、外部パッケージ0件を維持）で照合。不一致は**書き込み0で拒否**
- 「別人として遊ぶ」出口（`clearAnonymousPlayerId`）は維持

### 3-3. 残余リスク

sybil（T3）。匿名を維持する以上、原理的に塞げない。緩和は (1) identity の生成だけでは何も起きず、**枠を得るには `/start` の往復が必要**（＝edge rate limit の対象になる）、(2) 1 identity あたりの書き込みは高々 1＋3×3 回（§10 S10）に抑えて Neon を守る、の2点。**「どこまで許容するか」＝Daily ランキングを「同一端末・同一ブラウザ内の公平」と定義する**のが MVP の線引き（決定132 と同じ前提）。

---

## 4. PSF-2 3 attempts / day（最重要）

### 4-1. 問題の定義

現行は「3 submissions」。プレイは無制限で、seed が公開・決定論（F4）なので**同じ試合を何度でも練習して良い3回だけ出せる**。

### 4-2. 影響の定量（本番エンジン・`scripts/phase45-psf/retryInflation.audit.ts`）

`dailyKey=2026-09-09`、各神の推奨デッキ、Phase 4.2 の疑似乱数方針（腕は固定）で 300 試合。k 回遊んだときの**最良スコアの期待値**：

| 神 | 勝率 | 平均 | best of 1 | best of 3 | best of 10 | best of 30 | best of 100 | best of 300 | ×(300/3) |
|---|---|---|---|---|---|---|---|---|---|
| ebisu | 18% | 375 | 375 | 528 | 748 | 792 | 813 | 869 | 1.646 |
| taiyo | 12% | 306 | 306 | 453 | 656 | 804 | 834 | 876 | 1.934 |
| sobi | 19% | 355 | 355 | 487 | 715 | 816 | 858 | 863 | 1.772 |
| saika | 0% | 183 | 183 | 219 | 255 | 281 | 300 | 323 | 1.475 |
| juraku | 6% | 279 | 279 | 355 | 523 | 700 | 755 | 759 | 2.138 |
| fukuei | 4% | 263 | 263 | 341 | 452 | 617 | 758 | 771 | 2.261 |
| shouren | 13% | 334 | 334 | 475 | 690 | 791 | 826 | 864 | 1.819 |

**同じ腕で 1.5〜2.3倍。** best-of-30 の時点で既に 1.3〜2.0倍。「暇な人が勝つ」ランキングになり、Phase 4.0 で検証した競技適性（決定131）が無意味になる。

### 4-3. 比較

| 案 | A/B層の best-of-N | C層のオフライン探索 | 正当ユーザーの枠喪失 | 追加 | 判定 |
|---|---|---|---|---|---|
| 現行（提出で消費） | ✗ | ✗ | 無し | 0 | 不採用 |
| **run ticket（start で予約、TTL付き、identity につき open は1枚）** | ✓ | ✗（TTLで時間上限のみ） | **無し**（§11・§12 の救済で全ケース検証済み） | API+1・table+2 | **採用** |
| start で消費＋ god/deck を ticket に束縛 | ✓ | ✗ | 無し | 上＋payload | 不採用：seed も敵も公開なので deck を先に固定しても情報は増えない。検証の二重化だけが増える |
| サーバー側 hidden nonce で seed を ticket ごとに撹乱 | ✓ | **✓** | 無し | 上＋seed導出変更 | **不採用（制約）**：「Daily shared seed / shared boss」「Daily seed の非公開化を避ける」に反する。C層対策としては唯一有効なので §19 に記録 |
| 「best of 3 submissions」を仕様として明示し受け入れる | ✗ | ✗ | 無し | 0 | 不採用：§4-2 の倍率は「腕」ではなく「回数」の差であり、CEO指示「Productionでは許容しない」と一致 |

### 4-4. 仕様（要点。API は §9、状態機械は §10、救済は §11）

1. 挑戦は **`POST /api/ranking/start`** で始まる。サーバーは identity を照合し、**サーバー時刻の dailyKey** で ticket を発行する。ticket は `clientRunId` そのもの（識別子を増やさない）
2. **1 identity・1日につき open ticket は常に1枚**。別の `clientRunId` で start すると前の open ticket は `abandoned`（＝消費）
3. **枠の消費は ticket の発行**。提出しなくても・期限切れでも・放棄しても消費。voided（deploy跨ぎ）だけは返還
4. `attempt_no` は ticket が持つ。`daily_runs.attempt_no` は ticket から写す（既存の CHECK/UNIQUE はそのまま最終権限）
5. **`/submit` は ticket を持つ run しか受理しない**。ticket 無し＝書き込み0で拒否
6. TTL **90分**（`ticketTtlMinutes`）と日末 grace **15分**（`dayEndGraceMinutes`）の早い方で失効（§13）

### 4-5. 残余リスク

T5（C層のオフライン探索）と T6（save-scumming）。§16-1。

---

## 5. PSF-3 rules / game version

### 5-1. 比較

| 案 | 機械的保証 | 当日の混在 | プレイヤー影響 | 判定 |
|---|---|---|---|---|
| 運用ルール「ランキング影響ルールをJST日中にdeployしない」のみ | ✗ | 起きうる | 気づかない | **不採用**：CEO指示のとおり運用だけに依存しない |
| run に版を stamp し、ボードは「現在の版」で filter | △ | 朝の run がボードから消える | 朝のプレイヤーの枠が実質没収 | 不採用 |
| ボードを (dailyKey, version) で分割 | ✓ | 別ボードになる | 混乱 | 不採用 |
| **day-lock：その日の最初の ticket が版を固定。版が変わったら新規 ticket を発行しない。open ticket の提出は void（返還）** | **✓** | **起きない** | 当日の残り時間は新規挑戦不可（明示メッセージ）。open だった run は枠が返る | **採用** |

### 5-2. `gameVersion` の決め方（版の付け忘れを機械的に防ぐ）

`gameVersion = "<engineVersion>.<dataFingerprint>"`

- `dataFingerprint`：ランキングに影響するデータ（`RULES` から `ranking`／`replay.pendingRuns` を除いたもの、カード定義、敵定義、神定義、OTOMO定義）を安定化 JSON にして **FNV-1a**（純TS・`src/core`・外部依存なし）で要約
- `engineVersion`：`rules.ts` の手動整数。**golden replay test**（固定 `ReplayInput` → 期待 score・rngCursor）を `src/core/replay` に置き、エンジン挙動が変わればテストが落ちて bump を強制する
- `ReplayInput` の形は変えない（版はサーバーが ticket/run に stamp する）。クライアントは ticket の版と自分の版が違えば「更新が必要」を表示して reload を促す

### 5-3. 残余リスク

無し（設計上）。運用上は「版が変わった日は新規挑戦が止まる」が、それは意図した強い信号。

---

## 6. PSF-4 日付跨ぎ

### 6-1. 定義

| 状況 | 仕様 |
|---|---|
| dailyKey の決定 | **サーバー時刻**（`/start` 時）。リクエストに dailyKey を含めない。端末時計は表示専用 |
| 23:59 JST 開始 | ticket.dailyKey ＝ 当日、`expiresAt = min(issuedAt + 90分, 翌日00:00 + 15分)` ＝ **00:15** |
| 00:01 JST 提出 | ticket が有効なので**当日のボードに入る** |
| 00:20 JST 提出 | `TICKET_EXPIRED`（枠は消費済み） |
| 00:01 JST 開始 | 翌日の dailyKey・翌日の枠（前日の枠とは独立） |
| ボードの確定 | 翌日 **00:15** をもって前日のボードは不変 |

### 6-2. grace の比較

| grace | 23:59開始者 | ボード確定 | 判定 |
|---|---|---|---|
| 0分 | 救えない | 00:00 | ✗ |
| **15分** | 1試合（5〜10分）は救える | 00:15 | **採用** |
| 90分（TTL のみ） | 救える | 01:30 | ✗：確定が遅すぎ、翌日の掲示と重なる |

### 6-3. クライアント側の追随（次Phase）

`isExpiredDailySave` は現在「日付が違えば再開不可」。ticket があるなら `expiresAt` を基準にする（00:01 の reload で 23:59 開始の run を再開できる）。

---

## 7. PSF-5 rate limit / abuse

### 7-1. 一次情報（2026-09-08 取得）

| 項目 | 事実 | 出典 |
|---|---|---|
| Neon Free | **0.5 GB/project、100 CU-hours/project/月、5 GB egress、autosuspend 5分、月次上限到達で翌月まで compute 停止** | neon.com/pricing |
| Vercel WAF rate limiting | **Hobby で利用可**。キー IP/JA4、fixed window 10秒〜10分、**1 rule/project**、1,000,000 allowed requests 込み。Hobby の custom firewall rule は合計3 | vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting（last_updated 2026-08-28） |

**未確認として分離**：本プロジェクトの Vercel アカウントが Hobby であること、および Vercel Functions（`api/`）の稼働が現在の利用条件で問題ないこと（Phase 4.4 §11 の CEO 指示④のまま）。**有料プラン前提の設計は一切していない。**

### 7-2. 層別の仕様

| 層 | 対策 | 対象 T |
|---|---|---|
| **edge（Vercel WAF）** | rule 1本：path `/api/ranking/*`、キー IP、**60秒 60 req**、action 429。正当利用（start 3＋submit 数回＋board 数回/分）に十分。効果は Firewall overview で観測して調整 | T3・T10・T11・T13 |
| **app：書き込み前検査** | identity → ticket → 冪等 → closed/expired → 版 → **ここで初めて書く**（rate counter）→ replay → insert。**ticket 無しは書き込み0** | T10・T11 |
| **app：identity 単位** | tickets ≤ 3/日（DB制約）、submit 試行 ≤ 30/日（既存 `players.attempt_count`） | T11 |
| **app：payload** | wrapper で body ≤ **64 KB**（400 action の log は ≈20 KB）、`maxActions 400`（既存） | T12 |
| **app：leaderboard** | function instance 内 **15秒 cache**（dailyKey 単位）。`self` は同じ cache から導出。応答に `Cache-Control: public, s-maxage=15, stale-while-revalidate=60` | T13 |
| **DB：剪定** | 外部 cron を使わず、`/start` の **1/16**（`clientRunId` 末尾 hex が `0`）で `retentionDays` より古い `daily_tickets`/`daily_runs`/`daily_days` を DELETE。ticket も run も無い `players` は 30日で DELETE | T10 |
| **IP** | **アプリDBに保存しない**（既存の禁止列テストに `ip` は含まれている）。IP を扱うのは edge のみ | 方針 |

### 7-3. Neon Free に対する見積り

| 量 | 見積り |
|---|---|
| 行サイズ | ticket ≈150 B、run ≈120 B、day 1行/日 |
| 1,000 人/日 | (3+3)×1,000×135 B ≈ **0.8 MB/日** → 30日保持で ≈ 25 MB（0.5 GB の 5%） |
| compute | 1 request ≈ 数 ms のクエリ。10,000 req/日でも 100 CU-hours に対し無視できる。**autosuspend 5分**により低トラフィック時はほぼ 0 |
| egress | board 1回 ≈ 100行×100 B ≈ 10 KB。cache 15秒なら DB→function の読み出しは最大 5,760回/日 ≈ 58 MB/月 |

**枯渇の主因になりうるのは T13（board 連打）と T10（`/start` spam）だけで、どちらも上表で緩和済み。**

### 7-4. 残余リスク

edge rate limit は per-region カウント（docs 明記）。複数 region からの分散 spam は上限を超えうる。app 層の identity 単位制限が最後の砦。

---

## 8. 推奨 Production MVP architecture（1案）

```
[Browser]                              [Vercel Function (api/ranking/*)]            [Neon]
 playerSecret(localStorage)            thin wrapper: body<=64KB, JSON, Cache-Control
 playerId = H(secret)                  src/server/ranking (pure TS, 外部pkg 0)
   │                                    │
   ├─ POST /start {playerId,secret,clientRunId}
   │      → identity照合 → day-lock(gameVersion) → ticket発行/再取得 ──────────▶ daily_days, daily_tickets
   │      ◀ {dailyKey, attemptNo, expiresAt, serverNow, gameVersion, state}
   ├─ START_GAME(resolveDailyStart(ticket.dailyKey))   ← 端末時計は使わない
   ├─ play / save / resume（既存）… runLog に clientRunId（既存）
   ├─ POST /submit {playerId,secret,clientRunId,input}
   │      → identity → ticket → 冪等 → closed/expired → 版 → rate → runReplay → insert ─▶ daily_runs(attempt_no=ticket)
   └─ GET /leaderboard?dailyKey=&playerId=   (15s cache, s-maxage)
```

**変えないもの**：Enemy Intent × 7 rounds × deterministic Daily seed／shared seed・shared boss／3 attempts/day のコンセプト／Replay verification／equal score = same rank（1,1,3）／submittedAt を順位に使わない／Daily bonusCopies 無効／通常モード／save compatibility（`saveVersion` 不変）／kill switch（`submissionEnabled`）。

**障害時**：`/start` が失敗（5xx・timeout・kill switch 503）したら、クライアントは**「非ランク挑戦」として従来どおりオフラインで遊べる**（結果はローカル記録のみ、提出しない）。ゲーム本体はランキングを知らないまま（Phase 4.4 §9-1 を維持）。

---

## 9. API 案

| # | Method / Path | Body | 200/201 | 拒否 |
|---|---|---|---|---|
| 1 | **POST `/api/ranking/start`**（新規） | `{ playerId, playerSecret, clientRunId }` | `{ dailyKey, clientRunId, attemptNo, attemptsUsed, attemptsPerDay, issuedAt, expiresAt, serverNow, gameVersion, state, reused, abandoned }` | 400 `BAD_IDENTITY`／409 `ATTEMPTS_EXCEEDED`／423 `RULES_VERSION_LOCKED`／503 `submission_disabled` |
| 2 | POST `/api/ranking/submit`（既存＋変更） | `{ playerId, playerSecret, clientRunId, input }` | 既存の形 | 既存＋ 404 `NO_TICKET`／409 `TICKET_CLOSED`／410 `TICKET_EXPIRED`／409 `RULES_VERSION_MISMATCH`（`refunded:true`） |
| 3 | GET `/api/ranking/leaderboard?dailyKey=&playerId=`（既存） | — | 既存 ＋ `Cache-Control` | 既存 |

- **`STALE_DAILY_KEY` は廃止**（ticket の dailyKey と `input.dailyKey` の一致で置換。不一致は `NO_TICKET`）
- `playerSecret` は POST body のみ。ログに出さない（既存 `secrets.test.ts` の検査対象に `playerSecret` を追加）
- API は合計 **3本**（＋1）

---

## 10. DB 追加案（Neon schema は本Phaseでは変更しない。DDL は `schema.ts` から生成する前提）

```sql
-- 追加①：その日の gameVersion を固定（1行/日）
CREATE TABLE IF NOT EXISTS daily_days (
  daily_key     text PRIMARY KEY,
  game_version  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 追加②：run ticket（挑戦枠の予約）
CREATE TABLE IF NOT EXISTS daily_tickets (
  daily_key     text        NOT NULL REFERENCES daily_days (daily_key) ON DELETE CASCADE,
  player_id     text        NOT NULL REFERENCES players (player_id) ON DELETE CASCADE,
  client_run_id text        NOT NULL,
  attempt_no    smallint    NOT NULL,
  issued_at     timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  game_version  text        NOT NULL,
  closed_reason text        CHECK (closed_reason IN ('abandoned', 'voided')),
  CONSTRAINT daily_tickets_pkey PRIMARY KEY (daily_key, client_run_id),
  CONSTRAINT daily_tickets_attempt_range CHECK (attempt_no BETWEEN 1 AND ${ATTEMPTS_PER_DAY})
);
-- voided は番号を返還するので部分UNIQUE
CREATE UNIQUE INDEX IF NOT EXISTS daily_tickets_attempt_unique
  ON daily_tickets (daily_key, player_id, attempt_no)
  WHERE closed_reason IS DISTINCT FROM 'voided';

-- 変更③：run は必ず ticket に紐づく。版を残す
ALTER TABLE daily_runs ADD COLUMN game_version text NOT NULL;
ALTER TABLE daily_runs ADD CONSTRAINT daily_runs_ticket_fk
  FOREIGN KEY (daily_key, client_run_id) REFERENCES daily_tickets (daily_key, client_run_id) ON DELETE CASCADE;
```

- `players` は無変更（`player_id` がハッシュ値になるだけ。列は同じ）
- 個人情報列は増えない（`email/name/ip/user_agent/cookie/fingerprint` 禁止テストを維持）
- 剪定は `buildPruneSql` を tickets/days へ拡張（`daily_days` の CASCADE で ticket/run が消える）

---

## 11. run ticket state machine

```
                 POST /start (new clientRunId, 枠あり)
   (none) ───────────────────────────────────────────▶ open ──┐
                                                       │      │ POST /submit 受理
     ┌─────────────────────────────────────────────────┤      ▼
     │ 別 clientRunId で /start                          │   submitted（終端・枠消費）
     ▼                                                  │
  abandoned（終端・枠消費）                               │ now > expiresAt
                                                        ▼
                                                     expired（終端・枠消費）
        open ── /submit 時に game_version ≠ 現在 ──▶ voided（終端・枠**返還**）
```

| 状態 | 定義 | 枠 | 遷移元 |
|---|---|---|---|
| open | `closed_reason IS NULL` ∧ run 無し ∧ `now ≤ expires_at` | 消費 | (none) |
| submitted | run が存在 | 消費 | open |
| expired | `now > expires_at` ∧ run 無し | 消費 | open |
| abandoned | 別 clientRunId の start で閉じられた | 消費 | open |
| voided | deploy 跨ぎで無効化 | **返還** | open |

**不変条件**（`ticket.audit.ts` で検証）：
1. 1 identity・1日の open は常に **≤1**
2. `counts(non-voided tickets) ≤ attemptsPerDay`（DB制約）
3. `daily_runs` の行は必ず ticket を持ち、`attempt_no` は ticket と一致
4. 同じ `clientRunId` の start は何度でも同じ ticket を返す（冪等）
5. 拒否（BAD_IDENTITY／NO_TICKET／ATTEMPTS_EXCEEDED）は書き込み0

---

## 12. disconnect / reload 救済仕様

| 事象 | クライアント | サーバー | 枠 |
|---|---|---|---|
| **二重クリック** | 同じ clientRunId で2回送る（同一ハンドラ） | 2回目は `reused:true` で同じ ticket | 1 |
| **多重クリックで別 clientRunId が並走** | 応答の `clientRunId` を正として採用 | 番号衝突は再採番せず open ticket を返す（1枚に畳む） | 1 |
| **start の応答を失った** | 同じ clientRunId で retry | 同じ ticket（`reused`） | 1 |
| **ticket 取得直後にクラッシュ** | ticket 受領時点で `{clientRunId, ticket}` を localStorage へ保存してから START_GAME | 次回起動で同じ clientRunId → 同じ ticket → 盤面は最初から（actions 0 なので正当） | 1 |
| **プレイ中に reload** | 既存 `battleSaveStorage`＋`dailyRunLogStorage` から resume（`resumeRunLog` でログ整合を検証） | ticket は open のまま | 1 |
| **TTL 内の中断→再開** | 再開時に `/start`（同 clientRunId）で `state` を確認。`open` なら続行 | — | 1 |
| **TTL 超過** | `state: expired` を受けたら「この挑戦は期限切れ」を表示し、新規 start を促す | 期限切れは消費 | 1（失う） |
| **submit の応答を失った** | 既存 `pendingRuns` が同じ clientRunId で再送 | `duplicate` で受理、保存は増えない。**期限後の再送でも受理済みなら duplicate** | 1 |
| **通信断で submit できない** | `pendingRuns` に残り、次回起動で再送 | `expiresAt` まで受理 | 1 |
| **サーバー障害（5xx／503 kill switch）で start 不能** | **非ランク挑戦**として従来どおり開始（提出しない。ローカル記録のみ）。UIに「ランキング対象外」を明示 | — | 0（サーバーは何も知らない） |
| **同一 credential の別端末が start** | 端末A の run は放棄される。A の submit は `TICKET_CLOSED` | open は1枚 | 端末B が消費 |
| **「新しい挑戦」を開始（残枠あり）** | UI は「進行中の挑戦を破棄すると1回分消費します」を確認 | 旧 open を abandoned にして発行 | +1 |
| **「新しい挑戦」を開始（残枠なし）** | UI は「続きから」のみ提示 | `ATTEMPTS_EXCEEDED`。**open ticket は放棄しない** | 不変 |

---

## 13. 日付跨ぎ仕様

§6 のとおり。数値は実装時に `rules.ts` へ：`ranking.ticketTtlMinutes = 90`、`ranking.dayEndGraceMinutes = 15`。

`expiresAt = min(issuedAt + ticketTtlMinutes, dayEnd(dailyKey) + dayEndGraceMinutes)`、`dayEnd` は JST 翌日 00:00（`timezoneOffsetMinutes` 540 を使用）。

---

## 14. rate limit 仕様

§7-2 のとおり。数値は `rules.ts` へ：`ranking.maxBodyBytes = 65536`、`ranking.leaderboardCacheSeconds = 15`、`ranking.pruneEveryStarts = 16`。edge rule（60 req/60 s/IP）は Vercel Firewall の設定であり、**deploy 承認後に CEO 承認のもとで設定**する（コードには入らない）。

---

## 15. simulation / test 結果

実行：`npx vitest run --config scripts/phase45-psf/vitest.audit.config.ts`

### 15-1. 状態機械（`ticket.audit.ts`）— **37 passed / 0 failed**

| 群 | 検証内容 | 件数 |
|---|---|---|
| S1 正常系 | 3 start＋3 submit → attempt 1,2,3。4回目 start 拒否（書き込み0）。放置 ticket も消費 | 2 |
| S2 二重start | 同ID→同 ticket。別ID→前を放棄、旧runの submit は `TICKET_CLOSED`。残枠0の新規 start は open を放棄しない | 3 |
| S3 並列start | 同ID×{2,3,5,10}・別ID×{2,3,5,10}（読み取り直後に割り込みを強制）→ **常に ticket 1枚・全応答が同じ ticket** | 8 |
| S4 reload/resume/通信断 | reload・TTL内resume・TTL超過・start応答喪失・submit応答喪失・並列submit・差し替え | 6 |
| S5 期限切れ | 期限切れは消費、次は attempt 2 | 1 |
| S6 日付跨ぎ | 23:59→00:01 受理／00:20 期限切れ／00:01 start は翌日／端末時計偽装は `NO_TICKET`（書き込み0） | 4 |
| S7 複数端末 | 端末Bの start で A は放棄。同IDなら共有 | 2 |
| S8 PSF-1 | secret 不一致・他人の runId・公開IDのみでの griefing はすべて `BAD_IDENTITY`（書き込み0）。sybil は残余として明示 | 4 |
| S9 PSF-3 | day-lock、deploy 跨ぎの void＝返還、rollback 後の番号再利用、run への版 stamp | 3 |
| S10 PSF-5 | ticket 無し submit 200件で書き込み0、不正リプレイ連打は 30 で停止、正当な1日の書き込みは **1＋3×3 回** | 3 |
| 網羅 | 5状態以外が存在しない | 1 |

### 15-2. PSF-2 定量（`retryInflation.audit.ts`）— **1 passed**、全7神 × 300 試合＝2,100 試合（本番エンジン・本番記録経路・`runReplay` 検証込み）。結果は §4-2。出力 `scripts/phase45-psf/out/retry_inflation.{json,md}`

### 15-3. 回帰（本Phaseの追加は `scripts/` と `docs/` のみ）

| 項目 | 結果 |
|---|---|
| `npx vitest run`（DB無効） | **241 files / 2,937 passed ＋ 13 skipped**（Phase 4.4 §12 と同一。skip 13 は実DB統合テスト。`.audit.ts` は既定 config の対象外で、件数は変化なし） |
| `npx tsc -b` | PASS（`src` のみが対象、`src` は無変更） |
| `npx oxlint` | PASS（既存警告2件のみ） |
| clean build | PASS（2.53s）。バンドル `index-CLjXu-bP.js` 383,570 B・`index-CDbAuk7l.css` **同一ハッシュ** |

---

## 16. 残余リスク

### 16-1. 【最大】C層のオフライン最適化（T5）と save-scumming（T6）

seed 公開・決定論・クライアント側演算という Daily の設計そのものの帰結で、**サーバー側の hidden information 無しには塞げない**。本Phaseの制約（seed 非公開化を避ける）の範囲では、(1) TTL 90分で 1 ticket あたりの探索時間を上限化、(2) 3 ticket/日で 1 identity あたり最大 270 分、(3) sybil と組み合わされれば無制限——が正直な評価。**「人間が UI で遊ぶ範囲の公平」が MVP の保証範囲**であり、script 対策は次々Phase（§19 の hidden nonce）に送る。

### 16-2. sybil（T3）

§3-3。edge rate limit と `/start` 往復の必須化で「安価な量産」を「時間のかかる量産」に変えるまで。

### 16-3. edge rate limit の per-region カウント

§7-4。

### 16-4. deploy 当日の新規挑戦停止（PSF-3 の副作用）

意図した挙動だが、UI 文言と運用手順（「ランキング影響 deploy は JST 00:00〜00:15 に行う」）を次Phaseで整備する。

### 16-5. 期限切れ・放棄で枠を失う体験

正当ユーザーが枠を失うのは「90分放置」「自分で新しい挑戦を選ぶ」「別端末で始める」の3経路のみ（§12）。すべて UI で事前に明示する。

---

## 17. PSF-1〜5 Gate 判定

| Gate | 判定 | 根拠 | 条件 |
|---|---|---|---|
| PSF-1 | **CONDITIONAL PASS** | 偽装・griefing は塞げる（S8）。sybil は匿名の帰結 | 「同一端末内の公平」を MVP の定義として docs/UI に明示 |
| PSF-2 | **PASS（設計）** | A/B 層の best-of-N を ticket で遮断（S1〜S7）。定量根拠 §4-2 | 実装後に同じ 37 シナリオを本番コードで再検証 |
| PSF-3 | **PASS（設計）** | day-lock＋stamp＋golden test（S9） | `gameVersion` の fingerprint 実装と golden test |
| PSF-4 | **PASS（設計）** | server time・ticket dailyKey・grace 15分（S6） | クライアント `isExpiredDailySave` を `expiresAt` 基準へ |
| PSF-5 | **CONDITIONAL PASS** | app 層は書き込み0設計＋cache＋剪定（S10）。edge は一次情報で Hobby 利用可を確認 | 本プロジェクトの Vercel plan／利用条件の CEO 確認④ |

## 18. Production Ranking 総合判定

> **CONDITIONAL GO（設計）／Production deploy は NO-GO**
>
> 設計としては公開に耐える形に到達した。deploy へ進む条件は (a) 次Phaseで §19 の実装と本番コードでの再検証、(b) CEO 確認④（Vercel）、(c) §6-3 #8 の Production 公開承認。

---

## 19. 次Phase（Phase 4.6 想定）実装範囲

| # | 範囲 | 触る場所 | 触らない |
|---|---|---|---|
| 1 | `playerSecret`／ハッシュ照合 | `src/hooks/anonymousPlayerId.ts`、`src/server/ranking/identity.ts`（新） | ゲーム本体 |
| 2 | ticket store／`startRun`／`submitRun` 改修／HTTP `/start` | `src/server/ranking/*`、`schema.ts`（`daily_days`・`daily_tickets`・`daily_runs.game_version`） | `api/`（deploy 承認まで作らない） |
| 3 | `gameVersion`（fingerprint＋engineVersion）＋ golden replay test | `src/core/data/rules.ts`、`src/core/replay/gameVersion.ts`（新） | `ReplayInput` の形 |
| 4 | クライアント：start→ticket→START_GAME、ticket 永続化、非ランク fallback、`expiresAt` 基準の再開、UI 文言 | `useGameEngine`、`rankingClient`、`DailyChallengeScreen`、`GameOverOverlay` | `saveVersion` |
| 5 | leaderboard cache／body 上限／剪定 | `http.ts`、`postgresStore.ts` | — |
| 6 | 数値を `rules.ts` へ（`ticketTtlMinutes` 90／`dayEndGraceMinutes` 15／`maxBodyBytes` 65536／`leaderboardCacheSeconds` 15／`pruneEveryStarts` 16） | `rules.ts` | — |
| 7 | 実DB再検証：`postgres.integration.test.ts` に ticket 群を追加し、部分UNIQUE と FK を実DBで確認 | テスト | Neon schema は**移行 SQL を CEO 承認後に適用** |
| 8 | `secrets.test.ts` に `playerSecret` のログ・GET混入検査を追加 | テスト | — |

**次々Phase 候補**：C層対策としての server-side hidden nonce（seed 撹乱）。「shared seed」概念の変更を伴うため §6-3 #1 の CEO 判断事項。

---

## 20. CEO 判断が本当に必要な項目

本Phaseの設計判断はすべて AI 側で確定した（§3〜§14）。**新たに承認を求める項目は無い。** 既存の未決事項として残るのは次の2点のみで、いずれも本Phaseの成果物には影響しない：

1. **CEO 確認④（Phase 4.4 §11 継続）**：Vercel の現在 plan／利用条件で Functions と WAF rate limit を使ってよいか（§6-3 #6）
2. **Production 公開承認**（§6-3 #8）：次Phase実装と再検証の後

参考（AI判断として確定・監査可能）：run ticket 方式（start で消費）、TTL 90分、grace 15分、day-lock、client-held secret、edge 60 req/60 s、非ランク fallback、hidden nonce の次々Phase送り。
