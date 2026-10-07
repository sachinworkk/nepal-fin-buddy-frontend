// Feature registry and shared helpers for the Nepal Fin Buddy extension.
// Content-script files listed together in manifest.json share one isolated world,
// so features register themselves on `NFB` and main.js runs them.
//
// A feature is: { id: string, matches(url: URL): boolean, run(ctx): void | Promise<void> }
// ctx = { url, handoff, util }, where `handoff` is the data the app passed for this
// feature id (or null when the app didn't open this page).
globalThis.NFB = (() => {
  const features = []
  const PARAM = 'nfb='

  // The app opens pages as <url>#nfb=<base64url JSON {feature, data}>. Fragments are never
  // sent to servers; we read it once and remove it from the address bar.
  function readHandoff() {
    const part = location.hash.replace(/^#/, '').split('&').find((p) => p.startsWith(PARAM))
    if (!part) return null
    history.replaceState(null, '', location.pathname + location.search)
    try {
      const b64 = part.slice(PARAM.length).replace(/-/g, '+').replace(/_/g, '/')
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const parsed = JSON.parse(new TextDecoder().decode(bytes))
      return parsed && typeof parsed.feature === 'string' ? parsed : null
    } catch {
      return null
    }
  }

  // Resolve with the first element matching `selector`, or null after `timeoutMs`
  // (pages are client-rendered, so targets appear late).
  function waitFor(selector, timeoutMs = 15000) {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs
      const tick = () => {
        const el = document.querySelector(selector)
        if (el || Date.now() >= deadline) resolve(el)
        else setTimeout(tick, 300)
      }
      tick()
    })
  }

  // React inputs are controlled: assign through the native setter so React sees the change.
  function setInputValue(el, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function setSelectValue(el, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
    setter.call(el, value)
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  // Small dismissible message at the bottom of the page.
  function showBanner(lines) {
    const box = document.createElement('div')
    box.setAttribute('role', 'status')
    box.style.cssText =
      'position:fixed;z-index:2147483647;left:12px;right:12px;bottom:12px;max-width:420px;margin:auto;' +
      'padding:12px 14px 14px;border:1px solid #e5e7eb;border-left:4px solid #2563eb;border-radius:12px;' +
      'background:#fff;color:#1f2937;font:14px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.15)'
    const header = document.createElement('div')
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between'
    const title = document.createElement('strong')
    title.textContent = 'Nepal Fin Buddy'
    title.style.color = '#1d4ed8'
    const close = document.createElement('button')
    close.textContent = '×'
    close.setAttribute('aria-label', 'Dismiss')
    close.style.cssText =
      'border:0;background:none;color:#6b7280;font:22px/1 system-ui,sans-serif;cursor:pointer;padding:0 4px'
    close.onclick = () => box.remove()
    header.append(title, close)
    box.appendChild(header)
    for (const l of lines) {
      const p = document.createElement('div')
      p.textContent = l
      p.style.marginTop = '6px'
      if (/^(Couldn't find|Pick the bill date)/.test(l)) p.style.color = '#b45309'
      box.appendChild(p)
    }
    document.body.appendChild(box)
    return box
  }

  const util = { waitFor, setInputValue, setSelectValue, sleep, showBanner }

  return {
    util,
    register: (feature) => features.push(feature),
    // Runs every feature whose `matches` accepts this page; one failing feature never blocks the others.
    async start() {
      const handoff = readHandoff()
      const url = new URL(location.href)
      for (const f of features.filter((f) => f.matches(url))) {
        try {
          await f.run({ url, util, handoff: handoff?.feature === f.id ? handoff.data : null })
        } catch (e) {
          console.error(`[Nepal Fin Buddy] feature "${f.id}" failed`, e)
        }
      }
    },
  }
})()
