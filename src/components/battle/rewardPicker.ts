import type { BonusCond, CardDef, CardDefId, CardType, GameState, GodId } from '../../core/types'
import { getMaxCopies } from '../../core/data/deckBuilder'

/**
 * 決定43：報酬カードの3択を、`seed`から決定論的に選ぶ（`Math.random`は使わない、
 * 決定不変ルール2の精神を踏襲）。GameStateに影響しない演出用の選択なので
 * coreではなくこの層に置いているが、シード付きの単純なFisher-Yatesで
 * 毎回同じ結果になるようにしている。
 */
export function pickRewardCandidates(pool: CardDef[], seed: string, count: number): CardDef[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }

  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = (hash * 1103515245 + 12345) >>> 0
    const j = hash % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, count)
}

/* ------------------------------------------------------------------------------------------------
 * 決定267：Reward Relevance v1「3 役ローテーション」
 *
 * 等確率 3 択（上の `pickRewardCandidates`）を、プレイヤー文脈（勝ったデッキ 20 枚・編成上限 bonus・
 * 直近の提示／見送り履歴・神の個性）で意味づけた 3 枚に置き換える。
 *   A ready    … 即戦力：いま上限いっぱいまで積んでいる共通札（選べば次戦から 3 枚目を入れられる）
 *   B identity … 神の個性：専用 4 種のうち bonus 未取得で直近に提示されていないもの（新鮮なときだけ）
 *   C next     … 次の構築：デッキに入っていない共通札のうち神と相性のよいもの
 *   fill       … 補充：足りないときだけ
 * 乱数は既存 LCG を 1 回だけ回して pool 全体の「seed 順位」を作り、以後の同点解消は全部その順位で
 * 行う（新しい乱数器・Math.random は増やさない）。純関数：localStorage・時刻・React を参照しない。
 * src/core は `getMaxCopies`／型を読むだけで変更しない（Final Design §1・§2・§16）。
 * ---------------------------------------------------------------------------------------------- */


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
  /** 手順 8（旧等確率の先頭から補う）まで落ちたか。pool 36 では常に false */
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

export type AffinityContext = {
  /** その神の専用札が持つ条件付き効果の条件集合（`bonus.when`） */
  strongConds: Set<BonusCond>
  /** その神の専用札の type 集合 */
  exclusiveTypes: Set<CardType>
  /** おすすめデッキ採用札 */
  recommendedSet: Set<CardDefId>
}

/** 神との相性（Final Design §1-3・D5）。神名で分岐せず、専用札のデータから導く */
export function affinityScore(card: CardDef, ctx: AffinityContext): number {
  let s = 0
  if (ctx.exclusiveTypes.has(card.type)) s += 2
  if (card.bonus) {
    if (ctx.strongConds.has(card.bonus.when)) s += 2
    else if (ctx.strongConds.size === 0) s += 0.5
  }
  if (ctx.recommendedSet.has(card.id)) s += 1
  return s
}

/** 勝ったバトルの構成 20 枚を 4 つの山から復元する（D1：将来の使い切り札でも 20 枚を保つ） */
export function collectDeckCardIds(state: Pick<GameState, 'deck' | 'hand' | 'discard' | 'exhausted'>): CardDefId[] {
  return [...state.deck, ...state.hand, ...state.discard, ...state.exhausted].map((c) => c.defId)
}

export type RewardCopiesText = { now: string; limit: string; hint: string | null }

/** 「いま n 枚 → 上限 m → m+1」（Final Design §6） */
export function formatRewardCopies(count: number, max: number): RewardCopiesText {
  const now = count === 0 ? 'いま 0 枚' : `いま ${count} 枚編成中`
  const limit = `上限 ${max} → ${max + 1}`
  const hint = count === 0 ? 'まず 1〜2 枚入れてみよう' : count < max ? `${max} 枚目を足してから ${max + 1} 枚目` : null
  return { now, limit, hint }
}

type Key = (card: CardDef) => number
/** 複数キーの辞書順比較（昇順）。最後は必ず `rank` が入るので同点は存在しない */
const byKeys = (...keys: Key[]) => (a: CardDef, b: CardDef): number => {
  for (const key of keys) {
    const d = key(a) - key(b)
    if (d !== 0) return d
  }
  return 0
}

export function pickRewardOffer(input: RewardPickInput): RewardOffer {
  const { pool, deck20, bonuses, history, godId } = input

  // (1) 既存 LCG を 1 回だけ回し、pool 全体の seed 順位を得る（小さいほど先）
  const shuffled = pickRewardCandidates(pool, `${input.seed}-reward`, pool.length)
  const rankOf = new Map<CardDefId, number>(shuffled.map((c, i) => [c.id, i]))
  const rank: Key = (c) => rankOf.get(c.id) ?? Number.MAX_SAFE_INTEGER

  // (2) 枚数・上限・集合
  const count = new Map<CardDefId, number>()
  for (const id of deck20) count.set(id, (count.get(id) ?? 0) + 1)
  const countOf = (id: CardDefId) => count.get(id) ?? 0
  const maxOf = (id: CardDefId) => getMaxCopies(id, bonuses)
  const bonusOf = (id: CardDefId) => bonuses.get(id) ?? 0
  const recommendedSet = new Set(input.recommended)
  const exclusives = pool.filter((c) => c.godId === godId)
  const commons = pool.filter((c) => !c.godId)
  const ctx: AffinityContext = {
    exclusiveTypes: new Set(exclusives.map((c) => c.type)),
    strongConds: new Set(exclusives.flatMap((c) => (c.bonus ? [c.bonus.when] : []))),
    recommendedSet,
  }
  // (3) 「余り枠あり」＝ bonus>0 なのに編成が上限未満 → 報酬が無駄になるので全役から外す
  const hasSpareCap = (id: CardDefId) => bonusOf(id) > 0 && countOf(id) < maxOf(id)

  const chosen: RewardCandidate[] = []
  const chosenIds = new Set<CardDefId>()
  const take = (card: CardDef, role: RewardRole) => {
    chosen.push({ card, role, copiesInDeck: countOf(card.id), maxCopies: maxOf(card.id) })
    chosenIds.add(card.id)
  }
  const free = (c: CardDef) => !chosenIds.has(c.id)

  const run = (excluded: Set<CardDefId>, withRoles: boolean) => {
    const ok = (c: CardDef) => free(c) && !excluded.has(c.id)
    if (withRoles) {
      // A 即戦力：A1 上限いっぱい → A2 1 枚入り
      const a1 = commons
        .filter((c) => ok(c) && countOf(c.id) >= maxOf(c.id) && !hasSpareCap(c.id))
        .sort(byKeys((c) => bonusOf(c.id), (c) => -countOf(c.id), rank))
      const a2 = commons.filter((c) => ok(c) && countOf(c.id) === 1 && bonusOf(c.id) === 0).sort(byKeys(rank))
      const a = a1[0] ?? a2[0]
      if (a) take(a, 'ready')
      // B 神の個性：bonus 未取得・履歴外の専用札
      const b = exclusives.filter((c) => ok(c) && bonusOf(c.id) === 0).sort(byKeys(rank))[0]
      if (b) take(b, 'identity')
      // C 次の構築：デッキに無い共通札を相性順で（B が立てば 1 枚・立たなければ 2 枚）
      const cCount = b ? 1 : 2
      commons
        .filter((c) => ok(c) && countOf(c.id) === 0 && bonusOf(c.id) === 0)
        .sort(byKeys((c) => -affinityScore(c, ctx), rank))
        .slice(0, cCount)
        .forEach((c) => take(c, 'next'))
    }
    // 補充：未採用の共通札（デッキに無いものを先）
    commons
      .filter((c) => ok(c) && !hasSpareCap(c.id))
      .sort(byKeys((c) => (countOf(c.id) === 0 ? 0 : 1), rank))
      .slice(0, Math.max(0, REWARD_OFFER_SIZE - chosen.length))
      .forEach((c) => take(c, 'fill'))
  }

  const offered = new Set(history.offered)
  const declined = new Set(history.declined)
  run(new Set([...offered, ...declined]), true)
  // 手順 7：まだ 3 枚未満なら除外を declined → offered の順に外して補充だけ再実行
  if (chosen.length < REWARD_OFFER_SIZE) run(offered, false)
  if (chosen.length < REWARD_OFFER_SIZE) run(new Set(), false)
  // 手順 8：それでも足りなければ旧等確率の列を先頭から（pool が 3 枚以上なら必ず 3 枚になる）
  let legacyFallback = false
  if (chosen.length < REWARD_OFFER_SIZE) {
    legacyFallback = true
    for (const c of shuffled) {
      if (chosen.length >= REWARD_OFFER_SIZE) break
      if (free(c)) take(c, 'fill')
    }
  }

  return { candidates: chosen, hasIdentitySlot: chosen.some((c) => c.role === 'identity'), legacyFallback }
}
