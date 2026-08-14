import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { ALL_CARDS } from '../../core/data/cards'
import { CardIcon } from './cardIcon'

describe('CardIcon', () => {
  it('renders a non-empty svg for every card without throwing', () => {
    for (const def of ALL_CARDS) {
      const html = renderToStaticMarkup(createElement(CardIcon, { def }))
      expect(html).toContain('<svg')
      // 主アイコンは必ず何か描画されるので、空のsvgにはならない
      expect(html.length).toBeGreaterThan('<svg viewBox="0 0 100 100"></svg>'.length)
    }
  })
})
