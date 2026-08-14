import { useEffect, useState } from 'react'
import { RULES } from '../../core/data/rules'
import { getCardDef } from '../../core/data/cards'
import { getGodDef } from '../../core/data/gods'
import type { UseGameEngine } from '../../hooks/useGameEngine'
import { addRewardBonus } from '../../hooks/rewardStorage'
import { useBattleFx } from './useBattleFx'
import { useBattleSound } from './useBattleSound'
import { useFloatingNumbers } from './useFloatingNumbers'
import { CAST_FX, TYPE_STYLE } from './cardStyle'
import { CardIcon } from './cardIcon'
import { CardView } from './CardView'
import { EnemyPanel } from './EnemyPanel'
import { PlayerPanel } from './PlayerPanel'
import { GodOtomoPanel } from './GodOtomoPanel'
import { GameOverOverlay } from './GameOverOverlay'
import { RewardOverlay } from './RewardOverlay'
import { DivinationPanel } from './DivinationPanel'
import { formatEvent } from './formatEvent'
import './battle.css'

type BattleScreenProps = {
  /** GameFlowが保持するuseGameEngineの戻り値。state は必ずゲーム進行中/決着済み */
  engine: UseGameEngine
  /** Appのヘッダーで管理するミュート状態（決定：アイコンをApp全体で共通化） */
  muted: boolean
  /** 決着後、同じ神・同じデッキでもう一度戦う */
  onRematch: () => void
  /** 決着後、神選択からやり直す */
  onReselect: () => void
}

/**
 * 戦闘画面。ゲーム開始前の画面遷移（神選択・デッキ構築）はGameFlowが担当するため、
 * ここでは`engine.state`が常に存在する前提で戦闘中の表示だけに専念する。
 */
export function BattleScreen({ engine, muted, onRematch, onReselect }: BattleScreenProps) {
  const { state, log, error, isEnemyTurn, pendingCardUid, newBest, playCard, endRound, divine } = engine
  const fx = useBattleFx(log)
  const { enemyNumbers, playerNumbers } = useFloatingNumbers(log)
  useBattleSound(muted ? [] : log)

  // 決定43：報酬カードは勝利1回につき1回だけ提示する。新しいバトル（seedが変わる）
  // のたびにリセットする（再開・「もう一度」でも新しいseedが発行されるため）。
  const [rewardDone, setRewardDone] = useState(false)
  useEffect(() => {
    setRewardDone(false)
  }, [state?.seed])

  if (!state) {
    return null
  }

  const isPlayerTurn =
    state.phase === 'playerTurn' && state.status === 'playing' && !isEnemyTurn && !pendingCardUid

  const pendingCard = pendingCardUid ? state.hand.find((c) => c.uid === pendingCardUid) : undefined
  const pendingCardDef = pendingCard ? getCardDef(pendingCard.defId) : null
  const castStyle = pendingCardDef ? TYPE_STYLE[pendingCardDef.type] : null

  return (
    <div className="battle">
      <div className="battle-topbar">
        <span>ラウンド {state.round} / {RULES.totalRounds}</span>
        <span>神力 {state.ap.current} / {state.ap.max}</span>
        <span>スコア {state.score.total}</span>
      </div>

      {fx.apPenaltyKey > 0 && (
        <div key={`ap-penalty-${fx.apPenaltyKey}`} className="ap-penalty-toast">
          神力を使い切れませんでした（スコア{fx.apPenaltyAmount}）
        </div>
      )}

      <div className="battle-main">
        <div className="battle-arena-glow" aria-hidden="true" />
        <EnemyPanel
          enemy={state.enemy}
          round={state.round}
          hitKey={fx.enemyHitKey}
          attackKey={fx.enemyAttackKey}
          floatingNumbers={enemyNumbers}
        />
        <div className="ally-row">
          <PlayerPanel
            godId={state.godId}
            player={state.player}
            hitKey={fx.selfHitKey}
            healKey={fx.healKey}
            attackKey={fx.godAttackKey}
            floatingNumbers={playerNumbers}
          />
          <GodOtomoPanel
            otomo={state.otomo}
            resonance={state.resonance}
            evolveKey={fx.evolveKey}
          />
        </div>
        {castStyle && pendingCardDef && (
          <div
            className={`cast-flash cast-flash-${pendingCardDef.type}`}
            style={{ color: castStyle.color, ['--cast-glow' as string]: castStyle.glow }}
          >
            <img className="cast-flash-art" src={CAST_FX[pendingCardDef.type]} alt="" />
            <span className="cast-flash-icon">
              <CardIcon def={pendingCardDef} />
            </span>
          </div>
        )}
      </div>

      {fx.burstKey > 0 && (
        <div key={`burst-${fx.burstKey}`} className="burst-banner">
          <span>✨ {getGodDef(state.godId).nameJa}の一撃！</span>
        </div>
      )}

      {isEnemyTurn && (
        <div className="enemy-turn-banner">
          <span>⚔ 敵のターン</span>
        </div>
      )}

      <div className="hand">
        {state.hand.map((instance) => (
          <CardView
            key={instance.uid}
            instance={instance}
            affordable={getCardDef(instance.defId).cost + (instance.costModifier ?? 0) <= state.ap.current}
            playable={isPlayerTurn}
            playing={pendingCardUid === instance.uid}
            onPlay={() => playCard(instance.uid)}
          />
        ))}
      </div>

      <div className="battle-log">
        {log.slice(-6).map((event, i) => (
          <div key={i}>{formatEvent(event)}</div>
        ))}
      </div>

      {error && <div className="battle-error">{error}</div>}

      <DivinationPanel
        remaining={state.divination.remaining}
        usedThisRound={state.divination.usedThisRound}
        playable={isPlayerTurn}
        onChoose={divine}
      />

      <button type="button" className="end-round-button" disabled={!isPlayerTurn} onClick={endRound}>
        ラウンドを終える
      </button>

      {state.status === 'won' && !rewardDone && (
        <RewardOverlay
          godId={state.godId}
          seed={state.seed}
          onPick={(cardId) => {
            addRewardBonus(state.godId, cardId)
            setRewardDone(true)
          }}
          onSkip={() => setRewardDone(true)}
        />
      )}

      {state.status !== 'playing' && (state.status !== 'won' || rewardDone) && (
        <GameOverOverlay
          status={state.status}
          score={state.score}
          newBest={newBest}
          onRematch={onRematch}
          onReselect={onReselect}
        />
      )}
    </div>
  )
}
