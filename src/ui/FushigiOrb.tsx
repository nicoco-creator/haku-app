import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { glassCard, type Mood } from './tokens'

const BASE = import.meta.env.BASE_URL

interface Props {
  mode: 'hero' | 'mini'
  mood?: Mood
  message?: string
}

function TypewriterText({ text }: { text: string }) {
  const chars = [...text]
  const total = chars.length
  return (
    <>
      <style>{`@keyframes charIn{to{opacity:1}}`}</style>
      {chars.map((char, i) => (
        <span
          key={i}
          style={{
            opacity: 0,
            animation: 'charIn 0.08s ease forwards',
            animationDelay: `${(i / total) * 1.5}s`,
            whiteSpace: 'pre',
          }}
        >
          {char}
        </span>
      ))}
    </>
  )
}

const moodFilter: Record<Mood, CSSProperties> = {
  default: {},
  sleepy:  { filter: 'brightness(0.88) saturate(0.75)' },
  smile:   { filter: 'brightness(1.08) saturate(1.15) hue-rotate(-5deg)' },
  worried: { filter: 'brightness(0.85) hue-rotate(12deg) saturate(0.85)' },
}

export function FushigiOrb({ mode, mood = 'default', message }: Props) {
  const navigate = useNavigate()

  if (mode === 'mini') {
    return (
      <button
        onClick={() => navigate('/')}
        aria-label="ホームに戻る"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          cursor: 'pointer',
          overflow: 'hidden',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        <img
          src={`${BASE}fushigi-placeholder.svg`}
          alt=""
          width={50}
          height={50}
          style={{ borderRadius: '50%', ...moodFilter[mood] }}
        />
      </button>
    )
  }

  const orbSize = 'min(220px, 42vw)'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
      }}
    >
      <div
        style={{
          ...glassCard,
          borderRadius: '50%',
          width: orbSize,
          height: orbSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <img
          src={`${BASE}fushigi-placeholder.svg`}
          alt="フシギちゃん"
          style={{
            width: '88%',
            height: '88%',
            objectFit: 'cover',
            borderRadius: '50%',
            ...moodFilter[mood],
          }}
        />
      </div>

      {message && (
        <p
          style={{
            fontFamily: "'Noto Serif JP', serif",
            fontWeight: 300,
            fontSize: 'clamp(13px, 3.5vw, 16px)',
            color: '#F0EEF8',
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.8,
            maxWidth: '280px',
            minHeight: '3.2em',
          }}
        >
          <TypewriterText text={message} />
        </p>
      )}
    </div>
  )
}
