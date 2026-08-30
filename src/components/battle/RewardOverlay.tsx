import { useMemo, useState } from 'react'
import type { CardDefId, GodId } from '../../core/types'
import { getCardPoolForGod } from '../../core/data/deckBuilder'
import { getCardArt } from '../../core/data/cardArt'
import { RARITY_STYLE, TYPE_STYLE } from './cardStyle'
import { CardIcon } from './cardIcon'
import { sfx } from './sound'
import { pickRewardCandidates } from './rewardPicker'

type RewardOverlayProps = {
  godId: GodId
  /** そのバトルのseed。3択の選出をここから決定論的に決める */
  seed: string
  onPick: (cardId: CardDefId) => void
  onSkip: () => void
}

/**
 * 決定43：勝利後の報酬カード選択画面。
 * 選んだカードは、その神のデッキ構築で編成上限が+1される（`rewardStorage.ts`）。
 * デッキ枚数・専用カードの既存ルールには一切触れない、軽量なメタ進行。
 */
export function RewardOverlay({ godId, seed, onPick, onSkip }: RewardOverlayProps) {
  const [picked, setPicked] = useState<CardDefId | null>(null)
  const candidates = useMemo(() => {
    const pool = getCardPoolForGod(godId)
    return pickRewardCandidates(pool, `${seed}-reward`, 3)
  }, [godId, seed])

  const choose = (id: CardDefId) => {
    setPicked(id)
    sfx.reward() // 決定128：Reward（獲得）の音
    window.setTimeout(() => onPick(id), 260)
  }

  return (
    <div className="reward-overlay">
      <div className="reward-card-panel">
        <h2 className="reward-title">報酬カードを1枚選ぼう</h2>
        <p className="reward-subtitle">選んだカードは、次回以降このデッキで編成上限が1枚増えます。</p>
        <div className="reward-cards">
          {candidates.map((card) => {
            const style = TYPE_STYLE[card.type]
            const rarity = RARITY_STYLE[card.rarity]
            const illustration = getCardArt(card.id)
            return (
              <button
                key={card.id}
                type="button"
                className={`reward-card${picked === card.id ? ' reward-card-picked' : ''}`}
                style={{ borderColor: style.color, boxShadow: `0 0 0 2px ${rarity.ring}44` }}
                disabled={picked !== null}
                onClick={() => choose(card.id)}
              >
                <div className="reward-card-clip" aria-hidden="true">
                  {illustration ? (
                    <img
                      className="reward-card-illustration"
                      src={illustration}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="reward-card-icon" style={{ color: style.color }}>
                      <CardIcon def={card} />
                    </div>
                  )}
                </div>
                <div className="reward-card-body">
                  {card.godId && <div className="reward-card-god">専用</div>}
                  <div className="reward-card-name">{card.name}</div>
                  <div className="reward-card-text">{card.text}</div>
                </div>
              </button>
            )
          })}
        </div>
        <button type="button" className="reward-skip" onClick={onSkip} disabled={picked !== null}>
          今回は見送る
        </button>
      </div>
    </div>
  )
}
