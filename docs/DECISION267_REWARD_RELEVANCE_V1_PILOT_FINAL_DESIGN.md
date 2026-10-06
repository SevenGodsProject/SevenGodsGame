# 決定267 Reward Relevance v1 Pilot Final Design — 3 役ローテーションの実装確定仕様（IMPLEMENTATION READY）

- 日付：2026-10-05
- 判断主体：設計確定＝**AI 判断**（CLAUDE.md §6-2：技術実装方式・ファイル構成・テスト方式・軽微な UI 文言）。Pilot 開始＝**CEO**（Preflight §8 の【CEO DECISION REQUIRED】）。runtime 実装は**決定266 Release 後**に Lane 2 で着手する。
- 状態：**PILOT IN PROGRESS（2026-10-06 CEO 承認で Pilot 開始・branch `feat/d267-reward-relevance-v1`）**。設計は FINAL（再設計なし）
- 方法：**docs／code read のみ**。npm／vite／vitest／tsc／Playwright／ブラウザ／build／simulation は一切実行していない（決定266 Lane 1 と並行・6GB RAM 制約）。`src/` の変更 0。本書は docs-only。
- 前提文書：`docs/DECISION267_REWARD_RELEVANCE_V1_PREFLIGHT.md`（§3 最終仕様・§10 整合性確認と実装計画）、`docs/VICTORY_REWARD_VALUE_AUDIT.md`。
- 照合した runtime：`C:\Users\kimi1\SevenGodsGame-integ`（master `a3ffa87`）。`rewardPicker.ts`／`RewardOverlay.tsx`／`BattleScreen.tsx`／`GameOverOverlay.tsx`／`rewardStorage.ts`（＋test）／`deckPreferenceStorage.ts`／`deckBuilder.ts`／`cards/*.ts`／`gods.ts`／`types/state.ts`／`types/card.ts`／`rules.ts`／`DeckBuilderScreen.tsx`／`GameFlow.tsx`／`useGameEngine.ts`／`retrySemantics.ts`／`battle.css`／`cardBonusText.ts`／`cardStyle.ts`／`dailyFairness.test.ts`／`resultTransitions.test.ts`／`entranceWiring.test.ts`／`scripts/solve-legibility-v1/acceptance.mjs`。

## 0. 結論（先に）

| 項目 | 内容 |
|---|---|
| 仕様 | Preflight §3「3 役ローテーション」を**実装可能な粒度まで確定**。A 即戦力／B 神の個性（新鮮なときのみ）／C 次の構築。常にちょうど 3 枚。決定論（seed＋プレイヤー文脈）。 |
| 新規コード | `src/hooks/rewardHistoryStorage.ts`（`sevengods.rewardHistory` version 1）、`rewardPicker.ts` に `pickRewardOffer`（純関数）・`collectDeckCardIds`・`formatRewardCopies`・`affinityScore` を追加（既存 `pickRewardCandidates` は最終フォールバックとして残す） |
| UI | 役割チップ 3 種＋「いま n 枚編成中／上限 m → m+1」＋見送りの意味＋選択後トースト（RewardOverlay 内・1,200ms） |
| Daily | `BattleScreen.tsx` の 2 箇所（L658 の表示条件・L678 の `rewardPending`）に `state.mode !== 'daily'` を足す。Result Hub は不変 |
| 不変 | `src/core` 0（`git diff --stat master -- src/core` 空）・`rules.ts` 0・新カード 0・デッキ 20 枚・2 枚制限・AP／スコア／seed／Enemy Intent／7R・おすすめデッキ・`sevengods.rewardBonuses` version 1・報酬の本質（編成上限 +1） |
| Gate | vitest 新規 **16 件**（history 5・picker 10・Daily 配線 1）＋既存全件、Playwright **6 run**（1 browser 直列）、tsc 0／oxlint 0 |
| 照合差異 | 11 件を §0-1 に明記し、すべて本書で解決（Preflight の方向は変えない。精緻化と 2 件の実装方式変更） |

### 0-1. 照合で見つかった差異（Preflight／Audit ↔ 実コード）と解決

| # | Preflight／Audit の記述 | 実コード | 解決（本書の確定） |
|---|---|---|---|
| D1 | §10-1「使い切り用の欄は『将来』コメントのみ」 | `GameState.exhausted: CardInstance[]` は**存在する**（`state.ts` L182・`createInitialState.ts` L101 で `[]`・`Effect` に exhaust 種は無く常に空） | `collectDeckCardIds` は `deck＋hand＋discard＋exhausted` を合算する（今日は exhausted=0 なので結果は同じ。将来の使い切り札でも 20 枚を保つ） |
| D2 | §3-2 B の除外は「`history.offered` に無いもの」のみ | `declined` は見送り時のみ push されるため `offered` 窓（直近 2 勝）より**古い札を含み得る** | B も **`offered ∪ declined`** を除外する。見送りボタンの約束「この 3 枚は次の 2 勝では出ません」を B 枠にも文字どおり適用するため |
| D3 | §10-2 ③「表示時に `pushOffered`（`useEffect`＋ref・1 回だけ）」 | React 19 StrictMode（dev）は effect を 2 回走らせる。既存の storage 書き込みはすべて `BattleScreen` の callback（`addRewardBonus`）側 | **確定時に記録**する：`onPick(cardId, offeredIds)`→`pushOfferedRewards`＋`addRewardBonus`、`onSkip(offeredIds)`→`pushOfferedRewards`＋`pushDeclinedRewards`。`RewardOverlay` は storage へ**書かない**（読むだけ）。決める前に離脱した場合は記録なし＝既存どおり「その勝利の報酬は消える」 |
| D4 | §3-2 A「ちょうど 2 枚かつ `bonuses==0`」 | `getMaxCopies = 2 + bonus`。報酬で既に 3 枚積みにした札（bonus 1・編成 3 枚）も「次を今すぐ積める」状態 | A1 ＝ **`count ≥ getMaxCopies(id, bonuses)`（上限いっぱい）**。bonus 0 の札を先に（＝Preflight の「2 枚・bonus 0」が最優先で同じ結果）。さらに「bonus>0 なのに上限未満」の札（余り枠あり）は A／B／C すべてから除外（報酬が無駄になるため） |
| D5 | §3-2 C「福永・笑蓮＝`lowHp`」、恵比寿・才華・寿楽は `combo／enemyBig` +0.5 | 共通札に `lowHp` は **0 枚**（`lowHp` は笑蓮『福袋』のみ）。神ごとの条件表はコードに存在しない | 相性条件を**データから導出**する：strong ＝ その神の専用 4 種が持つ `bonus.when` の集合（+2）、strong が空の神（恵比寿・才華・寿楽・福永）は条件付き共通札すべて +0.5。結果：蒼毘 {blocked, enemyBig}・大耀 {charged}・笑蓮 {lowHp, blocked}・他 4 神は +0.5 のみ。福永の `lowHp` は共通札に無いため実効 0（Preflight どおりでも 0）。神名での分岐を書かない（不変ルール 3 の精神） |
| D6 | §3-1「直近 2 勝で見送った cardId（最大 6）」 | `declined` は見送り時だけ push → 「直近 2 **回の見送り**」が正確 | 文言を確定：`declined` ＝直近 2 回の見送り分（≤6）。「次の 2 勝では出ません」の保証は `offered`（必ず毎勝利 3 枚 push・≤6）だけで成立し、`declined` は見送りが続かない限り**それ以上長く**除外する（約束を上回る側なので無害） |
| D7 | §3-3 手順 3「B 候補は `bonuses` 昇順 → seed」 | B 候補は定義上 bonus 0 のみ | B は seed 順のみ（昇順キーは常に同値。仕様文を簡略化） |
| D8 | §5「vitest 10 件（…Daily で非表示）」 | picker は純関数で `mode` を知らない | Daily 非表示は **source-scan テスト 1 件**（`rewardDailyWiring.test.ts`・`dailyFairness.test.ts` と同方式）として独立させる。picker 10 件は picker の性質だけで構成 |
| D9 | §10-2 ③「SP 390 幅で 3 枚＋チップが折り返さない」 | `.reward-card` 140px×3＋gap 12×2 ＝ 444px ＞ 390−12×2−24×2 ＝ 318px。**今日の SP でも 2＋1 段に折り返す**（`flex-wrap: wrap`） | AC を正確化：SP 390 ではカードは今日どおり 2＋1 段。**チップ・枚数表示がカード枠（140px）内に収まり、横スクロール 0** を基準にする |
| D10 | §7「`GameOverOverlay.tsx` の daily 条件 1 行」 | `rewardPending` は `BattleScreen.tsx` L678 で計算して渡している。`GameOverOverlay` は `rewardPending` を見るだけ | **`GameOverOverlay.tsx` は変更 0**。2 行とも `BattleScreen.tsx`（L658・L678）。`resultTransitions.test.ts` の「GameOverOverlay は storage へ書かない」も自動で維持 |
| D11 | Audit §1-7「Daily では報酬ボタンが表示される」 | 一致（`BattleScreen.tsx` L658／L678・`GameOverOverlay.tsx` L337 のいずれも `mode` を見ない） | §8 の 2 行で解決（差異ではなく事実確認。記録のため記載） |

Preflight の方向（3 役・B は新鮮なときのみ・直近 2 勝除外・見送りに意味・Daily 非表示・`src/core` 0）は**すべて維持**。

---

## 1. 3 択生成アルゴリズム

### 1-1. 型と入出力（`src/components/battle/rewardPicker.ts` に追記・純関数）

```ts
import type { BonusCond, CardDef, CardDefId, GameState, GodId } from '../../core/types'
import { RULES } from '../../core/data/rules'
import { getMaxCopies } from '../../core/data/deckBuilder'

export type RewardRole = 'ready' | 'identity' | 'next' | 'fill'

export type RewardCandidate = {
  card: CardDef
  role: RewardRole
  /** deck20 に入っている枚数（0〜） */
  copiesInDeck: number
  /** いまの編成上限 getMaxCopies(card.id, bonuses)（＝2＋bonus） */
  maxCopies: number
}

export type RewardOffer = {
  /** 常にちょうど 3 件・id は互いに異なる。表示順＝配列順 */
  candidates: RewardCandidate[]
  /** B 枠が立ったか（UI では使わない。テスト・evidence 用） */
  hasIdentitySlot: boolean
  /** 手順 7（旧等確率）まで落ちたか。pool 36 では常に false */
  legacyFallback: boolean
}

export type RewardHistorySnapshot = { offered: CardDefId[]; declined: CardDefId[] }

export type RewardPickInput = {
  godId: GodId
  /** そのバトルの seed（接尾辞なし）。関数内で `${seed}-reward` にする（既存と同じ文字列） */
  seed: string
  /** getCardPoolForGod(godId)（共通 32＋専用 4） */
  pool: CardDef[]
  /** 勝ったバトルの 20 枚（collectDeckCardIds → 復元不能なら呼び出し側が fallback 済み） */
  deck20: CardDefId[]
  /** loadRewardBonuses(godId) */
  bonuses: Map<CardDefId, number>
  /** loadRewardHistory(godId) */
  history: RewardHistorySnapshot
  /** getRecommendedDeck(godId)（相性スコアの +1 にだけ使う） */
  recommended: CardDefId[]
}

export const REWARD_OFFER_SIZE = 3

export function pickRewardOffer(input: RewardPickInput): RewardOffer
```

### 1-2. 前処理（決定論の土台）

```ts
// (1) 既存 LCG を 1 回だけ回し、pool 全体の seed 順位を得る
const shuffled = pickRewardCandidates(input.pool, `${input.seed}-reward`, input.pool.length)
const rank = new Map<CardDefId, number>(shuffled.map((c, i) => [c.id, i]))   // 小さいほど先
// (2) 枚数・上限・集合
const count = countBy(input.deck20)                      // Map<CardDefId, number>
const maxOf = (id) => getMaxCopies(id, input.bonuses)    // 2 + bonus
const bonusOf = (id) => input.bonuses.get(id) ?? 0
const excluded = new Set([...input.history.offered, ...input.history.declined])
const recommendedSet = new Set(input.recommended)
const exclusives = input.pool.filter((c) => c.godId === input.godId)
const commons = input.pool.filter((c) => !c.godId)
const exclusiveTypes = new Set(exclusives.map((c) => c.type))
const strongConds = new Set(exclusives.flatMap((c) => (c.bonus ? [c.bonus.when] : [])))
// (3) 「余り枠あり」＝ bonus>0 なのに編成が上限未満 → 報酬が無駄になるので全役から外す
const hasSpareCap = (id) => bonusOf(id) > 0 && (count.get(id) ?? 0) < maxOf(id)
```

比較関数はすべて「キー → `rank`」の辞書順で、`Array.prototype.sort` の安定性に依存しない（`rank` が全単射なので同点は存在しない）。

### 1-3. 役割ごとの候補集合と並び

| 役 | role | 候補集合（commons／exclusives のうち） | 並び（先頭を採る） |
|---|---|---|---|
| **A 即戦力** A1 | `ready` | 共通札で `count ≥ maxOf(id)`（上限いっぱい）・`!excluded`・`!hasSpareCap` | `bonusOf` 昇順 → `count` 降順 → `rank` |
| A 即戦力 A2（A1 が空のとき） | `ready` | 共通札で `count == 1`・`bonusOf == 0`・`!excluded` | `rank` |
| **B 神の個性** | `identity` | 専用札で `bonusOf == 0`・`!excluded`（D2） | `rank`（D7） |
| **C 次の構築** | `next` | 共通札で `count == 0`・`bonusOf == 0`・`!excluded` | `affinityScore` 降順 → `rank` |
| 補充 | `fill` | 共通札で未採用・`!excluded`・`!hasSpareCap` | `count == 0` を先 → `rank` |

`affinityScore(card, strongConds, exclusiveTypes, recommendedSet)`（D5）：

```ts
export function affinityScore(card: CardDef, ctx: AffinityContext): number {
  let s = 0
  if (ctx.exclusiveTypes.has(card.type)) s += 2                  // 専用 4 種の type 構成に含まれる
  if (card.bonus) {
    if (ctx.strongConds.has(card.bonus.when)) s += 2             // 神の個性条件と一致
    else if (ctx.strongConds.size === 0) s += 0.5                // 条件を持たない神は「条件付き札」を薄く推す
  }
  if (ctx.recommendedSet.has(card.id)) s += 1                    // おすすめデッキ採用札
  return s
}
```

実データでの strong 条件（`cards/*.ts` の `when:` から導出）：蒼毘 `{blocked, enemyBig}`／大耀 `{charged}`／笑蓮 `{lowHp, blocked}`／恵比寿・才華・寿楽・福永 `{}`。専用 type 集合：恵比寿 {attack, support}／大耀 {attack, support}／蒼毘 {guard, attack, hinder}／才華 {resonance, support, attack}／寿楽 {hinder, guard, attack, resonance}／福永 {attack, support, resonance}／笑蓮 {support, guard, attack}。

例（大耀・おすすめデッキ＝専用 8＋一撃／剛撃／速攻／神託／予言／共振／神楽舞／巫女の舞／守護／鉄壁の構え／受け流し／呪縛）：C の最高点は『乱舞』（attack +2・charged +2 ＝ 4）、次点 2 点に『渾身の一撃』『捨身の一撃』『神速』『大喝』『連撃』『癒し』『息吹』『神力の泉』『息継ぎ』『大治癒』『闘志』『見通し』が並び seed で決まる。

### 1-4. 手順（決定論・ちょうど 3 枚）

```
1. rank / count / excluded / strongConds を作る（§1-2）
2. chosen = []
3. A: A1 候補の先頭。無ければ A2 候補の先頭。無ければ A 枠は空（手順 6 で埋める）
4. B: B 候補の先頭。無ければ B 枠は立たない（hasIdentitySlot=false）
5. C: C 候補（chosen を除く）から、B が立てば 1 枚・立たなければ 2 枚
6. 補充（fill）: chosen が 3 枚未満なら、補充候補（chosen を除く）から足りる分
7. 解除: まだ 3 枚未満なら excluded を declined → offered の順に外して手順 6 を再実行
   （pool 36・excluded ≤12 では到達不能。小 pool のテストで挙動だけ固定する）
8. 最終: まだ 3 枚未満なら pickRewardCandidates(pool, `${seed}-reward`, pool.length) を先頭から走査し、
   未採用を role 'fill' で追加（legacyFallback=true）。pool が 3 枚以上なら必ず 3 枚になる
9. 表示順 = [A?, B?, C…, fill…]（役の順は固定：即戦力 → 神の個性 → 次の構築 → 補充）
10. 戻り値 candidates の各要素に copiesInDeck / maxCopies を添える
```

役割ラベル（UI 文言は §5）：`ready`＝即戦力／`identity`＝神の個性／`next`＝次の構築／`fill`＝新しい選択肢。

### 1-5. 不変条件（テストで固定）

- `candidates.length === 3`、`id` は互いに異なる、すべて `pool` に含まれる。
- `identity` の札は必ず `godId` 一致の専用札で `bonusOf == 0`。`ready`／`next`／`fill` は共通札。
- `next` の札は `copiesInDeck == 0`。`ready`（A1）は `copiesInDeck ≥ maxCopies`、`ready`（A2）は `copiesInDeck == 1`。
- `excluded` の札は手順 7 に落ちない限り含まれない。
- 入力が同じなら出力は参照以外すべて同じ（`JSON.stringify` 一致）。

---

## 2. deterministic Seed との関係

| 項目 | 確定 |
|---|---|
| RNG | 既存 `pickRewardCandidates`（`hash*31+charCode` → LCG `1103515245, 12345`・Fisher–Yates）を**そのまま**使う。入力文字列は既存と同じ `${seed}-reward`。新しい乱数器・`Math.random` は増やさない |
| 使い方 | LCG は**1 回だけ** pool 全体（36 枚）をシャッフルし「seed 順位 `rank`」を作る。以後の同点解消はすべて `rank` の比較。手順 8 の旧挙動も同じシャッフル列の先頭から読むため、pool 枯渇時は**旧 `pickRewardCandidates(pool, seed, 3)` と同一の 3 枚**になる（後方互換・テストで固定） |
| 同入力 → 同出力 | `pickRewardOffer` は純関数（localStorage・時刻・React を参照しない） |
| seed 以外の入力 | `deck20`（勝ったバトルの構成）・`bonuses`・`history`・`godId`・`recommended`。これらが変われば同じ seed でも 3 択は変わる |
| それが許容できる理由 | 決定43 の設計どおり報酬は **GameState／replay／score の外**（`rewardPicker.ts` 冒頭コメント「GameState に影響しない演出用」）。Seed 共有（決定126 `?seed=`）で同じ盤面を遊ぶ 2 人の**勝敗・スコア・ランキングは不変**で、個人のメタ進行だけが異なる。既存の `rewardBonuses` も端末依存（Preflight §4 反証 3） |
| 「もう一度」（通常戦） | 勝利後は `resolveRematchSeed` が `undefined` → 新 seed（`seed-${Date.now()}`）→ 3 択も新しい。敗北・未撃破は同 seed だが `status !== 'won'` なので報酬は出ない。よって「同じ 3 択を見る」経路は無い（`?seed=` 固定時のみ再現可能＝QA に使う） |
| Daily | `startDailyGame` は `daily.seed`（同日共有）だが §8 で報酬自体を出さない |
| replay | `src/core/replay` は GameState のみを対象。報酬は対象外（今日と同じ） |

---

## 3. reward 履歴（`src/hooks/rewardHistoryStorage.ts`・新規）

### 3-1. スキーマ（version 1）

```ts
// key: 'sevengods.rewardHistory'
type RewardHistoryData = {
  version: 1
  gods: Record<string /* GodId */, { offered: CardDefId[]; declined: CardDefId[] }>
}
// 例
{ "version": 1, "gods": { "taiyo": {
    "offered":  ["card_common_attack_01", "card_taiyo_attack_01", "card_common_attack_07",
                 "card_common_guard_01",  "card_taiyo_support_01", "card_common_support_01"],
    "declined": ["card_common_guard_01",  "card_taiyo_support_01", "card_common_support_01"] } } }
```

- `offered`：**毎勝利の確定時**に提示 3 枚を末尾へ push。**最大 6**（3 枚×2 勝）。超えた分は先頭（古い）から落とす（FIFO）。
- `declined`：**見送り時**に提示 3 枚を末尾へ push。**最大 6**（直近 2 回の見送り）。FIFO。
- 神ごとに独立。`rewardBonuses` と同じ「godId → …」の形。サイズ上限：7 神 × 12 id × ~25 文字 ≈ 2.5KB。

### 3-2. API

```ts
export const REWARD_HISTORY_STORAGE_KEY = 'sevengods.rewardHistory'
export const REWARD_HISTORY_VERSION = 1
/** 「直近 2 勝」＝ 3 枚 × 2。UI／メタ進行の定数であり、ゲームバランス値ではないので rules.ts には置かない（src/core 0 の制約と整合） */
export const REWARD_HISTORY_WINDOW = REWARD_OFFER_SIZE * 2   // 6

export type GodRewardHistory = { offered: CardDefId[]; declined: CardDefId[] }

/** 無ければ・壊れていれば・version 違いなら { offered: [], declined: [] } */
export function loadRewardHistory(godId: GodId): GodRewardHistory
export function pushOfferedRewards(godId: GodId, cardIds: CardDefId[]): void
export function pushDeclinedRewards(godId: GodId, cardIds: CardDefId[]): void
/** 純関数（テスト用に export）：末尾へ追加し、先頭から落として max 件に揃える */
export function appendFifo<T>(list: T[], items: T[], max: number): T[]
```

実装は `rewardStorage.ts` を**写経**する（`load`／`save`／型ガード／`try-catch`）。型ガードは `version` が number・`gods` が object・各神の `offered`／`declined` が string 配列であることを見る。読み出し時に各配列を `slice(-REWARD_HISTORY_WINDOW)` で丸める（将来 WINDOW を小さくしても安全）。

### 3-3. 失敗時の挙動

| 事象 | 挙動 |
|---|---|
| key 無し | 空で開始 |
| JSON 壊れ・型不一致・`version !== 1` | 空で開始（**消さない・直さない**＝`deckPreferenceStorage` と同じ読むだけ方針） |
| `localStorage` が無い／`setItem` が例外（容量・プライベート） | `try-catch` で握りつぶす。履歴が残らないだけで、3 択は今日と同じく毎回成立する |
| `pushOffered` と `pushDeclined` の 2 回書き（見送り時） | 2 回の `setItem`。途中失敗しても片方が残るだけで整合性の問題なし（両方とも除外集合に入るだけ） |

---

## 4. 同一候補反復防止

- 除外集合 `excluded = offered ∪ declined`（神ごと）。A／B／C／fill のすべてに適用（D2）。
- 加えて「bonus>0 なのに上限未満」の札は余り枠ありとして除外（D4）。選んで bonus が付いた札は、3 枚目を実際に編成するまで**再提示されない**＝選択の意味が画面に出る前に重ならない。
- 解除順（手順 7）：候補が 3 枚未満のときだけ **`declined` → `offered`** の順に除外を外す（Preflight どおり）。`declined` は `offered` 窓より古い約束を含むため「古い約束から外す」と同義。pool 36・excluded ≤12・余り枠除外は高々 bonus 付きの枚数なので、**現行データでは到達不能**（補充候補 ≥ 32−12−bonus 付き ≥ 3）。小 pool（6 枚）のテストで順序だけ固定する。
- B 枠の期待出現（計算のみ・Preflight §3-4 を踏襲）：
  - B を一度も取らない場合：勝利 k で提示された専用は k+1・k+2 で除外、**k+3 で復帰**。専用 4 種で窓 2 勝（≤2 種除外）なので B は**毎勝利立つ**（4 種を周期 3 以上で巡回）。
  - B を毎回取る場合：4 勝で 4 種すべて bonus 1 → 5 勝目以降は **B 不成立 → C×2**（専用は「取り切る目標」として終わる）。
  - 見送りを挟む場合：見送った専用は `declined` 窓（直近 2 回の見送り）が切れるまで出ない。見送りが連続しなければ 2 勝より長く除外（約束を上回る側）。
- A の反復：A1（上限いっぱい）の札は選ぶと bonus+1・上限未満になり「余り枠あり」で除外 → 3 枚目を編成して戦うまで出ない。A2（1 枚入り）は選ばなければ `offered` で 2 勝除外。
- C の反復：`offered` で 2 勝除外。C 候補は ≥ 20 枚（32 − デッキ内共通 ≤12）なので枯渇しない。

---

## 5. UI 文言（すべて日本語直書き・最終）

| 場所 | 文言（確定） | 備考 |
|---|---|---|
| タイトル `.reward-title` | `報酬カードを1枚選ぼう` | 既存のまま |
| サブタイトル `.reward-subtitle` | `選んだカードは、次回からこの神のデッキで1枚多く編成できます。` | 既存「次回以降このデッキで編成上限が1枚増えます。」を「神のデッキ」に正す（効果は神ごと） |
| 役割チップ `.reward-role-chip[data-role]` | `ready`→`即戦力`／`identity`→`神の個性`／`next`→`次の構築`／`fill`→`新しい選択肢` | カード上部（専用バッジ `専用` の左隣・同じ行） |
| 枚数表示 1 行目 `.reward-copies-now` | `いま {n} 枚編成中`（n=0 のときは `いま 0 枚`） | §6 |
| 枚数表示 2 行目 `.reward-copies-limit` | `上限 {m} → {m+1}` | §6 |
| 枚数表示 3 行目 `.reward-copies-hint`（任意） | n=0：`まず 1〜2 枚入れてみよう`／0<n<m：`{m} 枚目を足してから {m+1} 枚目`／n≥m：なし | §6 |
| 見送りボタン本文 `.reward-skip` | `今回は見送る` | 既存 |
| 見送りボタン注記 `.reward-skip-note`（ボタン内 2 行目） | `この 3 枚は次の 2 勝では出ません` | 文字どおり保証（§4） |
| 選択後トースト `.reward-toast`（`role="status"` `aria-live="polite"`） | `次回の編成で『{カード名}』を {m+1} 枚まで積めます` | 見送りボタンの位置に差し替えて 1,200ms 表示 → `onPick` |
| Daily | （表示なし） | 既存 `DailyChallengeScreen` の「通常モードの報酬ボーナスは使いません」は不変 |
| 編成画面 | `報酬で上限+{n}`（`DeckBuilderScreen.tsx` L286） | 既存・不変 |

数字の前後は既存 docs／UI に合わせて半角スペース（例：`いま 2 枚編成中`）。

---

## 6. 「いま n 枚 → 上限 m → m+1」表示

```ts
export type RewardCopiesText = { now: string; limit: string; hint: string | null }

export function formatRewardCopies(count: number, max: number): RewardCopiesText {
  const now = count === 0 ? 'いま 0 枚' : `いま ${count} 枚編成中`
  const limit = `上限 ${max} → ${max + 1}`
  const hint =
    count === 0 ? 'まず 1〜2 枚入れてみよう'
    : count < max ? `${max} 枚目を足してから ${max + 1} 枚目`
    : null
  return { now, limit, hint }
}
```

- `count` ＝ `deck20` 中の枚数（`collectDeckCardIds` → `countBy`）。`max` ＝ `getMaxCopies(card.id, bonuses)`（＝ `RULES.deckBuilding.maxCopiesPerCard + bonus`・`src/core` の既存関数を読むだけ）。
- 代表例：

| 役 | count | max | 表示 |
|---|---|---|---|
| A1（2 枚積みの共通） | 2 | 2 | `いま 2 枚編成中`／`上限 2 → 3` |
| A1（bonus 1 で 3 枚積み） | 3 | 3 | `いま 3 枚編成中`／`上限 3 → 4` |
| A2（1 枚入り） | 1 | 2 | `いま 1 枚編成中`／`上限 2 → 3`／`2 枚目を足してから 3 枚目` |
| B（恵比寿・大耀・才華・福永の専用） | 2 | 2 | `いま 2 枚編成中`／`上限 2 → 3` |
| B（蒼毘・寿楽・笑蓮の専用） | 1 | 2 | `いま 1 枚編成中`／`上限 2 → 3`／`2 枚目を足してから 3 枚目` |
| B（デッキに入れていない専用） | 0 | 2 | `いま 0 枚`／`上限 2 → 3`／`まず 1〜2 枚入れてみよう` |
| C／fill | 0 | 2 | `いま 0 枚`／`上限 2 → 3`／`まず 1〜2 枚入れてみよう` |

`deck20` の復元（`RewardOverlay` の `useMemo` 内・読むだけ）：

```ts
const fromState = deckFromState                                   // BattleScreen が collectDeckCardIds(state) を渡す
const deck20 = fromState.length === RULES.deck.size ? fromState
  : (loadDeckPreference(godId) ?? getRecommendedDeck(godId))      // 復元不能時のみ（通常は到達しない）
```

---

## 7. 見送り仕様

| 項目 | 確定 |
|---|---|
| 操作 | `.reward-skip`（本文「今回は見送る」＋注記「この 3 枚は次の 2 勝では出ません」） |
| 記録 | `onSkip(offeredIds)` → `BattleScreen` が `pushOfferedRewards(godId, ids)` と `pushDeclinedRewards(godId, ids)` を呼ぶ。`rewardBonuses` は変更しない |
| 画面 | 既存どおり `setRewardDone(true)`／`setRewardOpen(false)` → Result Hub へ。トーストは出さない（見送りの意味はボタン注記で事前に伝える） |
| 1 勝 1 報酬 | 見送りも「報酬の判断 1 回」を消費する（既存 `rewardDone` の規則そのまま）。再度「報酬カードを選ぶ」は出ない |
| 決める前の離脱 | リロード・タブ閉じでは `status==='won'` の state は保存されない（`battleSaveStorage` は `playing` のみ）ため、その勝利の報酬は消え、履歴にも残らない（既存と同じ） |

---

## 8. Daily 非表示

変更は **`src/components/battle/BattleScreen.tsx` の 2 箇所のみ**（master `a3ffa87` の行番号）：

```tsx
// L658（RewardOverlay の表示条件）
- {state.status === 'won' && !rewardDone && rewardOpen && (
+ {state.status === 'won' && state.mode !== 'daily' && !rewardDone && rewardOpen && (

// L678（GameOverOverlay へ渡す rewardPending）
- rewardPending={state.status === 'won' && !rewardDone}
+ rewardPending={state.status === 'won' && state.mode !== 'daily' && !rewardDone}
```

- `state.mode` は `GameMode | undefined`（旧セーブは `undefined`＝通常）。`!== 'daily'` は `undefined` を通常として扱うので旧セーブも従来どおり報酬が出る。`BattleScreen.tsx` L395・L644・L694 で既に同じ式を使っている。
- `GameOverOverlay.tsx` は変更 0：`rewardPending=false` なら既存の分岐で Result Hub（`data-testid="result-hub"`）が直接出る。Daily の `daily-diff`・次の目標・出口は不変。
- `useGameEngine.startDailyGame`／`GameFlow`／`DeckBuilderScreen` は変更 0（`dailyFairness.test.ts` の source-scan 4 件はそのまま PASS）。

---

## 9. 通常戦仕様（不変の確認）

| 項目 | 確定 |
|---|---|
| 1 勝 1 報酬 | `rewardDone` が seed ごとにリセット（L327–330）。選択・見送りのどちらでも確定 |
| 効果 | `addRewardBonus(godId, cardId)` ＝ `sevengods.rewardBonuses[godId][cardId] += 1`（上限なし・既存）。**編成上限 +1 のみ**。AP／HP／スコア／敵／OTOMO／神階／託宣に影響なし |
| デッキ | 20 枚固定（`RULES.deck.size`）。報酬はデッキを自動で変えない（おすすめデッキ不変・`getRecommendedDeck` は bonus を見ない） |
| 流れ | 勝利 → 振り返り／スコア → 「報酬カードを選ぶ ›」（`data-testid="open-reward"`）→ `RewardOverlay`（3 択＋見送り）→ Result Hub。決定166 の認知順序は不変 |
| 開始 | `engine.startGame(godId, deck, difficulty, loadRewardBonuses(godId), …)`（3 箇所）不変 |
| 後方互換 | 旧 `pickRewardCandidates` は残す。history 無し・bonus 無し・deck20 復元可の初回勝利でも 3 役は成立する（A2／B／C が必ず存在：デッキに共通 ≥12・専用は 4 種 bonus 0） |

---

## 10. 将来 Ranking で bonus を無効にする境界

今日の境界（3 箇所・いずれも「Daily では渡さない／空にする」で表現）：

| 場所 | 内容 |
|---|---|
| `src/hooks/useGameEngine.ts` L111–116 | `startDailyGame(godId, deck, dailyKey, otomoGrowthPath)` は **`bonusCopies` を引数に持たない**（型で担保） |
| `src/components/setup/DeckBuilderScreen.tsx` L101–103 | `dailyChallenge ? new Map() : loadRewardBonuses(godId)` |
| `src/components/GameFlow.tsx` L340–360・L392–425 | `beginDailyChallenge` 経路では `loadRewardBonuses` を呼ばない（`dailyFairness.test.ts` が source-scan で固定） |
| 本 Pilot 追加 | `BattleScreen.tsx` L658／L678 の `state.mode !== 'daily'`（報酬の**提示**側の境界） |

Ranking／score は bonus を読まない（`loadRewardBonuses`／`addRewardBonus` の参照は `GameFlow.tsx`・`DeckBuilderScreen.tsx`・`BattleScreen.tsx` とテストのみ。`src/core` 側で bonus に触れるのは `deckBuilder.ts` の `getMaxCopies`／`validateDeck` と、START action の `bonusCopies` を `validateDeck` に渡す `src/core/engine/createInitialState.ts` L46–47 のみ＝**デッキ合法性検査に限られ、`GameState` には保持されず `score.ts`・RNG・replay 結果・`ranking` 系には 0 件**。※2026-10-06 Pilot 開始時に Lane 2 差分監査の指摘に基づき実コードへ合わせて訂正（旧記述「`src/core/engine`・`score`・`ranking` 系に 0 件」は `createInitialState.ts` を見落としていた）。

将来の一本化（**本 Pilot では実装しない**・AI 提案）：

```ts
// 置き場所案：src/components/battle/rewardPolicy.ts（retrySemantics.ts と同じ「意味論を 1 か所で決める純関数」層・src/core 外）
export function isRewardBonusEnabled(mode: GameMode | undefined): boolean { return (mode ?? 'normal') === 'normal' }
export function isRewardOfferEnabled(mode: GameMode | undefined): boolean { return isRewardBonusEnabled(mode) }
```

- 将来 `'ranking'` 等の mode が増えたとき、`BattleScreen` の 2 箇所と `DeckBuilderScreen`・`GameFlow` がこの関数を呼ぶ形に寄せる。
- 本 Pilot で導入しない理由：`dailyFairness.test.ts` は `GameFlow`／`DeckBuilderScreen` の呼び出し文字列（`dailyChallenge`・`loadRewardBonuses`）を source-scan しており、ヘルパー化はテスト改修を伴う＝Narrow Pilot の範囲外。Preflight §3-6 の「条件 1 つ」を守る。

---

## 11. localStorage migration

| 項目 | 確定 |
|---|---|
| 新 key | `sevengods.rewardHistory`（version 1）。**新規のみ** |
| 既存 key | `sevengods.rewardBonuses`（version 1）・`sevengods.deckPreference`（`RULES.saveVersion`=9）は**形式・version とも不変**。読み書きコードも不変（`rewardStorage.ts` 0 行変更） |
| 旧データの移行 | 不要（履歴は無ければ空から始まる。bonus は既存値をそのまま読む） |
| version 不一致／JSON 壊れ／型不一致 | 空で開始。保存データは消さない・直さない（上書きは次の `push` 時に version 1 で行われる） |
| 容量・例外 | `setItem` の例外は握りつぶす（`rewardStorage.ts` と同じ）。履歴が書けない端末では反復抑制だけが効かない（3 択自体は成立） |
| rollback 後 | 旧コードは `sevengods.rewardHistory` を読まない → 残っていても無害（§15） |
| `RULES.saveVersion` | 変更 0（GameState／deckPreference のための版。履歴は独立 version） |

---

## 12. Acceptance Criteria

| # | 基準（測定可能） |
|---|---|
| AC1 | `pickRewardOffer` は任意の入力（pool 36）で `candidates.length === 3` かつ id が互いに異なる（unit） |
| AC2 | 同じ入力を 2 回与えると `JSON.stringify(offer)` が一致する。`seed` だけ変えると少なくとも 1 枚が変わる入力例が存在する（unit） |
| AC3 | deck20 に 2 枚積みの共通札（bonus 0）があるとき、先頭候補は `role==='ready'` かつその札のいずれか（unit） |
| AC4 | 2 枚積みの共通札が無いとき、`ready` は 1 枚入り・bonus 0 の共通札で、UI の 3 行目に「2 枚目を足してから 3 枚目」が出る（unit＋UI） |
| AC5 | 専用札に「bonus 0 かつ history 外」があるとき `identity` が 1 枚ちょうど入り、無いとき `identity` は 0 枚で `next` が 2 枚になる（unit） |
| AC6 | `next` の札はすべて `copiesInDeck === 0` の共通札で、`affinityScore` 降順（同点は seed）になっている（unit） |
| AC7 | `history.offered ∪ declined` の札は候補に含まれない（pool 36・excluded 12 で検証）（unit） |
| AC8 | 専用 4 種の bonus をすべて 1 にした入力で `identity` は出ず、UI でもチップ「神の個性」が 0・「次の構築」が 2（unit＋UI） |
| AC9 | 小 pool（共通 6）で excluded が全候補を覆うとき、解除順が `declined` → `offered` で、それでも足りなければ旧 `pickRewardCandidates` と同じ札になる（unit） |
| AC10 | 選択で `sevengods.rewardBonuses[god][card]` が +1、`sevengods.rewardHistory[god].offered` に 3 枚が追加され、`declined` は不変（UI） |
| AC11 | 見送りで `rewardBonuses` 不変、`offered` と `declined` に同じ 3 枚が追加される（UI） |
| AC12 | 2 勝目の 3 択に 1 勝目の 3 枚が 1 枚も含まれない（UI：`?seed=` を変えて 2 連勝） |
| AC13 | 通常勝利の `RewardOverlay` で各カードに役割チップ・`いま n 枚…`・`上限 m → m+1` が描かれ、PC 1508×660／SP 390×844 とも `.reward-card` 内に収まる（はみ出し 0・横スクロール 0）（UI） |
| AC14 | 選択後 `.reward-toast` に「次回の編成で『X』を 3 枚まで積めます」が出てから Result Hub に切り替わる（UI） |
| AC15 | Daily 勝利で `[data-testid="open-reward"]` が存在せず `[data-testid="result-hub"]` が直接出る。`rewardHistory` は書かれない（UI） |
| AC16 | `git diff --stat master -- src/core` が空。tsc 0・oxlint 0・vitest 既存全件 PASS（`dailyFairness`・`resultTransitions`・`entranceWiring` の source-scan を含む）（静的） |
| AC17 | `BattleScreen.tsx` に `state.mode !== 'daily'` を含む `RewardOverlay` 条件と `rewardPending` 式が各 1 つある（source-scan unit） |
| AC18 | `RewardOverlay.tsx` は storage 書き込み関数（`addRewardBonus`／`push*Rewards`／`localStorage.setItem`）を呼ばない（source-scan unit） |

---

## 13. unit test 一覧（vitest・node 環境・`MemoryStorage` は `rewardStorage.test.ts` と同じ）

### 13-1. `src/hooks/rewardHistoryStorage.test.ts`（5 件）

| # | タイトル | 入力 → 期待 |
|---|---|---|
| H1 | `round-trips offered and declined per god` | `pushOffered(taiyo,[a,b,c])`・`pushDeclined(taiyo,[a,b,c])` → `load(taiyo)` が `{offered:[a,b,c], declined:[a,b,c]}`、`load(ebisu)` は空 |
| H2 | `keeps only the newest 6 (FIFO) for offered and declined` | `pushOffered` を [1,2,3]→[4,5,6]→[7,8,9] → `offered` が `[4,5,6,7,8,9]`。`appendFifo([1,2,3,4,5,6],[7,8,9],6)` → `[4,5,6,7,8,9]` |
| H3 | `starts empty when the stored version differs` | `setItem(key, '{"version":2,"gods":{"taiyo":{"offered":["x"],"declined":[]}}}')` → `load(taiyo)` 空。生データは変更されない |
| H4 | `starts empty on malformed JSON or wrong shape` | `'{not json'`・`'{"version":1,"gods":{"taiyo":{"offered":"x"}}}'` → 空 |
| H5 | `does not throw when localStorage is unavailable` | `localStorage=undefined` → `push*` が throw しない・`load` が空 |

### 13-2. `src/components/battle/rewardPicker.test.ts`（10 件）

共通フィクスチャ：`pool=getCardPoolForGod(taiyo)`、`recommended=getRecommendedDeck(taiyo)`、`deck20` は recommended（専用 8＋共通 12・すべて 1 枚）、`bonuses=new Map()`、`history={offered:[],declined:[]}`、`seed='d267-test'`。

| # | タイトル | 入力 → 期待 |
|---|---|---|
| P1 | `same input → same offer; different seed → different offer` | 2 回呼んで `JSON.stringify` 一致。`seed` を `'d267-test-2'` にすると candidates の id 列が異なる |
| P2 | `ready prefers a common card already at its cap (2 copies, bonus 0)` | deck20 を「速攻×2」に差し替え（巫女の舞を外す）→ `candidates[0]` が `{role:'ready', card.id: quickStrike, copiesInDeck:2, maxCopies:2}` |
| P3 | `ready falls back to a 1-copy common when nothing is at cap` | 既定 deck20 → `candidates[0].role==='ready'`、`copiesInDeck===1`、`card.godId` 無し |
| P4 | `cards with unused bonus headroom are excluded from every role` | `bonuses={quickStrike:1}`（編成 1 枚）→ 速攻は candidates に含まれない。`bonuses={quickStrike:1}` かつ deck20 速攻×3 → `ready` が速攻（`maxCopies 3`） |
| P5 | `identity appears only when a fresh exclusive exists` | 既定 → `identity` ちょうど 1 枚・`godId===taiyo`・bonus 0。`history.offered=[その札]` にして再実行 → 別の専用が `identity` |
| P6 | `no fresh exclusive → two next cards` | `bonuses` に大耀専用 4 種 =1 → `hasIdentitySlot===false`、roles が `['ready','next','next']` |
| P7 | `next excludes in-deck cards and ranks by affinity (乱舞 first for 大耀)` | 既定 → `next` の先頭が `flurry`（score 4）。`next` の全札が `copiesInDeck===0` |
| P8 | `offered and declined cards are excluded` | `history.offered=[flurry, boldStrike, strike…6 枚]`・`declined=[6 枚]` → いずれも含まれない。`next` 先頭は 2 点札のうち seed 順 |
| P9 | `release order declined → offered, then legacy order (tiny pool)` | pool を共通 6 枚だけに縮め、`offered` に 3・`declined` に 3（全 6 枚）→ 3 枚返る。最初の 3 枚が `declined` 側から（`rank` 順）。pool 3 枚＋全除外 → `legacyFallback===true` で `pickRewardCandidates(pool, seed+'-reward', 3)` と同じ id 列 |
| P10 | `helpers: collectDeckCardIds sums 4 piles; formatRewardCopies variants` | `{deck:[a,b], hand:[c], discard:[d], exhausted:[e]}` → 5 id。`format(2,2)` → `{now:'いま 2 枚編成中', limit:'上限 2 → 3', hint:null}`、`format(1,2).hint==='2 枚目を足してから 3 枚目'`、`format(0,2)` → `{now:'いま 0 枚', hint:'まず 1〜2 枚入れてみよう'}`、`format(3,3).limit==='上限 3 → 4'` |

### 13-3. `src/components/battle/rewardDailyWiring.test.ts`（1 件・source-scan）

| # | タイトル | 期待 |
|---|---|---|
| W1 | `BattleScreen hides the reward in daily mode and RewardOverlay never writes storage` | `BattleScreen.tsx` に `/state\.status === 'won' && state\.mode !== 'daily' && !rewardDone && rewardOpen/` と `/rewardPending=\{state\.status === 'won' && state\.mode !== 'daily' && !rewardDone\}/` が各 1 回。`RewardOverlay.tsx` が `/\b(addRewardBonus|pushOfferedRewards|pushDeclinedRewards|localStorage\.setItem)\s*\(/` にマッチしない |

合計 **16 件**（Preflight §10-2 の「14 件以上」を満たす）。既存 `rewardStorage.test.ts` 7 件・`dailyFairness.test.ts`・`resultTransitions.test.ts`・`entranceWiring.test.ts` は変更なしで PASS する設計（§8・D3・D10）。

---

## 14. UI test 一覧（Playwright・`scripts/d267-reward-relevance-v1/acceptance.mjs`・1 browser 直列）

`scripts/solve-legibility-v1/acceptance.mjs` の `openPage`（fixture を `addInitScript` で localStorage へ）・`startNormal`／`startDailyFromHome`・`playToEnd(page,'win')`・`settleResult` を複製して使う。勝利が必要な run は `?seed=` 固定＋`winFirstBattle` と同じ最大 3 回の再挑戦。対戦は 恵比寿×試練の影（既存スクリプトの既定）。各 run で `console.error` 0 を併せて記録し、スクリーンショットを `scripts/d267-reward-relevance-v1/out/` へ保存。

| run | viewport | シナリオ | fixture | 検証 |
|---|---|---|---|---|
| U1 | PC 1508×660 | 通常勝利 → 「報酬カードを選ぶ」→ 3 択を観察 → 1 枚選ぶ | 空 | AC13（`.reward-role-chip` 3 個・文言が `即戦力|神の個性|次の構築|新しい選択肢`・`.reward-copies-now` が `/^いま \d+ 枚/`・`.reward-copies-limit` が `/^上限 \d+ → \d+$/`・各 `.reward-card` の `getBoundingClientRect` が viewport 内・`scrollWidth<=clientWidth`）、AC14（`.reward-toast` の文言 `/^次回の編成で『.+』を \d+ 枚まで積めます$/`）、AC10（storage） |
| U2 | SP 390×844 | U1 と同じ | 空 | AC13（カード 2＋1 段は許容。チップ・枚数行がカード枠内・横スクロール 0）・AC14・AC10 |
| U3 | PC 1508×660 | 専用上限到達後の通常勝利 → 見送る → 別 seed で再び勝利 | `sevengods.rewardBonuses={version:1,bonuses:{ebisu:{恵比寿専用 4 種:1}}}` | AC8（「神の個性」0・「次の構築」2）、AC11（見送りで `offered`・`declined` に 3 枚、bonus 不変）、AC12（2 勝目の 3 択と 1 勝目の 3 枚が交わらない） |
| U4 | SP 390×844 | U3 と同じ | 同上 | AC8・AC11・AC12＋`.reward-skip` 本文と `.reward-skip-note` が枠内 |
| U5 | PC 1508×660 | Daily 勝利（`startDailyFromHome`） | `sevengods.daily` 空（残り 3 回） | AC15（`open-reward` 無し・`result-hub` あり・`daily-diff` あり・`sevengods.rewardHistory` 無し） |
| U6 | SP 390×844 | U5 と同じ | 同上 | AC15 |

評価：6 run すべて PASS で **AUTOMATED GATE PASS → HUMAN QA READY**（Preflight §6 の 2 戦＋2 問へ）。

---

## 15. rollback 条件

| 項目 | 確定 |
|---|---|
| 単位 | branch `feat/d267-reward-relevance-v1` の runtime commit（①history storage ②picker＋tests ③RewardOverlay＋CSS ④BattleScreen 2 行＋wiring test）。merge 後は merge commit を `git revert -m 1`。docs commit は残す |
| データ | `sevengods.rewardHistory` が端末に残るが、旧コードは読まない → **無害**。`sevengods.rewardBonuses` は Pilot 中も形式不変なので、Pilot で得た bonus はそのまま有効（決定43 の互換を保つ） |
| トリガー | (1) Human QA 2 問のいずれかが NO で、文言・配色の微修正（AI 判断範囲）で解消しない（2) Gate で `src/core` に差分が出た／tsc・oxlint・vitest 既存件が落ちる（3) SP 390 でチップ・枚数表示がカード枠を越える／横スクロールが出る（4) 報酬確定後に Result Hub へ戻らない・1 勝 2 報酬が再現する（5) Daily で報酬ボタンが出る |
| 手順 | revert → tsc／vitest／build → Production の rollback 運用（`docs/RELEASE_STATUS.md`）に従う。CEO 確認は Production 公開・大規模 rollback の規則（CLAUDE.md §6-3 8）に従う |

---

## 16. 変更ファイル一覧と規模

| ファイル | 種別 | 規模（概算） | 内容 |
|---|---|---|---|
| `src/hooks/rewardHistoryStorage.ts` | 新規 | ≈70 行 | §3 |
| `src/hooks/rewardHistoryStorage.test.ts` | 新規 | ≈80 行 | §13-1（5 件） |
| `src/components/battle/rewardPicker.ts` | 変更 | +≈150 行（既存 23 行は不変） | `pickRewardOffer`・`affinityScore`・`collectDeckCardIds`・`formatRewardCopies`・型 |
| `src/components/battle/rewardPicker.test.ts` | 新規 | ≈180 行 | §13-2（10 件） |
| `src/components/battle/rewardDailyWiring.test.ts` | 新規 | ≈30 行 | §13-3（1 件） |
| `src/components/battle/RewardOverlay.tsx` | 変更 | +≈55／−≈10 行 | props `deckFromState`・`onPick(cardId, offeredIds)`・`onSkip(offeredIds)`、`useMemo` で `loadRewardBonuses`／`loadRewardHistory`／`getRecommendedDeck`／deck20 fallback → `pickRewardOffer`、チップ・枚数表示・見送り注記・トースト（1,200ms）・`data-testid`／`data-role`／`data-card-id` |
| `src/components/battle/BattleScreen.tsx` | 変更 | +≈8 行 | L658／L678 の `state.mode !== 'daily'`、`deckFromState={collectDeckCardIds(state)}`、`onPick`／`onSkip` で `pushOfferedRewards`／`pushDeclinedRewards` |
| `src/components/battle/battle.css` | 変更 | +≈40 行（末尾追記） | `.reward-role-chip[data-role=…]`（既存 `TYPE_STYLE` 色は使わず 3 色＋fill の 4 token）・`.reward-copies-*`・`.reward-skip-note`・`.reward-toast`（`.result-toast` とは別 class・`.reward-card-panel` 内に置くので決定241 のトーストと重ならない） |
| `scripts/d267-reward-relevance-v1/acceptance.mjs` | 新規 | ≈250 行 | §14 |
| `docs/DECISION267_REWARD_RELEVANCE_V1_PILOT.md`（Pilot 結果）・`docs/DECISIONS.md` 1 行 | docs | — | Gate 後に PM が追記 |

不変条件：**`git diff --stat master -- src/core` が空**（`deckBuilder.ts`・`rules.ts`・`cards/*`・`gods.ts`・`types/*`・engine・replay に 1 行も触れない）。`src/core` からは `getCardPoolForGod`／`getMaxCopies`／`getRecommendedDeck`／`RULES.deck.size`／`RULES.deckBuilding.maxCopiesPerCard`／型を**読むだけ**。

---

## 17. 未決事項

| # | 事項 | 扱い |
|---|---|---|
| U1 | 役割チップ 4 色の具体値（既存 token から選ぶ：候補 即戦力＝`#ffd166` 系／神の個性＝`RARITY_STYLE.rare.ring #4d9fff` 系／次の構築＝`#4dbd74` 系／新しい選択肢＝`#a9adc4` 系） | Pilot 実装時に AI 判断（Preflight §10 末尾の未決と同じ）。CEO 判断不要 |
| U2 | トースト表示時間 1,200ms（現行の `onPick` 遅延 260ms から延長）が結果画面への戻りを遅く感じさせるか | Human QA Q2 で観察。長ければ 900ms へ（AI 判断） |
| U3 | Playwright の勝利 seed（`?seed=` 固定値）は実装時に既存スクリプトの既定（恵比寿×試練の影）で確定する | 実装時の作業。仕様に影響なし |

コードから決められなかった仕様事項は **0**。上記 3 件はいずれも実装時に AI 判断で確定できる（CLAUDE.md §6-2）。
