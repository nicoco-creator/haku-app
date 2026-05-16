import { useState, useRef, type CSSProperties } from 'react'
import { GlassCard } from '../../ui/GlassCard'
import { colors } from '../../ui/tokens'
import { useAppStore } from '../../core/store'
import { DEFAULT_MODEL_URL } from '../../ui/FushigiLive2D'

// Detect PC (non-touch) device for folder picker
const IS_PC = typeof window !== 'undefined'
  && !('ontouchstart' in window)
  && !/android|iphone|ipad|ipod/i.test(navigator.userAgent)

// ── Folder-based local model loader (PC only, session-scoped) ─────────────────
// Reads a folder of Live2D files, patches the model3.json to use blob URLs,
// and returns a blob URL for the patched model3.json.
// Blob URLs are revoked when the component unmounts.
async function buildBlobModelUrl(files: FileList): Promise<{ url: string; name: string; revoke: () => void }> {
  const all = Array.from(files)

  // Find model3.json
  const model3File = all.find(f => f.name.endsWith('.model3.json'))
  if (!model3File) throw new Error('.model3.json ファイルが見つかりません')

  // Folder prefix = "foldername/"
  const prefix = model3File.webkitRelativePath.split('/').slice(0, -1).join('/') + '/'

  // Build blob URL map: relative-path → blob URL
  const created: string[] = []
  const urlMap = new Map<string, string>()
  for (const f of all) {
    const rel = f.webkitRelativePath.startsWith(prefix)
      ? f.webkitRelativePath.slice(prefix.length)
      : f.webkitRelativePath
    const u = URL.createObjectURL(f)
    urlMap.set(rel, u)
    created.push(u)
  }

  // Patch model3.json — replace every string value that matches a known file path
  const model3Text = await model3File.text()
  const model3     = JSON.parse(model3Text) as unknown

  function patch(v: unknown): unknown {
    if (typeof v === 'string') {
      const mapped = urlMap.get(v)
      return mapped !== undefined ? mapped : v
    }
    if (Array.isArray(v)) return v.map(patch)
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, patch(val)]),
      )
    return v
  }

  const patched  = patch(model3)
  const blob     = new Blob([JSON.stringify(patched)], { type: 'application/json' })
  const modelUrl = URL.createObjectURL(blob)
  created.push(modelUrl)

  const revoke = () => created.forEach(u => URL.revokeObjectURL(u))
  return { url: modelUrl, name: model3File.name, revoke }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Live2DSection() {
  const live2dModelUrl    = useAppStore(s => s.live2dModelUrl)
  const setLive2dModelUrl = useAppStore(s => s.setLive2dModelUrl)

  const [pathInput, setPathInput]   = useState(live2dModelUrl ?? '')
  const [status,    setStatus]      = useState<{ ok: boolean; text: string } | null>(null)
  const [loading,   setLoading]     = useState(false)
  const folderRef  = useRef<HTMLInputElement>(null)
  const revokeRef  = useRef<(() => void) | null>(null)

  const flash = (ok: boolean, text: string) => {
    setStatus({ ok, text })
    setTimeout(() => setStatus(null), 5000)
  }

  const currentName = (() => {
    const url = live2dModelUrl ?? DEFAULT_MODEL_URL
    return url.split('/').pop() ?? url
  })()

  const isDefault = !live2dModelUrl

  const handleSavePath = () => {
    const trimmed = pathInput.trim()
    if (!trimmed) {
      setLive2dModelUrl(null)
      flash(true, 'デフォルトモデルに戻しました')
      return
    }
    // Accept relative paths (e.g. "live2d/custom/model.model3.json") or full URLs
    const url = trimmed.startsWith('http') ? trimmed : `${import.meta.env.BASE_URL}${trimmed.replace(/^\//, '')}`
    setLive2dModelUrl(url)
    flash(true, '保存しました。フシギちゃんが新しいモデルで読み込み直します。')
  }

  const handleReset = () => {
    setLive2dModelUrl(null)
    setPathInput('')
    flash(true, 'デフォルトに戻しました')
  }

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setLoading(true)
    try {
      // Revoke previous session blobs
      revokeRef.current?.()
      const { url, name, revoke } = await buildBlobModelUrl(files)
      revokeRef.current = revoke
      setLive2dModelUrl(url)
      flash(true, `${name} を読み込みました（このセッション限り有効）`)
    } catch (err) {
      flash(false, String(err))
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const labelStyle: CSSProperties = {
    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 14, color: colors.text.primary,
  }
  const subStyle: CSSProperties = {
    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
    color: colors.text.secondary, marginTop: 2,
  }
  const inputStyle: CSSProperties = {
    flex: 1, background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 10, padding: '7px 12px',
    color: colors.text.primary,
    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
    outline: 'none',
  }
  const btnStyle = (active = true): CSSProperties => ({
    background: active ? `${colors.accent.blue}20` : 'rgba(255,255,255,0.05)',
    border: `1px solid ${active ? colors.accent.blue + '55' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: 10, padding: '6px 14px',
    color: active ? colors.text.primary : colors.text.secondary,
    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
    cursor: active ? 'pointer' : 'default', flexShrink: 0,
    opacity: active ? 1 : 0.5,
  })

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          Live2D モデル
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* 現在のモデル */}
      <GlassCard size="sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <p style={labelStyle}>現在のモデル</p>
            <p style={{ ...subStyle, color: isDefault ? colors.accent.blue : colors.accent.blush }}>
              {isDefault ? '（デフォルト）' : ''}{currentName}
            </p>
          </div>
          {!isDefault && (
            <button onClick={handleReset} style={btnStyle()}>デフォルトに戻す</button>
          )}
        </div>
      </GlassCard>

      {/* パスで指定（永続化） */}
      <GlassCard size="sm">
        <p style={labelStyle}>パスで指定（永続化）</p>
        <p style={{ ...subStyle, marginBottom: 10 }}>
          モデルファイルを <code style={{ fontSize: 11, color: colors.accent.indigo }}>public/live2d/</code> に置き、
          相対パスを入力してください。
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={pathInput}
            onChange={e => setPathInput(e.target.value)}
            placeholder="live2d/my-model/model.model3.json"
            style={inputStyle}
          />
          <button onClick={handleSavePath} style={btnStyle()}>適用</button>
        </div>
        <p style={{ ...subStyle, marginTop: 6 }}>
          例：7月にモデルが届いたら <code style={{ fontSize: 11 }}>public/live2d/haku/</code> に置いて
          <code style={{ fontSize: 11 }}>live2d/haku/haku.model3.json</code> と入力。
        </p>
      </GlassCard>

      {/* フォルダから読み込み（PCのみ・セッション限り） */}
      {IS_PC && (
        <GlassCard size="sm">
          <p style={labelStyle}>フォルダから読み込み <span style={{ fontSize: 11, color: colors.accent.amber }}>PC専用・セッション限り</span></p>
          <p style={{ ...subStyle, marginBottom: 10 }}>
            モデルフォルダをまるごと選択します。ページを再読み込みするとリセットされます。
          </p>
          <input
            ref={folderRef}
            type="file"
            // @ts-expect-error webkitdirectory is not in standard TypeScript types
            webkitdirectory=""
            multiple
            hidden
            onChange={e => void handleFolderSelect(e)}
          />
          <button
            onClick={() => folderRef.current?.click()}
            disabled={loading}
            style={btnStyle(!loading)}
          >
            {loading ? '読み込み中…' : 'フォルダを選択'}
          </button>
        </GlassCard>
      )}

      {/* Status */}
      {status && (
        <p style={{
          margin: 0, fontSize: 12, textAlign: 'center',
          color: status.ok ? colors.accent.blue : colors.accent.amber,
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
        }}>
          {status.ok ? '✓ ' : '⚠ '}{status.text}
        </p>
      )}
    </>
  )
}
