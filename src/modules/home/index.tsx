import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FushigiOrb } from '../../ui/FushigiOrb'
import { GlassCard } from '../../ui/GlassCard'
import { getGreeting } from '../../core/greeting'
import { useAppStore } from '../../core/store'
import { syncAlertLevel } from '../../core/metrics'
import { goodDays, type GoodDay } from '../../core/db'
import { colors } from '../../ui/tokens'
import type { AccentName } from '../../ui/tokens'
import { getStudyQuota } from '../../core/study-store'
import { AbsencePostIcon } from '../../ui/AbsencePost'
import { OkaeiriButton } from '../../ui/OkaeiriButton'
import { clearBadge } from '../../core/app-badge'
import { DailyMission } from '../../ui/DailyMission'
import type { UILayout } from '../../core/theme'

interface Module {
  label: string
  emoji: string
  accent: AccentName
  to: string
}

const modules: Module[] = [
  { label: 'ゲーム攻略',     emoji: '📚', accent: 'indigo', to: '/study' },
  { label: 'わたしのこと',   emoji: '💭', accent: 'blush',  to: '/emotion' },
  { label: 'ココロ天気図',   emoji: '☁️', accent: 'blush',  to: '/weather' },
  { label: '日記',           emoji: '📓', accent: 'blush',  to: '/journal' },
  { label: 'セーブポイント', emoji: '🔖', accent: 'blue',   to: '/companion' },
  { label: '良かった日',     emoji: '☀️', accent: 'blush',  to: '/goodday' },
  { label: '待っているもの', emoji: '⏳', accent: 'silver', to: '/waiting' },
  { label: '裁かない倉庫',   emoji: '🗝️', accent: 'ash',    to: '/vault' },
  { label: '作業タイマー',   emoji: '⏱️', accent: 'blue',   to: '/timer' },
  { label: '心の足跡',       emoji: '🌑', accent: 'silver', to: '/collection' },
  { label: '不安の買い取り', emoji: '🏷️', accent: 'silver', to: '/auction' },
  { label: '今日のニュース', emoji: '📰', accent: 'blue',   to: '/news'  },
  { label: 'BGM',           emoji: '🎵', accent: 'blue',   to: '/bgm'   },
  { label: '模様替え',       emoji: '🪄', accent: 'blush',  to: '/theme' },
]

function isLastDayOfMonth(): boolean {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.getMonth() !== now.getMonth()
}

function AlertFooter({ alertLevel }: { alertLevel: number }) {
  const setAlertOkUntil = useAppStore((s) => s.setAlertOkUntil)
  const alertOkUntil    = useAppStore((s) => s.alertOkUntil)
  const [memoryCard, setMemoryCard] = useState<GoodDay | null>(null)

  const isOkActive = alertOkUntil !== null && Date.now() < alertOkUntil

  useEffect(() => {
    if (alertLevel < 3) { setMemoryCard(null); return }
    goodDays.list().then((all) => {
      if (!all.length) return
      setMemoryCard(all[Math.floor(Math.random() * all.length)])
    })
  }, [alertLevel])

  const handleImOk = async () => {
    setAlertOkUntil(Date.now() + 24 * 60 * 60 * 1000)
    await syncAlertLevel()
  }

  if (alertLevel < 1 && !isOkActive) return null

  return (
    <div style={{ padding: '0 16px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {alertLevel >= 2 && (
        <p style={{
          fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
          fontSize: 'clamp(12px, 3vw, 14px)',
          color: colors.text.secondary, textAlign: 'center', margin: 0, lineHeight: 1.8,
        }}>
          最近、かなりアクセル踏んでます。最後にちゃんと休んだの、いつでしたっけ。
        </p>
      )}
      {alertLevel >= 3 && memoryCard && (
        <GlassCard size="sm" style={{ maxWidth: 320, width: '100%', textAlign: 'center' }}>
          <p style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 11, color: colors.text.secondary, margin: '0 0 4px' }}>
            {memoryCard.date}
          </p>
          <p style={{ fontFamily: "'Noto Serif JP', serif", fontWeight: 300, fontSize: 13, color: colors.text.primary, margin: 0, lineHeight: 1.7 }}>
            {memoryCard.content.split(/[。\n]/)[0]}
          </p>
        </GlassCard>
      )}
      {!isOkActive ? (
        <button
          onClick={handleImOk}
          style={{
            background: 'none', border: `1px solid ${colors.accent.silver}50`,
            borderRadius: 20, padding: '5px 18px', color: colors.text.secondary,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
            fontSize: 12, cursor: 'pointer', letterSpacing: '0.05em',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent.silver; e.currentTarget.style.color = colors.text.primary }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${colors.accent.silver}50`; e.currentTarget.style.color = colors.text.secondary }}
        >
          私はいま大丈夫
        </button>
      ) : (
        <p style={{ fontFamily: "'Noto Serif JP', serif", fontWeight: 300, fontSize: 12, color: colors.accent.blue, margin: 0 }}>
          24時間、そっとしておきます。
        </p>
      )}
    </div>
  )
}

// ── Mobile layout components ──────────────────────────────────────────────────

type LayoutProps = { navigate: (to: string) => void; studyQuota: ReturnType<typeof getStudyQuota> }

function MobileList({ navigate }: LayoutProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {modules.map((mod) => (
        <button
          key={mod.to}
          onClick={() => navigate(mod.to)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 16px', width: '100%', textAlign: 'left',
            background: 'var(--haku-frost-light, rgba(45,42,62,0.08))',
            border: '1px solid var(--haku-frost-border-light, rgba(45,42,62,0.15))',
            borderRadius: 'var(--haku-card-radius, 20px)',
            cursor: 'pointer', transition: 'filter 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.97)' }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = '' }}
        >
          <span style={{ fontSize: '20px', width: 28, textAlign: 'center', flexShrink: 0, lineHeight: 1 }}>{mod.emoji}</span>
          <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13, color: colors.text.primary, flex: 1 }}>
            {mod.label}
          </span>
          <span style={{ color: colors.text.secondary, fontSize: 14, flexShrink: 0 }}>›</span>
        </button>
      ))}
    </div>
  )
}

function MobileGrid2({ navigate, studyQuota }: LayoutProps) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {modules.map((mod) => (
        <GlassCard key={mod.to} accent={mod.accent} size="sm"
          onClick={() => navigate(mod.to)}
          className="flex flex-col items-center justify-center gap-2 aspect-square"
        >
          <span style={{ fontSize: '26px', lineHeight: 1 }}>{mod.emoji}</span>
          <span style={{ fontSize: '11px', color: colors.text.secondary, textAlign: 'center', lineHeight: 1.4, wordBreak: 'keep-all' }}>
            {mod.label}
          </span>
          {mod.to === '/study' && studyQuota && (
            <span style={{ fontSize: '9px', color: colors.accent.indigo, textAlign: 'center', lineHeight: 1 }}>
              今日: {studyQuota.dailyLoad}章
            </span>
          )}
        </GlassCard>
      ))}
    </div>
  )
}

function MobileGrid3({ navigate, studyQuota }: LayoutProps) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {modules.map((mod) => (
        <GlassCard key={mod.to} accent={mod.accent} size="sm"
          onClick={() => navigate(mod.to)}
          className="flex flex-col items-center justify-center gap-1"
          style={{ aspectRatio: '1', padding: '8px 6px', minHeight: 72 }}
        >
          <span style={{ fontSize: '20px', lineHeight: 1 }}>{mod.emoji}</span>
          <span style={{ fontSize: '9px', color: colors.text.secondary, textAlign: 'center', lineHeight: 1.35, wordBreak: 'keep-all' }}>
            {mod.label}
          </span>
          {mod.to === '/study' && studyQuota && (
            <span style={{ fontSize: '8px', color: colors.accent.indigo, textAlign: 'center', lineHeight: 1 }}>
              {studyQuota.dailyLoad}章
            </span>
          )}
        </GlassCard>
      ))}
    </div>
  )
}

function MobileGrid4({ navigate, studyQuota }: LayoutProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5 w-full">
      {modules.map((mod) => (
        <GlassCard key={mod.to} accent={mod.accent} size="sm"
          onClick={() => navigate(mod.to)}
          className="flex flex-col items-center justify-center gap-0.5"
          style={{ aspectRatio: '1', padding: '7px 4px', minHeight: 58 }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>{mod.emoji}</span>
          <span style={{ fontSize: '8px', color: colors.text.secondary, textAlign: 'center', lineHeight: 1.3, wordBreak: 'keep-all' }}>
            {mod.label}
          </span>
          {mod.to === '/study' && studyQuota && (
            <span style={{ fontSize: '7px', color: colors.accent.indigo, textAlign: 'center', lineHeight: 1 }}>
              {studyQuota.dailyLoad}章
            </span>
          )}
        </GlassCard>
      ))}
    </div>
  )
}

// ── Desktop layout components ─────────────────────────────────────────────────

function DesktopCardLg({ mod, navigate, studyQuota }: { mod: Module; navigate: (to: string) => void; studyQuota: ReturnType<typeof getStudyQuota> }) {
  return (
    <GlassCard accent={mod.accent} onClick={() => navigate(mod.to)} className="flex items-center gap-4">
      <span style={{ fontSize: '30px', lineHeight: 1, flexShrink: 0 }}>{mod.emoji}</span>
      <span style={{ fontSize: '14px', color: colors.text.primary, fontWeight: 400 }}>{mod.label}</span>
      {mod.to === '/study' && studyQuota && (
        <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.accent.indigo, whiteSpace: 'nowrap' }}>
          {studyQuota.dailyLoad}章/日
        </span>
      )}
    </GlassCard>
  )
}

function DesktopCardSm({ mod, navigate }: { mod: Module; navigate: (to: string) => void }) {
  return (
    <GlassCard accent={mod.accent} size="sm" onClick={() => navigate(mod.to)}
      className="flex items-center gap-3" style={{ padding: '9px 14px' }}
    >
      <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>{mod.emoji}</span>
      <span style={{ fontSize: '12px', color: colors.text.primary }}>{mod.label}</span>
    </GlassCard>
  )
}

function DesktopCardXs({ mod, navigate }: { mod: Module; navigate: (to: string) => void }) {
  return (
    <GlassCard accent={mod.accent} size="sm" onClick={() => navigate(mod.to)}
      className="flex items-center gap-2" style={{ padding: '7px 10px' }}
    >
      <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>{mod.emoji}</span>
      <span style={{ fontSize: '11px', color: colors.text.primary, lineHeight: 1.3 }}>{mod.label}</span>
    </GlassCard>
  )
}

function DesktopListItem({ mod, navigate }: { mod: Module; navigate: (to: string) => void }) {
  return (
    <button
      onClick={() => navigate(mod.to)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', width: '100%', textAlign: 'left',
        background: 'var(--haku-frost-light, rgba(45,42,62,0.08))',
        border: '1px solid var(--haku-frost-border-light, rgba(45,42,62,0.15))',
        borderRadius: 'var(--haku-card-radius, 20px)',
        cursor: 'pointer', transition: 'filter 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.97)' }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = '' }}
    >
      <span style={{ fontSize: '18px', width: 24, textAlign: 'center', flexShrink: 0 }}>{mod.emoji}</span>
      <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 12, color: colors.text.primary, flex: 1 }}>{mod.label}</span>
      <span style={{ color: colors.text.secondary, fontSize: 13 }}>›</span>
    </button>
  )
}

export function HomePage() {
  const navigate   = useNavigate()
  const alertLevel = useAppStore((s) => s.alertLevel)
  const uiLayout   = useAppStore((s) => s.uiLayout) as UILayout
  const { message, mood } = getGreeting()
  const lastDay    = isLastDayOfMonth()
  const studyQuota = getStudyQuota()

  useEffect(() => { clearBadge() }, [])

  const orb = <FushigiOrb mode="hero" mood={mood} message={message} />

  // grid2 uses the classic 3-column desktop; others use top-orb + below-grid
  const isClassicDesktop = uiLayout === 'grid2'
  const leftModules  = modules.slice(0, 5)
  const rightModules = modules.slice(5)
  const leftHalf     = modules.slice(0, Math.ceil(modules.length / 2))
  const rightHalf    = modules.slice(Math.ceil(modules.length / 2))

  return (
    <div className="min-h-svh flex flex-col">
      {/* ヘッダー */}
      <header className="flex justify-end items-center gap-2 px-4 pt-5 pb-2 flex-shrink-0">
        {lastDay && (
          <button onClick={() => navigate('/seen')} title="月末記録"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '4px' }}>
            🌙
          </button>
        )}
        <AbsencePostIcon />
        <button onClick={() => navigate('/settings')} title="設定"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '4px' }}>
          ⚙️
        </button>
      </header>

      {/* ── モバイルレイアウト ── */}
      <div className="md:hidden flex flex-col items-center px-4 pb-4 gap-5">
        <div className="flex items-center justify-center w-full" style={{ minHeight: '34svh' }}>
          {orb}
        </div>
        <div className="w-full">
          <DailyMission />
        </div>
        {uiLayout === 'list'  && <MobileList  navigate={navigate} studyQuota={studyQuota} />}
        {uiLayout === 'grid2' && <MobileGrid2 navigate={navigate} studyQuota={studyQuota} />}
        {uiLayout === 'grid3' && <MobileGrid3 navigate={navigate} studyQuota={studyQuota} />}
        {uiLayout === 'grid4' && <MobileGrid4 navigate={navigate} studyQuota={studyQuota} />}
      </div>

      {/* ── デスクトップ: grid2は3カラム、その他はtop-orb + below ── */}
      {isClassicDesktop ? (
        <div className="hidden md:grid flex-1 px-6 pb-10 pt-2"
          style={{ gridTemplateColumns: '1fr auto 1fr', gap: '24px' }}
        >
          <div className="flex flex-col gap-3 content-start">
            {leftModules.map(mod => <DesktopCardLg key={mod.to} mod={mod} navigate={navigate} studyQuota={studyQuota} />)}
          </div>
          <div className="flex flex-col items-center justify-center gap-4" style={{ minWidth: '260px', paddingTop: '8px' }}>
            {orb}
            <DailyMission />
          </div>
          <div className="flex flex-col gap-3 content-start">
            {rightModules.map(mod => <DesktopCardLg key={mod.to} mod={mod} navigate={navigate} studyQuota={studyQuota} />)}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-col flex-1 items-center px-6 pb-10 pt-2 gap-5">
          <div className="flex items-center justify-center" style={{ minHeight: '34svh' }}>
            {orb}
          </div>
          <DailyMission />
          {uiLayout === 'list' && (
            <div className="grid w-full gap-1.5" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 680 }}>
              {modules.map(mod => <DesktopListItem key={mod.to} mod={mod} navigate={navigate} />)}
            </div>
          )}
          {uiLayout === 'grid3' && (
            <div className="grid w-full gap-3" style={{ gridTemplateColumns: '1fr auto 1fr', maxWidth: 720, alignItems: 'start' }}>
              <div className="flex flex-col gap-2">
                {leftHalf.map(mod => <DesktopCardSm key={mod.to} mod={mod} navigate={navigate} />)}
              </div>
              <div style={{ width: 1, background: 'rgba(0,0,0,0.05)', alignSelf: 'stretch' }} />
              <div className="flex flex-col gap-2">
                {rightHalf.map(mod => <DesktopCardSm key={mod.to} mod={mod} navigate={navigate} />)}
              </div>
            </div>
          )}
          {uiLayout === 'grid4' && (
            <div className="grid w-full gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', maxWidth: 720 }}>
              {modules.map(mod => <DesktopCardXs key={mod.to} mod={mod} navigate={navigate} />)}
            </div>
          )}
        </div>
      )}

      <AlertFooter alertLevel={alertLevel} />
      <OkaeiriButton />
    </div>
  )
}
