import { beforeEach, describe, expect, it } from 'vitest'
import { RULES } from '../core/data/rules'
import { GOD_IDS } from '../core/data/gods'
import { ENEMY_IDS } from '../core/data/enemies'
import { SOBI_CARD_IDS } from '../core/data/cards'
import { getRecommendedDeck } from '../core/data/deckBuilder'
import { applyAction } from '../core/engine/reducer'
import type { GameState } from '../core/types'
import { loadBattleSave, saveBattle, clearBattleSave } from './battleSaveStorage'

/**
 * Phase 3「神格」FINAL SPEC v0.1 §11：セーブ互換。
 *
 * 得意技・条件付き追加効果は`GameState`の構造を一切変えないため、
 * saveVersionは9のまま据え置く。既存のv9セーブがそのまま再開でき、
 * 再開後も新ルールが正しく働くことをここで保証する
 * （＝将来うっかりversionを上げたときにこのテストが落ちる）。
 */

function start(seed: string): GameState {
  return applyAction(null, {
    type: 'START_GAME',
    seed,
    godId: GOD_IDS.sobi,
    enemyId: ENEMY_IDS.trial,
    deck: getRecommendedDeck(GOD_IDS.sobi),
  }).state
}

/** vitestの既定環境（node）にはlocalStorageが無いため、最小限のメモリ実装で代用する
 *  （`battleSaveStorage.test.ts`と同じ方式） */
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  })
  clearBattleSave()
})

describe('Phase 3 God Identity のセーブ互換', () => {
  it('saveVersionは9のまま（GameStateの構造を変えていない）', () => {
    expect(RULES.saveVersion).toBe(9)
    expect(start('save-v9').version).toBe(9)
  })

  it('保存 → 読み込みで同じ盤面に戻り、再開後も得意技が働く', () => {
    const state: GameState = (() => {
      const s = start('save-resume')
      return { ...s, player: { ...s.player, block: 20 } }
    })()

    saveBattle(state)
    const loaded = loadBattleSave()
    expect(loaded).toEqual(state)

    const { state: after, events } = applyAction(loaded!, { type: 'END_ROUND' })
    expect(events.some((e) => e.t === 'PASSIVE_TRIGGERED')).toBe(true)
    expect(state.enemy.hp - after.enemy.hp).toBe(15)
  })

  it('Phase 3導入前に保存されたセーブ（bonus付きカードを含むデッキ）もそのまま読める', () => {
    // 旧セーブにはbonus情報は入っていない（CardInstanceはdefIdしか持たない）。
    // 読み込み後はカード定義側の最新bonusがそのまま適用される。
    const s = start('save-old')
    const withBonusCard: GameState = {
      ...s,
      ap: { current: 9, max: 9 },
      hand: [{ uid: s.hand[0].uid, defId: SOBI_CARD_IDS.unshakableStance }],
    }
    saveBattle(withBonusCard)

    const loaded = loadBattleSave()!
    const { state: after, events } = applyAction(loaded, {
      type: 'PLAY_CARD',
      uid: loaded.hand[0].uid,
    })
    expect(events.some((e) => e.t === 'BONUS_TRIGGERED')).toBe(true)
    expect(after.player.block).toBe(13)
  })
})
