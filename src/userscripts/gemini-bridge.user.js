// ==UserScript==
// @name         Haku AI Bridge (Gemini)
// @namespace    https://github.com/nicoco-creator/haku-app
// @version      2.0.0
// @description  Haku AppのAIリクエストをGemini.google.comで自動処理するブリッジ
// @author       nicoco-creator
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

;(function () {
  'use strict'

  // ── Constants ────────────────────────────────────────────────────────────────

  const POLL_MS       = 500
  const REQUEST_KEY   = 'ai_request'
  const RESPONSE_KEY  = 'ai_response'
  const HEARTBEAT_KEY = 'ai_bridge_heartbeat'
  const MAX_LOGS      = 30

  // ── State ─────────────────────────────────────────────────────────────────────

  let autoEnabled = true
  let processing  = false
  const logs      = []

  // ── Badge UI ──────────────────────────────────────────────────────────────────

  const badge = document.createElement('div')
  badge.id = 'haku-bridge-badge'
  Object.assign(badge.style, {
    position: 'fixed', top: '12px', right: '12px', zIndex: '2147483647',
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(20,18,40,0.92)', backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px',
    padding: '6px 12px', fontFamily: '"Google Sans",system-ui,sans-serif',
    fontSize: '12px', color: '#F0EEF8', userSelect: 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    transition: 'opacity 0.3s',
  })

  const dot = document.createElement('span')
  Object.assign(dot.style, {
    width: '8px', height: '8px', borderRadius: '50%', flexShrink: '0',
    background: '#4ADE80', transition: 'background 0.3s, box-shadow 0.3s',
    display: 'inline-block',
  })

  const label = document.createElement('span')
  label.textContent = 'Haku Bridge'
  label.style.fontSize = '12px'

  const logBtn = document.createElement('button')
  logBtn.textContent = 'ログ'
  Object.assign(logBtn.style, {
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '8px', color: '#A89FC0', cursor: 'pointer',
    fontSize: '10px', padding: '2px 8px', fontFamily: 'inherit',
  })

  const toggleBtn = document.createElement('button')
  toggleBtn.textContent = '自動 ON'
  Object.assign(toggleBtn.style, {
    background: '#5B5CE620', border: '1px solid #5B5CE660',
    borderRadius: '8px', color: '#F0EEF8', cursor: 'pointer',
    fontSize: '10px', padding: '2px 8px', fontFamily: 'inherit',
    transition: 'background 0.2s',
  })

  badge.append(dot, label, logBtn, toggleBtn)
  document.body.appendChild(badge)

  // ── Log panel ─────────────────────────────────────────────────────────────────

  const logPanel = document.createElement('div')
  Object.assign(logPanel.style, {
    display: 'none', position: 'fixed', top: '46px', right: '12px',
    zIndex: '2147483646', width: '340px', maxHeight: '200px', overflowY: 'auto',
    background: 'rgba(14,12,32,0.96)', backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
    padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px',
    color: '#A89FC0', lineHeight: '1.7',
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
  })
  document.body.appendChild(logPanel)

  let logPanelOpen = false
  logBtn.addEventListener('click', () => {
    logPanelOpen = !logPanelOpen
    logPanel.style.display = logPanelOpen ? 'block' : 'none'
  })

  toggleBtn.addEventListener('click', () => {
    autoEnabled = !autoEnabled
    toggleBtn.textContent = autoEnabled ? '自動 ON' : '自動 OFF'
    toggleBtn.style.background  = autoEnabled ? '#5B5CE620' : 'rgba(255,255,255,0.05)'
    toggleBtn.style.borderColor = autoEnabled ? '#5B5CE660' : 'rgba(255,255,255,0.15)'
    setStatus(autoEnabled ? 'idle' : 'paused')
  })

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function setStatus(state) {
    const map = {
      idle:       { color: '#4ADE80', shadow: '0 0 6px #4ADE8088', text: 'Haku Bridge' },
      processing: { color: '#C8A050', shadow: '0 0 6px #C8A05088', text: '処理中…'    },
      error:      { color: '#E85B5B', shadow: '0 0 6px #E85B5B88', text: 'エラー'      },
      paused:     { color: '#6A6480', shadow: 'none',               text: '停止中'      },
    }
    const s = map[state] ?? map.idle
    dot.style.background = s.color
    dot.style.boxShadow  = s.shadow
    label.textContent    = s.text
  }

  function addLog(msg) {
    const time = new Date().toLocaleTimeString('ja-JP', { hour12: false })
    const line = `[${time}] ${msg}`
    logs.unshift(line)
    if (logs.length > MAX_LOGS) logs.pop()
    logPanel.textContent = logs.join('\n')
    console.log('[Haku Bridge Gemini]', msg)
  }

  const delay = ms => new Promise(r => setTimeout(r, ms))

  async function waitUntil(check, timeoutMs, label_) {
    const deadline = Date.now() + timeoutMs
    while (true) {
      if (check()) return
      if (Date.now() >= deadline) throw new Error(`タイムアウト: ${label_}`)
      await delay(300)
    }
  }

  // ── Gemini DOM selectors ──────────────────────────────────────────────────────
  //
  // Gemini uses a rich-textarea web component wrapping a div[contenteditable].
  // The Angular Material send button lives inside a mat-icon-button.
  // NOTE: Google frequently renames classes/attributes; fallback chains are wide.

  function getInputEl() {
    return (
      // Primary: rich-textarea custom element's inner contenteditable
      document.querySelector('rich-textarea div[contenteditable="true"]')        ??
      // Quill editor (used in some Gemini Advanced views)
      document.querySelector('div.ql-editor[contenteditable="true"]')            ??
      // Generic fallback
      document.querySelector('div[contenteditable="true"][data-placeholder]')    ??
      document.querySelector('div[contenteditable="true"]')
    )
  }

  function getSendBtn() {
    // Gemini send button patterns (order: most specific → least)
    const byLabel = document.querySelector(
      'button[aria-label="Send message"], button[aria-label="メッセージを送信"],' +
      'button[aria-label="Submit"], button[aria-label="送信"]'
    )
    if (byLabel && !byLabel.disabled) return byLabel

    // mat-icon-button that contains a "send" icon
    const matBtns = [...document.querySelectorAll('button[mat-icon-button], button.mat-mdc-icon-button')]
    const sendMat = matBtns.find(b =>
      !b.disabled && /send/i.test(b.querySelector('mat-icon, .material-icons')?.textContent ?? '')
    )
    if (sendMat) return sendMat

    // data-test-id patterns
    const byTest = document.querySelector(
      '[data-test-id="send-button"], [jsname="Qxe3md"]'
    )
    if (byTest && !byTest.disabled) return byTest

    return null
  }

  function isStreamingActive() {
    // Gemini shows a stop button or a pulsing loading indicator while generating
    return !!(
      document.querySelector('button[aria-label="Stop generating"]')            ||
      document.querySelector('button[aria-label="生成を停止"]')                 ||
      document.querySelector('button[aria-label="Stop response"]')              ||
      document.querySelector('[data-test-id="stop-button"]')                    ||
      // Loading spinner mat-progress-spinner inside a response turn
      document.querySelector('response-container .loading, model-response .loading') ||
      document.querySelector('mat-progress-spinner[mode="indeterminate"]')
    )
  }

  function getMessageCount() {
    return Math.max(
      document.querySelectorAll('model-response').length,
      document.querySelectorAll('.model-response-text').length,
      document.querySelectorAll('ms-chat-turn').length,
      document.querySelectorAll('[data-test-id="response"]').length,
    )
  }

  function getLastAssistantMessage() {
    // Try selectors in order of preference — Gemini response containers
    for (const sel of [
      'model-response .markdown',
      '.model-response-text',
      'model-response message-content',
      'ms-chat-turn .response-content',
      '[data-test-id="response"] .markdown',
      'response-container .response-text',
    ]) {
      const els = document.querySelectorAll(sel)
      if (els.length) {
        const text = els[els.length - 1].innerText?.trim()
        if (text) return text
      }
    }
    // Wide fallback: any substantial text block after the last user message
    const allTurns = document.querySelectorAll('ms-chat-turn, .conversation-turn')
    if (allTurns.length) {
      const last = allTurns[allTurns.length - 1]
      const text = last.innerText?.trim()
      if (text) return text
    }
    return ''
  }

  // ── Text insertion (Gemini's contenteditable) ─────────────────────────────────
  //
  // Gemini may use Quill (ql-editor) or a plain contenteditable.
  // execCommand('insertText') is the safest cross-framework approach.
  // If that fails, we dispatch a ClipboardEvent (paste) as a fallback.

  function insertPrompt(el, text) {
    el.focus()
    // Clear existing content
    document.execCommand('selectAll')

    const ok = document.execCommand('insertText', false, text)
    if (!ok) {
      // Fallback A: native setter + input event
      try {
        const setter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText')
        if (setter?.set) setter.set.call(el, text)
      } catch (_) {
        el.innerText = text
      }
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true, cancelable: true,
        data: text, inputType: 'insertText',
      }))
    }

    // Fallback B: paste event (triggers Quill's paste handler)
    const dt = new DataTransfer()
    dt.setData('text/plain', text)
    el.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true, cancelable: true, clipboardData: dt,
    }))

    el.dispatchEvent(new Event('input', { bubbles: true }))
  }

  // ── Core processing ───────────────────────────────────────────────────────────

  async function processRequest(req) {
    if (processing || !autoEnabled) return
    processing = true
    setStatus('processing')
    const t0 = Date.now()
    addLog(`リクエスト受信 [${req.id.slice(0, 8)}…]`)

    try {
      // 1. Get input element — retry up to 3 times, 5s apart
      let inputEl = null
      for (let attempt = 0; attempt < 3; attempt++) {
        inputEl = getInputEl()
        if (inputEl) break
        addLog(`入力欄が見つかりません — 5秒後に再試行 (${attempt + 1}/3)`)
        await delay(5_000)
      }
      if (!inputEl) throw new Error('入力欄が3回試行後も見つかりませんでした')

      // 2. Insert prompt
      insertPrompt(inputEl, req.prompt)
      addLog('プロンプトを挿入しました')
      await delay(500)  // Gemini needs a bit more time to register input

      // 3. Get send button — brief retry if not yet enabled
      let sendBtn = getSendBtn()
      if (!sendBtn || sendBtn.disabled) {
        await delay(1_500)
        sendBtn = getSendBtn()
      }
      if (!sendBtn) throw new Error('送信ボタンが見つかりません')
      if (sendBtn.disabled) throw new Error('送信ボタンが無効状態です（入力が反映されていない可能性）')

      // 4. Record state before sending
      const countBefore = getMessageCount()

      // 5. Send
      sendBtn.click()
      addLog('送信しました — 応答を待機中…')

      // 6. Wait for response to start (new model-response appeared OR stop button visible)
      await waitUntil(
        () => getMessageCount() > countBefore || isStreamingActive(),
        12_000,
        '応答開始 (12秒)'
      )
      addLog('応答ストリーミング開始')

      // 7. Wait for streaming to end — 60s timeout
      await waitUntil(
        () => !isStreamingActive(),
        60_000,
        '応答完了 (60秒)'
      )
      await delay(600)  // Gemini does a brief post-stream render pass

      // 8. Extract response text
      const text = getLastAssistantMessage()
      if (!text) throw new Error('応答テキストを取得できませんでした')

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
      addLog(`完了 (${elapsed}s) — ${text.length}文字`)

      // 9. Write response
      localStorage.setItem(RESPONSE_KEY, JSON.stringify({
        id: req.id, text, status: 'done', timestamp: Date.now(),
      }))

      // 10. Mark request processed
      localStorage.setItem(REQUEST_KEY, JSON.stringify({ ...req, status: 'processed' }))

      setStatus('idle')

    } catch (err) {
      const msg = String(err?.message ?? err)
      addLog(`エラー: ${msg}`)
      localStorage.setItem(RESPONSE_KEY, JSON.stringify({
        id: req.id, text: msg, status: 'error', timestamp: Date.now(),
      }))
      localStorage.setItem(REQUEST_KEY, JSON.stringify({ ...req, status: 'processed' }))
      setStatus('error')
      setTimeout(() => setStatus(autoEnabled ? 'idle' : 'paused'), 5_000)
    } finally {
      processing = false
    }
  }

  // ── Polling loop ──────────────────────────────────────────────────────────────

  setInterval(() => {
    localStorage.setItem(HEARTBEAT_KEY, String(Date.now()))
    if (!autoEnabled || processing) return

    const raw = localStorage.getItem(REQUEST_KEY)
    if (!raw) return

    try {
      const req = JSON.parse(raw)
      if (req.status !== 'pending') return

      // Skip if we already responded to this request id
      const prevRaw = localStorage.getItem(RESPONSE_KEY)
      if (prevRaw) {
        try {
          if (JSON.parse(prevRaw).id === req.id) return
        } catch (_) { /* ignore */ }
      }

      void processRequest(req)
    } catch (_) { /* ignore malformed JSON */ }
  }, POLL_MS)

  // ── Init ──────────────────────────────────────────────────────────────────────

  setStatus('idle')
  addLog('Gemini Bridge 起動 ✓ — リクエストを待機中')
  console.log('[Haku Bridge] Gemini bridge v2.0 active ✓')
})()
