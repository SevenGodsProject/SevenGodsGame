import { describe, expect, it } from 'vitest'
import { GOD_IDS } from '../data/gods'
import { ENEMIES, getEnemyDef } from '../data/enemies'
import { STARTER_DECK } from '../data/decks'
import { applyAction } from './reducer'

/**
 * LANE-D（Enemy Select）：「敵Aを選んだのに敵Bが出る」事故の重点テスト（engine層）。
 * START_GAMEでenemyIdを指定したとき、盤面に立つ敵が指定どおりであることを
 * 7敵全部について検証する（名前・HP＝normal難易度の定義値も一致すること）。
 */
describe('START_GAME with an explicitly selected enemy (LANE-D)', () => {
  it('spawns exactly the selected enemy for all 7 enemies', () => {
    for (const def of ENEMIES) {
      const { state } = applyAction(null, {
        type: 'START_GAME',
        seed: 'enemy-select-seed',
        godId: GOD_IDS.ebisu,
        enemyId: def.id,
        deck: STARTER_DECK,
      })
      expect(state.enemy.defId).toBe(def.id)
      expect(state.enemy.name).toBe(def.name)
      // normal難易度＝倍率1なので、定義そのもののHPで立つ
      expect(state.enemy.maxHp).toBe(getEnemyDef(def.id).maxHp)
    }
  })

  it('keeps the selected enemy across round progression (no mid-battle swap)', () => {
    for (const def of ENEMIES) {
      let { state } = applyAction(null, {
        type: 'START_GAME',
        seed: `enemy-keep-${def.id}`,
        godId: GOD_IDS.ebisu,
        enemyId: def.id,
        deck: STARTER_DECK,
      })
      // 2ラウンド進めても敵がすり替わらないこと
      state = applyAction(state, { type: 'END_ROUND' }).state
      state = applyAction(state, { type: 'END_ROUND' }).state
      expect(state.enemy.defId).toBe(def.id)
      expect(state.enemy.name).toBe(def.name)
    }
  })
})
