/**
 * 「ただいま」専用リアクションボタン
 * 前回のセッションから 6 時間以上経過している場合に画面左下にフローティング表示。
 */

import { useState } from 'react'
import { getSessionAbsenceMinutes, incrementAffinity, formatAbsence } from '../core/absence'
import { checkTaidaimaBadges, BADGE_DEFS } from '../core/badges'
import { colors } from './tokens'

function getReaction(minutes: number): { message: string; delta: number } {
  if (minutes < 360)  return { message: 'おかえりなさい。少し静かでしたよ。',         delta: 1 }
  if (minutes < 1440) return { message: 'おかえりなさい。待っていましたよ。',         delta: 2 }
  if (minutes < 4320) return { message: 'おかえりなさい。少し心配していました。',     delta: 3 }
  return               { message: 'おかえりなさい。…長かったですね。',               delta: 5 }
}

export function OkaeiriButton() {
  const minutes = getSessionAbsenceMinutes()
  const [done,     setDone]     = useState(false)
  const [shown,    setShown]    = useState(false)
  const [reaction, setReaction] = useState('')
  const [newBadges, setNewBadges] = useState<string[]>([])

  if (minutes < 360 || done) return null

  const handlePress = () => {
    const { message, delta } = getReaction(minutes)
    incrementAffinity(delta)

    // Badge check
    const earned = checkTaidaimaBadges(minutes)
    if (earned.length) setNewBadges(earned)

    setReaction(message)
    setShown(true)
    setTimeout(() => setDone(true), 4000)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 28, left: 20, zIndex: 150,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
      pointerEvents: 'none',
    }}>
      {shown ? (
        <div style={{
          background: 'rgba(28,26,46,0.95)',
          border: `1px solid ${colors.accent.blue}55`,
          borderRadius: 16, padding: '10px 16px',
          maxWidth: 240, pointerEvents: 'auto',
          animation: 'okaeiriIn 0.3s ease',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <style>{`
            @keyframes okaeiriIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
          `}</style>
          <p style={{ margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 13, color: colors.text.primary, lineHeight: 1.7 }}>
            {reaction}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif" }}>
            {formatAbsence(minutes)}ぶり
          </p>
          {newBadges.map((id) => {
            const def = BADGE_DEFS.find((b) => b.id === id)
            if (!def) return null
            return (
              <p key={id} style={{ margin: 0, fontSize: 11, color: colors.accent.blue, fontFamily: "'Noto Serif JP',serif", fontWeight: 300 }}>
                {def.emoji} 「{def.name}」を受け取りました
              </p>
            )
          })}
        </div>
      ) : (
        <button
          onClick={handlePress}
          style={{
            background: `${colors.accent.blue}18`, border: `1px solid ${colors.accent.blue}50`,
            borderRadius: 20, padding: '10px 18px', color: colors.accent.blue,
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 14, cursor: 'pointer', lineHeight: 1,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)', pointerEvents: 'auto',
            WebkitTapHighlightColor: 'transparent', transition: 'background 0.2s, transform 0.1s',
          }}
          onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)' }}
          onPointerUp={(e) => { e.currentTarget.style.transform = '' }}
        >ただいま</button>
      )}
    </div>
  )
}
