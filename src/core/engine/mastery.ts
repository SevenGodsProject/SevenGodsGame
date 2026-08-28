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
  /** 生値（表示%の元。寿楽はJ-G平均軽減率0〜1） */
  raw: number
  /** 寿楽のみ：S行動ゲート（強攻撃を半分以下へ抑えた実績）を満たしたか */
  sGateMet?: boolean
  /** 寿楽のみ：raw・ゲートはS相当だがeasyのため上限Aに抑えられたか */
  easyCapped?: boolean
  /** 福永のみ：risk gate（自傷カード由来の実効与ダメ≥敵maxHpの10%）を満たしたか */
  riskGateMet?: boolean
}

/** 大耀「爆発」の生値：1ラウンド最大実効ダメージ ÷ 敵最大HP */
export function getTaiyoMasteryRaw(state: GameState): number {
  if (state.enemy.maxHp <= 0) return 0
  return state.mastery.bestRoundDamage / state.enemy.maxHp
}

/**
 * 寿楽「無力化」の生値（決定113 J-G）：
 * 敵攻撃1回ごとの軽減率(raw−actual)/rawの**等重み平均**（金額加重ではない）。
 * 攻撃が1回も無かった試合は0。
 */
export function getJurakuMasteryRaw(state: GameState): number {
  if (state.mastery.attackCount <= 0) return 0
  return state.mastery.reductionRateSum / state.mastery.attackCount
}

/**
 * 蒼毘「鉄壁」の生値（STEP-SCORE2-G3、G2のS4定義）：
 * 無傷受け率＝fullyBlockedCount ÷ guardAttackCount（1攻撃＝1票、量の重み付けなし）。
 * 実害が届きえた攻撃（actual>0）が1回も無かった試合は0。
 */
export function getSobiMasteryRaw(state: GameState): number {
  if (state.mastery.guardAttackCount <= 0) return 0
  return state.mastery.fullyBlockedCount / state.mastery.guardAttackCount
}

/** 福永risk gate：自傷カード由来の敵への実効与ダメが敵maxHpの10%以上か */
export function isFukueiRiskGateMet(state: GameState): boolean {
  if (state.enemy.maxHp <= 0) return false
  return (
    state.mastery.riskCardEffDamage >=
    state.enemy.maxHp * RULES.mastery.fukuei.riskGateRatio
  )
}

/**
 * 福永「大勝負」の生値（G4 prototype、LANE C research F17案）：
 * (最終HP − 試合中最低HP) ÷ maxHp ＝「どん底からの立て直し幅」。
 * ただしrisk gate（自傷カード由来の実効与ダメ ≥ 敵maxHpの10%）を満たさない
 * 試合はraw=0（C）。敵に殴られること自体は評価しない——自らリスクを取り、
 * そこから立て直したことだけを評価する（意図的被弾farmingの遮断）。
 * 無傷（minHp=満タン）ならfinalHP−minHp≤0でraw=0。表示は勝利時のみ
 * （GameOverOverlayがstatus==='won'でゲート。既存3神と同じ）。
 */
export function getFukueiMasteryRaw(state: GameState): number {
  if (state.player.maxHp <= 0) return 0
  if (!isFukueiRiskGateMet(state)) return 0
  return Math.max(0, (state.player.hp - state.mastery.minHp) / state.player.maxHp)
}

/**
 * 現在の対局のMastery評価。対応する神技が未実装の神ではnull。
 * グレード閾値はRULES.mastery（正式採用値ではないprototype値）。
 */
export function getMastery(state: GameState): MasteryResult | null {
  if (state.godId === GOD_IDS.taiyo) {
    const raw = getTaiyoMasteryRaw(state)
    const t = RULES.mastery.taiyo
    const grade: MasteryGrade = raw >= t.s ? 'S' : raw >= t.a ? 'A' : raw >= t.b ? 'B' : 'C'
    return { title: '爆発', grade, raw }
  }

  if (state.godId === GOD_IDS.juraku) {
    const raw = getJurakuMasteryRaw(state)
    const t = RULES.mastery.juraku
    const sGateMet = state.mastery.strongNeutralized
    // 決定113：S＝raw>=0.90 かつ 強攻撃半減ゲート かつ easy以外（easyは上限A）
    const sQualified = raw >= t.s && sGateMet
    const easyCapped = sQualified && state.difficulty === 'easy'
    const grade: MasteryGrade =
      sQualified && !easyCapped ? 'S' : raw >= t.a ? 'A' : raw >= t.b ? 'B' : 'C'
    return { title: '無力化', grade, raw, sGateMet, easyCapped }
  }

  if (state.godId === GOD_IDS.sobi) {
    const raw = getSobiMasteryRaw(state)
    const t = RULES.mastery.sobi
    // G3 prototype：Sゲート・easy capなし（G2で難易度farmingフラットのため。実測後に判断）
    const grade: MasteryGrade = raw >= t.s ? 'S' : raw >= t.a ? 'A' : raw >= t.b ? 'B' : 'C'
    return { title: '鉄壁', grade, raw }
  }

  if (state.godId === GOD_IDS.fukuei) {
    const raw = getFukueiMasteryRaw(state)
    const t = RULES.mastery.fukuei
    const riskGateMet = isFukueiRiskGateMet(state)
    // G4 prototype：Sゲート・easy capなし（simulationでeasy farmingが確認されれば
    // 蒼毘G3と同様に実測後へ判断を持ち越す）
    const grade: MasteryGrade = raw >= t.s ? 'S' : raw >= t.a ? 'A' : raw >= t.b ? 'B' : 'C'
    return { title: '大勝負', grade, raw, riskGateMet }
  }

  return null
}
