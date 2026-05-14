import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard } from '../../ui/GlassCard'
import { colors, glassCard as glassStyle } from '../../ui/tokens'
import { studies, schedules, type Study, type Schedule } from '../../core/db'
import { askAI } from '../../core/ai-bridge'
import { saveStudyQuota } from '../../core/study-store'

// ── constants ─────────────────────────────────────────────────────────────────

const INDIGO = colors.accent.indigo

const HINT_BORDER: Record<0 | 1 | 2 | 3, string> = {
  0: 'rgba(91,92,230,0.20)',
  1: 'rgba(91,92,230,0.42)',
  2: 'rgba(91,92,230,0.65)',
  3: 'rgba(91,92,230,0.92)',
}

const HINT_DESC = [
  '方向性だけを示すうっすらしたヒントを一文で（答えを言わないこと）',
  '具体的なキーワードや考え方を示すヒントを一文で（まだ答えは言わないこと）',
  '答えまであと一歩のところまで一文で教えてください',
]

// ── types ─────────────────────────────────────────────────────────────────────

type Tab = 'materials' | 'schedule' | 'tutor'

interface AddForm {
  subject: string
  chapter: string
  page: string
  mediaType: 'text' | 'pdf' | 'image'
  content: string
  imageData: string
}

// ── helpers ───────────────────────────────────────────────────────────────────

function buildHintPrompt(content: string, level: 1 | 2 | 3): string {
  return `教材の学習者へ、${HINT_DESC[level - 1]}。\n\n【教材】\n${content.slice(0, 800)}`
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href
  const doc = await pdfjsLib
    .getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
    .promise
  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent()
    pages.push(
      tc.items
        .map((it) => ('str' in it ? (it as { str: string }).str : ''))
        .join(' '),
    )
  }
  return pages.join('\n\n── ページ区切り ──\n\n')
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.readAsDataURL(file)
  })
}

// ── shared styles ─────────────────────────────────────────────────────────────

const btnBase: CSSProperties = {
  border: 'none', borderRadius: 10, cursor: 'pointer',
  fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13,
  padding: '8px 16px', transition: 'background 0.2s, opacity 0.2s',
}
const btnPrimary: CSSProperties = { ...btnBase, background: INDIGO, color: '#fff' }
const btnSecondary: CSSProperties = {
  ...btnBase, background: 'rgba(255,255,255,0.10)', color: colors.text.primary,
}
const fieldLabel: CSSProperties = {
  fontSize: 11, color: colors.text.secondary,
  fontFamily: "'Noto Sans JP', sans-serif", margin: '0 0 4px',
}
const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 10, padding: '9px 12px',
  color: colors.text.primary,
  fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13,
  outline: 'none',
}

// ── TabBar ────────────────────────────────────────────────────────────────────

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'materials', label: '📚 教材' },
    { key: 'schedule',  label: '📅 試験' },
    { key: 'tutor',     label: '🎓 AI問題' },
  ]
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setTab(key)}
          style={{
            flex: 1, padding: '7px 4px', borderRadius: 12,
            border: `1px solid ${tab === key ? INDIGO : 'rgba(255,255,255,0.12)'}`,
            background: tab === key ? `${INDIGO}22` : 'transparent',
            color: tab === key ? INDIGO : colors.text.secondary,
            fontFamily: "'Noto Sans JP', sans-serif",
            fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── MaterialsTab ──────────────────────────────────────────────────────────────

const INIT_FORM: AddForm = {
  subject: '', chapter: '', page: '', mediaType: 'text', content: '', imageData: '',
}

function MaterialsTab() {
  const [items,     setItems]     = useState<Study[]>([])
  const [showAdd,   setShowAdd]   = useState(false)
  const [form,      setForm]      = useState<AddForm>(INIT_FORM)
  const [importing, setImporting] = useState(false)
  const [errMsg,    setErrMsg]    = useState('')
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reload = () => studies.list().then(setItems)
  useEffect(() => { void reload() }, [])

  const bySubject = items.reduce<Record<string, Study[]>>((acc, s) => {
    if (!acc[s.subject]) acc[s.subject] = []
    acc[s.subject].push(s)
    return acc
  }, {})

  const handleFile = async (e: { target: { files: FileList | null } }) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setErrMsg('')
    try {
      if (form.mediaType === 'pdf') {
        setForm((p) => ({ ...p, content: '' }))
        const text = await extractPdfText(file)
        setForm((p) => ({ ...p, content: text }))
      } else {
        const data = await fileToBase64(file)
        setForm((p) => ({ ...p, content: `[画像: ${file.name}]`, imageData: data }))
      }
    } catch {
      setErrMsg('ファイルの読み込みに失敗しました。テキストを直接入力してください。')
    } finally {
      setImporting(false)
    }
  }

  const handleSave = async () => {
    if (!form.subject.trim() || !form.content.trim()) {
      setErrMsg('科目名と内容は必須です'); return
    }
    await studies.add({
      subject:   form.subject.trim(),
      chapter:   form.chapter.trim() || undefined,
      page:      form.page ? parseInt(form.page) : undefined,
      mediaType: form.mediaType,
      needsOcr:  form.mediaType === 'image',
      imageData: form.imageData || undefined,
      content:   form.content,
      status:    'todo',
      createdAt: new Date().toISOString(),
    })
    await reload()
    setShowAdd(false); setForm(INIT_FORM); setErrMsg('')
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {Object.keys(bySubject).length === 0 && (
          <p style={{ color: colors.text.secondary, textAlign: 'center', padding: '32px 0', fontSize: 13 }}>
            教材がありません。「＋ 追加」から始めましょう。
          </p>
        )}

        {Object.entries(bySubject).map(([subject, ss]) => (
          <GlassCard key={subject} size="sm">
            <button
              onClick={() => setExpanded(expanded === subject ? null : subject)}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', color: INDIGO,
                fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 500, fontSize: 14, padding: 0,
              }}
            >
              <span>{subject}</span>
              <span style={{ color: colors.text.secondary, fontSize: 12 }}>
                {ss.filter((s) => s.status === 'done').length}/{ss.length}
                {expanded === subject ? '▲' : '▼'}
              </span>
            </button>

            {expanded === subject && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ss.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      padding: '8px 10px', borderRadius: 10,
                      background: s.status === 'done'
                        ? `${INDIGO}0F` : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 3, alignItems: 'center' }}>
                      {s.chapter && (
                        <span style={{ fontSize: 10, color: INDIGO, background: `${INDIGO}20`, borderRadius: 5, padding: '1px 6px' }}>
                          {s.chapter}
                        </span>
                      )}
                      {s.page !== undefined && (
                        <span style={{ fontSize: 10, color: colors.text.secondary }}>p.{s.page}</span>
                      )}
                      {s.needsOcr && (
                        <span style={{ fontSize: 10, color: colors.accent.amber, background: `${colors.accent.amber}20`, borderRadius: 5, padding: '1px 6px' }}>
                          OCR待ち
                        </span>
                      )}
                      {s.status === 'done' && (
                        <span style={{ fontSize: 10, color: '#6CCB8A', background: 'rgba(108,203,138,0.15)', borderRadius: 5, padding: '1px 6px' }}>
                          完了
                        </span>
                      )}
                    </div>
                    {s.imageData && (
                      <img
                        src={s.imageData} alt=""
                        style={{ maxWidth: '100%', maxHeight: 72, borderRadius: 6, marginBottom: 3, display: 'block' }}
                      />
                    )}
                    <p style={{ fontSize: 12, color: colors.text.secondary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.content.slice(0, 80)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        ))}
      </div>

      <button onClick={() => setShowAdd(true)} style={{ ...btnPrimary, width: '100%' }}>
        ＋ 教材を追加
      </button>

      {/* ── 追加モーダル ── */}
      {showAdd && (
        <div
          onClick={() => setShowAdd(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(20,18,42,0.75)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...glassStyle, borderRadius: '24px 24px 0 0',
              width: '100%', maxWidth: 480, maxHeight: '88svh',
              overflowY: 'auto', padding: 20,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, color: INDIGO, fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 500 }}>
              教材を追加
            </h3>

            <div>
              <p style={fieldLabel}>科目名 *</p>
              <input
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="例: 英語・数学II"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 2 }}>
                <p style={fieldLabel}>章・セクション</p>
                <input
                  value={form.chapter}
                  onChange={(e) => setForm((p) => ({ ...p, chapter: e.target.value }))}
                  placeholder="例: 第3章"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <p style={fieldLabel}>開始ページ</p>
                <input
                  type="number"
                  value={form.page}
                  onChange={(e) => setForm((p) => ({ ...p, page: e.target.value }))}
                  placeholder="48"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <p style={fieldLabel}>取り込み方式</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['text', 'pdf', 'image'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((p) => ({ ...p, mediaType: t, content: '', imageData: '' }))}
                    style={{
                      flex: 1, padding: '7px 4px', borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${form.mediaType === t ? INDIGO : 'rgba(255,255,255,0.12)'}`,
                      background: form.mediaType === t ? `${INDIGO}22` : 'transparent',
                      color: form.mediaType === t ? INDIGO : colors.text.secondary,
                      fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif",
                    }}
                  >
                    {t === 'text' ? 'テキスト' : t === 'pdf' ? 'PDF' : '画像'}
                  </button>
                ))}
              </div>
            </div>

            {form.mediaType === 'text' ? (
              <div>
                <p style={fieldLabel}>内容 *</p>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  placeholder="教材の内容を貼り付けてください…"
                  rows={6}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            ) : (
              <div>
                <p style={fieldLabel}>
                  {form.mediaType === 'pdf' ? 'PDFファイル' : '画像ファイル'}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept={form.mediaType === 'pdf' ? '.pdf' : 'image/*'}
                  onChange={handleFile}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={importing}
                  style={{ ...btnSecondary, width: '100%' }}
                >
                  {importing ? '読み込み中…' : 'ファイルを選択'}
                </button>
                {form.imageData && (
                  <img
                    src={form.imageData} alt="preview"
                    style={{ maxWidth: '100%', maxHeight: 100, borderRadius: 8, marginTop: 6, display: 'block' }}
                  />
                )}
                {form.mediaType === 'pdf' && form.content && (
                  <div style={{ marginTop: 8 }}>
                    <p style={fieldLabel}>抽出テキスト（編集可）</p>
                    <textarea
                      value={form.content}
                      onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                      rows={4}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>
                )}
              </div>
            )}

            {errMsg && (
              <p style={{ fontSize: 12, color: colors.accent.amber, margin: 0 }}>{errMsg}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{ ...btnSecondary, flex: 1 }}
                onClick={() => { setShowAdd(false); setForm(INIT_FORM); setErrMsg('') }}
              >
                キャンセル
              </button>
              <button
                style={{ ...btnPrimary, flex: 2, opacity: importing ? 0.5 : 1 }}
                onClick={() => void handleSave()}
                disabled={importing}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── ScheduleTab ───────────────────────────────────────────────────────────────

function ScheduleTab() {
  const [sched,      setSched]      = useState<Schedule | null>(null)
  const [studyItems, setStudyItems] = useState<Study[]>([])
  const [editMode,   setEditMode]   = useState(false)
  const [form,       setForm]       = useState({ subject: '', examDate: '', totalSections: '10' })

  useEffect(() => {
    const load = async () => {
      const [allSched, allStudies] = await Promise.all([schedules.list(), studies.list()])
      const today = new Date().toISOString().slice(0, 10)
      const active = allSched
        .filter((s) => s.examDate >= today)
        .sort((a, b) => a.examDate.localeCompare(b.examDate))[0] ?? null
      setSched(active)
      setStudyItems(allStudies)

      if (active) {
        const done  = allStudies.filter((s) => s.subject === active.subject && s.status === 'done').length
        const total = active.totalSections ?? allStudies.filter((s) => s.subject === active.subject).length
        const daysLeft = Math.max(1, Math.ceil((new Date(active.examDate).getTime() - Date.now()) / 86_400_000))
        const dynamicLoad = Math.max(1, Math.ceil(Math.max(0, total - done) / daysLeft))
        saveStudyQuota({ subject: active.subject, dailyLoad: dynamicLoad, examDate: active.examDate })
      }
    }
    void load()
  }, [])

  const handleSave = async () => {
    if (!form.subject.trim() || !form.examDate) return
    const total    = parseInt(form.totalSections) || 10
    const daysLeft = Math.max(1, Math.ceil((new Date(form.examDate).getTime() - Date.now()) / 86_400_000))
    const load     = Math.max(1, Math.ceil(total / daysLeft))

    if (editMode && sched?.id !== undefined) {
      await schedules.update(sched.id, {
        subject: form.subject.trim(), examDate: form.examDate,
        dailyLoad: load, totalSections: total,
      })
      const updated = await schedules.get(sched.id)
      setSched(updated ?? null)
    } else {
      const id      = await schedules.add({ subject: form.subject.trim(), examDate: form.examDate, dailyLoad: load, totalSections: total, createdAt: new Date().toISOString() })
      const created = await schedules.get(id)
      setSched(created ?? null)
    }
    saveStudyQuota({ subject: form.subject.trim(), dailyLoad: load, examDate: form.examDate })
    setEditMode(false)
  }

  const handleDelete = async () => {
    if (sched?.id === undefined) return
    await schedules.delete(sched.id)
    setSched(null)
    localStorage.removeItem('haku_study_quota')
  }

  if (!sched || editMode) {
    return (
      <GlassCard size="sm">
        <p style={{ ...fieldLabel, marginBottom: 10, fontSize: 13 }}>試験スケジュール設定</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <p style={fieldLabel}>科目名</p>
            <input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="例: 数学II" style={inputStyle} />
          </div>
          <div>
            <p style={fieldLabel}>試験日</p>
            <input type="date" value={form.examDate} onChange={(e) => setForm((p) => ({ ...p, examDate: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>
          <div>
            <p style={fieldLabel}>総セクション数（章・単元）</p>
            <input type="number" min="1" value={form.totalSections} onChange={(e) => setForm((p) => ({ ...p, totalSections: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {editMode && (
              <button style={{ ...btnSecondary, flex: 1 }} onClick={() => setEditMode(false)}>
                キャンセル
              </button>
            )}
            <button style={{ ...btnPrimary, flex: 2 }} onClick={() => void handleSave()}>
              {editMode ? '更新' : '設定する'}
            </button>
          </div>
        </div>
      </GlassCard>
    )
  }

  const subjectStudies = studyItems.filter((s) => s.subject === sched.subject)
  const total    = sched.totalSections ?? subjectStudies.length
  const done     = subjectStudies.filter((s) => s.status === 'done').length
  const daysLeft = Math.max(0, Math.ceil((new Date(sched.examDate).getTime() - Date.now()) / 86_400_000))
  const remaining = Math.max(0, total - done)
  const dynLoad  = daysLeft > 0 ? Math.max(1, Math.ceil(remaining / daysLeft)) : remaining
  const progress = total > 0 ? done / total : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* カウントダウン */}
      <GlassCard size="sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 13, color: INDIGO, fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 500, margin: '0 0 2px' }}>
              {sched.subject}
            </p>
            <p style={{ fontSize: 11, color: colors.text.secondary, margin: 0 }}>
              試験日: {sched.examDate}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 28, fontFamily: 'Inter, sans-serif', color: daysLeft <= 7 ? colors.accent.amber : colors.text.primary, margin: 0, lineHeight: 1 }}>
              {daysLeft}
            </p>
            <p style={{ fontSize: 11, color: colors.text.secondary, margin: 0 }}>日後</p>
          </div>
        </div>
      </GlassCard>

      {/* 今日のノルマ */}
      <GlassCard size="sm">
        <p style={{ fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP', sans-serif", margin: '0 0 4px' }}>
          今日のノルマ
        </p>
        <p style={{ fontSize: 30, fontFamily: 'Inter, sans-serif', color: INDIGO, margin: 0, lineHeight: 1 }}>
          {dynLoad}
          <span style={{ fontSize: 13, marginLeft: 4, color: colors.text.secondary }}>章 / 日</span>
        </p>
        <p style={{ fontSize: 11, color: colors.text.secondary, margin: '4px 0 0' }}>
          残り {remaining} / {total} セクション
        </p>
      </GlassCard>

      {/* 進捗バー */}
      <GlassCard size="sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP', sans-serif" }}>進捗</span>
          <span style={{ fontSize: 11, color: INDIGO, fontFamily: 'Inter, sans-serif' }}>
            {Math.round(progress * 100)}%
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.10)', borderRadius: 3 }}>
          <div style={{
            height: '100%', width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${INDIGO}88, ${INDIGO})`,
            borderRadius: 3, transition: 'width 0.6s ease',
          }} />
        </div>
      </GlassCard>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => {
            setForm({ subject: sched.subject, examDate: sched.examDate, totalSections: String(sched.totalSections ?? 10) })
            setEditMode(true)
          }}
          style={{ ...btnSecondary, flex: 1 }}
        >
          変更
        </button>
        <button onClick={() => void handleDelete()} style={{ ...btnSecondary, flex: 1, color: colors.accent.amber }}>
          削除
        </button>
      </div>
    </div>
  )
}

// ── TutorTab ──────────────────────────────────────────────────────────────────

function TutorTab() {
  const [todoItems,   setTodoItems]   = useState<Study[]>([])
  const [totalCount,  setTotalCount]  = useState(0)
  const [idx,         setIdx]         = useState(0)
  const [hintLevel,   setHintLevel]   = useState<0 | 1 | 2 | 3>(0)
  const [hintTexts,   setHintTexts]   = useState<[string, string, string]>(['', '', ''])
  const [loadingHint, setLoadingHint] = useState(false)

  useEffect(() => {
    studies.list().then((all) => {
      setTotalCount(all.length)
      setTodoItems(all.filter((s) => s.status !== 'done'))
    })
  }, [])

  const current   = todoItems[idx]
  const doneCount = totalCount - todoItems.length

  const resetHints = () => {
    setHintLevel(0)
    setHintTexts(['', '', ''])
  }

  const handleHint = async (level: 1 | 2 | 3) => {
    if (loadingHint || !current) return
    if (hintTexts[level - 1]) { setHintLevel(level); return }
    setLoadingHint(true)
    try {
      const text = await askAI(buildHintPrompt(current.content, level))
      setHintTexts((prev) => {
        const next: [string, string, string] = [...prev]
        next[level - 1] = text
        return next
      })
      setHintLevel(level)
    } finally {
      setLoadingHint(false)
    }
  }

  const handleKnew = async () => {
    if (current?.id === undefined) return
    await studies.update(current.id, { status: 'done' })
    const remaining = todoItems.filter((s) => s.id !== current.id)
    setTodoItems(remaining)
    setIdx(remaining.length > 0 ? Math.min(idx, remaining.length - 1) : 0)
    resetHints()
  }

  const handleAgain = () => {
    if (!current) return
    const rest = [...todoItems.slice(0, idx), ...todoItems.slice(idx + 1), current]
    setTodoItems(rest)
    setIdx(0)
    resetHints()
  }

  if (todoItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ fontSize: 24, margin: '0 0 8px' }}>🎉</p>
        <p style={{ fontSize: 14, color: colors.text.primary, fontFamily: "'Noto Serif JP', serif", fontWeight: 300, margin: '0 0 4px' }}>
          全部クリア！
        </p>
        <p style={{ fontSize: 12, color: colors.text.secondary, fontFamily: "'Noto Sans JP', sans-serif", margin: 0 }}>
          「教材」タブから新しい内容を追加しましょう。
        </p>
      </div>
    )
  }

  const hintsDisabled = current.mediaType === 'image' && current.needsOcr === true

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 進捗カウンター */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, color: colors.text.secondary, fontFamily: 'Inter, sans-serif',
      }}>
        <span>{doneCount} / {totalCount} 完了</span>
        <span>{idx + 1} / {todoItems.length} 残り</span>
      </div>

      {/* 問題カード — backdrop-filter なし（iPad最適化） */}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${HINT_BORDER[hintLevel]}`,
        borderRadius: 16, padding: 16,
        transition: 'border-color 0.4s ease',
      }}>
        <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: INDIGO, background: `${INDIGO}20`, borderRadius: 6, padding: '2px 8px' }}>
            {current.subject}
          </span>
          {current.chapter && (
            <span style={{ fontSize: 11, color: colors.text.secondary, background: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: '2px 8px' }}>
              {current.chapter}
            </span>
          )}
          {current.page !== undefined && (
            <span style={{ fontSize: 11, color: colors.text.secondary }}>p.{current.page}</span>
          )}
        </div>

        {current.imageData && (
          <img
            src={current.imageData} alt=""
            style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8, display: 'block' }}
          />
        )}

        <p style={{
          fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
          fontSize: 13, color: colors.text.primary, lineHeight: 1.9,
          margin: 0, maxHeight: 200, overflowY: 'auto',
        }}>
          {current.content}
        </p>
      </div>

      {/* ヒントボタン */}
      <div style={{ display: 'flex', gap: 6 }}>
        {([1, 2, 3] as const).map((level) => {
          const unlocked = level <= hintLevel + 1
          const active   = hintTexts[level - 1].length > 0
          return (
            <button
              key={level}
              onClick={() => void handleHint(level)}
              disabled={loadingHint || !unlocked || hintsDisabled}
              style={{
                ...btnBase,
                flex: 1, fontSize: 12,
                background: active ? `${INDIGO}30` : 'rgba(255,255,255,0.07)',
                border: `1px solid ${hintLevel >= level ? INDIGO : 'rgba(255,255,255,0.14)'}`,
                color: hintLevel >= level ? INDIGO : colors.text.secondary,
                opacity: (!unlocked || hintsDisabled) ? 0.35 : 1,
              }}
            >
              {loadingHint && level === hintLevel + 1
                ? '…'
                : `ヒント${level === 1 ? '①' : level === 2 ? '②' : '③'}`}
            </button>
          )
        })}
      </div>

      {/* ヒント表示エリア */}
      {hintLevel > 0 && hintTexts[hintLevel - 1] && (
        <div style={{
          background: `${INDIGO}0C`,
          border: `1px solid ${HINT_BORDER[hintLevel]}`,
          borderRadius: 14, padding: '12px 14px',
          transition: 'border-color 0.4s',
        }}>
          <p style={{ fontSize: 11, color: INDIGO, margin: '0 0 4px', fontFamily: "'Noto Sans JP', sans-serif" }}>
            ヒント{hintLevel === 1 ? '①' : hintLevel === 2 ? '②' : '③'}
          </p>
          <p style={{
            fontSize: 13, color: colors.text.primary, margin: 0,
            lineHeight: 1.8, fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
          }}>
            {hintTexts[hintLevel - 1]}
          </p>
        </div>
      )}

      {hintsDisabled && (
        <p style={{ fontSize: 12, color: colors.accent.amber, textAlign: 'center', margin: 0 }}>
          テキストを追加するとAIヒントが使えます（OCR待ち）。
        </p>
      )}

      {/* アクションボタン */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleAgain} style={{ ...btnSecondary, flex: 1 }}>
          もう一度 ↩
        </button>
        <button onClick={() => void handleKnew()} style={{ ...btnPrimary, flex: 2 }}>
          わかった ✓
        </button>
      </div>
    </div>
  )
}

// ── StudyPage ─────────────────────────────────────────────────────────────────

export function StudyPage() {
  const [tab, setTab] = useState<Tab>('materials')
  return (
    <ModuleShell title="ゲーム攻略" accent="indigo" backTo="/">
      <TabBar tab={tab} setTab={setTab} />
      {tab === 'materials' && <MaterialsTab />}
      {tab === 'schedule'  && <ScheduleTab  />}
      {tab === 'tutor'     && <TutorTab     />}
    </ModuleShell>
  )
}
