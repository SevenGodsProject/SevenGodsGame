import type { MasteryGrade, MasteryResult } from '../../core/engine'
import type { GodId } from '../../core/types'
import { GOD_IDS } from '../../core/data/gods'
import { RULES } from '../../core/data/rules'

/**
 * 神技評価（Mastery）の表示コピー（決定110プロトタイプ）。
 *
 * Human Play QA（2026-09-06）で「勝ってもずっとC。なぜCか・Bに何点必要か・
 * 次に何を直せばいいかが分からない」というUX問題が出たため、表示を作り直した。
 * 判明していた原因（`docs/MASTERY_RATING_UX_AUDIT.md`）：
 *   ① 旧「あと20%でB」は差分表現で、到達目標（40%）が画面のどこにも無かった
 *   ② 説明文の「20%」（現在値）と目標行の「20%」（不足分）が同じ数字で並び、意味が衝突した
 *   ③ 総合スコアの直下に出るため「スコアの20%」と読めた
 *   ④ 指標を上げるための"操作"が書かれていなかった
 *   ⑤ 大耀だけ距離表示が無く励まし文だった（最もCになりやすい神が最も情報が少ない）
 *
 * 新形式は3行を「現在値 → 次ランクの目標値」と「上げ方1行」に統一し、
 * 差分表現（あと○%）を全廃した。4神とも同じフォーマットで、例外を作らない。
 *
 * 表示専用の純粋関数のみ。core/engine・Mastery判定・閾値・スコア計算には一切触れない。
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
 * 神技評価が実装されている4神のみ。
 */
export const MASTERY_SELECT_HINT: Partial<Record<GodId, string>> = {
  [GOD_IDS.taiyo]: '神技「爆発」：1ラウンドで大ダメージを与えるほど評価UP',
  [GOD_IDS.juraku]: '神技「無力化」：敵の攻撃を弱めるほど評価UP',
  [GOD_IDS.sobi]: '神技「鉄壁」：敵の攻撃を無傷で受け止めるほど評価UP',
  [GOD_IDS.fukuei]: '神技「大勝負」：身を削って攻め、どん底から立て直すほど評価UP',
}

/** 結果画面で「スコアとは別の軸」であることを一言で示すラベル */
export const MASTERY_AXIS_NOTE = 'スコアとは別。戦い方で決まります'

export type MasteryDisplay = {
  /** 例：「C（修行中）」 */
  gradeLabel: string
  /** 何を測っているか。例：「無傷で受け止めた割合」 */
  metricLabel: string
  /** 現在値と次ランクの目標値。例：「20% → B（堂々）は 40%」／S：「90% → 最高ランク達成！」 */
  progress: string
  /** 指標の上げ方（1行・全角24〜30字を上限とする） */
  hint: string
}

type MasteryCopy = {
  metricLabel: string
  thresholds: { b: number; a: number; s: number }
  hint: string
  /** ゲート等で、通常のヒントより優先して出す文言（無ければnull） */
  overrideHint?: (mastery: MasteryResult) => string | null
  /** 現在値に付ける注記（福永のrisk gate未達など） */
  currentNote?: (mastery: MasteryResult) => string | null
}

/**
 * 神ごとの表示データ。閾値は`RULES.mastery`（唯一の数値の出どころ）から引く。
 * 神を追加するときはこの表に1エントリ足すだけで、下の組み立て処理は変えない。
 */
const MASTERY_COPY: Partial<Record<GodId, MasteryCopy>> = {
  [GOD_IDS.taiyo]: {
    metricLabel: '1ラウンドで削った敵HPの割合',
    thresholds: RULES.mastery.taiyo,
    hint: '1ラウンドに火力を集中させるほど割合が上がります',
  },
  [GOD_IDS.sobi]: {
    metricLabel: '無傷で受け止めた割合',
    thresholds: RULES.mastery.sobi,
    hint: '敵の予告以上のブロックを積むと「無傷」になります',
  },
  [GOD_IDS.juraku]: {
    metricLabel: '敵の攻撃を削いだ平均割合',
    thresholds: RULES.mastery.juraku,
    hint: '大技の前に敵の攻撃力を下げるほど割合が上がります',
    overrideHint: (m) => {
      if (m.easyCapped) return '「かんたん」では上限A。ふつう以上でSに挑戦できます'
      if (m.grade === 'A' && !m.sGateMet) return 'Sは強打（予告100以上）を半分以下に抑えると届きます'
      return null
    },
  },
  [GOD_IDS.fukuei]: {
    metricLabel: 'どん底から立て直したHPの割合',
    thresholds: RULES.mastery.fukuei,
    hint: '身を削る札で攻め、そこからHPを取り戻すと上がります',
    overrideHint: (m) =>
      m.riskGateMet === false ? '身を削る札で敵HPの1割を削ると評価対象になります' : null,
    currentNote: (m) => (m.riskGateMet === false ? '（まだ評価対象外）' : null),
  },
}

/** 次に目指すランクと、その閾値。S（最高ランク）ではnull */
function nextRank(
  grade: MasteryGrade,
  t: { b: number; a: number; s: number },
): { rank: MasteryGrade; threshold: number } | null {
  switch (grade) {
    case 'C':
      return { rank: 'B', threshold: t.b }
    case 'B':
      return { rank: 'A', threshold: t.a }
    case 'A':
      return { rank: 'S', threshold: t.s }
    case 'S':
      return null
  }
}

const pct = (value: number) => `${Math.round(value * 100)}%`

/**
 * 結果画面用の神技評価を組み立てる（勝利時のみ表示される前提）。
 * 表示%は内部rawとMath.roundで数学的に一致させる（表示だけ盛らない）。
 */
export function describeMastery(mastery: MasteryResult, godId: GodId): MasteryDisplay {
  const gradeLabel = `${mastery.grade}（${MASTERY_GRADE_WORD[mastery.grade]}）`
  const copy = MASTERY_COPY[godId]

  // 神技が未実装の神（表示側では起こらないが、型と将来の追加に備えた素直な既定値）
  if (!copy) {
    return {
      gradeLabel,
      metricLabel: mastery.title,
      progress: pct(mastery.raw),
      hint: 'この神らしい戦い方を、さらに磨こう',
    }
  }

  const note = copy.currentNote?.(mastery) ?? ''
  const next = nextRank(mastery.grade, copy.thresholds)
  const progress = next
    ? `${pct(mastery.raw)}${note} → ${next.rank}（${MASTERY_GRADE_WORD[next.rank]}）は ${pct(next.threshold)}`
    : `${pct(mastery.raw)} → 最高ランク達成！`

  return {
    gradeLabel,
    metricLabel: copy.metricLabel,
    progress,
    hint: copy.overrideHint?.(mastery) ?? copy.hint,
  }
}
