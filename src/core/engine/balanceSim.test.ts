import { describe, it } from 'vitest'
import { GODS } from '../data/gods'
import { ENEMIES, ENEMY_IDS } from '../data/enemies'
import { getCardDef } from '../data/cards'
import { getRecommendedDeck } from '../data/deckBuilder'
import type { CardDefId, CardInstance, Difficulty, EnemyId, GameState, GodId, GrowthPath } from '../types'
import { applyAction } from './reducer'

/**
 * バランス確認用シミュレーター（Plannerツール）。
 *
 * 実プレイでの難易度確認を人手で毎回やる代わりに、簡易AIで大量に自動対戦させ、
 * 勝率・敗北/未撃破の割合・撃破ラウンドの分布を出す。アサーションは持たない
 * （「正解の数値」が無いため）。`rules.ts` / `enemies.ts` / `gods.ts` / `otomo.ts` /
 * 神専用カードの数値を変えたら、以下のコマンドで結果を見ながら調整すること：
 *
 *   npx vitest run src/core/engine/balanceSim.test.ts --reporter=verbose
 *
 * 通常の `npm run test` では他のテストと同様に実行されるが、
 * console.log の内容は既定のreporterでは表示されない（＝CIを汚さない）。
 *
 * 決定26：Phase 5（決定24）・専用カード追加（決定25）により7神とも選べる
 * ようになったため、恵比寿固定だったシミュレーションを7神ループに拡張した。
 * デッキは`getRecommendedDeck`（恵比寿はSTARTER_DECKと同一）を使う。
 */

type Strategy = 'balanced' | 'aggressive' | 'defensive'

function damageOf(instance: CardInstance): number {
  const def = getCardDef(instance.defId)
  return def.effects
    .filter((e) => e.kind === 'damage' && e.target === 'enemy')
    .reduce((sum, e) => sum + (e as { amount: number }).amount, 0)
}

function blockOf(instance: CardInstance): number {
  const def = getCardDef(instance.defId)
  return def.effects
    .filter((e) => e.kind === 'block')
    .reduce((sum, e) => sum + (e as { amount: number }).amount, 0)
}

function healOf(instance: CardInstance): number {
  const def = getCardDef(instance.defId)
  return def.effects
    .filter((e) => e.kind === 'heal')
    .reduce((sum, e) => sum + (e as { amount: number }).amount, 0)
}

function costOf(instance: CardInstance): number {
  return getCardDef(instance.defId).cost + (instance.costModifier ?? 0)
}

/**
 * damage/block/heal以外の効果（draw・gainAp・buff・debuff等）を大まかに評価する。
 * 決定25で神専用カードにこれらの効果が増えたため、fallback選択（ダメージ札も
 * ブロック札も無いときの消去法）がそれらを一律「無価値」として扱わないようにする。
 * 係数は`baselineDamagePerAp`(1AP=5dmg)を目安にした粗いものでよい（AIは簡易実装のため）。
 */
function utilityOf(instance: CardInstance): number {
  const def = getCardDef(instance.defId)
  return def.effects.reduce((sum, e) => {
    switch (e.kind) {
      case 'draw':
        return sum + e.amount * 4
      case 'gainAp':
        return sum + e.amount * 4
      case 'resonance':
        return sum + e.amount * 2
      case 'buff':
        return sum + (e.target === 'self' ? e.amount * e.rounds : 0)
      case 'debuff':
        return sum + (e.target === 'enemy' ? e.amount * e.rounds : 0)
      case 'score':
        return sum + e.amount * 0.05
      default:
        return sum
    }
  }, 0)
}

function isDangerous(state: GameState): boolean {
  const incoming = state.enemy.intent?.kind === 'attack' ? state.enemy.intent.amount : 0
  const projectedHpLoss = Math.max(0, incoming - state.player.block)
  return state.player.hp - projectedHpLoss < state.player.maxHp * 0.35
}

/**
 * 託宣も「無料の手札」として同じ戦略ロジックで使う。
 * 0=加護(防御), 1=導き(手数), 2=天啓(攻撃)。
 */
function pickDivinationChoice(state: GameState, strategy: Strategy): number {
  if (strategy === 'defensive' || (strategy === 'balanced' && isDangerous(state))) {
    return 0
  }
  return 2
}

/**
 * 1枚選ぶ簡易AI。戦略ごとに優先順位を変える。
 *   balanced   … 危険なときだけ防御優先、それ以外は効率重視で攻撃
 *   aggressive … 常に攻撃優先（防御は「攻撃札が無いときの消去法」でのみ発生）
 *   defensive  … 防御・回復を優先するが、既に十分な備えがあれば無駄に積まない
 */
function pickCard(state: GameState, strategy: Strategy): CardInstance | null {
  const affordable = state.hand.filter((c) => costOf(c) <= state.ap.current)
  if (affordable.length === 0) return null

  const dangerous = isDangerous(state)
  // 決定26：想定される被害以上のブロックが既にあるなら、defensive戦略でも
  // 無駄にブロックを積み増さない（でないと防御カードが豊富な神で「守るだけで
  // 一切攻撃しない」という非現実的な手詰まりが起きるため）
  const incoming = state.enemy.intent?.kind === 'attack' ? state.enemy.intent.amount : 0
  const alreadyGuarded = state.player.block >= incoming

  if (strategy === 'defensive' || (strategy === 'balanced' && dangerous)) {
    if (!alreadyGuarded) {
      const blockCard = affordable
        .filter((c) => blockOf(c) > 0)
        .sort((a, b) => blockOf(b) - blockOf(a))[0]
      if (blockCard) return blockCard
    }
    const healCard = affordable
      .filter((c) => healOf(c) > 0)
      .sort((a, b) => healOf(b) - healOf(a))[0]
    if (healCard && state.player.hp < state.player.maxHp * 0.6) return healCard
  }

  const damageCard = affordable
    .filter((c) => damageOf(c) > 0)
    .sort((a, b) => damageOf(b) / costOf(b) - damageOf(a) / costOf(a))[0]
  if (damageCard) return damageCard

  // ダメージ札が無ければ、draw/gainAp/buff/debuffなどの価値で選び、
  // それも無ければAP無駄消費を避けるためコストの大きい順に消化する
  const utilityCard = affordable
    .filter((c) => utilityOf(c) > 0)
    .sort((a, b) => utilityOf(b) / costOf(b) - utilityOf(a) / costOf(a))[0]
  if (utilityCard) return utilityCard

  return affordable.sort((a, b) => costOf(b) - costOf(a))[0]
}

type SimResult = {
  status: string
  round: number
  score: number
  playerHp: number
  enemyHp: number
}

function playOneGame(
  seed: string,
  strategy: Strategy,
  godId: GodId,
  deck: CardDefId[],
  enemyId: EnemyId,
  otomoGrowthPath: GrowthPath = 'guardian',
  difficulty: Difficulty = 'normal',
): SimResult {
  let { state } = applyAction(null, {
    type: 'START_GAME',
    seed,
    godId,
    enemyId,
    deck,
    otomoGrowthPath,
    difficulty,
  })

  let guard = 0
  while (state.status === 'playing' && guard < 500) {
    guard++
    if (state.phase === 'playerTurn') {
      const card = pickCard(state, strategy)
      if (card) {
        const result = applyAction(state, { type: 'PLAY_CARD', uid: card.uid })
        state = result.state
        continue
      }
      // カードを使い切ったら、無料リソースの託宣も（このラウンドでまだなら）使ってからラウンドを終える。
      // 実プレイヤーなら無料の託宣を捨てる理由はないため、この挙動が現実的な上限に近い。
      if (state.divination.remaining > 0 && !state.divination.usedThisRound) {
        const result = applyAction(state, {
          type: 'USE_DIVINATION',
          choiceIndex: pickDivinationChoice(state, strategy),
        })
        state = result.state
        continue
      }
      const result = applyAction(state, { type: 'END_ROUND' })
      state = result.state
    } else {
      break
    }
  }

  return {
    status: state.status,
    round: state.round,
    score: state.score.total,
    playerHp: state.player.hp,
    enemyHp: state.enemy.hp,
  }
}

function summarize(
  godLabel: string,
  godId: GodId,
  deck: CardDefId[],
  strategy: Strategy,
  seeds: number,
  enemyId: EnemyId = ENEMY_IDS.trial,
) {
  const results: SimResult[] = []
  for (let i = 0; i < seeds; i++) {
    results.push(playOneGame(`sim-${godLabel}-${strategy}-${i}`, strategy, godId, deck, enemyId))
  }

  const won = results.filter((r) => r.status === 'won')
  const lost = results.filter((r) => r.status === 'lost')
  const finished = results.filter((r) => r.status === 'finished')
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

  console.log(`\n--- ${godLabel} / 戦略: ${strategy} (${seeds}回) ---`)
  console.log(
    `勝利: ${won.length}(${((won.length / seeds) * 100).toFixed(0)}%) / 敗北: ${lost.length} / 未撃破: ${finished.length}`,
  )
  console.log(`平均スコア: ${avg(results.map((r) => r.score)).toFixed(1)}`)
  console.log(`勝利時の平均ラウンド: ${avg(won.map((r) => r.round)).toFixed(1)}`)
  console.log(`敗北時の平均ラウンド: ${avg(lost.map((r) => r.round)).toFixed(1)}`)
  console.log(`勝利時の平均残りHP: ${avg(won.map((r) => r.playerHp)).toFixed(1)} / 30`)

  const histogram = new Map<number, number>()
  for (const r of won) histogram.set(r.round, (histogram.get(r.round) ?? 0) + 1)
  const rounds = [...histogram.keys()].sort((a, b) => a - b)
  console.log(
    `勝利ラウンド分布: ${rounds.map((r) => `R${r}=${histogram.get(r)}`).join(', ')}`,
  )
}

/**
 * 決定32の新6敵は`balanceSim.test.ts`が未対応（自動シミュレーター未検証）だった
 * ため、決定36で追加。7神×6敵×3戦略=126通りは全件verboseに出すと読みづらいので、
 * 勝率だけの1行サマリーにまとめ、0%または97.5%以上（決定21で「詰み」判定に使った
 * 基準と同じ）の組み合わせだけ「要調整」として別途フラグを立てる。
 */
function summarizeWinRate(
  godLabel: string,
  godId: GodId,
  deck: CardDefId[],
  strategy: Strategy,
  seeds: number,
  enemyId: EnemyId,
  otomoGrowthPath: GrowthPath = 'guardian',
  difficulty: Difficulty = 'normal',
): { winRate: number; lostRate: number; finishedRate: number; avgWinRound: number } {
  const results: SimResult[] = []
  for (let i = 0; i < seeds; i++) {
    results.push(
      playOneGame(
        `sim2-${godLabel}-${strategy}-${otomoGrowthPath}-${difficulty}-${i}`,
        strategy,
        godId,
        deck,
        enemyId,
        otomoGrowthPath,
        difficulty,
      ),
    )
  }
  const won = results.filter((r) => r.status === 'won')
  const lost = results.filter((r) => r.status === 'lost')
  const finished = results.filter((r) => r.status === 'finished')
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  return {
    winRate: (won.length / seeds) * 100,
    lostRate: (lost.length / seeds) * 100,
    finishedRate: (finished.length / seeds) * 100,
    avgWinRound: avg(won.map((r) => r.round)),
  }
}

describe('バランスシミュレーション（Planner用・アサーションなし）', () => {
  it('恵比寿：複数戦略×複数シードで難易度傾向を出力する', () => {
    const ebisu = GODS.find((g) => g.nameJa === '恵比寿')!
    const deck = getRecommendedDeck(ebisu.id)
    summarize(ebisu.nameJa, ebisu.id, deck, 'balanced', 40)
    summarize(ebisu.nameJa, ebisu.id, deck, 'aggressive', 40)
    summarize(ebisu.nameJa, ebisu.id, deck, 'defensive', 40)
  })

  it('他6神：おすすめデッキで複数戦略×複数シードの難易度傾向を出力する（決定26）', () => {
    for (const god of GODS) {
      if (god.nameJa === '恵比寿') continue
      const deck = getRecommendedDeck(god.id)
      summarize(god.nameJa, god.id, deck, 'balanced', 40)
      summarize(god.nameJa, god.id, deck, 'aggressive', 40)
      summarize(god.nameJa, god.id, deck, 'defensive', 40)
    }
  })

  it('新6敵（決定32）：7神×3戦略で勝率を出力し、0%/97.5%以上の組み合わせを検出する（決定36）', () => {
    const strategies: Strategy[] = ['balanced', 'aggressive', 'defensive']
    const newEnemies = ENEMIES.filter((e) => e.id !== ENEMY_IDS.trial)
    const flagged: string[] = []

    for (const enemy of newEnemies) {
      console.log(`\n=== 敵: ${enemy.name} (HP${enemy.maxHp}) ===`)
      for (const god of GODS) {
        const deck = getRecommendedDeck(god.id)
        const line: string[] = []
        for (const strategy of strategies) {
          const r = summarizeWinRate(god.nameJa, god.id, deck, strategy, 40, enemy.id)
          line.push(`${strategy}=${r.winRate.toFixed(0)}%(R${r.avgWinRound.toFixed(1)})`)
          if (r.winRate === 0 || r.winRate >= 97.5) {
            flagged.push(
              `${enemy.name} × ${god.nameJa} × ${strategy}: 勝率${r.winRate.toFixed(0)}%（未撃破${r.finishedRate.toFixed(0)}%）`,
            )
          }
        }
        console.log(`  ${god.nameJa}: ${line.join(' / ')}`)
      }
    }

    console.log('\n--- 要調整（勝率0%または97.5%以上） ---')
    if (flagged.length === 0) {
      console.log('なし')
    } else {
      for (const f of flagged) console.log(f)
    }
  })

  /**
   * 決定44で追加した「力の絆」（OTOMOの新しい成長パス）は、これまで
   * `balanceSim.test.ts`が未対応（自動シミュレーター未検証）だったため、
   * 決定47で追加。「守りの絆」はこれまでの3件のテストで検証済みなので、
   * ここでは「力の絆」だけを対象に、試練の影（trial、決定21・26で
   * 人間プレイの裏取り済みの基準）で7神×3戦略=21通りを検証する。
   * 決定36と同じく、0%または97.5%以上を「要調整」としてフラグする。
   */
  it('力の絆（決定44）：7神×3戦略で勝率を出力し、0%/97.5%以上の組み合わせを検出する（決定47）', () => {
    const strategies: Strategy[] = ['balanced', 'aggressive', 'defensive']
    const flagged: string[] = []

    for (const god of GODS) {
      const deck = getRecommendedDeck(god.id)
      const line: string[] = []
      for (const strategy of strategies) {
        const r = summarizeWinRate(god.nameJa, god.id, deck, strategy, 40, ENEMY_IDS.trial, 'power')
        line.push(`${strategy}=${r.winRate.toFixed(0)}%(R${r.avgWinRound.toFixed(1)})`)
        if (r.winRate === 0 || r.winRate >= 97.5) {
          flagged.push(
            `${god.nameJa}（力の絆） × ${strategy}: 勝率${r.winRate.toFixed(0)}%（未撃破${r.finishedRate.toFixed(0)}%）`,
          )
        }
      }
      console.log(`  ${god.nameJa}（力の絆）: ${line.join(' / ')}`)
    }

    console.log('\n--- 要調整（勝率0%または97.5%以上） ---')
    if (flagged.length === 0) {
      console.log('なし')
    } else {
      for (const f of flagged) console.log(f)
    }
  })

  /**
   * 決定57：CEOから「負け（HP0での敗北）がほとんど起きない、もう少し発生しうる
   * 方が緊張感が出る」との指摘を受けて調査。それまで`easy`/`hard`は決定39で
   * 倍率の計算式が正しいことをPlaywrightで一度確認しただけで、
   * `balanceSim.test.ts`では一度も難易度をシミュレーションしたことが無かった
   * （`normal`固定でしか勝率検証していなかった）ため、まずこのギャップを埋めた。
   *
   * 実際に出した数値（40戦×7神×3戦略×2難易度）は、単に「敗北率が低い」という
   * 単純な話ではなく、**戦略によって症状が真逆**という構造的な問題を示した：
   * hardの`aggressive`は既に才華93%・大耀45%・福永40%が敗北するほど致死的な
   * 一方、hardの`defensive`は蒼毘・笑蓮が**未撃破100%**（敗北0%・勝利0%）で
   * 完全な膠着状態になる。
   *
   * CEOはこの内訳を見て「防御一辺倒の膠着を崩す」方を選択。対策として①敵の
   * 攻撃にブロックで防げない「貫通ダメージ」、②hardでの回復量減衰、の2案を
   * 試作・シミュレーションしたが、いずれも蒼毘・笑蓮の未撃破100%を全く動かせず
   * （1戦ステップ実行で確認：APは毎ラウンド増え、被ダメージも回復力も同じAPで
   * まかなえるため、割合で削っても「防御に全AP割ける」戦略には追いつけない）、
   * むしろ他の戦略（balanced等）の生存率を無関係に悪化させただけだったため、
   * 両案とも撤回した（rules.ts/effects.tsへの変更は無し）。次に必要なのは
   * 「回復に上限を設ける」といった構造的な仕組みで、これは既存のEffect種別の
   * 延長では対応できず新しい設計判断が要るため、CEOに改めて相談する。
   */
  it('決定57：難易度ごとの敗北（HP0）率・膠着（未撃破）率を計測する', () => {
    const strategies: Strategy[] = ['balanced', 'aggressive', 'defensive']
    const difficulties: Difficulty[] = ['normal', 'hard']
    for (const difficulty of difficulties) {
      console.log(`\n=== 難易度: ${difficulty} ===`)
      for (const god of GODS) {
        const deck = getRecommendedDeck(god.id)
        const line: string[] = []
        for (const strategy of strategies) {
          const r = summarizeWinRate(god.nameJa, god.id, deck, strategy, 40, ENEMY_IDS.trial, 'guardian', difficulty)
          line.push(`${strategy}=勝${r.winRate.toFixed(0)}%/敗${r.lostRate.toFixed(0)}%/未${r.finishedRate.toFixed(0)}%`)
        }
        console.log(`  ${god.nameJa}: ${line.join(' / ')}`)
      }
    }
  })

})
