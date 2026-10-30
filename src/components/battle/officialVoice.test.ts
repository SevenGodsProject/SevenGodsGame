/// <reference types="node" />
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import battleScreenSrc from './BattleScreen.tsx?raw'
import crisisVoiceSrc from './crisisVoice.ts?raw'
import { SE_GAIN, SOUND_LAYER, VOICE_LAYER } from './feelTier'
import {
  OFFICIAL_VOICES,
  SE_NAMES,
  VOICE_BASE_PATH,
  getActiveVoiceScene,
  hasOfficialVoice,
  isSoundMuted,
  playVoice,
  releaseVoiceCacheExcept,
  resolveVoiceContention,
  setSoundMuted,
  stopVoice,
  voiceLateDropMs,
  type VoiceScene,
} from './sound'

/**
 * Official Voice Pilot v1（大耀「あいさつ」）＋ Crisis Pilot v1（大耀「ピンチ」）の契約。
 * docs/OFFICIAL_VOICE_PILOT_V1.md §2〜§4・docs/OFFICIAL_VOICE_CRISIS_PILOT_V1.md。
 * 実際に鳴ること・duck の実測は Playwright／Human QA が担当する（この環境に AudioContext は無い）。
 */

/** Kit MCP `get_voice` が返した原本の sha256（greeting 2026-10-09・crisis 2026-10-21）。配信ファイルは無改変＝この値と一致しなければならない */
const KIT_SHA256 = {
  'taiyo/greeting.mp3': 'cdb5d44c6b0c48d7a676f11b2d69a4d4dbb69e0f90abb1efd143ba2264aba3cc',
  'taiyo/crisis.mp3': '3df318eda81d94bf1fdb99ac609026cdb4aa7c873c7ea30e59056d3ca5140098',
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

  it('配信ファイルの sha256 は Kit MCP get_voice の値と一致し、原本（audio-source）と同一バイト列（加工 0）', () => {
    for (const [path, sha] of Object.entries(KIT_SHA256)) {
      const shippedFile = fileURLToPath(new URL(`../../../public/assets/voice/${path}`, import.meta.url))
      expect(createHash('sha256').update(readFileSync(shippedFile)).digest('hex')).toBe(sha)
      const [god, file] = path.split('/') as [string, string]
      const sourceFile = fileURLToPath(new URL(`../../../audio-source/voice/${god}/${god}-${file}`, import.meta.url))
      expect(createHash('sha256').update(readFileSync(sourceFile)).digest('hex')).toBe(sha)
    }
  })

  it('範囲は大耀「あいさつ」＋「ピンチ」の 2 本だけ（7 神展開・success・fatigue は別 Gate）', () => {
    const entries = Object.entries(OFFICIAL_VOICES).flatMap(([god, scenes]) => Object.keys(scenes).map((scene) => `${god}:${scene}`))
    expect(entries).toEqual(['taiyo:greeting', 'taiyo:crisis'])
    expect(Object.keys(KIT_SHA256)).toEqual(['taiyo/greeting.mp3', 'taiyo/crisis.mp3'])
    expect(hasOfficialVoice('taiyo', 'greeting')).toBe(true)
    expect(hasOfficialVoice('taiyo', 'crisis')).toBe(true)
    expect(hasOfficialVoice('taiyo', 'success')).toBe(false)
    expect(hasOfficialVoice('taiyo', 'fatigue')).toBe(false)
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

  it('ミュート中は playVoice が false を返し、何も始めない（greeting・crisis とも）', () => {
    setSoundMuted(true)
    expect(isSoundMuted()).toBe(true)
    let started = 0
    expect(playVoice('taiyo', 'greeting', { onStart: () => started++ })).toBe(false)
    expect(playVoice('taiyo', 'crisis', { onStart: () => started++ })).toBe(false)
    expect(started).toBe(0)
  })

  it('配信していない神・場面は false（例外を出さない）', () => {
    expect(playVoice('ebisu', 'greeting')).toBe(false)
    expect(playVoice('taiyo', 'success')).toBe(false)
    expect(() => stopVoice()).not.toThrow()
    expect(() => stopVoice(VOICE_LAYER.stopFadeMs)).not.toThrow()
    expect(() => releaseVoiceCacheExcept('taiyo')).not.toThrow()
    expect(getActiveVoiceScene()).toBeNull()
  })
})

describe('Crisis Pilot v1：1 チャネルの優先度・フェード停止・場面別 drop（純関数）', () => {
  it('優先度は greeting 1 < crisis 2 < success = fatigue 3', () => {
    expect(VOICE_LAYER.priority.greeting).toBeLessThan(VOICE_LAYER.priority.crisis)
    expect(VOICE_LAYER.priority.crisis).toBeLessThan(VOICE_LAYER.priority.success)
    expect(VOICE_LAYER.priority.success).toBe(VOICE_LAYER.priority.fatigue)
  })

  it('何も鳴っていなければ play。鳴っている声より低い場面は drop、同じ以上は replace（キューしない）', () => {
    expect(resolveVoiceContention(null, 'greeting')).toBe('play')
    expect(resolveVoiceContention(null, 'crisis')).toBe('play')
    // あいさつの最中にピンチ → 置き換え（R1〜R2 で自傷により 50% を割った場合）
    expect(resolveVoiceContention('greeting', 'crisis')).toBe('replace')
    // ピンチの最中にあいさつ（起こらない順序だが規則として）→ 捨てる
    expect(resolveVoiceContention('crisis', 'greeting')).toBe('drop')
    // 同順位は後勝ち
    expect(resolveVoiceContention('greeting', 'greeting')).toBe('replace')
    expect(resolveVoiceContention('success', 'fatigue')).toBe('replace')
    expect(resolveVoiceContention('success', 'crisis')).toBe('drop')
  })

  it('置き換え時のフェードは 0 より長く、着弾の最短間隔（110ms）より短い（声の切れ目を目立たせない）', () => {
    expect(VOICE_LAYER.stopFadeMs).toBeGreaterThan(0)
    expect(VOICE_LAYER.stopFadeMs).toBeLessThan(110)
  })

  it('遅延 drop：crisis は 800ms（着弾からの距離に意味がある）、他の場面は共通の 1,500ms', () => {
    expect(voiceLateDropMs('crisis')).toBe(800)
    expect(voiceLateDropMs('crisis')).toBeLessThan(VOICE_LAYER.lateDropMs)
    for (const scene of ['greeting', 'success', 'fatigue'] as VoiceScene[]) expect(voiceLateDropMs(scene)).toBe(VOICE_LAYER.lateDropMs)
  })

  it('crisis の時刻は最後の自分への着弾 ＋ 決定257 の duck 復帰開始点（SOUND_LAYER.duckTailMs）に合流する', () => {
    expect(VOICE_LAYER.afterImpactMs.crisis).toBe(SOUND_LAYER.duckTailMs)
    expect(VOICE_LAYER.afterImpactMs.crisis).toBe(VOICE_LAYER.duckTailMs)
  })
})

describe('配線（BattleScreen・crisisVoice）', () => {
  const src = code(battleScreenSrc)
  const hook = code(crisisVoiceSrc)

  it('入口の間に greeting と crisis を先読みし（他の神のキャッシュは先に捨てる）、入口の終わり（handleEntranceDone）で greeting を 1 回だけ鳴らす', () => {
    expect(src.match(/preloadVoice\(/g)).toHaveLength(2)
    expect(src.match(/releaseVoiceCacheExcept\(/g)).toHaveLength(1)
    const start = src.indexOf('if (battleStartKey > seenStartKeyRef.current)')
    const startEnd = src.indexOf('}, [battleStartKey])', start)
    const block = src.slice(start, startEnd)
    expect(block.indexOf('releaseVoiceCacheExcept(')).toBeLessThan(block.indexOf('preloadVoice('))
    expect(block).toContain("preloadVoice(state.godId, 'greeting')")
    expect(block).toContain("preloadVoice(state.godId, 'crisis')")
    // greeting の再生は従来どおり handleEntranceDone の中で 1 回（crisis は BattleScreen からは鳴らさない）
    expect(src.match(/playVoice\(/g)).toHaveLength(1)
    const cb = src.indexOf('const handleEntranceDone = useCallback(')
    const play = src.indexOf('playVoice(')
    const cbEnd = src.indexOf('}, [])', cb)
    expect(cb).toBeGreaterThan(0)
    expect(play).toBeGreaterThan(cb)
    expect(play).toBeLessThan(cbEnd)
    expect(src.slice(cb, cbEnd)).toContain("'greeting'")
  })

  it('crisis は useCrisisVoice（log・state・敵の visualType）1 箇所から鳴らし、BGM duck は greeting と同じ決定257 の経路', () => {
    expect(src.match(/useCrisisVoice\(/g)).toHaveLength(1)
    expect(src).toMatch(/useCrisisVoice\(log, state, enemyVisualType\)/)
    expect(hook.match(/playVoice\(/g)).toHaveLength(1)
    expect(hook).toMatch(/playVoice\(godId, 'crisis', \{ onStart: \(ms\) => duckBgm\(ms \+ VOICE_LAYER\.duckTailMs\) \}\)/)
    expect(src).toMatch(/onStart:\s*\(ms\)\s*=>\s*duckBgm\(ms \+ VOICE_LAYER\.duckTailMs\)/)
  })

  it('crisis の予約は setTimeout 1 本。新しい対局・巻き戻しで記憶を捨て、画面を離れるときに予約を解除する', () => {
    expect(hook.match(/window\.setTimeout\(/g)).toHaveLength(1)
    expect(hook).toMatch(/state\.seed !== seedRef\.current \|\| log\.length < seenRef\.current/)
    expect(hook).toMatch(/firedRef\.current = false/)
    expect(hook).toMatch(/useEffect\(\(\) => \(\) => clearTimer\(\), \[\]\)/)
    expect(hook).toMatch(/if \(!hasOfficialVoice\(godId, 'crisis'\)\) return/)
    // ゲーム規則・入力ロック・GameState には触れない（読むだけ）
    expect(hook).not.toMatch(/dispatch|playCard|endRound|setState/)
  })

  it('戦闘画面を離れるときに stopVoice する（鳴り続けない）', () => {
    expect(src.match(/stopVoice\(\)/g)).toHaveLength(1)
    expect(src).toMatch(/useEffect\(\(\) => \(\) => stopVoice\(\), \[\]\)/)
  })
})
