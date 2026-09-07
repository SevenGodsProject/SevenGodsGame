import type { BattleModifier, Difficulty, EnemyId, GameMode } from '../types'
import { RULES } from './rules'
import { dailyBossFor } from './dailyBoss'

export type DailyStart = {
  mode: GameMode
  dailyKey: string
  enemyId: EnemyId
  seed: string
  difficulty: Difficulty
  modifier: BattleModifier
}

/**
 * DAILY-01：神域挑戦のSTART_GAME材料を日付キーだけから確定する純関数。
 *
 * `resolveStartEnemyId`（通常モード）と違い、URLバックドア`?enemy=`・プレイヤーの
 * 敵選択・難易度選択は**一切参照しない**。全員が同じ敵・同じseed・同じ補正で
 * 戦うことがモードの前提であり、ここで例外を作ると「共通条件」が崩れるため。
 * 引数に`forcedId`等を受け取らない設計そのものが、無効化の実装になっている。
 *
 * Phase 4.1：もとは`src/hooks/startDaily.ts`にあったが、`src/core/replay`
 * （将来サーバー側でも動かすリプレイ検証）から参照する必要が生じたため core へ移した。
 * core が hooks を参照するのは層の逆流になるため、実体をこちらへ置き、
 * `src/hooks/startDaily.ts`は再エクスポートだけを行う薄い互換層として残している
 * （既存の呼び出し元・テスト・Phase 4.0監査ハーネスの import パスは無変更）。
 * 中身・戻り値・Daily seedの導出方式はいずれも変更していない。
 */
export function resolveDailyStart(dailyKey: string): DailyStart {
  const boss = dailyBossFor(dailyKey)
  return {
    mode: 'daily',
    dailyKey,
    enemyId: boss.enemyId,
    seed: boss.seed,
    difficulty: 'normal',
    modifier: { ...RULES.daily.modifier },
  }
}
