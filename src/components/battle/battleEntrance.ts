import type { EnemyId, GodId } from '../../core/types'
import { getEnemyDef } from '../../core/data/enemies'
import { getGodDef } from '../../core/data/gods'
import { preloadSe } from './sound'

/**
 * 決定254 Game Entry「降臨の間」：Full／Short の選択（セッション変数）と入口素材の先読み。
 * 時刻の定数は BossEntrance.tsx（enemyVfxTiming.ts には置かない）。表示専用・storage 不使用。
 */
export type BattleEntranceVariant = 'full' | 'short'

/**
 * セッション（ページ読み込み）内で Full を出したか。メモリのみ（storage・save・gameVersion に触れない）。
 * 再読み込みで false に戻る＝新しいセッションの最初の 1 戦は Full。
 */
let fullEntranceShownThisSession = false

/** 新規開始 1 回につき 1 回呼ぶ。最初の 1 回だけ 'full'、以後 'short'（skip・reduced でも消費する） */
export function takeBattleEntranceVariant(): BattleEntranceVariant {
  if (fullEntranceShownThisSession) return 'short'
  fullEntranceShownThisSession = true
  return 'full'
}

/** テスト専用：セッション変数を初期化する */
export function resetBattleEntranceSessionForTest(): void {
  fullEntranceShownThisSession = false
}

/**
 * 決定254：入口の素材（神 `front_640`・敵 art・舞台背景・SE 2 本）をデッキ構築／初陣の説明の時点で先読みする。
 * 同じ bytes を戦闘開始より前に取得・decode するだけ（追加転送 0）。失敗しても何も起きない。
 */
export function preloadBattleEntrance(godId: GodId, enemyId: EnemyId | null): void {
  if (typeof Image !== 'undefined') {
    const srcs = [getGodDef(godId).art.front]
    if (enemyId) {
      const def = getEnemyDef(enemyId)
      srcs.push(def.art)
      if (def.stage.bg) srcs.push(def.stage.bg)
    }
    for (const src of srcs) {
      const img = new Image()
      img.src = src
      void img.decode?.().catch(() => undefined)
    }
  }
  preloadSe(['resonance_gain', 'boss_entrance'])
}
