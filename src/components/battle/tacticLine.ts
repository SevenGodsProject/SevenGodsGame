import type { Difficulty, EnemyActionScript, EnemyState } from '../../core/types'
import { tacticBranch } from '../../core/engine/tactic'

/**
 * 将軍家 Pilot v0.6（忠次 enemy_08 だけ・`docs/SHOGUNATE_V0_6_DESIGN_AUDIT.md` §1-3・表示専用）：
 * R3 の溜め中に名札へ出す「あと N で総攻めを止める」／「✓ 総攻めを止めた」の中身を決める。
 *
 * - N（remaining）は engine の分岐判定 `tacticBranch` と同じ関数で求める：
 *   「表示 HP から N 減らすと初めて then になる」最小の N。だから N === 0 ⇔ then（全 hp・全難易度でテスト固定）
 * - 判定は表示 HP（hpShown）＝予告の赤い輪（EnemyPanel の v0.4 分岐）と同じ値＝輪の消失と成功表示は同じ描画
 * - 出すのは「今の予告が溜め（charge）で、次の行動表が軍略（tactic）」のときだけ（＝忠次の R3）。それ以外は null
 */
export type TacticLine = { remaining: number; cleared: boolean }

/** then になる最大の HP（無ければ -1）。tacticBranch と同じ判定を下から探すので、浮動小数の丸めでずれない */
export function tacticThenMaxHp(script: EnemyActionScript, maxHp: number, difficulty: Difficulty): number {
  if (script.kind !== 'tactic') return -1
  let thenMax = -1
  for (let hp = 0; hp <= maxHp; hp++) {
    if (tacticBranch(script, hp, maxHp, difficulty) === 'then') thenMax = hp
    else break
  }
  return thenMax
}

export function tacticLine(
  intent: EnemyState['intent'] | undefined,
  nextScript: EnemyActionScript,
  hpShown: number,
  maxHp: number,
  difficulty: Difficulty,
): TacticLine | null {
  if (!intent || intent.kind !== 'charge' || nextScript.kind !== 'tactic') return null
  const thenMax = tacticThenMaxHp(nextScript, maxHp, difficulty)
  if (thenMax < 0) return null
  const remaining = Math.max(0, hpShown - thenMax)
  return { remaining, cleared: remaining === 0 }
}
