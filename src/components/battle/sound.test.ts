import { describe, expect, it } from 'vitest'
import { SE_BASE_PATH, SE_NAMES } from './sound'

/**
 * 決定128：SE 音源のマニフェスト検証。`scripts/gen-se.mjs` が生成した WAV が
 * `public/assets/se/` に全て存在し、コード側の SE 名と1対1で対応することを保証する
 * （node:fs は app 側 tsconfig に無いため Vite の glob で列挙する）。
 */
describe('SE assets (決定128)', () => {
  it('ships a wav for every SE name and has no orphan files', () => {
    const shipped = Object.keys(import.meta.glob('../../../public/assets/se/*.wav')).map((k) => k.split('/').pop()!.replace('.wav', ''))
    for (const name of SE_NAMES) expect(shipped, `missing ${name}.wav`).toContain(name)
    for (const file of shipped) expect(SE_NAMES as string[], `orphan ${file}.wav`).toContain(file)
    expect(SE_BASE_PATH).toBe('/assets/se/')
  })

  it('keeps the SE set small (no bloat): 20 files', () => {
    expect(SE_NAMES).toHaveLength(20)
    expect(new Set(SE_NAMES).size).toBe(SE_NAMES.length)
  })
})

describe('決定224：条件⚡の音は既存音源の加工（新規 SE 0）', () => {
  it('既存の reward を高いピッチで使い、SE の数は増えない', async () => {
    const { BONUS_PAYOFF_SE, SE_NAMES: names } = await import('./sound')
    expect(names).toContain(BONUS_PAYOFF_SE.name)
    expect(BONUS_PAYOFF_SE.name).toBe('reward')
    expect(BONUS_PAYOFF_SE.rate).toBeGreaterThan(1)
    expect(names).toHaveLength(20)
  })
})
