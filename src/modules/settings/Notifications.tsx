import { useState, type CSSProperties } from 'react'
import { GlassCard } from '../../ui/GlassCard'
import { colors } from '../../ui/tokens'
import {
  notif,
  loadNotifSettings,
  saveNotifSettings,
  DEFAULT_NOTIF_SETTINGS,
  NOTIF_IDS,
  type NotifSettings,
} from '../../core/notifications'

// ── Toggle (local copy to avoid cross-import) ─────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 26, borderRadius: 13, border: 'none',
        background: on ? colors.accent.indigo : 'rgba(255,255,255,0.15)',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        transition: 'background 0.25s ease',
        WebkitTapHighlightColor: 'transparent',
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

// ── helpers ───────────────────────────────────────────────────────────────────

const LABELS: Record<keyof NotifSettings, string> = {
  morning:  '朝の挨拶',
  study:    '学習リマインダー',
  alert:    '崩壊予兆アラート',
  night:    '夜の見守り',
  monthEnd: '月末記録',
}

type TimedKey = 'morning' | 'study' | 'night'

function applySchedule(key: keyof NotifSettings, settings: NotifSettings): void {
  const id    = NOTIF_IDS[key]
  const label = LABELS[key]

  if (key === 'morning' || key === 'study' || key === 'night') {
    const s = settings[key as TimedKey]
    notif.scheduleDaily(id, s.hour, s.minute, label, s.body)
  } else if (key === 'monthEnd') {
    notif.scheduleDaily(id, 20, 0, label, settings.monthEnd.body, { monthEndOnly: true })
  }
  // 'alert' has no timer — fired from metrics.ts when level >= 2
}

// ── NotifRow ──────────────────────────────────────────────────────────────────

interface NotifRowProps {
  notifKey:  keyof NotifSettings
  settings:  NotifSettings
  onChange:  (next: NotifSettings) => void
}

function NotifRow({ notifKey, settings, onChange }: NotifRowProps) {
  const [expanded, setExpanded] = useState(false)

  const item    = settings[notifKey]
  const isTimed = notifKey === 'morning' || notifKey === 'study' || notifKey === 'night'

  const labelStyle: CSSProperties = {
    fontFamily: "'Noto Sans JP',sans-serif",
    fontSize: 14, color: colors.text.primary, flex: 1,
  }
  const subStyle: CSSProperties = {
    fontFamily: "'Noto Sans JP',sans-serif",
    fontSize: 12, color: colors.text.secondary, marginTop: 2,
  }
  const timeInput: CSSProperties = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 8, padding: '4px 8px',
    color: colors.text.primary,
    fontFamily: 'Inter,sans-serif', fontSize: 14,
    outline: 'none', flexShrink: 0,
  }

  const handleToggle = (enabled: boolean) => {
    const next = { ...settings, [notifKey]: { ...item, enabled } }
    onChange(next)
    if (enabled) {
      applySchedule(notifKey, next)
    } else {
      notif.cancel(NOTIF_IDS[notifKey])
    }
  }

  const handleTimeChange = (value: string) => {
    if (!isTimed) return
    const [h, m] = value.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return
    const next = { ...settings, [notifKey]: { ...item, hour: h, minute: m } }
    onChange(next)
    if (item.enabled) applySchedule(notifKey, next)
  }

  const handleBodyChange = (body: string) => {
    const next = { ...settings, [notifKey]: { ...item, body } }
    onChange(next)
    if (item.enabled) applySchedule(notifKey, next)
  }

  const timedItem  = isTimed ? (item as { hour: number; minute: number; body: string; enabled: boolean }) : null
  const timeValue  = timedItem
    ? `${String(timedItem.hour).padStart(2, '0')}:${String(timedItem.minute).padStart(2, '0')}`
    : ''

  const subText = notifKey === 'alert'
    ? 'レベル2以上で当日1回'
    : notifKey === 'monthEnd'
    ? '月末 20:00'
    : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, ...labelStyle }}>{LABELS[notifKey]}</p>
          {subText && <p style={{ margin: 0, ...subStyle }}>{subText}</p>}
        </div>
        {isTimed && (
          <input
            type="time"
            value={timeValue}
            onChange={e => handleTimeChange(e.target.value)}
            style={timeInput}
          />
        )}
        <Toggle on={item.enabled} onChange={handleToggle} />
      </div>

      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          textAlign: 'left', color: colors.text.secondary,
          fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {expanded ? '▾ メッセージを閉じる' : '▸ メッセージを編集'}
      </button>

      {expanded && (
        <textarea
          value={item.body}
          onChange={e => handleBodyChange(e.target.value)}
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 10, padding: '8px 12px',
            color: colors.text.primary,
            fontFamily: "'Noto Sans JP',sans-serif",
            fontSize: 13, resize: 'none', outline: 'none', lineHeight: 1.7,
          }}
          placeholder={DEFAULT_NOTIF_SETTINGS[notifKey].body}
        />
      )}
    </div>
  )
}

// ── NotificationsSection ──────────────────────────────────────────────────────

export function NotificationsSection() {
  const supported  = 'Notification' in window
  const [perm, setPerm] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  )
  const [settings, setSettings] = useState<NotifSettings>(loadNotifSettings)

  const handleChange = (next: NotifSettings) => {
    setSettings(next)
    saveNotifSettings(next)
  }

  const handleRequestPermission = async () => {
    const granted = await notif.requestPermission()
    setPerm(granted ? 'granted' : 'denied')
  }

  const labelStyle: CSSProperties = {
    fontFamily: "'Noto Sans JP',sans-serif",
    fontSize: 14, color: colors.text.primary,
  }
  const subStyle: CSSProperties = {
    fontFamily: "'Noto Sans JP',sans-serif",
    fontSize: 12, color: colors.text.secondary, marginTop: 2,
  }

  return (
    <>
      {/* ── Section divider ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          通知設定
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* ── Permission card ── */}
      <GlassCard size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ margin: 0, ...labelStyle }}>通知を有効にする</p>
              <p style={{ margin: 0, ...subStyle }}>
                {!supported
                  ? 'このブラウザは通知に対応していません'
                  : perm === 'granted'
                  ? '通知が許可されています ✓'
                  : perm === 'denied'
                  ? '通知がブロックされています。ブラウザ設定から許可してください'
                  : '通知の許可が必要です'}
              </p>
            </div>
            {supported && perm === 'default' && (
              <button
                onClick={() => void handleRequestPermission()}
                style={{
                  background: `${colors.accent.indigo}22`,
                  border: `1px solid ${colors.accent.indigo}66`,
                  borderRadius: 10, padding: '6px 14px',
                  color: colors.text.primary,
                  fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
                  cursor: 'pointer', flexShrink: 0,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                許可する
              </button>
            )}
          </div>

          {/* iOS note */}
          <p style={{
            margin: 0, fontSize: 11, lineHeight: 1.8,
            color: colors.accent.amber,
            fontFamily: "'Noto Sans JP',sans-serif",
            background: `${colors.accent.amber}11`,
            border: `1px solid ${colors.accent.amber}33`,
            borderRadius: 8, padding: '7px 10px',
          }}>
            iPhone / iPad では、ホーム画面に追加した Haku アプリから設定してください。
            Safari のタブから開いた場合は通知を利用できません。
          </p>

          {/* テスト通知 */}
          {perm === 'granted' && (
            <button
              onClick={() => notif.show('フシギちゃんより', 'フシギちゃんからのテストです')}
              style={{
                background: `${colors.accent.blue}18`,
                border: `1px solid ${colors.accent.blue}55`,
                borderRadius: 10, padding: '8px 0',
                color: colors.accent.blue,
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
                cursor: 'pointer', width: '100%',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              テスト通知を送る
            </button>
          )}
        </div>
      </GlassCard>

      {/* ── Notification rows ── */}
      {(Object.keys(settings) as (keyof NotifSettings)[]).map(key => (
        <GlassCard key={key} size="sm">
          <NotifRow
            notifKey={key}
            settings={settings}
            onChange={handleChange}
          />
        </GlassCard>
      ))}
    </>
  )
}
