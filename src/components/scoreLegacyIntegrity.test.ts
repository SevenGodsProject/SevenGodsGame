import { describe, expect, it } from 'vitest'
import { ALL_CARDS, getCardDef, CARD_IDS } from '../core/data/cards'
import { SAIKA_CARD_IDS } from '../core/data/cards/saika'
import { EBISU_CARD_IDS } from '../core/data/cards/ebisu'
import { DIVINATION_CHOICES } from '../core/data/divination'
import { GODS, GOD_IDS, getGodDef } from '../core/data/gods'
import { OTOMOS, getOtomoDef, OTOMO_IDS } from '../core/data/otomo'
import { OTOMO_FORM_ORDER } from '../core/types/otomo'
import { GOD_TACTICS } from './setup/godStyle'

/**
 * STEP-SCORE2-F2：旧score仕様の残骸防止＋B'確定構成の恒久固定テスト。
 *
 * BASE-D（決定109）でkind:'score'はBattle Scoreへ加算されない。
 * F1/F2の計160,000試合超のsimulationでB'構成を確定したため、
 * (1) 現行データにscore効果が復活しないこと
 * (2) burst/OTOMO効果にresonanceが混入しないこと（無限発動リスク）
 * (3) B'確定効果が意図せず変わらないこと
 * (4) ユーザー向け文言に旧score虚偽表示が残らないこと
 * を恒久的に保証する。
 */

describe('旧score効果の残骸防止（BASE-D整合）', () => {
  it('全カードのeffectsにkind:score が存在しない', () => {
    for (const card of ALL_CARDS) {
      expect(
        card.effects.some((e) => e.kind === 'score'),
        `${card.name}にscore効果が残っている`,
      ).toBe(false)
    }
  })

  it('全託宣のeffectsにkind:score が存在しない', () => {
    for (const c of DIVINATION_CHOICES) {
      expect(c.effects.some((e) => e.kind === 'score')).toBe(false)
    }
  })

  it('全神のresonanceEffectsにkind:score が存在しない', () => {
    for (const god of GODS) {
      expect(god.resonanceEffects.some((e) => e.kind === 'score')).toBe(false)
    }
  })

  it('全OTOMOの守り/力・全形態にkind:score が存在しない', () => {
    for (const otomo of OTOMOS) {
      for (const form of OTOMO_FORM_ORDER) {
        expect(otomo.effectsByForm[form].some((e) => e.kind === 'score')).toBe(false)
        expect(otomo.powerPathEffectsByForm[form].some((e) => e.kind === 'score')).toBe(false)
      }
    }
  })
})

describe('burst/OTOMO効果へのresonance混入禁止（無限発動リスク・F1 PLAN-C実証）', () => {
  it('全神のresonanceEffectsにkind:resonance が存在しない', () => {
    for (const god of GODS) {
      expect(
        god.resonanceEffects.some((e) => e.kind === 'resonance'),
        `${god.nameJa}のburstにresonanceが混入している`,
      ).toBe(false)
    }
  })

  it('全OTOMOの守り/力・全形態にkind:resonance が存在しない', () => {
    for (const otomo of OTOMOS) {
      for (const form of OTOMO_FORM_ORDER) {
        expect(otomo.effectsByForm[form].some((e) => e.kind === 'resonance')).toBe(false)
        expect(otomo.powerPathEffectsByForm[form].some((e) => e.kind === 'resonance')).toBe(false)
      }
    }
  })
})

describe("B'確定burst構成の固定（F1/F2 simulation検証済み）", () => {
  it('恵比寿：damage25＋gainAp2（一本釣り→追撃。scoreなし）', () => {
    expect(getGodDef(GOD_IDS.ebisu).resonanceEffects).toEqual([
      { kind: 'damage', target: 'enemy', amount: 25 },
      { kind: 'gainAp', amount: 2 },
    ])
  })

  it('大耀：damage36の純火力一本（神技「爆発」と整合）', () => {
    expect(getGodDef(GOD_IDS.taiyo).resonanceEffects).toEqual([
      { kind: 'damage', target: 'enemy', amount: 36 },
    ])
  })

  it('蒼毘：damage21＋block20', () => {
    expect(getGodDef(GOD_IDS.sobi).resonanceEffects).toEqual([
      { kind: 'damage', target: 'enemy', amount: 21 },
      { kind: 'block', amount: 20 },
    ])
  })

  it('才華：旧score補償なし（damage12＋draw2＋gainAp2のまま）', () => {
    expect(getGodDef(GOD_IDS.saika).resonanceEffects).toEqual([
      { kind: 'damage', target: 'enemy', amount: 12 },
      { kind: 'draw', amount: 2 },
      { kind: 'gainAp', amount: 2 },
    ])
  })

  it('寿楽：damage23＋debuff atk-6/3R', () => {
    expect(getGodDef(GOD_IDS.juraku).resonanceEffects).toEqual([
      { kind: 'damage', target: 'enemy', amount: 23 },
      { kind: 'debuff', target: 'enemy', stat: 'atk', amount: 6, rounds: 3 },
    ])
  })

  it('福永：damage22＋heal6＋gainAp1', () => {
    expect(getGodDef(GOD_IDS.fukuei).resonanceEffects).toEqual([
      { kind: 'damage', target: 'enemy', amount: 22 },
      { kind: 'heal', amount: 6 },
      { kind: 'gainAp', amount: 1 },
    ])
  })

  it('笑蓮：damage21＋heal12＋block12', () => {
    expect(getGodDef(GOD_IDS.shouren).resonanceEffects).toEqual([
      { kind: 'damage', target: 'enemy', amount: 21 },
      { kind: 'heal', amount: 12 },
      { kind: 'block', amount: 12 },
    ])
  })
})

describe("B'確定カード効果の固定", () => {
  it('アンコール：gainAp2＋draw1（PHASE1Bで[gainAp3]案を棄却して確定）', () => {
    expect(getCardDef(SAIKA_CARD_IDS.encore).effects).toEqual([
      { kind: 'gainAp', amount: 2 },
      { kind: 'draw', amount: 1 },
    ])
  })

  it('喝采：draw1＋block2（resonance置換は才華テール独占の主因のため禁止）', () => {
    expect(getCardDef(SAIKA_CARD_IDS.standingOvation).effects).toEqual([
      { kind: 'draw', amount: 1 },
      { kind: 'block', amount: 2 },
    ])
  })

  it('福授け：heal6（共通「癒し」の下位互換化を解消）', () => {
    expect(getCardDef(EBISU_CARD_IDS.fortune).effects).toEqual([{ kind: 'heal', amount: 6 }])
  })

  it('天啓の託宣：damage4', () => {
    const tenkei = DIVINATION_CHOICES.find((c) => c.name === '天啓の託宣')
    expect(tenkei?.effects).toEqual([{ kind: 'damage', target: 'enemy', amount: 4 }])
  })

  it('神託・予言・小さな託宣：実効果は据え置き（score部分のみ削除）', () => {
    expect(getCardDef(CARD_IDS.oracle).effects).toEqual([
      { kind: 'damage', target: 'enemy', amount: 25 },
    ])
    expect(getCardDef(CARD_IDS.prophecy).effects).toEqual([{ kind: 'draw', amount: 2 }])
    expect(getCardDef(CARD_IDS.minorOracle).effects).toEqual([
      { kind: 'damage', target: 'enemy', amount: 7 },
    ])
  })

  it('笑袋・力の絆：incarnate=damage5／doji=damage5＋heal3（完全dead解消）', () => {
    const shofuku = getOtomoDef(OTOMO_IDS.shofuku)
    expect(shofuku.powerPathEffectsByForm.incarnate).toEqual([
      { kind: 'damage', target: 'enemy', amount: 5 },
    ])
    expect(shofuku.powerPathEffectsByForm.doji).toEqual([
      { kind: 'damage', target: 'enemy', amount: 5 },
      { kind: 'heal', amount: 3 },
    ])
  })
})

describe('ユーザー向け旧score虚偽表示ゼロ', () => {
  it('全カード本文に「スコア」が含まれない', () => {
    for (const card of ALL_CARDS) {
      expect(card.text.includes('スコア'), `${card.name}の本文に旧score文言が残っている`).toBe(
        false,
      )
    }
  })

  it('全託宣本文に「スコア」が含まれない', () => {
    for (const c of DIVINATION_CHOICES) {
      expect(c.text.includes('スコア')).toBe(false)
    }
  })

  it('GOD_TACTICSに「スコア」が含まれない（恵比寿は速攻identityへ更新済み）', () => {
    for (const text of Object.values(GOD_TACTICS)) {
      expect(text.includes('スコア')).toBe(false)
    }
  })
})
