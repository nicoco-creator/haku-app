import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  getPendingRequest,
  getLastResponse,
  writeManualResponse,
  type AIRequest,
} from '../core/ai-bridge'

export function AIBridgeOverlay() {
  const location = useLocation()
  const [pending, setPending]       = useState<AIRequest | null>(null)
  const [expanded, setExpanded]     = useState(false)
  const [manualText, setManualText] = useState('')
  const [flash, setFlash]           = useState<{ msg: string; ok: boolean } | null>(null)
  const textareaRef                 = useRef<HTMLTextAreaElement>(null)

  // Poll for pending request state every 500ms
  useEffect(() => {
    const iv = setInterval(() => {
      setPending(getPendingRequest())
    }, 500)
    return () => clearInterval(iv)
  }, [])

  // Reset expanded state when a new request comes in
  const prevIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (pending && pending.id !== prevIdRef.current) {
      prevIdRef.current = pending.id
      setExpanded(false)
      setManualText('')
      setFlash(null)
    }
  }, [pending?.id])

  // Don't render on /vault (Vault Isolation Policy)
  if (location.pathname.includes('/vault')) return null
  if (!pending) return null

  function showFlash(msg: string, ok: boolean) {
    setFlash({ msg, ok })
    setTimeout(() => setFlash(null), 2500)
  }

  function handleCheck() {
    const resp = getLastResponse()
    if (resp && resp.id === pending!.id) {
      // Re-write to ensure askAI()'s polling picks it up (no-op if already received)
      writeManualResponse(pending!.id, resp.text, resp.status as 'done' | 'error')
      showFlash('受け取りました ✓', true)
    } else {
      showFlash('まだ届いていません', false)
      setExpanded(true)
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }

  function handleCancel() {
    writeManualResponse(pending!.id, 'キャンセルされました', 'error')
    setExpanded(false)
    setManualText('')
  }

  function handleSubmit() {
    const text = manualText.trim()
    if (!text) return
    writeManualResponse(pending!.id, text, 'done')
    setManualText('')
    setExpanded(false)
    showFlash('送信しました ✓', true)
  }

  const serviceLabel = pending.service === 'gemini' ? 'Gemini' : 'Claude'

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: 'rgba(18,16,38,0.97)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(91,92,230,0.35)',
        padding: expanded ? '14px 16px 28px' : '10px 14px',
        transition: 'padding 0.2s ease',
        fontFamily: '"Noto Sans JP", system-ui, sans-serif',
      }}
    >
      {/* ── Top row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '32px' }}>

        {/* Pulsing dot */}
        <span
          className="haku-pulse"
          style={{
            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
            background: '#5B5CE6', boxShadow: '0 0 8px #5B5CE6AA',
          }}
        />

        {/* Status text */}
        <span style={{ flex: 1, fontSize: '13px', color: '#A89FC0', lineHeight: 1.4 }}>
          {serviceLabel} が考え中…
        </span>

        {/* Flash message */}
        {flash && (
          <span
            style={{
              fontSize: '12px',
              color: flash.ok ? '#4ADE80' : '#E8B4C8',
              flexShrink: 0,
              transition: 'opacity 0.3s',
            }}
          >
            {flash.msg}
          </span>
        )}

        {/* Primary button */}
        <button
          onClick={handleCheck}
          style={{
            background: 'rgba(91,92,230,0.18)', border: '1px solid rgba(91,92,230,0.45)',
            borderRadius: '20px', color: '#F0EEF8', cursor: 'pointer',
            fontSize: '12px', padding: '6px 14px', fontFamily: 'inherit', flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          回答を受け取る
        </button>

        {/* Cancel */}
        <button
          onClick={handleCancel}
          aria-label="キャンセル"
          style={{
            background: 'transparent', border: 'none',
            color: '#6A6480', cursor: 'pointer',
            fontSize: '20px', lineHeight: 1, padding: '2px 4px', flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ×
        </button>
      </div>

      {/* ── Expanded: manual paste ── */}
      {expanded && (
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '12px', color: '#A89FC0', margin: '0 0 8px', lineHeight: 1.6 }}>
            {serviceLabel} の回答をコピーして貼り付けてください：
          </p>
          <textarea
            ref={textareaRef}
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            rows={5}
            placeholder="ここに貼り付け…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '12px', color: '#F0EEF8',
              fontSize: '13px', padding: '10px 12px',
              fontFamily: 'inherit', resize: 'none', outline: 'none',
              lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={() => setExpanded(false)}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '20px', color: '#A89FC0', cursor: 'pointer',
                fontSize: '12px', padding: '6px 14px', fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              閉じる
            </button>
            <button
              onClick={handleSubmit}
              disabled={!manualText.trim()}
              style={{
                background: manualText.trim() ? '#5B5CE6' : 'rgba(91,92,230,0.2)',
                border: 'none', borderRadius: '20px',
                color: manualText.trim() ? '#fff' : '#6A6480',
                cursor: manualText.trim() ? 'pointer' : 'default',
                fontSize: '12px', padding: '6px 16px', fontFamily: 'inherit',
                transition: 'background 0.2s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              この回答を使う
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
