import type { CardDefId, CardUid } from './ids'
import type { EffectTarget } from './effect'
import type { GameStatus } from './state'
import type { OtomoForm } from './otomo'

/**
 * ゲーム内で「起きた出来事」の記録。
 *
 * ★これが core / React / Phaser を切り離す仕組みです。
 *
 * core は「何が起きたか」を報告するだけで、それをどう見せるかは知りません。
 * Phaser はこの出来事を見てエフェクトを再生し、React は数字を更新します。
 * 演出を全部作り直しても、ルールは一切影響を受けません。
 */
export type GameEvent =
  | { t: 'GAME_STARTED' }
  | { t: 'ROUND_STARTED'; round: number; apGranted: number }
  | { t: 'CARD_DRAWN'; uid: CardUid; defId: CardDefId }
  | { t: 'HAND_OVERFLOW'; discarded: CardUid[] }
  | { t: 'DECK_RESHUFFLED'; count: number }
  | { t: 'CARD_PLAYED'; uid: CardUid; defId: CardDefId; cost: number }
  | { t: 'DAMAGE_DEALT'; target: EffectTarget; amount: number; blocked: number }
  | { t: 'BLOCK_GAINED'; target: EffectTarget; amount: number }
  | { t: 'HEALED'; amount: number }
  | { t: 'RESONANCE_GAINED'; amount: number; total: number }
  /** 共鳴ゲージ満タン → 神が介入（決定8・10） */
  | { t: 'RESONANCE_BURST'; total: number }
  /** 共鳴発動のたびにOTOMOが成長する（決定19。精霊態→受肉態→童子） */
  | { t: 'OTOMO_EVOLVED'; form: OtomoForm }
  | { t: 'BUFF_APPLIED'; target: EffectTarget; stat: string; amount: number; rounds: number }
  /** label＝charge予告文またはspecial/multiAttackの技名（VFX層のカットイン文言用） */
  | { t: 'ENEMY_INTENT_SET'; kind: string; amount: number; label?: string }
  | { t: 'ENEMY_ACTED'; kind: string; amount: number; label?: string }
  | { t: 'SCORE_GAINED'; reason: string; amount: number }
  | { t: 'ROUND_ENDED'; round: number; unusedAp: number }
  | { t: 'GAME_ENDED'; status: GameStatus; totalScore: number }
  /** 託宣を使った（決定21） */
  | { t: 'DIVINATION_USED'; choiceIndex: number; remaining: number }
