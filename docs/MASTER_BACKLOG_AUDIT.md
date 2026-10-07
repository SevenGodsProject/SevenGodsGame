# SEVEN GODS — MASTER BACKLOG AUDIT（正式公開・運営・Growth までの全タスク棚卸し）

- 日付：2026-10-07
- 種別：**AUDIT ONLY / docs-only**（runtime／src／CSS／public／scripts 変更 0・build／vitest／ブラウザ／simulation／Lighthouse 0・commit／merge／push 0・Decision 番号追加 0）
- 判断主体：AI チーム（CLAUDE.md §6-2「複数案からの推奨案選定」「GO・NO-GO の技術判断」）。P0 の実施開始・CEO 判断事項（§6-3）は CEO
- 基準点：**Production = master = origin/master `641ea5c`**（決定267 Reward Relevance v1 PRODUCTION LIVE / CLOSED）。読み取り正本＝clean worktree `SevenGodsGame-integ`（main repo `C:\Users\kimi1\SevenGodsGame` は stale branch `feat/d224` で dirty のため参照しない）
- 別 Lane（**干渉しない**）：決定263 Threat Shape v1 Narrow Pilot（worktree `SevenGodsGame-d263-pilot`・`78ce071`・AUTOMATED GATE PASS → CEO Human QA Q1〜Q4 待ち）／External Player Feedback Audit
- 方法：15 領域を 5 つの読み取り専用監査レーン（Core Fun＋Replay＋Content／Battle Feel＋Art＋Perf／UI・UX＋Onboarding＋A11y／Ranking＋Social＋Commercial／Reliability＋Tech Debt）に分けて並列に棚卸し → 既存 Decision（CLOSED／LIVE／NO-GO）と重複除去 → 本書で統合分類。**新しい計測は 0**（既存 evidence のみ）
- 先行する既存監査（本書はこれらを置き換えず、上に積む）：`POST_D257_REMAINING_WORK_AUDIT.md`（M1〜M4／S1〜S4）、`COMMERCIAL_RC_KNOWN_ISSUES_TRIAGE.md`（K01〜K35・**2026-10-03 CEO 決定 COMMERCIAL RC = GO**）、`SEVENGODS_NEXT_MILESTONES.md`（L4〜L7・TRIGGER）、`NEXT_FUN_SELECTION_AUDIT_2026-10-07.md`（決定263 採用 74/100・branch 文書）
- 表記：【docs】＝既存 Decision／evidence の記録、【AI 判断】＝本書の分類、【CEO】＝CEO 判断事項（§6-3）

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| **現在の完成度** | **70 / 100**（§2）。「遊び」は商用 RC 水準（CEO RC GO 済み・Primary Fun Gate 群 PASS）。足りないのは「公開面（Face）」「権利・法務の確定」「運用の安全網（セーブ互換・CI・正本文書）」。これらは全て **XS〜S コスト・runtime 影響ほぼ 0** で埋まる |
| 棚卸し総数 | **110 ID**（§3 の表に定義された ID 数【2026-10-07 機械集計】。5 レーン 123 findings → 重複除去・既存 CLOSED／LIVE／NO-GO 除外後。※初版の「96 件」は §3 の ID 数と一致しなかったため訂正） |
| 分類 | **P0 = 5 束（ID 8：SG-01・UX-09 は CM-01・RL-02 と同一）**／**P1 = 10 束（ID 14）**／**P2 = 38**／**P3 = 41**／**DROP = ID 5＋§4 の閉じたレバー群**／OBSERVE（記録のみ）= ID 4＋Known 監視項目（§3 Pri 列の機械集計 2026-10-07。初版の P2 22／P3 27 は §5 の ID 列挙と一致しなかったため訂正） |
| P0 の性質 | **5 件すべて「ゲームの面白さ」ではなく「正式公開を宣言できる状態」の条件**。runtime 変更は `index.html`／`public/`／storage ガードのみ。`src/core` 0 |
| 最大の未解決リスク | ①セーブ互換（battleSave 以外 13 storage が version 不一致で無言初期化）②公開面・権利・法務の空白（OGP／favicon／クレジット／台帳 UNKNOWN／プライバシー）③作業環境の単一障害点（CI 0・worktree 73 本 ≈34GB → 10/07 cleanup で 16 本・main repo dirty・未 push branch） |
| **推奨 NEXT（1 件）** | **「Public Face Pack v1」**（OGP／meta description／theme-color／ブランド favicon／アプリ内 version 表示）。P0 で唯一 CEO／専門家 INPUT なしに AI チームだけで完了でき、決定263 Lane（`src/`・Human QA）と接触しない（`index.html`＋`public/` のみ）。詳細＝`ROADMAP_TO_RELEASE.md` §5 |

---

## 1. 到達点の事実（実コード・master `641ea5c`）【docs／Code Audit】

| 項目 | 数・状態 | 証拠 |
|---|---|---|
| 神 | 7（passive 3/7＝蒼毘・福永・笑蓮／Mastery 神技評価 4/7＝大耀・寿楽・蒼毘・福永） | `src/core/data/gods.ts:69-199`、`rules.ts:146`「決定110 プロトタイプ。正式採用値ではない」 |
| 敵 | 7（行動 kind 4＝attack／charge／special／multiAttack。charge 持ち 3 体。試練の影は attack のみ） | `enemies.ts:4-12,72-309` |
| カード | **60**＝共通 32＋7 神×専用 4 | `cards/common.ts`・`cards/*.ts`・`cards.test.ts:21` |
| OTOMO | 7（神 1:1・3 形態）。**精霊態 `spirit: []` 7 体すべて効果 0**。童子到達 0〜4%（決定186） | `otomo.ts:44-236`、`engine/effects.ts:299` |
| 託宣 | 3 択×1 戦 3 回（神階 2 回） | `divination.ts:17-42`、`rules.ts` |
| AP／共鳴／BURST | `[2..8]` 持ち越し無し／ゲージ 7 自動発動（任意発動は決定127 不採用） | `rules.ts:23-58` |
| 難易度 | easy／normal／hard＋神階Ⅰ〜Ⅶ（hard 1 勝で解放・Ⅶ 最終試練 3 択） | `rules.ts:192-196,412-447`、`stakes.ts` |
| Daily | 1 日 3 回（localStorage のみ）・JST・週次巡回・HP×1.25／ATK×1.15・seed 公開形式 | `dailyBoss.ts:14-87`、`dailyStorage.ts:120-128` |
| Records | 神別 best／wins／losses／fastestWinRound＋49 攻略は **boolean のみ** | `recordStorage.ts:17-46`、`matchupStorage.ts:29-32` |
| Solve Loop | 敗北時「同じ盤面でもう一度」（同 seed）LIVE（決定196） | `GameFlow.tsx:406` |
| Ranking | **DORMANT**（`submissionEnabled:false`・送信コード 0・`ranking-absence.mjs` 17 項目で機械検査） | `rules.ts:253-262`・決定171／256 |
| Storage | 14 キー・全て `version` あり。**連鎖 migration は battleSave（v3→v9）のみ**。他は version 不一致で初期化 | `src/hooks/*Storage.ts`、`recordStorage.ts:88-91` |
| 配信アセット | `public/assets` 214 files **53MB**（bgm 20MB・gods 12MB・cards 6.9MB・otomo 6.4MB・enemies 3.9MB・bg 2.2MB・fx 2.0MB・se 456KB） | `du` |
| Bundle | JS ≈460KB（決定257 以降・決定178 の 376KB から +22%）／CSS ≈127KB（`battle.css` 8,173 行）。code splitting 0。Phaser は **未マウント**（dead code） | `vite.config.ts`、`PhaserGame.tsx` 参照 0 |
| テスト | vitest 1,330 PASS／9 skip（意図的 `skipIf`）・**110 files 実行**（`*.test.*` は repo 内 116＝`src/` 110＋`scripts/phase5*` 6 の skip 対象）・`.only` 0 | 決定267 Gate |
| マーカー | TODO／FIXME／HACK／XXX／@ts-ignore **0**。`eslint-disable` 4。「仮値」注記 4（`rules.ts:206,393`・`otomo.ts:61`・`otomoGrowthDisplay.ts:22`） | grep |
| CI／監視 | **GitHub Actions 0・Sentry／Analytics 0・vercel.json 0・SW／manifest 0** | repo root・`index.html`（13 行） |
| 公開面 | `<title>` あり。**meta description／OGP／twitter card／theme-color／apple-touch-icon 0**。favicon は 2026-08-14 checkpoint 由来の紫稲妻（テンプレ疑い）。`package.json` 0.0.0・アプリ内 version 表示 0 | `index.html`、`public/favicon.svg` |
| 法務・クレジット | 著作権表記／クレジット画面／プライバシー／利用規約 **0**。課金・広告コード **0**（P14 準拠） | grep |
| 権利台帳 | `ASSET_RIGHTS_LEDGER.md` §7（2026-10-07 版）＝事実状態 KNOWN／UNKNOWN-ACCEPTED／BLOCKED の集計を正とする（2026-09-27 版の記号集計は ◎27／△38／✗18／UNKNOWN 1。初版の「◎29／△39／✗21」は台帳 §5 と不一致のため訂正）。`art-source/` 248MB が git 追跡＋ git 外 25MB（`h3-god-strike/`）＋カード v2 原画 2 枚は main repo のみ | 台帳 §5／§7 |
| 作業環境 | 監査時 worktree **73**・local branch 124（merged 85）→ **2026-10-07 cleanup 実施後 worktree 16・branch 46**（`WORKTREE_BRANCH_CLEANUP_AUDIT.md` §7）。origin は 8 branch のみ・main repo は `feat/d224` 108 behind／dirty 12 files＋untracked 1,870（未救出） | `git worktree list`・`git branch` |
| 正本文書 | `RELEASE_STATUS.md` は 2026-09-06（`7f4b08a`）で停止＝実態 `641ea5c` と乖離 → **2026-10-07 §A で正本化済み**（RL-02 前半完了・Rollback 演習のみ未） | `RELEASE_STATUS.md` §A |

---

## 2. 現在の完成度：70 / 100【AI 判断】

| 領域 | 点 | 根拠（1 行） |
|---|---|---|
| 1 Core Fun | 80 | 「解く」成立（S1 Q2／S2 Q1 YES）・Intent／Tension／Ultimate／Oracle／Reward の Gate 群 PASS。残＝K33「手札で戦い方を考える」（決定263 で検証中）・神 passive／Mastery 非対称 |
| 2 Battle Feel | 75 | Hit Weight／Reaction Language／God Strike v2／Sound Layer LIVE。残＝SE 全数式合成・Voice 0・動画 1 柱・敗北帳票即出し |
| 3 Character／Art | 55 | 敵 7 体が 2 世代（4 体 45〜59 点）・接地影 0・OTOMO 320px・カード 60 枚の画風差（K32）。Brief HOLD＝CEO 課金判断 |
| 4 UI／UX | 75 | 主要画面に Human QA PASS。残＝神選択画面の密度・2 戦目の壁・SP 空き帯 |
| 5 Onboarding | 70 | E1＋Brief 3 行＋Tutorial は良質。残＝2 戦目の壁（evidence 0）・初陣で「読む」が報われるか（263 待ち） |
| 6 Replayability | 65 | Solve Loop／Reward 3 役／神階／Daily LIVE。残＝49 攻略 boolean・「別構成で勝ち方が変わった」evidence 0 |
| 7 Ranking | —（設計上 dormant・減点対象外） | READY-DORMANT・TRIGGER 未到達。純部品のみ移植価値 |
| 8 Social／Growth | 30 | 挑戦状テキスト＋deep link のみ。OGP 0・Web Share 0 |
| 9 Commercial（公開面） | 25 | title のみ。OGP／favicon／credits／legal 0。課金 0 は方針通り |
| 10 Reliability | 55 | Release Gate・migration（battleSave）・rollback 記録は堅い。CI 0・監視 0・rollback 未演習・他 storage 無言初期化 |
| 11 Accessibility | 60 | reduced-motion 18 block・focus-visible 35・ARIA 75 は良好。神 HP contrast 1.96・40px stepper・音量なし・基準文書 0 |
| 12 Performance | 60 | 転送 2.6MB／戦闘開始 12.3MB・frame timing 計測あり。Lighthouse／実機 SP throttle／メモリ **0** |
| 13 Content Completeness | 85 | 7／7／60／7／3 択／3＋Ⅶ／Daily／Tutorial 全て実装。TODO 0。残＝OTOMO 精霊態空・多言語 0 |
| 14 Technical Debt | 45 | コードは清潔（TODO 0）。環境が重い（監査時 worktree 73・34GB → 10/07 cleanup で 16・main repo dirty・未 push branch・playwright 未宣言） |
| 15 Release／Growth 分離 | 70 | RC GO 済み・Known Issues 承認済み。「正式公開」の定義文書と DoD が無かった → 本書＋ROADMAP で補う |

加重（Primary Fun／UX 系 ×2・Commercial／Reliability ×1.5・他 ×1）＝ **70**。

---

## 3. 領域別棚卸し（110 ID）【AI 判断】

凡例：Pri＝P0 正式 Release blocker／P1 Release 前に強く推奨／P2 Release 後の改善／P3 Growth／DROP／OBS＝観察・記録のみ。Impact＝Fun（Primary Fun）／UX／Ret（Retention）／Com（Commercial）／Rel（Reliability）。Cost＝XS／S／M／L／XL。Risk＝LOW／MED／HIGH。Ev＝HQA（Human QA）／SIM（Simulation）／EXT（External Feedback）／CA（Code Audit）／HYP（Hypothesis）。★＝CEO 判断事項（§6-3）。

### 3-1. Core Fun（領域 1）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev |
|---|---|---|---|---|---|---|---|
| CF-01 | **決定263 Threat Shape v1 Pilot のクローズアウト**（CEO Human QA Q1〜Q4 → Release Gate or NO-GO 記録）。中断・方向変更しない | `-d263-pilot` `78ce071`・Gate PASS | **P1（進行中・別 Lane）** | Fun | S | LOW | HQA 待ち |
| CF-02 | 神 passive 3/7・Mastery 4/7 の非対称を解消するか「意図的非対称」として確定する（`rules.ts:146`「プロトタイプ」注記の更新を含む） | `gods.ts:109-199`・`mastery.ts:12,123` | P2 | Fun | M | MED | CA |
| CF-03 | 託宣「温存する判断が生まれたか」「導き」の人間使用率を Practical QA v3 で 1 問ずつ観測 | K21・`divination.ts` | P2 | Fun | XS | LOW | HQA 未観測 |
| CF-04 | 7 神バランス（寿楽一強・蒼毘／笑蓮下位）の最新 paired-seed 数値を決定246／251／252 後の evidence JSON から再集計し Decision に集約（sim 新規実行なし） | RELEASE_STATUS P2・K31-7 | P2 | Fun | S | LOW | SIM（既存） |
| CF-05 | D217 未解決 4 件（魔獣で順番づけ −6.1／機工師・魔獣の勝率微減／combo・charged 伝達導線／台本方策上振れ）の再評価 | `DECISION217 §5` | P2 | Fun | S | LOW | SIM |
| CF-06 | OTOMO 精霊態の効果 0・童子到達 0〜4%（dead content）。`rules.ts` 1 値（進化条件）か精霊態最小効果の Preflight。**決定214 NO-GO（7 展開）とは別件** | `otomo.ts`・決定186 | P2 | Fun／Ret | S | MED（balanceSim 再走） | SIM |
| CF-07 | OTOMO Stance v0.2（決定213 CEO Human QA PASS・branch `feat/otomo-stance-pilot` 11 ahead／108 behind）を Release するか正式に DROP するか ★ | DECISIONS L368-370・CEO 指示「merge 禁止」継続 | P2 ★ | Fun | M（rebase・golden 再基準化） | HIGH | HQA（PASS 済） |
| CF-08 | `charge` 持ち 3/7・攻撃力カーブ差別化（§3-2「敵 AI 行動多様化」後回し分） | `enemies.ts:40` | P3 | Fun | M | HIGH（決定252 CLOSED 境界） | CA |
| CF-09 | バッドドロー救済（マリガン等）— OHR Preflight で却下済み・山札消化 85〜93% で「回復すべき失敗」が無い | 決定263 Preflight F4 | DROP | — | — | — | SIM |
| CF-10 | R6〜R7 到達時の体験（勝ち確消化／ジリ貧）の観察のみ。延長・濃縮はしない | Lane5 NO-GO | OBS | Fun | XS | LOW | SIM |
| CF-11 | 試練の影（入門敵）の識別要素 0 — 決定263 結果待ち。今は触らない | `enemies.ts:72-78` | OBS | Fun | — | — | CA |

### 3-2. Battle Feel（領域 2）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev | Gap |
|---|---|---|---|---|---|---|---|---|
| BF-01 | **SE 実音源化**（22 本全て数式合成 22.05kHz mono・L1 着弾が `card_draw` と重なり 0.963）。素材購入／制作は ★ | `SOUND_PREMIUM_PRE_AUDIT.md` §0 | P1 ★ | Com／Fun | M | LOW | CA | Premium gap |
| BF-02 | **God Strike Voice／SE**（1,180ms 無音窓・K08／K35）。権利・生成方式 ★ | 決定257 監査 | P1 ★ | Fun | S〜M | MED | CA | Missing |
| BF-03 | 敗北 RETURN TO CALM（帳票即出し → 1 拍 150〜300ms・結果画面 BGM 即再開のラップ）＝Remaining Work S2 | `enemyVfxTiming.ts:167-171` | P2 | Ret | S | LOW | CA | Premium gap |
| BF-04 | K01 JS 予約 timer ≈230ms 遅れ → `performance.now()` 基準 1 行（CEO「修正しない」解除時のみ） | 決定254 Known #5 | P2 ★（解除） | Fun／Rel | XS | LOW | SIM | Premium gap |
| BF-05 | God Strike 動画を残り 6 柱へ展開（1 柱 ≈$0.35×Try・同一性 Gate 再実施） ★ | `godStrikeVideo.ts:24,34`・決定250 | P3 ★ | Fun／Com | M | MED | HQA（大耀） | Premium gap |
| BF-06 | 神側の被弾ポーズ／差分絵（現状 floating number＋再マウント key のみ） | `battle.css:5227` | P3 | Fun | M（asset） | LOW | CA | Premium gap |
| BF-07 | 浮遊ダメージ数字の縁取り（道化 紅背景で低コントラスト・Known #2） | RELEASE_STATUS #2 | P2 | UX | XS | LOW | HQA | Premium gap |
| BF-08 | MATERIAL 残（fixed バナー 3 枚 `system-ui`＋絵文字 → SVG・pill 2 種）＝Remaining Work S1 | `battle.css:1946-2045` | P2 | Com | S | LOW | CA | Premium gap |
| BF-09 | Card Travel Q2「いいえ」のまま Release（決定239） | DECISIONS L435 | OBS | UX | — | — | HQA | — |
| BF-10 | OTOMO 形態演出（精霊→受肉→童子）なし・戦闘中アニメ 0.5s のみ | `battle.css:1396-1481` | P3 | Ret | M | LOW | CA | Missing |

### 3-3. Character／Art（領域 3）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev |
|---|---|---|---|---|---|---|---|
| AR-01 | **敵 7 体の世代差解消**（painterly 3 体 72〜76 点 vs シート切り出し 4 体 45〜59 点・接地影 0・拡大率 1.5 倍甘い）。Enemy Art Brief v1.1 を PARALLEL PREP で確定 → 生成は ★（§6-3 #5／#6）。**CEO 10/03 RC GO で K07＝D（RC 条件外）確定済み** | `ENEMY_VISUAL_QUALITY_AUDIT.md` §1・§10、K07 | P1 ★ | Com／Fun | L | MED | 目視監査 |
| AR-02 | 接地影の CSS 版（asset 待たずに `drop-shadow`／楕円影で「沈み」を軽減）を Fast Gate で先行 | `POST_D254 L154` | P2 | Com | S | LOW | HQA（CEO 所感） |
| AR-03 | 向きの残り：笑蓮 右向き・才華 keyvisual 鏡像・敵カットイン `BattleEnemyCutin.tsx:64` 原画向き（左向き 4 体が必殺で神に背）。v2 art と同時（CSS 単独反転は却下済み） | K05 | P2 | UX | S | LOW | CA |
| AR-04 | Card Art Unity（60 枚の画風・品質差。決定243 v2 1 枚 vs 59 枚）K32 ★ | K32 | P3 ★ | Com | XL | LOW | HQA |
| AR-05 | OTOMO 3 形態 320px のみ（GameOver で拡大表示）→ 640px 再書き出し | `otomo/*`・`GameOverOverlay.tsx:305` | P3 | Com | S | LOW | CA |
| AR-06 | 配信ディレクトリの重複・未最適化：`gods/*/front.png`＝`main.png` バイト同一 7 組（≈1.9MB・`gods.ts:39` 参照 0）、`enemies/*/art.png` 旧絵 7 枚（2.8MB・参照 0）、`fx/cast-*.png` 2.0MB 未 WebP、shouren の home keyvisual 欠落 | A-1 inventory | P2 | Rel（容量） | XS | LOW | CA |
| AR-07 | 敵アセット命名混在（`art.webp` vs `art_hq.webp`） | `enemies.ts:17-25` | P3 | Rel | XS | LOW | CA |
| AR-08 | Home の動き 0（Post-D254 #04）。**「背景アニメ」方式は決定220／222 FAIL で終了＝再挑戦しない**。別方式（Living Still 起動のみ）は P3 | `setup.css` keyframes 0 | P3 | Ret | S | MED | HQA |

### 3-4. UI／UX（領域 4）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev |
|---|---|---|---|---|---|---|---|
| UX-01 | **「2 戦目の壁」**：初陣は preset 直行、2 戦目で神選択＋難易度＋神階＋相手＋編成 4〜5 画面を初見。Practical QA v3 に「初陣後に自力で 2 戦目を始められたか」を 1 問追加 | `firstBattle.ts`・`GameFlow.tsx:265-366` | P1 | Ret | S（QA 設問） | LOW | HYP |
| UX-02 | 神選択画面の情報密度（神技・難易度・神階Ⅰ〜Ⅶ・最終試練が同居・375px で 899px 縦長） | `GodSelectScreen.tsx:197`・Known #8 | P2 | UX | M | MED | CA |
| UX-03 | デッキ編成の専用 Human QA なし（stepper・「おすすめデッキに戻す」・36 枚母集団） | DECISIONS 言及 1 件 | P2 | UX | S | LOW | CA |
| UX-04 | SP 空き帯 ≈200px（舞台 art 設計要） | 決定257 Lane3 | P2 | Com | L | HIGH | CA |
| UX-05 | Enemy Select cold load 1〜3 秒（背景 7 枚 1.93MB 同時読込・preload 0） | Known #3 | P2 | UX | S | LOW | HQA |
| UX-06 | Auto Focus scroll 停止位置ずれ（147px 目標→196〜254px・anchoring 50〜80px） | Known #1／#4 | P3 | UX | S | MED | HQA |
| UX-07 | 701〜899px PC 幅でラウンド終了まで縦スクロール | Known #5 | P3 | UX | S | MED | HQA |
| UX-08 | OTOMO 育成画面に Human QA evidence 0・設計未了のまま Home から到達可能（導線の扱い判断） | `HomeScreen.tsx:181`・決定214 | P3 | UX | XS | LOW | CA |
| UX-09 | `RELEASE_STATUS.md` 正本化（Production HEAD `7f4b08a` 表記 → `641ea5c`・Code Freeze 欄・生存 Known 一覧）— **2026-10-07 完了（§A）** | `RELEASE_STATUS.md` §A | **P0**（RL-02 と同一・§3-10 で計上） | Rel | XS | LOW | CA |

### 3-5. Onboarding（領域 5）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev |
|---|---|---|---|---|---|---|---|
| OB-01 | 初陣で「読む」が報われるか（決定260 SUPPORTED「考えなくても勝てる」）＝決定263 に委ねる。**「おすすめカード／正解表示／自動選択」で埋めるのは North Star「読む→組む→決まる」（`DECISION203 §:17,27`）の「組む」を奪うため DROP** | DECISIONS L481／L487 | P1（CF-01 に従属） | Fun | — | — | HQA |
| OB-02 | TutorialOverlay に Esc／初期フォーカス／focus trap なし（Brief・ConfirmDialog は対応済み） | `TutorialOverlay.tsx:49,73` | P2 → A11Y-01 に統合 | UX | XS | LOW | CA |
| OB-03 | 「遊び方」完全版は本アイコンからのみ（E1 で意図的）。再表示導線の Battle 中可否を確認 | `App.tsx:87` | P3 | UX | XS | LOW | CA |
| OB-04 | 「おすすめカード＝正解表示」「結果画面で解き方説明」（決定262 NO-GO）系の提案 | 決定262 | **DROP** | — | — | — | HQA |

### 3-6. Replayability（領域 6）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev |
|---|---|---|---|---|---|---|---|
| RP-01 | 49 攻略を boolean から「matchup 別 best score／撃破 R／神階」へ（storage version +1＝**RL-01 セーブ互換ガードが前提**）・Result に前回比 1 行 | `matchupStorage.ts:29-32` | P2 | Ret | S | LOW | CA |
| RP-02 | 「構成を変えたら勝ち方が変わった」の Human QA evidence 0（決定153 bonus 16 枚・決定267 3 役は実装済み）→ Practical QA v3 設問 | `GAME_REPLAYABILITY_AUDIT §2` | P2 | Ret | XS | LOW | HYP |
| RP-03 | 勝利時にも同 seed 再挑戦（スコア更新目的）— 現状は敗北時のみ | `GameFlow.tsx:406` | P3 | Ret | XS | LOW | CA |
| RP-04 | easy／normal 層の「次の目標」が神階解放（hard 1 勝）まで遠い | `rules.ts:447` | P3 | Ret | S | LOW | HYP |
| RP-05 | **Daily 神間 spread 是正**（G1 13.82%・最悪日 20.44%・決定259 PARTIAL＝候補 24 案未検証・RAM ≥700MB／約 2h）。Ranking TRIGGER まで DEFER だが Daily 単体でも「組む」価値を毀損 | `DAILY_COMPETITIVE_GATE_REJUDGMENT.md`・K11 | P2（Ranking 起動時 P1） | Fun／Ret | M | MED | SIM（未完） |
| RP-06 | Daily Tease（翌日の敵タイプのみ・Seed は出さない） | L6 | P3 | Ret | S | LOW | HYP |

### 3-7. Ranking（領域 7・READY-DORMANT 前提）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev |
|---|---|---|---|---|---|---|---|
| RK-01 | TRIGGER 判定手段（Daily 常連 evidence）が「Feedback の声／CEO 実感」のみ。KPI 3 本の導入は ★（外部サービス） | `NEXT_MILESTONES` L7／TRIGGER | P3 ★ | Ret | S | LOW | CA |
| RK-02 | 旧枝 `feat/daily-ranking-phase4`（`762168f`・+59／−146・378 files）は **whole merge 禁止継続**。移植価値は純部品のみ＝`src/core/replay/ranking.ts`（同順位 1,1,3）・`src/core/identity.ts`（Web Crypto）・`src/server/ranking/*`・`api/ranking/*`。UI／配線 5 ファイルは REBUILD。**TRIGGER 到達まで持ち込まない**（持ち込むと `ranking-absence` Gate FAIL） | §A 表（Ranking lane） | P3 | Rel | L | HIGH if merged | CA |
| RK-03 | Security Blocker B1〜B4（`flushPendingRuns` 未配線／submit 単独 kill switch／Preview・本番同一 Neon／WAF）— TRIGGER 後に P1 | preflight §2-2 | P3（→P1） | Rel | S | MED | CA |
| RK-04 | identity（端末秘密→SHA-256 公開 ID・端末跨ぎ復元・ニックネーム）★ §6-3 #7 | `[branch] identity.ts` | P3 ★ | Rel | M | MED | CA |
| RK-05 | `engineVersion` 1 のまま・GOLDEN `1.6c581e56a02c0730` が古く「版据え置き＝結果不変」テストが早期 return で無効化 | `gameVersion.test.ts:220-221` | P2 | Rel | XS | LOW | CA |
| RK-06 | Daily 3 attempts は localStorage のみ（消せば無限）・seed 公開 `daily-${date}-${enemy}` で solver 先読み可 → Ranking 時は ticket／サーバー時刻へ移行（設計済み）。日次 salt は Daily 概念変更＝★ #1 | `dailyStorage.ts:120-128`・`dailyBoss.ts:87` | P3 | Rel | MED | — | CA |
| RK-07 | timer lag 230ms は順位に無関係（スコア・リプレイに時間項目 0）。将来 `duration_ms` 監視時のみ BF-04 を先に | preflight §10 | DROP（Ranking 観点） | — | — | — | CA |
| RK-08 | master の Ranking dead CSS（`battle.css:4371-4409`・`daily.css:321-539`）・`.vercelignore` の `api/` コメント | preflight §12 #20 | P3 | Rel | XS | LOW | CA |
| RK-09 | 吸収済み docs 枝 3 本（`lane2-ranking`／`d256`／`d259`）と worktree の整理 → TD-02 に統合 | §A 表 | P3 | — | XS | LOW | CA |
| RK-10 | プライバシー表記（匿名 ID・操作列・Vercel request log の IP）★ | preflight | P3 ★（Ranking 前は CM-03 で先行） | Com | S | — | — |
| RK-11 | leaderboard UI（`DailyRankingPanel` は master の `HomeTodayPanel`／result-hub と衝突＝REBUILD）・tie-break（1,1,3 済）・reset（日次 JST＋15 分猶予・週次・30 日保持）・rollback（K0 kill switch 未実装 B2／K1 env 削除／K3 revert） | branch docs | P3 | Ret | M | MED | CA |

### 3-8. Social／Growth（領域 8）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev | Ranking 前後 |
|---|---|---|---|---|---|---|---|---|
| SG-01 | **OGP／twitter card／og:image**（挑戦状 URL が SNS で無地カードになる） | `index.html` 13 行 | **P0 → CM-01 に統合** | Com／Ret | S | LOW | CA | **前** |
| SG-02 | Web Share API（`navigator.share` 対応時のみ・fallback clipboard） | `shareText.ts:41-67` | P2 | UX／Ret | XS | LOW | CA | 前 |
| SG-03 | X intent リンク（真正性「自己申告」注記は維持） | grep 0 | P2 | Com | XS | LOW | HYP | 前 |
| SG-04 | Discord 等コミュニティ導線・Feedback 送信先（現状 clipboard のみ）★ 外部サービス選定 | `FeedbackOverlay.tsx:18` | P2 ★ | Ret | XS | LOW | CA | 前 |
| SG-05 | スコアカード画像（Canvas 生成） | — | P3 | Com | M | LOW | HYP | 前（OGP 後） |
| SG-06 | 公開 leaderboard・順位付き共有・community challenge（週間 Best 3 of 7）・検証済み score 付き挑戦状 | — | P3 | Ret | L | — | — | **後** |

### 3-9. Commercial／公開面（領域 9・Pay-to-Solve 禁止＝課金コード 0 確認済み）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev |
|---|---|---|---|---|---|---|---|
| CM-01 | **Public Face Pack v1**：meta description／OGP（og:title／description／image／url）／twitter:card／theme-color／apple-touch-icon／manifest（最小）／**ブランド favicon**（現状テンプレ疑いの紫稲妻）／アプリ内 version 表示（`package.json` 0.0.0 → semver・build sha を Feedback snapshot と Home 隅に） | `index.html`・`public/favicon.svg`・`package.json:4` | **P0** | Com／Ret／Rel | S | LOW | CA |
| CM-02 | **Legal／Credits Pack**：著作権表記・「非公式二次創作」明示の要否（SGG Kit §3 誤認禁止）・クレジット画面（Kit §4 任意だが L7 で掲載方針・BGM Suno・自作 SE）・問い合わせ先。**文言は ★ CEO／専門家確認（§6-3 #5）**。コード側は静的 1 画面 S | `SGG-CREATOR-KIT-RIGHTS.md:16,39-56` | **P0 ★** | Com | S（文面は専門家） | — | CA |
| CM-03 | **プライバシー表記（最小）**：現状 localStorage のみ・外部送信 0 を明記。利用規約は正式公開時に要否を ★ 専門家確認 | grep 0 | **P0 ★**（CM-02 と同一画面で可） | Com | XS | — | — |
| CM-04 | **Asset Rights Ledger の確定**：UNKNOWN 欄（C3 Temporary chat 使用有無・2026-08 プラン・Model-Service プラン）と AI 生成素材規約 #2／#6 の最終 Status（CEO 回答 2026-09-27 受領済み → 台帳反映）。確定できない行は「配信除外 or UNKNOWN 維持（CEO 承認）」を記録 ★ | `ASSET_RIGHTS_LEDGER.md` §1-2／§2-1・`ASSET_GENERATION_SERVICE_TERMS_AUDIT.md:10-23`・K13 | **P0 ★** | Com | XS（docs） | — | CA |
| CM-05 | error reporting（Sentry 等・本番例外は ErrorBoundary 表示で消える）★ 外部サービス | `ErrorBoundary.tsx:27-28` | P2 ★ | Rel | S | MED | CA |
| CM-06 | analytics 0（方針通り DO NOT START）。KPI 導入は RK-01 へ | — | P3 ★ | — | — | — | — |
| CM-07 | `vercel.json`（security headers／cache 制御）・robots.txt／sitemap | repo root | P3 | Rel／Com | XS | LOW | CA |
| CM-08 | 多言語化（日本語直書き・カード 60 枚＋敵台詞がコード内） | §3-2 | P3 | Com | L | LOW | CA |
| CM-09 | 課金・広告（paid retry／paid Daily attempts／power-selling OTOMO／login streak） | P14 | **DROP** | — | — | — | — |

### 3-10. Production／Reliability（領域 10）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev |
|---|---|---|---|---|---|---|---|
| RL-01 | **Save Compatibility Guard**：battleSave 以外 13 storage（records／rewardBonuses／otomoBond／daily／matchup／stakes 等）が version 不一致で **無言初期化**（例 `recordStorage.ts:88-91`・`otomoBondStorage.ts:105-106`）。「version を上げるときは migration 必須／上げないなら追加のみ互換」のポリシーを docs に固定し、全 storage の future-version／旧 version 読み込みテスト（`migration.mjs` 拡張）を追加。**決定267 の migration 10/10 は rewardHistory のみ** | `src/hooks/*Storage.ts`・`matchupStorage.ts:81` | **P0** | Rel／Ret | M | MED | CA |
| RL-02 | **Release Ops Baseline**：`RELEASE_STATUS.md` を `641ea5c`／決定267 で正本化（Production HEAD・bundle・rollback deployment・生存 Known 一覧 K01／K10／K11／K12／K14 等）**← 2026-10-07 完了（§A）**＋ **Rollback promote を 1 回演習**（記録のみで未演習）+ Day-1 運用メモ更新 | `RELEASE_STATUS.md:10`・`DECISION267 §:107` | **P0** | Rel | S | LOW | CA |
| RL-03 | **CI 1 本**（GitHub Actions：PR で tsc／oxlint／vitest。Playwright は含めない＝RAM）。L4 ③ | `.github/` 無し | P1 | Rel | S | LOW | CA |
| RL-04 | `playwright` 未宣言依存（`scripts/` 11 本が import・clean clone で acceptance／migration／determinism が動かない）→ `devDependencies` 追加 | `package.json` | P1 | Rel | XS | LOW | CA |
| RL-05 | ブラウザ互換 evidence：iPhone Safari のみ。Android Chrome／Firefox／Safari 17.4 未満（WebM／Opus fallback）を 1 回ずつ Smoke（CEO 手持ち端末） | K02／K04・`RELEASE_HYGIENE_GATE.md:45` | P2 | UX | S | MED | HYP |
| RL-06 | ErrorBoundary がルート 1 枚のみ（戦闘中例外で全画面リセット）→ Battle 境界＋「続きから」導線 | `main.tsx:9` | P2 | UX | S | LOW | CA |
| RL-07 | origin に 8 branch のみ・未 push 作業 116 branch・docs 系 unmerged 14 本が単一 PC 依存 → docs 系 branch を push（CEO 確認不要・公開 repo なら要確認）| `git branch -r` | P1 | Rel | XS | MED | CA |
| RL-08 | セーブ export／import（バックアップ） | localStorage のみ | P3 | Ret | S | LOW | HYP |
| RL-09 | SW／manifest／offline（PWA）。manifest 最小は CM-01 に含める | `index.html` | P3 | UX | M | LOW | CA |
| RL-10 | `vitest.config`（include／exclude・coverage）— phase5 scripts の常時 9 skip を既定 include から外す | B-6 | P3 | Rel | XS | LOW | CA |

### 3-11. Accessibility（領域 11）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev |
|---|---|---|---|---|---|---|---|
| A11Y-01 | **A11y Minimum Pack（CSS／TSX のみ・Fast Gate 1 束）**：①神 HP 文字 contrast 1.96 → AA 4.5（`text-shadow` 依存を解消）②デッキ stepper 40×40 → 44 ③託宣ボタン SP 高 39px → 44 ④TutorialOverlay に Esc／初期フォーカス／focus trap ⑤音量スライダー or BGM／SE 個別 OFF（`SE_GAIN.master` 定数化解除） | `DECISION264 §:85-89`・`setup.css:840-850`・`TutorialOverlay.tsx`・`sound.ts:163` | P1 | UX | S | LOW | CA＋画素計測 |
| A11Y-02 | a11y 基準文書（AA 4.5／44px／reduced-motion／音量）を 1 本定義（現状 0） | docs grep | P1（A11Y-01 と同時・docs） | Rel | XS | LOW | CA |
| A11Y-03 | バトル中の状態変化（予告・ダメージ・結果）に `aria-live` 0 | `BattleScreen.tsx:531` | P3 | UX | S | LOW | CA |
| A11Y-04 | 9〜10px 文字 49 箇所（文字サイズ設定なし・ピンチズームは可） | `battle.css:2697,2856` | P3 | UX | M | MED | CA |
| A11Y-05 | カードボーナス全文が `title=` hover 依存（SP は短縮行のみ） | `CardView.tsx:147` | P3 | UX | XS | LOW | CA |
| A11Y-06 | `prefers-reduced-motion` 判定の 3 箇所分散（`reducedMotion.ts`／`GameOverOverlay.tsx:164`／`useMobileAutoFocus.ts:35`）統一 | — | P3 | Rel | XS | LOW | CA |

### 3-12. Performance（領域 12・既存 evidence のみ）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev |
|---|---|---|---|---|---|---|---|
| PF-01 | **SP 実機 perf evidence の取得**（Lighthouse mobile／CPU 4× throttle／メモリ／LCP）— 現状 0。6GB 機では Lighthouse を **別日・単独・1 run** で取るか、CEO iPhone の体感 QA 3 問で代替 | `evidence/decision254/*/perf2.json` のみ | P1 | Rel | S（計画）／M（実行） | — | CA |
| PF-02 | Enemy Select preload（背景 1.93MB・`<link rel=preload>` or 段階読込） | Known #3 | P2 → UX-05 と同一 | UX | S | LOW | HQA |
| PF-03 | 配信容量削減（AR-06 の重複 ≈6.7MB・BGM mp3+webm 二重 20MB → AAC 検討） | A-1 | P2 | Rel | S | LOW | CA |
| PF-04 | JS 460KB（+22%）の code splitting（`manualChunks`：setup／battle／result）・gzip 絶対値の記録 | `vite.config.ts` | P2 | Rel | S | LOW | CA |
| PF-05 | `battle.css` 8,173 行の分割（保守性） | `wc -l` | P3 | Rel | L | HIGH | CA |

### 3-13. Content Completeness（領域 13）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev |
|---|---|---|---|---|---|---|---|
| CC-01 | 「仮値」注記 4 件の確定（`rules.ts:206` Daily modifier＝決定256 G2 PASS で確定可・`rules.ts:393` 福永 Mastery save 暫定・`otomo.ts:61`・`otomoGrowthDisplay.ts:22`） | grep | P2 | Rel | XS | LOW | CA |
| CC-02 | Mastery 閾値「プロトタイプ・正式採用値ではない」注記のまま Production → CF-02 で確定 | `rules.ts:146` | P2 → CF-02 | — | — | — | CA |
| CC-03 | OTOMO 絆保存が `godId` 単位（21-OTOMO 時に移行要）— 決定214 NO-GO の間は不要 | §3-2 最終行 | DROP（条件付き） | — | — | — | CA |
| CC-04 | 多言語化 → CM-08 | — | P3 | — | — | — | — |
| CC-05 | Phaser 層（`PhaserGame.tsx`・`src/game/` 130 行・`phaser` 依存）＝dead code。CLAUDE.md §1「温存」方針どおり。削除も復活もしない（bundle 非含有） | 参照 0 | OBS | — | — | — | CA |

### 3-14. Technical Debt（領域 14・削除作業はしない）

| ID | タスク | Evidence | Pri | Impact | Cost | Risk | Ev |
|---|---|---|---|---|---|---|---|
| TD-01 | **main repo の救出**：`C:\Users\kimi1\SevenGodsGame` が `feat/d224`（108 behind）で dirty 12 files（+380／−13：`BattleScreen.tsx`・`CardView.tsx`・`combatTimeline.ts`・`sound.ts`・`DECISIONS.md` 等）＋untracked 1,870。差分を patch 化して保存 → branch に commit（push 不要）→ main repo を master へ。**誤 commit で Production 同一性（RC clean build＝本番 md5）が崩れる危険** | `git status`・K14 | P1 | Rel | S | MED | CA |
| TD-02 | **worktree 整理**：73 本 ≈34GB → ACTIVE を keep・残りを整理（初版の「remove 44／archive 19」は `WORKTREE_BRANCH_CLEANUP_AUDIT.md` の分類に置き換え。**2026-10-07 実施済み：worktree 73→16・branch 124→46・≈31.5GB 回収＝同監査 §7**）。**一覧提示まで AI・削除実行は CEO 確認（§6-3 #9 不可逆）**。RAM 6GB 環境の Gate OOM 対策 | B-3 | P1 ★（削除） | Rel | S | LOW | CA |
| TD-03 | merged branch 85 本・feat 側末尾 1 commit 取り残し 4 本（`card-travel`／`d237`／`dock`／`hud`）の整理 | B-2 | P2 | Rel | XS | LOW | CA |
| TD-04 | `art-source/` 248MB＋`docs/evidence` 200MB（1,903 files）が git 管理 → worktree 毎に複製・pack 1.67GB。**別に git 外の唯一実体**：`art-source/h3-god-strike/` 25MB＋`card_taiyo_attack_01_v2*.png`（main repo のみ・WORKTREE 監査 §4-3）。Git LFS or 別 repo 化を検討（配信は `.vercelignore` 済み） | `git ls-files` | P2 | Rel | M | MED | CA |
| TD-05 | docs 148 本のうち完了 Phase 記録に SUPERSEDED ヘッダ無し（29 本のみ明示）・`PHASE3〜7`／`NIGHTLY_REPORT`／`FINAL_BACKLOG_8-31`／`*-prompts` 等。`docs/README.md` index（L4 ⑤） | B-4 | P2 | Rel（AI 誤参照） | S | LOW | CA |
| TD-06 | Known Issues Triage に CLOSED 行混在・生存 Known 一覧なし → RL-02 で `RELEASE_STATUS.md` に集約 | `TRIAGE.md:51/193` | P2 → RL-02 | — | — | — | CA |
| TD-07 | QA 用 URL param（`?enemy=&seed=&stake=`）が本番 bundle に露出（`import.meta.env.DEV` ガード無し・acceptance.mjs が依存）。Ranking 解禁時は P1 | `useGameEngine.ts:46-62` | P3（→P1） | Com | S | LOW | CA |
| TD-08 | `.git/worktrees` 72 エントリ・garbage 警告（`git worktree prune` は TD-02 と同時） | `git count-objects` | P3 | — | XS | LOW | CA |
| TD-09 | `eslint-disable` 4 件（`react-hooks/exhaustive-deps` 3）の見直し | B-1 | P3 | Rel | XS | LOW | CA |
| TD-10 | 決定210／211 の番号未記録（NEEDS REVIEW）の整理 | Remaining Work S4 | P2 | Rel | XS | LOW | CA |

### 3-15. Release／Growth の分離（領域 15）→ `ROADMAP_TO_RELEASE.md` §2〜§4 に一本道として記載

---

## 4. DO NOT RESURRECT（CLOSED／LIVE／NO-GO・新しい反証 evidence なしに再開しない）【docs】

| 決定／レバー | 状態 | 復活させないもの |
|---|---|---|
| 決定127 | REJECT | BURST 任意発動（共鳴経済再設計と同時でなければ再検討しない） |
| 決定131〜152／171／172／256 | NO-GO／READY-DORMANT／Clean Release LIVE | Ranking 旧枝 whole merge・Production への送信コード持ち込み・通常戦総合ランキング・日次 salt・Daily スコア倍率 |
| 決定214 | NO-GO | 7 OTOMO 展開（「7 OTOMO DESIGN NOT READY」。CEO 指示「7 展開・Progression・merge 禁止」継続） |
| 決定216 | 取り下げ | 蒼海の龍神 R4「守りの姿勢」（敵 guard mechanic） |
| 決定219／220／221／222 | NO-GO／FAIL | H3 Environmental VFX・Procedural Living Background・Lighting Breath（「Living Background 開発終了・静止背景を正式採用」） |
| 決定223／224／242 | CLOSED | Motion Strategy 再 Pilot・「Premium 改善 Phase 一区切り → Asset Phase」方針（演出系の新規 Narrow Pilot は原則この範囲内） |
| 決定252 §2-3＋Late-Round 統合 Preflight | CLOSED／NO-GO | 新しい敵行動 kind（break／自己回復／自己強化・per-hit・2 段溜め）・R5〜R7 の延長／濃縮。**恒久方針「7R は上限・目標ではない」** |
| 決定255 | NO-GO・CEO 承認 CLOSED | カード数値／`rules.ts` 係数で Normal に複数解を強制。「決定255 を理由にカード数値を変更しない」 |
| 決定260 | NO-GO・CEO 承認 CLOSED | AP 後半の平準化（AP 曲線 `[2..8]` 維持） |
| 決定262 | Human QA NO → NO-GO | 結果画面の「解き方」1 行・事後の答え可視化。**派生：おすすめカード／正解表示／自動選択（North Star 衝突）** |
| OHR Preflight（決定263 前段） | 却下 | マリガン／役割タグ単独／開幕オーバーレイ／持ち越し表示 |
| 決定226〜241・246〜254・257・261・264・266・267 | PRODUCTION LIVE / CLOSED | 同一テーマの再 Pilot（Known として記録済みの残りは本書で個別計上） |
| 決定263 | **進行中（別 Lane・AUTOMATED GATE PASS → HUMAN QA READY）** | 中断・方向変更・本書からの追加要求 |
| P14（商用原則） | 恒久 | 課金・広告・Pay-to-Solve |

---

## 5. 分類集計【AI 判断】

| 分類 | 件数 | 内訳（ID） |
|---|---|---|
| **P0** | **5 束（ID 8）** | CM-01 Public Face Pack（＝SG-01）／CM-02 Legal・Credits ★／CM-03 プライバシー最小 ★／CM-04 権利台帳確定 ★／RL-01 Save Compatibility Guard＋RL-02 Release Ops Baseline（＝UX-09・**運用安全網として 1 束**） |
| **P1** | **10 束（ID 14）** | CF-01 決定263 クローズアウト（進行中）／AR-01 Enemy Art Brief v1.1 → CEO 判断 ★／BF-01 SE 実音源 ★／BF-02 God Strike Voice ★／UX-01 2 戦目の壁 QA＋OB-01／A11Y-01＋02 A11y Minimum Pack／RL-03＋04 CI＋playwright 宣言／RL-07 docs branch push／PF-01 SP perf evidence／TD-01＋02 作業環境衛生 |
| **P2** | **38** | CF-02〜07・BF-03／04／07／08・AR-02／03／06・UX-02〜05・OB-02・RP-01／02／05・RK-05・SG-02〜04・CM-05・RL-05／06・PF-02〜04・CC-01／02・TD-03〜06／10 |
| **P3** | **41** | CF-08・BF-05／06／10・AR-04／05／07／08・UX-06〜08・OB-03・RP-03／04／06・RK-01〜04／06／08〜11・SG-05／06・CM-06〜08・RL-08〜10・A11Y-03〜06・PF-05・CC-04・TD-07〜09 |
| **DROP** | **ID 5＋閉じたレバー群** | CF-09 マリガン／OB-04 おすすめ・正解表示・解き方説明／CM-09 課金・広告／RK-07 timer→順位／CC-03（条件付き）／§4 の閉じたレバー群（BURST 任意・Ranking whole merge・7 OTOMO・敵 guard・Living BG・新 mechanic・late-round 延長・AP 平準化・カード数値 SD・日次 salt・Daily 倍率・通常戦総合 RK） |
| OBS | ID 4＋Known 監視 | CF-10／11・BF-09・CC-05・各 Known の監視項目（K15〜K20・K22〜K25） |

**P0 が「遊び」を 1 件も含まない理由**：CEO 2026-10-03 の COMMERCIAL RC = GO で Primary Fun／determinism／save／fairness／game-breaking UI の BLOCKER 0 が確定し、以後 決定264／266／267 が全て Human QA PASS → LIVE。敵アート（K07）・Voice（K08／K35）・Card Art（K32）は同決定で D（RC 条件外）と承認済みのため、本書は P1 ★ に置く（復活ではなく CEO 課金判断の提示）。

---

## 6. 最大の未解決リスク（3 件）

1. **セーブ互換の落とし穴（RL-01）**：battleSave 以外 13 storage は version 不一致で無言初期化される。次に `RECORD_VERSION`／`BOND_VERSION`／`MATCHUP` 等を上げる変更（RP-01 など）が入ると、Human QA を通っても既存プレイヤーの戦績・絆・49 攻略が消える。Triage ルールでは「save 破損＝A BLOCKER」。正式公開後は不可逆。
2. **公開面・権利・法務の空白（CM-01〜04）**：挑戦状 URL が SNS に出る設計なのに OGP 0・favicon はテンプレ疑い・クレジット／著作権／プライバシー 0・台帳 UNKNOWN 残。コード側は XS〜S、文言と権利確定は CEO／専門家。ここだけが「正式公開」を宣言できない理由。
3. **作業環境の単一障害点（TD-01／02・RL-03／07）**：CI 0・Gate 手動・worktree 73 本 ≈34GB（→ 10/07 cleanup で 16 本・TD-02 実施済み）・main repo が 108 behind の dirty（TD-01 未）・未 push branch。6GB RAM で Gate OOM 3 回の実績。PC 障害で決定209〜267 の docs 系譜が失われ、誤 commit で Production 同一性が崩れる。

---

## 7. 実装しなかったこと・runtime 変更 0 の証明

- 本書と `ROADMAP_TO_RELEASE.md` の 2 ファイルを clean worktree `SevenGodsGame-integ`（master `641ea5c`）に **untracked として作成**したのみ。commit／merge／push／deploy／Decision 番号追加：0
- runtime／src／CSS／public／scripts／package.json 変更：0。build／vitest／Playwright／ブラウザ／simulation／Lighthouse／画像・音声生成／外部サービス：0
- 決定263 Lane（`SevenGodsGame-d263-pilot`・`feat/d263-threat-shape-v1`）：読み取りのみ（`git log`・docs 1 本）。External Player Feedback Lane：未接触
- 5 監査レーンは全て Read／Grep／Glob／`git log`／`git show`／`git branch`／`git worktree list`／`ls`／`du` のみ。worktree／branch の削除・prune：0
