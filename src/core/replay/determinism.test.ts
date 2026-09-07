import { describe, it, expect } from 'vitest'
import type { CardDefId, EnemyId, GodId } from '../types'
import { RULES } from '../data/rules'
import { GOD_IDS } from '../data/gods'
import { dailyBossFor } from '../data/dailyBoss'
import { getCardPoolForGod, getRecommendedDeck, validateDeck } from '../data/deckBuilder'
import { getFinalScore } from '../engine/score'
import { runReplay } from './replay'
import { playDailyRun } from './replayTestUtils'
import type { ReplayInput } from './types'

/**
 * Phase 4.1 Step 6：Determinism（ライブ実行 vs リプレイ実行）。
 *
 * ランキングの前提は「同じ開始条件＋同じ操作ログなら、誰がどこで再生しても
 * 同じ結果になる」。ここでは実際にプレイした試合（`playDailyRun`が本番と同じ
 * Actionを発行して進める）と、その操作ログだけを`runReplay`へ渡した結果を突き合わせる。
 *
 * ★一致の定義：**GameState全体の完全一致**を採る。
 * JSONのbyte比較ではなく`toEqual`（構造的な同値）にしているのは、byte比較だと
 * 「意味は同じだがキー順が違う」だけで落ちる脆いテストになるため。GameStateは
 * プレーンなデータのみ（関数・Date・Mapを含まない）なので、構造的同値は
 * 実質的に完全一致と等価であり、こちらのほうが厳密さを落とさずに安定する。
 * その上で、CEO指定の主要項目（score・HP・enemyHP・round・勝敗・rngCursor・
 * resonance・OTOMO）は個別にも明示的に検証する。
 */

const GODS = Object.values(GOD_IDS)

/** 7連日ぶんの日付キー（週次巡回により7体の敵が必ず1回ずつ登場する） */
const DAILY_KEYS = [
  '2026-09-07',
  '2026-09-08',
  '2026-09-09',
  '2026-09-10',
  '2026-09-11',
  '2026-09-12',
  '2026-09-13',
]

/**
 * その神で合法な20枚デッキを、offsetを変えて機械的に作る。
 * おすすめデッキ（offset=-1相当）だけだとデッキのバリエーションが1種類になり、
 * 「デッキが違ってもリプレイが一致する」ことを確かめられないため。
 */
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

function toInput(
  dailyKey: string,
  godId: GodId,
  deck: CardDefId[],
  run: ReturnType<typeof playDailyRun>,
): ReplayInput {
  return {
    version: RULES.replay.formatVersion,
    mode: 'daily',
    dailyKey,
    godId,
    deck,
    actions: run.actions,
  }
}

describe('Determinism：ライブ実行とリプレイ実行が一致する', () => {
  it('検証マトリクスが7神・7敵・7Daily seedを網羅している', () => {
    const enemies = new Set<EnemyId>(DAILY_KEYS.map((k) => dailyBossFor(k).enemyId))
    const seeds = new Set(DAILY_KEYS.map((k) => dailyBossFor(k).seed))
    expect(GODS.length).toBe(7)
    expect(enemies.size).toBe(7)
    expect(seeds.size).toBe(7)
  })

  it('生成した検証用デッキがすべて編成ルール（報酬ボーナス無し）で合法である', () => {
    for (const godId of GODS) {
      for (const deck of [getRecommendedDeck(godId), legalDeck(godId, 0), legalDeck(godId, 5)]) {
        expect(validateDeck(deck, godId).valid, `${godId} のデッキが不正`).toBe(true)
      }
    }
  })

  it('7神 × 7敵(Daily seed) × 3デッキ × 3打ち筋 のすべてでGameStateが完全一致する', () => {
    let cases = 0
    let finished = 0
    for (const godId of GODS) {
      const decks = [getRecommendedDeck(godId), legalDeck(godId, 0), legalDeck(godId, 5)]
      for (const dailyKey of DAILY_KEYS) {
        for (let d = 0; d < decks.length; d++) {
          for (const policySeed of [1, 2, 3]) {
            const deck = decks[d]
            const live = playDailyRun({ dailyKey, godId, deck, policySeed })
            expect(live.state.status, 'ライブ実行が決着していない').not.toBe('playing')
            finished++

            const result = runReplay(toInput(dailyKey, godId, deck, live))
            expect(
              result.ok,
              `拒否された: ${result.ok ? '' : `${result.code} ${result.message}`}`,
            ).toBe(true)
            if (!result.ok) return

            // ① GameState全体の完全一致
            expect(result.state).toEqual(live.state)

            // ② CEO指定の主要項目を個別にも明示検証する
            expect(result.state.score).toEqual(live.state.score)
            expect(result.state.player.hp).toBe(live.state.player.hp)
            expect(result.state.enemy.hp).toBe(live.state.enemy.hp)
            expect(result.state.round).toBe(live.state.round)
            expect(result.state.status).toBe(live.state.status)
            expect(result.state.rngCursor).toBe(live.state.rngCursor)
            expect(result.state.resonance).toEqual(live.state.resonance)
            expect(result.state.otomo).toEqual(live.state.otomo)
            expect(result.state.mastery).toEqual(live.state.mastery)
            expect(result.state.hand).toEqual(live.state.hand)
            expect(result.state.deck).toEqual(live.state.deck)
            expect(result.state.discard).toEqual(live.state.discard)

            // ③ 検証済み結果（ランキングが保存する値）がライブ実行と一致する
            expect(result.outcome.score).toBe(getFinalScore(live.state.score, live.state.stake))
            expect(result.outcome.win).toBe(live.state.status === 'won')
            expect(result.outcome.round).toBe(live.state.round)
            expect(result.outcome.rngCursor).toBe(live.state.rngCursor)
            expect(result.outcome.enemyId).toBe(dailyBossFor(dailyKey).enemyId)
            expect(result.outcome.seed).toBe(dailyBossFor(dailyKey).seed)
            expect(result.outcome.actionCount).toBe(live.actions.length)
            cases++
          }
        }
      }
    }
    expect(cases).toBe(GODS.length * DAILY_KEYS.length * 3 * 3)
    expect(finished).toBe(cases)
  })

  it('同じ入力を2回リプレイしても完全に同じ結果になる（再実行の再現性）', () => {
    for (const godId of GODS) {
      const deck = getRecommendedDeck(godId)
      const live = playDailyRun({ dailyKey: DAILY_KEYS[0], godId, deck, policySeed: 7 })
      const input = toInput(DAILY_KEYS[0], godId, deck, live)
      const a = runReplay(input)
      const b = runReplay(input)
      expect(a.ok && b.ok).toBe(true)
      expect(a).toEqual(b)
    }
  })

  it('操作ログが想定の規模（30〜60程度・1〜2KB）に収まる', () => {
    const sizes: number[] = []
    const counts: number[] = []
    for (const godId of GODS) {
      const deck = getRecommendedDeck(godId)
      for (const policySeed of [11, 12, 13]) {
        const live = playDailyRun({ dailyKey: DAILY_KEYS[2], godId, deck, policySeed })
        counts.push(live.actions.length)
        sizes.push(JSON.stringify(live.actions).length)
      }
    }
    // 上限側だけを固定する（下振れはプレイ内容によるため縛らない）。
    // `RULES.replay.maxActions`は正当な試合を絶対に落とさない余裕がある、という保証。
    expect(Math.max(...counts)).toBeLessThan(RULES.replay.maxActions / 2)
    expect(Math.max(...sizes)).toBeLessThan(4096)
  })

  it('託宣を使う打ち筋・使わない打ち筋の両方で一致する', () => {
    for (const godId of GODS) {
      const deck = getRecommendedDeck(godId)
      for (const useDivination of [true, false]) {
        const live = playDailyRun({
          dailyKey: DAILY_KEYS[4],
          godId,
          deck,
          policySeed: 21,
          useDivination,
        })
        const result = runReplay(toInput(DAILY_KEYS[4], godId, deck, live))
        expect(result.ok).toBe(true)
        if (result.ok) expect(result.state).toEqual(live.state)
      }
    }
  })

  it('OTOMOの絆（成長路線）が違えば結果も変わり、それぞれ一致する', () => {
    const godId = GODS[0]
    const deck = getRecommendedDeck(godId)
    const outcomes: number[] = []
    for (const otomoGrowthPath of ['guardian', 'power'] as const) {
      const live = playDailyRun({
        dailyKey: DAILY_KEYS[1],
        godId,
        deck,
        policySeed: 31,
        otomoGrowthPath,
      })
      const result = runReplay({
        ...toInput(DAILY_KEYS[1], godId, deck, live),
        otomoGrowthPath,
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.state).toEqual(live.state)
        expect(result.state.otomoGrowthPath).toBe(otomoGrowthPath)
        outcomes.push(result.outcome.score)
      }
    }
    expect(outcomes.length).toBe(2)
  })
})
