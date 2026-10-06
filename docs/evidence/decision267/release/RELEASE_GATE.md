# 決定267 Reward Relevance v1 — Release Gate（clean RC worktree `SevenGodsGame-d267-rc`・branch `release/d267-reward-relevance-rc`）

実施：2026-10-07（Gate 判定は **AI 判断**・CLAUDE.md §6-2。merge／push／Production deploy は **CEO 最終承認**待ち）。完全シリアル実行（6GB RAM・並行 Lane 5 は docs/code-read のみ）。

| # | 項目 | 結果 | 証跡 |
|---|---|---|---|
| 1 | merge 対象 commit | `202e476`（master＝origin/master・fetch 済み・0/0）→ `2ed4f95`（docs 取り込み）→ `a2e02b5`／`db2a472`／`ce84a61`／`da84195`（runtime ①〜④）→ `f350726`（css 行末復元）→ `6b2cf8a`／`76cbb5e`（Pilot doc・Human QA PASS）→ `bd70574`／`33705e8`（determinism.mjs）→ 本 Gate の docs/scripts commit。**runtime は 4 commit＋行末復元 1** | `git log master..HEAD` |
| 2 | conflict | master は RC の祖先＝**fast-forward・merge commit なし・conflict 0** | `git merge-base --is-ancestor` |
| 3 | `src/core` 差分 | **0**（`git diff --stat master -- src/core` 空） | `core-diff-stat.txt`（Pilot）・本 Gate で再確認 |
| 4 | tsc | `tsc -b --noEmit` exit 0 | `tsc.txt` |
| 5 | oxlint | `oxlint src` 0 error・出力なし exit 0 | `oxlint-src.txt` |
| 6 | vitest | **1,330 PASS**・9 skip・110 files（既存 1,312＋新規 18） | `vitest.txt` |
| 7 | production build | `vite build`（clean dist）exit 0 | `build.txt` |
| 8 | bundle/hash | JS `index-3It0LpNO.js` 460,271B md5 `c41abc0782e0…`／CSS `index-CJxzYDUP.css` 190,811B md5 `71160cd987db…`＝**Human QA `:4305` dist と完全一致**。Production `index-Bm2fe2Up.js` 455,895B → +4,376B（共通 prefix 351,557B・差分は minify の識別子再割当を含む 1 連続領域で、RC 側に `rewardHistory`／役割文言／`reward-toast` を含む）。release-audit `ranking-absence.mjs` PASS／`secret-audit.mjs` PASS | `md5.txt`・`js-diff.txt`・`audits.txt` |
| 9 | PC Smoke（1508×660） | U1／U3／U5：Home → 神選択 → 敵選択 → 編成 → 戦闘 → 結果 → 報酬／Result Hub。console error 0・横スクロール 0 | `acceptance-out-run3/` |
| 10 | SP Smoke（390×844） | U2／U4／U6：同上。報酬カードは 2＋1 段・チップ／枚数行が枠内 | 同上 |
| 11 | Reward 3 択回帰 | 常に 3 枚・重複なし・役割チップ（即戦力／神の個性／次の構築）・「いま n 枚編成中／上限 m → m+1」・サブタイトル新文言。恵比寿×試練（seed `d267-u1-pc`）＝共振／潮招き／癒し（Pilot と同一） | run3 U1／U2 |
| 12 | pick → copy limit 反映 | 選択で `sevengods.rewardBonuses[ebisu][選んだ札]` +1・トースト「次回の編成で『共振』を 3 枚まで積めます」→ Result Hub | run3 U1／U2（AC10・AC14） |
| 13 | skip → 次 2 勝の再提示防止 | 見送りで bonus 不変・`offered`＝`declined`＝提示 3 枚。別 seed の 2 勝目（`d267-u2-sp`）の 3 択は 1 勝目の 3 枚と交わらない（PC／SP とも同一結果＝決定論） | run3 U3／U4（AC11・AC12） |
| 14 | Daily 報酬非表示 | Daily 勝利で `open-reward` 無し・`result-hub` 直接・`daily-diff` あり・`sevengods.rewardHistory` 未作成 | run3 U5／U6（AC15） |
| 15 | localStorage migration | 旧 `rewardBonuses` v1（taiyo:2・ebisu 一撃:1）は起動時に書き換えず保持＋選んだ札のみ +1／壊れた `rewardHistory`（version 2・型不正）は起動時に消されず空として扱われ 3 択成立・確定時に version 1 で書き直し／`records`・`deckPreference` 不変／余り枠あり札は非提示 | `migration-out/summary.json` **10/10 PASS** |
| 16 | deterministic Seed 不変 | 同 seed `d267-det`・同 bot で **RC と Production の予告列（50／80／強打 110／特大 150／強打 130）・打ち筋 12 手・recap が完全一致** | `determinism-rc.json`／`determinism-prod.json` |
| 17 | score 不変 | 同上で **スコア 8,700＝8,700**（勝利・同ラウンド） | 同上 |
| 18 | console error 0 | 全 run（acceptance 6＋migration 1＋determinism 1）で pageerror／console.error 0 | 各 summary.json `errors: []` |
| AC | 既存 AC1〜AC18 | すべて PASS（Pilot Gate と同一判定・run3 で再確認） | `acceptance-out-run3/summary.json` |

**計測不能の記録**：run1 で U4、run2 で U3 が「勝利 bot が 3 回とも敗北」で計測不能（製品異常 0）。原因＝U3／U4 は seed 無指定で、敗北後の「同じ盤面でもう一度」は同 seed＝決定論 bot では結果が変わらないため再挑戦が無意味だった（Smoke ケース設計の誤り・決定266 Smoke と同種）。対策＝U3／U4 を固定 seed（1 勝目 `d267-u1-pc`・2 勝目 `d267-u2-sp`）に変更し AC12 の「別 seed」前提を明示的に満たす形へ修正（`acceptance.mjs`）。run3 で **6/6 PASS**。run1／run2 の summary.json も保全（PNG は run3 のみ）。

**判定：RELEASE GATE PASS → RELEASE READY（READY FOR CEO PRODUCTION RELEASE APPROVAL）**。merge／push／deploy は未実施。

Production 手順（CEO 承認後・前例＝決定264＋266）：master を RC HEAD へ fast-forward → `git push origin master` → Vercel 自動 deploy → Production Smoke（PC／SP・通常勝利→報酬 3 択→選択／見送り・Daily 非表示・console 0）→ DECISIONS に PRODUCTION LIVE / CLOSED を記録。Rollback＝master を `202e476` へ戻す／Vercel で deployment `6859334890` を promote。runtime は UI 層のみで save・engine・score・データに影響なし（`sevengods.rewardHistory` は旧コードが読まないため残っても無害）。
