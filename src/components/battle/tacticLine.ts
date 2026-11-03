import type { Difficulty, EnemyActionScript, EnemyState } from '../../core/types'
import { tacticBranch, tacticResonanceNeeded, tacticRoundDamageNeeded } from '../../core/engine/tactic'

/**
 * 将軍家 Pilot v0.6（忠次 enemy_08 だけ・`docs/SHOGUNATE_V0_6_DESIGN_AUDIT.md` §1-3・表示専用）：
 * R3 の溜め中に名札へ出す「あと N で総攻めを止める」／「✓ 総攻めを止めた」の中身を決める。
 *
 * - N（remaining）は engine の分岐判定 `tacticBranch` と同じ関数で求める：
 *   「表示 HP から N 減らすと初めて then になる」最小の N。だから N === 0 ⇔ then（全 hp・全難易度でテスト固定）
 * - 判定は表示 HP（hpShown）＝予告の赤い輪（EnemyPanel の v0.4 分岐）と同じ値＝輪の消失と成功表示は同じ描画
 * - 出すのは「今の予告が溜め（charge）で、次の行動表が軍略（tactic）」のときだけ（＝忠次の R3）。それ以外は null
 */
export type TacticLine = { remaining: number; cleared: boolean; gauge?: 'resonance' }

/**
 * W2：文言は行動表から導く（表示のみ）。else 側の必殺名「軍略・総攻め」→「総攻め」のように「・」の後ろを使う。
 * 忠次型：「あと N で総攻めを止める」／「✓ 総攻めを止めた」。康政型：「あと N で采配を崩す」／「✓ 采配を崩した」（残りは『この R の与ダメージ』）
 */
export function tacticLineWords(script: EnemyActionScript): { armed: string; cleared: string } {
  if (script.kind !== 'tactic') return { armed: '', cleared: '' }
  if (script.cond.type === 'roundDamageAtLeast') return { armed: '采配を崩す', cleared: '✓ 采配を崩した' }
  // W4 ドーマン型：R4「逆さ五重塔」・R7「逆さ五重塔・反転」のどちらも「五重塔を止める」（残りは『共鳴ゲージの不足分』）
  if (script.cond.type === 'resonanceAtLeast') return { armed: '五重塔を止める', cleared: '✓ 五重塔を止めた' }
  const name = script.else.kind === 'special' || script.else.kind === 'multiAttack' ? (script.else.name ?? '') : ''
  const seg = name.includes('・') ? name.slice(name.indexOf('・') + 1) : name || '必殺'
  return { armed: `${seg}を止める`, cleared: `✓ ${seg}を止めた` }
}

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
  roundDamage = 0,
  resonance = 0,
  resonanceMax = 0,
): TacticLine | null {
  if (!intent || intent.kind !== 'charge' || nextScript.kind !== 'tactic') return null
  // W4 ドーマン型：残り＝「then に必要な共鳴ゲージ − 今のゲージ」（engine の tacticBranch と同じ needed）。ゲージが満タンで発動して 0 に戻れば行は armed に戻る
  if (nextScript.cond.type === 'resonanceAtLeast') {
    const needed = tacticResonanceNeeded(nextScript, resonanceMax, difficulty)
    if (!Number.isFinite(needed)) return null
    const remaining = Math.max(0, needed - resonance)
    return { remaining, cleared: remaining === 0, gauge: 'resonance' }
  }
  // W2 康政型：残り＝「then に必要な 1 ラウンド実効ダメージ − この R で与えた実効ダメージ」（engine の tacticBranch と同じ needed・同じ roundDamage）
  if (nextScript.cond.type === 'roundDamageAtLeast') {
    const needed = tacticRoundDamageNeeded(nextScript, maxHp, difficulty)
    if (!Number.isFinite(needed)) return null
    const remaining = Math.max(0, needed - roundDamage)
    return { remaining, cleared: remaining === 0 }
  }
  const thenMax = tacticThenMaxHp(nextScript, maxHp, difficulty)
  if (thenMax < 0) return null
  const remaining = Math.max(0, hpShown - thenMax)
  return { remaining, cleared: remaining === 0 }
}
