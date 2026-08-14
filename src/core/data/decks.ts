import type { CardDefId } from '../types/ids'
import { CARD_IDS, EBISU_CARD_IDS } from './cards'

/**
 * MVP Ver 0.1 の初期デッキ（20枚）。
 *
 * 決定16によりMVPではデッキ構築を行わないため、全プレイヤー共通です。
 * Phase 5 でデッキ構築を実装したら、ここは「初期支給デッキ」になります。
 *
 * 全20種を重複なしの単一枚構成にしています（決定12でデッキ枚数20は確定のため、
 * 全32種の中から実際に使う20種を選び直した構成）。
 * 7ラウンドで引くのは最大17枚（初期手札5＋毎ラウンド2枚×6）なので、
 * 単一枚構成でも捨札シャッフル（決定14）は基本的に発生しません。
 *
 * 選定方針：
 *   攻撃(7) … 捨身の一撃/神速(1AP)、剛撃/乱舞(2AP)、大喝(3AP)、大漁/潮招き(恵比寿2AP)
 *             コスト帯ごとに択があり、恵比寿専用の2枚で共鳴・回復も補える
 *   防御(3) … 守護(1AP)、受け流し(1AP・共鳴付き)、守りの陣(2AP・回復付き)
 *   共鳴(2) … 共振(1AP)で早めに、秘技・満ちる(3AP)で一気に積む。
 *             恵比寿専用カードの共鳴付与と合わせて最大7に十分届く
 *   支援(4) … 息継ぎ/神力の泉(1AP)、恵比寿顔(2AP)、福授け(1AP恵比寿)。
 *             神力の泉はAP加算、他は回復系で役割を分けている
 *   妨害(2) … 威嚇(1AP・軽量)、金縛り(3AP・重量)で択に幅を持たせる
 *   神託(2) … 小さな託宣(1AP)と神託(3AP)で、切り札を引く前のつなぎを用意
 *
 * 今回選外になった9種（一撃・速攻・渾身の一撃・鉄壁の構え・癒し・呪縛・
 * 予言・巫女の舞・大治癒）は `getCardDef` からは引き続き参照可能で、
 * データとしては存在し続けます。Phase 5のデッキ構築や報酬カード枠での
 * 採用を想定したロスターです。
 */
export const STARTER_DECK: CardDefId[] = [
  CARD_IDS.recklessBlow,
  CARD_IDS.windStep,
  CARD_IDS.heavyBlow,
  CARD_IDS.flurry,
  CARD_IDS.warCry,
  CARD_IDS.guard,
  CARD_IDS.parry,
  CARD_IDS.bastion,
  CARD_IDS.resonate,
  CARD_IDS.risingTide,
  CARD_IDS.catchBreath,
  CARD_IDS.wellspring,
  CARD_IDS.intimidate,
  CARD_IDS.bind,
  CARD_IDS.minorOracle,
  CARD_IDS.oracle,
  EBISU_CARD_IDS.greatCatch,
  EBISU_CARD_IDS.tidingsCatch,
  EBISU_CARD_IDS.ebisuSmile,
  EBISU_CARD_IDS.fortune,
]
