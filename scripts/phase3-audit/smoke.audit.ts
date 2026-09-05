/** ハーネスの動作確認と速度計測（本監査前のpilot） */
import { describe, it, expect } from 'vitest'
import { GOD_IDS, ENEMY_IDS, getRecommendedDeck, runGame, heuristicAgent, searchAgent, PROFILES, summarizeAgg, newAgg, addAgg } from './harness'

describe('smoke', () => {
  it('heuristic agent runs and matches balanceSim style', () => {
    const t0 = Date.now()
    const a = newAgg()
    for (let i = 0; i < 40; i++) {
      const m = runGame({ seed: `smoke-${i}`, godId: GOD_IDS.ebisu, enemyId: ENEMY_IDS.trial, deck: getRecommendedDeck(GOD_IDS.ebisu) }, heuristicAgent('balanced'))
      addAgg(a, m)
    }
    const s = summarizeAgg(a)
    console.log('heuristic balanced ebisu×trial', s, `${Date.now() - t0}ms/40games`)
    expect(s.n).toBe(40)
  })
  it('search agent runs', () => {
    for (const budget of [300, 800, 1500]) {
      const t0 = Date.now()
      const a = newAgg()
      for (let i = 0; i < 10; i++) {
        const m = runGame({ seed: `smoke-${i}`, godId: GOD_IDS.juraku, enemyId: ENEMY_IDS.oni, deck: getRecommendedDeck(GOD_IDS.juraku), stake: 7 }, searchAgent(PROFILES.balanced, budget))
        addAgg(a, m)
      }
      console.log(`search balanced juraku×oni stake7 budget=${budget}`, summarizeAgg(a), `${Date.now() - t0}ms/10games`)
    }
  })
})
