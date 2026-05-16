export function BackgroundField() {
  return (
    <>
      <style>{`
        @keyframes bgShift {
          0%   { background-position: 0% 0%; }
          50%  { background-position: 10% -10%; }
          100% { background-position: 0% 0%; }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: -1,
          background: `radial-gradient(ellipse at var(--haku-bg-pos, 30% 40%), var(--haku-bg-1, #FAF5EE) 0%, var(--haku-bg-2, #F5F1EC) 50%, var(--haku-bg-3, #EDE6DD) 100%)`,
          animation: 'bgShift 20s ease infinite alternate',
        }}
      />
    </>
  )
}
