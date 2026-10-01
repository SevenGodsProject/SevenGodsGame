/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import entranceSrc from './BossEntrance.tsx?raw'
import helperSrc from './battleEntrance.ts?raw'
import battleScreenSrc from './BattleScreen.tsx?raw'
import {
  BATTLE_ENTRANCE_FULL_CONTROL_MS,
  BATTLE_ENTRANCE_FULL_MS,
  BATTLE_ENTRANCE_REDUCED_CONTROL_MS,
  BATTLE_ENTRANCE_REDUCED_MS,
  BATTLE_ENTRANCE_SHORT_CONTROL_MS,
  BATTLE_ENTRANCE_SHORT_MS,
  BATTLE_ENTRANCE_SKIP_FADE_MS,
  BOSS_ENTRANCE_MS,
  BOSS_ENTRANCE_REDUCED_MS,
} from './BossEntrance'
import { resetBattleEntranceSessionForTest, takeBattleEntranceVariant } from './battleEntrance'

/**
 * 決定254 Game Entry「降臨の間」Pilot の契約（docs/GAME_ENTRY_IMMERSION_PREFLIGHT.md §4・§5・§8・§9）。
 * 実際の見え方・時刻の実測・skip の貫通 0・metric lock は `docs/evidence/decision254/pilot/` の Playwright 計測が担当する。
 */
const css = readFileSync(fileURLToPath(new URL('./battle.css', import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
const entranceCss = css.slice(css.lastIndexOf('/*', css.indexOf('決定254 Game Entry「降臨の間」Pilot')))
const bare = entranceCss.replace(/\/\*[\s\S]*?\*\//g, '')

/** コメントを除いたソース（コメント中の説明語で誤検出しない） */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** `セレクタ {` の本文（最初の 1 つ） */
function block(selector: string): string {
  const at = bare.indexOf(selector + ' {')
  if (at < 0) throw new Error(`selector not found: ${selector}`)
  return bare.slice(bare.indexOf('{', at) + 1, bare.indexOf('}', at))
}

describe('尺と操作可能時刻', () => {
  it('Full 2,800／操作 2,400・Short 1,500（現行と同尺）／1,150・reduced 900／720・skip 200', () => {
    expect([BATTLE_ENTRANCE_FULL_MS, BATTLE_ENTRANCE_FULL_CONTROL_MS]).toEqual([2800, 2400])
    expect([BATTLE_ENTRANCE_SHORT_MS, BATTLE_ENTRANCE_SHORT_CONTROL_MS]).toEqual([1500, 1150])
    expect([BATTLE_ENTRANCE_REDUCED_MS, BATTLE_ENTRANCE_REDUCED_CONTROL_MS]).toEqual([900, 720])
    expect(BATTLE_ENTRANCE_SKIP_FADE_MS).toBe(200)
    expect(BATTLE_ENTRANCE_SHORT_MS).toBe(BOSS_ENTRANCE_MS)
    expect(BATTLE_ENTRANCE_REDUCED_MS).toBe(BOSS_ENTRANCE_REDUCED_MS)
    expect(BATTLE_ENTRANCE_FULL_MS).toBeGreaterThan(BATTLE_ENTRANCE_SHORT_MS)
    for (const [control, total] of [
      [BATTLE_ENTRANCE_FULL_CONTROL_MS, BATTLE_ENTRANCE_FULL_MS],
      [BATTLE_ENTRANCE_SHORT_CONTROL_MS, BATTLE_ENTRANCE_SHORT_MS],
      [BATTLE_ENTRANCE_REDUCED_CONTROL_MS, BATTLE_ENTRANCE_REDUCED_MS],
    ]) {
      expect(control).toBeLessThan(total)
    }
  })

  it('CSS の root fade-out が操作可能時刻から始まり総尺で終わる（TS と CSS の時刻が一致）', () => {
    const ms = (s: string) => Math.round(parseFloat(s) * 1000)
    const fade = (sel: string) => {
      const m = block(sel).match(/animation:\s*battle-entrance-out\s+([\d.]+)s\s+[\w-]+\s+([\d.]+)s/)
      expect(m, sel).not.toBeNull()
      return { start: ms(m![2]), end: ms(m![2]) + ms(m![1]) }
    }
    expect(fade('.battle-entrance-full')).toEqual({ start: BATTLE_ENTRANCE_FULL_CONTROL_MS, end: BATTLE_ENTRANCE_FULL_MS })
    expect(fade('.battle-entrance-short')).toEqual({ start: BATTLE_ENTRANCE_SHORT_CONTROL_MS, end: BATTLE_ENTRANCE_SHORT_MS })
    expect(fade('.battle-entrance-reduced')).toEqual({ start: BATTLE_ENTRANCE_REDUCED_CONTROL_MS, end: BATTLE_ENTRANCE_REDUCED_MS })
    expect(block('.battle-entrance.is-skipped')).toMatch(/battle-entrance-out 0\.2s/)
  })

  it('SE は Full＝250ms（神紋）・1,500ms（顕現）、Short＝100・450ms', () => {
    expect(entranceSrc).toMatch(/full: \{[^}]*godSeMs: 250, bossSeMs: 1500 \}/)
    expect(entranceSrc).toMatch(/short: \{[^}]*godSeMs: 100, bossSeMs: 450 \}/)
  })
})

describe('first／revisit（セッション変数・storage 不使用）', () => {
  beforeEach(() => resetBattleEntranceSessionForTest())

  it('1 回目だけ full、以後 short', () => {
    expect(takeBattleEntranceVariant()).toBe('full')
    expect(takeBattleEntranceVariant()).toBe('short')
    expect(takeBattleEntranceVariant()).toBe('short')
  })

  it('storage・save・gameVersion に触れない', () => {
    for (const src of [entranceSrc, helperSrc].map(code)) {
      expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB|gameVersion|saveBattle/)
    }
  })

  it('BattleScreen は新規開始（battleStartKey 増分）のときだけ variant を消費する', () => {
    expect(battleScreenSrc).toMatch(/if \(battleStartKey > seenStartKeyRef\.current\) \{[\s\S]*?setEntranceVariant\(takeBattleEntranceVariant\(\)\)/)
    // 顕現の SE は入口が時刻どおり予約する（mount 時の即時再生は廃止）
    expect(battleScreenSrc).not.toMatch(/sfx\.bossEntrance\(\)/)
  })
})

describe('skip と入力', () => {
  it('skip で未再生の予約（SE・操作開放・消滅）を全部取り消してから 200ms で閉じる', () => {
    const body = entranceSrc.slice(entranceSrc.indexOf('const skip = useCallback'))
    expect(body.slice(0, body.indexOf('}, [onDone])'))).toMatch(/for \(const t of timers\) window\.clearTimeout\(t\)[\s\S]*BATTLE_ENTRANCE_SKIP_FADE_MS/)
  })

  it('SE・操作開放の予約は CSS の時計（root animation の ready）に合わせ、安全弁で必ず開始する', () => {
    expect(entranceSrc).toMatch(/anim\.ready\.then\(startFromAnim, startFromAnim\)/)
    expect(entranceSrc).toMatch(/window\.setTimeout\(startFromAnim, 400\)/)
    // 基準＝root animation の startTime（compositor の実開始）。入口配下の全 animation をそこへ揃え、予約は経過分を差し引く
    // （神紋＝main thread と神・敵＝compositor の時計ずれ、ready の遅れによる音・操作開放の遅れを防ぐ）
    expect(entranceSrc).toMatch(/for \(const a of root\.getAnimations\(\{ subtree: true \}\)\) a\.startTime = base/)
    expect(entranceSrc).toMatch(/elapsed = Math\.max\(0, nowT - base\)/)
    expect(entranceSrc).toMatch(/const at = \(ms: number\) => Math\.max\(0, ms - elapsed\)/)
  })

  it('入口は操作可能時刻まで入力を受け（pointer-events:auto）、開放後は none', () => {
    expect(block('.battle-entrance')).toMatch(/pointer-events: auto/)
    expect(block('.battle-entrance.is-released')).toMatch(/pointer-events: none/)
    expect(entranceSrc).toMatch(/e\.stopPropagation\(\)/)
    expect(entranceSrc).toMatch(/absorbSkipTail\('pointer'/)
    expect(entranceSrc).toMatch(/absorbSkipTail\('key'/)
  })

  it('最初の frame から不透明（root に fade-in が無い）', () => {
    expect(block('.battle-entrance')).toMatch(/background: #05060d/)
    expect(bare).not.toMatch(/\.battle-entrance-(full|short) \{[^}]*battle-entrance-in/)
  })
})

describe('決定250・既存演出との分離（ソース固定）', () => {
  it('enemyVfxTiming・godStrikeVideo・core の engine を import しない', () => {
    for (const src of [entranceSrc, helperSrc].map(code)) {
      expect(src).not.toMatch(/from '[^']*(enemyVfxTiming|godStrikeVideo|core\/engine|BattleResonanceCutin)/)
    }
  })

  it('God Strike の selector・素材・音を使わない', () => {
    for (const src of [code(entranceSrc), code(helperSrc), bare]) {
      expect(src).not.toMatch(/resonance-cutin|god-strike|keyvisual|burst_ready|hit_l4|burstImpact|burstReady/)
    }
  })

  it('transform／opacity 以外を animate しない（filter・blend・box-shadow の keyframes なし）', () => {
    const frames = [...bare.matchAll(/@keyframes battle-entrance-[\w-]+ \{([\s\S]*?)\n\}/g)].map((m) => m[1])
    expect(frames.length).toBeGreaterThanOrEqual(6)
    for (const f of frames) expect(f).not.toMatch(/filter|mix-blend|box-shadow|width|height|top|left/)
  })

  it('reduced-motion では transform の animation を持たない', () => {
    const reducedRule = bare.slice(bare.indexOf('.battle-entrance-reduced .battle-entrance-bg,'))
    expect(reducedRule.slice(0, reducedRule.indexOf('}'))).toMatch(/animation: none/)
    expect(entranceSrc).toMatch(/useState\(prefersReducedMotion\)/)
  })
})
