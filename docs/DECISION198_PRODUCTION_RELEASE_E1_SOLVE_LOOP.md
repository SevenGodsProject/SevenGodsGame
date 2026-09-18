# 決定198 — Entrance E1 ＋ Solve Loop v1 Production Release：PRODUCTION LIVE — PASS

- 日付：2026-09-19（push 00:04:43 JST・新バンドル配信確認 00:05:44 JST）
- Production commit：**`3b416da`**（master ＝ origin/master。監査済み RC `release/e1-solve-loop-rc` を ff）
- 監査対象 runtime：`442fa9f`（`3b416da` との差分は docs／scripts のみ・`src` 差分 0）
- 判定：**PRODUCTION LIVE — PASS**（CEO 承認：2026-09-18 決定197 Release 承認。Release Gate と Production QA の各判定は **AI判断**）
- 上流：決定193（E1）、決定196（Solve Loop v1）、決定197（Release Gate PASS）
- Rollback：**不要**

---

## 0. 結論（先に）

| 項目 | 結果 |
| --- | --- |
| Production deploy | GitHub deployment `6527081326`（sha `3b416da`）success。Vercel 自動 deploy |
| RC / Production byte 比較 | `index.html`・`index-BUQ9H7AZ.js`・`index-CPcxsOSa.css` の sha256 が **3/3 一致** |
| Production への追加修正・再 deploy | **0** |
| 並列 QA で観測した揺らぎ | E1 AC9・E1 AC21・通し QA PC 2 viewport の timeout → **単独再実行ですべて PASS・再現なし**（§3） |
| 単独再実行（順番に 1 本ずつ） | ①通し QA PC2 **PASS** → ②E1 受け入れ **ALL PASS** → ③AC9 **PASS** → ④AC21 **PASS** |
| Solve Loop 受け入れ（Production） | 再実行 **17/17 PASS** |
| Hardening（Production） | **ALL PASS** |
| 統合仮説（初陣→敗北→同じ盤面） | 初回 14/14・単独再実行 **14/14** |
| 画面スモーク（Production） | 404 0・JS error 0・壊れた画像 0 |
| CLS（Production） | PC 0.0074／SP 0.0478、44px 未満 0 |
| Ranking／Neon／secrets | `/api/ranking/*` は Production で **404**、dist に `/api/`・neon・env 参照 0、env commit 0 |
| Save Migration | 決定197 で Production LIVE（`88ca430`）→ RC を実測済み。runtime は byte 一致のため結果は Production に引き継がれる |
| console error／外部通信 | 全スイート **0** |
| Rollback | **不要** |

---

## 1. Release 実施記録（決定197 Exact Release Plan どおり）

| 手順 | 実施 | 実測 |
| --- | --- | --- |
| 事前実測 | branch `release/e1-solve-loop-rc` `3b416da`、master＝origin `88ca430`、staged 0・modified 0、`git fetch` 後もリモート差分なし | ✅ |
| Production 現状記録 | 配信中バンドル `index-BJC-pvmE.js`／`index-2sSahltn.css` | 記録 |
| master ff | `git switch master` → `git merge --ff-only release/e1-solve-loop-rc` → master `3b416da` | ✅ |
| push | `git push origin master`（`88ca430..3b416da`）2026-09-19 00:04:43 JST | ✅ |
| deploy 監視 | 10 秒間隔でポーリング。00:05:32 は旧バンドル、**00:05:44 に `index-BUQ9H7AZ.js` を配信**。GitHub deployments API：`6527081326` `3b416da` Production success | ✅ |
| byte 比較 | ローカル `npm run build`（master `3b416da`）の dist と Production を sha256 比較：`index.html` `7cc7b2a9…`／JS `ba379a57…`／CSS `97af5534…` **一致** | ✅ |
| Hero 画像 7 柱 | すべて 200（恵比寿 523,108B・笑蓮 129,620B ほか） | ✅ |

Deploy Timing 制約：`gameVersion` `1.80c6eda23ed082dc` 不変のため JST 00:00 制約は該当なし（Daily は 00:00 に通常どおり `試練の影` へ切り替わり、QA でも「今日の神域挑戦：試練の影（残り3回）」を確認）。

---

## 2. Production QA（第 1 巡・6 スイート並列）

| スイート | 結果 | 備考 |
| --- | --- | --- |
| Solve Loop 受け入れ | 15/17 → 再実行 **17/17** | AC3-1/3-2「勝利」シナリオで自動プレイが**敵 HP 40/1,000 で惜敗**し、製品は正しく「同じ盤面でもう一度」を出した（スクリーンショットで 敗北・あと一歩・R4 110 ダメージを確認）。再実行では勝利し seed 変化・文言「同じ構成でもう一度」を確認 |
| Hardening 受け入れ | **ALL PASS** | 2 viewport・10 シナリオ・JS error 0 |
| 統合仮説 `thesis.mjs` | **14/14** | 初陣→敗北→同 seed・同手札・同予告（PC/SP）、初陣→勝利→新 seed |
| 画面スモーク | 404 0・JS error 0・壊れた画像 0 | PC/SP 各 9 画面 |
| CLS／44px | PC 0.0074／SP 0.0478・44px 未満 0 | 決定170 と同水準 |
| 通し QA | SP 2 viewport 勝利・PC 2 viewport **timedOut** | PC は R5・敵 HP 600/1,000・予告表示・手札 5 枚の正常な戦闘中にスクリプトの時間予算が尽きた。セーブは R5 で保存済み・JS error 0・外部通信 0 |
| E1 受け入れ | AC9・AC21 **FAIL**、他 ALL PASS | AC9：初陣まで 16.4〜28.9 秒（閾値 15 秒）。AC21：初陣勝利シナリオが決着せず null |

---

## 3. 揺らぎの分離（AC9／AC21／PC timeout）

### 3-1. 単独再実行（並列なし・順番に 1 本ずつ）

| 順 | スイート | 結果 |
| --- | --- | --- |
| ① | 通し QA（4 viewport） | **PASS**：4 viewport とも通常戦 勝利 R4（timedOut=false）、神域挑戦 勝利「今日のベスト 7,320（1回目）残り 2 回」、敗北シナリオ 敗北、`/api/` 0・外部 0・エラー 0、「続きから 大耀 vs 業斧の鬼将・ラウンド2」再開 OK |
| ② | E1 受け入れ（4 viewport） | **ALL PASS**（AC1〜AC25b・EXTRA-1） |
| ③ | AC9 単独 | **PASS**：初陣まで pc1366 3.6 秒／pc1508 4.5 秒／sp760 5.6 秒／sp844 6.1 秒。人の見積 42〜44 秒（目標 60 秒）。console error 0・スクロール必要 0 |
| ④ | AC21 単独（E1 スイート内＋統合仮説の単独再実行） | **PASS**：pc1508／sp844 とも 勝利・報酬確定・戦績（恵比寿 wins 1・fastestWinRound 6・best 800／828）・初撃破「✨ 初撃破：恵比寿 × 試練の影（この敵 1/7 神）」・再戦条件 `ebisu／enemy_01／normal`・Daily 回数 0 |

### 3-2. AC9 の要因分離

| 要因 | 判定 | 根拠 |
| --- | --- | --- |
| Product failure | **否** | 単独では 3.6〜6.1 秒（RC preview の 4.3〜8.0 秒と同水準）。画面遷移・console・network・最終 state に異常なし。バンドルは RC と byte 一致 |
| Network / Vercel latency | **否** | curl 3 サンプル：`/` TTFB 0.10〜0.14 秒、JS（432KB）合計 0.10〜0.13 秒、CSS 0.10〜0.14 秒、Hero 523KB 合計 0.15〜0.22 秒 |
| Browser automation overhead | 小 | 単独時でも「初陣へ」→「出陣する」に 1.3〜2.5 秒、→ 手札に 1.1〜2.6 秒（Playwright の固定 wait とアニメーション待ち） |
| **QA machine load** | **主因** | 第 1 巡は 6 スイート（Chromium 6〜8 プロセス）同時実行。同じ手順が 16〜29 秒に伸び、単独で 3.6〜6.1 秒に戻った。通し QA PC の timeout も同時刻・同条件でのみ発生 |

15 秒閾値は自動操作の目安であり、Product defect ではない。**分類：test（環境）defect**。

### 3-3. AC21 の記録（単独・統合仮説シナリオ）

| viewport | 勝敗 | round | seed（初回 → 再戦） | 初期手札 | 予告 | Result state | 次盤面 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pc1508 勝利 | 勝利 | R6 撃破（戦績 fastestWinRound 6） | `seed-1789747248397` → `seed-1789747280737` | 🌿恵比寿顔／🌟小さな託宣／🛡守護／⚔大漁／⚔剛撃 | ⚔ 50 | Primary「今日の神域挑戦へ」・再戦「同じ構成でもう一度」 | **新 seed** |
| sp844 勝利 | 勝利 | R6 撃破 | `seed-1789747310002` → `seed-1789747350242` | 🌟神託／🌿福授け／⚔潮招き／⚔一撃／⚔剛撃 | ⚔ 50 | 同上 | **新 seed** |
| pc1508 敗北 | 敗北 | – | `seed-1789747222983` → 同一 | 🌟予言／🛡守護／🌿福授け／⚔一撃／✨共振 | ⚔ 50 | Primary「同じ盤面でもう一度」・目標「試練の影を撃破する（残りHP 100%）」 | **同一 seed・同一手札** |
| sp844 敗北 | 敗北 | – | `seed-1789747285122` → 同一 | ⚔渾身の一撃／⚔潮招き／⚔剛撃／✨共振／⚔一撃 | ⚔ 50 | 同上 | **同一 seed・同一手札** |

第 1 巡の AC21 null は「自動プレイヤーが時間予算内に決着に到達しなかった」もので、製品不具合ではない（同時刻の PC timeout と同因）。

---

## 4. Ranking / Neon / secrets 不混入（Production）

- `https://seven-gods-game.vercel.app/api/ranking/leaderboard` → **404**、`/api/ranking/start` → **404**
- 決定197 の Ranking Absence Gate 18/18 PASS の dist と Production が byte 一致
- `feat/daily-ranking-phase4` `762168f` 不変・未参照。Neon 接続・設定・出力 0。`.env` commit 履歴 0
- 通し QA・E1・Solve Loop・Hardening の全リクエスト記録で `/api/`・外部オリジン **0**

---

## 5. Git 最終状態

| 項目 | 値 |
| --- | --- |
| master ＝ origin/master | `3b416da`（Production） |
| release/e1-solve-loop-rc | `3b416da`（master と同一） |
| feat/entrance-e1 / feat/solve-loop-v1 | `1cba2e6` / `3ddcdbf`（不変・master に包含済み） |
| feat/daily-ranking-phase4 | `762168f`（不変） |
| 本 Decision の docs commit | master にローカル commit。**push は行わない**（push は Vercel の再 deploy を伴うため「再 deploy 禁止」に従い CEO 指示待ち。バンドルは `docs/`・`scripts/` が配信対象外のため push しても byte 同一になる見込み） |
| 既存 untracked | 決定194・195 docs 4 本・cinematic feasibility・`敵画像`・phase3-audit 出力・QA スクリーンショットは変更・stage・commit していない |

---

## 6. 判定

**決定198：PRODUCTION LIVE — PASS。Rollback 不要。**

Entrance E1（決定193）と Solve Loop v1（決定196）は Production `3b416da` で稼働中。次 Phase（Interaction Feel／Solve Legibility／Living Hero／OTOMO ほか）には着手していない。
