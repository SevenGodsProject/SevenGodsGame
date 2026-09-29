# SEVEN GODS × ゲーム開発講座 全47話 統合監査（Decision 194）

- 日付：2026-09-18
- モード：READ-ONLY AUDIT（runtime 変更 0・commit 0・push 0・deploy 0）
- 役割：Commercial Game Director / Game Systems Auditor / UX・Game Feel Director / Technical Director / Engineering Auditor / Publishing・Live-Ops Auditor / Commercial・Business Design Auditor（AI ペルソナ統合）
- 判定区分：本書の判断はすべて **AI判断**（CLAUDE.md §6-2）。CEO 判断が必要な事項は §37 に限定して列挙する
- 姉妹文書：`docs/SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md`（原則集）、`docs/SEVENGODS_NEXT_MILESTONES.md`（一本道ロードマップ）

---

## 0. Executive Summary

**Decision 194：PASS WITH MODIFICATIONS。**

47話を SEVEN GODS の実物と突き合わせた結論は三つに集約される。

1. **足りないのは「新しいシステム」ではなく「既存システム同士の感情的な接続」である。** 敵の意図・7R・AP・決定論 Seed・神託・共鳴・自動 BURST・7神×7敵・60枚・Daily・Result Hub・次の目標・49 攻略・OTOMO の絆・自己ベストは、すべて Production（`88ca430`）または E1 branch に実在する。47話の「Player Experience 系」原則（Lesson 5〜17）のうち、コードが**欠落**しているのは「押した瞬間の返答（Lesson 5）」と「同じ盤面での再挑戦（Lesson 7）」の二つだけで、残りは「あるが弱い／繋がっていない」に分類される。
2. **Lesson 原文は 0/47 で未提供。** リポジトリ・ローカル FS・過去セッション記録のいずれにも講座原文は存在せず、一次資料は本監査ブリーフ（CEO 提供要約）のみである。全 47 Lesson を **SOURCE PARTIAL** として扱い、要約に無い内容は想像で埋めていない（§2）。
3. **NEXT NOW は一つ：「Entrance E1 Close-out」＝ Ebisu Living Still（CSS のみ・stage 1・3.5日 time-box）を E1 に足して CEO QA → Production Release まで閉じる。** 過去仮説「E1 + Living Hero」を盲目的に継承したのではなく、Interaction Feel／同一 Seed 再挑戦と 6 基準で比較した結果（§35）、「開いている milestone を閉じる」「Lesson 34 の Launch Gate 順序（Entrance が最初）」「実測済み feasibility」「state 0・可逆」で最上位になった。Living Still が time-box 内に PASS しなくても **E1 は出す**。

NOT BUILD は §12 に 25 項目を REJECT／LATER-TRIGGER に分類した。47話を 47 機能にはしていない（AC-06）。

---

## 1. Current State（Git / Production 実物確認・2026-09-18）

| 項目 | 実測値 |
| --- | --- |
| current branch | `feat/entrance-e1` |
| HEAD | `1cba2e6c04ea65c8b160c37d716b2ad5f6fdd25c`（決定193 E1 実装） |
| master | `88ca4305aefa9c550b6316a9418efe0dee14f498`（決定192） |
| origin/master | `88ca430`（master と一致） |
| Production source commit | `88ca430`（README：Vercel GitHub 連携・master push で自動デプロイ。runtime は `838d3de` と同一コード） |
| staged | 0 |
| tracked modified | 0 |
| untracked | `docs/PHASE7_ENTRANCE_CINEMATIC_FEASIBILITY.md`（未 commit・**保護、未変更**）／`敵画像`（ローカルメモ・commit 禁止対象）／`scripts/phase3-audit/out/*` 43 件（シミュレーション出力） |
| stash | なし |
| branch 総数 | ローカル 25（うち agent worktree 5）。Ranking は `feat/daily-ranking-phase4`（`762168f`）に隔離 |
| package.json | `sevengodsgame 0.0.0`・scripts：`dev / build(tsc -b && vite build) / lint(oxlint) / preview / test(vitest run) / test:watch`。deps：phaser ^3.90 / react ^19.2.8 / react-dom。devDeps：vite ^8.2 / vitest ^4.1 / typescript ~6.0 / oxlint ^1.75。`engines` なし |
| test architecture | Vitest。`src/`+`scripts/` に 107 テスト／監査ファイル。実行結果：3217 passed / 9 skipped（**`.claude/worktrees` の古いコピー 169 件を含む汚染値**。RELEASE_STATUS.md:39 が既に非公式と明記） |
| CI / release config | `.github/` なし（CI 不在）。`vercel.json`・`_headers`・CSP・robots・manifest なし。`.vercelignore` あり。Release Gate はスクリプト（`scripts/release-audit/*`, `scripts/release-hygiene/*`）＋人手 |
| external dependencies | runtime の外部通信 0（唯一の `fetch` は同一 origin の SE wav）。解析・追跡コード 0。`.env*` の commit 履歴 0 |
| docs architecture | `docs/*.md` 55 本（約 2.1MB）。`DECISIONS.md` は 355 行だが **710KB**（1行が数 KB の表） |

過去情報の扱い：記憶にあった「Production=88ca430／E1=1cba2e6」は実測で一致した。ただし `docs/RELEASE_STATUS.md` は Production HEAD を `7f4b08a`（2026-09-06）と記載しており **stale**（§26）。

---

## 2. 47/47 Lesson Source Coverage

**探索範囲**：`docs/`（55本）、リポジトリ全文（`講座|Lesson ?N|第N話` grep）、`C:\Users\kimi1` 配下の Desktop/Documents/Downloads/OneDrive/.claude（ファイル名 `lesson|講座|第*話|ゲーム開発`）、過去セッション記録 18 本（`Lesson`/`第N話` 出現検索）。**結果：講座原文はどこにも存在しない。** 唯一の一次資料は本ブリーフ（Decision 194 指示文）に CEO が記載した Lesson 要約である。

したがって全 47 行を **SOURCE PARTIAL**（CEO 提供要約あり・原文なし）と判定する。SOURCE FOUND は 0/47、SOURCE MISSING は 0/47。要約に含まれない詳細（教材の具体例・数値根拠・演習）は本監査で扱わない。

| Lesson | 題 | Source | 出典（ブリーフ） |
| --- | --- | --- | --- |
| 01 | ゲームの核を決める | PARTIAL | §2 |
| 02 | まず動かす | PARTIAL | §2 |
| 03 | 一つずつ面白くする | PARTIAL | §2 |
| 04 | 公開して人に遊んでもらう | PARTIAL | §2 |
| 05 | 手ざわり | PARTIAL | §2（数値は reference と明記） |
| 06 | Anticipation / タメ | PARTIAL | §9 |
| 07 | Near Miss + Fast Retry | PARTIAL | §9 |
| 08 | Insight / 解く | PARTIAL | §9 |
| 09 | Collection | PARTIAL | §9 |
| 10 | Growth | PARTIAL | §9 |
| 11 | Mastery | PARTIAL | §9 |
| 12 | Build | PARTIAL | §9 |
| 13 | System Working | PARTIAL | §9 |
| 14 | Discovery | PARTIAL | §9 |
| 15 | Cliffhanger / Next Goal | PARTIAL | §9 |
| 16 | Daily Return | PARTIAL | §9 |
| 17 | Compete / Share | PARTIAL | §9 |
| 18 | Security / Rights / Privacy + Integrity | PARTIAL | §10 |
| 19 | Milestones | PARTIAL | §10 |
| 20 | State / Save | PARTIAL | §10 |
| 21 | World consistency | PARTIAL | §10 |
| 22 | Regression | PARTIAL | §10 |
| 23 | Release | PARTIAL | §10 |
| 24 | AI Handoff | PARTIAL | §10 |
| 25 | Debug Lifecycle | PARTIAL | §10 |
| 26 | Automation / CI | PARTIAL | §10 |
| 27 | Devlog becomes asset | PARTIAL | §11 |
| 28 | Canonical Still → Living Motion | PARTIAL | §11（Motion Laws 9 項） |
| 29 | One source → many channels | PARTIAL | §11 |
| 30 | Discovery / Player Promise | PARTIAL | §11 |
| 31 | Official Site | PARTIAL | §11 |
| 32 | SNS system | PARTIAL | §11 |
| 33 | Measurement | PARTIAL | §11 |
| 34 | Launch | PARTIAL | §11 |
| 35 | Team | PARTIAL | §11 |
| 36 | Model Qualification | PARTIAL | §11 |
| 37 | Monetization path | PARTIAL | §12 |
| 38 | Ads | PARTIAL | §12 |
| 39 | IAP | PARTIAL | §12 |
| 40 | Price | PARTIAL | §12 |
| 41 | Store Submission | PARTIAL | §12 |
| 42 | Store Discovery | PARTIAL | §12 |
| 43 | Law / Rules | PARTIAL | §12 |
| 44 | Economy | PARTIAL | §12 |
| 45 | Live Ops | PARTIAL | §12 |
| 46 | Community | PARTIAL | §12 |
| 47 | Business / Castle Inventory | PARTIAL | §12 |

**A. Course Source と B. Existing SEVEN GODS Interpretation の分離**：既存 docs は講座を参照していない（`PHASE6D_*`／`PHASE7_ENTRANCE_*` が参照するのは「月蝕綺譚」のティザーサイトのみ）。したがって B は本書が初めて作る解釈であり、A（要約）と B（本書の Adaptation 列）を Ledger で列分離した。ブリーフ内の「Development North Star」「Primary Fun＝解く」「Support Fun＝組む・うまくなる」も **repo 内の docs には存在しない**（grep 0 件。`PHASE3_GOD_IDENTITY_FINAL_SPEC_v0.1.md:30` の "North Star" は神個性に関する別文）。これは Lesson 1／24 の重要な gap として §5・§26 に記録する。

---

## 3. North Star / Primary Fun / Support Fun

**Development North Star（CEO 提供）**：「敵の意図を読み、神・OTOMO・カードを組み合わせて攻略の答えを見つけ、その答えが鮮やかに決まったときがうれしいカードゲーム。」

**実物との一致度**：

| 要素 | 実物 | 一致 |
| --- | --- | --- |
| 敵の意図を読む | `round.ts:66-91` が次の敵行動を確定し `ENEMY_INTENT_SET` を発行。`intent.ts:19-23` が「予告ダメージ」の単一真実。UI は `EnemyPanel.tsx:128`（文字＋絵文字、⚡溜め／🔥特大／💥強打） | ◎ 中核として実装済み |
| 神・OTOMO・カードを組み合わせる | 7神×4専用＋共通32＝60枚（`cards/index.ts`）、神 passive・共鳴効果・OTOMO 3形態×2経路（`otomo.ts:82-259`）、神階 Ⅰ〜Ⅶ | ○ 実装済みだが OTOMO の寄与が弱い（§7） |
| 答えが鮮やかに決まる | 共鳴 7/7 → 神技（BURST）cut-in 900ms → hit stop 80ms（`enemyVfxTiming.ts`）、Decision Feedback（6-C） | ○ |
| うれしい | 撃破ビート 850ms・Result Hub・自己ベスト更新表示 | △ 初クリア・49 の儀式は 1 行テキストのみ |

**一文で正体を言えるか**：言える。ただし **repo のどの文書にも書かれていない**。CLAUDE.md §1 は「七柱の神々とのカードバトラー。現在 MVP Ver 0.1」のままで、Production の実態（60枚・神階・Daily・Phase 7）と乖離している。

**新機能提案の逸脱チェック（第一 Gate「解くをもっと面白くするか」）**：Phase 7 P1/P2 は「解いた結果を見せる」で合格。E1 は「解くに辿り着く」で合格（間接）。Living Still は「解く」を直接強化しない（§35 で正直に減点）。Ranking／課金／Store は Gate 1 不合格＝後回し（§12）。

---

## 4. Lesson Ledger（47/47）

凡例：Status ＝ STRONG EXISTING / PARTIAL / MISSING-HV（MISSING / HIGH VALUE）/ LATER / REJECT / DUP-MERGE / RISK-SPEC（SPECIALIST OR CEO）。判定 ＝ Adopt / Merge / Defer / Reject。Player Value・Cost・Risk ＝ H/M/L。Timing ＝ NOW / L1〜L8（§34 ロードマップ番号）/ TRIGGER。

| # | Source Evidence | Core Principle | Problem Addressed | Current SEVEN GODS Evidence | Status | SEVEN GODS Adaptation | 判定 | PV | Cost | Risk | Timing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | ブリーフ§2 | 核を少数の言葉で定義してから仕様を積む | 仕様肥大・方向喪失 | North Star 文は repo に不在。CLAUDE.md §1 は MVP 0.1 記述のまま。DECISIONS §1 の骨格 5 決定は核と一致 | PARTIAL | North Star／Primary Fun／Support Fun／第一 Gate を Layer 1 文書 `docs/NORTH_STAR.md`（新規・短い）に固定し CLAUDE.md から参照 | Adopt（Merge→L24） | H | L | L | L4（docs sidecar） |
| 02 | §2 | Playable First：Build→Play→Notice→Describe→Improve | 設計だけ肥大 | 実装→自動 QA（acceptance.mjs）→CEO Human QA→決定追記の輪は機能中（決定187→188、189→190、191→192）。ただし E1 は CEO QA で「first impression HOLD」＝Notice/Describe 済み・Improve 未 | STRONG EXISTING | E1 の HOLD を「Improve 一手」で閉じる（NEXT NOW）。docs 1 本あたり 60KB 級が 7 本＝設計資料の肥大兆候あり、以後は仕様書に上限（§26） | Adopt | H | L | L | NOW |
| 03 | §2 | One Change → Play → Verify | 複合変更で因果不明 | P1（Result Hub 等 4 要素）・P2（49）・Hardening・E1 と 1 テーマずつ commit されている。6-A〜6-D も分割。反例：決定22 は SE＋数値＋アニメ＋ミュートを一括 | STRONG EXISTING | Milestone 定義に「変更は 1 テーマ・display-only か state 変更かを明記」を必須化（§34 形式） | Adopt | M | L | L | 恒久 |
| 04 | §2 | Preflight→Publish→Device Check→Human Play→One Feedback Improvement | 公開しないと分からない | Release Gate（hygiene 10 項・clean release・ranking/secret absence・save migration・smoke）・PC/iPhone QA・CEO Human QA は稼働。**Player Feedback Loop は未接続**（FeedbackOverlay は clipboard コピーのみ、送信先なし） | PARTIAL | Feedback の「Place」を後段（L6）で 1 個だけ用意。privacy/rights/secrets/実機の 4 点は Lesson 18/41/43 と統合して Release Gate に既存 | Adopt | H | M | M | L6 |
| 05 | §2 | 手ざわり：押した瞬間に世界が返答。frequency×intensity | 操作が空振り | `:active` ルールは repo 全体で **1 件**（`setup.css:1569` 敵選択のみ）。`touch-action`／`-webkit-tap-highlight-color` 0 件。`focus-visible` は敵選択のみ。UI ボタン SE 0。一方 Hit Stop は 4 段階（0/20/45/60ms、BURST 80、最終 90） | MISSING-HV | Interaction Laws 1・3 を採用。カード（最頻）＝軽く 1〜2px、Primary CTA＝沈み＋SE 1 種、End Round＝沈み。global `button:active` 禁止・要素別。Mobile Safari の stuck active を acceptance に | Adopt | H | L–M | M | L2 |
| 06 | §9 | 予告→タメ→開示。Repeat 短縮・Skip 可・outcome 不変 | 重要結果が薄い／繰り返しが重い | 共鳴 READY lead 200ms→cut-in 900ms→handoff 200ms→impact 1600ms（`enemyVfxTiming.ts`）＝三段構造あり。勝利 staging 約 2.4s・撃破ビート 850ms は **skip 不可**（`presentationDone` gate）。初クリア／49 は 1 行テキストのみ。outcome 不変は replayBoundary テストで保証 | PARTIAL | 勝利 staging に tap-to-skip（結果は不変）。初クリア（神×敵）は「短い 1 拍」（≤600ms、reduced で 0）。Repeat（2 回目以降の同 matchup 勝利）は staging 短縮 | Adopt | M | L | L | L3 |
| 07 | §9 | Near Miss + Fast Retry：同じ setup で即再挑戦 | 負けが学びにならない | 敗北時「あと一歩だった！」（敵 HP ≤10%）・defeat cause・recap は実装。**通常戦の「同じ構成でもう一度」は新 Seed**（`GameFlow.tsx:405-414`→`useGameEngine.ts:307`）。Daily は同日同 Seed・3 回。共有 URL は `?seed=` で同盤面再現可 | PARTIAL | 通常戦に「**同じ盤面でもう一度**（同 Seed）」を Primary に、「同じ構成（新 Seed）」を Secondary に。Daily semantics は不変（同日同 Seed・開始時 1 消費） | Adopt | H | L | L | L3 |
| 08 | §9 | Insight：必要情報を隠さない。Observe→Hypothesis→Choice→Discovery→Solution | 運ゲー化 | 敵意図・手札・AP・HP・神託 3 択（残回数・加護の即時プレビュー）・共鳴 7 目盛＋「あと n で神技」＋BURST 内容プレビュー常設（`polish.css:64-97`）。6-C Decision Feedback（BattleCallout）。Puzzle Mode なし | STRONG EXISTING | 追加しない。次ラウンド予告は現行「1 手先」で十分（決定4）。Puzzle Mode は REJECT | Adopt（維持） | H | – | – | 恒久 |
| 09 | §9 | Collection：既存 49 matchups を第一軸 | 図鑑乱造 | `sevengods.matchups` v1・49 セル・敵ごと k/7・選択時に ✓ 表示（P2 LIVE）。新図鑑なし | STRONG EXISTING | 49 を唯一の collection 軸に固定。カード図鑑・敵図鑑は作らない | Adopt（維持） | M | – | – | 恒久 |
| 10 | §9 | Growth：OTOMO Mastery / Relationship が第一候補。Power Inflation 慎重 | 成長実感なし | `sevengods.otomoBond`（表示専用・戦闘非関与、lv=points/3）。監査（決定186）：神技 0 回の試合 30〜57%、童子到達 0〜4%、guard/power 経路の差 0。Mastery は 4/7 神のみ・未保存 | PARTIAL | 新経路・新通貨なし。「絆の次解放（P1 で DEFER）」を可視化し、絆ポイントの発生条件を balanceSim で再調整。Power は据え置き | Defer→L5 | H | M | M | L5 |
| 11 | §9 | Mastery：今回／前回／BEST の事実提示 | 上達が見えない | Daily：`dailyDiff.ts` が BEST 軸＋前回軸の 2 行。通常戦：神ごと best/wins/fastestWinRound（`recordStorage.ts`）と「自己ベストまであと N」。前回比は通常戦に無し | PARTIAL | 通常戦 Result に「前回（同 matchup）→今回」1 行を追加（既存 records から導出、新 state 不要か検証） | Adopt | M | L | L | L3 |
| 12 | §9 | Build：God×OTOMO×Deck×Enemy を深く | 新 Build 系の乱造 | 神選択→敵選択→デッキ（共通＋専用・2 枚上限）→OTOMO 経路→神階。P2 で「選ぶ瞬間に k/7」表示 | STRONG EXISTING | 新 Build 系なし。Deck 多様性（Replayability 監査 68/100 の弱点）は L8 | Adopt（維持） | M | – | – | L8 |
| 13 | §9 | System Working：自分の仕組みが働いた感覚 | 自動発動が他人事 | 共鳴ゲージ→自動 BURST→神効果→OTOMO 効果→進化 banner。「あと n で神技」で予告。Idle economy なし | STRONG EXISTING | 維持。Interaction Law 3（重要な成功に視覚・音・時間）は既存 | Adopt（維持） | M | – | – | 恒久 |
| 14 | §9 | Discovery：少数の optional secret。Power/Ranking/Daily に影響させない | 秘密の乱造 | `?seed=`／`?enemy=` は開発用 backdoor（Daily は無視）。プレイヤー向け secret は 0 | LATER | 作らない。将来入れるなら「神の一言」程度の非 power 要素 | Defer | L | L | L | L8 |
| 15 | §9 | Cliffhanger / Next Goal | 終わったら帰る | `nextGoal.ts` 14 ルール（N1〜N10・D1〜D4）→Primary CTA 1:1。Home Today・49・絆 n/7 chip | STRONG EXISTING | P2 が DEFER した「49 を nextGoal に接続」は L3 で再評価 | Adopt（維持） | H | – | – | L3 |
| 16 | §9 | Daily Return：既存 Daily。login streak／欠席罰なし | 義務化 | Daily：JST 固定・週 Monday 起点シャッフル・同日同敵同 Seed・3 回/日（開始時消費）・記録は Daily 専用・30 日保持。streak・罰 0 | STRONG EXISTING | 維持。「休んでも損しない」は既に成立 | Adopt（維持） | H | – | – | 恒久 |
| 17 | §9 | Self→Share→Others→Ranking の順 | 早すぎる競争 | Self：BEST／前回（Daily）。Share：clipboard のみ（Web Share API なし、Daily は URL なし）。Others：なし。Ranking：dormant（`submissionEnabled:false`） | PARTIAL | 順序を固定。Share は Web Share API（実装 1 関数・state 0）を L6。Ranking は Daily 常連の evidence が出てから（TRIGGER） | Adopt | M | L | L | L6→TRIGGER |
| 18 | §10 | Security / Rights / Privacy + Integrity | 公開事故 | Secrets：`.env` 履歴 0・鍵 0・外部通信 0・tracking 0。Rights：SGG Kit 42 画像は manifest＋sha256 で追跡、**cards/enemies/backgrounds/fx/keyvisual/bgm は台帳なし**。Privacy：個人情報収集 0・ポリシー画面なし。Integrity：Seed 決定論・Daily 分離・replayBoundary テスト | PARTIAL | Asset Rights Ledger（§21）を docs に新設。法的認定はしない | Adopt | M | M | M（法務） | L4 + CEO INPUT |
| 19 | §10 | One playable milestone | 巨大化 | Phase 7 は P1→P2→Hardening→E1 と 1 本ずつ。E1 が未 LIVE のまま次へ進もうとしている点だけが逸脱候補 | STRONG EXISTING | 「開いた milestone は閉じてから次」を原則化（NEXT NOW の根拠） | Adopt | H | – | – | NOW |
| 20 | §10 | State Contract 8 項目。Presentation は state を作らない | 壊れるセーブ | 11 キー（§18）。battleSave は v3→v9 の完全 migration 鎖。**他 9 キーは migration なし（version 不一致＝初期化）**。`deckPreference` は `RULES.saveVersion` に連動し bump のたび破棄。**`otomo.defId` 未防御**（`GodOtomoPanel.tsx:67` 等で throw）。E1・P1・P2 は storage write 0 | PARTIAL | State Contract 表を正典化（§18）。`otomo.defId` guard（enemyId と同型）・deckPreference の版方針を L4 で修正 | Adopt | M | L | L | L4 |
| 21 | §10 | World consistency：和神・神秘・躍動／藍黒・白・金＋神色 | 寄せ集め感 | 実測パレット：背景 `#04050f→#080a1c`、金 `#ffd166`、文字 `#e8e9f3`、神色 7 種（`godStyle.ts:185-193` 単一真実）。フォントはシステム（Web font 0）。**CSS カラートークン 0（:root に色変数なし、hex が 11k 行に直書き）** | PARTIAL | World Language を正式採用（§16）。トークン化は L4 の「非 runtime 変更」ではないため L8（見た目不変のリファクタ） | Adopt | M | M | L | L8 |
| 22 | §10 | Regression：Human Smoke + Automated | 直したら壊れる | 107 テストファイル・phase 別 acceptance.mjs・release-hygiene スクリプト。Human Smoke 表は RELEASE_STATUS（stale）。CI なし | PARTIAL | CI（PR で tsc/oxlint/vitest）を L4。worktree 汚染除去で公式テスト数を回復 | Adopt | M | L | L | L4 |
| 23 | §10 | Release 10 段階 | 手順抜け | 実態：実装→Implementation Gate→CEO QA→Release Gate→merge→push（=Vercel deploy）→Production QA→決定追記。**Player Release Note と Next 3 が欠落** | PARTIAL | `docs/CHANGELOG_PLAYER.md`（Canonical Story 形式）を Release の必須成果物に | Adopt | M | L | L | NOW から |
| 24 | §10 | AI Handoff 3 層 | 引継ぎ肥大 | Layer 1＝CLAUDE.md（134 行・9KB、§6 policy は良好、§1・§4 は stale）。Layer 2＝DECISIONS §4 の 5 不変ルールのみ。Layer 3＝phase docs 50 本＋DECISIONS 変更履歴 710KB | PARTIAL | 本監査の姉妹文書 `SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md` を Layer 2 に。Layer 1 に North Star を追加。DECISIONS の分割は L4（非破壊：新ファイルに移し原本は残す） | Adopt | M | L | L | L4 |
| 25 | §10 | Debug Lifecycle 8 段階 | 当て推量修正 | 決定191（未知 enemyId）は Reproduce→Root Cause→Fix→Regression（`enemyIdResilience.test.ts`）→Learn（同型 `otomo.defId` を out of scope と明記）の形 | STRONG EXISTING | 正式手順化（§23）。NOT REPRODUCED の guess fix 禁止を明文化 | Adopt | M | L | L | 恒久 |
| 26 | §10 | Automation / CI。Production GO は CEO | 手動抜け | CI 0。master push＝自動 deploy＝「push が Production GO」。Release Gate はスクリプトだが人が起動 | PARTIAL | GitHub Actions 1 本（PR：tsc/oxlint/vitest）。自動 deploy は維持しつつ「master push は CEO GO 後のみ」を Layer 1 に明記 | Adopt | L（間接） | L | L | L4 |
| 27 | §11 | Devlog→Content Bank→選抜公開 | 資産にならない記録 | 決定 1〜193・phase docs は内部 devlog として極めて厚い。公開向け抽出 0 | LATER | Canonical Story 形式（§27）で決定ごとに 5 行を残す運用から始める。公開は L7 | Defer | L | L | L | L7 |
| 28 | §11 | Canonical Still → 許可した動きだけ | 別の絵になる | Home に `@keyframes` 0（背景の星・魔法陣のみ、reduced で停止）。feasibility doc（未 commit）が Motion Laws と整合する stage 1 を実測済み（camera 60fps、blend 禁止、≤4 layer、state 0、同 DOM 同画像） | MISSING-HV | Motion Laws 9 項＋feasibility 由来 5 項を正式採用（§17）。Ebisu のみ・stage 1 | Adopt | M | M（3.5 日） | M（実機） | NOW |
| 29 | §11 | One source → many channels。Canonical Story 5 項 | 発信が散る | 決定追記は Problem/Change/Why/Verification/Result を事実上含むが形式化なし | PARTIAL | §27 の 5 項テンプレを CHANGELOG_PLAYER と決定追記に共用 | Adopt | L | L | L | NOW から |
| 30 | §11 | Player Promise ≠ North Star。5 秒で証明 | 約束と画面の乖離 | E1：神と今日の敵が向き合う構図・金の Primary 1 個・初陣 2 tap。Production（88ca430）は 7 click・699 字 tutorial 自動表示＝5 秒証明不成立 | PARTIAL | §28 の Promise–Proof 定義。E1 LIVE が前提 | Adopt | H | – | – | NOW |
| 31 | §11 | Official Site：Face→Guide→membership は正当化後 | 早すぎる会員制 | 公式サイトなし。Production URL がそのまま Face。README は開発者向け | LATER | Web 版自体を Face とし、別サイトは Store 判断と同時（L7）。email backend なし | Defer | L | M | L | L7 |
| 32 | §11 | SNS system：Voice Canon・Tone Gate・Fact Gate | 誇大・誤報 | SNS 運用なし。「Dormant を Live と言わない」ルールは Ranking で既に厳守 | LATER | L7。Fact Gate は「LIVE 決定番号を引用できる事実のみ」と定義（§27） | Defer | L | L | L | L7 |
| 33 | §11 | Executive KPI ≤3。Privacy minimal | 測れない／測りすぎ | 計測 0。persistent identifier 0。KPI 3 候補は現状どれも測れない | LATER | 今は入れない。導入は外部サービス選定＝CEO 判断（§6-3 #6/#7）。それまで CEO Human QA と Feedback Window を「数字の代わりの証拠」に | Defer→TRIGGER | M | M | M（privacy） | TRIGGER（商用前） |
| 34 | §11 | Launch Gate first：Entrance→One Battle→Another→Tomorrow→Safety | 日付先行 | Entrance：E1 で改善・未 LIVE。One Battle：初陣 2 tap。Another：Result Hub。Tomorrow：Daily。Safety：Gate 稼働 | PARTIAL | Launch Gate の 5 項を §21 に統合。順序どおり Entrance を先に閉じる | Adopt | H | – | – | NOW |
| 35 | §11 | Team：onboarding・least privilege・受入基準・権利金銭の明文化 | 人が増えて壊れる | 一人＋AI。worktree の `settings.local.json` に `curl *`・`powershell.exe *` 等の広い allow（ローカル・非 commit） | LATER | 採用なし。AI エージェントへの least privilege として広い wildcard を将来整理（非 runtime） | Defer | L | L | L | L4（任意） |
| 36 | §11 | Model 名を Architecture にしない。Role＋受入基準 | モデル依存 | CLAUDE.md はペルソナ（Role）で定義。モデル routing は口頭 provisional | PARTIAL | §33 に Role×Acceptance Criteria 表。モデル名は「現在の割当」欄に隔離 | Adopt | – | L | L | L4 |
| 37 | §12 | Monetization：Main 1 + Support 1。「解く」を売らない | 面白さの切り売り | 課金 0・広告 0・通貨 0 | LATER | Commercial Constitution 9 条（§30）を先に固定。モデル決定は TRIGGER | Defer | – | – | – | TRIGGER |
| 38 | §12 | Ads：NO IN-GAME ADS が第一候補 | 没入破壊 | 広告 0 | REJECT（現方針） | 「ゲーム内広告なし」を憲法条文に | Reject（広告） | – | – | – | 恒久 |
| 39 | §12 | IAP：non-consumable cosmetic/support のみ | Power 販売 | IAP 0 | LATER | 将来候補は「神の外装・支援」のみ。Power 販売禁止条文 | Defer | – | – | – | TRIGGER |
| 40 | §12 | Model→Shelf→Price | 価格先行 | – | LATER | 価格は決めない | Defer | – | – | – | TRIGGER |
| 41 | §12 | Store Submission = 公開検査基準。Store Ready ≠ Launch Ready | 早すぎる native 化 | Web（Vercel）。PWA manifest・SW なし。native 化 0 | LATER | native 化は TRIGGER（§32）。Store Compliance Gate は再利用可能チェックリストとして L7 で作成 | Defer | L | H | M | TRIGGER |
| 42 | §12 | Store face：5 秒ポスター。日本語→英語→根拠拡張 | 誇大・多言語先行 | OG/meta description 0（`index.html` 12 行）。多言語 0（日本語直書き） | LATER | まず Web の OG 画像＋1 行説明（L7）。英語化は evidence 後 | Defer | L | L | L | L7 |
| 43 | §12 | Four Cliffs（Money/People/Assets/Platform）＋Integrity。AI は論点整理のみ | 法的事故 | Assets：未台帳素材あり。Platform：Vercel 規約内。Money/People：該当なし | RISK-SPEC | §21 の Rights Ledger と §37 CEO INPUT。法的結論は出さない | Adopt（論点のみ） | – | – | M | L4 + Specialist |
| 44 | §12 | Economy：Faucet+Sink。新通貨前提禁止。変更はシミュレーション | 通貨乱造 | 通貨 0。進行資産＝49・絆 pt・自己ベスト・神階 | STRONG EXISTING（無通貨） | Economy Laws を「進行資産」に適用（§31）。絆 pt の Faucet 再調整のみ L5 でシミュレーション必須 | Adopt | M | – | – | L5 |
| 45 | §12 | Live Ops：一人で続く量。Daily が心臓。休んでも損なし | 運営疲弊 | Daily は決定論で自動（人手 0）。Weekly/Monthly/Seasonal 0 | STRONG EXISTING | 追加しない。Weekly 以上は「必要性の evidence」条件付き（§32） | Adopt（維持） | M | – | – | 恒久 |
| 46 | §12 | Community：Window→Place→Participation。声は証拠 | 早すぎる Discord | Window：FeedbackOverlay（clipboard）。Place：なし | PARTIAL | Place を 1 個（送信先）。Discord なし。外部サービス選定は CEO | Adopt | M | L | L | L6 + CEO |
| 47 | §12 | Castle Inventory：Traffic×Retention×Conversion×ARPU。今は Player Experience 先 | 資産の見落とし | §33 に棚卸し。数値は測定不能 | PARTIAL | Revenue Tree は評価せず、Business Assets 4 分類のみ確定 | Adopt | – | – | – | L7 |

**Cross-Lesson Principle への統合**（47 → 15）は `docs/SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md`。対応表：01/30/34→P1・P13、08/13→P2、02/03/19→P3、05→P4、06→P5、07/16→P6、09/10/11/12/15/44→P7、16/45→P8、17→P9、20/22/25→P10、18/23/26→P11、21/27/28/29/32/42→P12、31/33/46→P13、37/38/39/40/47→P14、35/36/43/45/47→P15。14 は P7 に吸収。

---

## 5. Current Strengths（Already Strong）

1. **決定論エンジンと Integrity**：`Math.random` 0、mulberry32＋cursor、replay/resume、`replayBoundary.test.ts` が `src/core` の storage／network 不使用を機械的に保証。
2. **敵の意図が単一真実**：`intent.ts` の予告ダメージを UI・カードボーナス・加護が共用。North Star の「読む」を支える。
3. **Daily の設計**：JST 固定・週シャッフル・同日同 Seed・3 回・Daily 記録の分離・30 日保持・当日外セーブの破棄。Live Ops の心臓が無人で動く。
4. **Return Loop P1/P2 が LIVE**：次の目標 14 ルール→Primary 1:1、Home Today、Daily 差分、49 攻略（選択時 ✓）。
5. **Combat Feel の骨格**：4 段階 hit stop、HP ghost、tier 別 shake（±2〜11px）、共鳴 cut-in 三段、reduced-motion 9 ブロック＋JS gate。
6. **Save の中核が守られている**：battleSave v3→v9 の migration 鎖、全 storage の try/catch、未知 enemyId 防御（決定191）、matchups の future-version 読み取り専用。
7. **Release Gate の実在**：hygiene 10 項・clean release・Ranking Absence 17/17・Secret Audit・Save Migration・Deploy Timing（gameVersion bump は JST 00:00）。
8. **Ranking Firewall**：作業ツリーに api/server 0、`RULES.ranking.submissionEnabled=false`、Neon 依存 0、`.env` 履歴 0。Dormant branch は隔離。
9. **Privacy by default**：外部通信 0・tracking 0・persistent identifier 0。
10. **意思決定の監査可能性**：決定 1〜193 が理由付きで残り、AI 判断／CEO 判断が区別されている。

---

## 6. Largest Gaps（Missing and High Value）

| # | Gap | 証拠 | Lesson | 対応 |
| --- | --- | --- | --- | --- |
| G1 | **押した瞬間の返答がない** | `:active` 1 件のみ、tap-highlight 0、button SE 0 | 05 | L2 Interaction Feel v1 |
| G2 | **通常戦で「同じ盤面」を再挑戦できない** | retry は新 Seed（`useGameEngine.ts:307`） | 07 | L3 |
| G3 | **入口が静止画で、Production ではまだ 7 click** | E1 未 LIVE・Home `@keyframes` 0 | 28/30/34 | NOW |
| G4 | **OTOMO の成長が事実上起きない** | 童子 0〜4%・経路差 0（決定186） | 10 | L5 |
| G5 | **North Star が repo に無い／Layer 1 が stale** | grep 0・CLAUDE.md §1「MVP 0.1」 | 01/24 | L4 docs |
| G6 | **重要結果の「タメ→開示」が skip 不可・初クリアが 1 行** | `presentationDone` gate・`matchupCelebration.ts:13` | 06 | L3 |
| G7 | **`otomo.defId` 未防御・9 キーに migration なし** | `GodOtomoPanel.tsx:67`、`deckPreferenceStorage.ts:56` | 20 | L4 |
| G8 | **素材権利台帳の未カバー** | cards/enemies/backgrounds/fx/keyvisual/bgm | 18/43 | L4 + CEO INPUT |
| G9 | **CI 不在・master push＝deploy** | `.github/` なし | 26 | L4 |
| G10 | **Feedback の送信先がない** | clipboard のみ | 04/46 | L6 + CEO |

---

## 7. Existing-but-Disconnected Systems

「新機能不足」ではなく「繋がっていない」もの。優先して接続する。

| 既存システム | 繋がっていない先 | 接続案（state 追加なし） |
| --- | --- | --- |
| `?seed=` 共有 URL（同盤面再現） | 敗北直後の再挑戦 | 「同じ盤面でもう一度」＝現在の seed を `startGame` に渡すだけ |
| 49 攻略（P2） | 次の目標（P2 で DEFER） | nextGoal に「この敵をあと k 神」ルールを 1 本追加（L3 で再評価） |
| 絆 pt（表示専用） | 到達先（P1 で「次解放」DEFER） | 次称号までの残 pt を Result／OTOMO 画面に 1 行 |
| 神ごと records（best/fastestWinRound） | 通常戦の「前回→今回」 | Result に同 matchup の前回比 1 行 |
| 共鳴 cut-in の三段構造 | 勝利・初クリアの儀式 | 同じ timeline 定数を流用し初クリア 1 拍 |
| Hit Stop の tier 設計 | UI ボタン | frequency×intensity 表を作り、押下は tier 0（沈むだけ） |
| E1 の Hero God ルール | Living Still | 同 DOM・同画像に transform/opacity だけ足す（feasibility 済み） |
| FeedbackOverlay の snapshot | 送信先 | Place を 1 個決める（CEO：外部サービス） |
| 決定追記の Problem/Change/Why | Player Release Note | 同じ 5 項を平易文で `CHANGELOG_PLAYER.md` に |

---

## 8. Overbuild Risks（講座に引っ張られる方向）

- Lesson 9/14 → 図鑑・秘密の乱造。**49 以外の collection 軸は作らない。**
- Lesson 10/44 → 新通貨・OTOMO 育成 RPG 化。**絆 pt の可視化と Faucet 調整のみ。**
- Lesson 17 → Ranking 前倒し。**Daily 常連の evidence が出るまで dormant。**
- Lesson 27〜32 → 公式サイト・SNS・Devlog 体制の先行構築。**Web 版が Face。L7。**
- Lesson 33 → 計測基盤先行。**外部サービス＝CEO 判断。今は入れない。**
- Lesson 41/42 → native Store 化。**TRIGGER 条件（§32）まで着手しない。**
- Lesson 28 → 動画化・7 神展開。**Ebisu・CSS・stage 1 のみ。**
- 設計資料の肥大（60KB 級 7 本）。**仕様書は「Player Problem→Exact Scope→AC」の §34 形式に圧縮。**

---

## 9. 1 BATTLE（実物対応）

| 段階 | 実物 | 状態 |
| --- | --- | --- |
| Enter | E1：初陣 2 tap／続き 1 tap／Daily 4 tap／通常 5 tap。Production は 7 click | E1 未 LIVE |
| Observe | 敵意図（文字＋絵文字・tier 色・溜めは呼吸グロー）、Boss entrance 1.5s | ○ |
| Build | 神→敵→デッキ→OTOMO 経路→神階。選択時に ✓／k/7 | ○ |
| Solve | 手札 5＋2 draw・AP 2→8・神託 3 択・カード条件ボーナス（5-A） | ○ |
| Insight | Decision Feedback callout（6-C）、加護プレビュー | ○ |
| Resonance | 7 目盛・mid/high 段階・「あと n で神技」・BURST プレビュー | ○ |
| Anticipate | READY lead 200ms → cut-in 900ms | ○ |
| Impact | hit stop 80ms・burst-flash・shake L4 ±11px | ○ |
| Result | 撃破ビート 850ms → Result Hub（次の目標 1 行→Primary） | ○（skip 不可） |
| Review | recap・defeat cause・神技評価・自己ベスト差 | ○ |
| Retry/Next | 「同じ構成」＝新 Seed／Daily＝同 Seed | △（G2） |

## 10. 1 DAY

| 段階 | 実物 | 状態 |
| --- | --- | --- |
| Return | Home Today：今日の敵・残 N/3・今日のベスト | ○ |
| Today Trial | 神域挑戦（+25% HP／+15% ATK・ふつう固定） | ○ |
| Battle | 同上 | ○ |
| Progress | BEST 軸＋前回軸の 2 行 | ○ |
| Next Goal | D1〜D4 | ○ |
| Optional second battle | 残回数表示・0 回で Primary が「ホームへ」に | ○ |
| Leave without penalty | streak 0・罰 0・カウントダウンは 0 回時のみ | ○ |

## 11. 1 WEEK

| 段階 | 実物 | 状態 |
| --- | --- | --- |
| Multiple battles | 通常戦は無制限 | ○ |
| 49 progression | 敵ごと k/7・N/49・神 7/7・49/49 の 1 行祝福 | ○（儀式が薄い） |
| OTOMO mastery | 絆 lv（表示専用）・童子到達 0〜4% | △（G4） |
| Self comparison | Daily 2 軸・通常戦 BEST のみ | △ |
| Daily variation | 週ごとに敵順が変わる（Monday 起点） | ○ |
| Meaningful milestone | 神階 Ⅶ・49/49・絆 7/7 | ○ |
| Optional share | clipboard のみ | △ |

---

## 12. NOT BUILD

| 項目 | 分類 | 理由 |
| --- | --- | --- |
| new gacha | REJECT | 「解く」と無関係・運の販売 |
| paid random rewards | REJECT | 同上 |
| login streak | REJECT | Lesson 16「休んでも損しない」に反する |
| stamina | REJECT | 再挑戦を売ることになる |
| idle economy | REJECT | System Working は共鳴で既に成立 |
| giant story mode | REJECT | 3 分プレイの核を壊す |
| separate puzzle mode | REJECT | 通常戦が既に puzzle |
| many secret collectibles | REJECT | 49 が唯一の collection 軸 |
| new 3×5 build system | REJECT | 既存 God×OTOMO×Deck×Enemy を深くする |
| PvP now | REJECT（現段階） | 敵意図の読み合いは CPU 前提設計（決定4） |
| 200+ cards now | LATER / TRIGGER | 60 枚の条件・シナジー深化が先（Replayability 監査） |
| five currencies | REJECT | 無通貨で進行資産が成立している |
| artificial waiting | REJECT | Daily の 3 回制限以外の待ちを作らない |
| paid retry | REJECT | 憲法 3 条 |
| paid Daily attempts | REJECT | Daily integrity・憲法 3 条 |
| power-selling OTOMO | REJECT | 憲法 4 条 |
| premature email membership | LATER / TRIGGER | Web 版が Face。会員制の必要性が出てから |
| premature Discord | LATER / TRIGGER | Feedback Window→Place の順。Place は 1 個から |
| premature recruitment | LATER / TRIGGER | 一人＋AI で回る量に設計 |
| premature 3-month Live Ops | REJECT | Daily 自動が心臓。Weekly 以上は evidence 条件 |
| premature native Store conversion | LATER / TRIGGER | §32 の trigger（Web で Next-day Return の evidence 等） |
| premature persistent analytics | LATER / TRIGGER | privacy 最小。外部サービス＝CEO |
| premature mass localization | LATER / TRIGGER | 日本語の Store face が強くなってから |
| whole ranking branch merge | REJECT | Firewall。段階接続のみ |
| video Living Hero（7 神・stage 2） | LATER / TRIGGER | stage 1 CSS の CEO 実機評価後 |

---

## 13. SEVEN GODS FEEL SYSTEM（正式採用）

Touch → Think → Insight → Anticipate → Hit → Result → Review → Retry。

実物との対応：Touch（**欠落**）→ Think（敵意図・手札・神託）→ Insight（Decision Feedback）→ Anticipate（READY lead・cut-in）→ Hit（hit stop・shake・FloatingNumbers）→ Result（撃破ビート・Result Hub）→ Review（recap・defeat cause）→ Retry（Daily 同 Seed／通常は新 Seed）。

## 14. Interaction Laws（実コードから判定）

| # | Law | 判定 | 根拠 |
| --- | --- | --- | --- |
| 1 | 押せるものは沈む | **採用・未実装** | `:active` 1 件。要素別に実装し global `button:active` は禁止。カードは最頻＝最軽（1〜2px）、Primary CTA＝沈み＋SE、End Round＝沈み |
| 2 | 強い一撃ほど時間が重くなる | 採用・実装済み | HIT_STOP_MS L1 0 / L2 20 / L3 45 / L4 60、BURST 80、最終 90、自傷 40（tier≥3） |
| 3 | 重要な成功には視覚・音・時間で返答 | 採用・実装済み | 共鳴 cut-in・burst-flash・OTOMO 進化 banner・SE 20 種 |
| 4 | 重要な結果は予告→タメ→開示 | 採用・部分 | 共鳴は三段。勝利 staging はあるが初クリア／49 は 1 行 |
| 5 | Repeat は短く（skip 可） | **採用・未実装** | 勝利 staging 2.4s が skip 不可 |
| 6 | Presentation は outcome を変えない | 採用・実装済み | `src/core` 純粋・replayBoundary テスト・timeline は表示専用 |
| 7 | 頻度×強度：頻繁な操作ほど軽く | 採用（Law 1 の補則） | ボタン SE は Primary のみ。カード押下に SE を足さない（card-play SE が既にある） |

追加の実装制約（L2 で acceptance に）：Mobile Safari の stuck `:active`（`touch-action: manipulation`＋`-webkit-tap-highlight-color: transparent`＋pointer cancel）、`focus-visible` の可視化、reduced-motion では transform を 0 にせず時間だけ 0（沈みは残す）。

## 15. Motion Laws（Lesson 28 ＋ feasibility 実測から確定）

1. 正典の一枚を描き直さない（同一画像ファイル・同一 DOM）
2. 動きは whitelist のみ：水面の微動・夕陽の反射／揺らぎ・髪先・衣の端（＋feasibility の camera pull-back 1.12→1.0・光帯・微粒子 2 層）
3. camera drift／zoom／pan は「入場の 1 回の pull-back」以外禁止
4. 不要な particles 禁止（≤2 層）
5. 常に正典 source（`keyvisual-hero.webp`）から派生
6. 低解像度候補で試し、勝者だけ仕上げる
7. 人の seam test ×3（入場→Home で「別の絵」に見えないこと。CLS 0・最終レイアウト E1 と byte 一致）
8. AI 文字・ロゴを載せない
9. 固定：顔・表情・体・ポーズ・大魚・竿・建物・門・構図・カメラ
10. `mix-blend-mode` 禁止（実測の主コスト）、transform/opacity のみ、同時アニメ層 ≤4、`visibilitychange` で停止
11. `prefers-reduced-motion: reduce` では入場演出を出さない（E1 静止 Home 直行）
12. 追加転送 ≤10KB・新画像 0・LCP 不変・state 0

---

## 16. World Language

**和神・神秘・躍動**を正式採用。実測パレット（藍黒 `#04050f→#080a1c→#050510`／白 `#e8e9f3`／金 `#ffd166`／神色 7）は候補と一致。Consistency Gate：「この要素だけ別ゲームから来たように見えないか」を Human QA 質問に固定。既知の不一致候補：絵文字ベースの敵意図表示（⚡🔥💥）は和神世界観から浮く可能性あり。ただし可読性のため現状維持、L8 で glyph 化を検討。Audio：木・紙・鈴・低い衝撃・空気・残響の候補は SE 20 種（自作合成）と BGM 4 曲（Suno 生成・`docs/bgm-prompts.md`）を監査した限り方向は一致。ボタン SE を足す場合は「木・紙」系 1 種に限定。

---

## 17. Engineering Constitution（統合評価）

| 条 | 実物 | 判定 |
| --- | --- | --- |
| A North Star before feature | North Star 文が repo 不在 | 文書化が必要（L4） |
| B One milestone at a time | 概ね遵守。E1 が開いたまま | NOW で閉じる |
| C State Contract before persistence | battleSave は良。他キーは version のみで migration なし | §18 を正典化 |
| D Reproduce before fix | 決定191 で実践 | 明文化 |
| E Regression after bug | `enemyIdResilience.test.ts` 等 | 遵守 |
| F Human QA separate | Implementation Gate → CEO QA の 2 段 | 遵守 |
| G Production GO = CEO | CLAUDE.md §6-3 #8 | 遵守（push＝deploy の構造は注記） |
| H Do Not Break | §6 契約はすべて実物で確認 | 遵守 |
| I No secrets | `.env` 履歴 0・鍵 0 | 遵守 |
| J Ranking firewall | absence 17/17 | 遵守 |
| K Presentation ≠ outcome | replayBoundary | 遵守 |

---

## 18. State / Save Laws と Persistent State Inventory

| Key | Owner | Default | Version | Migration | Invalid handling | Storage failure |
| --- | --- | --- | --- | --- | --- | --- |
| `sevengods.battleSave` | `hooks/battleSaveStorage.ts` | なし | `RULES.saveVersion`=9 | v3→v9 鎖 | shape check・intent whitelist・`status==='playing'` のみ。**`otomo.defId` 未検証** | try/catch |
| `sevengods.daily` | `hooks/dailyStorage.ts` | `{version:1, days:{}}` | 1 | なし（不一致＝初期化） | version+days のみ | try/catch |
| `sevengods.records` | `hooks/recordStorage.ts` | 空 | 1 | なし（追加フィールドは normalize） | per-entry check | try/catch |
| `sevengods.matchups` | `hooks/matchupStorage.ts` | 空 | 1 | `>1` は read-only 保持、`<1`/破損は daily から再構築 | 未知 ID を drop | `unavailable` を UI に伝達 |
| `sevengods.otomoBond` | `hooks/otomoBondStorage.ts` | 空 | 1 | なし | shape check | try/catch |
| `sevengods.stakes` | `hooks/stakeStorage.ts` | 空 | 1 | なし | shape check | try/catch |
| `sevengods.rewardBonuses` | `hooks/rewardStorage.ts` | 空 | 1 | なし | shape check | try/catch |
| `sevengods.deckPreference` | `hooks/deckPreferenceStorage.ts` | null | `RULES.saveVersion`=9 | **なし（bump で破棄）** | godId を GODS で検証 | try/catch |
| `sevengods.dailyRunLog` | `hooks/dailyRunLogStorage.ts` | なし | 1 | なし | resume 時に replay 照合 | try/catch |
| `sevengods.tutorialSeen` | `hooks/tutorialStorage.ts` | 未 | なし（文書化済） | n/a | `'true'` 以外＝未 | try/catch |
| `sevengods.pendingRuns` / `sevengods.quota` | dormant | – | 1 | – | – | 本番から到達不能 |

**State Laws（正式）**：①新キーは Owner/Default/Range/Mutation/Persistence/Migration/Invalid の 7 項を仕様に書いてから実装 ②Presentation は state を作らない（E1/P1/P2 で実証済み） ③version 不一致の既定は「読み取り専用で保持」（matchups 方式）を推奨、「初期化」は損失を明示 ④未知 ID は throw させず UI で退避（決定191 方式）。

**Torture QA Gap（テストは変更しない・特定のみ）**：double input（未確認）、reload during battle（resume テストあり）、reload around 神技（`resume.test.ts` 範囲か未確認）、HP 0／AP 0／R7／共鳴 7/7（engine テストあり）、Daily cap（テストあり）、**corrupt `otomo.defId`（未防御・テストなし）**、missing fields（battleSave のみ）、old saves（v3〜v8 あり）、storage failure（matchups で quota テストあり）、navigation／retry leakage（`matchupWiring.test.ts`・`entranceWiring.test.ts` あり）。

---

## 19. Debug Lifecycle（正式）

Reproduce → Evidence → Isolate → Root Cause → Fix → Regression → Verify → Learn。Bug status は REPRODUCED / NOT REPRODUCED / INTERMITTENT。NOT REPRODUCED に guess fix 禁止。再利用可能な失敗は決定追記の「Learn」欄へ（決定191 の `otomo.defId` 注記が手本）。

## 20. Regression

自動：Vitest（公式値は worktree 除去後に再計測）・phase 別 acceptance.mjs・release-hygiene。人手：Production Smoke（RELEASE_STATUS の表を最新化して再利用）。追加すべき regression：`otomo.defId` 破損・deckPreference 版跨ぎ・Living Still の reduced-motion 直行・入場 8s fallback。

## 21. Release Safety Gate（統合）

| Gate | 内容 | 担当 |
| --- | --- | --- |
| Security | secret audit・依存監査・外部通信 0 | AI |
| Rights | 素材台帳の差分（新規素材は出所必須） | AI 論点整理→CEO/Specialist |
| Privacy | 収集項目 0 の維持。増える場合は CEO | AI→CEO |
| Commerce | 課金・広告 0 の維持 | – |
| Platform | Vercel 規約・LCP/CLS 予算 | AI |
| Game Integrity | 敵意図・7R・AP・Seed・Daily・Save・Ranking boundary の不変確認（既存スクリプト） | AI |
| Launch Gate（Lesson 34） | Entrance／One Battle／Another Battle／Tomorrow／Safety | CEO Human QA |
| Production GO | – | **CEO** |

## 22. Security / Rights / Privacy / Integrity — 所見

- Security：CSP／security headers は repo 内に無し（Vercel dashboard 側は読み取り不可・未検証）。runtime 外部通信 0 のため優先度低。
- Rights：§21 台帳参照。**法的認定は行わない。**
- Privacy：個人情報 0。ポリシー画面・クレジット画面なし（商用前に必要・L7）。
- Integrity：§6 の Core Contract はすべて実物一致。

## 21-b. Asset Rights Ledger（現状の追跡可能性）

| Asset 群 | Source | Creator/Generator | Terms | Evidence | 追跡 |
| --- | --- | --- | --- | --- | --- |
| 神 MAIN/FRONT/BACK・OTOMO 3 形態（42 枚） | SGG Creator Kit v1 | 公式二次創作素材 | `SGG-FAN-CREATION-GUIDELINES-1.0.0`（商用可・改変可・NFT 可・クレジット任意） | `docs/assets-kit/manifest.json` sha256 | ◎ |
| 神 keyvisual／keyvisual-hero／keyvisual-home | Kit 派生と推定 | **未記録** | – | prompts doc（`god-portrait-prompts.md`）のみ | △ |
| cards 60 枚 | 生成 | **未記録**（`card-art-prompts.md` あり） | – | – | △ |
| enemies 7 体（art_hq 等） | 生成 | **未記録**（ENEMY_GENA docs に工程あり） | – | – | △ |
| backgrounds 8・fx 6 | **未記録** | – | – | – | ✗ |
| BGM 4 曲×2 形式 | Suno（`bgm.ts:2`・`bgm-prompts.md`） | Suno | **利用規約版・商用可否 未記録** | – | △ |
| SE 20 | 自作合成（`scripts/gen-se.mjs`） | プロジェクト | 自前 | `docs/SE_ASSETS.md` | ◎ |

→ 台帳雛形（Asset / Source / Creator / Model-Service / Date / Terms Version / Commercial / Modification / Attribution / Canonical Source / Evidence）は L4 で `docs/ASSET_RIGHTS_LEDGER.md` に作成。**CEO INPUT が必要**：各生成サービス名・生成日・利用規約版（§37）。

---

## 23. Publishing Pipeline

Development → QA → Production → Devlog（決定追記） → Canonical Story（Problem/Change/Why/Verification/Result 5 行） → Player Promise → Site/SNS/PV/Store（L7） → Measurement（TRIGGER） → Player Voice（L6） → Next Improvement。

Tone Gate：世界観語彙（和神・神秘・躍動）と誇大禁止。Fact Gate：**LIVE 決定番号を引用できる事実のみ**。Dormant（Ranking）・未 LIVE（E1）を Live と表現しない。

## 24. Player Promise

North Star は内部。Player Promise（外部・最終 copy は今回不要）の証明は「**5 秒以内に、敵の予告と、それに答える神の一手が画面にある**」こと。具体：E1 Home の「神と今日の敵が向き合う構図」＋金の Primary 1 個＝約束。証明は初陣 2 tap 後の R1 で敵意図が見えて手札 5 枚から答えを選ぶ瞬間。Living Still は約束の「入口の空気」を担い、証明そのものではない（§35 で減点済み）。

## 25. Measurement

Executive KPI（≤3・将来）：①Visit→Battle Start ②Battle Start→Battle Finish ③Next-day Return。**現状すべて測定不能**（計測 0）。導入は外部サービス選定を伴うため CEO 判断。それまでの evidence：CEO Human QA、Feedback Window の声、決定論シミュレーション。数字＝What、声＝Possible Why、実験＝Causality。persistent identifier は勝手に実装しない。

## 26. Handoff Architecture 監査

| Layer | 現状 | 問題 | 対応（非破壊） |
| --- | --- | --- | --- |
| 1 Constitution | CLAUDE.md 134 行 | §1「MVP 0.1」§4「カード17種・テスト27件」が stale。North Star 不在 | L4 で §1/§4 を現状に更新し North Star を追記（1 画面以内） |
| 2 Principles | DECISIONS §4 の 5 条のみ | Game/Engineering/Commercial 原則が散在 | `SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md`（本監査で作成） |
| 3 Decision/Phase | DECISIONS 710KB＋phase docs 50 本 | 巨大・重複（6 組）・stale（RELEASE_STATUS・NIGHTLY・FINAL_BACKLOG・PLAYTEST_GUIDE）・不足（CHANGELOG_PLAYER・docs index・PRIVACY/CREDITS） | L4：`docs/README.md` index 作成、stale に「superseded」冒頭注記、DECISIONS は原本保持のまま年月別ファイルへの分割を検討 |

## 27. Community

Window→Place→Participation。現状は Window（FeedbackOverlay）のみで Place が無い。最初は「Feedback Window＋Place 1 個」で十分。Discord なし。ルール：返事は速く、実装は検証してから。声＝証拠、North Star＝羅針盤、重大設計＝CEO。

## 28. Commercial Constitution（9 条・実物監査）

1 「解く」を売らない／2 勝利を売らない／3 再挑戦を売らない／4 競争優位を売らない／5 課金のために無料版を不便にしない／6 広告のために没入を壊さない／7 成長は遊んだ結果、課金は愛着の表現／8 Model→Shelf→Price／9 Revenue 最適化より Player Loop。現状は課金・広告・通貨 0 で全条に抵触なし。将来の第一候補：non-consumable の外装・支援（Lesson 39）。

## 29. Economy Law

通貨 0。進行資産＝49・絆 pt・自己ベスト・神階。Laws：蓄積に目的／進行に見える到達先／新 Faucet は simulation／paid-free 分離（必要時）／無料ループ健全／人工的不便なし／economy 専用 sink なし。**OTOMO Mastery は first progression axis として適切**（IP と 1:1・表示専用で安全）だが、現行 Faucet（共鳴発動）が細すぎる（決定186）。L5 で simulation 付きの再調整。

## 30. Live Ops

一人で続く量。Daily＝自動心臓（人手 0）。Weekly/Monthly/Seasonal は「Daily 常連の evidence」が出てから必要性を評価。Event は Tease→Event→Afterglow で FOMO なし。現状追加なし。

## 31. Store / Platform

Web Production 継続。native 化の TRIGGER：①Web で Next-day Return の evidence ②Store face（OG・1 行・スクショ）が日本語で成立 ③Privacy/Credits 画面 ④Store Compliance Gate（再利用 checklist）作成。それまで LATER。

## 32. Store Face / Localization

Icon（favicon.svg のみ）・Title・Subtitle・Screenshots（実ゲームの 5 秒ポスター）・Description。まず Web の OG メタ（現状 0）。日本語→英語→根拠拡張。弱い face を多言語化しない。

## 33. AI Team / Model Qualification

| Role | Acceptance Criteria | Qualification Evidence | 現在の割当（Architecture ではない） |
| --- | --- | --- | --- |
| Audit / Root Cause / Simulation / Release reasoning | 実物 evidence 付き・推測を明示・NOT BUILD を出せる | 決定186・191・本監査 | Fable 5.1 |
| Implementation / Refactor / Tests / multi-file | `src/core` diff 0 の遵守・acceptance.mjs PASS・regression 追加 | 決定187〜193 | Opus 5 |
| Light UI / CSS / docs / simple tests | 見た目不変の確認・reduced-motion 維持 | – | Sonnet 5 |

評価軸：Correctness / Scope Discipline / Regression Safety / Evidence Quality / Speed / Cost。

## 34. Castle Inventory（次回作へ持てるもの）

- SYSTEMS：決定論エンジン（seed RNG・replay・resume・gameVersion）、save migration 鎖、balanceSim／phase 別 audit harness、nextGoal ルールエンジン、Result Hub 設計、release-audit／hygiene スクリプト、acceptance.mjs パターン、Daily の週シャッフル設計。
- WORLD / ASSETS：神 7・OTOMO 7×3・カード 60・敵 7・背景 8・fx 6・BGM 4・SE 20、prompts docs 4 本、encode／crop スクリプト、Motion Laws、canonical asset rules。
- AUDIENCE / RELATIONSHIP：測定不能（計測 0）。CEO と AI チームの運用関係のみ。
- KNOWLEDGE：決定 1〜193、phase docs 50 本、Debug Lifecycle 実例、feasibility 測定法（headless fps・CLS）、AI handoff（CLAUDE.md §6 policy）、本監査の Principles。

---

## 35. Final Roadmap（一本道）と NEXT NOW 判定

### 35-1. NEXT NOW 候補比較（6 基準）

| 基準 | A. E1 Close-out（Living Still stage 1 → E1 Release） | B. Interaction Feel v1 | C. 同一 Seed 再挑戦＋前回比 |
| --- | --- | --- | --- |
| North Star impact | 中（入口＝約束。「解く」直接ではない） | 中（Touch→Think の接続） | **高**（同じ意図を読み直す＝解く） |
| 不要な複雑さ | 低（CSS・state 0・同 DOM） | 低〜中（要素別 CSS・Safari 対策） | 低（seed を渡す） |
| milestone continuity | **最高**（開いている E1 branch・CEO HOLD を閉じる） | 低（別 branch・setup.css 競合） | 低 |
| evidence | **高**（feasibility 実測・CEO の HOLD 理由が明確） | 中（gap は確定、実機挙動未測） | 中（監査で retry 新 Seed を確認） |
| reversibility | 高（CSS 削除で E1 に戻る） | 高 | 高 |
| risk | 中（実機 fps・期待未達）→ time-box で制御 | 中（stuck active） | 低 |

**判定：A。** 理由は「Lesson 19（開いた milestone を閉じる）」「Lesson 34（Launch Gate は Entrance が最初）」「Lesson 2（CEO の Notice/Describe に一手で Improve）」「実測済み feasibility」「Production が今も 7 click 入口である機会損失」。C の North Star impact が最高である点は正直に認め、**L3 に固定**する。B は L2。A は「Living Hero を作る」ではなく「**E1 を LIVE にする**」milestone であり、Living Still は time-box 内の増分に過ぎない。

### 35-2. 一本道

1. **NOW：Entrance E1 Close-out**（Living Still stage 1・Ebisu・CSS・3.5 日 time-box → CEO QA → Production Release。未達でも E1 は出す）
2. **L2：Interaction Feel v1**（押下の沈み・focus-visible・touch-action・Primary SE 1 種・勝利 staging の tap-skip）
3. **L3：Solve Loop**（通常戦「同じ盤面でもう一度」・同 matchup 前回比・初クリア 1 拍・49→nextGoal 再評価）
4. **L4：Engineering Sidecar（非 runtime 中心）**（`otomo.defId` guard・deckPreference 版方針・CI 1 本・worktree 整理・docs Layer 1/2/3・CHANGELOG_PLAYER・Rights Ledger 雛形）
5. **L5：OTOMO 絆の到達先**（次称号の可視化・Faucet 再調整 with balanceSim・Power 据え置き）
6. **L6：Return & Voice**（Web Share API・Feedback Place 1 個〔CEO〕・Daily の Tease）
7. **L7：Face & Commercial Prep**（OG メタ・Privacy/Credits 画面・Canonical Story 公開・Store Compliance checklist・KPI 導入判断〔CEO〕）
8. **TRIGGER：Ranking staged activation**（Daily 常連 evidence → identity/ticket/API を段階接続・CEO）
9. **L8：Build diversity / visual polish / content**（CSS トークン化・敵意図 glyph 化・カード条件拡張）

過去仮説との差：過去「1 E1+Living Hero → 2 Feel → 3 Retry/49 → 4 OTOMO → 5 Daily/Share → 6 Ranking → 7 Site/Store → 8 Build」に対し、①Living Hero を「E1 Close-out の time-box 増分」に格下げ、②Engineering Sidecar（L4）を OTOMO の前に挿入（`otomo.defId` は L5 で OTOMO 画面を触る前に塞ぐべき・docs stale が judgment を汚す）、③Ranking を番号付き段階から TRIGGER に変更。

---

## 36. NEXT NOW（Milestone 形式）

- **Player Problem**：Production の入口は 7 click・699 字の自動 tutorial で、5 秒の約束が成立しない。E1 はそれを 2 tap に直したが未 LIVE。CEO は「静止画で世界に入る感覚が弱い」と HOLD。
- **Why Now**：開いた milestone を閉じる（Lesson 19）。Launch Gate の最初が Entrance（Lesson 34）。feasibility が実測済み（未 commit doc）。
- **Exact Scope**：①`docs/PHASE7_ENTRANCE_CINEMATIC_FEASIBILITY.md` を commit ②Ebisu の Living Still stage 1（camera pull-back・微粒子 ≤2 層・光帯〔blend なし〕・入場 tap＝全画面 button・8s fallback・reduced-motion 直行）③既存 acceptance.mjs に「入場があれば押す」1 行 ④CEO QA ⑤E1（＋Living Still）Release Gate → Production。**time-box 3.5 日。未達なら Living Still を外して E1 のみ Release。**
- **Existing Systems Reused**：E1 Hero God ルール・`keyvisual-hero.webp`・bgm unlock・reduced-motion gate・release-hygiene（CLS/LCP）。
- **New State?**：**なし**（session-first-run は memory のみ）。
- **Core Risk**：0（`src/core` diff 0）。**Save Risk**：0。**Daily Risk**：0（Home 表示のみ）。**Ranking Risk**：0。**Privacy Risk**：0。**Rights Risk**：低（既存正典画像のみ。台帳未整備は L4）。**Commercial Risk**：0。
- **Automated Tests**：`entranceWiring.test.ts` 維持、reduced-motion 時に入場 DOM が無いこと、8s fallback、CLS 0・LCP 不変（hygiene cls.mjs）、最終 layout の E1 一致。
- **Human QA Question**：「入場→Home で **別の絵に見えなかったか**（seam）」「iPhone 実機で引っかかり・発熱はないか」「初陣まで何 tap だったか（4 を超えないか）」「静止 E1 と比べて世界に入る感覚は上がったか（YES/NO）」。
- **Exit Criteria**：CEO QA PASS（seam ×3・実機 fps 体感）／Release Gate 10 項 PASS／Production Smoke PASS／決定 195（Release）追記／`CHANGELOG_PLAYER.md` 初版。
- **Expected Player Effect**：初回訪問の「約束」が 5 秒で伝わり、初陣まで 3〜4 tap。Entrance 内部スコア 67 → 72 前後（予測・未測定）。

---

## 37. CEO Decision Points（本当に必要なものだけ）

```
【CEO DECISION REQUIRED】#1
Issue：E1（＋Living Still stage 1）の Production 公開（§6-3 #8）
AI Recommendation：NEXT NOW 完了・CEO QA PASS 後に公開を承認
Reason：Launch Gate の最初（Entrance）が Production で未改善のまま
Alternatives：Living Still を待たず E1 のみ即公開 → CEO の HOLD 理由が未解消のため不採用（ただし time-box 超過時はこれに切替）
Risk：実機 fps・期待未達（time-box と reduced-motion 直行で制御）
Impact if delayed：新規訪問者は 7 click 入口のまま
CEO Action：NEXT NOW 完了時に 承認 / 拒否
```

```
【CEO INPUT REQUIRED】#2（決定ではなく情報提供・NEXT NOW を block しない）
Issue：Asset Rights Ledger の空欄（cards / enemies / backgrounds / fx / keyvisual / BGM の生成サービス名・生成日・利用規約版・商用可否）
AI Recommendation：L4 で雛形を作成するので、CEO が各群の出所を記入。法的結論は Specialist Review
Reason：§6-3 #5（著作権・ライセンス）。AI は認定しない
Impact if delayed：商用化（L7）前に必ず必要。今すぐの影響なし
```

Feedback Place（外部サービス）・KPI 計測（外部サービス・privacy）・Ranking（Neon・identity）・native Store は **今は判断不要**。それぞれ L6／TRIGGER 到達時に §6-4 形式で 1 案を上げる。

---

## 38. Final Decision

**Decision 194：PASS WITH MODIFICATIONS**

- NEXT NOW：**Entrance E1 Close-out**（Living Still stage 1・Ebisu・CSS・3.5 日 time-box → CEO QA → Production Release。未達なら E1 のみ Release）
- NEXT LATER：L2 Interaction Feel v1 → L3 Solve Loop → L4 Engineering Sidecar → L5 OTOMO 絆の到達先 → L6 Return & Voice → L7 Face & Commercial Prep → TRIGGER Ranking → L8 Build diversity
- DO NOT START YET：§12 の 25 項目
- CEO DECISION REQUIRED：#1（E1 Release・完了時）。#2 は INPUT

---

## 39. Coverage Check

Lesson 01 ✓（PARTIAL）02 ✓ 03 ✓ 04 ✓ 05 ✓ 06 ✓ 07 ✓ 08 ✓ 09 ✓ 10 ✓ 11 ✓ 12 ✓ 13 ✓ 14 ✓ 15 ✓ 16 ✓ 17 ✓ 18 ✓ 19 ✓ 20 ✓ 21 ✓ 22 ✓ 23 ✓ 24 ✓ 25 ✓ 26 ✓ 27 ✓ 28 ✓ 29 ✓ 30 ✓ 31 ✓ 32 ✓ 33 ✓ 34 ✓ 35 ✓ 36 ✓ 37 ✓ 38 ✓ 39 ✓ 40 ✓ 41 ✓ 42 ✓ 43 ✓ 44 ✓ 45 ✓ 46 ✓ 47 ✓ — 47/47 Ledger 化。Source は全行 PARTIAL（原文未提供）。

## 40. Acceptance Criteria 自己検査

AC-01 ✓（§1）／AC-02 ✓ runtime 変更 0／AC-03 ✓ 未 commit ファイル未変更／AC-04 ✓／AC-05 ✓ 原文不在を明示／AC-06 ✓ 47 機能化していない／AC-07 ✓／AC-08 ✓ §17 H／AC-09 ✓／AC-10 ✓／AC-11 ✓／AC-12 ✓ §35／AC-13 ✓ §14／AC-14 ✓ §7・§9〜11／AC-15 ✓ §29／AC-16 ✓ §4 #17・TRIGGER／AC-17 ✓ §12／AC-18 ✓ §9〜11／AC-19 ✓／AC-20 ✓ §22・§37／AC-21 ✓ 姉妹文書／AC-22 ✓ §35-2／AC-23 ✓／AC-24〜26 ✓ commit・push・deploy なし／AC-27 ✓ secret 出力なし。

## 41. 監査の限界（Unverified）

- Lesson 原文（0/47）。
- 実機 iPhone の fps・DPR3 の鮮明さ・touch での BGM unlock。
- 公式テスト数（worktree 汚染）。
- Vercel dashboard 側の headers/CSP。
- 画像内の AI 文字・ロゴ混入（静的解析不可）。
- Phase 7 docs 内のスコア予測はすべて予測値。
