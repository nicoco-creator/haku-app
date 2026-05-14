import { useAppStore } from '../core/store'

interface Props {
  accentTint?: string
}

export function BackgroundField({ accentTint }: Props) {
  const storeTint   = useAppStore((s) => s.backgroundTint)
  const alertLevel  = useAppStore((s) => s.alertLevel)
  const tint = accentTint ?? storeTint

  const bgFilter = alertLevel >= 2 ? 'brightness(0.95)' : 'none'
  const bgAnim   = alertLevel >= 3
    ? 'bgShift 20s ease infinite alternate, alertPulse 10s ease-in-out infinite'
    : 'bgShift 20s ease infinite alternate'

  return (
    <>
      <style>{`
        @keyframes bgShift {
          0%   { background-position: 30% 40%; opacity: 1; }
          50%  { background-position: 40% 30%; opacity: 0.92; }
          100% { background-position: 30% 40%; opacity: 1; }
        }
        @keyframes alertPulse {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.82; }
        }
      `}</style>

      {/* ベース背景 */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: -2,
          background: tint
            ? `radial-gradient(ellipse at 30% 40%, ${tint} 0%, #2A2050 20%, #1C1A2E 55%, #14122A 100%)`
            : 'radial-gradient(ellipse at 30% 40%, #2A2050 0%, #1C1A2E 50%, #14122A 100%)',
          animation: bgAnim,
          filter: bgFilter,
          transition: 'filter 3s ease-in-out',
        }}
      />

      {/* レベル1以上：amber オーバーレイ 5% */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: -1,
          background: 'radial-gradient(ellipse at 70% 60%, #C8A050 0%, transparent 65%)',
          opacity: alertLevel >= 1 ? 0.05 : 0,
          transition: 'opacity 3s ease-in-out',
          pointerEvents: 'none',
        }}
      />
    </>
  )
}
