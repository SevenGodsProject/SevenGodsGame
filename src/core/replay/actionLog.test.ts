import { describe, it, expect } from 'vitest'
import type { CardDefId, GameState, GodId } from '../types'
import { cardUid } from '../types/ids'
import { RULES } from '../data/rules'
import { GOD_IDS } from '../data/gods'
import { dailyBossFor } from '../data/dailyBoss'
import { getCardPoolForGod, getRecommendedDeck, validateDeck } from '../data/deckBuilder'
import { getFinalScore } from '../engine/score'
import { runReplay } from './replay'
import { applyAndRecord, isLoggableAction, toReplayInput, type DailyRunLog } from './runLog'
import { playRecordedDailyRun } from './replayTestUtils'

/**
 * Phase 4.2 Step 5：**実プレイ経路 → Replay** の統合検証（最重要Gate）。
 *
 * `playRecordedDailyRun` は本番の記録経路 `applyAndRecord` を
 * `useGameEngine.dispatch` と同じ形（try/catchで包み、例外時はstateもlogも進めない）で
 * 呼ぶ。したがってここで比較しているのは「テスト用に作ったログ」ではなく
 * 「本番と同じ関数が出したログ」である。
 *
 * 1件でも原因不明の不一致があればFAIL。
 */

const GODS = Object.values(GOD_IDS)

/** 7連日＝週次巡回1巡。7体の敵・7つのDaily seedを必ず1回ずつ含む */
const DAILY_KEYS = [
  '2026-09-07',
  '2026-09-08',
  '2026-09-09',
  '2026-09-10',
  '2026-09-11',
  '2026-09-12',
  '2026-09-13',
]

const RUN_ID = 'aaaaaaaabbbbccccddddeeeeeeeeeeee'

/** その神で合法な20枚デッキを、offsetを変えて機械的に作る */
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

/** 記録されたログをそのままリプレイし、ライブ結果と突き合わせる */
function expectLiveMatchesReplay(run: { log: DailyRunLog; state: GameState }, label: string) {
  const result = runReplay(toReplayInput(run.log))
  expect(result.ok, `${label}：リプレイが拒否された（${result.ok ? '' : result.code}）`).toBe(true)
  if (!result.ok) return

  // ① GameState全体の構造的完全一致（Phase 4.1と同じ基準）
  expect(result.state, label).toEqual(run.state)

  // ② CEO指定の各項目を個別にも明示検証
  expect(result.state.score).toEqual(run.state.score)
  expect(result.state.player.hp).toBe(run.state.player.hp)
  expect(result.state.enemy.hp).toBe(run.state.enemy.hp)
  expect(result.state.round).toBe(run.state.round)
  expect(result.state.status).toBe(run.state.status)
  expect(result.state.rngCursor).toBe(run.state.rngCursor)
  expect(result.state.resonance).toEqual(run.state.resonance)
  expect(result.state.otomo).toEqual(run.state.otomo)
  expect(result.state.mastery).toEqual(run.state.mastery)
  expect(result.state.deck).toEqual(run.state.deck)
  expect(result.state.hand).toEqual(run.state.hand)
  expect(result.state.discard).toEqual(run.state.discard)

  // ③ 検証済み結果（ランキングが保存する値）
  expect(result.outcome.score).toBe(getFinalScore(run.state.score, run.state.stake))
  expect(result.outcome.win).toBe(run.state.status === 'won')
  expect(result.outcome.rngCursor).toBe(run.state.rngCursor)
  expect(result.outcome.actionCount).toBe(run.log.actions.length)
}

describe('Live → Replay 統合（Step 5）', () => {
  it('7神 × 7敵(Daily seed) × 3デッキ × 3打ち筋 のすべてで完全一致する', () => {
    let cases = 0
    for (const godId of GODS) {
      const decks = [getRecommendedDeck(godId), legalDeck(godId, 0), legalDeck(godId, 5)]
      for (const deck of decks) expect(validateDeck(deck, godId).valid).toBe(true)
      for (const dailyKey of DAILY_KEYS) {
        for (const deck of decks) {
          for (const policySeed of [1, 2, 3]) {
            const run = playRecordedDailyRun({
              dailyKey,
              godId,
              deck,
              policySeed,
              clientRunId: RUN_ID,
            })
            expect(run.state.status, 'ライブ実行が決着していない').not.toBe('playing')
            expectLiveMatchesReplay(run, `${godId}/${dailyKey}/seed${policySeed}`)
            cases++
          }
        }
      }
    }
    expect(cases).toBe(GODS.length * DAILY_KEYS.length * 3 * 3)
  })

  it('託宣あり／なしの両方で完全一致する', () => {
    for (const godId of GODS) {
      for (const useDivination of [true, false]) {
        const run = playRecordedDailyRun({
          dailyKey: DAILY_KEYS[4],
          godId,
          deck: getRecommendedDeck(godId),
          policySeed: 21,
          useDivination,
          clientRunId: RUN_ID,
        })
        expectLiveMatchesReplay(run, `${godId}/divination=${useDivination}`)
      }
    }
  })

  it('OTOMOの絆（guardian / power）を変えても各々完全一致する', () => {
    for (const godId of GODS) {
      for (const otomoGrowthPath of ['guardian', 'power'] as const) {
        const run = playRecordedDailyRun({
          dailyKey: DAILY_KEYS[1],
          godId,
          deck: getRecommendedDeck(godId),
          policySeed: 31,
          otomoGrowthPath,
          clientRunId: RUN_ID,
        })
        expect(run.log.otomoGrowthPath).toBe(otomoGrowthPath)
        expectLiveMatchesReplay(run, `${godId}/${otomoGrowthPath}`)
      }
    }
  })

  it('組み立てたReplayInputが正しいDaily条件を指している', () => {
    const godId = GODS[0]
    const dailyKey = DAILY_KEYS[2]
    const run = playRecordedDailyRun({
      dailyKey,
      godId,
      deck: getRecommendedDeck(godId),
      policySeed: 5,
      clientRunId: RUN_ID,
    })
    const input = toReplayInput(run.log)
    expect(input.version).toBe(RULES.replay.formatVersion)
    expect(input.mode).toBe('daily')
    expect(input.dailyKey).toBe(dailyKey)
    expect(input.godId).toBe(godId)

    const result = runReplay(input)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.outcome.enemyId).toBe(dailyBossFor(dailyKey).enemyId)
      expect(result.outcome.seed).toBe(dailyBossFor(dailyKey).seed)
    }
  })
})

describe('Accepted Action Only（Step 2）', () => {
  it('エンジンに拒否された操作は記録に残らない（誤操作を混ぜても一致する）', () => {
    for (const godId of GODS) {
      const clean = playRecordedDailyRun({
        dailyKey: DAILY_KEYS[3],
        godId,
        deck: getRecommendedDeck(godId),
        policySeed: 41,
        clientRunId: RUN_ID,
      })
      const noisy = playRecordedDailyRun({
        dailyKey: DAILY_KEYS[3],
        godId,
        deck: getRecommendedDeck(godId),
        policySeed: 41,
        clientRunId: RUN_ID,
        injectRejected: true,
      })
      expect(noisy.rejected, `${godId}：拒否される操作が発生していない`).toBeGreaterThan(0)
      // 拒否された操作は記録にもstateにも影響しない＝誤操作の有無で結果が変わらない
      expect(noisy.log.actions).toEqual(clean.log.actions)
      expect(noisy.state).toEqual(clean.state)
      expectLiveMatchesReplay(noisy, `${godId}/noisy`)
    }
  })

  it('拒否された操作ではログもstateも進まない', () => {
    const godId = GODS[0]
    const started = applyAndRecord(
      null,
      {
        type: 'START_GAME',
        seed: dailyBossFor(DAILY_KEYS[0]).seed,
        godId,
        enemyId: dailyBossFor(DAILY_KEYS[0]).enemyId,
        deck: getRecommendedDeck(godId),
        difficulty: 'normal',
        mode: 'daily',
        dailyKey: DAILY_KEYS[0],
      },
      null,
      RUN_ID,
    )
    expect(started.log).not.toBeNull()
    expect((started.log as DailyRunLog).actions).toEqual([])

    expect(() =>
      applyAndRecord(
        started.result.state,
        { type: 'PLAY_CARD', uid: cardUid('c-nope') },
        started.log,
      ),
    ).toThrow()
    // 例外なので呼び出し側は log を差し替えない＝記録は空のまま
    expect((started.log as DailyRunLog).actions).toEqual([])
  })

  it('同じ操作を2回applyしても、記録は呼ばれた回数ぶんしか増えない（二重記録が起きない）', () => {
    const godId = GODS[0]
    const dailyKey = DAILY_KEYS[0]
    const start = applyAndRecord(
      null,
      {
        type: 'START_GAME',
        seed: dailyBossFor(dailyKey).seed,
        godId,
        enemyId: dailyBossFor(dailyKey).enemyId,
        deck: getRecommendedDeck(godId),
        difficulty: 'normal',
        mode: 'daily',
        dailyKey,
      },
      null,
      RUN_ID,
    )
    const log0 = start.log as DailyRunLog
    const uid = start.result.state.hand[0].uid

    // 同じ入力で2回呼んでも、返る値は同じ（純粋関数＝呼び出し回数ぶんしか増えない）
    const a = applyAndRecord(start.result.state, { type: 'PLAY_CARD', uid }, log0)
    const b = applyAndRecord(start.result.state, { type: 'PLAY_CARD', uid }, log0)
    expect(a.log).toEqual(b.log)
    expect((a.log as DailyRunLog).actions.length).toBe(1)
    // 元のログは変更されない（追記ではなく新しい配列を返す）
    expect(log0.actions.length).toBe(0)

    // 二度押し（同じuidをもう一度）はエンジンが拒否するので記録は増えない
    expect(() =>
      applyAndRecord(a.result.state, { type: 'PLAY_CARD', uid }, a.log),
    ).toThrow()
  })

  it('START_GAMEは記録に含めない／通常モードでは記録しない', () => {
    const godId = GODS[0]
    expect(isLoggableAction({ type: 'END_ROUND' })).toBe(true)
    expect(isLoggableAction({ type: 'PLAY_CARD', uid: cardUid('c0') })).toBe(true)
    expect(isLoggableAction({ type: 'USE_DIVINATION', choiceIndex: 0 })).toBe(true)
    expect(
      isLoggableAction({
        type: 'START_GAME',
        seed: 's',
        godId,
        enemyId: dailyBossFor(DAILY_KEYS[0]).enemyId,
        deck: [],
      }),
    ).toBe(false)

    // 通常モード（modeを渡さない）はログを作らない
    const normal = applyAndRecord(
      null,
      {
        type: 'START_GAME',
        seed: 'normal-seed',
        godId,
        enemyId: dailyBossFor(DAILY_KEYS[0]).enemyId,
        deck: getRecommendedDeck(godId),
        difficulty: 'normal',
      },
      null,
      RUN_ID,
    )
    expect(normal.log).toBeNull()

    // 記録が無い状態で操作しても、途中から記録を始めたりしない
    const next = applyAndRecord(
      normal.result.state,
      { type: 'PLAY_CARD', uid: normal.result.state.hand[0].uid },
      null,
    )
    expect(next.log).toBeNull()
  })

  it('clientRunIdが無ければ記録を作らない（推測可能なIDを勝手に発行しない）', () => {
    const godId = GODS[0]
    const started = applyAndRecord(
      null,
      {
        type: 'START_GAME',
        seed: dailyBossFor(DAILY_KEYS[0]).seed,
        godId,
        enemyId: dailyBossFor(DAILY_KEYS[0]).enemyId,
        deck: getRecommendedDeck(godId),
        difficulty: 'normal',
        mode: 'daily',
        dailyKey: DAILY_KEYS[0],
      },
      null,
    )
    expect(started.log).toBeNull()
    expect(started.result.state.status).toBe('playing')
  })
})

describe('Privacy / Payload（Step 9）', () => {
  it('ReplayInputはゲーム検証に必要な項目だけを持つ', () => {
    const godId = GODS[0]
    const run = playRecordedDailyRun({
      dailyKey: DAILY_KEYS[0],
      godId,
      deck: getRecommendedDeck(godId),
      policySeed: 9,
      clientRunId: RUN_ID,
    })
    const input = toReplayInput(run.log)
    expect(new Set(Object.keys(input))).toEqual(
      new Set(['version', 'mode', 'dailyKey', 'godId', 'deck', 'otomoGrowthPath', 'actions']),
    )
    // clientRunIdはReplayInputには入らない（送信時に別フィールドとして添える）
    expect(Object.keys(input)).not.toContain('clientRunId')
  })

  it('payloadに個人情報・端末情報・結果の自己申告が混ざらない', () => {
    const godId = GODS[0]
    const run = playRecordedDailyRun({
      dailyKey: DAILY_KEYS[0],
      godId,
      deck: getRecommendedDeck(godId),
      policySeed: 9,
      clientRunId: RUN_ID,
    })
    const json = JSON.stringify(toReplayInput(run.log))
    for (const forbidden of [
      'email',
      '@',
      'userAgent',
      'navigator',
      'cookie',
      'ip',
      'fingerprint',
      'timezone',
      'localStorage',
    ]) {
      expect(json.toLowerCase(), `payloadに ${forbidden} が含まれている`).not.toContain(
        forbidden.toLowerCase(),
      )
    }
    // 結果の自己申告フィールドも存在しない
    const keys = Object.keys(toReplayInput(run.log))
    for (const forbidden of ['score', 'win', 'status', 'playerHp', 'enemyHp', 'round', 'rngCursor', 'seed']) {
      expect(keys).not.toContain(forbidden)
    }
  })

  it('行動ログの1件1件も、操作の種類と対象だけしか持たない', () => {
    const godId = GODS[0]
    const run = playRecordedDailyRun({
      dailyKey: DAILY_KEYS[0],
      godId,
      deck: getRecommendedDeck(godId),
      policySeed: 9,
      clientRunId: RUN_ID,
    })
    const allowed: Record<string, string[]> = {
      PLAY_CARD: ['type', 'uid'],
      END_ROUND: ['type'],
      USE_DIVINATION: ['type', 'choiceIndex'],
    }
    for (const action of run.log.actions) {
      expect(Object.keys(action).sort()).toEqual(allowed[action.type].sort())
    }
    // タイムスタンプも持たない（提出時刻は順位を決めないため、ログにも要らない）
    expect(JSON.stringify(run.log.actions)).not.toContain('at"')
  })
})
