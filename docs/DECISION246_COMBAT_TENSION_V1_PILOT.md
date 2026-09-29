# 決定246 — Combat Tension v1 Narrow Pilot（実装 → 自動 Gate → Human QA READY）

- 日付：2026-09-28
- 実装 GO：**CEO**（2026-09-28「Decision245 recommended SPEC をそのまま実装対象とする」）。実装方式・Gate 判定は **AI 判断**（CLAUDE.md §6-2）
- Baseline：Production **`d1e3b30`**（= master = origin/master・Vercel `6697593799`）
- 作業：worktree `C:/Users/kimi1/SevenGodsGame-d246`・branch **`feat/d246-combat-tension-v1`**（`d1e3b30` から作成）・local commit **`47940f1`**。**merge／push／deploy なし**
- 決定213（OTOMO 構え）・決定224 Pilot の未 Release 差分は **含まない**（メイン worktree の差分とは別 branch）
- 仕様の正：`docs/COMBAT_TENSION_V1_PREFLIGHT.md` §9（決定245）
- 判定：**自動 Gate PASS → HUMAN QA READY**（§7）

---

## 0. 結論（先に）

| 項目 | 結果 |
|---|---|
| 変更 | runtime 3 ファイル（`rules.ts` 2 値・`enemies.ts` 6 敵の並べ替えと表示文・チュートリアル 1 行）＋テスト 6 ファイル |
| typecheck／lint／build | tsc 0／oxlint 0／build OK。**CSS は Production と同一ハッシュ**（`index-C_PvVv3w.css`）、JS のみ `index-BCpZWuo0.js` → `index-DPiBExjD.js` |
| 全テスト | **1,235 件 PASS**（balanceSim 11 件は単独実行）・skip 9（既存） |
| 実 runtime paired-seed Gate | **決定245 Preflight の E1×B3 と全項目で完全一致**（29,400 試合・100 seed）。7 敵の表が E1 と完全一致・託宣 3／神階 2 を実データで確認 |
| 決定論 | 同じ Gate を 2 回実行し、全試合の SHA-256 ダイジェストが一致（`593aa8c5…1f0c`） |
| Gate 中の所見（1 件・対処済み） | 既存 `balanceSim` の基準 bot（託宣を毎ラウンド即使用）が、新ルールでは hard 8 セル・Daily 3 セル・神階 15 セルで 50%／段別下限を割った。**託宣 3 回だけ・峰 R4 だけではどちらも 0 違反**、組み合わせでだけ発生＝「託宣を R1〜R3 で使い切り R4 の峰を素手で受ける」。基準 bot の託宣ルールを「残り回数 ≥ 残りラウンド、または危険なときだけ使う」へ更新（**しきい値は不変**・7 回制では旧挙動と完全同一）→ 11 件 PASS（§4） |
| Known Issue の中心 | **託宣を早撃ちするプレイヤーは hard／Daily の怨霊・龍神で詰まり得る**（上記の生の値）。チュートリアル文で「大技に合わせて切る」を示すが、UI 上の誘導は本 Pilot の範囲外。Human QA で観察する |
| Human QA | PC：Before `http://127.0.0.1:4245`／After `http://127.0.0.1:4246`。iPhone：`http://192.168.11.6:4245`／`:4246`（**Windows ファイアウォールの一時許可が必要**・§7） |

---

## 1. 実装前の安全確認

| 項目 | 値 |
|---|---|
| メイン worktree | `feat/d224-premium-payoff-pilot`・HEAD `43c10a4`（決定213／224 の未 Release 差分あり）→ **使わない** |
| master／origin/master | `d1e3b30`（fetch 後も一致）＝ Production |
| 新 worktree | `git worktree add -b feat/d246-combat-tension-v1 ../SevenGodsGame-d246 d1e3b30`・作成直後 `git status` 0 行 |

## 2. Changed files と exact diff（runtime のみ・全文は `docs/evidence/decision246/runtime-diff-d1e3b30..47940f1.diff`）

### 2-1. `src/core/data/rules.ts`
- `divination.count: 7` → **`3`**（理由コメントを追記）
- `stakes.divinationCount: 4` → **`2`**（「神階ラダー再中心化は対象外」をコメント）

### 2-2. `src/core/data/enemies.ts`（内部値。表示 ×10）
| 敵 | 旧 | **新** | 7R 合計 | 表示 |
|---|---|---|---|---|
| 試練の影 | 5/6/8/9/11/13/15 | **5/8/11/15/13/9/6** | 67 | `typeDescription`「基本を守れば戦える。R4に攻撃が強まる。」・`visualType` lateSurgeMild→**standard** |
| 業斧の鬼将 | 5/7/9/11/13/15/17 | **5/9/13/17/15/11/7** | 77 | 不変 |
| 藍花の怨霊 | 3/4/6/9/13/18/23 | **3/6/13/23/18/9/4** | 76 | 「R4に祟りが極まる。峰を読め。」・lateSurgeStrong→**standard** |
| 銀甲の機工師 | 6/溜/22/⚠溜/必殺24/7/9 | **不変** | 68 | 不変 |
| 双牙の魔獣 | …/4×3必殺/7+6/7+7/8+7/8+8 | …/4×3必殺/**8+8/8+7/7+7/7+6** | 89 | 不変（R3 必殺固定） |
| 蒼海の龍神 | 4/5/7/9/12/16/20 | **4/7/12/20/16/9/5** | 73 | 「R4の大波を受け切れ。」・`visualType` heavy は突進速度用のため据え置き |
| 乱舞の道化 | 4/溜/19/6/12/溜/24 | **4/溜/19/溜/24/12/6** | 65 | 不変 |

`visualType` の変更理由：`lateSurge*` は R≥5 で立ち絵を「終盤の強調」表示にする（`EnemyPanel.tsx:92`）。峰が R4 へ移ったので誤誘導になる。新しい演出は追加していない（既存の standard 表示へ戻すだけ）。

### 2-3. `src/components/TutorialOverlay.tsx`
- 旧「託宣は各ラウンド1回まで使えます。神力を使わないので、迷ったら使ってみましょう。」
- 新「**託宣は1戦3回・各ラウンド1回まで。神力を使わないので、敵の大技に合わせて切りましょう。**」

### 2-4. テスト（6 ファイル・すべて理由コメント付き）
| ファイル | 種別 | 内容 |
|---|---|---|
| `replay/gameVersion.test.ts` | Expected Golden Update | 旧操作列 29 手は龍神 R4 の大波で恵比寿が倒れ、17 手目以降が「決着後の操作」として拒否され再生不能。既存生成器（`P5A_GOLDEN=1`・policySeed 4801）で作り直した結果は **旧 29 手の先頭 16 手と一致**。gameVersion `1.80c6eda23ed082dc`→`1.6c581e56a02c0730`（データ指紋のみ・engineVersion 据え置き）・R7 敗北 score 345 → **R4 敗北 score 139** |
| `engine/enemyActions.test.ts` | Expected Specification Update | 魔獣の合計順 9,10,12,13,14,15,16 → 9,10,12,16,15,14,13（合計 89 を明示検査） |
| `engine/reducer.test.ts` | Expected Specification Update | 試練の影 R2 予告 6 → 8 |
| `replay/actionDistribution.test.ts` | Measurement Baseline Update | actions median 22→17・max 32→42／bytes median 1268→1122・max 1615→1929。上限 400 の余裕は不変 |
| `replay/replay.test.ts` | Pre-existing Test Harness Assumption | 「全体の 1/3 の位置の隣接 2 手を入れ替える」が、笑蓮で同じ R3 内の「託宣とカード 1 枚」（順不同で同じ効き）に当たり正当に同一結果になった。入れ替え位置を「1/3 以降で最初の『カード → END_ROUND』」（カードを次ラウンドへ移す）に固定。4 神とも拒否／別結果を確認（決定216 と同種の事象） |
| `engine/balanceSim.test.ts` | Pre-existing Test Harness Assumption | 基準 bot の託宣ルール（§4） |

## 3. 自動テスト

| 項目 | 結果 |
|---|---|
| `tsc -b` | 0 |
| `oxlint src` | 0 |
| `vitest run`（balanceSim 以外） | 99 files・**1,224 PASS**・9 skip |
| `vitest run balanceSim.test.ts`（単独） | **11 PASS**（決定58・DAILY-01・STAKE-01 を含む） |
| `npm run build` | OK。CSS 同一・JS のみ変化 |

回帰の観点（CEO 指定）：save／resume（`battleSaveStorage`・`resume`）、Daily（`dailyStorage`・`startDaily`・`dailyFairness`）、決定論（`determinism`・`sameSeedRetry`・`seededRandom`）、難易度（`difficulty` 系・`balanceSim`）、Enemy Intent（`enemyActions`・`intentGuard`）、託宣（`applyDivination`・`stakes`・`stakeRules`）、共鳴・神の一撃（`effects`・`godPassive`・`godStrikeStage`）、Result（`resultHub`・`resultContext`・`victoryReveal`）、Solve Loop（`retrySemantics`・`solveLoopWiring`）、score（`score`・`scoreLegacyIntegrity`）、tutorial、旧セーブ移行（`battleSaveStorage` v3〜v8）— いずれも既存テストが全通過。

## 4. Gate 中の所見：balanceSim の基準 bot（対処と根拠）

| 条件 | 決定58（hard・最善 ≥50%） | DAILY-01（神域強化・最善 ≥50%） |
|---|---|---|
| 託宣 3 ＋ 敵表 旧 | 0 違反 | 0 違反 |
| 託宣 7 ＋ 敵表 新 | 0 違反 | 0 違反 |
| **託宣 3 ＋ 敵表 新（Pilot）・旧 bot** | **8 違反**（怨霊×大耀 33%・怨霊×才華 28%・龍神×大耀 28% 等） | **3 違反**（怨霊×大耀 30% 等） |
| 託宣 3 ＋ 敵表 新・**温存 bot** | **0 違反** | **0 違反** |

- 旧 bot の前提（テストのコメント）：「実プレイヤーなら無料の託宣を捨てる理由はない」。7 回制では正しいが、3 回制では「R1〜R3 で使い切る」ことになり、決定245 で測った「温存の価値」を bot だけが持たない状態になる
- 更新：`shouldUseOracle = remaining ≥ 残りラウンド || isDangerous(state)`。**7 回制ではどのラウンドでも remaining ≥ 残りラウンドが成り立つので旧挙動と完全同一**。しきい値（50%・段別下限）は変更していない
- 神階 STAKE-01 も旧 bot では 15 違反（大耀・福永・才華の下位段）だったが、温存 bot では 0 違反。神階ラダーの再中心化は本 Decision の対象外（決定245 §8）。温存しないプレイヤー像での悪化は evidence に記録
- 生の違反リストと切り分け：`docs/evidence/decision246/balanceSim-raw-bot-failures.md`

## 5. 実 runtime paired-seed Gate（29,400 試合・100 seed・7 神 × 7 敵 × 3 難易度 × 4 方策）

harness は決定245 と同一ロジックで、**データを一切差し替えずに**（Pilot の `rules.ts`／`enemies.ts` をそのまま読む）実行。Baseline は同じ harness を `d1e3b30` の写しで実行。

| 指標（ふつう） | Baseline `d1e3b30` | **Pilot `47940f1`（runtime）** | 決定245 E1×B3（preflight） |
|---|---|---|---|
| reader 勝率 | 100.0% | **99.8%** | 99.8% |
| naive 勝率（敗北） | 97.1%（2.9%） | **84.5%（15.5%）** | 同 |
| greedy 勝率（敗北） | 94.5%（5.5%） | **74.3%（25.7%）** | 同 |
| reader−naive／reader−greedy | 2.9／5.5pt | **15.3／25.5pt** | 同 |
| R5／R6／R7 到達 | 85.6／30.6／3.1% | **97.2／62.7／12.4%** | 同 |
| 敵の峰に到達 | 15.7% | **98.7%** | 同 |
| 峰の R でブロック ≥ 予告の半分 | 26.7% | **58.8%** | 同 |
| 最低 HP ≤50%／≤30% | 40.9／0.5% | **63.1／2.4%** | 同 |
| 予告起因の判断／戦 | 1.52 | **3.61** | 同 |
| 神の一撃／戦（発動 R） | 0.30（4.58） | **0.55（5.00）** | 同 |
| 託宣 使用／戦 | 4.34 | **0.98** | 同 |
| 託宣 R1〜3／R4〜5／R6〜7 | 69.1／29.7／1.1% | **3.8／77.8／18.4%** | 同 |
| 加護／天啓／導き | 1.2／98.8／0% | **26.1／73.9／0%** | 同 |
| 温存の価値（早撃ち−reader） | 0.0pt | **−1.4pt** | 同 |

| 難易度 | Baseline reader／naive／greedy | **Pilot reader／naive／greedy** | 備考 |
|---|---|---|---|
| easy | 100／100／100 | **100／99.7／98.7** | 初心者保護 ✅ |
| hard | 99.8／81.9／68.0 | **96.8／46.6／33.1** | 加護 53.9%・温存の価値 −19.0pt・未撃破 2.9% |

**決定245 との差：0**（勝敗・緊張・託宣・撃破 R 分布の 14 行を `diff` で機械比較し完全一致。baseline も決定245 の E0×A7 14 行と完全一致）。preflight の「scratch でのデータ差し替え」と実 runtime の結果が一致したので、決定216 の恒久教訓（scratch の差し替え sim を単独根拠にしない）を満たす。

## 6. Known issues
1. **託宣を早撃ちするプレイヤーの詰まり**：hard／Daily の怨霊・龍神で、毎ラウンド託宣を使う素朴な bot は 28〜48%（§4）。人間の実プレイで起きるかを Human QA Q2 で観察
2. **蒼毘 × 銀甲の機工師（hard）** 未撃破 36%（決定245 §7 と同じ）
3. **神階Ⅴ〜Ⅶ**：決定245 回帰で reader 95→78%・90→53%。本 Decision では再中心化しない（別 Decision）
4. **Daily 神域強化**：reader 98.6→90.5%・未撃破 9.4%（監視）
5. **勝利スコア −26〜−42**（撃破が R5→R6 へ寄りテンポ表が低く評価）。スコア式は変更禁止のため据え置き
6. **進行中の旧セーブ**：託宣の残りが 3 より多いセーブを再開した場合、その試合だけは残り回数ぶん使える（engine は減算のみで例外なし）。次の試合から 3 回
7. **導きの託宣 0%**（決定245 §4）は別 Decision 候補のまま。**PC の敵の向き**は別 Fast Gate Hotfix のまま（本 Pilot では触らない）
8. `EnemyPanel`・`BossEntrance` の `typeLabel`（「遅咲き型」「標準・入門型」「耐久型」）は据え置き。怨霊の「遅咲き型」は峰 R4 と語感がずれる。表示文の追加調整は Human QA の結果を見て判断

## 7. Human QA（CEO・PC と iPhone）

| 環境 | Before（Production `d1e3b30`） | After（Pilot `47940f1`） |
|---|---|---|
| PC | `http://127.0.0.1:4245` | `http://127.0.0.1:4246` |
| iPhone（同じ Wi-Fi） | `http://192.168.11.6:4245` | `http://192.168.11.6:4246` |
| 配信 bundle | `index-BCpZWuo0.js`／`index-C_PvVv3w.css` | `index-DPiBExjD.js`／`index-C_PvVv3w.css` |

- iPhone 接続にはこの PC の Windows ファイアウォールの一時許可が必要（Wi-Fi が Public プロファイル）。管理者 PowerShell で `qa-fw-add-d246.ps1` を実行、QA 後に `qa-fw-remove-d246.ps1`（グループ「QA D246 (temp)」・TCP 4245／4246・LocalSubnet のみ）
- 推奨の遊び方：「ふつう」で 蒼海の龍神 または 藍花の怨霊（峰 R4 が最も分かりやすい）。託宣を R1〜R3 で使い切る遊び方と、R4 まで温存する遊び方を 1 回ずつ

**3 問（PASS＝3 問すべて YES）**
1. 以前より「敵の攻撃を見て考えないと危ない」と感じるか？
2. 神託を「毎ターン押すボタン」ではなく「いつ使うか考える切り札」と感じるか？
3. R4〜R6 まで戦闘の緊張が続き、以前より God Strike まで含めて最後まで戦っている感覚があるか？

違和感は CEO コメントとして記録する。**Human QA PASS 後に Release Gate を別途実行**。本 Decision では merge／push／deploy をしない。

## 8. 変えていないもの
Enemy Intent Core・7R・AP・seed・カード 60 枚・神／OTOMO 能力・敵 HP・難易度倍率・スコア式・共鳴・神の一撃・`EnemyActionDef` 語彙・機工師の表・魔獣 R3 必殺・UI 構造・VFX・画像・音・Entry・Ranking・神階ラダー・PC 敵の向き・導きの託宣。CSS は Production とバイト同一。

## 9. CEO Human QA — **PASS**（2026-09-28）

| 問 | 回答 |
|---|---|
| Q1 以前より「敵の攻撃を見て考えないと危ない」と感じるか | **YES** |
| Q2 神託を「いつ使うか考える切り札」と感じるか | **YES** |
| Q3 R4〜R6 まで緊張が続き、God Strike まで含めて最後まで戦っている感覚があるか | **YES** |

- 判定：**3/3 YES → Human QA PASS**（CEO 判定）。追加コメントなし
- 対象 build：After `47940f1`（`index-DPiBExjD.js`／`index-C_PvVv3w.css`）
- 次：Release Gate（§10）。merge／push／deploy は CEO の Release 承認後

## 10. Release Gate — **PASS**（2026-09-28・AI 判断）

| 項目 | 結果 |
|---|---|
| 状態確認 | pilot worktree clean・branch `feat/d246-combat-tension-v1`・HEAD `47940f1`・master＝origin/master＝`d1e3b30`（Production）・`d1e3b30..47940f1` は 1 commit／9 ファイル（決定246 の差分のみ・決定213／224 混入なし）・fast-forward 可能 |
| RC | branch `release/d246-combat-tension-rc`＝`47940f1`（worktree `C:/Users/kimi1/SevenGodsGame-d246-rc`） |
| tsc／lint／build | 0／0／OK |
| full test | 1,224 PASS＋balanceSim 11 PASS（単独）＝**1,235 PASS**・9 skip |
| 回帰スイート（個別） | replay・決定論・resume・gameVersion・旧セーブ移行・Daily・託宣・Enemy Intent・intentGuard・score・効果／共鳴・sameSeedRetry・Solve Loop・Result・神の一撃・RNG：24 files／317 PASS |
| bundle 同一性 | RC `index-DPiBExjD.js` md5 `4cbf9783…`＝Human QA 版／`index-C_PvVv3w.css` md5 `c198bfae…`＝Human QA 版＝旧 Production |
| runtime paired-seed Gate | RC で再実行：全試合ダイジェスト `593aa8c5…1f0c`＝Human QA 版の Gate と一致 |

## 11. Production Release — **PRODUCTION LIVE**（Release は CEO 承認）

| 項目 | 結果 |
|---|---|
| 統合 | `git push origin 47940f1:refs/heads/master`（fast-forward・`d1e3b30..47940f1`）→ ローカル master も `47940f1` |
| origin/master | `47940f1` |
| Vercel | Production deployment **`6710790486`**（sha `47940f1`・status success） |
| 配信 bundle | `https://seven-gods-game.vercel.app/` → `index-DPiBExjD.js`（md5 `4cbf9783…`）／`index-C_PvVv3w.css`（md5 `c198bfae…`）＝承認対象と一致 |
| rollback | Vercel deployment `6697593799`（`d1e3b30`） |

### Production Smoke（Playwright・PC 1508×660／SP 390×844・閲覧のみ）— **PASS**
| 確認 | 結果 |
|---|---|
| Home 起動 | 4/4 正常（タイトル・hero 神） |
| 戦闘開始 | 4/4 |
| 託宣 1 戦 3 回 | 表示「託宣（残り3回・1ラウンド1回まで）」→ 使用後「残り2回」 |
| Enemy Intent | 大耀×蒼海の龍神 40→70→強打120→特大200（新表 4/7/12/20）／大耀×藍花の怨霊 30→60→強打130→特大230（新表 3/6/13/23） |
| R4 の峰 | R4 に怨霊「特大 230」・龍神「特大 200」を確認 |
| 神の一撃 | 龍神ルート（PC・SP）で発動 |
| victory／defeat | 龍神＝R4 勝利（スコア 9,810）／怨霊（カードを出さずに終える）＝R4 敗北・敗因「R4：藍花の怨霊の『攻撃』で 230 ダメージ」 |
| console error | 0（4 本とも） |
| PC／SP 表示 | 横スクロールなし・結果画面正常 |

証拠：`docs/evidence/decision246/production-smoke/`（smoke.json・スクリーンショット 12 枚・スクリプト原文 `smoke.mjs.txt`）。smoke.json の敗北ルートの `victory:true` は判定式が「撃破」の文字に一致した誤りで、画面は「敗北」。

### 後片付け
- QA サーバー :4245／:4246 停止済み
- 一時ファイアウォール「QA D246 (temp)」：0 件（作成されていない）
- worktree `SevenGodsGame-d246`・`SevenGodsGame-d246-rc` は保持（過去の Release と同じ運用）
