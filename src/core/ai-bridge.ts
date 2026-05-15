/**
 * AI Bridge — 「魔法のボタン」方式
 *
 * 仕組み：
 *   1. openAIChat(prompt) でClaudeタブを開き、プロンプトをクリップボードにコピー
 *   2. ユーザーがClaudeで回答をコピーしてアプリに戻る
 *   3. readResponseFromClipboard() でクリップボードを読む
 *
 * askAI(prompt) は他モジュール（study/emotion/journal/waiting）との互換シムとして残し、
 * 内部でopenAIChat() + AIBridgePanel（グローバルUI）に委譲する。
 *
 * ⚠️ VAULT ISOLATION: このファイルは src/modules/vault/* から絶対にimportしないこと。
 */

import { FUSHIGI_PROTOCOL } from './protocol'

export type AIService = 'claude' | 'gemini' | 'chatgpt'

// ── 1. タブを開く + クリップボードにコピー ────────────────────────────────────

/**
 * AIサービスの新しいタブでプロンプトを開く。
 * - URLの ?q= パラメータでプロンプトを渡す（対応していない場合もあるがベストエフォート）
 * - 同時にクリップボードにもコピーする（iOS Safariでの貼り付け対応）
 */
export function openAIChat(prompt: string, service: AIService = 'claude'): void {
  // クリップボードコピー（失敗してもサイレント）
  navigator.clipboard.writeText(prompt).catch(() => {})

  const encoded = encodeURIComponent(prompt)
  const url =
    service === 'gemini'
      ? `https://gemini.google.com/app?q=${encoded}`
      : `https://claude.ai/new?q=${encoded}`

  window.open(url, '_blank', 'noopener')
}

// ── 2. クリップボードから回答を読む ──────────────────────────────────────────

/**
 * クリップボードのテキストを返す。
 * iOS Safari 13.4以降で動作。失敗時はthrowするので呼び出し元でcatchすること。
 */
export async function readResponseFromClipboard(): Promise<string> {
  const text = await navigator.clipboard.readText()
  if (!text.trim()) throw new Error('クリップボードが空です')
  return text.trim()
}

// ── 3. グローバルな保留状態（askAI互換シム用） ───────────────────────────────

interface AIPending {
  id:      string
  prompt:  string
  service: AIService
  resolve: (text: string) => void
  reject:  (err: Error)   => void
}

let _pending: AIPending | null = null
const _listeners               = new Set<() => void>()

function _notify() {
  _listeners.forEach(fn => fn())
}

/** AIBridgePanelがsubscribeするためのhook */
export function subscribeAI(fn: () => void): () => void {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

export interface AIPendingInfo {
  id:      string
  prompt:  string
  service: AIService
}

/** 現在保留中のリクエストを返す（AIBridgePanel 用） */
export function getPendingAI(): AIPendingInfo | null {
  if (!_pending) return null
  return { id: _pending.id, prompt: _pending.prompt, service: _pending.service }
}

/** AIBridgePanelから呼ぶ：貼り付けた回答でPromiseを解決する */
export function submitAIResponse(text: string): void {
  if (!_pending) return
  const { resolve } = _pending
  _pending = null
  _notify()
  resolve(text)
}

/** AIBridgePanelから呼ぶ：キャンセルしてPromiseを棄却する */
export function cancelAIRequest(): void {
  if (!_pending) return
  const { reject } = _pending
  _pending = null
  _notify()
  reject(new Error('キャンセルされました'))
}

// ── 4. askAI — 既存モジュール用互換シム ──────────────────────────────────────

/**
 * study / emotion / journal / waiting モジュールが使う互換API。
 * 内部で openAIChat() を呼んでClaudeタブを開き、
 * グローバルな AIBridgePanel がユーザーの貼り付けを待ってPromiseを解決する。
 *
 * companion モジュールはこの関数を使わず openAIChat() を直接呼ぶこと。
 */
export function askAI(
  prompt:   string,
  options?: { service?: AIService; skipProtocol?: boolean },
): Promise<string> {
  if (typeof window !== 'undefined' && window.location.pathname.includes('/vault')) {
    return Promise.reject(
      new Error('⛔ askAI は /vault から呼び出せません — Vault Isolation Policy'),
    )
  }

  const service      = options?.service      ?? 'claude'
  const skipProtocol = options?.skipProtocol ?? false
  const fullPrompt   = skipProtocol
    ? prompt
    : `${FUSHIGI_PROTOCOL}\n\n---\n\n${prompt}`

  // Claudeタブを開いてクリップボードにもコピー
  openAIChat(fullPrompt, service)

  // 前のリクエストをキャンセル
  if (_pending) {
    _pending.reject(new Error('新しいリクエストで上書きされました'))
  }

  // AIBridgePanelが submitAIResponse() を呼ぶまで待機
  return new Promise<string>((resolve, reject) => {
    _pending = { id: crypto.randomUUID(), prompt: fullPrompt, service, resolve, reject }
    _notify()
  })
}
