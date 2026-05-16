import { useState, useEffect } from 'react'
import { colors } from '../tokens'

const ORBITING_WORDS = ['不安', '心配', 'ざわざわ', '焦り', '怖さ', 'モヤモヤ', '息苦しさ']
const DURATION = 180  // 3 minutes

function pad(n: number) { return String(n).padStart(2, '0') }

interface Props {
  onClose: () => void
}

export function CandleTimerOverlay({ onClose }: Props) {
  const [remaining, setRemaining] = useState(DURATION)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(id); setDone(true); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const progress = remaining / DURATION  // 1→0

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(10,8,22,0.97)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 28, padding: '32px 24px', userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes flicker {
          0%,100% { opacity:0.85; transform:scaleX(1) }
          20%      { opacity:1;   transform:scaleX(0.96) }
          60%      { opacity:0.78; transform:scaleX(1.03) }
        }
        @keyframes orbit0 { from{transform:rotate(0deg)   translateX(76px) rotate(0deg)}   to{transform:rotate(360deg)   translateX(76px) rotate(-360deg)} }
        @keyframes orbit1 { from{transform:rotate(51deg)  translateX(88px) rotate(-51deg)} to{transform:rotate(411deg)  translateX(88px) rotate(-411deg)} }
        @keyframes orbit2 { from{transform:rotate(102deg) translateX(68px) rotate(-102deg)}to{transform:rotate(462deg) translateX(68px) rotate(-462deg)} }
        @keyframes orbit3 { from{transform:rotate(153deg) translateX(84px) rotate(-153deg)}to{transform:rotate(513deg) translateX(84px) rotate(-513deg)} }
        @keyframes orbit4 { from{transform:rotate(204deg) translateX(72px) rotate(-204deg)}to{transform:rotate(564deg) translateX(72px) rotate(-564deg)} }
        @keyframes orbit5 { from{transform:rotate(255deg) translateX(92px) rotate(-255deg)}to{transform:rotate(615deg) translateX(92px) rotate(-615deg)} }
        @keyframes orbit6 { from{transform:rotate(306deg) translateX(78px) rotate(-306deg)}to{transform:rotate(666deg) translateX(78px) rotate(-666deg)} }
        @keyframes candleIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>

      <p style={{
        fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
        fontSize: 'clamp(13px,3.5vw,15px)',
        color: colors.text.secondary,
        textAlign: 'center', lineHeight: 1.9, margin: 0, maxWidth: 280,
        animation: 'candleIn 1s ease',
      }}>
        {done
          ? '3分、一緒にいました。\n少しだけ、静かになりましたか。'
          : 'なにも言わなくていいです。\nただそこにいて、火を見ていてください。'}
      </p>

      {/* Candle + orbiting words */}
      <div style={{
        position: 'relative', width: 200, height: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: `${Math.round(36 + 20 * progress)}px`,
          lineHeight: 1,
          display: 'block',
          animation: 'flicker 2.2s ease-in-out infinite',
          opacity: 0.3 + 0.7 * progress,
          transition: 'font-size 2s ease, opacity 2s ease',
        }}>
          🕯️
        </span>

        {!done && ORBITING_WORDS.map((word, i) => (
          <span
            key={i}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 10,
              color: `${colors.accent.silver}${Math.round((0.3 + 0.3 * progress) * 255).toString(16).padStart(2,'0')}`,
              whiteSpace: 'nowrap', transformOrigin: '0 0',
              animation: `orbit${i} ${20 + i * 3}s linear infinite`,
              transition: 'color 4s ease',
            }}
          >
            {word}
          </span>
        ))}
      </div>

      {!done ? (
        <>
          <p style={{
            fontFamily: 'Inter,sans-serif', fontWeight: 300,
            fontSize: 44, color: colors.text.primary,
            letterSpacing: '-0.04em', margin: 0, lineHeight: 1,
          }}>
            {pad(mins)}:{pad(secs)}
          </p>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: `1px solid ${colors.accent.silver}28`,
              borderRadius: 16, padding: '6px 22px',
              color: `${colors.text.secondary}99`,
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 11, cursor: 'pointer', letterSpacing: '0.05em',
            }}
          >
            そっと消す
          </button>
        </>
      ) : (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: `1px solid ${colors.accent.silver}55`,
            borderRadius: 18, padding: '10px 28px',
            color: colors.text.primary,
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 13, cursor: 'pointer', letterSpacing: '0.05em',
          }}
        >
          はい、ありがとう
        </button>
      )}
    </div>
  )
}
