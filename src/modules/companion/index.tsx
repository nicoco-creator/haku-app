import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { FushigiOrb } from '../../ui/FushigiOrb'
import { colors, getAccent, type Mood } from '../../ui/tokens'
import { chatLogs, type ChatLog } from '../../core/db'
import { askAI } from '../../core/ai-bridge'
import { useAppStore } from '../../core/store'
import '../../ui/transitions.css'

// ── constants ─────────────────────────────────────────────────────────────────

const GREETING      = 'こんにちは。今日はどんな一日でしたか？'
const MAX_HISTORY   = 40
const CONTEXT_LIMIT = 10

// ── helpers ───────────────────────────────────────────────────────────────────

function buildPrompt(history: ChatLog[], userText: string): string {
  const recent = history.slice(-CONTEXT_LIMIT)
  if (recent.length === 0) {
    return `Hakuが話しかけてきました。\n\nHaku: ${userText}\n\nフシギちゃんとして、短く返答してください（1〜2文程度）。`
  }
  const lines = recent
    .map((m) => (m.role === 'user' ? `Haku: ${m.text}` : `フシギちゃん: ${m.text}`))
    .join('\n')
  return `以下の会話に続けてフシギちゃんとして返答してください（1〜2文）。\n\n${lines}\nHaku: ${userText}\n\nフシギちゃん:`
}

// ── Bubbles ───────────────────────────────────────────────────────────────────

function FushigiBubble({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{
        background: 'rgba(168,200,232,0.12)',
        border: '1px solid rgba(168,200,232,0.20)',
        borderRadius: 18, borderTopLeftRadius: 4,
        padding: '10px 14px', maxWidth: '78%',
        fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
        fontSize: 14, color: colors.text.primary, lineHeight: 1.8,
        wordBreak: 'break-all',
      }}>
        {text}
      </div>
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        background: 'rgba(232,180,200,0.12)',
        border: '1px solid rgba(232,180,200,0.20)',
        borderRadius: 18, borderTopRightRadius: 4,
        padding: '10px 14px', maxWidth: '78%',
        fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 400,
        fontSize: 14, color: colors.text.primary, lineHeight: 1.8,
        wordBreak: 'break-all',
      }}>
        {text}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <style>{`@keyframes dotPulse{0%,80%,100%{opacity:.3}40%{opacity:1}}`}</style>
      <div style={{
        background: 'rgba(168,200,232,0.12)',
        border: '1px solid rgba(168,200,232,0.20)',
        borderRadius: 18, borderTopLeftRadius: 4,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            display: 'inline-block',
            width: 5, height: 5, borderRadius: '50%',
            background: colors.accent.blue,
            animation: 'dotPulse 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export function CompanionPage() {
  const navigate          = useNavigate()
  const setBackgroundTint = useAppStore((s) => s.setBackgroundTint)
  const alertLevel        = useAppStore((s) => s.alertLevel)

  const [logs,    setLogs]    = useState<ChatLog[]>([])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setBackgroundTint(getAccent('blue'))
    return () => setBackgroundTint(null)
  }, [setBackgroundTint])

  useEffect(() => {
    chatLogs.list().then((all) => setLogs(all.slice(-MAX_HISTORY)))
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs, loading])

  const latestFushigiMsg = [...logs].reverse().find((l) => l.role === 'fushigi')?.text ?? GREETING
  const fushigiMood: Mood = alertLevel >= 3 ? 'worried' : alertLevel >= 1 ? 'sleepy' : 'default'

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userEntry: Omit<ChatLog, 'id'> = {
      role: 'user', text, createdAt: new Date().toISOString(),
    }
    const userId   = await chatLogs.add(userEntry)
    const snapshot = [...logs] // capture history before state update for prompt
    setLogs((prev) => [...prev, { ...userEntry, id: userId }])
    setLoading(true)

    try {
      const aiText = await askAI(buildPrompt(snapshot, text))
      const fEntry: Omit<ChatLog, 'id'> = {
        role: 'fushigi', text: aiText, createdAt: new Date().toISOString(),
      }
      const fId = await chatLogs.add(fEntry)
      setLogs((prev) => [...prev, { ...fEntry, id: fId }])
    } catch {
      const fEntry: Omit<ChatLog, 'id'> = {
        role: 'fushigi',
        text: 'ごめんなさい、うまく届きませんでした。もう一度、試してみますか？',
        createdAt: new Date().toISOString(),
      }
      const fId = await chatLogs.add(fEntry)
      setLogs((prev) => [...prev, { ...fEntry, id: fId }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const accentColor = colors.accent.blue
  const canSend = !!input.trim() && !loading

  const textareaStyle: CSSProperties = {
    flex: 1,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 16,
    padding: '10px 14px',
    color: colors.text.primary,
    fontFamily: "'Noto Sans JP', sans-serif",
    fontSize: 14, lineHeight: 1.6,
    resize: 'none', outline: 'none',
    minHeight: 44, maxHeight: 120,
  }

  const sendBtnStyle: CSSProperties = {
    flexShrink: 0,
    width: 48, height: 48, borderRadius: '50%',
    border: 'none',
    background: canSend ? accentColor : 'rgba(255,255,255,0.10)',
    color: canSend ? '#1C1A2E' : colors.text.secondary,
    cursor: canSend ? 'pointer' : 'not-allowed',
    fontSize: 18, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.2s, color 0.2s',
    alignSelf: 'flex-end',
  }

  return (
    <div
      className="page-enter"
      style={{
        height: '100svh',
        display: 'flex', flexDirection: 'column',
        padding: '0 16px', boxSizing: 'border-box',
      }}
    >
      {/* ヘッダー */}
      <header style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '20px 0 8px',
        color: accentColor,
        fontFamily: "'Noto Sans JP', sans-serif",
        fontSize: 14, fontWeight: 500,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit',
            padding: 0, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          ← セーブポイント
        </button>
      </header>

      {/* フシギちゃん Orb（上部 1/3） */}
      <div style={{
        flexShrink: 0,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        paddingBottom: 12,
      }}>
        <FushigiOrb mode="hero" mood={fushigiMood} message={latestFushigiMsg} />
      </div>

      {/* 会話履歴 */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          gap: 10,
          padding: '4px 0',
        }}
      >
        {logs.length === 0 && <FushigiBubble text={GREETING} />}
        {logs.map((log) =>
          log.role === 'fushigi'
            ? <FushigiBubble key={log.id} text={log.text} />
            : <UserBubble    key={log.id} text={log.text} />
        )}
        {loading && <TypingBubble />}
      </div>

      {/* 入力欄 */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'flex-end', gap: 8,
        padding: '8px 0 20px',
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="フシギちゃんに話しかける…"
          rows={1}
          style={textareaStyle}
        />
        <button onClick={() => void handleSend()} disabled={!canSend} style={sendBtnStyle}>
          ↑
        </button>
      </div>
    </div>
  )
}
