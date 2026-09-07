/**
 * DAILY-01：神域挑戦のSTART_GAME材料を日付キーだけから確定する純関数。
 *
 * Phase 4.1で実体を`src/core/data/dailyStart.ts`へ移した（`src/core/replay`が
 * 同じ関数を必要とし、core → hooks の逆流依存を作れないため）。
 * ここは既存の import パス（UI・テスト・Phase 4.0監査ハーネス）を壊さないための
 * 再エクスポートだけを行う。挙動は移動前と完全に同一。
 */
export { resolveDailyStart } from '../core/data/dailyStart'
export type { DailyStart } from '../core/data/dailyStart'
