import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { RULES } from '../../core/data/rules'
import { dailyKeyOf } from '../../core/data/dailyBoss'
import { derivePlayerId, isPlayerId, isPlayerSecret, verifyIdentity } from './identity'
import { createMemoryRankingStore } from './store'
import { startRun } from './start'
import { makeIdentity, runId, type TestIdentity } from './rankingTestUtils'

/**
 * Phase 4.6 PSF-1（決定139 §3）：匿名identityの照合。
 *
 * ★塞ぐもの
 * `playerId` はリーダーボードで**公開**される。Phase 4.5 まではそれが唯一の資格情報
 * だったため、上位者のIDを名乗って提出枠とレート制限を食い潰す嫌がらせ（T1）が成立した。
 *
 * ★塞がないもの
 * identity の量産（sybil, T3）。匿名を保つ以上、原理的に防げない。
 * ここでは「防げないこと」も明示的にテストで記録しておく（後から読む人が
 * 「対策したつもり」で誤解しないように）。
 */

const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAILY_KEY = dailyKeyOf(new Date(NOW))

const store = createMemoryRankingStore()
const deps = { store, now: NOW }

let me: TestIdentity
let other: TestIdentity

beforeAll(async () => {
  me = await makeIdentity('identity-me')
  other = await makeIdentity('identity-other')
})

beforeEach(() => store.clear())

describe('公開IDの導出', () => {
  it('公開IDは秘密のSHA-256の先頭32桁（決定論・既存の形式と互換）', async () => {
    const id = await derivePlayerId('a'.repeat(RULES.ranking.playerSecretLength))
    expect(id).toHaveLength(RULES.ranking.playerIdLength)
    expect(id).toMatch(/^[0-9a-f]+$/)
    expect(await derivePlayerId('a'.repeat(RULES.ranking.playerSecretLength))).toBe(id)
    expect(isPlayerId(id)).toBe(true)
  })

  it('秘密が1文字違えば公開IDは別物になる', async () => {
    const base = 'a'.repeat(RULES.ranking.playerSecretLength)
    const changed = `b${base.slice(1)}`
    expect(await derivePlayerId(changed)).not.toBe(await derivePlayerId(base))
  })

  it('公開IDから秘密は導けない（長さが違い、逆算もできない）', async () => {
    const id = await derivePlayerId(me.playerSecret)
    expect(id).toBe(me.playerId)
    expect(id.length).toBeLessThan(me.playerSecret.length)
    // 公開IDをそのまま秘密として名乗っても通らない
    expect(await verifyIdentity(me.playerId, me.playerId)).toBe(false)
  })

  it('形式の検査：長さ・文字種が違えば受け付けない', () => {
    expect(isPlayerSecret('a'.repeat(RULES.ranking.playerSecretLength))).toBe(true)
    expect(isPlayerSecret('a'.repeat(RULES.ranking.playerSecretLength - 1))).toBe(false)
    expect(isPlayerSecret(`A${'a'.repeat(RULES.ranking.playerSecretLength - 1)}`)).toBe(false)
    expect(isPlayerSecret('user@example.com')).toBe(false)
    expect(isPlayerSecret(null)).toBe(false)
    expect(isPlayerId('short')).toBe(false)
    expect(isPlayerId(undefined)).toBe(false)
  })
})

describe('照合', () => {
  it('正しい組み合わせだけを受け入れる', async () => {
    expect(await verifyIdentity(me.playerId, me.playerSecret)).toBe(true)
    expect(await verifyIdentity(me.playerId, other.playerSecret)).toBe(false)
    expect(await verifyIdentity(other.playerId, me.playerSecret)).toBe(false)
  })

  it('★公開IDだけを知っていても他人の枠は消費できない（griefingを塞ぐ）', async () => {
    // 被害者が1枠使う
    const victim = await startRun({ ...other, clientRunId: runId('victim') }, deps)
    expect(victim.ok).toBe(true)

    // 攻撃者はボードで公開されている playerId を知っているが、秘密は知らない
    for (let i = 0; i < 10; i++) {
      const attack = await startRun(
        { playerId: other.playerId, playerSecret: me.playerSecret, clientRunId: runId(`atk-${i}`) },
        deps,
      )
      expect(attack.ok).toBe(false)
      if (!attack.ok) expect(attack.code).toBe('BAD_IDENTITY')
    }

    // 被害者の枠は1つのまま、進行中の挑戦も生きている
    const tickets = await store.listTickets(DAILY_KEY, other.playerId)
    expect(tickets).toHaveLength(1)
    expect(tickets[0].closedReason).toBeNull()
  })

  it('身元が確認できないリクエストはDBへ何も書かない', async () => {
    for (let i = 0; i < 50; i++) {
      await startRun(
        { playerId: me.playerId, playerSecret: 'f'.repeat(64), clientRunId: runId(`spam-${i}`) },
        deps,
      )
    }
    expect(await store.listTickets(DAILY_KEY, me.playerId)).toEqual([])
    expect(await store.listDayRuns(DAILY_KEY)).toEqual([])
    expect(await store.countAttempts(DAILY_KEY, me.playerId)).toBe(0)
  })
})

describe('残余リスク：sybil（防げないことを明示的に記録する）', () => {
  it('identityを量産すれば枠も量産できる（匿名である以上ふさげない）', async () => {
    const identities = await Promise.all(
      Array.from({ length: 20 }, (_, i) => makeIdentity(`sybil-${i}`)),
    )
    for (const identity of identities) {
      const started = await startRun({ ...identity, clientRunId: runId(identity.playerId) }, deps)
      expect(started.ok).toBe(true)
    }
    // 20人ぶんの枠が立つ。緩和はedge側のレート制限（決定139 §7-2）であって、
    // アプリ側では止められない。この事実をテストとして固定しておく
    const distinct = new Set(identities.map((i) => i.playerId))
    expect(distinct.size).toBe(20)
    for (const identity of identities) {
      expect((await store.listTickets(DAILY_KEY, identity.playerId)).length).toBe(1)
    }
  })

  it('ただし1つのidentityが作れる枠は上限どまり（量産しない限り増えない）', async () => {
    for (let i = 0; i < RULES.daily.attemptsPerDay; i++) {
      expect((await startRun({ ...me, clientRunId: runId(`n-${i}`) }, deps)).ok).toBe(true)
    }
    const extra = await startRun({ ...me, clientRunId: runId('n-extra') }, deps)
    expect(extra.ok).toBe(false)
    if (!extra.ok) expect(extra.code).toBe('ATTEMPTS_EXCEEDED')
  })
})
