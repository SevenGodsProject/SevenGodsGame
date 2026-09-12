import type { DivinationChoice } from '../types/index.js'
import { RULES } from './rules.js'

/** 表示用：ratio を「40%」のような文字に（倍率対象外。割合そのもの） */
const guardPercent = Math.round(RULES.divination.guardRatio * 100)
/** 表示用：最低保証（内部値×10） */
const guardMinDisplay = RULES.divination.guardMin * 10

/**
 * 託宣の3択（決定21）。
 *
 * AP消費なし・1ラウンド1回・1ゲーム7回まで使える別枠のリソース。
 * カード経済の外側に乗る完全な追加リターンのため、1回あたりの価値は
 * カードよりかなり低く抑えている（自動シミュレーターで検証済み。
 * 最大7ラウンド×7回まで積み上がる前提で数値を決めること）。
 */
export const DIVINATION_CHOICES: DivinationChoice[] = [
  {
    name: '加護の託宣',
    // Phase 5-D（決定157）：予告を見て使う「受けの床」に一本化した（旧：HP30回復＋ブロック20）。
    // 大技の前ほど厚くなり、小さな攻撃や溜めの前では最低保証だけ＝毎ラウンド押す理由は無い。
    // HP回復を外したのは、役割を「予告に対する防御」に絞るため（回復は手札の支援札が担う）。
    text: `敵の予告の${guardPercent}%ぶんブロックを得る（最低${guardMinDisplay}）。`,
    effects: [
      { kind: 'blockOfIntent', ratio: RULES.divination.guardRatio, min: RULES.divination.guardMin },
    ],
  },
  {
    name: '導きの託宣',
    text: 'カードを1枚引き、神力を1得る。',
    effects: [
      { kind: 'draw', amount: 1 },
      { kind: 'gainAp', amount: 1 },
    ],
  },
  {
    name: '天啓の託宣',
    // STEP-SCORE2-F2（B'）：旧score8はBASE-Dで無効化されたため、dmg3→4へ置換
    text: '敵に40ダメージを与える。',
    effects: [{ kind: 'damage', target: 'enemy', amount: 4 }],
  },
]
