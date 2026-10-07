# SEVEN GODS — ROADMAP TO RELEASE（完成までの一本道）

- 日付：2026-10-07
- 種別：**docs-only**（runtime 変更 0・commit／merge／push 0・Decision 番号追加 0）
- 判断主体：AI チーム（CLAUDE.md §6-2）。各 Phase の実装開始・Production 公開・★印の判断は CEO（§6-3）
- 根拠：`docs/MASTER_BACKLOG_AUDIT.md`（112 ID の棚卸し・ID はそのまま参照。2026-10-07 集計訂正・OB-05／OB-06 追記）
- 基準点：Production = master = origin/master **`641ea5c`**（決定267 PRODUCTION LIVE / CLOSED）。別 Lane＝決定263 Threat Shape v1 Pilot（**2026-10-07 CEO Human QA NO / Production NO-GO → CLOSED**・branch は Evidence 保持）・External Player Feedback Audit（2026-10-07 Human Evidence 受領 → OB-05）。**どちらも本書で中断・変更しない**
- ルール：NEXT NOW は常に 1 つ／各 Phase 最大 5 件／Phase を閉じてから次へ（docs-only・git-only の作業は並行可）／Human QA を要する Lane は同時に 1 本（決定263 は 2026-10-07 クローズ → 空き）

---

## 0. 一本道（全体像）

```
NOW ─────────────── 決定263 クローズアウト **完了（2026-10-07 Human QA NO / Production NO-GO）**
                    ＋ docs／git のみの地ならし（RELEASE_STATUS 正本化・main repo 救出・worktree 一覧・台帳 CEO INPUT 依頼）
   ↓
NEXT ────────────── Public Face Pack v1（index.html／public のみ・Human QA 不要）
                    → A11y Minimum Pack（CSS／TSX・Fast Gate）→ Save Compatibility Guard → CI 1 本
   ↓
BEFORE RELEASE ──── Legal／Credits 画面（CEO／専門家文言確定後）・Rollback 演習・SP perf evidence・Practical QA v3（2 戦目の壁／導き／別構成）・CEO 課金判断（敵アート／SE／Voice）
   ↓
RELEASE ─────────── v1.0.0：Release Gate 全項 → Production Smoke → 生存 Known 凍結 → 公開宣言
   ↓
POST RELEASE ────── error reporting ★・敗北 RETURN TO CALM＋K01・神 passive／Mastery 非対称・49 攻略 best・Web Share／X
   ↓
GROWTH ──────────── Daily 神間 spread 是正 → Ranking staged activation（TRIGGER）・God Strike 6 柱／Card Art ★・コミュニティ・KPI ★
```

---

## 1. NOW（今・決定263 を待つあいだに docs／git だけで進めるもの）

| # | タスク | ID | 性質 | 完了条件 |
|---|---|---|---|---|
| 1 | **決定263 Threat Shape v1 クローズアウト**（CEO Human QA Q1〜Q4 → PASS なら Release Gate → Production／NO なら NO-GO 記録。**本書から干渉しない**）— **完了 2026-10-07：Human QA NO / Production NO-GO（Q1 YES／Q2 YES／Q3 YES／Q4 NO）・DECISIONS.md に NO-GO 行・branch は Evidence 保持** | CF-01 | 別 Lane・Human QA | DECISIONS.md に LIVE or NO-GO の行 → 完了 |
| 2 | **`RELEASE_STATUS.md` 正本化**（Production HEAD `641ea5c`・runtime・Vercel deployment／rollback id・生存 Known 一覧 K01／K10／K11／K12／K14／K32〜K35・Code Freeze 欄）— **完了 2026-10-07（§A）** | RL-02（前半） | docs-only | 1 ファイル更新・CEO 確認不要 → 完了 |
| 3 | **main repo 救出**（`feat/d224` の dirty 12 files を patch 保存 → branch に commit → main repo を master へ。push 不要） | TD-01 | git-only・runtime 0 | `git status` clean・patch ファイルの所在を記録 |
| 4 | **worktree 整理の一覧提示**（`WORKTREE_BRANCH_CLEANUP_AUDIT.md` の分類で提示。**削除実行は CEO 確認** ★ §6-3 #9）— **完了 2026-10-07：worktree 73→16・branch 124→46（同監査 §7）** | TD-02 | git read-only → CEO 承認後 prune | 一覧 docs 1 本・CEO「承認／拒否」 → 完了 |
| 5 | **権利台帳 CEO INPUT 依頼**（UNKNOWN 欄・AI 生成素材規約 #2／#6 の最終 Status を §6-4 形式で 1 枚にまとめて提出） | CM-04 ★ | docs-only | CEO 回答 → 台帳反映 |

NOW の 2〜5 は決定263 Lane と接触しない（docs／git のみ・`src` 0・Human QA 0）。External Feedback Lane の結果が来たら、その findings を `MASTER_BACKLOG_AUDIT.md` §3 に ID 付きで追記する（新 Phase は作らない）。**2026-10-07 受領：** Discord 紹介動画公開後の初心者層（ゲームに不慣れな女性プレイヤー複数名）から「やってみたけど少し難しい」→ OB-05（Evidence・原因未特定）／OB-06（候補 First Battle Guidance v1）として追記済み。runtime 変更 0・NOW 1（決定263 Human QA）は継続・新 Phase なし。

---

## 2. NEXT（決定263 クローズ後に runtime へ着手。各 Fast Gate 型・順序固定）

| # | タスク | ID | 範囲 | Gate／QA | 完了条件 |
|---|---|---|---|---|---|
| 1 | **Public Face Pack v1** — meta description／OGP（title・description・image=既存 keyvisual-hero 流用・url）／twitter:card／theme-color／apple-touch-icon／manifest 最小／**ブランド favicon**（既存 Kit 正典素材 or 「七」モチーフ SVG・新規生成なし）／アプリ内 version 表示（`package.json` 0.0.0 → `1.0.0-rc.1`・Vercel `VITE_` 経由の短 sha を Home 隅と Feedback snapshot に） | CM-01 | `index.html`・`public/`・`package.json`・Home 1 行・Feedback 1 行。**`src/core` 0・CSS ほぼ 0** | 自動：OGP バリデータ相当の静的検査・CLS 0・bundle 差分。**Human QA 省略可**（決定247 型） | Production で挑戦状 URL が X／Discord でカード表示される |
| 2 | **A11y Minimum Pack** — 神 HP contrast 4.5／stepper・託宣ボタン 44px／Tutorial Esc＋focus trap／音量 or BGM・SE 個別 OFF ＋ a11y 基準文書 1 本 | A11Y-01／02 | CSS／TSX のみ・`src/core` 0 | 画素 contrast 計測・44px 監査（`release-hygiene` 再利用）・Human QA 1 問（iPhone「音量を下げられたか」） | 基準文書の全項目 PASS |
| 3 | **Save Compatibility Guard** — storage version ポリシー docs 固定（「上げるなら migration 必須・上げないなら追加のみ互換」）＋全 14 storage の旧 version／future version 読み込みテスト（`migration.mjs` 拡張・vitest 単体） | RL-01 | `src/hooks/*Storage.ts` の読み込み経路のみ・保存形式不変・saveVersion 9 不変 | vitest＋migration.mjs 全 storage PASS・続きから PASS | 「version を上げても戦績・絆が消えない」が機械証明される |
| 4 | **CI 1 本＋playwright 宣言** — GitHub Actions（PR：tsc／oxlint／vitest。Playwright・sim は含めない）＋`devDependencies` に playwright | RL-03／04 | `.github/workflows/*.yml`・`package.json` | Actions 緑 1 回 | master への PR で自動 Gate が走る |
| 5 | **docs 系 branch の push**（unmerged docs 14 本・決定209〜267 系譜の保全） | RL-07 | git-only | `git branch -r` に反映 | 単一 PC 依存の解消 |

**Human QA は 2 の 1 問のみ**。1・3・4・5 は自動 Gate で閉じる。

---

## 3. BEFORE RELEASE（v1.0.0 の前に揃えるもの・CEO／専門家 INPUT を含む）

| # | タスク | ID | 誰が | 完了条件 |
|---|---|---|---|---|
| 1 | **Legal／Credits 画面**（著作権表記・「非公式二次創作」明示の要否・SGG Kit／Suno BGM／自作 SE クレジット・プライバシー最小「localStorage のみ・外部送信 0」・問い合わせ先）— 文言 ★ CEO／専門家 → 実装は静的 1 画面（Home footer リンク） | CM-02／03 | 文言＝CEO／専門家・実装＝AI | CEO 承認文言が Production に表示 |
| 2 | **Rollback 演習 1 回**（直前 deployment を promote → 戻す。記録のみで未演習）＋ Day-1 運用メモ更新 | RL-02（後半） | AI 実行・Production 操作は ★ #8 承認 | 演習ログ 1 本 |
| 3 | **SP 実機 perf evidence**（Lighthouse mobile 1 run・別日単独 or CEO iPhone 体感 3 問）＋ Enemy Select preload（結果次第） | PF-01／UX-05 | AI＋CEO 端末 | 数値 1 セット記録・preload 要否の判定 |
| 4 | **Practical QA v3（1 セッション・CEO）**：「初陣後に自力で 2 戦目を始められたか」「託宣を温存する判断があったか／導きを使ったか」「構成を変えて勝ち方が変わったか」「Android or 別ブラウザで 1 戦（互換 Smoke）」 | UX-01／CF-03／RP-02／RL-05 | CEO | 4 問の YES／NO と Triage（§1 ルール：A／B 0 が条件） |
| 5 | **CEO 課金・素材判断（§6-4 形式で 1 枚）**：敵アート再生成（Brief v1.1）／SE 実音源／God Strike Voice — **GO なら実施、NO なら Known のまま公開**。いずれも Release 条件にしない（10/03 RC GO の D 分類を維持） | AR-01／BF-01／BF-02 ★ | CEO | 承認／拒否の記録 |

---

## 4. RELEASE（v1.0.0）

| # | タスク | 完了条件 |
|---|---|---|
| 1 | clean RC worktree で **Release Gate 全項**（決定267 Gate 18 項目＋AC を再利用・1 browser 直列・RAM 配慮）＋ `ranking-absence.mjs` 17 項目 | PASS・Blocker 0 |
| 2 | **Production Smoke**（Home／初陣／Daily／続きから／挑戦状 URL の OGP 表示／Legal 画面／version 表示） | 全 PASS・console error 0 |
| 3 | **生存 Known Issues の凍結**（`RELEASE_STATUS.md` の一覧を v1.0.0 の既知課題として CEO 承認） | CEO 承認 |
| 4 | `package.json` **1.0.0**・git tag `v1.0.0`・DECISIONS.md に「正式公開」行（AI 記録・公開は CEO ★ #8） | tag＋行 |
| 5 | **公開宣言**（タイトル／1 行説明／挑戦状 URL を X 等へ。文面は CEO） | 投稿 1 本 |

---

## 5. POST RELEASE（公開後 2〜4 週・runtime 小改善）

| # | タスク | ID |
|---|---|---|
| 1 | error reporting（Sentry 等 ★ 外部サービス）＋ Battle 境界 ErrorBoundary | CM-05／RL-06 |
| 2 | 敗北 RETURN TO CALM（S2）＋ K01 `performance.now()` 1 行（CEO 解除時） | BF-03／04 |
| 3 | 神 passive 3/7・Mastery 4/7 の非対称を確定（解消 or 意図的非対称の明記）＋「仮値」注記 4 件の確定 | CF-02／CC-01 |
| 4 | 49 攻略の best score／撃破 R 化＋Result 前回比 1 行（RL-01 のガードが前提） | RP-01 |
| 5 | Web Share API＋X intent＋Feedback 送信先（Discord 等 ★） | SG-02〜04 |

---

## 6. GROWTH（運営・拡張）

| # | タスク | ID | 前提 |
|---|---|---|---|
| 1 | **Daily 神間 spread 是正**（決定259 残り・候補 24 案の比較。RAM ≥700MB／約 2h の枠を分割して実行） | RP-05 | Ranking TRIGGER の前提条件。sim 分割設計は Planner |
| 2 | **Ranking staged activation**（TRIGGER＝Daily 常連 evidence → identity（匿名 ticket）→ submit → leaderboard。純部品のみ移植・whole merge 禁止・B1〜B4 修正・QA URL param ガード） | RK-01〜06／11・TD-07 | KPI or Feedback evidence ★・Neon／identity／privacy ★ |
| 3 | God Strike 動画 6 柱展開／Card Art Unity／OTOMO 640px ★（課金） | BF-05／AR-04／05 | CEO 課金判断 |
| 4 | コミュニティ（Discord・スコアカード画像・Daily Tease・community challenge） | SG-05／06・RP-06 | Ranking 前でも 1〜2 件は可 |
| 5 | KPI 3 本の導入判断 ★・多言語化・PWA | RK-01／CM-08／RL-09 | 外部サービス＝CEO |

---

## 7. Definition of Done（これを全部満たせば SEVEN GODS を「完成」扱いにしてよい）

**A. 遊び（既に満たしている・維持条件）**
1. Primary Fun「読む→組む→決まる」：Practical QA の critical 設問（Q2「予告を読んで手が変わる」／Q7）が NO 0（決定244〜267・10/03 RC GO で達成済み）
2. 7 神×7 敵×難易度 3＋神階Ⅶ×Daily が全て到達可能・determinism（同 seed 同結果）が機械検査 PASS（`sameSeedRetry`／`replayBoundary`／決定256 parity）
3. 決定263 が LIVE か NO-GO のどちらかで **記録済み**（宙に浮いた Pilot が 0）
4. 閉じたレバー（§4 DO NOT RESURRECT）を新 evidence なしに再開していない

**B. 公開面・権利（P0）**
5. OGP／description／ブランド favicon／version 表示が Production で確認できる（CM-01）
6. 著作権表記・クレジット・プライバシー最小・問い合わせ先が CEO／専門家承認の文言で表示されている（CM-02／03）
7. 権利台帳：配信 asset 全行に Status があり、UNKNOWN 行は「CEO 承認のうえ維持」か「配信除外」のどちらかが記録されている（CM-04）
8. 課金・広告コード 0（P14）

**C. 運用の安全網（P0〜P1）**
9. 全 14 storage に version ポリシーと旧／future version 読み込みテストがあり、「version 変更で戦績・絆・49 攻略が消えない」が機械証明されている（RL-01）
10. `RELEASE_STATUS.md` が Production HEAD と一致し、生存 Known 一覧が CEO 承認済み（RL-02）
11. Rollback を 1 回実演した記録がある（RL-02）
12. CI（tsc／oxlint／vitest）が PR で自動実行される（RL-03）
13. main repo が master・worktree が ACTIVE のみ（or CEO 承認の残置一覧）・docs 系 branch が origin に存在する（TD-01／02・RL-07）

**D. 品質の最低ライン（P1）**
14. a11y 基準文書（AA 4.5／44px／reduced-motion／音量）が存在し全項目 PASS（A11Y-01／02）
15. SP 実機 perf evidence が 1 セット存在する（PF-01）
16. 「2 戦目の壁」「託宣温存／導き」「別構成で勝ち方が変わる」の Human QA が 1 回ずつ記録されている（UX-01／CF-03／RP-02）
17. 敵アート／SE 実音源／Voice について CEO の **GO か NO** が記録されている（実施は条件にしない）（AR-01／BF-01／02）

**E. 完成の宣言**
18. `package.json` 1.0.0・tag `v1.0.0`・DECISIONS.md「正式公開」行・公開投稿 1 本

**DoD に含めないもの（意図的）**：Ranking（READY-DORMANT・TRIGGER 条件付き Growth）／Daily 神間 spread（Ranking 前提）／God Strike 6 柱・Card Art Unity（課金）／多言語／PWA／OTOMO 7 展開（決定214 NO-GO）／Home の動き（決定220／222 で終了）。

---

## 8. CEO 判断が必要になる地点（先に一覧・各 1 枚 §6-4 形式で提出予定）

| 時点 | 判断 | §6-3 |
|---|---|---|
| NOW | worktree 削除承認（一覧提示後）— **承認・実施済み 2026-10-07（73→16）** | #9 |
| NOW | 権利台帳 UNKNOWN 欄の INPUT／維持承認 — **2026-10-07 CEO「Rights Ledger B 条件付き承認」＝UNKNOWN-ACCEPTED で確定（台帳 §7）** | #5 |
| BEFORE RELEASE | Legal／Credits／プライバシー文言（専門家確認含む） | #5 |
| BEFORE RELEASE | 敵アート再生成／SE 実音源／Voice の GO・NO（課金） | #5／#6 |
| BEFORE RELEASE | Rollback 演習の Production 操作 | #8 |
| RELEASE | v1.0.0 Production 公開・公開宣言 | #8 |
| POST RELEASE | error reporting・Feedback 送信先の外部サービス | #6／#7 |
| GROWTH | Ranking TRIGGER 判定・Neon／identity／privacy・KPI | #6／#7 |

**それ以外（Public Face Pack・A11y Pack・Save Guard・CI・docs 正本化・main repo 救出・QA 設問追加）は §6-2 の AI 判断で進め、結果を DECISIONS.md に AI 判断として記録する。**

---

## 9. 推奨：次に実行するタスク（1 件）

**「Public Face Pack v1」（CM-01）** — 決定263 クローズアウト完了（2026-10-07 NO-GO）により **着手可（NEXT NOW・CEO 指示 2026-10-07）**。順序：Public Face Pack v1 → Save Compatibility Guard → Release Safety → Practical QA v3 → v1.0。runtime 変更前に Closeout 状態と master／origin 状態を報告する。

理由【AI 判断】：
- P0 のうち **唯一 CEO／専門家 INPUT なしに AI チームだけで完了**できる（CM-02〜04 は文言・権利の CEO 確認待ち、RL-01／02 は NOW の docs 正本化を先に済ませてから）
- 変更範囲が `index.html`／`public/`／`package.json`＋Home・Feedback 各 1 行で、**決定263 Lane（`src/components/battle`・`src/core`）と物理的に接触しない**
- 挑戦状 URL（決定126）が既に SNS へ出る設計なのに無地カード＝Growth の入口が閉じている。効果は即日・外部から観測可能
- Human QA 省略可（決定247 型 Fast Gate）・rollback は revert 1 commit・RAM 負荷なし

却下した代替案：A11y Pack（価値は高いが Human QA 1 問が要り、決定263 と Lane が競合）／Save Guard（RELEASE_STATUS 正本化と生存 Known 確定の後の方が range が確定する）／敵アート（CEO 課金判断待ち）／OTOMO Stance Release（CEO「merge 禁止」継続・決定214 境界）。
