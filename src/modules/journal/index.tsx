import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard } from '../../ui/GlassCard'
import { glassCard, colors } from '../../ui/tokens'
import { db, journals, goodDays, type Journal, type QAPair } from '../../core/db'
import { askAI } from '../../core/ai-bridge'

// ── helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateJa(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${y}年${m}月${d}日`
}

// ── sub-components ────────────────────────────────────────────────────────────

function SpeechBubble({ question, answer, onChange }: {
  question: string
  answer: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 吹き出し */}
      <div style={{ position: 'relative', marginLeft: 8 }}>
        <div style={{
          ...glassCard,
          borderColor: `${colors.accent.blush}60`,
          padding: '14px 18px',
          borderRadius: 16,
        }}>
          <p style={{
            margin: 0,
            fontFamily: "'Noto Serif JP', serif",
            fontWeight: 300,
            fontSize: 14,
            color: colors.text.primary,
            lineHeight: 1.8,
          }}>
            {question}
          </p>
        </div>
        {/* 吹き出し尾 */}
        <div style={{
          position: 'absolute', bottom: -8, left: 20,
          width: 0, height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: `8px solid rgba(255,255,255,0.14)`,
        }} />
      </div>

      <textarea
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        placeholder="こたえる…"
        rows={3}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 12, padding: '12px',
          color: colors.text.primary,
          fontFamily: "'Noto Sans JP', sans-serif",
          fontSize: 14, resize: 'vertical', lineHeight: 1.7,
          outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

function GoodNightOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(20,18,42,0.85)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300,
    }}>
      <p style={{
        fontFamily: "'Noto Serif JP', serif",
        fontWeight: 300, fontSize: 'clamp(20px,5vw,28px)',
        color: colors.accent.blush, textAlign: 'center',
        letterSpacing: '0.12em',
      }}>
        おやすみなさい。
      </p>
    </div>
  )
}

// ── today view ────────────────────────────────────────────────────────────────

function TodayView() {
  const navigate = useNavigate()
  const today = todayStr()

  const [journalId,    setJournalId]    = useState<number | undefined>()
  const [goodThings,   setGoodThings]   = useState('')
  const [qaPairs,      setQaPairs]      = useState<QAPair[]>([])
  const [aiQuestion,   setAiQuestion]   = useState<string | null>(null)
  const [aiLoading,    setAiLoading]    = useState(false)
  const [goodnight,    setGoodnight]    = useState(false)
  const [saving,       setSaving]       = useState(false)

  const saveTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstTypedAtRef = useRef<number | null>(null)
  const aiTriggeredRef  = useRef(false)
  const aiTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 初期ロード ──
  useEffect(() => {
    db.journals.where('date').equals(today).first().then((rec) => {
      if (rec) {
        setJournalId(rec.id)
        setGoodThings(rec.goodThings)
        setQaPairs(rec.qaPairs ?? [])
        if (rec.qaPairs?.length) setAiQuestion(rec.qaPairs[0].q)
      }
    })
  }, [today])

  // ── DBへの保存 ──
  const persistJournal = useCallback(async (
    gt: string,
    qa: QAPair[],
    existingId?: number,
  ) => {
    setSaving(true)
    const now = new Date().toISOString()
    if (existingId !== undefined) {
      await journals.update(existingId, { goodThings: gt, qaPairs: qa })
    } else {
      const id = await journals.add({ date: today, goodThings: gt, qaPairs: qa, createdAt: now })
      setJournalId(id as number)
    }
    setSaving(false)
  }, [today])

  // ── debounce 保存 ──
  const scheduleSave = useCallback((gt: string, qa: QAPair[], id?: number) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => persistJournal(gt, qa, id), 500)
  }, [persistJournal])

  // ── AI質問トリガー ──
  const triggerAI = useCallback(async (text: string) => {
    if (aiTriggeredRef.current || aiLoading) return
    aiTriggeredRef.current = true
    setAiLoading(true)
    try {
      const q = await askAI(
        `ユーザーが今日の「良かったこと」として以下を書きました。\n\n「${text}」\n\n` +
        `この内容を「行動の解像度」でもっと具体的に深掘りする質問を1つだけ、` +
        `短く（30字以内）作ってください。感情語を先に置かず、行動や状況を聞く形にしてください。`
      )
      const clean = q.trim()
      setAiQuestion(clean)
      setQaPairs((prev) => {
        const next = prev.length ? prev : [{ q: clean, a: '' }]
        if (!prev.length) scheduleSave(goodThings, next, journalId)
        return next
      })
    } catch {
      // サイレント失敗
    } finally {
      setAiLoading(false)
    }
  }, [aiLoading, scheduleSave, goodThings, journalId])

  // ── goodThings 変更ハンドラ ──
  const handleGoodThingsChange = (v: string) => {
    setGoodThings(v)
    scheduleSave(v, qaPairs, journalId)

    if (!v.trim()) return

    // 初回入力時刻を記録
    if (!firstTypedAtRef.current) {
      firstTypedAtRef.current = Date.now()
      // 30秒タイマー
      aiTimerRef.current = setTimeout(() => {
        if (!aiTriggeredRef.current && goodThings.trim()) triggerAI(goodThings)
      }, 30_000)
    }

    // 200文字でトリガー
    if (!aiTriggeredRef.current && v.length >= 200) {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
      triggerAI(v)
    }
  }

  // ── QA回答変更 ──
  const handleAnswerChange = (idx: number, val: string) => {
    const next = qaPairs.map((p, i) => i === idx ? { ...p, a: val } : p)
    setQaPairs(next)
    scheduleSave(goodThings, next, journalId)
  }

  // ── 今日はここまで ──
  const handleDone = async () => {
    // 未保存分を即時保存
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await persistJournal(goodThings, qaPairs, journalId)

    // goodDays にコピー（良かったことがあれば）
    if (goodThings.trim()) {
      const existing = await db.goodDays.where('date').equals(today).first()
      if (!existing) {
        await goodDays.add({ date: today, content: goodThings.trim(), createdAt: new Date().toISOString() })
      }
    }

    setGoodnight(true)
    setTimeout(() => navigate('/'), 3000)
  }

  // cleanup
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (aiTimerRef.current)   clearTimeout(aiTimerRef.current)
  }, [])

  return (
    <>
      {goodnight && <GoodNightOverlay />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 日付 */}
        <p style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 300,
          fontSize: 'clamp(22px,5vw,28px)',
          color: colors.text.primary, margin: 0, letterSpacing: '0.04em',
        }}>
          {formatDateJa(today)}
        </p>

        {/* 良かったこと */}
        <GlassCard accent="blush" size="md">
          <label style={{
            display: 'block', marginBottom: 10,
            color: colors.accent.blush,
            fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13,
          }}>
            今日、良かったこと
          </label>
          <textarea
            value={goodThings}
            onChange={(e) => handleGoodThingsChange(e.target.value)}
            placeholder="どんな小さなことでも…"
            rows={5}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 12, padding: '12px',
              color: colors.text.primary,
              fontFamily: "'Noto Sans JP', sans-serif",
              fontSize: 14, resize: 'vertical', lineHeight: 1.8,
              outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, minHeight: 18 }}>
            {saving && (
              <span style={{ fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif" }}>
                保存中…
              </span>
            )}
          </div>
        </GlassCard>

        {/* AI質問ローディング */}
        {aiLoading && (
          <p style={{
            color: colors.text.secondary, fontSize: 13,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
            margin: 0, paddingLeft: 4,
          }}>
            フシギちゃんが考えています…
          </p>
        )}

        {/* AI質問 + 回答 */}
        {aiQuestion && qaPairs.map((pair, i) => (
          <SpeechBubble
            key={i}
            question={pair.q}
            answer={pair.a}
            onChange={(v) => handleAnswerChange(i, v)}
          />
        ))}

        {/* 今日はここまで */}
        <button
          onClick={handleDone}
          style={{
            marginTop: 8,
            background: `${colors.accent.blush}18`,
            border: `1px solid ${colors.accent.blush}60`,
            borderRadius: 14, padding: '14px',
            color: colors.accent.blush,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
            fontSize: 15, cursor: 'pointer',
            width: '100%', letterSpacing: '0.1em',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background = `${colors.accent.blush}28`
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background = `${colors.accent.blush}18`
          }}
        >
          今日はここまで
        </button>
      </div>
    </>
  )
}

// ── history view ──────────────────────────────────────────────────────────────

function HistoryView() {
  const [list, setList] = useState<Journal[]>([])
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    db.journals.orderBy('date').reverse().toArray().then(setList)
  }, [])

  if (!list.length) {
    return (
      <p style={{
        color: colors.text.secondary, fontSize: 14,
        textAlign: 'center', paddingTop: 40,
        fontFamily: "'Noto Sans JP', sans-serif",
      }}>
        まだ日記がありません
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {list.map((entry) => (
        <GlassCard
          key={entry.id}
          accent="blush"
          size="sm"
          onClick={() => setOpen(open === entry.id ? null : (entry.id ?? null))}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontFamily: "'Noto Sans JP', sans-serif", fontSize: 14,
              color: colors.text.primary,
            }}>
              {formatDateJa(entry.date)}
            </span>
            <span style={{ color: colors.text.secondary, fontSize: 12 }}>
              {open === entry.id ? '▲' : '▼'}
            </span>
          </div>

          {open === entry.id && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {entry.goodThings && (
                <p style={{
                  margin: 0, fontSize: 14, color: colors.text.primary,
                  fontFamily: "'Noto Sans JP', sans-serif",
                  lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {entry.goodThings}
                </p>
              )}

              {entry.qaPairs?.map((pair, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  <p style={{
                    margin: 0, fontSize: 13,
                    color: colors.accent.blush,
                    fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
                    lineHeight: 1.7,
                  }}>
                    {pair.q}
                  </p>
                  {pair.a && (
                    <p style={{
                      margin: 0, fontSize: 13, color: colors.text.primary,
                      fontFamily: "'Noto Sans JP', sans-serif",
                      lineHeight: 1.7, paddingLeft: 10,
                      borderLeft: `2px solid ${colors.accent.blush}50`,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {pair.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export function JournalPage() {
  const [tab, setTab] = useState<'today' | 'history'>('today')

  const tabStyle = (active: boolean): CSSProperties => ({
    flex: 1, padding: '8px 0',
    background: active ? `${colors.accent.blush}20` : 'transparent',
    border: 'none',
    borderBottom: `2px solid ${active ? colors.accent.blush : 'transparent'}`,
    color: active ? colors.accent.blush : colors.text.secondary,
    fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13,
    cursor: 'pointer', transition: 'all 0.2s ease',
  })

  return (
    <ModuleShell title="日記" accent="blush" backTo="/">
      {/* タブ */}
      <div style={{ display: 'flex', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <button style={tabStyle(tab === 'today')}   onClick={() => setTab('today')}>   今日のきろく </button>
        <button style={tabStyle(tab === 'history')} onClick={() => setTab('history')}> 過去の日記   </button>
      </div>

      {tab === 'today'   && <TodayView />}
      {tab === 'history' && <HistoryView />}
    </ModuleShell>
  )
}
