# 決定264 Duel HUD v3 ＋ 決定266 Battle Viewport Stability Hotfix／Hand Readability Polish — 一括 Release Gate（clean RC worktree `SevenGodsGame-d266-rc`・branch `release/d264-d266-duel-hud-rc`）

実施：2026-10-05（Gate 判定は **AI 判断**・CLAUDE.md §6-2。Production push は **CEO 承認**）。完全シリアル実行（6GB RAM・他 lane は docs/code-read のみ）。

| 項目 | 結果 |
|---|---|
| lineage | `a3ffa87`（master＝origin/master）→ `90093b2`（決定264 CSS＋`EnemyPanel.tsx` 1 行＋test）→ `9777151`／`0b6c332`（docs）→ `9c6596a`（決定266 Hotfix CSS＋`BattleScreen.tsx` 1 行＋test）→ `f403a74`（docs）→ `a19166a`（決定266 Polish CSS＋test）→ `bf60a71`／`bbad04c`（docs）＝**fast-forward（merge commit なし）**。`43c10a4`（feat/d224・決定213）は非祖先 |
| 差分ファイル（非 docs・非 scripts） | `battle.css` +374 行・`BattleScreen.tsx` 1 行（`data-hand-count`／`--hand-n`）・`EnemyPanel.tsx` 1 行（`data-enemy`）・`battleViewportLayout.test.ts` +21・`duelHud.test.ts` +56。**`src/core`・`rules.ts`・`public`・`package.json`／lock：0** |
| 静的 | `tsc -b --noEmit` exit 0（`tsc.txt`）／`oxlint src` 0 error・出力なし exit 0（`oxlint.txt`）／`vitest run` **1,312 PASS**・9 skip・107 files（`vitest.txt`） |
| build | `vite build`（clean `dist`）→ JS `index-Bm2fe2Up.js` md5 `69364c9a…`・CSS `index-BPym-jW-.css` md5 `3d39e10f…`＝**Human QA `:4303` dist と完全一致**（`md5.txt`） |
| Production 比較 | Production JS `index-BRcv8Oau.js`（436,152B・md5 `e6c26c81…`）→ RC JS 436,238B：**+86B＝`"data-enemy":e.defId,`（21B・決定264）＋`"data-hand-count":o.hand.length,style:{"--hand-n":o.hand.length},`（65B・決定266）の属性 2 つのみ**（`js-diff.txt`：共通 prefix 383,563／suffix 14,298・差分は 1 連続領域で JSX の属性追加以外に変化なし）。CSS 180,301B → 189,556B（+9,255B） |
| release-audit | `ranking-absence.mjs --dist dist` PASS／`secret-audit.mjs` PASS（`audits.txt`） |
| Human QA | 決定264：CEO 4/4 PASS（2026-10-04・Pilot doc）／決定266：CEO 4/4 PASS（2026-10-05・Hotfix doc §10・Polish 込み） |
| Fast Gate | 決定264 G1〜G15 PASS／決定266 AC1〜AC9 PASS＋Polish AC1〜AC7 PASS・決定264 回帰 52/52 |
| Rollback | master を `a3ffa87` へ戻す（または Vercel で前 deployment `6820829725` へ promote）。runtime 3 commit（`90093b2`・`9c6596a`・`a19166a`）は CSS＋属性 2 つのみで、セーブ・engine・データに影響なし |

**判定：RELEASE GATE PASS → READY FOR CEO PRODUCTION RELEASE APPROVAL**（push／merge／deploy は未実施）。

Production 手順（CEO 承認後・前例＝決定261）：master を RC HEAD へ fast-forward → `git push origin master` → Vercel 自動 deploy → Production Smoke（PC 2 サイズ・SP 2 サイズ・手札 10 枚・console 0）→ DECISIONS に PRODUCTION LIVE / CLOSED を記録。
