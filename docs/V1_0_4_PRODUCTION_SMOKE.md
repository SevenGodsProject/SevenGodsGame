# v1.0.4 Production Smoke（決定284 PRODUCTION LIVE）

> **結論：PASS — v1.0.4 PRODUCTION LIVE**。Production https://seven-gods-game.vercel.app/ は merge commit `35a7f91`（PR #4・CEO が merge・2026-10-23T16:28:08Z）を配信している。
> - Vercel Production deployment：**`7283378458`**（success・2026-10-23T16:28:57Z）
> - master CI：run **39987032805** success（PR 時の run 39986577889 も GREEN）
> - S1〜S7・bundle 一致・混入 0 がすべて PASS。新しい Known は 0
> - **Rollback 先は deployment `7256475048`（v1.0.3・`1f713d6`）を維持**。使っていない。Promote は CEO のみ
> - 実施：PM・2026-10-24 JST。PC のメモリ空きは約 0.8GB のため、Playwright は 1 本ずつ直列で実行した。本番の再 deploy・Rollback・storage 以外への書き込みはしていない（各チェックは隔離プロファイルで実行）

## 1. 配信物の照合

| 項目 | 結果 | 実測 |
|---|---|---|
| HTTP | PASS | `/` 200 |
| JS | PASS | Production `index-Dk5s3eSl.js` **473,996 B** は RC build `index-_60cvbl_.js` と、埋め込み `1.0.4`／`35a7f91` ⇄ `6a84e36` を正規化すると **byte 一致** |
| CSS | PASS | `index-DIaR-qlF.css` が RC build と**完全一致** |
| 混入 | PASS | PR #4 の差分（`origin/master...1ff5f68`）：src は Retention の 17 ファイルだけ・`src/core` 0。他 Lane（忠次／crisis／カード画像／ランキング／pilot／api／public）0。テスト以外で追加された `setItem`／`localStorage`／`fetch`／`/api/`／`RANKING`／`submissionEnabled` は 0 |

## 2. Smoke

| S | 項目 | 結果 | 実測 | 証跡 |
|---|---|---|---|---|
| S1 | Home の version 表示 | **PASS** | `v1.0.4 (35a7f91)`・title・favicon・OGP・console error 0・外部 0（PC・SP390） | `s1-home-version.json` |
| S2 | v1.0.3 受入の回帰（Brief・遊び方・敵選択・version） | **PASS** | **44/44** | `s2-acceptance/`・`s2-stdout.txt` |
| S3 | **絆 ★3 の到達条件**（Retention ①） | **PASS** | **12/12**（PC・SP375）。otomoBond を注入して OTOMO 画面を読んだ：①大耀 12pt＝Lv5・童子 0 は **★3「固い絆で結ばれた相棒」**、次の解放「童子の記録（童子形態で対局を終えると解放）」、童子の形態は未解放のまま ②恵比寿 Lv4 は ★2「あと 1pt」（Lv5 未満は不変） ③蒼毘 Lv5・童子 1 は ★3 のまま（既存の ★3 は不変）。保存は読み込みの前後で不変。**同じスクリプトを v1.0.3 build に流すと大耀は ★2（10/10）、v1.0.4 の期待値を当てると FAIL**（判定が変更の前後を見分けられることを確認） | `s3-otomo-star3/` |
| S4 | 敗北画面（大耀 × 鬼将・R4 断岩・事実行） | **PASS** | **18/18** | `s4-defeat/`・`s4-stdout.txt` |
| S5 | 旧セーブ互換（v1.0.3 build `index-C_e5frXY.js` で作ったセーブ → Production） | **PASS** | **44/44**：途中セーブの復元（ラウンド・HP・手札）が同じ／`otomoBond`・`records`・`matchups`・`daily` ほかのキーは読み込みの前後で不変／JS error 0・外部 0 | `s5-save-migration/`・`s5-stdout.txt` |
| S6 | **49 攻略 NM1・Daily「今日の問い」・初陣 NR1**（Retention ②③） | **PASS** | **15/15 ×2**（pc1508・sp844）：G4b 1 勝目は NM1「業斧の鬼将を別の神でも攻略する（この敵 1/7 神）」→ 同じ構成の 2 勝目は NM1 なし（N4）／G4c 初陣は初撃破でも **NR1**／G3w Home 未挑戦で「今日の問い：未着手」→ 神域挑戦に勝利すると結果画面の 1 行目が「今日の問い：解けた（R6 撃破）」、その直後にベスト行、Home にも同じ verdict、残りがある Home に countdown なし。JS error 0 | `s6-retention-pc1508/`・`s6-retention-sp844/` |
| S7a | SP 手札・デッキ編成の本文 | **PASS（Known 3）** | 26/29。**本文・テキストの overflow は 125 枚すべてで 0**。FAIL 3 は札の外枠 2〜4px（SP390 の 2 枚）と `scale(1.04)` の見かけ高さ（SP375／SP390）で、v1.0.3 Production S9 と同じ件数（26/29）・同じ種類の Known（v1.0.2 から存在。外枠は手札の組み合わせ次第で複数札に出る＝v1.0.3 独立監査 DELTA の訂正どおり）。v1.0.3 からカードの CSS・CardView・battle.css の差分は 0（CSS の変更は `daily.css` に今日の問いの 1 規則だけ） | `s7-sp-text/`・`s7a-stdout.txt` |
| S7b | 敗北画面の SP 可視性（G8） | **PASS** | Primary「同じ盤面でもう一度」は 1 回目・2 回目の敗北とも初期可視。余白は pc1508 160／sp375 140／sp390 179px（Preview Gate と同じ値）。JS error 0 | `s7-g8/`・`s7b-stdout.txt` |

**引き継いだもの（再実行しない）**：神域挑戦を 3 回使い切ったときの D4「今日の挑戦は終了。明日の問いは【型】・次の敵まで HH:MM」と、Home の countdown の文言。Preview Gate（phase7 Daily 3 回 × 4 viewport）で実測済みで、本番の JS／CSS は同じ build と byte 一致しているため。

## 3. Rollback

- 戻し先：deployment **`7256475048`**（v1.0.3・master `1f713d6`・`index-CAKmzlrW.js`）。**使っていない**。Promote は CEO のみ。
- v1.0.4 は storage の書き込み・新しいキー・save version を変えていないので、v1.0.3 へ戻してもデータ互換のリスクはない（S5 は逆方向の互換＝v1.0.3 のセーブ → v1.0.4）。
- NM1 だけを外すときは `docs/V1_0_4_RC_GATE.md` §4（`7de2a05`→`bf683b4`→`1904941`）。

## 4. 実行したコマンド

```
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-audit/home-version-smoke.mjs <E>/s1-home-version.json https://seven-gods-game.vercel.app 1.0.4 35a7f91
node scripts/v1_0_3-rc/acceptance.mjs <E>/s2-acceptance/acceptance.json https://seven-gods-game.vercel.app --sha 35a7f91 --version 1.0.4
node scripts/v1_0_4-rc/otomo-star3-check.mjs <E>/s3-otomo-star3/result.json https://seven-gods-game.vercel.app --expect v104
node scripts/v1_0_4-rc/otomo-star3-check.mjs <E>/s3-otomo-star3/v103-contrast.json http://localhost:4205 --expect v103
node scripts/v1_0_3-rc/defeat-check.mjs <E>/s4-defeat/defeat.json https://seven-gods-game.vercel.app
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-audit/save-migration.mjs <E>/s5-save-migration/result.json http://localhost:4205 https://seven-gods-game.vercel.app
node scripts/v1_0_4-rc/retention-check.mjs <E>/s6-retention-<vp> https://seven-gods-game.vercel.app --only <vp> --daily-god 蒼毘
node scripts/v1_0_3-rc/sp-text-check.mjs <E>/s7-sp-text/result.json https://seven-gods-game.vercel.app
node scripts/v1_0_4-rc/defeat-g8.mjs <E>/s7-g8/g8.json https://seven-gods-game.vercel.app
```

`<E>` = `docs/evidence/v1_0_4-production-smoke`。4205 は lane3 worktree の v1.0.3 build（Production `index-CAKmzlrW.js` と埋め込み sha 以外は byte 一致）。150KB 超の PNG は webp（quality 0.82）に変換した。
