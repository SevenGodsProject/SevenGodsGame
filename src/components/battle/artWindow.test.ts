import { describe, expect, it } from 'vitest'
import { getCardDef } from '../../core/data/cards'
import { getCardArt } from '../../core/data/cardArt'
import { RULES } from '../../core/data/rules'
import { formatBonusLine } from '../cardBonusText'
import { ART_WINDOW_V2 } from './artWindow'

const numbers = (s: string) => s.match(/\d+/g) ?? []

describe('Card Premium v2 Pilot：Art Window v2', () => {
  it('Pilot は大耀『豪快な一撃』1 枚だけ', () => {
    expect([...ART_WINDOW_V2.keys()]).toEqual(['card_taiyo_attack_01'])
    expect(getCardDef([...ART_WINDOW_V2.keys()][0]).name).toBe('豪快な一撃')
  })

  it('対象カードは原画と条件付き追加効果を持つ', () => {
    for (const id of ART_WINDOW_V2.keys()) {
      expect(getCardArt(id)).toBeTruthy()
      expect(getCardDef(id).bonus).toBeDefined()
    }
  })

  it('短文の数値（条件の閾値・追加の威力）は bonus.textJa と同じ', () => {
    for (const [id, spec] of ART_WINDOW_V2) {
      const bonus = getCardDef(id).bonus!
      expect(numbers(spec.bonusShortJa)).toEqual(numbers(bonus.textJa))
      if (bonus.when === 'charged') {
        expect(spec.bonusShortJa.startsWith(`共鳴${RULES.cardBonus.chargedThreshold}以上`)).toBe(true)
      }
    }
  })

  it('短文は SP 100px 幅で 1 行に収まる長さ（先頭記号込み 13 文字以内）', () => {
    for (const spec of ART_WINDOW_V2.values()) {
      expect(formatBonusLine(spec.bonusShortJa, true).length).toBeLessThanOrEqual(13)
    }
  })
})
