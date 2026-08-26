import type { GameEvent, GameStatus, OtomoForm } from '../../core/types'
import { getCardDef } from '../../core/data/cards'
import { DIVINATION_CHOICES } from '../../core/data/divination'
import { STAT_LABEL } from '../setup/godStyle'
import { formatScaled } from '../displayScale'

/**
 * A3監査：`GameEvent`の`BUFF_APPLIED.stat`は（サーバー越しの将来対応を見据え）
 * 素の`string`型のため、`STAT_LABEL`（'atk'|'def'限定）にそのまま渡せない。
 * 未知の値が来た場合は元の文字列にフォールバックする安全な変換のみここに置く
 * （`core/types`側は変更しない）。
 */
function statLabel(stat: string): string {
  return stat in STAT_LABEL ? STAT_LABEL[stat as keyof typeof STAT_LABEL] : stat
}

/**
 * 決定80（Phase 1）：`SCORE_GAINED.reason`も`BUFF_APPLIED.stat`と同じ理由
 * （素の`string`型）で内部キーがそのまま出ていた（例：「スコア+200（oracle）」）。
 * `statLabel`と同じ安全なフォールバック変換のみここに置く（`core/types`は変更しない）。
 */
const SCORE_REASON_LABEL: Record<string, string> = {
  damage: 'ダメージ',
  combo: 'コンボ',
  apEfficiency: '神力効率',
  oracle: '神託',
}

function scoreReasonLabel(reason: string): string {
  return reason in SCORE_REASON_LABEL ? SCORE_REASON_LABEL[reason] : reason
}

const STATUS_LABEL: Record<GameStatus, string> = {
  playing: '進行中',
  won: '勝利',
  lost: '敗北',
  finished: '未撃破',
}

const OTOMO_FORM_LABEL: Record<OtomoForm, string> = {
  spirit: '精霊態',
  incarnate: '受肉態',
  doji: '童子',
}

/** GameEvent を、イベントログに出すための短い日本語に変換します */
export function formatEvent(event: GameEvent): string {
  switch (event.t) {
    case 'GAME_STARTED':
      return 'ゲーム開始'
    case 'ROUND_STARTED':
      return `ラウンド${event.round}開始（神力+${event.apGranted}）`
    case 'CARD_DRAWN':
      return `「${getCardDef(event.defId).name}」を引いた`
    case 'HAND_OVERFLOW':
      return `手札上限のため${event.discarded.length}枚を捨てた`
    case 'DECK_RESHUFFLED':
      return `山札切れ：捨札をシャッフルして山札に戻した（${event.count}枚）`
    case 'CARD_PLAYED':
      return `「${getCardDef(event.defId).name}」を使用（神力${event.cost}）`
    // D2b：damage/block/heal/バフ量/スコアは表示×10。AP・共鳴・ラウンドは倍率対象外
    case 'DAMAGE_DEALT':
      return event.target === 'enemy'
        ? `敵に${formatScaled(event.amount)}ダメージ${event.blocked > 0 ? `（${formatScaled(event.blocked)}軽減）` : ''}`
        : `${formatScaled(event.amount)}ダメージを受けた${event.blocked > 0 ? `（${formatScaled(event.blocked)}軽減）` : ''}`
    case 'BLOCK_GAINED':
      return `ブロック+${formatScaled(event.amount)}`
    case 'HEALED':
      return `HP+${formatScaled(event.amount)}`
    case 'RESONANCE_GAINED':
      return `共鳴+${event.amount}（${event.total}）`
    case 'RESONANCE_BURST':
      return '共鳴満タン！神が介入した'
    case 'OTOMO_EVOLVED':
      return `OTOMOが${OTOMO_FORM_LABEL[event.form]}に成長した！`
    case 'BUFF_APPLIED':
      return `${event.target === 'enemy' ? '敵' : '自分'}の${statLabel(event.stat)}が${event.amount > 0 ? '+' : ''}${formatScaled(event.amount)}（${event.rounds}ラウンド）`
    case 'ENEMY_INTENT_SET':
      return event.kind === 'attack' ? `敵の次の行動：攻撃${formatScaled(event.amount)}` : '敵の次の行動：溜め'
    case 'ENEMY_ACTED':
      return event.kind === 'attack' ? `敵が攻撃${formatScaled(event.amount)}` : '敵が溜めた'
    case 'SCORE_GAINED':
      return `スコア${event.amount >= 0 ? '+' : ''}${formatScaled(event.amount)}（${scoreReasonLabel(event.reason)}）`
    case 'ROUND_ENDED':
      return `ラウンド${event.round}終了${event.unusedAp > 0 ? `（神力${event.unusedAp}余り）` : ''}`
    case 'GAME_ENDED':
      return `決着：${STATUS_LABEL[event.status]}（スコア${formatScaled(event.totalScore)}）`
    case 'DIVINATION_USED':
      return `「${DIVINATION_CHOICES[event.choiceIndex].name}」を受けた（残り${event.remaining}回）`
  }
}
