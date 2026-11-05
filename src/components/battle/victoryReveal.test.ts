import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GODS } from '../../core/data/gods'
import { GOD_THEME_COLOR, KEYVISUAL_OBJECT_POSITION } from '../setup/godStyle'
import { planVictory } from './combatTimeline'
import { FINAL_HIT_STOP_MS } from './enemyVfxTiming'
import { resolveVictorySkip, type VictoryPhase } from './useCombatPresentation'
import { isStagedSkipTarget } from './victoryReveal'

describe('決定226 Victory Reveal v1', () => {
  it('skip は「撃破」の拍（beat）の間だけ done へ進む。それ以外の段階では何もしない', () => {
    expect(resolveVictorySkip('beat')).toBe('done')
    const others: VictoryPhase[] = ['none', 'finishing', 'collapse', 'done']
    for (const p of others) expect(resolveVictorySkip(p)).toBe(p)
  })

  it('結果の段階表示の skip は、ボタン・リンク・折りたたみを押したときには発火しない', () => {
    const hitsControl = { closest: () => ({}) } as unknown as EventTarget
    const plainArea = { closest: () => null } as unknown as EventTarget
    expect(isStagedSkipTarget(hitsControl)).toBe(false)
    expect(isStagedSkipTarget(plainArea)).toBe(true)
    expect(isStagedSkipTarget(null)).toBe(false)
    expect(isStagedSkipTarget({} as EventTarget)).toBe(false)
  })

  it('7 神すべてで舞台に必要な素材（keyvisual・円の切り抜き位置・神色）が揃っている', () => {
    const shipped = Object.keys(import.meta.glob('../../../public/assets/gods/*/keyvisual.webp')).map((k) => k.replace('../../../public', ''))
    expect(GODS).toHaveLength(7)
    for (const god of GODS) {
      expect(shipped, `${god.nameJa} keyvisual`).toContain(god.art.keyvisual)
      expect(KEYVISUAL_OBJECT_POSITION[god.id], god.nameJa).toBeTruthy()
      expect(GOD_THEME_COLOR[god.id]?.base, god.nameJa).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('勝利の時刻表は変えていない（追加の強制待機 0ms）：着弾 90＋stop 90 → 崩壊 350 → 拍 730 → 結果 1,580', () => {
    const tl = planVictory({ atMs: 90, stopMs: FINAL_HIT_STOP_MS })
    expect(tl.collapseStartMs).toBe(350)
    expect(tl.beatStartMs).toBe(730)
    expect(tl.rewardMs).toBe(1580)
    const reduced = planVictory({ atMs: 90, stopMs: FINAL_HIT_STOP_MS }, true)
    expect(reduced.rewardMs).toBe(90 + 0 + 120 + 200 + 600)
  })

  // v1.1.6 QW#1：報酬を確定したあとの結果画面（再 mount）は段階表示とスコア巻き上げを二度流さない。
  // 初回（報酬前）・Daily・Pilot は従来どおり段階表示を出す（BattleScreen は rewardDoneState だけを渡す）
  it('報酬確定後の再 mount は段階表示を最初から全表示にする（skipStaging）。初回の演出は不変', () => {
    const overlay = readFileSync(new URL('./GameOverOverlay.tsx', import.meta.url), 'utf8')
    const screen = readFileSync(new URL('./BattleScreen.tsx', import.meta.url), 'utf8')
    const css = readFileSync(new URL('./battle.css', import.meta.url), 'utf8')
    expect(overlay).toContain('skipStaging = false')
    expect(overlay).toContain('useState(skipStaging)')
    expect(overlay).toContain("useState(status === 'won' && !reduced && !skipStaging ? 0 : finalScore)")
    // BattleScreen：報酬の判断を終えた状態（rewardDoneState）だけを渡す。Pilot 敵の rewardDone（最初から true）は渡さない
    expect(screen).toContain('skipStaging={rewardDoneState}')
    expect(screen).not.toContain('skipStaging={rewardDone}')
    // tap skip／skipStaging の対象に Result Hub 以降の要素が含まれる（決定187 で段階表示に加わった要素）
    const skipRule = css.match(/\.game-over-card-won\.game-over-card-skipped\s*:is\(([^)]*)\)/)
    expect(skipRule).not.toBeNull()
    for (const cls of ['.result-hub', '.result-hub-pending', '.game-over-breakdown', '.result-tertiary', '.game-over-matchup', '.game-over-best-gap', '.game-over-status', '.game-over-score']) {
      expect(skipRule![1], cls).toContain(cls)
    }
  })
})
