import type { Effect, GodArchetype, GodDef, GodId, OtomoDef } from '../../core/types'
import { GOD_IDS } from '../../core/data/gods'

/**
 * 神選択画面：「どの神を選べばいいか分からない」というCEOフィードバックへの対応。
 *
 * 表示は2段構成にした：
 * ①`archetype`（攻撃型／防御型など）＝`GodDef`に手動で割り当てた分類（決定20・23・
 *   25・26の設計意図に基づく。tagline/motifと同じ「手書きの人間向け説明」）
 * ②4軸のステータスバー（攻撃・防御・回復・特殊）＝`resonanceEffects`と
 *   OTOMOの`effectsByForm`から機械的に集計した数値。カードごとの`CardIcon`
 *   （決定30）と同じ精神で、手書きコピーではなくデータから導出するため、
 *   バランス調整（決定26・36のような数値変更）があっても自動的に最新の値に
 *   追従する。
 *
 * ①は「性格に合った大まかな方向性」、②は「実際の数値の裏付け」を担い、
 * 両方合わせて初めて「見ただけで選べる」比較ができる。
 */

export type GodStats = {
  attack: number
  defense: number
  heal: number
  special: number
}

// 決定6の基準レート「1AP=5ダメージ相当」に合わせた重み。
// draw・buffは装備状況次第で価値が変わるため、gainApより控えめな重みにしてある
// （厳密な経済モデルではなく、選択画面での大まかな比較用の目安）。
const GAIN_AP_WEIGHT = 5
const DRAW_WEIGHT = 3

function accumulate(effects: Effect[], stats: GodStats): void {
  for (const effect of effects) {
    switch (effect.kind) {
      case 'damage':
        if (effect.target === 'enemy') stats.attack += effect.amount
        break
      case 'block':
        stats.defense += effect.amount
        break
      case 'heal':
        stats.heal += effect.amount
        break
      case 'debuff':
        // 敵の攻撃力デバフは被ダメージ軽減＝実質的な防御として計上する
        if (effect.target === 'enemy' && effect.stat === 'atk') {
          stats.defense += effect.amount * effect.rounds
        } else {
          stats.special += effect.amount * effect.rounds
        }
        break
      case 'buff':
        stats.special += effect.amount * effect.rounds
        break
      case 'draw':
        stats.special += effect.amount * DRAW_WEIGHT
        break
      case 'gainAp':
        stats.special += effect.amount * GAIN_AP_WEIGHT
        break
      case 'resonance':
      case 'score':
        break
    }
  }
}

/** 神の共鳴の一撃＋専属OTOMO（童子・最大成長時）の効果を合算した4軸ステータス */
export function computeGodStats(god: GodDef, otomo: OtomoDef): GodStats {
  const stats: GodStats = { attack: 0, defense: 0, heal: 0, special: 0 }
  accumulate(god.resonanceEffects, stats)
  accumulate(otomo.effectsByForm.doji, stats)
  return stats
}

export const ARCHETYPE_LABEL: Record<GodArchetype, string> = {
  attack: '攻撃型',
  defense: '防御型',
  support: '支援型',
  technique: '技巧型',
  balance: 'バランス型',
}

/**
 * 神ごとの「得意戦法」（第二次完成フェーズ候補D。CEOフィードバック「神選択時点で
 * 戦い方の違いが分からない」への対応）。
 *
 * `tagline`/`motif`（`gods.ts`）と同じ「手書きの人間向け説明」だが、あえて
 * `src/core/`には置かず`src/components/setup/`側の独立したルックアップとした
 * （純粋な表示文字列であり、ゲームロジックではないため。`ARCHETYPE_LABEL`と
 * 同じ設計パターン）。文言は`gods.ts`の`resonanceEffects`・専用カード
 * （`cards/*.ts`）・`deckBuilder.ts`の実データと個別に照合済み（8/31第二次
 * 完成フェーズ・候補D、Opus最終レビューで7神ぶん再検証済み）。
 *
 * スコープはゲームプレイの手順の説明のみ。性格・世界観・ストーリーは含めない
 * （FINAL_BACKLOG_8-31.md §3-D「七神の世界観テキスト拡充」には踏み込まない）。
 * archetypeバッジ（攻撃型／防御型…）と重複する「〜型／アタッカー」等の
 * 分類語は末尾に付けない。
 */
export const GOD_TACTICS: Record<GodId, string> = {
  [GOD_IDS.ebisu]: '大きな一撃と最高スコアで押し切る、扱いやすい構成',
  [GOD_IDS.taiyo]: '自分を鼓舞してから畳みかける、最大火力の一撃',
  [GOD_IDS.sobi]: 'ブロックを厚く重ねて受け止め、崩れず反撃する',
  [GOD_IDS.saika]: '神力とカードを増やし、1ラウンドに何枚も撃ち込む',
  [GOD_IDS.juraku]: '軽いカードを次々に重ね、敵の攻撃力を削って長引かせる',
  [GOD_IDS.fukuei]: '危険を冒して攻め、掴んだ幸運で立て直す',
  [GOD_IDS.shouren]: '回復とブロックの総量が最大、粘り勝ちを狙う',
}

/**
 * 神ごとの「唯一の◯◯型」判定（CEOフィードバック「才華を選ぶ理由が分からない」
 * への対応・施策A）。7神中その`archetype`が1体しかいなければ「唯一」を示す。
 * ハードコードせず`GODS`の実データから毎回数え直すため、将来神が増減しても
 * 自動的に正しい値になる。
 */
export function countGodsByArchetype(gods: GodDef[]): Record<GodArchetype, number> {
  const counts: Record<GodArchetype, number> = {
    attack: 0,
    defense: 0,
    support: 0,
    technique: 0,
    balance: 0,
  }
  for (const god of gods) {
    counts[god.archetype] += 1
  }
  return counts
}

/**
 * atk/defの内部キーを日本語表示名に変換する共通マップ。
 * 元々このファイル（神選択画面の特殊効果説明）専用だったが、A3監査で
 * `PlayerPanel`/`EnemyPanel`/`formatEvent`のバフ表示が内部キーをそのまま
 * 表示していたことが判明したため、既存資産として`export`して再利用する。
 */
export const STAT_LABEL: Record<'atk' | 'def', string> = {
  atk: '攻撃力',
  def: '防御力',
}

/**
 * 七神キービジュアル採用：`.god-select-card img`/`.god-select-recap img`は
 * 1:1の正方形枠（`object-fit:cover`）だが、キービジュアル原本は7神で縦横比が
 * 不揃い（5神が3:4、福永が約4:5、笑蓮のみ1:1）。正方形にcoverすると縦方向が
 * 大きくクロップされるため、神ごとに顔・特徴的な装備が欠けない位置を実機
 * プレビューで目視確認し、`object-position`のY軸オフセットだけを個別指定する
 * （X軸はどの神も左右中央で問題ないため`center`固定）。全神に同じ値を
 * 機械的に適用すると特定の神だけ顔が切れるため、値は共通化しない。
 * 笑蓮は原本が既に1:1（1254×1254）でクロップが発生しないため中央のままでよい。
 */
export const KEYVISUAL_OBJECT_POSITION: Record<GodId, string> = {
  [GOD_IDS.ebisu]: 'center 25%',
  [GOD_IDS.taiyo]: 'center 30%',
  [GOD_IDS.sobi]: 'center 28%',
  [GOD_IDS.saika]: 'center 22%',
  [GOD_IDS.juraku]: 'center 15%',
  [GOD_IDS.fukuei]: 'center 20%',
  [GOD_IDS.shouren]: 'center',
}

/**
 * OTOMO育成インセンティブ改善（8/31版）：「OTOMOとの絆」画面の7枚のカードを
 * 一目で見分けられるようにする専用テーマカラー。
 *
 * `.god-archetype-*`（5色）をそのまま流用しなかった理由：7神中3神（恵比寿・
 * 大耀・福永）が同じattack型のため、archetype色だけでは最大5色にしかならず
 * 7体を一意に区別できない（OTOMO育成監査STEP7で確認済み）。そのため7神の
 * キービジュアル（`public/assets/reference/gods/`）の配色を目視で参照しつつ、
 * 色相環を7等分した明確に異なる7色を新規に割り当てた（画像アセットは
 * 追加せず、CSSカスタムプロパティとして各カードに注入するだけ）。
 * `base`＝バッジ・称号見出し等の不透明表示用、`bg`＝カード背景グローの
 * 淡色オーバーレイ用、`border`＝カード外枠用。値は既存コードの配色記法
 * （8桁HEXでアルファを直書き、例：`#ffd16655`）に合わせている。
 */
export const OTOMO_THEME_COLOR: Record<GodId, { base: string; bg: string; border: string }> = {
  [GOD_IDS.ebisu]: { base: '#ff6b5e', bg: '#ff6b5e22', border: '#ff6b5e66' },
  [GOD_IDS.taiyo]: { base: '#e8b33d', bg: '#e8b33d22', border: '#e8b33d66' },
  [GOD_IDS.sobi]: { base: '#4d9fff', bg: '#4d9fff22', border: '#4d9fff66' },
  [GOD_IDS.saika]: { base: '#c96bff', bg: '#c96bff22', border: '#c96bff66' },
  [GOD_IDS.juraku]: { base: '#6ec972', bg: '#6ec97222', border: '#6ec97266' },
  [GOD_IDS.fukuei]: { base: '#3ddbb0', bg: '#3ddbb022', border: '#3ddbb066' },
  [GOD_IDS.shouren]: { base: '#ff7fb3', bg: '#ff7fb322', border: '#ff7fb366' },
}

/**
 * 「特殊」バーの数字だけでは中身が分からない（CEOフィードバック）ため、
 * 何が積み上がって特殊になっているのかを一言で示す。該当効果が無ければnull。
 * draw・gainApは神の共鳴＋OTOMO成長の合計値にまとめ（「カード+2枚・カード+1枚」の
 * ように同じ種類が重複して出るのを避ける）、buff・debuffはそれぞれ個別に列挙する。
 */
export function describeSpecial(god: GodDef, otomo: OtomoDef): string | null {
  const effects = [...god.resonanceEffects, ...otomo.effectsByForm.doji]
  let drawTotal = 0
  let gainApTotal = 0
  const parts: string[] = []

  for (const effect of effects) {
    switch (effect.kind) {
      case 'draw':
        drawTotal += effect.amount
        break
      case 'gainAp':
        gainApTotal += effect.amount
        break
      case 'buff':
        parts.push(`自分の${STAT_LABEL[effect.stat]}+${effect.amount}（${effect.rounds}R）`)
        break
      case 'debuff':
        // 敵atkデバフはcomputeGodStats側でdefenseに計上済みのため、ここでは除く
        if (!(effect.target === 'enemy' && effect.stat === 'atk')) {
          const target = effect.target === 'enemy' ? '敵' : '自分'
          parts.push(`${target}の${STAT_LABEL[effect.stat]}${effect.amount}（${effect.rounds}R）`)
        }
        break
      default:
        break
    }
  }

  const merged = [
    ...(drawTotal > 0 ? [`カード+${drawTotal}枚`] : []),
    ...(gainApTotal > 0 ? [`神力+${gainApTotal}`] : []),
    ...parts,
  ]
  return merged.length > 0 ? merged.join('・') : null
}
