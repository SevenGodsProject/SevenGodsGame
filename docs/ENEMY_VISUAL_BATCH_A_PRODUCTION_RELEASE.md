# Enemy Visual Batch A — Production Release Gate（決定178）

- 実施日：2026-09-14
- 対象：`enemy_01 datenshi`（試練の影）／`enemy_04 karakuri`（銀甲の機工師）／`enemy_07 doukeshi`（乱舞の道化）
- Release Source：`feat/enemy-visual-batch-a` `dcfda3a`（決定174 `cd81ece` ＋ 決定175 `dcfda3a`）
- Old master / Production：`ad7734b`
- New master / Production：`dcfda3a`
- Production 公開は **CEO承認**（CLAUDE.md §6-3 #8・CEO APPROVAL 2026-09-14）。Git 手順・Gate 設計・検証方式は **AI判断**（§6-2）
- 判定：**PASS / LIVE**

---

## 0. 結論

| 問い | 答え |
| --- | --- |
| Batch A は Production へ入ったか | **入った。** 本番配信中の 3 体の asset が master の blob と **sha256 完全一致** |
| ゲーム本体は変わったか | **1 バイトも変わっていない。** JS／CSS／HTML の sha256 が公開前の Production と **byte 同一** |
| juuma など他の 4 体は | **未変更。** juuma は `95,502B` / `b4d67d58…` のまま（公開前・master・本番の三者一致） |
| Ranking / Neon | **Production に不在のまま。** `/api/ranking/*` は 3 本とも 404、Ranking UI 0 |
| Release Blockers | **0** |

---

## 1. 事前監査（transport 前）

### 1-1. origin/master の固定確認

`git fetch` 後、`origin/master` が `ad7734b7974fe7fc3fad30bf17d3a039f93c90e9` のままであることを確認。push 直前にも再確認した。

### 1-2. 全差分の監査（`master..dcfda3a`）

**24 files changed, 1,961 insertions(+), 0 deletions(-)**。内訳は以下の 4 群のみ。

| 群 | 件数 | 内容 |
| --- | --- | --- |
| Production asset | 3 | `public/assets/enemies/{datenshi,karakuri,doukeshi}/art.webp`（M） |
| 原本（配信対象外） | 4 | `art-source/README.md`（M）＋ `art-source/enemies/*-source.png`（A 3件） |
| docs | 4 | `DECISIONS.md`（+3 行 append）＋ 監査文書 3 件 |
| 監査スクリプト | 13 | `scripts/enemy-visual-audit/`（6）＋ `scripts/enemy-visual-batch-a/`（7） |

### 1-3. 禁止変更ゲート（機械判定・全 PASS 0 件）

`src/`（game logic）／CSS／Ranking／Neon・DB・SQL／`api/`・`src/server/`・`vercel.json`／`.env`・secret／juuma／oni／ryujin／onryo／OTOMO／カード asset／神 asset／`package.json`・lockfile／vite・tsconfig・eslint／`index.html` — **いずれも変更 0 件**。
許可スコープ外のファイルも **0 件**。

`src/core/data/enemies.ts` は未変更＝**参照パス・CSS・`background-size: contain` はすべて据え置き**（asset 名維持のため）。

### 1-4. transport 方式の選定

| 方式 | 判定 |
| --- | --- |
| **`git merge --ff-only`** | **採用。** `master` は `dcfda3a` の直接の祖先で、差分は線形 2 commit（`cd81ece`→`dcfda3a`）。兄弟 branch を巻き込まないため `DECISIONS.md` の競合は構造的に発生しない（末尾に 3 行 append のみ・既存行の変更 0）。決定173/174/175 は commit としてそのまま履歴に残る |
| 必要 path だけの transport | 却下。ff-only が完全に安全である以上、commit を作り直すと決定174/175 の履歴と作者情報が失われる |
| `audit/enemy-visual-quality` の同時 merge | **却下。** 同 branch の `docs/ENEMY_VISUAL_QUALITY_AUDIT.md`・`scripts/enemy-visual-audit/`（6 本）・決定173 の行は、**すべて batch-a 側に blob 単位で完全内包**されていることを確認済み（7 パス IDENTICAL ＋ 決定173 行の sha256 一致）。重複 merge は同一内容の二重記載を生むだけで、履歴の追加情報はない |
| `spec/enemy-batch-b1-juuma`（決定176）・`pilot/juuma-restoration`（決定177） | **今回 merge しない**（CEO 指示）。両 branch は master 直下の兄弟のまま |

結果：`master` `ad7734b` → `dcfda3a`（fast-forward）。master tree hash = batch-a tree hash = `9e64c13f1d72387c1be30f3e71255646d5f6e6c0` で完全一致。

---

## 2. Pre-release Gate（push 前・master 上で実施）

| Gate | 結果 |
| --- | --- |
| tests（`vitest run`） | **3,041 passed / 9 skipped / 0 failed**（241 files passed / 6 skipped） |
| typecheck（`tsc -b`） | **0 error** |
| lint（`oxlint`） | **error 0**／warning 9（すべて `scripts/` 配下の監査ツール。うち 2 件が Batch A スクリプトの未使用 import で、配信物に影響しない） |
| build（`vite build`） | **成功**。`index-CLclgl5i.js` 407.08 kB（gzip 124.99）／`index-IKMGO-ur.css` 126.75 kB（gzip 23.92）／`index.html` 0.48 kB。dist 51 MB |
| gameVersion | **`1.80c6eda23ed082dc`**（`gameVersion.test.ts` 10 tests passed で固定を確認） |
| saveVersion | **9**（bundle 内 `saveVersion:9`／`engineVersion:1`） |
| Ranking Absence | **PASS（全 17 行 PASS）** — backend files 0・client/ticket/leaderboard 0・Phase4 scripts/docs 0・SQL/migration 0・Neon/postgres/pglite 依存 0・lockfile 0・非同一オリジン通信 0・`/api/` リテラル 0・ranking env 0・削除モジュールの import 0・`submissionEnabled === false`・`submissionEnabled: true` 0・dist の `/api/` 0・dist の neon/postgres 0・dist の `DATABASE_URL`/`RANKING_`/`NEON_` 0・dist の余計な fetch 0・dist の `submissionEnabled:!0` 0 |
| Secret Absence | **PASS**（資格情報形式の値 0。残りは識別子・散文・sha256 のみで公開前と同一） |
| tracked `.env` | **0** |
| art-source / audio-source が dist に入らないこと | **0 件**（`.vercelignore` にも登録済み）。dist 内の PNG 27 件はいずれも公開前から `public/` にある実行時 asset で、Batch A は PNG を 1 件も `public/` に追加していない |

### 2-1. 「bundle が変わっていないこと」の byte 証明

ローカルビルド成果物と、**公開前の Production が配信していた実ファイル**を sha256 で照合した。

| ファイル | local build | 公開前 Production | 判定 |
| --- | --- | --- | --- |
| `assets/index-CLclgl5i.js` | `95d062cd42b31eb3…` | `95d062cd42b31eb3…` | **IDENTICAL** |
| `assets/index-IKMGO-ur.css` | `7b220d3a70b7159c…` | `7b220d3a70b7159c…` | **IDENTICAL** |
| `index.html` | `2ace0eaf793282d2…` | `2ace0eaf793282d2…` | **IDENTICAL** |

→ **利用者に届く変更は敵 3 体の WebP のみ**であり、ゲームロジック・UI・保存形式に回帰の余地が構造的に存在しない。

---

## 3. Push / Deploy

- push 直前に `git fetch` で `origin/master` が `ad7734b` のままであることを再確認
- `git push origin master` → **`ad7734b..dcfda3a  master -> master`**（通常 push・force なし・history 不変）
- **Vercel の master 自動 deploy のみ**を使用。manual deploy・二重 deploy はしていない
- push（20:42:45 JST）から **17 秒後**（20:43:02）に本番が新 asset を配信開始。`Last-Modified: Mon, 14 Sep 2026 11:43:01 GMT`

---

## 4. Production Asset Hash（CDN キャッシュ誤認の排除）

**ゲームが実際に要求する query string 無しの canonical URL** に対し、`Cache-Control: no-cache, no-store` を付けて取得し、master の blob と照合した。

| asset | bytes | Production sha256 | master blob | 判定 |
| --- | --- | --- | --- | --- |
| `assets/enemies/datenshi/art.webp` | 185,616 | `29202bed62c3006c…` | `29202bed62c3006c…` | **MATCH** |
| `assets/enemies/karakuri/art.webp` | 105,280 | `d879f1e91b876739…` | `d879f1e91b876739…` | **MATCH** |
| `assets/enemies/doukeshi/art.webp` | 182,510 | `5ecf72492d7e20a9…` | `5ecf72492d7e20a9…` | **MATCH** |
| `assets/enemies/juuma/art_hq.webp` | 95,502 | `b4d67d588f251c63…` | `b4d67d588f251c63…` | **MATCH（旧 asset のまま）** |

旧 asset の hash（datenshi `4f037d43…` 86,836B／karakuri `bc307ddd…` 47,462B／doukeshi `343f64b8…` 74,428B）は**どの条件でも返ってこない**。
`Cache-Control: public, max-age=0, must-revalidate` のため、再訪ユーザーにも旧 asset が残らない。

さらに **実ゲーム内で読まれている画像そのもの**を検証した（`.enemy-avatar` の `background-image` を `new Image()` で読み直して `naturalWidth` を測定）：

| 敵 | 全 32 条件での naturalSize | 参照 URL |
| --- | --- | --- |
| datenshi | **768×768** | `/assets/enemies/datenshi/art.webp` |
| karakuri | **768×768** | `/assets/enemies/karakuri/art.webp` |
| doukeshi | **768×768** | `/assets/enemies/doukeshi/art.webp` |
| juuma | **512×512**（未変更） | `/assets/enemies/juuma/art_hq.webp` |

---

## 5. Production QA（本番 URL・headless Chromium）

### 5-1. 敵 asset 実描画（4 viewport × DPR1/2 × 4 体 = 32 条件）

| 検査 | 結果 |
| --- | --- |
| 壊れた画像 | **0**（全 32 条件） |
| scrollY | **0**（全 32 条件） |
| 横はみ出し（overflowX） | **0**（全 32 条件） |
| JS エラー | **0** |
| 失敗リクエスト（404 含む） | **0** |
| Ranking UI | **0** |
| 手札 5 枚・End Round・予告の可視 | 全条件 OK |
| `background-size` | 全条件 `contain`（CSS 不変） |

`.enemy-avatar` の実測サイズ：PC1366 で 290〜294×284.5〜288.8 css、PC1508 で 291.9〜294.3×194.8〜196.4 css、Mobile390×760 で 126.1〜182.1×274.4〜274.6 css、Mobile390×844 で 126.1〜182.1×359.5〜359.8 css。決定174／175 の実測（PC1366 290×285、PC1508 290×194、Mobile 124〜182×271／355）と一致し、**位置・サイズのずれはない**（±数 px の揺れは `enemy-idle` アニメーションの transform による既知の非決定値）。

目視（DPR2 の等倍クロップ）：datenshi は羽根の一枚ごとの繊維と鎧の金線、karakuri は砲身の刻み・歯車の歯・金の刺繍、doukeshi は市松の縁・鈴・帯の文様がそれぞれ分離して見える。**alpha artifact なし・不自然な halo なし・白フチなし**。juuma は既知の白フチとジャギーを保ったまま＝旧 asset のままであることを目視でも確認した。

### 5-2. 通し QA（4 viewport）

Home → 神選択 → 難易度 → 敵選択 → デッキ → 戦闘 → 中断 → 続きから → 決着 → 結果 → 報酬、および神域挑戦、敗北（PC1508）を各 viewport で通した。

| viewport | 戦闘 scrollY / overflowX | 続きから | 神の一撃 | 最終打 / HP ghost | 結果 | 報酬 | 外部通信 | `/api/` | 失敗 | JS エラー |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PC 1366×768 | 0 / 0 | 「続きから（大耀・ラウンド2）」→ round 2・手札 6 | 1 | 両方 true | 勝利・振り返り 1 行 | 3 枚 | **0** | **0** | **0** | **0** |
| PC 1508×660 | 0 / 0 | 同上 | 1 | 両方 true | 勝利／敗北（敗因「R4：業斧の鬼将の『攻撃』で 110 ダメージ」） | 3 枚 | **0** | **0** | **0** | **0** |
| Mobile 390×760 | 0 / 0 | 同上 | 1 | 両方 true | 勝利 | 3 枚 | **0** | **0** | **0** | **0** |
| Mobile 390×844 | 0 / 0 | 同上 | 1 | 両方 true | 勝利 | 3 枚 | **0** | **0** | **0** | **0** |

通信先ホストは全 viewport で `seven-gods-game.vercel.app` のみ（総リクエスト 262／350／244／244）。

### 5-3. 全画面スモーク（PC / SP × 9 画面）

home・OTOMO・戦績・神域挑戦・神選択・難易度・敵選択・デッキ・戦闘の 18 組合せで、**壊れた画像 0・404 0・失敗リクエスト 0・JS エラー 0**。

### 5-4. 6-B Battle HUD

上記 5-1（32 条件）と 5-2（4 viewport）で、scrollY 0・横はみ出し 0・敵／予告／手札／End Round の同時可視をすべて確認。列幅・敵の箱は決定174 の実測と一致。

### 5-5. 6-C callout / recap（本番で 15 戦）

7 神 × 敵 7 体・PC 10 戦／SP 5 戦・normal〜神階Ⅴ・reduced-motion 1 戦。

| 指標 | 結果 |
| --- | --- |
| callout 総数 | **79**（正常に発火） |
| 誤判定 | **0** |
| 同一バッチ重複 | **0** |
| 同時表示 | **最大 1**（2 件以上の同時表示なし） |
| 浮遊数字との重なり | **0** |
| 予告との重なり | **0** |
| 手札との重なり | **0** |
| ミニ結果との重なり | **0** |
| scrollY / 横はみ出し | **0 / 0** |
| `pointer-events: none` | 15 戦すべて true |
| 結果の順序（勝利→結果→報酬→結果） | **15 / 15** |
| Recap 行 | **15 / 15**（勝利 14 は固有の事実、敗北 1 は助言） |
| JS エラー | **0** |

**敵の顔との重なり**だけ 15 戦中 2 戦で非ゼロ（#6 乱舞の道化 93px²、#7 藍花の怨霊 42px²）。これは決定170・決定174 で記録済みの**既知の非決定値**で、①指標が `.enemy-avatar` の外形から算出され画像の中身を参照しない ②敵立ち絵が `enemy-idle` で常時動いており同一ビルドの再実行で値が変わる、ことによる。今回 **Batch A 対象外の藍花の怨霊でも同じ現象が出ている**ことが、Batch A 由来の回帰でないことの直接の証拠になる。加えて JS／CSS は公開前と byte 同一で、`.enemy-avatar` の箱は決定174 の 56 条件で差 0 CSS px である。

### 5-6. 6-D 神の一撃

4 viewport × 通常戦／神域挑戦の計 8 戦すべてで cut-in を 1 回ずつ観測し、最終打（`.enemy-defeat`）と HP ghost もすべて true。cut-in は神のキービジュアルのみを使い敵 asset を参照しない。

### 5-7. Daily（神域挑戦）

- TODAY'S BOSS：**2026-09-14 藍花の怨霊**（★★★★★・神域強化・藍花の廃社・【遅咲き型】）。全 viewport で同一
- 残り回数：**「挑戦開始（残り3回）」→ 挑戦後「（残り2回）」**
- 戦績：「神域挑戦（直近7日）2026-09-14 藍花の怨霊 7,260 勝利 大耀 1 / 3」として記録
- 戦闘画面の daily タグ表示 OK・scrollY 0・横はみ出し 0

### 5-8. Ranking / Neon の不在（本番実測）

| 検査 | 結果 |
| --- | --- |
| `/api/ranking/start` | **404** |
| `/api/ranking/submit` | **404** |
| `/api/ranking/leaderboard` | **404** |
| 結果画面の Ranking UI | **0**（`hasRankingUi` false・順位/leaderboard の文言なし。全 viewport・全 32 条件） |
| Daily 画面の Ranking UI | **0** |
| bundle 内の `submissionEnabled` | `!1`（= false） |
| Neon / postgres / DATABASE_URL / RANKING_ | dist・bundle とも **0** |
| `/docs/DECISIONS.md`・`/art-source/*`・`/scripts/*` | すべて **404**（配信外） |

---

## 6. juuma（今回の非対象）

CEO 指示により **一切変更していない**。

| 検査 | 結果 |
| --- | --- |
| Production の `art_hq.webp` | 95,502B・`b4d67d588f251c63…`（公開前と同一） |
| master の blob | 同一 |
| 実ゲーム内の naturalSize | 512×512（旧 asset のまま） |
| 目視 | 既知の白フチ・ジャギーを保持＝未修復 |
| `spec/enemy-batch-b1-juuma`（決定176）／`pilot/juuma-restoration`（決定177） | **merge していない**。master 直下の兄弟 branch のまま |

---

## 7. Decision 番号監査

全 branch の `docs/DECISIONS.md` を実査した。

| 番号 | 定義位置 | 備考 |
| --- | --- | --- |
| 〜172 | master（公開済み） | — |
| 173 | `audit/enemy-visual-quality` と batch-a の両方 | **行の sha256 が完全一致**＝同一内容の重複記載。異なる決定の番号衝突ではない。今回 master に入ったのは batch-a 側の 1 行のみ |
| 174 / 175 | batch-a（今回 master へ） | — |
| 176 | `spec/enemy-batch-b1-juuma`（未 merge） | 予約済み |
| 177 | `pilot/juuma-restoration`（未 merge） | 予約済み |

全 branch を走査した既使用番号の最大は **177**。異なる決定が同じ番号を使っている箇所は **0 件**。よって本決定は衝突しない **178** を使用する。

---

## 8. Release Blockers

**0 件。**

## 9. Rollback

不要（重大問題なし）。必要になった場合は `origin/master` を `ad7734b` の内容へ **通常 commit** で戻す（force push はしない）。asset 名を維持しているため、戻した時点で `Cache-Control: max-age=0, must-revalidate` により再訪で旧 asset に復帰する。

## 10. 残課題（今回の対象外）

| 項目 | 内容 |
| --- | --- |
| 世代 A の 4 体 | juuma（決定177 で image-to-image へ移行）→ oni → ryujin → onryo。決定173 の優先順位 4〜7 |
| PC1508 の輪郭過剰 | 決定175 §6。mip 段に乗る canvas 寸法（例 1140）の実機比較は Batch C 候補 |
| Mobile の敵表示サイズ | 124〜182 css px。画質ではなくレイアウトの問題で 6-B follow-up の別 Phase |
| `docs/RELEASE_STATUS.md` | Production HEAD の記載が 2026-09-06 の `7f4b08a` で止まっている（決定172 以降 未更新） |

## 11. 再現コマンド

```
git fetch origin --prune
git diff --name-status master..feat/enemy-visual-batch-a          # 24 files の全差分監査
git merge --ff-only feat/enemy-visual-batch-a                      # transport
npx vitest run && npx tsc -b && npx oxlint && npx vite build        # Pre-release Gate
node scripts/release-audit/ranking-absence.mjs --dist dist
node scripts/release-audit/secret-audit.mjs
git push origin master
# Production QA（本番URL）
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-audit/qa-flow.mjs <out.json> https://seven-gods-game.vercel.app
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-hygiene/screens-smoke.mjs https://seven-gods-game.vercel.app
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/phase6c-decision-feedback/play.mjs <out.json> https://seven-gods-game.vercel.app
```

※ 本番ページは BGM とキービジュアルのストリーミングが続くため `load` イベントが発火しない。上記 3 本を本番 URL に向ける際は `waitUntil` を `domcontentloaded` にする必要がある（今回は scratchpad の複製に対して適用し、**リポジトリのスクリプトは変更していない**）。

## 決定178（提案）

**Enemy Visual Batch A Production Release：PASS / LIVE。** datenshi／karakuri／doukeshi の 3 体を 768px WebP へ差し替えた `feat/enemy-visual-batch-a` `dcfda3a` を `--ff-only` で master へ反映し、Vercel の master 自動 deploy のみで Production へ公開した。本番配信中の 3 体の asset は master の blob と sha256 完全一致、juuma を含む他 4 体は未変更、JS／CSS／HTML は公開前と byte 同一。Release Blockers 0。
