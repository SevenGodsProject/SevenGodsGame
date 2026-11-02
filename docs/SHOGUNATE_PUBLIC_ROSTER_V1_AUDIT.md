# 将軍家 第一陣 公開（忠次を通常導線へ）設計監査 v1 — READ-ONLY

> **状態（2026-11-03・AI-PM＋Planner＋Dev・AI 判断・docs-only・read-only 調査）：AUDIT COMPLETE — 実装 0／`src`・`public`・`scripts`・`package.json` 変更 0／sim 実行 0／push・merge・deploy 0。** 基準点：Production = master = origin/master **`10b0cd3`**（決定286 v1.0.6 PRODUCTION LIVE・Vercel `7494257506`）。読み取り正本＝worktree `SevenGodsGame-integ-v106`（branch `docs/v1_0_6-live-record` `59ff547`＝master `10b0cd3` ＋ LIVE 記録 docs のみ）。

- 位置づけ：決定286 Release Gate 通過後の「Phase 3：次工程の準備」。既存ロードマップ（`ROADMAP_TO_RELEASE.md`・`SHOGUNATE_FACTION_DESIGN_V1.md` §5・`LANE3_NEXT_PLAN_V1.md`・`MASTER_BACKLOG_AUDIT.md`）と未解決課題（`RELEASE_STATUS.md` §A-4 K01〜K39・忠次 hard W1）を棚卸しし、次に着手する開発を **1 案** に絞り、その設計監査を行う
- 判断主体：AI チーム（CLAUDE.md §6-2「複数案からの推奨案選定」「既存仕様の範囲内の改善」）。Production 公開（§6-3 #8）と、二つ名・台詞 7 本の監修（§6-3 #3 に隣接）は CEO
- 本書は **runtime を 1 文字も変更していない**。§4 の「変える」は実装時の指針であり、実装開始は §11 の CEO 判断後

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| **次に着手する開発（1 案）** | **将軍家 第一陣 公開 v1＝忠次（enemy_08）を `?pilot=shogunate` の隔離から外し、通常の Enemy Select に 8 体目として並べる**（v1.0.7 候補）。戦績・セーブ・報酬・神階・絆・同じ盤面 Retry は既存 7 体と同じに扱い、**Daily 巡回・49 攻略盤・「神に委ねる」の seed 選出・gameVersion 指紋は既存 7 体のまま固定**（faction 設計 v1 §5-2／§5-3 の v1.1.0 どおり） |
| なぜ康政 Pilot より先か | 忠次は v0.1〜v0.6・CEO Human QA 計 9 問 PASS・統合 Gate・Production Smoke（138/138・probe 10/10）まで済んで **Production に入っているのに、`?pilot=` を知る人以外には存在しない**（Player Value 0）。開いた milestone を閉じる（`SEVENGODS_NEXT_MILESTONES.md` ルール「NEXT NOW は常に 1 つ・閉じてから次へ」）のが先。康政 v0.1 は忠次の UI・engine 拡張を前提にしており、忠次公開で得る「公開時の密結合の答え」（§4）を康政にもそのまま流用できる |
| 規模（見積） | runtime 変更 ≈ **25〜45 行**（`enemies.ts` の判定関数 1 本・`EnemySelectScreen.tsx` の roster／印／案内・`pilotFlag.ts` の kind・`creditsText.ts` 1〜2 行）＋テスト／受入スクリプトの期待値更新 ≈ 40〜60 行。`src/core/engine` 0・rules 0・save v9 不変・gameVersion `1.d794038a00b5b53c` 不変・新規素材 0・追加転送 0（画像 2 本は v1.0.6 bundle に既に同梱） |
| **最大の設計上の論点（§5）** | 忠次の **★3 は設計上の帯（鬼将・魔獣と同帯）であり実測ではない**。v0.5 の素朴 bot sim では hard 敗北率 1.1%＝既存 7 体の幅 1.4〜7.1% の **下端より低い**（道化 ★1 に次ぐ易しさ）。v1.0.1 決定281 で Enemy Select の注記を「★は脅威度（**実測**の手強さ）」にした以上、公開前に **v1.0.1 と同じ 6 打ち筋 × 16 seed の ★ 監査を忠次にも走らせ、同じ式で ★ を付け直す** ことを Gate 必須にする（★ は表示専用・CORE 外＝指紋不変・engine 不変） |
| hard W1（§6） | 「崩れ 50%」と「✓ 止めた 60%」が hard だけ別瞬間になる既知のずれ（CEO 承認 v0.6 の hard 0.6）。公開では **据え置き＋Human QA 1 問で確認**（hard のしきい値を 0.5 に戻すと then 率 16.8% で分岐が死ぬ＝v0.5 監査の結論と矛盾） |
| CEO 判断 | **1 件**（§11）：公開 GO と同時に **二つ名「将軍四天王・忠次」の表記・台詞 7 本の監修**（v0.1 から「CEO 監修待ち」のまま Production に入っている）。実装開始そのものは §6-2（既存仕様＝faction 設計 v1.1.0 の範囲内）だが、台詞監修の結果で文言が変わるため、**監修と実装開始を 1 回の返答にまとめる** |
| CEO 判断が不要なもの | 公開範囲の設計（§3 案 A）・密結合の扱い（§4）・★ 再付番の方法（§5）・Gate 構成（§9）・Credits の追記文（§7・Kit 規約内） |

---

## 1. Phase 3 候補の棚卸しと優先順位（AI 判断）

評価軸は CLAUDE.md §6-1（Player Value／Strategic Depth／Replayability／Game Feel／UX／Retention／Implementation Cost／Regression Risk／独自性）。★＝外部 INPUT（CEO・課金・外部サービス）が必要で AI だけでは閉じられないもの。

| 順位 | 候補 | 出典 | Player Value | Cost | Regression | ブロッカー | 判定 |
|---|---|---|---|---|---|---|---|
| **1** | **忠次 公開 v1**（通常導線 8 体目） | faction 設計 §5-1 v1.1.0／v0.4 spec §残課題 5「Daily・攻略盤・戦績への組み込み方（別 Decision）」 | 高（全プレイヤーに新敵 1 体・新語彙「軍略」） | 小（§0） | 小（CORE 不変・指紋不変） | 台詞監修（CEO・1 回） | **採用** |
| 2 | 康政 Pilot v0.1（`roundDamageAtLeast`） | `LANE3_NEXT_PLAN_V1.md` §2-③・§7-2（支配戦略でない） | 0（Pilot 隔離のまま）→ 公開後に高 | 中（engine +12 行・UI 流用） | 小〜中 | CEO Pilot 開始承認（同 §6） | 2 番手。忠次公開の後に同じ経路で |
| 3 | 7 神 crisis／greeting ボイス展開（データ追加のみ） | scratchpad `lane2-voice-tech-audit` §7 | 中（Game Feel） | 小（コード 0・mp3 12 本 ≈2.3MB） | 小 | CEO 試聴（台詞×性格整合）・iOS 実機 | 並走可能な docs Lane。Human QA 枠が空いたら |
| 4 | Card Art Unity Pilot 6 | `CARD_ART_UNITY_PILOT6_PLAN.md` | 中 | 大（画像生成） | 小 | ★ CEO 画像生成・権利 | 保留 |
| 5 | POST RELEASE 残：error reporting（CM-05）・Web Share（SG-02）・KPI | `ROADMAP_TO_RELEASE.md` §5 | 中 | 小〜中 | 小 | ★ 外部サービス・CEO | 保留 |
| 6 | CF-02 神 passive 3/7・Mastery 4/7 の非対称確定 | 同 §5-3 | 中（Strategic Depth） | 中（rules・sim） | 中（gameVersion 変化＝Daily 版が動く） | — | 忠次公開より後（指紋を動かす変更は単独 Release） |
| — | Ranking（RK-*）・Neon | — | — | — | — | 指示で対象外 | 触れない |
| — | 生存 Known K01〜K39 | `RELEASE_STATUS.md` §A-4 | 小 | 小 | 小 | CEO「修正しない」（K01）等 | 据え置き |

採用理由の要点：候補 1 だけが「外部 INPUT 1 回（台詞監修）・runtime 小・Regression 小・Player Value 高」を同時に満たす。候補 2 は候補 1 の成果（公開時の密結合の答え）を前提にできるので順序を入れ替えない。候補 3 は候補 1 と同一ファイルを触らない（voice は `sound.ts`／`useCrisisVoice`、本件は `enemies.ts`／`EnemySelectScreen`）ため、CEO 試聴の都合がつけば docs Lane として並走できる。

---

## 2. 現状：忠次はどこで隔離されているか（`10b0cd3`・file:line）

| 層 | 箇所 | いま | 公開時 |
|---|---|---|---|
| URL スイッチ | `src/components/pilot/pilotFlag.ts:18-19` `PilotKind = 'threat' \| 'shogunate'`・`isPilotEnabled('shogunate')` | `?pilot=shogunate` か `all` のときだけ真 | `'shogunate'` を kind から外す（`'threat'` は残す。enemy_09 鬼将・軍略は決定282 のとおり Pilot 隔離のまま） |
| Enemy Select の並び | `src/components/setup/EnemySelectScreen.tsx:60-63` `roster = pilot ? [...CORE, ...(threat), ...(shogunate)] : CORE_ENEMIES` | 通常 URL は 7 体 | `[...CORE_ENEMIES, ...SHOGUNATE_ENEMIES, ...(threatPilot ? PILOT_ENEMIES : [])]`＝通常 URL 8 体（忠次は 8 番目・鬼将軍略は Pilot 時のみ末尾） |
| Pilot の印・案内 | 同 `:80-84`（案内 `enemy-shogunate-notice`）・`:137-140`（chip「幕府 Pilot・記録に残らない」） | 表示 | 忠次ぶんは削除。threat の印・案内は不変 |
| 攻略印の抑止 | 同 `:103` `godId && matchups?.available && !isPilotEnemyId(enemy.id)` | 忠次に攻略印を出さない | 忠次は 49 盤の対象外（§4）なので **引き続き出さない**。ただし理由が「Pilot」から「盤外」に変わる＝判定を `isMatchupEnemyId`（＝`MATCHUP_ENEMIES` 所属）に置き換える |
| 記録ガード（一括） | `src/hooks/useGameEngine.ts:215-230` `pilotBattle = isPilotEnemyId(defId)` → battleSave・runLog・戦績・攻略盤・神階・絆・Daily・送信待ち・自己ベストを書かない | 忠次は何も残らない | `isPilotEnemyId` が **enemy_09 だけ** に真になるよう `src/core/data/enemies.ts:461-463` を変える → 忠次は通常経路（§4 の各行で安全性を確認） |
| 報酬の畳み込み | `src/components/battle/BattleScreen.tsx:416-417` `rewardDone = rewardDoneState \|\| pilotBattle` | 報酬カードを出さない | 同上で自動的に報酬あり（`rewardStorage`・`rewardHistoryStorage` は敵 id を持たない＝§4） |
| 軍略の表示分岐 | `src/components/battle/EnemyPanel.tsx:121,127` `isShogunateEnemyId` | 忠次だけ軍略の 1 手先予告（R3「あと N」） | **不変**（`isShogunateEnemyId` は残す） |
| 舞台減光 | `battle.css` 末尾 `data-enemy="enemy_08"` 限定ブロック | 表示のみ | 不変 |
| データ | `src/core/data/enemies.ts:403-450` `SHOGUNATE_ENEMIES`（HP 98・★3・actions 7・台詞 7・art／stage） | Production bundle に同梱 | **数値は不変**。`rank` だけ §5 の実測結果に従う（表示専用） |
| 指紋 | `src/core/replay/gameVersion.ts:3` `import { CORE_ENEMIES }` | 忠次は指紋に乗らない | 不変（公開しても `1.d794038a00b5b53c` のまま） |

---

## 3. 公開範囲の設計（3 案比較 → A）

| 案 | 内容 | Player Value | Cost／Regression | 判定 |
|---|---|---|---|---|
| **A** | **Enemy Select に 8 体目として並べ、選んで戦う。戦績・セーブ・報酬・神階・絆・同じ盤面 Retry は通常どおり。Daily 巡回・49 攻略盤・「神に委ねる」seed 選出・gameVersion は既存 7 体のまま** | 高（毎回選べる新敵・軍略の読み） | 小。faction 設計 v1 §5-2／§5-3 が v1.1.0 として予定した形そのもの。既存 seed／Daily／盤／版は 1 bit も動かない（`shogunateRoster.test.ts:73-101` がそのまま守る） | **採用** |
| B | A ＋ Daily 巡回・49 盤・seed 選出にも入れる（8 体ローテ・8×7＝56 盤） | 高 | **大**。`DAILY_BOSS_POOL`（`dailyBoss.ts:33`・test「1 週間で 7 体が必ず 1 回ずつ」）・`MATCHUP_TOTAL` 49（`matchupStorage.ts:38-39`・storage の盤データ移行）・`pickEnemyId` 14 seed golden・**gameVersion が変わり Daily の版が動く**・NM1／「七体すべて」文言。faction 設計 §5-2 が「v1.1.2 以降に別 Decision」とした理由どおり | 却下（別 Release で設計） |
| C | Pilot のまま、Home や遊び方で `?pilot=shogunate` を案内する | 低（記録に残らない戦いを案内する価値が薄い・URL 手入力） | 最小 | 却下 |

A の「49 盤の対象外」は UI で **1 行だけ正直に示す**：Enemy Select の忠次カードに攻略印を出さない代わりに、小さな注記「攻略盤（7×7）の対象外・戦績と報酬には残る」を 1 行（既存 `.enemy-select-read-chip` の意匠を流用・新 CSS 0）。黙って印だけ無いと「バグ」に見えるため。

---

## 4. 密結合の棚卸し（A を実装したとき、各系統で何が起きるか）

「変えない」は実装で触らない・「自動」は判定関数の変更だけで正しく動く・「検証」は Gate で機械確認する項目。

| 系統 | 箇所 | 忠次が公開されると | 扱い |
|---|---|---|---|
| battleSave（続きから） | `useGameEngine.ts:217-219` `saveBattle` | 忠次の盤面も保存・復元される。復元は `getEnemyDef(defId)` が `ENEMIES`（8＋1 体）を走査するので enemy_08 は解決できる。save v9 不変（`EnemyState.intent` の型は v0.4 で不変を証明済み） | 自動＋**検証**：忠次の盤面を保存→再読込→決着まで（hardening-invalid-enemy-id の受入に 1 ケース追加） |
| 神ごとの戦績・自己ベスト | `recordStorage.ts`（敵 id を持たない） | 忠次戦の勝敗・スコアが神別に積まれる。HP 98 は既存 94〜103 帯・7R 合計 then 57／else 69 は既存 65〜77 帯＝スコアの比較可能性は保たれる | 自動 |
| 49 攻略盤 | `matchupStorage.ts:38-42,209-210` `isKnownEnemy` が `MATCHUP_ENEMIES`（CORE 7）で判定 → `recordMatchupClear` は **null** | 盤は 49 のまま・初撃破の祝福も出ない。`GameOverOverlay` は Pilot 経路で既に null を受けている | 変えない（§3 の注記 1 行で説明） |
| 次の目標（NM1 等） | `nextGoal.ts:171-176` `matchup` が null なら N2（別の神でも攻略）を飛ばして N4／N6／N10 へ | 忠次戦後は「今日の神域挑戦」「自己ベスト」系の目標が出る。破綻なし | 変えない・**検証**（受入で忠次勝利後の目標 id を記録） |
| 同じ盤面 Retry・前回比（Stage B） | `retrySemantics.ts:85` key に `enemy.defId` を含む | 忠次でも同じ盤面 Retry と前回比が機能 | 自動 |
| 報酬カード | `BattleScreen.tsx:416-417`・`rewardStorage`／`rewardHistoryStorage`（敵 id なし） | 既存 7 体と同じ報酬提示・履歴 | 自動 |
| 神階（stake）・OTOMO 絆 | `stakeStorage.ts`・`otomoBondStorage.ts`（敵 id なし） | 既存どおり加算 | 自動 |
| Daily 巡回・今日の問い | `dailyBoss.ts:33` `DAILY_BOSS_POOL = Object.values(ENEMY_IDS)`（CORE 7）・`HomeTodayPanel.tsx:56` | 不変（忠次は Daily に出ない） | 変えない（`shogunateRoster.test.ts:84-87` が守る） |
| 「神に委ねる」seed → 敵 | `enemies.ts:486` `CORE_ENEMIES[hash % 7]` | 不変（委ねると忠次は出ない）。委ねる＝既存 7 体、という注記は現状の文言に無いので追加不要 | 変えない（14 seed golden＋500 seed） |
| gameVersion／Ranking 送信待ち | `gameVersion.ts:3`（CORE のみ）・`enqueuePendingRun` は Daily のみ | 指紋不変。忠次は Daily に出ないので送信待ちに enemy_08 が入る経路は無い | 変えない（Ranking には触れない） |
| balanceSim Gate（決定58 hard × 全神 × 全敵 ≥50%） | `balanceSim.test.ts:3` `CORE_ENEMIES as ENEMIES` | 忠次は **Gate の外**（v0.5 sim では hard 勝率 98%＝通るが、機械が見ていない） | **検証**：公開対象（CORE＋SHOGUNATE）を走る 1 ケースを追加（既存ケースの数値は不変） |
| Enemy Select の段組（SP375／390） | 8 枚＋「委ねる」＝9 枚 | v0.4 Gate G6(b)(c) 138/138 が `?pilot=shogunate` の 8 体表示で確認済み（同じ DOM） | 自動・受入で再確認 |
| 文言「七体すべての敵」 | `matchupCelebration.ts:20`（`MATCHUP_ENEMIES.length`） | 盤は 7 のまま＝正しい | 変えない |
| 初戦・Tutorial | `firstBattle.ts`・`TutorialOverlay.tsx`（`ENEMY_IDS.trial` 固定） | 影響 0 | 変えない |
| Threat Pilot（enemy_09） | `PILOT_ENEMIES`・`?pilot=threat` | 隔離のまま（決定282）。`isPilotEnemyId` は enemy_09 だけに真 | 変える（判定の分離） |

結論：**engine・rules・storage のスキーマは 1 つも変えない**。変えるのは「判定関数 1 本」「Enemy Select の並びと注記」「pilotFlag の kind」「Credits 1〜2 行」「rank（★）」だけ。

---

## 5. ★（脅威度）の実測 — 公開前に解くべき最大の論点

### 5-1. 事実

- `enemies.ts:415` `rank: 3`（コメント「四天王＝中〜高位・鬼将・魔獣と同じ ★3 帯」）＝**設計上の帯**。v1.0.1 決定281 の ★ 再付番（`scripts/v1_0_1-rc/star-reeval.mjs`・`docs/evidence/v1_0_1-rc/star-reeval.json`）は **既存 7 体だけ** を対象に、6 打ち筋 × 16 seed × 3 難易度の実測指数（`0.5×(1−勝率)+0.3×被ダメ比+0.2×撃破R` ×100）で 4/4/3/3/2/2/1 を付けたもの。忠次はその matrix に **入っていない**
- Enemy Select の注記（`EnemySelectScreen.tsx:72-74`・`enemySelectNote.test.ts:18-21` で固定）は「★は脅威度（**実測の手強さ**：負けやすさ・受けるダメージ・倒すまでの長さ）」。公開して通常導線に並ぶ瞬間、忠次の ★3 もこの注記の対象になる
- `SHOGUNATE_V0_5_GAMEPLAY_AUDIT_AND_QA.md` §2（素朴 bot・3 難易度 × 7 神 × 40 seed）：忠次 **normal 勝率 100%・hard 敗北 1.1%・残 HP 0.73** に対し既存 7 体は hard 敗北 1.4〜7.1%・残 HP 0.60〜0.75。同監査 §2 読み 4「難しさは既存 7 体の中位〜易しめ（hard 負け 1.1%＝道化に次いで低い）。表示の ★3 は実測より強く見える可能性」。v0.6（hard 0.6）でも勝率 98.6〜98.9% で同値（`SHOGUNATE_V0_6_DESIGN_AUDIT.md` §2）

### 5-2. 判断（AI）

- **★ は実測で付け直す**（表示専用・CORE 外＝指紋不変・engine 不変）。方法は v1.0.1 と同一にする：`SevenGodsGame-enemy-audit/scripts/enemy-star-audit/enemyStar.audit.ts`（`ENEMIES` を走査するので忠次・鬼将軍略が自動で入る・16 seed・6 打ち筋・所要 ≈112 秒／7 体 → ≈150 秒／9 体）を **v1.0.6 engine（`10b0cd3`）の tree で実行**し、`star-reeval.mjs` と同じ式で 7 体＋忠次の指数を並べ、忠次の指数が入る帯の ★ を採る（既存 7 体の ★ は **動かさない**＝忠次だけ相対位置で決める）。この harness は `scripts/ranking-v1-1-fairness/dailyHarness`（純粋な sim 用の打ち筋・Ranking の送信経路や Neon には一切触れない）を import するので、実行時は両ディレクトリを scratchpad か専用 worktree に複製する（master には無い）
- 予想：hard 敗北率が道化の次に低いことから **★1〜★2** に落ちる可能性が高い。そのとき「将軍四天王」の二つ名と ★1〜2 の組み合わせは **物語上の違和感** になる。対処は 2 択で、**本書は (a) を推奨**：
  - (a) ★ を実測どおり下げ、typeDescription の「R4は傷が浅ければ総攻め。R3までに追い込め。」で「読み」の敵であることを示す（既存 7 体も道化 ★1 のまま「乱舞」の個性で遊ばれている）。数値を動かさないので CEO Human QA 9/9 の体感・統合 Gate の決定論一致がそのまま生きる
  - (b) 忠次の数値（attack 列・HP）を上げて ★3 に届かせる → engine は不変でも **v0.1〜v0.6 の Human QA・sim・Gate をやり直す**（Regression 中）。康政 v0.1 の sim（忠次を代理敵に使用）も再計算。公開を 1 サイクル遅らせる
- 「実測ではないが ★3 のまま出す」は **却下**（決定281 の注記が嘘になる）

### 5-3. Gate 項目（§9 G-★）

- 実行：上記 audit を `STAR_SEEDS=16` で 1 回・単一プロセス直列（6 GB 機・他の probe と同時にしない）
- 判定：既存 7 体の指数が v1.0.1 の `star-reeval.json` と同じ順序（engine 不変の確認）＋忠次の normal 指数と帯 → `rank` 更新（1 行）＋ `shogunateRoster.test.ts:119` の「★3」期待値更新＋ evidence `docs/evidence/shogunate-public-v1/star/`

---

## 6. hard W1（既知・CEO 承認済みの設計差）

- 内容（`SHOGUNATE_V0_6_GATE.md` W1）：hard は then 境界 60%（HP 67）・Enemy Break の崩れは 50%（HP 56）＝「✓ 止めた」と崩れが別の瞬間。easy／normal は一致（0.5）
- 公開での扱い（AI 判断）：**据え置き**。0.5 に戻すと hard の then 率が 16.8%（greedy）に落ちて分岐が死ぬ（v0.5 監査の結論・CEO 承認 2026-10-29 の根拠）。「✓ 止めた」の文言は R3 中に「あと N」で先に示すので、崩れが遅れて来ても因果は壊れない（v0.6 Gate 7b で同一フレーム確認済み）
- Human QA 1 問（§9）：hard で 1 戦、「止めたのに崩れが後から来たのが気になったか」（YES なら文言だけ 1 回調整・仕組みは変えない）

---

## 7. 権利・Credits（Kit 規約内・CEO 判断不要の部分）

- 素材：`ASSET_RIGHTS_LEDGER.md` §8 **ENEMY-KIT-01**（`enemies/tadatsugu/art.webp`・Kit FRONT 原本 `art-source/enemies/tadatsugu/`）・**STG-08**（舞台・CEO 生成 STG-02 からの非生成加工派生）。どちらも v1.0.6 bundle で既に配信中＝公開で **新規配信ファイル 0**
- Credits（`src/components/setup/creditsText.ts:27`）：現在「神と OTOMO の画像、および大耀の音声（あいさつ・ピンチ）は『SEVENGODS Games Creator Kit』の配布素材」。忠次の立ち絵は **将軍家 Kit** 由来なので、公開と同時に素材 1 行目へ「将軍家（忠次）の画像」を加える（Kit §6・§7：公式名「忠次」と role「将軍四天王」のみ公式、二つ名・技名・台詞は非公式のファン創作＝「公式」「公認」と書かない。`creditsText.ts:11` の既存方針と同じ）。v0.4 spec §残課題 5「Credits（CM-02）の『将軍家』追記」の消化
- **CEO 監修（§11）**：台詞 7 本（`enemies.ts:421-429`）・二つ名「将軍四天王・忠次」・技名「軍略・総攻め」は v0.1 から「AI 仮文・CEO 監修待ち」。Pilot 隔離の間は保留できたが、全プレイヤーに出る時点で監修が要る（IP 設定＝§6-3 #3 に隣接）

---

## 8. 更新が必要なテスト・受入スクリプト（実装時・想定）

| ファイル | いま固定しているもの | 公開後の期待値 |
|---|---|---|
| `src/core/data/shogunateRoster.test.ts:106` | `isPilotEnemyId` が enemy_08／09 の両方に真 | enemy_09 のみ真・enemy_08 は偽。`:119` の ★3 は §5 の結果へ |
| 同 `:63-101`（CORE 7 不変・seed／Daily／盤／gameVersion） | — | **不変のまま PASS が Gate の中核** |
| `src/components/setup/enemySelectNote.test.ts:29-38` | aria-label「脅威度 N / 5」の個数＝`CORE_ENEMIES.length` | 通常 roster（CORE＋SHOGUNATE）の個数 |
| `src/components/pilot/pilotFlag.test.ts` | kind `'shogunate'` の parse | kind から外す（`threat` と `all` の挙動は不変） |
| `src/core/engine/balanceSim.test.ts` | `CORE_ENEMIES` を走査 | 公開対象を走る 1 ケース追加（既存ケース不変） |
| `scripts/shogunate-pilot/acceptance.mjs`（138 項目） | 通常 URL＝7 体・印 0・案内 0／`?pilot=shogunate`＝8 体目＋印＋案内 | 通常 URL＝8 体・忠次の印は「盤外」注記 1 つ・Pilot 案内 0／`?pilot=shogunate` は通常 URL と同じ |
| `scripts/lane1-threat-branch/acceptance.mjs`（74 項目） | 通常 URL＝7 体／`?pilot=threat`＝8 体目「業斧の鬼将・軍略」 | 通常 URL＝8 体／`?pilot=threat`＝9 体目が鬼将・軍略 |
| `scripts/hardening-invalid-enemy-id/acceptance.mjs` | 不正 id の扱い | 忠次の盤面 保存→再読込 1 ケース追加 |
| `src/components/battle/enemyBreak.test.ts` source-pin | `EnemyPanel` の import 集合 | 変更しない（EnemyPanel は触らない） |

---

## 9. Gate 計画（実装後・直列・6 GB 機）

| # | 項目 | 合格条件 |
|---|---|---|
| G1 | `tsc` 0／**`npm run lint`（oxlint）exit 0**（決定286 の教訓 R5）／full vitest（≈1,660）0 fail／build | 既存 PASS と同数・JS 差分 ≤ +0.5 kB |
| G2 | CORE 不変：`coreRoster.test.ts`／`shogunateRoster.test.ts` §CORE・seed・Daily・盤・gameVersion | sha256・14 seed golden・9 日 golden・49・`1.d794038a00b5b53c` すべて不変 |
| G3 | cf2 7 敵 決定論（`integration-v1_0_6/08-cf2-core7` と同じ seed） | 8/8 一致（既存 7 体の挙動不変） |
| G-★ | §5-3 の ★ 監査（16 seed × 6 打ち筋 × 9 体） | 既存 7 体の順序が v1.0.1 と一致・忠次の ★ を実測帯で確定 |
| G4 | balanceSim 公開対象ケース（hard × 全神 × 忠次） | ≥50%（v0.5 実測 98%） |
| G5 | 受入 2 本（§8）＋忠次 probe（normal 6／hard 4・`07-probe` 基準） | 全項目 PASS・probe 基準一致（数値不変の証明） |
| G6 | 旧セーブ 44/44（S8 相当）＋忠次 盤面 保存→再読込→決着 | 44/44＋1/1 |
| G7 | a11y minimum 69 項目 | 69/69 |
| G8 | Enemy Select SP375／390／PC で 8 枚＋委ねる＝9 枚の段組・注記 1 行のはみ出し 0 | screenshot＋box 計測 |
| Human QA（CEO・iPhone・2 問） | Q1 通常導線で忠次を選んで 1 戦（normal）→ 勝利後に報酬カード・戦績・次の目標が出たか／Q2 hard で 1 戦 → 「✓ 止めた」と崩れのずれが気になったか（§6） | Q1 YES・Q2 NO |

---

## 10. 工数・リスク・Rollback

- 工数（AI）：実装 0.5 日・Gate 0.5 日（G-★ の環境複製を含む）・docs 0.25 日。CEO：監修 1 回（台詞 7 本・二つ名）＋ iPhone 2 問（≈10 分）
- Regression：**小**。既存 7 体・seed・Daily・盤・指紋・save v9 は Gate G2／G3 で不変を機械証明。変更面は Enemy Select と判定関数のみ
- 残リスク：(1) ★ が ★1〜2 に落ちたときの物語上の違和感（§5-2 (a) で受容。CEO が (b) を選ぶなら 1 サイクル延期）(2) 台詞監修で文言が大きく変わると `shogunateRoster.test.ts:144`（「公式」「公認」禁止）と台詞数 7 の期待値を同時に更新 (3) hard W1（§6・Human QA Q2）
- Rollback：Release 単位は Vercel Promote（`7494257506`＝v1.0.6）。機能単位は本件 commit の `git revert`（docs を除き 1〜2 commit）。storage に新キー・新 version を作らないので **データ面の巻き戻しは不要**

---

## 11. CEO 判断（1 件・§6-4 形式）

```
【CEO DECISION REQUIRED】
Issue：将軍家 第一陣 公開 v1（忠次 enemy_08 を通常の Enemy Select に 8 体目として並べる・v1.0.7 候補）の実装開始と、
      二つ名「将軍四天王・忠次」・技名「軍略・総攻め」・台詞 7 本（enemies.ts:421-429 の AI 仮文）の監修
AI Recommendation：承認（案 A：戦績・セーブ・報酬・神階・絆は通常どおり／Daily・49 盤・委ねる seed・gameVersion は既存 7 体のまま）。
      ★は公開前に v1.0.1 と同じ実測監査で付け直す（下がっても数値は変えない＝(a)）。台詞は現行 7 本で可なら「現行のまま」と一言で可
Reason：v0.1〜v0.6・Human QA 9 問・統合 Gate・Production Smoke まで済んだ敵が Production に入ったまま誰にも見えていない。
      runtime ≈25〜45 行・engine／rules／save／指紋 0・新規素材 0・Regression 小で Player Value が最大の 1 件
Alternatives：康政 Pilot v0.1 を先に（Pilot 隔離のままでは Player Value 0・忠次公開の答えを流用できるので後）／
      案 B Daily・盤にも入れる（gameVersion と盤 storage が動く＝別 Release で設計）／案 C ?pilot= を案内（価値が薄い）／
      ★3 のまま公開（決定281「実測」の注記が嘘になる・却下）
Risk：★ が ★1〜2 に落ちたときの「四天王」との違和感／hard W1（Human QA Q2 で確認）／台詞監修の往復
Impact if delayed：忠次・康政・将軍家 9 体の展開がすべて止まる。v1.0.7 の候補が「docs 系の束」だけになる
CEO Action：承認 / 拒否（承認時：台詞 7 本「現行のまま」or 修正指示／★ (a) 実測どおり or (b) 数値を上げて ★3）
```

---

## 12. 本書で変更していないもの

- `src/`・`public/`・`scripts/`・`package.json`・`index.html`：変更 0（git で確認可能）
- sim・probe・preview・ブラウザ：実行 0（本書の数値はすべて既存 evidence からの引用：`star-reeval.json`・`shogunate-v0_5/12-sim`・`V0_6_DESIGN_AUDIT` §2・`V1_0_6_PRODUCTION_SMOKE`）
- `docs/DECISIONS.md`：決定287（候補）の **監査完了行のみ** 追記（実装開始は CEO 返答後）
- Ranking・Neon・secrets・`.claude/settings.local.json`・既存 dirty／untracked ファイル：触れていない
