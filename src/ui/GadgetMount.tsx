import { useEffect, useRef, useState } from 'react'
import { GadgetRuntime, parseGadget, type ParseError } from '../core/gadget-engine'
import { colors } from './tokens'

interface Props {
  code:       string
  onError?:   (detail: ParseError) => void
  onSuccess?: () => void
}

export function GadgetMount({ code, onError, onSuccess }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const runtimeRef   = useRef<GadgetRuntime | null>(null)
  const [error, setError] = useState<ParseError | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    setError(null)
    let runtime: GadgetRuntime | null = null

    try {
      const result = parseGadget(code)
      if (!result.ok) {
        const detail: ParseError = { message: result.message, errorType: result.errorType, stack: result.stack, hint: result.hint }
        setError(detail)
        onError?.(detail)
        return
      }
      runtime = new GadgetRuntime(result.options, el)
      runtimeRef.current = runtime
      onSuccess?.()
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      const detail: ParseError = {
        errorType: err.name || 'Error',
        message:   err.message,
        stack:     err.stack ?? '',
        hint:      '実行中に予期しないエラーが発生しました。data() またはテンプレートを確認してください。',
      }
      setError(detail)
      onError?.(detail)
    }

    return () => {
      runtime?.destroy()
      runtimeRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  if (error) {
    return (
      <div style={{ padding: '10px 12px', margin: '6px' }}>
        <p style={{ margin: '0 0 3px', fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11, color: '#ff8888' }}>
          ⚠️ {error.errorType}: {error.message}
        </p>
        <p style={{ margin: '0 0 4px', fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10, color: 'rgba(255,200,130,0.8)' }}>
          💡 {error.hint}
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ padding: '8px', minHeight: '48px', color: colors.text.primary }}
    />
  )
}
