import { type ReactNode, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore, type AccentName } from '../core/store'
import { getAccent } from './tokens'

interface Props {
  title: string
  accent: AccentName
  backTo?: string
  children: ReactNode
}

export function ModuleShell({ title, accent, backTo, children }: Props) {
  const navigate = useNavigate()
  const setBackgroundTint = useAppStore((s) => s.setBackgroundTint)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setBackgroundTint(getAccent(accent))
    return () => setBackgroundTint(null)
  }, [accent, setBackgroundTint])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(-3px)'
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out'
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    })
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ minHeight: '100svh', padding: '0 16px 32px' }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '20px 0 16px',
          color: getAccent(accent),
          fontFamily: "'Noto Sans JP', sans-serif",
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ← {title}
          </button>
        )}
        {!backTo && <span>{title}</span>}
      </header>
      {children}
    </div>
  )
}
