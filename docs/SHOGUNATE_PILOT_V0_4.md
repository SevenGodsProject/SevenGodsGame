> **状態（2026-10-21・Lane 4「将軍家・新敵キャラクター」・Dev＋Planner・AI 判断・CEO 決定282 に基づく次期開発）：IMPLEMENTED ON BRANCH `feat/shogunate-pilot-v0.4`（起点＝v1.0.2 RC `release/v1_0_2-rc` @ `ba0af34`）— Narrow Gate PASS（tsc 0・対象 vitest 6 file 72/72・CORE golden `5678e3e7…` 不変・`gameVersion` `1.d794038a00b5b53c` 不変・save v9 不変・`src/core/engine` 変更 0）— full vitest／build／Preview／Playwright（Gate G2・G4・G6）は PM の直列実行待ち — CEO iPhone QA（§5・8 問）READY AFTER PM GATE。push・merge・tag・deploy・画像生成・将軍家の他 9 体の取得はいずれも行っていない。**

# 将軍家 Pilot v0.4 — 忠次を v1.0.2 RC へ追従（engine は RC 版）＋ Enemy Break v1 と併用 ＋ 予告グローの表示 HP 同期（enemy_08 限定）

- 日付：2026-10-21／担当：Lane 4（Dev＋Planner）／区分：**AI 判断（CLAUDE.md §6-2：技術実装方式・既存仕様の範囲内の改善）**
- 設計書：`docs/SHOGUNATE_NEXT_PILOT_AUDIT_V1.md`（§1 v0.3 実装状態・§4 Enemy Break 互換・§5 手順①〜⑥と Gate G0〜G6 案。Lane 4 の read-only 監査を本 branch へ無改変コピー）
- 前版：v0.1〜v0.3 ＝ `feat/shogunate-pilot-v0.3` @ `5a357f1`（`docs/SHOGUNATE_PILOT_V0_1.md`〜`V0_3.md`・`V0_2_REVIEW.md` は同 branch 上。本 branch には持ち込まない）
- worktree：`C:\Users\kimi1\SevenGodsGame-shogunate-pilot`（`dist-v02`／`dist-v03` は untracked のまま温存）

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 方針（監査 §5-2 B） | **RC 版 engine を正とし、忠次はデータと表示だけ**を載せ替えた。v0.3 の `src/core/engine` 差分（`tactic.ts` 3 引数・`round.ts`・`intent.ts`・`types/enemy.ts`・`rules.ts enemyTactic`）は **RC が同型かつ上位互換（難易度別しきい値つき）で既に持っている**ため 1 つも持ち込んでいない（§3 で照合。「RC に無い v0.3 の engine 差分」＝**0**） |
| 隔離 | `?pilot=` を **集合**で読む（`threat`／`shogunate`／`all`／カンマ区切り・複数指定）。`?pilot=shogunate` だけなら忠次 1 体、`?pilot=threat` だけなら enemy_09 1 体（Lane 1 の受入スクリプトが数える chip 1・notice 1 は不変）、`?pilot=all` で両方。既定（引数なし API）は従来の threat＝RC の呼び出しと互換 |
| 記録ガード・報酬 | `isPilotEnemyId` が **両 Pilot に真**になるようデータ側で拡張。`useGameEngine`（battleSave・runLog・戦績・攻略盤・神階・絆・Daily・送信待ち・自己ベストを書かない）と `BattleScreen`（報酬を畳む）は **変更 0** で忠次にも効く |
| 表示 | v0.2 の一体感ブロック＋v0.3 の R3 drop-shadow グロー（`battle.css` 末尾 76 行・blob は v0.3 と同一 `bef5ff4`・全セレクタ `[data-enemy='enemy_08']`）をそのまま。Enemy Break v1（`enemyBreak.css`）とは別要素＝**追加 CSS 0**。`EnemyPanel` の予告グロー分岐は **enemy_08 だけ** `resolveEnemyTactic(nextScript, hpShown, enemy.maxHp, difficulty)`（表示 HP で解決）。enemy_09 は従来どおり解決しない（Lane 1 の CEO QA 済み画面は不変） |
| しきい値 | 忠次の `cond` は `ratio 0.5` のみ（`ratioByDifficulty` を埋めない）。Enemy Break の half 帯（表示 HP ≤ 0.5）と **easy／normal／hard の全 HP で境界一致**（A「then だが崩れない」0・B「崩れたが else」0。`shogunateRoster.test.ts` Gate G5 で固定） |
| 不変性 | CORE 7 体 JSON sha256 `5678e3e7…0e91` 不変／`gameVersion` `1.d794038a00b5b53c` 不変（指紋に enemy_08 は乗らない）／save v9 不変（`EnemyState.intent` の型不変）／`pickEnemyId` 14 seed golden＋500 seed・Daily 9 日 golden・49 盤 7×7 不変 |
| 自動 Gate（本 Lane で実行済み） | tsc 0 error／oxlint 新規 0（既存 warning 1 のみ）／対象 vitest **6 file 72/72 PASS**（§4）。full vitest・build・Preview・Playwright は PM が直列実行（禁止事項） |
| CEO 判断 | **不要**（承認済み Pilot の範囲内・branch 隔離・Production 0）。CEO の作業は PM Gate 後の **iPhone 5 分・8 問**（§5） |

---

## 1. 変更ファイル（`git diff --stat ba0af34..HEAD`）

### 1-1. commit

| sha | 内容 | runtime |
|---|---|---|
| `a14dd09` | ① 素材を v0.3 から流用（`git checkout 5a357f1 -- …`・再加工 0・新規生成 0）＋台帳 §8 を RC 側へ＋`.gitignore` | 0 |
| `5af68b5` | ② RC 追従（データ・隔離・表示・テスト） | あり |
| （本 commit） | ③ 本書＋監査書のコピー | 0 |

### 1-2. ファイル別

| 区分 | ファイル | 変更 |
|---|---|---|
| `src/core/data` | `enemies.ts` | `SHOGUNATE_ENEMY_IDS`／`SHOGUNATE_ENEMIES`（enemy_08・v0.3 と同じ値）／`ENEMIES = [...CORE, ...PILOT, ...SHOGUNATE]`／`isShogunateEnemyId`／`isPilotEnemyId` が両 Pilot に真。`pickEnemyId` は CORE のまま |
| `src/core/engine` | — | **変更 0** |
| `src/components/pilot` | `pilotFlag.ts` | `PilotKind`／`PILOT_KINDS`／`parsePilotFlags(search): Set`／`parsePilotFlag(search, kind='threat')`／`isPilotEnabled(kind='threat')`。`PILOT_QUERY_VALUE='threat'` は温存。v0.3 の `shogunatePilot.ts` は一本化して持ち込まない |
| `src/components/setup` | `EnemySelectScreen.tsx` | roster ＝ CORE ＋（threat なら PILOT）＋（shogunate なら SHOGUNATE）。案内は Pilot ごと（threat：`enemy-pilot-notice`・文言不変／shogunate：`enemy-shogunate-notice`）。印は既存 `enemy-select-read-chip` を再利用し `data-pilot` と文言（「幕府 Pilot・記録に残らない」）で区別。**setup.css 変更 0**（v0.3 の専用 chip／notice CSS は持ち込まない＝RC の「新規 CSS 0」契約に合わせた） |
| `src/components/battle` | `EnemyPanel.tsx` | `difficulty?: Difficulty`（既定 normal）prop／`nextScript` → enemy_08 だけ `resolveEnemyTactic(nextScript, hpShown, enemy.maxHp, difficulty)`／`--enemy-art` 注入 |
| | `BattleScreen.tsx` | `.battle` に `data-enemy`／`EnemyPanel` へ `difficulty={state.difficulty}`（報酬畳み込みは RC のまま） |
| | `BossEntrance.tsx`・`BattleEnemyCutin.tsx` | 根に `data-enemy={def.id}` |
| | `battle.css` | 末尾に v0.2／v0.3 ブロック 76 行（v0.3 と blob 同一） |
| `src/hooks` | `useGameEngine.ts` | **変更 0**（`isPilotEnemyId` の拡張で忠次も対象） |
| tests（更新） | `pilotFlag.test.ts`（10）・`coreRoster.test.ts`（12）・`enemies.test.ts`（14）・`gameVersion.test.ts`（14） | 集合フラグ／`ENEMIES` 3 配列／enemy_08 は CORE・PILOT に無い／指紋に enemy_08・09 が無く id は 7 つ／EnemyPanel の解決は enemy_08 限定 1 か所 |
| tests（新規） | `shogunateRoster.test.ts`（11）・`shogunateVisual.test.ts`（11） | v0.3 の契約を RC 構造へ＋Gate G5（境界一致）＋Enemy Break 併用の追加 CSS 0 ＋ `hpShown` 解決の source-fixed |
| 素材（流用） | `public/assets/enemies/tadatsugu/art.webp`（sha256 `9abb2640…`）・`art-source/enemies/tadatsugu/tadatsugu_front.webp`（`b8d7d894…`＝manifest 一致）・`public/assets/backgrounds/stages/08-shogunate-camp.webp`（`702229c4…`）・`docs/assets-kit/shogunate-manifest.json` | v0.3 と byte 同一（本 branch で再計測） |
| docs | `ASSET_RIGHTS_LEDGER.md` §8（ENEMY-KIT-01 ◎／STG-08 ✗ 継承）・本書・`SHOGUNATE_NEXT_PILOT_AUDIT_V1.md`（コピー） | `docs/DECISIONS.md` は編集していない（PM が決定274 行へ転記） |
| その他 | `.gitignore` | `dist-v02`／`dist-v03`／`dist-v04` |

---

## 2. 不変性（本 Lane で確認した事実）

| 項目 | 値 | 根拠 |
|---|---|---|
| CORE 7 体 JSON sha256 | `5678e3e757f603ae3b2a1974c772c5480222bea9c7e3e6a78f96d1b49bd70e91`（v1.0.2 統合形・RC と同値） | `coreRoster.test.ts`・`shogunateRoster.test.ts` PASS |
| `gameVersion` | `1.d794038a00b5b53c`（v1.0.0 以来不変）。`rankingImpactSnapshot()` に `enemy_08`・`忠次`・`tadatsugu`・`軍略` は現れない。`"id":"enemy_0x"` は 7 つ | `gameVersion.test.ts`・`shogunateRoster.test.ts` PASS |
| save version | v9 不変（`EnemyState.intent` に tactic は入らない。型・reducer は RC のまま） | `src/core/engine`・`src/core/types` 差分 0 |
| seed → 敵／Daily／49 盤 | `pickEnemyId` 14 seed golden＋500 seed が CORE／`DAILY_BOSS_POOL` 7 体・9 日 golden／`MATCHUP_TOTAL` 49 | `shogunateRoster.test.ts` PASS |
| Threat Pilot（enemy_09） | `PILOT_ENEMIES` 不変・`?pilot=threat` の chip 1・notice 1・文言不変・`EnemyPanel` は解決しない | `coreRoster.test.ts`・`pilotFlag.test.ts` PASS |
| 既存 7 体の見た目 | `battle.css` 追加分の全セレクタが `[data-enemy='enemy_08']`・reduce @media 無し・敵共通 charging-super は `box-shadow` のまま | `shogunateVisual.test.ts` PASS |

---

## 3. v0.3 の engine 差分と RC の照合（持ち込まなかった理由）

| v0.3 の差分（`git diff b2739e4 5a357f1 -- src/core`） | RC（`ba0af34`）の状態 | 判断 |
|---|---|---|
| `engine/tactic.ts`（新規・`resolveEnemyTactic(script, hp, maxHp)` 3 引数） | 同名ファイルが `tacticRatio`／`tacticBranch`／`resolveEnemyTactic(script, hp, maxHp, difficulty)` 4 引数で存在。`ratioByDifficulty` が無ければ `cond.ratio` にフォールバック | **RC 版を使う**。忠次は `ratio` のみなので 4 引数版でも v0.3 と同じ答え（normal ≤49） |
| `engine/round.ts`（`nextEnemyAction` が解決してから倍率） | 同じ構造＋`state.difficulty` を渡す | RC 版 |
| `engine/intent.ts`（`enemyActionTotal` が `EnemyActionScript` を受ける） | 同一 | RC 版 |
| `types/enemy.ts`（`EnemyTacticDef`・`EnemyActionScript`）・`types/index.ts` | 同一＋`ratioByDifficulty?` | RC 版 |
| `data/rules.ts`（`enemyTactic.defaultHpRatio 0.5`） | `defaultHpRatio 0.5`＋`hpRatioByDifficulty {easy 0.5, normal 0.5, hard 0.6}` | RC 版。忠次は `hpRatioByDifficulty` を**埋めない**（§0 しきい値） |
| `data/enemies.ts`（`CORE_ENEMIES` 改名・`SHOGUNATE_*`） | `CORE_ENEMIES`／`PILOT_ENEMIES` 分離済み・「enemy_08 は忠次に予約」 | `SHOGUNATE_*` を追加（本 branch） |

**RC に無い v0.3 の engine 差分 ＝ 0**。PM 判断に回す engine 変更はない。

---

## 4. Gate（監査 §5-2 の G0〜G6 案に対する本 Lane の状態）

| Gate | 条件 | 本 Lane | 残り（PM 直列実行） |
|---|---|---|---|
| G0 | RC HEAD × v0.4 merge-tree conflict 0 | **PASS**（起点が RC HEAD `ba0af34`。RC に docs-only commit が乗った場合は `git merge-tree` で再確認） | RC が動いたら再確認 |
| G1 | tsc 0・oxlint 新規 0 | **PASS**（`npx tsc -b --noEmit` 0 error／`npx oxlint <変更 13 file>`：warning 1 ＝ `BattleScreen.tsx:275` exhaustive-deps・RC 既存・本 Lane の変更行ではない） | — |
| G2 | full vitest ＝ RC 1,504 ＋ 新規 22（shogunateRoster 11＋shogunateVisual 11）＋ 既存更新分 ± PASS・0 fail | 対象 6 file **72/72 PASS**（`shogunateRoster` 11／`shogunateVisual` 11／`pilotFlag` 10／`coreRoster` 12／`enemies` 14／`gameVersion` 14）。`useReactionLanguage.test.ts` は `ENEMIES` を全走査するため忠次 1 体分の対局が増える（engine は RC 版なので PASS 見込み・未実行） | **full vitest**（期待 1,504＋22＋pilotFlag +1 ＝ 1,527 前後） |
| G3 | 不変性 | **PASS**（§2） | `scripts/.../invariants.mjs` があれば同値確認 |
| G4 | Playwright：`?pilot=shogunate` 受入＋`?pilot=threat` 74/74 不変＋`?pilot=all` 9 体＋委ねる＝10 枚 | 未実行（build・preview 禁止） | **build → preview → lane1 `acceptance.mjs`（不変）→ v0.3 branch の `scripts/shogunate-pilot/acceptance.mjs` を RC 向けに移植**（testid：notice は `enemy-shogunate-notice`・chip は `enemy-pilot-chip[data-pilot=shogunate]`・URL `?pilot=shogunate`） |
| G5 | 境界一致：easy／normal／hard 全 HP で A＝0・B＝0 | **PASS**（`shogunateRoster.test.ts`：then 上限 easy 41／normal 49／hard 56 ＝ half 帯と同じ。表示側 `resolveEnemyTactic` と engine 側 `tacticBranch` は同じ関数で同じ答え） | — |
| G6 | 組み合わせ probe（enemy_08・R3 で帯 high→half の瞬間に `cf2-break-half` と `charging-super` 除去が同フレーム・崩れ中の予告文言不変・JS error 0・SP375 rAF p95 ≤ 33ms） | 未実行 | **`scripts/lane2-combat-feel-v2/probe-threat.mjs` を enemy_08 向けに複製**（URL `?pilot=shogunate&seed=…`・敵名「将軍四天王・忠次」） |

---

## 5. CEO iPhone 実機 QA（5 分・YES／NO・PM の Gate PASS 後）

前提（PM）：`vite build --outDir dist-v04` → `npx vite preview --outDir dist-v04 --host 0.0.0.0 --port 4183 --strictPort`（4182 の v0.3 と並べて比べられる）・同一 Wi-Fi・Firewall 4183。URL：`http://192.168.11.6:4183/?pilot=shogunate`（**`?pilot=shogunate` が無いと忠次は出ない**）。操作：大耀 → normal → Enemy Select 末尾「将軍四天王・忠次」（印「幕府 Pilot・記録に残らない」）→ おすすめデッキ → 入口 → **R1・R2 はカードを出さずに「ラウンドを終える」** → R3 の溜めを見る → R3 でまとめて殴って表示 HP 490 以下へ追い込めれば R4 は ⚔120、追い込めなければ 🔥 軍略・総攻め 240。

| # | 設問 | 見るところ | 期待 | NO のときの読み |
|---|---|---|---|---|
| Q1 | R3 の溜め（「⚠ 傷が浅ければ次は総攻め」）で、忠次の周りの**赤い光が鎧の輪郭に沿って**見えた（角丸の「箱」に見えなかった）か | R3・立ち絵の周囲 | **YES** | iPhone の 192×184 では形の変化が小さい → PC 目視で補う |
| Q2 | 「忠次が舞台の中にいる」感じが**増した**か（v0.1／v0.2 の記憶と比べて） | R1〜R4 全体 | **YES** | v0.2 の色調層を外して v0.1＋v0.3 だけへ（CSS ブロック内で閉じる） |
| Q3 | R3 の予告を読んで、「R3 までに追い込む」か「R4 の総攻めに備える」かを**自分で決めた**か（どちらでも YES） | R3 の手札選択 | **YES** | 文言・しきい値の再評価 |
| Q4 | R4 の予告（⚔120 か 🔥240）が、R3 で自分がやったことの**答え合わせ**に感じられたか | R4 開始時 | **YES** | 1 手先予告の因果が伝わっていない → 文言案 1 つ |
| Q5 | 入口・必殺カットイン・戦闘中で、忠次の**色味や光が食い違って**見えたか | 入口／カットイン／R1 | **NO** | v0.2 の filter 値の再調整 1 回 |
| Q6 | 画面の**カクつき・遅れ・崩れ**（文字のはみ出し・横スクロール・立ち絵の欠け）があったか。特に R3 で崩れた瞬間 | 全体・R3〜R4 | **NO** | drop-shadow ×5 ＋ Enemy Break の filter 入れ子（監査 §4-4）→ 輪の段数 5→3（CSS 1 行） |
| Q7 | **もう一度忠次と戦いたい**か | 決着後 | **YES** | 再戦意欲の低下要因を 1 行で聞き取り |
| **Q8** | **R3 で忠次が崩れた瞬間（体が沈み・名札が閃き・赤い輪が消えて金の溜め光に変わる）、「追い込めた」と分かったか** | R3・表示 HP が 490 を割る瞬間 | **YES** | 合図が 2 回に見える（赤→金と崩れがずれる）なら G6 の同フレーム計測を見直す。分からなければ Enemy Break と予告グローのどちらかを強める（別 Decision） |

合否（AI 案）：Q1・Q2・Q3・Q4・Q7・**Q8** が YES、Q5・Q6 が NO で v0.4 を Pilot の正式版とし、以後の将軍家 9 体（監査 §3：次は直政）をこの経路に乗せる。

---

## 6. 残課題

| # | 内容 | 誰が |
|---|---|---|
| 1 | Gate G2（full vitest）・G4（build／preview／Playwright）・G6（probe）の直列実行と evidence 保存（`docs/evidence/shogunate-pilot-v04/`） | PM |
| 2 | v0.3 branch の `scripts/shogunate-pilot/{acceptance,compare,pixdiff}.mjs` を RC 向けに移植（testid・URL・敵名。本 branch には未収録） | PM／Dev |
| 3 | v0.3 の `shogunateTactic.sim.test.ts`（`SIM_SHOGUNATE=1` のみ・then 率 38.6%）と忠次用 `enemyTactic.test.ts`（10 it）は未移植。機構の契約は RC の `enemyTactic.test.ts`（enemy_09）が担っており、忠次固有は `shogunateRoster.test.ts` が担う。hard の then 率は sim で別途確認（Lane 1 の 17.9% は enemy_09・`ratioByDifficulty 0.6` の値。忠次は 0.5 固定なので hard で偏る可能性あり＝Q3 の結果と合わせて判断） | Planner |
| 4 | `docs/DECISIONS.md` 決定274 行への本書の転記（AI 判断・PM が編集） | PM |
| 5 | 台詞 7 本・二つ名の監修（v0.1 から継続）／Credits（CM-02）の「将軍家」追記／Daily・攻略盤・戦績への組み込み方（別 Decision） | CEO／AI 起票 |
| 6 | RC に docs-only commit が乗った場合の G0 再確認（`git merge-tree --write-tree release/v1_0_2-rc feat/shogunate-pilot-v0.4`） | PM |

## 7. 本書で変更していないもの

`src/core/engine`／`src/core/types`／`src/hooks`／`setup.css`／`enemyBreak.css`／`docs/DECISIONS.md`：変更 0。将軍家の他 9 体：取得 0。画像生成・再加工：0。他 worktree：git 書き込み 0。full vitest／vite build／dev・preview サーバー：実行 0。origin push／merge／tag／deploy：0。
