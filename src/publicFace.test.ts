import { describe, expect, it } from 'vitest'
import html from '../index.html?raw'
import manifest from '../public/site.webmanifest?raw'
import { APP_VERSION, BUILD_SHA, buildLabel } from './buildInfo'

/**
 * CM-01 Public Face Pack v1 の契約（docs/CM01_PUBLIC_FACE_PACK_V1_GATE.md）。
 * ビルド済み dist の検査は `scripts/public-face/check-head.mjs` が担当する。ここでは
 * ソース（index.html／manifest／buildInfo）の最低限の整合を固定する。
 */
const meta = (attrKey: 'name' | 'property', key: string): string | null => {
  const m = html.match(new RegExp(`<meta\\s+${attrKey}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content="([^"]*)"`))
  return m ? m[1]! : null
}

describe('index.html の <head>', () => {
  it('description・OGP・twitter:card・theme-color・icon・manifest・canonical を持つ', () => {
    expect(meta('name', 'description')).toBeTruthy()
    expect(meta('name', 'description')!.length).toBeLessThanOrEqual(160)
    for (const p of ['og:type', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:width', 'og:image:height', 'og:image:alt']) expect(meta('property', p), p).toBeTruthy()
    for (const n of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'theme-color']) expect(meta('name', n), n).toBeTruthy()
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
    expect(meta('property', 'og:url')).toBe('https://seven-gods-game.vercel.app/')
    expect(meta('property', 'og:image')!.startsWith('https://seven-gods-game.vercel.app/')).toBe(true)
    expect(meta('name', 'twitter:image')).toBe(meta('property', 'og:image'))
    expect(html).toMatch(/<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg" \/>/)
    expect(html).toMatch(/<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png" \/>/)
    expect(html).toMatch(/<link rel="manifest" href="\/site\.webmanifest" \/>/)
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/seven-gods-game\.vercel\.app\/" \/>/)
  })

  it('非公式作品であることを description で明示する（Kit Guidelines §6：公式・公認と誤認させない）', () => {
    expect(meta('name', 'description')).toContain('二次創作')
  })

  it('og:image は 1200×630 の専用画像（既存素材から合成・public 直下）で、宣言寸法と一致する', () => {
    const path = meta('property', 'og:image')!.replace('https://seven-gods-game.vercel.app', '')
    expect(path).toBe('/og-image.jpg')
    expect(Object.keys(import.meta.glob('../public/og-image.jpg'))).toHaveLength(1)
    expect(meta('property', 'og:image:width')).toBe('1200')
    expect(meta('property', 'og:image:height')).toBe('630')
    expect(meta('property', 'og:image:type')).toBe('image/jpeg')
  })
})

describe('site.webmanifest', () => {
  it('JSON として正しく、theme_color が meta theme-color と一致し、icons のパスが配信物にある', () => {
    const mf = JSON.parse(manifest) as { theme_color: string; icons: { src: string }[]; display: string }
    expect(mf.theme_color).toBe(meta('name', 'theme-color'))
    expect(mf.display).toBe('browser') // PWA は v1.0 DoD 外（ROADMAP §7「DoD に含めないもの」）
    const shipped = Object.keys(import.meta.glob('../public/*.{png,svg}')).map((k) => '/' + k.split('/').pop()!)
    for (const i of mf.icons) expect(shipped, i.src).toContain(i.src)
  })
})

describe('buildInfo', () => {
  it('version は package.json と同じ 1.0.0-rc.1、sha は 7 桁 hex か local／dev、ラベルは v<version> (<sha>)', () => {
    expect(APP_VERSION).toBe('1.0.0-rc.1')
    expect(BUILD_SHA).toMatch(/^([0-9a-f]{7}|local|dev)$/)
    expect(buildLabel()).toBe(`v${APP_VERSION} (${BUILD_SHA})`)
  })
})
