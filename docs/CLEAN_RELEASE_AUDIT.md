# Clean Release Audit — Production Release Candidate 監査（決定171）

- 実施日：2026-09-13
- 起点：Release Hygiene Gate `762168f`（決定170 PASS/CLOSE）
- Base：`origin/master 489352c`（＝現在の Production。**一切変更していない**）
- Clean RC branch：`release/game-v1-rc`（`489352c` から分岐。push 済み・merge 未・deploy 未）
- 判定：**Clean Release Candidate PASS / READY FOR CEO QA**（Production GO ではない）
- 禁止事項の遵守：master 変更なし／Production 変更なし／Production deploy なし／master への merge なし

---

## 0. 結論（先に）

| 項目 | 結果 |
| --- | --- |
| Transport 方法 | **clean release branch＋patch extraction**（master から分岐し、feature tree を「ランキング経路を除いて」丸ごと載せ、境界を手で切断） |
| Included | Phase 4.1（Daily 公平化＋replay 基盤・オフライン）、Phase 5-A/B/C/D/E/F、Phase 6 監査・6-A/B/C/D、Release Hygiene（決定170）、`.gitignore` の秘密除外、`.claude/settings.local.json` の追跡停止 |
| Excluded | Phase 4.2〜4.10 のランキング backend／API／Neon／migration／ticket／leaderboard UI／Preview bypass／それらの docs・scripts、Neon・pglite 依存 |
| Ranking Absence Gate | 17 項目すべて PASS（`scripts/release-audit/ranking-absence.mjs`） |
| Secret Audit | 資格情報形式の値 **0 件**。残る hit は識別子・散文・sha256 ハッシュのみ（`scripts/release-audit/secret-audit.mjs`） |
| gameVersion | `1.80c6eda23ed082dc`（テスト PASS・転送で変化なし） |
| saveVersion | 9（master と同一） |
| Save Migration | master ビルドで作った通常セーブ／Daily セーブ／戦績を RC で開いて **欠損 0** |
| Tests / typecheck / lint / build | 928 passed・9 skipped／tsc 0 error／lint 既存 warning のみ（error 0）／dist 51 MB |
| Release Blockers | **0** |

---

## 1. Decision 170 の確認

`git show 762168f --stat` で Release Hygiene Gate の内容（BGM Opus/WebM 化＋MP3 fallback、`art-source/`・`audio-source/` 分離、`.vercelignore`、CLS・44px 修正、`docs/RELEASE_HYGIENE_GATE.md`）を確認した。`docs/DECISIONS.md` の決定170 は PASS/CLOSE。Production（`489352c`）にはまだ載っていない（Production の dist は 298 MB、RC は 51 MB）。

## 2. Transport 設計（なぜ cherry-pick でも revert でもないか）

feature branch `feat/daily-ranking-phase4` は base から **59 commit**。ランキング（Phase 4.2〜4.10）と公開対象（Phase 4.1・5・6・Hygiene）が時系列で交互に積まれ、しかも後者が前者の上に載っている：

- `d4eb575`（api の都合で `src/core` 全体の import に `.js` 拡張子を付けた）の上に Phase 5/6 の core 変更がある
- `rules.ts`／`GameFlow.tsx`／`useGameEngine.ts`／`GameOverOverlay.tsx` はランキングと公開対象の両方が同じファイルを触っている

したがって

| 方法 | 判定 | 理由 |
| --- | --- | --- |
| cherry-pick（公開 commit だけ拾う） | 却下 | Phase 5/6 の commit が Phase 4 の中間状態（`.js` 拡張子・rules の ranking ブロック・GameFlow の ticket 配線）に依存し、conflict 解消が事実上「手で patch を書く」のと同じになる。commit 単位では“ランキング混入なし”を保証できない |
| revert（feature を載せてランキング commit を revert） | 却下 | 空 commit・docs commit・同一ファイル多重変更が多く、revert 連鎖が壊れる。除外の証明が「revert が全部当たったか」に依存し監査しにくい |
| **clean branch＋patch extraction（採用）** | 採用 | `489352c` から分岐 → feature の tree を丸ごと載せる → ランキング経路（`api/`・`src/server/`・ranking hooks/UI・Phase 4 docs/scripts・依存）を **path 単位で削除** → 残った 9 箇所の参照を手で切断。結果は「master → RC の 1 diff」として全文を機械検査できる |

RC は **1 commit で build・test が通る tree** ＋ 監査 docs/scripts の commit、という構成にしてある（中間状態を作らない）。

## 3. Commit Transport Report（59 commit 全件・diff 実見）

「名前から含める」ではなく `git show --name-status` で触ったファイルを見て判定した。Ranking 汚染＝「サーバー／API／Neon／提出／ticket／leaderboard／bypass に関わる変更を含むか」。

| # | Commit | 目的 | Include/Exclude | 理由 | Ranking 汚染？ | 転送方法 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `7ef714a` | Phase 4.0 Daily ranking 競技ゲート・シミュレーション | Exclude | docs/PHASE4_*・scripts/phase4-daily-gate のみ | あり（設計） | path 除外（DECISIONS.md 本文は全文転送） |
| 2 | `4aed4ca` | Daily 公平化（決定132）＋ replay 基盤（runLog/resume） | **Partial Include** | `src/core/replay`・`core/data/dailyStart.ts`・`GameFlow`・`useGameEngine`・`startDaily` はオフラインの純粋コア。docs/PHASE4_* は除外 | なし（通信なし） | tree transport |
| 3 | `9c4f803` | Daily 行動ログ記録（localStorage） | **Partial Include** | `pendingRunStorage`・`dailyRunLogStorage`・`clientRunId` は端末内保存のみ。docs 除外 | なし | tree transport |
| 4 | `3e3f01e` | ランキング backend（検証・store port・順位付け） | Exclude | `src/server/ranking`・`rankingClient`・`anonymousPlayerId` | **あり** | path 除外 |
| 5 | `5062311` | 1日上限を DB 制約に・postgres store | Partial（`.gitignore` のみ） | `.gitignore` の `.env`/`*.pem`/`*.key` 無視追加は安全側なので転送。server・docs は除外 | **あり**（server） | path 除外＋`.gitignore` 転送 |
| 6 | `f5c5aba` | Neon driver 修正・依存追加 | Exclude | `@neondatabase/serverless`・`@electric-sql/pglite` | **あり** | 依存削除（`package.json`/`package-lock.json` は master と **同一**に戻った） |
| 7 | `de63996` | docs Phase 4.4 実 DB 検証 | Exclude | docs のみ | あり | 除外 |
| 8 | `9ebbfd6` | docs Phase 4.4 credential rotation 後の記録 | Exclude | docs のみ（DECISIONS.md 本文は転送） | あり | 除外 |
| 9 | `2b67d0b` | Phase 4.5 PSF gate 設計・ticket 状態機械 | Exclude | docs・scripts/phase45-psf | あり | 除外 |
| 10 | `9f56e45` | run ticket・client secret・day-locked gameVersion | **Partial** | `core/replay/gameVersion.ts` 等（純粋関数・fingerprint テスト）と `core/data` は転送。`core/identity`・`rankingTicketStorage`・`dailySessionStart`・server・battle UI のランキング表示は除外／切断 | **あり**（一部） | path 除外＋sever（`useGameEngine`／`GameFlow`／`GameOverOverlay`／`BattleScreen`） |
| 11 | `fc3610f` | Phase 4.7 DB migration package | Exclude | scripts/phase47-migration・docs | **あり** | path 除外（`.vercelignore` の該当行も削除） |
| 12 | `100ab74` | docs 決定142（schema migration） | Exclude | DECISIONS.md のみ（本文転送） | あり | 除外 |
| 13 | `e744660` | Phase 4.8 Production API（closed by default） | **Partial** | `.vercelignore`（テスト・docs を deploy から外す）と `tsconfig.json` は転送。`api/`・`tsconfig.api.json`・scripts/phase48-api・docs は除外 | **あり** | path 除外＋sever（`tsconfig.json` の api 参照を削除） |
| 14 | `7ed9143` | Preview QA runner の deployment protection 対応 | Exclude | scripts/phase48-api・docs | あり（bypass） | 除外 |
| 15 | `d57af9c` | api/ の import に `.js` 拡張子 | Exclude | `api/` のみ | あり | 除外 |
| 16 | `d4eb575` | `.js` 拡張子を core 全体へ | **Include** | `src/core/engine`・`types`・`identity` の import 文のみ（挙動不変）。Phase 5/6 がこの上に載る。`identity.ts` は除外 | なし | tree transport |
| 17 | `7b7169a` | docs 決定144・Preview closed-state | Exclude | docs | あり | 除外 |
| 18 | `df0bc71` | docs Preview QA step 3（Neon read path） | Exclude | docs | あり | 除外 |
| 19 | `ebc527a` | Preview rebuild trigger | Exclude | 空 commit | あり（env） | 除外 |
| 20 | `0b80b18` | api env trim・閉じた提出ゲートの説明 | Exclude | `api/_lib/env.ts` | **あり** | 除外 |
| 21 | `6790a5c` | replay fixture generator・unlock の落とし穴 | Exclude | scripts/phase48-api・docs | あり | 除外 |
| 22 | `83f19e5` | Preview rebuild | Exclude | 空 commit | あり | 除外 |
| 23 | `5a0b7c3` | docs Phase 4.8 pass | Exclude | docs | あり | 除外 |
| 24 | `c5ac1d3` | Preview rebuild | Exclude | 空 commit | あり | 除外 |
| 25 | `a3b07ed` | docs cleanup 記録 | Exclude | docs | あり | 除外 |
| 26 | `969fa5e` | Daily 画面にランキング表示 | Exclude | `DailyRankingPanel`・`dailyRanking.ts`・`leaderboardClient`・scripts/phase49-ui・docs | **あり** | path 除外＋sever（`DailyChallengeScreen`） |
| 27 | `da1e481` | game over のランキング link 修正 | Exclude | ランキング導線のみ | **あり** | sever（`GameOverOverlay`／`BattleScreen` の `onOpenRanking`） |
| 28 | `9af0595` | docs Phase 4.9 Preview QA | Exclude | docs | あり | 除外 |
| 29 | `dd46863` | docs Phase 4.9 submission QA | Exclude | docs | あり | 除外 |
| 30 | `c4cdf86` | Preview rebuild | Exclude | 空 commit | あり | 除外 |
| 31 | `b3e5b27` | Preview rebuild | Exclude | 空 commit | あり | 除外 |
| 32 | `9d43a43` | Preview rebuild | Exclude | 空 commit | あり | 除外 |
| 33 | `804736d` | docs Phase 4.9 close | Exclude | docs | あり | 除外 |
| 34 | `e6785c0` | docs Phase 4.10 production release gate（NO-GO） | Exclude | docs | あり | 除外 |
| 35 | `46a450f` | docs replayability 監査 | Include | docs のみ | なし | tree transport |
| 36 | `3343404` | **Phase 5-A** 共通16枚にカード条件 | Include | core/engine・data・types・battle UI・scripts/phase5a・docs | なし | tree transport |
| 37 | `ef8ebad` | **Phase 5-B** 神階ラダー再中心化 | Include | core/data・replay テスト・scripts/phase5b | なし | tree transport |
| 38 | `864bb3d` | docs 決定155 | Include | docs | なし | tree transport |
| 39 | `f0a3bae` | docs 5-A/B 後の再監査 | Include | docs・scripts/phase5b | なし | tree transport |
| 40 | `9fee273` | **Phase 5-D** 加護の託宣を敵の予告連動に | Include | core/engine/intent.ts・data・types・battle UI・scripts/phase5d | なし | tree transport |
| 41 | `c1a034d` | docs Phase 5-D 結果 | Include | docs | なし | tree transport |
| 42 | `496d217` | docs 決定157 | Include | docs | なし | tree transport |
| 43 | `f3141e9` | docs **Phase 5-E** 設計監査 | Include | docs・scripts/phase5e | なし | tree transport |
| 44 | `1be3502` | **Phase 5-E** 加護の託宣を block penalty から除外 | Include | core/data・engine・scripts | なし | tree transport |
| 45 | `09c1f7b` | docs 決定158 | Include | docs | なし | tree transport |
| 46 | `aac52b8` | docs **Phase 5-C** 設計監査 | Include | docs・scripts/phase5c | なし | tree transport |
| 47 | `6221a54` | **Phase 5-C** 大耀・蒼毘 専用カードに条件 | Include | core/data・engine・scripts | なし | tree transport |
| 48 | `c2c1f0c` | docs 決定159 | Include | docs | なし | tree transport |
| 49 | `9fbb38e` | docs **Phase 5-F** replayability／RC 監査 | Include | docs・scripts/phase5f-rc | なし（"credential" は散文） | tree transport |
| 50 | `ec917cc` | `.claude/settings.local.json` 追跡停止・決定160 | Include | `D .claude/settings.local.json`・`.gitignore` | なし | tree transport |
| 51 | `6f823dd` | docs Phase 6 UX／商用品質監査 | Include | docs・scripts/phase6-audit | なし | tree transport |
| 52 | `3a9ffbe` | **Phase 6-A** Combat Juice | Include | battle UI・`useGameEngine`・docs | なし | tree transport |
| 53 | `f02a920` | docs **Phase 6-B** HUD 設計監査 | Include | docs・scripts/phase6b | なし | tree transport |
| 54 | `7583595` | **Phase 6-B** 戦闘画面を viewport に収める | Include | battle UI（`BattleHud.tsx` 削除含む）・docs・scripts | なし | tree transport |
| 55 | `24e71d9` | docs Phase 6 商用ベンチマーク v2 | Include | docs・scripts | なし | tree transport |
| 56 | `25a385a` | **Phase 6-C** Decision Feedback callout＋Battle Recap | Include | battle UI・docs・scripts | なし | tree transport |
| 57 | `27a2225` | docs **Phase 6-D** Visual Direction 監査 | Include | docs・scripts | なし | tree transport |
| 58 | `f22544a` | **Phase 6-D** Visual Patch v1「神の一撃・専用舞台化」 | Include | battle UI・setup CSS・docs・scripts | なし | tree transport |
| 59 | `762168f` | **Release Hygiene Gate**（決定170） | Include | `.vercelignore`・art-source/audio-source 分離・BGM 再エンコード・CSS・docs・scripts/release-hygiene | なし（`.vercelignore` の phase47 行だけ削除） | tree transport |

集計：Include 25（うち Partial 5）／Exclude 34（うち空 commit 7・docs のみ 15）。

## 4. 切断（sever）した参照 — 9 箇所

path 単位の削除後、build を通すために手で切った箇所。**ゲームの挙動は変えていない**（ランキングへの配線だけを外した）。

| ファイル | 変更 |
| --- | --- |
| `src/hooks/useGameEngine.ts` | `rankingTicketStorage` import・`session` 引数・`dailyRanked` state・`clearTicket()`・`loadTicketFor` を削除。Daily 開始時は常に `createClientRunId()`（端末内 ID）を使う |
| `src/components/GameFlow.tsx` | `prepareDailyStart`（ticket 取得）・`unrankedNotice`・`onOpenRanking` を削除。Daily 開始は同期的に `engine.startDailyGame(...)` を呼ぶだけ |
| `src/components/setup/DailyChallengeScreen.tsx` | `DailyRankingPanel`・`rankedStartNotice`・`notice` prop・`.daily-notice`／`.daily-attempt-warning` を削除 |
| `src/components/battle/GameOverOverlay.tsx` | ランキングブロック（未ランク注記・`game-over-daily-rank`・スコア／link）と `dailyRanked`／`onOpenRanking` prop を削除。Daily ブロックは master と同じ「神域挑戦の残り回数」まで |
| `src/components/battle/BattleScreen.tsx` | `onOpenRanking` prop と `dailyRanked` の受け渡しを削除 |
| `src/core/replay/index.ts` | `assignRanks`／`RankableEntry`／`RankedEntry` の export を削除 |
| `tsconfig.json` | `./tsconfig.api.json` への references を削除 |
| `.vercelignore` | `scripts/phase47-migration/` 行を削除（ディレクトリ自体が無い） |
| `package.json`／`package-lock.json` | `@neondatabase/serverless`・`@electric-sql/pglite` を削除 → **master と byte 同一** |

意図的に残したもの：`RULES.ranking`（`submissionEnabled: false` の不活性設定。gameVersion の fingerprint からは除外されるが、`gameVersion.ts` が `engineVersion` を読むため残す）、`src/core/replay/*`（ランキング以外の replay 基盤。純粋関数・テスト 9 ファイル）、`pendingRunStorage`／`dailyRunLogStorage`／`clientRunId`（端末内保存のみ）、`.daily-ranking*`／`.game-over-rank*` の孤立 CSS（参照する要素が無い）。`docs/DECISIONS.md` は決定131〜152 の散文を含むが docs は `.vercelignore` で配信対象外。

## 5. Ranking Absence Gate（機械判定）

`node scripts/release-audit/ranking-absence.mjs` — **17/17 PASS**。

| 検査 | 結果 |
| --- | --- |
| ランキング backend ファイル（`api/`・`src/server/`・`tsconfig.api.json`） | 0 |
| ranking client／ticket／leaderboard／identity ファイル | 0 |
| Phase 4 の scripts／docs | 0 |
| DB schema／migration（`*.sql`・`migrations/`） | 0 |
| Neon／postgres／pglite 依存（package.json・lockfile） | 0／0 |
| src の通信呼び出し（fetch／XHR／WebSocket／sendBeacon、非テスト） | 0（同一オリジンの SE `.wav` 読み込み 1 件は master と同じコード） |
| src の `/api/` リテラル | 0 |
| src のランキング env（`RANKING_*`・`DATABASE_URL`・`NEON_`・`VITE_RANKING`、非テスト） | 0（`replayBoundary.test.ts` のトークン一覧のみ） |
| 削除モジュールへの import | 0 |
| `RULES.ranking.submissionEnabled` | `false`（`true` の出現 0） |
| dist：`/api/`・neon／postgres・`DATABASE_URL`／`RANKING_`／`NEON_`・`api/ranking` | すべて 0 |
| dist：fetch 呼び出し | Vite modulepreload polyfill と SE `.wav` の 2 件のみ |
| dist：`submissionEnabled:!0`（=true） | 0（`!1`=false が 1） |

実走（`scripts/release-audit/qa-flow.mjs`・`save-migration.mjs`）でも、Home→戦闘→決着→Daily→戦績の全経路で **`/api/`・ranking・外部オリジンへのリクエスト 0**、失敗リクエスト 0、JS エラー 0（§10）。

## 6. Neon Absence

- 依存：`@neondatabase/serverless` 0・`@electric-sql/pglite` 0（package.json／lockfile とも）
- コード：`src/server/` 0・`api/` 0・`postgres://` 0
- 残る "Neon" の文字列は `rules.ts` の **コメント 2 行**（「Neon 等」「Neon Free の CU-hours」）と docs の散文のみ。実行時参照なし

## 7. Secret Audit（値は表示しない）

`node scripts/release-audit/secret-audit.mjs 489352c` — tracked files・RC 履歴（`489352c..HEAD` の追加行）・dist を走査。**資格情報形式（postgres URL／npg_／sk-・ghp_・AKIA・xox／JWT）の hit 0 件。tracked `.env` 0 件。**

| 領域 | hit | 内容（種類のみ） |
| --- | --- | --- |
| docs（散文） | 112 | `DECISIONS.md` の決定131〜152 に env 変数名（`DATABASE_URL`・`NEON`・`BYPASS`・`SECRET`）と `.env` の言及、`assets-kit/manifest.json` の sha256 ハッシュ 42 件（素材の同一性検証用） |
| scripts | 41 | すべて `process.env.PLAYWRIGHT_MODULE` 等の `.env` 一致（監査スクリプトの実行オプション） |
| test | 36 | 同上（`process.env`）＋ `replayBoundary.test.ts` の禁止トークン一覧 |
| source | 2 | `rules.ts` の "Neon" コメント |
| build | 1 | `react-dom` 内の input type 一覧（`password:!0`） |
| other | 4 | `.gitignore` の `.env` 無視ルール |

過去に漏洩・ローテーション済みの資格情報についても、本 RC の tree・履歴・dist には**存在しない**（形式一致 0）。

## 8. Dependency Audit

- 削除：`@neondatabase/serverless`・`@electric-sql/pglite`（ランキング専用）
- 維持：React／Vite／Phaser／vitest 等ゲーム依存はすべて master と同一
- 結果：`package.json`／`package-lock.json` は **master と byte 同一**（`git diff 489352c -- package.json package-lock.json` が空）
- `npm install --package-lock-only --ignore-scripts` で lockfile を再生成（−18 行）。`node_modules` の実体は変えていない

## 9. Master → RC File Diff Report

`git diff --stat -M 489352c`：**282 files changed, +23,102 / −1,000**。

| カテゴリ | A | M | D | R | 内容 |
| --- | --- | --- | --- | --- | --- |
| Gameplay（`src/core/`） | 19 | 44 | 0 | 0 | Phase 5 カード条件・神階・託宣（`intent.ts`）・`dailyStart.ts`・replay 基盤（`gameVersion`/`replay`/`resume`/`runLog`/`types`）＋テスト 9 |
| Presentation（`src/components/`） | 14 | 31 | 1 | 0 | 6-A/B/C/D の battle UI・CSS、`BattleHud.tsx` 削除、setup CSS |
| Hooks（`src/hooks/`） | 5 | 2 | 0 | 0 | `clientRunId`・`dailyRunLogStorage`・`pendingRunStorage`・テスト 2／`startDaily`（core へ移設の再 export）・`useGameEngine` |
| Assets（`public/`・`art-source/`） | 1 | 0 | 0 | 98 | 原素材 PNG 98 枚を `art-source/` へ移動（配信外）、`art-source/README.md` |
| Audio | 8 | 4 | 0 | 0 | BGM 4 曲の `.webm`（Opus）追加・`.mp3` 再エンコード・`audio-source/` に原本 4 |
| Tests | 24 | 4 | 0 | 0 | 上記に含む（`*.test.ts` 28 件） |
| Docs | 17 | 1 | 0 | 0 | Phase 5/6/Hygiene の docs 17・`DECISIONS.md` |
| Build config | 1 | 2 | 1 | 0 | `.vercelignore` 追加・`.gitignore`／`tsconfig.json` 変更・`.claude/settings.local.json` 追跡停止 |
| Hygiene scripts | 32 | 0 | 0 | 0 | `scripts/phase5*`・`phase6*`・`release-hygiene/` |
| **Ranking／Server／Neon／Secret** | **0** | **0** | **0** | **0** | — |

`src/App.css`（M）は Hygiene の 44px 修正。`package.json`・`package-lock.json`・`index.html`・`vite.config.ts` は master と同一。

## 10. Runtime QA（RC ビルド `vite preview` に対して）

`scripts/release-audit/qa-flow.mjs`（4 viewport × 通常戦／神域挑戦／敗北）、`scripts/release-hygiene/{screens-smoke,cls,transfer,audio-playback,assets}.mjs`。すべて headless Chromium・RC の `vite preview`（dist）に対して実施。

### 10-1. 通し（Home → 神選択 → 難易度 → 敵選択 → デッキ → 戦闘 → 中断 → 続きから → 神の一撃 → 決着 → 振り返り → 報酬 → 神域挑戦 → 戦績）

| viewport | scroll | overflow X/Y | 敵 | 予告 | 手札 | End Round | 続きから | 神の一撃 | 最終打／HP ghost | 決着 | 振り返り | 報酬 | 通信 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PC 1366×768 | 0 | 0／0 | 表示（456×285） | 表示「⚔ 50」 | 5/5 操作可 | 有効 | 「大耀・ラウンド2」→ round 2 で再開 | 1 | あり／あり | 勝利 | 1 行 | 3 枚 | 外部 0・api 0・失敗 0・JS エラー 0 |
| PC 1508×660 | 0 | 0／0 | 表示（456×194） | 表示 | 5/5 | 有効 | 同上 | 1 | あり／あり | 勝利 | 1 行 | 3 枚 | 同上 |
| Mobile 390×760 | 0 | 0／0 | 表示（124×279） | 表示 | 5/5 | 有効（48×45） | 同上 | 1 | あり／あり | 勝利 | 1 行 | 3 枚 | 同上 |
| Mobile 390×844 | 0 | 0／0 | 表示（124×363） | 表示 | 5/5 | 有効 | 同上 | 1 | あり／あり | 勝利 | 1 行 | 3 枚 | 同上 |

- 結果画面の順序（6-C）：`勝利` → 振り返り「ラウンド6で撃破しました」→ ボタン［挑戦状をコピー／**報酬カードを選ぶ ›**］→ 報酬 3 枚（剛撃・呪縛・共振）→ 選択後に［挑戦状をコピー／同じ構成でもう一度／神・デッキを選び直す］。**ランキング文言・要素 0**。
- 決着後は `sevengods.battleSave` が消え、Home の「続きから」が出ない（正常）。
- 敗北（PC 1508、カードを出さず End Round のみ）：`敗北`・敗因「R4：業斧の鬼将の「攻撃」で 110 ダメージ」・振り返り「R4：110の大技に対し、盾は0でした。加護や防御札で予告ぶんの盾を用意すると受け切れます」。
- 6-C callout：初回走査では各 viewport で 2 回観測（完封／⚡ 等）。再走査（cut-in のフレーム送りを追加した版）では表示 700ms に対しポーリング間隔が長く 0 観測。callout の判定は `decisionFeedback.test.ts` と `scripts/phase6c-decision-feedback/play.mjs`（決定167）で担保済み。
- ヘッドレス特有：`enemy-cutin`／`resonance-cutin` は `animationend` で閉じるため、フレームを流さないと画面に残る。実ブラウザでは発生しない（6-A の JS fallback もある）。

### 10-2. 神域挑戦（ランキング無し）

| 項目 | 結果（4 viewport 共通） |
| --- | --- |
| Daily 画面 | 「挑戦開始（残り3回）」・SEED ID・自己ベスト・残り回数。**ランキング要素 0・「ランキング」の語 0** |
| 開始 | 挑戦開始 → 神選択（大耀）→ デッキ → 戦闘に `神域` タグ。`sevengods.daily` に 2026-09-13／enemy_05／`daily-2026-09-13-enemy_05`／attemptsUsed 1、`battleSave.state.mode = 'daily'` |
| 決着 | 「✨ 今日のベスト更新！（敗北・スコア 1,140）神域挑戦の残り回数 2 回」（auto-play は card[0] を出すだけなので 1.25× HP のボスに敗北。挙動確認が目的） |
| 再入場 | Daily 画面「挑戦開始（残り2回）」 |
| 戦績 | 「神域挑戦（直近7日）」に 2026-09-13／双牙の魔獣／1,140／敗北／大耀／1 / 3 |
| 通信 | 全 viewport で host は `localhost:4181` のみ。`/api/`・ranking・外部 0 |

### 10-3. Release Hygiene の再確認（RC dist）

| ゲート | 結果 |
| --- | --- |
| screens-smoke（PC／SP × Home・OTOMO・戦績・Daily・神選択・難易度・敵選択・デッキ・戦闘） | 404／失敗 0、壊れた画像 0、JS エラー 0 |
| CLS／44px | PC 0.0074／SP 0.046（決定170 と同値）、<44px 0、JS エラー 0 |
| 転送量 | 初回 2.58 MB（PC／SP とも）、戦闘開始まで PC 12.3 MB／SP 11.5 MB。BGM は `home.webm` 1.57 MB／`battle.webm` 1.86 MB（Opus） |
| 音声 | `canPlayType` webm/opus=probably → `home.webm` loop・volume 0.35・再生進行 OK。WebM 不可環境の fallback は `home.mp3` で再生 OK。失敗 0 |
| 未参照アセット | 0 ファイル／0 MB |
| dist | 51 MB（`du -sm`）。`art-source/`・`audio-source/` は dist に無い |

### 10-4. Phase 6 各パッチの動作（RC 上）

- **6-A**：最終打（`.enemy-defeat`）と HP ghost（`.hp-bar-ghost`）を全 viewport で観測。決着 modal が撃破演出より先に出ることは無い（reward は結果の後）。
- **6-B**：戦闘開始時 scroll 0・overflow 0、敵・予告・手札・End Round が同時に画面内（表 10-1）。
- **6-C**：振り返り 1 行（勝利＝事実、敗北＝G ルールの助言）、結果 → 報酬 → 結果 の順序。
- **6-D**：神の一撃 cut-in（`.resonance-cutin`）を全 viewport で 1 回ずつ観測（スクリーンショット `*-a09-god-strike.png`）。

## 11. Save Migration（Production master → RC）

`scripts/release-audit/save-migration.mjs`：master `489352c` を別 worktree で build して `vite preview`（4182）に載せ、**実際に master のビルドで**セーブを作って RC（4181）に注入した。

| master で作ったもの | RC での結果 |
| --- | --- |
| 通常戦を決着まで（戦績 `sevengods.records`・神階 `sevengods.stakes`・OTOMO 絆・deck 設定） | 戦績画面に大耀の自己ベスト・勝敗・最速撃破が表示。`records`／`rewardBonuses`／`stakes` の保存値は注入前と同一（欠損 0） |
| 通常戦を1ラウンド進めて中断（`sevengods.battleSave` v9・round 2・手札 6・HP 25／敵 88） | Home に「続きから（大耀・ラウンド2）」→ 再開後の save は round 2・手札 6・HP 25／88 で**完全一致**。そのまま決着（勝利）まで進行し、決着で save が消える |
| 神域挑戦を1回開始して1ラウンド進めて中断（`sevengods.daily`：2026-09-13／enemy_05／seed `daily-2026-09-13-enemy_05`／attemptsUsed 1） | Home に「続きから（神域挑戦・大耀・ラウンド2）」→ 神域タグ付きで再開 → 決着画面に「神域挑戦の残り回数 2 回」→ Daily 画面「挑戦開始（残り2回）」。seed・敵・回数とも master と同一 |

storage コードは master と**同一**（`battleSaveStorage`・`recordStorage`・`dailyStorage`・`stakeStorage`・`rewardStorage`・`otomoBondStorage`・`deckPreferenceStorage`・`tutorialStorage`・`dailyClock` は import 拡張子以外の差分 0 行）。`GameState` 型は import 文以外の差分 0。saveVersion 9 のまま migration 不要。

## 12. Daily Integrity（コードから再確認・過去の前提を再利用しない）

| 項目 | コード | 結果 |
| --- | --- | --- |
| seed | `dailyBoss.ts`：`daily-${dateKey}-${enemyId}` | master と同一関数。2026-09-13 は master・RC とも `daily-2026-09-13-enemy_05` |
| 日付キー／JST リセット | `dailyKeyOf(now)`：`now + RULES.daily.timezoneOffsetMinutes(540)` の UTC 日付 | JST 00:00 で切り替わる。`isExpiredDailySave` が前日の Daily セーブを再開不可にする（master と同一） |
| ボス選択 | `weeklyBossOrder(weekKey)`：週 seed で 7 体をシャッフル、`dayIndex` で選ぶ | `ENEMY_IDS` は master と同一 → 同じ日に同じボス |
| 1日 3 回 | `RULES.daily.attemptsPerDay: 3`、`startDailyAttempt` が開始時に消費 | 端末内カウント。実走で 3→2 を確認 |
| 神・OTOMO・デッキ自由 | `DailyChallengeScreen` → 神選択 → デッキ（難易度なし） | 実走で 大耀・自由デッキで開始 |
| 補正 | `enemyHpMul 1.25／enemyAtkMul 1.15` | master と同一 |
| 公平化（Phase 4.1・決定132） | Daily では報酬 `bonusCopies` を適用しない | **Production との差**（§14） |
| storage 互換 | `sevengods.daily` version 1、`retentionDays 30` | master と同一 |
| day-lock／ticket | 存在しない（サーバー ticket の概念ごと除外） | Daily は完全にローカル |

## 13. Deploy Timing 制約（コードから）

- ランキングが無いので「日付をまたぐ提出」「version-locked」の制約は**存在しない**。
- Daily の seed／ボスは日付と `ENEMY_IDS` だけから決まり、master と RC で同一。**どの時刻に deploy しても、その日の敵・seed は変わらない**。
- ただし Phase 5 でカード条件・神階・託宣が変わっているため、同じ seed でも**戦闘内容とスコアは Production と異なる**。同日の途中で切り替えると「同じ端末の今日の記録」に旧版と新版のスコアが混在する（ローカル記録のみ・ランキング無し）。混在を避けたいなら **JST 00:00 直後の deploy** を推奨（必須ではない）。
- 進行中の通常セーブ／Daily セーブは deploy をまたいでも再開できる（§11）。

## 14. Production との差（release summary）

Production（`489352c`）に対して RC が変えるもの：

1. **Phase 4.1**：Daily 公平化（Daily では報酬 bonusCopies を適用しない・決定132）、replay／行動ログ基盤（端末内保存のみ・通信なし）
2. **Phase 5-A**：共通カード16枚に「条件で強くなる」ボーナス（決定154）
3. **Phase 5-B**：神階ラダーの再中心化（決定155）
4. **Phase 5-D／5-E**：加護の託宣が敵の予告に連動・block penalty から除外（決定157／158）
5. **Phase 5-C**：大耀・蒼毘の専用カードに条件（決定159）
6. **Phase 6-A**：Combat Juice（着弾→HP 減少の順序・ヒットストップ等、決定162／163）
7. **Phase 6-B**：戦闘画面を viewport に収める（scroll 0・敵と手札が同時に見える、決定165）
8. **Phase 6-C**：Decision Feedback callout＋Battle Recap（決定166／167）
9. **Phase 6-D**：神の一撃の専用舞台化（決定168／169）
10. **Release Hygiene**：BGM Opus/WebM＋MP3 fallback、原素材を配信から外す（dist 298 MB → 51 MB）、CLS 0.0074／0.046、44px（決定170）
11. `.gitignore` に `.env`／鍵ファイルの無視、`.claude/settings.local.json` の追跡停止（決定160）

変えないもの：saveVersion 9、storage キー・形式、Daily の seed／ボス／回数、ランキング UI（Production に無いものは載せない）。

## 15. Release Blockers

**0 件。**

留意点（Blocker ではない）：
- `docs/DECISIONS.md` にランキングの決定（131〜152）の散文が残る。docs は `.vercelignore` で配信されない。
- `RULES.ranking` は不活性設定として残る（`submissionEnabled: false`・fingerprint 対象外）。
- gameVersion `1.80c6eda23ed082dc` は master の値と異なる（Phase 5 のデータ変更による正規の更新。CEO 指定値と一致）。

## 16. 決定171（AI 判断）

**Clean Release Candidate PASS / READY FOR CEO QA。** Production GO ではない。`release/game-v1-rc` は push 済み・master 未 merge・Production 未 deploy。次は CEO の実機 QA → 承認後に master への merge と Production deploy（別 Step・CEO 判断）。

## 付録：再現コマンド

```
# 静的ゲート（RC worktree で）
node scripts/release-audit/ranking-absence.mjs
node scripts/release-audit/secret-audit.mjs 489352c
# 実走（RC を vite preview --port 4181、master を 4182 で起動しておく）
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-audit/qa-flow.mjs out/qa.json http://localhost:4181 --shots out/shots
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-audit/save-migration.mjs out/migration.json http://localhost:4182 http://localhost:4181
# 既存ゲート
node scripts/release-hygiene/screens-smoke.mjs http://localhost:4181
node scripts/release-hygiene/cls.mjs out/cls.json http://localhost:4181 --tag after
node scripts/release-hygiene/transfer.mjs out/transfer.json http://localhost:4181 --tag after
node scripts/release-hygiene/audio-playback.mjs http://localhost:4181
node scripts/release-hygiene/assets.mjs
npx vitest run && npx tsc -b && npm run lint && npx vite build
```
