import type { Effect, GodArchetype, GodDef, OtomoDef } from '../../core/types'

/**
 * 神選択画面：「どの神を選べばいいか分からない」というCEOフィードバックへの対応。
 *
 * 表示は2段構成にした：
 * ①`archetype`（攻撃型／防御型など）＝`GodDef`に手動で割り当てた分類（決定20・23・
 *   25・26の設計意図に基づく。tagline/motifと同じ「手書きの人間向け説明」）
 * ②4軸のステータスバー（攻撃・防御・回復・特殊）＝`resonanceEffects`と
 *   OTOMOの`effectsByForm`から機械的に集計した数値。カードごとの`CardIcon`
 *   （決定30）と同じ精神で、手書きコピーではなくデータから導出するため、
 *   バランス調整（決定26・36のような数値変更）があっても自動的に最新の値に
 *   追従する。
 *
 * ①は「性格に合った大まかな方向性」、②は「実際の数値の裏付け」を担い、
 * 両方合わせて初めて「見ただけで選べる」比較ができる。
 */

export type GodStats = {
  attack: number
  defense: number
  heal: number
  special: number
}

// 決定6の基準レート「1AP=5ダメージ相当」に合わせた重み。
// draw・buffは装備状況次第で価値が変わるため、gainApより控えめな重みにしてある
// （厳密な経済モデルではなく、選択画面での大まかな比較用の目安）。
const GAIN_AP_WEIGHT = 5
const DRAW_WEIGHT = 3

function accumulate(effects: Effect[], stats: GodStats): void {
  for (const effect of effects) {
    switch (effect.kind) {
      case 'damage':
        if (effect.target === 'enemy') stats.attack += effect.amount
        break
      case 'block':
        stats.defense += effect.amount
        break
      case 'heal':
        stats.heal += effect.amount
        break
      case 'debuff':
        // 敵の攻撃力デバフは被ダメージ軽減＝実質的な防御として計上する
        if (effect.target === 'enemy' && effect.stat === 'atk') {
          stats.defense += effect.amount * effect.rounds
        } else {
          stats.special += effect.amount * effect.rounds
        }
        break
      case 'buff':
        stats.special += effect.amount * effect.rounds
        break
      case 'draw':
        stats.special += effect.amount * DRAW_WEIGHT
        break
      case 'gainAp':
        stats.special += effect.amount * GAIN_AP_WEIGHT
        break
      case 'resonance':
      case 'score':
        break
    }
  }
}

/** 神の共鳴の一撃＋専属OTOMO（童子・最大成長時）の効果を合算した4軸ステータス */
export function computeGodStats(god: GodDef, otomo: OtomoDef): GodStats {
  const stats: GodStats = { attack: 0, defense: 0, heal: 0, special: 0 }
  accumulate(god.resonanceEffects, stats)
  accumulate(otomo.effectsByForm.doji, stats)
  return stats
}

export const ARCHETYPE_LABEL: Record<GodArchetype, string> = {
  attack: '攻撃型',
  defense: '防御型',
  support: '支援型',
  technique: '技巧型',
  balance: 'バランス型',
}

/**
 * 神ごとの「唯一の◯◯型」判定（CEOフィードバック「才華を選ぶ理由が分からない」
 * への対応・施策A）。7神中その`archetype`が1体しかいなければ「唯一」を示す。
 * ハードコードせず`GODS`の実データから毎回数え直すため、将来神が増減しても
 * 自動的に正しい値になる。
 */
export function countGodsByArchetype(gods: GodDef[]): Record<GodArchetype, number> {
  const counts: Record<GodArchetype, number> = {
    attack: 0,
    defense: 0,
    support: 0,
    technique: 0,
    balance: 0,
  }
  for (const god of gods) {
    counts[god.archetype] += 1
  }
  return counts
}

const STAT_LABEL: Record<'atk' | 'def', string> = {
  atk: '攻撃力',
  def: '防御力',
}

/**
 * 「特殊」バーの数字だけでは中身が分からない（CEOフィードバック）ため、
 * 何が積み上がって特殊になっているのかを一言で示す。該当効果が無ければnull。
 * draw・gainApは神の共鳴＋OTOMO成長の合計値にまとめ（「カード+2枚・カード+1枚」の
 * ように同じ種類が重複して出るのを避ける）、buff・debuffはそれぞれ個別に列挙する。
 */
export function describeSpecial(god: GodDef, otomo: OtomoDef): string | null {
  const effects = [...god.resonanceEffects, ...otomo.effectsByForm.doji]
  let drawTotal = 0
  let gainApTotal = 0
  const parts: string[] = []

  for (const effect of effects) {
    switch (effect.kind) {
      case 'draw':
        drawTotal += effect.amount
        break
      case 'gainAp':
        gainApTotal += effect.amount
        break
      case 'buff':
        parts.push(`自分の${STAT_LABEL[effect.stat]}+${effect.amount}（${effect.rounds}R）`)
        break
      case 'debuff':
        // 敵atkデバフはcomputeGodStats側でdefenseに計上済みのため、ここでは除く
        if (!(effect.target === 'enemy' && effect.stat === 'atk')) {
          const target = effect.target === 'enemy' ? '敵' : '自分'
          parts.push(`${target}の${STAT_LABEL[effect.stat]}${effect.amount}（${effect.rounds}R）`)
        }
        break
      default:
        break
    }
  }

  const merged = [
    ...(drawTotal > 0 ? [`カード+${drawTotal}枚`] : []),
    ...(gainApTotal > 0 ? [`神力+${gainApTotal}`] : []),
    ...parts,
  ]
  return merged.length > 0 ? merged.join('・') : null
}
