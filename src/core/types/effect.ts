/**
 * カードや神が引き起こす「効果」の定義。
 *
 * ★ここが拡張性の心臓部です。
 * カードは効果を「部品の組み合わせ」として持ちます。
 * 新しいカードを作るときはこの部品を並べるだけで済み、
 * カードごとに専用のコードを書く必要がありません。
 */

/**
 * 変化させられる能力値。
 *
 * ⚠️ `'atk'`は`round.ts`（敵のatkデバフ→次の攻撃力に反映）と`effects.ts`
 * （プレイヤーのatkバフ→敵へのダメージに反映）の両方で実際に消費されるが、
 * `'def'`は2026-08時点でどのカード・神・OTOMOのデータからも一度も使われて
 * おらず、消費する処理もどこにも無い（決定51で見つかった「buffが保存される
 * だけで一度も読まれていなかった」バグと同じ穴）。新しくカード等で
 * `stat: 'def'`を使うときは、まず`effects.ts`/`round.ts`に対応する消費処理を
 * 追加すること。追加せずにデータだけ作ると、説明文と裏腹に何も起きないカードになる。
 */
export type StatKey = 'atk' | 'def'

/** 効果の対象 */
export type EffectTarget = 'enemy' | 'self'

export type Effect =
  /** ダメージを与える */
  | { kind: 'damage'; target: EffectTarget; amount: number }
  /** ブロック（このラウンドの被ダメージ軽減）を得る */
  | { kind: 'block'; amount: number }
  /** HPを回復する */
  | { kind: 'heal'; amount: number }
  /** 共鳴ゲージを上昇させる */
  | { kind: 'resonance'; amount: number }
  /** カードを引く */
  | { kind: 'draw'; amount: number }
  /** 神力（AP）を得る */
  | { kind: 'gainAp'; amount: number }
  /** 能力値を上げる */
  | { kind: 'buff'; target: EffectTarget; stat: StatKey; amount: number; rounds: number }
  /** 能力値を下げる */
  | { kind: 'debuff'; target: EffectTarget; stat: StatKey; amount: number; rounds: number }
  /** スコアを直接加算する */
  | { kind: 'score'; amount: number }

/**
 * 効果の種類の一覧。
 * Effect に新しい種類を足すと、この型も自動で増えます。
 * 処理を書き忘れているファイルはコンパイルエラーになるため、実装漏れが起きません。
 */
export type EffectKind = Effect['kind']

/** 一定ラウンド続く能力値の変化 */
export type Buff = {
  stat: StatKey
  /** プラスなら強化、マイナスなら弱体化 */
  amount: number
  /** 残りラウンド数 */
  remainingRounds: number
}
