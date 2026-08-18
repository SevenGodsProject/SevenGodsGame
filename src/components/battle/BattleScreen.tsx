import { useEffect, useRef, useState } from 'react'
import { RULES } from '../../core/data/rules'
import { getCardDef } from '../../core/data/cards'
import { getGodDef } from '../../core/data/gods'
import { getOtomoDef } from '../../core/data/otomo'
import type { UseGameEngine } from '../../hooks/useGameEngine'
import { addRewardBonus } from '../../hooks/rewardStorage'
import { detectOtomoLevelUp } from '../setup/otomoGrowthDisplay'
import { useBattleFx } from './useBattleFx'
import { useBattleSound } from './useBattleSound'
import { useFloatingNumbers } from './useFloatingNumbers'
import { CAST_FX, getEnemyDamagePowerTier, TYPE_STYLE } from './cardStyle'
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
  /** 決着後、同じ神・同じデッキでもう一度戦う */
  onRematch: () => void
  /** 決着後、神選択からやり直す */
  onReselect: () => void
}

/**
 * 戦闘画面。ゲーム開始前の画面遷移（神選択・デッキ構築）はGameFlowが担当するため、
 * ここでは`engine.state`が常に存在する前提で戦闘中の表示だけに専念する。
 * 決定80（Phase 1）：ミュート状態はsound.ts側のフラグのみで完結するため、
 * ここではpropとして受け取らない（以前は`muted`を受け取りログを[]に見せる
 * 二重防御をしていたが、それがミュート解除時のSE一斉再生バグの原因だった）。
 */
export function BattleScreen({ engine, onRematch, onReselect }: BattleScreenProps) {
  const { state, log, error, isEnemyTurn, pendingCardUid, newBest, otomoBondChange, playCard, endRound, divine } =
    engine
  const fx = useBattleFx(log)
  const { enemyNumbers, playerNumbers } = useFloatingNumbers(log)

  // CEO指示：共鳴バースト（.burst-banner）とOTOMO進化（.evolve-banner）が
  // 同時に重なって表示される不具合の修正。setTimeoutでCSSのanimation-durationと
  // 別々にJS側の遅延時間を持つと将来ズレるため、.burst-bannerの実際の
  // onAnimationEnd（CSS側の実測終了タイミングそのもの）を使って進化バナーの
  // 表示キーを起動する。マジックナンバーの重複が発生しない。
  // shownEvolveKeyRefは「直近どのevolveKeyまでバナーを見せ終えたか」の監視位置で、
  // fx.evolveKeyがそれより進んでいる時だけ（＝今回のバーストにOTOMO進化が
  // 伴っていた時だけ）evolveBannerKeyを進めてバナーを表示する。
  // 童子まで成長済みでOTOMO_EVOLVEDが発生しない場合はfx.evolveKeyが動かないため、
  // このハンドラが呼ばれても何もせず、共鳴バーストのバナーのみが表示される。
  const [evolveBannerKey, setEvolveBannerKey] = useState(0)
  const shownEvolveKeyRef = useRef(0)
  const handleBurstAnimationEnd = () => {
    if (fx.evolveKey > shownEvolveKeyRef.current) {
      shownEvolveKeyRef.current = fx.evolveKey
      setEvolveBannerKey((k) => k + 1)
    }
  }
  // 決定80（Phase 1）：sound.ts側のmutedフラグが既にsfx.xxx()を全て止めているため、
  // ここでの「ミュート中はlogを[]に見せる」二重防御は不要だった。しかも副作用として、
  // ミュート解除時にuseBattleSound内部のseenCountが0にリセットされ、logが元の長さに
  // 戻った瞬間にその対局の全イベントのSEが一斉に再生されるバグを引き起こしていた。
  useBattleSound(log)

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
  // 第二次完成フェーズ候補C：通常攻撃と強攻撃・特大攻撃の演出強度を分ける。
  // typeやgodIdではなく「敵へ与えるdamage量」（cardIcon.tsxのgetEnemyDamagePowerTier、
  // 既存のgetPrimaryGlyphと同じ閾値10/15を再利用）だけで判定するため、神託
  // （type:'oracle', damage 25）のようなattack以外の高ダメージカードも正しく
  // 最上位tierになる。
  const castPowerTier = pendingCardDef ? getEnemyDamagePowerTier(pendingCardDef) : null

  // 決定74（Task C3）：対局前後の育成記録からLvが実際に上がった場合だけバッジを出す。
  const levelUp = otomoBondChange ? detectOtomoLevelUp(otomoBondChange.prevRecord, otomoBondChange.nextRecord) : null
  const otomoLevelUp = levelUp
    ? { otomoName: getOtomoDef(state.otomo.defId).nameJa, prevLevel: levelUp.prevLevel, nextLevel: levelUp.nextLevel }
    : null

  // 決定93（C-8）：AP表示のゲージ化。GodOtomoPanelの共鳴ゲージ比率計算と同じガード式。
  const apRatio = state.ap.max > 0 ? Math.min(1, state.ap.current / state.ap.max) : 0

  return (
    <div className="battle">
      <div className="battle-topbar">
        <span>ラウンド {state.round} / {RULES.totalRounds}</span>
        <span className="battle-topbar-ap">
          <span>神力 {state.ap.current} / {state.ap.max}</span>
          <span className="ap-gauge">
            <span className="ap-gauge-fill" style={{ width: `${apRatio * 100}%` }} />
          </span>
        </span>
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
            godId={state.godId}
            otomo={state.otomo}
            resonance={state.resonance}
            evolveKey={fx.evolveKey}
          />
        </div>
        {castStyle && pendingCardDef && (
          <div
            className={`cast-flash cast-flash-${pendingCardDef.type}${
              castPowerTier && castPowerTier !== 'normal' ? ` cast-flash-power-${castPowerTier}` : ''
            }`}
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
        <div key={`burst-${fx.burstKey}`} className="burst-banner" onAnimationEnd={handleBurstAnimationEnd}>
          <span>✨ {getGodDef(state.godId).nameJa}の一撃！</span>
        </div>
      )}

      {evolveBannerKey > 0 && fx.evolveForm && (
        <div key={`evolve-${evolveBannerKey}`} className="evolve-banner">
          <span>🌱 {formatEvent({ t: 'OTOMO_EVOLVED', form: fx.evolveForm })}</span>
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
          godId={state.godId}
          otomo={state.otomo}
          newBest={newBest}
          otomoLevelUp={otomoLevelUp}
          onRematch={onRematch}
          onReselect={onReselect}
        />
      )}
    </div>
  )
}
