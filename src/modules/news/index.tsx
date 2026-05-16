import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '../../ui/GlassCard'
import { PdfViewer } from '../../ui/PdfViewer'
import { colors } from '../../ui/tokens'
import { openAIChat, readResponseFromClipboard } from '../../core/ai-bridge'
import { newsReports } from '../../core/db'
import type { NewsReport } from '../../core/db'
import { NEWS_CATEGORIES, generateNewsPrompt, generateSlidesPrompt } from './prompts'
import type { NewsCategory } from './prompts'

// ── ワークフロータイプ ────────────────────────────────────────────────────────

type WorkflowType = 'claude_research' | 'gemini_slides'

// ── ヘルパーコンポーネント ────────────────────────────────────────────────────

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

// ── カテゴリ選択 ──────────────────────────────────────────────────────────────

function CategoryGrid({ onSelect }: { onSelect: (cat: NewsCategory) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {NEWS_CATEGORIES.map((cat) => (
        <GlassCard
          key={cat.id}
          accent={cat.accent}
          size="sm"
          onClick={() => onSelect(cat)}
          style={{ cursor: 'pointer', textAlign: 'center', padding: '18px 12px', aspectRatio: '1.4' }}
          className="flex flex-col items-center justify-center gap-2"
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
  onImportPdf,
}: {
  reports: NewsReport[]
  onOpen: (r: NewsReport) => void
  onDelete: (id: number) => void
  onImportPdf: () => void
}) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{
          fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11,
          color: colors.text.secondary, margin: 0,
          letterSpacing: '0.08em',
        }}>
          ── 保存済みレポート
        </p>
        <button
          onClick={onImportPdf}
          style={{
            background: `${colors.accent.blue}18`,
            border: `1px solid ${colors.accent.blue}55`,
            borderRadius: 12, padding: '5px 12px',
            color: colors.accent.blue,
            fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11, cursor: 'pointer',
          }}
        >
          + PDFをインポート
        </button>
      </div>

      {reports.length === 0 ? (
        <p style={{
          textAlign: 'center',
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 12, color: `${colors.text.secondary}80`,
          lineHeight: 1.8, margin: '4px 0',
        }}>
          まだ保存されたレポートはありません
        </p>
      ) : (
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
              <span style={{ fontSize: 20, flexShrink: 0 }}>
                {r.reportType === 'pdf' ? '📄' : r.categoryEmoji}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                  fontSize: 13, color: colors.text.primary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.categoryLabel}
                  {r.reportType === 'pdf' && (
                    <span style={{ fontSize: 10, color: colors.accent.blue, marginLeft: 6 }}>PDF</span>
                  )}
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
      )}
    </div>
  )
}

// ── リサーチ画面（Claude）──────────────────────────────────────────────────────

function ClaudeResearchView({
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
  const [flash,      setFlash]      = useState<string | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function flashMsg(msg: string) { setFlash(msg); setTimeout(() => setFlash(null), 2800) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <BackButton onClick={onBack} />
        <span style={{ fontSize: 22 }}>{cat.emoji}</span>
        <h2 style={{
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 16, color: colors.text.primary, margin: 0, flex: 1,
        }}>
          {cat.label} — Claude調査
        </h2>
        {flash && <span style={{ fontSize: 11, color: colors.accent.amber }}>{flash}</span>}
      </div>

      {/* 手順ガイド */}
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 16,
      }}>
        <p style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 12, color: colors.text.secondary, margin: '0 0 10px', lineHeight: 1.9 }}>
          Claudeがウェブ検索で今日の情報を調査します。
        </p>
        {[
          { n: '1', text: '【Claudeで開く】を押す', c: colors.accent.indigo },
          { n: '2', text: 'プロンプトを貼り付けて送信（WebSearch が動きます）', c: colors.accent.blush },
          { n: '3', text: '回答をすべてコピーしてアプリに戻る', c: colors.accent.blue },
          { n: '4', text: '【回答を貼り付ける】を押す', c: colors.accent.silver },
        ].map(({ n, text, c }) => (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, fontSize: 13, color: colors.text.secondary, lineHeight: 1.6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1, background: `${c}22`, border: `1px solid ${c}55`, color: c, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
            {text}
          </div>
        ))}
      </div>

      <button
        onClick={() => openAIChat(prompt, 'claude')}
        style={{ width: '100%', padding: '14px 0', marginBottom: 8, background: `${colors.accent.indigo}22`, border: `1px solid ${colors.accent.indigo}66`, borderRadius: 14, color: colors.text.primary, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Noto Sans JP',sans-serif" }}
      >
        【1】Claudeで開く（プロンプトをコピー済み）
      </button>

      <button
        onClick={() => setShowPrompt((v) => !v)}
        style={{ background: 'transparent', border: 'none', color: colors.text.secondary, cursor: 'pointer', fontSize: 12, fontFamily: "'Noto Sans JP',sans-serif", padding: '0 0 14px', textAlign: 'left' }}
      >
        {showPrompt ? '▾ プロンプトを閉じる' : '▸ プロンプトを確認する / コピーし直す'}
      </button>

      {showPrompt && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '10px 12px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, color: colors.text.secondary, margin: '0 0 8px', fontFamily: 'monospace', lineHeight: 1.7, maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {prompt.slice(0, 800)}{prompt.length > 800 ? '…' : ''}
          </p>
          <button onClick={() => { navigator.clipboard.writeText(prompt).catch(() => {}); flashMsg('コピーしました ✓') }}
            style={{ background: `${colors.accent.indigo}18`, border: `1px solid ${colors.accent.indigo}44`, borderRadius: 8, padding: '5px 12px', color: colors.accent.indigo, fontSize: 12, cursor: 'pointer', fontFamily: "'Noto Sans JP',sans-serif" }}>
            コピーし直す
          </button>
        </div>
      )}

      <button
        onClick={async () => {
          try { onReceive(await readResponseFromClipboard()) }
          catch { setShowManual(true); setTimeout(() => textareaRef.current?.focus(), 100); flashMsg('手動で貼り付けてください') }
        }}
        style={{ width: '100%', padding: '14px 0', marginBottom: 12, background: `${colors.accent.blush}22`, border: `1px solid ${colors.accent.blush}66`, borderRadius: 14, color: colors.accent.blush, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Noto Sans JP',sans-serif" }}
      >
        【2】コピーした回答を貼り付ける
      </button>

      <button
        onClick={() => { setShowManual((v) => !v); if (!showManual) setTimeout(() => textareaRef.current?.focus(), 100) }}
        style={{ background: 'transparent', border: 'none', color: colors.text.secondary, cursor: 'pointer', fontSize: 12, fontFamily: "'Noto Sans JP',sans-serif", padding: 0, textAlign: 'left', marginBottom: showManual ? 8 : 0 }}
      >
        {showManual ? '▾ 手動入力を閉じる' : '▸ うまく貼り付けられない場合はここに直接貼ってください'}
      </button>

      {showManual && (
        <>
          <textarea ref={textareaRef} value={manualText} onChange={(e) => setManualText(e.target.value)} rows={7}
            placeholder="Claudeの回答をここに貼り付け…"
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, color: colors.text.primary, fontSize: 13, padding: '10px 12px', fontFamily: "'Noto Sans JP',sans-serif", resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => { if (manualText.trim()) onReceive(manualText.trim()) }}
              disabled={!manualText.trim()}
              style={{ padding: '8px 20px', background: manualText.trim() ? colors.accent.indigo : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 20, color: manualText.trim() ? '#fff' : colors.text.secondary, fontSize: 12, cursor: manualText.trim() ? 'pointer' : 'default', fontFamily: "'Noto Sans JP',sans-serif" }}
            >
              この回答を使う
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── スライド作成画面（Gemini）────────────────────────────────────────────────

function GeminiSlidesView({
  cat,
  onBack,
  onImportPdf,
}: {
  cat: NewsCategory
  onBack: () => void
  onImportPdf: (file: File) => void
}) {
  const prompt        = generateSlidesPrompt(cat.id)
  const [flash, setFlash] = useState<string | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const fileInputRef  = useRef<HTMLInputElement>(null)

  function flashMsg(msg: string) { setFlash(msg); setTimeout(() => setFlash(null), 2800) }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { flashMsg('PDFファイルを選択してください'); return }
    if (file.size > 30 * 1024 * 1024) { flashMsg('30MB以下のPDFのみ対応しています'); return }
    onImportPdf(file)
    // リセット（同じファイルを再選択できるよう）
    e.target.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <BackButton onClick={onBack} />
        <span style={{ fontSize: 22 }}>{cat.emoji}</span>
        <h2 style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 16, color: colors.text.primary, margin: 0, flex: 1 }}>
          {cat.label} — Geminiスライド
        </h2>
        {flash && <span style={{ fontSize: 11, color: colors.accent.amber }}>{flash}</span>}
      </div>

      {/* 手順ガイド */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
        <p style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 12, color: colors.text.secondary, margin: '0 0 10px', lineHeight: 1.9 }}>
          GeminiでWEB検索付きの写真・イラスト入りスライドを作成します。
        </p>
        {[
          { n: '1', text: '【Geminiで開く】を押す', c: '#34A853' },
          { n: '2', text: 'プロンプトを貼り付けて送信（Geminiがスライドを作成）', c: '#34A853' },
          { n: '3', text: 'できあがったスライドをPDFにエクスポート', c: colors.accent.amber },
          { n: '4', text: '【PDFをインポート】でアプリに保存', c: colors.accent.blue },
        ].map(({ n, text, c }) => (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, fontSize: 13, color: colors.text.secondary, lineHeight: 1.6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1, background: `${c}22`, border: `1px solid ${c}55`, color: c, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
            {text}
          </div>
        ))}
      </div>

      {/* Geminiで開く */}
      <button
        onClick={() => openAIChat(prompt, 'gemini')}
        style={{ width: '100%', padding: '14px 0', marginBottom: 8, background: '#34A85322', border: '1px solid #34A85366', borderRadius: 14, color: colors.text.primary, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Noto Sans JP',sans-serif" }}
      >
        【1】Geminiで開く（プロンプトをコピー済み）
      </button>

      <button
        onClick={() => setShowPrompt((v) => !v)}
        style={{ background: 'transparent', border: 'none', color: colors.text.secondary, cursor: 'pointer', fontSize: 12, fontFamily: "'Noto Sans JP',sans-serif", padding: '0 0 16px', textAlign: 'left' }}
      >
        {showPrompt ? '▾ プロンプトを閉じる' : '▸ プロンプトを確認する / コピーし直す'}
      </button>

      {showPrompt && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '10px 12px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, color: colors.text.secondary, margin: '0 0 8px', fontFamily: 'monospace', lineHeight: 1.7, maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {prompt.slice(0, 600)}{prompt.length > 600 ? '…' : ''}
          </p>
          <button onClick={() => { navigator.clipboard.writeText(prompt).catch(() => {}); flashMsg('コピーしました ✓') }}
            style={{ background: '#34A85318', border: '1px solid #34A85344', borderRadius: 8, padding: '5px 12px', color: '#34A853', fontSize: 12, cursor: 'pointer', fontFamily: "'Noto Sans JP',sans-serif" }}>
            コピーし直す
          </button>
        </div>
      )}

      {/* PDFをインポート */}
      <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{ width: '100%', padding: '14px 0', background: `${colors.accent.blue}22`, border: `1px solid ${colors.accent.blue}66`, borderRadius: 14, color: colors.accent.blue, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Noto Sans JP',sans-serif" }}
      >
        【2】PDFをインポート
      </button>

      <p style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 11, color: colors.text.secondary, textAlign: 'center', margin: '10px 0 0', lineHeight: 1.8 }}>
        ※ GeminiでできたスライドをPDF保存してから、こちらで選択してください
      </p>
    </div>
  )
}

// ── ワークフロー選択 ──────────────────────────────────────────────────────────

function WorkflowSelector({
  cat,
  onBack,
  onSelectWorkflow,
}: {
  cat: NewsCategory
  onBack: () => void
  onSelectWorkflow: (w: WorkflowType) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <BackButton onClick={onBack} />
        <span style={{ fontSize: 22 }}>{cat.emoji}</span>
        <h2 style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 16, color: colors.text.primary, margin: 0 }}>
          {cat.label}
        </h2>
      </div>

      <p style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 13, color: colors.text.secondary, margin: '0 0 20px', lineHeight: 1.9, textAlign: 'center' }}>
        どちらの方法で情報を集めますか？
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <GlassCard
          size="sm"
          accent="indigo"
          onClick={() => onSelectWorkflow('claude_research')}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>📝</span>
            <div>
              <p style={{ margin: '0 0 4px', fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 15, color: colors.text.primary }}>
                Claudeでテキスト調査
              </p>
              <p style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12, color: colors.text.secondary, lineHeight: 1.7 }}>
                5件のニュースを深掘りしたレポートをアプリ内に保存。WebSearch対応。すぐ読み返せる。
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard
          size="sm"
          accent="blue"
          onClick={() => onSelectWorkflow('gemini_slides')}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>🖼️</span>
            <div>
              <p style={{ margin: '0 0 4px', fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 15, color: colors.text.primary }}>
                Geminiで写真付きスライド作成
              </p>
              <p style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12, color: colors.text.secondary, lineHeight: 1.7 }}>
                WEB検索で最新情報を取得し、写真・イラスト付きスライドをPDF保存してアプリにインポート。
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

// ── テキストレポート表示 ──────────────────────────────────────────────────────

function TextReportView({
  cat,
  content,
  alreadySaved,
  onBack,
  onSave,
}: {
  cat: NewsCategory
  content: string
  alreadySaved: boolean
  onBack: () => void
  onSave: () => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(alreadySaved)
  const [flash,  setFlash]  = useState<string | null>(null)

  function flashMsg(msg: string) { setFlash(msg); setTimeout(() => setFlash(null), 2500) }

  async function handleSave() {
    if (saved) return
    setSaving(true)
    await onSave()
    setSaved(true)
    setSaving(false)
    flashMsg('保存しました ✓')
  }

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { font-family: 'Noto Serif JP', serif; font-size: 13px; line-height: 1.9; color: #111; max-width: 720px; margin: 0 auto; padding: 20px; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <BackButton onClick={onBack} />
        <span style={{ fontSize: 20 }}>{cat.emoji}</span>
        <h2 style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 16, color: colors.text.primary, margin: 0, flex: 1 }}>
          {cat.label}レポート
        </h2>
        {flash && <span style={{ fontSize: 11, color: colors.accent.blue }}>{flash}</span>}
      </div>

      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { label: saved ? '✓ 保存済み' : saving ? '保存中…' : '💾 保存', action: handleSave, disabled: saved || saving, color: colors.accent.blue },
          { label: '📋 コピー', action: () => { navigator.clipboard.writeText(content).catch(() => {}); flashMsg('コピーしました ✓') }, disabled: false, color: colors.accent.silver },
          { label: '🖨️ PDF保存', action: () => window.print(), disabled: false, color: colors.accent.silver },
        ].map(({ label, action, disabled, color }) => (
          <button key={label} onClick={action} disabled={disabled}
            style={{ flex: 1, minWidth: 90, padding: '8px 10px', borderRadius: 12, border: `1px solid ${color}55`, background: `${color}12`, color: disabled ? colors.text.secondary : colors.text.primary, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12, cursor: disabled ? 'default' : 'pointer', transition: 'all 0.18s' }}>
            {label}
          </button>
        ))}
      </div>

      <div className="print-area" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, padding: '20px 18px' }}>
        <p style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 400, fontSize: 13, color: colors.text.primary, margin: 0, lineHeight: 1.95, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {content}
        </p>
      </div>

      <p style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10, color: `${colors.text.secondary}66`, textAlign: 'right', margin: '8px 4px 32px' }}>
        {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
      </p>
    </div>
  )
}

// ── PDF レポート表示 ──────────────────────────────────────────────────────────

function PdfReportView({
  report,
  onBack,
}: {
  report: NewsReport
  onBack: () => void
}) {
  if (!report.pdfBlob) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <BackButton onClick={onBack} />
        <span style={{ fontSize: 20 }}>
          {NEWS_CATEGORIES.find((c) => c.id === report.category)?.emoji ?? '📄'}
        </span>
        <h2 style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 16, color: colors.text.primary, margin: 0, flex: 1 }}>
          {report.categoryLabel}
          <span style={{ fontSize: 11, color: colors.accent.blue, marginLeft: 8 }}>PDF</span>
        </h2>
      </div>

      <p style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10, color: colors.text.secondary, margin: '0 0 12px' }}>
        {report.date}
      </p>

      <PdfViewer pdfBlob={report.pdfBlob} />

      <p style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 11, color: `${colors.text.secondary}80`, textAlign: 'center', margin: '16px 0 32px', lineHeight: 1.8 }}>
        端末に保存するには、ブラウザのシェアメニューから「ファイルに保存」をご利用ください。
      </p>
    </div>
  )
}

// ── ページ本体 ────────────────────────────────────────────────────────────────

type View =
  | 'categories'
  | 'workflow'
  | 'claude_research'
  | 'gemini_slides'
  | 'text_report'
  | 'pdf_report'
  | 'archived_text'
  | 'archived_pdf'

export function NewsPage() {
  const navigate = useNavigate()
  const [view,           setView]           = useState<View>('categories')
  const [selectedCat,    setSelectedCat]    = useState<NewsCategory | null>(null)
  const [reportContent,  setReportContent]  = useState('')
  const [currentSavedId, setCurrentSavedId] = useState<number | null>(null)
  const [archivedReports, setArchivedReports] = useState<NewsReport[]>([])
  const [activeReport,   setActiveReport]   = useState<NewsReport | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    newsReports.list().then((list) => setArchivedReports([...list].reverse()))
  }, [])

  const refreshArchive = () => {
    newsReports.list().then((list) => setArchivedReports([...list].reverse()))
  }

  const handleSelectCategory = (cat: NewsCategory) => {
    setSelectedCat(cat)
    setReportContent('')
    setCurrentSavedId(null)
    setView('workflow')
  }

  const handleSelectWorkflow = (w: WorkflowType) => {
    setView(w === 'claude_research' ? 'claude_research' : 'gemini_slides')
  }

  const handleReceiveText = (text: string) => {
    setReportContent(text)
    setView('text_report')
  }

  const handleSaveTextReport = async () => {
    if (!selectedCat || !reportContent) return
    const id = await newsReports.add({
      date: new Date().toISOString().slice(0, 10),
      category: selectedCat.id,
      categoryLabel: selectedCat.label,
      categoryEmoji: selectedCat.emoji,
      content: reportContent,
      reportType: 'text',
      createdAt: new Date().toISOString(),
    })
    setCurrentSavedId(id)
    refreshArchive()
  }

  const handleImportPdf = async (file: File) => {
    if (!selectedCat) return
    const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' })
    const id = await newsReports.add({
      date: new Date().toISOString().slice(0, 10),
      category: selectedCat.id,
      categoryLabel: selectedCat.label,
      categoryEmoji: selectedCat.emoji,
      content: '',
      pdfBlob: blob,
      reportType: 'pdf',
      createdAt: new Date().toISOString(),
    })
    setCurrentSavedId(id)
    // 保存後すぐにPDF表示
    const saved = await newsReports.get(id)
    if (saved) { setActiveReport(saved); setView('pdf_report') }
    refreshArchive()
  }

  // アーカイブ外からの standalone PDF インポート
  const handleStandaloneImport = (file: File) => {
    // カテゴリ不明の場合は「最新ニュース」扱い
    const defaultCat = NEWS_CATEGORIES.find((c) => c.id === 'latest')!
    setSelectedCat(defaultCat)
    handleImportPdfDirect(file, defaultCat)
  }

  const handleImportPdfDirect = async (file: File, cat: NewsCategory) => {
    const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' })
    const id = await newsReports.add({
      date: new Date().toISOString().slice(0, 10),
      category: cat.id,
      categoryLabel: cat.label,
      categoryEmoji: cat.emoji,
      content: '',
      pdfBlob: blob,
      reportType: 'pdf',
      createdAt: new Date().toISOString(),
    })
    const saved = await newsReports.get(id)
    if (saved) { setActiveReport(saved); setView('pdf_report') }
    refreshArchive()
  }

  const handleOpenArchived = (r: NewsReport) => {
    setActiveReport(r)
    setView(r.reportType === 'pdf' ? 'archived_pdf' : 'archived_text')
  }

  const handleDeleteArchived = async (id: number) => {
    await newsReports.delete(id)
    refreshArchive()
  }

  const handleBack = () => {
    if (view === 'workflow')        setView('categories')
    else if (view === 'claude_research') setView('workflow')
    else if (view === 'gemini_slides')   setView('workflow')
    else if (view === 'text_report')     setView('categories')
    else if (view === 'pdf_report')      setView('categories')
    else if (view === 'archived_text')   setView('categories')
    else if (view === 'archived_pdf')    setView('categories')
    else navigate('/')
  }

  return (
    <div className="min-h-svh flex flex-col">

      {/* ページヘッダー（categories のみ） */}
      {view === 'categories' && (
        <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 16px 8px', flexShrink: 0 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text.secondary, fontSize: 22, padding: '4px 12px 4px 0' }}>‹</button>
          <h1 style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 18, color: colors.text.primary, margin: 0, flex: 1 }}>
            今日のニュース
          </h1>
        </header>
      )}

      {/* コンテンツ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 48px' }}>

        {view === 'categories' && (
          <>
            <p style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 13, color: colors.text.secondary, lineHeight: 1.9, margin: '4px 0 20px', textAlign: 'center' }}>
              気になるジャンルを選んでください。
            </p>

            <CategoryGrid onSelect={handleSelectCategory} />

            {/* hidden file input for standalone PDF import */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleStandaloneImport(file)
                e.target.value = ''
              }}
            />

            <ArchiveList
              reports={archivedReports}
              onOpen={handleOpenArchived}
              onDelete={handleDeleteArchived}
              onImportPdf={() => fileInputRef.current?.click()}
            />
          </>
        )}

        {view === 'workflow' && selectedCat && (
          <WorkflowSelector
            cat={selectedCat}
            onBack={handleBack}
            onSelectWorkflow={handleSelectWorkflow}
          />
        )}

        {view === 'claude_research' && selectedCat && (
          <ClaudeResearchView
            cat={selectedCat}
            onBack={handleBack}
            onReceive={handleReceiveText}
          />
        )}

        {view === 'gemini_slides' && selectedCat && (
          <GeminiSlidesView
            cat={selectedCat}
            onBack={handleBack}
            onImportPdf={handleImportPdf}
          />
        )}

        {view === 'text_report' && selectedCat && (
          <TextReportView
            cat={selectedCat}
            content={reportContent}
            alreadySaved={currentSavedId !== null}
            onBack={handleBack}
            onSave={handleSaveTextReport}
          />
        )}

        {view === 'pdf_report' && activeReport && (
          <PdfReportView report={activeReport} onBack={handleBack} />
        )}

        {view === 'archived_text' && activeReport && (
          <TextReportView
            cat={NEWS_CATEGORIES.find((c) => c.id === activeReport.category) ?? NEWS_CATEGORIES[0]}
            content={activeReport.content}
            alreadySaved
            onBack={handleBack}
            onSave={async () => {}}
          />
        )}

        {view === 'archived_pdf' && activeReport && (
          <PdfReportView report={activeReport} onBack={handleBack} />
        )}
      </div>
    </div>
  )
}
