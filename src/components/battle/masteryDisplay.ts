import type { MasteryGrade, MasteryResult } from '../../core/engine'
import type { GodId } from '../../core/types'
import { GOD_IDS } from '../../core/data/gods'
import { RULES } from '../../core/data/rules'

/**
 * 神技評価（Mastery）の表示コピー（STEP-SCORE2-D2a、決定110プロトタイプ）。
 *
 * CEO実プレイFB「Mastery A/Sってそもそも何かわかってない」への対応：
 * (1) Gradeに和語の補助（S=神業…）を付けて尺度を一瞬で伝える
 * (2) 「何が測られたか」を1行の日本語文で示す
 * (3) 次Gradeへの目標を出す（ただしC評価では失敗感の強い％表示を出さない）
 *
 * 表示専用の純粋関数のみ。core/engine・Mastery判定・閾値には一切触れない。
 */

/** Gradeの和語補助。「A」単体では尺度が伝わらない問題への最小の解 */
export const MASTERY_GRADE_WORD: Record<MasteryGrade, string> = {
  S: '神業',
  A: '見事',
  B: '堂々',
  C: '修行中',
}

/**
 * 神選択画面に出す1行（戦う前から「この神で何を狙うか」が分かるように）。
 * prototypeは大耀のみ。7神展開時にこの表へ追記する。
 */
export const MASTERY_SELECT_HINT: Partial<Record<GodId, string>> = {
  [GOD_IDS.taiyo]: '神技「爆発」：1ラウンドで大ダメージを与えるほど評価UP',
}

/** C評価時の軽い励まし文（「あと○%」の失敗感を出さない。神ごとに用意する） */
const MASTERY_C_ENCOURAGE: Partial<Record<GodId, string>> = {
  [GOD_IDS.taiyo]: '大耀らしい爆発力を、さらに高めよう',
}

export type MasteryDisplay = {
  /** 例：「A（見事）」 */
  gradeLabel: string
  /** 例：「大耀「爆発」— 1ラウンドで敵HPの47%を一気に削った！」 */
  description: string
  /** 例：「Sまであと11%」「神業達成！」。C評価では励まし文 */
  goal: string
}

/** 次Gradeまでの残り%（最低1%。「あと0%」という表示を避ける） */
function gapToPercent(raw: number, threshold: number): number {
  return Math.max(1, Math.ceil((threshold - raw) * 100))
}

/**
 * 結果画面用の神技評価3行を組み立てる（勝利時のみ表示される前提）。
 * prototypeは大耀「爆発」専用の文面。7神展開時は神ごとの文面テーブルへ拡張する。
 */
export function describeMastery(
  mastery: MasteryResult,
  godId: GodId,
  godNameJa: string,
): MasteryDisplay {
  const percent = Math.round(mastery.raw * 100)
  const t = RULES.mastery.taiyo

  const goal = (() => {
    switch (mastery.grade) {
      case 'S':
        return '神業達成！'
      case 'A':
        return `Sまであと${gapToPercent(mastery.raw, t.s)}%`
      case 'B':
        return `Aまであと${gapToPercent(mastery.raw, t.a)}%`
      case 'C':
        return MASTERY_C_ENCOURAGE[godId] ?? 'この神らしい戦い方を、さらに磨こう'
    }
  })()

  return {
    gradeLabel: `${mastery.grade}（${MASTERY_GRADE_WORD[mastery.grade]}）`,
    description: `${godNameJa}「${mastery.title}」— 1ラウンドで敵HPの${percent}%を一気に削った！`,
    goal,
  }
}
