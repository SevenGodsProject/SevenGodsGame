import { useEffect, useRef, useState } from 'react'
import type { GameEvent, OtomoForm } from '../../core/types'
import { getGodPassiveDef } from '../../core/data/gods'
import { getIntentPowerTier, type PowerTier } from './cardStyle'
import { damageFeelTier, type FeelTier } from './feelTier'
import { formatScaled } from '../displayScale'

/**
 * HOTFIX-DISPLAY-SCALE-TOAST：カード使用結果トーストの表示文言。
 * 内部値はformatScaled（表示×10、displayScale.ts）で必ず変換する。
 * Battle log（formatEvent.ts）・BattleMiniResult・useFloatingNumbersと同じ
 * 共通formatterを使い、独自倍率処理は持たない。テストから直接検証できるよう
 * 純関数としてhook外に置く。
 */
export const fxToastText = {
  damage: (amount: number) => `⚔ 敵に${formatScaled(amount)}ダメージ`,
  heal: (amount: number) => `💚 HP+${formatScaled(amount)}`,
  block: (amount: number) => `🛡 ブロック+${formatScaled(amount)}`,
  /** Phase 3 FINAL SPEC v0.1：神の得意技が発動した瞬間の一言（新SE・新VFXは追加しない） */
  passive: (nameJa: string) => `✨ 得意技「${nameJa}」`,
} as const

/**
 * STEP2-B（BattleMiniResult）：1回のアクション（カード使用／ラウンド終了＝敵ターン）で
 * 何が起きたかを構造化したデータ。既存GameEventから導出するだけで、core/engineの
 * GameState・reducer・イベント定義は一切変更しない（gainApだけイベントが存在しない
 * ため、useBattleFxの外側でap.currentの差分から検出する＝下記apGain参照）。
 */
export type MiniResultData = {
  /** 誰が誰を攻撃したか。カードで敵を攻撃＝'playerAttack'、敵のターン＝'enemyAttack'、
   * 攻撃を伴わない効果（回復・共鳴・支援等のみ）＝'neutral' */
  direction: 'playerAttack' | 'enemyAttack' | 'neutral'
  /** 敵に与えた実ダメージ（target='enemy'のDAMAGE_DEALT合計） */
  enemyDamage: number
  /** 敵の攻撃で自分が実際に受けたダメージ（ブロック後、ENEMY_ACTEDを伴うバッチのみ） */
  enemyAttackDamage: number
  /** 自分のカード効果による自傷ダメージ（捨身の一撃等、ENEMY_ACTEDを伴わないバッチ） */
  selfInflictedDamage: number
  heal: number
  block: number
  resonanceGain: number
  resonanceTotal: number | null
  apGain: number
  drawCount: number
  buffs: { target: 'enemy' | 'self'; stat: string; amount: number; rounds: number }[]
}

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
  /** STEP-UX5：直近の敵攻撃（ENEMY_ACTED.amount）の危険度tier。既存
   * getIntentPowerTier（cardStyle.ts、Intent表示・cast-flash演出と共通の
   * 10/15閾値）をそのまま再利用するだけで、新しい閾値・GameStateは持たない。
   * chargeターン（攻撃そのものではない）では更新しない。enemyAttackKeyと
   * 同時に更新されるため、EnemyPanelの突進演出・PlayerPanelの被弾演出の
   * 両方が「同じ1回の攻撃」に対して同じtierを参照できる。 */
  enemyAttackTier: PowerTier
  /** 蒼毘Visual Polish：変わるたびにbadge-blockのパルス演出を再生させるキー */
  blockGainKey: number
  /** スマホUX修正：変わるたびに「カード使用結果」の画面固定トーストを再生させるキー */
  resultToastKey: number
  /** 直近のカード使用結果として表示するテキスト（複数効果は" / "で連結） */
  resultToastText: string
  /** STEP2-B：変わるたびにBattleMiniResult（HUD直下のミニ戦闘結果）を再生させるキー */
  miniResultKey: number
  /** 直近のアクションの構造化結果。該当する効果が無かった場合はnull */
  miniResult: MiniResultData | null
  /** ENEMY-VFX-01：変わるたびに敵必殺カットイン（BattleEnemyCutin）を再生させるキー。
   * ENEMY_ACTEDのkind==='special'または「labelを持つmultiAttack」（＝技名付き連撃）で
   * 増える。判定はイベント列のみで、敵IDのswitchは持たない（7敵展開でもこのまま） */
  enemySpecialKey: number
  /** 直近の敵必殺技の技名（ENEMY_ACTED.label）。カットインの文言に使う */
  enemySpecialName: string | null
  /** 直近の敵必殺技のkind（'special'=単発大技／'multiAttack'=技名付き連撃）。
   * 着弾ビーム（砲撃系の演出）はkind==='special'のみに出す等、演出の出し分けに使う */
  enemySpecialKind: string | null
  /** 直近の敵必殺技の合計amount（内部値。表示は×10） */
  enemySpecialAmount: number
  /** ENEMY-VFX-01：直近の敵攻撃バッチのself被弾hit数（連撃のテンポ演出用）。
   * 1なら従来の単発被弾演出のまま */
  multiHitCount: number
  /** 直近の敵攻撃バッチが必殺（カットイン付き）だったか。被弾シェイク・
   * フローティング数字をカットイン(0.9s)後へ遅らせる判定に使う */
  specialHit: boolean
  /** VFX-03：直近の神攻撃（godAttackKey増分）が共鳴BURSTのバッチだったか。
   * 神の攻撃モーション・敵側の被弾演出を共鳴カットイン→burst-bannerの後ろへ
   * 遅らせる（enemyVfxTiming.tsのBURST_*）。表示のみ、combatは確定済み */
  burstHit: boolean
  /** 決定128：直近の自分→敵の被弾の演出段階（L1〜L4。同バッチ最大ダメージ、BURSTはL4） */
  enemyHitTier: FeelTier
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
  enemyAttackTier: 'normal',
  blockGainKey: 0,
  resultToastKey: 0,
  resultToastText: '',
  miniResultKey: 0,
  miniResult: null,
  enemySpecialKey: 0,
  enemySpecialName: null,
  enemySpecialKind: null,
  enemySpecialAmount: 0,
  multiHitCount: 0,
  specialHit: false,
  burstHit: false,
  enemyHitTier: 2,
}

/**
 * イベントログを見て、演出（シェイク・グロー・共鳴バナー）の再生タイミングを作るフック。
 * ルール本体（core）は演出を一切知らないので、「起きた出来事」から
 * 「どう見せるか」への変換はすべてここに閉じ込めます。
 */
export function useBattleFx(log: GameEvent[], apCurrent: number): BattleFx {
  const [fx, setFx] = useState<BattleFx>(INITIAL_FX)
  const seenCount = useRef(0)
  // STEP2-B：gainAp効果はGameEventを一切出さない（effects.tsのcase 'gainAp'参照）ため、
  // core/engineに新しいイベントを追加せず、UI層でap.currentの差分だけを見て検出する。
  // 新しいGameStateは持たない（既存のap.currentという値を読むだけ）。
  const prevAp = useRef(apCurrent)

  useEffect(() => {
    // ログが短くなった＝ゲームがリスタートされた
    if (log.length < seenCount.current) {
      seenCount.current = 0
      prevAp.current = apCurrent
    }

    const newEvents = log.slice(seenCount.current)
    seenCount.current = log.length
    const apDelta = apCurrent - prevAp.current
    prevAp.current = apCurrent
    if (newEvents.length === 0) return

    let enemyHit = 0
    let selfHit = 0
    let heal = 0
    let burst = 0
    let maxEnemyHitAmount = 0
    let evolve = 0
    let evolveForm: OtomoForm | null = null
    let godAttack = 0
    let enemyAttack = 0
    let newEnemyAttackTier: PowerTier | null = null
    let blockGain = 0
    let resultToast = 0
    // STEP2-B（BattleMiniResult用の集計。既存のresultTexts等とは独立に集計するだけで
    // core/engineには一切触れない）
    let mrEnemyDamage = 0
    let mrHeal = 0
    let mrBlock = 0
    let mrResonanceGain = 0
    let mrResonanceTotal: number | null = null
    let mrDrawCount = 0
    let mrEnemyAttackDamage = 0
    let mrSelfInflictedDamage = 0
    let mrEnemyActed = 0
    const mrBuffs: MiniResultData['buffs'] = []
    // スマホUX修正：カード使用結果（攻撃/回復/防御）は、EnemyPanel/PlayerPanelという
    // 非fixed要素の中でしか見えず、手札位置までスクロールした状態では画面外だった
    // （cast-flash・burst-banner・ap-penalty-toast等は既にfixedで解決済みだが、
    // 数値結果そのものだけがこの問題を抱えていた）。既存のapPenaltyKey/Amountと
    // 全く同じ「単発トースト」パターンをそのまま複製し、1回のカード使用で複数の
    // 効果（例：ダメージ+回復の複合カード）が起きた場合は" / "で連結して1つの
    // トーストにまとめる。core/engine・数値・効果処理は無変更、表示専用の追加。
    const resultTexts: string[] = []

    // ENEMY-VFX-01：このバッチの敵必殺/連撃情報（表示専用）
    let batchSpecial = false
    let batchSpecialName: string | null = null
    let batchSpecialKind: string | null = null
    let batchSpecialAmount = 0
    let batchMulti = false

    for (const event of newEvents) {
      if (event.t === 'DAMAGE_DEALT' && event.amount > 0) {
        // target='enemy'は「敵が被弾」＝神（プレイヤー側）が攻撃を実行した瞬間。
        // target='self'はその逆で、敵が攻撃を実行した瞬間。
        if (event.target === 'enemy') {
          enemyHit += 1
          godAttack += 1
          maxEnemyHitAmount = Math.max(maxEnemyHitAmount, event.amount)
          resultToast += 1
          resultTexts.push(fxToastText.damage(event.amount))
          mrEnemyDamage += event.amount
        } else {
          selfHit += 1
          // STEP2-B：ENEMY_ACTEDが同バッチに先行していれば「敵の攻撃で受けた
          // ダメージ」、無ければ「捨身の一撃等、自分のカード効果による自傷」。
          // round.tsのrunEnemyTurnはENEMY_ACTED→applyDamageの順でイベントを
          // 積むため、newEvents内では常にENEMY_ACTEDが先に処理済みになる。
          if (mrEnemyActed > 0) {
            mrEnemyAttackDamage += event.amount
          } else {
            mrSelfInflictedDamage += event.amount
          }
        }
      } else if (event.t === 'ENEMY_ACTED' && event.kind !== 'charge') {
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
        mrEnemyActed += 1
        // STEP-UX5：この攻撃の予告時点の危険度（Intentが表示していたのと
        // 全く同じamount・全く同じ閾値関数）をそのままFXへ伝搬する。
        newEnemyAttackTier = getIntentPowerTier(event.amount)
        // ENEMY-VFX-01：必殺技（special、または技名labelを持つ連撃）を検出して
        // カットインの信号にする。連撃はkindだけで検出（数字テンポ演出用）。
        // どちらもイベント列のみの判定で敵IDのswitchは持たない。
        if (event.kind === 'multiAttack') batchMulti = true
        if (event.kind === 'special' || (event.kind === 'multiAttack' && !!event.label)) {
          batchSpecial = true
          batchSpecialName = event.label ?? null
          batchSpecialKind = event.kind
          batchSpecialAmount = event.amount
        }
      } else if (event.t === 'HEALED' && event.amount > 0) {
        heal += 1
        resultToast += 1
        resultTexts.push(fxToastText.heal(event.amount))
        mrHeal += event.amount
      } else if (event.t === 'RESONANCE_BURST') {
        burst += 1
        godAttack += 1
      } else if (event.t === 'OTOMO_EVOLVED') {
        evolve += 1
        evolveForm = event.form
      } else if (event.t === 'BLOCK_GAINED' && event.target === 'self' && event.amount > 0) {
        // STEP-SCORE2-F2：旧apPenaltyトースト系（決定40）はBASE-Dのペナルティ廃止で
        // 発火源イベント自体が消滅したため、集計・stateごと削除した
        // 蒼毘Visual Polish：既存のBLOCK_GAINEDイベント（これまでどのフックも
        // 未消費だった）を起点に、badge-blockの一瞬のパルスだけを追加する。
        // 数値・block加算処理そのもの（core/engine）は無変更、表示専用の対応。
        blockGain += 1
        resultToast += 1
        resultTexts.push(fxToastText.block(event.amount))
        mrBlock += event.amount
      } else if (event.t === 'RESONANCE_GAINED') {
        // STEP2-B：既存イベント（これまでどのフックも未消費だった）をミニ結果表示に使う
        mrResonanceGain += event.amount
        mrResonanceTotal = event.total
      } else if (event.t === 'CARD_DRAWN') {
        mrDrawCount += 1
      } else if (event.t === 'BUFF_APPLIED') {
        mrBuffs.push({ target: event.target, stat: event.stat, amount: event.amount, rounds: event.rounds })
      } else if (event.t === 'PASSIVE_TRIGGERED') {
        // Phase 3 FINAL SPEC v0.1：得意技の発動を既存トースト経路に1件だけ流す。
        // ダメージ自体は後続のDAMAGE_DEALTが既存のGame Feel 4段階で演出する。
        resultToast += 1
        resultTexts.push(fxToastText.passive(getGodPassiveDef(event.passiveId).nameJa))
      }
    }

    // STEP2-B：ミニ結果の方向性を決定。ENEMY_ACTEDがあれば敵ターン、
    // 敵へのダメージがあればプレイヤー攻撃、それ以外（回復・共鳴・支援のみ）は中立。
    const mrDirection: MiniResultData['direction'] =
      mrEnemyActed > 0 ? 'enemyAttack' : mrEnemyDamage > 0 ? 'playerAttack' : 'neutral'
    const hasMiniResult =
      mrEnemyDamage > 0 ||
      mrEnemyAttackDamage > 0 ||
      mrSelfInflictedDamage > 0 ||
      mrHeal > 0 ||
      mrBlock > 0 ||
      mrResonanceGain > 0 ||
      mrDrawCount > 0 ||
      apDelta !== 0 ||
      mrBuffs.length > 0
    const miniResult: MiniResultData | null = hasMiniResult
      ? {
          direction: mrDirection,
          enemyDamage: mrEnemyDamage,
          enemyAttackDamage: mrEnemyAttackDamage,
          selfInflictedDamage: mrSelfInflictedDamage,
          heal: mrHeal,
          block: mrBlock,
          resonanceGain: mrResonanceGain,
          resonanceTotal: mrResonanceTotal,
          apGain: apDelta,
          drawCount: mrDrawCount,
          buffs: mrBuffs,
        }
      : null

    if (
      enemyHit ||
      selfHit ||
      heal ||
      burst ||
      evolve ||
      godAttack ||
      enemyAttack ||
      blockGain ||
      resultToast ||
      miniResult
    ) {
      setFx((prev) => ({
        enemyHitKey: prev.enemyHitKey + enemyHit,
        selfHitKey: prev.selfHitKey + selfHit,
        healKey: prev.healKey + heal,
        burstKey: prev.burstKey + burst,
        evolveKey: prev.evolveKey + evolve,
        evolveForm: evolve ? evolveForm : prev.evolveForm,
        godAttackKey: prev.godAttackKey + godAttack,
        enemyAttackKey: prev.enemyAttackKey + enemyAttack,
        enemyAttackTier: newEnemyAttackTier ?? prev.enemyAttackTier,
        blockGainKey: prev.blockGainKey + blockGain,
        resultToastKey: prev.resultToastKey + resultToast,
        resultToastText: resultToast ? resultTexts.join(' / ') : prev.resultToastText,
        miniResultKey: miniResult ? prev.miniResultKey + 1 : prev.miniResultKey,
        miniResult: miniResult ?? prev.miniResult,
        enemySpecialKey: batchSpecial ? prev.enemySpecialKey + 1 : prev.enemySpecialKey,
        enemySpecialName: batchSpecial ? batchSpecialName : prev.enemySpecialName,
        enemySpecialKind: batchSpecial ? batchSpecialKind : prev.enemySpecialKind,
        enemySpecialAmount: batchSpecial ? batchSpecialAmount : prev.enemySpecialAmount,
        // 敵攻撃バッチのときだけ更新（カード自傷等では従来の単発演出のまま）
        multiHitCount: enemyAttack > 0 ? (batchMulti ? selfHit : Math.min(selfHit, 1)) : prev.multiHitCount,
        specialHit: enemyAttack > 0 ? batchSpecial : prev.specialHit,
        // VFX-03：神攻撃バッチのときだけ更新。RESONANCE_BURSTを含むバッチ＝共鳴の一撃
        // （カード自身のダメージと同バッチでも、1回のlunge/シェイクとしてburst側の
        // タイミングに揃える。数字はイベント単位で個別に遅延＝useFloatingNumbers）
        burstHit: godAttack > 0 ? burst > 0 : prev.burstHit,
        enemyHitTier: enemyHit > 0 ? damageFeelTier(maxEnemyHitAmount, { burst: burst > 0 }) : prev.enemyHitTier,
      }))
    }
  }, [log, apCurrent])

  return fx
}
