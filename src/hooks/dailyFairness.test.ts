import { beforeEach, describe, expect, it } from 'vitest'
import type { CardDefId, GodId } from '../core/types'
import { RULES } from '../core/data/rules'
import { GOD_IDS } from '../core/data/gods'
import { dailyBossFor, dailyKeyOf } from '../core/data/dailyBoss'
import { getMaxCopies, getRecommendedDeck, validateDeck } from '../core/data/deckBuilder'
import { applyAction } from '../core/engine/reducer'
import { addRewardBonus, loadRewardBonuses } from './rewardStorage'
import { dailyAttemptsLeft, clearDailyRecords, startDailyAttempt } from './dailyStorage'
import { resolveDailyStart } from './startDaily'

/**
 * Phase 4.1 Step 1：Daily公平性修正の回帰テスト。
 *
 * 決定131（Phase 4.0監査）で、Dailyに混ざる唯一のプレイヤー間条件差が
 * 報酬ボーナス（決定43の`bonusCopies`）であり、それだけで1,000人規模の順位が
 * 平均14.8・最大45動くと実測した。ここではその是正が
 *   ① Dailyで無効になっていること
 *   ② 通常モードでは従来どおり効くこと（決定43を壊していないこと）
 *   ③ Daily seed・1日3回・JST reset・saveVersion がどれも変わっていないこと
 * を固定する。
 */

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null
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

const GOD: GodId = GOD_IDS.ebisu
const GODS = Object.values(GOD_IDS)

/**
 * おすすめデッキを土台に、1種だけ`maxCopiesPerCard + 1`枚にした
 * 「報酬ボーナスが無いと組めないデッキ」を作る。神ごとにおすすめ構成の内訳が
 * 違うため、単に1枚差し替えるのではなく枚数を明示的に作り込む。
 */
function overloadedDeck(godId: GodId): { deck: CardDefId[]; cardId: CardDefId } {
  const base = getRecommendedDeck(godId)
  const cardId = base[0]
  const over = RULES.deckBuilding.maxCopiesPerCard + 1
  const others = base.filter((id) => id !== cardId).slice(0, RULES.deck.size - over)
  const deck = [...Array<CardDefId>(over).fill(cardId), ...others]
  return { deck, cardId }
}

function startNormal(godId: GodId, deck: CardDefId[], bonusCopies?: Map<CardDefId, number>) {
  return applyAction(null, {
    type: 'START_GAME',
    seed: 'fairness-test',
    godId,
    enemyId: dailyBossFor('2026-09-09').enemyId,
    deck,
    difficulty: 'normal',
    bonusCopies: bonusCopies ? Object.fromEntries(bonusCopies) : undefined,
  })
}

/** 本番の`startDailyGame`と同じ形（bonusCopiesを渡さない）でDailyを開始する */
function startDaily(godId: GodId, deck: CardDefId[], dailyKey = '2026-09-09') {
  const daily = resolveDailyStart(dailyKey)
  return applyAction(null, {
    type: 'START_GAME',
    seed: daily.seed,
    godId,
    enemyId: daily.enemyId,
    deck,
    difficulty: daily.difficulty,
    mode: daily.mode,
    dailyKey: daily.dailyKey,
    modifier: daily.modifier,
  })
}

beforeEach(() => {
  ;(globalThis as { localStorage: Storage }).localStorage = new MemoryStorage()
  clearDailyRecords()
})

describe('通常モードは報酬ボーナスを維持する（決定43は無変更）', () => {
  it('報酬を獲得すると編成上限が1枚増える', () => {
    const { deck, cardId } = overloadedDeck(GOD)
    expect(loadRewardBonuses(GOD).size).toBe(0)
    addRewardBonus(GOD, cardId)
    const bonuses = loadRewardBonuses(GOD)
    expect(bonuses.get(cardId)).toBe(1)
    expect(getMaxCopies(cardId, bonuses)).toBe(RULES.deckBuilding.maxCopiesPerCard + 1)
    expect(validateDeck(deck, GOD, bonuses).valid).toBe(true)
  })

  it('通常モードの開始は報酬ボーナス込みのデッキを受け付ける', () => {
    const { deck, cardId } = overloadedDeck(GOD)
    addRewardBonus(GOD, cardId)
    expect(() => startNormal(GOD, deck, loadRewardBonuses(GOD))).not.toThrow()
    const state = startNormal(GOD, deck, loadRewardBonuses(GOD)).state
    expect(state.mode).toBe('normal')
    const all = [...state.deck, ...state.hand, ...state.discard, ...state.exhausted]
    expect(all.filter((c) => c.defId === cardId).length).toBe(
      RULES.deckBuilding.maxCopiesPerCard + 1,
    )
  })

  it('報酬ボーナスを渡さなければ通常モードでも従来どおり弾かれる（判定基準は1つだけ）', () => {
    const { deck } = overloadedDeck(GOD)
    expect(() => startNormal(GOD, deck)).toThrow(/デッキが不正です/)
  })
})

describe('DailyはbonusCopiesを無効化する', () => {
  it('報酬を持っていてもDailyでは3枚積みデッキで開始できない', () => {
    const { deck, cardId } = overloadedDeck(GOD)
    addRewardBonus(GOD, cardId)
    expect(loadRewardBonuses(GOD).get(cardId)).toBe(1)
    expect(() => startDaily(GOD, deck)).toThrow(/デッキが不正です/)
  })

  it('7神すべてで、Dailyの編成ルール（1種2枚まで）が適用される', () => {
    for (const godId of GODS) {
      const { deck, cardId } = overloadedDeck(godId)
      addRewardBonus(godId, cardId)
      expect(() => startDaily(godId, deck), `${godId}`).toThrow(/デッキが不正です/)
      expect(() => startDaily(godId, getRecommendedDeck(godId)), `${godId}`).not.toThrow()
    }
  })

  it('デッキ構築画面のDaily側（空Map）でも追加copyができない', () => {
    const { cardId } = overloadedDeck(GOD)
    addRewardBonus(GOD, cardId)
    const dailyBonuses = new Map<CardDefId, number>()
    expect(getMaxCopies(cardId, dailyBonuses)).toBe(RULES.deckBuilding.maxCopiesPerCard)
    // 通常モード側は増えたまま
    expect(getMaxCopies(cardId, loadRewardBonuses(GOD))).toBe(
      RULES.deckBuilding.maxCopiesPerCard + 1,
    )
  })

  it('構築画面の判定とDaily開始時のvalidateDeckが一致する（画面で組めるものは必ず開始できる）', () => {
    const { deck } = overloadedDeck(GOD)
    // 画面（Daily：空Map）が不正と判断するデッキは、開始時も必ず不正
    expect(validateDeck(deck, GOD, new Map()).valid).toBe(false)
    expect(() => startDaily(GOD, deck)).toThrow()
    // 画面が合法と判断するデッキは、開始時も必ず合法
    for (const godId of GODS) {
      const recommended = getRecommendedDeck(godId)
      expect(validateDeck(recommended, godId, new Map()).valid, `${godId}`).toBe(true)
      expect(() => startDaily(godId, recommended), `${godId}`).not.toThrow()
    }
  })

  it('おすすめデッキは全神とも報酬ボーナス無しで合法（Dailyの初期表示が必ず開始できる）', () => {
    for (const godId of GODS) {
      const result = validateDeck(getRecommendedDeck(godId), godId)
      expect(result.errors, `${godId}`).toEqual([])
    }
  })
})

describe('Phase 4.1で変えていないことの確認', () => {
  it('Daily seedの導出は不変（敵・seed・seedIdが従来値のまま）', () => {
    // Phase 4.1導入前と同じ値であること（週次巡回・seed文字列・seedIdの3点）
    const expected = [
      { key: '2026-09-07', enemyId: 'enemy_07', seedId: 'PTFGRC' },
      { key: '2026-09-08', enemyId: 'enemy_03', seedId: '97JDOV' },
      { key: '2026-09-09', enemyId: 'enemy_06', seedId: 'B6PW1T' },
      { key: '2026-09-10', enemyId: 'enemy_01', seedId: 'WZNUJ2' },
      { key: '2026-09-11', enemyId: 'enemy_02', seedId: '85VFKI' },
      { key: '2026-09-12', enemyId: 'enemy_04', seedId: 'V0H9SZ' },
      { key: '2026-09-13', enemyId: 'enemy_05', seedId: 'YE93YP' },
    ].map((e) => ({ ...e, seed: `daily-${e.key}-${e.enemyId}` }))
    // 7連日で7体が必ず1回ずつ（週次巡回の不変）
    expect(new Set(expected.map((e) => e.enemyId)).size).toBe(7)
    for (const e of expected) {
      const boss = dailyBossFor(e.key)
      expect(boss.enemyId).toBe(e.enemyId)
      expect(boss.seed).toBe(e.seed)
      expect(boss.seedId).toBe(e.seedId)
      const start = resolveDailyStart(e.key)
      expect(start.seed).toBe(e.seed)
      expect(start.enemyId).toBe(e.enemyId)
      expect(start.difficulty).toBe('normal')
      expect(start.modifier).toEqual(RULES.daily.modifier)
      expect(start.mode).toBe('daily')
    }
  })

  it('神域強化の倍率が不変（敵HP ×1.25・攻撃 ×1.15）', () => {
    expect(RULES.daily.modifier).toEqual({ enemyHpMul: 1.25, enemyAtkMul: 1.15 })
  })

  it('1日3回制限が不変', () => {
    expect(RULES.daily.attemptsPerDay).toBe(3)
    const key = '2026-09-09'
    expect(dailyAttemptsLeft(key)).toBe(3)
    expect(startDailyAttempt(key).ok).toBe(true)
    expect(startDailyAttempt(key).ok).toBe(true)
    expect(startDailyAttempt(key).ok).toBe(true)
    expect(startDailyAttempt(key).ok).toBe(false)
    expect(dailyAttemptsLeft(key)).toBe(0)
  })

  it('JST resetが不変（14:59:59Z＝当日 / 15:00:00Z＝翌日）', () => {
    expect(RULES.daily.timezoneOffsetMinutes).toBe(540)
    expect(dailyKeyOf(new Date('2026-09-09T14:59:59Z'))).toBe('2026-09-09')
    expect(dailyKeyOf(new Date('2026-09-09T15:00:00Z'))).toBe('2026-09-10')
  })

  it('saveVersionが不変（セーブ互換を壊していない）', () => {
    expect(RULES.saveVersion).toBe(9)
    expect(startDaily(GOD, getRecommendedDeck(GOD)).state.version).toBe(9)
    expect(startNormal(GOD, getRecommendedDeck(GOD)).state.version).toBe(9)
  })

  it('Dailyは神階を使わない（stake未設定のまま）', () => {
    const state = startDaily(GOD, getRecommendedDeck(GOD)).state
    expect(state.stake).toBeUndefined()
    expect(state.stakeChoice).toBeUndefined()
  })
})

/**
 * UI配線のガード。
 *
 * このリポジトリにはReactコンポーネントを描画するテスト基盤（@testing-library等）が
 * 無いため、「Dailyの開始呼び出しが報酬ボーナスを渡していない」ことは
 * 呼び出し箇所のソースを直接検査して固定する。行番号ではなく構文の形で照合するので、
 * 前後の編集で位置がずれても壊れない。
 *
 * ソースの読み取りは`node:fs`ではなく`import.meta.glob`で行う
 * （`tsconfig.app.json`のtypesは`vite/client`のみでNodeの型を解決できないため）。
 */
describe('UI配線ガード：Daily開始経路に報酬ボーナスが復活しない', () => {
  const SOURCES = import.meta.glob(
    [
      '../components/GameFlow.tsx',
      '../components/setup/DeckBuilderScreen.tsx',
      '../components/setup/DailyChallengeScreen.tsx',
      './useGameEngine.ts',
    ],
    { query: '?raw', import: 'default', eager: true },
  ) as Record<string, string>

  const read = (suffix: string) => {
    const key = Object.keys(SOURCES).find((k) => k.endsWith(suffix))
    expect(key, `ソースが見つからない: ${suffix}`).toBeDefined()
    return SOURCES[key as string]
  }

  /** コメントを除いたソース（説明文中の言及を実装と取り違えないため） */
  const stripComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')

  /** `fn(` から対応する `)` までを取り出す */
  function callArgs(source: string, fnName: string): string[] {
    const calls: string[] = []
    let index = source.indexOf(`${fnName}(`)
    while (index !== -1) {
      let depth = 0
      let i = index + fnName.length
      for (; i < source.length; i++) {
        if (source[i] === '(') depth++
        else if (source[i] === ')') {
          depth--
          if (depth === 0) break
        }
      }
      calls.push(source.slice(index, i + 1))
      index = source.indexOf(`${fnName}(`, i)
    }
    return calls
  }

  it('GameFlow：Daily開始経路がloadRewardBonusesを渡さない', () => {
    const source = read('components/GameFlow.tsx')

    // Phase 4.6：Dailyの開始は `beginDailyChallenge`（枠の予約 → START_GAME）へ集約された。
    // 呼び出し口は「デッキ確定」と「もう一度挑戦」の2つのままで、
    // engine.startDailyGame を直接呼ぶ場所は1つだけになる。
    const entryPoints = callArgs(source, 'beginDailyChallenge')
    expect(entryPoints.length, 'Dailyの開始経路が見つからない').toBe(2)
    for (const call of entryPoints) {
      expect(call).not.toContain('loadRewardBonuses')
    }

    const calls = callArgs(source, 'engine.startDailyGame')
    expect(calls.length, 'startDailyGameの呼び出しは1か所に集約されている').toBe(1)
    for (const call of calls) {
      expect(call).not.toContain('loadRewardBonuses')
    }
  })

  it('GameFlow：通常モードのstartGameは従来どおりloadRewardBonusesを渡す', () => {
    const source = read('components/GameFlow.tsx')
    const calls = callArgs(source, 'engine.startGame')
    expect(calls.length, 'startGameの呼び出しが見つからない').toBe(2)
    for (const call of calls) {
      expect(call).toContain('loadRewardBonuses(godId)')
    }
  })

  it('useGameEngine：startDailyGameがbonusCopiesを受け取らず、dispatchにも乗せない', () => {
    const source = read('/useGameEngine.ts')
    const impl = stripComments(
      source.slice(source.indexOf('const startDailyGame'), source.indexOf('const playCard')),
    )
    expect(impl.length).toBeGreaterThan(0)
    // コメントでの言及は除外し、実際のコードにbonusCopiesが無いことを見る
    expect(impl).not.toContain('bonusCopies')
    // 通常モード側には残っている
    expect(source).toContain('bonusCopies')
  })

  it('DeckBuilderScreen：Dailyのときだけ空Mapを使う', () => {
    const source = read('components/setup/DeckBuilderScreen.tsx')
    const call = callArgs(source, 'useMemo')
      .find((c) => c.includes('loadRewardBonuses'))
    expect(call, 'bonusCopiesのuseMemoが見つからない').toBeDefined()
    expect(call).toContain('dailyChallenge')
    expect(call).toContain('new Map')
  })

  it('DailyChallengeScreen：「全員共通の条件」に編成ルールが書かれている', () => {
    const source = read('components/setup/DailyChallengeScreen.tsx')
    expect(source).toContain('全員共通の条件')
    expect(source).toContain('編成ルール')
    expect(source).toContain('RULES.deckBuilding.maxCopiesPerCard')
  })
})
