import { describe, expect, it } from 'vitest'
import { GODS, GOD_IDS } from '../../core/data/gods'
import { ENEMIES, ENEMY_IDS } from '../../core/data/enemies'
import { getRecommendedDeck, validateDeck } from '../../core/data/deckBuilder'
import { FIRST_BATTLE_BRIEF_LINES, FIRST_BATTLE_PRESET } from './firstBattle'

/** Phase 7 Entrance E1（決定193・仕様 §7〜§8）：初陣の構成と短い説明 */
describe('FIRST_BATTLE_PRESET', () => {
  it('恵比寿・試練の影・ふつう・guardian（balanceSim で決めた値のまま）', () => {
    expect(FIRST_BATTLE_PRESET).toEqual({
      godId: GOD_IDS.ebisu,
      enemyId: ENEMY_IDS.trial,
      difficulty: 'normal',
      otomoGrowthPath: 'guardian',
    })
  })

  it('神・敵は現在の定義に存在し、おすすめデッキはそのまま検証を通る', () => {
    expect(GODS.some((g) => g.id === FIRST_BATTLE_PRESET.godId)).toBe(true)
    expect(ENEMIES.some((e) => e.id === FIRST_BATTLE_PRESET.enemyId)).toBe(true)
    expect(validateDeck(getRecommendedDeck(FIRST_BATTLE_PRESET.godId), FIRST_BATTLE_PRESET.godId).valid).toBe(true)
  })
})

describe('FIRST_BATTLE_BRIEF_LINES', () => {
  const text = FIRST_BATTLE_BRIEF_LINES.join('')

  it('3 行・合計 120 字以内', () => {
    expect(FIRST_BATTLE_BRIEF_LINES).toHaveLength(3)
    expect(text.length).toBeLessThanOrEqual(120)
  })

  it('敵の予告／神力とカード／ラウンドを終えることと勝利条件 だけを扱う', () => {
    expect(FIRST_BATTLE_BRIEF_LINES[0]).toContain('予告')
    expect(FIRST_BATTLE_BRIEF_LINES[1]).toContain('神力')
    // v1.0.1 語彙補完（案 B）：防御もラウンド末に消えることを神力と対で伝える
    expect(FIRST_BATTLE_BRIEF_LINES[1]).toContain('防御')
    expect(FIRST_BATTLE_BRIEF_LINES[2]).toContain('ラウンドを終える')
    expect(FIRST_BATTLE_BRIEF_LINES[2]).toContain('7ラウンド以内')
  })

  it('v1.0.1 語彙補完（案 B）：② は確定文言そのまま・コードポイント 42 字・3 行合計 112 字', () => {
    expect(FIRST_BATTLE_BRIEF_LINES[1]).toBe('カード左上の数字が必要な神力です。余った神力と防御は、次のラウンドへ持ち越せません。')
    expect([...FIRST_BATTLE_BRIEF_LINES[1]].length).toBe(42)
    expect([...text].length).toBe(112)
    // 「ブロック」は実戦 UI に出ない語（バッジは 🛡 数値のみ）なので使わない
    expect(text).not.toContain('ブロック')
  })

  it.each(['共鳴', '託宣', '神託', 'OTOMO', 'スコア', '神階', '神域', '攻略'])('初陣前には「%s」を説明しない', (word) => {
    expect(text).not.toContain(word)
  })
})
