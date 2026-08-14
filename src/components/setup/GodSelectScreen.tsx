import { useMemo, useState } from 'react'
import type { Difficulty, GodId } from '../../core/types'
import { GODS } from '../../core/data/gods'
import { getOtomoDef } from '../../core/data/otomo'
import { loadGodRecord } from '../../hooks/recordStorage'
import { ARCHETYPE_LABEL, computeGodStats, countGodsByArchetype, describeSpecial, type GodStats } from './godStyle'
import './setup.css'

const STAT_AXES: { key: keyof GodStats; label: string; hint: string }[] = [
  { key: 'attack', label: '攻撃', hint: '神の一撃が敵に与えるダメージ' },
  {
    key: 'defense',
    label: '防御',
    hint: 'ブロック付与や、敵の攻撃力を下げる効果の合計（被ダメージを軽減する効果）',
  },
  { key: 'heal', label: '回復', hint: 'HPを回復する量' },
  {
    key: 'special',
    label: '特殊',
    hint: 'カードを引く・神力を得る・自分を強化する等、ダメージ以外の効果をまとめた目安の数値',
  },
]

/**
 * 4軸のステータスバー。`max`は7神中の最大値（呼び出し側で算出）に対する相対表示。
 *
 * CEOフィードバック「特殊が分かりにくい／防御や回復が0だと被弾時どうなるのか
 * 不安」への対応で、各行に`title`（ホバー説明）を付けた。0はあくまで「神の
 * 共鳴・OTOMO成長のボーナスに含まれていない」だけで、防御・回復カード自体は
 * どの神を選んでも共通デッキから使えるため、対応する詳しい説明は
 * `.god-select-legend`（呼び出し側）にまとめて表示している。
 */
function GodStatBars({
  stats,
  max,
  specialNote,
}: {
  stats: GodStats
  max: GodStats
  /** 「特殊」バーの中身の内訳（施策A：数字だけでは伝わらないため一言添える） */
  specialNote: string | null
}) {
  return (
    <div className="god-select-stats">
      {STAT_AXES.map(({ key, label, hint }) => {
        const value = stats[key]
        const maxValue = max[key]
        const ratio = maxValue > 0 ? Math.min(1, value / maxValue) : 0
        return (
          <div className="god-stat-block" key={key}>
            <div className="god-stat-row" title={hint}>
              <span className="god-stat-label">{label}</span>
              <span className="god-stat-track">
                <span
                  className={`god-stat-fill god-stat-fill-${key}`}
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </span>
              <span className="god-stat-value">{value}</span>
            </div>
            {key === 'special' && specialNote && <div className="god-stat-note">{specialNote}</div>}
          </div>
        )
      })}
    </div>
  )
}

type GodSelectScreenProps = {
  difficulty: Difficulty
  onDifficultyChange: (difficulty: Difficulty) => void
  onSelect: (godId: GodId) => void
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; description: string; stars: number }[] = [
  { value: 'easy', label: 'かんたん', description: '敵が弱く、HPも多め。まずはルールに慣れたい人向け', stars: 1 },
  { value: 'normal', label: 'ふつう', description: '標準的な難易度（推奨）', stars: 2 },
  { value: 'hard', label: 'むずかしい', description: '敵が強く、HPも少なめ。歯応えを求める人向け', stars: 3 },
]

const MAX_DIFFICULTY_STARS = 3

function DifficultyStars({ stars }: { stars: number }) {
  return (
    <span className="difficulty-option-stars" aria-hidden="true">
      {Array.from({ length: MAX_DIFFICULTY_STARS }, (_, i) => (
        <span key={i} className={i < stars ? 'star-filled' : 'star-empty'}>
          ★
        </span>
      ))}
    </span>
  )
}

/**
 * Phase 5：神選択画面。
 *
 * 決定18で神1柱につきOTOMOが1体自動的に決まるため、ここではOTOMOを
 * 個別に選ばせず、神を選んだ時点で編成（次のデッキ構築画面）に進む。
 * 決定39：難易度選択もここで行う。
 *
 * CEOフィードバック「神を選んだ後に、ゲームレベルを選択する構成のほうが
 * 分かりやすい」に対応し、①神を選ぶ→②難易度を選ぶ、の2ステップ構成に
 * 変更した（`pendingGodId`がnullの間は①、選ばれたら②を表示）。
 * `GameFlow`側のprops（`onSelect`が呼ばれた瞬間にデッキ構築画面へ進む
 * という契約）は変えず、ステップの見せ方だけをこのコンポーネント内の
 * ローカルstateで完結させている。
 */
export function GodSelectScreen({ difficulty, onDifficultyChange, onSelect }: GodSelectScreenProps) {
  const [pendingGodId, setPendingGodId] = useState<GodId | null>(null)
  const pendingGod = pendingGodId ? GODS.find((g) => g.id === pendingGodId) : undefined

  // 7神ぶんのステータスを1回だけ計算し、バーの相対表示に使う「軸ごとの最大値」を求める。
  // GODS/OTOMOSは静的データなので、選択操作のたびに再計算する必要はない。
  // 自己ベスト（`recordStorage.ts`、決定48フォローアップ）だけはlocalStorage由来で
  // マウント時点のスナップショットになるが、この画面自体がバトル終了→選び直しの
  // たびに再マウントされる（GameFlowが条件分岐でコンポーネントを切り替えるため）ので、
  // 常に最新の戦績が表示される。
  const { statsByGodId, maxStats, specialNoteByGodId, archetypeCounts, recordByGodId } = useMemo(() => {
    const entries = GODS.map((god) => [god.id, computeGodStats(god, getOtomoDef(god.otomoId))] as const)
    const statsByGodId = new Map(entries)
    const specialNoteByGodId = new Map(
      GODS.map((god) => [god.id, describeSpecial(god, getOtomoDef(god.otomoId))] as const),
    )
    const recordByGodId = new Map(GODS.map((god) => [god.id, loadGodRecord(god.id)] as const))
    const maxStats: GodStats = { attack: 0, defense: 0, heal: 0, special: 0 }
    for (const [, stats] of entries) {
      maxStats.attack = Math.max(maxStats.attack, stats.attack)
      maxStats.defense = Math.max(maxStats.defense, stats.defense)
      maxStats.heal = Math.max(maxStats.heal, stats.heal)
      maxStats.special = Math.max(maxStats.special, stats.special)
    }
    return { statsByGodId, maxStats, specialNoteByGodId, archetypeCounts: countGodsByArchetype(GODS), recordByGodId }
  }, [])

  return (
    <div className="setup-screen">
      <h1 className="setup-title">{pendingGod ? '難易度を選ぼう' : '共に戦う神を選ぼう'}</h1>

      {pendingGod ? (
        <>
          <p className="setup-subtitle">
            <strong>{pendingGod.nameJa}</strong>と共に挑む難易度を選んでください。
          </p>

          <button type="button" className="god-select-recap" onClick={() => setPendingGodId(null)}>
            <img src={pendingGod.art.main} alt={pendingGod.nameJa} />
            <span className="god-select-recap-body">
              <span className="god-select-recap-name">{pendingGod.nameJa}</span>
              <span className="god-select-recap-change">神を選び直す ›</span>
            </span>
          </button>

          <div className="difficulty-select" role="radiogroup" aria-label="難易度">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={difficulty === opt.value}
                className={`difficulty-option${difficulty === opt.value ? ' difficulty-option-active' : ''}`}
                onClick={() => onDifficultyChange(opt.value)}
              >
                <span className="difficulty-option-head">
                  <span className="difficulty-option-label">{opt.label}</span>
                  <DifficultyStars stars={opt.stars} />
                </span>
                <span className="difficulty-option-desc">{opt.description}</span>
              </button>
            ))}
          </div>

          <button type="button" className="god-select-confirm" onClick={() => onSelect(pendingGod.id)}>
            この構成で始める
          </button>
        </>
      ) : (
        <>
          <p className="setup-subtitle">選んだ神によって、共鳴発動時の一撃とOTOMOの成長効果が変わります。</p>

          <p className="god-select-legend">
            下の4項目は「共鳴発動時（神の一撃＋OTOMO成長）」のボーナス効果です。
            <strong>攻撃</strong>＝ダメージ、<strong>防御</strong>＝ブロック・敵の弱体化、
            <strong>回復</strong>＝HP回復、<strong>特殊</strong>＝ドロー・神力獲得・強化など。
            通常の攻撃・防御・回復はどの神を選んでも共通カードで使えるため、
            0の項目があっても被弾時に不利になるわけではありません。
          </p>

          <div className="god-select-grid">
            {GODS.map((god) => {
              const stats = statsByGodId.get(god.id)!
              const record = recordByGodId.get(god.id)!
              return (
                <button
                  key={god.id}
                  type="button"
                  className="god-select-card"
                  onClick={() => setPendingGodId(god.id)}
                >
                  <img src={god.art.main} alt={god.nameJa} />
                  <span className={`god-archetype-badge god-archetype-${god.archetype}`}>
                    {ARCHETYPE_LABEL[god.archetype]}
                    {archetypeCounts[god.archetype] === 1 && (
                      <span className="god-archetype-unique">・唯一</span>
                    )}
                  </span>
                  <div className="god-select-name">{god.nameJa}</div>
                  <div className="god-select-tagline">「{god.tagline}」</div>
                  {record.bestScore > 0 && (
                    <div className="god-select-record">自己ベスト {record.bestScore}（{record.wins}勝）</div>
                  )}
                  <GodStatBars stats={stats} max={maxStats} specialNote={specialNoteByGodId.get(god.id) ?? null} />
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
