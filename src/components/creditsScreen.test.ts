/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CREDITS_FOOTER_LINES, CREDITS_LEAD, CREDITS_LINK_LABEL, CREDITS_SECTIONS, CREDITS_TITLE } from './setup/creditsText'
import { computeSnapshot } from './feedback/feedbackSnapshot'

/**
 * Legal／Credits 画面（CM-02／03）の契約。文言は creditsText.ts に閉じ、禁止語・必須語をここで固定する。
 * 文言の最終確認は CEO（docs/LEGAL_CREDITS_SCREEN_V1.md §2）。このテストは「書いてはいけないこと」を機械で守る。
 */
const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
const ALL_TEXT = [CREDITS_TITLE, CREDITS_LEAD, ...CREDITS_SECTIONS.flatMap((s) => [s.heading, ...s.lines]), ...CREDITS_FOOTER_LINES].join('\n')

describe('禁止語（断定・誤認を招く表現）が画面文言に無い', () => {
  it.each([
    ['権利クリア', /権利クリア/],
    ['権利処理済み', /権利処理済み/],
    ['許諾済み', /許諾済み/],
    ['ライセンス取得', /ライセンス取得/],
    ['商用利用可', /商用利用可/],
    ['人間製・手描き', /人間製|手描き/],
    ['公式ボイス・公式の声（Kit 配布音声を「公式」と表示しない）・神の音声（総称しない。統合済みは大耀 1 本）', /公式ボイス|公式の声|神の音声/],
    ['外部送信なしの断定', /外部送信なし|外部へ送信しません|一切送信しません/],
    ['公式・公認・提携の肯定', /(^|[^非])公式(?!・公認・提携作品ではありません)|公認(?!・提携作品ではありません)|提携(?!作品ではありません)/m],
  ])('%s', (_label, re) => {
    expect(ALL_TEXT).not.toMatch(re)
  })
})

describe('必須語（方針で必ず書くもの）', () => {
  it('非公式のファン作品・二次創作ガイドライン・SGG 運営の公式・公認・提携作品ではない', () => {
    expect(CREDITS_LEAD).toContain('非公式のファン作品')
    expect(CREDITS_LEAD).toContain('二次創作ガイドライン')
    expect(CREDITS_LEAD).toContain('公式・公認・提携作品ではありません')
  })
  it('Creator Kit の出典・BGM（Suno）・効果音（自作）・生成 AI・localStorage・Vercel の但し書き・問い合わせ先は準備中', () => {
    expect(ALL_TEXT).toContain('SEVENGODS Games Creator Kit')
    expect(ALL_TEXT).toContain('大耀の音声（あいさつ）')
    expect(ALL_TEXT).toContain('声の素材を本作で制作してはいません')
    expect(ALL_TEXT).toContain('Suno')
    expect(ALL_TEXT).toContain('効果音は制作者が合成')
    expect(ALL_TEXT).toContain('生成 AI')
    expect(ALL_TEXT).toContain('localStorage')
    expect(ALL_TEXT).toContain('Vercel')
    expect(ALL_TEXT).toContain('問い合わせ先は準備中')
  })
  it('確定文言（CEO 条件付き承認 2026-10-10）：SGG 運営へ問い合わせを送らない 1 文・生成記録が揃っていない素材の明示・制作者は SGG 運営とは別', () => {
    expect(ALL_TEXT).toContain('本作に関するお問い合わせを SGG 運営へ送ることはお控えください')
    expect(ALL_TEXT).toContain('生成時の記録（利用プラン・生成日時など）が揃っていないものがあり、制作者の責任で使用しています')
    expect(CREDITS_FOOTER_LINES).toContain('制作：SEVENDAO GAMES（SGG 運営とは別の個人制作スタジオです）')
  })
  it('クレジット行は SGG ガイドライン §4 の書式を含む', () => {
    expect(CREDITS_FOOTER_LINES).toContain('SEVENGODS（SGG）二次創作')
    expect(CREDITS_FOOTER_LINES).toContain('SEVENGODS Games Creator Kit')
  })
})

describe('配線（表示のみ・storage 0）', () => {
  it('CreditsScreen は creditsText だけを描き、storage・fetch に触れない', () => {
    const src = read('./setup/CreditsScreen.tsx')
    expect(src).toMatch(/from '\.\/creditsText'/)
    expect(src).not.toMatch(/localStorage|fetch\(|navigator\./)
    expect(src).toMatch(/data-testid="credits-screen"/)
    expect(src).toMatch(/home-cta-secondary credits-back/)
  })
  it('Home に「クレジット・権利表記」のリンクがあり、GameFlow が credits 画面を出す', () => {
    const home = read('./setup/HomeScreen.tsx')
    expect(home).toMatch(/onShowCredits/)
    expect(home).toMatch(/\{CREDITS_LINK_LABEL\}/)
    const flow = read('./GameFlow.tsx')
    expect(flow).toMatch(/setupScreen === 'credits'/)
    expect(flow).toMatch(/<CreditsScreen onBack=\{\(\) => setSetupScreen\('home'\)\} \/>/)
    expect(CREDITS_LINK_LABEL).toBe('クレジット・権利表記')
  })
  it('フィードバックの画面名は「クレジット」', () => {
    expect(computeSnapshot({ setupScreen: 'credits', godId: null, difficulty: 'normal', state: null }).screen).toBe('クレジット')
  })
  it('文言は creditsText.ts にだけある（画面側に生文字列を書かない）', () => {
    const src = read('./setup/CreditsScreen.tsx')
    expect(src).not.toMatch(/非公式|Creator Kit|Suno|localStorage/)
  })
})
