import { useState } from 'react'
import { GlassCard } from './GlassCard'
import { colors } from './tokens'
import { getTodayMission, completeTodayMission } from '../core/mission'
import { checkMissionBadges, BADGE_DEFS } from '../core/badges'

export function DailyMission() {
  const [mission, setMission]     = useState(() => getTodayMission())
  const [newBadge, setNewBadge]   = useState<string | null>(null)
  const [justDone, setJustDone]   = useState(false)

  const handleComplete = () => {
    if (mission.done) return
    const count = completeTodayMission()
    const earned = checkMissionBadges(count)
    setMission(getTodayMission())
    setJustDone(true)
    if (earned.length) setNewBadge(earned[0])
    setTimeout(() => setJustDone(false), 3000)
  }

  return (
    <GlassCard size="sm" accent="blush" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{
        margin: 0,
        fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11,
        color: colors.text.secondary, letterSpacing: '0.06em',
      }}>
        今日の、ちょっとした共犯関係
      </p>

      <p style={{
        margin: 0,
        fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
        fontSize: 14, color: colors.text.primary, lineHeight: 1.75,
      }}>
        {mission.text}
      </p>

      {newBadge && (
        <p style={{
          margin: 0,
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 12, color: colors.accent.blue,
        }}>
          {BADGE_DEFS.find((b) => b.id === newBadge)?.emoji} 「{BADGE_DEFS.find((b) => b.id === newBadge)?.name}」を受け取りました
        </p>
      )}

      {mission.done ? (
        <p style={{
          margin: 0,
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 12, color: colors.text.secondary,
        }}>
          {justDone ? 'こっそり、成功しましたね。' : '今日はもう、やりましたよ。'}
        </p>
      ) : (
        <button
          onClick={handleComplete}
          style={{
            alignSelf: 'flex-start',
            background: `${colors.accent.blush}18`,
            border: `1px solid ${colors.accent.blush}44`,
            borderRadius: 14, padding: '6px 16px',
            color: colors.accent.blush,
            fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          作戦成功
        </button>
      )}
    </GlassCard>
  )
}
