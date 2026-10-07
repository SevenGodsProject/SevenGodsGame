# 決定263 Threat Shape v1「敵 7R の脅威の形」Narrow Pilot

- 日付：2026-10-07
- branch：`feat/d263-threat-shape-v1`（worktree `C:\Users\kimi1\SevenGodsGame-d263-pilot`・base＝master `641ea5c`＝Production＋docs）
- 判断主体：Pilot 開始＝**CEO 承認（2026-10-07・GO WITH MODIFICATIONS）**。実装方式・Gate 判定＝**AI 判断**（CLAUDE.md §6-2）。Human QA＝**CEO**
- 状態：**AUTOMATED GATE PASS → HUMAN QA READY**（merge／master push／Production deploy 未実施）
- 選定の根拠：`docs/NEXT_FUN_SELECTION_AUDIT_2026-10-07.md`（74／100・本書とは分離）
- 前提文書：`docs/OPENING_HAND_READ_PREFLIGHT.md`（Preflight・GO WITH MODIFICATIONS）、`docs/DECISION263_THREAT_SHAPE_PREP.md`（純関数・DOM 仕様）

## 0. 目的（CEO 指示）

未来の正解を教えることではない。「この敵には、これからどんな脅威の形が来るのか」を読み、プレイヤー自身が **今使う／残す／神託を切る／R4 等へ備える** を考えられるようにする。Primary Fun「解く」を増やすための Pilot。

## 1. 表示境界（CEO 承認）

| 承認 | 禁止 |
|---|---|
| 敵名札直下・7 スロット・段階 glyph 1 行（⚔ 小／💥 強打／🔥 特大／🔥＋技名 1 語 必殺／⚡ 溜め） | 未来ラウンドのダメージ数値／攻略ヒント文章／「ここで加護」等の正解表示／推奨カード・推奨行動／新しい枠・大型パネル／敵表・AP・カード・Oracle・Score・Seed・Save 仕様の変更 |

現在の「次の 1 手」の数値予告（`.intent`・決定240）は維持。帯は未来の「強弱・形」だけを示す。

## 2. 実装（最小差分）

| ファイル | 内容 |
|---|---|
| `src/core/engine/previewEnemyActions.ts`（prep `fd0d122`・読み取り専用純関数） | `nextEnemyAction({ ...state, round })` を R1〜R7 に適用。engine と同じ計算・state 不変。`round.ts` は `export` 1 行のみ |
| `src/components/battle/threatShape.ts`（新規・UI 層純関数） | `threatTier`（charge／special／`getIntentPowerTier` の 10／15）・`threatGlyph`（`getIntentGlyph` と同じ対応：bolt／burst／swordHeavy／sword）・`threatName`（「業斧・断岩」→「断岩」）・`threatShapeSlots(preview, round)`（past／current／future） |
| `src/components/battle/EnemyPanel.tsx` | `HpBar` の直後に `<ol class="threat-shape">`（7 `li`・`data-round`／`data-tier`／`data-glyph`・`is-past`／`is-current`／`is-special`・`title` は溜めの予告文と技名のみ）。`.intent` の DOM／文言／クラスは不変 |
| `src/components/battle/BattleScreen.tsx` | `useMemo(() => previewEnemyActions(state), [state.seed, state.enemy.defId])` を `EnemyPanel` へ渡す（対局中は再計算なし） |
| `src/components/battle/battle.css`（末尾追記） | `.threat-shape`（高さ SP 18px／PC 20px・枠・背景なし・flex 7 等分）・tier 色は `.intent-tier-*` と同じ token（強打 `#ff6b6b`／特大・必殺 `#ffb4b4`／溜め `#ffd166`／小 `#9aa0c0`）・過去 0.35／今＝下線点灯・技名は PC のみ表示（SP は glyph＋title）・animation 0 |
| `src/components/battle/threatShape.test.ts`（新規） | G2：7 敵 × 難易度 3 × 神階 4 × Daily で「帯の glyph ＝ `getIntentGlyph(nextEnemyAction)`・段階 ＝ `getIntentDangerLevel`」（**784 セル**）／G6：数値・ヒント語なし・技名は 1 語／phase／7 敵に 🔥 1 つ以上 |

runtime commit：`fd0d122`（prep）→ `b12dcf2`（UI）。docs：`39771a6`（Preflight）。

## 3. Automated Gate（完全シリアル・6GB）

| 項目 | 結果 | 証跡（`docs/evidence/decision263/pilot/`） |
|---|---|---|
| `src/core` 想定外差分 | **0**（prep の `previewEnemyActions.ts`／`.test.ts`／`round.ts` export 1 行のみ。rules・enemies・cards・score・seed・save 不変） | `core-diff-stat.txt` |
| pure function | `previewEnemyActions` 純関数性 test PASS（state 不変・再呼び出し同一） | `vitest.txt` |
| 1,568 cells | `previewEnemyActions.test.ts` 4/4 PASS（224 セル × 7R＝1,568 行一致）＋ `threatShape.test.ts` 784 セル glyph 一致 | `vitest.txt` |
| tsc | exit 0 | `tsc.txt` |
| oxlint | `oxlint src` 0 error | `oxlint-src.txt` |
| vitest | **1,338 PASS**・9 skip・112 files（既存 1,330＋新規 8） | `vitest.txt` |
| build | `vite build` exit 0 → `index-l01T4Q_f.js` md5 `ee446cd81461…`／`index-CZTfcnyq.css` `62b21c604e60…` | `build.txt`・`md5.txt` |
| PC（1508×660） | 7 敵すべて：帯 7 スロット・名札内・HP ゲージ直下・高さ 20.0px・横スク 0・数値なし・🔥 1 つ以上 | `acceptance-out-run2/` e1〜e7-pc |
| SP（390×844） | 7 敵すべて：同上・高さ 18.0px | e1〜e7-sp |
| 7 敵 glyph 一致 | 各 R（守りだけで進行・4〜7R 観測・機工師 SP と道化 PC は 7R 完走）で「今 R のスロットの段階 ＝ 実際の予告の tier クラス」不一致 **0**・`is-current`＝今 R・`is-past`＝前の R | summary.json `rounds[].match` |
| actual Intent との一致 | 上記＋unit 784 セル（全 R）。`.intent` は Production と font-size 20px／17px・line-height・高さ・文言が一致（決定240 A1） | lock-pc／lock-sp |
| Daily | 大耀×当日ボス：帯あり・R1／R2 の段階 ＝ 予告（Daily 修正子適用後）・数値なし | daily-pc／daily-sp |
| save/resume | 機工師 R1 を打って再読込 → 続きから → 帯の 7 段階が同一・`is-current`＝R2・R2 段階 ＝ 予告 | resume-pc |
| console error | 全 19 run で 0 | summary.json `errors` |

**計測不能の記録**：run1 で e4-pc の R6 読み取りが「必殺カットイン中（予告が一時空）」に当たり `is-current` 判定だけ不一致（製品異常ではなく script の待機不足）。script に「次 R の予告が立つまで待つ」を追加して run2 で **19/19 PASS**。run1 の summary.json も保全。

**判定：AUTOMATED GATE PASS → HUMAN QA READY**。

## 4. 実測の 7 敵の形（通常・R1 時点の段階列）

| 敵 | R1〜R7 |
|---|---|
| 試練の影 | ⚔ ⚔ 💥 🔥 💥 ⚔ ⚔ |
| 業斧の鬼将 | ⚔ ⚔ ⚡ 🔥断岩 🔥 💥 ⚔ |
| 藍花の怨霊 | ⚔ ⚔ 💥 🔥怨嗟の花 🔥 ⚔ ⚔ |
| 銀甲の機工師 | ⚔ ⚡ 🔥 ⚡ 🔥神滅甲 ⚔ ⚔ |
| 双牙の魔獣 | ⚔ 💥 🔥双牙乱撃 🔥 🔥 💥 💥 |
| 蒼海の龍神 | ⚔ ⚔ 💥 🔥大海嘯 🔥 ⚔ ⚔ |
| 乱舞の道化 | ⚔ ⚡ 🔥狂宴 ⚔ ⚡ 🔥 ⚔ |

試練／怨霊／龍神の形が同じに見えることは設計どおり（Enemy Identity 監査の実プレイ証拠になる・本 Pilot の範囲外）。

## 5. Human QA（CEO）

- preview：`http://127.0.0.1:4307/`（Pilot dist・`index-l01T4Q_f.js`）
- S1：藍花の怨霊／S2：銀甲の機工師（ふつう・おすすめデッキ）
- Q1：帯を見て「この先に何か来る」と理解できたか
- Q2：帯を見たことで、盾札・託宣・その他のリソースを後の Round へ意図的に残そうと思った場面があったか（**最重要**）
- Q3：「答えを教えられている」と感じたか
- Q4：R1〜R3 の緊張感が減ったと感じたか
- 観測条件：盾札または託宣を意図的に後の Round へ残した場面が 2 戦中 1 回以上

PASS の中心条件：**Q2 YES・Q3 NO・Q4 NO**、かつ glyph と実際の Intent の不一致 0。
Q2 NO の場合：表示量・色・文章・数値の追加で救済しない。「Threat presentation だけでは Card Decision Meaning を改善できない」という反証として **STOP**（Pilot を拡張しない）。

## 6. rollback

`b12dcf2`（UI）を revert するだけで帯は消える（prep の純関数は残しても挙動 0）。save／version／score／seed に影響なし。

---

## 7. Human QA 結果（CEO・2026-10-07）→ Human QA NO / Production NO-GO → CLOSED

- 実施：S1 藍花の怨霊／S2 銀甲の機工師（ふつう・おすすめデッキ・各 1 戦）。Pilot dist `index-l01T4Q_f.js`（Automated Gate と同一 md5）を `vite preview` で配信（`http://127.0.0.1:4307/?enemy=onryo`／`?enemy=karakuri`）。事前の仕様説明なし。追加実装・調整・build 0

| # | 質問 | 結果 | PASS 中心条件 |
|---|---|---|---|
| Q1 | この表示を見て、この先に何か来ることが分かったか | **YES** | （参考） |
| Q2 | この表示があったことで、防御カード・神託・その他の手段を後の Round まで残そうと思ったか | **YES** | YES |
| Q3 | 正解・取るべき行動を教えられている感じがしたか | **YES** | **NO** → 不一致 |
| Q4 | R1〜R3 の緊張感が弱くなったと感じたか | **NO** | NO |

- glyph と実際の Intent の不一致：CEO からの報告なし（Automated Gate では 7 敵 × 7R 不一致 0）
- **判定（CEO）：PASS 中心条件 Q2 YES・Q3 NO・Q4 NO に対し実測 Q2 YES・Q3 YES・Q4 NO → Production GO 条件を満たさない → NO-GO**
- **結論（CEO）：「Threat Shape は resource 温存を誘発したが、CEO が正解を教えられている感覚を持ったため Narrow Pilot は Production NO-GO」**

### 7-1. Evidence（残すもの）
- 未来 Threat 表示は理解できた（Q1 YES）
- 実際に resource 温存行動を生んだ（Q2 YES）
- 序盤の緊張感は失わなかった（Q4 NO）
- 一方で「正解を教えられている」感覚が発生した（Q3 YES）
- → 「未来 Threat の可視化」という仮説自体には **意思決定を変える効果がある**。失敗点は **information quantity／specificity が North Star「読む→組む→決まる」の境界を越えた**こと
- → presentation だけで Card Decision Meaning を解決する方向は完全否定ではなく、**「未来情報の提示量を増やすほど解く楽しさを侵食する境界が Human QA で確認された」** として Evidence 化する

### 7-2. 処置（CEO 指示・Human QA 前ルールどおり）
- 追加説明／色追加／未来 damage 数値／おすすめカード／おすすめ行動／正解表示による救済：**禁止**
- 現 Pilot を修正して再 Human QA：**しない**
- 新しい代替 Decision：**この Closeout 中に作らない**
- master merge：**禁止**／Production deploy：**禁止**
- Pilot branch `feat/d263-threat-shape-v1`（`78ce071`・runtime `b12dcf2`／`fd0d122`）：**Evidence として保持**（削除・rebase・force push しない）。master へ取り込んだのは本書・PREP・Preflight・再選定監査・text evidence（`docs/evidence/decision263/pilot/README.md`）のみ。`src`／`public`／`scripts` は master へ 0
- rollback 手順（§6）は不要（master に UI は入っていない）
- K33 Card Decision Meaning：OPEN のまま（境界 evidence を得た状態）。OB-01「初陣で『読む』が報われるか」も未解決のまま

### 7-3. NEXT（CEO）
- 既定 Roadmap へ戻る：**NEXT NOW＝Public Face Pack v1（CM-01）** → Save Compatibility Guard（RL-01） → Release Safety → Practical QA v3 → v1.0
- runtime 変更前に D263 Closeout 状態と master／origin 状態を報告（本 Closeout commit 時点：integ master＝origin/master `641ea5c`＋docs-only 3 commit・未 push）
