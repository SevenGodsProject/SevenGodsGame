import type { CardDefId, GameAction, GameEvent, GameState } from '../types'
import { RULES } from '../data/rules'
import { validateDeck } from '../data/deckBuilder'
import { getEnemyDef } from '../data/enemies'
import { getGodDef } from '../data/gods'
import { getOtomoDef } from '../data/otomo'
import { createRng } from '../rng/seededRandom'
import { buildDeckInstances } from './deck'
import { startRound } from './round'
import { isStakeLevel, resolveStakeRules } from '../data/stakes'

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
  // DAILY-01：神域強化の追加倍率は難易度倍率に乗算し、1回だけ丸める。
  // 未指定（通常モード・既存テスト）は×1で従来と同じ値になる。
  const modifier = action.modifier
  // 決定126：神階の累積ルール（level 0＝恒等）。Dailyでは指定されない
  const stake = isStakeLevel(action.stake) ? action.stake : 0
  const stakeRules = resolveStakeRules(stake, action.stakeChoice)
  const enemyMaxHp = Math.round(
    enemyDef.maxHp * preset.enemyHpMultiplier * (modifier?.enemyHpMul ?? 1) * stakeRules.enemyHpMul,
  )

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
    // DAILY-01：モードとDaily補正をstateに持たせる（毎ラウンドの敵行動倍率・
    // 期限切れセーブ判定・決着時の記録先の分岐が、保存/再開後もこれを参照する）
    mode: action.mode ?? 'normal',
    ...(action.dailyKey ? { dailyKey: action.dailyKey } : {}),
    ...(modifier ? { modifier } : {}),
    ...(stake > 0 ? { stake, ...(action.stakeChoice ? { stakeChoice: action.stakeChoice } : {}) } : {}),
    otomoGrowthPath: action.otomoGrowthPath ?? 'guardian',
    resonance: { value: 0, max: RULES.resonance.max },
    divination: { remaining: stakeRules.divinationCount, usedThisRound: false },

    deck: shuffledDeck,
    hand: [],
    discard: [],
    exhausted: [],

    score: {
      damage: 0,
      combo: 0,
      victory: 0,
      tempo: 0,
      survival: 0,
      difficultyBonus: 0,
      legacy: 0,
      total: 0,
    },
    mastery: {
      roundDamage: 0,
      bestRoundDamage: 0,
      attackCount: 0,
      reductionRateSum: 0,
      strongNeutralized: false,
      guardAttackCount: 0,
      fullyBlockedCount: 0,
      // 福永「大勝負」（G4 prototype）：最低HPは満タンで開始（無傷ならraw=0）
      minHp: playerMaxHp,
      riskCardEffDamage: 0,
    },

    cardsPlayedThisRound: 0,
    totalApGranted: 0,
    totalApSpent: 0,
  }

  const events: GameEvent[] = [{ t: 'GAME_STARTED' }]

  const firstRound = startRound(base, rng, Math.max(1, RULES.deck.initialHand - stakeRules.initialHandMinus))
  const state: GameState = { ...firstRound.state, rngCursor: rng.callCount() }
  events.push(...firstRound.events)

  return { state, events }
}
