import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard } from '../../ui/GlassCard'
import { colors } from '../../ui/tokens'
import { useAppStore } from '../../core/store'
import { syncAlertLevel, getAlertDiagnostics, type AlertDiagnostics } from '../../core/metrics'
import { NotificationsSection } from './Notifications'
import {
  db, vaultNotes as vaultHelper,
  type Post, type Study, type Schedule, type Journal,
  type GoodDay, type Waiting, type VaultNote,
  type ChatLog, type Metric, type SeenStat,
  posts, studies, schedules, journals, goodDays,
  waitings, chatLogs, metrics, seenStats,
} from '../../core/db'

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 26, borderRadius: 13, border: 'none',
        background: on ? colors.accent.amber : 'rgba(255,255,255,0.15)',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        transition: 'background 0.25s ease',
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: on ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.25s ease',
        display: 'block',
      }} />
    </button>
  )
}

// ── DiagRow ───────────────────────────────────────────────────────────────────

function DiagRow({ label, today, avg, triggered, isPercent = false }: {
  label: string; today: number; avg: number; triggered: boolean; isPercent?: boolean
}) {
  const fmt = (v: number) => isPercent ? `${(v * 100).toFixed(0)}%` : v.toFixed(1)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13,
        color: triggered ? colors.accent.amber : colors.text.secondary,
        fontFamily: "'Noto Sans JP',sans-serif", flex: 1 }}>
        {triggered ? '⚑ ' : '　'}{label}
      </span>
      <span style={{ fontSize: 12, color: colors.text.secondary,
        fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap' }}>
        今日 {fmt(today)} / 平均 {fmt(avg)}
      </span>
    </div>
  )
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

function u8ToBase64(buf: Uint8Array): string {
  let s = ''
  for (const b of buf) s += String.fromCharCode(b)
  return btoa(s)
}

function base64ToU8(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100_000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt'],
  )
}

async function encryptText(plain: string, passphrase: string): Promise<string> {
  const salt   = crypto.getRandomValues(new Uint8Array(16))
  const iv     = crypto.getRandomValues(new Uint8Array(12))
  const key    = await deriveKey(passphrase, salt)
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, new TextEncoder().encode(plain),
  )
  return JSON.stringify({
    v: 1, alg: 'AES-GCM-256/PBKDF2-SHA256-100k',
    salt: u8ToBase64(salt),
    iv:   u8ToBase64(iv),
    data: u8ToBase64(new Uint8Array(cipher)),
  })
}

async function decryptText(encjson: string, passphrase: string): Promise<string> {
  const { salt, iv, data } = JSON.parse(encjson) as { salt: string; iv: string; data: string }
  const key   = await deriveKey(passphrase, base64ToU8(salt))
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToU8(iv).buffer as ArrayBuffer }, key, base64ToU8(data).buffer as ArrayBuffer,
  )
  return new TextDecoder().decode(plain)
}

// ── Backup helpers ────────────────────────────────────────────────────────────

interface BackupData {
  version: 1
  exportedAt: string
  app: 'haku-app'
  tables: {
    posts:     Post[]
    studies:   Study[]
    schedules: Schedule[]
    journals:  Journal[]
    goodDays:  GoodDay[]
    waitings:  Waiting[]
    chatLogs:  ChatLog[]
    metrics:   Metric[]
    seenStats: SeenStat[]
  }
}

function dateTag(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}

function downloadText(text: string, filename: string): void {
  const a   = document.createElement('a')
  a.href    = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}

async function buildBackup(): Promise<BackupData> {
  const [p, st, sc, j, g, w, cl, m, ss] = await Promise.all([
    posts.list(), studies.list(), schedules.list(), journals.list(),
    goodDays.list(), waitings.list(), chatLogs.list(), metrics.list(), seenStats.list(),
  ])
  return {
    version: 1, exportedAt: new Date().toISOString(), app: 'haku-app',
    tables: { posts: p, studies: st, schedules: sc, journals: j,
              goodDays: g, waitings: w, chatLogs: cl, metrics: m, seenStats: ss },
  }
}

// Generic bulk table access (bypasses EntityTable type constraints)
type BulkTable = { clear: () => Promise<void>; bulkAdd: (items: object[]) => Promise<unknown> }
const asBulk = (t: unknown) => t as BulkTable

function stripId(item: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(item).filter(([k]) => k !== 'id'))
}

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

async function doImport(data: BackupData, mode: 'merge' | 'overwrite'): Promise<void> {
  const t = data.tables
  const plan: Array<[unknown, object[]]> = [
    [db.posts,     safeArr<Post>(t.posts).map(i => stripId(i as unknown as Record<string, unknown>))],
    [db.studies,   safeArr<Study>(t.studies).map(i => stripId(i as unknown as Record<string, unknown>))],
    [db.schedules, safeArr<Schedule>(t.schedules).map(i => stripId(i as unknown as Record<string, unknown>))],
    [db.journals,  safeArr<Journal>(t.journals).map(i => stripId(i as unknown as Record<string, unknown>))],
    [db.goodDays,  safeArr<GoodDay>(t.goodDays).map(i => stripId(i as unknown as Record<string, unknown>))],
    [db.waitings,  safeArr<Waiting>(t.waitings).map(i => stripId(i as unknown as Record<string, unknown>))],
    [db.chatLogs,  safeArr<ChatLog>(t.chatLogs).map(i => stripId(i as unknown as Record<string, unknown>))],
    [db.metrics,   safeArr<Metric>(t.metrics).map(i => stripId(i as unknown as Record<string, unknown>))],
    [db.seenStats, safeArr<SeenStat>(t.seenStats).map(i => stripId(i as unknown as Record<string, unknown>))],
  ]
  for (const [tbl, rows] of plan) {
    if (mode === 'overwrite') await asBulk(tbl).clear()
    if (rows.length > 0)     await asBulk(tbl).bulkAdd(rows)
  }
}

function importSummary(data: BackupData): string {
  const t = data.tables
  return ([
    ['投稿',       t.posts?.length      ?? 0],
    ['日記',       t.journals?.length   ?? 0],
    ['良かった日', t.goodDays?.length   ?? 0],
    ['待つもの',   t.waitings?.length   ?? 0],
    ['学習',       t.studies?.length    ?? 0],
    ['対話',       t.chatLogs?.length   ?? 0],
  ] as [string, number][])
    .filter(([, n]) => n > 0)
    .map(([l, n]) => `${l} ${n}件`)
    .join(' / ')
}

// ── Backup section ────────────────────────────────────────────────────────────

function BackupSection() {
  const SILVER = colors.accent.silver

  // export
  const [exporting, setExporting] = useState(false)

  // import
  const importRef    = useRef<HTMLInputElement>(null)
  const [importData, setImportData]       = useState<BackupData | null>(null)
  const [importMode, setImportMode]       = useState<'merge' | 'overwrite'>('merge')
  const [showConfirm, setShowConfirm]     = useState(false)
  const [importing,   setImporting]       = useState(false)

  // vault export
  const [vaultPassExport,  setVaultPassExport]  = useState('')
  const [vaultExporting,   setVaultExporting]   = useState(false)

  // vault import
  const vaultRef     = useRef<HTMLInputElement>(null)
  const [vaultFile,        setVaultFile]        = useState<File | null>(null)
  const [vaultPassImport,  setVaultPassImport]  = useState('')
  const [vaultImporting,   setVaultImporting]   = useState(false)

  // status
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  const flash = (ok: boolean, text: string) => {
    setStatus({ ok, text })
    setTimeout(() => setStatus(null), 4000)
  }

  // ── handlers ──────────────────────────────────────────────────────────

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const data = await buildBackup()
      downloadText(JSON.stringify(data, null, 2), `haku-backup-${dateTag()}.json`)
      flash(true, 'エクスポート完了')
    } catch (e) {
      flash(false, `エラー: ${String(e)}`)
    } finally {
      setExporting(false)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as BackupData
      if (data.version !== 1 || data.app !== 'haku-app') {
        flash(false, 'このファイルはhaku-appのバックアップではありません')
        return
      }
      setImportData(data)
    } catch {
      flash(false, 'ファイルの読み込みに失敗しました')
    }
    e.target.value = ''
  }

  const handleImportConfirm = async () => {
    if (!importData) return
    setImporting(true)
    setShowConfirm(false)
    try {
      await doImport(importData, importMode)
      setImportData(null)
      flash(true, `インポート完了（${importMode === 'overwrite' ? '上書き' : 'マージ'}）`)
    } catch (e) {
      flash(false, `インポートエラー: ${String(e)}`)
    } finally {
      setImporting(false)
    }
  }

  const handleVaultExport = async () => {
    if (!vaultPassExport.trim()) { flash(false, 'パスフレーズを入力してください'); return }
    if (vaultExporting) return
    setVaultExporting(true)
    try {
      const notes = await vaultHelper.list()
      if (notes.length === 0) { flash(false, 'Vaultにメモがありません'); return }
      const plain = JSON.stringify(notes)
      const enc   = await encryptText(plain, vaultPassExport)
      downloadText(enc, `haku-vault-${dateTag()}.encjson`)
      setVaultPassExport('')
      flash(true, `Vault ${notes.length}件を暗号化してエクスポートしました`)
    } catch (e) {
      flash(false, `暗号化エラー: ${String(e)}`)
    } finally {
      setVaultExporting(false)
    }
  }

  const handleVaultFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVaultFile(e.target.files?.[0] ?? null)
    e.target.value = ''
  }

  const handleVaultImport = async () => {
    if (!vaultFile)              { flash(false, 'ファイルを選んでください'); return }
    if (!vaultPassImport.trim()) { flash(false, 'パスフレーズを入力してください'); return }
    if (vaultImporting) return
    setVaultImporting(true)
    try {
      const enc   = await vaultFile.text()
      const plain = await decryptText(enc, vaultPassImport)
      const notes = JSON.parse(plain) as VaultNote[]
      await asBulk(db.vaultNotes).bulkAdd(
        notes.map(n => stripId(n as unknown as Record<string, unknown>)) as object[],
      )
      setVaultFile(null)
      setVaultPassImport('')
      flash(true, `Vault ${notes.length}件を復元しました`)
    } catch {
      flash(false, 'パスフレーズが違うか、ファイルが壊れています')
    } finally {
      setVaultImporting(false)
    }
  }

  // ── styles ────────────────────────────────────────────────────────────

  const rowStyle: CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
  }
  const labelStyle: CSSProperties = {
    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 14, color: colors.text.primary,
  }
  const subStyle: CSSProperties = {
    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
    color: colors.text.secondary, marginTop: 2,
  }
  const actionBtn = (active = true): CSSProperties => ({
    background: active ? `${SILVER}20` : 'rgba(255,255,255,0.05)',
    border: `1px solid ${active ? SILVER + '55' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: 10, padding: '6px 14px',
    color: active ? colors.text.primary : colors.text.secondary,
    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
    cursor: active ? 'pointer' : 'default', flexShrink: 0,
    opacity: active ? 1 : 0.5,
    transition: 'all 0.2s',
  })
  const passInput: CSSProperties = {
    flex: 1, background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 10, padding: '7px 12px',
    color: colors.text.primary,
    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
    outline: 'none',
  }

  return (
    <>
      {/* ── Import confirm overlay ── */}
      {showConfirm && importData && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(20,18,42,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: '#1C1A2E', border: `1px solid ${SILVER}40`,
            borderRadius: 20, padding: '28px 28px',
            maxWidth: 360, width: '100%',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <p style={{ margin: 0, fontSize: 15, color: colors.text.primary, fontFamily: "'Noto Serif JP',serif", fontWeight: 300 }}>
              インポートの確認
            </p>
            <p style={{ margin: 0, fontSize: 12, color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.8 }}>
              {importSummary(importData)}<br />
              モード：<span style={{ color: importMode === 'overwrite' ? colors.accent.amber : SILVER }}>
                {importMode === 'overwrite' ? '上書き（既存データを削除）' : 'マージ（既存データを保持）'}
              </span>
            </p>
            {importMode === 'overwrite' && (
              <p style={{ margin: 0, fontSize: 11, color: colors.accent.amber, fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.8 }}>
                ⚠️ 現在のデータがすべて削除されます。この操作は取り消せません。
              </p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '10px 0', background: 'none', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, cursor: 'pointer', color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13 }}>キャンセル</button>
              <button onClick={() => void handleImportConfirm()} style={{ flex: 1, padding: '10px 0', background: importMode === 'overwrite' ? 'rgba(200,80,80,0.12)' : `${SILVER}20`, border: `1px solid ${importMode === 'overwrite' ? 'rgba(200,80,80,0.40)' : SILVER + '55'}`, borderRadius: 12, cursor: 'pointer', color: importMode === 'overwrite' ? '#E89090' : colors.text.primary, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13 }}>実行</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Section divider ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          バックアップ / 復元
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* ── 1. 全データエクスポート ── */}
      <GlassCard size="sm">
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>全データエクスポート</p>
            <p style={subStyle}>vaultNotes を除く全テーブル → JSON</p>
          </div>
          <button
            onClick={() => void handleExport()}
            disabled={exporting}
            style={actionBtn(!exporting)}
          >
            {exporting ? '…' : 'エクスポート'}
          </button>
        </div>
      </GlassCard>

      {/* ── 2. データインポート ── */}
      <GlassCard size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={rowStyle}>
            <div>
              <p style={labelStyle}>データインポート</p>
              <p style={subStyle}>haku-backup-*.json から復元</p>
            </div>
            <button
              onClick={() => importRef.current?.click()}
              style={actionBtn()}
            >
              ファイルを選択
            </button>
            <input ref={importRef} type="file" accept=".json" hidden onChange={handleImportFile} />
          </div>

          {importData && (
            <>
              <p style={{ margin: 0, fontSize: 12, color: SILVER, fontFamily: "'Noto Sans JP',sans-serif" }}>
                {importSummary(importData)}
              </p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <label style={{ ...subStyle, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0 }}>
                  <input type="radio" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} />
                  マージ
                </label>
                <label style={{ ...subStyle, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0 }}>
                  <input type="radio" checked={importMode === 'overwrite'} onChange={() => setImportMode('overwrite')} />
                  <span style={{ color: importMode === 'overwrite' ? colors.accent.amber : undefined }}>上書き</span>
                </label>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={importing}
                  style={{ ...actionBtn(!importing), marginLeft: 'auto' }}
                >
                  {importing ? '処理中…' : 'インポート'}
                </button>
              </div>
            </>
          )}
        </div>
      </GlassCard>

      {/* ── 3. Vault 暗号化エクスポート ── */}
      <GlassCard size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <p style={labelStyle}>Vault 暗号化エクスポート</p>
            <p style={subStyle}>AES-GCM 256bit → haku-vault-*.encjson</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={vaultPassExport}
              onChange={e => setVaultPassExport(e.target.value)}
              placeholder="パスフレーズ"
              style={passInput}
            />
            <button
              onClick={() => void handleVaultExport()}
              disabled={vaultExporting || !vaultPassExport.trim()}
              style={actionBtn(!vaultExporting && Boolean(vaultPassExport.trim()))}
            >
              {vaultExporting ? '…' : '暗号化して書き出す'}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* ── 4. Vault 復元 ── */}
      <GlassCard size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <p style={labelStyle}>Vault 復元（復号）</p>
            <p style={subStyle}>haku-vault-*.encjson をマージして追加</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => vaultRef.current?.click()} style={actionBtn()}>
              {vaultFile ? vaultFile.name.slice(0, 20) + '…' : 'ファイルを選択'}
            </button>
            <input ref={vaultRef} type="file" accept=".encjson,.json" hidden onChange={handleVaultFile} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={vaultPassImport}
              onChange={e => setVaultPassImport(e.target.value)}
              placeholder="パスフレーズ"
              style={passInput}
            />
            <button
              onClick={() => void handleVaultImport()}
              disabled={vaultImporting || !vaultFile || !vaultPassImport.trim()}
              style={actionBtn(!vaultImporting && Boolean(vaultFile) && Boolean(vaultPassImport.trim()))}
            >
              {vaultImporting ? '復号中…' : '復元'}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* ── Status ── */}
      {status && (
        <p style={{
          margin: 0, fontSize: 12, textAlign: 'center',
          color: status.ok ? colors.accent.blue : colors.accent.amber,
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          letterSpacing: '0.04em',
        }}>
          {status.ok ? '✓ ' : '⚠ '}{status.text}
        </p>
      )}
    </>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const alertPaused     = useAppStore((s) => s.alertPaused)
  const alertOkUntil    = useAppStore((s) => s.alertOkUntil)
  const alertLevel      = useAppStore((s) => s.alertLevel)
  const setAlertPaused  = useAppStore((s) => s.setAlertPaused)
  const setAlertOkUntil = useAppStore((s) => s.setAlertOkUntil)

  const [diagOpen,    setDiagOpen]    = useState(false)
  const [diag,        setDiag]        = useState<AlertDiagnostics | null>(null)
  const [diagLoading, setDiagLoading] = useState(false)

  const isOkActive   = alertOkUntil !== null && Date.now() < alertOkUntil
  const okRemainsMin = isOkActive && alertOkUntil
    ? Math.ceil((alertOkUntil - Date.now()) / 60_000)
    : 0

  const handlePauseToggle = async (v: boolean) => {
    setAlertPaused(v)
    await syncAlertLevel()
  }

  const handleReset = async () => {
    setAlertPaused(false)
    setAlertOkUntil(null)
    await syncAlertLevel()
  }

  const handleShowDiag = async () => {
    if (diagOpen) { setDiagOpen(false); return }
    setDiagLoading(true)
    setDiagOpen(true)
    const d = await getAlertDiagnostics()
    setDiag(d)
    setDiagLoading(false)
  }

  useEffect(() => {
    if (!isOkActive || alertOkUntil === null) return
    const ms = alertOkUntil - Date.now()
    const t = setTimeout(async () => {
      setAlertOkUntil(null)
      await syncAlertLevel()
    }, ms)
    return () => clearTimeout(t)
  }, [alertOkUntil, isOkActive, setAlertOkUntil])

  const levelLabel = ['なし', 'レベル1', 'レベル2', 'レベル3'][alertLevel]
  const levelColor = [colors.text.secondary, colors.accent.blue, colors.accent.amber, '#E88080'][alertLevel]

  const rowStyle: CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
  }
  const labelStyle: CSSProperties = {
    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 14, color: colors.text.primary,
  }
  const subStyle: CSSProperties = {
    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
    color: colors.text.secondary, marginTop: 2,
  }

  return (
    <ModuleShell title="設定" accent="silver" backTo="/">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* 現在のレベル */}
        <GlassCard size="sm">
          <div style={rowStyle}>
            <span style={labelStyle}>現在の予兆レベル</span>
            <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 14, color: levelColor }}>
              {levelLabel}
            </span>
          </div>
          {(alertPaused || isOkActive) && (
            <p style={{ ...subStyle, marginTop: 6, color: colors.accent.blue }}>
              {alertPaused
                ? '一時停止中'
                : `「大丈夫」モード（残り約${okRemainsMin}分）`}
            </p>
          )}
        </GlassCard>

        {/* 一時停止スイッチ */}
        <GlassCard size="sm">
          <div style={rowStyle}>
            <div>
              <p style={labelStyle}>予兆検知を一時停止</p>
              <p style={subStyle}>オンにするとレベルが0に固定されます</p>
            </div>
            <Toggle on={alertPaused} onChange={handlePauseToggle} />
          </div>
        </GlassCard>

        {/* 全部解除 */}
        <GlassCard size="sm">
          <div style={rowStyle}>
            <div>
              <p style={labelStyle}>全部解除</p>
              <p style={subStyle}>一時停止と「大丈夫」モードを解除して再計算します</p>
            </div>
            <button
              onClick={handleReset}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 10, padding: '6px 14px',
                color: colors.text.primary, cursor: 'pointer',
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13, flexShrink: 0,
              }}
            >
              解除
            </button>
          </div>
        </GlassCard>

        {/* 条件を見る */}
        <GlassCard size="sm">
          <button
            onClick={handleShowDiag}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              width: '100%', textAlign: 'left', padding: 0,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span style={labelStyle}>次に予兆が出る条件を見る</span>
            <span style={{ color: colors.text.secondary, fontSize: 13 }}>
              {diagOpen ? '▲' : '▼'}
            </span>
          </button>

          {diagOpen && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {diagLoading && (
                <p style={{ ...subStyle, textAlign: 'center' }}>計算中…</p>
              )}
              {diag && !diagLoading && (
                <>
                  <DiagRow
                    label="投稿数（平均×2倍でトリガー）"
                    today={diag.todayPostCount} avg={diag.avgPostCount}
                    triggered={diag.postCountTriggered}
                  />
                  <DiagRow
                    label="ポジティブ語密度（平均×1.5倍・重み2）"
                    today={diag.todayPosDensity} avg={diag.avgPosDensity}
                    triggered={diag.posDensityTriggered} isPercent
                  />
                  <DiagRow
                    label="総文字数（平均×2倍でトリガー）"
                    today={diag.todayChars} avg={diag.avgChars}
                    triggered={diag.charsTriggered}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontFamily: "'Noto Sans JP',sans-serif",
                      color: diag.companionTriggered ? colors.accent.amber : colors.text.secondary }}>
                      {diag.companionTriggered ? '⚑ ' : '　'}フシギちゃん未対話（3日以上）
                    </span>
                    <span style={{ fontSize: 12, color: colors.text.secondary, fontFamily: 'Inter,sans-serif' }}>
                      {diag.companionInactiveDays >= 999 ? '未対話' : `${diag.companionInactiveDays}日`}
                    </span>
                  </div>
                  <div style={{
                    marginTop: 4, paddingTop: 10,
                    borderTop: '1px solid rgba(255,255,255,0.10)',
                    display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 13, color: colors.text.secondary,
                      fontFamily: "'Noto Sans JP',sans-serif" }}>スコア合計</span>
                    <span style={{ fontSize: 13, color: levelColor, fontFamily: 'Inter,sans-serif' }}>
                      {diag.rawScore} → {levelLabel}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </GlassCard>

        {/* ── Notifications section ── */}
        <NotificationsSection />

        {/* ── Backup section ── */}
        <BackupSection />

      </div>
    </ModuleShell>
  )
}
