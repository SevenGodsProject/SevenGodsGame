# Release Safety Preflight（RL-02／03／04／07）— v1.0 前の安全網

- 日付：2026-10-09（Lane 1・**AI 判断**（CLAUDE.md §6-2）・`docs/ROADMAP_TO_RELEASE.md` §2 #4／#5・§3 #2 の実体化。CEO 指示 2026-10-09「RL-01 統合後は Release Safety の Preflight と、独立して実施できる安全な作業を進める」）
- 状態：**RL-03／RL-04 IMPLEMENTED ON BRANCH `feat/release-safety-v1`（master merge は CEO 承認後）／RL-02 後半・RL-07 は計画のみ（Production 操作・origin への push は CEO 判断）**
- 前提：integ master `3884398`（RL-01 統合済み `c7b225b`＋docs）。origin/master `641ea5c`（Production）との差は未 push 9 commit。push・deploy 0

---

## 1. 現在地

| ID | 項目 | 状態 | 根拠 |
|---|---|---|---|
| RL-02 前半 | `RELEASE_STATUS.md` 正本化 | **完了（2026-10-07）** | ROADMAP §2 #2 |
| RL-02 後半 | Rollback 演習 1 回＋Day-1 運用メモ | **未演習**（記録のみ） | §3 |
| RL-03 | CI 1 本（PR：tsc／oxlint／vitest） | **本 branch で実装**（`.github/workflows/ci.yml`） | §2-1 |
| RL-04 | `playwright` を devDependencies に宣言 | **本 branch で実装**（`playwright@1.63.0` exact・lockfile 更新） | §2-2 |
| RL-07 | docs 系 branch の push | **計画のみ**（origin への push は CEO 確認後） | §4 |
| RL-01 残り | d267 `migration.mjs` M2 条件 | **本 branch で反転**（R3 に合わせた） | §2-3 |
| RL-01 残り | `otomo.defId` guard | **別 branch `feat/rl01b-otomo-defid-guard`**（Save 読み取り経路に触れるため別 Gate） | §2-4 |
| RL-01 残り | `save-migration.mjs` 合成 fixture 注入モード | 未着手（`storageCompat.test.ts` が同じ契約を vitest で固定済み。2 ビルド実機方式は現状維持） | — |

## 2. 本 branch の変更

### 2-1. RL-03 CI（`.github/workflows/ci.yml`）

- trigger：`pull_request`（master 向け）／`push`（master）／手動
- job 1 本：`actions/checkout@v4` → `setup-node@v4`（Node 24・npm cache）→ `npm ci` → `tsc -b` → `oxlint` → `vitest run --reporter=dot` → `vite build`
- 含めないもの：Playwright（ブラウザ）・決定論シミュレーション（RAM・時間。ローカルで直列）
- `concurrency` で同一 ref の多重実行を取り消し・`permissions: contents: read`・timeout 15 分
- **「Actions 緑 1 回」は origin に push された後にしか確認できない**（本 PC では YAML の構文と手順の整合のみ確認）

### 2-2. RL-04 playwright 宣言

- `package.json` `devDependencies` に `"playwright": "1.63.0"`（exact・integ worktree に実在する版と一致）・`package-lock.json` 更新
- `scripts/` 34 本が `import ... from 'playwright'` または `PLAYWRIGHT_MODULE` 経由で使用。clean clone で `npm ci` → `npx playwright install chromium` で acceptance／migration／determinism スクリプトが動く
- ブラウザ本体は `npm ci` では落ちてこない（`npx playwright install` が必要。CI では実行しない）

### 2-3. d267 `migration.mjs` M2 の反転

- 旧：「version 2 の rewardHistory は確定時に version 1 で書き直される」＝PASS → RL-01 R3（未来 version は書かない）と逆
- 新：「確定後も未来 version（v2）の rewardHistory は 1 バイトも書き換えられない」＝PASS（`after.history === BROKEN_HISTORY`）
- スクリプトのみ・runtime 0。次に d267 の migration を回すときに整合する

### 2-4. `otomo.defId` guard（別 branch）

- 内容：`src/components/otomoLookup.ts`（`isKnownOtomoId`／`safeOtomoName`・決定191 の `enemyLookup.ts` と同型・`src/core` 不変）＋ Home の「続きから」条件に `isKnownOtomoId(savedBattle.otomo.defId)` を追加＋配線テスト
- 効果：保存に現在の OTOMO 定義に無い id が入っていても白画面にならない（Resume を出さないだけ。保存データは削除・修正しない）
- データ消失との関係：**なし**（クラッシュ耐性。保存は残る）。v1.0 で OTOMO id の変更予定はないため P0 ではない

## 3. RL-02 後半：Rollback 演習（計画・Production 操作は CEO ★ #8）

| 手順 | 内容 | 誰が |
|---|---|---|
| 0 | 前提：Production＝deployment `6894408979`（決定267）・Rollback 先＝`6859615239`（`RELEASE_STATUS.md` A-1） | 記録済み |
| 1 | Vercel Dashboard → Project → Deployments → `6859615239` → **Promote to Production**（または `vercel promote <deployment-url>`） | **CEO**（#8） |
| 2 | Production Smoke：`https://seven-gods-game.vercel.app/` で Home 表示・戦闘 1 ラウンド・Console error 0・`gameVersion` 表示が前版（決定266）と一致 | AI（既存 `scripts/release-audit/qa-flow.mjs` 相当・read-only） |
| 3 | **戻す**：`6894408979` を再 Promote → 同じ Smoke | CEO → AI |
| 4 | 所要時間・手順の詰まり・Known 差分を `docs/evidence/release-safety/rollback-drill.md` に記録。Day-1 運用メモ（`RELEASE_STATUS.md` 当日運用）に「Rollback は Promote 2 回・N 分」と追記 | AI |
| 影響 | 手順 1〜3 の間、外部ユーザーには前版が配信される（数分）。Save 互換：前版 ↔ 現版は同じ `saveVersion` 9・台帳 key も同 version → RL-01 により双方向で消失 0 | — |

実施は **Public Face Pack（CM-01）と RL-01 を含む次の Production Release の直後**に 1 回行うのが最も情報量が多い（「新→旧→新」で RL-01 の未来 version 保護も同時に実機確認できる）。

## 4. RL-07：docs 系 branch の push（計画・origin への push は CEO 確認後）

- 現状：origin に未マージの branch **45 本**（うち `docs/` 系 19 本：`docs/battle-composition-v2-preflight`／`docs/commercial-rc-pregate`／`docs/composition-v3-duel-hud-preflight`／`docs/d254-game-entry-preflight`／`docs/d256-daily-competitive-gate`／`docs/d257-d259-decision-rows`／`docs/d259-daily-spread-preflight`／`docs/d262-answer-visibility-preflight`／`docs/d265-video-final-delivery`／`docs/d267-reward-value-audit`／`docs/hand-decision-density-audit`／`docs/lane1-post-d254-practical-qa-reaudit`／`docs/lane2-ranking-integration-preflight`／`docs/lane3-commercial-presentation-audit`／`docs/opening-hand-read-preflight`／`docs/post-d257-remaining-work-audit`／`docs/post-d262-lanes-integration`／`docs/rc-pregate-m2-ledger`／`docs/shogunate-faction-design-v1`）
- 方針：**master 以外の branch を origin へ push しても Production には影響しない**（Vercel は master のみ）。ただし CEO の Git 安全条件「origin/master への push 禁止」の趣旨に沿い、**docs branch の push も CEO の一言（承認）を待つ**。公開 repo であれば内容（Decision 文書・Evidence）が外部に見えることを前提に判断する
- 実行コマンド（承認後・AI）：`git push origin docs/<name>`（19 本を個別に。`--all` は使わない）

## 5. Gate（本 branch）

| 項目 | 結果 |
|---|---|
| `node --check` migration.mjs | PASS |
| tsc / oxlint / full vitest / build | §6 に記入 |
| `src/core` 差分 | 0 |
| runtime 差分 | 0（CI 定義・devDependency・スクリプト・docs のみ） |

## 6. 実測（追記）

| 項目 | 結果（2026-10-09・本 worktree） |
|---|---|
| tsc -b | 0 error |
| oxlint | error 0 |
| full vitest | **1,385 PASS・9 skip・0 fail**（112 files） |
| vite build | PASS（JS 461.40kB＝RL-01 統合後の master と同一） |
| 差分 |  +1・ +32/−2・ ±5・ 新規・本書。 0 ファイル・ 0 行 |
