import { godId } from '../types/ids'
import type { Effect, GodDef, GodId } from '../types'
import { OTOMO_IDS } from './otomo'

export const GOD_IDS = {
  ebisu: godId('ebisu'),
  taiyo: godId('taiyo'),
  sobi: godId('sobi'),
  saika: godId('saika'),
  juraku: godId('juraku'),
  fukuei: godId('fukuei'),
  shouren: godId('shouren'),
} as const

/**
 * 共鳴ゲージ満タン時に発動する効果（決定23で神ごとに個性化）。
 *
 * 決定9でMVPは全神共通の固定効果としていたが、決定20で七福神モチーフの
 * 性格・世界観が確定したため、その性格を反映した効果に差し替えた。
 * STEP-SCORE2-F2（B'確定構成）：BASE-D（決定109）で`score`効果がBattle Scoreへ
 * 加算されなくなったため、全神のburstから旧score（150〜200）を撤去し、
 * その神らしい実効果（追撃AP・純火力・block・debuff等）へ置換した。
 * 値はF1/F2の計160,000試合超のsimulationで検証済み（詳細はdocs/DECISIONS.md）。
 * ※burst効果へ`resonance`を入れることは無限発動リスクのため全神で禁止。
 */
// STEP-SCORE2-F2（B'確定構成）：BASE-D（決定109）でscore直接効果はBattle Scoreへ
// 加算されなくなったため、旧score200を「一本釣り→追撃」（gainAp2）へ置換。
// 大耀（純火力36）とは「決着の速さ」vs「瞬間の大きさ」で軸を分離する。
// ※burst効果へのresonance追加は無限発動リスクのため全神で禁止（F1 PLAN-C実証）。
const EBISU_RESONANCE_EFFECTS: Effect[] = [
  { kind: 'damage', target: 'enemy', amount: 25 },
  { kind: 'gainAp', amount: 2 },
]

const art = (id: string) => ({
  // main/frontは、白背景をアルファ抜きしたPNGに差し替えている（決定34・35）。
  // 神選択画面・プレイヤーアバターで白い矩形が目立っていたための対応。
  // backは戦闘画面等どこからも参照されていないため、元のwebpのまま残している。
  main: `/assets/gods/${id}/main.png`,
  front: `/assets/gods/${id}/front.png`,
  back: `/assets/gods/${id}/back.webp`,
  // 七神キービジュアル採用：原本（public/assets/reference/gods/）から生成した
  // 軽量WebP派生版。原本ファイル名・godIdが一致しているため機械的に導出できる。
  keyvisual: `/assets/gods/${id}/keyvisual.webp`,
})

/**
 * 七柱の定義（決定18：SGG Creator Kit採用、決定20：性格・世界観）。
 *
 * 名前・素材は公式二次創作素材「SGG Creator Kit v1」に準拠。
 * 性格は、各OTOMOの名前（例：小槌→大黒天、百勝→毘沙門天）とビジュアルから
 * 読み取れる伝統的な「七福神」モチーフを軸に決定した（決定20）。
 * `motif` は設計ドキュメント用の対応関係メモで、UIには表示しない。
 */
export const GODS: GodDef[] = [
  {
    id: GOD_IDS.ebisu,
    nameJa: '恵比寿',
    nameEn: 'EBISU',
    name: '恵比寿',
    art: art('ebisu'),
    otomoId: OTOMO_IDS.taimaru,
    // 大漁の一撃。素朴に強い、恵比寿らしいご機嫌な一撃
    resonanceEffects: EBISU_RESONANCE_EFFECTS,
    motif: '恵比寿：無邪気で食いしん坊、遊び好きの悪ガキ。海と釣りが大好きで常に上機嫌',
    tagline: '今日も上機嫌、明日はもっと大漁',
    archetype: 'attack',
  },
  {
    id: GOD_IDS.taiyo,
    nameJa: '大耀',
    nameEn: 'TAIYO',
    name: '大耀',
    art: art('taiyo'),
    otomoId: OTOMO_IDS.kozuchi,
    // 玉砕上等の一撃。7神最大の純ダメージ一本（B'：旧score170を火力へ集約、
    // 神技「爆発」＝1R最大火力と完全整合）
    resonanceEffects: [
      { kind: 'damage', target: 'enemy', amount: 36 },
    ],
    motif: '大黒天：戦いを楽しむ豪快な戦術家肌。後輩思いの姉御肌',
    tagline: '退屈より、玉砕上等',
    archetype: 'attack',
  },
  {
    id: GOD_IDS.sobi,
    nameJa: '蒼毘',
    nameEn: 'SOBI',
    name: '蒼毘',
    art: art('sobi'),
    otomoId: OTOMO_IDS.momokatsu,
    // 盾となる一撃。攻めながらも自らブロックを構え、守りを固める
    // （決定26：当初ダメージ15だったが、防御偏重プレイでの火力不足が
    // 判明したため21に引き上げ。blockは維持し「守りながら攻める」路線は継続）
    resonanceEffects: [
      { kind: 'damage', target: 'enemy', amount: 21 },
      { kind: 'block', amount: 20 },
    ],
    motif: '毘沙門天：寡黙で実直な守護者。仲間のためなら一歩も引かない硬派な武人',
    tagline: '誓いは違えぬ、盾となろう',
    archetype: 'defense',
  },
  {
    id: GOD_IDS.saika,
    nameJa: '才華',
    nameEn: 'SAIKA',
    name: '才華',
    art: art('saika'),
    otomoId: OTOMO_IDS.kotone,
    // アンコールの一撃。ダメージは控えめに、代わりに次の見せ場（手札・神力）を呼び込む。
    // B'：旧score170は補償なしで削除（旧oracle/score優位がランキング偏重の主因だった
    // ため。才華の個性は手数エンジンで既に十分＝決定108・F1で実証）
    resonanceEffects: [
      { kind: 'damage', target: 'enemy', amount: 12 },
      { kind: 'draw', amount: 2 },
      { kind: 'gainAp', amount: 2 },
    ],
    motif: '弁財天：天性のパフォーマー。目立つこと・魅せることが何より好き',
    tagline: '魅せてなんぼ、輝いてなんぼ',
    archetype: 'technique',
  },
  {
    id: GOD_IDS.juraku,
    nameJa: '寿楽',
    nameEn: 'JURAKU',
    name: '寿楽',
    art: art('juraku'),
    otomoId: OTOMO_IDS.juka,
    // 悪戯の一撃。ダメージに加え、敵の攻撃力を封じて長期戦を有利にする
    // （決定26：当初ダメージ18だったが、防御偏重プレイでの火力不足が
    // 判明したため23に引き上げ。debuffは維持し「封じて削る」路線は継続）
    resonanceEffects: [
      { kind: 'damage', target: 'enemy', amount: 23 },
      { kind: 'debuff', target: 'enemy', stat: 'atk', amount: 6, rounds: 3 },
    ],
    motif: '寿老人：長い年月を経た悪戯好きの老獪、されど中身は子供のように無邪気',
    tagline: '長生きの秘訣？　楽しむことさ',
    archetype: 'balance',
  },
  {
    id: GOD_IDS.fukuei,
    nameJa: '福永',
    nameEn: 'FUKUEI',
    name: '福永',
    art: art('fukuei'),
    otomoId: OTOMO_IDS.haku,
    // 幸運を掴む一撃。危険を恐れず攻め込みつつ、掴んだ幸運が身を守る
    // B'：旧score170を「窮地からの反撃資源」（gainAp1）へ置換（逆転の神）
    resonanceEffects: [
      { kind: 'damage', target: 'enemy', amount: 22 },
      { kind: 'heal', amount: 6 },
      { kind: 'gainAp', amount: 1 },
    ],
    motif: '福禄寿：怖いもの知らずの冒険家。幸運は自分から掴みにいく主義',
    tagline: '幸運は、待たずに掴みにいく',
    archetype: 'attack',
  },
  {
    id: GOD_IDS.shouren,
    nameJa: '笑蓮',
    nameEn: 'SHOUREN',
    name: '笑蓮',
    art: art('shouren'),
    otomoId: OTOMO_IDS.shofuku,
    // 包み込む一撃。ダメージは控えめに、代わりにHPとブロックをたっぷり配る
    // （決定26：当初ダメージ10だったが、笑蓮の火力不足による全戦略未撃破が
    // 判明したため21に引き上げ。B'：旧score150をheal/block強化へ振替え、
    // 「支援特化」路線を維持）
    resonanceEffects: [
      { kind: 'damage', target: 'enemy', amount: 21 },
      { kind: 'heal', amount: 12 },
      { kind: 'block', amount: 12 },
    ],
    motif: '布袋：おおらかで面倒見のいい姉貴分。細かいことは気にせず誰でも受け入れる',
    tagline: '細かいことは、まあいいじゃない',
    archetype: 'support',
  },
]

const GOD_BY_ID = new Map<GodId, GodDef>(GODS.map((g) => [g.id, g]))

export function getGodDef(id: GodId): GodDef {
  const def = GOD_BY_ID.get(id)
  if (!def) {
    throw new Error(`神の定義が見つかりません: ${id}`)
  }
  return def
}

/** MVPで固定する神（決定16・18） */
export const DEFAULT_GOD_ID: GodId = GOD_IDS.ebisu
