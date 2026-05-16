import { useState } from 'react'
import { setReservedGift, useFromInventory } from '../../core/shop'
import { colors } from '../tokens'

interface Props {
  onClose: () => void
}

export function GiftWrapOverlay({ onClose }: Props) {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSend = () => {
    if (!message.trim()) return
    useFromInventory('gift_wrap')
    setReservedGift(message.trim())
    setSent(true)
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
        gap: 24, padding: '32px 24px',
      }}
    >
      <style>{`
        @keyframes giftBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes wrapIn     { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:none} }
      `}</style>

      {sent ? (
        <div style={{ textAlign: 'center', animation: 'wrapIn 0.5s ease' }}>
          <span style={{
            fontSize: 64, display: 'block', marginBottom: 20,
            animation: 'giftBounce 2s ease-in-out infinite',
          }}>
            🎁
          </span>
          <p style={{
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 17, color: colors.text.primary,
            margin: '0 0 12px', lineHeight: 1.8,
          }}>
            包みました。
          </p>
          <p style={{
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 13, color: colors.text.secondary,
            margin: '0 0 32px', lineHeight: 1.9,
          }}>
            次にアプリを開いたとき、届きます。
          </p>
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
        </div>
      ) : (
        <>
          <span style={{ fontSize: 36 }}>🎁</span>

          <p style={{
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 'clamp(13px,3.5vw,15px)',
            color: colors.text.secondary,
            textAlign: 'center', lineHeight: 1.9, margin: 0, maxWidth: 300,
          }}>
            未来の自分への言葉を書いてください。
            <br />
            <span style={{ fontSize: 12 }}>次にアプリを開いたとき、届きます。</span>
          </p>

          <div style={{ width: '100%', maxWidth: 360, position: 'relative' }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              placeholder="明日の自分へ..."
              style={{
                width: '100%', minHeight: 130,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${colors.accent.silver}33`,
                borderRadius: 16, padding: '14px 16px',
                color: colors.text.primary,
                fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                fontSize: 14, lineHeight: 1.8, resize: 'none',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <p style={{
              position: 'absolute', bottom: 10, right: 14,
              fontFamily: 'Inter,sans-serif', fontSize: 10,
              color: colors.text.secondary, margin: 0,
            }}>
              {message.length}/200
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 360 }}>
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 18,
                border: `1px solid ${message.trim() ? colors.accent.silver + '60' : 'rgba(255,255,255,0.1)'}`,
                background: message.trim() ? `${colors.accent.silver}18` : 'transparent',
                color: message.trim() ? colors.text.primary : colors.text.secondary,
                fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                fontSize: 13, cursor: message.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.18s',
              }}
            >
              包む
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 18,
                border: 'none', background: 'none',
                color: colors.text.secondary,
                fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                fontSize: 12, cursor: 'pointer',
              }}
            >
              やめておく
            </button>
          </div>
        </>
      )}
    </div>
  )
}
