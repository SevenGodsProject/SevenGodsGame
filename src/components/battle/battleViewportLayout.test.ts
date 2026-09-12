/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import screen from './BattleScreen.tsx?raw'
import enemyPanel from './EnemyPanel.tsx?raw'
import playerPanel from './PlayerPanel.tsx?raw'
import godOtomoPanel from './GodOtomoPanel.tsx?raw'

/**
 * Phase 6-B（決定164）Battle Viewport Layout の構造回帰。
 *
 * 6-B の本質は「操作 UI を `position: fixed` でアリーナに重ねるのをやめ、
 * grid の行として場所を確保する」こと。固定配置に戻すと、固定要素はページの
 * 高さを減らさないため敵 HP・予告・立ち絵を覆い、Phase 6-A の着弾演出が
 * また見えなくなる（設計監査で実測済み）。CSS/JSX が将来その形へ戻ることを
 * 防ぐため、ソースそのものを検査する。
 *
 * 実際の可視率・スクロール量はヘッドレス実測（scripts/phase6b-layout-audit/）が
 * 担当する。ここは「二度と壊してはいけない構造」だけを固定する。
 */

/** battle.css は Vite の CSS パイプラインを通ると `?raw` でも空になるため、実ファイルを読む */
const css = readFileSync(fileURLToPath(new URL('./battle.css', import.meta.url)), 'utf8')

/** `セレクタ { ... }` のブロック本文をすべて集める（コメントは除去してから探す） */
function blocksFor(selector: string): string[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const out: string[] = []
  const needle = selector
  let from = 0
  for (;;) {
    const at = source.indexOf(needle, from)
    if (at < 0) break
    from = at + needle.length
    // セレクタリストの一部（`.a, .b {`）も拾えるよう、次の `{` から対応する `}` までを取る
    const open = source.indexOf('{', at)
    const nextSemi = source.indexOf(';', at)
    if (open < 0 || (nextSemi >= 0 && nextSemi < open)) continue
    const close = source.indexOf('}', open)
    if (close < 0) continue
    // セレクタ部分に needle が含まれているものだけ（宣言値の一致は無視する）
    const selectorText = source.slice(Math.max(0, source.lastIndexOf('}', at) + 1), open)
    if (!selectorText.includes(needle)) continue
    out.push(source.slice(open + 1, close))
  }
  return out
}

describe('Phase 6-B：操作 UI を固定配置に戻さない（決定164／決定77の置き換え）', () => {
  it('does not pin the end-round button with position: fixed anywhere', () => {
    const pinned = blocksFor('.end-round-button').filter((b) => /position:\s*fixed/.test(b))
    expect(pinned).toEqual([])
  })

  it('does not pin the hand or the oracle bar with position: fixed / sticky', () => {
    for (const sel of ['.hand', '.divination-panel', '.battle-dock']) {
      const pinned = blocksFor(sel).filter((b) => /position:\s*(fixed|sticky)/.test(b))
      expect(pinned, sel).toEqual([])
    }
  })

  it('keeps the arena unclipped so Combat Juice is never cut off', () => {
    // `.battle-main` の overflow:hidden（旧実装）は 52px のダメージ数字・閃光・
    // ノックバックを切ってしまう。battle-viewport では visible に上書きしている。
    expect(css).toMatch(/body\.battle-viewport \.battle-main \{[^}]*overflow:\s*visible/)
  })
})

describe('Phase 6-B：戦闘画面の骨格（viewport grid ＋ ドック）', () => {
  it('lays the battle screen out as three rows inside the viewport', () => {
    expect(css).toMatch(/body\.battle-viewport \.battle \{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto/)
    expect(css).toMatch(/body\.battle-viewport #root \{[^}]*height:\s*100dvh/)
  })

  it('renders the oracle bar, the hand and the actions inside the dock', () => {
    const dock = screen.slice(screen.indexOf('className="battle-dock"'))
    expect(dock).toContain('<DivinationPanel')
    expect(dock).toContain('className="battle-dock-row"')
    expect(dock).toContain('className="hand"')
    expect(dock).toContain('className="end-round-button"')
  })

  it('marks the body while the battle screen is mounted (and cleans up)', () => {
    expect(screen).toContain("document.body.classList.add('battle-viewport')")
    expect(screen).toContain("document.body.classList.remove('battle-viewport')")
  })

  it('keeps the battle log available behind a toggle instead of deleting it', () => {
    expect(screen).toContain('battle-log-toggle')
    expect(screen).toContain('className="battle-log"')
  })
})

describe('Phase 6-B：名札（常に見える情報）', () => {
  it('puts the enemy name, HP and intent in one plate above the portrait', () => {
    const enemy = enemyPanel
    const plate = enemy.slice(enemy.indexOf('className="enemy-plate"'), enemy.indexOf('enemy-speech-bubble'))
    expect(plate).toContain('<HpBar')
    expect(plate).toContain('intent')
    // 立ち絵（.enemy-stage）は名札より後ろ＝下に来る
    expect(enemy.indexOf('enemy-plate')).toBeLessThan(enemy.indexOf('enemy-stage'))
  })

  it('puts the god name and HP in one plate above the portrait', () => {
    const player = playerPanel
    const plate = player.slice(player.indexOf('className="player-plate"'), player.indexOf('player-stage'))
    expect(plate).toContain('<HpBar')
    expect(player.indexOf('player-plate')).toBeLessThan(player.indexOf('player-stage'))
  })

  it('keeps the resonance gauge in the plate so it is always visible', () => {
    const otomo = godOtomoPanel
    const plate = otomo.slice(otomo.indexOf('className="god-otomo-plate"'), otomo.indexOf('god-otomo-portraits'))
    expect(plate).toContain('resonance-gauge')
    expect(plate).toContain('burst-preview-head')
  })

  it('shows the intent at 20px on PC and at least 16px on mobile (設計 §9)', () => {
    const sizes = [...css.matchAll(/\.enemy-plate \.intent \{[^}]*font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]))
    expect(sizes.length).toBeGreaterThanOrEqual(2)
    // 既定（PC）は 20px 以上、どの breakpoint でも 16px を下回らない
    expect(Math.max(...sizes)).toBeGreaterThanOrEqual(20)
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(16)
  })
})
