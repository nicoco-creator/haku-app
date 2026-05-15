// ==UserScript==
// @name         Haku AI Bridge (Gemini)
// @namespace    https://github.com/nicoco-creator/haku-app
// @version      3.0.0
// @description  Haku AppのAIリクエストをGemini.google.comで自動処理するブリッジ (GM storageリレー対応)
// @author       nicoco-creator
// @match        https://gemini.google.com/*
// @match        https://nicoco-creator.github.io/haku-app/*
// @match        http://localhost:5173/*
// @grant        GM.getValue
// @grant        GM.setValue
// @run-at       document-idle
// ==/UserScript==

;(function () {
  'use strict'

  // ── Constants ────────────────────────────────────────────────────────────────

  const POLL_MS       = 500
  const REQUEST_KEY   = 'ai_request'
  const RESPONSE_KEY  = 'ai_response'
  const HEARTBEAT_KEY = 'ai_bridge_heartbeat'
  const GM_REQ_KEY    = 'haku_gemini_request'
  const GM_RESP_KEY   = 'haku_gemini_response'
  const SERVICE       = 'gemini'
  const MAX_LOGS      = 30

  // ── Mode detection ────────────────────────────────────────────────────────────
  // IS_BRIDGE = running on gemini.google.com; IS_RELAY = running on haku-app

  const IS_BRIDGE = location.hostname.includes('gemini.google.com')

  // ── State ─────────────────────────────────────────────────────────────────────

  let autoEnabled   = true
  let processing    = false
  let lastRelayedId = null   // relay: last request ID relayed to GM
  let lastWrittenId = null   // relay: last response ID written back to localStorage
  const logs        = []

  // ── Badge UI ──────────────────────────────────────────────────────────────────

  const badge = document.createElement('div')
  badge.id = 'haku-bridge-badge'
  Object.assign(badge.style, {
    position: 'fixed', zIndex: '2147483647',
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(20,18,40,0.92)', backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px',
    padding: '6px 12px', fontFamily: '"Google Sans",system-ui,sans-serif',
    fontSize: '12px', color: '#F0EEF8', userSelect: 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)', transition: 'opacity 0.3s',
  })

  if (IS_BRIDGE) {
    Object.assign(badge.style, { top: '12px', right: '12px' })
  } else {
    // Relay mode: bottom-left, semi-transparent so it doesn't interfere with app UI
    Object.assign(badge.style, { bottom: '12px', left: '12px', opacity: '0.8' })
    badge.title = 'クリックで非表示'
    badge.style.cursor = 'pointer'
    badge.addEventListener('click', () => { badge.style.display = 'none' })
  }

  const dot = document.createElement('span')
  Object.assign(dot.style, {
    width: '8px', height: '8px', borderRadius: '50%', flexShrink: '0',
    background: '#4ADE80', transition: 'background 0.3s, box-shadow 0.3s',
    display: 'inline-block',
  })

  const label = document.createElement('span')
  label.textContent = IS_BRIDGE ? 'Haku Bridge' : 'Haku Relay'
  label.style.fontSize = '12px'

  badge.append(dot, label)

  // Bridge mode: log button + auto toggle
  let logPanel = null

  if (IS_BRIDGE) {
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

    badge.append(logBtn, toggleBtn)

    logPanel = document.createElement('div')
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
  }

  document.body.appendChild(badge)

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function setStatus(state) {
    const map = {
      idle:       { color: '#4ADE80', shadow: '0 0 6px #4ADE8088', text: IS_BRIDGE ? 'Haku Bridge' : 'Haku Relay' },
      relaying:   { color: '#A8C8E8', shadow: '0 0 6px #A8C8E888', text: 'リレー中…'  },
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
    if (logPanel) logPanel.textContent = logs.join('\n')
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

  // ── Bridge mode: process one request ─────────────────────────────────────────

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
        15_000, '応答開始 (15秒)'
      )
      addLog('応答開始 — 生成完了を待機中…')

      // 7. Wait for generation to finish.
      // Primary: streaming indicator disappears + text stable for ~0.9s
      // Fallback: text unchanged for ~2.1s (works even when streaming indicator is undetectable)
      let prevStableText = ''
      let stableCount    = 0
      await waitUntil(() => {
        const streaming = isStreamingActive()
        const text      = getLastAssistantMessage()
        if (!text) { prevStableText = ''; stableCount = 0; return false }
        if (text === prevStableText) {
          stableCount++
          if (!streaming && stableCount >= 3) return true  // ~0.9s stable + no streaming
          if (stableCount >= 7)               return true  // ~2.1s stable fallback
        } else {
          prevStableText = text
          stableCount    = 0
        }
        return false
      }, 90_000, '応答完了 (90秒)')
      await delay(300)

      // 8. Extract response text
      const text = getLastAssistantMessage()
      if (!text) throw new Error('応答テキストを取得できませんでした')

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
      addLog(`完了 (${elapsed}s) — ${text.length}文字`)

      // 9. Write response and mark request processed via GM storage (cross-origin relay)
      await GM.setValue(GM_RESP_KEY, JSON.stringify({
        id: req.id, text, status: 'done', timestamp: Date.now(),
      }))
      await GM.setValue(GM_REQ_KEY, JSON.stringify({ ...req, status: 'processed' }))

      setStatus('idle')

    } catch (err) {
      const msg = String(err?.message ?? err)
      addLog(`エラー: ${msg}`)
      await GM.setValue(GM_RESP_KEY, JSON.stringify({
        id: req.id, text: msg, status: 'error', timestamp: Date.now(),
      }))
      await GM.setValue(GM_REQ_KEY, JSON.stringify({ ...req, status: 'processed' }))
      setStatus('error')
      setTimeout(() => setStatus(autoEnabled ? 'idle' : 'paused'), 5_000)
    } finally {
      processing = false
    }
  }

  // ── Relay mode: bridge localStorage ↔ GM storage ─────────────────────────────

  async function relayTick() {
    localStorage.setItem(HEARTBEAT_KEY, String(Date.now()))

    // 1. Relay new pending request from localStorage → GM storage
    const raw = localStorage.getItem(REQUEST_KEY)
    if (raw) {
      try {
        const req = JSON.parse(raw)
        if (req.status === 'pending' && req.service === SERVICE && req.id !== lastRelayedId) {
          await GM.setValue(GM_REQ_KEY, raw)
          lastRelayedId = req.id
          addLog(`リレー送信: [${req.id.slice(0, 8)}…]`)
          setStatus('relaying')
        }
      } catch (_) { /* ignore malformed JSON */ }
    }

    // 2. Relay completed response from GM storage → localStorage
    if (lastRelayedId && lastRelayedId !== lastWrittenId) {
      const respRaw = await GM.getValue(GM_RESP_KEY, '')
      if (respRaw) {
        try {
          const resp = JSON.parse(respRaw)
          if (resp.id === lastRelayedId) {
            localStorage.setItem(RESPONSE_KEY, respRaw)
            lastWrittenId = resp.id
            addLog(`リレー受信 (${resp.status}): [${resp.id.slice(0, 8)}…]`)
            setStatus('idle')
          }
        } catch (_) { /* ignore malformed JSON */ }
      }
    }
  }

  // ── Polling loop ──────────────────────────────────────────────────────────────

  if (IS_BRIDGE) {
    // Bridge mode: poll GM storage for requests from haku-app relay
    setInterval(async () => {
      if (!autoEnabled || processing) return

      const raw = await GM.getValue(GM_REQ_KEY, '')
      if (!raw) return

      try {
        const req = JSON.parse(raw)
        if (req.status !== 'pending') return

        // Skip if we already responded to this request id
        const prevRaw = await GM.getValue(GM_RESP_KEY, '')
        if (prevRaw) {
          try {
            if (JSON.parse(prevRaw).id === req.id) return
          } catch (_) { /* ignore */ }
        }

        void processRequest(req)
      } catch (_) { /* ignore malformed JSON */ }
    }, POLL_MS)

  } else {
    // Relay mode: poll localStorage and GM storage to bridge the two origins
    setInterval(() => { void relayTick() }, POLL_MS)
  }

  // ── Init ──────────────────────────────────────────────────────────────────────

  setStatus('idle')
  if (IS_BRIDGE) {
    addLog('Gemini Bridge 起動 ✓ — GMストレージを待機中')
    console.log('[Haku Bridge] Gemini bridge v3.0 active ✓')
  } else {
    addLog('Gemini Relay 起動 ✓ — localStorageを監視中')
    console.log('[Haku Bridge] Gemini relay v3.0 active ✓')
  }
})()
