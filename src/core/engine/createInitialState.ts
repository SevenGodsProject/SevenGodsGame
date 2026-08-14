import type { CardDefId, GameAction, GameEvent, GameState } from '../types'
import { RULES } from '../data/rules'
import { validateDeck } from '../data/deckBuilder'
import { getEnemyDef } from '../data/enemies'
import { getGodDef } from '../data/gods'
import { getOtomoDef } from '../data/otomo'
import { createRng } from '../rng/seededRandom'
import { buildDeckInstances } from './deck'
import { startRound } from './round'

type StartGameAction = Extract<GameAction, { type: 'START_GAME' }>

/**
 * START_GAME を受けて、最初のGameStateを作ります。
 * 決定11：初期手札は5枚（通常ラウンドの2枚とは別枠）。
 */
export function createInitialState(
  action: StartGameAction,
): { state: GameState; events: GameEvent[] } {
  const rng = createRng(action.seed, 0)

  const godDef = getGodDef(action.godId)
  const otomoDef = getOtomoDef(godDef.otomoId)
  const enemyDef = getEnemyDef(action.enemyId)

  // 決定39：難易度は敵HP・敵攻撃力・プレイヤー最大HPの3項目だけを動かす。
  // 未指定（既存の呼び出し元・テスト）は'normal'＝倍率1・補正0で、これまでの
  // 検証済みバランス（決定21・26・36）と完全に一致する。
  const difficulty = action.difficulty ?? 'normal'
  const preset = RULES.difficulty[difficulty]
  const playerMaxHp = RULES.player.maxHp + preset.playerMaxHpBonus
  const enemyMaxHp = Math.round(enemyDef.maxHp * preset.enemyHpMultiplier)

  // 決定24：デッキの有効性はデッキ構築画面が事前に絞り込む前提だが、
  // playCard.tsと同じ方針で、ここでも不正な構成はバグとして早期に落とす。
  // 決定43：報酬カードの追加編成上限も、UIと同じ判定基準にするためここで渡す。
  const bonusCopies = new Map(Object.entries(action.bonusCopies ?? {}) as [CardDefId, number][])
  const deckCheck = validateDeck(action.deck, action.godId, bonusCopies)
  if (!deckCheck.valid) {
    throw new Error(`デッキが不正です: ${deckCheck.errors.join(' / ')}`)
  }

  const shuffledDeck = rng.shuffle(buildDeckInstances(action.deck))

  const base: GameState = {
    version: RULES.saveVersion,
    seed: action.seed,
    rngCursor: 0,

    round: 1,
    phase: 'roundStart',
    status: 'playing',

    ap: { current: 0, max: 0 },

    player: {
      hp: playerMaxHp,
      maxHp: playerMaxHp,
      block: 0,
      buffs: [],
    },
    enemy: {
      defId: enemyDef.id,
      name: enemyDef.name,
      hp: enemyMaxHp,
      maxHp: enemyMaxHp,
      block: 0,
      buffs: [],
      intent: null,
    },
    otomo: {
      defId: otomoDef.id,
      name: otomoDef.name,
      form: 'spirit',
    },

    godId: godDef.id,
    difficulty,
    otomoGrowthPath: action.otomoGrowthPath ?? 'guardian',
    resonance: { value: 0, max: RULES.resonance.max },
    divination: { remaining: RULES.divination.count, usedThisRound: false },

    deck: shuffledDeck,
    hand: [],
    discard: [],
    exhausted: [],

    score: {
      damage: 0,
      combo: 0,
      apEfficiency: 0,
      roundBonus: 0,
      oracleBonus: 0,
      total: 0,
    },

    cardsPlayedThisRound: 0,
    totalApGranted: 0,
    totalApSpent: 0,
  }

  const events: GameEvent[] = [{ t: 'GAME_STARTED' }]

  const firstRound = startRound(base, rng, RULES.deck.initialHand)
  const state: GameState = { ...firstRound.state, rngCursor: rng.callCount() }
  events.push(...firstRound.events)

  return { state, events }
}
