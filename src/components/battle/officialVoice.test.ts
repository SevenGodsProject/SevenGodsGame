/// <reference types="node" />
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import battleScreenSrc from './BattleScreen.tsx?raw'
import { SE_GAIN, VOICE_LAYER } from './feelTier'
import { OFFICIAL_VOICES, SE_NAMES, VOICE_BASE_PATH, hasOfficialVoice, isSoundMuted, playVoice, setSoundMuted, stopVoice } from './sound'

/**
 * Official Voice Pilot v1（SGG Creator Kit v1.1 公式ボイス・大耀「あいさつ」1 本）の契約。
 * docs/OFFICIAL_VOICE_PILOT_V1.md §2〜§4。実際に鳴ること・duck の実測は Playwright／Human QA が担当する。
 */

/** Kit MCP `get_voice`（2026-10-09）が返した原本の sha256。配信ファイルは無改変＝この値と一致しなければならない */
const KIT_SHA256 = {
  'taiyo/greeting.mp3': 'cdb5d44c6b0c48d7a676f11b2d69a4d4dbb69e0f90abb1efd143ba2264aba3cc',
} as const

/** コメントを除いたソース（コメント中の説明語で誤検出しない） */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

afterEach(() => {
  setSoundMuted(false)
  stopVoice()
})

describe('配信ファイル（Kit 原本の無改変配信）', () => {
  it('登録した公式ボイスは全て public/assets/voice に存在し、孤児ファイルが無い', () => {
    const shipped = Object.keys(import.meta.glob('../../../public/assets/voice/**/*.mp3')).map((k) => k.split('/assets/voice/')[1]!)
    const registered: string[] = []
    for (const god of Object.keys(OFFICIAL_VOICES)) for (const path of Object.values(OFFICIAL_VOICES[god]!)) registered.push(path)
    for (const p of registered) expect(shipped, `missing ${p}`).toContain(p)
    for (const f of shipped) expect(registered, `orphan ${f}`).toContain(f)
    expect(VOICE_BASE_PATH).toBe('/assets/voice/')
  })

  it('配信ファイルの sha256 は Kit MCP get_voice の値と一致する（加工 0）', () => {
    for (const [path, sha] of Object.entries(KIT_SHA256)) {
      const file = fileURLToPath(new URL(`../../../public/assets/voice/${path}`, import.meta.url))
      expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(sha)
    }
  })

  it('Pilot v1 の範囲は大耀「あいさつ」1 本だけ（7 神展開は別 Gate）', () => {
    const entries = Object.entries(OFFICIAL_VOICES).flatMap(([god, scenes]) => Object.keys(scenes).map((scene) => `${god}:${scene}`))
    expect(entries).toEqual(['taiyo:greeting'])
    expect(hasOfficialVoice('taiyo', 'greeting')).toBe(true)
    expect(hasOfficialVoice('taiyo', 'success')).toBe(false)
    expect(hasOfficialVoice('ebisu', 'greeting')).toBe(false)
    expect(hasOfficialVoice('nobody', 'greeting')).toBe(false)
  })

  it('SE の集合は増えない（ボイスは SeName ではなく別経路）', () => {
    expect(SE_NAMES).toHaveLength(22)
    expect(SE_NAMES as string[]).not.toContain('voice')
  })
})

describe('音量とミュート', () => {
  it('ボイスの実効音量は神の一撃の着弾（impact[4]）未満・Feedback より大きく、1.0 を超えない', () => {
    const voice = VOICE_LAYER.gain * SE_GAIN.master
    expect(voice).toBeLessThan(SE_GAIN.impact[4] * SE_GAIN.master)
    expect(voice).toBeGreaterThan(SE_GAIN.feedback * SE_GAIN.master)
    expect(voice).toBeLessThanOrEqual(1)
    expect(VOICE_LAYER.duckTailMs).toBeGreaterThan(0)
    expect(VOICE_LAYER.lateDropMs).toBeGreaterThanOrEqual(1000)
  })

  it('ミュート中は playVoice が false を返し、何も始めない', () => {
    setSoundMuted(true)
    expect(isSoundMuted()).toBe(true)
    let started = 0
    expect(playVoice('taiyo', 'greeting', { onStart: () => started++ })).toBe(false)
    expect(started).toBe(0)
  })

  it('配信していない神・場面は false（例外を出さない）', () => {
    expect(playVoice('ebisu', 'greeting')).toBe(false)
    expect(playVoice('taiyo', 'crisis')).toBe(false)
    expect(() => stopVoice()).not.toThrow()
  })
})

describe('配線（BattleScreen）', () => {
  const src = code(battleScreenSrc)

  it('入口の間に preloadVoice を 1 回、入口の終わり（handleEntranceDone）で playVoice を 1 回だけ呼ぶ', () => {
    expect(src.match(/preloadVoice\(/g)).toHaveLength(1)
    expect(src.match(/playVoice\(/g)).toHaveLength(1)
    const cb = src.indexOf('const handleEntranceDone = useCallback(')
    const play = src.indexOf('playVoice(')
    const cbEnd = src.indexOf('}, [])', cb)
    expect(cb).toBeGreaterThan(0)
    expect(play).toBeGreaterThan(cb)
    expect(play).toBeLessThan(cbEnd)
    expect(src.slice(cb, cbEnd)).toContain("'greeting'")
  })

  it('ボイスの間だけ BGM を duck する（決定257 の duckBgm を流用・新しい経路を作らない）', () => {
    expect(src).toMatch(/onStart:\s*\(ms\)\s*=>\s*duckBgm\(ms \+ VOICE_LAYER\.duckTailMs\)/)
  })

  it('戦闘画面を離れるときに stopVoice する（鳴り続けない）', () => {
    expect(src.match(/stopVoice\(\)/g)).toHaveLength(1)
    expect(src).toMatch(/useEffect\(\(\) => \(\) => stopVoice\(\), \[\]\)/)
  })
})
