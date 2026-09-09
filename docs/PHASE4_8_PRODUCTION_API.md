# Phase 4.8 — Daily Ranking Production API（実装 & Preview 準備）

Phase 4.6 の本番コードを、**Vercel Functions として実際に叩ける形**にする Gate。
Production 公開・本番API有効化は本Gateでは行わない。

---

## 0. 結論

| Gate | 判定 |
|---|---|
| API-1 route 実装（start / submit / leaderboard） | **PASS** |
| API-2 接続情報の扱い（server-side only） | **PASS** |
| API-3 playerSecret を DB・ログ・response に残さない | **PASS** |
| API-4 64KB body limit / ticket / identity / gameVersion / day-lock の維持 | **PASS** |
| API-5 kill switch の維持（`submissionEnabled=false`） | **PASS** |
| API-6 既存仕様の非破壊（normal / Daily / saveVersion 9 / seed / 3回） | **PASS** |
| API-7 回帰（test / tsc / lint / build） | **PASS** |
| API-8 Preview QA 手順 | **PASS**（`docs/PHASE4_8_PREVIEW_QA_RUNBOOK.md`） |
| API-9 Neon 実機での API 疎通 | **未実施**（Preview QA の手順3〜4。接続文字列が手元に無いため） |
| **総合** | **CONDITIONAL PASS** — Preview 実機確認（API-9）が残る |

**Production：NO-GO**（据え置き）。merge / push / deploy / Vercel設定変更 / `submissionEnabled=true` はいずれも未実施。

---

## 1. 監査：Phase 4.6 実装と Vercel 構成の現状

### 1-1. サーバー側（`src/server/ranking/`）

Phase 4.3〜4.6 で **HTTPの受け口まで完成していた**。`handleRankingRequest()` が
`{method, path, body, query, bodyBytes}` を受けて `{status, body, headers}` を返す、
ホスティング非依存の関数として存在する。3本の分岐（start / submit / leaderboard）、
拒否コード→ステータスの対応表、64KBの門番、キャッシュヘッダまで実装済み。

**したがって Phase 4.8 で書くべきものは「詰め替え層」だけ**だった。判定ロジックは1行も足していない。

### 1-2. Vercel 構成

| 項目 | 監査結果 |
|---|---|
| `vercel.json` | **存在しない**（Vite のフレームワーク自動検出で動いている） |
| `api/` | **存在しなかった**。Phase 4.3 が意図的に作らなかった（作れば次のdeployで自動公開されるため） |
| `@neondatabase/serverless` | **devDependencies** にあった（＝本番インストールで落ちうる） |
| `tsc -b` の対象 | `src` と `vite.config.ts` のみ。`api/` は型検査の外 |
| クライアント送信経路 | `src/hooks/rankingClient.ts` が既に `/api/ranking/start` と `/api/ranking/submit` へ POST する。既定 baseUrl は `/api`。`submissionEnabled=false` の間は即座に return する |
| leaderboard のクライアント | **存在しない**（UI未実装。サーバー側のみ） |

→ パスは既にクライアント側と一致していたので、**URLの設計変更は不要**だった。

---

## 2. 実装したもの

```
api/
  _lib/env.ts        … 環境変数の門番（process.env に触れる唯一の場所）
  _lib/handler.ts    … Request → handleRankingRequest → Response の詰め替え
  ranking/start.ts       … POST /api/ranking/start
  ranking/submit.ts      … POST /api/ranking/submit
  ranking/leaderboard.ts … GET  /api/ranking/leaderboard
```

### 2-1. なぜ Web標準シグネチャ（`export const POST = (req: Request) => Response`）か

64KBの門番は「**JSON解析より前に切る**」ことに意味がある（決定139 §7-2 T12）。
Node シグネチャ（`(req, res)`）ではランタイムが body を先に解析してしまい、門番の意味が薄れる。
Web標準なら `await request.text()` で生bodyを自分で読めるので、
①Content-Length で門前払い → ②実バイト数で切る → ③やっと解析する、の順序を保てる。

各ルートは `GET` と `POST` の両方を export している。これはランタイム既定の405ではなく、
このAPIの契約どおりの JSON（`{"error":"method_not_allowed"}`）を返すため。

### 2-2. 門番3枚

| # | 変数 | 既定 | 未設定時 |
|---|---|---|---|
| 1 | `RANKING_API_ENABLED` | **未設定＝閉** | 3本とも `503 api_disabled`（**DBにも触れない**） |
| 2 | `RANKING_DATABASE_URL` | 未設定 | `503 database_unconfigured` |
| 3 | `RANKING_PREVIEW_UNLOCK` | 未設定 | start / submit が `503 submission_disabled` |

**門番1を足した理由**が本Gateの中心。`api/` を作った瞬間、Phase 4.3 が避けていた
「次のdeployで自動公開される」状態に入る。しかも leaderboard の GET は kill switch の
**外側**にあるので、kill switch だけでは読み取りが開いてしまう。
そこで「環境変数を入れるまでは全部閉じている」を既定にした。
`api/` を作らないことが安全弁だったのを、**既定で閉じていることを安全弁に置き換えた**。

**門番3は production では無視する**。`VERCEL_ENV === 'production'` のとき
`submissionUnlocked` は必ず false になる（`api/_lib/env.ts`）。
環境変数のスコープを間違えて Production に入れても、本番のランキングは開かない。

### 2-3. kill switch の扱い（`rules.ts` は触っていない）

`handleRankingRequest` に **省略可能な `submissionEnabled`** を足した。省略時は
従来どおり `RULES.ranking.submissionEnabled`（＝false）を読む。既存の呼び出し・テストは挙動不変。

Preview で実地に start→submit を流すために、`rules.ts` の定数を true にする案は**却下した**。
定数は deploy されるコードそのものなので、Production にもそのまま乗ってしまう。
「コードは false のまま、環境ごとの値を渡す」形にすれば、Preview だけを開けられる。

### 2-4. 秘密の扱い

| 経路 | 対策 |
|---|---|
| DB | 列が存在しない（`schema.ts`。Phase 4.6 から） |
| response | `handleRankingRequest` は元から返さない。**加えて送信直前に機械確認**（`containsSecret`）。64桁の16進が本文に現れたら、その応答を送らず 500 にする |
| ログ | 例外の **`name` だけ**を出す。`message` / `stack` は出さない。Neon のドライバは不正なURLを渡されると**接続文字列そのものを例外メッセージに載せる**（Phase 4.4 で実際に踏んだ） |
| URL | `playerSecret` は body にのみ入る。query に載せない |
| クライアントバンドル | `VITE_` 接頭辞を使っていないので構造的に入らない。ビルド成果物への混入も検査（§4-3） |

### 2-5. deploy 面の付随変更

| 変更 | 理由 |
|---|---|
| `@neondatabase/serverless` を dependencies へ移動（lockfile も再生成） | devDependencies のままだと本番インストールで刈られてルートが落ちる |
| `tsconfig.api.json` を追加し `tsconfig.json` の references に登録 | `api/` が `tsc -b` の対象外だった |
| `.vercelignore` を追加 | **`api/` 配下の `.ts` はすべて Function になる**。テストを `api/ranking/` に置くと `/api/ranking/routes.test` が公開され、vitest を import している分 build も落ちる。テストは `api/_lib/` `api/_tests/`（先頭 `_` はルート化されない）に置いたうえで、`.vercelignore` でも二重に除外した。監査出力・migration SQL・docs も deploy から外している |
| `vercel.json` は**作らない** | 現在の Production は自動検出で動いている。rewrites を書くと `/api/*` や SPA の配信規則を変えてしまう。deploy 面の変更は最小に留める |

---

## 3. Phase 4.5〜4.7 の security / fairness 仕様の維持

判定は全部 `src/server/ranking/` のままなので、仕様は**素通し**で保たれる。
それを「素通しできている」ことまで含めて API 層のテストで固定した。

| 仕様 | どこで保証 | API 層のテスト |
|---|---|---|
| run ticket（開始で枠を消費） | `start.ts` | start→submit→leaderboard が一周する |
| 1日3回 | DB制約 + `insertTicket` | 4回目の start が 409 |
| client-held secret | `identity.ts` | 他人の `playerId` を名乗ると 400 |
| day-locked gameVersion | `lockDayVersion` | start 応答に `gameVersion` が入る |
| dailyKey はサーバーが決める | `dailyKeyOf(now)` | 応答の `dailyKey` がサーバー時刻由来 |
| 64KB body limit | `http.ts` + `_lib/handler.ts` | Content-Length / 実バイト数 / マルチバイトの3経路 |
| スコアはサーバー計算 | `submit.ts` | 応答にクライアント申告値が無い |
| leaderboard キャッシュ | `leaderboard.ts` | `s-maxage=15` が付く |

**CORS ヘッダは付けていない。** クライアントは同一オリジン（同じ Vercel deployment）から呼ぶので不要で、
付けないことで他オリジンのブラウザから叩けない状態を保てる。

---

## 4. 検証結果

### 4-1. テスト

| 項目 | 結果 |
|---|---|
| 全体 | **248 files / 3,092 passed / 18 skipped** |
| Phase 4.7 時点 | 245 files / 3,045 passed / 18 skipped |
| 増分 | **+3 files / +47 tests**（うち API 層 35、境界・秘密の guard 12） |
| skip 18件 | 実DB統合テスト。`RANKING_DATABASE_URL` を渡したときだけ走る |

新規・更新したテスト：

| ファイル | 件数 | 内容 |
|---|---|---|
| `api/_lib/handler.test.ts` | 23 | 門番3枚・64KB・405/400/500・秘密の非漏洩・Preview で一周 |
| `api/_lib/env.test.ts` | 9 | 既定は閉／`'1'` 以外を受け付けない／**production では unlock を無視** |
| `api/_tests/routes.test.ts` | 3 | production と同じ配線（`rankingRoute`→`process.env`）で3本とも閉じている |
| `src/server/ranking/rankingBoundary.test.ts` | 11 → 20 | 「`api/` を作っていない」を廃止し、**`api/` の形の検査**へ置換 |
| `src/server/ranking/secrets.test.ts` | 8 → 11 | 走査範囲に `api/` を追加。接続情報を読むのは2ファイルのみ、と固定 |

### 4-2. 静的検査・ビルド

| 項目 | 結果 |
|---|---|
| `npx tsc -b`（`api/` を含む3プロジェクト） | **PASS**（エラー0） |
| `npx oxlint .` | **PASS**（既存の warning 2件のみ。いずれも `scripts/phase3-audit/`。`api/` は0件） |
| `npm run build`（clean） | **PASS**（2.34s） |

### 4-3. クライアントバンドルへの混入検査

`dist/` に対して12個の語を走査し、**すべて0件**：
`RANKING_DATABASE_URL` / `RANKING_API_ENABLED` / `RANKING_PREVIEW_UNLOCK` /
`neon.tech` / `neondatabase` / `api_disabled` / `submission_disabled` /
`database_unconfigured` / `daily_tickets` / `daily_runs` / `attempt_no` / `submissionUnlocked`

さらに **バンドルのハッシュが変わっていない**ことを実測で確認した。
`src/server/ranking/http.ts` の変更を一時的に外して `vite build` した結果と、
変更を入れた状態の結果が**同一ハッシュ**（`index-CmKdoYU5.js`・389.90 kB）。
＝Phase 4.8 はクライアントを1バイトも変えていない。

### 4-4. Preview QA ランナーの自己検査

`scripts/phase48-api/preview-qa.mjs` を、ローカルの使い捨てサーバーへ向けて3通り実行した。

| 経路 | 結果 |
|---|---|
| 正しく閉じているサーバー | `3/3 ok`・終了コード **0** |
| 誤った応答を返すサーバー | `0/3`・NG の一覧を表示・終了コード **1** |
| 到達できないURL | 「到達できません」と表示・終了コード **1** |

この過程で自身のバグを1つ見つけて直した：`process.exit()` を使うと、fetch の keep-alive
ソケットが残った状態で強制終了になり、Windows の libuv がアサートで落ちて**終了コードが 127** になる
（＝QAの成否が読めない）。`process.exitCode` へ変更した。

### 4-5. 実施していない検証

**実DB統合テスト18件を本Gateでは再実行していない。** 接続文字列が手元に無いため。
- 最後の実行は Phase 4.7 の migration 適用直後（**18 passed / 1 skipped**、決定142）
- 本Gateは `postgresStore.ts` / `schema.ts` / `store.ts` を**1行も変更していない**ので、
  DB↔保存層の契約は Phase 4.7 の結果がそのまま有効
- **API 層と Neon の実機疎通は Preview QA 手順3〜4 で行う**（API-9）

---

## 5. Known Risks

| # | 内容 | 影響 | 緩和 |
|---|---|---|---|
| 1 | **Vercel の web シグネチャ検出が実機未検証**。`export const POST = (req: Request) => Response` を Vercel が web handler として拾うことをローカルでは確かめられない | 拾われないと全ルートが 500 か 404 | Preview QA 手順2が最初にこれを検出する（3本とも `503 api_disabled` が返れば検出は成功している）。落ちた場合は Node シグネチャ（`(req,res)`）へ切り替える |
| 2 | `api/` を作ったので、**次に master へ merge して deploy すると3本が本番に現れる** | 環境変数が無い限り 503 なので実害は無いが、URLの存在は露出する | 門番1（既定で閉）＋ Preview QA 手順5（Production が閉じていることの確認） |
| 3 | leaderboard の GET は kill switch の外側。Production で API を開けた時点で**誰でも読める** | ランキング機能として意図どおりだが、Neon Free の egress を消費する | `s-maxage=15` の CDN キャッシュ＋サーバー側15秒キャッシュ。公開判断は §6-3 #8 |
| 4 | `containsSecret` は「64桁の16進」を秘密とみなす。将来そういう値を正当に返す設計にすると 500 になる | 誤検知で応答が落ちる | 現行の応答には該当が無いことをテストで確認済み。増えたらテストが先に落ちる |
| 5 | Neon Free のクォータ（CU-hours / egress）を実測していない | Production 公開後に枯渇しうる | Preview QA で1周ぶんの消費を観測してから公開判断する |
| 6 | Vercel Function の region と Neon の region が一致しているか未確認 | 一致しないと1リクエストあたりの往復が増える | Preview QA で応答時間を見る |
| 7 | `RANKING_PREVIEW_UNLOCK` を Preview に入れたまま放置すると、Preview URL を知る人が枠を消費できる | Preview のボードが汚れる | RUNBOOK 手順6で外す。データは剪定で自然に消える |

---

## 6. CEO判断が必要な操作（本Gateでは未実施）

1. **Preview への push**（RUNBOOK 手順1）— 現在 branch は未push
2. Vercel の環境変数追加（Preview スコープ）— RUNBOOK 手順3〜4
3. `master` への merge と Production deploy — §6-3 #8
4. `RULES.ranking.submissionEnabled = true` — ランキングの本番公開そのもの
5. Production への環境変数投入
6. `VALIDATE CONSTRAINT daily_runs_ticket_fk`（決定141 §20）
7. Neon の有料プラン・Vercel のプラン変更が必要になった場合 — §6-3 #4・#6

---

## 7. 次の1手

`docs/PHASE4_8_PREVIEW_QA_RUNBOOK.md` の**手順1（Preview への push）にCEO承認**をもらう。
push 後は手順2〜5をスクリプトで流せる（1回あたり数分）。
手順5（Production が閉じていることの確認）まで ok なら、API-9 が閉じて Phase 4.8 は PASS になる。
