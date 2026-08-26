import type { GameState } from '../types'
import { GOD_IDS } from '../data/gods'
import { RULES } from '../data/rules'

/**
 * Mastery（神技評価）のグレード算出（決定110プロトタイプ）。
 *
 * Battle Score（ScoreState）とは完全分離：ここで算出した値を
 * スコアtotalへ加算する経路は存在しない（存在させてはならない。
 * 決定108で「加算はハンディキャップ化・敵依存・格差再拡大を招く」と実証済み）。
 *
 * 現段階は大耀「爆発」1神のみ。他神はnullを返す（横展開は別STEPでCEO承認後）。
 */

export type MasteryGrade = 'S' | 'A' | 'B' | 'C'

export type MasteryResult = {
  /** 神技の名前（結果画面の「神技評価 大耀「爆発」 A」表示に使う） */
  title: string
  grade: MasteryGrade
  /** 生値（デバッグ・テスト用。通常UIには表示しない） */
  raw: number
}

/** 大耀「爆発」の生値：1ラウンド最大実効ダメージ ÷ 敵最大HP */
export function getTaiyoMasteryRaw(state: GameState): number {
  if (state.enemy.maxHp <= 0) return 0
  return state.mastery.bestRoundDamage / state.enemy.maxHp
}

/**
 * 現在の対局のMastery評価。対応する神技が未実装の神ではnull。
 * グレード閾値はRULES.mastery（正式採用値ではないprototype値）。
 */
export function getMastery(state: GameState): MasteryResult | null {
  if (state.godId !== GOD_IDS.taiyo) return null
  const raw = getTaiyoMasteryRaw(state)
  const t = RULES.mastery.taiyo
  const grade: MasteryGrade = raw >= t.s ? 'S' : raw >= t.a ? 'A' : raw >= t.b ? 'B' : 'C'
  return { title: '爆発', grade, raw }
}
