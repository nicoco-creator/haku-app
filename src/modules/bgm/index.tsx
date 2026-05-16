import { useState, useEffect } from 'react'
import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard }   from '../../ui/GlassCard'
import { useAppStore } from '../../core/store'
import { bgmEngine, BGM_PRESETS } from '../../core/bgm-engine'
import { bgmTracks, type BGMTrack } from '../../core/db'
import { colors } from '../../ui/tokens'

export function BGMPage() {
  const trackKey      = useAppStore((s) => s.bgmTrackKey)
  const playing       = useAppStore((s) => s.bgmPlaying)
  const volume        = useAppStore((s) => s.bgmVolume)
  const setBgmTrack   = useAppStore((s) => s.setBgmTrack)
  const setBgmPlaying = useAppStore((s) => s.setBgmPlaying)
  const setBgmVolume  = useAppStore((s) => s.setBgmVolume)
  const stopBgm       = useAppStore((s) => s.stopBgm)

  const [imported, setImported]   = useState<BGMTrack[]>([])
  const [importing, setImporting] = useState(false)
  const [importErr, setImportErr] = useState<string | null>(null)

  useEffect(() => {
    bgmTracks.list().then(setImported)
  }, [])

  // ── Playback helpers ────────────────────────────────────────────────────────

  const playGenerated = (id: string, name: string) => {
    bgmEngine.playGenerated(id)
    setBgmTrack(`gen:${id}`, name)
  }

  const playImported = async (track: BGMTrack) => {
    if (!track.id) return
    await bgmEngine.playImported(track.audioBlob)
    setBgmTrack(`imp:${track.id}`, track.name)
  }

  const handlePlayPause = () => {
    if (playing) { bgmEngine.pause(); setBgmPlaying(false) }
    else         { void bgmEngine.resume(); setBgmPlaying(true) }
  }

  const handleStop = () => { bgmEngine.stopAll(); stopBgm() }

  const handleVolume = (v: number) => {
    bgmEngine.setVolume(v)
    setBgmVolume(v)
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 100 * 1024 * 1024) {
      setImportErr('100MB以内のファイルを選択してください')
      e.target.value = ''; return
    }
    setImporting(true); setImportErr(null)
    try {
      const mimeForExt: Record<string, string> = {
        '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',  '.flac': 'audio/flac', '.aac': 'audio/aac',
        '.mp4': 'audio/mp4',
      }
      const ext = (file.name.toLowerCase().match(/\.\w+$/) ?? [''])[0]
      const mimeType = file.type || mimeForExt[ext] || 'audio/mpeg'
      const blob = new Blob([await file.arrayBuffer()], { type: mimeType })
      await bgmTracks.add({ name: file.name.replace(/\.[^.]+$/, ''), audioBlob: blob, createdAt: new Date().toISOString() })
      setImported(await bgmTracks.list())
    } catch {
      setImportErr('読み込みに失敗しました')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleDeleteImported = async (id: number) => {
    if (trackKey === `imp:${id}`) handleStop()
    await bgmTracks.delete(id)
    setImported(await bgmTracks.list())
  }

  const isActive = (key: string) => trackKey === key

  // ── Styles ──────────────────────────────────────────────────────────────────

  const btnBase = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
  }

  return (
    <ModuleShell title="BGM" accent="blue" backTo="/">
      <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 80 }}>

        {/* ── 現在再生中 ──────────────────────────────────────────────── */}
        {trackKey && (
          <GlassCard size="sm" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13, color: colors.text.primary, flex: 1 }}>
                🎵 {useAppStore.getState().bgmTrackName}
              </span>
              <button onClick={handlePlayPause} style={{
                ...btnBase,
                background: 'rgba(168,200,232,0.15)',
                border: '1px solid rgba(168,200,232,0.3)',
                borderRadius: '50%', width: 38, height: 38,
                color: colors.accent.blue, fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {playing ? '⏸' : '▶'}
              </button>
              <button onClick={handleStop} style={{ ...btnBase, color: 'rgba(255,255,255,0.35)', fontSize: 18 }}>
                ⏹
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 11, color: colors.text.secondary }}>🔈</span>
              <input
                type="range" min={0} max={1} step={0.05}
                value={volume}
                onChange={(e) => handleVolume(Number(e.target.value))}
                style={{ flex: 1, accentColor: colors.accent.blue }}
              />
              <span style={{ fontSize: 11, color: colors.text.secondary }}>🔊</span>
            </div>
          </GlassCard>
        )}

        {/* ── 生成BGM ─────────────────────────────────────────────────── */}
        <p style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12, color: colors.text.secondary, margin: '0 0 10px' }}>
          生成サウンド
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {BGM_PRESETS.map((p) => {
            const key    = `gen:${p.id}`
            const active = isActive(key)
            return (
              <GlassCard
                key={p.id}
                size="sm"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  border: active ? `1px solid ${colors.accent.blue}55` : undefined,
                  background: active ? 'rgba(168,200,232,0.08)' : undefined,
                }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13, color: colors.text.primary }}>
                    {p.name}
                  </p>
                  <p style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10, color: colors.text.secondary }}>
                    {p.description}
                  </p>
                </div>
                <button
                  onClick={() => active && playing ? handlePlayPause() : playGenerated(p.id, p.name)}
                  style={{
                    ...btnBase,
                    background: active ? 'rgba(168,200,232,0.2)' : 'rgba(168,200,232,0.1)',
                    border: `1px solid rgba(168,200,232,0.3)`,
                    borderRadius: '50%', width: 36, height: 36,
                    color: colors.accent.blue, fontSize: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {active && playing ? '⏸' : '▶'}
                </button>
              </GlassCard>
            )
          })}
        </div>

        {/* ── インポートしたBGM ────────────────────────────────────────── */}
        <p style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12, color: colors.text.secondary, margin: '0 0 10px' }}>
          インポートした音楽
        </p>

        {imported.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {imported.map((t) => {
              const key    = `imp:${t.id}`
              const active = isActive(key)
              return (
                <GlassCard key={t.id} size="sm" style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  border: active ? `1px solid ${colors.accent.blue}55` : undefined,
                  background: active ? 'rgba(168,200,232,0.08)' : undefined,
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>🎵</span>
                  <span style={{ flex: 1, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </span>
                  <button
                    onClick={() => active && playing ? handlePlayPause() : playImported(t)}
                    style={{
                      ...btnBase,
                      background: active ? 'rgba(168,200,232,0.2)' : 'rgba(168,200,232,0.1)',
                      border: `1px solid rgba(168,200,232,0.3)`,
                      borderRadius: '50%', width: 36, height: 36,
                      color: colors.accent.blue, fontSize: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {active && playing ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={() => t.id && handleDeleteImported(t.id)}
                    style={{ ...btnBase, color: 'rgba(220,100,100,0.7)', fontSize: 16, flexShrink: 0 }}
                  >
                    🗑
                  </button>
                </GlassCard>
              )
            })}
          </div>
        )}

        {/* インポートボタン */}
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px dashed rgba(255,255,255,0.15)',
          borderRadius: 14, cursor: 'pointer',
          fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
          color: colors.text.secondary,
          transition: 'background 0.2s',
        }}>
          <input
            type="file"
            accept=".mp3,.wav,.ogg,.m4a,.flac,.aac,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/flac,audio/aac"
            style={{ display: 'none' }}
            onChange={handleImport}
            disabled={importing}
          />
          {importing ? '読み込み中…' : '＋ 音楽ファイルをインポート（MP3 / WAV / OGG, 最大100MB）'}
        </label>
        {importErr && (
          <p style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11, color: colors.accent.amber, margin: '6px 0 0', textAlign: 'center' }}>
            {importErr}
          </p>
        )}
      </div>
    </ModuleShell>
  )
}
