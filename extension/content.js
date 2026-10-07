// Prefills the visible text inputs on prize.ird.gov.np from the URL fragment
// (#nfb=<base64url JSON>) set by Nepal Fin Buddy's "Open IRD portal" button.
// The fragment is never sent to a server and is removed from the URL once read.
// It does not touch the Turnstile widget, the bill photo, or the submit button.
;(() => {
  const PARAM = 'nfb='
  const hash = location.hash.replace(/^#/, '')
  const part = hash.split('&').find((p) => p.startsWith(PARAM))
  if (!part) return

  let data
  try {
    const b64 = part.slice(PARAM.length).replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    data = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return
  }
  history.replaceState(null, '', location.pathname + location.search)

  // company_website is deliberately absent: on the portal it is a hidden honeypot field.
  const NAMES = ['bill_number', 'seller_pan_no', 'billed_total_amount', 'name', 'address', 'mobile_number']

  function isVisible(el) {
    if (el.tabIndex === -1 || el.readOnly || el.disabled) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
  }

  // React inputs are controlled: assign through the native setter so React sees the change.
  function setValue(el, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function fill() {
    const filled = []
    const missing = []
    for (const name of NAMES) {
      const value = data[name]
      if (!value) continue
      const el = [...document.querySelectorAll(`input[name="${name}"], textarea[name="${name}"]`)].find(isVisible)
      if (!el) missing.push(name)
      else {
        setValue(el, String(value))
        filled.push(name)
      }
    }
    return { filled, missing }
  }

  function banner(filled, missing) {
    const box = document.createElement('div')
    box.setAttribute('role', 'status')
    box.style.cssText =
      'position:fixed;z-index:2147483647;left:12px;right:12px;bottom:12px;max-width:420px;margin:auto;' +
      'padding:12px 14px;border-radius:10px;background:#141414;color:#fff;font:14px/1.4 system-ui,sans-serif;' +
      'box-shadow:0 4px 16px rgba(0,0,0,.3)'
    const lines = [`Nepal Fin Buddy filled ${filled.length} field${filled.length === 1 ? '' : 's'}.`]
    if (data.bill_date) lines.push(`Pick the bill date yourself: ${data.bill_date}`)
    if (data.payment_method) lines.push(`Payment method: ${data.payment_method}`)
    if (missing.length) lines.push(`Couldn't find: ${missing.join(', ')} — copy it from the app.`)
    lines.push('Then complete the security check and submit.')
    box.innerHTML = ''
    for (const l of lines) {
      const p = document.createElement('div')
      p.textContent = l
      box.appendChild(p)
    }
    const close = document.createElement('button')
    close.textContent = 'Dismiss'
    close.style.cssText = 'margin-top:8px;padding:6px 12px;border:0;border-radius:6px;font:inherit'
    close.onclick = () => box.remove()
    box.appendChild(close)
    document.body.appendChild(box)
  }

  // The portal is a client-rendered SPA: wait for the form to appear (up to 15s).
  const deadline = Date.now() + 15000
  const timer = setInterval(() => {
    const ready = document.querySelector('input[name="bill_number"]')
    if (!ready && Date.now() < deadline) return
    clearInterval(timer)
    const { filled, missing } = fill()
    banner(filled, missing)
  }, 300)
})()
