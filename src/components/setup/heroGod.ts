import type { GodDef, GodId } from '../../core/types'
import { GODS, GOD_IDS } from '../../core/data/gods'
import { HOME_HERO_ART } from './godStyle'

/**
 * Phase 7 Entrance E1（決定193・仕様 §3）：Home の中心に置く神（Hero God）を決める純粋関数。
 *
 * 次の順で最初に成立した神を採る（すべて読み取り済みの値を受け取るだけ。storage・React に依存しない）：
 *   1. 続きの神（`canResume` のときだけ。未知の敵を含む保存では Resume を出さないため採らない）
 *   2. 最後にデッキを確定した神（`loadLastUsedGodId()`）
 *   3. fallback：恵比寿（E1 以前の Home と同じ神）
 * storage 由来の ID は必ず `GODS` に存在するものだけを採る。未知の ID は投げずに次の規則へ落とす。
 */
export const HERO_GOD_FALLBACK: GodId = GOD_IDS.ebisu

export type HeroGodInput = {
  /** `canResume` が true のときの保存の神 ID。Resume を出さないときは null */
  resumeGodId: GodId | null
  /** 最後にデッキを確定した神 ID（無ければ null） */
  lastUsedGodId: GodId | null
}

export type HeroGodSource = 'resume' | 'lastUsed' | 'fallback'

const findGod = (id: GodId | null): GodDef | undefined => (id ? GODS.find((god) => god.id === id) : undefined)

export function selectHeroGod(input: HeroGodInput): { god: GodDef; source: HeroGodSource } {
  const resume = findGod(input.resumeGodId)
  if (resume) return { god: resume, source: 'resume' }
  const lastUsed = findGod(input.lastUsedGodId)
  if (lastUsed) return { god: lastUsed, source: 'lastUsed' }
  return { god: findGod(HERO_GOD_FALLBACK) ?? GODS[0], source: 'fallback' }
}

/**
 * Home の Hero 画像（`HOME_HERO_ART`）。恵比寿は E1 以前の Home と同じ高画質版なので、新規プレイヤーの
 * LCP の素材は変わらない。読み込むのは中心の神の 1 枚だけ。
 */
export function heroImageOf(god: GodDef): { src: string; width: number; height: number; focus: string } {
  const art = HOME_HERO_ART[god.id]
  return { src: art.src, width: art.width, height: art.height, focus: art.focus }
}
