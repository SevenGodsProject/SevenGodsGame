import { useState } from 'react'
import { describeSnapshot, formatFeedbackText, type FeedbackSnapshot } from './feedbackSnapshot'
import './feedback.css'

type FeedbackOverlayProps = {
  snapshot: FeedbackSnapshot
  onClose: () => void
}

type CopyState = 'idle' | 'copied' | 'failed'

/**
 * 実プレイ・フィードバック基盤（CEO承認：アプリ内フィードバック機能）。
 *
 * 配布・ホスティングの検討はいったん保留し、「今CEOや周囲の人が手元で遊んで
 * いる状況から、感想・不具合をそのまま送りやすくする」ことに絞った。
 * 外部サービス（フォーム・API）は使わず、自動添付したプレイ状況＋自由記述を
 * 1つのテキストにまとめてクリップボードにコピーするだけ。送り先（Discord・
 * LINE等）は問わない、送る手段そのものは既存の連絡手段に委ねる設計。
 *
 * `navigator.clipboard`が使えない環境（権限拒否・非対応ブラウザ）向けに、
 * 失敗時は読み取り専用のテキストエリアを表示し、手動選択コピーにフォール
 * バックする。
 */
export function FeedbackOverlay({ snapshot, onClose }: FeedbackOverlayProps) {
  const [comment, setComment] = useState('')
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const text = formatFeedbackText(snapshot, comment)

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard API unavailable')
      await navigator.clipboard.writeText(text)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <div className="feedback-overlay" role="dialog" aria-modal="true" aria-label="フィードバックを送る">
      <div className="feedback-card">
        <h1 className="feedback-title">ご感想・不具合を送る</h1>
        <p className="feedback-hint">
          気づいたことを自由に書いてください。今のプレイ状況は自動で添えられます。
        </p>

        <textarea
          className="feedback-textarea"
          value={comment}
          onChange={(e) => {
            setComment(e.target.value)
            setCopyState('idle')
          }}
          placeholder="例：才華のカードがもっと強く見えるといい／R5で敵の予告が読みづらかった、など"
          rows={4}
          autoFocus
        />

        <div className="feedback-snapshot">
          <span className="feedback-snapshot-label">自動添付</span>
          <span className="feedback-snapshot-body">{describeSnapshot(snapshot)}</span>
        </div>

        {copyState === 'failed' && (
          <>
            <p className="feedback-copy-fallback-hint">
              自動コピーに失敗しました。下のテキストを選択してコピーしてください。
            </p>
            <textarea
              className="feedback-textarea feedback-textarea-readonly"
              value={text}
              readOnly
              rows={6}
              onFocus={(e) => e.currentTarget.select()}
            />
          </>
        )}

        <div className="feedback-actions">
          <button type="button" className="feedback-copy" onClick={handleCopy}>
            {copyState === 'copied' ? 'コピーしました ✓' : 'クリップボードにコピー'}
          </button>
          <button type="button" className="feedback-close" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
