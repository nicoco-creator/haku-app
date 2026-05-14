import { type ReactNode, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore, type AccentName } from '../core/store'
import { getAccent } from './tokens'
import { FushigiMini } from './FushigiMini'
import './transitions.css'

interface Props {
  title: string
  accent: AccentName
  backTo?: string
  hideFushigi?: boolean
  children: ReactNode
}

export function ModuleShell({ title, accent, backTo, hideFushigi, children }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const setBackgroundTint = useAppStore((s) => s.setBackgroundTint)

  useEffect(() => {
    setBackgroundTint(getAccent(accent))
    return () => setBackgroundTint(null)
  }, [accent, setBackgroundTint])

  const showFushigi = !hideFushigi && !location.pathname.startsWith('/vault')

  return (
    <>
      <div className="page-enter" style={{ minHeight: '100svh', padding: '0 16px 32px' }}>
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
      {showFushigi && <FushigiMini />}
    </>
  )
}
