import { useState, useEffect, type CSSProperties } from 'react'
import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard } from '../../ui/GlassCard'
import { colors } from '../../ui/tokens'
import { useAppStore } from '../../core/store'
import { syncAlertLevel, getAlertDiagnostics, type AlertDiagnostics } from '../../core/metrics'

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 26, borderRadius: 13, border: 'none',
        background: on ? colors.accent.amber : 'rgba(255,255,255,0.15)',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        transition: 'background 0.25s ease',
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: on ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.25s ease',
        display: 'block',
      }} />
    </button>
  )
}

// ── DiagRow ───────────────────────────────────────────────────────────────────

function DiagRow({ label, today, avg, triggered, isPercent = false }: {
  label: string; today: number; avg: number; triggered: boolean; isPercent?: boolean
}) {
  const fmt = (v: number) => isPercent ? `${(v * 100).toFixed(0)}%` : v.toFixed(1)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13,
        color: triggered ? colors.accent.amber : colors.text.secondary,
        fontFamily: "'Noto Sans JP',sans-serif", flex: 1 }}>
        {triggered ? '⚑ ' : '　'}{label}
      </span>
      <span style={{ fontSize: 12, color: colors.text.secondary,
        fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap' }}>
        今日 {fmt(today)} / 平均 {fmt(avg)}
      </span>
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const alertPaused     = useAppStore((s) => s.alertPaused)
  const alertOkUntil    = useAppStore((s) => s.alertOkUntil)
  const alertLevel      = useAppStore((s) => s.alertLevel)
  const setAlertPaused  = useAppStore((s) => s.setAlertPaused)
  const setAlertOkUntil = useAppStore((s) => s.setAlertOkUntil)

  const [diagOpen,    setDiagOpen]    = useState(false)
  const [diag,        setDiag]        = useState<AlertDiagnostics | null>(null)
  const [diagLoading, setDiagLoading] = useState(false)

  const isOkActive   = alertOkUntil !== null && Date.now() < alertOkUntil
  const okRemainsMin = isOkActive && alertOkUntil
    ? Math.ceil((alertOkUntil - Date.now()) / 60_000)
    : 0

  const handlePauseToggle = async (v: boolean) => {
    setAlertPaused(v)
    await syncAlertLevel()
  }

  const handleReset = async () => {
    setAlertPaused(false)
    setAlertOkUntil(null)
    await syncAlertLevel()
  }

  const handleShowDiag = async () => {
    if (diagOpen) { setDiagOpen(false); return }
    setDiagLoading(true)
    setDiagOpen(true)
    const d = await getAlertDiagnostics()
    setDiag(d)
    setDiagLoading(false)
  }

  // okUntil 期限切れで自動再計算
  useEffect(() => {
    if (!isOkActive || alertOkUntil === null) return
    const ms = alertOkUntil - Date.now()
    const t = setTimeout(async () => {
      setAlertOkUntil(null)
      await syncAlertLevel()
    }, ms)
    return () => clearTimeout(t)
  }, [alertOkUntil, isOkActive, setAlertOkUntil])

  const levelLabel = ['なし', 'レベル1', 'レベル2', 'レベル3'][alertLevel]
  const levelColor = [colors.text.secondary, colors.accent.blue, colors.accent.amber, '#E88080'][alertLevel]

  const rowStyle: CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
  }
  const labelStyle: CSSProperties = {
    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 14, color: colors.text.primary,
  }
  const subStyle: CSSProperties = {
    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
    color: colors.text.secondary, marginTop: 2,
  }

  return (
    <ModuleShell title="設定" accent="silver" backTo="/">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* 現在のレベル */}
        <GlassCard size="sm">
          <div style={rowStyle}>
            <span style={labelStyle}>現在の予兆レベル</span>
            <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 14, color: levelColor }}>
              {levelLabel}
            </span>
          </div>
          {(alertPaused || isOkActive) && (
            <p style={{ ...subStyle, marginTop: 6, color: colors.accent.blue }}>
              {alertPaused
                ? '一時停止中'
                : `「大丈夫」モード（残り約${okRemainsMin}分）`}
            </p>
          )}
        </GlassCard>

        {/* 一時停止スイッチ */}
        <GlassCard size="sm">
          <div style={rowStyle}>
            <div>
              <p style={labelStyle}>予兆検知を一時停止</p>
              <p style={subStyle}>オンにするとレベルが0に固定されます</p>
            </div>
            <Toggle on={alertPaused} onChange={handlePauseToggle} />
          </div>
        </GlassCard>

        {/* 全部解除 */}
        <GlassCard size="sm">
          <div style={rowStyle}>
            <div>
              <p style={labelStyle}>全部解除</p>
              <p style={subStyle}>一時停止と「大丈夫」モードを解除して再計算します</p>
            </div>
            <button
              onClick={handleReset}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 10, padding: '6px 14px',
                color: colors.text.primary, cursor: 'pointer',
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13, flexShrink: 0,
              }}
            >
              解除
            </button>
          </div>
        </GlassCard>

        {/* 条件を見る */}
        <GlassCard size="sm">
          <button
            onClick={handleShowDiag}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              width: '100%', textAlign: 'left', padding: 0,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span style={labelStyle}>次に予兆が出る条件を見る</span>
            <span style={{ color: colors.text.secondary, fontSize: 13 }}>
              {diagOpen ? '▲' : '▼'}
            </span>
          </button>

          {diagOpen && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {diagLoading && (
                <p style={{ ...subStyle, textAlign: 'center' }}>計算中…</p>
              )}
              {diag && !diagLoading && (
                <>
                  <DiagRow
                    label="投稿数（平均×2倍でトリガー）"
                    today={diag.todayPostCount} avg={diag.avgPostCount}
                    triggered={diag.postCountTriggered}
                  />
                  <DiagRow
                    label="ポジティブ語密度（平均×1.5倍・重み2）"
                    today={diag.todayPosDensity} avg={diag.avgPosDensity}
                    triggered={diag.posDensityTriggered} isPercent
                  />
                  <DiagRow
                    label="総文字数（平均×2倍でトリガー）"
                    today={diag.todayChars} avg={diag.avgChars}
                    triggered={diag.charsTriggered}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontFamily: "'Noto Sans JP',sans-serif",
                      color: diag.companionTriggered ? colors.accent.amber : colors.text.secondary }}>
                      {diag.companionTriggered ? '⚑ ' : '　'}フシギちゃん未対話（3日以上）
                    </span>
                    <span style={{ fontSize: 12, color: colors.text.secondary, fontFamily: 'Inter,sans-serif' }}>
                      {diag.companionInactiveDays >= 999 ? '未対話' : `${diag.companionInactiveDays}日`}
                    </span>
                  </div>
                  <div style={{
                    marginTop: 4, paddingTop: 10,
                    borderTop: '1px solid rgba(255,255,255,0.10)',
                    display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 13, color: colors.text.secondary,
                      fontFamily: "'Noto Sans JP',sans-serif" }}>スコア合計</span>
                    <span style={{ fontSize: 13, color: levelColor, fontFamily: 'Inter,sans-serif' }}>
                      {diag.rawScore} → {levelLabel}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </GlassCard>

      </div>
    </ModuleShell>
  )
}
