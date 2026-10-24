# 忠次 Pilot v0.4 — 最新 master への追従計画（差分監査・dry-run）

> **状態（2026-10-24・PM・AI 判断（CLAUDE.md §6-2）・docs-only）**：本書は計画と試算の結果だけを書く。branch `feat/shogunate-pilot-v0.4`（`cf3d869`）の runtime は変更していない。push／merge／deploy は 0。
> **前提（CEO 方針 2026-10-24）**
> - CEO の iPhone 実機 QA（8 問・`docs/SHOGUNATE_V0_4_CEO_IPHONE_QA_RUNBOOK.md`）が PASS するまで一般公開しない
> - 他 9 体の実装と画像取得は開始しない
> - Kit の権利条件と非公式台詞の確認が済むまで、公開判断は保留する

## 0. 結論

| 項目 | 結論 |
|---|---|
| 追従の難しさ | **低い**：v0.4 × `origin/master` `35a7f91`（v1.0.4）も、v0.4 × `release/v1_0_5-rc-candidate` `1dd2204` も、`git merge-tree` で conflict 0 |
| 合流後の検証（dry-run） | **PASS**：v0.4 × v1.0.5 RC 候補の合流ツリーで `tsc -b` 0・full vitest **1,602 PASS**・0 fail（候補の 1,578＋忠次の 24） |
| 実施時期 | **CEO の iPhone QA が PASS したあと**。それまでは本書の手順を準備しておくだけ |

## 1. 現状

- v0.4 の起点は v1.0.2 RC（merge-base `ba0af34`）。以後、master には v1.0.3（敗北画面の事実行・RETURN TO CALM 小・SP 9.5px）と v1.0.4（Retention 束）が入った。v1.0.5 は RC 候補の段階。
- v0.4 の src の差分は 15 files。v1.0.5 RC 候補と重なるのは `battle.css`・`BattleScreen.tsx`・`EnemyPanel.tsx` の 3 つで、どれも自動で合流した（conflict 0）。

## 2. 合流後に意味が保たれるか（合流ツリー `373931f` を読んで確認）

| 観点 | 結果 |
|---|---|
| Pilot の敵の除外 | 合流後の `isPilotEnemyId` は `PILOT_ENEMIES`（enemy_09）**または** `isShogunateEnemyId`（enemy_08）。そのため次の 4 つは忠次を引き続き除外する：v1.0.4 の NM1（`useGameEngine` の決着時の記録）・戦績・セーブ・報酬 |
| Daily・49 攻略・gameVersion | `CORE_ENEMIES`／`ENEMY_IDS` だけを見る（v0.4 の設計どおり）。既存 7 体の sha256 固定テストも PASS |
| v1.0.5 Break SE | `EnemyPanel.tsx` の合流後：`charging`（`intent.kind==='charge'`）を Break SE に渡している。そのため忠次の R3 の溜め（「⚠ 傷が浅ければ次は総攻め」）が出ている間は、half 帯の Break SE は鳴らない（Break SE の規則どおり） |
| v1.0.5 敵の揺れ | 忠次 R4 の else 分岐「軍略・総攻め」は名前つき必殺（special）なので、3px の揺れの対象になる。then 分岐（attack 12）は揺れない＝「追い込めたかどうか」が手触りでも分かれる（意図に沿う） |
| v1.0.5 Stage B | 忠次の通常戦（Pilot 経路）で負けて「同じ盤面でもう一度」を押すと、前回比が出る。鍵に敵 ID が入っているので、他の敵とは混ざらない |
| v1.0.3 敗北画面の事実行 | 合流後の full vitest に含まれる defeatFacts のテストは PASS。忠次での実画面の確認は §3 の G-S4 で行う |

## 3. 実施手順（iPhone QA PASS のあと・PM が直列）

1. その時点の最新 master（v1.0.5 が出ていればそれ）を起点に `feat/shogunate-pilot-v0.5` を作り、v0.4 を **merge**（rebase しない＝v0.1〜v0.4 の履歴と証跡を保つ）。
2. G-S1：`tsc -b`・oxlint の新規 0・full vitest（期待件数＝master の件数＋24）・build。
3. G-S2：既存 7 体の固定（`coreRoster.test.ts`／`shogunateRoster.test.ts`）・`src/core` の差分が v0.4 の範囲だけであること（`tactic` 解決はすでに master にある）。
4. G-S3：v0.4 の Gate スクリプトを再実行（`scripts/shogunate-pilot/acceptance.mjs`・`probe.mjs`・`invariants.mjs`）。v0.4 で取った期待値（受入・R3 Break の境界 490）と比べる。
5. G-S4：忠次で敗北・再戦して、Stage B の行・Break SE・揺れ・敗北画面の事実行が出ることを PC／SP375 で 1 回ずつ確認する。
6. G-S5：旧セーブ互換 44/44（Pilot 経路のデータは保存しないので、形式の確認）。
7. G-S6：`?pilot=shogunate` が無い URL では、敵選択・Home・Daily に忠次が出ない（一般公開しないことの確認）。

**統合の形**：v1.x RC に入れる場合も、`?pilot=shogunate` の裏だけに置く（現行の設計）。一般公開（フラグ無しで並べる）は IP／権利の判断で、CEO の判断事項（§6-3 #3・#5）。非公式の台詞 7 本の監修と Kit 規約の再確認が済むまで保留する。

## 4. dry-run の実施記録（再現用）

```
git merge-tree --write-tree --name-only origin/master feat/shogunate-pilot-v0.4                  # exit 0（conflict 0）
git merge-tree --write-tree release/v1_0_5-rc-candidate feat/shogunate-pilot-v0.4                # tree 373931f・exit 0
git commit-tree 373931f -p release/v1_0_5-rc-candidate -p feat/shogunate-pilot-v0.4 -m "tmp..."  # df9368d（ref を作らない一時オブジェクト）
git worktree add --detach <scratchpad>/wt-shogunate-dryrun df9368d
npx tsc -b --noEmit                                                                              # exit 0
npx vitest run                                                                                   # 129 files・1,602 PASS・17 skip・0 fail
```

一時 worktree は scratchpad に置いてあり、どの branch にも ref は作っていない。

## 5. リスク

| リスク | 対策 |
|---|---|
| v0.4 の Gate スクリプトが v1.0.3 以降の画面変化（事実行・前回比・今日の問い）で期待値ずれを起こす | G-S3 で、仕様と DOM を照合してから期待値を直す。v1.0.4 の AC2 と同じ方式で、テストを通すためだけの緩和はしない |
| 素材の追加（画像 57KB・背景 164KB）で push が大きくなる | 先に push のサイズを測り、必要なら v1.0.3／v1.0.4 と同じく段階に分けて push する |
| 非公式台詞の露出 | Pilot フラグの裏に限る。公開前に CEO が監修する |
