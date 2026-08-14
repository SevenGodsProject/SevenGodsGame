import type { CardDef, CardDefId, CardType, GodId } from '../types'
import { RULES } from './rules'
import { ALL_CARDS, getCardDef } from './cards'
import { STARTER_DECK } from './decks'
import { DEFAULT_GOD_ID, GOD_IDS } from './gods'

/**
 * デッキ構築（決定24、Phase 5）。
 *
 * CEO確認済みの方針：選べるカードは「共通カード＋選んだ神の専用カード」のみ
 * （他の神の専用カードは使えない）。デッキ枚数は決定12の20枚を維持し、
 * 同じカードは`RULES.deckBuilding.maxCopiesPerCard`枚まで編成できる。
 */

/** その神で編成に使えるカードの一覧（共通カード＋その神の専用カード） */
export function getCardPoolForGod(godId: GodId): CardDef[] {
  return ALL_CARDS.filter((card) => !card.godId || card.godId === godId)
}

export type DeckValidation = { valid: boolean; errors: string[] }

/**
 * そのカードの編成上限（決定43：報酬カードで+1ずつ積み上がる。省略時は基準値のみ）。
 */
export function getMaxCopies(cardId: CardDefId, bonusCopies?: Map<CardDefId, number>): number {
  return RULES.deckBuilding.maxCopiesPerCard + (bonusCopies?.get(cardId) ?? 0)
}

/**
 * デッキ編成が有効かを検証します。
 * UI側（デッキ構築画面）が事前に絞り込む前提ですが、playCard.tsと同じ方針で
 * createInitialStateでも呼び、不正な構成はバグとして早期に落とします。
 *
 * `bonusCopies`は決定43の報酬カード（カードごとの追加編成上限）。省略時は
 * ボーナス無しとして扱うため、既存の呼び出し元は変更不要。
 */
export function validateDeck(
  cardIds: CardDefId[],
  godId: GodId,
  bonusCopies?: Map<CardDefId, number>,
): DeckValidation {
  const errors: string[] = []

  if (cardIds.length !== RULES.deck.size) {
    errors.push(`デッキは${RULES.deck.size}枚にしてください（現在${cardIds.length}枚）`)
  }

  const pool = new Set(getCardPoolForGod(godId).map((c) => c.id))
  const counts = new Map<CardDefId, number>()
  for (const id of cardIds) {
    if (!pool.has(id)) {
      errors.push(`このデッキでは使えないカードです: ${getCardDef(id).name}`)
    }
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  for (const [id, count] of counts) {
    const max = getMaxCopies(id, bonusCopies)
    if (count > max) {
      errors.push(`「${getCardDef(id).name}」は${max}枚まで編成できます（現在${count}枚）`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 共通カードを補充する際に見る種別の順序。
 *
 * 決定45で専用カード2枚化を試した際、`attack`→`guard`→...→`oracle`の順で
 * 単純に枠を埋めていくと、専用カードの投入で早い種別（attack・guard等）が
 * 目標を超過したときにその超過分が後続の種別を圧迫し、**最後に処理される
 * `oracle`（神託・予言など、1AP当たりの価値が高いカード群）が丸ごと0枚に
 * なる**というバグを引き起こしていた（後述の予算チェックが無かったため、
 * ループ末尾の`.slice(0, 20)`で静かに切り捨てられていた）。`oracle`を
 * `attack`の直後に繰り上げることで、専用カードが多い神でも神託・予言が
 * 消えにくくした。
 */
const TYPE_ORDER: CardType[] = ['attack', 'oracle', 'resonance', 'support', 'guard', 'hinder']

/**
 * 20枚デッキの理想的な種別内訳（決定26）。
 * 元はSTARTER_DECK（決定12・decks.tsの選定方針コメント）の内訳「攻撃7・防御3・
 * 共鳴2・支援4・妨害2・神託2」をそのまま流用していたが、共鳴2枚（+2〜+3程度）
 * では共鳴ゲージ最大7に届きにくく、防御寄りの専用カードを持つ神（蒼毘・寿楽・
 * 笑蓮）で共鳴発動が一度も起きないままダメージ不足に陥ることが判明したため、
 * 妨害を1枚減らして共鳴を1枚増やした（合計20は変更なし）。
 */
const TARGET_TYPE_COUNT: Record<CardType, number> = {
  attack: 7,
  guard: 3,
  resonance: 3,
  support: 4,
  hinder: 1,
  oracle: 2,
}

/**
 * おすすめデッキで専用カードを何枚ずつ採用するか（決定45）。
 *
 * CEOフィードバック「専用カードが4/20＝20%しかなく、共通カードが大半を
 * 占めるため神ごとの違いが感じにくい」への対応。
 *
 * 【経緯・2段階の調査】
 * ①最初に全神一律2枚化を試したところ、`balanceSim.test.ts`で蒼毘が全敵・
 * 全戦略で勝率0%に崩壊した。1戦ステップ実行で調べると、真因は「専用カード
 * の投入で種別の目標を超過し、その超過分が`TYPE_ORDER`の後ろの方（特に
 * 高価値な`oracle`＝神託・予言）を丸ごと押し出す」という`getRecommendedDeck`
 * 側のアルゴリズムの穴だった（`TYPE_ORDER`のコメント参照）。ここを修正。
 * ②アルゴリズム修正後に全神一律2枚で再検証すると、全滅は解消したものの、
 * **蒼毘・寿楽・笑蓮（決定26で「防御・支援寄りの専用カードを持つ神」と
 * 名指しされた3神）だけ、`defensive`戦略が全敵で勝率0%のまま**残った。
 * 再度ステップ実行で確認すると、この3神は専用カードの大半が非ダメージ
 * （防御・回復・妨害）のため、コピーを増やすほど「防御札を優先し、余った
 * 神力だけ攻撃に回す」という`defensive`AIの意思決定が防御によりAPを
 * 使い切ってしまい、7ラウンドで倒し切れなくなる。これはアルゴリズムの
 * バグではなく、専用カードの中身そのものに起因する実質的なバランス問題
 * のため、**この3神だけ1枚のまま据え置き**、残る4神（恵比寿はSTARTER_DECK
 * 固定なので対象外・大耀・才華・福永）を2枚に引き上げる非対称な方式にした。
 * `balanceSim.test.ts`で7神×7敵×3戦略が0%・未撃破100%に陥らないことを確認済み。
 */
const REDUCED_EXCLUSIVE_COPY_GODS = new Set<GodId>([GOD_IDS.sobi, GOD_IDS.juraku, GOD_IDS.shouren])

function recommendedExclusiveCopies(godId: GodId): number {
  return REDUCED_EXCLUSIVE_COPY_GODS.has(godId) ? 1 : 2
}

/**
 * 「おすすめデッキ」を1つ生成します。
 *
 * 恵比寿は決定12で確定済みのSTARTER_DECK（32種から選び抜いた20種）をそのまま使う。
 * 他の6神は決定25で専用カード4種が用意されたため、まずそれを
 * `recommendedExclusiveCopies(godId)`枚ずつ採用して神の個性を必ず体験できるように
 * した上で、残り枠は`TARGET_TYPE_COUNT`から専用カードの投入分を差し引いた
 * 不足分を種別ごとに共通カードで埋める。
 *
 * 決定26のバランスシミュレーションで、防御・支援寄りの専用カードを持つ神
 * （蒼毘・寿楽・笑蓮）だけ攻撃カードが極端に少ない構成になり、7ラウンドで
 * 敵を倒しきれず全戦略で未撃破という致命的な事態を検出したため、単純な
 * ラウンドロビン（種別を均等に1枚ずつ拾う）から目標比率ベースの構成に変更した。
 * 単純なラウンドロビンだと巡回が浅く終わり（20枚に達するまで3巡程度）、
 * 種別ごとの共通カード数の違い（攻撃8種 vs 妨害4種など）を無視して
 * 「均等に少しずつ」しか採用できず、結果的に攻撃カードの絶対数が不足していた。
 */
export function getRecommendedDeck(godId: GodId): CardDefId[] {
  if (godId === DEFAULT_GOD_ID) {
    return [...STARTER_DECK]
  }

  const pool = getCardPoolForGod(godId)
  const exclusive = pool.filter((c) => c.godId === godId)
  const commonPool = pool.filter((c) => !c.godId)

  const exclusiveCopies = recommendedExclusiveCopies(godId)
  const remainingByType = new Map<CardType, number>(
    TYPE_ORDER.map((type) => [type, TARGET_TYPE_COUNT[type]]),
  )
  for (const card of exclusive) {
    const current = remainingByType.get(card.type) ?? 0
    remainingByType.set(card.type, Math.max(0, current - exclusiveCopies))
  }

  const deck: CardDefId[] = exclusive.flatMap((c) => Array(exclusiveCopies).fill(c.id))
  for (const type of TYPE_ORDER) {
    // 専用カードの投入で既に20枚に近い/超えている場合、後続の種別を0枚に
    // 静かに切り捨てるのではなく、その時点の残り予算まで縮めて公平に埋める
    const remainingBudget = RULES.deck.size - deck.length
    if (remainingBudget <= 0) break
    const need = Math.min(remainingByType.get(type) ?? 0, remainingBudget)
    const candidates = commonPool.filter((c) => c.type === type).map((c) => c.id)
    deck.push(...candidates.slice(0, need))
  }

  // 目標比率の合計が20に届かない場合の保険：種別を問わず未採用の共通カードで埋める
  if (deck.length < RULES.deck.size) {
    const used = new Set(deck)
    for (const card of commonPool) {
      if (deck.length >= RULES.deck.size) break
      if (!used.has(card.id)) {
        deck.push(card.id)
        used.add(card.id)
      }
    }
  }

  return deck.slice(0, RULES.deck.size)
}
