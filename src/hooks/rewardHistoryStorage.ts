import type { CardDefId, GodId } from '../core/types'
import { REWARD_OFFER_SIZE } from '../components/battle/rewardPicker'

/**
 * 決定267：報酬 3 択の提示履歴（メタ進行・神ごと）。
 *
 * - `offered`  … 勝利ごとに「確定時」（選択／見送り）に提示 3 枚を末尾へ追加。直近 2 勝分（6 枚）だけ保持。
 * - `declined` … 「今回は見送る」を選んだときに提示 3 枚を末尾へ追加。直近 2 回分（6 枚）だけ保持。
 *
 * `pickRewardOffer`（`rewardPicker.ts`）が `offered ∪ declined` を除外集合として使い、
 * 「この 3 枚は次の 2 勝では出ません」という見送りボタンの約束を文字どおり守る。
 *
 * `rewardStorage.ts`（決定43）と同じ方針：localStorage は React 側の関心事なので hooks 層に置き
 * （不変ルール1）、GameState とは別種のデータとして独立した version を持つ（不変ルール5）。
 * version 不一致・JSON 壊れ・型不一致は「空で開始」し、保存データは消さない・直さない。
 */

export const REWARD_HISTORY_STORAGE_KEY = 'sevengods.rewardHistory'
export const REWARD_HISTORY_VERSION = 1
/** 「直近 2 勝」＝ 3 枚 × 2。UI／メタ進行の定数でゲームバランス値ではないため rules.ts には置かない */
export const REWARD_HISTORY_WINDOW = REWARD_OFFER_SIZE * 2

export type GodRewardHistory = { offered: CardDefId[]; declined: CardDefId[] }

type RewardHistoryData = {
  version: number
  gods: Record<string, GodRewardHistory>
}

const empty = (): GodRewardHistory => ({ offered: [], declined: [] })

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

function isGodHistory(value: unknown): value is GodRewardHistory {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return isStringArray(v.offered) && isStringArray(v.declined)
}

function isRewardHistoryData(value: unknown): value is RewardHistoryData {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.version !== 'number' || !v.gods || typeof v.gods !== 'object') return false
  return Object.values(v.gods as Record<string, unknown>).every(isGodHistory)
}

function load(): RewardHistoryData {
  try {
    const raw = localStorage.getItem(REWARD_HISTORY_STORAGE_KEY)
    if (!raw) return { version: REWARD_HISTORY_VERSION, gods: {} }
    const parsed: unknown = JSON.parse(raw)
    if (!isRewardHistoryData(parsed) || parsed.version !== REWARD_HISTORY_VERSION) {
      return { version: REWARD_HISTORY_VERSION, gods: {} }
    }
    return parsed
  } catch {
    return { version: REWARD_HISTORY_VERSION, gods: {} }
  }
}

function save(data: RewardHistoryData): void {
  try {
    localStorage.setItem(REWARD_HISTORY_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // 保存できなくても 3 択自体は成立する（反復抑制が効かないだけ）ため無視する
  }
}

/** 純関数：末尾へ追加し、先頭（古い方）から落として `max` 件に揃える（FIFO） */
export function appendFifo<T>(list: T[], items: T[], max: number): T[] {
  const merged = [...list, ...items]
  return merged.length > max ? merged.slice(merged.length - max) : merged
}

/** その神の履歴。無ければ・壊れていれば・version 違いなら空 */
export function loadRewardHistory(godId: GodId): GodRewardHistory {
  const forGod = load().gods[godId]
  if (!forGod) return empty()
  return {
    offered: forGod.offered.slice(-REWARD_HISTORY_WINDOW) as CardDefId[],
    declined: forGod.declined.slice(-REWARD_HISTORY_WINDOW) as CardDefId[],
  }
}

function update(godId: GodId, patch: (h: GodRewardHistory) => GodRewardHistory): void {
  const data = load()
  const current = data.gods[godId] ?? empty()
  save({ ...data, gods: { ...data.gods, [godId]: patch(current) } })
}

/** 報酬の判断が確定した（選択でも見送りでも）ときに、提示された 3 枚を記録する */
export function pushOfferedRewards(godId: GodId, cardIds: CardDefId[]): void {
  update(godId, (h) => ({ ...h, offered: appendFifo(h.offered, cardIds, REWARD_HISTORY_WINDOW) }))
}

/** 「今回は見送る」を選んだときに、提示された 3 枚を記録する */
export function pushDeclinedRewards(godId: GodId, cardIds: CardDefId[]): void {
  update(godId, (h) => ({ ...h, declined: appendFifo(h.declined, cardIds, REWARD_HISTORY_WINDOW) }))
}
