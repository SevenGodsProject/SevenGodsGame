# 決定197 — Entrance E1 + Solve Loop v1 Production Release Gate 監査

- 日付：2026-09-18
- branch：`release/e1-solve-loop-rc`（**master `88ca430` から分岐**。`feat/entrance-e1` を ff で取り込み、`feat/solve-loop-v1` を merge。**master merge・push・deploy は未実施**）
- RC HEAD：`442fa9f`（監査対象）
- 判定：**PASS — READY FOR CEO PRODUCTION RELEASE APPROVAL**（Production 反映承認ではない。Gate 監査のみ）
- 区分：統合方式・各判定は **AI判断**（CLAUDE.md §6-2）。Production 公開は **CEO判断**（§6-3 #8）
- 上流：決定193（E1・CEO QA 2〜6 PASS）、決定196（Solve Loop v1・CEO Human QA PASS / CLOSED）、`docs/SEVENGODS_COMMERCIAL_DESIGN_RED_TEAM.md`（決定195・未commit）

---

## 0. 結論（先に）

| 項目 | 結果 |
| --- | --- |
| Release Blockers | **0** |
| 統合方式 | temporary release branch（master 起点・ff＋merge・衝突は `DECISIONS.md` 追記行のみ） |
| 自動回帰 | tsc 0 / oxlint src 0 / build 成功 / vitest `--dir src` **89 files・1,123 tests 全通過** |
| ブラウザ受け入れ | E1 **ALL PASS**（AC1〜AC25b）／Solve Loop **17/17**／Hardening **ALL PASS**／統合仮説 **14/14** |
| Release Hygiene | CLS PC **0.0074**・SP **0.046**、44px 未満 **0**、壊れた画像 **0**、404 **0**、JS error **0** |
| 通し QA（4 viewport） | 通常戦・神域挑戦・敗北すべて決着、`/api/`・外部通信・エラー **0** |
| Save Migration（Production LIVE → RC） | 続きから・戦績・神域挑戦の残り回数 **欠損 0** |
| Ranking Absence Gate | **PASS**（18 項目） |
| Secret Audit | **PASS**（credential 形式の値 0） |
| 不変 | `src/core` runtime 差分 **0**／`saveVersion` **9**／`gameVersion` **`1.80c6eda23ed082dc`**（不変）／新規 storage キー **0**／依存 **0 変更** |
| Deploy Timing 制約 | **なし**（gameVersion 不変のため JST 00:00 制約は発生しない） |
| Release 仮説（§4）への反証 | 部分的に成立（§9）。**Blocker ではない** |

---

## 1. State Audit（開始時点・実測）

| 項目 | 値 |
| --- | --- |
| 開始 branch | `feat/solve-loop-v1` `3ddcdbf` |
| master = origin/master | `88ca430`（Production） |
| feat/entrance-e1 | `1cba2e6` |
| feat/solve-loop-v1 | `3ddcdbf` |
| feat/daily-ranking-phase4 | `762168f`（不変・触れていない） |
| staged / modified | 0 / 0 |
| untracked | 決定194・195 の docs 4 本、cinematic feasibility、`敵画像`、phase3-audit 出力 43 件、solve-loop 受け入れ PNG 6 枚（すべて未変更・未 stage） |
| 稼働中 preview | `vite preview :4181`（決定196 の CEO QA 用・`c03d0bb` ビルド）→ 停止してから RC を配信 |
| 両ブランチの merge-base | `88ca430`＝master（どちらも master から分岐） |

期待値（master=origin=`88ca430`、E1=`1cba2e6`、Solve Loop=`3ddcdbf`）と **すべて一致**。

---

## 2. Integration Strategy Audit

| 候補 | 評価 | 採否 |
| --- | --- | --- |
| **A. temporary release branch（master 起点で両 feature を merge）** | 両 feature の commit をそのまま保ち、master との差分が「両 feature の和」であることを `git log HEAD..feat/*` = 0 で機械確認できる。Production 反映時は master を RC へ ff するだけ | **採用** |
| B. feat/solve-loop-v1 を feat/entrance-e1 に merge | E1 branch を書き換える。E1 単独リリースの選択肢（決定195 の推奨）を失う | 不採用 |
| C. cherry-pick で新 branch | commit ID が変わり、feature branch との対応が追跡しにくい | 不採用 |
| D. master へ直接 merge | 禁止（CEO Gate 前） | 不採用 |

**実施内容**：`git switch -c release/e1-solve-loop-rc master` → `git merge --ff-only feat/entrance-e1`（→ `1cba2e6`）→ `git merge --no-ff feat/solve-loop-v1`。

**衝突**：`docs/DECISIONS.md` のみ（両 branch とも末尾に行を追加）。決定193 → 決定196 → 決定196追記 の時系列で両方を残して解決（357 行・conflict marker 0）。`src/components/GameFlow.tsx` は `startFirstBattle`（E1）と再戦ハンドラ（Solve Loop）が別ハンクのため**自動マージ**。事前の `git merge-tree` dry-run でも同じ結果。

**包含確認**：`git log HEAD..feat/entrance-e1` = 0、`git log HEAD..feat/solve-loop-v1` = 0（両 feature を完全に含む）。

---

## 3. Production Payload（master `88ca430` → RC `442fa9f`）

41 ファイル。内訳：

| 区分 | E1（決定193） | Solve Loop（決定196） |
| --- | --- | --- |
| runtime（src・test 除く） | `App.tsx`・`GameFlow.tsx`・`FirstBattleBrief.tsx`（新）・`setup/HomeScreen.tsx`・`setup/HomeTodayPanel.tsx`・`setup/{firstBattle,heroGod,homePrimary}.ts`（新）・`setup/godStyle.ts`・`setup/setup.css`・`hooks/deckPreferenceStorage.ts` | `GameFlow.tsx`・`hooks/useGameEngine.ts`・`battle/resultHub.ts`・`battle/retrySemantics.ts`（新） |
| tests | `entranceWiring`・`firstBattle`・`heroGod`・`homePrimary`・`dailyFairness`・`deckPreferenceStorage` | `sameSeedRetry`・`retrySemantics`・`solveLoopWiring`・`resultHub` |
| assets | 神 6 柱の `keyvisual-home.webp`＋恵比寿 `keyvisual-hero.webp`（既存正典画像の再エンコード） | なし |
| scripts / docs | `scripts/entrance-e1/*`・phase7 acceptance 更新・E1 audit/spec docs | `scripts/solve-loop-v1/*`・`DECISION196_*.md` |
| 共通 | `docs/DECISIONS.md` | |

`src/core/` の runtime 変更：**0**（両 feature とも表示層・hooks のみ。追加は `sameSeedRetry.test.ts` 1 本）。

---

## 4. Full Regression（RC `442fa9f`）

| 項目 | 結果 |
| --- | --- |
| `npx tsc -b --noEmit` | エラー 0 |
| `npx oxlint src` | 警告 0 |
| `npm run build` | 成功。`index-BUQ9H7AZ.js` 432.69 kB（gzip 132.94）／`index-CPcxsOSa.css` 142.52 kB（gzip 26.95） |
| `npx vitest run --dir src` | **89 files / 1,123 tests 全通過**（master 82 files ＋ E1 4 ＋ Solve Loop 3） |
| `gameVersion.test.ts` | 10 通過。ピン留め値 `1.80c6eda23ed082dc` 不変 |

---

## 5. ブラウザ受け入れ（RC ビルド `vite preview :4181` に対して）

| スイート | 結果 | 要点 |
| --- | --- | --- |
| `scripts/entrance-e1/acceptance.mjs`（4 viewport） | **ALL PASS** | AC1 初回モーダルなし 4/4、AC2〜AC6 Home 構成 32/32、AC7 初陣まで 3 click 4/4、AC8 スクロール 0、AC10 続きから 1 click／未知敵は非表示 8/8、AC11/12 操作要素・44px、AC15 Home CLS ≤0.1 32/32、AC19 Daily 回数不変 8/8、AC20 Home 表示で storage 変化 0 32/32、AC21 初陣＝恵比寿・試練の影・ふつう、AC25 JS error 0・外部通信 0 36/36、AC25b Hero 7 柱 ≤520KB 7/7 |
| `scripts/solve-loop-v1/acceptance.mjs` | **PASS 17/17** | 敗北・未撃破で seed／初期手札／予告／敵HP 一致、勝利は新 seed、Daily は `daily-2026-09-18-enemy_02` のまま・回数 1→2、逃げ道は新 seed、console error 0 |
| `scripts/hardening-invalid-enemy-id/acceptance.mjs`（2 viewport） | **ALL PASS** | 未知 enemyId の Resume／Daily／matchups 破損 5 シナリオ・JS error 0（決定191 の耐性が E1 でも維持） |
| `scripts/release-e1-solve-loop/thesis.mjs`（本 Gate 新規・§9） | **PASS 14/14** | 初陣→敗北→「同じ盤面でもう一度」で seed・手札・予告一致（PC/SP） |

---

## 6. Release Hygiene（決定170 の Gate を再計測）

| 項目 | master（決定170 時） | RC | 判定 |
| --- | --- | --- | --- |
| CLS PC / SP（入力起因除く） | 0.0074 / 0.046 | **0.0074 / 0.046** | ✅ 同値 |
| 44px 未満の操作要素 PC / SP | 0 / 0 | **0 / 0** | ✅ |
| 全画面スモーク（PC・SP 各 9 画面） | 壊れた画像 0 | **壊れた画像 0・404 0・JS error 0** | ✅ |
| 通し QA（pc1366／pc1508／sp760／sp844） | – | 通常戦（続きから再開→勝利）・神域挑戦（勝利）・敗北（pc1508）すべて決着、**`/api/` 0・外部 0・エラー 0** | ✅ |

---

## 7. Save Migration（Production LIVE `88ca430` → RC）

`scripts/release-audit/save-migration.mjs <out> https://seven-gods-game.vercel.app http://localhost:4181`（Production は独立コンテキストで読み込むだけ。実ユーザーの storage には触れない）。

| 項目 | 結果 |
| --- | --- |
| Production で作った storage キー 8 種 | RC で「続きから 大耀 vs 業斧の鬼将・ラウンド2」を表示・再開・R5 勝利まで進行。決着後は `battleSave` が消え、残り 7 キーは保持 |
| 戦績（`records`：大耀 best 927・1 勝） | RC で保持 |
| 神域挑戦（Production で 1 回開始・R2 中断） | RC で再開（daily tag）→ 勝利 → 「今日のベスト 7,310（1回目）残り 2 回」・開始ボタン「挑戦開始（残り2回）」 |
| network | `api: []`・`external: []`・`errors: []` |

---

## 8. Ranking / Neon / Secret / Integrity

| Gate | 結果 |
| --- | --- |
| Ranking Absence（`ranking-absence.mjs`） | **PASS 18/18**（api/・src/server/ 0、`submissionEnabled: false` 1、dist に `/api/`・neon・`RANKING_` 0、fetch は modulepreload と SE .wav のみ） |
| Secret Audit（`secret-audit.mjs`） | **PASS**（credential 形式 0。残りは `rules.ts` の識別子と履歴の識別子のみ・値は出力していない） |
| `feat/daily-ranking-phase4` | `762168f` 不変・未参照 |
| Neon | 接続・設定・出力 0 |
| Daily integrity | 同日共有 seed・3 回/日・JST リセットとも不変（Solve Loop の配線テストが `startDailyGame` の seed 経路不変を機械保証、受け入れ AC4 で実機確認） |
| 依存 | `package.json`／`package-lock.json` 差分 0 |

---

## 9. Release Thesis の反証（§4「Entry → Battle → Failure → Think → Retry → Solve」）

**接続の事実**：E1 の `startFirstBattle` は `godId`／`deck`／`difficulty`／`stake`／`selectedEnemyId` を通常戦と同じ state に置いてから `engine.startGame` を呼ぶ。Solve Loop の再戦ハンドラは `godId && deck` を前提に `engine.state.seed` を渡す。**初陣→敗北→「同じ盤面でもう一度」** が PC/SP とも成立（seed `seed-1789736894244` が再戦後も同一、初期手札 `💀 見切り / ✨ 神楽舞 / ⚔ 大漁 / 🌿 福授け / 🛡 鉄壁の構え` と予告 `⚔ 50` が一致）。初陣→勝利は新 seed。初陣は Daily 回数に触れない。

**反証で見つかったこと（Blocker ではない）**：

1. **初陣は「負けない」設計である。** 決定193 のシミュレーション（試練の影×おすすめデッキ、初心者代理 3 種×300 seed）で恵比寿は全条件 **勝率 100%・敗北 0**。したがって仮説の「Failure」は初陣では原理的に起きず、**Solve Loop v1 が最初に効くのは 2 戦目以降（プレイヤーが自分で選んだ神・敵・難易度）**である。仮説を「初陣で Loop が閉じる」と読むと誤りで、正しくは「E1 が初陣までの摩擦を減らし、Solve Loop が 2 戦目以降の敗北を学習に変える」。両者は同じ試合で繋がるのではなく、**同じセッションの中で順に効く**。
2. **通常戦の「ふつう」も負けにくい**（決定186：先読みなし AI で勝率 100%）。Solve Loop が実際に踏まれる頻度は、むずかしい・神階・敵の型（機工師・魔獣・道化）に依存する。決定195 の L7「Solve Legibility」の課題はこの Release で解消しない。
3. **測定手段がない。** 「Failure→Retry」がどれだけ踏まれたかは計測 0 のため Production で分からない（決定195 KPI ③は未導入）。本 Release の効果は CEO Human QA と Feedback の声でしか観測できない。

**判定**：仮説は「順に効く」に修正すれば成立する。Release を止める理由にはならない（両 feature とも単独で価値があり、Human QA PASS 済み）。

---

## 10. Safety（本 Gate で触れていないもの）

- `master` = `origin/master` = `88ca430`（不変）。push 0・merge to master 0・deploy 0・Production 変更 0
- `feat/entrance-e1` `1cba2e6`・`feat/solve-loop-v1` `3ddcdbf`・`feat/daily-ranking-phase4` `762168f` 不変
- 既存 untracked（決定194・195 docs 4 本・cinematic feasibility・`敵画像`・phase3-audit 出力・solve-loop PNG）は変更・stage・commit していない
- RC を含むリモート参照 0（未 push）
- QA preview は停止済み

---

## 11. Rollback 設計（Release 後に問題が出た場合・AI 案）

- storage 変更 0・saveVersion 不変のため、**Vercel Instant Rollback で `88ca430` の deployment へ戻すだけ**でよい（保存データの巻き戻し不要）
- E1 だけ・Solve Loop だけを戻したい場合も、feature branch が独立しているため master へ片方の revert commit で対応できる

---

## 12. Final Decision（AI判断）

**決定197：PASS — READY FOR CEO PRODUCTION RELEASE APPROVAL。**

Release Blockers 0。Production への反映（`master` を `release/e1-solve-loop-rc` `442fa9f` へ ff → `origin/master` push → Vercel 自動 deploy → Production Smoke → 決定198 として LIVE 記録）は **CEO の明示承認後にのみ** 行う。

```
【CEO DECISION REQUIRED】
Issue：Entrance E1（決定193）＋ Solve Loop v1（決定196）を統合した RC 442fa9f の Production 公開（§6-3 #8）
AI Recommendation：承認（master を RC へ ff → push → 自動 deploy → Production Smoke）
Reason：Release Blockers 0。両 feature とも CEO Human QA PASS 済み。storage 変更 0・gameVersion 不変で Rollback は Instant Rollback のみで済む
Alternatives：E1 のみ先行 → 可能だが、Solve Loop は既に QA PASS で待たせる理由がない。Living Still を待つ → 決定195 §14 のとおり Production 流入者に 44 点の入口を強いる
Risk：初陣は負けない設計のため Solve Loop の効果は 2 戦目以降にしか現れない（§9）。効果の計測手段は無い
Impact if delayed：Production は 7 click・699 字 tutorial の入口と、敗北後に別の手札が来る再戦のまま
CEO Action：承認 / 拒否
```

---

## 付録：再現コマンド

```
git switch -c release/e1-solve-loop-rc master
git merge --ff-only feat/entrance-e1
git merge --no-ff feat/solve-loop-v1        # docs/DECISIONS.md のみ手動解決（両行を時系列で残す）
npx tsc -b --noEmit && npx oxlint src && npm run build
npx vitest run --dir src
npx vite preview --host --port 4181 --strictPort
node scripts/entrance-e1/acceptance.mjs <out>/e1 http://localhost:4181
node scripts/solve-loop-v1/acceptance.mjs <out>/solve-loop http://localhost:4181
node scripts/hardening-invalid-enemy-id/acceptance.mjs <out>/hardening http://localhost:4181
node scripts/release-e1-solve-loop/thesis.mjs <out>/thesis http://localhost:4181
node scripts/release-audit/qa-flow.mjs <out>/qa-flow.json http://localhost:4181 --shots <out>/qa-flow
node scripts/release-hygiene/cls.mjs <out>/cls.json http://localhost:4181 --tag after
node scripts/release-hygiene/screens-smoke.mjs http://localhost:4181 --shots <out>/smoke
node scripts/release-audit/save-migration.mjs <out>/save-migration.json https://seven-gods-game.vercel.app http://localhost:4181
node scripts/release-audit/ranking-absence.mjs
node scripts/release-audit/secret-audit.mjs
```
