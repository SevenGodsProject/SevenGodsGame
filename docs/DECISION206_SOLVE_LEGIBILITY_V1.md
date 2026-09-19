# 決定206 — Solve Legibility v1（予告を読む戦いへの誘導 ＋ 予告された攻撃の事実表示）

- 日付：2026-09-19
- 区分：**CEO 承認済みの実装**（決定205 仕様を採用。B は CEO 修正「評価・採点にしない。既存 telemetry の戦闘事実だけを表示する」を反映）
- branch：`feat/solve-legibility-v1`（local master `3551898` から分岐）。Production `bba4c67`・origin/master・master は不変。push／merge／deploy なし
- 上流：決定203（Solve Legibility Audit）、決定205（Implementation Spec／Preflight）、決定196（Solve Loop v1）、決定187（Result Hub）、決定189（49 攻略）

---

## 1. 目的

```
初陣（読まなくても勝てる）
  ↓ 次の目標（NR1）：「次は連撃型『双牙の魔獣』に挑む — 予告を読む戦い」
  ↓ 敵選択：魔獣カードの chip「予告を読む戦い」
  ↓ 双牙の魔獣：R1 から連撃（合計 9〜16）。予告を見て盾を用意する理由が初めて生まれる
  ↓ Result：「予告された攻撃 N回のうち、M回を無傷で受け切りました（盾で防いだ量 X）」
  ↓ 負けたら「同じ盤面でもう一度」（決定196）で行動を変えて再挑戦 → 盾の量・無傷回数が変わる
```

「あなたは読めた」とは言わない。**予告された攻撃に対して実際に何が起きたか**だけを見せる。

## 2. 実装（表示層のみ）

| ファイル | 変更 |
| --- | --- |
| `src/components/battle/nextGoal.ts` | `NextGoalId` に `'NR1'`。`EarlyReadInput`（`isFirstBattleSetup`／`godWinsAfterThis`／`targetCleared`）。規則 NR1 を **N3 の後・N4 の前** に追加。誘導先の定数 `EARLY_READ_TARGET_ENEMY_ID = ENEMY_IDS.juuma`（表示層の導線定数） |
| `src/components/battle/resultContext.ts` | `collectEarlyRead(state, now)`：`FIRST_BATTLE_PRESET` との一致、`loadGodRecord(godId).wins`（決着処理で更新済み＝この勝利を含む）、`countMatchupsByEnemy(matchups, juuma) > 0`（記録が読めなければ false）を **読むだけ** で組み立てる。勝利時のみ |
| `src/components/battle/battleRecap.ts` | `RecapFacts` に `announced`（予告された攻撃＝`attacked || neutralized`）・`unharmed`（`perfect || neutralized`）・`blockedTotal`（予告された攻撃で盾が吸収した合計）。`describeAnnouncedAttacks()` が 1 行を作り、勝敗を問わず **先頭** に置く。旧「大技を N 回、無傷で受け切りました」「封じ切りました」の 2 行は統合 |
| `src/components/setup/EnemySelectScreen.tsx` | 魔獣カードの型ラベル直下に chip「予告を読む戦い」（`data-testid="enemy-read-chip"`）。常時表示・state 無し |
| `src/components/setup/setup.css` | `.enemy-select-read-chip` 1 規則（金の細枠） |

不変：`src/core` 差分 0、storage key 追加 0、saveVersion 9、gameVersion 不変、依存追加 0、難易度・敵行動・カード・神・OTOMO の数値変更 0、seed 意味論・Daily・Solve Loop・Ranking・Living Hero 変更 0。

### 2-1. NR1 の成立条件（すべて AND）

1. 通常モードで勝利
2. 初陣構成：恵比寿 × 試練の影 × ふつう × 神階 0（`FIRST_BATTLE_PRESET`）
3. 恵比寿の通算勝利数が **1**（この勝利が初勝利）→ 1 回だけ。新しい state を持たない
4. 双牙の魔獣をどの神でも未撃破（記録が読めない環境では「未撃破」扱い＝表示する）

出力：`{ id: 'NR1', text: '次は連撃型「双牙の魔獣」に挑む — 予告を読む戦い', action: 'reselect', primaryLabel: '魔獣に挑む（神を選ぶ）' }`。`startNormal` は Result Hub が `rematch` に置き換えるため使わず、N2／N3／N9 と同じ `reselect` 経路（神選択 → 敵選択 → デッキ → 戦闘）を通る。神は固定しない・敵は推奨のみ・デッキは変更可能・seed は新規。

### 2-2. Result の事実行（B）

| 状況 | 文 |
| --- | --- |
| M ≥ 1 | `予告された攻撃N回のうち、M回を無傷で受け切りました（盾で防いだ量 X）` |
| M = 0 | `予告された攻撃N回のうち、無傷で受け切った攻撃はありませんでした（盾で防いだ量 X）` |
| 封じ > 0 | 括弧内に `・封じk回` を添える |
| N = 0（R1 撃破など）・「続きから」でログが途中から | 出さない |

- N・M・X はすべて `evaluateDefense`／`DAMAGE_DEALT.blocked` の事実。意図（読めた・理解した・狙った）は数えないし書かない
- **「盾で防いだ量」を必ず添える理由（AI判断）**：双牙の魔獣は R1 から合計 9〜16 の連撃で、恵比寿の初期デッキ（盾札 2 枚）では「無傷」がほぼ成立しない。受け入れテストで「守る bot」が魔獣に勝っても無傷 0 回だった。無傷回数だけでは「守った」結果が Result に現れず、CEO の目的「行動を変えた → 結果が変わった」が見えないため、盾の吸収量（敗因の助言「盾は30でした」と同じ語・同じ事実）を同じ 1 行に置いた。読まない（無操作）なら盾 0、守れば盾 > 0 が同じ盤面で必ず対比できる（受け入れ B4-3／B4-4）
- 文言は既存 UI と整合：callout「無傷で受け切った」、敗因の助言「盾は…でした」「予告ぶんの盾」、初陣の説明「敵は次の行動を予告します」
- 敗北時は事実行 → 「あと N で撃破」→ 助言（最大 1）の順で 3 行以内

### 2-3. 決定189（AC19）の例外

`resultContext.ts` は従来「matchup を参照しない」検査下にあったが、NR1 の「魔獣未撃破」判定のため **読み取りのみ** の参照（`loadMatchups`／`countMatchupsByEnemy`）を許可した（`matchupWiring.test.ts` で「書き込み関数の呼び出しが無い」ことを固定）。`nextGoal.ts` 自体は引き続き matchup を知らない（boolean を受け取るだけ）。49 の一般接続ではない。

## 3. 自動 QA

| 項目 | 結果 |
| --- | --- |
| `npx tsc --noEmit` | 0 エラー |
| `npx oxlint src` | 0 警告 |
| `npx vite build` | 成功（`index-GqAh05FD.js` / `index-B5OzsYB-.css`） |
| `npx vitest run --dir src` | **91 files / 1,157 tests 全通過**（追加：NR1 9 件、`resultContext` 8 件、recap 事実行 6 件、AC19 例外 1 件） |
| `scripts/solve-legibility-v1/acceptance.mjs`（新規・11 シナリオ・38 判定） | **PASS 38/38** |
| Ranking Absence | PASS |
| Secret Audit | PASS |
| E1 回帰（`scripts/entrance-e1/acceptance.mjs`） | **ALL PASS**（24 項目・AC21 22/22）。1 回目は AC21 の「もう一度」探索が Primary／Secondary のみで 20/22。NR1 で「もう一度」が Tertiary リンクへ移る（決定205 仕様）ため、E1 スクリプトの探索先に Tertiary を追加して再実行 → 全通過。初陣 URL→最初のカード 3.8〜6.2 s・3 クリック |
| Solve Loop 回帰（17 判定） | **PASS 17/17**（敗北・未撃破＝同じ盤面、勝利＝新 seed、Daily 不変、逃げ道） |
| Hardening（不正 enemyId） | **ALL PASS**（H1〜H10。未知の敵 ID を含む保存・Daily・matchups でクラッシュ 0） |
| qa-flow（4 viewport） | **正常**（4 viewport：戦闘 scroll 0・続きから R2・勝利 R4・敗北 recap 2 行・Daily 勝利で残り 2 回・external 0・api 0・errors 0） |
| CLS | **PC 0.0074 / SP 0.046**（決定202 と同値・44px 未満 0） |
| screens-smoke | **壊れた画像 0**（PC／SP 各 9 画面） |
| save-migration（Production → RC） | **PASS**（Production `bba4c67` の保存 v9・R2 を本 branch で「続きから」→ 勝利。records／reward／stakes 保持、Daily 再開→勝利で残り 2 回、api/external/errors 0） |

### 3-1. 受け入れ（CEO 指定項目との対応）

| CEO 項目 | 判定 ID | 結果 |
| --- | --- | --- |
| NR1 成立 | A1-1〜A1-5 | NR1・文言・Primary「魔獣に挑む（神を選ぶ）」・初撃破の行と両立・preset 不変 |
| NR1 非成立 | A3-1／A5-1／A8-1／A10-1 | 2 勝目・魔獣既撃破・神階Ⅰ・既存プレイヤー（恵比寿 3 勝→4 勝）で出ない |
| 初陣未勝利 | A4-1／A4-2 | N1・「同じ盤面でもう一度」・seed 同一（Solve Loop 不変） |
| 初陣勝利 | A1／A2 | 神選択 → 魔獣 chip → デッキ画面 → 魔獣戦（新 seed・通常・神階 0） |
| 魔獣既撃破 | A5-1 | fixture（大耀で撃破済み）→ NR1 なし |
| Save/Resume | A6-1〜A6-3 | 続きから同 seed → 勝利で NR1 は出る／recap は回数を主張しない |
| Daily | A7-1／A7-2／B2-3 | D*・回数消費 1・`daily-` seed・事実行あり |
| 神域 | A8-1 | `?stake=1` → NR1 なし |
| Solve Loop | A4／B4-2 | 同じ盤面（seed 同一）不変 |
| direct seed | A9-1 | `?seed=` 固定でも NR1（seed 非依存） |
| old save | A10-1 | 既存 records（wins 3）→ NR1 なし |
| 0 予告 | vitest（R1 撃破の合成ログ） | 行を出さず「ラウンド1で撃破」 |
| M=0 | B2-1／B2-3／B4-1 | 「無傷で受け切った攻撃はありませんでした（盾で防いだ量 0）」 |
| victory | B1-1／B1-2 | M ≤ N・評価語なし |
| defeat | B2-1／B2-2 | 事実行 → 助言、3 行以内 |
| 7R not-cleared | B3-1 | 事実行 ＋「あと N で撃破でした」 |
| 49 progression | C1-1／C1-2 | ebisu×enemy_01 記録・魔獣カードに「未撃破」chip と読む chip が両方 |
| unknown enemy hardening | Hardening 回帰 | 上表 |
| 読んだ→変わった | B4-3／B4-4 | 同じ盤面で 無操作（盾 0・敗北）→ 守る（盾 > 0・勝利） |

### 3-2. 受け入れ 1 回目の FAIL 2 件（製品不具合ではない）

- A10-1：fixture に Daily が無く Home の Primary が「神域へ挑む」だった（製品は正しく N4）。判定を「初陣へ が出ない」に修正
- B4-3：守る bot が魔獣に勝っても無傷 0 回。指標を「盾の量または無傷回数の増加」に変え、事実行に「盾で防いだ量」を添えた（§2-2）

### 3-3. 実行環境の注記

空きメモリが少ない環境（Edge／VS Code 稼働中、空き 350〜950 MB）でバックグラウンド実行が 2 回停止された。フォアグラウンドで 1 本ずつ再実行して完走。`SL_ONLY=` で分割実行できるようにした。

## 4. CEO Human QA（約 5 分）— Preview `http://127.0.0.1:4181`

0. **Step 0（再発防止・2026-09-20 CEO 指示）：fresh origin で Home の金ボタンが「初陣へ」であることを確認する。**
   - 保存は origin（scheme＋host＋port）ごとに分かれる。過去の Human QA を行った `localhost:4181` ではなく **`127.0.0.1:4181`** など未使用の host で開けば、何も消さずに完全な新規状態になる
   - Edge の InPrivate は開いている全 InPrivate ウィンドウで一時ストレージを共有するため、先に **すべての InPrivate ウィンドウを閉じる**
   - Home に「自己ベスト」「七柱との絆」「今日の神域挑戦：残り n/3」が出ていれば新規ではない。金ボタンが「神域へ挑む」なら、それは初陣ではなく神域挑戦（Daily）に入る
   - 勝利画面は報酬カードを 1 枚選んでから「次の目標」と出口（Result Hub）に切り替わる（決定166）。NR1 は報酬選択後に出る
1. 「初陣へ」→ 勝つ → 報酬カードを 1 枚選ぶ → 結果に **「次は連撃型『双牙の魔獣』に挑む — 予告を読む戦い」** が出るか
2. 「魔獣に挑む（神を選ぶ）」→ 恵比寿のまま → 敵選択で魔獣カードの **「予告を読む戦い」** chip を見る → 選ぶ → デッキそのまま開始
3. 魔獣戦：R1 から予告（⚔ 9 →10 →12…）。**予告を見て、盾札や「加護」で先に守る**
4. 結果 1 行目「予告された攻撃 N回のうち、M回を無傷で受け切りました（盾で防いだ量 X）」を見る
5. 負けたら「同じ盤面でもう一度」→ 今度は守らずに流す → 「盾で防いだ量 0」を見る（同じ盤面で数字が変わる）
6. もう一度「初陣へ」相当（恵比寿×試練の影）に勝つ → 魔獣の目標は **出ない**（1 回だけ）

最重要質問：**「敵の予告を見たことで、自分の行動を変えた感じがしたか？」**

## 5. NOT BUILD

難易度・敵行動の変更（決定203 §9・CEO 判断）、初陣の敵の変更（決定193 維持）、「読み」の新 state・実績・採点、数ラウンド先の予告表示、Living Hero、OTOMO identity、49→nextGoal の一般接続。

## 6. CEO Human QA 結果（2026-09-20）— PASS

| 項目 | 結果 |
| --- | --- |
| A. Early Read Moment | **PASS**。初陣勝利 → 報酬選択後に「次は連撃型『双牙の魔獣』に挑む — 予告を読む戦い」と Primary「魔獣に挑む（神を選ぶ）」を実画面で確認 |
| B. Solve Learning Loop | **PASS**。双牙の魔獣戦で予告を確認し、CEO 自身が防御行動を変更 |
| 最重要質問「敵の予告を見たことで、自分の行動を変えた感じがしたか？」 | **YES** |
| Result の実測 | 予告された攻撃 3 回・無傷で受け切り 1 回・盾で防いだ量 180・双牙の魔獣 初撃破 |
| 1 回だけ | NR1 は初回のみ機能し、その後は通常の「次の目標」に戻ることを確認 |

### 6-1. Human QA 中の NR1 未表示 2 回（製品不具合ではない）

1. 1 回目：勝利直後の画面に「報酬カードを選ぶ」だけが出ていた。決定166 の設計どおり、Result Hub（次の目標）は報酬選択後に出る。手順書に「報酬を選ぶ」が抜けていた
2. 2 回目：報酬選択後の目標が「今日のベストまであと 720 点（残り1回）」＝神域挑戦（Daily）専用の文言。`localhost:4181` に過去の Human QA（決定196・200）の保存が残り、Home の金ボタンが「初陣へ」ではなく「神域へ挑む／今日の試練」になっていた（初陣導線は Daily に入れない）。**state contamination** と確認
3. InPrivate でも既存状態が見えたのは、Edge の InPrivate が開いている全 InPrivate ウィンドウで一時ストレージを共有するため。`127.0.0.1:4181`（別 origin）で fresh state を作り、削除なしで再テスト → PASS

再発防止として §4 に Step 0 を追加した。

## 7. 状態

**Decision206 — PASS / CLOSED**（2026-09-20 CEO Human QA PASS）。close-out は docs のみ（runtime 変更 0）。branch `feat/solve-legibility-v1` に commit。master merge・push・deploy・Production（`bba4c67`）変更は行っていない。次は Release Gate（RC branch）→ CEO の Production 反映承認。
