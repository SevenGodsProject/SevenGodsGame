import { describe, expect, it } from 'vitest'
import { GODS } from '../../src/core/data/gods.js'
import { ENEMIES } from '../../src/core/data/enemies.js'
import { ALL_CARDS, getCardDef } from '../../src/core/data/cards/index.js'
import { getRecommendedDeck } from '../../src/core/data/deckBuilder.js'
import { applyAction } from '../../src/core/engine/reducer.js'
import { previewBonusTrigger } from '../../src/core/engine/cardBonus.js'
import { playRecordedDailyRun } from '../../src/core/replay/replayTestUtils.js'
import { toReplayInput } from '../../src/core/replay/runLog.js'
import { runReplay } from '../../src/core/replay/replay.js'
import { getGameVersion } from '../../src/core/replay/gameVersion.js'
import type {
  CardDef,
  CardDefId,
  CardInstance,
  Difficulty,
  EnemyId,
  GameState,
  GodId,
} from '../../src/core/types/index.js'

/**
 * Phase 5-A：カード条件・連携の計測（決定153 の受入基準 4・5・6 用）。
 *
 * ★なぜ `scripts/` に置くか
 * `balanceSim.test.ts`（STAKE-01）はアサーション無しの Planner ツールで、
 * **bonus を見ない**方策で回している。難易度が動いていないかを測るにはそれが正しいが、
 * 「プレイヤーが条件を狙ったら選択が変わるか」は測れない。ここは**方策を2つ**持ち、
 * その差分を測る専用の計測器なので、本番テストとは分けてある。
 *
 * ★重い（数千戦）ので既定では走らせない
 * `P5A_RUN=1` を付けたときだけ実行する（`phase48-api/fixture.test.ts` と同じ方式）。
 *   npx vitest run --dir scripts --reporter=verbose
 *
 * ★2つの方策
 *   blind … `balanceSim` と同じ。bonus を一切見ない（＝現行プレイヤーの近似）
 *   aware … 「今このカードを出したら条件が立つか」（`previewBonusTrigger`）を
 *           価値に足す。＝条件を狙うプレイヤーの近似
 * この2つが**違うカードを選んだ回数**が、「順番・予告を見て選ぶ判断」の発生頻度。
 */

const RUN = process.env.P5A_RUN === '1'

type Policy = 'blind' | 'aware'

function costOf(instance: CardInstance): number {
  return Math.max(0, getCardDef(instance.defId).cost + (instance.costModifier ?? 0))
}

/** 効果の合計量（種類別）。bonus 側にも使えるよう Effect 配列を受ける */
function sumOf(def: CardDef, kind: 'damage' | 'block' | 'heal', fromBonus = false): number {
  const list = fromBonus ? (def.bonus?.effects ?? []) : def.effects
  return list.reduce((sum, e) => {
    if (kind === 'damage') return sum + (e.kind === 'damage' && e.target === 'enemy' ? e.amount : 0)
    if (kind === 'block') return sum + (e.kind === 'block' ? e.amount : 0)
    return sum + (e.kind === 'heal' ? e.amount : 0)
  }, 0)
}

/** draw / gainAp / resonance / buff / debuff をひとまとめにした「その他の価値」 */
function utilityOf(def: CardDef, fromBonus = false): number {
  const list = fromBonus ? (def.bonus?.effects ?? []) : def.effects
  return list.reduce((sum, e) => {
    switch (e.kind) {
      case 'draw':
        return sum + e.amount * 3
      case 'gainAp':
        return sum + e.amount * 4
      case 'resonance':
        return sum + e.amount * 3
      case 'buff':
      case 'debuff':
        return sum + e.amount * e.rounds
      default:
        return sum
    }
  }, 0)
}

function incomingOf(state: GameState): number {
  const intent = state.enemy.intent
  if (!intent) return 0
  if (intent.kind === 'attack' || intent.kind === 'special') return intent.amount
  if (intent.kind === 'multiAttack') return intent.hits.reduce((sum, h) => sum + h, 0)
  return 0
}

function isDangerous(state: GameState): boolean {
  const incoming = incomingOf(state)
  const projectedHpLoss = Math.max(0, incoming - state.player.block)
  return state.player.hp - projectedHpLoss < state.player.maxHp * 0.35
}

/**
 * 1枚ぶんの価値。`aware` のときだけ、**今出せば立つ条件**の分を足す。
 * 立たない条件は 0（＝「条件を立てにいく」先読みまではしない、控えめな見積り）。
 */
function valueOf(state: GameState, instance: CardInstance, policy: Policy): number {
  const def = getCardDef(instance.defId)
  const base = sumOf(def, 'damage') + sumOf(def, 'block') * 0.8 + sumOf(def, 'heal') * 0.8 + utilityOf(def)
  if (policy === 'blind' || !def.bonus) return base
  if (!previewBonusTrigger(state, def)) return base
  return (
    base +
    sumOf(def, 'damage', true) +
    sumOf(def, 'block', true) * 0.8 +
    sumOf(def, 'heal', true) * 0.8 +
    utilityOf(def, true)
  )
}

/** `balanceSim` の balanced 戦略と同じ骨格。価値関数だけ方策で差し替える */
function pickCard(state: GameState, policy: Policy): CardInstance | null {
  const affordable = state.hand.filter((c) => costOf(c) <= state.ap.current)
  if (affordable.length === 0) return null

  const incoming = incomingOf(state)
  if (isDangerous(state) && state.player.block < incoming) {
    const blockers = affordable.filter((c) => sumOf(getCardDef(c.defId), 'block') > 0)
    if (blockers.length > 0) {
      return blockers.sort((a, b) => valueOf(state, b, policy) - valueOf(state, a, policy))[0]
    }
  }
  return affordable.sort(
    (a, b) => valueOf(state, b, policy) / costOf(b) - valueOf(state, a, policy) / costOf(a),
  )[0]
}

type GameStats = {
  win: boolean
  round: number
  bonusTriggers: number
  /** blind と aware が別のカードを選んだ回数（＝順番・予告で選択が変わった回数） */
  divergences: number
  /** 使ったカードの種別内訳 */
  typeCounts: Record<string, number>
  /** 条件別の成立回数 */
  byCond: Record<string, number>
  /** カード別の成立回数 */
  byCard: Record<string, number>
}

function playOneGame(
  seed: string,
  godId: GodId,
  deck: CardDefId[],
  enemyId: EnemyId,
  policy: Policy,
  difficulty: Difficulty = 'normal',
  stake?: number,
): GameStats {
  let { state } = applyAction(null, {
    type: 'START_GAME',
    seed,
    godId,
    enemyId,
    deck,
    otomoGrowthPath: 'guardian',
    difficulty,
    ...(stake ? { stake } : {}),
  })

  let bonusTriggers = 0
  let divergences = 0
  const typeCounts: Record<string, number> = {}
  const byCond: Record<string, number> = {}
  const byCard: Record<string, number> = {}
  let guard = 0

  while (state.status === 'playing' && guard < 500) {
    guard++
    if (state.phase !== 'playerTurn') break

    const card = pickCard(state, policy)
    if (card) {
      // 「もう一方の方策なら別の札を選んだか」を、盤面を進めずに比べる
      const other = pickCard(state, policy === 'aware' ? 'blind' : 'aware')
      if (other && other.uid !== card.uid) divergences++

      const def = getCardDef(card.defId)
      typeCounts[def.type] = (typeCounts[def.type] ?? 0) + 1
      const result = applyAction(state, { type: 'PLAY_CARD', uid: card.uid })
      for (const e of result.events) {
        if (e.t !== 'BONUS_TRIGGERED') continue
        bonusTriggers++
        byCond[e.when] = (byCond[e.when] ?? 0) + 1
        byCard[getCardDef(e.defId).name] = (byCard[getCardDef(e.defId).name] ?? 0) + 1
      }
      state = result.state
      continue
    }
    if (state.divination.remaining > 0 && !state.divination.usedThisRound) {
      state = applyAction(state, { type: 'USE_DIVINATION', choiceIndex: 2 }).state
      continue
    }
    state = applyAction(state, { type: 'END_ROUND' }).state
  }

  return { win: state.status === 'won', round: state.round, bonusTriggers, divergences, typeCounts, byCond, byCard }
}

const SEEDS = 8

function measure(policy: Policy, difficulty: Difficulty) {
  const perGod: Record<string, { attack: number; total: number; win: number; games: number; bonus: number; div: number; rounds: number }> = {}
  const condTotals: Record<string, number> = {}
  const cardTotals: Record<string, number> = {}
  const perGodCond: Record<string, Record<string, number>> = {}
  for (const god of GODS) {
    const deck = getRecommendedDeck(god.id)
    const acc = { attack: 0, total: 0, win: 0, games: 0, bonus: 0, div: 0, rounds: 0 }
    perGodCond[god.id] = {}
    for (const enemy of ENEMIES) {
      for (let i = 0; i < SEEDS; i++) {
        const r = playOneGame(`p5a-${god.id}-${enemy.id}-${i}`, god.id, deck, enemy.id, policy, difficulty)
        const played = Object.values(r.typeCounts).reduce((a, b) => a + b, 0)
        acc.attack += r.typeCounts.attack ?? 0
        acc.total += played
        acc.win += r.win ? 1 : 0
        acc.games += 1
        acc.bonus += r.bonusTriggers
        acc.div += r.divergences
        acc.rounds += r.round
        for (const [k, v] of Object.entries(r.byCond)) { condTotals[k] = (condTotals[k] ?? 0) + v; perGodCond[god.id][k] = (perGodCond[god.id][k] ?? 0) + v }
        for (const [k, v] of Object.entries(r.byCard)) cardTotals[k] = (cardTotals[k] ?? 0) + v
      }
    }
    perGod[god.id] = acc
  }
  return { perGod, condTotals, cardTotals, perGodCond }
}

function report(label: string, policy: Policy, difficulty: Difficulty) {
  const { perGod, condTotals, cardTotals, perGodCond } = measure(policy, difficulty)
  const shares: number[] = []
  const lines: string[] = []
  let totalBonus = 0
  let totalDiv = 0
  let totalGames = 0
  let totalWin = 0
  let totalRounds = 0
  for (const god of GODS) {
    const a = perGod[god.id]
    const share = a.total > 0 ? (a.attack / a.total) * 100 : 0
    shares.push(share)
    totalBonus += a.bonus
    totalDiv += a.div
    totalGames += a.games
    totalWin += a.win
    totalRounds += a.rounds
    const mix = Object.entries(perGodCond[god.id] ?? {})
      .sort((x, y) => y[1] - x[1])
      .map(([k, v]) => `${k} ${(v / a.games).toFixed(2)}`)
      .join(' ')
    lines.push(
      `  ${god.nameJa}: 攻撃比率 ${share.toFixed(1)}% / 勝率 ${((a.win / a.games) * 100).toFixed(0)}% / bonus ${(a.bonus / a.games).toFixed(2)}回per戦 / 選択差 ${(a.div / a.games).toFixed(2)}回per戦 / 条件内訳 ${mix}`,
    )
  }
  const spread = Math.max(...shares) - Math.min(...shares)
  console.log(
    `\n=== ${label}（policy=${policy} / ${difficulty} / ${GODS.length}神 × ${ENEMIES.length}敵 × ${SEEDS}seeds = ${totalGames}戦） ===\n` +
      lines.join('\n') +
      `\n  → 攻撃比率の幅（最大−最小）: ${spread.toFixed(1)}pt` +
      `\n  → 条件別/戦: ` +
      Object.entries(condTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${(v / totalGames).toFixed(2)}`)
        .join(' / ') +
      `\n  → カード別/戦(上位8): ` +
      Object.entries(cardTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([k, v]) => `${k} ${(v / totalGames).toFixed(2)}`)
        .join(' / ') +
      `\n  → 全体: 勝率 ${((totalWin / totalGames) * 100).toFixed(0)}% / bonus ${(totalBonus / totalGames).toFixed(2)}回per戦 / 選択差 ${(totalDiv / totalGames).toFixed(2)}回per戦 / 平均 ${(totalRounds / totalGames).toFixed(2)}R`,
  )
  return { spread, bonusPerGame: totalBonus / totalGames, divPerGame: totalDiv / totalGames, winRate: (totalWin / totalGames) * 100, roundsPerGame: totalRounds / totalGames }
}

/**
 * `gameVersion.test.ts` の golden replay を作り直すための生成器（`P5A_GOLDEN=1` のときだけ動く）。
 *
 * ★なぜ必要になるか
 * golden は「固定の操作列」で、カードの効きが変われば**途中で不正な操作列になる**
 * （例：敵が早く倒れて、そのあとの END_ROUND が拒否される）。そうなると
 * 「結果が変わったか」を比べる以前に再生できないので、入力ごと作り直すしかない。
 * 入力と期待値は**必ずセットで**差し替える（片方だけ直すと検出の意味が無くなる）。
 */
/**
 * 追加効果の「1回あたりの量」を掃引して、難易度を動かさない上限を探す（`P5A_SWEEP=1`）。
 *
 * ★なぜ要るか
 * Phase 5-A の初回実装（監査文書 §4-4 の仮値）は STAKE-01 を +11〜+18pt 押し上げた。
 * 原因は成立**頻度**ではなく（条件別の内訳は狙いどおりだった）、1回あたりの
 * damage / block / heal が大きすぎたこと。値を勘で上下させず、倍率を振って
 * 「どこまでなら難易度が動かないか」を先に測るための道具。
 *
 * 神階のかかり方は `balanceSim` の STAKE-01 と同じ形（stake 1〜7）にしてあるが、
 * 戦略は balanced 1本・3択なしに簡略化してある。**絶対値ではなく倍率間の差**を見る。
 */
describe.skipIf(process.env.P5A_SWEEP !== '1')('追加効果の量の掃引（難易度への影響）', () => {
  it('倍率ごとに神階Ⅰ〜Ⅶの勝率を出す', () => {
    const commonBonusCards = ALL_CARDS.filter((c) => c.bonus && !c.godId)
    // 元の値を退避（掃引後に必ず戻す）
    const original = commonBonusCards.map((c) => ({
      card: c,
      effects: c.bonus!.effects.map((e) => ({ ...e })),
    }))

    // どの成分が難易度を動かしているのかを切り分ける。
    //   off       … 追加効果を全部消した素の状態（この harness での基準線）
    //   full      … 現在の実装
    //   noTempo   … 共鳴・ドロー・神力の追加だけ消す（＝火力/防御の追加だけ残す）
    //   noPower   … 火力/防御/回復の追加だけ消す（＝テンポの追加だけ残す）
    //   half      … 火力/防御/回復だけ半分
    const variants: Array<[string, (kind: string) => 'keep' | 'drop' | 'half']> = [
      ['off', () => 'drop'],
      ['full', () => 'keep'],
      ['noTempo', (k) => (k === 'resonance' || k === 'draw' || k === 'gainAp' ? 'drop' : 'keep')],
      ['noPower', (k) => (k === 'damage' || k === 'block' || k === 'heal' ? 'drop' : 'keep')],
      ['half', (k) => (k === 'damage' || k === 'block' || k === 'heal' ? 'half' : 'keep')],
    ]
    for (const [scale, decide] of variants) {
      for (const { card, effects } of original) {
        const mutable = card.bonus as unknown as { effects: unknown }
        mutable.effects = effects
          .map((e) => {
            const verdict = decide(e.kind)
            if (verdict === 'drop') return null
            if (verdict === 'half') return { ...e, amount: Math.max(1, Math.round(e.amount / 2)) }
            return { ...e }
          })
          .filter((e) => e !== null) as never
      }

      const lines: string[] = []
      for (let stake = 1; stake <= 7; stake++) {
        let win = 0
        let n = 0
        for (const god of GODS) {
          const deck = getRecommendedDeck(god.id)
          for (const enemy of ENEMIES) {
            for (let i = 0; i < 6; i++) {
              const r = playOneGame(
                `stake-${stake}-${god.id}-${enemy.id}-${i}`,
                god.id,
                deck,
                enemy.id,
                'blind',
                'normal',
                stake,
              )
              win += r.win ? 1 : 0
              n++
            }
          }
        }
        lines.push(`神階${stake}: ${((win / n) * 100).toFixed(0)}%`)
      }
      console.log(`\n[scale=${scale}] ${lines.join(' / ')}`)
    }

    // 復元
    for (const { card, effects } of original) {
      ;(card.bonus as unknown as { effects: unknown }).effects = effects
    }
    expect(true).toBe(true)
  })
})

describe.skipIf(process.env.P5A_GOLDEN !== '1')('golden replay の再生成', () => {
  it('2026-09-09・恵比寿・おすすめデッキで、決着まで進む操作列を書き出す', () => {
    const dailyKey = '2026-09-09'
    const godId = GODS[0].id // ebisu
    const deck = getRecommendedDeck(godId)
    for (const policySeed of [4801, 7, 42, 1234, 99]) {
      const run = playRecordedDailyRun({ dailyKey, godId, deck, otomoGrowthPath: 'guardian', policySeed })
      if (!run.log) continue
      const input = toReplayInput(run.log)
      const replayed = runReplay(input)
      if (!replayed.ok) continue
      const o = replayed.outcome
      console.log(
        `\n=== policySeed=${policySeed} / actions=${input.actions.length} / ${o.status} R${o.round} score=${o.score} ===\n` +
          `GOLDEN_INPUT = ${JSON.stringify(input, null, 2)}\n\n` +
          `GOLDEN = ${JSON.stringify(
            {
              gameVersion: getGameVersion(),
              outcome: {
                enemyId: o.enemyId,
                seedId: o.seedId,
                godId: o.godId,
                status: o.status,
                win: o.win,
                round: o.round,
                score: o.score,
                playerHp: o.playerHp,
                enemyHp: o.enemyHp,
                rngCursor: o.rngCursor,
                actionCount: o.actionCount,
              },
            },
            null,
            2,
          )}`,
      )
      break
    }
    expect(true).toBe(true)
  })
})

describe.skipIf(!RUN)('Phase 5-A カード条件の計測', () => {
  it('方策2種 × 難易度2種で、攻撃比率の幅・bonus成立頻度・選択差を出す', () => {
    const blindNormal = report('blind × ふつう（現行プレイヤー近似・STAKE-01と同じ見方）', 'blind', 'normal')
    const awareNormal = report('aware × ふつう（条件を狙うプレイヤー）', 'aware', 'normal')
    const awareHard = report('aware × むずかしい', 'aware', 'hard')
    console.log(
      `\n--- 受入基準の見方 ---\n` +
        `  #4 攻撃比率の幅（aware/ふつう）: ${awareNormal.spread.toFixed(1)}pt（目標 12pt 以上）\n` +
        `  #5 bonus成立頻度（aware/ふつう）: ${awareNormal.bonusPerGame.toFixed(2)}回/戦（基準 4回以上）\n` +
        `  #6 選択差（aware/ふつう）: ${awareNormal.divPerGame.toFixed(2)}回/戦（基準 1回以上）\n` +
        `  参考 blind/ふつう: 幅 ${blindNormal.spread.toFixed(1)}pt / bonus ${blindNormal.bonusPerGame.toFixed(2)} / 勝率 ${blindNormal.winRate.toFixed(0)}%\n` +
        `  参考 aware/むずかしい: bonus ${awareHard.bonusPerGame.toFixed(2)} / 勝率 ${awareHard.winRate.toFixed(0)}%`,
    )
    expect(awareNormal.winRate).toBeGreaterThan(0)
  })
})
