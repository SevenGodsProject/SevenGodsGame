import type { CardDef, Effect } from '../../core/types'

/**
 * カードごとの識別アイコン（CEOフィードバック「カードに絵を入れて視覚的にわかるように
 * したい」への対応。SGG Creator Kitにはカードイラスト用の素材が無く、実写イラストは
 * 生成できないため、カードの`effects`データから機械的にSVGアイコンを組み立てる方式にした）。
 *
 * `Effect[]`から導出するため、決定不変ルール3（カード効果をハードコードしない）と同じ
 * 精神で「カードIDごとに手作業でアイコンを割り当てる」ことを避けている。新しいカードを
 * 追加しても、この対応表に手を入れる必要はない。
 *
 * 主アイコン（何のカードか）＋副バッジ（他にどんな効果が付いているか）の2層構成。
 */

export type GlyphKey =
  | 'sword'
  | 'swordHeavy'
  | 'burst'
  | 'shield'
  | 'shieldHeavy'
  | 'cross'
  | 'crossBig'
  | 'spiral'
  | 'arrowDown'
  | 'arrowDownLong'
  | 'chain'
  | 'cards'
  | 'bolt'
  | 'star'
  | 'buff'
  | 'drop'
  | 'eye'
  | 'flag'

function findEffect<K extends Effect['kind']>(
  effects: Effect[],
  kind: K,
): Extract<Effect, { kind: K }> | undefined {
  return effects.find((e): e is Extract<Effect, { kind: K }> => e.kind === kind)
}

/** カードの主効果から、代表となる主アイコンを決める */
function getPrimaryGlyph(def: CardDef): GlyphKey {
  switch (def.type) {
    case 'attack': {
      const dmg = def.effects.find((e) => e.kind === 'damage' && e.target === 'enemy')
      const amount = dmg && dmg.kind === 'damage' ? dmg.amount : 0
      if (amount >= 15) return 'burst'
      if (amount >= 10) return 'swordHeavy'
      return 'sword'
    }
    case 'guard': {
      const block = findEffect(def.effects, 'block')
      return (block?.amount ?? 0) >= 10 ? 'shieldHeavy' : 'shield'
    }
    case 'support': {
      const heal = findEffect(def.effects, 'heal')
      if (heal) return heal.amount >= 10 ? 'crossBig' : 'cross'
      if (def.effects.some((e) => e.kind === 'gainAp')) return 'bolt'
      if (def.effects.some((e) => e.kind === 'draw')) return 'cards'
      if (def.effects.some((e) => e.kind === 'buff')) return 'buff'
      return 'cross'
    }
    case 'resonance':
      return 'spiral'
    case 'hinder': {
      const debuff = findEffect(def.effects, 'debuff')
      if (debuff) {
        if (debuff.amount * debuff.rounds >= 18) return 'chain'
        if (debuff.rounds >= 3) return 'arrowDownLong'
      }
      return 'arrowDown'
    }
    case 'oracle':
      return 'star'
  }
}

/** 主アイコンで表現しきれていない、もう1つの効果があればバッジ用アイコンを返す */
function getSecondaryGlyph(def: CardDef, primary: GlyphKey): GlyphKey | null {
  for (const e of def.effects) {
    switch (e.kind) {
      case 'damage':
        if (e.target === 'self') return 'drop'
        if (primary !== 'sword' && primary !== 'swordHeavy' && primary !== 'burst') return 'sword'
        break
      case 'heal':
        if (primary !== 'cross' && primary !== 'crossBig') return 'cross'
        break
      case 'block':
        if (primary !== 'shield' && primary !== 'shieldHeavy') return 'shield'
        break
      case 'resonance':
        if (primary !== 'spiral') return 'spiral'
        break
      case 'draw':
        if (primary !== 'cards') return 'cards'
        break
      case 'gainAp':
        if (primary !== 'bolt') return 'bolt'
        break
      case 'debuff':
        if (primary !== 'arrowDown' && primary !== 'arrowDownLong' && primary !== 'chain') {
          return 'arrowDown'
        }
        break
      case 'buff':
        if (primary !== 'buff') return 'buff'
        break
      case 'score':
        if (primary !== 'star') return 'star'
        break
    }
  }
  return null
}

const STAR_POINTS =
  '50,12 58.8,37.9 86.1,38.3 64.3,54.6 72.3,80.7 50,65 27.7,80.7 35.7,54.6 13.9,38.3 41.2,37.9'
const BOLT_POINTS = '58,10 34,54 48,54 42,90 68,42 52,42'

function renderGlyph(key: GlyphKey) {
  switch (key) {
    case 'sword':
    case 'swordHeavy': {
      const heavy = key === 'swordHeavy'
      const w = heavy ? 12 : 8
      return (
        <g stroke="currentColor" strokeWidth={w} strokeLinecap="round" fill="none">
          <path d={heavy ? 'M50,6 L50,60' : 'M50,10 L50,60'} />
          <path d="M50,10 L42,20 M50,10 L58,20" />
          <path d={heavy ? 'M26,60 L74,60' : 'M30,60 L70,60'} strokeWidth={8} />
          <path d="M50,60 L50,88" strokeWidth={8} />
        </g>
      )
    }
    case 'burst': {
      const lines = Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI) / 4
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        return {
          x1: 50 + 14 * cos,
          y1: 50 + 14 * sin,
          x2: 50 + 42 * cos,
          y2: 50 + 42 * sin,
        }
      })
      return (
        <g stroke="currentColor" strokeWidth={8} strokeLinecap="round">
          {lines.map((l, i) => (
            // eslint-disable-next-line react/no-array-index-key -- 固定8方向の静的な装飾線でkeyに意味的な識別子が無いため
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
          ))}
        </g>
      )
    }
    case 'shield':
    case 'shieldHeavy': {
      const heavy = key === 'shieldHeavy'
      const path = 'M50,14 L82,27 L82,55 Q82,78 50,92 Q18,78 18,55 L18,27 Z'
      return (
        <g stroke="currentColor" fill="none">
          <path d={path} strokeWidth={heavy ? 11 : 8} />
          {heavy && (
            <path
              d="M50,30 L66,38 L66,55 Q66,68 50,76 Q34,68 34,55 L34,38 Z"
              strokeWidth={5}
            />
          )}
        </g>
      )
    }
    case 'cross':
    case 'crossBig': {
      const big = key === 'crossBig'
      return (
        <g stroke="currentColor" strokeLinecap="round">
          {big && <circle cx={50} cy={50} r={44} strokeWidth={5} fill="none" />}
          <path
            d={big ? 'M50,28 L50,72 M28,50 L72,50' : 'M50,20 L50,80 M20,50 L80,50'}
            strokeWidth={big ? 12 : 14}
          />
        </g>
      )
    }
    case 'spiral': {
      return (
        <g stroke="currentColor" strokeWidth={8} strokeLinecap="round" fill="none">
          {[0, 120, 240].map((deg) => (
            <path key={deg} d="M50,22 A28,28 0 0 1 73,50" transform={`rotate(${deg} 50 50)`} />
          ))}
        </g>
      )
    }
    case 'arrowDown':
    case 'arrowDownLong': {
      const long = key === 'arrowDownLong'
      return (
        <g stroke="currentColor" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none">
          {long ? (
            <>
              <path d="M28,30 L50,52 L72,30" />
              <path d="M28,54 L50,76 L72,54" />
            </>
          ) : (
            <>
              <path d="M50,16 L50,52" />
              <path d="M30,38 L50,60 L70,38" />
            </>
          )}
        </g>
      )
    }
    case 'chain':
      return (
        <g stroke="currentColor" strokeWidth={9} fill="none">
          <circle cx={38} cy={50} r={17} />
          <circle cx={66} cy={50} r={17} />
        </g>
      )
    case 'cards':
      return (
        <g stroke="currentColor" strokeWidth={6} fill="none">
          <rect x={20} y={24} width={34} height={46} rx={6} />
          <rect x={38} y={34} width={34} height={46} rx={6} />
        </g>
      )
    case 'bolt':
      return <polygon points={BOLT_POINTS} fill="currentColor" />
    case 'star':
      return <polygon points={STAR_POINTS} fill="currentColor" />
    case 'buff':
      return (
        <g stroke="currentColor" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx={50} cy={50} r={38} strokeWidth={6} />
          <path d="M32,58 L50,38 L68,58" />
        </g>
      )
    case 'drop':
      return (
        <path
          d="M50,14 C64,36 68,54 68,62 A18,18 0 1 1 32,62 C32,54 36,36 50,14 Z"
          fill="currentColor"
        />
      )
    case 'eye':
      return (
        <g stroke="currentColor" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M12,50 C24,26 40,18 50,18 C60,18 76,26 88,50 C76,74 60,82 50,82 C40,82 24,74 12,50 Z" />
          <circle cx={50} cy={50} r={13} fill="currentColor" stroke="none" />
        </g>
      )
    case 'flag':
      return (
        <g stroke="currentColor" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M28,14 L28,88" />
          <path d="M28,18 L78,28 L28,42 Z" fill="currentColor" />
        </g>
      )
  }
}

type CardIconProps = {
  def: CardDef
  className?: string
}

/** カードの`effects`から組み立てた識別アイコン（主アイコン＋副バッジ） */
export function CardIcon({ def, className }: CardIconProps) {
  const primary = getPrimaryGlyph(def)
  const secondary = getSecondaryGlyph(def, primary)
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {renderGlyph(primary)}
      {secondary && <g transform="translate(9,9) scale(0.34)">{renderGlyph(secondary)}</g>}
    </svg>
  )
}

type GlyphIconProps = {
  glyph: GlyphKey
  className?: string
}

/**
 * 単体のグリフだけを描画する汎用アイコン。`CardIcon`はカード専用（`effects`から
 * 自動判定）だが、遊び方説明など「カードを介さず特定のアイコンを直接指定したい」
 * 場面向けに、同じSVGプリミティブ群を再利用できるようにした（決定30の資産の再利用）。
 */
export function GlyphIcon({ glyph, className }: GlyphIconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {renderGlyph(glyph)}
    </svg>
  )
}
