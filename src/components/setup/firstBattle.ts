import type { Difficulty, EnemyId, GodId, GrowthPath } from '../../core/types'
import { GOD_IDS } from '../../core/data/gods'
import { ENEMY_IDS } from '../../core/data/enemies'
import { RULES } from '../../core/data/rules'

/**
 * Phase 7 Entrance E1（決定193・仕様 §7）：「初陣へ」で始める最初の 1 戦の構成。
 *
 * 画面導線の既定値であってバランス値ではないため、`src/core/data/rules.ts` ではなく UI 層に置く
 * （`src/core` 差分 0）。デッキは `getRecommendedDeck(godId)`（おすすめ）を開始時に取る。
 *
 * 神と難易度は決定論シミュレーション（`scripts/entrance-e1/firstBattle.audit.ts`、試練の影×おすすめデッキ、
 * 初心者の代理 3 種×300 seed）で決めた：恵比寿は「ふつう」で全条件の勝率 100%・敗北 0、残り HP が上位、
 * 固有の神技が無く覚えることが最少。大耀は守らない代理で 5% 負ける。
 */
export type FirstBattlePreset = {
  godId: GodId
  enemyId: EnemyId
  difficulty: Difficulty
  otomoGrowthPath: GrowthPath
}

export const FIRST_BATTLE_PRESET: FirstBattlePreset = {
  godId: GOD_IDS.ebisu,
  enemyId: ENEMY_IDS.trial,
  difficulty: 'normal',
  otomoGrowthPath: 'guardian',
}

/**
 * 初陣前の短い説明（仕様 §8。3 行・120 字以内）。完全版の「遊び方」はヘッダーの本のアイコンに残す。
 * 共鳴・託宣・OTOMO・スコア・神階・神域挑戦は戦闘画面の表示か初戦後に任せ、ここでは説明しない。
 */
export const FIRST_BATTLE_BRIEF_LINES: readonly string[] = [
  '敵は次の行動を予告します。⚔ の数字が、次に受ける攻撃です。',
  'カード左上の数字が必要な神力です。余った神力は次のラウンドへ持ち越せません。',
  `出し終えたら「ラウンドを終える」。${RULES.totalRounds}ラウンド以内に敵のHPを0にすれば勝利です。`,
]
