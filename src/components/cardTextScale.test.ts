import { describe, expect, it } from 'vitest'
import { ALL_CARDS } from '../core/data/cards'
import { DIVINATION_CHOICES } from '../core/data/divination'
import type { Effect } from '../core/types'
import { formatScaled } from './displayScale'

/**
 * D2b：カード本文（手書きtext）と内部effect値の機械的整合チェック。
 *
 * 表示スケール導入により、カード本文の数値は「effect値×DISPLAY_SCALE」で
 * 書かれていなければならない（damage/block/heal/score/buff/debuff）。
 * resonance/draw/gainApは倍率対象外なので「effect値そのまま」。
 * buff/debuffのラウンド数も倍率対象外。
 *
 * 「effect 12なのに本文80」のような書き換え事故を、全60カード＋託宣3種で
 * 恒久的に検知する（正確な文言までは縛らず、期待数値の存在だけを機械検証する）。
 */

/** effect1件が本文に含んでいるべき数値文字列（表示スケール適用後） */
function expectedNumbersInText(effect: Effect): string[] {
  switch (effect.kind) {
    case 'damage':
    case 'block':
    case 'heal':
    case 'score':
      return [formatScaled(effect.amount)]
    case 'buff':
    case 'debuff':
      // 量は×10、継続ラウンド数はそのまま
      return [formatScaled(effect.amount), String(effect.rounds)]
    case 'resonance':
    case 'draw':
    case 'gainAp':
      // 倍率対象外（共鳴の「7」、枚数、神力）
      return [String(effect.amount)]
  }
}

describe('カード本文と表示スケールの整合（D2b）', () => {
  for (const card of ALL_CARDS) {
    it(`${card.name}（${card.id}）の本文がeffect値×表示倍率と一致する`, () => {
      for (const effect of card.effects) {
        for (const expected of expectedNumbersInText(effect)) {
          expect(
            card.text.includes(expected),
            `「${card.name}」の本文「${card.text}」に ${effect.kind} の期待数値 ${expected} が見つからない`,
          ).toBe(true)
        }
      }
    })
  }
})

describe('託宣本文と表示スケールの整合（D2b）', () => {
  for (const choice of DIVINATION_CHOICES) {
    it(`${choice.name}の本文がeffect値×表示倍率と一致する`, () => {
      for (const effect of choice.effects) {
        for (const expected of expectedNumbersInText(effect)) {
          expect(
            choice.text.includes(expected),
            `「${choice.name}」の本文「${choice.text}」に ${effect.kind} の期待数値 ${expected} が見つからない`,
          ).toBe(true)
        }
      }
    })
  }
})
