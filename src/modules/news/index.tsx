import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '../../ui/GlassCard'
import { colors } from '../../ui/tokens'
import { openAIChat, readResponseFromClipboard } from '../../core/ai-bridge'
import { newsReports } from '../../core/db'
import type { NewsReport } from '../../core/db'
import { NEWS_CATEGORIES, generateNewsPrompt } from './prompts'
import type { NewsCategory } from './prompts'

// ── 小コンポーネント ──────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: colors.text.secondary, fontSize: 22, lineHeight: 1,
        padding: '4px 12px 4px 0', flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      ‹
    </button>
  )
}

// ── カテゴリ選択画面 ───────────────────────────────────────────────────────────

function CategoryGrid({ onSelect }: { onSelect: (cat: NewsCategory) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {NEWS_CATEGORIES.map((cat) => (
        <GlassCard
          key={cat.id}
          accent={cat.accent}
          size="sm"
          onClick={() => onSelect(cat)}
          className="flex flex-col items-center justify-center gap-2"
          style={{ aspectRatio: '1.4', cursor: 'pointer', textAlign: 'center', padding: '18px 12px' }}
        >
          <span style={{ fontSize: 32, lineHeight: 1 }}>{cat.emoji}</span>
          <span style={{
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 12, color: colors.text.secondary, lineHeight: 1.5,
          }}>
            {cat.label}
          </span>
        </GlassCard>
      ))}
    </div>
  )
}

// ── 保存済みレポート一覧 ──────────────────────────────────────────────────────

function ArchiveList({
  reports,
  onOpen,
  onDelete,
}: {
  reports: NewsReport[]
  onOpen: (r: NewsReport) => void
  onDelete: (id: number) => void
}) {
  if (reports.length === 0) return null

  return (
    <div style={{ marginTop: 28 }}>
      <p style={{
        fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11,
        color: colors.text.secondary, margin: '0 0 12px',
        letterSpacing: '0.08em',
      }}>
        ── 保存済みレポート
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {reports.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '10px 14px',
              cursor: 'pointer',
            }}
            onClick={() => onOpen(r)}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>{r.categoryEmoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                fontSize: 13, color: colors.text.primary,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {r.categoryLabel}
              </p>
              <p style={{
                margin: 0, fontFamily: "'Noto Sans JP',sans-serif",
                fontSize: 10, color: colors.text.secondary,
              }}>
                {r.date}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(r.id!) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: `${colors.text.secondary}66`, fontSize: 18, lineHeight: 1,
                padding: '2px 4px', flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── リサーチ画面（プロンプト送信） ────────────────────────────────────────────

function ResearchView({
  cat,
  onBack,
  onReceive,
}: {
  cat: NewsCategory
  onBack: () => void
  onReceive: (text: string) => void
}) {
  const prompt      = generateNewsPrompt(cat.id)
  const [manualText, setManualText] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [flash, setFlash]           = useState<string | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function flashMsg(msg: string) {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2800)
  }

  function handleOpen() {
    openAIChat(prompt, 'claude')
  }

  async function handlePaste() {
    try {
      const text = await readResponseFromClipboard()
      onReceive(text)
    } catch {
      setShowManual(true)
      setTimeout(() => textareaRef.current?.focus(), 100)
      flashMsg('手動で貼り付けてください')
    }
  }

  function handleManualSubmit() {
    const text = manualText.trim()
    if (!text) return
    onReceive(text)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{`@keyframes researchPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }`}</style>

      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <BackButton onClick={onBack} />
        <span style={{ fontSize: 22 }}>{cat.emoji}</span>
        <h2 style={{
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 16, color: colors.text.primary, margin: 0, flex: 1,
        }}>
          {cat.label}のニュースを調査
        </h2>
        {flash && (
          <span style={{ fontSize: 11, color: colors.accent.amber }}>{flash}</span>
        )}
      </div>

      {/* 手順ガイド */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 16,
      }}>
        <p style={{
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 12, color: colors.text.secondary, margin: '0 0 12px', lineHeight: 1.9,
        }}>
          Claudeにウェブ検索付きで調査してもらいます。
        </p>
        {[
          { n: '1', text: '下の【Claudeで開く】を押す', c: colors.accent.indigo },
          { n: '2', text: 'Claudeの入力欄にプロンプトが貼り付けられているので送信', c: colors.accent.blush },
          { n: '3', text: '回答が出たらすべてコピーしてこのアプリに戻る', c: colors.accent.blue },
          { n: '4', text: '【回答を貼り付ける】を押す', c: colors.accent.silver },
        ].map(({ n, text, c }) => (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, fontSize: 13, color: colors.text.secondary, lineHeight: 1.6 }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              background: `${c}22`, border: `1px solid ${c}55`, color: c,
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{n}</span>
            {text}
          </div>
        ))}
      </div>

      {/* 【1】Claudeで開く */}
      <button
        onClick={handleOpen}
        style={{
          width: '100%', padding: '14px 0', marginBottom: 8,
          background: `${colors.accent.indigo}22`,
          border: `1px solid ${colors.accent.indigo}66`,
          borderRadius: 14, color: colors.text.primary,
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Noto Sans JP',sans-serif",
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        【1】Claudeで開く（プロンプトをコピー済み）
      </button>

      {/* プロンプト確認 */}
      <button
        onClick={() => setShowPrompt((v) => !v)}
        style={{
          background: 'transparent', border: 'none',
          color: colors.text.secondary, cursor: 'pointer',
          fontSize: 12, fontFamily: "'Noto Sans JP',sans-serif",
          padding: '0 0 14px', textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {showPrompt ? '▾ プロンプトを閉じる' : '▸ プロンプトを確認する / コピーし直す'}
      </button>

      {showPrompt && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 12, padding: '10px 12px', marginBottom: 14,
        }}>
          <p style={{
            fontSize: 11, color: colors.text.secondary, margin: '0 0 8px',
            fontFamily: 'monospace', lineHeight: 1.7,
            maxHeight: 160, overflowY: 'auto',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {prompt.slice(0, 800)}{prompt.length > 800 ? '…' : ''}
          </p>
          <button
            onClick={() => { navigator.clipboard.writeText(prompt).catch(() => {}); flashMsg('コピーしました ✓') }}
            style={{
              background: `${colors.accent.indigo}18`, border: `1px solid ${colors.accent.indigo}44`,
              borderRadius: 8, padding: '5px 12px',
              color: colors.accent.indigo, fontSize: 12, cursor: 'pointer',
              fontFamily: "'Noto Sans JP',sans-serif",
            }}
          >
            コピーし直す
          </button>
        </div>
      )}

      {/* 【2】貼り付けボタン */}
      <button
        onClick={handlePaste}
        style={{
          width: '100%', padding: '14px 0', marginBottom: 12,
          background: `${colors.accent.blush}22`,
          border: `1px solid ${colors.accent.blush}66`,
          borderRadius: 14, color: colors.accent.blush,
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Noto Sans JP',sans-serif",
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        【2】コピーした回答を貼り付ける
      </button>

      {/* 手動入力フォールバック */}
      <button
        onClick={() => { setShowManual((v) => !v); if (!showManual) setTimeout(() => textareaRef.current?.focus(), 100) }}
        style={{
          background: 'transparent', border: 'none',
          color: colors.text.secondary, cursor: 'pointer',
          fontSize: 12, fontFamily: "'Noto Sans JP',sans-serif",
          padding: 0, textAlign: 'left', marginBottom: showManual ? 8 : 0,
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
            onChange={(e) => setManualText(e.target.value)}
            rows={7}
            placeholder="Claudeの回答をここに貼り付け…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 12, color: colors.text.primary,
              fontSize: 13, padding: '10px 12px',
              fontFamily: "'Noto Sans JP',sans-serif",
              resize: 'vertical', outline: 'none', lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={handleManualSubmit}
              disabled={!manualText.trim()}
              style={{
                padding: '8px 20px',
                background: manualText.trim() ? colors.accent.indigo : 'rgba(255,255,255,0.08)',
                border: 'none', borderRadius: 20,
                color: manualText.trim() ? '#fff' : colors.text.secondary,
                fontSize: 12, cursor: manualText.trim() ? 'pointer' : 'default',
                fontFamily: "'Noto Sans JP',sans-serif",
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              この回答を使う
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── レポート表示画面 ──────────────────────────────────────────────────────────

function ReportView({
  cat,
  content,
  savedId,
  onBack,
  onSave,
}: {
  cat: NewsCategory
  content: string
  savedId: number | null
  onBack: () => void
  onSave: () => Promise<void>
}) {
  const [saving, setSaving]   = useState(false)
  const [saved,  setSaved]    = useState(savedId !== null)
  const [flash,  setFlash]    = useState<string | null>(null)

  function flashMsg(msg: string) {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2500)
  }

  async function handleSave() {
    if (saved) return
    setSaving(true)
    await onSave()
    setSaved(true)
    setSaving(false)
    flashMsg('保存しました ✓')
  }

  function handleCopy() {
    navigator.clipboard.writeText(content).catch(() => {})
    flashMsg('コピーしました ✓')
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div>
      {/* 印刷用スタイル */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area {
            font-family: 'Noto Serif JP', 'Hiragino Mincho Pro', serif;
            font-size: 13px; line-height: 1.9;
            color: #111; max-width: 720px; margin: 0 auto; padding: 20px;
          }
          body { background: white !important; }
        }
      `}</style>

      {/* ヘッダー（印刷では非表示） */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <BackButton onClick={onBack} />
        <span style={{ fontSize: 20 }}>{cat.emoji}</span>
        <h2 style={{
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 16, color: colors.text.primary, margin: 0, flex: 1,
        }}>
          {cat.label}レポート
        </h2>
        {flash && (
          <span style={{ fontSize: 11, color: colors.accent.blue }}>{flash}</span>
        )}
      </div>

      {/* アクションボタン（印刷では非表示） */}
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={handleSave}
          disabled={saved || saving}
          style={{
            flex: 1, minWidth: 100, padding: '9px 12px', borderRadius: 12,
            border: `1px solid ${saved ? 'rgba(255,255,255,0.1)' : colors.accent.blue + '66'}`,
            background: saved ? 'transparent' : `${colors.accent.blue}18`,
            color: saved ? colors.text.secondary : colors.text.primary,
            fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
            cursor: saved ? 'default' : 'pointer', transition: 'all 0.18s',
          }}
        >
          {saved ? '✓ 保存済み' : saving ? '保存中…' : '💾 保存する'}
        </button>
        <button
          onClick={handleCopy}
          style={{
            flex: 1, minWidth: 100, padding: '9px 12px', borderRadius: 12,
            border: `1px solid ${colors.accent.silver}55`,
            background: `${colors.accent.silver}10`,
            color: colors.text.secondary,
            fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12, cursor: 'pointer',
          }}
        >
          📋 コピー
        </button>
        <button
          onClick={handlePrint}
          style={{
            flex: 1, minWidth: 100, padding: '9px 12px', borderRadius: 12,
            border: `1px solid ${colors.accent.silver}55`,
            background: `${colors.accent.silver}10`,
            color: colors.text.secondary,
            fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12, cursor: 'pointer',
          }}
        >
          🖨️ PDF保存
        </button>
      </div>

      {/* レポート本文 */}
      <div
        className="print-area"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 16, padding: '20px 18px',
        }}
      >
        <p style={{
          fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 400,
          fontSize: 13, color: colors.text.primary,
          margin: 0, lineHeight: 1.95, whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {content}
        </p>
      </div>

      <p style={{
        fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10,
        color: `${colors.text.secondary}66`,
        textAlign: 'right', margin: '8px 4px 32px', lineHeight: 1.5,
      }}>
        {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
      </p>
    </div>
  )
}

// ── ページ本体 ────────────────────────────────────────────────────────────────

type View = 'categories' | 'research' | 'report' | 'archived'

export function NewsPage() {
  const navigate = useNavigate()
  const [view, setView]           = useState<View>('categories')
  const [selectedCat, setSelectedCat] = useState<NewsCategory | null>(null)
  const [reportContent, setReportContent] = useState('')
  const [currentSavedId, setCurrentSavedId] = useState<number | null>(null)
  const [archivedReports, setArchivedReports] = useState<NewsReport[]>([])
  const [archivedReport, setArchivedReport] = useState<NewsReport | null>(null)

  useEffect(() => {
    newsReports.list().then((list) => {
      setArchivedReports([...list].reverse())
    })
  }, [])

  const refreshArchive = () => {
    newsReports.list().then((list) => setArchivedReports([...list].reverse()))
  }

  const handleSelectCategory = (cat: NewsCategory) => {
    setSelectedCat(cat)
    setReportContent('')
    setCurrentSavedId(null)
    setView('research')
  }

  const handleReceiveReport = (text: string) => {
    setReportContent(text)
    setView('report')
  }

  const handleSaveReport = async () => {
    if (!selectedCat || !reportContent) return
    const id = await newsReports.add({
      date: new Date().toISOString().slice(0, 10),
      category: selectedCat.id,
      categoryLabel: selectedCat.label,
      categoryEmoji: selectedCat.emoji,
      content: reportContent,
      createdAt: new Date().toISOString(),
    })
    setCurrentSavedId(id)
    refreshArchive()
  }

  const handleOpenArchived = (r: NewsReport) => {
    setArchivedReport(r)
    setView('archived')
  }

  const handleDeleteArchived = async (id: number) => {
    await newsReports.delete(id)
    refreshArchive()
  }

  const handleBack = () => {
    if (view === 'research' || view === 'report' || view === 'archived') {
      setView('categories')
      setArchivedReport(null)
    } else {
      navigate('/')
    }
  }

  // ── レイアウト ──────────────────────────────────────────────────────────────

  const accentColor = selectedCat ? colors.accent[selectedCat.accent] : colors.accent.blue

  return (
    <div className="min-h-svh flex flex-col" style={{ overflowX: 'hidden' }}>

      {/* ページヘッダー（categories のときのみ） */}
      {view === 'categories' && (
        <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 16px 8px', flexShrink: 0 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.text.secondary, fontSize: 22, padding: '4px 12px 4px 0',
            }}
          >
            ‹
          </button>
          <h1 style={{
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 18, color: colors.text.primary, margin: 0,
          }}>
            今日のニュース
          </h1>
          <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: accentColor, animation: 'none' }} />
        </header>
      )}

      {/* コンテンツ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 48px' }}>

        {view === 'categories' && (
          <>
            <p style={{
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 13, color: colors.text.secondary,
              lineHeight: 1.9, margin: '4px 0 20px', textAlign: 'center',
            }}>
              気になるジャンルを選んでください。<br />
              <span style={{ fontSize: 11 }}>Claudeがウェブ検索で今日の情報を集めます。</span>
            </p>

            <CategoryGrid onSelect={handleSelectCategory} />

            <ArchiveList
              reports={archivedReports}
              onOpen={handleOpenArchived}
              onDelete={handleDeleteArchived}
            />
          </>
        )}

        {view === 'research' && selectedCat && (
          <ResearchView
            cat={selectedCat}
            onBack={handleBack}
            onReceive={handleReceiveReport}
          />
        )}

        {view === 'report' && selectedCat && (
          <ReportView
            cat={selectedCat}
            content={reportContent}
            savedId={currentSavedId}
            onBack={handleBack}
            onSave={handleSaveReport}
          />
        )}

        {view === 'archived' && archivedReport && (
          <ReportView
            cat={NEWS_CATEGORIES.find((c) => c.id === archivedReport.category) ?? NEWS_CATEGORIES[0]}
            content={archivedReport.content}
            savedId={archivedReport.id ?? null}
            onBack={handleBack}
            onSave={async () => {}}
          />
        )}
      </div>
    </div>
  )
}
