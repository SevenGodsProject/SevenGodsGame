import { afterEach, describe, expect, it } from 'vitest'
import { RULES } from '../data/rules'
import { GOD_IDS } from '../data/gods'
import { ENEMY_IDS } from '../data/enemies'
import { ALL_CARDS, CARD_IDS, SHOUREN_CARD_IDS, SOBI_CARD_IDS } from '../data/cards'
import { getCardPoolForGod } from '../data/deckBuilder'
import { cardUid } from '../types/ids'
import type { CardDefId, GameState, GodId } from '../types'
import { applyAction } from './reducer'
import { evaluateBonusCond, incomingDamage, previewBonusTrigger } from './cardBonus'

/**
 * カードの条件付き追加効果（bonus）のテスト。
 *
 * Phase 3「神格」FINAL SPEC v0.1 で神専用4枚（不動の構え・一喝・福袋・笑って許す）に導入し、
 * **Phase 5-A（決定153）で共通の主力16枚へ広げた**。合計20枚で、残る40枚は無変更。
 * 「本体効果 → 条件評価 → 追加効果」の順序と、AP・共鳴・BURST・予告との
 * 相互作用が既存挙動を壊していないことを確認する。
 */

const TEST_UID = cardUid('t-card')

function deckWith(godId: GodId, cards: CardDefId[]): CardDefId[] {
  const deck = [...cards]
  for (const card of getCardPoolForGod(godId)) {
    while (
      deck.length < RULES.deck.size &&
      deck.filter((x) => x === card.id).length < RULES.deckBuilding.maxCopiesPerCard
    ) {
      deck.push(card.id)
    }
  }
  return deck.slice(0, RULES.deck.size)
}

function startGame(godId: GodId, seed = 'bonus-test'): GameState {
  return applyAction(null, {
    type: 'START_GAME',
    seed,
    godId,
    enemyId: ENEMY_IDS.trial,
    deck: deckWith(godId, []),
  }).state
}

function withHand(state: GameState, defId: CardDefId, patch: Partial<GameState> = {}): GameState {
  return {
    ...state,
    ap: { current: 9, max: 9 },
    hand: [{ uid: TEST_UID, defId }],
    ...patch,
  }
}

const play = (state: GameState) => applyAction(state, { type: 'PLAY_CARD', uid: TEST_UID })

/** kill switch はテスト内で一時的に切り替える（`as const`のため実行時のみ書き換え） */
const mutableRules = RULES as unknown as {
  godIdentity: { passivesEnabled: boolean; cardBonusEnabled: boolean }
}
afterEach(() => {
  mutableRules.godIdentity.passivesEnabled = true
  mutableRules.godIdentity.cardBonusEnabled = true
})

describe('bonusを持つカードのデータ（scope外へ広がっていないこと）', () => {
  it('条件付き追加効果を持つのは神専用4枚＋共通16枚の計20枚で、残り40枚は無変更', () => {
    const withBonus = ALL_CARDS.filter((c) => c.bonus)
    expect(withBonus.map((c) => c.id).sort()).toEqual(
      [
        // Phase 3：神専用4枚
        SOBI_CARD_IDS.unshakableStance,
        SOBI_CARD_IDS.sternRebuke,
        SHOUREN_CARD_IDS.bagOfFortune,
        SHOUREN_CARD_IDS.laughItOff,
        // Phase 5-A（決定153）：共通の主力16枚
        CARD_IDS.strike,
        CARD_IDS.heavyBlow,
        CARD_IDS.guard,
        CARD_IDS.resonate,
        CARD_IDS.heal,
        CARD_IDS.curse,
        CARD_IDS.quickStrike,
        CARD_IDS.allOutStrike,
        CARD_IDS.ironStance,
        CARD_IDS.readTheAttack,
        CARD_IDS.kaguraDance,
        CARD_IDS.flurry,
        CARD_IDS.warCry,
        CARD_IDS.parry,
        CARD_IDS.bastion,
        CARD_IDS.renGeki,
      ].sort(),
    )
    expect(withBonus.length).toBe(20)
    expect(ALL_CARDS.length - withBonus.length).toBe(40)
  })

  it('共通カードのbonusは4条件のどれかで、神専用の条件（lowHp）を共通へ広げていない', () => {
    const commonWithBonus = ALL_CARDS.filter((c) => c.bonus && !c.godId)
    for (const card of commonWithBonus) {
      expect(['blocked', 'enemyBig', 'combo', 'charged']).toContain(card.bonus!.when)
    }
    // 4条件がすべて使われている（1条件だけに偏っていない）
    const used = new Set(commonWithBonus.map((c) => c.bonus!.when))
    expect([...used].sort()).toEqual(['blocked', 'charged', 'combo', 'enemyBig'])
  })

  it('bonusを足した16枚は、本体のコスト・効果を1つも変えていない（Phase 5-A の約束）', () => {
    // 本体（cost / effects）はPhase 5-A で据え置く、という取り決めの機械検査。
    // 値そのものは `cardTextScale.test.ts` が本文と突き合わせているので、ここでは
    // 「bonus を足したせいで本体が動いていないか」だけを、代表的な札で確かめる。
    const byId = new Map(ALL_CARDS.map((c) => [c.id, c]))
    const expected: Array<[CardDefId, number, number]> = [
      // [id, cost, 本体effectsの件数]
      [CARD_IDS.strike, 1, 1],
      [CARD_IDS.heavyBlow, 2, 1],
      [CARD_IDS.guard, 1, 1],
      [CARD_IDS.resonate, 1, 1],
      [CARD_IDS.heal, 1, 1],
      [CARD_IDS.curse, 2, 1],
      [CARD_IDS.quickStrike, 1, 2],
      [CARD_IDS.allOutStrike, 3, 1],
      [CARD_IDS.ironStance, 2, 1],
      [CARD_IDS.readTheAttack, 1, 1],
      [CARD_IDS.kaguraDance, 2, 2],
      [CARD_IDS.flurry, 2, 2],
      [CARD_IDS.warCry, 3, 2],
      [CARD_IDS.parry, 1, 2],
      [CARD_IDS.bastion, 2, 2],
      [CARD_IDS.renGeki, 2, 2],
    ]
    for (const [id, cost, effectCount] of expected) {
      const card = byId.get(id)!
      expect(card.cost, `${card.name} のコスト`).toBe(cost)
      expect(card.effects.length, `${card.name} の本体効果の数`).toBe(effectCount)
    }
  })

  it('bonusの説明文（textJa）は必ず入っていて、本体textとは別行になっている', () => {
    for (const card of ALL_CARDS) {
      if (!card.bonus) continue
      expect(card.bonus.textJa.length).toBeGreaterThan(0)
      expect(card.text.includes(card.bonus.textJa)).toBe(false)
      expect(card.bonus.effects.length).toBeGreaterThan(0)
    }
  })
})

describe('条件 blocked（不動の構え・笑って許す）', () => {
  it('ブロックが敵の予告以上になったら追加ダメージが出る', () => {
    const base = startGame(GOD_IDS.sobi)
    const state = withHand(base, SOBI_CARD_IDS.unshakableStance) // block 13 / 予告5
    const before = state.enemy.hp

    const { state: after, events } = play(state)

    expect(after.player.block).toBe(13)
    expect(before - after.enemy.hp).toBe(6)
    expect(events.find((e) => e.t === 'BONUS_TRIGGERED')).toEqual({
      t: 'BONUS_TRIGGERED',
      defId: SOBI_CARD_IDS.unshakableStance,
      when: 'blocked',
    })
  })

  it('予告に届かなければ本体効果だけ（追加ダメージなし）', () => {
    const base = startGame(GOD_IDS.sobi)
    const state = withHand(base, SOBI_CARD_IDS.unshakableStance, {
      enemy: { ...base.enemy, intent: { kind: 'attack', amount: 20 } },
    })
    const before = state.enemy.hp

    const { state: after, events } = play(state)

    expect(after.player.block).toBe(13)
    expect(after.enemy.hp).toBe(before)
    expect(events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(false)
  })

  it('境界値：予告ちょうど（13）で成立し、1多い（14）と不成立', () => {
    const base = startGame(GOD_IDS.sobi)
    const exact = withHand(base, SOBI_CARD_IDS.unshakableStance, {
      enemy: { ...base.enemy, intent: { kind: 'attack', amount: 13 } },
    })
    const over = withHand(base, SOBI_CARD_IDS.unshakableStance, {
      enemy: { ...base.enemy, intent: { kind: 'attack', amount: 14 } },
    })
    expect(exact.enemy.hp - play(exact).state.enemy.hp).toBe(6)
    expect(over.enemy.hp - play(over).state.enemy.hp).toBe(0)
  })

  it('既に持っているブロックも合算して判定する', () => {
    const base = startGame(GOD_IDS.sobi)
    const state = withHand(base, SOBI_CARD_IDS.unshakableStance, {
      player: { ...base.player, block: 5 },
      enemy: { ...base.enemy, intent: { kind: 'attack', amount: 18 } },
    })
    expect(state.enemy.hp - play(state).state.enemy.hp).toBe(6)
  })

  it('溜め（charge）＝予告0のラウンドでは成立しない（守るだけで得をする抜け道を作らない）', () => {
    const base = startGame(GOD_IDS.sobi)
    const state = withHand(base, SOBI_CARD_IDS.unshakableStance, {
      enemy: { ...base.enemy, intent: { kind: 'charge', label: '溜め' } },
    })
    expect(incomingDamage(state)).toBe(0)
    expect(state.enemy.hp - play(state).state.enemy.hp).toBe(0)
  })

  it('笑って許す：成立時はカードを1枚引く（本体は回復4＋ブロック4）', () => {
    const base = startGame(GOD_IDS.shouren)
    const state = withHand(base, SHOUREN_CARD_IDS.laughItOff, {
      player: { ...base.player, hp: 20, block: 2 },
    })

    const { state: after, events } = play(state)

    expect(after.player.hp).toBe(24)
    expect(after.player.block).toBe(6) // 2 + 4 ≥ 予告5
    expect(after.hand).toHaveLength(1) // 使った1枚が抜け、bonusで1枚引いた
    const order = events.map((e) => e.t)
    expect(order.indexOf('HEALED')).toBeLessThan(order.indexOf('BONUS_TRIGGERED'))
    expect(order.indexOf('BLOCK_GAINED')).toBeLessThan(order.indexOf('BONUS_TRIGGERED'))
    expect(order.indexOf('BONUS_TRIGGERED')).toBeLessThan(order.lastIndexOf('CARD_DRAWN'))
  })
})

describe('条件 enemyBig（一喝）', () => {
  it('敵の予告が閾値以上なら追加ダメージ、下回れば本体のデバフだけ', () => {
    const base = startGame(GOD_IDS.sobi)
    const big = withHand(base, SOBI_CARD_IDS.sternRebuke, {
      enemy: { ...base.enemy, intent: { kind: 'attack', amount: RULES.cardBonus.enemyBigThreshold } },
    })
    const small = withHand(base, SOBI_CARD_IDS.sternRebuke, {
      enemy: {
        ...base.enemy,
        intent: { kind: 'attack', amount: RULES.cardBonus.enemyBigThreshold - 1 },
      },
    })

    const bigResult = play(big)
    expect(big.enemy.hp - bigResult.state.enemy.hp).toBe(6)
    expect(bigResult.state.enemy.buffs).toHaveLength(1) // 本体のデバフは常に入る

    const smallResult = play(small)
    expect(small.enemy.hp - smallResult.state.enemy.hp).toBe(0)
    expect(smallResult.state.enemy.buffs).toHaveLength(1)
  })

  it('連撃・必殺技の合計値でも判定される（1発ずつではない）', () => {
    const base = startGame(GOD_IDS.sobi)
    const state = withHand(base, SOBI_CARD_IDS.sternRebuke, {
      enemy: { ...base.enemy, intent: { kind: 'multiAttack', hits: [4, 4, 4], name: '双牙乱撃' } },
    })
    expect(incomingDamage(state)).toBe(12)
    expect(state.enemy.hp - play(state).state.enemy.hp).toBe(6)
  })
})

describe('条件 lowHp（福袋）', () => {
  it('HPが半分以下なら共鳴+2、上回れば本体の回復だけ', () => {
    const base = startGame(GOD_IDS.shouren)
    const half = Math.floor(base.player.maxHp * RULES.cardBonus.lowHpRatio)

    const low = withHand(base, SHOUREN_CARD_IDS.bagOfFortune, {
      player: { ...base.player, hp: half },
    })
    const high = withHand(base, SHOUREN_CARD_IDS.bagOfFortune, {
      player: { ...base.player, hp: half + 1 },
    })

    expect(play(low).state.resonance.value).toBe(2)
    expect(play(high).state.resonance.value).toBe(0)
  })

  it('共鳴が満タンに届けばBURSTまで通る（既存の自動発動をそのまま使う）', () => {
    const base = startGame(GOD_IDS.shouren)
    const state = withHand(base, SHOUREN_CARD_IDS.bagOfFortune, {
      player: { ...base.player, hp: 10 },
      resonance: { ...base.resonance, value: RULES.resonance.max - 2 },
    })

    const { state: after, events } = play(state)

    expect(events.some((e) => e.t === 'RESONANCE_BURST')).toBe(true)
    expect(after.resonance.value).toBe(0)
    expect(after.otomo.form).toBe('incarnate') // BURSTでOTOMOが1段成長
  })
})

describe('既存挙動との相互作用', () => {
  it('追加効果はAPを消費しない（コストは本体のまま）', () => {
    const base = startGame(GOD_IDS.sobi)
    const state = withHand(base, SOBI_CARD_IDS.unshakableStance)
    const { state: after } = play(state)
    expect(after.ap.current).toBe(9 - 2)
    expect(after.totalApSpent).toBe(2)
  })

  it('追加効果は連携（combo）スコアの枚数に数えない（1枚は1枚のまま）', () => {
    const base = startGame(GOD_IDS.sobi)
    const state = withHand(base, SOBI_CARD_IDS.unshakableStance)
    const { state: after } = play(state)
    expect(after.cardsPlayedThisRound).toBe(1)
    expect(after.score.combo).toBe(0)
  })

  it('bonusを持たない既存カードの挙動は変わらない（神速：ダメージ3と共鳴1だけ）', () => {
    // Phase 5-A で守護にもbonusが付いたため、例示を「今もbonusを持たない札」へ差し替えた。
    // 検査の意図は変わらない：bonus未設定のカードは追加効果を1つも起こさない。
    const base = startGame(GOD_IDS.sobi)
    const windStep = getCardPoolForGod(GOD_IDS.sobi).find((c) => c.name === '神速')!
    expect(windStep.bonus).toBeUndefined()
    const state = withHand(base, windStep.id)
    const { state: after, events } = play(state)
    expect(base.enemy.hp - after.enemy.hp).toBe(3)
    expect(after.resonance.value).toBe(base.resonance.value + 1)
    expect(events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(false)
  })

  it('同じ種を同じ手順で再生すると完全に同じ盤面になる（bonusのドローを含む決定論）', () => {
    const build = () => {
      const base = startGame(GOD_IDS.shouren, 'determinism-seed')
      return withHand(base, SHOUREN_CARD_IDS.laughItOff, {
        player: { ...base.player, hp: 20, block: 2 },
      })
    }
    const a = play(build()).state
    const b = play(build()).state
    expect(a).toEqual(b)
    expect(a.rngCursor).toBeGreaterThanOrEqual(build().rngCursor)
  })

  it('previewBonusTrigger（手札の強調表示）はengineの判定と一致する', () => {
    const base = startGame(GOD_IDS.sobi)
    const card = getCardPoolForGod(GOD_IDS.sobi).find((c) => c.id === SOBI_CARD_IDS.unshakableStance)!

    const willTrigger = withHand(base, card.id)
    expect(previewBonusTrigger(willTrigger, card)).toBe(true)
    expect(play(willTrigger).events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(true)

    const wontTrigger = withHand(base, card.id, {
      enemy: { ...base.enemy, intent: { kind: 'attack', amount: 30 } },
    })
    expect(previewBonusTrigger(wontTrigger, card)).toBe(false)
    expect(play(wontTrigger).events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(false)

    const noBonusCard = getCardPoolForGod(GOD_IDS.sobi).find((c) => c.name === '神速')!
    expect(previewBonusTrigger(willTrigger, noBonusCard)).toBe(false)
  })

  it('evaluateBonusCondは使用前・使用後の盤面を正しく使い分ける', () => {
    const base = startGame(GOD_IDS.sobi)
    const after: GameState = { ...base, player: { ...base.player, block: 99 } }
    // blocked は「後」の盤面のブロックで判定する
    expect(evaluateBonusCond('blocked', base, base)).toBe(false)
    expect(evaluateBonusCond('blocked', base, after)).toBe(true)
    // lowHp / enemyBig は「前」の盤面だけで決まる
    expect(evaluateBonusCond('lowHp', base, after)).toBe(false)
    expect(
      evaluateBonusCond(
        'lowHp',
        { ...base, player: { ...base.player, hp: 10 } },
        base,
      ),
    ).toBe(true)
  })
})

describe('kill switch（RULES.godIdentity）', () => {
  it('cardBonusEnabled=false で追加効果が完全に止まる', () => {
    mutableRules.godIdentity.cardBonusEnabled = false
    const base = startGame(GOD_IDS.sobi)
    const state = withHand(base, SOBI_CARD_IDS.unshakableStance)
    const { state: after, events } = play(state)
    expect(after.player.block).toBe(13) // 本体効果はそのまま
    expect(after.enemy.hp).toBe(base.enemy.hp) // 追加ダメージは無い
    expect(events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(false)
  })

  it('passivesEnabled=false で得意技が完全に止まる', () => {
    mutableRules.godIdentity.passivesEnabled = false
    const base = startGame(GOD_IDS.sobi)
    const state: GameState = { ...base, player: { ...base.player, block: 20 } }
    const { state: after, events } = applyAction(state, { type: 'END_ROUND' })
    expect(after.enemy.hp).toBe(base.enemy.hp)
    expect(events.some((e) => e.t === 'PASSIVE_TRIGGERED')).toBe(false)
  })

  it('両方offなら、Phase 3で追加したイベントは1件も出ない', () => {
    mutableRules.godIdentity.passivesEnabled = false
    mutableRules.godIdentity.cardBonusEnabled = false
    let state = startGame(GOD_IDS.shouren, 'killswitch-seed')
    const seen: string[] = []
    for (let i = 0; i < 7 && state.status === 'playing'; i++) {
      const first = state.hand[0]
      if (first) {
        const r = applyAction({ ...state, ap: { current: 9, max: 9 } }, { type: 'PLAY_CARD', uid: first.uid })
        state = r.state
        seen.push(...r.events.map((e) => e.t))
      }
      if (state.status !== 'playing') break
      const r2 = applyAction(state, { type: 'END_ROUND' })
      state = r2.state
      seen.push(...r2.events.map((e) => e.t))
    }
    expect(seen).not.toContain('BONUS_TRIGGERED')
    expect(seen).not.toContain('PASSIVE_TRIGGERED')
  })
})
