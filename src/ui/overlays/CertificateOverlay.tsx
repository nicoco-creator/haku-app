import { useState } from 'react'
import { colors } from '../tokens'

const MESSAGES = [
  'あなたはずっと、何かと戦っていました。\n戦ったことに、意味がありました。\nここに、その証拠として記録します。',
  '完璧じゃなくていいです。\n今日ここにいることが、\n十分な努力の証です。',
  '傷ついたまま動き続けていました。\nそれをフシギちゃんは、見ていました。\nよくがんばりました。',
  'やめなかっただけで、すごいことです。\n誰も気づかなくても、\n私は知っています。',
]

interface Props {
  onClose: () => void
}

export function CertificateOverlay({ onClose }: Props) {
  const [msgIdx] = useState(() => Math.floor(Math.random() * MESSAGES.length))
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(14,12,28,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <style>{`
        @keyframes certGlow { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
        @keyframes certIn { from{opacity:0;transform:translateY(12px) scale(0.96)} to{opacity:1;transform:none} }
      `}</style>

      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${colors.accent.silver}44`,
          borderRadius: 24,
          padding: '36px 28px',
          maxWidth: 360, width: '100%',
          textAlign: 'center',
          boxShadow: `0 0 0 1px ${colors.accent.silver}18, 0 0 0 8px rgba(255,255,255,0.015), 0 16px 48px rgba(0,0,0,0.5)`,
          animation: 'certIn 0.45s ease',
        }}
      >
        <span style={{
          fontSize: 40, display: 'block', marginBottom: 18,
          animation: 'certGlow 3.5s ease infinite',
        }}>
          📜
        </span>

        <p style={{
          fontFamily: "'Noto Sans JP',sans-serif", fontSize: 9,
          color: colors.accent.silver, letterSpacing: '0.18em',
          margin: '0 0 10px', textTransform: 'uppercase',
        }}>
          CERTIFICATE OF EXISTENCE
        </p>

        <h2 style={{
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 20, color: colors.text.primary,
          margin: '0 0 6px', letterSpacing: '0.05em',
        }}>
          よくがんばりました
        </h2>

        <p style={{
          fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10,
          color: colors.text.secondary, margin: '0 0 24px',
        }}>
          {today}
        </p>

        <div style={{
          borderTop: `1px solid ${colors.accent.silver}22`,
          borderBottom: `1px solid ${colors.accent.silver}22`,
          padding: '20px 8px', margin: '0 0 24px',
        }}>
          <p style={{
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 14, color: colors.text.primary,
            margin: 0, lineHeight: 2, whiteSpace: 'pre-line',
          }}>
            {MESSAGES[msgIdx]}
          </p>
        </div>

        <p style={{
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 12, color: colors.accent.silver,
          margin: '0 0 24px', letterSpacing: '0.12em',
        }}>
          — フシギちゃん、認定
        </p>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: `1px solid ${colors.accent.silver}50`,
            borderRadius: 18, padding: '9px 28px',
            color: colors.text.primary,
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 13, cursor: 'pointer', letterSpacing: '0.05em',
            transition: 'border-color 0.2s',
          }}
        >
          受け取りました
        </button>
      </div>
    </div>
  )
}
