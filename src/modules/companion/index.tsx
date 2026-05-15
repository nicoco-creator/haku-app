import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { FushigiOrb } from '../../ui/FushigiOrb'
import { colors, getAccent, type Mood } from '../../ui/tokens'
import { chatLogs, type ChatLog } from '../../core/db'
import { openAIChat, readResponseFromClipboard } from '../../core/ai-bridge'
import { useAppStore } from '../../core/store'
import { calcPositiveDensity } from '../../core/lexicon'
import { FUSHIGI_PROTOCOL } from '../../core/protocol'
import '../../ui/transitions.css'

// ── constants ─────────────────────────────────────────────────────────────────

const GREETING         = 'こんにちは。今日はどんな一日でしたか？'
const MAX_HISTORY      = 40
const CONTEXT_LIMIT    = 10
const SILENCE_RATIO    = 0.5
const SILENCE_DURATION = 5000

// ── intelligence helpers ──────────────────────────────────────────────────────

function calcAvgUserChars(allLogs: ChatLog[]): number {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const cutoffStr = cutoff.toISOString()
  const msgs = allLogs.filter((m) => m.role === 'user' && m.createdAt >= cutoffStr)
  if (msgs.length === 0) return 0
  return msgs.reduce((s, m) => s + m.text.length, 0) / msgs.length
}

function isTensionAlert(text: string, alertLevel: number): boolean {
  if (alertLevel < 1) return false
  return calcPositiveDensity(text) > 0.6 || text.includes('！')
}

// ── prompt builders ───────────────────────────────────────────────────────────

function buildPrompt(history: ChatLog[], userText: string): string {
  const recent = history.slice(-CONTEXT_LIMIT)
  if (recent.length === 0) {
    return `${FUSHIGI_PROTOCOL}\n\n---\n\nHakuが話しかけてきました。\n\nHaku: ${userText}\n\nフシギちゃんとして、短く返答してください（1〜2文程度）。`
  }
  const lines = recent
    .map((m) => (m.role === 'user' ? `Haku: ${m.text}` : `フシギちゃん: ${m.text}`))
    .join('\n')
  return `${FUSHIGI_PROTOCOL}\n\n---\n\n以下の会話に続けてフシギちゃんとして返答してください（1〜2文）。\n\n${lines}\nHaku: ${userText}\n\nフシギちゃん:`
}

function buildTensionPrompt(userText: string): string {
  return `${FUSHIGI_PROTOCOL}\n\n---\n\nHakuのテンションが高い状態です。ルール3を特に意識してください。「最後にちゃんと眠れたのはいつですか？」という方向で、1〜2文で返答してください。\n\nHaku: ${userText}\n\nフシギちゃん:`
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

function WaitingBubble() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <style>{`@keyframes dotPulse{0%,80%,100%{opacity:.3}40%{opacity:1}}`}</style>
      <div style={{
        background: 'rgba(168,200,232,0.08)',
        border: '1px solid rgba(168,200,232,0.15)',
        borderRadius: 18, borderTopLeftRadius: 4,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
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

  const [logs,          setLogs]          = useState<ChatLog[]>([])
  const [input,         setInput]         = useState('')
  const [waitingPaste,  setWaitingPaste]  = useState(false)
  const [showManual,    setShowManual]    = useState(false)
  const [manualText,    setManualText]    = useState('')
  const [silenceActive, setSilenceActive] = useState(false)
  const [avgUserChars,  setAvgUserChars]  = useState(0)
  // pendingPrompt はClaudeに送ったプロンプトを保持（「再び開く」用）
  const [pendingPrompt, setPendingPrompt] = useState<string>('')

  const scrollRef    = useRef<HTMLDivElement>(null)
  const manualRef    = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setBackgroundTint(getAccent('blue'))
    return () => setBackgroundTint(null)
  }, [setBackgroundTint])

  useEffect(() => {
    chatLogs.list().then((all) => {
      setLogs(all.slice(-MAX_HISTORY))
      setAvgUserChars(calcAvgUserChars(all))
    })
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs, waitingPaste, silenceActive])

  const latestFushigiMsg = [...logs].reverse().find((l) => l.role === 'fushigi')?.text ?? GREETING
  const fushigiMood: Mood = alertLevel >= 3 ? 'worried' : alertLevel >= 1 ? 'sleepy' : 'default'

  // ── 送信 ─────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim()
    if (!text || waitingPaste) return
    setInput('')
    setSilenceActive(false)

    const userEntry: Omit<ChatLog, 'id'> = { role: 'user', text, createdAt: new Date().toISOString() }
    const userId   = await chatLogs.add(userEntry)
    const snapshot = [...logs]
    setLogs((prev) => [...prev, { ...userEntry, id: userId }])

    // 沈黙の知性
    if (avgUserChars > 0 && text.length <= avgUserChars * SILENCE_RATIO) {
      setSilenceActive(true)
      setTimeout(() => setSilenceActive(false), SILENCE_DURATION)
      return
    }

    // プロンプト組み立て → Claudeタブを開く
    const prompt = isTensionAlert(text, alertLevel)
      ? buildTensionPrompt(text)
      : buildPrompt(snapshot, text)

    setPendingPrompt(prompt)
    setWaitingPaste(true)
    setShowManual(false)
    setManualText('')
    openAIChat(prompt, 'claude')
  }

  // ── 回答を受け取る（クリップボード） ────────────────────────────────────────
  const handlePaste = async () => {
    try {
      const text = await readResponseFromClipboard()
      await saveAIReply(text)
    } catch {
      // 失敗 → 手動テキストエリアを表示
      setShowManual(true)
      setTimeout(() => manualRef.current?.focus(), 100)
    }
  }

  // ── 手動入力で送信 ────────────────────────────────────────────────────────────
  const handleManualSubmit = async () => {
    const text = manualText.trim()
    if (!text) return
    await saveAIReply(text)
    setManualText('')
    setShowManual(false)
  }

  // ── フシギちゃんの返答をDBに保存 ──────────────────────────────────────────────
  const saveAIReply = async (text: string) => {
    const fEntry: Omit<ChatLog, 'id'> = {
      role: 'fushigi', text, createdAt: new Date().toISOString(),
    }
    const fId = await chatLogs.add(fEntry)
    setLogs((prev) => [...prev, { ...fEntry, id: fId }])
    setWaitingPaste(false)
    setShowManual(false)
    setPendingPrompt('')
  }

  const handleKeyDown = (e: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const accentColor = colors.accent.blue
  const canSend     = !!input.trim() && !waitingPaste

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

      {/* フシギちゃん Orb */}
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
          flex: 1, overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          gap: 10, padding: '4px 0',
        }}
      >
        {logs.length === 0 && <FushigiBubble text={GREETING} />}
        {logs.map((log) =>
          log.role === 'fushigi'
            ? <FushigiBubble key={log.id} text={log.text} />
            : <UserBubble    key={log.id} text={log.text} />
        )}
        {waitingPaste  && <WaitingBubble />}
        {silenceActive && <FushigiBubble text="……。" />}
      </div>

      {/* ── 貼り付けエリア（回答待ち中に表示） ── */}
      {waitingPaste && (
        <div style={{
          flexShrink: 0,
          padding: '10px 0 4px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {/* 再度開くリンク */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => openAIChat(pendingPrompt, 'claude')}
              style={{
                flex: 1, padding: '8px 0',
                background: `${colors.accent.indigo}18`,
                border: `1px solid ${colors.accent.indigo}44`,
                borderRadius: 12, color: colors.text.secondary,
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Claude を再度開く
            </button>
            <button
              onClick={() => { setWaitingPaste(false); setShowManual(false) }}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, color: colors.accent.ash,
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              キャンセル
            </button>
          </div>

          {/* メインの貼り付けボタン */}
          <button
            onClick={handlePaste}
            style={{
              padding: '14px 0',
              background: `${colors.accent.blush}22`,
              border: `1px solid ${colors.accent.blush}66`,
              borderRadius: 14, color: colors.accent.blush,
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            【2】コピーした回答を貼り付ける
          </button>

          {/* 手動フォールバック */}
          <button
            onClick={() => {
              setShowManual(v => !v)
              if (!showManual) setTimeout(() => manualRef.current?.focus(), 100)
            }}
            style={{
              background: 'transparent', border: 'none',
              color: colors.text.secondary, cursor: 'pointer',
              fontSize: 12, fontFamily: 'inherit', padding: '2px 0',
              WebkitTapHighlightColor: 'transparent',
              textAlign: 'left',
            }}
          >
            {showManual ? '▾ 手動入力を閉じる' : '▸ うまく貼り付けられない場合'}
          </button>

          {showManual && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea
                ref={manualRef}
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                rows={4}
                placeholder="フシギちゃんの返答をここに貼り付け…"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 12, color: colors.text.primary,
                  fontSize: 13, padding: '10px 12px',
                  fontFamily: 'inherit', resize: 'none', outline: 'none',
                  lineHeight: 1.6,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleManualSubmit}
                  disabled={!manualText.trim()}
                  style={{
                    padding: '7px 18px',
                    background: manualText.trim() ? colors.accent.indigo : 'rgba(255,255,255,0.08)',
                    border: 'none', borderRadius: 20,
                    color: manualText.trim() ? '#fff' : colors.text.secondary,
                    fontSize: 12, cursor: manualText.trim() ? 'pointer' : 'default',
                    fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  この返答を使う
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 入力欄（回答待ち中は隠す） ── */}
      {!waitingPaste && (
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
          <button
            onClick={() => void handleSend()}
            disabled={!canSend}
            style={{
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
            }}
          >
            ↑
          </button>
        </div>
      )}
    </div>
  )
}
