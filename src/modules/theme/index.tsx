import { ModuleShell } from '../../ui/ModuleShell'
import { useAppStore } from '../../core/store'
import { UI_THEMES, LAYOUT_OPTIONS, CARD_RADIUS_OPTIONS } from '../../core/theme'
import type { UILayout } from '../../core/theme'
import { colors } from '../../ui/tokens'

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <p style={{
      fontFamily: "'Noto Sans JP', sans-serif", fontSize: 11,
      color: colors.text.secondary, letterSpacing: '0.08em',
      margin: '24px 0 10px', textTransform: 'none',
    }}>
      {title}
    </p>
  )
}

// ── Layout preview (mini mockup) ──────────────────────────────────────────────
function LayoutPreview({ id }: { id: UILayout }) {
  const color = 'currentColor'

  if (id === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: 44 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: color, opacity: 0.45, flexShrink: 0 }} />
            <div style={{ flex: 1, height: 2, borderRadius: 1, background: color, opacity: 0.35 }} />
            <div style={{ width: 3, height: 5, background: color, opacity: 0.25, clipPath: 'polygon(0 0, 100% 50%, 0 100%)', flexShrink: 0 }} />
          </div>
        ))}
      </div>
    )
  }

  const cols = id === 'grid2' ? 2 : id === 'grid3' ? 3 : 4
  const rows = 2
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 3, width: 44 }}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <div key={i} style={{ aspectRatio: '1', borderRadius: 3, background: color, opacity: 0.3 }} />
      ))}
    </div>
  )
}

// ── Card radius preview ───────────────────────────────────────────────────────
function RadiusPreview({ value }: { value: string }) {
  const r = value === '4px' ? 2 : value === '10px' ? 5 : value === '20px' ? 10 : 16
  return (
    <div style={{
      width: 30, height: 22, margin: '0 auto 4px',
      border: '2px solid currentColor', borderRadius: r, opacity: 0.55,
    }} />
  )
}

export function ThemePage() {
  const uiThemeId      = useAppStore((s) => s.uiThemeId)
  const uiLayout       = useAppStore((s) => s.uiLayout) as UILayout
  const uiCardRadius   = useAppStore((s) => s.uiCardRadius)
  const setUiTheme     = useAppStore((s) => s.setUiTheme)
  const setUiLayout    = useAppStore((s) => s.setUiLayout)
  const setUiCardRadius = useAppStore((s) => s.setUiCardRadius)

  const handleTheme = (id: string) => {
    const theme = UI_THEMES.find(t => t.id === id)
    if (!theme) return
    setUiTheme(theme.id, theme.alwaysDark)
  }

  // shared button styles
  const btnBase = (active: boolean): React.CSSProperties => ({
    background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
    border: active
      ? `2px solid ${colors.accent.blush}80`
      : '1px solid rgba(255,255,255,0.10)',
    borderRadius: 'var(--haku-card-radius, 20px)',
    cursor: 'pointer', transition: 'all 0.2s',
    color: colors.text.primary,
  })

  return (
    <ModuleShell title="模様替え" accent="blush" backTo="/">
      <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 48 }}>

        <p style={{
          fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
          fontSize: 13, color: colors.text.secondary,
          margin: '0 0 4px', lineHeight: 1.9, textAlign: 'center',
        }}>
          色・配置・かたちを、それぞれ自由に組み合わせられます。
        </p>

        {/* ── カラーテーマ ────────────────────────────────────────────── */}
        <SectionHeader title="カラーテーマ" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {UI_THEMES.map((theme) => {
            const active = uiThemeId === theme.id
            return (
              <button
                key={theme.id}
                onClick={() => handleTheme(theme.id)}
                style={{
                  ...btnBase(active),
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', width: '100%', textAlign: 'left',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              >
                <span style={{ fontSize: 26, flexShrink: 0 }}>{theme.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13, fontWeight: active ? 500 : 400 }}>
                    {theme.label}
                    {active && <span style={{ marginLeft: 8, fontSize: 10, color: colors.accent.blush }}>✦ 現在</span>}
                  </p>
                  <p style={{ margin: '2px 0 0', fontFamily: "'Noto Serif JP', serif", fontWeight: 300, fontSize: 11, color: colors.text.secondary }}>
                    {theme.description}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {theme.swatches.map((c, i) => (
                    <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.1)', boxShadow: `0 0 5px ${c}` }} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* ── ボタンのレイアウト ────────────────────────────────────────── */}
        <SectionHeader title="ボタンのレイアウト" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {LAYOUT_OPTIONS.map((opt) => {
            const active = uiLayout === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setUiLayout(opt.id as UILayout)}
                style={{
                  ...btnBase(active),
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '14px 12px', gap: 8,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              >
                <LayoutPreview id={opt.id as UILayout} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontFamily: "'Noto Sans JP', sans-serif", fontSize: 12, fontWeight: active ? 500 : 400 }}>
                    {opt.label}
                    {active && <span style={{ marginLeft: 6, fontSize: 9, color: colors.accent.blush }}>✦</span>}
                  </p>
                  <p style={{ margin: '2px 0 0', fontFamily: "'Noto Serif JP', serif", fontWeight: 300, fontSize: 10, color: colors.text.secondary }}>
                    {opt.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── 角のスタイル ──────────────────────────────────────────────── */}
        <SectionHeader title="角のスタイル" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {CARD_RADIUS_OPTIONS.map((opt) => {
            const active = uiCardRadius === opt.value
            return (
              <button
                key={opt.id}
                onClick={() => setUiCardRadius(opt.value)}
                style={{
                  ...btnBase(active),
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '12px 8px', gap: 6,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              >
                <RadiusPreview value={opt.value} />
                <p style={{ margin: 0, fontFamily: "'Noto Sans JP', sans-serif", fontSize: 11, fontWeight: active ? 500 : 400 }}>
                  {opt.label}
                  {active && <span style={{ marginLeft: 4, fontSize: 9, color: colors.accent.blush }}>✦</span>}
                </p>
              </button>
            )
          })}
        </div>

        <p style={{
          fontFamily: "'Noto Serif JP', serif", fontWeight: 300,
          fontSize: 10, color: `${colors.text.secondary}60`,
          margin: '28px 0 0', textAlign: 'center',
        }}>
          設定はすぐに反映されます
        </p>
      </div>
    </ModuleShell>
  )
}
