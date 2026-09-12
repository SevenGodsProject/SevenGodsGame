import { describe, expect, it } from 'vitest'
import { createVisualHpTracker, hpBand, type TimerApi } from './visualHp'
import { hpStepsFor, planBatch, visualHpStartMs } from './combatTimeline'
import type { GameEvent } from '../../core/types'

/**
 * Phase 6-A Combat Juice（決定162）：表示HPは着弾に合わせて追従し、engine の HP には触らない。
 * タイマーを注入してブラウザ無しで検証する。
 */

function makeTracker(max: number, start: number) {
  let now = 0
  const queue: { at: number; fn: () => void; id: number }[] = []
  let nextId = 1
  const timers: TimerApi = {
    setTimeout: (fn, ms) => {
      const id = nextId++
      queue.push({ at: now + ms, fn, id })
      return id
    },
    clearTimeout: (id) => {
      const i = queue.findIndex((q) => q.id === id)
      if (i >= 0) queue.splice(i, 1)
    },
  }
  const changes: number[] = []
  const tracker = createVisualHpTracker(timers, () => max, (v) => changes.push(v))
  tracker.update(start)
  const advance = (ms: number) => {
    now += ms
    for (const q of [...queue].sort((a, b) => a.at - b.at)) {
      if (q.at <= now) {
        const i = queue.indexOf(q)
        if (i >= 0) queue.splice(i, 1)
        q.fn()
      }
    }
  }
  return { tracker, advance, changes, pending: () => queue.length }
}

const dmg = (target: 'enemy' | 'self', amount: number): GameEvent => ({ t: 'DAMAGE_DEALT', target, amount, blocked: 0 })
const cardPlayed: GameEvent = { t: 'CARD_PLAYED', uid: 'u1' as never, defId: 'card_common_attack_01' as never, cost: 1 }

describe('visualHp（表示HPの追従）', () => {
  it('内部HPが先に確定していても、表示HPは着弾まで動かない', () => {
    const { tracker, advance } = makeTracker(103, 103)
    const plan = planBatch([cardPlayed, dmg('enemy', 12)])
    // engine 側の HP はこの瞬間に 91 へ（従来どおり）。表示HPはまだ 103
    tracker.update(91, hpStepsFor(plan, 'enemy'))
    expect(tracker.shown).toBe(103)
    advance(plan.steps[0].atMs) // 着弾しただけでは動かない
    expect(tracker.shown).toBe(103)
    advance(visualHpStartMs(plan.steps[0]) - plan.steps[0].atMs)
    expect(tracker.shown).toBe(91)
  })

  it('連撃は hit ごとに段階的に減る', () => {
    const { tracker, advance } = makeTracker(300, 300)
    const plan = planBatch([{ t: 'ENEMY_ACTED', kind: 'multiAttack', amount: 12 }, dmg('self', 5), dmg('self', 4), dmg('self', 3)])
    tracker.update(288, hpStepsFor(plan, 'self'))
    expect(tracker.shown).toBe(300)
    const steps = plan.steps
    advance(visualHpStartMs(steps[0]))
    expect(tracker.shown).toBe(295)
    advance(visualHpStartMs(steps[1]) - visualHpStartMs(steps[0]))
    expect(tracker.shown).toBe(291)
    advance(visualHpStartMs(steps[2]) - visualHpStartMs(steps[1]))
    expect(tracker.shown).toBe(288)
  })

  it('overkill は表示HPを0で止める（マイナスにならない）', () => {
    const { tracker, advance } = makeTracker(100, 8)
    const plan = planBatch([cardPlayed, dmg('enemy', 36), { t: 'GAME_ENDED', status: 'won', totalScore: 0 }])
    tracker.update(0, hpStepsFor(plan, 'enemy'))
    expect(tracker.shown).toBe(8)
    advance(visualHpStartMs(plan.steps[0]))
    expect(tracker.shown).toBe(0)
  })

  it('回復は遅らせない（ゴーストを出さない）', () => {
    const { tracker, advance } = makeTracker(300, 200)
    tracker.update(250, [])
    expect(tracker.shown).toBe(250)
    advance(1000)
    expect(tracker.shown).toBe(250)
  })

  it('同じバッチでダメージと回復が混ざっても、表示HPは最後に実HPへ一致する', () => {
    const { tracker, advance } = makeTracker(300, 300)
    const plan = planBatch([cardPlayed, dmg('self', 20), { t: 'HEALED', amount: 5 }])
    tracker.update(285, hpStepsFor(plan, 'self'))
    advance(5000)
    expect(tracker.shown).toBe(285)
  })

  it('再開（続きから）・新しい対局では即座に実HPへ合わせる', () => {
    const { tracker, advance } = makeTracker(300, 300)
    const plan = planBatch([cardPlayed, dmg('self', 40)])
    tracker.update(260, hpStepsFor(plan, 'self'))
    expect(tracker.shown).toBe(300)
    tracker.reset(260) // 中断→再開
    expect(tracker.shown).toBe(260)
    advance(5000)
    expect(tracker.shown).toBe(260)
  })

  it('計画の無い減少（想定外）は即時反映して、表示が実HPから離れたまま残らない', () => {
    const { tracker } = makeTracker(300, 300)
    tracker.update(120, null)
    expect(tracker.shown).toBe(120)
  })

  it('flush は保留をすべて解放する（安全弁）', () => {
    const { tracker } = makeTracker(300, 300)
    const plan = planBatch([cardPlayed, dmg('self', 40)])
    tracker.update(260, hpStepsFor(plan, 'self'))
    expect(tracker.shown).toBe(300)
    tracker.flush()
    expect(tracker.shown).toBe(260)
  })

  it('hpBand：50%／25% 以下で「追い詰めた」段階になる', () => {
    expect(hpBand(100, 100)).toBe('high')
    expect(hpBand(51, 100)).toBe('high')
    expect(hpBand(50, 100)).toBe('half')
    expect(hpBand(26, 100)).toBe('half')
    expect(hpBand(25, 100)).toBe('quarter')
    expect(hpBand(0, 100)).toBe('quarter')
  })
})

describe('engine のタイミングは Phase 6-A で変えていない', () => {
  it('カード使用・ラウンド終了の reveal は従来どおり（280ms / 700ms）', async () => {
    const mod = await import('../../hooks/useGameEngine')
    expect(mod.CARD_PLAY_REVEAL_MS).toBe(280)
    expect(mod.ENEMY_TURN_REVEAL_MS).toBe(700)
  })

  it('applyAction は従来どおり、その場で HP を更新する（表示だけが遅れる）', async () => {
    const { applyAction } = await import('../../core/engine')
    const { startTestGame } = await import('../../core/engine/testUtils')
    const state = startTestGame()
    const before = state.enemy.hp
    const card = state.hand.find((c) => c.defId === 'card_common_attack_01') ?? state.hand[0]
    const result = applyAction(state, { type: 'PLAY_CARD', uid: card.uid })
    const dealt = result.events.filter((e) => e.t === 'DAMAGE_DEALT' && e.target === 'enemy').reduce((a, e) => a + (e.t === 'DAMAGE_DEALT' ? e.amount : 0), 0)
    expect(result.state.enemy.hp).toBe(before - dealt)
  })
})

describe('安全弁', () => {
  it('タイマーが遅れても、最後には必ず実HPへ追いつく（背景タブ対策）', () => {
    const { tracker, advance } = makeTracker(300, 300)
    const plan = planBatch([cardPlayed, dmg('self', 30)])
    tracker.update(270, hpStepsFor(plan, 'self'))
    advance(60_000) // 背景タブで大幅に遅延しても
    expect(tracker.shown).toBe(270)
  })

  it('dispose 後もタイマーが残らない', () => {
    const t = makeTracker(300, 300)
    const plan = planBatch([cardPlayed, dmg('self', 30)])
    t.tracker.update(270, hpStepsFor(plan, 'self'))
    expect(t.pending()).toBeGreaterThan(0)
    t.tracker.dispose()
    expect(t.pending()).toBe(0)
  })
})
