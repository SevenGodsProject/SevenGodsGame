import type { GodId, EnemyId } from '../../core/types'
import { GODS } from '../../core/data/gods'
import { getEnemyDef } from '../../core/data/enemies'
import { MATCHUP_ENEMIES, MATCHUP_GODS, MATCHUP_TOTAL, type MatchupClearResult } from '../../hooks/matchupStorage'

/**
 * Phase 7 P2（決定189・仕様 §9）：結果画面に出す「初撃破」の 1 行。
 *
 * - この勝利で初めて点灯したときだけ文言を返す（同じ組み合わせの 2 勝目以降・記録できなかったときは null）
 * - 1 行だけ。上から優先：49/49 → その神で 7/7 敵 → その敵を 7/7 神 → 初撃破
 * - 母数 49 は節目の 49/49 以外では出さない（New Player に「49 個やらされる」と感じさせないため）。
 *   初撃破では「この敵を何柱で倒したか」だけを添える（仕様 §2「この敵を別の神で」）
 * - 報酬・演出・ポップアップは伴わない（純粋な文言）
 */
export function describeMatchupClear(result: MatchupClearResult | null): string | null {
  if (!result || !result.isFirstClear) return null
  const godName = godNameOf(result.godId)
  const enemyName = enemyNameOf(result.enemyId)
  if (result.totalCleared >= MATCHUP_TOTAL) return '✨ 四十九の組み合わせをすべて攻略'
  if (result.godClearedCount >= MATCHUP_ENEMIES.length) return `✨ ${godName}で七体すべての敵を撃破`
  if (result.enemyClearedCount >= MATCHUP_GODS.length) return `✨ ${enemyName}を七柱すべてで撃破`
  return `✨ 初撃破：${godName} × ${enemyName}（この敵 ${result.enemyClearedCount}/${MATCHUP_GODS.length} 神）`
}

function godNameOf(godId: GodId): string {
  return GODS.find((g) => g.id === godId)?.nameJa ?? ''
}

function enemyNameOf(enemyId: EnemyId): string {
  try {
    return getEnemyDef(enemyId).name
  } catch {
    return ''
  }
}
