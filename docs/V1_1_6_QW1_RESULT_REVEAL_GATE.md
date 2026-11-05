# v1.1.6 Quick Win #1：報酬選択後の勝利演出 再生の解消 — Gate 記録（2026-11-05）

AI-PM Decision「v1.1.6 Quick Wins GO」（READ-ONLY 監査の採用 3 件のうち第 1 優先）。
**runtime の変更は CSS 1 規則＋React 2 ファイル（prop 1 本）**。engine・戦闘数値・決定論・save v9・gameVersion・素材・音声に変更なし。外部費用 0。

## 0. 結論

| 項目 | 結果 |
|---|---|
| 問題 | 通常モードの勝利で「報酬カードを選ぶ」→ 報酬を確定すると、結果画面が unmount → 再 mount され（`BattleScreen.tsx` の `!rewardOpen` 条件）、決定226 の段階表示（status 0.4s → … → Result Hub 1.45s＋0.5s）とスコア巻き上げ（600＋800ms・JS）が**二度目に流れていた**。Primary（次の一歩）は報酬確定から約 2.1 s 押せる見た目にならない |
| CSS のみの修正 | tap skip の対象に Result Hub 以降の要素を加えた（決定187 で段階表示に加わったが skip 一覧から漏れていた）。**実ブラウザ計測で再生は解消しない**（§3・CSS は「報酬後の再 mount」を区別できず、スコア巻き上げは JS） |
| 最小の React 修正 | `GameOverOverlay` に表示専用 prop `skipStaging` を追加。`BattleScreen` は **`rewardDoneState`**（この 1 戦で報酬の判断を終えた）だけを渡す。再 mount は最初から「全表示」＝段階表示の class と最終スコアで始まる |
| 初回の勝利演出 | **不変**（報酬前の初回・Daily・Pilot 敵は `rewardDoneState` が false。§3 の first 列が before／after で同じ） |
| 効果 | 報酬確定 → Primary 表示が **約 2.1 s → 約 45 ms**（PC／SP375） |
| 検証 | §2 契約テスト・vitest 1,703 PASS（136 files・skip 17・新規 1 件を含む）・lint／tsc・build（JS +0.04 kB・CSS +0.11 kB）・実ブラウザ before／CSS のみ／after（§3）・S2 44/44 PASS・S5 228/228 PASS・phase7-p1 Result Hub 受け入れ AC 18/18 PASS（AC6 は変更前ビルドとの戦闘画面レイアウト比較＝--baseline 未指定で未計測。本変更は結果画面のみ） |
| 残リスク | §5 |

## 1. 変更ファイル

| ファイル | 変更 |
|---|---|
| `src/components/battle/battle.css` | `.game-over-card-won.game-over-card-skipped :is(…)` の一覧に `.result-hub／.result-hub-pending／.game-over-breakdown／.result-tertiary／.game-over-matchup／.game-over-best-gap` を追加（1 規則・tap skip の取りこぼしも解消） |
| `src/components/battle/GameOverOverlay.tsx` | prop `skipStaging?: boolean`（既定 false）。`stagedSkip` の初期値と `shownScore` の初期値に反映（3 行） |
| `src/components/battle/BattleScreen.tsx` | `<GameOverOverlay skipStaging={rewardDoneState} …>`（1 行） |
| `src/components/battle/victoryReveal.test.ts` | 契約テスト 1 件追加（§2） |
| `scripts/release-audit/result-reveal-probe.mjs` | 新規：実ブラウザで「初回の結果画面」「報酬後の結果画面」それぞれの mount → 表示完了までを ms で測る（読み取り専用） |
| `package.json`／`package-lock.json`／`src/publicFace.test.ts` | version 1.1.5 → 1.1.6 |

## 2. 契約テスト（`victoryReveal.test.ts`・追加 1 件）

- `GameOverOverlay` が `skipStaging`（既定 false）を `stagedSkip` と `shownScore` の初期値に使う
- `BattleScreen` は `skipStaging={rewardDoneState}` を渡す（Pilot 敵で最初から true になる `rewardDone` は渡さない＝初回演出の維持）
- CSS の skip 一覧に Result Hub 以降の要素と、従来の status／score が含まれる
- 既存：勝利の時刻表（350／730／1,580）と skip 判定は不変

## 3. 実ブラウザ計測（`result-reveal-probe.mjs`・大耀 × 業斧の鬼将・seed `p7spec-result-normal-win`・headless Chromium・50ms 標本）

| build | viewport | 初回：mount →「報酬カードを選ぶ」表示 | 初回：スコア確定 | 報酬後：再 mount → Result Hub 表示 | 報酬後：最初の標本 |
|---|---|---|---|---|---|
| before（v1.1.5） | PC | 2,166 ms | 1,397 ms | **2,147 ms** | Hub 不透明度 0・status 0・スコア巻き上げ中 |
| before（v1.1.5） | SP375 | 2,129 ms | 1,392 ms | **2,121 ms** | 同上 |
| CSS のみ | PC | 2,316 ms | 1,438 ms | **2,067 ms** | 同上（解消せず） |
| CSS のみ | SP375 | 2,225 ms | 1,467 ms | **2,039 ms** | 同上（解消せず） |
| after（CSS＋React） | PC | 2,309 ms | 1,367 ms | **42 ms** | Hub 1・status 1・最終スコア表示 |
| after（CSS＋React） | SP375 | 2,157 ms | 1,410 ms | **46 ms** | 同上 |

- 初回（報酬前）の段階表示は before／after で同じ長さ（≈2.1〜2.3 s・標本間隔とヘッドレスの描画で ±150 ms）＝初回の勝利演出は維持
- JS error 0・外部通信 0（全 6 行）。画面（jpeg）：`docs/evidence/v1_1_6-qw1-result-reveal/screens/`
- 報酬後の「最初の標本」は再 mount 直後 ≈40 ms の計算済みスタイル。before は Hub が透明（opacity 0）で `game-over-score-rolling` が付いている＝演出の再生。after は最初から全表示

## 4. 回帰

| Gate | 結果 | 証跡 |
|---|---|---|
| vitest | 1,703 PASS（136 files・skip 17・新規 1 件を含む） | `vitest-stdout.txt` |
| lint（oxlint）／tsc | PASS | — |
| build | JS 492.73 → 492.77 kB（+0.04）・CSS 213.02 → 213.13 kB（+0.11） | — |
| S2 回帰受入（v1.1.6 (edaf2f6)） | 44/44 PASS | `s2-acceptance.json`・`s2-stdout.txt` |
| S5 将軍家 公開受け入れ | 228/228 PASS | `s5-acceptance.json`・`s5-stdout.txt` |
| phase7-p1 Result Hub 受け入れ（決定187・pc1508／sp844・通常勝利／敗北連鎖／Daily 3 回） | AC 18/18 PASS（AC6 は変更前ビルドとの戦闘画面レイアウト比較＝--baseline 未指定で未計測。本変更は結果画面のみ） | `p7p1-acceptance.json`・`p7p1-stdout.txt` |
| 決定論（cf2・140 組） | 省略（engine・data 変更 0。結果画面の表示専用） | — |

## 5. 残リスク

- Daily の勝利・Pilot 敵の勝利は報酬の工程が無く結果画面は 1 回しか mount されないため、本変更の影響外（`rewardDoneState` は false のまま）。実ブラウザ計測は通常モードのみ。Daily は phase7-p1 の Daily 3 回で結果画面の内容を確認
- 報酬後の結果画面は card の `overlay-card-pop-in`（0.35 s）だけが残る（カードが出る動き。段階表示ではない）
- Known K40〜K47 は不変（本変更による Known の追加・解消なし）
- CEO Human QA（iPhone・本番）：通常勝利 → 報酬 → 結果画面が「待たずに」出ること、初回の勝利演出が従来どおりであること

## 6. CEO 操作

1. PR #25（branch `feat/v1_1_6-result-reveal-once`）の merge（CI GREEN・CLEAN 確認後・1 回）
2. 本番反映後：AI が本番 S2＋result-reveal-probe → CEO Human QA（iPhone）→ 第 2 優先（託宣 SP 表示 3 点）へ
