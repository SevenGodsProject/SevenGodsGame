# Phase 4.3 — Daily Ranking Backend

- **日付**：2026-09-07
- **branch**：`feat/daily-ranking-phase4`（Phase 4.2 `9c4f803` の上に積む独立commit。merge・push・deploy いずれも未実施）
- **区分**：AI判断（CLAUDE.md §6-2）。CEOは「Phase 4.2 承認。Phase 4.3 Backend へ進め」を指示
- **基準**：Phase 4.1 Replay Foundation（決定132）／Phase 4.2 Action Log（決定133）
- **到達点**：**契約なしで作れるBackendの中身をすべて完成させ、外部契約・deployの直前で停止した**
- **やっていないこと**：**Neon 契約・Vercel plan 変更・Production deploy・`api/` エンドポイントの公開・実ネットワーク送信**。寿楽balance変更・score式変更・Daily seed変更・3回制限変更・JST reset変更・saveVersion変更もしていない

---

## 0. 「契約せずにBackendを完成させる」ための構え

§6-3 により Neon 契約（#6）・匿名IDの本番運用（#7）・Production 公開（#8）は CEO 判断事項で、
AI側では実行できない。一方で「契約が決まるまでBackendを書けない」わけでもない。そこで：

| 判断 | 内容 | 効果 |
|---|---|---|
| **保存層をポートにする** | `RankingStore`（6メソッド）だけを固定し、実体はメモリ実装のみ提供 | DBドライバへの依存ゼロ。契約後は6メソッドを埋めるだけ |
| **DDLは書くが実行しない** | `src/server/ranking/schema.sql` | 契約直後に流せる状態で、いま何も作らない |
| **`api/` を作らない** | HTTPの受け口は `src/server/ranking/http.ts` に置く | リポジトリ直下に `api/` があると **Vercelが次のdeployで自動公開**してしまう。merge時に「deployしない」を意図せず破らないため |
| **kill switch** | `RULES.ranking.submissionEnabled = false` | クライアントは一切通信しない。サーバーも 503 を返す |
| **ホスティング非依存** | `handleRankingRequest({method,path,body,query})` → `{status,body}` | Vercel / Node / Deno のどれになっても、ラッパーは詰め替えるだけ |

結果として、**Backendの中身は完成しており、テストで動作を確認できる**。
残っているのは「どこで動かすか」の契約と、その後の薄いラッパー1本だけになった。

---

## 1. 成果物

| ファイル | 区分 | 内容 |
|---|---|---|
| `src/server/ranking/types.ts` | 新規 | `SubmitRequest` / `RankingRun` / 拒否コード / `Leaderboard` |
| `src/server/ranking/deps.ts` | 新規 | サーバーが core から借りるものの集約 |
| `src/server/ranking/store.ts` | 新規 | `RankingStore` ポート ＋ メモリ実装 |
| `src/server/ranking/submit.ts` | 新規 | **提出の受理（信頼の中心）** |
| `src/server/ranking/leaderboard.ts` | 新規 | 順位の組み立て（`assignRanks` 経由） |
| `src/server/ranking/http.ts` | 新規 | フレームワーク非依存のHTTP受け口 |
| `src/server/ranking/index.ts` | 新規 | 公開エントリ |
| `src/server/ranking/schema.sql` | 新規 | Postgres/Neon DDL（**未実行**） |
| `src/hooks/anonymousPlayerId.ts` | 新規 | 匿名ID（乱数のみ・アカウントではない） |
| `src/hooks/rankingClient.ts` | 新規 | 提出クライアント（transport注入・kill switch） |
| `src/core/data/rules.ts` | 変更 | `RULES.ranking` 追加のみ |
| テスト5ファイル | 新規 | submit 16／leaderboard 9／http 9／boundary 11／client 13 ＝ **58件** |

**ゲーム本体（`src/core/engine`・`src/core/data` のゲームデータ・`src/components`・`src/core/replay`）の差分は 0。**

---

## 2. 信頼の境界（Security）

```
client ──{ playerId, clientRunId, ReplayInput }──▶ server
                                                    │
                                        dailyKey から seed・敵を再導出
                                                    │
                                        production engine で actions を再生
                                                    │
                                        VerifiedOutcome を算出 ─▶ 保存・順位
```

- **クライアントが送れるのは3つだけ。** score・win・HP・rngCursor は `ReplayInput` の型に
  フィールドが無く、送っても無視される（テストで固定）
- **サーバーは自分で計算した値しか保存しない。** `RankingRun` の列は
  `score`/`win`/`round`/`rngCursor`/`actionCount` いずれも `runReplay` の出力
- **レスポンスにも申告値を反射しない**（`score: 999999` を混ぜても返るのは検証済みスコア）
- **検証も順位規則も core の実装を借りる。** サーバー側に `getFinalScore` の再実装が
  無いことを境界テストで機械検査している（規則が2か所に存在しない）

---

## 3. 提出の受理（`submitRun`）

処理順（途中で落ちたら以降は行わない）：

| # | 検査 | 落ちたときのコード |
|---|---|---|
| 1 | 識別子の形式（乱数IDの形か。メール等は形式的にも通らない） | `BAD_IDENTITY` |
| 2 | **冪等判定**（同じ `clientRunId` が既にあるか） | — |
| 3 | 提出**試行**のレート制限（`RULES.ranking.maxSubmitAttemptsPerDay = 30`） | `RATE_LIMITED` |
| 4 | 今日のDailyか（JST基準） | `STALE_DAILY_KEY` |
| 5 | **本番エンジンでリプレイ** | `REPLAY_REJECTED`（＋Phase 4.1の内訳コード） |
| 6 | 1日の挑戦回数（`RULES.daily.attemptsPerDay = 3`） | `ATTEMPTS_EXCEEDED` |
| 7 | 保存 | — |

### 3-1. 冪等判定をレート制限より先に置いた理由

送信に成功したがレスポンスを受け取れなかったクライアントは、同じ `clientRunId` で再送する
（Phase 4.2 の設計）。これを「試行」として数えると、**通信が不安定な人ほど枠を失う**。
既に受理済みのrunの再送は枠を消費しない。

### 3-2. ただし「冪等だから素通し」にはしない

再送であっても**必ず再検証する**。結果（score・rngCursor・godId）が保存済みと一致して初めて
「同じrunの再送」と認め、違えば `RUN_ID_CONFLICT` で拒否する。
これがないと「一度正当なrunを通してから、同じIDで中身だけ差し替える」攻撃が通ってしまう。

### 3-3. 今日のDailyしか受け付けない

Daily seed は公開情報なので、日付を絞らないと「昨日の敵を一晩かけて最適化し、翌日提出する」
ができてしまう。JST境界（`14:59:59Z` は当日／`15:00:00Z` は翌日）で切り替わることをテストで固定。

### 3-4. 時刻は注入する

`submitRun(request, { store, now })`。サーバー内部で `Date.now()` を呼ばない
（境界テストで機械検査）。テストで日付境界を厳密に再現でき、実装が決定論的になる。

---

## 4. リーダーボードと同点規則

### 4-1. 【方針確定】1日3回のうちどれを出すか → **その日のベスト1件で競う**

Phase 4.2 の Known Risk 5（未決定事項）をここで確定した。**AI判断**（§6-2）。

- **採用**：プレイヤーごとにその日の最高スコア1件だけをランキングへ載せる
- **却下**：全3件を並べる案 — 1人で上位を占められてしまい、「その日の**最高スコア**を狙う」という
  Daily の趣旨（決定131）と合わない。上位帯が同一人物で埋まると競技として成立しない
- **却下**：最後の1件だけを載せる案 — 3回のうち最良を出せないのは、決定131 Step 7 で確認した
  「3回は同じ問題を学習して詰め直す機会」という性質と矛盾する
- 保存は3件すべて残す（監査可能性のため）。**表示のときに1人1行へ畳む**

### 4-2. 順位は必ず `assignRanks`（決定133）を通す

サーバーで独自にソートして順位を振ると、「同点は同順位」「先着は順位を決めない」が
実装のどこかで静かに崩れる。規則は1か所にしか存在させない。

| 性質 | 実装 |
|---|---|
| 同じスコアは同順位（1,1,3） | `assignRanks` |
| 同点人数を併記 | `tiedCount` |
| パーセンタイル | `topPercent` |
| 次の順位まであと○点 | `pointsToNextRank`（次の**異なる**スコアまでの差） |
| **先着は順位を決めない** | 提出時刻順で `assignRanks` に渡す＝**同順位内の表示順**にしか効かない |
| 自分の行は圏外でも返す | `self`（`limit` の外でも必ず含む） |

1,000人・137種（決定131 §6-2 の実測規模）でも規則が保たれることをテストで固定。

---

## 5. HTTP契約

| メソッド・パス | 成功 | 主な失敗 |
|---|---|---|
| `POST /ranking/submit` | `201`（新規受理）／`200`（再送） | `503` kill switch off ／`400` 形式不正 ／`409` 期限切れ・回数超過・ID使い回し ／`422` 検証失敗 ／`429` レート制限 |
| `GET /ranking/leaderboard?dailyKey=&playerId=&limit=` | `200` | `400` 日付キー不正 |

`limit` は `RULES.ranking.leaderboardLimit`（100）で頭打ち。
レスポンスに含めるのは**サーバーが計算した値**だけ（`score` / `win` / `round` / `bestScore` / `runsUsed`）。

---

## 6. 匿名プレイヤーID

**これはアカウントではない。** ログインもメールアドレスも表示名も無い。
端末で生成した乱数16進32桁を localStorage に置いているだけで、サーバーはこの文字列以外の
身元情報を受け取らない。目的は「同じ端末からの3回の挑戦を1人ぶんとして数える」ことだけ。

| 性質 | 状態 |
|---|---|
| 個人情報を含まない | 乱数のみ。端末・ブラウザ・時刻・seed から導かない |
| 端末をまたいで同期しない | 追跡に使えない |
| 消せる | `clearAnonymousPlayerId`。localStorageを消せば別人になる |
| 独自のID実装をしない | ブラウザ標準の `crypto.getRandomValues` のみ |

**残る性質**：localStorage を消すか別ブラウザを使えば新しいIDになるため、
1日3回の制限は「同じ端末の同じブラウザ」でしか効かない。匿名を維持する以上避けられない
トレードオフで、実名アカウントの導入は §6-3 #7 の CEO 判断事項。**Known Risk に明記**。

---

## 7. 提出クライアント

- `RULES.ranking.submissionEnabled` が **false** の間は**何もせず `disabled` を返す**（通信ゼロ）
- 通信手段は `transport` で注入する（`fetch` を直接呼ばない）。テストは実サーバーを
  メモリ実装の上で直接呼ぶ「ループバック」で end-to-end を確認している
- 送るのは Phase 4.2 の控え（`pendingRuns`）にある `{ clientRunId, input }` ＋ 匿名ID
- 受理（200/201）→ 控えから削除／一時失敗（5xx・429）→ **控えを残して次回再送**／
  恒久拒否（その他4xx）→ 控えから削除（何度送っても通らないため）
- 通信例外でも控えは失われない

**UIへの接続はしていない**（`flushPendingRuns` はまだどこからも呼ばれず、バンドルにも入らない）。
自動送信のタイミング・失敗表示は Phase 4.4 のUI課題。

---

## 8. QA

| 項目 | 結果 |
|---|---|
| `tsc -b` | **PASS** |
| `oxlint` | **PASS**（警告2件は `scripts/phase3-audit/` の既存・無関係） |
| `npx vitest run` | **237 files / 2,908 tests 全PASS**（Phase 4.2は 232 / 2,850。**+5ファイル・+58テスト**、既存テストは1件も変更していない） |
| clean build | **PASS**（2.30s） |
| Phase 4.0 harness | `parity.audit.ts` 7/7 PASS・`out/*.json` md5 **完全一致＝再simulationなし** |
| Phase 4.1 / 4.2 | `src/core/replay` `src/hooks` 全テスト PASS（66ファイル／633テスト） |

### バンドル

| | Phase 4.2 | Phase 4.3 |
|---|---|---|
| CSS | `index-CDbAuk7l.css` | **同一ハッシュ（変更ゼロ）** |
| JS | 383,480 B | 383,570 B（**+90 B**、gzip 117.62→117.66 kB） |

増分は `RULES.ranking` の設定値だけ。**`src/server/**` はバンドルに入っていない**
（ブラウザ側から到達しないことを境界テストで機械検査）。`rankingClient` もまだUIから
呼ばれないため tree-shake されている。

---

## 9. Failure Gate

| 条件 | 判定 |
|---|---|
| client scoreを信用する構造 | **無し**（型に無い・レスポンスにも反射しない） |
| 検証・順位規則の二重実装 | **無し**（core を借りる。境界テストで機械検査） |
| payloadに個人情報 | **無し** |
| サーバーがブラウザAPI・DBドライバ・環境変数に依存 | **無し**（外部import 0件） |
| クライアントがサーバーコードを取り込む | **無し**（バンドル未収録） |
| `api/` の自動公開 | **無し**（作っていない） |
| 契約なしに外部サービスへ接続 | **無し**（kill switch off・通信ゼロ） |
| saveVersion / Daily seed / 3回制限 / JST reset / score式 変更 | **無し** |
| 寿楽balance変更混入 | **無し**（engine・ゲームデータ差分0） |
| Phase 4.0 / 4.1 / 4.2 regression | **無し** |

> ## **PASS**

---

## 10. Known Risks

1. **本番環境が無い。** Neon 契約（§6-3 #6）が未承認のため、`RankingStore` の Postgres 実装と
   `api/` の薄いラッパーだけが未着手として残っている。メモリ実装でしか動かしていないので、
   **実DBでの挙動（一意制約違反・同時実行・接続断）は未検証**。
2. **匿名IDは端末単位。** localStorage を消す／別ブラウザを使うと別人になり、1日3回の制限を
   回避できる。匿名を保つ以上避けられず、これ以上の対策は実名アカウント（§6-3 #7 CEO判断）が要る。
3. **同時実行の競合は未対策。** メモリ実装は逐次実行前提。実DBでは「3回目の判定と挿入」の間に
   割り込まれると4件入りうる。Postgres実装時に**トランザクション**か
   「主キー `(daily_key, client_run_id)` ＋ 挿入後カウント」で閉じる必要がある（`schema.sql` に主キーは用意済み）。
4. **レート制限はプレイヤーID単位のみ。** IP単位の制限はホスティング側の機能に委ねる想定で、
   本Phaseでは実装していない（IPを扱うとプライバシー方針が変わるため、CEO判断の材料が要る）。
5. **クライアントの送信タイミングが未接続。** `flushPendingRuns` を呼ぶ場所（決着時／起動時／
   リトライ間隔）は Phase 4.4 のUI課題。
6. **リーダーボードのページングが無い。** 上位100件＋自分の行だけ。参加者が増えたら
   カーソルページングが要る。
7. **Phase 4.2 からの継続**：記録できないrun・途中離脱の告知UIが未実装／実機QA未実施／
   `dailyRunLogAvailable` が表示に使われていない。
8. **寿楽の G1 FAIL** は別Balance Patchとしてbacklog（決定131 §13-3）。
9. **`useGameEngine.ts` の `setStakeResult(null)` 重複** は今回も未修正（cleanup backlog）。

---

## 11. Phase 4.4 への引き継ぎ（CEO承認後）

| # | やること | 前提 |
|---|---|---|
| 1 | `RankingStore` の Postgres 実装（6メソッド）＋ `schema.sql` の適用 | **Neon 契約（CEO判断）** |
| 2 | `api/ranking/[...].ts`（Vercel Function）で `handleRankingRequest` を呼ぶ薄いラッパー | 同上 |
| 3 | `RULES.ranking.submissionEnabled = true` へ | Backend 本番稼働の承認 |
| 4 | ランキングUI（同順位・同点人数・パーセンタイル・あと○点） | `assignRanks`（実装済み） |
| 5 | 送信タイミングと失敗表示、記録できないrunの告知 | Phase 4.2 の `dailyRunLogAvailable` |
| 6 | 実機QA（Dailyプレイ→提出→順位表示） | 1〜5 |

**実行**：`npx vitest run src/server src/core/replay src/hooks`（`npm test` にも含まれる）
