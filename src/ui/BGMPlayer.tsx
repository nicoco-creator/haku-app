import { useAppStore } from '../core/store'
import { bgmEngine }   from '../core/bgm-engine'
import { colors }      from './tokens'

export function BGMPlayer() {
  const trackKey  = useAppStore((s) => s.bgmTrackKey)
  const trackName = useAppStore((s) => s.bgmTrackName)
  const playing   = useAppStore((s) => s.bgmPlaying)
  const volume    = useAppStore((s) => s.bgmVolume)
  const setBgmPlaying = useAppStore((s) => s.setBgmPlaying)
  const setBgmVolume  = useAppStore((s) => s.setBgmVolume)
  const stopBgm       = useAppStore((s) => s.stopBgm)

  if (!trackKey) return null

  const handlePlayPause = () => {
    if (playing) {
      bgmEngine.pause()
      setBgmPlaying(false)
    } else {
      void bgmEngine.resume()
      setBgmPlaying(true)
    }
  }

  const handleVolume = (v: number) => {
    bgmEngine.setVolume(v)
    setBgmVolume(v)
  }

  const handleStop = () => {
    bgmEngine.stopAll()
    stopBgm()
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 500,
      background: 'rgba(14,12,26,0.92)',
      backdropFilter: 'blur(16px) saturate(120%)',
      WebkitBackdropFilter: 'blur(16px) saturate(120%)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* トラック名 */}
      <span style={{
        fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
        color: colors.text.secondary, flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        🎵 {trackName}
      </span>

      {/* 再生・一時停止 */}
      <button
        onClick={handlePlayPause}
        style={{
          background: 'rgba(168,200,232,0.15)',
          border: '1px solid rgba(168,200,232,0.3)',
          borderRadius: '50%', width: 34, height: 34,
          color: colors.accent.blue, cursor: 'pointer',
          fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {playing ? '⏸' : '▶'}
      </button>

      {/* ボリューム */}
      <input
        type="range" min={0} max={1} step={0.05}
        value={volume}
        onChange={(e) => handleVolume(Number(e.target.value))}
        style={{ width: 72, accentColor: colors.accent.blue, flexShrink: 0 }}
      />

      {/* 停止・閉じる */}
      <button
        onClick={handleStop}
        style={{
          background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
          fontSize: 16, padding: '0 2px', flexShrink: 0,
        }}
        title="停止"
      >
        ✕
      </button>
    </div>
  )
}
