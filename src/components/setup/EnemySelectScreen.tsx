import type { EnemyId } from '../../core/types'
import { ENEMIES } from '../../core/data/enemies'
import './setup.css'

/**
 * LANE-D（Enemy Select）：脅威度★の表示。最大5（★5は将来のBoss予約）。
 *
 * 難易度★（`DifficultyStars`、金色）との混同を防ぐため、
 * 1. 色は紫紅系（`.threat-stars`、setup.css）
 * 2. 必ず「脅威度」ラベルを添えて表示する（呼び出し側）
 * の2点で視覚的に区別する。DeckBuilderScreenの対戦相手チップからも再利用する。
 */
export const MAX_THREAT_STARS = 5

export function ThreatStars({ rank }: { rank: number }) {
  return (
    <span className="threat-stars" role="img" aria-label={`脅威度 ${rank} / ${MAX_THREAT_STARS}`}>
      {Array.from({ length: MAX_THREAT_STARS }, (_, i) => (
        <span key={i} className={i < rank ? 'star-filled' : 'star-empty'}>
          ★
        </span>
      ))}
    </span>
  )
}

type EnemySelectScreenProps = {
  /** 敵を選んだ（enemyId）／「神に委ねる」を選んだ（null＝従来のシード選出） */
  onSelect: (enemyId: EnemyId | null) => void
  /** 神選択（難易度）へ戻る */
  onBack: () => void
}

/**
 * LANE-D：敵選択画面（HOME→GOD SELECT→難易度→【ここ】→DECK→BATTLE）。
 *
 * スポイラーポリシー（CEO GO済み仕様）：見せるのは立ち絵・名前・脅威度★・
 * 【型】・1行ヒント・舞台名だけ。HP・ダメージ数値・行動テーブルは表示しない
 * （初見の読み合い＝決定4「行動予告を読む」体験を守るため）。
 *
 * 8枚目の「神に委ねる」はランダム＝現行のシード選出（`pickEnemyId`）と
 * 完全に同一の挙動。従来のプレイフィールをそのまま残す逃げ道でもある。
 *
 * カード縁色には`stage.accent`を使い、敵の性格を色で予感させる
 * （Stage systemアーキテクチャの最初の利用箇所。Battle側は注入のみ）。
 */
export function EnemySelectScreen({ onSelect, onBack }: EnemySelectScreenProps) {
  return (
    <div className="setup-screen">
      <h1 className="setup-title">挑む敵を選ぼう</h1>
      <p className="setup-subtitle">
        <span className="threat-stars-inline">★</span>
        は<strong>脅威度</strong>（敵の手強さの目安、最大5）。難易度の★とは別物です。
        <br />
        迷ったら「神に委ねる」で、神々があなたの相手を選びます。
      </p>

      <div className="enemy-select-grid">
        {ENEMIES.map((enemy) => (
          <button
            key={enemy.id}
            type="button"
            className="enemy-select-card"
            style={{
              ['--enemy-accent' as string]: enemy.stage.accent,
              ['--enemy-accent-soft' as string]: `${enemy.stage.accent}55`,
              ['--enemy-accent-glow' as string]: `${enemy.stage.accent}88`,
            }}
            onClick={() => onSelect(enemy.id)}
          >
            <img className="enemy-select-art" src={enemy.art} alt="" loading="lazy" decoding="async" />
            <span className="enemy-select-threat">
              <span className="threat-label">脅威度</span>
              <ThreatStars rank={enemy.rank} />
            </span>
            <span className="enemy-select-name">{enemy.name}</span>
            <span className="enemy-select-type">【{enemy.typeLabel}】</span>
            <span className="enemy-select-hint">{enemy.typeDescription}</span>
            <span className="enemy-select-stage">{enemy.stage.nameJa}</span>
          </button>
        ))}

        <button
          type="button"
          className="enemy-select-card enemy-select-card-entrust"
          onClick={() => onSelect(null)}
        >
          <span className="enemy-select-entrust-mark" aria-hidden="true">
            ⛩
          </span>
          <span className="enemy-select-name">神に委ねる</span>
          <span className="enemy-select-type">【おまかせ】</span>
          <span className="enemy-select-hint">対戦相手は神々が選ぶ。何が出るかはお楽しみ。</span>
          <span className="enemy-select-stage">舞台もまた、神のみぞ知る</span>
        </button>
      </div>

      {/* GodSelectScreenは戻ると神一覧ステップから再開する（pendingGodIdが
          ローカルstateのため）ので、ラベルもそれに合わせる */}
      <button type="button" className="home-cta-secondary enemy-select-back" onClick={onBack}>
        ‹ 神・難易度を選び直す
      </button>
    </div>
  )
}
