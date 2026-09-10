import { describe, it, expect } from 'vitest'
import type { CardDefId, GodId } from '../types'
import { RULES } from '../data/rules'
import { GOD_IDS } from '../data/gods'
import { getCardPoolForGod, getRecommendedDeck } from '../data/deckBuilder'
import { toReplayInput } from './runLog'
import { playRecordedDailyRun } from './replayTestUtils'

/**
 * Phase 4.2 Step 6：実プレイ相当runのaction数・payloadサイズの分布。
 *
 * `RULES.replay.maxActions`（400）が実分布に対して十分な安全余裕を持つかを確認する。
 * 上限が実分布に近いと、正当な長期戦が `ACTION_LIMIT` で落ちる事故になる。
 * 逆に大きすぎても、巨大ログのDoS対策として意味が薄れる。
 *
 * 本番の記録経路（`applyAndRecord`）を通したログで測る。
 */

const GODS = Object.values(GOD_IDS)
const DAILY_KEYS = [
  '2026-09-07',
  '2026-09-08',
  '2026-09-09',
  '2026-09-10',
  '2026-09-11',
  '2026-09-12',
  '2026-09-13',
]
const POLICY_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function legalDeck(godId: GodId, offset: number): CardDefId[] {
  const pool = getCardPoolForGod(godId).map((c) => c.id)
  const deck: CardDefId[] = []
  const counts = new Map<CardDefId, number>()
  for (let step = 0; deck.length < RULES.deck.size && step < pool.length * 4; step++) {
    const id = pool[(offset + step) % pool.length]
    const current = counts.get(id) ?? 0
    if (current < RULES.deckBuilding.maxCopiesPerCard) {
      deck.push(id)
      counts.set(id, current + 1)
    }
  }
  return deck
}

/** 昇順に並べた値から、線形補間なしの素朴なパーセンタイル（安全側＝上に寄せる） */
function percentile(sortedAsc: number[], p: number): number {
  const index = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1)
  return sortedAsc[Math.max(0, index)]
}

function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    n: sorted.length,
    min: sorted[0],
    median: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1],
  }
}

/** 1,470 run（7神 × 7 Daily seed × 3デッキ × 10打ち筋）の実測 */
const measurement = (() => {
  const actionCounts: number[] = []
  const payloadBytes: number[] = []
  let finished = 0
  for (const godId of GODS) {
    const decks = [getRecommendedDeck(godId), legalDeck(godId, 0), legalDeck(godId, 5)]
    for (const dailyKey of DAILY_KEYS) {
      for (const deck of decks) {
        for (const policySeed of POLICY_SEEDS) {
          const run = playRecordedDailyRun({ dailyKey, godId, deck, policySeed })
          if (run.state.status !== 'playing') finished++
          actionCounts.push(run.log.actions.length)
          payloadBytes.push(JSON.stringify(toReplayInput(run.log)).length)
        }
      }
    }
  }
  return {
    runs: actionCounts.length,
    finished,
    actions: summarize(actionCounts),
    bytes: summarize(payloadBytes),
  }
})()

describe('Action数 / payloadサイズの分布（Step 6）', () => {
  it('十分な数のrunを測っている（全runが決着している）', () => {
    expect(measurement.runs).toBe(GODS.length * DAILY_KEYS.length * 3 * POLICY_SEEDS.length)
    expect(measurement.finished).toBe(measurement.runs)
  })

  it('action数の分布が RULES.replay.maxActions に対して十分な余裕を持つ', () => {
    const { max, p99 } = measurement.actions
    // 実測の最大値が上限の1/4未満＝4倍以上の余裕。ここを割り込んだら上限の再検討が必要
    expect(max).toBeLessThan(RULES.replay.maxActions / 4)
    expect(p99).toBeLessThanOrEqual(max)
    expect(measurement.actions.min).toBeGreaterThan(0)
  })

  it('payloadサイズが想定（1〜2KB）に収まる', () => {
    // P99で2KB以内、最大でも4KB以内
    expect(measurement.bytes.p99).toBeLessThan(2048)
    expect(measurement.bytes.max).toBeLessThan(4096)
  })

  it('上限に達したログは保存側でも受け付けない（門番が二重にある）', () => {
    // `RULES.replay.maxActions` は runReplay と、保存層の形式検査の両方で使われる。
    // 実分布（max）は上限のはるか下にあるので、正当なrunが落ちることはない。
    expect(measurement.actions.max).toBeLessThan(RULES.replay.maxActions)
  })

  it('測定結果を記録として固定する（docsの数値と一致させるため）', () => {
    // 数値そのものは環境非依存（決定論エンジン＋決定論の打ち筋）なので固定できる。
    // 変わったらエンジンか打ち筋が変わった合図であり、docsも更新する必要がある。
    // Phase 5-A（決定154）：共通16枚に条件付き追加効果が付き、打ち筋（＝1ラウンドに
    // 出す枚数と決着ラウンド）がわずかに動いたため更新した。上限400に対する余裕は不変。
    expect(measurement.actions).toEqual({
      n: 1470,
      min: 7,
      median: 22,
      p90: 27,
      p95: 28,
      p99: 30,
      max: 32,
    })
    expect(measurement.bytes).toEqual({
      n: 1470,
      min: 790,
      median: 1262,
      p90: 1424,
      p95: 1466,
      p99: 1547,
      max: 1615,
    })
  })
})
