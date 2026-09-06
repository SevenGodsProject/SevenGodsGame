/**
 * Step 2 設計候補（Passive・条件付きEffect・既存Effect数値差し替え）とルールセット（比較対象）。
 * 数値はすべて仮値。目的は「判断が変わるか」の検証であり、最終値ではない。
 */
import type { CardDefId, Effect, GodId } from '../../../src/core/types'
import { CARD_IDS, EBISU_CARD_IDS, TAIYO_CARD_IDS, SOBI_CARD_IDS, SAIKA_CARD_IDS, JURAKU_CARD_IDS, FUKUEI_CARD_IDS, SHOUREN_CARD_IDS } from '../../../src/core/data/cards'
import { GOD_IDS } from '../../../src/core/data/gods'
import { cardDamage, incomingOf, getCardDef } from '../harness'
import type { Passive, CondEffect, RuleSet } from './harness2'

// ---------------------------------------------------------------------------
// 神Passive 候補（1神1個・主軸のみ・既存Effectのみで表現）
// ---------------------------------------------------------------------------
export const PASSIVES: Record<GodId, Passive> = {
  [GOD_IDS.ebisu]: {
    godId: GOD_IDS.ebisu, nameJa: '大漁の潮', textJa: '使わなかった神力を最大2まで次のラウンドへ持ち越す。',
    roundStart: (ended, started) => {
      const carry = Math.min(2, ended.ap.current)
      if (carry <= 0) return started
      return { ...started, ap: { current: started.ap.current + carry, max: started.ap.max + carry } }
    },
  },
  [GOD_IDS.taiyo]: {
    godId: GOD_IDS.taiyo, nameJa: '爆発', textJa: 'ラウンド最初に使う攻撃カードのダメージ+50%。',
    afterPlay: ({ before, card }) => {
      const dmg = cardDamage(card.defId)
      if (before.cardsPlayedThisRound === 0 && dmg > 0) return [{ kind: 'damage', target: 'enemy', amount: Math.floor(dmg * 0.5) }]
      return []
    },
  },
  [GOD_IDS.sobi]: {
    godId: GOD_IDS.sobi, nameJa: '反撃の構え', textJa: '敵の攻撃を受け切って残ったブロックの半分を、敵へダメージとして返す。',
    afterEnemyTurn: (s) => (s.player.block >= 2 ? [{ kind: 'damage', target: 'enemy', amount: Math.floor(s.player.block / 2) }] : []),
  },
  [GOD_IDS.saika]: {
    godId: GOD_IDS.saika, nameJa: 'アンコール', textJa: 'このラウンド3枚目以降のカードは神力−1（最低1）。',
    costMod: (s, c) => (s.cardsPlayedThisRound >= 2 && getCardDef(c.defId).cost >= 2 ? -1 : 0),
  },
  [GOD_IDS.juraku]: {
    godId: GOD_IDS.juraku, nameJa: '老獪', textJa: '敵の攻撃力を下げている間、攻撃カードを使うと共鳴+1。',
    afterPlay: ({ before, card }) => (before.enemy.buffs.some((b) => b.stat === 'atk' && b.amount < 0) && cardDamage(card.defId) > 0 ? [{ kind: 'resonance', amount: 1 }] : []),
  },
  [GOD_IDS.fukuei]: {
    godId: GOD_IDS.fukuei, nameJa: '大勝負', textJa: 'HPが半分以下のとき、攻撃カードのダメージ+50%。',
    afterPlay: ({ before, card }) => {
      const dmg = cardDamage(card.defId)
      if (before.player.hp <= before.player.maxHp / 2 && dmg > 0) return [{ kind: 'damage', target: 'enemy', amount: Math.floor(dmg * 0.5) }]
      return []
    },
  },
  [GOD_IDS.shouren]: {
    godId: GOD_IDS.shouren, nameJa: '慈愛', textJa: 'HPを5回復するごとに共鳴+1（実際に回復した分のみ）。',
    afterPlay: ({ events }) => {
      let healed = 0
      for (const ev of events) { if (ev.t === 'RESONANCE_BURST') break; if (ev.t === 'HEALED') healed += ev.amount }
      const n = Math.floor(healed / 5)
      return n > 0 ? [{ kind: 'resonance', amount: n }] : []
    },
  },
}

// ---------------------------------------------------------------------------
// 条件付きEffect 候補（Step 1 で負価値だったカード＋共通2枚）
// ---------------------------------------------------------------------------
export const COND_EFFECTS: Partial<Record<CardDefId, CondEffect[]>> = {
  // 蒼毘：ブロックを「予告に合わせて」積む判断を攻撃に変える
  [SOBI_CARD_IDS.unshakableStance]: [{ when: 'blocked', effects: [{ kind: 'damage', target: 'enemy', amount: 6 }], textJa: 'ブロックが敵の予告以上なら、敵に60ダメージ' }],
  [SOBI_CARD_IDS.sternRebuke]: [{ when: 'enemyBig', effects: [{ kind: 'damage', target: 'enemy', amount: 6 }], textJa: '敵の予告が100以上なら、敵に60ダメージ' }],
  // 笑蓮：回復を共鳴・手数に繋げる
  [SHOUREN_CARD_IDS.bagOfFortune]: [{ when: 'lowHp', effects: [{ kind: 'resonance', amount: 2 }], textJa: 'HPが半分以下で使うと、共鳴+2' }],
  [SHOUREN_CARD_IDS.laughItOff]: [{ when: 'blocked', effects: [{ kind: 'draw', amount: 1 }], textJa: 'ブロックが敵の予告以上なら、カードを1枚引く' }],
  // 寿楽：デバフ中に守りが「加速」する
  [JURAKU_CARD_IDS.wisdomOfAges]: [{ when: 'enemyDebuffed', effects: [{ kind: 'gainAp', amount: 1 }], textJa: '敵の攻撃力が下がっていれば、神力+1' }],
  // 福永：窮地で引きが強くなる
  [FUKUEI_CARD_IDS.goddessOfLuck]: [{ when: 'lowHp', effects: [{ kind: 'draw', amount: 1 }], textJa: 'HPが半分以下なら、カードを1枚引く' }],
  // 大耀：連打の2枚目以降が伸びる（一心不乱）
  [TAIYO_CARD_IDS.singleMinded]: [{ when: 'combo2', effects: [{ kind: 'damage', target: 'enemy', amount: 4 }], textJa: 'このラウンド2枚目以降なら、ダメージ+40' }],
  // 共通：守護／癒し（全神で負価値の代表）に条件で価値を持たせる
  [CARD_IDS.guard]: [{ when: 'blocked', effects: [{ kind: 'resonance', amount: 1 }], textJa: 'ブロックが敵の予告以上なら、共鳴+1' }],
  [CARD_IDS.heal]: [{ when: 'lowHp', effects: [{ kind: 'gainAp', amount: 1 }], textJa: 'HPが半分以下なら、神力+1' }],
}
export const COND_CARD_COUNT = Object.keys(COND_EFFECTS).length // 9

/** 条件付きEffectの縮小版（4枚）：蒼毘2・笑蓮2 のみ */
export const COND_EFFECTS_4: Partial<Record<CardDefId, CondEffect[]>> = {
  [SOBI_CARD_IDS.unshakableStance]: COND_EFFECTS[SOBI_CARD_IDS.unshakableStance],
  [SOBI_CARD_IDS.sternRebuke]: COND_EFFECTS[SOBI_CARD_IDS.sternRebuke],
  [SHOUREN_CARD_IDS.bagOfFortune]: COND_EFFECTS[SHOUREN_CARD_IDS.bagOfFortune],
  [SHOUREN_CARD_IDS.laughItOff]: COND_EFFECTS[SHOUREN_CARD_IDS.laughItOff],
}

// ---------------------------------------------------------------------------
// D：既存Effectの数値差し替えのみ（新ルールなし）で負価値専用カードを救う案
// ---------------------------------------------------------------------------
export const NUMERIC_FIX: Partial<Record<CardDefId, Effect[]>> = {
  [SOBI_CARD_IDS.unshakableStance]: [{ kind: 'block', amount: 10 }, { kind: 'damage', target: 'enemy', amount: 5 }],
  [SOBI_CARD_IDS.sternRebuke]: [{ kind: 'debuff', target: 'enemy', stat: 'atk', amount: 5, rounds: 3 }, { kind: 'damage', target: 'enemy', amount: 4 }],
  [SOBI_CARD_IDS.oathOfShield]: [{ kind: 'block', amount: 4 }, { kind: 'heal', amount: 3 }, { kind: 'resonance', amount: 1 }],
  [SHOUREN_CARD_IDS.bagOfFortune]: [{ kind: 'heal', amount: 8 }, { kind: 'resonance', amount: 2 }],
  [SHOUREN_CARD_IDS.deepEmbrace]: [{ kind: 'block', amount: 8 }, { kind: 'resonance', amount: 2 }],
  [SHOUREN_CARD_IDS.laughItOff]: [{ kind: 'heal', amount: 3 }, { kind: 'block', amount: 3 }, { kind: 'resonance', amount: 1 }],
  [JURAKU_CARD_IDS.wisdomOfAges]: [{ kind: 'heal', amount: 3 }, { kind: 'block', amount: 3 }, { kind: 'resonance', amount: 1 }],
  [JURAKU_CARD_IDS.mischief]: [{ kind: 'debuff', target: 'enemy', stat: 'atk', amount: 4, rounds: 2 }, { kind: 'damage', target: 'enemy', amount: 3 }],
  [FUKUEI_CARD_IDS.goddessOfLuck]: [{ kind: 'heal', amount: 3 }, { kind: 'gainAp', amount: 1 }, { kind: 'draw', amount: 1 }],
  [TAIYO_CARD_IDS.singleMinded]: [{ kind: 'damage', target: 'enemy', amount: 5 }, { kind: 'resonance', amount: 1 }],
  [TAIYO_CARD_IDS.lookingAfterJuniors]: [{ kind: 'block', amount: 5 }, { kind: 'heal', amount: 3 }, { kind: 'resonance', amount: 1 }],
  [SAIKA_CARD_IDS.soloPerformance]: [{ kind: 'damage', target: 'enemy', amount: 5 }, { kind: 'gainAp', amount: 1 }],
  [EBISU_CARD_IDS.fortune]: [{ kind: 'heal', amount: 5 }, { kind: 'resonance', amount: 1 }],
}

// ---------------------------------------------------------------------------
// ルールセット（比較対象）
// ---------------------------------------------------------------------------
const pick = (...ids: GodId[]) => ids.map((g) => PASSIVES[g])
const G3: GodId[] = [GOD_IDS.sobi, GOD_IDS.shouren, GOD_IDS.fukuei] // 「死んでいる戦い方」の看板3神
const G5: GodId[] = [...G3, GOD_IDS.saika, GOD_IDS.taiyo]
const G7: GodId[] = [...G5, GOD_IDS.ebisu, GOD_IDS.juraku]

export const RULESETS: RuleSet[] = [
  { name: 'C0', passives: [], condEffects: {}, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none', notes: 'baseline（現行）' },
  { name: 'D1', passives: [], condEffects: {}, cardOverrides: NUMERIC_FIX, deckMode: 'recommended', stakeFix: 'none', notes: 'D：既存Effectの数値差し替えのみ（13枚）' },
  { name: 'E1', passives: [], condEffects: {}, cardOverrides: {}, deckMode: 'unified', stakeFix: 'none', notes: 'E：おすすめデッキ統一のみ' },
  { name: 'E2', passives: [], condEffects: {}, cardOverrides: NUMERIC_FIX, deckMode: 'unified', stakeFix: 'none', notes: 'E：数値差し替え＋デッキ統一' },
  { name: 'B1', passives: [], condEffects: COND_EFFECTS, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none', notes: 'B：条件付きEffectのみ（9枚）' },
  { name: 'B1u', passives: [], condEffects: COND_EFFECTS, cardOverrides: {}, deckMode: 'unified', stakeFix: 'none', notes: 'B：条件付きEffect（9枚）＋デッキ統一' },
  { name: 'A3', passives: pick(...G3), condEffects: {}, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none', notes: 'A：Passive 3神（蒼毘・笑蓮・福永）のみ' },
  { name: 'A7', passives: pick(...G7), condEffects: {}, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none', notes: 'A：Passive 全7神のみ' },
  { name: 'C3-4', passives: pick(...G3), condEffects: COND_EFFECTS_4, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none', notes: 'C：Passive 3神＋条件Effect 4枚' },
  { name: 'C3-9', passives: pick(...G3), condEffects: COND_EFFECTS, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none', notes: 'C：Passive 3神＋条件Effect 9枚' },
  { name: 'C5-9', passives: pick(...G5), condEffects: COND_EFFECTS, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none', notes: 'C：Passive 5神＋条件Effect 9枚' },
  { name: 'C7-9', passives: pick(...G7), condEffects: COND_EFFECTS, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none', notes: 'C：Passive 7神＋条件Effect 9枚' },
  { name: 'C3-9u', passives: pick(...G3), condEffects: COND_EFFECTS, cardOverrides: {}, deckMode: 'unified', stakeFix: 'none', notes: 'C：Passive 3神＋条件9枚＋デッキ統一' },
  { name: 'C7-9u', passives: pick(...G7), condEffects: COND_EFFECTS, cardOverrides: {}, deckMode: 'unified', stakeFix: 'none', notes: 'C：Passive 7神＋条件9枚＋デッキ統一' },
  { name: 'C7-9u-Fs', passives: pick(...G7), condEffects: COND_EFFECTS, cardOverrides: {}, deckMode: 'unified', stakeFix: 'soften', notes: 'F：＋神階Ⅳ85%／Ⅴ75%へ緩和' },
  { name: 'C7-9u-Fr', passives: pick(...G7), condEffects: COND_EFFECTS, cardOverrides: {}, deckMode: 'unified', stakeFix: 'replace', notes: 'F：Ⅳ・Ⅴ効率modifierを撤去し R5以降ATK+30%へ置換' },
  { name: 'C0-Fs', passives: [], condEffects: {}, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'soften', notes: 'F単独：現行＋神階緩和のみ（Root Cause寄与の切り分け）' },
]

export function rulesetByName(name: string): RuleSet {
  const r = RULESETS.find((x) => x.name === name)
  if (!r) throw new Error(`unknown ruleset ${name}`)
  return r
}
void incomingOf

// ---------------------------------------------------------------------------
// v2（pilot第1ラウンドの結果を受けた修正）
//  - 笑蓮：heal→共鳴（効果不足）を「無傷の慈愛：HPが満タンのとき攻撃カードのダメージ+50%」へ。
//    福永「大勝負：HP半分以下で+50%」と鏡像の対にし、「回復してから殴る」判断を作る
//  - 才華（コスト−1）・大耀（初撃+50%）は判断を変えない純粋強化だったため最小セットから除外
// ---------------------------------------------------------------------------
export const SHOUREN_V2: Passive = {
  godId: GOD_IDS.shouren, nameJa: '無傷の慈愛', textJa: 'HPが満タンのとき、攻撃カードのダメージ+50%。',
  afterPlay: ({ before, card }) => {
    const dmg = cardDamage(card.defId)
    if (before.player.hp >= before.player.maxHp && dmg > 0) return [{ kind: 'damage', target: 'enemy', amount: Math.floor(dmg * 0.5) }]
    return []
  },
}
const V2 = (ids: GodId[]) => ids.map((g) => (g === GOD_IDS.shouren ? SHOUREN_V2 : PASSIVES[g]))
const G2: GodId[] = [GOD_IDS.sobi, GOD_IDS.shouren]

/** 条件付きEffect v2（6枚）：蒼毘2・笑蓮2・共通2（守護／癒し） */
export const COND_EFFECTS_6: Partial<Record<CardDefId, CondEffect[]>> = {
  ...COND_EFFECTS_4,
  [CARD_IDS.guard]: COND_EFFECTS[CARD_IDS.guard],
  [CARD_IDS.heal]: COND_EFFECTS[CARD_IDS.heal],
}

export const RULESETS_V2: RuleSet[] = [
  { name: 'E1m', passives: [], condEffects: {}, cardOverrides: {}, deckMode: 'median', stakeFix: 'none', notes: 'E：中央値テンプレートでデッキ統一のみ' },
  { name: 'A2v2', passives: V2(G2), condEffects: {}, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none', notes: 'A：Passive 2神（蒼毘・笑蓮v2）のみ' },
  { name: 'A3v2', passives: V2(G3), condEffects: {}, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none', notes: 'A：Passive 3神（蒼毘・笑蓮v2・福永）のみ' },
  { name: 'C2-4v2', passives: V2(G2), condEffects: COND_EFFECTS_4, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none', notes: 'C：Passive 2神＋条件4枚' },
  { name: 'C3-4v2', passives: V2(G3), condEffects: COND_EFFECTS_4, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none', notes: 'C：Passive 3神＋条件4枚' },
  { name: 'C3-6v2', passives: V2(G3), condEffects: COND_EFFECTS_6, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none', notes: 'C：Passive 3神＋条件6枚（共通2含む）' },
  { name: 'C3-6v2m', passives: V2(G3), condEffects: COND_EFFECTS_6, cardOverrides: {}, deckMode: 'median', stakeFix: 'none', notes: 'C：Passive 3神＋条件6枚＋中央値デッキ統一' },
  { name: 'C3-6v2m-Fs', passives: V2(G3), condEffects: COND_EFFECTS_6, cardOverrides: {}, deckMode: 'median', stakeFix: 'soften', notes: 'F：＋神階Ⅳ85%／Ⅴ75%' },
]
RULESETS.push(...RULESETS_V2)
RULESETS.push({ name: 'C3-6v2-Fs', passives: V2(G3), condEffects: COND_EFFECTS_6, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'soften', notes: 'F：Passive 3神＋条件6枚（現行デッキ）＋神階Ⅳ85%／Ⅴ75%' })

// ---------------------------------------------------------------------------
// FINAL narrow pilots（Step 2.5 → FINAL SPEC）：笑蓮 閾値 / 蒼毘 係数 のみ
// ---------------------------------------------------------------------------
export function shourenPassive(ratio: number): Passive {
  return {
    godId: GOD_IDS.shouren, nameJa: '無傷の慈愛', textJa: `HPが最大の${Math.round(ratio * 100)}%以上のとき、攻撃カードのダメージ+50%。`,
    afterPlay: ({ before, card }) => {
      const dmg = cardDamage(card.defId)
      if (before.player.hp >= before.player.maxHp * ratio && dmg > 0) return [{ kind: 'damage', target: 'enemy', amount: Math.floor(dmg * 0.5) }]
      return []
    },
  }
}
export function sobiPassive(coef: number): Passive {
  return {
    godId: GOD_IDS.sobi, nameJa: '反撃の構え', textJa: `敵の攻撃を受け切って残ったブロックの${Math.round(coef * 100)}%を、敵へダメージとして返す。`,
    afterEnemyTurn: (s) => { const d = Math.floor(s.player.block * coef); return d >= 1 ? [{ kind: 'damage', target: 'enemy', amount: d }] : [] },
  }
}
const withVariant = (name: string, notes: string, shourenRatio: number, sobiCoef: number): RuleSet => ({
  name, notes, passives: [sobiPassive(sobiCoef), shourenPassive(shourenRatio), PASSIVES[GOD_IDS.fukuei]],
  condEffects: COND_EFFECTS_4, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none',
})
RULESETS.push(
  withVariant('F-S90', '笑蓮 HP90%以上で+50%（蒼毘50%）', 0.9, 0.5),
  withVariant('F-S80', '笑蓮 HP80%以上で+50%（蒼毘50%）', 0.8, 0.5),
  withVariant('F-S70', '笑蓮 HP70%以上で+50%（蒼毘50%）', 0.7, 0.5),
  withVariant('F-B75', '蒼毘 残ブロック75%反撃（笑蓮100%）', 1.0, 0.75),
  withVariant('F-B100', '蒼毘 残ブロック100%反撃（笑蓮100%）', 1.0, 1.0),
)
// FINAL SPEC v0.1 候補（narrow pilot 確定値）：蒼毘 残ブロック100%反撃／笑蓮 HP80%以上で+50%／福永 HP50%以下で+50%／条件付き4枚
// 実装後の再測定用：ルール層を一切かぶせず、本番engine（applyAction）そのものを測る
RULESETS.push({
  name: 'PROD', notes: '本番engine直結（ルール層なし＝実装済みのPassive/bonusを実測）',
  passives: [], condEffects: {}, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none',
})
RULESETS.push({
  name: 'FINAL', notes: 'FINAL SPEC v0.1：Passive 3神（蒼毘100%・笑蓮80%・福永50%）＋条件付き4枚',
  passives: [sobiPassive(1.0), shourenPassive(0.8), PASSIVES[GOD_IDS.fukuei]],
  condEffects: COND_EFFECTS_4, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none',
})
