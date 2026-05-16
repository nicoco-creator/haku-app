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
  type ParseError,
} from '../../core/gadget-engine'
import { colors } from '../../ui/tokens'

// ── サンプルコード ─────────────────────────────────────────────────────────────

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

// ── AIプロンプト雛形 ──────────────────────────────────────────────────────────

const AI_PROMPT = `以下のフォーマットで、フシギちゃんアプリ用のミニガジェットコードを書いてください。

■ フォーマット（JavaScriptオブジェクトリテラル1つだけ）
{
  template: \`<HTMLテンプレート>\`,
  data() { return { /* 初期データ */ } },
  methods: { /* イベントハンドラ */ }
}

■ テンプレートのルール
・変数の表示 → {{ 変数名 }}
・イベントバインド → @click="メソッド名" または @click="メソッド名()" どちらもOK
・対応イベント: @click @change @input @mouseenter @mouseleave なども使用可
・スタイルはすべてインライン style="" で記述（外部CSS・CSSクラスは使えない）
・フォント推奨: font-family:'Noto Sans JP',sans-serif

■ データ＆メソッドのルール
・data() でreturnしたオブジェクトが初期状態
・メソッド内で this.変数名 = 新しい値 と書くとテンプレートが再描画される
・$$プレフィックス（例: this.$$ctx）を使うと再描画なしで値を保持できる
  → AudioContext、タイマーID、非表示オブジェクトの保存に便利

■ 使えるブラウザAPI（すべて使用可能）
・setInterval / setTimeout（タイマー、アニメーションに使用可）
・Web Audio API（BGM・効果音）→ new AudioContext() はボタンクリック内で生成すること
・Web Audio API 使用例:
  this.$$ctx = new AudioContext()
  const osc = this.$$ctx.createOscillator()
  osc.type = 'sine'; osc.frequency.value = 440
  osc.connect(this.$$ctx.destination); osc.start()
・canvas, SVG（テンプレートに書いてdocument.querySelector不要なら使用可）
・localStorage（データの永続化）
・Math, Date, JSON などの標準オブジェクト

■ 使えないもの
・import / require（外部ライブラリ不可）
・fetch / XMLHttpRequest（ネットワーク通信不可）
・document.getElementById など、ガジェットのコンテナ外へのDOM操作

■ 推奨カラーパレット
・背景: rgba(255,255,255,0.07)
・文字（明）: #F0EEF8　文字（薄）: #A89FC0
・青: #A8C8E8　ピンク: #E8B4C8　紫: #5B5CE6　琥珀: #C8A050

■ 記述例（カードガチャ）
{
  template: \`
    <div style="text-align:center;padding:20px;font-family:'Noto Sans JP',sans-serif">
      <p style="font-size:28px;margin:0 0 12px">{{ card }}</p>
      <button @click="draw" style="background:rgba(168,200,232,0.15);border:1px solid rgba(168,200,232,0.35);border-radius:10px;padding:8px 20px;color:#A8C8E8;cursor:pointer">引く</button>
    </div>
  \`,
  data() { return { card: '🔮 タップして' } },
  methods: {
    draw() {
      const list = ['🌟 幸運', '🌙 休息を', '🌸 出会い', '🔥 情熱', '☁️ 嵐の前']
      this.card = list[Math.floor(Math.random() * list.length)]
    }
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【ここに希望のガジェット機能を書いてください】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

// ── エラーパネル ───────────────────────────────────────────────────────────────

function ErrorPanel({ err, label }: { err: ParseError; label: string }) {
  const [stackOpen, setStackOpen] = useState(false)

  return (
    <div style={{
      marginTop: 8, borderRadius: 12, overflow: 'hidden',
      border: '1px solid rgba(220,80,80,0.4)',
      background: 'rgba(160,30,30,0.18)',
    }}>
      {/* ヘッダー行 */}
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid rgba(220,80,80,0.2)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          background: 'rgba(220,80,80,0.3)',
          borderRadius: 6, padding: '1px 7px',
          fontFamily: 'monospace', fontSize: 10,
          color: '#ffaaaa', flexShrink: 0,
        }}>
          {err.errorType}
        </span>
        <span style={{
          fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11,
          color: '#ff8888',
        }}>
          ⚠️ フシギちゃんより: {label}
        </span>
      </div>

      {/* メッセージ */}
      <div style={{ padding: '10px 14px 6px' }}>
        <pre style={{
          margin: 0, fontFamily: 'monospace', fontSize: 12,
          color: '#ffdddd', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          lineHeight: 1.6,
        }}>
          {err.message}
        </pre>
      </div>

      {/* ヒント */}
      <div style={{ padding: '0 14px 10px' }}>
        <p style={{
          margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11,
          color: 'rgba(255,210,120,0.9)', lineHeight: 1.7,
        }}>
          💡 {err.hint}
        </p>
      </div>

      {/* スタックトレース（折りたたみ） */}
      {err.stack && (
        <>
          <button
            onClick={() => setStackOpen((o) => !o)}
            style={{
              width: '100%', padding: '6px 14px', textAlign: 'left',
              background: 'rgba(0,0,0,0.2)', border: 'none',
              borderTop: '1px solid rgba(220,80,80,0.15)',
              color: 'rgba(255,160,160,0.6)', cursor: 'pointer',
              fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10,
            }}
          >
            {stackOpen ? '▲ スタックトレースを閉じる' : '▼ スタックトレースを見る'}
          </button>
          {stackOpen && (
            <pre style={{
              margin: 0, padding: '10px 14px',
              background: 'rgba(0,0,0,0.25)',
              fontFamily: 'monospace', fontSize: 10,
              color: 'rgba(255,180,180,0.55)', whiteSpace: 'pre-wrap',
              wordBreak: 'break-all', maxHeight: 200, overflow: 'auto',
              lineHeight: 1.6,
            }}>
              {err.stack}
            </pre>
          )}
        </>
      )}
    </div>
  )
}

// ── AIプロンプトカード ─────────────────────────────────────────────────────────

function PromptCard() {
  const [open, setOpen]     = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(AI_PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <GlassCard size="sm" style={{ marginBottom: 20 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 0,
        }}
      >
        <span style={{
          fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
          color: colors.text.primary,
        }}>
          🤖 AIにガジェットを書いてもらう（プロンプト雛形）
        </span>
        <span style={{ color: colors.text.secondary, fontSize: 12 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={{
            fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11,
            color: colors.text.secondary, margin: '0 0 8px', lineHeight: 1.8,
          }}>
            下のプロンプトをコピーして、Claude や ChatGPT に貼り付けてください。
            末尾の【　】の中に作りたい機能を書き加えるだけで OK です。
          </p>

          <textarea
            readOnly
            value={AI_PROMPT}
            style={{
              width: '100%', minHeight: 180, boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '10px 12px',
              color: colors.text.secondary,
              fontFamily: 'monospace', fontSize: 10,
              lineHeight: 1.65, resize: 'vertical', outline: 'none',
            }}
          />

          <button
            onClick={handleCopy}
            style={{
              marginTop: 8, width: '100%', padding: '9px',
              background: copied ? 'rgba(80,200,120,0.18)' : 'rgba(168,200,232,0.12)',
              border: `1px solid ${copied ? 'rgba(80,200,120,0.35)' : 'rgba(168,200,232,0.3)'}`,
              borderRadius: 10,
              color: copied ? 'rgba(120,220,150,0.9)' : colors.accent.blue,
              cursor: 'pointer', fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13,
              transition: 'all 0.25s',
            }}
          >
            {copied ? '✅ コピーしました！' : '📋 プロンプトをコピー'}
          </button>
        </div>
      )}
    </GlassCard>
  )
}

// ── メインページ ───────────────────────────────────────────────────────────────

export function LabPage() {
  const [code, setCode]             = useState(SAMPLE)
  const [gadgetName, setGadgetName] = useState('カードガジェット')
  const [parseErr, setParseErr]     = useState<ParseError | null>(null)
  const [runtimeErr, setRuntimeErr] = useState<ParseError | null>(null)
  const [testedCode, setTestedCode] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [gadgets, setGadgets]       = useState<SavedGadget[]>(() => loadGadgets())
  const [confirmClear, setConfirmClear] = useState(false)
  const [installed, setInstalled]   = useState(false)

  const hasError   = parseErr !== null || runtimeErr !== null
  const canInstall = testedCode !== null && !hasError && gadgetName.trim().length > 0

  const handleTest = () => {
    const result = parseGadget(code)
    if (!result.ok) {
      const { message, errorType, stack, hint } = result
      setParseErr({ message, errorType, stack, hint })
      setRuntimeErr(null)
      setTestedCode(null)
      return
    }
    setParseErr(null)
    setRuntimeErr(null)
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
        <GlassCard size="sm" style={{ marginBottom: 16, textAlign: 'center' }}>
          <p style={{
            fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
            fontSize: 12, color: colors.text.secondary, margin: 0, lineHeight: 1.9,
          }}>
            🧪 ここではコードを実験できます。どんなエラーが起きても、アプリ全体は守られています。
          </p>
        </GlassCard>

        {/* AIプロンプトカード */}
        <PromptCard />

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
            {parseErr && (
              <ErrorPanel err={parseErr} label="構文エラーを発見しました" />
            )}
            {runtimeErr && (
              <ErrorPanel err={runtimeErr} label="実行中にエラーが起きました" />
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
                  onError={(e) => setRuntimeErr({
                    errorType: e.name || 'Error',
                    message:   e.message,
                    stack:     e.stack ?? '',
                    hint:      '実行中に予期しないエラーが起きました。',
                  })}
                >
                  <GadgetMount
                    code={testedCode}
                    onError={(detail) => setRuntimeErr(detail)}
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
