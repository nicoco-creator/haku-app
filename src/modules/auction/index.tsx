/**
 * 不安の買い取り窓口（逆オークション）
 * ユーザーが負の感情・認知の歪みを入力 → フシギちゃんが査定 → 静けさの欠片で買い取る。
 * 契約成立後、入力テキストは画面から消滅し、ログには一切残らない。
 */

import { useState, useRef } from 'react'
import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard } from '../../ui/GlassCard'
import { colors } from '../../ui/tokens'
import { assessAnxiety, type AssessmentResult } from '../../core/auction'
import { addShards, getShards } from '../../core/shards'

type Phase = 'idle' | 'assessing' | 'quoted' | 'contracted' | 'declined'

const ASSESS_DELAY_MS = 1800  // 査定演出の待ち時間

const ASSESSING_MESSAGES = [
  '……拝見します。',
  '……なるほど。',
  '……査定中です。',
  '……値段をつけています。',
]

const CONTRACTED_MESSAGES = [
  'では、受け取りました。それはもう、あなたのものではありません。',
  '……ちゃんと預かりましたよ。もう忘れていいんです。',
  '引き取りました。あなたの手から、完全に離れました。',
  'お預かりしました。この部屋の奥の、誰にも開けられない棚にしまっておきます。',
]

const DECLINED_MESSAGES = [
  '……やめるんですか。いつでも来ていいですよ。',
  'そうですか。気が向いたらまた来てください。',
  '無理強いはしません。準備ができたら、また来てください。',
  '……待っていますよ。いつでも。',
]

export function AuctionPage() {
  const [phase,      setPhase]      = useState<Phase>('idle')
  const [text,       setText]       = useState('')
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null)
  const [assessMsg,  setAssessMsg]  = useState('')
  const [contractMsg, setContractMsg] = useState('')
  const [shards,     setShards]     = useState(getShards)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleAssess = () => {
    if (!text.trim()) return

    // ランダムな査定中メッセージ
    setAssessMsg(ASSESSING_MESSAGES[Math.floor(Math.random() * ASSESSING_MESSAGES.length)])
    setPhase('assessing')

    timerRef.current = setTimeout(() => {
      const result = assessAnxiety(text)
      setAssessment(result)
      setPhase('quoted')
    }, ASSESS_DELAY_MS)
  }

  const handleContract = () => {
    if (!assessment) return
    addShards(assessment.shards)
    setShards(getShards())
    setContractMsg(CONTRACTED_MESSAGES[Math.floor(Math.random() * CONTRACTED_MESSAGES.length)])
    setText('')          // テキストを消滅させる（ログには保存しない）
    setAssessment(null)
    setPhase('contracted')
  }

  const handleDecline = () => {
    setContractMsg(DECLINED_MESSAGES[Math.floor(Math.random() * DECLINED_MESSAGES.length)])
    setPhase('declined')
  }

  const handleReset = () => {
    setPhase('idle')
    setAssessment(null)
    setContractMsg('')
  }

  return (
    <ModuleShell title="不安の買い取り窓口" accent="silver" backTo="/">
      <style>{`
        @keyframes fadeInUp  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes assessDot { 0%, 80%, 100% { opacity: 0.2; } 40% { opacity: 1; } }
        @keyframes contractIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* シャード残高 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 20,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <span style={{ fontSize: 14 }}>✦</span>
          <span style={{ fontFamily: 'Inter,sans-serif', fontWeight: 300, fontSize: 14, color: colors.accent.silver }}>
            {shards}
          </span>
          <span style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10, color: colors.text.secondary }}>
            シャード
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>

        {/* ── IDLE: 入力フォーム ── */}
        {phase === 'idle' && (
          <div style={{ animation: 'fadeInUp 0.4s ease' }}>
            <GlassCard size="sm">
              <p style={{
                fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                fontSize: 13, color: colors.text.secondary,
                margin: '0 0 6px', lineHeight: 1.8,
              }}>
                今、抱えているものを教えてください。
              </p>
              <p style={{
                fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                fontSize: 12, color: `${colors.text.secondary}88`,
                margin: '0 0 14px', lineHeight: 1.7,
              }}>
                モヤモヤ、自己否定、焦り、なんでもいいです。
                査定してから、私が買い取ります。
                ここに書いたものは、契約後に消えます。
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="（例：課題が終わらなくて、自分がダメだと思う。どうせ自分には無理だと毎日考えてしまう）"
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'none',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.13)',
                  borderRadius: 12, padding: '12px 14px',
                  color: colors.text.primary,
                  fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                  fontSize: 14, lineHeight: 1.75, outline: 'none',
                }}
              />
              <p style={{
                margin: '6px 0 0', textAlign: 'right',
                fontFamily: 'Inter,sans-serif', fontSize: 11,
                color: text.length > 0 ? colors.text.secondary : 'transparent',
              }}>
                {text.length} 文字
              </p>
            </GlassCard>

            <button
              onClick={handleAssess}
              disabled={!text.trim()}
              style={{
                marginTop: 4, width: '100%', padding: '14px 0',
                borderRadius: 16,
                border: `1px solid ${text.trim() ? colors.accent.silver + '66' : 'rgba(255,255,255,0.1)'}`,
                background: text.trim() ? `${colors.accent.silver}18` : 'transparent',
                color: text.trim() ? colors.text.primary : colors.text.secondary,
                fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                fontSize: 15, cursor: text.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              査定してもらう
            </button>
          </div>
        )}

        {/* ── ASSESSING: 査定中 ── */}
        {phase === 'assessing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '32px 0', animation: 'fadeInUp 0.3s ease' }}>
            <p style={{
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 16, color: colors.text.secondary, margin: 0,
            }}>
              {assessMsg}
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 0.3, 0.6].map((delay, i) => (
                <span
                  key={i}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: colors.accent.silver,
                    animation: `assessDot 1.4s ${delay}s ease infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── QUOTED: 査定結果 ── */}
        {phase === 'quoted' && assessment && (
          <div style={{ animation: 'fadeInUp 0.4s ease', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlassCard size="sm" style={{ textAlign: 'center' }}>
              <p style={{
                fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                fontSize: 15, color: colors.text.primary,
                margin: '0 0 18px', lineHeight: 2,
              }}>
                {/* 【N シャード】 部分だけハイライト */}
                {assessment.quote.split(/(\【[^】]+】)/).map((part, i) =>
                  /^\【/.test(part) ? (
                    <span key={i} style={{ color: colors.accent.silver, fontWeight: 400 }}>{part}</span>
                  ) : part
                )}
              </p>

              {/* 買い取り額 */}
              <div style={{
                margin: '0 auto 18px',
                padding: '12px 24px',
                borderRadius: 16,
                background: `${colors.accent.silver}14`,
                border: `1px solid ${colors.accent.silver}33`,
                display: 'inline-block',
              }}>
                <p style={{ margin: 0, fontFamily: 'Inter,sans-serif', fontWeight: 300, fontSize: 11, color: colors.text.secondary }}>買い取り額</p>
                <p style={{ margin: '2px 0 0', fontFamily: 'Inter,sans-serif', fontWeight: 300, fontSize: 36, color: colors.accent.silver, letterSpacing: '-0.02em' }}>
                  {assessment.shards}
                  <span style={{ fontSize: 14, marginLeft: 4 }}>シャード</span>
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleContract}
                  style={{
                    flex: 2, padding: '13px 0', borderRadius: 14,
                    border: `1px solid ${colors.accent.silver}55`,
                    background: `${colors.accent.silver}22`,
                    color: colors.text.primary,
                    fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                    fontSize: 15, cursor: 'pointer',
                  }}
                >
                  契約する
                </button>
                <button
                  onClick={handleDecline}
                  style={{
                    flex: 1, padding: '13px 0', borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'transparent',
                    color: colors.text.secondary,
                    fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13, cursor: 'pointer',
                  }}
                >
                  やめておく
                </button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* ── CONTRACTED: 契約成立 ── */}
        {phase === 'contracted' && (
          <div style={{ animation: 'contractIn 0.5s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '24px 0' }}>
            <span style={{ fontSize: 48, lineHeight: 1 }}>✦</span>
            <p style={{
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 15, color: colors.text.primary,
              margin: 0, textAlign: 'center', lineHeight: 2,
            }}>
              {contractMsg}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 20, background: `${colors.accent.silver}14`, border: `1px solid ${colors.accent.silver}30` }}>
              <span style={{ fontSize: 14 }}>✦</span>
              <span style={{ fontFamily: 'Inter,sans-serif', fontWeight: 300, fontSize: 20, color: colors.accent.silver }}>
                {shards}
              </span>
              <span style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11, color: colors.text.secondary }}>シャード</span>
            </div>
            <button
              onClick={handleReset}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 14, padding: '11px 32px',
                color: colors.text.secondary,
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13, cursor: 'pointer',
              }}
            >
              戻る
            </button>
          </div>
        )}

        {/* ── DECLINED: キャンセル ── */}
        {phase === 'declined' && (
          <div style={{ animation: 'fadeInUp 0.4s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '24px 0' }}>
            <p style={{
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 15, color: colors.text.secondary,
              margin: 0, textAlign: 'center', lineHeight: 2,
            }}>
              {contractMsg}
            </p>
            <button
              onClick={handleReset}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 14, padding: '11px 32px',
                color: colors.text.secondary,
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13, cursor: 'pointer',
              }}
            >
              戻る
            </button>
          </div>
        )}
      </div>
    </ModuleShell>
  )
}
