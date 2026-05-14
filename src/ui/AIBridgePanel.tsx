import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { glassCard } from './tokens'
import {
  getPendingRequest,
  getLastResponse,
  writeManualResponse,
  type AIRequest,
  type AIResponse,
} from '../core/ai-bridge'

const HEARTBEAT_KEY = 'ai_bridge_heartbeat'
const CONNECTED_THRESHOLD_MS = 6_000

function dot(connected: boolean) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: connected ? '#4ADE80' : '#6A6480',
        boxShadow: connected ? '0 0 6px #4ADE80' : 'none',
        flexShrink: 0,
        transition: 'background 0.4s, box-shadow 0.4s',
      }}
    />
  )
}

export function AIBridgePanel() {
  const [pending,   setPending]   = useState<AIRequest  | null>(null)
  const [lastResp,  setLastResp]  = useState<AIResponse | null>(null)
  const [connected, setConnected] = useState(false)
  const [manual,    setManual]    = useState('')
  const [copied,    setCopied]    = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null)

  useEffect(() => {
    const tick = () => {
      setPending(getPendingRequest())
      setLastResp(getLastResponse())
      const hb = localStorage.getItem(HEARTBEAT_KEY)
      setConnected(!!hb && Date.now() - Number(hb) < CONNECTED_THRESHOLD_MS)
    }
    tick()
    intervalRef.current = setInterval(tick, 1_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const submitManual = () => {
    if (!pending || !manual.trim()) return
    writeManualResponse(pending.id, manual.trim())
    setManual('')
  }

  const copyPrompt = async () => {
    if (!pending) return
    await navigator.clipboard.writeText(pending.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2_000)
  }

  const label = (text: string) => (
    <span style={{ fontSize: '11px', color: '#A89FC0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
      {text}
    </span>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ステータスバー */}
      <div
        style={{
          ...glassCard,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          color: '#F0EEF8',
        }}
      >
        {dot(connected)}
        <span>
          Userscript {connected ? '接続中' : '未接続'}
        </span>
        {pending && (
          <span style={{ marginLeft: 'auto', color: '#C8A050', fontSize: '12px' }}>
            ⏳ 待機中
          </span>
        )}
      </div>

      {/* ペンディングリクエスト */}
      {pending && (
        <div style={{ ...glassCard, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {label('送信待ちリクエスト')}
          <pre
            style={{
              margin: 0,
              fontSize: '12px',
              color: '#A89FC0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '120px',
              overflowY: 'auto',
              lineHeight: 1.5,
            }}
          >
            {pending.prompt.slice(0, 300)}{pending.prompt.length > 300 ? '…' : ''}
          </pre>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={copyPrompt} style={btnStyle('#5B5CE6')}>
              {copied ? '✓ コピー済み' : 'プロンプトをコピー'}
            </button>
          </div>
        </div>
      )}

      {/* 手動レスポンス入力 */}
      {pending && (
        <div style={{ ...glassCard, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {label('手動レスポンス入力（規約対策）')}
          <textarea
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="AIの回答をここに貼り付けてください…"
            rows={4}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '8px',
              color: '#F0EEF8',
              fontSize: '13px',
              padding: '8px 12px',
              resize: 'vertical',
              fontFamily: "'Noto Sans JP', sans-serif",
              outline: 'none',
              lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={submitManual}
              disabled={!manual.trim()}
              style={btnStyle('#5B5CE6', !manual.trim())}
            >
              レスポンスを送信
            </button>
          </div>
        </div>
      )}

      {/* 最終レスポンス */}
      {lastResp && (
        <div style={{ ...glassCard, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {label(`最終応答  ${new Date(lastResp.timestamp).toLocaleTimeString('ja-JP')}`)}
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#F0EEF8',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '160px',
              overflowY: 'auto',
            }}
          >
            {lastResp.text}
          </p>
        </div>
      )}

      {!pending && !lastResp && (
        <p style={{ color: '#6A6480', fontSize: '13px', textAlign: 'center', margin: 0 }}>
          リクエストなし
        </p>
      )}
    </div>
  )
}

function btnStyle(color: string, disabled = false): CSSProperties {
  return {
    background: disabled ? 'rgba(255,255,255,0.05)' : `${color}33`,
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.1)' : `${color}88`}`,
    borderRadius: '8px',
    color: disabled ? '#6A6480' : '#F0EEF8',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '12px',
    padding: '6px 14px',
    fontFamily: "'Noto Sans JP', sans-serif",
    transition: 'background 0.2s',
  }
}
