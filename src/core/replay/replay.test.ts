import { describe, it, expect } from 'vitest'
import type { CardDefId, CardUid, EnemyId, GodId } from '../types'
import { cardUid, enemyId as toEnemyId } from '../types/ids'
import { RULES } from '../data/rules'
import { GOD_IDS } from '../data/gods'
import { dailyBossFor } from '../data/dailyBoss'
import { ENEMY_IDS } from '../data/enemies'
import { getCardDef } from '../data/cards'
import { getCardPoolForGod, getRecommendedDeck } from '../data/deckBuilder'
import { runReplay } from './replay'
import { playDailyRun } from './replayTestUtils'
import type { ReplayAction, ReplayInput } from './types'

/**
 * Phase 4.1 Step 5（Replay Validation）＋ Step 7（Tamper Tests）。
 *
 * 方針：**エンジンが既に持っている検証を二重実装しない**。
 * 「手札に無い」「AP不足」「順序違反」「決着後の操作」はすべてエンジンの例外で、
 * `runReplay`はそれを`ENGINE_REJECTED`へ翻訳するだけ。したがってここでは
 * 「エンジンの拒否がリプレイの拒否として正しく現れること」を確かめる。
 * リプレイ固有の門番（形式版・action数上限・申告値照合・決着要求）だけを個別に検証する。
 */

const DAILY_KEY = '2026-09-09'
const GOD: GodId = GOD_IDS.ebisu
const DECK = getRecommendedDeck(GOD)
const BOSS = dailyBossFor(DAILY_KEY)

function baseInput(overrides: Partial<ReplayInput> = {}): ReplayInput {
  return {
    version: RULES.replay.formatVersion,
    mode: 'daily',
    dailyKey: DAILY_KEY,
    godId: GOD,
    deck: DECK,
    actions: [],
    ...overrides,
  }
}

/** 正当な完走ログ（tamperの比較基準） */
function honestRun(godId: GodId = GOD, policySeed = 5) {
  const deck = getRecommendedDeck(godId)
  const live = playDailyRun({ dailyKey: DAILY_KEY, godId, deck, policySeed })
  const input = baseInput({ godId, deck, actions: live.actions })
  const result = runReplay(input)
  expect(result.ok).toBe(true)
  return { live, input, result }
}

/** 開始直後の盤面（actions無し・決着要求を外して取得する） */
function initialState() {
  const result = runReplay(baseInput(), { requireFinished: false })
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('初期盤面を取得できませんでした')
  return result.state
}

describe('Replay Validation（Step 5）', () => {
  it('正当なログは受理され、結果をリプレイ側が計算する', () => {
    const { result, live } = honestRun()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.outcome.seed).toBe(BOSS.seed)
    expect(result.outcome.enemyId).toBe(BOSS.enemyId)
    expect(result.outcome.seedId).toBe(BOSS.seedId)
    expect(result.outcome.dailyKey).toBe(DAILY_KEY)
    expect(result.outcome.status).toBe(live.state.status)
  })

  it('存在しないcard uidを拒否する', () => {
    const result = runReplay(
      baseInput({ actions: [{ type: 'PLAY_CARD', uid: cardUid('c999') }] }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('ENGINE_REJECTED')
    expect(result.actionIndex).toBe(0)
    expect(result.message).toContain('手札にないカード')
  })

  it('デッキには在るが手札に無いカードの使用を拒否する', () => {
    const state = initialState()
    const inHand = new Set(state.hand.map((c) => c.uid))
    const notInHand = [...state.deck, ...state.discard].find((c) => !inHand.has(c.uid))
    expect(notInHand, '手札外のカードが見つからない').toBeDefined()
    const result = runReplay(
      baseInput({ actions: [{ type: 'PLAY_CARD', uid: (notInHand as { uid: CardUid }).uid }] }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('ENGINE_REJECTED')
  })

  it('AP不足の使用を拒否する', () => {
    // R1の神力（2）を使い切るまで払えるカードを出し、そのうえでもう1枚出そうとする。
    // 初期手札は5枚あるので、AP切れの時点で必ず手札が残っている。
    const actions: ReplayAction[] = []
    const stateAfter = (list: ReplayAction[]) => {
      const r = runReplay(baseInput({ actions: list }), { requireFinished: false })
      expect(r.ok).toBe(true)
      if (!r.ok) throw new Error(r.message)
      return r.state
    }
    const costOf = (defId: CardDefId, mod?: number) => getCardDef(defId).cost + (mod ?? 0)

    let state = stateAfter(actions)
    for (let guard = 0; guard < 10; guard++) {
      const affordable = state.hand.find((c) => costOf(c.defId, c.costModifier) <= state.ap.current)
      if (!affordable) break
      actions.push({ type: 'PLAY_CARD', uid: affordable.uid })
      state = stateAfter(actions)
    }
    expect(state.hand.length, 'AP切れ時に手札が残っていない').toBeGreaterThan(0)
    const unaffordable = state.hand[0]
    expect(costOf(unaffordable.defId, unaffordable.costModifier)).toBeGreaterThan(state.ap.current)

    const result = runReplay(
      baseInput({ actions: [...actions, { type: 'PLAY_CARD', uid: unaffordable.uid }] }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('ENGINE_REJECTED')
      expect(result.actionIndex).toBe(actions.length)
      expect(result.message).toContain('神力が足りません')
    }
  })

  it('存在しない託宣（不正なtarget）を拒否する', () => {
    const result = runReplay(baseInput({ actions: [{ type: 'USE_DIVINATION', choiceIndex: 99 }] }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('ENGINE_REJECTED')
      expect(result.message).toContain('存在しない託宣')
    }
  })

  it('不正なaction順（同一ラウンドで託宣2回）を拒否する', () => {
    const result = runReplay(
      baseInput({
        actions: [
          { type: 'USE_DIVINATION', choiceIndex: 0 },
          { type: 'USE_DIVINATION', choiceIndex: 0 },
        ],
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('ENGINE_REJECTED')
      expect(result.actionIndex).toBe(1)
      expect(result.message).toContain('1ラウンドに1回')
    }
  })

  it('決着後のactionを拒否する', () => {
    const { input } = honestRun()
    const result = runReplay({
      ...input,
      actions: [...input.actions, { type: 'END_ROUND' }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('ENGINE_REJECTED')
      expect(result.actionIndex).toBe(input.actions.length)
    }
  })

  it('異常に長いaction logを拒否する（エンジンを1手も動かさない）', () => {
    const actions: ReplayAction[] = Array.from(
      { length: RULES.replay.maxActions + 1 },
      () => ({ type: 'END_ROUND' }) as ReplayAction,
    )
    const result = runReplay(baseInput({ actions }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('ACTION_LIMIT')
  })

  it('上限ちょうどのaction数は長さを理由に拒否しない', () => {
    const actions: ReplayAction[] = Array.from(
      { length: RULES.replay.maxActions },
      () => ({ type: 'END_ROUND' }) as ReplayAction,
    )
    const result = runReplay(baseInput({ actions }))
    expect(result.ok).toBe(false)
    // 決着後のEND_ROUNDでエンジンが落ちる＝上限判定ではない
    if (!result.ok) expect(result.code).toBe('ENGINE_REJECTED')
  })

  it('Daily seedの不一致を拒否する', () => {
    const { input } = honestRun()
    const result = runReplay({ ...input, claimedSeed: 'daily-2020-01-01-oni' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('SEED_MISMATCH')
  })

  it('正しいseedの申告は受理する（ただし使うのは再導出値）', () => {
    const { input } = honestRun()
    const result = runReplay({ ...input, claimedSeed: BOSS.seed })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.outcome.seed).toBe(BOSS.seed)
  })

  it('敵の不一致を拒否する', () => {
    // 実在する別の敵（今日のボス以外）を申告しても通らないこと
    const other = Object.values(ENEMY_IDS).find((id) => id !== BOSS.enemyId) as EnemyId
    expect(other).toBeDefined()
    const { input } = honestRun()
    const result = runReplay({ ...input, claimedEnemyId: other })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('ENEMY_MISMATCH')
  })

  it('神とデッキの不整合（他神の専用カード）を拒否する', () => {
    const otherGod = GOD_IDS.sobi
    const otherExclusive = getCardPoolForGod(otherGod).find((c) => c.godId === otherGod)
    expect(otherExclusive).toBeDefined()
    const deck: CardDefId[] = [...DECK]
    deck[0] = (otherExclusive as { id: CardDefId }).id
    const result = runReplay(baseInput({ deck }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('DECK')
      expect(result.message).toContain('使えないカード')
    }
  })

  it('枚数違反のデッキを拒否する', () => {
    const result = runReplay(baseInput({ deck: DECK.slice(0, RULES.deck.size - 1) }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DECK')
  })

  it('報酬ボーナス相当の3枚積みデッキを拒否する（Dailyの編成ルールと同一）', () => {
    const deck = [...DECK]
    // 1種を`maxCopiesPerCard + 1`枚にする
    const target = deck[0]
    let replaced = 0
    for (let i = 1; i < deck.length && replaced < 1; i++) {
      if (deck[i] !== target) {
        deck[i] = target
        replaced++
      }
    }
    const count = deck.filter((id) => id === target).length
    expect(count).toBeGreaterThan(RULES.deckBuilding.maxCopiesPerCard)
    const result = runReplay(baseInput({ deck }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('DECK')
      expect(result.message).toContain(`${RULES.deckBuilding.maxCopiesPerCard}枚まで`)
    }
  })

  it('フォーマット版・mode・日付キーの不正を拒否する', () => {
    const bad = [
      { patch: { version: RULES.replay.formatVersion + 1 }, code: 'FORMAT_VERSION' },
      { patch: { mode: 'normal' as unknown as 'daily' }, code: 'MODE' },
      { patch: { dailyKey: '2026-02-30' }, code: 'DAILY_KEY' },
      { patch: { dailyKey: 'not-a-date' }, code: 'DAILY_KEY' },
    ]
    for (const { patch, code } of bad) {
      const result = runReplay(baseInput(patch as Partial<ReplayInput>))
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.code).toBe(code)
    }
  })

  it('actionsにSTART_GAMEを混ぜる経路を塞ぐ（seed・敵の申告を許さない）', () => {
    const result = runReplay(
      baseInput({
        actions: [
          { type: 'START_GAME', seed: 'hack', godId: GOD, enemyId: BOSS.enemyId, deck: DECK },
        ] as unknown as ReplayAction[],
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('ACTION_TYPE')
      expect(result.actionIndex).toBe(0)
    }
  })

  it('未知のaction typeを拒否する', () => {
    const result = runReplay(
      baseInput({ actions: [{ type: 'GRANT_SCORE', amount: 9999 }] as unknown as ReplayAction[] }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('ACTION_TYPE')
  })

  it('決着していないログを拒否する（既定）／道具用途では許可できる', () => {
    const { input } = honestRun()
    const truncated = { ...input, actions: input.actions.slice(0, 2) }
    expect(runReplay(truncated).ok).toBe(false)
    const asTool = runReplay(truncated, { requireFinished: false })
    expect(asTool.ok).toBe(true)
    if (asTool.ok) expect(asTool.outcome.status).toBe('playing')
  })

  it('形の壊れた入力を拒否する', () => {
    for (const patch of [{ actions: null }, { deck: 'x' }]) {
      const result = runReplay(baseInput(patch as unknown as Partial<ReplayInput>))
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.code).toBe('MALFORMED')
    }
  })
})

describe('Tamper Tests（Step 7）', () => {
  /** 改ざん結果は「拒否される」か「別の正規結果になる」かのどちらかでなければならない */
  function expectRejectedOrDifferent(
    tampered: ReplayInput,
    honest: ReturnType<typeof runReplay>,
    label: string,
  ) {
    const result = runReplay(tampered)
    if (!result.ok) return 'rejected'
    expect(honest.ok).toBe(true)
    if (!honest.ok) return 'rejected'
    // 受理された場合は、必ず改ざん前とは違う正規結果でなければならない
    expect(result.state, `${label}：改ざんしたのに結果が同一になった`).not.toEqual(honest.state)
    return 'different'
  }

  const gods: GodId[] = [GOD_IDS.ebisu, GOD_IDS.sobi, GOD_IDS.saika, GOD_IDS.shouren]

  it('action削除・追加・順序変更のいずれも、拒否されるか別結果になる', () => {
    for (const godId of gods) {
      const { input, result: honest } = honestRun(godId, 9)
      const actions = input.actions
      expect(actions.length).toBeGreaterThan(4)

      // 削除（中間の1手）
      const deleted = [...actions]
      deleted.splice(Math.floor(actions.length / 2), 1)
      expectRejectedOrDifferent({ ...input, actions: deleted }, honest, '削除')

      // 追加（END_ROUNDを中間へ差し込む）
      const added = [...actions]
      added.splice(Math.floor(actions.length / 2), 0, { type: 'END_ROUND' })
      expectRejectedOrDifferent({ ...input, actions: added }, honest, '追加')

      // 順序変更（全反転）
      expectRejectedOrDifferent({ ...input, actions: [...actions].reverse() }, honest, '反転')

      // 順序変更（隣接2手の入れ替え）
      const swapped = [...actions]
      const i = Math.max(0, Math.floor(actions.length / 3))
      ;[swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]]
      expectRejectedOrDifferent({ ...input, actions: swapped }, honest, '入れ替え')
    }
  })

  it('card uidの改ざんを拒否する', () => {
    const { input, result: honest } = honestRun()
    const tampered = input.actions.map((a) =>
      a.type === 'PLAY_CARD' ? { ...a, uid: cardUid('c-tampered') } : a,
    )
    const outcome = expectRejectedOrDifferent({ ...input, actions: tampered }, honest, 'uid改ざん')
    expect(outcome).toBe('rejected')
  })

  it('enemy改ざん・seed改ざんを拒否する', () => {
    const { input, result: honest } = honestRun()
    expect(
      expectRejectedOrDifferent(
        { ...input, claimedEnemyId: toEnemyId('enemy_not_today') },
        honest,
        'enemy改ざん',
      ),
    ).toBe('rejected')
    expect(
      expectRejectedOrDifferent({ ...input, claimedSeed: 'daily-9999-12-31-oni' }, honest, 'seed改ざん'),
    ).toBe('rejected')
  })

  it('日付キーを別日にすり替えると、別の敵・別のseedになり同じ結果にはならない', () => {
    const { input, result: honest } = honestRun()
    const otherKey = '2026-09-10'
    expect(dailyBossFor(otherKey).seed).not.toBe(BOSS.seed)
    expectRejectedOrDifferent({ ...input, dailyKey: otherKey }, honest, '日付すり替え')
  })

  it('deck改ざんを拒否するか、別結果になる', () => {
    const { input, result: honest } = honestRun()
    // ① 不正なデッキ（他神の専用カード）→ 拒否
    const otherGod = GOD_IDS.juraku
    const alien = getCardPoolForGod(otherGod).find((c) => c.godId === otherGod)
    const illegal = [...input.deck]
    illegal[3] = (alien as { id: CardDefId }).id
    expect(expectRejectedOrDifferent({ ...input, deck: illegal }, honest, 'deck不正')).toBe('rejected')

    // ② 合法だが中身の違うデッキ → 受理されても必ず別結果になる
    const legal = [...input.deck]
    const pool = getCardPoolForGod(GOD).map((c) => c.id)
    const swapIn = pool.find((id) => !legal.includes(id))
    expect(swapIn).toBeDefined()
    legal[legal.length - 1] = swapIn as CardDefId
    expectRejectedOrDifferent({ ...input, deck: legal }, honest, 'deck差し替え')
  })

  it('神のすり替えを拒否するか、別結果になる', () => {
    const { input, result: honest } = honestRun()
    expectRejectedOrDifferent({ ...input, godId: GOD_IDS.taiyo }, honest, '神すり替え')
  })

  it('過剰なaction数を拒否する', () => {
    const { input, result: honest } = honestRun()
    const flooded = [
      ...input.actions,
      ...Array.from({ length: RULES.replay.maxActions }, () => ({ type: 'END_ROUND' }) as ReplayAction),
    ]
    const result = runReplay({ ...input, actions: flooded })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('ACTION_LIMIT')
    expect(honest.ok).toBe(true)
  })

  it('クライアントが申告したscore・勝敗・HP・rngCursorは一切使われない', () => {
    const { input, result: honest } = honestRun()
    expect(honest.ok).toBe(true)
    if (!honest.ok) return

    // ReplayInputの型にこれらのフィールドは存在しない。JSONとして紛れ込んでも
    // 無視されることを実行時にも確認する（サーバーが受け取るのはJSONのため）
    const withClaims = {
      ...input,
      score: 999_999,
      win: true,
      status: 'won',
      playerHp: 30,
      enemyHp: 0,
      round: 1,
      rngCursor: 0,
      scoreBreakdown: { total: 999_999 },
    } as unknown as ReplayInput

    const result = runReplay(withClaims)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.outcome).toEqual(honest.outcome)
    expect(result.outcome.score).not.toBe(999_999)
    expect(result.state).toEqual(honest.state)
  })

  it('ReplayInputに結果を申告するフィールドが存在しない（型と実装の両方で塞ぐ）', () => {
    const { input } = honestRun()
    const keys = Object.keys(input)
    for (const forbidden of ['score', 'win', 'status', 'rngCursor', 'playerHp', 'enemyHp', 'round']) {
      expect(keys).not.toContain(forbidden)
    }
    // 受け取ってよいのは開始条件と操作ログ、そして照合専用の2項目だけ
    expect(new Set(keys)).toEqual(
      new Set(['version', 'mode', 'dailyKey', 'godId', 'deck', 'actions']),
    )
  })
})
