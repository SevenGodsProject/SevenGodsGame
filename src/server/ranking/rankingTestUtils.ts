import { derivePlayerId } from './identity'
import { startRun } from './start'
import type { RankingStore } from './store'
import { RULES } from './deps'

/**
 * Phase 4.6：ランキングのテスト用ヘルパー。**本番コードからは参照されない**
 * （`index.ts` から到達しないので、境界テストのクロール対象にも入らない）。
 *
 * ★ここに置く理由
 * Phase 4.6 から、提出には「秘密」と「ticket」の2つが要る。各テストがそれぞれ
 * 自前で秘密を組み立てると、`playerId = SHA-256(secret)` という約束をテスト側で
 * 二重実装することになり、いつか本番とずれる。導出は必ず本番の `derivePlayerId` を通す。
 *
 * ★ここで作る秘密は本物の秘密ではない
 * `seed` 文字列を16進へ展開しただけの**決定論的なダミー**。乱数を使わないので、
 * テストが失敗したときに同じ値で再現できる。実運用の秘密は端末の `crypto` が作る。
 */

export type TestIdentity = { playerId: string; playerSecret: string }

/** 決定論的なダミー秘密（16進64桁）。同じ seed からは必ず同じ identity になる */
export async function makeIdentity(seed: string): Promise<TestIdentity> {
  let hex = ''
  for (let i = 0; hex.length < RULES.ranking.playerSecretLength; i++) {
    hex += (seed.charCodeAt(i % seed.length) + i).toString(16).padStart(2, '0')
  }
  const playerSecret = hex.slice(0, RULES.ranking.playerSecretLength)
  return { playerId: await derivePlayerId(playerSecret), playerSecret }
}

/** 16進32桁の `clientRunId`（テスト内で読みやすいように連番から作る） */
export function runId(n: number | string): string {
  const text = String(n)
  let hex = ''
  for (let i = 0; hex.length < 32; i++) {
    hex += (text.charCodeAt(i % text.length) * (i + 7)).toString(16).padStart(2, '0')
  }
  return hex.slice(0, 32)
}

/**
 * 挑戦枠を1つ取る。テストの前提を整えるためのショートカットで、
 * 中身は本番と同じ `startRun` を呼ぶだけ（テスト用の抜け道を作らない）。
 */
export async function issueTicket(
  identity: TestIdentity,
  clientRunId: string,
  deps: { store: RankingStore; now: number; gameVersion?: string },
) {
  const result = await startRun({ ...identity, clientRunId }, deps)
  if (!result.ok) throw new Error(`ticketを発行できませんでした: ${result.code}`)
  return result
}
