# v1.0.4 Preview Gate（2026-10-23 開始・2026-10-24 完了・PM）

> **状態：PASS**（G1〜G8 と、旧 phase7 の AC6 を含め、新しい FAIL は 0）。対象は branch `feat/v1_0_4-retention-bundle` の runtime `bf683b4`（以後の commit は docs／scripts のみ。dist `index-ob1PnZQb.js`）。比較の基準は v1.0.3 の build（`release/v1_0_3-rc` の dist `index-C_e5frXY.js`。Production と同じ runtime）。証跡は `docs/evidence/v1_0_4-rc/preview-gate/`。push・merge・deploy はしていない。**Stage B は v1.0.4 に入れない**（§2）。
>
> 実施記録：2026-10-23 は PC のメモリ不足で preview と Playwright がシステムに停止され、途中で中断した。2026-10-24 に、孤立していた自分の preview 2 本（4204／4205。親プロセスが止められた後に残ったもの）だけを停止し、空き約 0.8GB の状態で **viewport を 1 つずつ・直列で**再開した。成功済みの G1・G2・G6・G7・G4a は再実行していない。

## 1. 実測結果

| G | 結果 | 根拠 |
|---|---|---|
| G1 | **PASS** | full vitest：1,544 PASS・17 skip・fail 0（v1.0.3 の 1,528＋16）。oxlint：警告 11・エラー 0（v1.0.3 と同じ件数・同じ内容）。build：JS 473.99kB・CSS 194.99kB |
| G2 | **PASS** | `src/core` の差分 0。src に追加された `setItem` 0（増えた 1 行は「setItem を呼ばない」ことを確かめるテストのアサーション） |
| G3（敗北） | **PASS** | phase7-p1 の Daily 3 回を 4 viewport で実行。verdict は「今日の問い：未解（R{n} 敗北）」。D4 は「今日の挑戦は終了。明日の問いは【耐久型】・次の敵まで HH:MM」で、SP844 では 2 行（AC9 の SP 上限 2 行以内） |
| G3w（勝利） | **PASS** | pc1508（7/7）・sp844（7/7）。Home 未挑戦で「今日の問い：未着手」→ 勝利すると結果画面の 1 行目が「今日の問い：解けた（R6 撃破）」→ その直後にベスト行 → Home の verdict が結果画面と同じ文言 → 残り 2 回の Home に countdown なし → JS error 0。今日（10/24）の敵は蒼海の龍神で、大耀・恵比寿・才華の自動操作では勝てなかった。蒼毘の `win` 操作で勝利（`--daily-god 蒼毘`）。「勝利経路を通った」を独立した判定にしてあり、負けたときに PASS と数えることはない |
| Home countdown | **PASS・期待値の変更は不要** | DOM の文言が仕様書 RETENTION_BUNDLE_V1 §3 と一致：「明日の問いは【耐久型】・次の敵まで 01:46」。残りがあるときは null（10 件）、残り 0 のときだけ表示（v1.0.3 と同じ）。phase7 の正規表現 `/次の敵まで \d\d:\d\d/` は先頭に固定されていないので変更なしで PASS（AC7 20/20）。期待値は書き換えていない |
| G4a | **PASS** | 初めて撃破した通常戦の勝利（4 viewport）で `next-goal[data-goal-id=NM1]`「業斧の鬼将を別の神でも攻略する（この敵 1/7 神）」と Primary「別の神で挑む」が出る。Secondary の「今日の神域挑戦へ」も残る |
| G4b | **PASS** | pc1508・sp844 で各 4/4。1 勝目は NM1 →「同じ構成でもう一度」→ 2 勝目は NM1 ではなく N4（今日の神域挑戦：蒼海の龍神に挑む）。JS error 0 |
| G4c | **PASS** | pc1508・sp844 で各 4/4。新規プレイヤーが初陣（恵比寿×試練の影）で勝利すると、初撃破の 1 行が出る（＝初撃破の経路を通っている）一方、次の目標は **NR1**（NM1 ではない）。決定206 の評価順（NR1 → NM1）どおり。entrance-e1 の全体（1 本 10 分以上でメモリ負荷が大きい）の代わりに、`retention-check.mjs --scenarios firstBattle` で同じ経路（`home-first-battle` →「出陣する」）だけを測った |
| G6 | **PASS** | Home Today の高さは +15〜18px（1 行分）：pc1508 109→127／sp844 135→153／pc1366 112→127／sp760 135→153。3 回使い切った後も pc1508 122→140、sp844 176→194。横はみ出し 0。CTA と Primary は画面内 |
| G7 | **PASS** | runtime に新しく入った語は「今日の問い」「明日の問い」だけ。src の追加行で「失敗」「正解」「推奨」「ランキング」に当たったのは、コメント「正解の提示はしない」の 1 件だけ。bundle 中の「失敗」「推奨」は各 1 件で、v1.0.3 の bundle と同じ数 |
| G8 | **PASS（計測）** | 敗北画面で Primary「同じ盤面でもう一度」の下端から可視領域の下端までの余白：pc1508 **160px**／sp375 **140px**／sp390 **179px**。1 回目・2 回目の敗北とも同じ値で、Primary は初期の可視領域内。Primary より上は 8 行。1 行（21px）足しても全 viewport で収まる。SP375 のスクリーンショットでも Primary と Secondary 2 つが可視であることを確認した |
| AC6 | **PASS 2/2** | `--layout-only --baseline`：戦闘画面の offset 箱 154 要素が、pc1508・sp844 とも v1.0.3 と **差分 0** |

### 1-1. phase7-p1 受入スクリプト（旧版）の整理

| AC | v1.0.3 | v1.0.4 | 判定と対応 |
|---|---|---|---|
| AC2 | PASS 10/10 | 旧判定 FAIL 0/10 → **新判定 PASS 10/10** | 仕様 §3「best 行の上に 1 行」のとおり、`daily-diff` の先頭に verdict 行が入り、旧判定が見る `[0]` が 1 行ずれた。`summarize.mjs` を次のように変えた：verdict 行は **0 行**（v1.0.3 以前）、または **先頭に 1 行だけ・確定文言の正規表現に一致**の場合だけ認める。そのうえで、verdict の直後がベスト行、2 回目以降はその次が前回行、という**ベスト行・前回行の契約は変えていない**。新判定は v1.0.3 の build でも 10/10。誤りを含む 5 パターン（verdict が 2 行目／文言違反／2 行／ベスト行と前回行の順序が逆／ベスト行が欠落）はすべて FAIL になることを確認した |
| AC6 | FAIL 0/0 | FAIL 0/0 → **PASS 2/2** | 旧版の FAIL は `--baseline` を付けずに実行したため比較対象が 0 件になっていたもので、v1.0.3 でも同じ。`--layout-only --baseline` で実行すると PASS（上表） |
| AC12 | FAIL 0/2 | FAIL 0/2 | **v1.0.3 から続く FAIL で、今回の退行ではない。スクリプトは変更していない**。判定は `links.length === 2` を要求しているが、`4bfff2b`（Legal／Credits 画面）以降 Home のリンクは 3 本（戦績・OTOMO・クレジット）で、3 本とも viewport 内（pc1508 で top 495〜504・bottom 539〜548・vh 660）。根拠：`evidence/.../ac12-links.json` |

## 2. Stage B（同じ盤面 Retry の前回比）の判定

- **v1.0.4 には入れない（AI-PM 判断）。** v1.0.4 の RC は Stage A の 3 件だけで Gate を閉じ、範囲を広げない。
- **次の候補としては GO。** 別 branch `feat/v1_0_5-retry-prev-compare`（起点＝v1.0.4 の RC）で、v1.0.5 候補として実装する。根拠は G8 の余白 140〜179px で、1 行（≈21px）足しても全 viewport で Primary が初期の可視領域に残るため、計画書 §3-4 の GO 条件を満たす。
- **実装時の条件：**
  - 前回比 1 行は敗因枠ではなく recap の下に置き、2 回目の敗北でだけ出す。
  - session 内の state のみを使い、storage は 0。
  - 正解や推奨手は出さない（決定263）。
  - 実装後に G8 を再計測し、余白が 21px 以上残っていることを確かめる。
  - CEO の目視確認 Q5（RETENTION_BUNDLE_V1_PLAN §3-5）で判断する。

## 3. 再実行コマンド（直列・1 本ずつ）

1. `npx vite preview --port 4204 --strictPort`（retention）／比較が必要なときだけ `npx vite preview --port 4205 --strictPort`（lane3＝v1.0.3）
2. `node scripts/v1_0_4-rc/retention-check.mjs <out> http://localhost:4204 --only pc1508 --daily-god 蒼毘`（G4b・G3w・G4c。`--scenarios secondWin,daily,firstBattle` で絞れる。Daily の敵は日替わりなので、勝てない日は `--daily-god`／`--daily-strategy` を変える）
3. `node scripts/v1_0_4-rc/defeat-g8.mjs <out>/g8.json http://localhost:4204`（G8）
4. `node scripts/phase7-p1/acceptance.mjs <out> http://localhost:4204 --layout-only --baseline http://localhost:4205`（AC6）

Release の GO 条件（独立監査 M1〜M7）は `docs/V1_0_4_RC_GATE.md`（RC branch 側）で満たす。
