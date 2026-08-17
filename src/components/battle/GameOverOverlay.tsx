import type { GameStatus, GodId, OtomoState, ScoreState } from '../../core/types'
import { getGodDef } from '../../core/data/gods'
import { getOtomoDef } from '../../core/data/otomo'

const STATUS_LABEL: Record<Exclude<GameStatus, 'playing'>, string> = {
  won: '勝利',
  lost: '敗北',
  finished: '未撃破（7ラウンド終了）',
}

/**
 * 決定64（Task A5）：スコア内訳の各項目が「次はどうすれば伸ばせるか」を
 * 一目で分かるようにする短い補足。長文の説明ではなく一行に収まる分だけに絞る
 * （375pxでリザルトカードが縦長になりすぎないようにするため）。
 * 文言は`rules.ts`（perDamage/comboPerExtraCard/unusedApPenalty/defeatBonus/
 * perRemainingRound）と`gods.ts`の各`resonanceEffects`の`score`効果・
 * `divination.ts`の天啓の託宣を実際に確認した上で、仕組みと矛盾しないよう
 * 決定した：
 * - 神力効率は「使い切るとUP」ではなく常に0以下の減点方式（unusedApPenalty）
 *   なので「余らせると減点」と表現する
 * - 撃破ボーナスはapplyVictory経由で勝利時のみ加算されるため「早く倒すほど」
 * - 神託・共鳴はA2で判明した通り、天啓の託宣（+8）と神/OTOMOの共鳴発動時の
 *   score効果（150〜200）の両方が実際の発生源
 */
const SCORE_HINT: Record<keyof Omit<ScoreState, 'total'>, string> = {
  damage: '与えたダメージ',
  combo: '1ラウンドに2枚以上でUP',
  apEfficiency: '神力を余らせると減点',
  roundBonus: '早く倒すほどUP',
  oracleBonus: '神託・共鳴の発動でUP',
}

type GameOverOverlayProps = {
  status: Exclude<GameStatus, 'playing'>
  score: ScoreState
  /**
   * 決定96（C-3）：勝利時のみ神＋OTOMOポートレートを表示するために必要。
   * BattleScreen.tsxが既にPlayerPanel/GodOtomoPanelへ渡しているのと同じ値を
   * そのまま渡すだけで、GameState・core/engineの変更は一切不要。
   */
  godId: GodId
  otomo: OtomoState
  /** この1戦でその神のスコア自己ベストを更新したか（決定48フォローアップ） */
  newBest: boolean
  /**
   * 決定74（Task C3）：この1戦でOTOMOの親密度Lvが上がった場合のみ渡される
   * （上がっていなければnull）。勝敗を問わず出る（OTOMOは敗北戦でも育つ、
   * 決定70の設計どおり）。
   */
  otomoLevelUp: { otomoName: string; prevLevel: number; nextLevel: number } | null
  /** 同じ神・同じデッキでもう一度戦う */
  onRematch: () => void
  /** 神選択からやり直す（決定24：Phase 5） */
  onReselect: () => void
}

export function GameOverOverlay({
  status,
  score,
  godId,
  otomo,
  newBest,
  otomoLevelUp,
  onRematch,
  onReselect,
}: GameOverOverlayProps) {
  const god = getGodDef(godId)
  const otomoDef = getOtomoDef(otomo.defId)

  return (
    <div className="game-over-overlay">
      {/* 決定64：勝敗・未撃破で装飾トーンを分ける（status別クラス）。文字色だけでなく
          カード枠・ボタン装飾も変えることで、文字を読まなくても感覚的に区別できるようにする */}
      <div className={`game-over-card game-over-card-${status}`}>
        <div className={`game-over-status game-over-status-${status}`}>{STATUS_LABEL[status]}</div>
        {newBest && <div className="game-over-new-best">✨ 自己ベスト更新！</div>}
        {otomoLevelUp && (
          <div className="game-over-otomo-levelup">
            💠 絆Lv UP！ {otomoLevelUp.otomoName} Lv.{otomoLevelUp.prevLevel} → Lv.{otomoLevelUp.nextLevel}
          </div>
        )}
        {/*
         * 決定96（C-3）：勝利時のみ、神＋OTOMOポートレートを表示する（決定64の
         * 「敗北時は祝祭感を出さない」方針を守るため勝利限定）。OTOMOはotomo.formを
         * そのままart[form]に渡すだけで、直前の共鳴発動で進化していた場合も
         * 進化後の姿が表示される（reducerが進化を先に確定させてから同一トランザクション内で
         * 撃破・勝利判定を処理するため、Reactに進化前の中間状態がレンダリングされる
         * 経路が無い）。名前ラベルは付けない（神は選択済みで自明、OTOMO名は絆Lv UP
         * バッジと重複するため）。art.backは白背景未処理のため使用しない。
         */}
        {status === 'won' && (
          <div className="game-over-portraits">
            <img className="game-over-portrait-god" src={god.art.front} alt={god.nameJa} />
            <img className="game-over-portrait-otomo" src={otomoDef.art[otomo.form]} alt={otomoDef.nameJa} />
          </div>
        )}
        <div className="score-total">スコア {score.total}</div>
        <dl className="score-breakdown">
          <dt>
            ダメージ
            <span className="score-breakdown-hint">{SCORE_HINT.damage}</span>
          </dt>
          <dd>{score.damage}</dd>
          <dt>
            コンボ
            <span className="score-breakdown-hint">{SCORE_HINT.combo}</span>
          </dt>
          <dd>{score.combo}</dd>
          <dt>
            神力効率
            <span className="score-breakdown-hint">{SCORE_HINT.apEfficiency}</span>
          </dt>
          <dd>{score.apEfficiency}</dd>
          <dt>
            撃破ボーナス
            <span className="score-breakdown-hint">{SCORE_HINT.roundBonus}</span>
          </dt>
          <dd>{score.roundBonus}</dd>
          <dt>
            神託・共鳴
            <span className="score-breakdown-hint">{SCORE_HINT.oracleBonus}</span>
          </dt>
          <dd>{score.oracleBonus}</dd>
        </dl>
        <div className="game-over-actions">
          <button type="button" onClick={onRematch}>
            同じ構成でもう一度
          </button>
          <button type="button" onClick={onReselect}>
            神・デッキを選び直す
          </button>
        </div>
      </div>
    </div>
  )
}
