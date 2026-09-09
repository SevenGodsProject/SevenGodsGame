# Phase 4.8 — Preview QA RUNBOOK（Daily Ranking Production API）

**本書の手順1以降は、CEOが「Preview へ push してよい」と承認したあとにだけ実行する。**
Phase 4.8 の作業自体では手順0（ローカル）までしか行っていない。

| 用語 | 意味 |
|---|---|
| Preview | branch を push すると Vercel が作る、本番とは別URLのdeployment |
| Production | `master` の deployment（現在ランキングは1つも公開していない） |
| kill switch | `RULES.ranking.submissionEnabled`。**コード側は false のまま動かさない** |

---

## 0. 前提と、なぜこの順番なのか

Production API は **3枚の門番**の内側にある。Preview QA は、その門番を**1枚ずつ開けながら**
「開けていない段階では本当に閉じているか」を毎回確かめる、という順序で進める。
一気に全部開けると、「たまたま動いた」のか「門番が壊れている」のかが区別できない。

| # | 門番 | 環境変数 | 未設定のときの応答 |
|---|---|---|---|
| 1 | API 全体 | `RANKING_API_ENABLED=1` | 3本とも `503 api_disabled` |
| 2 | 接続先 | `RANKING_DATABASE_URL=<接続文字列>` | `503 database_unconfigured` |
| 3 | 提出 | `RANKING_PREVIEW_UNLOCK=1` | start / submit が `503 submission_disabled` |

**門番3は `VERCEL_ENV=production` では無視される**（`api/_lib/env.ts`）。
つまり同じ環境変数を Production に入れても本番のランキングは開かない。

### 接続情報の扱い

- 接続文字列は **Vercel の環境変数にだけ**入れる。チャット・ファイル・commit には残さない
- 環境変数のスコープは **Preview のみ**にチェックを入れる（Production には付けない）
- `VITE_` 接頭辞を**絶対に付けない**（付けるとクライアントバンドルに埋め込まれる）

---

## 手順0：ローカル（接続不要・Phase 4.8 で実施済み）

```
npx tsc -b
npx oxlint .
npx vitest run
npm run build
```

期待値：tsc / lint / build いずれもエラー0、`Test Files 248 passed`・`Tests 3092 passed | 18 skipped`。
（skip 18件は実DB統合テスト。`RANKING_DATABASE_URL` を渡したときだけ走る）

---

## 手順1：Preview へ push（**CEO承認が必要**）

```
git push -u origin feat/daily-ranking-phase4
```

Vercel が Preview deployment を作る。**この時点で環境変数はまだ入れない。**

> `master` への merge は行わない。Production は一切変わらない。

---

## 手順2：何も入れていない状態で「閉じている」ことを確かめる

```
node scripts/phase48-api/preview-qa.mjs --base-url https://<preview>.vercel.app --stage closed
```

期待値：`3/3 ok`（3本とも `503 api_disabled`）。終了コード 0。

**ここで200が返るなら、その先へ進まない。** 門番1が効いていない＝設計どおりでない。

---

## 手順3：API と接続先を開ける（読み取りだけ）

Vercel のプロジェクト設定 → Environment Variables で、**Preview スコープだけ**に追加する。

| 変数 | 値 |
|---|---|
| `RANKING_API_ENABLED` | `1` |
| `RANKING_DATABASE_URL` | Neon の接続文字列 |

追加したら **Preview を再デプロイ**する（環境変数は次のdeployから反映される）。

```
node scripts/phase48-api/preview-qa.mjs --base-url https://<preview>.vercel.app --stage read
```

期待値：全項目 ok。内訳は
- `GET /api/ranking/leaderboard?dailyKey=<今日>` → **200**、`cache-control` に `s-maxage=15`
- 不正な `dailyKey` → **400 bad_daily_key**
- `POST /api/ranking/start` / `submit` → **503 submission_disabled**（kill switch は閉じたまま）
- `GET /api/ranking/start` → **405 method_not_allowed**

**この段階が最も重要**：DBに繋がっていて読めるのに、提出だけは止まっている、という状態を目視する。

---

## 手順4：Preview だけ提出を開ける

| 変数 | 値 |
|---|---|
| `RANKING_PREVIEW_UNLOCK` | `1` |

**Preview スコープだけ**に追加して再デプロイ。

```
node scripts/phase48-api/preview-qa.mjs --base-url https://<preview>.vercel.app --stage full
```

期待値：全項目 ok。内訳は

| 検査 | 期待 |
|---|---|
| 1回目の start | 201・`attemptNo=1`・`dailyKey` はサーバーが決めた今日 |
| 同じ `clientRunId` の再送 | 200・`reused=true`（枠を食わない） |
| 他人の `playerId` を名乗る start | 400 `BAD_IDENTITY` |
| ticket 無しの submit | 4xx（受理されない） |
| 64KB超の body | 413 `payload_too_large` |
| 壊れたJSON | 400 `bad_request` |
| 2・3回目の start | 201 |
| **4回目の start** | **409 `ATTEMPTS_EXCEEDED`** |
| leaderboard | 200・応答に秘密が出ない |

### 手動で確かめること（スクリプトでは見られない）

1. **Vercel の Function ログに秘密が出ていない**
   Vercel → Deployment → Functions → Logs を開き、`playerSecret` / `postgres://` /
   `npg_` / `neon.tech` のいずれも出ていないこと。エラーが出ている場合も、
   出るのは `{"path": "...", "kind": "Error"}` の形だけであること
2. **ブラウザから実際に1回遊ぶ**
   Preview のURLを開き、Daily を1回プレイして結果が提出されること
   （`submissionEnabled` はコード側 false のままなので、**クライアントは送信しない**。
   ここで送信されないのは**正常**。API 側の疎通は上のスクリプトで確認済み）
3. **DevTools の Network で `playerSecret` がURLに出ていない**（bodyにのみ入る）

---

## 手順5：Production が閉じたままであることを確かめる

**Preview で開けたあとに必ずやる。** 環境変数のスコープ設定ミスを、ここで捕まえる。

```
node scripts/phase48-api/preview-qa.mjs --base-url https://<production>.vercel.app --stage closed
```

期待値：`3/3 ok`（Production は `503 api_disabled`）。

**ここで200が返ったら、直ちに Production の環境変数を外し、CEOへ報告する。**

---

## 手順6：後片付け

1. `RANKING_PREVIEW_UNLOCK` を Preview から**外す**（QAが終わったら開けたままにしない）
2. Preview で作った ticket / run は消さなくてよい
   Phase 4.6 の剪定（`pruneBefore`、`RULES.daily.retentionDays` 日より古い日を削除）と
   `daily_days` の CASCADE で自然に片付く。**QA で DELETE を手打ちしない**
3. 結果を `docs/DECISIONS.md` に追記する（値のみ。接続情報は書かない）

---

## 失敗したときの読み方

| 症状 | 意味 | 対処 |
|---|---|---|
| 全部 404 | ルートが関数になっていない | Vercel の build ログで `api/ranking/*` が Functions として出ているか確認 |
| 全部 500 | ドライバ or import で落ちている | Function ログの `kind` を見る。`@neondatabase/serverless` が dependencies にあるか |
| `database_unconfigured` が消えない | 環境変数のスコープ違い | Preview にチェックが入っているか、再デプロイしたか |
| leaderboard だけ 200 で start が 503 | **正常**（手順3の状態） | 手順4へ進む |
| start が 409 ばかり | その日の枠を使い切った | 翌日（JST 00:00）を待つか、別 identity で実行（スクリプトは毎回新規に作る） |
| 4回目が 201 になる | **重大**。3回勝負が壊れている | QAを止めてCEOへ報告 |

---

## Production 公開の前に別途必要なこと（本Gateの範囲外）

1. `RULES.ranking.submissionEnabled` を true にする判断（**CEO判断**・§6-3）
2. Production の環境変数投入（**CEO判断**・§6-3 #8）
3. `VALIDATE CONSTRAINT daily_runs_ticket_fk`（決定141 §20・**CEO判断**）
4. Neon Free のクォータ見積り（CU-hours / egress）と、上限に達したときの縮退方針
5. レート制限（Vercel 側 or WAF）。アプリ側では identity 量産を止められない（決定139 §3-3）
