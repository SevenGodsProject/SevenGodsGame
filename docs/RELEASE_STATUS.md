# SEVEN GODS リリースステータス（正本・2026-10-07 更新）

Production の「確定状態」を一目で確認するための要約です。新しい仕様判断は含みません（根拠は `docs/DECISIONS.md`）。**§A が現在の正本**。§B 以降は 8/31 Public Beta〜Phase 3（2026-09-06）時点の履歴として残します（当時の Known Non-blockers 1〜16 は §A-4 の生存 Known に統合済み）。

## A. 現在の Production 状態（2026-10-07・決定267 PRODUCTION LIVE / CLOSED）

### A-0. v1.0.1 Fast Gate 公開（2026-10-17・CEO 正式承認「v1.0.1 Fast Gate 単独 Production Release」・決定281 PRODUCTION LIVE）

| 項目 | 状態 |
|---|---|
| **Release** | **SEVEN GODS v1.0.1**（決定281）：★再付番（表示専用）＋語彙補完 案 B＋敵選択注記。engine・rules・カード・敵の行動表は v1.0.0 から不変（gameVersion `1.d794038a00b5b53c` 不変・rank は指紋から除外）。Lane 1 軍略 Pilot／Lane 2 Enemy Break／統合 RC は**含まない**（別 Release・CEO 未承認） |
| **Production HEAD** | master = origin/master **`1ce9876`**（PR #1 merge commit）／RC `feat/v1_0_1-fast-gate-rc` `ccbb664`／runtime を最後に変更した commit＝`c11afa0`（version bump。機能 runtime は `ffea356`） |
| **Vercel deployment** | **`7133236766`**（sha `1ce9876`）／Production bundle `index-B6IYVkjL.js`（467.58 kB）・`index-Cpk4tFE6.css`／Home 表示 `v1.0.1 (1ce9876)`。Production URL https://seven-gods-game.vercel.app/ |
| **Rollback 先** | deployment **`6973326943`**（v1.0.0・`d2135d2`・`index-Da5QBYVM.js`）。Promote は CEO のみ・**演習は未実施**（G15・RL-02） |
| **公開の経緯** | Ruleset `protect-master` 下の正規経路：RC push（CEO）→ PR #1 → CI run 38990577985 GREEN → **CEO merge**（`gh pr merge 1 --merge`）→ Vercel 自動 deploy。AI の `git push`／`gh pr merge` は deny で拒否（決定280）。同梱 docs 5 commit（`dfb8f71`〜`7ba447f`・INCIDENT 記録等）はこの PR で公開 |
| **CI** | PR #1 run 38990577985 GREEN（必須 check `tsc / oxlint / vitest / build`・1m1s） |
| **Release Gate** | `docs/V1_0_1_RC_GATE_CHECKLIST.md` §4 G0〜G10 RC PASS（G6 18/18・G8 44/44）・G11 `c11afa0`・G4/G5 再実行 1,450 PASS／build OK・G12 CI GREEN（evidence `docs/evidence/v1_0_1-rc/`） |
| **Production Smoke** | `docs/V1_0_1_PRODUCTION_SMOKE.md`：S1〜S6 **全 PASS**（S1 11/11×2・S1' 44/44・S2〜S4 PC1508/SP844 勝利＋Resume・S5 4/4・S6 allPass・外部通信 0・console error 0）＋bundle 一致＋混入 0＋S7 旧セーブ互換 **PASS 44/44**（headless shell＋pump・v1.0.0 build 7ba447f の実セーブ 2 種 → Production・PC／SP375 × 通常／神域：Home「続きから」文言一致・残り回数「挑戦する（残り2回）」一致・戦績一致・復元盤面 ラウンド 2／手札 6 一致・battleSave 差分 0・他キー改変 0・外部通信 0・JS error 0・s7-old-save-migration.json＋画像 17）。**未実施（PASS 扱いにしない）**：G14 CEO Human QA 10 分・G15 Rollback 演習・CEO 実機目視 |
| **Known** | 変更なし（K01〜K39 据え置き・新規 0）。K26 の注記：v1.0.1 では gameVersion が変わらないため託宣表の切替は起きない |
| **tag** | `v1.0.1` **未作成**・`v1.0.0` も未作成（CEO のみ・任意） |
| **次 Release 候補** | 軍略 Pilot v1.1 × Enemy Break v1 統合 RC（`feat/combat-pilots-integ-rc`・Gate 11/11 PASS・CEO 公開承認待ち・v1.0.1 の master を merge で追従してから）／v1.0.2 候補＝語彙整合ホットフィックス（初心者監査・保留） |

### A-0b. v1.0.2 統合 RC（2026-10-21・決定282 候補・**READY FOR CEO PRODUCTION RELEASE APPROVAL**・公開 0）

| 項目 | 状態 |
|---|---|
| **RC** | `release/v1_0_2-rc`（worktree `SevenGodsGame-lane2b`・統合 RC `fe1eb37` 起点・master `1ce9876` を merge 済み・conflict 1 解決）。内容＝軍略 Pilot v1.1（`?pilot=threat` 隔離）× Enemy Break v1 ＋ 語彙整合 3 点 ＋ version 1.0.2 ＋ 決定281 記録 docs |
| **不変** | gameVersion `1.d794038a00b5b53c` 不変・save v9 不変・CORE 7 体の HP／行動表 不変・Daily pool／攻略盤 CORE 7 体のまま |
| **Gate** | `docs/V1_0_2_RC_GATE.md` G0〜G12 **13/13 PASS**（vitest 1,504／build 470.72 kB／受入 44/44・74/74・20/20／probe 7 体＋threat 6/6／**Save Migration 44/44**／Home `v1.0.2 (32f7f77)`）・evidence `docs/evidence/v1_0_2-rc/` |
| **公開経路** | CEO：push → PR → CI GREEN → `gh pr merge --merge` → Vercel 自動 deploy → PM：Production Smoke S1〜S7 → 本節を A-0 へ昇格。Rollback 先＝`7133236766`（v1.0.1） |
| **Known** | 変更なし（K01〜K39 据え置き・新規 0）。統合 RC Gate v1 §4 の hard 演出ずれは据え置き |

### A-0a. v1.0.0 正式公開（2026-10-10・CEO 決定「維持」2026-10-10・凍結 2026-10-11・履歴）

| 項目 | 状態 |
|---|---|
| **Release** | **SEVEN GODS：共鳴カードバトル v1.0.0**（決定277 候補 Release Preparation → 決定278 候補 Production Smoke）。内容：CM-01 Public Face・RL-01／01b Save Compatibility・RL-03 CI・A11y Minimum Pack・Legal／Credits（確定文言）・Official Voice Pilot（大耀「あいさつ」）・version 1.0.0。engine・rules・カード・敵は決定267 から不変（`gameVersion` 不変） |
| **Production HEAD** | master = origin/master **`d2135d2`**（version bump `ac126e6`＋docs）。runtime を最後に変更した commit＝`f2366a6`（Credits A-1） |
| **Vercel deployment** | **`6973326943`**（sha `d2135d2`）／Production bundle `index-Da5QBYVM.js`（467.28kB）。Production URL https://seven-gods-game.vercel.app/ |
| **Rollback 先** | deployment **`6894630098`**（sha `641ea5c`＝決定267 Release の Production）。Promote は CEO のみ・演習は未実施 |
| **公開の経緯** | **AI の誤操作による CEO 未承認の `git push origin master`**（2026-10-09 23:48Z・DECISIONS「INCIDENT」行）→ Vercel 自動 deploy → CEO が 2026-10-10 に「維持」を決定。再発防止＝§A-5 と `docs/RELEASE_PROTECTION_V1.md` |
| **CI** | private ミラー `SevenGodsGame-ci` run 38005977044 GREEN（`d2135d2`）／公開元 run 38006192084 GREEN（push と同時） |
| **Release Gate** | `docs/V1_0_RC_GATE.md`：Ranking Absence 18/18・Secret Audit・通し QA 4 viewport・Save Migration（641ea5c → RC）・storage 10/10・A11y 72/72・Credits 40/40・Voice 4/4 |
| **Production Smoke** | `docs/V1_0_PRODUCTION_SMOKE.md`：S1〜S6 **全 PASS**（headless Chromium・PC 1366／1508・SP 390×760／844・外部通信 0・console error 0）。**未実施（PASS 扱いにしない）**：①CEO 実機（iPhone Safari・PC ブラウザ）の目視 ②神託（託宣）の実使用（表示のみ確認） ③BGM／SE の聴感（API 記録で確認） |
| **Known 凍結** | A-4 の K01〜K35 に **K36〜K39 を追加して凍結（CEO 承認 2026-10-11）** |
| **tag** | `v1.0.0` **未作成**（CEO のみ・docs の公開方法確定後） |
| **docs の未 push** | 本記録を含む docs-only commit（INCIDENT 行・Smoke 結果・本行）は **ローカルのみ**。origin への push は Vercel の再 deploy 抑止が確定してから（`docs/RELEASE_PROTECTION_V1.md` §2） |

### A-1. Release Summary（決定267 時点の記録・履歴）

| 項目 | 状態 |
|---|---|
| **Release** | 決定267 Reward Relevance v1「3 役ローテーション」（2026-10-07）。直前＝決定264 Duel HUD v3＋決定266 Viewport Stability（2026-10-05） |
| **Production HEAD** | master = origin/master **`641ea5c`**（docs-only commit）／**RC `12e1ad5`**（`release/d267-reward-relevance-rc`・docs／scripts のみの commit）。runtime（`src/`・`public/`）を最後に変更した master 上の commit＝**`f350726`**（2026-10-07・決定267 battle.css 行末復元）【実測 `git log master -- src public`】 |
| **Vercel deployment** | **`6894408979`**（sha `12e1ad5`）／Production bundle `index-3It0LpNO.js`・`index-CJxzYDUP.css` |
| **Rollback 先** | deployment **`6859615239`**（sha `202e476`＝決定264＋266 Release 後の master。決定266 Release 時の deployment は `6859334890`（RC `46b7fd4`）で、`6859615239` は同じ runtime bundle を配信する**別 id**＝決定267 Release 行（DECISIONS 2026-10-07）に記録された rollback 先）。手順＝Vercel で promote、または master を `202e476` へ revert → push。**演習は未実施**（ROADMAP RL-02・v1.0 前に 1 回） |
| **Production URL** | https://seven-gods-game.vercel.app/ |
| **Quality Gate（決定267 Release Gate）** | tsc 0／oxlint 0／vitest **1,330 PASS・9 skip（意図的 `skipIf`）／110 files**／Playwright acceptance＋migration 10/10／`ranking-absence.mjs` 17 項目／RC と Production の同 seed 一致／Production Smoke 6/6 PASS・製品異常 0 |
| **Commercial RC** | **GO（CEO 決定 2026-10-03）**・RC 基準 runtime `8cba184` → 以後 決定261／264／266／267 を Human QA PASS で追加 |
| **Code Freeze** | なし（CLAUDE.md §6 の AI 自律判断で Narrow Pilot 単位。Human QA Lane は同時 1 本） |
| **進行中（別 Lane）** | **3-Lane 並行（CEO 方針 2026-10-09）**。Lane 1＝**CM-01 Public Face Pack v1 → master 統合済み `ec102ae`（決定268 候補）→ RL-01 Save Compatibility Guard → master 統合済み `c7b225b`（決定269 候補・Production 未反映・push 0）→ Release Safety v1（RL-03 CI 定義・RL-04 playwright 宣言）＋ RL-01b otomo.defId guard → master 統合済み `2bc25ce`（決定270 候補）→ docs 4 本取り込み `d8f9e95`（RL-07：branch push 0 本で足りる）。**CI は未実行（GREEN 未確認・origin push は CEO 承認待ち）**。A11y Minimum Pack v1 → master 統合済み `b04cc42`（決定271 候補・**Human QA 未実施**＝Practical QA v3 に同梱）。BEFORE RELEASE 3 Lane docs → master 統合済み `021795b`（決定272 候補）。Legal／Credits 画面は `feat/legal-credits-screen-v1` `405a86f` で Fast Gate PASS・**文言 CEO 確認待ち・未統合**。実機 QA 計画＝`PRACTICAL_QA_V3_SESSION_PLAN.md`（LAN 4178）。**CI 未実行・master 未 push（push＝Vercel 自動 deploy）**。**NEXT NOW＝CEO 判断 7 件（`RELEASE_GATE_REMAINING_V1.md` §D）**／Lane 2＝Official Voice Pilot v1（大耀「あいさつ」）`feat/official-voice-pilot-v1` `95125e5`・自動 Gate PASS・**CEO Human QA 待ち（master 統合しない）**・`docs/OFFICIAL_VOICE_PILOT_V1.md`／Lane 3＝将軍家 設計 v1 `docs/shogunate-faction-design-v1` `9566a2d`（docs-only・v1.1 候補・runtime 実装なし）。決定263 Threat Shape v1 は **CLOSED NO-GO のまま**（Pilot branch `78ce071` は Evidence 保持）。External Player Feedback：2026-10-07 Human Evidence 受領（OB-05）→ **2026-10-10 Practical QA v3 CEO 実機 QA 完了（`docs/PRACTICAL_QA_V3_RESULT.md`・決定273 候補）**：P1〜P3・Q1〜Q7・Q9 YES・公式ボイス Q8 3／3 PASS → **A 0／B 0（CEO evidence・初見 0 名・D1 未実施）**。DoD #14／#15／#16 を CEO evidence で DONE/master。Legal／Credits 画面（branch `405a86f`）は文言 CEO 確認待ち・Voice Pilot は統合 READY（merge は CEO 承認）。残＝CEO 判断 4 件（文言確定・Voice 統合・CI 初回実行・Release 実行）。NEXT NOW＝RC-2 束ね |
| **次の Release 条件** | `docs/ROADMAP_TO_RELEASE.md` §1〜§4（v1.0.0 = P0 5 束＋DoD 18 項目。※ROADMAP §7 の DoD 18 項目であり、上記「決定267 Release Gate 18 項目」とは別物） |

### A-2. Production に入っている主要機能（決定番号）

8/31 Public Beta（§B）＋ 神階（126）・Game Feel（128）・God Identity（129）・Clean Release／Ranking 完全切断（171／172）・Entrance E1（193／198）・Solve Loop（196）・Interaction Feel（200／202）・Solve Legibility（206／208）・Premium Visual Phase（224〜241：Victory Reveal・SP 舞台レイヤー・Hit Weight・Tap Sound・Dock／HUD Plate・Card Art Window・Cast Flash・Card Travel・Enemy Intent・Toast）・Card Art v2 大耀（243）・Combat Tension v1（246）・PC 敵反転（247）・Reaction Language（249）・God Strike Cut-in v2 大耀（250）・神階 Re-centering（251）・Enemy Ultimate（252）・Oracle Readability（253）・降臨の間（254）・Sound Layer v1（257）・対峙構図 v2（261）・Duel HUD v3（264）・Viewport Stability＋Hand Readability（266）・Reward Relevance v1（267）

### A-3. 閉じたレバー（再開しない・根拠は DECISIONS.md）

BURST 任意発動（127）／Ranking 統合（152・256 NO-GO・READY-DORMANT）／7 OTOMO 展開（214）／龍神 R4 守り（216）／Living Background（219〜222）／Solution Diversity 数値（255）／AP 平準化（260）／Answer Visibility（262）／Late-Round 統合「7R は上限」（恒久方針）

### A-4. 生存 Known Issues（CEO 承認済み・v1.0 までの扱いは ROADMAP の ID）

| Known | 内容 | 分類 | BACKLOG ID（`MASTER_BACKLOG_AUDIT.md` §3。ROADMAP に昇格済みのものは同 ID） |
|---|---|---|---|
| K01 | 入口の JS 予約が重い main thread で ≈230ms 遅れる（映像は時刻どおり） | C・CEO「修正しない」 | BF-04（解除時 1 行） |
| K03／K04 | 初回 duck の経路切替 1 回・iPhone は `volume` 無視（duck 1.0→0.343） | C | — |
| K05 | 向きの残り（笑蓮右向き・才華 keyvisual 鏡像・敵カットイン原画向き） | C | AR-03 |
| K06 | Home が静止 | D | AR-08（背景アニメ方式は 220／222 で終了） |
| K07 | 敵 7 体の画風・接地（Brief v1.1 → CEO 課金判断） | D | AR-01／02 |
| K08／K35 | God Strike Voice／Battle Voice Layer なし | D | BF-02 |
| K09 | Oracle SP の ellipsis・導き候補先頭 1 枚・満タン時 fallback | C | — |
| K10 | 未知 `otomo.defId` の guard なし（発生経路なし・G10 PASS） | C | —（RL-01 は storage version の無言初期化が対象。defId guard は RL-01 実装時に同時検討・未登録） |
| K11 | Daily 神間 spread 13.82%（決定259 PARTIAL） | D | RP-05 |
| K12 | Ranking READY-DORMANT（B1〜B4 未修正） | D | RK-03 |
| K13 | 台帳 UNKNOWN（推測入力を求めない）→ **2026-10-07 CEO 決定「Rights Ledger B 条件付き承認」で UNKNOWN-ACCEPTED として確定**（UNKNOWN＝権利確認済みとは扱わない・Legal／Credits 上の最終扱いは CM-02） | C | CM-04（台帳 §7・`ASSET_RIGHTS_LEDGER_CEO_INPUT_2026-10-07.md` §6） |
| K14 | 作業環境衛生 | C → **2026-10-07 大幅解消**（worktree 73→16・branch 124→46・≈31.5GB 回収。`WORKTREE_BRANCH_CLEANUP_AUDIT.md` §7） | TD-01（main repo 救出は未） |
| K15〜K20 | reader 未撃破 9%・才華×魔獣Ⅵ／Ⅶ・蒼毘×機工師・Ⅶ巨躯・道化 hard 無防御・鬼将 God Strike 率 | C／D（監視） | CF-04（再集計のみ） |
| K21 | 「導き」人間使用率 未観測 → 2026-10-10 QA v3 Q5 YES（託宣の使用タイミングは判断）。導きの使用有無は未記録＝未観測のまま | C | CF-03（Practical QA v3 CEO 実施済み・導き使用は未記録） |
| K22〜K25 | OTOMO 反応 SP 小・dropped frames 2/33・headless 外れ値・ジングル前即停止 | C | K25 → BF-03（RETURN TO CALM）／K22〜K24 → OBS（監視のみ） |
| K26 | 旧セーブの託宣回数（gameVersion 変更時は次ラウンドから新表） | C | — |
| K27〜K29 | Auto Focus 停止位置・道化紅背景の数字コントラスト・Enemy Select cold load 1〜3s・701〜899px 縦スクロール・375px 難易度画面 899px | C | UX-06／BF-07／UX-05／UX-07／UX-02 |
| K30 | Daily 端末時計／localStorage 依存・挑戦状は自己申告 | D | RK-06 |
| K31 | 寿楽一強・共通カード差別化・神技評価偏り・SE 数式合成・Boss Entrance 中カード可・STAKE-01 timeout | C（7・13 は D） | CF-04／BF-01／— |
| K32 | Card Art Unity（60 枚） | D | AR-04 |
| K33 | Card Decision Meaning「手札で戦い方を考える」（262 NO-GO 後 OPEN） | D | **決定263 Human QA NO / NO-GO（2026-10-07）→ OPEN のまま**。Evidence：未来 Threat 可視化は温存行動を生むが、提示量を増やすほど「正解を教えられている」感覚が出る境界を確認 |
| K34 | Character Integration／Duel HUD | **決定264 で主要 4 点 PASS → 残りは接地・枠**（C） | AR-02 |
| 新 | battleSave 以外 13 storage が version 不一致で無言初期化 | **B 相当（version を上げる変更の前に必須）** | **RL-01** |
| 新 | OGP／description／favicon／version 表示なし・Legal／Credits なし | 公開面 | CM-01〜03 |

| **K36** | 公式ボイス：入口を skip しても鳴る（`OFFICIAL_VOICE_PILOT_V1.md` §5 #3・1 回・≤12 秒・ミュートで止まる。CEO Q8 PASS 時に許容） | C | BF-02 系（post-v1.0） |
| **K37** | Credits S6「生成記録が揃っていない素材を制作者の責任で使用」は AI 追加文（事実のみ・禁止語 0。CEO が不要なら 1 行削除＝Fast Gate） | 文言 | CM-02 |
| **K38** | 忠次 Pilot（v0.1〜v0.3）・Card Art Pilot 6 は v1.0 に含まれない（master に `enemy_08`／`shogunate` 参照 0・別 branch） | — | AR-04／将軍家 Pilot |
| **K39** | 公開元 repo の CI は Production 公開と同時に初回実行された（同一 sha はミラーで GREEN 済み・公開元も GREEN）。以後は `docs/RELEASE_PROTECTION_V1.md` の経路で push 前に GREEN を取る | 運用 | RL-03 |

**凍結（2026-10-11・CEO 承認）**：v1.0.0 時点の生存 Known は K01〜K39（CLOSED を除く）。新規の Known は v1.0.x の Decision 行で追加する。

CLOSED（記録のみ）：K02 iOS 割り込み後 BGM 再開（CEO 実機 PASS 2026-10-03）。

### A-5. 運用メモ（現行）

- Release 手順（Ruleset 下・2026-10-17 v1.0.1 で実地確認）：clean RC worktree（master 起点）で Gate 全項を直列 → RC branch を origin へ push（**CEO 実行**・作業 branch のみ・`--no-verify` 不使用）→ PR（本文に Gate 結果・Rollback 先）→ CI GREEN（必須 check）→ **CEO merge**（merge commit のみ）→ Vercel 自動 deploy → Production Smoke（AI）→ Human QA（CEO）→ DECISIONS／RELEASE_STATUS に LIVE 行（docs PR → CEO merge）。直接 push・fast-forward は Ruleset＋pre-push hook＋Claude deny で不可。rollback 先 deployment id を必ず同じ行に記録
- （旧手順・2026-10-10 まで）clean RC worktree で Gate → master fast-forward → `git push origin master` → Vercel 自動 deploy。INCIDENT（2026-10-10）を受けて廃止
- 6GB RAM：Gate と cleanup／simulation を同時に走らせない。worktree は ACTIVE のみ保持（2026-10-07 時点 16 本・内訳は `WORKTREE_BRANCH_CLEANUP_AUDIT.md` §7-5）
- main repo `C:\Users\kimi1\SevenGodsGame` は `feat/d224` で dirty（決定213／224 作業コピー＋CEO 生成 raw 25MB）。**触らない**（救出手順＝同監査 §4-3）
- 除外ローカルファイル（`.claude/settings.local.json`・`敵画像`）は commit しない（本書末尾「Excluded Local Files」参照）
- 正常完了時のみ通知音 1 回

---

## B. 8/31 Public Beta〜Phase 3 時点の記録（履歴・2026-09-06）

## Release Summary（2026-09-06 時点）

| 項目 | 状態 |
|---|---|
| **Release** | SEVEN GODS 8/31 Public Beta |
| **Production HEAD** | `7f4b08a` Merge branch 'feat/god-identity-v0.1' — Phase 3「神格」God Identity v0.1（決定129） |
| **origin/master** | `7f4b08a`（local master と完全一致、ahead/behind 0/0） |
| **Production URL** | https://seven-gods-game.vercel.app/ |
| **Production bundle** | `assets/index-B07HTdRy.js`（376,162B。master のクリーンビルドと**バイト単位で一致**することを本番配信で確認） |
| **Production QA** | 自動化分 PASS（2026-09-06、Phase 3 Production Release Gate）。勝利画面・報酬・Daily・神階の実プレイ確認は検証機のCPU占有により未実施（下記「Phase 3 Production QA」参照） |
| **Final Verdict** | **RELEASED** |
| **8/31 Release Status** | **READY** |
| **Code Freeze** | 解除（80点化計画へ移行。Phase 1「神階」を決定126で採用・本番反映。以後は CLAUDE.md §6 のAI自律判断ポリシーで Phase ごとに進める。PV・BGMは変更しない） |

## Production Release commits（`7f89e9e` 以降）

| commit | 内容 | 決定 |
|---|---|---|
| `8b2a980` | feat: add boss stage backgrounds | 決定124 |
| `b38d1bb` | feat: improve mobile battle action visibility | 決定125 |
| `1aab902` | fix: prevent mobile auto focus after battle end | 決定125フォローアップ |
| `f579eb3` / `c260b07` | docs（RELEASE_STATUS・AI自律判断ポリシー） | — |
| `5552ae4` | feat: add shinkai stake ladder (神階Ⅰ〜Ⅶ) — 80点化計画 Phase 1 | 決定126 |
| `de69404` / `c260b07` | docs | — |
| **`38d706a`** | **feat: add game feel phase (tiered feedback, SE, boss entrance, victory/defeat)** — 80点化計画 Phase 2 | **決定128（AI判断・CEO Audio QA PASS→deploy承認）** |
| `db0ed62` / `aed17b6` / `fd5aeec` / `59a31a2` | feat/fix: god identity v0.1（得意技3種・条件付きカード4枚・カード選択時のボーナス表示・神技評価の表示作り直し） | 決定129 |
| **`7f4b08a`** | **Merge branch 'feat/god-identity-v0.1'** — 80点化計画 Phase 3「神格」 | **決定129（AI判断・CEO Human Play QA PASS→deploy承認）** |

（それ以前：`32697ee` feat: polish enemy select cards（決定123）＝8/31版の基盤、`7f89e9e` docs: mark 8/31 release ready）

## Quality Gate（`38d706a` clean copy＝`git archive HEAD`）

- typecheck（`npx tsc -b --noEmit`）PASS
- lint（`npx oxlint .`）PASS
- tests **50 files / 577 tests** PASS（canonical。作業ツリーで`.claude/worktrees`の古いコピーが混入した件数は公式値ではない）
- balanceSim「STAKE-01」神の公平性ゲート PASS（神階Ⅰ〜Ⅶ×7神×7敵×3戦略）
- production build PASS（`index-BWFlr5zp.js` / `index-BuuelT8Q.css`）
- normal smoke PASS／Daily smoke PASS／Daily e2e（実プレイで決着→Daily Result→戦績）PASS
- 375px focused QA PASS／Desktop 1280 回帰 PASS
- console error 0／HTTP 4xx/5xx 0

## 8/31版に正式採用した機能

| 機能 | 状態 | 根拠 |
|---|---|---|
| Daily Challenge（今日の神域挑戦） | READY | 決定121。JST 0:00切替、週替わりシャッフル、1日3回、★5神域強化（敵HP×1.25／攻撃×1.15）、Seed ID表示、通常戦績と分離、saveVersion 8 |
| BURST Preview（共鳴パネル常時表示）・進行中セーブ破棄前の確認ダイアログ | READY | 決定122 |
| Enemy Select Visual Polish | READY | 決定123。2層カード、アート161px、hover/focusマーカー |
| **7ボス専用Stage Background** | **READY** | 決定124。試練の影=月夜の廃神殿／業斧の鬼将=炎上する鬼ヶ城／藍花の怨霊=紫陽花と彼岸花の幽世／銀甲の機工師=和風機巧工房／双牙の魔獣=月光の霊峰・獣道／蒼海の龍神=荒波の海上神殿／乱舞の道化=妖しい紅色の祭舞台。`public/assets/backgrounds/stages/01〜07.webp`（1600×900 WebP q70、合計1.93MB）。既存hook `EnemyStageDef.bg` → `BattleScreen`の`--stage-bg`をそのまま利用。Normal／Daily共通 |
| **Enemy Selectへの専用背景反映** | **READY** | 決定124。同じ`stage.bg`を`--enemy-stage-bg`として5:4 visual areaに表示（敵artと背景が同化しないことをQAで確認） |
| **Mobile Battle Auto Focus** | **READY** | 決定125。`(max-width:700px)`のみ。**攻撃カード／Multi Hit／BURST／Enemy Attack／Enemy Special**（＋敵ダメージを伴う託宣）で敵パネルへスクロールし演出を可視化、演出後に使用直前のscrollYへ復帰。**Heal／BlockではAuto Focusしない**。復帰待ち中の**ユーザー操作（pointerdown/touchstart/wheel/keydown）でAuto Returnをキャンセル**。**prefers-reduced-motion**はinstant移動（フォーカス自体は維持）。Desktopは完全不変。engine・save・balance不接触 |
| **battle終了後の不要なAuto Focus防止** | **READY** | 決定125フォローアップ（`1aab902`）。勝敗確定後（RewardOverlay/GameOverOverlay表示中）は新しいセッションを開始しない。セッション制御は`autoFocusSession.ts`（node環境の回帰テスト10件） |
| **神階（しんかい）Ⅰ〜Ⅶ** | **RELEASED** | 決定126（Phase 1）。累積制約：Ⅰ参道＝託宣4回＋R5以降 敵ATK+20%＋敵ATK+10%／Ⅱ鳥居＝＋初期手札−1／Ⅲ拝殿＝＋敵HP+10%／Ⅳ本殿＝＋ブロック効率75%／Ⅴ奥宮＝＋回復効率60%／Ⅵ禁足地＝＋必殺・連撃+20%（機工師主砲は+10%上限）／Ⅶ高天原＝＋最終試練の選択（巨躯／猛威／静寂）。難易度「ふつう」固定・神ごと解放（むずかしい1回撃破→Ⅰ）・スコア×(1+0.08×段)・段別ベスト（`sevengods.stakes` v1）・saveVersion 9（v3〜v8連鎖移行）・Dailyとは完全分離 |
| **Seed共有（挑戦状コピー・`?seed=&stake=`）** | **RELEASED** | 決定126。結果画面から段・神・敵・Seed・スコア・URLをコピー。真正性は自己申告 |
| **Game Feel（演出強度4段階・自作SE・BURST READY・Boss Entrance・勝利/敗北演出）** | **RELEASED** | 決定128。与ダメ量で L1〜L4（シェイク・斬撃・数字・SE音量）、自作WAV 20本（`docs/SE_ASSETS.md`、外部素材ゼロ）、7/7到達でゲージ発光＋上昇音、新規開始時の Boss Entrance（約1.5s・操作を奪わない・続きからでは非表示）、撃破の一拍→報酬→「神域制覇」→スコアロールアップ、敗因表示、「自己ベスト更新」は勝利時のみ、reduced-motion 対応。CEO ローカル Audio QA PASS |
| **BURST任意発動** | **不採用** | 決定127（約50,000試合でオラクルでも+0.5pt）。7/7自動発動を維持。カードシナジー＋共鳴経済の再設計時に再検討 |
| PV | VISUAL LOCK / FINAL | v3 FINAL承認済み。変更しない（新背景の収録はPV v2以降） |
| BGM | license verified / unchanged | 決定120 |
| VFX-04 背景ドリフト最適化 | 完了 | 決定119 |

## Production QA（本番URL、2026-08-30 最終）

| 項目 | 結果 |
|---|---|
| Home／God Select（7神）／Difficulty | PASS |
| Enemy Select（8カード・Visual Polish・アート161px・横overflowなし） | PASS |
| Deck（対戦相手チップ一致）／Battle | PASS |
| BURST（プレビュー表示・演出・撃破） | PASS |
| Result（RewardOverlay「報酬カードを1枚選ぼう」） | PASS |
| **Boss Backgrounds** | **7/7 PASS**（Enemy Select Desktop/375・Battle Desktop/375とも正しい専用背景、混線なし、asset 404なし） |
| **Mobile Auto Focus**（375px） | **PASS**（通常攻撃／Multi Hit／BURST／Enemy Attack／Enemy Special の演出がviewport内、Heal/Blockはスクロールなし、手動キャンセル、reduced-motion、BURST撃破後の不要な復帰スクロールなし） |
| Daily（本日ボス・★★★★★神域強化・Seed ID・専用背景・Auto Focus・attempt/score/seedルール不変・**神階非干渉**） | PASS |
| **神階**（未解放表示／到達チップ／Ⅲ選択とふつう固定／HUDタグ／save v9／続きから／勝利→倍率行・突破・段別ベスト・次段解放・挑戦状コピー／もう一度で段維持／戦績／`?seed=&stake=`／Ⅶ3択／375px） | **PASS 21/21** |
| **Game Feel**（Boss Entrance 表示・1.5sで消える・操作非阻害・続きからでは非表示／L2・L4 の段階クラス／7/7 ゲージ発光＋カットイン／撃破の一拍→報酬→神域制覇→スコアロール→自己ベスト／敗因表示・敗北時は自己ベスト非表示／溜め警告音経路／reduced-motion／375px 登場・overflowなし・Auto Focus／SE 20本配信） | **PASS 19/19** |
| 通常モード かんたん／ふつう／むずかしい（神階なし・数値不変）／旧save（v7）→v9移行と続きから | PASS |
| Desktop regression（1280pxでscrollY不変、Enemy Select/Battle 7体） | PASS |
| console error | 0 |
| HTTP 4xx/5xx | 0 |
| BGM home／battle／victory／defeat | 4種とも HEAD 200 |
| Production bundle | `assets/index-BWFlr5zp.js`（clean buildと一致） |

証跡：`Videos/SEVENGODS-PV-REVIEW/gamefeel-phase2/prod/`（feel／flows／stage／mobile／end／stake／daily-e2e／p0）、Phase 1 は `shinkai-phase1/prod/`、8/31版は `prod-final-0831/`・`final-gate-0831/`・`minor-fix-gate/`

## Phase 3 Production QA（本番URL、2026-09-06）

CEO の Human Play QA（蒼毘で神技評価 A／「敵の攻撃の67%を無傷で受け止めた」）で PASS。以下は deploy 後に本番URLで自動確認した分。

- 本番 bundle `assets/index-B07HTdRy.js` が master のクリーンビルドと**バイト単位で一致**（376,162B）
- 旧表示の文字列（`Sまであと` / `Aまであと` / `でB（堂々）` / `神業達成`）は本番 bundle に **0 件**。新表示の文字列（`最高ランク達成！` / `スコアとは別。戦い方で決まります` / 4神の指標名）は全て存在
- ホーム起動／神選択／得意技3種（反撃の構え・大勝負・無傷の慈愛）と神技評価4種の1行説明
- デッキ編成画面での条件付きボーナス表示（Known Risk 1 の修正。`＋ ブロックが敵の予告以上なら、敵に60ダメージ。` ほか）
- 戦闘：敵Intent／7ラウンド・神力逓増／ブロック／託宣／共鳴ゲージ／OTOMO／スコア
- 得意技「反撃の構え」の発動（ブロック130・予告50 → 残り80をそのまま反撃ダメージ）とログ表示
- 条件付きボーナス「不動の構え」（`blocked`）の発動とログ「「不動の構え」の追加効果（予告以上のブロック）」、「一喝」（`enemyBig`）の ⚡/＋ 状態表示
- save/resume（リロード後にホームへ「続きから（蒼毘・ラウンド6）」）
- ページ由来の console error 0／HTTP は 200・304 のみでネットワークエラー 0（記録された警告は MetaMask 拡張由来）

**未実施（本番側の不具合ではない）**：勝利画面の神技評価表示・報酬3択のボーナス表示・Daily・神階の実プレイ確認。検証機で Roblox が全画面かつ CPU を 130〜208%（4スレッド換算）占有し、Chrome タブが `visibilityState: hidden` になって `setTimeout` が集中スロットリングされたため、カード使用の280msアニメーションが解決せず自動操作を完走できなかった。勝利画面の新表示は CEO の Human Play QA で実機確認済み、報酬のボーナス表示は同一の表示関数（`formatCardBonus`）の unit test で担保。

## Known Non-blockers（MINOR / Post-release）

いずれも **8/31 blockerではない**（CEO承認済み）。対応は9月以降。

1. **Mobile Auto Focus の smooth scroll が目標位置（147px）の手前で停止することがある**（本番で196〜254px。ラウンド終了やカード使用直後のレイアウト変更・画像読込との競合）。停止位置でも敵art／HP／予兆／被弾演出はviewport内に収まり、復帰も正常なためRelease許容。**9月：フォーカス約600ms後のsettle/reassert補正（必要ならinstant）を検討**
2. **#7 紅背景（乱舞の道化）で浮遊ダメージ数字（赤文字）のコントラストが低め**。HUDトーストとHPバーで情報は担保。数字への縁取り追加を検討
3. **Enemy Select cold load**：背景7枚（1.93MB）＋敵art（PNGのみ配信の3体）を同時読込するため初回表示が1〜3秒遅れることがある。preload/CSS変更は未追加
4. **復帰位置の scroll anchoring 差**：Auto Focusは使用直前のscrollYへ正確に戻すが、その後のMiniResult消滅・手札枚数変化でブラウザ標準のscroll anchoringにより50〜80px程度ずれることがある（既存挙動）
5. **701〜899px Battle縦スクロール**：PC幅701〜899pxで「ラウンドを終える」まで縦スクロールが必要（決定88で発見、横スクロール・重なりは無し）
6. **Daily Phase 1：端末時計／localStorage依存**（決定121で了承済み。公開ランキング時にサーバー権威へ移行）
7. **寿楽の一強**（神階Ⅶで最良戦略86%、蒼毘・笑蓮は36〜45%）：神階以前からの不均衡。神階のための緊急nerfはせず、次の独立したBalance Phaseで実測＋simulationに基づき扱う（CEO方針）
8. **375pxの難易度画面が812→899px**（神階セレクタ追加分。フレーバー文は畳み済み）
9. **挑戦状の真正性は自己申告**（サーバー無し）
10. **SE は数式合成の自作音源**：収録素材ほどの質感はない（CEO Audio QA では「以前より大幅に良い」でPASS）。有料/収録素材への差し替えは CEO 判断事項
11. **Boss Entrance 中もカードは押せる**（操作を奪わない方針。登場と同時に攻撃すると演出が重なる＝許容）

12. **Gate 3 は WAIVED RISK**（決定129）。PASS とは表記しない
13. **共通カードの差別化は UNRESOLVED RISK**（決定129）。Phase 3 の目標から外したのではなく、未解消のまま正式記録する
14. **大耀の神技評価が C に偏る**（専門プレイでも 52.4% が C）。閾値は変更せず Phase 4 backlog
15. **寿楽の神技評価が敵依存**。Phase 4 backlog
16. **`balanceSim` STAKE-01 の timeout 脆弱性**：`it()` に明示タイムアウトが無く既定 5000ms を使う一方、CPU が空いていても実測 2.4 秒で余裕が約2倍しかない。CPU 高負荷時は超過する（ENVIRONMENTAL TIMEOUT / NON-BLOCKING）。今回タイムアウト値は変更せず **QA infrastructure backlog**

その他：stale `.claude/worktrees`（ローカル作業環境のみ。テスト件数混入の原因、削除は別途）

## Post-release Priorities（9月以降）

### P1（最優先）
0. ~~神階（Stakes）~~ → Phase 1 として RELEASED（決定126）
1. ~~BURST任意発動~~ → 不採用（決定127）。カードシナジー＋共鳴経済の再設計と同時に再検討
2. ~~SE実音源~~ → Phase 2 として自作SEで RELEASED（決定128）
3. **Daily Ranking**（Phase 4 最優先候補）
4. **Visual Quality**（`feat/visual-quality-assets`：敵WebPの再生成。決定129のリリース後対応）
5. Daily共有
6. 戦略深度改善
（＋上記Known Non-blockers 1のsettle補正）

### P2
- 神域行動
- 神バランス
- Mobile 1画面化（Battle redesign。決定125のAuto Focusはそれまでの対策）
- 7神バランス（寿楽一強・蒼毘/笑蓮下位）＝独立したBalance Phase
- 神階の拡張（Ⅴ以上での選択式、曜日Daily階位）
- PV v2（新ステージ背景の収録・9:16版）

## Excluded Local Files（コミット対象外）

- `.claude/settings.local.json`（ローカル設定。git追跡済みだがローカル変更は含めない）
- 未追跡 `敵画像`（ローカルのメモファイル。含めない）

## 8/31当日の運用メモ（決定88の更新版）

- 本番当日は最初に1回だけ`sevengods.*`のlocalStorageを初期化し、以降は削除しない
- デモ用に進行中バトルを仕込む場合は「続きから」で再開する。「神を選ぶ」「今日の神域挑戦」から新規開始しようとすると**確認ダイアログ**が出るため（決定122）、即時消去の事故は起きないが、ダイアログで「破棄」を選ばないこと
- 本番QAではDailyの挑戦回数を消費していない（当日は3回フルに使える）
- スマホ実機では攻撃時に敵パネルへ自動スクロールする（決定125）。演出中に画面を触ると自動復帰は止まる（仕様）
- BGM／SEの可聴性・ミュート切替はCEO実機確認項目（自動化不可）
