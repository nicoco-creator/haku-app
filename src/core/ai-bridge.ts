/**
 * AI Bridge — localStorage経由でUserscriptとメッセージをやり取りする。
 *
 * ⚠️  VAULT ISOLATION: このファイルは src/modules/vault/* から絶対にimportしないこと。
 *     「裁かない倉庫」モジュールのデータはAIに渡さない（CLAUDE.md 絶対制約）。
 *     ESLintルール（no-restricted-imports）でも強制している。
 */

import { FUSHIGI_PROTOCOL } from './protocol'

export type AIService = 'claude' | 'gemini' | 'chatgpt'

export interface AIRequest {
  id: string
  prompt: string
  service: AIService
  status: 'pending'
  timestamp: number
}

export interface AIResponse {
  id: string
  text: string
  status: 'done' | 'error'
  timestamp: number
}

const POLL_INTERVAL_MS = 500
const TIMEOUT_MS       = 300_000  // 5 min — manual overlay provides recovery before this fires
const REQUEST_KEY      = 'ai_request'
const RESPONSE_KEY     = 'ai_response'

export function askAI(
  prompt: string,
  options?: { service?: AIService; skipProtocol?: boolean }
): Promise<string> {
  // Runtime vault isolation: /vault pages must never reach the AI.
  if (typeof window !== 'undefined' && window.location.pathname.includes('/vault')) {
    return Promise.reject(new Error('⛔ askAI は /vault から呼び出せません — Vault Isolation Policy'))
  }

  const service      = options?.service ?? 'claude'
  const skipProtocol = options?.skipProtocol ?? false

  const fullPrompt = skipProtocol
    ? prompt
    : `${FUSHIGI_PROTOCOL}\n\n---\n\n${prompt}`

  const request: AIRequest = {
    id:        crypto.randomUUID(),
    prompt:    fullPrompt,
    service,
    status:    'pending',
    timestamp: Date.now(),
  }

  localStorage.setItem(REQUEST_KEY, JSON.stringify(request))

  return new Promise<string>((resolve, reject) => {
    const startedAt = Date.now()

    const tick = () => {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        reject(new Error('AI bridge timeout (60s) — Userscriptが応答しませんでした'))
        return
      }

      const raw = localStorage.getItem(RESPONSE_KEY)
      if (raw) {
        try {
          const resp: AIResponse = JSON.parse(raw)
          if (resp.id === request.id) {
            if (resp.status === 'done') {
              resolve(resp.text)
              return
            }
            if (resp.status === 'error') {
              reject(new Error(`AI bridge error: ${resp.text}`))
              return
            }
          }
        } catch {
          // malformed JSON — keep polling
        }
      }

      setTimeout(tick, POLL_INTERVAL_MS)
    }

    setTimeout(tick, POLL_INTERVAL_MS)
  })
}

/** 手動でレスポンスを書き込む（AIBridgeOverlay から呼ぶ） */
export function writeManualResponse(
  requestId: string,
  text:      string,
  status:    'done' | 'error' = 'done',
): void {
  const resp: AIResponse = {
    id:        requestId,
    text,
    status,
    timestamp: Date.now(),
  }
  localStorage.setItem(RESPONSE_KEY, JSON.stringify(resp))
}

/** 現在のペンディングリクエストを返す（UI表示用）
 *  ai_response に同じIDの回答が既にある場合は null を返す（処理済みと見なす）
 */
export function getPendingRequest(): AIRequest | null {
  const raw = localStorage.getItem(REQUEST_KEY)
  if (!raw) return null
  try {
    const r: AIRequest = JSON.parse(raw)
    if (r.status !== 'pending') return null
    // If a matching response is already in storage, the request is effectively done
    const respRaw = localStorage.getItem(RESPONSE_KEY)
    if (respRaw) {
      try {
        const resp: AIResponse = JSON.parse(respRaw)
        if (resp.id === r.id) return null
      } catch { /* ignore */ }
    }
    return r
  } catch {
    return null
  }
}

/** 最後のレスポンスを返す（UI表示用） */
export function getLastResponse(): AIResponse | null {
  const raw = localStorage.getItem(RESPONSE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AIResponse
  } catch {
    return null
  }
}
