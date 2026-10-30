# v1.0.3 RC Gate — 初心者語彙 完結 ＋ Home 2 戦目導線 ＋ 敗北画面の事実行 ＋ RETURN TO CALM（小）＋ SP 手札本文 9.5px（決定283 候補）

> **状態（2026-10-22・Lane 1・PM／Dev・AI 判断）：RC `release/v1_0_3-rc`（worktree `SevenGodsGame-lane3`・起点 master `0d38c05`＝v1.0.2 Production）の Fast Gate G0〜G10 を実測し、**すべて PASS（Known 1 件＝v1.0.2 から存在する神の一撃札の 2px 枠 overflow・本 RC の変更外）**。**READY FOR CEO PRODUCTION RELEASE APPROVAL**（push／PR／merge／deploy は未実施・Lane 6 Release 監査の結果を添えて提出）。

- CEO 指示：2026-10-22「v1.0.3 優先」（Lane 5 成果の追従・語彙／2 戦目導線の維持・敗北画面の事実行＋RETURN TO CALM 小・SP 本文 9→9.5px・変更範囲限定・Fast Gate・公開記録 418a387 の取り込み検証）
- 入力：`docs/V1_0_3_UX_BUNDLE_V1.md`（束 #1・#3）／`docs/V1_0_3_RC_NOTES.md`（事実行・+200ms・9.5px）／Lane 6 `FUN_BALANCE_AUDIT_V1.md` §7 #1／Lane 7 `COMBAT_PREMIUM_AUDIT_V2.md` §15 #1／Lane 8 `MOBILE_UX_AUDIT_V1.md` §4（編集位置 `battle.css:5638`）
- 証跡：`docs/evidence/v1_0_3-rc/`（500KB 超 PNG は WebP 化）
- 守った禁止事項：`git push`／master への merge／tag／deploy／force：0。Lane 2（忠次）・Lane 3（crisis）・Lane 4（カード画像）・ランキングの混入 0（§2）

---

## 0. 結論（先に）

| 区分 | 内容 |
|---|---|
| 内容（runtime 5 束＋version） | ① 初心者語彙 完結（遊び方 ②「⚔」除去 74 字・③「防御（ブロック）」87 字・コツ ③ 46 字・コツ 7 本目「強打・特大」）② Home 2 戦目導線（初陣 1 戦のみ → Primary「神を選ぶ」）＋ C-4 敗因「必殺技」→「必殺」③ 敗北画面の事実行「必殺 N を加護（予告の50%のブロック）で受けていれば残HP X」（表示層の純関数・敗北時のみ・加護でも 0 なら出さない）④ RETURN TO CALM（小）＝`planResultGate` +120→+200ms ⑤ SP 手札本文 9→9.5px（158px 札・`@media (max-width:899px)`。140px 札＝高さ ≤720 は 9px 据え置き）⑥ version 1.0.3 |
| 起点と commit | `0d38c05` → `e533d5f` merge `feat/v1_0_3-ux-bundle`（2654aed・conflict 0）→ `1343024` merge `418a387`（v1.0.2 公開記録・docs のみ・conflict 0）→ `229a8ac` 事実行 → `55bbd0b` +200ms＋9.5px → `5df698a` Notes＋sp-text-check → `374e7c0` version 1.0.3 → `7eef5f2` 受入スクリプト → 本書＋証跡 commit |
| 不変性 | `src/core` 差分 **0**（`git diff 0d38c05 HEAD -- src/core` 空）＝gameVersion `1.d794038a00b5b53c`・save v9・rules・CORE 7 体 不変。storage 書き込み 0。CSS 変更は SP 本文 font-size のみ（+13/−1） |
| 自動 Gate（§3） | tsc 0／oxlint 11（master 基準・新規 0）／vitest **1,528 PASS・0 fail・17 skip**（1,504＋束 11＋新規 13）／build `index-C_e5frXY.js` **472.84 kB**（+2.12 kB）・css 194.90 kB／Ranking Absence PASS／Secret PASS／受入 **44/44**（束 #1 文言へ更新した v1.0.3 版）／語彙 **20/20**／敗北画面 **18/18**（PC・SP375 で事実行「必殺260を加護（予告の50%のブロック）で受けていれば残HP30」）／SP 本文実測 **25/29**（本文・条件行の overflow 0・font-size PC 9.5／SP390 9.5／SP375 9。FAIL 4 件は Production v1.0.2 でも同一＝Known §4）／Home `v1.0.3 (374e7c0)` |
| 公開記録 418a387 | RC に merge 済み（`git merge-base --is-ancestor` 真・差分は docs/evidence のみ・RELEASE_STATUS A-0＝v1.0.2 LIVE・DECISIONS 末尾＝決定282 LIVE） |
| Known | §4：神の一撃札（大耀「豪快な一撃」等・READY 枠）の `.card-view` 要素が 2px overflow（本文・文字は収まる）・札高さ +6px。**v1.0.2 Production で同一値**＝本 RC の変更外。新規 Known 候補として記録 |
| CEO 判断 | Production 公開承認 1 件のみ（§6-3 #8）。内容は §6-2（軽微 UI・UX・演出・AI 判断） |

---

## 1. 変更の内訳（`git diff --stat 0d38c05 HEAD -- src`：17 files・+548／−40）

| 束 | ファイル | テスト |
|---|---|---|
| ① 語彙 完結 | `tutorialContent.ts`（4 行）・`tutorial.css`（コメント） | `tutorialWording.test.ts` 8→11 |
| ② Home 2 戦目導線＋C-4 | `setup/homePrimary.ts`（`isFirstBattleOnly`・C'）・`setup/HomeScreen.tsx`・`battle/defeatCause.ts`（1 語） | `homePrimary.test.ts` 14→21・`defeatCause.test.ts` +1 |
| ③ 事実行 | `battle/defeatFacts.ts`（新規 108 行）・`GameOverOverlay.tsx`（`defeatFact` prop・`data-testid="defeat-fact"`）・`BattleScreen.tsx`（+2） | `defeatFacts.test.ts` 9（engine replay で事実性を検証） |
| ④ RETURN TO CALM（小） | `enemyVfxTiming.ts`（`RESULT_GATE_AFTER_HP_MS = 200`）・`combatTimeline.ts`（`planResultGate`） | `combatTimeline.test.ts` +1 |
| ⑤ SP 本文 | `battle.css`（158px 札 9.5px・140px 札 9px 据え置きを別 media block で宣言） | `spHandTextSize.test.ts` 3・`cardGodLabelLowscreen.test.ts`（決定238・不変） |
| ⑥ version | `package.json`・`package-lock.json`×2・`publicFace.test.ts` | 5 |

混入チェック（`git diff --name-only 0d38c05 HEAD` 全件）：`crisis`／`tadatsugu`／`shogunate`／`enemies.ts`／`gameVersion`／`ranking`／`cardArt`／`api/`：**0**。

---

## 2. Gate 実測（直列・2026-10-22）

| # | Gate | 結果 | 数値 | 証跡 |
|---|---|---|---|---|
| G0 | worktree | PASS | tracked 差分 0（commit 後） | — |
| G1 | `tsc -b --noEmit` | PASS | 0 | `01-tsc.txt` |
| G2 | `oxlint .` | PASS | 警告 11（master 基準・新規 0） | `02-oxlint.txt` |
| G3 | `vitest run` full | PASS | 124 files・**1,528 PASS**・0 fail・17 skip・期待（1,504＋11＋13）一致 | `03-vitest.txt` |
| G4 | `npm run build`（1.0.3・HEAD 374e7c0） | PASS | `index-C_e5frXY.js` 472.84 kB（gzip 147.27）・`index-bwEHtD6x.css` 194.90 kB | `04-build.txt` |
| G5 | Ranking Absence | PASS | RESULT PASS | `05-ranking-absence.txt` |
| G6 | Secret Audit（基点 0d38c05） | PASS | credential 形式 0 | `06-secret-audit.txt` |
| G7a | 受入 `scripts/v1_0_3-rc/acceptance.mjs`（v1.0.1 版を束 #1 の確定文言へ更新） | PASS | **44/44**（Home `v1.0.3 (374e7c0)`・Brief 3 行・② 74 字・③ 87 字・コツ 7 本・敵選択注記＋★・overflow 0・JS error 0・外部 0） | `07a-acceptance/` |
| G7b | 語彙 3 点 `vocab-check.mjs`（v1.0.2 の回帰） | PASS | **20/20** | `07b-vocab/` |
| G7c | SP 本文実測 `sp-text-check.mjs`（PC 1508／SP375×667／SP390×844） | PASS（Known 4） | **25/29**：デッキ編成 全カード overflow 0・手札 5 枚の本文／条件行 overflow 0・font-size PC 9.5／SP390 9.5／SP375 9（140px 札）・条件行 9・横スクロール 0。FAIL 4＝神の一撃札の `.card-view` 2px overflow（PC・SP375）と札高さ +6px（SP375／SP390）＝**Production v1.0.2 で同一**（`07c-sp-text-production-v102/`・24/29・差は SP390 の font 9→9.5 のみ） | `07c-sp-text/` |
| G7d | 敗北画面 `defeat-check.mjs`（大耀 × 鬼将・R4 断岩） | PASS | **18/18**：結果画面・敗因・事実行「必殺260を加護（予告の50%のブロック）で受けていれば残HP30」（31 字・2 行以内・overflow 0）・「敵の残り HP」行は 1 回・JS error 0 | `07d-defeat/` |
| G8 | Home version smoke | PASS | `v1.0.3 (374e7c0)`・errors 0・外部 0 | `10-home-version.json` |
| G9 | 418a387 取り込み | PASS | ancestor 真・docs のみ・A-0＝v1.0.2 LIVE | §0 |
| G10 | 結果 mount +200ms | PASS（単体） | `combatTimeline.test.ts` で `planResultGate`＝`visualHpEndMs + 200` を固定。ブラウザ実測は省略（表示層の定数 1 つ） | `03-vitest.txt` |

| G11 | 旧セーブ互換（v1.0.2 build `index-xO5hO-tv.js`＝Production と byte 一致の RC build × v1.0.3 RC build・`save-migration.mjs`・channel:chromium） | PASS | **44/44**（Lane 6 監査の条件 C2・2026-10-23 実測） | `09-save-migration/` |

UNRUN：なし。Production Smoke S7 でも同手順を再実施する。

---

## 3. Known（v1.0.2 から存在・本 RC 変更外）

| # | 内容 | 実測 | 扱い |
|---|---|---|---|
| 1 | 一部の札（PC＝神の一撃札「豪快な一撃」・SP375＝同札または「姉御の号令」）の `.card-view` 外枠が scrollWidth +2／scrollHeight +2（本文 `.card-view-body`・`.card-view-text`・条件行の overflow は 0） | RC：PC・SP375／Production v1.0.2：PC・SP375 で同型（独立監査 DELTA で確認） | 枠の装飾（outline／box-shadow の内側要素）由来と推定。表示上の欠けは目視で未確認（スクショ `07c-sp-text/hand-*.webp`）。v1.0.4 で `overflow` の扱いを Preflight |
| 2 | 札の高さが 140→146・158→164 になる札がある | 実体は READY／hover の `scale(1.04)`（レイアウト高さではなく変形） | 判定基準側の問題。次回の sp-text-check では scale を除いた高さで判定する |

---

## 4. 公開手順（CEO／PM）

1. CEO：公開承認（§6-4 は DECISIONS 決定283 候補行）
2. CEO：`release/v1_0_3-rc` を push（pack は §5 の分割計画を参照）→ PR → CI GREEN → `gh pr merge --merge`
3. PM：Production Smoke S1〜S7＋bundle 一致。lane3 worktree（RC build `374e7c0` の dist を保持）で実行：
   `node scripts/v1_0_2-rc/production-smoke.cjs --sha <merge 7hex> --version 1.0.3 --rc-build-sha 374e7c0 --master-dir C:/Users/kimi1/SevenGodsGame-lane2b --acceptance scripts/v1_0_3-rc/acceptance.mjs --out docs/evidence/v1_0_3-production-smoke`
   （`--master-dir` は S7 用の旧版 dist＝v1.0.2 を持つ worktree。省略すると integ の v1.0.1 になる）→ RELEASE_STATUS A-0 昇格・決定283 LIVE
4. Rollback 先＝deployment `7228912965`（v1.0.2）

## 5. push サイズ（70 MB 事故の再発防止）

pack（HEAD ^origin/master）は **約 29.7 MB**（独立監査 DELTA 実測）。500KB 超の PNG は 0（400KB 級は残る）・`06-secret-audit.txt` 3.1 MB。25 MB を超えるため **2 段階の fast-forward push** とする：段階 1＝`1343024`（Lane 5 束＋418a387 記録・21.8 MB）→ 段階 2＝RC HEAD（7.5 MB）。いずれも force 不要・master 不変。
