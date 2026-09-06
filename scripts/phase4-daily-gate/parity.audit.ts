/**
 * Step 2 — Production Daily Condition Reconstruction の検証。
 *
 * CEO撤退基準「simulationがproduction engineと一致しない」を機械的に潰すための監査。
 * ハーネスが本番Dailyと同じ条件で回っていることを、`resolveDailyStart` の戻り値と
 * 生成された GameState の実測値の両方で確認する。
 */
import { describe, expect, it } from 'vitest'
import { applyAction } from '../../src/core/engine/reducer'
import { getEnemyDef } from '../../src/core/data/enemies'
import { getRecommendedDeck } from '../../src/core/data/deckBuilder'
import { dailyBossFor, dailyKeyOf } from '../../src/core/data/dailyBoss'
import { resolveDailyStart } from '../../src/hooks/startDaily'
import { RULES } from '../../src/core/data/rules'
import {
  dateKeysByEnemy,
  dateKeysFrom,
  GOD_ORDER,
  heuristicAgent,
  runDailyGame,
} from './dailyHarness'

const SAMPLE_DAYS = dateKeysFrom('2026-09-07', 28)

describe('Daily条件の再現（production parity）', () => {
  it('開始条件は本番と同じ resolveDailyStart が決めている', () => {
    for (const dateKey of SAMPLE_DAYS) {
      const daily = resolveDailyStart(dateKey)
      const boss = dailyBossFor(dateKey)
      expect(daily.mode).toBe('daily')
      expect(daily.dailyKey).toBe(dateKey)
      expect(daily.enemyId).toBe(boss.enemyId)
      expect(daily.seed).toBe(boss.seed)
      expect(daily.seed).toBe(`daily-${dateKey}-${boss.enemyId}`)
      // 神階なし・難易度ふつう固定
      expect(daily.difficulty).toBe('normal')
      expect(daily.modifier).toEqual(RULES.daily.modifier)
    }
  })

  it('神域強化は 敵HP×1.25 / 攻撃×1.15 として実際に効いている', () => {
    expect(RULES.daily.modifier.enemyHpMul).toBe(1.25)
    expect(RULES.daily.modifier.enemyAtkMul).toBe(1.15)

    for (const dateKey of SAMPLE_DAYS.slice(0, 7)) {
      const daily = resolveDailyStart(dateKey)
      const def = getEnemyDef(daily.enemyId)
      const { state } = applyAction(null, {
        type: 'START_GAME',
        seed: daily.seed,
        godId: GOD_ORDER[0],
        enemyId: daily.enemyId,
        deck: getRecommendedDeck(GOD_ORDER[0]),
        difficulty: daily.difficulty,
        mode: daily.mode,
        dailyKey: daily.dailyKey,
        modifier: daily.modifier,
      })
      const normalMul = RULES.difficulty.normal.enemyHpMultiplier
      expect(state.enemy.maxHp).toBe(Math.round(def.maxHp * normalMul * RULES.daily.modifier.enemyHpMul))
      // 神階は使わない → stake は state に載らない
      expect(state.stake).toBeUndefined()
      expect(state.mode).toBe('daily')
      expect(state.dailyKey).toBe(dateKey)
      expect(state.modifier).toEqual(RULES.daily.modifier)
    }
  })

  it('JSTリセット：日付キーはUTC+9で切り替わる', () => {
    // 2026-09-07 14:59:59Z = JST 23:59:59 → まだ 9/7
    expect(dailyKeyOf(new Date('2026-09-07T14:59:59Z'))).toBe('2026-09-07')
    // 2026-09-07 15:00:00Z = JST 翌0:00 → 9/8
    expect(dailyKeyOf(new Date('2026-09-07T15:00:00Z'))).toBe('2026-09-08')
  })

  it('週次巡回：連続7日で7体が必ず1回ずつ出る', () => {
    for (let w = 0; w < 4; w++) {
      const week = SAMPLE_DAYS.slice(w * 7, w * 7 + 7)
      const enemies = week.map((k) => dailyBossFor(k).enemyId)
      expect(new Set(enemies).size).toBe(7)
    }
  })

  it('28日ぶんで、7体それぞれに同数の実Dailyシードが割り当たる', () => {
    const byEnemy = dateKeysByEnemy(SAMPLE_DAYS)
    expect(byEnemy.size).toBe(7)
    for (const [, keys] of byEnemy) expect(keys.length).toBe(4)
  })

  it('決定論：同じ日・同じ神・同じデッキ・同じ操作なら結果は完全に一致する', () => {
    // これは「3回の挑戦に乱数の引き直しが無い」ことの根拠でもある（Step 7）
    const dateKey = SAMPLE_DAYS[0]
    for (const godId of GOD_ORDER) {
      const deck = getRecommendedDeck(godId)
      const a = runDailyGame({ dateKey, godId, deck, growthPath: 'guardian' }, heuristicAgent('balanced'))
      const b = runDailyGame({ dateKey, godId, deck, growthPath: 'guardian' }, heuristicAgent('balanced'))
      expect(b).toEqual(a)
    }
  })

  it('公平版Daily：bonusCopies無しでも推奨デッキは全神で legal', () => {
    for (const godId of GOD_ORDER) {
      const deck = getRecommendedDeck(godId)
      expect(deck.length).toBe(RULES.deck.size)
      // bonusCopies を渡さない＝1種2枚上限。例外なく通ることを確認
      expect(() =>
        runDailyGame({ dateKey: SAMPLE_DAYS[0], godId, deck, growthPath: 'guardian' }, heuristicAgent('balanced')),
      ).not.toThrow()
    }
  })
})
