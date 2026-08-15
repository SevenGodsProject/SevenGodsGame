import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

/**
 * アプリ全体を覆う最終防衛線（FINAL_BACKLOG_8-31.md B候補「ErrorBoundary新設」）。
 *
 * 目的は「白画面事故」の保険のみ。ゲームロジック・状態の復旧は一切試みず、
 * 描画中に例外が発生した場合に日本語の簡単な案内とリロードボタンを表示するだけに
 * 留める（React公式のクラスコンポーネントによるエラーバウンダリはフック版が
 * 存在しないため、この1ファイルのみクラスコンポーネントを使用する）。
 * 既存の画面・状態管理には一切手を入れていない。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] 予期しないエラーで描画が停止しました', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            textAlign: 'center',
            background: '#0b0d17',
            color: '#e8e9f3',
            fontFamily: 'system-ui, sans-serif',
            zIndex: 9999,
          }}
        >
          <p style={{ fontSize: 18, margin: 0 }}>予期しないエラーが発生しました</p>
          <p style={{ fontSize: 13, color: '#9aa0c0', margin: 0, maxWidth: 360 }}>
            お手数をおかけしますが、下のボタンから再読み込みをお願いします。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              borderRadius: 999,
              border: '1px solid #ffd166',
              background: 'linear-gradient(180deg, #ffd16626, #ffd1660a)',
              color: '#ffd166',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            再読み込み
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
