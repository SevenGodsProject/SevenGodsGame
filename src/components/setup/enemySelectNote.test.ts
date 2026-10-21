import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
// v1.0.2 統合：既定の敵選択が描画するのは CORE 7 体だけ（Pilot 敵 enemy_09 は ?pilot=threat 経路でしか現れない）
import { CORE_ENEMIES } from '../../core/data/enemies'
import { EnemySelectScreen, MAX_THREAT_STARS, ThreatStars } from './EnemySelectScreen'

/**
 * v1.0.1 敵選択注記（`docs/FIRST_PLAYER_UX_IMPROVEMENT_PROPOSAL_V1.md` §4-4・AI 判断）：
 * ★再付番と同時に、注記の 1 文目を「実測の手強さ」の定義へ書き換えたことを固定する。
 * 情報量は 1 文（51 字）だけ増やし、HP・ダメージ数値・行動表は引き続き出さない（スポイラーポリシー・決定263）。
 */
const NOTE_FIRST_SENTENCE = '（実測の手強さ：負けやすさ・受けるダメージ・倒すまでの長さ。最大5）。難易度の★とは別物です。'

describe('EnemySelectScreen の注記', () => {
  const html = renderToStaticMarkup(createElement(EnemySelectScreen, { onSelect: () => {}, onBack: () => {} }))

  it('1 文目は「★は脅威度（実測の手強さ…最大5）。難易度の★とは別物です。」', () => {
    expect(html).toContain('<strong>脅威度</strong>' + NOTE_FIRST_SENTENCE)
    // 「★は脅威度」＋1 文目＝52 コードポイント（設計書 §4-4 の「51」は ★ を除いた字数。SP375 で 3 行の見込み・acceptance で実測）
    expect([...('★は脅威度' + NOTE_FIRST_SENTENCE)].length).toBe(52)
  })

  it('2 文目「迷ったら「神に委ねる」で…」は不変・旧文言「敵の手強さの目安」は残っていない', () => {
    expect(html).toContain('迷ったら「神に委ねる」で、神々があなたの相手を選びます。')
    expect(html).not.toContain('敵の手強さの目安')
  })

  it('★は 7 体とも新しい rank で描画され、aria-label「脅威度 N / 5」が rank と一致する', () => {
    for (const enemy of CORE_ENEMIES) {
      const idx = html.indexOf(`>${enemy.name}<`)
      expect(idx, enemy.name).toBeGreaterThan(0)
      // この敵のカード内（名前の直前）にある最後の ThreatStars の aria-label を見る
      const before = html.slice(0, idx)
      const label = [...before.matchAll(/aria-label="脅威度 (\d) \/ 5"/g)].at(-1)
      expect(label?.[1], enemy.name).toBe(String(enemy.rank))
    }
    expect((html.match(/aria-label="脅威度 \d \/ 5"/g) ?? []).length).toBe(CORE_ENEMIES.length)
  })

  it('スポイラーポリシー：HP・ダメージ数値は出さない（注記の追加で増えていない。必殺の名前は従来どおり 1 行ヒントにだけ出る）', () => {
    for (const enemy of CORE_ENEMIES) {
      expect(html).not.toContain(`>${enemy.maxHp}<`)
      for (const action of enemy.actions) {
        if ('amount' in action) expect(html).not.toMatch(new RegExp(`[：:]\\s*${action.amount}\\b`))
      }
    }
    expect(html).not.toContain('maxHp')
  })
})

describe('ThreatStars', () => {
  it('rank の数だけ塗り、残りは空で 5 個固定（★5 は Boss 予約）', () => {
    for (const rank of [1, 2, 3, 4]) {
      const html = renderToStaticMarkup(createElement(ThreatStars, { rank }))
      expect((html.match(/star-filled/g) ?? []).length).toBe(rank)
      expect((html.match(/star-empty/g) ?? []).length).toBe(MAX_THREAT_STARS - rank)
      expect(html).toContain(`aria-label="脅威度 ${rank} / ${MAX_THREAT_STARS}"`)
    }
  })
})
