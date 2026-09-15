# 敵ビジュアル世代A 統合 Production Release Candidate — Integrated Release Gate（決定184）

- 実施日：2026-09-16
- branch：`release/enemy-gena-final-rc`（`master 8256b60` から分岐。**master へ merge していない・push していない・deploy していない**）
- 性質：**統合RC作成＋最終統合QA ONLY**。CEO Final Visual QA「Generation A 4体すべてOK」（2026-09-16）を受けた次Step。**Production Release承認ではない**
- 判定：**PASS — READY FOR CEO PRODUCTION RELEASE APPROVAL**

---

## 1. State Audit（開始時点）

`master`＝`origin/master`＝`8256b60`、tracked差分0。juuma Production asset `4356913d…`（768×768・158,262B）は変更禁止で据え置き。3つのRC（oni `feat/enemy-oni-m4-rc` `5d3ef85`／ryujin `feat/enemy-ryujin-m4i-rc` `5077849`／onryo `feat/enemy-onryo-m4i-rc` `717a436`）のHEADとassetハッシュを再照合し、すべて指定値と一致。

## 2. Integration Strategy（branch merge なし）

各RC commitの内容を `git show --stat` で事前監査し、いずれも「Production asset 1／provenance webp 1／RC doc 1／`art-source/README.md` +1行／`docs/DECISIONS.md` +1行」のみであることを確認したうえで、**path-scoped extraction**（`git checkout <commit> -- <path>`）で asset・provenance・RC doc を個別に取り込んだ。`README.md`／`DECISIONS.md` は各RCの追加行（計3行ずつ）を抽出して master 版へ追記。`feat/daily-ranking-phase4` および3つのRC branch 本体は **一切 merge していない**。

## 3. Production Payload（`master 8256b60` との差分 11 files・+586／−0）

| 分類 | ファイル |
|---|---|
| **runtime Production asset（3件のみ）** | `public/assets/enemies/oni/art_hq.webp`（81,192→123,010B）／`public/assets/enemies/ryujin/art_hq.webp`（95,448→173,286B）／`public/assets/enemies/onryo/art_hq.webp`（79,950→147,326B） |
| provenance（配信対象外） | `art-source/enemies/{oni,ryujin,onryo}-restoration-pilot/*.webp`（3件・新規）、`art-source/README.md`（+3行） |
| docs（配信対象外） | `docs/ENEMY_GENA_{ONI_M4,RYUJIN_M4I,ONRYO_M4I}_RC.md`（3件・新規）、`docs/DECISIONS.md`（決定181/182/183の3行＋本決定184）、本書 |
| unexpected | **0** |

`src/`／CSS／`api/`／`vercel.json`／`index.html`／`package.json`／lockfile／`vite.config.ts`：**変更0**。

## 4. Asset Hash Verification（統合branch上・実ファイル）

| enemy | dimensions | aspect | bytes | sha256 | 判定 |
|---|---|---|---|---|---|
| juuma | 768×768 | 1.0000 | 158,262 | `4356913d2c9bdeeae1be34ba6a4beece15339d93ee540a6583bfca9abc3b196a` | Production同一（変更0） |
| oni | 768×768 | 1.0000 | 123,010 | `6c25cdb815e2cb0a48277d51f9f8f74940e84f281c9a6a3b8554942968bd18ca` | 決定181 RC一致 |
| ryujin | 768×768 | 1.0000 | 173,286 | `76266bb4344e1f070c7417c5cbf5b6c0c663cfe331210d3bfd06bd28d33ddb6e` | 決定182 RC一致 |
| onryo | 576×768 | **0.7500** | 147,326 | `962040549a488436b100512fe55be52a1f2bb3ce6fd618cd40ab7164be0f7d59` | 決定183 RC一致 |
| datenshi／karakuri／doukeshi | 768×768 | — | — | `29202bed…`／`d879f1e9…`／`5ecf7249…` | masterとbyte一致（変更0） |

各敵の `art.png`／`art.webp`（旧世代・非配信参照）もmasterとbyte一致。

## 5. Full Regression（`npm ci` clean install → clean build）

- typecheck：`tsc -b` **0 error**
- lint：`oxlint` **0 error**（既存 warning 9・`scripts/` の監査ツールのみ）
- tests：**3,041 passed／9 skipped／0 failed**（241 files）
- build：成功
- **bundle byte-identity（統合前 master build と比較）**：`index.html` `2ace0eaf…`／`index-CLclgl5i.js` `95d062cd…`／`index-IKMGO-ur.css` `7b220d3a…` — **3ファイルとも byte 完全一致**（これは決定178/180 で記録された Production 配信 bundle と同一ハッシュ）。dist 全体の差分は oni／ryujin／onryo の `art_hq.webp` 3件のみ
- gameVersion `1.80c6eda23ed082dc` 不変（`gameVersion.test.ts` passed）、saveVersion **9** 不変

## 6. Ranking Absence Gate（`scripts/release-audit/ranking-absence.mjs`）

全項目 **PASS**：ranking backend files 0／client・ticket・leaderboard files 0／Phase4 scripts・docs 0／SQL・migrations 0／Neon・postgres・pglite 依存 0／lockfile neon 0／src 非同一オリジン通信 0／`/api/` literal 0／ranking env var 0／removed module import 0／`submissionEnabled === false` 1（expect 1）／`submissionEnabled: true` 0／dist `/api/` 0／dist neon・postgres 0／dist `DATABASE_URL`・`RANKING_`・`NEON_` 0／dist fetch（modulepreload・SE以外）0／dist ranking path 0／dist `submissionEnabled:!0` 0。Ranking UI：dist内の「ランキング」語は RecordScreen の「ランキングやオンライン通信はありません」文言の1件のみ（master同一）。

## 7. Neon / Security Gate（件数のみ・値は表示しない）

Neon／postgres：tracked 非test・非docs・非scripts で **1件**（`src/core/data/rules.ts:291` のコメント文「Neon Free の CU-hours…」＝散文・identifier、master と同一、dist では0件）／`DATABASE_URL` 0／preview bypass secret 0／credential-format value 0（`secret-audit.mjs` RESULT: PASS）／tracked `.env` 0／`.claude/settings.local.json` tracked **false**／`敵画像` tracked false。

## 8. Save / Daily Integrity

- 対象テスト40 files **554 passed**（gameVersion・resume・battleSaveStorage・recordStorage・mastery×4・godIdentitySave・rewardStorage・dailyBoss・dailyClock・dailyStorage・dailyRunStorage・startDaily・dailyFairness・dailyModifier）
- **Save Migration 実機監査**（`scripts/release-audit/save-migration.mjs`、master build＝4182 → RC build＝4181）：master 側で①通常戦を決着まで（勝利・スコア9,270・戦績保存）②通常戦ラウンド2で中断③神域挑戦ラウンド2で中断 → RC 側で「続きから（大耀・ラウンド2）」再開 PASS（hand 6・敵表示・End Round有効）、save version 9 のまま、戦績／報酬／神階 preserved、そのまま決着（勝利・5R）、「続きから（神域挑戦・大耀・ラウンド2）」再開 PASS → 勝利・「残り回数 2 回」（3→2）、Daily結果保持。**API 0・外部通信 0・エラー 0**
- Daily：seed（`daily-<JST日付>-<enemyId>`）・週次シャッフル敵選択・tries 3/day・JST 00:00 reset・storage key `sevengods.daily` — `src/` 変更0のため定義上不変（該当テスト passed）

## 9. Integrated Real Rendering QA（Playwright・deviceScaleFactor 指定・disposable preview）

4体 × 3条件（1366×768 DPR1／DPR2・390×844）＝12 conditions **全PASS**：broken image 0・JS error 0・scrollY 0・overflowX false、enemy box（PC 290.0×284.5／mobile 124.3×354.5、ryujin mobile 188.4×354.5）は各RC QAの値と完全一致、HUD（topbar・enemy plate・HP bar）可視・手札5枚・End Round 有効。PC DPR1 ではさらに4体すべてで：カード使用成功（手札減少）→ `.floating-numbers`／`.cast-flash`／`.enemy-hit-layer`／`.battle-mini-result-*` 観測、End Round でラウンド進行、`.god-strike`（神の一撃）観測。callout はこの試行では未発火（条件成立時のみ発火する仕様。`src/`・bundle 不変のため挙動は master と同一）。

## 10. Safety

`origin/master`＝`master`＝`8256b60`（不変）。push 0・merge 0・deploy 0・Production 変更 0。oni／ryujin／onryo の各 RC branch は不変。QA preview はすべて停止済み。

## 11. Final Decision

**PASS**

**READY FOR CEO PRODUCTION RELEASE APPROVAL**

CEO から明示的な「Production Release を承認」を受けるまで、master merge・origin/master push・deploy は行わない。
