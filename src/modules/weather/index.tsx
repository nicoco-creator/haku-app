import { useState, useEffect } from 'react'
import { ModuleShell } from '../../ui/ModuleShell'
import { glassCard, colors } from '../../ui/tokens'
import { posts, type Post } from '../../core/db'
import { calcPositiveDensity } from '../../core/lexicon'

// ── types ─────────────────────────────────────────────────────────────────────

type WeatherState = 'none' | 'rain' | 'cloud' | 'sun' | 'star'

interface DayData {
  date: string       // YYYY-MM-DD
  postCount: number
  density: number    // 0–1, 0.5 if no posts
  weather: WeatherState
  posts: Post[]
}

// ── helpers ───────────────────────────────────────────────────────────────────

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function formatDateLabel(date: string): string {
  const [, m, d] = date.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

function calcWeather(postCount: number, density: number): WeatherState {
  if (postCount === 0) return 'none'
  if (density < 0.40) return 'rain'
  if (density < 0.65) return 'cloud'
  if (postCount >= 3)  return 'star'
  return 'sun'
}

// ── constants ─────────────────────────────────────────────────────────────────

const WEATHER_ICON: Record<WeatherState, string> = {
  none:  '・',
  rain:  '🌧',
  cloud: '☁️',
  sun:   '☀️',
  star:  '✨',
}

const WEATHER_LABEL: Record<WeatherState, string> = {
  none:  '記録なし',
  rain:  '雨',
  cloud: '曇り',
  sun:   '晴れ',
  star:  '星空',
}

const WEATHER_COLOR: Record<WeatherState, string> = {
  none:  'rgba(255,255,255,0.04)',
  rain:  'rgba(100,120,180,0.18)',
  cloud: 'rgba(160,150,200,0.16)',
  sun:   'rgba(232,180,200,0.18)',
  star:  'rgba(232,180,200,0.28)',
}

const WEATHER_BORDER: Record<WeatherState, string> = {
  none:  'rgba(255,255,255,0.07)',
  rain:  'rgba(100,140,220,0.25)',
  cloud: 'rgba(180,170,220,0.22)',
  sun:   'rgba(232,180,200,0.32)',
  star:  'rgba(232,180,200,0.50)',
}

// ── DayCell ───────────────────────────────────────────────────────────────────

function DayCell({ day, onClick }: { day: DayData; onClick: () => void }) {
  const [hover, setHover] = useState(false)

  const isToday = day.date === dateStr(0)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`${formatDateLabel(day.date)}  ${WEATHER_LABEL[day.weather]}`}
      style={{
        background: hover
          ? `rgba(255,255,255,${day.weather === 'none' ? 0.06 : 0.12})`
          : WEATHER_COLOR[day.weather],
        border: `1px solid ${isToday ? colors.accent.blush : WEATHER_BORDER[day.weather]}`,
        borderRadius: 10,
        cursor: day.postCount > 0 ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 2,
        aspectRatio: '1 / 1',
        width: '100%',
        boxShadow: isToday ? `0 0 0 1.5px ${colors.accent.blush}` : 'none',
        transition: 'background 0.15s ease',
        padding: 0,
      }}
    >
      <span style={{ fontSize: 'clamp(14px, 3.5vw, 20px)', lineHeight: 1 }}>
        {WEATHER_ICON[day.weather]}
      </span>
      <span style={{
        fontSize: 'clamp(8px, 1.8vw, 10px)',
        color: isToday ? colors.accent.blush : colors.text.secondary,
        fontFamily: 'Inter, sans-serif',
        lineHeight: 1,
      }}>
        {formatDateLabel(day.date)}
      </span>
    </button>
  )
}

// ── DetailPopup ───────────────────────────────────────────────────────────────

function DetailPopup({ day, onClose }: { day: DayData; onClose: () => void }) {
  const densityPct = Math.round(day.density * 100)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(20,18,42,0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...glassCard,
          maxWidth: 360, width: '100%',
          maxHeight: '70vh',
          display: 'flex', flexDirection: 'column',
          gap: 12,
          overflowY: 'auto',
          padding: 20,
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
            fontSize: 16, color: colors.text.primary,
          }}>
            {formatDateLabel(day.date)}　{WEATHER_ICON[day.weather]} {WEATHER_LABEL[day.weather]}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer', fontSize: 18, padding: '2px 6px' }}
          >
            ×
          </button>
        </div>

        {/* density bar */}
        {day.postCount > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP', sans-serif" }}>
                ポジティブ密度
              </span>
              <span style={{ fontSize: 11, color: colors.accent.blush, fontFamily: 'Inter, sans-serif' }}>
                {densityPct}%
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
              <div style={{
                height: '100%',
                width: `${densityPct}%`,
                background: `linear-gradient(90deg, ${colors.accent.blue}, ${colors.accent.blush})`,
                borderRadius: 2,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )}

        {/* posts */}
        {day.posts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {day.posts.map((p) => (
              <p key={p.id} style={{
                margin: 0,
                fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
                fontSize: 13, color: colors.text.primary, lineHeight: 1.7,
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
              }}>
                {p.content}
              </p>
            ))}
          </div>
        ) : (
          <p style={{ color: colors.text.secondary, fontSize: 13, margin: 0, textAlign: 'center', padding: '12px 0' }}>
            この日の記録はありません
          </p>
        )}
      </div>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend({ counts }: { counts: Record<WeatherState, number> }) {
  const states: WeatherState[] = ['star', 'sun', 'cloud', 'rain']
  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px 16px' }}>
      {states.map((w) => (
        <span key={w} style={{
          fontSize: 12,
          color: counts[w] > 0 ? colors.text.primary : colors.text.secondary,
          fontFamily: "'Noto Sans JP', sans-serif",
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {WEATHER_ICON[w]}
          <span>{WEATHER_LABEL[w]}</span>
          <span style={{ fontFamily: 'Inter, sans-serif', color: colors.accent.blush }}>
            {counts[w]}
          </span>
        </span>
      ))}
    </div>
  )
}

// ── WeatherPage ───────────────────────────────────────────────────────────────

export function WeatherPage() {
  const [days,     setDays]     = useState<DayData[]>([])
  const [selected, setSelected] = useState<DayData | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const load = async () => {
      const start = dateStr(29)
      const end   = dateStr(0)
      const allPosts = await posts.listByDateRange(start, end)

      const postsByDate = new Map<string, Post[]>()
      for (const p of allPosts) {
        if (!postsByDate.has(p.date)) postsByDate.set(p.date, [])
        postsByDate.get(p.date)!.push(p)
      }

      const result: DayData[] = []
      for (let i = 29; i >= 0; i--) {
        const date  = dateStr(i)
        const ps    = postsByDate.get(date) ?? []
        const count = ps.length
        const density = count > 0
          ? ps.reduce((s, p) => s + calcPositiveDensity(p.content), 0) / count
          : 0.5
        result.push({ date, postCount: count, density, weather: calcWeather(count, density), posts: ps })
      }

      setDays(result)
      setLoading(false)
    }
    load()
  }, [])

  const counts: Record<WeatherState, number> = { none: 0, rain: 0, cloud: 0, sun: 0, star: 0 }
  for (const d of days) counts[d.weather]++

  // 6 columns × 5 rows = 30 cells
  const COLS = 6

  let prevMonth = ''

  return (
    <ModuleShell title="ココロ天気図" accent="blush" backTo="/">
      {loading ? (
        <p style={{ color: colors.text.secondary, textAlign: 'center', paddingTop: 40, fontSize: 14 }}>
          読み込み中…
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gap: 6,
          }}>
            {days.map((day) => {
              const month = day.date.slice(0, 7)
              const showMonth = month !== prevMonth
              if (showMonth) prevMonth = month
              return (
                <div key={day.date} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {showMonth && (
                    <span style={{
                      fontSize: 9, color: colors.text.secondary,
                      fontFamily: 'Inter, sans-serif',
                      textAlign: 'center', lineHeight: 1,
                    }}>
                      {parseInt(day.date.slice(5, 7))}月
                    </span>
                  )}
                  {!showMonth && <span style={{ fontSize: 9, lineHeight: 1, visibility: 'hidden' }}>x</span>}
                  <DayCell day={day} onClick={() => day.postCount > 0 && setSelected(day)} />
                </div>
              )
            })}
          </div>

          {/* legend */}
          <Legend counts={counts} />

          {/* subtitle */}
          <p style={{
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
            fontSize: 12, color: colors.text.secondary,
            textAlign: 'center', margin: 0, lineHeight: 1.8,
          }}>
            過去30日の心の天気
          </p>
        </div>
      )}

      {selected && (
        <DetailPopup day={selected} onClose={() => setSelected(null)} />
      )}
    </ModuleShell>
  )
}
