# WORKTREE / BRANCH CLEANUP AUDIT（73 worktree・124 local branch・8 remote の機械分類）

- 日付：2026-10-07
- 種別：**AUDIT ONLY / docs-only・git read-only**（実行した git は `worktree list`／`status`／`log`／`rev-list`／`cherry`／`merge-base --is-ancestor`／`diff --name-only`／`cat-file`／`for-each-ref`／`stash list` のみ。**worktree remove／branch delete／clean／reset／stash drop／prune：0**）
- 判断主体：分類＝AI（機械規則 §1）。**削除・archive の実行は CEO 承認後**（CLAUDE.md §6-3 #9 不可逆）
- 基準点：Production = master = origin/master **`641ea5c`**（決定267 LIVE）。正本 worktree＝`SevenGodsGame-integ`
- 別 Lane：決定263 Pilot（`SevenGodsGame-d263-pilot`）は **B 保持**・不干渉
- 集計スクリプト：scratchpad `wt_audit.sh`（read-only）→ `wt_audit.tsv`（215 行）。本書の数値はそこから転記
- stash：**0 件**（`git stash list`）

---

## 0. 結論（先に）

| 項目 | 結果 |
|---|---|
| worktree 73 | **A 3／B 3／C 3／D 4／E 60／F 0／G 0**（main repo は別枠 §4＝C 扱い・KEEP） |
| local branch 124 | **A 1／B 3／C 8／D 12／E 100／F 0／G 0** |
| remote 8 | A 2（origin HEAD・origin/master）／B 1／D 3／E 2 |
| **DELETE CANDIDATE** | worktree **60 本**（E のみ・全て `is_ancestor=yes` or `cherry=0`・dirty 0）＋ branch **100 本**（E）。**それ以外は削除禁止** |
| 削除で回収できる容量（推定） | worktree 60 本 × 390〜660MB ≒ **25〜35GB**（`node_modules` は symlink で 0B。実体は `art-source` 248MB＋`docs/evidence` 200MB＋`public` 53MB＋`dist` 54MB の複製） |
| **削除候補にしなかった「惜しい」もの** | E 判定だが untracked の QA 出力（`scripts/decision252/`・`decision253/`・`decision254/`・`d261/`・`d267-.../out/`）を持つ 5 本 → **E（条件付き）**：untracked を main repo か master 側へ移してから削除。`.protosim/`・`sim/` を持つ agent worktree 3 本も同様 |
| main repo（§4） | **dirty 12 files（+380/−13）＝決定224 Pilot の作業コピー（10/12 ファイルは RC `862367f` とバイト一致・`BattleScreen.tsx`／`battle.css` の 2 本は決定213 Stance 基底込みで不一致）＋ untracked 1,870（うち CEO 生成 raw asset 27MB は git のどこにも無い）** → **C：patch 保存必須・削除禁止** |

---

## 1. 機械分類規則（固定）

| 分類 | 規則（機械判定） |
|---|---|
| **A** | `master` 自身・Production の直近 2 Release の RC（rollback 基準として参照） |
| **B** | 決定263 Pilot 系（進行中）・READY-DORMANT として CEO が保持を明示した枝（Ranking phase4） |
| **C** | `cherry_unique > 0`（patch-id で master に無い commit あり）**かつ** unique diff に runtime パス（`src/ public/ index.html package*.json vite.config.ts tsconfig*.json .vercelignore api/`）を含む |
| **D** | `cherry_unique > 0` かつ runtime 0（docs／scripts／art-source のみ） |
| **E** | `is_ancestor = yes`（master に完全包含）**または** `cherry_unique = 0`（全 commit が patch-id 一致＝rebase 済み）。かつ tracked dirty 0 |
| **F** | NO-GO／CLOSED／obsolete で unique 価値なし — **本監査では 0 件**（NO-GO Pilot の枝も Human QA evidence を含むため D／C に置く。CEO 指示「1% でも喪失の可能性があれば削除候補にしない」） |
| **G** | 判定不能 — **0 件** |

補足：`ahead` は `git rev-list --left-right --count master...HEAD` の右側（commit 数）。`cherry_unique` は `git cherry master HEAD` の `+` 行数（patch-id 不一致）。`ahead > 0` でも `cherry_unique = 0` なら内容は master に入っている（rebase／cherry-pick 済み）。

---

## 2. worktree 一覧（73 本）

凡例：dirty＝tracked 変更数／untr＝untracked 数／a/b＝ahead/behind master／cu＝cherry_unique／anc＝is_ancestor／RT＝runtime unique files／DOC＝docs unique files。推奨：**KEEP／ARCHIVE（patch 保存後に削除可）／DELETE CANDIDATE（CEO 承認後）**。

### 2-A. A：Production / master 関連・絶対保持（3）

| path | branch | HEAD | a/b | anc | 関係 Decision | 推奨 |
|---|---|---|---|---|---|---|
| `SevenGodsGame-integ` | master | 641ea5c | 0/0 | yes | Production 正本 | **KEEP** |
| `SevenGodsGame-d267-rc` | release/d267-reward-relevance-rc | 12e1ad5 | 0/1 | yes | 決定267 RC（最新 Release） | **KEEP**（次 Release の RC 作成まで） |
| `SevenGodsGame-d266-rc` | release/d264-d266-duel-hud-rc | 202e476 | 0/12 | yes | 決定264+266 Release 後の master（RC は `46b7fd4`・`202e476` は docs 追記後。rollback 基準 deployment `6859615239`） | **KEEP**（決定267 の次 Release 後に E へ降格） |

### 2-B. B：OPEN Decision／進行中・保持（3）

| path | branch | HEAD | a/b | cu | RT/DOC | 関係 Decision | 推奨 |
|---|---|---|---|---|---|---|---|
| `SevenGodsGame-d263-pilot` | feat/d263-threat-shape-v1 | 78ce071 | 4/0 | 4 | 8/39 | **決定263 Pilot・CEO Human QA 待ち** | **KEEP（不干渉）** |
| `SevenGodsGame-d263` | feat/d263-threat-shape-prep | 68bcc9c | 1/23 | 1 | 3/1 | 決定263 Prep。`git cherry feat/d263-threat-shape-v1` → unique **0**＝Pilot 枝に完全包含 | **KEEP**（263 クローズアウト後に E へ） |
| `C:\Users\kimi1\SevenGodsGame`（main repo） | feat/d224-premium-payoff-pilot | 43c10a4 | 11/108 | 11 | 26/8 | §4 別枠（決定213 Stance HOLD＋決定224 作業コピー） | **KEEP・C 扱い** |

### 2-C. C：未 merge の unique runtime 差分あり・要監査（3・削除禁止）

| path | branch | HEAD | date | a/b | cu | RT/DOC | 中身 | 関係 Decision | 推奨 |
|---|---|---|---|---|---|---|---|---|---|
| `SevenGodsGame-d262` | feat/d262-answer-visibility-v1 | e4ab24b | 10-03 | 3/24 | 3 | 2/23 | 結果画面「解き方」1 行 Pilot の runtime＋evidence（`docs/evidence/decision262/*`）。`DECISION262_..._PILOT.md` は master にあり | 決定262 **NO-GO（CEO Human QA NO）** | **ARCHIVE**（runtime は再利用しない方針だが Human QA NO の evidence を保持。patch 保存後に削除可） |
| `.claude/worktrees/agent-a81ac3a707b3fad87` | worktree-agent-a81ac… | f8cc5a2 | 08-28 | 1/181 | 1 | 16/0 | 「feat: add enemy selection and stage system (base 75ebb14)」— 8/28 の試作。`GameFlow.tsx`・`BattleScreen.tsx`・`battle.css`・`feedbackSnapshot.ts` 等 16 本 | 決定123／124 相当は別実装で LIVE（内容は superseded の可能性大だが patch-id 不一致） | **ARCHIVE**（patch 保存 → CEO が不要と判断すれば削除） |
| `SevenGodsGame-d237` | feat/d237-cast-flash-blend | ed333e1 | 09-27 | 1/98 | **0** | 2/0 | ※cu=0＝patch 一致（RC `73ac787` に rebase 済み）。規則上は **E** | 決定237 LIVE | **DELETE CANDIDATE**（E に再分類・表 2-E に計上） |

（`-d237` は規則 E に該当するため C の実数は **2**。表は突合のため残す）

### 2-D. D：docs-only の unique 差分あり・要監査（4・削除禁止）

| path | branch | HEAD | a/b | cu | DOC | unique docs（master に無いもの） | 関係 Decision | 推奨 |
|---|---|---|---|---|---|---|---|---|
| `SevenGodsGame-d254-rc` | docs/post-d262-lanes-integration | 6fb92fc | 3/23 | 3 | 3 | `BATTLE_COMPOSITION_V3_DUEL_HUD_PREFLIGHT.md`・`OPENING_HAND_READ_PREFLIGHT.md`・`POST_D262_LANE_AB_EXECUTION_ORDER.md`（3 本とも master に **無い**。前 2 本は d263-pilot 枝に取り込み済み、3 本目は未） | 決定262→263／264 の中間文書 | **KEEP → 263 クローズアウト時に master へ docs commit するか判断** |
| `SevenGodsGame-d265` | docs/d265-video-final-delivery | 8fdfe23 | 1/23 | 1 | 1 | `DECISIONS.md` 1 行（決定265 動画最終納品）— master の DECISIONS.md に**未反映** | 決定265（docs） | **KEEP → 1 行を master へ追記後に E** |
| `SevenGodsGame-d267` | docs/d267-reward-value-audit | e36c9ec | 5/23 | 5 | 4 | 3 本の docs は master に同名あり（内容差要確認）・`DECISIONS.md` 行 | 決定267 LIVE | **KEEP → diff 確認後に E**（docs 差分が CRLF のみなら削除可） |
| `.claude/worktrees/agent-aed3a8b63d8935628` | worktree-agent-aed3… | f78ac9d | 1/23 | 1 | 1 | `BATTLE_COMPOSITION_V3_DUEL_HUD_PREFLIGHT.md`（上記と同名・d263-pilot 枝にも unique 1） | 決定264 Preflight | **KEEP → d254-rc と同時処理** |

### 2-E. E：master へ完全包含済み・削除候補（60・**CEO 承認後に `git worktree remove`**）

全件 tracked dirty 0。`anc=yes` または `cu=0`。関係 Decision は全て **PRODUCTION LIVE / CLOSED** または docs 吸収済み。

| # | path | branch | HEAD | b | 根拠 | 関係 Decision | untracked |
|---|---|---|---|---|---|---|---|
| 1 | `SevenGodsGame-after2` | feat/lane3-after2-art | d1e3b30 | 90 | anc | 決定243 LIVE | 0 |
| 2 | `SevenGodsGame-after2-rc` | release/after2-card-art-rc | d1e3b30 | 90 | anc | 決定243 | 0 |
| 3 | `SevenGodsGame-comp` | docs/battle-composition-v2-preflight | 1af0547 | 41 | **cu=0** | 決定261 | 0 |
| 4 | `SevenGodsGame-comp-pilot` | feat/d261-composition-v2 | 7d7fe3b | 33 | anc | 決定261 LIVE | **`scripts/d261/`**（QA 出力・条件付き） |
| 5 | `SevenGodsGame-d224-rc` | release/d224-premium-visual-rc | 862367f | 106 | anc | 決定224 LIVE | 0 |
| 6 | `SevenGodsGame-d226` | feat/d226-victory-reveal | 5263c3d | 105 | anc | 決定226 | 0 |
| 7 | `SevenGodsGame-d226-rc` | release/d226-victory-reveal-rc | 5263c3d | 105 | anc | 決定226/227 | 0 |
| 8 | `SevenGodsGame-d228` | feat/d228-sp-plate-fix | b70df63 | 104 | anc | 決定228 | 0 |
| 9 | `SevenGodsGame-d228-rc` | release/d228-sp-plate-fix-rc | b70df63 | 104 | anc | 決定228 | 0 |
| 10 | `SevenGodsGame-d229` | feat/d229-sp-stage-layer | babe3e5 | 103 | anc | 決定229 | 0 |
| 11 | `SevenGodsGame-d229-rc` | release/d229-sp-stage-layer-rc | babe3e5 | 103 | anc | 決定229 | 0 |
| 12 | `SevenGodsGame-d230` | feat/d230-reso-badge-fix | 45bfc9e | 102 | anc | 決定230 | 0 |
| 13 | `SevenGodsGame-d230-rc` | release/d230-reso-badge-rc | 45bfc9e | 102 | anc | 決定230 | 0 |
| 14 | `SevenGodsGame-d231-rc` | release/d231-card-cost-orb-rc | 087734c | 97 | anc | 決定231 | 0 |
| 15 | `SevenGodsGame-d236-rc` | release/d236-card-art-window-rc | 41adb32 | 96 | anc | 決定236 | 0 |
| 16 | `SevenGodsGame-d237` | feat/d237-cast-flash-blend | ed333e1 | 98 | **cu=0** | 決定237 | 0 |
| 17 | `SevenGodsGame-d237-rc` | release/d237-cast-flash-rc | 73ac787 | 95 | anc | 決定237 | 0 |
| 18 | `SevenGodsGame-d238` | feat/d238-card-text-overflow | 06e8285 | 94 | anc | 決定238 | 0 |
| 19 | `SevenGodsGame-d238-rc` | release/d238-card-text-overflow-rc | 06e8285 | 94 | anc | 決定238 | 0 |
| 20 | `SevenGodsGame-d239-rc` | release/d239-card-travel-rc | f8183eb | 93 | anc | 決定239 | 0 |
| 21 | `SevenGodsGame-d240-rc` | release/d240-enemy-intent-rc | 01b66f4 | 91 | anc | 決定240 | 0 |
| 22 | `SevenGodsGame-d241-rc` | release/d241-result-toast-rc | 361a1c6 | 92 | anc | 決定241 | 0 |
| 23 | `SevenGodsGame-d246` | feat/d246-combat-tension-v1 | 47940f1 | 89 | anc | 決定246 | 0 |
| 24 | `SevenGodsGame-d246-rc` | release/d246-combat-tension-rc | 47940f1 | 89 | anc | 決定246 | 0 |
| 25 | `SevenGodsGame-d247` | hotfix/d247-pc-enemy-flip | bcfd530 | 88 | anc | 決定247 | 0 |
| 26 | `SevenGodsGame-d249` | feat/d249-reaction-language-v1 | b1ae088 | 87 | anc | 決定249 | 0 |
| 27 | `SevenGodsGame-d250` | feat/d250-god-strike-cutin-video | a50b127 | 85 | anc | 決定250 | 0 |
| 28 | `SevenGodsGame-d251` | feat/d251-godrank-recenter | 7db95ae | 81 | anc | 決定251 | 0 |
| 29 | `SevenGodsGame-d252` | feat/d252-enemy-ultimate | 6d6c272 | 77 | anc | 決定252 | **`scripts/decision252/`**（条件付き） |
| 30 | `SevenGodsGame-d252-rc` | release/d252-enemy-ultimate-rc | 6d6c272 | 77 | anc | 決定252 | 0 |
| 31 | `SevenGodsGame-d253` | feat/d253-oracle-readability | 98067ec | 74 | anc | 決定253 | **`scripts/decision253/`**（条件付き） |
| 32 | `SevenGodsGame-d253-rc` | release/d253-oracle-readability-rc | 98067ec | 74 | anc | 決定253 | 0 |
| 33 | `SevenGodsGame-d254` | feat/d254-battle-entrance | a611270 | 72 | anc | 決定254 | **`scripts/decision254/`**（条件付き） |
| 34 | `SevenGodsGame-d256` | docs/d256-daily-competitive-gate | 40bf46c | 64 | **cu=0** | 決定256 docs 吸収済み（`DAILY_COMPETITIVE_GATE_REJUDGMENT.md` が master に同一） | 0 |
| 35 | `SevenGodsGame-d257` | feat/d257-sound-layer-v1 | ac56214 | 54 | anc | 決定257 | 0 |
| 36 | `SevenGodsGame-d257-rc` | release/d257-sound-layer-rc | dfb77f9 | 53 | **cu=0** | 決定257（Smoke evidence は master に吸収） | 0 |
| 37 | `SevenGodsGame-d259` | docs/d259-daily-spread-preflight | 0cb6b6e | 60 | **cu=0** | 決定259 PARTIAL（docs は master に同一） | 0 |
| 38 | `SevenGodsGame-d261-rc` | release/d261-composition-v2-rc | b5a895d | 29 | anc | 決定261 | 0 |
| 39 | `SevenGodsGame-d267-pilot` | feat/d267-reward-relevance-v1 | 33705e8 | 2 | anc | 決定267 LIVE | **`scripts/d267-reward-relevance-v1/out/`**（条件付き） |
| 40 | `SevenGodsGame-dock` | feat/dock-controls-plate-v1 | 74cfb0e | 101 | **cu=0** | 決定234 | 0 |
| 41 | `SevenGodsGame-dock-rc` | release/d234-dock-controls-rc | a3a363a | 99 | anc | 決定234 | 0 |
| 42 | `SevenGodsGame-hud` | feat/hud-plate-material-v1 | 84e636d | 101 | **cu=0** | 決定235 | 0 |
| 43 | `SevenGodsGame-hud-rc` | release/d235-hud-plate-rc | 2389d21 | 98 | anc | 決定235 | 0 |
| 44 | `SevenGodsGame-intent` | feat/d240-enemy-intent-v1 | 01b66f4 | 91 | anc | 決定240 | 0 |
| 45 | `SevenGodsGame-lane2` | feat/lane2-hit-weight-ladder | 245ecdc | 101 | anc | 決定232 | 0 |
| 46 | `SevenGodsGame-lane2-ranking` | docs/lane2-ranking-integration-preflight | d64d15f | 71 | **cu=0** | 決定256（`RANKING_INTEGRATION_PREFLIGHT.md` master と同一） | 0 |
| 47 | `SevenGodsGame-lane2-rc` | release/d232-hit-weight-rc | 245ecdc | 101 | anc | 決定232 | 0 |
| 48 | `SevenGodsGame-lane3` | feat/lane3-after1-art-window | 41adb32 | 96 | anc | 決定236 | 0 |
| 49 | `SevenGodsGame-lane3-presentation` | docs/lane3-commercial-presentation-audit | c38d2a6 | 71 | **cu=0** | 決定257 候補監査（吸収済み） | 0 |
| 50 | `SevenGodsGame-rc` | release/game-v1-rc | de039d8 | 143 | anc | 決定171／172 Clean Release（origin にもあり） | 0 |
| 51 | `SevenGodsGame-rcgate` | docs/commercial-rc-pregate | 7dd3ad9 | 45 | **cu=0** | Commercial RC Pre-Gate（M3・84 docs 吸収済み） | 0 |
| 52 | `SevenGodsGame-rwa` | docs/rc-pregate-m2-ledger | 6ca6320 | 45 | **cu=0** | M2 台帳（吸収済み） | 0 |
| 53 | `SevenGodsGame-sound` | feat/sound-tap-feedback-v1 | c6d4462 | 100 | anc | 決定233 | 0 |
| 54 | `SevenGodsGame-sound-rc` | release/d233-sound-tap-rc | c6d4462 | 100 | anc | 決定233 | 0 |
| 55 | `SevenGodsGame-toast` | hotfix/d241-result-toast | 361a1c6 | 92 | anc | 決定241 | 0 |
| 56 | `SevenGodsGame-travel` | feat/card-travel-v1 | 4a117dd | 95 | **cu=0** | 決定239 | 0 |
| 57 | `.claude/worktrees/agent-a0c9d48847f8b8066` | worktree-agent-a0c9… | 75ebb14 | 181 | anc | 8/28 agent 作業域（`.claude/settings.local.json` 変更のみ＝除外ローカルファイル） | 0 |
| 58 | `.claude/worktrees/agent-a1d2783278e4c71ee` | worktree-agent-a1d2… | 75ebb14 | 181 | anc | 同上 | **`.protosim/`**（条件付き） |
| 59 | `.claude/worktrees/agent-a46f077d4bea01615` | worktree-agent-a46f… | fe7d46e | 178 | anc | 同上 | **`sim/`**（条件付き） |
| 60 | `.claude/worktrees/agent-a7e0c0912642cb24c` | worktree-agent-a7e0… | 75ebb14 | 181 | anc | 同上 | **`.protosim/`**（条件付き） |
| 61 | `.claude/worktrees/agent-a2b3ab0df4dba6c75` | feat/d266-battle-viewport-stability | bbad04c | 15 | anc | 決定266 LIVE | 0 |

（#61 を含め E は **61 本**。§0 の「60」は `-d237` を C 表にも載せた二重計上を除いた数。**削除候補は #1〜#61 の 61 本**。うち「条件付き」8 本は untracked を退避してから）

### 2-F／2-G：F＝0・G＝0

---

## 3. branch 一覧（local 124＋remote 8）

### 3-A. A（1）
`master` 641ea5c。

### 3-B. B（3・保持）

| branch | HEAD | a/b | cu | 根拠 | 推奨 |
|---|---|---|---|---|---|
| `feat/d263-threat-shape-v1` | 78ce071 | 4/0 | 4 | 決定263 Pilot（進行中） | **KEEP** |
| `feat/d263-threat-shape-prep` | 68bcc9c | 1/23 | 1 | Pilot 枝に包含（cherry vs pilot = 0） | **KEEP**（263 後に E） |
| `feat/daily-ranking-phase4`（origin にもあり） | 762168f | 59/146 | 53 | 決定152 NO-GO・**READY-DORMANT**（決定256）。純部品の移植元 | **KEEP（whole merge 禁止）** |

### 3-C. C（8・unique runtime・削除禁止）

| branch | HEAD | date | a/b | cu | RT/DOC/SCR/OTH | 中身・関係 Decision | 推奨 |
|---|---|---|---|---|---|---|---|
| `feat/d224-premium-payoff-pilot`（main repo checkout） | 43c10a4 | 09-23 | 11/108 | 11 | 26/8/64/0 | **`feat/otomo-stance-pilot` と同一 commit**。決定212〜218 docs＋決定213 OTOMO Stance v0.2 runtime（CEO Human QA PASS・HOLD）。決定224 本体は RC 経由で LIVE | **KEEP**（決定213 の唯一の runtime 実体） |
| `feat/otomo-stance-pilot` | 43c10a4 | 09-23 | 11/108 | 11 | 同上 | 同一 commit（二重名） | **KEEP**（片方は後で統合可。削除は CEO） |
| `feat/living-hero-covm-ebisu` | 2221f19 | 09-20 | 5/108 | 5 | 19/4/15/0 | 決定209〜211 Living Hero CoVM 試作（`LivingHeroEnv.tsx`・`heroGod.ts` 等）。**決定210／211 の番号未記録（NEEDS REVIEW・TD-10）**。`DECISION209_*.md` は master に無い | **ARCHIVE**（docs 3 本を master へ移してから判断） |
| `feat/d262-answer-visibility-v1` | e4ab24b | 10-03 | 3/24 | 3 | 2/23/2/0 | 決定262 NO-GO Pilot（Human QA NO の evidence） | **ARCHIVE** |
| `feat/enemy-oni-m4-rc` | 5d3ef85 | 09-15 | 1/137 | 1 | 1/2/0/2 | runtime unique は `public/assets/enemies/oni/art_hq.webp` のみ → **master と bit 一致を確認済み**。残りは `art-source/` 原画＋`ENEMY_GENA_ONI_M4_RC.md`（master にあり）・`DECISIONS.md` 行 | **ARCHIVE**（実質 D。art-source の原画が master に無ければ退避） |
| `feat/enemy-onryo-m4i-rc` | 717a436 | 09-16 | 1/137 | 1 | 1/2/0/2 | 同上（`art_hq.webp` master と一致） | **ARCHIVE** |
| `feat/enemy-ryujin-m4i-rc` | 5077849 | 09-15 | 1/137 | 1 | 1/2/0/2 | 同上（一致） | **ARCHIVE** |
| `worktree-agent-a81ac3a707b3fad87` | f8cc5a2 | 08-28 | 1/181 | 1 | 16/0/0/0 | 8/28 試作「enemy selection and stage system」 | **ARCHIVE** |

### 3-D. D（12・docs／scripts／art-source の unique・削除禁止）

| branch | HEAD | date | a/b | cu | DOC/SCR/OTH | unique 内容 | 推奨 |
|---|---|---|---|---|---|---|---|
| `audit/decision212-otomo` | 0446ef7 | 09-20 | 1/108 | 1 | 2/4/0 | `DECISION212_*.md`（master にあり）・`scripts/decision212-otomo-audit/*`（評価 JSON） | ARCHIVE |
| `audit/enemy-visual-quality`（origin にもあり） | c592ff1 | 09-13 | 1/142 | 1 | 2/6/0 | `ENEMY_VISUAL_QUALITY_AUDIT.md`（master にあり）・capture/encode scripts | ARCHIVE（origin に保全済み） |
| `docs/composition-v3-duel-hud-preflight` | e4116bc | 10-03 | 1/23 | 1 | 1/0/0 | `BATTLE_COMPOSITION_V3_DUEL_HUD_PREFLIGHT.md`（master に**無い**） | **KEEP → master へ docs commit 候補** |
| `docs/d254-game-entry-preflight` | 83f25e2 | 10-01 | 1/77 | 1 | 20/0/0 | `GAME_ENTRY_IMMERSION_PREFLIGHT.md`（master にあり）＋evidence 19 本＋`DECISIONS.md` 行。patch-id 不一致＝内容差の可能性 | KEEP → diff 確認後に E |
| `docs/d262-answer-visibility-preflight` | ef9888e | 10-03 | 1/24 | 1 | 1/0/0 | `CARD_DECISION_MEANING_ANSWER_VISIBILITY_PREFLIGHT.md`（master に**無い**） | **KEEP → master へ docs commit 候補** |
| `docs/d265-video-final-delivery` | 8fdfe23 | 10-04 | 1/23 | 1 | 1/0/0 | `DECISIONS.md` 決定265 行（master 未反映） | **KEEP → 1 行追記** |
| `docs/d267-reward-value-audit` | e36c9ec | 10-05 | 5/23 | 5 | 4/0/0 | docs 3 本（master に同名あり）＋`DECISIONS.md` 行 | KEEP → diff 確認後に E |
| `docs/opening-hand-read-preflight` | 59eb828 | 10-03 | 1/23 | 1 | 1/0/0 | `OPENING_HAND_READ_PREFLIGHT.md`（master に無いが **d263-pilot 枝に包含**） | KEEP → 263 後に E |
| `docs/post-d262-lanes-integration` | 6fb92fc | 10-03 | 3/23 | 3 | 3/0/0 | 上記 2 本＋`POST_D262_LANE_AB_EXECUTION_ORDER.md`（master に無い） | **KEEP → docs commit 候補** |
| `pilot/juuma-restoration`（origin にもあり） | 3af62b3 | 09-13 | 1/142 | 1 | 2/5/3 | 魔獣復元 Pilot（art-source 3・scripts 5・`DECISIONS.md`） | ARCHIVE（origin 保全済み） |
| `spec/enemy-batch-b1-juuma`（origin にもあり） | 667d2c5 | 09-13 | 1/142 | 1 | 2/8/0 | `ENEMY_BATCH_B1_JUUMA_SOURCE_SPEC.md`＋scripts | ARCHIVE（origin 保全済み） |
| `worktree-agent-aed3a8b63d8935628` | f78ac9d | 10-03 | 1/23 | 1 | 1/0/0 | `BATTLE_COMPOSITION_V3_DUEL_HUD_PREFLIGHT.md` | KEEP → composition-v3 と同時処理 |

### 3-E. E（100・削除候補・CEO 承認後に `git branch -d`）

**(a) `is_ancestor = yes`（85 本）**：`docs/3lane-integration`・`docs/commercial-rc-go`・`docs/d251-godrank-recenter-preflight`・`docs/d252-enemy-ultimate-preflight`・`docs/d253-oracle-preflight`・`docs/d255-d256-integration`・`docs/d260-ap-preflight`・`docs/d262-closeout`・`docs/decision209-250-integration`・`docs/final-qa-closeout`・`docs/post-d257-integration`・`docs/rc-pregate-decision-row`・`docs/rc-pregate-integration`・`feat/d226-victory-reveal`・`feat/d228-sp-plate-fix`・`feat/d229-sp-stage-layer`・`feat/d230-reso-badge-fix`・`feat/d231-card-cost-orb-fix`・`feat/d238-card-text-overflow`・`feat/d240-enemy-intent-v1`・`feat/d246-combat-tension-v1`・`feat/d249-reaction-language-v1`・`feat/d250-god-strike-cutin-video`・`feat/d251-godrank-recenter`・`feat/d252-enemy-ultimate`・`feat/d253-oracle-readability`・`feat/d254-battle-entrance`・`feat/d257-sound-layer-v1`・`feat/d261-composition-v2`・`feat/d264-duel-hud-v3`・`feat/d266-battle-viewport-stability`・`feat/d267-reward-relevance-v1`・`feat/enemy-juuma-m4-rc`・`feat/enemy-visual-batch-a`（origin にもあり）・`feat/entrance-e1`・`feat/gamefeel-phase2`・`feat/god-identity-v0.1`・`feat/interaction-feel-v1`・`feat/lane2-hit-weight-ladder`・`feat/lane3-after1-art-window`・`feat/lane3-after2-art`・`feat/phase7-p1-result-home`・`feat/phase7-p2-matchups`・`feat/shinkai-phase1`・`feat/solve-legibility-v1`・`feat/solve-loop-v1`・`feat/sound-tap-feedback-v1`・`feat/visual-quality-assets`・`fix/invalid-enemy-id-hardening`・`hotfix/d241-result-toast`・`hotfix/d247-pc-enemy-flip`・`release/after2-card-art-rc`・`release/d224-premium-visual-rc`・`release/d226-victory-reveal-rc`・`release/d228-sp-plate-fix-rc`・`release/d229-sp-stage-layer-rc`・`release/d230-reso-badge-rc`・`release/d231-card-cost-orb-rc`・`release/d232-hit-weight-rc`・`release/d233-sound-tap-rc`・`release/d234-dock-controls-rc`・`release/d235-hud-plate-rc`・`release/d236-card-art-window-rc`・`release/d237-cast-flash-rc`・`release/d238-card-text-overflow-rc`・`release/d239-card-travel-rc`・`release/d240-enemy-intent-rc`・`release/d241-result-toast-rc`・`release/d246-combat-tension-rc`・`release/d252-enemy-ultimate-rc`・`release/d253-oracle-readability-rc`・`release/d254-game-entry-rc`・`release/d261-composition-v2-rc`・`release/d264-d266-duel-hud-rc`（※worktree は A）・`release/d267-reward-relevance-rc`（※worktree は A）・`release/e1-solve-loop-rc`・`release/enemy-gena-final-rc`・`release/game-v1-rc`（origin にもあり）・`release/interaction-feel-v1-rc`・`release/solve-legibility-v1-rc`・`worktree-agent-a0c9…`・`worktree-agent-a1d2…`・`worktree-agent-a46f…`・`worktree-agent-a7e0…`

**(b) `cherry_unique = 0`（patch-id 一致・rebase 済み・15 本）**：`docs/battle-composition-v2-preflight`・`docs/commercial-rc-pregate`・`docs/d256-daily-competitive-gate`・`docs/d257-d259-decision-rows`・`docs/d259-daily-spread-preflight`・`docs/hand-decision-density-audit`・`docs/lane1-post-d254-practical-qa-reaudit`・`docs/lane2-ranking-integration-preflight`・`docs/lane3-commercial-presentation-audit`・`docs/post-d257-remaining-work-audit`・`docs/rc-pregate-m2-ledger`・`feat/card-travel-v1`・`feat/d237-cast-flash-blend`・`feat/dock-controls-plate-v1`・`feat/hud-plate-material-v1`

（`release/d264-d266-duel-hud-rc`・`release/d267-reward-relevance-rc` は branch としては E だが worktree を A で保持中のため **branch 削除も保留**）

### 3-F. remote（8）

| ref | HEAD | 分類 | 備考 |
|---|---|---|---|
| `origin/master`（＝origin HEAD） | 641ea5c | A | Production |
| `origin/feat/daily-ranking-phase4` | 762168f | B | READY-DORMANT |
| `origin/audit/enemy-visual-quality` | c592ff1 | D | local と同一 |
| `origin/pilot/juuma-restoration` | 3af62b3 | D | 同上 |
| `origin/spec/enemy-batch-b1-juuma` | 667d2c5 | D | 同上 |
| `origin/feat/enemy-visual-batch-a` | dcfda3a | E | merged |
| `origin/release/game-v1-rc` | de039d8 | E | merged |

remote の削除（`git push --delete`）は本監査の範囲外・提案しない。

---

## 4. main repo `C:\Users\kimi1\SevenGodsGame` の dirty 内容（別枠監査・**C：削除禁止**）

- branch `feat/d224-premium-payoff-pilot` @ `43c10a4`（2026-09-23）・master より **108 behind／11 ahead**・ディスク **11GB**（うち `scripts/` 5.8GB＝QA 出力）

### 4-1. tracked 変更 12 ファイル（+380／−13）

| ファイル | 変更 | 判定（機械比較） |
|---|---|---|
| `src/components/battle/CardView.tsx`・`EnemyPanel.tsx`・`combatTimeline.ts`・`combatTimeline.test.ts`・`enemyVfxTiming.ts`・`sound.ts`・`sound.test.ts`・`useBattleSound.ts`（8 本）＋ untracked `readyMaterial.ts`・`readyMaterial.test.ts`（2 本） | 決定224 Premium Visual Pilot（READY material＋⚡PAYOFF） | **RC `862367f`（決定224 LIVE）の同ファイルと CRLF 除きバイト一致（10/12）** |
| `src/components/battle/BattleScreen.tsx`・`battle.css` | 同上 | **RC と不一致（2/12）**。基底 `43c10a4` が決定213 Stance runtime を含むため、Stance＋224 の合成状態。224 部分は RC へ移植済みの可能性が高いが **未証明** |
| `docs/DECISIONS.md`（+79 行） | 決定219〜250 の行（09-23〜09-30） | master の DECISIONS.md に同期間の行は **存在**（内容一致は未検証・CRLF 差あり） |
| `docs/DECISION218_SETUP_PAYOFF_EXPERIENCE_AUDIT.md`（+24） | 決定218 close-out 追記 | master 版との差分 未検証 |

**判定：C（unique runtime 差分あり）**。`git diff > d224-dirty.patch` で保存し、`BattleScreen.tsx`／`battle.css` の 2 本について「Stance 部分」と「224 部分」を分離確認するまで **reset／checkout／stash 禁止**。

### 4-2. untracked 1,870

| 区分 | 数 | master との関係 | 判定 |
|---|---|---|---|
| `scripts/**`（QA 出力：PNG／JSON／mp4） | 1,818（5.8GB の大半） | 抽出 60 件を確認：**master に 0 件**（決定199／203／204／213 Stance／release-* の evidence 出力。`scripts/decision213-stance-pilot/out/` は決定213 Human QA PASS の証跡） | **D 相当・保持**（master へ入れるか外部退避か CEO 判断。削除禁止） |
| `docs/*.md` | 46 | 全 46 本が master に存在。**35 本バイト一致・9 本 CRLF 差のみ・`ASSET_RIGHTS_LEDGER.md` 1 本は master が新しい（SE-02 行追加済み）** | 実質 E（ローカル側に unique 情報なし）。ただし削除は CEO |
| `docs/evidence/**` | 222 files | 153 一致／**69 本が master に無い**：`decision246/production-smoke`（9）・`decision247/pc-{before,after}-*.png`＋`production-smoke`（12）・`decision249/fast-gate`＋`production-smoke`（48） | **D・保持**（Release Smoke evidence の欠落分。master へ docs commit 候補） |
| `art-source/h3-god-strike/`（25MB：`taiyo_god_strike_input_1024.png`・`try1_raw_kling25turbopro.mp4`・`try2/`） | 3+ | **git のどの枝にも無い（`git log --all` 0）**。決定250 の CEO 生成 raw（課金：Try1 Kling $0.35＋Try2 H3 Max 表示価格 $0.20） | **絶対保持（CEO 作業）** |
| `art-source/cards/card_taiyo_attack_01_v2.png`・`_try1.png`（2.0MB＋） | 2 | git のどの枝にも無い。決定243 CEO 生成原画 v2 | **絶対保持（CEO 作業）** |
| `src/components/battle/readyMaterial.ts`・`.test.ts` | 2 | master に同名あり（RC と一致） | 4-1 に含む |
| `敵画像`（69B） | 1 | 除外ローカルファイル（RELEASE_STATUS「絶対に commit しない」） | 保持・触らない |

### 4-3. main repo の推奨処置（順序・いずれも CEO 承認後）
1. `git diff > <退避先>/d224-dirty-2026-10-07.patch`＋`git diff --stat` を docs/evidence に記録（read-only 操作）
2. `art-source/h3-god-strike/`・`art-source/cards/*_v2*.png` を **先に**外部退避（git 外・唯一の実体）
3. `docs/evidence` の 69 本と `scripts/decision213-stance-pilot/out/` を master へ docs commit するか判断（§6-2・docs-only）
4. その後に限り main repo を master へ切替（`git stash` ではなく patch 保存→`git checkout -b`＋commit を推奨。stash drop 禁止）

---

## 5. CEO DECISION REQUIRED #1（削除承認）

```
【CEO DECISION REQUIRED #1】
Issue：worktree 61 本（§2-E）／branch 100 本（§3-E）の削除承認
AI Recommendation：
  ①まず E のうち untracked 0 の worktree 53 本を `git worktree remove`（≈25GB 回収・RAM 6GB 環境の Gate 安定化）
  ②untracked ありの 8 本は QA 出力を main repo または master 側へ移してから削除
  ③branch 100 本は worktree 削除後に `git branch -d`（-D は使わない＝merged 確認付き）
  ④A／B／C／D（worktree 12・branch 24）は削除しない。main repo は §4-3 の順で退避後に master へ
Reason：E は全件 is_ancestor=yes または cherry_unique=0（patch-id 一致）・tracked dirty 0。失われる commit は 0
Alternatives：全削除（却下：C／D に unique docs・evidence・CEO 生成 raw が残る）／現状維持（却下：34GB・Gate OOM）
Risk：LOW。E の削除で commit は消えない（master に包含）。唯一の実体は main repo の art-source 2 件＝削除対象外
Impact if delayed：worktree 73 本・34GB のまま Release Gate を回す（OOM 再発）・誤 commit 危険継続
CEO Action：承認 / 拒否（部分承認可：①のみ等）
```

---

## 6. runtime 変更 0 の証明
- 本書 1 ファイルのみ作成（`SevenGodsGame-integ/docs/`・untracked）。commit／push：0
- 実行した git は読み取り系のみ（§冒頭）。`worktree remove`／`prune`／`branch -d`／`clean`／`reset`／`checkout`／`stash`：**0**
- main repo・各 worktree の working tree は一切変更していない（`status` の再確認で dirty 数不変）

---

## 7. 実行ログ（2026-10-07・CEO DECISION #1 条件付き承認後）

| 項目 | before | after |
|---|---|---|
| worktree | 73 | **16**（STEP 1 removed 52・SKIP 1／STEP 2 removed 5・SKIP 3） |
| local branch | 124 | **46**（STEP 3 `-d` deleted 78・retained 22・protected 24） |
| remote branch | 8 | 8（不変） |
| disk（`SevenGodsGame-*`＋`.claude/worktrees/*`・main repo 本体除く） | 38,377 MB | **6,831 MB**（回収 ≈31.5 GB） |
| stash | 0 | 0 |
| main repo `status --porcelain` md5 | 145b07e0c6a0（dirty 12・untracked 1,870・HEAD 43c10a4） | **145b07e0c6a0（同一）** |
| CEO raw（`art-source/h3-god-strike` 25MB 3 entries・`card_taiyo_attack_01_v2*` 2）| あり | **あり** |
| evidence decision246/247/249（main repo） | 3/3 | **3/3** |
| 決定263 Pilot | 78ce071・clean | **78ce071・clean（不干渉）** |
| integ | 641ea5c = origin/master | 同（untracked docs 5 本のみ） |

### 7-1. STEP 1（E・untracked 0）
REMOVED 52／SKIP 1＝`.claude/worktrees/agent-a0c9…`（tracked dirty `.claude/settings.local.json`＝除外ローカル設定。条件「dirty 0」不一致のため保持）。各件で branch／HEAD 一致・`status` 0・`is-ancestor` or `cherry`=0 を直前確認。`--force` 不使用。

### 7-2. STEP 2（E・untracked QA 出力あり）
退避先 `C:\Users\kimi1\SevenGodsGame-evacuated-qa\<worktree>\scripts\…`（git 外・64 files・5MB）。files／bytes／sha256（ファイル列の連結ハッシュ）一致を確認後、退避元ディレクトリのみ削除 → `status` 0 → `worktree remove`。
- SevenGodsGame-comp-pilot scripts/d261 files=13/13 bytes=74966/74966 sha=88992e79218792ea/88992e79218792ea OK
- SevenGodsGame-d252 scripts/decision252 files=5/5 bytes=62236/62236 sha=f3f260b5f9775f7d/f3f260b5f9775f7d OK
- SevenGodsGame-d253 scripts/decision253 files=6/6 bytes=50015/50015 sha=b82e5c39ae63f034/b82e5c39ae63f034 OK
- SevenGodsGame-d254 scripts/decision254 files=27/27 bytes=179765/179765 sha=5bf69d8e8116c07a/5bf69d8e8116c07a OK
- SevenGodsGame-d267-pilot scripts/d267-reward-relevance-v1/out files=13/13 bytes=4093650/4093650 sha=de64201322c65d23/de64201322c65d23 OK
- SKIP 3：agent-a1d2／a46f／a7e0（tracked dirty `.claude/settings.local.json`＋untracked `.protosim/`／`sim/`＝8/28 試作 sim。未退避・保持）

**退避した QA scripts（decision252／253／254／d261 の acceptance・analyze スクリプト本体）は master に存在しない** → NEXT で docs/scripts-only commit の候補（§6-2）。

### 7-3. STEP 3（E branch）
`git branch -d` のみ（-D 不使用）。deleted 78（全て master の祖先）。retained 22＝patch-id 一致だが非祖先 16 本（`-d` が拒否・`-D` 禁止のため保持：docs/battle-composition-v2-preflight・docs/commercial-rc-pregate・docs/d256-daily-competitive-gate・docs/d257-d259-decision-rows・docs/d259-daily-spread-preflight・docs/hand-decision-density-audit・docs/lane1-post-d254-practical-qa-reaudit・docs/lane2-ranking-integration-preflight・docs/lane3-commercial-presentation-audit・docs/post-d257-remaining-work-audit・docs/rc-pregate-m2-ledger・feat/card-travel-v1・feat/d237-cast-flash-blend・feat/dock-controls-plate-v1・feat/hud-plate-material-v1・release/d257-sound-layer-rc）＋worktree あり 6 本（release/d264-d266・d267 RC・agent 4）。protected 24（A/B/C/D）。origin：未操作。

### 7-4. prune
`worktree list --porcelain` に prunable 0 → `worktree prune -v` 実行（出力 0＝対象なし）。

### 7-5. 残存 worktree 16（全て A/B/C/D または SKIP）
- SevenGodsGame                                           43c10a4 [feat/d224-premium-payoff-pilot]
- SevenGodsGame/.claude/worktrees/agent-a0c9d48847f8b8066 75ebb14 [worktree-agent-a0c9d48847f8b8066]
- SevenGodsGame/.claude/worktrees/agent-a1d2783278e4c71ee 75ebb14 [worktree-agent-a1d2783278e4c71ee]
- SevenGodsGame/.claude/worktrees/agent-a46f077d4bea01615 fe7d46e [worktree-agent-a46f077d4bea01615]
- SevenGodsGame/.claude/worktrees/agent-a7e0c0912642cb24c 75ebb14 [worktree-agent-a7e0c0912642cb24c]
- SevenGodsGame/.claude/worktrees/agent-a81ac3a707b3fad87 f8cc5a2 [worktree-agent-a81ac3a707b3fad87]
- SevenGodsGame/.claude/worktrees/agent-aed3a8b63d8935628 f78ac9d [worktree-agent-aed3a8b63d8935628]
- SevenGodsGame-d254-rc                                   6fb92fc [docs/post-d262-lanes-integration]
- SevenGodsGame-d262                                      e4ab24b [feat/d262-answer-visibility-v1]
- SevenGodsGame-d263                                      68bcc9c [feat/d263-threat-shape-prep]
- SevenGodsGame-d263-pilot                                78ce071 [feat/d263-threat-shape-v1]
- SevenGodsGame-d265                                      8fdfe23 [docs/d265-video-final-delivery]
- SevenGodsGame-d266-rc                                   202e476 [release/d264-d266-duel-hud-rc]
- SevenGodsGame-d267                                      e36c9ec [docs/d267-reward-value-audit]
- SevenGodsGame-d267-rc                                   12e1ad5 [release/d267-reward-relevance-rc]
- SevenGodsGame-integ                                     641ea5c [master]
