import { godId, otomoId } from '../types/ids'
import type { Effect, OtomoDef, OtomoForm, OtomoId } from '../types'

export const OTOMO_IDS = {
  taimaru: otomoId('taimaru'),
  kozuchi: otomoId('kozuchi'),
  momokatsu: otomoId('momokatsu'),
  kotone: otomoId('kotone'),
  juka: otomoId('juka'),
  haku: otomoId('haku'),
  shofuku: otomoId('shofuku'),
} as const

const art = (id: string) => ({
  spirit: `/assets/otomo/${id}/spirit.webp`,
  incarnate: `/assets/otomo/${id}/incarnate.webp`,
  doji: `/assets/otomo/${id}/doji.webp`,
})

/**
 * 形態ごとの共鳴発動時追加効果（決定19、決定23で神ごとに個性化）。
 *
 * 決定9と同じ方針は維持しつつ、決定20の性格・世界観に合わせて
 * OTOMOごとに異なる`effectsByForm`を持たせた。共通するのは
 * spiritがまだ何も貢献しない「素の状態」であること、
 * incarnate・dojiで段階的に強くなること、神の一撃に対して
 * OTOMOは「プレイヤーを守る／支える」役割を持つこと。
 * 鯛丸（恵比寿専属）は自動シミュレーターの基準そのものなので値を変えていない。
 */
const TAIMARU_EFFECTS_BY_FORM: Record<OtomoForm, Effect[]> = {
  spirit: [],
  incarnate: [{ kind: 'heal', amount: 5 }],
  doji: [
    { kind: 'heal', amount: 5 },
    { kind: 'block', amount: 8 },
  ],
}

/**
 * 決定44：力の絆（守りの絆＝`effectsByForm`の代替パス）。
 *
 * バトル開始前に選ぶ、共鳴発動時追加効果の「攻め寄り」の方向性。
 * 恵比寿は自動シミュレーターの基準（守りの絆）を変えない方針は維持しつつ、
 * こちらは新規の代替パスなので値を変更してよい。「大漁」らしく、
 * 引き（draw）と神力（gainAp）で次の一手を呼び込む方向にした。
 * 全OTOMO共通で、既存の`effectsByForm`と比べて控えめな数値にしてある
 * （新規の未検証パスのため、強すぎるより弱すぎる方を選んだ。決定21・26と
 * 同じ「仮値、実プレイでの調整が前提」の方針）。
 */
const TAIMARU_POWER_PATH_EFFECTS_BY_FORM: Record<OtomoForm, Effect[]> = {
  spirit: [],
  incarnate: [{ kind: 'draw', amount: 1 }],
  doji: [
    { kind: 'draw', amount: 1 },
    { kind: 'gainAp', amount: 1 },
  ],
}

/**
 * OTOMO の定義（決定18：SGG Creator Kit採用）。
 *
 * 旧仕様（プレイヤーが3体を編成するロースター）から変更。
 * Kit実物は「神1柱につき専属OTOMOが1体、3形態」という構造だったため、
 * 神を選んだ時点でOTOMOも1体自動的に決まる方式にしました。
 *
 * 決定23で、神ごとに異なる `effectsByForm` を個別に持たせた
 * （鯛丸のみ自動シミュレーターの基準値のため据え置き）。
 */
export const OTOMOS: OtomoDef[] = [
  {
    id: OTOMO_IDS.taimaru,
    godId: godId('ebisu'),
    nameJa: '鯛丸',
    nameEn: 'TAIMARU',
    name: '鯛丸',
    art: art('taimaru'),
    effectsByForm: TAIMARU_EFFECTS_BY_FORM,
    powerPathEffectsByForm: TAIMARU_POWER_PATH_EFFECTS_BY_FORM,
  },
  {
    id: OTOMO_IDS.kozuchi,
    godId: godId('taiyo'),
    nameJa: '小槌',
    nameEn: 'KOZUCHI',
    name: '小槌',
    art: art('kozuchi'),
    // 打ち出の小槌：一振りで自らの攻撃力を底上げする攻めのお供
    effectsByForm: {
      spirit: [],
      incarnate: [{ kind: 'buff', target: 'self', stat: 'atk', amount: 3, rounds: 2 }],
      doji: [
        { kind: 'buff', target: 'self', stat: 'atk', amount: 3, rounds: 2 },
        { kind: 'block', amount: 10 },
      ],
    },
    // 決定44・力の絆：既存の攻め型に対し、こちらは「堅守型」で対比を作る
    powerPathEffectsByForm: {
      spirit: [],
      incarnate: [{ kind: 'block', amount: 8 }],
      doji: [
        { kind: 'block', amount: 8 },
        { kind: 'heal', amount: 5 },
      ],
    },
  },
  {
    id: OTOMO_IDS.momokatsu,
    godId: godId('sobi'),
    nameJa: '百勝',
    nameEn: 'MOMOKATSU',
    name: '百勝',
    art: art('momokatsu'),
    // 毘沙門天のお供らしく、盾を厚く構える守りのスペシャリスト
    effectsByForm: {
      spirit: [],
      incarnate: [{ kind: 'block', amount: 10 }],
      doji: [
        { kind: 'block', amount: 10 },
        { kind: 'heal', amount: 6 },
      ],
    },
    // 決定44・力の絆：「先陣型」。寡黙な守護者が、あえて前に出て道を切り開く
    powerPathEffectsByForm: {
      spirit: [],
      incarnate: [{ kind: 'damage', target: 'enemy', amount: 5 }],
      doji: [
        { kind: 'damage', target: 'enemy', amount: 5 },
        { kind: 'buff', target: 'self', stat: 'atk', amount: 2, rounds: 2 },
      ],
    },
  },
  {
    id: OTOMO_IDS.kotone,
    godId: godId('saika'),
    nameJa: '琴音',
    nameEn: 'KOTONE',
    name: '琴音',
    art: art('kotone'),
    // 琵琶の音色が次の一手を呼び込む、コンボ志向のお供
    effectsByForm: {
      spirit: [],
      incarnate: [{ kind: 'draw', amount: 1 }],
      doji: [
        { kind: 'draw', amount: 1 },
        { kind: 'gainAp', amount: 2 },
      ],
    },
    // 決定44・力の絆：「魅了型」。魅せることが好きな性格そのままに、
    // 華やかな一撃と敵の勢いを削ぐパフォーマンスで魅せる
    powerPathEffectsByForm: {
      spirit: [],
      incarnate: [{ kind: 'damage', target: 'enemy', amount: 5 }],
      doji: [
        { kind: 'damage', target: 'enemy', amount: 5 },
        { kind: 'debuff', target: 'enemy', stat: 'atk', amount: 2, rounds: 2 },
      ],
    },
  },
  {
    id: OTOMO_IDS.juka,
    godId: godId('juraku'),
    nameJa: '寿鹿',
    nameEn: 'JUKA',
    name: '寿鹿',
    art: art('juka'),
    // 長生きの知恵：じわじわ守りを固め、最後は敵の勢いを削ぐ
    effectsByForm: {
      spirit: [],
      incarnate: [
        { kind: 'heal', amount: 3 },
        { kind: 'block', amount: 3 },
      ],
      doji: [
        { kind: 'heal', amount: 3 },
        { kind: 'block', amount: 3 },
        { kind: 'debuff', target: 'enemy', stat: 'atk', amount: 3, rounds: 2 },
      ],
    },
    // 決定44・力の絆：「悪戯型」。子供のような無邪気さで、じっくりではなく
    // その場のひらめきで次の一手を呼び込む
    powerPathEffectsByForm: {
      spirit: [],
      incarnate: [{ kind: 'damage', target: 'enemy', amount: 4 }],
      doji: [
        { kind: 'damage', target: 'enemy', amount: 4 },
        { kind: 'draw', amount: 1 },
      ],
    },
  },
  {
    id: OTOMO_IDS.haku,
    godId: godId('fukuei'),
    nameJa: 'ハク',
    nameEn: 'HAKU',
    name: 'ハク',
    art: art('haku'),
    // 冒険家のお供らしく、回復に加えて次の一歩（神力・ブロック）を後押しする
    effectsByForm: {
      spirit: [],
      incarnate: [{ kind: 'heal', amount: 5 }],
      doji: [
        { kind: 'heal', amount: 5 },
        { kind: 'gainAp', amount: 1 },
        { kind: 'block', amount: 4 },
      ],
    },
    // 決定44・力の絆：「冒険型」。怖いもの知らずの性格そのままに、
    // 危険を承知で踏み込み、その分の勢いを持ち帰る
    powerPathEffectsByForm: {
      spirit: [],
      incarnate: [{ kind: 'damage', target: 'enemy', amount: 5 }],
      doji: [
        { kind: 'damage', target: 'enemy', amount: 5 },
        { kind: 'gainAp', amount: 1 },
      ],
    },
  },
  {
    id: OTOMO_IDS.shofuku,
    godId: godId('shouren'),
    nameJa: '笑袋',
    nameEn: 'SHOFUKU',
    name: '笑袋',
    art: art('shofuku'),
    // 布袋の袋：面倒見の良さそのままに、たっぷりの回復とブロックを配る
    effectsByForm: {
      spirit: [],
      incarnate: [{ kind: 'heal', amount: 8 }],
      doji: [
        { kind: 'heal', amount: 8 },
        { kind: 'block', amount: 8 },
      ],
    },
    // 決定44・力の絆：「太っ腹型」。STEP-SCORE2-F2（B'）：旧score30はBASE-Dで
    // 無効化され「何も起きないburst」という完全dead効果になっていたため、
    // 他OTOMOの力の絆と同格のdamage5＋おおらかな回復へ置換（F1で発火を実証済み）
    powerPathEffectsByForm: {
      spirit: [],
      incarnate: [{ kind: 'damage', target: 'enemy', amount: 5 }],
      doji: [
        { kind: 'damage', target: 'enemy', amount: 5 },
        { kind: 'heal', amount: 3 },
      ],
    },
  },
]

const OTOMO_BY_ID = new Map<OtomoId, OtomoDef>(OTOMOS.map((o) => [o.id, o]))

export function getOtomoDef(id: OtomoId): OtomoDef {
  const def = OTOMO_BY_ID.get(id)
  if (!def) {
    throw new Error(`OTOMOの定義が見つかりません: ${id}`)
  }
  return def
}
