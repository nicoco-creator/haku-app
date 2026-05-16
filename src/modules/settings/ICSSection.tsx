/**
 * ICS カレンダー連携セクション
 * フシギちゃんとの「約束」を .ics ファイルとして生成・ダウンロードし、
 * スマホ標準カレンダーに取り込めるようにする（= バックグラウンド通知の代替）。
 */

import { useState, type CSSProperties } from 'react'
import { GlassCard } from '../../ui/GlassCard'
import { colors } from '../../ui/tokens'
import { generateICS, downloadICS, PRESET_NAMES, type ICSEvent } from '../../core/ics'

const ACCENT = colors.accent.blush

const labelStyle: CSSProperties = {
  fontFamily: "'Noto Sans JP',sans-serif", fontSize: 14, color: colors.text.primary,
}
const subStyle: CSSProperties = {
  fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
  color: colors.text.secondary, marginTop: 2,
}
const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 10, padding: '8px 12px',
  color: colors.text.primary,
  fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
  outline: 'none', colorScheme: 'dark',
}
const selectStyle: CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}
const btnStyle: CSSProperties = {
  background: `${ACCENT}22`, border: `1px solid ${ACCENT}55`,
  borderRadius: 12, padding: '10px 0',
  color: colors.text.primary,
  fontFamily: "'Noto Sans JP',sans-serif", fontSize: 14,
  cursor: 'pointer', width: '100%',
  WebkitTapHighlightColor: 'transparent',
}

function localDatetimeDefault(): string {
  const d = new Date(Date.now() + 24 * 60 * 60_000)  // tomorrow
  d.setMinutes(0, 0, 0)
  return d.toISOString().slice(0, 16)
}

export function ICSSection() {
  const [presetIdx,   setPresetIdx]   = useState(0)
  const [customName,  setCustomName]  = useState('')
  const [datetime,    setDatetime]    = useState(localDatetimeDefault)
  const [duration,    setDuration]    = useState('30')
  const [note,        setNote]        = useState('')
  const [status,      setStatus]      = useState<{ ok: boolean; text: string } | null>(null)

  const isCustom = presetIdx === PRESET_NAMES.length
  const summary  = isCustom ? customName.trim() : PRESET_NAMES[presetIdx]

  const flash = (ok: boolean, text: string) => {
    setStatus({ ok, text })
    setTimeout(() => setStatus(null), 4000)
  }

  const handleDownload = () => {
    if (!summary) { flash(false, '予定名を入力してください'); return }
    if (!datetime) { flash(false, '日時を選択してください'); return }

    const startDate = new Date(datetime)
    if (isNaN(startDate.getTime())) { flash(false, '日時が正しくありません'); return }

    const description = note.trim()
      || 'フシギちゃんとの大切な時間です。忘れないでくださいね。'

    const event: ICSEvent = {
      summary,
      description,
      startDate,
      durationMin: parseInt(duration, 10),
    }

    try {
      const ics = generateICS([event])
      downloadICS(ics, `fushigi-${startDate.toISOString().slice(0, 10)}.ics`)
      flash(true, 'カレンダーファイルをダウンロードしました。アプリで開くと予定が追加されます。')
    } catch (e) {
      flash(false, `生成エラー: ${String(e)}`)
    }
  }

  return (
    <>
      {/* セクション区切り */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          カレンダー連携（通知の代わりに）
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>

      <GlassCard size="sm">
        <p style={labelStyle}>フシギちゃんとの約束を追加</p>
        <p style={{ ...subStyle, marginBottom: 14, lineHeight: 1.7 }}>
          .ics ファイルをダウンロードしてスマホのカレンダーに取り込むと、
          アプリが閉じていても予定の時刻にOS通知が届きます。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* 予定名 */}
          <div>
            <p style={{ ...subStyle, margin: '0 0 4px' }}>予定の名前</p>
            <select
              value={presetIdx}
              onChange={e => setPresetIdx(Number(e.target.value))}
              style={selectStyle}
            >
              {PRESET_NAMES.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
              <option value={PRESET_NAMES.length}>（カスタム入力）</option>
            </select>
            {isCustom && (
              <input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="予定の名前を入力…"
                style={{ ...inputStyle, marginTop: 6 }}
              />
            )}
          </div>

          {/* 日時 */}
          <div>
            <p style={{ ...subStyle, margin: '0 0 4px' }}>日時</p>
            <input
              type="datetime-local"
              value={datetime}
              onChange={e => setDatetime(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* 所要時間 */}
          <div>
            <p style={{ ...subStyle, margin: '0 0 4px' }}>所要時間</p>
            <select
              value={duration}
              onChange={e => setDuration(e.target.value)}
              style={selectStyle}
            >
              <option value="15">15分</option>
              <option value="30">30分</option>
              <option value="60">1時間</option>
              <option value="90">1時間30分</option>
              <option value="120">2時間</option>
            </select>
          </div>

          {/* メモ */}
          <div>
            <p style={{ ...subStyle, margin: '0 0 4px' }}>メモ（任意）</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="フシギちゃんへのメッセージや備考…"
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
            />
          </div>

          <button onClick={handleDownload} style={btnStyle}>
            .ics をダウンロードしてカレンダーに追加
          </button>
        </div>

        {status && (
          <p style={{
            margin: '10px 0 0', fontSize: 12, textAlign: 'center',
            color: status.ok ? colors.accent.blue : colors.accent.amber,
            fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.6,
          }}>
            {status.ok ? '✓ ' : '⚠ '}{status.text}
          </p>
        )}
      </GlassCard>
    </>
  )
}
