import { useEffect, useRef, useState } from 'react'
import type { GameEvent, OtomoForm } from '../../core/types'

export type BattleFx = {
  /** 変わるたびにEnemyPanelのシェイクを再生させるキー */
  enemyHitKey: number
  /** 変わるたびにPlayerPanelのシェイクを再生させるキー */
  selfHitKey: number
  /** 変わるたびにHPバーの回復グローを再生させるキー */
  healKey: number
  /** 変わるたびに共鳴発動バナーを再生させるキー */
  burstKey: number
  /** 変わるたびにOTOMOの成長グローを再生させるキー */
  evolveKey: number
  /** 直近のOTOMO進化後の形態（FINAL_BACKLOG_8-31.md Phase 3「OTOMO進化バナー」用） */
  evolveForm: OtomoForm | null
  /** 変わるたびに神（プレイヤー側）の攻撃モーションを再生させるキー */
  godAttackKey: number
  /** 変わるたびに敵の攻撃モーションを再生させるキー */
  enemyAttackKey: number
  /** 変わるたびに「神力を使い残した」トーストを再生させるキー（決定40） */
  apPenaltyKey: number
  /** 直近の使い残しペナルティのスコア減点量（負の値） */
  apPenaltyAmount: number
}

const INITIAL_FX: BattleFx = {
  enemyHitKey: 0,
  selfHitKey: 0,
  healKey: 0,
  burstKey: 0,
  evolveKey: 0,
  evolveForm: null,
  godAttackKey: 0,
  enemyAttackKey: 0,
  apPenaltyKey: 0,
  apPenaltyAmount: 0,
}

/**
 * イベントログを見て、演出（シェイク・グロー・共鳴バナー）の再生タイミングを作るフック。
 * ルール本体（core）は演出を一切知らないので、「起きた出来事」から
 * 「どう見せるか」への変換はすべてここに閉じ込めます。
 */
export function useBattleFx(log: GameEvent[]): BattleFx {
  const [fx, setFx] = useState<BattleFx>(INITIAL_FX)
  const seenCount = useRef(0)

  useEffect(() => {
    // ログが短くなった＝ゲームがリスタートされた
    if (log.length < seenCount.current) seenCount.current = 0

    const newEvents = log.slice(seenCount.current)
    seenCount.current = log.length
    if (newEvents.length === 0) return

    let enemyHit = 0
    let selfHit = 0
    let heal = 0
    let burst = 0
    let evolve = 0
    let evolveForm: OtomoForm | null = null
    let godAttack = 0
    let enemyAttack = 0
    let apPenalty = 0
    let apPenaltyAmount = 0

    for (const event of newEvents) {
      if (event.t === 'DAMAGE_DEALT' && event.amount > 0) {
        // target='enemy'は「敵が被弾」＝神（プレイヤー側）が攻撃を実行した瞬間。
        // target='self'はその逆で、敵が攻撃を実行した瞬間。
        if (event.target === 'enemy') {
          enemyHit += 1
          godAttack += 1
        } else {
          selfHit += 1
        }
      } else if (event.t === 'ENEMY_ACTED' && event.kind === 'attack') {
        // 第二次完成フェーズP0-3：以前はDAMAGE_DEALT{target:'self', amount>0}の
        // 分岐内でenemyAttackも一緒に加算していたため、プレイヤーが完全ブロック
        // （dealt=0）した瞬間は敵の突進モーションそのものが再生されなかった
        // （防御が一番決まった時に画面が一番静かになる、という逆転が起きていた）。
        // ENEMY_ACTEDは「敵が実際に攻撃した」ことを示す専用イベントで、
        // round.tsのrunEnemyTurnからのみ出る（effects.tsの自傷カード効果とは
        // 無関係）ため、ここを起点にすればブロック結果に関係なく敵の攻撃
        // モーションだけを独立して発火できる。selfHit（被弾シェイク・斬撃）は
        // 従来どおりamount>0（dealtが実際に発生した時）限定のまま変更しない
        // （ブロックしたのに殴られたように見える誤読を避けるため）。
        enemyAttack += 1
      } else if (event.t === 'HEALED' && event.amount > 0) {
        heal += 1
      } else if (event.t === 'RESONANCE_BURST') {
        burst += 1
        godAttack += 1
      } else if (event.t === 'OTOMO_EVOLVED') {
        evolve += 1
        evolveForm = event.form
      } else if (event.t === 'SCORE_GAINED' && event.reason === 'apEfficiency' && event.amount < 0) {
        // 決定40：神力の使い残しペナルティ（決定不変ルール4のrules.ts側の値そのもの）を
        // ログに埋もれさせず、画面上のトーストとしても一瞬強調する
        apPenalty += 1
        apPenaltyAmount = event.amount
      }
    }

    if (enemyHit || selfHit || heal || burst || evolve || godAttack || enemyAttack || apPenalty) {
      setFx((prev) => ({
        enemyHitKey: prev.enemyHitKey + enemyHit,
        selfHitKey: prev.selfHitKey + selfHit,
        healKey: prev.healKey + heal,
        burstKey: prev.burstKey + burst,
        evolveKey: prev.evolveKey + evolve,
        evolveForm: evolve ? evolveForm : prev.evolveForm,
        godAttackKey: prev.godAttackKey + godAttack,
        enemyAttackKey: prev.enemyAttackKey + enemyAttack,
        apPenaltyKey: prev.apPenaltyKey + apPenalty,
        apPenaltyAmount: apPenalty ? apPenaltyAmount : prev.apPenaltyAmount,
      }))
    }
  }, [log])

  return fx
}
