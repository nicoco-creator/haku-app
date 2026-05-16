import { useEffect, useRef, useState } from 'react'
import { GadgetRuntime, parseGadget } from '../core/gadget-engine'
import { colors } from './tokens'

interface Props {
  code:      string
  onError?:  (msg: string) => void
  onSuccess?: () => void
}

export function GadgetMount({ code, onError, onSuccess }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const runtimeRef   = useRef<GadgetRuntime | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    setError(null)
    let runtime: GadgetRuntime | null = null

    try {
      const result = parseGadget(code)
      if (!result.ok) {
        setError(result.error)
        onError?.(result.error)
        return
      }
      runtime = new GadgetRuntime(result.options, el)
      runtimeRef.current = runtime
      onSuccess?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      onError?.(msg)
    }

    return () => {
      runtime?.destroy()
      runtimeRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  if (error) {
    return (
      <div style={{
        padding: '12px 14px',
        background: 'rgba(180,40,40,0.15)',
        border: '1px solid rgba(220,80,80,0.3)',
        borderRadius: 12,
        margin: '8px',
      }}>
        <p style={{
          margin: '0 0 4px',
          fontFamily: "'Noto Sans JP',sans-serif",
          fontSize: 12,
          color: '#ff8888',
        }}>
          ⚠️ フシギちゃんより: ガジェットでエラーが起きました
        </p>
        <pre style={{
          margin: 0,
          fontFamily: 'monospace',
          fontSize: 11,
          color: 'rgba(255,180,180,0.8)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {error}
        </pre>
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
