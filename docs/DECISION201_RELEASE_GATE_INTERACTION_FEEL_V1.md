# 決定201 — Interaction Feel v1 Production Release Gate 監査

- 日付：2026-09-19
- Release Candidate：`release/interaction-feel-v1-rc` @ **`cc2d2da`**（`origin/master` `3b416da` から作成し `feat/interaction-feel-v1` を ff。upstream 追跡は解除済み）
- Production baseline：`origin/master` = **`3b416da`**（決定198・Vercel deployment `6527081326` success）
- 判定：**PASS — READY FOR CEO PRODUCTION RELEASE APPROVAL**（Production 反映承認ではない。Gate 監査のみ。**master merge・push・deploy は未実施**）
- 区分：各判定は **AI判断**（CLAUDE.md §6-2）。Production 公開は **CEO判断**（§6-3 #8）
- 上流：決定199（監査）・決定200（実装・CEO Human QA PASS / CLOSED）

---

## 0. 結論（先に）

| 項目 | 結果 |
| --- | --- |
| Release Blockers | **0** |
| RC の中身 | `3b416da` ＋ 3 commit（`3470545` 決定198 記録・`e359104` 実装・`cc2d2da` QA 記録）。直線履歴・ff 可能 |
| runtime 差分 | **CSS 5 ファイル＋`App.tsx` の import 1 行のみ**。`src/core` 0・TS/TSX ロジック 0・依存 0・storage キー 0 |
| JS バンドル | sha256 `ba379a57907ecfb1…` ＝ **Production の `index-BUQ9H7AZ.js` と完全一致**（JS は 1 バイトも変わっていない） |
| clean validation（RC） | tsc 0／oxlint 0／clean build 成功／vitest **90 files・1,134 tests** 全通過 |
| Interaction Feel 受け入れ（RC） | **28/28 PASS** |
| E1 回帰 | **ALL PASS**（4 viewport・初陣まで 4.1〜5.3 秒） |
| Solve Loop 回帰 | **17/17 PASS**（初回で） |
| Hardening 回帰 | **ALL PASS** |
| 通し QA（4 viewport） | 通常戦 勝利 R4・続きから再開・神域挑戦 勝利・敗北、外部通信 0 |
| CLS PC / SP | **0.0074 / 0.046**（Production と同値）、44px 未満 0 |
| 画面スモーク | 404 0・JS error 0・壊れた画像 0 |
| Save Migration（Production LIVE → RC） | 欠損 0 |
| Ranking Absence / Secret Audit | **18/18 PASS / PASS** |
| `saveVersion` / `gameVersion` | 9 / `1.80c6eda23ed082dc`（不変。Deploy Timing 制約なし） |
| Rollback | **Vercel Instant Rollback で `3b416da` へ。保存データの巻き戻し不要** |

---

## 1. Git 監査（実測）

| ref | 値 |
| --- | --- |
| origin/master（Production） | `3b416da` |
| local master | `3470545`（＝`3b416da`＋決定198 記録 docs commit・未 push） |
| feat/interaction-feel-v1 | `cc2d2da` |
| merge-base(origin/master, feat) | `3b416da` |
| `3470545` は feat の祖先か | **yes**（決定198 の記録を失わない） |
| RC `release/interaction-feel-v1-rc` | `cc2d2da`（origin/master から `git merge --ff-only feat/interaction-feel-v1`） |
| RC を含むリモート参照 | 0（push なし） |
| 他ブランチ | `feat/entrance-e1` `1cba2e6`・`feat/solve-loop-v1` `3ddcdbf`・`feat/daily-ranking-phase4` `762168f`（**すべて不変**） |
| staged / modified（Gate 開始時） | 0 / 0 |

Production 反映時は `master` を `cc2d2da` へ ff するだけで、決定198 の記録 commit も同時に Production 履歴へ入る。

---

## 2. Exact Diff Audit（`3b416da` → `cc2d2da`）

### 2-1. runtime（`src/`・テスト除く）

| ファイル | 変更 | 内容 |
| --- | --- | --- |
| `src/components/press.css` | **A** +187 | Touch hygiene・Tier 1／2 の `:active`・disabled cue（`filter`）・`:focus-visible`・reduced-motion |
| `src/App.tsx` | M +3 | `import './components/press.css'`（＋コメント 2 行）。**TS/TSX のロジック差分は 0** |
| `src/components/battle/battle.css` | M +54/−32 | hover 8 規則を `@media (hover: hover) and (pointer: fine)` へ |
| `src/components/setup/setup.css` | M +73/−25 | hover 8 規則を guard へ＋敵タイルの `:hover`／`:focus-visible` 分離 |
| `src/components/tutorial.css` | M +6/−3 | hover 1 規則 |
| `src/components/feedback/feedback.css` | M +6/−3 | hover 1 規則 |

`src/core`：**0**。`setTimeout`／`requestAnimationFrame`／`useEffect`／`useState`／`dispatch` の追加：**0**。`localStorage`／`sevengods.` の追加：**0**。

### 2-2. tests / scripts / docs

- tests：`src/components/pressFeel.test.ts`（A・11 件）
- scripts：`scripts/interaction-feel-v1/acceptance.mjs`＋`out/acceptance.json`、`scripts/release-e1-solve-loop/out/prod/*.json`（決定198 の Production QA 証拠 10 本）
- docs：`DECISION198_*.md`（A）・`DECISION200_*.md`（A）・`DECISIONS.md`（M・決定198／200 の行）
- other：**なし**（unexpected files 0）

### 2-3. 不変の機械確認

| 項目 | 結果 |
| --- | --- |
| `package.json` / `package-lock.json` | 差分 0 |
| `saveVersion` | 9 |
| `gameVersion.ts` / `rules.ts` | 差分 0（`gameVersion.test.ts` 10 件 PASS） |
| `.env*` | 存在 0・履歴 0 |
| diff 追加行の ranking／neon／DATABASE_URL／api/／secret／token | `src` 0 件。79 件のヒットはすべて docs の文章と QA 証拠 JSON の「`hasRankingUi: false`」等の**不在を記録する行** |

---

## 3. Clean Validation（RC・`cc2d2da`）

| 項目 | 結果 |
| --- | --- |
| `npx tsc -b --noEmit` | エラー 0 |
| `npx oxlint src` | 警告 0 |
| `rm -rf dist && npm run build` | 成功。`index-BtxBWfrs.js` 432.69 kB（gzip 132.94）／`index-CxIFo0cs.css` 147.50 kB（gzip 27.58） |
| バンドル sha256 | JS `ba379a57907ecfb1…`（**Production と一致**）／CSS `3fdeef0d6995baf7…`（新）／index.html `942c65956bbcf295…`（CSS 名の差のみ） |
| dist に `/api/`・neon・`DATABASE_URL`・`RANKING_` | 0 |
| `npx vitest run --dir src` | **90 files / 1,134 tests 全通過** |

`npm ci` は依存差分 0（lockfile 不変）のため省略。決定200 の取得結果は引用せず、すべて RC で再取得した。

---

## 4. Focused Browser Gate（RC ビルド `vite preview :4181`）

`scripts/interaction-feel-v1/acceptance.mjs`（Production を baseline に比較）：**28/28 PASS**

| 確認対象 | 結果 |
| --- | --- |
| Home Primary press | 押下規則適用・実測 0.0ms |
| God / Enemy / Difficulty selection | 0.0ms（3 要素とも） |
| Battle card press | 65.7ms（transition 中の 1 フレーム遅れ。押下規則は適用） |
| End Round | 0.0ms |
| Result Primary / Retry | 押下規則適用 |
| Reward card | Tier 2 規則（`.reward-card:not(:disabled):active`）を静的テストで確認 |
| touch sticky-hover regression（SP 390×844） | 神タイル・難易度・End Round とも tap 後 `none`。**敵ターン後の End Round も `none`** |
| disabled card visual | 敵ターン中 5/5 枚に `grayscale(0.35) brightness(0.72)`、押しても手札は減らない |
| keyboard focus-visible | Tab で 2px `#ffd166` outline |
| reduced-motion | `:active` の transition 0s・transform／filter は残る（29 セレクタ） |
| PC / mobile viewport | 1508×660 / 390×844 |
| broken images / console errors / 404 | 0 / 0 / 0 |
| CLS / 44px | PC 0.0074・SP 0.046 / 0 |
| カードのタイミング | 手札から消える 310.5ms（Production 334.8ms）・数字 310.5ms・HP 566.4ms。設計値 280ms の帯内、定数変更 0 |

決定200 の CEO Human QA（PC 3 項目・iPhone 3 項目 PASS）は同一 runtime（`e359104` と `cc2d2da` の `src` 差分 0）に対する有効な証拠として採用する。

---

## 5. Protected Core Regression

| 契約 | 確認手段 | 結果 |
| --- | --- | --- |
| Enemy Intent・7R・AP・神託・共鳴・BURST・Cards・Gods・OTOMO・Difficulty・Score・Seed | `src/core` diff 0 ＋ JS バンドル sha256 が Production と一致 ＋ vitest 1,134 | **不変（構造的に保証）** |
| Save / Resume | Save Migration：Production で作った 7 キーを RC で読み「続きから 大耀 vs 業斧の鬼将・ラウンド2」→ R5 勝利。決着後 `battleSave` 消去・残り 6 キー保持 | PASS |
| Daily | 通し QA：4 viewport で神域挑戦 勝利「今日のベスト 7,320（1回目）残り 2 回」。Save Migration：Production で開始した Daily を RC で再開 → 勝利 → 「挑戦開始（残り2回）」 | PASS |
| Result Hub | 通し QA・Solve Loop：Primary 1 個・出口の順序不変 | PASS |
| 49 Matchup Progression | E1 AC21：初撃破「恵比寿 × 試練の影（1/7 神）」記録。Hardening H8：matchups 破損耐性 | PASS |
| **Solve Loop v1** | defeat → same board（AC1 seed／手札／予告／HP 一致）／7R not-cleared → same board（AC2）／victory → new board（AC3 seed 変化）／Daily semantics unchanged（AC4 同日 seed・回数 1→2） | **17/17 PASS** |

---

## 6. E1 Regression（`scripts/entrance-e1/acceptance.mjs`・4 viewport）

**ALL PASS**（AC1〜AC25b・EXTRA-1）。first viewport（AC2〜AC6 32/32）、primary CTA（AC4 32/32）、first battle route（AC7 3 click 4/4・AC8 スクロール 0）、mobile（AC12 16/16・AC13 scrollX 0）、**初陣まで pc1366 4.3 秒／pc1508 4.1 秒／sp760 4.8 秒／sp844 5.3 秒**（設計 15 秒以内）、Home CLS ≤0.1（AC15 32/32）、layout regression なし（EXTRA-1）。

---

## 7. Ranking / Neon / Secrets Isolation

- `feat/daily-ranking-phase4` `762168f`：不変・未参照
- Ranking Absence Gate（RC dist）：**18/18 PASS**（api/・src/server/ 0、`submissionEnabled: false` 1、dist に `/api/`・neon・env 参照 0、fetch は modulepreload と SE .wav のみ）
- Secret Audit：**PASS**（credential 形式 0）
- 通し QA・E1・Solve Loop・Hardening・Save Migration の全リクエスト記録で `/api/`・外部オリジン **0**
- `.env`：存在 0・commit 履歴 0

---

## 8. Rollback Readiness

| 項目 | 内容 |
| --- | --- |
| 戻し先 | Production `3b416da`（Vercel deployment **`6527081326`**・success・現在 LIVE） |
| 方法 | **Vercel Instant Rollback** で `6527081326` へ（秒単位） |
| Git 側 | RC は `3b416da` の直線上（ff 関係）。必要なら `master` に revert commit 1 つ（CSS 5 ファイル＋import 1 行） |
| 保存データ | `saveVersion` 9・storage キー 0 変更のため**巻き戻し不要** |
| 影響範囲 | CSS のみ。JS バンドルは Production と byte 一致のため、戻しても JS の挙動差は生じない |

---

## 9. Release Blockers

**0。**

参考（Blocker ではない・決定199 §13 の既知課題）：結果 Primary の二重押しガード／報酬後の結果 remount／勝利演出 skip 不可／入力復帰の先行／`card_draw` 同時発火／focus trap／BossEntrance 入力貫通／画面 fade／UI 押下 SFX。いずれも本 Release で悪化していない。

---

## 10. Safety（本 Gate で触れていないもの）

`master` `3470545`・`origin/master` `3b416da`・`feat/interaction-feel-v1` `cc2d2da`・`feat/daily-ranking-phase4` `762168f` すべて不変。push 0・merge to master 0・deploy 0・Production 変更 0。既存 untracked（決定194／195／199 の成果物・cinematic feasibility・`敵画像`）は変更・stage・commit していない。QA preview は停止済み。

---

## 11. Final Decision（AI判断）

**決定201：PASS — READY FOR CEO PRODUCTION RELEASE APPROVAL。**

```
【CEO DECISION REQUIRED】
Issue：Interaction Feel v1（決定200）を含む RC cc2d2da の Production 公開（§6-3 #8）
AI Recommendation：承認（master を cc2d2da へ ff → origin/master push → Vercel 自動 deploy → Production Smoke → 決定202 として LIVE 記録）
Reason：Release Blockers 0。CEO Human QA PASS。runtime 差分は CSS＋import 1 行で JS バンドルは Production と byte 一致。Rollback は Instant Rollback のみ
Alternatives：見送り → Production は「押しても反応しない」「iOS で hover が残る」「敵ターン中のカードが押せるように見える」まま
Risk：極低。CSS の見た目のみ。hover 非対応の判定は標準メディアクエリ
Impact if delayed：新規・既存プレイヤーとも最頻操作（カード）に手応えが無いまま
CEO Action：承認 / 拒否
```

---

## 付録：再現コマンド

```
git switch -c release/interaction-feel-v1-rc origin/master && git merge --ff-only feat/interaction-feel-v1
npx tsc -b --noEmit && npx oxlint src && rm -rf dist && npm run build && npx vitest run --dir src
npx vite preview --host --port 4181 --strictPort
node scripts/interaction-feel-v1/acceptance.mjs <out>/feel http://localhost:4181 --baseline https://seven-gods-game.vercel.app
node scripts/entrance-e1/acceptance.mjs <out>/e1 http://localhost:4181
node scripts/solve-loop-v1/acceptance.mjs <out>/solve-loop http://localhost:4181
node scripts/hardening-invalid-enemy-id/acceptance.mjs <out>/hardening http://localhost:4181
node scripts/release-audit/qa-flow.mjs <out>/qa-flow.json http://localhost:4181 --shots <out>/qa-flow
node scripts/release-hygiene/cls.mjs <out>/cls.json http://localhost:4181 --tag rc
node scripts/release-hygiene/screens-smoke.mjs http://localhost:4181 --shots <out>/smoke
node scripts/release-audit/save-migration.mjs <out>/save-migration.json https://seven-gods-game.vercel.app http://localhost:4181
node scripts/release-audit/ranking-absence.mjs && node scripts/release-audit/secret-audit.mjs
```
