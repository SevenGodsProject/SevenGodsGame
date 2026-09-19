import type { BonusCond, GameEvent, GameState } from '../../core/types'
import { RULES } from '../../core/data/rules'
import { getCardDef } from '../../core/data/cards'
import { getGodDef } from '../../core/data/gods'
import { formatScaled } from '../displayScale'
import { evaluateDefense } from './decisionFeedback'

/**
 * Phase 6-C Battle Recap（決定166）：勝敗の直後に「この1戦で実際に起きたこと」から
 * 短い振り返り（最大3行）を作る（表示専用・ルールベース）。
 *
 * ★約束：
 * - 推測しない。ログとゲーム終了時の GameState から**事実として数えられること**だけ使う
 * - 自由文章を生成しない。文は固定テンプレートに数値を入れるだけ
 * - 事実が十分に取れない（「続きから」再開でログが途中から）場合は、回数に依存する行を出さない
 * - 敗北の助言は高信頼ルールだけ。「この手を出せば勝てた」のような後知恵は書かない
 *   （条件に当てはまらなければ何も出さない＝誤った助言より無表示を選ぶ）
 */

export type RecapFacts = {
  /** ログが対局の最初（GAME_STARTED）から揃っているか */
  complete: boolean
  round: number
  /**
   * 決定206（Solve Legibility v1・B）：予告された攻撃の回数（敵が攻撃した、または予告があったのに 0 で終わった＝封じた）。
   * 溜め（予告 0）は数えない。`evaluateDefense` の `attacked || neutralized` をそのまま数えた事実
   */
  announced: number
  /** 決定206：そのうち HP が 1 も減らなかった回数（無傷で受け切った `perfect` ＋ 封じた `neutralized`） */
  unharmed: number
  /** 決定206：予告された攻撃に対して盾が吸収した合計（`DAMAGE_DEALT.blocked` の和。表示前スケール） */
  blockedTotal: number
  perfect: number
  perfectBig: number
  neutralized: number
  bonus: number
  bonusByCond: Partial<Record<BonusCond, number>>
  passive: number
  burstCount: number
  /** 決着のバッチに神の一撃（RESONANCE_BURST）が含まれていたか */
  burstFinish: boolean
  /** ログから復元した最低HP比率（0〜1）。復元が最終HPと一致しない場合は null */
  lowestHpRatio: number | null
  /** 神力を残したまま終えたラウンド数 */
  unusedApRounds: number
  divinationUses: number
  /** 決着ラウンドで託宣を使ったか */
  divinationUsedInLastRound: boolean
  /** 決着（敗北）の敵行動：実行値・予告・吸収したブロック。敗北でなければ null */
  fatal: { actedAmount: number; intentAmount: number | null; blocked: number; big: boolean } | null
  /** デッキに⚡付きカードが含まれているか（GameState から） */
  hasBonusCards: boolean
}

export type BattleRecap = {
  kind: 'victory' | 'defeat' | 'finished'
  /** 表示する行（最大3。空なら何も出さない） */
  lines: string[]
  facts: RecapFacts
}

export const RECAP_MAX_LINES = 3

/**
 * イベント列を「1アクション＝1バッチ」へ切る。区切りは各アクションの先頭イベント
 * （CARD_PLAYED／DIVINATION_USED／ENEMY_ACTED＝ラウンド終了）の直前。
 * reducer は GAME_ENDED をそのアクションの末尾に積むため、敗北の敵行動と
 * GAME_ENDED は同じバッチに入る（ROUND_ENDED で切ると分かれてしまう）。
 */
export function splitBatches(log: readonly GameEvent[]): GameEvent[][] {
  const batches: GameEvent[][] = []
  let cur: GameEvent[] = []
  for (const e of log) {
    if ((e.t === 'CARD_PLAYED' || e.t === 'DIVINATION_USED' || e.t === 'ENEMY_ACTED') && cur.length > 0) {
      batches.push(cur)
      cur = []
    }
    cur.push(e)
  }
  if (cur.length > 0) batches.push(cur)
  return batches
}

export function collectRecapFacts(log: readonly GameEvent[], state: GameState): RecapFacts {
  const complete = log.some((e) => e.t === 'GAME_STARTED')
  const batches = splitBatches(log)
  const threshold = RULES.cardBonus.enemyBigThreshold

  let announced = 0
  let unharmed = 0
  let blockedTotal = 0
  let perfect = 0
  let perfectBig = 0
  let neutralized = 0
  let bonus = 0
  const bonusByCond: Partial<Record<BonusCond, number>> = {}
  let passive = 0
  let burstCount = 0
  let unusedApRounds = 0
  let divinationUses = 0
  let intent: number | null = null
  let fatal: RecapFacts['fatal'] = null

  // HP の復元：DAMAGE_DEALT(self).amount は HP へ通った実値、HEALED.amount は実回復量（上限で切った後）
  let hp = state.player.maxHp
  let lowest = hp
  let hpValid = complete

  for (const batch of batches) {
    const defense = evaluateDefense(batch, intent)
    if (defense.attacked || defense.neutralized) {
      announced += 1
      blockedTotal += defense.blocked
    }
    if (defense.perfect || defense.neutralized) unharmed += 1
    if (defense.perfect) {
      perfect += 1
      if (defense.big) perfectBig += 1
    }
    if (defense.neutralized) neutralized += 1
    const ended = batch.find((e): e is Extract<GameEvent, { t: 'GAME_ENDED' }> => e.t === 'GAME_ENDED')
    if (ended?.status === 'lost' && batch.some((e) => e.t === 'ENEMY_ACTED' && e.kind !== 'charge')) {
      fatal = { actedAmount: defense.actedAmount, intentAmount: intent, blocked: defense.blocked, big: defense.actedAmount >= threshold }
    }
    for (const e of batch) {
      if (e.t === 'BONUS_TRIGGERED') {
        bonus += 1
        bonusByCond[e.when] = (bonusByCond[e.when] ?? 0) + 1
      } else if (e.t === 'PASSIVE_TRIGGERED') passive += 1
      else if (e.t === 'RESONANCE_BURST') burstCount += 1
      else if (e.t === 'ROUND_ENDED' && e.unusedAp > 0) unusedApRounds += 1
      else if (e.t === 'DIVINATION_USED') divinationUses += 1
      else if (e.t === 'DAMAGE_DEALT' && e.target === 'self') {
        hp = Math.max(0, hp - e.amount)
        lowest = Math.min(lowest, hp)
      } else if (e.t === 'HEALED') hp = Math.min(state.player.maxHp, hp + e.amount)
    }
    // 次のバッチのために予告を更新（敵ターンのバッチは ENEMY_ACTED のあとに次の予告が来る）
    for (const e of batch) if (e.t === 'ENEMY_INTENT_SET') intent = e.amount
  }
  if (hp !== state.player.hp) hpValid = false

  // 決着バッチ：GAME_ENDED を含むバッチに神の一撃があれば「神の一撃で決着」
  const last = batches.find((b) => b.some((e) => e.t === 'GAME_ENDED'))
  const burstFinish = !!last && last.some((e) => e.t === 'RESONANCE_BURST') && state.status === 'won'
  // 決着ラウンド内で託宣を使ったか：最後の ROUND_STARTED 以降に DIVINATION_USED があるか
  let lastRoundStart = -1
  for (let i = log.length - 1; i >= 0; i--) if (log[i].t === 'ROUND_STARTED') { lastRoundStart = i; break }
  const divinationUsedInLastRound = log.slice(Math.max(0, lastRoundStart)).some((e) => e.t === 'DIVINATION_USED')

  const allCards = [...state.hand, ...state.deck, ...state.discard]
  const hasBonusCards = allCards.some((c) => !!getCardDef(c.defId).bonus)

  return {
    complete,
    round: state.round,
    announced,
    unharmed,
    blockedTotal,
    perfect,
    perfectBig,
    neutralized,
    bonus,
    bonusByCond,
    passive,
    burstCount,
    burstFinish,
    lowestHpRatio: hpValid && state.player.maxHp > 0 ? lowest / state.player.maxHp : null,
    unusedApRounds,
    divinationUses,
    divinationUsedInLastRound,
    fatal,
    hasBonusCards,
  }
}

/** 危機とみなす最低HP比率（表示専用のしきい値。engine には無い概念なので RULES には置かない） */
export const RECAP_CRISIS_RATIO = 0.3

export function buildBattleRecap(log: readonly GameEvent[], state: GameState): BattleRecap | null {
  if (state.status === 'playing') return null
  const facts = collectRecapFacts(log, state)
  const lines: string[] = []
  const push = (s: string) => {
    if (lines.length < RECAP_MAX_LINES) lines.push(s)
  }

  // 決定206（Solve Legibility v1・B）：勝敗を問わず、予告された攻撃に対して実際に何が起きたかを 1 行目に置く
  // （評価・採点ではなく事実。ログが完全で、予告された攻撃が 1 回以上あったときだけ）
  const announcedLine = describeAnnouncedAttacks(facts)
  if (announcedLine) push(announcedLine)

  if (state.status === 'won') {
    // 勝因：起きた順ではなく「珍しく・大きい」順。回数はログが完全なときだけ主張する
    if (facts.burstFinish) push('神の一撃で決着しました')
    if (facts.complete) {
      if (facts.lowestHpRatio !== null && facts.lowestHpRatio <= RECAP_CRISIS_RATIO) {
        push(`HP${Math.round(facts.lowestHpRatio * 100)}%から立て直しました`)
      }
      if (facts.passive > 0) {
        const name = getGodDef(state.godId).passive?.nameJa
        push(name ? `得意技「${name}」が${facts.passive}回はたらきました` : `得意技が${facts.passive}回はたらきました`)
      }
      if (facts.bonus > 0) push(`⚡の条件を${facts.bonus}回成立させました`)
    }
    // 最低1行はこの戦闘固有の事実（撃破ラウンド）
    if (lines.length === 0) push(`ラウンド${facts.round}で撃破しました`)
    return { kind: 'victory', lines, facts }
  }

  // 敗北・未撃破：高信頼の助言を最大1行（当てはまらなければ出さない）
  const kind = state.status === 'lost' ? 'defeat' : 'finished'
  if (kind === 'finished' && state.enemy.hp > 0) {
    push(`あと${formatScaled(state.enemy.hp)}で撃破でした`)
  }
  const guidance = defeatGuidance(facts, state)
  if (guidance) push(guidance)
  return { kind, lines, facts }
}

/**
 * 決定206（Solve Legibility v1・B）：「予告された攻撃に対して、実際に何が起きたか」の 1 行。
 *
 * - 数えるのは `evaluateDefense` の事実だけ：予告された攻撃の回数と、そのうち HP が 1 も減らなかった回数
 * - 「読めた」「理解した」「意図して守った」などプレイヤーの意図は推測しない（文にも含めない）
 * - 旧「大技を N 回、無傷で受け切りました」「封じ切りました」の 2 行はこの 1 行に統合（分母が無いと 1 回が
 *   多いのか少ないのか分からないため）
 * - 「盾で防いだ量」を必ず添える：連撃型（双牙の魔獣）は初期デッキでは無傷が稀で、守ったのに「無傷 0 回」だけでは
 *   行動を変えた結果が Result に現れない。盾の吸収量はイベントの事実（敗因の助言「盾は30でした」と同じ語）。
 *   封じた回数は 0 でなければ内訳として添える
 * - 予告された攻撃が 0 回（R1 撃破など）や「続きから」でログが途中からのときは null＝出さない
 */
export function describeAnnouncedAttacks(facts: RecapFacts): string | null {
  if (!facts.complete || facts.announced <= 0) return null
  const detail = [`盾で防いだ量 ${formatScaled(facts.blockedTotal)}`, ...(facts.neutralized > 0 ? [`封じ${facts.neutralized}回`] : [])].join('・')
  if (facts.unharmed <= 0) return `予告された攻撃${facts.announced}回のうち、無傷で受け切った攻撃はありませんでした（${detail}）`
  return `予告された攻撃${facts.announced}回のうち、${facts.unharmed}回を無傷で受け切りました（${detail}）`
}

/**
 * 敗北の助言（ルールベース・最大1つ）。順に評価し、最初に当てはまったものだけ返す。
 * どれも「事実 ＋ 既存の仕組みへの一般的な案内」で、カード順序などの後知恵は書かない。
 */
export function defeatGuidance(facts: RecapFacts, state: GameState): string | null {
  // G1：致命の大技に対し、盾が実行値に届いていなかった（実行値と吸収量はイベントの事実）
  if (facts.fatal && facts.fatal.big && facts.fatal.blocked < facts.fatal.actedAmount) {
    return `R${facts.round}：${formatScaled(facts.fatal.actedAmount)}の大技に対し、盾は${formatScaled(facts.fatal.blocked)}でした。加護や防御札で予告ぶんの盾を用意すると受け切れます`
  }
  // G2：致命のラウンドに託宣が残っていたのに使っていない
  if (facts.fatal && !facts.divinationUsedInLastRound && state.divination.remaining > 0) {
    return `R${facts.round}：託宣が${state.divination.remaining}回残っていました。大きな予告の前は「加護」で盾を足せます`
  }
  if (!facts.complete) return null
  // G3：神力を残したまま終えたラウンドが複数
  if (facts.unusedApRounds >= 2) {
    return `神力を使い切らずに終えたラウンドが${facts.unusedApRounds}回ありました`
  }
  // G4：⚡付きカードを持っているのに一度も成立していない
  if (facts.hasBonusCards && facts.bonus === 0) {
    return '⚡の条件が一度も成立しませんでした。手札の⚡が光っているときに使うと追加効果が出ます'
  }
  return null
}
