import { useAppStore } from '../core/store'

interface Props {
  accentTint?: string
}

export function BackgroundField({ accentTint }: Props) {
  const storeTint = useAppStore((s) => s.backgroundTint)
  const tint = accentTint ?? storeTint

  return (
    <>
      <style>{`
        @keyframes bgShift {
          0%   { background-position: 30% 40%; opacity: 1; }
          50%  { background-position: 40% 30%; opacity: 0.92; }
          100% { background-position: 30% 40%; opacity: 1; }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          background: tint
            ? `radial-gradient(ellipse at 30% 40%, ${tint} 0%, #2A2050 20%, #1C1A2E 55%, #14122A 100%)`
            : 'radial-gradient(ellipse at 30% 40%, #2A2050 0%, #1C1A2E 50%, #14122A 100%)',
          animation: 'bgShift 20s ease infinite alternate',
        }}
      />
    </>
  )
}
