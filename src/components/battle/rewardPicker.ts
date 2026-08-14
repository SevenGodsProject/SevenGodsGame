import type { CardDef } from '../../core/types'

/**
 * 決定43：報酬カードの3択を、`seed`から決定論的に選ぶ（`Math.random`は使わない、
 * 決定不変ルール2の精神を踏襲）。GameStateに影響しない演出用の選択なので
 * coreではなくこの層に置いているが、シード付きの単純なFisher-Yatesで
 * 毎回同じ結果になるようにしている。
 */
export function pickRewardCandidates(pool: CardDef[], seed: string, count: number): CardDef[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }

  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = (hash * 1103515245 + 12345) >>> 0
    const j = hash % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, count)
}
