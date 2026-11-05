/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ENEMIES } from '../../core/data/enemies'

/**
 * v1.1.5 Hotfix（舞台背景の復元）：敵別 CSS が `.battle-main` の background-image を上書きするとき、
 * 舞台画像の層 `var(--stage-bg, …)` を必ず併記することの契約（source-fixed）。
 *   - background-image は多層指定ごと置き換わるため、周辺減光だけを書くと BattleScreen が注入する --stage-bg（stage.bg）が落ちる
 *     （v1.1.0〜v1.1.4 で将軍家 9 体＝enemy_10〜18 の舞台が消えていた原因）
 *   - 共通規則（battle.css の LANE-D ブロック）と忠次ブロック（enemy_08）は従来どおり var(--stage-bg, …) を持つ
 *   - 全敵の stage.bg は enemies.test.ts が同梱を検証済み。本テストは「CSS が画像層を捨てない」ことだけを見る
 */
const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
const strip = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '')
const STAGE_LAYER = "var(--stage-bg, url('/assets/backgrounds/arena.jpg'))"
const BASE_LAYER = 'linear-gradient(180deg, #05060d22 0%, #05060d44 60%, #05060dcc 100%)'

/** `.battle-main` を含むセレクタの宣言ブロック（selector → body）を集める */
const battleMainRules = (css: string): { selector: string; body: string }[] =>
  [...strip(css).matchAll(/(^|\n)\s*([^@{}\n][^{}]*)\{([^{}]*)\}/g)]
    .map((m) => ({ selector: m[2].trim(), body: m[3] }))
    .filter((r) => /\.battle-main\s*(,|$)/.test(r.selector) && /background(-image)?\s*:/.test(r.body))

const WAVE_FILES = ['./shogunateWave2.css', './shogunateWave3.css', './shogunateWave4.css', './shogunateWave5.css'] as const

describe('舞台背景（stage.bg）の層を敵別 CSS が捨てない（v1.1.5 Hotfix 契約）', () => {
  it('共通規則（battle.css）は var(--stage-bg, arena.jpg) を末尾の層に持つ', () => {
    const rules = battleMainRules(read('./battle.css')).filter((r) => r.selector === '.battle-main')
    expect(rules.some((r) => r.body.includes(STAGE_LAYER))).toBe(true)
  })

  it("忠次ブロック（battle.css 末尾・enemy_08）の .battle-main 上書きも var(--stage-bg, …) を持つ", () => {
    const rules = battleMainRules(read('./battle.css')).filter((r) => r.selector.includes("[data-enemy='enemy_08']"))
    expect(rules.length).toBeGreaterThanOrEqual(1)
    for (const r of rules) expect(r.body, r.selector).toContain(STAGE_LAYER)
  })

  it.each(WAVE_FILES)('%s：.battle-main を上書きする規則はすべて 共通の減光グラデ＋var(--stage-bg, …) を併記し、画像層が最後にある', (file) => {
    const rules = battleMainRules(read(file))
    expect(rules.length, `${file} に .battle-main の background 規則が無い`).toBeGreaterThanOrEqual(1)
    for (const r of rules) {
      expect(r.body, r.selector).toContain(BASE_LAYER)
      expect(r.body, r.selector).toContain(STAGE_LAYER)
      // 画像は最背面＝宣言の最後の層（body の末尾が var(--stage-bg, …) で終わる）
      expect(r.body.trim().replace(/;$/, '').endsWith(STAGE_LAYER), r.selector).toBe(true)
      // 上書きは `background:` 短縮形ではなく background-image のみ（size／position は共通規則のまま）
      expect(r.body, r.selector).not.toMatch(/(^|\s)background\s*:/)
    }
  })

  it('Wave2〜5 の .battle-main 上書きは将軍家 enemy_10〜18 の 9 体をちょうど一度ずつ覆う', () => {
    const covered: string[] = []
    for (const file of WAVE_FILES) {
      for (const r of battleMainRules(read(file))) {
        for (const id of r.selector.match(/enemy_\d{2}/g) ?? []) covered.push(id)
      }
    }
    const expected = ENEMIES.map((e) => e.id).filter((id) => /^enemy_1[0-8]$/.test(id))
    expect(expected.length).toBe(9)
    expect([...covered].sort()).toEqual([...expected].sort())
  })
})
