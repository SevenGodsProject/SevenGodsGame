import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TutorialOverlay } from './TutorialOverlay'
import { SECTIONS, TIPS } from './tutorialContent'

/**
 * v1.0.1 語彙補完（`docs/FIRST_PLAYER_UX_IMPROVEMENT_PROPOSAL_V1.md` 案 B・AI 判断）：
 * 完全版「遊び方」② と攻略のコツに、実戦で見る 3 記号（⚡ 溜め→必殺・⚔ 連撃・防御の消滅）の事実説明があることを固定する。
 * 字数は `[...str].length`（コードポイント・絵文字 1 字）。断定語・おすすめ（どの札を出すか）は含めない（決定263 の境界）。
 */
describe('遊び方 ②（敵の予告）の確定文言', () => {
  const section = SECTIONS[1]

  it('見出しは「② 敵の予告を見よう」のまま・visual は実戦の予告（enemyIntent）のまま', () => {
    expect(section.title).toBe('② 敵の予告を見よう')
    expect(section.visual).toEqual({ kind: 'enemyIntent' })
  })

  it('本文は確定文言そのまま・76 字', () => {
    expect(section.body).toBe(
      '毎ラウンド、敵は次の行動を事前に見せます。⚡「溜め」は次のラウンドに大技（必殺）が来る合図、⚔ 連撃は複数回当たります。防御はそのラウンドだけ有効です。',
    )
    expect([...section.body].length).toBe(76)
  })

  it('溜め・必殺・連撃・防御の 4 概念を実戦と同じ語で含む', () => {
    for (const word of ['⚡', '溜め', '必殺', '⚔', '連撃', '防御']) expect(section.body).toContain(word)
  })

  it('他ステップの本文より長くない（③ が最長のまま）', () => {
    const longest = Math.max(...SECTIONS.map((s) => [...s.body].length))
    expect([...section.body].length).toBeLessThanOrEqual(longest)
    expect([...SECTIONS[2].body].length).toBe(longest)
  })
})

describe('攻略のコツ（TIPS）', () => {
  it('6 本・③ は防御の消滅（40 字）・神力の持ち越し不可（②）の直後に置く', () => {
    expect(TIPS).toHaveLength(6)
    expect(TIPS[1]).toContain('神力（AP）は次のラウンドへ持ち越せません')
    expect(TIPS[2]).toBe('防御は次のラウンドに残りません。大技が予告されたラウンドに合わせて出しましょう。')
    expect([...TIPS[2]].length).toBe(40)
  })

  it('断定語（絶対・必ず）と「ブロック」（UI に出ない語）を使わない', () => {
    for (const tip of TIPS) {
      expect(tip).not.toContain('絶対')
      expect(tip).not.toContain('必ず')
      expect(tip).not.toContain('ブロック')
    }
    for (const section of SECTIONS) expect(section.body).not.toContain('ブロック')
  })
})

describe('TutorialOverlay の描画', () => {
  const html = renderToStaticMarkup(createElement(TutorialOverlay, { onClose: () => {} }))

  it('② の本文とコツ 6 本がそのまま描画される', () => {
    expect(html).toContain('⚡「溜め」は次のラウンドに大技（必殺）が来る合図')
    expect(html).toContain('防御は次のラウンドに残りません。')
    const tipsList = html.slice(html.indexOf('tutorial-tips-list'))
    expect((tipsList.match(/<li>/g) ?? []).length).toBe(6)
  })

  it('決定263 の境界：戦闘画面には何も足していない（遊び方は任意表示のダイアログのまま）', () => {
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-label="遊び方"')
  })
})
