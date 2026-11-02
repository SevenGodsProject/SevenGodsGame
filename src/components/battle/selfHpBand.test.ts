/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { hpBand } from './visualHp'
import { SELF_HP_FILL, SELF_HP_MARKER } from './PlayerPanel'
import { RULES } from '../../core/data/rules'
import playerPanel from './PlayerPanel.tsx?raw'
import hpBar from './HpBar.tsx?raw'

/**
 * 神 HP 危険帯 static v1（Lane 2 Combat Feel v2 次工程監査 2026-10-29 §4-1・AI 判断）の契約。
 * - 段階は敵と同じ `hpBand`（表示 HP ÷ maxHp）。神の maxHp（30／easy 35／hard 27）で 50%・25% の境界が engine の
 *   lowHp（floor(maxHp × 0.5)）と一致することを固定する
 * - 表示専用：src/core・rules.ts・battle.css・timing 系に触れない。アニメーション 0
 * - 色だけに頼らない（枠＋記号）。記号は読み上げに含めない（aria-hidden）
 */
const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')

describe('神 HP 危険帯 static v1：段階の境界', () => {
  const easy = RULES.player.maxHp + RULES.difficulty.easy.playerMaxHpBonus
  const normal = RULES.player.maxHp
  const hard = RULES.player.maxHp + RULES.difficulty.hard.playerMaxHpBonus

  it('normal（30）：15 以下で half・7 以下で quarter。engine の lowHp（15）と half の境界が一致', () => {
    expect(normal).toBe(30)
    expect(hpBand(16, normal)).toBe('high')
    expect(hpBand(15, normal)).toBe('half')
    expect(hpBand(8, normal)).toBe('half')
    expect(hpBand(7, normal)).toBe('quarter')
    expect(hpBand(0, normal)).toBe('quarter')
    expect(Math.floor(normal * RULES.cardBonus.lowHpRatio)).toBe(15)
  })

  it('easy（35）：17 以下で half・8 以下で quarter', () => {
    expect(easy).toBe(35)
    expect(hpBand(18, easy)).toBe('high')
    expect(hpBand(17, easy)).toBe('half')
    expect(hpBand(9, easy)).toBe('half')
    expect(hpBand(8, easy)).toBe('quarter')
  })

  it('hard（27）：13 以下で half・6 以下で quarter', () => {
    expect(hard).toBe(27)
    expect(hpBand(14, hard)).toBe('high')
    expect(hpBand(13, hard)).toBe('half')
    expect(hpBand(7, hard)).toBe('half')
    expect(hpBand(6, hard)).toBe('quarter')
  })

  it('回復で 50% を超えれば high に戻る（履歴を持たない純関数）', () => {
    expect(hpBand(7, normal)).toBe('quarter')
    expect(hpBand(12, normal)).toBe('half')
    expect(hpBand(20, normal)).toBe('high')
  })
})

describe('神 HP 危険帯 static v1：配線（表示専用）', () => {
  it('段階ごとの fill と記号：high は従来の緑・記号なし、half 橙「▽」、quarter 橙赤「▼」', () => {
    expect(SELF_HP_FILL.high).toBe('#4dbd74')
    expect(SELF_HP_FILL.half).toBe('#d9a441')
    expect(SELF_HP_FILL.quarter).toBe('#ff7a45')
    expect(SELF_HP_MARKER.high).toBeUndefined()
    expect(SELF_HP_MARKER.half).toBe('▽')
    expect(SELF_HP_MARKER.quarter).toBe('▼')
    // 敵の「追い詰めた」赤（#e5484d fill／#ff5c5c 枠）は使わない＝左右で混同しない
    expect(Object.values(SELF_HP_FILL)).not.toContain('#e5484d')
    expect(Object.values(SELF_HP_FILL)).not.toContain('#ff5c5c')
  })

  it('PlayerPanel は表示 HP（hpShown）で hpBand を取り、根に player-band-*、HpBar に fill・hp-bar-self-*・marker を渡す', () => {
    expect(playerPanel).toMatch(/const band = hpBand\(hpShown, player\.maxHp\)/)
    expect(playerPanel).toMatch(/className=\{`panel player-panel player-band-\$\{band\}`\}/)
    expect(playerPanel).toMatch(/color=\{SELF_HP_FILL\[band\]\}/)
    expect(playerPanel).toMatch(/className=\{band === 'high' \? undefined : `hp-bar-self-\$\{band\}`\}/)
    expect(playerPanel).toMatch(/marker=\{SELF_HP_MARKER\[band\]\}/)
    // 既存の被弾・回復演出の配線は不変
    expect(playerPanel).toMatch(/className=\{healKey > 0 \? 'heal-pulse' : undefined\}/)
    expect(playerPanel).toMatch(/hit-shake-flash/)
  })

  it('HpBar の記号は pill（.hp-bar-label-text）の中・aria-hidden・数字の前', () => {
    const pill = hpBar.slice(hpBar.indexOf('<span className="hp-bar-label-text">'), hpBar.indexOf('{formatScaled(current)}'))
    expect(pill).toMatch(/<span className="hp-bar-marker" aria-hidden="true">/)
    // 敵側（EnemyPanel）は marker を渡さない＝敵の表示は不変
    expect(read('./EnemyPanel.tsx')).not.toMatch(/marker=/)
  })

  it('hudPlate.css：self-half は 1px 橙枠、self-quarter は 2px 橙赤枠＋外光。box-shadow 以外を宣言しない（アニメ 0）', () => {
    const css = read('./hudPlate.css').replace(/\/\*[\s\S]*?\*\//g, '')
    const rule = (sel: string): string => {
      const at = css.indexOf(sel)
      expect(at, sel).toBeGreaterThanOrEqual(0)
      return css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at))
    }
    const half = rule('.hp-bar.hp-bar-self-half')
    const quarter = rule('.hp-bar.hp-bar-self-quarter')
    expect(half).toMatch(/0 0 0 1px #d9a441cc/)
    expect(quarter).toMatch(/0 0 0 2px #ff7a45cc/)
    expect(quarter).toMatch(/0 0 12px #ff7a4555/)
    for (const body of [half, quarter]) {
      const props = body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => d.slice(0, d.indexOf(':')).trim())
      expect(props).toEqual(['box-shadow'])
    }
    // 既存の敵 quarter 規則は不変
    expect(rule('.hp-bar.hp-bar-quarter')).toMatch(/0 0 0 1px #ff5c5c99/)
  })

  it('battle.css・src/core・rules.ts・timing 系に self 帯の語を持ち込まない', () => {
    expect(read('./battle.css')).not.toMatch(/hp-bar-self|player-band-|hp-bar-marker/)
    expect(read('./enemyVfxTiming.ts')).not.toMatch(/hp-bar-self|player-band-/)
    expect(read('./visualHp.ts')).not.toMatch(/self|player-band/)
    expect(read('../../core/data/rules.ts')).not.toMatch(/dangerBand|selfHpBand|hpBand/)
  })
})
