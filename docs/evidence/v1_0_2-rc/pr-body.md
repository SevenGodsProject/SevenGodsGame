# v1.0.2 — 軍略 Pilot v1.1 × Enemy Break v1 ＋ 初心者導線 語彙整合 3 点（gameVersion 不変・save v9 不変）

> 2026-10-21 CEO 決定282「v1.0.2 Production 公開承認」に基づき PM が作成。RC `release/v1_0_2-rc`（統合 RC `fe1eb37` 起点・master `1ce9876` merge 済み）。Gate：`docs/V1_0_2_RC_GATE.md`・証跡 `docs/evidence/v1_0_2-rc/`。

## 変更点（runtime 3 束 ＋ version）

| # | 内容 | 主なファイル | 不変の証明 |
|---|---|---|---|
| 1 | **軍略 Pilot v1.1**（Lane 1・CEO QA 4/4 PASS）：鬼将の Pilot 変種 `enemy_09`「業斧の鬼将・軍略」を `?pilot=threat` でだけ選べる。R3 の予告「⚠ 傷が浅ければ次は断岩」→ R4 が HP 比で分岐（normal 0.5／hard 0.6）。既定の敵選択・Daily・攻略盤は CORE 7 体のまま | `enemies.ts`（PILOT_ENEMIES）・`tactic.ts`・`round.ts`・`intent.ts`・`rules.ts`（enemyTactic）・`pilotFlag.ts`・`EnemySelectScreen.tsx` | `coreRoster.test.ts`（CORE sha256 `5678e3e7…`＝v1.0.1 と同一）・`pilotFlag.test.ts`（Daily pool／攻略盤＝`ENEMY_IDS`） |
| 2 | **Enemy Break v1**（Lane 2・CEO QA 6/6 PASS）：表示 HP が 50%／25% 帯をまたいだ瞬間に敵が 1 回崩れる（表示専用・reduced-motion は名札の閃きのみ） | `enemyBreak.ts/.css`・`EnemyPanel.tsx`・`BattleScreen.tsx` | `src/core` 差分 0・`enemyBreak.test.ts` 17 |
| 3 | **語彙整合 3 点**（初心者導線監査 §10-1）：共鳴名札「神技発動」→「神の一撃」／遊び方 ①「神技」→「得意技」／遊び方 ② 図「⚔ 次の攻撃：5」→ SVG グリフ＋「50」 | `GodOtomoPanel.tsx`・`tutorialContent.ts`・`TutorialOverlay.tsx` | CSS 規則・engine・storage 0・`vocab-check` 20/20 |
| 4 | **version 1.0.2** | `package.json`・`package-lock.json`・`publicFace.test.ts` | Home `v1.0.2 (<sha>)` |

gameVersion **`1.d794038a00b5b53c` 不変**（`gameVersion.ts` は CORE 7 体の rank を v1.0.0 値に固定して指紋化・Pilot 敵は指紋外）。saveVersion 9 不変。Known：hard の演出ずれ（HP 55〜64・プレイヤー有利側のみ）据え置き・新規 0。

## Gate（G0〜G12・13 系統 17 項目すべて PASS・UNRUN 0）

| Gate | 実測 |
|---|---|
| tsc／oxlint | 0／11（master 基準・新規 0） |
| vitest full | 1,504 PASS・0 fail・17 skip |
| build | `index-xO5hO-tv.js` 470.72 kB・css 194.85 kB |
| invariants／Ranking Absence／Secret | 13/13／PASS／PASS |
| 受入 | v1.0.1 受入 44/44・Lane 1 受入 74/74・語彙確認 20/20（PC・SP375） |
| probe | 通常 7 体 8 run 決着・JS error 0・FX viewport 外 0（SP375 龍神 2＝既知）／probe-threat 6/6 |
| Save Migration | 44/44（master v1.0.1 build `index-B6IYVkjL.js` × RC build・channel:chromium） |
| Home version smoke | `v1.0.2 (32f7f77)`・外部通信 0 |

## 公開後（PM）
Production Smoke S1〜S7（`docs/V1_0_1_PRODUCTION_SMOKE.md` と同手順・v1.0.2 の値）→ `docs/RELEASE_STATUS.md` A-0b → A-0 昇格・決定282 を PRODUCTION LIVE に確定。Rollback 先＝deployment `7133236766`（v1.0.1）。

🤖 Generated with [Claude Code](https://claude.com/claude-code)
