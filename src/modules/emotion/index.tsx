import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard } from '../../ui/GlassCard'
import { glassCard, colors } from '../../ui/tokens'
import { posts, type Post } from '../../core/db'
import { calcPositiveDensity } from '../../core/lexicon'
import { askAI } from '../../core/ai-bridge'

// ── helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function today() {
  return toDateStr(new Date())
}

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return toDateStr(d)
  })
}

function parseBulk(raw: string): { date: string; content: string }[] {
  const DATE_RE = /^\[(\d{4}[\/\-]\d{2}[\/\-]\d{2})\]/
  const blocks = raw.split(/^---$/m).map((b) => b.trim()).filter(Boolean)
  return blocks.flatMap((block) => {
    const lines = block.split('\n')
    const firstLine = lines[0].trim()
    const m = firstLine.match(DATE_RE)
    if (m) {
      const date = m[1].replace(/\//g, '-')
      const content = lines.join('\n').replace(DATE_RE, '').trim()
      return content ? [{ date, content }] : []
    }
    return block ? [{ date: today(), content: block }] : []
  })
}

// ── bead color ────────────────────────────────────────────────────────────────

function beadColor(density: number): string {
  // 0.0 → ash (#6A6480)  0.5 → blue (#A8C8E8)  1.0 → blush (#E8B4C8)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const hexToRGB = (h: string) => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  })
  const ash   = hexToRGB('#6A6480')
  const blue  = hexToRGB('#A8C8E8')
  const blush = hexToRGB('#E8B4C8')

  let r, g, b: number
  if (density <= 0.5) {
    const t = density * 2
    r = Math.round(lerp(ash.r, blue.r, t))
    g = Math.round(lerp(ash.g, blue.g, t))
    b = Math.round(lerp(ash.b, blue.b, t))
  } else {
    const t = (density - 0.5) * 2
    r = Math.round(lerp(blue.r, blush.r, t))
    g = Math.round(lerp(blue.g, blush.g, t))
    b = Math.round(lerp(blue.b, blush.b, t))
  }
  return `rgb(${r},${g},${b})`
}

// ── types ─────────────────────────────────────────────────────────────────────

interface DayStats {
  date: string
  posts: Post[]
  totalChars: number
  density: number
  size: number   // px
  alpha: number
}

// ── sub-components ────────────────────────────────────────────────────────────

function Bead({ stat, onClick }: { stat: DayStats; onClick: () => void }) {
  const color = beadColor(stat.density)
  const label = stat.date.slice(5)  // MM-DD
  return (
    <button
      onClick={onClick}
      title={`${stat.date} (${stat.posts.length}件)`}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: stat.posts.length ? 'pointer' : 'default',
        padding: 0, flexShrink: 0,
      }}
    >
      <div style={{
        width: stat.size, height: stat.size,
        borderRadius: '50%',
        background: stat.posts.length ? color : 'rgba(255,255,255,0.1)',
        opacity: stat.alpha,
        boxShadow: stat.posts.length
          ? `0 0 ${Math.round(stat.size * 0.3)}px ${color}60`
          : 'none',
        transition: 'transform 0.2s ease',
      }}
        onMouseEnter={(e) => { if (stat.posts.length) (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.12)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = '' }}
      />
      <span style={{ fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif" }}>
        {label}
      </span>
    </button>
  )
}

function DayPopup({ stat, onClose }: { stat: DayStats; onClose: () => void }) {
  const densityLabel = stat.density >= 0.65 ? 'ポジティブ寄り' : stat.density <= 0.35 ? 'ネガティブ寄り' : 'ニュートラル'
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...glassCard,
          width: '100%', maxWidth: 480, maxHeight: '80svh',
          display: 'flex', flexDirection: 'column', gap: 12,
          padding: '24px 20px', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: colors.accent.blush, fontFamily: "'Noto Serif JP',serif", fontSize: 16 }}>
            {stat.date}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif" }}>
          <span>{stat.posts.length}件 / {stat.totalChars}文字</span>
          <span style={{ color: beadColor(stat.density) }}>{densityLabel}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stat.posts.map((p) => (
            <div key={p.id} style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12, padding: '10px 14px',
              fontSize: 14, color: colors.text.primary,
              fontFamily: "'Noto Sans JP',sans-serif",
              lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {p.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BulkModal({ onClose, onImported }: { onClose: () => void; onImported: (n: number) => void }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    const items = parseBulk(text)
    if (!items.length) return
    setLoading(true)
    const now = new Date().toISOString()
    for (const item of items) {
      await posts.add({ date: item.date, content: item.content, source: 'threads', createdAt: now })
    }
    setLoading(false)
    onImported(items.length)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...glassCard,
          width: '100%', maxWidth: 520,
          display: 'flex', flexDirection: 'column', gap: 14,
          padding: '24px 20px',
        }}
      >
        <span style={{ color: colors.accent.blush, fontFamily: "'Noto Serif JP',serif", fontSize: 15 }}>
          複数投稿をまとめて取り込む
        </span>
        <p style={{ color: colors.text.secondary, fontSize: 12, margin: 0, fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.6 }}>
          1投稿1行、または <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>---</code> で区切ってください。<br />
          先頭に <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>[2025/05/13]</code> があれば日付を自動抽出します。
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"[2025/05/13]\n今日はよかった\n---\n[2025/05/14]\nつかれた"}
          rows={10}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 12, padding: '12px', color: colors.text.primary,
            fontFamily: "'Noto Sans JP',sans-serif", fontSize: 14,
            resize: 'vertical', lineHeight: 1.7, outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtnStyle}>キャンセル</button>
          <button onClick={handleImport} disabled={!text.trim() || loading} style={primaryBtnStyle(!!text.trim() && !loading)}>
            {loading ? '取り込み中…' : `取り込む (${parseBulk(text).length}件)`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── button styles ─────────────────────────────────────────────────────────────

const cancelBtnStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 10, padding: '8px 18px', color: colors.text.secondary,
  cursor: 'pointer', fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
}

const primaryBtnStyle = (active: boolean): CSSProperties => ({
  background: active ? `${colors.accent.blush}22` : 'rgba(255,255,255,0.04)',
  border: `1px solid ${active ? colors.accent.blush + '80' : 'rgba(255,255,255,0.10)'}`,
  borderRadius: 10, padding: '8px 20px',
  color: active ? colors.accent.blush : colors.text.secondary,
  cursor: active ? 'pointer' : 'not-allowed',
  fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
  transition: 'all 0.2s ease',
})

// ── main page ─────────────────────────────────────────────────────────────────

export function EmotionPage() {
  const [inputText, setInputText]     = useState('')
  const [inputDate, setInputDate]     = useState(today())
  const [flash, setFlash]             = useState(false)
  const [bulkOpen, setBulkOpen]       = useState(false)
  const [bulkFlash, setBulkFlash]     = useState<string | null>(null)
  const [dayStats, setDayStats]       = useState<DayStats[]>([])
  const [selectedDay, setSelectedDay] = useState<DayStats | null>(null)
  const [aiResult, setAiResult]       = useState<string | null>(null)
  const [aiLoading, setAiLoading]     = useState(false)

  const loadStats = useCallback(async () => {
    const days = last7Days()
    const start = days[0]
    const end   = days[6]
    const allPosts = await posts.listByDateRange(start, end)

    const stats: DayStats[] = days.map((date) => {
      const dp = allPosts.filter((p) => p.date === date)
      const totalChars = dp.reduce((s, p) => s + p.content.length, 0)
      const density = dp.length
        ? dp.reduce((s, p) => s + calcPositiveDensity(p.content), 0) / dp.length
        : 0.5

      const minSize = 24, maxSize = 72
      const maxRef = 500
      const rawSize = dp.length ? Math.min(totalChars / maxRef, 1) : 0
      const size = dp.length ? Math.round(minSize + rawSize * (maxSize - minSize)) : 28

      const alpha = dp.length
        ? Math.max(0.3, Math.min(1.0, 0.3 + (totalChars / maxRef) * 0.7))
        : 0.2

      return { date, posts: dp, totalChars, density, size, alpha }
    })
    setDayStats(stats)
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  const handleAdd = async () => {
    if (!inputText.trim()) return
    await posts.add({ date: inputDate, content: inputText.trim(), source: 'manual', createdAt: new Date().toISOString() })
    setInputText('')
    setFlash(true)
    setTimeout(() => setFlash(false), 1000)
    await loadStats()
  }

  const handleBulkImported = async (n: number) => {
    setBulkFlash(`${n}件取り込みました`)
    setTimeout(() => setBulkFlash(null), 2000)
    await loadStats()
  }

  const handleAskAI = async () => {
    setAiLoading(true)
    setAiResult(null)
    const days = last7Days()
    const allPosts = await posts.listByDateRange(days[0], days[6])
    const summary = allPosts.length
      ? allPosts.map((p) => `[${p.date}] ${p.content.slice(0, 120)}`).join('\n')
      : '（投稿なし）'
    const prompt = `以下は過去7日間の短い投稿です。傾向や気づきをやさしく教えてください（200字以内）。\n\n${summary}`
    try {
      const result = await askAI(prompt)
      setAiResult(result)
    } catch (e) {
      setAiResult(`エラー: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAiLoading(false)
    }
  }

  const maxBeadSize = Math.max(...dayStats.map((s) => s.size), 72)

  return (
    <ModuleShell title="わたしのこと" accent="blush" backTo="/">

      {/* ── bead row ── */}
      <GlassCard accent="blush" size="md">
        <p style={{ color: colors.text.secondary, fontSize: 12, margin: '0 0 16px', fontFamily: "'Noto Sans JP',sans-serif" }}>
          過去7日のことば
        </p>
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: 8, minHeight: maxBeadSize + 24,
        }}>
          {dayStats.map((stat) => (
            <Bead
              key={stat.date}
              stat={stat}
              onClick={() => stat.posts.length && setSelectedDay(stat)}
            />
          ))}
        </div>
        <p style={{ color: colors.text.secondary, fontSize: 11, margin: '12px 0 0', fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.5 }}>
          大きさ＝文字数　色＝気持ちの傾向　タップで詳細
        </p>
      </GlassCard>

      {/* ── paste input ── */}
      <GlassCard accent="blush" size="md" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="今日のことを書く、またはSNSから貼り付け…"
            rows={5}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 12, padding: '12px', color: colors.text.primary,
              fontFamily: "'Noto Sans JP',sans-serif", fontSize: 14,
              resize: 'vertical', lineHeight: 1.7, outline: 'none', width: '100%',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 8, padding: '6px 10px', color: colors.text.primary,
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
                colorScheme: 'dark', outline: 'none',
              }}
            />
            <button
              onClick={handleAdd}
              disabled={!inputText.trim()}
              style={primaryBtnStyle(!!inputText.trim())}
            >
              とりこむ
            </button>
            {flash && (
              <span style={{ color: colors.accent.blush, fontSize: 13, fontFamily: "'Noto Sans JP',sans-serif" }}>
                取り込みました
              </span>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ── actions row ── */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setBulkOpen(true)} style={cancelBtnStyle}>
          複数投稿をまとめて取り込み
        </button>
        <button
          onClick={handleAskAI}
          disabled={aiLoading}
          style={primaryBtnStyle(!aiLoading)}
        >
          {aiLoading ? '分析中…' : '今週の傾向を聞く'}
        </button>
      </div>

      {bulkFlash && (
        <p style={{ color: colors.accent.blush, fontSize: 13, margin: '8px 0 0', fontFamily: "'Noto Sans JP',sans-serif" }}>
          {bulkFlash}
        </p>
      )}

      {/* ── AI result ── */}
      {aiResult && (
        <GlassCard accent="blush" size="md" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <p style={{
              color: colors.text.primary, fontSize: 14, margin: 0,
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {aiResult}
            </p>
            <button
              onClick={() => setAiResult(null)}
              style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
        </GlassCard>
      )}

      {/* ── modals ── */}
      {selectedDay && <DayPopup stat={selectedDay} onClose={() => setSelectedDay(null)} />}
      {bulkOpen    && <BulkModal onClose={() => setBulkOpen(false)} onImported={handleBulkImported} />}
    </ModuleShell>
  )
}
