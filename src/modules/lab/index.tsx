import { useState } from 'react'
import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard } from '../../ui/GlassCard'
import { GadgetBoundary } from '../../ui/GadgetBoundary'
import { GadgetMount } from '../../ui/GadgetMount'
import {
  parseGadget,
  saveGadget,
  loadGadgets,
  deleteGadget,
  clearAllGadgets,
  type SavedGadget,
} from '../../core/gadget-engine'
import { colors } from '../../ui/tokens'

const SAMPLE = `{
  template: \`
    <div style="text-align:center;padding:20px;font-family:'Noto Sans JP',sans-serif">
      <p style="font-size:32px;margin:0 0 14px;transition:all 0.3s">{{ card }}</p>
      <button @click="drawCard" style="
        background:rgba(168,200,232,0.15);
        border:1px solid rgba(168,200,232,0.35);
        border-radius:12px;padding:8px 22px;
        color:#A8C8E8;cursor:pointer;font-size:13px;
        font-family:'Noto Sans JP',sans-serif
      ">カードを引く</button>
    </div>
  \`,
  data() {
    return { card: '🔮 何が出るでしょう' }
  },
  methods: {
    drawCard() {
      const cards = ['🌟 幸運', '🌙 休息を', '☁️ 嵐の前', '🌸 新しい出会い', '🔥 情熱']
      this.card = cards[Math.floor(Math.random() * cards.length)]
    }
  }
}`

export function LabPage() {
  const [code, setCode]               = useState(SAMPLE)
  const [gadgetName, setGadgetName]   = useState('カードガジェット')
  const [parseError, setParseError]   = useState<string | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [testedCode, setTestedCode]   = useState<string | null>(null)
  const [previewKey, setPreviewKey]   = useState(0)
  const [gadgets, setGadgets]         = useState<SavedGadget[]>(() => loadGadgets())
  const [confirmClear, setConfirmClear] = useState(false)
  const [installed, setInstalled]     = useState(false)

  const hasError  = parseError !== null || runtimeError !== null
  const canInstall = testedCode !== null && !hasError && gadgetName.trim().length > 0

  const handleTest = () => {
    const result = parseGadget(code)
    if (!result.ok) {
      setParseError(result.error)
      setRuntimeError(null)
      setTestedCode(null)
      return
    }
    setParseError(null)
    setRuntimeError(null)
    setTestedCode(code)
    setPreviewKey((k) => k + 1)
    setInstalled(false)
  }

  const handleInstall = () => {
    if (!canInstall) return
    saveGadget({ name: gadgetName.trim(), code: testedCode! })
    setGadgets(loadGadgets())
    setInstalled(true)
  }

  const handleDelete = (id: string) => {
    deleteGadget(id)
    setGadgets(loadGadgets())
  }

  const handleEmergency = () => {
    clearAllGadgets()
    setGadgets([])
    setConfirmClear(false)
  }

  return (
    <ModuleShell title="禁忌の実験室" accent="ash" backTo="/">
      <div style={{ maxWidth: 920, margin: '0 auto', paddingBottom: 40 }}>

        {/* 注意書き */}
        <GlassCard size="sm" style={{ marginBottom: 20, textAlign: 'center' }}>
          <p style={{
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 12, color: colors.text.secondary, margin: 0, lineHeight: 1.9,
          }}>
            🧪 ここではコードを実験できます。どんなエラーが起きても、アプリ全体は守られています。
          </p>
        </GlassCard>

        {/* ── エディタ ＋ プレビュー ─────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-4" style={{ marginBottom: 20 }}>

          {/* 左：コードエディタ */}
          <div style={{ flex: 1 }}>
            <p style={{
              fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11,
              color: colors.text.secondary, margin: '0 0 6px',
            }}>
              コードエディタ
            </p>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%', minHeight: 300, boxSizing: 'border-box',
                background: 'rgba(0,0,0,0.4)',
                border: `1px solid ${hasError ? 'rgba(220,80,80,0.5)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 16, padding: '14px',
                color: '#98c379',
                fontFamily: "'Fira Code',Consolas,'Courier New',monospace",
                fontSize: 12, lineHeight: 1.65,
                resize: 'vertical', outline: 'none',
                transition: 'border-color 0.25s',
              }}
            />

            {/* エラーパネル */}
            {(parseError || runtimeError) && (
              <div style={{
                marginTop: 8, padding: '10px 14px',
                background: 'rgba(180,40,40,0.2)',
                border: '1px solid rgba(220,80,80,0.38)',
                borderRadius: 12,
              }}>
                <p style={{
                  margin: '0 0 6px',
                  fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12, color: '#ff8888',
                }}>
                  ⚠️ フシギちゃんより:{' '}
                  {parseError ? '構文エラーを発見しました' : '実行中にエラーが起きました'}
                </p>
                <pre style={{
                  margin: 0, fontFamily: 'monospace', fontSize: 11,
                  color: 'rgba(255,190,190,0.85)', whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all', maxHeight: 140, overflow: 'auto',
                }}>
                  {parseError ?? runtimeError}
                </pre>
              </div>
            )}

            <button
              onClick={handleTest}
              style={{
                marginTop: 10, width: '100%', padding: '10px',
                background: 'rgba(168,200,232,0.12)',
                border: '1px solid rgba(168,200,232,0.3)',
                borderRadius: 12, color: colors.accent.blue,
                cursor: 'pointer', fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(168,200,232,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(168,200,232,0.12)')}
            >
              🔬 テスト実行
            </button>
          </div>

          {/* 右：プレビュー ＋ 設置フォーム */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{
              fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11,
              color: colors.text.secondary, margin: 0,
            }}>
              プレビュー
            </p>

            <div style={{
              minHeight: 200, borderRadius: 16, overflow: 'hidden',
              background: hasError ? 'rgba(140,20,20,0.12)' : 'rgba(0,0,0,0.25)',
              border: `1px solid ${hasError ? 'rgba(220,80,80,0.3)' : 'rgba(255,255,255,0.08)'}`,
              transition: 'background 0.3s, border-color 0.3s',
            }}>
              {testedCode ? (
                <GadgetBoundary
                  key={previewKey}
                  gadgetName={gadgetName || 'プレビュー'}
                  onError={(e) => setRuntimeError(e.message + (e.stack ? '\n' + e.stack : ''))}
                >
                  <GadgetMount
                    code={testedCode}
                    onError={(msg) => setRuntimeError(msg)}
                  />
                </GadgetBoundary>
              ) : (
                <div style={{ padding: 28, textAlign: 'center' }}>
                  <p style={{
                    fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
                    fontSize: 13, color: colors.text.secondary, margin: 0,
                  }}>
                    「テスト実行」を押すとここに表示されます
                  </p>
                </div>
              )}
            </div>

            {/* ガジェット名 */}
            <input
              type="text"
              placeholder="ガジェット名"
              value={gadgetName}
              onChange={(e) => { setGadgetName(e.target.value); setInstalled(false) }}
              style={{
                width: '100%', padding: '8px 14px', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, color: colors.text.primary,
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
                outline: 'none',
              }}
            />

            {/* 設置ボタン */}
            <button
              onClick={handleInstall}
              disabled={!canInstall}
              style={{
                padding: '10px', width: '100%',
                background: canInstall ? 'rgba(91,92,230,0.22)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${canInstall ? 'rgba(91,92,230,0.45)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 12,
                color: canInstall ? colors.accent.indigo : colors.text.secondary,
                cursor: canInstall ? 'pointer' : 'default',
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
                transition: 'all 0.2s',
              }}
            >
              {installed ? '✅ ホームに設置しました！' : '🏠 このガジェットを部屋に設置する'}
            </button>
          </div>
        </div>

        {/* ── インストール済みガジェット ──────────────────────────────────── */}
        {gadgets.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{
              fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
              color: colors.text.secondary, margin: '0 0 10px',
            }}>
              インストール済みガジェット（{gadgets.length}）
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gadgets.map((g) => (
                <GlassCard key={g.id} size="sm" style={{
                  display: 'flex', alignItems: 'center',
                  gap: 12, justifyContent: 'space-between',
                }}>
                  <span style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13, color: colors.text.primary }}>
                    🧩 {g.name}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: colors.text.secondary, flexShrink: 0 }}>
                    {new Date(g.createdAt).toLocaleDateString('ja-JP')}
                  </span>
                  <button
                    onClick={() => handleDelete(g.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(220,100,100,0.7)', fontSize: 12, padding: '2px 6px',
                      fontFamily: "'Noto Sans JP',sans-serif", flexShrink: 0,
                    }}
                  >
                    削除
                  </button>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* ── 緊急リセット ──────────────────────────────────────────────── */}
        {!confirmClear ? (
          <button
            onClick={() => setConfirmClear(true)}
            style={{
              width: '100%', padding: '10px',
              background: 'rgba(180,40,40,0.08)',
              border: '1px solid rgba(220,80,80,0.22)',
              borderRadius: 12, color: 'rgba(220,130,130,0.75)',
              cursor: 'pointer', fontFamily: "'Noto Sans JP',sans-serif", fontSize: 12,
            }}
          >
            ⚠️【緊急】全ガジェットの一時無効化 / LocalStorageクリア
          </button>
        ) : (
          <div style={{
            padding: 16, borderRadius: 12, textAlign: 'center',
            background: 'rgba(180,40,40,0.15)',
            border: '1px solid rgba(220,80,80,0.4)',
          }}>
            <p style={{
              fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
              color: '#ff8888', margin: '0 0 12px',
            }}>
              本当にすべてのガジェットを削除しますか？
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={handleEmergency} style={{
                background: 'rgba(220,80,80,0.25)',
                border: '1px solid rgba(220,80,80,0.5)',
                borderRadius: 10, padding: '8px 22px',
                color: '#ff8888', cursor: 'pointer',
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
              }}>全削除する</button>
              <button onClick={() => setConfirmClear(false)} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '8px 22px',
                color: colors.text.secondary, cursor: 'pointer',
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
              }}>キャンセル</button>
            </div>
          </div>
        )}
      </div>
    </ModuleShell>
  )
}
