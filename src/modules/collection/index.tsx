import { useState } from 'react'
import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard } from '../../ui/GlassCard'
import { colors } from '../../ui/tokens'
import { BADGE_DEFS, loadEarnedBadges, isEarned } from '../../core/badges'
import { SOUVENIR_DEFS, loadEarnedSouvenirs, isSouvenirEarned } from '../../core/souvenirs'

// ── Badge card ────────────────────────────────────────────────────────────────

function BadgeCard({ id }: { id: string }) {
  const def     = BADGE_DEFS.find((b) => b.id === id)!
  const earned  = isEarned(id)
  const entry   = loadEarnedBadges().find((b) => b.id === id)
  const dateStr = entry?.earnedAt.slice(0, 10) ?? null

  return (
    <GlassCard
      size="sm"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, textAlign: 'center', padding: '16px 12px',
        opacity: earned ? 1 : 0.5,
        transition: 'opacity 0.3s',
      }}
    >
      <span style={{
        fontSize: 36, lineHeight: 1,
        filter: earned ? 'none' : 'grayscale(1) brightness(0.4)',
        transition: 'filter 0.3s',
      }}>
        {earned ? def.emoji : '？'}
      </span>

      <p style={{
        margin: 0,
        fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 13,
        color: earned ? colors.text.primary : colors.text.secondary,
        lineHeight: 1.4,
      }}>
        {earned ? def.name : '？？？'}
      </p>

      {earned && dateStr && (
        <p style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10, color: colors.text.secondary }}>
          {dateStr}
        </p>
      )}

      <p style={{
        margin: 0,
        fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 11,
        color: colors.text.secondary, lineHeight: 1.6,
      }}>
        {earned ? def.message : def.hint}
      </p>
    </GlassCard>
  )
}

// ── Souvenir card ─────────────────────────────────────────────────────────────

function SouvenirCard({ id }: { id: string }) {
  const def    = SOUVENIR_DEFS.find((s) => s.id === id)!
  const earned = isSouvenirEarned(id)
  const entry  = loadEarnedSouvenirs().find((s) => s.id === id)
  const dateStr = entry?.earnedAt.slice(0, 10) ?? null

  return (
    <GlassCard
      size="sm"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 6, textAlign: 'center', padding: '14px 10px',
        opacity: earned ? 1 : 0.45,
        transition: 'opacity 0.3s',
      }}
    >
      <span style={{
        fontSize: 32, lineHeight: 1,
        filter: earned ? 'none' : 'grayscale(1) brightness(0.35)',
      }}>
        {earned ? def.emoji : '📦'}
      </span>

      <p style={{
        margin: 0,
        fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 12,
        color: earned ? colors.text.primary : colors.text.secondary,
        lineHeight: 1.4,
      }}>
        {earned ? def.name : '？？？'}
      </p>

      {earned && dateStr && (
        <p style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10, color: colors.text.secondary }}>
          {dateStr}
        </p>
      )}

      {earned && (
        <p style={{
          margin: 0,
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 10,
          color: colors.text.secondary, lineHeight: 1.6,
        }}>
          {def.fushigiSays}
        </p>
      )}
    </GlassCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'badges' | 'souvenirs'

const TAB_LABELS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'badges',   label: '心の足跡',     emoji: '🌑' },
  { key: 'souvenirs', label: 'おみやげの小箱', emoji: '🎁' },
]

export function CollectionPage() {
  const [tab, setTab] = useState<Tab>('badges')

  const earnedBadges    = loadEarnedBadges().length
  const earnedSouvenirs = loadEarnedSouvenirs().length
  const totalBadges     = BADGE_DEFS.length
  const totalSouvenirs  = SOUVENIR_DEFS.length

  return (
    <ModuleShell title="心の足跡" accent="silver" backTo="/">

      {/* タブ */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TAB_LABELS.map(({ key, label, emoji }) => {
          const active = tab === key
          const count  = key === 'badges'
            ? `${earnedBadges}/${totalBadges}`
            : `${earnedSouvenirs}/${totalSouvenirs}`
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 14,
                border: `1px solid ${active ? colors.accent.silver : 'rgba(255,255,255,0.12)'}`,
                background: active ? `${colors.accent.silver}18` : 'transparent',
                color: active ? colors.text.primary : colors.text.secondary,
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
                cursor: 'pointer', transition: 'all 0.18s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}
            >
              <span style={{ fontSize: 18 }}>{emoji}</span>
              <span>{label}</span>
              <span style={{ fontSize: 10, color: colors.text.secondary, fontFamily: 'Inter,sans-serif' }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* バッジタブ */}
      {tab === 'badges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>
          <p style={{
            margin: '0 0 4px', textAlign: 'center',
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 13, color: colors.text.secondary, lineHeight: 1.8,
          }}>
            ここにあるのは、あなたがここにいた証拠です。
          </p>

          {/* 2カラムグリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            {BADGE_DEFS.map((def) => (
              <BadgeCard key={def.id} id={def.id} />
            ))}
          </div>

          {earnedBadges === totalBadges && (
            <p style={{
              textAlign: 'center', margin: '8px 0 0',
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 14, color: colors.accent.blue, lineHeight: 1.8,
            }}>
              全部、受け取ってくれましたね。
            </p>
          )}
        </div>
      )}

      {/* おみやげタブ */}
      {tab === 'souvenirs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>
          <p style={{
            margin: '0 0 4px', textAlign: 'center',
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 13, color: colors.text.secondary, lineHeight: 1.8,
          }}>
            タイマーやミッションの後、気まぐれに渡したものたちです。
          </p>

          {/* 2カラムグリッド（ソウベニールはやや小さく） */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {SOUVENIR_DEFS.map((def) => (
              <SouvenirCard key={def.id} id={def.id} />
            ))}
          </div>

          {earnedSouvenirs === 0 && (
            <p style={{
              textAlign: 'center', margin: '12px 0 0',
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 13, color: colors.text.secondary, lineHeight: 1.8,
            }}>
              まだ何もありません。タイマーかミッションを試してみてください。
            </p>
          )}

          {earnedSouvenirs === totalSouvenirs && (
            <p style={{
              textAlign: 'center', margin: '8px 0 0',
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 14, color: colors.accent.blush, lineHeight: 1.8,
            }}>
              小箱が、いっぱいになりましたね。
            </p>
          )}
        </div>
      )}
    </ModuleShell>
  )
}
