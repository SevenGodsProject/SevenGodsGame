import { useMemo, useState } from 'react'
import type { CardDef, CardDefId, GodId, GrowthPath } from '../../core/types'
import { RULES } from '../../core/data/rules'
import { getGodDef } from '../../core/data/gods'
import { getOtomoDef } from '../../core/data/otomo'
import { getCardArt } from '../../core/data/cardArt'
import { getCardPoolForGod, getMaxCopies, getRecommendedDeck, validateDeck } from '../../core/data/deckBuilder'
import { loadDeckPreference } from '../../hooks/deckPreferenceStorage'
import { loadRewardBonuses } from '../../hooks/rewardStorage'
import { RARITY_STYLE, TYPE_STYLE } from '../battle/cardStyle'
import { CardIcon } from '../battle/cardIcon'
import { describeEffectList } from './otomoEffectText'
import './setup.css'

type DeckBuilderScreenProps = {
  godId: GodId
  otomoGrowthPath: GrowthPath
  onOtomoGrowthPathChange: (path: GrowthPath) => void
  onConfirm: (deck: CardDefId[]) => void
  onBack: () => void
}

// 決定80（Phase 1）で「守り＝HP回復・ブロック」「力＝ダメージ・妨害」という
// 断定的な説明が一部のOTOMOで実データと矛盾していた（例：小槌は守り/攻めが逆）
// ため、方向性のみの表現に置き換えていた。Phase 3（CEO承認：案A）で、各絆の
// 童子（最大成長）時の実効果を`otomoEffectText.ts`で文章化して表示するように
// なったため、ここは`label`のみを持つ（説明文は`otomo.effectsByForm`等から
// 描画時に動的生成する。GROWTH_PATH_OPTIONS自体は神・OTOMOに依存しない
// 静的な選択肢定義のため、description欄をここに固定で持たせない）。
const GROWTH_PATH_OPTIONS: { value: GrowthPath; label: string }[] = [
  { value: 'guardian', label: '守りの絆' },
  { value: 'power', label: '力の絆' },
]

const TYPE_ORDER: CardDef['type'][] = ['attack', 'guard', 'resonance', 'support', 'hinder', 'oracle']

/** CardDefId → 編成に入っている枚数、のカウント表現に変換します */
function toCounts(deck: CardDefId[]): Map<CardDefId, number> {
  const counts = new Map<CardDefId, number>()
  for (const id of deck) {
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

function toDeck(counts: Map<CardDefId, number>): CardDefId[] {
  const deck: CardDefId[] = []
  for (const [id, count] of counts) {
    for (let i = 0; i < count; i++) deck.push(id)
  }
  return deck
}

/**
 * Phase 5：デッキ構築画面。
 *
 * CEO確認済みの方針：選べるのは「選んだ神の専用カード＋共通カード」のみ。
 * 決定24：デッキは20枚固定、同じカードは最大2枚まで。
 * 最初は`getRecommendedDeck`によるおすすめ構成を表示し、そこから
 * +/-で自由に調整できるようにしている（0から20枚選び切る手間を避けるため）。
 * 決定27：この神で過去にバトルを始めたことがあれば、その時のデッキ構成を
 * おすすめ構成の代わりに初期表示する（`loadDeckPreference`、localStorage）。
 * 決定43：報酬カードで獲得した編成上限のボーナス（`loadRewardBonuses`）も
 * ここで読み込み、+/-ボタンの上限判定・バリデーションの両方に反映する。
 */
export function DeckBuilderScreen({
  godId,
  otomoGrowthPath,
  onOtomoGrowthPathChange,
  onConfirm,
  onBack,
}: DeckBuilderScreenProps) {
  const god = getGodDef(godId)
  const otomo = getOtomoDef(god.otomoId)
  const pool = useMemo(() => getCardPoolForGod(godId), [godId])
  const bonusCopies = useMemo(() => loadRewardBonuses(godId), [godId])
  const [counts, setCounts] = useState<Map<CardDefId, number>>(() =>
    toCounts(loadDeckPreference(godId) ?? getRecommendedDeck(godId)),
  )

  const deck = useMemo(() => toDeck(counts), [counts])
  const validation = useMemo(() => validateDeck(deck, godId, bonusCopies), [deck, godId, bonusCopies])
  const total = deck.length

  const cardsByType = useMemo(() => {
    const grouped = new Map<CardDef['type'], CardDef[]>(TYPE_ORDER.map((t) => [t, []]))
    for (const card of pool) {
      grouped.get(card.type)?.push(card)
    }
    return grouped
  }, [pool])

  const addCopy = (id: CardDefId) => {
    setCounts((prev) => {
      const current = prev.get(id) ?? 0
      if (current >= getMaxCopies(id, bonusCopies)) return prev
      if (total >= RULES.deck.size) return prev
      const next = new Map(prev)
      next.set(id, current + 1)
      return next
    })
  }

  const removeCopy = (id: CardDefId) => {
    setCounts((prev) => {
      const current = prev.get(id) ?? 0
      if (current <= 0) return prev
      const next = new Map(prev)
      if (current === 1) next.delete(id)
      else next.set(id, current - 1)
      return next
    })
  }

  const resetToRecommended = () => setCounts(toCounts(getRecommendedDeck(godId)))
  const clearAll = () => setCounts(new Map())

  return (
    <div className="setup-screen">
      <h1 className="setup-title">{god.nameJa}のデッキを編成しよう</h1>
      <p className="setup-subtitle">
        カードは{RULES.deck.size}枚ちょうど、同じカードは基本{RULES.deckBuilding.maxCopiesPerCard}
        枚まで編成できます（報酬カードで上限が増えたカードは、それ以上編成できます）。
      </p>

      <p className="growth-path-resonance">
        共鳴発動：{describeEffectList(god.resonanceEffects) ?? '変化なし'}
      </p>

      <div className="growth-path-select" role="radiogroup" aria-label="OTOMOの成長の絆">
        <span className="growth-path-label">{otomo.nameJa}の成長：</span>
        {GROWTH_PATH_OPTIONS.map((opt) => {
          const dojiEffects =
            opt.value === 'power' ? otomo.powerPathEffectsByForm.doji : otomo.effectsByForm.doji
          const effectText = describeEffectList(dojiEffects) ?? '変化なし'
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={otomoGrowthPath === opt.value}
              className={`growth-path-option${otomoGrowthPath === opt.value ? ' growth-path-option-active' : ''}`}
              onClick={() => onOtomoGrowthPathChange(opt.value)}
            >
              <span className="growth-path-option-label">{opt.label}</span>
              <span className="growth-path-option-desc">童子まで育つと：{effectText}</span>
            </button>
          )
        })}
      </div>

      <div className="deck-builder-toolbar">
        <span className={`deck-builder-count${validation.valid ? ' deck-builder-count-ok' : ''}`}>
          {total} / {RULES.deck.size}
        </span>
        <button type="button" onClick={resetToRecommended}>
          おすすめデッキに戻す
        </button>
        <button type="button" className="deck-builder-clear-button" onClick={clearAll}>
          全て外す
        </button>
      </div>

      <div className="deck-builder-pool">
        {TYPE_ORDER.map((type) => {
          const cards = cardsByType.get(type) ?? []
          if (cards.length === 0) return null
          const style = TYPE_STYLE[type]
          return (
            <section key={type} className="deck-builder-section">
              <h2 style={{ color: style.color }}>
                {style.icon} {style.label}
              </h2>
              <div className="deck-builder-cards">
                {cards.map((card) => {
                  const count = counts.get(card.id) ?? 0
                  const rarity = RARITY_STYLE[card.rarity]
                  const illustration = getCardArt(card.id)
                  const maxCopies = getMaxCopies(card.id, bonusCopies)
                  const hasBonus = maxCopies > RULES.deckBuilding.maxCopiesPerCard
                  return (
                    <div
                      key={card.id}
                      className={`deck-builder-card${illustration ? ' deck-builder-card-has-art' : ''}`}
                      style={{ borderColor: style.color, boxShadow: `0 0 0 2px ${rarity.ring}44` }}
                    >
                      <div className="deck-builder-card-clip" aria-hidden="true">
                        {illustration ? (
                          <img
                            className="deck-builder-card-illustration"
                            src={illustration}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="deck-builder-card-icon" style={{ color: style.color }}>
                            <CardIcon def={card} />
                          </div>
                        )}
                      </div>
                      <div className="deck-builder-card-cost" style={{ background: style.color }}>
                        {card.cost}
                      </div>
                      <div className="deck-builder-card-body">
                        {card.godId && <div className="deck-builder-card-god">{god.nameJa}専用</div>}
                        {hasBonus && <div className="deck-builder-card-bonus">報酬で上限+{maxCopies - RULES.deckBuilding.maxCopiesPerCard}</div>}
                        <div className="deck-builder-card-name">{card.name}</div>
                        <div className="deck-builder-card-text">{card.text}</div>
                        <div className="deck-builder-card-stepper">
                          <button
                            type="button"
                            onClick={() => removeCopy(card.id)}
                            disabled={count <= 0}
                            aria-label={`${card.name}を1枚減らす`}
                          >
                            −
                          </button>
                          <span>
                            {count} / {maxCopies}
                          </span>
                          <button
                            type="button"
                            onClick={() => addCopy(card.id)}
                            disabled={count >= maxCopies || total >= RULES.deck.size}
                            aria-label={`${card.name}を1枚増やす`}
                          >
                            ＋
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {!validation.valid && (
        <ul className="deck-builder-errors">
          {validation.errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <div className="deck-builder-actions">
        <button type="button" onClick={onBack}>
          神を選び直す
        </button>
        <button type="button" disabled={!validation.valid} onClick={() => onConfirm(deck)}>
          この構成でバトル開始
        </button>
      </div>
    </div>
  )
}
