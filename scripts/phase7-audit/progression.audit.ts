/**
 * Phase 7 — Progression Risk 補助シミュレーション（分析専用・本番コード非変更）。
 *
 *   SEEDS=12 OUT_DIR=<出力先> npx vitest run --config scripts/phase7-audit/vitest.audit.config.ts scripts/phase7-audit/progression.audit.ts --reporter=verbose
 *
 * R1 報酬（編成上限+N）の雪だるま効果：おすすめデッキ vs 最強火力札を +1 / +2 枚積んだデッキ（報酬ボーナス相当）
 *    → 通常攻略のスコア・撃破Rがどれだけ動くか（＝報酬が Daily に持ち込めない理由の定量根拠）
 * R2 難易度別の緊張感：ふつう / むずかしい（Daily の敵HP×1.25・ATK×1.15 の近似として）で勝率・終了HP
 */
import { describe, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { CardDefId, GodId } from '../../src/core/types'
import { ENEMY_ORDER, GOD_ORDER, GOD_NAME, PROFILES, getRecommendedDeck, getCardDef, cardDamage, cardBlock, cardHeal, runGame, searchAgent, mdTable, r1, r2, avg } from '../phase3-audit/harness'
import { GOD_IDS } from '../../src/core/data/gods'

const SEEDS = Number(process.env.SEEDS ?? 12)
const OUT_DIR = process.env.OUT_DIR ?? path.resolve(__dirname, 'out')
const write = (name: string, body: string) => { fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(path.join(OUT_DIR, name), body, 'utf8') }
const profileFor = (god: GodId) => god === GOD_IDS.sobi || god === GOD_IDS.shouren ? PROFILES.fortress : god === GOD_IDS.juraku ? PROFILES.control : god === GOD_IDS.saika ? PROFILES.engine : PROFILES.rush

/** 報酬相当：デッキ内で最も火力の高い札を +extra 枚、最も価値の低い札（火力+盾+回復が最小）を extra 枚外す */
function rewardStacked(deck: CardDefId[], extra: number): { deck: CardDefId[]; bonus: Partial<Record<CardDefId, number>>; star: CardDefId } {
  const uniq = [...new Set(deck)]
  const value = (id: CardDefId) => cardDamage(id) + cardBlock(id) + cardHeal(id)
  const star = uniq.sort((a, b) => cardDamage(b) - cardDamage(a))[0]
  const weak = [...deck].filter((id) => id !== star).sort((a, b) => value(a) - value(b))
  const out = [...deck]
  for (let i = 0; i < extra; i++) { const idx = out.indexOf(weak[i]); if (idx >= 0) out.splice(idx, 1); out.push(star) }
  return { deck: out, bonus: { [star]: extra }, star }
}

describe('Phase 7 progression risk', () => {
  it('R1 報酬ボーナス（上限+1/+2）の効果', () => {
    const md: string[] = ['## R1 報酬ボーナスの雪だるま効果（Optimizer・ふつう・神階なし）', `SEEDS=${SEEDS}／7神×7敵`, '']
    const rows: (string | number)[][] = []
    const totals: Record<string, { win: number; n: number; score: number[]; round: number[] }> = {}
    for (const god of GOD_ORDER) {
      const base = getRecommendedDeck(god)
      const variants = [
        { name: 'おすすめ', deck: base, bonus: undefined as Partial<Record<CardDefId, number>> | undefined, star: '' as string },
        { name: '報酬+1', ...rewardStacked(base, 1) },
        { name: '報酬+2', ...rewardStacked(base, 2) },
      ]
      for (const v of variants) {
        const scores: number[] = [], rounds: number[] = []; let win = 0, n = 0
        for (const enemy of ENEMY_ORDER) for (let i = 0; i < SEEDS; i++) {
          const m = runGame({ seed: `p7r-${god}-${enemy}-${i}`, godId: god, enemyId: enemy, deck: v.deck, bonusCopies: v.bonus }, searchAgent(profileFor(god), 400))
          n++; scores.push(m.finalScore); if (m.status === 'won') { win++; rounds.push(m.round) }
        }
        rows.push([GOD_NAME[god], v.name, v.star ? getCardDef(v.star as CardDefId).name : '—', r1(100 * win / n) + '%', Math.round(avg(scores)), r2(avg(rounds))])
        const t = (totals[v.name] ??= { win: 0, n: 0, score: [], round: [] }); t.win += win; t.n += n; t.score.push(...scores); t.round.push(...rounds)
      }
    }
    md.push(mdTable(['神', 'デッキ', '積んだ札', 'win', 'avg score', 'avg win round'], rows))
    md.push('\n### 全神合計'); md.push(mdTable(['デッキ', 'win', 'avg score', 'avg win round'], Object.entries(totals).map(([k, t]) => [k, r1(100 * t.win / t.n) + '%', Math.round(avg(t.score)), r2(avg(t.round))])))
    write('r1_reward.md', md.join('\n')); console.log(md.join('\n'))
  }, 60 * 60 * 1000)

  it('R2 難易度別の緊張感（ふつう / むずかしい ≒ Daily 近似）', () => {
    const md: string[] = ['## R2 難易度別：勝率・終了HP・未撃破率（New=heuristic balanced / Optimizer）', '']
    const rows: (string | number)[][] = []
    for (const diff of ['normal', 'hard'] as const) for (const [tname, mk] of [['New', () => ({ kind: 'h' })], ['Optimizer', () => ({ kind: 's' })]] as const) {
      let n = 0, win = 0, fin = 0, lost = 0; const hp: number[] = [], scores: number[] = []
      for (const god of GOD_ORDER) { const deck = getRecommendedDeck(god); for (const enemy of ENEMY_ORDER) for (let i = 0; i < Math.max(4, Math.floor(SEEDS / 2)); i++) {
        const agent = mk().kind === 'h' ? (await_h(god)) : searchAgent(profileFor(god), 400)
        const m = runGame({ seed: `p7d-${god}-${enemy}-${i}`, godId: god, enemyId: enemy, deck, difficulty: diff }, agent)
        n++; scores.push(m.finalScore); hp.push(m.playerHp); if (m.status === 'won') win++; else if (m.status === 'finished') fin++; else lost++
      } }
      rows.push([diff, tname, n, r1(100 * win / n) + '%', r1(100 * fin / n) + '%', r1(100 * lost / n) + '%', r1(avg(hp)), Math.round(avg(scores))])
    }
    md.push(mdTable(['difficulty', 'type', 'games', 'win', 'finished', 'lost', 'avg end HP(internal/30)', 'avg score'], rows))
    write('r2_difficulty.md', md.join('\n')); console.log(md.join('\n'))
  }, 60 * 60 * 1000)
})

// heuristic agent factory（harness の heuristicAgent は Strategy 引数）
import { heuristicAgent } from '../phase3-audit/harness'
function await_h(_god: GodId) { return heuristicAgent('balanced') }
