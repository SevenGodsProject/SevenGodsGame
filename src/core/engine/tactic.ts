import type { Difficulty, EnemyActionDef, EnemyActionScript, EnemyTacticDef } from '../types/index.js'

/**
 * Threat Branch Pilot v1（軍略・`docs/LANE1_THREAT_BRANCH_PILOT_V1.md`。機構は決定274 忠次「軍略」から移植）：
 * 行動表の条件分岐 `tactic` を、ラウンド開始時の敵 HP 比で then／else のどちらかの確定行動へ解決する。
 *
 * - 乱数 0（seed 以外の入力は敵 HP 比と難易度だけ。決定不変ルール 2）
 * - 解決後の行動は既存 4 kind（attack／charge／multiAttack／special）のみ。
 *   `EnemyState.intent` に `tactic` が入ることはない（save v9 不変・UI の予告書式は不変）
 * - 予告は従来どおり 1 手先：解決はそのラウンドの開始時（`round.ts` `nextEnemyAction`）に 1 回だけ行い、
 *   実行（`runEnemyTurn`）は `state.enemy.intent` をそのまま使う＝予告と実行は常に一致する
 * - 「以下」（`<=`）で判定する。maxHp 94・ratio 0.5 なら HP 47 以下で then
 * - Pilot v1.1（`docs/LANE1_THREAT_BRANCH_PILOT_V1_1.md` §3・§5）：しきい値は難易度別。`cond.ratioByDifficulty[difficulty]`
 *   があればそれ、無ければ `cond.ratio`。値は敵データが `RULES.enemyTactic` から埋め込む（ここで RULES は読まない＝
 *   CORE 敵が使えば gameVersion の指紋（CORE_ENEMIES）に自動で入る）。hard は maxHp 108・0.6 → HP 64 以下で then
 */
export function tacticRatio(tactic: EnemyTacticDef, difficulty: Difficulty): number {
  return tactic.cond.ratioByDifficulty?.[difficulty] ?? tactic.cond.ratio
}

export function tacticBranch(tactic: EnemyTacticDef, enemyHp: number, enemyMaxHp: number, difficulty: Difficulty): 'then' | 'else' {
  const ratio = enemyMaxHp > 0 ? enemyHp / enemyMaxHp : 1
  return ratio <= tacticRatio(tactic, difficulty) ? 'then' : 'else'
}

export function resolveEnemyTactic(script: EnemyActionScript, enemyHp: number, enemyMaxHp: number, difficulty: Difficulty): EnemyActionDef {
  if (script.kind !== 'tactic') return script
  return tacticBranch(script, enemyHp, enemyMaxHp, difficulty) === 'then' ? script.then : script.else
}
