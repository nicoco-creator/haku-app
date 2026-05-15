export function BackgroundField() {
  return (
    <>
      <style>{`
        @keyframes bgShift {
          0%   { background-position: 30% 40%; }
          50%  { background-position: 40% 30%; }
          100% { background-position: 30% 40%; }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: -1,
          background: 'radial-gradient(ellipse at 30% 40%, #FAF5EE 0%, #F5F1EC 50%, #EDE6DD 100%)',
          animation: 'bgShift 20s ease infinite alternate',
        }}
      />
    </>
  )
}
