import { useEffect, useRef, type CSSProperties } from 'react'
import type { GodId } from '../../core/types'
import { getGodDef } from '../../core/data/gods'
import { GOD_THEME_COLOR, KEYVISUAL_OBJECT_POSITION } from '../setup/godStyle'

type VictoryStageProps = {
  godId: GodId
  enemyName: string
  /** 既存の初撃破判定（`describeMatchupClear`）の 1 行。初撃破でなければ null */
  firstClearLine: string | null
  /** live＝「撃破」の拍（victoryPhase 'beat'）／backdrop＝結果画面の背景（'done'） */
  mode: 'live' | 'backdrop'
  /** live の間だけ呼ばれる：結果へ進む（表示の phase だけを進める。outcome・保存・スコアは不変） */
  onSkip: () => void
}

/**
 * 決定226 Victory Reveal v1：撃破 → 勝利の舞台（表示専用）。
 *
 * - 旧「撃破！」の拍（`victory-beat`・850ms）をこの舞台に置き換える。時刻表（`planVictory`）は変えない
 *   ＝追加の強制待機 0ms。結果画面が mount した後は、勝った神を結果の背景として残す
 * - 神の絵は共鳴カットイン（神の一撃）と同じ円形ポートレート（`keyvisual`＋`KEYVISUAL_OBJECT_POSITION`）。
 *   7 神とも透過なしの一枚絵なので、切り抜きではなく円で見せる。新規 asset 0
 * - 主役の順：勝利 → 神 → 敵 → 初撃破（該当時のみ）。スコアは結果画面のまま
 * - live の間は tap／click／Enter／Space で結果へ（click を使う：pointerdown で結果を出すと、
 *   同じ指の click が結果画面のボタンに落ちる恐れがあるため）
 * - `victory-beat` クラスと testid は live の間だけ付ける（既存の受け入れスクリプトが参照）
 */
export function VictoryStage({ godId, enemyName, firstClearLine, mode, onSkip }: VictoryStageProps) {
  const god = getGodDef(godId)
  const live = mode === 'live'
  const onSkipRef = useRef(onSkip)
  onSkipRef.current = onSkip

  useEffect(() => {
    if (!live) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Escape') return
      e.preventDefault()
      onSkipRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [live])

  const style = {
    '--god-accent': GOD_THEME_COLOR[godId].base,
    '--god-keyvisual-pos': KEYVISUAL_OBJECT_POSITION[godId],
  } as CSSProperties

  return (
    <div
      className={`victory-stage${live ? ' victory-beat is-live' : ' is-backdrop'}`}
      style={style}
      data-god={godId}
      data-testid={live ? 'victory-beat' : 'victory-stage'}
      role={live ? 'button' : undefined}
      aria-label={live ? '結果へ進む' : undefined}
      aria-hidden={live ? undefined : true}
      onClick={live ? () => onSkipRef.current() : undefined}
    >
      <div className="victory-stage-content" aria-hidden="true">
        <div className="victory-stage-rays" />
        <div className="victory-stage-band" />
        <div className="victory-stage-group">
          <div className="victory-stage-portrait">
            <img className="victory-stage-image" src={god.art.keyvisual} alt="" data-god={godId} />
            <i className="victory-stage-ring" />
          </div>
          <div className="victory-stage-caption">
            <div className="victory-stage-kicker">撃破</div>
            <div className="victory-stage-title">勝利</div>
            <div className="victory-stage-matchup">
              <strong className="victory-stage-god">{god.nameJa}</strong>
              <i className="victory-stage-sep">×</i>
              <b className="victory-stage-enemy">{enemyName}</b>
            </div>
            {firstClearLine && <div className="victory-stage-first" data-testid="victory-stage-first">{firstClearLine}</div>}
          </div>
        </div>
      </div>
      {/* 読み上げ用（見た目は caption と同じ内容） */}
      {live && (
        <p className="victory-stage-sr" role="status">
          勝利。{god.nameJa}で{enemyName}を撃破。{firstClearLine ?? ''}
        </p>
      )}
    </div>
  )
}
