import { useMemo, useState } from 'react'
import type { CardDefId, GodId } from '../../core/types'
import { RULES } from '../../core/data/rules'
import { getCardPoolForGod, getRecommendedDeck } from '../../core/data/deckBuilder'
import { getCardArt } from '../../core/data/cardArt'
import { loadRewardBonuses } from '../../hooks/rewardStorage'
import { loadRewardHistory } from '../../hooks/rewardHistoryStorage'
import { loadDeckPreference } from '../../hooks/deckPreferenceStorage'
import { RARITY_STYLE, TYPE_STYLE } from './cardStyle'
import { CardIcon } from './cardIcon'
import { sfx } from './sound'
import { formatRewardCopies, pickRewardOffer, type RewardRole } from './rewardPicker'
import { formatCardBonus } from '../cardBonusText'

type RewardOverlayProps = {
  godId: GodId
  /** そのバトルのseed。3択の選出をここから決定論的に決める */
  seed: string
  /** 勝ったバトルの構成（`collectDeckCardIds(state)`）。20 枚に復元できないときは直前の編成／おすすめへ fallback */
  deckFromState: CardDefId[]
  /** 選択。`offeredIds` は提示した 3 枚（履歴の記録は呼び出し側が行う） */
  onPick: (cardId: CardDefId, offeredIds: CardDefId[]) => void
  /** 見送り。`offeredIds` は提示した 3 枚 */
  onSkip: (offeredIds: CardDefId[]) => void
}

/** 決定267：役割チップの文言 */
const ROLE_LABEL: Record<RewardRole, string> = {
  ready: '即戦力',
  identity: '神の個性',
  next: '次の構築',
  fill: '新しい選択肢',
}

/** 決定267（U2）：選択後トーストの表示時間。長ければ 900ms へ（AI 判断） */
export const REWARD_TOAST_MS = 1200

/**
 * 決定43：勝利後の報酬カード選択画面。
 * 選んだカードは、その神のデッキ構築で編成上限が+1される（`rewardStorage.ts`）。
 * デッキ枚数・専用カードの既存ルールには一切触れない、軽量なメタ進行。
 *
 * 決定267：3 択を「即戦力／神の個性／次の構築」の 3 役ローテーション（`pickRewardOffer`）に置き換え、
 * 各カードに役割チップと「いま n 枚編成中／上限 m → m+1」を添える。この画面は storage を**読むだけ**で
 * 書かない（履歴・bonus の記録は `BattleScreen` の callback 側＝AC18）。
 */
export function RewardOverlay({ godId, seed, deckFromState, onPick, onSkip }: RewardOverlayProps) {
  const [picked, setPicked] = useState<CardDefId | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const offer = useMemo(() => {
    const pool = getCardPoolForGod(godId)
    const recommended = getRecommendedDeck(godId)
    const deck20 = deckFromState.length === RULES.deck.size ? deckFromState : (loadDeckPreference(godId) ?? recommended)
    return pickRewardOffer({
      godId,
      seed,
      pool,
      deck20,
      bonuses: loadRewardBonuses(godId),
      history: loadRewardHistory(godId),
      recommended,
    })
  }, [godId, seed, deckFromState])
  const offeredIds = useMemo(() => offer.candidates.map((c) => c.card.id), [offer])

  const choose = (id: CardDefId) => {
    const candidate = offer.candidates.find((c) => c.card.id === id)
    setPicked(id)
    if (candidate) setToast(`次回の編成で『${candidate.card.name}』を ${candidate.maxCopies + 1} 枚まで積めます`)
    sfx.reward() // 決定128：Reward（獲得）の音
    window.setTimeout(() => onPick(id, offeredIds), REWARD_TOAST_MS)
  }

  return (
    <div className="reward-overlay">
      <div className="reward-card-panel">
        <h2 className="reward-title">報酬カードを1枚選ぼう</h2>
        <p className="reward-subtitle">選んだカードは、次回からこの神のデッキで1枚多く編成できます。</p>
        <div className="reward-cards">
          {offer.candidates.map(({ card, role, copiesInDeck, maxCopies }) => {
            const style = TYPE_STYLE[card.type]
            const rarity = RARITY_STYLE[card.rarity]
            const illustration = getCardArt(card.id)
            const copies = formatRewardCopies(copiesInDeck, maxCopies)
            return (
              <button
                key={card.id}
                type="button"
                className={`reward-card${picked === card.id ? ' reward-card-picked' : ''}`}
                style={{ borderColor: style.color, boxShadow: `0 0 0 2px ${rarity.ring}44` }}
                disabled={picked !== null}
                onClick={() => choose(card.id)}
                data-testid="reward-card"
                data-role={role}
                data-card-id={card.id}
              >
                <div className="reward-card-clip" aria-hidden="true">
                  {illustration ? (
                    <img
                      className="reward-card-illustration"
                      src={illustration}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={512}
                      height={768}
                    />
                  ) : (
                    <div className="reward-card-icon" style={{ color: style.color }}>
                      <CardIcon def={card} />
                    </div>
                  )}
                </div>
                <div className="reward-card-body">
                  <div className="reward-card-tags">
                    <span className="reward-role-chip" data-role={role}>
                      {ROLE_LABEL[role]}
                    </span>
                    {card.godId && <span className="reward-card-god">専用</span>}
                  </div>
                  <div className="reward-card-name">{card.name}</div>
                  <div className="reward-card-text">{card.text}</div>
                  {/* Phase 3 FINAL SPEC v0.1：3択で選ぶ前に条件付き追加効果を読めるようにする */}
                  {card.bonus && (
                    <div className="reward-card-effect-bonus">{formatCardBonus(card)}</div>
                  )}
                  <div className="reward-copies">
                    <div className="reward-copies-now">{copies.now}</div>
                    <div className="reward-copies-limit">{copies.limit}</div>
                    {copies.hint && <div className="reward-copies-hint">{copies.hint}</div>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        {toast ? (
          <div className="reward-toast" role="status" aria-live="polite" data-testid="reward-toast">
            {toast}
          </div>
        ) : (
          <button type="button" className="reward-skip" onClick={() => onSkip(offeredIds)} disabled={picked !== null} data-testid="reward-skip">
            今回は見送る
            <span className="reward-skip-note">この 3 枚は次の 2 勝では出ません</span>
          </button>
        )}
      </div>
    </div>
  )
}
