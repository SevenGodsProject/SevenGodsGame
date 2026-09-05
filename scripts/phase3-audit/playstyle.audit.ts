/**
 * PLAYSTYLE DIFFERENTIATION 計測。
 *
 * A) 探索AI×6プロファイル（rush/balanced/fortress/resonance/engine/control）で
 *    7神×7敵×神階{0,4,7} を回し、「神を変えると最適プロファイルが変わるか」を測る。
 *    - 神ごとの最良プロファイル / プロファイル間の勝率スプレッド
 *    - 神ペア間のプロファイル順位相関（Spearman）：高い＝同じ戦い方が最適＝差別化不足
 * B) God×Card 使用率マトリクス：神ごとにランダム合法デッキを多数生成し、
 *    探索AI（balanced）が「手札に来たカードを何%使うか」（=Pick Priority の代理指標）と
 *    「デッキに入っている時の勝率差」（=カード価値）を神別に出す。
 * C) 報酬3択の神別分岐：共通カードからランダム3枚を出し、神ごとの価値で最良を選ぶと
 *    神によって選択が変わる割合。
 */
import { describe, it } from 'vitest'
import { createRng } from '../../src/core/rng/seededRandom'
import type { CardDefId, GodId } from '../../src/core/types'
import {
  GOD_ORDER, GOD_NAME, ENEMY_ORDER, ENEMY_NAME, GODS, getRecommendedDeck, getCardPoolForGod, getCardDef,
  runGame, searchAgent, PROFILES, newAgg, addAgg, summarizeAgg, writeOut, mdTable, r1, r2, avg,
  type Agg, type AggSummary,
} from './harness'

const PROFILE_NAMES = Object.keys(PROFILES)
const SEEDS_A = 16
const STAKES_A = [0, 4, 7]
const BUDGET = 400
const DECKS_B = 220
const STAKES_B = [0, 5]

function spearman(a: number[], b: number[]): number {
  const rank = (xs: number[]) => {
    const idx = xs.map((v, i) => ({ v, i })).sort((x, y) => y.v - x.v)
    const r = new Array(xs.length).fill(0)
    idx.forEach((o, k) => (r[o.i] = k + 1))
    return r
  }
  const ra = rank(a), rb = rank(b)
  const n = a.length
  const d2 = ra.reduce((s, x, i) => s + (x - rb[i]) ** 2, 0)
  return 1 - (6 * d2) / (n * (n * n - 1))
}

function randomDeck(godId: GodId, rng: ReturnType<typeof createRng>): CardDefId[] {
  const pool = getCardPoolForGod(godId).map((c) => c.id)
  const counts = new Map<CardDefId, number>()
  const deck: CardDefId[] = []
  while (deck.length < 20) {
    const id = pool[rng.nextInt(0, pool.length)]
    const c = counts.get(id) ?? 0
    if (c >= 2) continue
    counts.set(id, c + 1)
    deck.push(id)
  }
  return deck
}

describe('Phase3 Step1 playstyle differentiation', () => {
  it('A) 探索AI×プロファイル：神ごとの最適プレイスタイル', () => {
    const t0 = Date.now()
    const cells = new Map<string, Agg>()
    const get = (k: string) => { let a = cells.get(k); if (!a) { a = newAgg(); cells.set(k, a) } return a }
    for (const god of GOD_ORDER) {
      const deck = getRecommendedDeck(god)
      for (const stake of STAKES_A) {
        for (const pn of PROFILE_NAMES) {
          for (const enemy of ENEMY_ORDER) {
            for (let i = 0; i < SEEDS_A; i++) {
              const m = runGame({ seed: `p3a-${god}-${enemy}-${stake}-${pn}-${i}`, godId: god, enemyId: enemy, deck, stake: stake || undefined }, searchAgent(PROFILES[pn], BUDGET))
              addAgg(get(`${god}|${stake}|${pn}|${enemy}`), m)
              addAgg(get(`${god}|${stake}|${pn}|ALL`), m)
            }
          }
        }
      }
      console.log(`  ${GOD_NAME[god]} done ${((Date.now() - t0) / 1000).toFixed(0)}s`)
    }
    const S: Record<string, AggSummary> = {}
    for (const [k, a] of cells) S[k] = summarizeAgg(a)
    writeOut('playstyle_A.json', S)

    const md: string[] = ['# Playstyle A: 探索AI × 6プロファイル', `SEEDS=${SEEDS_A}×7敵=${SEEDS_A * 7} games/cell, budget=${BUDGET}`]
    const diffSummary: Record<string, unknown> = {}
    for (const stake of STAKES_A) {
      md.push(`\n## 神階${stake}：プロファイル別勝率（合成スコア=勝率+平均スコア/100 で順位）`)
      const rows: (string | number)[][] = []
      const vectors: Record<string, number[]> = {}
      for (const god of GOD_ORDER) {
        const per = PROFILE_NAMES.map((pn) => S[`${god}|${stake}|${pn}|ALL`])
        const comp = per.map((s) => s.winRate + s.avgScore / 100)
        vectors[god] = comp
        const bi = comp.indexOf(Math.max(...comp))
        const wr = per.map((s) => s.winRate)
        const balancedIdx = PROFILE_NAMES.indexOf('balanced')
        rows.push([GOD_NAME[god], ...per.map((s) => `${s.winRate}% / ${s.avgScore}`), PROFILE_NAMES[bi], r1(Math.max(...wr) - Math.min(...wr)), r1(wr[bi] - wr[balancedIdx])])
      }
      md.push(mdTable(['god', ...PROFILE_NAMES, 'best', 'WRspread', 'best−balanced'], rows))
      // 順位相関行列
      md.push(`\n### 神ペアのプロファイル順位相関（Spearman、1.0=完全に同じ最適順位）`)
      const mat: number[][] = []
      const corrRows = GOD_ORDER.map((g1) => {
        const r = GOD_ORDER.map((g2) => spearman(vectors[g1], vectors[g2]))
        mat.push(r)
        return [GOD_NAME[g1], ...r.map((x) => r2(x))]
      })
      md.push(mdTable(['', ...GOD_ORDER.map((g) => GOD_NAME[g])], corrRows))
      const offDiag: number[] = []
      for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) offDiag.push(mat[i][j])
      const meanCorr = avg(offDiag)
      const bestSet = new Set(GOD_ORDER.map((g) => PROFILE_NAMES[vectors[g].indexOf(Math.max(...vectors[g]))]))
      md.push(`\n平均順位相関=${r2(meanCorr)} / 最良プロファイルの種類数=${bestSet.size}/7 (${[...bestSet].join(', ')})`)
      diffSummary[`stake${stake}`] = { meanCorr: r2(meanCorr), distinctBest: bestSet.size, best: Object.fromEntries(GOD_ORDER.map((g) => [GOD_NAME[g], PROFILE_NAMES[vectors[g].indexOf(Math.max(...vectors[g]))]])) }

      // 神×敵 最良プロファイル
      md.push(`\n### 神×敵：最良プロファイル（神階${stake}）`)
      md.push(mdTable(['god', ...ENEMY_ORDER.map((e) => ENEMY_NAME[e])], GOD_ORDER.map((god) => [GOD_NAME[god], ...ENEMY_ORDER.map((e) => {
        const per = PROFILE_NAMES.map((pn) => ({ pn, v: S[`${god}|${stake}|${pn}|${e}`].winRate + S[`${god}|${stake}|${pn}|${e}`].avgScore / 100 }))
        const b = per.reduce((x, y) => (y.v > x.v ? y : x))
        return `${b.pn} ${S[`${god}|${stake}|${b.pn}|${e}`].winRate}%`
      })])))
    }
    // 資源プロファイル（balanced）：神ごとの実際の戦い方の内訳
    md.push('\n## 神ごとの実プレイ内訳（balancedプロファイル、神階0 / 7）')
    for (const stake of [0, 7]) {
      md.push(`\n### 神階${stake}`)
      md.push(mdTable(['god', 'win', 'score', 'winR', 'cards', 'dmgCard', 'dmgBurst', 'dmgDiv', 'block', 'absorbed', 'heal', 'draw+', 'ap+', 'debuffApp', 'debuffEff', 'enemyRaw', 'burst/g', 'reach', 'burstR', 'otomo', 'div', 'divR'],
        GOD_ORDER.map((god) => { const s = S[`${god}|${stake}|balanced|ALL`]; return [GOD_NAME[god], `${s.winRate}%`, s.avgScore, s.avgWinRound, s.cardsPlayed, s.dmgCard, s.dmgBurst, s.dmgDiv, s.block, s.blockAbsorbed, s.heal, s.drawExtra, s.apGained, s.debuffApplied, s.debuffEff, s.enemyRaw, s.burstsPerGame, `${s.burstReach}%`, s.avgFirstBurstRound, s.otomoForm, s.divUses, s.avgDivRound] })))
    }
    writeOut('playstyle_A_summary.json', diffSummary)
    writeOut('playstyle_A.md', md.join('\n'))
    console.log(md.join('\n'))
  })

  it('B) God×Card 使用率・カード価値マトリクス（ランダム合法デッキ）', () => {
    const t0 = Date.now()
    type CardStat = { seen: number; played: number; inDeckGames: number; inDeckWins: number; inDeckScore: number; outGames: number; outWins: number; outScore: number }
    const stats = new Map<string, CardStat>() // god|stake|card
    const get = (k: string) => { let s = stats.get(k); if (!s) { s = { seen: 0, played: 0, inDeckGames: 0, inDeckWins: 0, inDeckScore: 0, outGames: 0, outWins: 0, outScore: 0 }; stats.set(k, s) } return s }
    const godWin: Record<string, { n: number; w: number }> = {}
    for (const god of GOD_ORDER) {
      const pool = getCardPoolForGod(god).map((c) => c.id)
      for (const stake of STAKES_B) {
        const rng = createRng(`p3b-decks-${god}-${stake}`)
        for (let d = 0; d < DECKS_B; d++) {
          const deck = randomDeck(god, rng)
          const enemy = ENEMY_ORDER[d % ENEMY_ORDER.length]
          const m = runGame({ seed: `p3B-${god}-${stake}-${d}`, godId: god, enemyId: enemy, deck, stake: stake || undefined }, searchAgent(PROFILES.balanced, BUDGET))
          const won = m.status === 'won' ? 1 : 0
          const k = `${god}|${stake}`
          godWin[k] ??= { n: 0, w: 0 }; godWin[k].n++; godWin[k].w += won
          const inDeck = new Set(deck)
          for (const id of pool) {
            const s = get(`${god}|${stake}|${id}`)
            if (inDeck.has(id)) { s.inDeckGames++; s.inDeckWins += won; s.inDeckScore += m.finalScore } else { s.outGames++; s.outWins += won; s.outScore += m.finalScore }
          }
          for (const [id, n] of Object.entries(m.cardsSeen)) get(`${god}|${stake}|${id}`).seen += n
          for (const [id, n] of Object.entries(m.cardsPlayed)) get(`${god}|${stake}|${id}`).played += n
        }
      }
      console.log(`  ${GOD_NAME[god]} decks done ${((Date.now() - t0) / 1000).toFixed(0)}s`)
    }
    const out: Record<string, unknown> = { godWin }
    const md: string[] = ['# Playstyle B: God×Card matrix (random legal decks, search AI balanced)', `decks per god×stake=${DECKS_B}`]
    const commonIds = getCardPoolForGod(GOD_ORDER[0]).filter((c) => !c.godId).map((c) => c.id)
    const matrix: Record<string, Record<string, { usage: number; dWin: number; dScore: number }>> = {}
    for (const stake of STAKES_B) {
      md.push(`\n## 神階${stake}：共通カード使用率（played/seen %）`)
      const rows = commonIds.map((id) => {
        const cells = GOD_ORDER.map((god) => { const s = get(`${god}|${stake}|${id}`); return s.seen ? (s.played / s.seen) * 100 : 0 })
        return { id, cells, spread: Math.max(...cells) - Math.min(...cells), mean: avg(cells) }
      }).sort((a, b) => b.spread - a.spread)
      md.push(mdTable(['card', 'cost', ...GOD_ORDER.map((g) => GOD_NAME[g]), 'mean', 'spread'], rows.map((r) => [getCardDef(r.id).name, getCardDef(r.id).cost, ...r.cells.map((c) => r1(c)), r1(r.mean), r1(r.spread)])))
      md.push(`\n共通32枚の使用率スプレッド：平均=${r1(avg(rows.map((r) => r.spread)))} / 中央値=${r1(rows.map((r) => r.spread).sort((a, b) => a - b)[Math.floor(rows.length / 2)])} / スプレッド≥15ptのカード数=${rows.filter((r) => r.spread >= 15).length}`)

      md.push(`\n## 神階${stake}：共通カードのデッキ内価値（デッキに入っている時の勝率 − 入っていない時の勝率, pt）`)
      const rows2 = commonIds.map((id) => {
        const cells = GOD_ORDER.map((god) => { const s = get(`${god}|${stake}|${id}`); return (s.inDeckGames ? s.inDeckWins / s.inDeckGames : 0) * 100 - (s.outGames ? s.outWins / s.outGames : 0) * 100 })
        return { id, cells, spread: Math.max(...cells) - Math.min(...cells) }
      }).sort((a, b) => b.spread - a.spread)
      md.push(mdTable(['card', ...GOD_ORDER.map((g) => GOD_NAME[g]), 'spread'], rows2.map((r) => [getCardDef(r.id).name, ...r.cells.map((c) => r1(c)), r1(r.spread)])))

      // 専用カード
      md.push(`\n## 神階${stake}：専用カード 使用率 / デッキ内価値(pt)`)
      md.push(mdTable(['god', 'card', 'cost', 'usage%', 'dWin pt', 'dScore'], GOD_ORDER.flatMap((god) => getCardPoolForGod(god).filter((c) => c.godId === god).map((c) => {
        const s = get(`${god}|${stake}|${c.id}`)
        const dWin = (s.inDeckGames ? s.inDeckWins / s.inDeckGames : 0) * 100 - (s.outGames ? s.outWins / s.outGames : 0) * 100
        const dScore = (s.inDeckGames ? s.inDeckScore / s.inDeckGames : 0) - (s.outGames ? s.outScore / s.outGames : 0)
        return [GOD_NAME[god], c.name, c.cost, r1(s.seen ? (s.played / s.seen) * 100 : 0), r1(dWin), Math.round(dScore)]
      }))))

      matrix[`stake${stake}`] = {}
      for (const god of GOD_ORDER) {
        matrix[`stake${stake}`][god] = {}
        for (const c of getCardPoolForGod(god)) {
          const s = get(`${god}|${stake}|${c.id}`)
          matrix[`stake${stake}`][god][c.id] = {
            usage: r1(s.seen ? (s.played / s.seen) * 100 : 0),
            dWin: r1((s.inDeckGames ? s.inDeckWins / s.inDeckGames : 0) * 100 - (s.outGames ? s.outWins / s.outGames : 0) * 100),
            dScore: Math.round((s.inDeckGames ? s.inDeckScore / s.inDeckGames : 0) - (s.outGames ? s.outScore / s.outGames : 0)),
          }
        }
      }

      // C) 報酬3択の神別分岐（共通カードのみ、価値 = dWin*2 + dScore/50 + usage/10）
      const valueOf = (god: GodId, id: CardDefId) => { const v = matrix[`stake${stake}`][god][id]; return v.dWin * 2 + v.dScore / 50 + v.usage / 10 }
      const rng = createRng(`p3c-${stake}`)
      let trials = 0, distinctSum = 0, allSame = 0
      const pairAgree: number[][] = GOD_ORDER.map(() => GOD_ORDER.map(() => 0))
      for (let t = 0; t < 2000; t++) {
        const shuffled = rng.shuffle(commonIds).slice(0, 3)
        const picks = GOD_ORDER.map((god) => shuffled.reduce((b, id) => (valueOf(god, id) > valueOf(god, b) ? id : b), shuffled[0]))
        const distinct = new Set(picks).size
        trials++; distinctSum += distinct; if (distinct === 1) allSame++
        for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) if (picks[i] === picks[j]) pairAgree[i][j]++
      }
      md.push(`\n## 神階${stake}：報酬3択（共通カード）で7神の最良選択が一致する割合 = ${r1((allSame / trials) * 100)}% / 平均選択種類数 = ${r2(distinctSum / trials)}`)
      md.push(mdTable(['', ...GOD_ORDER.map((g) => GOD_NAME[g])], GOD_ORDER.map((g, i) => [GOD_NAME[g], ...pairAgree[i].map((x) => `${r1((x / trials) * 100)}%`)])))
      out[`reward_stake${stake}`] = { allSameRate: r1((allSame / trials) * 100), avgDistinct: r2(distinctSum / trials) }
    }
    out.matrix = matrix
    writeOut('playstyle_B.json', out)
    writeOut('playstyle_B.md', md.join('\n'))
    console.log(md.join('\n'))
  })
})

// GODS は archetype 参照用に import（未使用警告回避）
void GODS
