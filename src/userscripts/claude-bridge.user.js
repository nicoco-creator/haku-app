// ==UserScript==
// @name         Haku AI Bridge (Claude)
// @namespace    https://github.com/nicoco-creator/haku-app
// @version      3.0.0
// @description  Haku AppのAIリクエストをClaude.aiで自動処理するブリッジ (GM storageリレー対応)
// @author       nicoco-creator
// @match        https://claude.ai/*
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
  const GM_REQ_KEY    = 'haku_claude_request'
  const GM_RESP_KEY   = 'haku_claude_response'
  const SERVICE       = 'claude'
  const MAX_LOGS      = 30

  // ── Mode detection ────────────────────────────────────────────────────────────
  // IS_BRIDGE = running on claude.ai; IS_RELAY = running on haku-app

  const IS_BRIDGE = location.hostname.includes('claude.ai')

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
    padding: '6px 12px', fontFamily: '"Noto Sans JP",system-ui,sans-serif',
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
    console.log('[Haku Bridge Claude]', msg)
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

  // ── Claude.ai DOM selectors ───────────────────────────────────────────────────

  function getInputEl() {
    return (
      document.querySelector('div[contenteditable="true"].ProseMirror') ??
      document.querySelector('fieldset div[contenteditable="true"]')    ??
      document.querySelector('div[contenteditable="true"][data-placeholder]') ??
      document.querySelector('div[contenteditable="true"]')
    )
  }

  function getSendBtn() {
    return (
      document.querySelector('button[aria-label="Send message"]')           ??
      document.querySelector('button[aria-label="メッセージを送信"]')        ??
      document.querySelector('button[data-testid="send-button"]')           ??
      [...document.querySelectorAll('button')].find(
        b => !b.disabled && /send|送信/i.test(b.getAttribute('aria-label') ?? '')
      ) ?? null
    )
  }

  function isStreamingActive() {
    return !!(
      document.querySelector('button[aria-label="Stop generating"]')         ||
      document.querySelector('button[aria-label="生成を停止"]')              ||
      document.querySelector('button[aria-label="Stop Response"]')           ||
      document.querySelector('button[data-testid="stop-button"]')            ||
      document.querySelector('[data-is-streaming="true"]')                   ||
      document.querySelector('[data-streaming="true"]')                      ||
      document.querySelector('button[aria-label*="stop" i][aria-label*="response" i]') ||
      document.querySelector('button[aria-label*="stop" i][aria-label*="generat" i]')
    )
  }

  function getMessageCount() {
    return Math.max(
      document.querySelectorAll('.font-claude-message').length,
      document.querySelectorAll('[data-test-render-count]').length,
      document.querySelectorAll('[class*="assistant"][class*="message"]').length,
    )
  }

  function getLastAssistantMessage() {
    for (const sel of [
      '.font-claude-message',
      '[data-test-render-count]',
      '.prose.break-words',
      '[class*="assistant-message"] .prose',
      '[data-testid="assistant-message"] .prose',
      '[data-testid="assistant-message"]',
      // Broad fallback: any prose block inside a message turn
      '.prose',
    ]) {
      const els = document.querySelectorAll(sel)
      if (els.length) {
        const text = els[els.length - 1].innerText?.trim()
        if (text) return text
      }
    }
    return ''
  }

  function insertPrompt(el, text) {
    el.focus()
    document.execCommand('selectAll')
    const ok = document.execCommand('insertText', false, text)
    if (!ok) {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText')
      if (nativeSetter?.set) nativeSetter.set.call(el, text)
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true, cancelable: true,
        data: text, inputType: 'insertText',
      }))
    }
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
      let inputEl = null
      for (let attempt = 0; attempt < 3; attempt++) {
        inputEl = getInputEl()
        if (inputEl) break
        addLog(`入力欄が見つかりません — 5秒後に再試行 (${attempt + 1}/3)`)
        await delay(5_000)
      }
      if (!inputEl) throw new Error('入力欄が3回試行後も見つかりませんでした')

      insertPrompt(inputEl, req.prompt)
      addLog('プロンプトを挿入しました')
      await delay(400)

      let sendBtn = getSendBtn()
      if (!sendBtn || sendBtn.disabled) {
        await delay(1_500)
        sendBtn = getSendBtn()
      }
      if (!sendBtn) throw new Error('送信ボタンが見つかりません')
      if (sendBtn.disabled) throw new Error('送信ボタンが無効状態です（入力が空の可能性）')

      const countBefore = getMessageCount()
      sendBtn.click()
      addLog('送信しました — 応答を待機中…')

      // Wait for a new response message to appear (15s; iPhone can be slower)
      await waitUntil(
        () => getMessageCount() > countBefore || isStreamingActive(),
        15_000, '応答開始 (15秒)'
      )
      addLog('応答開始 — 生成完了を待機中…')

      // Wait for generation to finish.
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

      const text = getLastAssistantMessage()
      if (!text) throw new Error('応答テキストを取得できませんでした')

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
      addLog(`完了 (${elapsed}s) — ${text.length}文字`)

      // Write response and mark request processed via GM storage (cross-origin relay)
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
    addLog('Claude Bridge 起動 ✓ — GMストレージを待機中')
    console.log('[Haku Bridge] Claude bridge v3.0 active ✓')
  } else {
    addLog('Claude Relay 起動 ✓ — localStorageを監視中')
    console.log('[Haku Bridge] Claude relay v3.0 active ✓')
  }
})()
