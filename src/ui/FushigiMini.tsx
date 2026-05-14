import { useNavigate } from 'react-router-dom'
import './transitions.css'
import type { Mood } from './tokens'

const BASE = import.meta.env.BASE_URL

interface Props {
  mood?: Mood
}

export function FushigiMini({ mood: _mood }: Props) {
  const navigate = useNavigate()

  return (
    <div
      className={[
        'fixed z-50',
        'bottom-6 right-6',
        'md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:right-5',
        'fushigi-mini-enter',
      ].join(' ')}
    >
      <button
        onClick={() => navigate('/')}
        aria-label="ホームに戻る"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.22)',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          cursor: 'pointer',
          overflow: 'hidden',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          transition: 'transform 0.2s ease, filter 0.2s ease',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        }}
        onMouseEnter={e => {
          const b = e.currentTarget as HTMLButtonElement
          b.style.transform = 'scale(1.08)'
          b.style.filter = 'brightness(1.1)'
        }}
        onMouseLeave={e => {
          const b = e.currentTarget as HTMLButtonElement
          b.style.transform = ''
          b.style.filter = ''
        }}
      >
        <img
          src={`${BASE}fushigi-placeholder.png`}
          alt="フシギちゃん"
          width={50}
          height={50}
          style={{ borderRadius: '50%', objectFit: 'cover', pointerEvents: 'none' }}
        />
      </button>
    </div>
  )
}
