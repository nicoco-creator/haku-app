import { ModuleShell } from '../../ui/ModuleShell'
import { useAppStore } from '../../core/store'
import { UI_THEMES, applyTheme, type UILayout } from '../../core/theme'
import { colors } from '../../ui/tokens'

const layoutLabel: Record<UILayout, string> = {
  grid:    '2列グリッド',
  compact: '3列コンパクト',
  list:    'テキストリスト',
  otome:   '乙女ゲーム風',
}

export function ThemePage() {
  const uiThemeId  = useAppStore((s) => s.uiThemeId)
  const setUiTheme = useAppStore((s) => s.setUiTheme)

  const handleSelect = (id: string) => {
    const theme = UI_THEMES.find(t => t.id === id)
    if (!theme) return
    applyTheme(theme)
    setUiTheme(theme.id, theme.alwaysDark)
  }

  return (
    <ModuleShell title="模様替え" accent="blush" backTo="/">
      <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>

        <p style={{
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 13, color: colors.text.secondary,
          margin: '0 0 22px', lineHeight: 1.9, textAlign: 'center',
        }}>
          部屋の雰囲気を変えてみませんか。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {UI_THEMES.map((theme) => {
            const active = uiThemeId === theme.id
            return (
              <button
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', width: '100%',
                  background: active
                    ? 'rgba(255,255,255,0.10)'
                    : 'rgba(255,255,255,0.04)',
                  border: active
                    ? `2px solid ${colors.accent.blush}80`
                    : '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 20, cursor: 'pointer',
                  transition: 'all 0.25s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                }}
              >
                {/* 絵文字 */}
                <span style={{ fontSize: 28, flexShrink: 0 }}>{theme.emoji}</span>

                {/* テキスト */}
                <div style={{ flex: 1 }}>
                  <p style={{
                    margin: 0,
                    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 14,
                    color: colors.text.primary, fontWeight: active ? 500 : 400,
                  }}>
                    {theme.label}
                    {active && (
                      <span style={{ marginLeft: 8, fontSize: 10, color: colors.accent.blush }}>
                        ✦ 現在
                      </span>
                    )}
                  </p>
                  <p style={{
                    margin: '2px 0 0',
                    fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                    fontSize: 11, color: colors.text.secondary,
                  }}>
                    {theme.description}
                  </p>
                  <p style={{ margin: '3px 0 0', fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10, color: `${colors.text.secondary}80` }}>
                    配置：{layoutLabel[theme.layout]}
                  </p>
                </div>

                {/* カラースウォッチ */}
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  {theme.swatches.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: c,
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: `0 0 6px ${c}`,
                      }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        <p style={{
          fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
          fontSize: 10, color: `${colors.text.secondary}60`,
          margin: '24px 0 0', textAlign: 'center',
        }}>
          テーマはいつでも変更できます
        </p>
      </div>
    </ModuleShell>
  )
}
