import type { Effect, GameEvent, GameState, ScoreState } from '../types'
import { OTOMO_FORM_ORDER } from '../types/otomo'
import { RULES } from '../data/rules'
import { getGodDef } from '../data/gods'
import { getOtomoDef } from '../data/otomo'
import { performDraw } from './deck'
import { sumBuff } from './buffs'
import type { Rng } from '../rng/seededRandom'

export type EffectResult = { state: GameState; events: GameEvent[] }

/** スコアの1項目を加算し、totalにも同時に反映します */
export function addScore(
  score: ScoreState,
  field: Exclude<keyof ScoreState, 'total'>,
  amount: number,
): ScoreState {
  if (amount === 0) return score
  return { ...score, [field]: score[field] + amount, total: score.total + amount }
}

/**
 * 1つの効果をGameStateに適用します。
 *
 * ★不変ルール3：効果の種類ごとにここで処理を書きます。
 * カードや神は「どの効果を並べるか」だけを持ち、実際の計算はすべてここに集約されます。
 */
export function applyEffect(
  state: GameState,
  effect: Effect,
  rng: Rng,
): EffectResult {
  switch (effect.kind) {
    case 'damage': {
      // 敵への与ダメージのみ、自分の`atk`バフ/デバフ（決定25「姉御の号令」）を
      // 上乗せする。round.tsが敵の攻撃力に`atk`バフを反映する処理（決定4）と
      // 対になる、プレイヤー側の対応する処理（従来は保存されるだけで未消費だった）。
      if (effect.target === 'enemy') {
        const atkBuff = sumBuff(state.player.buffs, 'atk')
        return applyDamage(state, 'enemy', Math.max(0, effect.amount + atkBuff))
      }
      return applyDamage(state, effect.target, effect.amount)
    }

    case 'block': {
      const events: GameEvent[] = [
        { t: 'BLOCK_GAINED', target: 'self', amount: effect.amount },
      ]
      return {
        state: {
          ...state,
          player: { ...state.player, block: state.player.block + effect.amount },
        },
        events,
      }
    }

    case 'heal': {
      const healed = Math.min(
        effect.amount,
        state.player.maxHp - state.player.hp,
      )
      return {
        state: {
          ...state,
          player: { ...state.player, hp: state.player.hp + healed },
        },
        events: [{ t: 'HEALED', amount: healed }],
      }
    }

    case 'resonance':
      return applyResonance(state, effect.amount, rng)

    case 'draw':
      return performDraw(state, effect.amount, rng)

    case 'gainAp':
      return {
        state: { ...state, ap: { ...state.ap, current: state.ap.current + effect.amount } },
        events: [],
      }

    case 'buff':
    case 'debuff': {
      const signedAmount = effect.kind === 'buff' ? effect.amount : -effect.amount
      const buff = { stat: effect.stat, amount: signedAmount, remainingRounds: effect.rounds }
      const nextState: GameState =
        effect.target === 'enemy'
          ? { ...state, enemy: { ...state.enemy, buffs: [...state.enemy.buffs, buff] } }
          : { ...state, player: { ...state.player, buffs: [...state.player.buffs, buff] } }
      return {
        state: nextState,
        events: [
          {
            t: 'BUFF_APPLIED',
            target: effect.target,
            stat: effect.stat,
            amount: signedAmount,
            rounds: effect.rounds,
          },
        ],
      }
    }

    case 'score': {
      // BASE-D（決定109）：oracle/BURSTの`score`直接効果はBattle Scoreへ加算しない。
      // カード・神データの`score`効果定義自体は温存する（damage/draw等の他効果は
      // 通常どおり発生し、`score`だけがスコア集計に乗らない）。SCORE_GAINEDイベントも
      // 発行しない（獲得していないスコアをログに出すと嘘になるため）。
      return { state, events: [] }
    }
  }
}

/** 複数の効果を順番に適用します（カード1枚 / 神の一撃などで使用） */
export function applyEffects(
  state: GameState,
  effects: Effect[],
  rng: Rng,
): EffectResult {
  let current = state
  const events: GameEvent[] = []
  for (const effect of effects) {
    const result = applyEffect(current, effect, rng)
    current = result.state
    events.push(...result.events)
  }
  return { state: current, events }
}

export function applyDamage(
  state: GameState,
  target: 'enemy' | 'self',
  amount: number,
): EffectResult {
  if (target === 'enemy') {
    const blocked = Math.min(state.enemy.block, amount)
    const dealt = amount - blocked
    // BASE-D（決定109）：スコア・Masteryに数えるのは「実効ダメージ」のみ。
    // 敵の残りHPを超えた分（overkill）は敵HPには意味を持たず、加点もしない。
    const effective = Math.min(dealt, state.enemy.hp)
    const hp = Math.max(0, state.enemy.hp - dealt)
    const score = addScore(state.score, 'damage', effective * RULES.score.perDamage)

    // Mastery集計（決定110プロトタイプ）：1ラウンド実効ダメージの最大値を追跡する。
    // スコアとは完全分離（bestRoundDamageはtotalへ一切影響しない）。
    const roundDamage = state.mastery.roundDamage + effective
    const mastery = {
      roundDamage,
      bestRoundDamage: Math.max(state.mastery.bestRoundDamage, roundDamage),
    }

    const events: GameEvent[] = [
      { t: 'DAMAGE_DEALT', target: 'enemy', amount: dealt, blocked },
    ]
    if (effective > 0) {
      events.push({
        t: 'SCORE_GAINED',
        reason: 'damage',
        // perDamageが小数のため、ログ表示用イベントは四捨五入した値を出す
        // （score本体は正確な値で加算される）。
        amount: Math.round(effective * RULES.score.perDamage),
      })
    }

    let nextState: GameState = {
      ...state,
      enemy: { ...state.enemy, hp, block: state.enemy.block - blocked },
      score,
      mastery,
    }

    if (hp <= 0 && nextState.status === 'playing') {
      nextState = applyVictory(nextState)
    }

    return { state: nextState, events }
  }

  const blocked = Math.min(state.player.block, amount)
  const dealt = amount - blocked
  const hp = Math.max(0, state.player.hp - dealt)

  let nextState: GameState = {
    ...state,
    player: { ...state.player, hp, block: state.player.block - blocked },
  }
  if (hp <= 0 && nextState.status === 'playing') {
    nextState = { ...nextState, status: 'lost' }
  }

  return {
    state: nextState,
    events: [{ t: 'DAMAGE_DEALT', target: 'self', amount: dealt, blocked }],
  }
}

/**
 * 決定1・3＋BASE-D（決定109）：撃破時のボーナス。勝利時のみ、
 * 基礎点・逓減テンポ表・残HPボーナス・難易度補正（加算）を確定して勝利にする。
 * 敗北・未撃破ではこれらは一切加算されない。
 */
function applyVictory(state: GameState): GameState {
  const roundIndex = Math.min(Math.max(state.round, 1), RULES.totalRounds) - 1
  const tempo = RULES.score.tempoByRound[roundIndex] ?? 0
  const survival =
    state.player.maxHp > 0
      ? Math.round((state.player.hp / state.player.maxHp) * RULES.score.survivalMax)
      : 0
  const difficultyBonus = RULES.score.difficultyBonus[state.difficulty]

  let score = addScore(state.score, 'victory', RULES.score.victoryBase)
  score = addScore(score, 'tempo', tempo)
  score = addScore(score, 'survival', survival)
  score = addScore(score, 'difficultyBonus', difficultyBonus)
  return { ...state, status: 'won', score }
}

/** 決定8・10：共鳴ゲージが満タンになったら自動発動し、0にリセットする */
function applyResonance(
  state: GameState,
  amount: number,
  rng: Rng,
): EffectResult {
  const value = state.resonance.value + amount
  const events: GameEvent[] = [
    {
      t: 'RESONANCE_GAINED',
      amount,
      total: Math.min(value, state.resonance.max),
    },
  ]

  if (value < state.resonance.max) {
    return {
      state: { ...state, resonance: { ...state.resonance, value } },
      events,
    }
  }

  events.push({ t: 'RESONANCE_BURST', total: value })
  const godDef = getGodDef(state.godId)

  // 決定19：共鳴発動のたびにOTOMOが1段階成長する（精霊態→受肉態→童子）。
  // 童子まで成長したら、それ以上の発動では変化しない。
  const currentFormIndex = OTOMO_FORM_ORDER.indexOf(state.otomo.form)
  const nextForm = OTOMO_FORM_ORDER[currentFormIndex + 1]

  let burstState: GameState = {
    ...state,
    resonance: { ...state.resonance, value: 0 },
  }
  if (nextForm) {
    burstState = { ...burstState, otomo: { ...burstState.otomo, form: nextForm } }
    events.push({ t: 'OTOMO_EVOLVED', form: nextForm })
  }

  const godBurst = applyEffects(burstState, godDef.resonanceEffects, rng)
  events.push(...godBurst.events)

  // 決定19：OTOMOも、その時点の（進化後の）形態に応じた効果で発動に加わる。
  // 決定44：バトル開始時に選んだ絆（守り／力）で参照するテーブルを切り替える。
  const otomoDef = getOtomoDef(godBurst.state.otomo.defId)
  const otomoEffectTable =
    godBurst.state.otomoGrowthPath === 'power'
      ? otomoDef.powerPathEffectsByForm
      : otomoDef.effectsByForm
  const otomoBurst = applyEffects(
    godBurst.state,
    otomoEffectTable[godBurst.state.otomo.form],
    rng,
  )
  events.push(...otomoBurst.events)

  return { state: otomoBurst.state, events }
}
