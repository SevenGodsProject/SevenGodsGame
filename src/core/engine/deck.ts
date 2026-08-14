import type { CardDefId, CardInstance, GameEvent, GameState } from '../types'
import { cardUid } from '../types/ids'
import { RULES } from '../data/rules'
import type { Rng } from '../rng/seededRandom'

/**
 * デッキ定義（CardDefIdの配列）から、盤面で扱う実体（CardInstance）を作ります。
 * uidは作成時の並び順で振るため、この時点では乱数を消費しません
 * （シャッフルは別途 rng.shuffle で行う）。
 */
export function buildDeckInstances(defIds: CardDefId[]): CardInstance[] {
  return defIds.map((defId, index) => ({
    uid: cardUid(`c${index}`),
    defId,
  }))
}

export type DrawResult = {
  hand: CardInstance[]
  deck: CardInstance[]
  discard: CardInstance[]
  drawn: CardInstance[]
  reshuffled: boolean
}

/**
 * 山札からcount枚引きます。
 * 決定14：山札が尽きたら捨札をシャッフルして山札に戻します。
 * 捨札も尽きていたら、そこで引くのをやめます（無限ループ防止）。
 */
export function drawCards(
  deck: CardInstance[],
  discard: CardInstance[],
  hand: CardInstance[],
  count: number,
  rng: Rng,
): DrawResult {
  let workingDeck = [...deck]
  let workingDiscard = [...discard]
  const drawn: CardInstance[] = []
  let reshuffled = false

  for (let i = 0; i < count; i++) {
    if (workingDeck.length === 0) {
      if (workingDiscard.length === 0) break
      workingDeck = rng.shuffle(workingDiscard)
      workingDiscard = []
      reshuffled = true
    }
    const [card, ...rest] = workingDeck
    drawn.push(card)
    workingDeck = rest
  }

  return {
    hand: [...hand, ...drawn],
    deck: workingDeck,
    discard: workingDiscard,
    drawn,
    reshuffled,
  }
}

/**
 * ラウンド開始時のドローと、カード効果によるドローの両方から使う共通処理。
 * 山札切れの再シャッフルと、手札上限超過分の捨札送りをまとめて行います（決定13・14）。
 */
export function performDraw(
  state: GameState,
  count: number,
  rng: Rng,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []
  const result = drawCards(state.deck, state.discard, state.hand, count, rng)

  let hand = result.hand
  let discard = result.discard

  for (const c of result.drawn) {
    events.push({ t: 'CARD_DRAWN', uid: c.uid, defId: c.defId })
  }
  if (result.reshuffled) {
    events.push({ t: 'DECK_RESHUFFLED', count: result.deck.length })
  }

  if (hand.length > RULES.deck.handLimit) {
    const overflow = hand.slice(RULES.deck.handLimit)
    hand = hand.slice(0, RULES.deck.handLimit)
    discard = [...discard, ...overflow]
    events.push({
      t: 'HAND_OVERFLOW',
      discarded: overflow.map((c) => c.uid),
    })
  }

  return {
    state: { ...state, deck: result.deck, discard, hand },
    events,
  }
}
