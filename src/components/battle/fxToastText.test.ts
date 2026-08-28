import { describe, expect, it } from 'vitest'
import { fxToastText } from './useBattleFx'
import { formatEvent } from './formatEvent'

/**
 * HOTFIX-DISPLAY-SCALE-TOAST回帰テスト。
 * production QA（2026-08-28）で、カード使用結果トーストだけが×10表示スケール
 * （displayScale.ts）を通さず内部値を表示していた（内部18 →「敵に18ダメージ」）。
 * トースト文言が常にBattle log（formatEvent）と同じ桁＝formatScaled適用済みで
 * あることを固定する。
 */
describe('fxToastText（カード使用結果トーストの×10表示）', () => {
  it('damage：内部18 → 「⚔ 敵に180ダメージ」', () => {
    expect(fxToastText.damage(18)).toBe('⚔ 敵に180ダメージ')
  })

  it('heal：内部6 → 「💚 HP+60」', () => {
    expect(fxToastText.heal(6)).toBe('💚 HP+60')
  })

  it('block：内部12 → 「🛡 ブロック+120」', () => {
    expect(fxToastText.block(12)).toBe('🛡 ブロック+120')
  })

  it('4桁以上はカンマ区切り（内部103 → 1,030）', () => {
    expect(fxToastText.damage(103)).toBe('⚔ 敵に1,030ダメージ')
  })

  it('Battle log（formatEvent）と同じ数値表記になる（二重×10なし）', () => {
    const logText = formatEvent({ t: 'DAMAGE_DEALT', target: 'enemy', amount: 18, blocked: 0 })
    expect(logText).toContain('180')
    expect(logText).not.toContain('1,800')
    expect(fxToastText.damage(18)).toContain('180')
    expect(fxToastText.damage(18)).not.toContain('1,800')
  })
})
