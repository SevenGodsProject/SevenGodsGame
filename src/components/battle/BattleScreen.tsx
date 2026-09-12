import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { RULES } from '../../core/data/rules'
import { getFinalScore, getMastery } from '../../core/engine'
import { previewBonusTrigger } from '../../core/engine/cardBonus'
import { previewIntentGuard } from '../../core/engine/effects'
import { DIVINATION_CHOICES } from '../../core/data/divination'
import { isGodPassiveArmed } from '../../core/engine/godPassive'
import { formatScaled } from '../displayScale'
import { getCardDef } from '../../core/data/cards'
import { getEnemyDef } from '../../core/data/enemies'
import { getGodDef } from '../../core/data/gods'
import { getOtomoDef } from '../../core/data/otomo'
import { stakeLabel } from '../../core/data/stakes'
import type { UseGameEngine } from '../../hooks/useGameEngine'
import { addRewardBonus } from '../../hooks/rewardStorage'
import { detectOtomoLevelUp } from '../setup/otomoGrowthDisplay'
import { useBattleFx } from './useBattleFx'
import { dealsEnemyDamage, useMobileAutoFocus } from './useMobileAutoFocus'
import { useCombatPresentation } from './useCombatPresentation'
import { BURST_BANNER_MS, BURST_READY_LEAD_MS, VICTORY_BEAT_MS, VICTORY_BEAT_REDUCED_MS } from './enemyVfxTiming'
import { CUTIN_FALLBACK_MS } from './BattleResonanceCutin'
import { BossEntrance } from './BossEntrance'
import { deriveDefeatCause } from './defeatCause'
import { useDecisionCallout } from './useDecisionCallout'
import { BattleCallout } from './BattleCallout'
import { buildBattleRecap } from './battleRecap'
import { preloadSe, sfx } from './sound'
import { useBattleSound } from './useBattleSound'
import { useFloatingNumbers } from './useFloatingNumbers'
import { CAST_FX, getEnemyDamagePowerTier, TYPE_STYLE } from './cardStyle'
import { CardIcon } from './cardIcon'
import { CardView } from './CardView'
import { BattleMiniResult } from './BattleMiniResult'
import { BattleResonanceCutin } from './BattleResonanceCutin'
import { BattleEnemyCutin } from './BattleEnemyCutin'
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
  /** DAILY-01：神域挑戦時の「もう一度」ボタンの文言・無効化（残り回数）。通常モードでは省略 */
  rematchLabel?: string
  rematchDisabled?: boolean
  /** Phase 4.9：神域挑戦の決着画面から「今日のランキング」へ戻る。通常モードでは省略 */
  onOpenRanking?: () => void
}

/**
 * 戦闘画面。ゲーム開始前の画面遷移（神選択・デッキ構築）はGameFlowが担当するため、
 * ここでは`engine.state`が常に存在する前提で戦闘中の表示だけに専念する。
 * 決定80（Phase 1）：ミュート状態はsound.ts側のフラグのみで完結するため、
 * ここではpropとして受け取らない（以前は`muted`を受け取りログを[]に見せる
 * 二重防御をしていたが、それがミュート解除時のSE一斉再生バグの原因だった）。
 */
export function BattleScreen({
  engine,
  onRematch,
  onReselect,
  rematchLabel,
  rematchDisabled,
  onOpenRanking,
}: BattleScreenProps) {
  const {
    state,
    log,
    error,
    isEnemyTurn,
    pendingCardUid,
    newBest,
    prevBest,
    otomoBondChange,
    dailyResult,
    dailyRanked,
    stakeResult,
    battleStartKey,
    playCard,
    endRound,
    divine,
  } = engine
  // STEP2-B：BattleMiniResultのAP獲得検出用（gainAp効果はGameEventを出さないため、
  // useBattleFx側でap.currentの差分から検出する。stateがまだ無い初回描画では0扱い）
  // Phase 6-A（決定162）：着弾計画は敵の動き方（visualType）に依存する（突進の最前＝着弾）
  const enemyVisualType = state ? getEnemyDef(state.enemy.defId).visualType : undefined
  const fx = useBattleFx(log, state?.ap.current ?? 0, enemyVisualType)
  const { enemyNumbers, playerNumbers } = useFloatingNumbers(log, state?.godId, enemyVisualType)
  // Phase 6-A：表示HP・撃破／結果の順序・大きな一撃の揺れ（表示専用。engine の状態・タイミングは不変）
  const arenaRef = useRef<HTMLDivElement>(null)
  const presentation = useCombatPresentation(log, state, arenaRef)
  // Phase 6-C（決定166）：良い判断が成立した瞬間の短い評価（表示専用。1バッチ最大1件）
  const decision = useDecisionCallout(log, state)

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
  // Phase 6-A：タイマー（安全弁）からも呼ぶため、最新の evolveKey は ref で読む
  const evolveKeyRef = useRef(fx.evolveKey)
  useEffect(() => {
    evolveKeyRef.current = fx.evolveKey
  }, [fx.evolveKey])
  const handleBurstAnimationEnd = useCallback(() => {
    if (evolveKeyRef.current > shownEvolveKeyRef.current) {
      shownEvolveKeyRef.current = evolveKeyRef.current
      setEvolveBannerKey((k) => k + 1)
    }
  }, [])

  // STEP-R2で蒼毘のみのプロトタイプとして導入し、STEP-R3で全7神へ横展開した
  // 共鳴7/7カットイン。useBattleFx.ts自体は変更せず、既存のfx.burstKeyを
  // 信号源として使う（STEP-R1でB案採用）。burstKeyの増分をカットイン表示の
  // トリガーに変換し、カットインのonComplete（＝下のhandleBurstAnimationEndと
  // 対になるCSS実測終了ベースのハンドオフ）で初めてburst-bannerを表示する。
  // STEP-R2時点ではisSobiで分岐し他神は旧来の即時burst-bannerパスを残していたが、
  // STEP-R3で全神が同じカットイン経由のパスに統一されたため、その分岐は削除した
  // （どの神でもcutinBurstBannerKeyだけを見ればよい）。
  const [cutinVisible, setCutinVisible] = useState(false)
  const [cutinActive, setCutinActive] = useState(false)
  const shownCutinBurstKeyRef = useRef(0)
  const [cutinBurstBannerKey, setCutinBurstBannerKey] = useState(0)
  // STEP-R2（処理10）：7/7カットイン発生時のみBattleMiniResultを一時抑制するための
  // 監視位置。MiniResultData自体（fx.miniResult）は一切書き換えず、表示レイヤー側で
  // 「このminiResultKeyは抑制対象か」を判定するだけ（データを破壊しない方針）。
  // burst成立バッチは常にRESONANCE_GAINEDを伴うためhasMiniResultが真になり、
  // fx.miniResultKeyもfx.burstKeyと同じバッチ内で進む（useBattleFx.ts参照）。
  const suppressedMiniResultKeyRef = useRef<number | null>(null)
  const cutinLeadTimerRef = useRef<number | null>(null)
  useEffect(() => {
    if (fx.burstKey > shownCutinBurstKeyRef.current) {
      shownCutinBurstKeyRef.current = fx.burstKey
      suppressedMiniResultKeyRef.current = fx.miniResultKey
      // Phase 6-A：7/7 到達の発光（到達反応）を BURST_READY_LEAD_MS 見せてからカットイン。
      // その間も操作はブロックする（cutinActive）。依存値の変化でタイマーを取り消すと
      // カットインが出ないまま操作がブロックされ続けるため、取り消しはアンマウント時だけ
      setCutinActive(true)
      cutinLeadTimerRef.current = window.setTimeout(() => setCutinVisible(true), BURST_READY_LEAD_MS)
    }
  }, [fx.burstKey, fx.miniResultKey])
  useEffect(
    () => () => {
      if (cutinLeadTimerRef.current !== null) window.clearTimeout(cutinLeadTimerRef.current)
    },
    [],
  )
  const handleCutinComplete = () => {
    setCutinVisible(false)
    setCutinActive(false)
    setCutinBurstBannerKey((k) => k + 1)
  }
  // Phase 6-A：burst-banner の onAnimationEnd を取りこぼしても、OTOMO 成長バナーへ必ず進む
  useEffect(() => {
    if (cutinBurstBannerKey === 0) return undefined
    const t = window.setTimeout(handleBurstAnimationEnd, BURST_BANNER_MS + CUTIN_FALLBACK_MS)
    return () => window.clearTimeout(t)
  }, [cutinBurstBannerKey, handleBurstAnimationEnd])

  // ENEMY-VFX-01：敵必殺技カットイン（CEO発案）。共鳴カットインと同じ
  // 「keyの増分→表示→onComplete（CSS実測終了）でハンドオフ」パターンを複製する。
  // onComplete後にenemyImpactKeyを進め、着弾ビーム（enemy-impact-beam）を再生する。
  // 被弾シェイク・数字側はCSSのanimation-delay（hit-delay-cutin等）で同じ0.9sを
  // 待つため、JSタイマーは持たない（決定80のタイミング一元化の家訓に従う）。
  const [enemyCutinVisible, setEnemyCutinVisible] = useState(false)
  const [enemyCutinActive, setEnemyCutinActive] = useState(false)
  const shownEnemySpecialKeyRef = useRef(0)
  const [enemyImpactKey, setEnemyImpactKey] = useState(0)
  useEffect(() => {
    if (fx.enemySpecialKey > shownEnemySpecialKeyRef.current) {
      shownEnemySpecialKeyRef.current = fx.enemySpecialKey
      // カットイン中はMiniResultを抑制（共鳴カットインのSTEP-R2処理10と同じ手法）
      suppressedMiniResultKeyRef.current = fx.miniResultKey
      setEnemyCutinVisible(true)
      setEnemyCutinActive(true)
    }
  }, [fx.enemySpecialKey, fx.miniResultKey])
  const handleEnemyCutinComplete = () => {
    setEnemyCutinVisible(false)
    setEnemyCutinActive(false)
    setEnemyImpactKey((k) => k + 1)
  }

  // 決定80（Phase 1）：sound.ts側のmutedフラグが既にsfx.xxx()を全て止めているため、
  // ここでの「ミュート中はlogを[]に見せる」二重防御は不要だった。しかも副作用として、
  // ミュート解除時にuseBattleSound内部のseenCountが0にリセットされ、logが元の長さに
  // 戻った瞬間にその対局の全イベントのSEが一斉に再生されるバグを引き起こしていた。
  useBattleSound(log, enemyVisualType)

  // 決定125：Mobile Battle Auto Focus。375px級の縦積みでは手札と敵パネルが約1,000px離れ、
  // 攻撃VFX・被弾・ダメージ数字が画面外で再生されて見えないため、敵ダメージカード／
  // BURST／敵ターン／敵ダメージ託宣のときだけ敵パネルへスクロールし、演出後に元の位置へ
  // 戻す（表示専用。Desktopでは何もしない。engineは遅延させない）。
  // 旧方針「強制スクロールはしない」（下のresult-toastのコメント）はCEOが明示的に撤回した。
  const pendingForFocus = pendingCardUid ? state?.hand.find((c) => c.uid === pendingCardUid) : undefined
  const { focusForDivination } = useMobileAutoFocus({
    status: state?.status ?? 'playing',
    pendingCardUid,
    pendingCardDef: pendingForFocus ? getCardDef(pendingForFocus.defId) : null,
    burstKey: fx.burstKey,
    isEnemyTurn,
    enemyAttackKey: fx.enemyAttackKey,
    enemySpecialKey: fx.enemySpecialKey,
    enemySpecialKind: fx.enemySpecialKind,
    multiHitCount: fx.multiHitCount,
  })

  // 決定128（Game Feel）：Boss Entrance。新規開始（battleStartKey 増分）のときだけ約1.5秒表示し、
  // 「続きから」再開では出さない。SE のプリロードもここで行う（初回再生の遅延を無くす）。
  const [entranceKey, setEntranceKey] = useState(0)
  const seenStartKeyRef = useRef(0)
  useEffect(() => {
    if (battleStartKey > seenStartKeyRef.current) {
      seenStartKeyRef.current = battleStartKey
      preloadSe()
      setEntranceKey(battleStartKey)
      sfx.bossEntrance()
    }
  }, [battleStartKey])
  const handleEntranceDone = useCallback(() => setEntranceKey(0), [])

  // 決定128 → Phase 6-A（決定162）：撃破の順序。最後の一撃 → 表示HP 0 → 敵フラッシュ・崩壊 →
  // 「撃破」→ 報酬 → 結果（決定43の報酬→結果の順序は変えない）。時刻は useCombatPresentation が
  // 着弾計画から決め、setTimeout と安全弁で必ず進む。表示専用。
  const victoryPhase = presentation.victoryPhase
  const victoryBeat = victoryPhase === 'beat'
  const presentationDone = state?.status === 'won' ? victoryPhase === 'done' : presentation.resultReady

  // Phase 6-B（決定164）：戦闘中だけアプリ全体をビューポート高に固定し、ページの
  // 縦スクロールを 0 にする（他の画面＝ホーム・デッキ構築は従来どおりスクロールする）。
  // body のクラスで切り替え、アンマウント時に必ず戻す。
  useEffect(() => {
    document.body.classList.add('battle-viewport')
    return () => document.body.classList.remove('battle-viewport')
  }, [])

  // Phase 6-B：戦闘ログは既定で畳む（ドックの「ログ」ボタンで開閉。機能は残す）
  const [logOpen, setLogOpen] = useState(false)

  // 決定43：報酬カードは勝利1回につき1回だけ提示する。新しいバトル（seedが変わる）
  // のたびにリセットする（再開・「もう一度」でも新しいseedが発行されるため）。
  const [rewardDone, setRewardDone] = useState(false)
  // Phase 6-C（決定166）：認知順序を「勝利 → 振り返り → スコア／神技評価 → 報酬」にする。
  // 結果画面を先に出し、その「報酬カードを選ぶ」から報酬へ進む（報酬の中身・ルールは不変。
  // 勝利1回につき報酬の判断は必ず1回＝報酬が未確定の間は他のボタンを出さない）。
  const [rewardOpen, setRewardOpen] = useState(false)
  useEffect(() => {
    setRewardDone(false)
    setRewardOpen(false)
  }, [state?.seed])

  if (!state) {
    return null
  }

  // STEP-R2（処理11）：カットイン表示中（900ms）はカード操作をブロックする。
  // 新しいGameStateフラグは追加せず、既存のpendingCardUidと同じ「ローカルstateを
  // isPlayerTurnの算出に足す」だけの考え方を踏襲する。カットイン終了後は
  // cutinActiveがfalseに戻り、即座に既存の操作性へ復帰する。
  const isPlayerTurn =
    state.phase === 'playerTurn' &&
    state.status === 'playing' &&
    !isEnemyTurn &&
    !pendingCardUid &&
    !cutinActive &&
    !enemyCutinActive

  const pendingCard = pendingCardUid ? state.hand.find((c) => c.uid === pendingCardUid) : undefined
  const pendingCardDef = pendingCard ? getCardDef(pendingCard.defId) : null
  const castStyle = pendingCardDef ? TYPE_STYLE[pendingCardDef.type] : null
  // 第二次完成フェーズ候補C：通常攻撃と強攻撃・特大攻撃の演出強度を分ける。
  // typeやgodIdではなく「敵へ与えるdamage量」（cardIcon.tsxのgetEnemyDamagePowerTier、
  // 既存のgetPrimaryGlyphと同じ閾値10/15を再利用）だけで判定するため、神託
  // （type:'oracle', damage 25）のようなattack以外の高ダメージカードも正しく
  // 最上位tierになる。
  const castPowerTier = pendingCardDef ? getEnemyDamagePowerTier(pendingCardDef) : null
  // Phase 6-A：敵にダメージを与えるカードを使う瞬間だけ、神が一瞬構える（anticipation）
  const windUp = !!pendingCardDef && dealsEnemyDamage(pendingCardDef.effects)

  // 決定74（Task C3）：対局前後の育成記録からLvが実際に上がった場合だけバッジを出す。
  const levelUp = otomoBondChange ? detectOtomoLevelUp(otomoBondChange.prevRecord, otomoBondChange.nextRecord) : null
  const otomoLevelUp = levelUp
    ? { otomoName: getOtomoDef(state.otomo.defId).nameJa, prevLevel: levelUp.prevLevel, nextLevel: levelUp.nextLevel }
    : null

  // 決定93（C-8）：AP表示のゲージ化。GodOtomoPanelの共鳴ゲージ比率計算と同じガード式。
  const apRatio = state.ap.max > 0 ? Math.min(1, state.ap.current / state.ap.max) : 0

  // LANE-D（Stage system contract）：敵ごとの舞台をCSS変数としてルートへinline注入する。
  // - --stage-bg：stage.bgが指定されている敵のみ注入。未指定なら変数自体を置かず、
  //   battle.css末尾の`var(--stage-bg, url('/assets/backgrounds/arena.jpg'))`の
  //   フォールバックが効いて現行と完全に同一表示になる（現時点では全7敵が未指定）
  // - --stage-accent：常に注入する。Battle側ではまだ未使用（contractの口だけ用意。
  //   将来のstage演出＝カード縁・グロー等で使う想定）
  // 表示専用でロジック・数値には一切関与しない。
  const stage = getEnemyDef(state.enemy.defId).stage
  const stageVars = {
    ['--stage-accent' as string]: stage.accent,
    ...(stage.bg ? { ['--stage-bg' as string]: `url('${stage.bg}')` } : {}),
  }

  return (
    <div className="battle" style={stageVars}>
      <div className="battle-topbar">
        <span>
          ラウンド {state.round} / {RULES.totalRounds}
          {state.mode === 'daily' && (
            <>
              {' '}
              <span className="battle-daily-tag" title="神域挑戦：全員共通の敵・Seed・神域強化">
                DAILY ★★★★★ 神域強化
              </span>
            </>
          )}
          {(state.stake ?? 0) > 0 && (
            <>
              {' '}
              <span className="battle-stake-tag" title="神階：累積の制約つき（ふつう基準）">
                {stakeLabel(state.stake)}
              </span>
            </>
          )}
        </span>
        <span className="battle-topbar-ap">
          <span>神力 {state.ap.current} / {state.ap.max}</span>
          <span className="ap-gauge">
            <span className="ap-gauge-fill" style={{ width: `${apRatio * 100}%` }} />
          </span>
        </span>
        <span>スコア {formatScaled(getFinalScore(state.score, state.stake))}</span>
      </div>

      {/* BASE-D（決定109）：未使用APペナルティ廃止に伴い、ap-penalty-toastの表示を
          撤去した（useBattleFx側の集計は発火源イベントが消えたため自然に沈黙する）。 */}

      {/* スマホUX修正：手札位置までスクロールした状態でカードを使っても、
          攻撃/回復/防御の結果がその場で分かるようにするfixedトースト。
          導入時は「強制スクロールはしない（ユーザー明示指示）」方針だったが、決定125で
          CEOが撤回し、敵ダメージ/BURST/敵ターン時のみuseMobileAutoFocusが敵パネルへ
          スクロールする（このトーストは回復・防御の結果表示として引き続き有効）。ap-penalty-toastと同じ
          「keyを増分してCSSアニメーションを再生させる」パターンを複製している。 */}
      {fx.resultToastKey > 0 && (
        <div
          key={`result-toast-${fx.resultToastKey}`}
          className="result-toast"
          // Phase 6-A：数値の結果は着弾を見せてから（神の一撃では着弾まで隠す）
          style={{ animationDelay: `${fx.revealDelayMs}ms` }}
        >
          {fx.resultToastText}
        </div>
      )}

      <div className="battle-main" ref={arenaRef}>
        <div className="battle-arena-glow" aria-hidden="true" />
        <EnemyPanel
          enemy={state.enemy}
          round={state.round}
          attackKey={fx.enemyAttackKey}
          attackTier={fx.enemyAttackTier}
          multiHitCount={fx.multiHitCount}
          specialHit={fx.specialHit}
          floatingNumbers={enemyNumbers}
          hpShown={presentation.enemyHpShown}
          plan={presentation.plan}
          planKey={presentation.planKey}
          defeated={state.status === 'won' && (victoryPhase === 'collapse' || victoryPhase === 'beat' || victoryPhase === 'done')}
          reduced={presentation.reduced}
        />
        <div className="ally-row">
          <PlayerPanel
            godId={state.godId}
            player={state.player}
            hitKey={fx.selfHitKey}
            healKey={fx.healKey}
            attackKey={fx.godAttackKey}
            blockGainKey={fx.blockGainKey}
            enemyAttackTier={fx.enemyAttackTier}
            multiHitCount={fx.multiHitCount}
            specialHit={fx.specialHit}
            burstHit={fx.burstHit}
            floatingNumbers={playerNumbers}
            hpShown={presentation.playerHpShown}
            windUp={windUp}
            selfImpactMs={presentation.plan?.selfImpactMs ?? null}
          />
          {/* VFX-03：evolveRevealKey＝🌱成長バナーの表示回数。OTOMO立ち絵の新形態切替・
              成長グロー・リアクションをこの瞬間に揃える（進化自体はstateで確定済み） */}
          <GodOtomoPanel
            godId={state.godId}
            otomo={state.otomo}
            resonance={state.resonance}
            evolveRevealKey={evolveBannerKey}
            otomoGrowthPath={state.otomoGrowthPath}
            reactionKey={cutinBurstBannerKey}
            readyFlashKey={fx.burstKey}
            passiveArmed={isGodPassiveArmed(state)}
          />
        </div>
        {castStyle && pendingCardDef && (
          <div
            className={`cast-flash cast-flash-${pendingCardDef.type}${
              castPowerTier && castPowerTier !== 'normal' ? ` cast-flash-power-${castPowerTier}` : ''
            }`}
            style={{ color: castStyle.color, ['--cast-glow' as string]: castStyle.glow }}
          >
            <img className="cast-flash-art" src={CAST_FX[pendingCardDef.type]} alt="" width={320} height={480} />
            <span className="cast-flash-icon">
              <CardIcon def={pendingCardDef} />
            </span>
          </div>
        )}

        {/* STEP2-B：カード使用結果（誰が誰を攻撃したか＋数値変化）の一時表示。
            Phase 6-B：アリーナの上端に重ねる（旧：手札の直前で sticky）。
            STEP-R2（処理10）：共鳴7/7を含むバッチだけ、カットインと重ならないよう抑制する。 */}
        {state.status === 'playing' && fx.miniResultKey !== suppressedMiniResultKeyRef.current && (
          <BattleMiniResult
            godId={state.godId}
            enemy={state.enemy}
            player={state.player}
            resonanceMax={state.resonance.max}
            resultKey={fx.miniResultKey}
            result={fx.miniResult}
            delayMs={fx.revealDelayMs}
          />
        )}

        {error && <div className="battle-error">{error}</div>}

        {/* Phase 6-C（決定166）：良い判断の短い評価。アリーナ下段の overlay（pointer-events:none） */}
        <BattleCallout callout={decision.callout} playKey={decision.calloutKey} />

        {/* Phase 6-B：ログは既定で畳み、ドックの「ログ」ボタンで開く（機能は残す）。
            開いている間だけアリーナ下部に重ねる（レイアウトを押し広げない）。 */}
        {logOpen && (
          <div className="battle-log">
            {log.slice(-6).map((event, i) => (
              <div key={i}>{formatEvent(event)}</div>
            ))}
          </div>
        )}
      </div>

      {/* STEP-R3：全7神で共鳴7/7カットインを挟む（STEP-R2は蒼毘のみのプロトタイプ
          だった）。カットイン終了（onComplete）までburst-bannerの表示自体を
          遅らせる。burst-banner自身のJSX・onAnimationEnd＝evolve-bannerへの
          ハンドオフは完全に無変更（信号源がcutinBurstBannerKeyに一本化されただけ）。 */}
      {cutinVisible && (
        <BattleResonanceCutin key={`cutin-${fx.burstKey}`} godId={state.godId} onComplete={handleCutinComplete} />
      )}

      {/* ENEMY-VFX-01：敵必殺技カットイン→着弾ビーム。カットインは0.9sで自動終了し、
          onCompleteでビーム（0.45s）を発火する。被弾シェイク・ダメージ数字は
          CSS側のanimation-delayで同じタイミングに揃う（表示のみ、combat不変）。 */}
      {enemyCutinVisible && fx.enemySpecialName && (
        <BattleEnemyCutin
          key={`enemy-cutin-${fx.enemySpecialKey}`}
          enemyDefId={state.enemy.defId}
          specialName={fx.enemySpecialName}
          amount={fx.enemySpecialAmount}
          onComplete={handleEnemyCutinComplete}
        />
      )}
      {/* 着弾ビームは砲撃系（kind==='special'＝神滅甲タイプ）のみ。連撃系の必殺
          （双牙乱撃タイプ）はカットイン→3HITテンポ演出が本体のためビームを出さない */}
      {enemyImpactKey > 0 && fx.enemySpecialKind === 'special' && (
        <div key={`enemy-impact-${enemyImpactKey}`} className="enemy-impact-beam" aria-hidden="true" />
      )}

      {cutinBurstBannerKey > 0 && (
        <div key={`burst-${cutinBurstBannerKey}`} className="burst-banner" onAnimationEnd={handleBurstAnimationEnd}>
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

      {/* Phase 6-B（決定164）：操作は画面下の「ドック」に場所を確保して置く。
          position:fixed で重ねると Enemy HP・予告を覆ってしまうため使わない。
          行の順番は操作順（託宣 → カード → ラウンドを終える）。 */}
      <div className="battle-dock">
        <DivinationPanel
          remaining={state.divination.remaining}
          usedThisRound={state.divination.usedThisRound}
          playable={isPlayerTurn}
          // Phase 5-D：加護は予告で量が変わるので、押す前に実数を見せる（engineと同じ計算）。
          // 並び順に依存しないよう、全選択肢について求め、該当しないものは null になる
          guardPreviews={DIVINATION_CHOICES.map((c) => previewIntentGuard(state, c.effects))}
          onChoose={(i) => {
            // 決定125：敵ダメージを伴う託宣（天啓）だけ敵パネルへフォーカス。engine呼び出しは即時
            focusForDivination(i)
            divine(i)
          }}
        />

        <div className="battle-dock-row">
          <div className="hand">
            {state.hand.map((instance) => (
              <CardView
                key={instance.uid}
                instance={instance}
                affordable={getCardDef(instance.defId).cost + (instance.costModifier ?? 0) <= state.ap.current}
                playable={isPlayerTurn}
                playing={pendingCardUid === instance.uid}
                bonusReady={isPlayerTurn && previewBonusTrigger(state, getCardDef(instance.defId))}
                onPlay={() => playCard(instance.uid)}
              />
            ))}
          </div>

          {/* 決定77 の position:fixed は Phase 6-B で廃止し、ドック内の操作列へ統合した
              （カードと重ならない専用の場所を確保する）。disabled 制御は無変更。 */}
          <div className="battle-dock-actions">
            <button type="button" className="end-round-button" disabled={!isPlayerTurn} onClick={endRound}>
              ラウンドを終える
            </button>
            <button
              type="button"
              className={`battle-log-toggle${logOpen ? ' is-open' : ''}`}
              onClick={() => setLogOpen((v) => !v)}
              aria-expanded={logOpen}
            >
              ログ
            </button>
          </div>
        </div>
      </div>

      {entranceKey > 0 && (
        <BossEntrance key={`entrance-${entranceKey}`} enemyId={state.enemy.defId} stake={state.stake} daily={state.mode === 'daily'} onDone={handleEntranceDone} />
      )}

      {victoryBeat && (
        <div
          className="victory-beat"
          aria-hidden="true"
          data-testid="victory-beat"
          style={{ '--beat-ms': `${presentation.reduced ? VICTORY_BEAT_REDUCED_MS : VICTORY_BEAT_MS}ms` } as CSSProperties}
        >
          <span>撃破！</span>
        </div>
      )}

      {/* Phase 6-C：報酬は結果画面の「報酬カードを選ぶ」から開く（決定43の提示内容・1回だけの規則は不変） */}
      {state.status === 'won' && !rewardDone && rewardOpen && (
        <RewardOverlay
          godId={state.godId}
          seed={state.seed}
          onPick={(cardId) => {
            addRewardBonus(state.godId, cardId)
            setRewardDone(true)
            setRewardOpen(false)
          }}
          onSkip={() => {
            setRewardDone(true)
            setRewardOpen(false)
          }}
        />
      )}

      {state.status !== 'playing' && presentationDone && !rewardOpen && (
        <GameOverOverlay
          recap={buildBattleRecap(log, state)}
          rewardPending={state.status === 'won' && !rewardDone}
          onOpenReward={() => setRewardOpen(true)}
          status={state.status}
          score={state.score}
          godId={state.godId}
          otomo={state.otomo}
          enemy={state.enemy}
          newBest={newBest}
          prevBest={prevBest}
          otomoLevelUp={otomoLevelUp}
          mastery={getMastery(state)}
          onRematch={onRematch}
          onReselect={onReselect}
          daily={state.mode === 'daily' ? dailyResult : null}
          dailyRanked={dailyRanked}
          stakeResult={stakeResult}
          shareState={state}
          defeatCause={state.status === 'lost' ? deriveDefeatCause(log, state.round) : null}
          rematchLabel={rematchLabel}
          rematchDisabled={rematchDisabled}
          onOpenRanking={state.mode === 'daily' ? onOpenRanking : undefined}
        />
      )}
    </div>
  )
}
