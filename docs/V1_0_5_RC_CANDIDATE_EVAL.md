# v1.0.5 RC 候補 評価（統合影響監査＋重いテストの直列実行）

> **状態（2026-10-24・PM・AI 判断（CLAUDE.md §6-2））**：branch `release/v1_0_5-rc-candidate`（worktree `SevenGodsGame-v105rc`・起点 `origin/master` `35a7f91`＝v1.0.4 Production）に 4 branch を merge した。Gate HEAD は `40ff3f4`。**version は 1.0.4 のまま**（RC として確定するときに上げる）。push／merge／deploy は 0。PC のメモリ空きは約 1.2GB のため、preview・Playwright・build は 1 本ずつ直列で実行した。

## 0. 結論

| 項目 | 判定 |
|---|---|
| 統合影響（ファイル重複・conflict） | **GO**：4 branch が触るファイルの重複は 0、merge の conflict も 0 |
| 自動 Gate | **PASS**：tsc 0・oxlint は v1.0.4 から新規 0・vitest **1,578**（1,544＋10＋13＋11 と完全一致）・build・Ranking Absence・Secret・`src/core` 差分 0・storage／乱数／時刻の追加 0 |
| ブラウザ受入 | **PASS**（Known 同型のみ）：受入 44/44・敗北画面 18/18・Stage B／G8 3 viewport・旧セーブ 44/44（v1.0.4 Production → RC 候補）・Retention 回帰 15/15・AC12 1/1・SP 本文 overflow 0 |
| v1.0.5 RC へ進めるか | **条件付き GO**：① CEO Human QA 3 件（Stage B・Break SE・揺れ）② Break SE／揺れの時刻 probe（各 branch の Gate 案 G4／G5。probe スクリプトは未実装）③ version を 1.0.5 に上げて RC Gate を取り直す |

## 1. 統合した branch（`git diff --name-only origin/master...<branch>`）

| branch | HEAD | 触るファイル | 内容 |
|---|---|---|---|
| `feat/v1_0_5-retry-prev-compare` | `0bff34c` | GameFlow.tsx・BattleScreen.tsx・GameOverOverlay.tsx・battle.css（+2）・retrySemantics.ts・sameBoardDiff.test.ts・defeat-g8.mjs・docs | Stage B 前回比 1 行（`docs/V1_0_5_STAGE_B_RETRY_PREV_COMPARE.md`） |
| `test/v1_0_5-ac12-home-links` | `c1ee236` | scripts/phase7-p1/acceptance.mjs・summarize.mjs・evidence | AC12 をラベル並びの完全一致へ（QA スクリプトのみ） |
| `feat/v1_0_5-break-se` | `24db5a5` | EnemyPanel.tsx（+5/−2）・enemyBreak.ts・feelTier.ts・sound.ts・breakSe.test.ts・docs | Enemy Break SE（既存音源 enemy_charge・gain 0.55）（`docs/V1_0_5_BREAK_SE_V1.md`） |
| `feat/v1_0_5-enemy-heavy-shake` | `81c295d` | combatTimeline.ts・enemyVfxTiming.ts・useCombatPresentation.ts・enemyHeavyShake.test.ts・docs | 敵の必殺 3px／敗北を決める最後の被弾 4px の揺れ（`docs/V1_0_5_ENEMY_HEAVY_SHAKE_V1.md`） |

- **ファイルの重複は 0**。Stage B と揺れはどちらも `battle.css` に関わるが、揺れは既存の keyframes を使うだけで `battle.css` を変えていない（差分は Stage B の 2 行だけ）。

### 1-1. 意味の上での相互作用（コードを読んで確認）

| 組み合わせ | 評価 |
|---|---|
| 揺れ × Stage B | 揺れは敗北を決める最後の被弾で 1,350〜1,630ms に起きる。結果ゲート（`planResultGate`＝visualHpEndMs+200）は不変（揺れの branch のテストで固定）。そのため前回比を含む結果画面が出る時刻は v1.0.4 と同じ。実測でも敗北画面 18/18・G8 は Primary 初期可視 |
| 揺れ × Break SE | 起きるタイミングが別：Break はプレイヤーの攻撃で敵 HP が帯を下回った瞬間、揺れは敵の手番の必殺と、プレイヤーが敗北する被弾。使う経路も別（音は `sound.ts`、揺れは `useCombatPresentation.ts`） |
| Break SE × 既存 SE | 新しい音源は 0（SE 22 本のまま）。溜め予告の音と同じ音源の低い版なので、溜め予告が出ている間の half 帯では鳴らさない（branch の文書 §2-4） |
| Stage B × Retention（NM1・今日の問い） | Stage B は通常戦の敗北・未撃破だけ、NM1 は勝利だけ、今日の問いは Daily だけ＝同時に出ない。Retention 回帰 15/15 |
| AC12 × 他 | QA スクリプトのみ・runtime 0 |

## 2. Gate 実測（直列）

証跡は `docs/evidence/v1_0_5-rc-candidate/`。

| G | 項目 | 結果 | 実測 |
|---|---|---|---|
| A1 | `tsc -b --noEmit` | PASS | exit 0 |
| A2 | oxlint | PASS | 警告 11・エラー 0。v1.0.4 と同じ内容（新規 0） |
| A3 | full vitest | PASS | 127 files・**1,578 PASS**・0 fail・17 skip |
| A4 | build | PASS | `index-D_sKHf-a.js` 475.99 kB（v1.0.4 比 +2.0 kB）・`index-ClB44gcF.css` 195.08 kB |
| A5 | 不変条件 | PASS | `git diff origin/master -- src/core` が空。テスト以外で追加された `setItem`／`localStorage`／`sessionStorage`／`Math.random`／`Date.now` は 0 |
| A6 | Ranking Absence | PASS | RESULT PASS |
| A7 | Secret Audit（基点 `35a7f91`） | PASS | credential 形式 0。非 prose の当たりは v1.0.4 と同じ |
| B1 | 受入（v1.0.3 版・`--version 1.0.4 --sha 40ff3f4`） | PASS | 44/44 |
| B2 | 敗北画面 `defeat-check.mjs` | PASS | 18/18（揺れを入れても結果画面・事実行・敗因は不変） |
| B3 | Stage B／G8（敗北 → 同じ盤面で再戦 → 敗北） | PASS | 2 回目に「同じ盤面 2 回目：前回 R4で敗北・敵HP 100% → 今回 R4で敗北・敵HP 100%」。PC は 1 行・余白 128px、SP375 は 2 行・90px、SP390 は 2 行・179px。横はみ出し 0・Primary 初期可視・JS error 0（単体 branch と同じ値） |
| B4 | SP 本文 `sp-text-check.mjs` | PASS（Known 同型） | 24/29。**本文・テキストの overflow は 128 枚すべてで 0**。FAIL 5 は「豪快な一撃」「姉御の号令」の外枠 2〜4px と `scale(1.04)` の見かけ高さで、v1.0.2 から続く Known と同型。スクリプトが seed を固定しないため、手札の組み合わせで件数が 24〜26 の間で変わる（v1.0.3 RC 25/29・v1.0.4 Production 26/29。PC の外枠 FAIL は v1.0.3 RC でも出ている）。v1.0.5 で変わった CSS は前回比の 1 規則だけで、カードには関係しない |
| B5 | 旧セーブ互換（v1.0.4 Production で作ったセーブ → RC 候補） | PASS | 44/44 |
| B6 | Retention 回帰（NM1・今日の問い・初陣 NR1・pc1508） | PASS | 15/15 |
| B7 | AC12（新判定・Home のリンク 3 本） | PASS | 1/1（AC13・AC14 も PASS。他の AC が 0/0・0/1 になっているのは、今回は Home のシナリオだけを流したため） |

## 3. 未実施・残り

1. **Break SE の時刻 probe**（branch の文書 §5 G4）と**揺れの時刻 probe**（同 G5・G6）。どちらも AudioBufferSourceNode／アニメーションを hook して ±16〜30ms を測る案で、**probe スクリプトはまだ無い**。単体テストで時刻表が変わらないことは固定済み。実画面の時刻は CEO の Human QA と同時に見る（WARN）。
2. **CEO Human QA**（各 3 問・同じ seed で v1.0.4 と比べる）：Stage B は Q5a／Q5b、Break SE は Q1〜Q3、揺れは Q1〜Q3。不合格時の調整案は各文書に 1 つずつ書いてある（文言の短縮／quarter だけ鳴らす／2px・3px）。
3. **RC として確定する作業**：version を 1.0.5 に上げる、DECISIONS に AI 判断の行を入れる（各文書の行案）、RC Gate（v1.0.4 と同じ M1〜M7）を取り直す。
