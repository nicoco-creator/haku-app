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

      {/* レベル2以上の警告テキスト */}
      {alertLevel >= 2 && (
        <p style={{
          fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
          fontSize: 'clamp(12px, 3vw, 14px)',
          color: colors.text.secondary, textAlign: 'center', margin: 0, lineHeight: 1.8,
        }}>
          最近、かなりアクセル踏んでます。最後にちゃんと休んだの、いつでしたっけ。
        </p>
      )}

      {/* レベル3：良かった日カード */}
      {alertLevel >= 3 && memoryCard && (
        <GlassCard size="sm" style={{ maxWidth: 320, width: '100%', textAlign: 'center' }}>
          <p style={{
            fontFamily: "'Noto Sans JP', sans-serif", fontSize: 11,
            color: colors.text.secondary, margin: '0 0 4px',
          }}>
            {memoryCard.date}
          </p>
          <p style={{
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
            fontSize: 13, color: colors.text.primary, margin: 0, lineHeight: 1.7,
          }}>
            {memoryCard.content.split(/[。\n]/)[0]}
          </p>
        </GlassCard>
      )}

      {/* 「私はいま大丈夫」ボタン（レベル1以上で表示） */}
      {!isOkActive ? (
        <button
          onClick={handleImOk}
          style={{
            background: 'none',
            border: `1px solid ${colors.accent.silver}50`,
            borderRadius: 20, padding: '5px 18px',
            color: colors.text.secondary,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
            fontSize: 12, cursor: 'pointer', letterSpacing: '0.05em',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.accent.silver
            e.currentTarget.style.color = colors.text.primary
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${colors.accent.silver}50`
            e.currentTarget.style.color = colors.text.secondary
          }}
        >
          私はいま大丈夫
        </button>
      ) : (
        <p style={{
          fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
          fontSize: 12, color: colors.accent.blue, margin: 0,
        }}>
          24時間、そっとしておきます。
        </p>
      )}
    </div>
  )
}

export function HomePage() {
  const navigate   = useNavigate()
  const alertLevel = useAppStore((s) => s.alertLevel)
  const { message, mood } = getGreeting()
  const lastDay = isLastDayOfMonth()

  const leftModules  = modules.slice(0, 5)
  const rightModules = modules.slice(5)
  const studyQuota   = getStudyQuota()

  // ホーム画面を開いたらバッジをクリア（在室確認）
  useEffect(() => { clearBadge() }, [])

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
        {/* 手紙の不在着信ポストアイコン */}
        <AbsencePostIcon />
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
      <div className="md:hidden flex flex-col items-center px-4 pb-4 gap-6">
        <div
          className="flex items-center justify-center w-full"
          style={{ minHeight: '38svh' }}
        >
          {orb}
        </div>

        <div className="w-full">
          <DailyMission />
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
                  color: colors.text.secondary,
                  textAlign: 'center',
                  lineHeight: 1.4,
                  wordBreak: 'keep-all',
                }}
              >
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
              <span style={{ fontSize: '14px', color: colors.text.primary, fontWeight: 400 }}>{mod.label}</span>
              {mod.to === '/study' && studyQuota && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.accent.indigo, whiteSpace: 'nowrap' }}>
                  {studyQuota.dailyLoad}章/日
                </span>
              )}
            </GlassCard>
          ))}
        </div>

        {/* 中央 Orb */}
        <div
          className="flex flex-col items-center justify-center gap-4"
          style={{ minWidth: '260px', paddingTop: '8px' }}
        >
          {orb}
          <DailyMission />
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
              <span style={{ fontSize: '14px', color: colors.text.primary, fontWeight: 400 }}>{mod.label}</span>
            </GlassCard>
          ))}
        </div>
      </div>

      <AlertFooter alertLevel={alertLevel} />

      {/* 「ただいま」フローティングボタン（6時間以上不在のとき） */}
      <OkaeiriButton />
    </div>
  )
}
