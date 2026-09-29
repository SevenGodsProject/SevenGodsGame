# 決定205（候補）— Solve Legibility v1 Implementation Spec / Preflight

- 日付：2026-09-19（CEO AWAY MODE）
- モード：**READ / MEASURE / TEST / DESIGN ONLY**（実装 0・runtime 変更 0・Production 変更 0・push 0・Ranking／Neon／secrets 0・Living Hero 0・fal／課金 0）
- 対象：Production `bba4c67`（決定202 LIVE）
- 上流：決定203（Solve Legibility Audit・推奨 A＋B）、決定196（Solve Loop v1）、決定187（P1 Result Hub・次の目標 1 行原則）、決定189（P2 49 matchups）
- 区分：仕様の各判断は **AI判断**（CLAUDE.md §6-2）。難易度そのものを変える案は本仕様の範囲外（決定203 §9・CEO 判断）

---

## 0. 目的（1 文）

序盤で 1 回だけ、**「敵の予告を読んだ → 行動を変えた → 結果が変わった → 読めたと本人が理解した」** を成立させる。難易度は上げない。新 state は作らない。

## 1. 決定203 再現性監査

| 項目 | 確認結果 |
| --- | --- |
| 方法 | `scripts/decision203-solve-legibility/solveLegibility.audit.ts`（engine の `applyAction` を直接呼ぶ決定論シミュレーション。runtime 変更 0） |
| seed | `sl-${cond}-${godId}-${enemyId}-${i}`（i = 0..29）。同一 seed で blind と reader を同じ盤面で比較 |
| agent | **blind**：予告を見ない。効率最良の攻撃札 → 有用札 → 高コスト札。託宣は常に天啓（2）。**reader**：被弾後 HP <35% または致死（予告−ブロック ≥ HP）なら最大ブロック札 → 回復札、託宣は加護（0）。それ以外は blind と同じ |
| 条件 | easy／normal／hard（神階 0）＋神階Ⅰ〜Ⅶ（normal 基準・Ⅶ は `race`） |
| 網羅 | 7 神（おすすめデッキ）× 7 敵 × 10 条件 × 30 seed ＝ 490 セル・29,400 試合 |
| 集計 | 勝率・Δ（reader−blind）・「読まないと致死」ラウンド数／試合（ラウンド開始時に予告 ≥ 現 HP）・最初の致死 R・blind 残 HP・撃破 R |
| **再現性** | 同一設定で再実行し **490 セルすべて byte 一致**（`out/solveLegibility.run1.json` vs `solveLegibility.json`） |
| 限界 | reader はその回の予告のみ読む（溜め→必殺の 2 手読みなし＝機工師の読む価値は過小評価）。デッキ固定。人間の分布ではない（下限の証拠） |

推奨仕様の根拠となる値（再確認）：

| 値 | 数字 |
| --- | --- |
| ふつうの読む効果（全体） | blind 95.2% → reader 100%（**+4.8pt**）。致死 R 0.54/試合 |
| 初陣（恵比寿×試練の影・ふつう） | blind 100% ＝ reader 100%、致死 R **0.13/試合**、初回致死 R **5.0**（撃破 R4.8 より後）、残 HP 20.3/30 |
| 魔獣（連撃）・ふつう | blind **79.5%**、Δ **+20.5pt**、致死 R **1.27/試合**、初回致死 R **3.6**（7 敵で最早）。神別 blind：恵比寿 93.3・大耀 36.7・蒼毘 90・才華 86.7・寿楽 100・福永 76.7・笑蓮 73.3／reader は全神 100% |
| 機工師（溜め→必殺）・ふつう | blind 90.9%、Δ +9.1pt（2 手読み未実装のため下限） |
| 道化（溜め）・ふつう／神階Ⅶ | Δ +0.5pt／**+29.1pt** |
| 怨霊（遅咲き） | easy〜神階Ⅱ で blind 100%、hard でも 100%（倒し終わるまで個性が出ない） |
| むずかしい | Δ **+31.6pt**（6/7 の神で読む効果が初めて +10pt 超） |

**結論の再確認**：2 戦目の相手として **魔獣**を推す根拠は「ふつうのまま、R3〜4 に読む瞬間が来る唯一の敵」であること。神は固定しない（恵比寿でも 93.3%→100%、大耀なら 36.7%→100%）。

追加の focused simulation：**不要**（推奨仕様の判断に必要な値はすべて既存の 490 セルにある）。

---

## 2. A. Early Read Moment — exact spec

### 2-1. 利用する既存ロジック

| 既存 | 役割 | 変更 |
| --- | --- | --- |
| `src/components/battle/nextGoal.ts` `selectNormalGoal` | 「次の目標」1 行を上から順に選ぶ | **規則 1 本を追加**（下記 NR1） |
| `src/components/battle/resultContext.ts` `collectResultContext` | 決着時に storage を**読むだけ**で入力を集める | **入力 2 項目を追加**（`enemyId`・`earlyRead`） |
| `src/components/battle/resultHub.ts` `planResultExits` | 目標の action → Primary（`startNormal`／`record` は `rematch` に置換される・L66） | 変更なし。NR1 は **`reselect`** を使う（N2／N3／N9 と同じ経路） |
| `GameFlow.tsx` `backToGodSelect` | `reselect` → 神選択（god/deck/enemy をリセット） | 変更なし |
| `EnemySelectScreen.tsx` | 7 敵カード（P2 の ✓ chip あり） | **魔獣カードに固定 chip 1 個**（下記 2-6） |
| `src/hooks/matchupStorage.ts` `loadMatchups`／`countMatchupsByEnemy` | 49 攻略の読み取り | 変更なし（読むだけ） |
| `src/hooks/recordStorage.ts` `loadGodRecord` | 神別の勝敗記録（決着時に既に更新済み：`useGameEngine.ts:243`） | 変更なし（読むだけ） |
| `src/components/setup/firstBattle.ts` `FIRST_BATTLE_PRESET` | 初陣の構成（恵比寿・試練の影・ふつう・guardian） | 変更なし（判定に参照） |

### 2-2. 新規則 NR1（`nextGoal.ts`）

**位置**：`selectNormalGoal` 内、**N3 の後・N4（今日の神域挑戦）の前**。N1（敗北）・N2／N3（神階解放）は初陣の通常勝利では成立しないため、実質「初陣勝利の直後に最初に評価される規則」になる。

**成立条件（すべて AND）**：

1. `input.mode === 'normal'` かつ `input.status === 'won'`
2. `input.earlyRead.isFirstBattleSetup === true`  
   ＝ `godId === FIRST_BATTLE_PRESET.godId && enemyId === FIRST_BATTLE_PRESET.enemyId && difficulty === FIRST_BATTLE_PRESET.difficulty && stake === 0`
3. `input.earlyRead.godWinsAfterThis === 1`（恵比寿の通算勝利がこの 1 勝だけ＝**初勝利**。`loadGodRecord(godId).wins` は決着時に更新済みなので「この勝利を含めて 1」）
4. `input.earlyRead.targetCleared === false`（魔獣をどの神でも未撃破：`countMatchupsByEnemy(data, ENEMY_IDS.juuma) === 0`。matchups が `available: false` のときは **false 扱い＝表示する**）

→ 条件 3 により **1 回だけ**表示される（records を消さない限り 2 度と出ない）。新 state は不要。

**出力**：

```ts
{
  id: 'NR1',
  text: '次は連撃型「双牙の魔獣」に挑む — 予告を読む戦い',
  action: 'reselect',
  primaryLabel: '魔獣に挑む（神を選ぶ）',
}
```

`NextGoalId` に `'NR1'` を追加。`ResultAction` は不変。

### 2-3. `NextGoalInput` への追加（`nextGoal.ts`・`resultContext.ts`）

```ts
// NextGoalInput（通常モードのみ）
enemyId: EnemyId                      // 既存 enemyName の隣
earlyRead?: {
  isFirstBattleSetup: boolean
  godWinsAfterThis: number
  targetCleared: boolean
} | null
```

`collectResultContext`（通常モード分岐）で読み取り：

```ts
const record = loadGodRecord(state.godId)                         // 既存 API・読むだけ
const matchups = loadMatchups(now.getTime())                      // 既存 API・読むだけ
earlyRead: {
  isFirstBattleSetup:
    state.godId === FIRST_BATTLE_PRESET.godId &&
    state.enemy.defId === FIRST_BATTLE_PRESET.enemyId &&
    state.difficulty === FIRST_BATTLE_PRESET.difficulty &&
    (state.stake ?? 0) === 0,
  godWinsAfterThis: record.wins,
  targetCleared: matchups.available ? countMatchupsByEnemy(matchups.data, ENEMY_IDS.juuma) > 0 : false,
}
```

書き込み 0。`resultContext.ts` は `firstBattle.ts`（`components/setup`）を import する＝表示層内の依存で `src/core` は不変。

### 2-4. 表示回数・他機能との関係

| 観点 | 仕様 |
| --- | --- |
| いつ 1 回だけ表示するか | 恵比寿の**初勝利**（`wins === 1`）かつ初陣構成かつ魔獣未撃破のとき。以後は `wins ≥ 2` で不成立 |
| Save / Resume | 影響なし。NR1 は決着時にだけ評価され、`battleSave` は決着で消える。途中中断→再開→勝利でも同じ判定 |
| First Clear（P2） | 初陣勝利は「✨ 初撃破：恵比寿 × 試練の影（この敵 1/7 神）」も同時に出る。**両立**（別要素・別行）。NR1 の文はそれと重複しない |
| 49 progression | 不変。魔獣戦の勝利は既存どおり matchup に記録される |
| Daily | NR1 は N4（今日の神域挑戦）より前に **1 回だけ**勝つ。Daily の意味論・回数・seed は不変 |
| 神階 | N9（むずかしいで神階解放）は NR1 の後。初陣直後は NR1 → 次の勝利から N4／N9 の従来順 |
| seed | 通常戦の新 seed（`startGame` 既定）。Solve Loop v1（敗北→同 seed）はそのまま |
| 「次の目標」クリック時の遷移 | Primary（`reselect`）→ `backToGodSelect()` → 神選択（god/deck/enemy リセット）→ 敵選択（魔獣カードに chip）→ デッキ → 戦闘。既存 4 tap |
| God を固定するか | **固定しない**。恵比寿のままでも読みが要る（blind 93.3%）。攻め型を選べば読みの必要はさらに立つ（大耀 36.7%） |
| Enemy だけ指定するか | **指定しない（推奨のみ）**。文と chip で誘導する。「神に委ねる」を選んでも止めない |
| Deck を変更可能にするか | **可能**（既存のデッキ画面をそのまま通る） |

### 2-5. 文言（固定・変数なし）

| 場所 | 文言 |
| --- | --- |
| 次の目標（NR1） | `次は連撃型「双牙の魔獣」に挑む — 予告を読む戦い` |
| Primary | `魔獣に挑む（神を選ぶ）` |
| 敵選択 chip（魔獣のみ） | `予告を読む戦い` |

### 2-6. 敵選択の chip（`EnemySelectScreen.tsx`）

- 表示層の定数 `READ_TRAINING_ENEMY = ENEMY_IDS.juuma`（`src/core` には置かない）
- 魔獣カードの `【連撃型】` の直後に `<span className="enemy-select-read-chip" data-testid="enemy-read-chip">予告を読む戦い</span>` を**常時**表示（NR1 の表示有無に依存しない＝state 不要）
- CSS（`setup.css`）：金枠の小 chip 1 規則（`.enemy-select-read-chip`）。既存 `.enemy-select-matchup` と同じ行に並べる

---

## 3. B. Result「読みの成績」— exact spec

### 3-1. 定義（`battleRecap.ts` の既存事実のみ）

各敵行動バッチの `evaluateDefense(batch, intent)` から：

- **予告あり**（N）：`attacked === true || neutralized === true`（charge＝0 ダメージは数えない）
- **受け切った**（M）：`perfect === true || neutralized === true`

`RecapFacts` に `attacks: number`（N）と `held: number`（M）を追加（`perfect`／`neutralized`／`perfectBig` は残す）。

### 3-2. 行（`buildBattleRecap`）

- **勝利**：現行の `大技を N 回、無傷で受け切りました`／`敵の攻撃を N 回、無傷で受け切りました` を **1 行に置換**：
  - `facts.complete && facts.attacks >= 1` のとき `予告 ${attacks} 回のうち ${held} 回を受け切りました` を **先頭**に push（`burstFinish` の行がある場合はその次）
  - `perfectBig > 0` のときは末尾に `（大技 ${perfectBig} 回を含む）` を付ける
  - `held === 0` でも出す（「1 回も受け切れなかった」が分かることが目的）
  - 既存の `封じ切りました`（neutralized）の行は M に吸収されるため削除
- **敗北・未撃破**：既存の `あと N で撃破でした`／敗因の助言（最大 1）に加え、`facts.complete && facts.attacks >= 1` なら同じ行を **先頭**に push（3 行上限内。敗因 G1 と並ぶと「予告 4 回のうち 1 回を受け切りました／R4：110 の大技に対し盾は 0 でした」となり、読みの成績→原因の順で読める）
- `complete === false`（再開でログ欠落）のときは出さない（既存方針）

### 3-3. 表示

`GameOverOverlay.tsx` の `data-testid="battle-recap"` の `<li>` にそのまま乗る。**変更なし**。

---

## 4. Exact Files / Diff（実装時）

| ファイル | 変更 | 目安 |
| --- | --- | --- |
| `src/components/battle/nextGoal.ts` | `NextGoalId` に `'NR1'`、`NextGoalInput` に `enemyId`／`earlyRead`、`selectNormalGoal` に規則 1 本（N3 の後） | +25 |
| `src/components/battle/resultContext.ts` | `enemyId` と `earlyRead` を読み取りで組み立て（`loadGodRecord`・`loadMatchups`・`countMatchupsByEnemy`・`FIRST_BATTLE_PRESET`・`ENEMY_IDS` を import） | +15 |
| `src/components/battle/battleRecap.ts` | `attacks`／`held` を数え、勝利・敗北の行を 3-2 のとおりに | +15／−6 |
| `src/components/setup/EnemySelectScreen.tsx` | 魔獣カードに chip 1 個 | +6 |
| `src/components/setup/setup.css` | `.enemy-select-read-chip` 1 規則 | +8 |
| `src/core/**` | **0** | – |
| storage／saveVersion／gameVersion／依存 | **0** | – |

### 4-1. テスト変更（既存）

| ファイル | 変更 |
| --- | --- |
| `nextGoal.test.ts` | `base()` に `enemyId`・`earlyRead: null` を追加（既存ケースは不変のまま通る）。NR1 のケース 5 本追加（下記 §5-1） |
| `battleRecap.test.ts` | 132〜134 行の `perfectBig`／`perfect` の行一致検査を「予告 N 回のうち M 回」形式に置換。`held === 0` の行・敗北時の行のケースを追加 |
| `resultHub.test.ts` | 変更なし（`reselect` の Primary ラベルは `goal.primaryLabel` で既に上書き可能） |
| `matchupWiring.test.ts`・`solveLoopWiring.test.ts` | 変更なし（書き込み点は増えない） |

---

## 5. Automated QA Plan

### 5-1. 単体（vitest）

- NR1：①初陣構成・初勝利・魔獣未撃破 → `NR1`／`reselect`／Primary 文言 ②`godWinsAfterThis === 2` → NR1 不成立（N4 以降へ）③`targetCleared === true` → 不成立 ④初陣構成でない（敵が鬼将）→ 不成立 ⑤敗北 → N1 のまま ⑥`matchups.available === false` でも成立（read-only fallback）
- recap：①予告 4／受け切り 3 の勝利 → 先頭行 `予告 4 回のうち 3 回を受け切りました` ②`held === 0` → `予告 3 回のうち 0 回…` ③敗北で G1 助言と共存し 3 行以内 ④`complete === false` → 行なし ⑤charge のみのラウンドは N に数えない ⑥neutralized は N・M 両方に数える
- 配線（source-pinned）：`resultContext.ts` に `saveBattle`／`recordGameResult`／`recordMatchupClear` の呼び出しが無い（読むだけ）／`src/core` に `nextGoal` 由来の import が無い

### 5-2. ブラウザ（新規 `scripts/solve-legibility-v1/acceptance.mjs`・既存 acceptance の流儀）

1. storage 空 → 初陣 → 勝利（自動プレイ）→ `[data-testid="next-goal"][data-goal-id="NR1"]` が出る・Primary 文言 `魔獣に挑む（神を選ぶ）`・✨ 初撃破の行と両立
2. Primary → 神選択 → 敵選択で `[data-testid="enemy-read-chip"]` が魔獣カードにだけある → 魔獣を選ぶ → 戦闘開始（seed は新規）
3. 魔獣戦を「読まずに」自動プレイ（End Round のみ）→ 敗北 → recap 先頭に `予告 N 回のうち M 回を受け切りました`（M < N）・Primary は「同じ盤面でもう一度」（決定196 不変）
4. 同 seed で「読んで」プレイ（危険時にブロック札／加護）→ 結果で M が増える＝**読んだ→変わった→分かった** の機械確認
5. 2 回目の恵比寿×試練の影 勝利 → `data-goal-id` が `NR1` **でない**（1 回だけ）
6. Daily：神域挑戦の決着で D1〜D4 のみ（NR1 は出ない）。回数消費 1→2 不変
7. 回帰：E1 acceptance・Solve Loop 17 項目・Hardening・CLS／44px・画面スモーク・Ranking Absence・Secret Audit

### 5-3. Exit Criteria

- 上記すべて PASS・`src/core` diff 0・vitest 全通過・CEO Human QA PASS

---

## 6. CEO Human QA（5 分）

1. 新しい端末（storage 空）で初陣に勝つ → 「次は連撃型『双牙の魔獣』に挑む — 予告を読む戦い」が出るか
2. 押して魔獣を選ぶ（chip が見えるか）→ 戦う → **R3〜4 で「盾を用意しないと危ない」と感じるか**
3. 結果の 1 行目「予告 N 回のうち M 回を受け切りました」を見て、**自分が読めたか／読めなかったかが分かるか**
4. 負けたら「同じ盤面でもう一度」で読み直し、M が増えるのを見る
5. もう一度 恵比寿×試練の影 に勝つ → 魔獣の目標は出ない（1 回だけ）

質問はひとつ：**「読んだから結果が変わった、と自分で分かったか」**

---

## 7. Known Risks

| リスク | 評価 | 対処 |
| --- | --- | --- |
| 魔獣を選ばない | 中 | 文＋chip の誘導のみ（強制しない）。効果は Human QA と Feedback で見る。次段で「神に委ねる」の初回抽選を魔獣に寄せる案は **今回は入れない**（seed 選出の意味論に触れる） |
| 初勝利判定が records 依存 | 低 | records は決着時に既に更新済み（`useGameEngine.ts:243`）。records を消した端末では再表示されるが害はない |
| recap の行が 3 行を超える | 低 | push は `RECAP_MAX_LINES` で切る。読みの行を先頭に置くため落ちるのは末尾の行 |
| 既存 recap テストの一致検査 | 中 | 132〜134 行を新形式へ更新（仕様 §4-1） |
| 大耀を選んだ新規が魔獣に負け続ける | 低 | 決定196 の同盤面再挑戦と G1 助言があり、負けは学びに変わる。勝率は reader で 100% |

## 8. NOT BUILD（本 Decision）

- ふつうの敵 ATK 変更・敵の行動表変更（決定203 §9・CEO 判断）
- 初陣の敵を魔獣に変える（決定193「負けない初陣」維持）
- 「読み」の新 state・実績・通貨・チュートリアル戦・数ラウンド先の予告表示
- Living Hero・OTOMO identity・49→nextGoal の一般接続（別 milestone）

## 9. Preflight 判定

**READY FOR IMPLEMENTATION（CEO 承認後）。** 追加判断を要する点は残っていない。実装は runtime 5 ファイル（表示層のみ）・テスト 2 ファイル更新＋受け入れスクリプト 1 本。想定 1〜1.5 日。

```
【CEO DECISION REQUIRED】（帰宅後）
Issue：Solve Legibility v1（A. Early Read Moment ＋ B. 読みの成績）の実装着手
AI Recommendation：着手（表示層のみ・Core 0・state 0・Daily／Save／Ranking 不変）
Reason：決定203 の再現性 PASS。初陣の道筋に「読む瞬間」が 0 回であることは 29,400 試合で確定。魔獣はふつうのまま R3〜4 に読む瞬間を作れる唯一の敵
Alternatives：難易度を締める（Core・CEO）／何もしない → 「解く」は既定の道筋で証明されないまま
Risk：魔獣を選ばないプレイヤーには効かない（誘導のみ）
CEO Action：承認 / 保留
```
