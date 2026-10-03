# 決定262：Card Decision Meaning — Answer Visibility v1（「解き方」1 行）Narrow Pilot

- 日付：2026-10-03
- 判断主体：Pilot の GO・採用仕様は **CEO**（2026-10-03「CEO承認：GO」）。実装方式・文テンプレート・Gate 設計・PASS 判定は **AI 判断**（CLAUDE.md §6-2）
- Preflight：`docs/CARD_DECISION_MEANING_ANSWER_VISIBILITY_PREFLIGHT.md`（GO WITH MODIFICATIONS → CEO GO）
- 状態：**Fast Gate G1〜G6 PASS → HUMAN QA READY**（Production 未反映。RC 基準 runtime `8cba184` は固定・本件は POST-RC）
- worktree `C:/Users/kimi1/SevenGodsGame-d262`・branch `feat/d262-answer-visibility-v1`（master `7364c17` 起点）

---

## 1. 採用仕様（CEO・2026-10-03）
- 結果画面「振り返り」に **「解き方」1 行のみ**追加
- 戦闘ログの事実だけから生成／**正解を事前に教えない**／既存の振り返り **最大 3 行**を維持
- 「続きから」の戦闘では既存ガード（`GAME_STARTED` なし＝不完全ログ）に従い**非表示**
- カード性能／AP／敵 HP／ダメージ／ドロー／神託回数：**変更しない**
- `src/core`・save・timing・CSS：**変更しない**

## 2. 実装【AI 判断】

| ファイル | 変更 |
|---|---|
| `src/components/battle/battleRecap.ts` | `SolutionFacts` 型・`collectSolutionFacts(log, state)`（純関数）・`describeSolution(facts)`（文テンプレート）を追加。`buildBattleRecap` が `solution` を返し、**勝利では 1 行目**、敗北・未撃破では助言のあとに置く（上限 3 行は `push` の既存ガードで維持） |
| `src/components/battle/battleRecap.test.ts` | 決定262 の 8 テストを追加（テンプレート 4 型＋弱体 2 型＋回復＋非表示 3 条件＋禁止語＋不完全ログ＋reducer 実走での事実一致＋加護／盾札の出どころ）。既存テストは「解き方」が 1 行目に入る前提へ 3 箇所だけ調整 |
| `scripts/d262-answer-visibility/result-gate.mjs`・`compare.mjs` | Gate G4／G5 の監査スクリプト（ゲームコードではない） |
| `src/core`・`GameOverOverlay.tsx`・`battle.css`・event・save・RULES | **変更 0**（表示は既存の `.game-over-recap` の `<li>` にそのまま乗る） |

### 2-1. 「大技」と「解き方」の定義（ログの事実のみ）
- **大技**＝予告（`ENEMY_INTENT_SET.amount`・デバフ適用前の合計）または実行値（`ENEMY_ACTED.amount`）が `RULES.cardBonus.enemyBigThreshold` 以上の敵行動のうち、**予告が最大のもの**（溜めは除く）。1 戦に 1 つ
- そのラウンド（直前の `ROUND_STARTED` 以降）で得たブロックを**出どころ別**に数える：
  - **盾札**＝`CARD_PLAYED` のあとに出た `BLOCK_GAINED(self)`
  - **加護**＝`DIVINATION_USED` のあとに出た `BLOCK_GAINED(self)`（加護以外の託宣はブロックを出さないので自然に区別される）
  - **盾**（出どころ不明）＝それ以外（得意技など）
- **弱体**＝予告 > 実行値 という事実そのもの（実行値 0 なら「封じた」）。持続ラウンドの復元はしない
- **回復**＝そのラウンドの `HEALED` の和。**HP 被害**＝敵行動のバッチの `DAMAGE_DEALT(self)` の和
- 大技を一度も受けずに勝利＝「大技を受ける前に撃破」。敗北・未撃破で大技が無い場合は何も言わない
- 大技のバッチで敗北（`fatal`）＝敗因の助言 G1（決定167）が実行値と盾を言うため、**重ねて出さない**

### 2-2. 文テンプレート（固定・数値を入れるだけ）
| 事実 | 文 |
|---|---|
| 盾札のみ・無傷 | R4の大技（310）を、盾札で受け切りました |
| 加護のみ・無傷 | R4の大技（310）を、加護で受け切りました |
| 盾札＋加護・無傷 | R4の大技（310）を、盾札と加護で受け切りました |
| 弱体で削り＋盾札・無傷 | R4の大技（310）を、弱体で210まで削り、盾札で受け切りました |
| 弱体で 0 | R4の大技（310）を、弱体で封じました |
| HP 被害あり | R4の大技（310）を、盾札で受けました（HPへ210） |
| HP 被害＋回復 | R4の大技（310）を、盾札で受けました（HPへ210・回復60） |
| 盾なし・HP 被害 | R4の大技（310）を、盾を積まずに受けました（HPへ310） |
| 大技前に撃破 | 大技を受ける前（R3）に撃破しました |
| 致命の大技（敗北）／不完全ログ | （出さない） |

- 禁止語（既存テスト＋追加）：`勝てた|勝てました|べきだった|出せば|使えば|正解|正し|読め|読ん|理解|狙|上手|惜し|評価|点|おすすめ|次は`＝**正解を教えない・後知恵を言わない・意図を推測しない**
- 振り返りの順序：勝利＝**解き方 → 予告された攻撃 N 回中 M 回無傷 → 神の一撃で決着 → HP 立て直し → 得意技 → ⚡**（上限 3）。敗北・未撃破＝予告の事実 → あと N で撃破 → 助言 G1〜G4 → 解き方（上限 3）

## 3. Fast Gate【実測】

| # | 内容 | 結果 |
|---|---|---|
| G1 | vitest：reducer 実走（6 神×敵 × 2 方針）で復元した事実（出どころ別ブロック・予告・実行値・HP 被害・ラウンド）が独立計算と一致。加護／盾札の出どころを reducer 実走で確認 | **PASS**（`battleRecap.test.ts` 24 件） |
| G2 | 禁止語 0・不完全ログで非表示 | **PASS** |
| G3 | tsc 0・oxlint error 0・vitest 全件 | **PASS**（vitest 1,311 passed／9 skipped。1 回目の全件実行で `determinism.test.ts` が 5.7 s で timeout → 単独再実行 7/7 PASS・scratch テスト除去後の再実行で全件 PASS＝負荷起因） |
| G1 補助 | 7 神 × 7 敵 × 3 seed × 2 方針＝294 戦の reducer 実走（scratch・commit なし）：行あり 266／致命の大技で非表示 28／行数最大 3／1 行の長さ 平均 36・最大 54 字／型 22 種（最多「弱体削り＋盾札＋加護・無傷」35・「盾札＋加護・無傷」32） | 記録 `docs/evidence/decision262/d262-dist.json` |
| G4 | PC 1508×660／SP 390×844／SP 390×660 の結果画面：Before（master `7364c17`＝Production runtime）／After の箱差分・横スクロール・console | **PASS**（§3-1：6 戦＋再計測 2 戦。横スクロール 0・console／pageerror 0・幅／左端の差 0・top 差は振り返りの高さ差（0〜21px）どおり） |
| G5 | 行数 ≤3・SP で各行 2 行折返し以内 | **PASS**（全戦 3 行以内。SP 390 で「解き方」行は最長 2 行折返し＝li 高さ ≤ lineHeight×2） |
| G6 | 既存 `battleRecap.test.ts`／`decisionFeedback` テスト不変（順序前提の 3 箇所のみ調整） | **PASS** |
| build | After `index-CQhhdQNw.js`（md5 `88a49ef4…`）・CSS `index-BE9_YcYs.css`（md5 `e0f4ae5f…`＝**Production と同一＝CSS 変更 0 の証明**）。Before `index-BRcv8Oau.js`（`e6c26c81…`＝Production） | **PASS** |

### 3-1. G4／G5 結果（`compare.mjs`・evidence `docs/evidence/decision262/`）

| # | 面 | 戦闘 | Before→After 振り返り | Δh | 横スクロール | console | 箱差分 | After 1 行目 |
|---|---|---|---|---|---|---|---|---|
| 1 | PC 1508 | 大耀×乱舞の道化 | 3→3 行 | 0 | 0 | 0 | PASS | R3の大技（240）を、盾札と加護で受け切りました |
| 2 | PC 1508 | 蒼毘×双牙の魔獣 | 3→3 行 | 0 | 0 | 0 | PASS（注 1） | R4の大技（160）を、弱体で50まで削り、盾札で受け切りました |
| 3 | SP 844 | 大耀×乱舞の道化 | 3→3 行 | 0 | 0 | 0 | PASS | R3の大技（240）を、盾札と加護で受け切りました |
| 4 | SP 844 | 蒼毘×双牙の魔獣 | 3→3 行 | +20 | 0 | 0 | PASS（再計測） | R4の大技（160）を、弱体で50まで削り、盾札で受け切りました |
| 5 | SP 660 | 福永×業斧の鬼将 | 3→3 行 | +20 | 0 | 0 | PASS | R4の大技（260）を、盾札で受けました（HPへ110・回復80） |
| 6 | PC 1508 | 寿楽×蒼海の龍神 | 2→3 行 | +21 | 0 | 0 | PASS | R4の大技（200）を、盾を積まずに受けました（HPへ200） |

- 「解き方」行が入っても振り返りは 3 行のまま（最下位の行＝⚡回数・得意技が落ちる）。#6 だけ 2→3 行（＋21px）
- 注 1：初回計測は自動プレイが Before／After で分岐（予告 4 回 vs 5 回）したため再計測。再計測では同一経路（事実行一致）で、静的な箱（card 503×561・recap 437×73・li 20×3・status／score／w／left）はすべて一致。スコア内訳と最初のボタンだけ top が −5px＝結果カードの出現アニメーション `result-rise`（translateY 10px→0・最長 delay 1.9s＋0.5s）の途中で測ったことによる揺らぎ（1.8s 時点）。待ち時間を 3.2s に延ばした 3 回目の再計測は **RAM 不足で Claude Code により停止**（After #2 のみ取得・同じ行）。Before 側は未取得のため 3 回目の数値は採用せず、注 1 の説明のまま PASS とする
- CSS 変更 0 の証明：After の CSS bundle md5 `e0f4ae5f…`＝Production と同一
- screenshot：`docs/evidence/decision262/shots/{before,after}-b{1..6}-*.png`

## 4. Human QA（CEO・READY）
- Before：`http://192.168.11.6:4301/`（master `7364c17`＝Production runtime `8cba184`）／After：`http://192.168.11.6:4302/`（決定262）
- 最低 2 戦（After）：**1. 乱舞の道化**（加護で受ける敵）→ **2. 双牙の魔獣**（連撃・回復で受ける敵）。同じ seed で Before と比べたい場合：`?enemy=doukeshi&seed=d262-qa1`／`?enemy=juuma&seed=d262-qa2`
- 確認項目：
  1. 表示の正しさ：結果画面の振り返り 1 行目「R{n}の大技（…）を、…で受け切りました／受けました」が、自分がそのラウンドにした行動（盾札を出した／加護を使った／弱体が入っていた／回復した）と一致しているか（YES／NO）
  2. **「自分がどう解いたかが、以前（Before）より分かるか」**（YES／NO）
  3. **Session 2 Q2 相当：「手札によって今回はどう戦おうと考えたか」**（2 戦目で回答・YES／NO）
  4. 行数・読みやすさ：振り返りが 3 行以内で、SP で読める長さか（YES／NO）
- 判定：Q2 と Q3 が YES → 決定262 の効果あり（Release Gate へ）。NO → **無理に拡張せず STOP**し、次候補「開幕の手札読み Preflight」へ（CEO 指示）

## 5. 変更しなかったこと
- `src/core`・GameEvent・save・RULES・timing 定数・CSS・画像・音声：0。Production：未反映（RC 基準 `8cba184` 固定）
- 数値（カード性能／AP／敵 HP／ダメージ／ドロー／神託回数）：0

---

## 6. CEO Human QA 結果 → **HUMAN QA NO／NO-GO**（2026-10-03）【CEO】

- Q「『R3の大技を盾札で受けました』という振り返りを見て、自分がどう戦ったのか以前より分かりやすくなったか？」→ **NO**
- CEO 判断：**表示内容が事実として正しいこと**（Fast Gate G1〜G6 PASS）と、**プレイヤー体験として効果があること**は分けて評価する。本 Pilot は前者を満たし、後者を満たさなかった
- 結論：**「結果画面で解き方を説明する」方向は拡張しない**。Production へ release しない。RC runtime `8cba184` は変更しない
- 扱い：Pilot branch `feat/d262-answer-visibility-v1`（`f8037d8`・`e2d55bb`）は削除せず保持。**master runtime へ merge しない**。QA preview サーバ（:4301／:4302）は停止済み
- K33「Card Decision Meaning」：**OPEN 維持**。presentation（事後の可視化）は lever ではないと確定。次の lever ＝ **戦闘中・開幕に「この手札でどう戦うか」を考える構造**（「開幕の手札読み」Preflight・CEO 指示）
- 同日の Visual QA 所感「敵と神のまわりの円や四角の枠が気になる」は決定262 とは混ぜず、K34「Battle Composition v3 — Character Integration / Duel HUD」の evidence（`docs/evidence/final-practical-qa-v2/visual-qa-frames-2026-10-03.md`）へ記録
