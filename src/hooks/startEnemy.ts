import type { EnemyId } from '../core/types'
import { pickEnemyId } from '../core/data/enemies'

/**
 * LANE-D（Enemy Select）：バトル開始時に対戦する敵を1体に確定する純関数。
 *
 * 優先順位（CEO GO済み仕様）：
 *   1. URLバックドア `?enemy=`（決定40のプレイテスト用。開発者の明示指定が最優先）
 *   2. プレイヤーがEnemy Select画面で選んだ敵
 *   3. シード選出＝既存`pickEnemyId(seed)`（「神に委ねる」を選んだ／何も選ばなかった場合。
 *      従来のランダム相当の挙動と完全に同一）
 *
 * useGameEngineから切り出した理由：window.locationに依存しない純関数にすることで、
 * 「敵Aを選んだのに敵Bが出る」事故をNode環境のvitestで直接検証できるようにするため
 * （URL解析は従来どおりuseGameEngine側の`resolveForcedEnemyId`が担当する）。
 */
export function resolveStartEnemyId(
  forcedId: EnemyId | null,
  selectedId: EnemyId | null | undefined,
  seed: string,
): EnemyId {
  return forcedId ?? selectedId ?? pickEnemyId(seed)
}
