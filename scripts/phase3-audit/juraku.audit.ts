/**
 * 寿楽 Root Cause 分解（ablation）。
 * プロセス内でのみ GODS / OTOMOS のデータオブジェクトを差し替え、終了時に復元する（本番データ非変更）。
 *
 * J0 baseline寿楽
 * J1 burst の debuff を除去（damage23 のみ）
 * J2 burst の debuff → block20（蒼毘型）
 * J3 OTOMO 効果を全形態で空にする
 * J4 デッキの debuff カード8枚を同コストの非debuff共通カードへ置換
 * J5 全神に「寿楽の共通12枚」を持たせる（専用8枚＋寿楽の共通12枚）→ デッキ効果の切り分け
 * J6 神階 0/1/3/5/7 の勝率低下量（ATK+耐性）を神別に比較（baseline.jsonの再利用ではなく同条件で再計測）
 */
import { describe, it, afterAll } from 'vitest'
import { OTOMOS } from '../../src/core/data/otomo'
import { CARD_IDS, JURAKU_CARD_IDS } from '../../src/core/data/cards'
import type { CardDefId, Effect, GodId } from '../../src/core/types'
import {
  GODS, GOD_IDS, GOD_ORDER, GOD_NAME, ENEMY_ORDER, ENEMY_NAME, getRecommendedDeck, getCardPoolForGod,
  runGame, heuristicAgent, searchAgent, PROFILES, newAgg, addAgg, summarizeAgg, writeOut, mdTable, r1,
  type Agg, type Strategy,
} from './harness'

const SEEDS = 24
const juraku = GODS.find((g) => g.id === GOD_IDS.juraku)!
const juka = OTOMOS.find((o) => o.godId === GOD_IDS.juraku)!
const ORIG_BURST = juraku.resonanceEffects
const ORIG_OTOMO_G = juka.effectsByForm
const ORIG_OTOMO_P = juka.powerPathEffectsByForm

afterAll(() => {
  ;(juraku as { resonanceEffects: Effect[] }).resonanceEffects = ORIG_BURST
  ;(juka as { effectsByForm: typeof ORIG_OTOMO_G }).effectsByForm = ORIG_OTOMO_G
  ;(juka as { powerPathEffectsByForm: typeof ORIG_OTOMO_P }).powerPathEffectsByForm = ORIG_OTOMO_P
})

function runSet(label: string, godId: GodId, deck: CardDefId[], stake: number, agentKind: 'heur' | 'search', strat: Strategy = 'balanced') {
  const a: Agg = newAgg()
  const byEnemy: Record<string, Agg> = {}
  for (const enemy of ENEMY_ORDER) {
    byEnemy[enemy] = newAgg()
    for (let i = 0; i < SEEDS; i++) {
      const agent = agentKind === 'heur' ? heuristicAgent(strat) : searchAgent(PROFILES.balanced, 400)
      const m = runGame({ seed: `p3j-${label}-${godId}-${enemy}-${stake}-${i}`, godId, enemyId: enemy, deck, stake: stake || undefined, stakeChoice: stake === 7 ? 'pressure' : undefined }, agent)
      addAgg(a, m); addAgg(byEnemy[enemy], m)
    }
  }
  return { all: summarizeAgg(a), byEnemy: Object.fromEntries(Object.entries(byEnemy).map(([k, v]) => [k, summarizeAgg(v)])) }
}

describe('Phase3 Step1 juraku root cause', () => {
  it('ablations', () => {
    const t0 = Date.now()
    const base = getRecommendedDeck(GOD_IDS.juraku)
    const md: string[] = ['# 寿楽 Root Cause ablation', `SEEDS=${SEEDS}×7敵 per cell`]
    const results: Record<string, unknown> = {}

    const variants: { key: string; label: string; setup: () => void; deck?: CardDefId[] }[] = [
      { key: 'J0', label: 'baseline', setup: () => {} },
      { key: 'J1', label: 'burst debuff除去（dmg23のみ）', setup: () => { (juraku as { resonanceEffects: Effect[] }).resonanceEffects = [{ kind: 'damage', target: 'enemy', amount: 23 }] } },
      { key: 'J2', label: 'burst debuff→block20', setup: () => { (juraku as { resonanceEffects: Effect[] }).resonanceEffects = [{ kind: 'damage', target: 'enemy', amount: 23 }, { kind: 'block', amount: 20 }] } },
      { key: 'J3', label: 'OTOMO効果なし', setup: () => { const empty = { spirit: [], incarnate: [], doji: [] } as typeof ORIG_OTOMO_G; (juka as { effectsByForm: typeof ORIG_OTOMO_G }).effectsByForm = empty } },
      {
        key: 'J4', label: 'デッキのdebuff札8枚→非debuff札', setup: () => {},
        deck: base.map((id) => {
          if (id === JURAKU_CARD_IDS.mischief) return CARD_IDS.strike
          if (id === JURAKU_CARD_IDS.halfJoking) return CARD_IDS.heavyBlow
          if (id === CARD_IDS.curse) return CARD_IDS.ironStance
          if (id === CARD_IDS.purifyingLight) return CARD_IDS.bastion
          return id
        }),
      },
      {
        key: 'J4b', label: 'デッキの共通debuff札4枚(呪縛×2/浄め×2)のみ→非debuff札', setup: () => {},
        deck: base.map((id) => (id === CARD_IDS.curse ? CARD_IDS.ironStance : id === CARD_IDS.purifyingLight ? CARD_IDS.bastion : id)),
      },
      { key: 'J1+J4', label: 'burst debuff除去＋デッキdebuff除去（寿楽のdebuffを全消去）', setup: () => { (juraku as { resonanceEffects: Effect[] }).resonanceEffects = [{ kind: 'damage', target: 'enemy', amount: 23 }] },
        deck: base.map((id) => (id === JURAKU_CARD_IDS.mischief ? CARD_IDS.strike : id === JURAKU_CARD_IDS.halfJoking ? CARD_IDS.heavyBlow : id === CARD_IDS.curse ? CARD_IDS.ironStance : id === CARD_IDS.purifyingLight ? CARD_IDS.bastion : id)) },
    ]

    const restore = () => {
      ;(juraku as { resonanceEffects: Effect[] }).resonanceEffects = ORIG_BURST
      ;(juka as { effectsByForm: typeof ORIG_OTOMO_G }).effectsByForm = ORIG_OTOMO_G
    }

    for (const agentKind of ['heur', 'search'] as const) {
      md.push(`\n## 寿楽 ablation（${agentKind === 'heur' ? 'ヒューリスティックbalanced' : '探索AI balanced'}）`)
      const rows: (string | number)[][] = []
      for (const v of variants) {
        restore(); v.setup()
        const deck = v.deck ?? base
        const s0 = runSet(`${v.key}-${agentKind}`, GOD_IDS.juraku, deck, 0, agentKind)
        const s7 = runSet(`${v.key}-${agentKind}`, GOD_IDS.juraku, deck, 7, agentKind)
        results[`${v.key}|${agentKind}`] = { stake0: s0, stake7: s7 }
        rows.push([v.key, v.label, `${s0.all.winRate}%`, `${s7.all.winRate}%`, s7.all.avgWinScore, s7.all.debuffApplied, s7.all.debuffEff, s7.all.enemyRaw, r1((s7.all.debuffEff / Math.max(1, s7.all.enemyRaw)) * 100), s7.all.block, s7.all.heal, s7.all.burstsPerGame, s7.all.dmgCard, s7.all.dmgBurst])
        restore()
      }
      md.push(mdTable(['key', 'variant', 'win@0', 'win@7', 'score@7', 'debuffApp@7', 'debuffEff@7', 'enemyRaw@7', 'negated%', 'block@7', 'heal@7', 'burst/g', 'dmgCard', 'dmgBurst'], rows))
    }

    // J5: 全神に寿楽の共通12枚
    const jurakuCommons = base.filter((id) => !getCardPoolForGod(GOD_IDS.ebisu).find((c) => c.id === id)?.godId).filter((id) => !getCardPoolForGod(GOD_IDS.juraku).find((c) => c.id === id)?.godId)
    md.push(`\n## J5：全神に寿楽の共通12枚（${jurakuCommons.map((id) => getCardPoolForGod(GOD_IDS.juraku).find((c) => c.id === id)!.name).join('、')}）＋専用8枚（各2枚）`)
    const rows5: (string | number)[][] = []
    for (const god of GOD_ORDER) {
      const excl = getCardPoolForGod(god).filter((c) => c.godId === god).map((c) => c.id)
      const deck = [...excl, ...excl, ...jurakuCommons].slice(0, 20)
      const own = getRecommendedDeck(god)
      for (const agentKind of ['heur', 'search'] as const) {
        const own7 = runSet(`J5own-${agentKind}`, god, own, 7, agentKind)
        const jd7 = runSet(`J5jd-${agentKind}`, god, deck, 7, agentKind)
        const own0 = runSet(`J5own-${agentKind}`, god, own, 0, agentKind)
        const jd0 = runSet(`J5jd-${agentKind}`, god, deck, 0, agentKind)
        results[`J5|${god}|${agentKind}`] = { own0, jd0, own7, jd7 }
        rows5.push([GOD_NAME[god], agentKind, `${own0.all.winRate}%`, `${jd0.all.winRate}%`, `${own7.all.winRate}%`, `${jd7.all.winRate}%`, r1(jd7.all.winRate - own7.all.winRate), jd7.all.debuffEff, r1((jd7.all.debuffEff / Math.max(1, jd7.all.enemyRaw)) * 100)])
      }
    }
    md.push(mdTable(['god', 'AI', 'own@0', 'jurakuDeck@0', 'own@7', 'jurakuDeck@7', 'Δ@7', 'debuffEff@7', 'negated%@7'], rows5))

    // J6: 神階耐性（各神・balanced探索AI）
    md.push('\n## J6：神階耐性（探索AI balanced、勝率の推移とⅠ→Ⅶ低下量）')
    const rows6: (string | number)[][] = []
    for (const god of GOD_ORDER) {
      const deck = getRecommendedDeck(god)
      const w = [0, 1, 3, 5, 7].map((st) => runSet('J6', god, deck, st, 'search').all)
      results[`J6|${god}`] = w
      rows6.push([GOD_NAME[god], ...w.map((s) => `${s.winRate}%`), r1(w[0].winRate - w[4].winRate), ...w.map((s) => r1((s.debuffEff / Math.max(1, s.enemyRaw)) * 100))])
    }
    md.push(mdTable(['god', '0', 'Ⅰ', 'Ⅲ', 'Ⅴ', 'Ⅶ', 'drop 0→Ⅶ', 'negated%@0', '@Ⅰ', '@Ⅲ', '@Ⅴ', '@Ⅶ'], rows6))

    // 敵別（寿楽 baseline 探索AI 神階7）
    const j0 = results['J0|search'] as { stake7: ReturnType<typeof runSet>; stake0: ReturnType<typeof runSet> }
    md.push('\n## 寿楽 敵別（探索AI balanced）')
    md.push(mdTable(['enemy', 'win@0', 'win@7', 'negated%@7', 'enemyRaw@7'], ENEMY_ORDER.map((e) => [ENEMY_NAME[e], `${j0.stake0.byEnemy[e].winRate}%`, `${j0.stake7.byEnemy[e].winRate}%`, r1((j0.stake7.byEnemy[e].debuffEff / Math.max(1, j0.stake7.byEnemy[e].enemyRaw)) * 100), j0.stake7.byEnemy[e].enemyRaw])))

    console.log(`juraku audit done ${((Date.now() - t0) / 1000).toFixed(0)}s`)
    writeOut('juraku.json', results)
    writeOut('juraku.md', md.join('\n'))
    console.log(md.join('\n'))
  })
})
