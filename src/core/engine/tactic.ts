import type { EnemyActionDef, EnemyActionScript, EnemyTacticDef } from '../types/index.js'

/**
 * Threat Branch Pilot v1（軍略・`docs/LANE1_THREAT_BRANCH_PILOT_V1.md`。機構は決定274 忠次「軍略」から移植）：
 * 行動表の条件分岐 `tactic` を、ラウンド開始時の敵 HP 比で then／else のどちらかの確定行動へ解決する。
 *
 * - 乱数 0（seed 以外の入力は敵 HP 比だけ。決定不変ルール 2）
 * - 解決後の行動は既存 4 kind（attack／charge／multiAttack／special）のみ。
 *   `EnemyState.intent` に `tactic` が入ることはない（save v9 不変・UI の予告書式は不変）
 * - 予告は従来どおり 1 手先：解決はそのラウンドの開始時（`round.ts` `nextEnemyAction`）に 1 回だけ行い、
 *   実行（`runEnemyTurn`）は `state.enemy.intent` をそのまま使う＝予告と実行は常に一致する
 * - 「以下」（`<=`）で判定する。maxHp 94・ratio 0.5 なら HP 47 以下で then
 */
export function tacticBranch(tactic: EnemyTacticDef, enemyHp: number, enemyMaxHp: number): 'then' | 'else' {
  const ratio = enemyMaxHp > 0 ? enemyHp / enemyMaxHp : 1
  return ratio <= tactic.cond.ratio ? 'then' : 'else'
}

export function resolveEnemyTactic(script: EnemyActionScript, enemyHp: number, enemyMaxHp: number): EnemyActionDef {
  if (script.kind !== 'tactic') return script
  return tacticBranch(script, enemyHp, enemyMaxHp) === 'then' ? script.then : script.else
}
