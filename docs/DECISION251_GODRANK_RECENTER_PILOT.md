# 決定251 — 神階Ⅴ〜Ⅶ Re-centering Pilot：実装 → 自動 Gate PASS → HUMAN QA READY

- 日付：2026-09-30
- 種別：**runtime 1 値の Pilot 実装**（`RULES.stakes.lateRoundFrom` 5→6）＋テスト期待仕様 2 件＋golden 1 件。Production 変更 0・merge／push／deploy 0
- baseline：master `289c457`（runtime `a50b127`）。Preflight docs commit `da3e6ba` を含む系統から branch **`feat/d251-godrank-recenter`**（worktree `C:/Users/kimi1/SevenGodsGame-d251`）。`feat/d224`・決定213 runtime は未接触（`git diff a50b127 -- src public` は本 Pilot の 3 ファイルのみ）
- 判断主体：Pilot GO は **CEO**（2026-09-30）・実装方式と Gate 判定は **AI 判断**
- evidence：`docs/evidence/decision251/sim251-pilot.json`（再計算）・`qa-seeds.json`・`harness.d251.preflight.test.ts.txt`（pilot／qaseed mode 追記版）

## 1. Implementation diff（3 ファイル・+27／−11）

| ファイル | 変更 |
|---|---|
| `src/core/data/rules.ts` | `stakes.lateRoundFrom: 5 → 6`（＋決定251 コメント）。**他の値は不変**（divinationCount 2・lateRoundAtkMul 1.3・enemyAtkStep／HpStep 1.15・block 0.75・heal 0.6・specialMul 1.2） |
| `src/core/engine/stakeRules.test.ts` | ①late-round テストを `RULES.stakes.lateRoundFrom` から導く形に更新（R5＝起点の 1 つ前には ×1.3 が乗らない／R6 で乗る）②機工師 R5 主砲の期待値から `lateRoundAtkMul` を外す（R5 は late surge 前）。いずれも **Expected Specification Update** |
| `src/components/battle/useReactionLanguage.test.ts` | gameVersion golden `1.6c581e56a02c0730`（決定247〜250）→ **`1.d97db7abd39e51e1`**（`dataFingerprint` に `RULES` が入るため）。engine 不変の検証（state 完全一致）は据え置き |

自動追従（コード変更なし）：`stakes.ts` の神階Ⅰ `addedRuleJa`・`describeStakeRules` → 「**R6以降 敵の攻撃+30%**」。`round.ts` の lateMul は R≥6。

変えていないもの：託宣 3／神階 2・敵表 E1・敵 HP／攻撃値・AP・カード 60 枚・神／OTOMO・God Strike・スコア・seed・Enemy Intent・7R・難易度・Daily・通常バランス・specialMul（双牙の魔獣 × Ⅵ は Known Issue のまま）。

## 2. Automated Gate

| 項目 | 結果 |
|---|---|
| tsc | 0 |
| lint（oxlint） | error 0（warning は既存 scripts のみ） |
| full tests | **1,266 PASS**／9 skipped（決定250 と同数。失敗 0） |
| build | OK。JS `index-Cz3tzyfF.js` 447.21kB（md5 `829af6b8…`）／CSS `index-Bb2gHnj6.css`（Production と同一 md5 `a88d74a6…`＝CSS 変更 0） |
| 決定58／DAILY-01／STAKE-01（`balanceSim.test.ts`） | PASS・違反 0（しきい値は変更していない） |
| **paired-seed 再計算**（Preflight と同一 harness・同一 seed `d251-0..99`・444,920 試合） | **After（実 runtime）＝Preflight 推奨 SPEC A_late6 と集計 40 項目・49 セル × 40 組すべて一致（mismatch 0）**。Before（override で 5 に戻した runtime）＝Preflight の prod と一致（mismatch 0） |

### 2-1. 神階Ⅴ／Ⅵ／Ⅶ（reader・100 seed・Before→After）

| 段 | reader | naive | greedy | defensive | reader−naive | late-surge 死亡 | R7 到達 | God Strike | 託宣/戦 | 撃破 R5/R6/R7 |
|---|---|---|---|---|---|---|---|---|---|---|
| **Ⅴ** | 79.4→**83.9** | 23.8→32.4 | 20.9→28.1 | 33.7→45.5 | 55.6→51.5 | 10.9→2.7 | 9.4→10.1 | 78→78 | 1.58→1.52 | 9/40/30→9/44/30 |
| **Ⅵ** | 74.9→**79.0** | 20.9→28.7 | 18.5→25.2 | 29.9→41.0 | 54.0→50.3 | 13.0→2.8 | 9.5→10.2 | 76→76 | 1.63→1.58 | 7/38/30→8/41/30 |
| **Ⅶ猛威** | 54.9→**63.5** | 10.6→15.3 | 9.6→12.7 | 17.3→25.7 | 44.3→48.3 | 27.6→6.1 | 9.6→10.0 | 71→73 | 1.78→1.74 | 5/26/23→6/32/26 |
| Ⅶ巨躯 | 51.9→56.1 | 12.8→19.5 | 10.4→16.1 | 17.9→26.1 | 39.0→36.6 | 19.3→6.6 | 28.6→29.7 | 80→81 | 1.83→1.79 | 1/18/33→1/20/35 |
| Ⅶ静寂 | 70.5→76.4 | 17.8→24.9 | 13.8→18.9 | 28.1→38.7 | 52.7→51.6 | 15.5→3.2 | 11.3→11.5 | 73→75 | 1.71→1.65 | 5/33/33→5/37/35 |

CEO 指定の一致確認：Ⅴ **83.9**／Ⅵ **79.0**／Ⅶ猛威 **63.5** ＝ Preflight と同値。

### 2-2. 神階Ⅰ〜Ⅳ（記録）

| 段 | reader | naive | greedy | defensive | reader−naive | late-surge |
|---|---|---|---|---|---|---|
| Ⅰ | 99.2→99.7 | 53.7→62.7 | 43.5→49.4 | 68.5→80.8 | 45.5→37.0 | 0.5→0.0 |
| Ⅱ | 96.9→97.3 | 50.8→60.2 | 42.3→50.1 | 63.7→77.0 | 46.1→37.1 | 0.7→0.1 |
| Ⅲ | 88.3→89.0 | 38.1→49.3 | 30.3→39.6 | 51.0→66.2 | 50.1→39.7 | 2.1→0.4 |
| Ⅳ | 83.9→86.6 | 31.2→42.1 | 25.1→34.1 | 44.0→58.4 | 52.8→44.6 | 5.3→1.1 |

### 2-3. 通常／easy／hard／Daily
level 0 の 4 方策（通常）と easy／hard／Daily の 3 方策 × 60 seed：**win／lost／unfinished がすべて Before と同一**（`lateRoundFrom` は `NO_STAKE_RULES` で null）。

### 2-4. Special regression watch

| 監視項目 | Preflight | Pilot（実 runtime） | 判定 |
|---|---|---|---|
| 神階Ⅴ naive ≥60% セル | 6→12 | 6→**12** | 増えていない |
| reader ≫ naive ≫ greedy | — | Ⅴ 83.9 ≫ 32.4 ≫ 28.1／Ⅶ猛威 63.5 ≫ 15.3 ≫ 12.7 | 維持 |
| 49 セル reader<50% | Ⅴ 0／Ⅵ 4／Ⅶ猛威 11 | Ⅴ 0／Ⅵ 4／Ⅶ猛威 11（Before 0／5／22） | 一致 |
| 双牙の魔獣 × Ⅵ（reader・7 神） | 22/24/94/17/98/30/59 | **同値** | Known Issue・悪化なし |
| 双牙の魔獣 × Ⅶ猛威 | 8/6/77/2/80/6/28 | **同値** | Known Issue・悪化なし |

## 3. Known issues
1. **双牙の魔獣 × 神階Ⅵ〜Ⅶ**：全行動が連撃のため specialMul が全ラウンドに乗る。恵比寿・大耀・才華・福永で Ⅵ 17〜30%・Ⅶ猛威 2〜8%。本 Pilot では修正しない（別 Decision）
2. 神階Ⅰ〜Ⅳ の naive が +9〜11pt（Ⅰ 53.7→62.7%）。reader は +0.4〜+2.7pt
3. Ⅶ巨躯の未撃破 27%（HP ×1.32 の設計上の試練・不変）
4. `gameVersion` が変わるため自己ベストの版が分かれる（Ranking は dormant）

## 4. Human QA（READY）

| | Before（Production runtime `a50b127`） | After（Pilot `feat/d251-godrank-recenter`） |
|---|---|---|
| ① 神階Ⅴ・大耀 × 藍花の怨霊 | `http://127.0.0.1:4261/?seed=d251-20&stake=5&enemy=onryo` | `http://127.0.0.1:4262/?seed=d251-20&stake=5&enemy=onryo` |
| ② 神階Ⅶ猛威・大耀 × 藍花の怨霊 | `http://127.0.0.1:4261/?seed=d251-14&stake=7&enemy=onryo` | `http://127.0.0.1:4262/?seed=d251-14&stake=7&enemy=onryo` |
| iPhone（同じ Wi-Fi） | `192.168.11.6:4261` | `192.168.11.6:4262` |

- 神は **大耀**・デッキは推奨（既定）。`?stake=7` は Ⅶ 選択画面で **猛威の試練** を選ぶ。`?seed=`・`?stake=`・`?enemy=` は決定126／決定40 の共有用バックドア（解放状態に関わらず挑戦可）
- seed の選定根拠（`qa-seeds.json`・reader bot）：`d251-20`＠Ⅴ＝Before は R5 の late-surge で敗北 → After は R7 撃破（残 HP 7）。`d251-14`＠Ⅶ猛威＝Before は R6 で敗北 → After は R6 撃破（残 HP 3）。人間の手順は bot と異なるため結果は保証しない（同 seed で初手・託宣結果は同一）
- 5 問：Q1 Ⅴが簡単になりすぎていないか／Q2 Ⅶ猛威が理不尽でなく判断次第で戦えるか／Q3 R5→R6 が急死ではなく終盤のクライマックスに感じられるか／Q4 託宣をいつ使うか考える必要が残っているか／Q5 通常戦と比べて神階らしい高難度感があるか。**5/5 YES で PASS**

---

## 5. Production Release — PRODUCTION LIVE / CLOSED（2026-09-30 JST）

- Human QA（CEO・2026-09-30）：**Q1〜Q5 すべて YES（5/5 PASS）** → **CEO が Production Release を承認**（対象 `b9b126e`）。Gate と Smoke の判定は AI 判断
- root cause：決定246 の E1（R5 に 2 番目の峰）× 神階Ⅰの R5 起点 late surge（×1.3）＝二段峰。change：`RULES.stakes.lateRoundFrom` **5 → 6**。simulation：Preflight **1,133,840** 試合・Pilot **444,920** 試合（Release Gate で再計算し Pilot evidence と完全一致）

| 項目 | 値 |
|---|---|
| final Production commit | **`b9b126e`**（`feat/d251-godrank-recenter`。lineage `289c457` → `da3e6ba`（Preflight docs）→ `b9b126e`） |
| 統合方法 | ローカル master を `289c457 → b9b126e` へ **fast-forward** → `git push origin master`。`feat/d224`・決定213 runtime には未接触（`git diff a50b127 b9b126e -- src` は rules.ts＋test 2 件のみ） |
| Release Gate | 差分 15 ファイル（runtime 3・docs 12）。`src` の実体変更は `lateRoundFrom: 5→6` の 1 行のみ（grep で確認）。tsc 0／lint error 0／**1,266 PASS**／clean rebuild の JS `index-Cz3tzyfF.js` md5 `829af6b8…`・CSS `index-Bb2gHnj6.css` md5 `a88d74a6…`（Production と同一）＝Human QA 版と一致。決定58／DAILY-01／STAKE-01 違反 0。**paired-seed 再計算（444,920 試合）＝Pilot evidence と集計・49 セル完全一致**：reader Ⅴ **83.9**／Ⅵ **79.0**／Ⅶ猛威 **63.5**、通常／easy／hard／Daily Before/After 同一 → **PASS** |
| Vercel Production deployment | **`6745262656`**（sha `b9b126e`・Production・success・2026-09-29T20:54:46Z） |
| Production URL | `https://seven-gods-game.vercel.app/`（配信 JS md5 一致・bundle 内 `lateRoundFrom:6`・God Strike mp4 200） |
| **Production Smoke**（Playwright・`docs/evidence/decision251/production-smoke/`） | **PASS**：①神階Ⅴ（`?seed=d251-20&stake=5&enemy=trial`・蒼毘）予告 R1..R5 ＝ 60／90／130／170／**150**（R5 に late +30% なし。旧 runtime なら 190）②神階Ⅶ猛威（`?seed=d251-14&stake=7&enemy=trial`）R1..R3 ＝ 70／110／150（×1.3225 の猛威が既定で適用）③通常戦（`rl-qa-7`・大耀×龍神）託宣 **残り3回**／神階は **残り2回** ④神階Ⅰ（`stake=1&enemy=trial`）で R6 まで生存：R5 **150**（+30% なし）→ R6 **130**（9×1.15×1.3＝13.45→13：R6 から +30%）⑤God Strike（rl-qa-7）：共鳴 7/7 R5 → カットイン → 動画 → 突き／着弾 1,600・stop 80・敗北（残 120／1,030）＝決定250 Smoke と同一 ⑥console error 0・横スクロール 0（全シナリオ）。**同 seed の Pilot（:4262）との parity**：神階Ⅴ／Ⅶ猛威／通常の予告・HP・結果が **IDENTICAL**。God Strike シナリオは結果（敗北・残 120）と敵 HP（190/1,030）が同一、途中の盾合計だけ harness のクリック取りこぼしで差（engine 差ではない） |
| Human QA 5/5 | Q1 Ⅴが簡単になりすぎていない YES／Q2 Ⅶ猛威は理不尽でなく判断次第 YES／Q3 R5→R6 が終盤のクライマックス YES／Q4 託宣の切りどころが残る YES／Q5 神階らしい高難度感 YES |
| V／VI／VII final（reader・100 seed・Before→After） | Ⅴ 79.4→**83.9**／Ⅵ 74.9→**79.0**／Ⅶ猛威 54.9→**63.5**（Ⅶ静寂 70.5→76.4・Ⅶ巨躯 51.9→56.1）。naive 32.4／28.7／15.3・reader−naive 51.5／50.3／48.3pt・late-surge 死亡 2.7／2.8／6.1% |
| Normal／Easy／Hard／Daily | Before／After **同一**（sim 全値一致・Production Smoke の通常戦も決定250 と同一） |
| rollback target | Vercel **`6739038138`**（sha `289c457`・runtime `a50b127`） |
| cleanup | QA preview :4261／:4262 停止（pid 18940／9076）。一時ファイアウォール 0 件（作成していない） |

**Known Issues**：①双牙の魔獣 × 神階Ⅵ〜Ⅶ（連撃のみの敵に specialMul が全 R に乗る。4 神で Ⅵ 17〜30%・Ⅶ猛威 2〜8%・悪化なし）②Ⅶ巨躯の未撃破 27%（HP ×1.32 の設計上の試練）③神階Ⅰ〜Ⅳ の naive +9〜11pt（reader +0.4〜+2.7）④`gameVersion` が `1.d97db7abd39e51e1` に変わり自己ベストの版が分かれる（Ranking は dormant）。

**決定251：PRODUCTION LIVE / CLOSED。**
