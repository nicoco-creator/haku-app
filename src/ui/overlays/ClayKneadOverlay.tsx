import { useState } from 'react'
import { grantSouvenir } from '../../core/souvenirs'
import { GlassCard } from '../GlassCard'
import { colors } from '../tokens'

const MAX_TAPS = 3

interface Props {
  onClose: () => void
}

export function ClayKneadOverlay({ onClose }: Props) {
  const [taps, setTaps] = useState(0)
  const [transformed, setTransformed] = useState(false)
  const [souvenirShown, setSouvenirShown] = useState(false)
  const [ripple, setRipple] = useState(0)

  const handleTap = () => {
    if (transformed) return
    const next = taps + 1
    setTaps(next)
    setRipple((r) => r + 1)

    if (next >= MAX_TAPS) {
      setTimeout(() => {
        grantSouvenir('clay_star')
        setTransformed(true)
        setTimeout(() => setSouvenirShown(true), 600)
      }, 250)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(14,12,28,0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 28, padding: '32px 24px', userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes clayIdle   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes clayTap    { 0%{transform:scale(1)} 40%{transform:scale(0.88)} 100%{transform:scale(1.1)} }
        @keyframes starAppear { from{opacity:0;transform:scale(0.2) rotate(-40deg)} to{opacity:1;transform:scale(1) rotate(0)} }
        @keyframes ripple     { from{transform:scale(0.8);opacity:0.6} to{transform:scale(2.4);opacity:0} }
        @keyframes fadeUp     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
      `}</style>

      <p style={{
        fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
        fontSize: 'clamp(13px,3.5vw,15px)',
        color: colors.text.secondary,
        textAlign: 'center', lineHeight: 1.9, margin: 0, maxWidth: 280,
      }}>
        {transformed
          ? 'よかった。軽くなりましたね。'
          : `こねてください。あと${MAX_TAPS - taps}回。`}
      </p>

      {/* Clay / Star */}
      <div
        onClick={handleTap}
        style={{
          position: 'relative', cursor: transformed ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 120, height: 120,
        }}
      >
        {/* Ripple rings on tap */}
        {[...Array(ripple % 4)].map((_, i) => (
          <span
            key={`${ripple}-${i}`}
            style={{
              position: 'absolute',
              width: 80, height: 80,
              borderRadius: '50%',
              border: `1px solid ${colors.accent.silver}55`,
              animation: 'ripple 0.6s ease-out forwards',
            }}
          />
        ))}

        <span
          style={{
            fontSize: transformed ? 72 : `${56 + taps * 6}px`,
            lineHeight: 1, display: 'block',
            animation: transformed
              ? 'starAppear 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards'
              : taps > 0
              ? `clayTap 0.3s ease-out`
              : 'clayIdle 2.5s ease-in-out infinite',
            transition: 'font-size 0.25s ease',
          }}
        >
          {transformed ? '⭐' : '🏺'}
        </span>
      </div>

      {/* Progress dots */}
      {!transformed && (
        <div style={{ display: 'flex', gap: 10 }}>
          {Array.from({ length: MAX_TAPS }, (_, i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: taps > i ? colors.accent.silver : `${colors.accent.silver}30`,
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* Souvenir notification */}
      {souvenirShown && (
        <GlassCard
          size="sm"
          style={{
            maxWidth: 280, width: '100%', textAlign: 'center',
            animation: 'fadeUp 0.5s ease',
          }}
        >
          <p style={{
            fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10,
            color: colors.text.secondary, margin: '0 0 6px',
          }}>
            おみやげの小箱に届きました
          </p>
          <span style={{ fontSize: 28 }}>⭐</span>
          <p style={{
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 13, color: colors.text.primary,
            margin: '6px 0 4px', lineHeight: 1.5,
          }}>
            粘土から生まれた星
          </p>
          <p style={{
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 11, color: colors.text.secondary,
            margin: 0, lineHeight: 1.6,
          }}>
            重かったものが、こんな形になりました。
          </p>
        </GlassCard>
      )}

      {transformed && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: `1px solid ${colors.accent.silver}50`,
            borderRadius: 18, padding: '9px 28px',
            color: colors.text.primary,
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 13, cursor: 'pointer',
          }}
        >
          閉じる
        </button>
      )}
    </div>
  )
}
