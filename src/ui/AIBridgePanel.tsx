/**
 * AIBridgePanel — 「魔法のボタン」グローバルUI
 *
 * askAI() が呼ばれたとき（study / emotion / journal / waiting）に画面下部に現れる。
 * companion モジュールは独自のインラインUIを持つためこのパネルは表示しない。
 * /vault では表示しない（Vault Isolation Policy）。
 */

import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  getPendingAI,
  subscribeAI,
  submitAIResponse,
  cancelAIRequest,
  openAIChat,
  readResponseFromClipboard,
  type AIPendingInfo,
} from '../core/ai-bridge'
import { colors } from './tokens'

export function AIBridgePanel() {
  const location                    = useLocation()
  const [pending, setPending]         = useState<AIPendingInfo | null>(getPendingAI)
  const [manualText, setManualText]   = useState('')
  const [showManual, setShowManual]   = useState(false)
  const [showPrompt, setShowPrompt]   = useState(false)
  const [flash, setFlash]             = useState<{ msg: string; ok: boolean } | null>(null)
  const textareaRef                   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    return subscribeAI(() => {
      const next = getPendingAI()
      setPending(next)
      if (next) {
        setManualText('')
        setShowManual(false)
        setFlash(null)
      }
    })
  }, [])

  if (location.pathname.includes('/vault'))     return null
  if (location.pathname.includes('/companion')) return null
  if (location.pathname.includes('/news'))      return null
  if (!pending) return null

  const svc   = pending.service === 'gemini' ? 'Gemini' : 'Claude'
  const svcCl = pending.service === 'gemini' ? '#34A853' : colors.accent.indigo

  function showFlash(msg: string, ok: boolean) {
    setFlash({ msg, ok })
    setTimeout(() => setFlash(null), 2500)
  }

  function handleOpen() {
    openAIChat(pending!.prompt, pending!.service)
  }

  async function handlePaste() {
    try {
      const text = await readResponseFromClipboard()
      submitAIResponse(text)
      showFlash('受け取りました ✓', true)
    } catch {
      setShowManual(true)
      setTimeout(() => textareaRef.current?.focus(), 100)
      showFlash('手動で貼り付けてください', false)
    }
  }

  function handleManualSubmit() {
    const text = manualText.trim()
    if (!text) return
    submitAIResponse(text)
    setManualText('')
    setShowManual(false)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(16,14,32,0.98)',
      backdropFilter: 'blur(20px) saturate(120%)',
      borderTop: `1px solid ${svcCl}55`,
      borderRadius: '20px 20px 0 0',
      boxShadow: '0 -4px 32px rgba(0,0,0,0.6)',
      fontFamily: '"Noto Sans JP", system-ui, sans-serif',
      maxHeight: '85vh', overflowY: 'auto',
    }}>
      <div style={{ padding: '12px 18px 28px' }}>

        {/* ドラッグハンドル */}
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.18)',
          margin: '0 auto 14px',
        }} />

        {/* ヘッダー行 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span className="haku-pulse" style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: svcCl, boxShadow: `0 0 8px ${svcCl}AA`,
          }} />
          <span style={{ flex: 1, fontSize: 14, color: colors.text.primary, fontWeight: 500 }}>
            {svc} への質問
          </span>
          {flash && (
            <span style={{ fontSize: 12, color: flash.ok ? '#4ADE80' : colors.accent.amber }}>
              {flash.msg}
            </span>
          )}
          <button
            onClick={cancelAIRequest}
            aria-label="キャンセル"
            style={{
              background: 'transparent', border: 'none',
              color: colors.accent.ash, cursor: 'pointer',
              fontSize: 22, lineHeight: 1, padding: '0 2px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >×</button>
        </div>

        {/* ── 【1】タブを開くボタン ── */}
        <button
          onClick={handleOpen}
          style={{
            width: '100%', padding: '14px 0',
            background: `${svcCl}22`, border: `1px solid ${svcCl}66`,
            borderRadius: 14, color: colors.text.primary,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          【1】{svc} のタブを開く
        </button>
        <p style={{ fontSize: 12, color: colors.text.secondary, lineHeight: 1.7, margin: '6px 0 8px', paddingLeft: 2 }}>
          質問文はクリップボードにコピー済みです。{svc} の入力欄に貼り付けて送信してください。
        </p>

        {/* プロンプト確認 */}
        <button
          onClick={() => setShowPrompt(v => !v)}
          style={{
            background: 'transparent', border: 'none',
            color: colors.text.secondary, cursor: 'pointer',
            fontSize: 12, fontFamily: 'inherit', padding: '0 0 12px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {showPrompt ? '▾ 質問文を閉じる' : '▸ 質問文を確認する / コピーし直す'}
        </button>
        {showPrompt && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 12, padding: '10px 12px', marginBottom: 14,
          }}>
            <p style={{
              fontSize: 11, color: colors.text.secondary, margin: '0 0 8px',
              fontFamily: 'inherit', lineHeight: 1.7, maxHeight: 120, overflowY: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {pending.prompt.slice(0, 600)}{pending.prompt.length > 600 ? '…' : ''}
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(pending!.prompt).catch(() => {})
                showFlash('コピーしました ✓', true)
              }}
              style={{
                background: `${svcCl}18`, border: `1px solid ${svcCl}44`,
                borderRadius: 8, padding: '5px 12px',
                color: svcCl, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              コピーし直す
            </button>
          </div>
        )}

        {/* ── 手順ガイド ── */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 16,
        }}>
          {[
            { n: '1', text: `開いたタブで${svc}に質問を送信`,                       c: svcCl },
            { n: '2', text: '回答を長押し → 「すべて選択」→「コピー」',              c: colors.accent.blush },
            { n: '3', text: 'このアプリに戻る',                                       c: colors.accent.blue  },
          ].map(({ n, text, c }) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, lineHeight: 2, fontSize: 13, color: colors.text.secondary }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: `${c}22`, border: `1px solid ${c}55`,
                color: c, fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{n}</span>
              {text}
            </div>
          ))}
        </div>

        {/* ── 【2】貼り付けボタン ── */}
        <button
          onClick={handlePaste}
          style={{
            width: '100%', padding: '14px 0',
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

        {/* ── 手動入力フォールバック ── */}
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => {
              setShowManual(v => !v)
              if (!showManual) setTimeout(() => textareaRef.current?.focus(), 100)
            }}
            style={{
              background: 'transparent', border: 'none',
              color: colors.text.secondary, cursor: 'pointer',
              fontSize: 12, fontFamily: 'inherit', padding: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {showManual ? '▾ 手動入力を閉じる' : '▸ うまく貼り付けられない場合はここに直接貼ってください'}
          </button>

          {showManual && (
            <>
              <textarea
                ref={textareaRef}
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                rows={5}
                placeholder="回答をここに貼り付け…"
                style={{
                  width: '100%', boxSizing: 'border-box', marginTop: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 12, color: colors.text.primary,
                  fontSize: 13, padding: '10px 12px',
                  fontFamily: 'inherit', resize: 'none', outline: 'none',
                  lineHeight: 1.6,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
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
                  この回答を使う
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
