/**
 * Human Play QA で出た「勝っても神技評価がずっとC」への監査（分析専用・仕様変更なし）。
 *
 * 神技評価（Mastery）はBattle Scoreとは独立した、神ごとの行動指標。
 * ここでは「普通に勝ったプレイヤーがCへ集中していないか」を、3つの腕前プロファイルで測る。
 *   初心者相当 … 既存balanceSimと同じヒューリスティック（先読みなし）
 *   標準       … 探索AI balanced（1ラウンド先読み）
 *   上級       … 探索AI で、その神の指標を意識した価値関数（蒼毘/笑蓮=fortress、寿楽=control、
 *                大耀=rush、福永=rush＝低HPで殴り続ける）
 *
 * 出力：勝利試合のみのグレード分布・raw平均・Bまでの不足量・スコアとの相関。
 */
import { describe, it } from 'vitest'
import { RULES } from '../../../src/core/data/rules'
import { GOD_IDS } from '../../../src/core/data/gods'
import type { GodId } from '../../../src/core/types'
import { ENEMY_ORDER, ENEMY_NAME, GOD_NAME, PROFILES, getRecommendedDeck, writeOut, mdTable, r1, r2, avg } from '../harness'
import { runGame2, searchAgent2, heuristicAgent2 } from './harness2'

const SEEDS = Number(process.env.SEEDS ?? 24)

/** 神技を持つ4神と、そのB閾値・指標名 */
const MASTERY_GODS: { god: GodId; label: string; bThreshold: number; aThreshold: number; sThreshold: number; metric: string }[] = [
  { god: GOD_IDS.taiyo, label: '爆発', bThreshold: RULES.mastery.taiyo.b, aThreshold: RULES.mastery.taiyo.a, sThreshold: RULES.mastery.taiyo.s, metric: '1ラウンド最大実効ダメージ ÷ 敵最大HP' },
  { god: GOD_IDS.sobi, label: '鉄壁', bThreshold: RULES.mastery.sobi.b, aThreshold: RULES.mastery.sobi.a, sThreshold: RULES.mastery.sobi.s, metric: '無傷で受け切った敵攻撃の割合' },
  { god: GOD_IDS.juraku, label: '無力化', bThreshold: RULES.mastery.juraku.b, aThreshold: RULES.mastery.juraku.a, sThreshold: RULES.mastery.juraku.s, metric: '敵攻撃1回あたりの平均軽減率' },
  { god: GOD_IDS.fukuei, label: '大勝負', bThreshold: RULES.mastery.fukuei.b, aThreshold: RULES.mastery.fukuei.a, sThreshold: RULES.mastery.fukuei.s, metric: '(最終HP−最低HP)÷最大HP（自傷カードでの与ダメが敵HPの10%以上のときのみ）' },
]

const SKILL: { name: string; agent: (god: GodId) => ReturnType<typeof searchAgent2> | ReturnType<typeof heuristicAgent2> }[] = [
  { name: '初心者相当', agent: () => heuristicAgent2('balanced') },
  { name: '標準', agent: () => searchAgent2(PROFILES.balanced, 400) },
  {
    name: '上級',
    agent: (god) =>
      searchAgent2(
        god === GOD_IDS.sobi ? PROFILES.fortress : god === GOD_IDS.juraku ? PROFILES.control : PROFILES.rush,
        400,
      ),
  },
]

describe('Mastery grade distribution', () => {
  it('4神 × 7敵 × 3腕前 の勝利時グレード分布（ふつう・神階なし）', () => {
    const md: string[] = [
      '# 神技評価（Mastery）の分布監査',
      `SEEDS=${SEEDS}／敵7体／難易度ふつう／神階なし。グレードは勝利時のみ表示されるため、勝利試合だけを集計する。`,
      '',
      '## 閾値（`RULES.mastery`。今回は変更しない）',
      mdTable(['神', '神技', '指標', 'B', 'A', 'S'], MASTERY_GODS.map((m) => [GOD_NAME[m.god], m.label, m.metric, m.bThreshold, m.aThreshold, m.sThreshold])),
    ]
    const out: Record<string, unknown> = {}

    for (const m of MASTERY_GODS) {
      const deck = getRecommendedDeck(m.god)
      md.push(`\n## ${GOD_NAME[m.god]}「${m.label}」`)
      const rows: (string | number)[][] = []
      for (const skill of SKILL) {
        const raws: number[] = []
        const grades: Record<string, number> = { S: 0, A: 0, B: 0, C: 0 }
        const scores: number[] = []
        let wins = 0
        let games = 0
        const byEnemyC: Record<string, { w: number; c: number }> = {}
        for (const enemy of ENEMY_ORDER) {
          byEnemyC[enemy] = { w: 0, c: 0 }
          for (let i = 0; i < SEEDS; i++) {
            const res = runGame2(
              { seed: `mastery-${m.god}-${enemy}-${skill.name}-${i}`, godId: m.god, enemyId: enemy, deck },
              skill.agent(m.god),
            )
            games++
            if (res.status !== 'won' || !res.mastery) continue
            wins++
            grades[res.mastery.grade] = (grades[res.mastery.grade] ?? 0) + 1
            raws.push(res.mastery.raw)
            scores.push(res.finalScore)
            byEnemyC[enemy].w++
            if (res.mastery.grade === 'C') byEnemyC[enemy].c++
          }
        }
        const pct = (n: number) => (wins ? r1((n / wins) * 100) : 0)
        const meanRaw = avg(raws)
        rows.push([
          skill.name,
          games,
          wins,
          `${pct(grades.S)}%`,
          `${pct(grades.A)}%`,
          `${pct(grades.B)}%`,
          `${pct(grades.C)}%`,
          r2(meanRaw),
          r2(Math.max(0, m.bThreshold - meanRaw)),
          Math.round(avg(scores) * 10),
        ])
        out[`${GOD_NAME[m.god]}|${skill.name}`] = {
          games, wins, grades, meanRaw: r2(meanRaw), gapToB: r2(Math.max(0, m.bThreshold - meanRaw)),
          cRateByEnemy: Object.fromEntries(ENEMY_ORDER.map((e) => [ENEMY_NAME[e], byEnemyC[e].w ? r1((byEnemyC[e].c / byEnemyC[e].w) * 100) : null])),
        }
      }
      md.push(mdTable(['腕前', '試合', '勝利', 'S', 'A', 'B', 'C', 'raw平均', 'Bまでの不足', '表示スコア平均'], rows))
      md.push(`\n### ${GOD_NAME[m.god]}：敵別のC率（標準の腕前）`)
      const std = out[`${GOD_NAME[m.god]}|標準`] as { cRateByEnemy: Record<string, number | null> }
      md.push(mdTable(['敵', 'C率'], ENEMY_ORDER.map((e) => [ENEMY_NAME[e], std.cRateByEnemy[ENEMY_NAME[e]] ?? '—'])))
    }

    writeOut('mastery_distribution.json', out)
    writeOut('mastery_distribution.md', md.join('\n'))
    console.log(md.join('\n'))
  })
})
