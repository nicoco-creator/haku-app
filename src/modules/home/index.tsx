import { useNavigate } from 'react-router-dom'
import { FushigiOrb } from '../../ui/FushigiOrb'
import { GlassCard } from '../../ui/GlassCard'
import { getGreeting } from '../../core/greeting'
import type { AccentName } from '../../ui/tokens'

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
]

function isLastDayOfMonth(): boolean {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.getMonth() !== now.getMonth()
}

export function HomePage() {
  const navigate = useNavigate()
  const { message, mood } = getGreeting()
  const lastDay = isLastDayOfMonth()

  const leftModules  = modules.slice(0, 4)
  const rightModules = modules.slice(4, 8)

  const orb = <FushigiOrb mode="hero" mood={mood} message={message} />

  return (
    <div className="min-h-svh flex flex-col">
      {/* ヘッダー */}
      <header className="flex justify-end items-center gap-2 px-4 pt-5 pb-2 flex-shrink-0">
        {lastDay && (
          <button
            onClick={() => navigate('/seen')}
            title="月末記録"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '22px', lineHeight: 1, padding: '4px',
            }}
          >
            🌙
          </button>
        )}
        <button
          onClick={() => navigate('/settings')}
          title="設定"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '22px', lineHeight: 1, padding: '4px',
          }}
        >
          ⚙️
        </button>
      </header>

      {/* ── モバイルレイアウト (md 未満) ── */}
      <div className="md:hidden flex flex-col items-center px-4 pb-10 gap-6">
        <div
          className="flex items-center justify-center w-full"
          style={{ minHeight: '38svh' }}
        >
          {orb}
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          {modules.map((mod) => (
            <GlassCard
              key={mod.to}
              accent={mod.accent}
              size="sm"
              onClick={() => navigate(mod.to)}
              className="flex flex-col items-center justify-center gap-2 aspect-square"
            >
              <span style={{ fontSize: '26px', lineHeight: 1 }}>{mod.emoji}</span>
              <span
                style={{
                  fontSize: '11px',
                  color: '#A89FC0',
                  textAlign: 'center',
                  lineHeight: 1.4,
                  wordBreak: 'keep-all',
                }}
              >
                {mod.label}
              </span>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* ── デスクトップレイアウト (md 以上) ── */}
      <div className="hidden md:grid flex-1 px-6 pb-10 pt-2"
        style={{ gridTemplateColumns: '1fr auto 1fr', gap: '24px' }}
      >
        {/* 左カラム */}
        <div className="flex flex-col gap-3 content-start">
          {leftModules.map((mod) => (
            <GlassCard
              key={mod.to}
              accent={mod.accent}
              onClick={() => navigate(mod.to)}
              className="flex items-center gap-4"
            >
              <span style={{ fontSize: '30px', lineHeight: 1, flexShrink: 0 }}>{mod.emoji}</span>
              <span style={{ fontSize: '14px', color: '#F0EEF8', fontWeight: 400 }}>{mod.label}</span>
            </GlassCard>
          ))}
        </div>

        {/* 中央 Orb */}
        <div
          className="flex flex-col items-center justify-center"
          style={{ minWidth: '260px', paddingTop: '8px' }}
        >
          {orb}
        </div>

        {/* 右カラム */}
        <div className="flex flex-col gap-3 content-start">
          {rightModules.map((mod) => (
            <GlassCard
              key={mod.to}
              accent={mod.accent}
              onClick={() => navigate(mod.to)}
              className="flex items-center gap-4"
            >
              <span style={{ fontSize: '30px', lineHeight: 1, flexShrink: 0 }}>{mod.emoji}</span>
              <span style={{ fontSize: '14px', color: '#F0EEF8', fontWeight: 400 }}>{mod.label}</span>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  )
}
