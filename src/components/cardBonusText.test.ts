import { describe, expect, it } from 'vitest'
import { ALL_CARDS, getCardDef } from '../core/data/cards'
import { SHOUREN_CARD_IDS, SOBI_CARD_IDS } from '../core/data/cards'
import { formatCardBonus } from './cardBonusText'

/**
 * Phase 3 FINAL SPEC v0.1：条件付き追加効果の表示文。
 *
 * 戦闘中の手札・デッキ構築・報酬3択の3画面がこの1関数を通すことで、
 * 「カードを選ぶ時点」と「使う時点」で説明が食い違わないことを保証する。
 */
describe('formatCardBonus', () => {
  it('bonusを持たないカードはnull（既存56枚の表示は増えない）', () => {
    for (const card of ALL_CARDS) {
      if (card.bonus) continue
      expect(formatCardBonus(card)).toBeNull()
    }
  })

  it('条件未成立・盤面なしの画面では「＋」、成立中の手札では「⚡」を付ける', () => {
    const card = getCardDef(SOBI_CARD_IDS.unshakableStance)
    expect(formatCardBonus(card)).toBe('＋ ブロックが敵の予告以上なら、敵に60ダメージ。')
    expect(formatCardBonus(card, true)).toBe('⚡ ブロックが敵の予告以上なら、敵に60ダメージ。')
  })

  it('変更4枚は、選ぶ前に条件と効果が1行で読める', () => {
    const expected: Record<string, string> = {
      [SOBI_CARD_IDS.unshakableStance]: '＋ ブロックが敵の予告以上なら、敵に60ダメージ。',
      [SOBI_CARD_IDS.sternRebuke]: '＋ 敵の予告が100以上なら、敵に60ダメージ。',
      [SHOUREN_CARD_IDS.bagOfFortune]: '＋ HPが半分以下なら、共鳴ゲージ+2。',
      [SHOUREN_CARD_IDS.laughItOff]: '＋ ブロックが敵の予告以上なら、カードを1枚引く。',
    }
    for (const [id, text] of Object.entries(expected)) {
      const card = ALL_CARDS.find((c) => c.id === id)!
      expect(formatCardBonus(card)).toBe(text)
      // 説明はスマホで一読できる長さ（本文＋追加行で2行以内に収まる目安）
      expect(card.bonus!.textJa.length).toBeLessThanOrEqual(32)
    }
  })

  it('本体テキストと追加行を合わせても、既存カードの説明量から大きく外れない', () => {
    for (const card of ALL_CARDS) {
      const total = card.text.length + (card.bonus?.textJa.length ?? 0)
      expect(total).toBeLessThanOrEqual(64)
    }
  })
})
