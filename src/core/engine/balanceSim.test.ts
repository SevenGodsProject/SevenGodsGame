import { describe, expect, it } from 'vitest'
import { GODS } from '../data/gods'
import { ENEMIES, ENEMY_IDS } from '../data/enemies'
import { getCardDef } from '../data/cards'
import { getRecommendedDeck } from '../data/deckBuilder'
import type { StakeChoiceId } from '../types'
import type {
  BattleModifier,
  CardDefId,
  CardInstance,
  Difficulty,
  EnemyId,
  GameState,
  GodId,
  GrowthPath,
} from '../types'
import { applyAction } from './reducer'
import { RULES } from '../data/rules'

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

/** 予告されている被ダメージ合計（連撃・必殺技も含む。chargeは0） */
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
  const incoming = incomingOf(state)
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
  // DAILY-01：神域強化の検証用。未指定なら従来どおり（通常モード・恒等）
  modifier?: BattleModifier,
  // 決定126：神階の検証用（0/未指定＝通常）
  stake?: number,
  stakeChoice?: StakeChoiceId,
): SimResult {
  let { state } = applyAction(null, {
    type: 'START_GAME',
    seed,
    godId,
    enemyId,
    deck,
    otomoGrowthPath,
    difficulty,
    ...(modifier ? { mode: 'daily' as const, dailyKey: '2026-09-02', modifier } : {}),
    ...(stake ? { stake, ...(stakeChoice ? { stakeChoice } : {}) } : {}),
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
  }, 30000)

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

  /**
   * 決定58：決定57で「CEOに改めて相談する」とされていたhard×defensiveの膠着
   * （蒼毘・寿楽・笑蓮が未撃破100%）について、8/31完成披露ロードマップの
   * Task A1（難易度バランス修正）としてhard×全神(7)×全戦略(3)×全敵(7)=147通り
   * を実測した結果、以下が判明した：
   *
   *   1. 膠着（蒼毘/寿楽/笑蓮のdefensive戦略、双牙の魔獣を除く6敵）は、
   *      終了時の敵残りHPが平均2〜16%という僅差の「時間切れ」であり、
   *      決定57が示唆した「防御に全振りすれば一切攻撃しない」という
   *      構造的ロックではなかった。
   *   2. 膠着・敗北が発生する全21組み合わせについて、同じ神・同じ敵で
   *      balanced戦略が必ず73%以上（多くは88〜100%）の勝率を記録しており、
   *      「合理的な戦略では絶対に勝てない」という意味での詰みは0件だった
   *      （最弱は才華×双牙の魔獣で、最善戦略でも50%＝五分五分の接戦）。
   *
   * CEOはこの結果を受け、数値変更は行わずTask A1をクローズする判断をした。
   * 防御アーキタイプ（蒼毘・寿楽・笑蓮）がdefensive戦略でhard時に高確率で
   * 膠着する特性自体は、「堅実だが決め手に欠ける」という意図されたアーキ
   * タイプの個性として扱い、修正対象にしない。
   *
   * このテストは、将来のカード追加・数値調整によって「合理的な戦略
   * （balanced等）を選べば少なくとも五分五分以上で勝敗が成立する」という
   * 今回確認した状態が壊れていないかを保証する再現防止テスト。しきい値
   * 50%は今回実測した最弱値（才華×双牙の魔獣×defensive＝50%）に一致させて
   * おり、これを下回る＝新たな「詰み」が生まれたことを意味する。
   */
  it('決定58：hard×全神×全敵で、少なくとも1戦略が50%以上の勝率を保つことを保証する（再現防止）', () => {
    const strategies: Strategy[] = ['balanced', 'aggressive', 'defensive']
    const failures: string[] = []

    for (const enemy of ENEMIES) {
      for (const god of GODS) {
        const deck = getRecommendedDeck(god.id)
        let best = 0
        let bestStrategy: Strategy = 'balanced'
        for (const strategy of strategies) {
          const r = summarizeWinRate(god.nameJa, god.id, deck, strategy, 40, enemy.id, 'guardian', 'hard')
          if (r.winRate > best) {
            best = r.winRate
            bestStrategy = strategy
          }
        }
        if (best < 50) {
          failures.push(`${enemy.name} × ${god.nameJa}：最善戦略(${bestStrategy})でも勝率${best.toFixed(0)}%`)
        }
      }
    }

    expect(failures, `詰み（最善戦略でも勝率50%未満）が発生:\n${failures.join('\n')}`).toEqual([])
  }, 30000)

  /**
   * 決定59：Task A2（スコア係数チューニング）の実測分析結果を固定する再現防止
   * テスト。7神×3戦略×trialでスコア内訳を実測した結果、才華（コンボ型）が
   * 他神より約10〜20%高く、笑蓮（支援型・単発火力低め）が低いという偏りが
   * 判明したが、これは各神のアーキタイプ設計を素直に反映した意図的な差であり、
   * 両神とも勝率自体は健全（balanced/defensiveで88〜100%）だったため、CEOは
   * `rules.ts`のスコア係数・`gods.ts`の神固有値のいずれも変更しない判断をした。
   *
   * したがって、このテストは「7神のスコアを均一化する」方向の検証はあえて
   * 書かない（それ自体が今回の判断に反するため）。代わりに、今回確認した
   * ゲームデザイン上の性質——①勝利スコアが敗北スコアを常に大きく上回ること、
   * ②aggressive戦略が「勝率は低いが勝利時スコアは高い」というハイリスク・
   * ハイリターンを保っていること——が将来の変更で意図せず崩れていないかを
   * 保証する。
   */
  /**
   * DAILY-01：神域強化（`RULES.daily.modifier`）の下でも、7敵×7神の全組み合わせで
   * 少なくとも1戦略が50%以上の勝率を保つこと（決定58と同じ「詰み」基準）を保証する。
   * Dailyは難易度normal基準＋HP/攻撃倍率のため、hard（×1.15/×1.15）よりHPが重い。
   * あわせて神別の勝率・スコア分布（勝利時の平均/最小/最大の最終スコア）をログに出す
   * （数値確定・神格差の把握用。CEO決定4：条件を満たさなければ倍率を調整する）。
   */
  it('DAILY-01：神域強化×全神×全敵で、少なくとも1戦略が50%以上の勝率を保つ（Daily詰み防止）', () => {
    const strategies: Strategy[] = ['balanced', 'aggressive', 'defensive']
    const modifier = RULES.daily.modifier
    const failures: string[] = []
    const lines: string[] = []
    const SEEDS = 20

    for (const enemy of ENEMIES) {
      for (const god of GODS) {
        const deck = getRecommendedDeck(god.id)
        let best = 0
        let bestStrategy: Strategy = 'balanced'
        const perStrategy: string[] = []
        for (const strategy of strategies) {
          const results: SimResult[] = []
          for (let i = 0; i < SEEDS; i++) {
            results.push(
              playOneGame(
                `daily-${god.nameJa}-${enemy.id}-${strategy}-${i}`,
                strategy,
                god.id,
                deck,
                enemy.id,
                'guardian',
                'normal',
                modifier,
              ),
            )
          }
          const won = results.filter((r) => r.status === 'won')
          const winRate = (won.length / SEEDS) * 100
          // SimResult.scoreは素点total。表示スコアは`getFinalScore`と同じ×finalScale
          const finals = won.map((r) => Math.round(r.score * RULES.score.finalScale))
          const avg = finals.length ? Math.round(finals.reduce((a, b) => a + b, 0) / finals.length) : 0
          const min = finals.length ? Math.min(...finals) : 0
          const max = finals.length ? Math.max(...finals) : 0
          perStrategy.push(`${strategy}=${winRate.toFixed(0)}%（勝利時score avg${avg}/min${min}/max${max}）`)
          if (winRate > best) {
            best = winRate
            bestStrategy = strategy
          }
        }
        lines.push(`${enemy.name} × ${god.nameJa}: ${perStrategy.join(' / ')}`)
        if (best < 50) {
          failures.push(`${enemy.name} × ${god.nameJa}：最善戦略(${bestStrategy})でも勝率${best.toFixed(0)}%`)
        }
      }
    }
    console.log(`[DAILY-01 sim] modifier=${JSON.stringify(modifier)} seeds=${SEEDS}\n${lines.join('\n')}`)

    expect(failures, `Daily詰み（最善戦略でも勝率50%未満）:\n${failures.join('\n')}`).toEqual([])
  }, 60000)

  it('決定59：勝利スコアが敗北スコアを常に大きく上回ることを保証する（再現防止）', () => {
    const strategies: Strategy[] = ['balanced', 'aggressive', 'defensive']
    const wonScores: number[] = []
    const lostScores: number[] = []

    for (const god of GODS) {
      const deck = getRecommendedDeck(god.id)
      for (const strategy of strategies) {
        for (let i = 0; i < 40; i++) {
          const r = playOneGame(`scoreguard-${god.id}-${strategy}-${i}`, strategy, god.id, deck, ENEMY_IDS.trial)
          if (r.status === 'won') wonScores.push(r.score)
          else if (r.status === 'lost') lostScores.push(r.score)
        }
      }
    }

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
    const avgWon = avg(wonScores)
    const avgLost = avg(lostScores)

    // 実測（normal×trial）では勝利時平均800前後・敗北時平均300前後（約2.6倍）。
    // 1.5倍という余裕を持たせたしきい値で、将来の変更で逆転・接近しないことだけを保証する。
    expect(avgWon, `勝利時平均スコア${avgWon.toFixed(0)} / 敗北時平均スコア${avgLost.toFixed(0)}`).toBeGreaterThan(
      avgLost * 1.5,
    )
  })

  it('決定59：aggressive戦略の「勝率は低いが勝利時スコアは高い」ハイリスク・ハイリターン性を保証する（再現防止）', () => {
    const strategies: Strategy[] = ['balanced', 'aggressive']
    const stats: Record<Strategy, { won: number; total: number; wonScores: number[] }> = {
      balanced: { won: 0, total: 0, wonScores: [] },
      aggressive: { won: 0, total: 0, wonScores: [] },
      defensive: { won: 0, total: 0, wonScores: [] },
    }

    for (const god of GODS) {
      const deck = getRecommendedDeck(god.id)
      for (const strategy of strategies) {
        for (let i = 0; i < 40; i++) {
          const r = playOneGame(`riskreward-${god.id}-${strategy}-${i}`, strategy, god.id, deck, ENEMY_IDS.trial)
          stats[strategy].total++
          if (r.status === 'won') {
            stats[strategy].won++
            stats[strategy].wonScores.push(r.score)
          }
        }
      }
    }

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
    const aggWinRate = stats.aggressive.won / stats.aggressive.total
    const balWinRate = stats.balanced.won / stats.balanced.total
    const aggAvgWon = avg(stats.aggressive.wonScores)
    const balAvgWon = avg(stats.balanced.wonScores)

    // リスク：aggressiveの勝率はbalancedより明確に低い（現状81% vs 99%程度）
    expect(aggWinRate, `aggressive勝率${(aggWinRate * 100).toFixed(0)}% / balanced勝率${(balWinRate * 100).toFixed(0)}%`).toBeLessThan(
      balWinRate,
    )
    // リターン：aggressiveが勝ったときのスコアは、balancedの勝利時スコアを
    // 大きく下回らない（多少の余裕=0.9倍を許容しつつ、「リスクだけでリターンが
    // 無い」状態への劣化を検知する）
    expect(
      aggAvgWon,
      `aggressive勝利時平均${aggAvgWon.toFixed(0)} / balanced勝利時平均${balAvgWon.toFixed(0)}`,
    ).toBeGreaterThan(balAvgWon * 0.9)
  })

  /**
   * 第三次完成フェーズ（決定98）：ランキング向けスコア設計の検討材料として、
   * 勝利試合のみを対象に「最終スコア×撃破ラウンド×神×難易度」の相関を
   * 観察するための計測テスト。アサーションは持たない（既存の決定58・59
   * 再現防止テストとは独立で、それらのしきい値・ロジックには一切触れていない）。
   *
   * Opusレビューで示された「roundBonusの撃破ラウンド差（最大300点）は、
   * 早期撃破で失うcombo・oracleBonusの機会損失とほぼ相殺され、早期撃破と
   * 後期撃破の総スコアはほぼ等価になる」という算術上の推定を、実測ログとして
   * 残しておく。将来のランキング設計（9月以降）で、この相関を数値で
   * 再確認したいときにこのテストの出力を使う。
   *
   * `npx vitest run src/core/engine/balanceSim.test.ts --reporter=verbose`で
   * console.logを閲覧できる（既定reporterでは非表示、ファイル冒頭コメント参照）。
   */
  it('決定98：勝利試合の「最終スコア×撃破ラウンド×神×難易度」相関ログ（アサーションなし・計測専用）', () => {
    const strategies: Strategy[] = ['balanced', 'aggressive', 'defensive']
    const difficulties: Difficulty[] = ['easy', 'normal', 'hard']

    type WonSample = { god: string; difficulty: Difficulty; strategy: Strategy; round: number; score: number }
    const samples: WonSample[] = []

    for (const god of GODS) {
      const deck = getRecommendedDeck(god.id)
      for (const difficulty of difficulties) {
        for (const strategy of strategies) {
          for (let i = 0; i < 20; i++) {
            const r = playOneGame(
              `roundscore-${god.id}-${difficulty}-${strategy}-${i}`,
              strategy,
              god.id,
              deck,
              ENEMY_IDS.trial,
              'guardian',
              difficulty,
            )
            if (r.status === 'won') {
              samples.push({ god: god.nameJa, difficulty, strategy, round: r.round, score: r.score })
            }
          }
        }
      }
    }

    // 撃破ラウンド別の平均スコア（神・戦略・難易度を問わず全体で集計）。
    // 「早く倒すほどスコアが伸びるか、それとも他の得点源の機会損失で相殺されるか」を一目で見る。
    const byRound = new Map<number, number[]>()
    for (const s of samples) {
      const arr = byRound.get(s.round) ?? []
      arr.push(s.score)
      byRound.set(s.round, arr)
    }
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
    console.log('\n--- 決定98計測：撃破ラウンド別の平均スコア（全神・全戦略・全難易度、勝利試合のみ） ---')
    for (const round of [...byRound.keys()].sort((a, b) => a - b)) {
      const arr = byRound.get(round) ?? []
      console.log(`R${round}撃破: ${arr.length}件, 平均スコア${avg(arr).toFixed(1)}`)
    }

    // 神×難易度別の平均スコア・平均撃破ラウンド（デッキ構築＝神選択がスコアにどれだけ効くかの参考値）
    console.log('\n--- 決定98計測：神×難易度別の平均スコア・平均撃破ラウンド（勝利試合のみ） ---')
    for (const god of GODS) {
      for (const difficulty of difficulties) {
        const arr = samples.filter((s) => s.god === god.nameJa && s.difficulty === difficulty)
        if (arr.length === 0) continue
        console.log(
          `${god.nameJa} / ${difficulty}: ${arr.length}件, 平均スコア${avg(arr.map((s) => s.score)).toFixed(1)}, 平均撃破ラウンドR${avg(arr.map((s) => s.round)).toFixed(1)}`,
        )
      }
    }

    // 戦略別の平均スコア（アサーションなし。決定59の再現防止テストとは別集計）
    console.log('\n--- 決定98計測：戦略別の平均スコア（勝利試合のみ、全神・全難易度） ---')
    for (const strategy of strategies) {
      const arr = samples.filter((s) => s.strategy === strategy)
      console.log(`${strategy}: ${arr.length}件, 平均スコア${avg(arr.map((s) => s.score)).toFixed(1)}`)
    }
  })

  it('決定126 STAKE-01：神階Ⅰ〜Ⅶ×7神×7敵で、各神に少なくとも1戦略が段別の下限勝率を満たす（神の公平性ゲート）', () => {
    // 段別の下限（balanced基準の設計ターゲット Ⅰ85〜90 … Ⅶ25〜35% に対し、
    // 「最弱神でも理論的にクリア可能」を保証する床。Ⅶは最終試練3択の最良値で判定）
    const FLOOR: Record<number, number> = { 1: 55, 2: 45, 3: 35, 4: 30, 5: 20, 6: 15, 7: 10 }
    const SEEDS = 6
    const strategies: Strategy[] = ['aggressive', 'balanced', 'defensive']
    const choices: Array<StakeChoiceId | undefined> = [undefined, 'race', 'tempo']
    const lines: string[] = []
    const failures: string[] = []
    const overall: number[] = []
    for (let stake = 1; stake <= 7; stake++) {
      let totalW = 0
      let totalN = 0
      const godCells: string[] = []
      for (const god of GODS) {
        const deck = getRecommendedDeck(god.id)
        let bestGod = 0
        let bestLabel = ''
        for (const choice of stake === 7 ? choices : [undefined]) {
          for (const strategy of strategies) {
            let w = 0
            let n = 0
            for (const enemy of ENEMIES) {
              for (let i = 0; i < SEEDS; i++) {
                const r = playOneGame(
                  `stake-${stake}-${god.id}-${enemy.id}-${strategy}-${choice ?? 'p'}-${i}`,
                  strategy,
                  god.id,
                  deck,
                  enemy.id,
                  'guardian',
                  'normal',
                  undefined,
                  stake,
                  choice,
                )
                n++
                if (r.status === 'won') w++
              }
            }
            const rate = (w / n) * 100
            if (rate > bestGod) {
              bestGod = rate
              bestLabel = `${strategy.slice(0, 3)}${choice ? '/' + choice : ''}`
            }
            if (!choice || choice === 'race') {
              totalW += w
              totalN += n
            }
          }
        }
        godCells.push(`${god.nameJa} ${bestGod.toFixed(0)}%(${bestLabel})`)
        if (bestGod < FLOOR[stake]) failures.push(`神階${stake} ${god.nameJa}: best ${bestGod.toFixed(0)}% < floor ${FLOOR[stake]}%`)
      }
      const overallRate = (totalW / totalN) * 100
      overall.push(overallRate)
      lines.push(`神階${stake}: overall ${overallRate.toFixed(0)}% | ${godCells.join(' / ')}`)
    }
    console.log('\n--- STAKE-01 神階Ⅰ〜Ⅶ（7敵×' + SEEDS + 'seeds×3戦略、Ⅶは3択の最良） ---\n' + lines.join('\n'))
    expect(failures, failures.join('\n')).toEqual([])
    // 難易度曲線は単調（ノイズ許容 +5pt）
    for (let i = 1; i < overall.length; i++) {
      expect(overall[i]).toBeLessThanOrEqual(overall[i - 1] + 5)
    }
  })
})
