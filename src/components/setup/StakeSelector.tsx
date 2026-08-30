import type { GodId } from '../../core/types'
import type { StakeChoiceId } from '../../core/types'
import {
  STAKE_CHOICES,
  STAKE_LEVELS,
  describeStakeRules,
  getStakeLevelDef,
  isStakeLevel,
  stakeScoreScale,
} from '../../core/data/stakes'
import { loadGodStakeRecord, maxSelectableStake } from '../../hooks/stakeStorage'
import { formatScaled } from '../displayScale'
import './setup.css'

type StakeSelectorProps = {
  godId: GodId
  /** 0＝通常（難易度のみ）、1〜7＝神階Ⅰ〜Ⅶ */
  stake: number
  onStakeChange: (stake: number) => void
  stakeChoice: StakeChoiceId | null
  onStakeChoiceChange: (choice: StakeChoiceId) => void
}

/**
 * 決定126：神階（しんかい）Ⅰ〜Ⅶ の選択UI。既存の難易度画面の下に置き、画面を増やさない。
 * - 未解放（その神で「むずかしい」未撃破）は解放条件だけを1行で示す
 * - 到達済み＝金、次に挑める段＝白、未到達＝灰🔒（選べるのは到達済み最高段+1まで）
 * - 選択中の段の累積ルールを3行以内に要約し、スコア倍率と段別ベストを添える
 * - Ⅶは最終試練を1つ選ぶ（既定は「猛威」）
 * Ⅰ〜Ⅵで現世の神域を奥へ進み、最終試練を越えた者だけがⅦ「高天原」へ至る。
 */
export function StakeSelector({ godId, stake, onStakeChange, stakeChoice, onStakeChoiceChange }: StakeSelectorProps) {
  const maxSelectable = maxSelectableStake(godId)
  const record = loadGodStakeRecord(godId)
  const selected = isStakeLevel(stake) ? stake : 0
  const def = selected > 0 ? getStakeLevelDef(selected) : null
  const lines = describeStakeRules(selected, stakeChoice)
  const best = selected > 0 ? (record.bestByStake[String(selected)] ?? 0) : 0

  if (maxSelectable === 0) {
    return (
      <section className="stake-select stake-select-locked" aria-label="神階">
        <div className="stake-select-head">
          <span className="stake-select-title">神階（しんかい）</span>
          <span className="stake-select-lock">🔒 この神で「むずかしい」を1回撃破すると解放</span>
        </div>
        <p className="stake-select-flavor">Ⅰ〜Ⅵで現世の神域を奥へ進み、最終試練を越えた者だけがⅦ「高天原」へ至る。</p>
      </section>
    )
  }

  return (
    <section className="stake-select" aria-label="神階">
      <div className="stake-select-head">
        <span className="stake-select-title">神階（しんかい）</span>
        <span className="stake-select-reach">最高到達 {record.maxCleared > 0 ? getStakeLevelDef(record.maxCleared)?.numeral : '—'}</span>
      </div>
      <div className="stake-grid" role="radiogroup" aria-label="神階の段">
        <button
          type="button"
          role="radio"
          aria-checked={selected === 0}
          className={`stake-chip stake-chip-none${selected === 0 ? ' stake-chip-active' : ''}`}
          onClick={() => onStakeChange(0)}
        >
          なし
        </button>
        {STAKE_LEVELS.map((lv) => {
          const cleared = lv.level <= record.maxCleared
          const selectable = lv.level <= maxSelectable
          return (
            <button
              key={lv.level}
              type="button"
              role="radio"
              aria-checked={selected === lv.level}
              disabled={!selectable}
              title={selectable ? lv.addedRuleJa : '前の段を撃破すると解放'}
              className={`stake-chip${cleared ? ' stake-chip-cleared' : ''}${selected === lv.level ? ' stake-chip-active' : ''}${selectable ? '' : ' stake-chip-locked'}`}
              onClick={() => onStakeChange(lv.level)}
            >
              <span className="stake-chip-numeral">{lv.numeral}</span>
              <span className="stake-chip-name">{lv.nameJa}</span>
              {!selectable && <span className="stake-chip-lockmark" aria-hidden="true">🔒</span>}
            </button>
          )
        })}
      </div>
      {def ? (
        <div className="stake-detail">
          <div className="stake-detail-head">
            <strong>
              神階{def.numeral} {def.nameJa}
            </strong>
            <span className="stake-detail-scale">スコア ×{stakeScoreScale(selected).toFixed(2)}</span>
          </div>
          <p className="stake-detail-flavor">{def.flavorJa}</p>
          <ul className="stake-detail-rules">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          {selected === 7 && (
            <div className="stake-choice" role="radiogroup" aria-label="最終試練">
              {STAKE_CHOICES.map((c) => {
                const active = (stakeChoice ?? 'pressure') === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`stake-choice-option${active ? ' stake-choice-active' : ''}`}
                    onClick={() => onStakeChoiceChange(c.id)}
                  >
                    <span className="stake-choice-name">{c.nameJa}</span>
                    <span className="stake-choice-rule">{c.ruleJa}</span>
                  </button>
                )
              })}
            </div>
          )}
          <p className="stake-detail-note">
            難易度は「ふつう」基準に固定されます。
            {best > 0 ? ` この段の自己ベスト：${formatScaled(best)}` : ' この段はまだ未挑戦です。'}
          </p>
        </div>
      ) : (
        <p className="stake-detail-note">段を選ばなければ、上の難易度どおりの通常戦です。</p>
      )}
    </section>
  )
}
