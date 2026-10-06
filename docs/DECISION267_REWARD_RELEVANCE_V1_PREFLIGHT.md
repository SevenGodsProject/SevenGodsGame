# 決定267 Reward Relevance v1 Preflight — 勝利後 3 択を「次戦のデッキ構築を考えたくなる 3 択」へ（GO WITH MODIFICATIONS・最終仕様 1 案）

- 日付：2026-10-04
- 判断主体：Preflight 開始と「GO WITH MODIFICATIONS」の方向は **CEO**（2026-10-04・Victory Reward Value Audit 採用）。設計・比較・最終仕様 1 案への絞り込みは **AI 判断**（CLAUDE.md §6-2）。Pilot 実装の開始は CEO。
- 方法：**docs／code read のみ**。実装・コード変更・ブラウザ・build・vitest・Playwright・simulation は行っていない（決定266 Lane 1 と並行の Lane 2・6GB RAM 制約）。
- 前提：`docs/VICTORY_REWARD_VALUE_AUDIT.md`（決定267 候補）。CEO 修正指示＝「神専用カード 1 枚を毎回保証」は確定しない（専用は各神 4 種しかなく、毎勝利で保証すると短期間に同じ候補が繰り返され長期の Reward Excitement を下げる）。

## 0. 結論（先に）

| 項目 | 内容 |
|---|---|
| 判定 | **GO WITH MODIFICATIONS** → 最終仕様 1 案「**Reward Relevance v1：3 役ローテーション**」 |
| 3 択の役割 | **A 即戦力**（現デッキで使っている札を 3 枚目に）／**B 神の個性**（専用カード・ただし「新鮮なとき」だけ）／**C 次の構築のヒント**（現デッキにない・その神と相性のある共通札） |
| B の扱い（CEO 修正） | 毎回保証しない。**専用 4 種のうち「上限未拡張かつ直近 2 勝で提示されていない」ものがあるときだけ B 枠が立つ**。無ければ B 枠は C に置き換わる（期待出現率は後述 §3-4） |
| 反復抑制 | 直近 2 勝の提示札（最大 6 枚＝3 枚×2 勝。2026-10-05 §10 で「9 枚以内」の誤記を訂正）と、見送った札を次の 2 勝で除外（候補が足りない場合のみ解除） |
| UI | 各候補に役割チップ（即戦力／神の個性／次の構築）＋「いま n 枚編成中 ／ 上限 2 → 3」。選択後に「次回の編成で『X』を 3 枚まで積めます」 |
| Daily | 神域挑戦では報酬選択画面そのものを出さない（結果画面のボタンも非表示） |
| 見送り | 残す。意味＝「この 3 枚は次の 2 勝では出ない（別の候補が出る）」を画面に明記 |
| 変更範囲 | `src/components/battle/`（picker・RewardOverlay・GameOverOverlay 条件 1 つ）＋ `src/hooks/rewardHistoryStorage.ts`（新規・version 付き）。**`src/core` 0・engine 0・新カード 0・`rules.ts` 0** |
| 守るもの | Enemy Intent × 7R × AP × deterministic Seed／Pay-to-Solve なし／Ranking（Daily）公平性／おすすめデッキ不変／デッキ 20 枚固定／報酬は「編成可能上限の拡張」のみ |

## 1. 事実（設計の根拠・実コード）

| 事実 | 根拠 |
|---|---|
| 勝った直後の「現デッキ」はバトル state から復元できる（`state.deck`＋`state.hand`＋`state.discard` の `CardInstance.defId` を集計＝20 枚） | `src/core/types/state.ts:178–180` |
| 直前に確定したデッキは神ごとに `sevengods.deckPreference` に保存されている（`loadDeckPreference(godId)`） | `src/hooks/deckPreferenceStorage.ts:40–50` |
| 報酬の効果は `sevengods.rewardBonuses[godId][cardId] += 1`（編成上限 +1・無上限） | `src/hooks/rewardStorage.ts:62` |
| 3 択は `getCardPoolForGod`（共通 32＋専用 4）の seed 付き等確率シャッフル | `RewardOverlay.tsx:27–29`・`rewardPicker.ts` |
| おすすめデッキ：v4 固定（恵比寿・蒼毘・才華・寿楽）＋生成式（大耀・福永・笑蓮）。専用 2 枚（蒼毘・寿楽・笑蓮は 1 枚）・共通は原則 1 枚（例外：蒼毘 curse×2、寿楽 allOutStrike／warCry／curse／purifyingLight×2） | `deckBuilder.ts:131–135, 152–230` |
| Daily は bonus を空 Map で固定するが、結果画面の「報酬カードを選ぶ」は mode を見ずに出る | `DeckBuilderScreen.tsx:101`・`GameOverOverlay.tsx:337`・`BattleScreen.tsx:658` |
| 神の個性＝専用 4 種の type 構成＋passive＋条件効果：蒼毘＝guard／counter（`blocked`）、大耀＝`charged`、福永＝`lowHp` 系（大勝負）、笑蓮＝HP 8 割以上（無傷の慈愛）＋`blocked`／`lowHp`、恵比寿・才華・寿楽は専用 type 構成（恵比寿 attack／support、才華 resonance／support／attack、寿楽 hinder／guard／attack／resonance） | `gods.ts:109–201`・`cards/*.ts` の `when:` |
| 共通札の条件効果：`blocked`×3・`charged`×3・`combo`×6・`enemyBig`×4 | `cards/common.ts` |

## 2. 比較した案【AI 判断】

| 案 | 内容 | Relevance（必須 1） | 専用の価値（2） | 反復抑制（3） | 役割差（4） | リスク | 判定 |
|---|---|---|---|---|---|---|---|
| P0 現状 | 36 枚から等確率 3 枚 | なし | なし | なし | なし | — | 却下 |
| P1 Audit 原案 | 専用 1 枚保証＋現デッキ共通 2 枚 | 高 | 高いが**毎回**（4 種を 2 勝で一巡） | なし | 2 役 | CEO 指摘：短期反復で Excitement 低下 | 却下 |
| **P2 3 役ローテーション（推奨）** | A 即戦力 1＋B 神の個性（新鮮なときのみ）1＋C 次の構築 1。B 不成立時は C を 2 枚。直近 2 勝の提示札と見送り札を除外 | 高 | 高（出るときは必ず意味がある） | 直近 2 勝除外＋B は上限未拡張のみ | 3 役明示 | 候補枯渇時のフォールバックが必要（§3-6） | **採用** |
| P3 2 枚選択（むずかしい／神階で 2 枚） | P2＋難易度連動で 2 枚取れる | 高 | 高 | 同上 | 同上 | 難易度で「報酬差」が付く＝良いが v1 では評価軸が増える | v2 へ |
| P4 役割固定（A／B／C を毎回 1 枚ずつ必ず） | 役割が常に 3 つ揃う | 高 | 毎回専用＝P1 と同じ反復問題 | 弱 | 3 役 | CEO 修正に反する | 却下 |
| P5 報酬専用カード pool | 新カード 10〜15 種 | 最高 | — | — | — | 新カード追加 0 の制約に反する | 却下 |

## 3. 最終仕様（Reward Relevance v1：3 役ローテーション）

### 3-1. 入力（すべてローカル・決定論）
- `seed`：そのバトルの seed（既存）。
- `deck20`：勝ったバトルの 20 枚（`state.deck/hand/discard` の `defId` 集計。復元不能時は `loadDeckPreference(godId)`、それも無ければ `getRecommendedDeck(godId)`）。
- `bonuses`：`loadRewardBonuses(godId)`（既存）。
- `history`：新規 `sevengods.rewardHistory`（version 1）＝神ごとに「直近 2 勝で提示した cardId（最大 6）」「直近 2 勝で見送った cardId（最大 6）」。

### 3-2. 役割の定義と候補集合
- **A 即戦力**：`deck20` に **ちょうど 2 枚**入っている共通札のうち `bonuses[card] == 0`（上限が 2 のまま）のもの。→ 選ぶと「次回からこの札を 3 枚」。該当が無ければ `deck20` に 1 枚入っている共通札（「2 枚目を足してから 3 枚目」の案内付き）。
- **B 神の個性**：その神の専用 4 種のうち `bonuses[card] == 0` かつ `history.offered` に無いもの。**該当が無ければ B 枠は立たない**（C を 2 枚にする）。
- **C 次の構築のヒント**：`deck20` に **入っていない**共通札のうち、神との相性スコアが高いもの。相性スコア（データのみ・engine 不変）：
  1. `card.type` がその神の専用 4 種の type 集合に含まれる：+2
  2. `card.bonus.when` が神の個性条件に一致（蒼毘・笑蓮＝`blocked`、大耀＝`charged`、福永・笑蓮＝`lowHp`、恵比寿・才華・寿楽＝`combo`／`enemyBig` は +0.5 のみ）：+2
  3. おすすめデッキ（`getRecommendedDeck(godId)`）に入っている：+1
  同点は seed 付きシャッフルで決める。
- 除外：`history.offered`（直近 2 勝）と `history.declined`（直近 2 勝で見送り）に含まれる札は A／C から除外（候補が 3 枚未満になる場合だけ、`declined` → `offered` の順に解除）。

### 3-3. 選出手順（決定論）
1. seed から RNG を作る（既存 `pickRewardCandidates` の LCG を流用）。
2. A 候補から 1 枚（seed シャッフルの先頭）。
3. B 候補があれば 1 枚（`bonuses` 昇順 → seed）。無ければ C から追加で 1 枚。
4. C 候補から 1 枚（相性スコア降順 → seed）。
5. 3 枚に満たなければ、残りの共通札（`deck20` 内外問わず・`history` 除外）から seed で補充。それでも足りなければ現状と同じ等確率で補充（完全後方互換）。
6. 提示した 3 枚を `history.offered` に push（最大 6・古い順に落とす）。

### 3-4. B 枠の期待出現率（計算・simulation なし）
専用 4 種・「上限未拡張」かつ「直近 2 勝で未提示」が条件。初回〜4 回目の勝利で B は最大 4 回立ち、以降は**選ばなかった専用が再び B として戻るのは 3 勝後**。全専用を一度ずつ上限拡張すると B は立たなくなり C が 2 枚になる（＝専用は「取り切る目標」として機能し、取り切った後は構築ヒントへ自然に移行）。これにより「毎勝利で専用」の反復は構造的に起きない。

### 3-5. UI（必須 5・7）
- 各候補カードに役割チップ：「即戦力」「神の個性」「次の構築」。
- 各候補の下に「いま **n** 枚編成中 ／ 上限 **2 → 3**」（A・B）、「いま 0 枚 ／ 上限 2 → 3（まず 1〜2 枚入れてみよう）」（C）。
- 選択後トースト：「次回の編成で『X』を 3 枚まで積めます」。既存の編成画面バッジ「報酬で上限+n」はそのまま。
- 見送りボタン：「今回は見送る（この 3 枚は次の 2 勝では出ません）」。押すと `history.declined` に 3 枚を記録。
- 文言はすべて日本語直書き（MVP 方針）。

### 3-6. Daily（必須 6）
- `state.mode === 'daily'` のとき、`BattleScreen` の `RewardOverlay` と `GameOverOverlay` の「報酬カードを選ぶ」を**出さない**（`rewardPending` を daily では常に false）。結果画面の変更はこの条件 1 つ。Daily の Result Hub（次の目標・出口）は不変。

### 3-7. 変更しないこと（制約の遵守）
- `src/core`（engine・state・rules・cards・deckBuilder）：0。新カード 0。デッキ 20 枚・2 枚制限・AP・スコア・seed・Enemy Intent・7R：不変。
- `rewardStorage.ts` のデータ形式（version 1）：不変（history は別キー・別 version）。
- おすすめデッキ：不変（C の相性スコアで参照するだけ）。
- 報酬の効果：「編成可能上限 +1」のまま（直接の戦闘能力付与なし・Pay-to-Solve なし）。
- Ranking 公平性：Daily では報酬を出さず bonus も使わない（従来どおり）。通常モードのスコアに報酬は影響しない。

## 4. 期待効果と反証【AI 判断】
- 期待：3 択の各札が「いま使っている札／神の個性／次に試す札」のどれかなので、少なくとも 1 枚は「取る理由」がある。見送りにも意味（ローテーション）が生まれる。専用は取り切る目標になり、反復しない。
- 反証 1「A はおすすめデッキ運用だと 2 枚積みが専用しか無い」→ A のフォールバック（1 枚入りの共通札＋案内）で対応。v2 で「2 枚目を同時に許可」は検討しない（報酬の本質を変えないため）。
- 反証 2「C は結局使われない」→ C は『次の構築のヒント』であり、取らなくても A／B がある。Human QA の問いで効果を測る。
- 反証 3「history が端末依存」→ 既存の rewardBonuses も端末依存。Daily では無効なので公平性に影響なし。

## 5. Gate（軽量・simulation 不要）
- vitest：新 picker の純関数テスト 10 件（決定論＝同入力同出力／A・B・C の選出規則／B 不成立時の C×2／history 除外と解除／フォールバックで必ず 3 枚／Daily で非表示）。
- Playwright 6 run（PC 1508×660・SP 390×844 × 通常勝利／専用上限到達後／Daily 勝利）：役割チップ・枚数表示・見送り文言・Daily 非表示。1 browser 直列。
- 静的：tsc 0／oxlint 0／`git diff --stat -- src/core` 空。

## 6. Human QA（CEO・2 戦＋2 問）
- 大耀 × 鬼将（ふつう・おすすめデッキ）で 2 連勝。
- Q1：3 択のどれかを「取りたい」と思ったか（YES／NO）
- Q2：取ったあと、次の編成で何が変わるか画面で分かったか（YES／NO）

## 7. 実装規模・順序（Pilot 開始後）
- 新規 `src/hooks/rewardHistoryStorage.ts`（≈60 行）・`rewardPicker.ts` 拡張（≈120 行・純関数）・`RewardOverlay.tsx`（役割チップ・枚数表示・見送り文言 ≈40 行）・`GameOverOverlay.tsx`／`BattleScreen.tsx` の daily 条件（各 1 行）・CSS（チップ ≈20 行）。
- 順序：picker＋tests → UI → Daily 条件 → Gate → HUMAN QA READY。決定266 の Release 後に Lane 2 で着手。

## 8. CEO 判断事項（§6-4 形式）
```
【CEO DECISION REQUIRED】
Issue：決定267「Reward Relevance v1：3 役ローテーション」（§3）の Narrow Pilot を開始するか
AI Recommendation：承認（決定266 Release 後に Lane 2 で実装 → Gate → Human QA 2 問）
Reason：必須改善 1〜7 をすべて満たし、CEO 修正（専用の毎回保証をしない）を「新鮮なときだけ B 枠」で構造的に解決。src/core 0・新カード 0・報酬の本質（編成上限 +1）不変
Alternatives：P1 専用保証（反復）／P3 難易度で 2 枚（v2）／P4 役割固定（反復）／P5 報酬専用カード（制約違反）
Risk：候補枯渇時のフォールバックが現状と同じ等確率になる（挙動は明示）。history は端末依存（既存 bonus と同じ）
Impact if delayed：報酬の「空の判断」が続く
CEO Action：承認 / 拒否
```

## 9. 変更しなかったこと
- runtime／src／CSS／tests／simulation／ブラウザ／build：0。決定266 の worktree・preview には触れていない。本書は docs-only。

## 10. 最終整合性確認（2026-10-05・実コード照合）と Pilot 実装計画の確定【AI 判断・docs-only】

- 判断主体：整合性確認と実装計画の確定＝**AI 判断**（CLAUDE.md §6-2）。**runtime 実装は開始していない**（CEO 指示：決定266 Human QA 中は Lane 2 の runtime 実装を始めない）。
- 照合対象：決定266 branch `feat/d266-battle-viewport-stability` の runtime（master `a3ffa87` の `src/core`・hooks と同一。決定264／266 の差分は `battle.css`・`EnemyPanel.tsx`・`BattleScreen.tsx` の属性のみで、報酬まわりに変更なし）。

### 10-1. §1 事実の照合結果

| §1 の事実 | 実コード（2026-10-05） | 判定 |
|---|---|---|
| `state.deck／hand／discard`（`CardInstance[]`）から deck20 を復元 | `src/core/types/state.ts` L178–180 に 3 配列。使い切り用の欄は「将来」コメントのみ | 一致 |
| `loadDeckPreference(godId)`（`sevengods.deckPreference`・version 付き） | `src/hooks/deckPreferenceStorage.ts` L40–50（`RULES.saveVersion`） | 一致 |
| `addRewardBonus` ＝ `sevengods.rewardBonuses[godId][cardId] += 1`（version 1） | `src/hooks/rewardStorage.ts` L17・L55・L62（`REWARD_VERSION`） | 一致 |
| 3 択＝`getCardPoolForGod`（共通＋専用）を seed 付き LCG シャッフル | `RewardOverlay.tsx` L27–29・`rewardPicker.ts`（23 行・`pickRewardCandidates(pool, seed, count)`） | 一致 |
| 共通 32 種・専用 4 種×7 神（pool 36） | `cards/common.ts` 32 エントリ・`ebisu／fukuei／juraku／saika／shouren／sobi／taiyo.ts` 各 4 エントリ | 一致 |
| 共通札の条件効果 `blocked`×3・`charged`×3・`combo`×6・`enemyBig`×4 | `common.ts` の `when:` 集計 3／3／6／4（専用を含めた全体は 6／5／6／5・`lowHp`×1） | 一致 |
| おすすめデッキ `getRecommendedDeck(godId)`・専用は 3 神 1 枚／4 神 2 枚 | `deckBuilder.ts` L252（v4 固定＋生成式）・`REDUCED_EXCLUSIVE_COPY_GODS`＝蒼毘・寿楽・笑蓮 | 一致 |
| Daily は bonus を空 Map にするが、結果画面の「報酬カードを選ぶ」は mode を見ない | `DeckBuilderScreen.tsx` L101（`dailyChallenge ? new Map : loadRewardBonuses`）・`BattleScreen.tsx` L658（`RewardOverlay` 表示条件）／L678（`rewardPending`）・`GameOverOverlay.tsx` L337。いずれも `state.mode` を参照していない | 一致 |
| 見送り（`onSkip`）は既存 | `RewardOverlay.tsx` 末尾「今回は見送る」→ `BattleScreen` で `setRewardDone(true)` のみ（記録なし） | 一致 |

- 文書内の不整合 1 件を訂正：§0「直近 2 勝の提示札（9 枚以内）」は §3-1「最大 6」が正（3 枚×2 勝）。§0 を修正済み。
- 設計上の追加確認：`state.mode` は `GameState.mode?: 'normal' | 'daily'` として 'won' 後も保持される（`BattleScreen.tsx` L395・L694 で既に参照）→ §3-6 の Daily 条件は `state.mode !== 'daily'` を 2 箇所（L658・L678）に足すだけで成立。

### 10-2. Pilot 実装計画（確定・着手は決定266 Release 後）

| 順 | 作業 | ファイル | 規模 | 完了条件 |
|---|---|---|---|---|
| 0 | branch 作成：`feat/d267-reward-relevance-v1` を **決定264＋266 Release 後の master** から切る（d266 branch から切らない）。本 docs branch は同時に master へ rebase（`DECISIONS.md` 末尾 2 行の追記のみ・衝突は末尾） | — | — | `git diff --stat master -- src` 空から開始 |
| 1 | `src/hooks/rewardHistoryStorage.ts`（新規）：key `sevengods.rewardHistory`・`version: 1`・神ごと `{ offered: CardDefId[](≤6), declined: CardDefId[](≤6) }`。`load／pushOffered／pushDeclined`。壊れた JSON・version 不一致は空で開始（`rewardStorage.ts` と同じ防御） | hooks | ≈60 行 | `rewardHistoryStorage.test.ts` 4 件（round-trip・上限 6 の FIFO・version 不一致で空・不正 JSON で空） |
| 2 | `rewardPicker.ts` 拡張：`pickRewardCandidatesV1({ pool, deck20, bonuses, history, godId, seed, recommended }) → { cards: CardDef[3], roles: ('ready'|'identity'|'next'|'fill')[] }`。§3-2 の A／B／C と §3-3 の手順・フォールバック。相性スコアはデータ参照のみ（`card.type`∈専用 type 集合 +2・`bonus.when` 一致 +2・おすすめ採用 +1・同点は seed）。既存 `pickRewardCandidates` は残す（最終フォールバック） | battle | ≈120 行・純関数 | `rewardPicker.test.ts` 10 件（決定論／A 2 枚積み優先と 1 枚フォールバック／B 新鮮なときのみ／B 不成立で C×2／offered・declined 除外と解除順／常に 3 枚／pool 枯渇で旧挙動に一致／Daily は呼ばれない） |
| 3 | `RewardOverlay.tsx`：deck20 復元（`state.deck/hand/discard` → 無ければ `loadDeckPreference` → `getRecommendedDeck`）を props で受け取り、役割チップ＋「いま n 枚 ／ 上限 2 → 3」＋見送り文言＋選択後トースト。`onSkip` で `pushDeclined`、表示時に `pushOffered`（1 回だけ・`useEffect` + ref） | battle | ≈40 行 TSX＋CSS ≈20 行 | 既存 reward CSS の見た目を壊さない（SP 390 幅で 3 枚＋チップが折り返さない） |
| 4 | Daily 非表示：`BattleScreen.tsx` L658・L678 に `state.mode !== 'daily'` | battle | 2 行 | Daily 勝利で「報酬カードを選ぶ」が出ず Result Hub に直行 |
| 5 | Gate（§5）：vitest 新規 14 件＋既存全件、Playwright 6 run（1 browser 直列・6GB 制約）、tsc／oxlint／`git diff --stat -- src/core` 空 | — | — | 全 PASS → HUMAN QA READY（§6 の 2 戦＋2 問） |

- 守る制約（§3-7）再確認：`src/core` 0・`rules.ts` 0・新カード 0・報酬効果は「編成上限 +1」のまま・Daily は報酬なし・おすすめデッキ不変。
- 未決（Pilot 中に AI 判断で確定）：役割チップの配色（既存 `TYPE_STYLE` 流用か専用 3 色か）・選択後トーストの表示位置（決定241 の toast 重なり対策と干渉しない位置）。CEO 判断は不要。
