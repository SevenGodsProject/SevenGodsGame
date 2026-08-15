import type { Effect } from '../../core/types'
import { STAT_LABEL } from './godStyle'

/**
 * Phase 3「OTOMO形態効果・共鳴効果の文章表示」（CEO承認：案A、8/31版）。
 *
 * `Effect[]`から短い日本語ラベル（「ブロック+10」「敵に25ダメージ」等）を
 * 組み立てる純粋関数。`describeSpecial()`（godStyle.ts）は`buff`/`debuff`/
 * `draw`/`gainAp`の4種のみを対象にしていた（`damage`/`block`/`heal`は
 * 神選択画面の数値バーが担当、`score`は対象外で未表示だった）が、こちらは
 * `damage`/`block`/`heal`/`score`を含む全種を対象にする。DeckBuilderの
 * 育成方針セレクターには数値バーが無く、単独で意味が通る文章が必要なため。
 *
 * `otomo.ts`/`gods.ts`の既存`Effect[]`データを読むだけの純粋関数で、
 * core/engine・GameState・カード効果・rules.tsには一切触れない
 * （不変ルール1〜4遵守）。
 */

/**
 * 効果1件を短い日本語ラベルに変換する。
 * 将来`Effect`の種類が増えて対応が漏れても、クラッシュせずその効果だけを
 * 黙って読み飛ばす（`null`を返し、呼び出し側で除外する）安全設計。
 */
function describeOneEffect(effect: Effect): string | null {
  switch (effect.kind) {
    case 'damage':
      return effect.target === 'enemy'
        ? `敵に${effect.amount}ダメージ`
        : `自分に${effect.amount}ダメージ`
    case 'block':
      return `ブロック+${effect.amount}`
    case 'heal':
      return `HP回復+${effect.amount}`
    case 'score':
      return `スコア+${effect.amount}`
    case 'draw':
      return `カード+${effect.amount}枚`
    case 'gainAp':
      return `神力+${effect.amount}`
    case 'buff': {
      const target = effect.target === 'enemy' ? '敵' : '自分'
      return `${target}の${STAT_LABEL[effect.stat]}+${effect.amount}（${effect.rounds}R）`
    }
    case 'debuff': {
      const target = effect.target === 'enemy' ? '敵' : '自分'
      return `${target}の${STAT_LABEL[effect.stat]}-${effect.amount}（${effect.rounds}R）`
    }
    case 'resonance':
      // otomo.ts/gods.tsの実データでは未使用（共鳴発動中に共鳴を再度上昇させる
      // 無限発動を避けるため）。Effect型には存在するため、来ても安全に扱う。
      return `共鳴+${effect.amount}`
    default:
      // 将来Effectの種類が追加され、ここへの対応が漏れた場合の保険。
      return null
  }
}

/**
 * `Effect[]`を「・」区切りの1行に変換する。
 * 空配列（OTOMOのspirit形態など、まだ何も貢献しない状態）や、
 * 全件が未知の効果だった場合は`null`を返す（呼び出し側で「変化なし」等に
 * フォールバックする）。
 */
export function describeEffectList(effects: Effect[]): string | null {
  const parts = effects
    .map(describeOneEffect)
    .filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join('・') : null
}
