# SEVEN GODS Commercial Game Design v1.0 — RED-TEAM / REALITY-CHECK AUDIT（Decision 195）

- 日付：2026-09-18
- モード：READ-ONLY AUDIT（runtime 変更 0・tests 変更 0・既存 docs 変更 0・commit 0・push 0・deploy 0）
- 対象：Decision 194 の 3 文書（`SEVENGODS_47_LESSONS_CONSOLIDATION_AUDIT.md` / `SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md` / `SEVENGODS_NEXT_MILESTONES.md`）と実コード
- 役割：Commercial Game Director / Game Systems Auditor / Technical Director / UX・Retention Auditor / Red-Team Reviewer（AI ペルソナ統合）
- 判定区分：本書はすべて **AI判断**（CLAUDE.md §6-2）。CEO 判断が必要な事項は §26 のみ

---

## 1. Executive Verdict

**Decision 195：PASS WITH MODIFICATIONS。** v1.0 の 20 仮説のうち 8 が SUPPORTED、10 が SUPPORTED WITH MODIFICATIONS、**1 が REFUTED（H8 OTOMO 進行軸）**、1 が INSUFFICIENT EVIDENCE（H19 の一部）。

反証で見つかった v1.0 の最大の誤りは三つ。

1. **NEXT NOW の誤り。** Decision 194 は「開いた milestone を閉じる」を理由に Living Still（3.5 日）を NEXT NOW にしたが、E1 を閉じる最短手は **E1 をそのまま Release Gate に出す（0 開発日・CEO Gate）** であり、feasibility 文書自身が「Y：E1 先行＝67 点にすぐ上がる」と認めていた。Living Still は Production 流入者に 3.5 日以上「44 点の入口」を強いる代償に見合う Player Value を示せない。**開発の NEXT NOW は Solve Loop v1（敗北→同じ盤面で再挑戦）** に差し替える。
2. **「解く」は既定の道筋で証明されていない。** ふつう＝先読みなし AI で勝率 100%、むずかしい 99.3%（決定186 監査）。読む／読まないで差が出るのは神階Ⅶ（読む 93% vs 固定方策 54%）と Daily だけで、神階は「むずかしい 1 勝」が解放条件。新規プレイヤーの最初の数戦は「解く」ではなく「こなす」を体験する。しかも結果画面の N1「撃破する」→ 実際は別 Seed（`resultHub.ts:43` → `useGameEngine.ts:307`）という **文言と挙動の不一致が Production に存在する**。
3. **OTOMO は「進行軸」にできる状態にない。** OTOMO は神と 1:1（選択なし）、効果は神技発動時のみ（0.37〜1.22 回/試合）、数値は 3〜10（敵 HP 103 の 3〜10%）、守り／力の経路差は勝率・スコアとも 0（決定186 §15 Q6）。**戦略的アイデンティティが無いものに進行を積むのは儀式**であり、順序は「OTOMO strategic identity → 可視化 → 進行」でなければならない。

v1.0 で正しかったもの：North Star の中心が「解く」であること（ただし証明位置に修正）、Core Asset の維持、Daily 設計、Self→Share→Ranking の順序、Pay to Solve 禁止、広告不適合、新通貨不要、NOT BUILD の大半。

---

## 2. Current State（実測・2026-09-18）

| 項目 | 値 |
| --- | --- |
| branch / HEAD | `feat/entrance-e1` / `1cba2e6` |
| master = origin/master = Production source | `88ca430`（決定192・Vercel 自動 deploy） |
| staged / tracked modified | 0 / 0 |
| untracked | `docs/PHASE7_ENTRANCE_CINEMATIC_FEASIBILITY.md`（31,625B・未変更）、Decision 194 の 3 文書（65,475B / 6,602B / 10,282B・未変更）、`敵画像`、`scripts/phase3-audit/out/*` 43 件 |
| Decision 194 docs | 3 本とも存在確認。本監査では書き換えない |

---

## 3. Evidence Quality

| 証拠 | 品質 | 注意 |
| --- | --- | --- |
| 実コード（src/・rules.ts・hooks/） | **高** | 本書の主根拠。file:line を付す |
| 決定186 監査のシミュレーション（勝率 100%／自己ベスト更新 10〜12%／童子 0〜4%／経路差 0） | 中〜高 | AI 方策（読まない／固定）による決定論シミュレーション。人間の分布ではない |
| Phase 5-F の神階Ⅶ 数値（読む 93%・固定 54%） | 中〜高 | 同上 |
| Entrance スコア 44 → 67 → 72〜76 | **低** | すべて予測値。実測なし |
| 「CEO Human QA：first impression HOLD」 | **低（repo 未記録）** | `docs/DECISIONS.md` に決定193 の CEO QA 追記は無い（grep 0 件）。セッション記憶のみ。Decision 194 はこれを前提に NEXT NOW を決めていた |
| テスト件数 3,217 | 低 | worktree 汚染。公式値未確定 |
| Lesson 原文 | **無**（0/47） | Decision 194 の講座由来原則は「CEO 要約」由来。本書は原文を推測しない |

---

## 4. North Star Challenge

**仮説**：Primary Fun＝解く。

**反証の試み**：

| 観点 | 実コード／データ | 結論 |
| --- | --- | --- |
| 「読まなければ負ける」か | ふつう：先読みなし AI 勝率 100%・終了 HP 平均 22.6/30。むずかしい：99.3%（`rules.ts:187-191` の hard は HP/ATK +15% のみ） | **既定の道筋では No** |
| 「読めば差が出る」場所 | 神階Ⅶ：読む方策 93% vs 固定方策 54%、敗北の 89% が「死ぬラウンドに答えが無い」（PHASE5F）。Daily：+25% HP／+15% ATK | **神階と Daily では Yes** |
| 神階の到達条件 | `stakes.unlockDifficulty: 'hard'`（`rules.ts:419`）＝むずかしい 1 勝 | 新規は最低 2〜3 戦後 |
| 「解けた度」の可視化 | スコア（sd≈5%・自己ベスト更新 10〜12%）、神技評価（4/7 神のみ・未保存） | **弱い** |
| 敵の「意図」の多様性 | 7 敵中 4 体（試練・鬼・怨霊・龍神）は単調増加の `attack` のみ（`enemies.ts:69-75,107-113,139-145,250-256`）。溜め・特大・連撃を持つのは 3 体（機工師・魔獣・道化） | 「読む」が構造的に成立するのは **3/7** |
| 入口の約束文 | Home tagline「七柱の神と挑む、七日間の物語。」（`HomeScreen.tsx:130`）／初陣説明「敵は次の行動を予告します。⚔ の数字が、次に受ける攻撃です」（`firstBattle.ts`） | 入口は「物語」を、初陣は「読む」を約束＝**不一致** |

**判定：SUPPORTED WITH MODIFICATIONS。** 「解く」は SEVEN GODS の正しい中心であり、神階Ⅶ の 39pt 差がそれを裏付ける。しかし商品としての「解く」は **神階解放後にしか現れず、既定の道筋（ふつう・むずかしい）は「こなす」ゲーム** である。修正：①North Star 文は維持 ②Player Promise の証明位置を「初陣の R1」ではなく「神階／Daily」と正直に定義するか、既定の道筋に「解けた度」の可読な信号を置く（§19 の 80 Gate 不足条件）③敵意図の構造多様性 3/7 は Core Contract のため今は触らず、L 段階の「敵パターン多様化」（既存 §3-2 の保留項目）として記録。

---

## 5. Hypothesis H1–H20 Verdicts

| H | 仮説 | 判定 | Evidence（要点） |
| --- | --- | --- | --- |
| H1 | 商品価値の中心は「解く」 | **SUPPORTED WITH MODIFICATIONS** | §4。中心は正しいが、既定難易度では読まなくても 100% 勝てる。証明位置を修正 |
| H2 | Intent×7R×AP×Seed は Core Asset・維持 | **SUPPORTED** | `round.ts:66-91` 予告は決定論、`intent.ts` 単一真実、`Math.random` 0。維持。ただし敵 4/7 が単調＝Asset の活用率が低い（変更は今回しない） |
| H3 | 最大問題は新機能不足でなく感情的接続不足 | **SUPPORTED WITH MODIFICATIONS** | Return Loop（Result／49／次の目標／Home Today）については真。**OTOMO と敵は「接続」でなく「アイデンティティ（内容）」が欠けている**（§11・§12）。両方を「接続不足」と呼ぶと OTOMO 進行を先に作る誤りを生む |
| H4 | 1 Battle の理想順序 | **SUPPORTED WITH MODIFICATIONS** | 実順序は Build（神→敵→デッキ）→ Observe（R1 で初めて意図）→ Think → Insight（6-C callout）→ Resonance → Anticipate（READY lead 200ms）→ 神技 → Result → Review → Retry。敵選択画面の `typeDescription` が部分的 Observe。理想図の「Observe→Build」は実装と逆で、逆のままでよい（敵選択時に意図全文は出さない設計、決定4） |
| H5 | 敗北→事実→仮説→同条件再挑戦 | **SUPPORTED WITH MODIFICATIONS** | 事実（残 HP・敗因・「あと一歩」）は実装済み。**同条件再挑戦は Daily のみ**。通常戦は N1「${敵}を撃破する」→ `rematch` → 新 Seed。§8 で A/B/C 比較、最終 1 案 |
| H6 | 勝利→初クリア→49→OTOMO→自己記録→次の目標 | **SUPPORTED WITH MODIFICATIONS** | 各要素は存在するが `nextGoal.ts` は **1 行を選ぶ調停器**（N1〜N10）で、49 は候補に無い（P2 で DEFER）。「鎖」ではなく「1 行の優先順位」。49 のルール 1 本追加で足りる |
| H7 | 49 は first Collection axis として十分 | **SUPPORTED WITH MODIFICATIONS** | 第一軸としては十分（P2 LIVE・選択時 ✓・敵ごと k/7）。**長期軸としては不十分**：ふつう勝率 100% のため 49 は「49 回遊ぶ」に等しく、報酬は 1 行テキスト。§10 |
| H8 | OTOMO Mastery/Relationship が次の進行軸 | **REFUTED（順序として）** | 神と 1:1・効果は神技時のみ・数値 3〜10・経路差 0・童子 0〜4%。**進行の前に戦略的アイデンティティが必要**。§11 |
| H9 | OTOMO 初期進行は Power より Mastery/Relationship | **SUPPORTED WITH MODIFICATIONS** | Power inflation 拒否は正しい。ただし identity 無しでは Mastery も Relationship も空回りする（H8 と同根） |
| H10 | Daily はログイン報酬なしで「今日は何を解くか」 | **SUPPORTED** | 同日同 Seed・週替わり順（`dailyBoss.ts:69-71`）・3 回・欠席罰 0・「また明日、新しい敵が待っています」。D1 は「同じ盤面で撃破する」と正しく表現 |
| H11 | 1 Week＝49＋OTOMO＋自己比較＋Daily 変化 | **SUPPORTED WITH MODIFICATIONS** | OTOMO 進行は現状ゼロ（H8）、通常戦の自己比較は神単位のみ（`recordStorage.ts:17-36` に神×敵ベスト・前回なし）。**現実の 1 Week は 49＋Daily の 2 本足** |
| H12 | Self→Share→Ranking | **SUPPORTED WITH MODIFICATIONS** | 順序は正しい。ただし現行 Share は `?seed=` のみで敵・神・難易度を固定しない（`shareText.ts`）。「超えられる？」の条件が揃っていない＝Share を推す前に条件固定が要る |
| H13 | カード増より Build Depth | **SUPPORTED** | Build 軸の戦略重み：神（passive・専用 4 枚・共鳴）≫ 敵（構造差 3/7）＞ デッキ（条件付き 23/60）≫ OTOMO（≈0）。Build Depth の具体は **OTOMO identity と敵パターン** であってデッキ道具ではない |
| H14 | Living Hero は Presentation | **SUPPORTED** | Home に `@keyframes` 0、state 0、`src/core` 0。加えて SP LCP 5.9 秒（feasibility §9-2）は動きの前に解くべき第一印象の問題 |
| H15 | Interaction Feel は高 ROI | **SUPPORTED WITH MODIFICATIONS** | `:active` 1 件・`@media (hover)` ガード **0 件**（iOS でカード hover `translateY(-8px) scale(1.04)` が固着する既知パターン）。ROI は高いが「全ボタン沈み」ではなく §13 の分類で最小化 |
| H16 | Pay to Solve 禁止 | **SUPPORTED** | 反証なし。境界を明確化：ヒント・再挑戦・Power・Daily 回数は売らない。**新しい敵＝新しい問題の有料拡張は禁止に含めない**（§17） |
| H17 | ゲーム内広告は不適合 | **SUPPORTED** | 1 戦 3〜5 分の思考ループ・Anticipation 3 段・入口の一枚絵。中断型・報酬型のどちらも「解く」か「予告→タメ」を壊す |
| H18 | 新通貨不要 | **SUPPORTED** | 進行資産 4 軸（49・絆 pt・自己ベスト・神階）で成立。通貨は sink を要求し義務化を招く |
| H19 | KPI 3 候補 | **SUPPORTED WITH MODIFICATIONS / 一部 INSUFFICIENT EVIDENCE** | 計測 0 のため全候補が現状測定不能。Next-day Return は persistent identifier を要する。§18 で 1 本差し替え |
| H20 | Native Store／多言語／大規模 Community は premature | **SUPPORTED** | Privacy／Credits 画面 0・OG 0・Feedback 送信先 0 の状態で Store 面を作れない |

---

## 6. Player Promise

仮 Promise「敵の次の一手を読み、神とカードを組み合わせて勝ち筋を見つけろ。」

| 検証 | 結果 |
| --- | --- |
| 最初の 5 秒で証明可能か | **No（現状）**。Home は神＋今日の敵＋金の Primary（E1）だが、**敵の「次の一手」は Home に出ない**。Production（88ca430）は 699 字 tutorial が先に出る |
| Entrance→Battle は遠いか | E1：初陣 2 tap。Production：7 click。E1 未 LIVE が最大の距離 |
| God/OTOMO が抜けすぎていないか | 神は Hero・初陣・Primary に出る。OTOMO は Home に出ない（絆 n/7 chip のみ）。OTOMO を Promise に入れる根拠は現状無い（識別性 ≈0）。**Promise から OTOMO を外すのが正直** |
| unique value が伝わるか | 「敵が次の手を予告する」は SNAP／Pocket／StS にない SEVEN GODS の独自点。Home tagline「七日間の物語」はそれを言っていない |
| 誇張していないか | 「勝ち筋を見つけろ」は神階でのみ真。ふつうでは「見つけなくても勝てる」＝**軽い誇張** |

**構造の結論**：Promise は「読む→組む→決まる」の 3 動詞で正しい。証明の最短経路は **Home Today に「今日の敵の最初の予告」を 1 個出す**（display-only・`actions[0]` を読むだけ・state 0）ことで、5 秒で「予告がある」を見せられる。最終 copy は作らない。

---

## 7. 1 Battle Red Team（実コードから再構成）

| 段階 | 実装 | 評価 |
| --- | --- | --- |
| 初手まで | E1 新規：初陣→出陣する→R1 手札（2 tap＋1）。既存：神→神確定→敵→デッキ確定→R1（5 tap） | ADEQUATE（E1）／WEAK（Production） |
| Intent 理解 | R1 開始時 `ENEMY_INTENT_SET`、`EnemyPanel.tsx:128` に「⚔ n」。初陣説明で「⚔ の数字が次に受ける攻撃」 | STRONG（1 手先・単一真実） |
| AP 理解 | 「神力 cur/max」＋ゲージ、カード左上コスト、初陣説明「余った神力は持ち越せません」 | ADEQUATE |
| 神託の役割 | 3 択固定・残回数・加護は「今なら ブロック n」即時プレビュー | STRONG（読みの答えを 1 個保証） |
| Resonance feedback | 7 目盛・mid/high・「あと n で神技」・BURST 内容プレビュー常設 | STRONG |
| BURST／神技 | READY lead 200 → cut-in 900 → handoff 200 → impact 1600、hit stop 80 | STRONG |
| Win | 撃破ビート 850ms → staging 2.4s（skip 不可） | ADEQUATE（Repeat で冗長） |
| Loss | 残 HP・「あと一歩」≤10%・敗因・recap | STRONG（事実提示） |
| Result | 次の目標 1 行→Primary 1:1 | STRONG |
| Retry | 通常：新 Seed／Daily：同 Seed | **BROKEN CONNECTION（通常戦の N1 文言と挙動の不一致）** |
| Next Goal | N1〜N10・D1〜D4 | STRONG（49 のみ不在） |

「解く」が演出に埋もれているか：**埋もれていない**。むしろ逆で、演出（cut-in・hit stop）は「解けた瞬間」に正しく集中している。埋もれているのは「解けた度」の信号（スコアの意味）。

---

## 8. Loss / Retry Red Team

**追跡（通常戦）**：`resultHub.ts:43` 「同じ構成でもう一度」→ `GameFlow.tsx:405-414` `engine.startGame(同 god/deck/difficulty/enemy/stake)` → `useGameEngine.ts:307` `seed = resolveForcedSeed() ?? 'seed-'+Date.now()` → `createInitialState.ts:21,52` `createRng(seed,0).shuffle(deck)`。敵行動は `actions[round-1]`（Seed 非依存）。**つまり Seed が変えるのは山札の順序（＝手札）と報酬 3 択のみ。敵の意図は Seed に関わらず同一。**

**追跡（Daily）**：同日同 Seed・同敵・ふつう固定・神階なし。開始時に 1/3 消費。D1「同じ盤面で撃破する」。

| 案 | 内容 | 学習性 | 暗記化リスク | Core/Save/Daily |
| --- | --- | --- | --- | --- |
| A 現行（新 Seed） | 敵は同じ、手札だけ変わる | 中：敵の型は学べるが「あの手札で何をすべきだったか」は検証不能 | 無 | 変更なし |
| B 完全同 Seed | 敵も手札も同じ | 高：仮説を同じ盤面で検証できる。Daily と同じ semantics | 有：7R×20 枚は暗記可能。ただし Daily が既に同構造で 3 回、`?seed=` 共有 URL で既に任意再現可 | 変更なし（seed を引数で渡すだけ） |
| C 明示選択（同じ盤面／新しい盤面） | プレイヤーが選ぶ | 高 | 有（B と同） | 変更なし。UI に 2 ボタン |

**最終 1 案：B を「敗北・未撃破のときの Primary」に限定して採用。勝利後の再戦は現行 A のまま。** 理由：①学習が必要なのは負けたときだけ ②N1 の文言「撃破する」が真になる ③Daily と同じ意味論で新概念を増やさない ④暗記化は「勝つまで」で自然に終わる（勝てば A に戻る）⑤C は結果画面の Primary 1 個原則（P1）を壊す。記録への影響：同 Seed の勝利も 1 勝として数える（Daily と同じ）。神×敵ベスト更新の「farm」は `?seed=` で既に可能なため新たな integrity 問題を生まない。Core／Save／Daily 変更なし。実装は `startGame` に `seed` を任意引数で渡す 1 経路（既存 `resolveForcedSeed` と同じ入口）。

---

## 9. Win / Progression Red Team

追跡：勝利 → 報酬 3 択（効果 959→961→963、決定186）→ Result（recap・スコア・神技評価・絆 Lv UP・自己ベスト差・49 初クリア 1 行）→ 次の目標 1 行 → Records（神別）／MatchupBoard（Records 内）／OtomoGrowthScreen（`nextUnlockText` あり）。

「全部あるが別 UI に見える」は **部分的に真**：49 は Records の中、OTOMO は別画面、神階は GodSelect のセレクタ。ただし結果画面の 1 行と Home の chip 3 個が要約しており、P1 の「1 行原則」を崩してまで統合する根拠は無い。

初クリア演出は必要か：**Repeat の短縮の方が先**。初クリア（神×敵）は最大 49 回、Repeat は無限。勝利 staging 2.4s が skip 不可のまま初クリアに演出を足すと tempo を壊す。順序は ①staging の tap-skip ②初クリア 1 拍（≤600ms）③Repeat 短縮（同 matchup 2 勝目から）。Decision 194 の L3 内容は妥当、順序だけ明示。

なお Decision 194 が「絆の次解放は P1 で DEFER・L5 で追加」と書いた点は **誤り**：`nextGoal.ts:165-166` N8「絆称号『…』まであと N pt」が既に存在し、`otomoGrowthDisplay.ts:145` にも `nextUnlockText` がある。欠けているのは表示ではなく到達可能性（童子 0〜4%）。

---

## 10. 49 Matchup Red Team

| 観点 | 実物 | 判定 |
| --- | --- | --- |
| visibility | 敵選択 ✓・神カード k/7・Records の 7 行×7 chip・N/49 | 良 |
| denominator | 49 固定（`MATCHUP_TOTAL`） | 明確 |
| completion | 1 セル＝その神でその敵に 1 勝（難易度・神階・Daily 問わず） | **緩い**：ふつう 100% 勝率なら 49 戦で確実に埋まる |
| next target | nextGoal に 49 ルール無し | 欠 |
| reward | 1 行テキスト・報酬・通貨なし（設計） | 意図どおり |
| replay value | 神差：撃破 R が 0.74〜1.12R 変動、神技回数 0.37〜1.22/試合。敵差：0.56〜0.67R、構造差 3/7 | 神差は実在、敵差は薄い |
| visual satisfaction | 金枠 ✓ | 最小 |

「49 を埋めるために同じ攻略を 49 回」になるか：**なる可能性が高い**。神を変えれば手順は変わる（専用札・passive）が、敵 4/7 は「数字が増えるだけ」で解法が変わらない。長期軸として持たせるなら「神階 Ⅲ 以上での 49」など **段付き 49** が自然（新 state：cleared の段情報→ State Contract 必須・LATER）。今は第一軸として運用し、49→nextGoal 接続だけを L 段階で足す。

---

## 11. OTOMO Red Team

| 観点 | 実物 |
| --- | --- |
| 現在の絆 | `resonanceCount` に「試合終了時の形態」0/1/2 pt（`otomoBondStorage.ts:54,76`）。Lv＝1+floor(pt/3)、★3 は Lv5 かつ童子到達 1 回以上（`otomoGrowthDisplay.ts:79-82`） |
| 成長曲線 | 受肉態 1pt/試合が主。Lv5 に 12pt＝約 12 戦。★3 は童子必須だが童子 0〜4% → **★3 は事実上到達不能**（決定186 D5） |
| 進化 | 戦闘内：神技ごとに 1 段階。神技 0 回の試合 30〜57% |
| 報酬 | 称号・枠の発光（表示専用） |
| gameplay difference | 効果は神技時のみ。値：draw 1／gainAp 1〜2／block 3〜10／heal 3〜8／damage 4〜5／buff 2〜3（`otomo.ts:82-259`）。敵 HP 103・スコア≈960 に対し **1 試合で 0〜1 回、3〜10% 相当** |
| visibility | GodOtomoPanel に形態・BURST プレビュー、結果に Lv UP、OTOMO 画面に次解放 |
| time to milestone | ★2（Lv3）≈6 戦、★3 ≈到達不能 |
| 別 OTOMO を使う理由 | **無い**（神と 1:1。神を変えると自動で変わる） |
| 好きな OTOMO を使い続ける理由 | 神の好みと同義 |

**結論（1 案）**：Mastery/Relationship だけでは不十分だが、Power を入れる問題でもない。**先に「OTOMO の決定」を作る**。候補は「絆の経路（守り／力）を試合中の選択にする」「神技以外の発動条件（例：R4 開始時・HP 50% 以下で 1 回）を経路ごとに持たせ、Faucet も同時に増やす」など、**プレイヤーが試合中に OTOMO を理由に手を変える瞬間**が 1 つ生まれる設計。これは `src/core` と `RULES` を触る変更＝balanceSim 必須・Implementation Gate 必須。進行（称号・★）はそのままで、identity ができれば童子到達率と経路差が自動的に意味を持つ。今回は実装しない。

---

## 12. Build Depth Red Team

| 軸 | cosmetic | numeric | strategic | 評価 |
| --- | --- | --- | --- | --- |
| God | 絵・色・tagline | 共鳴効果 12〜36 dmg＋副効果、passive（蒼毘反撃・笑蓮/福永 HP 条件攻撃補正など） | 専用 4 枚＋passive で「受けの神／攻めの神」の解法が変わる（撃破 R 差 0.74〜1.12R） | **strategic（実在）** |
| Enemy | 絵・舞台・台詞 7 種 | HP・ATK 曲線 | 溜め→特大（機工師・道化）、連撃（魔獣）＝3/7 のみ読みが変わる | **3/7 strategic、4/7 numeric** |
| Deck | カード絵 | 60 枚・2 枚上限 | 条件付き 23/60（共通 16＋専用 7） | **部分的 strategic** |
| OTOMO | 3 形態の絵 | 3〜10 の単発効果 | 選択なし・経路差 0 | **cosmetic〜numeric** |

**反証成立**：「OTOMO progression より先に OTOMO strategic identity」。さらに「敵パターン多様化（4 体の単調曲線に溜め／連撃／自己回復などの型を 1 つずつ）」は既に `DECISIONS.md` §3-2 で保留済みの項目であり、Build Depth の本丸はここ。カード追加は最後。

---

## 13. Interaction Feel Red Team

再確認：`:active` 1 件（`setup.css:1569`）、`touch-action` 0、`-webkit-tap-highlight-color` 0、ボタン SE 0、**`@media (hover: hover)` 0**。カードは `<button disabled>`（`CardView.tsx`）。

| 分類 | 対象 | press feedback | 判断 |
| --- | --- | --- | --- |
| Primary | Home 金 CTA・出陣する・この神で挑む・デッキ確定・Result Primary | 沈み（2px）＋SE 1 種（木・紙系） | **必要** |
| Combat | 手札カード・ラウンド終了・神託 3 択 | カード：軽い沈み（1px・scale .99）＋既存 card-play で十分、SE 追加なし。ラウンド終了：沈み。神託：沈み | **必要（最軽）** |
| Navigation | ホームへ・戻る・戦績・OTOMO・ヘッダーアイコン | `:active` の色変化のみ | 最小 |
| Selection | 神タイル・敵タイル・難易度・神階・報酬 3 択・OTOMO 経路 | 敵タイルの既存実装（`translateY(-1px) scale(.99)`＋focus-visible）を **他 5 種に横展開** | **必要** |
| Dangerous | ConfirmDialog の「はじめから」 | 沈みなし・色のみ（誤操作抑止） | 不要 |
| Passive | chip・バッジ・進捗表示 | なし | 不要 |

- カードはボタンと同じか：**違う**。最頻操作＝最軽。hover の `translateY(-8px)` は `@media (hover: hover) and (pointer: fine)` に閉じ込める（iOS の固着 hover 対策。これは feel ではなく **不具合修正**）。
- screen shake：**不要**（hit stop・shake は戦闘の tier 設計で完結。UI 押下に shake を足すと Law 7「頻度×強度」に反する）。
- Hit Stop との競合：押下 transition は ≤80ms、hit stop は 0〜90ms。カード押下→card-play 280ms→impact の系列に 1 段足すだけで競合しない。
- iPhone Safari：`touch-action: manipulation`（ダブルタップ拡大抑止・300ms 遅延解消）、`-webkit-tap-highlight-color: transparent`、`:active` は `pointerup` で確実に解除される CSS のみ（JS state を持たない）。
- Accessibility：`focus-visible` を敵タイルと同じ規則で全 Selection/Primary に。reduced-motion では transition 時間 0・沈み量は維持。`aria-live` は別件（Feel に含めない）。

**最小 scope**：Primary＋Combat＋Selection の 3 分類、CSS のみ、SE は Primary 1 種、hover ガード 1 メディアクエリ。想定 1.5〜2 日。

---

## 14. Entrance Red Team

E1（`1cba2e6`）：Hero God ルール・金 Primary 1 個・初陣 2 tap・699 字自動 tutorial 廃止・storage write 0。

| 観点 | Living Still stage 1（CSS） |
| --- | --- |
| actual player value | 「世界に入る空気」。解く・組む・うまくなる には寄与しない。CEO の主観的 HOLD 以外に **プレイヤー側の evidence 0** |
| LCP | 不変（同じ 1 枚）。だが **SP LCP 5.9 秒**は入口の第一印象として動きより重い問題。523KB の hero を 390px 端末にも配信（`srcset` 0・`preload` 0） |
| mobile performance | headless 実測のみ（camera 60fps・粒子 59.5・光帯 blend で 55.5）。実機 0 |
| complexity | CSS/JS ≤10KB・state 0・同 DOM。低 |
| asset pipeline | 追加素材 0（stage 1） |
| 7-god scaling | +1.5 日（数値調整）。stage 2 動画は 7 柱で 4〜8MB＋外部生成＝CEO 判断 |
| rights | 既存正典画像のみ。台帳未整備は別件 |
| external service | stage 1 は 0 |
| maintenance | CSS のみ。低 |
| reduced motion | 入場を出さず静止 E1 直行（設計済み） |
| static fallback | 画像失敗 2.5s／JS 失敗＝E1 |

**問い：Living Hero は NEXT NOW として正しいか？ → No。**

- 「開いた milestone を閉じる」なら **E1 をそのまま Release Gate に出す方が速く（0 開発日）、feasibility 文書自身が Y 案「67 点にすぐ上がる」と認めている**。X 案を選んだ理由は「HOLD を残して公開する合理性が薄い」＝CEO 嗜好への配慮であり、Player Value の根拠ではない。
- HOLD 自体が `DECISIONS.md` に未記録（§3）。記録に無い判断を NEXT NOW の第一根拠にしていた。
- 未 Release E1 を放置する cost は **実在し大きい**（Production 流入者は 7 click・699 字 tutorial のまま）。だからこそ Living Still（3.5 日＋実機 QA）を E1 の前に挟むべきではない。
- Living Still の価値は否定しない。**E1 LIVE 後に、実機評価つきの独立 milestone（time-box）として行う**。CEO が「Living Still なしでは E1 を出さない」と判断した場合のみ、順序を戻す（§26 #1）。

---

## 15. Daily Red Team

| 観点 | 実物 | 判定 |
| --- | --- | --- |
| same-day shared seed | `daily-${dateKey}-${enemyId}`、Seed ID 表示「全員この値です」 | STRONG |
| 3 attempts | 開始時消費（放棄も消費）。「3 回のうち最高が今日のベスト」 | ADEQUATE（放棄消費は明示されていない） |
| JST reset | 540 分 offset・countdown は 0 回時のみ | STRONG |
| scoring | ふつう固定・+25%/+15%・神階なし・Daily 記録分離 | STRONG（神階プレイヤーには軽い） |
| boss selection | 週 Monday 起点シャッフル・7 日で 7 体 | STRONG（「今週の残り」は見せていない） |
| current UI | Home Today（敵・残回数・ベスト・countdown）、Daily 画面（共通条件・神別ベスト） | ADEQUATE |
| Return motivation | 「また明日、新しい敵が待っています」＋翌日は必ず別の敵 | ADEQUATE |

ログイン報酬なしで戻れるか：**戻れる構造はある**（毎日別の敵・同条件の自己比較）。弱点は「明日」の具体性が無いこと（敵タイプだけ予告する Tease は Seed を漏らさず可能）と、神階を解放したプレイヤーにとって Daily が緩いこと（Daily に神階を持ち込むのは Daily integrity 変更＝今回しない）。Daily Difference／Home Today は十分。FOMO なしで「明日」を作る手段：Tease 1 行（L 段階）。

---

## 16. Self / Share / Ranking Red Team

- **Self comparison の保存可能性**：Daily は `results[]` から current/previous/best を導出可（実装済）。通常戦は `GodRecord` が神単位の best/wins/losses/finished/fastestWinRound のみ（`recordStorage.ts:17-36`）。**神×敵の best と「前回」は保存されていない** → 前回比には新 state（例：`sevengods.records` v2 に `byEnemy` を追加）が必要 → State Contract を先に書く。同 Seed 再挑戦（§8）は state 不要で先に出せる。
- **Share Card は Ranking より先に価値があるか**：**条件が固定されれば Yes**。現行は `?seed=` のみで敵・神・難易度が受け手任せ（`shareText.ts`）。`?enemy=` backdoor は既にあるので URL に敵を足すのは小改修、神は URL パラメータが無い。Daily share は URL なし（同日なら自動で同条件になる設計＝正しい）。Share を推すのは「条件固定＋Web Share API」後。
- **Ranking Activation Prerequisites（dormant architecture は触らない）**：
  1. Self comparison 完成（通常戦の神×敵 best・前回）
  2. Replay integrity（`runLog`/`resume` は実装済。サーバ側検証は dormant branch に存在・未検証）
  3. Abuse prevention（ticket・rate limit・同一 Seed 再現の扱い＝同 Seed は誰でも再現できる設計なので「Daily 3 回」の消費をサーバ側で担保できるか）
  4. Privacy（匿名 identity のみ・個人情報 0・ポリシー画面）
  5. Moderation／Operations（名前表示の有無・不正スコアの取り下げ手順・一人で回せるか）
  6. Daily integrity（JST・3 回・同 Seed が不変のまま送信だけ足せるか）
  7. Player population（同日に比較対象が複数いる evidence＝計測か Feedback）
  8. **Identity の共通基盤**：Ranking・Share の本人性・将来の課金はすべて同じ匿名 identity を要する。個別に作らない

---

## 17. Commercial Direction

North Star からの「Pay to Solve 禁止」検証：解く＝敵の意図に対する答え探し。売ってはいけないもの＝答え（ヒント）・答えを試す回数（再挑戦・Daily 回数）・答えを不要にする力（Power）。売ってよいもの＝**新しい問題（敵・舞台）** と **愛着の表現（外装・支援）**。

| 選択肢 | Player Value | Trust | Impl Cost | Ops | Platform | Revenue | North Star Conflict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| buy-to-play | 中 | 高 | 高（Web 課金＋identity） | 低 | 決済規約 | 中 | 無 |
| support pack（一回買い切り・外装＋クレジット） | 低〜中 | 高 | 中（決済＋identity） | 低 | 決済規約 | 低〜中 | 無 |
| cosmetic 単品 | 低 | 高 | 中 | 中（制作継続） | 同上 | 低 | 無 |
| ads | 負 | 低 | 低 | 低 | 広告規約・プライバシー | 低（人口依存） | **有** |
| consumables | 負 | 低 | 中 | 中 | 同上 | 中 | **有（再挑戦・Power）** |
| subscription | 低 | 中 | 高 | 高 | 同上 | 中 | 無〜有（特典次第） |
| paid content expansion（新しい敵＝新しい問題） | **高** | 高 | 高（敵 1 体＝生成・復元・QA の実績あり） | 中 | 同上 | 中 | **無（解くを増やす）** |

**現時点で最も整合する direction（1 つ）**：**「無料 Web＋identity 基盤ができた後に、一回買い切りの support pack を最初の課金とし、成長した後の主力は有料の敵拡張（新しい問題）」**。理由：①決済は identity を要し、identity は Ranking／Share と共通基盤（§16 #8）＝今作るものではない ②広告・消耗品は North Star と衝突 ③敵拡張はパイプライン（ENEMY_GENA 一連）が既に資産化している。価格は決めない。CEO 判断は identity・決済サービス選定時。

---

## 18. KPI Red Team

| 候補 | actionable | measurable（現状） | privacy cost | impl cost | misleading risk |
| --- | --- | --- | --- | --- | --- |
| Visit→Battle Start | 高（入口の改善に直結） | 不可（計測 0）。ID 不要のページ／イベント計数で可能 | 最小 | 低 | 低 |
| Battle Start→Battle Finish | 高（離脱位置） | 同上・セッション内で完結 | 最小 | 低 | 低 |
| Next-day Return | 高（商用の核心） | **persistent identifier が必要**（または localStorage 由来の「初回訪問からの日数」バケットを送る＝ID なしで近似） | 中 | 中 | 中（DAU 変動に敏感） |
| Defeat→Retry rate | 高（Solve Loop の効果測定） | セッション内で完結・ID 不要 | 最小 | 低 | 低 |

**修正（最大 3）**：①Visit→Battle Start ②Battle Start→Battle Finish ③**Defeat→Retry rate**（Solve Loop の直接指標・ID 不要）。Next-day Return は「identity／計測サービスの CEO 判断が下りた時点で ③と入れ替える」保留 KPI とする。今回 persistent tracking は実装しない。

---

## 19. Commercial Ready Gate（80 相当）Red Team

仮 80 Gate の各条件は必要だが **不足がある**。追加・修正：

| 条件 | 判定 | 補足 |
| --- | --- | --- |
| Entrance で世界に入れる | 修正 | 「動く」より **SP LCP 予算（例：3 秒以内・回線制限中央値）** を先に置く。世界観の証明は Living Still ではなく「今日の敵の予告 1 個」でもよい |
| 一戦で「解く」が伝わる | 修正 | 既定難易度で「解けた度」が読める信号（スコアの言語化 or 神技評価 7 神対応）を条件に追加 |
| 敗北から学んで再挑戦 | 維持 | 同じ盤面での再挑戦（§8） |
| 勝利が 49／成長につながる | 修正 | 49 は維持。「成長」は OTOMO identity ができるまで **神階** で代替 |
| 翌日戻る理由 | 維持 | Daily |
| 自己成長が見える | 維持 | 神×敵 best＋前回（新 state） |
| PC/iPhone interaction 統一 | 修正 | 「固着・誤タップ・未反応がない」に言い換え（統一より無故障） |
| Core/Save/Daily integrity | 追加 | **破損 save で落ちない**（`otomo.defId`） |
| **追加** 法務最小 | 追加 | Privacy／Credits 表示、素材台帳の空欄 0 |
| **追加** 声の受け皿 | 追加 | Feedback の Place 1 個 |

## 20. 85 Gate Red Team

| 条件 | 判定 |
| --- | --- |
| Build diversity | 修正→「OTOMO strategic identity＋敵パターン 3/7→5/7 以上」 |
| OTOMO long-term motivation | 修正→identity 後に「★3 到達率 >50%（30 戦）」 |
| Share | 維持（条件固定＋Web Share） |
| Ranking readiness | **削除**（品質ゲートではなく運営判断。§16 の前提条件に移す） |
| Art consistency | 維持（Consistency Gate） |
| Presentation consistency | 維持（Repeat 短縮・skip） |
| Player Promise evidence | 維持（KPI ①②③の実測） |
| **追加** 内容更新の持続性 | 敵 1 体追加のリードタイムと費用が既知（ENEMY_GENA 実績から算出） |

---

## 21. Overbuild Check

| 提案 | 問題は実在？ | 既存で解ける？ | 新 state | content | ops | legal/privacy | 永続保守 | North Star |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OTOMO 進行（v1.0 L5） | 到達不能★3 は実在 | **identity なしでは解けない** | 無 | 無 | 無 | 無 | 低 | 低 → **過剰（順序違い）** |
| OTOMO identity（本書） | 実在 | 不可（core 変更） | 無（既存 pt） | 無 | 無 | 無 | 中 | **高** |
| Share 強化 | 弱い（条件不固定） | URL に敵を足すだけ | 無 | 無 | 無 | 無 | 低 | 中 |
| Ranking | 人口 evidence 0 | – | 有（identity） | 無 | **高** | **高** | 高 | 低 → 過剰 |
| Site | Face は Web 版 | – | – | 高 | 中 | 低 | 中 | 低 → 過剰 |
| Store | – | – | – | 高 | 高 | 高 | 高 | 低 → 過剰 |
| Analytics | KPI 測定不能は実在 | 不可 | 有 | 無 | 低 | **中** | 低 | 中 → CEO 判断 |
| Live Ops（Weekly 以上） | 無 | Daily で足りる | 有 | 高 | 高 | 無 | 高 | 低 → 過剰 |
| Monetization | 無（人口 0） | – | 有 | 中 | 中 | 高 | 高 | 低 → 過剰 |
| Living Still（NOW 扱い） | CEO 嗜好のみ | E1 そのまま公開で 67 | 無 | 無 | 無 | 無 | 低 | 低 → **順序過剰** |

---

## 22. NOT BUILD 再分類

| 項目 | 分類 | 備考 |
| --- | --- | --- |
| gacha | REJECT NOW | 恒久（憲法 1・2） |
| stamina | REJECT NOW | 恒久（3） |
| login streak | REJECT NOW | 恒久（P8） |
| many currencies | REJECT NOW | 恒久 |
| paid retry | REJECT NOW | 恒久 |
| paid Daily attempts | REJECT NOW | 恒久 |
| power selling | REJECT NOW | 恒久 |
| puzzle mode | REJECT NOW | 通常戦が puzzle |
| idle economy | REJECT NOW | 恒久 |
| giant story | REJECT NOW | 3 分プレイ |
| PvP now | REJECT NOW | CPU 予告前提設計。将来も「非同期 Seed 対決（Share）」で代替 |
| 200 cards now | LATER / TRIGGER | 敵パターン・OTOMO identity の後 |
| premature Discord | LATER / TRIGGER | Place は 1 個から |
| premature email | LATER / TRIGGER | – |
| premature mass localization | LATER / TRIGGER | 日本語 face 成立後 |
| premature native store | LATER / TRIGGER | §31（D194）trigger |
| whole ranking merge | REJECT NOW | 段階接続のみ |
| **匿名 identity 基盤** | **POSSIBLY NEEDED SOONER** | Share の本人性・Ranking・課金の共通前提。v1.0 は Ranking の付属物として扱っていたが、独立した基盤として順序を持つべき |
| **Feedback Place** | **POSSIBLY NEEDED SOONER** | 計測 0 の現状で唯一の「声」。外部サービス選定＝CEO |
| **paid content expansion（敵）** | LATER / TRIGGER（禁止に含めない） | v1.0 の禁止リストに無いが、明示的に「許可される将来」として記録 |

禁止リストは硬すぎないか：**硬さは適切**。ただし v1.0 は「許可される将来（敵拡張・identity・support pack）」を書いていなかったため、選択肢が見えにくかった。上 3 行で補う。

---

## 23. Revised Principles（v1.0 → v1.1 差分のみ）

- **P1 North Star First**：追記「『解く』は既定難易度では勝敗に現れない。解けた度の信号か、緊張の設計で証明する」。
- **P6 Failure Teaches, Retry Is Free**：追記「敗北後の再挑戦は同じ盤面（同 Seed）。勝利後の再戦は新しい盤面」。
- **P7 Progress Has a Destination**：追記「進行を積む前に、その軸に『決定』があること（OTOMO identity 先行）」。
- **P9 Self Before Others**：追記「Share は条件（敵・神・難易度）を固定してから推す。identity は Share／Ranking／課金の共通基盤として 1 度だけ作る」。
- **P13 Promise = Proof in 5 Seconds**：追記「入口の性能予算（LCP）は演出より先」。
- **P14 Fun Is Not For Sale**：追記「新しい問題（敵）を売ることは禁止しない」。
- 他の P2〜P5・P8・P10〜P12・P15 は変更なし。

---

## 24. Revised Roadmap（一本道・ゼロベース再評価）

| # | Milestone | v1.0 からの変更 | 理由 |
| --- | --- | --- | --- |
| **NOW** | **Solve Loop v1**：敗北・未撃破後の Primary を「同じ盤面でもう一度」（同 Seed・同構成）に。勝利後は現行。Daily 不変。文言と挙動を一致 | **新 NOW**（v1.0 は L3） | North Star 直撃・Production の文言不一致を修正・state 0・1〜2 日・可逆 |
| CEO Gate（並行・開発 0 日） | **E1 をそのまま Release Gate → Production** | v1.0 は Living Still を前置 | §14。E1 branch は Home 側、Solve Loop は Result 側で衝突が小さい。E1 が先に merge されれば Solve Loop は rebase |
| L2 | Interaction Feel v1（Primary／Combat／Selection＋hover ガード） | 同 | §13 |
| L3 | Living Still stage 1（Ebisu・time-box 3 日・実機 QA 必須） | v1.0 NOW → L3 | E1 LIVE 後の独立 milestone。CEO が不要と言えば削除 |
| L4 | Engineering Sidecar（`otomo.defId` guard・CI・docs 3 層・worktree・Rights Ledger・Share URL の条件固定・Home Today に「最初の予告」1 個） | Share URL と予告 1 個を追加 | 非 runtime 中心。並行可 |
| L5 | **OTOMO Strategic Identity**（設計＋balanceSim → Implementation Gate） | v1.0「OTOMO 絆の到達先」を置換 | §11・§12。core 変更のため Gate 必須 |
| L6 | Self Comparison v2（神×敵 best＋前回＝新 state・State Contract 先行）＋勝利 staging skip＋初クリア 1 拍＋49→nextGoal | v1.0 L3 の残りを再配置 | 新 state を伴うため Solve Loop v1 と分離 |
| L7 | Solve Legibility（既定難易度での「解けた度」信号／緊張の再設計を sim で評価） | **新規** | §4。Core Contract（難易度構造）に触れる可能性→CEO 報告つき |
| L8 | Return & Voice（Web Share＋条件固定・Feedback Place〔CEO〕・Daily Tease 1 行） | 同 | – |
| L9 | Commercial Face（OG・Privacy／Credits・KPI ①②③の計測判断〔CEO〕） | 同 | – |
| TRIGGER-A | 匿名 identity 基盤（Share 本人性／Ranking／課金の共通前提）〔CEO〕 | **新規・独立** | §16 #8 |
| TRIGGER-B | Ranking staged activation（§16 前提 1〜8 充足後） | 同 | – |
| L10 | Build Depth 拡張（敵パターン 4 体の型追加・段付き 49・カード条件）→ 有料敵拡張の検討 | 「Build Depth が遅すぎる」への回答：OTOMO identity（L5）を前倒しし、敵パターンは L10 | 敵は Core Contract（7 enemies）の内側で「型」だけ足す |

Engineering Sidecar の位置：L4 のまま（非 runtime は並行可）。ただし **`otomo.defId` guard だけは Solve Loop v1 と同じ Release に同乗させてよい**（決定191 と同型・regression 付き・1 日未満）。

---

## 25. NEXT NOW

**Solve Loop v1 — 敗北・未撃破のあと「同じ盤面でもう一度」。**

- Player Problem：負けた直後の Primary「${敵}を撃破する」を押すと **別の手札** が来る。仮説を検証できず、Daily とも意味が違う。
- Why Now：North Star 直撃（解く＝同じ意図を読み直す）／Production に文言不一致が存在／state 0・`src/core` diff 0（`startGame` の seed 引数のみ。`resolveForcedSeed` と同じ入口）／1〜2 日／CSS 削除より簡単に戻せる／E1 と衝突が小さい。
- Exact Scope：①`startGame` に任意 `seed` を渡せるようにする（既存 `?seed=` と同一経路）②Result Hub：`status` が `lost|finished` のとき Primary＝「同じ盤面でもう一度」（同 Seed・同神・同デッキ・同難易度・同敵・同神階）、Secondary に「同じ構成で次の盤面」（現行の新 Seed）③`won` は現行どおり ④Daily：不変（同 Seed・3 回・開始時消費）⑤nextGoal N1 の文言はそのまま真になる ⑥Share の seed は現行どおり。
- Existing Systems Reused：`resolveForcedSeed` 経路・`createInitialState` の決定論・`resultHub.ts`・`nextGoal.ts` N1・`battleSaveStorage` は seed を既に保持。
- New State：**なし**。Core Risk：低（引数追加）。Save Risk：0。Daily Risk：0。Ranking Risk：0。Privacy／Rights／Commercial Risk：0。
- Automated Tests：同 Seed 再戦で R1 の敵意図・初期手札・山札順が一致／勝利後は Seed が変わる／Daily 経路が `resolveDailyStart` のまま／records の勝敗が同 Seed でも 1 回ずつ加算／`?seed=` URL と再戦 Seed の整合／`entranceWiring`・`matchupWiring` 回帰。
- Human QA Question：「負けた直後に『同じ盤面』を押して、同じ手札が来たか」「もう一度考え直したくなったか」「勝ったあとに同じ盤面が来て退屈しなかったか（来ないことの確認）」。
- Exit Criteria：Implementation Gate PASS → CEO QA PASS → Release Gate → Production → 決定追記 → `CHANGELOG_PLAYER.md` 1 行。
- Expected Player Effect：敗北→再挑戦率の上昇（KPI ③の対象）。学習の閉ループが Production に初めて成立。

---

## 26. CEO Decisions（本当に必要なもののみ）

```
【CEO DECISION REQUIRED】#1
Issue：Entrance E1（1cba2e6）を Living Still なしで Production 公開するか（§6-3 #8）
AI Recommendation：公開する（Release Gate → merge → deploy）。Living Still は E1 LIVE 後の L3 で time-box 実施
Reason：Production は 7 click・699 字 tutorial のまま。E1 だけで内部評価 44→67（予測）。Living Still は Player 側 evidence が無く 3.5 日＋実機 QA を要する
Alternatives：Living Still 先行（v1.0 案）→ 流入者に数日以上 44 点の入口を強いる。却下
Risk：CEO の第一印象への懸念が未解消のまま公開される
Impact if delayed：新規訪問者の初陣到達率が低いまま
CEO Action：承認 / 拒否（拒否なら v1.0 の順序に戻し、Living Still を NOW の次に置く）
```

```
【CEO INPUT REQUIRED】#2（Decision 194 から継続・NEXT NOW を block しない）
Issue：Asset Rights Ledger の空欄（cards / enemies / backgrounds / fx / keyvisual / BGM の生成サービス・日付・規約版・商用可否）
```

identity・計測・Feedback Place・課金は **今は判断不要**。到達時に §6-4 形式で 1 案。

---

## 27. Unknowns

- 人間プレイヤーの勝率分布（sim は AI 方策）。ふつうで人間がどれだけ負けるかは未知＝L7 の前提。
- CEO の E1 HOLD の正確な内容（repo 未記録）。
- 実機 iPhone の LCP 実測（5.9 秒は回線制限中央値の headless 値）。
- 同 Seed 再挑戦が暗記化を招く割合（Daily の 3 回で既に起きているかも未計測）。
- 公式テスト数。
- 画像内の AI 文字・ロゴ。
- Vercel 側 headers／CSP。

---

## 28. Final Decision

**Decision 195：PASS WITH MODIFICATIONS**

- **NEXT NOW**：Solve Loop v1（敗北・未撃破後の「同じ盤面でもう一度」＝同 Seed。勝利後は現行。Daily 不変。state 0）
- **WHY**：North Star に直撃し、Production の文言不一致を直し、state 0・1〜2 日・可逆で、E1 と衝突しない。
- **WHAT CHANGED FROM v1.0**：①NEXT NOW を Living Still → Solve Loop v1 ②E1 は Living Still なしで Release Gate へ（CEO Gate）③Living Still は L3 の独立 milestone ④H8 REFUTED：OTOMO 進行 → OTOMO strategic identity（L5）に置換 ⑤Solve Legibility（L7）を新設 ⑥匿名 identity を Ranking から独立した TRIGGER-A に ⑦KPI ③を Next-day Return → Defeat→Retry rate ⑧Decision 194 の誤記（絆の次解放は N8 として既存）を訂正 ⑨NOT BUILD に「許可される将来」3 行を追加。
- **DO NOT START YET**：Living Still（E1 LIVE まで）・OTOMO 進行の可視化強化（identity まで）・Share 推進（条件固定まで）・Ranking・identity・課金・Store・Site・Analytics・Weekly 以上の Live Ops・§22 の REJECT NOW 全項目。
- **CEO DECISION REQUIRED**：#1 E1 の Living Still なし公開（承認／拒否）。#2 は INPUT。

---

### 完了確認

runtime change 0／tests change 0／既存 docs（Decision 194 の 3 本・feasibility doc）untouched／no commit／no push／no deploy／Ranking unchanged／Neon unchanged／secrets untouched。
