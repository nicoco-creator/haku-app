import { useState } from 'react'
import { GlassCard } from './GlassCard'
import { colors } from './tokens'
import { getTodayMission, completeTodayMission } from '../core/mission'
import { checkMissionBadges, BADGE_DEFS } from '../core/badges'
import { recordMissionComplete } from '../core/meta'
import { tryGetSouvenir, type SouvenirDef } from '../core/souvenirs'

export function DailyMission() {
  const [mission,   setMission]   = useState(() => getTodayMission())
  const [newBadge,  setNewBadge]  = useState<string | null>(null)
  const [souvenir,  setSouvenir]  = useState<SouvenirDef | null>(null)
  const [justDone,  setJustDone]  = useState(false)

  const handleComplete = () => {
    if (mission.done) return

    // Meta tracking before badge check
    recordMissionComplete()
    const count = completeTodayMission()

    const earned = checkMissionBadges(count)
    const gift   = tryGetSouvenir()

    setMission(getTodayMission())
    setJustDone(true)
    if (earned.length) setNewBadge(earned[0])
    if (gift) setSouvenir(gift)

    setTimeout(() => {
      setJustDone(false)
      setNewBadge(null)
      setSouvenir(null)
    }, 5000)
  }

  const badgeDef = newBadge ? BADGE_DEFS.find((b) => b.id === newBadge) : null

  return (
    <GlassCard size="sm" accent="blush" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11, color: colors.text.secondary, letterSpacing: '0.06em' }}>
        今日の、ちょっとした共犯関係
      </p>

      <p style={{ margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 14, color: colors.text.primary, lineHeight: 1.75 }}>
        {mission.text}
      </p>

      {/* おみやげ通知 */}
      {souvenir && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 10, background: `${colors.accent.blush}14`, border: `1px solid ${colors.accent.blush}30` }}>
          <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{souvenir.emoji}</span>
          <div>
            <p style={{ margin: '0 0 2px', fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10, color: colors.text.secondary, letterSpacing: '0.05em' }}>
              これ、落ちてましたよ。あげます。
            </p>
            <p style={{ margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 12, color: colors.accent.blush }}>
              {souvenir.name}
            </p>
          </div>
        </div>
      )}

      {/* バッジ通知 */}
      {badgeDef && (
        <p style={{ margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 12, color: colors.accent.blue }}>
          {badgeDef.emoji} 「{badgeDef.name}」を受け取りました
        </p>
      )}

      {mission.done ? (
        <p style={{ margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 12, color: colors.text.secondary }}>
          {justDone ? 'こっそり、成功しましたね。' : '今日はもう、やりましたよ。'}
        </p>
      ) : (
        <button
          onClick={handleComplete}
          style={{
            alignSelf: 'flex-start',
            background: `${colors.accent.blush}18`, border: `1px solid ${colors.accent.blush}44`,
            borderRadius: 14, padding: '6px 16px', color: colors.accent.blush,
            fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12, cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >作戦成功</button>
      )}
    </GlassCard>
  )
}
