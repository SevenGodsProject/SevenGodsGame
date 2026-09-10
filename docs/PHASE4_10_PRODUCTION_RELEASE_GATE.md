# Phase 4.10 — Production Release Gate（ランキング機能の公開前監査）

Phase 4.9 までで **ランキングは「作れた」**。本Gateは「**公開してよいか**」を、
実装を変えずに、手順・安全装置・乱用耐性・運用・ロールバックの観点で監査する。

**本Gateでは Production に触れていない。** master merge・Production deploy・Production 環境変数・
`submissionEnabled=true`・Neon schema 変更・DELETE・課金／プラン変更はいずれも未実施。
実施したのは、コードの読解、Preview への **読み取りのみ**の計測、既存テストの再実行、文書化である。

---

## 0. 結論

| Gate | 判定 | 一言 |
|---|---|---|
| G1 Production Release 手順 | **CONDITIONAL PASS** | 手順は3段階で確定（§1）。ただし G4 の Blocker を先に直す |
| G2 Kill Switch / Rollback | **FAIL → 要修正** | 「board を残して submit だけ閉じる」手段が **Production には無い**（§2） |
| G3 Rate Limit / Abuse | **CONDITIONAL PASS** | app 層は十分。edge の1本（Vercel WAF・Hobby で無料）を公開時に入れる（§3） |
| G4 セキュリティ | **FAIL → 要修正（1件）**／他は PASS | **決着した run をクライアントが提出しない**（§4-0）。防御そのものは健全 |
| G5 Neon Free 運用 | **PASS**（監視条件つき） | 1,000人/日規模で余裕。region の不一致で1クエリ ≈200 ms（§5） |
| G6 Production 環境変数 | **PASS** | 必要なのは **2キーだけ**（§6） |
| G7 Public Release Checklist | **PASS（作成済み）** | §7 |
| **総合** | **NO-GO（現時点）** | Blocker 2件を直せば GO 可能。どちらも小さい |

**Blocker は「防御が弱い」ではなく「配線が足りない」**。ランキングの信頼モデル（ticket・replay 検証・
秘密の分離・day-lock）は Phase 4.5〜4.8 のまま健全で、今回の監査でも崩れなかった。

---

## 1. G1：Production Release 手順（どの順序なら危険な中間状態を作らないか）

### 1-1. 構造の確認（なぜ順序が問題になるか）

- `api/ranking/*` は **master に merge した瞬間、次の deploy で Production に現れる**（`api/` は Vercel が自動で Function にする）。
  ただし `RANKING_API_ENABLED` が無い限り **3本とも `503 api_disabled`**（`api/_lib/handler.ts` 門番1。DB にも触れない）。
- サーバーの提出ゲートは `submissionEnabled: env.submissionUnlocked ? true : undefined` で、
  **production では `env.ts` が必ず `submissionUnlocked=false` にする**。つまり production のサーバー側ゲートは
  **クライアント定数 `RULES.ranking.submissionEnabled` そのもの**（`undefined` → 定数へフォールバック）。
- したがって **`submissionEnabled=true` の1行を deploy した瞬間に、クライアントの送信とサーバーの受理が同時に開く**。
  「サーバーだけ開いてクライアントが閉じている」「その逆」という中間状態は**構造的に存在しない**。
- `RULES.ranking` は `gameVersion` の指紋から除外されている（`gameVersion.ts:66-67`、`gameVersion.test.ts:138`）。
  **kill switch を切り替えても `gameVersion` は変わらず、day-lock（決定142）と衝突しない**。

### 1-2. 推奨順序（3段階・各段階で止まれる）

| 段 | 操作 | 直後の Production の状態 | 確認（§7） | 戻し方 |
|---|---|---|---|---|
| **R0** | Blocker 2件を branch で修正・QA（§4-0・§2-3） | 変化なし | テスト・Preview | — |
| **R1** | `feat/daily-ranking-phase4` → master `--no-ff` merge → 自動 deploy | UI：Daily 画面に「まだ準備中です」。API：3本とも **503 `api_disabled`** | C-1〜C-4 | `git revert -m 1 <merge>` → push |
| **R2** | Production に `RANKING_API_ENABLED=1`・`RANKING_DATABASE_URL` を投入 → **再デプロイ** | board **読める**（200・空）。start/submit **503 `submission_disabled`**。UI「閲覧のみ」 | C-5〜C-8 | 変数を外す → 再デプロイ（R1 へ戻る） |
| **R3** | `submissionEnabled: true` の1行 commit → master → deploy | **公開**。start 201 → submit 201 → board に載る | C-9〜C-18 | §2 |

**R1 と R2 の間、R2 と R3 の間は何日空けてもよい。** R2 で止めれば「読めるが書けない」状態を
外部ユーザーに見せられる（Phase 4.9 の Preview と同じ）。

**R1 のリスク**：branch は master から 32 commits 先。merge は fast-forward 可能（master 側に新規 commit 無し）だが、
**`--no-ff` で merge commit を残す**（決定130 と同じ。revert の単位を1つにするため）。

### 1-3. 判定：CONDITIONAL PASS

順序は確定。R0 が終わるまで R1 に進まない。

---

## 2. G2：Kill Switch / Rollback

### 2-1. 現状で「即時に止める」手段

| 手段 | 効果 | 所要 | 副作用 |
|---|---|---|---|
| **K1** Production の `RANKING_API_ENABLED` を外す → 再デプロイ | 3本とも 503。**DB にも触れない** | 2〜3分（決定147 の落とし穴：**外すだけでは効かない、必ず再デプロイ**） | **board も消える**。UI は「まだ準備中です」に落ちる。ゲームは遊べる |
| **K2** `submissionEnabled: false` の revert commit → deploy | start/submit 503、**board は残る** | 2〜3分（push → build） | **コード deploy が要る** |
| **K3** merge commit の revert → deploy | Phase 4.x 全体を戻す | 3〜5分 | UI も Phase 4.9 以前に戻る |
| **K4** `RANKING_DATABASE_URL` を外す → 再デプロイ | 3本とも `503 database_unconfigured` | 2〜3分 | K1 と同じ。K1 の方が意図が明確 |

**DB を壊さない**：K1〜K4 のいずれも DB には何も書かない。剪定（`pruneBefore`）は `start` の中でしか走らないので、
提出が閉じれば **DB は完全に静止する**。ロールバックで DROP／DELETE を打つ場面は無い。

### 2-2. 足りないもの（FAIL の理由）

CEO の要件「**leaderboard は維持しつつ submit だけ閉じる**」を **環境変数だけで**実現する手段が、
**Production には存在しない**。

- `RANKING_PREVIEW_UNLOCK` は「開ける」向きの変数で、しかも production では無視される（設計どおり）
- 「閉める」向きの変数が無いので、submit だけ止めるには **K2＝コード deploy**しかない

K2 でも 2〜3分で閉じるので致命的ではないが、緊急時に「git 操作ができる人」が要る点と、
build が失敗したら閉じられない点が弱い。

### 2-3. 必須修正：閉める向きの kill switch（環境変数）

**`RANKING_SUBMISSION_DISABLED=1`** を **全環境で**読む1本を `api/_lib/env.ts` に足す。

```
submissionUnlocked = unlockRequested && vercelEnv !== 'production'   // 既存（開ける向き・Preview専用）
submissionForcedOff = read('RANKING_SUBMISSION_DISABLED') === ENABLED // 追加（閉める向き・全環境）
→ handler: submissionEnabled = submissionForcedOff ? false : (submissionUnlocked ? true : undefined)
```

- production で `false` を**明示的に**渡せるようになる（今は `undefined` → 定数 `true` へ落ちる経路しか無い）
- 変数を**足して**再デプロイ＝閉じる。**外して**再デプロイ＝再開。コードに触らない
- `env.test.ts`／`routes.test.ts` に「production で `RANKING_SUBMISSION_DISABLED=1` なら start/submit が 503、board は 200」を足す
- 変更は `api/_lib/env.ts`・`handler.ts` の数行。`src/server` と `src/core` には触れない（`gameVersion` 不変）

**これで K0（変数1本・board 維持・DB 静止・コード不要）が手に入る。** K1 は「DB ごと切り離す」用に残す。

### 2-4. Rollback 手順（確定版）

```
[提出だけ止めたい]      K0: RANKING_SUBMISSION_DISABLED=1 を Production に追加 → 再デプロイ → start{} が 503 を確認
[DB ごと切り離したい]   K1: RANKING_API_ENABLED を Production から削除 → 再デプロイ → board が 503 を確認
[コードを戻したい]      K3: git revert -m 1 <merge commit> → master push → deploy → /api/ranking/* が 404 を確認
[再開]                  逆順。変数は「削除／追加 → 必ず再デプロイ」。行が複数残っていないかを毎回確認（決定151）
```

**Rollback test は公開前に Production で実施する**（§7 C-19）。K0 と K1 を実際に1回ずつ通し、
所要時間と確認コマンドを記録してから R3 に進む。

### 2-5. 判定：FAIL（§2-3 の修正で PASS になる）

---

## 3. G3：Rate Limit / Abuse 対策

### 3-1. 現状実装の監査（経路別）

| 経路 | 書き込み前の門番 | 上限 | 未対策 |
|---|---|---|---|
| **start** | method → kill switch → 64KB → 形式 → **identity 照合（秘密のSHA-256）** → day-lock → 冪等 | **3 ticket/日/identity**（DB制約 `daily_tickets_attempt_range`＋部分UNIQUE） | identity 量産（sybil）。1 identity ≈ players 1行 + ticket ≤3行 |
| **submit** | 同上 → **ticket 必須（無ければ書き込み0）** → 冪等（再送も再検証） → closed/expired → 版 → **ここで初めて書く** | **30 試行/日/identity**（`players.attempt_count`）。replay は `maxActions 400` | 同上。replay 検証は CPU 数ms/件 |
| **leaderboard** | dailyKey 形式 → `limit ≤ 100` に clamp | **15秒 cache**（function 内・dailyKey 単位）＋ `s-maxage=15, stale-while-revalidate=60`（CDN） | `playerId` 付き URL は人ごとに別 cache key → 人数ぶんの DB read／15秒 |

**IP は一切扱っていない**（DB の禁止列テストに `ip` を含む）。アプリ層では identity 単位でしか数えられない。

### 3-2. 公開に必要な最低限

**edge に1本だけ**：Vercel WAF Rate Limiting（決定 Phase 4.5 §7 で一次情報を確認済み。
**Hobby で利用可・1 rule/project・キー IP または JA4**）。

| 項目 | 推奨値 |
|---|---|
| path | `/api/ranking/*` |
| key | IP |
| window / limit | **60秒 / 60 req** |
| action | 429 |

根拠：正当利用の上限は「start 3 ＋ submit 数回 ＋ board 数回」/分。60/分は 10倍以上の余裕。
1 IP からの identity 量産は **最大 86,400 start/日 ≈ 26 MB/日** に抑えられ、Neon Free の 0.5 GB を
1日で埋める経路が消える（rule 無しでは理論上 1日で埋まりうる）。

**これは Vercel ダッシュボードの設定であり、コードには入らない。設定は CEO 操作**（§8）。
設定時に **有料機能だと判明した場合は設定せず停止し、CEO 承認事項として上げる**（§6-3 #6）。
その場合の代替は「app 層のみで公開 ＋ Neon の使用量を毎日見る ＋ 異常時は K0/K1」。

### 3-3. 判定：CONDITIONAL PASS（edge rule 1本を公開時に設定）

---

## 4. G4：セキュリティ監査

### 4-0. 【Blocker】決着した run をクライアントが提出しない

**事実**：`flushPendingRuns()`（提出）を呼んでいるのは **`startRankedRun()` の中の1箇所だけ**
（`src/hooks/rankingClient.ts:132`）。決着時（`useGameEngine.ts:242`）は `enqueuePendingRun` で
**控えに入れるだけ**で、送らない。

**結果（`submissionEnabled=true` で公開した場合）**：

| プレイヤーの行動 | 提出されるか |
|---|---|
| 1回遊んで終わる | **提出されない**（永遠に） |
| 2回目を始める | 1回目が **2回目の start 直前**に送られる。ただし 1回目の ticket 発行から **90分**（TTL）を過ぎていれば `410 TICKET_EXPIRED` → 恒久拒否として**控えから捨てられる** |
| 3回目を始める | 2回目が同様に送られる。**3回目は当日中に提出されない** |
| 翌日 Daily を開く | 前日分は ticket 期限切れ → 410 → 捨てられる |

つまり **その日の最後の1回は必ず載らず、1日1回の人は一度も載らない**。
Phase 4.3 の Known Risk 5（「送信タイミングは Phase 4.4 の UI 課題」）がそのまま残っていた。
Phase 4.8／4.9 の提出QAは **API を直接叩いて**通したため（決定146・150）、この配線の欠落を踏まなかった。

**必須修正**（実装は本Gateの範囲外。次の1手で行う）：
1. **決着時に `flushPendingRuns()` を呼ぶ**（`useGameEngine.ts` の daily 決着分岐。`enqueuePendingRun` の直後）。
   失敗しても控えは残るので、既存の再送設計（次の start 前・冪等）はそのまま生きる
2. **Daily 画面を開いたときにも1回呼ぶ**（`DailyChallengeScreen` mount 時）。通信断で決着時に送れなかった分を、
   TTL 90分以内に拾う機会を増やす
3. `flushPendingRuns` の呼び出しを検査するテストを足す（呼ばれていないと落ちる形。Phase 4.9 の教訓：**壊れた行の文字列比較にしない**）
4. Preview で **UI だけで**（API を直接叩かずに）start 201 → 決着 → submit 201 → board に載る、を通す

### 4-1. 監査項目（防御そのもの）

| 項目 | 実装 | 判定 |
|---|---|---|
| playerSecret / publicId | 端末は 256bit の秘密を持ち、公開IDは SHA-256 先頭32桁。サーバーは導出し直して**定数時間比較**（`identity.ts:80-83`）。秘密は POST body のみ・DB 列なし・ログなし | **PASS** |
| secret leakage（応答） | `containsSecret`：`playerSecret` 文字列または 64桁hex が応答にあれば **500 に落として出さない**（`handler.ts:44-58`）。Preview 実測で start/submit/board の全応答に出ないことを確認済み（決定150） | **PASS** |
| secret leakage（ログ） | `console.error` は path と例外の**名前だけ**（Neon ドライバの例外は接続文字列を含みうるため。Phase 4.4 の教訓） | **PASS** |
| ticket 再利用 | 同 `clientRunId` の start は冪等（同じ ticket）。submit 済み ticket への再提出は**再検証したうえで**一致なら duplicate、不一致なら `RUN_ID_CONFLICT`。他人の ticket は `BAD_IDENTITY` | **PASS** |
| replay 改ざん | クライアントの申告値は**入力に存在しない**。サーバーが本番エンジンでリプレイして score/win/round を計算し、それだけを保存・返却。Preview 実測で 205 点が一致（決定150） | **PASS** |
| attempt 制限 | ticket ≤ 3/日（DB 制約。アプリのカウントは事前判定のみで最終権限は `insertTicket`）。並列 start は再採番せず1枚に畳む | **PASS** |
| Sybil | **塞げない**（匿名の帰結。決定139 §3-3 で明示済み）。緩和：identity 生成だけでは何も起きず、枠を得るには `/start` の往復＝edge rate limit の対象 | **CONDITIONAL**（§3-2 の rule 前提） |
| endpoint abuse | GET/POST の取り違えは 405。未知 path は 404。body は解析前に 64KB で切る（Content-Length と実バイトの両方） | **PASS** |
| body size | `maxBodyBytes 65536`（400 action で ≈20KB）。`maxActions 400` | **PASS** |
| DB injection | 全クエリが `$1..$n` のプレースホルダ。列名は定数文字列（`RUN_COLUMNS`/`TICKET_COLUMNS`）。`dailyKey` は `isValidDailyKey` 通過後にのみ `::date` へ | **PASS** |
| CORS / same-origin | CORS ヘッダを**一切出さない** → ブラウザからの cross-origin は preflight で失敗＝同一オリジン専用。`x-content-type-options: nosniff`・`referrer-policy: no-referrer`・POST は `no-store` | **PASS** |
| Preview / Production の env 分離 | `submissionUnlocked = unlockRequested && vercelEnv !== 'production'`。**production で unlock 変数を入れ間違えても開かない**（`env.test.ts`） | **PASS** |
| Production への内部情報露出 | `gate` ヒントは production では付かない（`withGateHint`） | **PASS** |
| gameVersion / day-lock | 当日の版を固定。deploy で版が変わった日は新規 start 不可（423）、進行中 run は voided で枠返還 | **PASS** |

### 4-2. 見つけた注意点（Blocker ではない）

- **Preview と Production が同じ Neon DB を共有する構成になる**（`RANKING_DATABASE_URL` が同じ値なら）。
  Preview で unlock して QA すると Production の当日ボードに行が載る。2026-09-10 のテスト行（205点）が既にある。
  → §8 で「Preview 用に Neon branch を切る」を推奨（無料機能）。それまでは**公開後に Preview を unlock しない**を運用ルールにする
- `daily_runs_ticket_fk` は **NOT VALID** のまま（決定141 §20）。新規行には効いているので公開の妨げにはならない。
  legacy 行が剪定で消えた後に `VALIDATE CONSTRAINT`（CEO 承認事項のまま）
- Vercel の request log には IP が残る（プラットフォーム既定）。アプリ DB には入らない。プライバシー表記があるなら整合を確認

### 4-3. 判定：FAIL（§4-0 のみ。修正後 PASS）

---

## 5. G5：Neon Free 運用

### 5-1. 一次情報と見積り（Phase 4.5 §7-3 を再確認）

| 制限（Neon Free） | 値 | 本設計での消費見積り（1,000人/日） |
|---|---|---|
| storage | 0.5 GB/project | ≈0.8 MB/日 × 30日保持 ≈ **25 MB（5%）**。剪定は `start` の 1/16 で自動 |
| compute | 100 CU-hours/月、autosuspend 5分 | 1 req ≈ 数ms のクエリ。10,000 req/日でも無視できる。低トラフィック時は 0 |
| egress | 5 GB/月 | board 1回 ≈10 KB、cache 15秒 → DB 読み出し ≤ 5,760回/日 ≈ **58 MB/月** |
| 接続 | pooled（HTTP ドライバ、接続プール無し） | Function ごとに HTTP。同時接続の枯渇は起きない |
| **上限到達時** | **翌月まで compute 停止** | API は `500 internal_error` → UI は「取得できませんでした」／start は ranked:false → **ゲームは遊べる** |

### 5-2. 今回の実測（Preview・読み取りのみ）

| 経路 | 応答時間（日本 → edge kix1 → function **iad1**） |
|---|---|
| start（空body・DB 未到達） | **≈235 ms**（3回：234/245/303） |
| board（cache MISS・DB 1クエリ） | **≈440 ms**（warm 4回：439/479/442/436）、cold 879 ms |
| board（CDN HIT） | 30〜60 ms |

DB 1クエリで **≈200 ms 増える**＝ **Function（iad1）と Neon の region が離れている**。
`start` は直列で 5〜6 クエリ、`submit` は 5 クエリ＋replay なので、体感 **1〜1.5秒**になる。
致命的ではないが、**Vercel の Function region を Neon と同じ側に寄せる**（Project Settings → Functions → Region。
Hobby で1リージョン選択可・無料）だけで半分以下になる。Neon の region は Neon console で確認（CEO 操作）。

### 5-3. 監視条件（公開後・週1）

- Neon console：storage・compute hours・egress の月内消費。**compute 50% 到達で K0 を検討**
- Vercel：Function invocations／errors。`500 internal_error` の連続は Neon 側の停止を疑う
- 剪定が走っているか：`daily_days` の最古行が 30日以内か（読み取り SQL のみ）

### 5-4. 判定：PASS（region 調整を推奨）

---

## 6. G6：Production 環境変数（必要なキーだけ）

| キー | Production に | 値の性質 | 役割 |
|---|---|---|---|
| `RANKING_API_ENABLED` | **要る**（R2 で投入） | `1` | 門番1。無ければ全経路 503 `api_disabled` |
| `RANKING_DATABASE_URL` | **要る**（R2 で投入） | Neon の接続文字列（**秘密**。本書には記さない） | 門番2。無ければ 503 `database_unconfigured` |
| `RANKING_PREVIEW_UNLOCK` | **入れない** | — | production では無視されるが、行を残すと混乱の元（決定151） |
| `RANKING_SUBMISSION_DISABLED` | **平常時は入れない**（§2-3 で追加する緊急停止用） | `1` | 足して再デプロイ＝submit だけ閉じる |
| `VERCEL_ENV` | Vercel が自動で入れる | `production` | `env.ts` の production 判定に使う。**手で入れない** |

**スコープ**：上の2キーは **Production のみ**に投入。Preview の2キー（branch 限定）はそのまま。
投入後は **必ず再デプロイ**（決定146/147）。**同名の行が複数無いか**を投入時に確認（決定151）。

---

## 7. G7：Public Release Checklist（公開直前に CEO が確認する）

各段の直後に、上から順に。**1つでも落ちたら次の段へ進まない。**

### R1 直後（merge・deploy 済み、env 無し）

- [ ] **C-1** merge commit のハッシュを記録（`git log -1 master`）
- [ ] **C-2** Production の deploy commit がその merge commit（Vercel Deployments）
- [ ] **C-3** `/` 200、配信バンドルが master のクリーンビルドと一致
- [ ] **C-4** `GET /api/ranking/leaderboard?dailyKey=<今日>` → **503 `api_disabled`**、`POST /api/ranking/start {}` → 503 `api_disabled`
- [ ] **C-4b** Daily 画面に「今日のランキングはまだ準備中です」が出て、`挑戦開始` が押せる。通常モードは無変化

### R2 直後（env 2キー投入・再デプロイ済み）

- [ ] **C-5** `GET /api/ranking/leaderboard` → **200**、`totalPlayers` が想定どおり（初日は 0、または Preview テスト行が無いこと）
- [ ] **C-6** `POST /api/ranking/start {}` → **503 `submission_disabled`**（`gate` ヒントが**付かない**こと＝production 判定が効いている）
- [ ] **C-7** `POST /api/ranking/submit {}` → 503 `submission_disabled`
- [ ] **C-8** Daily 画面にボードと「現在は閲覧のみです」が出る。応答に `playerSecret`／64桁hex が無い
- [ ] **C-8b** 応答時間：board MISS < 1秒、start < 1秒（region 調整後）

### R3 直前

- [ ] **C-9** §4-0 の修正が master に入っている（決着時に提出する）
- [ ] **C-10** §2-3 の kill switch が master に入っている（`RANKING_SUBMISSION_DISABLED`）
- [ ] **C-11** edge rate limit rule が有効（§3-2）。Firewall overview で rule を目視
- [ ] **C-12** `gameVersion` が Preview と同一（`1.da595899c6a9db43`）。違えば **その日は day-lock で新規 start 不可**になるので、**JST 0:00 直後に deploy**する
- [ ] **C-13** Rollback test 済み（C-19）

### R3 直後（公開）

- [ ] **C-14** 実機で1回遊ぶ：**start 201**（attemptNo 1）→ 決着 → **UI だけで submit 201** → board に「あなた」の行
- [ ] **C-15** サーバー score と画面 score が一致（表示は ×10）
- [ ] **C-16** 3回遊んで 4回目の start が **409**。UI が「今日の挑戦は終了」
- [ ] **C-17** 同点が2人以上いる日に順位が 1,1,3 になっている（無ければ翌日以降の観測項目）
- [ ] **C-18** モバイル縦画面（≤640px）で横あふれ無し、ボードが内部スクロール
- [ ] **C-18b** 通常モードで `/api/ranking/*` へのリクエストが 0 件

### Rollback test（R3 の**前**に Production で実施）

- [ ] **C-19a** K0：`RANKING_SUBMISSION_DISABLED=1` 追加 → 再デプロイ → start{} が 503 → **削除 → 再デプロイ** → 元に戻る。所要時間を記録
- [ ] **C-19b** K1：`RANKING_API_ENABLED` 削除 → 再デプロイ → board 503 → **再投入 → 再デプロイ** → 200。所要時間を記録
- [ ] **C-19c** どちらも「行が1つも残っていない／複数無い」を投入・削除のたびに確認（決定151）

---

## 8. G8：GO / NO-GO と、公開までに必要な作業

### 8-1. 判定一覧

| # | 項目 | 判定 | 誰が | 種別 |
|---|---|---|---|---|
| B1 | 決着時に提出されない（§4-0） | **FAIL** | AI（実装・テスト・Preview QA） | **Blocker** |
| B2 | submit だけ閉じる env kill switch が無い（§2-3） | **FAIL** | AI | **Blocker** |
| M1 | edge rate limit rule 1本（§3-2） | CONDITIONAL | CEO（Vercel 画面） | 公開前必須（無料。有料なら停止→承認） |
| M2 | Rollback test（§7 C-19） | 未実施 | CEO 操作＋AI 確認 | 公開前必須 |
| M3 | Function region を Neon に寄せる（§5-2） | CONDITIONAL | CEO（Vercel 画面） | 公開前推奨 |
| M4 | Preview 用 Neon branch（§4-2） | CONDITIONAL | CEO（Neon 画面・無料） | 公開前推奨。代替：公開後 Preview を unlock しない運用 |
| L1 | `VALIDATE CONSTRAINT daily_runs_ticket_fk` | 保留 | CEO 承認 | 公開後 |
| L2 | スコア0の挑戦後「まだ挑戦していません」表示（決定149） | 既知 | AI | 公開後 |
| L3 | Vercel request log の IP とプライバシー表記の整合 | 未確認 | CEO | 公開後でも可 |
| L4 | leaderboard のページング（100件超） | 未実装 | AI | 公開後（参加者が増えてから） |

### 8-2. 総合：**NO-GO（現時点）→ B1・B2 修正後に再判定**

B1・B2 はどちらも数十行の変更で、`src/core`・`src/server` の判定ロジックには触れない。
修正 → テスト → Preview で UI だけの一周 → 本書 §7 の R0 完了、で GO 判定に進める。

---

## 9. CEO 判断が必要な事項（§6-3）

| # | 事項 | 根拠 | 推奨 |
|---|---|---|---|
| 1 | master merge・Production deploy（R1） | #8 | B1・B2 修正後に承認 |
| 2 | Production 環境変数の投入（R2） | #8 | R1 の C-1〜C-4b 通過後 |
| 3 | `submissionEnabled=true`（R3）＝公開そのもの | #8 | R2 の C-5〜C-13 通過後 |
| 4 | Vercel WAF rate limit rule の設定 | #6（無料の範囲なら操作のみ） | 設定する。**有料と判明したら設定せず停止** |
| 5 | Vercel プランの利用条件（Hobby の非商用条件に本プロジェクトが適合するか） | #5・#6 | Phase 4.4 §11 ④ から未確認のまま。**公開前に CEO が確認** |
| 6 | Neon Free のまま公開してよいか（上限到達時は翌月まで停止） | #6 | Free のまま公開し、§5-3 の監視で判断。プラン変更は別途 |
| 7 | `VALIDATE CONSTRAINT`（L1） | #9 | 公開後、legacy 行の消滅を確認してから |

---

## 10. 次Step

1. **B1**：決着時＋Daily 画面表示時に `flushPendingRuns()` を呼ぶ／検査テスト／Preview で **UI だけの一周**（unlock は QA の間だけ・終わったら外して再ビルド・行の複数残りを確認）
2. **B2**：`RANKING_SUBMISSION_DISABLED` を `env.ts`／`handler.ts` に追加／`env.test.ts`・`routes.test.ts`／Preview で「足すと 503・外すと元に戻る」を実測
3. 上記を 決定153 として記録 → **Phase 4.10 再判定（GO/NO-GO）**
4. GO なら §1-2 の R1 から、§7 のチェックリストで1段ずつ
