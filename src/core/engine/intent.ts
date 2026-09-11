import type { EnemyActionDef } from '../types/index.js'

/**
 * 敵の予告の合計値（charge＝溜めは0）。
 *
 * ★ここが「予告ダメージ」の唯一の定義
 * UIの予告表示（`formatEnemyIntent`）・危険度tier・`ENEMY_INTENT_SET` イベント・
 * カード条件の `blocked` / `enemyBig`（`cardBonus.ts`）・神託「加護」の `blockOfIntent`
 * （`effects.ts`）が、すべてこの値を「予告」として読む。
 * 難易度・Daily・神階の倍率は `nextEnemyAction` が適用済みで、敵へのデバフは
 * **含まない**（デバフは敵ターンの解決時に引かれる。表示もデバフを別枠で出している）。
 * 連撃（multiAttack）は各hitの合計。ブロックは1つのpoolから逐次消費されるので、
 * 合計で見るのが実際の受け方と一致する。
 *
 * Phase 5-D で `round.ts` から移した。`effects.ts` がこれを使う必要が出たが、
 * `round.ts` は `effects.ts` を import しているため、そのままでは循環する。
 * 依存の無いこの小さなモジュールに置き、`round.ts` からは再エクスポートしている。
 */
export function enemyActionTotal(action: EnemyActionDef): number {
  if (action.kind === 'attack' || action.kind === 'special') return action.amount
  if (action.kind === 'multiAttack') return action.hits.reduce((sum, h) => sum + h, 0)
  return 0
}
