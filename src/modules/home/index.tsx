export function HomePage() {
  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h1
        style={{
          fontFamily: "'Noto Serif JP', serif",
          fontWeight: 300,
          fontSize: 'clamp(2rem, 8vw, 4rem)',
          color: '#F0EEF8',
          letterSpacing: '0.1em',
          margin: 0,
        }}
      >
        Haku
      </h1>
    </div>
  )
}
