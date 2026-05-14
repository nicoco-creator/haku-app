// ⛔ DO NOT import ai-bridge in this module. AI access is forbidden.
// このモジュールからai-bridge.tsを絶対にimportしないこと。
// 「裁かない倉庫」のデータはいかなるAIにも渡してはならない。
// CLAUDE.md 絶対制約 / Vault Isolation Policy 参照。

import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { ModuleShell } from '../../ui/ModuleShell'
import { colors } from '../../ui/tokens'
import { vaultNotes, type VaultNote } from '../../core/db'

const ASH = colors.accent.ash

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function firstLine(text: string): string {
  const line = text.split('\n')[0].trim()
  return line.length > 60 ? line.slice(0, 60) + '…' : line
}

// ── Note item ─────────────────────────────────────────────────────────────

function NoteItem({
  note,
  expanded,
  onToggle,
  pendingDelete,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  note: VaultNote
  expanded: boolean
  onToggle: () => void
  pendingDelete: boolean
  onDeleteRequest: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
}) {
  const cardStyle: CSSProperties = {
    background: 'rgba(106,100,128,0.08)',
    border: `1px solid ${ASH}35`,
    borderRadius: 16,
    padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: 8,
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <button
          onClick={onToggle}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            textAlign: 'left', flex: 1, padding: 0,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: ASH, fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 4 }}>
            {formatDateTime(note.createdAt)}
          </p>
          <p style={{
            margin: 0, fontSize: 13,
            color: expanded ? colors.text.primary : colors.text.secondary,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
            lineHeight: 1.8,
            whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
            overflow: expanded ? 'visible' : 'hidden',
            textOverflow: expanded ? 'clip' : 'ellipsis',
          }}>
            {expanded ? note.content : firstLine(note.content)}
          </p>
          {!expanded && note.content.includes('\n') && (
            <p style={{ margin: '2px 0 0', fontSize: 10, color: ASH, fontFamily: "'Noto Sans JP', sans-serif" }}>
              続きを読む ▾
            </p>
          )}
        </button>

        {!pendingDelete ? (
          <button
            onClick={onDeleteRequest}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: `${ASH}80`, fontSize: 16, lineHeight: 1,
              padding: '2px 4px', flexShrink: 0,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#E89090' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = `${ASH}80` }}
            aria-label="削除"
          >
            ×
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP', sans-serif" }}>
              削除しますか？
            </span>
            <button
              onClick={onDeleteConfirm}
              style={{
                background: 'rgba(200,80,80,0.12)', border: '1px solid rgba(200,80,80,0.35)',
                borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                color: '#E89090', fontFamily: "'Noto Sans JP', sans-serif", fontSize: 11,
              }}
            >
              削除
            </button>
            <button
              onClick={onDeleteCancel}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                color: colors.text.secondary, fontFamily: "'Noto Sans JP', sans-serif", fontSize: 11,
              }}
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export function VaultPage() {
  const [draft,        setDraft]        = useState('')
  const [saved,        setSaved]        = useState(false)
  const [notes,        setNotes]        = useState<VaultNote[]>([])
  const [historyOpen,  setHistoryOpen]  = useState(false)
  const [expanded,     setExpanded]     = useState<Set<number>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const reload = () => vaultNotes.list().then((all) => setNotes([...all].reverse()))
  useEffect(() => { void reload() }, [])

  const handleSave = async () => {
    const text = draft.trim()
    if (!text) return
    const now = new Date().toISOString()
    await vaultNotes.add({ content: draft, createdAt: now, updatedAt: now })
    setDraft('')
    setSaved(true)
    void reload()
    setTimeout(() => setSaved(false), 3000)
    textareaRef.current?.focus()
  }

  const handleDelete = async (id: number) => {
    await vaultNotes.delete(id)
    setPendingDelete(null)
    void reload()
  }

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── styles ──────────────────────────────────────────────────────────────

  const textareaStyle: CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    minHeight: 240,
    background: 'rgba(106,100,128,0.08)',
    border: `1px solid ${ASH}40`,
    borderRadius: 18, padding: '18px 20px',
    color: colors.text.primary,
    fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
    fontSize: 15, lineHeight: 2.0,
    resize: 'vertical', outline: 'none',
    transition: 'border-color 0.3s',
  }

  const saveBtnStyle: CSSProperties = {
    padding: '10px 28px',
    background: draft.trim() ? `${ASH}20` : 'rgba(255,255,255,0.04)',
    border: `1px solid ${draft.trim() ? ASH + '55' : 'rgba(255,255,255,0.10)'}`,
    borderRadius: 20, cursor: draft.trim() ? 'pointer' : 'default',
    color: draft.trim() ? colors.text.primary : colors.text.secondary,
    fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
    fontSize: 13, letterSpacing: '0.08em',
    transition: 'all 0.2s',
    opacity: draft.trim() ? 1 : 0.5,
  }

  return (
    <ModuleShell title="裁かない倉庫" accent="ash" backTo="/" hideFushigi>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── subtle header ── */}
        <p style={{
          margin: 0, fontSize: 12,
          color: colors.text.secondary,
          fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 400,
          letterSpacing: '0.04em', lineHeight: 1.7,
        }}>
          これはあなただけが見られる場所です
        </p>

        {/* ── textarea ── */}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="ここに書いたことは、誰にも、AIにも渡りません。"
          style={textareaStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = `${ASH}80` }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = `${ASH}40` }}
        />

        {/* ── save row ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14 }}>
          {saved && (
            <span style={{
              fontSize: 12, color: ASH,
              fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
              letterSpacing: '0.04em',
            }}>
              保存しました ✓
            </span>
          )}
          <button
            onClick={() => void handleSave()}
            disabled={!draft.trim()}
            style={saveBtnStyle}
          >
            保存する
          </button>
        </div>

        {/* ── divider ── */}
        <div style={{ height: 1, background: `${ASH}20` }} />

        {/* ── history toggle ── */}
        {notes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => setHistoryOpen(o => !o)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, padding: 0,
                color: colors.text.secondary,
                fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
                fontSize: 13, letterSpacing: '0.06em',
              }}
            >
              <span style={{
                display: 'inline-block',
                transform: historyOpen ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s',
                fontSize: 10,
              }}>▶</span>
              過去のメモ（{notes.length}件）
            </button>

            {historyOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    expanded={expanded.has(note.id!)}
                    onToggle={() => toggleExpand(note.id!)}
                    pendingDelete={pendingDelete === note.id}
                    onDeleteRequest={() => setPendingDelete(note.id!)}
                    onDeleteConfirm={() => void handleDelete(note.id!)}
                    onDeleteCancel={() => setPendingDelete(null)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── isolation notice ── */}
        <p style={{
          margin: 0, fontSize: 11,
          color: `${ASH}70`,
          fontFamily: "'Noto Sans JP', sans-serif",
          textAlign: 'center', lineHeight: 1.7,
        }}>
          このメモはAIに送信されません。エクスポートは設定画面から。
        </p>

      </div>
    </ModuleShell>
  )
}
