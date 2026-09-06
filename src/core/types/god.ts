import type { GodId, OtomoId } from './ids'
import type { Effect } from './effect'

/** 立ち絵の3枚（決定18：SGG Creator Kit準拠） */
export type GodArt = {
  /** キービジュアル（ポートレート・メニュー等） */
  main: string
  /** 正面向き（戦闘時のプレイヤー対面表示等） */
  front: string
  /** 背面向き（自陣・プレイヤー側表示等） */
  back: string
  /**
   * 七神キービジュアル採用（タイトル画面＋神選択画面）：
   * `public/assets/reference/gods/{id}-keyvisual.png`（原本・保護対象、変更禁止）から
   * 生成した軽量WebP派生版。原本は無加工のまま保持し、表示用にはこちらのみ使う。
   */
  keyvisual: string
}

/**
 * 七神の定義。
 *
 * 決定8：共鳴ゲージ＝神とのつながり。満タンで神が介入する。
 * 決定9：MVPは全神共通の固定効果。神ごとの個性づけは将来。
 * 決定18：SGG Creator Kit（公式二次創作素材）採用により、実名・実素材を確定。
 * 決定20：七福神モチーフに基づき、性格・キャッチコピーを確定。
 *
 * 神ごとに専属のOTOMOが1体ひもづく（decision 18）。
 */
export type GodDef = {
  id: GodId
  nameJa: string
  nameEn: string
  /** 表示名（後方互換用。nameJaと同じ） */
  name: string
  art: GodArt
  /** この神に専属するOTOMO */
  otomoId: OtomoId
  /** 共鳴ゲージ満タン時に発動する効果 */
  resonanceEffects: Effect[]
  /** 元にした七福神（決定20。design docへの参照用。UIには出さない） */
  motif: string
  /** 戦闘画面に表示する一言（決定20） */
  tagline: string
  /**
   * 神選択画面でのプレイスタイル分類（CEOフィードバック「攻撃型・防御型など
   * 特徴が分かるように」への対応）。`resonanceEffects`の数値から機械的に
   * 判定すると、笑蓮のように「攻撃も防御も僅差」なケースで意図と異なる
   * 分類になりうるため、`tagline`/`motif`と同じく決定20・23・25・26の
   * 設計意図に沿って手動で割り当てる（数値の裏付けは`godStyle.ts`の
   * ステータスバーが自動で示す）。
   */
  archetype: GodArchetype
  /**
   * 神の「得意技」（Phase 3 FINAL SPEC v0.1）。3神（蒼毘・笑蓮・福永）のみ持つ。
   * 残る4神は主軸が既に成立しているため持たせない（Step 2.5 §8で検証済み）。
   */
  passive?: GodPassive
}

/** 神のプレイスタイル分類（5種、決定20・23・25・26の設計意図に基づく） */
export type GodArchetype = 'attack' | 'defense' | 'support' | 'technique' | 'balance'

/**
 * 神の「得意技」（Passive）の識別子（Phase 3「神格」FINAL SPEC v0.1）。
 *
 * 実際の処理は`engine/godPassive.ts`の`GOD_PASSIVE_HOOKS`にこのidで登録する。
 * `GodDef`側は「どのidを持つか」と表示テキストだけを持ち、engineは神名や
 * カード名の文字列比較を行わない（不変ルール3の精神）。
 *
 * - sobi_counter      … 蒼毘「反撃の構え」：敵ターン終了時、残ったブロックを敵へのダメージに変える
 * - shouren_pristine  … 笑蓮「無傷の慈愛」：HPが高いあいだ、攻撃カードのダメージが増える
 * - fukuei_gamble     … 福永「大勝負」：HPが低いあいだ、攻撃カードのダメージが増える
 */
export type GodPassiveId = 'sobi_counter' | 'shouren_pristine' | 'fukuei_gamble'

/** 神の得意技の表示データ（数値は`RULES.godPassive`に集約する＝不変ルール4） */
export type GodPassive = {
  id: GodPassiveId
  nameJa: string
  /** 1行の説明（神選択画面・戦闘HUDのバッジ） */
  textJa: string
}
