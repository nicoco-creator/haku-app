import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard } from '../../ui/GlassCard'
import { colors } from '../../ui/tokens'
import { BADGE_DEFS, loadEarnedBadges, isEarned } from '../../core/badges'

function BadgeCard({ id }: { id: string }) {
  const def     = BADGE_DEFS.find((b) => b.id === id)!
  const earned  = isEarned(id)
  const all     = loadEarnedBadges()
  const entry   = all.find((b) => b.id === id)
  const dateStr = entry ? entry.earnedAt.slice(0, 10) : null

  return (
    <GlassCard
      size="sm"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, textAlign: 'center',
        opacity: earned ? 1 : 0.55,
        transition: 'opacity 0.3s',
      }}
    >
      <span style={{
        fontSize: 44, lineHeight: 1,
        filter: earned ? 'none' : 'grayscale(1) brightness(0.5)',
        transition: 'filter 0.3s',
      }}>
        {earned ? def.emoji : '？'}
      </span>

      <div>
        <p style={{
          margin: '0 0 4px',
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 14,
          color: earned ? colors.text.primary : colors.text.secondary,
        }}>
          {earned ? `「${def.name}」` : '？？？'}
        </p>

        {earned && dateStr && (
          <p style={{
            margin: '0 0 8px',
            fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11,
            color: colors.text.secondary,
          }}>
            {dateStr} に受け取りました
          </p>
        )}

        <p style={{
          margin: 0,
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 12, color: colors.text.secondary, lineHeight: 1.7,
        }}>
          {earned ? def.message : def.hint}
        </p>
      </div>
    </GlassCard>
  )
}

export function CollectionPage() {
  const earnedCount = loadEarnedBadges().length
  const total       = BADGE_DEFS.length

  return (
    <ModuleShell
      title="心の足跡"
      accent="silver"
      backTo="/"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 0 32px' }}>

        {/* Header text */}
        <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
          <p style={{
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 13, color: colors.text.secondary,
            margin: '0 0 8px', lineHeight: 1.8,
          }}>
            ここにあるのは、あなたがここにいた証拠です。
          </p>
          <p style={{
            fontFamily: "'Inter',sans-serif", fontWeight: 300,
            fontSize: 12, color: colors.text.secondary, margin: 0,
          }}>
            {earnedCount} / {total}
          </p>
        </div>

        {/* Badge grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {BADGE_DEFS.map((def) => (
            <BadgeCard key={def.id} id={def.id} />
          ))}
        </div>

        {earnedCount === total && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <p style={{
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 14, color: colors.accent.blue, lineHeight: 1.8, margin: 0,
            }}>
              全部、受け取ってくれましたね。
            </p>
          </div>
        )}
      </div>
    </ModuleShell>
  )
}
