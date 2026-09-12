# Phase 6-C：Decision Feedback ＋ Battle Recap「判断の手応え」実装記録

- 日付：2026-09-12
- ブランチ：`feat/daily-ranking-phase4`（master / Production は未変更）
- 入力：Phase 6 Commercial Benchmark Audit v2（commit `24e71d9`）→ **決定166**（受理・6-C GO）
- 種別：**表示層のみ**。`src/core` の差分 **0 行**、`saveVersion` 9・`gameVersion` `1.80c6eda23ed082dc` 不変
- 完了判定：**決定167**（本書 §12）

---

## 1. 位置づけ（何を作り、何を作らないか）

Phase 5 までに存在する良い判断——Enemy Intent 読み・Divination Guard・完全防御・条件⚡（blocked／enemyBig／combo／charged／lowHp）・神の得意技（反撃の構え／無傷の慈愛／大勝負）——は、これまで「数字が変わる」だけで、**意味の解釈をプレイヤーに委ねていた**。6-C はそれを「ゲームが短く評価し、気持ちよく返す」層に置き換える。

新しいゲームシステムは足していない。**既存の GameEvent と既存の RULES 値だけから事実を検出し、言い換える**。

| 触ったもの（表示層） | 触っていないもの（禁止事項） |
|---|---|
| `decisionFeedback.ts`（callout の純関数）／`useDecisionCallout.ts`（タイマー・重複抑制）／`BattleCallout.tsx`／`battleRecap.ts`（振り返りの純関数）／`BattleScreen.tsx`（配線・結果画面の順序）／`GameOverOverlay.tsx`（振り返りの表示・報酬ボタン）／`battle.css` | カード・敵・神の性能、スコア、Mastery、報酬ルール（3 枚の選出＝`rewardPicker`・上限 +1＝`addRewardBonus` とも不変）、AP、Intent、Divination、BURST、OTOMO、神の一撃、stakes、Daily、Ranking、Neon、env、saveVersion、gameVersion、master、Production |

---

## 2. Part A：Moment Callout（瞬間の評価）

### 2-1. 検出する事実（コード実態を監査して確定）

| id | 事実（イベントとルール値のみ） | 主文 | 副文（例） | priority |
|---|---|---|---|---|
| `perfect-big` | `ENEMY_ACTED{kind≠charge, amount>0}` ∧ 同バッチの `DAMAGE_DEALT(self)` の HP 被害合計 = 0 ∧ 吸収合計 > 0 ∧ 実行値 ≥ `RULES.cardBonus.enemyBigThreshold` | **完封！** | 予告110の大技を無傷で受け切った | 1 |
| `neutralized-big` | `ENEMY_ACTED{kind≠charge, amount=0}` ∧ 直前の `ENEMY_INTENT_SET.amount` > 0（デバフで hit が全部消えた）∧ 予告 ≥ しきい値 | **無力化！** | 予告130の大技を封じ切った | 1 |
| `counter` | `PASSIVE_TRIGGERED{sobi_counter}` | **反撃！** | 受け切った盾が150の刃になった | 2 |
| `passive` | `PASSIVE_TRIGGERED{shouren_pristine／fukuei_gamble}` | **得意技！** | 「大勝負」で+70 | 2 |
| `perfect` | 上の完封で実行値 < しきい値 | **完封！** | 50の攻撃を無傷で受け切った | 3 |
| `neutralized` | 上の無力化で予告 < しきい値 | **無力化！** | 予告50を封じ切った | 3 |
| `bonus-blocked`／`bonus-enemyBig` | `BONUS_TRIGGERED{when}`（予告を読んだ条件） | **⚡ 条件成立** | 盾が予告を超えた／予告100以上の直前 | 3 |
| `bonus-combo` | `BONUS_TRIGGERED{combo}` | **⚡ 連携！** | このラウンド2枚目以降 | 4 |
| `bonus-charged`／`bonus-lowHp` | `BONUS_TRIGGERED{charged／lowHp}` | **⚡ 条件成立** | 共鳴4以上／HPが最大の50%以下 | 4 |

- **完封の根拠**：`applyDamage` は完全ブロック時も `DAMAGE_DEALT{amount:0, blocked>0}` を必ず出す（`effects.ts`）。`round.ts` はデバフで 0 以下になった hit を捨てるため、全部消えると `ENEMY_ACTED{amount:0}` だけが残る＝無力化。元から 0 の行動（charge）、予告が無い場合、ブロック無しで素通りした場合は**何も主張しない**
- **出さないもの**：「カードを使った」「ダメージを与えた」「回復した」だけのバッチ。神の一撃（`RESONANCE_BURST`）のバッチ、決着したバッチ（6-A の撃破・敗北演出が担当）
- **文言**：`card.ts` の条件定義と `RULES.cardBonus`／`RULES.godPassive` の値の言い換えのみ。数値は `formatScaled`（表示×10）

### 2-2. 原則の実装

| 原則（CEO 指定） | 実装 |
|---|---|
| 1 action batch につき最大 1 種類 | `planCallout()` が候補を集め priority 最小の 1 件だけ返す（同点は 防御 → Identity → 条件 の検出順） |
| 表示時間 0.6〜0.8 秒 | `CALLOUT_MS = 700` |
| 6-A と視覚競合しない位置・時刻 | 時刻＝着弾計画の最後の着弾 + 240ms（`CALLOUT_AFTER_IMPACT_MS`。数字のポップ・hit stop のあと）。位置＝**浮遊数字の帯の外**。PC は敵と神のあいだ（アリーナ幅 38% 中心・幅 140px・bottom 90px。敵側の数字は幅の約 13〜28%、神側の「軽減N」は 47〜54% に出るため、その間。初回 QA の 37% で敵立ち絵の枠と 6px² 触れたため 38%）。SP は神の頭上やや右（55% 中心・幅 150px・bottom 76px。数字帯 y≈254〜357 の下・2 行ミニ結果の上）。立ち絵の顔（上 40%）・予告・手札の外 |
| 攻撃そのものより目立たせない | 主文 22px（P1 は 26px）＜ 最大ダメージ数字 52px。SP は 18／21px |
| 何か起きるたびに出さない | ⚡は同一ラウンドで同じ条件を 1 回だけ（`dedupeKey`）。完封・反撃・得意技は 1 ラウンド 1 回しか起き得ない |
| 6-B を壊さない | `.battle-main` 内の `position:absolute` overlay、`pointer-events:none`。ページ高さ・DOM の flow に影響しない |
| reduced-motion | 表示はする。`@media (prefers-reduced-motion: reduce)` ではフェードのみ（scale／上昇なし）。shake・flash は元から無い |
| 新規 SFX なし | 音は鳴らさない（既存音の再利用も行わない） |

### 2-3. 計測可能性

- DOM：`data-testid="battle-callout"`／`data-callout-id`／`data-callout-priority`（QA は MutationObserver で数える）
- フック：`useDecisionCallout` が `stats`（shown／losers／duplicates／bigMoment／byId）を返す
- 純関数：`planCallout()` は `{ callout, reason: 'none'|'big-moment'|'outcome'|'duplicate'|null, losers }` を返し、ユニットテストで priority・重複抑制・見せ場回避を固定

---

## 3. Part B：Battle Recap（振り返り）

### 3-1. 事実の集計（`collectRecapFacts`）

ログを「1 アクション＝1 バッチ」に切り（区切り＝`CARD_PLAYED`／`DIVINATION_USED`／`ENEMY_ACTED`。reducer は `GAME_ENDED` をアクション末尾に積むため、敗北の敵行動と同じバッチに入る）、各バッチに §2-1 と同じ `evaluateDefense` を当てて数える。

| 事実 | 出どころ |
|---|---|
| 完封／大技完封／無力化の回数 | `evaluateDefense` |
| ⚡成立回数（条件別）／得意技回数／神の一撃回数 | `BONUS_TRIGGERED`／`PASSIVE_TRIGGERED`／`RESONANCE_BURST` |
| 神の一撃で決着 | `GAME_ENDED(won)` を含むバッチに `RESONANCE_BURST` |
| 最低 HP 比率 | `DAMAGE_DEALT(self).amount`（HP へ通った実値）と `HEALED.amount`（上限で切った実回復）から復元。**復元値が終了時 HP と一致しない場合は主張しない** |
| 神力を残したラウンド数／託宣使用回数／決着ラウンドで託宣を使ったか | `ROUND_ENDED.unusedAp`／`DIVINATION_USED` |
| 致命の敵行動（実行値・吸収した盾） | 敗北バッチの `ENEMY_ACTED.amount`／Σ`blocked` |
| ⚡付きカードを持っていたか | `GameState` の hand＋deck＋discard |
| ログが完全か | `GAME_STARTED` を含むか（「続きから」再開では含まない → **回数系の行は出さない**） |

### 3-2. 勝利（なぜ上手くいったか・最大 3 行）

優先順：神の一撃で決着 → 大技を N 回無傷で受け切った（無ければ 敵の攻撃を N 回無傷）→ HP N% から立て直した（≤30%・復元一致時のみ）→ 得意技「名」が N 回 → 攻撃を N 回封じ切った → ⚡を N 回成立。**1 行も無ければ「ラウンド N で撃破しました」**（＝必ず 1 つはその戦闘固有の事実）。

### 3-3. 敗北・未撃破（次の 1 戦へ・高信頼ルールのみ・最大 1 行）

| 順 | ルール（事実）| 文（テンプレート） |
|---|---|---|
| G1 | 致命の敵行動が大技 ∧ 吸収した盾 < 実行値 | 「R7：310の大技に対し、盾は20でした。加護や防御札で予告ぶんの盾を用意すると受け切れます」 |
| G2 | 決着ラウンドで託宣未使用 ∧ 残回数 > 0 | 「R5：託宣が2回残っていました。大きな予告の前は「加護」で盾を足せます」 |
| G3 | 神力を残して終えたラウンドが 2 回以上（完全ログ時のみ） | 「神力を使い切らずに終えたラウンドが N 回ありました」 |
| G4 | ⚡付きカードを持ちながら成立 0（完全ログ時のみ） | 「⚡の条件が一度も成立しませんでした。手札の⚡が光っているときに使うと追加効果が出ます」 |
| 未撃破 | 敵 HP が残っている | 「あと240で撃破でした」（事実行） |

どれにも当てはまらなければ**何も出さない**（既存の敗因 1 行だけ）。「この手を出せば勝てた」等の後知恵・断定はテンプレートに存在しない（ユニットテストで `勝てた|べきだった|出せば` を禁止語として検査）。振り返りが出るときは、既存の定型文「予告を見て、その一撃の前に守るか、先に倒し切ろう」は出さない（generic 固定文だけ、にならない）。

---

## 4. Result Flow（認知順序）

調査の結果、**低リスクで順序だけ直せる**と判断して実施した。

| 前 | 後 |
|---|---|
| 撃破 → **報酬 3 択** → 結果（スコア／神技評価） | 撃破 → **結果（勝利 → 振り返り → スコア → 神技評価 → 「報酬カードを選ぶ ›」）** → 報酬 3 択 → 結果（もう一度／選び直す） |

- 実装：`BattleScreen` に `rewardOpen` を 1 つ追加。結果画面は `presentationDone` で出し、勝利で報酬が未確定のあいだは `GameOverOverlay` の操作列に**「報酬カードを選ぶ」だけ**を出す（勝利 1 回＝報酬の判断 1 回、を保つ）。選ぶ／見送る で `rewardDone` → 結果画面に戻り、従来のボタンへ
- 不変：報酬の 3 枚（`pickRewardCandidates(pool, seed, 3)`）、上限 +1（`addRewardBonus`）、見送り可、seed ごとに 1 回。Daily の「もう一度（残り N）」・ランキング導線・共有・自己ベスト・OTOMO 成長の表示は同じコンポーネント内でそのまま
- 敗北・未撃破は従来どおり（報酬なし）

---

## 5. 変更ファイル

| ファイル | 変更 |
|---|---|
| `src/components/battle/decisionFeedback.ts` | **新規**：`evaluateDefense`／`collectCallouts`／`planCallout`／`latestIntentAmount`／`latestRound`（純関数） |
| `src/components/battle/useDecisionCallout.ts` | **新規**：バッチごとに 1 件決め、着弾後に 0.7 秒表示。同一ラウンドの⚡重複抑制。stats |
| `src/components/battle/BattleCallout.tsx` | **新規**：overlay（pointer-events:none） |
| `src/components/battle/battleRecap.ts` | **新規**：`splitBatches`／`collectRecapFacts`／`buildBattleRecap`／`defeatGuidance`（純関数） |
| `src/components/battle/BattleScreen.tsx` | callout の配線、振り返りの生成、結果 → 報酬の順序（`rewardOpen`） |
| `src/components/battle/GameOverOverlay.tsx` | `recap`／`rewardPending`／`onOpenReward` を追加。振り返りを勝敗の直下（スコアの前）に表示。報酬未確定時は「報酬カードを選ぶ」だけ |
| `src/components/battle/battle.css` | `.battle-callout*`／`.game-over-recap*`／`.game-over-reward-button`（追記のみ） |
| `src/components/battle/decisionFeedback.test.ts` | **新規** 16 件：完封・無力化の事実判定、priority、⚡の条件別、重複抑制、見せ場回避、「使っただけでは出さない」 |
| `src/components/battle/battleRecap.test.ts` | **新規** 10 件：reducer を実際に回してログを作り、行と事実の一致・3 行以内・後知恵禁止語・敗北ルール G1/G2・未撃破 |
| `scripts/phase6c-decision-feedback/play.mjs` | **新規**（監査用）：15 戦の自動プレイで callout／誤判定／競合／6-B 保護／結果順序／振り返りを記録 |
| `docs/DECISIONS.md` | 決定166・決定167 |

---

## 6. QA（15 戦：7 神×2・敵 7 体・PC 9＋reduced-motion 1／SP 5・normal〜神階Ⅴ）

**集計（15 戦）**：勝利 14／敗北 1／未撃破 0。callout 合計 **79 回、1 戦平均 5.3 回**（最小 2・最大 10、0 回の戦闘 0、3〜8 回に収まった戦闘 13/15）。種類：bonus-combo 23・bonus-enemyBig 10・perfect-big 9・passive 8・bonus-blocked 7・neutralized 6・bonus-charged 6・perfect 5・counter 3・neutralized-big 1・bonus-lowHp 1。priority 別：P1 10・P2 11・P3 28・P4 30。同時表示の最大 **1** 件、同一 action からの重複 **0**、誤判定 **0**、JS エラー 0。callout 表示中の重なり：浮遊数字 0px²・予告 0px²・敵の顔 0px²・手札 0px²・ミニ結果 0px²（敵立ち絵の枠との重なり最大 5%＝脚の位置。顔は 0）。scrollY 最大 0、横はみ出し最大 0、`pointer-events: none` 全件。結果画面の順序：15 戦すべて 結果 → 報酬。勝利 14 戦すべてで 報酬 → 結果（通常ボタン）へ戻る：確認。reduced-motion（#15）：callout 5 回・表示あり。

| # | 端末 | 神×敵 | 難易度 | callout 回数 | 種類 | 最も良かった feedback | うるさく感じた瞬間 | 誤判定 | 勝敗 | Recap | 再戦したくなる理由 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | PC | 大耀×業斧の鬼将 | normal | 5 | neutralized, bonus-combo, bonus-charged×2, bonus-blocked | 無力化！（予告50を封じ切った） | なし | 0 | 勝利 | 「神の一撃で決着しました」「敵の攻撃を1回、封じ切りました」「⚡の条件を6回成立させました」 | スコア更新・次の神階 |
| 2 | PC | 蒼毘×双牙の魔獣 | stake2 | 8 | bonus-combo×2, bonus-enemyBig×2, bonus-blocked×2, counter, perfect-big | 完封！（予告100の大技を無傷で受け切った） | やや多い（8 回） | 0 | 勝利 | 「大技を1回、無傷で受け切りました」「得意技「反撃の構え」が2回はたらきました」「⚡の条件を8回成立させました」 | スコア更新・次の神階 |
| 3 | PC | 福永×銀甲の機工師 | stake3 | 6 | bonus-enemyBig×2, bonus-combo×2, bonus-charged, passive | 得意技！（「大勝負」で+70） | なし | 0 | 勝利 | 「HP10%から立て直しました」「得意技「大勝負」が2回はたらきました」「⚡の条件を6回成立させました」 | スコア更新・次の神階 |
| 4 | PC | 寿楽×蒼海の龍神 | normal | 6 | neutralized×3, bonus-combo×2, bonus-enemyBig | 無力化！（予告40を封じ切った） | なし | 0 | 勝利 | 「神の一撃で決着しました」「敵の攻撃を3回、封じ切りました」「⚡の条件を3回成立させました」 | スコア更新・次の神階 |
| 5 | PC | 恵比寿×試練の影 | normal | 2 | bonus-blocked, perfect-big | 完封！（予告110の大技を無傷で受け切った） | なし | 0 | 勝利 | 「神の一撃で決着しました」「大技を1回、無傷で受け切りました」「⚡の条件を2回成立させました」 | スコア更新・次の神階 |
| 6 | PC | 才華×乱舞の道化 | stake1 | 3 | bonus-combo, bonus-charged, perfect-big | 完封！（予告180の大技を無傷で受け切った） | なし | 0 | 勝利 | 「大技を1回、無傷で受け切りました」「⚡の条件を4回成立させました」 | スコア更新・次の神階 |
| 7 | PC | 笑蓮×藍花の怨霊 | stake4 | 10 | passive×5, neutralized, perfect×2, bonus-enemyBig, bonus-combo | 得意技！（「無傷の慈愛」で+30） | 得意技の連続（9 回） | 0 | 敗北 | 「R7：310の大技に対し、盾は20でした。加護や防御札で予告ぶんの盾を用意すると受け切れます」 | 助言を試す |
| 8 | PC | 大耀×蒼海の龍神 | stake5 | 5 | bonus-combo×3, perfect, bonus-charged | ⚡ 連携！（このラウンド2枚目以降） | なし | 0 | 勝利 | 「敵の攻撃を1回、無傷で受け切りました」「⚡の条件を4回成立させました」 | スコア更新・次の神階 |
| 9 | PC | 蒼毘×銀甲の機工師 | normal | 6 | bonus-blocked, perfect, bonus-combo, counter, perfect-big, bonus-enemyBig | 完封！（予告220の大技を無傷で受け切った） | なし | 0 | 勝利 | 「大技を1回、無傷で受け切りました」「得意技「反撃の構え」が2回はたらきました」「⚡の条件を5回成立させました」 | スコア更新・次の神階 |
| 10 | SP | 福永×双牙の魔獣 | normal | 4 | bonus-enemyBig, bonus-combo×2, perfect-big | 完封！（予告130の大技を無傷で受け切った） | なし | 0 | 勝利 | 「大技を1回、無傷で受け切りました」「⚡の条件を3回成立させました」 | スコア更新・次の神階 |
| 11 | SP | 寿楽×乱舞の道化 | stake2 | 4 | bonus-combo, neutralized, bonus-enemyBig, neutralized-big | 無力化！（予告180の大技を封じ切った） | なし | 0 | 勝利 | 「敵の攻撃を2回、封じ切りました」「⚡の条件を3回成立させました」 | スコア更新・次の神階 |
| 12 | SP | 恵比寿×業斧の鬼将 | stake1 | 4 | bonus-combo×3, perfect-big | 完封！（予告130の大技を無傷で受け切った） | なし | 0 | 勝利 | 「大技を1回、無傷で受け切りました」「⚡の条件を3回成立させました」 | スコア更新・次の神階 |
| 13 | SP | 才華×藍花の怨霊 | normal | 4 | bonus-combo, bonus-blocked, perfect, bonus-charged | ⚡ 連携！（このラウンド2枚目以降） | なし | 0 | 勝利 | 「神の一撃で決着しました」「敵の攻撃を1回、無傷で受け切りました」「⚡の条件を3回成立させました」 | スコア更新・次の神階 |
| 14 | SP | 笑蓮×試練の影 | stake3 | 7 | passive×2, bonus-combo×2, bonus-lowHp, perfect-big×2 | 完封！（予告100の大技を無傷で受け切った） | なし | 0 | 勝利 | 「大技を2回、無傷で受け切りました」「得意技「無傷の慈愛」が2回はたらきました」「⚡の条件を4回成立させました」 | スコア更新・次の神階 |
| 15 | PC（reduced） | 蒼毘×業斧の鬼将 | stake2 | 5 | bonus-blocked, bonus-combo, perfect-big, bonus-enemyBig, counter | 完封！（予告100の大技を無傷で受け切った） | なし | 0 | 勝利 | 「大技を1回、無傷で受け切りました」「得意技「反撃の構え」が2回はたらきました」「⚡の条件を5回成立させました」 | スコア更新・次の神階 |

### 6-1. Callout Acceptance

| 項目 | 目標 | 結果 | 判定 |
|---|---|---|---|
| 平均 1 戦 3〜8 回 | 3〜8 | **5.3**（13/15 戦が 3〜8。最小 2・最大 10） | ✅ |
| 0 回の戦闘が大量に出ない | — | 0 戦 | ✅ |
| 同時表示 1 種類まで | 1 | 最大 1 | ✅ |
| 同一 action からの重複 | 0 | 0 | ✅ |
| 誤判定 | 0 | 0（完封→HP 減少・反撃の神違い・得意技の神違いを機械検査） | ✅ |
| damage number を読めなくする | 0 | 浮遊数字との重なり 0px²・ミニ結果との重なり 0px² | ✅ |
| 6-B 保護（scroll 0・横はみ出し 0・予告／手札／敵の顔を隠さない） | 0 | scrollY 0・横 0・予告 0・手札 0・顔 0 | ✅ |
| reduced-motion でも表示 | 表示 | #15：5 回 | ✅ |

### 6-2. Recap Acceptance

| 項目 | 目標 | 結果 | 判定 |
|---|---|---|---|
| 勝利：固有の事実を最低 1 つ | ≥1 行 | 14 戦とも 2〜3 行（神の一撃で決着／大技を N 回無傷／HP N% から立て直し／得意技 N 回／⚡ N 回） | ✅ |
| 敗北：高信頼 guidance がある場合のみ 1 つ | ≤1 行 | #7：「R7：310の大技に対し、盾は20でした。加護や防御札で予告ぶんの盾を用意すると受け切れます」 | ✅ |
| 虚偽 0 | 0 | 行の回数はすべてログの事実と一致（`battleRecap.test.ts` で reducer 実走の 6 組合せ×2 方針を検査）。QA の 14 勝利でも数値は集計と一致 | ✅ |
| generic 固定文だけ、は不可 | — | 勝利は固有の事実、敗北は実数入りの 1 行。振り返りが出るときは既存の定型文を出さない | ✅ |
| 最大 3 行 | ≤3 | 最大 3 行 | ✅ |
| Result Flow | 結果 → Recap → Score → 報酬 | 15 戦すべて game-over-overlay が先／勝利 14 戦で「報酬カードを選ぶ」→ 報酬 → 通常ボタンへ復帰 | ✅ |

### 6-3. 計測上の注意（監査スクリプト）

ヘッドレス Chromium は描画要求が無いと CSS animation の timeline が進まない（`Animation.currentTime` が 0 のまま）ため、**単発スクリーンショットでは callout が opacity 0 のまま写る**。QA の数値（DOM 出現・矩形・重なり・時刻）はこの影響を受けない。目視用の画像は「スクリーンショットでフレームを流し、opacity ≥ 0.9 になった瞬間に保存」する方式で撮った（`play.mjs` の `shot()` も 1 枚目で frame を流してから 2 枚目を保存する）。

---

## 7. 6-A／6-B の保護（回帰）

| 項目 | 確認 |
|---|---|
| visual HP delay／ghost HP／damage tier／hit stop／enemy reaction／God Strike timeline／final blow／defeat collapse／reward-before-impact 防止 | `combatTimeline`・`visualHp`・`useCombatPresentation` は無変更。`combatTimeline.test.ts`／`visualHp.test.ts` 30 件 pass。callout は神の一撃・決着のバッチでは出さない（ユニットテストで固定） |
| PC・Mobile 一画面／page scroll 0／敵・予告・手札の可視／End Round 非重複／着弾可視 | `battleViewportLayout.test.ts` 11 件 pass。15 戦の callout 表示中 `scrollY` 最大 0・横はみ出し 0・予告との重なり 0px・手札との重なり 0px・敵の顔（上 40%）との重なり 0px |
| 報酬より先に結果を出す変更で、報酬の 1 回性 | 15 戦中 勝利 14 戦すべてで 結果 → 報酬 → 結果（通常ボタン）の順序を確認。`rewardDone` の seed リセットは従来どおり |

---

## 8. 回帰ゲート

| 検査 | 結果 |
|---|---|
| `npx vitest run` | **3,357 passed / 28 skipped**（6-B 後 3,331 ＋ 新規 26） |
| `npx tsc -b` | エラー 0 |
| `npm run lint`（oxlint） | 新規の警告なし |
| `npm run build` | 成功（JS 419.86 kB / CSS 追記） |
| `git diff --stat HEAD -- src/core` | **空（0 行）** |
| `saveVersion` | 9 |
| `gameVersion` | `1.80c6eda23ed082dc`（`gameVersion.test.ts` 10 件 pass） |
| Daily／Ranking／`submissionEnabled`／Production／master／Neon／env | 未変更 |

---

## 9. Commercial Benchmark 再評価（v2 と同じ物差し・実プレイ根拠）

| 軸 | v2 | 6-C 後 | 根拠 |
|---|---|---|---|
| Decision Feedback | 55 | **72** | 15 戦で「完封！／無力化！／反撃！／得意技！／⚡」が平均 5.1 回、誤判定 0。正解に名前が付き、その場で返る（SNAP の Cube・StS2 の Block 表示に相当する「即時の評価」が揃った）。残差：連携の累積（×N）と大技を受け切った直後の「予告どおり」は未実装、音による強調は無し |
| Loss Learning | 55 | **66** | 敗北に状況固有の 1 行（実行値と盾の実数、託宣の残回数）。残差：ラウンド要約表・同じ盤面での再戦の明示は未実装 |
| Victory | 62 | **70** | 勝利 → 振り返り（固有の事実 2〜3 行）→ スコア → 報酬 の順序。残差：内訳の帳票感・空箱 1 秒・肖像の小ささは未着手 |

---

## 10. Known Risks

1. **callout の出し過ぎ**：1 戦 9 回（笑蓮×怨霊：得意技 5 回）が上限付近。得意技は「HP 8 割以上で攻撃カード」のたびに成立するため、同じ id が続く。対策候補（未実施）：得意技も同一ラウンド 1 回に抑制
2. **ミニ結果・数字との近接**：初回 QA では PC の callout（中央・bottom 100px）が神側の「軽減N」と最大 1,859px² 重なったため、位置を「敵と神のあいだ」へ移した（本 QA は移設後の値）。SP は数字帯の下・2 行ミニ結果の上（bottom 76px）に置いたが、画面が低い端末（≤696px）では神の頭と重なる（顔・予告・手札とは重ならない）
3. **敗北の助言の網羅性**：G1〜G4 に当てはまらない敗北（連撃の合計・自傷・回復不足など）は無表示。虚偽は出さないが、「学びが返らない負け」が残る
4. **結果 → 報酬の順序変更**：報酬未確定のあいだは「報酬カードを選ぶ」しか押せない。Daily でも同じ（残回数のボタンは報酬確定後）。実機（CEO）での確認が必要
5. **ヘッドレス計測**：animation timeline の停止により、スクリーンショット単体では callout の視認性を判断できない（§6-3 の方式で撮る）

---

## 11. 次 Step

1. CEO Human QA（PC・スマホ実機）：「上手かった、と感じた瞬間があったか」／「うるさいか」／敗北の 1 行が納得できるか
2. Release Hygiene Gate（6-C とは別 commit）：BGM 26MB→約 4MB、`<img width height>`（CLS）、44px タップ、未参照 PNG の deploy 除外
3. Release Audit → master merge → Production（CEO 判断）
4. Post-Release Early：音の系統化（Sound 48）、予告の脈動・画面スケール、First 10 Minutes、Daily カード

---

## 12. 判定

Callout Acceptance（§6-1）・Recap Acceptance（§6-2）・6-A／6-B 保護（§7）・回帰ゲート（§8）をすべて満たした。**Phase 6-C：PASS** → 決定167 として記録。
