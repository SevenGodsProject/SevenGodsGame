import type { GameAction, GameEvent, GameState } from '../types'
import { RULES } from '../data/rules'
import { getCardDef } from '../data/cards'
import { GOD_IDS } from '../data/gods'
import { createRng } from '../rng/seededRandom'
import { applyEffect, applyEffects, addScore } from './effects'
import { evaluateBonusCond } from './cardBonus'
import { passiveNominalAmount, resolveGodPassive } from './godPassive'

type PlayCardAction = Extract<GameAction, { type: 'PLAY_CARD' }>

/**
 * 手札からカードを1枚使います。
 *
 * プレイヤーが選べるのは「手札にある実際にAPを払えるカード」だけである前提で、
 * UI側が事前に絞り込みます。ここでの不正な呼び出し（手札に無い等）は
 * バグとして早期に落とします。
 */
export function playCard(
  state: GameState,
  action: PlayCardAction,
): { state: GameState; events: GameEvent[] } {
  if (state.status !== 'playing' || state.phase !== 'playerTurn') {
    throw new Error('今はカードを使えません')
  }

  const instance = state.hand.find((c) => c.uid === action.uid)
  if (!instance) {
    throw new Error(`手札にないカードです: ${action.uid}`)
  }

  const cardDef = getCardDef(instance.defId)
  const cost = cardDef.cost + (instance.costModifier ?? 0)
  if (cost > state.ap.current) {
    throw new Error(`神力が足りません: ${cardDef.name}（必要${cost} / 残り${state.ap.current}）`)
  }

  // BASE-D（決定109）：連携は逓減加点。このラウンドの1枚目は0点、
  // 2枚目以降はcomboSteps（12/8/4）、それを超える枚数はcomboOverflow（3）。
  // 線形加点（旧comboPerExtraCard）は「枚数を出すほど青天井」の枚数バイアスの
  // 主因だったため逓減へ変更した。
  const position = state.cardsPlayedThisRound // このカードを使う前の、ラウンド内使用済み枚数
  const comboBonus =
    position === 0 ? 0 : RULES.score.comboSteps[position - 1] ?? RULES.score.comboOverflow

  let next: GameState = {
    ...state,
    hand: state.hand.filter((c) => c.uid !== action.uid),
    discard: [...state.discard, instance],
    ap: { ...state.ap, current: state.ap.current - cost },
    cardsPlayedThisRound: state.cardsPlayedThisRound + 1,
    totalApSpent: state.totalApSpent + cost,
    score: addScore(state.score, 'combo', comboBonus),
  }

  const events: GameEvent[] = [
    { t: 'CARD_PLAYED', uid: instance.uid, defId: instance.defId, cost },
  ]
  if (comboBonus > 0) {
    events.push({ t: 'SCORE_GAINED', reason: 'combo', amount: comboBonus })
  }

  const rng = createRng(state.seed, state.rngCursor)

  // 福永Mastery「大勝負」G4集計（福永使用時のみ）：自傷カード
  // （効果に damage target:'self' を含むカード）が敵に与えた実効ダメージを
  // riskCardEffDamageへ積算する。カード名でなく効果データで判定する（不変ルール3）。
  // 効果を1つずつ適用し、damage target:'enemy'効果による敵HP減少分（＝block吸収・
  // overkill除外後の実効値）だけを数える。同カードが共鳴burstを誘発しても、
  // burst由来のダメージはdamage効果の外で起きるため混入しない。
  const isRiskCard =
    state.godId === GOD_IDS.fukuei &&
    cardDef.effects.some((e) => e.kind === 'damage' && e.target === 'self')
  if (isRiskCard) {
    for (const effect of cardDef.effects) {
      const enemyHpBefore = next.enemy.hp
      const result = applyEffect(next, effect, rng)
      next = result.state
      events.push(...result.events)
      if (effect.kind === 'damage' && effect.target === 'enemy') {
        const effective = enemyHpBefore - next.enemy.hp
        if (effective > 0) {
          next = {
            ...next,
            mastery: {
              ...next.mastery,
              riskCardEffDamage: next.mastery.riskCardEffDamage + effective,
            },
          }
        }
      }
    }
  } else {
    const result = applyEffects(next, cardDef.effects, rng)
    next = result.state
    events.push(...result.events)
  }

  // Phase 3 FINAL SPEC v0.1：カードの条件付き追加効果（bonus）。
  // 本体効果のあとに1回だけ条件を評価する。福永Masteryの`riskCardEffDamage`には
  // 本体効果分だけを数える（上のループの外なので、bonus由来のダメージは混入しない）。
  if (RULES.godIdentity.cardBonusEnabled && cardDef.bonus && next.status === 'playing') {
    if (evaluateBonusCond(cardDef.bonus.when, state, next)) {
      events.push({ t: 'BONUS_TRIGGERED', defId: cardDef.id, when: cardDef.bonus.when })
      const bonusResult = applyEffects(next, cardDef.bonus.effects, rng)
      next = bonusResult.state
      events.push(...bonusResult.events)
    }
  }

  // Phase 3 FINAL SPEC v0.1：神の得意技（afterPlay）。HP条件は「カードを使う前」の盤面で判定する
  // （回復カードで条件を満たしてから同じカードの攻撃部分を強化する、といった順序依存を作らない）。
  const passive = resolveGodPassive(state.godId)
  if (passive?.afterPlay && next.status === 'playing') {
    const extra = passive.afterPlay(state, next, cardDef)
    if (extra.length > 0) {
      events.push({
        t: 'PASSIVE_TRIGGERED',
        passiveId: passive.def.id,
        amount: passiveNominalAmount(extra),
      })
      const passiveResult = applyEffects(next, extra, rng)
      next = passiveResult.state
      events.push(...passiveResult.events)
    }
  }

  next = { ...next, rngCursor: state.rngCursor + rng.callCount() }
  return { state: next, events }
}
