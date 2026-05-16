// ── Types ─────────────────────────────────────────────────────────────────────

export interface GadgetOptions {
  template: string
  data?: () => Record<string, unknown>
  methods?: Record<string, (...args: unknown[]) => unknown>
}

export interface SavedGadget {
  id: string
  name: string
  code: string
  createdAt: string
}

export interface ParseError {
  message:   string
  errorType: string   // SyntaxError / TypeError / etc.
  stack:     string
  hint:      string   // pattern-matched human hint
}

export type ParseResult =
  | { ok: true; options: GadgetOptions }
  | { ok: false } & ParseError

// ── Parser ────────────────────────────────────────────────────────────────────

function hintFor(name: string, msg: string): string {
  if (/unexpected token/i.test(msg))
    return 'テンプレート文字列（バッククォート）の閉じ忘れ、カンマの付け忘れ、または対応する括弧の不一致が多いです。'
  if (/is not defined/i.test(msg))
    return 'タイポか、data() で定義していない変数名を template や methods で使っています。'
  if (/is not a function/i.test(msg))
    return '@click に指定したメソッド名が methods に存在しないか、スペルが違う可能性があります。'
  if (/cannot read prop/i.test(msg) || /cannot read properties/i.test(msg))
    return 'undefined / null のプロパティを読もうとしています。data() の初期値を確認してください。'
  if (/unterminated/i.test(msg))
    return '文字列またはテンプレートリテラルが閉じられていません。'
  if (name === 'RangeError')
    return '無限再帰または配列の範囲外アクセスが起きています。'
  return 'コードを見直して、もう一度テスト実行してみてください。'
}

export function parseGadget(code: string): ParseResult {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const factory = new Function(`return (${code.trim()})`)
    const options = factory() as GadgetOptions
    if (!options || typeof options !== 'object') {
      return {
        ok: false,
        errorType: 'ValidationError',
        message: 'オブジェクトリテラルを返す必要があります',
        stack: '',
        hint: 'コード全体を { ... } で囲んだオブジェクト形式で記述してください。',
      }
    }
    if (typeof options.template !== 'string' || !options.template.trim()) {
      return {
        ok: false,
        errorType: 'ValidationError',
        message: 'template プロパティ（文字列）が必要です',
        stack: '',
        hint: 'template: `<div>...</div>` のように template キーを追加してください。',
      }
    }
    return { ok: true, options }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    return {
      ok: false,
      errorType: err.name || 'Error',
      message: err.message,
      stack: err.stack ?? '',
      hint: hintFor(err.name, err.message),
    }
  }
}

// ── Mini-VM ───────────────────────────────────────────────────────────────────

export class GadgetRuntime {
  private options:       GadgetOptions
  private container:     HTMLElement
  private state:         Record<string, unknown>
  private privateState:  Record<string, unknown>  // $$ prefix — no re-render
  private proxy:         Record<string, unknown>
  private destroyed      = false
  private renderPending  = false                  // batch flag

  constructor(options: GadgetOptions, container: HTMLElement) {
    this.options      = options
    this.container    = container
    this.privateState = {}

    let rawState: Record<string, unknown> = {}
    if (typeof options.data === 'function') {
      rawState = (options.data() as Record<string, unknown>) ?? {}
    }
    this.state = rawState

    const self = this
    this.proxy = new Proxy(this.state, {
      get(_target, key: string) {
        // $$ prefix → non-reactive private storage (AudioContext, timers, etc.)
        if (typeof key === 'string' && key.startsWith('$$')) return self.privateState[key]
        return self.state[key]
      },
      set(_target, key: string, value) {
        if (typeof key === 'string' && key.startsWith('$$')) {
          self.privateState[key] = value
          return true  // no re-render
        }
        self.state[key] = value
        // Batch: re-render once after all synchronous assignments finish
        if (!self.destroyed && !self.renderPending) {
          self.renderPending = true
          queueMicrotask(() => {
            self.renderPending = false
            if (!self.destroyed) self.render()
          })
        }
        return true
      },
    })

    this.render()
  }

  private interpolate(template: string): string {
    return template.replace(/\{\{\s*(?:this\.)?(\w[\w.]*)\s*\}\}/g, (_, key) => {
      const val = this.state[key]
      return val !== undefined && val !== null ? String(val) : ''
    })
  }

  render(): void {
    // 1. Interpolate {{ variables }}
    let html = this.interpolate(this.options.template)

    // 2. @event="method" or @event="method()" → data-ev-event="method"
    html = html.replace(/@([\w:.-]+)="([^"]+)"/g, (_, event, handler) => {
      return `data-ev-${event}="${handler}"`
    })

    this.container.innerHTML = html

    // 3. Bind events — strip () and args so "play()" → "play"
    this.container.querySelectorAll<HTMLElement>('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        if (!attr.name.startsWith('data-ev-')) continue
        const event       = attr.name.slice('data-ev-'.length)
        const rawName     = attr.value.trim()
        // Normalize: "doThing()" → "doThing", "doThing(arg)" → "doThing"
        const handlerName = rawName.replace(/\(.*\)$/, '').trim()
        const method      = this.options.methods?.[handlerName]
        if (typeof method === 'function') {
          // NOTE: no preventDefault — let the browser treat this as a user gesture
          //       (required for AudioContext, fullscreen, clipboard, etc.)
          el.addEventListener(event, (e) => {
            try {
              method.call(this.proxy, e)
            } catch (err) {
              console.error('[GadgetRuntime] method error:', err)
            }
          })
        }
      }
    })
  }

  destroy(): void {
    this.destroyed = true
    this.container.innerHTML = ''
  }
}

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'haku_user_gadgets'

export function loadGadgets(): SavedGadget[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedGadget[]) : []
  } catch {
    return []
  }
}

export function saveGadget(gadget: Omit<SavedGadget, 'id' | 'createdAt'>): SavedGadget {
  const all = loadGadgets()
  const newG: SavedGadget = {
    ...gadget,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  all.push(newG)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  return newG
}

export function deleteGadget(id: string): void {
  const all = loadGadgets().filter((g) => g.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function clearAllGadgets(): void {
  localStorage.removeItem(STORAGE_KEY)
}
