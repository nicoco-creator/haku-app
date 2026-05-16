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

export type ParseResult =
  | { ok: true; options: GadgetOptions }
  | { ok: false; error: string }

// ── Parser ────────────────────────────────────────────────────────────────────

export function parseGadget(code: string): ParseResult {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const factory = new Function(`return (${code.trim()})`)
    const options = factory() as GadgetOptions
    if (!options || typeof options !== 'object') {
      return { ok: false, error: 'オブジェクトリテラルを返す必要があります' }
    }
    if (typeof options.template !== 'string' || !options.template.trim()) {
      return { ok: false, error: 'template プロパティ（文字列）が必要です' }
    }
    return { ok: true, options }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── Mini-VM ───────────────────────────────────────────────────────────────────

export class GadgetRuntime {
  private options: GadgetOptions
  private container: HTMLElement
  private state: Record<string, unknown>
  private proxy: Record<string, unknown>
  private destroyed = false

  constructor(options: GadgetOptions, container: HTMLElement) {
    this.options = options
    this.container = container

    let rawState: Record<string, unknown> = {}
    if (typeof options.data === 'function') {
      rawState = (options.data() as Record<string, unknown>) ?? {}
    }
    this.state = rawState

    // Proxy triggers re-render on set (this.xxx = value in methods)
    const self = this
    this.proxy = new Proxy(this.state, {
      get(_target, key: string) {
        return self.state[key]
      },
      set(_target, key: string, value) {
        self.state[key] = value
        if (!self.destroyed) self.render()
        return true
      },
    })

    this.render()
  }

  private interpolate(template: string): string {
    // {{ varName }} and {{ this.varName }}
    return template.replace(/\{\{\s*(?:this\.)?(\w[\w.]*)\s*\}\}/g, (_, key) => {
      const val = this.state[key]
      return val !== undefined && val !== null ? String(val) : ''
    })
  }

  render(): void {
    // 1. Interpolate {{ variables }}
    let html = this.interpolate(this.options.template)

    // 2. Replace @event="method" → data-ev-event="method" so innerHTML is valid
    html = html.replace(/@([\w:.-]+)="([^"]+)"/g, (_, event, handler) => {
      return `data-ev-${event}="${handler}"`
    })

    this.container.innerHTML = html

    // 3. Bind events after DOM is written
    this.container.querySelectorAll<HTMLElement>('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        if (!attr.name.startsWith('data-ev-')) continue
        const event = attr.name.slice('data-ev-'.length)
        const handlerName = attr.value.trim()
        const method = this.options.methods?.[handlerName]
        if (typeof method === 'function') {
          el.addEventListener(event, (e) => {
            e.preventDefault()
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
