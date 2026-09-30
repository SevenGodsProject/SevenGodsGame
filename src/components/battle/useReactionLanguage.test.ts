import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { GODS } from '../../core/data/gods'
import { ENEMIES } from '../../core/data/enemies'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { getCardDef } from '../../core/data/cards'
import { applyAction } from '../../core/engine/reducer'
import { getGameVersion } from '../../core/replay/gameVersion'
import type { GameEvent, GameState } from '../../core/types'
import { planReaction } from './cardSemantic'
import { nextReactionFx } from './useReactionLanguage'
import type { ReactionLanguageFx } from './useReactionLanguage'

const INITIAL: ReactionLanguageFx = { braceKey: 0, breatheKey: 0, riseKey: 0, riseTone: null, staggerKey: 0, otomoKey: 0, dealKey: 0, dealUids: new Set(), apFlashKey: 0, last: null }

describe('決定249 nextReactionFx（key の増分・last の更新）', () => {
  it('primitive ごとに対応する key だけが増え、last は毎回更新される', () => {
    let fx = nextReactionFx(INITIAL, { semantic: 'GUARD', primitive: 'brace', tone: null, otomo: false, dealUids: [], apFlash: false, suppressed: 'none' })
    expect(fx.braceKey).toBe(1)
    fx = nextReactionFx(fx, { semantic: 'MEND', primitive: 'breathe', tone: null, otomo: true, dealUids: [], apFlash: false, suppressed: 'none' })
    expect([fx.braceKey, fx.breatheKey, fx.otomoKey]).toEqual([1, 1, 1])
    fx = nextReactionFx(fx, { semantic: 'TEMPO', primitive: 'deal', tone: null, otomo: false, dealUids: ['c9'], apFlash: true, suppressed: 'none' })
    expect([fx.dealKey, fx.apFlashKey, [...fx.dealUids]]).toEqual([1, 1, ['c9']])
    // 意味の無いバッチでも last は更新される（古い反応クラスを持ち越さない）
    fx = nextReactionFx(fx, { semantic: null, primitive: null, tone: null, otomo: false, dealUids: [], apFlash: false, suppressed: null })
    expect(fx.last?.primitive ?? null).toBe(null)
    expect(fx.dealKey).toBe(1)
  })
})

/** 素朴な方策で試合を進め、バッチごとの反応計画を集める（表示専用の計画が engine を変えないことも確認） */
function runGame(godId: GodId, enemyId: EnemyId, seed: string) {
  const deck = getRecommendedDeck(godId)
  let { state, events } = applyAction(null, { type: 'START_GAME', seed, godId, enemyId, deck, difficulty: 'normal' })
  const batches: GameEvent[][] = [events]
  let guard = 0
  while (state.status === 'playing' && guard++ < 400) {
    const card = state.hand.find((c) => getCardDef(c.defId).cost + (c.costModifier ?? 0) <= state.ap.current)
    let r
    if (card) r = applyAction(state, { type: 'PLAY_CARD', uid: card.uid })
    else if (state.divination.remaining > 0 && !state.divination.usedThisRound) r = applyAction(state, { type: 'USE_DIVINATION', choiceIndex: state.round % 3 })
    else r = applyAction(state, { type: 'END_ROUND' })
    state = r.state
    batches.push(r.events)
  }
  return { state, batches }
}
type GodId = GameState['godId']
type EnemyId = GameState['enemy']['defId']

describe('決定249 G3／G8：engine 不変・発火回数 ≤ 操作回数・1 バッチに体の primitive は 1 つ以下', () => {
  it('7 神 × 7 敵 × 3 seed：カード／託宣の操作数 ≥ primitive 数、STRIKE のバッチは新規 primitive 0、二重発火 0', () => {
    let plays = 0
    let primitives = 0
    let strikeBatches = 0
    for (const god of GODS) for (const enemy of ENEMIES) for (let s = 0; s < 3; s++) {
      const { batches } = runGame(god.id, enemy.id, `rl-${s}`)
      for (const b of batches) {
        const isOp = b.some((e) => e.t === 'CARD_PLAYED' || e.t === 'DIVINATION_USED')
        const plan = planReaction(b)
        if (isOp) {
          plays += 1
          expect(plan.semantic, 'G1: 操作バッチは必ず semantic を持つ').not.toBe(null)
        } else {
          expect(plan.primitive).toBe(null)
        }
        if (plan.primitive) primitives += 1
        if (plan.suppressed === 'strike') strikeBatches += 1
        // 体を動かす primitive は 1 つ（plan は単一値なので構造的に 1 以下）。突き（DAMAGE_DEALT enemy）と同居しない
        if (plan.primitive && plan.primitive !== 'deal') expect(b.some((e) => e.t === 'DAMAGE_DEALT')).toBe(false)
      }
    }
    expect(primitives).toBeLessThanOrEqual(plays)
    expect(strikeBatches).toBeGreaterThan(0)
    expect(primitives).toBeGreaterThan(0)
  })

  it('G2／G3：同じ seed・同じ操作で計画列も決着も完全一致し、gameVersion は決定247 と同じ（表示専用）', () => {
    const a = runGame(GODS[1].id, ENEMIES[5].id, 'rl-det')
    const b = runGame(GODS[1].id, ENEMIES[5].id, 'rl-det')
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state))
    expect(a.batches.map((x) => planReaction(x))).toEqual(b.batches.map((x) => planReaction(x)))
    // 決定251（Expected Specification Update）：RULES.stakes.lateRoundFrom 5→6 で dataFingerprint が変わった。
    // 決定247〜250 の版は 1.6c581e56a02c0730。engine 不変の検証（上の state 完全一致）は据え置き
    expect(getGameVersion()).toBe('1.d794038a00b5b53c')
  })
})

describe('決定249 CSS の衝突面（G5／G7）', () => {
  const css = readFileSync(fileURLToPath(new URL('./battle.css', import.meta.url)), 'utf8')
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const start = stripped.indexOf('.player-avatar-wrap {\n  --rl-rim') >= 0 ? stripped.indexOf('.player-avatar-wrap {\n  --rl-rim') : stripped.indexOf('.player-avatar-wrap {\r\n  --rl-rim')
  const block = stripped.slice(start)

  it('決定249 のブロックはファイル末尾（決定247 の反転ブロックより後）に追記されている', () => {
    expect(start).toBeGreaterThan(0)
    expect(stripped.lastIndexOf('scale: -1 1;')).toBeLessThan(start)
  })
  it('G5：reduce の @media を増やさない（決定232 のテスト前提を守る）。動きは no-preference の中だけ', () => {
    expect(block.includes('prefers-reduced-motion: reduce')).toBe(false)
    expect(block).toMatch(/@media \(prefers-reduced-motion: no-preference\)/)
    const motion = block.slice(block.indexOf('@media (prefers-reduced-motion: no-preference)'))
    const base = block.slice(0, block.indexOf('@media (prefers-reduced-motion: no-preference)'))
    // 既定（reduce 含む）では transform を動かさない：base に translate／scale の keyframe が無い
    expect(base).not.toMatch(/translate\(|translateX\(|translateY\(|scale\(/)
    expect(base).toMatch(/rl-rim-only 0\.12s/)
    expect(motion).toMatch(/@keyframes rl-brace/)
  })
  it('決定248 の上限：動き ≤4px・scale ≤1.06・時間 ≤0.4s', () => {
    const px = [...block.matchAll(/(-?\d+(?:\.\d+)?)px\)/g)].map((m) => Math.abs(+m[1])).filter((v) => v > 0)
    // リムの広がり（drop-shadow 12〜14px）は動きではないので除外：translate の値だけを見る
    const moves = [...block.matchAll(/translate[XY]?\((?:calc\([^)]*\* )?(-?\d+(?:\.\d+)?)px/g)].map((m) => Math.abs(+m[1]))
    expect(moves.length).toBeGreaterThan(0)
    expect(Math.max(...moves)).toBeLessThanOrEqual(8) // deal の立ち上がり 8px（札・体ではない）。体の動きは下で 4px
    // 体の keyframes（brace／breathe／rise／stagger／otomo）から drop-shadow（リムの広がり）を除いた px＝translate の値だけ
    const bodyMoves = [...block.matchAll(/@keyframes rl-(brace|breathe|rise|stagger|otomo-subtle)[\s\S]*?\n  \}/g)].flatMap((m) =>
      [...m[0].replace(/drop-shadow\([^)]*\)/g, '').matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((x) => Math.abs(+x[1])),
    )
    expect(bodyMoves.length).toBeGreaterThan(0)
    expect(Math.max(...bodyMoves)).toBeLessThanOrEqual(4)
    const durations = [...block.matchAll(/animation: rl-[a-z-]+ (\d+(?:\.\d+)?)s/g)].map((m) => +m[1])
    expect(Math.max(...durations)).toBeLessThanOrEqual(0.4)
    expect(px.length).toBeGreaterThan(0)
  })
  it('G7：新しい hit stop・数字・音・入力ロックを持ち込まない（CSS と TS の両方）', () => {
    expect(block).not.toMatch(/--stop|juice-stop|floating-number|z-index: 8/)
    const ts = readFileSync(fileURLToPath(new URL('./useReactionLanguage.ts', import.meta.url)), 'utf8') + readFileSync(fileURLToPath(new URL('./cardSemantic.ts', import.meta.url)), 'utf8')
    expect(ts).not.toMatch(/sfx\.|playBuffer|setTimeout|pendingCardUid|CARD_PLAY_REVEAL_MS/)
  })
})
