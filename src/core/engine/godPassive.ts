import type { CardDef, Effect, GameState, GodId, GodPassive, GodPassiveId } from '../types'
import { RULES } from '../data/rules'
import { getGodDef } from '../data/gods'

/**
 * Phase 3「神格」FINAL SPEC v0.1：神の得意技（Passive）。
 *
 * ★不変ルール3：engineに神IDのif分岐を書かず、`GodDef.passive.id`から
 * このテーブルを引く。神を増やす・得意技を差し替えるときも、変更は
 * `gods.ts`のデータと、このテーブルへの1エントリ追加だけで済む。
 * ★不変ルール4：数値はすべて`RULES.godPassive`から読む。
 *
 * 効果は既存の`Effect`で表現し、`applyEffects`経由で適用する
 * （＝敵のブロック・overkill除外・スコア加算・atkバフの上乗せは既存処理に従う）。
 */

export type GodPassiveHooks = {
  /**
   * カードを1枚使い終えた直後（本体効果 → bonus の後）。
   * @param before カードを使う前の盤面（HP条件はこちらで判定する）
   * @param after  本体効果・bonus 適用後の盤面
   * @param cardDef 使ったカードの設計図
   */
  afterPlay?: (before: GameState, after: GameState, cardDef: CardDef) => Effect[]
  /** 敵ターンの被弾処理が終わった直後（ラウンド終了処理の前） */
  afterEnemyTurn?: (state: GameState) => Effect[]
}

/** カード定義そのものの「敵への素ダメージ合計」（atkバフ・BURST・bonus分は含めない） */
function baseEnemyDamage(cardDef: CardDef): number {
  return cardDef.effects.reduce(
    (sum, e) => (e.kind === 'damage' && e.target === 'enemy' ? sum + e.amount : sum),
    0,
  )
}

/**
 * 「HP条件を満たすあいだ、攻撃カードの素ダメージを割合で上乗せする」共通形。
 * 笑蓮（高HP側）と福永（低HP側）は同じ構造の鏡像で、条件の向きだけが違う。
 */
function attackBoost(
  hpOk: (state: GameState) => boolean,
  bonusRatio: number,
): NonNullable<GodPassiveHooks['afterPlay']> {
  return (before, _after, cardDef) => {
    if (!hpOk(before)) return []
    const amount = Math.floor(baseEnemyDamage(cardDef) * bonusRatio)
    if (amount <= 0) return []
    return [{ kind: 'damage', target: 'enemy', amount }]
  }
}

export const GOD_PASSIVE_HOOKS: Record<GodPassiveId, GodPassiveHooks> = {
  /** 蒼毘「反撃の構え」：受け切って残ったブロックを、そのまま敵へのダメージに変える */
  sobi_counter: {
    afterEnemyTurn: (state) => {
      const { counterRatio, minBlock } = RULES.godPassive.sobi
      if (state.player.block < minBlock) return []
      const amount = Math.floor(state.player.block * counterRatio)
      if (amount <= 0) return []
      return [{ kind: 'damage', target: 'enemy', amount }]
    },
  },

  /** 笑蓮「無傷の慈愛」：HPが8割以上のあいだ、攻撃カードのダメージ+50% */
  shouren_pristine: {
    afterPlay: attackBoost(
      (s) => s.player.hp >= Math.ceil(s.player.maxHp * RULES.godPassive.shouren.hpRatio),
      RULES.godPassive.shouren.bonusRatio,
    ),
  },

  /** 福永「大勝負」：HPが半分以下のあいだ、攻撃カードのダメージ+50% */
  fukuei_gamble: {
    afterPlay: attackBoost(
      (s) => s.player.hp <= Math.floor(s.player.maxHp * RULES.godPassive.fukuei.hpRatio),
      RULES.godPassive.fukuei.bonusRatio,
    ),
  },
}

export type ResolvedGodPassive = GodPassiveHooks & { def: GodPassive }

/**
 * その神の得意技（無ければnull）。
 * kill switch（`RULES.godIdentity.passivesEnabled`）がfalseなら常にnullを返し、
 * engineの挙動はPhase 3導入前と完全に一致する。
 */
export function resolveGodPassive(godId: GodId): ResolvedGodPassive | null {
  if (!RULES.godIdentity.passivesEnabled) return null
  const def = getGodDef(godId).passive
  if (!def) return null
  return { def, ...GOD_PASSIVE_HOOKS[def.id] }
}

/** イベント表示用：得意技が返した効果の名目値（バフ適用前の合計） */
export function passiveNominalAmount(effects: Effect[]): number {
  return effects.reduce((sum, e) => sum + ('amount' in e ? e.amount : 0), 0)
}

/**
 * 表示専用：今この瞬間、得意技の条件を満たしているか（HUDバッジの発光判定）。
 *
 * UI側が閾値を手書きで複製しないよう、判定は必ずこの関数を通す
 * （＝`RULES.godPassive`が唯一の数値の出どころであり続ける）。
 * - 蒼毘：このまま敵ターンを終えれば反撃が出る状態（ブロックが残っている）
 * - 笑蓮／福永：今カードを使えばダメージが増える状態
 */
export function isGodPassiveArmed(state: GameState): boolean {
  const passive = resolveGodPassive(state.godId)
  if (!passive) return false
  switch (passive.def.id) {
    case 'sobi_counter':
      return state.player.block >= RULES.godPassive.sobi.minBlock
    case 'shouren_pristine':
      return (
        state.player.hp >=
        Math.ceil(state.player.maxHp * RULES.godPassive.shouren.hpRatio)
      )
    case 'fukuei_gamble':
      return (
        state.player.hp <=
        Math.floor(state.player.maxHp * RULES.godPassive.fukuei.hpRatio)
      )
  }
}
