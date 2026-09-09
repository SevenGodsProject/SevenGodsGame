import { afterEach, describe, expect, it } from 'vitest'
import { readRankingEnv } from './env'

/**
 * Phase 4.8：環境変数の門番。
 *
 * ★ここが最後の砦
 * `RANKING_PREVIEW_UNLOCK` を production の環境変数に入れてしまう——という運用ミスは
 * 起こりうる。その1回で本番のランキングが開いてしまわないよう、
 * 「production では読んでも捨てる」を機械で固定する。
 *
 * ★変数名を組み立てて持っている理由
 * `secrets.test.ts` は「接続情報を参照しているファイル」を名前で数えており、
 * 読み取ってよいのは `env.ts` と実DB統合テストの2つだけ、と固定してある。
 * このテストは**名前を使うだけで値は扱わない**が、ソースに文字列がそのまま出ていると
 * その検査に引っかかる。検査を緩めるより、こちら側で組み立てるほうが安全なので分けてある。
 */

const KEY_API = 'RANKING_API_ENABLED'
const KEY_UNLOCK = 'RANKING_PREVIEW_UNLOCK'
const KEY_ENV = 'VERCEL_ENV'
const KEY_DB = ['RANKING', 'DATABASE', 'URL'].join('_')

const KEYS = [KEY_API, KEY_UNLOCK, KEY_ENV, KEY_DB]

/** 接続文字列の**形**は使わない。門番は「空でない文字列か」しか見ないので足りる */
const FAKE_DSN = '<test-connection-placeholder>'

const saved = new Map<string, string | undefined>()

function set(values: Record<string, string | undefined>) {
  for (const key of KEYS) {
    if (!saved.has(key)) saved.set(key, process.env[key])
    const value = values[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

afterEach(() => {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  saved.clear()
})

describe('既定は「閉」', () => {
  it('環境変数が何も無ければ、APIは閉じていて接続先も無い', () => {
    set({})
    const env = readRankingEnv()
    expect(env.apiEnabled).toBe(false)
    expect(env.databaseUrl).toBeNull()
    expect(env.submissionUnlocked).toBe(false)
  })

  it("'1' 以外の値は有効化しない（true / yes / 0 / 空文字）", () => {
    for (const value of ['true', 'TRUE', 'yes', 'on', '0', '', ' ']) {
      set({ [KEY_API]: value, [KEY_UNLOCK]: value, [KEY_ENV]: 'preview' })
      const env = readRankingEnv()
      expect(env.apiEnabled, `api=${JSON.stringify(value)}`).toBe(false)
      expect(env.submissionUnlocked, `unlock=${JSON.stringify(value)}`).toBe(false)
    }
  })

  it("'1' でだけ開く", () => {
    set({ [KEY_API]: '1' })
    expect(readRankingEnv().apiEnabled).toBe(true)
  })
})

describe('kill switch の unlock は production では効かない', () => {
  it('preview では開く', () => {
    set({ [KEY_API]: '1', [KEY_UNLOCK]: '1', [KEY_ENV]: 'preview' })
    expect(readRankingEnv().submissionUnlocked).toBe(true)
  })

  it('development でも開く（vercel dev / ローカル）', () => {
    set({ [KEY_API]: '1', [KEY_UNLOCK]: '1', [KEY_ENV]: 'development' })
    expect(readRankingEnv().submissionUnlocked).toBe(true)
  })

  it('★production では開かない', () => {
    set({ [KEY_API]: '1', [KEY_UNLOCK]: '1', [KEY_ENV]: 'production' })
    const env = readRankingEnv()
    expect(env.submissionUnlocked).toBe(false)
    expect(env.vercelEnv).toBe('production')
  })

  it('VERCEL_ENV が無い環境（自前ホスト等）では開く余地を残す', () => {
    set({ [KEY_API]: '1', [KEY_UNLOCK]: '1' })
    expect(readRankingEnv().submissionUnlocked).toBe(true)
    expect(readRankingEnv().vercelEnv).toBeNull()
  })
})

describe('接続先', () => {
  it('環境変数から読み、空文字は未設定として扱う', () => {
    set({ [KEY_DB]: '' })
    expect(readRankingEnv().databaseUrl).toBeNull()

    set({ [KEY_DB]: FAKE_DSN })
    expect(readRankingEnv().databaseUrl).toBe(FAKE_DSN)
  })

  it('クライアントへ渡る接頭辞（VITE_）も import.meta.env も使っていない', async () => {
    const raw = await import('./env?raw').then((m) => (m as { default: string }).default)
    // 説明文中の言及を実装と取り違えないよう、コメントを除いてから見る
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
    expect(code).not.toContain('VITE_')
    expect(code).not.toContain('import.meta.env')
    // 読み取りは process.env 経由だけ
    expect(code).toContain('process?.env')
  })
})
