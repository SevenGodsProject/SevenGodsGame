/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import cutin from './BattleResonanceCutin.tsx?raw'
import { GOD_IDS } from '../../core/data/gods'
import { GOD_THEME_COLOR, KEYVISUAL_OBJECT_POSITION } from '../setup/godStyle'
import { RESONANCE_CUTIN_MS } from './enemyVfxTiming'

/**
 * Phase 6-D Visual Patch v1（決定168）「神の一撃＝専用舞台」の構造回帰。
 *
 * この演出で壊してはいけないのは見た目そのものではなく、
 *   ① burst-banner へのバトンタッチ（ルートの dim 0.2s ＋ timer 0.9s と
 *      `resonance-cutin-timer` だけを見る onAnimationEnd の契約）
 *   ② 子アニメーションが 900ms を超えないこと（超えると演出が途中で消える）
 *   ③ overlay のみ・画像追加なし・per-god 色のハードコードなし
 * の3点。実際の見え方・7神の撮影・タイムライン実測は
 * `scripts/phase6d-visual-audit/godstrike.mjs` が担当する。
 */

/** battle.css は Vite の CSS パイプラインを通ると `?raw` でも空になるため、実ファイルを読む */
const css = readFileSync(fileURLToPath(new URL('./battle.css', import.meta.url)), 'utf8')
const bare = css.replace(/\/\*[\s\S]*?\*\//g, '')

/** `セレクタ {` から対応する `}` までの本文（ネストの無いフラットなCSSを前提） */
function block(selector: string, from = 0): string {
  const at = bare.indexOf(selector + ' {', from)
  if (at < 0) throw new Error(`selector not found: ${selector}`)
  const open = bare.indexOf('{', at)
  const close = bare.indexOf('}', open)
  return bare.slice(open + 1, close)
}

/** `animation: name Xs ease-out Ys ...` から「終了時刻(ms)」を取り出す */
function animationEndMs(body: string): number {
  const decl = /animation:\s*([^;]+);/.exec(body)
  if (!decl) return 0
  const times = [...decl[1].matchAll(/(\d*\.?\d+)s\b/g)].map((m) => Number(m[1]) * 1000)
  if (times.length === 0) return 0
  // 1つ目が duration、2つ目があれば delay（CSS shorthand の順序）
  const duration = times[0]
  const delay = times[1] ?? 0
  return duration + delay
}

describe('Phase 6-D 神の一撃の専用舞台：burst へのバトンタッチを壊さない', () => {
  it('ルートは dim 0.2s ＋ timer 0.9s のまま（handoff の時刻が変わっていない）', () => {
    const root = block('.resonance-cutin')
    expect(root).toContain('resonance-cutin-dim 0.2s')
    expect(root).toContain('resonance-cutin-timer 0.9s')
    expect(root).toContain('position: fixed')
    expect(root).toContain('pointer-events: none')
  })

  it('JSX は resonance-cutin-timer だけを完了の起点にし、子のバブリングを弾いている', () => {
    expect(cutin).toContain("event.animationName !== 'resonance-cutin-timer'")
    expect(cutin).toContain('event.target !== event.currentTarget')
    // 時間切れの安全弁（決定162）も維持されていること
    expect(cutin).toContain('RESONANCE_CUTIN_MS + CUTIN_FALLBACK_MS')
  })

  it('子アニメーションはすべてカットインの尺（900ms）以内に終わる', () => {
    const children = [
      '.resonance-cutin-rays',
      '.resonance-cutin-band',
      '.resonance-cutin-group',
      '.resonance-cutin-title',
    ]
    for (const sel of children) {
      const end = animationEndMs(block(sel))
      expect(end, `${sel} の終了時刻`).toBeGreaterThan(0)
      expect(end, `${sel} の終了時刻`).toBeLessThanOrEqual(RESONANCE_CUTIN_MS)
    }
  })
})

describe('Phase 6-D 神の一撃の専用舞台：構造と制約', () => {
  it('舞台の3層（集中線・帯・神＋文字）と七つ刻みの環がそろっている', () => {
    for (const sel of [
      '.resonance-cutin-rays',
      '.resonance-cutin-band',
      '.resonance-cutin-group',
      '.resonance-cutin-portrait',
      '.resonance-cutin-image',
      '.resonance-cutin-ring',
      '.resonance-cutin-caption',
      '.resonance-cutin-god',
      '.resonance-cutin-title',
      '.resonance-cutin-sub',
    ]) {
      expect(() => block(sel), sel).not.toThrow()
    }
    for (const cls of ['resonance-cutin-rays', 'resonance-cutin-band', 'resonance-cutin-ring']) {
      expect(cutin).toContain(cls)
    }
  })

  it('神は円マスクで主役になり、環は 360°/7 の刻みで「七」を示す', () => {
    expect(block('.resonance-cutin-image')).toContain('border-radius: 50%')
    const ring = block('.resonance-cutin-ring')
    expect(ring).toContain('border-radius: 50%')
    // 51.4286deg = 360/7。共鳴ゲージ 7/7 と同じ分割
    expect(ring).toContain('51.4286deg')
    expect(ring).toMatch(/mask:/)
  })

  it('文言は 神名 → 神の一撃 → 共鳴発動 の3階層（新しい文言を作っていない）', () => {
    expect(cutin).toContain('{god.nameJa}')
    expect(cutin).toContain('神の一撃')
    expect(cutin).toContain('共鳴発動')
    // 旧「◯◯、共鳴発動！」の1行表示には戻っていない
    expect(cutin).not.toContain('、共鳴発動！')
  })

  it('明朝はカットインの中だけで、フォントファイルは足していない', () => {
    expect(block('.resonance-cutin-caption')).toContain('serif')
    expect(css).not.toMatch(/@font-face/)
    // HUD 側（HP ラベル）は既存のまま＝明朝にしていない
    expect(block('.resonance-cutin-title')).toContain('letter-spacing')
    expect(block('.hp-bar-label')).not.toContain('serif')
  })

  it('per-god の色と顔のトリミングは godStyle.ts の正式 source だけを使う', () => {
    expect(cutin).toContain('GOD_THEME_COLOR')
    expect(cutin).toContain('KEYVISUAL_OBJECT_POSITION')
    expect(cutin).toContain("'--god-accent'")
    // コンポーネント側に色を直書きしていない
    expect(cutin).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    // 正式 source は7神ぶんそろっている
    const ids = Object.values(GOD_IDS)
    expect(ids).toHaveLength(7)
    for (const id of ids) {
      expect(GOD_THEME_COLOR[id]?.base, `GOD_THEME_COLOR[${id}]`).toMatch(/^#[0-9a-f]{6}$/)
      expect(KEYVISUAL_OBJECT_POSITION[id], `KEYVISUAL_OBJECT_POSITION[${id}]`).toBeTruthy()
    }
    // 7神が一意の色を持つ（2神が同じ色だと神色の意味が消える）
    expect(new Set(ids.map((id) => GOD_THEME_COLOR[id].base)).size).toBe(7)
  })

  it('overlay のみ・画像追加なし・重い filter なし（6-B と性能の保護）', () => {
    const selectors = [
      '.resonance-cutin-rays',
      '.resonance-cutin-band',
      '.resonance-cutin-group',
      '.resonance-cutin-portrait',
      '.resonance-cutin-image',
      '.resonance-cutin-ring',
      '.resonance-cutin-caption',
      '.resonance-cutin-title',
    ]
    for (const sel of selectors) {
      const body = block(sel)
      expect(body, `${sel} は filter を使わない`).not.toMatch(/[^-]filter:/)
      expect(body, `${sel} は画像を読み込まない`).not.toContain('url(')
      expect(body, `${sel} は position:fixed を持たない（ルートだけが fixed）`).not.toContain('position: fixed')
    }
    expect(cutin).not.toContain('/assets/')
  })

  it('文字を切る要素がない（overflow:hidden を持たない＝はみ出しても欠けない）', () => {
    // 「文字切れ 0」は ①文字要素が overflow:hidden の中に無いこと ②要素が
    // viewport に収まること の2つで担保する。②は godstrike.mjs の inView が実測する。
    for (const sel of ['.resonance-cutin-caption', '.resonance-cutin-god', '.resonance-cutin-title', '.resonance-cutin-sub', '.resonance-cutin-group']) {
      expect(block(sel), `${sel}`).not.toMatch(/overflow[^:]*:\s*(hidden|clip)/)
    }
  })

  it('prefers-reduced-motion では拡大・回転・字間アニメを止め、内容は静的に全部出す', () => {
    const reduced = bare.slice(bare.indexOf('.resonance-cutin-rays'))
    const at = reduced.indexOf('@media (prefers-reduced-motion: reduce)')
    expect(at).toBeGreaterThanOrEqual(0)
    const scope = reduced.slice(at, at + 900)
    for (const sel of ['.resonance-cutin-rays', '.resonance-cutin-band', '.resonance-cutin-group', '.resonance-cutin-title']) {
      expect(scope, `${sel} の reduced-motion 上書き`).toContain(sel)
    }
    // 動きは消すが表示は消さない＝opacity だけのフェードに差し替える
    expect(scope).toContain('resonance-cutin-static-in')
    expect(scope).toContain('transform: none')
    expect(block('@keyframes resonance-cutin-static-in')).toContain('opacity')
    // 回転は reduced では 0 に戻す（band の傾きを打ち消している）
    expect(scope).toContain('transform: translate(0, -50%)')
  })
})
