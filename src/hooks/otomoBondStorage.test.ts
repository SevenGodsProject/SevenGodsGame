import { beforeEach, describe, expect, it } from 'vitest'
import { loadOtomoBond, recordOtomoBond } from './otomoBondStorage'
import { applyAction } from '../core/engine'
import { STARTER_DECK } from '../core/data/decks'
import { ENEMY_IDS } from '../core/data/enemies'
import { GOD_IDS } from '../core/data/gods'

/** vitestの既定環境（node）にはlocalStorageが無いため、最小限のメモリ実装で代用する */
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
})

function startGame(seed: string) {
  const result = applyAction(null, {
    type: 'START_GAME',
    seed,
    godId: GOD_IDS.ebisu,
    enemyId: ENEMY_IDS.trial,
    deck: STARTER_DECK,
    difficulty: 'normal',
  })
  return result.state
}

function withResult(
  state: ReturnType<typeof startGame>,
  status: 'won' | 'lost' | 'finished',
  form: 'spirit' | 'incarnate' | 'doji',
) {
  return { ...state, status, otomo: { ...state.otomo, form } }
}

describe('otomoBondStorage', () => {
  it('未記録の神は全項目が0で返る', () => {
    expect(loadOtomoBond(GOD_IDS.ebisu)).toEqual({
      battlesPlayed: 0,
      resonanceCount: 0,
      dojiReached: 0,
    })
  })

  it('進行中（playing）のGameStateは記録に反映しない', () => {
    recordOtomoBond(startGame('bond-1'))
    expect(loadOtomoBond(GOD_IDS.ebisu).battlesPlayed).toBe(0)
  })

  it('決着時、到達形態に応じてresonanceCountが加算される（spirit=0/incarnate=1/doji=2）', () => {
    recordOtomoBond(withResult(startGame('bond-2'), 'won', 'spirit'))
    expect(loadOtomoBond(GOD_IDS.ebisu)).toEqual({
      battlesPlayed: 1,
      resonanceCount: 0,
      dojiReached: 0,
    })

    recordOtomoBond(withResult(startGame('bond-2b'), 'lost', 'incarnate'))
    expect(loadOtomoBond(GOD_IDS.ebisu)).toEqual({
      battlesPlayed: 2,
      resonanceCount: 1,
      dojiReached: 0,
    })

    recordOtomoBond(withResult(startGame('bond-2c'), 'finished', 'doji'))
    expect(loadOtomoBond(GOD_IDS.ebisu)).toEqual({
      battlesPlayed: 3,
      resonanceCount: 3,
      dojiReached: 1,
    })
  })

  it('勝敗・未撃破いずれの決着でもbattlesPlayed/resonanceCountは同じルールで加算される（勝利限定ではない）', () => {
    recordOtomoBond(withResult(startGame('bond-3'), 'lost', 'doji'))
    expect(loadOtomoBond(GOD_IDS.ebisu)).toEqual({
      battlesPlayed: 1,
      resonanceCount: 2,
      dojiReached: 1,
    })
  })

  it('同一のGameStateに対してrecordOtomoBondを2回呼んでも、呼んだ回数分だけ加算される（＝呼び出し側の1回性に依存する設計であることの確認）', () => {
    const state = withResult(startGame('bond-4'), 'won', 'incarnate')
    recordOtomoBond(state)
    recordOtomoBond(state)
    // この関数自体は冪等ではない（recordGameResultと同じ設計）。
    // 二重加算を防いでいるのは「useGameEngine.commit()の決着ブランチが
    // 対局につき1回しか実行されない」という呼び出し側の保証であり、
    // それはreducer.test.tsの「throws once the game is already over」で
    // 別途担保されている。ここでは意図した挙動（呼べば増える）を明示する。
    expect(loadOtomoBond(GOD_IDS.ebisu).battlesPlayed).toBe(2)
  })

  it('resumeGame相当（同じstateをsetStateするだけ）ではcommitを経由しないため、このモジュール単体では加算されない', () => {
    // otomoBondStorageはrecordOtomoBondを呼ばれない限り一切状態を変えない、
    // という副作用ゼロの前提を確認する（resumeGameがcommit()を経由しない
    // 設計はuseGameEngine.ts側の責務。ここではストレージ側が「呼ばれなければ
    // 増えない」ことだけを保証する）。
    startGame('bond-5')
    expect(loadOtomoBond(GOD_IDS.ebisu).battlesPlayed).toBe(0)
  })

  it('神ごとに育成記録を独立して保持する', () => {
    recordOtomoBond({ ...withResult(startGame('bond-6'), 'won', 'doji'), godId: GOD_IDS.taiyo })
    expect(loadOtomoBond(GOD_IDS.ebisu).battlesPlayed).toBe(0)
    expect(loadOtomoBond(GOD_IDS.taiyo)).toEqual({
      battlesPlayed: 1,
      resonanceCount: 2,
      dojiReached: 1,
    })
  })

  it('localStorageが使えなくても例外を投げない', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
    const state = withResult(startGame('bond-7'), 'won', 'doji')
    expect(() => recordOtomoBond(state)).not.toThrow()
    expect(loadOtomoBond(GOD_IDS.ebisu).battlesPlayed).toBe(0)
  })

  it('壊れた保存データ（不正JSON）は無視して空レコードにフォールバックする', () => {
    localStorage.setItem('sevengods.otomoBond', '{not valid json')
    expect(loadOtomoBond(GOD_IDS.ebisu)).toEqual({
      battlesPlayed: 0,
      resonanceCount: 0,
      dojiReached: 0,
    })
  })

  it('バージョン不一致の保存データは無視して空レコードにフォールバックする', () => {
    localStorage.setItem(
      'sevengods.otomoBond',
      JSON.stringify({ version: 999, records: { [GOD_IDS.ebisu]: { battlesPlayed: 5, resonanceCount: 10, dojiReached: 3 } } }),
    )
    expect(loadOtomoBond(GOD_IDS.ebisu)).toEqual({
      battlesPlayed: 0,
      resonanceCount: 0,
      dojiReached: 0,
    })
  })

  it('形が壊れた保存データ（recordsの中身が不正）は無視して空レコードにフォールバックする', () => {
    localStorage.setItem(
      'sevengods.otomoBond',
      JSON.stringify({ version: 1, records: { [GOD_IDS.ebisu]: { battlesPlayed: 'not-a-number' } } }),
    )
    expect(loadOtomoBond(GOD_IDS.ebisu)).toEqual({
      battlesPlayed: 0,
      resonanceCount: 0,
      dojiReached: 0,
    })
  })

  // 決定74（Task C3）：Lv到達演出の判定に使う戻り値（更新前後の記録）のテスト
  describe('戻り値（決定74・Task C3）', () => {
    it('決着時、prevRecordは更新前・nextRecordは更新後の値を返す', () => {
      const { prevRecord: firstPrev, nextRecord: firstNext } = recordOtomoBond(
        withResult(startGame('bond-8'), 'won', 'incarnate'),
      )
      expect(firstPrev).toEqual({ battlesPlayed: 0, resonanceCount: 0, dojiReached: 0 })
      expect(firstNext).toEqual({ battlesPlayed: 1, resonanceCount: 1, dojiReached: 0 })

      const { prevRecord: secondPrev, nextRecord: secondNext } = recordOtomoBond(
        withResult(startGame('bond-8b'), 'won', 'doji'),
      )
      expect(secondPrev).toEqual(firstNext)
      expect(secondNext).toEqual({ battlesPlayed: 2, resonanceCount: 3, dojiReached: 1 })
    })

    it('進行中（playing）はprevRecordとnextRecordが同じ値を返す（＝呼び出し側で差分を見ても変化なしと判定できる）', () => {
      const { prevRecord, nextRecord } = recordOtomoBond(startGame('bond-9'))
      expect(prevRecord).toEqual(nextRecord)
      expect(prevRecord).toEqual({ battlesPlayed: 0, resonanceCount: 0, dojiReached: 0 })
    })
  })
})
