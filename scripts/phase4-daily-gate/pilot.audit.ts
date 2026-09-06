/** 速度計測用パイロット（本番シミュレーションのサンプル数を決めるためだけに使う） */
import { describe, it } from 'vitest'
import {
  dateKeysFrom,
  deckFor,
  GOD_ORDER,
  heuristicAgent,
  PROFILES,
  runDailyGame,
  searchAgent,
  writeOut,
} from './dailyHarness'

describe('pilot', () => {
  it('speed', () => {
    const out: string[] = []
    const days = dateKeysFrom('2026-09-07', 7)

    let t = Date.now()
    let n = 0
    for (const dateKey of days) {
      for (const g of GOD_ORDER) {
        runDailyGame({ dateKey, godId: g, deck: deckFor(g, 'recommended'), growthPath: 'guardian' }, heuristicAgent('balanced'))
        n++
      }
    }
    let ms = Date.now() - t
    out.push(`heuristic: ${n} games / ${ms}ms = ${(ms / n).toFixed(2)} ms per game`)

    for (const budget of [300, 800, 2000]) {
      t = Date.now()
      n = 0
      for (const dateKey of days) {
        for (const g of GOD_ORDER) {
          runDailyGame(
            { dateKey, godId: g, deck: deckFor(g, 'recommended'), growthPath: 'guardian' },
            searchAgent(PROFILES.score, budget),
          )
          n++
        }
      }
      ms = Date.now() - t
      out.push(`search(score,budget=${budget}): ${n} games / ${ms}ms = ${(ms / n).toFixed(2)} ms per game`)
    }

    const day = days[0]
    for (const g of GOD_ORDER) {
      const h = runDailyGame({ dateKey: day, godId: g, deck: deckFor(g, 'recommended'), growthPath: 'guardian' }, heuristicAgent('balanced'))
      const s = runDailyGame({ dateKey: day, godId: g, deck: deckFor(g, 'recommended'), growthPath: 'guardian' }, searchAgent(PROFILES.score, 800))
      out.push(`${g}  heuristic=${h.finalScore}(${h.status} R${h.round})  search=${s.finalScore}(${s.status} R${s.round})`)
    }

    writeOut('pilot.txt', out.join('\n'))
  })
})
