import { Component, type ErrorInfo, type ReactNode } from 'react'
import { colors } from './tokens'

interface Props {
  children:    ReactNode
  gadgetName?: string
  onError?:    (e: Error) => void
  onReset?:    () => void
}

interface State {
  hasError: boolean
  message:  string
  stack:    string
}

export class GadgetBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '', stack: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message, stack: error.stack ?? '' }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error('[GadgetBoundary] caught:', error)
    this.props.onError?.(error)
  }

  reset = () => {
    this.setState({ hasError: false, message: '', stack: '' })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        padding: '16px',
        background: 'rgba(180,40,40,0.18)',
        border: '1px solid rgba(220,80,80,0.4)',
        borderRadius: 16,
      }}>
        <p style={{
          margin: '0 0 6px',
          fontFamily: "'Noto Sans JP',sans-serif",
          fontSize: 13,
          color: '#ff8888',
        }}>
          ⚠️ フシギちゃんより: {this.props.gadgetName ?? 'ガジェット'}で何かが起きています。
        </p>
        <p style={{
          margin: '0 0 4px',
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#ffcccc',
          wordBreak: 'break-all',
        }}>
          {this.state.message}
        </p>
        <pre style={{
          margin: '6px 0 12px',
          fontFamily: 'monospace',
          fontSize: 10,
          color: 'rgba(255,180,180,0.6)',
          whiteSpace: 'pre-wrap',
          maxHeight: 120,
          overflow: 'auto',
        }}>
          {this.state.stack.split('\n').slice(0, 8).join('\n')}
        </pre>
        <button
          onClick={this.reset}
          style={{
            background: 'rgba(220,80,80,0.2)',
            border: '1px solid rgba(220,80,80,0.4)',
            borderRadius: 8,
            padding: '4px 14px',
            color: '#ffaaaa',
            cursor: 'pointer',
            fontFamily: "'Noto Sans JP',sans-serif",
            fontSize: 11,
          }}
        >
          リセット
        </button>
      </div>
    )
  }
}

// ── Thin wrapper used on the Home page ───────────────────────────────────────
// Wraps a gadget card; the delete button lives OUTSIDE so it always works.

interface HomeGadgetWrapProps {
  gadgetName: string
  children:   ReactNode
}

export function HomeGadgetWrap({ gadgetName, children }: HomeGadgetWrapProps) {
  return (
    <GadgetBoundary gadgetName={gadgetName}>
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 20,
        overflow: 'hidden',
        color: colors.text.primary,
      }}>
        <p style={{
          margin: 0,
          padding: '8px 14px 4px',
          fontFamily: "'Noto Sans JP',sans-serif",
          fontSize: 11,
          color: colors.text.secondary,
        }}>
          🧩 {gadgetName}
        </p>
        {children}
      </div>
    </GadgetBoundary>
  )
}
