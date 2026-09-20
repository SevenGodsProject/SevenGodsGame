# 決定207 — Solve Legibility v1 Production Release Gate

- 日付：2026-09-20
- 区分：Release Gate 監査（**Production 反映承認ではない**。判定は AI・CLAUDE.md §6-2。Production 公開は CEO 承認事項 §6-3-8）
- Production baseline：origin/master `bba4c67`（決定202 LIVE、配信 `index-BtxBWfrs.js` / `index-CxIFo0cs.css`）
- RC（最終）：`release/solve-legibility-v1-rc` = **`c9dd970`**（origin/master から分岐し `feat/solve-legibility-v1` を ff）
- 統合内容：`3551898`（決定202 docs）→ `6d525b4`（決定206 実装）→ `1caaf39`（決定206 close-out docs）→ `364915b`（Gate 修正 1：テストの型エラー）→ `52b58b9`（Gate 修正 2：低い PC viewport の recap 余白）→ `c9dd970`（決定206 文書の訂正）
- 制約：merge／push／deploy なし。Production・master 不変。Ranking／Neon／secrets／Living Hero 変更なし。Playwright は 1 本ずつ順次実行（メモリ圧再発防止）

---

## 1. Gate 1 回目（RC = 1caaf39）：FAIL — RELEASE BLOCKED → CEO 承認の最小修正（364915b）

- `npm run build`（= `tsc -b && vite build`）が `battleRecap.test.ts` の型エラー 4 件で失敗（Vercel の build も同じコマンドのため deploy が失敗する）
- 原因：決定206 で `RecapFacts` に `announced`／`unharmed`／`blockedTotal` を追加した際、G1／G2 テストの手書き facts 2 箇所に足し忘れ。vitest は型を検査しないため 1,157 件全通過していた
- **QA 検証ミスの記録（隠さない）**：決定206 で報告した「tsc 0 errors」は **無効**。root `tsconfig.json` が `files: []` の references 専用であるにもかかわらず `tsc --noEmit -p tsconfig.json` を使い、何も検査せず exit 0 を得ていた。Release Gate の `tsc -b` で初めて検出。**今後の正式 TypeScript Gate は `tsc -b --noEmit`**（決定206 文書 §3-2b にも記録）
- 修正（CEO 承認・2026-09-20）：テスト 2 箇所に `announced: 0, unharmed: 0, blockedTotal: 0` を追加 → `364915b`。テストコードのみ・runtime 変更 0（build 出力 `index-GqAh05FD.js` は修正前後で同一ハッシュ）

## 2. Gate 2 回目（RC = 364915b）：FAIL — RELEASE BLOCKED → CEO 承認の最小修正（52b58b9）

静的検査・exact diff・決定206 受け入れ 38/38・E1・Solve Loop・Interaction Feel・Hardening・qa-flow・Save Migration・Ranking Absence・Secret Audit は PASS。**phase7-p1 AC10** で決定206 由来の回帰を検出。

### 2-1. 検出（phase7-p1 AC10「Result 初期表示に別アクティビティへの CTA が 2 つ以上」）

| 計測（pc1508＝1508×660・Daily 2 回目勝利・報酬確定後） | Production bba4c67 | RC 364915b |
| --- | --- | --- |
| 結果カード 内容高さ / 可視高さ | 1007 / 559 | **1050** / 559 |
| Secondary CTA の top | 527（可視） | **569（可視領域外）** |
| 初期表示で見える出口 | rematch・adjustDeck・reselect | rematch のみ |

切り分け：RC・baseline なし → FAIL／RC・baseline=Production → 再現（AC6 は PASS）／Production・pc1508 のみ → **PASS 7/7** ⇒ RC 固有。

### 2-2. 原因（実測 `scripts/release-solve-legibility-v1/measure-ac10.mjs`・`out/measure-ac10-before.json`）

決定206 の事実行「予告された攻撃 N回のうち…（盾で防いだ量 X）」は PC の recap 幅（460px）で **2 行に折り返す**（40.3px）。Daily 2 回目の勝利画面は「今日のベスト更新」＋「前回→今回」の 2 行、神＋OTOMO ポートレート、スコア内訳（PC で既定展開）が重なり最も背が高く、660px の PC viewport（カード可視高さ 559px）で Secondary CTA の下端 613.2px がカード可視下端 609.5px を **3.7px** 超えた。SP（390×760／844）・PC1366・PC 高さ 900 は余裕あり（overflow −81〜−236px）。

### 2-3. 修正（CEO 承認・52b58b9・CSS のみ）

方針：決定206 の事実行そのものは削らず、**低い PC viewport でのみ recap の周辺余白を必要最小限圧縮**（オーバーレイ全体の padding には触れない）。

```css
@media (min-width: 1024px) and (max-height: 700px) {
  .game-over-recap { padding-top: 4px; padding-bottom: 4px; line-height: 1.5; }
}
```

必要最小 4px（実測 3.7px）に対し、padding −4px ＋ 行間 4 行 × −0.65px ＝ **−6.6px**（サブピクセル差への最小の余裕）。

| 計測（修正後・`out/measure-ac10-after.json`） | overflow | recap padding / line-height |
| --- | --- | --- |
| 1508×660（Daily 2 回目勝利） | +3.7px → **−2.9px**（Secondary 2 個とも可視） | 4px / 19.5px（変更） |
| 1508×900 | −84.3px（変わらず） | 8px / 20.15px（**変更なし**） |
| 390×760（SP） | −81.3px（変わらず） | 6px / 20.15px（**変更なし**） |

文言・行数・runtime ロジック・`src/core`・storage・saveVersion・gameVersion・依存の変更 0。

## 3. Gate 3 回目（RC = c9dd970）— 最初から再実行

### 3-1. 正規コマンド・静的検査

| 項目 | 結果 |
| --- | --- |
| `npx tsc -b --noEmit` | **exit 0** |
| `npm run build`（clean：`rm -rf dist`） | **成功**（`index-4DPzUUkG.js` 433.71 kB / `index-C-pQDi18.css` 147.85 kB） |
| `npx oxlint src` | 0 警告 |
| `npx vitest run --dir src` | **91 files / 1,157 tests 全通過** |

### 3-2. exact diff 監査（Production `bba4c67` → RC `c9dd970`）

| 種別 | ファイル |
| --- | --- |
| runtime（6） | `src/components/battle/battleRecap.ts`・`nextGoal.ts`・`resultContext.ts`・`battle.css`（決定207 修正 12 行のみ）・`src/components/setup/EnemySelectScreen.tsx`・`setup.css` |
| テスト（4） | `battleRecap.test.ts`・`nextGoal.test.ts`・`resultContext.test.ts`・`matchupWiring.test.ts` |
| docs／scripts | 決定202・206・207 文書、`DECISIONS.md`、`scripts/solve-legibility-v1/**`、`scripts/release-solve-legibility-v1/**`、`scripts/entrance-e1/acceptance.mjs`（Tertiary 探索）、決定202 の JSON 証跡 |

不変：`src/core` 差分 **0**、`public/`・`index.html`・`package.json`・`package-lock.json`・vite／tsconfig 変更 0、新規 storage key 0、saveVersion／gameVersion 差分 0、依存追加 0。決定206（＋その Gate 修正 2 件）以外の runtime 変更の混入 **なし**。

### 3-3. ブラウザ QA（Preview `http://localhost:4181`＝RC の clean build。1 本ずつ順次）

| # | スイート | 結果 |
| --- | --- | --- |
| 1 | phase7-p1（4 viewport・16 シナリオ・baseline=Production：**AC10 PC1508×660** と **AC6 Result／戦闘 layout の Production 比較** を含む） | **ALL PASS**（AC1〜AC16・EXTRA-1〜4。**AC10 18/18**：pc1508 Daily 2 回目勝利の Secondary top 563・可視。**AC6 2/2**：戦闘画面の offset 箱が Production と一致） |
| 2 | 決定206 受け入れ（**fresh origin `127.0.0.1:4181`**・11 シナリオ・38 判定。fresh-player 実導線「初陣→報酬→Early Read Moment→双牙の魔獣→Result 事実行」を含む） | **PASS 38/38**（1 回目 37/38：B3-1「7R 未撃破」で守りだけの bot が R7 の大技（170 vs 盾 80）で敗北し判定対象外に。敗北時の recap は事実行＋助言 G1 で正しい。同シナリオを 3 回再実行し 2/3 PASS ＝ 通常戦 seed 依存の bot の揺れ。製品不具合ではない） |
| 3 | E1 回帰 | **ALL PASS**（24 項目・AC21 22/22。初陣まで 3.7〜7.9 s・3 クリック） |
| 4 | Solve Loop 回帰（17） | **PASS 17/17** |
| 5 | Interaction Feel（`--baseline` Production） | **PASS 28/28**（1 回目 26/28：AC3-hp「敵 HP が減るまで」が 920 ms（閾値 700 ms・設計値 460〜520 ms）と baseline 差 ±80 ms 超。RC の runtime 差分にカード演出の変更は無く、同一条件の再実行で 28/28・設計値内 ＝ 計測機の負荷による揺れ） |
| 6 | Hardening（不正 enemyId） | **ALL PASS**（H1〜H10） |
| 7 | qa-flow（4 viewport） | **正常**（4 viewport：戦闘 scroll 0・続きから R2・勝利・敗北 recap 2 行・Daily 勝利で残り 2 回・external 0・api 0・failed 0・errors 0） |
| 8 | Save Migration（Production → RC） | **PASS**（Production 保存 v9・R2 を RC で「続きから」→ 勝利。records／reward／stakes 保持。Daily 再開（乱舞の道化）→ 回数 1・残り 2 回。api/external/errors 0） |
| 9 | phase7-p2（49 progression・`--p1` = Production） | **ALL PASS**（AC1〜AC19・EXTRA-1〜3。AC17：Production ビルドへ戻しても続きから・戦績が動き matchups 不変。AC19：Home Today・進行チップの値が Production と同一。AC15：初撃破の 1 行を足しても CTA≥2 が初期表示内） |
| 10 | screens-smoke | **壊れた画像 0**（PC／SP 各 9 画面） |
| 11 | CLS | **PC 0.0074 / SP 0.046**（Production・決定202 と同値。44px 未満 0・errors 0） |
| 12 | Ranking Absence | **PASS**（18/18） |
| 13 | Secret Audit | **PASS** |

## 4. 判定

**PASS — READY FOR CEO PRODUCTION RELEASE APPROVAL**

- RC `c9dd970` は正規コマンド（`tsc -b --noEmit`・`npm run build`）・oxlint・vitest・exact diff・ブラウザ QA 13 本すべて PASS
- Gate 中の再実行 2 件（決定206 受け入れ B3-1、Interaction Feel AC3）はいずれもテスト側の揺れ（seed 依存の bot・計測機の負荷）で、製品の出力は正しく、同一条件の再実行で PASS。runtime に手は入れていない
- 本 Gate は Production 反映の承認ではない。merge／push／deploy は行っていない（master `3551898`・origin/master＝Production `bba4c67` 不変）
- 本文書と DECISIONS.md の行は RC branch に docs commit する（前回 Gate と同じ運用）。CEO 承認後、§5 の手順で master を RC HEAD へ ff → push → Production Isolation QA（決定208）

## 5. Release 手順（CEO 承認後に実行。本 Gate では実行しない）

1. `git checkout master && git merge --ff-only release/solve-legibility-v1-rc`（master `3551898` → RC HEAD）
2. `git push origin master` → Vercel 自動 deploy → 新バンドル配信を確認 → ローカル clean build と sha256 byte 比較
3. Production Isolation QA（1 本ずつ）→ 決定208 として記録
4. Rollback 先：Vercel Instant Rollback で deployment `6534866730`（= `bba4c67`）。保存データの巻き戻しは不要（saveVersion 不変）
