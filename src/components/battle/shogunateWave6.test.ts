/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * W6 将軍家 敵演出 品質向上（決定288 v1.1 §10-3）：shogunateWave6.css が「将軍家 10 体の表示だけ」に閉じ、
 * 既存 7 体・Threat Pilot（enemy_09）・engine・timing に及ばないことの契約（source-fixed）。
 *   - 全セレクタは [data-enemy='enemy_1x'] に閉じる（忠次 enemy_08 は v0.2〜v0.6 ブロック据え置き＝W6 では触らない）
 *   - animation／@keyframes／transition を足さない（reduced-motion の追加規則が不要）・reduce の @media を書かない（決定232）
 *   - 大きさの正規化は --artScale（決定261 の口）だけ。値は実ブラウザ計測（docs/W6_ENEMY_PRESENTATION_GATE.md）から
 *   - EnemyPanel は data-tactic（armed／cleared）を panel の根に写すだけ（将軍家以外は undefined）
 */
const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
const css = read('./shogunateWave6.css')
const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
const selectors = [...noComments.matchAll(/(^|\n)\s*([^@{}\n][^{}]*)\{/g)].map((m) => m[2].trim()).filter(Boolean)

describe('shogunateWave6.css の契約', () => {
  it("全セレクタ（カンマ区切りの各部分）が [data-enemy='enemy_1x'] に閉じる（enemy_08・enemy_09・既存 7 体は含まない）", () => {
    expect(selectors.length).toBeGreaterThanOrEqual(12)
    for (const sel of selectors) {
      for (const part of sel.split(',').map((s) => s.trim()).filter(Boolean)) {
        expect(part, part).toMatch(/\[data-enemy='enemy_1[0-8]'\]/)
      }
    }
    expect(noComments).not.toMatch(/enemy_0[1-9]/)
  })

  it('animation／@keyframes／transition／reduce の @media を書かない', () => {
    expect(noComments).not.toMatch(/animation|@keyframes|transition/)
    expect(css).not.toContain('prefers-reduced-motion')
    expect(noComments).not.toContain('@media')
  })

  it('画像は無改変：filter／gradient／opacity／--artScale だけ（background-image の url を足さない・mask を触らない）', () => {
    expect(noComments).not.toMatch(/url\(/)
    expect(noComments).not.toMatch(/mask/)
  })

  it('大きさの正規化（決定261 --artScale）：全身 3 体 0.87・肖像風 3 体 0.91・ドーマン 0.92。鬼半蔵（enemy_15）・康虎（enemy_18）・忠次は据え置き', () => {
    const rule = (id: string): string | null => {
      const m = noComments.match(new RegExp(`body\\.battle-viewport \\.enemy-panel\\[data-enemy='${id}'\\][^{]*\\{([^}]*)\\}`))
      return m ? m[1] : null
    }
    for (const id of ['enemy_11', 'enemy_12', 'enemy_16']) expect(rule(id), id).toMatch(/--artScale: 0\.87;/)
    for (const id of ['enemy_10', 'enemy_13', 'enemy_14']) expect(rule(id), id).toMatch(/--artScale: 0\.91;/)
    expect(rule('enemy_17')).toMatch(/--artScale: 0\.92;/)
    expect(noComments).not.toMatch(/\[data-enemy='enemy_15'\][^{]*\{[^}]*--artScale/)
    expect(noComments).not.toMatch(/\[data-enemy='enemy_18'\][^{]*\{[^}]*--artScale/)
  })

  it('入口（降臨の間）の外光は enemy_10〜18 の 9 体に filter だけで付く（忠次は v0.2 §5 据え置き）', () => {
    for (let n = 10; n <= 18; n++) {
      expect(noComments).toMatch(new RegExp(`\\.battle-entrance\\[data-enemy='enemy_${n}'\\] \\.boss-entrance-art \\{ filter: drop-shadow`))
    }
  })

  it('各敵 1 点の見せ場は既存のクラス・data 属性だけを読む（lunge／cf2-break／enemy-band／charging-super／data-tactic）', () => {
    expect(noComments).toMatch(/\[data-enemy='enemy_10'\] \.enemy-avatar-wrap\.enemy-lunge-multi-3 \.enemy-avatar/)
    expect(noComments).toMatch(/\[data-enemy='enemy_11'\]\.cf2-break-quarter \.enemy-stage::after/)
    expect(noComments).toMatch(/\[data-enemy='enemy_12'\]\[data-tactic='cleared'\] \.enemy-avatar::before/)
    expect(noComments).toMatch(/\[data-enemy='enemy_13'\]\[data-tactic='armed'\] \.enemy-avatar::before/)
    expect(noComments).toMatch(/\[data-enemy='enemy_14'\] \.enemy-avatar-wrap\.enemy-lunge-fast \.enemy-avatar/)
    expect(noComments).toMatch(/\[data-enemy='enemy_15'\]\.enemy-band-quarter \.enemy-stage::after/)
    expect(noComments).toMatch(/\[data-enemy='enemy_16'\]\.cf2-break-half \.enemy-avatar\.enemy-avatar-charging\.enemy-avatar-charging-super/)
    expect(noComments).toMatch(/\[data-enemy='enemy_17'\]\[data-tactic='armed'\] \.enemy-avatar::before/)
    expect(noComments).toMatch(/\[data-enemy='enemy_18'\]\.cf2-break-quarter \.enemy-avatar\.enemy-avatar-charging\.enemy-avatar-charging-super/)
    // 溜めの輪の上書きは忠次 v0.3 と同じ言語（drop-shadow 連鎖・box-shadow を足さない）
    expect(noComments).not.toMatch(/box-shadow:\s*[^n]/)
  })
})

describe('data-tactic の口と読み込み順', () => {
  it('EnemyPanel は panel の根に data-tactic（armed／cleared・将軍家以外は undefined）を 1 つだけ写す', () => {
    const panel = read('./EnemyPanel.tsx')
    expect(panel.match(/data-tactic=\{tLine \? \(tLine\.cleared \? 'cleared' : 'armed'\) : undefined\}/g)).toHaveLength(1)
    // data-enemy の口は既存どおり 1 つ
    expect(panel.match(/data-enemy=\{enemy\.defId\}/g)).toHaveLength(1)
  })
  it('BattleScreen は shogunateWave6.css を shogunateWave5.css の直後に読む（詳細度が同じ規則は後勝ち）', () => {
    expect(read('./BattleScreen.tsx')).toMatch(/import '\.\/shogunateWave5\.css'\nimport '\.\/shogunateWave6\.css'/)
  })
})
