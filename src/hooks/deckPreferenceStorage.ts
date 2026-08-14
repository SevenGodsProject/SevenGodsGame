import type { CardDefId, GodId } from '../core/types'
import { RULES } from '../core/data/rules'

/**
 * 決定27：神・デッキ構成の永続化（Phase 5の続き）。
 *
 * 保存するのは「最後にバトルを始めた神とデッキ構成」のみで、進行中の
 * GameState（手札・HP・ラウンド等）は含まない。ブラウザを閉じても
 * 次回同じ神を選んだときにデッキ構築画面の初期状態として復元される。
 *
 * 決定不変ルール5（セーブデータには必ずversionを持たせる）に従い、
 * 既存のGameStateと同じ`RULES.saveVersion`を再利用する。将来セーブ形式を
 * 変えるときはこの値を上げれば、古い保存データは自動的に無視される。
 *
 * localStorageはReact側の関心事なので、Phaser/Reactに依存しないcore層
 * ではなくここ（hooks）に置いている（不変ルール1）。
 */

const STORAGE_KEY = 'sevengods.deckPreference'

type SavedDeckPreference = {
  version: number
  godId: GodId
  deck: CardDefId[]
}

function isSavedDeckPreference(value: unknown): value is SavedDeckPreference {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.version === 'number' &&
    typeof v.godId === 'string' &&
    Array.isArray(v.deck) &&
    v.deck.every((id) => typeof id === 'string')
  )
}

/** 神とデッキ構成を保存する。プライベートブラウジング等で失敗しても遊べるよう、例外は握りつぶす */
export function saveDeckPreference(godId: GodId, deck: CardDefId[]): void {
  try {
    const payload: SavedDeckPreference = { version: RULES.saveVersion, godId, deck }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // 保存できなくてもゲーム自体には影響しないため無視する
  }
}

/** 指定した神について保存済みのデッキ構成があれば返す。無ければ/形式が古ければnull */
export function loadDeckPreference(godId: GodId): CardDefId[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isSavedDeckPreference(parsed)) return null
    if (parsed.version !== RULES.saveVersion) return null
    if (parsed.godId !== godId) return null
    return parsed.deck
  } catch {
    return null
  }
}
