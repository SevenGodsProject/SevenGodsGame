import type { GodId, OtomoId } from './ids'
import type { Effect } from './effect'

/**
 * OTOMOの成長段階（決定18：SGG Creator Kit準拠）。
 * spirit（精霊態）→ incarnate（受肉態）→ doji（童子）の順で成長する。
 * 実際の解禁条件・演出は未決定。
 */
export type OtomoForm = 'spirit' | 'incarnate' | 'doji'

export const OTOMO_FORM_ORDER: readonly OtomoForm[] = [
  'spirit',
  'incarnate',
  'doji',
]

export type OtomoArt = Record<OtomoForm, string>

/**
 * OTOMOの成長の絆（決定44）。バトル開始前に選ぶ、共鳴発動時の追加効果の方向性。
 * 'guardian'＝守りの絆（決定19・23の既存効果、変更なし）、
 * 'power'＝力の絆（新規追加の代替効果、攻め寄りの方向性）。
 */
export type GrowthPath = 'guardian' | 'power'

/**
 * OTOMO の定義。
 *
 * 決定18：Kit実物は「神1柱につき専属OTOMOが1体、3形態」という構造だったため、
 * 旧仕様（プレイヤーが3体を編成するロースター）から変更しました。
 * OTOMOは神を選んだ時点で自動的に1体決まります。
 *
 * 決定19：形態変化は「共鳴発動のたびに1段階成長」で確定済み。
 * 効果は決定9と同じ方針（MVPは全神共通の固定効果）で、形態が上がるほど
 * 効果が強くなる `effectsByForm` を共鳴発動時に適用します（spirit形態は
 * まだ何も貢献しない「素の状態」を表すため空配列）。
 * 神ごとの個性づけ（種族・専用スキル）は将来、この値をOTOMOごとに
 * 差し替えるだけで実現できます。
 */
export type OtomoDef = {
  id: OtomoId
  /** 専属する神 */
  godId: GodId
  nameJa: string
  nameEn: string
  /** 表示名（後方互換用。nameJaと同じ） */
  name: string
  art: OtomoArt
  /** 形態ごとに共鳴発動時へ追加される効果（守りの絆。決定19・23の既存値） */
  effectsByForm: Record<OtomoForm, Effect[]>
  /** 形態ごとに共鳴発動時へ追加される効果（力の絆。決定44で追加した代替パス） */
  powerPathEffectsByForm: Record<OtomoForm, Effect[]>
}

/** 盤面上のOTOMOの状態 */
export type OtomoState = {
  defId: OtomoId
  name: string
  form: OtomoForm
}
