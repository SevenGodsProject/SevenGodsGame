import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { GOD_IDS } from '../../src/core/data/gods.js'
import { getRecommendedDeck } from '../../src/core/data/deckBuilder.js'
import { toReplayInput, getGameVersion } from '../../src/core/replay/index.js'
import { playRecordedDailyRun } from '../../src/core/replay/replayTestUtils.js'

/**
 * Phase 4.8 Preview QA 手順4 用の fixture を作る**使い捨て**スクリプト（commit しない）。
 *
 * submit を実地に通すには本物のエンジンで遊んだ行動ログが要るが、
 * ブラウザ側ではゲームエンジンがグローバルに露出していないので作れない。
 * ここでローカルに生成し、その JSON だけを Preview へ POST する。
 *
 * ★identity は入れない
 * `ReplayInput` は identity に依存しない。秘密はブラウザ側でその場に作らせ、
 * ここでは一切扱わない（＝秘密がファイルにもログにも出ない）。
 */

const OUT = process.env.QA_FIXTURE_OUT

describe.skipIf(!OUT)('Preview QA fixture', () => {
  it('指定した dailyKey で有効な ReplayInput を書き出す', () => {
    const dailyKey = process.env.QA_DAILY_KEY as string
    expect(dailyKey, 'QA_DAILY_KEY が必要です').toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const god = GOD_IDS.ebisu
    const run = playRecordedDailyRun({
      dailyKey,
      godId: god,
      deck: getRecommendedDeck(god),
      policySeed: 4801,
      clientRunId: 'c'.repeat(32),
    })
    const input = toReplayInput(run.log)

    expect(input.mode).toBe('daily')
    expect(input.dailyKey).toBe(dailyKey)
    expect(input.actions.length).toBeGreaterThan(0)

    const json = JSON.stringify(input)
    writeFileSync(OUT as string, json, 'utf8')
    console.log(
      `fixture: actions=${input.actions.length} bytes=${json.length} gameVersion=${getGameVersion()} win=${run.log.result?.win}`,
    )
  })
})
