# v1.0.4 RC Gate — Retention 束 v1（①OTOMO 絆 ★3 到達可能化 ②49 攻略の次の目標 NM1 ③Daily「今日の問い」）（決定284 候補）

> **状態（2026-10-24・PM・AI 判断（CLAUDE.md §6-2））：READY FOR CEO PRODUCTION RELEASE APPROVAL**
> branch `release/v1_0_4-rc`（worktree `C:/Users/kimi1/SevenGodsGame-v104rc`・起点 master `1f713d6`＝v1.0.3 Production）。Gate を測った HEAD は `6a84e36`（それ以降の commit は docs のみ）。push／PR／merge／tag／deploy は 0。
> 独立 Release 監査（`docs/V1_0_4_INDEPENDENT_RELEASE_AUDIT.md`・Lane 7・BLOCKER 0）の MUST M1〜M7 を、この文書で 1 つずつ満たした。

## 0. 結論（先に）

| | 判定 |
|---|---|
| Release Gate | **PASS**（FAIL 0・新規 Known 0。WARN 2＝§3） |
| PR 作成 | **可能**（CEO の 2 段階 push 後に PM が PR を作る。§5） |
| CEO 判断 | **Production 公開承認 1 件のみ**（§6-3 #8） |
| Stage B（同じ盤面 Retry の前回比） | v1.0.4 には入れない。v1.0.5 候補として別 branch で GO（`docs/V1_0_4_PREVIEW_GATE.md` §2） |

## 1. RC の構成（M1）

| commit | 内容 |
|---|---|
| `ff9aeee` | merge `feat/v1_0_4-retention-bundle` `acce494`（①`70bd104`／②`1904941`／③`3886fbd`／記録 `6464997`／AC19 契約 `bf683b4`／Preview Gate `8a736f0`・`acce494`）。conflict 0 |
| `15afa34` | merge v1.0.3 公開記録 `57584ad`（決定283 LIVE・RELEASE_STATUS A-0・Production Smoke 証跡。docs/evidence のみ）。conflict 0・`merge-base --is-ancestor 57584ad HEAD` が真 |
| `8b6e884` | version 1.0.4（`package.json`・`package-lock.json` の 2 箇所・`publicFace.test.ts`）。v1.0.3 の `374e7c0` と同じ 3 ファイル・5 行 |
| `7de2a05` | 契約テストの強化（監査 S1／S2）：`matchupWiring.test.ts` の nextGoal 検査を参照語の完全一致（`['matchup']` のみ）に。矛盾していたコメントを修正 |
| `6a84e36` | QA スクリプト `retention-check.mjs` の未使用の関数 2 つを削除（oxlint 新規 0 に戻すため） |

- **runtime は `bf683b4` と同一**：`git diff bf683b4 HEAD -- src` の差分は `matchupWiring.test.ts` と `publicFace.test.ts` だけ（テスト）。runtime の文字列で変わったのは `__APP_VERSION__`（1.0.4）と sha だけ。
- **混入 0**：`git diff --name-only 1f713d6 HEAD` に shogunate／tadatsugu／voice／crisis／ranking／pilot／`api/`／`public/`／art-source／audio-source は 0（v1.0.3 の evidence 以外）。

## 2. Gate 実測（直列・2026-10-24）

証跡は `docs/evidence/v1_0_4-rc/`。

| G | 項目 | 結果 | 実測 | 証跡 |
|---|---|---|---|---|
| M4-1 | `tsc -b --noEmit` | PASS | exit 0 | `01-tsc.txt` |
| M4-2 | `oxlint` | PASS | 警告 11・エラー 0（v1.0.3 と同じ内容・新規 0） | `02-oxlint.txt` |
| M4-3 | full vitest | PASS | 124 files・**1,544 PASS**・0 fail・17 skip（v1.0.3 の 1,528＋16。`7de2a05` は既存の it にアサーションを追加しただけで件数は不変） | `03-vitest.txt` |
| M4-4 | `npm run build`（1.0.4・HEAD `6a84e36`） | PASS | `index-_60cvbl_.js` 473.99 kB（gzip 147.51）・`index-DIaR-qlF.css` 194.99 kB。埋め込みは `1.0.4`／`6a84e36` | `04-build.txt` |
| M4-5 | Ranking Absence | PASS | RESULT PASS（`submissionEnabled:false`・dist の `/api/` 0） | `05-ranking-absence.txt` |
| M4-6 | Secret Audit（基点 `1f713d6`） | PASS | credential 形式 0。非 prose の当たりは v1.0.3 と同じ（dist の `PASSWORD` ×2・`rules.ts` の `NEON` ×2＝識別子）。全文 6.1 MB は docs(prose) の行を件数に要約 | `06-secret-audit.txt` |
| M4-7 | `src/core` 差分 | PASS | `git diff --stat 1f713d6 HEAD -- src/core` が空＝gameVersion `1.d794038a00b5b53c`・save v9 不変 | — |
| M5-1 | Home version smoke（PC・SP390） | PASS | `v1.0.4 (6a84e36)`・title・favicon・OGP・console error 0・外部 0 | `10-home-version.json` |
| M5-2 | v1.0.3 受入の回帰 `scripts/v1_0_3-rc/acceptance.mjs --version 1.0.4` | PASS | **44/44** | `07a-acceptance/`・`07a-stdout.txt` |
| M5-3 | 敗北画面の回帰 `defeat-check.mjs` | PASS | **18/18** | `07d-defeat/`・`07d-stdout.txt` |
| M5-4 | Retention 受入 G3・G3w・G4a・G4b・G4c・G6・G7・G8・AC6 | PASS | `docs/V1_0_4_PREVIEW_GATE.md` §1。**Preview Gate の build（`index-ob1PnZQb.js`）と RC build は、`1.0.3`／`bf683b4` ⇄ `1.0.4`／`6a84e36` の 2 文字列を正規化すると byte 一致（473,996 B）・CSS は完全一致**。そのため結果をそのまま引き継ぎ、再実行していない | `docs/evidence/v1_0_4-rc/preview-gate/` |
| M6 | 旧セーブ互換（v1.0.3 build `index-C_e5frXY.js`＝Production と埋め込み sha 以外 byte 一致 × RC build・`save-migration.mjs`） | PASS | **44/44**：通常・Daily の途中セーブが同じラウンド・HP・手札で復元／battleSave 以外のキー（`otomoBond`・`records`・`matchups`・`daily` ほか 7 キー）は読み込みの前後で不変／JS error 0・外部 0。OTOMO の ★ は表示層の導出で「昇格のみ・降格 0」（`otomoGrowthDisplay.test.ts:95`） | `09-save-migration/`・`09-stdout.txt` |

## 3. WARN（公開判断は止めない）

| # | 内容 | 扱い |
|---|---|---|
| W1 | AC19 の 2 つ目の例外（nextGoal.ts が入力名 `matchup` を持つ）は、決定206 の境界より一段広い | 契約テストを参照語の完全一致に強めた（`7de2a05`）。matchupStorage の語が 1 つでも混ざると赤になることを変異で確認した。決定284 に AI 判断として記録 |
| W2 | 旧 phase7-p1 受入の AC12 は v1.0.3 でも FAIL（Home のリンク 3 本を 2 本と想定している） | Known（スクリプトの前提が古い・今回の退行ではない）。根拠は `preview-gate/ac12-links.json` |

## 4. Rollback 計画（M7）

| 場面 | 手順 |
|---|---|
| v1.0.4 全体を戻す | Vercel で deployment **`7256475048`**（v1.0.3・master `1f713d6`・`index-CAKmzlrW.js`）を Promote（CEO のみ）。v1.0.4 は storage の書き込み・新しいキー・save version を変えていないので、v1.0.3 へ戻してもデータ互換のリスクはない |
| NM1 だけを外す（次の Release で） | **`7de2a05` → `bf683b4` → `1904941` の順に revert**。1904941 の revert は、後続の ③ `3886fbd` と `resultContext.test.ts` で**テストのみ conflict** する。③ のテスト（明日の問いの型）を残し、② のテスト 2 件を落として解消する。使い捨て worktree で実測：tsc 0・`src/components` 783 PASS・nextGoal.ts の NM1 は 0 件・Home の「今日の問い」は残る。**監査 M7 の「1904941＋bf683b4 を対で revert」は、7de2a05 と conflict の解消が必要な形に訂正した** |
| ① ★3 だけを外す | `70bd104` を revert（以後の commit との conflict はない想定。必要になった時点で実測する） |
| ③ 今日の問いだけを外す | `3886fbd` を revert。phase7 AC2 の新しい判定は、verdict 行が無くても通る |

## 5. 公開手順（CEO／PM）

1. CEO：この RC と決定284 を承認する。
2. CEO：2 段階で push する（pack はローカルの実測。force 不要・master は変わらない）。
   - 段階 1：`git push origin 57584ad:release/v1_0_3-rc`（v1.0.3 公開記録。`bbc2263` からの fast-forward・**約 25.5 MB**。v1.0.3 では 21.8 MB を 1 段で成功している。408 が出た場合は時間をおいて再試行する）
   - 段階 2：`git push origin release/v1_0_4-rc`（残り約 0.2 MB）
3. PM：PR `release/v1_0_4-rc` → master を作成。必須 check（tsc／oxlint／vitest／build）が GREEN であることを確認する。
4. CEO：merge する → Vercel が自動で deploy。
5. PM：Production Smoke を実施する（v1.0.3 の S1〜S9 に準じる。S1 `v1.0.4 (<merge sha>)`・旧セーブ 44/44・敗北画面 18/18・bundle は sha を正規化して byte 一致）。加えて Retention の G4a（NM1）と G3（今日の問い）を 1 回ずつ確認する。

## 6. 実行したコマンド（再現用）

```
npx tsc -b --noEmit ; npx oxlint ; npx vitest run ; npm run build
node scripts/release-audit/ranking-absence.mjs
node scripts/release-audit/secret-audit.mjs 1f713d6
npx vite preview --port 4206 --strictPort   # RC
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-audit/home-version-smoke.mjs docs/evidence/v1_0_4-rc/10-home-version.json http://localhost:4206 1.0.4 6a84e36
node scripts/v1_0_3-rc/acceptance.mjs docs/evidence/v1_0_4-rc/07a-acceptance/acceptance.json http://localhost:4206 --sha 6a84e36 --version 1.0.4
node scripts/v1_0_3-rc/defeat-check.mjs docs/evidence/v1_0_4-rc/07d-defeat/defeat.json http://localhost:4206
npx vite preview --port 4205 --strictPort   # lane3 = v1.0.3 build
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-audit/save-migration.mjs docs/evidence/v1_0_4-rc/09-save-migration/result.json http://localhost:4205 http://localhost:4206
```

実施条件：PC のメモリは空き約 0.8GB。preview・Playwright・build は 1 本ずつ直列で実行し、同時には動かしていない。
