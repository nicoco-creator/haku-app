// ==UserScript==
// @name         Haku × Claude Bridge
// @namespace    https://github.com/nicoco-creator/haku-app
// @version      1.0.0
// @description  Haku AppのAIリクエストをClaude.aiで自動処理する
// @author       nicoco-creator
// @match        https://claude.ai/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

;(function () {
  'use strict'

  // ── 設定 ────────────────────────────────────────────────────────────────────
  const POLL_MS        = 500
  const STREAM_DONE_MS = 2_500   // レスポンスが2.5秒間変化しなければ完了とみなす
  const REQUEST_KEY    = 'ai_request'
  const RESPONSE_KEY   = 'ai_response'
  const HEARTBEAT_KEY  = 'ai_bridge_heartbeat'

  // ── 状態 ────────────────────────────────────────────────────────────────────
  let autoEnabled  = true
  let processing   = false
  let lastResLen   = 0
  let streamTimer  = null

  // ── UI バッジ ─────────────────────────────────────────────────────────────
  const badge = document.createElement('div')
  badge.id = 'haku-bridge-badge'
  Object.assign(badge.style, {
    position: 'fixed', top: '12px', right: '12px', zIndex: '99999',
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(28,26,46,0.92)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '20px', padding: '6px 14px',
    fontFamily: 'sans-serif', fontSize: '12px', color: '#F0EEF8',
    userSelect: 'none', cursor: 'default',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  })

  const statusDot = document.createElement('span')
  Object.assign(statusDot.style, {
    width: '8px', height: '8px', borderRadius: '50%',
    background: '#6A6480', display: 'inline-block', flexShrink: '0',
    transition: 'background 0.3s, box-shadow 0.3s',
  })

  const statusLabel = document.createElement('span')
  statusLabel.textContent = 'Haku Bridge'

  const toggleBtn = document.createElement('button')
  toggleBtn.textContent = '自動 ON'
  Object.assign(toggleBtn.style, {
    background: '#5B5CE633', border: '1px solid #5B5CE688',
    borderRadius: '10px', color: '#F0EEF8', cursor: 'pointer',
    fontSize: '11px', padding: '2px 10px', fontFamily: 'inherit',
  })
  toggleBtn.addEventListener('click', () => {
    autoEnabled = !autoEnabled
    toggleBtn.textContent = autoEnabled ? '自動 ON' : '自動 OFF'
    toggleBtn.style.background = autoEnabled ? '#5B5CE633' : 'rgba(255,255,255,0.08)'
    toggleBtn.style.borderColor = autoEnabled ? '#5B5CE688' : 'rgba(255,255,255,0.15)'
  })

  badge.appendChild(statusDot)
  badge.appendChild(statusLabel)
  badge.appendChild(toggleBtn)
  document.body.appendChild(badge)

  function setStatus(state) {
    const colors = { idle: '#6A6480', waiting: '#C8A050', done: '#4ADE80', error: '#E85B5B' }
    statusDot.style.background = colors[state] ?? colors.idle
    statusDot.style.boxShadow  = state === 'done' ? '0 0 6px #4ADE80'
                                : state === 'error' ? '0 0 6px #E85B5B'
                                : 'none'
  }

  // ── DOM helpers ──────────────────────────────────────────────────────────
  function getInputEl() {
    // Claude.ai は ProseMirror ベースの contenteditable div を使う
    return (
      document.querySelector('div[contenteditable="true"].ProseMirror') ??
      document.querySelector('div[contenteditable="true"][data-placeholder]') ??
      document.querySelector('div[contenteditable="true"]')
    )
  }

  function getSendBtn() {
    return (
      document.querySelector('button[aria-label="Send message"]') ??
      document.querySelector('button[aria-label="メッセージを送信"]') ??
      document.querySelector('button[data-testid="send-button"]') ??
      // フォールバック: disabled でない送信系ボタン
      [...document.querySelectorAll('button')].find(
        b => b.type === 'submit' || /send|送信/i.test(b.textContent + b.getAttribute('aria-label'))
      )
    )
  }

  function getLastResponseText() {
    // 最後の assistant メッセージのテキストを取得
    const messages = document.querySelectorAll(
      '[data-test-render-count], .font-claude-message, [class*="assistant"], [class*="claude-message"]'
    )
    if (!messages.length) return ''
    const last = messages[messages.length - 1]
    return last.innerText?.trim() ?? ''
  }

  // ── テキスト入力 ─────────────────────────────────────────────────────────
  function insertText(el, text) {
    el.focus()
    // ProseMirror は execCommand でなく、InputEvent が必要
    const sel = window.getSelection()
    if (sel) {
      sel.selectAllChildren(el)
      sel.collapseToEnd()
    }
    document.execCommand('selectAll')
    document.execCommand('insertText', false, text)
    // フォールバック: React の合成イベントを発火
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLElement.prototype, 'innerText'
    )
    if (nativeInputValueSetter?.set) nativeInputValueSetter.set.call(el, text)
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }))
  }

  // ── ストリーム完了検出 ────────────────────────────────────────────────────
  function watchStream(requestId, resolve) {
    const check = () => {
      const text = getLastResponseText()
      if (text.length !== lastResLen) {
        lastResLen = text.length
        clearTimeout(streamTimer)
        streamTimer = setTimeout(() => {
          // ストリームが止まった → 完了
          resolve(text)
        }, STREAM_DONE_MS)
      }
    }
    const obs = new MutationObserver(check)
    obs.observe(document.body, { childList: true, subtree: true, characterData: true })
    // 念のため最初にも確認
    setTimeout(check, 500)
    return obs
  }

  // ── メイン処理 ───────────────────────────────────────────────────────────
  async function processRequest(req) {
    if (processing || !autoEnabled) return
    processing = true
    setStatus('waiting')

    try {
      const inputEl = getInputEl()
      if (!inputEl) throw new Error('入力欄が見つかりません')

      insertText(inputEl, req.prompt)
      await new Promise(r => setTimeout(r, 300))

      const sendBtn = getSendBtn()
      if (!sendBtn || sendBtn.disabled) throw new Error('送信ボタンが見つかりません')
      sendBtn.click()

      // ストリーム完了を待つ
      lastResLen = 0
      const responseText = await new Promise((resolve, reject) => {
        const obs = watchStream(req.id, (text) => {
          obs.disconnect()
          resolve(text)
        })
        // 90秒タイムアウト
        setTimeout(() => {
          obs.disconnect()
          reject(new Error('response timeout'))
        }, 90_000)
      })

      localStorage.setItem(RESPONSE_KEY, JSON.stringify({
        id:        req.id,
        text:      responseText,
        status:    'done',
        timestamp: Date.now(),
      }))
      setStatus('done')
      setTimeout(() => setStatus('idle'), 3_000)

    } catch (err) {
      console.error('[Haku Bridge]', err)
      localStorage.setItem(RESPONSE_KEY, JSON.stringify({
        id:        req.id,
        text:      String(err),
        status:    'error',
        timestamp: Date.now(),
      }))
      setStatus('error')
      setTimeout(() => setStatus('idle'), 5_000)
    } finally {
      processing = false
    }
  }

  // ── ポーリングループ ──────────────────────────────────────────────────────
  setInterval(() => {
    // ハートビート送信
    localStorage.setItem(HEARTBEAT_KEY, String(Date.now()))

    if (!autoEnabled || processing) return

    const raw = localStorage.getItem(REQUEST_KEY)
    if (!raw) return
    try {
      const req = JSON.parse(raw)
      if (req.status !== 'pending') return

      // 既に応答済みなら無視
      const prevResp = localStorage.getItem(RESPONSE_KEY)
      if (prevResp) {
        const r = JSON.parse(prevResp)
        if (r.id === req.id) return
      }

      processRequest(req)
    } catch (_) { /* ignore */ }
  }, POLL_MS)

  console.log('[Haku Bridge] Claude bridge active ✓')
})()


// ============================================================================
// 以下: Gemini Bridge テンプレート（コメントアウト状態）
// ファイル名: gemini-bridge.user.js として別途保存して使う
// ============================================================================
/*
// ==UserScript==
// @name         Haku × Gemini Bridge
// @namespace    https://github.com/nicoco-creator/haku-app
// @version      1.0.0
// @description  Haku AppのAIリクエストをGeminiで自動処理する
// @author       nicoco-creator
// @match        https://gemini.google.com/*
// @match        https://aistudio.google.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

;(function () {
  'use strict'

  const POLL_MS        = 500
  const STREAM_DONE_MS = 2_500
  const REQUEST_KEY    = 'ai_request'
  const RESPONSE_KEY   = 'ai_response'
  const HEARTBEAT_KEY  = 'ai_bridge_heartbeat'

  let autoEnabled = true
  let processing  = false

  // Gemini の入力欄セレクタ（変更される可能性あり）
  function getInputEl() {
    return (
      document.querySelector('div[contenteditable="true"].ql-editor') ??
      document.querySelector('rich-textarea div[contenteditable="true"]') ??
      document.querySelector('div[contenteditable="true"]')
    )
  }

  function getSendBtn() {
    return (
      document.querySelector('button[aria-label="Send message"]') ??
      document.querySelector('button[data-test-id="send-button"]') ??
      document.querySelector('button[jsname="Qxe3md"]') ??
      [...document.querySelectorAll('button')].find(b =>
        /send|送信/i.test(b.textContent + b.getAttribute('aria-label'))
      )
    )
  }

  function getLastResponseText() {
    const msgs = document.querySelectorAll(
      '.model-response-text, .response-container, [class*="model"], message-content'
    )
    if (!msgs.length) return ''
    return msgs[msgs.length - 1].innerText?.trim() ?? ''
  }

  // ── 以下 claude-bridge.user.js と同じロジック ──────────────────────────
  // insertText / watchStream / processRequest / polling loop
  // （claude-bridge から必要部分をコピーして selector を調整する）
  // ──────────────────────────────────────────────────────────────────────────

  setInterval(() => {
    localStorage.setItem(HEARTBEAT_KEY, String(Date.now()))
  }, POLL_MS)

  console.log('[Haku Bridge] Gemini bridge active ✓')
})()
*/
