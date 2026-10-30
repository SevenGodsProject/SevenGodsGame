import type { GameMode, GameState, GameStatus } from '../../core/types'

/**
 * 決定196（Solve Loop v1）：再戦の意味を 1 か所で決める純関数。
 *
 * ## なぜ必要か
 *
 * 通常戦で負けたあと、結果画面の「次の目標」は N1「○○を撃破する」と出る。
 * ところが押した先は新しい seed だったため、初期手札と山札の並びが入れ替わり、
 * **敗因を検証する前に問題そのものが差し替わっていた**（決定195 §8）。
 * これでは
 *
 *   Failure → Observation → Hypothesis → Same-condition Retry → Learning → Solve
 *
 * のうち Hypothesis と Retry が繋がらない。
 *
 * ## 規則
 *
 * - **通常戦で敗北・未撃破**（`lost` / `finished`）→ **同じ盤面**（同じ seed）で再戦する
 * - **勝利** → 従来どおり新しい seed。勝った盤面を固定して反復させない
 * - **神域挑戦（Daily）** → `startDailyGame` の既存経路のまま。seed の意味論には一切触れない
 *   （同日共有 seed・1日3回・JSTリセット。決定196 はここを変更しない）
 *
 * 「敗北のときだけ」に限ったのは、同じ盤面の固定が学習のためであって作業のためではないから。
 * 勝てばその盤面は解けている＝次は新しい問題に進む、という往復で暗記化は自然に終わる。
 *
 * 逃げ道は既存の出口がそのまま持っている：「デッキを調整」「神・デッキを選び直す」は
 * どちらも新しい seed で始まるため、詰んだ盤面に閉じ込められることはない。
 */
export type RematchContext = {
  /** 省略（undefined）は決定29以前の旧セーブ由来＝通常モードとして扱う */
  mode: GameMode | undefined
  status: GameStatus
}

/** この決着からの再戦を「同じ盤面（同じ seed）」にするか */
export function isSameBoardRematch(ctx: RematchContext): boolean {
  if ((ctx.mode ?? 'normal') !== 'normal') return false
  return ctx.status === 'lost' || ctx.status === 'finished'
}

/**
 * 再戦で引き継ぐ seed。`undefined` を返したときは呼び出し側が従来どおり
 * 新しい seed を発行する（＝勝利後・神域挑戦は現行挙動のまま）。
 */
export function resolveRematchSeed(ctx: RematchContext & { seed: string }): string | undefined {
  return isSameBoardRematch(ctx) ? ctx.seed : undefined
}

/**
 * v1.0.5 Stage B（同じ盤面 Retry の前回比・AI 判断）：結果画面に「前回 → 今回」を 1 行だけ出すための純関数。
 *
 * ## 比較してよい条件（どれか 1 つでも違えば比較しない＝null）
 *
 * 「同じ盤面」は seed だけでは決まらない。「続きから」の再開は GameFlow のデッキを保存済みの
 * 好み（`loadDeckPreference`）から読み直すため、同じ seed のまま別のデッキで再戦し得る。
 * そこで決着時の state そのものから鍵を作る：seed・mode・神・敵・難易度・神階・神階の選択・
 * OTOMO の成長経路・**開始時のデッキの並び**（山札＋手札＋捨て札＋除外を uid `c{入力時の位置}` の順に並べ直したもの。
 * engine がカードを作るのは開始時の `buildDeckInstances(action.deck)` だけで、シャッフルは入力の並びに対して行うため、
 * 構成が同じでも並びが違えば別の盤面になる＝構成ではなく並びで比べる）。
 * engine は決定論的なので、この鍵が一致すれば開始盤面も一致する。
 *
 * ## 保存しない
 *
 * 前回の結果は GameFlow の React state にだけ持つ（storage・save v9・src/core は不変）。
 * ブラウザを更新すれば消える＝確かめられない比較は出さない。
 */
export type SameBoardSource = Pick<
  GameState,
  'seed' | 'mode' | 'godId' | 'difficulty' | 'stake' | 'stakeChoice' | 'otomoGrowthPath' | 'status' | 'round' | 'deck' | 'hand' | 'discard' | 'exhausted'
> & { enemy: Pick<GameState['enemy'], 'defId' | 'hp' | 'maxHp'> }

/** この盤面での直近の敗北・未撃破。`count` はこの盤面で終えた対局の数 */
export type SameBoardMemo = {
  key: string
  count: number
  status: 'lost' | 'finished'
  round: number
  enemyHpPct: number
}

export function sameBoardKey(s: SameBoardSource): string {
  const index = (uid: string) => Number(uid.slice(1))
  const cards = [...s.deck, ...s.hand, ...s.discard, ...s.exhausted].sort((a, b) => index(a.uid) - index(b.uid)).map((c) => c.defId)
  return JSON.stringify([s.seed, s.mode ?? 'normal', s.godId, s.enemy.defId, s.difficulty, s.stake ?? 0, s.stakeChoice ?? null, s.otomoGrowthPath, cards])
}

/** 敵の残り HP の割合（切り上げ＝残っているのに 0% と出さない） */
function enemyHpPct(s: SameBoardSource): number {
  return Math.ceil((Math.max(0, s.enemy.hp) / s.enemy.maxHp) * 100)
}

/**
 * 「同じ盤面でもう一度」を押した時点の memo。同じ盤面の続きなら count を進め、そうでなければ 1 から。
 * 勝利・神域挑戦など同じ盤面で再戦しない決着では null（＝前回比を出さない）
 */
export function nextSameBoardMemo(s: SameBoardSource, prev: SameBoardMemo | null): SameBoardMemo | null {
  if (!isSameBoardRematch({ mode: s.mode, status: s.status })) return null
  if (s.status !== 'lost' && s.status !== 'finished') return null
  const key = sameBoardKey(s)
  return { key, count: prev && prev.key === key ? prev.count + 1 : 1, status: s.status, round: s.round, enemyHpPct: enemyHpPct(s) }
}

const outcomeText = (status: GameStatus, round: number): string => (status === 'finished' ? '7R 終了' : `R${round}で敗北`)

/** 結果画面の 1 行。同じ盤面と確かめられないとき・進行中は null（誤解を招く数値を出さない） */
export function describeSameBoardDiff(memo: SameBoardMemo | null, s: SameBoardSource): string | null {
  if (!memo || s.status === 'playing') return null
  if ((s.mode ?? 'normal') !== 'normal' || sameBoardKey(s) !== memo.key) return null
  const head = `同じ盤面 ${memo.count + 1} 回目：前回 ${outcomeText(memo.status, memo.round)}・敵HP ${memo.enemyHpPct}%`
  return s.status === 'won' ? `${head} → 今回 R${s.round}で撃破` : `${head} → 今回 ${outcomeText(s.status, s.round)}・敵HP ${enemyHpPct(s)}%`
}
