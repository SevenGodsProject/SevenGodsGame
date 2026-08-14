import type { CardDefId, GodId } from '../core/types'

/**
 * 決定43：報酬カード（メタ進行）。
 *
 * 勝利後に選んだカードは、その神のデッキ構築で編成上限が
 * `RULES.deckBuilding.maxCopiesPerCard`+1枚まで増える（永続）。
 * デッキ枚数20・専用カード等の既存ルールには一切触れず、「編成の自由度を
 * 少しずつ広げる」形の軽量なメタ進行として設計した。
 *
 * localStorageはReact側の関心事なので、Phaser/Reactに依存しないcore層
 * ではなくここ（hooks）に置いている（不変ルール1）。
 * GameStateやデッキ構成とは別種のデータのため、`RULES.saveVersion`とは
 * 独立した専用のバージョンを持たせる（決定不変ルール5）。
 */

const STORAGE_KEY = 'sevengods.rewardBonuses'
const REWARD_VERSION = 1

type RewardData = {
  version: number
  /** godId -> cardId -> 追加編成上限（+1ずつ積み上がる） */
  bonuses: Record<string, Record<string, number>>
}

function isRewardData(value: unknown): value is RewardData {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.version === 'number' && !!v.bonuses && typeof v.bonuses === 'object'
}

function load(): RewardData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: REWARD_VERSION, bonuses: {} }
    const parsed: unknown = JSON.parse(raw)
    if (!isRewardData(parsed) || parsed.version !== REWARD_VERSION) {
      return { version: REWARD_VERSION, bonuses: {} }
    }
    return parsed
  } catch {
    return { version: REWARD_VERSION, bonuses: {} }
  }
}

function save(data: RewardData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // 保存できなくてもゲーム自体には影響しないため無視する
  }
}

/** その神の、カードごとの追加編成上限（Map化して`deckBuilder.ts`にそのまま渡せる形） */
export function loadRewardBonuses(godId: GodId): Map<CardDefId, number> {
  const data = load()
  const forGod = data.bonuses[godId] ?? {}
  return new Map(Object.entries(forGod) as [CardDefId, number][])
}

/** 報酬カードを1枚選んだ結果を保存する（同じカードを再度選ぶとさらに+1積み上がる） */
export function addRewardBonus(godId: GodId, cardId: CardDefId): void {
  const data = load()
  const forGod = { ...(data.bonuses[godId] ?? {}) }
  forGod[cardId] = (forGod[cardId] ?? 0) + 1
  save({ ...data, bonuses: { ...data.bonuses, [godId]: forGod } })
}
