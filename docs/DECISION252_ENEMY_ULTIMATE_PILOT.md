# 決定252 — Enemy Ultimate / Threat Differentiation Pilot（2026-09-30）

**状態：AUTOMATED GATE PASS → HUMAN QA READY（STOP）**。merge／push／deploy 0。Production = master = origin/master `7db95ae`（runtime `b9b126e`）不変。
Preflight：`docs/ENEMY_ULTIMATE_THREAT_DIFFERENTIATION_PREFLIGHT.md`（docs-only commit `ccb5237`・保持）。Pilot GO は CEO（2026-09-30）。実装方式・Gate 判定は AI 判断。
branch `feat/d252-enemy-ultimate`（`ccb5237` から。worktree `C:/Users/kimi1/SevenGodsGame-d252`）。evidence：`docs/evidence/decision252/pilot/`。

## 0. 結論（先に）

| 項目 | 結果 |
|---|---|
| implementation diff | runtime **4 ファイル**（`enemies.ts` +44/−17・`rules.ts` +13/−1・`stakes.ts` +6/−5・`round.ts` +4/−1）＋テスト 7 ファイル（期待値更新のみ）。新 kind 0・新 Effect 0・save v9 不変・cards／God／OTOMO／God Strike／score／seed／Oracle 3／stakes 2／7R／AP 不変・新規資産 0 |
| tests | tsc 0／oxlint 0／**vitest 1,267 PASS**（9 skipped・Production 1,266 ＋ 決定252 台帳 1）／build OK：`index-0DI4r-CG.js`（447.35 KB）・CSS `index-Bb2gHnj6.css` **md5 Production と同一** |
| simulation | **578,200 試合**＝Pilot runtime 289,100 ＋ Before（Production runtime `7db95ae` worktree）289,100。5 方策 × 通常 0〜Ⅶ（猛威／巨躯／静寂）× 100 seed ＋ easy／hard／Daily × 60 seed・7 神 × 7 敵 |
| Preflight parity | **Δ 0.00pt**：overall／敵別／49 セル × 全段 × 5 方策＝3,185 セルすべて完全一致（After vs Preflight F1、Before vs Preflight prod とも） |
| 7 Enemy runtime identity | 実 runtime で全 7 敵 × 通常／hard／Ⅵ × 7R を観測（§4）。Signature Threat は表示名・kind・数値・演出 mapping すべて期待どおり |
| Presentation regression | Playwright 24 走（6 組 × PC/SP × Before/After）：決定240（名札 class／SVG グリフ／構え／足元の環／charge 金・紅蓮）・カットイン・敵反転・立ち絵 box・決定249 反応 すべて維持。console error 0・横スクロール 0 |
| Human QA | READY：Before `:4271`／After `:4272`（§7） |

## 1. implementation diff（`git diff ccb5237` runtime）

| ファイル | 変更 |
|---|---|
| `src/core/data/enemies.ts` | 鬼将：`maxHp` 100→94・actions `5/9/charge「斧を振りかぶっている…」/special「業斧・断岩」26/15/11/7`・説明文「溜めの次に断岩。R4を受け切れ。」／怨霊：R4 `special「怨嗟の花」23`（数値不変）・説明文／龍神：R4 `special「大海嘯」20`（数値不変）・説明文／道化：`4/charge「⚠ 手品を仕込んでいる…」/special「乱舞・狂宴」24/9/charge「また何か仕込んでいる…」/19/9`（合計 65 不変）・説明文「R3に開幕の必殺。託宣を先に切れ。」。試練・機工師・魔獣：不変 |
| `src/core/data/rules.ts` | `stakes.specialMulCap: { enemy_04: 1.1, enemy_03: 1.0, enemy_06: 1.0 }`（`specialMulCapKarakuri` を統合）。`specialMul` 1.2 不変 |
| `src/core/data/stakes.ts` | `specialMultiplierFor` が cap を map から引く／Ⅵ の文言「敵の必殺・連撃+20%」→「敵の必殺+20%」（`addedRuleJa`・`describeStakeRules`）／`ENEMY_IDS` import 削除 |
| `src/core/engine/round.ts` | `nextEnemyAction`：必殺倍率を `special` と `multiAttack.special` だけに掛ける（通常連撃には掛けない） |

テスト（Expected Specification Update・挙動回帰ではない）：`stakes.test.ts`（cap 表）／`stakeRules.test.ts`（Ⅵ：魔獣 R1 倍率無し・R3 乱撃 ×1.2・怨霊 cap 1.0）／`enemyActions.test.ts`（旧「5 体は attack/charge のみ」→ 決定252 台帳・必殺 6 行動）／`cardStyle.test.ts`（台帳 21/10/12/2/4 → **22/8/8/6/5**）／`actionDistribution.test.ts`（p90 26→25・payload median 1122→1109・p90 1385→1361・p95 1432→1424。Measurement Baseline Update）／`useReactionLanguage.test.ts`（gameVersion golden `1.d97db7abd39e51e1` → `1.d794038a00b5b53c`）／`enemies.test.ts` は説明文 ≤30 字を満たし無変更。

## 2. Automated Gate

| 項目 | 結果 |
|---|---|
| `tsc -b` | 0 error |
| `oxlint src` | 0 |
| `vitest run` | 104 files・**1,267 passed**・9 skipped |
| `vite build` | OK。JS `index-0DI4r-CG.js`（Production `index-Cz3tzyfF.js` から data／engine 差分のみ）・CSS md5 `a88d74a6…` ＝ Production |
| 決定58／DAILY-01／STAKE-01 | `balanceSim.test.ts` 内ゲート PASS（全テストに含む） |

## 3. Simulation（`sim252-pilot.json`／`sim252-pilot-before.json`・harness `harness.d252.preflight.test.ts.txt` MODE=pilot）

- 総試合数 **578,200**（Pilot 289,100＋Before 289,100）。paired seed `d252-0..99`。方策 reader／readerPlus／naive／greedy／**ignoreUlt**（必殺無視）。
- Parity（`pilot/PARITY.md`・`pilot/PARITY_BEFORE.md`）：**全 3,185 セル Δ 0.00pt**（Preflight は Ⅵ〜Ⅶ の倍率順序だけ emulation だったが、丸めの差は 0 件）。

### 3-1. Normal／Easy／Hard／Daily（reader・Before→Pilot）
通常 99.8→99.8／easy 100.0→100.0／hard 95.9→96.7／Daily 91.4→92.4（すべて Preflight §6-1 と同値）。naive 84.6→84.2・greedy 74.7→72.7（通常）。

### 3-2. 神階Ⅰ〜Ⅶ（reader・Before→Pilot）
Ⅰ 99.7→99.7／Ⅱ 98.0→98.1／Ⅲ 89.4→90.2／Ⅳ 86.4→87.9／**Ⅴ 83.7→85.9／Ⅵ 78.9→83.9／Ⅶ猛威 64.5→71.1**／Ⅶ巨躯 55.0→60.4／Ⅶ静寂 78.2→82.7。未撃破 全段 ±1pt。reader > naive > greedy 全段（R−N 15.6〜59.6pt）。

### 3-3. 双牙の魔獣
Ⅵ reader 50.6→**74.1**（恵比寿 38→77・大耀 32→56・才華 15→39・福永 33→69）／Ⅶ猛威 31.0→**52.9**／Ⅶ巨躯 36.1→58.0／Ⅶ静寂 43.1→66.0。通常／Ⅰ〜Ⅴ／hard／Daily 同一。

### 3-4. 49-cell outliers（reader <50%・Before→Pilot）
Ⅴ 0→0／Ⅵ 4→**1**（才華×魔獣 39）／Ⅶ猛威 13→**7**／Ⅶ巨躯 21→15／Ⅶ静寂 4→2。Preflight と同一（悪化 0）。

### 3-5. reader vs ignore-counter（reader − ignoreUlt・通常／hard／Ⅵ／Ⅶ猛威）
鬼将 33.9／65.0／73.7／72.4・怨霊 35.0／66.7／57.1／50.3・龍神 20.3／54.8／49.3／43.7・道化 6.4／47.4／61.1／81.6・機工師 9.4／41.2／48.9／57.6・魔獣 7.0／15.2／26.9／28.6・試練 0（必殺なし）。Before では鬼将・怨霊・龍神・道化の 4 体で 0（必殺が存在しない）。

### 3-6. 託宣・God Strike
託宣使用ラウンド（通常 reader）：道化 R3 9%（Before 1%）／鬼将 R4 19%（16%）／怨霊 R4 27％・機工師 R5 70％・魔獣 R3〜5 不変。GS 率：鬼将 61→56・道化 45→44・他不変。

## 4. Enemy Identity Gate（`pilot/ENEMY_IDENTITY_GATE.md`・実 runtime・大耀 推奨デッキ・自 HP 1000 固定で全 7R）

| 敵 | 通常の予告（R1→R7） | hard／Ⅵ の要点 | 判定 |
|---|---|---|---|
| 試練の影 | ⚔50／⚔80／💥強打110／🔥特大150／💥強打130／⚔90／⚔60 | 不変 | PASS（表不変） |
| 業斧の鬼将 | ⚔50／⚔90／**⚡斧を振りかぶっている…（charging-super）**／**🔥 業斧・断岩 260**／🔥特大150／💥強打110／⚔70 | hard 断岩 300・Ⅵ 断岩 36（×1.15×1.2） | PASS |
| 藍花の怨霊 | ⚔30／⚔60／💥強打130／**🔥 怨嗟の花 230**／🔥特大180／⚔90／⚔40 | Ⅵ 26（cap 1.0＝×1.15 のみ・Production と同値） | PASS |
| 銀甲の機工師 | ⚔60／⚡溜め／🔥特大220／⚡⚠充填（charging-super）／🔥 主砲・神滅甲 240／⚔70／⚔90 | Ⅵ 30（cap 1.1） | PASS（不変） |
| 双牙の魔獣 | 連撃 50+40／連撃 50×2／🔥 双牙乱撃 40×3／連撃 80×2／80+70／70×2／70+60 | **Ⅵ R1 10（倍率無し・Before 12）／R3 乱撃 14（×1.2）** | PASS |
| 蒼海の龍神 | ⚔40／⚔70／💥強打120／**🔥 大海嘯 200**／🔥特大160／⚔90／⚔50 | Ⅵ 23（cap 1.0） | PASS |
| 乱舞の道化 | ⚔40／**⚡⚠ 手品を仕込んでいる…（charging-super）**／**🔥 乱舞・狂宴 240**／⚔90／⚡また何か仕込んでいる…（金）／🔥特大190／⚔90 | hard 狂宴 280・Ⅵ 33 | PASS |

`ENEMY_ACTED` の技名（カットイン文言）も同一。神階Ⅵ の表示文「敵の必殺+20%」。

## 5. Presentation regression（`pilot/presentation/PRESENTATION_GATE.md`・Playwright・24 走）

| 観点 | Before | After | 判定 |
|---|---|---|---|
| 名札 `.intent` class／SVG グリフ 1 | charge＝`intent-tier-charge`・special／huge＝`intent-tier-huge`・strong＝`intent-tier-strong`・normal＝無 | 同一規則で新 4 行動に適用 | PASS |
| 立ち絵の構え（決定240） | huge＝`enemy-avatar-intent-huge`・special＝`-special` | 断岩／怨嗟の花／大海嘯／狂宴＝`enemy-avatar-intent-special` | PASS |
| 足元の環（`::after`） | 機工師 R5・魔獣 R3：PC 9.36px／SP 15.09px | 新 4 必殺も **同値**（PC 9.36／SP 15.09） | PASS |
| charge の金／紅蓮 | 機工師 R2 金・R4 紅蓮 | 鬼将 R3 紅蓮（次が special）・道化 R2 紅蓮・R5 金（次が attack）＝既存規則の自動適用 | PASS |
| カットイン（`.enemy-cutin-text`） | 機工師「主砲・神滅甲」・魔獣「双牙乱撃」 | ＋「業斧・断岩」「怨嗟の花」「大海嘯」「乱舞・狂宴」 | PASS |
| 敵反転（決定247） | `scale: -1 1` | 同一 | PASS |
| 立ち絵 box | PC [237±1, 202±2, 292±2, 195±1]／SP [10±1, 388±3, 177±1, 169±1] | 同一（idle 揺れの範囲） | PASS |
| 予告 box 高さ | PC 25／SP 21（2 行は 43） | 同一（道化 SP R2 の 2 行 43 は機工師と同じ） | PASS |
| 決定249（R1 に 1 枚使用） | `rl-brace`（守り札）／`rl-rise rl-tone-power`（怨霊戦 seed） | 同一 | PASS |
| console error／横スクロール | 0／なし | 0／なし | PASS |

スクリーンショット 24 枚 `pilot/presentation/*.png`。

## 6. Known issues

1. **道化 hard は無防御なら R3 で致死**（HP 27 − R1 5 = 22 < 狂宴 28）。予兆（⚠＋紅蓮 pulse）→ 加護 140＋盾で解ける設計。Human QA Q2 で判定（自動 Gate では安全判定しない）。
2. 鬼将 HP 100→94 で God Strike 率 61→56（撃破 R 5.75→5.64）。
3. Ⅶ猛威 才華×魔獣 15%・Ⅵ 才華×魔獣 39%（才華は盾 0）。Preflight と同値。
4. `gameVersion` 変更（data fingerprint）。Ranking dormant。進行中セーブは次ラウンドから新表（決定246／251 と同じ）。
5. 道化 R6 190（アンコール）の到達率 ≈35%。

## 7. Human QA（READY）

- サーバー（detached・`vite preview --host 0.0.0.0`）：**Before** `http://192.168.11.6:4271`（`SevenGodsGame-d251/dist` ＝ Production `index-Cz3tzyfF.js`）／**After** `http://192.168.11.6:4272`（`SevenGodsGame-d252/dist` ＝ `index-0DI4r-CG.js`）。PC は `127.0.0.1`。
- iPhone：管理者 PowerShell で `scratchpad/d252/qa-fw-add-d252.ps1`（group "QA D252 (temp)"・TCP 4271/4272・LocalSubnet）。終了後 `qa-fw-remove-d252.ps1`。**未追加**。
- 3 戦（同 seed・Before/After）：
  1. `/?seed=d252-qa1&enemy=oni` → 大耀・ふつう（R3 溜め→R4 断岩 260）
  2. `/?seed=d252-qa2&enemy=doukeshi` → 大耀・**むずかしい**を UI で選択（R2 ⚠→R3 狂宴 280。無防御なら致死。加護＋盾で受ける）
  3. `/?seed=d252-qa3&enemy=juuma&stake=6` → 恵比寿・ふつう（神階Ⅵ。連撃の予告が Before より小さく、R3 乱撃だけ +20%）
- Q1 鬼将で「R3 で構える → R4 で大技」が自然に理解できたか／Q2 道化の R3 必殺が理不尽ではなく R2 の予兆で対策できる攻撃に感じたか／Q3 鬼将と道化で戦い方が違うと感じたか／Q4 魔獣 Ⅵ が理不尽ではなく速攻型の高難度敵として戦えたか／Q5 託宣を使うタイミングが敵で変わったか／Q6 Enemy Intent を読む意味が強くなったか／Q7 敵の大技が戦闘のクライマックスとして良く働いているか。**7/7 YES で PASS**（Q2 NO＝FAIL・Q3 NO＝差別化失敗・Q6 NO＝North Star 未達）。

## 8. 触っていないこと・STOP
master merge／push／Production deploy 0。Preflight commit `ccb5237` 保持（本 branch の親）。`scripts/decision252/` は scratch（未コミット。写しを `docs/evidence/decision252/` に保存）。Human QA 結果が出るまで Release Gate に進まない。
