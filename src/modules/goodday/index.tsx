import { useState, useEffect, type CSSProperties } from 'react'
import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard } from '../../ui/GlassCard'
import { colors } from '../../ui/tokens'
import { goodDays, type GoodDay } from '../../core/db'

const BLUSH = colors.accent.blush

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${y}年${parseInt(m)}月${parseInt(day)}日`
}

// ── page ──────────────────────────────────────────────────────────────────────

export function GooddayPage() {
  const [card,    setCard]    = useState<GoodDay | null>(null)
  const [noData,  setNoData]  = useState(false)
  const [lastId,  setLastId]  = useState<number | undefined>(undefined)
  const [addText, setAddText] = useState('')
  const [saved,   setSaved]   = useState(false)
  const [count,   setCount]   = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const reloadCount = () => goodDays.list().then((all) => setCount(all.length))

  useEffect(() => { void reloadCount() }, [])

  // ── ランダム想起 ──────────────────────────────────────────────────────────
  const handleRemember = async () => {
    if (loading) return
    setLoading(true)
    try {
      const all = await goodDays.list()
      if (all.length === 0) { setNoData(true); setCard(null); return }
      // 直前に表示したものを除いてランダム選択
      const pool = all.length > 1 ? all.filter((d) => d.id !== lastId) : all
      const pick = pool[Math.floor(Math.random() * pool.length)]
      setCard(pick)
      setLastId(pick.id)
      setNoData(false)
    } finally {
      setLoading(false)
    }
  }

  // ── 手動追加 ─────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const text = addText.trim()
    if (!text) return
    const today = new Date().toISOString().slice(0, 10)
    await goodDays.add({ date: today, content: text, createdAt: new Date().toISOString() })
    setAddText('')
    setSaved(true)
    void reloadCount()
    setTimeout(() => setSaved(false), 3000)
  }

  const todayDisplay = formatDate(new Date().toISOString().slice(0, 10))

  // ── styles ────────────────────────────────────────────────────────────────

  const rememberBtnStyle: CSSProperties = {
    width: '100%', padding: '22px 0',
    background: 'none',
    border: `1px solid ${BLUSH}60`,
    borderRadius: 24, cursor: 'pointer',
    color: BLUSH,
    fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
    fontSize: 18, letterSpacing: '0.14em',
    transition: 'border-color 0.3s, background 0.3s',
  }

  const textareaStyle: CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 14, padding: '12px 14px',
    color: colors.text.primary,
    fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
    fontSize: 14, lineHeight: 1.9,
    resize: 'none', outline: 'none',
  }

  const saveBtnStyle: CSSProperties = {
    border: `1px solid ${BLUSH}60`,
    borderRadius: 12, padding: '8px 22px',
    background: `${BLUSH}18`,
    color: BLUSH, cursor: 'pointer',
    fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
    fontSize: 13, letterSpacing: '0.06em',
    transition: 'background 0.2s',
    opacity: addText.trim() ? 1 : 0.4,
  }

  return (
    <ModuleShell title="良かった日" accent="blush" backTo="/">
      <style>{`
        @keyframes goodDayIn {
          from { opacity: 0; transform: translateY(10px) }
          to   { opacity: 1; transform: none }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── おもいだすセクション ── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <button
            onClick={() => void handleRemember()}
            disabled={loading}
            style={rememberBtnStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = BLUSH
              e.currentTarget.style.background  = `${BLUSH}0F`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = `${BLUSH}60`
              e.currentTarget.style.background  = 'none'
            }}
          >
            {loading ? '…' : 'おもいだす'}
          </button>

          {noData && (
            <p style={{
              textAlign: 'center', fontSize: 13,
              color: colors.text.secondary,
              fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
              lineHeight: 1.8, margin: 0,
            }}>
              まだ記録がありません。<br />
              下から「良かったこと」を追加してみましょう。
            </p>
          )}

          {card && (
            <div style={{ animation: 'goodDayIn 0.4s ease' }}>
              <GlassCard accent="blush" size="lg">
                <p style={{
                  fontSize: 11, color: BLUSH,
                  fontFamily: "'Noto Sans JP', sans-serif",
                  margin: '0 0 14px', letterSpacing: '0.08em',
                }}>
                  {formatDate(card.date)}
                </p>
                <p style={{
                  fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
                  fontSize: 'clamp(15px, 4vw, 18px)',
                  color: colors.text.primary,
                  lineHeight: 2.1, margin: 0,
                  whiteSpace: 'pre-wrap',
                }}>
                  {card.content}
                </p>
              </GlassCard>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <button
                  onClick={() => void handleRemember()}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: colors.text.secondary,
                    fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
                    fontSize: 13, letterSpacing: '0.06em',
                    padding: '6px 14px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = BLUSH }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = colors.text.secondary }}
                >
                  また別の日 →
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── 区切り ── */}
        <div style={{ height: 1, background: `${BLUSH}20` }} />

        {/* ── 手動追加セクション ── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p style={{
              fontSize: 13, color: BLUSH,
              fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
              margin: 0, letterSpacing: '0.06em',
            }}>
              ＋ 今日の良かったことを追加
            </p>
            <span style={{
              fontSize: 11, color: colors.text.secondary,
              fontFamily: "'Noto Sans JP', sans-serif",
            }}>
              {todayDisplay}
            </span>
          </div>

          <textarea
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            placeholder="今日、ちょっと良かったこと…"
            rows={4}
            style={textareaStyle}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
            {saved && (
              <span style={{
                fontSize: 12, color: BLUSH,
                fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
                animation: 'goodDayIn 0.3s ease',
              }}>
                保存しました ✓
              </span>
            )}
            <button
              onClick={() => void handleAdd()}
              disabled={!addText.trim()}
              style={saveBtnStyle}
            >
              保存
            </button>
          </div>
        </section>

        {/* ── 記録数（AlertFooter レベル3との連携を確認するための表示） ── */}
        {count !== null && (
          <p style={{
            fontSize: 11, color: colors.text.secondary,
            fontFamily: "'Noto Sans JP', sans-serif",
            textAlign: 'center', margin: 0, lineHeight: 1.7,
          }}>
            {count > 0
              ? `${count}個の良かった日が記録されています`
              : '記録はまだありません'}
          </p>
        )}

      </div>
    </ModuleShell>
  )
}
