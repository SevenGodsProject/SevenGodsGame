import type { CardInstance } from '../../core/types'
import { getCardDef } from '../../core/data/cards'
import { getGodDef } from '../../core/data/gods'
import { getCardArt } from '../../core/data/cardArt'
import { RARITY_STYLE, TYPE_STYLE } from './cardStyle'
import { CardIcon } from './cardIcon'

type CardViewProps = {
  instance: CardInstance
  affordable: boolean
  playable: boolean
  /** クリックされてから実際に手札を離れるまでの、使用演出中かどうか */
  playing: boolean
  onPlay: () => void
}

/**
 * カードの見た目（決定28で色付き四角から刷新、決定37でフルアート対応）。
 * イラストが用意できたカードは `cardArt.ts` の登録に従ってカード全面に
 * フルアートを敷き、下部の暗いグラデーション（`.card-view-body`自身の背景）の
 * 上に名前・効果文を重ねる。未登録のカードはこれまで通りタイプ別グラデーション＋
 * 透かしアイコンで質感を出す。神専用カードは、その神の立ち絵を
 * 背景に薄く敷いて特別感を足す（SGG Creator Kitは二次創作・商用利用許可済み）。
 */
export function CardView({ instance, affordable, playable, playing, onPlay }: CardViewProps) {
  const def = getCardDef(instance.defId)
  const style = TYPE_STYLE[def.type]
  const rarity = RARITY_STYLE[def.rarity]
  const cost = def.cost + (instance.costModifier ?? 0)
  const godArt = def.godId ? getGodDef(def.godId).art.front : null
  const illustration = getCardArt(def.id)

  return (
    <button
      type="button"
      className={`card-view${def.godId ? ' card-view-exclusive' : ''}${playing ? ' card-view-playing' : ''}${illustration ? ' card-view-has-art' : ''}`}
      style={{
        borderColor: style.color,
        opacity: playing ? undefined : affordable ? 1 : 0.45,
        background: `linear-gradient(165deg, ${style.dark} 0%, #0b0d17 62%)`,
        boxShadow: def.godId
          ? `inset 0 0 0 1px ${style.color}40, 0 6px 14px -9px ${style.color}77, 0 0 16px -3px #ffd16688, 0 0 0 2px ${rarity.ring}55`
          : `inset 0 0 0 1px ${style.color}40, 0 6px 14px -9px ${style.color}77, 0 0 0 2px ${rarity.ring}55`,
      }}
      disabled={!playable || !affordable}
      onClick={onPlay}
    >
      <div className="card-view-clip" aria-hidden="true">
        {illustration && (
          <img
            className="card-view-illustration"
            src={illustration}
            alt=""
            loading="lazy"
            decoding="async"
          />
        )}
        {!illustration && godArt && (
          <div className="card-view-art" style={{ backgroundImage: `url(${godArt})` }} />
        )}
        {!illustration && (
          <div className="card-view-icon-bg" style={{ color: style.color }}>
            <CardIcon def={def} />
          </div>
        )}
        <span className="card-view-shine" />
      </div>

      <div
        className="card-view-cost"
        style={{ background: `radial-gradient(circle at 35% 30%, ${style.glow}, ${style.color})` }}
      >
        {cost}
      </div>
      <div className="card-view-body">
        {def.godId && <div className="card-view-god">{getGodDef(def.godId).nameJa}専用</div>}
        <div className="card-view-name">
          {style.icon} {def.name}
        </div>
        <div className="card-view-type" style={{ color: style.color }}>
          {style.label}
        </div>
        <div className="card-view-text">{def.text}</div>
      </div>
    </button>
  )
}
