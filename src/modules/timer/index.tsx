import { useState, useEffect, useRef, useCallback } from 'react'
import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard } from '../../ui/GlassCard'
import { colors } from '../../ui/tokens'
import { checkTimerBadges, BADGE_DEFS } from '../../core/badges'
import { recordTimerComplete } from '../../core/meta'
import { tryGetSouvenir, type SouvenirDef } from '../../core/souvenirs'
import { hasItem } from '../../core/shop'

const KEY_COUNT = 'haku_timer_count'

const PRESETS = [
  { label: '5分',  minutes: 5 },
  { label: '15分', minutes: 15 },
  { label: '25分', minutes: 25 },
  { label: '45分', minutes: 45 },
  { label: '60分', minutes: 60 },
]

type Phase = 'idle' | 'running' | 'paused' | 'finished'

function playChime() {
  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime
    const freqs = [523.25, 659.25, 783.99]
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.35
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.18, t + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2)
      osc.start(t)
      osc.stop(t + 1.3)
    })
  } catch { /* AudioContext unavailable */ }
}

function pad(n: number) { return String(n).padStart(2, '0') }
function formatTime(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}` }

export function TimerPage() {
  const [word,       setWord]       = useState('')
  const [presetIdx,  setPresetIdx]  = useState(1)
  const [customMin,  setCustomMin]  = useState('')
  const [useCustom,  setUseCustom]  = useState(false)
  const [phase,      setPhase]      = useState<Phase>('idle')
  const [remaining,  setRemaining]  = useState(0)
  const [totalSec,   setTotalSec]   = useState(0)
  const [dissolving, setDissolving] = useState(false)
  const [newBadges,  setNewBadges]  = useState<string[]>([])
  const [souvenir,   setSouvenir]   = useState<SouvenirDef | null>(null)

  // Refs hold values captured at timer start (safe inside interval callback)
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const wordRef       = useRef('')
  const durationRef   = useRef(0)  // minutes

  const clearTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }
  useEffect(() => () => clearTimer(), [])

  const getTargetSeconds = useCallback(() => {
    if (useCustom) {
      const v = parseInt(customMin, 10)
      return isNaN(v) || v < 1 ? 60 : Math.min(v, 180) * 60
    }
    return PRESETS[presetIdx].minutes * 60
  }, [useCustom, customMin, presetIdx])

  const handleFinish = useCallback(() => {
    setPhase('finished')
    setDissolving(true)
    playChime()

    const hasWord = wordRef.current.trim() !== ''
    const durMin  = durationRef.current

    // Cumulative count
    const count = parseInt(localStorage.getItem(KEY_COUNT) ?? '0', 10) + 1
    localStorage.setItem(KEY_COUNT, String(count))

    // Meta tracking (must happen before badge checks)
    recordTimerComplete(durMin, hasWord)

    const earned   = checkTimerBadges(count)
    const gift     = tryGetSouvenir()

    if (earned.length) setNewBadges(earned)
    if (gift) setSouvenir(gift)
  }, [])

  const handleStart = () => {
    const sec = getTargetSeconds()
    wordRef.current     = word
    durationRef.current = Math.ceil(sec / 60)

    setTotalSec(sec)
    setRemaining(sec)
    setPhase('running')
    setDissolving(false)
    setNewBadges([])
    setSouvenir(null)

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearTimer(); handleFinish(); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handlePause = () => { clearTimer(); setPhase('paused') }

  const handleResume = () => {
    setPhase('running')
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearTimer(); handleFinish(); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleReset = () => {
    clearTimer()
    setPhase('idle')
    setDissolving(false)
    setNewBadges([])
    setSouvenir(null)
  }

  const progress = totalSec > 0 ? (totalSec - remaining) / totalSec : 0

  return (
    <ModuleShell title="作業タイマー" accent="blue" backTo="/">
      <style>{`
        @keyframes sugarDissolve {
          0%   { opacity: 1; transform: translateY(0) scale(1);     filter: blur(0); }
          40%  { opacity: 0.8; transform: translateY(12px) scale(0.9); filter: blur(1px); }
          100% { opacity: 0;   transform: translateY(32px) scale(0.4); filter: blur(6px); }
        }
        @keyframes cupAppear    { from { opacity: 0; transform: scale(0.8) translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes msgAppear    { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes ringPulse    { 0%,100% { opacity: 0.4; } 50% { opacity: 0.9; } }
        @keyframes giftAppear   { from { opacity: 0; transform: scale(0.9) translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 0 32px' }}>

        {/* ── IDLE ── */}
        {phase === 'idle' && (
          <>
            <GlassCard size="sm">
              <p style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 13, color: colors.text.secondary, margin: '0 0 10px', lineHeight: 1.7 }}>
                集中の時間が終わったとき、ハーブティーに溶かしたい言葉はありますか？
              </p>
              <input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="（なくても大丈夫です）"
                maxLength={30}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.13)',
                  borderRadius: 10, padding: '9px 13px', color: colors.text.primary,
                  fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 14, outline: 'none',
                }}
              />
            </GlassCard>

            <GlassCard size="sm">
              <p style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12, color: colors.text.secondary, margin: '0 0 10px' }}>
                時間を選んでください
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PRESETS.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => { setPresetIdx(i); setUseCustom(false) }}
                    style={{
                      padding: '6px 16px', borderRadius: 20,
                      border: `1px solid ${!useCustom && presetIdx === i ? colors.accent.blue : 'rgba(255,255,255,0.18)'}`,
                      background: !useCustom && presetIdx === i ? `${colors.accent.blue}22` : 'transparent',
                      color: !useCustom && presetIdx === i ? colors.accent.blue : colors.text.secondary,
                      fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >{p.label}</button>
                ))}
                <button
                  onClick={() => setUseCustom(true)}
                  style={{
                    padding: '6px 16px', borderRadius: 20,
                    border: `1px solid ${useCustom ? colors.accent.blue : 'rgba(255,255,255,0.18)'}`,
                    background: useCustom ? `${colors.accent.blue}22` : 'transparent',
                    color: useCustom ? colors.accent.blue : colors.text.secondary,
                    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >カスタム</button>
              </div>
              {useCustom && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number" value={customMin} onChange={(e) => setCustomMin(e.target.value)}
                    placeholder="分" min={1} max={180}
                    style={{
                      width: 80, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.13)',
                      borderRadius: 8, padding: '6px 10px', color: colors.text.primary,
                      fontFamily: "'Inter',sans-serif", fontSize: 14, outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 13, color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif" }}>分（最大180分）</span>
                </div>
              )}
            </GlassCard>

            {/* frequency_note ショップアイテム購入済みの場合に表示 */}
            {hasItem('frequency_note') && (
              <div style={{ textAlign: 'center', padding: '6px 0' }}>
                <p style={{ margin: 0, fontFamily: 'Inter,sans-serif', fontWeight: 300, fontSize: 12, color: colors.accent.blue, letterSpacing: '0.04em' }}>
                  ♪ 432Hz — 精神を凪に導く周波数
                </p>
                <p style={{ margin: '3px 0 0', fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 11, color: colors.text.secondary, lineHeight: 1.6 }}>
                  この集中が終わったとき、世界が少し違って見えるかもしれません。
                </p>
              </div>
            )}

            <button
              onClick={handleStart}
              style={{
                background: `${colors.accent.blue}22`, border: `1px solid ${colors.accent.blue}55`,
                borderRadius: 16, padding: '14px 0', color: colors.accent.blue,
                fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 16, cursor: 'pointer', width: '100%',
                transition: 'background 0.2s',
              }}
            >タイマーをはじめる</button>
          </>
        )}

        {/* ── RUNNING / PAUSED ── */}
        {(phase === 'running' || phase === 'paused') && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '12px 0' }}>
              <div style={{ position: 'relative', width: 180, height: 180 }}>
                <svg width="180" height="180" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                  <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                  <circle
                    cx="90" cy="90" r="80" fill="none"
                    stroke={colors.accent.blue} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={`${2 * Math.PI * 80 * (1 - progress)}`}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span style={{
                    fontFamily: "'Inter',sans-serif", fontWeight: 300, fontSize: 38, color: colors.text.primary, letterSpacing: '-0.02em',
                    animation: phase === 'paused' ? 'ringPulse 2s ease infinite' : 'none',
                  }}>
                    {formatTime(remaining)}
                  </span>
                  {phase === 'paused' && (
                    <span style={{ fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif" }}>一時停止中</span>
                  )}
                </div>
              </div>
              {word && (
                <p style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 14, color: `${colors.text.secondary}99`, margin: 0, textAlign: 'center', letterSpacing: '0.05em' }}>
                  「{word}」を溶かす準備をしています
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {phase === 'running' ? (
                <button onClick={handlePause} style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 14, cursor: 'pointer' }}>一時停止</button>
              ) : (
                <button onClick={handleResume} style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: `1px solid ${colors.accent.blue}55`, background: `${colors.accent.blue}18`, color: colors.accent.blue, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 14, cursor: 'pointer' }}>再開する</button>
              )}
              <button onClick={handleReset} style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 14, cursor: 'pointer' }}>やめる</button>
            </div>
          </>
        )}

        {/* ── FINISHED ── */}
        {phase === 'finished' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '20px 0' }}>

            {/* Herb tea dissolve */}
            <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 64, lineHeight: 1, animation: 'cupAppear 0.5s ease forwards' }}>☕</span>
              {wordRef.current && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 14, color: colors.text.primary, whiteSpace: 'nowrap',
                  animation: dissolving ? 'sugarDissolve 2.5s ease 0.4s forwards' : 'none',
                }}>
                  {wordRef.current}
                </span>
              )}
            </div>

            {/* Fushigi message */}
            <div style={{ animation: 'msgAppear 0.6s ease 1.5s both', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 16, color: colors.text.primary, margin: '0 0 8px', lineHeight: 1.8 }}>
                {wordRef.current ? '全部、溶けましたよ。' : 'お疲れさまでした。'}
              </p>
              <p style={{ fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 13, color: colors.text.secondary, margin: 0, lineHeight: 1.7 }}>
                {wordRef.current ? 'その言葉はもう、ここには残っていません。' : 'ちゃんと時間を使えましたね。'}
              </p>
            </div>

            {/* おみやげ */}
            {souvenir && (
              <div style={{ animation: 'giftAppear 0.6s ease 2s both', width: '100%' }}>
                <GlassCard size="sm" accent="blush" style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: colors.text.secondary, fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: '0.06em' }}>
                    これ、落ちてましたよ。あげます。
                  </p>
                  <p style={{ margin: '6px 0', fontSize: 36, lineHeight: 1 }}>{souvenir.emoji}</p>
                  <p style={{ margin: '0 0 8px', fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 14, color: colors.accent.blush }}>
                    {souvenir.name}
                  </p>
                  <p style={{ margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 12, color: colors.text.secondary, lineHeight: 1.7 }}>
                    {souvenir.fushigiSays}
                  </p>
                </GlassCard>
              </div>
            )}

            {/* 新バッジ */}
            {newBadges.length > 0 && (
              <div style={{ animation: 'msgAppear 0.6s ease 2.5s both', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {newBadges.map((id) => {
                  const def = BADGE_DEFS.find((b) => b.id === id)
                  if (!def) return null
                  return (
                    <GlassCard key={id} size="sm" style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 28 }}>{def.emoji}</p>
                      <p style={{ margin: '0 0 6px', fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 14, color: colors.accent.blue }}>
                        「{def.name}」を受け取りました
                      </p>
                      <p style={{ margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 12, color: colors.text.secondary, lineHeight: 1.7 }}>
                        {def.message}
                      </p>
                    </GlassCard>
                  )
                })}
              </div>
            )}

            <button
              onClick={handleReset}
              style={{
                marginTop: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 14, padding: '11px 32px', color: colors.text.secondary,
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 14, cursor: 'pointer',
              }}
            >もう一度はじめる</button>
          </div>
        )}
      </div>
    </ModuleShell>
  )
}
