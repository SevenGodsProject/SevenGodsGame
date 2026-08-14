import type { DivinationChoice } from '../types'

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
    text: 'HPを3回復し、ブロックを2得る。',
    effects: [
      { kind: 'heal', amount: 3 },
      { kind: 'block', amount: 2 },
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
    text: '敵に3ダメージを与え、スコアを8得る。',
    effects: [
      { kind: 'damage', target: 'enemy', amount: 3 },
      { kind: 'score', amount: 8 },
    ],
  },
]
