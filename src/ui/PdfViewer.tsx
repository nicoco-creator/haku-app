import { useEffect, useRef, useState } from 'react'
import { colors } from './tokens'

interface Props {
  pdfBlob: Blob
}

export function PdfViewer({ pdfBlob }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docRef     = useRef<any>(null)
  const renderTask = useRef<{ cancel: () => void } | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [docReady, setDocReady] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // PDF ドキュメントをロード（pdfBlob が変わったとき）
  useEffect(() => {
    let cancelled = false
    setDocReady(false)
    setError(null)
    setPage(1)

    async function load() {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).href

        const buf = await pdfBlob.arrayBuffer()
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
        if (cancelled) return
        docRef.current = doc
        setNumPages(doc.numPages)
        setDocReady(true)
      } catch (e) {
        if (!cancelled) setError('PDFを読み込めませんでした')
      }
    }
    load()
    return () => { cancelled = true }
  }, [pdfBlob])

  // 現在ページをレンダリング（docReady または page が変わったとき）
  useEffect(() => {
    if (!docReady || !canvasRef.current) return
    let cancelled = false

    if (renderTask.current) {
      renderTask.current.cancel()
      renderTask.current = null
    }

    async function render() {
      setLoading(true)
      try {
        const pdfPage  = await docRef.current.getPage(page)
        if (cancelled) return

        // コンテナ幅に合わせてスケール計算
        const targetW  = Math.min(window.innerWidth - 32, 640)
        const vp1      = pdfPage.getViewport({ scale: 1 })
        const scale    = targetW / vp1.width
        const viewport = pdfPage.getViewport({ scale })

        const canvas = canvasRef.current!
        const ctx    = canvas.getContext('2d')!
        canvas.width  = viewport.width
        canvas.height = viewport.height

        const task = pdfPage.render({ canvasContext: ctx, viewport })
        renderTask.current = task
        await task.promise
        if (!cancelled) setLoading(false)
      } catch {
        // render cancel は正常
        if (!cancelled) setLoading(false)
      }
    }
    render()
    return () => { cancelled = true }
  }, [docReady, page])

  if (error) {
    return (
      <p style={{
        fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
        color: colors.accent.amber, textAlign: 'center', padding: '24px 0',
      }}>
        {error}
      </p>
    )
  }

  return (
    <div>
      {/* Canvas */}
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', display: 'block' }}
        />
        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(14,12,28,0.7)',
          }}>
            <p style={{
              fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
              color: colors.text.secondary, margin: 0,
            }}>
              読み込み中…
            </p>
          </div>
        )}
      </div>

      {/* ページナビゲーション */}
      {numPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 16, marginTop: 10,
        }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              background: page === 1 ? 'transparent' : `${colors.accent.silver}22`,
              border: `1px solid ${page === 1 ? 'rgba(255,255,255,0.1)' : colors.accent.silver + '55'}`,
              borderRadius: 10, padding: '6px 16px',
              color: page === 1 ? colors.text.secondary : colors.text.primary,
              cursor: page === 1 ? 'default' : 'pointer',
              fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
            }}
          >
            ← 前
          </button>

          <span style={{
            fontFamily: 'Inter,sans-serif', fontWeight: 300,
            fontSize: 13, color: colors.text.secondary,
          }}>
            {page} / {numPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={page === numPages}
            style={{
              background: page === numPages ? 'transparent' : `${colors.accent.silver}22`,
              border: `1px solid ${page === numPages ? 'rgba(255,255,255,0.1)' : colors.accent.silver + '55'}`,
              borderRadius: 10, padding: '6px 16px',
              color: page === numPages ? colors.text.secondary : colors.text.primary,
              cursor: page === numPages ? 'default' : 'pointer',
              fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
            }}
          >
            次 →
          </button>
        </div>
      )}

      {numPages > 0 && (
        <p style={{
          textAlign: 'center', margin: '6px 0 0',
          fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10,
          color: `${colors.text.secondary}80`,
        }}>
          全 {numPages} ページ
        </p>
      )}
    </div>
  )
}
