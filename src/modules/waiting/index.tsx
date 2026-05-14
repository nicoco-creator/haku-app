import { useState, useEffect, useRef, type CSSProperties } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard } from '../../ui/GlassCard'
import { colors } from '../../ui/tokens'
import { waitings, type Waiting } from '../../core/db'
import { askAI } from '../../core/ai-bridge'

const SILVER = colors.accent.silver

// ── Recall history (localStorage, last 30 entries per item) ──────────────

type RecallEntry = { date: string; count: number }

const RECALL_KEY = (id: number) => `haku_recall_${id}`

function getRecallHistory(id: number): RecallEntry[] {
  try { return JSON.parse(localStorage.getItem(RECALL_KEY(id)) ?? '[]') as RecallEntry[] }
  catch { return [] }
}

function saveRecallEntry(id: number, count: number): void {
  const today = new Date().toISOString().slice(0, 10)
  const h = getRecallHistory(id)
  const idx = h.findIndex(e => e.date === today)
  if (idx >= 0) h[idx].count = count
  else h.push({ date: today, count })
  localStorage.setItem(RECALL_KEY(id), JSON.stringify(h.slice(-30)))
}

function getLastRecallDate(id: number): string | null {
  const entries = getRecallHistory(id).filter(e => e.count > 0)
  if (!entries.length) return null
  return entries.sort((a, b) => b.date.localeCompare(a.date))[0].date
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${y}年${parseInt(m)}月${parseInt(day)}日`
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function buildLast14Days(history: RecallEntry[]) {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const date = d.toISOString().slice(0, 10)
    const entry = history.find(e => e.date === date)
    return { label: `${d.getMonth() + 1}/${d.getDate()}`, count: entry?.count ?? 0, date }
  })
}

// ── Add / Edit bottom sheet ───────────────────────────────────────────────

interface FormState { target: string; content: string; since: string; expectation: string }

function AddEditModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Waiting
  onSave: (f: FormState) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? { target: initial.target, content: initial.content, since: initial.since, expectation: initial.expectation }
      : { target: '', content: '', since: todayStr(), expectation: '' }
  )

  const patch = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const valid = Boolean(form.target.trim() && form.content.trim() && form.since)

  const inputStyle: CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 12, padding: '10px 14px',
    color: colors.text.primary,
    fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
    fontSize: 14, outline: 'none',
  }

  const labelStyle: CSSProperties = {
    fontSize: 11, color: SILVER,
    fontFamily: "'Noto Sans JP', sans-serif", letterSpacing: '0.06em',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(20,18,42,0.88)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 560,
        background: '#1C1A2E',
        border: `1px solid ${SILVER}40`,
        borderRadius: '24px 24px 0 0',
        padding: '28px 24px 48px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: 15, color: SILVER, fontFamily: "'Noto Serif JP', serif", fontWeight: 300, letterSpacing: '0.08em' }}>
            {initial ? '編集' : '＋ 追加'}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '4px 8px' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>相手・対象</label>
          <input value={form.target} onChange={patch('target')} placeholder="例：あの人" style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>内容</label>
          <textarea value={form.content} onChange={patch('content')} placeholder="何を待っていますか" rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: 1.8 }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>いつから</label>
          <input type="date" value={form.since} onChange={patch('since')} style={{ ...inputStyle, colorScheme: 'dark' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>期待していること</label>
          <textarea value={form.expectation} onChange={patch('expectation')} placeholder="どうなるといいですか" rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: 1.8 }} />
        </div>

        <button
          disabled={!valid}
          onClick={() => onSave(form)}
          style={{
            marginTop: 4, padding: '12px 0',
            background: valid ? `${SILVER}1E` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${valid ? SILVER + '55' : 'rgba(255,255,255,0.10)'}`,
            borderRadius: 16, cursor: valid ? 'pointer' : 'default',
            color: valid ? SILVER : colors.text.secondary,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
            fontSize: 14, letterSpacing: '0.08em',
            transition: 'all 0.2s',
          }}
        >
          保存
        </button>
      </div>
    </div>
  )
}

// ── Delete confirmation ───────────────────────────────────────────────────

function DeleteConfirm({ target, onConfirm, onCancel }: {
  target: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(20,18,42,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#1C1A2E',
        border: `1px solid ${SILVER}40`,
        borderRadius: 20, padding: '28px 32px',
        maxWidth: 320, width: '100%',
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.9, color: colors.text.primary, fontFamily: "'Noto Serif JP', serif", fontWeight: 300 }}>
          「{target}」の記録を削除しますか？<br />
          <span style={{ fontSize: 12, color: colors.text.secondary }}>この操作は取り消せません。</span>
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px 0',
            background: 'none', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 12, cursor: 'pointer',
            color: colors.text.secondary,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300, fontSize: 13,
          }}>キャンセル</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '10px 0',
            background: 'rgba(200,80,80,0.12)', border: '1px solid rgba(200,80,80,0.40)',
            borderRadius: 12, cursor: 'pointer', color: '#E89090',
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300, fontSize: 13,
          }}>削除</button>
        </div>
      </div>
    </div>
  )
}

// ── Detail view (full-screen, no backdrop-filter) ─────────────────────────

function DetailView({
  item,
  onEdit,
  onDelete,
  onBack,
}: {
  item: Waiting
  onEdit: () => void
  onDelete: () => void
  onBack: () => void
}) {
  const [question,    setQuestion]    = useState('')
  const [qLoading,    setQLoading]    = useState(false)
  const [todayInput,  setTodayInput]  = useState('')
  const [history,     setHistory]     = useState<RecallEntry[]>([])
  const [saved,       setSaved]       = useState(false)
  const hasFetched = useRef(false)

  const id    = item.id!
  const today = todayStr()

  useEffect(() => {
    const h = getRecallHistory(id)
    setHistory(h)
    const entry = h.find(e => e.date === today)
    if (entry) setTodayInput(String(entry.count))

    if (!hasFetched.current) {
      hasFetched.current = true
      setQLoading(true)
      askAI(
        `ユーザーが「${item.target}」のことを今日何回くらい思い出したか、やさしく一文で問いかけてください。` +
        `「諦めましょう」「忘れましょう」「もう終わりに」など気持ちを断ち切る言葉は絶対に使わないこと。`
      )
        .then(setQuestion)
        .catch(() => setQuestion(`${item.target}のこと、今日は何回くらい頭をよぎりましたか？`))
        .finally(() => setQLoading(false))
    }
  }, [id, item.target, today])

  const handleSave = () => {
    const n = parseInt(todayInput)
    if (isNaN(n) || n < 0) return
    saveRecallEntry(id, n)
    setHistory(getRecallHistory(id))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const lastDate  = getLastRecallDate(id)
  const chartData = buildLast14Days(history)
  const hasData   = history.some(e => e.count > 0)

  const roundBtnStyle: CSSProperties = {
    width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(255,255,255,0.07)',
    border: `1px solid ${SILVER}40`,
    color: SILVER, cursor: 'pointer', fontSize: 18, lineHeight: '1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#1A182E', overflowY: 'auto' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 56px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* nav bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: colors.text.secondary,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
            fontSize: 13, letterSpacing: '0.04em', padding: '4px 0',
          }}>← 戻る</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onEdit} style={{
              background: 'none', border: `1px solid ${SILVER}40`,
              borderRadius: 8, padding: '4px 12px', cursor: 'pointer',
              color: SILVER, fontFamily: "'Noto Sans JP', sans-serif", fontSize: 12,
            }}>編集</button>
            <button onClick={onDelete} style={{
              background: 'none', border: '1px solid rgba(200,80,80,0.35)',
              borderRadius: 8, padding: '4px 12px', cursor: 'pointer',
              color: '#E89090', fontFamily: "'Noto Sans JP', sans-serif", fontSize: 12,
            }}>削除</button>
          </div>
        </div>

        {/* info card */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${SILVER}45`,
          borderRadius: 20, padding: '22px 24px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <p style={{
            margin: 0, fontSize: 'clamp(20px,5vw,26px)',
            color: colors.text.primary,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
            letterSpacing: '0.10em',
          }}>
            {item.target}
          </p>
          <p style={{
            margin: 0, fontSize: 13, color: colors.text.secondary,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300, lineHeight: 1.9,
          }}>
            {item.content}
          </p>
          {item.expectation && (
            <p style={{
              margin: 0, fontSize: 12, color: SILVER,
              fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
              lineHeight: 1.8, borderTop: `1px solid ${SILVER}20`, paddingTop: 10,
            }}>
              {item.expectation}
            </p>
          )}
          <p style={{ margin: 0, fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP', sans-serif" }}>
            {formatDate(item.since)} から
          </p>
        </div>

        {/* Fushigi question */}
        <div style={{
          background: 'rgba(168,200,232,0.06)',
          border: '1px solid rgba(168,200,232,0.18)',
          borderRadius: 16, padding: '16px 20px', minHeight: 52,
        }}>
          <p style={{
            margin: 0, fontSize: 13, lineHeight: 1.9,
            color: qLoading ? colors.accent.blue + '55' : colors.accent.blue,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
          }}>
            {qLoading ? '……' : question}
          </p>
        </div>

        {/* Recall counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button style={roundBtnStyle} onClick={() => setTodayInput(v => String(Math.max(0, parseInt(v || '0') - 1)))}>−</button>
          <input
            type="number" min={0} max={99}
            value={todayInput}
            onChange={(e) => setTodayInput(e.target.value)}
            placeholder="0"
            style={{
              width: 58, textAlign: 'center',
              background: 'rgba(255,255,255,0.07)',
              border: `1px solid ${SILVER}40`,
              borderRadius: 10, padding: '8px 0',
              color: colors.text.primary,
              fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 22,
              outline: 'none',
            }}
          />
          <button style={roundBtnStyle} onClick={() => setTodayInput(v => String(parseInt(v || '0') + 1))}>＋</button>
          <p style={{ margin: 0, flex: 1, fontSize: 12, color: colors.text.secondary, fontFamily: "'Noto Serif JP', serif", fontWeight: 300 }}>
            回 思い出した
          </p>
          <button
            onClick={handleSave}
            disabled={!todayInput}
            style={{
              background: 'none',
              border: `1px solid ${SILVER}50`,
              borderRadius: 10, padding: '7px 16px',
              cursor: todayInput ? 'pointer' : 'default',
              color: saved ? colors.accent.blue : SILVER,
              fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
              fontSize: 12, transition: 'color 0.3s',
              opacity: todayInput ? 1 : 0.4,
            }}
          >
            {saved ? '記録済 ✓' : '記録'}
          </button>
        </div>

        {/* Last recall date */}
        {lastDate && (
          <p style={{
            margin: 0, fontSize: 11, textAlign: 'center',
            color: lastDate === today ? SILVER : colors.text.secondary,
            fontFamily: "'Noto Sans JP', sans-serif",
          }}>
            最後に思い出した日：{formatDate(lastDate)}
          </p>
        )}

        {/* Mini bar chart */}
        {hasData && (
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP', sans-serif" }}>
              過去14日間
            </p>
            <ResponsiveContainer width="100%" height={72}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -32 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: colors.text.secondary }}
                  interval={6}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: colors.text.secondary }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{ background: '#1C1A2E', border: `1px solid ${SILVER}40`, borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: SILVER }}
                  itemStyle={{ color: colors.text.primary }}
                  formatter={(v) => [`${String(v)}回`, '思い出した']}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.date} fill={entry.date === today ? SILVER : `${SILVER}55`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  )
}

// ── List card ─────────────────────────────────────────────────────────────

function WaitingListCard({ item, onClick }: { item: Waiting; onClick: () => void }) {
  const today      = todayStr()
  const lastDate   = getLastRecallDate(item.id!)
  const todayEntry = getRecallHistory(item.id!).find(e => e.date === today)

  return (
    <GlassCard accent="silver" onClick={onClick} size="sm">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: '0 0 4px', fontSize: 15,
            color: colors.text.primary,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
            letterSpacing: '0.08em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.target}
          </p>
          <p style={{
            margin: 0, fontSize: 12,
            color: colors.text.secondary,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
            lineHeight: 1.7,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          } as CSSProperties}>
            {item.content}
          </p>
        </div>
        {todayEntry !== undefined && (
          <span style={{ flexShrink: 0, fontSize: 11, color: SILVER, fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
            今日 {todayEntry.count}回
          </span>
        )}
      </div>
      {lastDate && (
        <p style={{
          margin: '8px 0 0', fontSize: 10,
          color: lastDate === today ? SILVER : colors.text.secondary,
          fontFamily: "'Noto Sans JP', sans-serif",
        }}>
          最終：{formatDate(lastDate)}
        </p>
      )}
    </GlassCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export function WaitingPage() {
  const [items,      setItems]      = useState<Waiting[]>([])
  const [selected,   setSelected]   = useState<Waiting | null>(null)
  const [addOpen,    setAddOpen]    = useState(false)
  const [editOpen,   setEditOpen]   = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const reload = () => waitings.list().then(setItems)
  useEffect(() => { void reload() }, [])

  const handleAdd = async (form: FormState) => {
    await waitings.add({ ...form, createdAt: new Date().toISOString() })
    setAddOpen(false)
    void reload()
  }

  const handleEdit = async (form: FormState) => {
    if (!selected?.id) return
    await waitings.update(selected.id, form)
    const updated = await waitings.get(selected.id)
    setSelected(updated ?? null)
    setEditOpen(false)
    void reload()
  }

  const handleDelete = async () => {
    if (!selected?.id) return
    await waitings.delete(selected.id)
    setDeleteOpen(false)
    setSelected(null)
    void reload()
  }

  return (
    <ModuleShell title="待っているもの" accent="silver" backTo="/">

      {selected && (
        <DetailView
          item={selected}
          onEdit={() => setEditOpen(true)}
          onDelete={() => setDeleteOpen(true)}
          onBack={() => setSelected(null)}
        />
      )}

      {addOpen && (
        <AddEditModal onSave={handleAdd} onClose={() => setAddOpen(false)} />
      )}

      {editOpen && selected && (
        <AddEditModal initial={selected} onSave={handleEdit} onClose={() => setEditOpen(false)} />
      )}

      {deleteOpen && selected && (
        <DeleteConfirm
          target={selected.target}
          onConfirm={handleDelete}
          onCancel={() => setDeleteOpen(false)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setAddOpen(true)}
            style={{
              background: 'none',
              border: `1px solid ${SILVER}50`,
              borderRadius: 20, padding: '6px 18px',
              color: SILVER, cursor: 'pointer',
              fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
              fontSize: 13, letterSpacing: '0.06em',
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${SILVER}14`
              e.currentTarget.style.borderColor = SILVER
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.borderColor = `${SILVER}50`
            }}
          >
            ＋ 追加
          </button>
        </div>

        {items.length === 0 ? (
          <p style={{
            textAlign: 'center', margin: '32px 0',
            fontSize: 13, color: colors.text.secondary,
            fontFamily: "'Noto Serif JP', serif", fontWeight: 300, lineHeight: 1.9,
          }}>
            まだ記録がありません。<br />
            待っていることを、ここに置いておきましょう。
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item) => (
              <WaitingListCard key={item.id} item={item} onClick={() => setSelected(item)} />
            ))}
          </div>
        )}

      </div>
    </ModuleShell>
  )
}
