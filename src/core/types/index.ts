/**
 * 型のまとめ役。
 * 他のファイルからは `import type { CardDef } from '../types'` の形で使えます。
 */

export type { CardDefId, CardUid, GodId, OtomoId, EnemyId } from './ids'
export { cardDefId, cardUid, godId, otomoId, enemyId } from './ids'

export type { Difficulty } from './difficulty'

export type { StatKey, EffectTarget, Effect, EffectKind, Buff } from './effect'
export type { CardType, Rarity, CardDef, CardInstance } from './card'
export type { GodDef, GodArt, GodArchetype } from './god'
export type { OtomoDef, OtomoState, OtomoForm, OtomoArt, GrowthPath } from './otomo'
export { OTOMO_FORM_ORDER } from './otomo'
export type { EnemyActionDef, EnemyDef, EnemyStageDef, EnemyState, EnemyVisualType } from './enemy'
export type {
  RoundPhase,
  GameStatus,
  PlayerState,
  ScoreState,
  GameState,
} from './state'
export type { GameAction } from './action'
export type { GameEvent } from './event'
export type { DivinationChoice } from './divination'
