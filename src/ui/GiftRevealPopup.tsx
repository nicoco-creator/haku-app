import { useState } from 'react'
import { clearReservedGift } from '../core/shop'
import { GlassCard } from './GlassCard'
import { colors } from './tokens'

interface Props {
  message: string
  writtenAt: string
  onClose: () => void
}

export function GiftRevealPopup({ message, writtenAt, onClose }: Props) {
  const [opened, setOpened] = useState(false)
  const dateStr = writtenAt.slice(0, 10)

  const handleOpen = () => setOpened(true)

  const handleClose = () => {
    clearReservedGift()
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 8500,
        background: 'rgba(14,12,28,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <style>{`
        @keyframes giftFloat { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-8px) rotate(2deg)} }
        @keyframes revealIn  { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:none} }
        @keyframes msgIn     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>

      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        {!opened ? (
          <div style={{ animation: 'revealIn 0.5s ease' }}>
            <span style={{
              fontSize: 72, display: 'block', marginBottom: 20,
              animation: 'giftFloat 3s ease-in-out infinite',
              cursor: 'pointer',
            }}
              onClick={handleOpen}
            >
              🎁
            </span>
            <p style={{
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 15, color: colors.text.secondary,
              lineHeight: 1.9, margin: '0 0 8px',
            }}>
              過去の自分から、お守りが届いています。
            </p>
            <p style={{
              fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11,
              color: `${colors.text.secondary}80`, margin: '0 0 28px',
            }}>
              {dateStr}
            </p>
            <button
              onClick={handleOpen}
              style={{
                background: 'none',
                border: `1px solid ${colors.accent.silver}55`,
                borderRadius: 18, padding: '10px 32px',
                color: colors.text.primary,
                fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                fontSize: 13, cursor: 'pointer', letterSpacing: '0.05em',
              }}
            >
              開ける
            </button>
          </div>
        ) : (
          <div style={{ animation: 'revealIn 0.4s ease' }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 20 }}>🎁</span>

            <GlassCard size="sm" style={{ textAlign: 'left', marginBottom: 24, animation: 'msgIn 0.5s 0.1s ease both' }}>
              <p style={{
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10,
                color: colors.text.secondary, margin: '0 0 10px',
              }}>
                {dateStr} の自分から
              </p>
              <p style={{
                fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                fontSize: 14, color: colors.text.primary,
                margin: 0, lineHeight: 2, whiteSpace: 'pre-wrap',
              }}>
                {message}
              </p>
            </GlassCard>

            <p style={{
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 12, color: colors.text.secondary,
              lineHeight: 1.9, margin: '0 0 24px',
            }}>
              受け取りました。
            </p>

            <button
              onClick={handleClose}
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
          </div>
        )}
      </div>
    </div>
  )
}
