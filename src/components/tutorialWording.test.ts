import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TutorialOverlay } from './TutorialOverlay'
import { SECTIONS, TIPS } from './tutorialContent'

/**
 * v1.0.1 語彙補完（`docs/FIRST_PLAYER_UX_IMPROVEMENT_PROPOSAL_V1.md` 案 B・AI 判断）：
 * 完全版「遊び方」② と攻略のコツに、実戦で見る 3 記号（⚡ 溜め→必殺・連撃・防御の消滅）の事実説明があることを固定する。
 * 字数は `[...str].length`（コードポイント・絵文字 1 字）。断定語・おすすめ（どの札を出すか）は含めない（決定263 の境界）。
 *
 * v1.0.3 束 #1「初心者語彙 完結」（`docs/NEXT_QUALITY_IMPROVEMENT_PLAN_V1.md` §5-1・AI 判断）：
 *   (1) ② の「⚔ 連撃」→「連撃」（76 → 74 字・合計 ≥15 の連撃は burst グリフのため ⚔ を約束しない）
 *   (2) ③ の「防御」→「防御（ブロック）」（81 → 87 字・最長のまま）
 *   (3) コツ ③ の「防御」→「防御（ブロック）」（40 → 46 字）
 *   (4) コツ 7 本目「強打」「特大」（31 字）
 *   「ブロック」を許すのは ③ とコツ ③ の 2 箇所のみ。Brief（firstBattle.ts）は「防御」のまま＝firstBattle.test.ts 据え置き。
 */
describe('遊び方 ②（敵の予告）の確定文言', () => {
  const section = SECTIONS[1]

  it('見出しは「② 敵の予告を見よう」のまま・visual は実戦の予告（enemyIntent）のまま', () => {
    expect(section.title).toBe('② 敵の予告を見よう')
    expect(section.visual).toEqual({ kind: 'enemyIntent' })
  })

  it('本文は確定文言そのまま・74 字（v1.0.3：⚔ を外した）', () => {
    expect(section.body).toBe(
      '毎ラウンド、敵は次の行動を事前に見せます。⚡「溜め」は次のラウンドに大技（必殺）が来る合図、連撃は複数回当たります。防御はそのラウンドだけ有効です。',
    )
    expect([...section.body].length).toBe(74)
  })

  it('溜め・必殺・連撃・防御の 4 概念を実戦と同じ語で含む（⚔ は約束しない）', () => {
    for (const word of ['⚡', '溜め', '必殺', '連撃', '防御']) expect(section.body).toContain(word)
    // B-3：合計 ≥15 の連撃は実戦で burst グリフになり ⚔ が出ないため、遊び方で ⚔ を連撃の記号として約束しない
    expect(section.body).not.toContain('⚔')
  })

  it('他ステップの本文より長くない（③ が最長のまま）', () => {
    const longest = Math.max(...SECTIONS.map((s) => [...s.body].length))
    expect([...section.body].length).toBeLessThanOrEqual(longest)
    expect([...SECTIONS[2].body].length).toBe(longest)
  })
})

describe('遊び方 ③（神力とカード）の確定文言', () => {
  const section = SECTIONS[2]

  it('本文は確定文言そのまま・87 字・「防御（ブロック）」で実戦の 🛡／結果画面の「ブロック」と橋渡しする', () => {
    expect(section.body).toBe(
      'カード左上の数字が、必要な神力です。神力はラウンドが進むごとに増えます。余っても次のラウンドには持ち越せません。神力の範囲で、攻撃・防御（ブロック）・回復のカードを使えます。',
    )
    expect([...section.body].length).toBe(87)
    expect(section.body).toContain('防御（ブロック）')
  })
})

describe('攻略のコツ（TIPS）', () => {
  it('7 本・③ は防御（ブロック）の消滅（46 字）・神力の持ち越し不可（②）の直後に置く', () => {
    expect(TIPS).toHaveLength(7)
    expect(TIPS[1]).toContain('神力（AP）は次のラウンドへ持ち越せません')
    expect(TIPS[2]).toBe('防御（ブロック）は次のラウンドに残りません。大技が予告されたラウンドに合わせて出しましょう。')
    expect([...TIPS[2]].length).toBe(46)
  })

  it('7 本目は「強打」「特大」の読み方（31 字・末尾）。どの札で受けるかは言わない', () => {
    expect(TIPS[6]).toBe('予告の「強打」「特大」は、ふつうの攻撃より大きい一撃の印です。')
    expect([...TIPS[6]].length).toBe(31)
    expect(TIPS[6]).toContain('強打')
    expect(TIPS[6]).toContain('特大')
  })

  it('断定語（絶対・必ず）と、おすすめ語（おすすめ・正解・このカード）を使わない（決定263・CEO 禁止語）', () => {
    for (const tip of TIPS) {
      for (const banned of ['絶対', '必ず', 'おすすめ', '正解', 'このカード']) expect(tip).not.toContain(banned)
    }
  })

  it('「ブロック」は遊び方 ③ とコツ ③ の 2 箇所だけ（他のステップ・コツには出さない）', () => {
    TIPS.forEach((tip, i) => {
      if (i === 2) expect(tip).toContain('ブロック')
      else expect(tip).not.toContain('ブロック')
    })
    SECTIONS.forEach((section, i) => {
      if (i === 2) expect(section.body).toContain('ブロック')
      else expect(section.body).not.toContain('ブロック')
    })
  })
})

describe('TutorialOverlay の描画', () => {
  const html = renderToStaticMarkup(createElement(TutorialOverlay, { onClose: () => {} }))

  it('②③ の本文とコツ 7 本がそのまま描画される', () => {
    expect(html).toContain('⚡「溜め」は次のラウンドに大技（必殺）が来る合図')
    expect(html).toContain('攻撃・防御（ブロック）・回復のカード')
    expect(html).toContain('防御（ブロック）は次のラウンドに残りません。')
    expect(html).toContain('予告の「強打」「特大」は')
    const tipsList = html.slice(html.indexOf('tutorial-tips-list'))
    expect((tipsList.match(/<li>/g) ?? []).length).toBe(7)
  })

  it('決定263 の境界：戦闘画面には何も足していない（遊び方は任意表示のダイアログのまま）', () => {
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-label="遊び方"')
  })
})
