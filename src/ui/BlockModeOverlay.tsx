/**
 * 現実世界を5分間遮断する権利 — 遮断モードオーバーレイ
 * haku_block_until タイムスタンプを毎秒チェックし、アクティブなら全画面をロック。
 * リロード後も残り時間を正確に復元する。
 */

import { useState, useEffect } from 'react'
import { getBlockUntil, clearBlock } from '../core/shop'
import { colors } from './tokens'

function pad(n: number) { return String(n).padStart(2, '0') }

const FUSHIGI_MESSAGES = [
  '外の世界へ帰るのを禁止します。ここで静かにしていなさい。',
  '5分だけ、私のそばにいてください。',
  'ここにいるあいだ、あなたは誰にも捕まりません。',
  '外の騒がしさを、いまだけ遮断します。',
]

export function BlockModeOverlay() {
  const [remaining, setRemaining] = useState(() => {
    const until = getBlockUntil()
    return Math.max(0, Math.ceil((until - Date.now()) / 1000))
  })

  const [msgIdx] = useState(() => Math.floor(Math.random() * FUSHIGI_MESSAGES.length))

  useEffect(() => {
    const tick = () => {
      const until = getBlockUntil()
      if (!until) { setRemaining(0); return }
      const rem = Math.max(0, Math.ceil((until - Date.now()) / 1000))
      setRemaining(rem)
      if (rem <= 0) clearBlock()
    }

    tick()  // immediate check (handles new block purchased after mount)
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [])

  if (remaining <= 0) return null

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(14,12,28,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 28, padding: '32px 24px',
        userSelect: 'none',
      }}
    >
      {/* 大きな✦ */}
      <span style={{
        fontSize: 52, lineHeight: 1,
        animation: 'blockPulse 4s ease infinite',
        color: colors.accent.silver,
        opacity: 0.8,
      }}>
        ✦
      </span>

      <style>{`
        @keyframes blockPulse { 0%,100% { opacity:0.5; transform: scale(1); } 50% { opacity:0.9; transform: scale(1.08); } }
        @keyframes countFade  { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:none; } }
      `}</style>

      {/* フシギちゃんのセリフ */}
      <p style={{
        fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
        fontSize: 'clamp(15px,4vw,18px)',
        color: colors.text.primary,
        textAlign: 'center', lineHeight: 2, margin: 0,
        maxWidth: 320,
      }}>
        {FUSHIGI_MESSAGES[msgIdx]}
      </p>

      {/* カウントダウン */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        animation: 'countFade 0.4s ease',
      }}>
        <p style={{
          margin: 0,
          fontFamily: 'Inter,sans-serif', fontWeight: 300,
          fontSize: 64, color: colors.text.primary,
          letterSpacing: '-0.04em', lineHeight: 1,
        }}>
          {pad(mins)}:{pad(secs)}
        </p>
        <p style={{
          margin: 0,
          fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
          color: colors.text.secondary,
        }}>
          このまま、ここにいてください
        </p>
      </div>

      {/* 小さな装飾テキスト */}
      <p style={{
        position: 'absolute', bottom: 28,
        fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
        fontSize: 11, color: `${colors.text.secondary}66`,
        margin: 0, letterSpacing: '0.06em',
      }}>
        遮断中 — 現実世界は待っています
      </p>
    </div>
  )
}
