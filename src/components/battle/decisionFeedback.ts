import type { BonusCond, GameEvent, GodId } from '../../core/types'
import { RULES } from '../../core/data/rules'
import { getGodDef } from '../../core/data/gods'
import { formatScaled } from '../displayScale'
import { CARD_IMPACT_MS } from './enemyVfxTiming'
import type { BatchPlan } from './combatTimeline'

/**
 * Phase 6-C Decision Feedback（決定166）：「良い判断が成立した瞬間」を短く返す計画（表示専用）。
 *
 * ★この層は新しいゲームシステムではない。Phase 5 までに**既に存在する**判断
 * （予告読み・加護・完全防御・条件⚡・神の得意技）が成立したことを、
 * 既存の GameEvent と既存の RULES だけから**事実として**検出して言葉にする。
 *
 * 設計上の約束：
 * - engine・GameState・スコア・Mastery には一切触れない（読むだけ）
 * - 存在しない意味を作らない。文言はイベントとルール値の言い換えに限る
 * - 1 アクション（1バッチ）につき **最大1件**。複数成立したら priority で1つだけ選ぶ
 * - 6-A の見せ場（神の一撃・撃破）とは競合させない（そのバッチでは出さない）
 * - 時刻は着弾計画（combatTimeline）と同じ時計を使い、**着弾のあと**に出す
 */

/** callout の表示時間（CEO 指定 0.6〜0.8 秒の中央） */
export const CALLOUT_MS = 700
/** 最後の着弾から callout までの間（数字のポップと重ならないようにする） */
export const CALLOUT_AFTER_IMPACT_MS = 240

export type CalloutTone = 'defense' | 'identity' | 'read' | 'bonus'

export type CalloutId =
  | 'perfect-big'
  | 'neutralized-big'
  | 'counter'
  | 'passive'
  | 'perfect'
  | 'neutralized'
  | 'bonus-blocked'
  | 'bonus-enemyBig'
  | 'bonus-combo'
  | 'bonus-charged'
  | 'bonus-lowHp'

/**
 * 優先順位（CEO 指定の 1〜4 に対応）：
 * 1 大技に対する優れた防御判断／2 神固有 Identity の成立／
 * 3 予告を読んだ判断／4 その他の条件成立
 */
export type CalloutPriority = 1 | 2 | 3 | 4

export type Callout = {
  id: CalloutId
  priority: CalloutPriority
  tone: CalloutTone
  /** 主文（短く） */
  label: string
  /** 副文（なぜ成立したかの事実） */
  sub: string
  /** commit を 0ms とした表示開始時刻 */
  atMs: number
  /** 同一ラウンド内で同じキーは1回だけ出す（null＝抑制しない） */
  dedupeKey: string | null
}

export type CalloutContext = {
  /** そのバッチの着弾計画（時刻の真実） */
  plan: BatchPlan
  /**
   * この敵行動の**予告**合計（内部値）。`ENEMY_INTENT_SET.amount` の直近値で、
   * デバフ適用前の値。「無力化」（予告はあったのに実行時0になった）の判定に使う。
   * 分からない場合は null（その場合は無力化を主張しない）
   */
  intentAmount: number | null
  godId?: GodId
}

/** 大技のしきい値は engine と同じ 1 か所（`RULES.cardBonus.enemyBigThreshold`）から読む */
export const bigThreshold = () => RULES.cardBonus.enemyBigThreshold

const BONUS_SUB: Record<BonusCond, () => string> = {
  // 文言は card.ts の条件定義そのままの言い換え（意味を足さない）
  blocked: () => '盾が予告を超えた',
  enemyBig: () => `予告${formatScaled(RULES.cardBonus.enemyBigThreshold)}以上の直前`,
  combo: () => `このラウンド${RULES.cardBonus.comboMinCardsPlayed + 1}枚目以降`,
  charged: () => `共鳴${RULES.cardBonus.chargedThreshold}以上`,
  lowHp: () => `HPが最大の${Math.round(RULES.cardBonus.lowHpRatio * 100)}%以下`,
}

const BONUS_ID: Record<BonusCond, CalloutId> = {
  blocked: 'bonus-blocked',
  enemyBig: 'bonus-enemyBig',
  combo: 'bonus-combo',
  charged: 'bonus-charged',
  lowHp: 'bonus-lowHp',
}

/** 予告を読んだ判断（3）と、自分の状態だけで決まる条件（4）を分ける */
const BONUS_PRIORITY: Record<BonusCond, CalloutPriority> = {
  blocked: 3,
  enemyBig: 3,
  combo: 4,
  charged: 4,
  lowHp: 4,
}

/** そのバッチの「敵が実際に行動した」イベント（溜めは行動ではないので除く） */
function actedOf(events: readonly GameEvent[]): Extract<GameEvent, { t: 'ENEMY_ACTED' }> | null {
  for (const e of events) if (e.t === 'ENEMY_ACTED' && e.kind !== 'charge') return e
  return null
}

export type DefenseOutcome = {
  /** 敵が実際に攻撃した（溜め・無行動ではない） */
  attacked: boolean
  /** 実行時の攻撃力合計（デバフ適用後） */
  actedAmount: number
  /** HP へ通った合計 */
  dealt: number
  /** ブロックで吸収した合計 */
  blocked: number
  /** 攻撃を受けて HP 被害 0（＝ブロックで受け切った） */
  perfect: boolean
  /** 予告はあったが実行時 0 になった（＝デバフで封じた） */
  neutralized: boolean
  /** 予告／実行値が大技しきい値以上だったか */
  big: boolean
}

/**
 * 1バッチの防御結果を、イベントの事実だけから求める（テストから直接検証できる純関数）。
 *
 * - `applyDamage` は完全ブロック時も `DAMAGE_DEALT{amount:0, blocked>0}` を必ず出す
 * - `round.ts` はデバフで 0 以下になった hit を捨てるため、全部消えると
 *   `ENEMY_ACTED{amount:0}` だけが残る＝「無力化」
 * - 元から 0 ダメージの行動（charge）と、予告が無い場合は**どちらも主張しない**
 */
export function evaluateDefense(events: readonly GameEvent[], intentAmount: number | null): DefenseOutcome {
  const acted = actedOf(events)
  if (!acted) {
    return { attacked: false, actedAmount: 0, dealt: 0, blocked: 0, perfect: false, neutralized: false, big: false }
  }
  let dealt = 0
  let blocked = 0
  let hits = 0
  for (const e of events) {
    if (e.t === 'DAMAGE_DEALT' && e.target === 'self') {
      dealt += e.amount
      blocked += e.blocked
      hits += 1
    }
  }
  const threshold = bigThreshold()
  const perfect = acted.amount > 0 && hits > 0 && dealt === 0 && blocked > 0
  const neutralized = acted.amount === 0 && intentAmount !== null && intentAmount > 0
  const scale = neutralized ? (intentAmount ?? 0) : acted.amount
  return {
    attacked: acted.amount > 0,
    actedAmount: acted.amount,
    dealt,
    blocked,
    perfect,
    neutralized,
    big: scale >= threshold,
  }
}

/** そのバッチで成立した callout 候補をすべて並べる（priority 昇順ではない） */
export function collectCallouts(events: readonly GameEvent[], ctx: CalloutContext): Callout[] {
  const out: Callout[] = []
  const anchor = (ctx.plan.lastImpactMs ?? CARD_IMPACT_MS) + CALLOUT_AFTER_IMPACT_MS

  const defense = evaluateDefense(events, ctx.intentAmount)
  if (defense.perfect) {
    out.push({
      id: defense.big ? 'perfect-big' : 'perfect',
      priority: defense.big ? 1 : 3,
      tone: 'defense',
      label: '完封！',
      sub: defense.big
        ? `予告${formatScaled(defense.actedAmount)}の大技を無傷で受け切った`
        : `${formatScaled(defense.actedAmount)}の攻撃を無傷で受け切った`,
      atMs: anchor,
      dedupeKey: null,
    })
  }
  if (defense.neutralized) {
    out.push({
      id: defense.big ? 'neutralized-big' : 'neutralized',
      priority: defense.big ? 1 : 3,
      tone: 'defense',
      label: '無力化！',
      sub: defense.big
        ? `予告${formatScaled(ctx.intentAmount ?? 0)}の大技を封じ切った`
        : `予告${formatScaled(ctx.intentAmount ?? 0)}を封じ切った`,
      atMs: anchor,
      dedupeKey: null,
    })
  }

  for (const e of events) {
    if (e.t !== 'PASSIVE_TRIGGERED') continue
    const nameJa = ctx.godId ? getGodDef(ctx.godId).passive?.nameJa : undefined
    if (e.passiveId === 'sobi_counter') {
      out.push({
        id: 'counter',
        priority: 2,
        tone: 'identity',
        label: '反撃！',
        sub: `受け切った盾が${formatScaled(e.amount)}の刃になった`,
        atMs: anchor,
        dedupeKey: null,
      })
    } else {
      out.push({
        id: 'passive',
        priority: 2,
        tone: 'identity',
        label: '得意技！',
        sub: nameJa ? `「${nameJa}」で+${formatScaled(e.amount)}` : `+${formatScaled(e.amount)}`,
        atMs: anchor,
        dedupeKey: null,
      })
    }
  }

  for (const e of events) {
    if (e.t !== 'BONUS_TRIGGERED') continue
    out.push({
      id: BONUS_ID[e.when],
      priority: BONUS_PRIORITY[e.when],
      tone: e.when === 'combo' ? 'bonus' : BONUS_PRIORITY[e.when] === 3 ? 'read' : 'bonus',
      label: e.when === 'combo' ? '⚡ 連携！' : '⚡ 条件成立',
      sub: BONUS_SUB[e.when](),
      atMs: anchor,
      // 同じ条件は 1 ラウンドに 1 回だけ（連打でうるさくしない）
      dedupeKey: `bonus:${e.when}`,
    })
  }

  return out
}

export type CalloutDecision = {
  callout: Callout | null
  /** 出さなかった理由（計測・テスト用） */
  reason: 'none' | 'big-moment' | 'outcome' | 'duplicate' | null
  /** priority で負けて出せなかった候補の数 */
  losers: number
}

/**
 * そのバッチで出す callout を 1 件だけ決める。
 *
 * @param shownThisRound 同じラウンドで既に出した dedupeKey の集合
 */
export function planCallout(
  events: readonly GameEvent[],
  ctx: CalloutContext,
  shownThisRound: ReadonlySet<string> = new Set(),
): CalloutDecision {
  // 6-A の最大の見せ場と競合させない：神の一撃のバッチ、決着したバッチでは出さない
  // （神の一撃は専用カットイン＋バナー、撃破は L4＋崩壊＋「撃破！」が担当する）
  if (ctx.plan.burst) return { callout: null, reason: 'big-moment', losers: 0 }
  if (ctx.plan.outcome !== null) return { callout: null, reason: 'outcome', losers: 0 }

  const all = collectCallouts(events, ctx)
  if (all.length === 0) return { callout: null, reason: 'none', losers: 0 }

  const fresh = all.filter((c) => c.dedupeKey === null || !shownThisRound.has(c.dedupeKey))
  if (fresh.length === 0) return { callout: null, reason: 'duplicate', losers: all.length }

  // priority が小さいほど強い。同点なら先に検出した方（防御 → Identity → 条件）
  let best = fresh[0]
  for (const c of fresh) if (c.priority < best.priority) best = c
  return { callout: best, reason: null, losers: all.length - 1 }
}

/**
 * ログを走査して、そのバッチで参照すべき「直近の予告」を更新する。
 * 敵ターンのバッチは `ENEMY_ACTED`（古い予告で実行）→ `ROUND_STARTED` →
 * `ENEMY_INTENT_SET`（次の予告）の順なので、**バッチを処理し終えてから**更新する。
 */
export function latestIntentAmount(events: readonly GameEvent[], prev: number | null): number | null {
  let next = prev
  for (const e of events) if (e.t === 'ENEMY_INTENT_SET') next = e.amount
  return next
}

/** そのバッチでラウンドが変わったか（dedupe のスコープをリセットする） */
export function latestRound(events: readonly GameEvent[], prev: number): number {
  let next = prev
  for (const e of events) if (e.t === 'ROUND_STARTED') next = e.round
  return next
}
