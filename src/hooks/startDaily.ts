import type { BattleModifier, Difficulty, EnemyId, GameMode } from '../core/types'
import { RULES } from '../core/data/rules'
import { dailyBossFor } from '../core/data/dailyBoss'

export type DailyStart = {
  mode: GameMode
  dailyKey: string
  enemyId: EnemyId
  seed: string
  difficulty: Difficulty
  modifier: BattleModifier
}

/**
 * DAILY-01：神域挑戦のSTART_GAME材料を日付キーだけから確定する純関数。
 *
 * `resolveStartEnemyId`（通常モード）と違い、URLバックドア`?enemy=`・プレイヤーの
 * 敵選択・難易度選択は**一切参照しない**。全員が同じ敵・同じseed・同じ補正で
 * 戦うことがモードの前提であり、ここで例外を作ると「共通条件」が崩れるため。
 * 引数に`forcedId`等を受け取らない設計そのものが、無効化の実装になっている。
 */
export function resolveDailyStart(dailyKey: string): DailyStart {
  const boss = dailyBossFor(dailyKey)
  return {
    mode: 'daily',
    dailyKey,
    enemyId: boss.enemyId,
    seed: boss.seed,
    difficulty: 'normal',
    modifier: { ...RULES.daily.modifier },
  }
}
