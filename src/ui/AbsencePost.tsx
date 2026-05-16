/**
 * 手紙の不在着信システム
 * ヘッダーにポストアイコン（未読バッジ付き）を表示し、
 * クリックでフシギちゃんからの手紙モーダルを開く。
 */

import { useState, useEffect, useCallback } from 'react'
import {
  loadLetters,
  markLetterRead,
  deleteReadLetters,
  formatAbsence,
  type AbsenceLetter,
} from '../core/absence'
import { recordLetterRead } from '../core/meta'
import { checkLetterBadges } from '../core/badges'
import { colors } from './tokens'

// ── Date formatter ────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

// ── Letter modal ──────────────────────────────────────────────────────────────

function LetterModal({
  letters,
  onRead,
  onClose,
}: {
  letters: AbsenceLetter[]
  onRead: (id: string) => void
  onClose: () => void
}) {
  const [idx, setIdx] = useState(0)
  const current = letters[idx]

  if (!current) return null

  const handleRead = () => {
    onRead(current.id)
    if (idx + 1 < letters.length) {
      setIdx(idx + 1)
    } else {
      onClose()
    }
  }

  const hasNext = idx + 1 < letters.length

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(14,12,28,0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(28,26,46,0.97)',
          border: '1px solid rgba(168,200,232,0.25)',
          borderRadius: 24, padding: '28px 24px',
          maxWidth: 400, width: '100%',
          display: 'flex', flexDirection: 'column', gap: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📮</span>
          <div style={{ flex: 1 }}>
            <p style={{
              margin: 0, fontSize: 12, color: colors.accent.blue,
              fontFamily: "'Noto Sans JP',sans-serif",
            }}>
              フシギちゃんより
            </p>
            <p style={{
              margin: 0, fontSize: 11, color: colors.text.secondary,
              fontFamily: "'Noto Sans JP',sans-serif",
            }}>
              {fmtDate(current.generatedAt)}　{formatAbsence(current.absenceMinutes)}ぶりの手紙
            </p>
          </div>
          {letters.length > 1 && (
            <span style={{ fontSize: 11, color: colors.text.secondary, fontFamily: 'Inter,sans-serif' }}>
              {idx + 1} / {letters.length}
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="閉じる"
            style={{
              background: 'none', border: 'none',
              color: colors.accent.ash, cursor: 'pointer',
              fontSize: 22, lineHeight: 1, padding: '0 2px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >×</button>
        </div>

        {/* 区切り線 */}
        <div style={{ height: 1, background: 'rgba(168,200,232,0.15)' }} />

        {/* 手紙本文 */}
        <p style={{
          margin: 0,
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 'clamp(14px,4vw,16px)',
          color: colors.text.primary, lineHeight: 2,
          minHeight: '4em',
        }}>
          {current.content}
        </p>

        {/* 区切り線 */}
        <div style={{ height: 1, background: 'rgba(168,200,232,0.15)' }} />

        {/* アクションボタン */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {!current.read && (
            <button
              onClick={handleRead}
              style={{
                background: `${colors.accent.blue}22`,
                border: `1px solid ${colors.accent.blue}55`,
                borderRadius: 20, padding: '8px 22px',
                color: colors.text.primary,
                fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                fontSize: 13, cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {hasNext ? '読んだ → 次へ' : '読んだ'}
            </button>
          )}
          {current.read && (
            <button
              onClick={hasNext ? () => setIdx(idx + 1) : onClose}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 20, padding: '8px 22px',
                color: colors.text.secondary,
                fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                fontSize: 13, cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {hasNext ? '次へ' : '閉じる'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PostIcon (header button) ─────────────────────────────────────────────────

export function AbsencePostIcon() {
  const [letters,    setLetters]    = useState<AbsenceLetter[]>([])
  const [modalOpen,  setModalOpen]  = useState(false)

  const reload = useCallback(() => setLetters(loadLetters()), [])

  useEffect(() => {
    reload()
    // Re-sync when tab regains focus (in case another tab wrote letters)
    const onFocus = () => reload()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  const unread = letters.filter(l => !l.read).length

  const handleOpen = () => {
    // Show unread letters first, then read letters
    const sorted = [...letters].sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    })
    setLetters(sorted)
    setModalOpen(true)
  }

  const handleRead = (id: string) => {
    markLetterRead(id)
    recordLetterRead()
    checkLetterBadges()  // earn absent_letter_10 if threshold reached
    reload()
  }

  const handleClose = () => {
    setModalOpen(false)
    // Prune letters that are all read (keep for history 30 days)
    deleteReadLetters()
    reload()
  }

  if (letters.length === 0) return null

  return (
    <>
      <button
        onClick={handleOpen}
        title="フシギちゃんからの手紙"
        aria-label={`フシギちゃんからの手紙 ${unread > 0 ? `未読${unread}件` : ''}`}
        style={{
          position: 'relative',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '22px', lineHeight: 1, padding: '4px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        📮
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            minWidth: 16, height: 16, borderRadius: 8,
            background: colors.accent.blush,
            color: '#fff',
            fontSize: 10, fontFamily: 'Inter,sans-serif', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {modalOpen && (
        <LetterModal
          letters={letters}
          onRead={handleRead}
          onClose={handleClose}
        />
      )}
    </>
  )
}
