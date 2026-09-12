/**
 * 型のまとめ役。
 * 他のファイルからは `import type { CardDef } from '../types/index.js'` の形で使えます。
 */

export type { CardDefId, CardUid, GodId, OtomoId, EnemyId } from './ids.js'
export { cardDefId, cardUid, godId, otomoId, enemyId } from './ids.js'

export type { Difficulty } from './difficulty.js'

export type { StatKey, EffectTarget, Effect, EffectKind, Buff } from './effect.js'
export type { CardType, Rarity, CardDef, CardInstance, BonusCond, CardBonus } from './card.js'
export type { GodDef, GodArt, GodArchetype, GodPassive, GodPassiveId } from './god.js'
export type { OtomoDef, OtomoState, OtomoForm, OtomoArt, GrowthPath } from './otomo.js'
export { OTOMO_FORM_ORDER } from './otomo.js'
export type { EnemyActionDef, EnemyDef, EnemyStageDef, EnemyState, EnemyVisualType } from './enemy.js'
export type {
  RoundPhase,
  GameStatus,
  PlayerState,
  ScoreState,
  GameState,
  GameMode,
  BattleModifier,
  StakeChoiceId,
 } from './state.js'
export type { GameAction } from './action.js'
export type { GameEvent } from './event.js'
export type { DivinationChoice } from './divination.js'
